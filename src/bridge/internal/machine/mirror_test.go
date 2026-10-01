package machine

import (
	"encoding/json"
	"math/rand"
	"reflect"
	"strconv"
	"testing"
	"time"

	"eniac-kiosk/bridge/internal/status"
)

func TestSnapshotShape(t *testing.T) {
	s := Initial()
	s.Acc[1].Digits = [10]byte{'0', '0', '0', '0', '0', '0', '0', '0', '0', '9'}
	b, _ := json.Marshal(s.Snapshot())
	var m map[string]any
	json.Unmarshal(b, &m)
	for _, k := range []string{"cycle", "init", "acc", "mp", "ft", "ct", "mult", "div"} {
		if _, ok := m[k]; !ok {
			t.Errorf("missing %s", k)
		}
	}
	acc := m["acc"].(map[string]any)
	if len(acc) != 20 || acc["20"] == nil || acc["0"] != nil {
		t.Fatalf("acc keys wrong: %d", len(acc))
	}
	a2 := acc["2"].(map[string]any)
	if a2["digits"] != "0000000009" || a2["value"] != 9.0 || a2["sign"] != "P" || a2["prog"] != "000000000000" {
		t.Fatalf("acc 2: %v", a2)
	}
	if ft := m["ft"].(map[string]any); len(ft) != 3 || ft["1"] == nil {
		t.Fatal("ft keys")
	}
	var walk func(v any)
	walk = func(v any) {
		switch x := v.(type) {
		case []any:
			t.Fatal("MachineState must not contain arrays")
		case map[string]any:
			for _, c := range x {
				walk(c)
			}
		}
	}
	walk(m)
}

func TestValueDecode(t *testing.T) {
	a := Initial().Acc[0]
	copy(a.Digits[:], "0000000144")
	if a.Value() != 144 {
		t.Fatal(a.Value())
	}
	a.Sign = 'M'
	copy(a.Digits[:], "9999999995")
	if a.Value() != -5 {
		t.Fatal(a.Value())
	}
}

func randomEvent(r *rand.Rand) status.Event {
	switch r.Intn(10) {
	case 0, 1, 2:
		return status.Event{Kind: status.Cycle, Value: r.Intn(40)}
	case 3:
		return status.Event{Kind: status.AccDigit, Unit: 1 + r.Intn(20), Index: 1 + r.Intn(10), Value: r.Intn(10)}
	case 4:
		return status.Event{Kind: status.AccProg, Unit: 1 + r.Intn(20), Index: r.Intn(12), Value: r.Intn(2)}
	case 5:
		s := []string{"P", "M"}[r.Intn(2)]
		return status.Event{Kind: status.AccSign, Unit: 1 + r.Intn(20), Str: s}
	case 6:
		b := make([]byte, 15)
		for i := range b {
			b[i] = byte('0' + r.Intn(2))
		}
		return status.Event{Kind: status.Init, Str: string(b)}
	case 7:
		return status.Event{Kind: status.FTRing, Unit: 1 + r.Intn(3), Value: r.Intn(200) - 3}
	case 8:
		return status.Event{Kind: status.Const, Index: r.Intn(30), Value: r.Intn(2)}
	default:
		return status.Event{Kind: status.MPInff, Index: r.Intn(10), Str: []string{"0", "3", "*"}[r.Intn(3)]}
	}
}

func jsonEq(a, b map[string]any) bool {
	ja, _ := json.Marshal(a)
	jb, _ := json.Marshal(b)
	var x, y any
	json.Unmarshal(ja, &x)
	json.Unmarshal(jb, &y)
	return reflect.DeepEqual(x, y)
}

// snapshot(t0) + all emitted merge-patches == snapshot(tN), under random
// tick timing, for a fast client and for a slow client whose deltas merge
// in its Coalescer (architecture 11.3).
func TestPropertyConvergence(t *testing.T) {
	for seed := int64(1); seed <= 300; seed++ {
		r := rand.New(rand.NewSource(seed))
		m := NewMirror(nil)
		_, base, _ := m.Snapshot()
		fast, slow := Clone(base), Clone(base)
		co := NewCoalescer()
		for step := 0; step < 400; step++ {
			m.Apply(randomEvent(r))
			if r.Intn(3) == 0 {
				if seq, p, ok := m.TakeDelta(); ok {
					fast = Merge(fast, Clone(p))
					co.AddFrame(seq, p)
				}
			}
			if r.Intn(40) == 0 {
				if _, p, _ := co.Take(); p != nil {
					slow = Merge(slow, p)
				}
			}
		}
		if seq, p, ok := m.TakeDelta(); ok {
			fast = Merge(fast, Clone(p))
			co.AddFrame(seq, p)
		}
		if _, p, _ := co.Take(); p != nil {
			slow = Merge(slow, p)
		}
		st := m.State()
		want := st.Snapshot()
		if !jsonEq(fast, want) {
			t.Fatalf("seed %d: fast client diverged", seed)
		}
		if !jsonEq(slow, want) {
			t.Fatalf("seed %d: slow (merging) client diverged", seed)
		}
	}
}

func TestDiffOnlyChangedLeaves(t *testing.T) {
	m := NewMirror(nil)
	m.Apply(status.Event{Kind: status.AccDigit, Unit: 2, Index: 10, Value: 4})
	m.Apply(status.Event{Kind: status.Cycle, Value: 14})
	_, p, ok := m.TakeDelta()
	if !ok {
		t.Fatal("no delta")
	}
	b, _ := json.Marshal(p)
	want := `{"acc":{"2":{"digits":"0000000004","value":4}},"cycle":{"pos":14}}`
	if string(b) != want {
		t.Fatalf("patch %s\nwant  %s", b, want)
	}
}

func TestPunchQueueBoundAndOrder(t *testing.T) {
	co := NewCoalescer()
	for i := 1; i <= PunchQueueMax; i++ {
		if err := co.AddPunch(Punch{N: i}); err != nil {
			t.Fatalf("card %d: %v", i, err)
		}
	}
	if err := co.AddPunch(Punch{N: PunchQueueMax + 1}); err != ErrPunchOverflow {
		t.Fatalf("want overflow, got %v", err)
	}
	_, _, ps := co.Take()
	for i, p := range ps {
		if p.N != i+1 {
			t.Fatalf("order broken at %d", i)
		}
	}
}

func TestLastNonCycleChange(t *testing.T) {
	now := time.Unix(100, 0)
	m := NewMirror(nil)
	m.SetClock(func() time.Time { return now })
	m.Apply(status.Event{Kind: status.AccDigit, Unit: 1, Index: 10, Value: 1})
	t0 := m.LastNonCycleChange()
	now = now.Add(time.Second)
	m.Apply(status.Event{Kind: status.Cycle, Value: 5})
	m.Apply(status.Event{Kind: status.AccDigit, Unit: 1, Index: 10, Value: 1}) // no change
	if !m.LastNonCycleChange().Equal(t0) {
		t.Fatal("cycle-only or no-op events moved the quiet clock")
	}
	m.ApplyLine("garbage " + strconv.Itoa(3))
}
