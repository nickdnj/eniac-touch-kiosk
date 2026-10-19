# ENIAC Touch Kiosk

A touch-first museum kiosk for Brian L. Stuart's pulse-level ENIAC simulator. A Go bridge runs the simulator core, unmodified apart from a few small local bug fixes (`patches/`, policy in `docs/architecture.md` 4.4), and serves a web UI to Chromium in kiosk mode. Design: `docs/architecture.md`. Plan: `docs/dev-plan.md`. Tests: `docs/test-plan.md`.

Software project, team: Software Project Team. Provisioned by AgentArchitect (2026-09-30).

## Developing on the Mac

### Prerequisites

- Go (any recent version). The build pins its own toolchain from `upstream.lock` (`GOTOOLCHAIN=go1.26.8`) and downloads it on first use, because upstream's `go.mod` needs Go 1.26.
- git, make, and network access for the first run (upstream mirror + Go toolchain + Go modules).
- Node 22+ and npm, for dev checks only (`tsc`, `node --test`). Node is never on the Pi and never in a release.
- Desktop Chrome for the UI.

### First run

```sh
make upstream      # fetch + verify + patch the pinned simulator, build build/darwin-arm64 + linux-{arm64,amd64} cores
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

## Installing on a kiosk

```sh
make release ARCH=amd64   # Dell OptiPlex / any x86-64 Ubuntu 24.04 box (primary)
make release ARCH=arm64   # Raspberry Pi 5
```

Copy `dist/eniac-touch-kiosk-<ver>-linux-<arch>.tar.gz` to the box, unpack, `sudo ./install.sh`, then set the staff PIN: `sudo eniac-touch-kiosk set-pin` (there is no default). Removal: `sudo eniac-touch-kiosk-uninstall`.

Staff on the floor: one tap on the ENIAC wordmark (top left) asks to start over; **five taps** open the PIN pad and then the admin screen (**Restart simulator**, **Original UI**: Brian L. Stuart's own Tk front end, **Return to kiosk**). Visitors find Stuart's self-running **Original room tour** in Explore. **Back to kiosk** (top left) or the idle timeout returns; over SSH, `sudo eniac-touch-kiosk original-ui tour|interactive|off|status`. Design: `docs/original-ui-switch.md`. The full install-day procedure (USB stick, BIOS, touch check, power-cut test, rollback) is `docs/deploy-x86.md`. `tests/deploy/test-install-container.sh` rehearses install + removal in a throwaway Ubuntu 24.04 container.

## Upstream: pin, patches and taking Stuart's updates

`upstream.lock` pins Stuart's simulator to one commit (with its tree hash), and `patches/series` lists the local patches applied on top, in order. `scripts/fetch-upstream.sh` (`make upstream`) exports the commit from the mirror cache at `~/.cache/eniac-kiosk/upstream.git`, checks the tree hash, applies each patch with `git apply --check` first and **no fuzz**, and builds the cores. Nothing from upstream is committed.

The patch policy (PRD NFR-12, decision #36): we fix upstream bugs ourselves with small patches, each with an upstream bug report pending, and **drop each patch once upstream fixes the bug**. The patches and the test that shows each one are listed in `docs/architecture.md` 4.4. The bug-report draft for Stuart is in `docs/spikes/S3-sieve-regression.md`.

### Taking upstream updates

Do this on a branch, as its own PR. Never bump the pin automatically.

1. **See what changed.**
   ```sh
   C=~/.cache/eniac-kiosk/upstream.git
   git --git-dir=$C fetch origin '+refs/*:refs/*'
   OLD=$(sed -n 's/^COMMIT=//p' upstream.lock); NEW=$(git --git-dir=$C rev-parse master)
   git --git-dir=$C log --oneline $OLD..$NEW
   git --git-dir=$C diff --stat $OLD $NEW -- src programs go.mod
   ```
   Read the `src/` diff for each file a patch touches (`mult.go`, `ft.go`, `accumulator.go` today), and the `programs/` diff for every mission's `.e`.
2. **Bump `upstream.lock`.** Set `COMMIT=$NEW` and `TREE=$(git --git-dir=$C rev-parse $NEW^{tree})`. If upstream's `go.mod` now needs a newer Go, bump `GOTOOLCHAIN` too.
3. **Drop the patches upstream has fixed.** For each line in `patches/series`:
   - If upstream's diff contains the fix (or an equivalent one), delete the patch file and its `series` line.
   - If you are not sure, take the patch out and run its test (table below). If the test passes without the patch, the patch has gone.
   - If the bug is still there but the patch no longer applies, regenerate it against `$NEW` (still no fuzz) and keep it.
   - Update the table in `docs/architecture.md` 4.4 and the bug-report draft.

   | Patch | Test that shows the bug without it |
   |---|---|
   | ~~`0001-mult-stage-format`~~ | Retired 2026-10-19: Stuart fixed it upstream (9da94de, `eniactk` now parses with `strings.Fields`). It was `make upstream-unpatched`, then `build/unpatched/eniac-core` still prints `m  0` (two spaces): the `traj-unpatched-m` golden |
   | ~~`0002-ft-repeat-default`~~ | Retired 2026-10-19: Stuart took the fix upstream (ad9a7a7, same change). It was `TestRealCoreSieveCanary` fails in about 1.5 s with "function-table ring ran away" |
   | `0003-acc-1pp-race` | `go build -race ./src` in `build/upstream` and run `trajdemo.e` for 40 s: the race detector reports `accrecv` against `doonepp`. (`TestRealCoreTrajdemoDeterministic` is too weak to rely on here; see spike S2.) |
4. **Rebuild and re-record the goldens.**
   ```sh
   make upstream-unpatched   # patched cores plus build/unpatched/eniac-core
   make goldens              # re-records tests/golden from the real core
   ```
   Review the diff of the `.status`, `.dump` and `.punch` files in the PR: a changed wire format or a changed answer shows up there first.
5. **Run the canaries and every suite.**
   ```sh
   make test            # includes the quick sieve-canary, golden replay and mission sha256 drift check
   make test-realcore   # full sieve-canary (407 primes), trajdemo-canary, idle soaks, cold starts
   make test-upstream   # fetch script negative tests; checks each patched line and the provenance
   make e2e             # Playwright against the real bridge and core
   ```
   A mission whose `.e` changed fails `missions-check` until its steps and sha256 are reviewed.
6. **Record it.** Add a line to the revision history in `docs/architecture.md` (and `docs/PRD.md` if a requirement changed), close the upstream-report items for the dropped patches, and open the PR.

## License

The code and documentation in this repository are MIT licensed (`LICENSE`). Brian L. Stuart's ENIAC simulator, which this kiosk runs, is **not** included and is **not** covered by that license; see `NOTICE.md`.
