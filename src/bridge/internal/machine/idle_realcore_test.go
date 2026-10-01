package machine_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"eniac-kiosk/bridge/internal/core"
	"eniac-kiosk/bridge/internal/machine"
	"eniac-kiosk/bridge/internal/testenv"
)

// Hand-written stand-in for the Squares mission's run table until #10:
// speeds slow (rate 100) and full (rate 0), watch accumulators 1 and 2.
var squaresSpeeds = map[string]int{"slow": 100, "full": 0}

// idleKnownAnswer boots the full sq.e on the real core and presses INIT n
// times at the given rate, waiting for the tracker's idle each time. Every
// idle must carry settled = {x, x^2}; anything else is a mis-declared idle.
func idleKnownAnswer(t *testing.T, speed string, n int) {
	corePath, rt := testenv.Core(t)
	dir := testenv.ShortTempDir(t)
	srv, err := core.ListenVlink(filepath.Join(dir, "v.sock"), nil)
	if err != nil {
		t.Fatal(err)
	}
	defer srv.Close()
	self, _ := os.Executable()
	m := machine.NewMirror(nil)
	rate := squaresSpeeds[speed]
	c, err := core.Start(context.Background(), core.Options{
		CorePath: corePath, VlinkExe: self, Runtime: rt, SessionDir: filepath.Join(dir, "s"),
		Preset: filepath.Join(rt, "programs", "sq.e"), Server: srv, InitialRate: rate, OnStatus: m.ApplyLine,
	})
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	tr := machine.NewRunTracker(m, []int{1, 2}, rate, 0)
	bad := 0
	var worst time.Duration
	for x := int64(1); x <= int64(n); x++ {
		if _, err := c.Do(core.ButtonInit()); err != nil {
			t.Fatal(err)
		}
		t0 := time.Now()
		tr.Pressed(true)
		var e machine.RunEvent
		for {
			time.Sleep(33 * time.Millisecond)
			if ev, ok := tr.Tick(); ok {
				e = ev
				break
			}
			if time.Since(t0) > 20*time.Second {
				t.Fatalf("press %d: never idle", x)
			}
		}
		if d := time.Since(t0); d > worst {
			worst = d
		}
		if e.Settled["1"] != x || e.Settled["2"] != x*x {
			bad++
			t.Errorf("press %d at %s: idle with settled %v, want %d/%d", x, speed, e.Settled, x, x*x)
		}
		if e.Inits != int(x) {
			t.Errorf("inits %d", e.Inits)
		}
	}
	t.Logf("%s (rate %d, quiet %s): %d INITs, %d mis-declared idle, slowest press-to-idle %s",
		speed, rate, tr.Quiet(), n, bad, worst.Round(time.Millisecond))
}

func TestIdleRealCoreFull(t *testing.T) { idleKnownAnswer(t, "full", 5) }
func TestIdleRealCoreSlow(t *testing.T) { idleKnownAnswer(t, "slow", 2) }
