// Package server is the bridge's HTTP side: static files, /api, /ws and the
// loopback /healthz (architecture 3.2, 5.3-5.8).
package server

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"time"

	"eniac-kiosk/bridge/internal/config"
	"eniac-kiosk/bridge/internal/mission"
	"eniac-kiosk/bridge/internal/protocol"
)

type Options struct {
	Config   config.Config
	Dev      bool
	Log      *slog.Logger
	Missions *mission.Registry
	Hub      *Hub
	Handler  Handler
	// Healthz returns the /healthz document (nil: a minimal "ok").
	Healthz func() protocol.Healthz
	// Listener overrides Config.Listen (tests).
	Listener net.Listener
	// Ready is called with the bound address once listening.
	Ready func(addr string)
}

type srv struct {
	ctx     context.Context
	log     *slog.Logger
	hub     *Hub
	handler Handler
	origins []string
}

// buildMux builds the HTTP routes.
func buildMux(ctx context.Context, o Options, addr string) (*http.ServeMux, *srv) {
	s := &srv{ctx: ctx, log: o.Log, hub: o.Hub, handler: o.Handler}
	_, port, _ := net.SplitHostPort(addr)
	s.origins = []string{"http://" + o.Config.Listen, "http://127.0.0.1:" + port}
	if o.Dev {
		s.origins = append(s.origins, "http://localhost:"+port)
	}
	mux := http.NewServeMux()
	if o.Missions != nil {
		mux.Handle("/api/missions", o.Missions.Handler())
		mux.Handle("/api/missions/", o.Missions.Handler())
	}
	if o.Hub != nil {
		mux.HandleFunc("/ws", s.handleWS)
	}
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		doc := protocol.Healthz{Status: "ok"}
		if o.Healthz != nil {
			doc = o.Healthz()
		}
		code := http.StatusOK
		if doc.Status == "down" {
			code = http.StatusServiceUnavailable
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		w.WriteHeader(code)
		json.NewEncoder(w).Encode(doc)
	})
	if o.Dev && DevSupported {
		mux.Handle("/", DevWebHandler(o.Config.Paths.WebSrc))
	} else {
		mux.Handle("/", http.FileServer(http.Dir(o.Config.Paths.Web)))
	}
	return mux, s
}

// Run serves until ctx is cancelled.
func Run(ctx context.Context, o Options) error {
	if o.Log == nil {
		o.Log = slog.Default()
	}
	ln := o.Listener
	if ln == nil {
		var err error
		if ln, err = net.Listen("tcp", o.Config.Listen); err != nil {
			return err
		}
	}
	mux, _ := buildMux(ctx, o, ln.Addr().String())
	httpSrv := &http.Server{Handler: mux, ReadHeaderTimeout: 5 * time.Second,
		BaseContext: func(net.Listener) context.Context { return ctx }}
	o.Log.Info("listening", "addr", ln.Addr().String(), "dev", o.Dev)
	if o.Ready != nil {
		o.Ready(ln.Addr().String())
	}
	errc := make(chan error, 1)
	go func() { errc <- httpSrv.Serve(ln) }()
	select {
	case <-ctx.Done():
		sctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		return httpSrv.Shutdown(sctx)
	case err := <-errc:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	}
}
