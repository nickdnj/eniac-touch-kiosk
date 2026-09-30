package protocol

import (
	"bytes"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"eniac-kiosk/bridge/internal/machine"
)

// The committed .gen.ts files must equal a fresh tygo run (protocol drift
// fails CI, test plan 3.3).
func TestGeneratedTypeScriptIsFresh(t *testing.T) {
	if _, err := exec.LookPath("go"); err != nil {
		t.Skip("go not on PATH")
	}
	modRoot, _ := filepath.Abs("../..")
	cfg, err := os.ReadFile(filepath.Join(modRoot, "tygo.yaml"))
	if err != nil {
		t.Fatal(err)
	}
	tmp := t.TempDir()
	outs := map[string]string{}
	var lines []string
	for _, l := range strings.Split(string(cfg), "\n") {
		if i := strings.Index(l, "output_path: "); i >= 0 {
			committed := strings.Trim(strings.TrimSpace(l[i+len("output_path: "):]), `"`)
			fresh := filepath.Join(tmp, filepath.Base(committed))
			outs[committed] = fresh
			l = l[:i] + `output_path: "` + fresh + `"`
		}
		lines = append(lines, l)
	}
	tc := filepath.Join(tmp, "tygo.yaml")
	os.WriteFile(tc, []byte(strings.Join(lines, "\n")), 0o644)
	cmd := exec.Command("go", "tool", "tygo", "--config", tc, "generate")
	cmd.Dir = modRoot
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("tygo: %v\n%s", err, out)
	}
	for committed, fresh := range outs {
		a, err1 := os.ReadFile(filepath.Join(modRoot, committed))
		b, err2 := os.ReadFile(fresh)
		if err1 != nil || err2 != nil {
			t.Fatalf("%v %v", err1, err2)
		}
		if !bytes.Equal(a, b) {
			t.Errorf("%s is stale: run make protogen and commit it", committed)
		}
	}
}

// The mirror's JSON is exactly the documented MachineState: no unknown or
// missing fields.
func TestMachineStateConformance(t *testing.T) {
	st := machine.Initial()
	copy(st.Acc[1].Digits[:], "0000000009")
	b, _ := json.Marshal(st.Snapshot())
	var ms MachineState
	d := json.NewDecoder(bytes.NewReader(b))
	d.DisallowUnknownFields()
	if err := d.Decode(&ms); err != nil {
		t.Fatal(err)
	}
	b2, _ := json.Marshal(ms)
	var x, y any
	json.Unmarshal(b, &x)
	json.Unmarshal(b2, &y)
	if !reflect.DeepEqual(x, y) {
		t.Fatalf("round trip differs:\n%s\n%s", b, b2)
	}
	if ms.Acc["2"].Value != 9 || len(ms.Acc) != 20 || len(ms.FT) != 3 {
		t.Fatalf("%+v", ms.Acc["2"])
	}
}
