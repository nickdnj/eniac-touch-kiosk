# Short 30 s: "Touch the screen" (Gate 1)

**Status:** GATE 1, script and shot list only. No audio, image or video generated. Requested by Jeff Brace (social media) via the 2026-10-12 briefing, section 3 M4.
**Goal:** bring people to the Vintage Computer Federation museum. Not to teach ENIAC.
**Format:** 1080x1920, **30.0 s**, YouTube Shorts first, then Reels and TikTok exports.
**Shape (Nick):** attract screen, one tap, lamps playing, one line of voice, address and hours as the end card.
**Inherits:** M1 (lamps 0 at the bottom, 9 at the top: footage must come from the v6 re-record, never a flip) and M2 (ENIAC pronunciation, listening gate if spoken).
**Not in this Short:** any name from the simulator's credit, "new exhibit", "opening", "finished", Trajectory/history claims, photos (so no photo credit).

---

## 1. Hook and line options (pick one at Gate 1)

Voice: Nick 2, id `6SxuwKUiBpZjFTc06v9Y`, stability 0.5, similarity 0.75, style 0.4, speed 1.12. Unchanged. If the voice call fails, stop and ask.
Write years as words in the TTS text ("nineteen forty-six").
Duration estimate: 0.36 s per spoken word (the 45 s Short averaged 109 words in 39.24 s of speech, 0.36 s/word). Replace with the real WAV lengths after synthesis.

| | Option A (recommended) | Option B |
|---|---|---|
| Hook overlay (0.0 to 3.6 s) | PROGRAM ENIAC / WITH YOUR FINGERTIP (the Gate 1 "A" hook from the 45 s Short, unchanged) | A ROOM-SIZED COMPUTER. / ONE FINGERTIP. |
| Spoken line | L1 "Touch the screen." then L2 "Watch a nineteen forty-six computer work, lamp by lamp." | L1 "ENIAC, nineteen forty-six." then L2 "Touch the screen, and program it yourself." |
| Spoken words | 3 + 9 = 12 | 3 + 7 = 10 |
| Est. duration at 1.12 | L1 about 1.2 s, L2 about 3.3 s (4.5 s total) | L1 about 1.5 s, L2 about 2.6 s (4.1 s total) |
| Spoken "ENIAC" | **0** (name is on screen) | **1** (needs the listening-gate reel) |
| Why | Fewest gate items, reuses the hook Nick and Jeff already liked, no pronunciation risk | Names the machine aloud, stronger "what is this" for people who skim with sound on |

Recommendation: **A**. Nothing in it can be mispronounced, and the on-screen hook still carries the name.

"Lamp by lamp" and "work" are chosen to be true of a simulation of the machine. Avoid "still running", "the real machine", "new" and "opening".

---

## 2. Source clips (planned against v5 names; swap to `assets/video/source-v6/` when it lands)

| Tag | File | Length | Used for |
|---|---|---|---|
| TOUR | `assets/video/source-v5/eniac-touch-tour.mp4` | 381.3 s, 1920x1080, 25 fps | attract, tap, Pick a mission, end-card background |
| SQUA | `assets/video/source-v5/eniac-touch-walkthrough-squares.mp4` | 172.0 s | accumulator lamps |

Both are recorded with no caption boxes (CLAUDE.md and memory: CLEAN=1). All in and out points are from contact sheets at 0.5 to 4 s steps, so **every point needs a frame step at assembly**.

**Do not render from v5.** Every accumulator lamp grid in v5 SQUA has 0 at the top (confirmed in the sheets). The Pick screen and attract screen carry no lamp grid; the room strip has tiny lamps and also needs a look in v6.

---

## 3. Beat table

| # | Out time | Source and in/out | Vertical crop and motion | VO | Music | Overlay |
|---|---|---|---|---|---|---|
| B1 | 0.00 to 7.20 (7.2 s) | TOUR 29.30 to 36.50. Attract: room strip live, "Touch to program ENIAC" button. Screen is still attract at 36.0 and Pick a mission shows by 37.0, so the cut lands on the last attract frame before the tap. | **CW** `crop=607:1080:657:0` (same window as S10 in `assemble_short_teaser.py`: sits between the two rotating attract plates, so neither the left plate's name nor the right plate's text is in frame), scale to 1080x1920, slow push 1.00 to 1.04 via `scale=eval=frame` then `crop=1080:1920`. | L1 "Touch the screen." at 4.60 to about 5.8 | Up at 0, under from 4.55 to 6.0 | Hook, 0.0 to 3.6 |
| B2 | 7.20 to 8.60 (1.4 s) | TOUR 36.90 to 38.30. "Pick a mission" (Squares, Primes, Trajectory cards). First Pick frame is between 36.5 and 37.0: step to it. | **PB** (blurred-fill pillarbox, same `pb()` helper), `crop=1800:900:60:40` (cards and header; ends y=940, so the kiosk footer at y about 1050 to 1075 is out), scale to 1080x540. | none | Up | none |
| B3a | 8.60 to 14.60 (6.0 s) | SQUA about 94.0 to 100.0 (v6 equivalent). Accumulator 1: lamp rows sweep after INIT (3-row at about 96, 8-row at about 100). | **PB** around Accumulator 1: `crop=670:428:20:222` (lamp grid with 0-9 row labels; y=222 starts below the header so the "helper readout" flicker, e.g. "3333333333" over the label, is cut off), scale to 1080x690. Composite to 1080x1920 first, then push 1.00 to 1.05. | L2 starts at 8.90, ends about 12.2 | Under during L2, up after | none |
| B3b | 14.60 to 20.60 (6.0 s) | SQUA about 100.0 to 106.0. Accumulator 2 sweep (the "66" flicker is in its header, also cropped out). | **PB**, same as B3a with `crop=670:428:600:222` (Accumulator 2). | none | Up (-20 LUFS), "let the lamps play" | none |
| B4 | 20.60 to 30.00 (9.4 s) | TOUR 22.00 to 31.40. Live attract room, echoing the open. | **CW** `crop=607:1080:657:0`, push 1.00 to 1.03, `eq=brightness=-0.35` so the end text reads (S10 recipe from the script). | none | Swell from 20.6, fade 28.8 to 30.0 | End card, 21.2 to 30.0 |

Total: 5 clips. Lamps are on screen for 12 s, 40 percent of the Short.

**Known weakness:** in v5 SQUA the lamps only "play" for about 1 s per INIT press, then sit still (one lit lamp per column, readout 1). A 6 s window holds one or two sweeps. See the recording request in section 7; a dedicated lamp-run clip would fix this for both cuts.

**Safe zone:** overlays stay inside y=250 to 1500 and x<=960 (right 120 px reserved for platform UI).

---

## 4. On-screen text (FFmpeg `drawtext`, never baked into images)

Same font and look as the 45 s Short: Georgia Bold, white fill, 5 px black outline, centred, alpha fade.

**Hook** (0.0 to 3.6 s, fade in 0.15, out 0.25), about 68 pt, uppercase, y about 285 and 375 over the top of B1:
```
PROGRAM ENIAC
WITH YOUR FINGERTIP
```
(Option B: `A ROOM-SIZED COMPUTER.` / `ONE FINGERTIP.`)

**End card** (21.2 to 30.0 s, fade in 0.3, held to the end), y from about 760 to 1160:
```
Vintage Computer Federation        (60 pt)
InfoAge · 2201 Marconi Rd · Wall, NJ   (44 pt)
Wed, Sat & Sun, 12 to 5            (56 pt)
vcfed.org                          (88 pt)
```
Option B has no spoken-then-shown name on the end card, so add `ENIAC touch screen` above line 1 (44 pt). Option A does not need it (hook already named it).

**Address and hours: sources**
- Address: https://vcfed.org/museum-info/ (fetched 2026-10-12): "displayed in a building on campus of InfoAge Science Center, 2201 Marconi Rd., Wall, New Jersey, 07719."
- Hours: same page: "open 12pm-5pm on Saturdays, Sundays and some Wednesdays ... also open other times by appointment." https://www.infoage.org/visit/ (fetched 2026-10-12): InfoAge open Wednesdays, Saturdays, Sundays, 12:00 to 5:00 PM.
- The two agree on Saturday and Sunday, noon to 5. They differ on Wednesdays ("some" vs every). The card originally said Sat & Sun and left Wednesday out. **Nick confirmed 2026-10-12 (voice): Wednesday, Saturday, Sunday, noon to 5. The card now says Wed, Sat & Sun, 12 to 5.**
- **Nick or Doug should confirm before posting.** The repo had no hours anywhere (the 45 s Short's card only says "VCF museum · Wall, NJ" and "vcfed.org").
- Fallback if not confirmed: drop line 3, and line 4 becomes `Hours: vcfed.org`.
- Not on the card: phone, admission prices, "free parking" (InfoAge page, not VCF's, and it changes).

---

## 5. Music and loudness

- Bed: Kevin MacLeod "Hot Swing" (`assets/audio/music/Hot Swing.mp3`, 0:50), the approved stand-in for the 45 s Short (Gate 1, 2026-10-08). Same CC BY credit line in the description.
- Seek: `-ss 20` so the track's big ending lands on the last frame (50 s track, 30 s Short). Listening call at Gate 2; if it feels abrupt, use `-ss 0` with the 28.8 to 30.0 fade.
- Ducking: voice about -16 LUFS. Music "under" about -32 LUFS while a line plays (-0.05 s margins), "up" about -20 LUFS in the gaps, 0.15 s smoothing. Same envelope as `build_audio()`.
- Master: **-14 LUFS integrated**, sample peak <= -2 dBFS before AAC (the 45 s Short measured -14.1 LUFS, TP -4.2). Light compressor, then `alimiter`, then gain search, as in the script.
- AAC 192 kb/s, 44.1 kHz, H.264 CRF 18, +faststart.

---

## 6. Gate checklist

1. Nick picks Option A or B.
2. ~~Nick or Doug confirms hours.~~ Done: Nick confirmed Wed, Sat, Sun, 12 to 5 (2026-10-12).
3. Pronunciation (M2): Option A has no spoken ENIAC. Option B has one, so it goes through the listening-gate reel (a one-clip reel; Whisper cannot judge it).
4. Frame-step checks: B1 plates (no name in frame from 29.3 to 36.5), B2 footer out of frame, B3 header flicker out of frame, lamps 0-at-bottom in v6.
5. Per-scene WAVs plus one review MP3 (L1, L2).
6. Draft only, no publish. Run `youtube-whoami.py` before any upload.

## 8. What changed vs the 45 s Short (applies to both cuts)

| | 45 s (`short-teaser.md`) | 30 s | 8 s |
|---|---|---|---|
| Job | Tell the Trajectory story, then invite | Invite, with a glimpse of the screen | Invite |
| Voice | 8 lines, 109 words, ENIAC spoken 5 times | 2 sentences, 10 to 12 words, 0 or 1 ENIAC | 1 sentence, 12 to 13 words, 0 ENIAC |
| Shots | 12 clips, 2 Army photos | 5 clips, no photos | 1 clip |
| Teaching content | Shells, cables, cards, missions | None | None |
| Overlays | hook + invite (VCF museum, vcfed.org) | hook + full end card with address and hours | name + museum |
| Credits | photo credit and music in description | music only (no photos) | music only |
| Pronunciation gate | 5 spoken ENIAC | 0 (A) or 1 (B) | 0 |

## 9. Assembly note: what `scripts/assemble_short_teaser.py` can be reused for

Do not edit that script (it produced the published Short). Copy to a parameterised `scripts/assemble_short.py --cut 30s|8s` at the assembly stage.

Reusable as is: `run()`, `FF`/`FP` (ffmpeg-full, needed for `drawtext`), `BG` and `pb()` (blurred-fill pillarbox), `EASE` (pan expression), the S10 CW-crop-plus-push-plus-darken block (B1 and B4 here), `render_shot()` frame-count logic and `NUDGE` json (frame-step nudges), `concat` of shot MP4s, `lufs()`, the compressor/limiter/gain-search chain in `build_audio()`, `dt()` and `final()` for the overlays, and the encode settings.

Needs changing:
- `SHOTS` table, `LINES` and `TOTAL` become per-cut data (30.0 and 8.0).
- `SRC` points to `source-v6` (v5 is wrong on lamps).
- Music: add `-ss` (20 for 30 s, 42 for 8 s); the hard-coded swell at 42.7 s and fade at 44.2 s become parameters.
- Overlays: the invite card becomes 3 to 4 lines; hook text per option.
- New PB window for the single accumulator (`crop=670:428:x:222`), plus a post-composite push; the existing `pb()` has no push.
- Paths: `output/build/short-30s/`, `output/short-30s.mp4`, `assets/audio/short-30s/`, and the same for 8 s.
- No `zoom_still()` or photo shots needed.

## 7. Recording request to the kiosk side (optional, improves both cuts)

A 10 s clip of Squares accumulators with Full speed running ("Skip to the answer" or "Keep pressing"), CLEAN=1, from the v6 build. At full speed the lamps flicker continuously, which is the "lamps running" picture the 8 s cut needs. The v5 clip has only short sweeps.
