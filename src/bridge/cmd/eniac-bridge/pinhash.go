package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"eniac-kiosk/bridge/internal/admin"
)

func init() {
	register("pin-hash", "read a staff PIN (4-8 digits) on stdin, print its bcrypt hash", runPinHash)
}

// runPinHash backs `eniac-touch-kiosk set-pin`, which writes the hash to
// /etc/eniac-touch-kiosk/admin-pin (0640 root:eniac). The PIN never
// appears in an argument, a log line or a file (NFR-10).
func runPinHash(args []string) int {
	if len(args) > 0 {
		fmt.Fprintln(os.Stderr, "usage: eniac-bridge pin-hash < pin")
		return 2
	}
	line, err := bufio.NewReader(os.Stdin).ReadString('\n')
	if err != nil && line == "" {
		fmt.Fprintln(os.Stderr, "eniac-bridge pin-hash: no PIN on stdin")
		return 1
	}
	h, err := admin.HashPIN(strings.TrimRight(line, "\r\n"))
	if err != nil {
		fmt.Fprintln(os.Stderr, "eniac-bridge pin-hash:", err)
		return 1
	}
	fmt.Println(h)
	return 0
}
