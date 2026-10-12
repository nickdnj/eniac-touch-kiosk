// Package session is the bridge's session state machine and action
// whitelist (architecture 5.5, 5.6, 7). It maps the UI's step IDs to the
// validated .e lines, owns the one core session, runs the 33 ms frame tick,
// the idle detector and checkpoints, and hands faults to recovery.
//
// Invariant (FR-14): the core's configuration is at all times the preset
// plus a prefix of the step lines (in the order they were applied), so it
// is a subset of a known-good .e; after setup_complete it is exactly the .e.
package session

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
	"time"

	"eniac-kiosk/bridge/internal/buildinfo"
	"eniac-kiosk/bridge/internal/config"
	"eniac-kiosk/bridge/internal/core"
	"eniac-kiosk/bridge/internal/machine"
	"eniac-kiosk/bridge/internal/mission"
	"eniac-kiosk/bridge/internal/protocol"
	"eniac-kiosk/bridge/internal/recovery"
	"eniac-kiosk/bridge/internal/server"
	"eniac-kiosk/bridge/internal/status"
	"eniac-kiosk/bridge/internal/uiswitch"
)

// Recorder receives metrics events (internal/metrics implements it).
type Recorder interface {
	// Bridge records a bridge-owned event (session_start, mission_complete,
	// error_enter, ...). These can't come from the UI.
	Bridge(ev, sid string, fields map[string]any)
	// UI records a whitelisted UI event from a `metric` message.
	UI(m protocol.Metric, sid string) error
	// SessionEnd flushes to disk (fsync at session end).
	SessionEnd()
}

type nopRecorder struct{}

func (nopRecorder) Bridge(string, string, map[string]any) {}
func (nopRecorder) UI(protocol.Metric, string) error      { return nil }
func (nopRecorder) SessionEnd()                           {}

// Options configure a Manager.
type Options struct {
	Config   config.Config
	Missions *mission.Registry
	Hub      *server.Hub
	Metrics  Recorder
	VlinkExe string // the binary implementing `vlink` (os.Executable())
	Log      *slog.Logger
	// Switch is the Original UI switch (nil: not available, "disabled").
	Switch *uiswitch.Switcher

	Tick        time.Duration // frame tick, default 33 ms
	OrphanAfter time.Duration // reap a session this long after the last client left, default 30 s
	HealthEvery time.Duration // periodic health broadcast, default 5 s
	ProbeMission string       // mission whose preset the recovery probe boots, default squares
	CoreExtraEnv []string     // tests only (fakecore)
	// StallOverride replaces a mission's non-zero stall window (tests only,
	// so a stall test does not wait 20 s). Missions without a window stay off.
	StallOverride time.Duration
	RecoveryNow   func() time.Time
	RecoverySleep func(ctx context.Context, d time.Duration) error
}

// Manager owns the current session. It implements server.Handler.
type Manager struct {
	o     Options
	log   *slog.Logger
	hub   *server.Hub
	vsrv  *core.VlinkServer
	rec   *recovery.Recovery
	ctx   context.Context
	drops *status.DropLog
	start time.Time

	opMu sync.Mutex // serializes client operations

	mu          sync.Mutex
	cur         *sess
	lastSeq     uint64
	health      protocol.Health
	clients     int
	noClientsAt time.Time
	errorAt     time.Time
	errorCode   string

	// Attract loop (attract.go). attractMu serializes starting and
	// stopping the loop; it is never held while waiting for opMu.
	attractMu sync.Mutex
	attract   *attractRun
	ast       protocol.Attract // current status (guarded by mu)
	astTotal  int              // flights landed since the bridge started (mu)
}

type sess struct {
	id        string
	sid       string // metrics visitor-session id
	m         *mission.Mission
	mode      string
	state     string
	applied   []string
	done      map[string]bool
	core      *core.Core
	mirror    *machine.Mirror
	run       *machine.RunTracker
	cps       *machine.Checkpoints
	stop      chan struct{}
	startedAt time.Time
	speed     string
	frozen    bool // the clock was stopped at run.freezeAt (no more speed changes)
	stall     *machine.StallGuard
}

func (s *sess) isAttract() bool { return s.mode == protocol.ModeAttract }

// New creates the manager, its vlink socket and its recovery loop.
func New(ctx context.Context, o Options) (*Manager, error) {
	if o.Log == nil {
		o.Log = slog.Default()
	}
	if o.Metrics == nil {
		o.Metrics = nopRecorder{}
	}
	if o.Tick == 0 {
		o.Tick = 33 * time.Millisecond
	}
	if o.OrphanAfter == 0 {
		o.OrphanAfter = 30 * time.Second
	}
	if o.HealthEvery == 0 {
		o.HealthEvery = 5 * time.Second
	}
	if o.ProbeMission == "" {
		o.ProbeMission = "squares"
	}
	if err := os.MkdirAll(filepath.Join(o.Config.Paths.Run, "s"), 0o700); err != nil {
		return nil, err
	}
	vsrv, err := core.ListenVlink(filepath.Join(o.Config.Paths.Run, "vlink.sock"), o.Log)
	if err != nil {
		return nil, err
	}
	m := &Manager{o: o, log: o.Log, hub: o.Hub, vsrv: vsrv, ctx: ctx, drops: status.NewDropLog(o.Log), start: time.Now(),
		health: protocol.Health{T: "health", Core: protocol.CoreUp}}
	rc := o.Config.Recovery
	backoff := make([]time.Duration, len(rc.Backoff))
	for i, d := range rc.Backoff {
		backoff[i] = d.D()
	}
	m.rec = recovery.New(ctx, recovery.Options{
		Budget: rc.Budget, Window: rc.Window.D(), Backoff: backoff, SlowRetry: rc.SlowRetry.D(),
		Probe: recovery.ProbeSession(m.startProbe), OnHealth: m.setHealth, OnRecovered: m.recovered,
		Now: o.RecoveryNow, Sleep: o.RecoverySleep, Log: o.Log,
	})
	go m.background()
	return m, nil
}

// Close ends the session and stops listening.
func (m *Manager) Close() {
	m.stopAttract("shutdown", nil)
	m.opMu.Lock()
	m.endSession("shutdown")
	m.opMu.Unlock()
	m.vsrv.Close()
}

func randID(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// coreOptions builds core options for a session dir and preset.
func (m *Manager) coreOptions(dir, preset string, rate int) core.Options {
	c := m.o.Config.Core
	return core.Options{
		CorePath: m.o.Config.Paths.Core, VlinkExe: m.o.VlinkExe, Runtime: m.o.Config.Paths.Upstream,
		SessionDir: dir, Preset: preset, Server: m.vsrv, GOMAXPROCS: c.GOMAXPROCS, Nice: c.Nice,
		ReadyTimeout: c.ReadyTimeout.D(), AckTimeout: c.AckTimeout.D(), SilenceTimeout: c.SilenceTimeout.D(),
		ProbeEvery: c.ProbeEvery.D(), InitialRate: rate, ExtraEnv: m.o.CoreExtraEnv, Log: m.log,
	}
}

// startProbe boots the probe mission's preset headless (recovery 5.8 step 2).
func (m *Manager) startProbe(ctx context.Context) (*core.Core, error) {
	pm, ok := m.o.Missions.Get(m.o.ProbeMission)
	if !ok || !pm.Available {
		for _, x := range m.o.Missions.All() {
			if x.Available {
				pm, ok = x, true
				break
			}
		}
	}
	if !ok || !pm.Available {
		return nil, core.Fault{Code: core.CodeStart, Detail: "no available mission to probe with"}
	}
	dir := filepath.Join(m.o.Config.Paths.Run, "s", "probe-"+randID(4))
	preset, err := pm.WritePreset(dir)
	if err != nil {
		return nil, err
	}
	return core.Start(ctx, m.coreOptions(dir, preset, 0))
}

// ---------------------------------------------------------------------------
// server.Handler

// Hello is the first message to every client. A page connecting after the
// original UI ran also records how it ended (original_ui_exit).
func (m *Manager) Hello() protocol.Hello {
	m.consumeOriginalUIExit()
	cfg := m.o.Config
	tz := cfg.Admin.TapZone
	return protocol.Hello{T: "hello", Protocol: protocol.Version, Build: buildinfo.Build(),
		Config: protocol.HelloConfig{
			Idle:       protocol.IdleConfig{SetupS: cfg.Idle.SetupS, RunS: cfg.Idle.RunS, CountdownS: cfg.Idle.CountdownS, ExploreS: cfg.Idle.ExploreS},
			Admin:      protocol.AdminConfig{TapZone: protocol.TapZone{Corner: tz.Corner, WidthPx: tz.WidthPx, HeightPx: tz.HeightPx, Taps: tz.Taps}},
			OriginalUI: m.originalUIConfig(),
		},
		Health: m.healthNow()}
}

// Snapshot is the full state for a new or resyncing client.
func (m *Manager) Snapshot() protocol.State {
	m.mu.Lock()
	s := m.cur
	lastSeq := m.lastSeq
	m.mu.Unlock()
	st := protocol.State{T: "state", Seq: lastSeq, Cards: []protocol.Card{}, Run: protocol.RunInfo{State: machine.RunIdle}}
	a := m.attractStatus(nil)
	a.T = ""
	st.Attract = &a
	if s == nil || s.mirror == nil {
		return st
	}
	seq, snap, cards := s.mirror.Snapshot()
	st.Seq, st.Machine = seq, snap
	for _, c := range cards {
		st.Cards = append(st.Cards, protocol.Card{N: c.N, Text: c.Text, Fields: c.Fields})
	}
	m.mu.Lock()
	st.Session = m.sessionMsgLocked(s, false)
	m.mu.Unlock()
	if s.run != nil {
		st.Run = protocol.RunInfo{State: s.run.State(), Inits: s.run.Inits()}
	}
	return st
}

// ClientsChanged tracks connected clients for kioskClient and orphan reaping.
func (m *Manager) ClientsChanged(n int) {
	m.mu.Lock()
	m.clients = n
	if n == 0 {
		m.noClientsAt = time.Now()
	}
	m.mu.Unlock()
}

func errMsg(re *int64, code, format string, a ...any) []any {
	return []any{protocol.Error{T: "error", Re: re, Code: code, Message: fmt.Sprintf(format, a...)}}
}

// Handle implements the 5.6 whitelist.
func (m *Manager) Handle(ctx context.Context, c *server.Client, msg any) []any {
	switch x := msg.(type) {
	case protocol.Ping:
		return []any{protocol.Pong{T: "pong", Re: x.ID}}
	case protocol.Metric:
		m.mu.Lock()
		sid := ""
		if m.cur != nil {
			sid = m.cur.sid
		}
		m.mu.Unlock()
		if err := m.o.Metrics.UI(x, sid); err != nil {
			return errMsg(x.ID, protocol.ErrNotAllowed, "%v", err)
		}
		return nil
	}
	// The attract loop takes opMu itself, so it is started and stopped
	// outside it. A mission start or an explicit end stops it first: only
	// one core runs on the box at a time.
	switch x := msg.(type) {
	case protocol.AttractStart:
		return m.attractStart(x)
	case protocol.AttractStop:
		return m.attractStop(x)
	case protocol.OriginalUI:
		return m.originalUI(x)
	case protocol.StartMission:
		if x.Mode == protocol.ModeAttract {
			return errMsg(x.ID, protocol.ErrNotAllowed, "attract runs through attract_start")
		}
		m.stopAttract("mission", nil)
	case protocol.EndSession:
		m.stopAttract(x.Reason, nil)
	}
	m.opMu.Lock()
	defer m.opMu.Unlock()
	switch x := msg.(type) {
	case protocol.StartMission:
		return m.startMission(ctx, x)
	case protocol.ApplyStep:
		return m.applyStep(x)
	case protocol.SkipSetup:
		return m.skipSetup(x)
	case protocol.Button:
		return m.button(x)
	case protocol.SetSpeed:
		return m.setSpeed(x)
	case protocol.EndSession:
		m.endSession(x.Reason)
		return nil
	}
	return errMsg(nil, protocol.ErrBadMessage, "unsupported message")
}

// ---------------------------------------------------------------------------
// Operations (called with opMu held)

func (m *Manager) current() *sess {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.cur
}

func (m *Manager) startMission(ctx context.Context, x protocol.StartMission) []any {
	mi, ok := m.o.Missions.Get(x.Mission)
	if !ok {
		return errMsg(x.ID, protocol.ErrNotAllowed, "unknown mission %q", x.Mission)
	}
	if !mi.Available {
		return errMsg(x.ID, protocol.ErrNotAllowed, "mission %s is unavailable: %s", x.Mission, mi.Reason)
	}
	if h := m.healthNow(); h.Core == protocol.CoreDown {
		return errMsg(x.ID, protocol.ErrBadState, "the core is recovering (%s)", h.Code)
	}
	m.endSession("replaced")
	m.openSession(ctx, mi, x.Mode)
	return nil
}

// openSession starts a fresh core for the mission and makes it the current
// session (called with opMu held, after the previous session ended). It
// returns the session once it is in setup, or nil if it faulted or was
// replaced while starting (a fault has then been raised already).
func (m *Manager) openSession(ctx context.Context, mi *mission.Mission, mode string) *sess {
	spd, _ := mi.Speed(mi.File.Run.DefaultSpeed)
	q, _ := mi.QuietOverrideMs()
	s := &sess{id: randID(4), sid: randID(6), m: mi, mode: mode, state: protocol.StateStarting, done: map[string]bool{},
		startedAt: time.Now(), stop: make(chan struct{}), speed: mi.File.Run.DefaultSpeed}
	s.mirror = machine.NewMirror(m.drops)
	m.mu.Lock()
	s.mirror.SetSeq(m.lastSeq)
	m.cur = s
	m.mu.Unlock()
	s.run = machine.NewRunTracker(s.mirror, mi.Watch(), spd.Rate, q)
	s.stall = machine.NewStallGuard(m.stallWindow(mi, mi.File.Run.DefaultSpeed))
	s.cps = machine.NewCheckpoints(mi.Checkpoints())
	s.mirror.OnPunch = func(p machine.Punch) {
		// A card from a core that is no longer the current session's (it
		// is being killed after a hand-off) never reaches a client.
		m.mu.Lock()
		var err error
		if m.cur == s {
			err = m.hub.BroadcastPunch(p)
		}
		m.mu.Unlock()
		if err != nil {
			m.fault(s, core.Fault{Code: core.CodeDown, Detail: "punch-overflow"})
		}
	}
	m.broadcastSession(s)
	if !s.isAttract() { // attract flights are counted as attract_flight_*, not visitor sessions
		m.o.Metrics.Bridge("session_start", s.sid, nil)
		m.o.Metrics.Bridge("mission_start", s.sid, map[string]any{"m": mi.File.ID})
	}

	dir := filepath.Join(m.o.Config.Paths.Run, "s", s.id)
	preset, err := mi.WritePreset(dir)
	if err != nil {
		m.fault(s, core.Fault{Code: core.CodeStart, Detail: err.Error()})
		return nil
	}
	o := m.coreOptions(dir, preset, spd.Rate)
	o.OnStatus = s.mirror.ApplyLine
	o.OnFault = func(f core.Fault) { m.fault(s, f) }
	c, err := core.Start(ctx, o)
	if err != nil && s.isAttract() && ctx.Err() != nil {
		// The attract loop was stopped (a visitor touched) while its core
		// was booting: not a fault. core.Start has killed the process.
		m.endSession("attract-stop")
		return nil
	}
	if err != nil {
		var f core.Fault
		if !errors.As(err, &f) {
			f = core.Fault{Code: core.CodeStart, Detail: err.Error()}
		}
		m.fault(s, f)
		return nil
	}
	if spd.Op != "" {
		if op, err := core.SetCycleOp(spd.Op); err == nil {
			c.Do(op)
		}
	}
	m.mu.Lock()
	if m.cur != s { // replaced or faulted meanwhile
		m.mu.Unlock()
		c.Close()
		return nil
	}
	s.core = c
	s.state = protocol.StateSetup
	m.mu.Unlock()
	m.hub.ResetFrames()
	m.hub.Broadcast(m.Snapshot())
	m.broadcastSession(s)
	go m.tick(s)
	return s
}

func (m *Manager) requireState(re *int64, states ...string) (*sess, []any) {
	m.mu.Lock()
	defer m.mu.Unlock()
	s := m.cur
	if s == nil {
		return nil, errMsg(re, protocol.ErrBadState, "no session")
	}
	for _, st := range states {
		if s.state == st {
			return s, nil
		}
	}
	return nil, errMsg(re, protocol.ErrBadState, "not allowed in state %s", s.state)
}

// nextStep is the next step id when the mission is ordered.
func (s *sess) nextStep() string {
	for _, id := range s.m.StepIDs() {
		if !s.done[id] {
			return id
		}
	}
	return ""
}

func (s *sess) remaining() int { return len(s.m.StepIDs()) - len(s.applied) }

// sendStep writes one step line and records it. It faults the session on
// any core error (the config must never diverge silently).
func (m *Manager) sendStep(s *sess, id string) error {
	text, _ := s.m.StepText(id)
	cmd, err := core.StepLine(text)
	if err != nil {
		return err
	}
	if _, err := s.core.Do(cmd); err != nil {
		var ce *core.CmdError
		if errors.As(err, &ce) {
			m.fault(s, core.Fault{Code: core.CodeCmd, Detail: "step " + id, Line: ce.Line})
		}
		return err
	}
	m.mu.Lock()
	s.applied = append(s.applied, id)
	s.done[id] = true
	m.mu.Unlock()
	return nil
}

func (m *Manager) applyStep(x protocol.ApplyStep) []any {
	s, e := m.requireState(x.ID, protocol.StateSetup)
	if e != nil {
		return e
	}
	if _, ok := s.m.StepText(x.Step); !ok {
		return errMsg(x.ID, protocol.ErrUnknownStep, "unknown step %q", x.Step)
	}
	if s.done[x.Step] {
		return errMsg(x.ID, protocol.ErrNotAllowed, "step %s is already applied", x.Step)
	}
	if s.m.File.Ordered && s.nextStep() != x.Step {
		return errMsg(x.ID, protocol.ErrNotAllowed, "step %s is out of order (next is %s)", x.Step, s.nextStep())
	}
	if err := m.sendStep(s, x.Step); err != nil {
		return nil // the fault path reports it (health + session failed)
	}
	m.hub.Broadcast(protocol.StepApplied{T: "step_applied", Re: x.ID, Step: x.Step, Assisted: x.Assisted, Remaining: s.remaining()})
	if s.remaining() == 0 {
		m.setupComplete(s, x.ID, 0)
	} else {
		m.broadcastSession(s)
	}
	return nil
}

func (m *Manager) skipSetup(x protocol.SkipSetup) []any {
	s, e := m.requireState(x.ID, protocol.StateSetup)
	if e != nil {
		return e
	}
	n := 0
	for _, id := range s.m.StepIDsFileOrder() {
		if s.done[id] {
			continue
		}
		if err := m.sendStep(s, id); err != nil {
			return nil
		}
		n++
	}
	m.setupComplete(s, x.ID, n)
	return nil
}

func (m *Manager) setupComplete(s *sess, re *int64, skipped int) {
	m.mu.Lock()
	s.state = protocol.StateArmed
	m.mu.Unlock()
	m.hub.Broadcast(protocol.SetupComplete{T: "setup_complete", Re: re, Skipped: skipped})
	m.broadcastSession(s)
}

func (m *Manager) button(x protocol.Button) []any {
	s, e := m.requireState(x.ID, protocol.StateArmed, protocol.StateRunning, protocol.StateResult)
	if e != nil {
		return e
	}
	if !s.m.HasButton(x.B) {
		return errMsg(x.ID, protocol.ErrNotAllowed, "button %s is not available in this mission", x.B)
	}
	// Server-side guard for UX-07: never stack INITs or clear mid-run.
	if s.run.State() != machine.RunIdle {
		return errMsg(x.ID, protocol.ErrBusy, "the machine is still running")
	}
	run := s.m.File.Run
	switch x.B {
	case "init":
		// Primes and Trajectory run until they finish: a second INIT would
		// corrupt the run (spike S2), so it is refused, not queued.
		if run.InitOnce && s.run.Inits() > 0 {
			return errMsg(x.ID, protocol.ErrNotAllowed, "INIT was already pressed in this session")
		}
		if run.InitAfter != "" && !s.cps.Fired(run.InitAfter) {
			return errMsg(x.ID, protocol.ErrNotAllowed, "INIT needs %s first", run.InitAfter)
		}
	case "read":
		// READ (with its CLEAR) is only for loading the card before the run.
		if s.run.Inits() > 0 {
			return errMsg(x.ID, protocol.ErrNotAllowed, "READ is only allowed before INIT")
		}
	}
	// A mission may bind withheld .e lines to the button (Trajectory's READ
	// is `b c` then `b r`, spike S2); otherwise the button's own command.
	var cmds []core.Command
	for _, text := range s.m.WithheldFor(x.B) {
		c, err := core.WithheldLine(text)
		if err != nil {
			return errMsg(x.ID, protocol.ErrNotAllowed, "%v", err)
		}
		cmds = append(cmds, c)
	}
	if len(cmds) == 0 {
		switch x.B {
		case "init":
			cmds = []core.Command{core.ButtonInit()}
		case "clear":
			cmds = []core.Command{core.ButtonClear()}
		default:
			return errMsg(x.ID, protocol.ErrNotAllowed, "button %s has no command in this mission", x.B)
		}
	}
	for _, c := range cmds {
		if _, err := s.core.Do(c); err != nil {
			return nil
		}
	}
	ev := s.run.Pressed(x.B == "init")
	m.mu.Lock()
	changed := s.state != protocol.StateRunning && s.state != protocol.StateResult
	if changed {
		s.state = protocol.StateRunning
	}
	m.mu.Unlock()
	m.hub.Broadcast(protocol.Run{T: "run", State: ev.State, Inits: ev.Inits})
	if changed {
		m.broadcastSession(s)
	}
	return nil
}

func (m *Manager) setSpeed(x protocol.SetSpeed) []any {
	s, e := m.requireState(x.ID, protocol.StateArmed, protocol.StateRunning, protocol.StateResult)
	if e != nil {
		return e
	}
	spd, ok := s.m.Speed(x.Speed)
	if !ok {
		return errMsg(x.ID, protocol.ErrNotAllowed, "speed %q is not offered by this mission", x.Speed)
	}
	m.mu.Lock()
	frozen := s.frozen
	m.mu.Unlock()
	if frozen {
		return errMsg(x.ID, protocol.ErrNotAllowed, "the machine is stopped at %s", s.m.File.Run.FreezeAt)
	}
	rc, err := core.SetRate(spd.Rate)
	if err != nil {
		return errMsg(x.ID, protocol.ErrNotAllowed, "%v", err)
	}
	if _, err := s.core.Do(rc); err != nil {
		return nil
	}
	if spd.Op != "" {
		if op, err := core.SetCycleOp(spd.Op); err == nil {
			if _, err := s.core.Do(op); err != nil {
				return nil
			}
		}
	}
	s.run.SetRate(spd.Rate)
	m.mu.Lock()
	s.speed = x.Speed
	w, _ := m.stallWindow(s.m, x.Speed)
	s.stall.SetWindow(w)
	m.mu.Unlock()
	return nil
}

// endSession tears down the current session (any state).
func (m *Manager) endSession(reason string) {
	m.mu.Lock()
	s := m.cur
	m.cur = nil
	if s != nil && s.mirror != nil {
		seq, _, _ := s.mirror.Snapshot()
		if seq > m.lastSeq {
			m.lastSeq = seq
		}
		// Frames and cards of this session still waiting in a client's
		// queue are dropped: nothing of it may follow the "none" below
		// (punches and frames are published only while m.cur == s).
		m.hub.ResetFrames()
	}
	m.mu.Unlock()
	if s == nil {
		return
	}
	s.stopTick()
	if s.core != nil {
		s.core.Close()
	}
	os.RemoveAll(filepath.Join(m.o.Config.Paths.Run, "s", s.id))
	if !s.isAttract() {
		m.o.Metrics.Bridge("session_end", s.sid, map[string]any{"durS": int(time.Since(s.startedAt).Seconds()), "reason": reason})
		m.o.Metrics.SessionEnd()
	}
	m.hub.Broadcast(protocol.Session{T: "session", ID: s.id, Mission: s.m.File.ID, Mode: s.mode, State: protocol.StateNone,
		Applied: []string{}, Remaining: 0})
	m.log.Info("session ended", "id", s.id, "reason", reason)
}

func (s *sess) stopTick() {
	select {
	case <-s.stop:
	default:
		close(s.stop)
	}
}

// ---------------------------------------------------------------------------
// Faults and recovery

// fault moves the session to failed, kills its core and starts recovery.
// It is safe to call from any goroutine, more than once.
func (m *Manager) fault(s *sess, f core.Fault) {
	m.mu.Lock()
	if m.cur != s || s.state == protocol.StateFailed {
		m.mu.Unlock()
		return
	}
	s.state = protocol.StateFailed
	c := s.core
	m.errorAt, m.errorCode = time.Now(), f.Code
	m.mu.Unlock()
	m.log.Error("session fault", "id", s.id, "code", f.Code, "detail", f.Detail, "line", f.Line)
	s.stopTick()
	if c != nil {
		go c.Close() // kill the process group; don't block the caller
	}
	m.broadcastSession(s)
	m.o.Metrics.Bridge("error_enter", s.sid, map[string]any{"code": f.Code})
	m.rec.Fault(f)
}

func (m *Manager) setHealth(h protocol.Health) {
	m.mu.Lock()
	m.health = h
	m.mu.Unlock()
	h.KioskClient = m.hub.Count() > 0
	m.hub.Broadcast(h)
}

// recovered: the probe succeeded; the failed session is dropped (a clean
// start is the rule, FR-33) and the UI returns to attract.
func (m *Manager) recovered() {
	m.mu.Lock()
	code, at := m.errorCode, m.errorAt
	m.mu.Unlock()
	m.opMu.Lock()
	if s := m.current(); s != nil && s.state == protocol.StateFailed {
		m.endSession("error")
	}
	m.opMu.Unlock()
	m.o.Metrics.Bridge("core_restart", "", map[string]any{"code": code})
	if !at.IsZero() {
		m.o.Metrics.Bridge("error_exit", "", map[string]any{"code": code, "durS": int(time.Since(at).Seconds())})
	}
}

func (m *Manager) healthNow() protocol.Health {
	m.mu.Lock()
	h := m.health
	m.mu.Unlock()
	h.T = ""
	if m.hub != nil {
		h.KioskClient = m.hub.Count() > 0
	}
	return h
}

// ---------------------------------------------------------------------------
// Ticks

func (m *Manager) sessionMsgLocked(s *sess, withT bool) *protocol.Session {
	msg := &protocol.Session{ID: s.id, Mission: s.m.File.ID, Mode: s.mode, State: s.state,
		Applied: append([]string{}, s.applied...), Remaining: s.remaining()}
	if withT {
		msg.T = "session"
	}
	return msg
}

func (m *Manager) broadcastSession(s *sess) {
	m.mu.Lock()
	msg := m.sessionMsgLocked(s, true)
	m.mu.Unlock()
	m.hub.Broadcast(*msg)
}

// tick is the per-session 33 ms loop: frames, idle detection, checkpoints.
func (m *Manager) tick(s *sess) {
	t := time.NewTicker(m.o.Tick)
	defer t.Stop()
	for {
		select {
		case <-s.stop:
			return
		case <-m.ctx.Done():
			return
		case <-t.C:
		}
		// Publish only while this is the current session, under mu, so
		// that endSession (which clears m.cur and drops queued frames
		// under mu) is never followed by a frame or run event of it.
		m.mu.Lock()
		if m.cur != s {
			m.mu.Unlock()
			return
		}
		if seq, patch, ok := s.mirror.TakeDelta(); ok {
			m.hub.BroadcastFrame(seq, patch)
		}
		if ev, ok := s.run.Tick(); ok {
			m.hub.Broadcast(protocol.Run{T: "run", State: ev.State, Inits: ev.Inits, Settled: ev.Settled})
		}
		st := s.state
		frozen := s.frozen
		m.mu.Unlock()
		if st == protocol.StateArmed || st == protocol.StateRunning || st == protocol.StateResult {
			state := s.mirror.State()
			// Stall guard: a busy run that stops making progress (no card,
			// or no accumulator change) is a fault, not a stuck screen. A
			// run frozen on purpose (freezeAt) is not watched.
			m.mu.Lock()
			stalled := !frozen && s.stall.Observe(time.Now(), s.run.State() == machine.RunBusy, &state)
			window := s.stall.Window()
			m.mu.Unlock()
			if stalled {
				m.log.Warn("run stalled", "id", s.id, "mission", s.m.File.ID, "window", window, "cards", state.Punched)
				m.fault(s, core.Fault{Code: core.CodeDown, Detail: core.DetailStall})
				return
			}
			for _, id := range s.cps.Evaluate(&state) {
				if id == s.m.File.Run.FreezeAt {
					m.freeze(s)
				}
				m.mu.Lock()
				if m.cur == s {
					m.hub.Broadcast(protocol.Checkpoint{T: "checkpoint", ID: id})
				}
				m.mu.Unlock()
				if id == s.m.File.Result {
					m.mu.Lock()
					changed := s.state == protocol.StateRunning
					if changed {
						s.state = protocol.StateResult
					}
					m.mu.Unlock()
					if !s.isAttract() {
						m.o.Metrics.Bridge("mission_complete", s.sid, map[string]any{"m": s.m.File.ID, "durS": int(time.Since(s.startedAt).Seconds())})
					}
					if changed {
						m.broadcastSession(s)
					}
				}
			}
		}
	}
}

// stallWindow is the mission's stall window at a speed (StallOverride in tests).
func (m *Manager) stallWindow(mi *mission.Mission, speed string) (time.Duration, bool) {
	w, byPunch := mi.StallWindow(speed)
	if w > 0 && m.o.StallOverride > 0 {
		w = m.o.StallOverride
	}
	return w, byPunch
}

// freeze stops the clock where it is (`s cy.op 1a`, whitelisted): the
// machine keeps its state and nothing more is computed or punched
// (Trajectory's landing card, spike S2). It runs on the tick goroutine, so
// it takes the operation lock like a client action.
func (m *Manager) freeze(s *sess) {
	op, err := core.SetCycleOp("1a")
	if err != nil {
		return
	}
	m.opMu.Lock()
	defer m.opMu.Unlock()
	if m.current() != s || s.core == nil {
		return
	}
	if _, err := s.core.Do(op); err != nil {
		m.log.Warn("freeze failed", "id", s.id, "err", err)
		return
	}
	m.mu.Lock()
	s.frozen = true
	m.mu.Unlock()
	m.log.Info("machine frozen at checkpoint", "id", s.id, "checkpoint", s.m.File.Run.FreezeAt)
}

// background: periodic health broadcast and orphan reaping.
func (m *Manager) background() {
	t := time.NewTicker(time.Second)
	defer t.Stop()
	lastHealth := time.Now()
	for {
		select {
		case <-m.ctx.Done():
			return
		case <-t.C:
		}
		if time.Since(lastHealth) >= m.o.HealthEvery {
			lastHealth = time.Now()
			h := m.healthNow()
			h.T = "health"
			m.hub.Broadcast(h)
		}
		m.attractMu.Lock()
		attracting := m.attract != nil
		m.attractMu.Unlock()
		m.mu.Lock()
		orphan := (m.cur != nil || attracting) && m.clients == 0 && !m.noClientsAt.IsZero() && time.Since(m.noClientsAt) > m.o.OrphanAfter
		m.mu.Unlock()
		if orphan {
			// No kiosk page for OrphanAfter: attract stops too (the page
			// asks for it again when it reconnects at home).
			m.stopAttract("orphan", nil)
			m.opMu.Lock()
			m.endSession("orphan")
			m.opMu.Unlock()
		}
	}
}

// ---------------------------------------------------------------------------
// /healthz

// Healthz builds the loopback health document (5.8, M1 subset).
func (m *Manager) Healthz() protocol.Healthz {
	rs := m.rec.Status()
	h := protocol.Healthz{Version: buildinfo.Version,
		Upstream: protocol.HealthzUpstream{Commit: buildinfo.UpstreamCommit, Patches: splitPatches(buildinfo.Patches)},
		Bridge:   protocol.HealthzBridge{UptimeS: int64(time.Since(m.start).Seconds())},
	}
	h.Core = protocol.HealthzCore{State: protocol.CoreUp, Restarts5m: rs.Restarts5m, RestartsTotal: rs.RestartsTotal}
	if rs.LastError != nil {
		h.Core.LastError = &protocol.HealthzError{Code: rs.LastError.Code, Detail: rs.LastError.Detail, At: rs.LastError.At.UTC().Format(time.RFC3339)}
	}
	m.mu.Lock()
	s := m.cur
	m.mu.Unlock()
	if s != nil {
		m.mu.Lock()
		h.Session = &protocol.HealthzSession{Mission: s.m.File.ID, State: s.state}
		c := s.core
		m.mu.Unlock()
		if c != nil {
			h.Core.Pid = c.Pid()
			h.Core.UptimeS = int64(c.Uptime().Seconds())
		}
	}
	h.OriginalUI = m.healthzOriginalUI()
	h.Kiosk.ClientConnected = m.hub.Count() > 0
	if lp := m.hub.LastPing(); !lp.IsZero() {
		ago := int64(time.Since(lp).Seconds())
		h.Kiosk.LastPingAgoS = &ago
	}
	switch {
	case rs.Down:
		h.Status = "down"
		h.Core.State = protocol.CoreDown
	case !m.o.Missions.AnyAvailable():
		h.Status = "down"
	case rs.Restarts5m > 0:
		h.Status = "degraded"
	default:
		h.Status = "ok"
	}
	return h
}

func splitPatches(s string) []string {
	out := []string{}
	start := 0
	for i := 0; i <= len(s); i++ {
		if i == len(s) || s[i] == ',' {
			if i > start {
				out = append(out, s[start:i])
			}
			start = i + 1
		}
	}
	return out
}
