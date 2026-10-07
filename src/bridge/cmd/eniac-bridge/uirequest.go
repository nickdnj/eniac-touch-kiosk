package main

import (
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"os"

	"eniac-kiosk/bridge/internal/config"
	"eniac-kiosk/bridge/internal/metrics"
	"eniac-kiosk/bridge/internal/uiswitch"
)

func init() {
	register("ui-request", "ask the kiosk session for the original UI, withdraw it, or show the switch files", runUIRequest)
}

// runUIRequest is the SSH door (docs/original-ui-switch.md 6.8), run as the
// bridge's user by `sudo eniac-touch-kiosk original-ui tour|interactive|off|status`:
//
//	--mode tour|interactive  write a request (door remote), like the two touch doors
//	--mode off               delete the request: the session closes the original UI
//	--mode status            print availability and the mode, active and last files
//
// It is also the way back if the touch screen fails.
func runUIRequest(args []string) int {
	fs := flag.NewFlagSet("ui-request", flag.ContinueOnError)
	cfgPath := fs.String("config", "/etc/eniac-kiosk/config.yaml", "config file")
	mode := fs.String("mode", "status", "tour, interactive, off or status")
	if err := fs.Parse(args); err != nil {
		return 2
	}
	cfg, err := config.Load(*cfgPath)
	if err != nil {
		fmt.Fprintln(os.Stderr, "eniac-bridge ui-request:", err)
		return 1
	}
	log := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelWarn}))
	sw := uiswitch.New(uiswitch.FromConfig(cfg))
	switch *mode {
	case "status":
		ok, reason := sw.Available()
		if ok {
			fmt.Println("available: yes")
		} else {
			fmt.Printf("available: no (%s)\n", reason)
		}
		files := sw.Files()
		for _, n := range []string{uiswitch.FileMode, uiswitch.FileActive, uiswitch.FileLast} {
			v := files[n]
			if v == "" {
				v = "-"
			}
			fmt.Printf("%-7s %s\n", n+":", v)
		}
		return 0
	case "off":
		had, err := sw.Withdraw()
		switch {
		case err != nil:
			fmt.Fprintln(os.Stderr, "eniac-bridge ui-request:", err)
			return 1
		case had:
			fmt.Println("withdrawn: the kiosk comes back within a few seconds")
		default:
			fmt.Println("no request to withdraw")
		}
		return 0
	case uiswitch.ModeTour, uiswitch.ModeInteractive:
		req, repeat, err := sw.Request(*mode, uiswitch.DoorRemote)
		var un *uiswitch.ErrUnavailable
		switch {
		case errors.As(err, &un):
			fmt.Fprintf(os.Stderr, "eniac-bridge ui-request: the original UI is not available (%s)\n", un.Reason)
			return 3
		case err != nil:
			fmt.Fprintln(os.Stderr, "eniac-bridge ui-request:", err)
			return 1
		case repeat:
			fmt.Printf("already requested or running: %s %s\n", req.Mode, req.ID)
			return 0
		}
		if w, err := metrics.Open(cfg.Paths.State, cfg.Metrics.RetentionDays, log); err == nil {
			w.Bridge("original_ui_enter", "", map[string]any{"door": uiswitch.DoorRemote, "mode": req.Mode})
			w.Close()
		} else {
			log.Warn("metrics not recorded", "err", err)
		}
		fmt.Printf("requested: %s %s (the kiosk session switches within a second)\n", req.Mode, req.ID)
		return 0
	}
	fmt.Fprintln(os.Stderr, "eniac-bridge ui-request: --mode must be tour, interactive, off or status")
	return 2
}
