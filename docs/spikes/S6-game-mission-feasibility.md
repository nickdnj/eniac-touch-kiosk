# Spike S6: can a visitor play a game against ENIAC (Mission 4)?

**Issue:** none yet | **Date:** 2026-10-23 | **Author:** software-architecture agent | **Branch:** `mission-4-game-design`
**Core:** `build/darwin-arm64/eniac-core` (upstream `c4b94f2` plus `patches/0001`-`0003`), macOS arm64, cwd `build/upstream`. The Pi 5 and the x86 box were not measured.
**Feeds:** the PRD and UX specialists (Mission 4 requirements and screens), `docs/mission-4-history-research.md` (the history copy), a decision by Nick on the game and on the local-program policy.

Tags: **[V]** verified by running it on the real core (commands and output below), **[R]** read in the code or docs (file named), **[I]** my inference, not tested.

## 0. Summary

**Build "Race to 20" (a one-pile subtraction game, the Nim family) as Mission 4, as an exhibit-team `.e` that runs unmodified on Stuart's core.** It works on the real core: 62 lines (24 cables, 24 switches), 3 accumulators, the constant transmitter and one subtraction; one INIT is one round; the visitor's move is the constant-transmitter digit `c.j1`, changed between INITs; ENIAC answers 4 minus the move and always lands on 20 in five rounds. A full game passed `mission check` and the headless `selftest` at both speeds from a draft mission file. The "pile of 20" Nim variant also works (106 lines, adds the Master Programmer to rack up the pile on the first INIT); it is the alternative if Nick wants a pile that counts down, at about 2 more points and one more unit to explain. Hi-Lo works mechanically (the sign lamp gives "too high/too low") but its secret goes stale with a fresh core per session unless the bridge picks it, so it ranks third. No core change is needed for any of them. The platform work is a **play phase**: a whitelisted `play_switch` action limited to the mission's declared dial and `choices`, refused while the machine is busy; per-game checkpoints evaluated on **settled** values; a 4-card picker and a finale that does not wait for the game. Rough size: **about 45 points**, plus content and fact-check. Three things in the read-only notes need correcting: the bridge must refuse a dial change while a turn is running (the program reads the dial mid-run); checkpoints cannot be evaluated on live frames for a game (the lamps pass through 0 and flip sign mid-turn); and adding a fourth mission silently changes the finale and "Next" flow of the existing three.

## 1. What ran

All runs: the patched core, cwd `build/upstream`, stdin commands, killed after 15 s (`timeout 15`) if they hung. None hung. Scratch files were in the session scratchpad (`.../scratchpad/s6/`); the final programs and helpers are in `docs/spikes/s6/`.

| # | What | How | Result | Tag |
|---|---|---|---|---|
| 1 | Baseline: `sq.e`, 2 INITs | `docs/spikes/s6/drive.sh` (pipes commands with sleeps into the core, 15 s timeout) | `1/1`, then `2/4` | [V] |
| 2 | **Dial change between INITs** (note 2) | `l sq.e`, `b i`, `s c.j1 3`, `b i`, `s c.j1 0`, `b i`, `d a1`/`d a2` after each | `1/1` → `4/6` → `4/14`. Second INIT added 3 (a1 1→4; a2 1+2·1+3 = 6), third added 0 (a2 6+2·4+0 = 14). **The new dial value was used.** | [V] |
| 3 | Race to 20, a whole game | `race20.e`, moves 1, 3, 2, 2, 1 | table in 2.1 | [V] |
| 4 | Race, out-of-range moves | moves 0, 5, 9, 4 | table in 2.3 | [V] |
| 5 | Race, dial changed **during** a turn | rate 25, `s c.j1 1`, `b i`, 0.5 s later `s c.j1 3` | a1 = 3: the program read the new value | [V] |
| 6 | Race, CLEAR as "new game" | after a round, `b c`, `b i` | a3 back to 0, then 4; `c.j1` kept its value | [V] |
| 7 | Race, 30 games with argv load (as the bridge loads a preset), `GOMAXPROCS=2` | `eniac-core race20.e`, moves 1,3,2,2,1 | 30/30 ended at a3 = 20 | [V] |
| 8 | Nim pile of 20, a whole game plus re-rack | `nim20.e`, rack, moves 1,3,2,2,1, rack | table in 2.2 | [V] |
| 9 | Nim, out-of-range and CLEAR | moves 0, 5, 9; `b c`; `b i` | 2.3; CLEAR resets the MP stepper, next INIT re-racks 20 | [V] |
| 10 | Nim, MP stepper state after load | 40 argv loads of the first draft (stepper count `cA` set **before** the decade limits) | **4 of 40 loads came up with stepper A already on stage 2**: the first INIT played a round on an empty pile (a3 = M 9999999996 = -4) | [V] |
| 11 | Same, after reordering (decade limits first, then `cA`) | 60 argv loads | 60/60 correct (stage 1, rack to 20) | [V] |
| 12 | Hi-Lo | `hilo.e`, secret 37, guesses 50, 25, 40, 35, 38, 37, 99, 00 | table in 3 | [V] |
| 13 | Status stream and dump | `eniac-bridge record --program <abs .e> --inits N --rate 0 --settle 500ms` for `hilo.e`, `race20.e`, `nim20.e`; rate 25 for `hilo.e` | sign line `ad 0 0 3` present; dumps match the stdin runs; `settled=true` | [V] |
| 14 | Turn timing | `docs/spikes/s6/timer.py` as the core's `-v` child: timestamps every status line, sends the moves | table in 2.4 | [V] |
| 15 | Mission loader on a local program | draft `race20.yaml`/`nim20.yaml`, scratch runtime dir holding `programs/race20.e`, `go run ./cmd/eniac-bridge mission check --upstream <scratch>` | `ok race20: 4 steps; preset 22 cables, 22 switches`; `ok nim20: 4 steps; preset 36 cables, 42 switches` | [V] |
| 16 | Headless selftest (rule 8) | `go run ./cmd/eniac-bridge selftest --config <scratch config> --mission race20 [--speed full]` | `ok race20: core ready in 1.035s, after 5 INITs map[1:1 2:3 3:20]` at slow (39.8 s wall) and full (2.1 s); `ok nim20 ... after 6 INITs map[1:1 2:3 3:0]` | [V] |

Exact commands, for example run 2 (`drive.sh` file format: one core command per line, or `sleep N`):

```
l sq.e
b i
sleep 0.3
d a1
d a2
s c.j1 3
b i
...
```
```
> > > P 0000000001 0000000000 0 000000000000
> P 0000000001 0000000000 0 000000000000
> > > P 0000000004 0000000000 0 000000000000
> P 0000000006 0000000000 0 000000000000
> > > P 0000000004 0000000000 0 000000000000
> P 0000000014 0000000000 0 000000000000
```

**Harness notes.** (a) `timer.py` must wait about 0.3 s after writing `ready` before its first command: commands written immediately after `ready` were silently lost (the core's ready-scanner hand-off). This only affects a `-v` child that sends commands; the bridge's vlink never does (architecture 3.4), so it is not a kiosk issue. [V] (b) `selftest` needs a short `paths.run` (the vlink socket path limit, 104 bytes on macOS); the scratch config therefore used the repo's `build/run`, as `record` does. [V]

## 2. Nim results

### 2.1 Variant (b) Race to 20: `docs/spikes/s6/race20.e` (recommended)

Accumulator 1 = your move, Accumulator 2 = ENIAC's move, Accumulator 3 = the running total. Data trunks: 1 = constant transmitter out, 2 = Acc 1 `S`, 3 = Acc 2 `A`. One INIT runs five program steps:

| Program line | What happens | Units |
|---|---|---|
| `1-1` (INIT) | Clear Acc 1 and Acc 2 (operation `0` with clear switch `C`) | a1 p5, a2 p5 |
| `1-2` | Constant transmitter sends J (your move) on trunk 1: Acc 1 receives it, **Acc 3 adds it to the total** | c 25, a1 p6, a3 p5 |
| `1-3` | Constant transmitter sends K = 4 into Acc 2 | c 26, a2 p6 |
| `1-4` | Acc 1 sends on `S` (subtract) into Acc 2: **Acc 2 = 4 - your move** | a1 p7, a2 p7 |
| `1-5` | Acc 2 sends on `A` into Acc 3: **ENIAC's move lands on the total** | a2 p8, a3 p6 |

Per-turn dump (`d a1`, `d a2`, `d a3` after each INIT; run 3) [V]:

| INIT | dial `c.j1` | Acc 1 (you) | Acc 2 (ENIAC) | Acc 3 (total) |
|---|---|---|---|---|
| 1 | 1 | P 0000000001 | P 0000000003 | P 0000000004 |
| 2 | 3 | P 0000000003 | P 0000000001 | P 0000000008 |
| 3 | 2 | P 0000000002 | P 0000000002 | P 0000000012 |
| 4 | 2 | P 0000000002 | P 0000000002 | P 0000000016 |
| 5 | 1 | P 0000000001 | P 0000000003 | P 0000000020 |

`eniac-bridge record` of the same program (moves fixed at 1) gives the same final dump and a clean status stream (143 lines, `settled=true`).

**Wiring cleanliness:** no Master Programmer, no load step, every INIT is identical, a cleared machine is the starting position (as in `sq.e`), CLEAR is "new game". Three accumulators and two constants. The subtract is exactly the `neg-sign.e` pattern (an accumulator's `S` output into another accumulator), and the ten's-complement correction comes from the sending accumulator's 1PP (`doonepp`, `src/accumulator.go`) [R], so no `cc` correction switch is needed.

### 2.2 Variant (a) Nim, pile of 20: `docs/spikes/s6/nim20.e`

Acc 1 = your take, Acc 2 = ENIAC's take, Acc 3 = the pile. Trunks: 1 = constant out, 2 = Acc 1 `S` (to Acc 2 **and** Acc 3, so one step subtracts your take from both), 3 = Acc 2 `A`, 4 = Acc 2 `S`.

**Loading 20 once.** INIT goes to Master Programmer stepper A (`p 1-1 p.Ai`), with `s p.d20s1 1`, `s p.d20s2 5`, `s p.cA 2`: stage 1 lasts one pulse (rack up), stage 2 lasts five pulses (five rounds), then it wraps back to stage 1, so the sixth INIT after a finished game racks up a new pile by itself. The 20 itself is made without a third constant: K = 4 goes into Acc 2, then Acc 2 sends `A` **five times** (repeat switch 5, clear switch `C` so it is empty afterwards) into Acc 3. A constant K = 20 would need a second K value, and J and K have only one low half each (`getval`, `src/constant.go`: `Jr`/`Kr` are digits 1-5, `Jl`/`Kl` are digits 6-10 in place) [R].

Round (lines `1-2`..`1-6`): clear Acc 1 and 2; J into Acc 1; K = 4 into Acc 2; Acc 1 `S` into Acc 2 and Acc 3 at once; Acc 2 `S` into Acc 3.

Per-turn dump (run 8, `d p` is the Master Programmer: steppers, then decades) [V]:

| INIT | dial | Acc 1 | Acc 2 | Acc 3 (pile) | `d p` (stepper A stage, decade 20) |
|---|---|---|---|---|---|
| 1 (rack) | - | 0 | 0 | 20 | stage 1, 0 |
| 2 | 1 | 1 | 3 | 16 | stage 1, 1 |
| 3 | 3 | 3 | 1 | 12 | stage 1, 2 |
| 4 | 2 | 2 | 2 | 8 | stage 1, 3 |
| 5 | 2 | 2 | 2 | 4 | stage 1, 4 |
| 6 | 1 | 1 | 3 | **0** | stage 0, 0 (wrapped) |
| 7 | - | 0 | 0 | 20 (new pile) | stage 1, 0 |

**A real hazard found and fixed (runs 10, 11):** with `s p.cA 2` written before the decade limits, the stepper can advance by itself while the file loads, because for a moment its stage count is 2 and its decade limit is 0 (`cycgate`, `src/mp.go`, compares the decade with the limit on every CPP) [R]. 4 of 40 argv loads started a game on stage 2 and the first INIT subtracted from an empty pile [V]. Writing the limits first and `cA` last gave 60 of 60 clean loads [V]. This is the same family as spike S2 section 4 (steppers B, C, H of `trajdemo.e` advancing on load). Even so, the mission should send CLEAR (`b c`, which resets the Master Programmer, run 9) before the first INIT, as Trajectory does. Race to 20 has no stepper and no such hazard.

**Which is cleaner:** Race to 20. Nim adds a fourth trunk, the Master Programmer, a first INIT that does something different from the rest (the UI must explain "press INIT to set up the pile"), and the load-order hazard. Nim's pile counting down to 0 is a nicer picture and the classic "take the last one" story; that is the case for it.

### 2.3 Out-of-range moves

| Dial | Race to 20 (from a cleared machine) | Nim (pile 20) |
|---|---|---|
| 0 | a1 0, a2 4, a3 4 | pile 20 → 16 |
| 5 | a1 5, a2 **M 9999999999** (-1), a3 8 | pile 16 → 12 |
| 9 | a1 9, a2 **M 9999999995** (-5), a3 12 | pile 12 → 8 |
| 4 | a1 4, a2 0, a3 16 | (not run) |

[V] The wiring **tolerates** every digit 0-9: no hang, no error, and the total still moves by exactly 4 a round (ten's-complement arithmetic). But the **game breaks**: on 0 ENIAC takes 4, and on 5-9 ENIAC's move is negative (it "gives back" counters). So the bridge must refuse them, and the existing mechanism fits: the play control's `choices: ["1","2","3"]`, checked server side (catalog rule 5). Only `c.j1` is a play control, so multi-digit moves cannot happen.

### 2.4 Timing

`timer.py` timestamps each status line; "busy" is the last accumulator, program or MP line after `b i`, so it is accurate to one 30 ms status sample. The bridge declares `idle` a further `quiet = max(120 ms, 3 × 20000/rate ms)` later (architecture 5.6) [R].

| Program | `cy.rate` | first change after `b i` | busy (last change) | + quiet | ≈ turn as the visitor sees it |
|---|---|---|---|---|---|
| race20 | 0 | 2-21 ms | 11-33 ms (within one sample) | 120 ms | **about 0.15 s** |
| race20 | 100 | 260-465 ms | 1.29-1.50 s | 0.6 s | about 2 s |
| race20 | 25 | 1.2-1.6 s | 5.1-5.6 s | 2.4 s | **about 8 s** |
| race20 | 13 (Squares "slow") | 1.8-2.8 s | 9.3-10.3 s | 4.6 s | about 14-15 s |
| nim20 round | 0 | 6-30 ms | 6-30 ms | 120 ms | about 0.15 s |
| nim20 rack | 25 | 1.1 s | 7.7 s | 2.4 s | about 10 s |
| nim20 round | 25 | 1.1-1.2 s | 5.9-6.0 s | 2.4 s | about 8.5 s |
| nim20 round | 13 | 1.7-2.9 s | 10.8-12.0 s | 4.6 s | about 16 s |

Headless `selftest` for a whole Race game: 39.8 s at rate 25 (5 INITs including the 1 s core start) and 2.1 s at rate 0 [V]. A five-round game at Squares' rate 13 would take over a minute of watching; **use `slow: {rate: 25}`** (or 25 for the first round and Full after, a UX choice) [I]. At slow speed the visitor can see the order "your move lands, ENIAC works out 4 minus it, ENIAC's move lands": the program flip-flops (a1 p6, a2 p7, a3 p6) are natural caption triggers (`accProg`, as Squares uses).

## 3. Hi-Lo results: `docs/spikes/s6/hilo.e`

Secret on K (`c.k2 c.k1` = 37), guess on J (`c.j2 c.j1`). One INIT: clear Acc 1 and 2; K into Acc 1; J into Acc 2; Acc 2 `S` into Acc 1. Acc 1 = secret - guess; Acc 2 = the guess. 48 lines (17 cables, 20 switches).

| Guess | Acc 1 | Meaning |
|---|---|---|
| 50 | M 9999999987 (-13) | too high |
| 25 | P 0000000012 | too low |
| 40 | M 9999999997 | too high |
| 35 | P 0000000002 | too low |
| 38 | M 9999999999 | too high |
| 37 | P 0000000000 | got it |
| 99 | M 9999999938 | too high |
| 00 | P 0000000037 | too low |

- **Subtract works; the sign lamp is readable** [V]: the status stream carries `ad 0 0 3` (Acc 1 sign to M) and the final dump shows `M 9999999987`. MachineState has `Acc.Sign` ('P'/'M') and `Acc.Value()` decodes M as negative (`internal/machine/state.go`), and the checkpoint grammar has `lte` (`checkpoint.go`), so "too high" is `{acc: "1", lte: -1}` [R].
- **But only on settled values** [V]. Recorded at rate 25 (`hilo-r25`), Acc 1 passes through `P 0` (the clear at the start of every turn) and then flips **P/M about twenty times** while the ten's-complement digits arrive pulse by pulse (`P37 → M37 → M1000000037 → ... → P1111111148 → M2222222259 → ...`). A live-frame checkpoint would fire "got it" or "too high" falsely mid-turn. The same applies to any game.
- **How the secret could vary:** every in-machine source restarts with the core, and the kiosk starts a fresh core per session (FR-03) [R], so an accumulator counter or a function-table row picked by a counter gives the same secret sequence to every visitor [I]. The only way to vary it is for the bridge to set `s c.k2 N`, `s c.k1 N` at session start from a declared list (a hidden preset choice, a new schema field), and the K dials would then have to be hidden in the UI. That makes the "secret" the exhibit's, not ENIAC's, and the copy has to say so. Two dials per turn (tens and units) also doubles the picker work.

## 4. Comparison of the four candidates

| | Race to 20 / Nim (one pile) | Hi-Lo | Dice / Monte Carlo | Hit-the-target trajectory |
|---|---|---|---|---|
| Fits "no input mid-run" (dial, INIT, read) | **Yes**, one dial per round [V] | Yes, two dials per guess [V] | Yes in principle | Yes in principle |
| Core changes | **None** [V] | None [V] | None for a plugboard sketch; a 1948-faithful version needs a converter model (S4) | None for a new program [I] |
| Local program size | **62 lines** (Race) / 106 (Nim) [V] | 48 lines [V] | 150-250 lines and unfinished: middle-square digits not recovered, top digits one unit low (S4 2.3) | The biggest: `trajdemo.e` is 297 cables and 443 switches and reads a fixed card (S2); a target version would be a new program of similar size [I] |
| Historical hook | Nimatron 1940, Nimrod 1951, Bouton 1901; **ENIAC never played a game** and the one-pile game is a "subtraction game" (`docs/mission-4-history-research.md`) | Weak (none specific) | Strong (1948 Monte Carlo) but S4: not 1948-true on this core | Strongest (firing tables were ENIAC's purpose), already told by Mission 3 |
| Visitor legibility | High: three numbers, one rule ("every round adds to 4") | High (too high/too low), but the secret is the exhibit's | Low (random digits, statistics) | High (an arc and a target) |
| Can the visitor win? | **No**, ENIAC moving second always wins; needs honest framing ("find ENIAC's trick") | Yes, eventually | n/a | Yes |
| Platform build (section 5) | About 45 points | About 50 (plus secret choice and two-dial picker) | Not estimated; S4 recommends against | Not estimated; several weeks of program work [I] |

## 5. Platform changes for a play phase

What a game needs that missions lack: after setup, a loop **dial → INIT → settle → read → repeat**, then an end. Today the bridge has no way to send a switch after setup: `apply_step` is accepted only in `setup` and only for unapplied steps; `button` sends `b i`/`b c`/`b r`; `set_speed` sends only `s cy.rate`/`s cy.op` (`internal/session/session.go`) [R]. Checkpoints fire **once per session** on **live** state every tick (`machine/checkpoint.go` `Evaluate`, `session.go` `tick`) [R].

| # | Item | Change | Size | Forces a change to existing missions? |
|---|---|---|---|---|
| 1 | **Mission schema `play:` block** (`mission/schema.go`, load, validation) | `play: { controls: [{switch: c.j1, choices: ["1","2","3"], label}], turn: {settle: idle, log: ["1","2","3"]}, end: [checkpoint ids], afterEnd: lock, newGame: clear }`. Validation: each control is an `s` line of the program (its file value is the starting value), the switch is in a closed catalog family (constant digits only, at first), `choices` ⊆ catalog, no control is also a plug; `end` ids exist and have `scope: settled` | 5 | No (optional block) |
| 2 | **Whitelist action `play_switch {switch, value}`** (5.6) | Allowed in `armed`/`running`/`result` of a play mission only; switch ∈ `play.controls`, value ∈ its `choices`; **refused with `BUSY` unless the run is idle** (run 5: a dial changed mid-turn is read by the running program); refused after the game end until CLEAR. The bridge composes `s <switch> <value>` through `core.StepLine` (no free text, FR-02) | 3 | No |
| 3 | **Session state machine** (5.5) | Keep `running`/`result`; add a per-game turn counter and `gameOver`. `result` for a play mission locks INIT and `play_switch` (`afterEnd: lock`) until CLEAR; CLEAR (`b c`, verified to reset the accumulators and the MP, runs 6 and 9) starts a new game: turn counter 0, per-game checkpoints re-armed, state back to `armed` | 3 | No (`result` stays a milestone for non-play missions) |
| 4 | **Checkpoints on settled values** | New `scope: settled` on a checkpoint: evaluated once on each `idle` against `run.settled`, not on frames (section 3: transients). Per-game re-arm on CLEAR. Default `scope: live` keeps today's behaviour | 3 | No |
| 5 | Compiled mission, protocol and TS types | `play` in the compiled mission (5.9.3); a `turn` server event `{n, settled, controls}` (or extend `run idle` with `turn`); regenerate `mission.gen.ts`/protocol types | 2 | No |
| 6 | **UI run view** | Dial picker reused from the switch step (choices 1-3, shows the J dial turning), scoreboard from `watch` (you / ENIAC / total or pile), per-turn captions with `accProg` triggers and `{aN}` templates, "ENIAC got 20" end card, **New game** = CLEAR, "Keep pressing for me" disabled (it would play the visitor's moves) | 8 (split: picker and scoreboard 5, captions and end 3) | No |
| 7 | **Picker and finale** | UX 8.4 has a fixed three-card layout (x80-624, x688-1232, x1296-1840) and the code lists every available mission (`screens/start.ts`). The finale gate (`screens/result.ts`: `allDone = !next` over **all** available missions) and the "Next" button would silently include the game, so adding it changes the finale for visitors who did the three missions (FR-45, Q23 "all three"). Add `finale: false` (or `kind: game`) to the mission, a 4-card or "3 + game" layout, and decide whether S7 "Next:" offers the game | 3 | **Yes**: the finale and "Next" behaviour of the existing missions change unless the flag is added |
| 8 | Panel art | Accumulator art exists for Acc 1 and 2 only (`src/web/panels/accumulator-1.svg`, `-2.svg`); the game needs Acc 3. Nim also needs the MP strip (exists). `c.j1`, `c.k1`, `jack:a1.S` exist | 2 | No |
| 9 | Attract | Unchanged: the attract loop flies Trajectory with no input (5.10). A game needs a visitor's moves; a self-playing demo would be a scripted visitor, which is not "ENIAC computing" and adds nothing to attract | 0 | No |
| 10 | Metrics | `play_switch` and two bridge events, `game_turn {m, n, move}` and `game_end {m, turns, winner}`; whitelist the UI `new_game` event | 2 | No |
| 11 | `selftest` (rule 8) | `selftest.play: [{set: {c.j1: "1"}, init: true}, {set: {c.j1: "3"}, init: true}, ...]`, `expect` after each turn and at the end; CI at Full and Slow. Today's `selftest` (5 INITs, fixed dial) already passes for the draft mission | 3 | No |
| 12 | Goldens | `record --moves c.j1=1,3,2,2,1` (sets the switch before each INIT), a `race20-game` golden, and `out-of-range` (moves 0,5,9) to pin the ten's-complement values | 2 | No |
| 13 | e2e / fake core | The fake core must apply `s c.j1 N` and model the game, or the e2e runs against the real core only | 3 | No |
| 14 | Local program support | Section 6: loader, release script, provenance, admin screen, `mission check` | 3 | No |
| 15 | Speeds and idle | Data only: `slow: {rate: 25, stallMs: 10000}`, `full: {rate: 0, stallMs: 3000}` | 0 (in 1) | No |
| | **Total** | | **about 45** | |

Not counted: copy, UX screens, the fact-check gate (FR-46) and review. The PRD needs new FRs for the play phase; FR-02's action list gains `play_switch`.

**Idle and settle (note 6).** The idle rule (5.6) holds for these programs: every round runs through accumulator programs, so "all `acc.prog` zero plus `quiet` ms without change" means the round is over [R]. With the Master Programmer (Nim) the gap between `b i` and the first accumulator program was at most about 1.9 addition times (2.9 s at rate 13), inside the 3-addition quiet window [V], so a round cannot look idle before it starts; the margin is one addition time, so keep `quietMs: auto` and do not shorten it [I]. A turn is "settled" exactly when `run idle` fires, and `settled` already carries the watched accumulators signed [R]. **Stall guard:** Squares has none (it rests between presses); a game should set `stallMs` per speed, because a busy round changes an accumulator at least every addition time (0.8 s at rate 25) [V], and an idle game (the visitor thinking) is not watched [R]. The 3-minute "computation running" inactivity timeout (FR-32) covers a visitor who walks away mid-game [R].

## 6. Local programs: policy proposal

**What exists.** The loader accepts only a bare file name in the runtime `programs/` dir (`mission/load.go`: `program must be a file name in programs/`), pinned by `programSha256` [R]. The bridge never sends `l <program>`: it writes a `preset.e` built from the program's text into the run dir and starts the core with it (`WritePreset`), and the core's cwd stays the upstream runtime dir [R]. So **the core never needs to find a local program; only the loader does** (unless the program has `l` lines; forbid those in local programs). `scripts/build-release.sh` copies **all** of `build/upstream/programs/` into the release (not a dependency closure: `RUNTIME_FILES=auto` in `upstream.lock` is documented in 4.3 but not implemented that way) and links `original-ui/programs` to it [R]. The mission rules worked on a local file unchanged: rules 1-5 and 7 in `mission check`, rule 8 in `selftest` (section 1, runs 15, 16) [V]. Rule 6 (panel-kit element IDs) is not enforced by `mission check` (no code for it in `internal/mission`) [R].

**Proposal (smallest mechanism).**

1. Repo: `missions/programs/<name>.e`, one file per exhibit-team program, each with a header comment saying who wrote it and that it is not upstream.
2. Mission file: `program: local/race20.e` with `programSha256` as today. The loader resolves `local/<name>` (exactly that prefix, a bare name after it) to `<dir of the mission file>/programs/<name>`. No config change, since the missions dir is already `paths.missions`. `includes` are not allowed for a local program.
3. Release: `build-release.sh` copies `missions/programs/*.e` next to the mission YAMLs (`$STAGE/missions/programs/`). They are **not** put in `upstream/programs/`, so Stuart's original UI (which links to that dir) never lists our programs beside his. The script's existing `mission check` against the staged release already covers the new files. 4.3 gains one sentence: local programs ship with the missions, not with the upstream runtime files.
4. Provenance: `eniac-bridge version`, `/healthz` and the admin screen list each local program with its sha256, as patches are listed.
5. Credits: `credits: ["race20.e: written by the exhibit team for this kiosk", "Running on Brian L. Stuart's ENIAC simulator"]`. The UI must not imply Stuart wrote the game (FR-43 credit prominence still applies).
6. Bumping the pin: local programs are re-run by `selftest` and the goldens, like upstream ones.

**Wording changes.**

- Architecture 5.9.1, first bullet, from "A mission references an **unmodified** upstream `.e` by name, pinned by sha256." to: "A mission references a program by name, pinned by sha256: either an **unmodified** upstream `.e` (`program: sq.e`, resolved in the runtime `upstream/programs/`) or an **exhibit-team program** kept in this repo (`program: local/race20.e`, resolved in `missions/programs/` and shipped with the missions). Upstream programs are never edited; a changed version of one would be a new local program with its own name and credits."
- Architecture 5.9.2, the `program:` comment: "upstream programs/ file, or local/<name> for an exhibit-team program in missions/programs/".
- Architecture 5.9.5 rule 1: "The program (upstream or local) and include sha256 values match."
- PRD FR-24, from "references an unmodified upstream `.e` file" to "references an unmodified upstream `.e` file **or a reviewed exhibit-team program kept in the repo and credited as such**".
- **NFR-12: unchanged.** It governs patches to the core's `src/`; a local program is not a patch and does not touch any upstream file.

## 7. Risks, and what to ask Stuart

1. **The visitor cannot win** Race to 20 or one-pile Nim against "4 minus your move" (ENIAC moves second on multiples of 4). "Can you beat ENIAC?" needs the honest framing already flagged in `docs/mission-4-history-research.md` (3d, 4a). A version the visitor can win needs ENIAC to play from any position (reply = total mod 4, for example a function-table lookup of the total). That is plausible on this core but **not tested here** [I].
2. **Copy must not say ENIAC played games** (history research 4a), and the one-pile game is a subtraction game, not Bouton's Nim (3c, 3d).
3. **Dial changes mid-turn** are read by the running program [V]; the `BUSY` guard on `play_switch` is required, not optional.
4. **Live-frame checkpoints misfire** on transients [V]; game checkpoints must be settled-scope.
5. **Master Programmer load-order hazard** (Nim only) [V]: fixed by switch order; keep the CLEAR before the first INIT as a second guard. Watch for the same thing in any future local program that uses steppers.
6. **Existing flows change** when a fourth mission appears (finale, "Next", picker layout) [R] unless the `finale: false` flag ships with it.
7. **Speed:** at Squares' slow rate a game is over a minute of waiting; the Pi 5 and x86 timings are not measured [I].
8. **Hi-Lo staleness:** a fresh core per session repeats any in-machine secret [R/I].

Questions for Stuart (add to the #34 draft):

- Is he comfortable with an exhibit-team program running on his simulator in the kiosk, credited as ours and shown apart from his programs? Would he want it upstream?
- Master Programmer: is a stepper advancing on its own while a file loads (stage count set before the decade limits; S2 and S6) expected behaviour, an artefact of loading switches one by one, or a bug?
- The P/M sign flickers on every digit pulse during a subtraction in the 30 ms status samples. Is that how he expects the lamps to look at slow rates?

## 8. Files

Created by this spike (docs only; no bridge, web, `missions/`, `build/`, `patches/` or `upstream.lock` changes):

| File | What |
|---|---|
| `docs/spikes/S6-game-mission-feasibility.md` | This report |
| `docs/spikes/s6/race20.e` | Race to 20 (recommended). sha256 `64a2a1604c0d5f4bccf085977e17d6f26fe5746c086d6e1ec0f2401edbb311bc` |
| `docs/spikes/s6/nim20.e` | Nim, pile of 20 (MP rack-up; switch order fixed). sha256 `d225eeac26711b56d0c19f2de2374d8b9e3fcc41bb5646b38ed92a0217de4339` |
| `docs/spikes/s6/hilo.e` | Higher or lower. sha256 `c5e3285572456d27f904655bfdd278d49170551556468e068fce008a35f5e62b` |
| `docs/spikes/s6/race20.draft.yaml` | The draft mission used for `mission check` and `selftest` (minimal copy, not for the floor) |
| `docs/spikes/s6/drive.sh` | Headless driver: `docs/spikes/s6/drive.sh CMDFILE` (core commands and `sleep N` lines; 15 s timeout) |
| `docs/spikes/s6/timer.py` | Timing child: `cd build/upstream && (sleep 40) \| PROG=<abs .e> RATE=25 WAIT=8 MOVES=1,3,2 OUT=out.jsonl ../darwin-arm64/eniac-core -v "$(which python3) -I <abs>/timer.py"` (`-` in MOVES = INIT without changing the dial) |

To reproduce `mission check`/`selftest` on a local program today: make a scratch runtime dir with `programs/race20.e` and a copy of `build/upstream/.provenance.json`, put `race20.draft.yaml` (as `race20.yaml`) in a scratch missions dir, and point a copy of `deploy/config/config.dev.yaml` at them (absolute paths; keep `paths.run` short). Side effects of this spike outside `docs/`: `eniac-bridge record`/`selftest` used the dev config's `build/run/` for their temporary sockets (the directory is left empty); one stray `cp` of `race20.e` into `build/upstream/programs/` was removed in the same command, so that tree is unchanged.
