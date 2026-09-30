# Test Plan: ENIAC Touch Kiosk

**Version:** 0.1
**Last Updated:** 2026-09-30
**Author:** Nick DeMarco with AI assistance (qa-strategy agent)
**Status:** Draft for review
**PRD Reference:** `docs/PRD.md` v0.1
**Architecture Reference:** `docs/architecture.md` v0.1 (section 11.3 testing seams, 5.1 wire format, 5.8 errors, 10.3 coexistence)
**UX Reference:** `docs/ux-spec.md` v0.1 (sections 5.2 wrong-tap ladder, 8.1 Squares script)

Scope note: this plan defines what is tested, how, where it runs, and when a milestone may exit. It does not create issues. The dev plan (`docs/dev-plan.md`) owns scheduling and issue breakdown. Test IDs below (for example `M1-07`) are stable so the dev plan can reference them.

---

## 1. Strategy in one page

This is one kiosk, one developer, one museum. The risk is not scale. The risks are:

| # | Risk | Why it matters | Main defence |
|---|---|---|---|
| Q1 | The screen shows something that is not what the core is doing (stale lamps, canned data) | Violates the no-demo-fallback rule. It is the project's core promise. | Real-core e2e, oracle comparison, kill tests, fixture-free bundle check |
| Q2 | A visitor can't operate it (gloves, kids, small targets) | Whole point of the product | Automated touch-target audit plus a scripted manual session |
| Q3 | Wire-format quirks crash or corrupt the mirror | The core prints odd lines (see section 3.2) | Golden streams from the real core, fuzzing |
| Q4 | It falls over on the floor, unattended, for weeks | No developer on staff | Fault-injection (fake core), 7-day soak, power-cut drill, handoff drill |
| Q5 | Dev and test on the Model 4 kiosk disturbs a live exhibit | FR-80 to FR-83, G2, G3 | Snapshot/diff coexistence check in every install cycle |
| Q6 | A wrong historical claim on the floor | R6 | Content fact-check gate |
| Q7 | Upstream (no license, changing) breaks us | U1 (sieve already broken at the pin), NFR-12 | Pinned commit, mission drift checks, a sieve canary |

Principles: test against the real core wherever it is cheap (it is pure Go and runs on the Mac); use a fake core only for faults the real core can't produce on demand; keep the automated suite under about 10 minutes for the PR loop; put slow and hardware-bound checks on a nightly, pre-release or once-per-milestone schedule; every automated check has a named pass threshold.

---

## 2. Test pyramid and tools

```
                     Manual: gloves + kids, docent, handoff drill        (few, per milestone)
                  Device: Pi 5 perf, throttling, soak, power-cut, coexist (few, scheduled)
               E2E: Playwright + real bridge + real core, touch 1920x1080   (~25 tests)
            Web unit (node --test) + Bridge integration (fakecore, real core) (~100)
        Go unit: status parser, mirror, idle detector, mission, econfig, session (hundreds, fast)
```

| Layer | Tool | Scope | Target | Runs |
|---|---|---|---|---|
| Go unit and table tests | `go test`, `-race` on the bridge (never on the core build), `go test -fuzz` | `internal/status`, `machine`, `econfig`, `mission`, `session`, `protocol`, `core` supervisor | Statement coverage: 90% or more on `status`, `machine`, `mission`, `econfig`; 80% or more on `session` and `core`. Coverage is a smoke alarm, not a goal. | Every PR |
| Golden stream replay | `go test` + `tests/golden/` | Parser and mirror against recorded real-core output | All goldens pass; re-recorded on every upstream bump | Every PR |
| Fake-core fault injection | `go test` + `tests/fakecore` | Watchdog, backoff, retry budget, hang and garbage handling | Every row of architecture 5.8 has a test | Every PR |
| Real-core headless | `go test -tags realcore` (skips if `build/upstream/eniac-core` is missing) | Squares known-answer, idle detector at each speed, startup race regression | See section 3.4 | PR (short), nightly (long) |
| Mission and SVG contract | `eniac-bridge mission check`, Go test that parses `panels/*.svg` | `.e` integrity, every step and lamp ID exists in the art | Zero errors | Every PR |
| Web unit | `node --test tests/web`, `tsc --noEmit` | `machine.ts`, `lamps/derive.ts`, `mission/runner.ts`, `run/autopress.ts`, `idle.ts`, `ui/guards.ts` | 90% or more line coverage on these pure modules | Every PR |
| E2E | Playwright (Chromium, `hasTouch`, viewport 1920x1080, `deviceScaleFactor` 1) against a bridge and real core launched by the test | Visitor flows, errors, idle, touch rules | M1 list in section 4 | PR (smoke subset), nightly (full) |
| Touch and a11y audit | Playwright + `axe-core` + custom audit | Every screen and state | Section 7 | PR |
| Monkey test | Playwright random-tap driver (10 min) | Robustness to mashing | No console error, no navigation, no duplicate INIT, app still responsive | Nightly |
| Device suite | Shell + Playwright over CDP + samplers | Pi 5 performance, coexistence, soak, power-cut | Sections 9 to 12 | Scheduled, on hardware |
| Manual | Written script | Gloves, children, docent | Section 14 | Before M2 exit (dry run), before floor (formal) |

**Frameworks chosen to match the architecture** (Go 1.26, vanilla TypeScript, Node is dev-only): no new test framework beyond Go's own, `node --test`, and Playwright. No Jest, no Cypress.

### 2.1 Touch emulation rules (apply to every e2e test)

- Launch Chromium with `hasTouch: true`, `viewport: 1920x1080`, and `hover: none`/`pointer: coarse` media emulation so any `:hover`-dependent CSS is exercised as it would be on the panel.
- Use `page.touchscreen.tap()` for ordinary taps. Use CDP `Input.dispatchTouchEvent` (touchStart, pause, touchEnd) for the cases that need timing or multi-touch: fires-on-release (UX-03), first-touch-only (UX-06), long-press, swipe, pinch, and 400 ms debounce (UX-07).
- Never use `element.click()` or mouse events in visitor-flow tests. They bypass the touch path.
- The test launches the bridge itself, so it can capture the bridge's log. **Requirement on the bridge:** log every core-stdin write at debug level in a stable, parseable form (for example `core< p c.o 1`). Tests assert on this log to prove "nothing reached the core" for wrong taps. No dev-only API is needed.

### 2.2 The reference-core oracle

To check that lamps match the core without trusting the bridge or UI, the e2e harness runs its own independent headless core with the same preset and the same number of INITs, then parses its `d a 1` and `d a 2` dump. That is the ground truth. It is compared with: the `value` in the websocket `state`/`frame`, the decoded DOM lamps, and the on-screen helper readout. Where the core can't be stepped in lockstep (full speed), compare at settle points (`run: idle`) only.

---

## 3. Bridge and protocol tests (Go)

### 3.1 Test doubles

| Double | What it is | Where it may be used |
|---|---|---|
| Real core | `build/upstream/eniac-core` built from the pinned commit plus `patches/` | Everywhere |
| Unpatched core | Same pin, `mult.go` patch **not** applied | Golden recording for the `m` double-space quirk only |
| `tests/fakecore` | Go program speaking the same stdin and status protocol, with scripted behaviour | Fault tests. **Never shipped.** |

`make release` fails if fakecore, golden files or test fixtures appear in the release tree, and a separate check greps the web bundle for fixture markers (see `M1-18`).

### 3.2 Golden status streams and wire quirks

`eniac-bridge record` captures the raw vlink stream **and** the core's final `d` dump **and** the punch file from the same run. Each golden is replayed through `status.Parse` and `machine`, and the final MachineState is compared with the dump.

| Golden | Source run | Why it exists |
|---|---|---|
| `sq-cold-3inits` | Squares, rate default, 3 INITs | Main path: digits, carries, programs, cycle, init, constant transmitter |
| `sq-12inits` | Squares to x=12 | Longer mirror drift check. Final: acc1 = 12, acc2 = 144 |
| `neg-sign` | Test-only 3-line `.e` using the S (subtract) jack so an accumulator goes negative | Sign digit `M`. Authored once, recorded once |
| `traj-unpatched-m` | trajdemo first 30 s, **unpatched** core | `m` lines with the `%2d` double-space |
| `traj-patched-m` | trajdemo first 30 s, patched core | `m` lines with the `%d` format, plus `mpi`, `ftr`, punch |
| `traj-punch` | trajdemo through the squares-and-cubes table | Punch payloads with spaces, in order, vs the punch file |
| `idle-attract` | Core loaded, no INIT, 30 s | `cy` noise only; coalescer must not flood |
| `sieve-canary` | `sieve.e` at the pinned commit, 40 s | **Expected to fail today (U1):** no cards punched and `ftr` runaway. Marked `xfail` with the U1 reference. When upstream is fixed or patched, the test flips to a required pass and is the M2 Primes entry gate. |

**Quirk assertions (each is a named table test plus at least one golden line):**

| Quirk (architecture U7 / 5.1) | Assertion |
|---|---|
| Sign digits: `ad u 0 0` is P, `ad u 0 3` is M | Sign decoded; `value` = digits for P, digits minus 10^10 for M (`neg-sign`: a known negative decodes to the right value). Any V outside 0 to 9 is dropped with a reason. |
| Unit numbers 0-based on the wire, 1-based in `.e` | `ad 0 …` updates acc **1**, `ad 1 …` updates acc **2**, `ad 19 …` acc 20; `ad 20 …` is dropped; there is no acc "0" key. Same for `ft` (0 to 2 maps to 1 to 3). Column D=1 is the most significant decade. |
| `mpi S 250` means `*` | `mp.inff` holds `*` at S, not a number; the `lamp:mp.s.S.in` rule treats it as lit |
| `m` has a double space when stage is below 10 | `m  0 …` and `m 10 …` both parse; result equals what the patched format gives for the same state; unpatched and patched goldens produce identical mult state |
| `punch` payload with embedded spaces | Payload is `line[6:]`, unsplit, 80 chars, 16 fields of 5 chars, leading and trailing spaces preserved. Concatenated payloads equal the core's punch file byte for byte (oracle). Order preserved. |
| `ftr` is signed and starts at -3 | Negative ring parsed; `lamp:ft.U.ring.K` with K = ring + 3; out-of-range ring (U1 runaway) draws no lamp and does not crash |
| `cy` changes almost every tick, even when idle | Coalescer emits cycle-only frames at no more than 30 Hz; idle detector ignores cycle-only change |
| `refresh` does not re-send `init` or `cy 0` | Mirror defaults equal `engine.go`'s initial "last sent" values. A test pins the defaults to the pinned upstream source. |
| `ad` sign lines only on change | A long stream never loses a sign flip (replay property) |

**Fuzz and garbage (FR-04):** `go test -fuzz` on `status.Parse` and the `.e` tokenizer: 60 s per target in the PR run, 10 min nightly. Corpus seeds: every golden line plus hand-made nasties (empty, NUL bytes, CRLF, 1 MB line, truncated mid-token, non-UTF-8, absurd numbers). **Pass:** never panics; every rejected line yields a `Drop{reason}`; log rate limiting holds (at most 10 per minute).

### 3.3 Mirror, coalescer, protocol

- **Property test:** `snapshot(t0)` plus all emitted merge-patches equals `snapshot(tN)`, under random tick timing and a slow client that forces merging. Arrays never appear in patches.
- **Backpressure:** a client that stops reading never blocks the core reader (the status pipe is always drained); its next frame is a merged delta; `punch` messages keep order with no loss up to the 5000 bound; past the bound the session faults with `E-CORE-DOWN` rather than dropping cards silently.
- **Whitelist conformance (FR-02, NFR-10):** drive the websocket with garbage: unknown `t`, malformed JSON, oversized frames, unknown and repeated step IDs, step IDs containing newlines or core syntax (`x\nq`), buttons in the wrong state, a wrong `Origin`. **Pass:** each yields the documented `error` code (`BAD_MESSAGE`, `UNKNOWN_STEP`, `BAD_STATE`, `BUSY`, `NOT_ALLOWED`) or a rejected upgrade, and **every byte the bridge writes to core stdin matches the allow-list in architecture 5.2** (asserted by regex over the fakecore stdin log across the whole test run). `l`, `R`, `f r`, `q` from a client, or free text, must never appear.
- **Protocol drift:** `protocol.gen.ts` regenerated in CI must equal the committed file. JSON fixtures recorded from a real session validate on both sides. `hello.build` mismatch triggers a page reload (tested in e2e).

### 3.4 Real-core headless tests (`-tags realcore`)

| Test | Pass |
|---|---|
| Squares known answer | After 3 INITs: acc1 = 3, acc2 = 9. Same for INITs 1 to 12: acc2 = n squared |
| Idle detector at every speed preset (`slow`, `full`) | 50 INITs, each one declares `idle` only when the settled value is correct; no early idle, no missed idle |
| Startup race regression (U2) | 100 back-to-back cold starts with the preset passed as argv: zero hangs. The bridge never sends `l` on stdin (covered by the allow-list test) |
| Preset integrity | Preset plus the 7 step lines, in any order the UI allows, yields a core that passes the same known-answer test; preset alone with 0 steps produces no error output |
| Teardown | After every session, no core or vlink process remains (`pgrep`), and the session directory is gone |

### 3.5 Supervisor and recovery (fakecore)

Fakecore modes from architecture 11.3: `exit-after`, `hang-stdin`, `silent-status`, `garbage`, `error-on-command`, `slow-start`. Add `vlink-drop` (socket closes while the core lives), `stale-token` (a leftover core tries to feed a new session), `flood` (status faster than the client can read) and `huge-punch`.

| Fault | Expected code and behaviour |
|---|---|
| `slow-start` over 5 s | `E-CORE-START`; session `failed`; retry |
| Load error text before the prompt | `E-CORE-CMD` |
| `exit-after` N ms | `E-CORE-DOWN` immediately; process group killed |
| `hang-stdin` | `E-CORE-DOWN` (`hang-cmd`) within 1.5 s of the missed ack |
| `silent-status` in continuous mode | `E-CORE-DOWN` (`hang-status`) after 2 s |
| `error-on-command` after a step | `E-CORE-CMD` and session fault. The config must never diverge silently |
| `garbage` | Lines dropped, rate-limited log, session survives |
| `vlink-drop` | `E-CORE-DOWN` |
| `stale-token` | Connection rejected; no state change in the new session |
| Backoff and budget (injected clock) | Retries at +2 s, +5 s, +10 s; 3 attempts in 5 min then `health.final` with `E-RETRY-BUDGET`; quiet retry every 10 min afterwards; three failures spaced more than 5 min apart do **not** exhaust the budget; a successful probe session resets the count |
| Recovery | `health core:"up"`; old visitor session is **not** resumed; a fresh session is required (FR-33) |

---

## 4. M1 acceptance: Squares end to end

Runs on the Mac first (real bridge, real core, Playwright touch at 1920x1080). The whole list is then re-run against the Model 4 box for M1 exit (section 8), with the caveat in 9.3 that Playwright over an SSH tunnel drives the Mac's browser against the Pi's bridge and core. It proves the Pi-side bridge and core, not the Pi render path.

Harness: test launches its own bridge (dev config, shortened timeouts only where stated), captures the bridge's debug log, runs the reference-core oracle (2.2), and starts from `start_mission squares`.

**Squares step IDs** (from architecture 5.9.4): `j1-one`, `const-to-trunk1`, `trunk1-to-a1`, `a1-to-a2`, `a1-twice`, `init-to-1-1`, `a2-6o-to-1-3`.

| ID | Test | Key assertions |
|---|---|---|
| M1-01 | **Fresh-core start** | From Start tap to step 1 card: 3 s or less (NFR-03). Bridge log shows a new PID and the preset as argv. Preset holds exactly the 18 preset lines (8 cables, 10 switches). Step count reads "1 of 7" |
| M1-02 | **Happy path: all 7 steps by touch** | Each step is completed with correct taps only (switch: tap dial, tap picker value; plug: tap source, tap destination). After each: `step_applied` received, the cable or dial shows its final state, the "Next step" button appears and is at least 96 px tall. Core stdin log contains **exactly** the 7 `.e` lines, in order, each once, and nothing else before the first INIT other than session setup (`f p`, `s cy.rate`). After step 7, "Finish wiring" appears, then S5 shows "8 more cables, 10 more switches" |
| M1-03 | **Wrong-tap escalation, every step class** | Covered for a switch step (`j1-one`: wrong picker value, wrong dial) and a plug step (`const-to-trunk1`: decoy jack, right source + wrong destination, wrong source). Wrong #1: X badge, specific hint text, decoy shakes. Wrong #2: ring thicker (10 px), chevron faster. Wrong #3: "Do it for me" becomes filled and pulses. **Zero core stdin writes during every wrong tap.** Wrong-tap counter is per step (resets on the next step). Taps on empty space or the dimmed region do not count. Right source + wrong destination snaps the cable back and leaves the source armed. A `wrong_tap` metric is written per wrong tap |
| M1-04 | **"Do it for me"** | On step 4 after 0 wrong taps and on step 6 after 3 wrong taps. The step plays (cable draws in about 900 ms or dial turns), card says "Done for you", `step_applied` has `assisted:true`, progress dot is hollow, "Next step" appears. Metric `step_done assisted:true`. Stdin gets the correct `.e` line |
| M1-05 | **"Skip setup, just run it"** | From step 0, from step 3 (after 3 done), and from step 7 (last step, nothing remaining may be treated as a no-op or go straight to S5). No confirm dialog. Remaining steps are applied in file order. S5 counters match what remained. `setup_complete.skipped` equals the number the bridge applied. Metric `setup_skipped{atStep}`. Final stdin equals the same multiset as M1-02. Then 3 INITs give 3 / 9 (known answer) |
| M1-06 | **Run view: slow, real lamps, known answers** | Default speed is Slow. INIT presses 1 to 4 yield (x, x squared) = (1,1), (2,4), (3,9), (4,16). After each settle, four independent views agree with each other and with the reference-core oracle: DOM lit lamps (exactly one lit lamp per digit column, sign P), helper readout text, websocket `value`, oracle `d` dump. Notebook tape has one row per press, built from the lamp reading, not a preset table |
| M1-07 | **Slow is legible** | At Slow, between INIT and settle the acc2 DOM is sampled every 50 ms. At least 2 distinct intermediate values are observed on press 2 or 3 (for example 4, 6, 8, 9 on press 3). Proposed pass for FR-17; the exact rate is tuned in spike S4 (see the open question in section 17) |
| M1-08 | **INIT guard and debounce (UX-07)** | Double-tap INIT (two taps within 400 ms) sends exactly one `b i`. A tap while busy: button is disabled (greyed, spinner), nothing is sent. Forcing a raw `button init` over the websocket while busy returns `BUSY` and sends nothing to the core |
| M1-09 | **"Keep pressing for me"** | Appears after press 3. Stops at x = 12, acc2 = 144. Total `b i` count in the bridge log = 12 (no more, no fewer). No `BUSY` errors. Never presses while busy. Tape has 12 rows, each correct. "Show me what happened" goes to S7 |
| M1-10 | **"Skip to the answer" reaches 144** | From press 1, from press 5, and from the very first INIT. Bridge log shows `s cy.rate 0` (full) then the INIT loop. Reaches x = 12 and acc2 = 144 with lamps matching the oracle at settle, and lands on S7. The result checkpoint `answer` fires once. Metric `skip_to_answer`, `mission_complete` |
| M1-11 | **Speed control** | Slow to Full to Slow: bridge sends the matching `s cy.rate` only from the mission's speed table. Full never strobes: no region larger than about 10% of the screen flashes more than 3 times per second (WCAG 2.3.1, checked on a CDP screencast) |
| M1-12 | **CLEAR** | After 5 presses, CLEAR: both accumulators 0; next INIT gives 1 / 1; tape restarts |
| M1-13 | **Result screen and exits** | S7 shows the tape (`1 x 1 = 1` to `12 x 12 = 144`), takeaway text, three buttons. "Try again": new session ID, new core PID, acc 0 / 0, preset only (setup starts over at step 1). "Menu": session ended. "Start over" asks to confirm; "Keep going" changes nothing; "Yes, start over" starts a fresh core. "Back to missions" confirms only if at least 1 step is done |
| M1-14 | **No-demo-fallback and retry budget** | See section 6 (kill tests) |
| M1-15 | **Idle reset** | See section 5 |
| M1-16 | **Touch audit on every M1 screen** | See section 7 |
| M1-17 | **Browser guards (UX-06)** | Two-finger pinch, swipe-back from the left edge, pull-to-refresh, long-press (context menu), text selection by drag, drag-out, a second simultaneous touch: none does anything. The page URL is unchanged and no element is selected. Only the first touch point counts. Action fires on release: touchStart alone sends nothing |
| M1-18 | **Credit footer and fixture-free bundle** | "ENIAC simulator by Brian L. Stuart, Drexel University" is visible at 24 px or larger on every visitor screen. The production web bundle contains no fixture markers: no `tests/`, `fakecore`, `golden`, recorded-stream strings, or `"demo"`-style data (list kept in `tests/web/bundle-lint`) |
| M1-19 | **Touch feedback latency (UX-08)** | pointerup to first visual feedback frame is 100 ms or less at p95 over 50 taps on the Mac (strict 100 ms on the device, section 9) |
| M1-20 | **Monkey run** | 10 minutes of random taps on the running app: no console error, no navigation, no stuck state, no duplicate INIT, and the app still completes M1-02 afterwards |

**M1 definition of passed:** M1-01 to M1-20 green on the Mac, M1-01 to M1-10, M1-14 and M1-15 green against the Model 4 box, plus the coexistence cycle in section 8.

---

## 5. Idle and reset timings (FR-32, FR-33)

Two layers. Logic is tested with a fake clock (fast). Timings are tested in real time once (slow).

**Defaults to verify:** 90 s in setup and briefing and result and picker; 3 min (180 s) while running; "Still there?" countdown 15 s; Tell me more pauses idle (up to 2 min); attract has no timeout; S8 finale returns after 45 s; About 90 s; PIN pad 30 s; admin 2 min (M3).

| ID | Test | Pass |
|---|---|---|
| IDLE-01 | `idle.ts` unit tests with a fake clock and config from `hello.config` | Overlay at 90.0 s of no touch in setup; at 180 s while `run.state` is `busy` or the mission is running; countdown counts 15 to 0; expiry calls `end_session{idle}` and shows the start screen; any touch on the overlay (not just the button) dismisses it and restores the full timeout |
| IDLE-02 | Any touch resets the timer, including wrong taps and empty-space taps; a touch that only ripples still counts as activity | Timer restarts |
| IDLE-03 | Tell me more open | Idle paused; resumes on close; hard cap 2 min |
| IDLE-04 | Expiry resets the machine (FR-33) | New session ID and new core PID on the next start; old progress, tape and speed are gone; next visitor starts at step 1 with Slow |
| IDLE-05 | E2E with shortened config (setup 6 s, run 9 s, countdown 3 s) | Same behaviours in a browser; overlay present at the expected time plus or minus 300 ms |
| IDLE-06 | **Real-time defaults, once per milestone on the device** | Squares stopped at step 3: overlay at 90 s (plus or minus 2 s), reset at 105 s. Squares mid-run: overlay at 180 s, reset at 195 s. Attract left alone for 10 min: still attract, no overlay |
| IDLE-07 | Idle during the S5 animation and S0 | No overlay (those screens have no timeout). Touch during S9 doesn't leak through to the screen below |
| IDLE-08 | Client-liveness: browser closed for 30 s | Bridge reaps the session |

---

## 6. No-demo-fallback tests (FR-50 to FR-52, UX 7.9)

Principle tested: **the machine view is rendered only from live `state` and `frame` messages of the current session while `health.core == "up"`.** In any other condition the machine view is absent.

| ID | Scenario | Pass |
|---|---|---|
| ERR-01 | `kill -9` the core while on each of: setup step 3, armed, mid-run (Slow and Full), result | S10 "ENIAC is resting. Please let a docent know." appears within 2 s of the process dying (exit is detected immediately; 2 s leaves margin for the browser). Shows status code `E-CORE-DOWN`. "Trying to wake it up again... (1 of 3)" |
| ERR-02 | Stale-data proof | On S10 the DOM contains **no** lamp elements, no helper readout, no tape and no cards. (Stricter than "unlit".) A full-page screenshot is compared against a golden of S10 with tolerance. Frames injected for the old session ID are ignored |
| ERR-03 | Hang, not exit: `SIGSTOP` the core | S10 within 4 s (silence 2 s or missed ack 1.5 s, plus margin); code `E-CORE-DOWN` (`hang-status` or `hang-cmd` in the health detail). `SIGCONT` later does not revive the old session |
| ERR-04 | Kill vlink only | `E-CORE-DOWN` (vlink disconnect while the core is alive); the core process group is killed |
| ERR-05 | Automatic recovery inside the budget | After one kill: S10, then within about 2 s plus core ready time (about 1 s), the screen goes to the start screen without a touch (FR-51). The visitor's old session is **not** resumed. The new session is clean |
| ERR-06 | **Retry budget** (fakecore as the core binary, always `exit-after 0`, real timers with backoff scaled by config) | Attempts at 2 s, 5 s, 10 s are visible as "(1 of 3)", "(2 of 3)", "(3 of 3)". After the third: `health.final:true`, `E-RETRY-BUDGET`, the body is replaced by the staff instruction ("Staff: tap the top-left corner 5 times, then enter the PIN and choose Restart simulator."). The screen stays up (no return to attract). The core is **not** restarted in a tight loop: attempts in the log match the schedule exactly |
| ERR-07 | Slow retry and self-heal | After the budget is exhausted, fix the fault (swap fakecore for the real core); within the `slowRetry` interval (scaled to 10 s in the test) the screen heals to the start screen with no staff action (NFR-07) |
| ERR-08 | Window semantics (Go, injected clock) | 3 failures spread over more than 5 min never exhaust the budget; a successful probe resets it |
| ERR-09 | Websocket loss: stop the bridge for 3 s, then for 7 s | 3 s: no S10 (reconnect blip is tolerated), page keeps state until resync. 7 s: S10 with `E-LINK` (more than 5 s). On return the page reloads state from a fresh `state` message, and does not show any lamps before it arrives |
| ERR-10 | Start-up failures | Preset with one byte changed: that mission is `available:false`, and the picker can't start it. All missions unavailable: `E-MISSION`. Fakecore `slow-start`: `E-CORE-START` after 5 s. Bridge not running at page load: S10 (`E-LINK`), never an empty or fake machine |
| ERR-11 | Error state hygiene | S10 has no interactive visitor controls; the top-left admin zone exists (M3); the screen does not animate machine state (no lamps, no cards) |
| ERR-12 | Health endpoint matches reality | `/healthz`: 503 with `status:"down"` while S10 is showing, 200 after recovery; `restarts5m`, `lastError.code` agree with what the UI showed |
| ERR-13 | Metrics | `error_enter{code}` and `error_exit{durS}` are written by the bridge, and `core_restart` per attempt |

---

## 7. Touch-target and hover audit (automated, every PR)

A Playwright spec walks every screen and state in a fixed list and runs one audit function. Screens: S1 (start), S2, S3, S4 (each step type: plug, switch, picker open, Tell me more open), S5, S6 (idle, busy, after press 3), S7, S9, S10, S11, D1; later S8, S12, S13.

**Finding interactive elements (do not rely on tag names only):**
1. Everything matching `button, a, input, select, [role=button], [tabindex]`.
2. SVG hit areas: every element with a `jack:`, `sw:` or `trunk:` ID, and every picker option, **measured as the hit area (`pointer-events` region / hit rect), not the drawn artwork**.
3. Anything with a click, pointer or touch listener, found through the CDP call `DOMDebugger.getEventListeners` over the whole tree. Anything found in (3) and missed by (1) and (2) is a test failure ("undeclared interactive element"), which prevents a clickable thing from sneaking in without a size.
4. The hidden admin corner zone (120x96 px) when present.

**Assertions:**

| Rule | Source | Pass |
|---|---|---|
| Every interactive element, in CSS px at 1920x1080, is at least 64 x 64 | UX-01 | No exceptions. Jack hit areas at least 88 x 88 and dials at least 120 x 120 (UX 6.6) |
| Primary actions (INIT, READ, Next step, Finish wiring, Do it for me, Skip setup, Continue, I'm here, Let's go, Start, Next mission, Try again, Menu, Close) are at least 96 px tall | UX-01 | Marked by `data-primary`. A lint fails if a known-primary label lacks the attribute. Exceptions the UX spec itself sets at 64 px (Tell me more, Show me where, CLEAR, About, Back to missions, Skip setup in the rail) are listed in a small allow-list file with the UX section cited |
| At least 16 px between any two simultaneously active targets | UX-01 | Gap computed from hit rects. Decoy jacks in the same window are included |
| Hit rects fit inside the viewport and are not covered (`elementFromPoint` at the centre returns the element itself or a descendant) | UX-02 | Catches overlays that eat taps |
| No hover-only affordance | UX-03 | (a) A CSS scan fails on any `:hover` rule that is not inside `@media (hover: hover)` and cosmetic only. (b) With `hover: none` emulated, every interactive element is still visible and labelled. (c) No `title` tooltips. (d) No state that appears only on pointer-enter |
| No long-press, double-tap, pinch or multi-finger requirement | UX-03 | The action map for every screen lists only single taps; checked by driving each action with one tap and by the M1-17 tests |
| Action fires on release | UX-03 | CDP touchStart alone triggers no action on any primary button |
| Text sizes | NFR-06 | Computed body text at least 24 px, step headline at least 36 px, footer at least 24 px, lamp dots at least 12 px; decorative engraved plate text is exempt |
| No keyboard or text input in the visitor UI | UX-05 | No `input`, `textarea` or `contenteditable` outside the PIN pad (which uses buttons) |
| Contrast and colour | UX-09 | `axe-core` colour-contrast on every screen (WCAG 2.1 AA). Non-text contrast at least 3:1 for the target ring, cable, lamp edge and jack, computed from design tokens. A grayscale screenshot of each step is reviewed once per UX change to confirm no cue is colour-only |
| Glove-tolerance hit logic | UX 6.6 | Unit test: a tap within 16 px of a hit area counts; the nearest active target wins; decoys get the same tolerance |

Output is a table artefact per run (`screen, element, w x h, verdict`) attached to the CI run, so a reviewer can see margins, not only pass or fail.

---

## 8. Model 4 coexistence (FR-80 to FR-83, G2, G3)

Driven by `scripts/coexist-check.sh snapshot|verify` over SSH from the Mac, with baselines in `tests/coexist/baselines/`. The box is the live Model 4 kiosk's Pi 5, so run it only when the Model 4 is not needed on the floor (R5).

**Known limitation (architecture A5):** there is no pre-trial baseline. The first snapshot includes the trial install. "Unchanged" therefore means unchanged relative to the trial state, and the final check expects exactly the trial artifacts to be gone.

### 8.1 The cycle (one full pass is an M1 exit criterion; repeat at M3 and M4)

| Step | Action | Check |
|---|---|---|
| C0 | **Snapshot before**: `coexist-check.sh snapshot` | Stored. Covers: dpkg list; unit files (enabled and installed); hashes of `/etc/systemd/system`, `/etc/xdg/autostart`, `/etc/chromium*`; `/home/kiosk` dotfile and config hashes (excluding the live Chromium profile and cache); listening sockets; users and groups; `/opt` listing; crontabs; polkit and udev dirs |
| C0b | Record Model 4 baseline behaviour | Model 4 kiosk Chromium window is up and touch-responsive; its app responds; `xrandr` output, `xinput list` and the active window title are recorded |
| C1 | **Install** `install.sh --profile test` | Preflight passes (and **aborts cleanly** if a precondition is broken; tested by making port 8740 busy, Chromium missing, and a path with a space) |
| C2 | **Snapshot diff after install** | The diff is exactly the set of entries in `INSTALL-MANIFEST.json` and nothing else: `diff ⊆ manifest` and `manifest ⊆ diff`. `packagesInstalled` is `[]`; no change under `/home/kiosk`, `/etc/xdg/autostart`, `/etc/chromium*`, cron, polkit, udev, display, input, network, journald. Units are installed but **not enabled** |
| C3 | `eniac-kiosk start` | Our Chromium opens above the Model 4's. Model 4 kiosk process still running (PID unchanged). `xrandr` and `xinput list` unchanged. Ports 8740 (loopback) and 8741 (loopback on the test profile) are the only additions; the Model 4's ports are unchanged |
| C4 | Run the M1 list (section 4) on the box | As per M1 |
| C5 | `eniac-kiosk stop` | Our window is gone; the Model 4 kiosk is in front again, touch works, **same PID as C0b**, no restart; our processes are all gone; ports 8740 and 8741 free |
| C6 | **Reboot** | Comes up into the Model 4 kiosk by itself within its normal boot time. Nothing ENIAC runs (services not enabled) |
| C7 | **Uninstall**: `uninstall.sh --purge-trial-packages` | Prints what it removed. It works with the manifest deleted (run once deliberately that way), and on a half-finished install (kill the install script midway in a test run) |
| C8 | **Snapshot verify** | Differs from C0 only by the trial artifacts (`/opt/eniac-simulator`, `/tmp/eniac.log`, `kiosk`-owned trial files, `golang-go`, `tk` and their by-name dependencies). Nothing else. `apt-get -s remove` simulation showed only allow-listed packages; no blanket autoremove ran (check the apt history log) |
| C9 | **Reboot and the manual checklist** (`tests/coexist/CHECKLIST.md`) | Model 4 kiosk comes up unchanged and works by touch; its Wi-Fi and wired addresses are as before (.37 and .36); no ENIAC user, service, autostart entry or port; FR-83 signed |

**Fail conditions (any is P0):** the Model 4 Chromium process restarts, changes PID, loses focus after stop, or fails to boot after C6 or C9; any file outside the manifest changes; a package on the box changes without `--purge-trial-packages`; our install leaves anything running after stop.

### 8.2 Negative tests for the scripts themselves

- Running `install.sh` twice is idempotent or fails safely with a clear message; it never double-writes.
- `uninstall.sh` run on a box that never had the install: no error, no change.
- `--purge-trial-packages` with a package on the box that the simulation wants to remove but isn't on the allow-list: the script refuses and removes nothing. (Test with a fake `apt-get` in `PATH`.)
- Both scripts are shellchecked in CI.

---

## 9. Pi 5 performance, CPU and thermal gates (NFR-04, NFR-08, R3, U10)

### 9.1 How it is measured

| Quantity | Method |
|---|---|
| Frames per second | In the Pi's own Chromium. Preferred: on the **test profile only**, add `--remote-debugging-port=<free port> --remote-debugging-address=127.0.0.1` to the overlay's flags (loopback, reached over an SSH tunnel; preflight checks the port is free on the Model 4 box). A Playwright `connectOverCDP` script then injects a `requestAnimationFrame` counter and a PerformanceObserver for long tasks. Fallback if the flag is unwelcome: a `?perf=1` probe module in the web app that reports through a whitelisted `metric`. Production has no debug port (NFR-10). The M4 measurement on the dedicated Pi uses a temporary systemd drop-in that is removed afterwards |
| CPU | `pidstat` or `ps` sampling every 2 s for core, bridge, Chromium (browser, renderer, GPU) and whole system (`/proc/stat`) |
| Throttling | `vcgencmd get_throttled` every 5 s; `vcgencmd measure_temp` every 5 s; clock via `vcgencmd measure_clock arm` |
| Load | Real `trajdemo` (it runs at the pinned commit) in full speed; a synthetic all-20-accumulators-changing stream (replayed golden or fakecore `flood`) for the worst case; `sieve` only after U1 is fixed; Squares at Full with "Keep pressing" |

Each load runs for 30 min. Before the run: reboot (so the `get_throttled` history bits mean something), 27 W supply and active cooler fitted and recorded.

### 9.2 Gates

| Gate | Threshold | Basis |
|---|---|---|
| Frame rate | Average of at least 20 fps in **every** 10 s window, and 1% low (p99 frame interval) of 66 ms or less, across all three loads | NFR-04. The 1% low is an added proposal so an average can't hide stutter |
| Lamp latency | Core tick to lit lamp in DOM, p95 100 ms or less | UX-08 |
| Touch feedback | pointerup to feedback frame, p95 100 ms or less, measured during the full-speed load | UX-08, NFR-03 |
| Core CPU | 200% of one core or less (2 cores), confirming `GOMAXPROCS=2` actually caps it | U10 |
| Bridge CPU | 15% of one core or less, averaged over 5 min at full speed | proposed |
| Chromium total CPU (browser + renderer + GPU) | 150% or less | proposed |
| Whole-system CPU, 5 min mean at full speed | 75% of 4 cores (300%) or less. At least one core of headroom stays free | proposed |
| Attract and idle | Whole system 50% of one core or less while idle in attract | proposed |
| Throttling | `get_throttled` equal to `0x0` for the whole run, **including** the historical bits 16 to 19 (the exhibit Pi shows `0x50000`) | NFR-08 |
| Temperature | Steady state 75 C or less (the Pi 5 starts throttling near 80 C, so this keeps a margin) | proposed |
| Mission start | Fresh core ready 3 s or less on the device (p95 over 20 starts) | NFR-03 |

**All CPU and temperature numbers marked "proposed" are placeholders.** They are to be ratified, or tightened, by the M1 spikes S1 (Pi 5 CPU and fps) and S4 before they become hard gates. Write the measured values into `docs/spikes/` and then into this table.

### 9.3 Caveats to state in every report

1. **The Model 4 kiosk's own Chromium keeps running underneath ours** on the test box. The numbers are pessimistic against the dedicated Pi. Record the Model 4's idle CPU as a baseline, and re-run the whole gate on the dedicated Pi 5 at M4. **The M4 numbers are the ones that count for G1.**
2. The e2e suite run over an SSH tunnel uses the Mac's browser. It proves the Pi's bridge and core but **not** Pi rendering. Rendering gates use the CDP method above.
3. Upstream's `sieve.e` is broken at the pin (U1), so the heaviest realistic load is not available until that is resolved. Use trajdemo plus the synthetic worst case meanwhile, and re-run when sieve works.

---

## 10. 7-day soak (NFR-05, NFR-07)

Driver: `tests/soak`, started on the device (test box for M3, dedicated Pi for M4). It drives the real websocket the way a browser does (so Chromium also runs, rendering the real page via the normal display unit) and cycles: attract idle 2 min, then Squares (setup with mixed Do-it-for-me and skips, run, result, "Try again"), then Trajectory and Primes once they exist, then idle reset, repeated around the clock with random pauses. About 300 to 500 cycles a day.

**Scheduled faults during the soak:** kill the core every 6 hours (recovery must be automatic); one burst of 3 kills inside 5 minutes on day 6 (budget exhaustion, then slow retry heal); one browser restart per day; one deliberate `SIGSTOP` hang per day.

**The nightly 03:00 restart is disabled for this run.** Otherwise it would hide exactly the growth NFR-05 forbids. A second, shorter (48 h) run with the timer enabled confirms the timer works and the box is back in attract by 03:02.

**Sampling every 60 s** to a CSV: RSS of the bridge, the core, vlink, Chromium (browser, renderer, GPU, total), open file descriptors and thread counts for the bridge, Go heap (via a runtime stats field in `/healthz`), tmpfs use of `/run/eniac-kiosk` and Chromium's profile, journal size, metrics file size, CPU temperature, throttle flags, session directory count, and zombie or orphan process count.

### 10.1 Pass criteria

Fit a linear regression to hourly medians **after a 12 h warm-up** for each series.

| Series | Pass |
|---|---|
| Bridge RSS | Slope 2 MB/day or less, and day-7 median no more than 1.25 times the day-2 median |
| Core RSS (per session, sampled at a matching point in the cycle) | No upward trend (slope 1 MB/day or less). It is recreated every session, so this checks the cycle is truly fresh |
| Chromium total RSS | Growth 50 MB or less from day 2 to day 7, and no monotonic climb (no visible sawtooth drift upward) |
| Whole-system free memory | Doesn't fall by more than 5% of total RAM over days 2 to 7 |
| File descriptors, threads, goroutines | Flat: day-7 within 10% of day-2 |
| Zombies and orphans | Zero `eniac-core` or vlink processes outside an active session, at every sample. At most one session directory |
| tmpfs, journal, metrics | `/run/eniac-kiosk` bounded (under 50 MB); journal under 200 MB; metrics file grows linearly and within 2x the expected 500 events a day |
| Availability | At least 99% of the time in a non-error state; every injected fault recovers without staff action; no state that needs a reboot |
| Throttling and temperature | `get_throttled` remains `0x0`; temperature under the 75 C gate |
| Performance stays level | Mid-run fps (sampled over CDP hourly for 60 s) on day 7 is within 10% of day 1; touch feedback p95 still 100 ms or less; mission start p95 still 3 s or less |
| Post-soak functional | Full M1 list passes on the device afterwards, with no restart first |

A failing series is a P1 bug with the sampled CSV attached. Regression into the `-K` restart hack (upstream's Tk workaround) is not an acceptable fix (PRD NFR-05).

---

## 11. Operability tests (M3; brief, since they are manual or scripted drills)

| ID | Test | Pass |
|---|---|---|
| OPS-01 | Boot-to-kiosk from power-off, no login, keyboard or touch | Start screen in 60 s or less (NFR-02), 10 cold boots |
| OPS-02 | Power cut mid-run (10 times, at different moments, including during a metrics write) | Next boot reaches the start screen unattended, no fsck prompt or manual step; truncated last metrics line skipped; no stale session |
| OPS-03 | Health endpoint (LAN `:8741`) read-only; admin API only on loopback | `ss -ltnp` shows exactly 127.0.0.1:8740 and the health listener; POST on the health port is rejected; a wrong-Origin websocket is rejected |
| OPS-04 | Admin entry (S12) | 5 taps in the 120x96 corner within 3 s opens the PIN pad, on every screen including S10. 4 taps, or 5 taps spread over more than 3 s, does not. Any other touch resets the count. Wrong PIN returns to the visitor screen. 5 wrong PINs lock out for 60 s. PIN pad idles out after 30 s. Admin auto-exits after 2 min |
| OPS-05 | Admin actions | Restart simulator, restart app, reboot, shut down (with confirm), docent mode (no idle timeout, skip visible), return to kiosk. On the **test profile**: reboot, shutdown and update return `NOT_ALLOWED` |
| OPS-06 | Update and rollback | Good signed USB update installs and the health check passes; rollback is one tap; a bad signature, a corrupted tarball, a lower version, a USB pulled mid-copy, and a release that fails `selftest` or health **auto-rolls-back** and the kiosk keeps working. Config and metrics survive both directions |
| OPS-07 | Nightly restart | 03:00 restart completes; back in attract within 2 min |
| OPS-08 | Metrics | Every FR-60 event type appears for a scripted session; CSV export to a USB stick matches the JSONL; no IP, device ID or free text in any record (NFR-11) |
| OPS-09 | **Handoff drill (OT-6)** | A staff member, unassisted and using only the runbook, cold-boots the kiosk, recovers it from a forced core crash, installs an update, and rolls back. Observer records time and every point of confusion. Pass: completed without the observer speaking |

---

## 12. Content fact-check gate (FR-22, FR-41, R6)

Two kinds of claims need two kinds of checks.

**Machine-verifiable claims (automated).** Anything the core can prove, such as numbers displayed on lamps:
- Squares: table goes 1 x 1 = 1 up to 12 x 12 = 144 (tested in M1-09).
- Trajectory part 1: 97,367 added to itself 5,000 times gives 486,835,000 (checked in arithmetic, and on the lamps in M2).
- Primes: the count of primes from 3 to 2801 is **407**. I checked this independently: there are 407 primes from 3 through 2801, and 2801 itself is prime. The mission copy ("all 407 primes") must still be confirmed against an actual run's punch file once U1 is cleared (M2 gate), because the copy makes a claim about what the simulated machine does.
- The card pane count and the "latest prime" readout equal the punch file.

**Human-verifiable claims (history).** Every string tagged `[FC]` in the UX spec, every mission YAML, the About screen and the "Tell me more" text.

### 12.1 Process

1. **Claims register** at `docs/content/claims.md` (or a generated file): `id, where (file and field), exact text, claim, source, status (pending | cleared | changed | rejected), reviewer, date, text-hash`. Generated by a script (`eniac-bridge mission claims`, or a small script run over `missions/*.yaml` and the About screen) that extracts every `[FC]` tag and every sentence with a year, count, duration or named person.
2. **Reviewer:** the vcf-museum Fact-Checker reviews each claim against sources. **Doug Crawford approves the About and credit wording** (FR-41, Q10). A cleared claim is recorded with the text hash. **If the text changes, the hash changes and the claim returns to `pending`.**
3. **Lint in CI (`make test`):**
   - Fails the **release build** (`make release`) if any shipped string has a claim that is not `cleared` (the PR build only warns, so dev isn't blocked).
   - Fails if a literal `[FC]` marker appears in any shipped bundle or mission file's rendered text.
   - Word counts: step body at most 40 words, Tell me more at most 120 words (FR-22). Reading level at most grade 8 by Flesch-Kincaid (the PRD says grade 6 to 8; UX says 4 to 5 for the Squares copy, and the stricter of the two is fine, so the lint uses 8 as the failure line and warns above 6).
   - Numbers in copy that are checkable in code (407, 2801, 144, 486,835,000, 5,000) appear in a `facts.yaml` table and a test asserts each against the computation or a run.
4. **Questions to settle in the register** (from the UX spec): "about 18,000 vacuum tubes", "finished in 1945 and shown to the public on February 15, 1946", "1/5,000 of a second per addition", "about 30 seconds vs days by hand", "Stuart's notes say this is faster than multiplying", "People did steps like these by hand and setup took days", "20 accumulators each holding 10 digits", Lehmer July 1946 and De Mol and Bullynck attribution, and whether the ENIAC programmers are credited (Q10).

**Gate:** zero `pending`, `changed` or `rejected` claims in shipped text before the floor (G4 prerequisite), and Doug's written approval of About and credits on file. Squares copy is cleared before M1 exits **only if** the M1 box is shown to visitors; otherwise before M2 exit.

---

## 13. Accessibility and safety checks (light)

- WCAG 2.1 AA contrast via `axe-core` in the touch audit (section 7).
- Flash rate (WCAG 2.3.1): CDP screencast at Full speed, luminance-change count per region larger than 10% of the screen is 3 per second or less. Run in M1 (Squares Full) and again in M2 (Trajectory, Primes).
- Reduce-motion setting replaces zooms with cross-fades (spot check in M2).
- Screen readers, sound and other languages are out of scope for v1 (Q8, Q9). Nothing to test, and nothing in this plan should be read as covering them.

---

## 14. Manual test script: gloves and kids (NFR-09, UX-04)

**When:** a dry run with Nick and one family member at M1 (Mac or test box); the formal round before the floor (G7) on the dedicated Pi 5, in the room if possible. **Where results go:** `tests/manual/usability-YYYY-MM-DD.md`, one file per round.

### 14.1 Setup

- Kiosk freshly reset, at the start screen, mounted or propped at the intended height (Q2 is open; record the height).
- Screen protector or none: record which. Record room light level (a bright room affects glare and contrast).
- A phone on a tripod is **not** used: NFR-11 forbids cameras on the kiosk, and the test keeps to paper notes. If the testers consent, screen recordings of the screen only (no faces) may be used.
- Observer script printed. Stopwatch. Tally sheet (below).

### 14.2 Participants

At least 5 walk-up testers, none of whom has seen the exhibit: **at least 1 child aged 8 to 12, at least 1 adult over 65, at least 1 session in gloves**. Aim for a family pair (a child driving the screen with an adult reading). Recruit through the museum; obtain consent for notes. No personal data recorded, only an anonymous label (P1, P2...) and an age band.

### 14.3 Protocol (per session, about 15 min)

1. Say only: "Try this exhibit. Do whatever you like. I can't help, but I'll take notes." Do not explain, point or hint. (If the tester asks "what do I do?", answer: "What would you try?")
2. Observer notes, without speaking: time to first touch; time from first touch to first lit lamp movement; each **pause longer than 10 s** and what the tester was looking at; every wrong tap (which step, which target); every use of Do it for me, Skip setup and Skip to the answer; every time the observer has to intervene (a **help event**); tap misses (touch didn't register or hit the neighbour); accidental exits; anything said aloud.
3. After the run ends or at 10 minutes, stop. Ask, in this order: "What did you just do?", "What was the machine doing?" (probe for the "cables are the program" idea), "Was anything hard to touch?", "Would you try the next one?"
4. **Glove sessions:** repeat a Squares run with (a) a thin knit or fleece glove, (b) a touchscreen-compatible glove or one with conductive fingertips, (c) a thick winter glove or mitten if the tester wears one. **First check whether the panel registers the glove at all.** Plain insulating gloves often don't register on a capacitive panel with any software. If the touch controller (wch.cn) ignores a glove type, record that as a **hardware finding for the production screen choice (Q2)**, not a UI defect. Where a glove registers, count mis-hits and note contact size. Check that the 16 px tolerance and nearest-target rule give the right jack.
5. **Kid stress pass** (child tester, or a helper child with a parent's consent): ask the child to "press everything as fast as you can" for 60 s in the run view. Observe: rapid INIT mashing (one `b i` per completed press, no queue), several fingers or a palm on the screen (only the first touch counts), drag and swipe attempts, repeated tapping of the footer and the top-left corner, walking away mid-run (idle reset timing matches IDLE-06), and whether the screen ever ends in a state that needs staff.

### 14.4 Tally sheet (one row per tester)

`id | age band | glove type | registered? | completed Squares (Y/N) | help events | Do it for me uses | Skip uses | wrong taps (per step) | pauses over 10 s (where) | mis-hits | accidental exits | time to first lamp | total time | took "the cables are the program" idea (Y/N/partly)`

### 14.5 Pass criteria

| Criterion | Pass |
|---|---|
| Completion | At least 4 of 5 testers complete Squares (reach S7) with **no help event** (NFR-09). The observer must not speak or touch. **On-screen aids** (Do it for me, Skip setup, Skip to the answer) are allowed and tallied, because they are part of the product. *Decision needed from Nick if a stricter reading is wanted: "without help" meaning without any on-screen aid too.* |
| Child | The child tester completes Squares without help |
| Gloves | At least one glove type that is realistic for the museum's winter visitors (thin knit or touch-compatible) completes Squares with no more than 2 mis-hits. A glove the panel doesn't register is reported, not counted as a failure of this criterion |
| Robustness | Zero accidental exits from the app, zero stuck states needing staff, zero duplicate INITs in the mash test |
| Time | Median Squares time between 2 and 3.5 min (FR-10 says 2 to 3 min at a normal pace; allow 0.5 min slack because testers are unhurried) |
| Findings | Every pause of 10 s or more and every mis-hit is triaged: fixed, or written down with a reason. The UX owner decides |

### 14.6 Docent check (same round, 15 min)

A volunteer docent is given a 2-minute briefing only. They must be able to: run Squares using Skip setup and Skip to the answer to demo it in under 90 s; recognise S10 and read the staff instruction; reach the admin PIN pad (M3) and restart the simulator.

---

## 15. Quality gates per milestone

Severity definitions for a museum kiosk (used in every gate):

| Severity | Definition | Examples | Handling |
|---|---|---|---|
| **P0** | Breaks a hard rule or disrupts a live exhibit | Screen shows machine state that isn't the core's (demo fallback); a visitor can exit the app or reach admin without the gesture and PIN; the Model 4 kiosk is changed or won't boot; data loss | Stop. Fix before anything else ships |
| **P1** | Mission or recovery is broken for a normal visitor | A mission can't be finished; error state doesn't recover; memory leak that needs a restart; throttling in normal use | Must be closed or explicitly waived by Nick, in writing, before milestone exit |
| **P2** | Impaired but has a workaround | Hint text wrong; a slow animation; a mis-hit that is recoverable | Triage per sprint; at most 5 open at exit |
| **P3** | Cosmetic | Alignment, wording slip | Backlog |

**Global rules, every milestone:** all automated suites for that milestone green; no open P0 or P1; `make release` fixture-exclusion check passes; any failing test that is `xfail` (like `sieve-canary`) is listed with its reference and owner; test results (or links) are attached to the milestone's exit note.

### M1: Squares end to end on the Model 4 box

| # | Gate |
|---|---|
| G-M1-1 | M1-01 to M1-20 green on the Mac; M1-01 to M1-10, M1-14 (ERR-01 to ERR-06 at least) and IDLE-06 green against the test box |
| G-M1-2 | Golden and quirk tests green (all goldens in 3.2 except `sieve-canary`, which is `xfail` and documented); fuzz 60 s clean; fakecore suite covers every row of 5.8 |
| G-M1-3 | Whitelist conformance: stdin allow-list test green |
| G-M1-4 | Touch audit green on all M1 screens (section 7) |
| G-M1-5 | One full coexistence cycle C0 to C9 passes (section 8), with the Model 4 still working |
| G-M1-6 | Spike reports written: S1 (perf), S2 (trajdemo fast-forward), S3 (sieve/U1), S4 (Slow rate and idle detector). Section 9.2 "proposed" numbers updated from S1 and S4 |
| G-M1-7 | F1 confirmed in writing: sq.e computes one square per INIT (the architecture already verified this; record it) |
| G-M1-8 | Informal dry-run with a family member and a glove (14.3), findings logged |
| G-M1-9 | Fact-check register exists and Squares copy is listed (clearing is required before floor, not before M1) |

### M2: All missions

| # | Gate |
|---|---|
| G-M2-1 | U1 resolved (sieve punches cards at the pin or an approved patch, and `sieve-canary` passes) or Primes formally deferred by Nick |
| G-M2-2 | Mission tests for Primes and Trajectory analogous to M1-02 to M1-13: every step, wrong-tap ladder, Do it for me, Skip, speed, result. Primes: card count and latest prime equal the punch file; run reaches 407 cards; Trajectory: READ shows the card, each part has its own INIT and caption, "Skip to the trajectory" works |
| G-M2-3 | Card pane: newest first, last 20 kept, punch order matches the punch file byte for byte; `punch` messages never coalesced or lost under a slow client |
| G-M2-4 | Mission lengths (FR-10) checked with a timed scripted run and the dry-run testers: Squares 2 to 3 min, Primes 3 to 4, Trajectory 4 to 6, all three 15 min or less |
| G-M2-5 | Section 9.2 performance gates on the test box with trajdemo and the worst-case synthetic load (and sieve if available) |
| G-M2-6 | Mission definition format (FR-24): a new throwaway mission YAML (for example cube.e) loads and passes `mission check` with no code change. Drift test: change one byte of any `.e` and the mission goes unavailable |
| G-M2-7 | Live attract (FR-30): no canned video; the caption comes from real run state; with no live run, S10 shows instead |
| G-M2-8 | Fact-check register: every claim in the three missions and About is `cleared` or removed (or release gating is left off and the floor gate in section 12 still applies) |
| G-M2-9 | Flash-rate and reading-level lints green |

### M3: Operable

| # | Gate |
|---|---|
| G-M3-1 | OPS-01 to OPS-08 pass on the test box |
| G-M3-2 | **7-day soak passes all of 10.1** |
| G-M3-3 | Updates and rollback (OPS-06) including every failure variant |
| G-M3-4 | NFR-07 availability measured during the soak at 99% or better |
| G-M3-5 | Full device e2e (the suite over a tunnel, plus CDP rendering checks) green, and the coexistence cycle repeated with M3 installed |
| G-M3-6 | Security checks: ports, Origin, read-only health, admin PIN lockout, no PIN in repo (`git log -p` and a secret scan) |

### M4: Production hardware and handoff (covers the PRD's G1 to G7)

| # | Gate | PRD gate |
|---|---|---|
| G-M4-1 | `provision-prod.sh` produces a working kiosk from a fresh Pi OS Lite image on the dedicated Pi 5; OPS-01 to OPS-09 pass there; section 9.2 performance and throttling gates pass **on the dedicated Pi** (the numbers that count) | G1 |
| G-M4-2 | 7-day soak repeated on the dedicated Pi (or the M3 result plus a 48 h confirmation if hardware is identical and Nick waives the repeat) | G7 |
| G-M4-3 | Usability round (14.3 to 14.5) passed, with gloved and child testers | G7 |
| G-M4-4 | Trial install and the ENIAC app removed from the Model 4 (`uninstall.sh`), `coexist-check.sh verify` clean, checklist signed, Model 4 reboots into its own kiosk | G2, G3 |
| G-M4-5 | Handoff drill (OPS-09) passed unassisted; runbook, sticker and credentials exist and are held by the museum; Nick's keys removed or documented as optional; the release public key replaced by the museum's | G4 |
| G-M4-6 | R1 resolved or the build confirmed to need no permission; `mult.go` report sent (R2) | G5, G6 |
| G-M4-7 | Fact-check register fully cleared and Doug's approval on file | R6 |
| G-M4-8 | Zero open P0 or P1 |  |

### M5: Floor trial

| # | Gate |
|---|---|
| G-M5-1 | 2 weeks on the floor with no Nick intervention (OT-7) |
| G-M5-2 | Metrics reviewed by the museum owner against PRD 1.5: availability 99% or better; Squares completion 60% or better; Primes and Trajectory 40% or better; median time 3 to 6 min |
| G-M5-3 | Every P1 found on the floor closed; P2s triaged |
| G-M5-4 | Museum owner's sign-off recorded |

---

## 16. What runs where

"CI" means an automated runner on Linux (GitHub Actions or equivalent; the project's own `make ci`, which wraps the same commands, is the local equivalent on the Mac). Pure Go and Node, no hardware. Upstream is fetched, verified and patched at build time from a warm cache. **Whether a hosted CI is used at all is open (section 17).** The suite works identically run by hand on the Mac.

| Check | Mac (local `make test`/`e2e`) | CI | Test box (Model 4's Pi 5) | Dedicated Pi 5 | When |
|---|---|---|---|---|---|
| Go unit, golden replay, fakecore, property tests | Yes | **Yes** | | | Every PR |
| Fuzz (60 s) / (10 min) | Yes | **Yes** (60 s) / nightly (10 min) | | | PR / nightly |
| Real-core headless (short) / (long: 50 INITs per speed, 100 cold starts) | Yes | **Yes** / nightly | Yes (once per milestone) | | PR / nightly |
| `mission check`, SVG-kit, protocol drift, copy lints, fact-claim lint | Yes | **Yes** | | | Every PR |
| Web unit (`node --test`, `tsc --noEmit`) | Yes | **Yes** | | | Every PR |
| Playwright e2e smoke (M1-02, -03, -06, -09, -10, ERR-01, ERR-05) | Yes | **Yes** | | | Every PR |
| Playwright e2e full list | Yes | **Yes** | Yes via tunnel (Pi's bridge and core; Mac's browser) | Yes via tunnel | Nightly / per milestone |
| Touch and a11y audit | Yes | **Yes** | | Yes (real panel resolution) | Every PR / milestone |
| Monkey test (10 min) | Yes | Nightly | | | Nightly |
| Real-time idle timings (IDLE-06) | Yes | | Yes | Yes | Per milestone |
| Fixture-exclusion and release check | | **Yes** (`make release`) | | | Every release |
| Shellcheck on `install`, `uninstall`, `coexist-check`, `provision-prod` | | **Yes** | | | Every PR |
| Coexistence cycle (section 8) | | | **Yes (live Model 4 only)** | n/a | M1, M3, M4 exit |
| Pi 5 performance, CPU, throttling (section 9) | | | Yes (pessimistic) | **Yes (counts)** | M1 spike, M2, M3, M4 |
| 7-day soak | | | Yes (M3) | **Yes (M4)** | M3, M4 |
| Power-cut, boot time, update and rollback, admin | | | Yes (M3; test profile limits) | **Yes (M4)** | M3, M4 |
| Manual gloves and kids | Dry run | | Dry run | **Formal** | M1 (dry), pre-floor (formal) |
| Fact-check review | Register and lint | **Release gate** | | | Before floor |
| Handoff drill | | | | **Yes** | M4 |

**Flaky-test policy:** a flaky test is a bug. Retry once in CI to report, never to hide; a test that fails more than twice in 20 runs is quarantined within a day with an owner, and is re-listed in the milestone gate notes. Timing tests in CI use generous tolerances; the tight versions run on the device.

---

## 17. Risks, open questions and assumptions

### 17.1 Risks to the test effort

| Risk | Impact | Mitigation |
|---|---|---|
| Upstream sieve broken (U1) | Primes can't be tested end to end, and the worst-case load is unavailable | `sieve-canary` xfail; synthetic worst-case stream; decision owner Nick (architecture A1) |
| Test box is a live exhibit's hardware | Risk to the Model 4 (R5); pessimistic performance numbers | Coexistence cycle at each install; schedule tests away from floor hours; re-gate performance on the dedicated Pi |
| Idle detector is heuristic (A4) | "Keep pressing" could misfire at some speed | 50-INIT known-answer tests at every speed, plus the soak |
| No pre-trial baseline on the Model 4 (A5) | "Unchanged" is relative to the trial state | Stated in section 8; manual reboot checklist covers the rest |
| Gloves may not register on the panel at all | Some visitors can't use it | Report as a hardware finding for Q2, don't paper over it in software |
| No rendering measurement path on the Pi | Can't evidence 20 fps | CDP on loopback (test profile) or the `?perf=1` probe; decide in M1 |
| Hand-tuned CPU and thermal numbers | Gates could be wrong in either direction | Marked "proposed"; replaced by spike S1 and S4 measurements |
| Fact-checker and Doug availability | Floor date slips | Register started at M1 so review can begin while code is built |

### 17.2 Inconsistencies in the source docs that affect tests (flagged, not resolved here)

1. **Slow speed.** FR-17 says Squares at Slow shows about 1 to 3 squares per second. The UX spec says "Keep pressing" is about 1 per 3 s in Slow. Architecture proposes `cy.rate 100` (5 additions a second; about 0.6 s per INIT). M1-07 tests legibility by intermediate values, not by a rate. The rate needs to be fixed in spike S4, and then this test gets a number.
2. **Reading level.** PRD FR-22: grade 6 to 8. UX: grade 4 to 5. The lint uses grade 8 as the fail line.
3. **"Without help" (NFR-09).** Whether on-screen aids count as help needs a decision (section 14.5).
4. **Admin gesture.** FR-52 "hold the top-left corner" vs FR-70 "5 taps". UX F5 settles on 5 taps. The tests use 5 taps.
5. **Attract during setup/briefing timeouts.** The UX inventory gives S3 a 90 s timeout and S5 none; the PRD has a single setup value. IDLE-07 follows the UX inventory.

### 17.3 Open questions for Nick

- [ ] Is a hosted CI wanted (GitHub Actions on a private repo), or is `make ci` on the Mac the gate? The plan works either way.
- [ ] Is the CDP-on-loopback flag on the test profile acceptable, or should a `?perf=1` probe be built? (Section 9.1)
- [ ] Do on-screen aids count as "help" for the 4-of-5 criterion? (Section 14.5)
- [ ] Who recruits usability testers at the museum, and is a room visit possible before the floor?
- [ ] Who is the named Fact-Checker contact and what turnaround should be assumed?
- [ ] Are the "proposed" CPU, fps-low and temperature thresholds acceptable as starting values?

### 17.4 Assumptions

- The Mac can run the real core (architecture verified this) and Playwright Chromium at 1920x1080.
- The bridge logs every stdin write at debug level (requirement stated in 2.1).
- The bridge's `/healthz` exposes Go runtime stats (goroutine count, heap) for the soak. If not, the soak uses `/proc` and `pprof` on loopback.
- The reference-core oracle can run a second core concurrently with the bridge's core on the same machine (separate working directories and session directories).
- A `d a N` dump exists in the core and is parseable, as the goldens already rely on it.

---

## 18. Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1 | 2026-09-30 | Nick DeMarco with AI assistance | Initial test plan from PRD v0.1, architecture v0.1 and UX spec v0.1 |
