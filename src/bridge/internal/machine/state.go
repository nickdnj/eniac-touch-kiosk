package machine

import (
	"strconv"

	"eniac-kiosk/bridge/internal/status"
)

// State is the mirrored machine state. Its JSON form (Snapshot) is the
// MachineState of architecture 5.4: 1-based string keys, bit and digit
// vectors as strings, no arrays (merge-patch replaces arrays wholesale).
type State struct {
	CyclePos  int
	CycleMode string
	Init      string // 15 chars
	Acc       [20]Acc
	MP        MP
	FT        [3]FT
	CT        [30]byte
	Mult      Mult
	Div       Div

	// Cards punched in this session, in order (at most MaxCards; the
	// oldest are dropped), and the total count. Not part of the JSON
	// snapshot: the UI gets cards as punch messages. Read-only once copied.
	Cards   []Punch
	Punched int
}

// MaxCards bounds State.Cards (a session that runs away is ended long before).
const MaxCards = 5000

type Acc struct {
	Sign   byte     // 'P' or 'M'
	Digits [10]byte // '0'..'9', MSD first
	Carry  [10]byte // '0'/'1'
	Rep    int
	Prog   [12]byte // '0'/'1', program 1..12
}

type MP struct {
	Stage [10]byte // '0'..'9'
	Dec   [20]byte
	Inff  [10]byte // '0'..'9' or '*'
}

type FT struct {
	Arg   string
	Ring  int
	Add   int
	Sub   int
	Argff int
}

type Mult struct {
	Stage int
	FF    string // 24 bits
	R1    int
	R3    int
}

type Div struct {
	Place  int
	Prog   int
	ProgFF string // 8 bits
	Flags  string // 30 bits
}

// Initial returns the state that equals upstream engine.go's initial
// "last sent" values at the pinned commit (architecture 5.1), so that the
// diff stream applied to it reproduces the true state:
//
//	astat[i]  = "P 0000000000 0000000000 0 000000000000"
//	cyclast   = 0, cmlast = -1 (no mode yet), initlast = "000000000000000"
//	mp*stat   = 0
//	ftarg/ftring/ftadd/ftsub/ftsetup = "0"
//	conslast  = 30 x "0"
//	mullast   = "0 000000000000000000000000 0 0"
//	dsqlast   = "0 0 00000000 000000000000000000000000000000"
//
// A test pins these to build/upstream/src/engine.go.
func Initial() State {
	var s State
	s.Init = "000000000000000"
	for i := range s.Acc {
		a := &s.Acc[i]
		a.Sign = 'P'
		fill(a.Digits[:], '0')
		fill(a.Carry[:], '0')
		fill(a.Prog[:], '0')
	}
	fill(s.MP.Stage[:], '0')
	fill(s.MP.Dec[:], '0')
	fill(s.MP.Inff[:], '0')
	for i := range s.FT {
		s.FT[i] = FT{Arg: "0"}
	}
	fill(s.CT[:], '0')
	s.Mult = Mult{FF: "000000000000000000000000"}
	s.Div = Div{ProgFF: "00000000", Flags: "000000000000000000000000000000"}
	return s
}

func fill(b []byte, c byte) {
	for i := range b {
		b[i] = c
	}
}

// Apply applies one event. It reports whether the state changed and
// whether that change was to something other than the cycling unit.
func (s *State) Apply(ev status.Event) (changed, nonCycle bool) {
	set := func(p *byte, v byte) {
		if *p != v {
			*p = v
			changed = true
		}
	}
	setInt := func(p *int, v int) {
		if *p != v {
			*p = v
			changed = true
		}
	}
	setStr := func(p *string, v string) {
		if *p != v {
			*p = v
			changed = true
		}
	}
	switch ev.Kind {
	case status.Cycle:
		setInt(&s.CyclePos, ev.Value)
		return changed, false
	case status.CycleMode:
		setStr(&s.CycleMode, ev.Str)
		return changed, false
	case status.AccSign:
		set(&s.Acc[ev.Unit-1].Sign, ev.Str[0])
	case status.AccDigit:
		set(&s.Acc[ev.Unit-1].Digits[ev.Index-1], byte('0'+ev.Value))
	case status.AccCarry:
		set(&s.Acc[ev.Unit-1].Carry[ev.Index-1], byte('0'+ev.Value))
	case status.AccRep:
		setInt(&s.Acc[ev.Unit-1].Rep, ev.Value)
	case status.AccProg:
		set(&s.Acc[ev.Unit-1].Prog[ev.Index], byte('0'+ev.Value))
	case status.Init:
		setStr(&s.Init, ev.Str)
	case status.MPStage:
		set(&s.MP.Stage[ev.Index], byte('0'+ev.Value))
	case status.MPDec:
		set(&s.MP.Dec[ev.Index], byte('0'+ev.Value))
	case status.MPInff:
		set(&s.MP.Inff[ev.Index], ev.Str[0])
	case status.FTArg:
		setStr(&s.FT[ev.Unit-1].Arg, ev.Str)
	case status.FTRing:
		setInt(&s.FT[ev.Unit-1].Ring, ev.Value)
	case status.FTAdd:
		setInt(&s.FT[ev.Unit-1].Add, ev.Value)
	case status.FTSub:
		setInt(&s.FT[ev.Unit-1].Sub, ev.Value)
	case status.FTArgff:
		setInt(&s.FT[ev.Unit-1].Argff, ev.Value)
	case status.Const:
		set(&s.CT[ev.Index], byte('0'+ev.Value))
	case status.Mult:
		setInt(&s.Mult.Stage, ev.Value)
		setStr(&s.Mult.FF, ev.MultFF)
		setInt(&s.Mult.R1, ev.R1)
		setInt(&s.Mult.R3, ev.R3)
	case status.Div:
		setInt(&s.Div.Place, ev.Value)
		setInt(&s.Div.Prog, ev.DivProg)
		setStr(&s.Div.ProgFF, ev.DivFF)
		setStr(&s.Div.Flags, ev.Flags)
	}
	return changed, changed
}

// Value decodes an accumulator: int(digits) for P, int(digits) - 10^10 for
// M (ten's complement). UX F2(b): the helper readout and the tape use this.
func (a *Acc) Value() int64 {
	var v int64
	for _, d := range a.Digits {
		v = v*10 + int64(d-'0')
	}
	if a.Sign == 'M' {
		v -= 10_000_000_000
	}
	return v
}

// ProgIdle reports whether no program flip-flop is set on any accumulator.
func (s *State) ProgIdle() bool {
	for i := range s.Acc {
		for _, b := range s.Acc[i].Prog {
			if b != '0' {
				return false
			}
		}
	}
	return true
}

// GatesIdle reports whether init gate66 and gate69 are both 0 and the card
// reader and printer flip-flops (init bits 6 and 7) are clear: a READ or a
// punch in progress is not idle (M2: the reader and punch are paced in
// wall-clock time and can be quiet for longer than the quiet period).
func (s *State) GatesIdle() bool {
	return len(s.Init) == 15 && s.Init[13] == '0' && s.Init[14] == '0' && s.Init[6] == '0' && s.Init[7] == '0'
}

// Snapshot returns the JSON form (architecture 5.4) as nested maps.
func (s *State) Snapshot() map[string]any {
	acc := make(map[string]any, 20)
	for i := range s.Acc {
		a := &s.Acc[i]
		acc[strconv.Itoa(i+1)] = map[string]any{
			"sign":   string(a.Sign),
			"digits": string(a.Digits[:]),
			"value":  a.Value(),
			"carry":  string(a.Carry[:]),
			"rep":    int64(a.Rep),
			"prog":   string(a.Prog[:]),
		}
	}
	ft := make(map[string]any, 3)
	for i := range s.FT {
		f := &s.FT[i]
		ft[strconv.Itoa(i+1)] = map[string]any{
			"arg": f.Arg, "ring": int64(f.Ring), "add": int64(f.Add), "sub": int64(f.Sub), "argff": int64(f.Argff),
		}
	}
	return map[string]any{
		"cycle": map[string]any{"pos": int64(s.CyclePos), "mode": s.CycleMode},
		"init":  s.Init,
		"acc":   acc,
		"mp": map[string]any{
			"stage": string(s.MP.Stage[:]), "dec": string(s.MP.Dec[:]), "inff": string(s.MP.Inff[:]),
		},
		"ft":   ft,
		"ct":   string(s.CT[:]),
		"mult": map[string]any{"stage": int64(s.Mult.Stage), "ff": s.Mult.FF, "r1": int64(s.Mult.R1), "r3": int64(s.Mult.R3)},
		"div": map[string]any{
			"place": int64(s.Div.Place), "prog": int64(s.Div.Prog), "progff": s.Div.ProgFF, "flags": s.Div.Flags,
		},
	}
}
