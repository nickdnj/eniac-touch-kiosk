# Fire Mission (Army artillery game, mission 2)

**Date:** 2026-10-29. **Why:** Doug (museum curator) pointed out after two eighth-grade tours that the Army, not the Navy, paid for ENIAC (Army Ordnance Department; Moore School contract of 5 June 1943, per the Army's own ENIAC history page, see `docs/army-game-research.md`). Battleship stays as another example; Fire Mission is the Army game.

## How it plays
Same machine as Battleship: the real simulator flies one shell from `gunnery.e` (`missions/programs/gunnery.e`, Stuart's `trajdemo.e` with the launch speeds on the dials). The hook is the **forward observer**:

1. **Round 1, spotting round.** Pick a howitzer (light, field, heavy), a charge and an elevation. ENIAC flies the shell.
2. The observer radios the miss from the visitor's own cards: "SHORT 5,708. Add range." or "OVER 340. Drop range." A hit is "TARGET! Fire for effect!".
3. **Round 2, fire for effect** ("Adjust fire" button, same target, the call stays on the aim screen). Only after a miss on round 1; a second miss gets no third round ("New target" starts over).

That is real artillery practice in outline (adjust fire, then fire for effect). The call wording is from community pages only; **check it against a real Army manual before the floor** (open item in `docs/army-game-research.md`). Each round is scored and can be saved to the board like any Battleship shot.

Arcade cousins to mention to visitors: Artillery Duel (1980s home computers and Atari 2600), Scorched Earth, Worms, Angry Birds. See `docs/army-game-research.md` for the verified dates and what not to claim (no source has ENIAC playing or inspiring a game).

## What is in the code
- `missions/firemission.yaml`: a copy of Battleship's file with `game.kind: army`, the guns in `game.ships`, eight ground targets (each with `art`), `board.spotter` copy. The firing table is Battleship's (same program, same dials).
- Go: `game.kind` accepts `army`; `Target.Art`; `BoardCopy.Spotter`; `AimCopy.Spotter/Round1/Round2` (`internal/mission/game.go`, generated TypeScript in `mission.gen.ts`).
- Web: `game/howitzer.ts` (gun art), `drawArmyTarget` in `game/zones.ts`, `stage/armyfig.ts` (title, plan and picker art), `GameRound.round/spotter/art` (`game/logic.ts`), `App.startMission(..., adjust)` carries the round, the spotter line in `screens/aim.ts`, the Adjust fire button in `screens/result.ts`.
- Mission order: Battleship 1, **Fire Mission 2**, Squares 3, Primes 4, Trajectory 5, Difference 6.

## Rules kept
No calibre or "a real 105 reaches X" anywhere on screen: the drag table is Stuart's reconstruction (`docs/gunnery-mission.md` G2). The guns are sizes, not real weapons.

## Verified 2026-10-29 (Mac, real core)
Heavy howitzer, charge 5, 10°, target 19,700 ft: landed 13,992 ft (the firing table's value), observer "SHORT 5,708", Adjust fire opened round 2 on the same target with the call shown.

## Not done
Real-core Playwright test for the adjust flow; wording check with Doug; timing a round on the museum box; a second look at the plan card's gun picture, which is small.
