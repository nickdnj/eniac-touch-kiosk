// Package server is the bridge's HTTP side: static files, /api, /ws and the
// loopback /healthz (architecture 3.2, 5.3-5.8).
package server

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"time"

	"eniac-kiosk/bridge/internal/config"
)

type Options struct {
	Config config.Config
	Dev    bool
	Log    *slog.Logger
}

// Run serves until ctx is cancelled.
func Run(ctx context.Context, o Options) error {
	mux := http.NewServeMux()
	if o.Dev {
		mux.Handle("/", DevWebHandler(o.Config.Paths.WebSrc))
	} else {
		mux.Handle("/", http.FileServer(http.Dir(o.Config.Paths.Web)))
	}
	ln, err := net.Listen("tcp", o.Config.Listen)
	if err != nil {
		return err
	}
	srv := &http.Server{Handler: mux, ReadHeaderTimeout: 5 * time.Second}
	o.Log.Info("listening", "addr", ln.Addr().String(), "dev", o.Dev)
	errc := make(chan error, 1)
	go func() { errc <- srv.Serve(ln) }()
	select {
	case <-ctx.Done():
		sctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		return srv.Shutdown(sctx)
	case err := <-errc:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	}
}
