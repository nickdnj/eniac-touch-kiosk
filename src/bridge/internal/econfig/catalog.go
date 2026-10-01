package econfig

import (
	"strconv"
	"strings"
)

// Switch families in the M1 catalog (architecture 5.9.5 rule 5). Values
// come from upstream's accctl, consctl and cyclectl at the pinned commit.
const (
	FamAccOp      = "acc.op"      // a<N>.op<P>, P 1..12
	FamAccRp      = "acc.rp"      // a<N>.rp<P>, P 5..12
	FamAccCc      = "acc.cc"      // a<N>.cc<P>, P 1..12
	FamConstDigit = "const.digit" // c.j<D>, c.k<D>, D 1..10
	FamConstSign  = "const.sign"  // c.jl, c.jr, c.kl, c.kr
	FamConstSel   = "const.sel"   // c.s<P>, P 1..30
	FamCycleOp    = "cy.op"
	FamCycleRate  = "cy.rate"
)

// Switch is an `s name value` line.
type Switch struct {
	Name   string // as written, e.g. "a1.rp6"
	Unit   string // "a1", "c", "cy", ...
	Family string // "" if not in the M1 catalog
	Value  string // as written
	Canon  string // canonical value (e.g. "α" for "alpha")
	Err    string
}

// accOpValues is accctl's "op" table in canonical form.
var accOpValues = []string{"α", "β", "γ", "δ", "ε", "0", "A", "AS", "S"}

var digits09 = []string{"0", "1", "2", "3", "4", "5", "6", "7", "8", "9"}
var digits19 = []string{"1", "2", "3", "4", "5", "6", "7", "8", "9"}

// constSelLetters: the constant transmitter's programs come in five groups
// of six; each group selects between two sources (card fields A/B, C/D, E/F,
// G/H, or the J/K constants). consctl maps a,c,e,g,j to the first and
// b,d,f,h,k to the second.
var constSelLetters = [5][2]string{{"A", "B"}, {"C", "D"}, {"E", "F"}, {"G", "H"}, {"J", "K"}}

// ParseSwitch classifies and canonicalizes an `s` line.
func ParseSwitch(name, value string) Switch {
	s := Switch{Name: name, Value: value, Canon: value}
	unit, sw, ok := strings.Cut(name, ".")
	s.Unit = unit
	if !ok || sw == "" {
		s.Err = "switch must be unit.switch: " + name
		return s
	}
	switch {
	case unit == "cy":
		return cycleSwitch(s, sw)
	case unit == "c":
		return constSwitch(s, sw)
	case len(unit) >= 2 && unit[0] == 'a' && unit != "ad":
		n, err := strconv.Atoi(unit[1:])
		if err != nil || n < 1 || n > 20 {
			s.Err = "accumulator must be a1..a20: " + name
			return s
		}
		s.Unit = "a" + strconv.Itoa(n)
		s.Name = s.Unit + "." + sw
		return accSwitch(s, sw)
	}
	s.Err = "switch " + name + " is not in the M1 catalog"
	return s
}

func progNum(sw, prefix string, lo, hi int) (int, bool) {
	if !strings.HasPrefix(sw, prefix) {
		return 0, false
	}
	n, err := strconv.Atoi(sw[len(prefix):])
	if err != nil || n < lo || n > hi || strconv.Itoa(n) != sw[len(prefix):] {
		return 0, false
	}
	return n, true
}

func accSwitch(s Switch, sw string) Switch {
	switch {
	case strings.HasPrefix(sw, "op"):
		if _, ok := progNum(sw, "op", 1, 12); !ok {
			s.Err = "accumulator op switches are op1..op12: " + s.Name
			return s
		}
		s.Family = FamAccOp
		if g, ok := greek[s.Value]; ok {
			s.Canon = g
		} else if !contains(accOpValues, s.Value) {
			s.Err = "op value " + s.Value + " not one of α β γ δ ε A S AS 0"
		}
	case strings.HasPrefix(sw, "rp"):
		if _, ok := progNum(sw, "rp", 5, 12); !ok {
			s.Err = "accumulator repeat switches are rp5..rp12: " + s.Name
			return s
		}
		s.Family = FamAccRp
		if !contains(digits19, s.Value) {
			s.Err = "repeat value " + s.Value + " not 1..9"
		}
	case strings.HasPrefix(sw, "cc"):
		if _, ok := progNum(sw, "cc", 1, 12); !ok {
			s.Err = "accumulator clear switches are cc1..cc12: " + s.Name
			return s
		}
		s.Family = FamAccCc
		switch s.Value {
		case "0", "C":
		case "c":
			s.Canon = "C"
		default:
			s.Err = "clear value " + s.Value + " not 0 or C"
		}
	default:
		s.Err = "accumulator switch " + s.Name + " is not in the M1 catalog (op, rp, cc)"
	}
	return s
}

func constSwitch(s Switch, sw string) Switch {
	switch {
	case sw == "jl" || sw == "jr" || sw == "kl" || sw == "kr":
		s.Family = FamConstSign
		switch s.Value {
		case "P", "M":
		case "p", "m":
			s.Canon = strings.ToUpper(s.Value)
		default:
			s.Err = "constant sign value " + s.Value + " not P or M"
		}
	case len(sw) >= 2 && (sw[0] == 'j' || sw[0] == 'k'):
		if _, ok := progNum(sw, sw[:1], 1, 10); !ok {
			s.Err = "constant digit switches are j1..j10, k1..k10: " + s.Name
			return s
		}
		s.Family = FamConstDigit
		if !contains(digits09, s.Value) {
			s.Err = "constant digit value " + s.Value + " not 0..9"
		}
	case strings.HasPrefix(sw, "s"):
		p, ok := progNum(sw, "s", 1, 30)
		if !ok {
			s.Err = "constant selector switches are s1..s30: " + s.Name
			return s
		}
		s.Family = FamConstSel
		c, ok := constSelCanon(p, s.Value)
		if !ok {
			s.Err = "selector value " + s.Value + " not valid for program " + strconv.Itoa(p) + " (" + strings.Join(ConstSelValues(p), " ") + ")"
			return s
		}
		s.Canon = c
	default:
		s.Err = "constant switch " + s.Name + " is not in the M1 catalog"
	}
	return s
}

func constSelCanon(prog int, v string) (string, bool) {
	if len(v) < 2 {
		return "", false
	}
	letter := strings.ToUpper(v[:1])
	half := v[1:]
	if half != "l" && half != "r" && half != "lr" {
		return "", false
	}
	g := constSelLetters[(prog-1)/6]
	if letter != g[0] && letter != g[1] {
		return "", false
	}
	return letter + half, true
}

// ConstSelValues lists the valid selector values for a constant program.
func ConstSelValues(prog int) []string {
	g := constSelLetters[(prog-1)/6]
	var out []string
	for _, l := range g {
		for _, h := range []string{"l", "r", "lr"} {
			out = append(out, l+h)
		}
	}
	return out
}

func cycleSwitch(s Switch, sw string) Switch {
	switch sw {
	case "op":
		s.Family = FamCycleOp
		switch strings.ToLower(s.Value) {
		case "1p", "1a", "co", "cy":
			s.Canon = strings.ToLower(s.Value)
		default:
			s.Err = "cycle op value " + s.Value + " not 1p, 1a, co or cy"
		}
	case "rate":
		s.Family = FamCycleRate
		n, err := strconv.Atoi(s.Value)
		if err != nil || n < 0 {
			s.Err = "cycle rate " + s.Value + " not a non-negative integer"
		}
	default:
		s.Err = "cycling switch " + s.Name + " is not op or rate"
	}
	return s
}

// Catalog returns the finite list of canonical values for a switch, or nil
// for open-ended families (cy.rate).
func Catalog(sw Switch) []string {
	switch sw.Family {
	case FamAccOp:
		return append([]string(nil), accOpValues...)
	case FamAccRp:
		return append([]string(nil), digits19...)
	case FamAccCc:
		return []string{"0", "C"}
	case FamConstDigit:
		return append([]string(nil), digits09...)
	case FamConstSign:
		return []string{"P", "M"}
	case FamConstSel:
		p, _ := strconv.Atoi(strings.TrimPrefix(strings.SplitN(sw.Name, ".", 2)[1], "s"))
		return ConstSelValues(p)
	case FamCycleOp:
		return []string{"1p", "1a", "co", "cy"}
	}
	return nil
}

// InCatalog reports whether a (possibly aliased) value is valid for sw's family.
func InCatalog(sw Switch, value string) (canon string, ok bool) {
	t := ParseSwitch(sw.Name, value)
	if t.Err != "" {
		return "", false
	}
	return t.Canon, true
}

func contains(list []string, v string) bool {
	for _, x := range list {
		if x == v {
			return true
		}
	}
	return false
}
