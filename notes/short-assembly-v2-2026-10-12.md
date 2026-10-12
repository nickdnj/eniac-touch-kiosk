# Short assembly v2, 2026-10-12 (8 s and 30 s)

Rendered, verified by eye and by measurement. Nothing uploaded, published or committed. v1 files (`output/short-8s.mp4`, `short-30s-DRAFT.mp4`, `scripts/assemble_short.py`) untouched. `assets/video/source-v6/` read only.

## Commands
```
python3 scripts/assemble_short_v2.py --cut 8s-v2     # -> output/short-8s-v2.mp4    (about 1 min)
python3 scripts/assemble_short_v2.py --cut 30s-v2    # -> output/short-30s-v2.mp4   (about 1.5 min)
python3 scripts/assemble_short_v2.py --cut 30s-v2 --audio-only   # re-mix only (shots reused)
```
Intermediates `output/build/short-8s-v2/`, `short-30s-v2/`. Contact sheets: `output/short-8s-v2-contact.jpg`, `output/short-30s-v2-contact.jpg`. Metadata: `output/upload/metadata-short-8s-v2.json`, `metadata-short-30s-v2.json` (privacyStatus public, channel @nickdnj, relatedVideo empty, "still being tested" paragraph kept but flagged as Nick's call). Synthesised tap click saved at `assets/audio/sfx/tap.wav` (+ `tap.txt`).

## Measured (final files)
| | 8s-v2 | 30s-v2 |
|---|---|---|
| duration | 8.333 s (250 frames) | 30.000 s (900 frames) |
| video | H.264 1080x1920 30 fps yuv420p | same |
| audio | AAC 44.1 kHz stereo, 1 stream | same |
| integrated | -14.1 LUFS | -14.2 LUFS |
| true peak (ebur128, on the AAC file) | -4.9 dBTP | -3.4 dBTP |
| LRA | 3.6 LU | 1.9 LU |
| final chord attack (from the file) | 4.99 s (spec 5.001) | 28.32 s (spec 28.333) |
| size | 1.35 MB | 11.5 MB |

Voice: Q 0.100 to 2.933 s, Y 18.450 to 19.983 s, C 21.750 to 24.397 s. All inside their duck plateaus (0.05 to 3.05, 18.40 to 20.10, 21.70 to 24.75; 0.15 s raised-cosine ramps outside the plateau, so the voice is always fully under). No duck had to move. Y first take used (no note said otherwise).

## Deviations from the storyboard, and why
1. **Music in-points moved 0.095 s earlier.** Measured by RMS onset on the ffmpeg-decoded file: chord attack 46.565 (storyboard 46.66), hits 45.46 and 46.30 (45.56, 46.38), section start 18.225 (18.325), D_25 41.57 (41.659). Tempo 144 and the grid hold (beat offset 0.408 s matches D_n = n x 1.66667 - 0.008 mod a beat); only the constant offset differs (about 95 ms, more than the 40 ms threshold; most likely a decoder-delay difference). Used `-ss 41.564` (8 s) and `-ss 18.232` (30 s). Verified on the final audio: chords at 4.99 / 28.32 s. The 8 s hits 1 and 2 sit within 15 ms of 3.901 / 4.721.
2. **Count steps start on the step frame, not 2 frames before it.** The lamp glow transition begins on the same frame the readout changes (checked at 81: old lamps start fading on the first "81" frame), so starting 2 frames early would put the visible change 80 ms after the beat.
3. **Step frames come from the pixels, not the events JSON.** The events (DOM time) are 0 to 2 frames earlier than the first frame that shows the readout (e.g. "1": event 1.854 s = frame 46.4, first frame showing 1 is frame 49). The script detects the readout-box change per frame and asserts each lies 0 to 3 frames after its event. Frames (25 fps, run 1, clip time): 49, 61, 72, 85, 98, 108, 121, 131, 143, 154, 166, 178 (1.96, 2.44, 2.88, 3.40, 3.92, 4.32, 4.84, 5.24, 5.72, 6.16, 6.64, 7.12 s). Run 1 is an unbroken 0 to 144 (events JSON), so the "run 2 / run 1" mixing of the old clip is no longer needed. Verified at output frames 12/13, 49/50, 100, 116/117, 141/142, 149/150: the new readout appears on exactly the beat frame, lamps agree with the readout.
4. **Step dwells are trims or holds only.** Source steps are 0.42 to 0.52 s apart. Output dwell 0.417 s trims 0 to 1.5 source frames; n=9 (0.567 s) and n=10 (0.82 s) in the 8 s hold the last, static frame. Real-time playback otherwise (25 fps frames repeated to 30 fps).
5. **S6 in point 10.40 s (storyboard 10.00)** and **S5 in point 20.40 s (storyboard 19.60).** `finale.mp4` crossfades into each page: "You programmed ENIAC." is fully in at about 10.35 s, "Here is every unit you used." at about 20.35 s (frame-diff against the settled frame: 36 units at 9.84 s, 37 at 19.80 s, fade complete about 0.5 s later). The storyboard times land inside the fade, showing the previous page.
6. **S4 in point 143.00 s (storyboard 138.00 to 141.33).** The primes walkthrough has a jump in the readout between 109 (about 142.0 s) and 311 (about 142.5 s). 138 to 141.3 shows 83 to 107 (not "200s and 300s" as written); 143.0 to 146.33 shows 313 to 349 continuously, with the group-checker tiles moving and one pink "fits!" flash (the UI's own). Real time, no button press in the crop.
7. **S2 in point = picker "settled" (24.408 s) + 0.04 s**, 1.667 s long. The real "Start" press in the clip is at 30.5 s; the ripple at 4.861 is drawn, as the storyboard says.
8. **S1 / S2 tap ripples end at their shot's cut** (S1 ripple at 3.333, S2 ripple at 5.000), not at their natural 0.45 s. Otherwise ring 2 crossed the cut and sat on the lamps for 0.3 s, and ring 1 sat on the Pick a mission card where no button is.
9. **S7 has no ENIAC wordmark.** The end card's line 1 ("COME TRY IT", y 580) lands on the wordmark (y 455 to 639) and was unreadable. The strip and the dimmed button are kept; the wordmark is the only L1 element dropped, so at the loop seam the wordmark pops back in with the hook (the picture was already a hard cut from card to question).
10. **Bloom on S7 is applied to the poster layer before the dimmed button is overlaid**, so the white button does not flash on the three hits.
11. **Background darkening:** the spec's `eq=brightness=-0.30` is used everywhere except S1 and S7 (-0.60) and S2 (-0.50). With -0.30 the cream picker and the strip's card-reader row blurred into bright grey and yellow smears and the rectangles of the pre-cropped layers showed against them.
12. Both end cards use the hook/lines as in the storyboard; `Vintage Computer Federation` auto-shrank 56 to 54 pt to fit 840 px (both cuts). 8 s end card is on the chord (frame 150, 0.12 s fade); 30 s lines fade in at frames 650, 662, 675, 688, 700 (beats 52 to 56).
13. Peak safety: limiter ceiling was left at 0.794 (-2 dBFS) and was not the binding constraint; mix peaks are set by the -17 LUFS music "up" and the compressor. TP -4.9 / -3.4 is well under the -1.5 limit; loudness is 0.1 to 0.2 LU under -14 (the loop stops within 0.1 dB, not 0.0).

## Verified by eye (frames)
8 s: frame 0 readout 1, hook on frame 0, no black; lamps 9 top / 0 bottom, sign lamp level with 0 and 1; readouts 1,4,9...144 on the beats; bloom on 117, 142, 150; dim ramp 150 to 158; end card on the chord, legible on the dimmed panel; last frame 144 dimmed + card, first frame 1 + hook (loop seam as designed).
30 s: S1 attract poster with live strip, button, hook (0 to 3.2 s, gone before the Pick a mission title); ripple centre (540, 1340) = the real tap (960, 960) through the L1 button transform; Start ripple (540, 1250) = card Start (352, 744) through L2; S3 counts 1...144 on beats 12 to 23 with bloom on 144 (9.583 s); S4 primes; S5 whole machine pan; S6 headline + Squares card; S7 card builds line by line, yellow vcfed.org at 28.333 to about 29.0 s. No plates, footer or simulator credit visible in any shot. Text inside y 250 to 1500 and x 120 to 960 (all centred, auto-fit to 840 px).
Mean-luma jump check: the only large jumps are the shot cuts. No flash frames other than the yellow hit and the (small, lamp-only) blooms.

## Open issues / things Nick must look at
- **S2 to S3 cut (5.000 s) is white card to black panel**, and S1 to S2 and S4 to S5 are similar luminance steps. That is the footage (cream picker on a dark UI), per spec. Check it feels punchy and not harsh on a phone.
- **S7 loses the wordmark** (deviation 9). If you want it back, the end card needs to move down or up by about 150 px.
- **Stray dim glow at the left edge in the 8 s** (the blurred bottom-row lamp of the background, about y 1720). It is dark but visible on a dark screen. Spec background left as written for the 8 s (-0.30).
- **Tap click** is quiet by design (voice peak minus 8 dB, 5 ms). Listen at Gate 2; it is the only sound effect.
- **Y** is the first take (0.117 s headroom in the duck, ends 19.983 s); alternates are in the review MP3.
- **Whisper pass** on Q/Y/C words not run in this task.
- Music is the Hot Swing stand-in (CC BY, credit in the description).
- `squares-fullspeed-lamps.mp4` and the other v6 clips may be re-muxed by M1; the script reads video streams only, but re-run `--cut 30s-v2` after any change to F1/F2 (the step-frame assertions will catch a shifted clip).
- Not tested in the Shorts player: loop seam.
