package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"eniac-kiosk/bridge/internal/buildinfo"
	"eniac-kiosk/bridge/internal/config"
	"eniac-kiosk/bridge/internal/core"
	"eniac-kiosk/bridge/internal/golden"
	"eniac-kiosk/bridge/internal/machine"
)

func init() {
	register("record", "record a golden status stream from the real core", runRecord)
}

// runRecord: eniac-bridge record --program sq.e --inits 3 --out tests/golden
// writes <name>.status (raw vlink stream), <name>.dump (`D` at the end),
// <name>.punch and <name>.meta.json. See tests/golden/README.md.
func runRecord(args []string) int {
	fs := flag.NewFlagSet("record", flag.ContinueOnError)
	cfgPath := fs.String("config", "/etc/eniac-kiosk/config.yaml", "config file")
	program := fs.String("program", "sq.e", "upstream program name (programs/<name>) or an absolute .e path")
	inits := fs.Int("inits", 3, "INIT presses")
	rate := fs.Int("rate", 0, "s cy.rate (0 = unthrottled)")
	settle := fs.Duration("settle", 2*time.Second, "wait after each INIT")
	seconds := fs.Duration("seconds", 0, "extra run time before the dump (programs that run on load)")
	name := fs.String("name", "", "golden name (default: <program>-<inits>inits)")
	out := fs.String("out", "tests/golden", "output directory")
	corePath := fs.String("core", "", "core binary (default: paths.core from the config)")
	unpatched := fs.Bool("unpatched", false, "mark the recording as made with the unpatched core")
	freeze := fs.Bool("freeze", false, "stop the clock (s cy.op 1p) before the dump, for programs still running")
	if err := fs.Parse(args); err != nil {
		return 2
	}
	cfg, err := config.Load(*cfgPath)
	if err != nil {
		fmt.Fprintln(os.Stderr, "record:", err)
		return 1
	}
	if *corePath == "" {
		*corePath = cfg.Paths.Core
	}
	*corePath, _ = filepath.Abs(*corePath)
	preset := *program
	if !filepath.IsAbs(preset) {
		preset = filepath.Join(cfg.Paths.Upstream, "programs", preset)
	}
	if *name == "" {
		*name = fmt.Sprintf("%s-%dinits", strings.TrimSuffix(filepath.Base(*program), ".e"), *inits)
	}
	self, err := os.Executable()
	if err != nil {
		fmt.Fprintln(os.Stderr, "record:", err)
		return 1
	}
	os.MkdirAll(cfg.Paths.Run, 0o700)
	srv, err := core.ListenVlink(filepath.Join(cfg.Paths.Run, fmt.Sprintf("rec%d.sock", os.Getpid())), nil)
	if err != nil {
		fmt.Fprintln(os.Stderr, "record:", err)
		return 1
	}
	defer srv.Close()

	var mu sync.Mutex
	var lines, writes []string
	c, err := core.Start(context.Background(), core.Options{
		CorePath: *corePath, VlinkExe: self, Runtime: cfg.Paths.Upstream,
		SessionDir: filepath.Join(cfg.Paths.Run, "s", fmt.Sprintf("rec%d", os.Getpid())),
		Preset:     preset, Server: srv, GOMAXPROCS: cfg.Core.GOMAXPROCS, InitialRate: *rate,
		OnStatus: func(l string) { mu.Lock(); lines = append(lines, l); mu.Unlock() },
		OnWrite:  func(s string) { mu.Lock(); writes = append(writes, s); mu.Unlock() },
	})
	if err != nil {
		fmt.Fprintln(os.Stderr, "record: start:", err)
		return 1
	}
	fail := func(err error) int {
		c.Close()
		fmt.Fprintln(os.Stderr, "record:", err)
		return 1
	}
	for i := 0; i < *inits; i++ {
		if _, err := c.Do(core.ButtonInit()); err != nil {
			return fail(err)
		}
		time.Sleep(*settle)
	}
	time.Sleep(*seconds)
	if *freeze {
		// Pulse mode: the cycling unit waits for a button that never comes,
		// so the machine holds still and the dump matches the last sample.
		op, _ := core.SetCycleOp("1p")
		if _, err := c.Do(op); err != nil {
			return fail(err)
		}
	}
	time.Sleep(300 * time.Millisecond) // let the 30 ms status sampler flush
	dump, err := c.Do(core.DumpAll())
	if err != nil {
		return fail(err)
	}
	time.Sleep(100 * time.Millisecond)
	punch, _ := os.ReadFile(c.PunchPath)
	c.Close()

	mu.Lock()
	defer mu.Unlock()
	m := machine.NewMirror(nil)
	for _, l := range lines {
		m.ApplyLine(l)
	}
	st := m.State()
	meta := golden.Meta{
		Name: *name, Program: filepath.Base(*program), Rate: *rate, Inits: *inits, Seconds: seconds.Seconds(),
		Patched: !*unpatched, Upstream: buildinfo.UpstreamCommit, Commands: writes,
		RecordedAt: time.Now().UTC().Format(time.RFC3339), Settled: *freeze || (st.ProgIdle() && st.GatesIdle()),
	}
	if err := os.MkdirAll(*out, 0o755); err != nil {
		fmt.Fprintln(os.Stderr, "record:", err)
		return 1
	}
	mb, _ := json.MarshalIndent(meta, "", "  ")
	for ext, data := range map[string][]byte{
		".status":    []byte(strings.Join(lines, "\n") + "\n"),
		".dump":      []byte(strings.Join(dump, "\n") + "\n"),
		".punch":     punch,
		".meta.json": append(mb, '\n'),
	} {
		if err := os.WriteFile(filepath.Join(*out, *name+ext), data, 0o644); err != nil {
			fmt.Fprintln(os.Stderr, "record:", err)
			return 1
		}
	}
	fmt.Printf("record: %s: %d status lines, %d dump lines, %d punch bytes, settled=%v\n",
		*name, len(lines), len(dump), len(punch), meta.Settled)
	return 0
}
