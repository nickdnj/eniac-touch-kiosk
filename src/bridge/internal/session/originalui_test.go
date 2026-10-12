package session

import (
	"errors"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"eniac-kiosk/bridge/internal/admin"
	"eniac-kiosk/bridge/internal/uiswitch"
)

// switchRig is a rig with a working Original UI switch: a switch directory,
// a built eniactk and a wish, all in temp dirs (the fake core flies attract).
func switchRig(t *testing.T, enabled bool) (*rig, string) {
	dir := t.TempDir()
	oui := filepath.Join(t.TempDir(), "original-ui")
	os.MkdirAll(filepath.Join(oui, "bin"), 0o755)
	os.WriteFile(filepath.Join(oui, "bin", "eniactk"), []byte("x"), 0o755)
	wish := filepath.Join(t.TempDir(), "wish")
	os.WriteFile(wish, []byte("x"), 0o755)
	sw := uiswitch.New(uiswitch.Options{Dir: dir, OriginalUI: oui, Wish: wish, Enabled: enabled,
		TourIdleS: 300, InteractiveIdleS: 900, WarnS: 30, TTLS: 10, MinGapS: 10,
		Log: slog.New(slog.NewTextHandler(io.Discard, nil))})
	r := newRig(t, func(o *Options) {
		attractOptions(t, o, 300*time.Millisecond)
		o.Switch = sw
	})
	return r, dir
}

func readFile(t *testing.T, p string) string {
	b, err := os.ReadFile(p)
	if err != nil {
		t.Fatal(err)
	}
	return string(b)
}

// The visitor's tile during attract: the loop stops, the request is
// written (door visitor, the tour's idle limit), the reply is switching
// with the request id, and original_ui_enter is recorded once even if the
// page asks again.
func TestOriginalUITourDuringAttract(t *testing.T) {
	r, dir := switchRig(t, true)
	cl := r.connect()
	h := cl.wait(3*time.Second, "hello", is("hello"))
	ou := h["config"].(map[string]any)["originalUi"].(map[string]any)
	if ou["available"] != true || ou["tourIdleS"] != 300.0 || ou["interactiveIdleS"] != 900.0 {
		t.Fatalf("hello.config.originalUi %v", ou)
	}
	cl.send(`{"t":"attract_start"}`)
	cl.wait(10*time.Second, "flying", phase("flying"))
	id := cl.send(`{"t":"original_ui","mode":"tour"}`)
	rep := cl.wait(5*time.Second, "switching", is("original_ui", "phase", "switching"))
	if rep["re"] != float64(id) || rep["mode"] != "tour" || len(rep["id"].(string)) != 8 {
		t.Fatalf("reply %v", rep)
	}
	cl.seen(3*time.Second, "attract off", phase("off"))
	r.waitProcs(t, 0, 3*time.Second)
	mode := readFile(t, filepath.Join(dir, "mode"))
	if !strings.HasPrefix(mode, "mode=tour id="+rep["id"].(string)+" at=") || !strings.HasSuffix(mode, " idleS=300 warnS=30 ttlS=10 door=visitor\n") {
		t.Fatalf("mode file %q", mode)
	}
	id2 := cl.send(`{"t":"original_ui","mode":"tour"}`)
	rep2 := cl.wait(3*time.Second, "switching again", is("original_ui", "phase", "switching"))
	if rep2["re"] != float64(id2) || rep2["id"] != rep["id"] {
		t.Fatalf("repeat %v", rep2)
	}
	if n := strings.Count(r.metrics(), "original_ui_enter"); n != 1 {
		t.Fatalf("original_ui_enter recorded %d times: %s", n, r.metrics())
	}
}

// During a visit, the visit ends (reason original_ui) before the switch.
func TestOriginalUIEndsAVisit(t *testing.T) {
	r, dir := switchRig(t, true)
	cl := r.connect()
	cl.wait(3*time.Second, "state", is("state"))
	cl.send(`{"t":"start_mission","mission":"trajectory","mode":"visitor"}`)
	cl.wait(10*time.Second, "setup", is("session", "state", "setup"))
	cl.send(`{"t":"original_ui","mode":"tour"}`)
	cl.wait(5*time.Second, "switching", is("original_ui", "phase", "switching"))
	cl.seen(3*time.Second, "session none", is("session", "state", "none"))
	if _, err := os.Stat(filepath.Join(dir, "mode")); err != nil {
		t.Fatal("no request written")
	}
	if m := r.metrics(); !strings.Contains(m, "session_end") || !strings.Contains(m, "original_ui_enter") {
		t.Fatalf("metrics %s", m)
	}
}

// Unavailable (switch off, or no switcher at all): NOT_ALLOWED, nothing
// written, attract keeps flying.
func TestOriginalUIUnavailable(t *testing.T) {
	r, dir := switchRig(t, false)
	cl := r.connect()
	h := cl.wait(3*time.Second, "hello", is("hello"))
	if ou := h["config"].(map[string]any)["originalUi"].(map[string]any); ou["available"] != false || ou["reason"] != "disabled" {
		t.Fatalf("hello %v", ou)
	}
	cl.send(`{"t":"attract_start"}`)
	cl.wait(10*time.Second, "flying", phase("flying"))
	id := cl.send(`{"t":"original_ui","mode":"tour"}`)
	e := cl.wait(3*time.Second, "error", is("error"))
	if e["re"] != float64(id) || e["code"] != "NOT_ALLOWED" || !strings.Contains(e["message"].(string), "disabled") {
		t.Fatalf("%v", e)
	}
	if _, err := os.Stat(filepath.Join(dir, "mode")); err == nil {
		t.Fatal("a request was written")
	}
	if strings.Contains(r.metrics(), "original_ui_enter") {
		t.Fatal("enter recorded")
	}
	if st := r.mgr.attractStatus(nil); st.Phase == "off" {
		t.Fatal("attract stopped")
	}
	// No switcher at all (dev, test profiles).
	r2 := attractRig(t)
	cl2 := r2.connect()
	cl2.wait(3*time.Second, "state", is("state"))
	cl2.send(`{"t":"original_ui","mode":"tour"}`)
	if e := cl2.wait(3*time.Second, "error", is("error")); e["code"] != "NOT_ALLOWED" {
		t.Fatalf("%v", e)
	}
	if hz := r2.mgr.Healthz(); hz.OriginalUI.Available || hz.OriginalUI.Reason != "disabled" || hz.OriginalUI.Active != nil {
		t.Fatalf("healthz %+v", hz.OriginalUI)
	}
	var un *uiswitch.ErrUnavailable
	if _, err := r2.mgr.AdminOriginalUI(); !errors.As(err, &un) || un.Reason != "disabled" {
		t.Fatalf("unavailable: %v", err)
	}
}

// The kiosk session's `last` file is recorded exactly once, on the next
// hello, and /healthz shows what is on screen.
func TestOriginalUIExitRecordedOnHello(t *testing.T) {
	r, dir := switchRig(t, true)
	os.WriteFile(filepath.Join(dir, "active"), []byte("mode=tour id=3f9a1c2e since=1759851235\n"), 0o640)
	hz := r.mgr.Healthz()
	if hz.OriginalUI.Available || hz.OriginalUI.Reason != "running" || hz.OriginalUI.Active == nil || hz.OriginalUI.Active.ID != "3f9a1c2e" {
		t.Fatalf("healthz while running %+v", hz.OriginalUI)
	}
	os.Remove(filepath.Join(dir, "active"))
	os.WriteFile(filepath.Join(dir, "last"), []byte("mode=tour door=visitor id=3f9a1c2e cause=idle durS=301\n"), 0o640)
	cl := r.connect()
	cl.wait(3*time.Second, "hello", is("hello"))
	cl2 := r.connect()
	cl2.wait(3*time.Second, "hello", is("hello"))
	if n := strings.Count(r.metrics(), "original_ui_exit"); n != 1 {
		t.Fatalf("original_ui_exit recorded %d times: %s", n, r.metrics())
	}
	if _, err := os.Stat(filepath.Join(dir, "last")); err == nil {
		t.Fatal("last not deleted")
	}
	if hz := r.mgr.Healthz(); !hz.OriginalUI.Available || hz.OriginalUI.Active != nil {
		t.Fatalf("healthz after %+v", hz.OriginalUI)
	}
}

// The admin hooks: Original UI (interactive, door staff; a second request
// is busy) and Restart simulator (ends the visit, resets recovery).
func TestAdminHooks(t *testing.T) {
	r, dir := switchRig(t, true)
	cl := r.connect()
	cl.wait(3*time.Second, "state", is("state"))
	cl.send(`{"t":"attract_start"}`)
	cl.wait(10*time.Second, "flying", phase("flying"))
	r.mgr.AdminRestartCore()
	cl.seen(3*time.Second, "attract off", phase("off"))
	r.waitProcs(t, 0, 3*time.Second)
	req, err := r.mgr.AdminOriginalUI()
	if err != nil || req.Mode != "interactive" {
		t.Fatal(req, err)
	}
	if m := readFile(t, filepath.Join(dir, "mode")); !strings.Contains(m, "mode=interactive") || !strings.HasSuffix(m, "idleS=900 warnS=30 ttlS=10 door=staff\n") {
		t.Fatalf("mode %q", m)
	}
	if _, err := r.mgr.AdminOriginalUI(); !errors.Is(err, admin.ErrBusy) {
		t.Fatalf("second request: %v", err)
	}
}
