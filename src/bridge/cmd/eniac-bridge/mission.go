package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"path/filepath"

	"eniac-kiosk/bridge/internal/config"
	"eniac-kiosk/bridge/internal/mission"
	"eniac-kiosk/bridge/internal/selftest"
)

func init() {
	register("mission", "mission check FILE...: validate missions against the pinned programs", runMission)
	register("selftest", "boot a mission headless, apply every step, check the known answer", runSelftest)
}

func runMission(args []string) int {
	if len(args) == 0 || args[0] != "check" {
		fmt.Fprintln(os.Stderr, "usage: eniac-bridge mission check [--config F] [--upstream DIR] missions/*.yaml")
		return 2
	}
	fs := flag.NewFlagSet("mission check", flag.ContinueOnError)
	cfgPath := fs.String("config", "/etc/eniac-kiosk/config.yaml", "config file (for paths.upstream)")
	upstream := fs.String("upstream", "", "upstream runtime dir holding programs/ (overrides the config)")
	if err := fs.Parse(args[1:]); err != nil {
		return 2
	}
	if *upstream == "" {
		cfg, err := config.Load(*cfgPath)
		if err != nil {
			fmt.Fprintln(os.Stderr, "mission check:", err)
			return 1
		}
		*upstream = cfg.Paths.Upstream
	}
	files := fs.Args()
	if len(files) == 0 {
		fmt.Fprintln(os.Stderr, "mission check: no mission files")
		return 2
	}
	bad := 0
	for _, f := range files {
		m := mission.Load(f, *upstream)
		if m.Available {
			c := m.Compiled()
			fmt.Printf("ok   %s (%s): %d steps; preset %d cables, %d switches\n", m.File.ID, filepath.Base(f),
				len(c.Steps), c.Counts.PresetCables, c.Counts.PresetSwitches)
			continue
		}
		bad++
		fmt.Printf("FAIL %s:\n", f)
		for _, e := range m.Errors {
			fmt.Printf("     - %s\n", e)
		}
	}
	if bad > 0 {
		return 1
	}
	return 0
}

func runSelftest(args []string) int {
	fs := flag.NewFlagSet("selftest", flag.ContinueOnError)
	cfgPath := fs.String("config", "/etc/eniac-kiosk/config.yaml", "config file")
	id := fs.String("mission", "squares", "mission id")
	speed := fs.String("speed", "", "speed name (default: the mission's default)")
	if err := fs.Parse(args); err != nil {
		return 2
	}
	cfg, err := config.Load(*cfgPath)
	if err != nil {
		fmt.Fprintln(os.Stderr, "selftest:", err)
		return 1
	}
	list, err := mission.LoadDir(cfg.Paths.Missions, cfg.Paths.Upstream)
	if err != nil {
		fmt.Fprintln(os.Stderr, "selftest:", err)
		return 1
	}
	reg := mission.NewRegistry(list)
	m, ok := reg.Get(*id)
	if !ok || !m.Available {
		fmt.Fprintf(os.Stderr, "selftest: mission %s not available: %v\n", *id, m)
		return 1
	}
	self, _ := os.Executable()
	os.MkdirAll(cfg.Paths.Run, 0o700)
	res, err := selftest.Run(context.Background(), selftest.Options{Mission: m, CorePath: cfg.Paths.Core, VlinkExe: self,
		Runtime: cfg.Paths.Upstream, RunDir: cfg.Paths.Run, Speed: *speed})
	if err != nil {
		fmt.Fprintln(os.Stderr, "selftest: FAIL:", err)
		return 1
	}
	fmt.Printf("selftest: ok %s: core ready in %s, after %d INITs %v\n", *id, res.ReadyIn.Round(1e6), m.File.Selftest.Inits, res.Settled)
	return 0
}
