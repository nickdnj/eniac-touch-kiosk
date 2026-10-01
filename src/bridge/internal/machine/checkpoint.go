package machine

import (
	"errors"
	"fmt"
	"strconv"
	"sync"
)

// Predicate is a mission checkpoint condition over MachineState
// (architecture 5.9.2). M1 supports {acc: n, eq|gte|lte: int} and the
// combinators all/any. The M2 forms (punchCount, punchField, init, mp) are
// rejected by Validate until they are implemented.
type Predicate struct {
	Acc string      `yaml:"acc,omitempty" json:"acc,omitempty"`
	Eq  *int64      `yaml:"eq,omitempty" json:"eq,omitempty"`
	Gte *int64      `yaml:"gte,omitempty" json:"gte,omitempty"`
	Lte *int64      `yaml:"lte,omitempty" json:"lte,omitempty"`
	All []Predicate `yaml:"all,omitempty" json:"all,omitempty"`
	Any []Predicate `yaml:"any,omitempty" json:"any,omitempty"`
}

// Validate checks the predicate is one M1 can evaluate.
func (p Predicate) Validate() error {
	n := 0
	if p.Acc != "" {
		n++
	}
	if len(p.All) > 0 {
		n++
	}
	if len(p.Any) > 0 {
		n++
	}
	if n != 1 {
		return errors.New("predicate must have exactly one of acc, all, any")
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
