# UX Design Specification: ENIAC Touch Kiosk

**Version:** 0.8
**Last Updated:** 2026-10-02
**Author:** Nick DeMarco with AI assistance (ux-design agent)
**Status:** Draft for review
**PRD Reference:** `docs/PRD.md` v0.4 (sections 4, 5, 10, 12)
**Architecture Reference:** `docs/architecture.md` v0.5 (this spec does not define the protocol)

**v0.6 (2026-10-02)** adds the screens for the museum's 24-inch install: a live attract (14.2), **Explore ENIAC** with its glossary (14.3, 14.4, 15), a finale (14.5) and an honor roll (14.6). It is in section 14; the older sections are patched only where they must point there. A mockup of Explore ENIAC is in `docs/mockups/explore-eniac.html` (and `.png`).

**Grounding sources:** `docs/PRD.md`; `docs/handoff-from-vcf.md`; upstream `blstuart/eniac-simulator` at `c4b94f2` (`programs/sq.e`, `doc/example.tex` and `programs/sq2.e` for the Squares explanation, `src/accumulator.go`, `src/constant.go`, `vis/eniactk.go`, `images/*.ppm`, the header comments of `programs/sieve.e` and `programs/trajdemo.e`).

---

## 0. Read this first: flags and assumptions

| # | Flag | Why it matters |
|---|---|---|
| F1 | **sq.e does not loop.** Reading `programs/sq.e` and `src/accumulator.go`, the file has no path from the last step back to the start (no `a2.7o` cable, no master programmer). One press of INIT computes **one** next square (Acc 1 goes x to x+1, Acc 2 goes x² to (x+1)²). PRD section 3 says it "loops indefinitely"; that is true of `sq2.e`, not `sq.e`. I read the code but could not run it (the build was blocked in my sandbox). **Confirm on the trial box in the M1 spike.** The mission script below is written for "one square per INIT press". If it does loop, only the run beats in section 8.1.4 (S6) change. | The Squares run design depends on it. |
| F2 | **UX needs from the architecture, not protocol.** (a) The front end must be able to tell "this INIT has finished" and re-arm INIT, so repeated presses never stack (UX-07). (b) The live Acc 1 and Acc 2 values must be available, since the notebook tape and the captions are driven by the real lamps. (c) "Keep pressing for me" (8.1.4) is a front-end repeat of the whitelisted INIT action. | Architect |
| F3 | **Panel photos are tiled textures, not photos of real units.** `images/e1900sN.ppm` tiles the same accumulator picture eight times per section and is 237 px wide per panel. It turns to mush at 4x zoom, and R1 makes its use uncertain. This spec therefore draws the panels (section 6.1). | Design decision |
| F4 | **The Constant Transmitter is about 30 panels away from Accumulators 1 and 2** in the upstream layout (constant transmitter at panel 34, section 5; accumulators at panels 6 and 7, section 1). One screen cannot show both at usable size. The "Workbench" (section 4.2) lines up the units a mission needs side by side, and says so on screen. | Fact-Checker should bless the caption. |
| F5 | **PRD inconsistency:** FR-52 says "hold the top-left corner"; FR-70 and UX-03 say 5 taps and no long-press. This spec uses the 5-tap gesture everywhere. | PRD owner |
| F6 | **Footer type size.** NFR-06 sets body text at 24 px or more. The footer credit is set at 24 px to comply. | None |
| F7 | All history claims are tagged **[FC]** in the copy. They need the vcf-museum Fact-Checker and Doug Crawford before the floor (FR-22, R6). | Content |
| F8 | The exact sieve and trajdemo switch choices in section 8 were **candidates** read from the `.e` headers. In v0.2 they are confirmed line by line (8.2.2, 8.3.2): each is unique in the file and passes validation rule 4, checked by script on 2026-10-01. **Open: S2 may still change the Trajectory run (F9).** | Resolved for M2 steps |
| F9 | **At the pinned commit `trajdemo.e` does not run its 6 demo parts one per INIT.** INIT starts the artillery trajectory at once, and every later INIT restarts it (8.3.1, verified by running the core). FR-19 as written cannot be met with the unmodified file (PRD R4). Mission 3 is therefore READ, INIT, then one flight drawn as dots from the real punched cards. The six-part run is kept as Plan B (8.3.8). Attract mode (7.1) is affected (8.5.1, item 6). | PRD owner, S2 spike, Nick |
| F10 | **The sieve is punch-bound.** The simulator waits 600 ms per punched card, so all 407 primes take about 4:10 at Full on any machine, and "Skip to the answer" cannot shorten it. The design gives the result at card 100 (about 1 minute) and lets the live count carry on (8.2.1, 8.2.5). | Nick |
| F11 | **The production screen is a 24-inch landscape touch panel** (PRD Q2, UX-11 updated). At 1920 x 1080 one CSS px is about 0.277 mm, so the 64 px and 96 px minimums become about 17.7 mm and 26.6 mm: bigger than on the 15.6-inch dev panel, so every target rule still holds. Native resolution, aspect and touch technology are not confirmed (Q16); a 16:10 or 4K panel scales as one unit (9.4). | Nick |
| F12 | **Panel numbers in `src/web/app/stage/roomplan.ts` look inconsistent** (a mix of 0-based and 1-based: for example `i: 1` and `p: 3` are 1-based but `a1: 6` and `c: 34` are the upstream 0-based offsets). Explore ENIAC takes the table in 14.3.1 (0-based, from `vis/eniactk.go`) as its single source, and `roomplan.ts` should read the same table. | Developer |
| F13 | **The room layout (which panel holds which unit) is read from Stuart's simulator**, not from a 1946 floor plan. The Printer's span (panels 36 to 39) is my reading from one lamp position [I]. | Doug / Stuart (Q22) |
| F14 | **Attract is a flat panorama, not the perspective room of 7.1.** No perspective art exists. The unrolled room (14.3.2) needs no new art and is the same component as Explore. The perspective view stays an option for later. | Design decision |
| F15 | **The attract loop recycles the core after each flight** because the program's own restart after a landing is not verified clean (8.3.1 item 3). | Nick (Q19) |
| F16 | **"Transceiver" is held.** It is not used in any mission and its wording is unverified (15). | Stuart / Doug (Q21) |

---

## 1. Executive Summary

### 1.1 Design vision

A visitor walks up to a dark screen where a room-sized machine is visibly running, touches it, and within about a minute is plugging a real cable into a real (simulated) ENIAC and watching neon lamps count. Every step is tap-tap, every wrong tap is a soft nudge, and there is always a way out: "Do it for me", "Skip setup", or "Skip to the answer". The visitor leaves understanding one idea: **the cables were the program.**

### 1.2 Key design decisions

| Decision | Choice | Rationale |
|---|---|---|
| Room-sized machine on one screen | Three zoom levels: **Room** (orientation), **Workbench** (the 3 to 4 units a mission uses, lined up), **Close-up** (two magnified "jack windows" for each plug step) | 40 units cannot be shown at touch size at once. Jacks are about 10 px on any whole-section view. |
| Plugging | Two windows on screen: tap the glowing jack in the left window, then the glowing jack in the right window. The cable then draws itself across the Workbench. | Satisfies tap-source, tap-destination. Works across panels that are far apart in the real room. No drag. |
| Switches | Tap the dial, get a large picker showing only valid positions | FR-13. No rotate gesture. |
| Guide pointing | Spotlight (dim everything else), pulsing ring, a leader line from the step card, and a label chip. Each cue has a shape, not only a color. | UX-09. Works for colorblind visitors and in bright rooms. |
| Art | **Drawn vector panels** in the style of the photos; the upstream photos are optional texture later if Stuart permits | Crisp at any zoom, exact hit areas, no R1 dependence (FR-42). |
| Step pacing | The visitor taps an explicit **Next step** after each success. There is no auto-advance. | Family groups read at different speeds. Kids touch, adults read. |
| Squares length | 7 hands-on steps, 2:40 at a normal pace | FR-10, FR-11 |
| Visitor-facing numbers | A big readout number sits above each lamp grid, labelled "helper readout" | The real lamps show one lit lamp per digit column, which is hard to read for a 10-year-old. The lamps stay as the real thing. |
| The whole machine (v0.6) | **Unrolled panorama** of the 40-panel U, panned by arrows and a minimap strip (swipe optional) | A U of about 80 feet cannot be shown at once. Large targets, no gesture required (UX-03). One component serves attract, Explore and the finale. |
| Credit (v0.6) | Stuart's name on a plate in attract and as its own honor page; the original programmers and builders on an honor roll | Credit prominently, in the machine's own engraved-plate style, with no photographs. |

### 1.3 Design principles

1. **Touch, not gesture.** One finger, one tap, fires on release.
2. **The machine is real, the help is ours.** Lamps, cables and values come from the core. Captions, rings and arrows are ours and are clearly different in style (flat yellow outlines on a dark, realistic panel).
3. **Nothing is punished.** A wrong tap never changes the machine. A stuck visitor is always 3 taps from progress.
4. **One idea per step.** Two sentences of "what", one of "why".
5. **Never fake it.** No canned lamps or recorded runs anywhere, including attract and error states.

---

## 2. Personas

| Persona | Who | Design consequence |
|---|---|---|
| **Maya, 10** (primary) | Drives the touch. Reads at about grade 4 to 5. Short attention. Might be wearing mittens or gloves. | Targets at 96 px or more on primary actions, short sentences, big payoff fast (lamps moving within about 90 s). |
| **Dad, 45** | Reads the text over her shoulder, asks "why?" | "Tell me more" layer (history and mechanism). Step cards written so an adult reading aloud sounds natural. |
| **Walt, 74, retired engineer** | Wants the real details. May tap slowly and deliberately. | Real names everywhere (accumulator, initiating unit, program trunk), "Tell me more", the real panel look, optional Step mode. No timeouts while a tap is pending. |
| **Docent / staff** | Demos it, recovers it. | "Skip setup", "Skip to the answer", hidden admin entry, docent mode. |

---

## 3. Screen inventory and flow

### 3.1 Inventory

| ID | Screen | Purpose | Timeout |
|---|---|---|---|
| S0 | Waking up | Shown while a fresh core starts (at most about 3 s) | none |
| S1 | Attract | **Live** ENIAC in the room (14.2), Stuart plate, "Touch to program ENIAC" | none |
| S2 | Mission picker | Choose 1, 2 or 3; About | 90 s to attract |
| S3 | Mission screen, briefing | Intro card and overview of the units used | 90 s |
| S4 | Mission screen, setup steps | Step card + Workbench + jack windows or switch picker | 90 s |
| S5 | Mission screen, "rest done for you" | Animated batch placement with counts | none (about 6 s) |
| S6 | Mission screen, run | READ (if the mission needs it), INIT, lamps and cards, speed | 3 min |
| S7 | Result | Explanation, tape or cards, takeaway, Next / Try again / Menu | 90 s |
| S8 | Finale | After all three missions: recap, the room you used, Stuart, the honor roll (14.5) | beats 15 to 20 s; holds 20 s at the end |
| S9 | Still there? | Overlay | 15 s countdown |
| S10 | ENIAC is resting | Error state (no demo fallback) | none, self-recovers |
| S11 | About and honor roll | Four pages: Stuart, the first programmers, the builders, this exhibit (14.6) | 90 s |
| S12 | Admin PIN pad | Hidden | 30 s |
| S13 | Admin | Health, metrics, actions | 2 min (FR-74) |
| S14 | Explore ENIAC | Pannable panorama of the whole machine; a card for each unit; mission cross-links (14.3) | 120 s |
| S15 | Glossary | Sixteen terms in two pages (14.4, 15) | 90 s |
| D1 | Confirm: Start over | Overlay | none |
| D2 | Tell me more | Slide-over | follows mission timeout |

### 3.2 Flow

```
                          (any touch)
        +-----------+  ----------------->  +-----------------+
        | S1 ATTRACT|                       | S2 MISSION      |<---------------------+
        | live run  |<-- idle 90s (setup)-- | PICKER  [About]-|--> S11 About --back--+
        +-----------+    idle 3 min (run)   +--------+--------+
              ^            or "Still there?"         | Start (1/2/3)
              |            15 s expires              v
              |                                 S0 Waking up (fresh core, <=3 s)
              |                                      |
              |                                      v
              |     S3 Briefing ----> S4 Step 0 "The plan" ----> S4 Steps 1..N
              |                              |                      |   ^
              |            "Skip setup" (any step) ---------------+    |
              |                                                    |    | wrong tap: hint
              |                                                    v    | (x3: Do it for me)
              |                                  S5 "The rest is done for you"
              |                                                    |
              |                                                    v
              |                          S6 Run: [READ] -> INIT -> watch (Slow / Full)
              |                                                    |  "Skip to the answer"
              |                                                    v
              |                                               S7 Result
              |                       Next mission <-+-- Try again (fresh core) --+-- Menu
              |                                      v
              +------------ auto / tap --------  S8 Finale (after mission 3)

Always: Back to missions, Start over (confirm) on S3 to S7.
Any state: core/bridge down > 5 s  ->  S10 ENIAC is resting  -> self-recovers to S1.
Hidden: 5 taps in the top-left corner within 3 s -> S12 PIN -> S13 Admin -> Return to kiosk.
```

Rules: the first touch in attract never acts on anything underneath (FR-31). **Steps are not undoable** because the core cannot unplug (PRD section 3); "Start over" starts a fresh core. "Try again" does the same.

**v0.6 additions to the flow:** S2 also leads to **S14 Explore ENIAC** (and from there to S15 Glossary, S11 page 2 and, through "Start Mission N", to S0). S3 and S7 lead to S14 and back. After all three missions S7's primary button is **Finish**, which leads to **S8 Finale** (14.5), which ends at S1. S1 is a live session (14.2) that keeps running behind S2, S11, S14 and S15 until a mission starts. The timeouts and the core-down behaviour of every screen are in 14.7.

---

## 4. Presenting a room-sized machine on one screen

### 4.1 Three levels

| Level | Shows | Used for | Interactive? |
|---|---|---|---|
| **L0 Room** | The whole U-shaped room, in perspective (attract) or as a plan with the mission's units flagged (briefing, minimap) | Attract; briefing; "where am I?" | Only "Look around" arrows and the minimap. No steps happen here. |
| **L1 Workbench** | The 3 to 4 units the mission uses, **rearranged side by side**, drawn tall and narrow like the real panels, with the data-trunk rail along the top and the program-trunk rail along the bottom (as in Stuart's `example.tex`: data trunks above, program trunks below) | Context for every step; result of each step is drawn here | Switch dials and trunk tabs only in the current step |
| **L2 Close-up** | One or two magnified windows showing a small cluster of jacks or one dial | Where every tap actually happens | Yes: targets are at least 88 px |

A permanent caption on the L1 Workbench reads: *"We moved these units next to each other so you can see them. On the real ENIAC they are far apart."* [FC]

### 4.2 Workbench layout (1920x1080, rectangles in px, origin top-left)

```
+----------------------------------------------------------------------------------------------+
| HEADER  y0-96                                                                                |
+----------------------------------------------------------+-----------------------------------+
| STAGE  x24-1384, y112-1016  (1360 x 904)                 | GUIDE RAIL  x1408-1896 (488 wide) |
|  +--------------------------------------------------+    |  y112-700  Step card              |
|  | DATA TRUNK RAIL   (trunks 1,2,3 ...)  y124-190   |    |  y716-812  Tell me more (64 h)    |
|  +--------------------------------------------------+    |  y832-928  Do it for me / Next    |
|  | [Init.  ] [Const. ] [Acc 1 ] [Acc 2 ]            |    |            (96 h)                 |
|  | [ Unit  ] [Transm.] [      ] [      ]  300 x 690 |    |  y944-1008 Skip setup (64 h)      |
|  |  each panel: lamp band / dial band / jack band   |    |                                   |
|  +--------------------------------------------------+    |                                   |
|  | PROGRAM TRUNK RAIL (1-1, 1-2, 1-3 ...) y880-1000 |    |                                   |
|  +--------------------------------------------------+    |                                   |
+----------------------------------------------------------+-----------------------------------+
| FOOTER y1032-1080  "ENIAC simulator by Brian L. Stuart, Drexel University"   (24 px)         |
+----------------------------------------------------------------------------------------------+
```

Panel cards are 300 px wide with 40 px gaps (4 x 300 + 3 x 40 = 1320, centred in the 1360 stage). Each card has three bands taken from the real panel: a **lamp band** on top (live neon lamps, always visible), a **dial band** (op/repeat switches, constant dials), and a **jack band** (program and data jacks). The tall empty cabinet above the lamps in the real panels is cropped out.

### 4.3 How the guide points at a jack or switch

Every step uses the same choreography, so visitors learn it once:

1. **Frame** (400 ms ease-in-out): the stage pans or zooms so the relevant panels are in view. For plug steps the two jack windows slide in.
2. **Spotlight:** everything outside the target gets a 65% dark scrim. Decoy jacks inside a window stay visible at full brightness (they are the real neighbours) and are tappable for "wrong" feedback.
3. **Ring:** a yellow 6 px ring with a black 2 px inner line around the target, pulsing 6 to 10 px at 1 Hz. Yellow is the **only** color used for "touch this".
4. **Badge:** a white numeral in a black circle (1 for source, 2 for destination) and an arrow chevron that bobs toward the target. Shape plus numeral, not color.
5. **Leader line:** a thin line from the step card's left edge to the target's label chip, so the eye goes from text to thing.
6. **Label chip:** plain-language name above the real label, such as "Accumulator 1 OUT (A)". Text is 24 px.
7. **Target off screen?** An edge arrow with the unit name, tappable to re-frame. A **"Show me where"** link on the card replays steps 1 to 6 (zoom out to L0, then back in). Always available.

### 4.4 Look-around

Two 96x96 arrow buttons at the stage's left and right middle edges step the Workbench to the neighbouring unit. A 200x130 minimap (bottom-left of the stage, y 870 to 1000) shows the room plan with a "You are here" dot. The minimap and the arrows are **never required**; the guide re-frames automatically. (The same arrows and minimap, at a larger size and with the whole U, make up S14 Explore ENIAC, 14.3.) Tapping the minimap goes to L0 for 4 s, then returns.

---

## 5. Guided-help interaction

### 5.1 Step card (guide rail, 488 x 588 at x1408, y112)

```
+-----------------------------------------+
| STEP 3 OF 7   [cable icon]  o o o * o o o|   progress dots + icon (cable / dial / button)
|                                         |
| Send the 1 to Accumulator 1             |   headline 40 px bold, max 2 lines
|                                         |
| Accumulators are ENIAC's adding         |   body 28 px / 40 px leading, max 40 words
| machines. ...                           |
|                                         |
| [ Show me where ]                       |   text button, 64 h
|                                         |
| ---- feedback line (appears here) ----  |   icon + 26 px text; see 5.2
+-----------------------------------------+
```

States of the bottom action (y 832 to 928, 96 px tall, 456 wide):

| Step state | Main action | Secondary (y 944) |
|---|---|---|
| Waiting for the visitor | **Do it for me** (outline style) | Skip setup, just run it |
| After 3 wrong taps | **Do it for me** becomes filled and pulses gently | same |
| Step done | **Next step** (filled) | Skip setup, just run it |
| Last setup step done | **Finish wiring** (filled) | none |

### 5.2 Feedback and the wrong-tap ladder

Nothing wrong is ever sent to the core (FR-14). Each wrong-tap counter is per step.

| Event | Visual | Card line | Motion |
|---|---|---|---|
| Correct tap | Bluish-green ring plus a check mark, the cable or dial settles | One sentence of "why it works" | 200 ms snap |
| Wrong tap #1 (a decoy) | Decoy shows a vermillion "X" badge for 600 ms | "Not quite. [Specific hint]" | Decoy shakes 2 x 6 px |
| Wrong tap #2 | The target ring gets thicker (10 px) and the chevron bobs faster | "Look for the glowing ring." | Pulse 1.5 Hz |
| Wrong tap #3 | **Do it for me** turns filled | "Want us to do this one?" | Gentle pulse on the button |
| Tap on empty space | A small neutral ripple only | none | Does not count as wrong |
| Tap on a dimmed region | same as empty | none | |
| Right source, wrong destination | Cable end snaps back to the source, source stays armed | "That one does not match. Try the other glowing jack." | |

All hints are authored per step (section 8.1.4, "Hints" lines). Feedback always appears within 100 ms (UX-08).

### 5.3 Do it for me, Skip, Jump to answer

| Control | Behaviour |
|---|---|
| **Do it for me** (per step) | Plays the step for the visitor: cable draws itself (900 ms), or the dial turns. The card says "Done for you" with a hollow check in the progress dots (counts as `steps done-for-me`, FR-60). Then the Next step button appears as normal. |
| **Skip setup, just run it** (any step, including Step 0) | No confirm. Goes straight to S5 "The rest is done for you" with the count of everything remaining. Logged as `setup skipped`. |
| **Skip to the answer** (run view) | Runs at unthrottled speed to the result screen. No confirm. |
| **Start over** (header) | Confirm overlay D1: "Start this mission again? Your cables will come out." Buttons **Yes, start over** (96 h) and **Keep going** (96 h). Starts a fresh core. |
| **Back to missions** (header) | Confirm only if at least one step is done; same overlay wording. |

### 5.4 Speed control (run view)

A two-position control in the run rail: **Slow | Full** (each 200x96, with icons: a snail glyph and a bolt glyph, plus the words). A third optional **Step** option (P2) advances one addition time per tap, for enthusiasts.

| Setting | What happens | Used for |
|---|---|---|
| **Slow** (default) | The machine is slowed so each addition step is visible, and the captions in 8.1.4 fire on real lamp changes | Squares (first 3 presses), any mission first time |
| **Full** | Normal simulator speed. The lamps are smoothed with an 80 ms decay to avoid strobing (see 9.5). | Watching a long run |
| **Skip to the answer** | Unthrottled to the end | Impatient visitors, docents |

After the third Squares press, a hint slides in: "Want it faster? Try Full."

### 5.5 Tell me more

A slide-over panel (D2), 1000 x 700 from the right edge, with up to 120 words, headline 40 px, body 26 px, **Close** 96 high. It never changes the machine state, and it pauses the idle timeout while open (up to 2 minutes).

---

## 6. Visual language

### 6.1 Drawn, not photographic

Decision: **draw the panels as SVG/Canvas art**, reading positions from the upstream geometry so that lamps are where Stuart put them. The photos in `images/` are kept as optional texture only if R1 is resolved.

What we copy from the photos: near-black charcoal panels (#1B1D21), a darker cabinet (#101215), cream jack blocks (#D8CFAE) with dark sockets, black knobs with a white pointer, and orange neon. Everything is drawn from a small kit of unit types (initiating, cycling, master programmer, accumulator, function table, constant transmitter, multiplier, divider/square-rooter, printer/punch). The perspective attract view projects the same drawings; the projection formulas are in `ray()` in `vis/eniactk.go`.

### 6.2 Neon lamps

- Lit lamp: amber-orange #FFB000 core, a 2x-radius soft glow, and **a bigger dot** (1.4x) so brightness is not the only difference.
- Unlit lamp: dark ring #3A2E1E with a faint amber outline, still visible so the grid reads as 10 x 10.
- Size: lamp dots are at least 12 px (NFR-06): 14 px in the Workbench thumbnails (26 px column pitch, 16 px row pitch), 26 px in the run view (grid 10 columns at 52 px, 10 rows at 38 px, matching upstream's 49 x 38 ratio).
- Row labels 0 to 9 down the left edge (0 at the top, as on the real machine). Sign lamp and repeat lamp labelled in 24 px chips.
- Decay: a lamp takes about 80 ms to fade, like real neon persistence. It also prevents strobing at Full speed.
- The **helper readout** above each lamp grid is IBM Plex Mono 72 px, white on black, labelled "helper readout" in 24 px. It is computed from the lamps, never separate data.

### 6.3 Cables

| Kind | Used for | Look |
|---|---|---|
| Data cable | Numbers travel here | Sky blue #56B4E9, 8 px solid, small square "digit" pulses in the run view |
| Program cable | Signals that say "go" | Reddish purple #CC79A7, 5 px, dash-dot, round pulses in the run view |
| Guide cable (while placing) | Preview | White 3 px dashed, with a ghost end on the source |

Both kinds carry a tag at each end ("1", "1-3") at 24 px. A light outline (2 px, #F4EFE3) keeps them visible on the dark panels.

### 6.4 Colors and feedback (colorblind-safe)

Palette is taken from the **Okabe-Ito** set. **Meaning is never carried by color alone**; every cue has a second channel.

| Meaning | Color | Second channel |
|---|---|---|
| Touch here (guide) | Yellow #F0E442 | Pulsing double ring, chevron, numeral badge |
| Correct | Bluish green #009E73 | Check mark icon, "snap" motion, text |
| Wrong | Vermillion #D55E00 (banner text is white on #A33F00) | X icon, shake, text |
| Data / program cable | Sky blue / reddish purple | Thickness, dash pattern, end tags |
| Lamp lit | Amber #FFB000 | Larger dot, glow |

UI surfaces: light cards #F4EFE3 with #1B1D21 text (above 12:1), stage and panels dark. All text meets WCAG 2.1 AA (UX-09); contrast is to be verified in the design tokens pass.

### 6.5 Typography

Fonts are bundled locally (NFR-01): **Atkinson Hyperlegible** (UI text; designed for low vision) and **IBM Plex Mono** (numerals, lamp readouts). Both are SIL OFL licensed.

| Role | Size / weight | Where |
|---|---|---|
| Attract title | 120 / bold | S1 |
| Screen title | 64 / bold | S2, S7, S10 |
| Step headline | 40 / bold | Step card (NFR-06 minimum 36) |
| Body | 28 / regular, 40 leading | Step card, results (minimum 24) |
| Button text | 32 / bold (primary), 28 (secondary) | All buttons |
| Helper readout | 72 mono | Run view |
| Label chips, tags, footer | 24 / medium | Jack labels, cable tags, credits |
| Tape / table | 36 mono | Result |

No text on the stage is smaller than 24 px except the tiny engraved plate text that is decoration only (not needed to complete a step).

### 6.6 Touch rules applied

All targets at least 64x64 with at least 16 px between targets (UX-01). Primary actions are 96 px tall. Jack hit areas are 88x88. Dials are 120x120. A tap within 16 px of the active target's hit area counts as a hit (glove tolerance); decoys get the same tolerance, and the nearest active target wins. Actions fire on release. No hover, no long press, no drag, no pinch (UX-03). Only the first touch point counts (UX-06).

---

## 7. Screens (wireframes, 1920 x 1080)

Common frame (S2 to S7, S11): Header y0 to 96, content y96 to 1032, Footer y1032 to 1080 (credit, 24 px, persistent; FR-40). **The top-left 120x96 corner is the hidden admin zone** and holds the non-interactive ENIAC wordmark. Nothing else is placed there.

### 7.1 S1 Attract

> **Superseded by 14.2 (v0.6).** Attract is now a flat panorama with live lamps, a live shell's-path plot, the Stuart plate and a rotating honor plate. The text below is kept for the layout history.

Goal: make people curious, and be honest that it is live.

```
+------------------------------------------------------------------------------------+
|  (full-bleed live view of the ENIAC room, perspective, lamps animating from the     |
|   running simulator, slowly drifting camera)                                        |
|                                                                                    |
|   ENIAC                                         (120 px, top-left, y 60-200)        |
|   The room-sized computer of 1946. Now you program it.     (40 px)                  |
|                                                                                    |
|                                                                                    |
|            +----------------------------------------------+                        |
|            |        TOUCH TO PROGRAM ENIAC                |  pill 720x120 at (600,800)
|            +----------------------------------------------+   pulsing, 1 Hz        |
|  live caption 24px (bottom-left): "Live: ENIAC is working out a shell's path. Hop 12"   |
+------------------------------------------------------------------------------------+
| ENIAC simulator by Brian L. Stuart, Drexel University                               |
+------------------------------------------------------------------------------------+
```

- The **whole screen** is the touch target. Any touch goes to S2 and does nothing else (FR-31).
- The picture is the perspective view drawn from live status (FR-30). **Caption (fixed in v0.4, 8.5.1 Q6):** at the pin the only live thing trajdemo can honestly show is the trajectory loop (spike S2: INIT goes straight to the artillery trajectory, and after landing it flies again by itself), so attract runs READ, INIT and lets it fly, and the caption reads "Live: ENIAC is working out a shell's path. Hop {n}", with {n} the hop number of the latest real card. The old "adding 97,367 to itself 5,000 times" was a part that never runs. If no live run exists, the screen is S10, not a fake. (The live attract session itself is still to be built.)
- No timeout.

### 7.2 S2 Mission picker

> **Superseded by 8.4 for the cards and by 14.9 for the row under them** (Explore ENIAC and About and honor roll).

*Superseded by 8.4 for the final copy, counts and the "Start here" rules; this wireframe is kept for the layout.*

```
+------------------------------------------------------------------------------------+
| [wordmark 0-120]   Pick a mission                                          (64 px)  |
+------------------------------------------------------------------------------------+
|   x80-624             x688-1232             x1296-1840        cards y184-824 (640 h) |
|  +------------+      +------------+        +------------+                           |
|  | (1) START  |      | (2)        |        | (3)        |   number badge 96 px     |
|  |   HERE     |      |            |        |            |                           |
|  |  [art]     | -->  |  [art]     | -->    |  [art]     |   arrows show order      |
|  |  Squares   |      |  Primes    |        |  The 1946  |   title 48 px            |
|  |            |      |            |        |  Trajectory|                           |
|  | About 3 min|      | About 4 min|        | About 5 min|   24 px                  |
|  | You wire 7 |      | You wire 5 |        | You wire 5 |                           |
|  | steps      |      | steps      |        | steps + READ|                          |
|  | "Make ENIAC|      | "Hunt for  |        | "Fire the  |   28 px, 1 line teaser    |
|  |  count in  |      |  prime     |        |  first     |                           |
|  |  squares." |      |  numbers." |        |  cannon    |                           |
|  |            |      |            |        |  shell."   |                           |
|  | [  Start  ]|      | [  Start  ]|        | [  Start  ]|   96 h x 480 w           |
|  +------------+      +------------+        +------------+                           |
|                                                                                    |
|  [ About ENIAC and this exhibit ]  (64 h, x80-560, y856-920)      Suggested order  |
|                                                                   1 then 2 then 3  |
+------------------------------------------------------------------------------------+
```

All three cards are unlocked (FR-23). The suggested order is shown by the badge numerals, the "Start here" tag on card 1 and the arrows between cards, not by color or by locking. Teaser text and durations are from FR-10. Whole card is tappable as well as the Start button.

### 7.3 S3 Mission briefing and S4 step screens

The mission screen frame is the one in 4.2. Header:

```
| [wordmark 0-120] [< Missions] x136-416   Mission 1: Squares   [Step 3 of 7]  [Start over] |
|                  64 h                     title 36 bold       dots 24px       x1600-1896   |
```

- **S3 Briefing (step card "Intro")**: the stage shows L0, a plan of the room with the units the mission uses flagged (four numbered markers for Squares). The card holds the intro (8.1.4, step 0a). Buttons: **Let's go** (96 h) and Tell me more.
- **S4 step screens**: the stage shows L1 Workbench and then the L2 windows. Step types:

**Plug a cable step (L2, two windows)**

```
STAGE (dimmed Workbench behind, y112-1016)
+-----------------------------+                   +-----------------------------+
| 1  CONSTANT TRANSMITTER     |                   | 2  TRUNK 1 (at this unit)   |
|  window x48-668, y160-780   |      ~~~~~~~~>    |  window x716-1336, y160-780 |
|   [ o ]*  [ 1i]  [ 2i ] ..  |   dashed preview  |   [ tr1 ]*  [ tr2 ]  [ tr3 ]|
|   chevron + ring on OUT     |   cable           |   ring appears after tap 1  |
+-----------------------------+                   +-----------------------------+
   label chips 24 px under each jack: "OUT" / "Trunk 1"
```

- Window size 620 x 620. Each has a 6 to 8 jack cluster at 72 px jack size with 24 px spacing (hit areas 88 px). Jack neighbours are the real neighbours from the drawn panel (for accumulators: alpha, beta, gamma, delta, epsilon, A, S and the program jacks), so the choices look like a real machine.
- Tap 1 in the left window: the source jack is "held", a cable end detaches and floats to the right window, and the right-hand ring starts pulsing. Tap 2: the cable animates across the Workbench (600 ms) into place, the windows collapse, and the step card shows success.
- The second window may belong to the same unit (for trunk sockets) or another unit.

**Turn a switch step (L2, one window + picker)**

```
+--------------------------------------------------------------+   window 900 x 560, x210-1110
|  CONSTANT TRANSMITTER  - J dials                              |
|   [0][0][0][0][0][0][0][0][0] [ (1) ]  <- ring on this dial   |   dials 120x120
+--------------------------------------------------------------+
   tap dial ->  PICKER (bottom sheet, y700-1000, x48-1384)
   +-------------------------------------------------------------+
   |  Pick a number for this dial:                               |
   |  [0] [1] [2] [3] [4] [5] [6] [7] [8] [9]   each 120 x 120   |
   +-------------------------------------------------------------+
```

The picker only offers the valid positions for that switch (FR-13). Each option has its symbol and, where helpful, a plain label (for example "2 times"). The correct one is **not** pre-highlighted, but a wrong pick follows the ladder in 5.2. The picker for rotary switches (for example an operation switch with alpha, beta, A, AS, S) uses the same big buttons with the Greek letter and a one-word meaning.

### 7.4 S5 "The rest is done for you"

```
STAGE: Workbench; cables draw themselves quickly, dials click around.
RAIL:   "The rest is done for you"
        Body: "On the real ENIAC, people did steps like these by hand, one cable at a time. ..."
        Counters: "8 more cables   10 more switches" count up as items appear (about 5 s)
        Button: Continue to the run (96 h) appears when the animation ends
```

### 7.5 S6 Run view

```
+---------------------------------------------------------------------------------+
| header as above                                                                  |
+--------------------------------------------------------------+------------------+
| STAGE (x24-1384)                                              | RUN RAIL x1408   |
|  ACCUMULATOR 1  ("x")          ACCUMULATOR 2  ("x squared")   |  Caption card    |
|  helper readout  [ 3 ]         helper readout  [ 9 ]          |  (live beat text)|
|  +-----------------------+    +-----------------------+       |                  |
|  |0 . . . . . . . . . .  |    |0 . . . . . . . . . .  |       | [ INIT ] 96 h   |
|  |1 . . . . . . . . . *  |    |1 . . . . . . . . . .  |       | Initiating Pulse |
|  |2 . ...                 |    |...                     |       | [ CLEAR ]  64 h |
|  | (10 cols x 10 rows,    |    | lamp 26 px, pitch 52x38|       | Speed:          |
|  |  sign lamp at left)    |    |                        |       | [Slow][Full]    |
|  +-----------------------+    +-----------------------+       | [Skip to answer]|
|  NOTEBOOK TAPE (y820-1016): 1 -> 1 | 2 -> 4 | 3 -> 9 | ...     |                  |
+--------------------------------------------------------------+------------------+
```

- Lamp grids sit at stage y 200 to 700; the helper readout is above them (y 120 to 200).
- **READ** (only when the mission needs a card): a 96 px button above INIT in the rail, pulsing until pressed. A card graphic slides into the reader at stage top-right with its digits printed on it.
- **INIT** is 96 px tall, 456 wide, labelled "INIT" with the subtitle "Initiating Pulse: the GO button". It is disabled (greyed, with a spinner icon) while the machine is busy (UX-07).
- **CLEAR** resets the counters to 0 ("Count from 0 again"). Secondary, 64 px.
- The **notebook tape** (Squares) is built from real lamp readings each time an INIT completes. It is a tape of what the machine did, never preset values.
- For punch missions the same area holds the **card output pane** (FR-21): cards stacked newest on top, the last 20 kept, punched-card graphics with their printed digits.

### 7.6 S7 Result

```
+----------------------------------------------------------------------------------+
| header                                                                            |
+----------------------------------+-----------------------------------------------+
| LEFT x64-960, y112-900           | RIGHT x1000-1856                              |
|  Notebook tape (36 mono)         |  "You made a table of squares!"  (64 px)      |
|   1 x 1 =   1                    |  explanation body 28 px (<= 40 words)         |
|   2 x 2 =   4                    |  takeaway strip (filled, 32 px bold)          |
|   3 x 3 =   9                    |   "The cables were the program."              |
|   ...                            |  [ Tell me more ]                             |
+----------------------------------+-----------------------------------------------+
| [ Next: Primes  (primary, 720 x 96) ] [ Try again 360x96 ] [ Menu 360x96 ]  y916-1012 |
+----------------------------------------------------------------------------------+
```

After mission 3 the primary button is **Finish** and leads to S8.

### 7.7 S8 Finale

> **Superseded by 14.5 (v0.6).**

Title "You programmed ENIAC." A line of credits (Stuart, the museum), a small picture of the live room, and a **Start over for the next visitor** button (96 h). Returns to attract after 45 s (no countdown overlay needed, since nothing is pending).

### 7.8 S9 "Still there?"

```
  scrim 70% over the current screen
        +--------------------------------------------------+   x460-1460, y280-800 (1000 x 520)
        |  Still there?                        (64 px)     |
        |  We will start over in  [ 12 ]       (countdown, ring + number) |
        |  [        I'm here        ]  (480 x 120)         |
        +--------------------------------------------------+
```

It appears after 90 s with no touch in setup or 3 min in the run (FR-32, both configurable; the countdown is 15 s). **Any touch** on the overlay, not only the button, dismisses it. On expiry the core is reset and the screen goes to S1 (FR-33).

### 7.9 S10 "ENIAC is resting" (error)

```
+------------------------------------------------------------------------------------+
|  (dark silhouette of a panel; static, NO lamps, NO animation of machine state)      |
|                                                                                    |
|          ENIAC is resting.                                        (64 px bold)      |
|          Please let a docent know.                                (48 px)           |
|                                                                                    |
|          Trying to wake it up again...  (2 of 3)                   (28 px)          |
|                                                                                    |
|  status code (24 px, bottom-left): E-CORE-DOWN                                      |
+------------------------------------------------------------------------------------+
```

- Appears when the core or bridge is down, or the websocket has been disconnected for over 5 s (FR-50). Never shows lamps, a recorded run or cards (FR-50, "no demo fallback").
- Retries on its own and returns to S1 on recovery (FR-51).
- After the retry budget: the body is replaced by "Staff: tap the top-left corner 5 times, then enter the PIN and choose Restart simulator." (FR-52, see F5).
- The top-left corner remains the admin zone here too.

### 7.10 S11 About and credits

> **Superseded by 14.6 (v0.6):** four pages, with the original programmers and builders credited and the Stuart credit made prominent. The mission-source wording below moves to page 4.

```
+-------------------------------------------------------------------------------------+
| About ENIAC and this exhibit                                                (64 px)  |
+---------------------------------------------+---------------------------------------+
| LEFT x80-1040                               | RIGHT x1100-1840                      |
|  "The simulator you are touching was        |  QR code 280 x 280   (local image)    |
|   written by Brian L. Stuart, Drexel        |  "Scan for Brian Stuart's simulator   |
|   University. It follows every cable and    |   page."                              |
|   switch of the 1946 machine."              |                                       |
|  His paper: "Simulating the ENIAC" (IEEE)   |  Mission sources:                     |
|  Missions:                                  |  Primes: D. H. Lehmer's July 1946     |
|   Squares: example by B. Stuart             |   runs, reconstructed by De Mol and   |
|   Primes: Lehmer, July 1946; De Mol and     |   Bullynck.  [FC]                     |
|    Bullynck's reconstruction  [FC]          |  Trajectory: the public demo of       |
|   Trajectory: the Feb 15, 1946 demo  [FC]   |   Feb 15, 1946.  [FC]                 |
|  Museum: Vintage Computer Federation,       |                                       |
|   InfoAge                                   |  (People credits: pending Q10)         |
+---------------------------------------------+---------------------------------------+
| [ Back ] (96 h, x80-400, y916-1012)                                                  |
+-------------------------------------------------------------------------------------+
```

Text is 28 px, wording to be approved by Doug Crawford (FR-41). If the QR cannot be scanned (glove, glare), the URL is also printed in 28 px.

### 7.11 S12 Admin PIN and S13 Admin

- **Entry:** 5 taps in the 120x96 top-left corner within 3 s (FR-70). There is no visible hint or counter. Any other touch resets the count. Works on every screen including S10.
- **S12 PIN pad:** 3 x 4 keys, each 120x120 with 24 px gaps, centred. Dots show digits entered. A wrong PIN shows "Not right" for 1 s and **returns to the visitor screen**. 30 s of inactivity does the same.
- **S13 Admin:** a header strip with "Exits in 1:42" (FR-74). Left: health tiles (core, bridge, uptime, restarts, last error, CPU temp, throttling) and metrics (today, 7 days, all time). Right: action buttons, each 96 px tall and 456 wide: **Restart simulator**, **Restart app**, **Run a mission in docent mode**, **Install update / Roll back**, **Reboot**, **Shut down**, and **Return to kiosk**. Reboot and shut down ask "Are you sure?" with two 96 px buttons. The visitor-facing type sizes apply here too (staff may wear gloves).

---

## 8. Mission scripts

### 8.1 Squares (Mission 1): the complete script

#### 8.1.1 What sq.e does

```
p c.o 1            p i.io 1-1          s a1.op5 alpha   s a2.op5 alpha
p 1 a1.alpha       p 1-1 a1.6i         s a1.op6 A       s a2.op6 beta
p 1 a2.alpha       p 1-1 a2.6i         s a1.rp5 1       s a2.op7 A
p a1.A a2.beta     p a2.6o 1-3         s a1.rp6 2       s a2.rp5 1  s a2.rp6 2  s a2.rp7 1
                   p 1-3 a1.5i         s c.s26 Jlr      s c.j1 1
                   p 1-3 a2.5i
                   p 1-3 c.26i
                   p a2.5o 1-2
                   p 1-2 a2.7i
```

The idea (Stuart's own explanation in `doc/example.tex`): **(x+1)² = x² + 2x + 1**. Acc 1 holds x, Acc 2 holds x². Each INIT does:

1. **Program 6** on both: Acc 1 sends x out its A jack **twice** (`rp6 2`), and Acc 2 takes it in on beta twice. So Acc 2 becomes x² + 2x.
2. Acc 2 finishes program 6 and its `6o` pulse goes on program trunk 1-3. That **starts program 5** on both accumulators and program 26 on the Constant Transmitter, which puts the J constant (the number 1) on data trunk 1. Both accumulators take it in on alpha: Acc 1 becomes x+1, Acc 2 becomes x² + 2x + 1 = (x+1)².
3. Acc 2's `5o` goes on trunk 1-2 to start its program 7 (send on A). **Nothing is plugged into Acc 2's A jack**, so this does nothing visible.

Each INIT press therefore yields the next square (see flag F1). Starting from cleared machine: press 1 gives x=1, x²=1; press 2 gives 2 and 4; press 3 gives 3 and 9; press 4 gives 4 and 16.

#### 8.1.2 Every cable and switch, and who does it

There are **13 cables** and **12 switches**: 7 done by the visitor (5 cables, 2 switches) and 18 preset (8 cables, 10 switches).

| # | Item (sq.e line) | Who | Why |
|---|---|---|---|
| 1 | Switch `s c.j1 1` (J constant, digit 1, is 1) | **Visitor, step 1** | The number 1 is concrete and fun to dial in. |
| 2 | Cable `p c.o 1` (Constant Transmitter OUT to data trunk 1) | **Visitor, step 2** | Shows "numbers travel on trunks". |
| 3 | Cable `p 1 a1.α` (trunk 1 to Acc 1 alpha input) | **Visitor, step 3** | Teaches "an accumulator takes a number in". |
| 4 | Cable `p a1.A a2.β` (Acc 1 OUT to Acc 2 beta) | **Visitor, step 4** | The core squares cable: x flows to x². |
| 5 | Switch `s a1.rp6 2` (Acc 1 sends twice) | **Visitor, step 5** | Makes the "2 x" visible. |
| 6 | Cable `p i.io 1-1` (Initiating pulse to program trunk 1-1) | **Visitor, step 6** | The GO button gets wired to the machine. |
| 7 | Cable `p a2.6o 1-3` (Acc 2 "done adding 2x" to trunk 1-3) | **Visitor, step 7** | "The end of one job starts the next job." The sequencing idea. |
| 8 | Cable `p 1 a2.α` | Preset | Same idea as step 3; the visitor already learned it. |
| 9 | Cable `p 1-1 a1.6i` | Preset | Fan-out of the GO pulse. |
| 10 | Cable `p 1-1 a2.6i` | Preset | same |
| 11 | Cable `p 1-3 a1.5i` | Preset | Fan-out of the "next job" pulse. |
| 12 | Cable `p 1-3 a2.5i` | Preset | same |
| 13 | Cable `p 1-3 c.26i` | Preset | same |
| 14 | Cable `p a2.5o 1-2` | Preset | "Finished" signal; no visible effect. |
| 15 | Cable `p 1-2 a2.7i` | Preset | same |
| 16 | Switch `s a1.op5 α` | Preset | Program 5 takes numbers in. |
| 17 | Switch `s a1.op6 A` | Preset | Program 6 sends on A. |
| 18 | Switch `s a1.rp5 1` | Preset | Add 1 once. |
| 19 | Switch `s a2.op5 α` | Preset | Program 5 takes numbers in. |
| 20 | Switch `s a2.op6 β` | Preset | Program 6 takes numbers in on beta (matches the cable in step 4). |
| 21 | Switch `s a2.op7 A` | Preset | Send on A (unused). |
| 22 | Switch `s a2.rp5 1` | Preset | Add 1 once. |
| 23 | Switch `s a2.rp6 2` | Preset | Must match step 5. Explained in the step-5 "Tell me more". |
| 24 | Switch `s a2.rp7 1` | Preset | Unused tail. |
| 25 | Switch `s c.s26 Jlr` | Preset | Program 26 sends the J constant, left and right halves. |

Counts: visitor 7 of 25, preset 18 of 25. The "rest is done for you" animation reads "8 more cables, 10 more switches".

#### 8.1.3 Time budget (normal pace)

| Part | Time |
|---|---|
| Pick mission, read briefing | 0:15 |
| Step 0 "The plan" | 0:15 |
| Steps 1 to 7 (about 12 s each) | 1:25 |
| "Rest done for you" | 0:08 |
| Run: 4 presses with slow captions | 0:40 |
| Result | 0:15 |
| **Total** | **about 3:00**; with "Do it for me" on 2 steps about 2:30 |

If testing shows more than 3:00, trim by presetting step 3 (trunk 1 to Acc 1 alpha) and keeping the other six.

#### 8.1.4 Step-by-step script and copy

Copy rules: at most 40 words per card body, about a grade 4 to 5 reading level, short sentences. Tags: [FC] = needs Fact-Checker review (F7). Greek letters are always followed by their name the first time.

---

**0a. Briefing (S3)**

- Stage: L0 room plan with four markers: Initiating Unit, Constant Transmitter, Accumulator 1, Accumulator 2.
- Headline: **Mission 1: Squares**
- Body: "A square is a number times itself. 3 x 3 = 9. ENIAC can make a whole table of squares, and you will wire it up. No typing. In 1946, programming meant plugging in cables!" (35 words) [FC: 1946]
- Button: **Let's go**. Tell me more: "ENIAC was finished in 1945 and shown to the public on February 15, 1946. It had about 18,000 vacuum tubes. There was no keyboard for programs. People set cables and switches, a bit like an old telephone switchboard." [FC]
- Lamps: all dark lamp grids in the L0 view.

**0b. The plan (Step 0)**

- Stage: a simple two-box animation: "Acc 1 = the number", "Acc 2 = its square", with the trick written out as big math: `9 + 3 + 3 + 1 = 16`.
- Headline: **Here is the trick**
- Body: "To get the next square, add the number two times, then add 1. Start with 3 x 3 = 9. Add 3, add 3, add 1. You get 16, which is 4 x 4. ENIAC is great at adding!" (39 words)
- Buttons: **Next step** (there is nothing to tap on the machine), **Skip setup**.
- Tell me more: "This is Brian Stuart's example. Stuart's notes say this is faster than multiplying, because each new square needs only additions. The multiplier is a whole other unit of ENIAC, and this trick does not need it." [FC]

---

**Step 1 of 7 (switch): Dial in the number 1**

- Stage: L2 window of the Constant Transmitter's J dials. The units digit (digit 1) of the J constant glows.
- Headline: **Dial in the number 1**
- Body: "This is the Constant Transmitter. It holds a number that you set with dials. Tap the glowing dial and choose 1." (21 words)
- Action: tap the dial, picker 0 to 9, tap **1**.
- On correct: "Now it holds the number 1, ready to send."
- Wrong-tap hints: picker digit not 1: "Not that number. We need a 1." Wrong dial: "That is a different digit of the number. Try the glowing one."
- Lamps: nothing changes yet. The dial shows 1.
- Tell me more: "ENIAC had dials like these for numbers that never change, called constants. A number was up to 10 digits long." [FC]
- Sim item: `s c.j1 1`.

**Step 2 of 7 (cable): Plug into the number highway**

- Window 1 (left): Constant Transmitter jacks. Ring on **OUT**.
- Window 2 (right): Data trunk sockets at this unit. Ring on **Trunk 1**.
- Headline: **Put the 1 on the number highway**
- Body: "Numbers travel through cables on a data trunk, like cars on a highway. Tap the OUT jack. Then tap Trunk 1. Now the 1 can travel." (26 words)
- On correct: "The cable is in. The 1 is on Trunk 1."
- Hints: other jack in window 1: "That is a jack for signals. We want OUT, the number exit." Other trunk: "That is a different trunk. Choose Trunk 1."
- Lamps: the trunk rail gets a soft blue "live" tint (shape: a pulse dot travels along it once).
- Tell me more: "On the real ENIAC, trunks were long tubes of wires that ran along the machine. Cables plug units into them." [FC]
- Sim item: `p c.o 1`.

**Step 3 of 7 (cable): Take the number in**

- Window 1: Trunk sockets at Accumulator 1 (Trunk 1 glowing). Window 2: Accumulator 1 input jacks (alpha, beta, gamma, delta, epsilon); ring on **alpha**.
- Headline: **Send the 1 to Accumulator 1**
- Body: "Accumulators are ENIAC's adding machines. Each one holds a number and shows it in glowing neon lamps. Tap Trunk 1. Then tap the alpha jack, written with the Greek letter α." (31 words)
- On correct: "Accumulator 1 can now take in the 1."
- Hints: beta and others: "That is a different input. Look for the α, called alpha." A program jack: "That one takes signals, not numbers."
- Lamps: Acc 1 lamp band visible in the window background, all at 0.
- Tell me more: "ENIAC had 20 accumulators. Each held a 10-digit number and could add. They were its memory and its adders in one." [FC]
- Sim item: `p 1 a1.α`.

**Step 4 of 7 (cable): Connect the two accumulators**

- Window 1: Acc 1 jacks, ring on **A** (output). Window 2: Acc 2 inputs, ring on **beta**.
- Headline: **Connect Accumulator 1 to Accumulator 2**
- Body: "Accumulator 1 will hold the number. Accumulator 2 will hold its square. Plug the A output of Accumulator 1 into the β input (say beta) of Accumulator 2." (28 words)
- On correct: "Now Accumulator 1 can pass its number to Accumulator 2."
- Hints: S jack: "S is for subtracting. We want A." Alpha on Acc 2: "That input is for a different job. Try β, beta."
- Lamps: still 0.
- Tell me more: "A is the output that sends a number as it is. S sends its opposite, which is how ENIAC subtracted." [FC]
- Sim item: `p a1.A a2.β`.

**Step 5 of 7 (switch): Send it twice**

- Window: Acc 1 repeat switch for program 6. The glowing switch is labelled "Program 6 repeat". Picker 1 to 9 (with labels "1 time" ... "9 times"; only valid positions).
- Headline: **Send the number twice**
- Body: "Our trick adds the number two times. So Accumulator 1 must send it two times. Tap the glowing switch and pick 2." (22 words)
- On correct: "Accumulator 1 will now send its number 2 times."
- Hints: 1 or others: "We need the number to go twice. Pick 2."
- Lamps: still 0.
- Tell me more: "Every ENIAC job had a repeat switch. Here, Accumulator 2 also has to listen twice. That is one of the 10 switches we set for you." [FC]
- Sim item: `s a1.rp6 2`.

**Step 6 of 7 (cable): Wire the GO button**

- Window 1: Initiating Unit jacks, ring on **initiating pulse OUT**. Window 2: Program trunk sockets, ring on **1-1**.
- Headline: **Wire up the START button**
- Body: "When does it begin? The Initiating Unit has the GO button. Its signal travels on a program trunk, a highway for signals. Tap the GO output. Then tap program trunk 1-1." (31 words)
- On correct: "Now the GO button is wired in."
- Hints: other jacks: "That one belongs to another job. We want the initiating pulse output." Wrong trunk: "Try program trunk 1-1."
- Lamps: still 0. The program trunk rail gets a purple pulse dot once.
- Tell me more: "The Initiating Unit is where you press the button that starts the machine. It can also start the card reader and the card punch." [FC]
- Sim item: `p i.io 1-1`.

**Step 7 of 7 (cable): Say what happens next**

- Window 1: Acc 2 program jacks, ring on **6 OUT**. Window 2: Program trunk sockets, ring on **1-3**.
- Headline: **Say what happens next**
- Body: "When Accumulator 2 finishes adding twice, it sends a signal. That signal tells everyone to add 1. Tap the 6-out jack on Accumulator 2. Then tap program trunk 1-3." (29 words)
- On correct: "One job finishing now starts the next job. That is how ENIAC ran a whole program!"
- Hints: 5-out: "That jack is for the later step. We want 6, out." Program trunk 1-2: "Try program trunk 1-3."
- Lamps: still 0.
- Tell me more: "Every job on ENIAC ended with a signal, and that signal started the next job. Chaining those signals together was programming." [FC]
- Sim item: `p a2.6o 1-3`.
- Button at the bottom: **Finish wiring**.

**S5. The rest is done for you**

- Headline: **The rest is done for you**
- Body: "Real ENIAC programmers placed hundreds of cables by hand, and setting up took days. [FC] We will place the last ones now: 8 cables and 10 switches." (27 words)
- Animation: the 8 cables draw in (fast, 250 ms each) and the 10 dials click; counters count up to "8 cables, 10 switches".
- Button: **Continue** (96 h).
- Lamps: still 0.

---

**S6 Run: what the visitor does and sees**

All three run beats use **Slow** by default. The lamps are real; the captions fire on real lamp changes (F2).

| Press | Rail prompt (headline, 40 px) | Caption sequence (28 px, one at a time) | Lamps (Acc 1 / Acc 2) |
|---|---|---|---|
| Before | **Press INIT** ("INIT is the Initiating Pulse, ENIAC's GO button.") | none | 0 / 0 |
| 1 | **Watch the lamps** | 1. "Accumulator 1 sends its number: 0, twice." 2. "Now everyone adds 1." 3. "1 x 1 = 1" | Acc 1: 0 to 1. Acc 2: 0 to 1. The tape writes `1 x 1 = 1`. |
| 2 | **Press INIT again** | 1. "Accumulator 1 sends its 1, two times." (Acc 2: 1, 2, 3) 2. "Now add 1." 3. "2 x 2 = 4" | Acc 1: 1 to 2. Acc 2: 1 to 2 to 3 to 4. Tape: `2 x 2 = 4`. |
| 3 | **Again!** | 1. "Send 2, twice." (Acc 2: 4, 6, 8) 2. "Add 1." 3. "3 x 3 = 9" | Acc 1: 2 to 3. Acc 2: 4 to 6 to 8 to 9. |
| 4 and later | (rail shows the buttons below) | Captions optional (toggle "Show captions") | x and x squared, for example 4 and 16, then 5 and 25 |

After press 3 the rail adds:

- **Keep pressing for me**: the front end presses INIT, waits until the machine is ready, and presses again, at about 2 squares per second in Full. In Slow (`cy.rate 13` since spike S4, v0.4) one press already takes about 13 s with every addition visible, so it waits only half a second between presses: about one square every 13 to 14 s. Stops at x = 12 (144). (FR-17 adapted to F1.)
- **Show me what happened** (primary, 96 h): goes to S7.
- Speed control and "Skip to the answer" (auto-presses to x = 12 at unthrottled speed, then S7).
- Hint: "Want it faster? Try Full."

"CLEAR" sets both to 0, and INIT then restarts the table.

**Result (S7) copy**

- Headline: **You made a table of squares!**
- Body: "Each new square is the old square, plus the number twice, plus 1. Like 9 + 3 + 3 + 1 = 16. ENIAC did it by adding, and you wired it." (32 words)
- Takeaway strip: **The cables were the program.** Sub-line: "To make ENIAC do something new, people plugged in different cables."
- Left: the notebook tape from the real lamps (for example `1 x 1 = 1` up to `12 x 12 = 144`).
- Tell me more: "One addition took ENIAC 1/5,000 of a second. [FC] We slowed things down so you could see the steps. Brian Stuart's simulator follows the real machine pulse by pulse." 
- Buttons: **Next: Primes**, Try again, Menu.

### 8.2 Primes (Mission 2): the complete script

Copy rules as in 8.1.4: at most 40 words per card body, grade 4 to 5, [FC] = Fact-Checker. Tags used below for non-copy statements: **[V]** = verified by the UX agent on 2026-10-01 by running the pinned core (c4b94f2 plus `patches/0001` and `0002`, macOS arm64, Go 1.25.5, stub display); **[I]** = my reading of the program, to be confirmed (Stuart, De Mol and Bullynck, or the S1/S2 spikes); **[A]** = timing assumption, replace when the spike lands. The Pi 5 has not been measured.

#### 8.2.1 What sieve.e does

`programs/sieve.e` (606 lines, 268 cables, 286 switches, no `b`, `f` or `l` lines) is "a prime sieve based on Lehmer's July 1946 runs and De Mol and Bullynck's reconstruction thereof" (the file's own header) [FC]. One INIT starts the whole search. It punches one card for every odd prime from 3 to 2801 and then stops. [V] 407 cards, first card `...0000000003`, last `...0000002801` (the count matches my own count of primes up to 2801, excluding 2).

*Engineering prose: "watcher" below is a technical nickname for each of Accumulators 1 to 14 (one per group size). It is not visitor copy. Visitors hear "group checker" and "fits!".*

How it works [I, with the watcher-to-prime mapping and the shout timing confirmed in a slow run, [V]]:

```
Acc 19 .......... the number being tested: starts at 1 (J constant), adds 2 (K constant) each time:  3, 5, 7, 9, 11 ...
Acc 1 to 14 ..... fourteen "watchers", one per small prime: 3 5 7 11 13 17 19 23 29 31 37 41 43 47
                  (the function-table dials hold 2p and p-1 for each prime: I decoded them, for example 06 and 02 for 3)
Each odd number .. every watcher counts one step. A watcher whose count lands on the number fires its
                  program 12 (lamp "prog 12" on that accumulator) and sends a pulse on trunk 1-7.
Master Programmer . stepper A hears trunk 1-7 (jack A-DI). Any shout means "not prime": no card, next number.
                  No shout means prime: A sends a pulse on trunk 1-9 to the Initiating Unit's punch input.
Card punch ....... punches Acc 19 into card columns 61 to 70 (printer switches 13 and 14), then sends
                  "punch done" (i.po) on trunk 1-4, which starts the next number.
```

[V] In a slow run the first shouts were: 9 (watcher 3), 15 (watchers 3 and 5), 21 (3 and 7), 25 (5), 27 (3). A watcher never shouts at its own prime, so 3, 5 and 7 each got a card. Fourteen watchers cover every odd number below 53 x 53 = 2,809, which is why the search stops at 2801 [I].

**Measured timings** [V, on the Mac; the Pi 5 is still to be measured in S1/R3]:

| What | Full (rate 0) | Slow (`s cy.rate 100`) |
|---|---|---|
| INIT to first card | about 0.15 s | about 4.6 s (loading the watchers first) |
| Pace | one card per about 0.6 s (the punch simulation waits 150 ms + 450 ms per card, `initiate.go`; CPU speed does not change it); odd numbers that are not prime take only about 0.1 to 0.2 s | one odd number tested per about 1.85 s, so cards at 3, 5, 7 come 1.9 s apart and 11 comes 3.5 s after 7 (the 9 in between) |
| 50 cards (prime 233) | 30 s | not measured |
| 100 cards (prime 547) | 60 s | not measured |
| 200 cards (prime 1229) | 120 s | not measured |
| All 407 (prime 2801) | **about 250 s** | far too long |

Two consequences. (1) **The sieve is punch-bound, so "Skip to the answer" cannot make the run shorter than about 4 minutes at Full.** The design below picks a checkpoint at card 100 (about 1 minute) as "the answer" and lets the live count keep ticking on the result screen. (2) Without `patches/0002-ft-repeat-default.patch` this mission punches nothing (spike S3). The mission must fail validation if the patch is missing, using the `sieve-canary` from test plan 3.2.

#### 8.2.2 Every cable and switch, and who does it

There are **268 cables and 286 switches**. The visitor does **5 steps: 4 cables and 1 dial**. The other 264 cables and 285 switches are preset.

| # | Step (exact line in sieve.e) | Kind | Who | Why |
|---|---|---|---|---|
| 1 | `s c.k1 2` | switch, constant digit (0 to 9) | **Visitor, step 1** | "Step up by 2": only odd numbers get tested. Easy first touch. |
| 2 | `p a1.12o 1-7` | cable, program | **Visitor, step 2** | "The groups-of-3 checker calls out 'fits!'." The idea of a test result as a signal. |
| 3 | `p 1-7 p.Adi` | cable, program | **Visitor, step 3** | "The conductor listens." Master Programmer stepper A. |
| 4 | `p 1-9 i.pi` | cable, program | **Visitor, step 4** | "No group fits: punch a card." The payoff cable. |
| 5 | `p i.po 1-4` | cable, program | **Visitor, step 5** | "Punch done: next number." The loop. |

Each of the five lines appears exactly once in `sieve.e`. Rule 4 (per terminal, ignoring trunk ends) holds for each: I checked that no other line plugs `a1.12o`, `p.Adi`, `i.pi` or `i.po`, or sets `c.k1`. (The 13 other watchers' `aN.12o 1-7` lines use different jacks, and trunk 1-7 is exempt.) `s pr.13 P` and `s pr.14 P` also pass rule 4 but are left preset: the printer switch teaches nothing the cards will not teach better. Not used as steps: `p i.io 1-1` (it would pass here, but INIT wiring was taught in Squares).

Preset, in groups (counts are exact):

| Group | Cables | Switches |
|---|---|---|
| Number highway (`p c.o 1` and trunk 1 to the beta jack of Acc 1 to 14 and 19, table outputs to trunks 2 to 7) | 17 | |
| Table to watcher, through 56 shift-delete adapters | 56 | |
| Watcher self-test, through 28 digit-pulse adapters | 28 | |
| Program wiring (start-up load, loop, shouts from the other 13 watchers, punch) | 163 | |
| Accumulators 1 to 14 and 19 (operation, correction and repeat switches) | | 188 |
| Function tables 1 to 3 (the 2p and p-1 tables, 78 switches) | | 78 |
| Master Programmer (steppers A, B, C and their decade dials) | | 14 |
| Constant Transmitter (`c.s25`, `c.s26`, `c.j1`) and printer (`pr.13`, `pr.14`) | | 5 |
| **Total** | **264** | **285** |

S5 reads "264 more cables, 285 more switches" (and, in the body, "13 more group checkers").

**Units and panels the kit must draw** (IDs per architecture 6.1):

| Unit | Why | Elements |
|---|---|---|
| Initiating Unit (`i`) | Steps 4 and 5, INIT, lamps | jacks `i.pi`, `i.po`, `i.io` (preset); `lamp:init.*` |
| Constant Transmitter (`c`) | Step 1, preset | dial `c.k1` (the K dial, digit 1) in the Workbench; `c.j1`, `c.s25`, `c.s26`; jacks `c.o`, `c.25i`, `c.26i`, `c.25o`, `c.26o` |
| Accumulator 1 | Step 2, and the "3-watcher" in the run | full panel: lamp grid, jacks alpha, beta, gamma, A, S, program jacks 1i 2i 5i 6i 10i 11i 12i and 6o 10o 11o 12o, switches `op/cc/rp` for programs 1, 2, 5, 6, 10, 11, 12; lamp `lamp:acc.1.prog.12` |
| Accumulators 2 to 14 | Preset, run lamps | the same panel as Acc 1; drawn on the run view only, in compact form |
| Accumulator 19 | Preset; **the number being tested, shown live** | lamp grid and helper readout; jacks beta, 1i, 5i, 10i, 12i, 10o, 12o |
| Master Programmer (`p`) | Step 3, preset | jack `p.Adi` in the Workbench; steppers A, B, C: `p.Ai`, `p.Acdi`, `p.A1o`, `p.A2o`, `p.Bi`, `p.B1o`, `p.B2o`, `p.Ci`, `p.C1o`; dials `p.cA`, `p.cB`, `p.cC`, `p.a14`, `p.a18`, `p.d14` to `p.d20`; lamps `lamp:mp.*` |
| Function Tables 1 to 3 (`f1`, `f2`, `f3`) | Preset; lamps on the run view | jacks A, B, 1i, 2i, 3i, 1o, 3o; the `A1C..A4C`, `RA0L1..6`, `B1C..B4C`, `RB0L1..6` dial banks; `op1..3`, `cl1..3`; ring lamps `lamp:ft.U.ring.K` |
| Printer and punch (`pr`) | Preset `pr.13`, `pr.14`; the card pane | two field switches; the **card output pane is a UI element**, not an SVG panel |
| Adapters (`ad`) | S5 only | 84 small boxes (56 shift-delete, 28 digit-pulse) drawn on the trunk rails as black boxes. Not tappable. |
| Trunks | Steps | data trunks 1 to 7; program trunks 1-1 to 1-11, 2-2, 2-3, 3-1 to 3-10, 4-1 to 4-10, 5-1 to 5-8 |

Not needed: card reader, multiplier, divider. No `f r` line, so there is no READ.

The Workbench for the steps shows four panels: Constant Transmitter, Accumulator 1, Master Programmer and Initiating Unit (4 x 300 px, as in 4.2).

#### 8.2.3 The visual metaphor: sharing evenly into equal groups

*Direction from Nick (2026-10-01): a visitor must understand what a prime IS, explained as for a 5th grader.* Squares used tiles on a floor (handoff-squares-tiles.md). Primes uses the **same floor**, and the idea of **sharing evenly**. 12 cookies share evenly: 2 groups of 6, 3 of 4, 4 of 3. With 7, there is always one left over, however you try. A number that **won't split into equal groups** is prime. On the floor, an equal group is a row of tiles, and the leftover is the tile hanging over. Visitors who did Squares already believe in tiles. The main cards never say "divisible", "factor" or "only divisible by 1 and itself"; the textbook definition lives in Tell me more, for parents.

For the plan, the machine's method is a second picture: **counting wheels, one group size each**. A number's tiles try groups of 3, 5, 7 and more, all at once. Each group size that fits evenly calls out "fits!". A number nobody calls out for is prime, and gets a card. In visitor copy these are "group checkers" (never "watchers", which is only an engineering nickname in 8.2.1 and 8.2.2).

**Briefing canvas (S3), tile animation.** Loops after about 11 s. Reduced motion: both examples shown side by side, finished.

| Beat | Tiles | Colour and second cue | Caption |
|---|---|---|---|
| 0.3 s | 12 tiles in one row | `--lamp-on` amber | "12 cookies" |
| 1.5 s | They snap into 3 equal rows of 4 | amber, rows outlined, a check badge labelled "fits" | "3 equal groups of 4. It shares evenly!" |
| 4.0 s | 7 tiles in one row | amber | "Now 7" |
| 5.2 s | They try 2 rows: 3 and 3, one tile hanging over | the leftover tile in `--wrong` vermillion, highlighted, with an X badge | "2 groups: 1 left over" |
| 6.6 s | They try 3 rows: 2, 2, 2 and one tile over | same | "3 groups: 1 left over" |
| 8.2 s | Back to one row, with a "P" star badge | `--ok` green, plus the word | "7 won't split evenly. Prime!" |

An **Again** button (64 px minimum) replays. The order, the X badge and the highlighted leftover carry the meaning as well as the colour.

**Plan canvas (step 0b), group sizes side by side.** Loops after about 13 s. The candidate number is shown as a row of tiles. Below it, three counting wheels labelled "groups of 3", "groups of 5", "groups of 7" and a note "+ 11 more group sizes" (14 on the real machine: 3 up to 47). Each wheel shows the tiles arranged into that group size and ends on a check badge (fits evenly) or an X badge with a highlighted leftover. The punch is at the right.

| Beat | What happens | Cue |
|---|---|---|
| 0.3 s | Candidate **9** (nine tiles) slides in. All three wheels try at once. | wheels in `--lamp-on` |
| 1.5 s | Groups of 3: 3 equal groups, a check and a chip "fits!". Groups of 5 and 7: one group and leftovers, X. | `--cable-prog` pink chip with a bell glyph and the words; X badges with highlighted leftovers |
| 2.6 s | The 9 drops into the bin and greys out | label "out: no card" |
| 4.2 s | Candidate **11** slides in. Every wheel shows an X. | three X badges |
| 5.6 s | The 11 stays amber and slides to the punch. A card is punched. | `--ok` check badge, label "prime: punch a card" |
| 7.8 s | Candidate **15**: groups of 3 and groups of 5 both fit (checks), groups of 7 show an X. It drops. | two chips |
| 10.0 s | The math line is written: `9 = 3 groups of 3 -> out   11: no equal groups -> prime` | |

Both canvases use only the numbers the real program also uses. The wheels are explanatory art, labelled "how it works, slowed down". The run view below shows the real lamps.

#### 8.2.4 Time budget (normal pace)

| Part | Time |
|---|---|
| Pick mission, read briefing (with tile animation) | 0:25 |
| Step 0 "The plan" | 0:25 |
| Steps 1 to 5 (about 12 s each) | 1:00 |
| "Rest done for you" | 0:08 |
| Run: INIT, Slow for the first 5 cards (about 12 s), then Full to card 100 (about 60 s) | 1:15 [A: Mac numbers] |
| Result | 0:20 |
| **Total** | **about 3:45**; with "Do it for me" on 2 steps about 3:20 |

If the Pi 5 punches slower, or testing shows more than 4:00, change the answer checkpoint to card 50 (about 30 s at Full). Trim steps by presetting step 1 (`s c.k1 2`) as a last resort.

#### 8.2.5 Step-by-step script and copy

**0a. Briefing (S3)**

- Stage: L0 room plan with five markers: Initiating Unit, Constant Transmitter, Accumulators 1 to 14 (one grouped marker), Master Programmer, Function Tables. The canvas is the cookies-and-tiles animation in 8.2.3.
- Headline: **What is a prime?**
- Body: "Can you share 12 cookies evenly? Yes: 3 groups of 4. Now try 7. There is always one left over. Numbers that won't split into equal groups are prime: 2, 3, 5, 7, 11…" (34 words)
- Button: **Let's go**. Tell me more: "For parents: a prime is a number above 1 that divides evenly only by 1 and itself. In 1946 ENIAC hunted for primes. ENIAC was shown to the public on February 15, 1946, and in July 1946 D. H. Lehmer ran prime searches on it. Brian Stuart's program is based on those runs and on a reconstruction by Liesbeth De Mol and Maarten Bullynck." (64 words) [FC: 1946, Lehmer, the reconstruction]
- Lamps: dark lamp grids on the L0 plan.

**0b. The plan (Step 0)**

- Stage: the group-size animation in 8.2.3.
- Headline: **Here is the trick**
- Body: "ENIAC tests one number at a time. It tries to split it into groups of 3, 5, 7, and more, all at once. If any group size works, it's out. If none work, it's prime!" (35 words)
- Math line under the animation: `9 = 3 groups of 3 -> out   11: no equal groups -> prime`
- Buttons: **Next step**, **Skip setup**.
- Tell me more: "ENIAC skips even numbers, which always split into 2 equal groups. It needs only 14 group sizes, 3 up to 47. A number below 2,809 (53 x 53) that is not prime always splits into equal groups of 47 or fewer. That is why this search stops at 2,801. Crossing out multiples is an old idea called a sieve." (59 words) [FC]

---

**Step 1 of 5 (switch): Count up by 2**

- Stage: L2 window of the Constant Transmitter's K dials. The units digit (digit 1) of the K constant glows. (The J dials sit beside it, J digit 1 already shows 1: "start at 1".)
- Headline: **Count up by 2**
- Body: "Any even number splits into 2 equal groups, so ENIAC tests only odd numbers: 3, 5, 7... It must step up by 2 each time. Tap the glowing dial on the Constant Transmitter and choose 2." (36 words)
- Action: tap the dial, picker 0 to 9, tap **2**.
- On correct: "Now ENIAC will step up by 2 each time."
- Wrong-tap hints: picker digit not 2: "We want to step by 2. Pick 2." Wrong dial: "That is a different dial. Try the glowing one."
- Lamps: nothing changes yet. The dial shows 2.
- Tell me more: "The Constant Transmitter has two sets of dials. J holds the number to start from, here 1. K holds the step, here 2. ENIAC adds the step to its test number again and again." (34 words)
- Sim item: `s c.k1 2`.

**Step 2 of 5 (cable): The checker calls out 'fits!'**

- Window 1 (left): Accumulator 1 program jacks. Ring on **12 OUT**. Window 2 (right): program trunk sockets. Ring on **1-7**.
- Headline: **Let the checker call out**
- Body: "Accumulator 1 is the groups-of-3 checker. When a number splits into equal groups of 3, it sends a signal: 'fits!' Tap the 12-out jack on Accumulator 1. Then tap program trunk 1-7." (32 words)
- On correct: "Now Accumulator 1 can call out 'fits!'"
- Hints: other program jack: "That jack is for a different signal. Look for 12, out." Wrong trunk: "Try program trunk 1-7."
- Lamps: Acc 1 lamp band at 0.
- Tell me more: "Each checker tries one group size. The groups-of-3 checker calls out for 9, 15, 21, and so on. We have wired 13 more checkers just like this one, for groups of 5, 7, 11, and on up to 47." (39 words)
- Sim item: `p a1.12o 1-7`.

**Step 3 of 5 (cable): The conductor listens**

- Window 1: program trunk sockets, ring on **1-7**. Window 2: Master Programmer jacks, ring on **A DI** (the direct input of stepper A).
- Headline: **Let the conductor listen**
- Body: "The Master Programmer is ENIAC's conductor. It decides what happens next. Tap program trunk 1-7. Then tap the A-DI jack on the Master Programmer, so it can hear every 'fits!'." (30 words)
- On correct: "The conductor can now hear the checkers."
- Hints: other MP jack: "That jack is for a different job. Look for A, DI." Wrong trunk: "Try program trunk 1-7."
- Lamps: still 0. The MP stepper A lamps are visible in the window background, at stage 1.
- Tell me more: "If any checker calls out 'fits!', the conductor skips the card. If none do, the number will not split into equal groups at all. The real Master Programmer had ten steppers, a bit like a music box with pins." (39 words) [FC]
- Sim item: `p 1-7 p.Adi`.

**Step 4 of 5 (cable): No group fits, punch a card**

- Window 1: program trunk sockets, ring on **1-9**. Window 2: Initiating Unit jacks, ring on **PI** (the punch start input).
- Headline: **Punch a card for every prime**
- Body: "If no group size fits, the number is prime. The conductor then sends a signal on program trunk 1-9. Tap trunk 1-9. Then tap the PI jack on the Initiating Unit. That starts the card punch." (36 words)
- On correct: "Now every prime will get a punched card."
- Hints: other IU jack: "That jack starts something else. We want the card punch." Wrong trunk: "Try program trunk 1-9."
- Lamps: still 0.
- Tell me more: "A card punch makes holes in a card, one number per card. It could punch about 100 cards a minute. Our simulator copies that pace, so it cannot hurry any faster." (31 words) [FC]
- Sim item: `p 1-9 i.pi`.

**Step 5 of 5 (cable): Then try the next number**

- Window 1: Initiating Unit jacks, ring on **PO** (punch done, OUT). Window 2: program trunk sockets, ring on **1-4**.
- Headline: **Go on to the next number**
- Body: "When a card is punched, ENIAC moves on. The punch sends a done signal. Tap the PO jack on the Initiating Unit. Then tap program trunk 1-4, which starts the next number." (32 words)
- On correct: "Punch, then next number. That loop is the whole program!"
- Hints: PI jack: "That is the punch start. We want the one that says done: PO." Wrong trunk: "Try program trunk 1-4."
- Lamps: still 0.
- Tell me more: "A loop is when the end of a job starts the job again. ENIAC runs this one about 1,400 times, from 3 up to 2,801, and then stops." (28 words)
- Sim item: `p i.po 1-4`.
- Button at the bottom: **Finish wiring**.

**S5. The rest is done for you**

- Headline: **The rest is done for you**
- Body: "Real ENIAC programmers placed hundreds of cables by hand, and setting up took days. We will place the last ones now: 264 cables and 285 switches, including 13 more group checkers." (31 words) [FC]
- Animation: too many items for 250 ms each (that would take over a minute). Cables draw in about 8 waves of about 33 cables (600 ms per wave), and the dials click in groups; the counters count up and ease to "264 cables, 285 switches". The whole screen takes at most 8 s.
- Button: **Continue** (96 h). Lamps: still 0.

---

**S6 Run: what the visitor does and sees**

There is no READ and no CLEAR. The only run button is **INIT**. Layout (stage 1360 x 904, rail as in 7.5):

```
LEFT x24-880                                          RIGHT x904-1384 : PUNCHED CARDS
+----------------------------------------------+      +-------------------------------+
| TESTING   [ 0000000163 ]  helper readout     |      | newest card, large 480 x 150  |
|  (Acc 19 lamps, live)                        |      |  printed digits over holes    |
+----------------------------------------------+      |  "Prime number 37: 163"       |
| GROUP CHECKERS                               |      +-------------------------------+
|  [3][5][7][11][13][17][19]                   |      | 19 older cards, 480 x 34 each |
|  [23][29][31][37][41][43][47]  chip lights   |      |  newest on top, last 20 kept  |
|  when that accumulator's prog-12 lamp is on  |      |  "...0000000157"              |
+----------------------------------------------+      |  "...0000000151"              |
| PRIMES PER HUNDRED  (28 bars, grow live)     |      |   ...                         |
|  |||||||| ||||||  |||||   ||||  |||  ||        |      +-------------------------------+
|  3          1000          2000        2801   |      |  Cards: 37   Latest: 163      |
+----------------------------------------------+      +-------------------------------+
| ACC 19 lamp grid (26 px lamps)  | ACC 1 grid  |
+----------------------------------------------+
```

| Press | Rail prompt (40 px) | Caption sequence (28 px, one at a time, each fires once) | What the lamps and cards show |
|---|---|---|---|
| Before | **Press INIT** ("INIT is the Initiating Pulse, ENIAC's GO button.") | none | All lamps 0. The card pane says "No cards yet." |
| 1, first 5 s (Slow) | **Watch the checkers** | 1. "ENIAC gives each checker its group size." (on run busy) | Function table ring lamps and accumulator lamps move. Acc 19 gets its 1 and then 3. |
| first card | | 2. "3 won't split into equal groups. Nothing fits, so ENIAC punched a card." (on the first card) | Card `3` slides out, printed 3 and holes in the 3 row. Chips quiet. Count 1. |
| first fit | | 3. "9 splits into 3 groups of 3, so no card." (when `lamp:acc.1.prog.12` first lights) | Acc 19 reads 9 on the readout. Chip 3 ("groups of 3") flashes pink, with a bell glyph and "fits!". No card. |
| 5th card | **Primes pile up** | 4. "Only primes get a card. Watch them pile up." | Hint chip: "Want it faster? Try Full." |
| later | rail buttons below | Captions off by default (toggle "Show captions") | In Slow about 1 test per 1.85 s; in Full about 1.7 cards per second at the start |

The punched-card display (FR-21):

- **Card graphic.** A cream card with the top-left corner cut. 80 columns exist, but this program punches only columns 61 to 70 (printer switches 13 and 14), so the large card shows **columns 51 to 80** on a torn edge. Digits are printed along the top margin above each punched column; below them 12 rows (12, 11, 0 to 9) with a dark hole for each digit. The cards are never fake: digits and holes come from the real `punch` line (field index 12 and 13, cols 61 to 70).
- **Motion.** The new card slides down out of a punch slot at the top of the pane in 300 ms, and the older cards shift down one row. At Full there are about 1.7 cards per second, so shifts are 150 ms and no card is skipped. The pane stops animating under "Reduce motion".
- **Counters.** "Cards: 37" and "Latest: 163" at 40 px. These are the same real data.
- **Prime bars.** 28 bars, one for each hundred numbers (3 to 100, 101 to 200, ..., 2701 to 2801). Each card adds 1 to its bar. They show that primes get rarer.
- No card is ever shown before it is punched. If the core stalls, the pane freezes and S10 follows (no demo fallback).

After the 5th card the rail adds:

- **Speed:** Slow | Full. Full is `rate 0`. Slow is `rate 100` (kept after spike S4: about 1.8 s per odd number tested). The hint chip "Want it faster? Try Full." appears with the 5th card. There is no auto-switch.
- **Show me what happened** (primary, 96 h): goes to S7 now. The result screen is live (below).
- **Skip to the answer:** sets Full and goes to S7 immediately. **It cannot make the machine faster than about 0.6 s per card**, so S7 first shows a waiting state ("ENIAC is counting primes: 37 of the first 100") until card 100 (the `hundred` checkpoint), and then the result headline appears. At Full from the start this takes about 1:00 on the Mac. If ENIAC has already punched more than 100 cards, S7 is instant.

*(v0.5: if a run stays busy with no new card for 20 s at Full or 60 s at Slow, the bridge raises a stall and S10 "ENIAC is resting" and recovery take over, instead of a stuck screen. Trajectory: 10 s without a card.)* If the visitor leaves the run view idle, the standard 3 minute run timeout (S9) applies. The run is never "idle" in the machine sense until card 407, so INIT stays greyed. The mission needs no CLEAR.

**Result (S7) copy**

- Headline: **ENIAC found the primes!**
- Body: "Every card is a prime: a number that won't split into equal groups. ENIAC tried groups of 3, 5, 7 and more on each odd number. Same machine as Squares, with different cables." (33 words)
- Takeaway strip: **Same machine. Different cables. A different job.** Sub-line: "Changing the cables changed what ENIAC did."
- Left: the punched cards pane (last 20), plus the prime bars. A **live line** below them ticks while the run goes on: "ENIAC is still working: 143 primes so far." At the last card (`...0000002801`) it reads: "ENIAC has found them all: 407 primes, from 3 to 2,801." This is real core data. S7's 90 s timer still applies.
- Tell me more: "The old idea of crossing out multiples is called the sieve of Eratosthenes, after a Greek scholar. ENIAC did it with 14 counters instead of a pencil. Today, big primes help keep online messages secret." (35 words) [FC]
- Buttons: **Next: Trajectory**, Try again, Menu.

#### 8.2.6 Mission file mapping (`missions/primes.yaml`)

`programSha256` for `sieve.e` at c4b94f2: `23f19a553e9601f56c213a53899495f4e4fd251d4bbaa1f12bcf0363d70d5c70` (computed by the UX agent from the local clone). Steps are in presentation order. All lines are `p` or `s` lines (rule 2), unique (rule 1), and rule 4 holds (checked by script on 2026-10-01).

```yaml
schema: 1
id: primes
title: "Primes"
order: 2
summary: "Set ENIAC hunting for prime numbers."
program: sieve.e
programSha256: "23f19a553e9601f56c213a53899495f4e4fd251d4bbaa1f12bcf0363d70d5c70"
includes: {}
ordered: true

steps:
  - id: k1-two
    line: "s c.k1 2"
    expect: { switch: c.k1, value: "2" }
    choices: ["0","1","2","3","4","5","6","7","8","9"]
  - id: a1-fits
    line: "p a1.12o 1-7"
    expect: { from: a1.12o, to: 1-7 }
  - id: trunk17-to-mp
    line: "p 1-7 p.Adi"
    expect: { from: 1-7, to: p.Adi }
  - id: trunk19-to-punch
    line: "p 1-9 i.pi"
    expect: { from: 1-9, to: i.pi }
  - id: punch-done-to-14
    line: "p i.po 1-4"
    expect: { from: i.po, to: 1-4 }
    button: "Finish wiring"
withheld: []

run:
  buttons: [init]
  watch: ["19"]
  idle: { quietMs: auto }            # the sieve is busy until 2801; the UI never waits for idle
  speeds:
    slow: { rate: 100 }              # about 1.85 s per odd number [V on the Mac], kept after spike S4
    full: { rate: 0 }
  defaultSpeed: slow

checkpoints:
  - { id: first-card, when: { punchCount: { gte: 1 } } }
  - { id: hundred,    when: { punchCount: { gte: 100 } } }                          # the answer (about 1 min at Full)
  - { id: last,       when: { punchField: { index: 13, eq: "02801" } } }            # card 407
result: hundred

selftest:                            # rule 8; needs a new "until" and per-card expect (see 8.5)
  inits: 1
  until: { punchCount: { gte: 5 } }
  expect: { punchField: { index: 13, values: ["00003","00005","00007","00011","00013"] } }
```

`content:` block keys, with the copy above: `briefing` (headline, body, more, buttons), `plan` (headline, body, **math**, more, buttons), `rest` (headline, body, buttons), `run` (`before`; `presses` with one entry and the four captions, triggers `{run: busy}`, `{punchCount: {gte: 1}}`, `{accProg: {acc: "1", program: 12}}`, `{punchCount: {gte: 5}}`; `extras` with `afterPress`, no `keepPressing`, `showResult`, `skipToAnswer`, `hint`, `stopAt: hundred`), `result` (as for Squares, plus the live-line text in `liveLine: {pending: "ENIAC is still working: {n} primes so far.", done: "ENIAC has found them all: {n} primes, from 3 to 2,801."}`). New keys the loader must accept are listed in 8.5.

`summary` (picker): "Set ENIAC hunting for prime numbers." `credits`: "Brian L. Stuart, programs/sieve.e. After D. H. Lehmer's July 1946 runs, as reconstructed by L. De Mol and M. Bullynck." [FC]

### 8.3 Trajectory (Mission 3): the complete script

Tags as in 8.2: **[V]** verified by the UX agent by running the pinned core on 2026-10-01 (c4b94f2 plus patches 0001 and 0002, macOS arm64); **[I]** my reading, to be confirmed; **[A]** timing assumption. `docs/spikes/S2-trajdemo.md` did not exist when I finished this section, so every number here is mine and must be replaced by the S2 numbers when they land (see 8.3.7). The Pi 5 has not been measured.

> **v0.4: decisions after spike S2 (Nick, 2026-10-01). These override the rest of 8.3 where they differ.**
>
> 1. **Structure:** READ, then INIT, then **one flight of 34 cards**, the arc drawn from the real punched cards (PRD FR-19 rewritten; the six-part run stays Plan B, 8.3.8).
> 2. **Start:** one READ tap sends **`b c` then `b r`** (both withheld lines are bound to READ). The CLEAR prevents the all-zero first card: with it, 10 of 10 S2 runs punched hop 1 first, so a flight is **34** cards, not 35.
> 3. **Landing:** the first card with `-` in column 71 (punch field 14 starts with `-`) is the `landed` checkpoint; the bridge then freezes the machine with **`s cy.op 1a`** (already whitelisted; S2 showed nothing more is punched or even reported). The mission never sends a second INIT: INIT is pressed once (`run.initOnce`), because a second INIT mid-flight corrupts the flight. **Full speed only, no speed control.**
> 4. **Timings (S2, Mac, quiet):** READ about 0.4 s; first card about 1.5 s after INIT; **one card every 1.43 s**; landing at about **49 s**. Plan on 1.5 to 2.5 s a card on the Pi until it is measured. These replace the [A] numbers below (8.3.7).
> 5. **Units:** no feet or seconds on screen until Stuart or the Fact-Checker confirms them. Captions say "each dot is one card" and so on; the axes are "Along" and "Up".

#### 8.3.1 What trajdemo.e really does (read this first)

`programs/trajdemo.e` has a 6-part story in its header: "an attempt to recreate the demo at the unveiling of the ENIAC on Feb 15, 1946", with the Master Programmer's A stepper advanced by INIT, one part per press (adding 97,367 to itself 5,000 times, again with a 100 Hz clock, the multiplier, a table of squares and cubes, sines and cosines, and the artillery trajectory). It is 297 cables and 443 switches, plus `drag.e` (705 switches, the drag table in Function Table 2), so **297 cables and 1,148 switches** in all. The tail of the file runs `b c`, `b r`, `b i` itself (clear, read, INIT).

**[V] At the pinned commit the parts do not come one per INIT.** I ran the file with the three `b` lines removed and drove it by hand (build: pin plus patches 0001 and 0002 only; `0003` was not yet in my tree):

1. `b r` (READ) loads the card, which takes about 0.4 s. Accumulator 1 then shows `0000097367` (the first number on the card) and nothing else starts.
2. **The first `b i` (INIT) starts the artillery trajectory immediately.** The file wires `p p.A1o 1-4` (A stage 1 to the H stepper, the trajectory loop), where the file has `#p p.A1o 1-6` (which would start the 5,000-additions part) commented out. `p i.Io 3-10` near the end of the file also plugs the INIT button straight into the trajectory's start trunk.
3. **Every further INIT restarts the trajectory** (a new "00001" card appears each press), from whatever state the machine is in, so the second and later flights start with different numbers than a clean first flight. In 90 s with 6 INITs spaced 12 s apart I saw activity only in the trajectory's accumulators (4 to 15, 18 and 20). Acc 2, 16, 17 and the A and B stepper stages never changed. So **parts 1 to 5 were not reached by INIT**.
4. After the shell lands, the program starts another flight by itself, and goes on until the core is stopped. `b c` (CLEAR) mid-flight did not stop it either: one garbage card, then the flight restarted from clean state.

This is the R4 risk in the PRD, and it has happened: **FR-19 as written (INIT per demo part, fast-forward, skip to the trajectory) cannot be met with the unmodified `.e` at this pin.** The honest mission is therefore **READ, then INIT, then watch one flight, hop by hop, as cards are punched**. The six-part script from the earlier outline is kept in 8.3.8 for the day S2 finds a route to the other parts. The mission below does not depend on it.

What one flight looks like [V], from a clean core:

- **Cards.** After INIT the punch makes one card per hop. Each card has the hop number (card columns 26 to 30), the shell's "along" number (columns 51 to 60, Acc 18) and "up" number (columns 71 to 80, Acc 20). First card `...00001...0014128681...0005693229`; the 35th card has a negative "up" (`-002951425`): the shell has landed. In the three clean first flights I ran, the first cards were identical (so a golden for the first 3 cards is safe, as S3 also found for 7). The first card is sometimes an all-zero card ("shell at the gun") and sometimes the first hop, depending on the READ to INIT gap (2 s: hop; 3 s: zero card), so the UI must not assume which.
- **Live lamps.** Acc 15 counts hops, Acc 18 holds "along", Acc 20 holds "up", Acc 6 and Acc 4 hold the two speeds [I] (they fall slowly with the air drag and with gravity: Acc 4 went 5.47, 5.04, 4.64, 4.24 over the first four cards). The Multiplier and Function Table 2 (the drag lookup) are busy between cards. The Master Programmer's H stepper goes 1, 2, 0 once per hop, in a burst of about 0.2 s at the end of each hop.
- **Scale** [I]. From the numbers (a 35-card flight, a top at card 17, speeds near 1,430 and 590 per card) each card is about one second of flight and the numbers are in units of about 100 feet, which would make this a shell with a range of about 39,000 ft (7 miles) and a top of about 4,500 ft. That fits an artillery shell, but nothing in the file states the units. The file's own comment says "simple rectangular integration with a delta-t of 0.01s" and the header also says "Heun's method". I do not use any unit or method name on screen until Stuart or the Fact-Checker confirms it [FC]. The arc is labelled "Along" and "Up", and the plan copy says only "hop".

**Measured timings** [V, Mac, one INIT from a clean core, no other load]:

| What | Value |
|---|---|
| READ | about 0.4 s (reader sync is 375 ms) |
| INIT to first card | 0.15 s to 3.5 s (see the zero-card note) |
| One card (hop) | **2.0 to 3.4 s**: 2.0 s in the quietest run, up to 4 s with other work on the machine. It is CPU-bound (the Multiplier simulation), not paced, so the Pi 5 could be slower. [A] |
| One flight | 35 cards, about **70 to 120 s** [A] |
| Speed control | `cy.rate` cannot speed it up (Full is already unthrottled), and no useful Slow exists (not measured: at `rate 100` the sieve ran several times slower, so a hop would probably take a minute or more) |

#### 8.3.2 Every cable and switch, and who does it

There are 297 cables and 1,148 switches (443 in `trajdemo.e`, 705 in `drag.e`). The visitor does **5 steps: 4 cables and 1 switch**, plus READ and INIT as buttons. The other 293 cables and 1,147 switches are preset.

| # | Step (exact line in trajdemo.e) | Kind | Who | Why |
|---|---|---|---|---|
| 1 | `p i.Ro 1-2` | cable, program | **Visitor, step 1** | "Tell ENIAC the card was read." After READ, the card's first number lands in Acc 1 and the visitor sees lamps move. |
| 2 | `s pr.6 P` | switch, printer field (P or 0) | **Visitor, step 2** | "Punch the hop number." Field 6 is columns 26 to 30. The one switch that visibly changes the cards. |
| 3 | `p 2-5 i.Pi` | cable, program | **Visitor, step 3** | "Wire the card punch." The cable that makes cards appear. |
| 4 | `p a19.5o 1-4` | cable, program | **Visitor, step 4** | "Check: still flying?" The shell-in-the-air test as a signal. |
| 5 | `p 1-4 p.Hi` | cable, program | **Visitor, step 5** | "Start the next hop." The loop closes. |

Each line appears exactly once across `trajdemo.e` and `drag.e`, and rule 4 (per terminal, ignoring trunk ends) holds: no other line plugs `i.Ro`, `i.Pi`, `a19.5o` or `p.Hi`, or sets `pr.6`. `s pr.15-16 C` and `s pr.11-12 C` are different switches and do not clash.

**Not usable as a step: `p i.Io 1-1`.** The file also plugs `p i.Io 3-10`, the same jack (`i.Io`), so rule 4 would reject it. For the same reason INIT's wiring cannot be a Trajectory step.

**Withheld** (architecture 5.9.2): `b r` becomes the READ button, `b i` becomes the INIT button, and `b c` is bound to READ as well, sent first (v0.4, spike S2: it prevents the all-zero first card). `f r demo.card` stays preset (the card is in the hopper from the start; READ reads it). `l drag.e` is an include, with its sha256, and its 705 lines are preset.

Preset totals: **293 cables and 1,147 switches.** (297 − 4 cables = 293, and 1,148 − 1 switch = 1,147.) By group:

| Group | Cables | Switches |
|---|---|---|
| All cables except steps 1, 3, 4, 5 (the loop's data and program wiring, multiplier and adapters) | 293 | |
| Function Table 2, the drag table (`s f2...`, 705 in `drag.e` + 6 in `trajdemo.e`) | | 711 |
| Accumulators (275) | | 275 |
| Multiplier (84) | | 84 |
| Master Programmer | | 63 |
| Constant Transmitter | | 7 |
| Printer (`pr.8`, `pr.11`, `pr.12`, `pr.15`, `pr.16`, `pr.11-12`, `pr.15-16`) | | 7 |
| **Total** | **293** | **1,147** |

S5 reads "293 more cables, 1,147 more switches". The animation must be a batch (see S5 below). Of those, 711 switches are the drag table.

**Units and panels the kit must draw:**

| Unit | Why | Elements |
|---|---|---|
| Initiating Unit (`i`) | Steps 1 and 3, READ, INIT | jacks `i.Ro`, `i.Pi` in the Workbench; `i.Io`, `i.Po` (preset); `lamp:init.*` including `rdff`, `prff` |
| Card reader | READ | a hopper and a card path graphic; the card's 70 digits are read from the mission's `demo.card` (the real input file, pinned by sha256) |
| Printer and punch (`pr`) | Step 2, the card pane | switches `pr.6` in the Workbench; `pr.8`, `pr.11`, `pr.12`, `pr.15`, `pr.16`, `pr.11-12`, `pr.15-16` (preset). The punched-card pane is a UI element. |
| Accumulator 19 | Step 4 | jack `a19.5o` in the Workbench; panel with lamps; also programs 5 and 6 |
| Master Programmer (`p`) | Step 5; preset | jack `p.Hi` in the Workbench; steppers A, B, C and H (`p.Ai`, `p.Adi`, `p.A1o`, `p.A2o`, `p.Bi`, `p.B1o`..`B6o`, `p.Ci`, `p.C1o`, `p.C3o`..`C6o`, `p.Hi`, `p.H1o`..`H3o`), their decade dials and counters; `lamp:mp.s.7.K` (the H stepper) |
| Constant Transmitter (`c`) | Preset; the card's numbers | programs 1, 2, 7, 13, 14, 15, 19 (`c.s1`, `c.s2`, `c.s7`, `c.s13`, `c.s14`, `c.s15`, `c.s19`), jacks `c.o`, `c.19o`, `c.14o`; its constants come from the card, not dials. The status stream does not carry their values (only program lamps, `lamp:ct.P`), so the panel shows **no digits**; the card graphic shows the card's numbers. |
| Accumulators 1, 2, 4 to 20 | Preset; run lamps | Acc 1 (READ), 4 and 6 (speeds), 15 (hop count), 18 (along), 20 (up); the rest drawn compactly on the run view |
| Multiplier (`m`) | Preset; run lamps | the multiplier panel with `lamp:mult.stage.K` and `lamp:mult.prog.P`; its 84 switches; the partial-product jacks to Acc 11 to 14 |
| Function Table 2 (`f2`) | Preset; run lamps | the drag table: jacks A, C, arg, 1i; ring lamps `lamp:ft.2.ring.K`, `arg1`, `arg10`; its 711 switches drawn as a dense block |
| Adapters (`ad`) | S5 only | 16 adapters on trunk rails, not tappable |
| Trunks | Steps | data trunks 1, 2, 3, 6, 7, 8, 9; program trunks 1-1 to 1-11, 2-1 to 2-11, 3-1 to 3-11, 4-1 to 4-11, 5-1 to 5-11, 6-1 to 6-11, 9-1 to 9-10, 10-1 to 10-9 (only the ones in the file) |

Not needed: divider. The Workbench for the steps shows four panels: Initiating Unit (Ro, Pi), Printer (switch 6), Accumulator 19 (5o) and Master Programmer (Hi).

#### 8.3.3 The visual metaphor: connect the dots on a tile floor

The same tile floor as Squares and Primes, as **graph paper**. A cannon shell's path is an arc, but ENIAC does not know the arc. It knows only how to take **one small hop**: it looks at where the shell is and how fast it is moving, works out the next spot, and punches a card with that spot. **Each card is one dot on the floor.** Joined together, the dots are the arc. Visitors who can connect dots can follow how ENIAC finds a path.

**Briefing canvas (S3), the dots appear.** A cannon at the lower left on a tile floor (equal squares both ways). Eight dots light one at a time about 350 ms apart along a rising arc, in `--lamp-on`, each dot labelled by a small card icon. After the 8th dot, the arc is traced as a dashed line through them. The caption counts "1 dot" to "8 dots", then "Each dot is a card. Join the dots: that is the path." Loops after about 9 s. Reduced motion: the finished picture.

**Plan canvas (step 0b), one hop in four beats.** A close-up of one hop, three hops long, looping after about 12 s:

| Beat | Picture | Cue |
|---|---|---|
| 0.3 s | The shell dot at spot A, with an arrow showing its speed | `--lamp-on` dot and arrow |
| 1.8 s | A wind symbol: the arrow gets shorter. Label "air slows it" | `--cable-data` blue, wind glyph |
| 3.4 s | A pull-down symbol: the arrow bends down. Label "gravity pulls" | `--cable-prog` pink, down-arrow glyph |
| 5.0 s | The dot hops to spot B. A card is punched and slides out with "along" and "up" numbers | `--ok` check badge, card glyph |
| 6.5 s | A "still flying?" question with a check mark. The next hop starts from B | the same four beats repeat, twice quicker |

The arrows, glyphs and numbers in this canvas are explanatory art, labelled "how it works, slowed down". The real numbers come in the run view.

**Run view, the arc drawn from the real cards.** See 8.3.5. Equal-square graph paper is a problem: the real flight (35 cards, along about 390, up about 45 in the card's numbers) is about 8.7 times wider than tall, so at equal scale the arc is a flat smear. **The canvas stretches the height by a factor chosen to fit (about 2 to 3) and says so in a chip: "Height stretched so you can see it."** Honest scaling beats a fake arc.

#### 8.3.4 Time budget (normal pace)

| Part | Time |
|---|---|
| Pick mission, read briefing (with the dots animation) | 0:25 |
| Step 0 "The plan" | 0:25 |
| Steps 1 to 5 (about 12 s each) | 1:00 |
| "Rest done for you" | 0:08 |
| READ (button, card slides, lamps) | 0:20 |
| INIT and one flight, 34 hops at 1.43 s (S2, Mac) | about 0:50 (Pi: 1:00 to 1:30 until measured) |
| Result | 0:25 |
| **Total** | **about 3:50 to 4:40**; Pi 5 slower hop times push toward 5 to 6 min. |

FR-10 asks 4 to 6 min. If the Pi hop time is above about 5 s, the flight alone is 3 min: trim by presetting step 2 (`s pr.6 P`), not by cutting the flight.

#### 8.3.5 Step-by-step script and copy

**0a. Briefing (S3)**

- Stage: L0 room plan with markers: Initiating Unit, Card Reader and Punch, Constant Transmitter, Master Programmer, Multiplier, Function Table 2, Accumulators. The canvas is the dots animation in 8.3.3.
- Headline: **The path of a shell**
- Body: "A shell flies in an arc. ENIAC finds the arc one small hop at a time, and punches a card after each hop. Each card is one dot. You will connect the dots." (33 words)
- Button: **Let's go**. Tell me more: "ENIAC was built to work out firing tables for Army guns. It was shown to the public on February 15, 1946. Brian Stuart's program tries to recreate the demo from that day. Six women programmers set up ENIAC for it." (40 words) [FC: all four sentences; Doug to approve any names]
- Lamps: dark lamp grids on the L0 plan.

**0b. The plan (Step 0)**

- Stage: the hop animation in 8.3.3.
- Headline: **Hop by hop**
- Body: "ENIAC finds a shell's path one hop at a time. Each hop: the air slows the shell, the shell moves, ENIAC punches a card, and checks the shell is still flying. Then it hops again." (35 words)
- Math line under the animation: `card 1, card 2, card 3 ... one dot each`
- Buttons: **Next step**, **Skip setup**.
- Tell me more: "The air slows a fast shell a lot. ENIAC looks up how much in a table of numbers. Brian Stuart's note in the program says he tried to work that table out himself, so the table is his best attempt." (40 words) [FC]

---

**Step 1 of 5 (cable): Tell ENIAC the card was read**

- Window 1 (left): Initiating Unit jacks. Ring on **Ro** (card reader, OUT). Window 2 (right): program trunk sockets. Ring on **1-2**.
- Headline: **Tell ENIAC the card was read**
- Body: "ENIAC takes in numbers from punched cards. When the reader finishes, it sends a signal. Tap the reader OUT jack on the Initiating Unit. Then tap program trunk 1-2." (29 words)
- On correct: "Now the reader can tell the machine it is done."
- Hints: other IU jack: "That jack belongs to another job. We want the reader, OUT." Wrong trunk: "Try program trunk 1-2."
- Lamps: Acc 1 lamp band visible, all 0.
- Tell me more: "Cards were how numbers got into ENIAC. A card had 80 columns. The card in this mission holds seven numbers of up to 10 digits." (25 words) [FC] [I: 7 numbers, to be confirmed against `proccard`]
- Sim item: `p i.Ro 1-2`.

**Step 2 of 5 (switch): Punch the hop number**

- Window: the Printer and Punch's field switches; the glowing switch is labelled "Field 6". Picker with two choices: **P** "Punch" and **0** "Leave blank".
- Headline: **Punch the hop number**
- Body: "Each card will say which hop it is: 1, 2, 3 and so on. The printer has a switch for each part of the card. Tap the glowing switch 6 and choose P, for punch." (35 words)
- On correct: "Now each card will carry its hop number."
- Hints: wrong value: "Blank leaves the number off. Choose P." Wrong switch: "That switch is for another part of the card. Try the glowing one."
- Lamps: nothing changes yet.
- Tell me more: "The punch worked in 16 groups of 5 columns. A switch for each group chose what got punched. On our card, you will see the hop number, how far along the shell is, and how high." (36 words) [FC]
- Sim item: `s pr.6 P`. (The picker catalog for `pr.N` is `P` and `0`; `0` stands for anything that is not P, see `prctl`. To be added to the switch catalog.)

**Step 3 of 5 (cable): Wire up the card punch**

- Window 1: program trunk sockets, ring on **2-5**. Window 2: Initiating Unit jacks, ring on **Pi** (punch, IN).
- Headline: **Wire up the card punch**
- Body: "On each hop, ENIAC punches a card. The signal to punch rides on program trunk 2-5. Tap trunk 2-5. Then tap the Pi jack on the Initiating Unit, the punch input." (31 words)
- On correct: "Now each hop will punch a card."
- Hints: other IU jack: "That jack starts something else. We want the punch, IN: Pi." Wrong trunk: "Try program trunk 2-5."
- Lamps: still 0.
- Tell me more: "When a card is punched, the Initiating Unit sends a done signal, and ENIAC carries on. The punch took a little over half a second per card." (27 words) [FC]
- Sim item: `p 2-5 i.Pi`.

**Step 4 of 5 (cable): Still flying?**

- Window 1: Accumulator 19 program jacks, ring on **5 OUT**. Window 2: program trunk sockets, ring on **1-4**.
- Headline: **Is the shell still flying?**
- Body: "After each hop, ENIAC checks the shell's height. If the shell is still in the air, Accumulator 19 sends a signal. Tap its 5-out jack. Then tap program trunk 1-4." (30 words)
- On correct: "Accumulator 19 will say: keep going."
- Hints: 6-out: "That jack is for the other answer, landing. We want 5, out." Wrong trunk: "Try program trunk 1-4."
- Lamps: Acc 19 band at 0.
- Tell me more: "Accumulator 20 holds the shell's height. The program checks its sign. While the height is above zero, the signal says keep going. When it drops below zero, the shell has landed." (31 words) [I: the file's own comment says 'continue if non-negative']
- Sim item: `p a19.5o 1-4`.

**Step 5 of 5 (cable): Start the next hop**

- Window 1: program trunk sockets, ring on **1-4**. Window 2: Master Programmer jacks, ring on **H** (the H input, `Hi`).
- Headline: **Start the next hop**
- Body: "The 'keep going' signal must start another hop. The Master Programmer, ENIAC's conductor, runs the hops. Tap program trunk 1-4. Then tap the H jack on the Master Programmer." (29 words)
- On correct: "Hop after hop, ENIAC will fly the shell. Your cables made the loop!"
- Hints: other MP jack: "That jack is for a different stepper. Look for H." Wrong trunk: "Try program trunk 1-4."
- Lamps: still 0. The Master Programmer's H stepper lamps are visible in the window, at stage 0.
- Tell me more: "The Master Programmer had ten steppers, each counting stages and handing off to the next, a bit like a music box with pins. This one is the stepper for the hop loop." (32 words) [FC]
- Sim item: `p 1-4 p.Hi`.
- Button at the bottom: **Finish wiring**.

**S5. The rest is done for you**

- Headline: **The rest is done for you**
- Body: "Real ENIAC programmers placed hundreds of cables by hand, and setting up took days. We will place the last ones now: 293 cables and 1,147 switches. Most of the switches make up the drag table." (35 words) [FC]
- Animation: 293 cables draw in 8 waves (600 ms each), and the switch dials click in blocks of about 140, with the 711 drag-table dials as one large block that "clicks" all at once. Counters ease up to "293 cables, 1,147 switches". At most 8 s. A longer wait is not needed: visitors cannot take in more.
- Button: **Continue** (96 h). Lamps: still 0.

---

**S6 Run: what the visitor does and sees**

The run view layout (stage 1360 x 904; the rail at the right is as in 7.5):

```
+----------------------------------------------------------------------------------+
| THE ARC  (graph paper, y124-520, 1360 x 396)                          [stretched]|
|  cannon                                               . .                         |
|   [/]  .  .  .                                 .   .          .  .               |
|  ---.-----------------------------------------------------------.-----------     |
|       Along ->                      dot = one card         tag: "Highest point"   |
+----------------------------------------------------------------------------------+
| HELPER READOUTS (y536-700, five, 260 wide)       | BIG CARD (y536-700, 584 wide)  |
|  Hop 12   Along 143250717  Up 40896638           |  newest card with holes        |
|  Along speed (Acc 6)  Up speed (Acc 4)           |  "Hop 12"                      |
+--------------------------------------------------+--------------------------------+
| UNITS AT WORK (y716-916): Multiplier stages, Function Table 2 ring, H stepper      |
|  (real lamps, compact: 14 px)                                                       |
+----------------------------------------------------------------------------------+
| FILM STRIP  y928-1010: the last 20 cards, 64 x 70 each, hop number + holes         |
+----------------------------------------------------------------------------------+
```

- **Arc.** Each real `punch` line adds one dot (hop number, "along" from fields 10 and 11, "up" from fields 14 and 15), joined to the last. Axes labelled "Along" and "Up", no units. A cannon icon at 0. A dashed "ground" line at 0. The dot of the newest card is bigger and ringed. A stretch chip reads "Height stretched so you can see it."
- **Highest point.** When a new "up" is lower than the last, a tag "Highest point" appears on the previous dot (derived from real cards).
- **Landing.** The first card with a negative "up" gets a "Landed" tag, drawn at the line where the path would cross zero (a straight line between the last two dots, labelled as such).
- **Cards (FR-21).** The big card shows the newest card: cream with a cut corner, columns 21 to 80 on a torn left edge (the program punches the hop number at columns 26 to 30, "along" at 51 to 60 and "up" at 71 to 80), digits printed over their holes. The film strip holds the last 20 cards as small cards with the hop number and a hole pattern; **tap a small card to show it large**; the newest returns after 10 s. Dots on the arc can be tapped too (same effect). *(v0.4 build: the film strip shows the last **16** cards, because 20 cards 64 px wide with the 16 px gap between touch targets do not fit the stage; the dots on the arc are not tappable, because they sit closer together than the touch rules allow. The result screen shows the arc and the count, without the strip.)*
- **Units at work.** Real lamps: `lamp:mult.stage.*`, `lamp:ft.2.ring.*`, `lamp:mp.s.7.*`. These change in bursts between cards. They are the "ENIAC is thinking" part.
- **Helper readouts.** Acc 15 (hop), Acc 18 (along), Acc 20 (up), Acc 6 (along speed), Acc 4 (up speed). Labelled with the accumulator number so Walt can find them. Computed from the lamps, never separate data. *(v0.5: once the landing card is punched, the program has already begun setting up its next flight when the clock stops, so the readouts freeze on the landing card's own numbers (hop 34, along, up) with "Stopped on the landing card. These are its numbers."; the speeds, which are not on the card, go blank. The lamps keep showing the real frozen state; the arc, the cards and "34 hops" are unchanged.)*

| Moment | Rail prompt (40 px) | Caption sequence (28 px, one at a time, each fires once) | What the lamps and cards show |
|---|---|---|---|
| Before | **Press READ** ("READ pulls the card of numbers into ENIAC.") | none | A card (the real `demo.card` text, 7 numbers, shown in the hopper) waits. READ is a 96 px button, pulsing. INIT is greyed with the label "Read the card first". |
| READ pressed | **Reading the card** | 1. "The card goes through the reader." (on `lamp:init.rdff`) 2. "The first number, 97,367, lands in Accumulator 1." (on `{acc: "1", eq: 97367}`) 3. "The other numbers wait inside ENIAC. Now press INIT." (on run idle) | The card slides into the reader and out. Real lamps: the reader FF and Acc 1's lamps reading 97,367. The card graphic highlights the first number. INIT arms and pulses. |
| INIT pressed | **Watch the dots** | 1. "ENIAC starts the first hop." (on run busy) 2. "Card 1 is out. Its big numbers say how far along and how high up the shell is." (on the first card) 3. "Each hop, the air slows the shell, and gravity pulls it down." (on the third card) 4. "Highest point! From here the shell comes down." (on the first fall) 5. "Landed! The height dropped below zero." (on the first negative "up") | Dots build the arc. The Multiplier and the drag table flicker between cards. Hop counter goes 1, 2, 3... |
| After landing | **You did it!** and a **Show me what happened** button | none | The result screen follows after 3 s, or on tap. |

The big wait is the hop time, 2.0 to 3.4 s [A]. The captions are timed to the events, not to the clock, so a slow Pi only stretches them. After hop 5 the rail adds:

- **Show me what happened** (primary): goes to S7 now.
- **Skip to the answer**: goes to S7 at once. **There is no way to make the machine faster than Full**, so S7 starts with the live arc and a chip "The shell is still flying: hop 14". The headline appears at landing. Nothing is made up: if the visitor skips at hop 14, the arc is cut there, and keeps growing as hops arrive.
- No speed control is shown. A one-line explanation lives under the hop counter: "ENIAC does a lot of arithmetic for every hop."

**Fast-forward and skip, for this mission.** The PRD's idea (FR-19) of fast-forwarding inside a part and skipping to the trajectory does not apply: Full is already unthrottled and the trajectory is the only part that runs. The honest equivalents are "Skip to the answer" (above) and the live arc on the result screen. After landing the core keeps going and starts another flight. The bridge stops the machine at the `landed` checkpoint by switching the cycling unit to one addition (`s cy.op 1a`, already whitelisted), which freezes the machine without clearing it (v0.4: verified in spike S2, and the run view also ignores any card after the landing).

**Result (S7) copy**

- Headline: **ENIAC flew the shell!**
- Body: "Each card was one hop. Joined up, the dots show the whole flight: up, over the top, and down. ENIAC worked it out from a card of numbers and the cables you placed." (33 words)
- Takeaway strip: **Numbers and cables made a flight path.** Sub-line: "That is what programming ENIAC meant."
- Left: the full arc from the real cards (landing tagged), the film strip of the last 20 cards, and a line "34 hops, 34 cards" (the real count, read live). The chart is labelled "Height stretched so you can see it."
- Tell me more: "The real ENIAC could work out a trajectory like this much faster than a shell takes to fly. By hand, the same work took days. Our simulator is slower, so you can watch every hop." (35 words) [FC: both comparisons; the old outline said 30 seconds and days: to be checked with Doug]
- Buttons: **Finish**, Try again, Menu. **Finish** goes to S8.

#### 8.3.6 Mission file mapping (`missions/trajectory.yaml`)

Shas at c4b94f2 (computed by the UX agent): `trajdemo.e` `b21c3635b1febd4b35169d1f5647b89e94d9b7b2dee2ffcbf9b5e2b3f17c6857`, `drag.e` `66d42fed31297875080da7cf30780fff03d70d43c09aaa4e957adaa02abf194e`, `demo.card` `86ae09c103ba0af54b982cb5be78fb7707014397067801da3c9c68036bc1b4d8` (the file holds the same card twice; the first line is read).

```yaml
schema: 1
id: trajectory
title: "Trajectory"
order: 3
summary: "Fire a cannon shell, one dot at a time."
program: trajdemo.e
programSha256: "b21c3635b1febd4b35169d1f5647b89e94d9b7b2dee2ffcbf9b5e2b3f17c6857"
includes: { drag.e: "66d42fed31297875080da7cf30780fff03d70d43c09aaa4e957adaa02abf194e" }
assets: { demo.card: "86ae09c103ba0af54b982cb5be78fb7707014397067801da3c9c68036bc1b4d8" }   # new, see 8.5
ordered: true

steps:
  - id: reader-done-to-1-2
    line: "p i.Ro 1-2"
    expect: { from: i.Ro, to: 1-2 }
  - id: punch-hop-number
    line: "s pr.6 P"
    expect: { switch: pr.6, value: "P" }
    choices: ["P", "0"]
  - id: trunk25-to-punch
    line: "p 2-5 i.Pi"
    expect: { from: 2-5, to: i.Pi }
  - id: a19-keep-going
    line: "p a19.5o 1-4"
    expect: { from: a19.5o, to: 1-4 }
  - id: trunk14-to-h
    line: "p 1-4 p.Hi"
    expect: { from: 1-4, to: p.Hi }
    button: "Finish wiring"

withheld:
  - { line: "b r", button: read }
  - { line: "b i", button: init }
  - { line: "b c", button: read }   # v0.4: sent before b r (spike S2); the file's last three lines are b c, b r, b i

run:
  buttons: [read, init]
  watch: ["1", "4", "6", "15", "18", "20"]
  idle: { quietMs: auto }
  speeds:
    full: { rate: 0 }                # no slow speed; see 8.3.5
  defaultSpeed: full

checkpoints:
  - { id: card-read, when: { acc: "1", eq: 97367 } }
  - { id: first-hop, when: { punchCount: { gte: 1 } } }
  - { id: landed,    when: { punchField: { index: 14, startsWith: "-" } } }   # "up" field turns negative
result: landed

selftest:                            # rule 8
  read: true
  inits: 1
  until: { punchCount: { gte: 3 } }
  expect: { anyCard: { fields: { 10: "00141", 11: "28681", 14: "00056", 15: "93229" } } }   # first hop on a clean core [V x3]
```

The first hop's numbers `0014128681` (along) and `0005693229` (up) were identical on every clean first flight I ran, so the selftest matches any of the first three cards (the zero-card quirk). Compare a second flight only with its own file. S3 saw low-digit differences from card 8 in some runs. A parallel patch, `patches/0003-acc-1pp-race.patch` (spike #31, in `patches/series` but not in my test build), says it fixes a lost-increment race that makes trajdemo cards differ by a few units from card 2 to 18 in about 1 run in 3. My three clean first flights happened to match, so the numbers above may be luck without 0003. **Re-run the selftest values on a build with 0003 before pinning them.**

`content:` keys: `briefing`, `plan` (with `math`), `rest`, `read` (new: `before`, `captions` for the READ beat), `run` (`before`, `presses` with one entry and five captions with triggers `{run: busy}`, `{punchCount: {gte: 1}}`, `{punchCount: {gte: 3}}`, `{derived: apex}`, `{derived: landed}`; `extras` with `afterPress` (hop 5), `showResult`, `skipToAnswer`, no speed control, `stopAt: landed`), `result`. `credits`: "Brian L. Stuart, programs/trajdemo.e and programs/drag.e".

#### 8.3.7 Timings the S2 spike should replace (v0.4: replaced, see the box at the top of 8.3)

| Assumption in this section | Where |
|---|---|
| READ takes 0.4 s | 8.3.1, run beats |
| One hop takes 2.0 to 3.4 s on the Mac; the Pi 5 value is unknown | 8.3.1, time budget, "after hop 5" |
| One flight is 35 cards | 8.3.1, the S7 line "35 hops" is read live, not assumed |
| The first card may be all zeros | 8.3.1, selftest |
| INIT after landing cannot be used to fire again from the same core | 8.3.5 (Try again = new core) |
| The bridge can freeze the machine at landing (`s cy.op 1a`, v0.4: verified in S2) | 8.3.5 |

If `docs/spikes/S2-trajdemo.md` shows a way to run the six parts (for example, a different INIT order, or a gap of a given length between presses), change the run section to 8.3.8.

#### 8.3.8 Plan B: the six-part run (not reachable at the pin; kept for S2)

This is the earlier outline, expanded to the same level, for the case that S2 finds a route to the other parts or that Stuart updates `trajdemo.e` so that each INIT starts the next part (as its header says). Each part is its own INIT with a one-line live caption from the file's comments. **UNVERIFIED: none of this ran in my tests.**

| INIT | Rail prompt | Caption (28 px) | What the lamps show |
|---|---|---|---|
| 1 | **Press INIT** | "Adding 97,367 to itself 5,000 times." | Acc 2 climbs to 486,835,000 (97,367 x 5,000) [FC] |
| 2 | **Again, with a clock** | "The same again, with a 100 Hz clock." | Same result, slower (a clock of 100 pulses a second) |
| 3 | **Multiplier** | "Multiplying 13,975 by itself, 500 times." | Multiplier stage lamps; Acc 9 and 10 |
| 4 | **Tables** | "A table of squares and cubes, printed on cards." | Cards: the squares and cubes |
| 5 | **Sine and cosine** | "Sine and cosine of 100 angles." | Cards or lamps from Acc 16 to 20 |
| 6 | **The shell** | "The artillery trajectory." | The same run as 8.3.5 |

A **Skip to the trajectory** button would press INIT 1 to 5 automatically and wait for idle after each (R4 fallback: unthrottled plus one condensed caption: "ENIAC is doing the earlier parts of the 1946 demo."). The picker step count would go up by one (a dial for the 5,000-count, `s p.d17s1 1`, and `s a1.rp5 5`, which in this plan are on the live path). **Do not build this unless S2 confirms it works on the unmodified file.**

### 8.4 The mission picker (S2) with three missions

Final copy and counts for the three cards (the wireframe in 7.2 is superseded by this one). All three cards are unlocked (FR-23). The suggested order is carried by numerals, a "START HERE" chip and arrows, never by locking or colour alone.

```
+------------------------------------------------------------------------------------+
| [wordmark]   Pick a mission                                                 (64 px) |
+------------------------------------------------------------------------------------+
|   x80-624              x688-1232             x1296-1840       cards y184-824 (640 h) |
|  +--------------+     +--------------+      +--------------+                         |
|  | (1)          |     | (2)          |      | (3)          |   numeral badge 96 px   |
|  | >START HERE< |     |              |      |              |   chip: 40 h, yellow    |
|  |  [3x3 tiles] | --> | [12 tiles as | -->  | [cannon and  |   art 544 x 220         |
|  |              |     |  a 3x4 block |      |  8 dots in   |                         |
|  |              |     |  and 7 in a  |      |  an arc]     |                         |
|  |              |     |  row, star]  |      |              |                         |
|  |  Squares     |     |  Primes      |      |  Trajectory  |   title 48 px           |
|  |  About 3 min |     |  About 4 min |      |  About 5 min |   24 px                 |
|  |  You wire 7  |     |  You wire 5  |      |  You wire 5  |   24 px                 |
|  |  steps       |     |  steps       |      |  steps and   |                         |
|  |              |     |              |      |  read a card |                         |
|  | "Make ENIAC  |     | "Set ENIAC   |      | "Fire a      |   28 px, from the       |
|  |  count in    |     |  hunting for |      |  cannon shell|   mission `summary`     |
|  |  squares."   |     |  prime       |      |  one dot at  |                         |
|  |              |     |  numbers."   |      |  a time."    |                         |
|  | [   Start   ]|     | [   Start   ]|      | [   Start   ]|   96 h x 480 w          |
|  +--------------+     +--------------+      +--------------+                         |
|                                                                                     |
|  [ About ENIAC and this exhibit ]  (64 h, x80-560, y856-920)      Suggested order  |
|                                                                   1, then 2, then 3 |
+------------------------------------------------------------------------------------+
```

| Element | Rule |
|---|---|
| Numeral badge | A white numeral in a black circle, top-left of each card, 96 px (shape and numeral, not colour). |
| Card art | The tile floor from the missions: Squares is a 3 x 3 block of 9 amber tiles. Primes is a 3 x 4 block of 12 tiles beside a row of 7 tiles with a small star badge (prime) . Trajectory is a cannon and 8 dots on an arc. Art is drawn with `--lamp-on` on `--panel`, 2 px outline in `--card`, and is not animated (the picker is quiet). |
| Title and meta | Title from `title`. Duration from a new `minutes` field in the mission file (3, 4, 5; FR-10, all three together are 12 min of mission time). "You wire N steps" from `counts` (visitor cables plus switches). "and read a card" is added when `run.buttons` contains `read`. |
| Teaser | The mission `summary` string, up to 2 lines at 28 px. |
| **START HERE** | A yellow `--guide` chip with dark text and a pointing-finger glyph, 40 px high, on card 1 when no mission has been finished in this visit. Yellow is the "touch here" colour everywhere in the kiosk, so it fits. |
| Arrows | Chevrons between cards labelled "then" (24 px). They show the order, and do not lock anything. |
| **Done and UP NEXT** | State is in memory only and is cleared by the idle reset (no PII, no storage). When a visitor returns to the picker after reaching the result screen (S7) of a mission, that card gets a check badge and the word "Done". The "START HERE" chip moves, with the words "UP NEXT", to the lowest-numbered card that is not done. If all three are done there is no chip. |
| Whole card tappable | The card and its Start button both start the mission. Hit area at least 96 px. Focus order 1, 2, 3. |
| S7 primary button | Names the next mission in the suggested order: "Next: Primes" after Squares, "Next: Trajectory" after Primes, **Finish** after Trajectory. (If a visitor skipped around, the order stays 1, 2, 3.) **v0.6 (14.5.1):** the button names the next mission **not yet done**, in the order 1, 2, 3, and reads **Finish** only when all three are done. |
| Metrics | `mission_picked{m, order_position}` and `picker_next_used` (to see if visitors follow the order). |

### 8.5 What these scripts need from the mission loader and the bridge

The M1 schema and `squares.yaml` cover steps, withheld, run, checkpoints and the `content:` block. These M2 items are **not yet in the schema** and are proposed by this spec. Each is small.

| # | Needs | For |
|---|---|---|
| 1 | `includes: {drag.e: sha}` with `l drag.e` expanded for rules 3 and 4 (already in the 5.9.2 schema) | Trajectory |
| 2 | `assets: {demo.card: sha}`; the bridge serves the card text to the UI for the READ graphic (it is the real input file, not demo data) | Trajectory |
| 3 | Predicates: `punchField` gains `startsWith` (for the "up" field turning negative: first character `-`) and `values` (selftest). `punchCount` is already planned. | Both |
| 4 | Caption triggers `{derived: apex}` and `{derived: landed}`, computed by the UI from successive cards (highest point and landing). The bridge only validates their shape. | Trajectory |
| 5 | `selftest` shapes `{read, inits, until, expect}` where `until` is a predicate and `expect` is a card-field match | Both |
| 6 | Switch catalog: printer field switches `pr.N` take `P` or `0`; (`prctl` treats anything but P as off). `c.k1` 0 to 9 is already planned. | Trajectory, Primes |
| 7 | `run.buttons: [read, init]`, with INIT gated on READ having completed (the reader FF finished and `acc 1 = 97367`) | Trajectory |
| 8 | `run.speeds` with one speed (Full only): the UI hides the speed control. | Trajectory |
| 9 | `run.cardPane: {fields: [...], window: "cols 51-80"}` and `run.plot: {x: [10,11], y: [14,15], count: [5], stretch: auto}` so the UI draws cards and the arc from fields, not from code | Both |
| 10 | `content.read`, `content.result.liveLine`, and a `minutes` field for the picker | Both |
| 11 | Freeze the machine at the landing checkpoint. v0.4: `s cy.op 1a` (already on the whitelist, 5.2; verified in S2) via `run.freezeAt`; no whitelist change | Trajectory |
| 12 | Mission `requires: [0002-ft-repeat-default]`. A missing patch makes Primes unavailable (sieve canary, test plan 3.2). | Primes |
| 13 | S5 batch animation for large preset sets (hundreds of cables, over a thousand switches) | Both |

**v0.4: how the M2 build implements this table** (names as in `missions/*.yaml`; architecture 5.9.6 has the details):

| # | Implemented as |
|---|---|
| 1 | `includes:` pinned by sha256; the included lines are preset for rules 3 and 4 and counted in S5 |
| 2 | `assets: {demo.card: sha}`; the first card is served as `readCard` in the compiled mission |
| 3 | Predicates `punchCount: {gte\|eq}` and `punchField: {index, eq\|startsWith}` (true once any card of the session matches) |
| 4 | Caption triggers `{derived: apex\|landed}`, plus `{punchCount: {gte}}`, `{acc: {acc, eq}}` and `{init: rdff}` |
| 5 | `selftest: {read, inits, until, cards: [{index, values}]}` |
| 6 | Switch catalog `pr.N` = `P`/`0`, `pr.N-M` = `C`/`0`; the other M2 switches are shape-checked |
| 7 | `run.buttons: [read, init]` with `run.initAfter: card-read`; READ sends the withheld lines bound to it, in file order |
| 8 | One speed means no speed control in the UI |
| 9 | `run.cards: {window, value, hop, style: stack\|film, keep, bars: {per, upTo}}` and `run.plot: {x, y}` |
| 10 | `content.read`, `content.result.live: {waiting, pending, done, doneAt}`, `content.run.cards`, `content.run.plot`, `content.run.done`, `minutes` |
| 11 | `run.freezeAt: landed` sends `s cy.op 1a` (no new whitelist entry) |
| 12 | `requires: [0002-ft-repeat-default]`, checked against the core's `.provenance.json` |
| 13 | S5 draws cables in waves and clicks dials in blocks for large presets (at most about 8 s) |

#### History claims for the Fact-Checker and Doug Crawford (every [FC] in 8.2 and 8.3)

| Where | Claim | Evidence I have |
|---|---|---|
| Primes 0a body and more | In 1946 ENIAC hunted for primes. D. H. Lehmer ran prime searches on ENIAC in July 1946. ENIAC was shown to the public on February 15, 1946. | The header of `sieve.e` ("Lehmer's July 1946 runs") and the header of `trajdemo.e` ("Feb 15, 1946"). Not checked against a source. |
| Primes 0a more | The program follows a reconstruction by Liesbeth De Mol and Maarten Bullynck. | `sieve.e` header only. |
| Primes 0b more | The search stops at 2,801 because 14 group sizes only cover numbers below 2,809. | The mathematical statement is exact. "That is why" is my reading of the design [I]. |
| Primes step 3 more | The real Master Programmer had ten steppers. | The simulator has ten (A to K, no I), `mp.go`. |
| Primes step 4 more | The card punch made about 100 cards a minute. | The simulator waits 600 ms per card (`initiate.go`), which is 100 a minute. Whether that is the real machine's rate needs a source. |
| Primes S5 and Trajectory S5 | Real programmers placed hundreds of cables by hand, and setting up took days. | Already in the Squares copy. |
| Primes result more | The sieve of Eratosthenes is named after a Greek scholar, and crosses out multiples. | General knowledge. |
| Trajectory 0a more | ENIAC was built to work out firing tables for Army guns. Shown to the public February 15, 1946. Stuart's program tries to recreate the demo. **Six women programmers set up ENIAC for the demo.** | Header of `trajdemo.e`; the rest is common knowledge. **Names are not used in the copy; if Doug approves names, add them to this line.** (UX Q10) |
| Trajectory step 1 more | Cards were how numbers got into ENIAC; a card has 80 columns; this card holds seven numbers. | `proccard` in `constant.go`; the seven-number split is mine [I]. |
| Trajectory step 2 more | The punch worked in 16 groups of 5 columns. | `doprint()` in `printer.go`. |
| Trajectory step 3 more | About half a second per card. | The simulator's timers. |
| Trajectory 0b more | Stuart's drag table is his own best attempt. | The file's comment: "a drag table I tried to figure out". |
| Trajectory result more | **Faster than a shell takes to fly; by hand it took days.** | The old outline's claim, "commonly stated for the trajectory demo". **Not verified. If it cannot be confirmed, delete the sentence; the mission works without it.** |
| Trajectory (not on screen) | The file header says "Heun's method"; the code comment says "simple rectangular integration". | I do not use either name. |

#### 8.5.1 Open questions raised by the M2 scripts

1. **Does `trajdemo.e` ever reach its other parts?** This is spike S2. At the pin, I found that INIT starts the trajectory, and every INIT restarts it (8.3.1). If Stuart's repository has a newer `trajdemo.e` that fixes the routing, the pin bump could restore the six-part mission (Plan B, 8.3.8).
2. **Units of the trajectory.** My reading is one card per second, units of about 100 feet, flight about 35 s and 39,000 ft [I]. Needs Stuart or the Fact-Checker before any unit appears on screen.
3. **Primes: answer at 100 cards or all 407?** *Decided (Nick, v0.4):* the answer checkpoint is card 100 (547); the result screen stays live and keeps counting to 407.
4. **Stopping at landing.** *Resolved (v0.4):* `s cy.op 1a` freezes it (S2); the UI also ignores any card after the landing.
5. **Pi 5 timings** for both missions (hop time, punch pace, load). Mine are from a Mac.
6. **The attract mode (7.1)** assumed "trajdemo parts" with a live caption. *Fixed in v0.4:* attract is READ, INIT and the trajectory flying again and again; the caption is "Live: ENIAC is working out a shell's path. Hop {n}" from the latest real card (7.1). The caption copy still goes through the Fact-Checker with the rest.
7. **Printer switch catalog** for `pr.N` (P or 0) is from `prctl`; confirm there is no "C" meaning for plain `pr.N`.
8. **Zero first card.** *Resolved (v0.4, spike S2):* it comes from load-time stepper state, not the gap; `b c` before `b r` prevents it (10 of 10 runs), so READ sends both.
9. **Who approves the "six women programmers" sentence and any names** (UX Q10).

---

## 9. Interaction design and responsive behaviour

### 9.1 Micro-interactions

| Interaction | Behaviour |
|---|---|
| Button press | Immediate pressed state (scale 0.97, darker fill) at finger down; action on release; 150 ms ease-out (UX-08) |
| Jack tap (correct) | Ring turns bluish green and a check appears, 200 ms |
| Jack tap (wrong) | X badge plus 2 x 6 px shake, 300 ms |
| Cable draw | 600 ms along a gentle curve; ends flash once |
| Dial turn | Dial rotates to the chosen position, 250 ms, with a tick mark animation |
| Zoom/pan | 400 ms ease-in-out; content never moves while a finger is down |
| Lamp change | 80 ms decay |
| Screen change | 250 ms cross-fade; no sliding that looks like a swipe gesture |

### 9.2 Gestures and exits

No gesture is **required** anywhere. The only gesture the app **recognises** is the optional one-finger horizontal swipe on the Explore ENIAC panorama (14.3.5): it is never taught or labelled, it has a tap equivalent for everything it does, and a drag under 24 px is still a tap. Swipe-back, pull-to-refresh, pinch-zoom, context menu, text selection and link navigation are disabled. There is no on-screen keyboard; the only numeric entry is the PIN pad (UX-05, UX-06).

### 9.3 Debounce

INIT, READ and step buttons ignore a second tap within 400 ms and while their action is running (UX-07). INIT is re-armed only when the machine reports it is idle.

### 9.4 Responsive behaviour (UX-11)

The design is authored for **1920 x 1080 landscape** and scaled as one unit (letterboxed) for other 16:9 panels. Minimum sizes are preserved by scaling up only: on a smaller panel the target minimums hold in physical size, so the guide rail narrows first and the stage is reduced to three panels. A portrait orientation is **out of scope** (Q2).

**The 24-inch production panel (v0.6, F11).** At 1920 x 1080 the 24-inch panel is about 531 x 299 mm, so one CSS px is about 0.277 mm (the 15.6-inch dev panel is about 0.18 mm). Sizes become physically larger than the PRD's dev figures: 64 px is about 17.7 mm, 96 px about 26.6 mm, the 28 px body text has an em of about 7.8 mm, and a 14 px lamp is about 3.9 mm. If the production panel is 16:10 (1920 x 1200) the stage is letterboxed top and bottom; a 2560 x 1440 or 4K panel scales the vector art as one unit (all art is SVG). Resolution, aspect, touch technology (projected-capacitive or infrared frames behave differently with gloves and leaning palms; only the first touch counts either way, UX-06) and mounting height are Q16; the first install day includes a touch-calibration and "one-finger, palm, glove" check on the actual panel.

### 9.5 Photosensitivity and motion

Lamp states are smoothed (80 ms decay) so no element flashes more than 3 times per second in a region larger than about 10% of the screen (WCAG 2.3.1). Full speed cannot strobe the screen. A "Reduce motion" setting is set on the box by staff, and the browser's `prefers-reduced-motion` is honoured too; either one replaces zooms, pans and drifts with cross-fades. What each v0.6 screen does under it is in 14.7.

---

## 10. Accessibility

| Area | Specification |
|---|---|
| WCAG target | 2.1 AA for text contrast and non-text contrast (3:1 for ring, cable and lamp edges) |
| Color | Never the only cue (section 6.4). Okabe-Ito palette. Tested with deuteranopia, protanopia and tritanopia simulations in the design review. |
| Targets | 64 px minimum, 96 px for primary actions, 88 px for jacks, 120 px for dials; 16 px gaps; tolerance of 16 px |
| Reach and height | All primary actions are in the lower two thirds of the screen and in the right rail, where a short visitor and a wheelchair user can reach them. Header controls are secondary. The mounting height is open (Q2). |
| Reading | Grade 4 to 5 body copy, at most 40 words, 28 px. Headlines in sentence case. No idioms. |
| Timing | No step has a time limit. The idle warning gives 15 s and any touch dismisses it. "Tell me more" pauses idle. |
| Screen readers | Out of scope for v1 (Q9); the DOM is still ordered logically with proper roles so it can be added later. |
| Sound | None in v1 (Q8). Feedback is visual only. |

---

## 11. Content guidelines

- **Voice:** friendly, plain, and curious. Talk to "you". Use the machine's real names (accumulator, initiating unit, program trunk) and explain each in a few words the first time.
- **Step card pattern:** what to do (one sentence), why (one sentence), the exact taps (one sentence).
- **Button labels** are verbs: Let's go, Next step, Do it for me, Skip setup, Show me where, Try again. Never "OK" or "Submit".
- **Errors** say what happened and what to try: "Not quite. Try the other glowing jack."
- **History:** only claims tagged [FC] once cleared. Numbers come with "about". People are credited only as approved (Q10).
- **Empty and waiting states** always say why: "Waiting for the machine..." with a spinner icon, never a blank.

---

## 12. Design tokens (first cut)

| Token | Value |
|---|---|
| `--bg-stage` | #101215 |
| `--panel` | #1B1D21 |
| `--jack-block` | #D8CFAE |
| `--card` | #F4EFE3 |
| `--ink` | #1B1D21 |
| `--guide` | #F0E442 |
| `--ok` | #009E73 |
| `--wrong` | #D55E00 (banner fill #A33F00) |
| `--lamp-on` | #FFB000 |
| `--lamp-off` | #3A2E1E |
| `--cable-data` | #56B4E9 |
| `--cable-prog` | #CC79A7 |
| `--font-ui` | Atkinson Hyperlegible |
| `--font-mono` | IBM Plex Mono |
| `--space-1..6` | 8, 16, 24, 32, 48, 64 px |
| `--target-min` | 64 px; `--target-primary` 96 px; `--jack-hit` 88 px; `--dial-hit` 120 px |
| `--radius` | 16 px cards, 12 px buttons |
| `--select` (v0.6) | #F4EFE3, the ring on a selected unit (Explore); `--guide` yellow stays "look here" |
| `--plate` (v0.6) | #0E0F11 fill with #D9D0B0 ink, the engraved name plate (honor roll, Stuart plate); from the panel art |

---

## 13. Open questions

- [ ] **F1:** does `sq.e` really stop after one square per INIT? (M1 spike.)
- [ ] Does the architecture let the front end tell "INIT finished" and read Acc 1 and Acc 2 live (F2)?
- [x] Which `sieve.e` and `trajdemo.e` items are the hands-on steps (F8)? Answered in 8.2.2 and 8.3.2. `pr.13` and `pr.14` punch the two halves of Acc 19 into card columns 61 to 70; `pr.6` punches the hop count in columns 26 to 30.
- [ ] The M2 open questions in 8.5.1 (S2 and the trajdemo routing, units, the Primes answer checkpoint, stopping at landing, Pi 5 timings).
- [ ] Fact-Checker review of every [FC] line; Doug's approval of the About wording (Q10 on crediting the ENIAC programmers).
- [ ] Mounting height and whether the production screen matches 1920x1080 (Q2).
- [x] Should the attract view show trajdemo (the current exhibit) or rotate missions? *v0.4:* trajdemo's trajectory loop, with the caption fixed in 7.1 (the only part reachable at the pin, F9).
- [ ] **v0.6 (14.10): Q15 to Q23**: the machine that drives the 24-inch mount; its resolution and touch; the honor-roll names and roles (Doug); Stuart's approval of his credit; the attract recycle; static screens when the core is down; the Transceiver wording; the Printer's panel span; the finale trigger. The [FC] list of every new claim is 14.8.
- [ ] Usability test plan (NFR-09): include one gloved tester and one child aged 8 to 12 on the Squares flow; watch where they pause at the jack windows.

## 14. v0.6: live attract, Explore ENIAC, finale, honor roll and glossary

Added in 0.6 for the 24-inch museum install (PRD 0.4, FR-30 to FR-46 and FR-90 to FR-98). Where this section and an earlier one disagree, **this section wins**: it supersedes 7.1 (S1 Attract), 7.7 (S8 Finale) and 7.10 (S11 About). Everything here keeps the approved panel art (6.1) and the colour and touch rules of 6 and 9.

Tags as before: **[FC]** = a history or technical claim for the Fact-Checker and Doug Crawford (F7); **[V]** = verified by reading the pinned upstream source (`c4b94f2`) or an earlier spike; **[I]** = my reading, to be confirmed; **[A]** = assumption.

### 14.1 What is new, and how the pieces share parts

| Piece | Screen | PRD | Shares |
|---|---|---|---|
| Live attract | S1 | FR-30, FR-34 to FR-36 | The **panorama** (14.3.2) and the Trajectory arc plot |
| Explore ENIAC | S14 (and S15 glossary) | FR-90 to FR-98 | The panorama; the unit table (14.3.1); the glossary |
| Finale | S8 | FR-45 | The honor components (14.6) and, later, the panorama |
| Honor roll and About | S11 (four pages) | FR-41, FR-43, FR-44 | The engraved-plate component |

Design rules for all of it:

1. **One panorama component.** Attract, Explore and (later) the finale draw the same unrolled room. Build it once. It takes a lamp source (`live`, or `dark`) and nothing else, so it cannot show a fake lamp.
2. **One copy table.** Card text, glossary text and honor text live in data files (like the mission files, FR-24), each block with its [FC] claim and source as an internal note that is never shown. **(0.7, PRD FR-46 v0.5)** Review status is not a render gate: everything renders with our best sourced wording (`docs/fact-check.md`), and corrections are welcome. Only a block marked `hold: true` is not rendered; there is no placeholder text on a museum screen.
3. **Honest by construction.** A lamp is lit only from real core status. A number on a result or finale screen comes from this visit's real runs, or it is left out.
4. **Taps first.** No new screen needs a gesture. A one-finger horizontal swipe on the panorama is an optional extra with a tap equivalent for everything it does (UX-03, 14.3.5).

### 14.2 S1 Attract (live), supersedes 7.1

**Goal:** make a passer-by curious, be honest that it is the real machine running, and put Brian L. Stuart's name in front of every visitor.

#### 14.2.1 Layout (1920 x 1080)

> **2026-10-05:** a fixed **designers plate** sits beside the ENIAC title (x600-1208, y20-208): "ENIAC WAS DESIGNED BY / J. Presper Eckert / John W. Mauchly", names at 56 px like the Stuart plate, so the machine's designers are as prominent as its simulator's author. The rotating plate drops its "The builders" slide (four slides now). The footer on every screen reads "ENIAC designed by J. Presper Eckert and John W. Mauchly · Simulator by Brian L. Stuart, Drexel University". Source: [WD46] (fact-check B14a). Every visitor screen also has a **Home** button beside the wordmark (x136, 64 px tall) that returns to the picker; it replaces the mission and run headers' "‹ Missions".

```
+------------------------------------------------------------------------------------+
| ENIAC                                                       +-----------------------+|
| (120 px, x135 y60-200)                                      | THE SHELL'S PATH      ||
| The room-sized computer of 1946. Now you program it. (40)   |  (live arc, 460x240)  ||
|                                                              |  dot by dot from the  ||
|                                                              |  real cards           ||
|                                                              +-----------------------+|
| [LIVE] +-------------------------------------------------------------------------+  |
|        |  PANORAMA of the whole room, y 300-740, panel pitch 150 px:              |  |
|        |  live lamps; the camera drifts slowly along the 40 panels                |  |
|        +-------------------------------------------------------------------------+  |
|   Live: ENIAC is working out a shell's path. Hop 12            (32 px, y 756-796)   |
|                                                                                    |
| +---------------------+   +----------------------------------+  +-----------------+ |
| | THE SIMULATOR BEHIND|   |      TOUCH TO PROGRAM ENIAC      |  | ENIAC'S FIRST   | |
| | THIS SCREEN         |   |   pill 720 x 120, pulsing 1 Hz   |  | PROGRAMMERS     | |
| | Brian L. Stuart     |   +----------------------------------+  | (rotating)      | |
| | Drexel University   |    x600-1320, y836-956                  | names, 8 s each | |
| +---------------------+                                         +-----------------+ |
|  x48-560, y820-976                                               x1360-1872, y820-976|
+------------------------------------------------------------------------------------+
| ENIAC simulator by Brian L. Stuart, Drexel University                     (footer)  |
+------------------------------------------------------------------------------------+
```

| Element | Spec |
|---|---|
| Panorama | The 14.3.2 component at a smaller scale: panel pitch 150 px, 40 panels (6,000 px). Lamps are live (14.2.3). Under the panorama a 60% scrim keeps the text readable. No panel is tappable here; the whole screen is one touch target (FR-31). |
| **LIVE** chip | 64 x 40 px at the panorama's top-left: a dot icon and the word "LIVE" (shape and word, not colour). It shows only while status frames are arriving. If none arrive for 3 s it reads "WAITING"; at 5 s the screen becomes S10 (14.2.4). |
| Shell's path card | A drawn arc, "Along" and "Up" axes, no units on screen (8.3 box, item 5). A dot is added for each real card (columns 51 to 60 along, 71 to 80 up). It is the same plot as the Trajectory mission (`run.plot`). Empty axes and the words "Waiting for the first card" until card 1. |
| Live caption | 32 px. Run: "Live: ENIAC is working out a shell's path. Hop {n}", where {n} is the hop number from the latest real card (columns 26 to 30). Before card 1: "Live: ENIAC is reading its card of numbers." After the landing card: "The shell has landed. ENIAC worked out the whole path." Between flights: "Starting another flight." |
| **Stuart plate** (left) | An engraved plate (dark #0E0F11, cream text, the 6.1 plate style). Line 1, 24 px caps: "THE SIMULATOR BEHIND THIS SCREEN". Line 2, **56 px bold: "Brian L. Stuart"**. Line 3, 28 px: "Drexel University". It is always on screen in attract; it never rotates. |
| **Honor plate** (right) | The same plate style. Heading, 24 px: "ENIAC'S FIRST PROGRAMMERS" (slide 1) with the six names in 28 px; slide 2: "THE BUILDERS: J. Presper Eckert, John W. Mauchly" [FC]; slide 3: "THE BUILDERS: Herman Goldstine, Adele Goldstine" [FC]; slide 4: "MOORE SCHOOL OF ELECTRICAL ENGINEERING, U.S. ARMY BALLISTIC RESEARCH LABORATORY" [FC]. 8 s each with a 400 ms cross-fade. Only `approved` slides show; if none is approved the plate is not drawn. |
| Call to action | The existing pill, "Touch to program ENIAC" (720 x 120). |
| Footer | FR-40, unchanged. |

#### 14.2.2 What runs (FR-34)

| Question | Decision |
|---|---|
| Which program? | **`trajdemo.e` with `drag.e`**: the same program as Mission 3 and as the existing exhibit, so the museum's screen keeps showing what it showed before. It is the only demo that moves many lamps (Accumulators 4 to 20, the Multiplier, Function Table 2, the Master Programmer) and gives a picture (the arc). `sq.e` stops after one square per INIT [V: F1]; `sieve.e` is punch-bound at 0.6 s a card and takes 4 minutes (F10). |
| Which speed? | **Full** (`cy.rate 0`). The trajectory has no useful Slow (8.3.1), and at Full a card comes about every 1.4 s on the Mac (S2); **Pi 5 to be measured, plan on 1.5 to 2.5 s**. |
| How does a run start? | The same two actions as Mission 3 READ and INIT: `b c`, then `b r`, then one `b i`. No visitor steps; the whole configuration is preset. |
| What loops? | **One flight per core process.** At the landing card (the first with `-` in column 71) the bridge sends `s cy.op 1a` (FR-19), the screen holds the finished arc for **8 s**, then the bridge ends the session and starts a fresh attract session. A loop is about 49 s of flight + 8 s hold + 3 s start = **about 60 s** (Mac figures). |
| Why not let it fly on by itself? | After the landing `trajdemo.e` starts another flight on its own, but a second and later flight starts from different register contents [V: 8.3.1, item 3], so a plot built from them might not match the first. Recycling the core is cheap and uses the same freeze logic as Mission 3. **Open (Q19):** if S2 shows free-running later flights are clean, drop the recycle and let it fly. |
| Camera | The panorama **drifts** left to right over one flight (about 80 px a second), then right to left over the next, with ease-in and ease-out at each end. The camera never stops on a blank part of the room: the lamps that move are spread along the whole U. |

#### 14.2.3 What is lit (live-only rule)

A lamp in the panorama is lit **only** from the core's status stream. Lamp sets the core reports and the bridge relays (architecture 5.1 and 6.1; the M1 and M2 builds draw Accumulators 1 to 20, the Initiating Unit, the Cycling Unit, the Master Programmer, a Function Table ring and the Multiplier [I: confirm each set is wired for every instance, for example all three Function Tables]) are drawn live. A unit whose lamps are not relayed (Divider and Square-Rooter, Constant Transmitter, Printer) is drawn **unlit**, never decorated. If a lamp set is not yet wired in the build, that unit is unlit too. Only the panels on screen update (about 8 of 40), so the render cost stays near the Squares run view (NFR-04, NFR-13).

#### 14.2.4 Hand-off, return and failure

| Situation | Behaviour |
|---|---|
| **First touch** | The whole screen is the target. A touch goes to S2 and does nothing else (FR-31). A second tap within 600 ms (the same visitor's double tap) is ignored by S2. The attract core **keeps running** behind S2, S11, S14 and S15 so the picker and Explore stay alive. |
| Start a mission | The attract session is ended and a fresh mission core starts (S0, FR-03). |
| Return to S1 | From S2, S11, S14, S15 after the inactivity timeouts (14.7): the attract session is still running, so S1 comes back at once. From a mission or S8: a **new attract session** starts. S1 shows the panorama **dark** with the caption "Waking ENIAC..." and a spinner icon for up to 3 s, then goes live. |
| No live status for 5 s | **S10.** S1 never shows canned lamps, recorded runs or fake cards (FR-50, FR-36). |
| Between flights | The panorama keeps the last real frame, dimmed to 50%, with the caption "Starting another flight." If the new session is not live in 5 s: S10. |
| A stalled run | No new card for **20 s** while a flight is running (a hop is about 1.4 to 2.5 s) is a hang (FR-05): the bridge restarts the core (counts toward the 3 in 5 minutes) and S10 shows if the budget runs out. |
| Idle | None. Attract has no timeout. Screen blanking is disabled; the nightly 03:00 restart (NFR-07) bounds long-run state. |
| Reduced motion | No drift. The camera **cuts** with a 250 ms cross-fade every 10 s through four fixed framings (the control end, the accumulator wall, the multiplier and tables, the output end). The call-to-action pill does not pulse; it shows a static double ring. |
| Metrics (FR-60) | `attract_flight_started`, `attract_flight_landed`, `attract_touch` (the touch that left attract). |

### 14.3 S14 Explore ENIAC

**Goal:** let a visitor walk the whole machine, learn what each unit is for in plain words, and see which units each mission used. Reached from S2, from the S3 briefing and S7 result of each mission, and from the finale.

#### 14.3.1 The room (data, not opinion)

The layout below is read from Stuart's simulator (`vis/eniactk.go`: `accoff`, `ftuoff`, `drawfixed` and `ray`). Panels are numbered **0 to 39 (0-based, as the upstream offsets)**. In `ray()` panels 0 to 15 form the **left wall**, 16 to 23 the **back wall** and 24 to 39 the **right wall**, so the U is 16 + 8 + 16 panels [V]. The real machine was a U of about 40 panels, roughly 80 feet end to end [FC]; the same count and the U shape appear in the simulator's geometry.

| Unit (id) | Panels | Wall | Evidence |
|---|---|---|---|
| Initiating Unit (`init`) | 0 | left | `drawfixed`: `.ih1` at x 425 of panel 0 [V] |
| Cycling Unit (`cyc`) | 1 | left | `.cycst` at 70+642 [V] |
| Master Programmer (`mp`) | 2 to 3 | left | `.ph1` 320+2x642, `.ph3` 927+2x642 [V] |
| Function Table 1 (`ft1`) | 4 to 5 | left | `ftuoff[0] = 4`; lamps at 428 and 1028 [V] |
| Accumulators 1, 2 | 6, 7 | left | `accoff` [V] |
| Divider and Square-Rooter (`div`) | 8 | left | `.dh1` at 342+8x642 [V] |
| Accumulators 3 to 10 | 9 to 16 | left, then back (A10 = panel 16) | `accoff` [V] |
| High-Speed Multiplier (`mult`) | 17 to 19 | back | `.mh*` at (17+i)x642, i = 0..2 [V] |
| Accumulators 11 to 14 | 20 to 23 | back | `accoff` [V] |
| Accumulators 15 to 18 | 24 to 27 | right | `accoff` [V] |
| Function Table 2 (`ft2`) | 28 to 29 | right | `ftuoff[1] = 28` [V] |
| Function Table 3 (`ft3`) | 30 to 31 | right | `ftuoff[2] = 30` [V] |
| Accumulators 19, 20 | 32, 33 | right | `accoff` [V] |
| Constant Transmitter (`ct`) | 34 to 35 | right | `.conh1` 427+34x642, `.conh3` 1085+34x642 [V] |
| Printer (`pr`) | 36 to 39 | right | Printer lamps are on panel 38 (1060+37x642); **the span 36 to 39 is my reading** [I] (Q22) |

Where things stand on the room's three walls, with the mission colour numerals used in 14.3.7:

```
 panel:  0   1   2-3   4-5   6   7   8   9..16 (A3-A10)  17-19    20..23 (A11-A14)
         I   C   MP    FT1   A1  A2  D/SR  accumulators   MULT     accumulators      <- left wall 0-15 | back wall 16-23
 panel: 24..27 (A15-A18)   28-29  30-31   32   33   34-35   36-39                   <- right wall 24-39
        accumulators       FT2    FT3     A19  A20  CT      PRINTER
```

*Dev note:* `src/web/app/stage/roomplan.ts` mixes 0-based and 1-based panel numbers (for example `i: 1` and `a1: 6`, but `f1: 4` while upstream puts Function Table 1 at 4 and Accumulator 1 at 6). The Explore build should take the table above as the single source and `roomplan.ts` should read it too (F12).

#### 14.3.2 Layout (1920 x 1080)

```
+------------------------------------------------------------------------------------------------+
| [wordmark 0-120] [< Missions] x136-416      Explore ENIAC                       [ Glossary ] 64h |
+---------------------------------------------------------------+--------------------------------+
| ROOM viewport  x24-1384, y112-752 (1360 x 640)                | RAIL  x1408-1896, y112-1016     |
|  DIGIT TRAYS band  y112-184 (72 h, tappable)                  |                                |
|  +-----+ +-----+ +-------+ +-------+ +-----+ ...  panels     |  state A: "ENIAC filled a room." |
|  |INIT | |CYCL | |MASTER | |FUNCT. | |ACC 1|     y184-584     |  intro, plan of the U from above,|
|  |     | |     | |PROGR. | |TABLE 1| |     |     176 x 400,   |  [ Walk the room > ] 96 h        |
|  +-----+ +-----+ +-------+ +-------+ +-----+     pitch 184   |                                |
|  PROGRAM TRAYS band  y584-656 (72 h, tappable)                |  state B: a unit card (14.3.4)  |
|  [Initiating][Cycling][Master Programmer][Function Table 1][Accum. 1]  chips y660-740 (80 h)     |
|  [<] arrow x36-132 y284-484 (96 x 200)             [>] x1276-1372 y284-484                       |
+---------------------------------------------------------------+                                |
| MINIMAP  x24-1384, y768-864 (96 h): 40 cells, 33 px each       |                                |
|  [I][C][MP][MP][F][F][A][A][/][A]...      cream bracket = what is on screen                      |
| LEFT WALL | BACK WALL | RIGHT WALL   labels y868-904                                            |
| You are looking at: Initiating Unit to Accumulator 2          (24 px, y906-946)                  |
| Show the units for: (1) Squares  (2) Primes  (3) Trajectory   64 h chips, y952-1016              |
+---------------------------------------------------------------+--------------------------------+
| ENIAC simulator by Brian L. Stuart, Drexel University                                  (footer) |
+------------------------------------------------------------------------------------------------+
```

The picture is in `docs/mockups/explore-eniac.html` (open in Chrome; it scales to the window) and the PNGs beside it: `explore-eniac.png` (a unit card open), `explore-eniac-browse.png` (Mission 3's units ringed) and `explore-eniac-glossary.png`.

| Element | Spec |
|---|---|
| The room strip | 40 panels x pitch 184 px = 7,360 px, moved with a `translateX`. A panel is the approved art at 176 x 400 (the 300 x 680 kit at 0.588). The viewport shows about 7.4 panels. |
| Trays | The **digit trays** (blue, `--cable-data`) run the whole length above the panels; the **program trays** (reddish purple, `--cable-prog`) run below. This matches the Workbench (4.2: data trunks above, program trunks below) and Stuart's `example.tex` [V]. Short stubs drop from the trays to each unit as a hint that units connect to trays; they are decoration and claim no particular wiring. Each tray band is **72 px high and a tap target** (cards 11 and 12). A tag on the tray ("DIGIT TRAYS: numbers travel here") repeats every 1,500 px. |
| Unit | One tap target for each unit's block of panels (176 px wide for a one-panel unit, up to 4 x 184 for the Printer). Hit areas are **inset 4 px on each side**, so neighbours are 16 px apart (UX-01); a tap in the gap picks the nearest unit (6.6). |
| Label chips | Cream, ink text 24 px bold, 80 px high, two lines ("Accumulator" and "7"). They are a second target for the same unit and are what a screen reader and the Tab order use. |
| **Portable tables** | An upright two-faced switch rack on casters drawn in front of each Function Table's two panels (about 150 x 210 px, bottom-left of the pair; [R46-I] §7.3.1: 26 rows x 28 columns of switches on each of 2 faces). A separate tap target; opens card 8. On the plan (14.3.3), each cart is a small blue box inside the U beside its Function Table, since the carts stood out on the floor ([R46-I] §7.1). [FC: the portable table] |
| **Card reader and punch** | An IBM card reader drawn at the foot of the Constant Transmitter and an IBM card punch at the foot of the Printer. They are part of those two units (cards 9 and 10), not separate targets. Not tappable on their own. [FC] |
| Arrows | 96 x 200 px, at the left and right of the viewport, vertically centred on the panels. Each moves the room by **6 panels** (1,104 px) in 450 ms (ease in and out). At an end the arrow dims to 25% and does nothing. Never required (14.3.5). |
| Minimap | One target, 1,360 x 96. 40 cells (33 px each) coloured by unit kind **with a letter** (I, C, MP, F, A, the divide and times signs, CT, P) so colour is not the only cue (UX-09). Tapping puts that spot in the middle of the screen. A cream bracket shows what is on screen. The three **wall** labels (LEFT, BACK, RIGHT) sit under the cells with a U-shaped bracket line so the visitor sees the room is a U. |
| Readout | "You are looking at: {first unit} to {last unit}" (24 px), computed from the position. |
| Mission chips | "Show the units for: (1) Squares (2) Primes (3) Trajectory", 64 px high, one active at a time; a **Clear** chip appears when one is active (14.3.7). |
| Header | "< Missions" returns to the screen Explore was opened from (the picker, or "< Back to Mission 2" from a briefing or result). "Glossary" opens S15. |

#### 14.3.3 States

| State | Panorama | Rail |
|---|---|---|
| **A. Browse** (entry) | Position 0 (the control end), no ring | Intro card and the plan of the room from above; **Walk the room** (96 px) |
| **B. Unit selected** | A cream 6 px ring (and a black 2 px edge) around the unit and its chip; the room pans so the unit is in the middle (nearest legal position) | The unit card (14.3.4) |
| **C. Mission shown** | Every unit that mission uses gets a **yellow ring and a numeral badge** (1, 2 or 3 in a black circle); the rest dim to 36%; the trays ring too. The room pans to the first used unit. | A mission card: title, up to 40 words naming the units, the plan with the used panels marked, **Start Mission N >** (96 px) |
| **B + C** | Both rings; a selected unit that is also a mission unit keeps the yellow ring and adds the cream chip outline | The unit card; its "Used in" chip for the shown mission is filled yellow |

Yellow keeps its meaning of "look here" (6.4); the cream ring means "selected".

#### 14.3.4 The unit card (rail, state B)

```
+----------------------------------------+
| 3 OF 12 . THE CONDUCTOR        [ X ]   |  24 px caps; Close 64 x 64
| +------------------------------------+ |
| | engraved plate crop of the unit     | |  banner 112 px high (72 px for trays)
| +------------------------------------+ |
| Master Programmer                       |  title 40 px bold (2 lines allowed)
| The conductor. It counts, and decides   |  body 28 / 40, <= 40 words, grade 6 or lower
| what happens next, ...                  |
| [ link, 56+ px, optional ]              |  "Light up all 20 accumulators" or
|                                         |  "Meet the first programmers >"
| USED IN                                 |  24 px bold
| (2) Primes   (3) Trajectory             |  64 px chips, wrap to a second row
| [ < Previous ]        [ Next > ]        |  96 px, y912-1008
+----------------------------------------+
```

- **Words:** at most 40 per card body (FR-22). The twelve cards below are 28 to 35 words. A card is never scrolled; the build fails if a card overflows the rail.
- **Tagline** (the words after the number in the top line) is the unit's job in two to four words.
- **Previous / Next** follow the Walk-the-room order (12 stops). On card 12 Next reads **Finish** and returns to state A. Previous is disabled on card 1.
- **Accumulators:** one card for all 20. The title carries the number tapped ("Accumulator 7") and the tagline reads "One of 20". The link "Light up all 20 accumulators" rings all of them (and toggles back).
- **Function Tables:** one card; the title carries the number ("Function Table 2"). The portable cart opens its own card.
- **Used in:** chips come from the mission files' `units` lists and the programs themselves (14.3.7). A chip **switches state C to that mission** (the visitor stays on the card); the "Start Mission N >" button in state C starts it. A unit no mission uses says so in words ("None of our missions."; the Cycling Unit says "Every mission, but you never plug it in.").
- **Live line (P2):** a one-line live readout under the body, from real status, such as "Right now, Accumulator 18 holds 0000031277" (shown only while that accumulator's lamps are live). Never shown without data.

#### 14.3.5 Interaction

| Input | Result |
|---|---|
| Tap a unit, its chip, a tray band or a cart | State B for it; the room pans if the unit is not in the middle 60% of the viewport |
| Tap the same unit again | No change. (Closing is **X**, so a second tap is never a surprise.) |
| Tap **X**, or Finish | State A (or the mission card if a mission is shown) |
| Tap an **arrow** | Pan 6 panels; the selected unit stays selected |
| Tap the **minimap** | Centre that position |
| Tap **Previous / Next** | The neighbouring stop; the room pans to it (a long pan is capped at 900 ms) |
| Tap **Walk the room** | Stop 1 (the Initiating Unit); Previous and Next from there |
| Tap a **mission chip** | State C for that mission; the same chip again, or **Clear**, returns to B or A |
| Tap **Glossary** | S15 |
| Tap **< Missions** | Back to the origin screen |
| **Optional swipe** | A one-finger horizontal drag on the room moves it. A move under 24 px is still a tap on release (glove jitter). No inertia. **Not taught, labelled or required**: every pan has the arrows, the minimap and Previous/Next. Browser swipe-back and pull-to-refresh stay disabled (UX-06); the room element alone handles the drag. |

All actions fire on release (UX-03); only the first touch point counts (UX-06); feedback within 100 ms (UX-08).

#### 14.3.6 Copy (proposed; every card is for the Fact-Checker and Doug)

Vocabulary matches the missions: "data trunk" and "program trunk" are the mission words, "digit tray" and "program tray" are Nick's and the real machine's [FC]; the cards give both; the glossary (15) ties them together. The Master Programmer is "the conductor" because Primes calls it that; Primes also calls Accumulators 1 to 14 "group checkers"; the accumulator card does not rename them (15.1).

**State A, the intro** (34 words): "ENIAC filled a room. Forty panels stood in a U shape, about 80 feet end to end [FC]. Each panel had one job, and cables joined them. Tap any panel to meet it, or press Walk the room."

**State C, the mission cards** (20 to 26 words):
- Squares: "Squares uses 4 units: the Initiating Unit, the Constant Transmitter, and Accumulators 1 and 2. You plug cables between them."
- Primes: "Primes uses the Initiating Unit, the Constant Transmitter, the Master Programmer, Function Table 1, the Printer, and 15 accumulators: 1 to 14, and 19."
- Trajectory: "The shell uses the Initiating Unit, Constant Transmitter, Master Programmer, High-Speed Multiplier, Function Table 2, the Printer, and 19 accumulators: 1, 2, and 4 to 20."

**The twelve cards** (stop order = the Walk the room order; `Used in` is derived from the programs, 14.3.7). Each body is at most 40 words; the build checks it.

| # | Stop | Card title | Tagline | Copy (<= 40 words) | Words | Used in |
|---|---|---|---|---|---|---|
| 1 | init | Initiating Unit | The GO button | This unit has ENIAC's GO button, called INIT. Press it and a first signal shoots out and starts the job. It also holds CLEAR, and the button that starts the card reader. | 32 | 1 Squares, 2 Primes, 3 Trajectory |
| 2 | cyc | Cycling Unit | The heartbeat | ENIAC's clock. It ticks about 100,000 times a second [FC]. Every unit follows this beat, so numbers and signals arrive at exactly the right moment. One addition takes 20 ticks [FC]. | 31 | none |
| 3 | mp | Master Programmer | The conductor | The conductor. It counts, and decides what happens next, like "do this ten times, then do that." It has ten steppers [FC], a bit like a music box with pins. | 30 | 2 Primes, 3 Trajectory |
| 4 | acc | Accumulator | Adds and remembers | An accumulator adds numbers and remembers them. Each holds one 10-digit number, shown in neon lamps [FC]. ENIAC had 20, so it could keep 20 numbers at once. | 28 | 1 Squares, 2 Primes, 3 Trajectory |
| 5 | mult | High-Speed Multiplier | Times tables, fast | It knows the times table [FC]. It multiplies two 10-digit numbers in about 3 thousandths of a second [FC]. Adding again and again would be far slower. The shell mission uses it on every hop. | 35 | 3 Trajectory |
| 6 | div | Divider and Square-Rooter | Divides, and finds roots | One unit, two jobs: it divides one number by another, and it finds square roots [FC]. It is slower than the multiplier [FC]. None of our missions need it, but it is still here. | 34 | none |
| 7 | ft | Function Table | A look-up table | A function table is a look-up table. Give it a number and it hands back the matching answer, like a dictionary. ENIAC had three [FC], each with 104 rows [FC], set with switches. | 33 | 2 Primes, 3 Trajectory |
| 8 | pft | Portable Function Table | Switches on wheels | A big box on wheels, out on the floor, with 1,456 switches, set by hand, on its two faces [FC]. Any of the three boxes could plug into any Function Table [FC]. The shell mission's air-drag table takes 711 switches. | 30 | 3 Trajectory |
| 9 | ct | Constant Transmitter | Numbers in | This is how numbers get into ENIAC. Dials hold numbers that never change. The IBM card reader beside it feeds in new ones from punched cards [FC]. Mission 3 reads a card here. | 33 | 1 Squares, 2 Primes, 3 Trajectory |
| 10 | pr | Printer | Answers out | ENIAC's answers come out here as punched cards, made by an IBM card punch [FC]. Each card holds the numbers ENIAC was told to print. Missions 2 and 3 watch the cards pile up. | 34 | 2 Primes, 3 Trajectory |
| 11 | dt | Digit Trays | Number highways | Long trays of cables carry numbers between units, like a highway. A number travels on a bundle of wires, one wire for each place: ones, tens, hundreds [FC]. Also called data trunks. | 32 | 1 Squares, 2 Primes, 3 Trajectory |
| 12 | pt | Program Trays | "Go!" signals | These trays carry signals, not numbers. A program pulse is one "go!" on one wire [FC]. It tells a unit to start its next job. Change the cables and you change the program. | 33 | 1 Squares, 2 Primes, 3 Trajectory |

Notes on specific claims:
- **Cards 1, 9** [V]: the initiating unit carries INITIATE, CLEAR and READ in the approved art, and the reader is wired through the Constant Transmitter (`constant.go`, `proccard`).
- **Card 2**: 20 ticks is `len(clocks)/2` in `cycle.go` [V]; 100,000 a second is the same as 1/5,000 s for an addition [FC] (already in the Squares copy).
- **Card 7**: 104 rows is the switch range `-2` to `101` in `ref.tex` [V] (Primes and Trajectory use Function Tables 1 and 2; `f1.*` in `sieve.e`, `f2.*` in `drag.e` [V]).
- **Card 8**: 711 switches for Function Table 2 is 705 in `drag.e` plus 6 in `trajdemo.e` (8.3.2) [V].
- **Card 6**: "None of our missions need it" is true for `sieve.e`, `trajdemo.e`, `drag.e` and `sq.e` (no `d.` lines) [V].
- **Cards 5, 10, 11, 12**: [FC] throughout; the multiplier "3 thousandths of a second" is the published figure for a 10 by 10 digit multiply and needs a source.

#### 14.3.7 Mission cross-links (both ways)

| From | To | How |
|---|---|---|
| Unit card | Mission | "Used in" chips switch the room to that mission (state C); **Start Mission N >** starts it (S0 then S3) |
| Mission chips on S14 | Units | State C rings the units and shows the numeral badges |
| S3 briefing | S14 | A text button "See these units in the room" (64 px) opens S14 in state C for that mission; the header reads "< Back to Mission N" |
| S7 result | S14 | "See where they stand" (64 px) does the same |
| S11 page 2 | S14 | "See the cables they plugged >" opens card 12 (Program Trays) |
| S14 card 12 | S11 page 2 | "Meet the first programmers >" |
| S15 glossary | S14 | "Show me >" opens the card for that word |

The mission-to-unit lists are **derived from the programs, not typed**: `missions/*.yaml` `units` and the plugs and switches of the `.e` files. Checked on 2026-10-02 against the pinned programs [V]: Squares uses `i`, `c`, `a1`, `a2` (8.1.2); Primes uses `i`, `c`, `p`, `f1`, `pr`, `a1` to `a14` and `a19` (`sieve.e`); Trajectory uses `i`, `c`, `p`, `m`, `f2`, `pr`, `a1`, `a2`, `a4` to `a20` (`trajdemo.e`, `drag.e`). No program uses `d` (the divider) or `f3`.

*Starting a mission from Explore ends the attract session and starts a fresh mission core (FR-03).* Opening Explore from S3 or S7 does **not** touch the mission session; it uses the mission's own lamps if it has any, so the room is still the real machine.

#### 14.3.8 Core-down, no-core and idle

| Situation | Behaviour |
|---|---|
| Core up and live | Lamps are live (14.2.3). |
| **Core down, bridge up** | **S14 keeps working** as a static tour. Every lamp is dark. A pill sits at the top of the room: an icon and "Live lamps are off: ENIAC is resting. The tour still works." The "Start Mission N" buttons and "Used in" chips show but are disabled with the words "ENIAC is resting". Nothing is lit that is not real. This is a deliberate narrowing of FR-50 for **static screens** (S11, S14, S15, S8 recap): they show no machine state, so they stay up and say so; as soon as the visitor leaves for S1 or S2 (which need the core), **S10** shows. **Q20** asks Nick to confirm. |
| Websocket or bridge down for more than 5 s | **S10**, as everywhere (FR-50). |
| Recovery | The pill disappears and lamps go live. The visitor's place (position and card) is kept. |
| Idle | **120 s** with no touch (configurable), then S9 (15 s), then S1. A visitor reading a card is touching nothing, so the value is longer than the 90 s of the picker. |
| Reduced motion | The room does not slide: it **cross-fades** (200 ms) to the new position; the arrows still step 6 panels; the swipe has no inertia; the walk uses fades; no ring pulses. |
| Explore v0 (no session at all) | Allowed as the first build: the same screen with all lamps dark and no pill needed (no core is expected). See PRD M3-lite. |

#### 14.3.9 Accessibility and reach

| Area | Spec |
|---|---|
| Targets | Units at least 176 x 400 (hit area 168 x 392); chips 176 x 80; arrows 96 x 200; minimap 1,320 x 56 inside a 96-high target; mission chips 64 high; Close 64 x 64; Previous and Next 96 high; 16 px between hit areas. On the 24-inch panel one CSS px is about 0.277 mm, so 64 px is about 17.7 mm and 96 px about 26.6 mm (9.4). |
| Text | 24 px minimum on stage; card body 28 px; card title 40 px (NFR-06). Engraved text on the panel art is decoration only. |
| Order | Tab and reading order: header, room (units left to right, then trays), minimap, mission chips, rail. Each unit and chip is a button with a label such as "Accumulator 7, one of 20. Opens its card." |
| Colour | Ring colour is never the only cue: the yellow ring comes with a numeral badge; the cream ring comes with a chip outline and the card; minimap cells carry a letter. |
| Reach | Primary actions (Walk the room, Previous, Next, Start Mission) are in the lower right. The arrows are mid-screen at the sides, within reach of a short visitor on a mount at a normal height (mount height Q16). |
| Motion | Pans are 450 ms and never move while a finger is down (9.1). Nothing flashes. |

### 14.4 S15 Glossary

A full-screen page under the header (the same header as S14), reached from the **Glossary** button on S14 and, later, from "Tell me more" links in the missions (P2). 16 terms in two pages of 8 (2 columns x 4 rows). The words are in section 15.

| Element | Spec |
|---|---|
| Tile | 904 x 184, cream, ink text. Term 30 px bold; meaning 26 px, at most **25 words**; a "Show me >" link (24 px bold, 64 px target) at the bottom right opens that unit's card on S14 when the term has a place in the room. |
| Page control | One 300 x 64 button: "More words >" on page 1, "< First words" on page 2. Close (200 x 64). |
| Idle | 90 s, then S9 and S1. |
| Core down | Works (static screen, 14.3.8). |
| Held terms | A term with `review: hold` (the Transceiver) is **not shown**. |

### 14.5 S8 Finale, supersedes 7.7

**Goal:** an end-of-tour payoff that says what the visitor did, shows where it happened, and honours the people behind it, in under 90 seconds, skippable at any moment.

#### 14.5.1 When it appears

- **Trigger:** the visitor taps **Finish** on a result screen (S7) once **all three missions have reached their result in this visit** (state kept in memory only and cleared at the idle reset, 8.4). S7's primary button names the next mission **not yet done**, in the order 1, 2, 3, and reads **Finish** when none is left. (Replaces the 8.4 rule "Finish after Trajectory".)
- **Also:** when all three are done the picker (S2) replaces its "Suggested order" text with a "See the finale >" chip (14.9), so a visitor who went back to the menu can still reach it.
- A visitor who does only one or two missions never sees S8; they see S7 and the picker with "UP NEXT" (8.4).

#### 14.5.2 The beats

Each beat is a full screen with the footer. A beat advances on **Next >** (96 px, bottom right), on a touch anywhere on the beat (except Skip), or on its timer. **Skip to the end** (64 px, top right) goes to beat 5. No beat needs a gesture.

| Beat | Time | Content |
|---|---|---|
| **F1 You programmed ENIAC.** | 15 s | Headline 96 px: "You programmed ENIAC." Line 2 (28 px): "In 1946, setting up a job like this took people days [FC]. You did it in about {m} minutes." {m} is this visit's real session time, shown only if 3 to 30. Three engraved plates (one per mission) with this visit's **real** results: "Squares: you counted up to {n} x {n} = {n2}." / "Primes: {c} cards punched. The last prime was {v}." / "Trajectory: a shell's flight, in {h} hops." And, if the visitor placed anything by hand: "You placed {c} cables and set {s} switches yourself." (hand-placed counts only; "done for me" steps are not counted) |
| **F2 Here is every unit you used.** | 15 s | **Only when S14 exists.** The panorama (14.3.2) plays one slow pass of the whole room with every unit used in the three missions ringed in yellow, with live lamps if a core is up. Caption: "You used {p} of ENIAC's 40 panels. Yellow rings show them. ENIAC did all of this with cables and switches." {p} is computed from the room table and the missions' `units` lists (all three done: 36 of 40 on the table in 14.3.1, with the Printer span [I]). Button: **Explore the whole machine >**. |
| **F3 Brian L. Stuart wrote this simulator.** | 15 s | The Stuart page (14.6.1) in beat form: the engraved plate at 72 px, the line "Every lamp you saw was run by his program. Without his work, there would be nothing here to touch." and the QR code. |
| **F4 The people who made ENIAC.** | 20 s | The honor roll in beat form (14.6.2 and 14.6.3): the six names fade in one by one (400 ms apart), then the builders, then the institutions. Line: "Six women programmed it. Engineers and an Army team built it. Thank you to all of them. [FC]" |
| **F5 Thanks for visiting!** | holds 20 s | "Come back and try the other missions, or explore the whole machine." Buttons: **Start over for the next visitor** (96 px, primary; resets as FR-33 and goes to S1) and **Explore ENIAC** (96 px). After 20 s with no touch it returns to S1 as the primary button does. |

Total worst case: 15 + 15 + 15 + 20 + 20 = **85 s**. No "Still there?" overlay is needed (nothing is pending).

#### 14.5.3 Honesty, failure and motion

- Every number comes from this visit's real runs. If a run's number is not available (for example "Skip to the answer" went to a result with no tape), that plate shows the mission's words only ("Squares: ENIAC counted in squares.") with no figure. No placeholder numbers.
- **Core down:** F1, F3, F4, F5 are static and keep working with the pill of 14.3.8; **F2 is skipped** (it needs the room). If the websocket or bridge is down for 5 s: S10.
- **Reduced motion:** F2 shows four fixed framings with cross-fades instead of the slow pass, and the names in F4 appear at once. Timers are not motion and stay the same.
- **Metrics:** `finale_reached`, `finale_beat_{n}`, `finale_skipped_at`, `finale_start_over`, `finale_explore`.
- **Idle:** per beat timers above; a visitor who walks away reaches S1 on its own.

### 14.6 S11 About and honor roll, supersedes 7.10

**Goal:** credit **Brian L. Stuart** prominently ("without him, we got nothing"), and honour the people who built and programmed the real ENIAC. Reached from S2 (the "About and honor roll" button), from the finale, and from links on S7 (Trajectory) and S14.

#### 14.6.1 Layout and pages

```
+------------------------------------------------------------------------------------+
| [wordmark]  About and honor roll                                          (64 px)   |
+------------------------------------------------------------------------------------+
| [ Brian L. Stuart ]  [ The first programmers ]  [ The builders ]  [ This exhibit ]  |  4 tabs, 96 h, y112-208
+------------------------------------------------------------------------------------+
| page content, x80-1840, y232-900                                                    |
+------------------------------------------------------------------------------------+
| [ < Back ] 96 h x80-400 y916-1012                                                   |
+------------------------------------------------------------------------------------+
```

The tabs are four large buttons (each 440 x 96); the open page is filled. No swipe, no scrolling: every page fits on one screen.

**Page 1: Brian L. Stuart** (open by default when entered from attract or the finale)

```
+-----------------------------------------------------+------------------------------+
| +---------------------------------------------+     |  QR code 280 x 280            |
| |  BRIAN L. STUART        (plate, 96 px bold) |     |  (local image)                |
| |  Drexel University      (36 px)             |     |  "Scan to visit his simulator |
| +---------------------------------------------+     |   page."  (28 px)             |
|  Every lamp, cable and switch on this screen is run |  cs.drexel.edu/~bls96/eniac/  |
|  by a simulator that Brian L. Stuart wrote. ...     |   simulator.html  (28 px)     |
|  His paper, "Simulating the ENIAC," ...             |                               |
+-----------------------------------------------------+------------------------------+
```

**Page 2: The first programmers.** Six engraved plates in two columns by three rows (each 840 x 120, name 44 px bold, a 24 px line "Programmer of ENIAC, 1945 to 1946 [FC]") under the lead. Buttons: "See the cables they plugged >" (opens S14 card 12).

**Page 3: The builders.** Four person plates (name 40 px bold, a one-line role in 24 to 28 px) and two institution plates (2 x 3 grid), under the lead.

**Page 4: This exhibit.** The mission sources and who made the screen (14.6.4).

#### 14.6.2 Honor copy (every line [FC]; 0.7: all of it renders, see FR-46 v0.5; the shipped wording is in `src/web/app/content/honor.ts`, corrected per `docs/fact-check.md`)

**Page 1, Stuart** (38 words + 17): "Every lamp, cable and switch on this screen is run by a simulator that Brian L. Stuart wrote. It follows the real 1946 machine pulse by pulse [FC]. Without his work, this exhibit would be an empty screen." Then: "His paper, "Simulating the ENIAC," is in IEEE [FC]. Scan the code to visit his simulator page." (QR and the URL, in 28 px, so a glove or glare cannot defeat it.) The paper's journal and year are for the Fact-Checker; the upstream README links it as `ieeexplore.ieee.org/document/8326772`.

**Page 2, the six** (34 words): "In 1945, six women were chosen to program ENIAC [FC]. There was no manual and no programming language. They learned the machine from its wiring diagrams and worked out every cable by hand [FC]." Then: "The shell mission follows the demo they prepared for February 15, 1946 [FC]."

| Name (as given by Nick) | Line |
|---|---|
| Jean Jennings Bartik | Programmer of ENIAC [FC] |
| Kathleen McNulty Mauchly Antonelli | Programmer of ENIAC [FC] |
| Frances Bilas Spence | Programmer of ENIAC [FC] |
| Marlyn Wescoff Meltzer | Programmer of ENIAC [FC] |
| Ruth Lichterman Teitelbaum | Programmer of ENIAC [FC] |
| Betty Snyder Holberton | Programmer of ENIAC [FC] |

*Name format is for Doug (Q17):* these are the names the women are best known by later in life; in 1945 they worked under their earlier names (for example Jean Jennings and Kay McNulty). Doug may prefer "Betty Jean Jennings Bartik" or to show both. Nothing about their later careers is claimed.

**Page 3, the builders** (27 words): "ENIAC was built at the Moore School of Electrical Engineering, University of Pennsylvania, for the U.S. Army [FC]. The Army needed firing tables for its guns [FC]."

| Plate | Line (one line each) |
|---|---|
| J. Presper Eckert | Chief engineer of ENIAC. [FC] |
| John W. Mauchly | Proposed the machine and helped design it. [FC] |
| Herman Goldstine | Army officer who linked the Army to the project. [FC] |
| Adele Goldstine | Mathematician who wrote ENIAC's manual and trained its programmers. [FC] |
| Moore School of Electrical Engineering, University of Pennsylvania | Where ENIAC was designed and built. [FC] |
| U.S. Army Ordnance and the Ballistic Research Laboratory | Paid for ENIAC, then ran it at Aberdeen from 1947. [FC] |

*Roles are one line each on purpose:* the credit questions (who did what) are the part historians argue about, so each role is a short, widely agreed line for the Fact-Checker to confirm, or to shorten to "Designed and built ENIAC".

**Page 4, this exhibit** (24 words): "This exhibit runs on Brian Stuart's simulator, on a screen of the Vintage Computer Federation at InfoAge. Our three missions come from real history." Then the mission sources, from 7.10: Squares (example by Brian Stuart); Primes (D. H. Lehmer's July 1946 runs, as reconstructed by Liesbeth De Mol and Maarten Bullynck [FC]); Trajectory (the public demo of February 15, 1946 [FC]); the museum (Vintage Computer Federation, InfoAge); type (Atkinson Hyperlegible, IBM Plex Mono; SIL Open Font License). **Who made this screen** (Nick DeMarco, or the museum's wording) is Q18.

#### 14.6.3 Where the honor appears

| Where | What | Source |
|---|---|---|
| Every screen | Footer: "ENIAC simulator by Brian L. Stuart, Drexel University" (FR-40) | footer |
| S1 attract | The Stuart plate (always) and the rotating honor plate | 14.2.1 |
| S2 picker | The button "About and honor roll" (now 96 px, beside Explore) | 14.9 |
| S7 (Trajectory) | A text link "The women who programmed the demo >" opens S11 page 2 [FC] | 14.6.1 |
| S14 | Card 12 (Program Trays) links to S11 page 2 | 14.3.4 |
| S8 | Beats F3 and F4 | 14.5.2 |
| S11 | Four pages | here |

**No photographs** of people appear anywhere: portraits raise rights questions (R1 is about Stuart's images; museum and archive photos are another clearance) and the engraved-plate style fits the machine. If Doug has cleared photos, they are a later addition.

#### 14.6.4 Behaviour

| Item | Spec |
|---|---|
| Timeout | 90 s on any page, then S9 and S1. Opening from the finale returns to the finale's last beat. |
| Core down | Works (static, 14.3.8). A pill is not needed here (no machine state is shown). |
| Reduced motion | Pages change by cross-fade; no slide. |
| Metrics | `honor_page_view{1..4}` |
| Content flags | **0.7:** every page renders (FR-46 v0.5); [FC] notes stay in the data, unseen. A block marked `hold: true` is not drawn, and a page with nothing left to show is not offered (its tab is hidden). The Stuart page's wording is still sent to Stuart, and his corrections are welcome (Q18). |

### 14.7 Idle, core-down and reduced-motion, per screen

| Screen | Idle | Core down (bridge up) | Core and bridge down (5 s) | Reduced motion |
|---|---|---|---|---|
| S1 Attract | none | S10 after 5 s | S10 | cuts with cross-fade; no pulse |
| S2 Picker | 90 s | S10 (missions need the core) | S10 | cross-fade |
| S3 to S7 | as 3.1 | S10 | S10 | as 9.5 |
| **S8 Finale** | beat timers; F5 holds 20 s | F1, F3, F4, F5 work; F2 skipped | S10 | no timers; names at once |
| **S11 Honor** | 90 s | works | S10 | cross-fade |
| **S14 Explore** | 120 s | works, lamps dark, pill | S10 | cross-fade pans |
| **S15 Glossary** | 90 s | works | S10 | cross-fade |
| **S16 Keeping ENIAC alive** | 120 s | works (static, no pill: nothing on it is live) | S10 | cross-fade; no shake, no slide |

"Reduced motion" is the box setting of 9.5 **or** the browser's `prefers-reduced-motion`.

### 14.8 [FC] list for the Fact-Checker and Doug Crawford (all new claims)

| # | Claim | Where | Evidence I have |
|---|---|---|---|
| 1 | ENIAC was a U of about 40 panels, about 80 feet end to end | S14 intro | The simulator's `ray()` has 16 + 8 + 16 panels; the 80 feet is Nick's figure |
| 2 | About 100,000 clock ticks a second; an addition takes 20 ticks | Cycling card, glossary | 20 pulse slots in `cycle.go` [V]; 1/5,000 s is in the Squares copy. The 100,000 figure needs a source |
| 3 | Ten steppers in the Master Programmer | Card 3 | The simulator has ten (A to K without I) [V]; the real count needs a source (also in Primes) |
| 4 | An accumulator holds one 10-digit number, shown in neon lamps; ENIAC had 20 | Card 4, glossary | `accoff` has 20; the 10-digit width is in the Squares copy |
| 5 | The multiplier knows the times table; about 3 thousandths of a second for two 10-digit numbers | Card 5 | Published figure from memory; needs a source |
| 6 | The divider and square-rooter is one unit; it is slower than the multiplier | Card 6 | Likely, from the machine's design; needs a source |
| 7 | Three function tables, each with 104 rows, set with switches; portable tables on carts; set by hand | Cards 7, 8 | 104 rows from `ref.tex` [V]; "portable", "out on the floor" and "any cart with any Function Table": [R46-I] §7.1 p. VII-2 [V, 2026-10-05]; "by hand": §7.3.1 (values "set up manually on switches") |
| 8 | The IBM card reader is attached to the Constant Transmitter; the IBM card punch makes the printed cards | Cards 9, 10 | `constant.go` reads cards [V]; the IBM equipment and its pairing need a source |
| 9 | A number travels on a bundle of wires, one for each place (ones, tens, hundreds) | Card 11 | From memory; needs a source |
| 10 | A program pulse is one "go!" on one wire | Card 12, glossary | From memory; needs a source |
| 11 | Digit trays and program trays; "data trunk" and "program trunk" are the same things | Cards 11, 12, glossary | The simulator's words are trunks; the real names are trays [I] |
| 12 | Six women were chosen in 1945, no manual or programming language, learned from wiring diagrams | S11 page 2, S8 F4 | Common history; for the Fact-Checker |
| 13 | The six names and the Programmer line | S11 page 2, S1 plate | The names are Nick's; format is Q17 |
| 14 | They prepared the February 15, 1946 demo | S11 page 2, S7 link | Trajectory copy already carries "Six women programmers set up ENIAC for it" [FC] |
| 15 | Moore School; the Army; firing tables; the Ballistic Research Laboratory ran it at Aberdeen from 1947 | S11 page 3 | Common history; for the Fact-Checker |
| 16 | Eckert, chief engineer; Mauchly, proposed and designed; Herman Goldstine, Army liaison; Adele Goldstine, wrote the manual and trained the programmers | S11 page 3 | Common history; roles are the most disputed lines; Doug to approve or shorten |
| 17 | "In 1946, setting up a job like this took people days" | F1 | Already in the mission "rest done for you" copy [FC] |
| 18 | Stuart's simulator "follows the real machine pulse by pulse"; his IEEE paper | S11 page 1 | The upstream README says "pulse-level simulator" [V] |
| 19 | The transceiver | Glossary (held) | Not in the missions or sim docs beyond one comment [V]; do not show until confirmed |
| 20 | Tubes, parts and joints: about 18,000 tubes; a radio about 10, the biggest radar set 400, a B-29 under 800; about 70,000 resistors, 10,000 capacitors, 500,000 soldered joints; the glowing lamps are neon and the tubes sat inside | S16 card 1, glossary | `docs/fact-check.md` E1, E3, E4, E20, E23 |
| 21 | Power and heat: about 150 kW (80 heaters, 45 d-c, 20 fans, 5 card machines); 1,500 bright bulbs; one hour is 5 to 6 days of a home today; a panel thermostat stopped the machine above 115 °F | S16 card 2, glossary | E6 to E9 |
| 22 | Why tubes burned out: switching on and off is hard on them; heaters left on overnight (1946 to 1948); tubes run gently; Eckert's "one tube every two days" (his memory) | S16 card 3 | E11, E13, E15, E17 |
| 23 | The hunt: unit, then circuit, then tube; neon lamps as the visual check; plug-in units; Eckert's "within 15 minutes" (his claim) | S16 card 4, the re-enactment, glossary | E11, E21, E22, E24 |
| 24 | Time at work: 5 to 25 percent (1946 to 1948, Army estimates); 55 percent (1948 to 1952); about 7 hours in 10 (1954); tubes not the only trouble | S16 card 5 | E12, E25 |
| 25 | The lights of Philadelphia did not dim: Eckert called it "total fiction" | S16 myth card | E28, E6 |

### 14.9 Entry points: the picker (S2) and the briefing

The picker keeps its three cards (8.4). The row under them changes (y 848 to 944):

```
|  [ Explore ENIAC: tour the whole machine ]  [ About and honor roll ]     Suggested order  |
|    x80-880 (800 x 96, filled cream)           x912-1392 (480 x 96)         1, then 2, then 3 |
```

- **Explore ENIAC** is a primary-size button (96 px) with a small drawing of the U on its left. It is **not** a fourth mission card and has no number, so the suggested order (1, 2, 3) stays clear.
- When all three missions are done the order text is replaced by the chip "See the finale >" (14.5.1).
- S3 gains a text button "See these units in the room" (64 px) under the briefing buttons, and S7 gains "See where they stand" (64 px) in the right column (14.3.7).

### 14.10 New open questions (from this section)

| # | Question | Default used here | Whose call |
|---|---|---|---|
| Q15 | What computer drives the 24-inch mount (the old exhibit Pi, the Model 4 Pi 5 or the new Pi 5)? Its OS and architecture? | Pi 5, arm64, as the PRD | Nick |
| Q16 | The panel's native resolution, aspect and touch technology; the mount's height | 1920 x 1080 (16:9); projected-capacitive or infrared untested | Nick / Doug |
| Q17 | The honor roll names: format, roles, anyone else to include | The names in 14.6.2 | Doug |
| Q18 | Stuart's approval of his credit wording; who is named as making this screen | Wording sent to Stuart with the R1 request | Nick / Stuart |
| Q19 | Attract: recycle the core after each flight, or let the program fly on? | Recycle (14.2.2) | Nick (S2 follow-up) |
| Q20 | Static screens when the core is down: keep working with a pill, or S10 everywhere? | Keep working, with a pill (14.3.8) | Nick |
| Q21 | The Transceiver wording | Held | Stuart / Doug |
| Q22 | The Printer's panel span and the whole layout against the 1946 floor plan | 36 to 39 [I] | Doug / Stuart |
| Q23 | Finale trigger: all three missions done, or Finish on any mission? | All three done (14.5.1) | Nick |
| Q24 | When the core is down, should S16 keep working with no pill? | Yes: nothing on it is live and the plate says so (14.11) | Nick |
| Q25 | A header button on S14, or also a "Where are the tubes?" tag on every panel of the room? | Header button only (14.11) | Nick |
| Q26 | Ship the optional attract plate "about 18,000 vacuum tubes, about 150 kilowatts, about 30 tons"? | Built with S1 live attract: the fifth slide of the rotating honor plate, "THE MACHINE: About 18,000 vacuum tubes / About 150 kilowatts / About 30 tons" (`content/honor.ts`, fact-check E1, E6 and the weight row). Drop it by setting `hold: true` | Nick |
| Q27 | The Haigh and Priestley December 1947 figures on a card once someone has read the book? | Not on a card; docent note only (`docs/tubes.md` 1.3) | Nick |

### 14.11 S16 Keeping ENIAC alive

**Goal:** tell how ENIAC's 18,000 tubes were kept working, in five cards and one hands-on re-enactment, so a visitor leaves knowing how many tubes there were, how much power they took, why they burned out and how a crew found a dead one. The research, the sources and every claim are in `docs/tubes.md` (sections 1 and 2) and `docs/fact-check.md` group E; the mockup is `docs/mockups/tubes.html`. This section is the build spec; where it and `docs/tubes.md` differ, this section wins.

**Where it lives.** A sibling of S14, not a thirteenth stop (the stops are units in the room; the tubes are inside all of them). Same header, footer, rail card and tokens as S14: the stage x24-1384, y112-1016 (one drawn figure per card) and the rail x1408-1896, y112-1016.

| Entry | How |
|---|---|
| S14 header | **Keeping ENIAC alive** (430 x 64), left of Glossary, in every S14 state. Back, X and Finish return to S14 where the visitor was (position, card, mission). |
| S15 glossary, page 3 | **Vacuum tube**, **Plug-in unit**, **Kilowatt**: "Show me" opens S16 cards 1, 4 and 2; Back returns to glossary page 3. |
| S16 card 2 | A link "Did the lights of Philadelphia dim? >" opens the myth card; "< Back" returns to card 2. |
| S8 finale, F2 | A chip **How they kept it alive >** (64 px) opens S16 through `app.openTubes({ from: "finale", back })`; Finish and X return to the view passed (F5). Built with the finale. |
| S16 header | **< Explore** (or < Glossary, < Back, by origin) and **Glossary**; the glossary's Close returns to the same S16 card. |

**The five cards and the myth card** (rail: "n OF 5 · TAGLINE", a 112 px banner, title, body of at most 40 words, Previous / Next 96 px; Finish on card 5 returns to the origin). The copy is data in `src/web/app/tubes/content.ts`, with the E-rows of each claim as an internal note (FR-46).

| # | Title | Tagline | Body | Stage figure |
|---|---|---|---|---|
| 1 | The tubes | About 18,000 | ENIAC had about 18,000 vacuum tubes. A tube is a sealed bulb that switches a signal on and off, with nothing moving. A radio had about ten. The glowing lamps you see are neon, not tubes. The tubes sat inside. | Exactly 18,000 dots, one per tube (200 x 90); bright boxes of 10 (a radio), 400 (the biggest radar set) and 760 (a B-29, "under 800"); captions on where the tubes were and the 70,000 resistors, 10,000 capacitors and 500,000 soldered joints |
| 2 | Power and heat | A big appetite | ENIAC used about 150 kilowatts, as much as 1,500 bright light bulbs. More than half of it just made the tubes hot. Fans blew the heat out. A panel that got too hot switched the whole machine off. | The 150 kW bar split 80 / 45 / 20 / 5 and one home's 1.2 kW on the same scale; "In one hour ... 5 to 6 days"; the 115 °F thermostat |
| 3 | Why tubes burned out | Hard on tubes | Tubes wear out like light bulbs, and switching on and off is hard on them. So early on, the crew left the heaters on overnight, and ran the tubes gently. Eckert remembered losing about one tube every two days. | One week in 1946 to 1948: an 8-hour shift Monday to Friday, heaters on all week, the rest dark |
| 4 | The hunt | Which tube? | When an answer came out wrong, the crew hunted: which unit, which circuit, which tube? Lamps showed what was happening inside. Tubes sat in plug-in units that swapped fast. Eckert said they found a bad tube within 15 minutes. | Three rungs: which unit, which circuit, which tube. The rail adds **Find the dead tube >** (96 px) |
| 5 | A week with ENIAC | Time at work | In its first two years, ENIAC did real work only 5 to 25 percent of the time, by Army estimates. Testing, setting up and repairs took the rest. By 1954 it worked about 7 hours in every 10. | Three bars: 5 to 25, 55, 70 percent; "Tubes were not the only trouble." |
| M | Did the lights of Philadelphia dim? | Myth check | No. A story says ENIAC dimmed Philadelphia's lights when it switched on. Eckert, who built it, called that story "total fiction." ENIAC took its power from the city grid, through its own regulators. | A MYTH stamp and Eckert's quotation, attributed |

Never on screen (`docs/tubes.md` 1.4): "116 hours", "never turned off", "one-quarter power", "5,000,000 joints", "every few minutes", "most failed at warm-up", "selected tubes", a tube-type count, a failure percentage, or a claim that failures fell over the years.

**Find the dead tube (a re-enactment, never live state).** Five steps in the 1946 maintenance manual's order: run the test; tap the accumulator whose lamps are out of line; tap the digit place with the wrong lamp; touch tubes until one is COLD; plug in a fresh unit. Then the fixed state. Four drawn accumulators **ACC 1 to ACC 4** (never "Accumulator n"), ten places each, lamps 0 to 9 down the left; the test should leave every one at 5555555555.

| Rule | Spec |
|---|---|
| Plate | On every state, including the win: a dashed **RE-ENACTMENT** badge and "These panels are drawn, not the live ENIAC. The fault is made up. The steps follow the 1946 maintenance manual." (20 words, 24 px, full stage width, double rule below). |
| Not live | The exercise reads no core, session, link or lamp-store state and imports none of those modules; its lamps are `data-source="script"`; no live unit ids; a dashed frame around the practice area. It is reached only by a tap (card 4's button). |
| Faults | Three, authored, in order, never random: ACC 3 / place 4 / lamp 9 / tube 3; ACC 1 / place 8 / lamp 1 / tube 6; ACC 4 / place 2 / lamp 8 / tube 1. "Try another fault" moves on (0, 1, 2, 0). Each new S16 (after S1) starts at the first. |
| Targets | Panels 306 x 700 (326 pitch); columns 100 x 552 (116 pitch); tubes 112 x 300 (128 pitch); a tap within 16 px of a target counts (the nearest wins); a tap elsewhere is a neutral ripple. |
| Ladder (UX 5.2) | Wrong #1: a red X badge on the target for 600 ms and a 300 ms shake; the line "Not quite. ..." Wrong #2: the right target's ring (12 px yellow) and "Look for the glowing ring." plus a hint (the panel hint says "lower" or "higher" by the fault's lamp). Wrong #3: **Do it for me** turns filled and "Want us to do this one?". A warm tube is not an error ("Warm. That one works. Try another.") but counts toward the ladder. The counter resets on each step. |
| Help | **Do it for me** (96 px, steps 2 to 4) plays the step; **Skip to the answer** (64 px, steps 2 to 5) goes to the fixed state with no confirm; **< Back to the story** (64 px) returns to card 4 and discards the exercise. |
| Fixed | All four panels at 5555555555, a green ring on the repaired place; "Fixed!" and "Every lamp lines up again. A real crew would also test the dead tube and write it in the log. Eckert said a hunt took up to 15 minutes." No score, timer or percentage. **Try another fault** and **Back to the story >** (96 px). |
| Colour | Warm and COLD carry their words and different tints; the ring comes with a thicker outline; the wrong lamp is a position and is named in the line after step 2. |
| Motion | Lamp change 80 ms; the unit slides in over 400 ms; other changes cross-fade 200 ms. Reduced motion: 200 ms cross-fades only, no shake, no slide. |

**Idle, failure, metrics.** Idle 120 s (the S14 value), then S9 and S1; S1 resets the exercise and the fault. Core down with the bridge up: S16 works unchanged with no pill (Q24). Websocket or bridge down more than 5 s: S10. Counters (FR-101): `tubes_open{screen}`, `tubes_card{n}`, `tubes_myth_open`, `tubes_try_start{n: fault}`, `tubes_try_step{n: 2..5}`, `tubes_try_done{n: fault, assisted}`, `tubes_try_skip{n: step}`.

---

## 15. Glossary

Sixteen terms for S15 (14.4), and a map from the words the **missions** use to the words the **real machine** used, for visitors and for anyone (Nick included) learning ENIAC from this exhibit. Each meaning is at most 25 words and every one is **[FC]**. The mission files' own words ("number highway", "the conductor") are kept in the missions; this glossary is where the two vocabularies meet.

| # | Term | Meaning (<= 25 words) | Words | Show me (card) |
|---|---|---|---|---|
| 1 | Accumulator | ENIAC's adding machine and memory. Each holds one 10-digit number and shows it in neon lamps. ENIAC had 20. [FC] | 19 | 4 |
| 2 | Digit tray (data trunk) | A tray of cables that carries numbers between units. Our missions call it a data trunk, a highway for numbers. [FC] | 20 | 11 |
| 3 | Program tray (program trunk) | A tray of cables that carries "go!" signals, not numbers. Our missions call them program trunks, like 1-1 and 1-3. [FC] | 20 | 12 |
| 4 | Program pulse | One "go!" signal on one wire. It tells a unit to start a job. When the job ends, the unit sends its own pulse. [FC] | 24 | 12 |
| 5 | Program control | The small circuit that waits for a program pulse, does its job once or several times, then sends "done" on its output. [FC] | 22 | 4 |
| 6 | INIT (initiating pulse) | The GO signal. Pressing INIT on the Initiating Unit sends it out on a program tray to start the whole job. [FC] | 21 | 1 |
| 7 | Clock tick (add time) | ENIAC's beat, from the Cycling Unit: about 100,000 a second. One addition takes 20 ticks, about 1/5,000 of a second. [FC] | 20 | 2 |
| 8 | Stepper | A part of the Master Programmer that counts through stages, one at a time. It hands the work from one job to the next. [FC] | 24 | 3 |
| 9 | Constant | A number that does not change while a program runs. It is set on dials in the Constant Transmitter. [FC] | 19 | 9 |
| 10 | Function table | A look-up table of 104 numbers, set with switches. Give it a number and it hands back the matching answer. [FC] | 20 | 7 |
| 11 | Punched card | A stiff paper card with holes. The holes are digits. ENIAC reads cards in, and punches its answers onto cards. [FC] | 20 | 10 |
| 12 | Jack and cable | A jack is a socket. A plug on a cable goes into it. Plugging cables in is how ENIAC was programmed. [FC] | 21 | 12 |
| 13 | Receive and send jacks | An accumulator takes numbers in on alpha to epsilon. It sends its number out on A, or on S, which sends it as a subtraction. [FC] | 25 | 4 |
| 14 | Operation and repeat switches | Each program has two switches: what to do (take in on alpha, send on A) and how many times to do it. [FC] | 22 | 4 |
| 15 | Neon lamp | A small glowing bulb. Each accumulator shows its number with lamps: one lit lamp for each digit. [FC] | 17 | 4 |
| 16 | Transceiver | HOLD: do not show until confirmed. Draft: a part that sends numbers onto a tray, or receives them from it. [FC] | 20 | - |
| 17 | Vacuum tube | A sealed bulb that switches a signal on and off with nothing moving. ENIAC had about 18,000. Like light bulbs, they wore out. [FC E1, E13, E20] | 23 | S16 card 1 |
| 18 | Plug-in unit | A part made to pull out and push back in. A bad one could be swapped fast. Many of ENIAC's tubes sat in plug-in units. [FC E24] | 25 | S16 card 4 |
| 19 | Kilowatt | A thousand watts. ENIAC used about 150 kilowatts, as much as 1,500 bright light bulbs. [FC E6, E7] | 15 | S16 card 2 |

With 19 terms the glossary is three pages of eight (14.11). **Neon lamp** (15) now reads, as built: "A small glowing bulb. Each place in an accumulator has ten lamps, 0 to 9. The lit one shows the digit. The tubes are inside." (25 words; fact-check A8 and E23). The shipped wording of every term is in `src/web/app/explore/content.ts`.

### 15.1 Mission words and real words

| In the missions we say | The real machine's word | Where it is explained |
|---|---|---|
| "Number highway", "Trunk 1", "data trunk" | **Digit tray** (data trunk in Stuart's simulator) | Card 11, glossary 2 |
| "Program trunk 1-3", "a highway for signals" | **Program tray** (program trunk in the simulator) | Card 12, glossary 3 |
| "Go signal", "done signal", "the signal that starts the next job" | **Program pulse** | Glossary 4 |
| "The GO button", "INIT" | **Initiating pulse**, from the Initiating Unit | Card 1, glossary 6 |
| "Adding machine", "memory" | **Accumulator** | Card 4, glossary 1 |
| "Group checker" (Accumulators 1 to 14 in Primes), "fits!" | An accumulator running **program 12** (Stuart's engineering name: "watcher") | Primes copy; not renamed on the card |
| "The conductor" | **Master Programmer** and its **steppers** | Card 3, glossary 8 |
| "Take in on alpha", "send on A", "send twice" | **Receive and send jacks**; **operation and repeat switches** | Glossary 13, 14 |
| "Look-up table", "drag table" | **Function table** (portable table: its switches on a cart) | Cards 7, 8, glossary 10 |
| "Card of numbers" | **Punched card**, read through the Constant Transmitter | Card 9, glossary 11 |
| "Hop" | One pass of the trajectory loop; one punched card | Trajectory copy |
| "The beat", "one addition" | **Clock tick**; one **add time** (20 ticks) | Card 2, glossary 7 |

**Held term, not shown on screen:** *Transceiver.* Nick listed it as vocabulary; the only mention in the pinned simulator is one comment in `mp.go` (a quotation from Huskey's technical memo about the "slow buffer output of a transceiver") [V]. It is not used in any mission. A draft meaning sits in the table above marked HOLD. **It must be confirmed (Q21) before it appears.**

---

## 16. Revision history

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1 | 2026-09-30 | ux-design agent | Initial draft: screens, zoom model, guided help, visual language, Squares script, Primes and Trajectory outlines |
| 0.2 | 2026-10-01 | ux-design agent | Primes (8.2) and Trajectory (8.3) outlines replaced by complete scripts, mapped to `missions/*.yaml`; picker for three missions (8.4); loader and bridge needs, Fact-Checker list and open questions (8.5); flags F8 (resolved), F9, F10; the picker counts in 7.2 |
| 0.3 | 2026-10-01 | ux-design agent | Primes reframed around sharing evenly / equal groups (Nick, 2026-10-01): briefing, plan, steps 1 to 4, S5, run captions, result and both canvases; "watcher" kept only as an engineering nickname in 8.2.1 and 8.2.2 |
| 0.4 | 2026-10-01 | software-developer agent (M2 build), recording Nick's decisions | Trajectory after spike S2 (box at the top of 8.3): READ sends `b c` then `b r`; one INIT; one 34-card flight; frozen on the landing card with `s cy.op 1a`; Full only; S2 timings replace the [A] ones; no units on screen. Primes: the answer is card 100 (547) and S7 stays live to 407 (8.5.1 Q3); Slow stays `rate 100`. Squares Slow is `cy.rate 13` (S4) and "Keep pressing" waits 0.5 s at Slow (8.1.4). Attract caption fixed to the trajectory loop (7.1, 8.5.1 Q6). Zero first card and stopping at landing resolved (8.5.1 Q4, Q8) |
| 0.5 | 2026-10-01 | software-developer agent (M2 follow-ups) | Trajectory readouts freeze on the landing card (8.3.5); a stalled Primes or Trajectory run goes to S10 (8.2.5) |
| 0.6 | 2026-10-02 | ux-design agent, for Nick's 24-inch museum install | New section 14: live attract (trajdemo, Full speed, one flight per core, 60 s loop; 14.2); **Explore ENIAC** panorama of the 40-panel U with pan arrows, minimap strip, 12 unit cards (at most 40 words, [FC]-tagged), mission cross-links both ways, optional swipe (14.3; mockup in `docs/mockups/explore-eniac.html`); glossary S15 and section 15 (with the mission-word to real-word map); finale S8 rebuilt as five beats from this visit's real results (14.5); honor roll S11 in four pages crediting Stuart prominently and the original programmers, Eckert, Mauchly, the Goldstines, the Moore School and the Army BRL (14.6); idle, core-down and reduced-motion for every screen (14.7); [FC] list (14.8); picker row (14.9); Q15 to Q23. Flags F11 to F16. Gestures (9.2) and the 24-inch panel (9.4) updated; 7.1, 7.2, 7.7 and 7.10 point to section 14; the revision history is now section 16. |
| 0.7 | 2026-10-02 | software-developer agent, recording Nick's direction for the honor roll | FR-46 relaxed (PRD 0.5): review status is an internal note, not a render gate; all four S11 pages render (14.1 rule 2, 14.6.2, 14.6.4); only `hold: true` blocks stay off screen. S11 page 3's tab reads "The project team" and the attract slide for the Goldstines "THE PROJECT TEAM" (fact-check B18); honor copy follows `docs/fact-check.md`. |
| 0.8 | 2026-10-02 | software-developer agent, building Nick's tube story (`docs/tubes.md`) | New **14.11 S16 Keeping ENIAC alive**: five cards and a myth card with drawn figures, and "Find the dead tube", a five-step re-enactment with the RE-ENACTMENT plate on every state, three authored faults, the 5.2 ladder, Do it for me and Skip; entries from S14's header, the glossary and (with the finale) F2. 14.7 row for S16; 14.8 rows 20 to 25 (fact-check group E); Q24 to Q27; section 15 rows 17 to 19 and the Neon lamp rewording (three glossary pages). |
