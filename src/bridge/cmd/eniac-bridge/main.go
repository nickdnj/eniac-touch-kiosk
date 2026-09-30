// Command eniac-bridge is the kiosk's Go daemon (architecture 3.2).
//
//	eniac-bridge serve [--config FILE] [--dev]   run the websocket bridge
//	eniac-bridge version                         print version and upstream pin
//
// Later stories add: vlink, record, mission check, selftest.
package main

import (
	"fmt"
	"os"
	"sort"
)

type command struct {
	summary string
	run     func(args []string) int
}

var commands = map[string]command{}

func register(name, summary string, run func([]string) int) {
	commands[name] = command{summary, run}
}

func usage() {
	fmt.Fprintln(os.Stderr, "usage: eniac-bridge <command> [flags]")
	names := make([]string, 0, len(commands))
	for n := range commands {
		names = append(names, n)
	}
	sort.Strings(names)
	for _, n := range names {
		fmt.Fprintf(os.Stderr, "  %-14s %s\n", n, commands[n].summary)
	}
}

func main() {
	if len(os.Args) < 2 {
		usage()
		os.Exit(2)
	}
	c, ok := commands[os.Args[1]]
	if !ok {
		usage()
		os.Exit(2)
	}
	os.Exit(c.run(os.Args[2:]))
}
