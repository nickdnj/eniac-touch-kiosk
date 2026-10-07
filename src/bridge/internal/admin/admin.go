// Package admin is the staff API on the loopback listener (architecture
// 8.4; the v1 subset of docs/original-ui-switch.md 6.1 and 6.2):
//
//	POST /api/admin/login         {"pin":"123456"} -> {"token","expiresInS"}
//	POST /api/admin/logout        {}               -> 204
//	POST /api/admin/restart-core  {}               -> {"ok":true}
//	POST /api/admin/original-ui   {}               -> 202 {"ok":true,"mode":"interactive","id"}
//
// Every route takes POST only, the kiosk page's Origin, Content-Type
// application/json and a body of at most 1 KB. The PIN is one bcrypt hash
// in a root-owned file readable by the bridge (0640 root:eniac), read on
// every login, so `eniac-touch-kiosk set-pin` applies at once. There is no
// default PIN (NFR-10): without the file, login answers NO_PIN. A wrong PIN
// answers after a fixed 2 s; the fifth failure in 5 min locks login for
// 60 s. One token at a time, valid for admin.tokenTtlS after login (an
// absolute lifetime; S13's 2-minute exit is the page's own timer, which
// logs out). Metrics never carry the PIN.
package admin

import (
	"bytes"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"math"
	"mime"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"

	"eniac-kiosk/bridge/internal/protocol"
	"eniac-kiosk/bridge/internal/uiswitch"
)

// Error codes in the admin error body.
const (
	CodeBadPin      = "BAD_PIN"
	CodeLocked      = "LOCKED"
	CodeNoPin       = "NO_PIN"
	CodeToken       = "TOKEN"
	CodeUnavailable = "UNAVAILABLE"
	CodeBusy        = "BUSY"
	CodeBadRequest  = "BAD_REQUEST"
	CodeOrigin      = "ORIGIN"
	CodeMethod      = "METHOD"
	CodeInternal    = "INTERNAL"
)

// MaxBody bounds every admin request body.
const MaxBody = 1024

// ErrBusy: an original-UI request is already pending or running.
var ErrBusy = errors.New("an original UI request is already pending or running")

// Recorder receives bridge metrics events (internal/metrics implements it).
type Recorder interface {
	Bridge(ev, sid string, fields map[string]any)
}

// Hooks are the actions, implemented by the session manager.
type Hooks struct {
	// RestartCore stops attract, ends any session (reason restart) and
	// resets the recovery budget.
	RestartCore func()
	// OriginalUI stops attract, ends the session (reason original_ui) and
	// writes an interactive request with door staff. It returns
	// *uiswitch.ErrUnavailable or ErrBusy.
	OriginalUI func() (uiswitch.Request, error)
}

// Options configure the API.
type Options struct {
	PinFile  string        // admin.pinFile
	TokenTTL time.Duration // admin.tokenTtlS
	Hooks    Hooks
	Metrics  Recorder
	Log      *slog.Logger

	// Seams and limits (tests); zero values take the defaults below.
	Now         func() time.Time
	Sleep       func(time.Duration)
	ReadFile    func(string) ([]byte, error)
	BadPinDelay time.Duration // 2 s
	MaxFailures int           // 5
	FailWindow  time.Duration // 5 min
	Lockout     time.Duration // 60 s
}

// Admin holds the token and the lockout state.
type Admin struct {
	o           Options
	mu          sync.Mutex
	token       string
	expires     time.Time
	fails       []time.Time
	lockedUntil time.Time
}

// New returns the admin API.
func New(o Options) *Admin {
	if o.TokenTTL <= 0 {
		o.TokenTTL = 10 * time.Minute
	}
	if o.Log == nil {
		o.Log = slog.Default()
	}
	if o.Now == nil {
		o.Now = time.Now
	}
	if o.Sleep == nil {
		o.Sleep = time.Sleep
	}
	if o.ReadFile == nil {
		o.ReadFile = os.ReadFile
	}
	if o.BadPinDelay == 0 {
		o.BadPinDelay = 2 * time.Second
	}
	if o.MaxFailures == 0 {
		o.MaxFailures = 5
	}
	if o.FailWindow == 0 {
		o.FailWindow = 5 * time.Minute
	}
	if o.Lockout == 0 {
		o.Lockout = 60 * time.Second
	}
	return &Admin{o: o}
}

var pinRe = regexp.MustCompile(`^[0-9]{4,8}$`)

// ValidPIN reports whether s is an acceptable PIN (4 to 8 digits).
func ValidPIN(s string) bool { return pinRe.MatchString(s) }

// HashPIN returns the bcrypt hash (cost 10) stored in the PIN file.
func HashPIN(pin string) (string, error) {
	if !ValidPIN(pin) {
		return "", errors.New("the PIN must be 4 to 8 digits")
	}
	h, err := bcrypt.GenerateFromPassword([]byte(pin), 10)
	return string(h), err
}

func (a *Admin) record(ev string, fields map[string]any) {
	if a.o.Metrics != nil {
		a.o.Metrics.Bridge(ev, "", fields)
	}
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, code int, body protocol.AdminErrorBody) {
	writeJSON(w, code, protocol.AdminError{Error: body})
}

// Handler serves /api/admin/. originOK is the websocket's Origin check
// (the kiosk page's own address), shared by the server.
func (a *Admin) Handler(originOK func(string) bool) http.Handler {
	routes := map[string]func(http.ResponseWriter, *http.Request, []byte){
		"/api/admin/login":        a.login,
		"/api/admin/logout":       a.logout,
		"/api/admin/restart-core": a.authed(a.restartCore),
		"/api/admin/original-ui":  a.authed(a.originalUI),
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		route, ok := routes[r.URL.Path]
		if !ok {
			http.NotFound(w, r) // restart-app, reboot, update ... are M3
			return
		}
		if r.Method != http.MethodPost {
			w.Header().Set("Allow", http.MethodPost)
			writeErr(w, http.StatusMethodNotAllowed, protocol.AdminErrorBody{Code: CodeMethod, Message: "POST only"})
			return
		}
		if !originOK(r.Header.Get("Origin")) {
			a.o.Log.Warn("admin: origin refused", "origin", r.Header.Get("Origin"), "path", r.URL.Path)
			writeErr(w, http.StatusForbidden, protocol.AdminErrorBody{Code: CodeOrigin, Message: "origin not allowed"})
			return
		}
		if mt, _, err := mime.ParseMediaType(r.Header.Get("Content-Type")); err != nil || mt != "application/json" {
			writeErr(w, http.StatusBadRequest, protocol.AdminErrorBody{Code: CodeBadRequest, Message: "Content-Type must be application/json"})
			return
		}
		body, err := io.ReadAll(io.LimitReader(r.Body, MaxBody+1))
		if err != nil || len(body) > MaxBody {
			writeErr(w, http.StatusBadRequest, protocol.AdminErrorBody{Code: CodeBadRequest, Message: "body larger than 1 KB"})
			return
		}
		route(w, r, body)
	})
}

// strict decodes exactly one JSON object with no unknown fields.
func strict(body []byte, v any) error {
	d := json.NewDecoder(bytes.NewReader(body))
	d.DisallowUnknownFields()
	if err := d.Decode(v); err != nil {
		return err
	}
	if d.More() {
		return errors.New("trailing data")
	}
	return nil
}

func emptyBody(w http.ResponseWriter, body []byte) bool {
	var x struct{}
	if err := strict(body, &x); err != nil {
		writeErr(w, http.StatusBadRequest, protocol.AdminErrorBody{Code: CodeBadRequest, Message: "body must be {}"})
		return false
	}
	return true
}

func secondsUntil(now, t time.Time) int {
	return int(math.Ceil(t.Sub(now).Seconds()))
}

func (a *Admin) login(w http.ResponseWriter, _ *http.Request, body []byte) {
	var req protocol.AdminLogin
	if err := strict(body, &req); err != nil {
		writeErr(w, http.StatusBadRequest, protocol.AdminErrorBody{Code: CodeBadRequest, Message: "body must be {\"pin\":\"...\"}"})
		return
	}
	now := a.o.Now()
	a.mu.Lock()
	locked := now.Before(a.lockedUntil)
	until := a.lockedUntil
	a.mu.Unlock()
	if locked {
		a.o.Log.Info("admin: login", "ok", false, "locked", true)
		a.record("admin_login", map[string]any{"ok": false, "locked": true})
		writeErr(w, http.StatusTooManyRequests, protocol.AdminErrorBody{Code: CodeLocked, Message: "too many wrong PINs; try again in a minute", RetryAfterS: secondsUntil(now, until)})
		return
	}
	hash, err := a.o.ReadFile(a.o.PinFile)
	hash = bytes.TrimSpace(hash)
	if err != nil || len(hash) == 0 {
		a.o.Log.Warn("admin: no staff PIN is set", "file", a.o.PinFile, "err", err)
		a.record("admin_login", map[string]any{"ok": false})
		writeErr(w, http.StatusServiceUnavailable, protocol.AdminErrorBody{Code: CodeNoPin, Message: "no staff PIN is set on this kiosk"})
		return
	}
	if _, err := bcrypt.Cost(hash); err != nil {
		a.o.Log.Error("admin: the PIN file does not hold a bcrypt hash", "file", a.o.PinFile)
		a.record("admin_login", map[string]any{"ok": false})
		writeErr(w, http.StatusServiceUnavailable, protocol.AdminErrorBody{Code: CodeNoPin, Message: "no staff PIN is set on this kiosk"})
		return
	}
	if ValidPIN(req.Pin) && bcrypt.CompareHashAndPassword(hash, []byte(req.Pin)) == nil {
		b := make([]byte, 16)
		rand.Read(b)
		tok := hex.EncodeToString(b)
		a.mu.Lock()
		a.token, a.expires, a.fails = tok, now.Add(a.o.TokenTTL), nil
		a.mu.Unlock()
		a.o.Log.Info("admin: login", "ok", true)
		a.record("admin_login", map[string]any{"ok": true})
		writeJSON(w, http.StatusOK, protocol.AdminLoginReply{Token: tok, ExpiresInS: int(a.o.TokenTTL.Seconds())})
		return
	}
	a.mu.Lock()
	keep := a.fails[:0]
	for _, t := range a.fails {
		if now.Sub(t) < a.o.FailWindow {
			keep = append(keep, t)
		}
	}
	a.fails = append(keep, now)
	lockNow := len(a.fails) >= a.o.MaxFailures
	if lockNow {
		a.lockedUntil = now.Add(a.o.Lockout)
		a.fails = nil
	}
	a.mu.Unlock()
	a.o.Sleep(a.o.BadPinDelay)
	a.o.Log.Info("admin: login", "ok", false, "locked", lockNow)
	if lockNow {
		a.record("admin_login", map[string]any{"ok": false, "locked": true})
		writeErr(w, http.StatusTooManyRequests, protocol.AdminErrorBody{Code: CodeLocked, Message: "too many wrong PINs; try again in a minute", RetryAfterS: int(a.o.Lockout.Seconds())})
		return
	}
	a.record("admin_login", map[string]any{"ok": false})
	writeErr(w, http.StatusUnauthorized, protocol.AdminErrorBody{Code: CodeBadPin, Message: "not right"})
}

// tokenOK checks "Authorization: Bearer <token>" against the one live token.
func (a *Admin) tokenOK(r *http.Request) bool {
	tok, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
	if !ok || tok == "" {
		return false
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.token == "" || !a.o.Now().Before(a.expires) {
		a.token = ""
		return false
	}
	return subtle.ConstantTimeCompare([]byte(tok), []byte(a.token)) == 1
}

func (a *Admin) authed(next func(http.ResponseWriter, *http.Request, []byte)) func(http.ResponseWriter, *http.Request, []byte) {
	return func(w http.ResponseWriter, r *http.Request, body []byte) {
		if !a.tokenOK(r) {
			writeErr(w, http.StatusUnauthorized, protocol.AdminErrorBody{Code: CodeToken, Message: "log in again"})
			return
		}
		next(w, r, body)
	}
}

func (a *Admin) logout(w http.ResponseWriter, r *http.Request, body []byte) {
	if !emptyBody(w, body) {
		return
	}
	if a.tokenOK(r) {
		a.mu.Lock()
		a.token = ""
		a.mu.Unlock()
	}
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusNoContent)
}

func (a *Admin) restartCore(w http.ResponseWriter, _ *http.Request, body []byte) {
	if !emptyBody(w, body) {
		return
	}
	a.o.Log.Info("admin: action", "name", "restart-core")
	a.record("admin_action", map[string]any{"action": "restart-core"})
	if a.o.Hooks.RestartCore != nil {
		a.o.Hooks.RestartCore()
	}
	writeJSON(w, http.StatusOK, protocol.AdminActionReply{OK: true})
}

func (a *Admin) originalUI(w http.ResponseWriter, _ *http.Request, body []byte) {
	if !emptyBody(w, body) {
		return
	}
	a.o.Log.Info("admin: action", "name", "original-ui")
	a.record("admin_action", map[string]any{"action": "original-ui"})
	if a.o.Hooks.OriginalUI == nil {
		writeErr(w, http.StatusConflict, protocol.AdminErrorBody{Code: CodeUnavailable, Message: "the original UI is not available", Reason: uiswitch.ReasonDisabled})
		return
	}
	req, err := a.o.Hooks.OriginalUI()
	var un *uiswitch.ErrUnavailable
	switch {
	case errors.As(err, &un):
		writeErr(w, http.StatusConflict, protocol.AdminErrorBody{Code: CodeUnavailable, Message: "the original UI is not available", Reason: un.Reason})
	case errors.Is(err, ErrBusy):
		writeErr(w, http.StatusTooManyRequests, protocol.AdminErrorBody{Code: CodeBusy, Message: err.Error()})
	case err != nil:
		a.o.Log.Error("admin: original-ui", "err", err)
		writeErr(w, http.StatusInternalServerError, protocol.AdminErrorBody{Code: CodeInternal, Message: "the request could not be written"})
	default:
		writeJSON(w, http.StatusAccepted, protocol.AdminActionReply{OK: true, Mode: req.Mode, ID: req.ID})
	}
}
