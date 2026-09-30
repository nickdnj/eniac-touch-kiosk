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

.PHONY: help upstream upstream-unpatched bridge bridge-dev web dev test test-go vet tsc test-web \
        test-upstream test-realcore fuzz protogen missions-check selftest

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

## bridge              build build/<host>/eniac-bridge and build/linux-arm64/eniac-bridge
bridge:
	cd $(BRIDGE) && CGO_ENABLED=0 go build -trimpath -ldflags "$(LDFLAGS)" -o ../../build/$(HOSTOS)-$(HOSTARCH)/eniac-bridge ./cmd/eniac-bridge
	cd $(BRIDGE) && CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -ldflags "$(LDFLAGS)" -o ../../build/linux-arm64/eniac-bridge ./cmd/eniac-bridge

bridge-dev:
	cd $(BRIDGE) && go build -tags devserver -ldflags "$(LDFLAGS)" -o ../../build/dev/eniac-bridge ./cmd/eniac-bridge

## web                 bundle src/web into build/web with esbuild (a Go tool)
web:
	mkdir -p build/web
	cd $(BRIDGE) && go tool esbuild ../web/app/main.ts --bundle --format=esm --target=es2022 --outfile=../../build/web/app.js --log-level=warning
	cp src/web/index.html build/web/index.html

## dev                 run the bridge in --dev against the real darwin core (http://localhost:8740)
dev: $(HOSTCORE) bridge-dev
	build/dev/eniac-bridge serve --dev --config deploy/config/config.dev.yaml

## test                go test + vet + tsc + node --test + mission check (the PR gate)
test: $(HOSTCORE) vet test-go tsc test-web missions-check

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

## test-realcore       long real-core tests: 50-INIT idle soak per speed, 100 cold starts, 30 start/stop
test-realcore: $(HOSTCORE)
	cd $(BRIDGE) && go test -tags realcore -timeout 30m -count=1 ./...

## fuzz                60 s fuzzing per target (FUZZTIME=10m for nightly)
FUZZTIME ?= 60s
fuzz:
	cd $(BRIDGE) && go test ./internal/status -run '^$$' -fuzz FuzzParse -fuzztime $(FUZZTIME)

## protogen            regenerate src/web/app/protocol.gen.ts from the Go protocol types
protogen:
	cd $(BRIDGE) && go tool tygo generate

## selftest            boot the Squares preset headless, apply all steps, INIT x3, expect 3 / 9
selftest: $(HOSTCORE)
	cd $(BRIDGE) && go run ./cmd/eniac-bridge selftest --config ../../deploy/config/config.dev.yaml
