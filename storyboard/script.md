# Script: ENIAC Plays Battleship (recut v3.1, after draft 1)

**Date:** 2026-10-23. **Status:** recut v3 after Nick watched `output/battleship-main-draft1.mp4` (3:17). DRAFT: nothing re-voiced or committed.
**What changed from v2:** (1) accuracy: no line says or implies that the kiosk runs, or that you play on, the 1946 machine. The kiosk runs Brian Stuart's pulse-level **simulation** of ENIAC, and the hook says so. (2) The re-aim is rebuilt as a clear chain of cause and effect: short, why, what changes, the sink. (3) Time: the target is about 3:00. Most of the time comes out of the picture edit (dead air and the two flights); see "Editor notes" in `storyboard.md`. (4) Fewer ENIACs: 3 spoken, down from 8. (5) **v3.1, Nick's decision 2026-10-23: the programmers segment is cut** (VO05 and scene S6: the P3 photo and the R6 honor roll). The museum covers that story on site, and this video is about the game. This overrides the brief's "people before hardware" rule for this video only. Line ids and scene numbers stay as they were (VO05 and S6 are marked CUT; nothing renumbered). Chapters renumber from 6 to 5.
**Runtime target:** 2:50 to 3:00; scene plan **2:55 (175 s)**, 5 chapters, 18 scenes (S6 cut). Narration: 15 lines (VO05 cut; other ids unchanged), **353 words**, about **123 s** of voice at Nick 2's measured rate (2.9 words/s).
**Voice:** Nick 2 (`6SxuwKUiBpZjFTc06v9Y`, `eleven_multilingual_v2`, stability 0.5, similarity 0.75, style 0.4, speed 1.12). First-person docent. One idea per line.
**TTS text rules:** numbers are already words below. "init" is lower case in the TTS text (INIT on screen). **Aliases are locked** (Nick's audition2 picks, 2026-10-23) in `scripts/pronunciation-aliases-battleship.json`: ENIAC/ENIAC's = "Ennie-ack"/"Ennie-ack's", init = "in·it" (whole word only, so "initiating" is untouched), recreation = "re-creation" (VO15). The written script text is never changed; the alias is applied at send time. **"Info Age" is written as two words in the TTS text**, so it is not aliased (the overlay still says "InfoAge"). (With VO05 cut, no programmer names are spoken.)
**Facts:** every line has a row in `research/fact-check.md` (V#; new rows V36 to V46 for the recut).
**Not in this script, on purpose:** the "faster than the shell" claim; any real gun range or performance; the Hasbro catchphrase or a wink at it; "start button" / "GO button"; Lehmer; **any claim that the viewer plays on, or the shot is computed by, the real 1946 machine** ("a computer that's eighty years old", "the rest is ENIAC", "ENIAC does fifty steps"); the programmers' names (cut v3.1, Nick's call: covered on site).

Shot ids (R1 to R7) are defined in `storyboard/recording-plan.md`; photo ids (P1 to P4) in `storyboard/storyboard.md`.

---

# Chapter 1: The hook (0:00 to 0:13)

## [SCENE 1: Title screen, SUNK! - 0:00-0:04]

[VISUAL: R1, the kiosk's Battleship title screen: navy room, red banner, ten-by-ten grid. A shell lobs from our ship to the enemy's; the SUNK! stamp lands at about 0:03.]
[MUSIC: M1, swing opener; a brass hit on the SUNK! stamp.]
No voice. Do not open on talking.

---

## [SCENE 2: "But the computer..." - 0:04-0:13]

[VISUAL: R1 continues into the plan screen (ship, gun, angle cards).]
[TEXT OVERLAY: "ENIAC PLAYS BATTLESHIP", 0:04.5 to 0:09 (locked title; see the fact-check note O1)]

NARRATION (VO01, 24 words, V1, V36):
"That's a game of Battleship. Every shot is worked out by ENIAC, a computer from nineteen forty-six. Well, by a faithful simulation of it."

[Delivery: a beat before "Well," so the correction plays as a wink, not a retraction.]
[TRANSITION: hard cut on the music downbeat]

---

# Chapter 2: What ENIAC is (0:13 to 0:40)

## [SCENE 3: Meet ENIAC - 0:13-0:20]

[VISUAL: P1, Glen Beck and Betty Snyder at ENIAC. Static hold (no push-in; see the editor notes).]
[TEXT OVERLAY: lower third "Nick DeMarco · Docent, Vintage Computer Federation"; credit "U.S. Army Photo"]

NARRATION (VO02, 17 words, V3, V4), unchanged:
"I'm Nick, a docent at the Vintage Computer Federation museum. This is ENIAC. It filled a room."

---

## [SCENE 4: Why it was built - 0:20-0:31]

[VISUAL: P4, a real 1941 Army firing-table page (TM 6-215, Table A), slow pan down a column; at 0:26 cut to P2 (changing a tube), static.]
[TEXT OVERLAY: P4 credit; at 0:26 date card "Shown to the public · February 15, 1946"; P2 credit "U.S. Army Photo"]

NARRATION (VO03, 30 words, V5, V6):
"It was built for the U.S. Army, to work out where artillery shells would land, for the firing tables gun crews used. It was unveiled on February fifteenth, nineteen forty-six."

---

## [SCENE 5: The most ENIAC thing - 0:31-0:40]

[VISUAL: R2, the kiosk Battleship briefing screen ("Battle stations"), then the plan screen.]

NARRATION (VO04, 27 words, V7, V8), unchanged:
"So aiming a gun is the most ENIAC thing you can do. Our kiosk lets you, on a simulation that follows the real machine pulse by pulse."

---

# (Chapter 3, The people: CUT in v3.1)

## [SCENE 6: The first programmers - CUT]

Cut by Nick, 2026-10-23: VO05 (the six names), the P3 photo and the R6 honor-roll clip. The museum tells this story on site; the video stays on the game. Scene and line ids are kept, not renumbered.

NARRATION (VO05): CUT. (Was: "ENIAC's first programmers were six women: Kay McNulty, Betty Jean Jennings, Betty Snyder, Marlyn Wescoff, Fran Bilas and Ruth Lichterman. They worked out every cable by hand.")

**Flow check, VO04 → VO06:** VO03 ("built… to work out where artillery shells would land, for the firing tables gun crews used") still sets up VO04 ("So aiming a gun is the most ENIAC thing you can do. Our kiosk lets you…"), with nothing in between. VO04 ends on the kiosk, and VO06 opens "Here's the game." over the aim screen, so the hand-off is direct. **No bridge needed.** The picture goes from R2's plan screen (S5) to R2's aim screen (S7), a hard cut within the same recording.

---

# Chapter 3: You play (0:40 to 1:48)

Round A: target t4 "Enemy destroyer: 10,950 feet away" · **Destroyer · Quick gun (750 ft/s) · 20°** · measured landing 10,435 ft, **515 ft short**, 16 hops. (Battleship table, row "Quick 750", column 20°.)

## [SCENE 7: Pick a ship - 0:40-0:49.5]

[VISUAL: R2 aim screen. Target "Enemy destroyer: 10,950 feet away". Taps: Destroyer, Quick gun, 20°. The little gun tips up to its steepest angle.]

NARRATION (VO06, 25 words, V12, V13), unchanged:
"Here's the game. An enemy destroyer, just under eleven thousand feet away. I pick a destroyer, its quick gun, and the steepest angle: twenty degrees."

---

## [SCENE 8: Two numbers - 0:49.5-0:58.5]

[VISUAL: R2 "Your shot, set on the dials" panel (ft/s along, ft/s up), tap "Load the guns"; cut to the tour stop "Constant Transmitter".]
[TEXT OVERLAY: callout "Constant Transmitter"]

NARRATION (VO07, 24 words, V14, V37):
"Ships and guns are just the game. My gun and angle become two numbers on the Constant Transmitter. The simulated machine does the rest."

---

## [SCENE 9: The room walk - 0:58.5-1:08]

[VISUAL: R2 "ENIAC is loading the guns" intro, then tour stops Master Programmer and Accumulators 15 to 20, quick cuts.]
[TEXT OVERLAY: callouts "Master Programmer", "Accumulators"]

NARRATION (VO08, 27 words, V16, V17, V18):
"The kiosk places every cable and switch for me. The Master Programmer is the conductor. The accumulators hold the numbers: which hop, how far along, how high."

---

## [SCENE 10: READ, init - 1:08-1:15]

[VISUAL: R2 run screen. Tap READ; the card reads (Accumulator 1 shows 97,367); tap INIT.]

NARRATION (VO09, 18 words, V19, V20), unchanged:
"Press READ to take in the card. Then init: the initiating pulse button, as the simulator labels it."

---

## [SCENE 11: Flight A - 1:15-1:38]

[VISUAL: R2 flight A, condensed by jump cuts (the recording runs about 3.7 s per hop, so 16 hops is about a minute). Head of the flight, then plot cutaways only, then the **last 2 hops uncut** to the landing. No "Real time" tag (see fact-check O5).]
[TEXT OVERLAY: callouts timed to the words: "Multiplier", "Function Table 2", "One card = one dot"; all gone before the uncut tail.]
[SOUND: snare and bass under the voice. When VO10 ends the music drops out; one low drum on the second-to-last card, then **no drum on the last card**: the final hop (about 3.7 s) plays in silence into the splash. (In the recording the last card and the landing are only about 0.1 s apart, so a drum there leaves no silence beat.)]

NARRATION (VO10, 43 words, V38, V22, V23, V24):
"This is firing-table arithmetic: fifty tiny steps for every second of flight. The multiplier squares the speed. Function Table Two looks up how hard the air pushes back. The punch makes one card: one dot. Join the dots, and that's the shell's path."

---

## [SCENE 12: Splash, 515 short - 1:38-1:48]

[VISUAL: R2 landing: the pulse just short of the enemy. Hold the splash about 1.2 s, then jump-cut over the kiosk's wait to the result: "515 ft short", points (expected 934), rank (expected "Sharpshooter").]
[SOUND: water splash on the landing pulse (no explosion); the trombone "missed" figure on the result reveal.]
[TEXT OVERLAY: "515 FT SHORT", large, 0.6 s after the kiosk shows the figure, and only the figure the kiosk shows]

NARRATION (VO11, 19 words, V25, V39), about 1.0 s after the result appears:
"Short. Five hundred and fifteen feet short. That's the destroyer's fastest gun at the steepest angle. It can't reach."

[Delivery: "It can't reach" lands flat and final; that is the problem the next scene solves.]

---

# Chapter 4: The re-aim (1:48 to 2:33)

Round B: same target · **Cruiser · Long gun (1,050 ft/s) · 10°** · measured landing 10,954 ft, 4 ft long, **Direct hit! Ship sunk!**, 12 hops. (Battleship table, row "Long 1,050", column 10°.)

The chain the viewer must follow: **short (515 ft) → why (the destroyer's best shot can't reach) → a re-fire won't help (same shot, same place) → so more speed (a bigger ship's long gun) → more speed means a lower angle (10°) → sunk, four feet off.**

## [SCENE 13: More speed - 1:48-2:00]

[VISUAL: R2 "Fire again"; aim screen, same target. No freeze on the aim screen: go straight into slow, deliberate taps, each on a beat: Cruiser, Long gun, 10° (the gun tips **down**: hold a moment on that). End on "Your shot, set on the dials".]
[SOUND: the bed returns, low and sparse; a rising snare under VO13.]

NARRATION (VO12, 20 words, V27, V40), over "Fire again" and the aim screen:
"In this game, the same shot always lands in the same place. So I need more speed: a bigger ship."

NARRATION (VO13, 13 words, V29, V41), split in three, each phrase on its tap ("ten degrees" lands on the 10° tap):
"The cruiser. Its long gun. With that speed, I aim lower: ten degrees."

---

## [SCENE 14: READ, init again - 2:00-2:03]

[VISUAL: Load the guns, Skip to the guns, READ, INIT: four quick cuts.]
[SOUND: a snare roll starts on the INIT tap.]
No voice.

---

## [SCENE 15: Flight B - 2:03-2:21]

[VISUAL: Flight B, condensed from about 45 s of recording to 18 s: the head of the flight and 2 full-frame jump cuts on the plot (no crops, no punch-ins), then the **last 3 hops uncut** on the full plot (about 11.5 s).]
[SOUND: tension cue, cutting on the bar lines. For the last 3 hops the music drops out: a low drum on the 3rd- and 2nd-to-last cards, then **no drum on the last card**. The final hop (about 3.7 s) plays in silence until the impact. (The recording has only about 0.15 s between the last card and the landing, so the silence has to come from dropping that last drum, not from a gap in the picture. Never freeze or stretch the flight.)]
No voice.

---

## [SCENE 16: Ship sunk! - 2:21-2:28]

[VISUAL: The landing on the enemy, "Direct hit! Ship sunk!", the starburst, 1,000 points, rank "Ship sunk!". Hold (7 s: the sting rings out fully, then 1.5 s of quiet).]
[TEXT OVERLAY: a SUNK! stamp: the kiosk's own if the result screen draws one; otherwise ours, in the kiosk's red and cream, 3 frames after "Ship sunk!" appears]
[SOUND: impact (a deep boom and water) on the landing; a big brass hit on "Ship sunk!"; then 1.5 s of quiet (room tone only).]
No voice.

---

## [SCENE 17: Your name on the board - 2:28-2:33]

[VISUAL: hold the result for the first beat, then R2 "Save my score", the letter keyboard types YOU NEXT, the Today board.]

NARRATION (VO14, 12 words, V30, V42, V31), right after the quiet:
"Four feet off. Sunk. Type your name, and you're on today's board."

[Delivery: "Four feet off. Sunk." is the payoff to "five hundred and fifteen feet short": quiet, pleased, a little smug.]

---

# Chapter 5: Come play (2:33 to 2:55)

## [SCENE 18: Thank you, Brian - 2:33-2:42]

[VISUAL: R1 title screen loop, the kiosk footer credit visible.]
[TEXT OVERLAY: "Simulator: Brian L. Stuart, Drexel University · cs.drexel.edu/~bls96/eniac"]

NARRATION (VO15, 24 words, V43, V33), the only thank-you in the video:
"The game is built on Brian Stuart's recreation of the trajectory program. Thank you, Brian L. Stuart, for the simulator that makes it possible."

---

## [SCENE 19: End card - 2:42-2:55]

[VISUAL: R1 title screen, darkened, under the end card.]
[TEXT OVERLAY (builds line by line): "Play it at our ENIAC exhibit" / "Vintage Computer Federation" / "InfoAge Science and History Museums" / "2201 Marconi Rd, Wall NJ" / "Wed, Sat & Sun · 12 to 5"]
[MUSIC: swing closer, button ending on the last line; 13 s so each end-card line holds about 1.5 s after it builds, plus room for the YouTube end screen]

NARRATION (VO16, 30 words, V44, V35):
"Come beat today's high score on a faithful simulation of an eighty-year-old computer. Vintage Computer Federation, at Info Age in Wall, New Jersey. Wednesdays, Saturdays and Sundays, noon to five."

---

## Word, time and token counts

Seconds: v2 values are the measured takes (`durations.json`); v3 values are estimates at each line's measured rate (the average rate, 2.9 words/s, for VO12 to VO14). Re-voice and re-measure before the edit.

| Line | v2 words / s | v3 words / est. s | Changed | ENIAC | init | Names |
|---|---|---|---|---|---|---|
| VO01 | 20 / 6.8 | 24 / 8.2 | yes | 1 | | |
| VO02 | 17 / 6.5 | 17 / 6.5 | no | 1 | | |
| VO03 | 33 / 11.0 | 30 / 10.0 | yes | | | |
| VO04 | 27 / 7.9 | 27 / 7.9 | no | 1 | | |
| VO05 | 30 / 12.2 | **CUT** (v3.1) | cut | | | |
| VO06 | 25 / 9.1 | 25 / 9.1 | no | | | |
| VO07 | 25 / 9.1 | 24 / 8.7 | yes | | | |
| VO08 | 33 / 9.9 | 27 / 8.1 | yes | | | |
| VO09 | 18 / 6.4 | 18 / 6.4 | no | | 1 | |
| VO10 | 50 / 19.4 | 43 / 16.7 | yes | | | |
| VO11 | 19 / 7.2 | 19 / 7.2 | yes | | | |
| VO12 | 24 / 6.6 | 20 / 6.9 | yes | | | |
| VO13 | 7 / 2.0 | 13 / 4.5 | yes | | | |
| VO14 | 8 / 2.1 | 12 / 4.1 | yes | | | |
| VO15 | 24 / 8.0 | 24 / 8.0 | yes | | | Stuart ×2 |
| VO16 | 28 / 10.0 | 30 / 10.7 | yes | | | Info Age, Wall |
| **Total** | **388 / 134.0** | **353 / 122.9** (15 lines) | 11 changed, 1 cut | **3** (was 8) | **1** | |

Re-voice VO01, VO03, VO07, VO08, VO10 to VO16 (11 lines). VO02, VO04, VO06, VO09 keep their current takes. VO05 is cut (its old WAV stays on disk, unused).
