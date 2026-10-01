#!/usr/bin/env bash
# Spike #32 (U1): reproduce the sieve.e function-table regression.
#
#   docs/upstream/sieve-repro.sh [SECONDS] [REV...]
#
# For each upstream revision (default: c4b94f2 f611c7f f611c7f~1, plus
# c4b94f2 with docs/upstream/proposed-0002-ft-repeat-default.patch) this
# exports the tree from the bare mirror cache, builds the core, runs
# programs/sieve.e with a stub display child for SECONDS (default 40) after
# one INIT, and reports the cards punched and the largest function-table
# ring value seen. It also runs the 3-line ft-repeat-default.e and prints
# FT1's ring one second after INIT (-3 = the program finished).
#
# Needs: the mirror at ~/.cache/eniac-kiosk/upstream.git (make upstream),
# Go (the pinned toolchain is used). Nothing is written inside the repo.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
CACHE="${ENIAC_UPSTREAM_CACHE:-$HOME/.cache/eniac-kiosk/upstream.git}"
TOOLCHAIN="$(sed -n 's/^GOTOOLCHAIN=//p' "$ROOT/upstream.lock")"
SECS="${1:-40}"; shift || true
REVS=("$@")
[ ${#REVS[@]} -gt 0 ] || REVS=(c4b94f2 f611c7f f611c7f~1 c4b94f2+patch)
[ -d "$CACHE" ] || { echo "no mirror at $CACHE; run make upstream" >&2; exit 1; }
WORK="$(mktemp -d "${TMPDIR:-/tmp}/sieve-repro.XXXXXX")"
trap 'rm -rf -- "$WORK"' EXIT
printf '#!/bin/sh\necho ready\nexec cat > "$1"\n' > "$WORK/stub.sh"; chmod +x "$WORK/stub.sh"

printf '%-16s %-8s %-10s %s\n' "revision" "cards" "max ftr" "ft-repeat-default.e: FT1 ring 1 s after INIT"
for rev in "${REVS[@]}"; do
  base="${rev%+patch}"; tag="$(echo "$rev" | tr '~+/' '__-')"
  src="$WORK/$tag"; mkdir -p "$src"
  git --git-dir="$CACHE" archive "$base" | tar -x -C "$src"
  if [ "$rev" != "$base" ]; then
    (cd "$src" && GIT_CEILING_DIRECTORIES="$WORK" git apply "$HERE/proposed-0002-ft-repeat-default.patch")
  fi
  (cd "$src" && CGO_ENABLED=0 GOTOOLCHAIN="$TOOLCHAIN" GOFLAGS=-mod=mod go build -o "$src/eniac-core" ./src) >/dev/null 2>&1 \
    || (cd "$src/src" && CGO_ENABLED=0 GOTOOLCHAIN="$TOOLCHAIN" go build -o "$src/eniac-core" .)
  # sieve.e: one INIT, then let it run.
  (sleep 1.5; echo "f p $src/punch.txt"; echo "b i"; sleep "$SECS"; echo q) \
    | (cd "$src" && ./eniac-core -v "$WORK/stub.sh $src/status.txt" programs/sieve.e) >/dev/null 2>&1 || true
  cards=$(wc -l < "$src/punch.txt" 2>/dev/null | tr -d ' ' || echo 0)
  maxftr=$(awk '$1=="ftr"{if($3>m||m=="")m=$3}END{print (m==""?"-":m)}' "$src/status.txt")
  # minimal program: ring after 1 s.
  ring=$( (sleep 1.3; echo "b i"; sleep 1; echo "d f1"; echo q) \
    | (cd "$src" && ./eniac-core -v "$WORK/stub.sh /dev/null" "$HERE/ft-repeat-default.e" 2>/dev/null) \
    | tr '>' '\n' | awk 'NF==6{print $3}' | tail -1)
  printf '%-16s %-8s %-10s %s\n' "$rev" "$cards" "$maxftr" "$ring"
done
