package core

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"eniac-kiosk/bridge/internal/testenv"
)

var squaresSteps = []string{"s c.j1 1", "p c.o 1", "p 1 a1.α", "p a1.A a2.β", "s a1.rp6 2", "p i.io 1-1", "p a2.6o 1-3"}

type harness struct {
	t       *testing.T
	core    string
	runtime string
	dir     string
	srv     *VlinkServer
	self    string
}

func newHarness(t *testing.T) *harness {
	corePath, rt := testenv.Core(t)
	dir := testenv.ShortTempDir(t)
	srv, err := ListenVlink(filepath.Join(dir, "v.sock"), nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { srv.Close() })
	self, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	return &harness{t: t, core: corePath, runtime: rt, dir: dir, srv: srv, self: self}
}

// preset writes sq.e minus the given lines into a new session dir.
func (h *harness) preset(name string, without []string, extra ...string) (sessionDir, preset string) {
	b, err := os.ReadFile(filepath.Join(h.runtime, "programs", "sq.e"))
	if err != nil {
		h.t.Fatal(err)
	}
	skip := map[string]bool{}
	for _, w := range without {
		skip[w] = true
	}
	var out []string
	for _, l := range strings.Split(string(b), "\n") {
		if !skip[strings.TrimSpace(l)] {
			out = append(out, l)
		}
	}
	out = append(out, extra...)
	sessionDir = filepath.Join(h.dir, "s", name)
	os.MkdirAll(sessionDir, 0o700)
	preset = filepath.Join(sessionDir, "preset.e")
	if err := os.WriteFile(preset, []byte(strings.Join(out, "\n")), 0o600); err != nil {
		h.t.Fatal(err)
	}
	return sessionDir, preset
}

func (h *harness) opts(sessionDir, preset string) Options {
	return Options{CorePath: h.core, VlinkExe: h.self, Runtime: h.runtime, SessionDir: sessionDir, Preset: preset,
		Server: h.srv, GOMAXPROCS: 2, Nice: 5, InitialRate: 0}
}

func accValue(t *testing.T, c *Core, n int) string {
	t.Helper()
	cmd, _ := DumpAcc(n)
	lines, err := c.Do(cmd)
	if err != nil || len(lines) != 1 {
		t.Fatalf("d a%d: %v %q", n, err, lines)
	}
	return strings.Fields(lines[0])[1]
}

func waitSettled(t *testing.T, c *Core, n int, want string) {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		if accValue(t, c, n) == want {
			return
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatalf("a%d never reached %s", n, want)
}

// Start with the Squares preset, apply the 7 step lines, INIT x3, stop.
func TestRealCoreSquaresSession(t *testing.T) {
	h := newHarness(t)
	sd, preset := h.preset("sq", squaresSteps)
	var statusLines atomic.Int64
	var writes []string
	var mu sync.Mutex
	o := h.opts(sd, preset)
	o.OnStatus = func(string) { statusLines.Add(1) }
	o.OnWrite = func(s string) { mu.Lock(); writes = append(writes, s); mu.Unlock() }
	faults := make(chan Fault, 1)
	o.OnFault = func(f Fault) { faults <- f }
	t0 := time.Now()
	c, err := Start(context.Background(), o)
	if err != nil {
		t.Fatal(err)
	}
	ready := time.Since(t0)
	if ready > 3*time.Second {
		t.Errorf("ready took %s, NFR-03 wants <= 3 s", ready)
	}
	t.Logf("core ready in %s", ready.Round(time.Millisecond))
	for _, l := range squaresSteps {
		cmd, err := StepLine(l)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := c.Do(cmd); err != nil {
			t.Fatalf("%s: %v", l, err)
		}
	}
	for i, want := range []string{"0000000001", "0000000002", "0000000003"} {
		if _, err := c.Do(ButtonInit()); err != nil {
			t.Fatal(err)
		}
		waitSettled(t, c, 1, want)
		sq := map[int]string{0: "0000000001", 1: "0000000004", 2: "0000000009"}[i]
		waitSettled(t, c, 2, sq)
	}
	if statusLines.Load() == 0 {
		t.Fatal("no status lines relayed by vlink")
	}
	pid := c.Pid()
	c.Close()
	select {
	case f := <-faults:
		t.Fatalf("unexpected fault %v", f)
	default:
	}
	if _, err := os.Stat(sd); !os.IsNotExist(err) {
		t.Errorf("session dir not removed: %v", err)
	}
	if processAlive(pid) {
		t.Errorf("core pid %d still alive", pid)
	}
	if n := countProcs(h.dir); n != 0 {
		t.Errorf("%d core/vlink processes left", n)
	}
	mu.Lock()
	defer mu.Unlock()
	if writes[0] != "f p "+filepath.Join(sd, "punch.txt") || writes[1] != "s cy.rate 0" {
		t.Errorf("first writes %q", writes[:2])
	}
	if writes[len(writes)-1] != "q" {
		t.Errorf("last write %q, want q", writes[len(writes)-1])
	}
}

func TestRealCoreLoadErrorIsCmdFault(t *testing.T) {
	h := newHarness(t)
	sd, preset := h.preset("bad", nil, "p a1.zz 1")
	_, err := Start(context.Background(), h.opts(sd, preset))
	var f Fault
	if !errors.As(err, &f) || f.Code != CodeCmd {
		t.Fatalf("want E-CORE-CMD, got %v", err)
	}
	if n := countProcs(h.dir); n != 0 {
		t.Errorf("%d processes left after failed start", n)
	}
}

func TestRealCoreStepErrorIsCmdError(t *testing.T) {
	h := newHarness(t)
	for i, l := range []string{"s a1.op5 Z", "p a1.zz 1"} {
		sd, preset := h.preset("err"+strconv.Itoa(i), nil)
		c, err := Start(context.Background(), h.opts(sd, preset))
		if err != nil {
			t.Fatal(err)
		}
		defer c.Close()
		cmd, _ := StepLine(l)
		_, err = c.Do(cmd)
		var ce *CmdError
		if !errors.As(err, &ce) {
			t.Errorf("%s: want CmdError, got %v", l, err)
		}
	}
}

func TestRealCoreStartStopLoop(t *testing.T) {
	h := newHarness(t)
	n := 3
	if testing.Short() {
		n = 1
	}
	startStopLoop(t, h, n)
}

func startStopLoop(t *testing.T, h *harness, n int) {
	var worst time.Duration
	for i := 0; i < n; i++ {
		sd, preset := h.preset("loop", squaresSteps)
		t0 := time.Now()
		c, err := Start(context.Background(), h.opts(sd, preset))
		if err != nil {
			t.Fatalf("start %d: %v", i, err)
		}
		if d := time.Since(t0); d > worst {
			worst = d
		}
		if _, err := c.Do(Probe()); err != nil {
			t.Fatalf("probe %d: %v", i, err)
		}
		c.Close()
		if k := countProcs(h.dir); k != 0 {
			t.Fatalf("cycle %d: %d processes left", i, k)
		}
	}
	t.Logf("%d start/stop cycles, worst ready %s", n, worst.Round(time.Millisecond))
	if worst > 3*time.Second {
		t.Errorf("worst ready %s > 3 s", worst)
	}
}

func TestPathsWithSpacesRejected(t *testing.T) {
	srv := &VlinkServer{Path: "/tmp/v.sock"}
	_, err := Start(context.Background(), Options{CorePath: "/x/eniac-core", VlinkExe: "/x/b", Runtime: "/x",
		SessionDir: "/tmp/a session", Preset: "/tmp/a session/preset.e", Server: srv})
	if err == nil || !strings.Contains(err.Error(), "spaces") {
		t.Fatalf("got %v", err)
	}
	if _, err := ListenVlink("/tmp/a b.sock", nil); err == nil {
		t.Fatal("socket path with a space accepted")
	}
}

func TestVlinkWrongTokenRefused(t *testing.T) {
	dir := testenv.ShortTempDir(t)
	srv, err := ListenVlink(filepath.Join(dir, "v.sock"), nil)
	if err != nil {
		t.Fatal(err)
	}
	defer srv.Close()
	var out strings.Builder
	if rc := RunVlink([]string{"--sock", srv.Path, "--session", "nope"}, strings.NewReader(""), &out); rc == 0 {
		t.Fatal("vlink with an unknown token succeeded")
	}
	if out.Len() != 0 {
		t.Fatalf("rejected vlink wrote %q to the core", out.String())
	}
	// A token is single use and can be revoked.
	tok, ch := srv.Expect()
	srv.Forget(tok)
	if rc := RunVlink([]string{"--sock", srv.Path, "--session", tok}, strings.NewReader(""), &out); rc == 0 {
		t.Fatal("vlink with a revoked token succeeded")
	}
	tok, ch = srv.Expect()
	r, w, _ := os.Pipe()
	done := make(chan int)
	var ok strings.Builder
	go func() { done <- RunVlink([]string{"--sock", srv.Path, "--session", tok}, r, &ok) }()
	conn := <-ch
	w.Write([]byte("cy 3\n"))
	buf := make([]byte, 16)
	n, _ := conn.Read(buf)
	if string(buf[:n]) != "cy 3\n" {
		t.Fatalf("relay got %q", buf[:n])
	}
	w.Close()
	if rc := <-done; rc != 0 {
		t.Fatalf("vlink rc %d", rc)
	}
	if ok.String() != "ready\n" {
		t.Fatalf("vlink wrote %q, want exactly ready", ok.String())
	}
	// Second use of the same token is refused.
	if rc := RunVlink([]string{"--sock", srv.Path, "--session", tok}, strings.NewReader(""), &out); rc == 0 {
		t.Fatal("token reuse succeeded")
	}
}

func processAlive(pid int) bool {
	return exec.Command("kill", "-0", itoa(pid)).Run() == nil
}

// countProcs counts processes whose command line mentions dir (the core's
// preset path and vlink's socket path both live under it).
func countProcs(dir string) int {
	out, _ := exec.Command("pgrep", "-f", dir).Output()
	return len(strings.Fields(string(out)))
}

func itoa(n int) string { return strconv.Itoa(n) }
