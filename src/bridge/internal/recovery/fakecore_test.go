package recovery

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"eniac-kiosk/bridge/internal/core"
	"eniac-kiosk/bridge/internal/protocol"
	"eniac-kiosk/bridge/internal/testenv"
)

func TestMain(m *testing.M) {
	if len(os.Args) > 1 && os.Args[1] == "vlink" {
		os.Exit(core.RunVlink(os.Args[2:], os.Stdin, os.Stdout))
	}
	os.Exit(m.Run())
}

// End to end with the fake core: a session core dies, health goes down,
// the probe session (first attempt a slow start, second a healthy core)
// brings health back up without restarting anything else.
func TestRecoveryWithFakeCore(t *testing.T) {
	dir := testenv.ShortTempDir(t)
	srv, err := core.ListenVlink(filepath.Join(dir, "v.sock"), nil)
	if err != nil {
		t.Fatal(err)
	}
	defer srv.Close()
	self, _ := os.Executable()
	preset := filepath.Join(dir, "preset.e")
	os.WriteFile(preset, []byte("p c.o 1\n"), 0o600)
	opts := func(mode string, n int) core.Options {
		return core.Options{CorePath: testenv.Fakecore(t), VlinkExe: self, Runtime: dir,
			SessionDir: filepath.Join(dir, "s", mode), Preset: preset, Server: srv, InitialRate: 0,
			ReadyTimeout: 500 * time.Millisecond, ExtraEnv: []string{"FAKECORE_MODE=" + mode, "FAKECORE_AFTER=" + itoa(n)}}
	}
	attempt := 0
	health := make(chan protocol.Health, 16)
	r := New(context.Background(), Options{Budget: 3, Window: 5 * time.Minute, SlowRetry: time.Minute,
		Backoff: []time.Duration{50 * time.Millisecond, 50 * time.Millisecond, 50 * time.Millisecond},
		Probe: ProbeSession(func(ctx context.Context) (*core.Core, error) {
			attempt++
			if attempt == 1 {
				return core.Start(ctx, opts("slow-start", 2000))
			}
			return core.Start(ctx, opts("normal", 0))
		}),
		OnHealth: func(h protocol.Health) { health <- h }})

	o := opts("exit-after", 300)
	faults := make(chan core.Fault, 1)
	o.OnFault = func(f core.Fault) { faults <- f }
	c, err := core.Start(context.Background(), o)
	if err != nil {
		t.Fatal(err)
	}
	f := <-faults
	c.Close()
	r.Fault(f)
	var seen []protocol.Health
	timeout := time.After(10 * time.Second)
	for {
		select {
		case h := <-health:
			seen = append(seen, h)
			if h.Core == "up" {
				if seen[0].Code != core.CodeDown || seen[0].Attempt != 1 {
					t.Fatalf("first health %+v", seen[0])
				}
				if seen[1].Code != core.CodeStart || seen[1].Attempt != 2 {
					t.Fatalf("second health %+v", seen[1])
				}
				return
			}
		case <-timeout:
			t.Fatalf("never recovered: %+v", seen)
		}
	}
}

func itoa(n int) string {
	b := []byte{}
	if n == 0 {
		return "0"
	}
	for n > 0 {
		b = append([]byte{byte('0' + n%10)}, b...)
		n /= 10
	}
	return string(b)
}
