# ENIAC Touch Kiosk. See docs/architecture.md 11.2 and README.md.
SHELL := /bin/bash
GOTOOLCHAIN := $(shell sed -n 's/^GOTOOLCHAIN=//p' upstream.lock)
UPSTREAM_COMMIT := $(shell sed -n 's/^COMMIT=//p' upstream.lock)
PATCH_NAMES := $(shell sed -e 's/\#.*//' -e 's/\.patch$$//' patches/series | tr -s '\n ' ',' | sed 's/,$$//')
VERSION ?= 0.1.0-dev
export GOTOOLCHAIN

BRIDGE := src/bridge
HOSTOS := $(shell uname -s | tr A-Z a-z)
HOSTARCH := $(shell uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/')
HOSTCORE := build/$(HOSTOS)-$(HOSTARCH)/eniac-core
LDFLAGS := -X eniac-kiosk/bridge/internal/buildinfo.Version=$(VERSION) \
           -X eniac-kiosk/bridge/internal/buildinfo.UpstreamCommit=$(UPSTREAM_COMMIT) \
           -X eniac-kiosk/bridge/internal/buildinfo.Patches=$(PATCH_NAMES)
WEB_TESTS = $(shell find tests/web -name '*.test.ts' 2>/dev/null)
# Kiosk target CPU for `make release`: arm64 (Pi 5) or amd64 (x86 mini PC).
ARCH ?= arm64
KIOSK_ARCHES := arm64 amd64

.PHONY: help upstream upstream-unpatched bridge bridge-linux bridge-dev web release release-all dev e2e e2e-mock test test-go vet tsc test-web \
        test-upstream test-realcore fuzz protogen missions-check selftest goldens test-install-container test-ui-switch test-upgrade-display \
        install-stick test-stick test-stick-vm

help:
	@grep -E '^## ' Makefile | sed 's/^## //'

## upstream            fetch + verify + patch the pinned simulator, build both cores
upstream:
	scripts/fetch-upstream.sh

## upstream-unpatched  also build an unpatched host core (golden recording only)
upstream-unpatched:
	scripts/fetch-upstream.sh --unpatched

$(HOSTCORE):
	scripts/fetch-upstream.sh

## bridge              build build/<host>/eniac-bridge and build/linux-{arm64,amd64}/eniac-bridge
bridge:
	cd $(BRIDGE) && CGO_ENABLED=0 go build -trimpath -ldflags "$(LDFLAGS)" -o ../../build/$(HOSTOS)-$(HOSTARCH)/eniac-bridge ./cmd/eniac-bridge
	@for a in $(KIOSK_ARCHES); do $(MAKE) --no-print-directory bridge-linux ARCH=$$a || exit 1; done

# bridge-linux ARCH=<a>: one static linux bridge, build/linux-<a>/eniac-bridge
bridge-linux:
	@case "$(ARCH)" in arm64|amd64) ;; *) echo "ARCH must be arm64 or amd64, not '$(ARCH)'" >&2; exit 2 ;; esac
	cd $(BRIDGE) && CGO_ENABLED=0 GOOS=linux GOARCH=$(ARCH) go build -trimpath -ldflags "$(LDFLAGS)" -o ../../build/linux-$(ARCH)/eniac-bridge ./cmd/eniac-bridge

## release             make release ARCH=amd64|arm64 -> dist/eniac-touch-kiosk-<ver>-linux-<arch>.tar.gz
# Always re-runs fetch-upstream (offline once cached) so the shipped core and
# .provenance.json match upstream.lock + patches/ exactly.
release: web
	@case "$(ARCH)" in arm64|amd64) ;; *) echo "ARCH must be arm64 or amd64, not '$(ARCH)'" >&2; exit 2 ;; esac
	scripts/fetch-upstream.sh
	$(MAKE) --no-print-directory bridge-linux ARCH=$(ARCH)
	VERSION=$(VERSION) scripts/build-release.sh $(ARCH)

## release-all         both release tarballs (arm64 and amd64)
release-all:
	@for a in $(KIOSK_ARCHES); do $(MAKE) --no-print-directory release ARCH=$$a || exit 1; done

bridge-dev:
	cd $(BRIDGE) && go build -tags devserver -ldflags "$(LDFLAGS)" -o ../../build/dev/eniac-bridge ./cmd/eniac-bridge

## web                 bundle src/web into build/web with esbuild (a Go tool)
# (production: __DEV__=false compiles out the ?mission= dev shortcut; panels are inside app.js)
web:
	rm -rf build/web && mkdir -p build/web
	cd $(BRIDGE) && go tool esbuild ../web/app/main.ts --bundle --format=esm --target=es2022 --minify --legal-comments=none \
	  --define:__DEV__=false --outfile=../../build/web/app.js --log-level=warning
	cp src/web/index.html build/web/index.html
	cp -R src/web/styles src/web/fonts build/web/

## e2e                 Playwright against the REAL bridge + core (1920x1080, touch, incl. kill -9 -> S10)
e2e: $(HOSTCORE) src/web/node_modules
	cd src/web && npx playwright install chromium && npm run e2e:real

## e2e-mock            Playwright against the dev-only mock bridge (fast, every screen and fault)
e2e-mock: src/web/node_modules
	cd src/web && npx playwright install chromium && npm run e2e

## dev                 run the bridge in --dev against the real darwin core (http://localhost:8740)
dev: $(HOSTCORE) bridge-dev
	build/dev/eniac-bridge serve --dev --config deploy/config/config.dev.yaml

## test                go test + vet + tsc + node --test + mission check + the session's UI-switch loop (the PR gate)
test: $(HOSTCORE) vet test-go tsc test-web missions-check test-ui-switch test-upgrade-display

## test-ui-switch      kiosk-session's Original UI loop with stubs, no X (bash 4 + setsid; on a Mac it uses docker)
test-ui-switch:
	tests/deploy/test-ui-switch.sh

## test-upgrade-display  install.sh restarts a live display after an upgrade (no X, no root)
test-upgrade-display:
	tests/deploy/test-upgrade-display.sh

test-go:
	cd $(BRIDGE) && go test ./...
	@if [ -d tests/fakecore ]; then cd tests/fakecore && go vet ./... && go build -o /dev/null .; fi

vet:
	cd $(BRIDGE) && go vet ./... && go vet -tags devserver ./...

src/web/node_modules:
	cd src/web && npm install --no-fund --no-audit

tsc: src/web/node_modules
	cd src/web && npx tsc --noEmit -p .

test-web:
	@if [ -n "$(WEB_TESTS)" ]; then node --test $(WEB_TESTS); else echo "test-web: no web tests yet"; fi

missions-check:
	@if ls missions/*.yaml >/dev/null 2>&1; then cd $(BRIDGE) && go run ./cmd/eniac-bridge mission check --config ../../deploy/config/config.dev.yaml ../../missions/*.yaml; else echo "missions-check: no missions yet"; fi

## test-upstream       negative + offline tests of the fetch script (slow: rebuilds the core)
test-upstream:
	tests/upstream/test-fetch.sh

## test-install-container  install/upgrade/remove rehearsal in a throwaway ubuntu:24.04 amd64 container (docker + network, ~15 min)
test-install-container:
	$(MAKE) --no-print-directory release ARCH=amd64
	tests/deploy/test-install-container.sh

## install-stick       one-stick Ubuntu 24.04 + kiosk installer image for the OptiPlex -> build/stick/*.iso
##                     (STICK_ARGS="--write-to disk4" to flash; see docs/deploy-x86.md "One-stick install")
install-stick:
	scripts/make-install-stick.sh $(STICK_ARGS)

## test-stick          autoinstall config vs subiquity's 24.04 schema, bash -n + shellcheck of the stick scripts
test-stick:
	tests/deploy/validate-autoinstall.sh

## test-stick-vm       QEMU x86_64 UEFI rehearsal of a stick image (ISO=...): install -> first boot -> kiosk (1-2 h emulated)
test-stick-vm:
	tests/deploy/test-stick-qemu.sh $(ISO)

## test-realcore       long real-core tests: 50-INIT idle soak per speed, 100 cold starts, 30 start/stop
test-realcore: $(HOSTCORE)
	cd $(BRIDGE) && go test -tags realcore -timeout 30m -count=1 ./...

## fuzz                60 s fuzzing per target (FUZZTIME=10m for nightly)
FUZZTIME ?= 60s
fuzz:
	cd $(BRIDGE) && go test ./internal/status -run '^$$' -fuzz FuzzParse -fuzztime $(FUZZTIME)

## protogen            regenerate src/bridge/internal/{protocol,mission}/*.gen.ts (imported by src/web/app/protocol.ts)
protogen:
	cd $(BRIDGE) && go tool tygo generate

## selftest            boot the Squares preset headless, apply all steps, INIT x3, expect 3 / 9
selftest: $(HOSTCORE)
	cd $(BRIDGE) && go run ./cmd/eniac-bridge selftest --config ../../deploy/config/config.dev.yaml

## goldens             re-record tests/golden from the real core (after an upstream bump)
goldens: bridge
	B=build/$(HOSTOS)-$(HOSTARCH)/eniac-bridge; C=deploy/config/config.dev.yaml; \
	$$B record --config $$C --program sq.e --inits 3 --rate 100 --settle 2.5s --name sq-3inits --out tests/golden && \
	$$B record --config $$C --program sq.e --inits 12 --rate 0 --settle 300ms --name sq-12inits --out tests/golden && \
	$$B record --config $$C --program $(CURDIR)/tests/golden/neg-sign.e --inits 1 --rate 0 --settle 500ms --name neg-sign --out tests/golden && \
	$$B record --config $$C --program trajdemo.e --inits 0 --rate 0 --seconds 10s --freeze --name traj-patched --out tests/golden && \
	$$B record --config $$C --program trajdemo.e --inits 0 --rate 0 --seconds 10s --freeze --unpatched --core build/unpatched/eniac-core --name traj-unpatched-m --out tests/golden
