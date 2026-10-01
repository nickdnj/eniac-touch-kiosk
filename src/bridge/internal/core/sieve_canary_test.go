package core

import (
	"context"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"
)

// sieve-canary (test plan 3.2, architecture U1/A1). Upstream sieve.e ran away
// at the pin until patches/0002-ft-repeat-default.patch (decision #36). The
// unmodified program, loaded through argv, must punch the primes from 3 up
// in order while every function-table ring stays in its normal range.
// The quick variant runs in `make test`; the full run (all 407 primes, 3 to
// 2801) is in sieve_canary_long_test.go under `make test-realcore`.
func TestRealCoreSieveCanary(t *testing.T) { sieveCanary(t, 25, 90*time.Second) }

// ftRingMax is the largest ring value a healthy function table shows on the
// wire (stages 1-9 plus the -3..0 rest states; sieve.e peaks at 1). The U1
// runaway reached tens of thousands within seconds.
const ftRingMax = 12

func sievePrimes(limit int) []int {
	var ps []int
	for n := 3; n <= limit; n++ {
		prime := true
		for d := 2; d*d <= n; d++ {
			if n%d == 0 {
				prime = false
				break
			}
		}
		if prime {
			ps = append(ps, n)
		}
	}
	return ps
}

// sieveCanary boots the unmodified programs/sieve.e, presses INIT once and
// waits for want punched cards (or the timeout). Each card must be the next
// prime, right-justified in columns 61-70, and no FT ring may run away.
// When want is the whole table it also checks that the program stops.
func sieveCanary(t *testing.T, want int, timeout time.Duration) {
	h := newHarness(t)
	expect := sievePrimes(2801)
	if len(expect) != 407 {
		t.Fatalf("reference list has %d primes", len(expect))
	}
	var mu sync.Mutex
	var cards []string
	maxRing := -3
	o := h.opts(filepath.Join(h.dir, "s", "sieve"), filepath.Join(h.runtime, "programs", "sieve.e"))
	o.OnStatus = func(l string) {
		mu.Lock()
		defer mu.Unlock()
		switch {
		case strings.HasPrefix(l, "punch "):
			cards = append(cards, l[6:])
		case strings.HasPrefix(l, "ftr "):
			if f := strings.Fields(l); len(f) == 3 {
				if r, err := strconv.Atoi(f[2]); err == nil && r > maxRing {
					maxRing = r
				}
			}
		}
	}
	c, err := Start(context.Background(), o)
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	if _, err := c.Do(ButtonInit()); err != nil {
		t.Fatal(err)
	}
	t0 := time.Now()
	snapshot := func() (int, int) { mu.Lock(); defer mu.Unlock(); return len(cards), maxRing }
	for {
		n, ring := snapshot()
		if ring > ftRingMax {
			t.Fatalf("function-table ring ran away (ftr %d after %d cards): the U1 regression is back; is patches/0002 still applied?", ring, n)
		}
		if n >= want {
			break
		}
		if time.Since(t0) > timeout {
			t.Fatalf("only %d of %d cards in %s (U1: sieve.e punches nothing when the FT repeat default is missing)", n, want, timeout)
		}
		time.Sleep(100 * time.Millisecond)
	}
	elapsed := time.Since(t0)
	if want == len(expect) {
		// The table ends at 2801; nothing more may follow.
		time.Sleep(5 * time.Second)
	}
	mu.Lock()
	got := append([]string(nil), cards...)
	ring := maxRing
	mu.Unlock()
	if want == len(expect) && len(got) != want {
		t.Errorf("%d cards after the last prime, want exactly %d", len(got), want)
	}
	for i, card := range got {
		if i >= len(expect) {
			break
		}
		wantCard := strings.Repeat(" ", 60) + strings.Repeat("0", 10-len(strconv.Itoa(expect[i]))) + strconv.Itoa(expect[i]) + strings.Repeat(" ", 10)
		if card != wantCard {
			t.Fatalf("card %d = %q, want prime %d as %q", i+1, card, expect[i], wantCard)
		}
	}
	t.Logf("sieve-canary: %d cards (%d..%s) in %s, largest FT ring %d", len(got), expect[0],
		strings.TrimLeft(strings.TrimSpace(got[len(got)-1]), "0"), elapsed.Round(time.Millisecond), ring)
	// The punch file the core wrote must agree with the status stream.
	time.Sleep(200 * time.Millisecond)
	b, err := os.ReadFile(c.PunchPath)
	if err != nil {
		t.Fatalf("punch file: %v", err)
	}
	if n := strings.Count(string(b), "\n"); n < want {
		t.Errorf("punch file has %d cards, the status stream %d", n, len(got))
	}
}
