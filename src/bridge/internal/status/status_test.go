package status

import (
	"strings"
	"testing"
	"time"
)

func TestParseTable(t *testing.T) {
	punch := "     00001     00000     00000     00000     00000     00000     00000     00000   "[:80]
	cases := []struct {
		line string
		want Event
	}{
		// Every row of architecture 5.1, using the real lines quoted there and in U7.
		{"ad 1 10 4", Event{Kind: AccDigit, Unit: 2, Index: 10, Value: 4}},
		{"ad 0 1 9", Event{Kind: AccDigit, Unit: 1, Index: 1, Value: 9}},
		{"ad 19 5 0", Event{Kind: AccDigit, Unit: 20, Index: 5, Value: 0}},
		{"ad 3 0 0", Event{Kind: AccSign, Unit: 4, Str: "P"}},
		{"ad 3 0 3", Event{Kind: AccSign, Unit: 4, Str: "M"}},
		{"ac 1 3 1", Event{Kind: AccCarry, Unit: 2, Index: 3, Value: 1}},
		{"ar 0 1", Event{Kind: AccRep, Unit: 1, Value: 1}},
		{"af 1 5 1", Event{Kind: AccProg, Unit: 2, Index: 5, Value: 1}},
		{"af 0 11 0", Event{Kind: AccProg, Unit: 1, Index: 11, Value: 0}},
		{"cy 26", Event{Kind: Cycle, Value: 26}},
		{"cy 0", Event{Kind: Cycle, Value: 0}},
		{"cm C", Event{Kind: CycleMode, Str: "C"}},
		{"cm P", Event{Kind: CycleMode, Str: "P"}},
		{"cm A", Event{Kind: CycleMode, Str: "A"}},
		{"init 000000000000000", Event{Kind: Init, Str: "000000000000000"}},
		{"init 000000000000010", Event{Kind: Init, Str: "000000000000010"}},
		{"mps 0 1", Event{Kind: MPStage, Index: 0, Value: 1}},
		{"mpd 19 3", Event{Kind: MPDec, Index: 19, Value: 3}},
		{"mpi 2 250", Event{Kind: MPInff, Index: 2, Str: "*"}},
		{"mpi 9 7", Event{Kind: MPInff, Index: 9, Str: "7"}},
		{"ftar 0 07", Event{Kind: FTArg, Unit: 1, Str: "07"}},
		{"ftar 2 00", Event{Kind: FTArg, Unit: 3, Str: "00"}},
		{"ftr 0 -3", Event{Kind: FTRing, Unit: 1, Value: -3}},
		{"ftr 1 66014", Event{Kind: FTRing, Unit: 2, Value: 66014}},
		{"ftad 1 1", Event{Kind: FTAdd, Unit: 2, Value: 1}},
		{"ftsu 0 0", Event{Kind: FTSub, Unit: 1, Value: 0}},
		{"ftse 2 1", Event{Kind: FTArgff, Unit: 3, Value: 1}},
		{"ct 25 1", Event{Kind: Const, Index: 25, Value: 1}},
		{"m  0 000000000000000000000000 0 0", Event{Kind: Mult, Value: 0, MultFF: strings.Repeat("0", 24)}},
		{"m 0 000000000000000000000000 0 0", Event{Kind: Mult, Value: 0, MultFF: strings.Repeat("0", 24)}},
		{"m 10 100000000000000000000001 1 0", Event{Kind: Mult, Value: 10, MultFF: "100000000000000000000001", R1: 1}},
		{"d 0 0 00000000 000000001000000000000000000000", Event{Kind: Div, DivFF: "00000000", Flags: "000000001000000000000000000000"}},
		{"punch " + punch, Event{Kind: Punch, Str: punch}},
		{"up", Event{Kind: Ignored, Str: "up"}},
		{"L 1 2 3 4", Event{Kind: Ignored, Str: "L"}},
		{"cy 12\r", Event{Kind: Cycle, Value: 12}},
	}
	for _, c := range cases {
		got, d := Parse(c.line)
		if d != nil {
			t.Errorf("Parse(%q): dropped: %s", c.line, d.Reason)
			continue
		}
		if got != c.want {
			t.Errorf("Parse(%q)\n got %+v\nwant %+v", c.line, got, c.want)
		}
	}
}

func TestBothMultFormatsEqual(t *testing.T) {
	a, _ := Parse("m  7 000000000000000000000010 0 1")
	b, _ := Parse("m 7 000000000000000000000010 0 1")
	if a != b || a.Kind != Mult || a.Value != 7 {
		t.Fatalf("%+v vs %+v", a, b)
	}
}

func TestPunchKeepsSpaces(t *testing.T) {
	payload := "  12 " + strings.Repeat(" ", 70) + "  9  "
	ev, d := Parse("punch " + payload)
	if d != nil || ev.Str != payload || len(ev.Str) != 80 {
		t.Fatalf("got %q %v", ev.Str, d)
	}
	if !strings.HasSuffix(ev.Str, "9  ") {
		t.Fatal("trailing spaces lost")
	}
}

func TestDrops(t *testing.T) {
	for _, line := range []string{
		"", "   ", "zz 1 2", "ad", "ad 20 1 1", "ad -1 1 1", "ad 0 11 1", "ad 0 1 10", "ad 0 0 1", "ad 0 1 x",
		"ad 0 1 1 1", "ac 0 0 1", "ac 0 1 2", "ar 0 10", "af 0 12 1", "cy 40", "cy -1", "cy", "cm X", "cm",
		"init 00000000000000", "init 0000000000000002", "mps 10 1", "mpd 20 1", "mpi 0 251", "mpi 0 10",
		"ftar 3 00", "ftar 0 7", "ftar 0 0x", "ftr 0 --3", "ftr 0 99999999999", "ftr 0 3.5", "ftad 0 2",
		"ct 30 1", "ct 0 -1", "m 0 0000 0 0", "m x 000000000000000000000000 0 0", "m 0 000000000000000000000000 0",
		"d 0 0 0000000 000000000000000000000000000000", "d 0 0 00000000 00000000000000000000000000000",
		"punch short", "punch " + strings.Repeat("x", 81), "punch " + strings.Repeat("\x00", 80),
		"up now", "L 1 2", strings.Repeat("a", MaxLine+1), "ad 0 1 \xff", "\xff\xfe", "ad +1 1 1",
	} {
		ev, d := Parse(line)
		if d == nil || d.Reason == "" {
			t.Errorf("Parse(%q) = %+v, want a Drop with a reason", line, ev)
		}
	}
}

func TestDropLogRateLimit(t *testing.T) {
	now := time.Unix(0, 0)
	dl := &DropLog{Limit: 10, Window: time.Minute, Now: func() time.Time { return now }}
	logged := 0
	for i := 0; i < 100; i++ {
		if dl.Record("x", &Drop{Reason: "r"}) {
			logged++
		}
	}
	if logged != 10 {
		t.Fatalf("logged %d in one minute, want 10", logged)
	}
	now = now.Add(61 * time.Second)
	if !dl.Record("x", &Drop{Reason: "r"}) {
		t.Fatal("new window should log")
	}
	if dl.Total() != 101 {
		t.Fatalf("total %d", dl.Total())
	}
}
