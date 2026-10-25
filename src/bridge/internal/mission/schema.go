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
	Minutes       int                   `yaml:"minutes"`  // picker: "About N min" (UX 8.4, FR-10)
	Requires      []string              `yaml:"requires"` // local upstream patches the mission needs (e.g. 0002-ft-repeat-default)
	Assets        map[string]string     `yaml:"assets"`   // input files in the upstream runtime dir, by sha256 (e.g. demo.card)
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
	Finale        *FinaleCopy           `yaml:"finale,omitempty"`
	Selftest      *Selftest             `yaml:"selftest"`
	Credits       []string              `yaml:"credits"`
}

// FinaleCopy is this mission's sentence on the finale's first beat (UX 14.5.3),
// so a new mission needs no change to the web UI. `figure` is shown when this
// visit produced real numbers; `words` otherwise. Placeholders: {n} {square}
// (Squares), {cards} {last} (card missions), {hops} (plotted flights). A
// sentence of `figure` whose placeholders were not all seen is left out; if
// none remain, `words` is shown (never a guess).
type FinaleCopy struct {
	Words  string `yaml:"words" json:"words"`
	Figure string `yaml:"figure,omitempty" json:"figure,omitempty"`
	Review Review `yaml:"review,omitempty" json:"-"`
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
	// InitOnce: INIT may be pressed once per session (Primes and
	// Trajectory run until they finish; a second INIT would corrupt the
	// run, spike S2). The bridge rejects the second one.
	InitOnce bool `yaml:"initOnce"`
	// InitAfter: INIT is rejected until this checkpoint fired (Trajectory:
	// the card has been read).
	InitAfter string `yaml:"initAfter"`
	// FreezeAt: when this checkpoint fires the bridge stops the clock with
	// `s cy.op 1a` (whitelisted), keeping the machine as it is (Trajectory:
	// the landing card; otherwise trajdemo flies again by itself).
	FreezeAt string `yaml:"freezeAt"`
	// Cards and Plot tell the UI how to draw punched cards and the
	// trajectory from card fields (UX 8.5 item 9), so no mission is code.
	Cards *CardPane `yaml:"cards,omitempty"`
	Plot  *Plot     `yaml:"plot,omitempty"`
}

// CardPane: which columns the card graphic shows, which fields make the
// card's number, and the pane style (UX 8.2.5 / 8.3.5, FR-21).
type CardPane struct {
	Window [2]int  `yaml:"window" json:"window"`         // first and last card column shown (1..80)
	Value  []int   `yaml:"value" json:"value"`           // field indices (0..15) joined into the card's number
	Hop    []int   `yaml:"hop,omitempty" json:"hop,omitempty"` // field indices holding a hop/sequence number
	Style  string  `yaml:"style" json:"style"`           // stack (newest large, older rows) | film (film strip)
	Keep   int     `yaml:"keep" json:"keep"`             // cards kept on screen (20)
	Bars   *Bars   `yaml:"bars,omitempty" json:"bars,omitempty"`
}

// Bars: one bar per `per` numbers from 1 to upTo, each card adds 1 to the
// bar of its number (UX 8.2.5 "primes per hundred").
type Bars struct {
	Per  int `yaml:"per" json:"per"`
	UpTo int `yaml:"upTo" json:"upTo"`
}

// Plot: a dot per card at (x, y) from card fields (UX 8.3.5 "the arc").
type Plot struct {
	X []int `yaml:"x" json:"x"`
	Y []int `yaml:"y" json:"y"`
}

// IdleSpec: QuietMs is "auto" or a number of milliseconds.
type IdleSpec struct {
	QuietMs string `yaml:"quietMs"`
}

// Speed is one entry of the speeds table: the ONLY values the bridge sends.
type Speed struct {
	Rate int    `yaml:"rate" json:"rate"`
	Op   string `yaml:"op,omitempty" json:"op,omitempty"` // optional s cy.op value (co)
	// StallMs: a busy run that makes no progress this long at this speed
	// raises E-CORE-DOWN/stall (S10 and recovery). Progress is a punched
	// card if the mission has run.cards, else an accumulator change. 0 =
	// no guard (Squares rests between presses). Chosen from the measured
	// timings: well above the longest normal gap at that speed.
	StallMs int `yaml:"stallMs,omitempty" json:"-"`
}

// Selftest is the headless known-answer check (architecture 5.9.5 rule 8).
// M1: INIT n times with idle waits, then compare accumulators. M2 adds
// READ first, a wait-until predicate instead of idle (runs that never go
// idle), and expected card fields.
type Selftest struct {
	Read   bool                `yaml:"read"`   // press READ (its withheld lines) and wait for idle first
	Inits  int                 `yaml:"inits"`
	Until  *machine.Predicate  `yaml:"until"`  // wait for this after the INITs instead of idle
	Expect map[string]int64    `yaml:"expect"` // accumulator -> decoded value after the INITs
	Cards  []CardExpect        `yaml:"cards"`  // the first len(values) cards' field[index]
}

// CardExpect: cards 1..len(Values) carry Values in field Index (0..15).
type CardExpect struct {
	Index  int      `yaml:"index"`
	Values []string `yaml:"values"`
}

// Content is the non-step copy of a mission. It is an M1 amendment to the
// 5.9.2 schema (dev plan section 7 item 3): the briefing (S3, "0a"), the
// plan ("0b"), the S5 "rest is done for you" card, the run rail and its
// lamp-triggered captions (S6), and the result (S7).
type Content struct {
	Briefing Card         `yaml:"briefing" json:"briefing"`
	Plan     Card         `yaml:"plan" json:"plan"`
	Rest     Card         `yaml:"rest" json:"rest"`
	Read     *ReadContent `yaml:"read,omitempty" json:"read,omitempty"`
	Run      RunContent   `yaml:"run" json:"run"`
	Result   Card         `yaml:"result" json:"result"`
	// YourTurn is the optional challenge after the result: predict the next row
	// from the visitor's own cards, then dial a different number into one step
	// and run the machine again (Difference). Nil for missions without it.
	YourTurn *YourTurn `yaml:"yourTurn,omitempty" json:"yourTurn,omitempty"`
	// Game makes the mission a target game: the visitor aims, ENIAC flies, the UI scores (Gunnery).
	Game *Game `yaml:"game,omitempty" json:"game,omitempty"`
}

// YourTurn is the "Your turn" copy and the one step the visitor may set freely.
type YourTurn struct {
	Step    string      `yaml:"step" json:"step"`     // id of a switch step; the visitor may pick any of its choices
	Button  string      `yaml:"button" json:"button"` // the result screen's button
	Predict PredictCopy `yaml:"predict" json:"predict"`
	Dial    StepText    `yaml:"dial" json:"dial"` // replaces the step's text while the visitor chooses
	Compare CompareCopy `yaml:"compare" json:"compare"`
	Review  Review      `yaml:"review,omitempty" json:"-"`
}

// PredictCopy is the guess-the-next-row screen. {row} is the row asked for, {v} its real value, {from} the
// value above it and {d} the change added to it; every number comes from the visitor's own punched cards.
type PredictCopy struct {
	Headline string `yaml:"headline" json:"headline"`
	Body     string `yaml:"body" json:"body"`
	Ask      string `yaml:"ask" json:"ask"`
	Right    string `yaml:"right" json:"right"`
	Wrong    string `yaml:"wrong" json:"wrong"`
	Go       string `yaml:"go" json:"go"`   // the button that moves on to the dial
	Show     int    `yaml:"show" json:"show"` // how many of the first rows to show before asking for the next (2 to 12)
	// Change lists the card fields (5-character fields, as run.cards.value) that hold the change added to the
	// table value on that card, so the UI can show it beside each row.
	Change []int `yaml:"change" json:"change"`
}

// CompareCopy is the result of the second run: the first table beside the visitor's own.
type CompareCopy struct {
	Headline string `yaml:"headline" json:"headline"`
	Body     string `yaml:"body" json:"body"` // {n} is the number the visitor chose, {first} the original
	First    string `yaml:"first" json:"first"`
	Yours    string `yaml:"yours" json:"yours"`
	Same     string `yaml:"same" json:"same"`   // shown when the visitor picked the original number
	Button   string `yaml:"button" json:"button"` // another try
}

// ReadContent is the READ beat before INIT (Trajectory, UX 8.3.5).
type ReadContent struct {
	Before     RailPrompt `yaml:"before" json:"before"`         // "Press READ"
	Headline   string     `yaml:"headline" json:"headline"`     // while reading
	Captions   []Caption  `yaml:"captions" json:"captions"`
	InitLocked string     `yaml:"initLocked" json:"initLocked"` // INIT's label until the card is read
	Review     Review     `yaml:"review,omitempty" json:"-"`
}

// LiveLine is the result screen's line that keeps counting with the
// machine (UX 8.2.5 / 8.3.5). {n} is the number of cards.
type LiveLine struct {
	Waiting string `yaml:"waiting,omitempty" json:"waiting,omitempty"` // before the result checkpoint
	Pending string `yaml:"pending,omitempty" json:"pending,omitempty"` // after it, while the machine still works
	Done    string `yaml:"done,omitempty" json:"done,omitempty"`       // after doneAt
	DoneAt  string `yaml:"doneAt,omitempty" json:"doneAt,omitempty"`   // checkpoint id
}

// CardsCopy is the card pane's text. {n} card number, {v} card value.
type CardsCopy struct {
	Title  string `yaml:"title" json:"title"`
	Label  string `yaml:"label" json:"label"` // under the big card, e.g. "Prime number {n}: {v}"
	Count  string `yaml:"count" json:"count"` // "Cards: {n}"
	Latest string `yaml:"latest,omitempty" json:"latest,omitempty"` // "Latest: {v}"
	Empty  string `yaml:"empty" json:"empty"` // "No cards yet."
	Bars   string `yaml:"bars,omitempty" json:"bars,omitempty"`
}

// PlotCopy is the trajectory plot's text (no units until fact-checked).
type PlotCopy struct {
	X       string `yaml:"x" json:"x"`
	Y       string `yaml:"y" json:"y"`
	Dot     string `yaml:"dot" json:"dot"`         // "Each dot is one card."
	Stretch string `yaml:"stretch" json:"stretch"` // "Height stretched so you can see it."
	Apex    string `yaml:"apex" json:"apex"`
	Landed  string `yaml:"landed" json:"landed"`
	Cross   string `yaml:"cross" json:"cross"` // label of the interpolated ground crossing
}

// Card is a headline/body screen with optional extras.
type Card struct {
	Headline    string   `yaml:"headline" json:"headline"`
	Body        string   `yaml:"body" json:"body"`
	More        string   `yaml:"more,omitempty" json:"more,omitempty"`
	Math        string   `yaml:"math,omitempty" json:"math,omitempty"`
	Takeaway    string    `yaml:"takeaway,omitempty" json:"takeaway,omitempty"`
	TakeawaySub string    `yaml:"takeawaySub,omitempty" json:"takeawaySub,omitempty"`
	Live        *LiveLine `yaml:"live,omitempty" json:"live,omitempty"`
	Buttons     []string  `yaml:"buttons,omitempty" json:"buttons,omitempty"`
	Review      Review    `yaml:"review,omitempty" json:"-"`
}

// RunContent is the S6 rail copy.
type RunContent struct {
	Before  RailPrompt  `yaml:"before" json:"before"`
	Presses []PressCopy `yaml:"presses" json:"presses"`
	Tape    string      `yaml:"tape,omitempty" json:"tape,omitempty"` // notebook tape line template, e.g. "{a1} x {a1} = {a2}"
	Extras  RunExtras   `yaml:"extras" json:"extras"`
	Done    *RailPrompt `yaml:"done,omitempty" json:"done,omitempty"` // rail after the result checkpoint (Trajectory "You did it!")
	Cards   *CardsCopy  `yaml:"cards,omitempty" json:"cards,omitempty"`
	Plot    *PlotCopy   `yaml:"plot,omitempty" json:"plot,omitempty"`
	Note    string      `yaml:"note,omitempty" json:"note,omitempty"` // one line under the readouts ("ENIAC does a lot of arithmetic for every hop.")
	Chain   *ChainSpec  `yaml:"chain,omitempty" json:"chain,omitempty"` // card missions: the run stage shows these accumulators, live, beside the cards
	Review  Review      `yaml:"review,omitempty" json:"-"`
}

// ChainSpec is the run stage for a card mission that works on a few named
// accumulators (Difference): each row shows the accumulator's live value and
// its lamps, top to bottom in the order given. Missions without it get the
// stage their card style names.
type ChainSpec struct {
	Title string     `yaml:"title" json:"title"`
	Rows  []ChainRow `yaml:"rows" json:"rows"`
}

// ChainRow is one accumulator in a ChainSpec.
type ChainRow struct {
	Acc  string `yaml:"acc" json:"acc"`   // "1".."20"
	Name string `yaml:"name" json:"name"` // what it holds, in the mission's words
	Sub  string `yaml:"sub,omitempty" json:"sub,omitempty"`
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
	AccProg    *AccProgTrigger `yaml:"accProg,omitempty" json:"accProg,omitempty"`
	Run        string          `yaml:"run,omitempty" json:"run,omitempty"`
	Acc        *AccEqTrigger   `yaml:"acc,omitempty" json:"acc,omitempty"`               // that accumulator reads exactly eq
	PunchCount *CountTrigger   `yaml:"punchCount,omitempty" json:"punchCount,omitempty"` // that many cards punched
	Init       string          `yaml:"init,omitempty" json:"init,omitempty"`             // that initiating-unit lamp lit (rdff, prff, ...)
	Derived    string          `yaml:"derived,omitempty" json:"derived,omitempty"`       // apex | landed, computed by the UI from the cards
}

type AccEqTrigger struct {
	Acc string `yaml:"acc" json:"acc"`
	Eq  int64  `yaml:"eq" json:"eq"`
}

type CountTrigger struct {
	Gte int `yaml:"gte" json:"gte"`
}

type AccProgTrigger struct {
	Acc     string `yaml:"acc" json:"acc"`
	Program int    `yaml:"program" json:"program"`
}

// RunExtras are the controls that appear after a given press (UX 8.1.4),
// or after a number of cards (Primes and Trajectory).
type RunExtras struct {
	AfterPress   int    `yaml:"afterPress" json:"afterPress"`
	AfterCards   int    `yaml:"afterCards,omitempty" json:"afterCards,omitempty"`
	AutoResultMs int    `yaml:"autoResultMs,omitempty" json:"autoResultMs,omitempty"` // go to S7 this long after the result checkpoint
	Headline     string `yaml:"headline,omitempty" json:"headline,omitempty"`         // rail headline once the extras show ("Primes pile up")
	KeepPressing string `yaml:"keepPressing,omitempty" json:"keepPressing,omitempty"`
	ShowResult   string `yaml:"showResult" json:"showResult"`
	SkipToAnswer string `yaml:"skipToAnswer" json:"skipToAnswer"`
	Hint         string `yaml:"hint,omitempty" json:"hint,omitempty"`
	StopAt       string `yaml:"stopAt" json:"stopAt"` // checkpoint that ends autopress
}
