package metrics

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"eniac-kiosk/bridge/internal/protocol"
)

func open(t *testing.T) (*Writer, string) {
	dir := t.TempDir()
	w, err := Open(dir, 400, nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { w.Close() })
	return w, dir
}

func b(v bool) *bool { return &v }

func n(v int64) *int64 { return &v }

func TestUIWhitelist(t *testing.T) {
	w, dir := open(t)
	ok := []protocol.Metric{
		{Ev: "wrong_tap", Mission: "squares", Step: "a1-to-a2"},
		{Ev: "step_done", Mission: "squares", Step: "j1-one", Assisted: b(true)},
		{Ev: "speed", Mission: "squares", Speed: "full"},
		{Ev: "skip_to_answer", Mission: "squares"},
		{Ev: "setup_skipped", Mission: "squares", Step: "a1-twice"},
		{Ev: "idle_reset", Screen: "S4"},
		{Ev: "honor_page_view", N: n(2)},
	}
	for _, m := range ok {
		if err := w.UI(m, "abc123"); err != nil {
			t.Errorf("%+v: %v", m, err)
		}
	}
	bad := []protocol.Metric{
		{Ev: "mission_complete", Mission: "squares"},         // bridge event from the UI
		{Ev: "error_enter"},                                  // bridge event
		{Ev: "session_end"},                                  // bridge event
		{Ev: "made_up"},                                      // unknown
		{Ev: "wrong_tap", Screen: "S4"},                      // field not allowed for this event
		{Ev: "idle_reset", Mission: "squares"},               // field not allowed
		{Ev: "wrong_tap", Mission: "squares", Step: "a b c"}, // free text
		{Ev: "honor_page_view", Mission: "squares"},          // field not allowed
	}
	for _, m := range bad {
		if err := w.UI(m, "abc123"); !errors.Is(err, ErrNotAllowed) {
			t.Errorf("%+v accepted (%v)", m, err)
		}
	}
	w.SessionEnd()
	recs, _ := Read(dir)
	if len(recs) != len(ok) {
		t.Fatalf("%d records", len(recs))
	}
	if recs[4]["atStep"] != "a1-twice" || recs[1]["assisted"] != true || recs[0]["sid"] != "abc123" {
		t.Fatalf("%v", recs)
	}
	for _, r := range recs {
		for k := range r {
			switch k {
			case "ts", "ev", "sid", "m", "step", "atStep", "assisted", "speed", "screen", "n":
			default:
				t.Errorf("unexpected key %q", k)
			}
		}
	}
}

func TestBridgeEvents(t *testing.T) {
	w, dir := open(t)
	w.Bridge("session_start", "s1", nil)
	w.Bridge("mission_complete", "s1", map[string]any{"m": "squares", "durS": 130})
	w.Bridge("session_end", "s1", map[string]any{"durS": 150, "reason": "done"})
	w.Bridge("wrong_tap", "s1", nil)                                                    // a UI event is not a bridge event
	w.Bridge("error_enter", "", map[string]any{"code": "E-CORE-DOWN", "ip": "1.2.3.4"}) // extra field dropped
	w.SessionEnd()
	recs, _ := Read(dir)
	var evs []string
	for _, r := range recs {
		evs = append(evs, r["ev"].(string))
	}
	if strings.Join(evs, ",") != "session_start,mission_complete,session_end" {
		t.Fatalf("%v", evs)
	}
}

// FR-98: the Explore ENIAC and glossary counters from the UI, with only
// their own fields (the attract counters are the bridge's, attract.go).
func TestExploreEvents(t *testing.T) {
	w, dir := open(t)
	ok := []protocol.Metric{
		{Ev: "explore_open", Screen: "picker"},
		{Ev: "explore_open", Screen: "briefing", Mission: "primes"},
		{Ev: "explore_card", Unit: "acc"},
		{Ev: "explore_walk_completed"},
		{Ev: "explore_mission_chip", Mission: "trajectory"},
		{Ev: "glossary_open"},
	}
	for _, m := range ok {
		if err := w.UI(m, ""); err != nil {
			t.Errorf("%+v: %v", m, err)
		}
	}
	bad := []protocol.Metric{
		{Ev: "explore_card", Mission: "squares"},     // field not allowed
		{Ev: "wrong_tap", Unit: "acc"},               // unit only on explore_card
		{Ev: "explore_card", Unit: "acc 7"},          // free text
		{Ev: "attract_flight_started", Mission: "x"}, // bridge event from the UI
	}
	for _, m := range bad {
		if err := w.UI(m, ""); !errors.Is(err, ErrNotAllowed) {
			t.Errorf("%+v accepted (%v)", m, err)
		}
	}
	w.SessionEnd()
	recs, _ := Read(dir)
	if len(recs) != len(ok) {
		t.Fatalf("%d records: %v", len(recs), recs)
	}
	if recs[2]["unit"] != "acc" || recs[4]["m"] != "trajectory" {
		t.Fatalf("%v", recs)
	}
}

// FR-101 (TUBE-23): the S16 counters, with only their own fields and no free text.
func TestTubesEvents(t *testing.T) {
	w, dir := open(t)
	n := func(v int64) *int64 { return &v }
	yes := true
	ok := []protocol.Metric{
		{Ev: "tubes_open", Screen: "explore"},
		{Ev: "tubes_card", N: n(2)},
		{Ev: "tubes_myth_open"},
		{Ev: "tubes_try_start", N: n(0)},
		{Ev: "tubes_try_step", N: n(3)},
		{Ev: "tubes_try_done", N: n(1), Assisted: &yes},
		{Ev: "tubes_try_skip", N: n(4)},
	}
	for _, m := range ok {
		if err := w.UI(m, ""); err != nil {
			t.Errorf("%+v: %v", m, err)
		}
	}
	bad := []protocol.Metric{
		{Ev: "tubes_card", Unit: "acc"},          // field not allowed
		{Ev: "tubes_myth_open", N: n(1)},         // no fields
		{Ev: "tubes_open", Screen: "explore 2!"}, // free text
		{Ev: "tubes_try_step", Mission: "x"},     // field not allowed
	}
	for _, m := range bad {
		if err := w.UI(m, ""); !errors.Is(err, ErrNotAllowed) {
			t.Errorf("%+v accepted (%v)", m, err)
		}
	}
	w.SessionEnd()
	recs, _ := Read(dir)
	if len(recs) != len(ok) {
		t.Fatalf("%d records: %v", len(recs), recs)
	}
	if recs[5]["assisted"] != true || recs[5]["n"] != float64(1) || recs[0]["screen"] != "explore" {
		t.Fatalf("%v", recs)
	}
}

func TestTruncatedLastLineSkipped(t *testing.T) {
	w, dir := open(t)
	w.Bridge("session_start", "s1", nil)
	w.Bridge("session_start", "s2", nil)
	w.Close()
	files, _ := filepath.Glob(filepath.Join(dir, "metrics", "*.jsonl"))
	f, _ := os.OpenFile(files[0], os.O_APPEND|os.O_WRONLY, 0)
	f.WriteString(`{"ts":"2026-10-03T14:22:05Z","ev":"sess`) // power cut mid-write
	f.Close()
	recs, err := Read(dir)
	if err != nil || len(recs) != 2 {
		t.Fatalf("%v %d", err, len(recs))
	}
}

func TestMonthlyFilesAndRetention(t *testing.T) {
	dir := t.TempDir()
	os.MkdirAll(filepath.Join(dir, "metrics"), 0o755)
	for _, m := range []string{"2025-01", "2025-08", "2025-09"} {
		os.WriteFile(filepath.Join(dir, "metrics", m+".jsonl"), []byte("{}\n"), 0o644)
	}
	now := time.Date(2026, 10, 3, 12, 0, 0, 0, time.UTC)
	w, err := Open(dir, 400, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer w.Close()
	w.SetClock(func() time.Time { return now })
	w.Prune()
	left, _ := filepath.Glob(filepath.Join(dir, "metrics", "*.jsonl"))
	var names []string
	for _, f := range left {
		names = append(names, filepath.Base(f))
	}
	// 400 days before 2026-10-03 is 2025-08-29: January 2025 is wholly older
	// and goes; August 2025 still holds days inside the window and stays.
	if strings.Join(names, ",") != "2025-08.jsonl,2025-09.jsonl" {
		t.Fatalf("after prune: %v", names)
	}
	w.Bridge("session_start", "a", nil)
	now = time.Date(2026, 11, 1, 0, 0, 1, 0, time.UTC)
	w.Bridge("session_start", "b", nil)
	w.SessionEnd()
	for _, m := range []string{"2026-10.jsonl", "2026-11.jsonl"} {
		if _, err := os.Stat(filepath.Join(dir, "metrics", m)); err != nil {
			t.Errorf("missing %s", m)
		}
	}
}
