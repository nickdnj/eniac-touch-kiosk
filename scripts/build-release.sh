#!/usr/bin/env bash
# Assemble a kiosk release tarball for one CPU (architecture 10.1, dev-plan #25).
#
#   scripts/build-release.sh arm64|amd64      (normally via: make release ARCH=...)
#
# Expects `make web`, `scripts/fetch-upstream.sh` and `make bridge-linux
# ARCH=<a>` to have run (the `release` target does all three). Produces
#
#   dist/eniac-touch-kiosk-<ver>-linux-<arch>.tar.gz   (+ .sha256)
#
# containing one top-level directory:
#
#   bin/{eniac-bridge,eniac-core}   static linux binaries
#   web/ missions/                  production UI bundle, mission files
#   upstream/                       core cwd: programs/, *.card, .provenance.json
#   original-ui/                    Stuart's Tk front end for the Original UI switch:
#                                   bin/eniactk, images/ (ORIGINAL_UI_WIDTHS + sprites),
#                                   programs -> ../upstream/programs, *.card links
#   deploy/kiosk/ deploy/chromium/  installer payload (units, X session, flags)
#   install.sh uninstall.sh         the dedicated-kiosk installer (deploy/kiosk)
#   BUILD-INFO SHA256SUMS
#
# Unsigned (signing is M3); "unsigned=1" in BUILD-INFO says so.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$ROOT/build"
DIST="$ROOT/dist"
die() { echo "build-release: ERROR: $*" >&2; exit 1; }
log() { echo "build-release: $*" >&2; }

ARCH="${1:-}"
case "$ARCH" in arm64|amd64) ;; *) die "usage: $0 arm64|amd64" ;; esac
BASE_VERSION="${VERSION:-0.1.0-dev}"
GIT_SHA="$(git -C "$ROOT" rev-parse --short=10 HEAD 2>/dev/null || echo nogit)"
DIRTY=""
git -C "$ROOT" diff --quiet HEAD -- 2>/dev/null || DIRTY=".dirty"
VER="${BASE_VERSION}+g${GIT_SHA}${DIRTY}"
# Release directory names end up in paths the core sees: no spaces, no '/'.
[[ "$VER" =~ ^[A-Za-z0-9._+-]+$ ]] || die "bad version string: $VER"

BRIDGE_BIN="$BUILD/linux-$ARCH/eniac-bridge"
CORE_BIN="$BUILD/linux-$ARCH/eniac-core"
ENIACTK_BIN="$BUILD/linux-$ARCH/eniactk"
UP="$BUILD/upstream"
# eniactk image widths shipped (docs/original-ui-switch.md ADR-OUI-9): 1900
# for the 1920x1080 panel, 1280 for a 1366x768 one. The supervisor refuses to
# start (back to Chromium) on a screen that needs a width not shipped.
ORIGINAL_UI_WIDTHS="${ORIGINAL_UI_WIDTHS:-1280 1900}"
for f in "$BRIDGE_BIN" "$CORE_BIN" "$ENIACTK_BIN" "$UP/.provenance.json" "$BUILD/web/app.js" "$BUILD/web/index.html"; do
  [ -e "$f" ] || die "missing $f (run: make release ARCH=$ARCH)"
done

# The binaries must really be for the target CPU.
case "$ARCH" in amd64) want='x86-64' ;; arm64) want='ARM aarch64' ;; esac
for b in "$BRIDGE_BIN" "$CORE_BIN" "$ENIACTK_BIN"; do
  file "$b" | grep -q "ELF 64-bit.*$want.*statically linked" || die "$b is not a static linux/$ARCH ELF: $(file -b "$b")"
done

# Production bundle guard: the dev-only ?mission= shortcut is compiled out
# (__DEV__=false), so the bundle must not mention the dev shortcut at all.
if grep -q '__DEV__' "$BUILD/web/app.js"; then die "build/web/app.js still references __DEV__ (dev build?)"; fi

NAME="eniac-touch-kiosk-${VER}-linux-${ARCH}"
STAGE="$BUILD/release/$NAME"
rm -rf -- "$BUILD/release" && mkdir -p "$STAGE"/{bin,upstream,deploy}

install -m 0755 "$BRIDGE_BIN" "$CORE_BIN" "$STAGE/bin/"
cp -R "$BUILD/web" "$STAGE/web"
mkdir -p "$STAGE/missions" && cp "$ROOT"/missions/*.yaml "$STAGE/missions/"

# Core runtime files (architecture 4.3): programs/ and the cards, which the
# programs open relative to the core's cwd (U6). images/ obj/ src/ vis/ doc/
# are never shipped.
cp -R "$UP/programs" "$STAGE/upstream/programs"
cp "$UP"/*.card "$UP/.provenance.json" "$STAGE/upstream/"

# The Original UI (docs/original-ui-switch.md 7.2): eniactk looks for
# images/ and programs/ in its cwd (original-ui/), and trajdemo.e reads
# demo.card from there too. Programs and cards are links into upstream/, so
# the core and Stuart's front end load the very same files.
OUI="$STAGE/original-ui"
mkdir -p "$OUI/bin" "$OUI/images"
install -m 0755 "$ENIACTK_BIN" "$OUI/bin/eniactk"
imgs=(control.ppm orange.ppm orange2.ppm orange3.ppm gpilot.ppm apilot.ppm)
for w in $ORIGINAL_UI_WIDTHS; do imgs+=("e$w.ppm" "e${w}s1.ppm" "e${w}s2.ppm" "e${w}s3.ppm" "e${w}s4.ppm" "e${w}s5.ppm"); done
for f in "${imgs[@]}"; do
  [ -f "$UP/images/$f" ] || die "missing $UP/images/$f (ORIGINAL_UI_WIDTHS=$ORIGINAL_UI_WIDTHS)"
  install -m 0644 "$UP/images/$f" "$OUI/images/$f"
done
ln -s ../upstream/programs "$OUI/programs"
for c in "$UP"/*.card; do ln -s "../upstream/$(basename "$c")" "$OUI/$(basename "$c")"; done
[ -e "$OUI/programs/trajdemo.e" ] && [ -e "$OUI/demo.card" ] || die "original-ui/ links do not resolve (programs/trajdemo.e, demo.card)"

cp -R "$ROOT/deploy/kiosk" "$ROOT/deploy/chromium" "$STAGE/deploy/"
install -m 0755 "$ROOT/deploy/kiosk/install.sh" "$STAGE/install.sh"
install -m 0755 "$ROOT/deploy/kiosk/uninstall.sh" "$STAGE/uninstall.sh"
chmod 0755 "$STAGE/deploy/kiosk/original-ui" "$STAGE/deploy/kiosk/kiosk-session"

# Forbidden content (dev-plan #25): fakecore, test fixtures, dev configs.
bad="$(cd "$STAGE" && find . \( -path '*fakecore*' -o -path '*fixture*' -o -name 'config.dev.yaml' -o -name '*.test.ts' -o -name node_modules \) -print)"
[ -z "$bad" ] || die "release contains test/dev artifacts: $bad"

# Every mission must validate against exactly the runtime files we ship.
TMPCFG="$BUILD/release/check.yaml"
printf 'profile: dev\npaths:\n  release: %s\n  core: %s\n' "$STAGE" "$BUILD/$(go env GOHOSTOS)-$(go env GOHOSTARCH)/eniac-core" > "$TMPCFG"
(cd "$ROOT/src/bridge" && go run ./cmd/eniac-bridge mission check --config "$TMPCFG" "$STAGE"/missions/*.yaml) \
  || die "mission check against the staged release failed"
rm -f "$TMPCFG"

UPSTREAM_COMMIT="$(sed -n 's/^COMMIT=//p' "$ROOT/upstream.lock")"
cat > "$STAGE/BUILD-INFO" <<EOF
version=$VER
arch=$ARCH
git=$GIT_SHA$DIRTY
upstream=$UPSTREAM_COMMIT
built=$(date -u +%Y-%m-%dT%H:%M:%SZ)
unsigned=1
originalUi=1
originalUiWidths=${ORIGINAL_UI_WIDTHS// /,}
EOF

SUMS="$BUILD/release/SHA256SUMS.tmp"
(cd "$STAGE" && find . -type f | LC_ALL=C sort | sed 's|^\./||' | xargs shasum -a 256) > "$SUMS"
mv "$SUMS" "$STAGE/SHA256SUMS"

mkdir -p "$DIST"
OUT="$DIST/$NAME.tar.gz"
# Owner root:root inside the tarball; COPYFILE_DISABLE stops macOS ._ files.
COPYFILE_DISABLE=1 tar -C "$BUILD/release" --uid 0 --gid 0 --uname root --gname root -czf "$OUT" "$NAME" 2>/dev/null \
  || COPYFILE_DISABLE=1 tar -C "$BUILD/release" --owner 0 --group 0 -czf "$OUT" "$NAME"
(cd "$DIST" && shasum -a 256 "$NAME.tar.gz" > "$NAME.tar.gz.sha256")
log "wrote $OUT ($(du -h "$OUT" | cut -f1))"
echo "$OUT"
