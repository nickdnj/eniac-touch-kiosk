# ENIAC Touch Kiosk

A touch-first museum kiosk for Brian L. Stuart's pulse-level ENIAC simulator. A Go bridge runs the unmodified (apart from one patch) simulator core and serves a web UI to Chromium in kiosk mode. Design: `docs/architecture.md`. Plan: `docs/dev-plan.md`. Tests: `docs/test-plan.md`.

Software project, team: Software Project Team. Provisioned by AgentArchitect (2026-09-30).

## Developing on the Mac

### Prerequisites

- Go (any recent version). The build pins its own toolchain from `upstream.lock` (`GOTOOLCHAIN=go1.26.8`) and downloads it on first use, because upstream's `go.mod` needs Go 1.26.
- git, make, and network access for the first run (upstream mirror + Go toolchain + Go modules).
- Node 22+ and npm, for dev checks only (`tsc`, `node --test`). Node is never on the Pi and never in a release.
- Desktop Chrome for the UI.

### First run

```sh
make upstream      # fetch + verify + patch the pinned simulator, build build/{darwin,linux}-arm64/eniac-core
make test          # go test, go vet, tsc, node --test, mission check
make dev           # bridge in --dev mode on http://localhost:8740 against the real darwin core
```

After one successful `make upstream`, builds work offline: the upstream mirror is cached at `~/.cache/eniac-kiosk/upstream.git` and the toolchain in the Go module cache. Upstream source is never committed (`build/` is gitignored).

In `make dev` the bridge serves `src/web` through esbuild's Go API and rebuilds `app.js` on every request, so editing a `.ts` file and reloading shows the change.

### Chrome at kiosk size with touch

1. Open http://localhost:8740 in Chrome and open DevTools (Cmd-Opt-I).
2. Toggle the device toolbar (Cmd-Shift-M).
3. In the device menu choose **Edit…** → **Add custom device**: 1920 × 1080, device pixel ratio 1, type **Mobile** (this turns on touch events and `pointer: coarse`).
4. Select it. The cursor becomes a touch circle; clicks are sent as touches.

### Other targets

| Target | Does |
|---|---|
| `make test-realcore` | Long real-core tests (50-INIT idle soak per speed, cold-start loops). About 5 minutes. |
| `make fuzz` | 60 s of fuzzing on the status parser (`FUZZTIME=10m` for longer). |
| `make test-upstream` | Negative and offline tests of `scripts/fetch-upstream.sh`. |
| `make protogen` | Regenerate `src/web/app/protocol.gen.ts` from the Go protocol types. |
| `make selftest` | Headless Squares: preset, 7 steps, INIT ×3, expect 3 and 9. |
| `make upstream-unpatched` | Also build an unpatched core (only for re-recording the `m` double-space golden). |
