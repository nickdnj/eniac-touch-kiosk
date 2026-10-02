//go:build realcore

package session

import (
	"testing"
	"time"
)

// A whole Primes run on the real core with the stall guard on (follow-up
// to #45): Slow for the loading and the first primes, then Full to card
// 407 and the end of the search. The guard must never trip; the punch
// paces Full at 0.6 s a card, the longest gap at Full is a few seconds.
func TestPrimesFullRunNeverStalls(t *testing.T) {
	r := newRig(t, nil)
	cl := r.connect()
	cl.wait(3*time.Second, "state", is("state"))
	cl.send(`{"t":"start_mission","mission":"primes","mode":"visitor"}`)
	cl.wait(10*time.Second, "setup", is("session", "state", "setup"))
	cl.send(`{"t":"skip_setup"}`)
	cl.wait(10*time.Second, "setup_complete", is("setup_complete"))
	cl.send(`{"t":"button","b":"init"}`)
	cl.seen(20*time.Second, "first card", is("checkpoint", "id", "first-card"))
	time.Sleep(25 * time.Second) // Slow: about 1.85 s per odd number
	cl.send(`{"t":"set_speed","speed":"full"}`)
	cl.seen(6*time.Minute, "card 407", is("checkpoint", "id", "last"))
	cl.wait(30*time.Second, "idle at the end", is("run", "state", "idle"))
	time.Sleep(25 * time.Second) // longer than the Full window, idle: still no stall
	cl.mu.Lock()
	defer cl.mu.Unlock()
	n := 0
	for _, m := range cl.history {
		if m["t"] == "health" && m["core"] == "down" {
			t.Fatalf("stall guard tripped on a normal run: %v", m)
		}
		if m["t"] == "punch" {
			n++
		}
	}
	if n != 407 {
		t.Fatalf("%d cards, want 407", n)
	}
}
