package session

import (
	"strings"
	"testing"
	"time"

	"eniac-kiosk/bridge/internal/testenv"
)

// stallRig runs the session manager on the fake core in busy-stall mode:
// INIT punches 3 cards 200 ms apart, then the run stays busy and nothing
// more happens. The stall window is shortened to 1.5 s.
func stallRig(t *testing.T) *rig {
	return newRig(t, func(o *Options) {
		o.Config.Paths.Core = testenv.Fakecore(t)
		o.CoreExtraEnv = []string{"FAKECORE_MODE=busy-stall", "FAKECORE_N=3", "FAKECORE_AFTER=200"}
		o.StallOverride = 1500 * time.Millisecond
	})
}

// A punch-driven mission whose run stops punching while busy faults with
// E-CORE-DOWN/stall, so S10 and recovery take over instead of a stuck run.
func TestStallGuardFaultsAStuckPrimesRun(t *testing.T) {
	r := stallRig(t)
	cl := r.connect()
	cl.wait(3*time.Second, "state", is("state"))
	cl.send(`{"t":"start_mission","mission":"primes","mode":"visitor"}`)
	cl.wait(10*time.Second, "setup", is("session", "state", "setup"))
	cl.send(`{"t":"skip_setup"}`)
	cl.wait(10*time.Second, "setup_complete", is("setup_complete"))
	t0 := time.Now()
	cl.send(`{"t":"button","b":"init"}`)
	cl.wait(3*time.Second, "busy", is("run", "state", "busy"))
	for i := 1; i <= 3; i++ {
		cl.wait(3*time.Second, "card", is("punch"))
	}
	h := cl.wait(6*time.Second, "health down", func(m map[string]any) bool { return m["t"] == "health" && m["core"] == "down" })
	if h["code"] != "E-CORE-DOWN" || h["detail"] != "stall" {
		t.Fatalf("health %v", h)
	}
	if d := time.Since(t0); d < 2*time.Second {
		t.Fatalf("stall raised after %s: before the window had passed since the last card", d)
	}
	cl.seen(3*time.Second, "session failed", is("session", "state", "failed"))
	// The core got exactly one INIT; the guard never writes to the core itself.
	n := 0
	for _, w := range r.wl.all() {
		if strings.HasPrefix(w, "b ") {
			n++
		}
	}
	if n != 1 {
		t.Fatalf("%d run commands", n)
	}
}

// Squares has no stall window: a press that stays busy without progress
// (here: forever) never trips the guard, and neither does resting.
func TestStallGuardNeverWatchesSquares(t *testing.T) {
	r := stallRig(t)
	cl := r.connect()
	cl.wait(3*time.Second, "state", is("state"))
	cl.startSquares()
	cl.send(`{"t":"skip_setup"}`)
	cl.wait(10*time.Second, "setup_complete", is("setup_complete"))
	time.Sleep(2 * time.Second) // resting before a press
	cl.send(`{"t":"button","b":"init"}`)
	cl.wait(3*time.Second, "busy", is("run", "state", "busy"))
	time.Sleep(4 * time.Second)
	cl.mu.Lock()
	defer cl.mu.Unlock()
	for _, m := range cl.history {
		if m["t"] == "health" && m["core"] == "down" {
			t.Fatalf("Squares tripped: %v", m)
		}
	}
}
