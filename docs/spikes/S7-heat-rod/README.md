# Spike S7: heat spreading along a rod, by adding only

**Date:** 2026-10-29 | **Core:** Brian L. Stuart's simulator, unmodified (`army-mission/build/darwin-arm64/eniac-core`, cwd `build/upstream`), macOS arm64. Pi/x86 not measured.
**Purpose:** stand-in for the secret Dec 1945 Los Alamos run (an iterative march-forward-in-time calculation). Must be labelled a stand-in. It is not the Los Alamos calculation and not a physical simulation of a real rod.
Files: `heatrod.e` (the program), `drive.py` (runs it, checks it), `reference.py` (hand-computable Python), `timing.py` (per-INIT time).

## Result in one line
It works with adding only: 5 cells, one INIT = one time step, matches the Python reference exactly for 15 time steps, 20/20 identical runs with `GOMAXPROCS=2`, no deadlock. No multiplier, no divider, no subtract, no function table.

## What it computes
Five cells in a row hold temperatures (Acc 1-5). Each step, every cell's new value is **left neighbour + 2 x itself + right neighbour**. That is heat diffusion with the "divide by 4" left out, so every step the numbers grow about 4 times; the SHAPE (hump flattening and widening, like Pascal's triangle) is the point. Ends are **insulated**: a missing neighbour is treated as a copy of the end cell (so the end cell adds itself 3 times). Insulated is the honest choice because the total heat is exactly conserved (total x4 each step); a cold-ended rod would leak heat out and the numbers would not add up.

## The wiring in plain English
- Accumulators 1-5 are the rod now. Accumulators 6-10 are the rod one step later (scratch pads).
- Each accumulator's output goes on its own data trunk (trunks 1-10). Each new cell (6-10) listens to the trunks of its left neighbour (input alpha), itself (beta) and its right neighbour (gamma). Old cells (1-5) listen to the new cells' trunks on input delta (for the copy back).
- INIT goes to the Master Programmer stepper A. Stage 1 (one pulse) is the seed: constant transmitter J (dial `c.j1`, 0-9) is added into the middle cell Acc 3. Stage 2 (99 pulses) is a time step. This is the same trick `nim20.e` uses.
- A time step is 6 program lines in a row, each triggered by the previous one finishing:
  - lines 1-2 to 1-6: old cell k sends its number (and clears itself, switch C). Its new-cell neighbours k-1, k+1 each take it once; new cell k takes it **twice** (the sender and its own receiver both have repeat 2; the two end cells use repeat 3 for the mirrored neighbour). The neighbours have repeat 1, so they ignore the extra pulse. (Repeat counts are set on both sender and receiver, as in `nim20.e`.)
  - line 1-7: the five new cells send themselves back into the five old cells (and clear), so the new cells are empty for the next INIT.
- The cells are never cleared explicitly: sending with the clear switch empties them. CLEAR before the first INIT is needed.
- Size: 161 lines (69 cables, 73 switches), 10 accumulators, 1 constant transmitter, 1 Master Programmer stepper.

## Dumps vs the reference
`python3 drive.py 7 1` (Acc 1-5 after each INIT; INIT 1 only seeds). The program matched `reference.py` on every row; new cells (6-10) read 0 after every INIT.

| INIT | Acc 1 | Acc 2 | Acc 3 | Acc 4 | Acc 5 | match |
|---|---|---|---|---|---|---|
| 1 (seed) | 0 | 0 | 1 | 0 | 0 | OK |
| 2 | 0 | 1 | 2 | 1 | 0 | OK |
| 3 | 1 | 4 | 6 | 4 | 1 | OK |
| 4 | 7 | 15 | 20 | 15 | 7 | OK |
| 5 | 36 | 57 | 70 | 57 | 36 | OK |
| 6 | 165 | 220 | 254 | 220 | 165 | OK |
| 7 | 715 | 859 | 948 | 859 | 715 | OK |

Further, INIT 16 (15 time steps): 214146295 214978335 215492564 214978335 214146295, still matching, still 9 digits. Total heat x4 each step is exact (step 15 total is 4^15 = 1,073,741,824). Largest cell at step 15 is 215,492,564 for heat 1; the arithmetic is linear in the heat, so heat 9 gives 1.94 billion, still inside 10 digits (computed, not run). So at least 8 steps fit for any dial 0-9 (15 steps verified for heat 1).

## Repeatability
20 runs of 9 INITs each with `GOMAXPROCS=2`: all 20 dumps identical (one md5, 20 counts). Heat dial values 1 run only for the 20; other dial values only run once. No wait/timing sensitivity seen in the program (drive.py waits until all ten accumulators stop changing and the new cells are 0).

## What failed or went wrong on the way
1. First wiring used the *receiver's* repeat switch only for the double-count: the middle new cell got 1 instead of 2 (and with no copy-back, neighbours were fine). Cause: repeat has to be set on the **sender** as well as the receivers (the sender actually repeats). Fixed by setting the sender's repeat to 2 (3 at the ends); neighbours keep repeat 1.
2. My first test driver dumped after 0.6 s, mid-step, and showed junk like `M 1111111111`; that was only reading during a run. Not a program fault. `drive.py` now waits for a settled machine.
3. **Core crash:** setting a two-digit value on the one-digit dial (`s c.j1 99`) panics the core (`constant.go:335`, index out of range). The kiosk bridge must whitelist single digits 0-9 for the heat dial. (In this file the dial is c.j1 only; a 2-digit heat would need `c.j2` too, not tried.)
4. Nothing deadlocked.

## Not verified
- The stage-2 count of 99: after 99 time steps the Master Programmer wraps and the next INIT re-seeds (adds the heat again, without clearing). Not run for 99 steps. If the mission needs a clean restart, send CLEAR (`b c`) first, as in Race/Nim.
- Visitor-chosen hot cell position (here the middle cell is fixed in the wiring); letting the visitor choose the seed cell would need the dial to route to a different cell, not tried.
- Pi 5 / x86 speed.

## Time per INIT
Measured with `timing.py` (polls all ten accumulators, reports the last change after INIT):

| Core `cy.rate` | seed INIT | time-step INIT |
|---|---|---|
| default (unthrottled, nothing set) | about 2 ms | about 14 ms |
| 100 | about 0.6 s | about 3.3 s |
| 25 (S6's slow speed) | about 2.5 s | about 12.5 s |

At the default speed a time step is instant, so a mission wanting a visible march needs the slow rate (about 12.5 s per step at 25; 6 steps is about 75 s). The step is 7 sequential program lines (about 1.8 s each at rate 25), so it is slow to watch at rate 25; rate 100 (3.3 s) is probably the best compromise for a kiosk.
