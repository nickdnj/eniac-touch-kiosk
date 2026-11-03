# Short 8 s v2: "Count to 144" (Gate 1)

**Status:** GATE 1, v2 creative pass (2026-10-12). Storyboard and build plan only. Nothing rendered, nothing published. v1 (option A, "Lamp by lamp") is kept at `storyboard/short-8s.v1.md`.
**Goal (Jeff Brace):** bring people to the Vintage Computer Federation museum. Do not teach ENIAC.
**Format:** 1080x1920, **8.333 s** (5 bars of the music at 144 BPM; see section 6 for the 8.000 s option), YouTube Shorts on @nickdnj, then Reels and TikTok.
**Inherits:** M1 (lamps 0 at the bottom, 9 at the top, the sign lamp level with 0 and 1: footage from kiosk main v6 only, never v5, never flipped). M2 (pronunciation): **spoken ENIAC = 0**.

---

## 1. Concepts considered

| | Concept | One-line pitch |
|---|---|---|
| **A (pick)** | **Count to 144** | One big accumulator counts 1, 4, 9 ... 144, one step per beat. The last three steps land on the track's stop-time hits, and 144 lights up on the final chord. |
| B | 1946 rewind | A year counter overlay rolls 2026 down to 1946 over the lamps and lands on the chord. |
| C | One tap | Attract button, tap ripple, hard cut to the lamps, then the card. Three shots in 8 s. |

**Why A.** The counter people watch is real: the simulator's own readout climbs 1, 4, 9, 16 and so on, and the lamps change with it. Nothing is invented. A climbing number is a classic watch-to-the-end device, and 144 landing on the final chord is the payoff. B puts a made-up number on top of a real one, so two counters compete. C has three shots in 8 s, so none of them gets room to land, and it needs footage that does not exist yet. A works with the lamp clip that exists today, and gets better with the re-record.

---

## 2. Music grid (all timing hangs on this)

Kevin MacLeod "Hot Swing" (`assets/audio/music/Hot Swing.mp3`, CC BY, approved stand-in). Measured on 2026-10-12 with an onset analysis (numpy spectral flux; scratch script, not kept):
- **Tempo 144.0 BPM.** Beat = 0.41667 s, bar = 1.66667 s.
- **Downbeats in the file:** D_n = n x 1.66667 - 0.008 s. The first note is at 1.66 s (D_1). The final chord is at **46.66 s = D_28**, so the grid holds across the whole track (it is sequenced).
- **The ending:** full band to about 45.2 s, a stop (about 45.20 to 45.40), a hit at **45.56**, a hit at **46.38**, the final chord at **46.66**, which rings out to about -40 dB by 48.0 s.
- **Confirm by ear at Gate 2.** The onset times are machine-measured. If one is off by a frame or two, move the matching lamp step, not the music.
- **If Hot Swing is swapped** for the Audio Library track, re-measure tempo and hits. The beat table below is written in beats so it can be re-timed.

**Music in point for this cut: `-ss 41.659` (D_25).** Output time = file time - 41.659:

| Event | File (s) | Output (s) |
|---|---|---|
| Start, full band | 41.659 | 0.000 |
| Stop (gap) | 45.20 to 45.40 | 3.54 to 3.74 |
| Hit 1 | 45.56 | **3.901** |
| Hit 2 | 46.38 | **4.721** |
| Final chord | 46.66 | **5.001** |
| Chord rings out to about -40 dB | 48.0 | 6.34 |
| End of Short | 49.992 | 8.333 |

No fade. The last 2 s are the chord decaying into near silence. That quiet tail is the loop seam: the next loop starts on a downbeat with the full band, so it sounds like "again from the top".

**v1 problem this fixes:** the assembled `output/short-8s.mp4` uses `-ss 42`, which puts the final chord at 4.66 s, inside the voice duck (music held under until 4.9 s), and leaves about 1.5 s of near silence at the end with no picture event. The payoff chord is currently buried under the voice.

---

## 3. Voice (one sentence, zero spoken ENIAC)

Voice: Nick 2, id `6SxuwKUiBpZjFTc06v9Y`, stability 0.5, similarity 0.75, style 0.4, speed 1.12, `eleven_multilingual_v2`, with the project pronunciation dictionary attached (Ennie-ack alias for ENIAC). The alias does nothing here because the line does not say ENIAC; attach it anyway so every call is identical. If the voice call fails, stop and ask. No fallback voice.

| ID | TTS text | Words | Est. duration | File |
|---|---|---|---|---|
| **Q** | "Could you program a computer from nineteen forty-six?" | 8 | about 2.9 s (0.36 s/word, measured on the existing Short lines: 1.068 s for 3 words, 3.065 s for 9, 4.458 s for 12) | `assets/audio/shorts-v2/Q.wav` (new, **shared with the 30 s cut**: one take, one review) |

- Placed at **0.10 s**, ends about 3.0 s, before the stop at 3.54. The music ducks under it, then comes up for the hits.
- **Spoken ENIAC: 0.** ENIAC is on screen from frame 0 (hook) and nowhere in the voice. Whisper cannot judge how ENIAC is said (it transcribes every variant the same), so the safe choice is not to say it. This cut needs no listening-gate reel. A Whisper pass still confirms the words.
- The question is the tension; the picture answers it (the lamps count, the card says where you can do it). There is deliberately no spoken answer: a voice over the final chord would step on the payoff.
- Optional, default OFF: a second take, **"Come find out."** (3 words, about 1.1 s), at 5.10 s if Nick wants a spoken CTA. It would sit on the chord, so it is off by default.
- Fallback if Nick prefers the museum named aloud: the existing v1 take `assets/audio/short-8s/L1.wav` ("Come watch a nineteen forty-six computer work, at the Vintage Computer Federation.", 4.458 s) fits 0.10 to 4.56 s under the same picture, but it covers hits 1 and 2 and it has no question in it.

---

## 4. Beat table

Output 30 fps. A cut at time t goes on frame round(t x 30). That is at most 16.7 ms off the beat, which you cannot see or hear. (24 fps would make every beat exactly 10 frames, if Nick prefers that.)

One shot, **LAMP**: Accumulator 2 (the one that holds the squares), with its readout. The beat-snap method is in section 5.

| Beat | Out time (s) | Picture: LAMP state (readout / lamps) | Effect | Voice | Music | Overlay |
|---|---|---|---|---|---|---|
| 0 | 0.000 | **n=1: readout `1`**. Ones-digit lamp on row 1, all other digits on row 0 | panel at full brightness, push starts 1.000 | Q starts 0.10 | full band, ducked from 0.05 | **Hook** in (frame 0, no fade-in) |
| 1 | 0.417 | n=2: `4` | | Q | under | Hook |
| 2 | 0.833 | n=3: `9` | | Q | under | Hook |
| 3 | 1.250 | n=4: `16` | | Q | under | Hook |
| 4 | 1.667 | n=5: `25` (bar 2) | | Q | under | Hook |
| 5 | 2.083 | n=6: `36` | | Q | under | Hook |
| 6 | 2.500 | n=7: `49` | | Q | under | Hook |
| 7 | 2.917 | n=8: `64` | | Q ends about 3.0 | under, release from 3.05 | Hook |
| 8 | 3.333 | n=9: `81` (bar 3) | | | **up** | Hook |
| (stop) | 3.54 to 3.74 | `81` holds | | | band stops | Hook |
| hit 1 | **3.901** | n=10: `100` | **bloom pulse**, small | | hit | Hook |
| hit 2 | **4.721** | n=11: `121` | bloom pulse, small | | hit | Hook out 4.45 to 4.70 |
| chord | **5.001** | **n=12: `144`** | **bloom pulse, big**; then the panel dims to 40% over 0.25 s | | **final chord** | **End card** in on the chord (fade 0.12 s) |
| | 5.0 to 8.333 | `144` holds, dimmed, push continues to 1.040 | | | chord rings out to near silence | End card held to the last frame |

Lamps on screen: 100% of the Short. The count runs 5.0 s, then the card holds 3.33 s (and gets read again on every loop).

**Frame 0** (Shorts autoplay; must read without motion): readout `1`, a lit lamp, and the hook text, all on a dark panel. No black frame, no fade-in.

**Loop.** The last frame is a dimmed `144` under the card, and the first frame is a bright `1` with the hook. It reads as the accumulator clearing and counting again, and the music goes from the decayed chord back into the full band on a downbeat. The seam is part of the joke, not a glitch.

---

## 5. Picture build

### 5a. Source and the beat-snap

**Preferred source:** the re-record **F2** (`squares-fullspeed-lamps.mp4` from kiosk main, one unbroken run 0 to 144; spec in section 9).
**Works today with:** `assets/video/source-v6/squares-fullspeed-lamps.mp4` (14.0 s, 1920x1080, 25 fps, v6, lamp order verified by the assembler). Readouts in v6 are clean: no "3333333333" flicker in any frame (checked frame by frame 2026-10-12).

Step frames in the current clip (first frame showing the new readout; frame-step each one again at build):

| n | readout | run 1 (s) | run 2 (s) |
|---|---|---|---|
| 0 | 0 | | 6.80 (after CLEAR) |
| 1 | 1 | 0.00 | 8.48 |
| 2 | 4 | 0.04 | 9.04 |
| 3 | 9 | 0.64 | 9.64 |
| 4 | 16 | 1.24 | 10.24 |
| 5 | 25 | 1.72 | 10.72 |
| 6 | 36 | 2.20 | 11.12 |
| 7 | 49 | 2.64 | 11.60 |
| 8 | 64 | 3.08 | 12.04 |
| 9 | 81 | 3.52 | 12.52 |
| 10 | 100 | 4.00 | 12.96 |
| 11 | 121 | 4.48 | 13.44 |
| 12 | 144 | 4.92 (holds to 6.80) | not reached (clip ends 14.0) |

With today's clip, take n=1 to 10 from run 2 and n=11 to 12 from run 1. Inside the crop the two runs are identical frame for frame (same lamp states, same readouts). The only parts that differ, the notebook tape and the cycling unit, are outside the crop.

**Beat-snap (no speed change):** in the kiosk the steps come every 0.40 to 0.60 s, not on a grid. Each step becomes its own segment: start 2 frames (0.08 s) before the step frame, so the lamp's glow transition plays out on the beat, and run for exactly the beat-table dwell. Inside the crop, the frames between steps are static. So if the dwell is longer than the source has, hold the last frame (`tpad=stop_mode=clone`), and if it is shorter, trim. **Footage is never sped up or slowed down.** Only the static waits between steps change length. The numbers, the lamp states and their order are the simulator's own. Concat the 12 segments, then frame-step each joint.

### 5b. Crop and layout (pre-crop to 9:16 before any motion)

- **Crop (source px):** `crop=644:540:722:110`. That is the "ACCUMULATOR 2 / helper readout / [number]" header plus the full lamp grid with the 0 to 9 row labels and the sign lamp. It stops at y=650, above the REPEAT/PROGRAM rows. The kiosk footer (y about 1035 to 1075, where the simulator credit is) is far outside the crop.
- **Scale** to 860x721 (x1.335). **Place** at x=60, y=560 on the 1080x1920 canvas, so the panel spans x 60 to 920 and y 560 to 1281. The ones-digit column, the most active one, sits at about x 890, clear of the Shorts like/comment column (right 120 px).
- **Background:** the same crop scaled to cover 1080x1920, `boxblur=40:5`, `eq=brightness=-0.30` (the `pb()` fill).
- **Push:** composite to 1080x1920 first, then scale 1.000 to 1.040 over 0 to 8.333 s with `scale=eval=frame` and a **centred `overlay` on a black canvas**. Not `crop=1080:1920` after the scale: the assembler found that form stays left/top anchored.
- **Bloom pulse (lamps flare on the hits):** `split` the composite, `gblur=sigma=14` one copy, and blend it back with `blend=all_expr='min(255,A+B*K)'`, where K = 0.55*exp(-(T-3.901)*9)*gte(T,3.901) + 0.55*exp(-(T-4.721)*9)*gte(T,4.721) + 1.0*exp(-(T-5.001)*6)*gte(T,5.001). The lit lamps glow harder for about 0.2 s; the dark background barely changes. It is a picture effect on the lamps, not a change to what they show.
- **Dim for the card:** from 5.001, `eq=brightness` ramps 0 to -0.32 over 0.25 s. The lamps stay visible behind the text.

---

## 6. On-screen text (FFmpeg `drawtext` on `ffmpeg-full`; never baked into images)

Georgia Bold, white, 5 px black outline, centred on x=540, auto-shrunk to fit 840 px (x 120 to 960). Safe area for Shorts UI: text inside y 250 to 1500, x 120 to 960.

**Hook**, 0.000 to 4.70 (on at frame 0, fade out 4.45 to 4.70):

| Line | Text | Size | Centre y | Fits? |
|---|---|---|---|---|
| 1 | `ENIAC · 1946` | 96 pt | 330 | about 610 px wide: yes |
| 2 | `COULD YOU PROGRAM IT?` | 54 pt | 440 | about 760 px: yes |

Both are above the panel (top at 560) and below the 250 px top UI band.

**End card**, 5.001 to 8.333 (fade in 0.12 s on the chord, held to the last frame), over the dimmed panel:

| Line | Text | Size | Centre y |
|---|---|---|---|
| 1 | `Vintage Computer Federation` | 56 pt (auto-shrinks to fit 840) | 760 |
| 2 | `InfoAge · 2201 Marconi Rd · Wall, NJ` | 40 pt (auto-shrinks) | 850 |
| 3 | `Wed, Sat & Sun · 12 to 5` | 50 pt | 940 |
| 4 | `vcfed.org` | 100 pt | 1080 |

All four lines sit inside y 700 to 1140 and x 120 to 960. Address and hours are those Nick confirmed on 2026-10-12. Sources are listed in `storyboard/short-30s.v1.md` section 4 (vcfed.org/museum-info and infoage.org/visit). The card is busy for 3.3 s, but an 8 s Short is watched 2 or 3 times in a row, and vcfed.org is the line that has to land, so it is the largest.

No hashtags, no subtitles track and no caption boxes in the picture. The spoken question is already on screen (hook line 2).

---

## 7. Sound

- **Mix:** voice about -16 LUFS. Music "under" about -30 LUFS for 0.05 to 3.05 s (0.15 s smoothing), "up" about -17 LUFS from 3.2 s to the end so the hits and chord hit hard.
- **No sound effects on the lamps, on purpose.** ENIAC's accumulators were electronic, so a relay click on each count would suggest a sound the machine did not make while counting, and this round's audience (the simulator's author and the museum) would hear that. The music's hits do the job.
- **Master:** -14 LUFS integrated, **true peak <= -1.5 dBTP** (target -2.0 at the limiter, measured with `ebur128=peak=true` on the final AAC, not on the WAV). v1 measured -14.0 LUFS and TP -4.7, which passes, but this cut is louder at the chord, so measure again. At 8 s, integrated loudness rests on a few blocks: measure the finished file.
- AAC 192 kb/s 44.1 kHz, H.264 CRF 18, yuv420p, +faststart.

---

## 8. Title, description, captions (draft; Nick publishes)

**Channel:** @nickdnj. **Related video:** the v6 long cut once it is up (leave empty until then). Run `/Users/nickd/Workspaces/AgentArchitect/scripts/youtube-whoami.py` before any upload.

**Title (YouTube, 41 chars):** `1, 4, 9 ... 144 on ENIAC's lamps #Shorts`
Alternatives: `Could you program ENIAC? #Shorts` (32) · `ENIAC's lamps, counting to 144 #Shorts` (38)

**Description:**
```
Could you program a computer from 1946? At the Vintage Computer Federation museum you can try it: a touch screen on a simulator of ENIAC. Here, one accumulator counts in squares, lamp by lamp.

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
(Nick decides whether to keep the "still being tested" line. It is true and it is a reason to come, but it is his call how public to be about testing. Without it, nothing in the Short or the copy implies a finished exhibit.)

**YouTube captions:** upload an SRT with the one spoken line (`0.10 --> 3.00 Could you program a computer from 1946?`). This gives viewers caption on/off without burning text in.

**Reels:** "Could you program a 1946 computer? Count to 144 on ENIAC's lamps, on a touch screen on a simulator of ENIAC at the Vintage Computer Federation museum. InfoAge, Wall NJ. Wed, Sat, Sun 12 to 5. vcfed.org #ENIAC #ComputerHistory #VintageComputing #NewJersey #Museum #Reels"
**TikTok:** "Could you program a 1946 computer? VCF museum, Wall NJ #ENIAC #ComputerHistory #VintageComputing #NJ #museum"

---

## 9. New footage needed (M1 records from kiosk main)

| ID | Need | Spec |
|---|---|---|
| **F2** (required; replaces the current lamp clip) | `squares-fullspeed-lamps.mp4` | Kiosk main build, `CLEAN=1`, no cursor or touch marker anywhere on the accumulators. Squares mission, cables already placed. Press CLEAR, then Speed **Full**, then "Keep pressing for me". **Record one unbroken run from readout 0 to 12 x 12 = 144, then hold on 144 for at least 3 s.** Then CLEAR and do a second full run (spare). About 25 to 30 s total. 1920x1080 at 25 fps as before; if the harness allows `deviceScaleFactor: 2` (3840x2160 capture), use it, because this crop is enlarged 1.34x and the 30 s cut enlarges it too. **Sidecar** `squares-fullspeed-lamps.events.json`: the time in ms of every readout change on Accumulator 2 (DOM text change) and every button press. These become the step frames in section 5a. Check after recording: lamps 0 at the bottom, 9 at the top, the sign lamp level with 0 and 1. |

The 8 s cut needs nothing else. Shared footage for the 30 s cut (F1 attract and tap) is specified in `storyboard/short-30s.md` section 9.

---

## 10. Gate checklist

1. Nick picks concept A (or B or C) and the title.
2. Voice: one new take, Q (shared with the 30 s). Whisper pass on the words. No ENIAC listening reel needed (spoken ENIAC = 0).
3. Music: confirm by ear that hits 1 and 2 and the chord land on steps 10, 11 and 12. Nudge steps, not music.
4. Frame-step: every step joint; readout and lamps agree on every frame; lamps 0 at the bottom; no footer or credit in frame; hook legible on frame 0; ones-digit column clear of the right UI column.
5. Loudness on the final file: -14 LUFS, TP <= -1.5 dBTP.
6. Gate 2 review: per-line WAV (Q) plus one review MP3 of the finished mix.
7. Draft only. No publish without Nick. `youtube-whoami.py` first.

## 11. What is better than v1, and why

| v1 | v2 | Why it matters |
|---|---|---|
| Lamps move a little, out of time with the music | Every count step lands on a beat; the last three on the stop-time hits and the final chord | The cut is the music. People rewatch rhythm. |
| No payoff; the chord lands at 4.66 s under the voice duck, then 1.5 s of near silence | 144 lights on the final chord, with a lamp bloom and the card in the same frame | A clear "it lands" moment, which is what Jeff's "payoff" means |
| Opening line is a CTA ("Come watch ...") | Opening line is a question; the picture answers it | Tension in the first second |
| Readout cropped out (v5 flicker worry) | The readout is the star counter (v6 readouts are clean) | A real, honest counter instead of a made-up year counter |
| Panel 1080 wide, ones digit under the right-side UI | Panel 860 wide, active digits clear of the UI | The moving lamps are not hidden by the like button |
| Card: name + town + URL, no hours | Name, InfoAge address, hours, URL | It does the museum's job |
| Loop: hard cut from text to hook | Dim 144 under the card, then a bright 1: "clear and count again", with music from decay back into the band | The seam is a reset, not a glitch |
| One 4.5 s sentence over the whole count | 2.9 s question, then music only | Room for the hits |
