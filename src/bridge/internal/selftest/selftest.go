// Package selftest runs a mission headless on the real core: boot the
// preset, apply every step, press INIT with idle waits and check the known
// answer (architecture 5.9.5 rule 8). Used by `eniac-bridge selftest`, the
// update helper (M3) and tests.
package selftest

import (
	"context"
	"fmt"
	"log/slog"
	"path/filepath"
	"strconv"
	"time"

	"eniac-kiosk/bridge/internal/core"
	"eniac-kiosk/bridge/internal/machine"
	"eniac-kiosk/bridge/internal/mission"
)

type Options struct {
	Mission  *mission.Mission
	CorePath string
	VlinkExe string
	Runtime  string
	RunDir   string // holds the vlink socket and the session dir
	Speed    string // default: the mission's default speed
	Log      *slog.Logger
}

// Result of a selftest.
type Result struct {
	ReadyIn time.Duration
	Settled map[string]int64
}

// Run executes the mission's selftest block.
func Run(ctx context.Context, o Options) (Result, error) {
	var res Result
	m := o.Mission
	st := m.File.Selftest
	if st == nil {
		return res, fmt.Errorf("mission %s has no selftest block", m.File.ID)
	}
	if o.Speed == "" {
		o.Speed = m.File.Run.DefaultSpeed
	}
	speed, ok := m.Speed(o.Speed)
	if !ok {
		return res, fmt.Errorf("unknown speed %q", o.Speed)
	}
	srv, err := core.ListenVlink(filepath.Join(o.RunDir, fmt.Sprintf("st%d.sock", time.Now().UnixNano()%100000)), o.Log)
	if err != nil {
		return res, err
	}
	defer srv.Close()
	sessionDir := filepath.Join(o.RunDir, "s", "selftest")
	preset, err := m.WritePreset(sessionDir)
	if err != nil {
		return res, err
	}
	mir := machine.NewMirror(nil)
	t0 := time.Now()
	c, err := core.Start(ctx, core.Options{CorePath: o.CorePath, VlinkExe: o.VlinkExe, Runtime: o.Runtime,
		SessionDir: sessionDir, Preset: preset, Server: srv, InitialRate: speed.Rate, OnStatus: mir.ApplyLine, Log: o.Log})
	if err != nil {
		return res, fmt.Errorf("core start: %w", err)
	}
	defer c.Close()
	res.ReadyIn = time.Since(t0)
	for _, id := range m.StepIDs() {
		txt, _ := m.StepText(id)
		cmd, err := core.StepLine(txt)
		if err != nil {
			return res, err
		}
		if out, err := c.Do(cmd); err != nil {
			return res, fmt.Errorf("step %s (%s): %w %v", id, txt, err, out)
		}
	}
	q, _ := m.QuietOverrideMs()
	tr := machine.NewRunTracker(mir, m.Watch(), speed.Rate, q)
	for i := 1; i <= st.Inits; i++ {
		if _, err := c.Do(core.ButtonInit()); err != nil {
			return res, fmt.Errorf("INIT %d: %w", i, err)
		}
		tr.Pressed(true)
		deadline := time.Now().Add(30 * time.Second)
		for {
			if ev, ok := tr.Tick(); ok {
				res.Settled = ev.Settled
				break
			}
			if f, bad := c.Faulted(); bad {
				return res, f
			}
			if time.Now().After(deadline) {
				return res, fmt.Errorf("INIT %d: machine never went idle", i)
			}
			time.Sleep(33 * time.Millisecond)
		}
	}
	// Check against the core's own dump, not only the mirror.
	for k, want := range st.Expect {
		n, _ := strconv.Atoi(k)
		cmd, _ := core.DumpAcc(n)
		out, err := c.Do(cmd)
		if err != nil || len(out) != 1 {
			return res, fmt.Errorf("d a%d: %v %q", n, err, out)
		}
		var sign byte
		var digits string
		fmt.Sscanf(out[0], "%c %s", &sign, &digits)
		v, _ := strconv.ParseInt(digits, 10, 64)
		if sign == 'M' {
			v -= 10_000_000_000
		}
		if v != want {
			return res, fmt.Errorf("after %d INITs acc %d = %d (core dump), want %d", st.Inits, n, v, want)
		}
		if got := res.Settled[k]; got != want {
			return res, fmt.Errorf("after %d INITs the bridge reported acc %d = %d, want %d", st.Inits, n, got, want)
		}
	}
	return res, nil
}
