package session

import (
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"eniac-kiosk/bridge/internal/config"
	"eniac-kiosk/bridge/internal/machine"
	"eniac-kiosk/bridge/internal/testenv"
)

// attractRig runs the manager on the fake core in traj mode: READ loads
// the card, INIT punches 6 cards 80 ms apart (the 6th lands), and the
// fake keeps flying until `s cy.op 1a`, like trajdemo.e. Hold is short.
func attractRig(t *testing.T, env ...string) *rig { return attractRigHold(t, 300*time.Millisecond, env...) }

func attractRigHold(t *testing.T, hold time.Duration, env ...string) *rig {
	return newRig(t, func(o *Options) {
		o.Config.Paths.Core = testenv.Fakecore(t)
		o.CoreExtraEnv = append([]string{"FAKECORE_MODE=traj", "FAKECORE_N=6", "FAKECORE_AFTER=80"}, env...)
		o.Config.Attract.Hold = config.Duration(hold)
		o.Config.Attract.Stall = config.Duration(1500 * time.Millisecond)
		o.Config.Attract.ReadTimeout = config.Duration(1500 * time.Millisecond)
		o.StallOverride = 1500 * time.Millisecond
	})
}

// procs counts processes (cores and vlink children) of this rig.
func (r *rig) procs() int {
	out, _ := exec.Command("pgrep", "-f", r.cfg.Paths.Run).Output()
	return len(strings.Fields(string(out)))
}

func (r *rig) waitProcs(t *testing.T, n int, d time.Duration) {
	t.Helper()
	deadline := time.Now().Add(d)
	for time.Now().Before(deadline) {
		if r.procs() == n {
			return
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatalf("%d processes, want %d", r.procs(), n)
}

func (r *rig) metrics() string {
	r.rec.mu.Lock()
	defer r.rec.mu.Unlock()
	return strings.Join(r.rec.evs, ",")
}

func phase(p string) func(map[string]any) bool { return is("attract", "phase", p) }

// The loop: starting -> reading -> flying -> landed (with the landing
// values) -> recycling -> the next flight on a new session and a new core.
// Each flight sends exactly b c, b r, b i and one s cy.op 1a; at most one
// core runs at any time; attract flights are not visitor sessions in the
// metrics.
func TestAttractLoopFliesAndRecycles(t *testing.T) {
	r := attractRig(t)
	cl := r.connect()
	cl.wait(3*time.Second, "state", is("state"))
	before := len(r.wl.all())
	cl.send(`{"t":"attract_start"}`)
	cl.wait(3*time.Second, "starting", phase("starting"))
	stop := make(chan struct{})
	maxProcs := make(chan int, 1)
	go func() {
		mx := 0
		for {
			select {
			case <-stop:
				maxProcs <- mx
				return
			default:
			}
			if n := r.procs(); n > mx {
				mx = n
			}
			time.Sleep(15 * time.Millisecond)
		}
	}()
	var sessions []string
	for flight := 1; flight <= 3; flight++ {
		rd := cl.wait(10*time.Second, "reading", phase("reading"))
		if rd["flight"] != float64(flight) || rd["session"] == "" {
			t.Fatalf("reading %v", rd)
		}
		sessions = append(sessions, rd["session"].(string))
		cl.wait(5*time.Second, "flying", phase("flying"))
		ld := cl.wait(10*time.Second, "landed", phase("landed"))
		land, _ := ld["landing"].(map[string]any)
		if land == nil || land["card"] != 6.0 || land["hop"] != 6.0 || land["up"] != -29.0 || land["along"] != float64(6*14128681) ||
			ld["holdMs"] != 300.0 || ld["landed"] != float64(flight) || ld["cards"].(float64) < 6 {
			t.Fatalf("landed %v", ld)
		}
		if !strings.HasPrefix(land["text"].(string)[70:], "-") {
			t.Fatalf("landing card %q", land["text"])
		}
		cl.wait(3*time.Second, "recycling", phase("recycling"))
	}
	close(stop)
	if mx := <-maxProcs; mx > 2 {
		t.Fatalf("%d processes at once: more than one core", mx)
	}
	if sessions[0] == sessions[1] || sessions[1] == sessions[2] {
		t.Fatalf("flights shared a session: %v", sessions)
	}
	// Every session message of the loop is mode attract.
	cl.mu.Lock()
	for _, m := range cl.history {
		if m["t"] == "session" && m["mode"] != "attract" {
			t.Errorf("session %v", m)
		}
	}
	cl.mu.Unlock()
	// Per flight: b c, b r, b i, s cy.op 1a, in that order.
	var run []string
	for _, w := range r.wl.all()[before:] {
		if strings.HasPrefix(w, "b ") || w == "s cy.op 1a" {
			run = append(run, w)
		}
	}
	want := strings.Repeat("b c|b r|b i|s cy.op 1a|", 3)
	if got := strings.Join(run, "|") + "|"; !strings.HasPrefix(got, want) {
		t.Fatalf("run commands %q", got)
	}
	ev := r.metrics()
	if strings.Contains(ev, "session_start") || strings.Contains(ev, "mission_complete") || strings.Count(ev, "attract_flight_landed") < 3 ||
		strings.Count(ev, "attract_flight_started") < 3 {
		t.Fatalf("metrics %s", ev)
	}
	// A late joiner's state carries the attract status and the session.
	cl2 := r.connect()
	cl2.wait(3*time.Second, "hello", is("hello"))
	st := cl2.wait(3*time.Second, "state", is("state"))
	if a, _ := st["attract"].(map[string]any); a == nil || a["phase"] == "off" || a["mission"] != "trajectory" {
		t.Fatalf("state.attract %v", st["attract"])
	}
}

// The hand-off (FR-31): attract_stop mid-flight kills the attract core and
// replies off; nothing of the attract session reaches a client after its
// "none"; then a mission starts on a fresh core. Repeated in every phase.
func TestAttractHandOffMidFlight(t *testing.T) {
	r := attractRig(t, "FAKECORE_AFTER=150")
	cl := r.connect()
	cl.wait(3*time.Second, "state", is("state"))
	for _, at := range []string{"starting", "reading", "flying", "landed", "recycling"} {
		cl.send(`{"t":"attract_start"}`)
		m := cl.wait(10*time.Second, at, phase(at))
		sess, _ := m["session"].(string)
		if at == "flying" {
			cl.wait(3*time.Second, "a card", is("punch"))
		}
		t0 := time.Now()
		id := cl.send(`{"t":"attract_stop","reason":"touch"}`)
		off := cl.wait(5*time.Second, "off reply", func(m map[string]any) bool { return m["t"] == "attract" && m["re"] == float64(id) })
		took := time.Since(t0)
		if off["phase"] != "off" {
			t.Fatalf("%s: reply %v", at, off)
		}
		if n := r.procs(); n != 0 {
			t.Fatalf("%s: %d processes after the hand-off reply", at, n)
		}
		t.Logf("hand-off in %s: %s", at, took.Round(time.Millisecond))
		if took > 1500*time.Millisecond {
			t.Fatalf("%s: hand-off took %s", at, took)
		}
		if r.mgr.current() != nil {
			t.Fatalf("%s: a session is still current", at)
		}
		// Nothing of the old session after its "none".
		time.Sleep(400 * time.Millisecond)
		cl.mu.Lock()
		noneAt := -1
		for i, m := range cl.history {
			if m["t"] == "session" && m["state"] == "none" && (sess == "" || m["id"] == sess) {
				noneAt = i
			}
		}
		if sess != "" && noneAt < 0 {
			cl.mu.Unlock()
			t.Fatalf("%s: no session none for %s", at, sess)
		}
		for _, m := range cl.history[noneAt+1:] {
			switch m["t"] {
			case "punch", "frame", "run", "checkpoint", "step_applied", "setup_complete":
				cl.mu.Unlock()
				t.Fatalf("%s: %v after the attract session ended", at, m)
			case "health":
				if m["core"] != "up" {
					cl.mu.Unlock()
					t.Fatalf("%s: %v (a hand-off is not a fault)", at, m)
				}
			}
		}
		cl.history = nil
		cl.mu.Unlock()
		drain(cl)
	}
	if n := strings.Count(r.metrics(), "attract_touch"); n != 5 {
		t.Fatalf("attract_touch %d times: %s", n, r.metrics())
	}
	// The visitor's mission gets the box.
	cl.send(`{"t":"start_mission","mission":"squares","mode":"visitor"}`)
	cl.wait(10*time.Second, "mission setup", is("session", "state", "setup", "mode", "visitor"))
	r.waitProcs(t, 2, 2*time.Second)
}

func drain(cl *client) {
	for {
		select {
		case <-cl.msgs:
		default:
			return
		}
	}
}

// start_mission stops attract by itself (FR-35); end_session too. Only one
// core runs at any time.
func TestStartMissionEndsAttract(t *testing.T) {
	r := attractRig(t)
	cl := r.connect()
	cl.wait(3*time.Second, "state", is("state"))
	cl.send(`{"t":"attract_start"}`)
	cl.wait(10*time.Second, "flying", phase("flying"))
	cl.send(`{"t":"start_mission","mission":"trajectory","mode":"visitor"}`)
	cl.wait(5*time.Second, "off", phase("off"))
	cl.wait(10*time.Second, "visitor setup", is("session", "state", "setup", "mode", "visitor"))
	r.waitProcs(t, 2, 2*time.Second)
	// attract_start ends the visitor session (home is attract).
	cl.send(`{"t":"attract_start"}`)
	cl.wait(5*time.Second, "visitor none", is("session", "state", "none", "mode", "visitor"))
	cl.wait(10*time.Second, "reading", phase("reading"))
	// end_session stops it too.
	cl.send(`{"t":"end_session","reason":"idle"}`)
	cl.wait(5*time.Second, "off", phase("off"))
	r.waitProcs(t, 0, 2*time.Second)
	// A visitor may not start an attract-mode session directly.
	id := cl.send(`{"t":"start_mission","mission":"trajectory","mode":"attract"}`)
	cl.wait(3*time.Second, "refused", func(m map[string]any) bool { return m["t"] == "error" && m["re"] == float64(id) })
}

// attract_start is idempotent: a second one does not restart the flight.
func TestAttractStartIdempotent(t *testing.T) {
	r := attractRig(t)
	cl := r.connect()
	cl.send(`{"t":"attract_start"}`)
	rd := cl.wait(10*time.Second, "reading", phase("reading"))
	id := cl.send(`{"t":"attract_start"}`)
	again := cl.wait(3*time.Second, "reply", func(m map[string]any) bool { return m["t"] == "attract" && m["re"] == float64(id) })
	if again["session"] != rd["session"] || again["flight"] != 1.0 {
		t.Fatalf("second attract_start: %v (was %v)", again, rd)
	}
	cl.wait(10*time.Second, "landed", phase("landed"))
	id = cl.send(`{"t":"attract_stop"}`)
	cl.wait(3*time.Second, "off", func(m map[string]any) bool { return m["t"] == "attract" && m["re"] == float64(id) })
	// Stopping twice is harmless.
	id = cl.send(`{"t":"attract_stop","reason":"menu"}`)
	cl.wait(3*time.Second, "off again", func(m map[string]any) bool { return m["t"] == "attract" && m["re"] == float64(id) && m["phase"] == "off" })
	r.waitProcs(t, 0, time.Second)
}

// A core crash mid-flight: health down, attract phase error, recovery
// (backoff + probe), then attract resumes on its own and lands (FR-51).
func TestAttractCrashRecovers(t *testing.T) {
	once := filepath.Join(testenv.ShortTempDir(t), "once")
	r := attractRig(t, "FAKECORE_TRAJ_FAIL=exit", "FAKECORE_ONCE="+once)
	cl := r.connect()
	cl.send(`{"t":"attract_start"}`)
	down := cl.wait(10*time.Second, "health down", is("health", "core", "down"))
	if down["code"] != "E-CORE-DOWN" {
		t.Fatalf("%v", down)
	}
	e := cl.seen(3*time.Second, "error phase", phase("error"))
	if e["code"] != "E-CORE-DOWN" {
		t.Fatalf("%v", e)
	}
	cl.wait(10*time.Second, "health up", is("health", "core", "up"))
	cl.wait(5*time.Second, "starting again", phase("starting"))
	ld := cl.wait(10*time.Second, "landed after recovery", phase("landed"))
	if ld["landed"] != 1.0 {
		t.Fatalf("%v", ld)
	}
	if hz := r.mgr.Healthz(); hz.Core.RestartsTotal != 1 {
		t.Fatalf("healthz %+v", hz.Core)
	}
}

// A flight that stops punching while busy is a hang (FR-36): stall fault,
// recovery, and attract resumes.
func TestAttractStallRecovers(t *testing.T) {
	once := filepath.Join(testenv.ShortTempDir(t), "once")
	r := attractRig(t, "FAKECORE_TRAJ_FAIL=stall", "FAKECORE_ONCE="+once)
	cl := r.connect()
	cl.send(`{"t":"attract_start"}`)
	cl.wait(10*time.Second, "flying", phase("flying"))
	down := cl.wait(10*time.Second, "health down", is("health", "core", "down"))
	if down["detail"] != "stall" {
		t.Fatalf("%v", down)
	}
	cl.seen(3*time.Second, "error phase", phase("error"))
	cl.wait(10*time.Second, "health up", is("health", "core", "up"))
	cl.wait(10*time.Second, "landed after recovery", phase("landed"))
}

// READ that never loads the card faults too (attract read timeout).
func TestAttractReadTimeoutRecovers(t *testing.T) {
	once := filepath.Join(testenv.ShortTempDir(t), "once")
	r := attractRig(t, "FAKECORE_TRAJ_FAIL=read", "FAKECORE_ONCE="+once)
	cl := r.connect()
	cl.send(`{"t":"attract_start"}`)
	cl.wait(10*time.Second, "reading", phase("reading"))
	cl.wait(10*time.Second, "health down", is("health", "core", "down"))
	cl.wait(10*time.Second, "health up", is("health", "core", "up"))
	cl.wait(10*time.Second, "landed after recovery", phase("landed"))
}

// A stop while the error state waits for recovery: no flight starts after
// recovery.
func TestAttractStopDuringError(t *testing.T) {
	once := filepath.Join(testenv.ShortTempDir(t), "once")
	r := attractRig(t, "FAKECORE_TRAJ_FAIL=exit", "FAKECORE_ONCE="+once)
	cl := r.connect()
	cl.send(`{"t":"attract_start"}`)
	cl.wait(10*time.Second, "error phase", phase("error"))
	cl.send(`{"t":"attract_stop","reason":"menu"}`)
	cl.wait(3*time.Second, "off", phase("off"))
	cl.wait(10*time.Second, "health up", is("health", "core", "up"))
	time.Sleep(700 * time.Millisecond)
	if r.mgr.current() != nil || r.procs() != 0 {
		t.Fatalf("attract resumed after its stop: %v, %d processes", r.mgr.current(), r.procs())
	}
}

// No kiosk page for OrphanAfter: attract stops with the session.
func TestAttractOrphanStops(t *testing.T) {
	r := newRig(t, func(o *Options) {
		o.Config.Paths.Core = testenv.Fakecore(t)
		o.CoreExtraEnv = []string{"FAKECORE_MODE=traj", "FAKECORE_N=6", "FAKECORE_AFTER=80"}
		o.Config.Attract.Hold = config.Duration(300 * time.Millisecond)
		o.OrphanAfter = 500 * time.Millisecond
	})
	cl := r.connect()
	cl.send(`{"t":"attract_start"}`)
	cl.wait(10*time.Second, "reading", phase("reading"))
	cl.c.CloseNow()
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		r.mgr.attractMu.Lock()
		a := r.mgr.attract
		r.mgr.attractMu.Unlock()
		if a == nil && r.mgr.current() == nil && r.procs() == 0 {
			return
		}
		time.Sleep(50 * time.Millisecond)
	}
	t.Fatal("attract not reaped")
}

// Many flights and hand-offs leave nothing behind: no processes, no
// session directories, goroutines back to where they started.
func TestAttractNoLeaks(t *testing.T) {
	r := attractRigHold(t, 50*time.Millisecond, "FAKECORE_N=3", "FAKECORE_AFTER=40")
	cl := r.connect()
	cl.wait(3*time.Second, "state", is("state"))
	time.Sleep(200 * time.Millisecond)
	base := runtime.NumGoroutine()
	for round := 0; round < 3; round++ {
		cl.send(`{"t":"attract_start"}`)
		for f := 0; f < 3; f++ {
			cl.wait(10*time.Second, "landed", phase("landed"))
		}
		cl.send(`{"t":"attract_stop"}`)
		cl.wait(5*time.Second, "off", phase("off"))
		drain(cl)
	}
	r.waitProcs(t, 0, time.Second)
	ents, _ := os.ReadDir(filepath.Join(r.cfg.Paths.Run, "s"))
	if len(ents) != 0 {
		t.Fatalf("session dirs left: %v", ents)
	}
	var g int
	for i := 0; i < 50; i++ {
		if g = runtime.NumGoroutine(); g <= base+2 {
			return
		}
		time.Sleep(50 * time.Millisecond)
	}
	buf := make([]byte, 1<<20)
	n := runtime.Stack(buf, true)
	t.Fatalf("goroutines %d, was %d\n%s", g, base, buf[:n])
}

func TestCardNumber(t *testing.T) {
	f := machine.PunchFields
	card := strings.Repeat("00000", 5) + "00034" + strings.Repeat("00000", 4) + "08765" + "43210" + "0000000000" + "-0029" + "51425"
	for _, c := range []struct {
		idx  []int
		want int64
		ok   bool
	}{
		{[]int{5}, 34, true}, {[]int{10, 11}, 876543210, true}, {[]int{14, 15}, -2951425, true},
		{nil, 0, false}, {[]int{16}, 0, false},
	} {
		got, ok := cardNumber(f(card), c.idx)
		if got != c.want || ok != c.ok {
			t.Errorf("%v: %d %v", c.idx, got, ok)
		}
	}
	for _, s := range []string{"J2345", "R0000"} {
		n, ok := cardNumber([]string{s}, []int{0})
		if !ok || n >= 0 {
			t.Errorf("%s -> %d %v", s, n, ok)
		}
	}
	if n, _ := cardNumber([]string{"J2345"}, []int{0}); n != -12345 {
		t.Errorf("J2345 -> %d", n)
	}
	for _, s := range []string{"     ", "12a45", "-", "1-345"} {
		if _, ok := cardNumber([]string{s}, []int{0}); ok {
			t.Errorf("%q accepted", s)
		}
	}
}
