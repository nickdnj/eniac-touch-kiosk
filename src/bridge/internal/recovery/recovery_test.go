package recovery

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"eniac-kiosk/bridge/internal/core"
	"eniac-kiosk/bridge/internal/protocol"
)

// fake time: Sleep advances the clock instantly and records the durations.
type harness struct {
	mu     sync.Mutex
	now    time.Time
	sleeps []time.Duration
	health []protocol.Health
	probes []time.Time
	script []error // probe results in order; nil = success
	done   chan struct{}
	r      *Recovery
}

func newHarness(script ...error) *harness {
	h := &harness{now: time.Unix(1_000_000, 0), script: script, done: make(chan struct{}, 10)}
	h.r = New(context.Background(), Options{
		Budget: 3, Window: 5 * time.Minute, SlowRetry: 10 * time.Minute,
		Backoff: []time.Duration{2 * time.Second, 5 * time.Second, 10 * time.Second},
		Now:     func() time.Time { h.mu.Lock(); defer h.mu.Unlock(); return h.now },
		Sleep: func(_ context.Context, d time.Duration) error {
			h.mu.Lock()
			h.now = h.now.Add(d)
			h.sleeps = append(h.sleeps, d)
			h.mu.Unlock()
			return nil
		},
		Probe: func(context.Context) error {
			h.mu.Lock()
			defer h.mu.Unlock()
			h.probes = append(h.probes, h.now)
			if len(h.script) == 0 {
				return nil
			}
			e := h.script[0]
			h.script = h.script[1:]
			return e
		},
		OnHealth:    func(x protocol.Health) { h.mu.Lock(); h.health = append(h.health, x); h.mu.Unlock() },
		OnRecovered: func() { h.done <- struct{}{} },
	})
	return h
}

func (h *harness) wait(t *testing.T) {
	select {
	case <-h.done:
	case <-time.After(3 * time.Second):
		t.Fatal("recovery did not finish")
	}
}

var startFail = core.Fault{Code: core.CodeStart, Detail: "no ready"}

func TestRecoverFirstTry(t *testing.T) {
	h := newHarness()
	h.r.Fault(core.Fault{Code: core.CodeDown, Detail: core.DetailExit})
	h.wait(t)
	if len(h.sleeps) != 1 || h.sleeps[0] != 2*time.Second {
		t.Fatalf("sleeps %v", h.sleeps)
	}
	if h.health[0].Core != "down" || h.health[0].Code != "E-CORE-DOWN" || h.health[0].Attempt != 1 || h.health[0].Of != 3 {
		t.Fatalf("first health %+v", h.health[0])
	}
	if last := h.health[len(h.health)-1]; last.Core != "up" {
		t.Fatalf("last health %+v", last)
	}
	if st := h.r.Status(); st.Down || st.RestartsTotal != 1 || st.LastError.Code != "E-CORE-DOWN" {
		t.Fatalf("%+v", st)
	}
}

// Retries at +2 s, +5 s, +10 s; 3 attempts in 5 min then health.final with
// E-RETRY-BUDGET; quiet retry every 10 min; success resets.
func TestBudgetExhaustedThenSlowRetry(t *testing.T) {
	h := newHarness(startFail, startFail, startFail, startFail, nil)
	t0 := h.now
	h.r.Fault(core.Fault{Code: core.CodeDown, Detail: core.DetailHangCmd})
	h.wait(t)
	want := []time.Duration{2 * time.Second, 5 * time.Second, 10 * time.Second, 10 * time.Minute, 10 * time.Minute}
	if len(h.sleeps) != len(want) {
		t.Fatalf("sleeps %v, want %v", h.sleeps, want)
	}
	for i := range want {
		if h.sleeps[i] != want[i] {
			t.Fatalf("sleeps %v, want %v", h.sleeps, want)
		}
	}
	if h.probes[0].Sub(t0) != 2*time.Second || h.probes[1].Sub(t0) != 7*time.Second || h.probes[2].Sub(t0) != 17*time.Second {
		t.Fatalf("probe times %v", h.probes)
	}
	var final *protocol.Health
	for i := range h.health {
		if h.health[i].Final {
			final = &h.health[i]
			break
		}
	}
	if final == nil || final.Code != CodeRetryBudget || final.Core != "down" {
		t.Fatalf("no final health: %+v", h.health)
	}
	finals := 0
	for _, x := range h.health {
		if x.Final {
			finals++
		}
	}
	if finals != 1 {
		t.Fatalf("final broadcast %d times; the slow retry should be quiet", finals)
	}
	if last := h.health[len(h.health)-1]; last.Core != "up" || last.Final {
		t.Fatalf("slow retry success should report up: %+v", last)
	}
	if st := h.r.Status(); st.Final || st.Down {
		t.Fatalf("success should reset: %+v", st)
	}
}

// Three failures spaced more than 5 min apart do not exhaust the budget.
func TestSpacedFailuresDoNotExhaust(t *testing.T) {
	h := newHarness()
	for i := 0; i < 5; i++ {
		h.r.Fault(core.Fault{Code: core.CodeDown, Detail: core.DetailExit})
		h.wait(t)
		h.mu.Lock()
		h.now = h.now.Add(6 * time.Minute)
		h.mu.Unlock()
	}
	for _, x := range h.health {
		if x.Final {
			t.Fatal("budget exhausted by spaced failures")
		}
		if x.Core == "down" && x.Attempt != 1 {
			t.Fatalf("attempt should restart at 1: %+v", x)
		}
	}
}

// A successful probe resets the count, so fault/recover cycles within
// 5 minutes never reach final either (test plan 3.5).
func TestSuccessResetsCount(t *testing.T) {
	h := newHarness(startFail, nil, startFail, nil)
	h.r.Fault(core.Fault{Code: core.CodeDown})
	h.wait(t)
	h.r.Fault(core.Fault{Code: core.CodeDown})
	h.wait(t)
	for _, x := range h.health {
		if x.Final {
			t.Fatal("final after recoveries")
		}
	}
	if h.health[len(h.health)-1].Core != "up" {
		t.Fatal("not up")
	}
}

func TestCancelStops(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	r := New(ctx, Options{Budget: 3, Window: time.Minute, Backoff: []time.Duration{time.Hour}, SlowRetry: time.Hour,
		Probe: func(context.Context) error { return errors.New("x") }, OnHealth: func(protocol.Health) {}})
	r.Fault(core.Fault{Code: core.CodeDown})
	cancel()
	time.Sleep(20 * time.Millisecond)
	if r.Status().Recovering {
		t.Fatal("loop still running after cancel")
	}
}
