package session

// Live attract (PRD FR-30, FR-34 to FR-36, FR-51; UX 14.2). The attract
// loop flies the attract mission's program (trajdemo.e, from the
// Trajectory mission) on a fresh core per flight, with the same machinery
// as a visitor mission: openSession boots the preset, skip_setup applies
// the steps, READ sends `b c` then `b r`, INIT sends `b i`, the tick loop
// freezes the machine on the landing card (`s cy.op 1a`, run.freezeAt) and
// the stall guard watches the run. The loop then holds the finished plot,
// ends the session (killing the core) and starts the next flight.
//
// A fault (core crash, hang, stall) goes through the normal path: the
// session fails, recovery backs off and probes (5.8), and the loop resumes
// by itself once the core is back (FR-51). Nothing is ever replayed or
// invented: the attract screen draws only this session's live messages.
//
// One core at a time: the loop holds opMu while it ends one session and
// opens the next; attract_stop, start_mission and end_session stop the
// loop (cancel, wait for it to exit) before they take opMu.

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	"eniac-kiosk/bridge/internal/core"
	"eniac-kiosk/bridge/internal/machine"
	"eniac-kiosk/bridge/internal/mission"
	"eniac-kiosk/bridge/internal/protocol"
)

// attractRun is one run of the loop, from attract_start to its stop.
type attractRun struct {
	ctx    context.Context
	cancel context.CancelFunc
	done   chan struct{} // closed when the loop goroutine has returned
	mi     *mission.Mission
	flight int
	landed int
}

var (
	errAttractStopped = errors.New("attract stopped")
	errAttractFault   = errors.New("attract flight faulted")
	errAttractEnded   = errors.New("attract session ended elsewhere")
)

// attractPoll is how often the loop looks at its flight.
const attractPoll = 50 * time.Millisecond

func (m *Manager) attractMission() (*mission.Mission, error) {
	id := m.o.Config.Attract.Mission
	mi, ok := m.o.Missions.Get(id)
	if !ok {
		return nil, errors.New("attract mission " + strconv.Quote(id) + " is not loaded")
	}
	if !mi.Available {
		return nil, errors.New("attract mission " + id + " is unavailable: " + mi.Reason)
	}
	return mi, nil
}

// attractStatus is the current status as an `attract` message.
func (m *Manager) attractStatus(re *int64) protocol.Attract {
	m.mu.Lock()
	defer m.mu.Unlock()
	a := m.ast
	a.T, a.Re = "attract", re
	if a.Phase == "" {
		a.Phase, a.Mission = protocol.AttractOff, m.o.Config.Attract.Mission
	}
	a.Total = m.astTotal
	return a
}

// setAttract changes the status and broadcasts it (under mu, so that
// broadcasts are in the order of the changes).
func (m *Manager) setAttract(phase string, mut func(a *protocol.Attract)) {
	m.mu.Lock()
	if mut != nil {
		mut(&m.ast)
	}
	m.ast.Phase = phase
	m.ast.Mission = m.o.Config.Attract.Mission
	m.ast.Total = m.astTotal
	msg := m.ast
	msg.T = "attract"
	m.hub.Broadcast(msg)
	m.mu.Unlock()
	m.log.Info("attract", "phase", phase, "flight", msg.Flight, "session", msg.Session, "cards", msg.Cards)
}

// attractStart implements attract_start: idempotent; ends any other
// session (home is attract) and starts the loop.
func (m *Manager) attractStart(x protocol.AttractStart) []any {
	mi, err := m.attractMission()
	if err != nil {
		return errMsg(x.ID, protocol.ErrNotAllowed, "%v", err)
	}
	m.attractMu.Lock()
	if m.attract != nil {
		m.attractMu.Unlock()
		return []any{m.attractStatus(x.ID)}
	}
	ctx, cancel := context.WithCancel(m.ctx)
	a := &attractRun{ctx: ctx, cancel: cancel, done: make(chan struct{}), mi: mi}
	m.attract = a
	m.attractMu.Unlock()

	m.opMu.Lock()
	if s := m.current(); s != nil && s.state != protocol.StateFailed {
		m.endSession("attract")
	}
	m.opMu.Unlock()
	m.setAttract(protocol.AttractStarting, func(st *protocol.Attract) { *st = protocol.Attract{} })
	go m.attractLoop(a)
	return []any{m.attractStatus(x.ID)}
}

// attractStop implements attract_stop (the hand-off): the reply comes
// after the attract core has been killed.
func (m *Manager) attractStop(x protocol.AttractStop) []any {
	m.stopAttract(x.Reason, x.ID)
	return []any{m.attractStatus(x.ID)}
}

// stopAttract stops the loop, if one runs: cancel it, wait until it has
// returned (it never waits on anything the caller holds), then end its
// session, which kills the core's process group. Safe to call at any time
// without opMu held. It reports whether a loop was running.
func (m *Manager) stopAttract(reason string, re *int64) bool {
	m.attractMu.Lock()
	a := m.attract
	m.attract = nil
	m.attractMu.Unlock()
	if a == nil {
		return false
	}
	t0 := time.Now()
	a.cancel()
	<-a.done
	m.opMu.Lock()
	if s := m.current(); s != nil && s.isAttract() {
		m.endSession("attract-" + reason)
	}
	m.opMu.Unlock()
	m.setAttract(protocol.AttractOff, func(st *protocol.Attract) { *st = protocol.Attract{} })
	if reason == "touch" {
		m.o.Metrics.Bridge("attract_touch", "", nil)
	}
	m.log.Info("attract stopped", "reason", reason, "took", time.Since(t0).Round(time.Millisecond), "flights", a.flight, "landed", a.landed)
	return true
}

// attractLoop flies until the run is stopped.
func (m *Manager) attractLoop(a *attractRun) {
	defer close(a.done)
	fresh := true // no frame to hold: the first flight, or after an error
	for {
		if !m.attractWaitHealthy(a) {
			return
		}
		a.flight++
		err := m.attractFlight(a, fresh)
		if a.ctx.Err() != nil {
			return
		}
		switch {
		case err == nil:
			fresh = false
		case errors.Is(err, errAttractFault):
			fresh = true
			m.attractShowError(a)
		default: // ended elsewhere: start the next flight
			fresh = true
		}
	}
}

// attractShowError sets phase error from the fault being recovered.
func (m *Manager) attractShowError(a *attractRun) {
	h := m.healthNow()
	m.mu.Lock()
	code, detail := m.errorCode, ""
	m.mu.Unlock()
	if h.Core == protocol.CoreDown {
		code, detail = h.Code, h.Detail
	}
	m.setAttract(protocol.AttractError, func(st *protocol.Attract) {
		st.Code, st.Detail = code, detail
		st.Flight, st.Landed = a.flight, a.landed
	})
}

// attractWaitHealthy waits until the core is up and no failed session is
// waiting for recovery (FR-51: attract resumes on its own). False if the
// loop was stopped meanwhile.
func (m *Manager) attractWaitHealthy(a *attractRun) bool {
	shown := false
	for {
		if a.ctx.Err() != nil {
			return false
		}
		h := m.healthNow()
		s := m.current()
		m.mu.Lock()
		failed := s != nil && s.state == protocol.StateFailed
		phase := m.ast.Phase
		m.mu.Unlock()
		if h.Core != protocol.CoreDown && !failed {
			return true
		}
		if !shown && phase != protocol.AttractError {
			m.attractShowError(a)
		}
		shown = true
		select {
		case <-a.ctx.Done():
			return false
		case <-time.After(100 * time.Millisecond):
		}
	}
}

// attractFlight flies once on a fresh core. fresh: phase starting (else
// recycling, which the previous flight already announced).
func (m *Manager) attractFlight(a *attractRun, fresh bool) error {
	cfg := m.o.Config.Attract
	mi := a.mi

	// 1. A fresh core: end the previous flight's session, boot the preset
	// and apply every step (no visitor steps in attract).
	m.opMu.Lock()
	if a.ctx.Err() != nil {
		m.opMu.Unlock()
		return errAttractStopped
	}
	if fresh {
		m.setAttract(protocol.AttractStarting, func(st *protocol.Attract) {
			*st = protocol.Attract{Flight: a.flight, Landed: a.landed}
		})
	}
	if s := m.current(); s != nil {
		m.endSession("attract-recycle")
	}
	s := m.openSession(a.ctx, mi, protocol.ModeAttract)
	if s != nil && m.current() == s {
		m.skipSetup(protocol.SkipSetup{})
	}
	m.opMu.Unlock()
	if a.ctx.Err() != nil {
		return errAttractStopped
	}
	if s == nil {
		return m.attractAfterEnd(nil)
	}
	if st := m.sessState(s); st != protocol.StateArmed {
		return m.attractAfterEnd(s)
	}

	// 2. READ: b c, then b r (spike S2); wait for the card (initAfter) and
	// for the run to settle, so INIT is accepted.
	m.setAttract(protocol.AttractReading, func(st *protocol.Attract) {
		*st = protocol.Attract{Flight: a.flight, Landed: a.landed, Session: s.id}
	})
	if err := m.attractPress(a, s, "read"); err != nil {
		return err
	}
	readBy := time.Now().Add(cfg.ReadTimeout.D())
	for !(mi.File.Run.InitAfter == "" || s.cps.Fired(mi.File.Run.InitAfter)) || s.run.State() != machine.RunIdle {
		if time.Now().After(readBy) {
			m.fault(s, core.Fault{Code: core.CodeDown, Detail: core.DetailStall + " (attract read)"})
			return errAttractFault
		}
		if err := m.attractSleep(a, s, attractPoll); err != nil {
			return err
		}
	}

	// 3. INIT, then fly until the landing checkpoint has frozen the clock.
	if err := m.attractPress(a, s, "init"); err != nil {
		return err
	}
	t0 := time.Now()
	m.setAttract(protocol.AttractFlying, func(st *protocol.Attract) { st.Cards = s.mirror.Cards() })
	m.o.Metrics.Bridge("attract_flight_started", "", map[string]any{"n": a.flight})
	landAt := mi.File.Run.FreezeAt
	if landAt == "" {
		landAt = mi.File.Result
	}
	lastCards, lastProgress := s.mirror.Cards(), t0
	var landedAt time.Time
	for {
		now := time.Now()
		if n := s.mirror.Cards(); n != lastCards {
			lastCards, lastProgress = n, now
		}
		if landedAt.IsZero() && landAt != "" && s.cps.Fired(landAt) {
			landedAt = now
		}
		if !landedAt.IsZero() && (mi.File.Run.FreezeAt == "" || m.sessFrozen(s) || now.Sub(landedAt) > 2*time.Second) {
			break
		}
		// FR-36: no new card for `stall` while flying is a hang, whatever
		// the run tracker thinks (the mission's own guard only watches a
		// busy run); and a flight that never lands is one too.
		if landedAt.IsZero() && (now.Sub(lastProgress) > cfg.Stall.D() || now.Sub(t0) > cfg.FlightMax.D()) {
			m.log.Warn("attract flight stalled", "id", s.id, "cards", lastCards, "since", now.Sub(lastProgress).Round(time.Millisecond))
			m.fault(s, core.Fault{Code: core.CodeDown, Detail: core.DetailStall})
			return errAttractFault
		}
		if err := m.attractSleep(a, s, attractPoll); err != nil {
			return err
		}
	}

	// 4. Landed: hold the finished plot, then recycle.
	land := landingOf(mi, s.mirror.State().Cards)
	if land != nil {
		land.FlightMs = landedAt.Sub(t0).Milliseconds()
	}
	a.landed++
	m.mu.Lock()
	m.astTotal++
	m.mu.Unlock()
	hold := cfg.Hold.D()
	m.setAttract(protocol.AttractLanded, func(st *protocol.Attract) {
		st.Landed, st.Cards, st.HoldMs, st.Landing = a.landed, s.mirror.Cards(), int(hold.Milliseconds()), land
	})
	m.o.Metrics.Bridge("attract_flight_landed", "", map[string]any{"n": a.flight, "durS": int(landedAt.Sub(t0).Seconds())})
	if err := m.attractSleep(a, s, hold); err != nil {
		return err
	}
	m.setAttract(protocol.AttractRecycling, func(st *protocol.Attract) { st.HoldMs = 0 })
	return nil
}

// attractPress sends a run button through the normal whitelist path. A
// refusal here is a bug or a diverged machine: it faults the session.
func (m *Manager) attractPress(a *attractRun, s *sess, b string) error {
	m.opMu.Lock()
	if a.ctx.Err() != nil {
		m.opMu.Unlock()
		return errAttractStopped
	}
	if m.current() != s {
		m.opMu.Unlock()
		return m.attractAfterEnd(s)
	}
	out := m.button(protocol.Button{T: "button", B: b})
	m.opMu.Unlock()
	if len(out) > 0 {
		msg := ""
		if e, ok := out[0].(protocol.Error); ok {
			msg = e.Message
		}
		m.fault(s, core.Fault{Code: core.CodeCmd, Detail: "attract " + b + ": " + msg})
		return errAttractFault
	}
	if m.sessState(s) == protocol.StateFailed {
		return errAttractFault
	}
	return nil
}

// attractSleep waits d, returning early if the loop is stopped or the
// session ends (fault or elsewhere).
func (m *Manager) attractSleep(a *attractRun, s *sess, d time.Duration) error {
	t := time.NewTimer(d)
	defer t.Stop()
	select {
	case <-a.ctx.Done():
		return errAttractStopped
	case <-s.stop:
		return m.attractAfterEnd(s)
	case <-t.C:
		return nil
	}
}

// attractAfterEnd classifies a flight whose session is gone or stopped.
func (m *Manager) attractAfterEnd(s *sess) error {
	if s == nil {
		if h := m.healthNow(); h.Core == protocol.CoreDown {
			return errAttractFault
		}
		if cur := m.current(); cur != nil && cur.state == protocol.StateFailed {
			return errAttractFault
		}
		return errAttractEnded
	}
	if m.sessState(s) == protocol.StateFailed {
		return errAttractFault
	}
	return errAttractEnded
}

func (m *Manager) sessState(s *sess) string {
	m.mu.Lock()
	defer m.mu.Unlock()
	return s.state
}

func (m *Manager) sessFrozen(s *sess) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	return s.frozen
}

// landingOf finds the landing card: the first card whose plot y is below
// zero (Trajectory: column 71 is '-', spike S2). Nil if the mission has no
// plot or no such card.
func landingOf(mi *mission.Mission, cards []machine.Punch) *protocol.AttractLanding {
	pl := mi.File.Run.Plot
	if pl == nil {
		return nil
	}
	var hop []int
	if cp := mi.File.Run.Cards; cp != nil {
		hop = cp.Hop
	}
	for _, c := range cards {
		y, ok := cardNumber(c.Fields, pl.Y)
		if !ok || y >= 0 {
			continue
		}
		x, _ := cardNumber(c.Fields, pl.X)
		h, _ := cardNumber(c.Fields, hop)
		return &protocol.AttractLanding{Card: c.N, Hop: h, Along: x, Up: y, Text: c.Text}
	}
	return nil
}

// overpunch11 are the characters printer.go puts in a negative field's
// first column: '-' is 11 over 0, J..R are 11 over 1..9 (the web side's
// run/cards.ts reads cards the same way).
const overpunch11 = "-JKLMNOPQR"

// cardNumber is the number punched in the given fields, joined; false if
// it is not a plain number in that code (a card is never guessed).
func cardNumber(fields []string, idx []int) (int64, bool) {
	if len(idx) == 0 {
		return 0, false
	}
	var b strings.Builder
	for _, i := range idx {
		if i < 0 || i >= len(fields) {
			return 0, false
		}
		b.WriteString(fields[i])
	}
	t := strings.TrimSpace(b.String())
	neg := false
	if len(t) > 1 {
		if z := strings.IndexByte(overpunch11, t[0]); z >= 0 {
			neg = true
			t = string(rune('0'+z)) + t[1:]
		}
	}
	if t == "" || strings.Trim(t, "0123456789") != "" {
		return 0, false
	}
	n, err := strconv.ParseInt(t, 10, 64)
	if err != nil {
		return 0, false
	}
	if neg {
		n = -n
	}
	return n, true
}
