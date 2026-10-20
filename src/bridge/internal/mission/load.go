package mission

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"gopkg.in/yaml.v3"

	"eniac-kiosk/bridge/internal/buildinfo"
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
	incLines    []econfig.Line // command lines of included files (l drag.e), preset
	readCard    *ReadCard
	compiled    *Compiled
}

var idRe = regexp.MustCompile(`^[a-z0-9-]+$`)

// Limits for the copy lint (FR-22, architecture 5.9.5 rule 7).
const (
	MaxBodyWords     = 40
	MaxMoreWords     = 120
	MaxHeadlineChars = 60
	MaxFinaleWords   = 25
)

var (
	finaleVarRe = regexp.MustCompile(`\{(\w+)\}`)
	finaleVars  = map[string]bool{"n": true, "square": true, "cards": true, "last": true, "hops": true}
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
		} else {
			// Rules 3 and 4 see the included lines as preset (UX 8.5 item 1).
			il, _ := econfig.Parse(bytes.NewReader(ib))
			for _, l := range il {
				if l.Cmd == "l" || l.Cmd == "b" || l.Cmd == "f" {
					m.fail("include %s: nested %q lines are not supported", inc, l.Cmd)
				}
			}
			m.incLines = append(m.incLines, il...)
		}
	}
	for inc := range f.Includes {
		if !contains(econfig.Includes(m.lines), inc) {
			m.fail("includes pins %s, which the program does not load", inc)
		}
	}
	m.checkAssets(upstream)
	m.checkRequires(upstream)

	m.validateGrammar()
	m.resolveSteps()
	m.resolveWithheld()
	m.checkMultiset()
	m.checkOverlap()
	m.validateRun()
	m.checkYourTurn()
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
	for _, e := range econfig.Validate(m.incLines) {
		m.fail("include: %v", e)
	}
}

func contains(list []string, v string) bool {
	for _, x := range list {
		if x == v {
			return true
		}
	}
	return false
}

// checkAssets: rule 1 for input files the program reads (`f r demo.card`).
// They live in the upstream runtime dir (the core's cwd), are pinned by
// sha256, and the first card is served to the UI for the READ graphic: the
// real input, not demo data (UX 8.5 item 2).
func (m *Mission) checkAssets(upstream string) {
	reads := map[string]bool{}
	for _, l := range m.lines {
		if l.Cmd == "f" && len(l.Args) == 2 && l.Args[0] == "r" {
			reads[l.Args[1]] = true
		}
	}
	for r := range reads {
		if _, ok := m.File.Assets[r]; !ok {
			m.fail("program reads %s, which is not pinned in assets", r)
		}
	}
	for name, want := range m.File.Assets {
		if !reads[name] {
			m.fail("assets pins %s, which the program does not read (f r)", name)
			continue
		}
		if strings.ContainsAny(name, "/\\ ") {
			m.fail("asset %q must be a plain file name", name)
			continue
		}
		b, err := os.ReadFile(filepath.Join(upstream, name))
		if err != nil {
			m.fail("asset %s: %v", name, err)
			continue
		}
		if sha(b) != want {
			m.fail("asset %s sha256 mismatch", name)
			continue
		}
		first, _, _ := strings.Cut(string(b), "\n")
		first = strings.TrimRight(first, "\r")
		if len(first) > 80 {
			first = first[:80]
		}
		if m.readCard == nil {
			m.readCard = &ReadCard{File: name, Text: first}
		}
	}
}

// Patches is how the loader learns which local upstream patches the core was
// built with: the fetch script's .provenance.json in the runtime dir, else
// the bridge's build info. Tests may replace it.
var Patches = func(upstream string) ([]string, error) {
	b, err := os.ReadFile(filepath.Join(upstream, ".provenance.json"))
	if err == nil {
		var p struct {
			Patches []struct {
				Name string `json:"name"`
			} `json:"patches"`
		}
		if err := json.Unmarshal(b, &p); err != nil {
			return nil, fmt.Errorf(".provenance.json: %v", err)
		}
		out := []string{}
		for _, x := range p.Patches {
			out = append(out, x.Name)
		}
		return out, nil
	}
	if bp := buildinfo.Patches; bp != "" {
		return strings.Split(bp, ","), nil
	}
	return nil, errors.New("neither .provenance.json nor build info lists the upstream patches")
}

// checkRequires: a mission that needs a local patch (Primes needs
// 0002-ft-repeat-default, or sieve.e punches nothing: spike S3) is
// unavailable without it.
func (m *Mission) checkRequires(upstream string) {
	if len(m.File.Requires) == 0 {
		return
	}
	have, err := Patches(upstream)
	if err != nil {
		m.fail("requires %v: %v", m.File.Requires, err)
		return
	}
	for _, r := range m.File.Requires {
		if !contains(have, r) {
			m.fail("requires upstream patch %s, which this core was not built with (have %v)", r, have)
		}
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
		if l.Plug != nil {
			for _, t := range []econfig.Terminal{l.Plug.From, l.Plug.To} {
				if !t.Known() || t.Class == econfig.ClassOther {
					m.fail("step %s: %s in %q cannot be a visitor target", s.ID, t.Raw, l.Text)
				}
			}
		}
		if l.Sw != nil && l.Sw.Family != "" && econfig.Catalog(*l.Sw) == nil {
			m.fail("step %s: switch %s has no closed catalog, so it cannot be a visitor step", s.ID, l.Sw.Name)
		}
		m.stepLine[s.ID] = l
		m.stepOrder = append(m.stepOrder, s.ID)
	}
	ids := append([]string(nil), m.stepOrder...)
	sort.SliceStable(ids, func(i, j int) bool { return m.stepLine[ids[i]].Num < m.stepLine[ids[j]].Num })
	m.fileOrder = ids
}

// checkYourTurn: the free step exists, is a switch step with at least two choices, and the copy can run.
func (m *Mission) checkYourTurn() {
	y := m.File.Content.YourTurn
	if y == nil {
		return
	}
	l, ok := m.stepLine[y.Step]
	if !ok {
		m.fail("yourTurn.step %q is not a step of this mission", y.Step)
		return
	}
	if l.Sw == nil {
		m.fail("yourTurn.step %q must be a switch step", y.Step)
		return
	}
	if len(m.stepChoices(y.Step)) < 2 {
		m.fail("yourTurn.step %q needs at least two choices", y.Step)
	}
	if y.Predict.Show < 2 || y.Predict.Show > 12 {
		m.fail("yourTurn.predict.show must be 2 to 12, got %d", y.Predict.Show)
	}
	if m.File.Run.Cards == nil {
		m.fail("yourTurn needs run.cards: the prediction is made from the visitor's real cards")
	}
	if len(y.Predict.Change) == 0 {
		m.fail("yourTurn.predict.change must name the card fields that hold the change")
	}
	if m.File.Ordered && len(m.stepOrder) > 0 && m.stepOrder[0] != y.Step {
		m.fail("yourTurn.step %q must be the first step of an ordered mission", y.Step)
	}
	for name, v := range map[string]string{"button": y.Button, "predict.headline": y.Predict.Headline, "predict.ask": y.Predict.Ask,
		"predict.right": y.Predict.Right, "predict.wrong": y.Predict.Wrong, "predict.go": y.Predict.Go,
		"dial.headline": y.Dial.Headline, "dial.body": y.Dial.Body, "compare.headline": y.Compare.Headline,
		"compare.first": y.Compare.First, "compare.yours": y.Compare.Yours} {
		if strings.TrimSpace(v) == "" {
			m.fail("yourTurn.%s is empty", name)
		}
	}
}

func (m *Mission) stepChoices(id string) []string {
	for _, s := range m.File.Steps {
		if s.ID == id {
			return s.Choices
		}
	}
	return nil
}

// FreeStepID is the step the visitor may set to any of its choices in Your turn, or "".
func (m *Mission) FreeStepID() string {
	if y := m.File.Content.YourTurn; y != nil {
		return y.Step
	}
	return ""
}

// FreeStepText is the step's command with its value replaced by `value`. Only the
// Your-turn step takes a value, and only one of its choices.
func (m *Mission) FreeStepText(id, value string) (string, error) {
	if id == "" || id != m.FreeStepID() {
		return "", fmt.Errorf("step %q does not take a chosen value", id)
	}
	ok := false
	for _, c := range m.stepChoices(id) {
		if c == value {
			ok = true
		}
	}
	if !ok {
		return "", fmt.Errorf("value %q is not one of the choices for step %q", value, id)
	}
	f := strings.Fields(m.stepLine[id].Text)
	f[len(f)-1] = value
	return strings.Join(f, " "), nil
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
	for _, l := range append(m.PresetLines(), m.incLines...) {
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
		if s.StallMs != 0 && s.StallMs < 2000 {
			m.fail("run.speeds.%s: stallMs must be 0 (off) or at least 2000", name)
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
	for name, id := range map[string]string{"run.initAfter": r.InitAfter, "run.freezeAt": r.FreezeAt, "content.result.live.doneAt": m.liveDoneAt()} {
		if id != "" && !ids[id] {
			m.fail("%s %q is not a checkpoint", name, id)
		}
	}
	if m.HasButton("read") != (len(m.WithheldFor("read")) > 0) {
		m.fail("run.buttons has read exactly when a withheld line is bound to read")
	}
	if m.HasButton("read") && m.File.Content.Read == nil {
		m.fail("content.read is required with a read button")
	}
	if r.InitOnce && m.HasButton("clear") {
		m.fail("run.initOnce missions cannot offer clear (CLEAR mid-run corrupts the run)")
	}
	m.validateCardPane()
	if s := m.File.Selftest; s != nil {
		for k := range s.Expect {
			if n, err := strconv.Atoi(k); err != nil || n < 1 || n > 20 {
				m.fail("selftest.expect: %q is not an accumulator", k)
			}
		}
		if s.Until != nil {
			if err := s.Until.Validate(); err != nil {
				m.fail("selftest.until: %v", err)
			}
		}
		for _, c := range s.Cards {
			if c.Index < 0 || c.Index > 15 || len(c.Values) == 0 {
				m.fail("selftest.cards: index must be 0..15 with at least one value")
			}
		}
		if s.Read && !m.HasButton("read") {
			m.fail("selftest.read needs a read button")
		}
	}
	check := func(where string, caps []Caption) {
		for _, c := range caps {
			if err := c.Trigger.validate(); err != nil {
				m.fail("%s caption %q: %v", where, c.Text, err)
			}
		}
	}
	for _, p := range m.File.Content.Run.Presses {
		check(fmt.Sprintf("content.run press %d", p.Press), p.Captions)
	}
	if rd := m.File.Content.Read; rd != nil {
		check("content.read", rd.Captions)
	}
}

func (m *Mission) liveDoneAt() string {
	if l := m.File.Content.Result.Live; l != nil {
		return l.DoneAt
	}
	return ""
}

func (m *Mission) validateCardPane() {
	r := m.File.Run
	field := func(where string, idx []int) {
		for _, i := range idx {
			if i < 0 || i > 15 {
				m.fail("%s: field index %d must be 0..15", where, i)
			}
		}
	}
	if c := r.Cards; c != nil {
		if c.Window[0] < 1 || c.Window[1] > 80 || c.Window[0] > c.Window[1] {
			m.fail("run.cards.window %v must be columns 1..80, first <= last", c.Window)
		}
		if len(c.Value) == 0 {
			m.fail("run.cards.value needs at least one field")
		}
		field("run.cards.value", c.Value)
		field("run.cards.hop", c.Hop)
		if c.Style != "stack" && c.Style != "film" {
			m.fail("run.cards.style must be stack or film")
		}
		if c.Keep < 1 || c.Keep > 20 {
			m.fail("run.cards.keep must be 1..20 (the bridge keeps the last 20 for a resync)")
		}
		if b := c.Bars; b != nil && (b.Per < 1 || b.UpTo < b.Per || b.UpTo/b.Per > 60) {
			m.fail("run.cards.bars: per >= 1, upTo >= per, at most 60 bars")
		}
		if m.File.Content.Run.Cards == nil {
			m.fail("content.run.cards is required with run.cards")
		}
	}
	if p := r.Plot; p != nil {
		if len(p.X) == 0 || len(p.Y) == 0 {
			m.fail("run.plot needs x and y fields")
		}
		field("run.plot.x", p.X)
		field("run.plot.y", p.Y)
		if r.Cards == nil {
			m.fail("run.plot needs run.cards")
		}
		if m.File.Content.Run.Plot == nil {
			m.fail("content.run.plot is required with run.plot")
		}
	}
}

// initLampNames are the initiating unit's lamps (architecture 6.1).
var initLampNames = []string{"clear.1", "clear.2", "clear.3", "clear.4", "clear.5", "clear.6", "rdff", "prff", "rdfinish", "rdilock", "rdsync", "g66", "g69"}

func (t Trigger) validate() error {
	n := 0
	for _, set := range []bool{t.AccProg != nil, t.Run != "", t.Acc != nil, t.PunchCount != nil, t.Init != "", t.Derived != ""} {
		if set {
			n++
		}
	}
	if n != 1 {
		return errors.New("trigger must be exactly one of accProg, run, acc, punchCount, init, derived")
	}
	switch {
	case t.AccProg != nil:
		a, err := strconv.Atoi(t.AccProg.Acc)
		if err != nil || a < 1 || a > 20 || t.AccProg.Program < 1 || t.AccProg.Program > 12 {
			return errors.New("accProg needs acc 1..20 and program 1..12")
		}
	case t.Run != "":
		if t.Run != "idle" && t.Run != "busy" {
			return errors.New("trigger must be run: idle|busy")
		}
	case t.Acc != nil:
		if a, err := strconv.Atoi(t.Acc.Acc); err != nil || a < 1 || a > 20 {
			return errors.New("acc needs acc 1..20")
		}
	case t.PunchCount != nil:
		if t.PunchCount.Gte < 1 {
			return errors.New("punchCount.gte must be >= 1")
		}
	case t.Init != "":
		if !contains(initLampNames, t.Init) {
			return fmt.Errorf("init lamp %q is not one of %v", t.Init, initLampNames)
		}
	case t.Derived != "":
		if t.Derived != "apex" && t.Derived != "landed" {
			return errors.New("derived must be apex or landed")
		}
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
	if c.Read != nil {
		check("content.read", c.Read.Before.Headline, c.Read.Before.Sub, "", false)
		if c.Read.InitLocked == "" || c.Read.Headline == "" {
			m.fail("content.read: headline and initLocked are required")
		}
	}
	if ch := c.Run.Chain; ch != nil {
		if ch.Title == "" || len(ch.Rows) == 0 || len(ch.Rows) > 4 {
			m.fail("content.run.chain: a title and 1 to 4 rows are required")
		}
		for _, r := range ch.Rows {
			if n, err := strconv.Atoi(r.Acc); err != nil || n < 1 || n > 20 {
				m.fail("content.run.chain: acc %q must be 1 to 20", r.Acc)
			}
			if r.Name == "" || words(r.Name) > 6 || words(r.Sub) > 8 || strings.Contains(r.Name+r.Sub, "[FC") {
				m.fail("content.run.chain: row %q needs a short name (max 6 words) and sub (max 8), no [FC]", r.Acc)
			}
		}
	}
	if f := m.File.Finale; f != nil {
		if f.Words == "" {
			m.fail("finale: words is required")
		}
		for _, x := range []string{f.Words, f.Figure} {
			if words(x) > MaxFinaleWords || strings.Contains(x, "[FC") {
				m.fail("finale: %q is too long (max %d words) or carries an [FC] marker", x, MaxFinaleWords)
			}
		}
		for _, v := range finaleVarRe.FindAllStringSubmatch(f.Figure, -1) {
			if !finaleVars[v[1]] {
				m.fail("finale: unknown placeholder {%s} (known: n, square, cards, last, hops)", v[1])
			}
		}
	}
	for _, x := range []string{c.Run.Note, c.Run.Before.Sub} {
		if words(x) > MaxBodyWords || strings.Contains(x, "[FC") {
			m.fail("content.run: %q is too long or carries an [FC] marker", x)
		}
	}
}

// WithheldFor returns the texts of the withheld lines bound to a button,
// in file order (Trajectory's READ sends `b c` then `b r`: spike S2).
func (m *Mission) WithheldFor(button string) []string {
	var out []string
	for i, w := range m.File.Withheld {
		if w.Button == button && i < len(m.withheld) {
			out = append(out, m.withheld[i].Text)
		}
	}
	sort.SliceStable(out, func(i, j int) bool { return m.lineNum(out[i]) < m.lineNum(out[j]) })
	return out
}

func (m *Mission) lineNum(text string) int {
	for _, l := range m.withheld {
		if l.Text == text {
			return l.Num
		}
	}
	return 0
}

// IncludeLines are the command lines of included files (always preset).
func (m *Mission) IncludeLines() []econfig.Line { return append([]econfig.Line(nil), m.incLines...) }

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

// StallWindow is the stall guard's window at a speed (0 = off) and whether
// progress means a punched card (missions with run.cards) or an
// accumulator change.
func (m *Mission) StallWindow(speed string) (time.Duration, bool) {
	sp := m.File.Run.Speeds[speed]
	return time.Duration(sp.StallMs) * time.Millisecond, m.File.Run.Cards != nil
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
