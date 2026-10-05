// Package server is the bridge's HTTP side: static files, /api, /ws and the
// loopback /healthz (architecture 3.2, 5.3-5.8).
package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
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
		mux.Handle("/", revalidate(stamped(o.Config.Paths.WebSrc, DevWebHandler(o.Config.Paths.WebSrc))))
	} else {
		mux.Handle("/", revalidate(stamped(o.Config.Paths.Web, http.FileServer(http.Dir(o.Config.Paths.Web)))))
	}
	return mux, s
}

// revalidate makes the browser check every web file with the bridge before
// using its cached copy (a cheap 304 on localhost). Without it Chromium
// caches the stylesheets by heuristic and, after an update, can draw the new
// app.js with the old CSS. A handler's own Cache-Control (app.js: no-store) wins.
func revalidate(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-cache")
		h.ServeHTTP(w, r)
	})
}

var assetRef = regexp.MustCompile(`(href|src)="(/[^"?]+\.(?:css|js))"`)

// stamped serves the page itself with each stylesheet and script link
// carrying its file's modification time (/styles/app.css?v=1759...). A
// changed file is then a new URL, so a copy the browser cached earlier
// (before revalidate, or by an older release) can never be drawn with a newer
// app.js. Files that are not on disk (the dev server's bundled app.js) are
// left as they are.
func stamped(webDir string, h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			h.ServeHTTP(w, r)
			return
		}
		page, err := os.ReadFile(filepath.Join(webDir, "index.html"))
		if err != nil {
			h.ServeHTTP(w, r)
			return
		}
		page = assetRef.ReplaceAllFunc(page, func(m []byte) []byte {
			sub := assetRef.FindSubmatch(m)
			st, err := os.Stat(filepath.Join(webDir, filepath.FromSlash(string(sub[2]))))
			if err != nil {
				return m
			}
			return []byte(fmt.Sprintf(`%s="%s?v=%d"`, sub[1], sub[2], st.ModTime().Unix()))
		})
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write(page)
	})
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
