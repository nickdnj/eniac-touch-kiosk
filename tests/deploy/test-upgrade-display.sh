#!/usr/bin/env bash
# install.sh must restart a live display after an upgrade, because the running
# kiosk-session was started from the release the installer then prunes (the
# Original room tour failed with "No such file" after the 2026-10-17 update).
# Extracts needs_display_restart() from install.sh and runs it with a stub
# pgrep. Cases: upgrade+X up -> restart; upgrade+no X, first install,
# same-release reinstall -> no restart. Also checks the call is wired in.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
INSTALL="$ROOT/deploy/kiosk/install.sh"
PASS=0 FAIL=0
ok() { echo "PASS $*"; PASS=$((PASS + 1)); }
no() { echo "FAIL $*"; FAIL=$((FAIL + 1)); }

fn="$(sed -n '/^# --- display-restart rule/,/^# --- end display-restart rule/p' "$INSTALL")"
[ -n "$fn" ] || { echo "FAIL: display-restart rule not found in install.sh"; exit 1; }
KIOSK_USER=eniac-kiosk
X_UP=0
pgrep() { [ "$X_UP" = 1 ]; }
eval "$fn"

check() {  # name, expect(0|1), old, new, x_up
  local name=$1 want=$2 old=$3 new=$4
  X_UP=$5
  if needs_display_restart "$old" "$new"; then got=0; else got=1; fi
  if [ "$got" = "$want" ]; then ok "$name"; else no "$name (wanted exit $want, got $got)"; fi
}
check "upgrade with X running restarts the display" 0 "releases/A" "B" 1
check "upgrade with no X running does not"          1 "releases/A" "B" 0
check "first install (no current) does not"        1 ""           "B" 1
check "reinstall of the same release does not"      1 "releases/B" "B" 1

if grep -q 'needs_display_restart "\$old" "\$VER"' "$INSTALL" && grep -A2 'needs_display_restart "\$old"' "$INSTALL" | grep -q 'restart-display'; then
  ok "install.sh calls restart-display when the rule says so"
else
  no "install.sh does not call restart-display from the rule"
fi
echo "test-upgrade-display: $PASS passed, $FAIL failed"
[ "$FAIL" = 0 ]
