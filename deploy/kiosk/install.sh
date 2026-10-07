#!/usr/bin/env bash
# Install the ENIAC touch kiosk onto a DEDICATED machine (docs/deploy-x86.md).
#
#   tar xzf eniac-touch-kiosk-<ver>-linux-<arch>.tar.gz
#   cd eniac-touch-kiosk-<ver>-linux-<arch>
#   sudo ./install.sh [--no-packages] [--no-start] [--force] [--no-pin] [--offline-repo=DIR]
#
# Primary target: Ubuntu 24.04 amd64 (Dell OptiPlex mini PC). Also: Debian /
# Raspberry Pi OS arm64 (Pi 5). Run it from the unpacked release directory,
# over SSH or on the console. Safe to re-run: a second run with the same
# release changes nothing; a run with a newer release installs it beside the
# old one and moves the `current` / `previous` symlinks (one-step rollback).
#
# What it does (each item is recorded in /opt/eniac-touch-kiosk/INSTALL-MANIFEST
# so deploy/kiosk/uninstall.sh can remove exactly that, FR-81/82):
#   - apt: X11 (no desktop), openbox, unclutter, xinput, tk (wish, for the
#     original UI), and a NON-snap
#     Chromium .deb (Ubuntu: xtradeb PPA, pinned to Chromium only; Debian /
#     Pi OS: the distro package). Every newly installed package is recorded.
#   - users: `eniac` (system, no login) runs the bridge; `eniac-kiosk`
#     (no sudo, password locked) owns the X session on tty1.
#   - /opt/eniac-touch-kiosk/releases/<ver> + current/previous symlinks
#   - /etc/eniac-touch-kiosk/{config.yaml,config.yaml.dist,session.env}; an
#     existing config.yaml without an originalUi: block gets it appended once
#   - /etc/tmpfiles.d/eniac-touch-kiosk.conf: /run/eniac-touch-kiosk-ui, the
#     Original UI switch directory (2770 eniac:eniac-kiosk)
#   - the staff PIN: prompted for (eniac-touch-kiosk set-pin) only on a
#     terminal and only if none is set; --no-pin skips it. No default PIN.
#   - eniac-touch-kiosk-bridge.service (enabled, Restart=always)
#   - tty1 autologin -> startx -> kiosk-session -> Chromium --kiosk
#   - default target multi-user.target (the old value is recorded/restored)
#   - /usr/local/bin/eniac-touch-kiosk, /usr/local/sbin/eniac-touch-kiosk-uninstall
#
# --offline-repo=DIR: take every package from a local apt repository (a
# directory with Packages + Release, built by scripts/make-install-stick.sh)
# instead of the network: no apt-get update against Ubuntu, no PPA. Used by the
# one-stick install so the floor box needs no network. Nothing about the
# local repo is left in /etc/apt afterwards.
#
# The only secret is the staff PIN's bcrypt hash (/etc/eniac-touch-kiosk/admin-pin,
# 0640 root:eniac), never the PIN itself. BIOS settings ("Restore on AC Power Loss ->
# Power On") cannot be set from here; the closing message says so.
set -euo pipefail

PREFIX=/opt/eniac-touch-kiosk
ETC=/etc/eniac-touch-kiosk
STATE=/var/lib/eniac-touch-kiosk
MANIFEST=$PREFIX/INSTALL-MANIFEST
UNIT=eniac-touch-kiosk-bridge.service
UNIT_PATH=/etc/systemd/system/$UNIT
GETTY_DROPIN_DIR=/etc/systemd/system/getty@tty1.service.d
GETTY_DROPIN=$GETTY_DROPIN_DIR/eniac-touch-kiosk-autologin.conf
APT_PIN=/etc/apt/preferences.d/eniac-touch-kiosk-chromium
WRAPPER=/usr/local/bin/eniac-touch-kiosk
UNINSTALLER=/usr/local/sbin/eniac-touch-kiosk-uninstall
SVC_USER=eniac
KIOSK_USER=eniac-kiosk
TMPFILES=/etc/tmpfiles.d/eniac-touch-kiosk.conf
UI_DIR=/run/eniac-touch-kiosk-ui
PPA=ppa:xtradeb/apps
MIN_FREE_MB=300

HERE="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
# Run from the release root (./install.sh) or from deploy/kiosk/ inside it.
[ -f "$HERE/BUILD-INFO" ] || { [ -f "$HERE/../../BUILD-INFO" ] && HERE="$(cd "$HERE/../.." && pwd)"; }

die()  { echo "install: ERROR: $*" >&2; exit 1; }
log()  { echo "install: $*"; }
warn() { echo "install: WARNING: $*" >&2; }

DO_PACKAGES=1 DO_START=1 FORCE=0 OFFLINE_REPO="" DO_PIN=1
for a in "$@"; do
  case "$a" in
    --offline-repo=*) OFFLINE_REPO="${a#--offline-repo=}" ;;   # local apt repo, no network
    --no-packages) DO_PACKAGES=0 ;;   # offline re-install: packages already present
    --no-start)    DO_START=0 ;;      # write everything, enable/start nothing
    --force)       FORCE=1 ;;         # skip the OS-version and tty1 drop-in checks
    --no-pin)      DO_PIN=0 ;;        # don't prompt for the staff PIN (set it later: set-pin)
    -h|--help)     sed -n '2,42p' "$0"; exit 0 ;;
    *) die "unknown argument: $a (try --help)" ;;
  esac
done

# ---------------------------------------------------------------------------
# Preflight: read-only. Aborts before changing anything.
# ---------------------------------------------------------------------------
[ "$(id -u)" -eq 0 ] || die "run with sudo"
[ -f "$HERE/BUILD-INFO" ] && [ -x "$HERE/bin/eniac-bridge" ] && [ -x "$HERE/bin/eniac-core" ] \
  || die "run this from an unpacked release directory (BUILD-INFO and bin/ not found in $HERE)"
binfo() { sed -n "s/^$1=//p" "$HERE/BUILD-INFO"; }
VER="$(binfo version)"; RARCH="$(binfo arch)"
[[ "$VER" =~ ^[A-Za-z0-9._+-]+$ ]] || die "bad version in BUILD-INFO: '$VER'"

log "verifying release $VER ($RARCH) checksums"
(cd "$HERE" && sha256sum --quiet -c SHA256SUMS) || die "SHA256SUMS mismatch: the release is damaged; re-copy the tarball"

DARCH="$(dpkg --print-architecture 2>/dev/null || uname -m)"
[ "$DARCH" = "$RARCH" ] || die "this release is for $RARCH but this machine is $DARCH (build with: make release ARCH=$DARCH)"

# shellcheck disable=SC1091
. /etc/os-release
CHROMIUM_SOURCE=distro
case "${ID:-}:${VERSION_ID:-}" in
  ubuntu:24.04) CHROMIUM_SOURCE=ppa ;;
  debian:*|raspbian:*) CHROMIUM_SOURCE=distro ;;
  ubuntu:*) [ "$FORCE" = 1 ] || die "Ubuntu ${VERSION_ID:-?} is untested; Ubuntu 24.04 is the target (--force to try anyway)"; CHROMIUM_SOURCE=ppa ;;
  *) [ "$FORCE" = 1 ] || die "unsupported OS '${PRETTY_NAME:-unknown}' (Ubuntu 24.04 or Debian/Pi OS; --force to try anyway)" ;;
esac

if [ -n "$OFFLINE_REPO" ]; then
  OFFLINE_REPO="$(readlink -f "$OFFLINE_REPO")"
  [ "$DO_PACKAGES" = 1 ] || die "--offline-repo and --no-packages contradict each other"
  [ -f "$OFFLINE_REPO/Packages" ] && [ -f "$OFFLINE_REPO/Release" ] \
    || die "--offline-repo: $OFFLINE_REPO has no Packages + Release (not a repo from make-install-stick.sh)"
  CHROMIUM_SOURCE=offline
fi

[ -d /run/systemd/system ] && SYSTEMD=1 || SYSTEMD=0
[ "$SYSTEMD" = 1 ] || warn "systemd is not running (container/chroot?): units are written but not enabled or started"

# Manifest helpers. The manifest is append-only during an install, so a run
# killed half way still lists everything it created for the uninstaller.
declare -A HAVE=()
if [ -f "$MANIFEST" ]; then
  while read -r k v; do [ -n "${k:-}" ] && [ "${k:0:1}" != "#" ] && HAVE["$k $v"]=1; done < "$MANIFEST"
fi
recorded() { [ -n "${HAVE["$1 $2"]:-}" ]; }
record() {
  recorded "$1" "$2" && return 0
  HAVE["$1 $2"]=1
  printf '%s %s\n' "$1" "$2" >> "$MANIFEST"
}

# Users that exist but are not ours: never adopt, never later delete.
for u in "$SVC_USER" "$KIOSK_USER"; do
  if id -u "$u" >/dev/null 2>&1 && ! recorded user "$u"; then
    die "user '$u' already exists and was not created by this installer; refusing to take it over"
  fi
done

# Another tty1 autologin would fight ours for the console.
if [ -d "$GETTY_DROPIN_DIR" ]; then
  for f in "$GETTY_DROPIN_DIR"/*.conf; do
    if [ ! -e "$f" ] || [ "$f" = "$GETTY_DROPIN" ] || ! grep -q 'autologin' "$f"; then continue; fi
    if [ "$FORCE" = 1 ]; then warn "another tty1 autologin drop-in exists: $f"
    else die "another tty1 autologin drop-in exists: $f (remove it, or --force)"; fi
  done
fi

# Port 8740/8741 free, unless it's our own bridge (re-install).
if command -v ss >/dev/null; then
  for p in 8740 8741; do
    holder="$(ss -ltnpH "sport = :$p" 2>/dev/null || true)"
    if [ -n "$holder" ] && ! grep -q eniac-bridge <<<"$holder"; then die "port $p is in use: $holder"; fi
  done
fi

mkdir -p "$PREFIX"
free_mb="$(df -Pm "$PREFIX" | awk 'NR==2{print $4}')"
[ "${free_mb:-0}" -ge "$MIN_FREE_MB" ] || die "need ${MIN_FREE_MB} MB free under $PREFIX, have ${free_mb} MB"

# ---------------------------------------------------------------------------
# Install
# ---------------------------------------------------------------------------
[ -f "$MANIFEST" ] || printf '# ENIAC touch kiosk install manifest: one "<kind> <value>" per line.\n# Read by eniac-touch-kiosk-uninstall. Do not edit.\n' > "$MANIFEST"
record dir "$PREFIX"

installed_pkgs() { dpkg-query -W -f='${db:Status-Status} ${Package}\n' 2>/dev/null | awk '$1=="installed"{print $2}' | sort -u; }
apt_files() { find /etc/apt/sources.list.d /etc/apt/trusted.gpg.d /etc/apt/keyrings -maxdepth 1 -type f 2>/dev/null | sort; }

if [ "$DO_PACKAGES" = 1 ]; then
  export DEBIAN_FRONTEND=noninteractive
  before="$(installed_pkgs)"
  APT=(apt-get)
  if [ "$CHROMIUM_SOURCE" = offline ]; then
    # Only the local repo is visible to apt for this run: the source list
    # lives in /run, not /etc/apt, and other lists are not cleaned up.
    odir=/run/eniac-touch-kiosk-offline
    olist=$odir/sources.list
    rm -rf -- "$odir" && mkdir -p "$odir/none"
    echo "deb [trusted=yes] file:$OFFLINE_REPO ./" > "$olist"
    APT=(apt-get -o "Dir::Etc::SourceList=$olist" -o "Dir::Etc::SourceParts=$odir/none" -o APT::Get::List-Cleanup=0)
    log "apt: offline, every package from $OFFLINE_REPO"
  fi
  log "apt: installing X11 (no desktop) and kiosk tools"
  "${APT[@]}" update -q
  "${APT[@]}" install -y -q --no-install-recommends \
    xserver-xorg xinit x11-xserver-utils xinput openbox unclutter tk
  if [ "$CHROMIUM_SOURCE" = ppa ] || [ "$CHROMIUM_SOURCE" = offline ]; then
    # Written in both cases: the pin also keeps Ubuntu's snap-shim
    # chromium-browser out if this box is later updated online.
    write_pin=1
  else
    write_pin=0
  fi
  if [ "$CHROMIUM_SOURCE" = ppa ]; then
    # Ubuntu's own chromium-browser is a shim that installs the snap, and the
    # snap cannot run the way a kiosk needs (confined profile dir, snapd
    # auto-refresh kills it mid-day; jersey-shore trap #5). Use the .deb
    # from the xtradeb PPA, pinned so the PPA supplies Chromium and nothing else.
    command -v add-apt-repository >/dev/null || apt-get install -y -q --no-install-recommends software-properties-common
    apt_before="$(apt_files)"
    if ! grep -rqs 'xtradeb/apps' /etc/apt/sources.list.d/; then
      log "apt: adding $PPA (Chromium .deb)"
      add-apt-repository -y "$PPA"
    fi
    comm -13 <(echo "$apt_before") <(apt_files) | while read -r f; do [ -n "$f" ] && echo "$f"; done > "$PREFIX/.apt-new"
    while read -r f; do record apt-file "$f"; done < "$PREFIX/.apt-new"; rm -f "$PREFIX/.apt-new"
    apt-get update -q
  fi
  if [ "$write_pin" = 1 ]; then
    cat > "$APT_PIN" <<'EOF'
# Written by eniac-touch-kiosk install.sh; removed by its uninstaller.
# The xtradeb PPA may supply Chromium only; everything else keeps coming from
# Ubuntu. Ubuntu's snap-shim chromium-browser is never installed.
Package: *
Pin: release o=LP-PPA-xtradeb-apps
Pin-Priority: 100

Package: chromium chromium-common chromium-sandbox chromium-l10n chromium-driver
Pin: release o=LP-PPA-xtradeb-apps
Pin-Priority: 700

Package: chromium-browser
Pin: release o=Ubuntu
Pin-Priority: -1
EOF
    record file "$APT_PIN"
  fi
  CHROMIUM_PKGS=(chromium)
  if [ "$CHROMIUM_SOURCE" = ppa ] || [ "$CHROMIUM_SOURCE" = offline ]; then
    # Ubuntu 23.10+ blocks unprivileged user namespaces (AppArmor), so
    # Chromium's namespace sandbox can't start: it exits at once with "No
    # usable sandbox!" and the kiosk stays black. The setuid sandbox helper
    # (only a Recommends, which --no-install-recommends skips) fixes that.
    CHROMIUM_PKGS+=(chromium-sandbox)
  fi
  log "apt: installing Chromium ($CHROMIUM_SOURCE): ${CHROMIUM_PKGS[*]}"
  "${APT[@]}" install -y -q --no-install-recommends "${CHROMIUM_PKGS[@]}"
  [ "$CHROMIUM_SOURCE" = offline ] && rm -rf -- "$odir"
  comm -13 <(echo "$before") <(installed_pkgs) > "$PREFIX/.pkgs-new" || true
  while read -r p; do [ -n "$p" ] && record package "$p"; done < "$PREFIX/.pkgs-new"; rm -f "$PREFIX/.pkgs-new"
fi

# On Ubuntu the setuid sandbox helper must be there, or Chromium won't start.
if [ "$DO_PACKAGES" = 1 ] && { [ "$CHROMIUM_SOURCE" = ppa ] || [ "$CHROMIUM_SOURCE" = offline ]; }; then
  sbx="$(dpkg -L chromium-sandbox 2>/dev/null | grep -m1 '/chrome-sandbox$' || true)"
  if [ -z "$sbx" ] || [ ! -u "$sbx" ]; then
    die "chromium-sandbox's setuid helper is missing (${sbx:-not installed}); Chromium would exit with 'No usable sandbox!'"
  fi
  log "chromium sandbox: $sbx (setuid)"
fi

# Whatever the source, the browser must be a real .deb, never the snap.
cbin="$(readlink -f /usr/bin/chromium 2>/dev/null || true)"
if [ -z "$cbin" ] || [ ! -x "$cbin" ]; then
  if [ "$DO_PACKAGES" = 1 ]; then die "/usr/bin/chromium missing after install"; fi
  warn "/usr/bin/chromium not found (--no-packages): install a Chromium .deb before rebooting"
elif [[ "$cbin" == /snap/* ]] || grep -qs '/snap/' /usr/bin/chromium; then
  die "/usr/bin/chromium is the snap ($cbin); remove it and re-run so the .deb is installed"
else
  log "chromium: $(dpkg -S /usr/bin/chromium 2>/dev/null | cut -d: -f1 || echo '?') $(dpkg-query -W -f='${Version}' chromium 2>/dev/null || true)"
fi
# The original UI needs Tk's wish (docs/original-ui-switch.md 7.3). Without
# it the kiosk still runs; the bridge reports the switch unavailable (no-tk).
if [ ! -x /usr/bin/wish ]; then
  if [ "$DO_PACKAGES" = 1 ]; then warn "/usr/bin/wish missing after apt (package tk): the Original UI will be unavailable"
  else warn "/usr/bin/wish not found (--no-packages): apt-get install tk for the Original UI"; fi
fi
if command -v snap >/dev/null && snap list chromium >/dev/null 2>&1; then
  warn "a chromium snap is also installed; the kiosk ignores it (not removed: it isn't ours)"
fi

log "users: $SVC_USER (bridge) and $KIOSK_USER (display)"
if ! id -u "$SVC_USER" >/dev/null 2>&1; then
  record user "$SVC_USER"   # record first: a crash between the two still gets cleaned up
  useradd --system --user-group --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin "$SVC_USER"
fi
if ! id -u "$KIOSK_USER" >/dev/null 2>&1; then
  record user "$KIOSK_USER"
  useradd --create-home --user-group --shell /bin/bash --comment "ENIAC kiosk display" "$KIOSK_USER"
fi
passwd -l "$KIOSK_USER" >/dev/null   # autologin only; no password, no SSH login
for g in video input render; do getent group "$g" >/dev/null && usermod -aG "$g" "$KIOSK_USER"; done
if id -nG "$KIOSK_USER" | tr ' ' '\n' | grep -qxE 'sudo|admin|wheel|adm'; then
  die "$KIOSK_USER is in an admin group; it must not be"
fi

# The Original UI switch directory: the bridge (eniac) writes requests, the
# kiosk session (eniac-kiosk) reads them. tmpfs, so nothing survives a reboot
# (ADR-OUI-3, ADR-OUI-5); setgid, so the bridge's files are group eniac-kiosk.
log "original UI: $UI_DIR via $TMPFILES"
printf '%s\n' "# Written by eniac-touch-kiosk install.sh; removed by its uninstaller." \
  "# Original-UI switch requests between the bridge (eniac) and the kiosk session (eniac-kiosk)." \
  "d $UI_DIR 2770 $SVC_USER $KIOSK_USER -" > "$TMPFILES"
record file "$TMPFILES"
if ! systemd-tmpfiles --create "$TMPFILES" 2>/dev/null; then
  install -d -m 2770 -o "$SVC_USER" -g "$KIOSK_USER" "$UI_DIR"
fi

log "files: $PREFIX/releases/$VER"
REL="$PREFIX/releases/$VER"
mkdir -p "$PREFIX/releases"
if [ -d "$REL" ] && cmp -s "$REL/SHA256SUMS" "$HERE/SHA256SUMS"; then
  log "release $VER already installed and identical; not copied"
elif [ "$(readlink -f "$HERE")" = "$(readlink -f "$REL")" ]; then
  : # re-running the installer from the installed copy
else
  rm -rf -- "$REL.tmp"
  mkdir -p "$REL.tmp"
  cp -a "$HERE/." "$REL.tmp/"
  chown -R root:root "$REL.tmp"
  chmod -R u+rwX,go+rX,go-w "$REL.tmp"
  rm -rf -- "$REL"
  mv "$REL.tmp" "$REL"
fi

# Atomic symlink swap; the release we replace becomes `previous`.
old="$(readlink "$PREFIX/current" 2>/dev/null || true)"
if [ -n "$old" ] && [ "$old" != "releases/$VER" ] && [ -d "$PREFIX/$old" ]; then
  ln -sfn "$old" "$PREFIX/previous.tmp" && mv -T "$PREFIX/previous.tmp" "$PREFIX/previous"
fi
ln -sfn "releases/$VER" "$PREFIX/current.tmp" && mv -T "$PREFIX/current.tmp" "$PREFIX/current"
# Keep only current and previous.
prev="$(readlink "$PREFIX/previous" 2>/dev/null || true)"
for d in "$PREFIX"/releases/*; do
  [ -d "$d" ] || continue
  r="releases/$(basename "$d")"
  [ "$r" = "releases/$VER" ] || [ "$r" = "$prev" ] || { log "pruning old release $(basename "$d")"; rm -rf -- "$d"; }
done

mkdir -p "$ETC"; record dir "$ETC"
install -m 0644 "$REL/deploy/kiosk/config.yaml" "$ETC/config.yaml.dist"
if [ ! -f "$ETC/config.yaml" ]; then
  install -m 0644 "$REL/deploy/kiosk/config.yaml" "$ETC/config.yaml"
elif ! cmp -s "$ETC/config.yaml" "$ETC/config.yaml.dist"; then
  log "keeping the locally edited $ETC/config.yaml (new default: config.yaml.dist)"
fi
# A config.yaml from a release before the Original UI switch has no
# originalUi block (and is never overwritten): append it once, so staff
# never have to edit YAML. pinFile and uiSwitch are derived when absent.
if ! grep -q '^originalUi:' "$ETC/config.yaml"; then
  cat "$REL/deploy/kiosk/config-original-ui.yaml" >> "$ETC/config.yaml"
  log "config: appended the originalUi block to $ETC/config.yaml (Original UI switch on)"
fi
if [ ! -f "$ETC/session.env" ]; then
  cat > "$ETC/session.env" <<'EOF'
# Optional overrides for the kiosk X session (read by kiosk-session).
# Only needed if touch lands in the wrong place, e.g. with two outputs.
# Device name from `xinput list`, output name from `xrandr`:
#KIOSK_TOUCH_DEVICE="ILITEK ILITEK-TP"
#KIOSK_OUTPUT="DP-1"
#KIOSK_URL="http://127.0.0.1:8740/"
EOF
  chmod 0644 "$ETC/session.env"
fi
record dir "$STATE"   # created by systemd (StateDirectory=); metrics live here

install -m 0644 "$REL/deploy/kiosk/$UNIT" "$UNIT_PATH"; record file "$UNIT_PATH"
install -m 0755 "$REL/deploy/kiosk/eniac-touch-kiosk" "$WRAPPER"; record file "$WRAPPER"
install -m 0755 "$REL/deploy/kiosk/uninstall.sh" "$UNINSTALLER"; record file "$UNINSTALLER"

# The staff PIN (S12): never a default (NFR-10). Ask only on a terminal and
# only if none is set; otherwise say how to set it.
if [ ! -s "$ETC/admin-pin" ]; then
  if [ "$DO_PIN" = 1 ] && [ -t 0 ]; then
    log "staff PIN for the hidden admin screen (5 taps top left):"
    "$WRAPPER" set-pin || warn "no staff PIN set; later: sudo eniac-touch-kiosk set-pin"
  else
    log "no staff PIN is set; the admin screen says so until: sudo eniac-touch-kiosk set-pin"
  fi
fi

log "display: tty1 autologin -> startx -> Chromium kiosk"
mkdir -p "$GETTY_DROPIN_DIR"
cat > "$GETTY_DROPIN" <<EOF
# Written by eniac-touch-kiosk install.sh; removed by its uninstaller.
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin $KIOSK_USER --noclear %I \$TERM
EOF
record file "$GETTY_DROPIN"

KHOME="$(getent passwd "$KIOSK_USER" | cut -d: -f6)"
cat > "$KHOME/.bash_profile" <<EOF
# Written by eniac-touch-kiosk install.sh. Starts the exhibit on the tty1
# console login only (an SSH or tty2 login gets a plain shell).
if [ -z "\${DISPLAY:-}" ] && [ "\$(tty)" = /dev/tty1 ]; then
  # -nocursor: no pointer on a touch exhibit. -s 0 -dpms: never blank.
  startx -- -nocursor -s 0 -dpms -nolisten tcp
  # X exited: pause so a failing X can't spin getty into its start limit,
  # then log out; agetty logs us straight back in and X restarts.
  sleep 5
  exit 0
fi
EOF
printf '#!/bin/sh\n# Written by eniac-touch-kiosk install.sh\nexec %s/current/deploy/kiosk/kiosk-session\n' "$PREFIX" > "$KHOME/.xinitrc"
touch "$KHOME/.hushlogin"
chown "$KIOSK_USER:$KIOSK_USER" "$KHOME/.bash_profile" "$KHOME/.xinitrc" "$KHOME/.hushlogin"
chmod 0755 "$KHOME/.xinitrc"

# Boot to the console (no display manager on tty1). Remember what it was.
if command -v systemctl >/dev/null; then
  cur_target="$(systemctl get-default 2>/dev/null || true)"
  if [ -n "$cur_target" ] && [ "$cur_target" != multi-user.target ]; then
    # "-" = there was no /etc/systemd/system/default.target link (distro
    # default); removal then deletes our link instead of creating one.
    if ! grep -q '^default-target ' "$MANIFEST"; then
      if [ -L /etc/systemd/system/default.target ]; then record default-target "$cur_target"; else record default-target -; fi
    fi
    systemctl set-default multi-user.target
  fi
fi

record version "$VER"

if [ "$SYSTEMD" = 1 ] && [ "$DO_START" = 1 ]; then
  systemctl daemon-reload
  systemctl enable "$UNIT" >/dev/null 2>&1
  systemctl restart "$UNIT"
  log "waiting for the bridge on 127.0.0.1:8740"
  for _ in $(seq 1 20); do (exec 3<>/dev/tcp/127.0.0.1/8740) 2>/dev/null && break; sleep 1; done
  systemctl is-active --quiet "$UNIT" || die "$UNIT failed to start: journalctl -u $UNIT -n 50"
  log "selftest (Squares, headless, beside the running bridge)"
  "$WRAPPER" selftest || die "selftest failed; see above"
elif [ "$SYSTEMD" = 1 ]; then
  systemctl daemon-reload
  log "--no-start: nothing enabled. Later: sudo systemctl enable --now $UNIT"
fi

cat <<EOF

install: done. ENIAC touch kiosk $VER ($RARCH) is installed.

  Status / logs / selftest:  eniac-touch-kiosk status | logs | selftest
  Staff PIN:                 sudo eniac-touch-kiosk set-pin
  Original UI over SSH:      sudo eniac-touch-kiosk original-ui tour|interactive|off|status
  Remove everything:         sudo eniac-touch-kiosk-uninstall [--purge-packages]
  Manifest:                  $MANIFEST

Next:
  1. sudo reboot   (the console comes up straight into the exhibit)
  2. BIOS, if not done yet: "AC Recovery" / "Restore on AC Power Loss" -> POWER ON.
     No script can set this; without it the exhibit stays dark after an outage.
  3. Pull the plug at the wall, plug back in, hands off: it must come back alone.
EOF
