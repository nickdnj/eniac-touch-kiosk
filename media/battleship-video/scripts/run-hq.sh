#!/bin/bash
# Run one HQ clip test from the kiosk worktree. Usage: scripts/run-hq.sh R3
set -e
WT=${WT:-$HOME/Workspaces/eniac-touch-kiosk/.claude/worktrees/battleship-hq}
HERE=$(cd "$(dirname "$0")" && pwd)
cp "$HERE/clip-battleship.spec.ts" "$HERE/hqcap.ts" "$HERE/playwright.hq.config.ts" "$WT/tests/web/video/"
cd "$WT/src/web"
CLEAN=1 npx playwright test -c ../../tests/web/video/playwright.hq.config.ts clip-battleship -g "$1:"
