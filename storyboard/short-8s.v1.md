# Short 8 s: "Lamp by lamp" (Gate 1)

**Status:** GATE 1, script and shot list only. No audio, image or video generated. Requested by Jeff Brace via the 2026-10-12 briefing, section 3 M4.
**Goal:** one image, one sentence, the museum name. Bring people to the Vintage Computer Federation museum.
**Format:** 1080x1920, **8.0 s**, YouTube Shorts first (Shorts loop, so the last frame should read cleanly into the first), then Reels and TikTok.
**Inherits:** M1 (lamps 0 at the bottom: v6 footage only, no flip) and M2 (pronunciation).
**Decision: no spoken ENIAC.** Good lines exist without it, the name is on screen, and it removes the 8 s cut from the pronunciation listening gate entirely.

---

## 1. Line options (pick one at Gate 1)

Voice: Nick 2, speed 1.12, other settings unchanged. Years written as words in TTS text. Estimate 0.36 s per spoken word; replace with real WAV length.

| | Option A (recommended) | Option B |
|---|---|---|
| Spoken sentence | "Come watch a nineteen forty-six computer work, at the Vintage Computer Federation." | "A nineteen forty-six computer, lamp by lamp. See it in Wall, New Jersey." |
| Spoken words | 12 | 13 |
| Est. duration at 1.12 | about 4.3 s (0.30 to 4.60) | about 4.7 s (0.30 to 5.00) |
| Spoken "ENIAC" | 0 | 0 |
| Museum name | spoken and on screen | on screen only (voice says the town) |
| Why | One plain sentence that names the museum aloud, so sound-on viewers hear it and sound-off viewers read it | Tighter image-led phrasing, but leaves the museum name to the text |

Recommendation: **A**.

On-screen hook (0.0 to 4.0 s), same for both: `ENIAC · 1946`. It carries the name that the voice does not say.

---

## 2. Source and beat table

One continuous shot. Planned against v5 `assets/video/source-v5/eniac-touch-walkthrough-squares.mp4` (172.0 s, 1920x1080, 25 fps); swap to `assets/video/source-v6/` when it lands. **Do not render from v5**: the lamps there have 0 at the top.

| # | Out time | Source and in/out | Vertical crop and motion | VO | Music | Overlay |
|---|---|---|---|---|---|---|
| S1 | 0.00 to 8.00 | SQUA about 94.5 to 102.5. Accumulator 1, two INIT sweeps (3-row at about 96, 8-row at about 100). Frame-step to start 0.3 s before a sweep so the first frame already has motion. | **PB** (blurred-fill pillarbox): `crop=670:428:20:222` (lamp grid and 0-9 labels; below the header, so the "helper readout" flicker is out), scale to 1080x690, centred on a blurred, darkened (x0.7) 1080x1920 fill of the same footage. Composite first, then push 1.00 to 1.06. Lamps fill 36 percent of frame height, so the push helps. | Sentence 0.30 to about 4.60 | Under 0.25 to 4.65, up after, big ending on the last frame | Hook 0.0 to 4.0; end text 4.4 to 8.0 |

If the v6 recording of a full-speed lamp run exists (see the 30 s storyboard, section 7), use that clip instead of INIT sweeps: same crop, in point at any 8 s window with continuous flicker.

---

## 3. On-screen text (FFmpeg `drawtext`)

Georgia Bold, white, 5 px black outline, centred, alpha fade. The lamp band occupies y 615 to 1305, so text sits above and below it, inside the y 250 to 1500 safe zone.

**Hook** (0.0 to 4.0 s, fade 0.15 in, 0.25 out), 96 pt, y about 400:
```
ENIAC · 1946
```
**End text** (4.4 to 8.0 s, fade 0.3 in, held to the end), y about 1340 to 1480:
```
Vintage Computer Federation   (52 pt)
Wall, NJ · vcfed.org          (64 pt)
```
No hours on the 8 s: there is no room and no ask. The address and hours are on the 30 s end card (sources there). If Nick wants the 8 s to carry hours, `Wed, Sat & Sun, 12 to 5` fits as a third line at 44 pt, but it is a crowded frame.

---

## 4. Music and loudness

- Hot Swing stand-in (approved for the 45 s Short), `-ss 42` so the big ending (track 0:50) lands on the last frame. Listening call at Gate 2; alternative `-ss 0` with a 0.8 s fade from 7.2.
- Voice about -16 LUFS; music under about -32 LUFS during the sentence, up about -20 LUFS after 4.65 s; 0.15 s smoothing.
- Master **-14 LUFS integrated**, sample peak <= -2 dBFS pre-AAC. At 8 s, integrated loudness is sensitive to a few loud frames, so verify with `ebur128` on the finished file.

## 5. Gate checklist

1. Nick picks A or B.
2. No pronunciation gate item (no spoken ENIAC). A Whisper pass can still confirm the sentence says "Vintage Computer Federation".
3. Frame-step: lamps 0-at-bottom in v6, header flicker out of frame, hook readable on the first frame (Shorts autoplay).
4. Draft only, no publish.
