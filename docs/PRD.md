# Product Requirements Document: ENIAC Touch Kiosk

**Version:** 0.1
**Last Updated:** 2026-09-30
**Author:** Nick DeMarco with AI assistance (product-requirements agent)
**Status:** Draft

**Sources:** `docs/handoff-from-vcf.md` (including the Decisions of 2026-09-30); wiki `teams/vcf-museum/eniac-exhibit.md` and `teams/vcf-museum/_team.md`; upstream `blstuart/eniac-simulator` at commit `c4b94f2` (2026-09-22): `README.md`, `src/eniac.go`, `src/engine.go`, `src/cycle.go`, `vis/eniactk.go`, `programs/{sq,sieve,trajdemo,cube}.e`.

---

## 1. Overview

### 1.1 Problem

The VCF museum at InfoAge runs Brian L. Stuart's pulse-level ENIAC simulator on an older Pi (10.130.10.27). It auto-cycles views of `trajdemo.e`, so visitors take it for a video. Nobody can interact with it. The upstream Tk front end (`eniactk`) has tiny buttons (`butparam`, the Clean 10 font, `-pady 0`), no guidance, and a Tk memory problem on ARM. It isn't usable by walk-up visitors on a touchscreen.

The simulator is the real thing: every jumper cable and switch of the 1946 machine. What's missing is a way for a museum visitor to program it themselves. That means plugging cables, setting switches, pressing READ and INIT, and watching the neon lamps and punched cards.

### 1.2 Goal

Build a touch-first kiosk that takes a walk-up visitor through three guided missions: **squares → primes → the 1946 trajectory demo**. In each mission the visitor does the key plugging and switch steps, with plain-language explanations along the way. Then they run the machine and see the result. It runs unattended on a dedicated Pi 5, and the museum staff operate it without Nick.

### 1.3 Settled decisions (not re-opened here)

| # | Decision |
|---|---|
| D1 | A new **web front end** rendered in Chromium, like the other museum kiosks. A **Go websocket bridge** wraps Stuart's simulator core. Tk `eniactk` is reference only. |
| D2 | **Guided missions:** squares → primes → the 1946 trajectory demo. Each mission covers its key plugging and switch steps with explanations, then READ → INIT → lamps and card output. |
| D3 | **Production hardware** is a new dedicated Pi 5 with a touchscreen. **Dev and test hardware** is the Model 4 kiosk's Pi 5 for now (10.130.10.37 Wi-Fi / .36 wired, the current trial install). |

### 1.4 Target users

| User | Characteristics | What they need |
|---|---|---|
| **Walk-up visitor** (primary) | Ages from about 8 to 80. Mixed knowledge, from "what's a computer?" to retired engineers. Standing, often in family groups where kids drive the touch and adults read. Dwell is short and self-selected. May be wearing gloves in winter. | To get something working within the first minute, feel that they "programmed ENIAC," and leave understanding one real idea (cables are the program). Depth on request for enthusiasts. |
| **Docent** | A volunteer who explains the exhibit and sometimes demos it. Not necessarily technical. | A way to demo a mission quickly (skip or fast-forward), and to recognise and recover from a fault without a laptop. |
| **Museum staff / operator** | Opens and closes the floor. Has an IT-capable volunteer on call, but no software developer. | Boot-to-kiosk, obvious health status, restart and update without SSH, a written runbook, and credentials the museum holds. |

### 1.5 Success metrics

Measured by on-box, anonymous, local-only counters (FR-60). No cameras, no personal data.

| Metric | Definition | Target (first 8 weeks on the floor) |
|---|---|---|
| Mission completion rate | Missions that reach the "result" screen ÷ missions started | ≥ 60% for Squares; ≥ 40% for Primes and Trajectory |
| Time on kiosk | Median session length, from the first touch out of attract to the idle reset or return to attract | 3–6 min |
| Progression | Sessions that start a 2nd mission ÷ sessions that complete their 1st | ≥ 25% |
| Engagement from attract | Sessions started per open hour | Baseline in weeks 1–2, then tracked (no target yet) |
| Availability | Open-hours minutes not in the error state and not needing staff action | ≥ 99% |
| Operational independence | Nick interventions needed after handoff | 0 |

---

## 2. Scope

### 2.1 In scope (v1)

- A Go websocket bridge that runs the unmodified upstream core (plus the local `mult.go` fix) and relays commands and status.
- A web front end: attract mode, mission menu, three guided missions, run view (lamps and punched cards), about/credits, error state, and a hidden admin screen.
- Mission content (step text, explanations, "tell me more") for squares, primes and trajdemo.
- Boot-to-kiosk install on Pi OS (trixie arm64), with health, auto-restart, update and rollback.
- Clean install and removal on the Model 4 kiosk for dev and test (FR-80–83).
- A runbook, staff training and handoff (Section 8).
- An upstream bug report for `mult.go` and a permission request to Stuart.

### 2.2 Out of scope (v1)

- Free-play mode (arbitrary plugging of the whole machine, or loading arbitrary `.e` files) for visitors.
- Missions beyond the three, such as cube.e, hellorld.e and turing.e. The design should make adding them a content task, not a code change (FR-24).
- 3D/first-person views (`eniacfp`, `eniac3d`, `eniact5`) and the GPIO control station (`-c`).
- Replacing or modifying the existing ENIAC exhibit Pi at 10.130.10.27. Its autologin and under-voltage fixes are tracked on the wiki page, not here.
- Remote/cloud monitoring, accounts, online analytics, internet dependency.
- Sound, multiple languages, and screen-reader support (see Open Questions).
- Publishing a public fork or a redistributable image of Stuart's code until permission is granted (R1).
- Changes to Stuart's simulator semantics. The only core patch is the `mult.go` format fix.

### 2.3 Constraints

- **Hardware:** Pi 5 (8 GB on the dev box). The dev touchscreen is a 15.6" USB panel with a wch.cn multitouch controller, assumed 1920×1080 landscape. The production screen is TBD (Q2).
- **OS/runtime:** Raspberry Pi OS trixie arm64, Chromium in kiosk mode, Go toolchain (apt `golang-go`).
- **Network:** museum LAN only. There must be no runtime internet dependency.
- **Licensing:** the upstream repo has no license (R1).
- **CLAUDE.md hard rules:** no demo fallback, and operational ownership moves to museum staff before ship.

---

## 3. What the core supports (grounding)

These facts from upstream `c4b94f2` shape the requirements below.

- **Control:** the core reads line commands. `l file.e` loads a configuration (it looks in `programs/` if the path doesn't resolve), `p A B` plugs a cable, `s unit.switch value` sets a switch, `b i` sends the initiating pulse, `b r` starts the reader, `b c` clears, `b p` pulses, `R` resets unit state, `f r file` / `f p file` attach the card reader and punch files, and `q` quits.
- **No unplug command.** `p` only adds connections. `R` resets unit state but not the cabling. A wrong cable can't be undone in a running core, so a clean mission state means a fresh core process.
- **Display protocol:** with `-v prog`, the core spawns `prog` as a child. It streams line-based status to the child's stdin: `ad`/`ac`/`ar`/`af` accumulators, `cy`, `cm`, `init`, `mps`/`mpd`/`mpi`, `ft*`, `ct`, `m`, `d`, `punch`, `up`. It accepts `ready` (timed updates about every 30 ms) or `update` (handshake) and `refresh` from the child. **Any other line from the child is executed as a command.** The bridge can therefore stand in for `eniactk` without changing the core.
- **Speed:** `s cy.op co|1a|1p` selects continuous, one-addition or one-pulse mode. `s cy.rate N` throttles the cycle rate, and `0` means unthrottled. This is what makes slow-motion and fast-forward possible.
- **Programs:**
  - `sq.e`: 13 cables and 12 switches. It computes the next square each time INIT is pressed (Acc 1: x→x+1, Acc 2: x²→(x+1)²), so each INIT press produces one step. Verified by running it: 1/1, 2/4, 3/9, 4/16. `sq2.e` is the looping variant. Results show **on the accumulator lamps only**, because it has no punch wiring. Start with INIT.
  - `sieve.e`: 268 cables and 286 switches. Based on Lehmer's July 1946 runs, as reconstructed by De Mol and Bullynck. It **punches a card for each prime from 3 to 2801**. Start with INIT.
  - `trajdemo.e`: 297 cables and 443 switches. It reads `demo.card` (the constants card) via READ, then runs a sequence of parts, one per INIT: 97367 added to itself 5000 times; the same at a 100 Hz clock; multiplier demos; a squares-and-cubes table that is printed; sine and cosine of 100 angles; and an artillery trajectory. It punches cards.
- **Known bug:** `src/mult.go:66` formats the multiplier stage as `"%2d "`, which breaks space-split parsing. The fix is `"%d "`.

---

## 4. Functional Requirements

Priorities: **P0** = MVP, **P1** = before the floor, **P2** = nice to have.

### 4.1 Simulator bridge

**User story:** As a visitor, I want what I see on screen to be the real simulated ENIAC responding to my actions, so that I'm actually programming it and not watching a recording.

| ID | Requirement | Pri |
|---|---|---|
| FR-01 | The bridge launches the core (`src/eniac -v <bridge-child>`) and acts as its display child. It sends `ready` and translates the status stream into websocket messages for the front end. | P0 |
| FR-02 | The bridge accepts a small, whitelisted set of front-end actions: start mission, apply step N, set speed, READ, INIT, CLEAR, stop, and reset. It translates these into core commands. It never forwards free-form command text from the browser. | P0 |
| FR-03 | Each mission start runs in a **fresh core process** loaded with the mission's preset configuration, because the core can't unplug. Target: ready in ≤ 3 s (NFR-03). | P0 |
| FR-04 | The status parser tolerates both the patched and unpatched multiplier format (`"%d "` and `"%2d "`). It never crashes on an unexpected line. Unknown lines are logged and dropped. | P0 |
| FR-05 | The bridge detects a core exit, hang (no status for a configurable interval while running) or error. It reports `core_down` to the front end and attempts a restart, up to 3 times in 5 minutes. | P0 |
| FR-06 | Punched-card output (`punch` lines) is delivered to the front end in order, as distinct cards. | P0 |
| FR-07 | The bridge exposes a local health endpoint (HTTP on the LAN): core up, core PID, uptime, restarts, last error, version, CPU temperature, throttling flags. | P1 |

### 4.2 Missions (general)

**User story:** As a visitor with no background, I want a step-by-step guide that tells me what to touch and why, so that I can program ENIAC myself in a few minutes.

**Flow (every mission):**
1. The intro card explains what the mission computes and why it mattered, in one or two sentences.
2. Guided setup: the view zooms to the relevant panel area. The visitor does each **key step** (plug a cable, set a switch). Each step has a one-line explanation, with an optional "Tell me more".
3. "The rest is done for you": an animated summary shows the preset cables and switches being placed, with a count (for example, "268 more cables").
4. Run: the visitor presses the on-screen READ (if the mission needs it) and INIT. Lamps animate and cards appear.
5. Result: what happened, a one-line takeaway, and "Next mission" / "Try again" / "Menu".

| ID | Requirement | Pri |
|---|---|---|
| FR-10 | **Target length:** Squares 2–3 min, Primes 3–4 min, Trajectory 4–6 min at a normal pace. All three together should take ≤ 15 min. | P0 |
| FR-11 | **Visitor-performed steps:** Squares has 6–8 key steps (most of the 13 cables and 12 switches are visitor-done or batched). Primes has 3–5. Trajectory has 3–5, plus READ. Everything else is preset. Exact step lists are chosen in UX design. | P0 |
| FR-12 | **Plugging interaction** is tap-tap: tap the highlighted source jack, then the highlighted destination. Drag is optional and never required. The cable draws between the jacks. | P0 |
| FR-13 | **Switch interaction:** tap a switch to open a large picker showing only the valid positions, then tap the position. Rotary switches must never need a precise rotate gesture. | P0 |
| FR-14 | **Guided correctness:** only the correct target is accepted. A wrong tap gives a gentle hint and no command is sent to the core. After 2 wrong taps the target pulses. After 3, a "Do it for me" button appears. The core configuration therefore always matches a known-good `.e` state. | P0 |
| FR-15 | **Skip:** every mission offers "Skip setup, just run it" (from any step) and "Do this step for me" (per step). | P0 |
| FR-16 | **Speed control while running:** at least *Slow* (watch the lamps count; uses `s cy.rate` or 1A stepping) and *Full speed*. Plus "Skip to the answer", which runs unthrottled and jumps to the result. | P0 |
| FR-17 | Squares starts slow enough that the visitor can read successive squares in accumulator 2 (target: about 1–3 per second). A prompt suggests switching to full speed. | P0 |
| FR-18 | Primes shows each punched card as it appears, with a running count and the latest prime. It reaches the result screen when the run completes, or on "Skip to the answer". | P0 |
| FR-19 | Trajectory presents READ first (the constants card, shown as a card image with its data). Then each demo part gets its own INIT with a one-line caption ("Adding 97,367 to itself 5,000 times…"). The visitor can fast-forward within a part and skip remaining parts to the trajectory. | P1 |
| FR-20 | **Lamps:** accumulator neons, the master programmer, the cycle mode and the initiating unit update live from core status. They must be legible at arm's length (digit lamps ≥ 12 px, NFR-06). | P0 |
| FR-21 | **Card output pane:** cards appear as punched-card graphics with the printed digits, newest on top. The last 20 are kept on screen. | P0 |
| FR-22 | **Text:** ≤ 40 words per step card, at a grade 6–8 reading level. "Tell me more" holds optional depth of ≤ 120 words. All history claims go through the vcf-museum Fact-Checker before the floor. | P1 |
| FR-23 | The mission menu shows all three missions, **all unlocked**, with the suggested order marked (1 → 2 → 3). | P0 |
| FR-24 | Missions are **data, not code**. Each mission is a definition file that references an unmodified upstream `.e` file, marks which lines are visitor steps, and holds the step text. Adding cube.e later should need only a new definition file and review. | P1 |

### 4.3 Attract and idle

| ID | Requirement | Pri |
|---|---|---|
| FR-30 | **Attract mode** is the home state. It shows a **live** simulator run (for example, trajdemo or squares at a visible speed), a clear call to action ("Touch to program ENIAC"), and the Stuart credit. It must not use a canned video or animation. | P1 |
| FR-31 | Any touch in attract goes to the mission menu. The first touch never triggers a mission action. | P0 |
| FR-32 | **Inactivity:** 90 s with no touch during setup shows a "Still there?" overlay with a 15 s countdown and a large "I'm here" button, then resets to attract. While a computation is running the timeout is 3 min, because people watch. Both values are configurable. | P0 |
| FR-33 | A reset kills and restarts the core session and clears all visitor state. The next visitor always starts clean. | P0 |

### 4.4 Credit and about

| ID | Requirement | Pri |
|---|---|---|
| FR-40 | A persistent footer on every visitor screen reads: "ENIAC simulator by Brian L. Stuart, Drexel University". | P0 |
| FR-41 | An About screen (one tap from the menu) credits Stuart and his paper "Simulating the ENIAC" (IEEE), with a QR code to his simulator page. It credits the primes mission source (Lehmer, July 1946; De Mol and Bullynck's reconstruction) and the Feb 15, 1946 demo for the trajectory mission. It also credits the VCF museum. The wording is approved by Doug Crawford (the museum's approver for exhibit copy). | P1 |
| FR-42 | Upstream panel photographs (`images/`) are used only once Stuart's permission covers them. Otherwise original artwork is used (R1). | P1 |

### 4.5 Error state (no demo fallback)

| ID | Requirement | Pri |
|---|---|---|
| FR-50 | If the core or bridge is down, or the websocket is disconnected for more than 5 s, the screen shows an **error state**: "ENIAC is resting. Please let a docent know," plus a small status code. It never shows canned lamps, recorded runs or fake cards. | P0 |
| FR-51 | The error state retries automatically (FR-05). It returns to attract on recovery without staff action. | P0 |
| FR-52 | After the retry budget is exhausted, the error state stays up and shows the staff recovery instruction from the runbook (for example, "Staff: tap the top-left corner 5 times and choose Restart"). | P1 |

### 4.6 Metrics

| ID | Requirement | Pri |
|---|---|---|
| FR-60 | Anonymous local counters are recorded: session start and end, mission start and complete per mission, steps done-for-me, setup skipped, run fast-forwarded, idle resets, error-state entries and duration. They're stored on the box (for example, SQLite or JSONL) and retained for ≥ 1 year. | P1 |
| FR-61 | The admin screen shows today's, the last 7 days' and all-time metrics (Section 1.5), with a CSV export to a USB stick. | P1 |

### 4.7 Operator and admin

**User story:** As museum staff, I want to check, restart and update the kiosk without a laptop or Nick, so that the exhibit stays up on my own.

| ID | Requirement | Pri |
|---|---|---|
| FR-70 | **Admin escape:** 5 taps in the top-left corner within 3 s opens a PIN pad. The PIN is set on the box and held by the museum. A wrong PIN returns to the visitor screen. Visitors can't reach it by accident. | P0 |
| FR-71 | **The admin screen** shows health (core, bridge, uptime, restarts, last error, CPU temperature, under-voltage or throttling flags), the version, and metrics. | P1 |
| FR-72 | **Admin actions:** restart the simulator, restart the app, reboot, shut down (safe power-off), run a mission in docent mode (no idle timeout, skip visible), and return to the kiosk. | P0 |
| FR-73 | **Updates:** "Install update" installs a released version from a USB stick, or from the network if one is reachable. The previous version is kept and "Roll back" is one tap. An update never needs SSH or a terminal. | P1 |
| FR-74 | The admin screen auto-exits after 2 min without a touch. | P0 |
| FR-75 | **Docent demo mode** (FR-72) runs any mission with all steps auto-played at a readable pace. It's for talks and for a staff check after a restart. | P2 |

### 4.8 Dev/test coexistence on the Model 4 kiosk

| ID | Requirement | Pri |
|---|---|---|
| FR-80 | While testing on the Model 4 kiosk's Pi 5, the ENIAC app **must not disrupt the Model 4 kiosk's own Chromium kiosk**. It must not replace its autostart, change its display, input or network configuration, bind its ports, or change its user's settings. It runs only when started explicitly and leaves the Model 4 kiosk in front when stopped. | P0 |
| FR-81 | Installing on the test box is one scripted command. Every file, package and service it adds is recorded in a manifest. | P0 |
| FR-82 | **Removal** is one scripted command. It removes everything in the manifest, including the `/opt/eniac-simulator` trial install, its `kiosk`-owned files, services, autostart entries, and packages added solely for ENIAC (such as `tk`, if nothing else needs it). It verifies that nothing is left behind and reports what it removed. | P0 |
| FR-83 | After removal, a reboot of the Model 4 kiosk comes up into its own kiosk, unchanged. This is verified by a checklist before the floor (G3). | P0 |

---

## 5. Touch and UX Requirements

| ID | Requirement |
|---|---|
| UX-01 | All interactive targets are ≥ 64×64 CSS px (about 11.5 mm on a 15.6" 1080p panel), with ≥ 16 px between targets. Primary actions (READ, INIT, Next, Skip, I'm here) are ≥ 96 px tall. |
| UX-02 | Panel jacks and switches are drawn small for realism, but their **hit areas** are enlarged to ≥ 64 px. Each step zooms the view so that only the relevant jacks are active. |
| UX-03 | **No hover** states carry meaning. **No long-press, double-tap, pinch or multi-finger gesture** is required. Actions fire on touch release. |
| UX-04 | **Gloves and small hands:** targets and tolerances work with winter gloves on a capacitive panel. Test with gloves and with a child tester (NFR-09). |
| UX-05 | **No keyboard** anywhere in the visitor UI. On-screen keyboards are disabled. The only numeric entry is the admin PIN pad. |
| UX-06 | **No accidental exits:** browser gestures (swipe back, pull-to-refresh, pinch-zoom), the context menu, text selection, drag-out and link navigation are all disabled. Palm or multi-touch contact doesn't trigger actions (only the first touch point counts). No visitor path leaves the app. |
| UX-07 | Rapid repeated taps are debounced. A second tap on INIT while running doesn't queue duplicate `b i` commands unless the mission step expects it. |
| UX-08 | Visual feedback within 100 ms of every touch. |
| UX-09 | Colour is never the only cue (for example, the highlighted target also pulses or shows an arrow). Text contrast meets WCAG 2.1 AA. |
| UX-10 | A visible "Back to missions" and "Start over" are always available during a mission. "Start over" confirms first. |
| UX-11 | Landscape layout for a 15.6" 1920×1080 panel, and it must scale to the production screen (Q2). |

---

## 6. Non-Functional Requirements

| ID | Area | Requirement |
|---|---|---|
| NFR-01 | Offline | Runs fully with no internet. All fonts, images and scripts are local. The LAN is only used for the health endpoint and optional updates. It works with the network cable unplugged. |
| NFR-02 | Boot-to-kiosk | Power-on reaches attract with no login, keyboard or touch. This avoids the existing exhibit's `login:` failure. Target: ≤ 60 s from power-on. It also recovers unattended from a power cut mid-run. |
| NFR-03 | Responsiveness | Touch feedback ≤ 100 ms. A mission's fresh core is ready in ≤ 3 s. |
| NFR-04 | Rendering | Lamp and card updates are rendered at ≥ 20 fps sustained on the Pi 5 in all three missions, including the sieve and trajdemo at full speed. The front end may coalesce updates (the core emits about every 30 ms in timed mode). |
| NFR-05 | Stability | No memory growth that needs a restart over 7 days of continuous attract and mission cycling, measured by a soak test. (Upstream needed the `-K` restart hack for Tk on ARM; the web stack must not inherit that.) |
| NFR-06 | Legibility | Lamp digits and card text are readable at about 1 m. Body text is ≥ 24 px and step headlines ≥ 36 px. |
| NFR-07 | Uptime | ≥ 99% of open hours available without staff action (Section 1.5). A nightly scheduled restart is allowed, at 03:00 by default. |
| NFR-08 | Hardware health | The Pi 5 uses an official 27 W supply and an active cooler, and shows no under-voltage or thermal-throttle flags under sustained full-speed runs. (The existing ENIAC Pi logs `get_throttled 0x50000`.) |
| NFR-09 | Usability testing | Before the floor: ≥ 5 walk-up testers including ≥ 1 child aged 8–12, ≥ 1 adult over 65, and ≥ 1 gloved session. At least 4 of 5 must complete Squares without help. |
| NFR-10 | Security | No inbound services beyond the health endpoint (read-only) and the local websocket (bound to localhost). The admin PIN is not in the repo. There are no default credentials, and museum-held credentials are documented in the runbook's secure section, not in the wiki. |
| NFR-11 | Privacy | No cameras, no microphones, no personal data, no network telemetry. |
| NFR-12 | Upstream fidelity | Stuart's core is used unmodified apart from the `mult.go` fix, pinned to a recorded upstream commit. Upstream updates are adopted deliberately, never automatically. |

---

## 7. Technical Requirements (the what, not the how)

- **Stack:** Go (bridge, wrapping the upstream core as a child process), a web front end served locally to Chromium in kiosk mode, and systemd for service supervision. The architecture document owns the details.
- **Upstream handling:** the kiosk repo pins an upstream commit and applies the `mult.go` patch at build time. It doesn't vendor Stuart's source into a public repo until permission is granted (R1).
- **Data:** mission definitions (FR-24), a local metrics store (FR-60), config (timeouts, PIN hash, speeds), and logs rotated to a bounded size.
- **Environments:**
  - *Dev/test:* the Model 4 kiosk Pi 5 (coexisting per FR-80–83), plus the Mac for UI work.
  - *Production:* the dedicated Pi 5 with a touchscreen, provisioned by a documented and repeatable script from a fresh Pi OS trixie arm64 image.

---

## 8. Ownership Transfer (hard constraint)

Nick must not stay in the loop. The kiosk doesn't ship to the floor until all of these are done:

| ID | Requirement |
|---|---|
| OT-1 | A named museum owner accepts the kiosk (Q1). |
| OT-2 | A **runbook** (1–2 pages, printed and kept at the front desk, plus a digital copy) covering: what the kiosk is, the daily on/off routine, what the error state means, the admin escape, restart, reboot, update, rollback, reinstall from scratch, who to call, and warranty/parts for the hardware. |
| OT-3 | A **sticker** on the kiosk with the 3-line recovery procedure (in the tradition of the existing "If Pi is at prompt…" sticker, but with no credentials on it). |
| OT-4 | Credentials (OS admin, admin PIN, any repo or release access) are created for and held by the museum, and Nick's personal keys are removed or documented as optional. |
| OT-5 | Source code and releases live in a location the museum controls or can access without Nick (Q5). |
| OT-6 | A **handoff drill**: a staff member, unassisted, cold-boots the kiosk, recovers it from a forced core crash, and installs an update and a rollback. |
| OT-7 | A 2-week floor trial with metrics reviewed by the museum owner, and no Nick intervention needed. |

---

## 9. Dependencies, Risks and Gating Items

### 9.1 Dependencies and risks

| ID | Item | Impact | Mitigation |
|---|---|---|---|
| R1 | **Licensing / permission from Brian L. Stuart.** The upstream repo has no license. Running it at the museum is fine. Publishing a fork, baking it into a redistributable image, or reusing `images/` photographs needs his permission. | It could block a public repo, image distribution, and the use of upstream panel photos. | Ask Stuart early, bundled with the bug report (R2). Keep the kiosk repo private and fetch upstream at build time until he answers. Plan original panel artwork as a fallback (FR-42). |
| R2 | **Report the `mult.go` bug upstream.** `src/mult.go:66` uses `"%2d "`, which crashes `eniactk` at `eniactk.go:785` the first time the multiplier runs. The fix is `Sprintf("%d ", stage)`. It's confirmed on the trial box. Nothing has been sent yet. | Other users of eniactk are affected. Our fork carries a patch indefinitely. | Send an issue or email with the diff and repro (owner: Nick, before MVP sign-off). The bridge tolerates both formats (FR-04). |
| R3 | Pi 5 performance for the sieve and trajdemo at full speed while rendering. | Mission length and fps targets may be missed. | Measure in Milestone 1. Use speed control (FR-16) and update coalescing. |
| R4 | Fast-forward and skipping trajdemo parts may be limited by the program's master-programmer sequencing. | FR-19 may need a different approach. | Architecture spike in Milestone 1. The fallback is unthrottled rate plus a condensed caption. |
| R5 | Dev on shared hardware (the Model 4 kiosk). | Could disrupt a live exhibit. | FR-80–83, and test only when the Model 4 kiosk isn't needed on the floor. |
| R6 | Historical accuracy of mission text. | A wrong claim on the floor. | Fact-Checker review, and Doug's approval of the copy (FR-22, FR-41). |

### 9.2 Gating items before the floor

| ID | Gate |
|---|---|
| G1 | Production runs on the **dedicated Pi 5** with its touchscreen. It's no longer on the Model 4 kiosk. |
| G2 | **The ENIAC app and the earlier trial install are removed from the Model 4 kiosk.** This includes `/opt/eniac-simulator`, `scripts/eniac-try.sh` artifacts, services and autostarts, and ENIAC-only packages. Use FR-82 and verify with FR-83. |
| G3 | The Model 4 kiosk is verified unchanged after removal (it reboots into its own kiosk). |
| G4 | The ownership transfer (OT-1 to OT-7) is complete. |
| G5 | R1 is resolved, or the shipped build is confirmed to need no permission (private repo, no redistribution, no upstream images). |
| G6 | The `mult.go` report has been sent (R2). |
| G7 | NFR-05 soak test and NFR-09 usability test passed. |

---

## 10. Milestones

| Phase | Scope | Exit criteria |
|---|---|---|
| **M1: MVP (one mission end to end)** on the Model 4 kiosk (test) | Bridge (FR-01–06), fresh-core-per-mission, **Squares** mission with guided plugging and switches, skip, speed, live lamps, error state (FR-50–51), credit footer, idle reset, clean install and removal (FR-80–83). Spikes: Pi 5 performance for the sieve and trajdemo (R3), and trajdemo fast-forward (R4). | A visitor can do Squares start to finish by touch. Killing the core shows the error state and it recovers. Removal leaves the Model 4 kiosk unchanged. |
| **M2: All missions** | Primes and Trajectory missions, card output, READ flow, mission-definition format (FR-24), attract mode, About screen, text through Fact-Checker. | All three missions meet their length targets (FR-10) and NFR-04. |
| **M3: Operable** | Admin escape and screen, health endpoint, update and rollback, metrics, boot-to-kiosk hardening, soak test. | NFR-02, NFR-05 and NFR-07 pass on the test box. |
| **M4: Production hardware and handoff** | Provision the dedicated Pi 5, usability test, runbook, sticker, credentials, handoff drill, remove from the Model 4 kiosk. | G1–G7 all pass. |
| **M5: Floor trial** | 2-week trial, metrics review, fixes. | OT-7 met, and the museum owner signs off. |

---

## 11. Assumptions

- The dev touchscreen (15.6", 1920×1080, wch.cn multitouch) is representative of the production screen.
- Chromium on Pi OS trixie arm64 is the same runtime the other museum kiosks use.
- The core runs unmodified (except `mult.go`) as a child of the bridge, using its existing `-v` display protocol.
- The museum allows a small always-on exhibit with its own power and wired LAN.
- Visitors engage for minutes, not tens of minutes, which is why the mission lengths are short.

---

## 12. Open Questions (defaults applied in this draft)

| # | Question | Default used in this PRD | Whose call |
|---|---|---|---|
| Q1 | Who is the named museum owner for the kiosk? | Doug Crawford, as exhibit approver, until someone else is named | Doug / museum |
| Q2 | **Dedicated Pi 5 procurement and timing:** who buys it (and the touchscreen, case, 27 W PSU, active cooler), budget, screen size and orientation, mounting, and a date before the floor? | Pi 5 8 GB, 15.6" 1080p landscape capacitive touchscreen matching the dev panel. Procurement is needed before M4. | Nick / Doug |
| Q3 | Where does it go on the floor? Next to the existing ENIAC exhibit Pi (10.130.10.27) as a companion, or replacing it? | A companion next to the existing exhibit. The existing Pi is untouched. | Doug |
| Q4 | Mission lengths and how many steps the visitor does (FR-10, FR-11) | Squares 2–3 min / 6–8 steps, Primes 3–4 min / 3–5 steps, Trajectory 4–6 min / 3–5 steps + READ | Nick (to validate in usability testing) |
| Q5 | Where does the code live long-term: Nick's GitHub, or a VCF-controlled org? Public or private? | Private repo, with the museum owner granted access at handoff. It goes public only after R1. | Nick / Doug / Stuart |
| Q6 | Idle timeouts (FR-32) | 90 s in setup, 3 min while running, 15 s "Still there?" countdown | Nick |
| Q7 | Operating hours: power on and off with the museum lights, or always on? | Always on, with a nightly 03:00 restart | Museum staff |
| Q8 | Sound (relay clicks, card punch)? | No sound in v1 | Nick / Doug |
| Q9 | Languages other than English, and screen-reader/audio description? | English only. Visual accessibility per UX-09 only. | Doug |
| Q10 | Credit wording, and should the ENIAC programmers (such as the six women who programmed it) be credited on the About screen? | Stuart credit per FR-40/41. People credits are proposed to the Fact-Checker and Doug. | Doug |
| Q11 | If Stuart declines permission for the `images/` photographs, is original artwork acceptable? | Yes. Plan for original artwork if needed. | Nick |
| Q12 | Admin escape gesture and PIN | 5 taps top-left within 3 s, then a museum-set PIN | Museum staff |
| Q13 | Mission gating: free choice, or must Squares come first? | All unlocked, with the suggested order marked | Nick |
| Q14 | Updates: USB-only, or network pull from GitHub when the LAN has internet? | Both, with USB as the guaranteed path | Museum IT volunteer |

---

## 13. Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1 | 2026-09-30 | Nick DeMarco with AI assistance | Initial draft from the VCF handoff, first-session decisions, the dev-on-Model-4 hardware update, and an upstream code review |
