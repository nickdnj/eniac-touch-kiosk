#!/usr/bin/env bash
# Remove the ENIAC touch kiosk from a dedicated machine (FR-81/82 spirit:
# removal is one command, removes exactly what the installer added, verifies
# nothing is left and reports what it removed).
#
#   sudo eniac-touch-kiosk-uninstall [--purge-packages] [--keep-data]
#   (same file as uninstall.sh at the top of a release directory)
#
#   --purge-packages  also purge the apt packages the installer newly
#                     installed (from the manifest), after a simulation shows
#                     nothing else would go. Without it they are listed only.
#   --keep-data       keep /var/lib/eniac-touch-kiosk (visitor metrics).
#
# Works without the manifest too (a half-finished install): it then removes
# the canonical paths, and the two users only if they carry our signature.
# Never runs a blanket `apt autoremove`.
set -euo pipefail

main() {
PREFIX=/opt/eniac-touch-kiosk
ETC=/etc/eniac-touch-kiosk
STATE=/var/lib/eniac-touch-kiosk
RUN=/run/eniac-touch-kiosk
UI_DIR=/run/eniac-touch-kiosk-ui
MANIFEST=$PREFIX/INSTALL-MANIFEST
UNIT=eniac-touch-kiosk-bridge.service
SVC_USER=eniac
KIOSK_USER=eniac-kiosk
KIOSK_GECOS="ENIAC kiosk display"
CANON_FILES=("/etc/systemd/system/$UNIT"
             /etc/systemd/system/getty@tty1.service.d/eniac-touch-kiosk-autologin.conf
             /etc/apt/preferences.d/eniac-touch-kiosk-chromium
             /usr/local/bin/eniac-touch-kiosk
             /usr/local/sbin/eniac-touch-kiosk-uninstall
             /etc/tmpfiles.d/eniac-touch-kiosk.conf
             /etc/eniac-touch-kiosk/admin-pin)

die()  { echo "uninstall: ERROR: $*" >&2; exit 1; }
log()  { echo "uninstall: $*"; }
REMOVED=()
gone() { REMOVED+=("$1"); }

PURGE=0 KEEP_DATA=0
for a in "$@"; do
  case "$a" in
    --purge-packages) PURGE=1 ;;
    --keep-data) KEEP_DATA=1 ;;
    -h|--help) sed -n '2,17p' "$0"; exit 0 ;;
    *) die "unknown argument: $a (try --help)" ;;
  esac
done
[ "$(id -u)" -eq 0 ] || die "run with sudo"
[ -d /run/systemd/system ] && SYSTEMD=1 || SYSTEMD=0

# --- read the manifest -------------------------------------------------------
FILES=() APTFILES=() USERS=() PKGS=() DEFTARGET=""
if [ -f "$MANIFEST" ]; then
  log "using $MANIFEST"
  while read -r k v; do
    case "${k:-}" in
      file) FILES+=("$v") ;;
      apt-file) APTFILES+=("$v") ;;
      user) USERS+=("$v") ;;
      package) PKGS+=("$v") ;;
      default-target) DEFTARGET="$v" ;;
    esac
  done < "$MANIFEST"
else
  log "no manifest: falling back to the canonical path list"
  if getent passwd "$KIOSK_USER" | cut -d: -f5 | grep -qx "$KIOSK_GECOS"; then USERS+=("$KIOSK_USER"); fi
  if [ "$(getent passwd "$SVC_USER" | cut -d: -f6)" = /nonexistent ] && [ "$(id -u "$SVC_USER" 2>/dev/null || echo 9999)" -lt 1000 ]; then USERS+=("$SVC_USER"); fi
fi
FILES+=("${CANON_FILES[@]}")

# --- stop everything ---------------------------------------------------------
if [ "$SYSTEMD" = 1 ]; then
  if systemctl list-unit-files "$UNIT" >/dev/null 2>&1; then
    systemctl disable --now "$UNIT" >/dev/null 2>&1 || true
  fi
fi
# The autologin drop-in goes first, so when the kiosk session is ended below
# agetty respawns a normal login prompt instead of logging back in.
rm -f /etc/systemd/system/getty@tty1.service.d/eniac-touch-kiosk-autologin.conf
rmdir /etc/systemd/system/getty@tty1.service.d 2>/dev/null || true
[ "$SYSTEMD" = 1 ] && systemctl daemon-reload
if id -u "$KIOSK_USER" >/dev/null 2>&1 && pgrep -u "$KIOSK_USER" >/dev/null 2>&1; then
  log "ending the $KIOSK_USER session (X + Chromium)"
  loginctl terminate-user "$KIOSK_USER" 2>/dev/null || true
  pkill -TERM -u "$KIOSK_USER" 2>/dev/null || true
  for _ in 1 2 3 4 5; do pgrep -u "$KIOSK_USER" >/dev/null || break; sleep 1; done
  pkill -KILL -u "$KIOSK_USER" 2>/dev/null || true
  [ "$SYSTEMD" = 1 ] && systemctl restart getty@tty1.service 2>/dev/null || true
fi

# --- default target (before any package purge: systemctl must still exist) -
DT=/etc/systemd/system/default.target
if [ "$DEFTARGET" = "-" ]; then
  if [[ "$(readlink "$DT" 2>/dev/null)" == */multi-user.target ]]; then rm -f "$DT"; gone "$DT (back to the distro default target)"; fi
elif [ -n "$DEFTARGET" ] && command -v systemctl >/dev/null; then
  systemctl set-default "$DEFTARGET" && gone "default target (restored to $DEFTARGET)"
fi

# --- packages (before the PPA source goes, while apt still knows them) ------
INSTALLED_PKGS=()
for p in "${PKGS[@]}"; do
  dpkg-query -W -f='${db:Status-Status}' "$p" 2>/dev/null | grep -qx installed && INSTALLED_PKGS+=("$p")
done
if [ "${#INSTALLED_PKGS[@]}" -gt 0 ]; then
  if [ "$PURGE" = 1 ]; then
    log "simulating purge of ${#INSTALLED_PKGS[@]} packages the installer added"
    sim="$(apt-get -s purge "${INSTALLED_PKGS[@]}" 2>&1)" || die "apt simulation failed: $sim"
    extra="$(awk '/^(Purg|Remv) /{print $2}' <<<"$sim" | sort -u | comm -23 - <(printf '%s\n' "${INSTALLED_PKGS[@]}" | sort -u))"
    [ -z "$extra" ] || die "purging would also remove packages the installer did not add: ${extra//$'\n'/ }. Nothing purged; remove by hand if intended."
    DEBIAN_FRONTEND=noninteractive apt-get purge -y -q "${INSTALLED_PKGS[@]}"
    for p in "${INSTALLED_PKGS[@]}"; do gone "package $p"; done
  else
    log "the installer added ${#INSTALLED_PKGS[@]} apt packages; kept. To remove them too, re-run with --purge-packages"
  fi
fi

# --- files -------------------------------------------------------------------
for f in "${FILES[@]}" "${APTFILES[@]}"; do
  if [ -e "$f" ] || [ -L "$f" ]; then rm -f -- "$f"; gone "$f"; fi
done
[ "${#APTFILES[@]}" -gt 0 ] && command -v apt-get >/dev/null && { apt-get update -q >/dev/null 2>&1 || true; }
[ "$SYSTEMD" = 1 ] && { systemctl daemon-reload; systemctl reset-failed "$UNIT" 2>/dev/null || true; }

for d in "$ETC" "$RUN" "$UI_DIR"; do
  if [ -e "$d" ]; then rm -rf -- "$d"; gone "$d"; fi
done
if [ -e "$STATE" ]; then
  if [ "$KEEP_DATA" = 1 ]; then log "keeping $STATE (--keep-data)"; else rm -rf -- "$STATE"; gone "$STATE"; fi
fi
# /var/lib/private/... exists only if DynamicUser were used; it isn't.

# --- users (after their processes and files are gone) ------------------------
for u in "${USERS[@]}"; do
  id -u "$u" >/dev/null 2>&1 || continue
  if [ "$u" = "$KIOSK_USER" ]; then userdel -r "$u" 2>/dev/null || userdel -f -r "$u"; else userdel "$u"; fi
  getent group "$u" >/dev/null && groupdel "$u" 2>/dev/null || true
  gone "user $u"
done

# --- /opt last, the manifest last of all -------------------------------------
if [ -d "$PREFIX" ]; then
  find "$PREFIX" -mindepth 1 -maxdepth 1 ! -name INSTALL-MANIFEST -exec rm -rf -- {} +
  rm -f -- "$MANIFEST"
  rmdir "$PREFIX"
  gone "$PREFIX"
fi

# --- verify ------------------------------------------------------------------
left=()
for p in "$PREFIX" "$ETC" "$RUN" "$UI_DIR" "${FILES[@]}" "${APTFILES[@]}"; do [ -e "$p" ] || [ -L "$p" ] && left+=("$p"); done
[ "$KEEP_DATA" = 1 ] || { [ -e "$STATE" ] && left+=("$STATE"); }
for u in "${USERS[@]}"; do id -u "$u" >/dev/null 2>&1 && left+=("user $u"); done
if [ "$SYSTEMD" = 1 ] && systemctl cat "$UNIT" >/dev/null 2>&1; then left+=("unit $UNIT still loaded"); fi
pgrep -f "$PREFIX/" 2>/dev/null | grep -vqx "$$" && left+=("processes running from $PREFIX")

echo
log "removed:"
for r in "${REMOVED[@]}"; do echo "  - $r"; done
[ "${#REMOVED[@]}" -gt 0 ] || echo "  (nothing: the kiosk was not installed)"
if [ "$PURGE" = 0 ] && [ "${#INSTALLED_PKGS[@]}" -gt 0 ]; then
  log "kept apt packages (installed by the kiosk installer): ${INSTALLED_PKGS[*]}"
fi
if [ "${#left[@]}" -gt 0 ]; then
  log "LEFT BEHIND:"; for l in "${left[@]}"; do echo "  - $l"; done
  exit 1
fi
log "verified: nothing of the kiosk is left. Reboot to get a plain console login on tty1."
}

main "$@"
exit
