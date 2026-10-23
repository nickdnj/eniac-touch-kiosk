package scores

import (
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
