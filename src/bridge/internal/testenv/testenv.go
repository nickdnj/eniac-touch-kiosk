// Package testenv finds the real core and upstream runtime files for tests.
// Tests that need them skip when `make upstream` has not been run.
package testenv

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

// RepoRoot walks up from the working directory to the directory holding
// upstream.lock.
func RepoRoot() (string, bool) {
	d, err := os.Getwd()
	if err != nil {
		return "", false
	}
	for {
		if _, err := os.Stat(filepath.Join(d, "upstream.lock")); err == nil {
			return d, true
		}
		p := filepath.Dir(d)
		if p == d {
			return "", false
		}
		d = p
	}
}

// Core returns the host core binary and the runtime dir (build/upstream,
// which contains programs/), or skips the test.
func Core(t testing.TB) (corePath, runtimeDir string) {
	t.Helper()
	root, ok := RepoRoot()
	if !ok {
		t.Skip("repo root not found")
	}
	corePath = filepath.Join(root, "build", runtime.GOOS+"-"+runtime.GOARCH, "eniac-core")
	runtimeDir = filepath.Join(root, "build", "upstream")
	if _, err := os.Stat(corePath); err != nil {
		t.Skipf("real core not built (%s); run make upstream", corePath)
	}
	if _, err := os.Stat(filepath.Join(runtimeDir, "programs", "sq.e")); err != nil {
		t.Skip("build/upstream/programs missing; run make upstream")
	}
	return corePath, runtimeDir
}

// ShortTempDir returns a temp dir with a short path (Unix socket paths are
// limited to about 100 bytes on macOS) and removes it after the test.
func ShortTempDir(t testing.TB) string {
	t.Helper()
	d, err := os.MkdirTemp("", "ek")
	if err != nil {
		t.Fatal(err)
	}
	d, _ = filepath.EvalSymlinks(d)
	t.Cleanup(func() { os.RemoveAll(d) })
	return d
}
