#!/usr/bin/env bash
# Negative and offline tests for scripts/fetch-upstream.sh (issue #1).
# Uses a scratch build dir; never touches build/upstream. Needs the bare
# mirror cache to exist already (run `make upstream` once).
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRATCH="$(mktemp -d "${TMPDIR:-/tmp}/fetch-test.XXXXXX")"
trap 'rm -rf -- "$SCRATCH"' EXIT
fail=0
pass() { echo "ok   - $*"; }
bad()  { echo "FAIL - $*"; fail=1; }

# 1. Tampered TREE aborts with a clear message.
sed 's/^TREE=.*/TREE=0000000000000000000000000000000000000000/' "$ROOT/upstream.lock" > "$SCRATCH/bad-tree.lock"
out="$(ENIAC_UPSTREAM_LOCK="$SCRATCH/bad-tree.lock" ENIAC_BUILD_DIR="$SCRATCH/b1" "$ROOT/scripts/fetch-upstream.sh" --no-build 2>&1)"; rc=$?
if [ $rc -ne 0 ] && grep -q 'TREE mismatch' <<<"$out" && [ ! -d "$SCRATCH/b1/upstream" ]; then pass "tampered TREE aborts"; else bad "tampered TREE: rc=$rc out=$out"; fi

# 2. Patch with broken context aborts, and leaves no half-patched tree.
mkdir -p "$SCRATCH/patches"
sed 's/^ func multstat() string {/ func multstat_broken() string {/' "$ROOT/patches/0001-mult-stage-format.patch" > "$SCRATCH/patches/0001-mult-stage-format.patch"
cp "$ROOT/patches/series" "$SCRATCH/patches/series"
out="$(ENIAC_PATCHES_DIR="$SCRATCH/patches" ENIAC_BUILD_DIR="$SCRATCH/b2" "$ROOT/scripts/fetch-upstream.sh" --no-build 2>&1)"; rc=$?
if [ $rc -ne 0 ] && grep -q 'does not apply cleanly' <<<"$out" && [ ! -d "$SCRATCH/b2/upstream" ]; then pass "broken patch aborts"; else bad "broken patch: rc=$rc out=$out"; fi

# 3. Offline: unreachable URL and no Go proxy still fetch, verify, patch and build.
sed 's|^URL=.*|URL=https://invalid.invalid/none|' "$ROOT/upstream.lock" > "$SCRATCH/offline.lock"
out="$(GOPROXY=off GOFLAGS=-mod=mod ENIAC_UPSTREAM_LOCK="$SCRATCH/offline.lock" ENIAC_BUILD_DIR="$SCRATCH/b3" "$ROOT/scripts/fetch-upstream.sh" 2>&1)"; rc=$?
if [ $rc -eq 0 ] && [ -x "$SCRATCH/b3/darwin-arm64/eniac-core" ] && [ -x "$SCRATCH/b3/linux-arm64/eniac-core" ] && [ -x "$SCRATCH/b3/linux-amd64/eniac-core" ]; then pass "offline rebuild works"; else bad "offline: rc=$rc out=$out"; fi

# 4. The patched lines are present (patches/series).
if grep -n 'Sprintf("%d ", stage)' "$SCRATCH/b3/upstream/src/mult.go" | grep -q '^66:'; then pass "mult.go:66 patched"; else bad "mult.go:66 not patched"; fi
if grep -A6 'f.ring = -3' "$SCRATCH/b3/upstream/src/ft.go" | grep -q 'f.rptsw\[i\] = 1'; then pass "ft.go repeat-switch default patched"; else bad "ft.go repeat-switch default not patched"; fi
if grep -B1 -A1 'u.val\[0\]++' "$SCRATCH/b3/upstream/src/accumulator.go" | grep -q 'u.mu.Lock()'; then pass "accumulator.go 1PP race patched"; else bad "accumulator.go 1PP race not patched"; fi
for p in $(sed -e 's/#.*//' -e 's/\.patch$//' "$ROOT/patches/series"); do
  if grep -q "\"name\":\"$p\"" "$SCRATCH/b3/upstream/.provenance.json"; then pass "provenance lists $p"; else bad "provenance lacks $p: $(cat "$SCRATCH/b3/upstream/.provenance.json")"; fi
done

# 5. Linux cores are static ELFs (aarch64 for the Pi, x86-64 for the mini PC).
if file "$SCRATCH/b3/linux-arm64/eniac-core" | grep -q 'ARM aarch64.*statically linked'; then pass "linux core static aarch64"; else bad "linux core: $(file "$SCRATCH/b3/linux-arm64/eniac-core")"; fi
if file "$SCRATCH/b3/linux-amd64/eniac-core" | grep -q 'x86-64.*statically linked'; then pass "linux core static x86-64"; else bad "linux amd64 core: $(file "$SCRATCH/b3/linux-amd64/eniac-core")"; fi

# 6. No upstream source tracked in git.
if [ -z "$(git -C "$ROOT" ls-files build dist)" ] && ! git -C "$ROOT" ls-files | grep -Eq '(^|/)(mult|engine|eniac|accumulator)\.go$|(^|/)programs/.*\.e$'; then pass "no upstream source committed"; else bad "upstream-looking files are tracked"; fi

exit $fail
