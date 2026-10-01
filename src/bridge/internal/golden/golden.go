// Package golden reads recorded real-core runs (tests/golden) and parses the
// core's `D` dump so a replayed MachineState can be compared with it
// (architecture 11.3, test plan 3.2).
package golden

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"eniac-kiosk/bridge/internal/machine"
)

// Meta describes how a golden was recorded.
type Meta struct {
	Name       string   `json:"name"`
	Program    string   `json:"program"`
	Rate       int      `json:"rate"`
	Inits      int      `json:"inits"`
	Seconds    float64  `json:"seconds,omitempty"`
	Patched    bool     `json:"patched"`
	Upstream   string   `json:"upstream"`
	Commands   []string `json:"commands"`
	RecordedAt string   `json:"recordedAt"`
	Settled    bool     `json:"settled"` // the dump was taken with the machine idle or frozen, so it is comparable
}

// Golden is one recording.
type Golden struct {
	Meta   Meta
	Status []string // raw status lines as relayed by vlink
	Dump   []string // the core's `D` output at the end of the run
	Punch  string   // the session punch file
}

// Load reads <dir>/<name>.{meta.json,status,dump,punch}.
func Load(dir, name string) (*Golden, error) {
	g := &Golden{}
	b, err := os.ReadFile(filepath.Join(dir, name+".meta.json"))
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(b, &g.Meta); err != nil {
		return nil, err
	}
	if g.Status, err = readLines(filepath.Join(dir, name+".status")); err != nil {
		return nil, err
	}
	if g.Dump, err = readLines(filepath.Join(dir, name+".dump")); err != nil {
		return nil, err
	}
	p, err := os.ReadFile(filepath.Join(dir, name+".punch"))
	if err != nil && !os.IsNotExist(err) {
		return nil, err
	}
	g.Punch = string(p)
	return g, nil
}

func readLines(p string) ([]string, error) {
	f, err := os.Open(p)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	var out []string
	sc := bufio.NewScanner(f)
	sc.Buffer(make([]byte, 1<<20), 1<<20)
	for sc.Scan() {
		out = append(out, sc.Text())
	}
	return out, sc.Err()
}

// Dump is the parsed output of the core's `D` command.
type Dump struct {
	Init  string
	MP    machine.MP
	Acc   [20]machine.Acc
	Mult  machine.Mult
	FT    [3]machine.FT
	Const string // 30 bits
}

// ParseDump parses the 18 lines of `D`: initstat, mpstat, 10 lines of two
// accstats, divsrstat2 (skipped: a different format from the status
// stream), multstat, 3 x ftstat, consstat.
func ParseDump(lines []string) (*Dump, error) {
	if len(lines) != 18 {
		return nil, fmt.Errorf("dump: want 18 lines, got %d", len(lines))
	}
	d := &Dump{Init: strings.TrimSpace(lines[0])}
	mp := strings.Fields(lines[1])
	if len(mp) != 3 || len(mp[0]) != 10 || len(mp[1]) != 20 || len(mp[2]) != 10 {
		return nil, fmt.Errorf("dump: bad mpstat %q", lines[1])
	}
	copy(d.MP.Stage[:], mp[0])
	copy(d.MP.Dec[:], mp[1])
	copy(d.MP.Inff[:], mp[2])
	for i := 0; i < 10; i++ {
		f := strings.Fields(lines[2+i])
		if len(f) != 10 {
			return nil, fmt.Errorf("dump: bad acc line %q", lines[2+i])
		}
		for j := 0; j < 2; j++ {
			a, err := parseAcc(f[5*j : 5*j+5])
			if err != nil {
				return nil, err
			}
			d.Acc[2*i+j] = a
		}
	}
	m := strings.Fields(lines[13])
	if len(m) != 4 {
		return nil, fmt.Errorf("dump: bad multstat %q", lines[13])
	}
	d.Mult.Stage, _ = strconv.Atoi(m[0])
	d.Mult.FF = m[1]
	d.Mult.R1, _ = strconv.Atoi(m[2])
	d.Mult.R3, _ = strconv.Atoi(m[3])
	for i := 0; i < 3; i++ {
		f := strings.Fields(lines[14+i])
		if len(f) != 6 {
			return nil, fmt.Errorf("dump: bad ftstat %q", lines[14+i])
		}
		var ft machine.FT
		ft.Arg = f[1]
		ft.Ring, _ = strconv.Atoi(f[2])
		ft.Add, _ = strconv.Atoi(f[3])
		ft.Sub, _ = strconv.Atoi(f[4])
		ft.Argff, _ = strconv.Atoi(f[5])
		d.FT[i] = ft
	}
	d.Const = strings.TrimSpace(lines[17])
	return d, nil
}

func parseAcc(f []string) (machine.Acc, error) {
	var a machine.Acc
	if len(f[0]) != 1 || len(f[1]) != 10 || len(f[2]) != 10 || len(f[4]) != 12 {
		return a, fmt.Errorf("dump: bad accstat %q", f)
	}
	a.Sign = f[0][0]
	copy(a.Digits[:], f[1])
	copy(a.Carry[:], f[2])
	a.Rep, _ = strconv.Atoi(f[3])
	copy(a.Prog[:], f[4])
	return a, nil
}

// Compare lists every difference between a mirrored state and a dump,
// ignoring the cycling unit (which changes on every tick) and the divider
// (the dump uses a different format).
func Compare(s machine.State, d *Dump) []string {
	var diffs []string
	add := func(format string, a ...any) { diffs = append(diffs, fmt.Sprintf(format, a...)) }
	if s.Init != d.Init {
		add("init: mirror %s dump %s", s.Init, d.Init)
	}
	if s.MP != d.MP {
		add("mp: mirror %+v dump %+v", s.MP, d.MP)
	}
	for i := range s.Acc {
		if s.Acc[i] != d.Acc[i] {
			a, b := s.Acc[i], d.Acc[i]
			add("acc %d: mirror %c %s %s %d %s, dump %c %s %s %d %s", i+1,
				a.Sign, a.Digits[:], a.Carry[:], a.Rep, a.Prog[:], b.Sign, b.Digits[:], b.Carry[:], b.Rep, b.Prog[:])
		}
	}
	if s.Mult != d.Mult {
		add("mult: mirror %+v dump %+v", s.Mult, d.Mult)
	}
	for i := range s.FT {
		if s.FT[i] != d.FT[i] {
			add("ft %d: mirror %+v dump %+v", i+1, s.FT[i], d.FT[i])
		}
	}
	if string(s.CT[:]) != d.Const {
		add("ct: mirror %s dump %s", s.CT[:], d.Const)
	}
	return diffs
}
