// Command fakecore is a test double for the simulator core (architecture
// 11.3, test plan 3.5). It speaks the same protocol: `-v "<child> args"`
// spawns the display child and waits for its "ready"; status lines go to
// the child's stdin; commands are read from stdin and acknowledged with
// "> ". Behaviour is scripted with environment variables:
//
//	FAKECORE_MODE      normal | exit-after | hang-stdin | silent-status |
//	                   garbage | error-on-command | slow-start | load-error |
//	                   vlink-drop | stale-token | flood | huge-punch
//	FAKECORE_AFTER     milliseconds (exit-after, silent-status, slow-start,
//	                   vlink-drop) or commands (hang-stdin, default 2)
//	FAKECORE_MATCH     command prefix that triggers error-on-command
//	FAKECORE_N         cards for huge-punch (default 6000)
//	FAKECORE_STDIN_LOG append every stdin line here (allow-list checks)
//
// It is never shipped: `make release` fails if it appears in a release.
package main

import (
	"bufio"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"time"
)

func envInt(k string, def int) int {
	if v, err := strconv.Atoi(os.Getenv(k)); err == nil {
		return v
	}
	return def
}

func main() {
	vcmd := flag.String("v", "", "display child")
	flag.Parse()
	mode := os.Getenv("FAKECORE_MODE")
	after := envInt("FAKECORE_AFTER", -1)
	var logf *os.File
	if p := os.Getenv("FAKECORE_STDIN_LOG"); p != "" {
		logf, _ = os.OpenFile(p, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	}

	var childIn *os.File
	var child *exec.Cmd
	var outMu sync.Mutex
	var statusW *bufio.Writer
	if *vcmd != "" {
		argv := strings.Split(*vcmd, " ")
		if mode == "stale-token" {
			for i := range argv {
				if argv[i] == "--session" && i+1 < len(argv) {
					argv[i+1] = "stale0000000000000000000000000000"
				}
			}
		}
		child = exec.Command(argv[0], argv[1:]...)
		child.Stderr = os.Stderr
		w, _ := child.StdinPipe()
		r, _ := child.StdoutPipe()
		if err := child.Start(); err != nil {
			fmt.Fprintln(os.Stderr, "fakecore: child:", err)
			os.Exit(1)
		}
		childIn = w.(*os.File)
		statusW = bufio.NewWriter(childIn)
		sc := bufio.NewScanner(r)
		for sc.Scan() {
			if sc.Text() == "ready" {
				break
			}
		}
	}
	status := func(lines ...string) bool {
		outMu.Lock()
		defer outMu.Unlock()
		if statusW == nil {
			return false
		}
		for _, l := range lines {
			statusW.WriteString(l + "\n")
		}
		return statusW.Flush() == nil
	}

	start := time.Now()
	elapsed := func() int { return int(time.Since(start) / time.Millisecond) }
	go func() {
		status("cm C", "init 000000000000000")
		n := 0
		for {
			tick := 30 * time.Millisecond
			if mode == "flood" {
				tick = time.Millisecond
			}
			time.Sleep(tick)
			if mode == "silent-status" && after >= 0 && elapsed() > after {
				continue
			}
			n = (n + 1) % 40
			lines := []string{"cy " + strconv.Itoa(n)}
			switch mode {
			case "garbage":
				lines = append(lines, "zz 1 2", "ad 99 99 99", "\x00\xff", "cy -5", "punch short")
			case "flood":
				for i := 0; i < 50; i++ {
					lines = append(lines, fmt.Sprintf("ad %d %d %d", i%20, 1+i%10, n%10))
				}
			}
			if !status(lines...) {
				return
			}
		}
	}()
	if mode == "exit-after" && after >= 0 {
		go func() {
			time.Sleep(time.Duration(after) * time.Millisecond)
			os.Exit(3)
		}()
	}
	if mode == "vlink-drop" && after >= 0 {
		go func() {
			time.Sleep(time.Duration(after) * time.Millisecond)
			outMu.Lock()
			statusW = nil
			childIn.Close()
			outMu.Unlock()
			if child != nil {
				child.Process.Kill()
			}
		}()
	}
	if mode == "huge-punch" {
		go func() {
			n := envInt("FAKECORE_N", 6000)
			for i := 1; i <= n; i++ {
				card := fmt.Sprintf("%80s", fmt.Sprintf("%05d", i))
				status("punch " + card)
			}
		}()
	}

	if mode == "slow-start" && after >= 0 {
		time.Sleep(time.Duration(after) * time.Millisecond)
	} else {
		time.Sleep(50 * time.Millisecond)
	}
	if mode == "load-error" {
		fmt.Println("Invalid jack: zz on accumulator 1")
	}
	if mode == "garbage" {
		fmt.Println("some unexpected chatter")
	}
	fmt.Print("> ")
	hangAfter := after
	if hangAfter < 0 {
		hangAfter = 2
	}
	sc := bufio.NewScanner(os.Stdin)
	cmds := 0
	for sc.Scan() {
		line := sc.Text()
		cmds++
		if logf != nil {
			logf.WriteString(line + "\n")
		}
		if line == "q" {
			os.Exit(0)
		}
		if mode == "hang-stdin" && cmds > hangAfter {
			continue // never ack again
		}
		switch {
		case line == "d i":
			fmt.Println("000000000000000")
		case strings.HasPrefix(line, "d a"):
			fmt.Println("P 0000000000 0000000000 0 000000000000")
		case mode == "error-on-command" && strings.HasPrefix(line, os.Getenv("FAKECORE_MATCH")):
			fmt.Println("Invalid jack: zz on accumulator 1")
		}
		fmt.Print("> ")
	}
}
