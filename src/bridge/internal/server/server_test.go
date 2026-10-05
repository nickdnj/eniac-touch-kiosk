package server

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/coder/websocket"

	"eniac-kiosk/bridge/internal/config"
	"eniac-kiosk/bridge/internal/machine"
	"eniac-kiosk/bridge/internal/protocol"
	"eniac-kiosk/bridge/internal/status"
)

type fakeHandler struct {
	mu   sync.Mutex
	msgs []any
	m    *machine.Mirror
	n    int
}

func (f *fakeHandler) Hello() protocol.Hello {
	return protocol.Hello{T: "hello", Protocol: protocol.Version, Build: "test", Health: protocol.Health{Core: "up"}}
}
func (f *fakeHandler) Snapshot() protocol.State {
	seq, snap, _ := f.m.Snapshot()
	return protocol.State{T: "state", Seq: seq, Machine: snap, Run: protocol.RunInfo{State: "idle"}}
}
func (f *fakeHandler) Handle(_ context.Context, _ *Client, msg any) []any {
	f.mu.Lock()
	f.msgs = append(f.msgs, msg)
	f.mu.Unlock()
	if p, ok := msg.(protocol.Ping); ok {
		return []any{protocol.Pong{T: "pong", Re: p.ID}}
	}
	return nil
}
func (f *fakeHandler) ClientsChanged(n int) { f.mu.Lock(); f.n = n; f.mu.Unlock() }

type env struct {
	addr string
	hub  *Hub
	h    *fakeHandler
	down *bool
}

func start(t *testing.T, dev bool) *env { return startWith(t, dev, nil) }

func startWith(t *testing.T, dev bool, tweak func(*config.Config)) *env {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	e := &env{addr: ln.Addr().String(), hub: NewHub(log), h: &fakeHandler{m: machine.NewMirror(nil)}, down: new(bool)}
	cfg := config.Default()
	cfg.Listen = e.addr
	if tweak != nil {
		tweak(&cfg)
	}
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	go Run(ctx, Options{Config: cfg, Dev: dev, Log: log, Hub: e.hub, Handler: e.h, Listener: ln,
		Healthz: func() protocol.Healthz {
			if *e.down {
				return protocol.Healthz{Status: "down"}
			}
			return protocol.Healthz{Status: "ok", Version: "t"}
		}})
	return e
}

func (e *env) dial(t *testing.T, origin string) (*websocket.Conn, *http.Response, error) {
	h := http.Header{}
	if origin != "" {
		h.Set("Origin", origin)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	return websocket.Dial(ctx, "ws://"+e.addr+"/ws", &websocket.DialOptions{HTTPHeader: h})
}

func read(t *testing.T, c *websocket.Conn) map[string]any {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	_, b, err := c.Read(ctx)
	if err != nil {
		t.Fatal(err)
	}
	var m map[string]any
	json.Unmarshal(b, &m)
	return m
}

func send(t *testing.T, c *websocket.Conn, s string) {
	if err := c.Write(context.Background(), websocket.MessageText, []byte(s)); err != nil {
		t.Fatal(err)
	}
}

func TestHandshakeAndBadMessages(t *testing.T) {
	e := start(t, false)
	c, _, err := e.dial(t, "http://"+e.addr)
	if err != nil {
		t.Fatal(err)
	}
	defer c.CloseNow()
	if m := read(t, c); m["t"] != "hello" || m["protocol"] != 1.0 {
		t.Fatalf("first message %v", m)
	}
	if m := read(t, c); m["t"] != "state" || m["machine"] == nil {
		t.Fatalf("second message %v", m)
	}
	send(t, c, `{"t":"ping","id":3}`)
	if m := read(t, c); m["t"] != "pong" || m["re"] != 3.0 {
		t.Fatalf("%v", m)
	}
	for _, bad := range []string{`nope`, `{"t":"apply_step","step":"x\nq"}`, `{"t":"q"}`, `{"t":"ping","pad":"` + strings.Repeat("x", 5000) + `"}`} {
		send(t, c, bad)
		if m := read(t, c); m["t"] != "error" || m["code"] != "BAD_MESSAGE" {
			t.Fatalf("%q -> %v", bad, m)
		}
	}
	c.Write(context.Background(), websocket.MessageBinary, []byte{1, 2})
	if m := read(t, c); m["code"] != "BAD_MESSAGE" {
		t.Fatalf("binary -> %v", m)
	}
	e.h.mu.Lock()
	n := len(e.h.msgs)
	e.h.mu.Unlock()
	if n != 1 {
		t.Fatalf("handler saw %d messages; only the valid ping may reach it", n)
	}
	if e.hub.LastPing().IsZero() {
		t.Fatal("ping not recorded")
	}
}

func TestOriginCheck(t *testing.T) {
	e := start(t, false)
	_, port, _ := net.SplitHostPort(e.addr)
	for _, o := range []string{"", "http://evil.example", "http://localhost:" + port, "null"} {
		if c, resp, err := e.dial(t, o); err == nil {
			c.CloseNow()
			t.Errorf("origin %q accepted", o)
		} else if resp != nil && resp.StatusCode != http.StatusForbidden {
			t.Errorf("origin %q: status %d", o, resp.StatusCode)
		}
	}
	d := start(t, true)
	_, port, _ = net.SplitHostPort(d.addr)
	c, _, err := d.dial(t, "http://localhost:"+port)
	if err != nil {
		t.Fatalf("dev origin refused in --dev: %v", err)
	}
	c.CloseNow()
}

// A slow client converges to the true state; broadcasting never blocks.
func TestSlowClientConverges(t *testing.T) {
	e := start(t, false)
	c, _, err := e.dial(t, "http://"+e.addr)
	if err != nil {
		t.Fatal(err)
	}
	defer c.CloseNow()
	read(t, c)
	st := read(t, c)
	doc := st["machine"].(map[string]any)
	m := e.h.m
	// 5000 ticks of changes, broadcast as fast as possible.
	t0 := time.Now()
	for i := 0; i < 5000; i++ {
		m.Apply(status.Event{Kind: status.AccDigit, Unit: 1 + i%20, Index: 1 + i%10, Value: i % 10})
		m.Apply(status.Event{Kind: status.Cycle, Value: i % 40})
		if seq, p, ok := m.TakeDelta(); ok {
			e.hub.BroadcastFrame(seq, p)
		}
	}
	if d := time.Since(t0); d > 2*time.Second {
		t.Fatalf("broadcasting 5000 frames took %s", d)
	}
	lastSeq, _, _ := m.Snapshot()
	frames := 0
	for {
		fm := read(t, c)
		if fm["t"] != "frame" {
			continue
		}
		frames++
		machine.Merge(doc, fm["d"].(map[string]any))
		if uint64(fm["seq"].(float64)) == lastSeq {
			break
		}
	}
	st2 := m.State()
	want, _ := json.Marshal(st2.Snapshot())
	got, _ := json.Marshal(doc)
	var a, b any
	json.Unmarshal(want, &a)
	json.Unmarshal(got, &b)
	if string(mustJSON(a)) != string(mustJSON(b)) {
		t.Fatal("client state did not converge")
	}
	t.Logf("5000 deltas arrived as %d merged frames", frames)
}

func mustJSON(v any) []byte { b, _ := json.Marshal(v); return b }

func TestHealthz(t *testing.T) {
	e := start(t, false)
	resp, err := http.Get("http://" + e.addr + "/healthz")
	if err != nil {
		t.Fatal(err)
	}
	var h protocol.Healthz
	json.NewDecoder(resp.Body).Decode(&h)
	resp.Body.Close()
	if resp.StatusCode != 200 || h.Status != "ok" {
		t.Fatalf("%d %+v", resp.StatusCode, h)
	}
	*e.down = true
	resp, _ = http.Get("http://" + e.addr + "/healthz")
	resp.Body.Close()
	if resp.StatusCode != 503 {
		t.Fatalf("down -> %d", resp.StatusCode)
	}
}

// Web files revalidate: a stale cached stylesheet must not meet a new app.js.
func TestWebFilesRevalidate(t *testing.T) {
	web := t.TempDir()
	os.MkdirAll(filepath.Join(web, "styles"), 0o755)
	os.WriteFile(filepath.Join(web, "styles", "start.css"), []byte("body{}"), 0o644)
	e := startWith(t, false, func(c *config.Config) { c.Paths.Web = web })
	resp, err := http.Get("http://" + e.addr + "/styles/start.css")
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != 200 {
		t.Fatalf("status %d", resp.StatusCode)
	}
	if got := resp.Header.Get("Cache-Control"); got != "no-cache" {
		t.Fatalf("Cache-Control %q, want no-cache", got)
	}

	// The page links each file on disk by its modification time; others stay as written.
	os.WriteFile(filepath.Join(web, "index.html"), []byte(`<link rel="stylesheet" href="/styles/start.css"><script src="/app.js"></script>`), 0o644)
	st, _ := os.Stat(filepath.Join(web, "styles", "start.css"))
	resp, err = http.Get("http://" + e.addr + "/")
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	want := fmt.Sprintf(`<link rel="stylesheet" href="/styles/start.css?v=%d"><script src="/app.js"></script>`, st.ModTime().Unix())
	if string(body) != want {
		t.Fatalf("page %q, want %q", body, want)
	}
	if got := resp.Header.Get("Cache-Control"); got != "no-cache" {
		t.Fatalf("page Cache-Control %q, want no-cache", got)
	}
}
