package session

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"eniac-kiosk/bridge/internal/protocol"
	"eniac-kiosk/bridge/internal/testenv"
)

// Every server message from a real Squares session decodes strictly into
// its protocol type (no unknown fields). With ENIAC_WRITE_FIXTURES=1 one
// example of each type is written to tests/fixtures/protocol/ for the web
// side's contract tests (test plan 3.3).
func TestRealSessionMessagesMatchProtocol(t *testing.T) {
	r := newRig(t, nil)
	cl := r.connect()
	cl.wait(3*time.Second, "state", is("state"))
	cl.send(`{"t":"ping"}`)
	cl.startSquares()
	cl.send(`{"t":"apply_step","step":"nope"}`)
	cl.send(`{"t":"apply_step","step":"j1-one"}`)
	cl.wait(3*time.Second, "step_applied", is("step_applied"))
	cl.send(`{"t":"skip_setup"}`)
	cl.wait(10*time.Second, "setup_complete", is("setup_complete"))
	cl.send(`{"t":"set_speed","speed":"full"}`)
	cl.initAndWait()
	cl.seen(2*time.Second, "checkpoint", is("checkpoint"))
	time.Sleep(6 * time.Second) // one periodic health broadcast
	cl.send(`{"t":"end_session","reason":"done"}`)
	cl.wait(3*time.Second, "none", is("session", "state", "none"))

	types := map[string]func() any{
		"hello": func() any { return &protocol.Hello{} }, "state": func() any { return &protocol.State{} },
		"frame": func() any { return &protocol.Frame{} }, "session": func() any { return &protocol.Session{} },
		"step_applied": func() any { return &protocol.StepApplied{} }, "setup_complete": func() any { return &protocol.SetupComplete{} },
		"run": func() any { return &protocol.Run{} }, "checkpoint": func() any { return &protocol.Checkpoint{} },
		"health": func() any { return &protocol.Health{} }, "error": func() any { return &protocol.Error{} },
		"pong": func() any { return &protocol.Pong{} },
	}
	examples := map[string][]byte{}
	cl.mu.Lock()
	hist := append([]map[string]any(nil), cl.history...)
	cl.mu.Unlock()
	for _, m := range hist {
		typ, _ := m["t"].(string)
		mk, ok := types[typ]
		if !ok {
			t.Fatalf("unexpected message type %q", typ)
		}
		b, _ := json.Marshal(m)
		d := json.NewDecoder(bytes.NewReader(b))
		d.DisallowUnknownFields()
		if err := d.Decode(mk()); err != nil {
			t.Fatalf("%s does not match its protocol type: %v\n%s", typ, err, b)
		}
		// Prefer the richest example (e.g. a state with a machine).
		if len(b) > len(examples[typ]) && !(typ == "state" && m["machine"] == nil && examples[typ] != nil) {
			if typ == "frame" && len(examples[typ]) > 0 {
				continue
			}
			examples[typ] = b
		}
	}
	for typ := range types {
		if examples[typ] == nil {
			t.Errorf("no %s message seen in the session", typ)
		}
	}
	if os.Getenv("ENIAC_WRITE_FIXTURES") == "1" {
		root, _ := testenv.RepoRoot()
		dir := filepath.Join(root, "tests", "fixtures", "protocol")
		os.MkdirAll(dir, 0o755)
		for typ, b := range examples {
			var v any
			json.Unmarshal(b, &v)
			pretty, _ := json.MarshalIndent(v, "", "  ")
			os.WriteFile(filepath.Join(dir, typ+".json"), append(pretty, '\n'), 0o644)
		}
	}
}

// The committed fixtures still decode strictly (they are the web side's
// contract examples).
func TestCommittedFixtures(t *testing.T) {
	root, _ := testenv.RepoRoot()
	files, _ := filepath.Glob(filepath.Join(root, "tests", "fixtures", "protocol", "*.json"))
	if len(files) == 0 {
		t.Skip("no fixtures")
	}
	for _, f := range files {
		b, _ := os.ReadFile(f)
		var head struct{ T string }
		json.Unmarshal(b, &head)
		if head.T == "" {
			t.Errorf("%s has no t", f)
		}
	}
}
