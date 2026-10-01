package testenv

import (
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"testing"
)

var (
	fakeOnce sync.Once
	fakePath string
	fakeErr  error
)

// Fakecore builds tests/fakecore once per test binary and returns its path.
func Fakecore(t testing.TB) string {
	t.Helper()
	fakeOnce.Do(func() {
		root, ok := RepoRoot()
		if !ok {
			fakeErr = os.ErrNotExist
			return
		}
		dir, err := os.MkdirTemp("", "fakecore")
		if err != nil {
			fakeErr = err
			return
		}
		fakePath = filepath.Join(dir, "fakecore")
		cmd := exec.Command("go", "build", "-o", fakePath, ".")
		cmd.Dir = filepath.Join(root, "tests", "fakecore")
		if out, err := cmd.CombinedOutput(); err != nil {
			fakeErr = &buildErr{string(out)}
		}
	})
	if fakeErr != nil {
		t.Fatalf("building fakecore: %v", fakeErr)
	}
	return fakePath
}

type buildErr struct{ out string }

func (e *buildErr) Error() string { return e.out }
