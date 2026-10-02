# Spike S5: live attract engine soak (NFR-05, R9)

**Date:** 2026-10-02 | **Author:** software-developer agent (attract engine) | **Feeds:** PRD FR-34 to FR-36, FR-51, NFR-05, R9; architecture 5.10

**Setup:** the bridge's session manager, hub and websocket server in one process (`TestAttractSoak`, `src/bridge/internal/session/attract_realcore_test.go`) against the **real core** (upstream `c4b94f2` plus `patches/0001`–`0003`, macOS arm64, `GOMAXPROCS=2`, nice 5), with the shipped attract settings (`trajectory`, 8 s hold, 20 s card stall, 15 s read timeout). A lean websocket client (no message history) drives it. Every 5 landed flights it hands off (`attract_stop` at a rotating phase: flying, landed, reading), runs one Squares visitor session (skip setup, INIT at Full, `end_session idle`) and asks for attract again, so the run cycles attract and missions. Every minute it samples the Go heap, goroutines, processes of the session (`pgrep` on the run dir), the core's RSS and the bridge's RSS; open files were sampled with `lsof` from outside. Raw output: `ENIAC_SOAK_OUT` JSON (not committed).

**This is not the 7-day NFR-05 soak** and not on the target hardware. It is 35 minutes on the dev Mac, and the Mac was **heavily loaded by other work** for the first half (two qemu x86 VMs and Playwright runs from parallel agents: 1-minute load average 12 to 52 until 09:22, then 5 to 7). Flight times below are inflated by that load; memory, goroutine, process and file counts are not.

## Summary

1. **35 min, 18 flights, 0 faults.** Every flight punched exactly 34 cards and landed on hop 34 (`up` = -2951425, `along` = 390417741, the S2 reference flight). The loop never stalled, faulted or recovered.
2. **No growth.** Go heap in use 3.6–4.0 MB from minute 2 to the end, with no trend; `Sys` flat at 19.0 MB from minute 6; goroutines 20 during a flight (22 at transitions) and back to the idle baseline of 10 after the final stop; 16 open files throughout (18 once); each core 9.3–10.7 MB RSS. Bridge-process RSS 18.9–21.8 MB with no monotonic trend (it wandered about 1 MB higher in the second half while heap and `Sys` stayed flat: allocator noise in 35 min, but the **overnight soak R9 asks for is still needed** to rule out slow growth).
3. **One core at a time.** The 250 ms process monitor never saw more than 2 processes (one core + its vlink relay). One of the 36 one-minute samples saw 3, during a hand-off/Squares cycle, and another saw 1 process with no core (minute 9, between flights): most likely the previous core's vlink relay still exiting after the core itself was gone, once while the next core started. (Inferred; not caught in the act.) `Core.Close` now also waits (at most 500 ms) until the core's whole process group is gone; the hand-off and loop tests pass with it. This fix came after the soak and was not re-soaked.
4. **Hand-off: 101–103 ms** from `attract_stop` to the `attract {phase:"off"}` reply, with no process left (3 in the soak, flying / landed / reading; 101–102 ms mid-flight in the two real-core test runs). Almost all of it is the core exiting after `q` (inferred: the fake core, which exits on `q` at once, hands off in 1–8 ms mid-flight and 60–90 ms while a core is booting). The kiosk shows the picker on the touch itself and does not wait for the reply, so a visitor never sees it.
5. **Loop time.** Quiet Mac (the first real-core test run): flights of **48.3 s and 49.6 s**, loop 51.7 s with a 2 s hold, so **about 58 s with the 8 s hold**, in line with FR-34's "about 60 s". Under the load above: flights 55–130 s (median 102 s), loops 65–139 s (median 110 s); the first, least loaded loop was 64.6 s. A later test run at load 6 gave 84 s flights. The core is CPU-bound and sensitive to other work on the box (S2 saw the same: 75–90 s with 4–8 cores busy). **Measure on the OptiPlex** before quoting a loop time to the museum.
6. **Recycle gap** (landing hold over → next flight reading): about 1.4 s on the quiet first loop (loop 64.6 s − flight 55.2 s − hold 8 s), inside the 5 s FR-36 allowance.

## Samples

| Minute | Flights | Hand-offs | Heap in use | Go `Sys` | Bridge RSS | Goroutines | Processes | Core RSS |
|---|---|---|---|---|---|---|---|---|
| 0 (before) | 0 | 0 | 3.2 MB | 14.5 MB | 20.6 MB | 10 | 0 | – |
| 1 | 1 | 0 | 3.5 MB | 14.8 MB | 21.3 MB | 20 | 2 | 9.8 MB |
| 5 | 3 | 0 | 3.7 MB | 18.8 MB | 19.4 MB | 20 | 2 | 9.7 MB |
| 10 | 5 | 1 | 4.0 MB | 19.0 MB | 19.0 MB | 22 | 2 | 9.8 MB |
| 15 | 7 | 1 | 3.9 MB | 19.0 MB | 18.9 MB | 20 | 2 | 9.6 MB |
| 20 | 10 | 2 | 3.8 MB | 19.0 MB | 20.2 MB | 20 | 2 | 9.6 MB |
| 25 | 13 | 2 | 3.8 MB | 19.0 MB | 20.3 MB | 20 | 2 | 10.5 MB |
| 30 | 16 | 3 | 3.9 MB | 19.0 MB | 20.1 MB | 20 | 2 | 9.9 MB |
| 34 | 18 | 3 | 4.0 MB | 19.0 MB | 20.7 MB | 22 | 2 | 10.7 MB |
| 35 (attract stopped) | 18 | 3 | 3.7 MB | 19.0 MB | 21.4 MB | 10 | 0 | – |

(MB = 1024 KB, from the sampled KB.) Bridge CPU (`ps %cpu`) stayed at 1–4% of one core; the core itself uses about 1.3 cores while flying at Full (`cy.rate 0` is unthrottled by design).

Flight times (INIT to the landing card, seconds): 55.2, 100.8, 104.5, 114.2, 118.9, 128.9, 130.0, 128.9, 107.5, 78.9, 98.4, 89.9, 100.4, 76.0, 81.4, 114.9, 95.8, 102.6. Loop times (one `reading` to the next, without a hand-off between): 64.6, 110.2, 113.9, 123.6, 128.8, 138.3, 139.4, 138.2, 116.9, 107.8, 99.3, 109.8, 85.3, 90.8, 124.3, 105.2, 112.0.

## What else was tested (fake core, `make test`)

`src/bridge/internal/session/attract_test.go`, with the fake core's `traj` mode (6 cards, the last below ground; keeps flying until `s cy.op 1a`, like `trajdemo.e`):

- the loop: starting → reading → flying → landed (landing values) → recycling, three flights on three sessions and cores; exactly `b c`, `b r`, `b i`, `s cy.op 1a` per flight; never more than one core; attract flights are not visitor sessions in the metrics;
- hand-off in every phase (starting, reading, flying, landed, recycling): reply only after the processes are gone; nothing of the attract session (`punch`, `frame`, `run`, `checkpoint`) after its `session none`; never a fault; then a visitor mission starts;
- `start_mission` and `end_session` stop attract; `attract_start` ends a visitor session; `start_mission` with mode `attract` is refused; `attract_start` is idempotent;
- a core crash mid-flight, a stalled flight (no card while busy) and a READ that never loads the card: health down, phase `error`, recovery, then attract resumes by itself and lands (FR-51); a stop while recovering keeps it stopped;
- orphan: no kiosk page for `OrphanAfter` stops attract;
- no leaks after 9 flights and 3 hand-offs: no processes, no session directories, goroutines back to the baseline.

Real core (`make test-realcore`): `TestAttractRealCoreTwoFlights` (two flights, 34 cards each, hop 1 = the S2 card, landing on hop 34, then a mid-flight hand-off with no process left).

## How to run it again

```
cd src/bridge
ENIAC_ATTRACT_SOAK=8h ENIAC_SOAK_OUT=/tmp/attract-soak.json \
  go test -tags realcore -run TestAttractSoak -timeout 9h -v ./internal/session/
```

It fails if more than two processes were ever seen, if any flight did not land on hop 34 with 34 cards, if a hand-off left a process, or if processes are left at the end.

## Recommendations

- Run the soak **overnight on the OptiPlex 9020M** (Ubuntu 24.04, the install target) before the museum install (R9), and note its flight time there.
- If the target's flights are much longer than 60 s, the loop is simply longer; nothing in the engine depends on the flight time except the 5 min `attract.flightMax` cap and the 20 s card stall, both configurable under `attract:` in the config.
- The 7-day NFR-05 soak still stands (M3).
