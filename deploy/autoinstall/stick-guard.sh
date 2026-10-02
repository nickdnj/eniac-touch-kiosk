#!/bin/bash
# ENIAC kiosk install stick: autoinstall early-command (docs/deploy-x86.md).
# Runs in the Ubuntu live installer, as root, BEFORE anything is written.
# Exit non-zero = subiquity aborts the install with the disk untouched.
#
#  1. Pick the target: the one internal disk. Excluded: the stick itself (the
#     disk holding /cdrom), anything on USB, removable, optical, loop, zram,
#     eMMC boot partitions, and disks under 16 GB. Zero or several left ->
#     refuse (several: name one with eniac.disk=/dev/sdX on the kernel cmdline).
#  2. Look inside it, read-only (LVM activated just long enough to look):
#     refuse if it holds a kiosk -- jersey-shore (/opt/3280-kiosk, os32*.service),
#     an ENIAC kiosk (/opt/eniac-touch-kiosk), or this stick's own earlier
#     install (/var/lib/eniac-stick/installed-by) -- or a Linux filesystem it
#     cannot mount to check. eniac.overwrite-kiosk=yes on the cmdline overrides
#     this check only.
#  3. Write the chosen disk into /autoinstall.yaml (subiquity re-reads it
#     after early-commands), replacing the __ENIAC_TARGET_DISK__ placeholder.
set -uo pipefail

LOG=/var/log/eniac-stick-guard.log
CFG=/autoinstall.yaml
STICK_ID_FILE=/cdrom/eniac/STICK-INFO
MIN_BYTES=$((16 * 1000 * 1000 * 1000))

# Everything goes to the log, stderr (subiquity's log) and the console(s).
say() {
  local line="eniac-guard: $*"
  echo "$line" >> "$LOG"
  echo "$line" >&2
  for c in /dev/console /dev/tty1; do [ -w "$c" ] && echo "$line" > "$c" 2>/dev/null; done
  return 0
}
refuse() {
  say "################################################################"
  say "REFUSING TO INSTALL. NOTHING HAS BEEN WRITTEN TO ANY DISK."
  say "$*"
  say "Power off, remove the USB stick. Details: $LOG (in the installer: Ctrl+Alt+F2)."
  say "################################################################"
  cleanup_mounts
  exit 1
}

cmdflag() { tr ' ' '\n' < /proc/cmdline | sed -n "s/^$1=//p" | tail -n 1; }
OVERRIDE="$(cmdflag eniac.overwrite-kiosk)"
DISK_FLAG="$(cmdflag eniac.disk)"

MNT=/run/eniac-guard-mnt
ACTIVATED_VGS=()
cleanup_mounts() {
  mountpoint -q "$MNT" 2>/dev/null && umount "$MNT" 2>/dev/null
  for vg in "${ACTIVATED_VGS[@]}"; do vgchange -an "$vg" >/dev/null 2>&1; done
  ACTIVATED_VGS=()
  return 0
}

say "stick guard starting ($(date -u +%FT%TZ)); cmdline: $(cat /proc/cmdline)"
[ -f "$CFG" ] || refuse "$CFG not found: this subiquity does not expose the autoinstall config where expected."
grep -q '__ENIAC_TARGET_DISK__' "$CFG" || refuse "$CFG has no __ENIAC_TARGET_DISK__ placeholder (was the guard run twice, or the config edited?)."

# --- 1. the target disk -----------------------------------------------------
media_src="$(findmnt -no SOURCE /cdrom 2>/dev/null || true)"
media_disk=""
if [ -n "$media_src" ] && [ -b "$media_src" ]; then
  media_disk="$(lsblk -no PKNAME "$media_src" 2>/dev/null | head -n 1)"
  [ -n "$media_disk" ] && media_disk="/dev/$media_disk" || media_disk="$media_src"
fi
say "install media: ${media_src:-unknown} (disk ${media_disk:-unknown})"

say "disks seen:"
lsblk -dpno NAME,TYPE,TRAN,RM,SIZE,MODEL,SERIAL 2>/dev/null | while read -r l; do say "  $l"; done

candidates=()
re='NAME="([^"]*)" TYPE="([^"]*)" TRAN="([^"]*)" RM="([^"]*)" SIZE="([^"]*)"'
while read -r l; do
  [[ "$l" =~ $re ]] || continue
  name="${BASH_REMATCH[1]}" type="${BASH_REMATCH[2]}" tran="${BASH_REMATCH[3]}" rm="${BASH_REMATCH[4]}" size="${BASH_REMATCH[5]}"
  [ "$type" = disk ] || continue
  case "$name" in /dev/loop*|/dev/sr*|/dev/zram*|/dev/ram*|*boot[0-9]|*rpmb) continue ;; esac
  [ "$name" = "$media_disk" ] && continue
  [ "$tran" = usb ] && continue
  [ "$rm" = 1 ] && continue
  [ "${size:-0}" -ge "$MIN_BYTES" ] || continue
  candidates+=("$name")
done < <(lsblk -dbpnP -o NAME,TYPE,TRAN,RM,SIZE 2>/dev/null)

if [ -n "$DISK_FLAG" ]; then
  [ -b "$DISK_FLAG" ] || refuse "eniac.disk=$DISK_FLAG is not a block device."
  [ "$(lsblk -dno TYPE "$DISK_FLAG")" = disk ] || refuse "eniac.disk=$DISK_FLAG is not a whole disk."
  [ "$DISK_FLAG" != "$media_disk" ] || refuse "eniac.disk=$DISK_FLAG is the install stick itself."
  DISK="$DISK_FLAG"
  say "target chosen on the kernel cmdline: $DISK"
elif [ "${#candidates[@]}" -eq 1 ]; then
  DISK="${candidates[0]}"
elif [ "${#candidates[@]}" -eq 0 ]; then
  refuse "No internal disk found (USB disks, the stick and disks under 16 GB are never targets)."
else
  refuse "More than one internal disk (${candidates[*]}). Pick one: at the boot menu press 'e' and add eniac.disk=/dev/<name> before the '---'."
fi
say "target disk: $DISK ($(lsblk -dno SIZE,MODEL,SERIAL "$DISK" | tr -s ' '))"

# --- 2. is there a kiosk on it? ----------------------------------------------
this_stick="$(sed -n 's/^stick-id=//p' "$STICK_ID_FILE" 2>/dev/null)"
found=()
uncheckable=()
mkdir -p "$MNT"

# Activate only the volume groups that live on the target disk.
if command -v pvs >/dev/null; then
  while read -r pv vg; do
    [ -n "$vg" ] || continue
    if [ "$(lsblk -no PKNAME "$pv" 2>/dev/null | head -n 1)" = "$(basename "$DISK")" ] || [ "$pv" = "$DISK" ]; then
      if vgchange -ay "$vg" >/dev/null 2>&1; then ACTIVATED_VGS+=("$vg"); say "LVM: activated $vg (read-only look)"; fi
    fi
  done < <(pvs --noheadings -o pv_name,vg_name 2>/dev/null)
fi

inspect() { # $1 = mounted root
  local r="$1" hits=()
  [ -e "$r/opt/3280-kiosk" ] && hits+=("jersey-shore: /opt/3280-kiosk")
  for u in os32.service os32-bridge.service os32-reset.service; do
    [ -e "$r/etc/systemd/system/$u" ] && hits+=("jersey-shore: /etc/systemd/system/$u")
  done
  [ -e "$r/var/lib/3280-kiosk" ] && hits+=("jersey-shore: /var/lib/3280-kiosk")
  [ -e "$r/opt/eniac-touch-kiosk" ] && hits+=("ENIAC kiosk: /opt/eniac-touch-kiosk")
  if [ -f "$r/var/lib/eniac-stick/installed-by" ]; then
    local by; by="$(sed -n 's/^stick-id=//p' "$r/var/lib/eniac-stick/installed-by")"
    if [ -n "$this_stick" ] && [ "$by" = "$this_stick" ]; then
      hits+=("already installed by THIS stick ($by): the machine booted the stick again instead of its disk")
    else
      hits+=("installed by an ENIAC kiosk stick ($by)")
    fi
  fi
  for f in "$r"/etc/systemd/system/getty@tty1.service.d/*.conf; do
    [ -f "$f" ] && grep -q -- '--autologin' "$f" && hits+=("console autologin (kiosk-style): ${f#"$r"}")
  done
  [ -f "$r/etc/os-release" ] && say "  OS on it: $(sed -n 's/^PRETTY_NAME=//p' "$r/etc/os-release" | tr -d '"')"
  [ -d "$r/Windows/System32" ] && say "  OS on it: Windows"
  for h in "${hits[@]}"; do found+=("$h"); done
  return 0
}

while read -r dev fstype; do
  [ -n "$fstype" ] || continue
  case "$fstype" in
    ext2|ext3|ext4) opts=ro,noload ;;
    xfs) opts=ro,norecovery ;;
    btrfs|vfat|ntfs|ntfs3|exfat) opts=ro ;;
    LVM2_member|swap) continue ;;
    *) say "  $dev: $fstype (not inspected)"; [ "$fstype" = crypto_LUKS ] && uncheckable+=("$dev (encrypted)"); continue ;;
  esac
  if mount -o "$opts" "$dev" "$MNT" 2>/dev/null; then
    say "  $dev: $fstype, looked inside"
    inspect "$MNT"
    [ "$fstype" = btrfs ] && [ -d "$MNT/@" ] && inspect "$MNT/@"
    umount "$MNT"
  else
    say "  $dev: $fstype, could NOT be mounted read-only"
    case "$fstype" in ext*|xfs|btrfs) uncheckable+=("$dev ($fstype)") ;; esac
  fi
done < <(lsblk -lnpo NAME,FSTYPE "$DISK" 2>/dev/null)
cleanup_mounts

if [ "${#found[@]}" -gt 0 ] || [ "${#uncheckable[@]}" -gt 0 ]; then
  for h in "${found[@]}"; do say "FOUND: $h"; done
  for u in "${uncheckable[@]}"; do say "CANNOT CHECK: $u"; done
  if [ "$OVERRIDE" = yes ]; then
    say "eniac.overwrite-kiosk=yes is on the cmdline: erasing it anyway."
  else
    refuse "$DISK looks like it holds a kiosk (or a Linux filesystem that couldn't be checked). If you really mean to erase it: at the boot menu press 'e', add eniac.overwrite-kiosk=yes before the '---', then Ctrl+X."
  fi
else
  say "no kiosk found on $DISK"
fi

# --- 3. aim the installer at it ------------------------------------------------
sed -i "s|__ENIAC_TARGET_DISK__|$DISK|" "$CFG"
grep -q "path: $DISK\$" "$CFG" || refuse "could not write the target disk into $CFG."
say "OK: Ubuntu will be installed on $DISK. EVERYTHING ON IT WILL BE ERASED."
exit 0
