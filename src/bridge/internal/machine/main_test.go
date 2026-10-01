package machine_test

import (
	"os"
	"testing"

	"eniac-kiosk/bridge/internal/core"
)

// The test binary doubles as the core's vlink child (real-core idle tests).
func TestMain(m *testing.M) {
	if len(os.Args) > 1 && os.Args[1] == "vlink" {
		os.Exit(core.RunVlink(os.Args[2:], os.Stdin, os.Stdout))
	}
	os.Exit(m.Run())
}
