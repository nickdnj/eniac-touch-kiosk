# UX Design Specification: ENIAC Touch Kiosk

**Version:** 0.1
**Last Updated:** 2026-09-30
**Author:** Nick DeMarco with AI assistance (ux-design agent)
**Status:** Draft for review
**PRD Reference:** `docs/PRD.md` v0.1 (sections 4, 5, 12)
**Architecture Reference:** `docs/architecture.md` (being written in parallel; this spec does not define the protocol)

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
| F8 | The exact sieve and trajdemo switch choices in section 8 are **candidates** read from the `.e` headers. They must be confirmed line by line when the mission definition files are written in M2. | M2 |

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
| S1 | Attract | Live ENIAC in the room, "Touch to program ENIAC" | none |
| S2 | Mission picker | Choose 1, 2 or 3; About | 90 s to attract |
| S3 | Mission screen, briefing | Intro card and overview of the units used | 90 s |
| S4 | Mission screen, setup steps | Step card + Workbench + jack windows or switch picker | 90 s |
| S5 | Mission screen, "rest done for you" | Animated batch placement with counts | none (about 6 s) |
| S6 | Mission screen, run | READ (if the mission needs it), INIT, lamps and cards, speed | 3 min |
| S7 | Result | Explanation, tape or cards, takeaway, Next / Try again / Menu | 90 s |
| S8 | Finale | After mission 3: thanks and credits, auto-return | 45 s |
| S9 | Still there? | Overlay | 15 s countdown |
| S10 | ENIAC is resting | Error state (no demo fallback) | none, self-recovers |
| S11 | About / credits | Stuart, sources, VCF | 90 s |
| S12 | Admin PIN pad | Hidden | 30 s |
| S13 | Admin | Health, metrics, actions | 2 min (FR-74) |
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

Two 96x96 arrow buttons at the stage's left and right middle edges step the Workbench to the neighbouring unit. A 200x130 minimap (bottom-left of the stage, y 870 to 1000) shows the room plan with a "You are here" dot. The minimap and the arrows are **never required**; the guide re-frames automatically. Tapping the minimap goes to L0 for 4 s, then returns.

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
|  live caption 24px (bottom-left): "Live: ENIAC adding 97,367 to itself 5,000 times" |
+------------------------------------------------------------------------------------+
| ENIAC simulator by Brian L. Stuart, Drexel University                               |
+------------------------------------------------------------------------------------+
```

- The **whole screen** is the touch target. Any touch goes to S2 and does nothing else (FR-31).
- The picture is the perspective view drawn from live status (FR-30). The caption is taken from the part of trajdemo currently running, so it is always true. If no live run exists, the screen is S10, not a fake.
- No timeout.

### 7.2 S2 Mission picker

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
|  | You wire 7 |      | You wire 4 |        | You wire 4 |                           |
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
- Body: "To get the next square, add the number two times, then add 1. Start with 3 x 3 = 9. Add 3, add 3, add 1. You get 16, which is 4 x 4. ENIAC is great at adding!" (38 words)
- Buttons: **Next step** (there is nothing to tap on the machine), **Skip setup**.
- Tell me more: "This is Brian Stuart's example. Stuart's notes say this is faster than multiplying, because each new square needs only additions. The multiplier is a whole other unit of ENIAC, and this trick does not need it." [FC]

---

**Step 1 of 7 (switch): Dial in the number 1**

- Stage: L2 window of the Constant Transmitter's J dials. The units digit (digit 1) of the J constant glows.
- Headline: **Dial in the number 1**
- Body: "This is the Constant Transmitter. It holds a number that you set with dials. Tap the glowing dial and choose 1." (22 words)
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
- Body: "Numbers travel through cables on a data trunk, like cars on a highway. Tap the OUT jack. Then tap Trunk 1. Now the 1 can travel." (27 words)
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
- Body: "Accumulator 1 will hold the number. Accumulator 2 will hold its square. Plug the A output of Accumulator 1 into the β input (say beta) of Accumulator 2." (29 words)
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
- Body: "When does it begin? The Initiating Unit has the GO button. Its signal travels on a program trunk, a highway for signals. Tap the GO output. Then tap program trunk 1-1." (30 words)
- On correct: "Now the GO button is wired in."
- Hints: other jacks: "That one belongs to another job. We want the initiating pulse output." Wrong trunk: "Try program trunk 1-1."
- Lamps: still 0. The program trunk rail gets a purple pulse dot once.
- Tell me more: "The Initiating Unit is where you press the button that starts the machine. It can also start the card reader and the card punch." [FC]
- Sim item: `p i.io 1-1`.

**Step 7 of 7 (cable): Say what happens next**

- Window 1: Acc 2 program jacks, ring on **6 OUT**. Window 2: Program trunk sockets, ring on **1-3**.
- Headline: **Say what happens next**
- Body: "When Accumulator 2 finishes adding twice, it sends a signal. That signal tells everyone to add 1. Tap the 6-out jack on Accumulator 2. Then tap program trunk 1-3." (30 words)
- On correct: "One job finishing now starts the next job. That is how ENIAC ran a whole program!"
- Hints: 5-out: "That jack is for the later step. We want 6, out." Program trunk 1-2: "Try program trunk 1-3."
- Lamps: still 0.
- Tell me more: "Every job on ENIAC ended with a signal, and that signal started the next job. Chaining those signals together was programming." [FC]
- Sim item: `p a2.6o 1-3`.
- Button at the bottom: **Finish wiring**.

**S5. The rest is done for you**

- Headline: **The rest is done for you**
- Body: "Real ENIAC programmers placed hundreds of cables by hand, and setting up took days. [FC] We will place the last ones now: 8 cables and 10 switches." (28 words)
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

- **Keep pressing for me**: the front end presses INIT, waits until the machine is ready, and presses again, at about 2 squares per second in Full, about 1 per 3 s in Slow. Stops at x = 12 (144). (FR-17 adapted to F1.)
- **Show me what happened** (primary, 96 h): goes to S7.
- Speed control and "Skip to the answer" (auto-presses to x = 12 at unthrottled speed, then S7).
- Hint: "Want it faster? Try Full."

"CLEAR" sets both to 0, and INIT then restarts the table.

**Result (S7) copy**

- Headline: **You made a table of squares!**
- Body: "Each new square is the old square, plus the number twice, plus 1. Like 9 + 3 + 3 + 1 = 16. ENIAC did it by adding, and you wired it." (31 words)
- Takeaway strip: **The cables were the program.** Sub-line: "To make ENIAC do something new, people plugged in different cables."
- Left: the notebook tape from the real lamps (for example `1 x 1 = 1` up to `12 x 12 = 144`).
- Tell me more: "One addition took ENIAC 1/5,000 of a second. [FC] We slowed things down so you could see the steps. Brian Stuart's simulator follows the real machine pulse by pulse." 
- Buttons: **Next: Primes**, Try again, Menu.

### 8.2 Primes (Mission 2): outline

**Source:** `programs/sieve.e`: Lehmer's July 1946 runs, reconstructed by De Mol and Bullynck [FC]. 268 cables and 286 switches. Start with INIT. It punches a card for each prime from 3 to 2801, which I computed as **407 primes** (to be confirmed on a real run in M2). Length: about 3 to 4 minutes (FR-10).

**Narrative beats**

1. **Hook:** "A prime has no divisors but 1 and itself: 7 is prime, 9 is not. ENIAC hunted for primes in 1946. [FC] You will set it searching."
2. **The idea (Step 0, animation):** "ENIAC tests each odd number. Fourteen accumulators each watch one small prime. If any of them says 'I divide it evenly', the number is out." This is a trial-division sieve; the wording is to be aligned with De Mol and Bullynck via the Fact-Checker.
3. **Hands-on (4 steps).** Candidates from `sieve.e`, to be confirmed (F8):
   1. **Dial K constant to 2** (`s c.k1 2`): "Move up by 2 each time, so we only test odd numbers."
   2. **Cable `1-9` to the initiating unit's punch input** (`p 1-9 i.pi`): "If a number is prime, punch a card." This is the program trunk carrying the master programmer's "it's prime" result.
   3. **Punch switch to P** (`s pr.13 P`; `pr.14` is preset): "Choose what goes on the card: the prime."
   4. **Cable initiating unit's punch-done output to trunk 1-4** (`p i.po 1-4`): "When the card is punched, try the next number." This is the loop.
4. **Rest is done for you:** 266 more cables and 284 more switches, a fast animation with running counters.
5. **Run:** **INIT** only (no READ). The card pane fills with punched cards as primes are found: running count ("Cards: 37"), latest prime big ("Latest: 163"), and a progress bar toward 2801. Speed: Slow / Full / Skip to the answer (FR-18).
6. **Result:** "ENIAC found all 407 primes from 3 to 2801." The last 20 cards are shown. Takeaway: "The same machine, different cables, a totally different job." Next: The 1946 Trajectory.

### 8.3 Trajectory (Mission 3): outline

**Source:** `programs/trajdemo.e`, "an attempt to recreate the demo at the unveiling of the ENIAC on Feb 15, 1946", using Heun's method on an artillery trajectory. 297 cables, 443 switches. The constants come from `demo.card` (`0000097367000001397500000981750010000000-00000321700143200000005932000`), loaded by READ. Each part starts with an INIT. Length: 4 to 6 minutes (FR-10, FR-19).

**Narrative beats**

1. **Hook:** "ENIAC was built to work out firing tables for Army guns. On February 15, 1946, it was shown to the public. [FC] You will rerun the demo."
2. **Hands-on (3 steps + READ).** Candidates, to be confirmed (F8):
   1. **READ:** press READ (96 h). The constants card slides into the reader, its digits visible on the card, and the first constant lights Acc 1 (97367). Caption: "The card holds the numbers for the demo."
   2. **Cable initiating unit to program trunk 1-1** (`p i.io 1-1`; then `1-1 p.Ai` is preset): "Now the GO button is wired to the Master Programmer, ENIAC's conductor."
   3. **Master Programmer stepper dial** (the "count of 1000 x 5 adds = 5,000"; `p.cC`, `p.d*` dials): "Dial in how many times to repeat. 1000 counts, 5 adds each, is 5,000 additions."
   4. **Printer/punch switch to P** (`s pr.N P`): "Choose what gets punched for the table part."
3. **Rest is done for you:** roughly 295 cables and 440 switches.
4. **Run, part by part (FR-19).** Each part is its own INIT with a one-line live caption (from the `.e` comments):
   1. "Adding 97,367 to itself 5,000 times." (The result, 486,835,000 [FC], shows on the lamps.) Fast-forward allowed.
   2. "The same again, with a 100 Hz clock."
   3. "Multiplying 13,975 by itself, 500 times." (multiplier demo)
   4. "A table of squares and cubes, printed on cards."
   5. "Sine and cosine of 100 angles."
   6. "The artillery trajectory."
   A **Skip to the trajectory** button jumps past parts 1 to 5 (R4 fallback: unthrottled plus a condensed caption).
5. **Result:** the trajectory's card output. "This took ENIAC about 30 seconds. By hand, it took a person days." [FC, carefully, to be checked with the Fact-Checker; the statement is commonly made about the trajectory demo.] Takeaway: "Then, in 1946, this was amazing. Now, your phone does it in a blink." Final button: **Finish**.

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

No gestures are required or recognised. Swipe-back, pull-to-refresh, pinch-zoom, context menu, text selection and link navigation are disabled. There is no on-screen keyboard; the only numeric entry is the PIN pad (UX-05, UX-06).

### 9.3 Debounce

INIT, READ and step buttons ignore a second tap within 400 ms and while their action is running (UX-07). INIT is re-armed only when the machine reports it is idle.

### 9.4 Responsive behaviour (UX-11)

The design is authored for **1920 x 1080 landscape** and scaled as one unit (letterboxed) for other 16:9 panels. Minimum sizes are preserved by scaling up only: on a smaller panel the target minimums hold in physical size, so the guide rail narrows first and the stage is reduced to three panels. A portrait orientation is **out of scope** (Q2).

### 9.5 Photosensitivity and motion

Lamp states are smoothed (80 ms decay) so no element flashes more than 3 times per second in a region larger than about 10% of the screen (WCAG 2.3.1). Full speed cannot strobe the screen. A "Reduce motion" setting is set on the box by staff; it replaces zooms with cross-fades.

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

---

## 13. Open questions

- [ ] **F1:** does `sq.e` really stop after one square per INIT? (M1 spike.)
- [ ] Does the architecture let the front end tell "INIT finished" and read Acc 1 and Acc 2 live (F2)?
- [ ] Which `sieve.e` and `trajdemo.e` items are the hands-on steps (F8), and what exactly do `pr.13` and the master-programmer dials control?
- [ ] Fact-Checker review of every [FC] line; Doug's approval of the About wording (Q10 on crediting the ENIAC programmers).
- [ ] Mounting height and whether the production screen matches 1920x1080 (Q2).
- [ ] Should the attract view show trajdemo (the current exhibit) or rotate missions? This spec assumes trajdemo parts, with a true live caption.
- [ ] Usability test plan (NFR-09): include one gloved tester and one child aged 8 to 12 on the Squares flow; watch where they pause at the jack windows.

## 14. Revision history

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1 | 2026-09-30 | ux-design agent | Initial draft: screens, zoom model, guided help, visual language, Squares script, Primes and Trajectory outlines |
