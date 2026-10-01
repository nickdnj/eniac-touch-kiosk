package core

import (
	"bufio"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"net"
	"os"
	"strings"
	"sync"
	"time"
)

// RunVlink is `eniac-bridge vlink --sock S --session TOKEN`, the core's -v
// display child (architecture 3.4, ADR-001):
//
//   - connects to the bridge's Unix socket and sends HELLO <token>;
//   - waits for the bridge to accept the token;
//   - writes exactly one line, "ready", to stdout (the core's command
//     channel: timed status mode). It never writes anything else;
//   - copies stdin (the status stream) to the socket unchanged;
//   - exits when stdin closes (core exit) or the socket closes (bridge gone).
func RunVlink(args []string, stdin io.Reader, stdout io.Writer) int {
	fs := flag.NewFlagSet("vlink", flag.ContinueOnError)
	sock := fs.String("sock", "", "bridge socket")
	token := fs.String("session", "", "session token")
	if err := fs.Parse(args); err != nil || *sock == "" || *token == "" {
		fmt.Fprintln(os.Stderr, "vlink: usage: vlink --sock PATH --session TOKEN")
		return 2
	}
	conn, err := net.DialTimeout("unix", *sock, 5*time.Second)
	if err != nil {
		fmt.Fprintln(os.Stderr, "vlink:", err)
		return 1
	}
	defer conn.Close()
	if _, err := fmt.Fprintf(conn, "HELLO %s\n", *token); err != nil {
		fmt.Fprintln(os.Stderr, "vlink:", err)
		return 1
	}
	conn.SetReadDeadline(time.Now().Add(5 * time.Second))
	br := bufio.NewReader(conn)
	reply, err := br.ReadString('\n')
	if err != nil || strings.TrimSpace(reply) != "OK" {
		fmt.Fprintln(os.Stderr, "vlink: session token rejected by the bridge")
		return 1
	}
	conn.SetReadDeadline(time.Time{})
	if _, err := io.WriteString(stdout, "ready\n"); err != nil {
		return 1
	}
	done := make(chan struct{}, 2)
	go func() {
		// The bridge never sends anything after OK; EOF means it went away.
		io.Copy(io.Discard, br)
		done <- struct{}{}
	}()
	go func() {
		io.Copy(conn, stdin)
		done <- struct{}{}
	}()
	<-done
	return 0
}

// VlinkServer is the bridge side of the vlink socket. It outlives every
// core. Each core session registers a one-time random token; a vlink that
// presents an unknown, stale or already-used token is refused, so a stray
// core from an old session can't feed status into a new one.
type VlinkServer struct {
	Path string
	ln   net.Listener
	log  *slog.Logger

	mu      sync.Mutex
	pending map[string]chan net.Conn
	closed  bool
}

// ListenVlink listens on a Unix socket at path (mode 0600). A stale socket
// file from a previous bridge is removed first.
func ListenVlink(path string, log *slog.Logger) (*VlinkServer, error) {
	if strings.ContainsAny(path, " \t") {
		return nil, fmt.Errorf("vlink socket path must not contain spaces: %q", path)
	}
	if len(path) > 100 {
		return nil, fmt.Errorf("vlink socket path too long for a Unix socket (%d bytes): %q", len(path), path)
	}
	if fi, err := os.Lstat(path); err == nil && fi.Mode()&os.ModeSocket != 0 {
		os.Remove(path)
	}
	ln, err := net.Listen("unix", path)
	if err != nil {
		return nil, err
	}
	os.Chmod(path, 0o600)
	if log == nil {
		log = slog.New(slog.NewTextHandler(io.Discard, nil))
	}
	s := &VlinkServer{Path: path, ln: ln, log: log, pending: map[string]chan net.Conn{}}
	go s.acceptLoop()
	return s, nil
}

func (s *VlinkServer) acceptLoop() {
	for {
		c, err := s.ln.Accept()
		if err != nil {
			s.mu.Lock()
			closed := s.closed
			s.mu.Unlock()
			if closed || errors.Is(err, net.ErrClosed) {
				return
			}
			s.log.Warn("vlink: accept", "err", err)
			time.Sleep(50 * time.Millisecond)
			continue
		}
		go s.handshake(c)
	}
}

func (s *VlinkServer) handshake(c net.Conn) {
	c.SetReadDeadline(time.Now().Add(5 * time.Second))
	// Read the HELLO line byte by byte so no status bytes are buffered away
	// from the session's own reader.
	var line []byte
	b := make([]byte, 1)
	for len(line) < 200 {
		if _, err := c.Read(b); err != nil {
			c.Close()
			return
		}
		if b[0] == '\n' {
			break
		}
		line = append(line, b[0])
	}
	c.SetReadDeadline(time.Time{})
	tok, ok := strings.CutPrefix(string(line), "HELLO ")
	s.mu.Lock()
	ch, found := s.pending[tok]
	if found {
		delete(s.pending, tok) // single use
	}
	s.mu.Unlock()
	if !ok || !found {
		s.log.Warn("vlink: rejected connection with unknown or stale token")
		c.Write([]byte("NO\n"))
		c.Close()
		return
	}
	if _, err := c.Write([]byte("OK\n")); err != nil {
		c.Close()
		return
	}
	ch <- c
}

// Expect registers a new random token and returns it with a channel that
// receives the accepted connection.
func (s *VlinkServer) Expect() (string, <-chan net.Conn) {
	var b [16]byte
	rand.Read(b[:])
	tok := hex.EncodeToString(b[:])
	ch := make(chan net.Conn, 1)
	s.mu.Lock()
	s.pending[tok] = ch
	s.mu.Unlock()
	return tok, ch
}

// Forget revokes a token (idempotent). A connection already delivered is
// unaffected.
func (s *VlinkServer) Forget(tok string) {
	s.mu.Lock()
	delete(s.pending, tok)
	s.mu.Unlock()
}

// Close stops listening and removes the socket file.
func (s *VlinkServer) Close() error {
	s.mu.Lock()
	s.closed = true
	s.mu.Unlock()
	err := s.ln.Close()
	os.Remove(s.Path)
	return err
}
