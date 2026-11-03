# M2: ENIAC pronunciation, mechanism and proof (2026-10-12)

Audio only. Voice and settings untouched (Nick 2, `6SxuwKUiBpZjFTc06v9Y`, `eleven_multilingual_v2`, stability 0.5, similarity 0.75, style 0.4, speed 1.12, speaker boost on as before). The full narration was NOT regenerated.

## Headline

1. **The dictionary could not be created.** The ElevenLabs key in `~/.zshrc` returns `missing_permissions: pronunciation_dictionaries_write` (and `_read`). Text-to-speech and the with-timestamps endpoint work. Nothing was created on the account, so there is **no dictionary id / version id yet**. Fix: give that key the pronunciation dictionary read+write scopes (or issue a new key), then run `scripts/create_pronunciation_dictionary.py` through `zsh -ic`; it creates the dictionary from the rules in `project.json` and writes the id and version back.
2. **The alias itself is proven**, using the identical substitution applied as text. A dictionary alias is a server-side text replacement made before synthesis, so the audio is the same thing. Recommended alias: **`ENIAC` -> `Ennie-ack`** (and `ENIAC's` -> `Ennie-ack's`). Runner-up with identical test results: `Enny-ak`.
3. **Phoneme (IPA/CMU) rules are not usable with `eleven_multilingual_v2`.** Docs: "Phoneme tags are only compatible with the `eleven_flash_v2`" model; Multilingual v2 "doesn't support phoneme tags", alias is the workaround. Experiment agrees (below). So the dictionary has alias rules only.
4. **The failure is real and reproducible.** The phoneme recogniser found a long-i "ee-NYE-ack" in the existing v5 narration lines and in 3 of 16 fresh unfixed generations of those same lines. With the alias: 0 of 16, and 0 of 20 on two further sentences.
5. **Listen:** `output/pronunciation-test/ENIAC-reel-test.mp3` (21 s) is the gate.

## Rules (in `project.json` brief.voice.pronunciation_dictionary, applied by the script)

| type | string_to_replace | alias |
|---|---|---|
| alias | `ENIAC's` | `Ennie-ack's` |
| alias | `ENIAC` | `Ennie-ack` |

Order matters (the first matching rule wins, case-sensitive). Open point: I could not test whether a dictionary matches `ENIAC` inside `ENIAC's` without a dictionary, hence the explicit possessive rule. Nothing in the narration is written `Eniac` (checked), so no `Eniac` rule.

## Model-support finding

- Docs (best-practices page): alias works everywhere; phoneme tags only on `eleven_flash_v2` (page does not mention turbo).
- Experiment: sent inline `<phoneme>` tags (IPA and CMU) to `eleven_multilingual_v2`; the alignment returned the tag characters themselves, and the two different `ph` values gave a byte-identical duration (2.183 s). I could not test dictionary phoneme rules (no write permission), so the inline-tag result is indirect evidence; the docs statement is the primary source.

## Choosing the alias

Respellings tried on sentences A/B/C (2 to 3 takes each, recogniser reading of the ENIAC window):

| candidate | result |
|---|---|
| `Enny ack`, `Eh-nee-ack`, `en ee ack`, `En-ee-ack` | final syllable sometimes read "ark" / "ake" ("ɑːɹ k", "eɪ k") |
| `Eh-nee-ak` | 4 of 5 good, one "ɑː k" |
| `Enny-ak` | 5 of 5 `ɛ n i æ k` |
| **`Ennie-ack`** | 5 of 5 `ɛ/æ n i æ k`, then 36 of 36 in the final run |

Respelling can hurt: several candidates degrade the "ack". Hyphenated "-ack" attached to "Ennie" did not. `output/pronunciation-test/ENIAC-candidates-test.mp3` lets Nick hear the candidates.

## Test method

- Generation: `/v1/text-to-speech/{voice}/with-timestamps` (character timings), same voice and settings. For the real-line tests the original `previous_text`/`next_text` neighbours were supplied, as the kiosk generator does.
- Extraction: ENIAC (or alias) window cut by character timings, +/-40 ms.
- Measurement: **wav2vec2 phoneme recogniser** (`facebook/wav2vec2-lv-60-espeak-cv-ft`, installed into a throw-away venv in the scratchpad; CTC frames within the window). Whisper is not used.
- Sensitivity check (positive control): `En eye ack`, `Eh nigh ack`, `En-eye-ack` (6 takes) were all recognised with `aɪ` in the second syllable, while ordinary takes read `i`. So the recogniser can see the long-i error.
- Class "ee-ack" = vowel n i/iː/ɪ (æ|a|ɑ|ɐ|ɛ) k. Class "LONG-I" = any `aɪ` in the window.

## Numbers

| set | WITHOUT | WITH `Ennie-ack` |
|---|---|---|
| A "ENIAC was built to compute artillery tables." | 10/10 ee-ack | 10/10 ee-ack |
| B "Welcome to the ENIAC exhibit at the museum." | 10/10 ee-ack | 10/10 ee-ack |
| D1 real line tour-27 "Now it's my turn to program ENIAC..." (with neighbours) | 6 ee-ack, **2 LONG-I** (`iː n aɪ æ k`) | 8/8 ee-ack |
| D2 real line finale-05 "Then the people who made ENIAC..." (with neighbours) | 7 ee-ack, **1 LONG-I** | 8/8 ee-ack |
| total | 3 long-i of 36 | 0 of 36 |

Fisher exact on the real-line sets alone (3/16 vs 0/16): one-sided p about 0.11, so not significant by itself. Together with the independent scan of the v5 recordings (next section) and the positive controls I rate it **good evidence of the mechanism, thin evidence of the exact rate**.

### Existing v5 narration (free: no API)

Phoneme scan of the 61 ENIAC occurrences in the 51 existing line WAVs and N01..N06/N-ALT1 (`research/source-narration/manifest.json` lines that contain ENIAC): 57 read as `n i æ k`-type, **2 long-i: `tour-27.wav` ("program ENIAC", in the v5 timeline) and `finale-05.wav` ("who made ENIAC")**; a few others came out odd and low-confidence (`tour-02` "ɛ n i j æ k", `tour-09` "ɛ n i ɛ k" in "ENIAC's", `tour-12` "ɛ n i w ʌ n k"). `tour-27` is confirmed in the v5 timeline; `finale-05` is a manifest line that I assume is inside the baked-in finale recording (not verified). This is consistent with Stuart hearing a long-i at least once. Those two are the ones to listen for in the old cut. The recogniser is noisy on odd cases; the long-i flag is the reliable one.

### Timing / MFCC (secondary, weak)

Duration of the ENIAC window and mean pairwise MFCC-DTW distance within each set (no dictionary vs alias): A 0.37 s / 8.7 vs 0.47 s / 9.3; B 0.39 / 8.8 vs 0.42 / 9.9; D1 0.54 / 12.6 vs 0.52 / 10.9; D2 0.53 / 12.3 vs 0.53 / 10.6. The alias is not measurably tighter on short sentences and slightly tighter on the longer real lines (where the long-i takes inflate the unfixed spread). Alias takes are a little longer in sentence-initial position (+0.1 s). **MFCC-DTW is a weak proxy** (dominated by timing and prosody); I rely on the phoneme recogniser instead.

## What the proxy can and cannot show

Can: whether the second vowel is `i` or `aɪ`, and that the third syllable is "ack"; a clear reproduction of the failure on the real lines.
Cannot: stress ("EN-ee-ack" vs "en-EE-ack"), first-vowel quality (we saw `æ` vs `ɛ` vs `ɪ` wobble across the takes, with and without the alias, and it is not audibly decisive), naturalness, or rare events (a 3% event needs more takes than 10 per set). A recogniser trained on read speech may misread a hyphenated respelling as a real word. **The gate is Nick's ears on the reel.** `reel-answer-key.txt` lists which take the recogniser flagged; open it after listening.

## Reel files (`output/pronunciation-test/`)

- `ENIAC-reel-test.mp3` + `-order.txt`: 10 WITHOUT (3 A, 3 B, 2 D1, 2 D2), 1 s silence, the same 10 WITH. 0.4 s gaps, each clip loudness-normalised, no speech between. One WITHOUT clip is a recogniser-flagged long-i (D2).
- `ENIAC-reel-full.mp3` + `-order.txt`: all 36 WITHOUT, 1 s silence, 36 WITH (75 s). Contains 3 flagged long-i takes.
- `ENIAC-candidates-test.mp3` + `-order.txt`: the respelling candidates.
- `reel-answer-key.txt`: recogniser reading per take.

## Pipeline changes in this repo

- `scripts/gen_narration.py`: reads `project.json` `brief.voice.pronunciation_dictionary` (env `PRONUNCIATION_DICT_ID` / `PRONUNCIATION_DICT_VERSION_ID` override). If an id is set it sends `pronunciation_dictionary_locators`; otherwise it applies the inline alias as text; if neither is configured it stops. Text is otherwise fed exactly as written (no Kokoro-style `Eniac`). The `.txt` stays the original text. It had no hash cache, so there was nothing to re-key; it now also writes a `{line}.json` provenance sidecar with the sent text, voice, model, settings and the dictionary id/version (or the inline alias), so a later cache would key on the same tag. Verified with one real call (N-ALT1, written to a scratch directory, not into `assets/`).
- `scripts/create_pronunciation_dictionary.py` (new): creates the dictionary and records ids in `project.json`.
- `project.json`: `brief.voice.pronunciation_dictionary` added. `status` says pending, ids null.
- `notes/m2-kiosk-narration-gen.patch`: proposed patch for the kiosk repo's `tests/web/video/narration-gen.py` (verified with `git apply --check`, not applied): dictionary env vars or inline alias, both in the clip hash, docstring note corrected. `docs/video/narration.md` should also lose the line "ElevenLabs needs no respelling" (not edited).

## ENIAC occurrences

- `research/source-narration/manifest.json` (the kiosk narration, 135 lines, 8 videos): **53** (tour 17, squares 7, primes 7, trajectory 6, explore 5, attract 4, tubes 4, finale 3). The briefing's "about 55" is this.
- v5 timeline (`storyboard/storyboard-data.json` voice_events, 15 events): standalone lines N01 (1), N02 (1), N03 (1), N04 (1), N05 (1), N06 (2) and tour-27 (1) = **8 occurrences**, plus narration baked into the tour, squares and finale recordings (up to 27 from the manifest counts, minus parts not cut in). So the v5 cut contains **at most about 35**.
- Source text counts of the literal string: `research/narration.md` 79 (includes script notes/tables, not all spoken), `storyboard/new-lines.md` 18, `storyboard/storyboard-data.json` 29, `scripts/gen_narration.py` 8.
- The v6 regeneration will be per line from the manifest (53 lines) plus the new N-lines; the short cuts (30 s, 8 s) must go through the same path.

## External changes and usage

- Nothing created or changed on the ElevenLabs account. Two permission-denied API calls (list and create dictionary) only.
- ElevenLabs usage: about 115 short test generations (over the 20-40 suggestion, because the real-line reproduction and alias selection needed them), a few thousand characters in total. No keys printed or written.
- Outside the repo: only the scratchpad (`/private/tmp/claude-503/.../scratchpad`: takes, a Python venv with torch/transformers, downloaded wav2vec2 model in the HF cache `~/.cache/huggingface`). Kiosk repo untouched (read only). No wiki changes.
- Files in this repo (uncommitted): `scripts/gen_narration.py`, `scripts/create_pronunciation_dictionary.py`, `project.json`, `notes/` (this file + patch), `output/pronunciation-test/`.

## Open risks

1. Dictionary not yet created (key scope). Until then the inline alias gives the same audio, but it is not "on the account".
2. Possessive `ENIAC's` through a real dictionary is untested; inline substitution handles it.
3. Rate evidence is thin (3 vs 0 of 16); a 30-take-per-line check on the final regeneration is cheap, and the cut-by-timestamp reel gate from the briefing should still be run on the final audio (the phoneme scan script logic can pre-screen it).
4. Alias adds a faint hyphen micro-pause and is ~0.1 s longer sentence-initially; check timings in the assembly.
5. Lines at the boundaries of "ENIAC" inside baked-in video narration (tour/squares/finale recordings) must be re-generated, not patched.
