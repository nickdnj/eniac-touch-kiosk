#!/bin/bash
# usage: drive.sh CMDFILE   (lines: core commands, or "sleep X")
# runs the real core with cwd build/upstream, 15 s timeout
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
CORE=$ROOT/build/darwin-arm64/eniac-core
cd "$ROOT/build/upstream"
( while IFS= read -r line; do
    case "$line" in
      sleep*) eval "$line";;
      "#"*|"") ;;
      *) echo "$line"; sleep 0.05;;
    esac
  done < "$1"; sleep 0.3 ) | timeout 15 "$CORE"
echo "[exit $?]"
