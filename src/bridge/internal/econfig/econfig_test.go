package econfig

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"eniac-kiosk/bridge/internal/testenv"
)

func upstreamProgram(t *testing.T, name string) []Line {
	root, _ := testenv.RepoRoot()
	f, err := os.Open(filepath.Join(root, "build", "upstream", "programs", name))
	if err != nil {
		t.Skip("build/upstream missing; run make upstream")
	}
	defer f.Close()
	lines, err := Parse(f)
	if err != nil {
		t.Fatal(err)
	}
	return lines
}

// All 25 command lines of sq.e parse and classify: 13 p, 12 s (UX 8.1.2).
func TestSqE(t *testing.T) {
	lines := upstreamProgram(t, "sq.e")
	if len(lines) != 25 {
		t.Fatalf("%d command lines", len(lines))
	}
	p, s := Summary(lines)
	if p != 13 || s != 12 {
		t.Fatalf("%d plugs, %d switches", p, s)
	}
	if errs := Validate(lines); len(errs) > 0 {
		t.Fatalf("sq.e invalid: %v", errs)
	}
	// Finding for #9: sq.e at the pin spells the inputs in Greek.
	greekLines := 0
	for _, l := range lines {
		if strings.ContainsAny(l.Text, "αβ") {
			greekLines++
		}
		if strings.Contains(l.Text, "alpha") || strings.Contains(l.Text, "beta") {
			t.Errorf("sq.e uses an ASCII spelling: %q", l.Text)
		}
	}
	if greekLines != 6 {
		t.Errorf("expected 6 lines with Greek letters, got %d", greekLines)
	}
	want := map[string]bool{"s c.j1 1": true, "p c.o 1": true, "p 1 a1.α": true, "p a1.A a2.β": true,
		"s a1.rp6 2": true, "p i.io 1-1": true, "p a2.6o 1-3": true}
	for _, l := range lines {
		delete(want, l.Canon)
	}
	if len(want) != 0 {
		t.Errorf("step lines not found in sq.e: %v", want)
	}
}

func TestGreekASCIICanonical(t *testing.T) {
	for a, b := range map[string]string{
		"p 1 a1.alpha":     "p 1 a1.α",
		"p 1 a1.a":         "p 1 a1.α",
		"p a1.A a2.beta":   "p a1.A a2.β",
		"s a1.op5 alpha":   "s a1.op5 α",
		"s a2.op6 b":       "s a2.op6 β",
		"s a3.op1 epsilon": "s a3.op1 ε",
		"p  1   a01.α  # c": "p 1 a1.α",
		"s c.s26 jlr":      "s c.s26 Jlr",
	} {
		if Canonicalize(a) != Canonicalize(b) || Canonicalize(b) == "" {
			t.Errorf("%q -> %q, %q -> %q", a, Canonicalize(a), b, Canonicalize(b))
		}
	}
	l, _ := ParseLine("p 1 a1.alpha   # comment")
	if l.Text != "p 1 a1.alpha" {
		t.Errorf("Text must keep the original spelling: %q", l.Text)
	}
}

func TestTokenizer(t *testing.T) {
	src := "# header\n\n  p c.o 1   # trailing\nl drag.e\nf r demo.card\ns cy.op 1a\np 1-3 a1.5i#notacomment\nb i\n"
	lines, _ := Parse(strings.NewReader(src))
	if len(lines) != 6 {
		t.Fatalf("%d lines: %+v", len(lines), lines)
	}
	if lines[0].Num != 3 || lines[0].Text != "p c.o 1" || lines[0].Cmd != "p" {
		t.Errorf("%+v", lines[0])
	}
	if inc := Includes(lines); len(inc) != 1 || inc[0] != "drag.e" {
		t.Errorf("includes %v", inc)
	}
	if lines[2].Cmd != "f" || lines[2].Args[1] != "demo.card" {
		t.Errorf("%+v", lines[2])
	}
	// Like proccmd, '#' only starts a comment at the start of a field.
	if lines[4].Text != "p 1-3 a1.5i#notacomment" {
		t.Errorf("%q", lines[4].Text)
	}
}

func TestTerminals(t *testing.T) {
	cases := []struct {
		in, canon, kind, class string
	}{
		{"1", "1", KindDataTrunk, ClassDataTrunk},
		{"20", "20", KindDataTrunk, ClassDataTrunk},
		{"1-3", "1-3", KindProgTrunk, ClassProgTrunk},
		{"2-11", "2-11", KindProgTrunk, ClassProgTrunk},
		{"c.o", "c.o", KindJack, ClassDataOut},
		{"c.26i", "c.26i", KindJack, ClassProgIn},
		{"c.25o", "c.25o", KindJack, ClassProgOut},
		{"i.io", "i.io", KindJack, ClassProgOut},
		{"i.Ci3", "i.Ci3", KindJack, ClassProgIn},
		{"a1.α", "a1.α", KindJack, ClassDataIn},
		{"a1.alpha", "a1.α", KindJack, ClassDataIn},
		{"a20.ε", "a20.ε", KindJack, ClassDataIn},
		{"a2.A", "a2.A", KindJack, ClassDataOut},
		{"a2.S", "a2.S", KindJack, ClassDataOut},
		{"a2.6o", "a2.6o", KindJack, ClassProgOut},
		{"a2.1i", "a2.1i", KindJack, ClassProgIn},
		{"a2.12i", "a2.12i", KindJack, ClassProgIn},
	}
	for _, c := range cases {
		tm := ParseTerminal(c.in)
		if tm.Err != "" || !tm.M1 || tm.Canon != c.canon || tm.Kind != c.kind || tm.Class != c.class {
			t.Errorf("%s: %+v", c.in, tm)
		}
	}
	for _, bad := range []string{"0", "21", "1-0", "1-12", "0-1", "c.x", "c.31i", "i.zz", "i.Ci7", "a0.α", "a21.α", "a1.zz", "a1.4o", "a1.13i", "a1.05i", "", "a1."} {
		if tm := ParseTerminal(bad); tm.Err == "" {
			t.Errorf("%q accepted: %+v", bad, tm)
		}
	}
	for _, m2 := range []string{"f1.arg", "m.A", "p.Ai", "ad.s.1.1", "a1.st"} {
		if tm := ParseTerminal(m2); tm.M1 || tm.Err != "" {
			t.Errorf("%q should be a valid non-M1 terminal: %+v", m2, tm)
		}
	}
	if (Plug{From: ParseTerminal("i.io"), To: ParseTerminal("1-1")}).Cable() != "program" {
		t.Error("i.io -> 1-1 should be a program cable")
	}
	if (Plug{From: ParseTerminal("a1.A"), To: ParseTerminal("a2.β")}).Cable() != "data" {
		t.Error("a1.A -> a2.β should be a data cable")
	}
	if (Plug{From: ParseTerminal("a2.6o"), To: ParseTerminal("1-3")}).Cable() != "program" {
		t.Error("a2.6o -> 1-3 should be a program cable")
	}
}

func TestCatalogFamilies(t *testing.T) {
	valid := map[string][]string{
		"a1.op5":  {"α", "alpha", "a", "β", "beta", "γ", "δ", "ε", "A", "S", "AS", "0"},
		"a1.rp6":  {"1", "2", "9"},
		"a1.cc1":  {"0", "C", "c"},
		"c.j1":    {"0", "1", "9"},
		"c.k10":   {"5"},
		"c.jl":    {"P", "M", "p"},
		"c.s26":   {"Jlr", "Jl", "Jr", "Klr", "jlr"},
		"c.s1":    {"Al", "Br", "Alr"},
		"c.s13":   {"Elr", "Fl"},
		"cy.op":   {"1p", "1a", "co", "cy", "CO"},
		"cy.rate": {"0", "100", "5000"},
	}
	for name, vals := range valid {
		for _, v := range vals {
			if s := ParseSwitch(name, v); s.Err != "" || s.Family == "" {
				t.Errorf("s %s %s rejected: %s", name, v, s.Err)
			}
		}
	}
	invalid := map[string][]string{
		"a1.op5":  {"Z", "ALPHA", "1"},
		"a1.rp6":  {"0", "10", "x"},
		"a1.rp4":  {"1"},
		"a1.op13": {"α"},
		"a1.cc1":  {"1"},
		"a1.sf":   {"10"},
		"c.j1":    {"10", "x"},
		"c.j11":   {"1"},
		"c.jl":    {"X"},
		"c.s26":   {"Alr", "J", "Jx"},
		"c.s31":   {"Jlr"},
		"cy.op":   {"fast"},
		"cy.rate": {"-1", "x"},
		"cy.zz":   {"1"},
		"m.ieracc1": {"a"},
	}
	for name, vals := range invalid {
		for _, v := range vals {
			if s := ParseSwitch(name, v); s.Err == "" {
				t.Errorf("s %s %s accepted as %+v", name, v, s)
			}
		}
	}
	if got := Catalog(ParseSwitch("c.j1", "1")); len(got) != 10 {
		t.Errorf("c.j1 catalog %v", got)
	}
	if got := Catalog(ParseSwitch("a1.rp6", "2")); len(got) != 9 || got[0] != "1" {
		t.Errorf("rp catalog %v", got)
	}
	if got := Catalog(ParseSwitch("c.s26", "Jlr")); strings.Join(got, " ") != "Jl Jr Jlr Kl Kr Klr" {
		t.Errorf("s26 catalog %v", got)
	}
	if c, ok := InCatalog(ParseSwitch("a1.op5", "α"), "alpha"); !ok || c != "α" {
		t.Error("InCatalog alias")
	}
}

// Every upstream program parses without panicking; includes are found.
func TestParseAllUpstreamPrograms(t *testing.T) {
	root, _ := testenv.RepoRoot()
	files, _ := filepath.Glob(filepath.Join(root, "build", "upstream", "programs", "*.e"))
	if len(files) == 0 {
		t.Skip("build/upstream missing")
	}
	for _, f := range files {
		fh, _ := os.Open(f)
		if _, err := Parse(fh); err != nil {
			t.Errorf("%s: %v", f, err)
		}
		fh.Close()
	}
	traj := upstreamProgram(t, "trajdemo.e")
	if inc := Includes(traj); len(inc) != 1 || inc[0] != "drag.e" {
		t.Errorf("trajdemo includes %v", inc)
	}
}
