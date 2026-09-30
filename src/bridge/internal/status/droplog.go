package status

import (
	"log/slog"
	"sync"
	"time"
)

// DropLog logs dropped lines at debug level, at most Limit per Window
// (FR-04: 10 per minute), and counts everything it suppressed.
type DropLog struct {
	Log    *slog.Logger
	Limit  int
	Window time.Duration
	Now    func() time.Time

	mu         sync.Mutex
	start      time.Time
	inWindow   int
	suppressed int
	total      int
}

// NewDropLog returns a logger limited to 10 lines per minute.
func NewDropLog(l *slog.Logger) *DropLog {
	return &DropLog{Log: l, Limit: 10, Window: time.Minute, Now: time.Now}
}

// Record notes one dropped line. It reports whether the line was logged.
func (d *DropLog) Record(line string, drop *Drop) bool {
	d.mu.Lock()
	defer d.mu.Unlock()
	now := d.Now()
	d.total++
	if d.start.IsZero() || now.Sub(d.start) >= d.Window {
		if d.suppressed > 0 && d.Log != nil {
			d.Log.Debug("status: dropped lines suppressed", "count", d.suppressed)
		}
		d.start, d.inWindow, d.suppressed = now, 0, 0
	}
	if d.inWindow >= d.Limit {
		d.suppressed++
		return false
	}
	d.inWindow++
	if d.Log != nil {
		if len(line) > 120 {
			line = line[:120] + "..."
		}
		d.Log.Debug("status: dropped line", "reason", drop.Reason, "line", line)
	}
	return true
}

// Total is the number of lines ever recorded.
func (d *DropLog) Total() int {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.total
}
