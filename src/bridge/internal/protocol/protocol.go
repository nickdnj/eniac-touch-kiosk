// Package protocol holds the Go types for every websocket message
// (architecture 5.3-5.6). It is the source of truth: `make protogen` runs
// tygo to generate protocol.gen.ts from this file, and a test fails if the
// committed TypeScript is stale.
//
// Transport: ws://127.0.0.1:8740/ws, JSON text frames, one message per
// frame, {"t": "<type>", ...}. Client messages may carry "id" (an integer);
// replies and errors echo it as "re".
package protocol

// Version is the protocol integer sent in hello.
const Version = 1

// MaxClientFrame bounds a client message. Larger frames are BAD_MESSAGE.
const MaxClientFrame = 4096

// Error codes for `error` messages (5.4).
const (
	ErrBusy        = "BUSY"
	ErrBadState    = "BAD_STATE"
	ErrUnknownStep = "UNKNOWN_STEP"
	ErrNotAllowed  = "NOT_ALLOWED"
	ErrBadMessage  = "BAD_MESSAGE"
)

// Session states (5.5).
const (
	StateNone     = "none"
	StateStarting = "starting"
	StateSetup    = "setup"
	StateArmed    = "armed"
	StateRunning  = "running"
	StateResult   = "result"
	StateFailed   = "failed"
)

// Core health values.
const (
	CoreStarting = "starting"
	CoreUp       = "up"
	CoreDown     = "down"
)

// ---------------------------------------------------------------------------
// Server -> client

// Hello is sent on connect.
type Hello struct {
	T        string      `json:"t" tstype:"'hello'"`
	Protocol int         `json:"protocol"`
	Build    string      `json:"build"`
	Config   HelloConfig `json:"config"`
	Health   Health      `json:"health"`
}

type HelloConfig struct {
	Idle  IdleConfig  `json:"idle"`
	Admin AdminConfig `json:"admin"`
}

// IdleConfig carries FR-32 timeouts to the UI.
type IdleConfig struct {
	SetupS     int `json:"setupS"`
	RunS       int `json:"runS"`
	CountdownS int `json:"countdownS"`
}

type AdminConfig struct {
	TapZone TapZone `json:"tapZone"`
}

// TapZone is the hidden admin corner (UX F5, UX 7 common frame: 120x96).
type TapZone struct {
	Corner   string `json:"corner"`
	WidthPx  int    `json:"widthPx"`
	HeightPx int    `json:"heightPx"`
	Taps     int    `json:"taps"`
}

// State is a full snapshot: after hello, on every new session and on resync.
type State struct {
	T       string        `json:"t" tstype:"'state'"`
	Session *Session      `json:"session" tstype:"Session | null"`
	Seq     uint64        `json:"seq"`
	Machine map[string]any `json:"machine" tstype:"MachineState"`
	Cards   []Card        `json:"cards"`
	Run     RunInfo       `json:"run"`
}

// RunInfo is the current run state inside `state`.
type RunInfo struct {
	State   string           `json:"state"`
	Inits   int              `json:"inits"`
	Settled map[string]int64 `json:"settled,omitempty"`
}

// Frame is a JSON Merge Patch (RFC 7396) against MachineState, at most
// 30 per second while a session exists and something changed. Apply it only
// if seq is greater than the seq of the last state/frame applied.
type Frame struct {
	T   string         `json:"t" tstype:"'frame'"`
	Seq uint64         `json:"seq"`
	D   map[string]any `json:"d" tstype:"MachinePatch"`
}

// Session is a session state change. With T empty it is also the session
// object inside `state` (null when there is no session).
type Session struct {
	T         string   `json:"t,omitempty" tstype:"'session'"`
	ID        string   `json:"id"`
	Mission   string   `json:"mission"`
	Mode      string   `json:"mode"`
	State     string   `json:"state"`
	Applied   []string `json:"applied"`
	Remaining int      `json:"remaining"`
}

// StepApplied follows the core's ack of a step line.
type StepApplied struct {
	T         string `json:"t" tstype:"'step_applied'"`
	Re        *int64 `json:"re,omitempty"`
	Step      string `json:"step"`
	Assisted  bool   `json:"assisted"`
	Remaining int    `json:"remaining"`
}

// SetupComplete: all steps applied, normally or via skip_setup.
type SetupComplete struct {
	T       string `json:"t" tstype:"'setup_complete'"`
	Re      *int64 `json:"re,omitempty"`
	Skipped int    `json:"skipped"`
}

// Run is a busy <-> idle transition (UX F2).
type Run struct {
	T       string           `json:"t" tstype:"'run'"`
	State   string           `json:"state" tstype:"'busy' | 'idle'"`
	Inits   int              `json:"inits"`
	Settled map[string]int64 `json:"settled,omitempty"`
}

// Checkpoint: a mission predicate became true (once per session).
type Checkpoint struct {
	T  string `json:"t" tstype:"'checkpoint'"`
	ID string `json:"id"`
}

// Punch is one card, in order, never coalesced (M2).
type Punch struct {
	T      string   `json:"t" tstype:"'punch'"`
	N      int      `json:"n"`
	Text   string   `json:"text"`
	Fields []string `json:"fields"`
}

// Card is a punched card inside `state.cards` (the last 20).
type Card struct {
	N      int      `json:"n"`
	Text   string   `json:"text"`
	Fields []string `json:"fields"`
}

// Health reports the core's state (5.8). With T empty it is the health
// object inside hello.
type Health struct {
	T           string `json:"t,omitempty" tstype:"'health'"`
	Core        string `json:"core" tstype:"'starting' | 'up' | 'down'"`
	Code        string `json:"code,omitempty"`
	Detail      string `json:"detail,omitempty"`
	Attempt     int    `json:"attempt,omitempty"`
	Of          int    `json:"of,omitempty"`
	Final       bool   `json:"final,omitempty"`
	KioskClient bool   `json:"kioskClient"`
}

// Error is a rejected client action.
type Error struct {
	T       string `json:"t" tstype:"'error'"`
	Re      *int64 `json:"re,omitempty"`
	Code    string `json:"code" tstype:"'BUSY' | 'BAD_STATE' | 'UNKNOWN_STEP' | 'NOT_ALLOWED' | 'BAD_MESSAGE'"`
	Message string `json:"message"`
}

// Pong answers ping.
type Pong struct {
	T  string `json:"t" tstype:"'pong'"`
	Re *int64 `json:"re,omitempty"`
}

// ---------------------------------------------------------------------------
// Client -> server (the whitelist, FR-02, 5.6)

type StartMission struct {
	T       string `json:"t" tstype:"'start_mission'"`
	ID      *int64 `json:"id,omitempty"`
	Mission string `json:"mission"`
	Mode    string `json:"mode" tstype:"'visitor' | 'docent' | 'attract'"`
}

type ApplyStep struct {
	T        string `json:"t" tstype:"'apply_step'"`
	ID       *int64 `json:"id,omitempty"`
	Step     string `json:"step"`
	Assisted bool   `json:"assisted"`
}

type SkipSetup struct {
	T  string `json:"t" tstype:"'skip_setup'"`
	ID *int64 `json:"id,omitempty"`
}

type Button struct {
	T  string `json:"t" tstype:"'button'"`
	ID *int64 `json:"id,omitempty"`
	B  string `json:"b" tstype:"'init' | 'clear' | 'read'"`
}

type SetSpeed struct {
	T     string `json:"t" tstype:"'set_speed'"`
	ID    *int64 `json:"id,omitempty"`
	Speed string `json:"speed"`
}

type EndSession struct {
	T      string `json:"t" tstype:"'end_session'"`
	ID     *int64 `json:"id,omitempty"`
	Reason string `json:"reason" tstype:"'idle' | 'menu' | 'restart' | 'done'"`
}

// Metric is an anonymous UI event (architecture 8.3); it never reaches the core.
type Metric struct {
	T       string `json:"t" tstype:"'metric'"`
	ID      *int64 `json:"id,omitempty"`
	Ev      string `json:"ev" tstype:"'wrong_tap' | 'step_done' | 'speed' | 'skip_to_answer' | 'setup_skipped' | 'idle_reset'"`
	Mission string `json:"mission,omitempty"`
	Step    string `json:"step,omitempty"`
	Speed   string `json:"speed,omitempty"`
	Screen  string `json:"screen,omitempty"`
	N       *int64 `json:"n,omitempty"`
}

type Ping struct {
	T  string `json:"t" tstype:"'ping'"`
	ID *int64 `json:"id,omitempty"`
}

// ---------------------------------------------------------------------------
// MachineState (5.4). The bridge encodes it from nested maps; these structs
// document the shape and generate the TypeScript type. All keys are 1-based
// .e unit numbers; bit and digit vectors are strings; there are no arrays.

type MachineState struct {
	Cycle CycleState          `json:"cycle"`
	Init  string              `json:"init"`
	Acc   map[string]AccState `json:"acc"`
	MP    MPState             `json:"mp"`
	FT    map[string]FTState  `json:"ft"`
	CT    string              `json:"ct"`
	Mult  MultState           `json:"mult"`
	Div   DivState            `json:"div"`
}

type CycleState struct {
	Pos  int    `json:"pos"`
	Mode string `json:"mode" tstype:"'' | 'P' | 'A' | 'C'"`
}

type AccState struct {
	Sign   string `json:"sign" tstype:"'P' | 'M'"`
	Digits string `json:"digits"`
	Value  int64  `json:"value"`
	Carry  string `json:"carry"`
	Rep    int    `json:"rep"`
	Prog   string `json:"prog"`
}

type MPState struct {
	Stage string `json:"stage"`
	Dec   string `json:"dec"`
	Inff  string `json:"inff"`
}

type FTState struct {
	Arg   string `json:"arg"`
	Ring  int    `json:"ring"`
	Add   int    `json:"add"`
	Sub   int    `json:"sub"`
	Argff int    `json:"argff"`
}

type MultState struct {
	Stage int    `json:"stage"`
	FF    string `json:"ff"`
	R1    int    `json:"r1"`
	R3    int    `json:"r3"`
}

type DivState struct {
	Place  int    `json:"place"`
	Prog   int    `json:"prog"`
	ProgFF string `json:"progff"`
	Flags  string `json:"flags"`
}

// ---------------------------------------------------------------------------
// HTTP: GET /healthz (5.8). Loopback in M1; LAN :8741 in M3 prod. The Pi
// block (temperature, throttling) arrives in M3.

type Healthz struct {
	Status   string          `json:"status" tstype:"'ok' | 'degraded' | 'down'"`
	Version  string          `json:"version"`
	Upstream HealthzUpstream `json:"upstream"`
	Core     HealthzCore     `json:"core"`
	Bridge   HealthzBridge   `json:"bridge"`
	Kiosk    HealthzKiosk    `json:"kiosk"`
	Session  *HealthzSession `json:"session"`
}

type HealthzUpstream struct {
	Commit  string   `json:"commit"`
	Patches []string `json:"patches"`
}

type HealthzCore struct {
	State         string        `json:"state"`
	Pid           int           `json:"pid,omitempty"`
	UptimeS       int64         `json:"uptimeS,omitempty"`
	Restarts5m    int           `json:"restarts5m"`
	RestartsTotal int           `json:"restartsTotal"`
	LastError     *HealthzError `json:"lastError,omitempty"`
}

type HealthzError struct {
	Code   string `json:"code"`
	Detail string `json:"detail,omitempty"`
	At     string `json:"at"`
}

type HealthzBridge struct {
	UptimeS int64 `json:"uptimeS"`
}

type HealthzKiosk struct {
	ClientConnected bool   `json:"clientConnected"`
	LastPingAgoS    *int64 `json:"lastPingAgoS"`
}

type HealthzSession struct {
	Mission string `json:"mission"`
	State   string `json:"state"`
}
