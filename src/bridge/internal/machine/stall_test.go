package machine

import (
	"testing"
	"time"
)

func TestStallGuardPunch(t *testing.T) {
	g := NewStallGuard(20*time.Second, true)
	t0 := time.Unix(1000, 0)
	s := Initial()
	if g.Observe(t0, true, &s) {
		t.Fatal("tripped on arming")
	}
	// Accumulators changing is not progress for a punch-driven mission.
	s.Acc[18].Digits[9] = '3'
	if g.Observe(t0.Add(19*time.Second), true, &s) {
		t.Fatal("tripped inside the window")
	}
	s.Punched = 1
	if g.Observe(t0.Add(20*time.Second), true, &s) {
		t.Fatal("a card is progress")
	}
	if g.Observe(t0.Add(39*time.Second), true, &s) {
		t.Fatal("window restarts at the card")
	}
	if !g.Observe(t0.Add(41*time.Second), true, &s) {
		t.Fatal("no card for 21 s while busy must trip")
	}
}

func TestStallGuardAccAndIdle(t *testing.T) {
	g := NewStallGuard(10*time.Second, false)
	t0 := time.Unix(1000, 0)
	s := Initial()
	g.Observe(t0, true, &s)
	s.Acc[0].Digits[9] = '1'
	if g.Observe(t0.Add(9*time.Second), true, &s) || g.Observe(t0.Add(18*time.Second), true, &s) {
		t.Fatal("an accumulator change is progress")
	}
	// Idle disarms: a long rest between presses never trips (Squares).
	if g.Observe(t0.Add(time.Hour), false, &s) {
		t.Fatal("tripped while idle")
	}
	if g.Observe(t0.Add(time.Hour+time.Second), true, &s) {
		t.Fatal("a new busy period re-arms from now")
	}
	if !g.Observe(t0.Add(time.Hour+12*time.Second), true, &s) {
		t.Fatal("no change for 11 s while busy must trip")
	}
	g.SetWindow(0)
	if g.Observe(t0.Add(2*time.Hour), true, &s) {
		t.Fatal("window 0 is off")
	}
}
