// Package metrics writes the anonymous on-box event log (architecture 8.3,
// PRD FR-60, NFR-11): append-only JSONL in monthly files
// metrics/YYYY-MM.jsonl, fsync at session end and at least every 30 s.
// Rollups, the admin view and CSV export are M3.
//
// Records carry a random per-session id (sid) and nothing else about the
// visitor: no IPs, no device ids, no free text. UI events arrive through
// the `metric` websocket message and are whitelisted by name and field;
// bridge events (errors, completion, restarts, session start/end) are
// written only by the bridge and cannot come from the UI.
package metrics

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"sync"
	"time"

	"eniac-kiosk/bridge/internal/protocol"
)

// uiFields: event name -> allowed fields (architecture 8.3).
var uiFields = map[string][]string{
	"wrong_tap":      {"m", "step"},
	"step_done":      {"m", "step", "assisted"},
	"speed":          {"m", "speed"},
	"skip_to_answer": {"m"},
	"setup_skipped":  {"m", "atStep"},
	"idle_reset":     {"screen"},
}

// bridgeFields: bridge-only events and their fields.
var bridgeFields = map[string][]string{
	"session_start":    {},
	"session_end":      {"durS", "reason"},
	"mission_start":    {"m"},
	"mission_complete": {"m", "durS"},
	"error_enter":      {"code"},
	"error_exit":       {"code", "durS"},
	"core_restart":     {"code"},
}

var safe = regexp.MustCompile(`^[A-Za-z0-9_-]{1,64}$`)

// Writer appends events. Safe for concurrent use.
type Writer struct {
	dir       string
	retention time.Duration
	log       *slog.Logger
	now       func() time.Time

	mu    sync.Mutex
	f     *os.File
	month string
	dirty bool
	stop  chan struct{}
	once  sync.Once
}

// Open prepares <stateDir>/metrics, deletes files older than retentionDays
// and starts the 30 s fsync loop.
func Open(stateDir string, retentionDays int, log *slog.Logger) (*Writer, error) {
	if log == nil {
		log = slog.Default()
	}
	w := &Writer{dir: filepath.Join(stateDir, "metrics"), retention: time.Duration(retentionDays) * 24 * time.Hour,
		log: log, now: time.Now, stop: make(chan struct{})}
	if err := os.MkdirAll(w.dir, 0o750); err != nil {
		return nil, err
	}
	w.Prune()
	go w.syncLoop()
	return w, nil
}

// SetClock replaces time.Now (tests).
func (w *Writer) SetClock(now func() time.Time) { w.now = now }

// Close syncs and closes the current file. It is idempotent.
func (w *Writer) Close() error {
	w.once.Do(func() { close(w.stop) })
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.f == nil {
		return nil
	}
	w.f.Sync()
	err := w.f.Close()
	w.f = nil
	return err
}

func (w *Writer) syncLoop() {
	t := time.NewTicker(30 * time.Second)
	defer t.Stop()
	lastPrune := time.Now()
	for {
		select {
		case <-w.stop:
			return
		case <-t.C:
			w.sync()
			if time.Since(lastPrune) > 24*time.Hour {
				lastPrune = time.Now()
				w.Prune()
			}
		}
	}
}

func (w *Writer) sync() {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.f != nil && w.dirty {
		w.f.Sync()
		w.dirty = false
	}
}

// SessionEnd fsyncs (architecture 8.3).
func (w *Writer) SessionEnd() { w.sync() }

func (w *Writer) append(rec map[string]any) error {
	b, err := json.Marshal(rec)
	if err != nil {
		return err
	}
	w.mu.Lock()
	defer w.mu.Unlock()
	month := rec["ts"].(string)[:7]
	if w.f == nil || month != w.month {
		if w.f != nil {
			w.f.Sync()
			w.f.Close()
		}
		f, err := os.OpenFile(filepath.Join(w.dir, month+".jsonl"), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o640)
		if err != nil {
			w.f = nil
			return err
		}
		w.f, w.month = f, month
	}
	if _, err := w.f.Write(append(b, '\n')); err != nil {
		return err
	}
	w.dirty = true
	return nil
}

func (w *Writer) record(ev, sid string, fields map[string]any) map[string]any {
	rec := map[string]any{"ts": w.now().UTC().Format(time.RFC3339), "ev": ev}
	if sid != "" {
		rec["sid"] = sid
	}
	for k, v := range fields {
		rec[k] = v
	}
	return rec
}

// Bridge records a bridge-owned event. Unknown names or fields are dropped
// (a programming error, logged).
func (w *Writer) Bridge(ev, sid string, fields map[string]any) {
	allowed, ok := bridgeFields[ev]
	if !ok {
		w.log.Error("metrics: not a bridge event", "ev", ev)
		return
	}
	for k, v := range fields {
		if !contains(allowed, k) || !safeValue(v) {
			w.log.Error("metrics: field not allowed", "ev", ev, "field", k)
			return
		}
	}
	if err := w.append(w.record(ev, sid, fields)); err != nil {
		w.log.Error("metrics: write", "err", err)
	}
}

// ErrNotAllowed rejects a UI metric that is not whitelisted.
var ErrNotAllowed = errors.New("metric not allowed")

// UI records a whitelisted UI event from a `metric` message.
func (w *Writer) UI(m protocol.Metric, sid string) error {
	allowed, ok := uiFields[m.Ev]
	if !ok {
		return fmt.Errorf("%w: %q is not a UI event", ErrNotAllowed, m.Ev)
	}
	fields := map[string]any{}
	set := func(name string, v any, present bool) error {
		if !present {
			return nil
		}
		if !contains(allowed, name) {
			return fmt.Errorf("%w: field %s not allowed for %s", ErrNotAllowed, name, m.Ev)
		}
		if !safeValue(v) {
			return fmt.Errorf("%w: bad value for %s", ErrNotAllowed, name)
		}
		fields[name] = v
		return nil
	}
	stepName := "step"
	if m.Ev == "setup_skipped" {
		stepName = "atStep"
	}
	for _, e := range []error{
		set("m", m.Mission, m.Mission != ""),
		set(stepName, m.Step, m.Step != ""),
		set("speed", m.Speed, m.Speed != ""),
		set("screen", m.Screen, m.Screen != ""),
		set("assisted", deref(m.Assisted), m.Assisted != nil),
		set("n", derefN(m.N), m.N != nil),
	} {
		if e != nil {
			return e
		}
	}
	return w.append(w.record(m.Ev, sid, fields))
}

func deref(b *bool) bool {
	if b == nil {
		return false
	}
	return *b
}

func derefN(n *int64) int64 {
	if n == nil {
		return 0
	}
	return *n
}

func safeValue(v any) bool {
	switch x := v.(type) {
	case string:
		return safe.MatchString(x)
	case bool, int, int64:
		return true
	}
	return false
}

func contains(list []string, s string) bool {
	for _, x := range list {
		if x == s {
			return true
		}
	}
	return false
}

// Prune deletes monthly files whose whole month is older than retention.
func (w *Writer) Prune() {
	files, _ := filepath.Glob(filepath.Join(w.dir, "*.jsonl"))
	cutoff := w.now().Add(-w.retention)
	for _, f := range files {
		t, err := time.Parse("2006-01", filepath.Base(f)[:7])
		if err != nil {
			continue
		}
		end := t.AddDate(0, 1, 0)
		if end.Before(cutoff) {
			w.log.Info("metrics: pruning", "file", filepath.Base(f))
			os.Remove(f)
		}
	}
}

// Read returns every record in the metrics dir, oldest file first. A
// truncated or corrupt line (for example after a power cut) is skipped.
func Read(stateDir string) ([]map[string]any, error) {
	files, err := filepath.Glob(filepath.Join(stateDir, "metrics", "*.jsonl"))
	if err != nil {
		return nil, err
	}
	sort.Strings(files)
	var out []map[string]any
	for _, f := range files {
		fh, err := os.Open(f)
		if err != nil {
			return nil, err
		}
		sc := bufio.NewScanner(fh)
		sc.Buffer(make([]byte, 64*1024), 1<<20)
		for sc.Scan() {
			var m map[string]any
			if json.Unmarshal(sc.Bytes(), &m) != nil {
				continue
			}
			out = append(out, m)
		}
		fh.Close()
	}
	return out, nil
}
