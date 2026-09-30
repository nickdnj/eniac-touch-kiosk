package main

import (
	"os"

	"eniac-kiosk/bridge/internal/core"
)

func init() {
	register("vlink", "the core's display child (spawned by the core, not by hand)", func(args []string) int {
		return core.RunVlink(args, os.Stdin, os.Stdout)
	})
}
