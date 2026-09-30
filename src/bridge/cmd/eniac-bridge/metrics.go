package main

import (
	"log/slog"

	"eniac-kiosk/bridge/internal/config"
	"eniac-kiosk/bridge/internal/session"
)

// newMetrics returns the metrics recorder (#12 replaces this stub).
func newMetrics(config.Config, *slog.Logger) session.Recorder { return nil }
