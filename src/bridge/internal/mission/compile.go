package mission

import (
	"sort"
	"strconv"

	"eniac-kiosk/bridge/internal/econfig"
)

// Compiled is the UI-ready mission served by GET /api/missions/{id}
// (architecture 5.9.3). The UI never parses .e text.
type Compiled struct {
	ID          string         `json:"id"`
	Title       string         `json:"title"`
	Order       int            `json:"order"`
	Summary     string         `json:"summary"`
	Ordered     bool           `json:"ordered"`
	Config      []ConfigItem   `json:"config"`
	Steps       []CompiledStep `json:"steps"`
	Counts      Counts         `json:"counts"`
	Units       []string       `json:"units"`
	Run         CompiledRun    `json:"run"`
	Checkpoints []string       `json:"checkpoints"`
	Result      string         `json:"result"`
	Content     Content        `json:"content"`
	Credits     []string       `json:"credits"`
}

// ConfigItem is one p or s line of the whole program, with its owner:
// "preset", "step:<id>" or "withheld".
type ConfigItem struct {
	Kind   string `json:"kind"` // plug | switch
	From   string `json:"from,omitempty"`
	To     string `json:"to,omitempty"`
	Cable  string `json:"cable,omitempty"` // data | program
	Switch string `json:"switch,omitempty"`
	Value  string `json:"value,omitempty"`
	Owner  string `json:"owner"`
}

// CompiledStep is a step with its targets resolved from the .e line.
type CompiledStep struct {
	ID        string   `json:"id"`
	Kind      string   `json:"kind"` // plug | switch
	From      string   `json:"from,omitempty"`
	To        string   `json:"to,omitempty"`
	FromClass string   `json:"fromClass,omitempty"`
	ToClass   string   `json:"toClass,omitempty"`
	Cable     string   `json:"cable,omitempty"`
	Switch    string   `json:"switch,omitempty"`
	Value     string   `json:"value,omitempty"`
	Family    string   `json:"family,omitempty"`
	Choices   []string `json:"choices,omitempty"`
	Text      StepText `json:"text"`
}

type Counts struct {
	PresetCables   int `json:"presetCables"`
	PresetSwitches int `json:"presetSwitches"`
	StepCables     int `json:"stepCables"`
	StepSwitches   int `json:"stepSwitches"`
}

type CompiledRun struct {
	Buttons      []string `json:"buttons"`
	Speeds       []string `json:"speeds"`
	DefaultSpeed string   `json:"defaultSpeed"`
	Watch        []string `json:"watch"`
}

// Summary is one entry of GET /api/missions.
type Summary struct {
	ID        string   `json:"id"`
	Title     string   `json:"title"`
	Order     int      `json:"order"`
	Summary   string   `json:"summary"`
	Buttons   []string `json:"buttons"`
	Available bool     `json:"available"`
	Reason    string   `json:"reason,omitempty"`
}

func (m *Mission) compile() *Compiled {
	f := m.File
	c := &Compiled{ID: f.ID, Title: f.Title, Order: f.Order, Summary: f.Summary, Ordered: f.Ordered,
		Result: f.Result, Content: f.Content, Credits: f.Credits}
	owner := map[int]string{}
	for id, l := range m.stepLine {
		owner[l.Num] = "step:" + id
	}
	for _, l := range m.withheld {
		owner[l.Num] = "withheld"
	}
	units := map[string]bool{}
	trunks := false
	for _, l := range m.lines {
		o := owner[l.Num]
		if o == "" {
			o = "preset"
		}
		switch {
		case l.Plug != nil:
			c.Config = append(c.Config, ConfigItem{Kind: "plug", From: l.Plug.From.Canon, To: l.Plug.To.Canon, Cable: l.Plug.Cable(), Owner: o})
			for _, t := range []econfig.Terminal{l.Plug.From, l.Plug.To} {
				if t.IsTrunk() {
					trunks = true
				} else {
					units[t.Unit] = true
				}
			}
			if o == "preset" {
				c.Counts.PresetCables++
			} else if o != "withheld" {
				c.Counts.StepCables++
			}
		case l.Sw != nil:
			c.Config = append(c.Config, ConfigItem{Kind: "switch", Switch: l.Sw.Name, Value: l.Sw.Canon, Owner: o})
			if l.Sw.Unit != "cy" {
				units[l.Sw.Unit] = true
			}
			if o == "preset" {
				c.Counts.PresetSwitches++
			} else if o != "withheld" {
				c.Counts.StepSwitches++
			}
		}
	}
	c.Units = orderUnits(units, trunks)
	for _, s := range f.Steps {
		l := m.stepLine[s.ID]
		st := CompiledStep{ID: s.ID, Text: s.Text}
		if l.Plug != nil {
			st.Kind, st.From, st.To = "plug", l.Plug.From.Canon, l.Plug.To.Canon
			st.FromClass, st.ToClass, st.Cable = l.Plug.From.Class, l.Plug.To.Class, l.Plug.Cable()
		} else {
			st.Kind, st.Switch, st.Value, st.Family = "switch", l.Sw.Name, l.Sw.Canon, l.Sw.Family
			if len(s.Choices) > 0 {
				for _, ch := range s.Choices {
					canon, _ := econfig.InCatalog(*l.Sw, ch)
					st.Choices = append(st.Choices, canon)
				}
			} else {
				st.Choices = econfig.Catalog(*l.Sw)
			}
		}
		c.Steps = append(c.Steps, st)
	}
	speeds := make([]string, 0, len(f.Run.Speeds))
	for n := range f.Run.Speeds {
		speeds = append(speeds, n)
	}
	// Slowest first: a stable, meaningful order for a speed control.
	sort.Slice(speeds, func(i, j int) bool {
		ri, rj := f.Run.Speeds[speeds[i]].Rate, f.Run.Speeds[speeds[j]].Rate
		if ri == 0 {
			ri = 1 << 30
		}
		if rj == 0 {
			rj = 1 << 30
		}
		if ri != rj {
			return ri < rj
		}
		return speeds[i] < speeds[j]
	})
	c.Run = CompiledRun{Buttons: f.Run.Buttons, Speeds: speeds, DefaultSpeed: f.Run.DefaultSpeed, Watch: f.Run.Watch}
	for _, cp := range f.Checkpoints {
		c.Checkpoints = append(c.Checkpoints, cp.ID)
	}
	return c
}

// orderUnits: i, c, a1..a20 (numeric), anything else, then "trunks".
func orderUnits(units map[string]bool, trunks bool) []string {
	var out []string
	for _, u := range []string{"i", "c"} {
		if units[u] {
			out = append(out, u)
		}
	}
	for n := 1; n <= 20; n++ {
		if u := "a" + strconv.Itoa(n); units[u] {
			out = append(out, u)
		}
	}
	var rest []string
	for u := range units {
		if u != "i" && u != "c" && !(len(u) > 1 && u[0] == 'a' && isNum(u[1:])) {
			rest = append(rest, u)
		}
	}
	sort.Strings(rest)
	out = append(out, rest...)
	if trunks {
		out = append(out, "trunks")
	}
	return out
}

func isNum(s string) bool {
	_, err := strconv.Atoi(s)
	return err == nil
}

// SummaryOf returns the /api/missions entry for a mission.
func SummaryOf(m *Mission) Summary {
	return Summary{ID: m.File.ID, Title: m.File.Title, Order: m.File.Order, Summary: m.File.Summary,
		Buttons: m.File.Run.Buttons, Available: m.Available, Reason: m.Reason}
}
