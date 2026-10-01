# Spike S3 (U1): sieve.e function-table regression

**Issue:** #32 | **Date:** 2026-09-30 | **Author:** software-developer agent (M1 bridge) | **Time used:** about 1 hour of the 1.5-day box
**Feeds:** #34 (report to Stuart), #36 (second patch or wait)

> **Status, 2026-10-01:** Nick took option (B) in #36. The patch is now `patches/0002-ft-repeat-default.patch` and is in `patches/series`. On the patched core `sieve.e` punches exactly **407 cards, the primes 3 to 2801**, in about 4 minutes (600 ms per card; the punch paces it). `sieve-canary` passes (quick variant in `make test`, the full run in `make test-realcore`). The bug-report draft at the end now covers every patch we carry (0001–0003). The text below is otherwise the spike as written on 2026-09-30.

## Summary

The regression is found and small. Commit `f611c7f` ("Rework function table code to more directly match circuitry as shown in the block diagram PX-7-304") changed how a function-table program's **repeat switch** is stored and compared. After the change, `ftreset()` gives the repeat switches a default of 1, but **nothing sets that default when the simulator starts**. A program that never sets its `fN.rpM` switch therefore keeps the Go zero value 0. No ring stage matches 0, so the ring counter climbs without bound and the program never finishes. `sieve.e` and `lehmer.e` set no FT repeat switches. `trajdemo.e` and the other programs that use the function tables set them explicitly, which is why they still run.

A 6-line patch to `src/ft.go` (default the repeat switches to 1 at startup, which is exactly what `ftreset()` already does) fixes `sieve.e`. It was proposed here and is now applied as `patches/0002-ft-repeat-default.patch` (decision #36).

**Recommendation for #36: option (B)**. Take the second local patch now and send it upstream with #34. Drop it when the pin is bumped past an upstream fix. Details at the end.

## Reproduction

`docs/upstream/sieve-repro.sh [SECONDS] [REV...]` builds each revision from the bare mirror cache and runs `programs/sieve.e` for SECONDS after one INIT (stub display child, punch file via `f p`). It reports the cards punched and the largest FT ring value seen in the status stream. It also runs the 3-line `docs/upstream/ft-repeat-default.e` and prints FT1's ring one second after INIT (-3 means the program finished and the ring reset).

Run on the Mac, 2026-09-30, `docs/upstream/sieve-repro.sh 20`:

| Revision | Cards in 20 s | Largest `ftr` | Minimal program: FT1 ring 1 s after INIT |
|---|---|---|---|
| `c4b94f2` (the pin) | **0** | 52344 (runaway) | 3527 (runaway) |
| `f611c7f` (the rework) | **0** | 53761 (runaway) | 3491 (runaway) |
| `f611c7f~1` (before it) | **34** | n/a (older ring encoding) | 0 (idle in the old encoding) |
| `c4b94f2` + proposed patch | **34** | 1 | **-3** (finished) |

This matches architecture U1: 0 cards at the pin and at `f611c7f`, and about 35 in 20 s just before it. I counted 34; the count depends on timing.

### Smallest failing program

`docs/upstream/ft-repeat-default.e` (our own file, not upstream):

```
# FT1 program 1, started by INIT, repeat switch left at its default
p i.io 1-1
p 1-1 f1.1i
s f1.op1 A0
```

At the pin, `b i` then `d f1` shows the ring (third field) at `3453`, then `6933` a second later, and the program-1 flip-flop stays set:

```
10000000000 02 3453 1 0 1
10000000000 02 6933 1 0 1
```

Adding one line, `s f1.rp1 1`, makes the same program finish (`00000000000 00 -3 0 0 0`). That is the whole bug in one line.

## Root cause (code at `c4b94f2`)

Before `f611c7f`:

```go
ftable[unit].rptsw[sw-1] = val - 1          // ftctl: "s fN.rpM val"
...
default: // Stages 1-9                       // ring 4.. = stages 1..
    if f.rptsw[prog] == f.ring-4 {           // zero value 0 == "repeat once"
```

After `f611c7f` (and at the pin):

```go
ftable[unit].rptsw[sw-1] = val              // ft.go:152
...
f.rptsw[i] = 1                              // ft.go:69, in ftreset() only
...
default: // Stages 1-9                       // ring 1..9 = stages 1..9
    if f.rptsw[prog] == f.ring {             // ft.go:546: zero value 0 never matches
```

The storage changed from "value minus 1" to "value", so the zero value's meaning changed from "repeat once" to "no stage". `ftreset()` was updated to set 1, but it only runs on `R` or `r f.N`. `ftunit()` sets `f.ring = -3` at startup but not `rptsw`. A program with no `rp` switch now loops forever in stages 1, 2, 3 and so on. The ring value keeps growing, the program flip-flop stays set, the program's output pulse never fires, and nothing downstream (the printer, in `sieve.e`) ever runs.

## The patch (now `patches/0002-ft-repeat-default.patch`)

Against `c4b94f2`, applies cleanly with `git apply`:

```diff
@@ -489,6 +489,12 @@ func ftunit(unit int, cyctrunk chan pulse) {
 	f := &ftable[unit]
 	f.ring = -3
+	// Repeat switches default to 1, as ftreset() sets them. Without this a
+	// program whose rp switch is never set (sieve.e, lehmer.e) has
+	// rptsw == 0, which no stage (1-9) matches, so the ring never resets.
+	for i := range f.rptsw {
+		f.rptsw[i] = 1
+	}
```

It runs in each `ftunit` goroutine at startup, long before the 1 s argv load that sets switches, so any explicit `rp` value still overrides it. The bridge always loads the preset through argv (U2). If Stuart prefers it race-free for stdin loads too, the same loop in a package `init()` works just as well.

## Verification of the patch

| Program | Check | Result |
|---|---|---|
| `sieve.e` | Cards punched and content vs `f611c7f~1`, 60 s runs | 100 cards each; **the first 100 cards are byte-identical** (3, 5, 7, ...). 34 cards in 20 s, the same as `f611c7f~1`. Ring stays in range (largest 1). |
| `lehmer.e` | Ring runaway, 15 s | Pin: ring reaches 21549. Patched: stays at -3 or above. Neither version (nor `f611c7f~1`) punches a card in 15 s, so this is only a "no runaway" check. **Rechecked 2026-10-01:** patched, `lehmer.e` goes idle about 1.5 s after INIT with the same accumulator dump as `f611c7f~1`, and punches nothing at any revision (the unpatched pin runs away, ring 16063 after 15 s). It also prints `Invalid accumulator switch: s a18 rp5 2` on load (a malformed line in the file). It is not a usable mission program. |
| `sq.e` | Known answer | 3 INITs give 3 / 9 on the patched core. It doesn't use the function tables. |
| `trajdemo.e` | Unaffected by construction | It sets `s f2.rp1 1` and `s f2.rp2 1` for both FT programs it uses, which override the default. The first 7 cards match the pin. See the side finding below for later cards. |
| `ft-repeat-default.e` | Minimal program | Finishes (ring back to -3). |

Other upstream programs that use the function tables (`ag-ch7.e`, `ag-ch8.e`, `cubiesf.e`, `demo46*.e`, `fttest*.e`, `hellorld.e`, `turing.e`) set their `rp` switches, so the patch can't change them unless they leave some FT program's switch unset. Not checked one by one; the bump-time golden and selftest runs would catch it.

### Side finding: trajdemo output is not deterministic run to run

With the **unpatched** pin, two 45 s `trajdemo.e` runs produced different cards from card 8 on (the last field differs in its low digits, for example `0034194823` against `0034194810`). A third run matched the first. The first 7 cards were stable in every run. These runs were made with three or four cores running at once, so CPU contention may be a factor. Candidates are upstream's unsynchronized reads (architecture A7) or card-reader timing (READ is paced at 375 ms). This matters for the Trajectory mission (M2) and for any golden that records trajdemo beyond its first part. Our `traj-*` goldens stop at 7 cards and compare each run with its own punch file, so they're unaffected. **Suggest adding it to spike #31 (S2, trajdemo).**

## Recommendation for #36

The #36 options, in the light of this spike:

- **(B) Accept a second local patch: recommended.** The fix is 6 lines and targeted: it restores the pre-rework meaning of an unset repeat switch, using the default the author already chose in `ftreset()`. It is verified against `sieve.e` (byte-identical cards to before the regression), `sq.e` and trajdemo's construction. It fits the existing `upstream.lock` + `patches/series` machinery (`git apply --check`, no fuzz). Cost: amend NFR-12 and the PRD to allow `0002-ft-repeat-default.patch`, then move the file from `docs/upstream/` to `patches/` and add it to `series`. Send it to Stuart with #34, and drop it when the pin moves past an upstream fix.
- (A) Wait for upstream: the Primes mission slips by an unknown amount. It's reasonable only if Stuart replies quickly.
- (C) Pin to `f611c7f~1` plus the mult patch: not needed now. It would lose 13 upstream commits (visualizers, Go 1.25/1.26 updates and the function-table rework itself) to fix a one-line default.
- (D) Cut Primes: not needed.
- (E) Considered and rejected: have the Primes mission add `s fN.rpM 1` lines to the preset. The core would then run a configuration that is not the unmodified `sieve.e`, which breaks the mission-file principle (5.9.1) and the FR-14 invariant.

A sieve canary (test plan 3.2, `sieve-canary`) becomes a required pass as soon as the patch is in `series`: `docs/upstream/sieve-repro.sh` already shows the pass condition (cards > 0 within 20 s, ring in range).

## Draft bug report for #34 (to Brian Stuart): every patch we carry

Updated 2026-10-01 to cover patches 0001, 0002 and 0003, the three local patches we now carry under decision #36. Nothing has been sent. Nick sends it, and #34 also owns the permission question. Attach the three files in `patches/`.

> **Subject: Three small fixes for the simulator (mult status format, function-table repeat default, an accumulator race), plus two questions**
>
> Hi Brian, thank you for the simulator. We are building a museum touch kiosk around it (credited on screen). We found three small problems at `c4b94f2`, which are still present at `7c043c5`, and are carrying a local patch for each until you have looked at them. The three patches are attached; each is a few lines.
>
> **1. `multstat()` pads the stage with `%2d`** (`src/mult.go:66`), so a stage below 10 is sent as `m  0 ...` with two spaces. `vis/eniactk.go` splits status messages on single spaces and panics (`index out of range [1] with length 1` at `eniactk.go:785`) the first time the multiplier runs. `Sprintf("%d ", stage)` fixes it. (Our patch 0001.)
>
> **2. Function-table programs with no repeat switch never finish since `f611c7f`** (`sieve.e`, `lehmer.e`). `sieve.e` punches no cards at `c4b94f2` or `f611c7f`, but punches normally at `f611c7f~1`. After INIT the function table's ring counter climbs without limit (`d f1` shows it in the thousands). The rework changed `rptsw` from "value minus 1, compared with ring-4" to "value, compared with the stage". `ftreset()` now sets `rptsw` to 1, but nothing sets it at startup, so a program that never sets `fN.rpM` keeps 0, which no stage 1-9 matches. A three-line program shows it:
>
> ```
> p i.io 1-1
> p 1-1 f1.1i
> s f1.op1 A0
> ```
>
> After `b i`, `d f1` shows the ring growing; with `s f1.rp1 1` added, the program finishes. Initializing `rptsw` to 1 in `ftunit()` (next to `f.ring = -3`), or in an `init()`, fixes it for us: `sieve.e` then punches the 407 primes from 3 to 2801, and its first 100 cards are identical to `f611c7f~1`. (Our patch 0002.)
>
> **3. A race in the accumulator's 1PP handling makes `trajdemo.e` output differ from run to run.** `fanout()` sends each clock pulse to all units at once. At 1PP time, an accumulator whose receive program has the correct switch set (`cc C`) adds 1 to its units digit in `doonepp()` (the `accunit` goroutine). If a subtracting accumulator sends its 1' pulse to it in the same pulse, that arrives through `accunit2()` → `accrecv()`, which increments the same digit in another goroutine. Both are unsynchronized `u.val[0]++`, so now and then one increment is lost. In `trajdemo.e` the last field of the cards (the "up" number) then comes out a few units low from some card on, for example `0034194815` instead of `0034194823`. The Go race detector (`go build -race`, `trajdemo.e` for 40 s) reports `accrecv` (`accumulator.go:388`) against `doonepp` (`accumulator.go:561`). How often it happens depends on machine load: we saw it in about 1 run in 3 while the Mac was busy, and rarely otherwise. A per-accumulator `sync.Mutex` held by `accrecv()` and by the correction in `doonepp()` makes the output identical run to run for us. (Our patch 0003.) The race detector reports other unsynchronized accesses too (status reads, plugging during a load, the multiplier's `Multl`/`Multr` read by `st1()`), but we haven't seen any of them change a result.
>
> **Two smaller observations, no patch:**
>
> - While a `.e` file is loading, the Master Programmer's B, C and H steppers sometimes advance one stage (about half of our runs of `trajdemo.e`; status shows `mps 1 1`, `mps 2 1`, `mps 7 1` before any button). Without a CLEAR first, `trajdemo.e` then punches an extra all-zero first card. Its own `b c` takes care of it, so this is only a note.
> - `lehmer.e` contains `s a18 rp5 2` (missing the dot), which the loader rejects with "Invalid accumulator switch".
>
> **Two questions:**
>
> 1. `trajdemo.e`'s header says INIT starts each part through the A stepper. The file also plugs `p i.Io 3-10` after `p i.Io 1-1`, and `p p.A1o 1-4` (with `#p p.A1o 1-6` commented out), so INIT goes straight to the trajectory. Is the file meant to be run that way now, and is there a version that runs the earlier parts (the 5,000 additions, the multiplier, squares and cubes, sines and cosines) one per INIT?
> 2. We'd like to carry these fixes as local patches until they're upstream, and we'd welcome your view on whether we may publish the kiosk (the repository has no license file).

## Files

- `docs/upstream/sieve-repro.sh`: reproduction across revisions (about 100 s for `20`)
- `docs/upstream/ft-repeat-default.e`: the smallest failing program
- `patches/0002-ft-repeat-default.patch`: the patch (moved here from `docs/upstream/proposed-0002-ft-repeat-default.patch` on 2026-10-01)
