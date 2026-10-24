#!/usr/bin/env bash
# Rebuild the draft. REUSE=1 skips re-rendering unchanged video segments (output/work/seg*.mp4).
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/assemble.py            # output/battleship-main-draft1.mp4
python3 scripts/assemble_vertical.py   # 30s / 8s / short vertical cuts
