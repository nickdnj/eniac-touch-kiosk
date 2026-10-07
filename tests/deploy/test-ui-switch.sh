#!/usr/bin/env bash
# The kiosk session's Original UI switch loop (docs/original-ui-switch.md
# 5.1, 8), without X: deploy/kiosk/kiosk-session runs with a stub Chromium,
# a stub original-ui supervisor, stub X tools and a stub bridge port, and
# the switch directory in a temp dir (KIOSK_UI_DIR, KIOSK_ORIGINAL_UI,
# KIOSK_BROWSER). Checks:
#   0. a new session clears a previous session's active marker and request
#   1. a fresh request closes Chromium within 2 s and starts the supervisor
#      with the request's mode and limits; `active` exists while it runs
#   2. supervisor exit 10 -> last has cause=idle, mode/active removed,
#      Chromium back with no 3 s pause
#   3. a stale request is deleted and Chromium keeps running
#   4. a malformed request is deleted and Chromium keeps running
#   5. deleting the request while the supervisor runs -> cause=remote
#   6. supervisor exit 20 (failed preflight) -> cause=failed, Chromium back
#
# Needs bash 4+ and setsid (Linux). On a Mac (bash 3.2, no setsid) it
# re-runs itself in an ubuntu:24.04 container if docker is there, and
# otherwise says SKIP.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if [ "${BASH_VERSINFO[0]}" -lt 4 ] || ! command -v setsid >/dev/null; then
  if [ -z "${UI_SWITCH_IN_CONTAINER:-}" ] && command -v docker >/dev/null && docker info >/dev/null 2>&1; then
    echo "test-ui-switch: bash ${BASH_VERSION} / no setsid here; running in ubuntu:24.04 (docker)"
    exec docker run --rm --platform linux/amd64 -e UI_SWITCH_IN_CONTAINER=1 -v "$ROOT:/repo:ro" ubuntu:24.04 \
      bash /repo/tests/deploy/test-ui-switch.sh
  fi
  echo "test-ui-switch: SKIP (needs bash 4+ and setsid, or docker)"
  exit 0
fi

T="$(mktemp -d "${TMPDIR:-/tmp}/ui-switch.XXXXXX")"
UI="$T/ui"; STUB="$T/stub"; XDG="$T/xdg"
mkdir -p "$UI" "$STUB" "$XDG"
PASS=0 FAIL=0
pass() { echo "PASS $*"; PASS=$((PASS + 1)); }
failt() { echo "FAIL $*"; FAIL=$((FAIL + 1)); }
SESSION="" BRIDGE=""
# shellcheck disable=SC2329
cleanup() {
  [ -n "$SESSION" ] && kill -TERM -- "-$SESSION" 2>/dev/null
  [ -n "$BRIDGE" ] && kill "$BRIDGE" 2>/dev/null
  sleep 0.3
  [ -n "$SESSION" ] && kill -KILL -- "-$SESSION" 2>/dev/null
  rm -rf -- "$T"
}
trap cleanup EXIT

# --- stubs -------------------------------------------------------------------
for x in xset xsetroot unclutter; do printf '#!/bin/sh\nexit 0\n' > "$STUB/$x"; done
cat > "$STUB/chromium" <<EOF
#!/bin/sh
echo "\$\$ \$*" >> "$T/browser.log"
exec sleep 600
EOF
cat > "$STUB/original-ui" <<EOF
#!/bin/bash
echo "\$*" >> "$T/sup.args"
case "\$(cat "$T/sup.behave" 2>/dev/null)" in
  idle) sleep 2; exit 10 ;;
  failed) exit 20 ;;
  *) exec sleep 600 ;;
esac
EOF
chmod 0755 "$STUB"/*

# A bridge port that accepts connections (the session waits for it).
PORT=$((20000 + RANDOM % 20000))
perl -MIO::Socket::INET -e '$s=IO::Socket::INET->new(Listen=>5,LocalAddr=>"127.0.0.1:'"$PORT"'",ReuseAddr=>1) or die "listen: $!"; while($c=$s->accept){close $c}' &
BRIDGE=$!

# Leftovers of a previous session (check 0).
echo "mode=tour id=deadbeef since=1" > "$UI/active"
echo "mode=tour id=deadbeef at=$(date +%s) idleS=300 warnS=30 ttlS=10 door=visitor" > "$UI/mode"

PATH="$STUB:$PATH" KIOSK_UI_DIR="$UI" KIOSK_ORIGINAL_UI="$STUB/original-ui" KIOSK_BROWSER="$STUB/chromium" \
  KIOSK_URL="http://127.0.0.1:$PORT/" KIOSK_ENV_FILE=/nonexistent XDG_RUNTIME_DIR="$XDG" KIOSK_LOG=stderr \
  setsid bash "$ROOT/deploy/kiosk/kiosk-session" 2> "$T/session.log" &
SESSION=$!

# --- helpers -------------------------------------------------------------------
# until_ <seconds> <command...>: poll every 0.1 s.
until_() {
  local n=$(( $1 * 10 )); shift
  while [ "$n" -gt 0 ]; do "$@" && return 0; sleep 0.1; n=$((n - 1)); done
  return 1
}
browsers() { [ -f "$T/browser.log" ] && wc -l < "$T/browser.log" || echo 0; }
browser_pid() { tail -n 1 "$T/browser.log" | cut -d' ' -f1; }
alive() { kill -0 "$1" 2>/dev/null; }
dead() { ! kill -0 "$1" 2>/dev/null; }
count_is() { [ "$(browsers)" -eq "$1" ]; }
has() { [ -e "$UI/$1" ]; }
hasnt() { [ ! -e "$UI/$1" ]; }
request() { # <mode> <id> <age-s> [door]
  echo "mode=$1 id=$2 at=$(( $(date +%s) - $3 )) idleS=300 warnS=30 ttlS=10 door=${4:-visitor}" > "$UI/mode.tmp"
  mv -f "$UI/mode.tmp" "$UI/mode"
}

# --- 0 -------------------------------------------------------------------------
if until_ 10 count_is 1; then pass "Chromium starts"; else failt "Chromium never started"; cat "$T/session.log"; exit 1; fi
if hasnt active && hasnt mode && [ ! -f "$T/sup.args" ]; then pass "0: the previous session's active marker and request are cleared"; else failt "0: leftovers not cleared"; fi

# --- 1 + 2 ---------------------------------------------------------------------
echo idle > "$T/sup.behave"
B1="$(browser_pid)"
request tour 3f9a1c2e 0
t0=$(date +%s)
if until_ 3 dead "$B1"; then pass "1: a fresh request closes Chromium ($(( $(date +%s) - t0 )) s)"; else failt "1: Chromium still running 3 s after the request"; fi
if until_ 2 test -f "$T/sup.args" && grep -qx -- "--mode tour --idle-s 300 --warn-s 30" "$T/sup.args"; then pass "1: supervisor started with --mode tour --idle-s 300 --warn-s 30"; else failt "1: supervisor args: $(cat "$T/sup.args" 2>/dev/null)"; fi
if has active && grep -q '^mode=tour id=3f9a1c2e since=[0-9]*$' "$UI/active"; then pass "1: active written while it runs"; else failt "1: no active file"; fi
if until_ 6 has last; then
  tl=$(date +%s)
  if grep -qx "mode=tour door=visitor id=3f9a1c2e cause=idle durS=[0-9]*" "$UI/last"; then pass "2: last says cause=idle ($(cat "$UI/last"))"; else failt "2: last is '$(cat "$UI/last")'"; fi
  if hasnt mode && hasnt active; then pass "2: mode and active removed"; else failt "2: mode/active left behind"; fi
  if until_ 3 count_is 2; then pass "2: Chromium back $(( $(date +%s) - tl )) s after the original UI ended (no 3 s pause)"; else failt "2: Chromium not restarted"; fi
else
  failt "2: no last file"
fi
rm -f "$UI/last"

# --- 3 -------------------------------------------------------------------------
B2="$(browser_pid)"
request tour 0badc0de 60
if until_ 3 hasnt mode; then pass "3: a stale request is deleted"; else failt "3: stale request still there"; fi
sleep 1.5
if alive "$B2" && count_is 2 && [ "$(wc -l < "$T/sup.args")" -eq 1 ]; then pass "3: Chromium keeps running, no original UI"; else failt "3: the stale request fired"; fi

# --- 4 -------------------------------------------------------------------------
echo 'mode=tour; xterm -e sh id=12345678 at=1 idleS=300 warnS=30 ttlS=10 door=staff' > "$UI/mode"
if until_ 3 hasnt mode; then pass "4: a malformed request is deleted"; else failt "4: malformed request still there"; fi
if alive "$B2" && count_is 2; then pass "4: Chromium keeps running"; else failt "4: Chromium disturbed"; fi
if grep -q 'malformed request removed' "$T/session.log"; then pass "4: logged"; else failt "4: not logged"; fi

# --- 5 -------------------------------------------------------------------------
echo wait > "$T/sup.behave"
request interactive abcdef01 0 staff
if until_ 4 has active; then pass "5: interactive running"; else failt "5: interactive never started"; fi
if [ "$(tail -n 1 "$T/sup.args")" = "--mode interactive --idle-s 300 --warn-s 30" ]; then pass "5: supervisor args for interactive"; else failt "5: args $(tail -n 1 "$T/sup.args")"; fi
rm -f "$UI/mode"
if until_ 5 has last && grep -qx "mode=interactive door=staff id=abcdef01 cause=remote durS=[0-9]*" "$UI/last"; then pass "5: withdrawn -> cause=remote"; else failt "5: last is '$(cat "$UI/last" 2>/dev/null)'"; fi
if until_ 3 count_is 3; then pass "5: Chromium back"; else failt "5: Chromium not back"; fi
# The stub supervisor became `sleep 600`, like the stub Chromium: only Chromium's may be left.
if [ "$(pgrep -fc '^sleep 600$' || true)" -eq 1 ]; then pass "5: the supervisor's process group is gone"; else failt "5: $(pgrep -fa '^sleep 600$')"; fi
rm -f "$UI/last"

# --- 6 -------------------------------------------------------------------------
echo failed > "$T/sup.behave"
request tour 12345678 0
if until_ 5 has last && grep -qx "mode=tour door=visitor id=12345678 cause=failed durS=[0-9]*" "$UI/last"; then pass "6: preflight failure -> cause=failed"; else failt "6: last is '$(cat "$UI/last" 2>/dev/null)'"; fi
if until_ 3 count_is 4; then pass "6: Chromium back"; else failt "6: Chromium not back"; fi

echo
echo "test-ui-switch: $PASS passed, $FAIL failed"
if [ "$FAIL" -gt 0 ]; then echo "--- session log"; cat "$T/session.log"; exit 1; fi
