#!/usr/bin/env bash
# Install -> check -> re-install -> run -> uninstall in a throwaway
# ubuntu:24.04 container for the release's arch (amd64 by default; on an
# Apple-silicon Mac it runs emulated, so expect ~10-20 min). Needs docker and
# network (apt + the xtradeb PPA). Not part of `make test`.
#
#   tests/deploy/test-install-container.sh [dist/eniac-touch-kiosk-...-linux-amd64.tar.gz] [outdir]
#
# What a container cannot test is listed at the top of in-container.sh.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck disable=SC2012
TARBALL="${1:-$(ls -t "$ROOT"/dist/eniac-touch-kiosk-*-linux-amd64.tar.gz 2>/dev/null | head -1)}"
OUT="${2:-$ROOT/build/deploy-test}"
[ -f "$TARBALL" ] || { echo "no release tarball; run: make release ARCH=amd64" >&2; exit 1; }
case "$TARBALL" in *-linux-amd64.tar.gz) PLAT=linux/amd64 ;; *-linux-arm64.tar.gz) PLAT=linux/arm64 ;; *) echo "can't tell arch of $TARBALL" >&2; exit 1 ;; esac
NAME="eniac-kiosk-install-test-$$"
mkdir -p "$OUT"
# shellcheck disable=SC2012,SC2329
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run -d --platform "$PLAT" --name "$NAME" ubuntu:24.04 sleep 7200 >/dev/null
docker cp "$TARBALL" "$NAME:/root/release.tar.gz"
docker cp "$ROOT/tests/deploy/in-container.sh" "$NAME:/root/in-container.sh"
rc=0
docker exec "$NAME" bash /root/in-container.sh /root/release.tar.gz 2>&1 | tee "$OUT/container-test.log" || true
rc=${PIPESTATUS[0]}
docker cp "$NAME:/tmp/kiosk-1920x1080.png" "$OUT/" 2>/dev/null || true
for f in install1.log install2.log uninstall.log bridge.log diff.txt; do docker cp "$NAME:/tmp/$f" "$OUT/" 2>/dev/null || true; done
echo "logs and screenshot in $OUT"
grep -c '^PASS' "$OUT/container-test.log" | sed 's/^/passed: /'
grep '^FAIL' "$OUT/container-test.log" || echo "no failures"
exit "$rc"
