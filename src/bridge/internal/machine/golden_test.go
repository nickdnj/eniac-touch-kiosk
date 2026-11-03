package machine_test

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"

	"eniac-kiosk/bridge/internal/golden"
	"eniac-kiosk/bridge/internal/machine"
	"eniac-kiosk/bridge/internal/status"
	"eniac-kiosk/bridge/internal/testenv"
)

func goldenDir(t *testing.T) string {
	root, ok := testenv.RepoRoot()
	if !ok {
		t.Fatal("repo root not found")
	}
	return filepath.Join(root, "tests", "golden")
}

type replay struct {
	m     *machine.Mirror
	drops map[string]int
	cards []machine.Punch
}

func replayGolden(t *testing.T, g *golden.Golden) replay {
	r := replay{m: machine.NewMirror(nil), drops: map[string]int{}}
	r.m.OnPunch = func(p machine.Punch) { r.cards = append(r.cards, p) }
	for _, l := range g.Status {
		ev, d := status.Parse(l)
		if d != nil {
			r.drops[d.Reason]++
			continue
		}
		r.m.Apply(ev)
	}
	return r
}

// Replay every golden: final MachineState equals the core's own `D` dump,
// with no dropped lines, and punch payloads equal the punch file byte for
// byte (test plan 3.2).
func TestGoldensReplay(t *testing.T) {
	dir := goldenDir(t)
	metas, _ := filepath.Glob(filepath.Join(dir, "*.meta.json"))
	if len(metas) < 5 {
		t.Fatalf("expected the committed goldens, found %d", len(metas))
	}
	for _, mp := range metas {
		name := strings.TrimSuffix(filepath.Base(mp), ".meta.json")
		t.Run(name, func(t *testing.T) {
			g, err := golden.Load(dir, name)
			if err != nil {
				t.Fatal(err)
			}
			r := replayGolden(t, g)
			if len(r.drops) != 0 {
				t.Errorf("dropped lines: %v", r.drops)
			}
			if !g.Meta.Settled {
				t.Fatalf("golden %s was not recorded settled; re-record it", name)
			}
			d, err := golden.ParseDump(g.Dump)
			if err != nil {
				t.Fatal(err)
			}
			if diffs := golden.Compare(r.m.State(), d); len(diffs) > 0 {
				t.Errorf("mirror != dump:\n%s", strings.Join(diffs, "\n"))
			}
			var sb strings.Builder
			for _, c := range r.cards {
				sb.WriteString(c.Text + "\n")
			}
			if sb.String() != g.Punch {
				t.Errorf("punch payloads (%d cards) differ from the punch file (%d bytes)", len(r.cards), len(g.Punch))
			}
			for i, c := range r.cards {
				if c.N != i+1 || len(c.Fields) != 16 {
					t.Errorf("card %d: n=%d fields=%d", i, c.N, len(c.Fields))
				}
			}
		})
	}
}

func accValue(m *machine.Mirror, n int) int64 {
	s := m.State()
	return s.Acc[n-1].Value()
}

func TestGoldenKnownAnswers(t *testing.T) {
	dir := goldenDir(t)
	for name, want := range map[string][2]int64{"sq-3inits": {3, 9}, "sq-12inits": {12, 144}, "neg-sign": {5, -5}} {
		g, err := golden.Load(dir, name)
		if err != nil {
			t.Fatal(err)
		}
		r := replayGolden(t, g)
		if a1, a2 := accValue(r.m, 1), accValue(r.m, 2); a1 != want[0] || a2 != want[1] {
			t.Errorf("%s: acc1=%d acc2=%d, want %v", name, a1, a2, want)
		}
	}
	g, _ := golden.Load(dir, "neg-sign")
	r := replayGolden(t, g)
	st := r.m.State()
	snap := st.Snapshot()
	a2 := snap["acc"].(map[string]any)["2"].(map[string]any)
	if a2["sign"] != "M" || a2["digits"] != "9999999995" || a2["value"] != int64(-5) {
		t.Errorf("neg-sign acc2: %v", a2)
	}
}

// The core prints "m  0 ..." (two spaces) for a mult stage under 10 (upstream mult.go; our patch 0001
// that made it "m 0 ..." was retired when Stuart moved eniactk to strings.Fields). The status parser
// must read both forms identically, and the recorded cores must show the quirk (test plan 3.2).
func TestMultFormatsGoldens(t *testing.T) {
	dir := goldenDir(t)
	double, single := 0, 0
	for _, name := range []string{"traj-unpatched-m", "traj-patched"} {
		g, err := golden.Load(dir, name)
		if err != nil {
			t.Fatal(err)
		}
		for _, l := range g.Status {
			switch {
			case strings.HasPrefix(l, "m  "):
				double++
				ev, d := status.Parse(l)
				ev2, d2 := status.Parse("m " + strings.TrimLeft(l[2:], " "))
				if d != nil || d2 != nil || ev != ev2 {
					t.Fatalf("%q parses differently from its single-space form", l)
				}
			case strings.HasPrefix(l, "m "):
				single++
			}
		}
	}
	if double == 0 || single == 0 {
		t.Fatalf("goldens lack m lines: double-space=%d single-space=%d", double, single)
	}
}

func coversKinds(lines []string, kinds ...string) bool {
	seen := map[string]bool{}
	for _, l := range lines {
		seen[strings.Fields(l)[0]] = true
	}
	for _, k := range kinds {
		if !seen[k] {
			return false
		}
	}
	return true
}

// The mirror's initial values are engine.go's initial "last sent" values
// at the pinned commit (architecture 5.1).
func TestInitialPinnedToUpstream(t *testing.T) {
	root, _ := testenv.RepoRoot()
	src, err := os.ReadFile(filepath.Join(root, "build", "upstream", "src", "engine.go"))
	if err != nil {
		t.Skip("build/upstream missing; run make upstream")
	}
	s := string(src)
	get := func(re string) string {
		m := regexp.MustCompile(re).FindStringSubmatch(s)
		if m == nil {
			t.Fatalf("pattern %q not found in engine.go: upstream changed, review the mirror defaults", re)
		}
		return m[1]
	}
	st := machine.Initial()
	a := st.Acc[0]
	accInit := string(a.Sign) + " " + string(a.Digits[:]) + " " + string(a.Carry[:]) + " 0 " + string(a.Prog[:])
	if got := get(`astat\[i\] = "(P [01 ]+)"\n`); got != accInit {
		t.Errorf("astat: upstream %q mirror %q", got, accInit)
	}
	if got := get(`initlast := "([01]+)"`); got != st.Init {
		t.Errorf("initlast: upstream %q mirror %q", got, st.Init)
	}
	if got := get(`cyclast := (\d+)`); got != "0" || st.CyclePos != 0 {
		t.Errorf("cyclast %s", got)
	}
	if got := get(`conslast = "([01]+)"`); got != string(st.CT[:]) {
		t.Errorf("conslast: upstream %q mirror %q", got, st.CT[:])
	}
	mult := "0 " + st.Mult.FF + " 0 0"
	if got := get(`mullast = "([0-9 ]+)"`); got != mult {
		t.Errorf("mullast: upstream %q mirror %q", got, mult)
	}
	div := "0 0 " + st.Div.ProgFF + " " + st.Div.Flags
	if got := get(`dsqlast = "([0-9 ]+)"`); got != div {
		t.Errorf("dsqlast: upstream %q mirror %q", got, div)
	}
	if got := get(`ftarg\[i\] = "(\w+)"`); got != st.FT[0].Arg {
		t.Errorf("ftarg: upstream %q mirror %q", got, st.FT[0].Arg)
	}
	for _, v := range []string{`ftring\[i\] = "(\w+)"`, `ftadd\[i\] = "(\w+)"`, `ftsub\[i\] = "(\w+)"`, `ftsetup\[i\] = "(\w+)"`,
		`mpdstat\[i\] = (\d+)`, `mpsstat\[i\] = (\d+)`, `mpistat\[i\] = (\d+)`} {
		if got := get(v); got != "0" {
			t.Errorf("%s = %q, mirror assumes 0", v, got)
		}
	}
	if got := get(`cmlast := (-?\d+)`); got != "-1" || st.CycleMode != "" {
		t.Errorf("cmlast %s: mirror mode should start unset", got)
	}
}
