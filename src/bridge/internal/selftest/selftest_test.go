package selftest

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"eniac-kiosk/bridge/internal/core"
	"eniac-kiosk/bridge/internal/mission"
	"eniac-kiosk/bridge/internal/testenv"
)

func TestMain(m *testing.M) {
	if len(os.Args) > 1 && os.Args[1] == "vlink" {
		os.Exit(core.RunVlink(os.Args[2:], os.Stdin, os.Stdout))
	}
	os.Exit(m.Run())
}

func TestSquaresSelftest(t *testing.T) {
	corePath, rt := testenv.Core(t)
	root, _ := testenv.RepoRoot()
	m := mission.Load(filepath.Join(root, "missions", "squares.yaml"), rt)
	if !m.Available {
		t.Fatal(m.Errors)
	}
	self, _ := os.Executable()
	for _, speed := range []string{"full", "slow"} {
		res, err := Run(context.Background(), Options{Mission: m, CorePath: corePath, VlinkExe: self, Runtime: rt,
			RunDir: testenv.ShortTempDir(t), Speed: speed})
		if err != nil {
			t.Fatalf("%s: %v", speed, err)
		}
		t.Logf("%s: ready in %s, settled %v", speed, res.ReadyIn.Round(1e6), res.Settled)
	}
}

func loadMission(t *testing.T, id string) (*mission.Mission, string, string) {
	t.Helper()
	corePath, rt := testenv.Core(t)
	root, _ := testenv.RepoRoot()
	m := mission.Load(filepath.Join(root, "missions", id+".yaml"), rt)
	if !m.Available {
		t.Fatal(m.Errors)
	}
	return m, corePath, rt
}

// Primes (UX 8.2.6, rule 8): one INIT at Full, the first five primes.
func TestPrimesSelftest(t *testing.T) {
	m, corePath, rt := loadMission(t, "primes")
	self, _ := os.Executable()
	res, err := Run(context.Background(), Options{Mission: m, CorePath: corePath, VlinkExe: self, Runtime: rt,
		RunDir: testenv.ShortTempDir(t), Speed: "full"})
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("ready in %s, %d cards", res.ReadyIn.Round(1e6), len(res.Cards))
}

// Trajectory (UX 8.3.6 v0.4, rule 8): READ sends b c then b r, INIT, and the
// first card is hop 1 at 0014128681 / 0005693229 (spike S2, with patch 0003).
func TestTrajectorySelftest(t *testing.T) {
	m, corePath, rt := loadMission(t, "trajectory")
	self, _ := os.Executable()
	res, err := Run(context.Background(), Options{Mission: m, CorePath: corePath, VlinkExe: self, Runtime: rt,
		RunDir: testenv.ShortTempDir(t)})
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("ready in %s, first card %q", res.ReadyIn.Round(1e6), res.Cards[0].Text)
}
