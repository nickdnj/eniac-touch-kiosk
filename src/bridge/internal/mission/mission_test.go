package mission

import (
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"eniac-kiosk/bridge/internal/econfig"
	"eniac-kiosk/bridge/internal/testenv"
)

func paths(t *testing.T) (missions, upstream string) {
	root, ok := testenv.RepoRoot()
	if !ok {
		t.Fatal("no repo root")
	}
	upstream = filepath.Join(root, "build", "upstream")
	if _, err := os.Stat(filepath.Join(upstream, "programs", "sq.e")); err != nil {
		t.Skip("build/upstream missing; run make upstream")
	}
	return filepath.Join(root, "missions"), upstream
}

func loadSquares(t *testing.T) *Mission {
	dir, up := paths(t)
	m := Load(filepath.Join(dir, "squares.yaml"), up)
	if !m.Available {
		t.Fatalf("squares unavailable: %v", m.Errors)
	}
	return m
}

func TestSquaresValid(t *testing.T) {
	m := loadSquares(t)
	c := m.Compiled()
	if c.Counts != (Counts{PresetCables: 8, PresetSwitches: 10, StepCables: 5, StepSwitches: 2}) {
		t.Fatalf("counts %+v", c.Counts)
	}
	want := []string{"j1-one", "const-to-trunk1", "trunk1-to-a1", "a1-to-a2", "a1-twice", "init-to-1-1", "a2-6o-to-1-3"}
	if strings.Join(m.StepIDs(), ",") != strings.Join(want, ",") {
		t.Fatalf("steps %v", m.StepIDs())
	}
	if strings.Join(c.Units, ",") != "i,c,a1,a2,trunks" {
		t.Fatalf("units %v", c.Units)
	}
	if len(c.Config) != 25 {
		t.Fatalf("config has %d items", len(c.Config))
	}
	owners := map[string]int{}
	for _, it := range c.Config {
		owners[strings.SplitN(it.Owner, ":", 2)[0]]++
	}
	if owners["preset"] != 18 || owners["step"] != 7 {
		t.Fatalf("owners %v", owners)
	}
	s := c.Steps[0]
	if s.Kind != "switch" || s.Switch != "c.j1" || s.Value != "1" || s.Family != econfig.FamConstDigit || len(s.Choices) != 10 {
		t.Fatalf("step 1 %+v", s)
	}
	s = c.Steps[2]
	if s.Kind != "plug" || s.From != "1" || s.To != "a1.α" || s.FromClass != "data-trunk" || s.ToClass != "data-in" || s.Cable != "data" {
		t.Fatalf("step 3 %+v", s)
	}
	s = c.Steps[5]
	if s.From != "i.io" || s.To != "1-1" || s.Cable != "program" || s.FromClass != "program-out" {
		t.Fatalf("step 6 %+v", s)
	}
	if strings.Join(c.Run.Speeds, ",") != "slow,full" || c.Run.DefaultSpeed != "slow" || c.Result != "answer" {
		t.Fatalf("run %+v", c.Run)
	}
	if txt, _ := m.StepText("trunk1-to-a1"); txt != "p 1 a1.α" {
		t.Fatalf("step text %q", txt)
	}
	if ids := m.StepIDsFileOrder(); strings.Join(ids, ",") != "const-to-trunk1,trunk1-to-a1,a1-to-a2,init-to-1-1,a2-6o-to-1-3,a1-twice,j1-one" {
		t.Fatalf("file order %v", ids)
	}
	b, _ := json.Marshal(c)
	if strings.Contains(string(b), "[FC") || strings.Contains(string(b), "factCheck") {
		t.Fatal("review metadata leaked into the compiled mission")
	}
}

func TestPresetFile(t *testing.T) {
	m := loadSquares(t)
	dir := t.TempDir()
	p, err := m.WritePreset(dir)
	if err != nil {
		t.Fatal(err)
	}
	b, _ := os.ReadFile(p)
	lines, _ := econfig.Parse(strings.NewReader(string(b)))
	if len(lines) != 18 {
		t.Fatalf("preset has %d command lines, want 18", len(lines))
	}
	for _, id := range m.StepIDs() {
		txt, _ := m.StepText(id)
		for _, l := range lines {
			if l.Canon == econfig.Canonicalize(txt) {
				t.Errorf("preset still contains step %s", id)
			}
		}
	}
	if !strings.Contains(string(b), "# (step) p c.o 1") {
		t.Error("step lines should be kept as comments")
	}
	if n := strings.Count(string(b), "\n"); n != 26 {
		t.Errorf("line count changed: %d newlines", n)
	}
}

// writeVariant copies squares.yaml with an edit and loads it.
func variant(t *testing.T, edit func(string) string) *Mission {
	dir, up := paths(t)
	b, _ := os.ReadFile(filepath.Join(dir, "squares.yaml"))
	p := filepath.Join(t.TempDir(), "squares.yaml")
	os.WriteFile(p, []byte(edit(string(b))), 0o644)
	return Load(p, up)
}

func expectUnavailable(t *testing.T, m *Mission, substr string) {
	t.Helper()
	if m.Available {
		t.Fatalf("mission should be unavailable (%s)", substr)
	}
	for _, e := range m.Errors {
		if strings.Contains(e, substr) {
			return
		}
	}
	t.Fatalf("no error containing %q in %v", substr, m.Errors)
}

func TestNegative(t *testing.T) {
	cases := []struct {
		name, from, to, want string
	}{
		{"missing line", `line: "s c.j1 1"`, `line: "s c.j1 7"`, "not found in the program"},
		{"duplicate step line", `line: "p c.o 1"`, `line: "s c.j1 1"`, "is already step"},
		{"not a p/s line", `line: "p c.o 1"`, `line: "b i"`, "not found"},
		{"choices lack value", `choices: ["1", "2", "3", "4", "5", "6", "7", "8", "9"]`, `choices: ["1", "3"]`, "do not contain the value"},
		{"choice outside catalog", `choices: ["1", "2", "3", "4", "5", "6", "7", "8", "9"]`, `choices: ["2", "10"]`, "not a valid acc.rp value"},
		{"expect disagrees", `expect: { from: c.o, to: "1" }`, `expect: { from: c.o, to: "2" }`, "disagrees"},
		{"bad default speed", `defaultSpeed: slow`, `defaultSpeed: warp`, "defaultSpeed"},
		{"body too long", `body: "This is the Constant Transmitter.`, `body: "` + strings.Repeat("word ", 40) + `This is the Constant Transmitter.`, "words (max 40)"},
		{"FC in text", `headline: "Dial in the number 1"`, `headline: "Dial in the number 1 [FC]"`, "[FC]"},
		{"bad checkpoint", `when: { acc: "1", eq: 12 }`, `when: { acc: "31", eq: 12 }`, "checkpoint answer"},
		{"sha drift", `programSha256: "462e`, `programSha256: "562e`, "programSha256 mismatch"},
		{"bad trigger", `trigger: { run: idle } }
      - press: 2`, `trigger: { run: done } }
      - press: 2`, "trigger must be"},
		{"unknown key", `ordered: true`, `ordered: true
colour: red`, "yaml"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			m := variant(t, func(s string) string {
				if !strings.Contains(s, c.from) {
					t.Fatalf("fixture text %q not in squares.yaml", c.from)
				}
				return strings.Replace(s, c.from, c.to, 1)
			})
			expectUnavailable(t, m, c.want)
		})
	}
}

// Rule 4 per terminal: a step whose non-trunk terminal is also used by a
// preset line is rejected; shared trunk ends are fine (sq.e shares 1, 1-1, 1-3).
func TestOverlapRule(t *testing.T) {
	// Synthetic program: a1.A is used by a step and a preset cable, a1.op5
	// is set by a step and a preset line, trunk 1 is shared (allowed).
	up := t.TempDir()
	os.MkdirAll(filepath.Join(up, "programs"), 0o755)
	prog := "p c.o 1\np 1 a1.α\np a1.A a2.β\np a1.A 2\ns a1.op5 α\ns a1.op5 β\n"
	os.WriteFile(filepath.Join(up, "programs", "x.e"), []byte(prog), 0o644)
	y := `schema: 1
id: x
title: X
program: x.e
programSha256: "` + sha([]byte(prog)) + `"
ordered: true
steps:
  - { id: s1, line: "p a1.A a2.β", text: { headline: h, body: b, done: d } }
  - { id: s2, line: "s a1.op5 α", text: { headline: h, body: b, done: d } }
  - { id: s3, line: "p 1 a1.α", text: { headline: h, body: b, done: d } }
run: { buttons: [init], watch: ["1"], speeds: { full: { rate: 0 } }, defaultSpeed: full }
content:
  briefing: { headline: h, body: b }
  plan: { headline: h, body: b }
  rest: { headline: h, body: b }
  result: { headline: h, body: b }
`
	p := filepath.Join(t.TempDir(), "x.yaml")
	os.WriteFile(p, []byte(y), 0o644)
	m := Load(p, up)
	var jack, sw, trunk bool
	for _, e := range m.Errors {
		jack = jack || strings.Contains(e, "touches a1.A")
		sw = sw || strings.Contains(e, "sets a1.op5")
		trunk = trunk || strings.Contains(e, "touches 1,")
	}
	if !jack || !sw || trunk {
		t.Fatalf("overlap errors wrong (jack=%v switch=%v trunk=%v): %v", jack, sw, trunk, m.Errors)
	}
}

func TestDriftOneByte(t *testing.T) {
	dir, up := paths(t)
	fake := t.TempDir()
	os.MkdirAll(filepath.Join(fake, "programs"), 0o755)
	b, _ := os.ReadFile(filepath.Join(up, "programs", "sq.e"))
	b[len(b)-2] ^= 1 // flip one bit of one byte
	os.WriteFile(filepath.Join(fake, "programs", "sq.e"), b, 0o644)
	m := Load(filepath.Join(dir, "squares.yaml"), fake)
	expectUnavailable(t, m, "programSha256 mismatch")
	reg := NewRegistry([]*Mission{m})
	if reg.AnyAvailable() {
		t.Fatal("registry reports an available mission")
	}
}

func TestAPI(t *testing.T) {
	m := loadSquares(t)
	bad := &Mission{File: File{ID: "primes", Title: "Primes", Order: 2}, Reason: "blocked (U1)"}
	reg := NewRegistry([]*Mission{m, bad})
	h := reg.Handler()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/api/missions", nil))
	var list []Summary
	if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil || len(list) != 2 {
		t.Fatalf("%v %s", err, rec.Body)
	}
	if !list[0].Available || list[1].Available || list[1].Reason == "" {
		t.Fatalf("%+v", list)
	}
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest("GET", "/api/missions/squares", nil))
	var c Compiled
	if err := json.Unmarshal(rec.Body.Bytes(), &c); err != nil || c.ID != "squares" || len(c.Steps) != 7 {
		t.Fatalf("%v %+v", err, c)
	}
	for path, code := range map[string]int{"/api/missions/primes": 409, "/api/missions/nope": 404} {
		rec = httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest("GET", path, nil))
		if rec.Code != code {
			t.Errorf("%s: %d", path, rec.Code)
		}
	}
}
