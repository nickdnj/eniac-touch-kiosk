//go:build realcore

package session

import (
	"fmt"
	"os"
	"strings"
	"testing"
	"time"
)

// flyShot flies one Gunnery shot on the real core and returns the punched cards' fields.
func flyShot(t *testing.T, mission, charge, elev string) [][]any {
	r := newRig(t, nil)
	cl := r.connect()
	cl.wait(3*time.Second, "state", is("state"))
	cl.send(`{"t":"start_mission","mission":"%s","mode":"visitor"}`, mission)
	cl.wait(10*time.Second, "session setup", is("session", "state", "setup"))
	cl.send(`{"t":"aim","charge":"%s","elevation":"%s"}`, charge, elev)
	cl.wait(10*time.Second, "aimed", is("aimed"))
	cl.send(`{"t":"skip_setup"}`)
	cl.wait(10*time.Second, "setup_complete", is("setup_complete"))
	cl.send(`{"t":"button","b":"read"}`)
	cl.seen(10*time.Second, "card-read", is("checkpoint", "id", "card-read"))
	cl.wait(10*time.Second, "read idle", is("run", "state", "idle"))
	cl.send(`{"t":"button","b":"init"}`)
	cl.seen(200*time.Second, "landed", is("checkpoint", "id", "landed"))
	time.Sleep(500 * time.Millisecond)
	var cards [][]any
	cl.mu.Lock()
	for _, m := range cl.history {
		if m["t"] == "punch" {
			cards = append(cards, m["fields"].([]any))
		}
	}
	cl.mu.Unlock()
	return cards
}

// TestGunnerySweep prints hops and landing for each shot in GUNNERY_SWEEP ("c4/e20,c1/e10").
func TestGunnerySweep(t *testing.T) {
	spec := os.Getenv("GUNNERY_SWEEP")
	if spec == "" {
		t.Skip("set GUNNERY_SWEEP")
	}
	for _, s := range strings.Split(spec, ",") {
		ce := strings.Split(s, "/")
		t.Run(s, func(t *testing.T) {
			t0 := time.Now()
			mission := os.Getenv("GUNNERY_MISSION")
			if mission == "" {
				mission = "gunnery"
			}
			cards := flyShot(t, mission, ce[0], ce[1])
			n := len(cards)
			f := cards[n-1]
			g := cards[n-2]
			t.Logf("SWEEP %s hops=%d secs=%.0f first_along=%v first_up=%v prev_along=%v%v prev_up=%v%v last_along=%v%v last_up=%v%v", s, n, time.Since(t0).Seconds(),
				fmt.Sprint(cards[0][10], cards[0][11]), fmt.Sprint(cards[0][14], cards[0][15]), g[10], g[11], g[14], g[15], f[10], f[11], f[14], f[15])
		})
	}
}

// TestFiringTableMatchesCore flies the quick rows of Battleship's firing table on the real core and
// checks the table's range (within 2 ft) and time of flight (within 0.1 s). GUNNERY_TABLE_SECS raises the
// flight-time ceiling (default 7 s) to check more of the table.
func TestFiringTableMatchesCore(t *testing.T) {
	ceiling := 7.0
	if v := os.Getenv("GUNNERY_TABLE_SECS"); v != "" {
		fmt.Sscan(v, &ceiling)
	}
	r0 := newRig(t, nil)
	m, ok := r0.reg.Get("battleship")
	if !ok || !m.Available {
		t.Skip("battleship is not available")
	}
	for _, row := range m.File.Content.Game.Table {
		if row.Secs > ceiling {
			continue
		}
		t.Run(row.Gun+"/"+row.Elevation, func(t *testing.T) {
			cards := flyShot(t, "battleship", row.Gun, row.Elevation)
			n := len(cards)
			num := func(c []any, i, j int) float64 {
				var v float64
				fmt.Sscan(fmt.Sprint(c[i], c[j]), &v)
				return v
			}
			pa, pu := num(cards[n-2], 10, 11), num(cards[n-2], 14, 15)
			la, lu := num(cards[n-1], 10, 11), num(cards[n-1], 14, 15)
			f := pu / (pu - lu)
			feet := (pa + f*(la-pa)) / 10000
			secs := float64(n-1) + f
			if d := feet - float64(row.Feet); d > 2 || d < -2 {
				t.Errorf("range %.1f ft, table says %d", feet, row.Feet)
			}
			if d := secs - row.Secs; d > 0.1 || d < -0.1 {
				t.Errorf("flight %.2f s, table says %.1f", secs, row.Secs)
			}
		})
	}
}
