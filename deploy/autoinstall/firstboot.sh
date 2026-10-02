#!/bin/bash
# /usr/local/sbin/eniac-kiosk-firstboot, run once by eniac-kiosk-firstboot.service
# on the first boot after the one-stick autoinstall (docs/deploy-x86.md).
#
# Unpacks the staged release, verifies it, runs its install.sh -- offline from
# the bundled apt repo when the stick carried one, else online (apt + the
# xtradeb PPA) -- and on success marks itself done and reboots into the
# exhibit. On failure: nothing is marked, the unit stays enabled and retries
# on the next boot, and tty1 shows a login prompt. Log:
# /var/log/eniac-kiosk-firstboot.log
set -uo pipefail
D=/var/lib/eniac-firstboot
LOG=/var/log/eniac-kiosk-firstboot.log
LOCKCONF=/etc/apt/apt.conf.d/99eniac-firstboot-lock
exec > >(tee -a "$LOG") 2>&1

say() { echo "eniac-firstboot: $*"; }
fail() {
  rm -f "$LOCKCONF"
  say "############################################################"
  say "KIOSK INSTALL FAILED: $*"
  say "Log: $LOG. It will be retried on the next boot."
  say "To retry now: sudo systemctl start eniac-kiosk-firstboot"
  say "############################################################"
  exit 1
}

say "first boot: installing the ENIAC touch kiosk ($(date -u +%FT%TZ))"
cd "$D/release" || fail "$D/release missing"
for s in *.sha256; do sha256sum -c "$s" || fail "release checksum mismatch ($s)"; done
tarball=""; for f in eniac-touch-kiosk-*-linux-*.tar.gz; do [ -f "$f" ] && { tarball="$f"; break; }; done
[ -n "$tarball" ] || fail "no release tarball in $D/release"

rm -rf "$D/work" && mkdir -p "$D/work"
tar -xzf "$D/release/$tarball" -C "$D/work" || fail "could not unpack $tarball"
rel=""; for d in "$D"/work/eniac-touch-kiosk-*; do [ -d "$d" ] && { rel="$d"; break; }; done
[ -n "$rel" ] || fail "nothing unpacked from $tarball"

# First boot races apt-daily / unattended-upgrades for the dpkg lock: wait.
printf 'DPkg::Lock::Timeout "1800";\n' > "$LOCKCONF"

args=()
if [ -f "$D/offline/Packages" ]; then
  say "packages: offline, from the bundle on the stick"
  args+=("--offline-repo=$D/offline")
else
  say "packages: online (apt + xtradeb PPA); this needs the network"
fi
if ! "$rel/install.sh" "${args[@]}"; then
  if [ "${#args[@]}" -gt 0 ] && getent hosts ppa.launchpadcontent.net >/dev/null 2>&1; then
    say "offline install failed and the network is up: retrying online"
    "$rel/install.sh" || fail "install.sh failed (offline and online)"
  else
    fail "install.sh failed"
  fi
fi
rm -f "$LOCKCONF"

rm -rf "$D/work"
date -u +%FT%TZ > "$D/done"
systemctl disable eniac-kiosk-firstboot.service >/dev/null 2>&1 || true
say "kiosk installed. Rebooting into the exhibit in 10 s."
sleep 10
systemctl --no-block reboot
exit 0
