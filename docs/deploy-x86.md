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
- USB keyboard (bench only), a ≥ 4 GB USB stick, Ethernet with internet
  for the install (apt + the Chromium PPA). The kiosk needs no network after.
- The Mac with this repo, for building the release and SSH.

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

It asks nothing and stores no secrets. Expect, in order: checksum
verification; apt installing X11, openbox, unclutter, xinput; the xtradeb
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

Known residue after `--purge-packages`: system users/groups that package
scripts create (for example `messagebus`, `polkitd`) are not removed by apt
purge and are not ours to delete; the container test lists them exactly.

The last-resort rollback is reinstalling Ubuntu (Steps 1–3).

## Troubleshooting

| Symptom | Look at |
|---|---|
| Black screen, no browser | The bridge is down: the session waits for it. `journalctl -u eniac-touch-kiosk-bridge -n 50` |
| Login prompt on tty1 instead of the exhibit | `systemctl cat getty@tty1` (another autologin drop-in?), `journalctl -t eniac-touch-kiosk-session` |
| GDM / a desktop appears | `systemctl get-default` must be `multi-user.target` |
| Installer: "/usr/bin/chromium is the snap" | `sudo snap remove chromium; sudo apt purge chromium-browser`, re-run |
| Touch offset or missing | Step 8 |
| Screen blanks | X must run with `-s 0 -dpms` (`ps -ef \| grep Xorg`); `x xset q` |
| Cursor visible | X runs with `-nocursor`; unclutter is the backup |

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
- **Not tested anywhere yet** (no systemd or X in a container): the systemd
  unit and its sandboxing, tty1 autologin, `startx` + `kiosk-session`, real
  Chromium kiosk mode, touch, BIOS power-on, and the OptiPlex itself.
  Install day is the first time those run; Steps 6–10 are the tests.
