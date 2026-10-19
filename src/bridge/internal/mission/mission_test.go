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

// Primes (M2): sieve.e at the pin, 5 steps, 264 cables / 285 switches
// preset (UX 8.2.2), the M2 jacks resolved to their classes, the card pane
// and the patch requirement.
func TestPrimesValid(t *testing.T) {
	dir, up := paths(t)
	m := Load(filepath.Join(dir, "primes.yaml"), up)
	if !m.Available {
		t.Fatalf("primes unavailable: %v", m.Errors)
	}
	c := m.Compiled()
	if c.Counts != (Counts{PresetCables: 264, PresetSwitches: 285, StepCables: 4, StepSwitches: 1}) {
		t.Fatalf("counts %+v", c.Counts)
	}
	if c.Minutes != 4 || !c.Run.InitOnce || c.Run.Cards == nil || c.Run.Cards.Window != [2]int{51, 80} || c.Result != "hundred" {
		t.Fatalf("compiled %+v run %+v", c, c.Run)
	}
	want := map[string][2]string{
		"a1-fits":          {"program-out", "program-trunk"},
		"trunk17-to-mp":    {"program-trunk", "program-in"},
		"trunk19-to-punch": {"program-trunk", "program-in"},
		"punch-done-to-14": {"program-out", "program-trunk"},
	}
	for _, s := range c.Steps {
		if w, ok := want[s.ID]; ok && (s.FromClass != w[0] || s.ToClass != w[1] || s.Cable != "program") {
			t.Errorf("step %s classes %s -> %s (%s)", s.ID, s.FromClass, s.ToClass, s.Cable)
		}
	}
	if s := c.Steps[0]; s.Switch != "c.k1" || s.Family != econfig.FamConstDigit || s.Value != "2" {
		t.Fatalf("step 1 %+v", s)
	}
	if txt, _ := m.StepText("trunk17-to-mp"); txt != "p 1-7 p.Adi" {
		t.Fatalf("step text %q", txt)
	}
	sum := SummaryOf(m)
	if sum.Steps != 5 || sum.Minutes != 4 {
		t.Fatalf("summary %+v", sum)
	}
}

// requires: without patch 0003 the Trajectory numbers can come out low (spike S2), so the
// mission must be unavailable rather than fail on the floor.
func TestTrajectoryRequiresPatch(t *testing.T) {
	dir, up := paths(t)
	old := Patches
	defer func() { Patches = old }()
	Patches = func(string) ([]string, error) { return nil, nil }
	expectUnavailable(t, Load(filepath.Join(dir, "trajectory.yaml"), up), "requires upstream patch 0003-acc-1pp-race")
}

func primesVariant(t *testing.T, from, to string) *Mission {
	t.Helper()
	dir, up := paths(t)
	b, _ := os.ReadFile(filepath.Join(dir, "primes.yaml"))
	if !strings.Contains(string(b), from) {
		t.Fatalf("fixture text %q not in primes.yaml", from)
	}
	p := filepath.Join(t.TempDir(), "primes.yaml")
	os.WriteFile(p, []byte(strings.Replace(string(b), from, to, 1)), 0o644)
	return Load(p, up)
}

func TestPrimesNegative(t *testing.T) {
	cases := []struct{ name, from, to, want string }{
		{"read without withheld", `buttons: [init]`, `buttons: [init, read]`, "withheld line is bound to read"},
		{"clear with initOnce", `buttons: [init]`, `buttons: [init, clear]`, "initOnce missions cannot offer clear"},
		{"bad punchField", `{ punchField: { index: 13, eq: "02801" } }`, `{ punchField: { index: 16, eq: "02801" } }`, "index 16"},
		{"bad punchCount", `{ punchCount: { gte: 100 } }`, `{ punchCount: { } }`, "punchCount needs"},
		{"card window", `window: [51, 80]`, `window: [51, 81]`, "run.cards.window"},
		{"card style", `style: stack`, `style: pile`, "stack or film"},
		{"bad caption trigger", `trigger: { punchCount: { gte: 5 } }`, `trigger: { punchCount: { gte: 5 }, run: busy }`, "exactly one of"},
		{"live doneAt", `doneAt: last`, `doneAt: nope`, "content.result.live.doneAt"},
		{"freezeAt", `initOnce: true`, `initOnce: true
  freezeAt: nope`, "run.freezeAt"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) { expectUnavailable(t, primesVariant(t, c.from, c.to), c.want) })
	}
}

// Includes and assets (UX 8.5 items 1, 2): pinned by sha256, the include's
// lines count as preset for rule 4, the asset's first card is served.
func TestIncludesAndAssets(t *testing.T) {
	up := t.TempDir()
	os.MkdirAll(filepath.Join(up, "programs"), 0o755)
	inc := "s a3.op1 α\ns a1.op5 β\n"
	prog := "f r in.card\nl inc.e\np c.o 1\np 1 a1.α\np 1 a2.α\ns a1.op5 α\nb r\nb i\n"
	card := "00000973670000013975\n"
	os.WriteFile(filepath.Join(up, "programs", "inc.e"), []byte(inc), 0o644)
	os.WriteFile(filepath.Join(up, "programs", "x.e"), []byte(prog), 0o644)
	os.WriteFile(filepath.Join(up, "in.card"), []byte(card), 0o644)
	y := func(extra string) string {
		return `schema: 1
id: x
title: X
program: x.e
programSha256: "` + sha([]byte(prog)) + `"
ordered: true
steps:
  - { id: s1, line: "s a1.op5 α", text: { headline: h, body: b, done: d } }
  - { id: s2, line: "p 1 a1.α", text: { headline: h, body: b, done: d } }
withheld:
  - { line: "b r", button: read }
  - { line: "b i", button: init }
run: { buttons: [read, init], watch: ["1"], speeds: { full: { rate: 0 } }, defaultSpeed: full }
content:
  briefing: { headline: h, body: b }
  plan: { headline: h, body: b }
  rest: { headline: h, body: b }
  read: { before: { headline: "Press READ" }, headline: r, captions: [], initLocked: "Read the card first" }
  result: { headline: h, body: b }
` + extra
	}
	write := func(s string) string {
		p := filepath.Join(t.TempDir(), "x.yaml")
		os.WriteFile(p, []byte(s), 0o644)
		return p
	}
	good := "includes: { inc.e: \"" + sha([]byte(inc)) + "\" }\nassets: { in.card: \"" + sha([]byte(card)) + "\" }\n"
	m := Load(write(strings.Replace(y(""), "ordered: true", "ordered: true\n"+good, 1)), up)
	// Rule 4 sees the include: its s a1.op5 β clashes with step s1.
	expectUnavailable(t, m, "sets a1.op5")
	noRule4 := strings.Replace(y(""), `line: "s a1.op5 α"`, `line: "p 1 a2.α"`, 1)
	m = Load(write(strings.Replace(noRule4, "ordered: true", "ordered: true\n"+good, 1)), up)
	if !m.Available {
		t.Fatalf("%v", m.Errors)
	}
	c := m.Compiled()
	if c.ReadCard == nil || c.ReadCard.File != "in.card" || c.ReadCard.Text != "00000973670000013975" {
		t.Fatalf("read card %+v", c.ReadCard)
	}
	if c.Counts.PresetSwitches != 3 { // s a1.op5 α and both include lines are preset
		t.Fatalf("counts %+v", c.Counts)
	}
	if got := m.WithheldFor("read"); strings.Join(got, "|") != "b r" {
		t.Fatalf("read lines %v", got)
	}
	expectUnavailable(t, Load(write(strings.Replace(noRule4, "ordered: true", "ordered: true\nincludes: { inc.e: \""+sha([]byte(inc))+"\" }\n", 1)), up), "not pinned in assets")
	expectUnavailable(t, Load(write(strings.Replace(noRule4, "ordered: true", "ordered: true\nincludes: { inc.e: \""+sha([]byte(inc))+"\" }\nassets: { in.card: \"00\" }\n", 1)), up), "asset in.card sha256 mismatch")
}

// Trajectory (M2, UX 8.3 v0.4): trajdemo.e with drag.e and demo.card, 5
// steps, 293 cables and 1,147 switches preset (drag.e included), READ bound
// to b c then b r, INIT after the card is read, frozen at the landing.
func TestTrajectoryValid(t *testing.T) {
	dir, up := paths(t)
	m := Load(filepath.Join(dir, "trajectory.yaml"), up)
	if !m.Available {
		t.Fatalf("trajectory unavailable: %v", m.Errors)
	}
	c := m.Compiled()
	if c.Counts != (Counts{PresetCables: 293, PresetSwitches: 1147, StepCables: 4, StepSwitches: 1}) {
		t.Fatalf("counts %+v", c.Counts)
	}
	if got := m.WithheldFor("read"); strings.Join(got, "|") != "b c|b r" {
		t.Fatalf("READ sends %v, want b c then b r (spike S2)", got)
	}
	if got := m.WithheldFor("init"); strings.Join(got, "|") != "b i" {
		t.Fatalf("INIT sends %v", got)
	}
	if c.ReadCard == nil || !strings.HasPrefix(c.ReadCard.Text, "0000097367") || len(c.ReadCard.Text) != 70 {
		t.Fatalf("readCard %+v", c.ReadCard)
	}
	r := m.File.Run
	if !r.InitOnce || r.InitAfter != "card-read" || r.FreezeAt != "landed" || len(c.Run.Speeds) != 1 || c.Run.Plot == nil {
		t.Fatalf("run %+v", r)
	}
	s := c.Steps[1]
	if s.Switch != "pr.6" || s.Family != econfig.FamPrField || strings.Join(s.Choices, ",") != "P,0" {
		t.Fatalf("step 2 %+v", s)
	}
	if c.Steps[0].From != "i.ro" || c.Steps[2].To != "i.pi" || c.Steps[4].To != "p.Hi" {
		t.Fatalf("steps %+v", c.Steps)
	}
	// The real line text is what the core gets (i.Ro, i.Pi as written).
	if txt, _ := m.StepText("reader-done-to-1-2"); txt != "p i.Ro 1-2" {
		t.Fatalf("step text %q", txt)
	}
}

// Stall windows (follow-up to #45): per speed, punch-driven for card
// missions, off for Squares, at least 2 s when on.
func TestStallWindows(t *testing.T) {
	dir, up := paths(t)
	for _, c := range []struct {
		id, speed string
		ms        int
		punch     bool
	}{{"primes", "full", 20000, true}, {"primes", "slow", 60000, true}, {"trajectory", "full", 10000, true}, {"squares", "slow", 0, false}, {"squares", "full", 0, false}} {
		m := Load(filepath.Join(dir, c.id+".yaml"), up)
		w, punch := m.StallWindow(c.speed)
		if w.Milliseconds() != int64(c.ms) || punch != c.punch {
			t.Errorf("%s %s: %s punch=%v", c.id, c.speed, w, punch)
		}
	}
	expectUnavailable(t, primesVariant(t, `full: { rate: 0, stallMs: 20000 }`, `full: { rate: 0, stallMs: 500 }`), "stallMs must be 0 (off) or at least 2000")
}
