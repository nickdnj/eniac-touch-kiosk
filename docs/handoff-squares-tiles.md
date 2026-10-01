# Handoff: Squares for non-math visitors (from the VCF session, 2026-10-01)

## What Nick asked for

After seeing M1 running, Nick asked for the Squares mission to explain what a square *is* to someone who doesn't do math. He approved the mockup below ("love it").

## The idea

A square is tiles on a floor: 3 rows of 3 tiles is a square made of 9 tiles, so 9 is the "square" of 3.

The mission's trick is the same picture. Growing a 3×3 square into a 4×4 adds a **row of 3**, a **column of 3** and **1 corner tile**: 9 + 3 + 3 + 1 = 16. "Add the number twice, then add 1" is literally adding a row, a column and a corner. That's why ENIAC never multiplies here.

## Mockup

- `docs/mockups/squares-tiles.html`: open it in Chrome. It's standalone, scales to the window and uses the repo's fonts. Tap **Let's go** / **‹ Back** to switch screens.
- `docs/mockups/squares-tiles-plan.png`: the finished state of the plan screen.

It's a mockup only. Re-implement it in `src/web` the project's way; don't ship this file.

## Proposed copy (replaces `missions/squares.yaml` `content.briefing` and `content.plan`)

**Briefing**
- headline: "What is a square?" (the header already says "Mission 1: Squares")
- body: "Picture tiles on a floor. Lay them out 3 rows of 3, and you have a square made of 9 tiles. That is why 9 is called the “square” of 3. ENIAC can make a whole list of squares, and you will wire it up. No typing. In 1946, programming meant plugging in cables!"
- Keep `more` as it is.

**Plan**
- headline: "Here is the trick" (unchanged)
- body: "To make the square one size bigger, add a row, add a column, and add 1 tile in the corner. ENIAC never multiplies here. It just adds, and adding is what it did best."
- math: "9 + 3 + 3 + 1 = 16" (unchanged)
- Keep `more` as it is. It still credits Stuart and explains the multiplier.

## Animations

**Briefing canvas.** 9 tiles light one at a time (about 350 ms apart) in `--lamp-on`. A caption counts "1 tile … 9 tiles", then "3 rows of 3 = 9 tiles", then "The square of 3 is 9". It loops.

**Plan canvas.** A 4×4 grid, with the equation below it. Each piece lights its own term in the same colour:

| Beat | Tiles | Colour | Equation term |
|---|---|---|---|
| 0.3 s | the 3×3 base | `--lamp-on` amber | 9 |
| 1.8 s | bottom row of 3, left to right | `--cable-data` blue | first + 3 |
| 3.6 s | right column of 3, top to bottom | `--cable-prog` pink | second + 3 |
| 5.4 s | the corner | `--ok` green | + 1 |
| 6.6 s | | card white | = 16 |

The animation loops after about 11 s, and an **↻ Again** button (min target 64 px) replays it.

## Things to check

- The colour pairs reuse the cable and ok tokens, which could suggest "data cable" meanings. Consider dedicated tile tokens. UX spec 6.4 says meaning is never carried by colour alone. Here the order and the position do carry it, but consider adding a second cue, such as a "+3" label on the row and the column and a "+1" on the corner.
- Respect reduced motion: show the finished grid with all terms lit.
- **Fact-check gate.** The new sentence "adding is what it did best" is a claim. Either tag it `[FC]` in `review.factCheck`, or soften it to "and ENIAC was very fast at adding".
- Should the tile metaphor carry on into the run screen? For example, the accumulator 2 value (1, 4, 9, 16…) could be shown as a growing grid beside the lamps. Not mocked up; it's an idea for Nick.
