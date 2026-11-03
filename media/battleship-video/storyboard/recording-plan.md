# Recording plan: ENIAC Plays Battleship (Gate 1 draft v2)

**Date:** 2026-10-23. **Status:** plan only. Nothing recorded; the Playwright spec is **not written** (§4 says what it must do).
**Build:** kiosk repo `~/Workspaces/eniac-touch-kiosk`, worktree `.claude/worktrees/gunnery`, branch `gunnery-game` @ `56274b7`. This commit includes the accumulator-lamp fix `52105ee` (checked with `git merge-base --is-ancestor`). The worktree already exists.
**Output:** 1920x1080 clean screen recordings (`CLEAN=1`, no caption boxes; only tap ripples drawn), plus a beats JSON per clip so the edit can cut to beats. Copy the finished clips into this repo at `assets/video/` (large media stays untracked).

## 1. Before recording

1. **Kiosk copy.** K1 to K4 (`research/fact-check.md` §3: the "GO button" lines, the "faster than the shell" `more` text, the stale "place two of them" screen) have gone to the kiosk team to fix. Record from a build with the fixes if one is ready. **Fallback if not:** record anyway, never open "more", and cut around the rest in the edit: skip tour stop 1 (K1), cut into the INIT beat after the K2 sub-line has left the frame, and skip the `rest` screen if it shows (K4).
2. **Serve:** `make upstream` once, then `make dev` (http://localhost:8740, real core through the bridge). Link `build/` and `src/web/node_modules` from the main checkout into the worktree (they are not in it).
3. **Idle machine.** Fly each recorded shot **alone**: no sweep tests, no other heavy jobs, no second browser on the bridge (KGM G1: an earlier harness gave different landings under load).
4. **Clean score board (Nick: OK to clear).** Delete the dev state directory's `scores/battleship.json` before R1 and R2, so the title plate reads "BE THE FIRST" and the Today board holds only our shots. (Find the dev state directory in the kiosk `Makefile`; the kiosk path is `/var/lib/eniac-kiosk/scores/`.)
5. **Never tap "more"** on any screen (the result `more` text is K3).

## 2. Target / shot pairs (measured; `research/kiosk-gunnery-battleship-mission.md`)

Every target is the ground crossing of one shot, so each has a perfect shot. Set the target with the dev hook (§4 step 3).

| Target | Name (radius) | Sinking shot | Lands (ft) | Miss | Hops | Wall time (about) |
|---|---|---|---|---|---|---|
| t1 3,700 | Enemy patrol boat (150) | Destroyer · Light 600 · 10° | 3,709 | 9 long | 7 | 10 s |
| t2 5,400 | Enemy patrol boat (150) | Destroyer · Light 600 · 15° | 5,377 | 23 short | 10 | 15 s |
| t3 8,200 | Enemy destroyer (200) | Cruiser · Medium 900 · 10° (also Destroyer · Quick 750 · 15°: 8,254, 54 long, 12 hops) | 8,170 | 30 short | 10 | 15 s |
| **t4 10,950** | **Enemy destroyer (200)** | **Cruiser · Long 1,050 · 10°** | **10,954** | **4 long** | **12** | **18 s** |
| t5 14,000 | Enemy cruiser (300) | Battleship · Heavy 1,200 · 10° | 13,996 | 4 short | 13 | 20 s |
| t6 15,550 | Enemy cruiser (300) | Cruiser · Long 1,050 · 15° | 15,550 | 0 | 17 | 26 s |
| t7 19,700 | Enemy battleship (400) | Battleship · Heavy 1,200 · 15° (also Cruiser · Long · 20°: 19,472, 228 short, 22 hops) | 19,721 | 21 long | 19 | 29 s |
| t8 24,500 | Enemy battleship (400) | Battleship · Heavy 1,200 · 20° | 24,532 | 32 long | 25 | 38 s |

Hops for Light, Medium and Heavy are from the Gunnery sweep at the same speeds; Quick, Long and Big hops are from the Battleship table. Wall time is about 1.5 s per hop (the mission file says 1.43 s).

**The finale pair (default, Option 1 "Outranged"):** target t4. **Miss:** **Destroyer · Quick 750 · 20°** → **10,435 ft**, 515 ft short, **16 hops** (about 23 s); Battleship table row "Quick 750", column 20°. Expected score 934, "Sharpshooter" (from `judge` in `game/logic.ts` with radius 200). **Sink:** **Cruiser · Long 1,050 · 10°** → **10,954 ft**, 4 ft long, 12 hops. Confirm both on screen.

**Option 2 (alternate):** miss with **Cruiser · Medium 900 · 15°** → 11,694 ft, 744 ft long, 15 hops; same sink. Record this as R3b only if Nick picks Option 2.

## 3. Shots to film

| Id | What | Set-up | Drive | Hold / length | Used in |
|---|---|---|---|---|---|
| **R1** | Battleship title screen loop (briefing figure: shell lob, SUNK! stamp, score plate) | Clean scores | Open the mission, stop on the title/briefing figure, no taps | 30 s still hold (8 loops of 3.6 s) | S1, S2, S17, S18; all cuts |
| **R2** | The full session: round A (miss) then round B (sink), name, board | target t4 via the dev hook | briefing (hold 4 s) → Let's go → plan (hold 4 s) → Next step → aim: **Destroyer, Quick, 20°** (slow taps, 1.5 s apart) → hold on "Your shot, set on the dials" 3 s → Load the guns → build intro (hold 4 s) → tour: Next through **all eight stops, 4 s each** (the edit picks stops 2, 6, 7) → To the guns → READ → wait for card-read → INIT → wait for landing → hold the result 8 s → Fire again → aim: **Cruiser, Long, 10°**, three slow deliberate taps about 2 s apart (the re-aim beat) → Load the guns → Skip to the guns → READ → INIT → landing → hold 8 s → Save my score → type **YOU NEXT** → Save → hold the Today board 6 s | about 4 to 5 min | S5, S7 to S17; all cuts |
| **R3** | Verification: round A again (not shown in the main video) | target t4, fresh page load, same idle conditions | Destroyer, Quick, 20° → Skip to the guns → READ → INIT → hold the result 6 s | about 40 s | checks that A lands at 10,435 ft again; a spare for the shorts |
| **R4** | Round B again, with the accumulator lamps in view | target t4 | Cruiser, Long, 10° → Skip → READ → INIT; during the flight, open the room / lamp view if the run screen offers one (e.g. "See the whole room"); otherwise stay on the run screen → result | about 30 s | S15 lamp and card-strip cutaways (the same deterministic shot; must also land at 10,954 ft); backup for the cuts |
| R5 | Optional: battleship-vs-battleship | target t7 19,700 | Battleship, Heavy, 15° → Skip → READ → INIT → result (19 hops, about 29 s) | about 50 s | spare only (Nick chose the destroyer finale) |
| **R6** | Honor roll: the six first programmers | none | Reuse first: `~/Workspaces/eniac-kiosk-youtube/assets/video/source-v6/eniac-touch-tour.mp4` 238.52 to 256.56 s (fixed build, tour-27 honor screen; first project EDL scene S10). **Check the frame has no caption box and no burned-in voice line.** If it fails, re-record the honor screens from `gunnery-game` with `walkthrough-tour.spec.ts`. | 18 s | S6, vertical short |
| R7 | Spare B-roll: tour stops 3 to 5 (Accumulators 4 and 6, Multiplier, Function Table 2) held 6 s each | part of R2 | already in R2's full tour pass | from R2 | S11 callouts if wanted |

**After each take:** read the landing from the result screen and the beats JSON. It must match §2 to the foot (10,435 for A, 10,954 for B). If a flight differs, stop, note the machine load, and re-fly. Do not edit around a wrong landing. R2's flight A must be one unbroken take (S11 is real time).

## 4. The Playwright spec still to be written (note only, not written here)

**File:** `tests/web/video/clip-battleship.spec.ts` in the kiosk repo (`gunnery-game` worktree), modelled on `clip-difference-cubes.spec.ts`. It is the software team's or the visuals phase's job; it is a change to the kiosk repo, not this one.

What it needs:

1. **Harness, as in the cubes spec:** `overlays(page)` and `pause()` from `overlay.ts`; `tap` / `tapSlow` / `view` / `mainBtn` from `../e2e/helpers.ts`; `test.setTimeout` of about 1,500,000 ms; a `beat(name)` logger written to `build/video/battleship-beats.json` (beat name plus ms offset from `performance.timeOrigin`). Run with `CLEAN=1` at 1920x1080 through `tests/web/video/playwright.config.ts`, then convert `build/video/out/<test>/video.webm` with ffmpeg as that config describes.
2. **Separate tests** for R1, R2, R3 (and R4, R5), so each is its own recording and a retake does not redo the whole session.
3. **Choose the target before the aim screen opens.** In the dev build `window.__eniac` is the app. Run `__eniac.game = { target: 10950, hit: 200, name: "Enemy destroyer", ship: null, charge: null, elevation: null }`, then `__eniac.show({ name: "aim" })` (values from the t4 entry of `missions/battleship.yaml`; t7 is `19700 / 400 / "Enemy battleship"`). This must happen after the briefing/plan beats so they record normally. If it is fiddly, ask the software team for a `?target=t4` dev hook instead.
4. **Selectors:** the ship, gun and elevation buttons, Load the guns, tour Next / Skip to the guns / To the guns, READ, INIT, Fire again, Save my score, the name keyboard keys, Save. Take them from `screens/aim.ts`, `screens/build.ts`, the run screen and `game/namepad.ts`. Click slowly (about 1.5 s between choices) so the gun tip animation and tap ripples read on camera.
5. **Waits:** the card-read checkpoint (Accumulator 1 = 97,367) before INIT; the `landed` checkpoint, then the result view, before the hold. Tag beats: `aim-open`, `ship`, `gun`, `elev`, `load`, `tour-1` … `tour-8`, `read`, `card-read`, `init`, `hop-N` (each card), `landed`, `result`, `fire-again`, `name`, `board`.
6. **Assertions** (fail the take; never record a wrong flight): the result text contains `10,435` and "short" for round A, and `10,954` plus "Direct hit! Ship sunk!" for round B. Log the frame time of every card punched (`hop-N` beats); the edit syncs the low drum to them.
7. **Never** call any "more" / "Tell me more" control. Never send a second INIT mid-flight (`initOnce` in the mission: it corrupts the flight).
8. Not part of CI; tag it like the other `clip-*` specs.

## 5. Hand-off to visuals and assembly

- Clips → `assets/video/raw/` here (untracked), with their beats JSON.
- Photos P1 to P3: copy from the first project; P4: download from archive.org and crop the Google margin. Record source URL and licence in `assets/images/photos/credits.md`.
- 16:9 assembly follows `storyboard/storyboard-data.json`. Vertical cuts follow the "Cut plans" section of `storyboard/storyboard.md`, pre-cropping to 9:16 before zoompan.
