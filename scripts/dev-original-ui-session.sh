#!/usr/bin/env bash
# Dev stand-in for deploy/kiosk/kiosk-session's Original UI turn, for the Mac (make dev-original).
# Watches build/ui/mode, which the bridge writes when someone taps the Explore "Original room tour"
# tile (or staff Original UI), then runs the real supervisor deploy/kiosk/original-ui: Brian's Tk
# window on our core plus the "Back to kiosk" button. When it ends it writes build/ui/last and clears
# the request, as the kiosk session does. There is no Chromium to close here: your browser tab stays
# on the "Starting the room tour..." screen until the tour ends.
# macOS cannot host Stuart's Tk window (Aqua Tk spins on eniactk's `update` handshake and beachballs), so by default
# the stand-in runs only the "Back to kiosk" button: the whole web flow (tile, confirm, switching screen, return) is
# real, the Tk picture is not. DEV_REAL_TK=1 tries the real supervisor anyway. What the original looks like on Linux:
# docs/original-ui-switch.md; screenshots from a container under Xvfb in build/tk-shots.
# Needs Tk 8.6 wish (KIOSK_WISH, default the first wish8.6/wish on PATH) and build/darwin-arm64/{eniac-core,eniactk}.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
UI="$ROOT/build/ui"
OUI="$ROOT/build/original-ui"
export KIOSK_CORE="$ROOT/build/darwin-arm64/eniac-core"
export KIOSK_OUI_DIR="$OUI"
export KIOSK_WISH="${KIOSK_WISH:-$(command -v wish8.6 || command -v wish)}"
log() { echo "dev-original-ui: $*" >&2; }

[ -x "$KIOSK_CORE" ] && [ -x "$ROOT/build/darwin-arm64/eniactk" ] || { log "build the core and eniactk first (make; build/darwin-arm64)"; exit 1; }
mkdir -p "$UI" "$OUI/bin"
ln -sfn "$ROOT/build/darwin-arm64/eniactk" "$OUI/bin/eniactk"
ln -sfn "$ROOT/build/upstream/images" "$OUI/images"
ln -sfn "$ROOT/build/upstream/programs" "$OUI/programs"
ln -sfn "$ROOT/build/upstream/demo.card" "$OUI/demo.card"
rm -f "$UI"/mode "$UI"/active "$UI"/last "$UI"/*.tmp
log "ready: wish=$KIOSK_WISH; waiting for a request in $UI/mode"

field() { tr ' ' '\n' < "$UI/mode" 2>/dev/null | sed -n "s/^$1=//p"; }
write() { printf '%s\n' "$2" > "$UI/$1.tmp" && mv -f "$UI/$1.tmp" "$UI/$1"; }
trap 'kill 0 2>/dev/null' EXIT

while sleep 1; do
  [ -f "$UI/mode" ] || continue
  mode="$(field mode)"; id="$(field id)"; at="$(field at)"; idle="$(field idleS)"; warn="$(field warnS)"; ttl="$(field ttlS)"; door="$(field door)"
  if [ -z "$mode" ] || [ -z "$id" ] || [ -z "$at" ]; then rm -f "$UI/mode"; continue; fi
  age=$(( $(date +%s) - at ))
  if [ "$age" -lt 0 ] || [ "$age" -gt "${ttl:-10}" ]; then log "stale request $id ignored"; rm -f "$UI/mode"; continue; fi
  started="$(date +%s)"
  write active "mode=$mode id=$id since=$started"
  log "starting the original UI ($mode, $id)"
  if [ "${DEV_REAL_TK:-0}" = 1 ]; then
    python3 -c 'import os,sys; os.setsid(); os.execv(sys.argv[1], sys.argv[1:])' "$ROOT/deploy/kiosk/original-ui" --mode "$mode" --idle-s "$idle" --warn-s "$warn" &
  else
    python3 -c 'import os,sys; os.setsid(); os.execv(sys.argv[1], sys.argv[1:])' "$KIOSK_WISH" "$ROOT/deploy/kiosk/original-ui-back.tcl" --idle-s "$idle" --warn-s "$warn" &
  fi
  opid=$!
  while kill -0 "$opid" 2>/dev/null; do
    sleep 1
    [ "$(field id)" = "$id" ] || { log "request withdrawn; closing"; kill -TERM "$opid" 2>/dev/null; break; }
  done
  wait "$opid"; rc=$?
  kill -TERM -- "-$opid" 2>/dev/null; sleep 1; kill -KILL -- "-$opid" 2>/dev/null
  case "$rc" in 0) cause=tap ;; 10) cause=idle ;; 143|137) cause=remote ;; *) cause=failed ;; esac
  write last "mode=$mode door=$door id=$id cause=$cause durS=$(( $(date +%s) - started ))"
  rm -f "$UI/mode" "$UI/active"
  log "ended ($cause, rc $rc)"
done
