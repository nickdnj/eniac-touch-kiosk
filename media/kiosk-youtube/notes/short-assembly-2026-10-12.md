# Short assembly 2026-10-12 (8 s final candidate, 30 s DRAFT)

Nothing uploaded or committed. `assets/video/source-v6/` untouched. `scripts/assemble_short_teaser.py` untouched.

## Commands
```
python3 scripts/assemble_short.py --cut 8s            # -> output/short-8s.mp4
python3 scripts/assemble_short.py --cut 30s           # -> output/short-30s-DRAFT.mp4
python3 scripts/assemble_short.py --cut 30s --final   # -> output/short-30s.mp4 (after the new tour clip lands)
python3 scripts/assemble_short.py --cut 30s --audio-only   # re-mix only
```
Intermediates: `output/build/short-8s/`, `output/build/short-30s/`. Frame-step corrections go in `output/build/short-<cut>/nudges.json` as `{"B1": 0.08}` (seconds added to the shot's in point).
Contact sheets: `output/short-8s-contact.jpg` (0.3, 2, 4, 5, 6.5, 7.8 s), `output/short-30s-DRAFT-contact.jpg`.

## What the script does differently from the teaser script
- Source `source-v6` only. Lamp shots use `squares-fullspeed-lamps.mp4` (14 s, 1920x1080, 25 fps, lamps 0 at bottom, 9 at top, +/- lamp level with rows 0/1, verified on frames).
- Per-cut `CUTS` table: shots, lines, total, music `-ss`, hold-under, swell, fade, text.
- PB shots composite first (blurred fill), then push. The push is `scale(eval=frame)` then centred `overlay` on a black 1080x1920 canvas. A `crop=1080:1920` after the scale does NOT centre (its `iw` is fixed at configure time, so it stays left/top anchored and clipped the lamp grid's right column in my first render). The teaser's S10 block uses that `crop` form, so S10 in the published 45 s Short is likely left-anchored too; not touched, flagged only.
- VO is resampled 48 k to 44.1 k mono before mixing.
- Text sizes auto-shrink so the centred, outlined text fits 840 px (x 120 to 960, right 120 px reserved for Shorts UI).

## 8 s cut
- Shot S1: `squares-fullspeed-lamps.mp4`, in 1.80 s, 8.0 s (240 frames), `crop=670:428:20:222` (grid + 0-9 labels, header readout and its flicker out), scaled to 1080x690 on blurred, 0.7-darkened fill, push 1.00 to 1.06. Grid occupies about y 594 to 1326 at the end of the push.
- Why 1.8 s: the clip is only 14 s and the lamps go to rest (row 0 lit only) from 6.8 to 8.5 s of the clip. Every 8 s window contains some rest. With in 1.8 the rest is output 5.0 to 6.7 s and the cut ends on flicker (clip 8.6 to 9.8 s) so the big music ending lands on moving lamps. The storyboard asked for a 10 s continuous run; this clip does not have one (see open issues).
- VO L1 (4.458 s) at 0.30 s, ends 4.758 s. Words not trimmed.
- Plan conflict resolved as instructed: end text in moved 4.4 s to 4.8 s (fade 0.3, held to 8.0); music held under until 4.9 s (storyboard 4.65 s), then up (-20 LUFS) to the end. Total 8.0 s. Music `-ss 42`, no fade (big ending on last frame).
- Hook `ENIAC · 1946` 96 pt at y 400, 0.0 to 4.0 s (fade 0.15 / 0.25). End text `Vintage Computer Federation` 52 pt y 1355, `Wall, NJ · vcfed.org` 64 pt y 1420 (storyboard said about y 1340; moved 15 px down because the lamp panel's bottom edge ends at about y 1326 after the push and the first line touched it). Both lines inside y 250 to 1500 and x 120 to 960 without shrinking.
- Ducking: voice at -16 LUFS, music -32 LUFS under (0.25 to 4.9 s), -20 LUFS up, 0.15 s smoothing. Compressor, alimiter 0.80, gain search to -14.

### Measured (output/short-8s.mp4)
- 1080x1920, 30 fps, 8.000 s, H.264 yuv420p + AAC 44.1 kHz stereo, 1.97 MB.
- Integrated -14.0 LUFS, LRA 6.2 LU, true peak -4.7 dBFS, volumedetect max -4.8 dB (mean -18.1 dB).
- Frames checked by eye: lamp labels 9 at top, 0 at bottom, +/- level with 0 and 1; no header readout; hook legible from frame 0; end text legible, clear of the panel; no UI-zone overlap.

## 30 s DRAFT (output/short-30s-DRAFT.mp4): script proof only, NOT a deliverable
Beats as in the storyboard, with TOUR from the **current** `source-v6/eniac-touch-tour.mp4` (380.6 s, which differs from v5 and is being re-recorded).

| Shot | Out | Source / in | Treatment |
|---|---|---|---|
| B1 | 0 to 7.2 | TOUR 29.30 | CW `crop=607:1080:657:0`, push 1.04 |
| B2 | 7.2 to 8.6 | TOUR 36.90 | PB `crop=1800:900:60:40`, fh 540 |
| B3a | 8.6 to 14.6 | LAMP 0.0 | PB ACC1, push 1.05 |
| B3b | 14.6 to 20.6 | LAMP 7.5 (clip 7.5 to 13.5) | PB ACC2 `crop=670:428:720:222` (the v5 x=600 would clip Accumulator 2's right edge in the v6 layout), push 1.05 |
| B4 | 20.6 to 30.0 | TOUR 22.00 | CW, push 1.03, eq brightness -0.35 |

VO: L1 4.60 to 5.668 s, L2 8.90 to 11.965 s. Music `-ss 20`, under around the lines, swell at 20.6, fade 28.8 to 30.0. Overlays: hook 0 to 3.6 s; end card 21.2 to 30.0 s with Wed, Sat & Sun, 12 to 5. Auto-shrink applied: `WITH YOUR FINGERTIP` 68 to 62 pt, `Vintage Computer Federation` 60 to 54, `InfoAge · 2201 Marconi Rd · Wall, NJ` 44 to 42.
Measured: 30.000 s, 1080x1920 30 fps, -14.1 LUFS, true peak -4.5 dBFS.

**What is wrong with the draft (expected):** the v6 tour clip's content at 29.3 to 36.5 s and 22 to 31.4 s is no longer the attract screen. The sampled frames show the room tour with hop captions and a kiosk caption bar ("...946. Now you program it.") under the hook and behind the end card, and B2 landed on the Pick a mission screen only partly. So all TOUR in/out points are invalid and B1, B2, B4 must be re-picked by frame step. The lamp shots B3a/B3b are fine and independent of the tour.

### To finish the 30 s after the new tour clip lands
1. Contact-sheet the new tour; find the attract window (room strip live, "Touch to program ENIAC" button, no kiosk caption bar, no name plate in the 607 px crop), the last attract frame before the tap, and the first Pick a mission frame. Frame-step (`ffmpeg -ss T -frames:v 1`, 0.04 s steps) each in/out.
2. Update `ss` in `CUTS['30s']` (B1, B2, B4) or use `nudges.json`.
3. `python3 scripts/assemble_short.py --cut 30s --final`, re-measure loudness/peak, re-check contact sheet, B2 footer out of frame, B1/B4 no caption bar, end card legibility over B4.

## Open issues
- 8 s: no continuous 8 s flicker exists in `squares-fullspeed-lamps.mp4`; there is a 1.7 s rest in the middle (output 5.0 to 6.7 s, under the end text). A 10 s+ continuous Full speed recording (the storyboard's recording request) would remove it. Nick's eyes needed on whether the rest reads as acceptable.
- 8 s: only ~one to two lamps move at a time (that is what the simulator does at Full speed on Squares), so the picture is calm, not busy. Judgement call for Nick.
- Music listening call (Gate 2): `-ss 42` big ending vs the alternative `-ss 0` with fade; Whisper pass on L1 to confirm "Vintage Computer Federation" was not run.
- 8 s hook is `ENIAC · 1946` (spoken ENIAC: 0). Hours are not on the 8 s.
- Shorts loop: last frame (end text up) cuts hard to the first (hook, no end text); not tested in the Shorts player.
- Teaser script's S10 crop likely left-anchored (see above); unverified on the published file.
