package mission

import (
	"fmt"
	"math"
	"strings"

	"eniac-kiosk/bridge/internal/econfig"
)

// Game turns a card mission into a target game (Gunnery): the visitor aims the
// gun by choosing a charge and an elevation, the bridge dials the matching
// launch speeds into the Constant Transmitter's J (across) and K (up) dials,
// and ENIAC flies the shell for real. The score is worked out by the UI from
// the visitor's own punched cards.
type Game struct {
	// Kind is how the target is drawn: "flag" (Gunnery, the default) or "ship" (Battleship).
	Kind string `yaml:"kind,omitempty" json:"kind,omitempty"`
	// Ships, when present, are the visitor's own ships: each carries some of the charges (its guns), so choosing
	// a ship narrows the guns. Without them every charge is on offer.
	Ships      []Ship      `yaml:"ships,omitempty" json:"ships,omitempty"`
	Charges    []Charge    `yaml:"charges" json:"charges"`
	Elevations []Elevation `yaml:"elevations" json:"elevations"`
	Targets    []Target    `yaml:"targets" json:"targets"`
	Score      ScoreRule   `yaml:"score" json:"score"`
	Aim        AimCopy     `yaml:"aim" json:"aim"`
	Board      BoardCopy   `yaml:"board" json:"board"`
	Tour       []TourStop  `yaml:"tour" json:"tour"`
	Blurb      string      `yaml:"blurb" json:"blurb"` // the picker card\'s meta line
	Build      BuildCopy   `yaml:"build" json:"build"`
	Review     Review      `yaml:"review,omitempty" json:"-"`
}

// TourStop is one stop of the walk through the room after the shot is aimed: the
// unit (or run of units, From to To, by room id) to look at, and why it is used.
type TourStop struct {
	From  string `yaml:"from" json:"from"`
	To    string `yaml:"to" json:"to"`
	Title string `yaml:"title" json:"title"`
	Text  string `yaml:"text" json:"text"`
}

// BuildCopy is the walk-the-room screen's text. {cables} and {switches} are the program's totals,
// {n} and {total} the stop.
type BuildCopy struct {
	Headline string `yaml:"headline" json:"headline"`
	Intro    string `yaml:"intro" json:"intro"`
	Count    string `yaml:"count" json:"count"`
	Next     string `yaml:"next" json:"next"`
	Back     string `yaml:"back" json:"back"`
	Skip     string `yaml:"skip" json:"skip"`
	Go       string `yaml:"go" json:"go"`
}

// Charge is a powder charge: the speed the shell leaves the gun, in feet per second.
type Charge struct {
	ID    string `yaml:"id" json:"id"`
	Label string `yaml:"label" json:"label"`
	Speed int    `yaml:"speed" json:"speed"`
}

// Elevation is the angle of the gun above flat, in degrees.
type Elevation struct {
	ID  string  `yaml:"id" json:"id"`
	Deg float64 `yaml:"deg" json:"deg"`
}

// Ship is one of the visitor's ships and the charges (guns) it carries.
type Ship struct {
	ID    string   `yaml:"id" json:"id"`
	Label string   `yaml:"label" json:"label"`
	Guns  []string `yaml:"guns" json:"guns"`
}

// Target is a distance the visitor may be asked to hit, in feet. Name says what is there ("Enemy cruiser"),
// and Hit, when set, is this target's own hit radius in feet (a big hull is easier to hit than a small one).
type Target struct {
	ID   string `yaml:"id" json:"id"`
	Feet int    `yaml:"feet" json:"feet"`
	Name string `yaml:"name,omitempty" json:"name,omitempty"`
	Hit  int    `yaml:"hit,omitempty" json:"hit,omitempty"`
}

// ScoreRule: a miss of HitFeet or less scores Max; the score falls in a straight line to 0 at ZeroFeet.
type ScoreRule struct {
	Max      int `yaml:"max" json:"max"`
	HitFeet  int `yaml:"hitFeet" json:"hitFeet"`
	ZeroFeet int `yaml:"zeroFeet" json:"zeroFeet"`
}

// AimCopy is the aim screen's text. {feet} is the target distance.
type AimCopy struct {
	Headline string `yaml:"headline" json:"headline"`
	Body     string `yaml:"body" json:"body"`
	Target   string `yaml:"target" json:"target"`
	Charge   string `yaml:"charge" json:"charge"`
	Ship     string `yaml:"ship,omitempty" json:"ship,omitempty"`         // heading of the ship choice (Battleship)
	ShipBy   string `yaml:"shipBy,omitempty" json:"shipBy,omitempty"`     // its hint
	PickShip string `yaml:"pickShip,omitempty" json:"pickShip,omitempty"` // shown in the gun row until a ship is chosen
	ChargeBy string `yaml:"chargeBy" json:"chargeBy"`
	Elev     string `yaml:"elev" json:"elev"`
	ElevBy   string `yaml:"elevBy" json:"elevBy"`
	Speed    string `yaml:"speed" json:"speed"` // {n} feet per second
	Button   string `yaml:"button" json:"button"`
	Pick     string `yaml:"pick" json:"pick"`
	Dialled  string `yaml:"dialled" json:"dialled"` // run screen: the shot set on the dials, in place of card fields F and G
	Zones    string `yaml:"zones" json:"zones"`     // aim screen: what the colours mean
	Across   string `yaml:"across" json:"across"`   // {n} feet per second, along the ground
	Up       string `yaml:"up" json:"up"`           // {n} feet per second, straight up
}

// BoardCopy is the result screen's scoring and top-scores text.
type BoardCopy struct {
	Landed    string `yaml:"landed" json:"landed"`     // {feet}
	Hit       string `yaml:"hit" json:"hit"`           // direct hit
	Miss      string `yaml:"miss" json:"miss"`         // {feet}, {side}
	Short     string `yaml:"short" json:"short"`       // the shell fell short
	Long      string `yaml:"long" json:"long"`         // the shell flew past
	Score     string `yaml:"score" json:"score"`       // {n}
	Top       string `yaml:"top" json:"top"`           // heading
	Empty     string `yaml:"empty" json:"empty"`       // no scores yet
	NameAsk   string `yaml:"nameAsk" json:"nameAsk"`   // initials prompt
	NameSave  string `yaml:"nameSave" json:"nameSave"` // the pad\'s save key
	NameSkip  string `yaml:"nameSkip" json:"nameSkip"` // the pad\'s way out
	NameBad   string `yaml:"nameBad" json:"nameBad"`   // a name the board will not carry
	NameFail  string `yaml:"nameFail" json:"nameFail"` // the score could not be saved
	Save      string `yaml:"save" json:"save"`
	Ranks     []Rank `yaml:"ranks" json:"ranks"`
	Beat      string `yaml:"beat" json:"beat"`           // aim screen: {n} the best score today
	RankToday string `yaml:"rankToday" json:"rankToday"` // {n}: where this score stands today
	Best      string `yaml:"best" json:"best"`           // {n}: best this visit
	Shots     string `yaml:"shots" json:"shots"`         // {n}: shots fired this visit
	Flag      string `yaml:"flag" json:"flag"`           // the flag, on the plot
	MissBy    string `yaml:"missBy" json:"missBy"`       // {feet} {side}
	SideShort string `yaml:"sideShort" json:"sideShort"`
	SideLong  string `yaml:"sideLong" json:"sideLong"`
	Again     string `yaml:"again" json:"again"`
	Today     string `yaml:"today" json:"today"`
	AllTime   string `yaml:"allTime" json:"allTime"`
}

// Rank is a title earned at a score of Min or more (listed best first).
type Rank struct {
	Min   int    `yaml:"min" json:"min"`
	Title string `yaml:"title" json:"title"`
}

// AimLines returns the core commands that dial the shot in. The launch speeds
// are in feet per second with four decimals, ten digits each, J across and K up.
func (m *Mission) AimLines(charge, elev string) ([]string, error) {
	g := m.File.Content.Game
	if g == nil {
		return nil, fmt.Errorf("this mission has no gun to aim")
	}
	var c *Charge
	for i := range g.Charges {
		if g.Charges[i].ID == charge {
			c = &g.Charges[i]
		}
	}
	var e *Elevation
	for i := range g.Elevations {
		if g.Elevations[i].ID == elev {
			e = &g.Elevations[i]
		}
	}
	if c == nil || e == nil {
		return nil, fmt.Errorf("unknown shot %q %q", charge, elev)
	}
	rad := e.Deg * math.Pi / 180
	across := int64(math.Round(float64(c.Speed) * math.Cos(rad) * 10000))
	up := int64(math.Round(float64(c.Speed) * math.Sin(rad) * 10000))
	var out []string
	for _, d := range []struct {
		reg string
		v   int64
	}{{"j", across}, {"k", up}} {
		out = append(out, "s c."+d.reg+"l P", "s c."+d.reg+"r P")
		s := fmt.Sprintf("%010d", d.v)
		for i := 0; i < 10; i++ {
			out = append(out, fmt.Sprintf("s c.%s%d %c", d.reg, 10-i, s[i]))
		}
	}
	return out, nil
}

func (m *Mission) checkGame() {
	g := m.File.Content.Game
	if g == nil {
		return
	}
	if len(g.Charges) < 2 || len(g.Elevations) < 2 || len(g.Targets) < 1 {
		m.fail("game needs at least two charges, two elevations and one target")
		return
	}
	seen := map[string]bool{}
	for _, c := range g.Charges {
		if !idRe.MatchString(c.ID) || c.Speed < 100 || c.Speed > 3000 || seen["c"+c.ID] {
			m.fail("game.charges: bad or repeated charge %q (speed 100 to 3000)", c.ID)
		}
		seen["c"+c.ID] = true
	}
	for _, e := range g.Elevations {
		if !idRe.MatchString(e.ID) || e.Deg <= 0 || e.Deg >= 90 || seen["e"+e.ID] {
			m.fail("game.elevations: bad or repeated elevation %q (0 to 90 degrees)", e.ID)
		}
		seen["e"+e.ID] = true
	}
	for _, t := range g.Targets {
		if t.Feet < 1000 || t.Feet > 200000 || t.Hit < 0 || t.Hit >= g.Score.ZeroFeet {
			m.fail("game.targets: %q out of range", t.ID)
		}
	}
	if g.Kind != "" && g.Kind != "flag" && g.Kind != "ship" {
		m.fail("game.kind must be flag or ship, got %q", g.Kind)
	}
	for _, sh := range g.Ships {
		if !idRe.MatchString(sh.ID) || strings.TrimSpace(sh.Label) == "" || len(sh.Guns) == 0 {
			m.fail("game.ships: %q needs an id, a label and guns", sh.ID)
			continue
		}
		for _, id := range sh.Guns {
			if !seen["c"+id] {
				m.fail("game.ships: %q carries an unknown gun %q", sh.ID, id)
			}
		}
	}
	if g.Score.Max <= 0 || g.Score.HitFeet < 0 || g.Score.ZeroFeet <= g.Score.HitFeet {
		m.fail("game.score: need max > 0 and zeroFeet > hitFeet")
	}
	if m.File.Run.Cards == nil || m.File.Run.Plot == nil {
		m.fail("game needs run.cards and run.plot: the score is read from the visitor's own cards")
	}
	for _, s := range []string{g.Aim.Headline, g.Aim.Body, g.Aim.Button, g.Aim.Dialled, g.Aim.Across, g.Aim.Up, g.Board.Top, g.Board.Score, g.Board.Again} {
		if strings.TrimSpace(s) == "" {
			m.fail("game copy has an empty field")
			break
		}
	}
	if len(g.Tour) == 0 {
		m.fail("game.tour needs at least one stop")
	}
	for _, t := range g.Tour {
		if t.From == "" || t.To == "" || strings.TrimSpace(t.Title) == "" || strings.TrimSpace(t.Text) == "" {
			m.fail("game.tour: every stop needs from, to, title and text")
			break
		}
	}
	for _, c := range []string{g.Build.Headline, g.Build.Intro, g.Build.Next, g.Build.Go, g.Build.Count} {
		if strings.TrimSpace(c) == "" {
			m.fail("game.build copy has an empty field")
			break
		}
	}
	if len(g.Board.Ranks) == 0 {
		m.fail("game.board.ranks needs at least one rank")
	}
	for i, r := range g.Board.Ranks {
		if strings.TrimSpace(r.Title) == "" || (i > 0 && r.Min >= g.Board.Ranks[i-1].Min) {
			m.fail("game.board.ranks must be titled and listed best first")
			break
		}
	}
	for _, c := range g.Charges {
		for _, e := range g.Elevations {
			lines, err := m.AimLines(c.ID, e.ID)
			if err != nil {
				m.fail("game: %v", err)
				return
			}
			for _, l := range lines {
				ln, ok := econfig.ParseLine(l)
				if !ok {
					m.fail("game: dial line %q does not parse", l)
					return
				}
				if errs := econfig.Validate([]econfig.Line{ln}); len(errs) > 0 {
					m.fail("game: dial line %q: %v", l, errs[0])
					return
				}
			}
		}
	}
}
