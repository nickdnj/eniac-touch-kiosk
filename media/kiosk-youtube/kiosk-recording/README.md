# Kiosk recording recipe (saved before the scratch worktrees were removed, 2026-10-12)

The v5 and v6 footage was recorded from throw-away git worktrees of
`~/Workspaces/eniac-touch-kiosk` (`.claude/worktrees/video-v5|video-v6|video-v6b`), never committed there.
This folder keeps everything in them that was worth keeping. Full narrative: `notes/m1-rerecord-2026-10-12.md`.

| worktree | base | what it was | diff saved |
|---|---|---|---|
| video-v5 | a8bbf3a | v5 / v5b footage (kiosk as deployed, original-ui switch) + c897ac3 cherry-pick + uncommitted spec edits | `video-v5.diff` |
| video-v6 | 52105ee | first v6 attempt: panel fix only, stale (no tubes fix, no INIT copy). Superseded | `video-v6.diff` |
| video-v6b | 62ef8d7 (kiosk main) | **final v6**: c897ac3 + v5's spec edits + M2 alias patch to narration-gen.py (2 workers) + 3 new Shorts specs + 3 lines of INIT wording in narration.md | `video-v6b.diff`, `specs-v6b/`, `narration-v6b/` |

## Recreate the v6b recording environment
1. `git -C ~/Workspaces/eniac-touch-kiosk worktree add --detach .claude/worktrees/video-v6b 62ef8d7`
2. `git cherry-pick -n c897ac3`, then `git apply kiosk-recording/video-v6b.diff` (or copy `specs-v6b/*` over `tests/web/video/`, and `narration-v6b/narration.md` to `docs/video/narration.md`).
3. Link `src/web/node_modules` and copy `build/darwin-arm64`, `build/upstream` from the main checkout.
4. Record with `NARRATE=1 CLEAN=1`; narration via `zsh -ic 'python3 tests/web/video/narration-gen.py --only squares,primes,trajectory,tour,finale'` (alias Ennie-ack inline; key only in ~/.zshrc; no fallback voice).
5. Mux with `tests/web/video/narration-mux.py` using the final cut values in `scripts/v6_mux_cuts.json`
   (primes 142.3-163.3; trajectory 114.1-140.5 and 160.2-196.9).

## What is saved where
- `kiosk-recording/` (tracked): diffs, final specs, narration.md, manifest + timelines.
- `assets/audio/kiosk-lines-v6/`: the 136 final per-line WAVs + sidecars (paid ElevenLabs takes; WAV/MP3 are untracked per .gitignore).
- `assets/video/kiosk-takes-v6/`: raw Playwright webm recordings for the five clips (untracked).
- `assets/video/source-v6/`: the muxed final clips plus the Shorts footage (untracked).

## Not saved (regenerable or superseded)
v5's per-line WAVs (old voice), `takes-attempt1`, `takes-silent`, `v6-attempt1`, the stale video-v6 narration, `build/upstream` (Stuart's simulator, re-fetch with `make upstream`), `src/web/node_modules` links.
