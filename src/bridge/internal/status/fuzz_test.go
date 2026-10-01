package status

import (
	"strings"
	"testing"
)

// FuzzParse: never panics, and every rejection carries a reason (FR-04).
func FuzzParse(f *testing.F) {
	seeds := []string{
		"ad 1 10 4", "ad 3 0 3", "ac 1 3 1", "ar 0 1", "af 1 5 1", "cy 26", "cm C",
		"init 000000000000000", "mps 0 1", "mpd 19 3", "mpi 2 250", "ftar 0 07", "ftr 0 -3",
		"ftad 1 1", "ftsu 0 1", "ftse 0 1", "ct 25 1", "m  0 000000000000000000000000 0 0",
		"d 0 0 00000000 000000001000000000000000000000",
		"punch " + strings.Repeat(" 0000", 16), "up", "L 1 2 3 4",
		// nasties
		"", "\x00", "ad 0 1", "ad 0 1 99999999999999999999", "cy -9223372036854775808", "\r\n",
		"ftr 0 -", "punch", "punch ", "m", "d", "init", "\xff\xfe\xfd", strings.Repeat("9", 600),
		"ad\t0\t1\t1", "ad 0 1 1\x00",
	}
	for _, s := range seeds {
		f.Add(s)
	}
	f.Fuzz(func(t *testing.T, line string) {
		ev, d := Parse(line)
		if d != nil {
			if d.Reason == "" {
				t.Fatalf("drop without reason for %q", line)
			}
			if ev != (Event{}) {
				t.Fatalf("drop with non-zero event for %q", line)
			}
			return
		}
		if ev.Kind == KindNone {
			t.Fatalf("accepted %q with no kind", line)
		}
		if ev.Kind == Punch && len(ev.Str) != PunchLen {
			t.Fatalf("punch length %d", len(ev.Str))
		}
	})
}
