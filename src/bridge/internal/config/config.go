// Package config loads /etc/eniac-kiosk/config.yaml (architecture 8.2).
//
// Every field has a default, so an empty file is a valid dev config. The
// `paths` block is an M1 addition to the 8.2 schema: on the Pi every path is
// derived from the release layout (8.1), but on the Mac the bridge runs out
// of the repo and needs to be told where the core, upstream runtime files,
// missions and web assets are.
package config

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

// Profile is prod, test or dev.
type Profile string

const (
	ProfileProd Profile = "prod"
	ProfileTest Profile = "test"
	ProfileDev  Profile = "dev"
)

type Config struct {
	Profile  Profile  `yaml:"profile"`
	Listen   string   `yaml:"listen"`
	Health   Health   `yaml:"health"`
	Core     Core     `yaml:"core"`
	Recovery Recovery `yaml:"recovery"`
	Idle     Idle     `yaml:"idle"`
	Admin    Admin    `yaml:"admin"`
	Metrics  Metrics  `yaml:"metrics"`
	Assets   Assets   `yaml:"assets"`
	Paths    Paths    `yaml:"paths"`
}

type Health struct {
	Listen string `yaml:"listen"`
}

type Core struct {
	GOMAXPROCS     int      `yaml:"gomaxprocs"`
	Nice           int      `yaml:"nice"`
	ReadyTimeout   Duration `yaml:"readyTimeout"`
	AckTimeout     Duration `yaml:"ackTimeout"`
	SilenceTimeout Duration `yaml:"silenceTimeout"`
	ProbeEvery     Duration `yaml:"probeEvery"`
}

type Recovery struct {
	Budget    int        `yaml:"budget"`
	Window    Duration   `yaml:"window"`
	Backoff   []Duration `yaml:"backoff"`
	SlowRetry Duration   `yaml:"slowRetry"`
}

type Idle struct {
	SetupS     int `yaml:"setupS"`
	RunS       int `yaml:"runS"`
	CountdownS int `yaml:"countdownS"`
}

type Admin struct {
	SessionTimeoutS   int     `yaml:"sessionTimeoutS"`
	AllowPowerActions bool    `yaml:"allowPowerActions"`
	AllowUpdates      bool    `yaml:"allowUpdates"`
	TapZone           TapZone `yaml:"tapZone"`
}

// TapZone is the hidden 5-tap admin corner (UX F5; UX 7 common frame: the
// top-left 120x96). Sent to the UI in hello.config.admin.tapZone.
type TapZone struct {
	Corner   string `yaml:"corner"`
	WidthPx  int    `yaml:"widthPx"`
	HeightPx int    `yaml:"heightPx"`
	Taps     int    `yaml:"taps"`
}

type Metrics struct {
	RetentionDays int `yaml:"retentionDays"`
}

type Assets struct {
	UpstreamPhotos bool `yaml:"upstreamPhotos"`
}

// Paths. Relative paths are resolved against the directory of the config
// file. Empty values are derived from Release.
type Paths struct {
	Release  string `yaml:"release"`  // /opt/eniac-kiosk/current
	Core     string `yaml:"core"`     // <release>/bin/eniac-core
	Upstream string `yaml:"upstream"` // core cwd: <release>/upstream (programs/, demo.card)
	Missions string `yaml:"missions"` // <release>/missions
	Web      string `yaml:"web"`      // <release>/web (built assets)
	WebSrc   string `yaml:"webSrc"`   // dev only: src/web, bundled on request by esbuild
	Run      string `yaml:"run"`      // /run/eniac-kiosk (vlink.sock, s/<session>/)
	State    string `yaml:"state"`    // /var/lib/eniac-kiosk (metrics/)
}

// Duration accepts Go duration strings ("1.5s") in YAML.
type Duration time.Duration

func (d Duration) D() time.Duration { return time.Duration(d) }

func (d *Duration) UnmarshalYAML(n *yaml.Node) error {
	var s string
	if err := n.Decode(&s); err != nil {
		return err
	}
	v, err := time.ParseDuration(s)
	if err != nil {
		return fmt.Errorf("line %d: %w", n.Line, err)
	}
	*d = Duration(v)
	return nil
}

func (d Duration) MarshalYAML() (any, error) { return time.Duration(d).String(), nil }

// Default returns the architecture 8.2 defaults for the prod profile.
func Default() Config {
	return Config{
		Profile: ProfileProd,
		Listen:  "127.0.0.1:8740",
		Health:  Health{Listen: "0.0.0.0:8741"},
		Core: Core{
			GOMAXPROCS:     2,
			Nice:           5,
			ReadyTimeout:   Duration(5 * time.Second),
			AckTimeout:     Duration(1500 * time.Millisecond),
			SilenceTimeout: Duration(2 * time.Second),
			ProbeEvery:     Duration(5 * time.Second),
		},
		Recovery: Recovery{
			Budget:    3,
			Window:    Duration(5 * time.Minute),
			Backoff:   []Duration{Duration(2 * time.Second), Duration(5 * time.Second), Duration(10 * time.Second)},
			SlowRetry: Duration(10 * time.Minute),
		},
		Idle:    Idle{SetupS: 90, RunS: 180, CountdownS: 15},
		Admin:   Admin{SessionTimeoutS: 120, AllowPowerActions: true, AllowUpdates: true, TapZone: TapZone{Corner: "top-left", WidthPx: 120, HeightPx: 96, Taps: 5}},
		Metrics: Metrics{RetentionDays: 400},
		Paths: Paths{
			Release: "/opt/eniac-kiosk/current",
			Run:     "/run/eniac-kiosk",
			State:   "/var/lib/eniac-kiosk",
		},
	}
}

// Load reads a YAML config file over the defaults. Unknown keys are errors,
// so a typo can't silently fall back to a default.
func Load(path string) (Config, error) {
	c := Default()
	b, err := os.ReadFile(path)
	if err != nil {
		return c, err
	}
	if err := Parse(b, &c); err != nil {
		return c, fmt.Errorf("%s: %w", path, err)
	}
	abs, err := filepath.Abs(path)
	if err != nil {
		return c, err
	}
	c.resolvePaths(filepath.Dir(abs))
	return c, c.Validate()
}

// Parse decodes YAML into c (which should hold defaults).
func Parse(b []byte, c *Config) error {
	dec := yaml.NewDecoder(bytes.NewReader(b))
	dec.KnownFields(true)
	// An empty file (io.EOF) is valid: it means "all defaults".
	if err := dec.Decode(c); err != nil && !errors.Is(err, io.EOF) {
		return err
	}
	return nil
}

func (c *Config) resolvePaths(base string) {
	abs := func(p string) string {
		if p == "" || filepath.IsAbs(p) {
			return p
		}
		return filepath.Clean(filepath.Join(base, p))
	}
	p := &c.Paths
	p.Release = abs(p.Release)
	if p.Core == "" {
		p.Core = filepath.Join(p.Release, "bin", "eniac-core")
	}
	if p.Upstream == "" {
		p.Upstream = filepath.Join(p.Release, "upstream")
	}
	if p.Missions == "" {
		p.Missions = filepath.Join(p.Release, "missions")
	}
	if p.Web == "" {
		p.Web = filepath.Join(p.Release, "web")
	}
	p.Core, p.Upstream, p.Missions, p.Web = abs(p.Core), abs(p.Upstream), abs(p.Missions), abs(p.Web)
	p.WebSrc, p.Run, p.State = abs(p.WebSrc), abs(p.Run), abs(p.State)
}

// Validate checks values the bridge can't run with.
func (c Config) Validate() error {
	var errs []string
	switch c.Profile {
	case ProfileProd, ProfileTest, ProfileDev:
	default:
		errs = append(errs, fmt.Sprintf("profile must be prod, test or dev, not %q", c.Profile))
	}
	if c.Core.GOMAXPROCS < 1 {
		errs = append(errs, "core.gomaxprocs must be >= 1")
	}
	if c.Core.ReadyTimeout <= 0 || c.Core.AckTimeout <= 0 || c.Core.SilenceTimeout <= 0 || c.Core.ProbeEvery <= 0 {
		errs = append(errs, "core timeouts must be positive")
	}
	if c.Recovery.Budget < 1 || len(c.Recovery.Backoff) == 0 {
		errs = append(errs, "recovery.budget must be >= 1 and recovery.backoff non-empty")
	}
	// The core splits its -v argument on single spaces (architecture 3.4),
	// and `l <file>` splits on whitespace, so these paths may not contain any.
	for name, p := range map[string]string{"paths.run": c.Paths.Run, "paths.core": c.Paths.Core, "paths.upstream": c.Paths.Upstream} {
		if strings.ContainsAny(p, " \t") {
			errs = append(errs, fmt.Sprintf("%s must not contain spaces: %q", name, p))
		}
	}
	if len(errs) > 0 {
		return errors.New(strings.Join(errs, "; "))
	}
	return nil
}
