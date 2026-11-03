# Moving the ENIAC kiosk + video work to the M4 MacBook (user `nickd`)

Everything that matters is in git (pushed). Only a few untracked files travel in the transfer bundle. Nothing here contains a secret.

## 1. Get the code (on the M4)

```bash
cd ~/Workspaces
gh auth status || gh auth login
# kiosk
test -d eniac-touch-kiosk || gh repo clone nickdnj/eniac-touch-kiosk
cd eniac-touch-kiosk && git fetch origin && git checkout difference-footage && git pull
#   difference-footage contains the whole stack: #76 panels, #77 pin bump, #78 Difference, #79 N missions, #80 footage/connectors/plan figure
# video
cd ~/Workspaces
test -d eniac-kiosk-youtube || gh repo clone nickdnj/eniac-kiosk-youtube
cd eniac-kiosk-youtube && git fetch origin && git checkout difference-video-plan && git pull
```

If `.claude/` is missing in either repo (it is generated, not committed): `aa sync /Users/nickd/Workspaces/<repo>` from the factory.

## 2. Kiosk: build and check (about 10 minutes)

```bash
cd ~/Workspaces/eniac-touch-kiosk
make upstream                       # pinned simulator ad9a7a7 + patch 0003 + difference.e; downloads Go 1.27.2 once
cd src/web && npm install && npx playwright install chromium
npm run typecheck && npm test       # expect 226 pass
cd ../.. && make missions-check     # 4 missions ok
```

Optional, slower: `cd src/web && npx playwright test -c ../../tests/web/playwright.real.config.ts` (22 pass, 1 skipped, about 15 min on the old Mac).

## 3. Video: put the untracked files in place

From the transfer bundle (`eniac-transfer-2026-10-20.zip`, AirDrop it):

- `difference-clean-raw.mp4` and `difference-beats.json` go in `eniac-kiosk-youtube/assets/video/difference-2026-10-19/`. (They can also be regenerated in 2 minutes: `cd eniac-touch-kiosk/src/web && npx playwright test -c ../../tests/web/video/playwright.config.ts clip-difference`, then convert `build/video/out/clip-difference*/video.webm` with ffmpeg as in the spec header, and copy `build/video/difference-beats.json`.)
- `ENIAC-Difference-mission-review.mp4` is the review cut (system voice). Watch it first.
- `difference.pdf` is Stuart's tutorial "Polynomial Tables on the ENIAC". It is not private (Nick, 2026-10-20) and is already in this repo at `research/sources/stuart-polynomial-tables/` with page PNGs, because the video shows its hand-worked table as "the why". The kiosk repo is public, so it is NOT committed there.
- `claude-memory-eniac-kiosk-difference-mission.md` is the saved memory from the old Mac. Tell the new session to read it, or copy it into that machine's Claude project memory.

Rebuild the review cut any time (macOS voice): `cd eniac-touch-kiosk/src/web && node ~/Workspaces/eniac-kiosk-youtube/scripts/difference_cards.mjs ~/Workspaces/eniac-kiosk-youtube/output/build/difference-review`, then `python3 ~/Workspaces/eniac-kiosk-youtube/scripts/build_difference_review.py`.

## 4. What the M4 has that the old Mac did not (this is why we are moving)

ElevenLabs key ("Nick 2" voice), `AgentArchitect/scripts/youtube-whoami.py`, YouTube credentials. So on the M4 the real work is:

1. Voice-over for `storyboard/difference-storyboard-v1.md` with Nick 2 (per-scene WAVs plus one review MP3; ENIAC through the pronunciation alias, "init" lowercase). Edit the narration first if Nick wants.
2. Assemble the real cut (title card, music, end card) with the project's existing assemble scripts.
3. Re-cut the main video from kiosk PR #80's branch (specs already run four missions).
4. Run `youtube-whoami.py`, then upload both unlisted to Nick's channel and send Nick the links. (Nick's decision, 2026-10-19: no waiting for the listening gate; generate the ENIAC/init listening reel anyway and say the upload is not gate-checked.)

## 5. First message to paste into Claude Code on the M4 (in `eniac-kiosk-youtube`)

> Read `notes/handoff-2026-10-19-evening.md`, `notes/MOVE-TO-M4.md`, `research/difference-video-plan-2026-10-19.md` and `storyboard/difference-storyboard-v1.md`. The kiosk work is in `~/Workspaces/eniac-touch-kiosk` on branch `difference-footage` (draft PRs #76 to #80). Pick up from section 4 of the move note: voice-over for the Difference storyboard with Nick 2, assemble, then the main-video re-cut, then upload both unlisted after `youtube-whoami.py` and tell me the links. Do not email Brian or quote his email.

## 6. Housekeeping

- The old Mac's session should stop committing. Treat the M4 as canonical from here. All branches are pushed; none of the draft PRs is merged.
- Open PRs: kiosk #76 #77 #78 #79 #80; video #2 (this branch).
- The `stuart-reception-2026-10-19.md` note was written by another session and is untracked; it is in the bundle.
