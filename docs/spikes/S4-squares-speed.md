# Spike S4: speed presets (Mac part), Squares slow-rate tuning, and CLEAR with sq.e

**Issue:** #33 (Mac part only; the Pi soak, `time.Sleep` granularity on the Pi and the Pi confirmation of F1 are still open) | **Date:** 2026-10-01 | **Author:** software-developer agent (M2 upstream fixes)
**Core:** `c4b94f2` plus `patches/0001`–`0003`, macOS arm64, `GOMAXPROCS=2` (the kiosk config). Measured from timestamped status streams unless tagged **[I]**.

## Result: `cy.rate` per mission

| Mission | Slow | Full | Notes |
|---|---|---|---|
| **Squares** | **13** (today: 100) | 0 | At 13, acc 2's three visible steps per INIT (+x, +x, +1) are 1.0–1.6 s apart, inside the "1 step per 1–3 s" target. One INIT takes 7.5–8.9 s and press-to-idle about 13 s. If that is too slow for the script, **20** is the faster fallback: 0.6–1.1 s between steps, press-to-idle about 8.6 s. |
| **Primes** | **100** (keep) | 0 | Slow: about 1.8 s per odd number tested, so a new prime card every 1.8–5 s at the start. Full: a card every **0.600 s**, paced by the punch, not the CPU; 407 cards in about **4:05**. |
| **Trajectory** | none (Full only); optional **50000** | 0 | Full: a card (hop) every 1.43 s, a 34-card flight in about 49 s. 50000 gives 4.3 s a hop; anything slower makes a flight minutes long. Switching mid-run is safe. Details in `docs/spikes/S2-trajdemo.md`. |

I have **not** changed `missions/squares.yaml` (its `slow.rate` is still 100). Moving it to 13 also changes the run pacing in UX 8.1.4. "Keep pressing for me" at Slow would make about one square every 13 s instead of one every 3 s. It also changes `session_test.go` (which asserts `s cy.rate 100`), the hard-coded `slow: 100` in the idle real-core tests, the `sq-3inits` golden ("rate 100, the Squares slow preset"), and the real-core e2e timings. That is a one-line config change plus test updates, once Nick and UX accept the pacing, and best confirmed on the Pi first.

## How `cy.rate` works

`s cy.rate N` makes the cycling unit sleep `500000/N` µs in each of the 40 pulse slots of an addition time, so an addition time is **20/N seconds** (`src/cycle.go`). Rate 0 means no sleep at all: unthrottled and CPU-bound. At high rates, `time.Sleep` granularity takes over and the real time is longer than nominal (architecture A3). The trajectory's hop took 9.4 s at 20000 against 15.7 s at 10000, not twice as long.

## Squares: what one INIT looks like at each rate

`sq.e` adds x into acc 2 twice (acc 1 program 6, repeat 2), then 1 from the constant transmitter into acc 1 and acc 2. Then acc 2 transmits once (program 7) to nothing. That transmit makes every digit lamp of acc 2 count through 0–9 and back, a "flicker" of about 9 pulses that the visitor will see. Measured from INIT 2 and 3 of three-INIT runs:

| `cy.rate` | Addition time | acc 2 step gaps (+x, +x, +1) | INIT to first step | INIT to last change | Press-to-idle (bridge) |
|---|---|---|---|---|---|
| 100 | 0.2 s | 0.15–0.24 s | 0.4–0.5 s | 1.2 s | 1.8 s (50-INIT soak) |
| 40 | 0.5 s | 0.35–0.53 s | 0.9–1.3 s | 2.6–3.0 s | not measured |
| 20 | 1.0 s | 0.6–1.07 s | 2.0–2.7 s | 5.2–5.9 s | 8.6 s |
| **13** | **1.54 s** | **0.98–1.59 s** | **3.6–4.0 s** | **8.5–8.9 s** | **12.9 s** |
| 10 | 2.0 s | 1.2–2.08 s | 3.6–5.2 s | 9.8–11.5 s | not measured |

The middle gap (the second +x to +1) is always about 0.65 of an addition time, so it sets the limit. **Rate 13 is the fastest rate at which every step is at least about 1 s apart.** The first INIT after load is about one addition time slower to show its first step than later INITs.

The bridge's idle detector stays correct at the slow rates. `quietMs: auto` is 3 × the addition time (4.6 s at 13, 3 s at 20). A known-answer check of 3 INITs each at rates 13 and 20 gave settled values 1/1, 2/4 and 3/9 with no idle declared too early (temporary test, not committed). The 50-INIT soak at 100 (`TestIdleRealCoreSlow50`) still passes.

### What the targets mean in presses per second

| Source | Says | Means | Rate |
|---|---|---|---|
| PRD FR-17 | "read successive squares in accumulator 2 (about 1–3 per second)" | 1–3 **squares** (presses) per second | Only at Full (press-to-idle at most 0.17 s in the 50-INIT soak), and then no step inside a press is visible. Rate 100 already gives only about 0.5 presses a second. |
| UX 8.1.4 "Keep pressing for me" | about 1 square per 3 s at Slow | 0.33 presses/s | about 40 (press-to-idle about 4–4.5 s **[I]**: last change at 2.6–3.0 s plus 1.5 s quiet) |
| This task's brief (#33) | "about 1 step per 1–3 s" | each **addition step** visible for 1–3 s | **13** (picked) |

These targets conflict. FR-17 is about seeing the table of squares grow. The 1–3 s target is about seeing each addition. I picked the per-step target because that is what makes Slow worth having: at 100 the steps blur at 0.2 s. A sensible script combines them: Slow (13) for the first one or two presses with the step captions, then Full or "Keep pressing" at Full for the table. Whether FR-17's wording changes is for Nick and UX to decide.

## CLEAR (`b c`) with sq.e

After 3 INITs (acc 1 = 3, acc 2 = 9), `b c` sets **acc 1 and acc 2 to 0** (`mpclear()`, `accclear()` on all 20 accumulators, `divclear()`, `multclear()` in `initiate.go`). The next INIT gives **1 / 1**: the table restarts from x = 1. `sq.e` has no `cc` switches, so CLEAR is a plain reset of the machine's numbers. The cables and switches are untouched.

## sq.e: one square per INIT (UX F1)

Reconfirmed on the Mac: each INIT moves acc 1 from x to x + 1 and acc 2 from x² to (x + 1)², then the machine stops. The Pi confirmation is still part of #33.

## Still open (Pi part of #33)

- The 50-press known-answer soak at each preset on the Pi 5, including the chosen Slow.
- `time.Sleep` granularity on the Pi at Slow 13 / 100 / 50000 (A3).
- Squares F1 on the Pi.
- Whether the Pi's Full is fast enough for Trajectory (on the Mac, `GOMAXPROCS=1` is 26% faster than 2; see S2).
