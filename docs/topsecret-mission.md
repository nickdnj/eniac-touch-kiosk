# Top Secret (mission 3): a labelled stand-in

## What it is, and what it is not

ENIAC's first real problem came from Los Alamos, in December 1945, months before the public unveiling.
Its equations and wiring were never published, so **there is nothing to recreate**. Top Secret does not
pretend otherwise. It runs a program *of the same kind*: a calculation marched forward in time,
where every step is made only of additions. The exhibit says "stand-in" on the picker card, the
briefing, the result and the credits.

This is the same move as Difference, where Brian Stuart's tutorial program stands in for Babbage's
engine. Here the program is ours (`missions/programs/heatrod.e`), credited to the exhibit team.

Not claimed anywhere: that this is the Los Alamos program, that ENIAC computed bomb physics on
this wiring, or that Monte Carlo was part of the 1945 run (the Monte Carlo neutron-chain runs were
a separate effort at Aberdeen in 1948, on the converted ENIAC; see `docs/manhattan-research.md`).

## The program

Heat along a rod, five cells shown (the program carries eleven). One INIT is one time step:

    new = left + 2 x me + right

Starting with one unit of heat in the middle, five INITs print on the notebook tape:

    0 0 1 0 0
    0 1 2 1 0
    1 4 6 4 1
    7 15 20 15 7
    36 57 70 57 36

The hump gets wider and flatter. (The rule keeps the real numbers exact, so the rows grow; the shape,
not the size, is the lesson.) Verified against `docs/spikes/S7-heat-rod/reference.py` over 15 steps and
20 repeat runs, and by `eniac-bridge selftest --mission topsecret`.

## How it is built

- Master Programmer stepper A runs the steps. The first INIT seeds the middle cell from Constant
  Transmitter dial J1 (fixed at 1 here); every later INIT is one time step. Data trunks 1 to 11,
  six program lines per step.
- The visitor wires 3 steps (the dial, the constant's output, the trunk into accumulator 3), the
  bridge applies the other 64 cables and 72 switches.
- No "your turn" step: the dial is not visitor-chosen. (The core panics on `s c.j1 99`; the bridge
  already refuses any value outside a step's listed choices, so a future free step is safe.)
- Art: `src/web/app/stage/heatfig.ts` (folder, spreading bars, one-rule plan card, picker).

## Fact-check items before it goes on the floor

1. "First problem was a Los Alamos problem, Dec 1945 to early 1946": confirm wording with Doug.
2. "Historians say it filled most of ENIAC's controls": the briefing "Tell me more" card; soften or cite.
3. The honor-roll row says "stand-in" and credits `programs/heatrod.e` to the exhibit team.

## Not built

A converter-code emulation or a "life of a neutron" Monte Carlo mission (4 to 8 weeks); see the S4 spike.
