package admin

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"eniac-kiosk/bridge/internal/uiswitch"
)

const origin = "http://127.0.0.1:8740"

type rec struct {
	mu  sync.Mutex
	evs []map[string]any
}

func (r *rec) Bridge(ev, _ string, f map[string]any) {
	r.mu.Lock()
	defer r.mu.Unlock()
	m := map[string]any{"ev": ev}
	for k, v := range f {
		m[k] = v
	}
	r.evs = append(r.evs, m)
}

type rig struct {
	t        *testing.T
	a        *Admin
	h        http.Handler
	pinFile  string
	now      time.Time
	slept    []time.Duration
	rec      *rec
	restarts int
	switches int
	switchFn func() (uiswitch.Request, error)
}

func newRig(t *testing.T, pin string) *rig {
	r := &rig{t: t, now: time.Unix(1759851234, 0), rec: &rec{}, pinFile: filepath.Join(t.TempDir(), "admin-pin")}
	if pin != "" {
		r.setPIN(pin)
	}
	r.switchFn = func() (uiswitch.Request, error) {
		return uiswitch.Request{Mode: uiswitch.ModeInteractive, ID: "3f9a1c2e"}, nil
	}
	r.a = New(Options{PinFile: r.pinFile, TokenTTL: 600 * time.Second, Metrics: r.rec, Log: slog.New(slog.NewTextHandler(io.Discard, nil)),
		Now: func() time.Time { return r.now }, Sleep: func(d time.Duration) { r.slept = append(r.slept, d) },
		Hooks: Hooks{
			RestartCore: func() { r.restarts++ },
			OriginalUI: func() (uiswitch.Request, error) {
				r.switches++
				return r.switchFn()
			},
		}})
	r.h = r.a.Handler(func(o string) bool { return o == origin })
	return r
}

func (r *rig) setPIN(pin string) {
	h, err := HashPIN(pin)
	if err != nil {
		r.t.Fatal(err)
	}
	if err := os.WriteFile(r.pinFile, []byte(h+"\n"), 0o640); err != nil {
		r.t.Fatal(err)
	}
}

type resp struct {
	code int
	body map[string]any
	raw  string
}

func (r *rig) do(method, path, body string, hdr map[string]string) resp {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Origin", origin)
	req.Header.Set("Content-Type", "application/json")
	for k, v := range hdr {
		if v == "" {
			req.Header.Del(k)
		} else {
			req.Header.Set(k, v)
		}
	}
	w := httptest.NewRecorder()
	r.h.ServeHTTP(w, req)
	out := resp{code: w.Code, raw: w.Body.String()}
	json.Unmarshal(w.Body.Bytes(), &out.body)
	return out
}

func (r *rig) post(path, body string) resp { return r.do("POST", path, body, nil) }

func (r *rig) authed(path, token string) resp {
	return r.do("POST", path, "{}", map[string]string{"Authorization": "Bearer " + token})
}

func (r *rig) login(pin string) resp { return r.post("/api/admin/login", `{"pin":"`+pin+`"}`) }

func errCode(x resp) string {
	e, _ := x.body["error"].(map[string]any)
	s, _ := e["code"].(string)
	return s
}

func TestLoginOK(t *testing.T) {
	r := newRig(t, "482913")
	x := r.login("482913")
	if x.code != 200 || len(x.body["token"].(string)) != 32 || x.body["expiresInS"] != 600.0 {
		t.Fatalf("%d %s", x.code, x.raw)
	}
	if len(r.slept) != 0 {
		t.Fatal("a right PIN must not wait")
	}
}

func TestBadPinWaitsAndLocksOnTheFifth(t *testing.T) {
	r := newRig(t, "482913")
	for i := 1; i <= 4; i++ {
		x := r.login("111111")
		if x.code != 401 || errCode(x) != CodeBadPin {
			t.Fatalf("try %d: %d %s", i, x.code, x.raw)
		}
		if len(r.slept) != i || r.slept[i-1] != 2*time.Second {
			t.Fatalf("delay %v", r.slept)
		}
		r.now = r.now.Add(10 * time.Second)
	}
	x := r.login("0000")
	if x.code != 429 || errCode(x) != CodeLocked || x.body["error"].(map[string]any)["retryAfterS"] != 60.0 {
		t.Fatalf("fifth: %d %s", x.code, x.raw)
	}
	// Even the right PIN is refused while locked, and retryAfterS counts down.
	r.now = r.now.Add(45 * time.Second)
	x = r.login("482913")
	if x.code != 429 || x.body["error"].(map[string]any)["retryAfterS"] != 15.0 {
		t.Fatalf("locked: %d %s", x.code, x.raw)
	}
	r.now = r.now.Add(15 * time.Second)
	if x := r.login("482913"); x.code != 200 {
		t.Fatalf("after the lockout: %d %s", x.code, x.raw)
	}
}

func TestFailuresOutsideTheWindowDontCount(t *testing.T) {
	r := newRig(t, "482913")
	for i := 0; i < 4; i++ {
		r.login("111111")
	}
	r.now = r.now.Add(5*time.Minute + time.Second)
	if x := r.login("111111"); x.code != 401 {
		t.Fatalf("%d %s", x.code, x.raw)
	}
}

func TestMalformedPinIsAWrongPin(t *testing.T) {
	r := newRig(t, "482913")
	for _, p := range []string{"123", "123456789", "12a456", " 482913"} {
		if x := r.login(p); x.code != 401 {
			t.Errorf("%q: %d", p, x.code)
		}
	}
	if x := r.login(""); x.code != 429 {
		t.Errorf("the fifth malformed PIN locks too: %d", x.code)
	}
}

func TestNoPinFile(t *testing.T) {
	r := newRig(t, "")
	x := r.login("123456")
	if x.code != 503 || errCode(x) != CodeNoPin {
		t.Fatalf("%d %s", x.code, x.raw)
	}
	os.WriteFile(r.pinFile, []byte("not a hash\n"), 0o640)
	if x := r.login("123456"); x.code != 503 {
		t.Fatalf("garbage file: %d", x.code)
	}
	os.WriteFile(r.pinFile, []byte(""), 0o640)
	if x := r.login("123456"); x.code != 503 {
		t.Fatalf("empty file: %d", x.code)
	}
	os.Chmod(r.pinFile, 0)
	if x := r.login("123456"); x.code != 503 && os.Getuid() != 0 {
		t.Fatalf("unreadable file: %d", x.code)
	}
}

func TestChangedPinAppliesOnTheNextLogin(t *testing.T) {
	r := newRig(t, "482913")
	if x := r.login("482913"); x.code != 200 {
		t.Fatal(x.raw)
	}
	r.setPIN("7777")
	if x := r.login("482913"); x.code != 401 {
		t.Fatalf("old PIN still works: %d", x.code)
	}
	if x := r.login("7777"); x.code != 200 {
		t.Fatalf("new PIN: %d", x.code)
	}
}

func TestTokenLifetime(t *testing.T) {
	r := newRig(t, "482913")
	tok := r.login("482913").body["token"].(string)
	if x := r.authed("/api/admin/restart-core", tok); x.code != 200 || x.body["ok"] != true || r.restarts != 1 {
		t.Fatalf("%d %s", x.code, x.raw)
	}
	r.now = r.now.Add(599 * time.Second)
	if x := r.authed("/api/admin/restart-core", tok); x.code != 200 {
		t.Fatalf("before expiry: %d", x.code)
	}
	r.now = r.now.Add(time.Second)
	if x := r.authed("/api/admin/restart-core", tok); x.code != 401 || errCode(x) != CodeToken {
		t.Fatalf("at expiry: %d %s", x.code, x.raw)
	}
	// A new login replaces the old token.
	t1 := r.login("482913").body["token"].(string)
	t2 := r.login("482913").body["token"].(string)
	if x := r.authed("/api/admin/restart-core", t1); x.code != 401 {
		t.Fatal("the replaced token still works")
	}
	if x := r.authed("/api/admin/logout", t2); x.code != 204 {
		t.Fatalf("logout: %d", x.code)
	}
	if x := r.authed("/api/admin/restart-core", t2); x.code != 401 {
		t.Fatal("logged-out token still works")
	}
	// Logout without a token is still 204.
	if x := r.post("/api/admin/logout", "{}"); x.code != 204 {
		t.Fatalf("anonymous logout: %d", x.code)
	}
	for _, bad := range []string{"", "Bearer", "Bearer ", "Basic " + t2, t2} {
		if x := r.do("POST", "/api/admin/restart-core", "{}", map[string]string{"Authorization": bad}); x.code != 401 {
			t.Errorf("%q: %d", bad, x.code)
		}
	}
}

func TestRequestGuards(t *testing.T) {
	r := newRig(t, "482913")
	cases := []struct {
		name   string
		method string
		path   string
		body   string
		hdr    map[string]string
		code   int
	}{
		{"no origin", "POST", "/api/admin/login", `{"pin":"482913"}`, map[string]string{"Origin": ""}, 403},
		{"foreign origin", "POST", "/api/admin/login", `{"pin":"482913"}`, map[string]string{"Origin": "http://evil.example"}, 403},
		{"GET", "GET", "/api/admin/login", "", nil, 405},
		{"PUT", "PUT", "/api/admin/original-ui", "{}", nil, 405},
		{"form body", "POST", "/api/admin/login", "pin=482913", map[string]string{"Content-Type": "application/x-www-form-urlencoded"}, 400},
		{"no content type", "POST", "/api/admin/login", `{"pin":"482913"}`, map[string]string{"Content-Type": ""}, 400},
		{"oversized", "POST", "/api/admin/login", `{"pin":"482913","x":"` + strings.Repeat("x", 1100) + `"}`, nil, 400},
		{"unknown field", "POST", "/api/admin/login", `{"pin":"482913","user":"root"}`, nil, 400},
		{"two objects", "POST", "/api/admin/login", `{"pin":"482913"}{"pin":"1"}`, nil, 400},
		{"pin as number", "POST", "/api/admin/login", `{"pin":482913}`, nil, 400},
		{"M3 route", "POST", "/api/admin/reboot", "{}", nil, 404},
		{"unknown route", "POST", "/api/admin/", "{}", nil, 404},
	}
	for _, c := range cases {
		if x := r.do(c.method, c.path, c.body, c.hdr); x.code != c.code {
			t.Errorf("%s: %d, want %d (%s)", c.name, x.code, c.code, x.raw)
		}
	}
	if len(r.slept) != 0 {
		t.Fatal("refused requests must not count as PIN attempts")
	}
	if x := r.do("POST", "/api/admin/login", `{"pin":"482913"}`, map[string]string{"Content-Type": "application/json; charset=utf-8"}); x.code != 200 {
		t.Fatalf("charset: %d", x.code)
	}
}

func TestOriginalUI(t *testing.T) {
	r := newRig(t, "482913")
	if x := r.post("/api/admin/original-ui", "{}"); x.code != 401 || r.switches != 0 {
		t.Fatalf("no token: %d", x.code)
	}
	tok := r.login("482913").body["token"].(string)
	x := r.authed("/api/admin/original-ui", tok)
	if x.code != 202 || x.body["mode"] != "interactive" || x.body["id"] != "3f9a1c2e" || r.switches != 1 {
		t.Fatalf("%d %s", x.code, x.raw)
	}
	if x := r.do("POST", "/api/admin/original-ui", `{"mode":"tour"}`, map[string]string{"Authorization": "Bearer " + tok}); x.code != 400 {
		t.Fatalf("a body other than {}: %d", x.code)
	}
	r.switchFn = func() (uiswitch.Request, error) {
		return uiswitch.Request{}, &uiswitch.ErrUnavailable{Reason: uiswitch.ReasonNotBuilt}
	}
	x = r.authed("/api/admin/original-ui", tok)
	if x.code != 409 || errCode(x) != CodeUnavailable || x.body["error"].(map[string]any)["reason"] != "not-built" {
		t.Fatalf("unavailable: %d %s", x.code, x.raw)
	}
	r.switchFn = func() (uiswitch.Request, error) { return uiswitch.Request{}, ErrBusy }
	if x := r.authed("/api/admin/original-ui", tok); x.code != 429 || errCode(x) != CodeBusy {
		t.Fatalf("busy: %d %s", x.code, x.raw)
	}
}

// The metrics: login outcomes and actions, never the PIN.
func TestMetricsNeverCarryThePIN(t *testing.T) {
	r := newRig(t, "482913")
	r.login("111111")
	tok := r.login("482913").body["token"].(string)
	r.authed("/api/admin/restart-core", tok)
	r.authed("/api/admin/original-ui", tok)
	b, _ := json.Marshal(r.rec.evs)
	if strings.Contains(string(b), "482913") || strings.Contains(string(b), "111111") || strings.Contains(string(b), tok) {
		t.Fatalf("secret in metrics: %s", b)
	}
	want := `[{"ev":"admin_login","ok":false},{"ev":"admin_login","ok":true},{"action":"restart-core","ev":"admin_action"},{"action":"original-ui","ev":"admin_action"}]`
	if string(b) != want {
		t.Fatalf("metrics\n got %s\nwant %s", b, want)
	}
}

func TestHashPIN(t *testing.T) {
	for _, bad := range []string{"", "123", "123456789", "12 34", "abcd"} {
		if _, err := HashPIN(bad); err == nil {
			t.Errorf("%q hashed", bad)
		}
	}
	h, err := HashPIN("1234")
	if err != nil || !strings.HasPrefix(h, "$2a$10$") {
		t.Fatalf("%q %v", h, err)
	}
}
