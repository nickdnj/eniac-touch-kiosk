#!/bin/bash
# Runs INSIDE a privileged ubuntu:24.04 container (test-stick-qemu.sh
# guard-jersey). Turns /w/disk.raw into a disk laid out like a default Ubuntu
# 24.04 Server install -- GPT: ESP (vfat), /boot (ext4), LVM PV with
# ubuntu-vg/ubuntu-lv (ext4 root) -- whose root carries the jersey-shore
# kiosk's signature files (jersey-shore-computer-company/src/controller).
set -euo pipefail
D=/w/disk.raw
export DEBIAN_FRONTEND=noninteractive LVM_SUPPRESS_FD_WARNINGS=1
apt-get update -qq >/dev/null
apt-get install -y -qq gdisk e2fsprogs lvm2 dosfstools >/dev/null 2>&1
LVMCONF='activation { udev_sync = 0 udev_rules = 0 } devices { obtain_device_list_from_udev = 0 }'

sgdisk -n1:2048:+512M -t1:ef00 -n2:0:+1G -t2:8300 -n3:0:+12G -t3:8e00 "$D" >/dev/null
# One loop device per partition, at its offset (Docker Desktop's loop driver
# doesn't expose partition nodes).
P=()
for n in 1 2 3; do
  first="$(sgdisk -i "$n" "$D" | sed -n 's/^First sector: \([0-9]*\).*/\1/p')"
  last="$(sgdisk -i "$n" "$D" | sed -n 's/^Last sector: \([0-9]*\).*/\1/p')"
  P[n]="$(losetup -f --show -o $((first * 512)) --sizelimit $(((last - first + 1) * 512)) "$D")"
  # A fresh container may lack the node for a just-allocated loop device.
  [ -b "${P[n]}" ] || mknod "${P[n]}" b 7 "${P[n]#/dev/loop}"
  echo "partition $n: ${P[n]} $(blockdev --getsize64 "${P[n]}") bytes"
done
cleanup() {
  vgchange -an ubuntu-vg --config "$LVMCONF" >/dev/null 2>&1 || true
  for n in 1 2 3; do [ -n "${P[n]:-}" ] && losetup -d "${P[n]}" 2>/dev/null; done
  return 0
}
trap cleanup EXIT
mkfs.vfat -n ESP "${P[1]}" >/dev/null
mkfs.ext4 -q -L boot "${P[2]}"
pvcreate -q --config "$LVMCONF" "${P[3]}"
vgcreate -q --config "$LVMCONF" ubuntu-vg "${P[3]}"
lvcreate -q -y --config "$LVMCONF" -L 6G -n ubuntu-lv ubuntu-vg
vgscan --mknodes --config "$LVMCONF" >/dev/null 2>&1 || true
LV=/dev/mapper/ubuntu--vg-ubuntu--lv
[ -b "$LV" ] || LV=/dev/ubuntu-vg/ubuntu-lv
mkfs.ext4 -q -L root "$LV"
mkdir -p /mnt/r && mount "$LV" /mnt/r
r=/mnt/r
mkdir -p "$r/opt/3280-kiosk" "$r/etc/systemd/system/getty@tty1.service.d" "$r/home/kiosk" "$r/var/lib/3280-kiosk"
echo "<html>3280</html>" > "$r/opt/3280-kiosk/index.html"
printf '[Service]\nExecStart=/opt/3280-kiosk/os32\n' > "$r/etc/systemd/system/os32.service"
printf '[Service]\nExecStart=/opt/3280-kiosk/os32-bridge\n' > "$r/etc/systemd/system/os32-bridge.service"
# shellcheck disable=SC2016  # $TERM is literal in the unit file
printf '[Service]\nExecStart=\nExecStart=-/sbin/agetty --autologin kiosk --noclear %%I $TERM\n' > "$r/etc/systemd/system/getty@tty1.service.d/autologin.conf"
printf 'PRETTY_NAME="Ubuntu 24.04.3 LTS (jersey-shore test fixture)"\n' > "$r/etc/os-release"
umount /mnt/r
sync
sgdisk -p "$D" | tail -n 4
echo "fixture: ESP + /boot + LVM ubuntu-vg/ubuntu-lv with jersey-shore files"
