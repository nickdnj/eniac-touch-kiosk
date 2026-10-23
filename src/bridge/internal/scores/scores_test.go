package scores

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestBoardOrderAndDay(t *testing.T) {
	s := New(t.TempDir())
	day1 := time.Date(2026, 10, 22, 10, 0, 0, 0, time.UTC)
	s.now = func() time.Time { return day1 }
	for _, c := range []struct {
		n string
		v int
	}{{"AAA", 400}, {"BBB", 900}, {"CCC", 650}} {
		if _, ok := s.Add("gunnery", Entry{Name: c.n, Score: c.v, Charge: "c1", Elevation: "e5"}); !ok {
			t.Fatalf("add %s refused", c.n)
		}
	}
	s.now = func() time.Time { return day1.AddDate(0, 0, 1) }
	b, _ := s.Add("gunnery", Entry{Name: "DDD", Score: 100, Charge: "c1", Elevation: "e5"})
	if len(b.All) != 4 || b.All[0].Name != "BBB" || b.All[3].Name != "DDD" {
		t.Fatalf("all: %+v", b.All)
	}
	if len(b.Today) != 1 || b.Today[0].Name != "DDD" {
		t.Fatalf("today: %+v", b.Today)
	}
}

func TestBadEntriesRefused(t *testing.T) {
	s := New(t.TempDir())
	for _, e := range []Entry{
		{Name: "", Score: 1, Charge: "c1", Elevation: "e5"},
		{Name: "<script>", Score: 1, Charge: "c1", Elevation: "e5"},
		{Name: strings.Repeat("A", 9), Score: 1, Charge: "c1", Elevation: "e5"},
		{Name: "OK", Score: -1, Charge: "c1", Elevation: "e5"},
		{Name: "OK", Score: 1, Charge: "../x", Elevation: "e5"},
	} {
		if _, ok := s.Add("gunnery", e); ok {
			t.Errorf("accepted %+v", e)
		}
	}
	if _, ok := s.Add("../etc", Entry{Name: "OK", Score: 1, Charge: "c1", Elevation: "e5"}); ok {
		t.Error("bad mission id accepted")
	}
}

func TestBlockedNames(t *testing.T) {
	s := New(t.TempDir())
	for _, bad := range []string{"ASS", "f u c k", "SH1T", "xXfuckXx", "NAZI", "$EX"} {
		if !s.Blocked(bad) {
			t.Errorf("%q was let through", bad)
		}
	}
	for _, ok := range []string{"CLASS", "PASS", "NICK", "ASSAD", "ANNA L", "Dana", "R2D2"} {
		if s.Blocked(ok) {
			t.Errorf("%q was blocked", ok)
		}
	}
}

func TestStaffBlockedFile(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "blocked-names.txt"), []byte("Gizmo\nzz\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	s := New(dir)
	if !s.Blocked("gizmo") || !s.Blocked("MR GIZMO") {
		t.Error("a staff word was not blocked")
	}
	if s.Blocked("ZZTOP") {
		t.Error("a two-letter staff word should only block the whole name")
	}
	if !s.Blocked("ZZ") {
		t.Error("the whole name ZZ should be blocked")
	}
	if _, ok := s.Add("gunnery", Entry{Name: "GIZMO", Score: 5, Charge: "c1", Elevation: "e5"}); ok {
		t.Error("Add took a blocked name")
	}
}
