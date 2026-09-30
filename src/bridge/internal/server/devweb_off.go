//go:build !devserver

package server

import "net/http"

// DevSupported reports whether this binary can serve src/web in --dev mode.
const DevSupported = false

// DevWebHandler is unavailable without -tags devserver.
func DevWebHandler(string) http.Handler { return nil }
