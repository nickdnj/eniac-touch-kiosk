//go:build realcore

package core

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"eniac-kiosk/bridge/internal/testenv"
)

// trajdemo-canary (spike #31, patches/0003-acc-1pp-race.patch). Without the
// patch, two goroutines can increment the same accumulator digit at 1PP time
// and one increment is lost; trajdemo's "up" field then comes out a few units
// low from some card on. Four cores run the unmodified, self-starting
// trajdemo.e at once; every run must punch the same cards, and the first 7
// must equal tests/golden/traj-patched.punch. The race is environment
// dependent (1 run in 3 while the Mac was busy with other work, 0 in 50 in
// quieter conditions), so a pass is not proof that 0003 is applied; the
// fetch test checks that. This test mainly guards trajdemo's output at bumps.
func TestRealCoreTrajdemoDeterministic(t *testing.T) {
	const runs, minCards = 4, 12
	// Hop 1 from a clean CLEAR, READ, INIT (spike S2): columns 26-30 hop,
	// 51-60 "along" (Acc 18), 71-80 "up" (Acc 20).
	first := strings.Repeat(" ", 25) + "00001     00000          0014128681          0005693229"
	h := newHarness(t)
	root, _ := testenv.RepoRoot()
	gold, err := os.ReadFile(filepath.Join(root, "tests", "golden", "traj-patched.punch"))
	if err != nil {
		t.Fatal(err)
	}
	golden := strings.Split(strings.TrimRight(string(gold), "\n"), "\n")
	var wg sync.WaitGroup
	cards := make([][]string, runs)
	errs := make([]error, runs)
	for i := 0; i < runs; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			var mu sync.Mutex
			o := h.opts(filepath.Join(h.dir, "s", fmt.Sprintf("traj%d", i)), filepath.Join(h.runtime, "programs", "trajdemo.e"))
			o.OnStatus = func(l string) {
				if strings.HasPrefix(l, "punch ") {
					mu.Lock()
					cards[i] = append(cards[i], l[6:])
					mu.Unlock()
				}
			}
			c, err := Start(context.Background(), o)
			if err != nil {
				errs[i] = err
				return
			}
			time.Sleep(45 * time.Second)
			c.Close()
		}(i)
	}
	wg.Wait()
	shortest := -1
	for i := 0; i < runs; i++ {
		if errs[i] != nil {
			t.Fatalf("run %d: %v", i, errs[i])
		}
		if len(cards[i]) < minCards {
			t.Fatalf("run %d punched only %d cards in 45 s (want >= %d)", i, len(cards[i]), minCards)
		}
		if shortest < 0 || len(cards[i]) < shortest {
			shortest = len(cards[i])
		}
	}
	for i := 0; i < runs; i++ {
		if strings.TrimRight(cards[i][0], " ") != first {
			t.Errorf("run %d first card %q, want hop 1 = %q", i, cards[i][0], first)
		}
		for k, g := range golden {
			if k < len(cards[i]) && cards[i][k] != g {
				t.Errorf("run %d card %d = %q, golden traj-patched = %q", i, k+1, cards[i][k], g)
			}
		}
		for k := 0; k < shortest; k++ {
			if cards[i][k] != cards[0][k] {
				t.Fatalf("run %d card %d = %q, run 0 = %q: trajdemo output is not deterministic (is patches/0003 applied?)",
					i, k+1, cards[i][k], cards[0][k])
			}
		}
	}
	t.Logf("trajdemo-canary: %d runs at once, the first %d cards identical", runs, shortest)
}
