// Package uiswitch is the bridge's side of the Original UI switch
// (docs/original-ui-switch.md 4 and 6). Brian L. Stuart's Tk front end is
// an X11 app, so showing it means the kiosk session swaps Chromium for it
// on the same display. The bridge never touches the display: it writes a
// one-line request file into a tmpfs directory it shares with the kiosk
// user (2770 eniac:eniac-kiosk), and the kiosk-session loop acts on it
// within a second. Nothing here signals another user's process, and
// nothing survives a reboot (ADR-OUI-2, ADR-OUI-3).
//
// Three files, each one line of space-separated key=value pairs that bash
// parses without tools; writers always write <name>.tmp and rename:
//
//	mode    bridge -> session   mode=tour id=3f9a1c2e at=1759851234 idleS=300 warnS=30 ttlS=10 door=visitor
//	active  session -> bridge   mode=tour id=3f9a1c2e since=1759851235
//	last    session -> bridge   mode=tour door=visitor id=3f9a1c2e cause=idle durS=301
//
// A request is fresh while now-at <= ttlS. The session acts only on fresh
// requests, so one it never saw can never fire later.
package uiswitch

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io/fs"
	"log/slog"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"eniac-kiosk/bridge/internal/config"
)

// Modes, doors and causes (the only values the files may carry).
const (
	ModeTour        = "tour"        // visitor: eniactk -D, the self-running room tour
	ModeInteractive = "interactive" // staff: eniactk with its own buttons

	DoorVisitor = "visitor" // the Explore tile, over the websocket
	DoorStaff   = "staff"   // S13 Admin, after the PIN
	DoorRemote  = "remote"  // `eniac-touch-kiosk original-ui ...` over SSH

	CauseTap    = "tap"    // Back to kiosk
	CauseIdle   = "idle"   // idle timeout
	CauseFailed = "failed" // preflight or a crash
	CauseRemote = "remote" // withdrawn over SSH, or killed
)

// Reasons Available reports false.
const (
	ReasonDisabled    = "disabled"      // originalUi.enabled: false
	ReasonNoSwitchDir = "no-switch-dir" // paths.uiSwitch missing or not writable
	ReasonNotBuilt    = "not-built"     // <release>/original-ui/bin/eniactk missing
	ReasonNoTk        = "no-tk"         // originalUi.wish missing (apt package tk)
	ReasonRunning     = "running"       // the original UI is on screen now
)

// File names inside the switch directory.
const (
	FileMode   = "mode"
	FileActive = "active"
	FileLast   = "last"
)

// Options configure a Switcher. FromConfig fills them from config.yaml.
type Options struct {
	Dir              string // paths.uiSwitch
	OriginalUI       string // paths.originalUi (<release>/original-ui)
	Wish             string // originalUi.wish
	Enabled          bool
	TourIdleS        int
	InteractiveIdleS int
	WarnS            int
	TTLS             int
	MinGapS          int

	// Seams (tests).
	Now      func() time.Time
	Stat     func(string) (fs.FileInfo, error)
	Writable func(dir string) error
	NewID    func() string
	Log      *slog.Logger
}

// FromConfig maps config.yaml onto Options.
func FromConfig(c config.Config) Options {
	o := c.OriginalUI
	return Options{Dir: c.Paths.UISwitch, OriginalUI: c.Paths.OriginalUI, Wish: o.Wish, Enabled: o.Enabled,
		TourIdleS: o.TourIdleS, InteractiveIdleS: o.InteractiveIdleS, WarnS: o.WarnS, TTLS: o.RequestTTLS, MinGapS: o.MinGapS}
}

// Request is the content of the mode file.
type Request struct {
	Mode  string
	ID    string
	At    int64
	IdleS int
	WarnS int
	TTLS  int
	Door  string
}

// Fresh reports whether the session may still act on the request.
func (r Request) Fresh(now time.Time) bool {
	age := now.Unix() - r.At
	return age >= 0 && age <= int64(r.TTLS)
}

// Line is the request as written to the mode file.
func (r Request) Line() string {
	return fmt.Sprintf("mode=%s id=%s at=%d idleS=%d warnS=%d ttlS=%d door=%s\n", r.Mode, r.ID, r.At, r.IdleS, r.WarnS, r.TTLS, r.Door)
}

// Active is the content of the active file (the original UI is on screen).
type Active struct {
	Mode  string
	ID    string
	Since int64
}

// Exit is the content of the last file (how the original UI ended).
type Exit struct {
	Mode  string
	Door  string
	ID    string
	Cause string
	DurS  int
}

// ErrUnavailable is returned by Request when the switch can't be used.
type ErrUnavailable struct{ Reason string }

func (e *ErrUnavailable) Error() string { return "original UI unavailable: " + e.Reason }

// ErrBadRequest rejects a mode or door the switch doesn't know.
var ErrBadRequest = errors.New("original UI: bad mode or door")

// Switcher writes requests and reads the session's files. Safe for
// concurrent use; the files are the only state shared with the session.
type Switcher struct {
	o      Options
	mu     sync.Mutex
	last   *Request // the last request this process wrote
	lastAt time.Time
}

// New returns a Switcher. Unset seams get the real implementations.
func New(o Options) *Switcher {
	if o.Now == nil {
		o.Now = time.Now
	}
	if o.Stat == nil {
		o.Stat = os.Stat
	}
	if o.Writable == nil {
		o.Writable = func(dir string) error { return syscall.Access(dir, 0x2) } // W_OK
	}
	if o.NewID == nil {
		o.NewID = func() string {
			b := make([]byte, 4)
			rand.Read(b)
			return hex.EncodeToString(b)
		}
	}
	if o.Log == nil {
		o.Log = slog.Default()
	}
	return &Switcher{o: o}
}

// Options returns the switcher's settings (the idle limits for hello).
func (s *Switcher) Options() Options { return s.o }

func (s *Switcher) path(name string) string { return filepath.Join(s.o.Dir, name) }

// Available reports whether a request could be acted on now, and why not.
// All checks are cheap stat calls; it is evaluated on every hello.
func (s *Switcher) Available() (bool, string) {
	if ok, reason := s.installed(); !ok {
		return false, reason
	}
	if _, ok := s.ReadActive(); ok {
		return false, ReasonRunning
	}
	return true, ""
}

// installed checks everything but "running".
func (s *Switcher) installed() (bool, string) {
	if !s.o.Enabled {
		return false, ReasonDisabled
	}
	if st, err := s.o.Stat(s.o.Dir); err != nil || !st.IsDir() || s.o.Writable(s.o.Dir) != nil {
		return false, ReasonNoSwitchDir
	}
	if st, err := s.o.Stat(filepath.Join(s.o.OriginalUI, "bin", "eniactk")); err != nil || st.IsDir() {
		return false, ReasonNotBuilt
	}
	if st, err := s.o.Stat(s.o.Wish); err != nil || st.IsDir() {
		return false, ReasonNoTk
	}
	return true, ""
}

// Request asks the kiosk session to show the original UI. It returns the
// request and repeat=true, writing nothing, when one is already pending or
// running, or the last one this process wrote is less than minGapS old:
// the caller answers with the same id. A stale or malformed mode file is
// replaced.
func (s *Switcher) Request(mode, door string) (Request, bool, error) {
	if (mode != ModeTour && mode != ModeInteractive) || !validDoor(door) {
		return Request{}, false, ErrBadRequest
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if ok, reason := s.installed(); !ok {
		return Request{}, false, &ErrUnavailable{Reason: reason}
	}
	now := s.o.Now()
	if a, ok := s.ReadActive(); ok {
		r, err := s.readMode()
		if err != nil || r.ID != a.ID {
			r = Request{Mode: a.Mode, ID: a.ID, At: a.Since}
		}
		return r, true, nil
	}
	if r, err := s.readMode(); err == nil {
		if r.Fresh(now) {
			return r, true, nil
		}
		s.o.Log.Info("ui: stale request removed", "id", r.ID, "ageS", now.Unix()-r.At)
		os.Remove(s.path(FileMode))
	} else if !errors.Is(err, fs.ErrNotExist) {
		s.o.Log.Warn("ui: malformed request removed", "err", err)
		os.Remove(s.path(FileMode))
	}
	if s.last != nil && s.o.MinGapS > 0 && now.Sub(s.lastAt) < time.Duration(s.o.MinGapS)*time.Second {
		return *s.last, true, nil
	}
	idle := s.o.TourIdleS
	if mode == ModeInteractive {
		idle = s.o.InteractiveIdleS
	}
	r := Request{Mode: mode, ID: s.o.NewID(), At: now.Unix(), IdleS: idle, WarnS: s.o.WarnS, TTLS: s.o.TTLS, Door: door}
	if err := checkRequest(r); err != nil {
		return Request{}, false, err
	}
	if err := writeAtomic(s.path(FileMode), r.Line()); err != nil {
		return Request{}, false, fmt.Errorf("writing the request: %w", err)
	}
	s.last, s.lastAt = &r, now
	s.o.Log.Info("ui: switch requested", "mode", r.Mode, "door", r.Door, "id", r.ID)
	return r, false, nil
}

// Withdraw deletes the mode file (SSH `original-ui off`). The session's
// withdrawal watcher then closes the original UI. It reports whether a
// request was there.
func (s *Switcher) Withdraw() (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	err := os.Remove(s.path(FileMode))
	if errors.Is(err, fs.ErrNotExist) {
		return false, nil
	}
	return err == nil, err
}

// ReadActive returns the active file if it exists and is valid.
func (s *Switcher) ReadActive() (Active, bool) {
	b, err := os.ReadFile(s.path(FileActive))
	if err != nil {
		return Active{}, false
	}
	a, err := ParseActive(string(b))
	return a, err == nil
}

// ConsumeLast reads, validates and deletes the last file. It returns
// (nil, nil) when there is none. A malformed file is deleted too, and
// only whitelisted values are ever returned (the file is written by
// another user; architecture 9 security notes).
func (s *Switcher) ConsumeLast() (*Exit, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	p := s.path(FileLast)
	b, err := os.ReadFile(p)
	if errors.Is(err, fs.ErrNotExist) {
		return nil, nil
	}
	os.Remove(p)
	if err != nil {
		return nil, err
	}
	e, err := ParseExit(string(b))
	if err != nil {
		return nil, err
	}
	return &e, nil
}

// Files returns the raw content of the three files (for `ui-request
// --mode status`); a missing file is "".
func (s *Switcher) Files() map[string]string {
	out := map[string]string{}
	for _, n := range []string{FileMode, FileActive, FileLast} {
		b, _ := os.ReadFile(s.path(n))
		out[n] = strings.TrimSpace(string(b))
	}
	return out
}

func (s *Switcher) readMode() (Request, error) {
	b, err := os.ReadFile(s.path(FileMode))
	if err != nil {
		return Request{}, err
	}
	return ParseRequest(string(b))
}

// writeAtomic writes <path>.tmp (0640: the setgid directory makes the
// group eniac-kiosk) and renames it over path.
func writeAtomic(path, content string) error {
	tmp := path + ".tmp"
	f, err := os.OpenFile(tmp, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0o640)
	if err != nil {
		return err
	}
	if _, err = f.WriteString(content); err == nil {
		err = f.Chmod(0o640)
	}
	if cerr := f.Close(); err == nil {
		err = cerr
	}
	if err != nil {
		os.Remove(tmp)
		return err
	}
	if err := os.Rename(tmp, path); err != nil {
		os.Remove(tmp)
		return err
	}
	return nil
}

// ---------------------------------------------------------------------------
// Parsing: strict, one line, exactly the expected keys in any order.

var (
	idRe  = regexp.MustCompile(`^[0-9a-f]{8}$`)
	numRe = regexp.MustCompile(`^[0-9]{1,12}$`)
)

func parseKV(line string, keys ...string) (map[string]string, error) {
	line = strings.TrimSuffix(line, "\n")
	if line == "" || strings.ContainsAny(line, "\n\r\t") || len(line) > 256 {
		return nil, errors.New("not one line")
	}
	m := map[string]string{}
	for _, f := range strings.Split(line, " ") {
		k, v, ok := strings.Cut(f, "=")
		if !ok || k == "" || v == "" {
			return nil, fmt.Errorf("bad field %q", f)
		}
		if _, dup := m[k]; dup {
			return nil, fmt.Errorf("duplicate key %s", k)
		}
		m[k] = v
	}
	if len(m) != len(keys) {
		return nil, fmt.Errorf("want keys %v", keys)
	}
	for _, k := range keys {
		if _, ok := m[k]; !ok {
			return nil, fmt.Errorf("missing key %s", k)
		}
	}
	return m, nil
}

func num(s string, lo, hi int64) (int64, error) {
	if !numRe.MatchString(s) {
		return 0, fmt.Errorf("not a number: %q", s)
	}
	n, err := strconv.ParseInt(s, 10, 64)
	if err != nil || n < lo || n > hi {
		return 0, fmt.Errorf("out of range: %q", s)
	}
	return n, nil
}

func validMode(m string) bool { return m == ModeTour || m == ModeInteractive }
func validDoor(d string) bool { return d == DoorVisitor || d == DoorStaff || d == DoorRemote }
func validCause(c string) bool {
	return c == CauseTap || c == CauseIdle || c == CauseFailed || c == CauseRemote
}

const maxEpoch = 1 << 40

// ParseRequest parses a mode file.
func ParseRequest(line string) (Request, error) {
	m, err := parseKV(line, "mode", "id", "at", "idleS", "warnS", "ttlS", "door")
	if err != nil {
		return Request{}, err
	}
	r := Request{Mode: m["mode"], ID: m["id"], Door: m["door"]}
	at, err1 := num(m["at"], 0, maxEpoch)
	idle, err2 := num(m["idleS"], 60, 7200)
	warn, err3 := num(m["warnS"], 0, 120)
	ttl, err4 := num(m["ttlS"], 1, 60)
	if err := errors.Join(err1, err2, err3, err4); err != nil {
		return Request{}, err
	}
	r.At, r.IdleS, r.WarnS, r.TTLS = at, int(idle), int(warn), int(ttl)
	return r, checkRequest(r)
}

func checkRequest(r Request) error {
	switch {
	case !validMode(r.Mode):
		return fmt.Errorf("bad mode %q", r.Mode)
	case !idRe.MatchString(r.ID):
		return fmt.Errorf("bad id %q", r.ID)
	case !validDoor(r.Door):
		return fmt.Errorf("bad door %q", r.Door)
	case r.IdleS < 60 || r.IdleS > 7200 || r.WarnS < 0 || r.WarnS > 120 || r.WarnS >= r.IdleS || r.TTLS < 1 || r.TTLS > 60:
		return fmt.Errorf("bad limits idleS=%d warnS=%d ttlS=%d", r.IdleS, r.WarnS, r.TTLS)
	}
	return nil
}

// ParseActive parses an active file.
func ParseActive(line string) (Active, error) {
	m, err := parseKV(line, "mode", "id", "since")
	if err != nil {
		return Active{}, err
	}
	since, err := num(m["since"], 0, maxEpoch)
	if err != nil {
		return Active{}, err
	}
	if !validMode(m["mode"]) || !idRe.MatchString(m["id"]) {
		return Active{}, errors.New("bad mode or id")
	}
	return Active{Mode: m["mode"], ID: m["id"], Since: since}, nil
}

// ParseExit parses a last file.
func ParseExit(line string) (Exit, error) {
	m, err := parseKV(line, "mode", "door", "id", "cause", "durS")
	if err != nil {
		return Exit{}, err
	}
	dur, err := num(m["durS"], 0, 1<<31-1)
	if err != nil {
		return Exit{}, err
	}
	e := Exit{Mode: m["mode"], Door: m["door"], ID: m["id"], Cause: m["cause"], DurS: int(dur)}
	if !validMode(e.Mode) || !validDoor(e.Door) || !idRe.MatchString(e.ID) || !validCause(e.Cause) {
		return Exit{}, errors.New("bad value")
	}
	return e, nil
}
