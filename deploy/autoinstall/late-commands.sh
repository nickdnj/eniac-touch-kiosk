#!/bin/bash
# ENIAC kiosk install stick: autoinstall late-command (docs/deploy-x86.md).
# Runs in the live installer after Ubuntu is on the disk, with the new system
# at /target. Stages the kiosk payload from the stick and arms the one-shot
# first-boot unit that runs the kiosk installer; the kiosk itself is
# installed on first boot (it needs systemd running to start and selftest).
set -euo pipefail
T=/target
P=/cdrom/eniac
FB=$T/var/lib/eniac-firstboot
say() { echo "eniac-late: $*"; for c in /dev/console /dev/tty1; do [ -w "$c" ] && echo "eniac-late: $*" > "$c" 2>/dev/null; done; return 0; }

say "staging the kiosk payload from the stick"
install -d -m 0755 "$FB" "$T/var/lib/eniac-stick"
cp -R "$P/release" "$FB/release"
[ -d "$P/offline" ] && cp -R "$P/offline" "$FB/offline"
chmod -R u+rwX,go+rX,go-w "$FB"
install -m 0644 "$P/STICK-INFO" "$T/var/lib/eniac-stick/installed-by"
install -m 0755 "$P/firstboot.sh" "$T/usr/local/sbin/eniac-kiosk-firstboot"
install -m 0644 "$P/eniac-kiosk-firstboot.service" "$T/etc/systemd/system/eniac-kiosk-firstboot.service"
curtin in-target --target="$T" -- systemctl enable eniac-kiosk-firstboot.service
cp /var/log/eniac-stick-guard.log "$T/var/log/" 2>/dev/null || true

# Verify the staged release before we leave the installer: a bad stick should
# fail here, on the installer screen, not silently at first boot.
(cd "$FB/release" && for s in *.sha256; do sha256sum -c "$s"; done) || { say "release checksum FAILED: re-build the stick"; exit 1; }

# UEFI: put the Ubuntu entry for THIS disk first in the boot order, so the
# reboot after the install comes up from the disk even with the stick still
# plugged in (the stick-guard also refuses to re-install over this install).
if [ -d /sys/firmware/efi ]; then
  disk="$(sed -n 's/^ *path: \(\/dev\/[^ ]*\)$/\1/p' /autoinstall.yaml | head -n 1)"
  esp_uuid=""
  if [ -n "$disk" ]; then
    esp_uuid="$(lsblk -lnpo PARTUUID,PARTTYPE "$disk" 2>/dev/null | awk 'tolower($2)=="c12a7328-f81f-11d2-ba4b-00a0c93ec93b"{print tolower($1); exit}')"
  fi
  EFIBM=(efibootmgr)
  command -v efibootmgr >/dev/null || EFIBM=(curtin in-target --target="$T" -- efibootmgr)
  if out="$("${EFIBM[@]}" -v 2>/dev/null)"; then
    entry=""
    [ -n "$esp_uuid" ] && entry="$(grep -i "$esp_uuid" <<<"$out" | sed -n 's/^Boot\([0-9A-Fa-f]\{4\}\).*/\1/p' | head -n 1)"
    [ -n "$entry" ] || entry="$(sed -n 's/^Boot\([0-9A-Fa-f]\{4\}\)\*\{0,1\} ubuntu.*/\1/p' <<<"$out" | head -n 1)"
    order="$(sed -n 's/^BootOrder: //p' <<<"$out")"
    if [ -n "$entry" ]; then
      rest="$(tr ',' '\n' <<<"$order" | grep -vix "$entry" | paste -sd, -)"
      if "${EFIBM[@]}" -o "$entry${rest:+,$rest}" >/dev/null; then say "UEFI boot order: Boot$entry (ubuntu on $disk) first"
      else say "WARNING: could not change the UEFI boot order; remove the stick before the reboot"; fi
    else
      say "WARNING: no ubuntu UEFI entry found; remove the stick before the reboot"
    fi
  else
    say "WARNING: efibootmgr unavailable; remove the stick before the reboot"
  fi
else
  say "legacy BIOS boot: the BIOS boot order decides; remove the stick before the reboot or put the SSD first"
fi
say "done: on first boot the kiosk installs itself, then reboots into the exhibit"
