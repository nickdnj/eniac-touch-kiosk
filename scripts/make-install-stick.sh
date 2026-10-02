#!/usr/bin/env bash
# Build the ENIAC kiosk one-stick installer on this Mac (docs/deploy-x86.md,
# "One-stick install"): a remastered Ubuntu 24.04 live-server ISO that, booted
# on the OptiPlex, ERASES ITS INTERNAL DISK, installs Ubuntu unattended, and on
# first boot installs the kiosk from the release + apt packages on the stick.
#
#   scripts/make-install-stick.sh [options]          -> build/stick/*.iso (image only)
#   scripts/make-install-stick.sh --write-to diskN   -> also flash it (asks you to type the name)
#
# Options
#   --release FILE      use this release tarball (default: run `make release ARCH=amd64`)
#   --secrets FILE      admin account settings (default: ./stick.local.env if present, else prompt)
#   --hostname NAME     default eniac-kiosk
#   --timezone TZ       default America/New_York
#   --iso FILE          use this Ubuntu ISO instead of downloading (still checksum-verified)
#   --no-offline        don't bundle the apt packages: first boot then needs the network
#   --reuse-offline     reuse build/stick/offline from the last run (faster rebuilds)
#   --unattended-wipe   no "Continue with autoinstall? (yes|no)" question at all: the
#                       stick erases whatever internal disk it boots on (the kiosk guard
#                       still applies). You must type a confirmation to build it.
#   --serial-console    TESTING: also put the installer console on ttyS0 (QEMU)
#   --out FILE          output image path (default build/stick/eniac-kiosk-install-<ver>-<mode>.iso)
#   --write-to DEV      after building, write the image to DEV (e.g. disk4) -- external,
#                       removable disks only, with a typed confirmation. Never by default.
#   --image FILE        with --write-to: don't build, flash this already-built image
#
# Admin account (never committed; stick.local.env is .gitignored). Env vars
# override the --secrets file; anything still missing is prompted for:
#   ENIAC_ADMIN_USER=nick
#   ENIAC_ADMIN_PASSWORD_HASH='$6$...'      # openssl passwd -6   (not the password)
#   ENIAC_SSH_PUBKEY_FILE=~/.ssh/id_ed25519.pub   (or ENIAC_SSH_PUBKEY='ssh-ed25519 AAAA...')
#
# Why a remastered ISO (xorriso, "-boot_image any replay"): one file that
# balenaEtcher or dd writes as-is, boots UEFI and legacy BIOS exactly like the
# stock ISO, and carries the config, guard, release and packages on the ISO
# filesystem itself (/cdrom/eniac). A second CIDATA partition beside a dd'ed
# ISO would need partition surgery on the hybrid ISO layout from macOS, which
# is fragile; a cloud-init seed on a second stick is one more thing to lose.
#
# Needs: curl, shasum, openssl, and Docker (xorriso + the offline apt repo run
# in ubuntu:24.04 containers). A native `xorriso` (brew install xorriso) is
# used if present. gpg, if present, also verifies Ubuntu's SHA256SUMS signature.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
S="$ROOT/build/stick"
CACHE="$S/cache"
AI="$ROOT/deploy/autoinstall"
UBUNTU_URL=https://releases.ubuntu.com/24.04
UBUNTU_CD_KEY=843938DF228D22F7B3742BC0D94AA3F0EFE21092   # Ubuntu CD Image Automatic Signing Key (2012)

die()  { echo "make-install-stick: ERROR: $*" >&2; exit 1; }
log()  { echo "make-install-stick: $*" >&2; }
warn() { echo "make-install-stick: WARNING: $*" >&2; }

RELEASE="" SECRETS="" HOSTNAME_="eniac-kiosk" TZ_="America/New_York" ISO_IN="" OFFLINE=1 REUSE_OFFLINE=0
UNATTENDED=0 SERIAL=0 OUT="" WRITE_TO="" IMAGE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --release) RELEASE="$2"; shift ;;
    --secrets) SECRETS="$2"; shift ;;
    --hostname) HOSTNAME_="$2"; shift ;;
    --timezone) TZ_="$2"; shift ;;
    --iso) ISO_IN="$2"; shift ;;
    --no-offline) OFFLINE=0 ;;
    --reuse-offline) REUSE_OFFLINE=1 ;;
    --unattended-wipe) UNATTENDED=1 ;;
    --serial-console) SERIAL=1 ;;
    --out) OUT="$2"; shift ;;
    --write-to) WRITE_TO="$2"; shift ;;
    --image) IMAGE="$2"; shift ;;
    -h|--help) sed -n '2,43p' "$0"; exit 0 ;;
    *) die "unknown option $1 (try --help)" ;;
  esac
  shift
done

[[ "$HOSTNAME_" =~ ^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$ ]] || die "bad --hostname '$HOSTNAME_'"
[[ "$TZ_" =~ ^[A-Za-z0-9_+/-]+$ ]] || die "bad --timezone '$TZ_'"
if [ -n "$IMAGE" ]; then
  [ -n "$WRITE_TO" ] || die "--image only makes sense with --write-to"
  [ -f "$IMAGE" ] || die "no such image: $IMAGE"
  if [ -f "$IMAGE.sha256" ]; then
    (cd "$(dirname "$IMAGE")" && shasum -a 256 -c "$(basename "$IMAGE").sha256" >/dev/null) || die "$IMAGE does not match its .sha256"
  fi
fi

build_image() {
for t in curl shasum openssl; do command -v "$t" >/dev/null || die "$t not found"; done
if command -v xorriso >/dev/null; then XORRISO=native; else XORRISO=docker; fi
if [ "$XORRISO" = docker ] || [ "$OFFLINE" = 1 ]; then
  if ! { command -v docker >/dev/null && docker info >/dev/null 2>&1; }; then die "Docker must be running (for xorriso and/or the offline packages; --no-offline + brew install xorriso avoids it)"; fi
fi
mkdir -p "$S" "$CACHE"

# --- the unattended mode needs a deliberate yes -----------------------------
if [ "$UNATTENDED" = 1 ]; then
  [ -t 0 ] || die "--unattended-wipe needs an interactive confirmation (run it in a terminal)"
  cat >&2 <<'EOF'

  --unattended-wipe: the stick will NOT ask before erasing. Any PC that boots
  from it (and has exactly one internal disk with no kiosk on it) has that
  disk erased about 30 seconds after power-on, with nobody touching anything.
  Label the stick. Never leave it plugged into anything.

EOF
  read -r -p "  Type ERASE-ON-BOOT to build it: " ans
  [ "$ans" = ERASE-ON-BOOT ] || die "not confirmed; nothing built"
fi

# --- 1. the release -------------------------------------------------------------
if [ -z "$RELEASE" ]; then
  log "building the release: make release ARCH=amd64"
  RELEASE="$(cd "$ROOT" && make --no-print-directory release ARCH=amd64 | tee /dev/stderr | tail -n 1)"
fi
[ -f "$RELEASE" ] || die "release tarball not found: $RELEASE"
case "$RELEASE" in *-linux-amd64.tar.gz) ;; *) die "the OptiPlex needs an amd64 release, not $(basename "$RELEASE")" ;; esac
[ -f "$RELEASE.sha256" ] || die "missing $RELEASE.sha256"
(cd "$(dirname "$RELEASE")" && shasum -a 256 -c "$(basename "$RELEASE").sha256" >/dev/null) || die "release checksum mismatch: $RELEASE"
REL_NAME="$(basename "$RELEASE" .tar.gz)"
REL_VER="${REL_NAME#eniac-touch-kiosk-}"; REL_VER="${REL_VER%-linux-amd64}"
case "$REL_VER" in *.dirty) warn "release $REL_VER was built from uncommitted changes" ;; esac
log "release: $REL_NAME"

# --- 2. the Ubuntu ISO, checksum-verified ------------------------------------------
fetch_sums() {
  if curl -fsSL --retry 3 -o "$CACHE/SHA256SUMS.new" "$UBUNTU_URL/SHA256SUMS" \
     && curl -fsSL --retry 3 -o "$CACHE/SHA256SUMS.gpg.new" "$UBUNTU_URL/SHA256SUMS.gpg"; then
    mv "$CACHE/SHA256SUMS.new" "$CACHE/SHA256SUMS"; mv "$CACHE/SHA256SUMS.gpg.new" "$CACHE/SHA256SUMS.gpg"
  elif [ -f "$CACHE/SHA256SUMS" ]; then
    warn "offline: using the cached SHA256SUMS"
  else
    die "cannot fetch $UBUNTU_URL/SHA256SUMS"
  fi
}
verify_sums_sig() {
  if ! command -v gpg >/dev/null; then warn "gpg not installed: SHA256SUMS checked over HTTPS only (brew install gnupg to verify its signature)"; return 0; fi
  local gh="$CACHE/gnupg"; mkdir -p "$gh"; chmod 700 "$gh"
  if ! GNUPGHOME="$gh" gpg --batch --list-keys "$UBUNTU_CD_KEY" >/dev/null 2>&1; then
    # Plain HTTPS fetch + import (gpg's dirmngr is often unusable). Trust comes
    # from the pinned fingerprint checked in VALIDSIG below, not from the fetch.
    if ! curl -fsSL "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x$UBUNTU_CD_KEY" -o "$gh/ubuntu-cd.asc" \
       || ! GNUPGHOME="$gh" gpg --batch --quiet --import "$gh/ubuntu-cd.asc" >/dev/null 2>&1; then
      warn "could not fetch Ubuntu's signing key: SHA256SUMS checked over HTTPS only"; return 0
    fi
  fi
  GNUPGHOME="$gh" gpg --batch --status-fd 1 --verify "$CACHE/SHA256SUMS.gpg" "$CACHE/SHA256SUMS" 2>/dev/null \
    | grep -q "VALIDSIG $UBUNTU_CD_KEY" || die "SHA256SUMS signature does NOT verify against Ubuntu's key $UBUNTU_CD_KEY"
  log "SHA256SUMS signature verified (Ubuntu CD signing key)"
}
fetch_sums
verify_sums_sig
if [ -n "$ISO_IN" ]; then
  ISO="$ISO_IN"; ISO_NAME="$(basename "$ISO")"
else
  ISO_NAME="$(sed -n 's/^[0-9a-f]\{64\} \*\{0,1\}\(ubuntu-24\.04[.0-9]*-live-server-amd64\.iso\)$/\1/p' "$CACHE/SHA256SUMS" | sort -V | tail -n 1)"
  [ -n "$ISO_NAME" ] || die "no 24.04 live-server ISO listed in SHA256SUMS"
  ISO="$CACHE/$ISO_NAME"
fi
WANT="$(awk -v n="$ISO_NAME" '{f=$2; sub(/^\*/,"",f)} f==n {print $1}' "$CACHE/SHA256SUMS")"
[ -n "$WANT" ] || die "$ISO_NAME is not listed in Ubuntu's SHA256SUMS"
if [ ! -f "$ISO" ]; then
  log "downloading $ISO_NAME (~4 GB) to $CACHE"
  curl -fL --retry 3 -C - -o "$ISO.part" "$UBUNTU_URL/$ISO_NAME"
  mv "$ISO.part" "$ISO"
fi
log "verifying $ISO_NAME"
HAVE="$(shasum -a 256 "$ISO" | cut -d' ' -f1)"
[ "$HAVE" = "$WANT" ] || die "$ISO checksum mismatch (got $HAVE, want $WANT); delete it and re-run"

# --- 3. admin account (secrets: never written into the repo) -----------------------
if [ -z "$SECRETS" ] && [ -f "$ROOT/stick.local.env" ]; then SECRETS="$ROOT/stick.local.env"; fi
env_user="${ENIAC_ADMIN_USER:-}" env_hash="${ENIAC_ADMIN_PASSWORD_HASH:-}"
env_keyf="${ENIAC_SSH_PUBKEY_FILE:-}" env_key="${ENIAC_SSH_PUBKEY:-}"
if [ -n "$SECRETS" ]; then
  [ -f "$SECRETS" ] || die "--secrets file not found: $SECRETS"
  perm="$(stat -f %Lp "$SECRETS" 2>/dev/null || stat -c %a "$SECRETS")"
  [ "${perm: -2}" = 00 ] || warn "$SECRETS is readable by others (chmod 600 it)"
  # shellcheck disable=SC1090
  . "$SECRETS"
fi
ADMIN_USER="${env_user:-${ENIAC_ADMIN_USER:-}}"
PW_HASH="${env_hash:-${ENIAC_ADMIN_PASSWORD_HASH:-}}"
KEYFILE="${env_keyf:-${ENIAC_SSH_PUBKEY_FILE:-}}"
KEYS="${env_key:-${ENIAC_SSH_PUBKEY:-}}"
prompted=0
if [ -z "$ADMIN_USER" ]; then
  [ -t 0 ] || die "ENIAC_ADMIN_USER not set and no terminal to ask on"
  read -r -p "Admin user name for the kiosk box: " ADMIN_USER; prompted=1
fi
[[ "$ADMIN_USER" =~ ^[a-z_][a-z0-9_-]{0,31}$ ]] || die "bad admin user name '$ADMIN_USER'"
case "$ADMIN_USER" in root|eniac|eniac-kiosk|ubuntu) die "admin user can't be '$ADMIN_USER'" ;; esac
if [ -z "$PW_HASH" ]; then
  [ -t 0 ] || die "ENIAC_ADMIN_PASSWORD_HASH not set and no terminal to ask on"
  read -r -s -p "Password for $ADMIN_USER (console + sudo): " p1; echo >&2
  read -r -s -p "Again: " p2; echo >&2
  [ "$p1" = "$p2" ] || die "passwords differ"
  [ "${#p1}" -ge 8 ] || die "use at least 8 characters"
  PW_HASH="$(printf '%s' "$p1" | openssl passwd -6 -stdin)"; unset p1 p2; prompted=1
fi
[[ "$PW_HASH" =~ ^\$(6|5|y)\$[./0-9A-Za-z$=,]+$ ]] || die "ENIAC_ADMIN_PASSWORD_HASH is not a crypt hash (\$6\$..., from: openssl passwd -6)"
if [ -z "$KEYS" ] && [ -z "$KEYFILE" ] && [ -t 0 ]; then
  def=""; for f in ~/.ssh/id_ed25519.pub ~/.ssh/id_rsa.pub; do [ -f "$f" ] && { def="$f"; break; }; done
  read -r -p "SSH public key file for $ADMIN_USER [${def:-none}]: " KEYFILE; KEYFILE="${KEYFILE:-$def}"; prompted=1
fi
KEYFILE="${KEYFILE/#\~/$HOME}"
if [ -n "$KEYFILE" ]; then [ -f "$KEYFILE" ] || die "SSH key file not found: $KEYFILE"; KEYS="$(cat "$KEYFILE")"; fi
SSH_KEYS="[]"; ALLOW_PW=true; nkeys=0
if [ -n "$KEYS" ]; then
  list=""
  while IFS= read -r k; do
    k="${k%$'\r'}"; [ -n "$k" ] || continue
    [[ "$k" =~ ^(ssh-(ed25519|rsa)|ecdsa-sha2-nistp(256|384|521)|sk-[a-z0-9@.-]+)\ [A-Za-z0-9+/=]+(\ [^\"\\]*)?$ ]] || die "not an SSH public key line: ${k:0:40}..."
    [[ "$k" == *PRIVATE* ]] && die "that is a private key"
    list="${list:+$list, }\"$k\""; nkeys=$((nkeys + 1))
  done <<<"$KEYS"
  SSH_KEYS="[$list]"; ALLOW_PW=false
fi
[ "$nkeys" -gt 0 ] || warn "no SSH key: SSH will accept the admin password instead"
if [ "$prompted" = 1 ] && [ -t 0 ]; then
  read -r -p "Save these (hash, not password) to $S/secrets.env for next time? [y/N] " a
  if [ "$a" = y ] || [ "$a" = Y ]; then
    ( umask 077; { echo "ENIAC_ADMIN_USER=$ADMIN_USER"; echo "ENIAC_ADMIN_PASSWORD_HASH='$PW_HASH'"; [ -n "$KEYFILE" ] && echo "ENIAC_SSH_PUBKEY_FILE=$KEYFILE"; } > "$S/secrets.env" )
    log "saved $S/secrets.env (gitignored; use --secrets $S/secrets.env)"
  fi
fi
log "admin user: $ADMIN_USER; SSH keys: $nkeys; SSH password login: $ALLOW_PW"

# --- 4. offline apt packages ---------------------------------------------------------
if [ "$OFFLINE" = 1 ]; then
  # Reuse only a bundle built for this ISO by this exact package recipe.
  OKEY="$ISO_NAME $(shasum -a 256 "$ROOT/scripts/stick/offline-repo.sh" | cut -c1-16)"
  if [ "$REUSE_OFFLINE" = 1 ] && [ -f "$S/offline/Packages" ] && [ "$(cat "$S/offline/.key" 2>/dev/null)" = "$OKEY" ]; then
    log "reusing $S/offline ($(find "$S/offline" -name '*.deb' | wc -l | tr -d ' ') packages)"
  else
    [ "$REUSE_OFFLINE" = 1 ] && log "the cached offline repo is for another ISO or package recipe: rebuilding"
    log "building the offline apt repo (amd64 container; a few minutes)"
    docker run --rm --platform linux/amd64 -v "$ISO:/iso:ro" -v "$ROOT:/src:ro" -v "$S:/out" ubuntu:24.04 \
      bash /src/scripts/stick/offline-repo.sh || die "offline repo build failed (--no-offline to skip; first boot then needs the network)"
    echo "$OKEY" > "$S/offline/.key"
  fi
fi

# --- 5. the payload: /cdrom/eniac on the stick ------------------------------------------
P="$S/payload/eniac"
rm -rf "$S/payload" && mkdir -p "$P/release"
cp "$RELEASE" "$RELEASE.sha256" "$P/release/"
if [ "$OFFLINE" = 1 ]; then cp -R "$S/offline" "$P/offline"; rm -f "$P/offline/.key"; fi
cp "$AI/stick-guard.sh" "$AI/late-commands.sh" "$AI/firstboot.sh" "$AI/eniac-kiosk-firstboot.service" "$P/"
MODE="confirm"; [ "$UNATTENDED" = 1 ] && MODE="UNATTENDED-WIPE"
STICK_ID="$REL_VER/$ISO_NAME/$(date -u +%Y%m%dT%H%M%SZ)/$(openssl rand -hex 4)"
cat > "$P/STICK-INFO" <<EOF
stick-id=$STICK_ID
release=$REL_NAME
ubuntu-iso=$ISO_NAME
mode=$MODE
offline-packages=$(if [ "$OFFLINE" = 1 ]; then find "$P/offline" -name '*.deb' | wc -l | tr -d ' '; else echo none; fi)
hostname=$HOSTNAME_
admin-user=$ADMIN_USER
built=$(date -u +%FT%TZ)
EOF
sed -e "s|@HOSTNAME@|$HOSTNAME_|" -e "s|@TIMEZONE@|$TZ_|" -e "s|@ADMIN_USER@|$ADMIN_USER|" \
    -e "s|@SSH_ALLOW_PW@|$ALLOW_PW|" "$AI/autoinstall.yaml.in" > "$P/autoinstall.yaml.tmp"
# The hash and keys contain characters sed would treat specially: substitute literally.
awk -v h="$PW_HASH" -v k="$SSH_KEYS" '{
  i = index($0, "@PASSWORD_HASH@"); if (i) $0 = substr($0, 1, i-1) h substr($0, i+15)
  i = index($0, "@SSH_KEYS@");      if (i) $0 = substr($0, 1, i-1) k substr($0, i+10)
  print }' "$P/autoinstall.yaml.tmp" > "$P/autoinstall.yaml"
rm -f "$P/autoinstall.yaml.tmp"
if grep -q '@[A-Z_]*@' "$P/autoinstall.yaml"; then die "unfilled template field in autoinstall.yaml"; fi
grep -q '__ENIAC_TARGET_DISK__' "$P/autoinstall.yaml" || die "target-disk placeholder missing"

# --- 6. grub: our entry first; the stock entries stay (manual install etc.) --------------
bsdtar_x() { if command -v bsdtar >/dev/null; then bsdtar -xOf "$ISO" "$1"; else tar -xOf "$ISO" "$1"; fi; }
bsdtar_x boot/grub/grub.cfg > "$S/payload/grub.cfg.orig" || die "could not read boot/grub/grub.cfg from the ISO"
grep -q '^menuentry "Try or Install Ubuntu Server"' "$S/payload/grub.cfg.orig" || die "unexpected grub.cfg in $ISO_NAME (layout changed?)"
CMDLINE="subiquity.autoinstallpath=/cdrom/eniac/autoinstall.yaml"
[ "$UNATTENDED" = 1 ] && CMDLINE="$CMDLINE autoinstall"
# After '---': copied into the installed system's kernel cmdline.
POSTCMD=""
if [ "$SERIAL" = 1 ]; then CMDLINE="$CMDLINE console=tty1 console=ttyS0,115200"; POSTCMD="console=tty1 console=ttyS0,115200"; fi
if [ "$UNATTENDED" = 1 ]; then
  TITLE="ENIAC kiosk: ERASE internal disk + install, NO QUESTIONS (unattended)"
else
  TITLE="ENIAC kiosk: ERASE internal disk + install (asks yes/no first)"
fi
awk -v title="$TITLE" -v cmdline="$CMDLINE" -v post="$POSTCMD" '
  /^set timeout=/ { print "set timeout=30"; print "set default=0"; next }
  !done && /^menuentry / {
    print "menuentry \"" title "\" {"
    print "\tset gfxpayload=keep"
    print "\tlinux\t/casper/vmlinuz " cmdline " ---" (post == "" ? "" : " " post)
    print "\tinitrd\t/casper/initrd"
    print "}"
    done = 1
  }
  { print }' "$S/payload/grub.cfg.orig" > "$S/payload/grub.cfg"
grep -q "autoinstallpath" "$S/payload/grub.cfg" || die "grub.cfg patch failed"

# --- 7. remaster ----------------------------------------------------------------------------
[ -n "$OUT" ] || OUT="$S/eniac-kiosk-install-$REL_VER-$MODE.iso"
need_mb=$(( $(du -sm "$ISO" | cut -f1) + $(du -sm "$S/payload" | cut -f1) + 200 ))
free_mb="$(df -Pm "$(dirname "$OUT")" | awk 'NR==2{print $4}')"
[ "$free_mb" -ge "$need_mb" ] || die "need ~$need_mb MB free in $(dirname "$OUT"), have $free_mb MB"
rm -f "$OUT" "$OUT.sha256"
XARGS=(-map /payload/eniac /eniac -map /payload/grub.cfg /boot/grub/grub.cfg -boot_image any replay)
log "writing $(basename "$OUT") with xorriso ($XORRISO)"
if [ "$XORRISO" = native ]; then
  (cd "$S" && xorriso -indev "$ISO" -outdev "$OUT" -map "$S/payload/eniac" /eniac -map "$S/payload/grub.cfg" /boot/grub/grub.cfg -boot_image any replay) 2>&1 | grep -vE '^xorriso : UPDATE' >&2
else
  odir="$(cd "$(dirname "$OUT")" && pwd)"
  docker run --rm -v "$ISO:/in.iso:ro" -v "$S/payload:/payload:ro" -v "$odir:/outdir" ubuntu:24.04 bash -c \
    "apt-get update -qq >/dev/null && apt-get install -y -qq --no-install-recommends xorriso >/dev/null && xorriso -indev /in.iso -outdev /outdir/$(basename "$OUT") ${XARGS[*]} 2>&1 | grep -vE '^xorriso : UPDATE'" >&2
fi
[ -s "$OUT" ] || die "xorriso produced nothing"
(cd "$(dirname "$OUT")" && shasum -a 256 "$(basename "$OUT")" > "$(basename "$OUT").sha256")
SIZE_MB=$(( $(stat -f %z "$OUT" 2>/dev/null || stat -c %s "$OUT") / 1000000 ))
log "image: $OUT ($SIZE_MB MB; use a stick of at least 8 GB)"
cat >&2 <<EOF

  Mode: $MODE. $( [ "$UNATTENDED" = 1 ] && echo "Boots -> ERASES the internal disk with no question." || echo "Boots -> asks 'Continue with autoinstall? (yes|no)' -> type yes -> ERASES the internal disk." )
  Flash it with balenaEtcher, or:  $0 --release $RELEASE --write-to diskN ...
  Then: docs/deploy-x86.md, "One-stick install".

EOF
}

if [ -n "$IMAGE" ]; then
  OUT="$IMAGE"
  case "$IMAGE" in *UNATTENDED-WIPE*) MODE="UNATTENDED-WIPE" ;; *) MODE="confirm" ;; esac
else
  build_image
fi

# --- 8. optional: write to a stick (never without an explicit device + typed confirmation) ---
[ -n "$WRITE_TO" ] || { echo "$OUT"; exit 0; }
[ "$(uname -s)" = Darwin ] || die "--write-to is implemented for macOS only; flash $OUT with your usual tool"
[ -t 0 ] || die "--write-to needs a terminal for the confirmation"
dev="${WRITE_TO#/dev/}"; dev="${dev#r}"
[[ "$dev" =~ ^disk[0-9]+$ ]] || die "--write-to wants a whole disk like disk4, not '$WRITE_TO'"
info="$(diskutil info "$dev" 2>/dev/null)" || die "no such disk: $dev"
field() { sed -n "s/^ *$1: *//p" <<<"$info" | head -n 1; }
loc="$(field 'Device Location')"; proto="$(field 'Protocol')"
[ "$loc" != Internal ] || die "$dev is an internal disk; refusing"
[ "$loc" = External ] || [ "$proto" = USB ] || die "$dev is not an external USB disk (location '$loc', protocol '$proto'); refusing"
[ "$(field 'Virtual')" != Yes ] || die "$dev is a virtual (APFS container) disk; refusing"
diskutil info / | grep -q "Part of Whole: *$dev\$" && die "$dev holds the running macOS; refusing"
dbytes="$(sed -n 's/^ *Disk Size: .*(\([0-9]*\) Bytes).*/\1/p' <<<"$info")"
ibytes="$(stat -f %z "$OUT")"
[ -n "$dbytes" ] && [ "$dbytes" -ge "$ibytes" ] || die "$dev is too small for the image"
echo >&2; diskutil list "$dev" >&2
echo >&2
echo "  EVERYTHING on /dev/$dev ($(field 'Device / Media Name'), $(field 'Disk Size' | cut -d'(' -f1)) will be destroyed." >&2
read -r -p "  Type the disk name ($dev) to write the image to it: " ans
[ "$ans" = "$dev" ] || die "not confirmed; nothing written"
diskutil unmountDisk "/dev/$dev" >&2
log "writing (sudo dd; a few minutes)"
sudo dd if="$OUT" of="/dev/r$dev" bs=4m
sync
diskutil eject "/dev/$dev" >&2 || true
log "done: /dev/$dev holds $(basename "$OUT"). Label the stick ($MODE)."
echo "$OUT"
