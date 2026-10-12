#!/usr/bin/env bash
# Fetch, verify and patch the pinned upstream simulator into build/upstream,
# then build the core for the host (darwin-arm64) and both kiosk targets:
# linux-arm64 (Pi 5) and linux-amd64 (x86 mini PC, e.g. Dell OptiPlex).
# Brian L. Stuart's Tk front end, vis/eniactk.go, is built from the same
# patched export for the same targets (build/<os>-<arch>/eniactk): the
# Original UI switch runs it on our core (docs/original-ui-switch.md 7.1).
#
#   scripts/fetch-upstream.sh            fetch + verify + patch + build all cores
#   scripts/fetch-upstream.sh --no-build fetch + verify + patch only
#   scripts/fetch-upstream.sh --unpatched
#       also export an UNPATCHED tree to build/upstream-unpatched and build
#       build/unpatched/eniac-core for the host (golden recording of the
#       mult.go "%2d" quirk only; never shipped)
#
# Nothing from upstream is ever committed (PRD R1). Architecture 4.1-4.2.
# Works offline once the bare mirror and the Go toolchain are cached.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Overrides exist for tests/upstream/test-fetch.sh only.
LOCK="${ENIAC_UPSTREAM_LOCK:-$ROOT/upstream.lock}"
PATCHES="${ENIAC_PATCHES_DIR:-$ROOT/patches}"
BUILD="${ENIAC_BUILD_DIR:-$ROOT/build}"
CACHE="${ENIAC_UPSTREAM_CACHE:-$HOME/.cache/eniac-kiosk/upstream.git}"

die() { echo "fetch-upstream: ERROR: $*" >&2; exit 1; }
log() { echo "fetch-upstream: $*" >&2; }

DO_BUILD=1
DO_UNPATCHED=0
for a in "$@"; do
  case "$a" in
    --no-build) DO_BUILD=0 ;;
    --unpatched) DO_UNPATCHED=1 ;;
    *) die "unknown argument: $a" ;;
  esac
done

[ -f "$LOCK" ] || die "missing $LOCK"
# shellcheck disable=SC1090
URL="$(sed -n 's/^URL=//p' "$LOCK")"
COMMIT="$(sed -n 's/^COMMIT=//p' "$LOCK")"
TREE="$(sed -n 's/^TREE=//p' "$LOCK")"
TOOLCHAIN="$(sed -n 's/^GOTOOLCHAIN=//p' "$LOCK")"
[ -n "$URL" ] && [ -n "$COMMIT" ] && [ -n "$TREE" ] && [ -n "$TOOLCHAIN" ] \
  || die "upstream.lock must set URL, COMMIT, TREE and GOTOOLCHAIN"
[[ "$COMMIT" =~ ^[0-9a-f]{40}$ ]] || die "COMMIT must be a full 40-hex sha: $COMMIT"
[[ "$TREE" =~ ^[0-9a-f]{40}$ ]] || die "TREE must be a full 40-hex sha: $TREE"

# 1. Bare mirror cache; fetch only if the pinned commit is missing.
if [ ! -d "$CACHE" ]; then
  log "creating bare mirror at $CACHE"
  mkdir -p "$(dirname "$CACHE")"
  git clone --quiet --mirror "$URL" "$CACHE" || die "clone of $URL failed (network?)"
fi
if ! git --git-dir="$CACHE" cat-file -e "$COMMIT^{commit}" 2>/dev/null; then
  log "commit $COMMIT not in cache; fetching"
  git --git-dir="$CACHE" fetch --quiet origin '+refs/*:refs/*' || die "fetch failed (network?)"
  git --git-dir="$CACHE" cat-file -e "$COMMIT^{commit}" 2>/dev/null \
    || die "commit $COMMIT does not exist upstream"
else
  log "commit $COMMIT present in cache (no network needed)"
fi

# 2. Verify the commit's tree against the lock before exporting anything.
GOT_TREE="$(git --git-dir="$CACHE" rev-parse "$COMMIT^{tree}")"
[ "$GOT_TREE" = "$TREE" ] || die "TREE mismatch: upstream.lock says $TREE but $COMMIT has tree $GOT_TREE. Refusing to build."

# export_tree <dest>: fresh git archive, no .git, then re-hash the exported
# files and compare with TREE (catches a corrupted or tampered export).
export_tree() {
  local dest="$1" tmpgit
  if [ -d "$dest" ]; then
    # Only ever delete our own export directories under build/.
    case "$dest" in "$BUILD"/.staging|"$BUILD"/upstream-unpatched) rm -rf -- "$dest" ;; *) die "refusing to delete $dest" ;; esac
  fi
  mkdir -p "$dest"
  git --git-dir="$CACHE" archive --format=tar "$COMMIT" | tar -x -C "$dest"
  tmpgit="$(mktemp -d "${TMPDIR:-/tmp}/eniac-tree.XXXXXX")"
  GIT_DIR="$tmpgit" GIT_WORK_TREE="$dest" git init --quiet
  GIT_DIR="$tmpgit" GIT_WORK_TREE="$dest" git -c core.autocrlf=false -c core.fileMode=true add -A -f
  local exported
  exported="$(GIT_DIR="$tmpgit" GIT_WORK_TREE="$dest" git write-tree)"
  rm -rf -- "$tmpgit"
  [ "$exported" = "$TREE" ] || die "exported tree hashes to $exported, expected $TREE. Refusing to build."
}

# Export into a staging dir; it replaces build/upstream only after every
# patch applied, so a failed run never leaves a half-patched tree behind.
STAGE="$BUILD/.staging"
log "exporting $COMMIT"
export_tree "$STAGE"

# 3. Apply patches in series order. No fuzz: --check first, abort on failure.
# GIT_CEILING_DIRECTORIES stops git from discovering this repo above build/.
APPLIED_JSON=""
while IFS= read -r p || [ -n "$p" ]; do
  p="${p%%#*}"; p="$(echo "$p" | tr -d '[:space:]')"
  [ -z "$p" ] && continue
  f="$PATCHES/$p"
  [ -f "$f" ] || die "patch listed in series is missing: $p"
  if ! (cd "$STAGE" && GIT_CEILING_DIRECTORIES="$BUILD" git apply --check "$f" 2>&1); then
    die "patch $p does not apply cleanly to $COMMIT (no fuzz allowed). Refusing to build."
  fi
  (cd "$STAGE" && GIT_CEILING_DIRECTORIES="$BUILD" git apply "$f") || die "git apply $p failed"
  sha="$(shasum -a 256 "$f" | cut -d' ' -f1)"
  log "applied $p ($sha)"
  APPLIED_JSON="${APPLIED_JSON:+$APPLIED_JSON,}{\"name\":\"${p%.patch}\",\"file\":\"$p\",\"sha256\":\"$sha\"}"
done < "$PATCHES/series"

# 4. Provenance, shipped with releases and shown on the admin screen.
cat > "$STAGE/.provenance.json" <<EOF
{"url":"$URL","commit":"$COMMIT","tree":"$TREE","gotoolchain":"$TOOLCHAIN","patches":[${APPLIED_JSON}],"originalUi":{"eniactk":"vis/eniactk.go"},"builtAt":"$(date -u +%Y-%m-%dT%H:%M:%SZ)"}
EOF
if [ -d "$BUILD/upstream" ]; then rm -rf -- "$BUILD/upstream"; fi
mv "$STAGE" "$BUILD/upstream"
log "build/upstream ready"

if [ "$DO_UNPATCHED" = 1 ]; then
  log "exporting unpatched tree into build/upstream-unpatched"
  export_tree "$BUILD/upstream-unpatched"
fi

[ "$DO_BUILD" = 1 ] || { log "done (no build)"; exit 0; }

# 5. Build the core. Pure Go, static, pinned toolchain (U8).
build_core() { # <srcroot> <goos> <goarch> <out>
  local src="$1" goos="$2" goarch="$3" out="$4"
  mkdir -p "$(dirname "$out")"
  (cd "$src" && CGO_ENABLED=0 GOTOOLCHAIN="$TOOLCHAIN" GOFLAGS=-mod=mod GOOS="$goos" GOARCH="$goarch" \
     go build -trimpath -o "$out" ./src) || die "core build failed for $goos/$goarch"
  log "built $out"
}
# eniactk: one file of standard-library Go, static like the core (O3).
build_eniactk() { # <srcroot> <goos> <goarch> <out>
  local src="$1" goos="$2" goarch="$3" out="$4"
  mkdir -p "$(dirname "$out")"
  (cd "$src" && CGO_ENABLED=0 GOTOOLCHAIN="$TOOLCHAIN" GOFLAGS=-mod=mod GOOS="$goos" GOARCH="$goarch" \
     go build -trimpath -o "$out" ./vis/eniactk.go) || die "eniactk build failed for $goos/$goarch"
  log "built $out"
}
build_core "$BUILD/upstream" darwin arm64 "$BUILD/darwin-arm64/eniac-core"
build_core "$BUILD/upstream" linux arm64 "$BUILD/linux-arm64/eniac-core"
build_core "$BUILD/upstream" linux amd64 "$BUILD/linux-amd64/eniac-core"
build_eniactk "$BUILD/upstream" darwin arm64 "$BUILD/darwin-arm64/eniactk"
build_eniactk "$BUILD/upstream" linux arm64 "$BUILD/linux-arm64/eniactk"
build_eniactk "$BUILD/upstream" linux amd64 "$BUILD/linux-amd64/eniactk"
if [ "$DO_UNPATCHED" = 1 ]; then
  HOSTOS="$(GOTOOLCHAIN="$TOOLCHAIN" go env GOHOSTOS)"; HOSTARCH="$(GOTOOLCHAIN="$TOOLCHAIN" go env GOHOSTARCH)"
  build_core "$BUILD/upstream-unpatched" "$HOSTOS" "$HOSTARCH" "$BUILD/unpatched/eniac-core"
fi
log "done"
