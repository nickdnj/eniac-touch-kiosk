#!/usr/bin/env bash
# Rehearse the one-stick install in a QEMU x86_64 VM shaped like the OptiPlex:
# UEFI (OVMF), the image attached as a USB stick, a SATA internal disk, and
# NO internet (user-mode net with restrict=on: DHCP only). Headless; a serial
# console driver (stick-vm-driver.py) watches and answers like a person would.
# Not part of `make test`. Under emulation (Apple silicon) `full` takes 1-2 h.
#
#   tests/deploy/test-stick-qemu.sh ISO [scenario] [workdir]
#
#   full            (default) blank 24 GB disk; the ISO must be built with
#                   --unattended-wipe --serial-console. Install -> first boot
#                   -> kiosk installed offline -> reboot -> checks over the
#                   serial console (bridge, page, selftest, X, Chromium) ->
#                   screenshot of the VGA screen -> poweroff.
#   recheck         boot the disk a finished `full` run left behind (stick still
#                   attached), log in, run the same checks again. Workdir
#                   defaults to build/stick/vm-full.
#   confirm-prompt  any ISO; boots its kernel directly WITHOUT `autoinstall`
#                   (what a default stick does): the guard must run, then the
#                   installer must stop at "Continue with autoinstall?". The
#                   disk must still be all zeroes afterwards.
#   guard-jersey    a disk carrying a jersey-shore kiosk's signature files,
#                   booted WITH `autoinstall` (worst case): the guard must
#                   refuse, and the disk must be byte-identical afterwards.
#
# Needs: qemu (brew install qemu), python3; guard-jersey also needs docker.
# shellcheck disable=SC2054  # qemu option strings contain commas by design
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ISO="${1:?usage: $0 ISO [full|recheck|confirm-prompt|guard-jersey] [workdir]}"
SCEN="${2:-full}"
if [ "$SCEN" = recheck ]; then W="${3:-$ROOT/build/stick/vm-full}"; else W="${3:-$ROOT/build/stick/vm-$SCEN}"; fi
ISO="$(cd "$(dirname "$ISO")" && pwd)/$(basename "$ISO")"
command -v qemu-system-x86_64 >/dev/null || { echo "qemu-system-x86_64 not found (brew install qemu)" >&2; exit 2; }
QSHARE="$(dirname "$(dirname "$(command -v qemu-system-x86_64)")")/share/qemu"
CODE="$QSHARE/edk2-x86_64-code.fd"
VARS_TMPL="$QSHARE/edk2-i386-vars.fd"
[ -f "$CODE" ] && [ -f "$VARS_TMPL" ] || { echo "OVMF firmware not found in $QSHARE" >&2; exit 2; }

if [ "$SCEN" = recheck ]; then
  [ -f "$W/disk.qcow2" ] && [ -f "$W/vars.fd" ] || { echo "no finished full run in $W" >&2; exit 2; }
  mv -f "$W/serial.log" "$W/serial.full.log" 2>/dev/null || true
else
  rm -rf "$W" && mkdir -p "$W"
  cp "$VARS_TMPL" "$W/vars.fd"
fi
# UNIX socket paths must stay under 104 bytes on macOS: keep them short.
SOCKS="$(mktemp -d "${TMPDIR:-/tmp}/esvm.XXXXXX")"
TEST_USER="${STICK_TEST_USER:-nick}"
TEST_PASS="${STICK_TEST_PASSWORD:-eniac-test-pass}"

ACCEL=(-accel tcg,thread=multi,tb-size=1024 -cpu max)
[ "$(uname -m)" = x86_64 ] && [ "$(uname -s)" = Linux ] && [ -w /dev/kvm ] && ACCEL=(-accel kvm -cpu host)
[ "$(uname -m)" = x86_64 ] && [ "$(uname -s)" = Darwin ] && ACCEL=(-accel hvf -cpu host)

QEMU=(qemu-system-x86_64 -machine q35 "${ACCEL[@]}" -smp 4 -m 4096
  -drive if=pflash,format=raw,readonly=on,file="$CODE"
  -drive if=pflash,format=raw,file="$W/vars.fd"
  -device ahci,id=ahci
  -device qemu-xhci,id=xhci
  -drive id=stick,if=none,format=raw,readonly=on,file="$ISO"
  -device usb-storage,bus=xhci.0,drive=stick,removable=on
  -netdev user,id=n0,restrict=on -device e1000,netdev=n0
  -vga std -display none
  -serial unix:"$SOCKS/s",server=on,wait=on
  -monitor unix:"$SOCKS/m",server=on,wait=off)

case "$SCEN" in
  full)
    qemu-img create -q -f qcow2 "$W/disk.qcow2" 24G
    QEMU+=(-drive id=hd,if=none,format=qcow2,file="$W/disk.qcow2" -device ide-hd,bus=ahci.0,drive=hd)
    # The boot entry comes from the stick's own grub (timeout 30 s, default 0).
    QEMU+=(-boot menu=off)
    DRIVER=(--scenario full --user "$TEST_USER" --password "$TEST_PASS" --screenshot "$W/kiosk-screen.png" --settle 240)
    TIMEOUT=$((6 * 3600))
    ;;
  recheck)
    QEMU+=(-drive id=hd,if=none,format=qcow2,file="$W/disk.qcow2" -device ide-hd,bus=ahci.0,drive=hd -boot menu=off)
    DRIVER=(--scenario recheck --user "$TEST_USER" --password "$TEST_PASS" --screenshot "$W/kiosk-screen.png" --settle 240)
    TIMEOUT=$((90 * 60))
    ;;
  confirm-prompt|guard-jersey)
    # Direct kernel boot from the ISO's own kernel + initrd, so we control the
    # cmdline exactly; casper still finds and mounts the USB stick as /cdrom.
    bsdtar -xf "$ISO" -C "$W" casper/vmlinuz casper/initrd 2>/dev/null || tar -xf "$ISO" -C "$W" casper/vmlinuz casper/initrd
    APPEND="subiquity.autoinstallpath=/cdrom/eniac/autoinstall.yaml console=tty1 console=ttyS0,115200 ---"
    truncate -s 24G "$W/disk.raw"
    if [ "$SCEN" = guard-jersey ]; then
      APPEND="autoinstall $APPEND"
      echo "building a jersey-shore-looking disk (default Ubuntu layout: ESP, /boot, LVM ubuntu-vg/ubuntu-lv; kiosk files in root)"
      docker run --rm --privileged -v "$W:/w" -v "$ROOT/tests/deploy:/t:ro" ubuntu:24.04 bash /t/make-jersey-fixture.sh
      cp -c "$W/disk.raw" "$W/disk.before.raw" 2>/dev/null || cp "$W/disk.raw" "$W/disk.before.raw"
      DRIVER=(--scenario guard-refuse --screenshot "$W/refusal-screen.png")
    else
      DRIVER=(--scenario confirm-prompt --screenshot "$W/prompt-screen.png")
    fi
    QEMU+=(-drive id=hd,if=none,format=raw,file="$W/disk.raw" -device ide-hd,bus=ahci.0,drive=hd
           -kernel "$W/casper/vmlinuz" -initrd "$W/casper/initrd" -append "$APPEND")
    TIMEOUT=$((90 * 60))
    ;;
  *) echo "unknown scenario $SCEN" >&2; exit 2 ;;
esac

echo "VM ($SCEN) starting; serial log: $W/serial.log"
"${QEMU[@]}" > "$W/qemu.log" 2>&1 &
QPID=$!
# shellcheck disable=SC2329
cleanup() { kill "$QPID" 2>/dev/null || true; wait "$QPID" 2>/dev/null || true; rm -rf "$SOCKS"; }
trap cleanup EXIT
rc=0
python3 "$ROOT/tests/deploy/stick-vm-driver.py" --serial "$SOCKS/s" --monitor "$SOCKS/m" \
  --log "$W/serial.log" --deadline "$TIMEOUT" "${DRIVER[@]}" || rc=$?

if [ "$SCEN" = full ] || [ "$SCEN" = recheck ]; then
  for _ in $(seq 1 60); do kill -0 "$QPID" 2>/dev/null || break; sleep 5; done   # let poweroff finish
else
  cleanup
  if [ "$SCEN" = confirm-prompt ]; then
    used="$(du -k "$W/disk.raw" | cut -f1)"
    if [ "$used" -le 8 ]; then   # sparse file: any write would allocate blocks
      echo "PASS: the disk is still empty, nothing allocated (nothing was written)"
    else echo "FAIL: the disk was written to ($used KB allocated)"; rc=1; fi
  else
    if cmp -s "$W/disk.raw" "$W/disk.before.raw"; then echo "PASS: the jersey-shore disk is byte-identical after the refusal"
    else echo "FAIL: the jersey-shore disk CHANGED"; rc=1; fi
    rm -f "$W/disk.before.raw"
  fi
  rm -f "$W/disk.raw"
fi
echo "result: $([ "$rc" = 0 ] && echo PASS || echo FAIL) ($SCEN); logs in $W"
exit "$rc"
