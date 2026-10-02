package machine

import (
	"encoding/json"
	"fmt"
	"strconv"
	"testing"
)

// Every lamp set the core reports reaches the UI's frames, for every
// instance (UX 14.2.3 asks for this to be confirmed: all 20 accumulators,
// all three function tables, the cycling and initiating units, the master
// programmer, the constant transmitter, the multiplier and the divider).
// The Explore ENIAC panorama draws exactly these; the printer has no lamps
// of its own (its reader and punch lamps are the initiating unit's).
func TestEveryLampSetReachesFrames(t *testing.T) {
	m := NewMirror(nil)
	lines := []string{
		"cy 7", "cm A", "init 000000100000001",
		"mps 7 2", "mpd 19 4", "mpi 9 3",
		"ct 29 1",
		"m 13 000000000000000000000001 1 1",
		"d 9 6 10000001 000000000000000000000000000001",
	}
	for u := 0; u < 20; u++ { // wire indices are 0-based
		lines = append(lines, fmt.Sprintf("ad %d 10 7", u), fmt.Sprintf("ad %d 0 3", u), fmt.Sprintf("ac %d 10 1", u),
			fmt.Sprintf("ar %d 4", u), fmt.Sprintf("af %d 11 1", u))
	}
	for u := 0; u < 3; u++ {
		lines = append(lines, fmt.Sprintf("ftar %d 42", u), fmt.Sprintf("ftr %d 5", u), fmt.Sprintf("ftad %d 1", u),
			fmt.Sprintf("ftsu %d 1", u), fmt.Sprintf("ftse %d 1", u))
	}
	for _, l := range lines {
		m.ApplyLine(l)
	}
	_, p, ok := m.TakeDelta()
	if !ok {
		t.Fatal("no frame")
	}
	b, _ := json.Marshal(p)
	var d map[string]any
	json.Unmarshal(b, &d)
	acc := d["acc"].(map[string]any)
	for n := 1; n <= 20; n++ {
		a, ok := acc[strconv.Itoa(n)].(map[string]any)
		if !ok || a["sign"] != "M" || a["digits"] != "0000000007" || a["carry"] != "0000000001" || a["rep"] != 4.0 || a["prog"] != "000000000001" {
			t.Fatalf("acc %d: %v", n, a)
		}
	}
	ft := d["ft"].(map[string]any)
	for n := 1; n <= 3; n++ {
		f := ft[strconv.Itoa(n)].(map[string]any)
		if f["arg"] != "42" || f["ring"] != 5.0 || f["add"] != 1.0 || f["sub"] != 1.0 || f["argff"] != 1.0 {
			t.Fatalf("ft %d: %v", n, f)
		}
	}
	cy := d["cycle"].(map[string]any)
	mp := d["mp"].(map[string]any)
	mult := d["mult"].(map[string]any)
	div := d["div"].(map[string]any)
	if cy["pos"] != 7.0 || cy["mode"] != "A" || d["init"] != "000000100000001" || d["ct"].(string)[29] != '1' ||
		mp["stage"].(string)[7] != '2' || mp["dec"].(string)[19] != '4' || mp["inff"].(string)[9] != '3' ||
		mult["stage"] != 13.0 || mult["r1"] != 1.0 || mult["ff"].(string)[23] != '1' ||
		div["place"] != 9.0 || div["prog"] != 6.0 || div["progff"] != "10000001" || div["flags"].(string)[29] != '1' {
		t.Fatalf("frame %s", b)
	}
}
