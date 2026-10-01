package machine

import (
	"strconv"
	"sync"
	"time"
)

// Run states (architecture 5.6, UX F2(a)).
const (
	RunIdle = "idle"
	RunBusy = "busy"
)

// RunEvent is emitted on busy <-> idle transitions.
type RunEvent struct {
	State   string           // RunIdle or RunBusy
	Inits   int              // INIT presses this session
	Settled map[string]int64 // on idle only: decoded values of the watched accumulators
}

// QuietFor returns the idle detector's quiet period for a cycling rate:
// max(120 ms, 3 x additionTime), additionTime = 20000/rate ms (the core
// sleeps 500000/rate us in each of the 40 pulse slots of an addition cycle).
// Rate 0 (unthrottled) gives 120 ms. A positive override (mission
// run.idle.quietMs) wins.
func QuietFor(rate int, overrideMs int) time.Duration {
	if overrideMs > 0 {
		return time.Duration(overrideMs) * time.Millisecond
	}
	q := 120 * time.Millisecond
	if rate > 0 {
		add := time.Duration(20000*1000/rate) * time.Microsecond
		if 3*add > q {
			q = 3 * add
		}
	}
	return q
}

// RunTracker computes the INIT-finished signal from the mirror. Busy starts
// when the bridge sends a run command; idle is declared when all of:
//  1. no MachineState change other than the cycling unit for `quiet`
//     (measured from the later of the last change and the button press);
//  2. every acc[*].prog is all zeros;
//  3. init gate66 and gate69 are both 0.
type RunTracker struct {
	m        *Mirror
	watch    []int
	override int
	now      func() time.Time

	mu        sync.Mutex
	quiet     time.Duration
	state     string
	busySince time.Time
	inits     int
}

// NewRunTracker watches the given accumulators (1-based) for `settled`.
func NewRunTracker(m *Mirror, watch []int, rate, quietOverrideMs int) *RunTracker {
	return &RunTracker{m: m, watch: watch, override: quietOverrideMs, now: time.Now,
		quiet: QuietFor(rate, quietOverrideMs), state: RunIdle}
}

// SetClock replaces time.Now (tests).
func (t *RunTracker) SetClock(now func() time.Time) { t.now = now }

// SetRate updates the quiet period after a speed change.
func (t *RunTracker) SetRate(rate int) {
	t.mu.Lock()
	t.quiet = QuietFor(rate, t.override)
	t.mu.Unlock()
}

// Quiet is the current quiet period.
func (t *RunTracker) Quiet() time.Duration {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.quiet
}

// State is RunIdle or RunBusy.
func (t *RunTracker) State() string {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.state
}

// Inits is the number of INIT presses so far.
func (t *RunTracker) Inits() int {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.inits
}

// Pressed records that a run button was sent to the core. init counts
// toward `inits`. It returns the busy event (also when already busy, the
// caller may ignore it).
func (t *RunTracker) Pressed(init bool) RunEvent {
	t.mu.Lock()
	defer t.mu.Unlock()
	if init {
		t.inits++
	}
	t.state = RunBusy
	t.busySince = t.now()
	return RunEvent{State: RunBusy, Inits: t.inits}
}

// Tick checks the idle conditions. It returns an idle event exactly once per
// busy period.
func (t *RunTracker) Tick() (RunEvent, bool) {
	t.mu.Lock()
	if t.state != RunBusy {
		t.mu.Unlock()
		return RunEvent{}, false
	}
	since := t.busySince
	quiet := t.quiet
	t.mu.Unlock()

	if lc := t.m.LastNonCycleChange(); lc.After(since) {
		since = lc
	}
	if t.now().Sub(since) < quiet {
		return RunEvent{}, false
	}
	st := t.m.State()
	if !st.ProgIdle() || !st.GatesIdle() {
		return RunEvent{}, false
	}
	settled := make(map[string]int64, len(t.watch))
	for _, n := range t.watch {
		if n >= 1 && n <= 20 {
			settled[strconv.Itoa(n)] = st.Acc[n-1].Value()
		}
	}
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.state != RunBusy {
		return RunEvent{}, false
	}
	t.state = RunIdle
	return RunEvent{State: RunIdle, Inits: t.inits, Settled: settled}, true
}
