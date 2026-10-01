package session

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"testing"
	"time"

	"github.com/coder/websocket"

	"eniac-kiosk/bridge/internal/config"
	"eniac-kiosk/bridge/internal/core"
	"eniac-kiosk/bridge/internal/machine"
	"eniac-kiosk/bridge/internal/mission"
	"eniac-kiosk/bridge/internal/protocol"
	"eniac-kiosk/bridge/internal/server"
	"eniac-kiosk/bridge/internal/testenv"
)

func TestMain(m *testing.M) {
	if len(os.Args) > 1 && os.Args[1] == "vlink" {
		os.Exit(core.RunVlink(os.Args[2:], os.Stdin, os.Stdout))
	}
	os.Exit(m.Run())
}

// writeLog captures `core< ...` debug lines (every core stdin write).
type writeLog struct {
	mu     sync.Mutex
	writes []string
}

func (w *writeLog) Enabled(context.Context, slog.Level) bool { return true }
func (w *writeLog) Handle(_ context.Context, r slog.Record) error {
	if strings.HasPrefix(r.Message, "core< ") {
		w.mu.Lock()
		w.writes = append(w.writes, strings.TrimPrefix(r.Message, "core< "))
		w.mu.Unlock()
	}
	return nil
}
func (w *writeLog) WithAttrs([]slog.Attr) slog.Handler { return w }
func (w *writeLog) WithGroup(string) slog.Handler      { return w }
func (w *writeLog) all() []string {
	w.mu.Lock()
	defer w.mu.Unlock()
	return append([]string(nil), w.writes...)
}

type rig struct {
	t    *testing.T
	addr string
	mgr  *Manager
	wl   *writeLog
	reg  *mission.Registry
	cfg  config.Config
	rec  *memRecorder
}

type memRecorder struct {
	mu  sync.Mutex
	evs []string
}

func (r *memRecorder) Bridge(ev, sid string, f map[string]any) {
	r.mu.Lock()
	r.evs = append(r.evs, ev)
	r.mu.Unlock()
}
func (r *memRecorder) UI(m protocol.Metric, sid string) error {
	r.mu.Lock()
	r.evs = append(r.evs, "ui:"+m.Ev)
	r.mu.Unlock()
	return nil
}
func (r *memRecorder) SessionEnd() {}

func newRig(t *testing.T, tweak func(*Options)) *rig {
	corePath, rt := testenv.Core(t)
	root, _ := testenv.RepoRoot()
	cfg := config.Default()
	cfg.Paths.Core, cfg.Paths.Upstream = corePath, rt
	cfg.Paths.Missions = filepath.Join(root, "missions")
	cfg.Paths.Run = testenv.ShortTempDir(t)
	cfg.Recovery.Backoff = []config.Duration{config.Duration(100 * time.Millisecond), config.Duration(200 * time.Millisecond), config.Duration(300 * time.Millisecond)}
	list, err := mission.LoadDir(cfg.Paths.Missions, rt)
	if err != nil {
		t.Fatal(err)
	}
	reg := mission.NewRegistry(list)
	wl := &writeLog{}
	log := slog.New(wl)
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	cfg.Listen = ln.Addr().String()
	ctx, cancel := context.WithCancel(context.Background())
	hub := server.NewHub(slog.New(slog.NewTextHandler(io.Discard, nil)))
	self, _ := os.Executable()
	rec := &memRecorder{}
	o := Options{Config: cfg, Missions: reg, Hub: hub, VlinkExe: self, Log: log, Metrics: rec}
	if tweak != nil {
		tweak(&o)
	}
	mgr, err := New(ctx, o)
	if err != nil {
		t.Fatal(err)
	}
	go server.Run(ctx, server.Options{Config: cfg, Log: slog.New(slog.NewTextHandler(io.Discard, nil)), Missions: reg,
		Hub: hub, Handler: mgr, Healthz: mgr.Healthz, Listener: ln})
	t.Cleanup(func() { mgr.Close(); cancel() })
	return &rig{t: t, addr: ln.Addr().String(), mgr: mgr, wl: wl, reg: reg, cfg: cfg, rec: rec}
}

// client is a websocket client that mirrors MachineState from state/frame.
type client struct {
	t       *testing.T
	c       *websocket.Conn
	msgs    chan map[string]any
	mu      sync.Mutex
	machine map[string]any
	seq     float64
	nextID  int64
	history []map[string]any
}

func (r *rig) connect() *client {
	h := http.Header{"Origin": []string{"http://" + r.addr}}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	c, _, err := websocket.Dial(ctx, "ws://"+r.addr+"/ws", &websocket.DialOptions{HTTPHeader: h})
	if err != nil {
		r.t.Fatal(err)
	}
	c.SetReadLimit(1 << 20)
	cl := &client{t: r.t, c: c, msgs: make(chan map[string]any, 10000)}
	go func() {
		for {
			_, b, err := c.Read(context.Background())
			if err != nil {
				close(cl.msgs)
				return
			}
			var m map[string]any
			json.Unmarshal(b, &m)
			cl.mu.Lock()
			switch m["t"] {
			case "state":
				if mm, ok := m["machine"].(map[string]any); ok {
					cl.machine = mm
				} else {
					cl.machine = nil
				}
				cl.seq = m["seq"].(float64)
			case "frame":
				if s := m["seq"].(float64); s > cl.seq && cl.machine != nil {
					machine.Merge(cl.machine, m["d"].(map[string]any))
					cl.seq = s
				}
			}
			cl.history = append(cl.history, m)
			cl.mu.Unlock()
			cl.msgs <- m
		}
	}()
	r.t.Cleanup(func() { c.CloseNow() })
	return cl
}

func (cl *client) send(format string, a ...any) int64 {
	cl.nextID++
	s := fmt.Sprintf(format, a...)
	s = strings.Replace(s, "{", fmt.Sprintf(`{"id":%d,`, cl.nextID), 1)
	if err := cl.c.Write(context.Background(), websocket.MessageText, []byte(s)); err != nil {
		cl.t.Fatal(err)
	}
	return cl.nextID
}

// wait returns the first message matching pred within d.
func (cl *client) wait(d time.Duration, what string, pred func(map[string]any) bool) map[string]any {
	cl.t.Helper()
	timeout := time.After(d)
	for {
		select {
		case m, ok := <-cl.msgs:
			if !ok {
				cl.t.Fatalf("connection closed waiting for %s", what)
			}
			if pred(m) {
				return m
			}
		case <-timeout:
			cl.t.Fatalf("timed out waiting for %s", what)
		}
	}
}

// seen waits until any message so far (consumed or not) matches pred.
func (cl *client) seen(d time.Duration, what string, pred func(map[string]any) bool) map[string]any {
	cl.t.Helper()
	deadline := time.Now().Add(d)
	for time.Now().Before(deadline) {
		cl.mu.Lock()
		for _, m := range cl.history {
			if pred(m) {
				cl.mu.Unlock()
				return m
			}
		}
		cl.mu.Unlock()
		time.Sleep(10 * time.Millisecond)
	}
	cl.t.Fatalf("never saw %s", what)
	return nil
}

func is(t string, kv ...string) func(map[string]any) bool {
	return func(m map[string]any) bool {
		if m["t"] != t {
			return false
		}
		for i := 0; i+1 < len(kv); i += 2 {
			if fmt.Sprint(m[kv[i]]) != kv[i+1] {
				return false
			}
		}
		return true
	}
}

func (cl *client) accValue(n string) float64 {
	cl.mu.Lock()
	defer cl.mu.Unlock()
	if cl.machine == nil {
		return -1
	}
	return cl.machine["acc"].(map[string]any)[n].(map[string]any)["value"].(float64)
}

var squaresSteps = []string{"j1-one", "const-to-trunk1", "trunk1-to-a1", "a1-to-a2", "a1-twice", "init-to-1-1", "a2-6o-to-1-3"}

func (cl *client) startSquares() {
	cl.send(`{"t":"start_mission","mission":"squares","mode":"visitor"}`)
	cl.wait(10*time.Second, "session setup", is("session", "state", "setup"))
}

// initAndWait presses INIT and waits for the idle run event.
func (cl *client) initAndWait() map[string]any {
	cl.send(`{"t":"button","b":"init"}`)
	cl.wait(3*time.Second, "run busy", is("run", "state", "busy"))
	return cl.wait(10*time.Second, "run idle", is("run", "state", "idle"))
}

// ws e2e: start Squares, apply 7 steps, 3 INITs, acc1=3 and acc2=9 in the
// mirrored state (dev plan #11).
func TestSquaresEndToEnd(t *testing.T) {
	r := newRig(t, nil)
	cl := r.connect()
	cl.wait(3*time.Second, "hello", is("hello"))
	st := cl.wait(3*time.Second, "state", is("state"))
	if st["session"] != nil || st["machine"] != nil {
		t.Fatalf("no session yet, but state carries %v / machine", st["session"])
	}
	cl.startSquares()
	for i, id := range squaresSteps {
		cl.send(`{"t":"apply_step","step":%q,"assisted":%v}`, id, i == 4)
		m := cl.wait(3*time.Second, "step_applied "+id, is("step_applied", "step", id))
		if m["remaining"].(float64) != float64(6-i) || m["assisted"] != (i == 4) {
			t.Fatalf("%v", m)
		}
	}
	cl.wait(3*time.Second, "setup_complete", is("setup_complete", "skipped", "0"))
	cl.wait(3*time.Second, "armed", is("session", "state", "armed"))
	cl.send(`{"t":"set_speed","speed":"full"}`)
	for x := 1; x <= 3; x++ {
		idle := cl.initAndWait()
		settled := idle["settled"].(map[string]any)
		if settled["1"] != float64(x) || settled["2"] != float64(x*x) || idle["inits"] != float64(x) {
			t.Fatalf("INIT %d: %v", x, idle)
		}
	}
	time.Sleep(150 * time.Millisecond) // let the last frame land
	if a1, a2 := cl.accValue("1"), cl.accValue("2"); a1 != 3 || a2 != 9 {
		t.Fatalf("mirrored state acc1=%v acc2=%v", a1, a2)
	}
	// Invariant: preset + the step lines in order, then run commands only.
	w := r.wl.all()
	var steps []string
	for _, s := range w {
		if strings.HasPrefix(s, "p ") || strings.HasPrefix(s, "s ") && !strings.HasPrefix(s, "s cy.") {
			steps = append(steps, s)
		}
	}
	want := []string{"s c.j1 1", "p c.o 1", "p 1 a1.α", "p a1.A a2.β", "s a1.rp6 2", "p i.io 1-1", "p a2.6o 1-3"}
	if strings.Join(steps, "|") != strings.Join(want, "|") {
		t.Fatalf("step writes %q", steps)
	}
	if !strings.HasPrefix(w[0], "f p ") || w[1] != "s cy.rate 13" {
		t.Fatalf("session setup writes %q", w[:2])
	}
	// A fresh client gets the same state.
	cl2 := r.connect()
	cl2.wait(3*time.Second, "hello", is("hello"))
	st2 := cl2.wait(3*time.Second, "state", is("state"))
	if st2["session"].(map[string]any)["state"] != "running" || cl2.accValue("2") != 9 {
		t.Fatalf("resync state %v", st2["session"])
	}
	cl.send(`{"t":"end_session","reason":"done"}`)
	cl.wait(3*time.Second, "session none", is("session", "state", "none"))
	evs := strings.Join(r.rec.evs, ",")
	if !strings.Contains(evs, "session_start,mission_start") || !strings.Contains(evs, "session_end") {
		t.Fatalf("metrics %s", evs)
	}
}

func TestRejects(t *testing.T) {
	r := newRig(t, nil)
	cl := r.connect()
	errFor := func(id int64) map[string]any {
		return cl.wait(3*time.Second, fmt.Sprintf("error re=%d", id), func(m map[string]any) bool {
			return m["t"] == "error" && m["re"] == float64(id)
		})
	}
	expect := func(id int64, code string) {
		t.Helper()
		if m := errFor(id); m["code"] != code {
			t.Fatalf("id %d: %v, want %s", id, m, code)
		}
	}
	expect(cl.send(`{"t":"apply_step","step":"j1-one"}`), "BAD_STATE") // no session
	expect(cl.send(`{"t":"button","b":"init"}`), "BAD_STATE")
	expect(cl.send(`{"t":"start_mission","mission":"cubes"}`), "NOT_ALLOWED")
	cl.startSquares()
	expect(cl.send(`{"t":"button","b":"init"}`), "BAD_STATE")               // still in setup
	expect(cl.send(`{"t":"apply_step","step":"a1-to-a2"}`), "NOT_ALLOWED")  // out of order
	expect(cl.send(`{"t":"apply_step","step":"nope"}`), "UNKNOWN_STEP")     // unknown
	expect(cl.send(`{"t":"apply_step","step":"j1-one","line":"R"}`), "BAD_MESSAGE") // smuggled field
	expect(cl.send(`{"t":"apply_step","step":"j1-one\nq"}`), "BAD_MESSAGE")         // newline
	expect(cl.send(`{"t":"set_speed","speed":"full"}`), "BAD_STATE")
	cl.send(`{"t":"apply_step","step":"j1-one"}`)
	cl.wait(3*time.Second, "step_applied", is("step_applied", "step", "j1-one"))
	expect(cl.send(`{"t":"apply_step","step":"j1-one"}`), "NOT_ALLOWED") // repeated
	cl.send(`{"t":"skip_setup"}`)
	cl.wait(10*time.Second, "setup_complete", is("setup_complete", "skipped", "6"))
	expect(cl.send(`{"t":"button","b":"read"}`), "NOT_ALLOWED")
	expect(cl.send(`{"t":"set_speed","speed":"warp"}`), "NOT_ALLOWED")
	// INIT while busy: at slow speed (cy.rate 13) the run takes about 13 s;
	// then Full finishes it (changing speed mid-run is safe, spike S2/S4).
	cl.send(`{"t":"button","b":"init"}`)
	cl.wait(3*time.Second, "busy", is("run", "state", "busy"))
	expect(cl.send(`{"t":"button","b":"init"}`), "BUSY")
	expect(cl.send(`{"t":"button","b":"clear"}`), "BUSY")
	cl.send(`{"t":"set_speed","speed":"full"}`)
	cl.wait(20*time.Second, "idle", is("run", "state", "idle"))
	// CLEAR resets both accumulators (dev plan 7 item 5, checked on the Mac).
	cl.send(`{"t":"button","b":"clear"}`)
	idle := cl.wait(5*time.Second, "idle after clear", is("run", "state", "idle"))
	if s := idle["settled"].(map[string]any); s["1"] != 0.0 || s["2"] != 0.0 {
		t.Fatalf("after CLEAR settled %v", s)
	}
	// Nothing outside the allow-list was ever written.
	for _, w := range r.wl.all() {
		if w == "R" || strings.HasPrefix(w, "l ") || strings.Contains(w, "\n") {
			t.Fatalf("forbidden write %q", w)
		}
	}
}

// skip_setup after 3 manual steps applies the other 4.
func TestSkipSetupAfterThree(t *testing.T) {
	r := newRig(t, nil)
	cl := r.connect()
	cl.startSquares()
	for _, id := range squaresSteps[:3] {
		cl.send(`{"t":"apply_step","step":%q}`, id)
		cl.wait(3*time.Second, id, is("step_applied", "step", id))
	}
	cl.send(`{"t":"skip_setup"}`)
	cl.wait(10*time.Second, "setup_complete", is("setup_complete", "skipped", "4"))
	sess := cl.wait(3*time.Second, "armed", is("session", "state", "armed"))
	if len(sess["applied"].([]any)) != 7 || sess["remaining"] != 0.0 {
		t.Fatalf("%v", sess)
	}
	cl.send(`{"t":"set_speed","speed":"full"}`)
	idle := cl.initAndWait()
	if s := idle["settled"].(map[string]any); s["1"] != 1.0 || s["2"] != 1.0 {
		t.Fatalf("%v", s)
	}
}

// Checkpoints: first-square after INIT 1; answer (acc1 == 12) moves the
// session to result; INIT again is still allowed (result is a milestone).
func TestCheckpointsAndResult(t *testing.T) {
	r := newRig(t, nil)
	cl := r.connect()
	cl.startSquares()
	cl.send(`{"t":"skip_setup"}`)
	cl.wait(10*time.Second, "setup_complete", is("setup_complete"))
	cl.send(`{"t":"set_speed","speed":"full"}`)
	cl.initAndWait()
	cl.seen(2*time.Second, "first-square", is("checkpoint", "id", "first-square"))
	for x := 2; x <= 12; x++ {
		cl.initAndWait()
	}
	cl.seen(2*time.Second, "answer", is("checkpoint", "id", "answer"))
	cl.seen(2*time.Second, "result", is("session", "state", "result"))
	idle := cl.initAndWait()
	if s := idle["settled"].(map[string]any); s["1"] != 13.0 || s["2"] != 169.0 {
		t.Fatalf("%v", s)
	}
	if !strings.Contains(strings.Join(r.rec.evs, ","), "mission_complete") {
		t.Fatal("mission_complete not recorded")
	}
}

// kill -9 of the real core mid-session: health goes down, the session
// fails, recovery brings health back up without restarting the bridge, and
// the old session is not resumed.
func TestKill9Recovers(t *testing.T) {
	r := newRig(t, nil)
	cl := r.connect()
	cl.startSquares()
	h := r.mgr.Healthz()
	if h.Core.Pid == 0 {
		t.Fatal("no core pid")
	}
	syscall.Kill(h.Core.Pid, syscall.SIGKILL)
	down := cl.wait(5*time.Second, "health down", is("health", "core", "down"))
	if down["code"] != "E-CORE-DOWN" || down["attempt"] != 1.0 || down["of"] != 3.0 {
		t.Fatalf("%v", down)
	}
	cl.seen(3*time.Second, "failed", is("session", "state", "failed"))
	if hz := r.mgr.Healthz(); hz.Status != "down" {
		t.Fatalf("healthz %+v", hz)
	}
	cl.wait(10*time.Second, "health up", is("health", "core", "up"))
	cl.seen(3*time.Second, "session none", is("session", "state", "none"))
	if hz := r.mgr.Healthz(); hz.Status != "degraded" || hz.Core.RestartsTotal != 1 || hz.Core.LastError == nil {
		t.Fatalf("healthz after recovery %+v", hz)
	}
	// A new session works.
	cl.startSquares()
	out, _ := exec.Command("pgrep", "-f", r.cfg.Paths.Run).Output()
	if n := len(strings.Fields(string(out))); n != 2 { // one core + its vlink
		t.Fatalf("%d processes for the new session", n)
	}
}

func TestOrphanReaped(t *testing.T) {
	r := newRig(t, func(o *Options) { o.OrphanAfter = 500 * time.Millisecond })
	cl := r.connect()
	cl.startSquares()
	cl.c.Close(websocket.StatusNormalClosure, "")
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		if r.mgr.current() == nil {
			return
		}
		time.Sleep(100 * time.Millisecond)
	}
	t.Fatal("session not reaped")
}

// Primes (M2): one INIT at Full punches the primes 3, 5, 7 ... as `punch`
// messages, in order; first-card fires; a second INIT is refused (run.initOnce)
// and so are CLEAR and READ (not in run.buttons). With ENIAC_WRITE_FIXTURES=1
// the first punch message is written to tests/fixtures/protocol/punch.json.
func TestPrimesSessionPunches(t *testing.T) {
	r := newRig(t, nil)
	cl := r.connect()
	cl.wait(3*time.Second, "state", is("state"))
	cl.send(`{"t":"start_mission","mission":"primes","mode":"visitor"}`)
	cl.wait(10*time.Second, "session setup", is("session", "state", "setup"))
	cl.send(`{"t":"skip_setup"}`)
	cl.wait(10*time.Second, "setup_complete", is("setup_complete", "skipped", "5"))
	cl.send(`{"t":"set_speed","speed":"full"}`)
	cl.send(`{"t":"button","b":"init"}`)
	cl.wait(3*time.Second, "run busy", is("run", "state", "busy"))
	want := []string{"00003", "00005", "00007", "00011"}
	for i, w := range want {
		p := cl.wait(10*time.Second, "punch "+w, func(m map[string]any) bool { return m["t"] == "punch" && m["n"] == float64(i+1) })
		f := p["fields"].([]any)
		if len(f) != 16 || f[13] != w || f[12] != "00000" || len(p["text"].(string)) != 80 {
			t.Fatalf("card %d: %v", i+1, p)
		}
		if i == 0 && os.Getenv("ENIAC_WRITE_FIXTURES") == "1" {
			root, _ := testenv.RepoRoot()
			b, _ := json.MarshalIndent(p, "", "  ")
			os.WriteFile(filepath.Join(root, "tests", "fixtures", "protocol", "punch.json"), append(b, '\n'), 0o644)
		}
	}
	cl.seen(2*time.Second, "first-card", is("checkpoint", "id", "first-card"))
	cl.send(`{"t":"button","b":"init","id":7}`)
	cl.wait(3*time.Second, "second INIT refused", func(m map[string]any) bool { return m["t"] == "error" && m["re"] == 7.0 && (m["code"] == "BUSY" || m["code"] == "NOT_ALLOWED") })
	cl.send(`{"t":"button","b":"clear","id":8}`)
	cl.wait(3*time.Second, "CLEAR refused", func(m map[string]any) bool { return m["t"] == "error" && m["re"] == 8.0 })
	cl.send(`{"t":"button","b":"read","id":9}`)
	cl.wait(3*time.Second, "READ refused", func(m map[string]any) bool { return m["t"] == "error" && m["re"] == 9.0 && m["code"] == "NOT_ALLOWED" })
	// A fresh client's state carries the cards so far (the last 20).
	cl2 := r.connect()
	cl2.wait(3*time.Second, "hello", is("hello"))
	st := cl2.wait(3*time.Second, "state", is("state"))
	cards := st["cards"].([]any)
	if len(cards) < 4 || cards[0].(map[string]any)["fields"].([]any)[13] != "00003" {
		t.Fatalf("state cards %v", cards)
	}
}
