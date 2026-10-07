# Bring-up: ENIAC touch kiosk on a Dell OptiPlex 9020M (Ubuntu 24.04, x86-64)

The install-day procedure. Primary target: a **Dell OptiPlex 9020M** mini PC
running **Ubuntu 24.04 + X11 + Chromium kiosk**, driving a **24" landscape USB
touchscreen** (assumed 1920×1080; confirm on the day, Step 8). The Pi 5
remains supported by the same installer (see the end).

The recipe is the one already proven on the jersey-shore OptiPlex kiosk
(`jersey-shore-computer-company/src/controller`): X11 not Wayland, no desktop
environment, tty1 autologin → `startx` → Chromium, a Chromium **.deb** (never
the snap), and the BIOS set to power on after AC loss.

Do it on a desk with a keyboard first, not in the gallery.

## What you end up with

```
BIOS "AC Recovery: Power On"
  -> Ubuntu boots to multi-user.target (no display manager)
  -> eniac-touch-kiosk-bridge.service   (user eniac, Restart=always, 127.0.0.1:8740)
  -> getty@tty1 autologin eniac-kiosk -> ~/.bash_profile -> startx -nocursor -s 0 -dpms
     -> kiosk-session: xset off, openbox, wait for the bridge,
        Chromium --kiosk --app=http://127.0.0.1:8740/ (fresh tmpfs profile every start)
```

- Chromium dies → back in 3 s. X dies → autologin restarts it in ~5 s.
  Bridge or core dies → systemd/bridge restart it; the screen shows S10 meanwhile.
- Everything installed is listed in `/opt/eniac-touch-kiosk/INSTALL-MANIFEST`,
  and `sudo eniac-touch-kiosk-uninstall` removes exactly that.

| Path | What |
|---|---|
| `/opt/eniac-touch-kiosk/releases/<ver>`, `current`, `previous` | the release (bin, web, missions, upstream runtime files) |
| `/etc/eniac-touch-kiosk/config.yaml` (+ `.dist`, `session.env`) | config; kept across re-installs |
| `/var/lib/eniac-touch-kiosk/` | visitor metrics (JSONL) |
| `/etc/systemd/system/eniac-touch-kiosk-bridge.service` | the bridge unit |
| `/etc/systemd/system/getty@tty1.service.d/eniac-touch-kiosk-autologin.conf` | tty1 autologin |
| `/etc/apt/preferences.d/eniac-touch-kiosk-chromium` + the xtradeb PPA source | Chromium .deb, pinned |
| users `eniac` (system, no login) and `eniac-kiosk` (no sudo, password locked) | bridge / display |
| `/usr/local/bin/eniac-touch-kiosk`, `/usr/local/sbin/eniac-touch-kiosk-uninstall` | admin helper / removal |

## Bring

- The OptiPlex, its power brick, the touchscreen with **both** cables: video
  (the 9020M's outputs are DisplayPort; check the back panel, and use a
  DP→HDMI cable if the panel is HDMI-only) **and the USB touch cable**.
- USB keyboard (bench only) and a USB stick: **≥ 8 GB** for the one-stick
  install (the image is ~4.4 GB), ≥ 4 GB for the manual path.
- Network: **none needed** with the one-stick install (everything is on the
  stick). The manual path needs Ethernet with internet (apt + the Chromium
  PPA). The kiosk needs no network after either.
- The Mac with this repo, for building the release and SSH.

## Two ways to install

| | One-stick install (recommended) | Manual install (Steps 1–5) |
|---|---|---|
| At the box | BIOS once, boot the stick, type `yes`, walk away | Run the Ubuntu installer by hand, SSH in, copy the release, run `install.sh` |
| Network at the box | none | internet |
| Hands-on time | ~2 minutes, then ~30 minutes unattended (real hardware: estimate) | ~45 minutes |
| Disk | **erases the internal disk** | the Ubuntu installer erases it too (you choose) |

Both end in the same place (the table above). After either one, carry on at
**Step 6**.

## One-stick install

> **⚠ THIS STICK ERASES THE INTERNAL DISK OF THE MACHINE IT BOOTS ON.**
> Everything on the OptiPlex's SSD is destroyed: partitions, data, any old
> Ubuntu or Windows. Label the stick "ENIAC KIOSK INSTALLER: ERASES DISK",
> never leave it plugged into anything, and never boot it on a machine whose
> disk you want to keep.

One USB stick carries Ubuntu 24.04 Server, an unattended-install config, the
kiosk release and every apt package the kiosk needs (Chromium .deb included),
so the box needs no network. The flow:

```
boot stick -> grub menu (30 s, default = "ENIAC kiosk: ERASE internal disk + install")
  -> stick guard (read-only): picks the one internal disk, refuses on a kiosk
  -> "Continue with autoinstall? (yes|no)"  <- you type yes  (no question on an --unattended-wipe stick)
  -> Ubuntu on the SSD (LVM, whole disk), your admin user + SSH key, openssh
  -> late-commands: kiosk payload copied to the SSD, first-boot unit armed, UEFI: SSD first
  -> reboot (from the SSD, even with the stick still in)
  -> first boot: eniac-kiosk-firstboot runs install.sh --offline-repo=<bundle from the stick>,
     selftest, then reboots
  -> the exhibit
```

### Build the stick (on the Mac)

Needs Docker Desktop running (xorriso and the apt bundle run in Ubuntu
containers) and internet on the Mac. If `gpg` is installed
(`brew install gnupg`), it also verifies the signature on Ubuntu's checksum
list.

1. Admin account settings, once. Put them in `stick.local.env` at the repo
   root (gitignored; `chmod 600`), or skip this and the script prompts:
   ```bash
   ENIAC_ADMIN_USER=nick
   ENIAC_ADMIN_PASSWORD_HASH='$6$...'          # from: openssl passwd -6   (the hash, never the password)
   ENIAC_SSH_PUBKEY_FILE=~/.ssh/id_ed25519.pub   # optional; with a key, SSH is key-only
   ```
   The password is for the console and `sudo`. The hash and the public key
   end up on the stick and in the image under `build/stick/` (gitignored).
   Nothing secret goes into the repo. Keep the stick as safe as you would a
   note with the hash on it.
2. Build the image (from a clean, merged `main`):
   ```bash
   make install-stick          # = scripts/make-install-stick.sh
   ```
   This builds `make release ARCH=amd64`. It downloads the newest Ubuntu
   24.04.x live-server ISO into `build/stick/cache/` (once, ~4 GB) and checks
   it against Ubuntu's `SHA256SUMS`. It builds the offline apt bundle and
   proves it installs against that ISO's package set. Then it writes
   `build/stick/eniac-kiosk-install-<ver>-confirm.iso` (+ `.sha256`). It
   **writes to no disk**.
3. Flash it. Either use balenaEtcher (select the `.iso`, then the stick), or
   use the script, which accepts only an external/removable disk and makes
   you type its name:
   ```bash
   diskutil list                                    # find the stick, e.g. disk4
   make install-stick STICK_ARGS="--write-to disk4" # builds, then asks you to type "disk4"
   # or flash an image you already built, without rebuilding:
   scripts/make-install-stick.sh --image build/stick/eniac-kiosk-install-<ver>-confirm.iso --write-to disk4
   ```
   It refuses internal disks, APFS containers, disks that aren't external or
   USB, and anything smaller than the image. It needs `sudo` for the write.

Useful options (`scripts/make-install-stick.sh --help`): `--release FILE`
(use an existing tarball), `--hostname` (default `eniac-kiosk`),
`--timezone` (default `America/New_York`), `--reuse-offline` (faster
rebuilds), `--no-offline` (smaller stick, but first boot needs internet),
`--unattended-wipe` (below).

**Why a remastered ISO.** The script copies the stock ISO with xorriso
(`-boot_image any replay`), adding `/eniac/` (config, guard, release,
packages) and one grub menu entry. The result is one file that Etcher or
`dd` writes as-is, and it boots UEFI and legacy BIOS exactly like the stock
ISO. The alternatives are worse from a Mac. Adding a CIDATA partition behind
a `dd`-ed hybrid ISO means editing its partition tables by hand. A second
"seed" stick is one more thing to lose or mix up.

### Safety: how the stick avoids wiping the wrong machine

1. **It asks first (default).** The grub entry has no `autoinstall` keyword,
   so Ubuntu's installer stops at `Continue with autoinstall? (yes|no)`
   before it writes anything. Nothing happens until someone types `yes`.
   With `--unattended-wipe` there is no question: the stick erases the disk
   about a minute after power-on with nobody there. The script builds that
   version only after you type `ERASE-ON-BOOT`, and names the file
   `...-UNATTENDED-WIPE.iso`. Use it only if you really will walk away before
   the question would appear.
2. **The stick guard** runs before the question, read-only:
   - It picks the target: the one **internal** disk. The stick itself, any USB
     disk, removable media and disks under 16 GB are never candidates. If
     there is no candidate, or more than one, it refuses.
   - It looks inside that disk (activating LVM just to look, mounting
     read-only) and **refuses if the disk holds a kiosk**. That means the
     jersey-shore kiosk (`/opt/3280-kiosk`, `os32*.service`), an ENIAC kiosk
     (`/opt/eniac-touch-kiosk`, or an earlier install from a stick), any tty1
     autologin drop-in, or a Linux filesystem it can't mount to check.
     Windows or a plain Ubuntu doesn't stop it (the yes/no question does).
   - Only then does it write the disk into the install config. Until then
     the config names no disk, so if the guard is skipped the install fails
     instead of guessing a disk.

   A refusal prints `REFUSING TO INSTALL. NOTHING HAS BEEN WRITTEN TO ANY
   DISK.` and the reason. Power off and take the stick out.
3. **It doesn't loop.** After the install, the SSD's Ubuntu entry goes first
   in the UEFI boot order, so the reboot comes up from the SSD even with the
   stick still in. If it ever boots the stick again, the guard sees
   "installed by THIS stick" and refuses.

**Overrides** (only when you mean it): at the grub menu, highlight the ENIAC
entry, press `e`, add the flag before the ` ---` on the `linux` line, then
press `Ctrl+X`:

| Flag | Effect |
|---|---|
| `eniac.disk=/dev/sda` | install to this disk (needed if the box has two internal disks) |
| `eniac.overwrite-kiosk=yes` | erase the disk even though it holds a kiosk (e.g. re-imaging this ENIAC kiosk) |

The second menu entry, **Try or Install Ubuntu Server**, is the stock manual
installer: nothing automatic, and the kiosk isn't installed.

### Use the stick

1. Set up the BIOS first (Step 2 below): AC Recovery → Power On, keyboard
   errors off, **UEFI** boot. Leave the SSD first in the boot order.
2. Plug in the stick (and the touchscreen and keyboard). Power on, press
   **F12** at the Dell logo, and choose the USB stick under UEFI.
3. Grub shows its menu. After 30 s (or on Enter) it starts the ENIAC entry.
   About a minute later the guard holds a banner on screen for 15 seconds:
   ```
   ENIAC KIOSK INSTALLER
   WILL ERASE: /dev/sda  119.2G <SSD model>
   It holds:   <the OS it found, or "nothing recognisable">
   ```
   **Read it.** If that's not the OptiPlex's SSD, hold the power button
   now. The installer then scrolls on, and after a few more minutes
   (longer with no network, while it gives up on the mirror) it stops at
   `Continue with autoinstall? (yes|no)`. Type `yes` and press Enter.
4. Walk away. It installs Ubuntu, reboots, installs the kiosk (progress on
   screen), reboots again, and the exhibit appears. Pull the stick out any
   time after the first reboot.
5. Continue at **Step 6** (checks), using the admin account you set:
   `ssh <admin>@<ip>` if the box is on a network, or **Ctrl+Alt+F2** on the
   console.

If the kiosk step fails, tty1 shows a login prompt instead of the exhibit,
with the reason printed above it. It retries on every boot until it works,
or you can retry now with `sudo systemctl start eniac-kiosk-firstboot`. Logs:
`/var/log/eniac-kiosk-firstboot.log`, `/var/log/eniac-stick-guard.log` (what
the guard saw), and `journalctl -u eniac-kiosk-firstboot`.

**Network at install time.** None is needed. If the box *is* online, the
Ubuntu installer also fetches current security updates, and the kiosk step
still uses the bundle on the stick. If the bundle can't be installed and the
network is up, it retries online (apt + the xtradeb PPA). A box installed
offline gets no later Chromium updates unless you re-run `install.sh` online
(which adds the PPA). For an offline exhibit that's usually what you want.

### Desk test checklist (at home, before the museum)

- [ ] `make test` passes, then `make install-stick` on a clean, merged `main`.
- [ ] Stick labelled; image name ends in `-confirm.iso` (not `UNATTENDED-WIPE`).
- [ ] BIOS: AC Recovery → Power On, keyboard errors off, UEFI, SSD first.
- [ ] F12 → the stick. The guard names the SSD you expect (model and size). Type `yes`.
- [ ] Leave it. When you come back, the exhibit is on screen: no cursor, no bubbles. Note the total time.
- [ ] Pull the stick. `ssh <admin>@<ip>` with your key works (password SSH is refused if you gave a key).
- [ ] `eniac-touch-kiosk status` shows the bridge active and X and Chromium running; `sudo eniac-touch-kiosk selftest` prints `selftest: ok`.
- [ ] `cat /var/lib/eniac-stick/installed-by` names the stick you built.
- [ ] Steps 7–10 below: screen, display mode + touch (four corners), power-cut test ×3, failure drills.
- [ ] Optional: boot the stick again on the installed box. It must refuse (`already installed by THIS stick`). Power off.

## Manual install

The original path, without the one-stick installer. It's still useful when
the box already runs Ubuntu 24.04, or when you want to watch each step.

## Step 0: build the release (on the Mac, the day before)

```bash
make test                      # must pass
make release ARCH=amd64        # -> dist/eniac-touch-kiosk-<ver>-linux-amd64.tar.gz (+ .sha256)
```

`<ver>` is `0.1.0-dev+g<commit>`; a `.dirty` suffix means uncommitted
changes went in, so build from a clean, merged `main`. Optional rehearsal on
the Mac (Docker, ~15 min, emulated): `make test-install-container`.

## Step 1: flash Ubuntu 24.04 **Server** to the USB stick

Server, not Desktop: Desktop puts GDM on tty1. (If the box already runs
Ubuntu 24.04 Desktop, the installer still works: it switches the default
boot target to `multi-user.target` so GDM never starts, records the old
target, and the uninstaller restores it.)

1. Download `ubuntu-24.04.x-live-server-amd64.iso` from
   <https://ubuntu.com/download/server> and check it against the published
   `SHA256SUMS`: `shasum -a 256 ubuntu-24.04*-live-server-amd64.iso`.
2. Flash it with balenaEtcher, or from the Terminal:
   ```bash
   diskutil list                          # find the stick, e.g. /dev/disk4. Be sure.
   diskutil unmountDisk /dev/disk4
   sudo dd if=ubuntu-24.04.x-live-server-amd64.iso of=/dev/rdisk4 bs=4m status=progress
   diskutil eject /dev/disk4
   ```

## Step 2: BIOS (F2 at the Dell logo)

Names below are from the OptiPlex 9020 BIOS; wording varies a little by
BIOS revision.

| Setting | Value | Why |
|---|---|---|
| Power Management → **AC Recovery** | **Power On** | Gate: the exhibit must come back alone after a power cut. No script can set this. |
| POST Behavior → **Keyboard Errors** | Disable keyboard error detection | It must boot with no keyboard attached. |
| POST Behavior → Fastboot | Thorough (or Auto) | Reliable cold boot over speed. |
| General → **Boot Sequence** | UEFI; USB first for the install, then the internal SSD first | After the install, the SSD must be first so a stray USB stick can't hijack the boot. |
| Secure Boot | leave as is (Ubuntu supports it) | |
| Power Management → Deep Sleep Control | Disabled | Avoids odd power states after AC returns. |

Save (Apply → Exit). For a one-time USB boot without changing the order, use **F12**.

## Step 3: install Ubuntu Server

Boot the stick and accept the defaults except:

- **Hostname:** e.g. `eniac-kiosk`.
- **Your admin user:** choose the name and type the password at the prompt.
  It never goes into this repo or any script.
- **OpenSSH server:** install it (so the rest can be done from the Mac).
- **Featured snaps:** select none.
- Disk: use the whole SSD (the default LVM layout is fine).

Remove the stick when told to, reboot, log in, then:

```bash
sudo apt update && sudo apt full-upgrade -y && sudo reboot
ip -4 addr       # note the address for SSH
```

Back in the BIOS, put the SSD first in the boot order if it isn't.

## Step 4: copy the release over

From the Mac:

```bash
scp dist/eniac-touch-kiosk-<ver>-linux-amd64.tar.gz{,.sha256} <admin>@<ip>:
ssh <admin>@<ip>
sha256sum -c eniac-touch-kiosk-*-linux-amd64.tar.gz.sha256
```

(Or copy both files to a USB stick, mount it on the box, and `cp` them.)

## Step 5: install

Over SSH (preferred) or on the console:

```bash
tar xzf eniac-touch-kiosk-<ver>-linux-amd64.tar.gz
cd eniac-touch-kiosk-<ver>-linux-amd64
sudo ./install.sh
```

Over SSH it asks nothing (on a terminal it asks for the staff PIN if none
is set; `--no-pin` skips that). Expect, in order: checksum
verification; apt installing X11, openbox, unclutter, xinput, tk; the xtradeb
PPA being added and **Chromium installed as a .deb**; the two users; files;
the bridge started; and a line starting `selftest: ok squares:` (the
Squares mission booted headless on the real core, known answer checked).

It aborts before changing anything if: it isn't root; the release is
damaged; the release CPU doesn't match the box (`amd64`); the OS isn't Ubuntu
24.04 or Debian/Pi OS; ports 8740/8741 are taken; a user `eniac` or
`eniac-kiosk` already exists that it didn't create; or another tty1 autologin
drop-in exists (e.g. if this box was the jersey-shore kiosk: remove that
project first). `--force` overrides only the OS and tty1 checks.

Re-running it is safe: same release → nothing changes; newer release →
installed beside the old one, which becomes `previous`.

If you ran it **on the console (tty1)**: after the reboot tty1 *is* the
exhibit. For a shell use **Ctrl+Alt+F2** or SSH.

Then set the **staff PIN** (the hidden admin screen: 5 taps on the ENIAC
wordmark, top left). There is no default PIN; the museum's is 2468:

```bash
echo 2468 | sudo eniac-touch-kiosk set-pin --stdin   # or: sudo eniac-touch-kiosk set-pin (asks twice)
```

Only its bcrypt hash is stored (`/etc/eniac-touch-kiosk/admin-pin`,
0640 root:eniac); a new PIN applies at the next login, no restart.

## Step 6: reboot into the exhibit

```bash
sudo reboot
```

Hands off. Time it from power-on to the Start screen. Then from SSH:

```bash
eniac-touch-kiosk status     # release, bridge unit, X, Chromium
eniac-touch-kiosk logs       # bridge + session + Chromium, follow (Ctrl+C)
```

## Step 7: check the screen

- No cursor, no scrollbars, no "Chromium didn't shut down correctly" bubble,
  no "Restore pages?" prompt, no translate bar, no first-run page.
- Leave it 15 minutes untouched: the screen must **not** blank or dim (only
  the app's own attract/idle behaviour).

## Step 8: verify display mode and touch

From SSH (X runs as `eniac-kiosk` on `:0`):

```bash
x() { sudo -u eniac-kiosk -H env DISPLAY=:0 XAUTHORITY=/home/eniac-kiosk/.Xauthority "$@"; }
x xrandr --query            # the panel's connector shows "connected primary 1920x1080+0+0"
x xinput list               # a touch/digitizer device under "Virtual core pointer"
x xinput list-props "<touch device name>" | grep -i 'Coordinate Transformation'   # 1 0 0 0 1 0 0 0 1
```

- **Resolution:** write down what `xrandr` reports. If the native mode isn't
  1920×1080, the UI still scales, but record it and tell the UI owner.
- **Touch present:** no touch device listed means the **USB touch cable**
  isn't connected (video alone gives a perfect picture and no touch). Plug
  it in and run `sudo dmesg | tail -30`; a standard panel appears as a
  `hid-multitouch` device with no driver install.
- **Touch lands in the right place:** tap each of the four corners and the
  centre; the thing under your finger must react. The panel is landscape, so
  no rotation and the identity matrix are expected. If touch is offset or
  squashed (typically because a second output is connected), map it to the
  panel's output and restart the display:
  ```bash
  sudoedit /etc/eniac-touch-kiosk/session.env
  #   KIOSK_TOUCH_DEVICE="<name from xinput list>"
  #   KIOSK_OUTPUT="<connector from xrandr, e.g. DP-1>"
  sudo eniac-touch-kiosk restart-display
  ```
- Do a full Squares mission by touch.

## Step 9: the power-cut test (the gate)

1. With the exhibit running, **pull the plug at the wall** (not a shutdown).
2. Wait 10 s, plug it back in, hands off, start a timer.
3. It must reach the Start screen with nobody touching anything. Note the time.
4. **The monitor too:** some panels come back in standby and need their own
   button. If this one does, it fails the gate (look for a "power on after
   power loss" option in the monitor's OSD, or use a different panel).
5. Repeat three times, once in the middle of a mission.

## Step 10: failure drills (5 minutes)

```bash
sudo pkill -9 -f eniac-core                       # S10, then recovers by itself
sudo systemctl kill -s KILL eniac-touch-kiosk-bridge   # S10/E-LINK, bridge back in ~1 s
sudo pkill -u eniac-kiosk -f chromium             # black for ~3 s, Chromium back
sudo eniac-touch-kiosk restart-display            # X restarts, back in ~5-10 s
```

Then leave it running on the bench for as long as possible (ideally a week)
before it goes on the floor.

## Updating and rolling back a release

```bash
# copy the new tarball over as in Step 4, then:
tar xzf eniac-touch-kiosk-<new>-linux-amd64.tar.gz && cd eniac-touch-kiosk-<new>-linux-amd64
sudo ./install.sh --no-packages      # packages are already there; works offline
sudo eniac-touch-kiosk restart-display

sudo eniac-touch-kiosk rollback      # swap current <-> previous, restart bridge + display
```

Config edits in `/etc/eniac-touch-kiosk/config.yaml` survive both directions.
Exception: rolling back to a release from before the Original UI switch
(older than 2026-10-07) needs the `originalUi:` block removed first; see
below.

## Upgrading to the Original UI release (2026-10-07)

This release adds Brian L. Stuart's own Tk front end beside the kiosk
(design: `docs/original-ui-switch.md`): visitors get **Original room tour**
in Explore; staff get **Original UI** on the admin screen (5 taps, PIN). A
**Back to kiosk** button (top left) or 5 min idle (15 min for staff) brings
the kiosk back. The upgrade needs packages (`tk`), so run the installer
**with** packages. The installer appends the `originalUi:` block to the
existing `/etc/eniac-touch-kiosk/config.yaml` once and creates
`/run/eniac-touch-kiosk-ui` (tmpfiles.d).

```bash
# --- 1. On the Mac: test and build ------------------------------------------
cd ~/Workspaces/eniac-touch-kiosk
make test                                   # Go, web, and tests/deploy/test-ui-switch.sh (docker on a Mac)
tests/deploy/test-install-container.sh      # optional, ~20 min: install, original-ui checks, Xvfb smoke, removal
make release ARCH=amd64
REL=$(ls -t dist/eniac-touch-kiosk-*-linux-amd64.tar.gz | head -1); B=$(basename "$REL" .tar.gz); echo "$REL"
tar tzf "$REL" | grep -E 'original-ui/(bin/eniactk|images/e1900.ppm)$'   # both must print
K="ssh -i $HOME/.ssh/kiosk_3280 vcfed@10.130.10.42"

# --- 2. Snapshot what is there (the rollback reference) ----------------------
$K "ls /opt/eniac-touch-kiosk/releases; readlink /opt/eniac-touch-kiosk/current; \
    systemctl --no-pager status eniac-touch-kiosk-bridge | head -5; cat /etc/eniac-touch-kiosk/config.yaml"

# --- 3. Copy and check ---------------------------------------------------------
scp -i ~/.ssh/kiosk_3280 "$REL" "$REL.sha256" vcfed@10.130.10.42:
$K "sha256sum -c $B.tar.gz.sha256"

# --- 4. Install WITH packages (adds tk; records it in the manifest) ------------
$K "tar xzf $B.tar.gz && cd $B && sudo ./install.sh --no-pin"
#   expect: apt installs tk (+ tk8.6, tcl8.6, libxss1 ...);
#   "original UI: /run/eniac-touch-kiosk-ui via /etc/tmpfiles.d/eniac-touch-kiosk.conf";
#   "config: appended the originalUi block to /etc/eniac-touch-kiosk/config.yaml";
#   the bridge restarted; "selftest: ok squares: ..."
$K "command -v wish; ls -ld /run/eniac-touch-kiosk-ui; grep -n '^originalUi:' /etc/eniac-touch-kiosk/config.yaml"
#   /usr/bin/wish ; drwxrws--- eniac eniac-kiosk ; one originalUi: line

# --- 5. Staff PIN: 2468 (Nick's choice, 2026-10-07) ------------------------------
# The bridge has no default PIN; set it explicitly. Only the bcrypt hash is stored.
$K "echo 2468 | sudo eniac-touch-kiosk set-pin --stdin"
$K "sudo ls -l /etc/eniac-touch-kiosk/admin-pin"    # -rw-r----- root eniac
#   To change it later: sudo eniac-touch-kiosk set-pin (prompts twice, no echo).

# --- 6. The bridge sees the switch ---------------------------------------------
$K "curl -s 127.0.0.1:8740/healthz | grep -o '\"originalUi\":{[^}]*'"
#   expect "available":true

# --- 7. New X session (new kiosk-session + openbox config) -------------------
$K "sudo eniac-touch-kiosk restart-display"
sleep 20; $K "eniac-touch-kiosk status"            # Chromium kiosk running; original: not running

# --- 8. Remote round trip (no touch needed; keep it short on the floor) --------
$K "sudo eniac-touch-kiosk original-ui tour"
sleep 10; $K "pgrep -u eniac-kiosk -a eniactk; pgrep -u eniac-kiosk -a wish; sudo eniac-touch-kiosk original-ui status"
#   expect: eniactk -D, two wish processes, an active line mode=tour
$K "journalctl -t eniac-touch-kiosk-original-ui -n 30 --no-pager"   # "starting: tour, screen 1920x1080, images e1900"
$K "sudo eniac-touch-kiosk original-ui off"
sleep 10; $K "eniac-touch-kiosk status"            # Chromium kiosk running again
```

**On the floor, by touch** (Nick, or anyone at the box). Each check notes what to look for:

1. Explore, then **Original room tour**: the switching page, then Stuart's window. The view changes every 5 s. **Back to kiosk** is at the top left and nothing important is under it (UX Q29). Tap it: "Going back..." appears and S1 follows within about 5 s.
2. Tour again, then hands off for 5 min. At 4:30 the button counts down `0:30`, and at 0:00 the kiosk returns to S1.
3. Five taps on the wordmark: the S12 PIN pad. Enter a wrong PIN, then OK: "Not right", then back to the visitor screen. Enter **2468**, then OK: S13 with three buttons. Tap **Original UI**, then "Yes, switch": interactive Stuart window (no auto-cycling). Tap **LOAD CONF**: the menu draws over the Back button. Load `sq.e` and press INIT, then tap Back.
4. S13, then **Restart simulator**: S1, and attract restarts.
5. With the tour running, pull the power. It boots to the new kiosk (S1), never to the original UI.
6. `eniac-touch-kiosk logs` shows the matching `ui:` lines. After a few switches, the metrics for the month contain `original_ui_enter` and `original_ui_exit` records: `sudo tail /var/lib/eniac-touch-kiosk/metrics/$(date +%Y-%m).jsonl`.

**Rollback** (to the release before the switch). The old bridge reads config.yaml with unknown keys refused, so the appended `originalUi:` block must go **first**, or the old bridge will not start:

```bash
sudo cp /etc/eniac-touch-kiosk/config.yaml /etc/eniac-touch-kiosk/config.yaml.with-original-ui
sudo sed -i '/^# Original UI switch/,$d' /etc/eniac-touch-kiosk/config.yaml
sudo eniac-touch-kiosk rollback     # current <-> previous; restarts the bridge and the display
```

The old kiosk-session has no watcher, so a request just expires (`ttlS`) and does nothing. The tmpfiles directory, the PIN file and the `tk` package stay in place and are harmless. To go forward again: `sudo eniac-touch-kiosk rollback` once more (the installer's append puts the block back on the next install, or copy it back from `config.yaml.with-original-ui`).


## Removing it (rollback of the whole install)

```bash
sudo eniac-touch-kiosk-uninstall                    # everything except the apt packages
sudo eniac-touch-kiosk-uninstall --purge-packages   # also the packages it added
sudo eniac-touch-kiosk-uninstall --keep-data        # keep /var/lib/eniac-touch-kiosk (metrics)
```

It stops the bridge, ends the kiosk session (tty1 returns to a login
prompt), removes the units, autologin drop-in, `/opt`, `/etc`, `/var/lib`
and `/run` dirs, the PPA source and pin, both users, restores the old
default boot target, verifies nothing is left, and prints what it removed.
`--purge-packages` first simulates the purge and refuses if apt would remove
anything the installer didn't add; it never runs a blanket `autoremove`.
It works without the manifest too (half-finished install). Reboot afterwards.

In the container rehearsal (a server-like Ubuntu 24.04 baseline), install →
re-install → upgrade → `--purge-packages` leaves the package list, users,
groups and files under `/etc /opt /usr/local /home /var/lib /run` identical
to before. Caveat: if the installer had to pull in base packages such as
systemd or dbus (never the case on Ubuntu Server), purging them leaves the
system users their maintainer scripts created (`messagebus`, `polkitd`);
apt never removes those.

The last-resort rollback is reinstalling Ubuntu (Steps 1–3).

## Troubleshooting

| Symptom | Look at |
|---|---|
| Black screen, no browser | The bridge is down: the session waits for it. `journalctl -u eniac-touch-kiosk-bridge -n 50` |
| Black screen, `journalctl -t eniac-touch-kiosk-chromium` says "No usable sandbox!" | `chromium-sandbox` is missing (Ubuntu blocks Chromium's namespace sandbox): `sudo apt install chromium-sandbox`, or re-run `install.sh` from this release, which installs it |
| One-stick: `REFUSING TO INSTALL` | The guard's reason (each `FOUND:` line) is on screen just above the refusal. See "Safety" above for the overrides |
| One-stick: login prompt after the install, no exhibit | The first-boot kiosk install failed: `/var/log/eniac-kiosk-firstboot.log`; it retries each boot, or `sudo systemctl start eniac-kiosk-firstboot` |
| Login prompt on tty1 instead of the exhibit | `systemctl cat getty@tty1` (another autologin drop-in?), `journalctl -t eniac-touch-kiosk-session` |
| GDM / a desktop appears | `systemctl get-default` must be `multi-user.target` |
| Installer: "/usr/bin/chromium is the snap" | `sudo snap remove chromium; sudo apt purge chromium-browser`, re-run |
| Touch offset or missing | Step 8 |
| Screen blanks | X must run with `-s 0 -dpms` (`ps -ef \| grep Xorg`); `x xset q` |
| Cursor visible | X runs with `-nocursor`; unclutter is the backup |
| Stuck on Stuart's original screen (touch not working) | Over SSH: `sudo eniac-touch-kiosk original-ui off` (Chromium is back within a few seconds). `sudo eniac-touch-kiosk original-ui status` shows the request, `active` and `last` |
| Original room tour tile missing / S13 says "Not installed on this box." | `curl -s 127.0.0.1:8740/healthz` → `originalUi.reason`: `disabled` (no `originalUi:` block, or `enabled: false`), `no-switch-dir` (`/run/eniac-touch-kiosk-ui` missing: `sudo systemd-tmpfiles --create /etc/tmpfiles.d/eniac-touch-kiosk.conf`), `not-built` (release without `original-ui/`), `no-tk` (`sudo apt install tk`), `running` |
| The switching page says it did not start | `journalctl -t eniac-touch-kiosk-original-ui -t eniac-touch-kiosk-session -n 50`: the supervisor names what is missing (exit 20) or what died (exit 21) |
| S12 says "No staff PIN is set on this kiosk." | `sudo eniac-touch-kiosk set-pin` |

## Pi 5 (secondary)

The same installer runs on Raspberry Pi OS (Debian) arm64: build with
`make release ARCH=arm64`. Chromium then comes from the distro's `chromium`
package (no PPA). This path is **untested on a Pi**; the Model 4 test-box
coexistence install (dev-plan #26–#28, architecture 10.3) is a different,
not-yet-built profile and must not use this dedicated-kiosk installer.

## What has and hasn't been tested (as of this PR)

- **Tested on the Mac** (Docker, `ubuntu:24.04` linux/amd64, emulated):
  preflight, apt install of X11 + Chromium .deb from the xtradeb PPA (not the
  snap), users and groups, files and manifest, idempotent re-run, the amd64
  bridge + core running as `eniac` with the installed config, the Squares
  selftest, a headless Chromium render of the kiosk page at 1920×1080, and
  uninstall `--purge-packages` with a before/after system diff.
  Re-run after the one-stick PR, including the `chromium-sandbox` check.
- **One-stick install, tested in QEMU on the Mac** (`make test-stick-vm`;
  x86_64 emulated, UEFI/OVMF, the image attached as a USB stick, a SATA
  disk, **no internet**: user-mode network with `restrict=on`):
  - `full`: grub entry → guard picks the SATA disk and skips the USB stick →
    unattended Ubuntu 24.04.5 install → late-commands (payload staged, UEFI
    order set) → reboot **from the disk with the stick still in** → first
    boot installs the kiosk **offline** from the bundle (selftest ok) →
    reboot → checks over the serial console: bridge active, page 200,
    selftest ok, first-boot unit disabled, `multi-user.target`, xtradeb
    Chromium .deb, no PPA source added, SSH key-only, X on tty1, Chromium
    running as `eniac-kiosk`, and the ENIAC Start screen on the VM's display
    (`docs/screenshots/one-stick/`). 32–47 minutes emulated from power-on
    to the exhibit; real hardware should be faster.
  - The first run of that test found a real bug: Chromium exited every 3 s
    with "No usable sandbox!" and the screen stayed black. Ubuntu 24.04's
    AppArmor blocks Chromium's namespace sandbox, and `chromium-sandbox`
    (only a Recommends) wasn't installed. `install.sh` now installs it on
    both paths and refuses to finish without its setuid helper; the run
    above is after the fix.
  - `confirm-prompt`: with no `autoinstall` on the cmdline (the default
    stick), the guard runs, its WILL ERASE banner shows on the monitor
    (tty1), and the installer stops at `Continue with autoinstall?
    (yes|no)`. The disk is still empty afterwards.
  - `guard-jersey`: a disk laid out like a default Ubuntu install (ESP,
    /boot, LVM `ubuntu-vg/ubuntu-lv`) carrying the jersey-shore kiosk's
    files, booted **with** `autoinstall` (worst case): the guard refuses,
    names the five signatures it found, and the disk is byte-identical
    afterwards. Also refused: the same files on a whole-disk ext4.
  - `--write-to` refuses the Mac's internal disk, the APFS container, a
    partition, a missing disk and a non-terminal run. The actual `dd` to a
    stick has **not** been run (no stick was attached, and by design).
  - Run at most two of these VMs at once on a laptop. With three in
    parallel, subiquity's own `netplan apply` failed under the load (in
    both VMs that reached that step). Two at a time, as above, it passes.
- **Not tested anywhere yet:** the OptiPlex itself (its firmware, F12 boot,
  its SSD, real-speed timings), the touchscreen, Chromium actually painting
  the kiosk page on a real display, BIOS power-on after AC loss, and the
  stick on legacy-BIOS boot. The desk test (checklist above, then Steps
  6–10) is the first time those run.
