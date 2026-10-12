# v6 standalone narration and Short VO (2026-10-12), audio only

Voice Nick 2 `6SxuwKUiBpZjFTc06v9Y`, eleven_multilingual_v2, 0.5/0.75/0.4, speed 1.12, boost on. Pronunciation: inline alias `ENIAC` -> `Ennie-ack` (project.json inline_alias_fallback; dictionary id still null). No fallback voice. v5 files untouched.

## Which lines are "standalone" (from storyboard-data.json voice_events, kind new/wav)
N01 N02 N03 N04 N05 N06 (v5 assets/audio/narration), finale-00 (source-lines-v5), and the bridge that v5 cut from v3 `tour-27.wav` (0 to 2.21 s). Everything else in source-lines-v5 (tour-12, squares-13, finale-01..03) is baked into the kiosk recordings; tour-38/39 are not in the v5 timeline. `N-ALT1` is not in the timeline, not regenerated.
Texts: N-lines from `assets/audio/narration/*.txt`; finale-00 per the v5 EDL ("Finish all three missions, and the kiosk ends with a finale."; v5 WAV is 3.437 s, same wording); tour-27 full v3 text from research/source-narration/manifest.json (generated whole so the bridge keeps its prosody; N-ALT1's single sentence would differ).

## Files
- `assets/audio/source-lines-v6/`: N01..N06, finale-00, tour-27 (`.wav` -20 LUFS 48 k mono as v5, `.txt`, `.json` provenance, `.align.json` ElevenLabs character timing), `durations.json`.
- `assets/audio/short-30s/` L1, L2; `assets/audio/short-8s/` L1 (same sidecars, `durations.json`).
- `output/narration-review-v6.mp3` (+ `-index.txt`, 77 s, 0.6 s gaps, v5 timeline order). tour-27 appears as the bridge excerpt (0 to 2.64 s, the word gap is 2.40 to 2.88 s in v6).
- `output/narration-review-v6-shorts.mp3` (+ index): extra, the three Short lines for the same listening pass.
- `output/eniac-reel-v6-standalone.mp3` (+ index): 8 clips, cut by character timestamps +/-0.08 s, 0.5 s gaps, 10 s long.
- `output/v6-eniac-phones.json`: proxy output. Scripts: `scripts/gen_narration_v6.py`, `analyze_v6_audio.py`, `build_v6_reviews.py` (raw mp3s in `scripts/_raw/v6/`).

## Durations vs v5 (flag > 0.3 s)
| line | v5 | v6 | delta |
|---|---|---|---|
| N01 | 12.446 | 12.957 | +0.511 flag |
| N02 | 8.498 | 8.916 | +0.418 flag |
| N03 | 7.291 | 7.616 | +0.325 flag |
| N04 | 10.124 | 9.752 | -0.372 flag |
| N05 | 12.585 | 12.446 | -0.139 |
| N06 | 16.068 | 15.325 | -0.743 flag |
| finale-00 | 3.437 | 3.437 | 0.000 (different bytes) |
| tour-27 (full) | 7.523 (v3) | 8.916 | +1.393 flag; the bridge only needs the first sentence |
Unit slots in gen_storyboard_v5.py were built from the v5 durations (e.g. N02 slot 8.50, N03 7.29, N04 10.12, N06 16.07), so N01, N02, N03 and the tour-27 bridge now overrun their units and need re-timing.

## Shorts
- 30 s: L1 "Touch the screen." 1.07 s (plan 4.60 to ~5.8, fine); L2 "Watch a nineteen forty-six computer work, lamp by lamp." 3.07 s (8.90 to 11.97; plan ~12.2, fine).
- 8 s: L1 "Come watch a nineteen forty-six computer work, at the Vintage Computer Federation." **4.458 s**; from 0.30 it ends at 4.76 s. Plan said about 4.60 with music under to 4.65 and end text in at 4.4: over by about 0.16 s. Words not trimmed. Options (not applied): start at 0.15, or move end text to 4.8.
- No Short line speaks ENIAC (both Option A), so none are in the reel.

## ENIAC occurrences
8 spoken ENIAC in the standalone set (N01 1, N02 1, N03 1, N04 1 as "ENIAC's", N05 1, N06 2, tour-27 1; finale-00 none). Shorts 0.
Proxy (wav2vec2-lv-60-espeak-cv-ft, M2 venv in the scratchpad, still present; windows by character timestamps): all 8 read `ɛ n i æ k`, 0 long-i, so nothing regenerated. N06 windows pick up a trailing `ɛ` / `j` from the neighbouring phoneme. This is a weak gate: it sees `i` vs `aɪ` only, not stress, naturalness or rare events. **Nick's ears on `eniac-reel-v6-standalone.mp3` are the gate.** Not tested: the alias is applied inside "ENIAC's" as "Ennie-ack's" (N04 window is only the Ennie-ack part).

## API usage and surprises
- 11 ElevenLabs with-timestamps calls (8 source lines + 3 Short lines), one each. Max 2 concurrent. No retries, no key printed.
- No previous_text/next_text context supplied (the v5 kiosk-generated finale-00 may have had it); finale-00 still came out at exactly the v5 duration.
- N02 and tour-27 both have an alignment end of 8.916 s: coincidence, different text and md5.
- Loudness is per-line -20 LUFS as in v5; the review MP3 is not re-levelled.
