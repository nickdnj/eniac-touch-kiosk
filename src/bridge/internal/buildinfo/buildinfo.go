// Package buildinfo holds values stamped in at link time by the Makefile
// (-ldflags -X). Defaults apply to `go run` and tests.
package buildinfo

// Protocol is the websocket protocol version (architecture 5.3).
const Protocol = 1

var (
	// Version is the kiosk release version.
	Version = "0.0.0-dev"
	// UpstreamCommit is the pinned upstream commit (upstream.lock).
	UpstreamCommit = "unknown"
	// Patches is a comma-separated list of applied patch names.
	Patches = ""
)

// Build is the string the page compares on hello to decide whether to reload.
func Build() string {
	c := UpstreamCommit
	if len(c) > 7 {
		c = c[:7]
	}
	return Version + "+" + c
}
