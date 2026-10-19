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
| D1 | **Where does `difference.e` live?** Missions read the program from the upstream `programs/` directory and nothing from upstream is committed (PRD R1). It is not in Stuart's repo at ad9a7a7. Ask him to commit it (and the tutorial) upstream, or get his written OK to ship it from `missions/programs/`. Until then the mission is unavailable on a clean checkout. This draft pins the file's sha256. | Nick |
| D2 | Permission to use his tutorial text and to credit him as author of the mission. | Nick |
| D3 | Mission order. Drafted as 4th, after Trajectory. Trajectory's result button still says "Finish". | Nick |
| T1 | Time slow and full speed on the Pi 5 and set `stallMs`. Placeholders now. | |
| U1 | UI: picker art, mission figures (`screens/mission.ts`), finale beats, honor roll (`content/honor.ts`) and the "three missions" copy all assume three missions. | |
| F1 | Fact-check every `factCheck` field and get Doug Crawford's copy approval (#35). | |
| V1 | New video segment. | |

## Kiosk change that came with it

`econfig/catalog.go` now accepts the letter `O` as "off" for printer field switches. Stuart's file writes `s pr.13 O`; the core treats anything but P as off, so it is an alias for `0`.
