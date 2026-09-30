package main

import (
	"fmt"

	"eniac-kiosk/bridge/internal/buildinfo"
)

func init() {
	register("version", "print the bridge version and upstream pin", func([]string) int {
		fmt.Printf("eniac-bridge %s upstream %s patches [%s] protocol %d\n",
			buildinfo.Version, buildinfo.UpstreamCommit, buildinfo.Patches, buildinfo.Protocol)
		return 0
	})
}
