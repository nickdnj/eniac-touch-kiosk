package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"eniac-kiosk/bridge/internal/config"
	"eniac-kiosk/bridge/internal/mission"
	"eniac-kiosk/bridge/internal/server"
	"eniac-kiosk/bridge/internal/session"
)

func init() {
	register("serve", "run the bridge (HTTP, websocket, core sessions)", runServe)
}

func runServe(args []string) int {
	fs := flag.NewFlagSet("serve", flag.ContinueOnError)
	cfgPath := fs.String("config", "/etc/eniac-kiosk/config.yaml", "config file")
	dev := fs.Bool("dev", false, "dev mode: serve src/web via esbuild, allow the localhost origin")
	debug := fs.Bool("debug", false, "debug logging (includes every core stdin write as `core< ...`)")
	if err := fs.Parse(args); err != nil {
		return 2
	}
	level := slog.LevelInfo
	if *debug || *dev {
		level = slog.LevelDebug
	}
	log := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: level}))
	cfg, err := config.Load(*cfgPath)
	if err != nil {
		fmt.Fprintln(os.Stderr, "eniac-bridge serve:", err)
		return 1
	}
	if *dev && !server.DevSupported {
		fmt.Fprintln(os.Stderr, "eniac-bridge serve: --dev needs a binary built with -tags devserver (make dev)")
		return 1
	}
	list, err := mission.LoadDir(cfg.Paths.Missions, cfg.Paths.Upstream)
	if err != nil {
		log.Error("missions", "err", err)
		return 1
	}
	for _, m := range list {
		if m.Available {
			log.Info("mission available", "id", m.File.ID)
		} else {
			log.Warn("mission unavailable", "id", m.File.ID, "reason", m.Reason)
		}
	}
	reg := mission.NewRegistry(list)
	self, err := os.Executable()
	if err != nil {
		log.Error("executable", "err", err)
		return 1
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	hub := server.NewHub(log)
	mgr, err := session.New(ctx, session.Options{Config: cfg, Missions: reg, Hub: hub, VlinkExe: self, Log: log,
		Metrics: newMetrics(cfg, log)})
	if err != nil {
		log.Error("session manager", "err", err)
		return 1
	}
	defer mgr.Close()
	if err := server.Run(ctx, server.Options{Config: cfg, Dev: *dev, Log: log, Missions: reg, Hub: hub,
		Handler: mgr, Healthz: mgr.Healthz}); err != nil {
		log.Error("serve failed", "err", err)
		return 1
	}
	return 0
}
