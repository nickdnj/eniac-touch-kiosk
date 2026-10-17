# Product Requirements Document: ENIAC Touch Kiosk

**Version:** 0.6
**Last Updated:** 2026-10-02
**Author:** Nick DeMarco with AI assistance (product-requirements agent)
**Status:** Draft

**Sources:** `docs/ux-spec.md` v0.6 section 14 (the screens for the items added in 0.4); `docs/handoff-from-vcf.md` (including the Decisions of 2026-09-30); wiki `teams/vcf-museum/eniac-exhibit.md` and `teams/vcf-museum/_team.md`; upstream `blstuart/eniac-simulator` at commit `c4b94f2` (2026-09-22): `README.md`, `src/eniac.go`, `src/engine.go`, `src/cycle.go`, `vis/eniactk.go`, `programs/{sq,sieve,trajdemo,cube}.e`.

---

## 1. Overview

### 1.1 Problem

The VCF museum at InfoAge runs Brian L. Stuart's pulse-level ENIAC simulator on an older Pi (<museum-lan>.27). It auto-cycles views of `trajdemo.e`, so visitors take it for a video. Nobody can interact with it. The upstream Tk front end (`eniactk`) has tiny buttons (`butparam`, the Clean 10 font, `-pady 0`), no guidance, and a Tk memory problem on ARM. It isn't usable by walk-up visitors on a touchscreen.

The simulator is the real thing: every jumper cable and switch of the 1946 machine. What's missing is a way for a museum visitor to program it themselves. That means plugging cables, setting switches, pressing READ and INIT, and watching the neon lamps and punched cards.

### 1.2 Goal

Build a touch-first kiosk that takes a walk-up visitor through three guided missions: **squares → primes → the 1946 trajectory demo**. In each mission the visitor does the key plugging and switch steps, with plain-language explanations along the way. Then they run the machine and see the result. It runs unattended on a dedicated Pi 5, and the museum staff operate it without Nick.

Version 0.4 adds four things for the museum install (Nick, 2026-10-02): a **live attract mode** (the idle screen is the real simulator running), a **finale** after the missions, **honor screens** that credit Brian L. Stuart prominently and the people who built and programmed the original ENIAC, and **Explore ENIAC**, a plain-language walkthrough of the whole machine with a glossary.

### 1.3 Settled decisions (not re-opened here)

| # | Decision |
|---|---|
| D1 | A new **web front end** rendered in Chromium, like the other museum kiosks. A **Go websocket bridge** wraps Stuart's simulator core. Tk `eniactk` is reference only. |
| D2 | **Guided missions:** squares → primes → the 1946 trajectory demo. Each mission covers its key plugging and switch steps with explanations, then READ → INIT → lamps and card output. |
| D3 | **Production hardware** is a new dedicated Pi 5 with a touchscreen. **Dev and test hardware** is the Model 4 kiosk's Pi 5 for now (<museum-lan>.37 Wi-Fi / .36 wired, the current trial install). *(0.4: the production screen is a **24-inch landscape touch panel on the museum's existing mount**, which today shows the old simulator as static screens. Which computer drives it is open, Q15.)* |
| D4 | **Install target (0.4):** the first museum install is the **M3-lite** milestone (10.1): the three missions, live attract and the honor roll on the 24-inch screen, targeted for the week of 2026-10-05. It is a supervised preview, not the ownership handoff (M4). |

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
| Explore reach (0.4) | Sessions that open Explore ENIAC ÷ sessions; median unit cards viewed per Explore visit | Baseline in weeks 1–2 (no target yet) |
| Finale reach (0.4) | Sessions that reach the finale ÷ sessions that finish their 1st mission; honor-roll page views per open hour | Baseline in weeks 1–2 (no target yet) |
| Availability | Open-hours minutes not in the error state and not needing staff action | ≥ 99% |
| Operational independence | Nick interventions needed after handoff | 0 |

---

## 2. Scope

### 2.1 In scope (v1)

- A Go websocket bridge that runs the unmodified upstream core (plus the local `mult.go` fix) and relays commands and status.
- A web front end: **live attract mode**, mission menu, three guided missions, run view (lamps and punched cards), **finale**, **About and honor roll**, **Explore ENIAC with a glossary**, error state, and a hidden admin screen.
- Mission content (step text, explanations, "tell me more") for squares, primes and trajdemo.
- Explore ENIAC content: a card for each unit of the machine, mission cross-links, a glossary (all [FC]-tagged for the Fact-Checker and Doug Crawford), and the honor-roll text.
- Boot-to-kiosk install on Pi OS (trixie arm64), with health, auto-restart, update and rollback.
- Clean install and removal on the Model 4 kiosk for dev and test (FR-80–83).
- A runbook, staff training and handoff (Section 8).
- An upstream bug report for `mult.go` and a permission request to Stuart.

### 2.2 Out of scope (v1)

- Free-play mode (arbitrary plugging of the whole machine, or loading arbitrary `.e` files) for visitors.
- Missions beyond the three, such as cube.e, hellorld.e and turing.e. The design should make adding them a content task, not a code change (FR-24).
- 3D/first-person views (`eniacfp`, `eniac3d`, `eniact5`) and the GPIO control station (`-c`). The Explore ENIAC panorama is a flat, drawn elevation of the room, not a 3D view.
- Photographs of people or of the real ENIAC on the honor screens (rights are not cleared); the honor roll uses engraved-plate typography.
- Replacing or modifying the existing ENIAC exhibit Pi at <museum-lan>.27. Its autologin and under-voltage fixes are tracked on the wiki page, not here.
- Remote/cloud monitoring, accounts, online analytics, internet dependency.
- Sound, multiple languages, and screen-reader support (see Open Questions).
- Publishing a public fork or a redistributable image of Stuart's code until permission is granted (R1).
- Changes to Stuart's simulator semantics. The only core patch is the `mult.go` format fix.

### 2.3 Constraints

- **Hardware:** Pi 5 (8 GB on the dev box). The dev touchscreen is a 15.6" USB panel with a wch.cn multitouch controller, assumed 1920×1080 landscape. **The production screen is a 24" landscape touch panel on the museum's existing mount** (0.4); its native resolution, touch technology and mounting height are to be confirmed (Q2, Q16). Assumed 1920×1080 until then. The design is authored at 1920×1080 and scaled as one unit, so a 24" 1080p panel makes every touch target physically larger than on the dev panel (a 64 px target is about 17.7 mm there, 11.5 mm on the dev panel).
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
| FR-17 | Squares starts slow enough that the visitor can follow each addition in accumulator 2: at *Slow* (`cy.rate 13`, spike S4) each of the three additions of a press stays visible for about 1 s, and one press takes about 13 s. The table of squares grows at *Full* (with "Keep pressing for me", about 2 squares per second). A prompt suggests switching to full speed. *(Changed in 0.3: the earlier "about 1–3 squares per second" target cannot be read at all; S4 measured the per-step target instead.)* | P0 |
| FR-18 | Primes shows each punched card as it appears, with a running count and the latest prime. Its answer is **card 100 (prime 547)**: the result screen appears there (about 1 min at Full; the punch paces the sieve at 0.6 s a card, so all 407 cards take about 4 min). The result screen stays live and keeps counting to 407 ("ENIAC has found them all"). "Skip to the answer" sets Full and goes to the result screen at once, which waits with a real count until card 100. | P0 |
| FR-19 | Trajectory is **READ, then INIT, then one flight of 34 cards**. READ first (the constants card, shown as a card image with its real data from `demo.card`); one READ tap sends `b c` and then `b r` (the CLEAR prevents an all-zero first card, spike S2). Then a single INIT starts the artillery trajectory, and the arc is drawn dot by dot from the real punched cards (one card per hop). INIT is pressed once: a second INIT mid-flight corrupts the flight (S2), so it stays disabled. On the landing card (the first with `-` in column 71) the bridge freezes the machine with `s cy.op 1a`; the mission never sends a second INIT. Full speed only, with no speed control (Full is already unthrottled; nothing is faster). *(Changed in 0.3. The original "each demo part gets its own INIT, fast-forward within a part, skip to the trajectory" cannot work with the unmodified `trajdemo.e`: at every upstream revision, including today's HEAD, INIT is wired straight to the trajectory and the other five parts are unreachable (S2). **Plan B** (UX 8.3.8): if Stuart publishes a `trajdemo.e` that steps through its parts, the six-part run with one INIT per part, a one-line caption each ("Adding 97,367 to itself 5,000 times…") and "Skip to the trajectory" comes back as a mission change, not a code change.)* | P1 |
| FR-20 | **Lamps:** accumulator neons, the master programmer, the cycle mode and the initiating unit update live from core status. They must be legible at arm's length (digit lamps ≥ 12 px, NFR-06). | P0 |
| FR-21 | **Card output pane:** cards appear as punched-card graphics with the printed digits, newest on top. The last 20 are kept on screen. | P0 |
| FR-22 | **Text:** ≤ 40 words per step card, at a grade 6–8 reading level. "Tell me more" holds optional depth of ≤ 120 words. All history claims go through the vcf-museum Fact-Checker before the floor. | P1 |
| FR-23 | The mission menu shows all three missions, **all unlocked**, with the suggested order marked (1 → 2 → 3). | P0 |
| FR-24 | Missions are **data, not code**. Each mission is a definition file that references an unmodified upstream `.e` file, marks which lines are visitor steps, and holds the step text. Adding cube.e later should need only a new definition file and review. | P1 |

### 4.3 Attract and idle

**User story:** As a passer-by, I want the screen to show the real machine working, so that I'm curious enough to touch it, and I want it to say whose simulator it is.

| ID | Requirement | Pri |
|---|---|---|
| FR-30 | **Live attract** is the home state (S1). It shows the **real simulator running** (FR-34): live lamps in a panorama of the machine, a live shell's-path plot built from the real punched cards, a live caption, the call to action "Touch to program ENIAC", a plate crediting Brian L. Stuart (FR-43) and a rotating plate honoring the original programmers and builders (FR-44). It must not use a canned video, a recorded run or any animation of machine state that does not come from the core (no demo fallback). **M3-lite ships "attract-lite":** the same live run drawn with the existing Trajectory widgets (arc plot, Accumulators 15, 18 and 20 lamp grids, caption) instead of the full panorama; the panorama replaces it when Explore ENIAC ships (UX 14.2). | P1 (P0 as attract-lite for M3-lite) |
| FR-31 | Any touch in attract goes to the mission menu. The first touch never triggers a mission action. | P0 |
| FR-32 | **Inactivity** (all values configurable). **Setup screens and the menu** (S2, S3 to S5, S11, S15): 90 s with no touch shows a "Still there?" overlay with a 15 s countdown and a large "I'm here" button, then returns to attract. **Explore ENIAC (S14): 120 s**, because visitors read cards. **While a computation is running: 3 min**, because people watch. **Attract: no timeout.** **Finale:** its own timers (FR-45). | P0 |
| FR-33 | A reset kills and restarts the core session and clears all visitor state. The next visitor always starts clean. (A reset from a screen that has no mission session, such as S14 or S11, only returns to attract; the attract session keeps running.) | P0 |
| FR-34 | **Attract program and loop.** The attract session runs **`trajdemo.e` with `drag.e`** (the same program as Mission 3 and as the museum's current exhibit) at **Full speed** (`cy.rate 0`; the trajectory has no useful Slow, spike S2). The bridge starts it like Mission 3's run: `b c`, then `b r`, then one `b i`, with every cable and switch preset and **no visitor steps**. At the **landing card** (the first card with `-` in column 71) the bridge freezes the machine with `s cy.op 1a` (as FR-19); the screen holds the finished plot for **8 s**; then the bridge ends the session and starts a fresh attract session. **One flight per core process**, so a loop is about 60 s (flight about 49 s on the Mac, S2; Pi 5 to be measured). The caption comes from the latest real card ("Live: ENIAC is working out a shell's path. Hop {n}"). Which program and why: UX 14.2.2. | P1 |
| FR-35 | **Hand-off.** A touch in attract opens the menu (S2); the **attract core keeps running** behind S2, S11, S14 and S15. Starting a mission ends the attract session and starts a fresh mission core (FR-03). After a mission, a reset or a finale, returning to attract starts a **new** attract session ("Waking ENIAC..." with dark lamps for up to 3 s, then live). | P1 |
| FR-36 | **Attract failure states (no demo fallback).** If no live status arrives for 5 s, the screen is the error state (FR-50). Between flights the panorama holds the last real frame dimmed with the caption "Starting another flight."; if the next session is not live in 5 s, the error state shows. A run with no new card for **20 s** is treated as a hang (FR-05). Attract never shows canned lamps, recorded runs or fake cards. | P0 |

### 4.4 Credit, honor and finale

**User story:** As Brian Stuart, the ENIAC programmers and the museum, we want to be credited where visitors will see it, and as a visitor I want a payoff after my missions.

| ID | Requirement | Pri |
|---|---|---|
| FR-40 | A persistent footer on every visitor screen reads: "ENIAC simulator by Brian L. Stuart, Drexel University". | P0 |
| FR-41 | **About and honor roll** (S11, one tap from the menu): four pages, each fitting one screen with no scrolling: (1) **Brian L. Stuart**: his name on an engraved plate, what he built, his paper "Simulating the ENIAC" (IEEE), a QR code and a printed URL to his simulator page; (2) **the first programmers**; (3) **the builders**; (4) **this exhibit**: the mission sources (Lehmer, July 1946, and De Mol and Bullynck's reconstruction, for Primes; the Feb 15, 1946 demo, for Trajectory) and the VCF museum. Wording approved by Doug Crawford (and, recommended, by Stuart for page 1). Replaces the single About screen of 0.3. (UX 14.6) | P1 (P0 for M3-lite: Stuart's page and the exhibit page) |
| FR-42 | Upstream panel photographs (`images/`) are used only once Stuart's permission covers them. Otherwise original artwork is used (R1). | P1 |
| FR-43 | **Stuart's credit is prominent**, not only a footer: a plate with his name at 56 px or larger on the attract screen (always on, never rotated), page 1 of the honor roll, and a beat of the finale. The copy says plainly that the exhibit depends on his simulator ("Without his work, this exhibit would be an empty screen"). | P0 |
| FR-44 | **Honor roll.** The people and bodies honored, as Nick specified: the six original ENIAC programmers (**Jean Jennings Bartik, Kathleen McNulty Mauchly Antonelli, Frances Bilas Spence, Marlyn Wescoff Meltzer, Ruth Lichterman Teitelbaum, Betty Snyder Holberton**); **J. Presper Eckert and John W. Mauchly**; **Herman and Adele Goldstine**; the **Moore School of Electrical Engineering, University of Pennsylvania**; and the **U.S. Army Ordnance and the Ballistic Research Laboratory**. It shows on honor-roll pages 2 and 3, as a rotating plate in attract, in the finale, and as links from the Trajectory result and from the Explore card for the program trays. Engraved-plate typography, **no photographs**. Every statement about a person is [FC]-tagged and approved by Doug before it shows (FR-46). | P1 |
| FR-45 | **Finale** (S8). Appears when the visitor taps **Finish** after **all three missions** have reached their result in this visit. Five beats, each advancing on tap or on a timer (15 to 20 s), skippable at any moment, at most 85 s in all: (F1) "You programmed ENIAC", with this visit's real results; (F2) the panorama with every unit the visitor used ringed (when Explore exists); (F3) the Stuart credit; (F4) the honor roll; (F5) thanks, with **Start over for the next visitor** and **Explore ENIAC**, returning to attract after 20 s. Every number comes from this visit's real runs or is left out. A finale with the core down keeps its static beats and skips F2 (UX 14.5). | P1 |
| FR-46 | **Content review notes (0.5: no longer a render gate).** Every block of new visitor text (unit cards, glossary, honor roll, finale) is data, easy to edit, and carries its [FC] claim and source as an **internal note** that is never shown. Review status does **not** stop a block from rendering: Nick's direction (2026-10-02) is to ship the whole exhibit with our best sourced wording (`docs/fact-check.md`), and to welcome corrections from Stuart, Doug and visitors ("if we miss something, that's fine"). The only exception is a block marked `hold: true`, for a claim nobody can stand behind yet; it is not rendered, and there is still no placeholder text on a museum screen (extends FR-22 and R6). | P0 |

### 4.5 Error state (no demo fallback)

| ID | Requirement | Pri |
|---|---|---|
| FR-50 | If the core or bridge is down, or the websocket is disconnected for more than 5 s, the screen shows an **error state**: "ENIAC is resting. Please let a docent know," plus a small status code. It never shows canned lamps, recorded runs or fake cards. | P0 |
| FR-51 | The error state retries automatically (FR-05). It returns to attract on recovery without staff action. | P0 |
| FR-52 | After the retry budget is exhausted, the error state stays up and shows the staff recovery instruction from the runbook (for example, "Staff: tap the top-left corner 5 times and choose Restart"). | P1 |

### 4.6 Metrics

| ID | Requirement | Pri |
|---|---|---|
| FR-60 | Anonymous local counters are recorded: session start and end, mission start and complete per mission, steps done-for-me, setup skipped, run fast-forwarded, idle resets, error-state entries and duration; and (0.4, FR-98) attract flights and touches, Explore visits and cards viewed, honor-roll pages and finale beats. They're stored on the box (for example, SQLite or JSONL) and retained for ≥ 1 year. | P1 |
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

### 4.9 Explore ENIAC and glossary

**User story:** As a curious visitor (or an adult learning ENIAC myself), I want to look along the whole machine and learn in plain words what each part does and which parts my missions used.

| ID | Requirement | Pri |
|---|---|---|
| FR-90 | **Explore ENIAC** (S14) is a pannable panorama of the whole machine: the **40 panels in a U (about 80 feet, [FC])**, with the layout taken from Stuart's simulator (UX 14.3.1): Initiating Unit, Cycling Unit, Master Programmer, the 20 accumulators, the Divider and Square-Rooter, the High-Speed Multiplier, three Function Tables with their portable tables, the Constant Transmitter with the IBM card reader, the Printer with the IBM card punch, and the **digit trays** (numbers) and **program trays** (control pulses) that connect them. Reached from the menu, from a mission briefing and result, and from the finale. | P1 |
| FR-91 | **Panning is by large tap targets**: left and right arrows (6 panels a step, each at least 96 x 200 px) and a **minimap strip** of the whole room (one target, at least 64 px high; tap a spot to go there). A one-finger horizontal swipe may be offered **as an extra, never required**, never taught on screen, and under 24 px of movement is still a tap. Nothing in Explore requires drag, pinch or any gesture (UX-03). | P1 |
| FR-92 | **A card for each unit**, shown in the rail when the visitor taps it (twelve cards: UX 14.3.6). Plain language at about a grade 5 to 6 reading level, **at most 40 words** (FR-22), every history or technical claim tagged [FC]. Each card names the missions that used the unit. Cards are data with review flags (FR-46). | P1 |
| FR-93 | **Mission cross-links, both ways.** A unit card links to the missions that use it; a mission chip rings and numbers every unit that mission uses (derived from the programs and mission files, never typed); the mission briefing and result link to Explore with their units ringed; Explore can start a mission. The tour teaches the vocabulary the missions use (accumulator, program pulse, data and program trunk, program control, and so on). | P1 |
| FR-94 | **Live-only lamps.** Where Explore shows lamps they are lit only from a live core; otherwise they are dark. With the core down but the bridge up, Explore keeps working as a static tour with every lamp dark and a visible notice ("Live lamps are off: ENIAC is resting. The tour still works."), and mission starts are disabled. With the websocket or bridge down it is the error state (FR-50). **Explore v0 may ship with no session at all** (all lamps dark). | P1 |
| FR-95 | **Walk the room**: a Previous / Next sequence through the twelve stops in teaching order, panning the room to each. | P1 |
| FR-96 | **Glossary** (S15): at least 14 terms, each at most 25 words, in two pages, with "Show me" links to the unit card. A term whose wording is unverified (the transceiver) is held and not shown (FR-46). A table in the UX spec maps the words the missions use to the words the real machine used (UX 15.1). | P1 |
| FR-97 | **Reduced motion.** The attract drift, the Explore pans and the finale animations are replaced by cross-fades when the box setting or the browser's `prefers-reduced-motion` asks for it (UX 14.7). | P1 |
| FR-98 | **Counters** for the new screens (FR-60): `attract_flight_started`, `attract_flight_landed`, `attract_touch`, `explore_open`, `explore_card{unit}`, `explore_walk_completed`, `explore_mission_chip{m}`, `glossary_open`, `honor_page_view{1..4}`, `finale_reached`, `finale_beat{n}`, `finale_skipped_at`. | P2 |
| FR-99 | **Keeping ENIAC alive** (S16, UX 14.11): five cards of at most 40 words each (the tubes; power and heat; why tubes burned out; the hunt; a week with ENIAC) and a one-card myth check, each with one drawn figure whose numbers come from the sourced table in `docs/tubes.md`. Reached from a button in the S14 header, from the glossary and from the finale (F2). Content is data with an internal `[FC]` note per claim (FR-46). | P1 |
| FR-100 | **Find the dead tube** is a **re-enactment**, never live state: a plate reading "RE-ENACTMENT" and "These panels are drawn, not the live ENIAC. The fault is made up." stays on screen in every state; it reads no core state; it follows the 1946 order (unit, circuit, tube); it uses the wrong-tap ladder, "Do it for me" and "Skip to the answer" of UX 5.2 and 5.3; three authored faults, no randomness. | P1 |
| FR-101 | Glossary adds **Vacuum tube**, **Plug-in unit** and **Kilowatt** and rewords **Neon lamp** (FR-96). Counters (FR-60): `tubes_open{screen}`, `tubes_card{n}`, `tubes_try_start{n}`, `tubes_try_step{n: 2..5}`, `tubes_try_done{n, assisted}` (n is the fault, assisted is "Do it for me"), `tubes_try_skip{n}`, `tubes_myth_open`. | P2 |

## 5. Touch and UX Requirements

| ID | Requirement |
|---|---|
| UX-01 | All interactive targets are ≥ 64×64 CSS px (about 11.5 mm on a 15.6" 1080p panel, **about 17.7 mm on the 24" 1080p production panel**), with ≥ 16 px between targets. Primary actions (READ, INIT, Next, Skip, I'm here) are ≥ 96 px tall. |
| UX-02 | Panel jacks and switches are drawn small for realism, but their **hit areas** are enlarged to ≥ 64 px. Each step zooms the view so that only the relevant jacks are active. |
| UX-03 | **No hover** states carry meaning. **No drag, long-press, double-tap, pinch or multi-finger gesture is required anywhere.** *(0.4)* The only gesture the app recognises is an **optional** one-finger horizontal swipe on the Explore ENIAC panorama (FR-91): it is never taught or labelled, it has a tap equivalent for everything it does (arrows, minimap, Previous and Next), and a drag under 24 px is still a tap. Actions fire on touch release. |
| UX-04 | **Gloves and small hands:** targets and tolerances work with winter gloves on a capacitive panel. Test with gloves and with a child tester (NFR-09). |
| UX-05 | **No keyboard** anywhere in the visitor UI. On-screen keyboards are disabled. The only numeric entry is the admin PIN pad. |
| UX-06 | **No accidental exits:** browser gestures (swipe back, pull-to-refresh, pinch-zoom), the context menu, text selection, drag-out and link navigation are all disabled. Palm or multi-touch contact doesn't trigger actions (only the first touch point counts). No visitor path leaves the app. |
| UX-07 | Rapid repeated taps are debounced. A second tap on INIT while running doesn't queue duplicate `b i` commands unless the mission step expects it. |
| UX-08 | Visual feedback within 100 ms of every touch. |
| UX-09 | Colour is never the only cue (for example, the highlighted target also pulses or shows an arrow). Text contrast meets WCAG 2.1 AA. |
| UX-10 | A visible "Back to missions" and "Start over" are always available during a mission. "Start over" confirms first. |
| UX-11 | Landscape layout authored at 1920×1080 and scaled as one unit. The dev panel is 15.6" (1920×1080); **the production panel is 24" landscape** (0.4; resolution to be confirmed, Q16). A 16:10 panel is letterboxed; a larger-pixel panel scales the vector art. Portrait is out of scope. |
| UX-12 | **Explore targets (0.4):** a unit is tapped on its whole block of panels (at least 176 × 400 px, hit area inset so neighbours are 16 px apart) or on its label chip (at least 176 × 80 px). Pan arrows are at least 96 × 200 px. The minimap is one target at least 64 px high. Mission chips are 64 px high. Previous and Next are 96 px high. |
| UX-13 | **Reduced motion (0.4):** under the box setting or `prefers-reduced-motion`, no screen slides, drifts or pulses; changes are cross-fades (FR-97). Nothing flashes more than 3 times a second (WCAG 2.3.1) in any case. |

---

## 6. Non-Functional Requirements

| ID | Area | Requirement |
|---|---|---|
| NFR-01 | Offline | Runs fully with no internet. All fonts, images and scripts are local. The LAN is only used for the health endpoint and optional updates. It works with the network cable unplugged. |
| NFR-02 | Boot-to-kiosk | Power-on reaches attract with no login, keyboard or touch. This avoids the existing exhibit's `login:` failure. Target: ≤ 60 s from power-on. It also recovers unattended from a power cut mid-run. |
| NFR-03 | Responsiveness | Touch feedback ≤ 100 ms. A mission's fresh core is ready in ≤ 3 s. |
| NFR-04 | Rendering | Lamp and card updates are rendered at ≥ 20 fps sustained on the Pi 5 in all three missions, including the sieve and trajdemo at full speed. The front end may coalesce updates (the core emits about every 30 ms in timed mode). |
| NFR-04b | Panorama rendering (0.4) | The attract and Explore panorama draws 40 panels but updates lamps **only for the panels on screen** (about 8 of 40). It sustains ≥ 20 fps on the Pi 5 at the production resolution, and attract on its own stays at or under 50% of one core. The panorama never lights a lamp that the core did not report. |
| NFR-05 | Stability | No memory growth that needs a restart over 7 days of continuous attract and mission cycling, measured by a soak test. (Upstream needed the `-K` restart hack for Tk on ARM; the web stack must not inherit that.) |
| NFR-06 | Legibility | Lamp digits and card text are readable at about 1 m. Body text is ≥ 24 px and step headlines ≥ 36 px. |
| NFR-07 | Uptime | ≥ 99% of open hours available without staff action (Section 1.5). A nightly scheduled restart is allowed, at 03:00 by default. |
| NFR-08 | Hardware health | The Pi 5 uses an official 27 W supply and an active cooler, and shows no under-voltage or thermal-throttle flags under sustained full-speed runs. (The existing ENIAC Pi logs `get_throttled 0x50000`.) |
| NFR-09 | Usability testing | Before the floor: ≥ 5 walk-up testers including ≥ 1 child aged 8–12, ≥ 1 adult over 65, and ≥ 1 gloved session. At least 4 of 5 must complete Squares without help. |
| NFR-10 | Security | No inbound services beyond the health endpoint (read-only) and the local websocket (bound to localhost). The admin PIN is not in the repo. There are no default credentials, and museum-held credentials are documented in the runbook's secure section, not in the wiki. |
| NFR-11 | Privacy | No cameras, no microphones, no personal data, no network telemetry. |
| NFR-12 | Upstream fidelity | Stuart's core is pinned to a recorded upstream commit and used unmodified apart from a **documented, minimal set of local patches** (`patches/`, listed in architecture 4.4). Each patch fixes a demonstrated bug in the core, is as small as the fix allows, and applies with no fuzz. Each has a bug report to upstream pending or sent, and is **dropped as soon as the pinned commit contains an upstream fix**. Patches never change a program's `.e` file and never add features. Upstream updates are adopted deliberately (README, "Taking upstream updates"), never automatically. |

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
| R2 | **Report the `mult.go` bug upstream.** `src/mult.go:66` uses `"%2d "`, which crashes `eniactk` at `eniactk.go:785` the first time the multiplier runs. The fix is `Sprintf("%d ", stage)`. It's confirmed on the trial box. Nothing has been sent yet. Since decision #36 the same report also covers the function-table and accumulator fixes (patches 0002 and 0003; draft in `docs/spikes/S3-sieve-regression.md`). | Other users of eniactk are affected. Our fork carries a patch indefinitely. | Send an issue or email with the diff and repro (owner: Nick, before MVP sign-off). The bridge tolerates both formats (FR-04). |
| R3 | Pi 5 performance for the sieve and trajdemo at full speed while rendering. | Mission length and fps targets may be missed. | Measure in Milestone 1. Use speed control (FR-16) and update coalescing. |
| R4 | Fast-forward and skipping trajdemo parts may be limited by the program's master-programmer sequencing. | FR-19 may need a different approach. | **Happened (spike S2):** only the trajectory is reachable. FR-19 rewritten in 0.3 to READ, INIT and one flight; Plan B kept in UX 8.3.8. |
| R5 | Dev on shared hardware (the Model 4 kiosk). | Could disrupt a live exhibit. | FR-80–83, and test only when the Model 4 kiosk isn't needed on the floor. |
| R6 | Historical accuracy of mission text. | A wrong claim on the floor. | Fact-Checker review, and Doug's approval of the copy (FR-22, FR-41). |
| R7 | **New history claims (0.4)**: twelve unit cards, a glossary and an honor roll naming people and roles (UX 14.8 lists all 19 claims). Crediting people wrongly is worse than not crediting them. | A wrong or disputed credit on the floor. | One-line roles; the FR-46 gate (only `approved` blocks render); the names and roles go to Doug first; ship what is approved by install day. |
| R8 | **Production hardware unknown (0.4)**: which computer drives the 24" mount, its OS and architecture, the panel's resolution and touch technology (Q15, Q16). | M3-lite slips or runs poorly; touch behaves differently with gloves or leaning palms. | Settle Q15 and Q16 first; on install day run a one-finger, palm and glove check; keep the design resolution-independent (UX 9.4). |
| R9 | **Attract runs 24 hours a day (0.4)** and has not been soaked. | Memory growth or a stuck run on the floor. | One flight per core process (FR-34), the 20 s hang rule (FR-36), the nightly 03:00 restart (NFR-07), and an overnight soak of attract before install. |

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
| **M2: All missions** | Primes and Trajectory missions, card output, READ flow, mission-definition format (FR-24), text through Fact-Checker. *(0.4: live attract and the About screen moved to M3-lite; the interim start screen stands in.)* | All three missions meet their length targets (FR-10) and NFR-04. |
| **M3-lite: museum install on the 24" screen (target: the week of 2026-10-05)** | Run the three missions on the 24" production panel with **live attract-lite** (FR-30 to FR-36), the **honor roll** and Stuart credit (FR-41, FR-43, FR-44, FR-46), boot-to-kiosk with auto-restart, and a one-page staff card. Optional if time allows: Explore ENIAC v0 and the finale (10.1). | A visitor can walk up, touch, do a mission and see the honor roll on the 24" panel. Power-on reaches live attract with no login. A killed core shows the error state and recovers. Staff can power-cycle it from the card. |
| **M3: Operable** | Admin escape and screen, health endpoint, update and rollback, metrics, boot-to-kiosk hardening, soak test. | NFR-02, NFR-05 and NFR-07 pass on the test box. |
| **M4: Production hardware and handoff** | Provision the dedicated Pi 5, usability test, runbook, sticker, credentials, handoff drill, remove from the Model 4 kiosk. | G1–G7 all pass. |
| **M5: Floor trial** | 2-week trial, metrics review, fixes. | OT-7 met, and the museum owner signs off. |

### 10.1 M3-lite: what is the minimum for the install next week

M3-lite is a **supervised preview** on the museum's own screen. It is **not** the ownership handoff: G1 to G7 and OT-1 to OT-7 still gate M4 and M5. Nick may be on call for the preview week only, and that is recorded here so it is not mistaken for the end state.

| Tier | Item | PRD | Why |
|---|---|---|---|
| **Must** | The kiosk app on the 24" panel at its native resolution; touch checked (one finger, palm, glove) | UX-11, UX-06, R8 | Nothing else matters if it does not fit and respond |
| **Must** | Boot-to-kiosk and auto-restart: power-on reaches attract with no login, no keyboard; services restart; the core restarts (FR-05); error state works (FR-50, FR-51); nightly 03:00 restart | NFR-02, NFR-07 | The old exhibit stops at a `login:` prompt; this one must not |
| **Must** | The three missions as built | M1, M2 | Already done; no regressions |
| **Must** | **Live attract-lite**: the real `trajdemo.e` run in a loop, plot and caption from real cards, the Stuart plate, error state if the core is down | FR-30, FR-34 to FR-36, FR-43 | Nick's first ask |
| **Must** | **Honor roll** pages 1 and 4 (Stuart; this exhibit) and, **as approved by Doug by install day**, pages 2 and 3 (the first programmers; the builders) | FR-41, FR-43, FR-44, FR-46 | Nick's third ask; unapproved blocks are not shown |
| **Must** | A one-page staff card: what it is, how to power-cycle it, who to call; no credentials on it | OT-2, OT-3 (minimum) | Staff must be able to recover it |
| **Should** | **Explore ENIAC v0**: the panorama and twelve cards with all lamps dark (no session needed), mission chips, glossary | FR-90 to FR-96 | Pure front end, no core dependency: it can be built in parallel with the attract work |
| **Should** | **Finale** with the real recap and the honor beats (without F2) | FR-45 | Cheap once the honor components exist |
| Later | Live lamps in the panorama (attract and Explore), finale F2, the admin screen, update and rollback, metrics, the soak and usability tests, the dedicated-Pi provisioning and the full OT list | FR-60 to FR-75, NFR-05, NFR-09, OT | M3, M4 and M5 |

**Install prerequisites that are not software** (each blocks the milestone): Q15 which computer drives the mount; Q16 the panel's native resolution and touch technology; Q1 a named museum owner; and Doug's review of the new copy (R7).

---

## 11. Assumptions

- The dev touchscreen (15.6", 1920×1080, wch.cn multitouch) is representative of the production screen's **layout**; the production panel is a 24" landscape panel assumed to be 1920×1080 until confirmed (Q16). Its touch behaviour is not assumed to match the dev panel's (R8).
- Chromium on Pi OS trixie arm64 is the same runtime the other museum kiosks use.
- The core runs unmodified (except `mult.go`) as a child of the bridge, using its existing `-v` display protocol.
- The museum allows a small always-on exhibit with its own power and wired LAN.
- Visitors engage for minutes, not tens of minutes, which is why the mission lengths are short.

---

## 12. Open Questions (defaults applied in this draft)

| # | Question | Default used in this PRD | Whose call |
|---|---|---|---|
| Q1 | Who is the named museum owner for the kiosk? | Doug Crawford, as exhibit approver, until someone else is named | Doug / museum |
| Q2 | **Dedicated Pi 5 procurement and timing:** who buys it (and the case, 27 W PSU, active cooler), budget, mounting, and a date before the floor? *(0.4: the screen is now a 24" landscape touch panel on the museum's existing mount, so screen size and orientation are answered; see Q15 and Q16.)* | Pi 5 8 GB driving the 24" panel. Procurement is needed before M4; M3-lite may use the dev Pi 5 or the mount's existing computer (Q15). | Nick / Doug |
| Q3 | Where does it go on the floor? Next to the existing ENIAC exhibit Pi (<museum-lan>.27) as a companion, or replacing it? | A companion next to the existing exhibit. The existing Pi is untouched. | Doug |
| Q4 | Mission lengths and how many steps the visitor does (FR-10, FR-11) | Squares 2–3 min / 6–8 steps, Primes 3–4 min / 3–5 steps, Trajectory 4–6 min / 3–5 steps + READ | Nick (to validate in usability testing) |
| Q5 | Where does the code live long-term: Nick's GitHub, or a VCF-controlled org? Public or private? | Private repo, with the museum owner granted access at handoff. It goes public only after R1. | Nick / Doug / Stuart |
| Q6 | Idle timeouts (FR-32) | 90 s in setup and on the menu, **120 s in Explore ENIAC**, 3 min while running, 15 s "Still there?" countdown | Nick |
| Q7 | Operating hours: power on and off with the museum lights, or always on? | Always on, with a nightly 03:00 restart | Museum staff |
| Q8 | Sound (relay clicks, card punch)? | Button tick only (2026-10-17, Nick); no other sound | Nick / Doug |
| Q9 | Languages other than English, and screen-reader/audio description? | English only. Visual accessibility per UX-09 only. | Doug |
| Q10 | Credit wording, and should the ENIAC programmers (such as the six women who programmed it) be credited on the About screen? *(0.4: **decided yes**, by Nick: the honor roll, FR-44. What remains is Doug's approval of the names, their format and each role, Q17.)* | The names in FR-44; roles as one short line each; approved blocks only (FR-46). | Doug |
| Q11 | If Stuart declines permission for the `images/` photographs, is original artwork acceptable? | Yes. Plan for original artwork if needed. | Nick |
| Q12 | Admin escape gesture and PIN | 5 taps top-left within 3 s, then a museum-set PIN | Museum staff |
| Q13 | Mission gating: free choice, or must Squares come first? | All unlocked, with the suggested order marked | Nick |
| Q14 | Updates: USB-only, or network pull from GitHub when the LAN has internet? | Both, with USB as the guaranteed path | Museum IT volunteer |
| Q15 | **What computer drives the 24" mount?** The old exhibit Pi at <museum-lan>.27 (older Pi: which model, which OS, 32- or 64-bit?), the Model 4 kiosk's Pi 5, or the new dedicated Pi 5? The release bundle is arm64. | A Pi 5 (arm64), as in D3 | Nick |
| Q16 | The 24" panel's **native resolution and aspect**, its **touch technology** (projected-capacitive or infrared frame), and the **mounting height**. | 1920×1080 (16:9); touch to be tested with a finger, a palm and a glove on install day | Nick / Doug |
| Q17 | The honor roll: which names, what **format** (the women's names as known later in life, as given, or with their earlier names too), what **one-line role** for each builder, and **anyone else** to honor (for example other engineers or the Moore School's human computers). | The people and bodies in FR-44; roles in UX 14.6.2 | Doug (Fact-Checker first) |
| Q18 | Does Stuart approve the wording of his credit, and how is the maker of this screen credited (Nick, the museum, or neither)? | His wording goes to Stuart with the R1 permission request; the maker line is left out until decided | Nick / Stuart |
| Q19 | Attract loop: **recycle the core after each flight** (default), or let `trajdemo.e` run on by itself once a follow-up spike shows later flights are clean? | Recycle after each flight (FR-34) | Nick |
| Q20 | When the **core is down but the bridge is up**, should the static screens (Explore, honor roll, glossary, finale recap) keep working with a visible notice, or should every screen become the error state? | Keep working with a notice; the menu and attract show the error state (FR-94) | Nick |
| Q21 | The wording for **"transceiver"** (Nick listed it as tour vocabulary; no mission uses it). | Held and not shown until Stuart or Doug confirm | Stuart / Doug |
| Q22 | The Printer's panel span and the whole panel layout against the 1946 floor plan (the layout is read from Stuart's simulator, with the Printer's 4-panel span my own reading). | As in UX 14.3.1 | Doug / Stuart |
| Q23 | Finale trigger: after **all three** missions are done (default), or after Finish on any mission? | All three | Nick |

---

## 13. Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1 | 2026-09-30 | Nick DeMarco with AI assistance | Initial draft from the VCF handoff, first-session decisions, the dev-on-Model-4 hardware update, and an upstream code review |
| 0.2 | 2026-10-01 | software-developer agent, recording Nick's decision #36 | NFR-12: from "only the `mult.go` fix" to a documented, minimal set of local upstream patches, each with an upstream bug report pending and dropped once upstream fixes it. We patch upstream bugs ourselves now and take Stuart's official fixes later. Patches carried: 0001 `mult.go` stage format, 0002 `ft.go` repeat-switch default (unblocks Primes, U1), 0003 `accumulator.go` 1PP race (trajdemo cards, spike #31). R2 widened. Verified: `sieve.e` punches the 407 primes from 3 to 2801. |
| 0.3 | 2026-10-01 | software-developer agent, recording Nick's M2 decisions | FR-19 rewritten: Trajectory is READ (`b c` then `b r`), one INIT, one 34-card flight drawn from the real cards, frozen on the landing card with `s cy.op 1a`, Full only; the six-part run kept as Plan B (S2, R4 happened). FR-18: the Primes answer is card 100 (547), the result screen stays live to 407. FR-17: Squares Slow is `cy.rate 13` (S4), each addition visible for about 1 s. |
| 0.4 | 2026-10-02 | product-requirements, with Nick's request for the 24" museum install | **Live attract** specified (FR-30, FR-34 to FR-36: `trajdemo.e` at Full, one flight per core, 60 s loop, hand-off, failure states, "attract-lite" for M3-lite); inactivity table amended (FR-32, Explore 120 s); **Stuart credit prominence** (FR-43) and **honor roll** (FR-41, FR-44) naming the six programmers, Eckert, Mauchly, the Goldstines, the Moore School and the Army BRL; **finale** (FR-45); **content review gate** (FR-46); **Explore ENIAC** and **glossary** (new 4.9, FR-90 to FR-98); UX-03 amended for an optional swipe, UX-01 and UX-11 for the 24" panel, UX-12 and UX-13 added; NFR-04b; D3 and D4, constraints, scope and metrics updated; risks R7 to R9; **M3-lite** milestone and its minimum (10.1); Q2, Q6 and Q10 updated, Q15 to Q23 added. |
| 0.5 | 2026-10-02 | software-developer agent, recording Nick's direction for the honor roll | **FR-46 relaxed**: review status is an internal note on each content block, not a render gate; all four honor-roll pages render with the wording of `docs/fact-check.md`, and corrections are welcome (only a `hold: true` block stays off the screen). |
| 0.6 | 2026-10-02 | software-developer agent, building Nick's tube story (`docs/tubes.md`) | **FR-99 to FR-101** added to 4.9: S16 "Keeping ENIAC alive" (five cards and a myth check), "Find the dead tube" as a labelled re-enactment that never reads the core, three new glossary words, and its counters. |
