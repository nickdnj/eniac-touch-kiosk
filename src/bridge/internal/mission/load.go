package mission

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"gopkg.in/yaml.v3"

	"eniac-kiosk/bridge/internal/econfig"
	"eniac-kiosk/bridge/internal/machine"
)

// Mission is a loaded mission. If Available is false, Reason says why and
// the UI must not offer it (architecture 5.7).
type Mission struct {
	File      File
	Path      string
	Available bool
	Reason    string
	Errors    []string

	programPath string
	programRaw  []string       // file lines, for the preset
	lines       []econfig.Line // command lines
	stepLine    map[string]econfig.Line
	stepOrder   []string // step ids in presentation order
	fileOrder   []string // step ids in .e file order (skip_setup)
	withheld    []econfig.Line
	compiled    *Compiled
}

var idRe = regexp.MustCompile(`^[a-z0-9-]+$`)

// Limits for the copy lint (FR-22, architecture 5.9.5 rule 7).
const (
	MaxBodyWords     = 40
	MaxMoreWords     = 120
	MaxHeadlineChars = 60
)

// LoadDir loads every missions/*.yaml. Missions that fail validation are
// returned with Available=false.
func LoadDir(dir, upstream string) ([]*Mission, error) {
	files, err := filepath.Glob(filepath.Join(dir, "*.yaml"))
	if err != nil {
		return nil, err
	}
	sort.Strings(files)
	var out []*Mission
	seen := map[string]bool{}
	for _, f := range files {
		m := Load(f, upstream)
		if seen[m.File.ID] {
			m.fail("duplicate mission id %q", m.File.ID)
		}
		seen[m.File.ID] = true
		out = append(out, m)
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].File.Order < out[j].File.Order })
	return out, nil
}

func (m *Mission) fail(format string, a ...any) {
	m.Errors = append(m.Errors, fmt.Sprintf(format, a...))
}

// Load reads and validates one mission against the upstream runtime dir
// (the directory holding programs/).
func Load(path, upstream string) *Mission {
	m := &Mission{Path: path, stepLine: map[string]econfig.Line{}}
	defer func() {
		m.Available = len(m.Errors) == 0
		if !m.Available {
			m.Reason = m.Errors[0]
			if len(m.Errors) > 1 {
				m.Reason += fmt.Sprintf(" (and %d more)", len(m.Errors)-1)
			}
			m.compiled = nil
		}
	}()
	b, err := os.ReadFile(path)
	if err != nil {
		m.fail("%v", err)
		return m
	}
	dec := yaml.NewDecoder(bytes.NewReader(b))
	dec.KnownFields(true)
	if err := dec.Decode(&m.File); err != nil {
		m.fail("yaml: %v", err)
		return m
	}
	f := &m.File
	if f.ID == "" {
		f.ID = strings.TrimSuffix(filepath.Base(path), ".yaml")
	}
	if f.Schema != 1 {
		m.fail("schema must be 1, got %d", f.Schema)
	}
	if !idRe.MatchString(f.ID) {
		m.fail("id %q must match [a-z0-9-]+", f.ID)
	}
	if f.Title == "" {
		m.fail("title is required")
	}
	if f.Program == "" || strings.ContainsAny(f.Program, "/\\ ") {
		m.fail("program must be a file name in programs/: %q", f.Program)
		return m
	}

	// Rule 1: program (and include) sha256 match the pin.
	m.programPath = filepath.Join(upstream, "programs", f.Program)
	prog, err := os.ReadFile(m.programPath)
	if err != nil {
		m.fail("program %s: %v", f.Program, err)
		return m
	}
	if got := sha(prog); got != f.ProgramSha256 {
		m.fail("programSha256 mismatch for %s: file has %s, mission pins %s (upstream changed; review the mission)", f.Program, got, f.ProgramSha256)
		return m
	}
	m.programRaw = strings.Split(string(prog), "\n")
	m.lines, _ = econfig.Parse(bytes.NewReader(prog))
	for _, inc := range econfig.Includes(m.lines) {
		want, ok := f.Includes[inc]
		if !ok {
			m.fail("program includes %s, which is not pinned in includes", inc)
			continue
		}
		ib, err := os.ReadFile(filepath.Join(upstream, "programs", inc))
		if err != nil {
			m.fail("include %s: %v", inc, err)
		} else if sha(ib) != want {
			m.fail("include %s sha256 mismatch", inc)
		}
	}

	m.validateGrammar()
	m.resolveSteps()
	m.resolveWithheld()
	m.checkMultiset()
	m.checkOverlap()
	m.validateRun()
	m.validateCopy()
	if len(m.Errors) == 0 {
		m.compiled = m.compile()
	}
	return m
}

func sha(b []byte) string {
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}

// validateGrammar: every p and s line of the program is in the M1 grammar
// and catalog (rule 5 for preset switches too).
func (m *Mission) validateGrammar() {
	for _, e := range econfig.Validate(m.lines) {
		m.fail("%s: %v", m.File.Program, e)
	}
}

// find returns the program command lines whose canonical text equals text.
func (m *Mission) find(text string) []econfig.Line {
	c := econfig.Canonicalize(text)
	var out []econfig.Line
	for _, l := range m.lines {
		if l.Canon == c {
			out = append(out, l)
		}
	}
	return out
}

func pick(matches []econfig.Line, occurrence int) (econfig.Line, error) {
	switch {
	case len(matches) == 0:
		return econfig.Line{}, errors.New("not found in the program")
	case occurrence > 0:
		if occurrence > len(matches) {
			return econfig.Line{}, fmt.Errorf("occurrence %d but only %d matches", occurrence, len(matches))
		}
		return matches[occurrence-1], nil
	case len(matches) > 1:
		return econfig.Line{}, fmt.Errorf("matches %d lines (lines %d, %d...); set occurrence", len(matches), matches[0].Num, matches[1].Num)
	}
	return matches[0], nil
}

func (m *Mission) resolveSteps() {
	used := map[int]string{}
	for i, s := range m.File.Steps {
		if !idRe.MatchString(s.ID) {
			m.fail("step %d: id %q must match [a-z0-9-]+", i+1, s.ID)
			continue
		}
		if _, dup := m.stepLine[s.ID]; dup {
			m.fail("step id %q is used twice", s.ID)
			continue
		}
		l, err := pick(m.find(s.Line), s.Occurrence)
		if err != nil {
			m.fail("step %s: line %q %v", s.ID, s.Line, err)
			continue
		}
		if other, ok := used[l.Num]; ok {
			m.fail("step %s: line %d is already step %s", s.ID, l.Num, other)
			continue
		}
		used[l.Num] = s.ID
		// Rule 2: steps are only p or s lines.
		if l.Cmd != "p" && l.Cmd != "s" {
			m.fail("step %s: only p and s lines can be steps, not %q", s.ID, l.Text)
			continue
		}
		if s.Expect != nil {
			m.checkExpect(s, l)
		}
		if l.Sw != nil {
			m.checkChoices(s, l)
		} else if len(s.Choices) > 0 {
			m.fail("step %s: choices only apply to switch steps", s.ID)
		}
		if l.Plug != nil && (!l.Plug.From.M1 || !l.Plug.To.M1) {
			m.fail("step %s: %q is outside the M1 jack grammar", s.ID, l.Text)
		}
		m.stepLine[s.ID] = l
		m.stepOrder = append(m.stepOrder, s.ID)
	}
	ids := append([]string(nil), m.stepOrder...)
	sort.SliceStable(ids, func(i, j int) bool { return m.stepLine[ids[i]].Num < m.stepLine[ids[j]].Num })
	m.fileOrder = ids
}

func (m *Mission) checkExpect(s StepSpec, l econfig.Line) {
	e := s.Expect
	if l.Plug != nil {
		if econfig.ParseTerminal(e.From).Canon != l.Plug.From.Canon || econfig.ParseTerminal(e.To).Canon != l.Plug.To.Canon {
			m.fail("step %s: expect %s -> %s disagrees with the line %q", s.ID, e.From, e.To, l.Text)
		}
		return
	}
	if e.Switch != l.Sw.Name {
		m.fail("step %s: expect switch %s disagrees with the line %q", s.ID, e.Switch, l.Text)
	}
	if c, ok := econfig.InCatalog(*l.Sw, e.Value); !ok || c != l.Sw.Canon {
		m.fail("step %s: expect value %s disagrees with the line %q", s.ID, e.Value, l.Text)
	}
}

// checkChoices: rule 5, choices are a subset of the catalog and contain the value.
func (m *Mission) checkChoices(s StepSpec, l econfig.Line) {
	if len(s.Choices) == 0 {
		return
	}
	has := false
	seen := map[string]bool{}
	for _, c := range s.Choices {
		canon, ok := econfig.InCatalog(*l.Sw, c)
		if !ok {
			m.fail("step %s: choice %q is not a valid %s value", s.ID, c, l.Sw.Family)
			continue
		}
		if seen[canon] {
			m.fail("step %s: choice %q repeated", s.ID, c)
		}
		seen[canon] = true
		if canon == l.Sw.Canon {
			has = true
		}
	}
	if !has {
		m.fail("step %s: choices %v do not contain the value %s", s.ID, s.Choices, l.Sw.Value)
	}
}

func (m *Mission) resolveWithheld() {
	for _, w := range m.File.Withheld {
		l, err := pick(m.find(w.Line), w.Occurrence)
		if err != nil {
			m.fail("withheld %q: %v", w.Line, err)
			continue
		}
		// Rule 2: withheld lines are only b or f lines.
		if l.Cmd != "b" && l.Cmd != "f" {
			m.fail("withheld %q: only b and f lines can be withheld", w.Line)
			continue
		}
		switch w.Button {
		case "", "init", "read", "clear":
		default:
			m.fail("withheld %q: button must be init, read, clear or empty", w.Line)
		}
		m.withheld = append(m.withheld, l)
	}
}

// checkMultiset: rule 3, preset + steps + withheld == the original command
// lines, nothing lost or duplicated.
func (m *Mission) checkMultiset() {
	count := map[string]int{}
	for _, l := range m.lines {
		count[l.Canon]++
	}
	for _, l := range m.PresetLines() {
		count[l.Canon]--
	}
	for _, id := range m.stepOrder {
		count[m.stepLine[id].Canon]--
	}
	for _, l := range m.withheld {
		count[l.Canon]--
	}
	for k, v := range count {
		if v != 0 {
			m.fail("multiset check failed for %q (%+d)", k, v)
		}
	}
}

// checkOverlap: rule 4, defined per terminal and ignoring trunk ends. No
// preset line may touch the same jack, or set the same switch, as a step;
// otherwise the order of application would matter. Trunks are shared by
// design: in sq.e, trunks 1, 1-1 and 1-3 carry both step and preset cables.
func (m *Mission) checkOverlap() {
	stepTerm := map[string]string{}
	stepSw := map[string]string{}
	for _, id := range m.stepOrder {
		l := m.stepLine[id]
		if l.Plug != nil {
			for _, t := range []econfig.Terminal{l.Plug.From, l.Plug.To} {
				if !t.IsTrunk() {
					stepTerm[t.Canon] = id
				}
			}
		}
		if l.Sw != nil {
			stepSw[l.Sw.Name] = id
		}
	}
	for _, l := range m.PresetLines() {
		if l.Plug != nil {
			for _, t := range []econfig.Terminal{l.Plug.From, l.Plug.To} {
				if id, ok := stepTerm[t.Canon]; ok && !t.IsTrunk() {
					m.fail("preset line %d %q touches %s, which step %s also plugs", l.Num, l.Text, t.Canon, id)
				}
			}
		}
		if l.Sw != nil {
			if id, ok := stepSw[l.Sw.Name]; ok {
				m.fail("preset line %d %q sets %s, which step %s also sets", l.Num, l.Text, l.Sw.Name, id)
			}
		}
	}
}

func (m *Mission) validateRun() {
	r := m.File.Run
	for _, b := range r.Buttons {
		switch b {
		case "init", "clear", "read":
		default:
			m.fail("run.buttons: %q is not init, clear or read", b)
		}
	}
	if len(r.Buttons) == 0 {
		m.fail("run.buttons is empty")
	}
	for _, w := range r.Watch {
		if n, err := strconv.Atoi(w); err != nil || n < 1 || n > 20 || strconv.Itoa(n) != w {
			m.fail("run.watch: %q is not an accumulator 1..20", w)
		}
	}
	if len(r.Speeds) == 0 {
		m.fail("run.speeds is empty")
	}
	for name, s := range r.Speeds {
		if !idRe.MatchString(name) {
			m.fail("run.speeds: bad name %q", name)
		}
		if s.Rate < 0 {
			m.fail("run.speeds.%s: rate must be >= 0", name)
		}
		if s.Op != "" && s.Op != "co" && s.Op != "1a" && s.Op != "1p" {
			m.fail("run.speeds.%s: op must be co, 1a or 1p", name)
		}
	}
	if _, ok := r.Speeds[r.DefaultSpeed]; !ok {
		m.fail("run.defaultSpeed %q is not in run.speeds", r.DefaultSpeed)
	}
	if _, err := m.QuietOverrideMs(); err != nil {
		m.fail("run.idle.quietMs: %v", err)
	}
	ids := map[string]bool{}
	for _, c := range m.File.Checkpoints {
		if !idRe.MatchString(c.ID) || ids[c.ID] {
			m.fail("checkpoint id %q is invalid or repeated", c.ID)
		}
		ids[c.ID] = true
		if err := c.When.Validate(); err != nil {
			m.fail("checkpoint %s: %v", c.ID, err)
		}
	}
	if m.File.Result != "" && !ids[m.File.Result] {
		m.fail("result %q is not a checkpoint", m.File.Result)
	}
	if st := m.File.Content.Run.Extras.StopAt; st != "" && !ids[st] {
		m.fail("content.run.extras.stopAt %q is not a checkpoint", st)
	}
	if s := m.File.Selftest; s != nil {
		for k := range s.Expect {
			if n, err := strconv.Atoi(k); err != nil || n < 1 || n > 20 {
				m.fail("selftest.expect: %q is not an accumulator", k)
			}
		}
	}
	for _, p := range m.File.Content.Run.Presses {
		for _, c := range p.Captions {
			if err := c.Trigger.validate(); err != nil {
				m.fail("content.run press %d caption %q: %v", p.Press, c.Text, err)
			}
		}
	}
}

func (t Trigger) validate() error {
	switch {
	case t.AccProg != nil && t.Run == "":
		a, err := strconv.Atoi(t.AccProg.Acc)
		if err != nil || a < 1 || a > 20 || t.AccProg.Program < 1 || t.AccProg.Program > 12 {
			return errors.New("accProg needs acc 1..20 and program 1..12")
		}
	case t.AccProg == nil && (t.Run == "idle" || t.Run == "busy"):
	default:
		return errors.New("trigger must be exactly one of accProg or run: idle|busy")
	}
	return nil
}

// QuietOverrideMs returns run.idle.quietMs as milliseconds, 0 for auto.
func (m *Mission) QuietOverrideMs() (int, error) {
	q := m.File.Run.Idle.QuietMs
	if q == "" || q == "auto" {
		return 0, nil
	}
	n, err := strconv.Atoi(q)
	if err != nil || n <= 0 {
		return 0, fmt.Errorf("%q must be auto or a positive integer", q)
	}
	return n, nil
}

func words(s string) int { return len(strings.Fields(s)) }

// validateCopy: rule 7, the copy lint (FR-22), and no [FC] markers on screen.
func (m *Mission) validateCopy() {
	check := func(where, headline, body, more string, needBody bool) {
		if needBody && (headline == "" || body == "") {
			m.fail("%s: headline and body are required", where)
		}
		if len([]rune(headline)) > MaxHeadlineChars {
			m.fail("%s: headline is %d characters (max %d)", where, len([]rune(headline)), MaxHeadlineChars)
		}
		if n := words(body); n > MaxBodyWords {
			m.fail("%s: body is %d words (max %d)", where, n, MaxBodyWords)
		}
		if n := words(more); n > MaxMoreWords {
			m.fail("%s: more is %d words (max %d)", where, n, MaxMoreWords)
		}
		for _, s := range []string{headline, body, more} {
			if strings.Contains(s, "[FC") {
				m.fail("%s: [FC] markers belong in review.factCheck, not in shown text", where)
			}
		}
	}
	for _, s := range m.File.Steps {
		check("step "+s.ID, s.Text.Headline, s.Text.Body, s.Text.More, true)
		if s.Text.Done == "" {
			m.fail("step %s: done text is required", s.ID)
		}
	}
	c := m.File.Content
	check("content.briefing", c.Briefing.Headline, c.Briefing.Body, c.Briefing.More, true)
	check("content.plan", c.Plan.Headline, c.Plan.Body, c.Plan.More, true)
	check("content.rest", c.Rest.Headline, c.Rest.Body, c.Rest.More, true)
	check("content.result", c.Result.Headline, c.Result.Body, c.Result.More, true)
}

// PresetLines are the program's command lines minus steps and withheld lines.
func (m *Mission) PresetLines() []econfig.Line {
	skip := m.removedLineNums()
	var out []econfig.Line
	for _, l := range m.lines {
		if !skip[l.Num] {
			out = append(out, l)
		}
	}
	return out
}

func (m *Mission) removedLineNums() map[int]bool {
	skip := map[int]bool{}
	for _, l := range m.stepLine {
		skip[l.Num] = true
	}
	for _, l := range m.withheld {
		skip[l.Num] = true
	}
	return skip
}

// Preset returns the preset file text: the original .e minus the step and
// withheld lines, comments and blank lines kept so line diagnostics still
// make sense (architecture 3.3).
func (m *Mission) Preset() string {
	skip := m.removedLineNums()
	var b strings.Builder
	for i, raw := range m.programRaw {
		if skip[i+1] {
			b.WriteString("# (step) " + strings.TrimSpace(raw))
		} else {
			b.WriteString(raw)
		}
		if i < len(m.programRaw)-1 {
			b.WriteByte('\n')
		}
	}
	return b.String()
}

// WritePreset writes preset.e into dir and returns its absolute path.
func (m *Mission) WritePreset(dir string) (string, error) {
	if !m.Available {
		return "", fmt.Errorf("mission %s is unavailable: %s", m.File.ID, m.Reason)
	}
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return "", err
	}
	p, err := filepath.Abs(filepath.Join(dir, "preset.e"))
	if err != nil {
		return "", err
	}
	return p, os.WriteFile(p, []byte(m.Preset()), 0o600)
}

// StepText returns the .e text the bridge sends for a step (the original
// spelling, comment stripped).
func (m *Mission) StepText(id string) (string, bool) {
	l, ok := m.stepLine[id]
	return l.Text, ok
}

// StepIDs returns step ids in presentation order.
func (m *Mission) StepIDs() []string { return append([]string(nil), m.stepOrder...) }

// StepIDsFileOrder returns step ids in .e file order (skip_setup).
func (m *Mission) StepIDsFileOrder() []string { return append([]string(nil), m.fileOrder...) }

// Watch returns the watched accumulators as ints.
func (m *Mission) Watch() []int {
	var out []int
	for _, w := range m.File.Run.Watch {
		n, _ := strconv.Atoi(w)
		out = append(out, n)
	}
	return out
}

// Speed looks up a named speed.
func (m *Mission) Speed(name string) (Speed, bool) {
	s, ok := m.File.Run.Speeds[name]
	return s, ok
}

// HasButton reports whether the mission offers a run button.
func (m *Mission) HasButton(b string) bool {
	for _, x := range m.File.Run.Buttons {
		if x == b {
			return true
		}
	}
	return false
}

// Checkpoints returns the mission's checkpoint list.
func (m *Mission) Checkpoints() []machine.Checkpoint { return m.File.Checkpoints }

// Compiled returns the UI-ready mission, or nil if unavailable.
func (m *Mission) Compiled() *Compiled { return m.compiled }
