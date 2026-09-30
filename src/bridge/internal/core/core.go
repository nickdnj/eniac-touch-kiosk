package core

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"
)

// Fault codes (architecture 5.8).
const (
	CodeStart = "E-CORE-START" // no first prompt in time
	CodeCmd   = "E-CORE-CMD"   // the core printed a known error
	CodeDown  = "E-CORE-DOWN"  // exit, vlink drop, hang-status, hang-cmd
)

// Fault details for CodeDown.
const (
	DetailExit       = "exit"
	DetailVlink      = "vlink"
	DetailHangStatus = "hang-status"
	DetailHangCmd    = "hang-cmd"
)

// Fault describes why a core session is no longer usable.
type Fault struct {
	Code   string
	Detail string
	Line   string // the offending core output, for CodeCmd
}

func (f Fault) Error() string {
	s := f.Code
	if f.Detail != "" {
		s += " (" + f.Detail + ")"
	}
	if f.Line != "" {
		s += ": " + f.Line
	}
	return s
}

// ErrAckTimeout is returned when the core does not acknowledge a command
// with a prompt in time. The dev plan calls this E-CORE-HANG; it is reported
// to the rest of the bridge as E-CORE-DOWN with detail hang-cmd (5.8).
var ErrAckTimeout = errors.New("core: no prompt ack (E-CORE-HANG)")

// ErrClosed is returned for commands on a core that has faulted or closed.
var ErrClosed = errors.New("core: session closed")

// CmdError reports a known error line printed in response to a command.
type CmdError struct {
	Cmd  string
	Line string
}

func (e *CmdError) Error() string { return fmt.Sprintf("core: %q -> %q", e.Cmd, e.Line) }

// errorPrefixes are the upstream messages that mean a command was rejected
// (eniac.go, accumulator.go, constant.go, cycle.go, initiate.go ...).
var errorPrefixes = []string{
	"Invalid", "Unknown command", "unknown unit", "No switch", "Card reader open", "Card punch open",
	"open ", "button syntax", "Status syntax", "file syntax", "Load syntax", "LED matrix",
	"Adapter jumper syntax", "Accumulator jumper syntax", "Divider jumper syntax",
	"Function table jumper syntax", "Initiator jumper syntax", "Multiplier jumper syntax",
	"Initiate unit jack syntax", "Constant switch syntax", "Cycling switch syntax", "Divider switch syntax",
	"Function table switch syntax", "Multiplier switch syntax", "Programmer switch syntax", "Printer switch syntax",
	"Accumulator reset syntax", "Function table reset syntax", "cycle unit",
}

// IsErrorLine reports whether a core stdout line is a known error message.
func IsErrorLine(s string) bool {
	for _, p := range errorPrefixes {
		if strings.HasPrefix(s, p) {
			return true
		}
	}
	return false
}

// Options for one core session.
type Options struct {
	CorePath   string // absolute path of eniac-core
	VlinkExe   string // absolute path of the binary that implements `vlink`
	Runtime    string // core cwd: contains programs/ (and demo.card)
	SessionDir string // absolute, created if missing, removed on Close
	Preset     string // absolute path of the .e passed as argv
	Server     *VlinkServer

	GOMAXPROCS int
	Nice       int

	ReadyTimeout   time.Duration // default 5 s
	AckTimeout     time.Duration // default 1.5 s
	SwitchSettle   time.Duration // default 25 ms: wait after an `s` ack for a late error
	SilenceTimeout time.Duration // watchdog; 0 disables
	ProbeEvery     time.Duration // watchdog; 0 disables

	InitialRate int // `s cy.rate N` after ready; negative skips it
	NoPunchFile bool

	ExtraEnv []string // tests only (fakecore modes)

	// OnStatus is called for every status line, in order, on the socket
	// reader goroutine. It must be fast: a slow reader blocks the simulation.
	OnStatus func(line string)
	// OnFault is called at most once, from its own goroutine.
	OnFault func(Fault)
	// OnWrite is called for every command written (for tests/logging).
	OnWrite func(cmd string)

	Log *slog.Logger
}

// Core is one running simulator process.
type Core struct {
	o     Options
	cmd   *exec.Cmd
	stdin io.WriteCloser
	token string
	start time.Time

	outc   chan outEvent // stdout reader -> dispatcher
	exited chan struct{} // closed when the process has been waited for

	cmdMu sync.Mutex // one command in flight

	mu         sync.Mutex
	conn       net.Conn
	cur        *inflight
	lastAck    time.Time
	lastCmd    string
	lateErr    string
	settling   bool
	closing    bool
	faulted    bool
	fault      Fault
	lastStatus time.Time
	cycleMode  string
	lastCmdAt  time.Time

	faultOnce sync.Once
	closeOnce sync.Once
	stop      chan struct{}
	PunchPath string
}

type outEvent struct {
	prompt bool
	line   string
	eof    bool
}

type inflight struct {
	cmd   string
	lines []string
	err   string
	done  chan struct{}
}

func (o *Options) defaults() {
	if o.ReadyTimeout == 0 {
		o.ReadyTimeout = 5 * time.Second
	}
	if o.AckTimeout == 0 {
		o.AckTimeout = 1500 * time.Millisecond
	}
	if o.SwitchSettle == 0 {
		o.SwitchSettle = 25 * time.Millisecond
	}
	if o.GOMAXPROCS == 0 {
		o.GOMAXPROCS = 2
	}
	if o.Log == nil {
		o.Log = slog.New(slog.NewTextHandler(io.Discard, nil))
	}
}

func noSpace(name, p string) error {
	if p == "" {
		return fmt.Errorf("core: %s is empty", name)
	}
	if strings.ContainsAny(p, " \t\n") {
		return fmt.Errorf("core: %s must not contain spaces (the core splits -v on spaces): %q", name, p)
	}
	if !filepath.IsAbs(p) {
		return fmt.Errorf("core: %s must be absolute: %q", name, p)
	}
	return nil
}

// Start launches a fresh core with the preset as argv and waits until it is
// ready: vlink connected and the first "> " prompt printed (architecture 3.3).
// It then sends `f p <punch>` and `s cy.rate <InitialRate>`.
func Start(ctx context.Context, o Options) (*Core, error) {
	o.defaults()
	if o.Server == nil {
		return nil, errors.New("core: no vlink server")
	}
	for _, c := range [][2]string{{"core path", o.CorePath}, {"vlink executable", o.VlinkExe}, {"runtime dir", o.Runtime},
		{"session dir", o.SessionDir}, {"preset", o.Preset}, {"vlink socket", o.Server.Path}} {
		if err := noSpace(c[0], c[1]); err != nil {
			return nil, err
		}
	}
	if err := os.MkdirAll(o.SessionDir, 0o700); err != nil {
		return nil, err
	}
	token, connc := o.Server.Expect()
	c := &Core{o: o, token: token, outc: make(chan outEvent, 1024), exited: make(chan struct{}), stop: make(chan struct{})}
	c.PunchPath = filepath.Join(o.SessionDir, "punch.txt")

	vcmd := fmt.Sprintf("%s vlink --sock %s --session %s", o.VlinkExe, o.Server.Path, token)
	cmd := exec.Command(o.CorePath, "-v", vcmd, o.Preset)
	cmd.Dir = o.Runtime
	cmd.Env = append([]string{fmt.Sprintf("GOMAXPROCS=%d", o.GOMAXPROCS), "PATH=/usr/bin:/bin"}, o.ExtraEnv...)
	cmd.SysProcAttr = sysProcAttr()
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, err
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return nil, err
	}
	c.cmd, c.stdin = cmd, stdin
	c.start = time.Now()
	if err := cmd.Start(); err != nil {
		o.Server.Forget(token)
		return nil, fmt.Errorf("core: start: %w", err)
	}
	if o.Nice != 0 {
		syscall.Setpriority(syscall.PRIO_PROCESS, cmd.Process.Pid, o.Nice)
	}
	o.Log.Debug("core: started", "pid", cmd.Process.Pid, "preset", o.Preset)
	go c.readStdout(stdout)
	go c.readStderr(stderr)
	go func() {
		cmd.Wait()
		close(c.exited)
	}()

	if err := c.waitReady(ctx, connc); err != nil {
		c.Close()
		return nil, err
	}
	go c.dispatch()
	go c.watchExit()
	if !o.NoPunchFile {
		pf, err := PunchFile(c.PunchPath)
		if err == nil {
			_, err = c.Do(pf)
		}
		if err != nil {
			c.Close()
			return nil, err
		}
	}
	if o.InitialRate >= 0 {
		rc, err := SetRate(o.InitialRate)
		if err == nil {
			_, err = c.Do(rc)
		}
		if err != nil {
			c.Close()
			return nil, err
		}
	}
	c.startWatchdog()
	return c, nil
}

// Pid of the core process.
func (c *Core) Pid() int { return c.cmd.Process.Pid }

// Uptime since the process was started.
func (c *Core) Uptime() time.Duration { return time.Since(c.start) }

func (c *Core) waitReady(ctx context.Context, connc <-chan net.Conn) error {
	deadline := time.NewTimer(c.o.ReadyTimeout)
	defer deadline.Stop()
	gotPrompt, gotConn := false, false
	var loadErr string
	for !(gotPrompt && gotConn) {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-deadline.C:
			return Fault{Code: CodeStart, Detail: fmt.Sprintf("no ready in %s (prompt=%v vlink=%v)", c.o.ReadyTimeout, gotPrompt, gotConn)}
		case <-c.exited:
			return Fault{Code: CodeStart, Detail: "core exited during start"}
		case conn := <-connc:
			gotConn = true
			c.mu.Lock()
			c.conn = conn
			c.lastStatus = time.Now()
			c.mu.Unlock()
			go c.readStatus(conn)
		case ev := <-c.outc:
			switch {
			case ev.eof:
				return Fault{Code: CodeStart, Detail: "core stdout closed during start"}
			case ev.prompt:
				gotPrompt = true
				if loadErr != "" {
					return Fault{Code: CodeCmd, Detail: "load", Line: loadErr}
				}
			default:
				// Lines before the first prompt are load diagnostics.
				if IsErrorLine(ev.line) && loadErr == "" {
					loadErr = ev.line
				}
				c.o.Log.Debug("core: load output", "line", ev.line)
			}
		}
	}
	c.o.Server.Forget(c.token)
	c.o.Log.Debug("core: ready", "after", time.Since(c.start).Round(time.Millisecond))
	return nil
}

// readStdout splits the core's stdout into prompts ("> " at the start of a
// line, no newline) and lines.
func (c *Core) readStdout(r io.Reader) {
	br := bufio.NewReaderSize(r, 64*1024)
	for {
		b, err := br.Peek(2)
		if err == nil && b[0] == '>' && b[1] == ' ' {
			br.Discard(2)
			c.outc <- outEvent{prompt: true}
			continue
		}
		line, err := br.ReadString('\n')
		if len(line) > 0 {
			c.outc <- outEvent{line: strings.TrimRight(line, "\r\n")}
		}
		if err != nil {
			c.outc <- outEvent{eof: true}
			return
		}
	}
}

func (c *Core) readStderr(r io.Reader) {
	sc := bufio.NewScanner(r)
	n := 0
	for sc.Scan() {
		if n < 50 {
			c.o.Log.Warn("core: stderr", "line", sc.Text())
		}
		n++
	}
}

// readStatus drains the vlink socket. It must never block for long, because
// the core's status goroutine (and ppunch) block on a full pipe.
func (c *Core) readStatus(conn net.Conn) {
	sc := bufio.NewScanner(conn)
	sc.Buffer(make([]byte, 64*1024), 64*1024)
	for sc.Scan() {
		line := sc.Text()
		now := time.Now()
		c.mu.Lock()
		c.lastStatus = now
		if strings.HasPrefix(line, "cm ") {
			c.cycleMode = strings.TrimSpace(line[3:])
		}
		c.mu.Unlock()
		if c.o.OnStatus != nil {
			c.o.OnStatus(line)
		}
	}
	// Socket closed. If the process is also gone, report that instead.
	select {
	case <-c.exited:
		c.raise(Fault{Code: CodeDown, Detail: DetailExit})
	case <-time.After(150 * time.Millisecond):
		c.raise(Fault{Code: CodeDown, Detail: DetailVlink})
	}
}

// dispatch assigns stdout lines and prompts to the command in flight.
func (c *Core) dispatch() {
	for ev := range c.outc {
		if ev.eof {
			return
		}
		c.mu.Lock()
		cur := c.cur
		if ev.prompt {
			if cur != nil {
				c.cur = nil
				c.lastAck = time.Now()
				c.mu.Unlock()
				close(cur.done)
				continue
			}
			c.mu.Unlock()
			c.o.Log.Debug("core: unexpected prompt")
			continue
		}
		isErr := IsErrorLine(ev.line)
		if cur != nil {
			cur.lines = append(cur.lines, ev.line)
			if isErr && cur.err == "" {
				cur.err = ev.line
			}
			c.mu.Unlock()
			continue
		}
		lastCmd := c.lastCmd
		if isErr && c.settling {
			// Late error for the switch command that is still settling:
			// Do reports it to its caller.
			if c.lateErr == "" {
				c.lateErr = ev.line
			}
			c.mu.Unlock()
			continue
		}
		c.mu.Unlock()
		if isErr {
			// An error nobody asked for: the configuration may have diverged
			// from the known-good .e. That must never happen (FR-14).
			c.o.Log.Error("core: error output", "line", ev.line, "lastCmd", lastCmd)
			c.raise(Fault{Code: CodeCmd, Detail: "after " + lastCmd, Line: ev.line})
			continue
		}
		c.o.Log.Debug("core: stdout", "line", ev.line)
	}
}

// Do writes one command and waits for its prompt ack. It returns the output
// lines that belong to it. A known error line in the output yields a
// *CmdError (the caller decides whether that faults the session). A missing
// ack faults the core with E-CORE-DOWN/hang-cmd and returns ErrAckTimeout.
func (c *Core) Do(cmd Command) ([]string, error) {
	if !cmd.Valid() {
		return nil, errBadCommand
	}
	c.cmdMu.Lock()
	defer c.cmdMu.Unlock()
	c.mu.Lock()
	if c.closing || c.faulted {
		c.mu.Unlock()
		return nil, ErrClosed
	}
	in := &inflight{cmd: cmd.text, done: make(chan struct{})}
	c.cur = in
	c.lastCmd = cmd.text
	c.lastCmdAt = time.Now()
	c.lateErr = ""
	c.mu.Unlock()

	c.o.Log.Debug("core< " + cmd.text)
	if c.o.OnWrite != nil {
		c.o.OnWrite(cmd.text)
	}
	if _, err := io.WriteString(c.stdin, cmd.text+"\n"); err != nil {
		c.mu.Lock()
		c.cur = nil
		c.mu.Unlock()
		return nil, ErrClosed
	}
	t := time.NewTimer(c.o.AckTimeout)
	defer t.Stop()
	select {
	case <-in.done:
	case <-t.C:
		c.mu.Lock()
		c.cur = nil
		c.mu.Unlock()
		c.raise(Fault{Code: CodeDown, Detail: DetailHangCmd, Line: cmd.text})
		return nil, ErrAckTimeout
	case <-c.exited:
		return nil, ErrClosed
	}
	if cmd.IsSwitch() && in.err == "" {
		// Switch settings are handled by a unit goroutine; its error print
		// can land just after the prompt.
		c.mu.Lock()
		c.settling = true
		c.mu.Unlock()
		time.Sleep(c.o.SwitchSettle)
		c.mu.Lock()
		c.settling = false
		late := c.lateErr
		c.mu.Unlock()
		if late != "" {
			in.err = late
		}
	}
	c.mu.Lock()
	lines := in.lines
	c.mu.Unlock()
	if in.err != "" {
		return lines, &CmdError{Cmd: cmd.text, Line: in.err}
	}
	return lines, nil
}

func (c *Core) watchExit() {
	<-c.exited
	c.raise(Fault{Code: CodeDown, Detail: DetailExit})
}

// raise reports a fault once, unless the session is being closed.
func (c *Core) raise(f Fault) {
	c.mu.Lock()
	if c.closing || c.faulted {
		c.mu.Unlock()
		return
	}
	c.faulted = true
	c.fault = f
	c.mu.Unlock()
	c.o.Log.Warn("core: fault", "code", f.Code, "detail", f.Detail, "line", f.Line)
	c.faultOnce.Do(func() {
		if c.o.OnFault != nil {
			go c.o.OnFault(f)
		}
	})
}

// Faulted returns the fault, if any.
func (c *Core) Faulted() (Fault, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.fault, c.faulted
}

// Close tears the session down: `q`, up to 500 ms to exit, then SIGKILL of
// the whole process group (core + vlink), then the session dir is removed.
// It is safe to call more than once and after a fault.
func (c *Core) Close() {
	c.closeOnce.Do(func() {
		c.mu.Lock()
		c.closing = true
		conn := c.conn
		c.mu.Unlock()
		close(c.stop)
		c.o.Server.Forget(c.token)
		if c.cmd.Process != nil {
			select {
			case <-c.exited:
			default:
				c.o.Log.Debug("core< q")
				if c.o.OnWrite != nil {
					c.o.OnWrite("q")
				}
				io.WriteString(c.stdin, quitCmd().text+"\n")
				select {
				case <-c.exited:
				case <-time.After(500 * time.Millisecond):
				}
			}
			killGroup(c.cmd.Process.Pid)
			select {
			case <-c.exited:
			case <-time.After(2 * time.Second):
				c.o.Log.Error("core: process did not exit after SIGKILL", "pid", c.cmd.Process.Pid)
			}
		}
		c.stdin.Close()
		if conn != nil {
			conn.Close()
		}
		if c.o.SessionDir != "" {
			os.RemoveAll(c.o.SessionDir)
		}
	})
}

func killGroup(pid int) {
	// Negative pid: the whole process group (Setpgid made pgid == pid).
	syscall.Kill(-pid, syscall.SIGKILL)
	syscall.Kill(pid, syscall.SIGKILL)
}
