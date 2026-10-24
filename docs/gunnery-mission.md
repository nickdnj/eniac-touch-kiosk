# Mission 5: Gunnery (draft)

**Date:** 2026-10-22. **Status:** Draft, built overnight. The mission loads, the shot dials in, flights run on the real core, the score and the top lists work. Not yet seen on a screen by Nick; nothing fact-checked beyond what is below.
**Idea (Nick, 2026-10-22):** turn Trajectory into a game. The visitor is given a target, chooses how to set up the gun, ENIAC flies the shell for real, and we score how close it landed. A top list of the day and of all time.

## The look (2026-10-23)

A 1946 fairground shooting gallery, in pinball-backglass colours (navy, cream, cherry red, mustard), all flat SVG, in `stage/gunneryfig.ts`:

- **Title screen** (the briefing): a marquee with chasing bulbs reading "GUNNERY" (with "ENIAC · 1946" above and a mustard ribbon "Can ENIAC hit the flag?"), a striped awning over a little gallery, a field gun lobbing a dotted shell at the flag on a loop, a burst and "+1000" when it lands, the score zones as bands on the counter, and a plate showing **today's best score** and its initials (or "BE THE FIRST").
- **Plan screen:** two gauge dials, CHARGE and ELEVATION, with "= one flight for ENIAC".
- **Picker card:** a small marquee, gun, dotted arc and flag; its meta line says "Aim, fire, and score. A game." instead of "You wire N steps" (`game.blurb`).

The motion (chasing bulbs, waving flag, shell and burst) is switched off for reduced motion.

## How a round goes (updated 2026-10-23: no manual wiring)

After the gun is locked in, the bridge places every cable and switch (the visitor does not wire anything; it was not the game). The kiosk then walks the visitor through the room (`screens/build.ts`): the 40-panel panorama pans to eight stops (Initiating Unit, Master Programmer, Accumulators 4 and 6, Multiplier, Function Table 2, Accumulators 15 to 20, Constant Transmitter, Card Reader and Punch), ringing only the units the program really uses, with a line on why each is there. The visitor moves it along with Next and Back (it never advances by itself), and a link underneath, "Skip to the gun", goes straight to the run screen. Then "Go to the gun" opens the run screen for READ and INIT. The stops and all the text are in `content.game.tour` and `content.game.build`.

The text below describes the first version, in which the visitor placed two cables; steps 3 onward are unchanged except that step 3 no longer exists.

1. **Briefing and plan** (short, in the usual mission screens).
2. **Aim the gun** (`screens/aim.ts`). A flag stands on a range ruler at a random target distance. The visitor picks a **charge** (how fast the shell leaves the gun) and an **elevation** (the angle). The small gun on the ruler tips as they choose. Nothing shows where the shell will land.
3. **Two cables.** The visitor places the "card read" cable and the "next hop" cable (the loop). The rest of Trajectory's wiring is already in place.
4. **READ, INIT**, then the usual run stage: the cards punch out and the arc draws.
5. **Result.** The landing is where the path between the last two dots crosses the ground (the same crossing the arc plot draws), in feet from the gun. Score: a miss of `hitFeet` or less scores the maximum; the score falls in a straight line to 0 at `zeroFeet`. The visitor sets three initials with arrows and saves; the lists show the best of today and of all time.

## How the shot reaches ENIAC (no change to Stuart's machine)

`missions/programs/gunnery.e` is `trajdemo.e` with only the launch-speed loads re-pointed: instead of card fields F and G (Constant Transmitter selectors 14 and 19), they read the manual **J** and **K** dials (selectors 25 and 30). The bridge sets those dials when it gets an `aim` message: speed times cosine of the elevation for J (across), times sine for K (up), in feet per second with four decimals, ten digits each, plus the sign switches. Aiming is refused after READ. READ and INIT are refused until the gun is aimed.

The mission YAML carries a `game` block (charges, elevations, targets, score rule, all screen text). `internal/mission/game.go` validates it and checks that every shot's dial lines are legal core commands at load.

## The game feel (2026-10-23, from Nick: "the flag runs through the whole mission")

- The flag and the **score zones** are on every view of the shot: the aim ruler (with a colour legend), the live arc while ENIAC computes, and the result. Zones nest around the flag: gold (the hit radius, 1000), green (750+), yellow (500+), orange (250+), red (1+). Each zone's edge is exactly where the score line crosses that value (`game/logic.ts` `zones`, tested).
- While the shell flies, a readout shows `Flag: 11,700 ft  ·  5,095 ft` (the shell's distance so far). At the landing the arc shows a pulse where it came down, a gold line to the flag with "770 ft long" or "short", and the points popping up. A bullseye adds a burst.
- The headline is a **rank**: Bullseye!, Sharpshooter (750+), Good shot (500+), Close one (250+), Keep firing. Also shown: where the score would stand on today's list ("That is number 1 today"), and shots fired and best score this visit.
- The aim screen shows "Score to beat today: N" once someone has scored today.
- All of this text is in `content.game` in `missions/gunnery.yaml`.

## Entering a name (2026-10-23)

Touchscreen, so no little arrows: "Save my score" opens a full-screen letter keyboard (QWERTY, space, delete) with the name shown in slots as it grows (`game/namepad.ts`). Up to **8 characters** (letters and spaces; the longest that fits the title plate and the lists; three initials is the arcade tradition, but nothing needs it). The bridge refuses names it will not carry (a short built-in list in `scores/blocked.go`, matching with look-alike digits turned back into letters, whole-name for short words and inside-the-name for long ones, so "CLASS" and "PASS" are fine) and the pad says "Pick a different name." Staff can add more words, one per line, to `blocked-names.txt` in the state directory (read when the bridge starts). It is a first line of defence, not a promise: look at the board now and then. The classic trade-off applies: a name that happens to contain a long blocked word is refused.

## Scores

`internal/scores`: one JSON file per mission under the state directory (`/var/lib/eniac-kiosk/scores/gunnery.json` on the kiosk). `GET /api/scores/{mission}` returns `{today, all}` (top 10 each). `POST` (same-origin only) takes `{name, score, missFeet, target, charge, elevation}`; the name is 1 to 8 of letters, digits, space, dot, dash. At most 200 entries are kept. To clear the board, delete that file. A staff "clear scores" button in the admin screen is not built.

## Flights, speed and repeatability (measured on the real core, 2026-10-22)

- Through the kiosk's own run path (bridge, `b c`, `b r`, `b i`), Trajectory's 34-card flight came out the same three times running (about 61 s each, Mac).
- My first hand-rolled harness did **not** give repeatable flights: the same shot landed at 30,300 ft in one run and 49,800 ft in the next, and runs started in parallel disagreed with serial ones. The bridge-driven sweep of 28 shots below, plus two repeats, was exact. Cause of the harness difference not found; it was my harness (it also showed two stray cards at the start). Until it is understood, treat **load on the machine while a flight runs** as a risk to fair scoring, and do not run the sweep tests while the kiosk is being used. See "Open questions".
- A flight takes about 1.5 s of wall time per hop on the Mac, so the choices are limited to flights of roughly 20 hops or fewer (see the sweep table below).

## Sweep results

Landing in feet and hops, on the real core through the bridge (`GUNNERY_SWEEP="c1/e5,..." go test -tags realcore -run TestGunnerySweep`). Two shots were flown twice (c4/e20, c2/e15) and came out identical.

| Charge (ft/s) | 5° | 10° | 15° | 20° | 25° | 30° | 40° |
|---|---|---|---|---|---|---|---|
| c1 Light (600) | 2,362 (4) | 4,052 (7) | 5,631 (10) | 7,063 (13) | 8,316 (16) | 9,381 (19) | 10,387 (24) |
| c2 Medium (900) | 4,394 (5) | 8,525 (10) | 12,313 (15) | 14,965 (19) | 17,233 (23) | 19,707 (28) | 21,385 (35) |
| c3 Heavy (1200) | 8,060 (7) | 14,369 (13) | 20,050 (19) | 25,047 (25) | 28,464 (30) | 31,967 (36) | 34,431 (45) |
| c4 Full (1550) | 12,810 (9) | 21,469 (16) | 30,178 (24) | 36,674 (31) | 41,182 (37) | 44,740 (43) | 48,841 (55) |

Hops are in brackets; a hop is about 1.5 s of wall time. The game uses the first three charges and 5 to 20 degrees (at most 25 hops, about 37 s). The table lists the position of the last (below-ground) card. The score uses the ground crossing between the last two cards, which is a little shorter. For the 12 shots the game uses, the crossings are: c1: 1,888 / 3,709 / 5,377 / 6,844; c2: 4,234 / 8,170 / 11,694 / 14,721; c3: 7,380 / 13,996 / 19,721 / 24,532 (5, 10, 15, 20 degrees). The eight targets are 3,700 / 5,400 / 7,400 / 8,200 / 11,700 / 14,000 / 19,700 / 24,500: each is the crossing of one shot, and the hit radius is 250 ft, so a perfect round exists and takes the right combination.

## Open questions

| Id | Question | Owner |
|---|---|---|
| G1 | Why did the hand-rolled harness give different landings for the same shot? Is the core's result sensitive to CPU load? If so, the kiosk box needs to be left alone while a visitor flies. | Nick / Stuart |
| G2 | The reconstructed drag table is Stuart's own; do not put "what a real 105 would do" ranges on screen (see `docs/trajectory-history.md` 5.3). | Content |
| G3 | Staff button to clear the score list. | Dev |
| G4 | Names are three letters picked with arrows. No profanity filter is needed for that, but a wall of "AAA" is likely. | Nick |


## Battleship (mission 6, 2026-10-23)

The same game and the same program with a navy dress (`missions/battleship.yaml`, `content.game.kind: ship`). The visitor picks a **ship** (Destroyer, Cruiser, Battleship), then one of the **two guns that ship carries**, then an elevation. The target is a named enemy ship; a bigger hull has a bigger hit radius (`targets[].hit`). Ranks, copy and art are naval (`stage/battleshipfig.ts`: the old board-game commercial look, with the ten-by-ten grid, grey warships, a starburst and a "SUNK!" stamp). Its scores are kept separately (`scores/battleship.json`).

Guns (speeds in ft/s, from the range measured for Gunnery; not real naval figures): Destroyer: Light 600, Quick 750. Cruiser: Medium 900, Long 1,050. Battleship: Heavy 1,200, Big 1,300. Elevations 5, 10, 15, 20 degrees. Ground crossings in feet (hops), measured on the real core through the bridge (`GUNNERY_MISSION=battleship GUNNERY_SWEEP=... go test -tags realcore -run TestGunnerySweep`):

| Gun | 5° | 10° | 15° | 20° |
|---|---|---|---|---|
| Light 600 | 1,888 | 3,709 | 5,377 | 6,844 |
| Quick 750 | 2,971 (5) | 5,753 (9) | 8,254 (12) | 10,435 (16) |
| Medium 900 | 4,234 | 8,170 | 11,694 | 14,721 |
| Long 1,050 | 5,705 (6) | 10,954 (12) | 15,550 (17) | 19,472 (22) |
| Heavy 1,200 | 7,380 | 13,996 | 19,721 | 24,532 |
| Big 1,300 | 8,604 (7) | 16,124 (14) | 22,592 (21) | 27,966 (27) |

The Big gun at 20 degrees flies 27 hops, about 40 seconds, the longest in the game. The eight targets are 3,700 / 5,400 (patrol boats, radius 150), 8,200 / 10,950 (destroyers, 200), 14,000 / 15,550 (cruisers, 300), 19,700 / 24,500 (battleships, 400).

Naming: the mission is called Battleship at Nick's request. "Battleship" is a Hasbro trademark and the TV catchphrase is theirs, so the copy uses its own words ("Ship sunk!"). Worth a different title if this ever leaves the museum floor.


## Filming a chosen target (dev hook, 2026-10-23)

In `make dev` only (the dev server defines `__DEV__`; a release build never has it), `http://localhost:8740/?target=14000` fixes the game's target: pass a distance in feet or a target id (`t5`) from the mission's `targets`. Without it the target is random each round. The same switch also turns on `?mission=<id>` (start a mission straight away), which was off in `make dev` before.


## Docent mode and the firing table (2026-10-23)

The kiosk is a docent's slide deck as well as a visitor's game. **Docent mode** (staff screen, behind the PIN: five taps on the wordmark, then "Docent mode: Turn on") does two things: the visitor idle timeout is off (a docent talking is not "still there?"), and the **Firing table** button appears on the Gunnery and Battleship aim screens. An amber "DOCENT MODE - tap to end" chip sits in the footer; it also ends by itself after 15 minutes without a touch, so a forgotten docent mode does not leave the table showing to visitors all day. Visitors never see the button: they try the game without the table.

The table page (`game/firingtable.ts`) is a typed page on cream paper: for each gun of the chosen ship (every gun when none is chosen, or in Gunnery), the angle, range in feet and time of flight in seconds, "worked out on this ENIAC simulator", with the line nearest the target marked and selected. If none of the shown guns can hit the target, it says so and points at another ship. "Use this shot" sets the gun, angle and ship on the aim screen, so a docent can say "a gunner would read it like this", tap it, fire, and then ask the visitor to try one without the table. The numbers are the measured sweeps in the mission file (`content.game.table`); `TestFiringTableMatchesCore` (real core, `go test -tags realcore -run TestFiringTableMatchesCore`) re-flies the quick rows and checks them to 2 ft and 0.1 s (`GUNNERY_TABLE_SECS=30` checks them all, about 10 minutes). It is labelled as a recreation: Brian Stuart's drag table, not an Army table.

Not built: speaker notes or "talk track" cards for each screen, and a way to show all six guns on one table page (open each ship's table instead).


## Talking points on the room tour (2026-10-24)

Each stop of the tour after the shot is aimed has, in the right-hand column, the unit's name, a one-line lead and 2 to 4 bullets: what a docent would say about that unit. There is no "Talking points" label (a visitor on their own just reads the bullets). Under the room is a tab for each of the nine stops (number and name); the current one is amber and a tap on any tab jumps to that stop, so a docent can move around like slides. Nine stops: Initiating Unit, Cycling Unit, Master Programmer, Accumulators 4 and 6, High-Speed Multiplier, Function Table 2, Accumulators 15 to 20, Constant Transmitter, Card Reader and Punch. They are in `content.game.tour[].bullets` in both mission files (2 to 5 bullets, 22 words at most each, checked at load).

Sources and cautions: the multiplier line (a built-in one-digit times table, digit by digit, partial products added up, about 3 ms) is fact-check A14 and BRL 971; the accumulator-as-memory framing (no memory bank, 20 accumulators, each holding a 10-digit number and passing it on over a trunk) matches the 1946 configuration the simulator models (the stored-program conversion came in 1948, see `docs/spikes/S4-monte-carlo-feasibility.md`); the Cycling Unit and times are A3; the drag-table line says the numbers are Stuart's own attempt. The "no memory bank" and "nothing stored electronically" phrasings are not yet in the fact-check file: add rows before the video quotes them. The Explore ENIAC card for the Initiating Unit (`explore/content.ts`) still carries "which Stuart's simulator labels INIT"; it was not part of this change.
