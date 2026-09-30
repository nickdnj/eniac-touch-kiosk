package core

import (
	"bufio"
	"context"
	"errors"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"eniac-kiosk/bridge/internal/testenv"
)

type fakeRun struct {
	t      *testing.T
	dir    string
	srv    *VlinkServer
	faults chan Fault
	lines  atomic.Int64
	log    string
	mu     sync.Mutex
	seen   []string
}

func fake(t *testing.T) *fakeRun {
	dir := testenv.ShortTempDir(t)
	srv, err := ListenVlink(filepath.Join(dir, "v.sock"), nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { srv.Close() })
	f := &fakeRun{t: t, dir: dir, srv: srv, faults: make(chan Fault, 4), log: filepath.Join(dir, "stdin.log")}
	t.Cleanup(f.checkAllowList)
	return f
}

func (f *fakeRun) opts(env ...string) Options {
	self, _ := os.Executable()
	preset := filepath.Join(f.dir, "preset.e")
	os.WriteFile(preset, []byte("p c.o 1\n"), 0o600)
	return Options{CorePath: testenv.Fakecore(f.t), VlinkExe: self, Runtime: f.dir, SessionDir: filepath.Join(f.dir, "s"),
		Preset: preset, Server: f.srv, InitialRate: 100, ReadyTimeout: time.Second, AckTimeout: 300 * time.Millisecond,
		ExtraEnv: append(env, "FAKECORE_STDIN_LOG="+f.log),
		OnStatus: func(l string) {
			f.lines.Add(1)
			f.mu.Lock()
			if len(f.seen) < 10000 {
				f.seen = append(f.seen, l)
			}
			f.mu.Unlock()
		},
		OnFault: func(x Fault) { f.faults <- x }}
}

func (f *fakeRun) wantFault(code, detail string, within time.Duration) Fault {
	f.t.Helper()
	select {
	case x := <-f.faults:
		if x.Code != code || (detail != "" && x.Detail != detail) {
			f.t.Fatalf("fault %+v, want %s/%s", x, code, detail)
		}
		return x
	case <-time.After(within):
		f.t.Fatalf("no %s/%s fault within %s", code, detail, within)
	}
	return Fault{}
}

func (f *fakeRun) noFault(d time.Duration) {
	f.t.Helper()
	select {
	case x := <-f.faults:
		f.t.Fatalf("unexpected fault %+v", x)
	case <-time.After(d):
	}
}

// Every byte written to the fake core's stdin matches the 5.2 allow-list
// (test plan 3.3 whitelist conformance).
func (f *fakeRun) checkAllowList() {
	fh, err := os.Open(f.log)
	if err != nil {
		return
	}
	defer fh.Close()
	re := regexp.MustCompile(AllowedPattern)
	sc := bufio.NewScanner(fh)
	for sc.Scan() {
		if !re.MatchString(sc.Text()) {
			f.t.Errorf("core stdin got a line outside the allow-list: %q", sc.Text())
		}
	}
}

func TestFakeSlowStartIsStartFault(t *testing.T) {
	f := fake(t)
	_, err := Start(context.Background(), f.opts("FAKECORE_MODE=slow-start", "FAKECORE_AFTER=2000"))
	var x Fault
	if !errors.As(err, &x) || x.Code != CodeStart {
		t.Fatalf("got %v", err)
	}
}

func TestFakeLoadErrorIsCmdFault(t *testing.T) {
	f := fake(t)
	_, err := Start(context.Background(), f.opts("FAKECORE_MODE=load-error"))
	var x Fault
	if !errors.As(err, &x) || x.Code != CodeCmd {
		t.Fatalf("got %v", err)
	}
}

func TestFakeExitIsDown(t *testing.T) {
	f := fake(t)
	c, err := Start(context.Background(), f.opts("FAKECORE_MODE=exit-after", "FAKECORE_AFTER=400"))
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	f.wantFault(CodeDown, DetailExit, 2*time.Second)
	if _, err := c.Do(Probe()); err != ErrClosed {
		t.Fatalf("command after fault: %v", err)
	}
}

func TestFakeHangStdinIsHangCmd(t *testing.T) {
	f := fake(t)
	c, err := Start(context.Background(), f.opts("FAKECORE_MODE=hang-stdin", "FAKECORE_AFTER=2"))
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	cmd, _ := StepLine("p c.o 1")
	t0 := time.Now()
	if _, err := c.Do(cmd); err != ErrAckTimeout {
		t.Fatalf("got %v", err)
	}
	if d := time.Since(t0); d > 500*time.Millisecond {
		t.Fatalf("ack timeout took %s", d)
	}
	f.wantFault(CodeDown, DetailHangCmd, time.Second)
}

// The d i probe finds a hung command loop even when nobody sends anything.
func TestFakeProbeFindsHang(t *testing.T) {
	f := fake(t)
	o := f.opts("FAKECORE_MODE=hang-stdin", "FAKECORE_AFTER=2")
	o.ProbeEvery = 200 * time.Millisecond
	c, err := Start(context.Background(), o)
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	f.wantFault(CodeDown, DetailHangCmd, 2*time.Second)
}

func TestFakeSilentStatusIsHangStatus(t *testing.T) {
	f := fake(t)
	o := f.opts("FAKECORE_MODE=silent-status", "FAKECORE_AFTER=300")
	o.SilenceTimeout = 400 * time.Millisecond
	c, err := Start(context.Background(), o)
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	f.wantFault(CodeDown, DetailHangStatus, 2*time.Second)
}

func TestFakeVlinkDropIsDown(t *testing.T) {
	f := fake(t)
	c, err := Start(context.Background(), f.opts("FAKECORE_MODE=vlink-drop", "FAKECORE_AFTER=300"))
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	f.wantFault(CodeDown, DetailVlink, 2*time.Second)
}

func TestFakeErrorOnCommand(t *testing.T) {
	f := fake(t)
	c, err := Start(context.Background(), f.opts("FAKECORE_MODE=error-on-command", "FAKECORE_MATCH=p "))
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	cmd, _ := StepLine("p c.o 1")
	_, err = c.Do(cmd)
	var ce *CmdError
	if !errors.As(err, &ce) {
		t.Fatalf("got %v", err)
	}
}

func TestFakeGarbageSurvives(t *testing.T) {
	f := fake(t)
	o := f.opts("FAKECORE_MODE=garbage")
	o.SilenceTimeout, o.ProbeEvery = time.Second, 200*time.Millisecond
	c, err := Start(context.Background(), o)
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	f.noFault(800 * time.Millisecond)
	if f.lines.Load() < 20 {
		t.Fatalf("only %d status lines", f.lines.Load())
	}
}

// A stale token (a leftover core feeding a new session) is refused: the
// session never becomes ready and no status line reaches it.
func TestFakeStaleTokenRefused(t *testing.T) {
	f := fake(t)
	_, err := Start(context.Background(), f.opts("FAKECORE_MODE=stale-token"))
	var x Fault
	if !errors.As(err, &x) || x.Code != CodeStart {
		t.Fatalf("got %v", err)
	}
	if n := f.lines.Load(); n != 0 {
		t.Fatalf("%d status lines leaked into the session", n)
	}
}

// Flood: the status reader keeps up (it never blocks the core).
func TestFakeFloodDrained(t *testing.T) {
	f := fake(t)
	c, err := Start(context.Background(), f.opts("FAKECORE_MODE=flood"))
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	time.Sleep(500 * time.Millisecond)
	if n := f.lines.Load(); n < 5000 {
		t.Fatalf("only %d lines drained in 0.5 s", n)
	}
}

// huge-punch: every card is relayed, in order.
func TestFakeHugePunchInOrder(t *testing.T) {
	f := fake(t)
	c, err := Start(context.Background(), f.opts("FAKECORE_MODE=huge-punch", "FAKECORE_N=6000"))
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		f.mu.Lock()
		n := 0
		for _, l := range f.seen {
			if len(l) > 6 && l[:6] == "punch " {
				n++
			}
		}
		f.mu.Unlock()
		if n == 6000 {
			break
		}
		time.Sleep(50 * time.Millisecond)
	}
	f.mu.Lock()
	defer f.mu.Unlock()
	next := 1
	for _, l := range f.seen {
		if len(l) == 86 && l[:6] == "punch " {
			v, _ := strconv.Atoi(l[81:])
			if v != next {
				t.Fatalf("card %d arrived as %d", next, v)
			}
			next++
		}
	}
	if next != 6001 {
		t.Fatalf("relayed %d cards", next-1)
	}
}
