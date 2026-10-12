# Shorts v2 voice-over (2026-10-12), audio only

Voice Nick 2 `6SxuwKUiBpZjFTc06v9Y`, eleven_multilingual_v2, 0.5/0.75/0.4, speed 1.12, boost on, inline alias fallback attached as in v6 (dictionary id still null; no line says ENIAC). No fallback voice. Script: `scripts/gen_shorts_v2_voice.py` (copy of the gen_narration_v6.py path). v1 folders `assets/audio/short-30s`, `short-8s` untouched. Texts match the v2 storyboards word for word.

## Requests: 6 ElevenLabs with-timestamps calls
Q, Y, C (3, max 2 concurrent) + Y-alt1/2/3 (3, seeds 11/22/33). No failures, no retries, key never printed. Q generated once and copied into short-8s-v2.

## Durations vs storyboard
| line | words | est | actual | start | ends | slot end | headroom |
|---|---|---|---|---|---|---|---|
| Q (30 s and 8 s) | 8 | 2.9 | 2.833 | 0.10 | 2.933 | 3.05 duck release (hook off 3.20, S1 ends 3.333; 8 s stop gap 3.54) | 0.117 |
| Y | 4 | 1.6 | 1.533 | 18.45 | 19.983 | 20.10 duck end | 0.117 |
| C | 8 | 2.9 | 2.647 | 21.75 | 24.397 | 24.75 duck end (music up 24.8) | 0.353 |

No beat overflows. Tightest: Q and Y, 0.117 s inside their duck windows (any later start by more than 0.1 s would eat the window). Words not trimmed.

## Y delivery judgement
Measured, not heard (autocorrelation f0 + the aligner). Y falls: "Yes." peaks, "fingertip." ends lowest (94 to 80 Hz), no terminal rise, so it does not read as a question. It is a modest pitch range (3.4 semitones vs 5.3 for Q), and the gap after "Yes." is only 0.08 s, so the "answer, then beat, then the kicker" shape is short. Three alternates were generated anyway (same text, seeds 11/22/33): all fall too, all have shorter gaps (0.03 to 0.06 s) and are shorter (1.30 to 1.49 s). None is better on the numbers. **Pick: Y (the first take).** Alternates are in the review MP3, labelled, for Nick's ears.

## Files
- `assets/audio/short-30s-v2/`: Q, Y, C, Y-alt1..3 (`.wav` -20 LUFS 48 k mono, `.txt`, `.json` provenance, `.align.json`), `durations.json`
- `assets/audio/short-8s-v2/`: Q (copy), `durations.json`
- `output/shorts-v2-voice-review.mp3` + `-index.txt` (Q, Y pick, C, alts; 0.6 s gaps)
- Raw mp3s in `scripts/_raw/shorts-v2/`
