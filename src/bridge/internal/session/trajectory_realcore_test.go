//go:build realcore

package session

import (
	"strings"
	"testing"
	"time"
)

// A whole Trajectory flight on the real core (test-realcore, about 1 min):
// 34 cards, the landing card has "up" below zero, the bridge sends
// s cy.op 1a once on it (run.freezeAt), the session moves to result, and
// nothing more is punched afterwards (spike S2). No fault from the
// watchdog while frozen.
func TestTrajectoryLandsAndFreezes(t *testing.T) {
	r := newRig(t, nil)
	cl := r.connect()
	cl.wait(3*time.Second, "state", is("state"))
	cl.send(`{"t":"start_mission","mission":"trajectory","mode":"visitor"}`)
	cl.wait(10*time.Second, "session setup", is("session", "state", "setup"))
	cl.send(`{"t":"skip_setup"}`)
	cl.wait(10*time.Second, "setup_complete", is("setup_complete"))
	cl.send(`{"t":"button","b":"read"}`)
	cl.seen(10*time.Second, "card-read", is("checkpoint", "id", "card-read"))
	cl.wait(10*time.Second, "read idle", is("run", "state", "idle"))
	cl.send(`{"t":"button","b":"init"}`)
	cl.seen(120*time.Second, "landed", is("checkpoint", "id", "landed"))
	cl.seen(5*time.Second, "result", is("session", "state", "result"))
	time.Sleep(6 * time.Second) // more than 4 hops' time
	var cards []map[string]any
	cl.mu.Lock()
	for _, m := range cl.history {
		if m["t"] == "punch" {
			cards = append(cards, m)
		}
		if m["t"] == "health" && m["core"] != "up" {
			t.Errorf("health while frozen: %v", m)
		}
	}
	cl.mu.Unlock()
	if len(cards) != 34 {
		t.Fatalf("%d cards, want 34", len(cards))
	}
	last := cards[33]["fields"].([]any)
	if last[5] != "00034" || !strings.HasPrefix(last[14].(string), "-") {
		t.Fatalf("landing card %v", cards[33]["text"])
	}
	for _, c := range cards[:33] {
		if strings.HasPrefix(c["fields"].([]any)[14].(string), "-") {
			t.Fatalf("an earlier card is below ground: %v", c["text"])
		}
	}
	n := 0
	for _, w := range r.wl.all() {
		if w == "s cy.op 1a" {
			n++
		}
		if w == "b i" {
			n += 100
		}
	}
	if n != 101 {
		t.Fatalf("want one b i and one s cy.op 1a, got code %d", n)
	}
}
