# Edit decision list: Program ENIAC: Our New Touch-Screen Exhibit (v2, Gate 1 decisions applied)

Generated 2026-10-03 by video-script-writer. The machine-readable twin is `storyboard/storyboard-data.json`; keep them in sync.

## How the cut points were found (verified, not guessed)

1. **Line positions.** Every per-line WAV in `assets/audio/source-lines/` was cross-correlated against its source MP4's audio (8 kHz, normalized, energy-floored). All 131 lines located with a match score of 0.995 to 1.000. The times below are measured MP4 times, not the `*-timeline.json` "at" values. Those drift after undocumented cuts:
   - the tour, about 8 s after 289 s;
   - Primes, about 17 s after 133 s;
   - Trajectory, about 17 s after 96 s.
2. **Gaps.** Silence was found with `silencedetect=noise=-40dB:d=0.25` on each MP4. Every audio in and out point below lands inside a detected silence. The gap is shown in brackets.
3. **Visual boundaries.** Title and end card edges, and screen changes, were found with `scdet=threshold=8` plus frame sheets at 0.1 to 0.5 s steps.
4. **Partial WAV trims.** These were found with `silencedetect d=0.12` on the WAV itself.

Timecodes are seconds in the source file. Program times assume straight cuts. Video-only dissolves (0.3 to 0.5 s) may shorten the total by about 2 to 3 s.

**Audio legend:** **(a)** REUSED baked narration from the source video · **(b)** REUSED per-line WAV from `assets/audio/source-lines/` · **(c)** NEW line to voice in Nick 2 (see `new-lines.md`) · **(m)** music only.

---

## Chapter 1: Meet the kiosk (0:00.00 to 0:47.32, 47.3 s)

| Scene | Program | Source file | In | Out | Dur | Audio | Cut-point check |
|---|---|---|---|---|---|---|---|
| S01 Title open | 0:00.00 to 0:04.00 | graphic over photo P1 | n/a | n/a | 4.00 | (m) | n/a |
| S02 Docent intro | 0:04.00 to 0:15.50 | photo P1 (continues) | n/a | n/a | 11.50 (fit to TTS) | (c) **N01** | n/a |
| S03 Attract, live | 0:15.50 to 0:38.97 | `eniac-touch-tour.mp4` | 11.48 | 34.95 | 23.47 | (a) tour-01 (11.53 to 23.24), tour-02 (23.60 to 34.79) | In: gap [10.39 to 11.53]; the title card has finished its crossfade by 11.3. Out: gap [34.54 to 35.21] |
| S04 Touch, the missions | 0:38.97 to 0:47.32 | `eniac-touch-tour.mp4` | 34.95 | 43.30 | 8.35 | (a) tour-03 (35.15 to 37.28), tour-04 (37.84 to 43.32) | Out: gap [43.24 to 45.28]; continuous into S05 |

## Chapter 2: Explore ENIAC (0:47.32 to 1:54.92, 67.6 s)

| Scene | Program | Source | In | Out | Dur | Audio | Cut-point check |
|---|---|---|---|---|---|---|---|
| S05 Walk the room | 0:47.32 to 1:54.92 | `eniac-touch-tour.mp4` | 43.30 | 110.90 | 67.60 | (a) tour-05 to tour-10 (45.19 to 109.80) | Out: gap [109.80 to 112.26], before the glossary opens at 111.76. **Dropped:** tour-11 glossary (112.25 to 116.29) |

## Chapter 3: Keeping ENIAC alive (1:54.92 to 3:20.90, 86.0 s)

| Scene | Program | Source | In | Out | Dur | Audio | Cut-point check |
|---|---|---|---|---|---|---|---|
| S06 Chapter card | 1:54.92 to 1:56.42 | graphic | n/a | n/a | 1.50 | (m) | n/a |
| S07 Tubes and power | 1:56.42 to 2:20.90 | `eniac-touch-tour.mp4` | 118.12 | 142.60 | 24.48 | (a) tour-12 (118.62 to 133.43), tour-13 (134.25 to 142.20) | In: gap [116.29 to 118.65]; the tubes screen appears at 118.08. Out: gap [142.15 to 143.03] |
| *(removed)* | n/a | `eniac-touch-tour.mp4` | 142.60 | 151.50 | -8.90 | tour-14, the Philadelphia myth beat | Cut for time and the myth rule |
| S08 Burnout and the dead-tube hunt | 2:20.90 to 3:20.90 | `eniac-touch-tour.mp4` | 151.50 | 211.50 | 60.00 | (a) tour-15 to tour-24 (152.16 to 211.33) | In: gap [150.77 to 152.23]. Out: gap [211.19 to 214.32], before the screen change at 211.80 |
| S08 cutaway | 2:21.50 to 2:28.50 | photo **P2** (tube change) | n/a | n/a | 7.00 | source audio continues (tour-15) | Covers tour 152.10 to 159.10 |
| *(removed)* | n/a | `eniac-touch-tour.mp4` | 211.50 | 227.30 | -15.80 | tour-25, the Brian L. Stuart honor roll | **Stuart mention #1 (tour), cut** |

## Chapter 4: The first programmers (3:20.90 to 3:40.00, 19.1 s)

| Scene | Program | Source | In | Out | Dur | Audio | Cut-point check |
|---|---|---|---|---|---|---|---|
| S09 Chapter card | 3:20.90 to 3:22.40 | graphic | n/a | n/a | 1.50 | (m) | n/a |
| S10 Honor roll: six first programmers | 3:22.40 to 3:40.00 | `eniac-touch-tour.mp4` | **227.30** | 244.90 | 17.60 | (a) tour-26 (227.32 to 244.83) | In: gap [226.47 to 227.43]. **227.30 is deliberate:** the burned-in caption reads "The honor roll: Brian L. Stuart" until about 227.25 and switches by 227.30 (checked frame by frame). Do not start earlier. Out: gap [244.75 to 247.70]; the screen fades after 245 |
| S10 cutaway | 3:32.30 to 3:40.00 | photo **P3** (two programmers) | n/a | n/a | 7.70 | source audio continues | Covers tour 237.20 to 244.90, after the six names are read |

## Chapter 5: Mission 1, Squares (3:40.00 to 6:09.92, 149.9 s)

| Scene | Program | Source | In | Out | Dur | Audio | Cut-point check |
|---|---|---|---|---|---|---|---|
| S11 Chapter card and bridge | 3:40.00 to 3:42.40 | graphic | n/a | n/a | 2.40 | (b) **`tour-27.wav` 0.00 to 2.21**: "Now it's my turn to program ENIAC." | WAV word gap [2.06 to 2.37]; trim at 2.21. Verify by ear; the fallback is NEW line N-ALT1 |
| S12 Squares mission | 3:42.40 to 6:09.92 | `eniac-touch-walkthrough-squares.mp4` | **15.68** | **163.20** | 147.52 | (a) squares-02 to squares-17 (15.74 to 163.05) | In: gap [14.95 to 15.74]; the picker fades in from 15.62. Out: gap [162.97 to 163.50]; the end card starts at 163.24 |

Trimmed from Squares (intro and outro framing only):
- 0.00 to 15.68: the title card (squares-00, which names Stuart) and squares-01 ("A visitor walks up and touches the screen"). squares-01 repeats tour-03 in S04.
- 163.20 to 171.88: the end card (squares-18 "Warm thanks to Brian L. Stuart", plus the on-screen "Thank you / Simulator: Brian L. Stuart" card).
- Everything between is kept, including the three lamp-play pauses: 93.2 to 106.8, 108.2 to 124.2 and 126.0 to 141.6.

## Chapter 6: Only at the museum (6:09.92 to 6:35.92, 26.0 s)

| Scene | Program | Source | In | Out | Dur | Audio | Cut-point check |
|---|---|---|---|---|---|---|---|
| S13 Teaser: Primes | 6:09.92 to 6:18.42 | `eniac-touch-walkthrough-primes.mp4` | 104.00 | 112.50 | 8.50 | (c) **N02**. **Mute source** (it carries primes-11 baked) | Visual only: the full-speed card pile-up, no Lehmer text on screen. If N02 runs long, extend the out point to 114.0 (the visual is continuous) |
| S14 Teaser: Trajectory | 6:18.42 to 6:26.92 | `eniac-touch-walkthrough-trajectory.mp4` | 130.50 | 139.00 | 8.50 | (c) **N03**. **Mute source** | Visual only: the arc comes down to "Landed" at about 136.7; the screen changes at 139.2. If N03 runs long, move the in point earlier (to 128.0), not the out point |
| S15 Museum invite card | 6:26.92 to 6:35.92 | graphic (freezes: primes at 111.9, trajectory at 138.9) | n/a | n/a | 9.00 | (c) **N04** (primary; alternate **N04_ALT** also voiced) | n/a |

## Chapter 7: The finale (6:35.92 to 7:16.57, 40.6 s)

| Scene | Program | Source | In | Out | Dur | Audio | Cut-point check |
|---|---|---|---|---|---|---|---|
| S16 Chapter card and setup | 6:35.92 to 6:41.92 | graphic | n/a | n/a | 6.00 | (b) **`finale-00.wav`** (full, 5.80 s): "Finish all three missions, and the kiosk ends with a finale. Here's one, from a real visit." | Its video (the title card naming the "people behind ENIAC") is not used |
| S17 You programmed ENIAC | 6:41.92 to 7:04.57 | `finale.mp4` | 6.95 | 29.60 | 22.65 | (a) finale-01 to finale-03 (7.08 to 28.04) | In: gap [5.77 to 7.17]; the title-card ghost has faded by 6.9. Out: gap [27.99 to 31.17] |
| S18 The single Stuart thank-you | 7:04.57 to 7:16.57 | `finale.mp4` | 31.40 | 37.40 (+6.0 s freeze) | 12.00 | (c) **N05**. **Mute source** (it carries finale-04) | The f3 screen runs from 31.20 to 37.48. Freeze the frame at 37.40 (`tpad=stop_mode=clone`) to fit the TTS length |
| *(removed at Gate 1)* | n/a | `finale.mp4` | 37.40 | 54.84 | n/a | finale-05 (f4), finale-06 "thanks for visiting" (was S19), finale-07 (Stuart end-card thanks) and the end card | Finale footage now ends at 37.40, inside the f3 screen (31.20 to 37.48). S18 dissolves straight into S20

## Chapter 8: Come see it (7:16.57 to 7:49.37, 32.8 s)

| Scene | Program | Source | In | Out | Dur | Audio | Cut-point check |
|---|---|---|---|---|---|---|---|
| S20 Close and CTA | 7:16.57 to 7:29.37 | graphic over a blurred freeze of `eniac-touch-tour.mp4` at 30.00 (live attract room) | n/a | n/a | 12.80 | (c) **N06** | n/a |
| S21 End screen | 7:29.37 to 7:49.37 | graphic | n/a | n/a | 20.00 | (m) | n/a |

**Total: 7:49.37 (469.4 s), 20 scenes** (S19 dropped at Gate 1; IDs kept stable).

---

## Audio tally

| Type | Count | Lines |
|---|---|---|
| (a) Reused baked narration | **42** | tour-01 to 10, 12, 13, 15 to 24, 26 (23) · squares-02 to 17 (16) · finale-01, 02, 03 (3) |
| (b) Reused per-line WAV | **2** | tour-27.wav (trimmed 0.00 to 2.21) · finale-00.wav |
| (c) New Nick 2 lines | **6** | N01 to N06, plus alternate N04_ALT (voice it; one of N04/N04_ALT is used) and optional fallback N-ALT1 |

Count check:
- (a) tour: tour-01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26 = **23** lines.
- (a) squares: squares-02 to 17 = **16** lines.
- (a) finale: finale-01, 02, 03 = **3** lines.
- (a) total: 23 + 16 + 3 = **42** reused baked lines.

## Source lines deliberately NOT used, and why

| Line(s) | Why |
|---|---|
| tour-00, squares-00 | Title-card intros with a Stuart mention. Replaced by the N01 docent intro |
| tour-11 | Glossary, cut for time |
| tour-14 | Philadelphia myth beat. Debunks correctly, but cut for time and the myth rule |
| tour-25 | Stuart honor-roll thanks (one of several) |
| tour-27 (rest) to tour-35 | The tour's quick Squares, replaced by the full Squares walkthrough. tour-31 is a duplicate "a day or more" framing |
| tour-36 to tour-42 | The tour's finale, replaced by finale.mp4. It has "And we're back" fast-forward framing and two Stuart thanks (tour-39, tour-42) |
| squares-01 | Repeats tour-03 (the visitor touches the screen) |
| squares-18, attract-06, explore-10, tubes-13, primes-17, trajectory-14, finale-07 | End-card thanks to Stuart |
| finale-04 | Stuart thanks, replaced by the single N05 |
| finale-05 | Repeats the programmers chapter (tour-26) |
| finale-06 | "And finally: thanks for visiting!" Dropped at Gate 1 for runtime (was S19) |
| All of attract.mp4, explore.mp4, tubes.mp4 | Duplicate takes of the attract flight, the Explore pan and the tubes cards. The tour takes are used |
| All Primes and Trajectory narration | Teaser only. Muted footage under the new lines |
