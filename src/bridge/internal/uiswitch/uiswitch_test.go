package uiswitch

import (
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

type rig struct {
	dir   string
	now   time.Time
	ids   int
	stat  map[string]bool // paths that exist (besides the real dir)
	wrErr error
	sw    *Switcher
}

func newRig(t *testing.T, tweak func(*rig, *Options)) *rig {
	r := &rig{dir: t.TempDir(), now: time.Unix(1759851234, 0), stat: map[string]bool{"/rel/original-ui/bin/eniactk": true, "/usr/bin/wish": true}}
	o := Options{Dir: r.dir, OriginalUI: "/rel/original-ui", Wish: "/usr/bin/wish", Enabled: true,
		TourIdleS: 300, InteractiveIdleS: 900, WarnS: 30, TTLS: 10, MinGapS: 10,
		Now:      func() time.Time { return r.now },
		Writable: func(string) error { return r.wrErr },
		NewID: func() string {
			r.ids++
			return []string{"3f9a1c2e", "0badc0de", "12345678", "abcdef01"}[r.ids-1]
		},
	}
	// eniactk and wish must be files, not directories.
	o.Stat = func(p string) (fs.FileInfo, error) {
		if p == r.dir {
			return os.Stat(p)
		}
		if r.stat[p] {
			return fileInfo{}, nil
		}
		return nil, fs.ErrNotExist
	}
	if tweak != nil {
		tweak(r, &o)
	}
	r.sw = New(o)
	return r
}

type fileInfo struct{ fs.FileInfo }

func (fileInfo) IsDir() bool { return false }

func (r *rig) read(t *testing.T, name string) string {
	b, err := os.ReadFile(filepath.Join(r.dir, name))
	if err != nil {
		t.Fatal(err)
	}
	return string(b)
}

func (r *rig) exists(name string) bool {
	_, err := os.Stat(filepath.Join(r.dir, name))
	return err == nil
}

func TestRequestWritesModeAtomically(t *testing.T) {
	r := newRig(t, nil)
	req, repeat, err := r.sw.Request(ModeTour, DoorVisitor)
	if err != nil || repeat {
		t.Fatal(err, repeat)
	}
	if got, want := r.read(t, FileMode), "mode=tour id=3f9a1c2e at=1759851234 idleS=300 warnS=30 ttlS=10 door=visitor\n"; got != want {
		t.Fatalf("mode file\n got %q\nwant %q", got, want)
	}
	if req.ID != "3f9a1c2e" || req.IdleS != 300 {
		t.Fatalf("%+v", req)
	}
	st, _ := os.Stat(filepath.Join(r.dir, FileMode))
	if st.Mode().Perm() != 0o640 {
		t.Fatalf("mode %v, want 0640", st.Mode().Perm())
	}
	ents, _ := os.ReadDir(r.dir)
	for _, e := range ents {
		if strings.HasSuffix(e.Name(), ".tmp") {
			t.Fatalf("left behind %s", e.Name())
		}
	}
}

func TestInteractiveUsesItsIdleLimit(t *testing.T) {
	r := newRig(t, nil)
	if _, _, err := r.sw.Request(ModeInteractive, DoorStaff); err != nil {
		t.Fatal(err)
	}
	if got := r.read(t, FileMode); got != "mode=interactive id=3f9a1c2e at=1759851234 idleS=900 warnS=30 ttlS=10 door=staff\n" {
		t.Fatal(got)
	}
}

func TestRequestRejectsUnknownModeOrDoor(t *testing.T) {
	r := newRig(t, nil)
	for _, c := range [][2]string{{"demo", DoorVisitor}, {"", DoorStaff}, {ModeTour, "anyone"}, {"tour -c", DoorVisitor}} {
		if _, _, err := r.sw.Request(c[0], c[1]); !errors.Is(err, ErrBadRequest) {
			t.Errorf("%v: %v", c, err)
		}
	}
	if r.exists(FileMode) {
		t.Fatal("wrote a request")
	}
}

func TestRepeatsReturnTheSameID(t *testing.T) {
	r := newRig(t, nil)
	first, _, _ := r.sw.Request(ModeTour, DoorVisitor)
	// Pending (fresh): same id, nothing written.
	r.now = r.now.Add(3 * time.Second)
	again, repeat, err := r.sw.Request(ModeTour, DoorVisitor)
	if err != nil || !repeat || again.ID != first.ID {
		t.Fatalf("pending: %+v %v %v", again, repeat, err)
	}
	// Running (active exists): the active id.
	os.WriteFile(filepath.Join(r.dir, FileActive), []byte("mode=tour id=3f9a1c2e since=1759851235\n"), 0o640)
	r.now = r.now.Add(60 * time.Second)
	again, repeat, _ = r.sw.Request(ModeInteractive, DoorStaff)
	if !repeat || again.ID != first.ID {
		t.Fatalf("running: %+v %v", again, repeat)
	}
	// Ended, files gone, but within minGapS of the last request: still a repeat.
	os.Remove(filepath.Join(r.dir, FileActive))
	os.Remove(filepath.Join(r.dir, FileMode))
	r2 := newRig(t, nil)
	r2.sw.Request(ModeTour, DoorVisitor)
	os.Remove(filepath.Join(r2.dir, FileMode))
	r2.now = r2.now.Add(9 * time.Second)
	if again, repeat, _ := r2.sw.Request(ModeTour, DoorVisitor); !repeat || again.ID != "3f9a1c2e" || r2.exists(FileMode) {
		t.Fatalf("min gap: %+v %v", again, repeat)
	}
	r2.now = r2.now.Add(2 * time.Second)
	if again, repeat, _ := r2.sw.Request(ModeTour, DoorVisitor); repeat || again.ID != "0badc0de" || !r2.exists(FileMode) {
		t.Fatalf("after min gap: %+v %v", again, repeat)
	}
}

func TestStaleRequestIsReplaced(t *testing.T) {
	r := newRig(t, func(_ *rig, o *Options) { o.MinGapS = 0 })
	r.sw.Request(ModeTour, DoorVisitor)
	r.now = r.now.Add(11 * time.Second) // ttlS 10: stale
	req, repeat, err := r.sw.Request(ModeTour, DoorVisitor)
	if err != nil || repeat || req.ID != "0badc0de" {
		t.Fatalf("%+v %v %v", req, repeat, err)
	}
	if !strings.Contains(r.read(t, FileMode), "id=0badc0de at=1759851245") {
		t.Fatal(r.read(t, FileMode))
	}
	// A malformed mode file is replaced too.
	os.WriteFile(filepath.Join(r.dir, FileMode), []byte("mode=tour; rm -rf /\n"), 0o640)
	if req, repeat, err := r.sw.Request(ModeTour, DoorVisitor); err != nil || repeat || req.ID != "12345678" {
		t.Fatalf("%+v %v %v", req, repeat, err)
	}
}

func TestFresh(t *testing.T) {
	q := Request{At: 100, TTLS: 10}
	for at, want := range map[int64]bool{99: false, 100: true, 110: true, 111: false} {
		if q.Fresh(time.Unix(at, 0)) != want {
			t.Errorf("now %d: want %v", at, want)
		}
	}
}

func TestAvailableReasons(t *testing.T) {
	cases := []struct {
		name   string
		tweak  func(*rig, *Options)
		reason string
	}{
		{"ok", nil, ""},
		{"disabled", func(_ *rig, o *Options) { o.Enabled = false }, ReasonDisabled},
		{"no dir", func(_ *rig, o *Options) { o.Dir = "/nonexistent/ui" }, ReasonNoSwitchDir},
		{"read-only dir", func(r *rig, _ *Options) { r.wrErr = fs.ErrPermission }, ReasonNoSwitchDir},
		{"not built", func(r *rig, _ *Options) { delete(r.stat, "/rel/original-ui/bin/eniactk") }, ReasonNotBuilt},
		{"no tk", func(r *rig, _ *Options) { delete(r.stat, "/usr/bin/wish") }, ReasonNoTk},
	}
	for _, c := range cases {
		rr := newRig(t, c.tweak)
		ok, reason := rr.sw.Available()
		if reason != c.reason || ok != (c.reason == "") {
			t.Errorf("%s: %v %q", c.name, ok, reason)
		}
		if c.reason != "" {
			_, _, err := rr.sw.Request(ModeTour, DoorVisitor)
			var u *ErrUnavailable
			if !errors.As(err, &u) || u.Reason != c.reason {
				t.Errorf("%s: request: %v", c.name, err)
			}
		}
	}
	r := newRig(t, nil)
	os.WriteFile(filepath.Join(r.dir, FileActive), []byte("mode=interactive id=3f9a1c2e since=1759851235\n"), 0o640)
	if ok, reason := r.sw.Available(); ok || reason != ReasonRunning {
		t.Fatalf("running: %v %q", ok, reason)
	}
	if a, ok := r.sw.ReadActive(); !ok || a.Mode != ModeInteractive || a.Since != 1759851235 {
		t.Fatalf("%+v", a)
	}
}

func TestConsumeLast(t *testing.T) {
	r := newRig(t, nil)
	if e, err := r.sw.ConsumeLast(); e != nil || err != nil {
		t.Fatal("no file: nothing")
	}
	os.WriteFile(filepath.Join(r.dir, FileLast), []byte("mode=tour door=visitor id=3f9a1c2e cause=idle durS=301\n"), 0o640)
	e, err := r.sw.ConsumeLast()
	if err != nil || *e != (Exit{Mode: "tour", Door: "visitor", ID: "3f9a1c2e", Cause: "idle", DurS: 301}) {
		t.Fatalf("%+v %v", e, err)
	}
	if r.exists(FileLast) {
		t.Fatal("last not deleted")
	}
	if e, _ := r.sw.ConsumeLast(); e != nil {
		t.Fatal("recorded twice")
	}
	for _, bad := range []string{"mode=tour door=visitor id=3f9a1c2e cause=bored durS=1\n", "mode=tour door=visitor id=3f9a1c2e cause=tap\n", "garbage", "mode=tour door=visitor id=3f9a1c2e cause=tap durS=1 x=y\n"} {
		os.WriteFile(filepath.Join(r.dir, FileLast), []byte(bad), 0o640)
		if e, err := r.sw.ConsumeLast(); e != nil || err == nil {
			t.Errorf("%q accepted", bad)
		}
		if r.exists(FileLast) {
			t.Errorf("%q not deleted", bad)
		}
	}
}

func TestWithdraw(t *testing.T) {
	r := newRig(t, nil)
	if had, err := r.sw.Withdraw(); had || err != nil {
		t.Fatal(had, err)
	}
	r.sw.Request(ModeInteractive, DoorRemote)
	if had, err := r.sw.Withdraw(); !had || err != nil || r.exists(FileMode) {
		t.Fatal(had, err)
	}
}

func TestParsers(t *testing.T) {
	good := "mode=tour id=3f9a1c2e at=1759851234 idleS=300 warnS=30 ttlS=10 door=visitor"
	if _, err := ParseRequest(good + "\n"); err != nil {
		t.Fatal(err)
	}
	// Key order does not matter.
	if _, err := ParseRequest("door=staff ttlS=10 warnS=0 idleS=900 at=1 id=00000000 mode=interactive"); err != nil {
		t.Fatal(err)
	}
	for _, bad := range []string{
		"", "\n", good + " extra=1", strings.Replace(good, "mode=tour", "mode=xterm", 1),
		strings.Replace(good, "id=3f9a1c2e", "id=3F9A1C2E", 1), strings.Replace(good, "idleS=300", "idleS=59", 1),
		strings.Replace(good, "warnS=30", "warnS=300", 1), strings.Replace(good, "ttlS=10", "ttlS=0", 1),
		strings.Replace(good, "door=visitor", "door=", 1), strings.Replace(good, "at=1759851234", "at=-1", 1),
		good + "\nmode=tour", "mode=tour mode=tour id=3f9a1c2e at=1 idleS=300 warnS=30 ttlS=10",
		strings.Replace(good, " ", "  ", 1), strings.Replace(good, " ", "\t", 1),
	} {
		if _, err := ParseRequest(bad); err == nil {
			t.Errorf("%q accepted", bad)
		}
	}
	if _, err := ParseActive("mode=tour id=3f9a1c2e since=1759851235"); err != nil {
		t.Fatal(err)
	}
	if _, err := ParseActive("mode=tour id=3f9a1c2e"); err == nil {
		t.Fatal("short active accepted")
	}
}

func TestFiles(t *testing.T) {
	r := newRig(t, nil)
	r.sw.Request(ModeTour, DoorVisitor)
	f := r.sw.Files()
	if !strings.HasPrefix(f[FileMode], "mode=tour") || f[FileActive] != "" || f[FileLast] != "" {
		t.Fatalf("%v", f)
	}
}

func FuzzParse(f *testing.F) {
	for _, s := range []string{"mode=tour id=3f9a1c2e at=1759851234 idleS=300 warnS=30 ttlS=10 door=visitor", "a=b", "", "=", "mode=tour door=visitor id=3f9a1c2e cause=idle durS=301"} {
		f.Add(s)
	}
	f.Fuzz(func(t *testing.T, s string) {
		if r, err := ParseRequest(s); err == nil {
			if again, err := ParseRequest(r.Line()); err != nil || again != r {
				t.Fatalf("round trip %q: %v", s, err)
			}
		}
		ParseActive(s)
		ParseExit(s)
	})
}
