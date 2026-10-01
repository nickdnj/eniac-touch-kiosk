package main

import (
	"log/slog"

	"eniac-kiosk/bridge/internal/config"
	"eniac-kiosk/bridge/internal/metrics"
	"eniac-kiosk/bridge/internal/session"
)

// newMetrics opens the JSONL writer under paths.state. If it can't, the
// kiosk still runs (metrics are not worth an outage) and the error is logged.
func newMetrics(cfg config.Config, log *slog.Logger) session.Recorder {
	w, err := metrics.Open(cfg.Paths.State, cfg.Metrics.RetentionDays, log)
	if err != nil {
		log.Error("metrics disabled", "err", err)
		return nil
	}
	return w
}
