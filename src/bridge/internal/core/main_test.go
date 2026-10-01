package core

import (
	"os"
	"testing"
)

// The test binary doubles as the vlink child: the core runs
// `<test binary> vlink --sock S --session T`.
func TestMain(m *testing.M) {
	if len(os.Args) > 1 && os.Args[1] == "vlink" {
		os.Exit(RunVlink(os.Args[2:], os.Stdin, os.Stdout))
	}
	os.Exit(m.Run())
}
