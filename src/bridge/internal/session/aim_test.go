package session

import (
	"testing"
	"time"
)

// Battleship: the gun must be aimed before READ, a bad shot is refused, a good one is acknowledged
// and may be changed until the card is read.
func TestAimGate(t *testing.T) {
	r := newRig(t, nil)
	cl := r.connect()
	cl.wait(3*time.Second, "state", is("state"))
	cl.send(`{"t":"start_mission","mission":"battleship","mode":"visitor"}`)
	cl.wait(10*time.Second, "session setup", is("session", "state", "setup"))
	cl.send(`{"t":"skip_setup"}`)
	cl.wait(10*time.Second, "setup_complete", is("setup_complete"))
	cl.send(`{"t":"button","b":"read"}`)
	cl.wait(5*time.Second, "read refused before aim", is("error"))
	cl.send(`{"t":"aim","charge":"g9","elevation":"e10"}`)
	cl.wait(5*time.Second, "bad shot refused", is("error"))
	cl.send(`{"t":"aim","charge":"g3","elevation":"e10"}`)
	cl.wait(10*time.Second, "aimed", is("aimed"))
	cl.send(`{"t":"aim","charge":"g5","elevation":"e15"}`)
	cl.wait(10*time.Second, "re-aimed", is("aimed"))
}
