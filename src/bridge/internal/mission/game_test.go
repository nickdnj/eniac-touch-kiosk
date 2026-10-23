package mission

import (
	"path/filepath"
	"strings"
	"testing"
)

// Gunnery loads, and a shot becomes the right dial settings.
func TestGunneryValid(t *testing.T) {
	dir, up := paths(t)
	m := Load(filepath.Join(dir, "gunnery.yaml"), up)
	if !m.Available {
		t.Fatalf("gunnery unavailable: %v", m.Errors)
	}
	lines, err := m.AimLines("c3", "e20")
	if err != nil {
		t.Fatal(err)
	}
	// 1200 ft/s at 20 degrees: across 1127.6 ft/s, up 410.4 ft/s (four decimals, ten digits).
	got := map[string]bool{}
	for _, l := range lines {
		got[l] = true
	}
	for _, w := range []string{"s c.j8 1", "s c.j7 1", "s c.j6 2", "s c.k8 0", "s c.k7 4", "s c.k6 1", "s c.kl P"} {
		if !got[w] {
			t.Errorf("missing dial line %q in %v", w, strings.Join(lines, "; "))
		}
	}
	if _, err := m.AimLines("c9", "e20"); err == nil {
		t.Error("unknown charge accepted")
	}
}
