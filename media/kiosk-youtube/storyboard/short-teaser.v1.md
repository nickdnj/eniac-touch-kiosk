# Teaser Short: "Program ENIAC with your fingertip" (Gate 1)

**Status:** GATE 1, script and shot list for review. No audio or video generated.
**Date:** 2026-10-08. **Brief:** `project.json` under `shorts.teaser`.
**Goal:** bring people to the Vintage Computer Federation museum (InfoAge Science and History Museums, Wall, NJ) to try the ENIAC touch-screen kiosk. The kiosk has been live since 2026-10-07.
**Format:** 1080x1920, about 45.5 s, YouTube Shorts first, then Reels and TikTok exports.
**Voice:** Nick 2 (`6SxuwKUiBpZjFTc06v9Y`, `eleven_multilingual_v2`, stability 0.5, similarity 0.75, style 0.4, speed 1.12). No stock fallback.
**Long video:** https://www.youtube.com/watch?v=KoWgoNo3F1k (`output/eniac-kiosk-v5b.mp4`, 8:02).

---

## 1. Hook options

All three put the promise ("program ENIAC") inside the first 1.6 s of voice.

| | Hook | Why |
|---|---|---|
| **A (recommended)** | "You can program ENIAC, the room-sized computer of 1946, with your fingertip." | The approved direction. Contrast (1946 against a fingertip) and "ENIAC" land in 1.5 s. 12 words, about 4 s. |
| B | "This computer filled a room in 1946. Now you can program it with a touch." | Softer, sets the scene first. The payoff arrives about 3 s in. |
| C | "About 18,000 tubes, and you can run it from a touch screen." | Starts on a number. "Run it" overclaims, since the kiosk runs a simulator, so it needs a safer verb. Weakest. |

**Pick A.** It matches the on-screen hook, and the "Touch to program ENIAC" button is visible in the opening shot.

---

## 2. VO script (recommended hook A)

TTS column is what gets sent to ElevenLabs: the repo convention spells numbers out, "InfoAge" becomes "Info Age", and "vcfed.org" becomes "V C F E D dot org". Display text is for review.

| # | Display | TTS differences |
|---|---|---|
| V1 | You can program ENIAC, the room-sized computer of 1946, with your fingertip. | "nineteen forty-six" |
| V2 | On screen, the whole room lights up: forty panels, about eighteen thousand tubes. | none |
| V3 | Then you wire up the Squares mission, cable by cable, like ENIAC's first programmers. | none |
| V4 | Press go, and the lamps count: one, four, nine. | beats between the three numbers: "one. four. nine." |
| V5 | That's ENIAC squaring numbers, because you told it how. | none |
| V6 | Next, it hunts for prime numbers, punching a card for every one it finds. | none |
| V7 | Then it flies a cannon shell, a card for every second, all the way to the landing. | none |
| V8 | Come try it yourself, at the Vintage Computer Federation, inside the InfoAge Science and History Museums in Wall, New Jersey. vcfed.org. | "Info Age"; "V C F E D dot org" |

**Word count (display text): 109.** Per line: 12, 13, 14, 9, 9, 14, 17, 21.

**Duration estimate at speed 1.12.**
- The v5 source lines measured 3.08 words per second (1,397 words in 453.9 s of narration WAVs). `new-lines.md` assumed 3.2.
- 109 words at 3.0 words per second is about 36 s of speech. The worst case at 2.8 is about 39 s.
- Add about 4.9 s of breaths between lines, about 0.4 s of beats in V4, and about 1 s for the spelled-out "V C F E D dot org".
- That puts the last word at about 43 s. Add a 0.3 s lead-in and a 2.5 s music tail, and the Short runs **about 45.5 s**, under 60 s on every platform.
- Real timings come from the generated WAVs. The cut points below are planned, not measured.

**Facts check (research/fact-check.md, research/tubes.md):**
- "forty panels" and "about eighteen thousand tubes": correct as written (about 18,000, 40 panels in a U).
- "first programmers": the approved phrase.
- "a card for every second": matches N03. One card is one second of flight, not one hop.
- The shell line does not name Brian Stuart's "reconstruction" and does not claim it is the 1946 demo.
- Not in the script: the U's length, the Philadelphia myth, "Lehmer", any thank-you to Stuart, the private kiosk repo.
- "On screen, the whole room lights up" says it is the display. The lamps are shown, not the real tubes.

---

## 3. Shot list

**Planned VO timing:** V1 0.3 to 4.3, V2 5.0 to 9.3, V3 10.0 to 14.7, V4 15.4 to 18.8, V5 19.5 to 22.5, V6 23.2 to 27.9, V7 28.6 to 34.3, V8 35.0 to 43.0. Retime to the real WAVs at assembly.

**Music:** Kevin MacLeod "Hot Swing" (`assets/audio/music/Hot Swing.mp3`, 0:50, upbeat swing). Voice is about -16 LUFS.
- **Up:** about -20 LUFS, in the gaps.
- **Under:** about -32 LUFS, while the voice speaks.
- Ride about 0.15 s attack and 0.4 s release between the two.

**All source paths are under `assets/video/source-v5/` unless noted. Source times are in the muxed v5 files, the same files the EDL uses.**

**Framing legend**
- **PB** (pillarbox): blurred-fill pillarbox. Background is the same shot, scaled to 1920 tall, cropped to 1080 wide, `boxblur=40:5`, darkened about 30%. Foreground is a sharp crop, scaled to 1080 wide and centred vertically.
- **CW** (crop window): a full-height 607x1080 window scaled 1.778x to 1080x1920.

| # | Out time | Source and timestamp | 9:16 framing | VO | Music | Overlay |
|---|---|---|---|---|---|---|
| S1 | 0.00 to 4.60 (4.6 s) | `eniac-touch-tour.mp4`, 18.00 to 22.60. The live attract screen: room strip animating, "Touch to program ENIAC" button. | **PB.** Crop `x=240 y=0 w=1440 h=1080` (full strip and button), scale to 1080x810, centre at y=555. Bands are 555 px each. | V1 (0.3 to 4.3) | Up at 0, to under by 0.3. | **Hook text**, in the top band, 0.0 to 3.6 |
| S2 | 4.60 to 9.80 (5.2 s) | `finale.mp4`, 19.60 to 24.80. "Here is every unit you used": the 40-panel U strip with lit lamps and yellow rings. Avoid the Stuart screen, which starts at 28.40. | **CW** panning x from 0 to 1313 (`crop=607:1080:x='t/5.2*1313'`), so the whole strip sweeps past. | V2 (5.0 to 9.3) | Under | none |
| S3 | 9.80 to 11.80 (2.0 s) | Photo `assets/images/photos/P3-two-women-operating-eniac.jpg` (5682x3899, U.S. Army, PD). Cables hanging in front of the panels, one operator plugging in. | Ken Burns. Crop 2193x3899, start `x=2450` (cabled panels, right-hand operator), push in 1.00 to 1.12 with a drift of about 150 px to the right. Pre-crop to 9:16 before zoompan. | V3 starts (10.0): "Then you wire up the Squares mission" | Under | none |
| S4 | 11.80 to 15.00 (3.2 s) | `eniac-touch-walkthrough-squares.mp4`, 82.40 to 85.60. "The rest is done for you": blue and pink cables draw across the panels (6 to 11 cables). | **PB.** Crop `x=40 y=60 w=1320 h=990` (panels plus cable counter, no sidebar card), scale to 1080x810. | V3 ends "cable by cable, like ENIAC's first programmers" (to 14.7) | Under | none |
| S5 | 15.00 to 18.00 (3.0 s) | `eniac-touch-walkthrough-squares.mp4`, 103.90 to 106.90. Accumulators 1 and 2, both reading 1, lamps lit. Inside the clean lamp-play window (92.94 to 106.92). | **PB, near 1:1.** Crop `x=0 y=40 w=1100 h=760`, scale to 1080x746. Both lamp grids and both readouts are visible. | V4: "Press go, and the lamps count" (15.4 to 17.5), then "one" at about 17.8 | Under | none |
| S6 | 18.00 to 18.80 (0.8 s) | Same file, 127.00 to 127.80. Accumulators read 2 and 4. (Lamp-play window 125.86 to 141.81.) | Same crop as S5. | "four" at about 18.3 (jump cut) | Under | none |
| S7 | 18.80 to 23.20 (4.4 s) | Same file, 135.00 to 139.40. Accumulators read 3 and 9. Hold. | Same crop as S5. | "nine" at about 18.8, then V5 (19.5 to 22.5) | Under | none |
| S8 | 23.20 to 28.40 (5.2 s) | `eniac-touch-walkthrough-primes.mp4`, 102.50 to 107.70. The "Primes pile up" run: card count 5 to 8, fourteen group checkers, punched-card list growing. | **PB.** Crop `x=20 y=50 w=1380 h=860` (checkers plus cards, no sidebar), scale to 1080x673. Whole-screen treatment, since the pile-up is the point. | V6 (23.2 to 27.9) | Under | none |
| S9 | 28.40 to 34.60 (6.2 s) | `eniac-touch-walkthrough-trajectory.mp4`, 132.60 to 138.80. The dots arc across the sky, reaching "Landed" at about 138.3, which falls at about 34.1 out. EDL clean window is 132.60 to 140.40. | **PB.** Crop `x=80 y=40 w=1300 h=760` (arc, readouts, punched cards), scale to 1080x631. | V7 (28.6 to 34.3). "the landing" meets the Landed tag. | Under | none |
| S10 | 34.60 to 45.50 (10.9 s) | `eniac-touch-tour.mp4`, 22.00 to 32.90. Live attract room again, the open and close echo each other. | **CW** at `x=616` (centre on the "Touch to program ENIAC" button), slow push 1.00 to 1.08, darkened about 35% (`eq=brightness=-0.35`) so the end text reads. | V8 (35.0 to 43.0) | Swell from under to up at 43.0. Last 0.8 s fades to silence at 45.5. | **End text**, 36.0 to 45.5 |

**Totals:** 10 shots. Cuts on S5, S6 and S7 are jump cuts on the number words. The S5 to S7 numbers are a rough fit, so retime them to the real V4 WAV.

**Checks to do at assembly (not yet verified):**
1. **Attract-plate check on S1 and S10.** The left plate rotates: Stuart at tour 12 and 30, "designed by Eckert and Mauchly" at 20. Step frames across 18.0 to 22.6 and 22.0 to 32.9, and nudge the in-point if a Stuart plate is in the crop. A plate is not a thanks, but the short carries no Stuart reference at all.
2. **Footer.** The kiosk footer ("Simulator by Brian L. Stuart, Drexel University") sits at the bottom of the 1080-high frame. Every crop above starts at or above y=40 and ends above y=1000, so it is cropped out of S1, S4, S5 to S9. S2 and S10 use the full-height crop window, so it appears only if the window includes the footer's left end. Keep the pan out of x<640 at the bottom, or accept it as UI.
3. **Hot Swing ending.** The track is 50 s with a big ending. For a 45.5 s Short, either start at 0:00 and fade the last 0.8 s, or seek with `-ss 4.5` so the big ending lands at the end. Pick by listening at Gate 2.
4. **FFmpeg build.** The default `/opt/homebrew/bin/ffmpeg` has no `drawtext`. Use `/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg` (the one `scripts/assemble_v5.py` uses).
5. **Safe zone.** Shorts, Reels and TikTok cover about the top 250 px, bottom 400 px and right 120 px with UI. Both overlays are inside y=250 to 1500.

**Not used on purpose:** no photo credit on screen (courtesy only, PD, and the brief allows no other text; the credit goes in the description). No subtitles, no caption boxes, no kiosk clip with a baked caption. The lamps shots are CLEAN=1 recordings.

---

## 4. On-screen overlays (the only two)

Style: the long video's overlay font (see `scripts/assemble_v5.py`), white fill, 5 px black outline, centred, rendered by FFmpeg `drawtext` at assembly. Never baked into any image.

**Overlay 1, hook (0.0 to 3.6 s, fade in 0.15 s, out 0.25 s)**
Two lines, uppercase, about 88 pt, centred, in the top band at about y=300:

```
PROGRAM ENIAC
WITH YOUR FINGERTIP
```

**Overlay 2, invite (36.0 to 45.5 s, fade in 0.3 s, held to the end)**
Two lines, centred at about y=880 to 1100. Line 1 is about 64 pt, line 2 about 88 pt (the larger, to be remembered):

```
VCF museum · Wall, NJ
vcfed.org
```

---

## 5. Title, description, hashtags

**Title (YouTube, 48 characters):**
`You can program ENIAC with your fingertip #Shorts`

**Description (YouTube):**

```
A 1946 room-sized computer, on a touch screen you can program yourself.

The Vintage Computer Federation museum (InfoAge Science and History Museums, Wall, NJ) has a touch-screen ENIAC exhibit. You wire up the missions, press go, and watch the lamps. It runs a simulator of the machine.

Watch the full walkthrough: https://www.youtube.com/watch?v=KoWgoNo3F1k
Plan your visit: https://vcfed.org

#Shorts #ENIAC #ComputerHistory #VintageComputing #VCF #InfoAge #NewJersey #Museum

Music: "Hot Swing" by Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/
Photo: Betty Jean Jennings and Frances Bilas at ENIAC, 1946. U.S. Army Photo, public domain.
```

**Hashtags (8):** `#Shorts #ENIAC #ComputerHistory #VintageComputing #VCF #InfoAge #NewJersey #Museum`

**Reels and TikTok captions (for Nick to post):**
- **Reels:** "You can program ENIAC, the 1946 computer, with your fingertip. Come try it at the VCF museum in Wall, NJ. vcfed.org #ENIAC #ComputerHistory #VintageComputing #NewJersey #Museum #Reels"
- **TikTok:** "Program a 1946 computer with your fingertip. VCF museum, Wall NJ #ENIAC #ComputerHistory #VintageComputing #NJ #museum"
- Instagram links are not clickable in captions, so say "link in bio" if Nick wants the full video there.

**Publish plan (from the brief):** @nickdnj Short, related video set to `KoWgoNo3F1k`. Run `youtube-whoami.py` before the upload. Draft only until Nick approves.

---

## 6. Gate 1 questions for Nick

1. Hook A, OK? (B and C are in section 1.)
2. The description names the Vintage Computer Federation, InfoAge, and says it runs a simulator, but does not name Brian Stuart. The full video carries the credit. Fine, or add a neutral attribution line?
3. Is Hot Swing right, given the stand-in music note in `assets/audio/music/credits.md`? If the YouTube Audio Library pick is swapped in before publishing, the credit line changes.
