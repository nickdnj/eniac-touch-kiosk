//go:build devserver

package server

import (
	"net/http"
	"path/filepath"

	"github.com/evanw/esbuild/pkg/api"
)

// DevSupported reports whether this binary can serve src/web in --dev mode.
const DevSupported = true

// DevWebHandler serves src/web, bundling app/main.ts with esbuild's Go API
// on every request for /app.js (rebuild-on-request, architecture 11.2).
// Only compiled in with -tags devserver (make dev); never in a release.
func DevWebHandler(webSrc string) http.Handler {
	files := http.FileServer(http.Dir(webSrc))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/app.js" {
			files.ServeHTTP(w, r)
			return
		}
		res := api.Build(api.BuildOptions{
			EntryPoints: []string{filepath.Join(webSrc, "app", "main.ts")},
			Bundle:      true,
			Format:      api.FormatESModule,
			Target:      api.ES2022,
			Sourcemap:   api.SourceMapInline,
			Write:       false,
			LogLevel:    api.LogLevelSilent,
		})
		if len(res.Errors) > 0 {
			w.Header().Set("Content-Type", "text/plain; charset=utf-8")
			w.WriteHeader(http.StatusInternalServerError)
			for _, m := range api.FormatMessages(res.Errors, api.FormatMessagesOptions{Kind: api.ErrorMessage}) {
				w.Write([]byte(m))
			}
			return
		}
		w.Header().Set("Content-Type", "text/javascript; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		w.Write(res.OutputFiles[0].Contents)
	})
}
