// Package mission loads, validates and compiles mission files
// (architecture 5.9). A mission references an unmodified upstream .e by
// name and sha256, marks some of its lines as visitor steps or withheld run
// lines, and treats everything else as the preset.
package mission

import (
	"eniac-kiosk/bridge/internal/machine"
)

// File is the YAML source, missions/<id>.yaml, schema 1.
type File struct {
	Schema        int                   `yaml:"schema"`
	ID            string                `yaml:"id"`
	Title         string                `yaml:"title"`
	Order         int                   `yaml:"order"`
	Summary       string                `yaml:"summary"`
	Program       string                `yaml:"program"`
	ProgramSha256 string                `yaml:"programSha256"`
	Includes      map[string]string     `yaml:"includes"`
	Ordered       bool                  `yaml:"ordered"`
	Steps         []StepSpec            `yaml:"steps"`
	Withheld      []WithheldSpec        `yaml:"withheld"`
	Run           RunSpec               `yaml:"run"`
	Checkpoints   []machine.Checkpoint  `yaml:"checkpoints"`
	Result        string                `yaml:"result"`
	Content       Content               `yaml:"content"`
	Selftest      *Selftest             `yaml:"selftest"`
	Credits       []string              `yaml:"credits"`
}

// StepSpec is one visitor-performed .e line.
type StepSpec struct {
	ID         string   `yaml:"id"`
	Line       string   `yaml:"line"`       // exact command text (Greek/ASCII aliases match)
	Occurrence int      `yaml:"occurrence"` // 1-based, for a line that appears more than once
	Expect     *Expect  `yaml:"expect"`     // optional restatement, checked against the line
	Choices    []string `yaml:"choices"`    // switch steps: subset of the catalog shown in the picker
	Text       StepText `yaml:"text"`
}

// Expect restates a step's targets for readability.
type Expect struct {
	From   string `yaml:"from"`
	To     string `yaml:"to"`
	Switch string `yaml:"switch"`
	Value  string `yaml:"value"`
}

// StepText is the step card copy (UX 8.1.4). [FC] markers are not allowed
// in shown text; the fields needing fact-checking are listed in Review.
type StepText struct {
	Headline string `yaml:"headline" json:"headline"`
	Body     string `yaml:"body" json:"body"`
	More     string `yaml:"more,omitempty" json:"more,omitempty"`
	Done     string `yaml:"done" json:"done"`
	Button   string `yaml:"button,omitempty" json:"button,omitempty"`
	Hints    Hints  `yaml:"hints" json:"hints"`
	Review   Review `yaml:"review,omitempty" json:"-"`
}

// Hints are the wrong-tap messages. Which one to show is the UI's choice
// (UX 5.2): wrongFrom/wrongTo for the two ends of a cable, wrongKind for a
// jack of the wrong kind (program vs data), wrongSwitch and wrongValue for
// switches, and byTarget for a specific wrong terminal (canonical .e term).
type Hints struct {
	WrongFrom   string            `yaml:"wrongFrom,omitempty" json:"wrongFrom,omitempty"`
	WrongTo     string            `yaml:"wrongTo,omitempty" json:"wrongTo,omitempty"`
	WrongKind   string            `yaml:"wrongKind,omitempty" json:"wrongKind,omitempty"`
	WrongSwitch string            `yaml:"wrongSwitch,omitempty" json:"wrongSwitch,omitempty"`
	WrongValue  string            `yaml:"wrongValue,omitempty" json:"wrongValue,omitempty"`
	ByTarget    map[string]string `yaml:"byTarget,omitempty" json:"byTarget,omitempty"`
}

// Review holds content-review metadata that is never shown on screen.
type Review struct {
	// FactCheck lists the fields carrying an [FC] tag in the UX spec
	// (test plan 12: they must clear the fact-check gate before the floor).
	FactCheck []string `yaml:"factCheck,omitempty" json:"-"`
	Source    string   `yaml:"source,omitempty" json:"-"`
}

// WithheldSpec is a .e line removed from the preset and bound to a button.
type WithheldSpec struct {
	Line       string `yaml:"line"`
	Button     string `yaml:"button"` // init | read | "" (dropped)
	Occurrence int    `yaml:"occurrence"`
}

// RunSpec configures the run phase.
type RunSpec struct {
	Buttons      []string         `yaml:"buttons"`
	Watch        []string         `yaml:"watch"`
	Idle         IdleSpec         `yaml:"idle"`
	Speeds       map[string]Speed `yaml:"speeds"`
	DefaultSpeed string           `yaml:"defaultSpeed"`
}

// IdleSpec: QuietMs is "auto" or a number of milliseconds.
type IdleSpec struct {
	QuietMs string `yaml:"quietMs"`
}

// Speed is one entry of the speeds table: the ONLY values the bridge sends.
type Speed struct {
	Rate int    `yaml:"rate" json:"rate"`
	Op   string `yaml:"op,omitempty" json:"op,omitempty"` // optional s cy.op value (co)
}

// Selftest is the headless known-answer check (architecture 5.9.5 rule 8).
type Selftest struct {
	Inits  int              `yaml:"inits"`
	Expect map[string]int64 `yaml:"expect"` // accumulator -> decoded value after the INITs
}

// Content is the non-step copy of a mission. It is an M1 amendment to the
// 5.9.2 schema (dev plan section 7 item 3): the briefing (S3, "0a"), the
// plan ("0b"), the S5 "rest is done for you" card, the run rail and its
// lamp-triggered captions (S6), and the result (S7).
type Content struct {
	Briefing Card       `yaml:"briefing" json:"briefing"`
	Plan     Card       `yaml:"plan" json:"plan"`
	Rest     Card       `yaml:"rest" json:"rest"`
	Run      RunContent `yaml:"run" json:"run"`
	Result   Card       `yaml:"result" json:"result"`
}

// Card is a headline/body screen with optional extras.
type Card struct {
	Headline    string   `yaml:"headline" json:"headline"`
	Body        string   `yaml:"body" json:"body"`
	More        string   `yaml:"more,omitempty" json:"more,omitempty"`
	Math        string   `yaml:"math,omitempty" json:"math,omitempty"`
	Takeaway    string   `yaml:"takeaway,omitempty" json:"takeaway,omitempty"`
	TakeawaySub string   `yaml:"takeawaySub,omitempty" json:"takeawaySub,omitempty"`
	Buttons     []string `yaml:"buttons,omitempty" json:"buttons,omitempty"`
	Review      Review   `yaml:"review,omitempty" json:"-"`
}

// RunContent is the S6 rail copy.
type RunContent struct {
	Before  RailPrompt   `yaml:"before" json:"before"`
	Presses []PressCopy  `yaml:"presses" json:"presses"`
	Tape    string       `yaml:"tape" json:"tape"` // notebook tape line template, e.g. "{a1} x {a1} = {a2}"
	Extras  RunExtras    `yaml:"extras" json:"extras"`
	Review  Review       `yaml:"review,omitempty" json:"-"`
}

// RailPrompt is the rail headline with an optional sub-line.
type RailPrompt struct {
	Headline string `yaml:"headline" json:"headline"`
	Sub      string `yaml:"sub,omitempty" json:"sub,omitempty"`
}

// PressCopy is the rail headline and caption sequence for one INIT press.
type PressCopy struct {
	Press    int       `yaml:"press" json:"press"`
	Headline string    `yaml:"headline" json:"headline"`
	Captions []Caption `yaml:"captions" json:"captions"`
}

// Caption fires in the UI when its trigger becomes true on real lamp state
// (UX F2). Trigger grammar: {accProg: {acc: "1", program: 6}} (that program
// flip-flop lit) or {run: idle|busy}. Placeholders {a1}, {a2} ... are the
// settled accumulator values.
type Caption struct {
	Text    string  `yaml:"text" json:"text"`
	Trigger Trigger `yaml:"trigger" json:"trigger"`
}

type Trigger struct {
	AccProg *AccProgTrigger `yaml:"accProg,omitempty" json:"accProg,omitempty"`
	Run     string          `yaml:"run,omitempty" json:"run,omitempty"`
}

type AccProgTrigger struct {
	Acc     string `yaml:"acc" json:"acc"`
	Program int    `yaml:"program" json:"program"`
}

// RunExtras are the controls that appear after a given press (UX 8.1.4).
type RunExtras struct {
	AfterPress   int    `yaml:"afterPress" json:"afterPress"`
	KeepPressing string `yaml:"keepPressing" json:"keepPressing"`
	ShowResult   string `yaml:"showResult" json:"showResult"`
	SkipToAnswer string `yaml:"skipToAnswer" json:"skipToAnswer"`
	Hint         string `yaml:"hint,omitempty" json:"hint,omitempty"`
	StopAt       string `yaml:"stopAt" json:"stopAt"` // checkpoint that ends autopress
}
