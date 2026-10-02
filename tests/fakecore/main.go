// Command fakecore is a test double for the simulator core (architecture
// 11.3, test plan 3.5). It speaks the same protocol: `-v "<child> args"`
// spawns the display child and waits for its "ready"; status lines go to
// the child's stdin; commands are read from stdin and acknowledged with
// "> ". Behaviour is scripted with environment variables:
//
//	FAKECORE_MODE      normal | exit-after | hang-stdin | silent-status |
//	                   garbage | error-on-command | slow-start | load-error |
//	                   vlink-drop | stale-token | flood | huge-punch |
//	                   busy-stall
//	FAKECORE_AFTER     milliseconds (exit-after, silent-status, slow-start,
//	                   vlink-drop) or commands (hang-stdin, default 2)
//	FAKECORE_MATCH     command prefix that triggers error-on-command
//	FAKECORE_N         cards for huge-punch (default 6000); for busy-stall,
//	                   the cards punched after "b i" (default 3), FAKECORE_AFTER
//	                   ms apart (default 200), after which the run stays busy
//	                   (a program flip-flop stays set) and nothing more comes
//	FAKECORE_STDIN_LOG append every stdin line here (allow-list checks)
//
//	traj               a short trajdemo flight for the attract loop: "b r"
//	                   loads Acc 1 = 97367; "b i" punches FAKECORE_N cards
//	                   (default 6) FAKECORE_AFTER ms apart (default 100),
//	                   the last with "up" below zero (column 71 '-'), and
//	                   keeps flying (as trajdemo does) until "s cy.op 1a".
//	                   FAKECORE_TRAJ_FAIL = exit | stall | read makes the
//	                   flight exit after card 2, stop punching (busy) after
//	                   card 2, or never load the card; FAKECORE_ONCE=<path>
//	                   applies it to one core only (the first to create it).
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
	trajFail := os.Getenv("FAKECORE_TRAJ_FAIL")
	if p := os.Getenv("FAKECORE_ONCE"); p != "" && trajFail != "" {
		f, err := os.OpenFile(p, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o644)
		if err != nil {
			trajFail = "" // another core already failed
		} else {
			f.Close()
		}
	}
	var frozen sync.Once
	frozenc := make(chan struct{})
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
		case mode == "busy-stall" && line == "b i":
			go func() {
				status("af 0 11 1") // acc 1 program 12 stays set: the run never goes idle
				gap := envInt("FAKECORE_AFTER", 200)
				for i := 1; i <= envInt("FAKECORE_N", 3); i++ {
					time.Sleep(time.Duration(gap) * time.Millisecond)
					status("punch " + fmt.Sprintf("%80s", fmt.Sprintf("%010d          ", 2*i+1)))
				}
			}()
		case mode == "traj" && line == "b r" && trajFail != "read":
			go status("init 000001000000000", "ad 0 6 9", "ad 0 7 7", "ad 0 8 3", "ad 0 9 6", "ad 0 10 7", "init 000000000000000")
		case mode == "traj" && line == "s cy.op 1a":
			frozen.Do(func() { close(frozenc) })
		case mode == "traj" && line == "b i":
			go func() {
				status("af 3 0 1") // a program flip-flop stays set: busy while flying
				gap := envInt("FAKECORE_AFTER", 100)
				n := envInt("FAKECORE_N", 6)
				for i := 1; ; i++ {
					select {
					case <-frozenc:
						return
					case <-time.After(time.Duration(gap) * time.Millisecond):
					}
					hop := (i-1)%n + 1
					if trajFail == "exit" && i == 3 {
						os.Exit(4)
					}
					if trajFail == "stall" && i == 3 {
						return // busy, never another card
					}
					up := fmt.Sprintf("%010d", 1000*hop*(n-hop))
					if hop == n {
						up = "-000000029"
					}
					fields := []string{"00000", "00000", "00000", "00000", "00000", fmt.Sprintf("%05d", hop),
						"00000", "00000", "00000", "00000"}
					along := fmt.Sprintf("%010d", 14128681*hop)
					fields = append(fields, along[:5], along[5:], "00000", "00000", up[:5], up[5:])
					status("punch " + strings.Join(fields, ""))
				}
			}()
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
