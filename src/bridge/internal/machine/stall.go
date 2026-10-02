package machine

import (
	"strings"
	"time"
)

// StallGuard watches a busy run for progress (follow-up to #45: a Primes
// run was once seen to stay busy after INIT with no card and no error).
// Progress is a new punched card for punch-driven missions, or any change
// of an accumulator's digits otherwise. If a busy run makes no progress for
// the window, Observe reports a stall; the session then raises
// E-CORE-DOWN/stall so the normal error state (S10) and recovery take over.
// The guard disarms whenever the run is idle, so a mission that rests
// between presses (Squares) never trips it.
type StallGuard struct {
	window    time.Duration
	byPunch   bool
	armed     bool
	last      time.Time
	lastCards int
	lastAcc   string
}

// NewStallGuard returns a guard; window <= 0 disables it.
func NewStallGuard(window time.Duration, byPunch bool) *StallGuard {
	return &StallGuard{window: window, byPunch: byPunch}
}

// Window is the current window (0 = off).
func (g *StallGuard) Window() time.Duration { return g.window }

// SetWindow changes the window (a speed change) and restarts the clock.
func (g *StallGuard) SetWindow(w time.Duration) {
	g.window = w
	g.armed = false
}

// Disarm stops watching until the next Observe of a busy run (e.g. the
// machine was deliberately frozen; then Off keeps it quiet for good).
func (g *StallGuard) Disarm() { g.armed = false }

// AccSignature is the accumulators' digits and signs, for acc-mode progress.
func AccSignature(s *State) string {
	var b strings.Builder
	for i := range s.Acc {
		b.WriteByte(s.Acc[i].Sign)
		b.Write(s.Acc[i].Digits[:])
	}
	return b.String()
}

// Observe takes the run's state at `now`. It returns true once a busy run
// has gone `window` without progress.
func (g *StallGuard) Observe(now time.Time, busy bool, s *State) bool {
	if g.window <= 0 || !busy {
		g.armed = false
		return false
	}
	sig := ""
	if !g.byPunch {
		sig = AccSignature(s)
	}
	if !g.armed {
		g.armed, g.last, g.lastCards, g.lastAcc = true, now, s.Punched, sig
		return false
	}
	if (g.byPunch && s.Punched != g.lastCards) || (!g.byPunch && sig != g.lastAcc) {
		g.last, g.lastCards, g.lastAcc = now, s.Punched, sig
		return false
	}
	return now.Sub(g.last) > g.window
}
