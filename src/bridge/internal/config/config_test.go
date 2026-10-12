package config

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestDefaultsMatchArchitecture(t *testing.T) {
	c := Default()
	if c.Listen != "127.0.0.1:8740" || c.Core.GOMAXPROCS != 2 || c.Core.Nice != 5 {
		t.Fatalf("unexpected defaults: %+v", c)
	}
	if c.Core.AckTimeout.D() != 1500*time.Millisecond || c.Core.ReadyTimeout.D() != 5*time.Second {
		t.Fatalf("timeouts: %+v", c.Core)
	}
	if c.Recovery.Budget != 3 || len(c.Recovery.Backoff) != 3 || c.Recovery.SlowRetry.D() != 10*time.Minute {
		t.Fatalf("recovery: %+v", c.Recovery)
	}
	if c.Idle != (Idle{90, 180, 15, 120}) || c.Metrics.RetentionDays != 400 {
		t.Fatalf("idle/metrics: %+v %+v", c.Idle, c.Metrics)
	}
	if c.Attract.Mission != "trajectory" || c.Attract.Hold.D() != 8*time.Second || c.Attract.ReadTimeout.D() != 15*time.Second {
		t.Fatalf("attract: %+v", c.Attract)
	}
}

// A config that sets only some idle values keeps the others' defaults
// (exploreS is new in 0.4 and absent from older files).
func TestIdlePartialKeepsDefaults(t *testing.T) {
	c := Default()
	if err := Parse([]byte("idle: { setupS: 20, runS: 90, countdownS: 5 }\n"), &c); err != nil {
		t.Fatal(err)
	}
	if c.Idle != (Idle{20, 90, 5, 120}) {
		t.Fatalf("%+v", c.Idle)
	}
}

func TestLoadDevConfig(t *testing.T) {
	c, err := Load("../../../../deploy/config/config.dev.yaml")
	if err != nil {
		t.Fatal(err)
	}
	if c.Profile != ProfileDev || c.Health.Listen != "127.0.0.1:8741" || c.Admin.AllowUpdates {
		t.Fatalf("dev config: %+v", c)
	}
	if !filepath.IsAbs(c.Paths.Core) || !strings.HasSuffix(c.Paths.Core, "build/darwin-arm64/eniac-core") {
		t.Fatalf("core path not resolved: %q", c.Paths.Core)
	}
	if !strings.HasSuffix(c.Paths.Missions, "/missions") {
		t.Fatalf("missions path: %q", c.Paths.Missions)
	}
}

func TestEmptyFileIsDefaults(t *testing.T) {
	p := filepath.Join(t.TempDir(), "c.yaml")
	os.WriteFile(p, nil, 0o644)
	c, err := Load(p)
	if err != nil {
		t.Fatal(err)
	}
	if c.Paths.Core != "/opt/eniac-kiosk/current/bin/eniac-core" || c.Paths.Upstream != "/opt/eniac-kiosk/current/upstream" {
		t.Fatalf("derived paths: %+v", c.Paths)
	}
}

func TestRejects(t *testing.T) {
	for name, y := range map[string]string{
		"unknown key":    "profil: dev\n",
		"bad profile":    "profile: staging\n",
		"bad duration":   "core: { ackTimeout: soon }\n",
		"space in path":  "paths: { run: \"/tmp/a b\" }\n",
		"zero gomaxproc": "core: { gomaxprocs: 0 }\n",
	} {
		p := filepath.Join(t.TempDir(), "c.yaml")
		os.WriteFile(p, []byte(y), 0o644)
		if _, err := Load(p); err == nil {
			t.Errorf("%s: expected an error", name)
		}
	}
}

// The Original UI switch is off by default (dev, test and Model 4 profiles
// don't ship it); its paths and the PIN file are derived when unset.
func TestOriginalUIDefaults(t *testing.T) {
	c := Default()
	o := c.OriginalUI
	if o.Enabled || o.TourIdleS != 300 || o.InteractiveIdleS != 900 || o.WarnS != 30 || o.RequestTTLS != 10 || o.MinGapS != 10 || o.Wish != "/usr/bin/wish" {
		t.Fatalf("originalUi defaults: %+v", o)
	}
	if c.Admin.TokenTTLS != 600 {
		t.Fatalf("admin.tokenTtlS default %d", c.Admin.TokenTTLS)
	}
	dir := t.TempDir()
	p := filepath.Join(dir, "c.yaml")
	os.WriteFile(p, nil, 0o644)
	c, err := Load(p)
	if err != nil {
		t.Fatal(err)
	}
	if c.Paths.UISwitch != "/run/eniac-kiosk-ui" || c.Paths.OriginalUI != "/opt/eniac-kiosk/current/original-ui" {
		t.Fatalf("derived paths: %+v", c.Paths)
	}
	if c.Admin.PinFile != filepath.Join(dir, "admin-pin") {
		t.Fatalf("derived pin file %q", c.Admin.PinFile)
	}
}

// The floor kiosk's config turns the switch on with explicit paths.
func TestDeployKioskConfig(t *testing.T) {
	c, err := Load("../../../../deploy/kiosk/config.yaml")
	if err != nil {
		t.Fatal(err)
	}
	if !c.OriginalUI.Enabled || c.OriginalUI.TourIdleS != 300 || c.OriginalUI.InteractiveIdleS != 900 {
		t.Fatalf("originalUi: %+v", c.OriginalUI)
	}
	if c.Paths.UISwitch != "/run/eniac-touch-kiosk-ui" || c.Paths.OriginalUI != "/opt/eniac-touch-kiosk/current/original-ui" ||
		c.Admin.PinFile != "/etc/eniac-touch-kiosk/admin-pin" || c.Admin.TokenTTLS != 600 {
		t.Fatalf("paths/admin: %+v %+v", c.Paths, c.Admin)
	}
}

// The box's config.yaml from the first release has no originalUi, pinFile
// or uiSwitch keys and is never overwritten. The installer appends
// deploy/kiosk/config-original-ui.yaml once; the result must load, turn the
// switch on and derive the same paths as the new config.
func TestOldBoxConfigPlusAppendedBlock(t *testing.T) {
	old := `profile: prod
listen: 127.0.0.1:8740
health: { listen: "127.0.0.1:8741" }
core: { gomaxprocs: 2, nice: 5, readyTimeout: 5s, ackTimeout: 1.5s, silenceTimeout: 2s, probeEvery: 5s }
recovery: { budget: 3, window: 5m, backoff: [2s, 5s, 10s], slowRetry: 10m }
idle: { setupS: 90, runS: 180, countdownS: 15 }
admin: { sessionTimeoutS: 120, allowPowerActions: false, allowUpdates: false }
metrics: { retentionDays: 400 }
assets: { upstreamPhotos: false }
paths:
  release: /opt/eniac-touch-kiosk/current
  run: /run/eniac-touch-kiosk
  state: /var/lib/eniac-touch-kiosk
`
	block, err := os.ReadFile("../../../../deploy/kiosk/config-original-ui.yaml")
	if err != nil {
		t.Fatal(err)
	}
	dir := t.TempDir()
	p := filepath.Join(dir, "config.yaml")
	os.WriteFile(p, []byte(old), 0o644)
	c, err := Load(p)
	if err != nil {
		t.Fatal(err)
	}
	if c.OriginalUI.Enabled {
		t.Fatal("an old config without the block must leave the switch off")
	}
	os.WriteFile(p, append([]byte(old), block...), 0o644)
	c, err = Load(p)
	if err != nil {
		t.Fatal(err)
	}
	if !c.OriginalUI.Enabled || c.Paths.UISwitch != "/run/eniac-touch-kiosk-ui" ||
		c.Paths.OriginalUI != "/opt/eniac-touch-kiosk/current/original-ui" || c.Admin.PinFile != filepath.Join(dir, "admin-pin") {
		t.Fatalf("appended: %+v %+v %+v", c.OriginalUI, c.Paths, c.Admin)
	}
}

func TestOriginalUIValidation(t *testing.T) {
	for name, y := range map[string]string{
		"tour idle too short":    "originalUi: { tourIdleS: 59 }\n",
		"tour idle too long":     "originalUi: { tourIdleS: 7201 }\n",
		"interactive too short":  "originalUi: { interactiveIdleS: 30 }\n",
		"warn not below idle":    "originalUi: { tourIdleS: 60, warnS: 60 }\n",
		"warn too long":          "originalUi: { warnS: 121 }\n",
		"warn negative":          "originalUi: { warnS: -1 }\n",
		"ttl zero":               "originalUi: { requestTtlS: 0 }\n",
		"ttl too long":           "originalUi: { requestTtlS: 61 }\n",
		"min gap negative":       "originalUi: { minGapS: -1 }\n",
		"no wish":                "originalUi: { wish: \"\" }\n",
		"token too short":        "admin: { tokenTtlS: 59 }\n",
		"token too long":         "admin: { tokenTtlS: 3601 }\n",
		"space in uiSwitch":      "paths: { uiSwitch: \"/run/a b\" }\n",
		"space in originalUi":    "paths: { originalUi: \"/opt/a b\" }\n",
		"unknown originalUi key": "originalUi: { idleS: 300 }\n",
	} {
		p := filepath.Join(t.TempDir(), "c.yaml")
		os.WriteFile(p, []byte(y), 0o644)
		if _, err := Load(p); err == nil {
			t.Errorf("%s: expected an error", name)
		}
	}
	for name, y := range map[string]string{
		"bounds low":  "originalUi: { tourIdleS: 60, interactiveIdleS: 60, warnS: 59, requestTtlS: 1, minGapS: 0 }\nadmin: { tokenTtlS: 60 }\n",
		"bounds high": "originalUi: { tourIdleS: 7200, interactiveIdleS: 7200, warnS: 120, requestTtlS: 60 }\nadmin: { tokenTtlS: 3600 }\n",
		"no warning":  "originalUi: { warnS: 0 }\n",
	} {
		p := filepath.Join(t.TempDir(), "c.yaml")
		os.WriteFile(p, []byte(y), 0o644)
		if _, err := Load(p); err != nil {
			t.Errorf("%s: %v", name, err)
		}
	}
}
