# Short 30 s v2: "Could you?" (Gate 1)

**Status:** GATE 1, v2 creative pass (2026-10-12). Storyboard and build plan only. Nothing rendered, nothing published. v1 (option A, "Touch the screen") is kept at `storyboard/short-30s.v1.md`. Address and hours sources are in v1 section 4.
**Goal (Jeff Brace):** bring people to the Vintage Computer Federation museum. Do not teach ENIAC.
**Format:** 1080x1920, **30.000 s = exactly 18 bars** of the music at 144 BPM. YouTube Shorts on @nickdnj, then Reels and TikTok.
**Inherits:** M1 (lamps 0 at the bottom, 9 at the top, the sign lamp level with 0 and 1: footage from kiosk main v6 only, never v5, never flipped). M2: **spoken ENIAC = 0**.
**Not in this Short:** the simulator author's name or credit, the attract plates (they rotate through names including his), the kiosk footer, "new", "opening", "finished", anything about "first" or "only", photos.

---

## 1. Concepts considered

| | Concept | One-line pitch |
|---|---|---|
| **A (pick)** | **Could you?** | Open on a question, "Could you program a computer from 1946?". Tap, the lamps count to 144 on the beat, the whole machine lights up, the kiosk's own screen says "You programmed ENIAC.", the voice says "Yes. With your fingertip.", then come and try it. |
| B | v1, refined | Calm attract hold, one tap, two lamp sweeps, end card. The approved baseline, cut to the beat. |
| C | Three missions, three bars | Squares lamps, Primes checkers and the Trajectory arc, one musical phrase each, then the card. A faster version of the 45 s teaser. |

**Why A.** It is the three-beat shape Nick and Jeff asked for (touch, watch, come see), with a question and an answer around it, so the 30 s has a story and not just a sequence. The payoff is the kiosk's own words ("You programmed ENIAC." and "You counted up to 12 x 12 = 144."), not our claim, and it pays off the 144 the viewer has just watched the lamps count to. B is safe but has no payoff, and its 7 s attract hold loses thumbs. C teaches, which Jeff asked us not to do, and it overlaps the published 45 s Short.

---

## 2. Music grid

Kevin MacLeod "Hot Swing" (approved stand-in, CC BY). **144.0 BPM**, beat 0.41667 s, bar 1.66667 s. Downbeats in the file: D_n = n x 1.66667 - 0.008 s. The ending: a stop at about 45.20 to 45.40, hits at 45.56 and 46.38, and the final chord at 46.66 (= D_28). Machine-measured on 2026-10-12. **Confirm by ear at Gate 2. If the Audio Library track replaces Hot Swing, re-measure; the table is written in beats so it can be re-timed.**

**Music in point: `-ss 18.325` (D_11).** The track starts a new, louder section here (the RMS jumps at about 18 s). Output = file - 18.325:

| Event | Output (s) |
|---|---|
| Section start, downbeat | 0.000 |
| Stop (gap) | 26.88 to 27.08 |
| Hit 1 | **27.235** |
| Hit 2 | **28.055** |
| Final chord (bar 18 downbeat) | **28.333** |
| Chord rings to near silence | 29.7 to 30.0 |

No fade. The chord decays into the loop seam, and the next loop starts on a downbeat with the full band.

---

## 3. Voice (three short lines, zero spoken ENIAC)

Nick 2, id `6SxuwKUiBpZjFTc06v9Y`, stability 0.5, similarity 0.75, style 0.4, speed 1.12, `eleven_multilingual_v2`, project pronunciation dictionary attached (the Ennie-ack alias; no line here says ENIAC, but every call stays identical). If the voice call fails, stop and ask; no fallback voice. Years are written as words. Duration estimate: 0.36 s per word, from the existing Short takes (1.068 s for 3 words, 3.065 s for 9, 4.458 s for 12). Replace with the real WAV lengths.

| ID | TTS text | Words | Est. | Starts | Job |
|---|---|---|---|---|---|
| **Q** | "Could you program a computer from nineteen forty-six?" | 8 | about 2.9 s | 0.10 | The tension. **Same take as the 8 s cut** (`assets/audio/shorts-v2/Q.wav`) |
| **Y** | "Yes. With your fingertip." | 4 | about 1.6 s (with the pause after "Yes.") | 18.45 | The answer, spoken over the kiosk's "You programmed ENIAC." It echoes the "fingertip" hook from the 45 s Short that Jeff liked |
| **C** | "Come try it, at the Vintage Computer Federation." | 8 | about 2.9 s | 21.75 | The ask, with the museum named aloud |

Total 20 words, about 7.4 s of speech. **Spoken ENIAC: 0.** ENIAC is on screen: the kiosk's own wordmark at frame 0, the hook, and the payoff screen. Whisper cannot tell how ENIAC is pronounced (it transcribes every variant the same), so the script avoids saying it and this cut needs no listening-gate reel. A Whisper pass still checks the words, including "Vintage Computer Federation".

No voice from 5.0 to 18.3 s. That stretch is the "watch" beat: music up, lamps cut to the beat.

---

## 4. Beat table

Output 30 fps; a cut at time t goes on frame round(t x 30), at most 16.7 ms off the beat. Bars and beats count from 0.

| Shot | Bars (beats) | Out (s) | Source and in/out | Picture | Voice | Music | Overlay / FX |
|---|---|---|---|---|---|---|---|
| **S1** TOUCH | 1-2 (b0 to b8) | 0.000 to 3.333 | **F1** attract, `[T_tap - 3.194, T_tap + 0.139]` (T_tap = the logged tap time). Fallback, current `source-v6/eniac-touch-tour.mp4`: attract runs about 10 to 36 s and the tap is at about 36.2 (frame-step it), so about 33.0 to 36.34 | **Attract poster** (section 5, L1): the kiosk's ENIAC wordmark, the live room strip with its lamps moving, and the "Touch to program ENIAC" button | Q 0.10 to about 3.0 | section start, ducked under Q | **Hook** frame 0 to 3.20. **Tap ripple + tap click at 3.194** (the swung "and" of beat 7) on the button |
| **S2** | 3 (b8 to b12) | 3.333 to 5.000 | **F1** Pick a mission, settled (after its fade-in), 1.667 s. Fallback: tour about 37.5 to 39.17 | **Squares card**, large (L2): "1 / START HERE / Squares / Make ENIAC count in squares. / Start" | | up | Tap ripple + click at **4.861** on "Start" |
| **S3** WATCH | 4-6 (b12 to b24) | 5.000 to 10.000 | **F2** lamp run, beat-snapped (method in `short-8s.md` 5a). Fallback: current lamp clip, n=1 to 10 from run 2 (8.48 to 12.96), n=11 to 12 from run 1 (4.48, 4.92) | **Accumulator 2 with its readout** (L3), counting **1, 4, 9 ... 144**: **n=k on beat 11+k** (n=1 at 5.000, n=12 at 9.583), 144 held to 10.000 | | up, full band | **Bloom pulse on 144** at 9.583 |
| **S4** | 7-8 (b24 to b32) | 10.000 to 13.333 | `source-v6/eniac-touch-walkthrough-primes.mp4` **138.00 to 141.33**, real time (Full speed; the counter climbs through the 200s and 300s). Frame-step: Full already on, no button press in the crop | **Primes**: "TESTING / Accumulator 19 / [number]" and the 14 group-checker lamp grids (L4) | | up | none. Hard cut in on the bar-7 downbeat |
| **S5** | 9-11 (b32 to b44) | 13.333 to 18.333 | `source-v6/finale.mp4` **19.60 to 24.60**, "Here is every unit you used." with the room strip LIVE (the shell run) | **The whole machine**: a slow pan along the strip of accumulators, lamps moving in every panel (L5) | | up | none |
| **S6** PAYOFF | 12-13 (b44 to b52) | 18.333 to 21.667 | `source-v6/finale.mp4` **10.00 to 13.333** (the "You programmed ENIAC." hold is clean from about 9.0 to 16.4) | **Kiosk payoff** (L6): **"You programmed ENIAC."** above the Squares card **"You counted up to 12 x 12 = 144."** | **Y** 18.45 to about 20.05 | ducked under Y | none (the kiosk's text is the payoff). Push 1.00 to 1.04 |
| **S7** COME SEE | 14-18 (b52 to b72) | 21.667 to 30.000 | **F1** attract, `[T_tap - 3.194 - 8.333, T_tap - 3.194]`: the 8.333 s **immediately before S1's first frame** | Attract poster again (L1 layout), dimmed (section 5) | **C** 21.75 to about 24.65 | ducked under C, up from 24.8; stop, hit, hit, chord | **End card** builds line by line on beats 52 to 56; bloom on the background lamps at 27.235 and 28.055; **chord 28.333: vcfed.org flashes yellow** |

Lamps on screen: S1, S3, S4, S5 and S7 (the strip behind the card), about 25 of the 30 s.

**Frame 0:** the kiosk's ENIAC wordmark, live lamps and the button, with the hook on top. Bright and legible on the first frame. No fade-in, no black.

**Loop:** S7 is the stretch of attract footage that comes **directly before** S1's first frame, dimmed under the card. When the Short loops, the room-strip lamps keep moving across the seam without a jump: the lights come up, the card goes and the question returns. The music comes back from the decayed chord onto a downbeat. It is the most seamless loop available with this footage. (Fallback footage gives the same result: S7 = tour about 24.68 to 33.01.)

---

## 5. Layouts (pre-crop to 9:16 before any motion)

Every shot is composited onto a 1080x1920 canvas **before** any push or pan (the project rule: pre-crop to 9:16 before zoompan). Pushes use `scale=eval=frame` and a **centred `overlay` on a black canvas**, not a `crop` after the scale (the assembler found that form left-anchors). Background for every shot: the shot's main crop scaled to cover 1080x1920, `boxblur=40:5`, `eq=brightness=-0.30` (the existing `pb()`). Source coordinates below come from the current v6 frames (1920x1080). **Re-measure on F1 and F2**; the layout should be the same in the kiosk main build.

Some layouts are a **collage**: several crops from the **same live frame** stacked vertically. Each element is real and on the same screen at the same moment. The collage leaves out the plates, the footer and the status line, which is how the simulator credit stays out of frame.

**L1, attract poster** (S1, S7):
| Element | Source crop (w:h:x:y) | Scale | Placed at (x, y) |
|---|---|---|---|
| ENIAC wordmark | `450:115:120:70` | x1.60 to 720x184 | 180, 455 |
| Live room strip | `980:490:470:300` | x1.102 to 1080x540 | 0, 665 |
| "Touch to program ENIAC" button | `740:144:590:888` | x1.25 to 925x180 | 78, 1250 |

Left out: the tagline, the shell-path inset, the "Live: ..." line and **both plates** (the left plate rotates through the simulator credit, at about 30 to 34.5 s in the current tour). The strip scrolls slowly during the attract, so labels may slide in and out at the crop edges. That is fine. A label frozen half-cut is not: check at build. **Tap point: (540, 1340).**
S7 only: the whole poster `eq=brightness=-0.38`, the button layer at -0.20 (it stays readable under the card and works as a second ask).

**L2, Squares card** (S2): title crop `455:76:130:12` ("Pick a mission"), x1.40 to 637x106 at (222, 300). Card crop `544:640:80:184` (card 1, including START HERE), x1.45 to 789x928 at (146, 440). **Tap point, the Start button: (540, 1250).** Cards 2 and 3 and the footer are out.

**L3, accumulator** (S3): the same as the 8 s cut: `644:540:722:110` (ACCUMULATOR 2, the readout, the grid with 0 to 9 labels and the sign lamp; stops above REPEAT), x1.335 to 860x721 at (60, 600). The active ones digit sits at about x 890, clear of the right-side UI. Push 1.00 to 1.04.

**L4, Primes** (S4): `860:510:38:118` (TESTING readout plus all 14 checkers; the punched-card column, the right panel and the footer are out), x1.047 to 900x534 at (40, 690). Push 1.00 to 1.06. The checker tiles have no row labels, so a viewer cannot judge lamp order from them, but they are v6. Check one tile at full size against the A19 tile (0 at the bottom) at build.

**L5, the whole machine** (S5): window `820:492:x:200` on the finale strip (strip spans x 82 to 1838, y 200 to 692). Pan x = 82 + 936 x smoothstep(0, 5, t), from Function Table and Accumulator 1 toward Accumulator 8 and beyond. Scale x1.317 to 1080x648 at y 636. The headline, the "LIVE" pill (above y 200) and the "You used 38 of ENIAC's 40 panels" text (below y 692) are out.

**L6, payoff** (S6): headline crop `1145:105:70:140` ("You programmed ENIAC."), x0.751 to 860x79 at (110, 600). Squares card crop `566:298:82:362` ("1 SQUARES / You counted up to 12 x 12 = 144."), x1.48 to 838x441 at (121, 720). Left out: the "In 1946, setting up a job..." sub-line (small, and it is a history claim we do not need), the Primes and Trajectory cards, Next and the footer.

**Tap ripple** (S1, S2): an FFmpeg-drawn graphic, not an image with text. On a transparent 600x600 layer: `geq` alpha for a ring of radius R = 30 + 260 x u (u = (t - t0)/0.45, clamped 0 to 1), 10 px thick, alpha 220 x (1 - u), plus a filled 34 px dot at alpha 200 for the first 0.12 s (the "finger"). It is overlaid centred on the tap point. White ring, no hand graphic: the standard screen-recording convention for a touch.

**Bloom pulse** (S3 at 9.583; S7 at 27.235, 28.055 and 28.333): `split`, `gblur=sigma=14`, `blend=all_expr='min(255,A+B*K)'`, K = a sum of a x exp(-(T - t_i) x 8) x gte(T, t_i), with a = 0.55 on the hits and 1.0 on 144 and the chord. Lit lamps flare for about 0.2 s; it does not change what the lamps show. In S7 it goes on the poster layer under the text.

---

## 6. On-screen text (`drawtext` on `ffmpeg-full`; never baked into images)

Georgia Bold, white, 5 px black outline, centred on x=540, auto-shrunk to fit 840 px. **Safe area:** every line is inside y 250 to 1500 and x 120 to 960.

**Hook**, frame 0 to 3.20 (on at frame 0, fade out 2.95 to 3.20). It ends before the S2 title crop appears at y 300.
| Line | Text | Size | Centre y |
|---|---|---|---|
| 1 | `COULD YOU PROGRAM` | 66 pt (auto-shrinks) | 300 |
| 2 | `A 1946 COMPUTER?` | 66 pt | 382 |
Above the wordmark (top 455).

**End card**, from 21.667, held to 30.000. Each line fades in over 0.12 s on a beat:
| Line | Text | Size | Centre y | In at (beat) |
|---|---|---|---|---|
| 1 | `COME TRY IT` | 62 pt | 580 | 21.667 (b52) |
| 2 | `Vintage Computer Federation` | 56 pt (auto-shrinks) | 700 | 22.083 (b53) |
| 3 | `InfoAge · 2201 Marconi Rd · Wall, NJ` | 40 pt (auto-shrinks) | 790 | 22.500 (b54) |
| 4 | `Wed, Sat & Sun · 12 to 5` | 52 pt | 880 | 22.917 (b55) |
| 5 | `vcfed.org` | 100 pt | 1020 | 23.333 (b56) |
On the chord (28.333), a yellow copy of `vcfed.org` (`fontcolor=0xFFC23A`) fades in over 0.05 s and back out over 0.6 s, a "button" on the last hit. The card is fully built by 23.4 s and readable for 6.6 s, more on loops. The dimmed button "Touch to program ENIAC" stays visible below it, at y 1250 to 1430.

No subtitle track and no caption boxes in the picture. Two of the three spoken lines are on screen word for word (Q is the hook, C is card line 1). Y is answered visually by the kiosk's own headline.

---

## 7. Sound

- **Mix:** voice about -16 LUFS. Music "under" about -30 LUFS at 0.05 to 3.05 (Q), 18.40 to 20.10 (Y) and 21.70 to 24.75 (C), with 0.15 s smoothing. Music "up" about -17 LUFS everywhere else. It is a music-led Short, and the lamps need the band behind them.
- **Tap click (the one sound effect):** synthesised, so honestly sourced: 6 ms of white noise with a 1.5 ms exponential decay, first-differenced (a cheap high-pass), plus a 170 Hz sine with a 20 ms decay at half amplitude. Peak about -8 dBFS, placed at 3.194 and 4.861, sitting about 8 dB under the voice. Save as `assets/audio/sfx/tap.wav` with a note "synthesised UI tap, not a recording of ENIAC or of the kiosk". It is the sound of a finger on glass, which is what the picture shows.
- **No relay or card-punch sounds on the lamps.** The accumulators were electronic, so a click per count would suggest a sound ENIAC did not make while counting. The primes shot does not show cards being punched (that column is cropped out), so it gets no punch sound either.
- **Master:** -14 LUFS integrated, **true peak <= -1.5 dBTP** (limiter ceiling -2.0, measured with `ebur128=peak=true` on the final AAC). v1 draft measured -14.1 / -4.5, but this mix is louder in the middle, so measure again.
- AAC 192 kb/s 44.1 kHz, H.264 CRF 18, yuv420p, +faststart.

---

## 8. Title, description, captions (draft; Nick publishes)

**Channel:** @nickdnj. **Related video:** the v6 long cut once it is published (empty until then). Run `/Users/nickd/Workspaces/AgentArchitect/scripts/youtube-whoami.py` before any upload.

**Title (43 chars):** `Could you program a 1946 computer? #Shorts`
Alternatives: `Program ENIAC with your fingertip, in NJ #Shorts` (48) · `You programmed ENIAC. (Yes, you can.) #Shorts` (45)

**Description:**
```
Could you program a computer from 1946? Yes, with your fingertip. At the Vintage Computer Federation museum, a touch screen on a simulator of ENIAC lets you set up a job and watch the lamps work through it.

The touch screen is on the museum floor and still being tested with visitors.

Vintage Computer Federation museum
InfoAge Science and History Museums, 2201 Marconi Rd, Wall, NJ 07719
Open Wed, Sat and Sun, 12 to 5. Check vcfed.org before you go.
https://vcfed.org

#Shorts #ENIAC #ComputerHistory #VintageComputing #VCF #InfoAge #NewJersey #Museum

Music: "Hot Swing" by Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
http://creativecommons.org/licenses/by/4.0/
```
(The "still being tested" line is Nick's call. It is true and gives a reason to come, but whether to say so publicly is his decision. Nothing else in the Short or the copy implies a finished exhibit. When the v6 long cut is up, add a line "Full walkthrough: <link>"; that video carries the credits.)

**YouTube captions:** an SRT with Q (0.10 to 3.00), Y (18.45 to 20.05) and C (21.75 to 24.65), years as digits.

**Reels:** "Could you program a 1946 computer? Yes, with your fingertip, on a touch screen on a simulator of ENIAC at the Vintage Computer Federation museum, InfoAge, Wall NJ. Wed, Sat, Sun 12 to 5. vcfed.org #ENIAC #ComputerHistory #VintageComputing #NewJersey #Museum #Reels"
**TikTok:** "Could you program a 1946 computer? Come find out. VCF museum, Wall NJ #ENIAC #ComputerHistory #VintageComputing #NJ #museum"

---

## 9. New footage needed (M1 records from kiosk main)

All clips: kiosk main build (lamps 0 at the bottom), `CLEAN=1` (no caption boxes), **no cursor and no touch marker**, 1920x1080 at 25 fps as before. **If the harness allows, use `deviceScaleFactor: 2`** (a 3840x2160 capture of the same 1920x1080 layout): every shot here enlarges a crop 1.0 to 1.6x, so double-density pixels make the text and lamps visibly sharper. Each clip gets a sidecar `<clip>.events.json` with ms timestamps (and x,y in video px) of every tap and every screen change. Those times become the in and out points, with no guessing from contact sheets.

| ID | Priority | What | Spec |
|---|---|---|---|
| **F1** `attract-tap.mp4` | **Required** | Attract screen, one tap, Pick a mission, Squares Start | Fresh load to the attract screen. Let it run **at least 20 s untouched** with the room strip live (S7 needs 8.33 s plus S1's 3.33 s before the tap, plus slack). Then **one tap** on the centre of "Touch to program ENIAC". Record Pick a mission for **at least 5 s after its fade-in finishes**, then one tap on card 1's **Start**, and record 3 s more. About 30 s. Log: the tap times and points, the time Pick a mission is fully in, and (useful, not needed) the times the plates change. |
| **F2** `squares-fullspeed-lamps.mp4` | **Required** (shared with the 8 s; the re-record in progress) | One unbroken Squares run, 0 to 144 | Squares, cables placed; CLEAR, Speed **Full**, "Keep pressing for me". **One unbroken run from readout 0 to 144, then hold on 144 for at least 3 s**; then CLEAR and a second full run as a spare. About 25 to 30 s. Log every Accumulator 2 readout change (DOM text change) in ms. |
| F3 `finale-hold.mp4` | Optional (exists today) | Payoff and room | The finale from "You programmed ENIAC." (at least 6 s hold after its fade-in) through "Here is every unit you used." (at least 8 s hold with the strip live). Today's `finale.mp4` already has both (9.0 to 16.4 and 19.5 to 27). Re-record only for double density. |
| F4 `primes-fullspeed.mp4` | Optional (exists today) | Busy checkers | Primes, already at Full when recording starts (so no mode change in frame), 15 s of the run between about 200 and 450 on the TESTING readout. Today's walkthrough has it at about 132 to 156. Re-record only for double density. |

After recording, before any use: frame-check the lamp order (0 at the bottom, 9 at the top, the sign lamp level with 0 and 1) on F2 and on one strip frame of F1.

---

## 10. Gate checklist

1. Nick picks concept A (or B or C), the title, and whether to keep the "still being tested" line.
2. Voice: three new takes, Q (shared with the 8 s), Y and C. Whisper pass on the words. No ENIAC listening reel (spoken ENIAC = 0).
3. Footage: F1 and F2 recorded and lamp order checked. Until they land, a proof build can run on the fallbacks named in section 4.
4. Music: confirm by ear the downbeats at 3.333, 5.000, 10.000, 13.333, 18.333 and 21.667, the hits at 27.235 and 28.055, and the chord at 28.333.
5. Frame-step: no plate, footer, status line or simulator credit in any crop; ripples sit on the button and on Start; the S3 step joints; S7 to S1 is continuous across the loop seam.
6. Loudness on the final file: -14 LUFS, TP <= -1.5 dBTP.
7. Gate 2 review: per-line WAVs (Q, Y, C) plus one review MP3 of the finished mix.
8. Draft only. `youtube-whoami.py` before any upload; Nick publishes.

## 11. What is better than v1, and why

| v1 | v2 | Why it matters |
|---|---|---|
| 7.2 s attract hold before anything happens | A question, a tap and a cut within 3.3 s; a new shot every 1.7 to 5 s, every cut on a downbeat | Shorts decide in 1 to 3 s |
| Sequence with no payoff | Question, then the lamps count to 144, then "You programmed ENIAC. / You counted up to 12 x 12 = 144.", then "Yes. With your fingertip." | A story with an answer, and the answer is in the kiosk's own words |
| One accumulator in two 6 s INIT sweeps (about 1 s of movement each) | Lamps beat-locked to the music, 14 checkers at Full speed, then the whole machine lit up | Lamps as the star, with real motion |
| Opens on CTA wording ("Touch the screen.") | Opens on tension ("Could you ...?") | A reason to keep watching |
| Music `-ss 20`: chord at 26.7, a 1.2 s fade, no picture event on it | Music `-ss 18.325`: 30 s = 18 bars, cuts on downbeats, end card builds on beats, chord on vcfed.org | The edit is cut to the music |
| Loop: hard cut from card to hook | The card's background is the attract footage right before frame 0, so the lamps run straight across the seam | A loop you do not notice |
| 607 px full-height crop of the attract (the button did not fit, and plates were near the edge) | A collage of real elements from one live frame: wordmark, strip, button | Legible on a phone, and the credit plates are left out by design |
| No sound design | One honest synthesised tap click; deliberately no fake machine sounds | A touch you can hear, without an inaccuracy experts would notice |
