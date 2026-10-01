// Package status parses one raw core status line into a typed event, or a
// Drop with a reason (architecture 5.1, U7). It is pure and never panics
// (FR-04): any line the core, a data race or a bug can produce is either a
// valid Event or a Drop.
//
// Wire unit indices are 0-based; events carry 1-based unit numbers to match
// .e names (a1..a20, f1..f3).
package status

import (
	"strconv"
	"strings"
)

// Kind is the event type.
type Kind uint8

const (
	KindNone     Kind = iota
	AccSign           // ad U 0 V   Unit, Str "P"|"M"
	AccDigit          // ad U D V   Unit, Index D (1 = MSD), Value
	AccCarry          // ac U D B   Unit, Index D (1..10), Value
	AccRep            // ar U R     Unit, Value
	AccProg           // af U P B   Unit, Index P (0..11, program P+1), Value
	Cycle             // cy N       Value
	CycleMode         // cm X       Str "P"|"A"|"C"
	Init              // init BITS  Str (15 chars of 0/1)
	MPStage           // mps S V    Index S (0..9), Value
	MPDec             // mpd D V    Index D (0..19), Value
	MPInff            // mpi S V    Index S, Str "0".."9" or "*" (wire 250)
	FTArg             // ftar U AA  Unit (1..3), Str two digits
	FTRing            // ftr U R    Unit, Value (signed, unbounded)
	FTAdd             // ftad U B   Unit, Value
	FTSub             // ftsu U B   Unit, Value
	FTArgff           // ftse U B   Unit, Value
	Const             // ct I B     Index I (0..29, program I+1), Value
	Mult              // m S FF R1 R3
	Div               // d PL PR FF8 FLAGS30
	Punch             // punch <payload>  Str (line[6:], unsplit)
	Ignored           // up, L ...: valid lines the bridge has no use for
)

var kindNames = [...]string{"none", "acc.sign", "acc.digit", "acc.carry", "acc.rep", "acc.prog", "cycle", "cycle.mode",
	"init", "mp.stage", "mp.dec", "mp.inff", "ft.arg", "ft.ring", "ft.add", "ft.sub", "ft.argff", "ct", "mult", "div",
	"punch", "ignored"}

func (k Kind) String() string {
	if int(k) < len(kindNames) {
		return kindNames[k]
	}
	return "kind(" + strconv.Itoa(int(k)) + ")"
}

// Event is one parsed status line. Only the fields named for its Kind are set.
type Event struct {
	Kind  Kind
	Unit  int    // 1-based accumulator (1..20) or function table (1..3)
	Index int    // decade, program, stepper or position, as documented per Kind
	Value int    // numeric value
	Str   string // string value (sign, bits, payload)

	// Mult and Div carry several fields.
	MultFF  string // 24 bits
	R1, R3  int
	DivProg int
	DivFF   string // 8 bits
	Flags   string // 30 bits
}

// Drop explains why a line was not turned into an event.
type Drop struct {
	Reason string
}

func (d *Drop) Error() string { return d.Reason }

// MaxLine bounds the length of a line the parser will look at.
const MaxLine = 512

// Punch payloads are 80 characters (16 fields of 5).
const PunchLen = 80

func drop(r string) (Event, *Drop) { return Event{}, &Drop{Reason: r} }

// Parse turns one status line (without its trailing newline) into an Event.
// A non-nil Drop means the line was rejected; the Event is then zero.
func Parse(line string) (ev Event, d *Drop) {
	defer func() {
		// Belt and braces: the parser is written not to panic, but a panic
		// here would take down the whole bridge (FR-04).
		if r := recover(); r != nil {
			ev, d = Event{}, &Drop{Reason: "internal parser panic"}
		}
	}()
	if len(line) > MaxLine {
		return drop("line too long")
	}
	line = strings.TrimSuffix(line, "\r")
	if strings.HasPrefix(line, "punch ") {
		// Payload is everything after "punch ", unsplit: embedded and
		// trailing spaces are data.
		p := line[6:]
		if len(p) != PunchLen {
			return drop("punch payload is not 80 characters")
		}
		if !isPrintableASCII(p) {
			return drop("punch payload has non-printable bytes")
		}
		return Event{Kind: Punch, Str: p}, nil
	}
	f := strings.Fields(line)
	if len(f) == 0 {
		return drop("empty line")
	}
	switch f[0] {
	case "ad":
		if len(f) != 4 {
			return drop("ad: want 3 fields")
		}
		u, ok := unitAcc(f[1])
		if !ok {
			return drop("ad: bad accumulator")
		}
		dec, ok := intIn(f[2], 0, 10)
		if !ok {
			return drop("ad: bad decade")
		}
		v, ok := intIn(f[3], 0, 9)
		if !ok {
			return drop("ad: value out of range")
		}
		if dec == 0 {
			switch v {
			case 0:
				return Event{Kind: AccSign, Unit: u, Str: "P"}, nil
			case 3:
				return Event{Kind: AccSign, Unit: u, Str: "M"}, nil
			}
			return drop("ad: sign must be 0 or 3")
		}
		return Event{Kind: AccDigit, Unit: u, Index: dec, Value: v}, nil
	case "ac":
		if len(f) != 4 {
			return drop("ac: want 3 fields")
		}
		u, ok := unitAcc(f[1])
		if !ok {
			return drop("ac: bad accumulator")
		}
		dec, ok := intIn(f[2], 1, 10)
		if !ok {
			return drop("ac: bad decade")
		}
		b, ok := bit(f[3])
		if !ok {
			return drop("ac: bad bit")
		}
		return Event{Kind: AccCarry, Unit: u, Index: dec, Value: b}, nil
	case "ar":
		if len(f) != 3 {
			return drop("ar: want 2 fields")
		}
		u, ok := unitAcc(f[1])
		if !ok {
			return drop("ar: bad accumulator")
		}
		r, ok := intIn(f[2], 0, 9)
		if !ok {
			return drop("ar: bad repeat count")
		}
		return Event{Kind: AccRep, Unit: u, Value: r}, nil
	case "af":
		if len(f) != 4 {
			return drop("af: want 3 fields")
		}
		u, ok := unitAcc(f[1])
		if !ok {
			return drop("af: bad accumulator")
		}
		p, ok := intIn(f[2], 0, 11)
		if !ok {
			return drop("af: bad program")
		}
		b, ok := bit(f[3])
		if !ok {
			return drop("af: bad bit")
		}
		return Event{Kind: AccProg, Unit: u, Index: p, Value: b}, nil
	case "cy":
		if len(f) != 2 {
			return drop("cy: want 1 field")
		}
		n, ok := intIn(f[1], 0, 39)
		if !ok {
			return drop("cy: out of range")
		}
		return Event{Kind: Cycle, Value: n}, nil
	case "cm":
		if len(f) != 2 || (f[1] != "P" && f[1] != "A" && f[1] != "C") {
			return drop("cm: want P, A or C")
		}
		return Event{Kind: CycleMode, Str: f[1]}, nil
	case "init":
		if len(f) != 2 || len(f[1]) != 15 || !isBits(f[1]) {
			return drop("init: want 15 bits")
		}
		return Event{Kind: Init, Str: f[1]}, nil
	case "mps", "mpd", "mpi":
		if len(f) != 3 {
			return drop(f[0] + ": want 2 fields")
		}
		max := 9
		if f[0] == "mpd" {
			max = 19
		}
		i, ok := intIn(f[1], 0, max)
		if !ok {
			return drop(f[0] + ": bad index")
		}
		if f[0] == "mpi" {
			// inff values of 10 or more print as '*', which arrives as
			// '*'-'0' in a byte: 250 (U7).
			if f[2] == "250" {
				return Event{Kind: MPInff, Index: i, Str: "*"}, nil
			}
			v, ok := intIn(f[2], 0, 9)
			if !ok {
				return drop("mpi: bad value")
			}
			return Event{Kind: MPInff, Index: i, Str: strconv.Itoa(v)}, nil
		}
		v, ok := intIn(f[2], 0, 9)
		if !ok {
			return drop(f[0] + ": bad value")
		}
		k := MPStage
		if f[0] == "mpd" {
			k = MPDec
		}
		return Event{Kind: k, Index: i, Value: v}, nil
	case "ftar":
		if len(f) != 3 {
			return drop("ftar: want 2 fields")
		}
		u, ok := unitFT(f[1])
		if !ok {
			return drop("ftar: bad unit")
		}
		if len(f[2]) != 2 || !isDigits(f[2]) {
			return drop("ftar: want two digits")
		}
		return Event{Kind: FTArg, Unit: u, Str: f[2]}, nil
	case "ftr":
		if len(f) != 3 {
			return drop("ftr: want 2 fields")
		}
		u, ok := unitFT(f[1])
		if !ok {
			return drop("ftr: bad unit")
		}
		// Signed and unbounded: starts at -3 and runs away under U1.
		r, ok := intIn(f[2], -1<<31, 1<<31-1)
		if !ok {
			return drop("ftr: bad ring value")
		}
		return Event{Kind: FTRing, Unit: u, Value: r}, nil
	case "ftad", "ftsu", "ftse":
		if len(f) != 3 {
			return drop(f[0] + ": want 2 fields")
		}
		u, ok := unitFT(f[1])
		if !ok {
			return drop(f[0] + ": bad unit")
		}
		b, ok := bit(f[2])
		if !ok {
			return drop(f[0] + ": bad bit")
		}
		k := map[string]Kind{"ftad": FTAdd, "ftsu": FTSub, "ftse": FTArgff}[f[0]]
		return Event{Kind: k, Unit: u, Value: b}, nil
	case "ct":
		if len(f) != 3 {
			return drop("ct: want 2 fields")
		}
		i, ok := intIn(f[1], 0, 29)
		if !ok {
			return drop("ct: bad program")
		}
		b, ok := bit(f[2])
		if !ok {
			return drop("ct: bad bit")
		}
		return Event{Kind: Const, Index: i, Value: b}, nil
	case "m":
		// Split on runs of whitespace, so both the upstream "%2d" form
		// ("m  0 ...") and the patched "%d" form parse the same (FR-04).
		if len(f) != 5 {
			return drop("m: want 4 fields")
		}
		st, ok := intIn(f[1], 0, 99)
		if !ok {
			return drop("m: bad stage")
		}
		if len(f[2]) != 24 || !isBits(f[2]) {
			return drop("m: want 24 bits")
		}
		r1, ok1 := bit(f[3])
		r3, ok3 := bit(f[4])
		if !ok1 || !ok3 {
			return drop("m: bad reset bits")
		}
		return Event{Kind: Mult, Value: st, MultFF: f[2], R1: r1, R3: r3}, nil
	case "d":
		if len(f) != 5 {
			return drop("d: want 4 fields")
		}
		pl, ok1 := intIn(f[1], 0, 99)
		pr, ok2 := intIn(f[2], 0, 99)
		if !ok1 || !ok2 {
			return drop("d: bad ring")
		}
		if len(f[3]) != 8 || !isBits(f[3]) {
			return drop("d: want 8 program bits")
		}
		if len(f[4]) != 30 || !isBits(f[4]) {
			return drop("d: want 30 flag bits")
		}
		return Event{Kind: Div, Value: pl, DivProg: pr, DivFF: f[3], Flags: f[4]}, nil
	case "up":
		if len(f) != 1 {
			return drop("up: unexpected fields")
		}
		return Event{Kind: Ignored, Str: "up"}, nil
	case "L":
		if len(f) != 5 {
			return drop("L: want 4 fields")
		}
		return Event{Kind: Ignored, Str: "L"}, nil
	}
	return drop("unknown line type")
}

// unitAcc converts a 0-based wire accumulator index to 1..20.
func unitAcc(s string) (int, bool) {
	n, ok := intIn(s, 0, 19)
	return n + 1, ok
}

// unitFT converts a 0-based wire function-table index to 1..3.
func unitFT(s string) (int, bool) {
	n, ok := intIn(s, 0, 2)
	return n + 1, ok
}

// intIn parses a plain decimal integer (optional leading '-') in [lo, hi].
func intIn(s string, lo, hi int) (int, bool) {
	if len(s) == 0 || len(s) > 11 {
		return 0, false
	}
	for i, c := range []byte(s) {
		if !(c >= '0' && c <= '9') && !(i == 0 && c == '-' && len(s) > 1) {
			return 0, false
		}
	}
	n, err := strconv.Atoi(s)
	if err != nil || n < lo || n > hi {
		return 0, false
	}
	return n, true
}

func bit(s string) (int, bool) {
	switch s {
	case "0":
		return 0, true
	case "1":
		return 1, true
	}
	return 0, false
}

func isBits(s string) bool {
	for _, c := range []byte(s) {
		if c != '0' && c != '1' {
			return false
		}
	}
	return true
}

func isDigits(s string) bool {
	for _, c := range []byte(s) {
		if c < '0' || c > '9' {
			return false
		}
	}
	return len(s) > 0
}

func isPrintableASCII(s string) bool {
	for _, c := range []byte(s) {
		if c < 0x20 || c > 0x7e {
			return false
		}
	}
	return true
}
