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
	if c.Idle != (Idle{90, 180, 15}) || c.Metrics.RetentionDays != 400 {
		t.Fatalf("idle/metrics: %+v %+v", c.Idle, c.Metrics)
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
