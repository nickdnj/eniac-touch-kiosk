package machine

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"sync"
)

// Predicate is a mission checkpoint condition over MachineState
// (architecture 5.9.2). Forms: {acc: n, eq|gte|lte: int},
// {punchCount: {gte|eq: n}}, {punchField: {index: i, eq|startsWith: "..."}}
// (true once ANY card punched in this session matches) and the
// combinators all/any. {init: ...} and {mp: ...} are not implemented yet.
type Predicate struct {
	Acc        string      `yaml:"acc,omitempty" json:"acc,omitempty"`
	Eq         *int64      `yaml:"eq,omitempty" json:"eq,omitempty"`
	Gte        *int64      `yaml:"gte,omitempty" json:"gte,omitempty"`
	Lte        *int64      `yaml:"lte,omitempty" json:"lte,omitempty"`
	PunchCount *CountCmp   `yaml:"punchCount,omitempty" json:"punchCount,omitempty"`
	PunchField *FieldMatch `yaml:"punchField,omitempty" json:"punchField,omitempty"`
	All        []Predicate `yaml:"all,omitempty" json:"all,omitempty"`
	Any        []Predicate `yaml:"any,omitempty" json:"any,omitempty"`
}

// CountCmp compares the number of cards punched in this session.
type CountCmp struct {
	Gte *int `yaml:"gte,omitempty" json:"gte,omitempty"`
	Eq  *int `yaml:"eq,omitempty" json:"eq,omitempty"`
}

// FieldMatch matches one 5-character field (0-based index 0..15) of a card:
// Eq is the whole field, StartsWith its beginning (for example "-", the
// sign of a negative number punched from that column).
type FieldMatch struct {
	Index      int    `yaml:"index" json:"index"`
	Eq         string `yaml:"eq,omitempty" json:"eq,omitempty"`
	StartsWith string `yaml:"startsWith,omitempty" json:"startsWith,omitempty"`
}

// Match reports whether a card's field matches.
func (f FieldMatch) Match(p Punch) bool {
	if f.Index < 0 || f.Index >= len(p.Fields) {
		return false
	}
	v := p.Fields[f.Index]
	if f.Eq != "" && v != f.Eq {
		return false
	}
	if f.StartsWith != "" && !strings.HasPrefix(v, f.StartsWith) {
		return false
	}
	return true
}

// Validate checks the predicate is one the bridge can evaluate.
func (p Predicate) Validate() error {
	n := 0
	if p.Acc != "" {
		n++
	}
	if p.PunchCount != nil {
		n++
	}
	if p.PunchField != nil {
		n++
	}
	if len(p.All) > 0 {
		n++
	}
	if len(p.Any) > 0 {
		n++
	}
	if n != 1 {
		return errors.New("predicate must have exactly one of acc, punchCount, punchField, all, any")
	}
	switch {
	case p.Acc != "":
		a, err := strconv.Atoi(p.Acc)
		if err != nil || a < 1 || a > 20 || strconv.Itoa(a) != p.Acc {
			return fmt.Errorf("predicate acc %q must be \"1\"..\"20\"", p.Acc)
		}
		c := 0
		for _, v := range []*int64{p.Eq, p.Gte, p.Lte} {
			if v != nil {
				c++
			}
		}
		if c == 0 {
			return errors.New("acc predicate needs eq, gte or lte")
		}
	case p.PunchCount != nil:
		c := p.PunchCount
		if (c.Gte == nil) == (c.Eq == nil) {
			return errors.New("punchCount needs exactly one of gte or eq")
		}
		for _, v := range []*int{c.Gte, c.Eq} {
			if v != nil && *v < 0 {
				return errors.New("punchCount must be >= 0")
			}
		}
	case p.PunchField != nil:
		f := p.PunchField
		if f.Index < 0 || f.Index > 15 {
			return fmt.Errorf("punchField index %d must be 0..15", f.Index)
		}
		if f.Eq == "" && f.StartsWith == "" {
			return errors.New("punchField needs eq or startsWith")
		}
		if len(f.Eq) > 5 || len(f.StartsWith) > 5 {
			return errors.New("punchField values are at most 5 characters (one field)")
		}
	case len(p.All) > 0:
		for _, q := range p.All {
			if err := q.Validate(); err != nil {
				return err
			}
		}
	default:
		for _, q := range p.Any {
			if err := q.Validate(); err != nil {
				return err
			}
		}
	}
	return nil
}

// Eval evaluates the predicate against a state.
func (p Predicate) Eval(s *State) bool {
	switch {
	case p.Acc != "":
		a, _ := strconv.Atoi(p.Acc)
		if a < 1 || a > 20 {
			return false
		}
		v := s.Acc[a-1].Value()
		if p.Eq != nil && v != *p.Eq {
			return false
		}
		if p.Gte != nil && v < *p.Gte {
			return false
		}
		if p.Lte != nil && v > *p.Lte {
			return false
		}
		return true
	case p.PunchCount != nil:
		n := s.Punched
		if p.PunchCount.Gte != nil && n < *p.PunchCount.Gte {
			return false
		}
		if p.PunchCount.Eq != nil && n != *p.PunchCount.Eq {
			return false
		}
		return true
	case p.PunchField != nil:
		for _, c := range s.Cards {
			if p.PunchField.Match(c) {
				return true
			}
		}
		return false
	case len(p.All) > 0:
		for _, q := range p.All {
			if !q.Eval(s) {
				return false
			}
		}
		return true
	case len(p.Any) > 0:
		for _, q := range p.Any {
			if q.Eval(s) {
				return true
			}
		}
	}
	return false
}

// Checkpoint is a named predicate.
type Checkpoint struct {
	ID   string    `yaml:"id" json:"id"`
	When Predicate `yaml:"when" json:"when"`
}

// Checkpoints evaluates a mission's checkpoints, edge-triggered: each one
// fires at most once per session, the first time it becomes true.
type Checkpoints struct {
	mu    sync.Mutex
	list  []Checkpoint
	fired map[string]bool
}

func NewCheckpoints(list []Checkpoint) *Checkpoints {
	return &Checkpoints{list: list, fired: map[string]bool{}}
}

// Evaluate returns the IDs that became true now, in declaration order.
func (c *Checkpoints) Evaluate(s *State) []string {
	c.mu.Lock()
	defer c.mu.Unlock()
	var out []string
	for _, cp := range c.list {
		if c.fired[cp.ID] {
			continue
		}
		if cp.When.Eval(s) {
			c.fired[cp.ID] = true
			out = append(out, cp.ID)
		}
	}
	return out
}

// Fired reports whether a checkpoint has fired.
func (c *Checkpoints) Fired(id string) bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.fired[id]
}
