# Lamp fix applied to the real kiosk checkout (2026-10-12)

Requested by Nick in chat ("Apply the lamp fix patch to the real kiosk").

- Repo: /Users/nickd/Workspaces/eniac-touch-kiosk, main checkout, branch `pin-bump-7c043c5` (18aabb9, merge of PR #67).
- Patch: notes/kiosk-lamp-fix-tubes-art.patch -> src/web/app/tubes/art.ts `accSvg()` (digit 0 bottom, 9 top, same rule as 52105ee).
- `git apply --check` clean, applied to the working tree. **Not committed, not pushed, not deployed.**
- Verified: `node --test tests/web/tubes.test.ts` 13/13 pass; `tsc --noEmit -p src/web` exit 0.
- Not verified by eye on the real build; the visual check happens in the video-v6 worktree re-record (notes/m1-rerecord-2026-10-12.md).
- Other uncommitted files in that checkout (`.agentarchitect.json`, `upstream.lock`) are not ours and were left alone.
- The checkout's branch has moved twice during this session (open-source-prep, fact-check-init-term, now pin-bump-7c043c5): another session is using it.
