#!/bin/bash
# Runs INSIDE a throwaway ubuntu:24.04 linux/amd64 container, started by
# scripts/make-install-stick.sh. Builds the offline apt repo the stick carries
# so the kiosk installs on first boot with no network.
#
#   /iso  (ro)  the Ubuntu live-server ISO the stick is built from
#   /src  (ro)  this repo (for the apt pin in deploy/kiosk/install.sh)
#   /out        result: /out/offline/{*.deb,Packages,Release}
#
# The package set is resolved against the dpkg status of the system THIS ISO
# installs (read from its ubuntu-server squashfs layer), so the repo holds
# exactly what that system lacks, including any base libraries that must be
# upgraded alongside. It then proves it: a dry run that sees ONLY the new
# repo must install everything install.sh installs, against that same status.
set -euo pipefail
PKGS_X=(xserver-xorg xinit x11-xserver-utils xinput openbox unclutter)
PKGS_C=(chromium)
W=/work
OUT=/out/offline
log() { echo "offline-repo: $*" >&2; }
export DEBIAN_FRONTEND=noninteractive

log "tools"
apt-get update -q >/dev/null
apt-get install -y -q --no-install-recommends software-properties-common apt-utils squashfs-tools libarchive-tools ca-certificates gpg-agent >/dev/null

log "xtradeb PPA + the installer's pin (Chromium only from the PPA)"
add-apt-repository -y ppa:xtradeb/apps >/dev/null
sed -n "/cat > \"\$APT_PIN\" <<'EOF'/,/^EOF\$/p" /src/deploy/kiosk/install.sh | sed '1d;$d' > /etc/apt/preferences.d/eniac-touch-kiosk-chromium
grep -q 'chromium-browser' /etc/apt/preferences.d/eniac-touch-kiosk-chromium || { log "could not extract the pin from install.sh"; exit 1; }
apt-get update -q >/dev/null

log "target package status from the ISO's ubuntu-server layer"
mkdir -p "$W" && cd "$W"
bsdtar -xf /iso casper/ubuntu-server-minimal.ubuntu-server.squashfs casper/ubuntu-server-minimal.squashfs
unsquashfs -cat casper/ubuntu-server-minimal.ubuntu-server.squashfs var/lib/dpkg/status > status 2>/dev/null || true
[ -s status ] || unsquashfs -cat casper/ubuntu-server-minimal.squashfs var/lib/dpkg/status > status
rm -rf casper
log "  $(grep -c '^Package: ' status) packages installed on a fresh install from this ISO"

log "downloading what that system needs for the kiosk"
mkdir -p "$W/archives/partial"
STATUS=(-o "Dir::State::status=$W/status" -o "Dir::Cache::archives=$W/archives")
apt-get "${STATUS[@]}" install -y -q --download-only --no-install-recommends "${PKGS_X[@]}" "${PKGS_C[@]}" >/dev/null

rm -rf "$OUT" && mkdir -p "$OUT"
mv "$W"/archives/*.deb "$OUT/"
cd "$OUT"
apt-ftparchive packages . > Packages
apt-ftparchive -o APT::FTPArchive::Release::Origin=eniac-touch-kiosk-offline \
  -o APT::FTPArchive::Release::Label=eniac-touch-kiosk-offline \
  -o APT::FTPArchive::Release::Suite=noble release . > Release
log "  $(find . -name '*.deb' | wc -l) packages, $(du -sh . | cut -f1)"
grep -A1 '^Package: chromium$' Packages | head -n 2 >&2
sed -n '/^Package: chromium$/,/^$/p' Packages | grep -E '^(Version|Filename):' >&2

log "proof: dry run against the ISO's status, seeing ONLY this repo"
mkdir -p "$W/lists/partial" "$W/cache/archives/partial" "$W/no-parts"
echo "deb [trusted=yes] file:$OUT ./" > "$W/only-offline.list"
DRY=(-o "Dir::State::status=$W/status" -o "Dir::State::Lists=$W/lists" -o "Dir::Cache=$W/cache"
     -o "Dir::Etc::SourceList=$W/only-offline.list" -o "Dir::Etc::SourceParts=$W/no-parts")
apt-get "${DRY[@]}" update -q >/dev/null
apt-get "${DRY[@]}" install -s -q --no-install-recommends "${PKGS_X[@]}" "${PKGS_C[@]}" > "$W/dry.txt"
grep -q '^Inst chromium ' "$W/dry.txt" || { log "dry run did not install chromium"; cat "$W/dry.txt" >&2; exit 1; }
log "  dry run OK: $(grep -c '^Inst ' "$W/dry.txt") packages would install offline, chromium included"
chmod -R a+rX "$OUT"
