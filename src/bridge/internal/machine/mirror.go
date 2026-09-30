package machine

import (
	"errors"
	"sync"
	"time"

	"eniac-kiosk/bridge/internal/status"
)

// Punch is one card from the core, in order (architecture 5.4, M2 UI).
type Punch struct {
	N      int      `json:"n"`
	Text   string   `json:"text"`
	Fields []string `json:"fields"`
}

// PunchFields splits an 80-character card into 16 five-character fields.
func PunchFields(text string) []string {
	f := make([]string, 0, 16)
	for i := 0; i+5 <= len(text) && len(f) < 16; i += 5 {
		f = append(f, text[i:i+5])
	}
	return f
}

// Mirror is the bridge's copy of the machine. Status lines are applied on
// the vlink reader goroutine; ticks (TakeDelta) run on the session's 33 ms
// ticker. All methods are safe for concurrent use.
type Mirror struct {
	mu        sync.Mutex
	st        State
	sent      map[string]any // snapshot as of the last TakeDelta
	seq       uint64
	lastNonCy time.Time
	cards     []Punch // last 20
	nCards    int
	drops     *status.DropLog
	now       func() time.Time

	// OnPunch is called (under no lock) for each punched card, in order.
	OnPunch func(Punch)
}

// NewMirror returns a mirror at the upstream initial state.
func NewMirror(drops *status.DropLog) *Mirror {
	m := &Mirror{st: Initial(), drops: drops, now: time.Now}
	m.sent = m.st.Snapshot()
	return m
}

// SetClock replaces time.Now (tests).
func (m *Mirror) SetClock(now func() time.Time) { m.now = now }

// ApplyLine parses and applies one raw status line. Malformed lines are
// dropped (and logged, rate-limited); they never panic (FR-04).
func (m *Mirror) ApplyLine(line string) {
	ev, d := status.Parse(line)
	if d != nil {
		if m.drops != nil {
			m.drops.Record(line, d)
		}
		return
	}
	m.Apply(ev)
}

// Apply applies one parsed event.
func (m *Mirror) Apply(ev status.Event) {
	if ev.Kind == status.Punch {
		m.mu.Lock()
		m.nCards++
		p := Punch{N: m.nCards, Text: ev.Str, Fields: PunchFields(ev.Str)}
		m.cards = append(m.cards, p)
		if len(m.cards) > 20 {
			m.cards = m.cards[len(m.cards)-20:]
		}
		m.lastNonCy = m.now()
		cb := m.OnPunch
		m.mu.Unlock()
		if cb != nil {
			cb(p)
		}
		return
	}
	m.mu.Lock()
	_, nonCycle := m.st.Apply(ev)
	if nonCycle {
		m.lastNonCy = m.now()
	}
	m.mu.Unlock()
}

// TakeDelta returns the merge patch since the previous call, with a new
// sequence number, or ok=false if nothing changed.
func (m *Mirror) TakeDelta() (seq uint64, patch map[string]any, ok bool) {
	m.mu.Lock()
	defer m.mu.Unlock()
	cur := m.st.Snapshot()
	patch = Diff(m.sent, cur)
	if patch == nil {
		return m.seq, nil, false
	}
	m.sent = cur
	m.seq++
	return m.seq, patch, true
}

// Snapshot returns the state as of the last TakeDelta together with its
// seq, so that snapshot + later frames is always consistent.
func (m *Mirror) Snapshot() (seq uint64, machine map[string]any, cards []Punch) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.seq, Clone(m.sent), append([]Punch(nil), m.cards...)
}

// State returns a copy of the live state (not the last-sent snapshot).
func (m *Mirror) State() State {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.st
}

// LastNonCycleChange is when anything other than the cycling unit last
// changed (the idle detector's quiet clock).
func (m *Mirror) LastNonCycleChange() time.Time {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.lastNonCy
}

// Cards returns the number of cards punched so far.
func (m *Mirror) Cards() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.nCards
}

// ErrPunchOverflow means a client fell more than PunchQueueMax cards behind.
// The session treats it as E-CORE-DOWN rather than silently dropping cards.
var ErrPunchOverflow = errors.New("punch queue overflow")

// PunchQueueMax bounds a client's unsent cards (architecture 5.4).
const PunchQueueMax = 5000

// Coalescer is one client's outbox for machine updates: frame patches merge
// (a slow client converges instead of queueing), punches queue in order up
// to PunchQueueMax. The core reader never waits on it.
type Coalescer struct {
	mu       sync.Mutex
	pending  map[string]any
	seq      uint64
	punches  []Punch
	overflow bool
	ready    chan struct{}
}

func NewCoalescer() *Coalescer { return &Coalescer{ready: make(chan struct{}, 1)} }

// Ready is signalled whenever there is something to take.
func (c *Coalescer) Ready() <-chan struct{} { return c.ready }

func (c *Coalescer) signal() {
	select {
	case c.ready <- struct{}{}:
	default:
	}
}

// AddFrame merges a patch into the pending one.
func (c *Coalescer) AddFrame(seq uint64, patch map[string]any) {
	c.mu.Lock()
	c.pending = Merge(c.pending, Clone(patch))
	c.seq = seq
	c.mu.Unlock()
	c.signal()
}

// AddPunch queues a card. It fails once the queue is full.
func (c *Coalescer) AddPunch(p Punch) error {
	c.mu.Lock()
	if len(c.punches) >= PunchQueueMax {
		c.overflow = true
		c.mu.Unlock()
		return ErrPunchOverflow
	}
	c.punches = append(c.punches, p)
	c.mu.Unlock()
	c.signal()
	return nil
}

// Reset drops everything pending (after a full state resync).
func (c *Coalescer) Reset() {
	c.mu.Lock()
	c.pending, c.punches, c.overflow = nil, nil, false
	c.mu.Unlock()
}

// Take removes and returns everything pending.
func (c *Coalescer) Take() (seq uint64, patch map[string]any, punches []Punch) {
	c.mu.Lock()
	defer c.mu.Unlock()
	seq, patch, punches = c.seq, c.pending, c.punches
	c.pending, c.punches = nil, nil
	return
}
