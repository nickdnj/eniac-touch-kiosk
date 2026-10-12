# Development Plan: ENIAC Touch Kiosk

**Version:** 0.1
**Last Updated:** 2026-09-30
**Author:** Nick DeMarco with AI assistance (dev-planning agent)
**Status:** Draft for review
**Inputs:** `docs/PRD.md` v0.1, `docs/architecture.md` v0.1 (M1 scope in 12.1, milestones in 12), `docs/ux-spec.md` v0.1 (8.1 Squares), `docs/handoff-from-vcf.md`.
**Tracker:** GitHub `nickdnj/eniac-touch-kiosk` (private). Milestones M1-M5, issues #1-#40. Issue numbers below are the source of truth for order: **build M1 in issue-number order**, subject to the listed dependencies.

---

## 1. Planning assumptions

- Team is unknown, so this plan gives **order, dependencies and relative size** (points on the 1/2/3/5/8 scale), not dates or a sprint calendar. No sprint plan was requested. Anything sized 8 should be split if it runs long (noted on the story).
- M1 total: 33 stories, 164 points (plus 3 non-code tasks, 6 points). Points include tests and review.
- Tests are part of every story. Test notes in each story say what "done" looks like.
- Hardware access: stories #26-#29 and the spikes need the Model 4 kiosk Pi 5. PRD R5 says test only when it is not needed on the floor, but **no test window is scheduled** anywhere. Get one before #26.
- Stories #1-#25 need only the Mac (Go 1.26 toolchain via `GOTOOLCHAIN`, Node for dev checks, desktop Chrome). This Mac has go1.25.5, so the first build downloads go1.26.x.
- Labels: `epic`, `story`, `spike`, `chore`, `upstream`, `needs-decision`, `area:bridge`, `area:web`, `area:deploy`, `area:content`.

## 2. Epics

| Epic | Milestone | Issue | Exit |
|---|---|---|---|
| M1 MVP: Squares end to end on the Model 4 | M1 | stories #1-#33, tasks #34-#36 | Visitor completes Squares by touch. `kill -9` of the core shows S10 and it recovers. Removal leaves the Model 4 unchanged and it reboots into its own kiosk. |
| M2: All missions | M2 | #37 | all three missions meet FR-10 length targets and NFR-04 (20 fps) |
| M3: Operable | M3 | #38 | NFR-02, NFR-05, NFR-07 pass on the test box |
| M4: Production hardware and handoff | M4 | #39 | G1-G7 all pass |
| M5: Floor trial | M5 | #40 | OT-7 and museum owner sign-off |

## 3. M1 build order

### 3.1 At a glance

| # | Plan ID | Story | Pts | Depends on |
|---|---|---|---|---|
| #1 | M1-01 | Upstream fetch, verify, patch and build tooling | 3 | none |
| #2 | M1-02 | Repo scaffold and Mac dev workflow (make dev / make test) | 5 | #1 |
| #3 | M1-03 | Status-line parser (internal/status) with table and fuzz tests | 3 | #2 |
| #4 | M1-04 | Core process manager: vlink, stdin writer, stdout classifier, teardown | 8 | #1, #2, #3 |
| #5 | M1-05 | Machine mirror, merge-patch coalescer, record command, golden stream tests | 5 | #3, #4 |
| #6 | M1-06 | Run-state idle detector and checkpoint evaluator | 5 | #5 |
| #7 | M1-07 | Core fault detection, recovery and retry budget (with fakecore) | 5 | #4, #5 |
| #8 | M1-08 | Websocket protocol: message types, generated TS types, server, hub, loopback /healthz | 5 | #2, #5 |
| #9 | M1-09 | econfig: .e tokenizer, jack grammar and M1 switch catalog | 5 | #1, #2 |
| #10 | M1-10 | Mission loader, validator, squares.yaml, preset generation and mission API | 8 | #4, #6, #9 |
| #11 | M1-11 | Session state machine and action whitelist | 8 | #6, #7, #8, #10 |
| #12 | M1-12 | Raw metrics JSONL writer | 2 | #11 |
| #13 | M1-13 | Web shell: boot, ws client, state, router, touch guards, footer, tokens | 5 | #2, #8 |
| #14 | M1-14 | SVG panel kit for the Squares units and ID grammar | 8 | #13, #10 |
| #15 | M1-15 | Lamp derivation and rendering | 5 | #13, #14 |
| #16 | M1-16 | Mission runner logic (taps, wrong-tap ladder, hit testing) | 5 | #13, #10 |
| #17 | M1-17 | Guided step stage: Workbench, jack windows, switch picker, guide choreography | 8 | #14, #15, #16 |
| #18 | M1-18 | Step rail and navigation: briefing, plan, step card, S5, Tell me more, Start over | 8 | #11, #16, #17 |
| #19 | M1-19 | Run view (S6): lamp grids, INIT/CLEAR, speed, captions, notebook tape | 8 | #15, #18 |
| #20 | M1-20 | Autopress: 'Keep pressing for me' and 'Skip to the answer' | 3 | #19 |
| #21 | M1-21 | Result screen (S7): tape, explanation, takeaway, Next / Try again / Menu | 3 | #19 |
| #22 | M1-22 | Start screen, waking screen and mission picker stand-ins (attract is M2) | 3 | #18 |
| #23 | M1-23 | Inactivity timeouts, 'Still there?' overlay and session reset | 3 | #18, #22 |
| #24 | M1-24 | Error state (S10) and end-to-end recovery | 5 | #7, #13, #22 |
| #25 | M1-25 | Release build script and runtime-file closure | 5 | #1, #10, #13 |
| #26 | M1-26 | Model 4 install: systemd units, overlay, install.sh and manifest | 8 | #25 |
| #27 | M1-27 | Uninstall and legacy trial removal | 5 | #26 |
| #28 | M1-28 | coexist-check.sh and the Model 4 reboot checklist | 3 | #26 |
| #29 | M1-29 | M1 exit verification on the Model 4 | 3 | #20, #21, #23, #24, #27, #28 |
| #30 | M1-30 | Spike S1 (R3): Pi 5 CPU and fps at full speed with Chromium rendering | 5 | #4, #15, #26 |
| #31 | M1-31 | Spike S2 (R4): trajdemo part-by-part INIT and fast-forward | 3 | #4 |
| #32 | M1-32 | Spike S3 (U1): sieve.e function-table regression triage | 3 | #1 |
| #33 | M1-33 | Spike S4: Squares slow-rate tuning, idle-detector soak, CLEAR behavior on the Pi | 3 | #6, #11, #26 |

### 3.2 Parallelism and critical path

- **Critical path:** #1 -> #2 -> #3 -> #4 -> #5 -> #6 -> #10 -> #11 -> #18 -> #19 -> #24 -> #29.
- After #2 the web track (#13, #14, #16 pure logic) can proceed in parallel with the bridge track once #8 (protocol types) exists.
- #9 (econfig) needs only #1 and #2 and can run alongside #3-#5.
- #25-#28 (release, install, uninstall, coexist-check) are independent of the UI; do #25 and dry-run #26-#28 on the Mac while UI work continues. Only the on-device steps need the Model 4 window.
- Spikes: #32 (sieve triage) needs only #1 and is worth doing **early** because it feeds #34 and the Primes decision #36. #31 needs #4. #30 and #33 need the Pi deployment (#26).
- Stories are listed in the order the user asked (tooling, bridge core, protocol, missions, web shell/panels/lamps, guided UI, run/result, attract/idle/error, install, spikes). Where a dependency forced a different order the dependency column wins.

### 3.3 Stories by area

- **(a) Upstream tooling and Mac dev workflow:** #1, #2
- **(b) Bridge core: parser, core manager, mirror, run state, recovery:** #3, #4, #5, #6, #7
- **(c) Websocket protocol:** #8
- **(d) Mission loader and step validation (plus the session that uses it):** #9, #10, #11, #12
- **(e) Web shell, SVG panels, lamp rendering:** #13, #14, #15
- **(f) Guided-step UI:** #16, #17, #18
- **(g) Run and result screens:** #19, #20, #21
- **(h) Attract, idle and error states:** #22, #23, #24
- **(i) Model 4 install, uninstall and coexist-check:** #25, #26, #27, #28, #29
- **(j) Spikes:** #30, #31, #32, #33

---

## 4. M1 stories

### (a) Upstream tooling and Mac dev workflow

#### #1 Upstream fetch, verify, patch and build tooling

**ID:** M1-01 | **Labels:** story, upstream, area:deploy | **Estimate:** 3 pts | **Depends on:** none

Pin Stuart's simulator at c4b94f2, apply the mult.go patch, and build the core for the Mac and the Pi. Nothing from upstream is committed (R1).

**Acceptance criteria**

- [ ] `upstream.lock` records URL, COMMIT `c4b94f2ca9ea59dd3fdb05ddf5e29a08c7ce569a`, the real TREE hash, and the real GOTOOLCHAIN (go1.26.x).
- [ ] `patches/0001-mult-stage-format.patch` and `patches/series` exist. The patch changes only `src/mult.go:66` from `"%2d "` to `"%d "`.
- [ ] `scripts/fetch-upstream.sh` keeps a bare mirror at `~/.cache/eniac-kiosk/upstream.git`, fetches only if the commit is missing, runs `git archive` into `build/upstream`, verifies TREE (aborts on mismatch), runs `git apply --check` then `git apply` per patch (aborts on failure, no fuzz), and writes `build/upstream/.provenance.json` (commit, tree, patch sha256s, builtAt).
- [ ] `make upstream` produces `build/darwin-arm64/eniac-core` and `build/linux-arm64/eniac-core` (`CGO_ENABLED=0 -trimpath`, pinned GOTOOLCHAIN).
- [ ] After one successful run, `make upstream` works with the network off.
- [ ] `build/` and `dist/` are gitignored and no upstream source is committed.
- [ ] Not in M1: `scripts/bump-upstream.sh` (only needed when the pin is bumped).

**Test notes**

- Tamper with TREE: the script aborts. Break the patch context: it aborts. Both with a clear message.
- `grep` the built tree for `Sprintf("%d "` at the patched line.
- Run the darwin core with a stub `-v` child and `programs/sq.e` as argv: it reaches the `> ` prompt.
- `file build/linux-arm64/eniac-core` reports a statically linked ARM aarch64 executable.
- Note: this Mac has go1.25.5 and upstream needs 1.26 (U8). First run needs network for the toolchain download. Record the exact 1.26.x.

**References:** Architecture 4.1-4.3, U8; PRD NFR-12, R1

#### #2 Repo scaffold and Mac dev workflow (make dev / make test)

**ID:** M1-02 | **Labels:** story, area:bridge, area:web | **Estimate:** 5 pts | **Depends on:** #1

Create the Go module, web folder, Makefile and dev loop so the whole kiosk runs in desktop Chrome on the Mac against the real core.

**Acceptance criteria**

- [ ] `src/bridge/go.mod` (go 1.26) with `tool` directives for esbuild and tygo; `cmd/eniac-bridge` with subcommands `serve`, `version` (other subcommands added by later stories) and the `internal/` package skeleton from architecture 3.2.
- [ ] `src/web/` skeleton with `tsconfig.json` and dev-only `package.json` (typescript, node test runner, later Playwright). Node is never in a release.
- [ ] `deploy/config/config.dev.yaml` and a config loader for the 8.2 schema (profile dev/test/prod).
- [ ] `make dev` builds the darwin core (via #1) and runs `eniac-bridge serve --dev`. In `--dev` it serves `src/web` through esbuild's Go API with rebuild-on-request and allows `http://localhost:8740` as an Origin.
- [ ] `make test` runs `go test ./...`, `go vet`, `tsc --noEmit`, `node --test tests/web` (passes with zero tests at this stage).
- [ ] README section: prerequisites, first-run steps, how to open Chrome at 1920x1080 with touch emulation.

**Test notes**

- Fresh clone on the Mac: `make upstream && make dev` serves a placeholder page at http://localhost:8740.
- Edit a `.ts` file: reload shows the change with no manual build.
- `make test` is green and is what every later story extends.

**References:** Architecture 11.1, 11.2, 9.1, ADR-005

### (b) Bridge core: parser, core manager, mirror, run state, recovery

#### #3 Status-line parser (internal/status) with table and fuzz tests

**ID:** M1-03 | **Labels:** story, area:bridge | **Estimate:** 3 pts | **Depends on:** #2

Pure function: one raw core status line to a typed event, or a Drop with a reason. Never panics (FR-04).

**Acceptance criteria**

- [ ] Every row of architecture 5.1 is parsed: ad, ac, ar, af, cy, cm, init, mps, mpd, mpi, ftar, ftr, ftad/ftsu/ftse, ct, m, d, punch, up (ignored), L (ignored).
- [ ] Wire indices are 0-based and events carry 1-based unit numbers (a1..a20, f1..f3).
- [ ] `ad` sign: V=0 is P, V=3 is M. Digit values outside 0-9 are dropped.
- [ ] `m` splits on runs of whitespace, so both `%d` and `%2d` forms parse to the same event. `mpi 250` becomes `*`. `ftr` accepts negatives (-3).
- [ ] `punch` payload is `line[6:]`, unsplit, trailing spaces preserved, 80 chars.
- [ ] Unknown or malformed lines return `Drop{reason}`. Drop logging is rate-limited to 10 per minute.
- [ ] `go test -fuzz` runs at least 60 s with no panic.

**Test notes**

- Table tests use the real lines quoted in architecture 5.1 and U7.
- Fuzz seeds: every table line plus truncated, oversized, non-UTF8 and negative-number variants.

**References:** Architecture 5.1, U7; PRD FR-04

#### #4 Core process manager: vlink, stdin writer, stdout classifier, teardown

**ID:** M1-04 | **Labels:** story, area:bridge | **Estimate:** 8 pts | **Depends on:** #1, #2, #3

Start one fresh core per session as its `-v` child relay, send commands one at a time with prompt acks, and tear down cleanly. (Sized 8; split the vlink server from the stdin writer if it runs long.)

**Acceptance criteria**

- [ ] `eniac-bridge vlink --sock S --session TOKEN`: connects to the Unix socket, sends `HELLO <token>`, writes only `ready` to stdout, copies stdin to the socket line by line, exits when either side closes. Stale or unknown tokens are rejected by the bridge.
- [ ] Core is started with the preset as an absolute argv path, cwd = runtime dir containing `programs/`, `GOMAXPROCS=2`, `Nice=5`, minimal env (no DISPLAY), its own process group (`Pdeathsig` on Linux, no-op build tag on darwin).
- [ ] Ready = first `> ` on stdout within 5 s. Load-time error prefixes (`Invalid`, `Unknown command`, `unknown unit`, `No switch`, `Card reader open`, `open `) fail the start with E-CORE-CMD. Timeout is E-CORE-START.
- [ ] Stdin writer: one command in flight, each acked by exactly one following `> `; ack timeout 1.5 s returns E-CORE-HANG. Only the architecture 5.2 command list can be written (typed command constructors, no free strings).
- [ ] After ready the manager sends `f p <session punch file>` and `s cy.rate <default>`.
- [ ] Teardown: write `q`, wait 500 ms, SIGKILL the process group, remove the session dir. Fresh core is ready in 3 s or less (about 1.0 s expected).
- [ ] Session dir paths with spaces are rejected (the core splits `-v` argv on spaces).

**Test notes**

- Integration test with the real darwin core and a hand-copied `sq.e`: start, apply `p`/`s` lines, `b i`, observe status, stop.
- Loop 30 start/stop cycles: no orphan processes (`pgrep`), no hang (argv load avoids U2).
- A second vlink with a wrong token is refused.
- Command writer unit tests with a pipe-based fake.

**References:** Architecture 3.1, 3.3, 3.4, 5.2, U2, U5, ADR-001, ADR-002; PRD FR-01, FR-03

#### #5 Machine mirror, merge-patch coalescer, record command, golden stream tests

**ID:** M1-05 | **Labels:** story, area:bridge | **Estimate:** 5 pts | **Depends on:** #3, #4

Keep a full MachineState mirror from parsed events, emit JSON Merge Patch deltas per 33 ms tick, and pin the whole pipeline with golden recordings from the real core.

**Acceptance criteria**

- [ ] MachineState matches architecture 5.4 (1-based string keys, digit/carry/prog as strings, decoded `value` = int(digits) for P, int(digits) - 10^10 for M).
- [ ] Initial mirror values equal upstream `engine.go`'s initial last-sent values, and a test pins them to the source at the locked commit.
- [ ] Coalescer emits at most one merged delta per client per 33 ms tick; a slow client's deltas merge instead of queueing; punch events go to a separate ordered queue (bound 5000, overflow is E-CORE-DOWN). The core status pipe is always drained.
- [ ] `eniac-bridge record --program sq.e --inits 3` writes the raw status stream and the core's `d` output into `tests/golden/`.
- [ ] Goldens committed: `sq-3inits` and a short trajdemo capture (first part, about 10 s unthrottled) covering mp, ft, mult (both `m` formats if reproducible) and punch lines.
- [ ] Re-record instructions are in `tests/golden/README.md` (run on every upstream bump).

**Test notes**

- Replay `sq-3inits`: final MachineState equals the `d` dump (acc1=3, acc2=9).
- Property test: snapshot(t0) plus all emitted patches equals snapshot(tN) under random tick timing and slow-client merging.
- Trajdemo golden replays without any Drop other than the expected ones.

**References:** Architecture 5.1, 5.4, 11.3, U7, ADR-003

#### #6 Run-state idle detector and checkpoint evaluator

**ID:** M1-06 | **Labels:** story, area:bridge | **Estimate:** 5 pts | **Depends on:** #5

Compute the INIT-finished (`busy`/`idle`) signal and mission checkpoints in the bridge. UX F2 depends on this for re-arming INIT, the notebook tape and autopress.

**Acceptance criteria**

- [ ] `busy` starts when the bridge sends `b i` or `b r`. `idle` requires all of: no MachineState change other than `cycle` for `quiet` ms, every `acc[*].prog` all zeros, init gate66 and gate69 both 0.
- [ ] `quiet = max(120, 3 x additionTime)`, `additionTime = 20000 / rate` ms, 120 ms at rate 0, overridable by mission `run.idle.quietMs`.
- [ ] On `idle` the bridge snapshots `settled` values for the mission's `run.watch` accumulators and emits the `run` event with `inits` count.
- [ ] Checkpoint predicates for M1: `{acc: n, eq|gte: int}`, edge-triggered once per session, emitted as `checkpoint` events.
- [ ] Until #10 lands, speeds and watch lists come from a hand-written test config.

**Test notes**

- Synthetic event timelines for busy/idle, for each of the three conditions failing separately.
- Headless real core (Mac): for each speed preset (slow, full), 50 INITs, each followed by idle with the right `settled` values (known-answer test). Report any mis-declared idle.

**References:** Architecture 5.6, A4, UX F2

#### #7 Core fault detection, recovery and retry budget (with fakecore)

**ID:** M1-07 | **Labels:** story, area:bridge | **Estimate:** 5 pts | **Depends on:** #4, #5

Detect every core failure mode, broadcast health, recover with a probe session, and honor the 3-in-5-minutes budget.

**Acceptance criteria**

- [ ] `tests/fakecore` Go test double (never shipped) with modes: exit-after, hang-stdin, silent-status, garbage, error-on-command, slow-start.
- [ ] Detections and codes per architecture 5.8: E-CORE-START, E-CORE-CMD, E-CORE-DOWN (exit, vlink disconnect, `hang-status` after 2 s silence in continuous mode, `hang-cmd` via the `d i` probe every 5 s).
- [ ] On fault: kill the process group and emit `health {core:down, code, attempt, of:3}`. Backoff 2 s / 5 s / 10 s, then a probe session (headless, Squares preset) that must reach the prompt and ack `d i`. Success emits `health {core:up}`.
- [ ] Budget 3 attempts per 5 min, then `health {final:true, code:E-RETRY-BUDGET}`; quiet retry every 10 min afterwards.
- [ ] Probe uses a static `sq.e` preset until #10 provides the generated preset; #10 swaps it in.

**Test notes**

- One test per fakecore mode asserting the code, timing, backoff sequence and budget exhaustion.
- Manual: `kill -9` the real core while a session runs; health goes down then up without restarting the bridge.

**References:** Architecture 5.8, PRD FR-05, FR-51, FR-52

### (c) Websocket protocol

#### #8 Websocket protocol: message types, generated TS types, server, hub, loopback /healthz

**ID:** M1-08 | **Labels:** story, area:bridge, area:web | **Estimate:** 5 pts | **Depends on:** #2, #5

The contract between bridge and browser: Go types as the source of truth, a ws hub with merge-on-slow-client, strict validation.

**Acceptance criteria**

- [ ] `internal/protocol` Go types for every message in architecture 5.4 and 5.6 (punch defined but unused until M2). `tygo` generates `src/web/app/protocol.gen.ts`; a drift test fails CI if it is stale.
- [ ] `ws://127.0.0.1:8740/ws` only; Origin check (dev origin allowed only with `--dev`); JSON text frames with `t`, optional client `id` echoed as `re`; `protocol` integer 1.
- [ ] Server sends `hello` (protocol, build, config idle values and admin tapZone, health), then `state` (session, seq, machine, cards, run), then `frame` deltas.
- [ ] Client messages are validated strictly: unknown `t`, wrong field types or oversize frames return `error {code:BAD_MESSAGE}` and never reach the core.
- [ ] Per-client backpressure merges deltas; a client that stops reading never blocks the core reader.
- [ ] Loopback `GET /healthz` returns the 5.8 JSON subset available in M1 (status, version, upstream, core, bridge, kiosk, session). Pi temperature and throttling are M3.
- [ ] Static file server for `src/web` build output.

**Test notes**

- Go ws test client: handshake, resync, slow reader converges to true state, bad Origin refused.
- JSON fixtures from a real session are validated by both Go and TS tests.
- Fuzz the client-message decoder.

**References:** Architecture 5.3-5.6, 5.8; PRD FR-02, FR-07

### (d) Mission loader and step validation (plus the session that uses it)

#### #9 econfig: .e tokenizer, jack grammar and M1 switch catalog

**ID:** M1-09 | **Labels:** story, area:bridge | **Estimate:** 5 pts | **Depends on:** #1, #2

Parse upstream `.e` files into typed lines and know which switch values are valid, taken from upstream's `*ctl` functions.

**Acceptance criteria**

- [ ] Tokenizer handles comments, `l` includes, `f` lines, blank lines; yields normalized command text (comments stripped, whitespace collapsed) and the original text for sending.
- [ ] Jack grammar: units `i`, `c`, `a1..a20`; terminals like `a2.6o`, `a1.A`, `c.o`, `i.io`; data trunks (`1`) and program trunks (`1-3`); cable kind (data vs program) derivation.
- [ ] M1 switch catalog from upstream source: accumulator `op` (alpha beta gamma delta epsilon A S AS 0), `rp` (1-9), `cc` (0 C); constant `j`/`k` (0-9) and `sNN` (per `constant.go`); cycling `cy.op`, `cy.rate`. M2 families (MP, FT, printer, multiplier, divider) are not needed yet.
- [ ] Greek letters: `sq.e` may use ASCII names (`alpha`) while architecture 5.9.4 shows `α`. The tokenizer canonicalizes both spellings for matching but sends the original text. Resolve against the real file at the pinned commit and record the finding in the PR.
- [ ] All 25 command lines of `sq.e` parse and classify (13 `p`, 12 `s`).

**Test notes**

- Table tests per catalog family with valid and invalid values.
- Parse real `sq.e` from `build/upstream`; assert 13 cables and 12 switches.
- Catalog drift test: each catalog value is accepted by the real core (`s` command returns no error).

**References:** Architecture 3.2 (econfig), 5.9.5 item 5; UX 8.1.1

#### #10 Mission loader, validator, squares.yaml, preset generation and mission API

**ID:** M1-10 | **Labels:** story, area:bridge, area:content | **Estimate:** 8 pts | **Depends on:** #4, #6, #9

Missions as data: load `missions/squares.yaml`, validate against the pinned `sq.e`, generate the preset, compile the UI-ready mission JSON. (Sized 8; content authoring can be split off if needed.)

**Acceptance criteria**

- [ ] `missions/squares.yaml` per schema 1 with `programSha256`, 7 ordered steps (`j1-one`, `const-to-trunk1`, `trunk1-to-a1`, `a1-to-a2`, `a1-twice`, `init-to-1-1`, `a2-6o-to-1-3`), `withheld: []`, `run` (buttons init/clear, watch 1 and 2, speeds slow/full, defaultSpeed slow), checkpoints `first-square` and `answer` (acc 1 eq 12), `result: answer`, credits.
- [ ] Step copy (headline, body up to 40 words, more up to 120, done, hints) copied from UX 8.1.4, [FC] tags kept in a review field, not shown.
- [ ] Schema extension: the architecture schema has no home for the briefing (0a), plan (0b), S5 text, run-rail captions (triggered by lamp events) or the result copy. Add a `content:` block (briefing, plan, rest, run.captions with trigger predicates, result) and record the amendment in `docs/architecture.md`.
- [ ] Validation per 5.9.5: sha256 match, exactly one match per `line`, steps only `p`/`s`, multiset check (preset + steps + withheld == original), catalog check, copy lint (word counts). Rule 4 must be defined per terminal and must ignore trunk ends, because trunks 1, 1-1 and 1-3 are legitimately shared by step and preset lines.
- [ ] Preset file = original `.e` minus step lines, comments kept, written to the session dir and passed as argv (replaces the static preset in #7).
- [ ] `GET /api/missions` and `GET /api/missions/{id}` return the compiled mission (config list with `owner`, steps with kind/from/to/family/choices, counts, units, run, checkpoints). A mission failing validation is `available:false` with a reason.
- [ ] `eniac-bridge mission check missions/*.yaml` and `eniac-bridge selftest` (boot preset, apply all steps, INIT x3 with idle waits, expect acc1=3 and acc2=9).

**Test notes**

- Drift test: change one byte of `sq.e`, the mission becomes unavailable.
- Counts equal 5 step cables, 2 step switches, 8 preset cables, 10 preset switches.
- Negative tests: duplicate line, missing line, step that touches a preset switch, choices not containing the value.

**References:** Architecture 5.9, 5.7; UX 8.1.2, 8.1.4; PRD FR-22, FR-24

#### #11 Session state machine and action whitelist

**ID:** M1-11 | **Labels:** story, area:bridge | **Estimate:** 8 pts | **Depends on:** #6, #7, #8, #10

The bridge's session: states, whitelist enforcement and mapping step IDs to `.e` lines. (Sized 8.)

**Acceptance criteria**

- [ ] States and transitions per architecture 5.5 (none, starting, setup, armed, running, result, failed). `start_mission` from any state ends the old session first.
- [ ] Whitelist per 5.6: `start_mission`, `apply_step`, `skip_setup`, `button` (init, clear), `set_speed`, `end_session`, `metric`, `ping`. `read` is rejected in M1.
- [ ] `apply_step` checks state is setup, the step belongs to the mission, is not already applied, and is next when `ordered`; writes the `.e` line, awaits the ack, then emits `step_applied` (with `assisted`, `remaining`). `skip_setup` applies remaining steps in file order then `setup_complete`.
- [ ] INIT and CLEAR are rejected with `BUSY` unless `run.state` is idle. `set_speed` accepts only names from the mission `speeds` table.
- [ ] A core error after a step or button is E-CORE-CMD and a session fault. Invariant: core config is always preset plus a prefix of step lines.
- [ ] Session emits `session`, `setup_complete`, `run`, `checkpoint` and `health` events. Orphan session reaped 30 s after the client is gone.

**Test notes**

- ws-client e2e: start Squares, apply 7 steps, 3 INITs, assert acc1=3 and acc2=9 in `state`.
- Reject: out-of-order step, repeated step, unknown step, INIT while busy, a `line`/command field smuggled into any message, newline in a step id.
- skip_setup after 3 manual steps applies the other 4.

**References:** Architecture 5.5, 5.6, 7; PRD FR-02, FR-14, FR-15, FR-33

#### #12 Raw metrics JSONL writer

**ID:** M1-12 | **Labels:** story, area:bridge | **Estimate:** 2 pts | **Depends on:** #11

Anonymous local event log (FR-60 raw part). Rollups, admin view and CSV export are M3.

**Acceptance criteria**

- [ ] Append-only monthly files `metrics/YYYY-MM.jsonl` (`O_APPEND`, fsync at session end and at least every 30 s). A truncated last line is skipped on read.
- [ ] Events per 8.3. UI events (`wrong_tap`, `step_done`, `speed`, `skip_to_answer`, `setup_skipped`, `idle_reset`) are whitelisted by name and field through the `metric` message. Bridge events (`mission_complete`, `error_enter`/`error_exit`, `core_restart`, `session_start`/`end`) are written by the bridge and cannot come from the UI.
- [ ] Random per-session `sid`, no IPs, device IDs or free text. Files older than `retentionDays` (400) deleted at startup.

**Test notes**

- Unit tests with a truncated file, a rejected event name and extra fields.
- Complete a Squares e2e run and check the expected event sequence.

**References:** Architecture 8.3; PRD FR-60, NFR-11

### (e) Web shell, SVG panels, lamp rendering

#### #13 Web shell: boot, ws client, state, router, touch guards, footer, tokens

**ID:** M1-13 | **Labels:** story, area:web | **Estimate:** 5 pts | **Depends on:** #2, #8

The front-end skeleton every screen hangs on.

**Acceptance criteria**

- [ ] `index.html` with CSP (`default-src 'self'; connect-src ws://127.0.0.1:8740`), `main.ts` boot (fetch missions, open ws, router), `Screen` interface.
- [ ] `net/ws.ts`: reconnect backoff 250 ms to 2 s, ping every 5 s, exposes link-down after 5 s (E-LINK signal; the screen is #24). A `hello.protocol` or `hello.build` mismatch calls `location.reload()`.
- [ ] `state/machine.ts`: pure RFC 7396 merge-patch apply and session tracking. The machine view only renders for the current `session.id` while `health.core == up`.
- [ ] `ui/guards.ts` (UX-06): touch-action none, contextmenu, selectstart, gesture*, drag and link navigation blocked, first pointer only, actions on release.
- [ ] Persistent footer 'ENIAC simulator by Brian L. Stuart, Drexel University' at 24 px on every visitor screen (FR-40). Top-left 120x96 holds the inert ENIAC wordmark (admin zone reserved, no handler in M1).
- [ ] Design tokens CSS (UX section 12), fonts Atkinson Hyperlegible and IBM Plex Mono bundled locally with OFL licenses (NFR-01). 1920x1080 stage scaled and letterboxed as one unit.
- [ ] Under `--dev` only, a `?mission=squares` query starts a session directly. It is stripped in release builds.

**Test notes**

- `node --test`: RFC 7396 merge-patch vectors, reconnect timing with fake timers, guard handlers.
- Playwright smoke: page loads against the real bridge, sends `ping`, footer visible, swipe and pinch events do nothing.
- Release bundle contains no fixture or demo data (checked in #25).

**References:** Architecture 9.2, 5.8 (no demo fallback); PRD FR-40, UX-05, UX-06, NFR-01

#### #14 SVG panel kit for the Squares units and ID grammar

**ID:** M1-14 | **Labels:** story, area:web, area:content | **Estimate:** 8 pts | **Depends on:** #13, #10

Original vector art (not the upstream photos) for the initiating unit, cycling unit, accumulator, constant transmitter and trunk rails, with the `lamp:`/`jack:`/`sw:` ID grammar. (Sized 8; art-heavy.)

**Acceptance criteria**

- [ ] `src/web/panels/*.svg` for initiating, cycling, accumulator (reused for a1 and a2), constant transmitter, data trunk rail and program trunk rail, in the palette and look of UX 6.1. `panels/README.md` documents the ID grammar.
- [ ] Every M1 lamp ID from architecture 6.1 exists: acc digit/sign/carry/rep/prog, cyc pulse/ccg/tenp/mode, init lamps, `ct.1..30`.
- [ ] Every Squares mission target exists: `jack:c.o`, `trunk:1`, `jack:a1.α`, `jack:a1.A`, `jack:a2.β`, `jack:i.io`, `trunk:1-1`, `jack:a2.6o`, `trunk:1-3`, `sw:c.j1`, `sw:a1.rp6`, plus the decoy neighbours each step window shows.
- [ ] Hit areas are separate transparent rects: jacks 88x88, dials 120x120 (UX 6.6), independent of drawn size. Lamps at least 12 px (14 px on the Workbench, 26 px in the run view, 52x38 pitch).
- [ ] A Go test parses the SVGs and asserts all required IDs from the compiled `squares` mission and the M1 lamp list.
- [ ] Nick approves the look at 1920x1080 before dependent stories finish.

**Test notes**

- The Go ID-coverage test above, run in `make test`.
- Playwright screenshot of each unit at 1x and at the L2 zoom, reviewed by eye.

**References:** Architecture 6.1, U9, 11.3 (SVG kit seam); UX 4.2, 6.1-6.3, 6.6, F3

#### #15 Lamp derivation and rendering

**ID:** M1-15 | **Labels:** story, area:web | **Estimate:** 5 pts | **Depends on:** #13, #14

MachineState to lit lamps, efficiently.

**Acceptance criteria**

- [ ] `lamps/derive.ts`: pure `unitLamps(unit, state) -> Set<lampId>` for every M1 rule in architecture 6.1, run only for units touched by the delta.
- [ ] `lamps/render.ts`: once per `requestAnimationFrame`, diff lit sets and toggle an `on` class only on changed nodes. The 80 ms neon decay is a CSS opacity transition.
- [ ] Lit style: amber #FFB000 with a 1.4x dot and glow. Unlit keeps a dark ring so the 10x10 grid reads.
- [ ] The renderer never invents state: with no session or core down it shows blank/unlit, never stored values.

**Test notes**

- Unit tests per lamp rule; exactly one lit lamp per accumulator digit column; cyc `ccg` and `tenp` boundaries (pos 22-36, odd pos < 20).
- Replay the `sq-3inits` golden frames through derive and assert acc1/acc2 lamps.
- Synthetic 50 toggles/frame at 30 Hz holds 30 fps in desktop Chrome (Pi measurement is spike #30).

**References:** Architecture 6.1-6.3; UX 6.2, 9.5; PRD FR-20, NFR-04

### (f) Guided-step UI

#### #16 Mission runner logic (taps, wrong-tap ladder, hit testing)

**ID:** M1-16 | **Labels:** story, area:web | **Estimate:** 5 pts | **Depends on:** #13, #10

The pure step state machine. Correctness is decided in the browser and only step IDs reach the bridge (FR-14).

**Acceptance criteria**

- [ ] `mission/runner.ts`: current step, source/destination arming for plug steps, dial + value for switch steps, done/assisted/skipped states.
- [ ] Wrong-tap ladder per UX 5.2, counted per step: #1 decoy hint, #2 thicker ring, #3 'Do it for me' becomes filled. Tap on empty or dimmed space is neutral and not counted. Right source with wrong destination snaps back and keeps the source armed.
- [ ] Hit testing: a tap within 16 px of the active target counts; decoys get the same tolerance; nearest active target wins (UX 6.6).
- [ ] Debounce: ignore a second tap within 400 ms and while an action is pending.
- [ ] Emits `apply_step` (with `assisted`) and whitelisted `metric` events; nothing else leaves the browser.

**Test notes**

- `node --test` ladder cases: wrong x1/x2/x3, right-source-wrong-destination, wrong switch value, empty tap, rapid double tap, tolerance edges.
- Verify via a ws spy that no wrong tap produces an `apply_step`.

**References:** Architecture 7, ADR-004; UX 5.2, 6.6; PRD FR-12-FR-15, UX-07

#### #17 Guided step stage: Workbench, jack windows, switch picker, guide choreography

**ID:** M1-17 | **Labels:** story, area:web | **Estimate:** 8 pts | **Depends on:** #14, #15, #16

What the visitor touches. (Sized 8.)

**Acceptance criteria**

- [ ] L1 Workbench: Init, Constant, Acc 1, Acc 2 cards at 300 px with 40 px gaps, data trunk rail on top, program trunk rail below, live lamp bands, and the permanent 'we moved these units next to each other' caption.
- [ ] L2 plug windows: two 620x620 windows (source left, destination right), jack clusters with real neighbours as decoys. Tap 1 arms the source and starts the destination ring; tap 2 animates the cable (600 ms) into the Workbench with data (#56B4E9, 8 px) and program (#CC79A7, 5 px, dash-dot) styles and end tags.
- [ ] L2 switch step: one window plus bottom-sheet picker of only the valid `choices` (120x120 buttons). The correct value is not pre-highlighted.
- [ ] Guide choreography per UX 4.3: frame (400 ms), 65% scrim, yellow pulsing ring with inner black line, numeral badge and chevron, leader line from the step card, label chip, off-screen edge arrow, 'Show me where' replay. Shape plus colour, never colour alone.
- [ ] Feedback states from UX 5.2 (check, X badge and shake, thicker ring) within 100 ms of touch.
- [ ] 'Reduce motion' config swaps zooms for cross-fades.

**Test notes**

- Playwright with touch events: complete steps 1 and 2 of Squares by tap; wrong jack then right jack.
- Every target at least 64 px in CSS and jacks 88 px (automated bounding-box assertion).
- Gloved and child tap testing is scheduled in M4; do a desk check with a 16 px offset tap now.

**References:** UX 4, 5.1, 5.2, 6.3, 7.3, 9.1; PRD FR-12, FR-13, UX-01, UX-02, UX-09

#### #18 Step rail and navigation: briefing, plan, step card, S5, Tell me more, Start over

**ID:** M1-18 | **Labels:** story, area:web | **Estimate:** 8 pts | **Depends on:** #11, #16, #17

The text and flow around the stage, wired to the session. (Sized 8.)

**Acceptance criteria**

- [ ] S3 briefing with a simple static room plan marking the four units (no live machine) and 'Let's go'; Step 0 'Here is the trick' with the two-box diagram; the 7 steps with headline 40 px, body 28 px.
- [ ] Step card actions by state (UX 5.1 table): Do it for me (outline, filled after 3 wrong), Next step, Finish wiring, Skip setup, Show me where. No auto-advance.
- [ ] 'Do it for me' and 'Skip setup, just run it' call `apply_step {assisted:true}` and `skip_setup`; both log metrics.
- [ ] S5 'The rest is done for you': all preset cables and dials animate from the compiled `config` (the state really exists in the core) with counters '8 cables, 10 switches' taken from `counts`; Continue appears at the end.
- [ ] Tell me more slide-over (up to 120 words, 1000x700) that pauses the idle timer for up to 2 min.
- [ ] Header: Missions (confirm only if at least one step done), progress dots, Start over (D1 confirm overlay then `start_mission`).
- [ ] All copy comes from the mission JSON, none hardcoded.

**Test notes**

- Playwright e2e on the Mac against the real core: complete Squares setup by touch only, then do it with 'Do it for me' on two steps, and with 'Skip setup' at step 3.
- Assert `step_applied` ordering and that `remaining` matches.

**References:** UX 3.2, 5.1, 5.3, 5.5, 7.3, 7.4, 8.1.4; PRD FR-14, FR-15, UX-10

### (g) Run and result screens

#### #19 Run view (S6): lamp grids, INIT/CLEAR, speed, captions, notebook tape

**ID:** M1-19 | **Labels:** story, area:web | **Estimate:** 8 pts | **Depends on:** #15, #18

Where the visitor watches the machine. (Sized 8.)

**Acceptance criteria**

- [ ] Two 10x10 lamp grids (Acc 1 'x' and Acc 2 'x squared') with sign and repeat lamps, 26 px lamps and row labels 0-9, helper readout in Plex Mono 72 px from `acc[n].value`.
- [ ] INIT (456x96, subtitle 'Initiating Pulse: the GO button') disabled with a spinner while `run.state` is busy; CLEAR (64 h); speed control Slow | Full (200x96 each); 'Skip to the answer'. Actions fire `button` and `set_speed`.
- [ ] Caption card driven by real lamp/checkpoint changes (UX 8.1.4 beats for presses 1-3), never a timer script. After press 3 the hint 'Want it faster? Try Full.' and the 'Show me what happened' button appear.
- [ ] Notebook tape built from `run.settled` values on each idle, never preset values.
- [ ] Does CLEAR really reset both accumulators for `sq.e`? `sq.e` has no `cc` switches. Verify on the real core; if it does not clear, raise it in the PR (see #33) and hide CLEAR until resolved.

**Test notes**

- Playwright e2e: 3 INITs show tape `1x1=1`, `2x2=4`, `3x3=9` and lamps match the `value` readout.
- INIT is unresponsive while busy (double tap sends one `b i`).
- Lamps stay blank if the core goes down mid-run.

**References:** UX 7.5, 8.1.4 (S6), 9.3; PRD FR-16, FR-17, FR-20, UX-07

#### #20 Autopress: 'Keep pressing for me' and 'Skip to the answer'

**ID:** M1-20 | **Labels:** story, area:web | **Estimate:** 3 pts | **Depends on:** #19

UI-side loops over the whitelisted INIT button (architecture 5.6, UX F2c).

**Acceptance criteria**

- [ ] `run/autopress.ts`: press INIT, wait for `run: idle`, read `settled`, repeat; stop when the mission `answer` checkpoint fires (Squares: acc1 = 12); never presses while busy; stops on session end, core fault or a Stop tap.
- [ ] 'Skip to the answer' first sends `set_speed full`, then runs the loop and moves to the result screen.
- [ ] Pacing is configurable; pick values after spike #33 (UX says about 2 squares/s in Full and 1 per 3 s in Slow; FR-17 says Slow shows 1-3 squares per second; these conflict, see notes).

**Test notes**

- `node --test` with a fake bridge: stops at checkpoint, never double presses, survives a dropped `run` event via timeout.
- e2e: Skip to the answer reaches 12 x 12 = 144 and the result screen.

**References:** Architecture 5.6; UX 8.1.4 S6; PRD FR-16, FR-17

#### #21 Result screen (S7): tape, explanation, takeaway, Next / Try again / Menu

**ID:** M1-21 | **Labels:** story, area:web | **Estimate:** 3 pts | **Depends on:** #19

End of the Squares mission.

**Acceptance criteria**

- [ ] Left: notebook tape from real readings (for example `1 x 1 = 1` through `12 x 12 = 144`). Right: 'You made a table of squares!', body, the takeaway strip 'The cables were the program.', Tell me more.
- [ ] Buttons: Next (only offered when the next mission is `available`; in M1 nothing follows Squares so show Menu as primary), Try again (`start_mission` squares, fresh core), Menu.
- [ ] Reaching the `answer` checkpoint is what marks `mission_complete` (bridge-side metric). Results screen can also be reached manually via 'Show me what happened'.

**Test notes**

- e2e: reach the result by both routes, Try again yields all lamps 0 and step 1 of 7.
- Metric `mission_complete` appears once.

**References:** UX 7.6, 8.1.4 (Result copy); PRD FR-21 (n/a), FR-60

### (h) Attract, idle and error states

#### #22 Start screen, waking screen and mission picker stand-ins (attract is M2)

**ID:** M1-22 | **Labels:** story, area:web, needs-decision | **Estimate:** 3 pts | **Depends on:** #18

Interim S1/S0/S2. No fake machine is drawn (no demo fallback).

**Acceptance criteria**

- [ ] S1 stand-in: dark screen, 'ENIAC, the room-sized computer of 1946. Now you program it.', 'Touch to program ENIAC' pill, credit footer. The first touch only leaves this screen and triggers no mission action (FR-31).
- [ ] S2 stand-in: shows only missions where `available: true`. Decision needed on whether the two not-yet-built missions appear as 'Coming soon' cards. Default if nobody decides: hide them.
- [ ] S0 'Waking up' spinner while the session is `starting` (3 s or less); the core is started on mission selection so the briefing hides the 1 s upstream sleep.
- [ ] About button is omitted until M2.

**Test notes**

- e2e: touch on S1 then a stray second tap never starts a mission. S0 never shows stale lamps.

**References:** UX 7.1, 7.2, 3.1; PRD FR-23, FR-31; Architecture ADR-002

#### #23 Inactivity timeouts, 'Still there?' overlay and session reset

**ID:** M1-23 | **Labels:** story, area:web | **Estimate:** 3 pts | **Depends on:** #18, #22

FR-32 and FR-33.

**Acceptance criteria**

- [ ] `idle.ts` uses `hello.config` (setupS 90, runS 180, countdownS 15). The running timeout applies while a computation is running or in the run view.
- [ ] S9 overlay (1000x520, countdown ring and number, 'I'm here' 480x120); any touch on it dismisses it. Expiry sends `end_session {reason:idle}` and returns to S1.
- [ ] Timers do not run on S1. Open 'Tell me more' pauses the timer (up to 2 min). No step has a time limit while a tap is pending.
- [ ] Reset means the next visitor sees a clean state (fresh core on next start; no leftover cables, tape or cards).
- [ ] `idle_reset` metric logged.

**Test notes**

- `node --test` with fake timers for all paths.
- e2e with `config.dev.yaml` set to short timeouts.

**References:** UX 7.8, 3.1; PRD FR-32, FR-33

#### #24 Error state (S10) and end-to-end recovery

**ID:** M1-24 | **Labels:** story, area:web, area:bridge | **Estimate:** 5 pts | **Depends on:** #7, #13, #22

No demo fallback, ever (FR-50). The error screen is the M1 exit criterion for the core-kill test.

**Acceptance criteria**

- [ ] S10 'ENIAC is resting. Please let a docent know.' with status code bottom-left and 'Trying to wake it up again... (n of 3)'. Static silhouette only: no lamps, no recorded runs, no cards.
- [ ] Triggers: `health.core = down`, ws disconnected over 5 s (E-LINK), no mission available (E-MISSION).
- [ ] After `final`, the body shows the staff instruction (5 taps top-left, PIN, Restart simulator). The PIN pad is M3, so in M1 the text is shown but the gesture does nothing; note that in the PR.
- [ ] Returns to S1 automatically on recovery without staff action (FR-51).
- [ ] `error_enter`/`error_exit` metrics with duration.

**Test notes**

- Playwright: `kill -9` the core mid-run goes to S10 within a few seconds, then back to S1 after recovery.
- `kill` the bridge (supervised manually): E-LINK after 5 s and recovery on restart.
- Assert the DOM contains no lamp elements with `on` class while S10 is shown.

**References:** UX 7.9; Architecture 5.8; PRD FR-50-FR-52

### (i) Model 4 install, uninstall and coexist-check

#### #25 Release build script and runtime-file closure

**ID:** M1-25 | **Labels:** story, area:deploy | **Estimate:** 5 pts | **Depends on:** #1, #10, #13

`make release` produces the tarball that install.sh consumes.

**Acceptance criteria**

- [ ] `scripts/build-release.sh` cross-compiles bridge and core for linux/arm64, bundles `web/` (esbuild production build), `missions/`, `deploy/`, `VERSION`, `SHA256SUMS`.
- [ ] Computes the runtime-file closure from the missions (M1: `programs/sq.e`) into `upstream/programs/...`; includes `upstream/.provenance.json`. `images/` and `obj/` are excluded.
- [ ] Release build fails if it finds `tests/fakecore`, fixtures, or the dev query param code path.
- [ ] Output `dist/eniac-kiosk-<ver>-linux-arm64.tar.gz`. Signing is M3; unsigned is acceptable in M1 and is marked so in the filename or manifest.

**Test notes**

- Untar and `bin/eniac-bridge selftest` on the Mac-built darwin variant; on the Pi in #29.
- Deliberately add a fixture: build fails.

**References:** Architecture 4.3, 10.1, 11.2; PRD NFR-01, NFR-12

#### #26 Model 4 install: systemd units, overlay, install.sh and manifest

**ID:** M1-26 | **Labels:** story, area:deploy | **Estimate:** 8 pts | **Depends on:** #25

Coexisting install (FR-80, FR-81). (Sized 8.)

**Acceptance criteria**

- [ ] `scripts/install.sh --profile test <release.tar.gz>` runs over SSH as `admin`. Read-only preflight aborts on any failure: arm64 and trixie, `chromium` present (never installed or upgraded), Model 4 X session found, ports 8740/8741 free, at least 300 MB free, no spaces in paths.
- [ ] Creates only: user/group `eniac`, `/opt/eniac-kiosk/...`, `/etc/eniac-kiosk/config.yaml` (test profile), units `eniac-kiosk-bridge.service` and `eniac-kiosk-overlay.service` (not enabled), wrapper `/usr/local/bin/eniac-kiosk` (start, stop, status, logs, selftest), and `borrow-xauth`.
- [ ] Never touches: `/home/kiosk`, `/etc/xdg/autostart`, the Model 4's units, `/etc/chromium*`, display/input/network/journald config, apt packages, cron, polkit, udev.
- [ ] Writes `INSTALL-MANIFEST.json` (every path, user, group, unit with sha256, `packagesInstalled: []`) and prints it.
- [ ] `eniac-kiosk start` opens our Chromium fullscreen above the Model 4's (flags on the command line only, tmpfs profile). `stop` leaves the Model 4 kiosk in front, unchanged. After a reboot nothing ENIAC runs.

**Test notes**

- Dry-run against a scratch directory on the Mac for path logic (shellcheck clean).
- On the Model 4: install, start, complete Squares, stop, observe the Model 4 kiosk undisturbed.

**References:** Architecture 3.5, 10.3; PRD FR-80, FR-81, R5

#### #27 Uninstall and legacy trial removal

**ID:** M1-27 | **Labels:** story, area:deploy | **Estimate:** 5 pts | **Depends on:** #26

FR-82 and gate G2.

**Acceptance criteria**

- [ ] `scripts/uninstall.sh` removes everything in the manifest (units then `daemon-reload`, dirs, user/group, wrapper, manifest last). It also works with no manifest, using an embedded canonical path list.
- [ ] Removes the legacy trial: kills `src/eniac -v`, `vis/eniactk` and `wish` processes owned by `kiosk`; deletes `/opt/eniac-simulator` and `/tmp/eniac.log`; notes `scripts/eniac-try.sh` artifacts.
- [ ] `--purge-trial-packages` removes `golang-go` and `tk` only after `apt-get -s remove` shows every affected package is on the allow-list (`golang-*`, `tk*`, `tcl*`, `libtk*`, `libtcl*`), then removes the listed auto-installed dependencies by name. Never a blanket `autoremove`.
- [ ] Reports what was removed, then runs `coexist-check.sh verify`.

**Test notes**

- Test on the Model 4 at the end of M1 and again before handoff (M4).
- Half-finished install (kill `install.sh` midway) is still cleaned up.
- Purge refuses if the simulation would remove anything off the allow-list.

**References:** Architecture 10.3; PRD FR-82, G2

#### #28 coexist-check.sh and the Model 4 reboot checklist

**ID:** M1-28 | **Labels:** story, area:deploy | **Estimate:** 3 pts | **Depends on:** #26

Prove the Model 4 kiosk is unchanged (FR-83, G3).

**Acceptance criteria**

- [ ] `scripts/coexist-check.sh snapshot|verify` run from the Mac over SSH: dpkg list, enabled and installed unit files, hashes of `/etc/systemd/system`, `/etc/xdg/autostart`, `/etc/chromium*`, `/home/kiosk` dotfiles and config (excluding the live Chromium profile and cache), listening sockets, users and groups, `/opt` listing, crontabs, polkit and udev dirs.
- [ ] Baselines are stored in the repo under `tests/coexist/baselines/`, never on the box.
- [ ] First snapshot is taken before our install and so includes the trial. `verify` after the final uninstall expects exactly the trial artifacts gone and nothing else changed. Document this in the script header.
- [ ] `tests/coexist/CHECKLIST.md`: the manual reboot check that the Model 4 comes up into its own kiosk.

**Test notes**

- Snapshot, install, start/stop, uninstall, verify: passes. Introduce a stray file: verify fails and names it.

**References:** Architecture 10.3, A5; PRD FR-83, G3

#### #29 M1 exit verification on the Model 4

**ID:** M1-29 | **Labels:** story, area:deploy | **Estimate:** 3 pts | **Depends on:** #20, #21, #23, #24, #27, #28

Run the PRD M1 exit criteria on the real hardware.

**Acceptance criteria**

- [ ] A person completes Squares start to finish by touch on the 15.6 in panel.
- [ ] `kill -9` the core mid-run: S10 appears, recovers to attract without anyone touching anything.
- [ ] Timed: fresh core ready in 3 s or less; touch feedback within 100 ms by eye (and by a recorded video if easy).
- [ ] `uninstall.sh --purge-trial-packages` then `coexist-check.sh verify` passes and the Model 4 reboots into its own kiosk (checklist signed in `tests/coexist/CHECKLIST.md`).
- [ ] Results and any defects are filed as issues. Schedule the Model 4 window with the museum first (see doc notes: R5 has no scheduled test window).

**Test notes**

- The steps themselves are the tests. Record a short screen capture for the PR.

**References:** PRD section 10 (M1), Architecture 12.1

### (j) Spikes

#### #30 Spike S1 (R3): Pi 5 CPU and fps at full speed with Chromium rendering

**ID:** M1-30 | **Labels:** spike, area:bridge, area:web | **Estimate:** 5 pts | **Depends on:** #4, #15, #26

Does the Pi 5 hold 20 fps and stay cool for sieve-like and trajdemo load?

**Acceptance criteria**

- [ ] `eniac-bridge bench` runs a program at `cy.rate 0` and samples CPU, RSS, status line rate and temperature.
- [ ] Matrix: sieve-like load (run `sieve.e` at the pinned commit even though it misbehaves, or a synthetic all-20-accumulator page) and trajdemo at `GOMAXPROCS` 1, 2 and 4, with Chromium rendering a page with every accumulator lamp grid.
- [ ] Report in `docs/spikes/S1-pi-performance.md`: fps, CPU per process, `vcgencmd get_throttled`, temperature, recommended `GOMAXPROCS`/nice, and whether `full` must be capped.

**Test notes**

- Time-boxed to 2 days. The output is a measured recommendation, not code beyond `bench`.

**References:** Architecture 12.1 (S1), U10, A2; PRD R3, NFR-04, NFR-08

#### #31 Spike S2 (R4): trajdemo part-by-part INIT and fast-forward

**ID:** M1-31 | **Labels:** spike, area:bridge | **Estimate:** 3 pts | **Depends on:** #4

Can FR-19 (INIT per part, fast-forward within a part, skip to trajectory) work against the real program?

**Acceptance criteria**

- [ ] Load `trajdemo.e` with its self-starting tail (`b c`, `b r`, `b i`) withheld, using `demo.card` from the core's cwd and the `l drag.e` include.
- [ ] Document: what each INIT does (one part each?), how long each part takes at various `cy.rate`, whether changing `cy.rate` mid-run is safe, whether parts can be skipped, and what the captions can be keyed on.
- [ ] Report in `docs/spikes/S2-trajdemo.md` with the answer to the R4 fallback (unthrottled plus condensed caption) and inputs to the M2 withheld-lines design.

**Test notes**

- Time-boxed to 1 day.

**References:** Architecture U6, A8, 12.1 (S2); PRD FR-19, R4; UX 8.3

#### #32 Spike S3 (U1): sieve.e function-table regression triage

**ID:** M1-32 | **Labels:** spike, upstream, area:bridge | **Estimate:** 3 pts | **Depends on:** #1

Give Stuart a minimal repro and find out if a small patch exists. Feeds #34 and #36.

**Acceptance criteria**

- [ ] Reproduce: at `c4b94f2` and `f611c7f`, `sieve.e` runs away (`ftr` keeps increasing, 0 cards in 40 s); at `f611c7f~1` it punches 35 cards in 20 s.
- [ ] Minimal repro script committed under `docs/upstream/`, and the smallest failing program if one can be made.
- [ ] Assess whether a small patch to `src/ft.go` (or the code touched by 'Rework function table code') fixes `sieve.e` without changing other programs. Verify against `sq.e` and `trajdemo.e` if a patch is found.
- [ ] Report in `docs/spikes/S3-sieve-regression.md`, with a recommendation for #36 and a draft bug text for #34.

**Test notes**

- Time-boxed to 1.5 days. If a patch is found, it is proposed, not applied (NFR-12 allows only the mult patch).

**References:** Architecture U1, A1, 4.4; PRD R2

#### #33 Spike S4: Squares slow-rate tuning, idle-detector soak, CLEAR behavior on the Pi

**ID:** M1-33 | **Labels:** spike, area:bridge | **Estimate:** 3 pts | **Depends on:** #6, #11, #26

Validate the speed presets and the idle signal on the real hardware.

**Acceptance criteria**

- [ ] Tune `slow.rate` (architecture's 100 is a guess) so Squares shows readable successive values; record what FR-17 and UX-8.1.4 pacing mean in presses per second and pick one.
- [ ] Known-answer soak on the Pi: 50 presses at each preset, all idle declarations correct; check `time.Sleep` granularity effect at high rates (A3).
- [ ] Confirm sq.e computes one square per INIT on the Pi (UX F1; already verified on macOS).
- [ ] Determine what `b c` (CLEAR) does with `sq.e`, which has no `cc` switches.
- [ ] Report in `docs/spikes/S4-squares-speed.md` with final values for `squares.yaml`.

**Test notes**

- Time-boxed to 1 day on hardware.

**References:** Architecture 5.6, A3, A4; UX F1; PRD FR-17

---

## 5. Non-code tasks

### #34 Report the mult.go and sieve regression bugs to Stuart and ask permission to publish

**ID:** TASK-01 | **Milestone:** M1 | **Labels:** chore, upstream | **Depends on:** #32

Non-code. Nick sends it (nobody sends on his behalf). This covers PRD R1, R2 and gates G5 and G6.

**Acceptance criteria**

- [ ] Draft in `docs/upstream/` with two issues: (1) `src/mult.go:66` `"%2d "` breaks space-split parsing and crashes `eniactk` at `eniactk.go:785`, fix `Sprintf("%d ", stage)` with the diff and repro; (2) sieve regression from 'Rework function table code' (repro and findings from #32).
- [ ] The same message asks Stuart's permission for: publishing a fork or repo containing his code, shipping a redistributable image, and using `images/` photographs. Ask whether he wants to add a license.
- [ ] Decide the channel (GitHub issue on `blstuart/eniac-simulator` or email via his Drexel page) and record the send date and his reply in `docs/upstream/STATUS.md`.
- [ ] Send the mult.go report without waiting for #32 if the sieve repro is more than about two weeks out; do not hold one for the other.
- [ ] G6 is met when the mult.go report is sent; G5 when permission is received or confirmed unnecessary.

**Done when**

- Done when the send is recorded and STATUS.md names who follows up on a reply.

**References:** PRD R1, R2, G5, G6, Q5, Q11

### #35 Fact-check all [FC] claims and get Doug Crawford's copy approval

**ID:** TASK-02 | **Milestone:** M2 | **Labels:** chore, area:content | **Depends on:** none

Non-code. Required before the floor (FR-22, FR-41, R6). Squares claims are needed first and can be done during M1.

**Acceptance criteria**

- [ ] Extract every [FC] item from the UX spec (8.1 Squares first, then 8.2, 8.3, 7.10 About) into `docs/content/fact-check.md` with claim, location, status, source and approved wording.
- [ ] Claims include: public demo on Feb 15, 1946; about 18,000 vacuum tubes; 20 accumulators of 10 digits; one addition in 1/5,000 second; 'setup took days'; 97,367 x 5,000 = 486,835,000 (arithmetic checks); Lehmer July 1946 sieve runs and De Mol/Bullynck's reconstruction; the trajectory demo duration ('about 30 seconds' versus days by hand); the claim that units are 'far apart' on the real ENIAC; Stuart's 'faster than multiplying' note.
- [ ] Route to the vcf-museum Fact-Checker. Doug Crawford approves About wording; decide Q10 (credit the ENIAC programmers).
- [ ] Approved wording is folded back into the mission YAML and UX copy; copy lint still passes.

**Done when**

- Done when every [FC] line has status approved or removed.

**References:** UX F7; PRD FR-22, FR-41, R6, Q10

### #36 Decision: second local patch for Primes versus waiting for Stuart

**ID:** TASK-03 | **Milestone:** M2 | **Labels:** chore, needs-decision, upstream | **Depends on:** #32

Non-code. Nick decides. PRD NFR-12 allows only the mult.go patch and the Primes mission is blocked by U1.

**Acceptance criteria**

- [ ] Inputs: spike #32 result, Stuart's reply to #34 if any, and the schedule.
- [ ] Options: (A) wait for an upstream fix (Primes slips, M2 ships Squares + Trajectory first); (B) accept a second local patch for the function-table regression (amend NFR-12 and the PRD, patch goes into `patches/series`); (C) pin to `f611c7f~1` and re-apply the mult patch (loses later upstream work; needs a review of what else changed); (D) cut Primes from v1.
- [ ] Recommendation: start with #32. If a small, targeted patch exists and is sent upstream with #34, take (B); otherwise (A) with Trajectory built first. Avoid (C) unless the diff review is clean.
- [ ] Record the decision as a PRD revision note and in `upstream.lock`/`patches/` if (B) or (C). Update the Primes epic accordingly.

**Done when**

- Done when the decision is written in the PRD revision history.

**References:** Architecture U1, A1, 4.4; PRD NFR-12, R1

---

## 6. Epics M2-M5 (epic level only)

Stories are cut when each milestone starts, using M1 results and the spike reports.

### #37 EPIC M2: All missions

- Punch messages and the card output pane (FR-06, FR-21); READ flow and withheld lines (`b r`, `b i`) in the mission format
- Included-file step rewriting (`l drag.e`) and MP/FT/multiplier/printer lamp sets, catalogs and SVG panels
- Mission definition format finalized (FR-24); `primes.yaml`, `trajectory.yaml`, `attract.yaml`; confirm the F8 candidate steps line by line
- Trajectory mission with part-by-part INIT, fast-forward and skip (using spike #31)
- Primes mission, blocked on decision #36 and spike #32
- Live attract session (FR-30) with a true caption; S8 finale; About screen with local QR and credits (FR-41)
- Mission picker with all three missions and the suggested order (FR-23)
- Fact-checked text (#35) in all missions
- Exit: all three missions meet FR-10 length targets and NFR-04 (20 fps)

### #38 EPIC M3: Operable

- Admin gesture (5 taps), PIN pad and admin screen (S12, S13), admin API, polkit rules
- sd_notify watchdog, LAN health endpoint :8741 with Pi temperature and throttling, client-staleness display restart
- Metrics rollups and CSV export to USB (FR-60, FR-61)
- Signed release, USB update and one-tap rollback (FR-73), release key handling
- Production display unit (xinit + Chromium, Cage fallback spike), nightly 03:00 timer, boot-to-kiosk hardening (NFR-02, 60 s)
- 7-day soak test (`tests/soak`, NFR-05); power-cut recovery
- Docent demo mode (FR-75, P2)
- Exit: NFR-02, NFR-05, NFR-07 pass on the test box

### #39 EPIC M4: Production hardware and handoff

- Dedicated Pi 5 procurement and decisions (Q2, Q3); mounting and placement
- `provision-prod.sh` and a documented repeatable install from a fresh Pi OS trixie image
- Usability test (NFR-09: 5 testers incl. a child 8-12, an adult over 65, a gloved session; 4 of 5 complete Squares unassisted)
- Runbook (OT-2), recovery sticker (OT-3), museum-held credentials and release keys (OT-4), code and release location (OT-5, Q5), named museum owner (OT-1, Q1)
- Handoff drill (OT-6): cold boot, forced core crash recovery, update and rollback by staff
- Remove ENIAC and the trial from the Model 4 using #27 and #28 and verify it (G2, G3)
- Resolve R1 or confirm no permission is needed (G5, #34); G6 met
- Exit: G1-G7 all pass

### #40 EPIC M5: Floor trial

- Two-week floor trial with on-box metrics reviewed against PRD 1.5 targets
- Fixes and content tweaks found in the trial
- OT-7: no Nick intervention needed, museum owner signs off
- Delete `scripts/eniac-try.sh` after G2; archive the dev key per OT-4

---

### Original UI switch (2026-10-07, branch `original-ui-switch`)

Built in one pass from `docs/original-ui-switch.md` and UX 7.11/7.12 while Nick was at the museum. It pulls part of M3's admin forward (#38): the 5-tap counter, S12 PIN pad, a three-button S13 (Restart simulator, Original UI, Return to kiosk), the admin API (`login`, `logout`, `restart-core`, `original-ui`) with a bcrypt PIN file and no default PIN, plus the visitor's **Original room tour** tile in Explore. Underneath: `internal/uiswitch` (request files in `/run/eniac-touch-kiosk-ui`), the kiosk-session watcher, `deploy/kiosk/original-ui` (supervisor), `original-ui-back.tcl` (Back to kiosk + idle), `openbox-rc.xml`, `tk` in the installer, `original-ui/` in the release (eniactk from the pinned export, images 1280 and 1900). Tests: Go units (uiswitch, admin, decode, config, session, recovery reset, metrics), `tests/web/{tapcount,pinpad}.test.ts`, `tests/deploy/test-ui-switch.sh` (in `make test`), the container rehearsal's original-UI checks. Still M3: health tiles, metrics view, restart-app, reboot, update, Change PIN on S13 (Q-OUI-3).

---

## 7. Under-specified or conflicting items in the docs

Raised while planning; each is folded into the named story where it can be, and otherwise needs an owner.

| # | Item | Where | Handling |
|---|---|---|---|
| 1 | **Step/preset overlap rule is wrong as written.** Validation rule 4 says no preset line may touch the same jack or switch as a step. Trunks 1, 1-1 and 1-3 are shared by step and preset lines in `sq.e`. | Architecture 5.9.5 | #10 defines it per terminal, excluding trunk ends. Architecture needs a one-line fix. |
| 2 | **Greek versus ASCII in `.e` text.** UX 8.1.1 lists `alpha`/`beta`; architecture 5.9.4 shows `α`/`β`. Mission `line` must match the file exactly. | UX 8.1.1, Architecture 5.9.4 | #9 canonicalizes and checks the real file. |
| 3 | **Mission schema has no home for** the briefing, plan step, S5 text, run-rail captions (lamp-triggered) and result copy. | Architecture 5.9.2 | #10 adds a `content:` block and amends the architecture. |
| 4 | **Slow-speed pacing conflicts.** FR-17: Slow shows 1-3 squares per second. UX 8.1.4: keep pressing runs about 1 square per 3 s in Slow. Architecture's `slow.rate: 100` is an untuned guess (about 0.6 s of pure addition per press). | PRD FR-17, UX 8.1.4, Architecture 5.9.2 | Decided by spike #33; autopress (#20) pacing follows. |
| 5 | **CLEAR may do nothing for `sq.e`.** UX says CLEAR resets both accumulators, but `sq.e` sets no `cc` switches. `b c` may not clear accumulators. | UX 7.5, 8.1.4 | Verified in #19/#33; hide CLEAR if it does not work. |
| 6 | **Panel art has no source or owner.** There is no jack geometry upstream (U9) and no named reference for where jacks and dials sit on the real initiating, constant and accumulator panels. Who draws the kit, and to what reference? | Architecture U9, UX 6.1 | #14 is sized 8 and requires Nick's look-and-feel approval. The real-panel reference must be named in the PR (upstream docs, `example.tex`, photos for layout only). |
| 7 | **L0 room plan and minimap.** UX S3 needs a room plan with the four units flagged, and the attract view needs a perspective room. Neither has geometry or art defined. | UX 4.1, 4.4, 7.1 | M1 gets a simple static plan in #18 (no minimap, no look-around). Real L0 and attract are M2. Confirm this reduction. |
| 8 | **M1 mission picker with one mission.** FR-23 says all three are unlocked, but only Squares exists and architecture says the UI must not offer unavailable missions. | PRD FR-23, Architecture 5.7 | #22 defaults to showing available missions only; flagged `needs-decision` (Coming-soon cards or hidden). |
| 9 | **FR-52 versus the gesture.** PRD FR-52 says 'hold' the corner in places; UX F5 already flags it. Also, the S10 staff instruction points to a PIN pad that does not exist until M3. | PRD FR-52, UX F5 | #24 shows the text but the gesture is inert in M1. PRD owner to fix FR-52 wording. |
| 10 | **Go toolchain.** `go.mod` needs 1.26; this Mac has 1.25.5; trixie has 1.24. `upstream.lock` has a placeholder `go1.26.<n>`. | Architecture U8, 4.1 | #1 pins a real 1.26.x. Needs network on first build. |
| 11 | **No test window on the Model 4.** PRD R5 says test only when not needed on the floor but gives no schedule, access or who to ask (SSH is `admin` on .36/.37). | PRD R5 | Get a window agreed before #26. |
| 12 | **Release signing not in M1.** Unsigned tarballs until M3; key custody (OT-4) is unassigned until M4. | Architecture 10.1 | #25 marks builds unsigned. |
| 13 | **Verified facts to reuse, not re-derive.** `sq.e` computes one square per INIT (verified 1/1, 2/4, 3/9; UX F1 is resolved by the architecture). Prime count 3..2801 is 407 (recomputed here). | UX F1, UX 8.2 | No action; #33 only reconfirms F1 on the Pi. |
| 14 | **Sieve blocks Primes.** Architecture U1: `sieve.e` does not run at `c4b94f2`, and NFR-12 allows only one patch. | Architecture U1, PRD NFR-12 | #32 (triage), #34 (report), #36 (decision). |
| 15 | **Estimate basis.** No team size, velocity or target date was supplied, so no sprint plan or calendar is included. | PRD | Provide these and the plan can be cut into sprints. |

