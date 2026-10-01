# Spike S2 (R4): trajdemo part-by-part INIT, fast-forward, and run-to-run differences

**Issue:** #31 | **Date:** 2026-10-01 | **Author:** software-developer agent (M2 upstream fixes) | **Feeds:** #37 (Trajectory mission), the UX spec 8.3 (Trajectory script), #34 (report to Stuart)

**Core:** upstream `c4b94f2` plus `patches/0001`–`0003` (0003 is new, from this spike), macOS arm64 (M-series Mac), `GOMAXPROCS=2` as in the kiosk config unless stated. The Pi 5 has not been measured. Every number below was measured unless it is tagged **[I]** (inferred).

## Summary

1. **FR-19 as written (one INIT per demo part) cannot be met with the unmodified `trajdemo.e`.** The file is wired so that INIT starts only the artillery trajectory. The five earlier parts are in the file, but nothing in the file connects INIT to them. This is the file itself, not our routing, and it has been this way at every upstream revision, including today's upstream HEAD `7c043c5`.
2. **The R4 fallback is what works:** CLEAR, READ, INIT, and then one flight at Full. A flight is **34 cards in about 49 s** on the Mac. The bridge can **freeze the machine on the landing card** with `s cy.op 1a`, which is already on the whitelist.
3. **Fast-forward:** nothing is faster than Full (`cy.rate 0` is unthrottled and CPU-bound). The only lever is `GOMAXPROCS=1` for the core, which makes a hop 26% faster (1.06 s against 1.43 s). Changing `cy.rate` mid-run is safe: the cards are byte-identical.
4. **The run-to-run differences are a data race in the core**, not timing or uninitialised state. At 1PP time, two goroutines increment the same accumulator digit, and now and then one increment is lost. The "up" numbers then come out a few units low from that card on. **Patch 0003** (8 lines: a per-accumulator mutex) removes the race, and it is in `patches/series` under the NFR-12 policy.
5. **The "first card is sometimes all zeros" effect is not about the READ-to-INIT gap.** During loading, the Master Programmer's B, C and H steppers sometimes advance one stage (about half of the runs). `trajdemo.e`'s own `b c` (CLEAR) undoes that. **The mission must send `b c` before READ.** With it, 10 of 10 runs punched the correct first card.

## 1. How trajdemo.e drives its parts

The header says "The initiate button is used to start each part of the demo by pulsing the A input on the Master Programmer. The end of each part advances the A stepper." The wiring in the file does something else:

| Line | What it does |
|---|---|
| 38 `p i.Io 1-1`, 48 `p 1-1 p.Ai` | INIT to the A stepper's input (the documented design) |
| **836 `p i.Io 3-10`** | INIT to trunk 3-10, the **trajectory's start** (`a4.4i`, `a6.6i`, `a15.3i`, `a18.11i`, `a20.3i`, `a10.10i` load the starting values) |
| 52 `#p p.A1o 1-6` (commented) / 53 `p p.A1o 1-4` | A stage 1 goes to `1-4`, which is `p.Hi`, the H stepper that runs the **trajectory loop**. The `1-6` route to part 1 is commented out. |
| 839–841 `b c`, `b r`, `b i` | The self-starting tail |

The initiating unit has **one** slot for the `i.Io` jack (`initjack[17]` in `src/initiate.go`). The second `p i.Io` (line 836) replaces the first, so **INIT reaches only trunk 3-10, the trajectory.** I checked the alternative too. With `p i.Io 3-10` withheld, INIT reaches the A stepper as the header describes, but A stage 1 is wired to the trajectory loop (`1-4`). One stray card came out, then the same trajectory. No run pulsed the A stepper's later stages, the B stepper's part outputs or Acc 2/16/17. So the parts (5,000 additions, the 100 Hz rerun, the multiplier, squares and cubes, sines and cosines) are unreachable without **adding** lines that are not in the file (for example uncommenting `p p.A1o 1-6`). That would break the unmodified-`.e` rule (architecture 5.9.1, FR-14).

**Upstream history:** `programs/trajdemo.e` has the same wiring (`p i.Io 1-1`, `#p p.A1o 1-6`, `p p.A1o 1-4`, `p i.Io 3-10`) in both revisions that touched it (`e090029`, 2025-04-24; `faa9d14`, 2026-04-04). Upstream HEAD on 2026-10-01 is `7c043c5`; its three commits since our pin change only `README.md` and `vis/ansi.go`. **No newer upstream `trajdemo.e` has the parts.** Stuart presumably rewires the file by hand to demonstrate other parts. That would be a question for him (#34), not something we can fix in the mission.

## 2. Behaviour of the trajectory (answers to the UX questions)

Each item here confirms or corrects the UX designer's 8.3.1 notes.

| UX claim | Result | Evidence |
|---|---|---|
| READ loads the card; Acc 1 = 97367 | **Confirmed.** After `b r`, Acc 1 = `0000097367` (status `ad 0 6..10` = 9 7 3 6 7). The reader is paced at 375 ms of wall-clock time. | runs with `b c`, `b r` |
| The first INIT starts the trajectory at once | **Confirmed**, and explained by the `i.Io` override (section 1). | 20+ runs |
| Every later INIT restarts it | **Partly.** A second INIT mid-flight resets the hop counter to `00001`, but "along" and "up" carry on from where they were, so the rest of that flight is **wrong**, not a clean restart. Example: INIT at 15 s, and the next card is `00001 … 0090859575 0004085277`. **Do not offer INIT during a flight** (the BUSY guard). | `mid_init` run |
| After landing it starts another flight by itself | **Confirmed.** It loops until the core is stopped. Flights 2, 3, … are identical to each other (when no INIT interrupts them) but differ from flight 1 in the low digits (`0014127117` against `0014128681` on card 1), because some state carries over. | 11-minute run, 8 flights |
| CLEAR mid-flight doesn't stop it | **Confirmed.** One garbage card with hop `00000`, then a **clean flight identical to flight 1**, with no INIT needed. | `mid_clear` run |
| No sign of the six parts in 6 INITs over 90 s | **Confirmed.** It is how the file is wired (section 1), not a routing problem on our side. | |
| The first card is sometimes all zeros, depending on the READ-to-INIT gap | **The cause is load-time state, not the gap.** See section 4. | 20 gap runs, 10 CLEAR-first runs |
| One card takes 2–3.4 s; about 35 cards per flight | **Corrected:** **1.43 s** a card on a quiet Mac at `GOMAXPROCS=2`, and 2.2–2.7 s with 4–6 cores running at once (the UX runs had other load). **34 cards** per flight: hop 34 is the first with a negative "up". It is 35 only when the zero card appears, which CLEAR-first prevents. | section 3 |

### Can the machine be stopped at landing?

**Yes.** On the first card with a negative "up", the bridge sends **`s cy.op 1a`**. That command is already on the whitelist (architecture 5.2, the P2 "Step" option). The cycling unit then waits for a `b p` that never comes. In the test, 34 cards had been punched and nothing followed in the next 12 s: no cards and **no status lines at all**, not even `cy`. `s cy.op 1p` does the same (it is what `eniac-bridge record --freeze` uses), but it is not whitelisted and isn't needed. The landing card reaches the bridge within one 30 ms status sample, and the next hop needs about 1.4 s, so nothing from flight 2 is punched. Ending the session (`q`) works just as well if the mission goes straight to its result screen.

**Detecting landing:** the punch payload is 80 characters (sixteen 5-character fields). "Up" is columns 71–80, which is `punchField` indices 14 and 15 (0-based), with the sign in column 71. Landing is **the first card whose column 71 is `-`**. In the architecture's predicate grammar that is `{punchField: {index: 14, eq: "-0029"}}` only for this exact flight, so a "starts with `-`" form (or a dedicated `landed` predicate) is needed. That is an input for the M2 mission-format work.

## 3. Timings (Mac)

| What | Full (`cy.rate 0`) | Notes |
|---|---|---|
| READ | about 0.4 s | wall-clock reader pacing (375 ms) |
| INIT to first card (CLEAR first) | 1.4–1.6 s | the first hop |
| One hop (card) | **1.43 s** (`GOMAXPROCS=2`) | 1.06 s at 1, 1.76 s at 4, 1.88 s at 8. More Ps make it slower: the core is a chain of goroutine hand-offs, and cross-core wake-ups cost more than they gain. |
| One flight (34 cards) | **about 49 s** | 47.6–50.5 s in three quiet runs; about 36 s at `GOMAXPROCS=1`; 75–90 s with 4–8 cores at once |
| Punch | 600 ms per card, wall-clock (150 + 450 ms in `initiate.go`) | Overlaps the next hop, so it doesn't limit trajdemo. It does limit Primes (below). |

Slower rates (one core, `GOMAXPROCS=2`). The core sleeps `500000/rate` µs per pulse slot, so the nominal addition time is `20/rate` s, but sleep granularity dominates at these rates:

| `cy.rate` | Nominal addition time | Measured hop | One flight |
|---|---|---|---|
| 50000 | 0.4 ms | 4.3 s | about 2.5 min |
| 20000 | 1 ms | 9.4 s | about 5 min |
| 10000 | 2 ms | 15.7 s | about 9 min |
| 5000 | 4 ms | about 28 s | about 16 min |

**Changing `cy.rate` mid-run is safe.** A run at rate 5000, switched to 0 after 30 s, punched cards byte-identical to a run at Full from the start (24 cards compared). This needs patch 0003: without it, any two runs may differ (section 5).

**Recommendation for the Trajectory speeds** (input to #33): **Full only** (`rate 0`). Each hop is a card, and a card every 1.4 s is already a readable pace. A "Slow" that makes the multiplier and function-table lamps readable would make the flight minutes long. If UX wants one, rate 50000 (4.3 s a hop) is the fastest useful step. It is best kept to the first hop or two, then switched to Full, which is safe.

## 4. The all-zero first card

In about half of all core starts, the Master Programmer's **B, C and H steppers move to stage 1 while the `.e` is being loaded** (status lines `mps 1 1`, `mps 2 1`, `mps 7 1` at about 1.0 s, before any button). If INIT then comes without a CLEAR, the first card is punched 0.15 s after INIT with hop `00001` and zeros in "along" and "up". Every later card then has a hop number one too high, so the flight looks like 35 cards.

| READ-to-INIT gap, no CLEAR | 0.5 s | 1 s | 2 s | 3 s | 5 s |
|---|---|---|---|---|---|
| Zero card (2 runs each) | 2/2 | 2/2 | 0/2 | 2/2 | 1/2 |

The pattern doesn't follow the gap. It follows whether the steppers moved at load: every zero-card run had the `mps` lines at load, and no clean run had them. **With `b c` sent before READ, 10 of 10 runs punched the correct hop-1 card first**, including the 6 where the steppers had moved at load. `trajdemo.e`'s own tail starts with `b c`, for presumably this reason.

The cause inside the core is not pinned down **[I]**. The clock already runs while the argv load plugs cables, and the race detector flags load-time plugging (`mpplug`, `trunkxmit`) against the unit goroutines. CLEAR is the program's own cure, so **no patch**. It is noted in the bug report for Stuart.

**Mission impact:** keep `b c` as a withheld line and send it automatically right before `b r` (one READ tap sends `b c`, then `b r`). Do not drop it, as UX 8.3.2 currently does.

## 5. Run-to-run differences in the cards (the S3 side finding)

### What it looks like

In five runs out of 15 between 16:04 and 16:14, the cards differed from the reference flight in the **"up" field only**, **always a few units too low**, from some card on. The error then grows:

| Run | First differing card | Reference / run |
|---|---|---|
| 1 | 2 | `0010946479` / `0010946476` |
| 2 | 3 | `0015785322` / `0015785321` |
| 3 | 5 | `0024276672` / `0024276671` |
| 4 | 12 | `0042441105` / `0042441104` |
| 5 | 18 | `0044760697` / `0044760695` |

"Along" never differed. The first card was always right.

### Cause: a data race (not timing, not uninitialised state)

- `fanout()` (`src/eniac.go`) hands each clock pulse to all units **concurrently**.
- At 1PP time, an accumulator whose **receive** program has the correct switch set (`cc C`, which sets `stCORR`) adds 1 to its units digit in `doonepp()`, in its `accunit` goroutine (`accumulator.go:561`).
- In the same pulse, a **subtracting** transmitter sends its 1' pulse to that accumulator. It arrives through `accunit2()` → `accrecv()`, which increments the same digit in **another goroutine** (`accumulator.go:388`).
- Both are unsynchronised `u.val[0]++`, so one increment can be lost.

The Go race detector (`go build -race`, trajdemo for 40 s) reports exactly this pair, `accrecv` against `doonepp`. That pair is gone with the patch. Lost increments fit every symptom: only the subtracting path ("up", where gravity is subtracted), always too low, and errors that accumulate in later cards.

Timing dependence was considered and ruled out. The only wall-clock effects in the core are the reader (375 ms) and the punch (600 ms). They change how many addition times pass during a print, not the arithmetic, and a timing effect would be expected to err in both directions. Uninitialised state was ruled out too: flight 1 always starts identically, and flights 2 and later are identical to each other.

### How often

How often it happens depends on the environment, and that is the honest limit of this evidence:

| Window (2026-10-01) | Core | Runs | Runs with wrong cards |
|---|---|---|---|
| 16:04–16:14, Mac also busy with other sessions' work | 0001+0002 | 15 | **5** |
| 16:09–16:13, interleaved with the row above | **0001+0002+0003** | 12 | **0** |
| 16:49–17:01, quieter: GOMAXPROCS 2 and default, 4–8 cores at once, 14 `yes` CPU hogs, efficiency cores only (`taskpolicy -b`) | 0001+0002 | 52 | 0 |

The fixed and unfixed cores were tested **alternately in the same busy window**: 0 of 12 against 5 of 15 (one-sided Fisher p ≈ 0.04). I could not recreate the busy window's conditions on demand later. So the claim rests on four things: the mechanism, the race detector, the one-sided errors, and the interleaved comparison. It does not rest on a reproducible failure rate. The fix is correct by construction: the two increments to `val[0]` can no longer interleave.

### Does it matter for the mission? Yes, so patch 0003

- The Trajectory mission **shows the punched numbers** ("along", "up", the landing point), and fact-checked copy may quote them. A visitor would not notice the low digits, but a wrong card is still a wrong answer.
- **Tests:** any golden or canary that compares trajdemo cards beyond the first few would be flaky. The `traj-*` goldens stop at 7 cards and compare each run with its own punch file, so they were safe.
- **The Pi 5** runs the core beside Chromium on 4 cores. The busy-machine conditions that triggered the race are plausible there.
- Other programs: any program that uses a receive-with-correct (`cc C`) while subtracting into the same accumulator. `sq.e` doesn't, and `sieve.e` gave all 407 primes.

**Patch 0003** (`patches/0003-acc-1pp-race.patch`, 8 lines) adds a `sync.Mutex` to the accumulator struct, held by `accrecv()` and by the `doonepp()` correction. It applies cleanly after 0001 and 0002 with no fuzz. It made no measurable speed difference (cards in 75 s: 18–20 with it, 16–19 without, same load). The race detector's other reports are not patched, because none was shown to change any output: status-goroutine reads (architecture A7), load-time plugging, multiplier flags read by `st1()`, and the Master Programmer's two goroutines.

**Regression test:** `TestRealCoreTrajdemoDeterministic` (`make test-realcore`) runs four self-starting trajdemo cores at once for 45 s. All must punch identical cards, and the first 7 must equal `tests/golden/traj-patched.punch`. Given the environment dependence, **a pass does not prove 0003 is applied.** In the quiet window, a core without 0003 passed the same procedure four times out of four. `tests/upstream/test-fetch.sh` checks that the patch is applied. The canary mainly guards trajdemo's output at an upstream bump.

## 6. Fast-forward and skip

- **Faster than Full:** not with `cy.rate`, because Full is already unthrottled. `GOMAXPROCS=1` gives 1.06 s a hop instead of 1.43 s (a flight in about 36 s instead of 49 s). It is set when the core starts, so it would need a per-mission core option in the bridge (`core.gomaxprocs` is global today). Not done; it's an option for M2 if Trajectory is too long on the Pi.
- **Skip within a flight:** not possible. There is no snapshot or restore, and CLEAR restarts the flight. "Skip to the answer" can only mean ending the session and showing a result that says the flight was skipped. It must not show landing numbers that weren't computed, under the no-demo-data rule.
- **Skip parts:** moot, because there is only one reachable part.

## 7. What the captions can be keyed on

| Signal | Source | Use |
|---|---|---|
| Card *n* punched | `punch` line; hop in columns 26–30 | "Hop *n*" and the arc dot |
| Apex | first card whose "up" is lower than the previous card's (card 17: 45182863 < 45286111) | "Highest point" |
| Landing | first card with `-` in column 71 (card 34) | "Landed"; then freeze with `s cy.op 1a` |
| Hop in progress | MP H stepper `mps 7` goes 1, 2, 0 at the end of each hop; multiplier (`m`) and FT 2 (`ftr 1`) lines between cards | the "computing" beat |
| READ done | Acc 1 = 97367 | "The card is read" |

**Units [I]:** the card's constants decode as g = 32.17 (`-000003217`) and starting speeds of 1432 and 593.2 (`0014320000`, `0005932000`). Read as feet per second, that is 1,550 ft/s at 22.5°. The cards then fit **one card per second of flight** with "along" and "up" **in feet to four decimals**: card 1 is 1,412.87 ft along and 569.32 ft up; the top is about 4,528.6 ft at card 16; card 33 is at 38,079 ft and 217.7 ft up and card 34 at 39,042 ft and 295.1 ft below zero, so the shell lands at about 38,490 ft (7.3 miles) after about 33.4 s (interpolated). That matches a drag-slowed shell (in a vacuum the same shell would reach about 5,470 ft and stay up 36.9 s). The file says only "rectangular integration with a delta-t of 0.01s", which would mean 100 steps per card. **Nothing in the file states the units.** Show them only after Stuart or the Fact-Checker confirms (UX 8.3.1 already holds back).

## 8. For the UX designer (8.3) and the M2 mission format

1. **Keep `b c`:** send it automatically just before `b r` (one READ tap sends `b c`, then `b r`). It prevents the zero card. Then a flight is **34 cards**.
2. **INIT is pressed once.** After that it stays disabled until the session ends or the flight lands, because a second INIT corrupts the flight.
3. **Landing:** the first card with `-` in column 71. Freeze with `s cy.op 1a` (whitelisted), or end the session.
4. **Timings for the script (Mac, quiet):** READ 0.4 s, first card 1.5 s after INIT, a card every 1.43 s, landing at about 49 s. Plan on 1.5–2.5 s a card for the Pi until it is measured.
5. **Speeds:** Full only (rate 0); optional Slow 50000 (4.3 s a hop) for the first hop or two only. Switching mid-run is safe.
6. **Numbers on screen:** with patch 0003 the cards are the same every run, so the copy can quote them once the units are fact-checked. Card 1 is `0014128681` / `0005693229`; landing (card 34) is `0390417741` / `-002951425`.
7. **FR-19:** the per-part INITs, fast-forward and skip cannot be done with the unmodified file. The R4 fallback (unthrottled with a condensed caption) is what's available. A PRD change to FR-19 is needed (Nick).

## Method

All runs drove `build/darwin-arm64/eniac-core` directly with a timestamping stub display child (`-v`) in a scratch directory, using `trajdemo.e` from `build/upstream/programs` with the last three lines withheld unless noted. Commands were timed on stdin. The scripts were throwaway and are not committed. The two committed tests reproduce the parts that matter: `TestRealCoreTrajdemoDeterministic` and `TestRealCoreSieveCanaryFull`.
