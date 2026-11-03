# Teaser Short v2: "Program ENIAC with your fingertip", the Trajectory story (Gate 1)

**Status:** GATE 1, v2 (Nick's change of direction, 2026-10-08). Script and shot list only; no media generated. The squares-led v1 is kept at `storyboard/short-teaser.v1.md`.
**Goal:** bring people to the Vintage Computer Federation museum (InfoAge Science and History Museums, Wall, NJ) to try the ENIAC touch-screen kiosk (live since 2026-10-07). Angle: the history of the Trajectory mission, with a short nod to the other two.
**Format:** 1080x1920, **about 45.0 s**, YouTube Shorts first, then Reels and TikTok exports.
**Long video:** https://www.youtube.com/watch?v=KoWgoNo3F1k (`output/eniac-kiosk-v5b.mp4`, 8:02). It carries all credits.
**No on-screen or spoken credit to the simulator's author anywhere in this Short, and none in the title or description.**

---

## 1. VO (final, 8 lines, 109 words)

Voice: Nick 2, speed 1.12. WAVs are in `assets/audio/short-teaser/`; the real durations come from `durations-v2.json` (speech 39.24 s).

| Line | File | Text | Words | Dur (s) |
|---|---|---|---|---|
| 1 | `line-01.wav` | You can program ENIAC, the room-sized computer of 1946, with your fingertip. | 12 | 5.526 |
| 2 | `traj-02.wav` | ENIAC was built for the Army, to work out where artillery shells would land. | 13 | 4.133 |
| 3 | `traj-03.wav` | By hand, one shell's path took many hours. | 8 | 2.554 |
| 4 | `traj-04.wav` | At the museum, you wire it up yourself, cable by cable. | 11 | 2.786 |
| 5 | `traj-05.wav` | Press go, and ENIAC flies the shell, punching a card for every second of flight. | 15 | 4.412 |
| 6 | `traj-06.wav` | Up to the highest point... and down to the landing. | 10 | 2.461 |
| 7 | `traj-07.wav` | It's a reconstruction of the flight ENIAC worked out at its 1946 unveiling. And two more missions are waiting. | 19 | 7.105 |
| 8 | `line-08.wav` | Come try it yourself, at the Vintage Computer Federation, inside the InfoAge Science and History Museums in Wall, New Jersey. vcfed.org. | 21 | 10.263 |

**Timeline.** Lead-in 0.30 s, breath 0.45 s between lines, tail 2.3 s of music after the last word. The Short is **45.0 s**.

| Line | Starts | Ends |
|---|---|---|
| 1 | 0.30 | 5.83 |
| 2 | 6.28 | 10.41 |
| 3 | 10.86 | 13.41 |
| 4 | 13.86 | 16.65 |
| 5 | 17.10 | 21.51 |
| 6 | 21.96 | 24.42 |
| 7 | 24.87 | 31.98 |
| 8 | 32.43 | 42.69 |

If `durations-v2.json` changes, re-run this arithmetic. All cut points below hang off these numbers.

**Fact notes (research/fact-check.md, research/trajectory-history.md):**
- Line 2: ENIAC was built for Army ballistics (firing tables). Supported.
- Line 3: "many hours" is the fact-check's safe wording (the Army figure is about 20 hours, Goldstine about 12). Do not change it to "days".
- Line 5: one card is one second of flight. Matches the kiosk and N03.
- Line 7: this mirrors the kiosk's own mission copy ("reconstruction ... from ENIAC's February 15, 1946 unveiling") without the author's name. The fact-check says credit for the original demo trajectory is disputed, so the line stays at "reconstruction" and names nobody. Fine as written; do not soften "reconstruction" to "recreation".
- Not in the script: the U's length, the Philadelphia myth, "Lehmer", the private kiosk repo, any name from the simulator's credit.

---

## 2. Shot list

**Music:** Kevin MacLeod "Hot Swing" (`assets/audio/music/Hot Swing.mp3`, 0:50). Voice is about -16 LUFS. **Under** = about -32 LUFS while a line plays. **Up** = about -20 LUFS in breaths. Swell to up from 42.7 s, fade out 44.2 to 45.0 s. Whether to seek in so the track's big ending lands on the last frame is a listening call at Gate 2.

**Sources** (all in `assets/video/source-v5/` unless noted). `traj` = `eniac-touch-walkthrough-trajectory.mp4` (156.84 s, 1920x1080, 25 fps).

**Framing legend**
- **PB** = blurred-fill pillarbox. Background is the same shot scaled to 1920 tall, cropped to 1080 wide, `boxblur=40:5`, darkened about 30%. Foreground is the sharp crop, scaled to 1080 wide and centred.
- **CW** = a full-height crop window scaled to 1080x1920.
- Every kiosk crop below ends at or above y=1010. The kiosk footer line sits at about y=1050 to 1075, so it is cropped out of every shot.

| # | Out time | Source and timestamp | 9:16 framing | VO | Music | Overlay |
|---|---|---|---|---|---|---|
| S1 | 0.00 to 6.10 (6.1 s) | `eniac-touch-tour.mp4`, 18.00 to 24.10. Live attract room, room strip animating, "Touch to program ENIAC" button. | **PB.** Crop `x=480 y=0 w=880 h=1000` (this window sits between the two rotating attract plates, so neither shows), scale to 1080x1227. | Line 1 (0.30 to 5.83) | Up at 0, under by 0.3 | **Hook text**, 0.0 to 3.6 |
| S2 | 6.10 to 10.70 (4.6 s) | Photo `assets/images/photos/P1-beck-snyder-eniac.jpg` (1340x1024, U.S. Army, PD). The long hall of ENIAC panels and cables, two people at work. | **PB.** Whole photo scaled to 1080x825, centred. Slow push 1.00 to 1.08. Soft source, so keep the push small. | Line 2 (6.28 to 10.41) "built for the Army" | Under | none |
| S3 | 10.70 to 13.85 (3.15 s) | `traj`, 16.20 to 19.35. "The path of a shell": the shell arc plotted dot by dot (2 dots, 5, 8, then the full arc by about 19). | **PB.** Crop `x=60 y=100 w=1300 h=660` (grid, arc and the line "Each dot is a card...", no sidebar), scale to 1080x548. | Line 3 (10.86 to 13.41) "By hand ... many hours". The dots appearing one at a time stand in for the slow work. | Under | none |
| S4 | 13.85 to 17.05 (3.2 s) | `traj`, 65.00 to 68.20. Cabling: the cable and switch counter climbs (37 cables at 65, **111 cables, 0 switches at about 66**, 185 at 67), pink cables draw into the printer/card-punch and master-programmer panels. | **CW pan, 1180 wide, y=30 to 1010.** Start at `x=720` (master programmer plus the counter card), hold 1.2 s, then ease left to `x=0` (initiating unit, printer and card punch) by 3.2 s. Scale 0.915 to 1080x897, PB fill. Pan form: `x='720-720*smoothstep(1.2,3.2,t)'`. | Line 4 (13.86 to 16.65) "cable by cable" | Under | none |
| S5a | 17.05 to 18.55 (1.5 s) | `traj`, 77.50 to 79.00. The card is read: card reader strip with the numbers, then "Press INIT" with the INIT button lit. | **PB pan.** Window `w=1000 h=650`, `y=150`, `x` from 150 (card reader) to 900 (INIT button), scale 1.08 to 1080x702. | Line 5 (17.10 to 21.51) "Press go" | Under | none |
| S5b | 18.55 to 21.65 (3.1 s) | `traj`, 88.00 to 91.10. The shell starts: hop 1 dot, hop counter, the first punched cards, card tiles stacking at the bottom. | **PB.** Crop `x=0 y=30 w=1340 h=980` (arc, readouts, punched cards, card tiles, no sidebar), scale to 1080x790. | Line 5 "flies the shell, punching a card for every second" | Under | none |
| S6 | 21.65 to 23.20 (1.55 s) | `traj`, 119.80 to 121.35. Dot arc near the top, the "Highest point" tag showing (hop 17). | Same crop as S5b. | Line 6 (21.96 to 24.42) "Up to the highest point" | Under | none |
| S7 | 23.20 to 26.50 (3.3 s) | `traj`, 137.10 to 140.40. The shell comes down, **"Landed" at about 138.3 (out about 24.4)**, then the "You did it!" screen. The EDL's clean window for this stretch is 132.60 to 140.40. | Same crop as S5b. | Line 6 "and down to the landing"; Line 7 starts 24.87 | Under | none |
| S8 | 26.50 to 29.90 (3.4 s) | Photo `P3-two-women-operating-eniac.jpg` (5682x3899, U.S. Army, PD, Feb 1946). Cabled panels, one operator plugging in. | Ken Burns. 9:16 crop 2193x3899 from `x=2450` (cabled panels plus the right-hand operator), pre-cropped before zoompan, push 1.00 to 1.12. | Line 7 "a reconstruction of the flight ENIAC worked out at its 1946 unveiling" (to about 29.9) | Under | none |
| S9a | 29.90 to 31.00 (1.1 s) | `eniac-touch-walkthrough-primes.mp4`, 105.00 to 106.10. Primes card pile-up. | **PB.** Crop `x=20 y=50 w=1380 h=860`, scale to 1080x673. | Line 7 "And two more missions" (about 30.2) | Under | none |
| S9b | 31.00 to 32.00 (1.0 s) | `eniac-touch-walkthrough-squares.mp4`, 136.00 to 137.00. Accumulators 1 and 2, lamps, reading 3 and 9. | **PB.** Crop `x=0 y=40 w=1100 h=760`, scale to 1080x746. | "...are waiting" (to 31.98) | Under | none |
| S10 | 32.00 to 45.00 (13.0 s) | `eniac-touch-tour.mp4`, 22.00 to 35.00. Live attract room again, echoing the open. | **CW** at `x=616 y=0 w=607 h=1080`, centred on the button; this window also sits between the two attract plates. Slow push 1.00 to 1.08, darkened about 35% (`eq=brightness=-0.35`) so the end text reads. | Line 8 (32.43 to 42.69) | Swell to up from 42.7, fade out 44.2 to 45.0 | **End text**, 33.5 to 45.0 |

Total 12 clips, 10 numbered shots. Everything at S5a to S9b is sized to the real WAV lengths, but the kiosk playback times are planned: if the line timings move, slide the cuts, not the source windows.

### Your four moments, checked against the file

I sampled `traj` at 0.5 to 2 s steps (not frame-stepped), so every in and out point below needs a frame step at assembly.
- **Arc illustration:** the "path of a shell" illustration is **16 to 23 s** (dots plotted from 16, full arc by 19, held to 23). At 12 s the file is the "Pick a mission" screen, and at 14.5 s a "Waking ENIAC up" spinner.
- **Cabling and counter:** **63 to 72 s.** The "111 cables, 0 switches" frame is at about **66 s**; the counter then runs 185, 222, 296/0 (69), 296/288 (70), 1,008 (71), 1,147 (72).
- **Card reader and INIT:** "Press READ" about **74 s**, "Press INIT" about **78 to 84 s**. At 96 s the shell is already flying (hop 3).
- **Dots, cards, highest point:** the first hops are slow (hop 1 at 88, hop 2 at 92, hop 3 at 96, hop 7 at 108). **"Highest point" shows at about 120 s (hop 17)**, not 130. The arc jumps from hop 20 to hop 32 at about 132.4 (a hand cut in the source). "Landed" is at about 138.3 s, and the card tiles stack along the bottom the whole way.

### Frame-step check for the simulator author's name

The brief says no visible credit. Where it appears in the source files and how each shot avoids it:
- **Mission title card, `traj` 0 to about 10.5 s.** Its body text names the author. Nothing before 16.2 s is used.
- **Kiosk footer, bottom of every kiosk frame (all of `traj`, squares, primes).** Every crop ends at y=1010 or above, so it is cut off.
- **Attract plates, `tour` attract screen.** The left plate rotates and shows the author's name at tour 12 s and 30 s; the right plate holds other text. S1 (`x=480..1360`) and S10 (`x=616..1223`) both fall between the two plates, so neither is in frame. Confirm by stepping frames across 18.0 to 24.1 and 22.0 to 35.0.
- **S5a crop** reaches `x=1900` at its right end (the INIT button). Check that no rotating plate or footer text sits inside it. It should not, since the footer is below y=1010.
- Photos P1 and P3 carry no text. No on-screen photo credit (see section 5).

### Other assembly notes
1. **FFmpeg build:** the default `/opt/homebrew/bin/ffmpeg` has no `drawtext`. Use `/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg`, as `scripts/assemble_v5.py` does.
2. **Safe zone:** Shorts, Reels and TikTok cover about the top 250 px, bottom 400 px and right 120 px with UI. Both overlays stay inside y=250 to 1500.
3. **S1 hook text:** the PB crop leaves bands of about 346 px, so the hook text at about y=300 sits over the top band and the top edge of the picture. Nudge at assembly.
4. **Source speeds:** S5b, S6 and S7 are real-time kiosk playback at its slow default, so the shell moves slowly in S5b to S6. If it drags, cut S5b to a tighter window (hops 1 to 3) rather than speeding the footage up.

---

## 3. On-screen overlays (the only two)

Same font and look as the long video (`scripts/assemble_v5.py`): white fill, 5 px black outline, centred, FFmpeg `drawtext`. Never baked into any image.

**Overlay 1, hook (0.0 to 3.6 s, fade in 0.15 s, out 0.25 s)**, about 88 pt, uppercase, about y=300:
```
PROGRAM ENIAC
WITH YOUR FINGERTIP
```

**Overlay 2, invite (33.5 to 45.0 s, fade in 0.3 s, held to the end)**, centred at about y=880 to 1100. Line 1 is about 64 pt, line 2 about 88 pt:
```
VCF museum · Wall, NJ
vcfed.org
```

No subtitles, no caption boxes, no photo credit on screen.

---

## 4. Title, description, hashtags

**Title (YouTube, 55 characters):**
`ENIAC flew a shell in 1946. You can program it. #Shorts`

(Alternative, closer to the hook: `Program ENIAC with your fingertip #Shorts`, 41 characters.)

**Description:**
```
ENIAC was built for the Army to work out where artillery shells would land. At the Vintage Computer Federation museum, you can wire up that shell flight yourself on a touch screen, cable by cable, and watch ENIAC punch a card for every second of flight.

The touch-screen exhibit is at the VCF, inside the InfoAge Science and History Museums in Wall, NJ. It runs a simulator of the machine. Two more missions are waiting: Squares and Primes.

Watch the full walkthrough (it credits the people behind it): https://www.youtube.com/watch?v=KoWgoNo3F1k
Plan your visit: https://vcfed.org

#Shorts #ENIAC #ComputerHistory #VintageComputing #VCF #InfoAge #NewJersey #Museum

Music: "Hot Swing" by Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/
Photos: U.S. Army Photos, public domain.
```

**Hashtags (8):** `#Shorts #ENIAC #ComputerHistory #VintageComputing #VCF #InfoAge #NewJersey #Museum`

The main title says ENIAC "flew a shell in 1946", but the kiosk flight is a reconstruction (line 7). Use the alternative title for zero overclaim.

**Reels and TikTok captions (Nick posts):**
- **Reels:** "ENIAC was built to work out where shells would land. Now you can wire up the flight yourself, with a fingertip. VCF museum, Wall, NJ. vcfed.org #ENIAC #ComputerHistory #VintageComputing #NewJersey #Museum #Reels"
- **TikTok:** "Program a 1946 computer with your fingertip. VCF museum, Wall NJ #ENIAC #ComputerHistory #VintageComputing #NJ #museum"

**Publish plan:** @nickdnj Short, related video set to `KoWgoNo3F1k`. Run `youtube-whoami.py` before the upload. Draft only until Nick approves.

---

## 5. Open points for Nick

1. **Title:** "ENIAC flew a shell in 1946" overstates, since the kiosk flight is a reconstruction. Use the alternative title, or reword to "ENIAC worked out shell flights" instead?
2. **Hot Swing** is a stand-in track (see `assets/audio/music/credits.md`). If the YouTube Audio Library pick replaces it, the credit line changes.
3. **No on-screen photo credit** (brief allows only two overlays); credit is "U.S. Army Photos, public domain" in the description.
