# Mission 4: Difference (draft)

**Date:** 2026-10-19
**Status:** Draft. The mission file loads, validates and passes its headless selftest on the real core. The picker, figures, finale and honor roll are not done, and nothing has been fact-checked.
**Source:** Brian L. Stuart's email of 2026-10-19: the tutorial "Polynomial Tables on the ENIAC" (`difference.pdf`) and the simulator configuration `difference.e`. He wrote it for a Haverford professor whose students will program the ENIAC, and suggested it as another mission.

## What the program does

It tabulates f(x) = x^3 - 20x^2 - 70x + 600 by the Method of Differences, the technique Babbage's Difference Engine used. Four accumulators form a chain: A17 holds f(x), A18 the first difference, A19 the second, A20 the third (always 6). Each row ENIAC punches a card, then adds A18 into A17, A19 into A18 and A20 into A19. Starting values 600, -89, -34, 6 are dialled into the constant transmitter and loaded at the start, two of them through shifter adapters.

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
