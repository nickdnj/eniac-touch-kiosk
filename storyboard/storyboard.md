# Storyboard: ENIAC Plays Battleship (recut v3.1, after draft 1)

**Date:** 2026-10-23. **Status:** recut v3 after Nick watched `output/battleship-main-draft1.mp4` (ran 3:17). Narration rewritten for accuracy (simulation, not the 1946 machine), re-aim flow and time; **see "Editor notes for the recut" at the end**. **v3.1 (Nick, 2026-10-23): the programmers segment is cut** (VO05, scene S6, the P3 photo and the R6 honor roll). The museum covers it on site; this video is about the game. This overrides "people before hardware" for this video only. Scene and line ids are kept (S6 and VO05 marked CUT); chapters renumber from 6 to 5. Draft only: nothing re-voiced, re-rendered or committed.
**Main video:** **2:55 (175 s) scene plan** (target 2:50 to 3:00), 5 chapters, 18 scenes (S6 cut), 15 narration lines (353 words, about 123 s of voice). 1920x1080, 30 fps.
**Finale (default):** Option 1, "Outranged". See "The finale" below.
**Cuts:** 30 s and 8 s, both vertical 9:16; a vertical short of about 45 s.
**Companions:** `storyboard/script.md` (narration, word counts) · `storyboard/storyboard-data.json` (machine-readable, same timings) · `storyboard/recording-plan.md` (shots, exact target/shot pairs, the Playwright spec still to write) · `storyboard/music-plan.md` (tracks, licences, downloads awaiting approval) · `research/fact-check.md`.

## Rules that apply to every scene

- **Footage:** real 1920x1080 kiosk screen recordings from `gunnery-game` @ `56274b7` (includes the accumulator-lamp fix `52105ee`), `CLEAN=1`, no burned-in caption boxes. Never flip footage. Keep the kiosk footer credit visible in 16:9 shots.
- **Overlays:** FFmpeg only, animated in. Never baked into images.
- **Images:** public-domain period photos only (P1, P2, P4; P3 dropped in v3.1). No AI images at all in this video; never AI images of ENIAC.
- **Kiosk copy K1 to K4** (fact-check §3) has gone to the kiosk team to fix. The scene notes keep a cut-around fallback in case a fix is not in the build we record.
- **Trademark:** no Hasbro catchphrase, logo, box art, commercial footage or audio anywhere (picture, voice, captions, title, tags, thumbnail).
- **Numbers on screen:** only what the kiosk shows, plus the measured values in `research/fact-check.md` §5.

## Period photos

| Id | Picture | File / source | Credit line | Notes |
|---|---|---|---|---|
| P1 | Glen Beck and Betty Snyder at ENIAC | Reuse `~/Workspaces/eniac-kiosk-youtube/assets/images/photos/P1-beck-snyder-eniac.jpg`; Commons "Glen_Beck_and_Betty_Snyder_program_the_ENIAC_in_building_328..." | U.S. Army Photo | Aberdeen, about 1947 to 1955. Never caption it 1946. 1340x1024: soft on a push-in; v3 holds it static. |
| P2 | Changing a tube | Reuse `P2-changing-a-tube-clean.jpg`; Commons "ENIAC-changing_a_tube.jpg" | U.S. Army Photo | Use the clean crop only (the original has a baked "19,000" caption). |
| P3 | Betty Jean Jennings and Frances Bilas operating ENIAC | Reuse `P3-two-women-operating-eniac.jpg`; Commons "Two_women_operating_ENIAC_(full_resolution).jpg" | U.S. Army Photo | **Not used (v3.1: the programmers segment is cut).** |
| P4 | Firing-table page, TM 6-215 Table A (75-mm gun) | New download: https://archive.org/details/1941TM6-215, PDF p. 27 | War Department, TM 6-215 (1941) · Internet Archive | Public Domain Mark 1.0. Crop the "Digitized by Google" margin. It is a 1941 hand-made table, not ENIAC output; the VO does not say otherwise. |

All public domain (US federal work), checked 2026-10-03 for P1 to P3 (`credits.md` in the first project). Copy them into `assets/images/photos/` here at the visuals phase.

---

# Chapter 1: The hook (0:00 to 0:13)
> Straight into the game. A shell, a SUNK! stamp, then the twist: the shots are worked out the 1946 way, by ENIAC. Well, by a faithful simulation of it.

## Scene 1: Title screen, SUNK! (0:00 to 0:04, 4 s)
- **Clip:** R1, Battleship title screen loop. Pick the in-point so the SUNK! stamp lands at 3.0 s (the stamp shows from 82 % to 96 % of the 3.6 s loop).
- **Narration:** none
- **Overlay:** none
- **Motion:** static
- **Music:** M1 swing opener, brass hit on the stamp
- **Transition out:** hard cut on the downbeat

## Scene 2: But the computer... (0:04 to 0:13, 9 s)
- **Clip:** R1 loop continues, then R2 plan screen (ship + gun + angle cards)
- **Narration:** VO01 (24 words): now discloses the simulation in the hook itself
- **Overlay:** title "ENIAC PLAYS BATTLESHIP", 0:04.5 to 0:09, animated in, clear of the kiosk banner (locked title; fact-check O1 note)
- **Motion:** static
- **Music:** M1, ducked
- **Transition out:** hard cut

# Chapter 2: What ENIAC is (0:13 to 0:40)
> The machine, why it was built, and why aiming a gun is the right game for it.

## Scene 3: Meet ENIAC (0:13 to 0:20, 7 s)
- **Photo:** P1
- **Narration:** VO02 (17 words)
- **Overlay:** lower third "Nick DeMarco · Docent, Vintage Computer Federation" (0:13.5 to 0:18); credit "U.S. Army Photo" bottom-right
- **Motion:** static (v2 had ken-burns-zoom; removed, see editor notes Z1)
- **Music:** M2 naval-swing bed, ducked
- **Transition out:** crossfade 0.5 s

## Scene 4: Why it was built (0:20 to 0:31, 11 s)
- **Photo:** P4 (0:20 to 0:26), then P2 (0:26 to 0:31)
- **Narration:** VO03 (30 words)
- **Overlay:** P4 credit; date card "Shown to the public · February 15, 1946" from 0:26.5; P2 credit "U.S. Army Photo"
- **Motion:** slow pan down one column (P4, kept: it reads the table, it is not a zoom; editor notes Z2); P2 static (v2 had ken-burns-zoom; removed, Z3)
- **Music:** M2, ducked
- **Transition out:** crossfade 0.5 s

## Scene 5: The most ENIAC thing (0:31 to 0:40, 9 s)
- **Clip:** R2 briefing "Battle stations", then the plan screen. Do not tap "more".
- **Narration:** VO04 (27 words): repeats the simulation disclosure, pulse by pulse
- **Overlay:** none
- **Motion:** static
- **Music:** M2, ducked
- **Transition out:** hard cut

# (Chapter 3, The people: CUT in v3.1)

## Scene 6: The first programmers: CUT
- Cut by Nick, 2026-10-23: VO05, the P3 photo with its caption, and the R6 honor-roll clip. The museum covers this on site.
- **Flow:** S5 (VO04, ending on the kiosk) cuts straight to S7 (VO06, "Here's the game."). Both are R2 footage, plan screen to aim screen, so the cut is a hard cut within the same recording. No bridge line is needed. VO03's firing tables still set up VO04's "the most ENIAC thing you can do" directly; nothing came between them before either.
- S5's transition out stays a hard cut; M2 runs into M3 at 0:40.

# The finale: two options, ranked

Nick's ask: the most dramatic finale possible, using only true, measured things. A miss, then a second shot that sinks **the same destroyer**. Every number below is from the Battleship table in `research/kiosk-gunnery-battleship-mission.md` (ground crossings, measured on the real core through the kiosk bridge).

### Option 1 (default): "Outranged"

- **Target:** t4, "Enemy destroyer: 10,950 feet away" (hit radius 200 ft).
- **Shot A, the miss:** **Destroyer · Quick gun 750 ft/s · 20°** → lands at **10,435 ft**, **515 ft short**, **16 hops** (about a minute at the recorded 3.7 s per hop; shown condensed). Table row "Quick 750", column 20°.
- **Shot B, the sink:** **Cruiser · Long gun 1,050 ft/s · 10°** → lands at **10,954 ft**, 4 ft long, inside the 200 ft radius: **Direct hit! Ship sunk!**, **12 hops**. Table row "Long 1,050", column 10°.
- **Why it is the most dramatic:**
  1. It is the closest miss available against this destroyer (515 ft, against 744 for Option 2).
  2. The shell falls **short**, splashing in front of the enemy, which reads at a glance.
  3. The miss is the destroyer's **longest possible shot**: its fastest gun at the steepest angle. Light 600 at 20° reaches only 6,844 ft, and Quick 750 at 20° 10,435 ft. Both fall below 10,950, so no destroyer shot can sink this target. The re-aim is therefore forced, and it is an escalation ("I need a bigger ship").
  4. Flight A is the longest and highest destroyer flight (16 hops). (v2 planned to show it uncut in real time. The recording runs about 3.7 s per hop, so the full flight is about a minute; v3 condenses it with jump cuts and drops the "Real time" tag.)
- **How v3 tells it (the cause-and-effect chain):** short by 515 ft (VO11) → why: that was the destroyer's fastest gun at the steepest angle; it can't reach (VO11) → firing again won't help, because the same shot lands in the same place (VO12) → so more speed: a bigger ship (VO12) → the cruiser, its long gun; with that speed, aim lower: 10° (VO13, on the taps) → sunk, four feet off (VO14). Every number is from the table: 10,435 vs 10,950; 1,050 ft/s at 20° would land at 19,472 ft and at 15° at 15,550 ft, so the lower angle is what makes the hit.
- **Expected on screen (from the kiosk's scoring rule; confirm at recording):** A scores 934, "Sharpshooter", "515 ft short". B scores 1,000, "Ship sunk!".

### Option 2: "Overshoot, same ship"

- Same target t4. **Shot A:** **Cruiser · Medium 900 · 15°** → **11,694 ft**, **744 ft long**, 15 hops (row "Medium 900", column 15°). **Shot B:** the same cruiser, **Long 1,050 · 10°** → 10,954 ft, sunk.
- Strength: one ship throughout, so the re-aim is a pure gun-and-angle correction. Weaker than Option 1: a bigger miss, an overshoot (harder to read than a short splash), and no forced escalation. The expected score is 887.

### Considered, not chosen

- t3 "Enemy destroyer" at 8,200 ft. **Battleship · Big 1,300 · 5°** → 8,604 ft, 404 ft long, but only 7 hops on a flat arc (row "Big 1,300", column 5°), then Cruiser · Medium 900 · 10° → 8,170 ft (sunk). It is the closest destroyer miss in the table, but the flight is short and low, so it is less cinematic, and a battleship sinking a patrol-sized target undercuts the escalation.

### Edit rhythm, sound and overlays for the default finale (v3.1 timings)

| Time | Beat | Picture | Sound | Overlay | Voice |
|---|---|---|---|---|---|
| 1:15 to 1:30.5 | Flight A climbs | Full plot; head of the flight, then plot jump cuts through the middle hops | Swing bed thins to snare and bass | three callouts timed to VO10 | VO10 |
| 1:30.5 to 1:38 | The shell comes down | Full plot, **last 2 hops uncut** | **Music out.** One low drum on the second-to-last card; **no drum on the last card**, so the final hop (about 3.7 s) falls in silence | none | VO10 must clear before the second-to-last card |
| about 1:37.7 | Landing | Landing pulse short of the enemy | **Splash** SFX (water, no explosion) | none | none |
| 1:38 to 1:39.5 | Reveal | Hold the splash about 1.2 s, then **jump-cut over the kiosk's wait** to the result: "515 ft short", points, rank | the trombone "missed" figure on the reveal | "515 FT SHORT" echo, 0.6 s after the kiosk shows it | none |
| 1:40.5 to 1:48 | Why it missed | Result hold | Bed returns, low | none | VO11 |
| 1:48 to 2:00 | Deliberate re-aim | Fire again; **no freeze** on the aim screen; slow taps Cruiser → Long gun → 10°, each on a beat; the gun tips **down** | Sparse bed; a rising snare under VO13 | none | VO12 over Fire again and the aim screen; VO13 in three phrases on the taps |
| 2:00 to 2:03 | Load, READ, init | Four quick cuts | Snare roll starts on INIT | none | none |
| 2:03 to 2:09.5 | Flight B | Head of the flight, then 2 full-frame jump cuts on the plot (no punch-ins; editor notes Z5, Z6) | Tension cue (Private Eye build; music-plan.md), cut on bar lines | none | none |
| 2:09.5 to 2:21 | The shell comes down | Full plot, **last 3 hops uncut** (restored in v3.1) | **Music out.** A low drum on the 3rd- and 2nd-to-last cards; **no drum on the last card**, so the final hop (about 3.7 s) is silence before the impact | none | none |
| 2:21 | Impact | Landing on the enemy, "Direct hit! Ship sunk!", starburst | **Impact** SFX (deep boom and water) + the brass sting (Hot Swing's final chord) | SUNK! stamp: the kiosk's own if drawn; otherwise ours, 3 frames after "Ship sunk!" | none |
| 2:22 to 2:28 | Rank, then quiet | Hold on the rank "Ship sunk!" and 1,000 points | Sting rings out fully, then **1.5 s of quiet** (room tone only) | none | none |
| 2:28 to 2:33 | Payoff, then the board | Result hold, then name YOU NEXT, Today board | Bed tag, ducked | none | VO14 ("Four feet off. Sunk." then the board) |

**Why the silence comes from dropping a drum.** In the draft-1 recordings the last card and the landing are only about 0.15 s apart (flight B; about 0.1 s for flight A), so "a drum on each card, then 0.7 s of silence" cannot happen without freezing the picture. Freezing or stretching a flight is not allowed. Leaving the last card undrummed gives a real silence of one whole hop, about 3.7 s, with the picture untouched.

**Honesty notes.** Neither flight carries a "Real time" tag in v3: both are condensed by jump cuts, and only their tails are uncut (flight A the last 2 hops, flight B the last 3). Nothing is ever sped up. If a "Real time" tag is wanted, put it only on the uncut tail. The lamp cutaways come from R4, a separate take of the same shot; the shot is deterministic and both takes must land at 10,954 ft. Every distance on screen is the kiosk's own figure.

---

# Chapter 3: You play (0:40 to 1:48)
> One full round. The machine explained through the game, one idea per beat. It ends in the near miss.

## Scene 7: Pick a ship (0:40 to 0:49.5, 9.5 s)
- **Clip:** R2 aim screen, round A: target t4; taps Destroyer, Quick gun, 20°
- **Narration:** VO06 (25 words)
- **Music:** M3 game bed, ducked · **Out:** hard cut

## Scene 8: Two numbers (0:49.5 to 0:58.5, 9 s)
- **Clip:** R2 "Your shot, set on the dials"; Load the guns; tour stop 7, Constant Transmitter (used out of tour order)
- **Narration:** VO07 (24 words): the game-vs-history line, and "the simulated machine does the rest"
- **Overlay:** callout "Constant Transmitter" · **Music:** M3, ducked · **Out:** hard cut

## Scene 9: The room walk (0:58.5 to 1:08, 9.5 s)
- **Clip:** R2 build intro; tour stops 2 (Master Programmer) and 6 (Accumulators 15 to 20). Stop 1 (Initiating Unit) can be used once K1 is fixed.
- **Narration:** VO08 (27 words)
- **Overlay:** callouts "Master Programmer", "Accumulators" · **Music:** M3, ducked · **Out:** quick cuts

## Scene 10: READ, init (1:08 to 1:15, 7 s)
- **Clip:** R2 READ, card read (Accumulator 1 = 97,367), INIT. Fallback if K2 is not fixed: cut in after the "GO button" sub-line leaves the frame.
- **Narration:** VO09 (18 words) · **Music:** M3, tick on INIT · **Out:** hard cut

## Scene 11: Flight A (1:15 to 1:38, 23 s)
- **Clip:** R2 flight A, condensed by jump cuts on the full plot (no crops, no punch-ins); last 2 hops uncut. No "Real time" tag.
- **Narration:** VO10 (43 words), must finish before the second-to-last card; the last hop is silent
- **Overlay, sound:** as in the finale table

## Scene 12: Splash, 515 short (1:38 to 1:48, 10 s)
- **Clip:** R2 result A; hold the splash about 1.2 s, then jump-cut to the result
- **Narration:** VO11 (19 words), about 1.0 s after the result appears
- **Overlay, sound:** as in the finale table

# Chapter 4: The re-aim (1:48 to 2:33)
> Same destroyer. Why the first shot fell short, what changes (more speed, so a bigger ship and a lower angle), and the sink.

## Scene 13: More speed (1:48 to 2:00, 12 s)
- **Clip:** R2 Fire again; aim screen (no freeze-frame hold); slow taps Cruiser, Long gun, 10°; end on the dials
- **Narration:** VO12 (20 words) over Fire again and the aim screen, then VO13 (13 words) in three phrases on the three taps, "ten degrees" on the 10° tap

## Scene 14: READ, init again (2:00 to 2:03, 3 s)
- **Clip:** R2 Load the guns, Skip to the guns, READ, INIT; no voice

## Scene 15: Flight B (2:03 to 2:21, 18 s)
- **Clip:** R2 flight B (plot), optionally one full-frame R4 shot of the same flight; head plus 2 jump cuts (about 6.5 s), then the **last 3 hops uncut** (about 11.5 s); last hop silent; no voice

## Scene 16: Ship sunk! (2:21 to 2:28, 7 s)
- **Clip:** R2 result B; hold; no voice. Impact, sting, stamp, then quiet, as in the finale table.

## Scene 17: Your name on the board (2:28 to 2:33, 5 s)
- **Clip:** R2 result hold, then Save my score, the keyboard types **YOU NEXT**, the Today board (scores cleared first)
- **Narration:** VO14 (12 words): "Four feet off. Sunk." pays off "five hundred and fifteen feet short"

# Chapter 5: Come play (2:33 to 2:55)

## Scene 18: Thank you, Brian (2:33 to 2:42, 9 s)
- **Clip:** R1 title loop, kiosk footer credit visible
- **Narration:** VO15 (24 words), the only thank-you
- **Overlay:** "Simulator: Brian L. Stuart, Drexel University · cs.drexel.edu/~bls96/eniac". The description links his simulator page and `github.com/blstuart/eniac-simulator`, never the private kiosk repo.
- **Music:** M6 closer begins, ducked · **Out:** crossfade 0.5 s

## Scene 19: End card (2:42 to 2:55, 13 s)
- **Clip:** R1 title loop, darkened
- **Narration:** VO16 (30 words)
- **Overlay:** builds line by line: "Play it at our ENIAC exhibit" / "Vintage Computer Federation" / "InfoAge Science and History Museums" / "2201 Marconi Rd, Wall NJ" / "Wed, Sat & Sun · 12 to 5". (v2's first line, "Come play ENIAC Battleship", read as "play ENIAC"; fact-check O9.) Each line holds about 1.5 s after it builds; the last 3 to 4 s are clean for the YouTube end screen.
- **Music:** M6 button ending · **Out:** fade to black 0.5 s

---

## Asset summary

| Type | Count | Items |
|---|---|---|
| Kiosk recordings (new) | 4 (+1 optional) | R1 title loop; R2 full session (rounds A and B, name, board); R3 a repeat of round A (verification only); R4 a repeat of round B with the lamp/room view; R5 optional |
| Kiosk recordings (reuse or re-record) | 0 | R6 honor roll **no longer needed** (v3.1) |
| Public-domain photos | 3 | P1, P2 (reuse), P4 (download); P3 dropped (v3.1) |
| AI-generated images | 0 | none |
| Overlays | about 20 items | FFmpeg drawtext, listed per scene |
| Narration | 15 lines | Nick 2; per-scene WAVs + one review MP3. v3.1: re-voice 11 lines (VO01, 03, 07, 08, 10 to 16); keep VO02, 04, 06, 09; VO05 cut |
| Music | 3 tracks (default) | Hot Swing, Private Eye, Bumbly March (Kevin MacLeod, CC BY 4.0); **download awaiting Nick's approval** (music-plan.md §4) |
| SFX | 4 | synthesised drum and tap; CC0 splash and impact from Freesound (to be listed for approval) |

## Music cue sheet

| Cue | Time | What |
|---|---|---|
| M1 | 0:00 to 0:13 | Hot Swing opener; brass hit on the SUNK! stamp at 0:03 |
| M2 | 0:13 to 0:40 | Hot Swing bed, ducked |
| M3 | 0:40 to 1:30.5 | Brighter game bed; thins under VO10 |
| (silence) | 1:30.5 to 1:38 | One drum on the second-to-last card; the last hop is silent; splash |
| M4 | about 1:39 | Trombone "missed" figure (Bumbly March audition, or Hot Swing's trombone) |
| M3' | 1:40 to 2:03 | Bed returns low; rising snare under VO13 |
| M7 | 2:03 to 2:09.5 | Private Eye build (tension) |
| (silence) | 2:09.5 to 2:21 | Drums on the 3rd- and 2nd-to-last cards; the last hop (about 3.7 s) is silent |
| M5 | 2:21 | Impact SFX + Hot Swing final chord, rung out, then 1.5 s of quiet |
| M6 | 2:28 to 2:55 | Hot Swing closer, button ending |

---

## Cut plans

**Formats: the 30 s and 8 s cuts are vertical 9:16, as is the short.** Reasons:
1. All three are for Shorts, Reels and TikTok, where 9:16 is native; a 16:9 clip shows small and letterboxed there.
2. The first ENIAC project's 30 s and 8 s cuts were vertical, and Jeff asked for them for social use.
3. The only 16:9 home would be ads or embeds, and none are planned.

The one real cost is that the arc plot is wide. Pre-crop every source region to 9:16 **before** zoompan, and use the first project's stacked-panel layout (aim card or result on top, arc below; `notes/short-assembly-v2-2026-10-12.md`, `scripts/shorts-panels`). The vertical crops cannot show the kiosk footer credit, so each Short's description carries the Stuart credit and links. Each cut gets its own ENIAC / init listening reel at Gate 2.

### 30 s (9:16)

| Time | Picture | Voice | Overlay |
|---|---|---|---|
| 0:00 to 0:05 | R1 SUNK! stamp, running into the round B picks | "ENIAC is from nineteen forty-six. This game runs on a faithful simulation of it. Let's sink a ship." (v2: "This is ENIAC, from nineteen forty-six", said over kiosk footage, which is the simulation, not ENIAC) | "ENIAC PLAYS BATTLESHIP" |
| 0:05 to 0:08 | R2 round B picks: Cruiser, Long gun, 10° | none | none (screen names the target) |
| 0:08 to 0:20 | R2 flight B, condensed by cuts on the full plot; last 2 hops uncut | "Every second of flight is fifty tiny steps of arithmetic, and one punched card. Each card is one dot." (v2: "ENIAC does fifty steps") | none |
| 0:20 to 0:24 | Impact, "Ship sunk!" | none (impact + sting) | SUNK! stamp |
| 0:24 to 0:30 | End card over the darkened title | "Play it at the Vintage Computer Federation, Info Age, Wall, New Jersey." | VCF · InfoAge · 2201 Marconi Rd, Wall NJ · Wed, Sat & Sun 12 to 5 |

### 8 s (9:16)

| Time | Picture | Voice | Overlay |
|---|---|---|---|
| 0:00 to 0:05 | R2 flight B last hops, impact, "Ship sunk!" | "Sink a ship on a simulated ENIAC. The real one's from nineteen forty-six." (v2: "Sink a ship with ENIAC, from nineteen forty-six") | none |
| 0:05 to 0:08 | End card | none | VCF museum · InfoAge, Wall NJ · Wed, Sat & Sun 12 to 5 |

### Vertical short (about 44 s, 9:16): the finale in miniature

| Time | Picture | Voice | Overlay |
|---|---|---|---|
| 0:00 to 0:08 | R1 SUNK! stamp, into the plan screen | VO01 (v3, with "Well, by a faithful simulation of it") | "ENIAC PLAYS BATTLESHIP" |
| 0:08 to 0:13 | R2 round A picks and dials | VO07, first two sentences | none |
| 0:13 to 0:24 | Flight A condensed; last 2 hops uncut; splash; "515 ft short" | "The punch makes one card: one dot." + "Short. Five hundred and fifteen feet short." | "515 FT SHORT" echo |
| 0:24 to 0:33 | Re-aim, flight B last hops, impact, "Ship sunk!", 1 s of quiet | "So I need more speed: a bigger ship." + VO13 | SUNK! stamp |
| 0:33 to 0:44 | End card | VO16 (v3) | VCF · InfoAge · address · hours |

(v3.1: the short's programmers beat, the P3 photo with "ENIAC's first programmers were six women" and the R6 honor roll, is cut. The short is now about 44 s.)

---

## Gate 1: what is settled, and what is still open

Settled 2026-10-23 (Nick, via the coordinator):
- **Q1 kiosk copy:** K1 to K4 went to the kiosk team. The cut-around fallback stays in the recording plan.
- **Q2 finale:** a miss, then a sink of the same destroyer, made as dramatic as possible. Default is **Option 1, "Outranged"**; Option 2 is the alternate.
- **Q3 formats:** 30 s and 8 s vertical 9:16; a vertical short of about 45 s.
- **Q4 board:** clear the test scores first. The name is **YOU NEXT**: "Try it here!" is 12 characters, and the keyboard takes at most 8 (letters, spaces).
- **Q5 music:** Nick does no library work. The shortlist is in `music-plan.md`; the downloads need his yes.
- **Q6 determinism:** the softer line, "In this game, the same shot lands in the same place every time."
- **Q8 (v3.1):** cut the programmers segment (VO05, S6, P3, R6) and the names everywhere in this video's picture, voice, cuts and metadata. The museum covers it on site. This overrides "people before hardware" for this video only.
- **Q7:** answered for drafting (the install date still blocks publishing only). Stuart's review is not a gate: Nick has his verbal approval.

Still open:
1. Option 1 or Option 2 for the finale (default Option 1)?
2. Approve the music downloads: the default three files, 7.6 MB, listed in `music-plan.md` §4.
3. Does the kiosk result screen draw its own SUNK! stamp? Check at recording. If it doesn't, is our overlay stamp OK?

---

## Editor notes for the recut (v3, after draft 1)

Draft 1 (`output/battleship-main-draft1.mp4`) ran **3:17.5**. Its scene times below come from `output/work/timeline.json`. Time codes for the zooms come from `scripts/assemble.py` and the timeline anchors; they are approximate and have not been frame-checked.

### 1. Zooms and push-ins: remove them all

Nick finds the zoom-in distracting. These are all the zooms, push-ins and punch-ins in the v2 storyboard and the draft-1 assembly:

| # | Where (draft 1, approx.) | What | Code | v3 recommendation |
|---|---|---|---|---|
| Z1 | S3, P1 Beck and Snyder, 0:12.0 to 0:19.2 | Ken Burns push-in, 1.00 to 1.08 (storyboard: "slow push-in") | `assemble_lib.seg_photo`, default `motion="zoom"`, `zoom_end=1.08` | **Static hold** (`zoom_end=1.0`). P1 is soft at 1340x1024 anyway. |
| Z2 | S4, P4 firing-table page, 0:19.2 to 0:25.2 | Vertical pan down the page (a crop scroll, not a zoom) | `seg_photo(..., motion="pan-down")` | Keep. It reads the table; it does not zoom. Make it static if Nick wants no motion at all. |
| Z3 | S4, P2 changing a tube, 0:25.2 to 0:31.2 | Ken Burns push-in, 1.00 to 1.08 | `seg_photo` default | **Static hold.** |
| Z4 | S6, P3 photo, 0:41.2 to 0:47.2 | Ken Burns push-in, 1.00 to 1.08 | `seg_photo` default | **Moot: S6 is cut (v3.1).** |
| Z5 | S11 flight A, about 1:36.4, 1:38.0, 1:41.3, 1:43.0 (four 1.6 s shots) | **Punch-ins on the kiosk screen:** card strip, a 640x360 crop blown up 3x; accumulator lamps, an 853x480 crop blown up 2.25x. They are hard cuts, but they read as a jump zoom, and the 3x crop is visibly soft. | `CUTS["cards"]`, `CUTS["lamps"]`, cycled by `condensed_pieces` (`cyc = ["plot", "cards", "lamps"]`) | **Remove.** Condense with jump cuts on the full 1920x1080 plot only. This is the most likely "zoom-in" Nick saw: it hits the kiosk screen recordings, in the middle of the flight. |
| Z6 | S15 flight B, about 2:31.8 (cards) and 2:33.8 (lamps) | Same punch-ins (storyboard v2: "punch-in on the card strip", "punch-in on accumulator lamps") | same | **Remove.** Full-frame cuts only. If a lamp view is wanted, use a full-frame, unscaled shot from R4 (same shot, same landing), never a crop. |
| Z7 | Vertical short, P3 (4 s) | zoompan push-in, 1.00 to 1.06, after the 9:16 pre-crop | `assemble_vertical.py` line ~262 | **Moot: the P3 beat is cut from the short (v3.1).** Any other still in a vertical cut is a static hold. The stacked plot/cards/lamps panels in the vertical cuts are static crops, not animated; leave them. |

Rule for v3: **every kiosk screen recording plays full frame and unscaled; no zoompan, no crop punch-ins, no animated scale on any shot.** The only motion left is the P4 page pan (Z2). Overlays fade in and out; none of them scale.

### 2. Where the time comes from (3:17.5 down to 2:55)

The voice is about 123 s (353 words). Cutting the programmers removes 12 s. The rest of the saving comes from the picture: dead air, freeze-frames and the two flights, which recorded at about 3.7 s per hop instead of the 1.5 s planned. Cutting S6 would have left the plan at 2:47, so v3.1 puts 8 s back where they help the drama: flight B's third uncut hop (+5 s), a full sting ring-out on the sink (+1 s) and a longer end card (+2 s).

| Scene | Draft 1 | v3.1 | Change | Note |
|---|---|---|---|---|
| S1 Title, SUNK! | 4.0 | 4 | 0 | |
| S2 Hook | 8.0 | 9 | +1.0 | VO01 is longer (the simulation disclosure) |
| S3 Meet ENIAC | 7.2 | 7 | -0.2 | static P1 |
| S4 Why built | 12.0 | 11 | -1.0 | VO03 is 1 s shorter |
| S5 Most ENIAC | 10.0 | 9 | -1.0 | fit to VO04; hard cut straight to S7 |
| **S6 Programmers** | 12.9 | **CUT** | **-12.9** | Nick, v3.1 |
| S7 Pick a ship | 9.7 | 9.5 | -0.2 | |
| S8 Two numbers | 10.0 | 9 | -1.0 | VO07 is shorter |
| S9 Room walk | 12.0 | 9.5 | -2.5 | VO08 is 1.8 s shorter; two tour stops at about 4.7 s each |
| S10 READ, init | 7.0 | 7 | 0 | |
| S11 Flight A | 26.0 | 23 | -3.0 | Uncut tail = last 2 hops (was 3); no drum on the last card |
| S12 Splash | 12.6 | 10 | -2.6 | Hold the splash about 1.2 s, then jump-cut over the kiosk's 3.1 s wait; VO11 1.0 s after the result |
| S13 Re-aim | 13.4 | 12 | -1.4 | Cut the 3.0 s freeze; VO13 phrases on the taps ("ten degrees" on the 10° tap) |
| S14 READ, init again | 3.0 | 3 | 0 | |
| S15 Flight B | 19.0 | **18** | -1.0 | No punch-ins; head plus 2 jump cuts (about 6.5 s); **last 3 hops uncut** (about 11.5 s); last hop silent before the impact |
| S16 Ship sunk | 7.0 | **7** | 0 | Impact, the full sting ring-out, then 1.5 s of quiet |
| S17 Board | 4.0 | 5 | +1.0 | VO14 adds "Four feet off. Sunk." |
| S18 Thank you, Brian | 9.0 | 9 | 0 | |
| S19 End card | 10.6 | **13** | +2.4 | Each line holds about 1.5 s; clean tail for the YouTube end screen |
| **Total** | **3:17.5** | **2:55 (175 s)** | **-22.5** | |

The voice times are estimates from each line's measured rate. Re-voice the 11 changed lines, re-measure, then re-time. If the takes run long, take the extra from S19 first (down to 11 s), then flight B's middle section (S15, down to 1 cut). Keep the uncut tails and the silent last hops.

### 3. Voicing notes

- VO13 is spoken as three phrases on three taps, like draft 1's VO13. Generate it as one take and split it on the alignment JSON (the draft's `align_time` method), or as three takes.
- VO01: a small beat before "Well,". VO14: "Four feet off. Sunk." is quiet and pleased, not shouted.
- Ear-check (Gate 2 reel): the 3 ENIACs (VO01, VO02, VO04), "init" (VO09), "Info Age" (VO16, now spelled out in the TTS text), and **"READ" in VO09** (kept take; confirm it is "reed", not "red").
