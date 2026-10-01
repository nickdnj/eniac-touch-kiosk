package econfig_test

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"

	"eniac-kiosk/bridge/internal/core"
	"eniac-kiosk/bridge/internal/econfig"
	"eniac-kiosk/bridge/internal/testenv"
)

func TestMain(m *testing.M) {
	if len(os.Args) > 1 && os.Args[1] == "vlink" {
		os.Exit(core.RunVlink(os.Args[2:], os.Stdin, os.Stdout))
	}
	os.Exit(m.Run())
}

// Catalog drift test: every catalog value (and every accepted alias) is
// accepted by the real core at the pin (the `s` command prints no error),
// and values upstream itself rejects are outside the catalog.
func TestCatalogAcceptedByRealCore(t *testing.T) {
	corePath, rt := testenv.Core(t)
	dir := testenv.ShortTempDir(t)
	srv, err := core.ListenVlink(filepath.Join(dir, "v.sock"), nil)
	if err != nil {
		t.Fatal(err)
	}
	defer srv.Close()
	self, _ := os.Executable()
	faults := make(chan core.Fault, 8)
	start := func() *core.Core {
		c, err := core.Start(context.Background(), core.Options{CorePath: corePath, VlinkExe: self, Runtime: rt,
			SessionDir: filepath.Join(dir, "s"), Preset: filepath.Join(rt, "programs", "sq.e"), Server: srv, InitialRate: -1,
			OnFault: func(f core.Fault) { faults <- f }})
		if err != nil {
			t.Fatal(err)
		}
		return c
	}
	c := start()
	defer func() { c.Close() }()
	sent := 0
	for _, name := range []string{"a3.op1", "a3.op12", "a3.rp5", "a3.rp12", "a3.cc1", "a3.cc12", "c.j1", "c.j10", "c.k5",
		"c.jl", "c.kr", "c.s1", "c.s7", "c.s13", "c.s19", "c.s25", "c.s30", "cy.op", "cy.rate"} {
		sw := econfig.ParseSwitch(name, "0")
		vals := econfig.Catalog(sw)
		if sw.Family == econfig.FamAccOp {
			vals = append(vals, "a", "alpha", "b", "beta", "g", "gamma", "d", "delta", "e", "epsilon")
		}
		if sw.Family == econfig.FamCycleRate {
			vals = []string{"0", "1", "100", "5000"}
		}
		if sw.Family == econfig.FamCycleOp {
			// Leave the clock running: end on co. 1a/1p/cy would stop it.
			vals = []string{"1a", "1p", "cy", "co"}
		}
		if len(vals) == 0 {
			t.Fatalf("%s: empty catalog", name)
		}
		for _, v := range vals {
			if s := econfig.ParseSwitch(name, v); s.Err != "" {
				t.Fatalf("catalog value %s %s fails its own check: %s", name, v, s.Err)
			}
			cmd, err := core.StepLine("s " + name + " " + v)
			if err != nil {
				t.Fatal(err)
			}
			if _, err := c.Do(cmd); err != nil {
				t.Errorf("real core rejected s %s %s: %v", name, v, err)
				c.Close()
				c = start()
			}
			sent++
		}
	}
	t.Logf("%d catalog values accepted by the real core", sent)
	// Values the real core rejects must also be outside the catalog.
	for _, bad := range [][2]string{{"a3.op1", "Z"}, {"a3.cc1", "X"}, {"cy.op", "fast"}} {
		if s := econfig.ParseSwitch(bad[0], bad[1]); s.Err == "" {
			t.Errorf("catalog accepts %v", bad)
		}
		c.Close()
		c = start()
		for len(faults) > 0 {
			<-faults
		}
		cmd, _ := core.StepLine("s " + bad[0] + " " + bad[1])
		_, err := c.Do(cmd)
		var ce *core.CmdError
		if errors.As(err, &ce) {
			continue
		}
		// Under load the error line can land after Do's settle window; the
		// core then raises an asynchronous E-CORE-CMD fault instead.
		select {
		case f := <-faults:
			if f.Code != core.CodeCmd {
				t.Errorf("s %s %s: fault %v, want E-CORE-CMD", bad[0], bad[1], f)
			}
		case <-time.After(2 * time.Second):
			t.Errorf("real core accepted s %s %s (%v)", bad[0], bad[1], err)
		}
	}
}
