package machine

import (
	"testing"
	"time"

	"eniac-kiosk/bridge/internal/status"
)

func TestQuietFor(t *testing.T) {
	for _, c := range []struct {
		rate, override int
		want           time.Duration
	}{
		{0, 0, 120 * time.Millisecond},
		{100, 0, 600 * time.Millisecond}, // addition 200 ms
		{1000, 0, 120 * time.Millisecond}, // addition 20 ms -> 60 < 120
		{500, 0, 120 * time.Millisecond},
		{10, 0, 6 * time.Second},
		{100, 250, 250 * time.Millisecond},
	} {
		if got := QuietFor(c.rate, c.override); got != c.want {
			t.Errorf("QuietFor(%d,%d) = %s, want %s", c.rate, c.override, got, c.want)
		}
	}
}

type clock struct{ t time.Time }

func (c *clock) now() time.Time          { return c.t }
func (c *clock) add(d time.Duration)     { c.t = c.t.Add(d) }
func ev(k status.Kind, u, i, v int) status.Event {
	return status.Event{Kind: k, Unit: u, Index: i, Value: v}
}

func setup() (*clock, *Mirror, *RunTracker) {
	c := &clock{t: time.Unix(1000, 0)}
	m := NewMirror(nil)
	m.SetClock(c.now)
	rt := NewRunTracker(m, []int{1, 2}, 0, 0) // quiet 120 ms
	rt.SetClock(c.now)
	return c, m, rt
}

func TestIdleHappyPath(t *testing.T) {
	c, m, rt := setup()
	if rt.State() != RunIdle {
		t.Fatal("starts idle")
	}
	if e := rt.Pressed(true); e.State != RunBusy || e.Inits != 1 {
		t.Fatalf("%+v", e)
	}
	c.add(30 * time.Millisecond)
	m.Apply(status.Event{Kind: status.Init, Str: "000000000000010"}) // gate66
	c.add(30 * time.Millisecond)
	m.Apply(ev(status.AccProg, 1, 5, 1))
	m.Apply(status.Event{Kind: status.Init, Str: "000000000000000"})
	c.add(200 * time.Millisecond)
	if _, ok := rt.Tick(); ok {
		t.Fatal("idle while a program flip-flop is set")
	}
	m.Apply(ev(status.AccProg, 1, 5, 0))
	m.Apply(ev(status.AccDigit, 1, 10, 1))
	m.Apply(ev(status.AccDigit, 2, 10, 1))
	c.add(100 * time.Millisecond)
	m.Apply(ev(status.Cycle, 0, 0, 17)) // cycle-only changes don't reset quiet
	if _, ok := rt.Tick(); ok {
		t.Fatal("idle before quiet elapsed")
	}
	c.add(25 * time.Millisecond)
	e, ok := rt.Tick()
	if !ok || e.State != RunIdle || e.Settled["1"] != 1 || e.Settled["2"] != 1 || e.Inits != 1 {
		t.Fatalf("want idle 1/1, got %+v %v", e, ok)
	}
	if _, ok := rt.Tick(); ok {
		t.Fatal("idle emitted twice")
	}
}

// Each condition failing on its own keeps the tracker busy.
func TestIdleEachConditionAlone(t *testing.T) {
	t.Run("quiet", func(t *testing.T) {
		c, m, rt := setup()
		rt.Pressed(true)
		for i := 0; i < 20; i++ {
			c.add(50 * time.Millisecond)
			m.Apply(ev(status.AccDigit, 2, 10, i%10)) // keeps changing
			if _, ok := rt.Tick(); ok {
				t.Fatal("idle while values still change")
			}
		}
	})
	t.Run("prog", func(t *testing.T) {
		c, m, rt := setup()
		rt.Pressed(true)
		m.Apply(ev(status.AccProg, 20, 11, 1))
		c.add(5 * time.Second)
		if _, ok := rt.Tick(); ok {
			t.Fatal("idle with prog set")
		}
	})
	t.Run("gates", func(t *testing.T) {
		for _, bits := range []string{"000000000000010", "000000000000001"} {
			c, m, rt := setup()
			rt.Pressed(true)
			m.Apply(status.Event{Kind: status.Init, Str: bits})
			c.add(5 * time.Second)
			if _, ok := rt.Tick(); ok {
				t.Fatalf("idle with init %s", bits)
			}
		}
	})
	t.Run("press-resets-quiet", func(t *testing.T) {
		c, _, rt := setup()
		c.add(10 * time.Second) // long quiet before the press
		rt.Pressed(true)
		if _, ok := rt.Tick(); ok {
			t.Fatal("idle immediately after a press")
		}
		c.add(121 * time.Millisecond)
		if _, ok := rt.Tick(); !ok {
			t.Fatal("no idle after quiet with nothing changing")
		}
	})
}

func TestCheckpointsEdgeTriggered(t *testing.T) {
	one, twelve := int64(1), int64(12)
	cps := NewCheckpoints([]Checkpoint{
		{ID: "first-square", When: Predicate{Acc: "2", Eq: &one}},
		{ID: "answer", When: Predicate{Acc: "1", Eq: &twelve}},
	})
	s := Initial()
	if got := cps.Evaluate(&s); len(got) != 0 {
		t.Fatal(got)
	}
	copy(s.Acc[1].Digits[:], "0000000001")
	if got := cps.Evaluate(&s); len(got) != 1 || got[0] != "first-square" {
		t.Fatal(got)
	}
	copy(s.Acc[1].Digits[:], "0000000004")
	copy(s.Acc[1].Digits[:], "0000000001")
	if got := cps.Evaluate(&s); len(got) != 0 {
		t.Fatalf("fired twice: %v", got)
	}
	copy(s.Acc[0].Digits[:], "0000000012")
	if got := cps.Evaluate(&s); len(got) != 1 || got[0] != "answer" || !cps.Fired("answer") {
		t.Fatal(got)
	}
}

func TestPredicateForms(t *testing.T) {
	five, ten := int64(5), int64(10)
	s := Initial()
	copy(s.Acc[2].Digits[:], "0000000007")
	for _, c := range []struct {
		p    Predicate
		want bool
	}{
		{Predicate{Acc: "3", Gte: &five}, true},
		{Predicate{Acc: "3", Gte: &ten}, false},
		{Predicate{Acc: "3", Lte: &ten}, true},
		{Predicate{All: []Predicate{{Acc: "3", Gte: &five}, {Acc: "3", Lte: &ten}}}, true},
		{Predicate{Any: []Predicate{{Acc: "3", Gte: &ten}, {Acc: "1", Lte: &five}}}, true},
	} {
		if err := c.p.Validate(); err != nil {
			t.Fatal(err)
		}
		if got := c.p.Eval(&s); got != c.want {
			t.Errorf("%+v = %v", c.p, got)
		}
	}
	for _, bad := range []Predicate{{}, {Acc: "0", Eq: &five}, {Acc: "21", Eq: &five}, {Acc: "01", Eq: &five}, {Acc: "3"},
		{Acc: "3", Eq: &five, All: []Predicate{{Acc: "1", Eq: &five}}}} {
		if bad.Validate() == nil {
			t.Errorf("%+v accepted", bad)
		}
	}
}
