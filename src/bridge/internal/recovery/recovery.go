// Package recovery restores the core after a fault (architecture 5.8,
// PRD FR-05, FR-51, FR-52): broadcast health down, back off 2 s / 5 s /
// 10 s, run a headless probe session, and give up after 3 failures in 5
// minutes (health.final, E-RETRY-BUDGET), then keep retrying quietly every
// 10 minutes so a transient cause can still self-heal without staff.
package recovery

import (
	"context"
	"errors"
	"log/slog"
	"sync"
	"time"

	"eniac-kiosk/bridge/internal/core"
	"eniac-kiosk/bridge/internal/protocol"
)

// CodeRetryBudget is reported once the retry budget is exhausted.
const CodeRetryBudget = "E-RETRY-BUDGET"

// Options configure a Recovery.
type Options struct {
	Budget    int             // 3
	Window    time.Duration   // 5 min
	Backoff   []time.Duration // 2 s, 5 s, 10 s
	SlowRetry time.Duration   // 10 min
	// Probe runs a headless probe session (the Squares preset): it must
	// reach the prompt and ack `d i`. It returns a core.Fault on failure.
	Probe func(ctx context.Context) error
	// OnHealth receives every health change (broadcast to the UI).
	OnHealth func(protocol.Health)
	// OnRecovered is called after a successful probe.
	OnRecovered func()
	Now   func() time.Time
	Sleep func(ctx context.Context, d time.Duration) error
	Log   *slog.Logger
}

// Recovery is the core's retry state machine. Safe for concurrent use.
type Recovery struct {
	o        Options
	ctx      context.Context
	mu       sync.Mutex
	failures []time.Time
	running  bool
	final    bool
	down     bool
	total    int // restarts (probe attempts) since boot
	restarts []time.Time
	lastErr  *LastError
}

// LastError is the most recent fault, for /healthz.
type LastError struct {
	Code   string
	Detail string
	At     time.Time
}

// New returns a Recovery bound to ctx (cancel it to stop retrying).
func New(ctx context.Context, o Options) *Recovery {
	if o.Now == nil {
		o.Now = time.Now
	}
	if o.Sleep == nil {
		o.Sleep = func(ctx context.Context, d time.Duration) error {
			t := time.NewTimer(d)
			defer t.Stop()
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-t.C:
				return nil
			}
		}
	}
	if o.Log == nil {
		o.Log = slog.Default()
	}
	return &Recovery{o: o, ctx: ctx}
}

func (r *Recovery) prune(now time.Time) {
	keep := r.failures[:0]
	for _, t := range r.failures {
		if now.Sub(t) < r.o.Window {
			keep = append(keep, t)
		}
	}
	r.failures = keep
	k := r.restarts[:0]
	for _, t := range r.restarts {
		if now.Sub(t) < r.o.Window {
			k = append(k, t)
		}
	}
	r.restarts = k
}

// Fault reports a core fault. The caller has already killed the core. It
// broadcasts health down and starts the retry loop if it isn't running.
func (r *Recovery) Fault(f core.Fault) {
	r.mu.Lock()
	now := r.o.Now()
	r.failures = append(r.failures, now)
	r.lastErr = &LastError{Code: f.Code, Detail: f.Detail, At: now}
	r.down = true
	r.prune(now)
	n := len(r.failures)
	start := !r.running
	r.running = true
	final := r.final
	r.mu.Unlock()
	if !final {
		r.o.OnHealth(protocol.Health{T: "health", Core: protocol.CoreDown, Code: f.Code, Detail: f.Detail,
			Attempt: min(n, r.o.Budget), Of: r.o.Budget})
	}
	if start {
		go r.loop(f)
	}
}

func (r *Recovery) backoff(n int) time.Duration {
	if n < 1 {
		n = 1
	}
	if n > len(r.o.Backoff) {
		n = len(r.o.Backoff)
	}
	return r.o.Backoff[n-1]
}

func (r *Recovery) loop(last core.Fault) {
	defer func() {
		r.mu.Lock()
		r.running = false
		r.mu.Unlock()
	}()
	for {
		r.mu.Lock()
		r.prune(r.o.Now())
		n := len(r.failures)
		if n > r.o.Budget && !r.final {
			r.final = true
			r.mu.Unlock()
			r.o.Log.Error("core: retry budget exhausted; retrying quietly", "every", r.o.SlowRetry)
			r.o.OnHealth(protocol.Health{T: "health", Core: protocol.CoreDown, Code: CodeRetryBudget,
				Detail: last.Code, Attempt: r.o.Budget, Of: r.o.Budget, Final: true})
			r.mu.Lock()
		}
		final := r.final
		r.mu.Unlock()

		wait := r.backoff(n)
		if final {
			wait = r.o.SlowRetry
		}
		if err := r.o.Sleep(r.ctx, wait); err != nil {
			return
		}
		r.mu.Lock()
		r.total++
		r.restarts = append(r.restarts, r.o.Now())
		r.mu.Unlock()
		err := r.o.Probe(r.ctx)
		if err == nil {
			r.mu.Lock()
			r.failures, r.final, r.down = nil, false, false
			r.mu.Unlock()
			r.o.Log.Info("core: recovered")
			r.o.OnHealth(protocol.Health{T: "health", Core: protocol.CoreUp})
			if r.o.OnRecovered != nil {
				r.o.OnRecovered()
			}
			return
		}
		if r.ctx.Err() != nil {
			return
		}
		var f core.Fault
		if !errors.As(err, &f) {
			f = core.Fault{Code: core.CodeStart, Detail: err.Error()}
		}
		last = f
		r.mu.Lock()
		now := r.o.Now()
		r.failures = append(r.failures, now)
		r.lastErr = &LastError{Code: f.Code, Detail: f.Detail, At: now}
		r.prune(now)
		n = len(r.failures)
		final = r.final
		r.mu.Unlock()
		r.o.Log.Warn("core: probe failed", "code", f.Code, "detail", f.Detail, "failures", n)
		if !final && n <= r.o.Budget {
			r.o.OnHealth(protocol.Health{T: "health", Core: protocol.CoreDown, Code: f.Code, Detail: f.Detail,
				Attempt: n, Of: r.o.Budget})
		}
	}
}

// Status for /healthz and hello.
type Status struct {
	Down          bool
	Final         bool
	Recovering    bool
	Restarts5m    int
	RestartsTotal int
	LastError     *LastError
}

func (r *Recovery) Status() Status {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.prune(r.o.Now())
	return Status{Down: r.down, Final: r.final, Recovering: r.running, Restarts5m: len(r.restarts),
		RestartsTotal: r.total, LastError: r.lastErr}
}

// ProbeSession returns a Probe that starts a headless core session (the
// caller's start function boots the Squares preset), requires it to be
// ready and to ack `d i`, then tears it down.
func ProbeSession(start func(ctx context.Context) (*core.Core, error)) func(ctx context.Context) error {
	return func(ctx context.Context) error {
		c, err := start(ctx)
		if err != nil {
			return err
		}
		defer c.Close()
		if _, err := c.Do(core.Probe()); err != nil {
			if f, ok := c.Faulted(); ok {
				return f
			}
			return core.Fault{Code: core.CodeDown, Detail: core.DetailHangCmd}
		}
		return nil
	}
}
