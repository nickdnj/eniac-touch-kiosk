# Mission 4: Difference (draft)

**Date:** 2026-10-19 (revised 2026-10-20: cubes, Babbage explained, Your turn)
**Status:** Draft. The mission file loads, validates and passes its headless selftest on the real core. The picker, figures, finale and honor roll are not done, and nothing has been fact-checked.
**Source:** Brian L. Stuart's email of 2026-10-19: the tutorial "Polynomial Tables on the ENIAC" (`difference.pdf`) and the simulator configuration `difference.e`. He wrote it for a Haverford professor whose students will program the ENIAC, and suggested it as another mission.

## Why cubes (2026-10-20)

Brian's own table, f(x) = x^3 - 20x^2 - 70x + 600, starts at 600 and **falls below zero** (600, 511, 388, 237, 64, -125 ...). It is a fine classroom example, but for a first-time visitor "adding" looked like subtracting, nothing said who Babbage was, and the negative numbers were confusing (Nick, 2026-10-20: "I shouldn't be confused"). The mission now tabulates the **cubes** (0, 1, 8, 27, 64, 125 ...), which only climb, so every step is visibly an addition. It is the same chain, cables and switches; only the four starting numbers differ (`missions/programs/difference-cubes.e`; his original stays in `missions/programs/difference.e`). The briefing now says who Babbage was and why tables mattered, and the plan links to Squares: the changes of the squares are 1, 3, 5, 7, so cubes need one more link in the chain.

## Your turn

After the result, "Your turn" offers two things, both built from the visitor's own cards (no demo data):

1. **Predict.** The first four rows ENIAC punched (0, 1, 8, 27) with the change beside each; "What is row 5?" with three answers: the right one (64) and the two real slips (subtracting the change, using the change from the row above). The right answer is the card ENIAC really punched.
2. **Bend the table.** A fresh run in which the visitor picks the steady number (the last link in the chain) from 0 to 9; the bridge accepts a value for that one step only (`apply_step.value`, `content.yourTurn.step` in the YAML). The result screen then shows the first table beside theirs, rows 1 to 8, and says how many rows match before they drift apart.

Everything visitor-facing is in `content.yourTurn` in `missions/difference.yaml`; the logic is `src/web/app/yourturn/logic.ts` (tested in `tests/web/yourturn.test.ts`).

## What the program does

It tabulates the cubes, f(x) = x^3, by the Method of Differences (Brian's original tabulates f(x) = x^3 - 20x^2 - 70x + 600), the technique Babbage's Difference Engine used. Four accumulators form a chain: A17 holds f(x), A18 the first difference, A19 the second, A20 the third (always 6). Each row ENIAC punches a card, then adds A18 into A17, A19 into A18 and A20 into A19. Starting values 600, -89, -34, 6 are dialled into the constant transmitter and loaded at the start, two of them through shifter adapters.

Ran it on the real core at the pinned commit: rows 600, 511, 388, 237, 64, -125, -324 ... match the table in the tutorial. The last card of a 100-row run reports f(0), not f(100), because the master programmer counter has already reset when the printer looks (Stuart notes this).

## The five visitor steps

| # | Line | Teaches |
|---|---|---|
| 1 | `s c.k1 6` | The steady third difference |
| 2 | `p a18.A 1` | A data output onto a trunk |
| 3 | `p 1 a17.alpha` | Adding the difference into the table value |
| 4 | `s pr.9 P` | Punch the table value |
| 5 | `p a20.5o 1-5` | Closing the loop |

Everything else (35 cables and 76 switches, including the shifter adapters and the master programmer limit of 100) is in the preset.

## Open items

| Id | Item | Owner |
|---|---|---|
| D1 | ~~Where does `difference.e` live?~~ **Resolved 2026-10-19:** Stuart gave permission to ship it (relayed by Nick). It is `missions/programs/difference.e`, copied into `build/upstream/programs/` by `fetch-upstream.sh` (never over an upstream file of the same name; identical is fine, different aborts) and listed in `.provenance.json` as `addedFiles`. The tutorial PDF is not shipped. | done |
| D2 | Permission to use his tutorial text (the program has his OK; the PDF does not ship) and to credit him as author of the mission. | Nick |
| D3 | Mission order. Drafted as 4th, after Trajectory. Trajectory's result button still says "Finish". | Nick |
| T1 | Slow is about 1.2 s a row and Full about 0.6 s on the dev Mac (2026-10-19). Re-time on the Pi 5 and OptiPlex and confirm `stallMs`. | |
| U1 | **Done** (PR #79): per-mission art in `missions/registry.ts`, finale sentences in the YAML, paged picker, honor roll. The run stage is configured by `content.run.chain` (accumulators 17 to 20 here). Still open: Difference has its own briefing (bars crossing zero) and plan (the table built by adding) animations. | |
| F1 | **Not a blocker.** We are in development: build the mission and its video first, then send Doug Crawford the first draft, clearly caveated as not yet fact-checked, and fold in his review (#35). | |
| V1 | New video segment. | |

## Kiosk change that came with it

`econfig/catalog.go` now accepts the letter `O` as "off" for printer field switches. Stuart's file writes `s pr.13 O`; the core treats anything but P as off, so it is an alias for `0`.

## What a cube is (briefing)

The briefing tells a short story before it asks anything: people made number tables by hand and mistakes crept in; in the 1820s Charles Babbage planned a machine that built them by only adding; today ENIAC will build a table of cubes. Only then does it say what a cube is, for visitors who have not met the word: a number times itself, and again (2 × 2 × 2 = 8). The figure shows a page of squares with a slip circled, Babbage's columns of adding wheels, a 2 × 2 × 2 block of 8 little blocks, a 3 × 3 × 3 block of 27, and last the table of cubes built by adding (`stage/diffig.ts`, `blockCube`). A cube is a number to the third power (not the fourth). Reduced motion shows only the table; the body copy carries the story.
