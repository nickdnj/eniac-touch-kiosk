package econfig

import (
	"strconv"
	"strings"
)

// Terminal kinds.
const (
	KindJack      = "jack"
	KindDataTrunk = "data-trunk"
	KindProgTrunk = "program-trunk"
)

// Terminal classes (the compiled mission's fromClass/toClass).
const (
	ClassDataIn    = "data-in"
	ClassDataOut   = "data-out"
	ClassProgIn    = "program-in"
	ClassProgOut   = "program-out"
	ClassDataTrunk = "data-trunk"
	ClassProgTrunk = "program-trunk"
	ClassOther     = "other"
)

// Terminal is one end of a `p` line.
type Terminal struct {
	Raw   string // as written
	Canon string // canonical .e form, e.g. "a1.α", "c.o", "1", "1-3"
	Kind  string // KindJack, KindDataTrunk, KindProgTrunk
	Unit  string // "a1".."a20", "c", "i" for jacks; "" for trunks; the prefix for other units
	Jack  string // canonical jack name within the unit ("α", "6o", "o", "io")
	Class string
	M1    bool   // unit is in the M1 grammar (i, c, a1..a20, trunks)
	Err   string // non-empty if the terminal is malformed
}

// IsTrunk reports whether the terminal is a data or program trunk end.
func (t Terminal) IsTrunk() bool { return t.Kind == KindDataTrunk || t.Kind == KindProgTrunk }

// Plug is a `p from to` line.
type Plug struct {
	From, To Terminal
}

// Cable is "data" when a data trunk or data jack is involved, else
// "program" (architecture 5.9.3; drives the UX cable styles).
func (p Plug) Cable() string {
	for _, t := range []Terminal{p.From, p.To} {
		switch t.Class {
		case ClassDataIn, ClassDataOut, ClassDataTrunk:
			return "data"
		}
	}
	return "program"
}

// greek maps every accepted spelling of an accumulator input (accplug,
// accctl) to its canonical Greek letter.
var greek = map[string]string{
	"α": "α", "a": "α", "alpha": "α",
	"β": "β", "b": "β", "beta": "β",
	"γ": "γ", "g": "γ", "gamma": "γ",
	"δ": "δ", "d": "δ", "delta": "δ",
	"ε": "ε", "e": "ε", "epsilon": "ε",
}

// ParsePlug parses both ends of a `p` line.
func ParsePlug(from, to string) Plug {
	return Plug{From: ParseTerminal(from), To: ParseTerminal(to)}
}

// ParseTerminal parses one jack or trunk reference.
func ParseTerminal(s string) Terminal {
	t := Terminal{Raw: s, Canon: s, Class: ClassOther}
	if s == "" {
		t.Err = "empty terminal"
		return t
	}
	if c := s[0]; c >= '0' && c <= '9' {
		return parseTrunk(t)
	}
	unit, jack, ok := strings.Cut(s, ".")
	t.Kind = KindJack
	t.Unit = unit
	if !ok || jack == "" {
		if unit == "ad" || unit == "p" || unit == "m" || unit == "d" || unit == "pr" || (len(unit) > 0 && unit[0] == 'f') {
			return t // M2 units: not validated here
		}
		t.Err = "jack must be unit.terminal"
		return t
	}
	switch {
	case unit == "c":
		t.M1 = true
		return parseConstJack(t, jack)
	case unit == "i":
		t.M1 = true
		return parseInitJack(t, jack)
	case len(unit) >= 2 && unit[0] == 'a' && unit != "ad":
		n, err := strconv.Atoi(unit[1:])
		if err != nil || n < 1 || n > 20 {
			t.Err = "accumulator must be a1..a20"
			return t
		}
		t.M1 = true
		t.Unit = "a" + strconv.Itoa(n)
		return parseAccJack(t, jack)
	}
	// Function tables, multiplier, divider, master programmer, adapters,
	// printer: M2 grammar. Keep the text as is.
	return t
}

func parseTrunk(t Terminal) Terminal {
	t.M1 = true
	if a, b, ok := strings.Cut(t.Raw, "-"); ok {
		tray, e1 := strconv.Atoi(a)
		line, e2 := strconv.Atoi(b)
		t.Kind, t.Class = KindProgTrunk, ClassProgTrunk
		if e1 != nil || e2 != nil || tray < 1 || tray > 20 || line < 1 || line > 11 {
			t.Err = "program trunk must be T-L with T 1..20 and L 1..11"
			return t
		}
		t.Canon = strconv.Itoa(tray) + "-" + strconv.Itoa(line)
		return t
	}
	n, err := strconv.Atoi(t.Raw)
	t.Kind, t.Class = KindDataTrunk, ClassDataTrunk
	if err != nil || n < 1 || n > 20 {
		t.Err = "data trunk must be 1..20"
		return t
	}
	t.Canon = strconv.Itoa(n)
	return t
}

func parseAccJack(t Terminal, jack string) Terminal {
	if g, ok := greek[jack]; ok {
		t.Jack, t.Class = g, ClassDataIn
	} else if jack == "A" || jack == "S" {
		t.Jack, t.Class = jack, ClassDataOut
	} else if p, io, ok := progJack(jack); ok {
		switch {
		case io == 'i' && p >= 1 && p <= 12:
			t.Jack, t.Class = strconv.Itoa(p)+"i", ClassProgIn
		case io == 'o' && p >= 5 && p <= 12:
			t.Jack, t.Class = strconv.Itoa(p)+"o", ClassProgOut
		default:
			t.Err = "accumulator program jacks are 1i..12i and 5o..12o"
			return t
		}
	} else if len(jack) >= 2 && (jack[:2] == "st" || jack[:2] == "su" || jack[:2] == "il" || jack[:2] == "ir") || jack[0] == 'I' {
		// 20-digit interconnects (accinterconnect) and I* terminators: M2.
		t.M1 = false
		t.Jack = jack
		return t
	} else {
		t.Err = "accumulator jacks are α β γ δ ε A S, 1i..12i, 5o..12o"
		return t
	}
	t.Canon = t.Unit + "." + t.Jack
	return t
}

func parseConstJack(t Terminal, jack string) Terminal {
	if jack == "o" {
		t.Jack, t.Class = "o", ClassDataOut
	} else if p, io, ok := progJack(jack); ok && p >= 1 && p <= 30 {
		t.Jack = strconv.Itoa(p) + string(io)
		t.Class = map[byte]string{'i': ClassProgIn, 'o': ClassProgOut}[io]
	} else {
		t.Err = "constant transmitter jacks are o, 1i..30i, 1o..30o"
		return t
	}
	t.Canon = "c." + t.Jack
	return t
}

func parseInitJack(t Terminal, jack string) Terminal {
	// initplug: any jack starting with i/I is the initiating pulse output.
	switch {
	case jack == "io":
		t.Jack, t.Class = "io", ClassProgOut
	case len(jack) >= 3 && (jack[0] == 'c' || jack[0] == 'C') && (jack[1] == 'i' || jack[1] == 'o'):
		n, err := strconv.Atoi(jack[2:])
		if err != nil || n < 1 || n > 6 {
			t.Err = "initiating unit clear jacks are Ci1..Ci6 and Co1..Co6"
			return t
		}
		t.Jack = "C" + string(jack[1]) + strconv.Itoa(n)
		t.Class = map[byte]string{'i': ClassProgIn, 'o': ClassProgOut}[jack[1]]
	case jack == "pi" || jack == "ri" || jack == "rl":
		t.Jack, t.Class = jack, ClassProgIn
	case jack == "po" || jack == "ro":
		t.Jack, t.Class = jack, ClassProgOut
	default:
		t.Err = "initiating unit jacks are io, Ci1..6, Co1..6, pi, po, ri, rl, ro"
		return t
	}
	t.Canon = "i." + t.Jack
	return t
}

// progJack splits "12i" into (12, 'i').
func progJack(s string) (int, byte, bool) {
	if len(s) < 2 {
		return 0, 0, false
	}
	io := s[len(s)-1]
	if io != 'i' && io != 'o' {
		return 0, 0, false
	}
	n, err := strconv.Atoi(s[:len(s)-1])
	if err != nil || strconv.Itoa(n) != s[:len(s)-1] {
		return 0, 0, false
	}
	return n, io, true
}
