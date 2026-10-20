# Storyboard v1: "ENIAC builds a table by adding" (Difference mission video)

**Date:** 2026-10-19
**Status:** DRAFT for Gate 1 review. Footage recorded (clean); no audio yet; nothing fact-checked beyond the kiosk's `docs/fact-check.md` group G (Stuart's email and tutorial are the source).
**Plan:** `research/difference-video-plan-2026-10-19.md`.
**Footage:** `assets/video/difference-2026-10-19/difference-clean-raw.mp4` (1920x1080, 1:52, untracked) and `difference-beats.json` (beat offsets). Recorded from kiosk branch `difference-footage` (PR #80 in the kiosk repo), which has Stuart's fixes: lamps 0 at the bottom, master programmer decades 0 at the bottom, data connectors rectangular and control connectors round.
**Voice:** Nick 2. Write "init" lowercase in the TTS script; ENIAC goes through the project's alias. **Target length:** about 3:30 with narration. Footage runs 1:52 and is cut and extended in the edit (holds, slow-mos are not allowed: dead time is cut, never sped up).

## Scenes

| # | Footage (raw, s) | On screen | Narration (draft) | Fact-check (kiosk `docs/fact-check.md`) |
|---|---|---|---|---|
| 1 | 84.6 to 96 (the run, cards stacking) | Cold open: the chain and the cards piling up, no title yet | "A whole table of numbers, built with nothing but adding." | G3 |
| 2 | title card (new), 3 s | Title: "ENIAC builds a table" / Mission 4: Difference | "I'm Nick, a docent at the Vintage Computer Federation museum. This is one of the missions on our new ENIAC touch screen." | Same intro line as the main video |
| 3 | 8.5 to 22 (picker page 2, briefing) | Picker page 2, tap Start, briefing screen | "Before computers, people made tables of numbers by hand. Charles Babbage designed a machine to build such tables automatically, using only addition. ENIAC can do the same." | G1, G2 |
| 3b | still: tutorial page 1, the hand-worked table (`research/sources/stuart-polynomial-tables/`, cropped by `scripts/build_difference_review.py`) | The table x, f(x), Δ1, Δ2, Δ3 from Stuart's tutorial, held while the voice points at the top diagonal | "To start, work out a small table by hand. The numbers along the top diagonal are all ENIAC needs: six hundred, minus eighty-nine, minus thirty-four, and six." This is "the why". Shows the source on screen; the one thank-you to Stuart stays at the end. | G4, G6 |
| 4 | 22.7 to 34 (plan) | The plan card: f = 600, change = -89, next change = -34, steady = 6 | "Here is the trick. Four accumulators form a chain. The last one never changes. Each row, every accumulator adds the one below it, and the top one is the table." | G3, G7 |
| 5 | 34.2 to 41 (step 1) | Dial the 6 on the constant transmitter | "Step one. Dial in a six. In this table, the last number in the chain is always six." | G5 |
| 6 | 41.6 to 57 (steps 2 and 3) | Accumulator 18's A output to Trunk 1, then Trunk 1 into the alpha input of accumulator 17 | "Steps two and three. Take the first difference out of accumulator eighteen, and add it into accumulator seventeen, the table itself. Look at the connectors. On the real machine, the ones that carry numbers are rectangular, with a dozen terminals. The ones that carry control signals are round." | G3, G7, **G14 (new)** |
| 7 | 57.3 to 72 (steps 4 and 5) | Printer switch 9 to P; accumulator 20's 5-out to program trunk 1-5 | "Step four: tell the printer to punch the table value. Step five: close the loop, so the end of each row starts the next." | G9, G10, G11 |
| 8 | 72.5 to 79 (the rest is done for you) | "The rest is done for you" card with the cable and switch counts | "The rest is wired for you: the starting numbers, the loader, and a counter in the master programmer that stops it after a hundred rows." | G8, G10 |
| 9 | 79 to 97 (INIT, first rows) | INIT, then the chain updating, cards punched | "Press init, the initiating pulse button. ENIAC punches a card, then adds down the chain, again and again. Watch the lamps. Zero is at the bottom and nine at the top." | init: say "init" as a word; B-group note on the 1946 name |
| 10 | 90.6 to 97 (the table goes below zero) | Row 6 to 8: f goes negative | "At row six the table dips below zero. Those are negative numbers, and ENIAC is still only adding." | G4 |
| 11 | 102 to 111 (result) | "ENIAC built the table!" result screen | "That is the whole table, made by adding. Same machine, different cables, a fourth job." | G3, G12 |
| 12 | end card (new) | Credits: simulator and program by Brian L. Stuart, Drexel University; the tutorial title; the museum | "The program is Brian Stuart's, from his tutorial, Polynomial Tables on the ENIAC, and it runs on his simulator. Come to the museum and try it yourself." | One Stuart thank-you, per the standing rule |

## Notes for the edit

- **Cold open (scene 1)** uses the Slow-speed run from 84.6 s. No caption boxes anywhere; the kiosk's own text carries the screen and the voice carries the explanation.
- **Silent holds:** the raw footage holds screens for 3 to 11 s for reading. With narration, hold each screen as long as its line, no longer.
- **Do not speed up** the run. If the 100-row run is shown, cut from row 12 to the result (the footage already does this with Full speed and "Skip to the answer").
- **Connector shot (scene 6):** slow push-in on the accumulator-17 window (alpha to epsilon rectangular, 5 in and 6 in round) is worth a 4 s hold. This is the shot Stuart's 5:02 note asks for.
- **Picker (scene 3):** page 2 shows only Difference. That is real (there are four missions, three to a page); it also tells viewers there are more.
- **Music:** ducked, as the main video; swap in a YouTube Audio Library track.

## Items that need a decision or a fact before audio

| Id | Item |
|---|---|
| S-1 | **G14 is new**: "data connectors are rectangular with 12 terminals; control connectors are round with two terminals" is from Stuart's email (about the real machine), not yet in the kiosk fact-check. Add it (done in the kiosk branch) and keep the narration limited to "rectangular" and "round". |
| S-2 | Scene 3's Babbage claims rest on Stuart's tutorial alone (kiosk G13). Nick decided Stuart's email is the fact-check. A museum source would still be better before the VCF/InfoAge cut. |
| S-3 | "Charles Babbage" and "Difference Engine" and "polynomial" go on the pronunciation sheet for the listening reel. |
| S-4 | Scene 12 names Stuart once. Check Stuart's OK to be named as the mission's author (kiosk D2). |
| S-5 | The 30 s and 8 s Shorts: cut from scenes 1, 9, 10 and 11 once the full cut is approved. |
