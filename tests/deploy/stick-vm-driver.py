#!/usr/bin/env python3
"""Serial-console driver for tests/deploy/test-stick-qemu.sh.

Connects to the QEMU serial socket (QEMU waits for us before starting the
guest), logs everything, and walks one scenario by matching console output:

  full            guard OK -> late-commands done -> first-boot kiosk install
                  -> reboot -> serial login -> health checks -> screenshot
                  -> poweroff
  confirm-prompt  guard OK, then subiquity's "Continue with autoinstall?"
                  question appears; we do NOT answer, the caller kills the VM
  guard-refuse    the guard prints REFUSING TO INSTALL; caller kills the VM

Exit 0 = scenario passed. Prints PASS:/FAIL: lines.
"""
import argparse, os, re, select, signal, socket, sys, time

ANSI = re.compile(rb"\x1b\[[0-9;?]*[A-Za-z]|\x1b[()][A-Z0-9]|\r")


class Console:
    def __init__(self, path, log):
        self.s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        for _ in range(100):
            try:
                self.s.connect(path)
                break
            except OSError:
                time.sleep(0.2)
        else:
            raise SystemExit(f"FAIL: cannot connect to {path}")
        self.log = open(log, "ab", buffering=0)
        self.buf = b""
        self.pos = 0  # matches are searched after this offset

    def _pump(self, timeout):
        r, _, _ = select.select([self.s], [], [], timeout)
        if not r:
            return True
        data = self.s.recv(65536)
        if not data:
            return False
        self.log.write(data)
        self.buf += ANSI.sub(b"", data)
        return True

    def expect(self, patterns, timeout, what, quiet=False):
        """Wait for the first of patterns (regex str) after self.pos."""
        regs = [re.compile(p.encode()) for p in patterns]
        end = time.time() + timeout
        while time.time() < end:
            for i, r in enumerate(regs):
                m = r.search(self.buf, self.pos)
                if m:
                    self.pos = m.end()
                    return i, m
            if not self._pump(min(5, max(0.1, end - time.time()))):
                print(f"FAIL: console closed while waiting for {what}")
                return None, None
        if not quiet:
            print(f"FAIL: timeout ({timeout}s) waiting for {what}")
        return None, None

    def send(self, text):
        self.s.sendall(text.encode())


def step(ok, msg):
    print(("PASS: " if ok else "FAIL: ") + msg, flush=True)
    return ok


def monitor(path, cmd):
    """Send one HMP command; return QEMU's reply text (or None)."""
    try:
        m = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        m.connect(path)
        m.settimeout(15)
        m.recv(4096)  # banner + prompt
        m.sendall((cmd + "\n").encode())
        time.sleep(4)
        reply = b""
        try:
            while True:
                chunk = m.recv(4096)
                if not chunk:
                    break
                reply += chunk
                if reply.rstrip().endswith(b"(qemu)"):
                    break
        except socket.timeout:
            pass
        m.close()
        return ANSI.sub(b"", reply).decode(errors="replace")
    except OSError as e:
        print(f"note: monitor command failed: {e}")
        return None


def screenshot(a):
    """PNG of the VGA screen (what the touchscreen would show). QEMU writes
    PPM (always supported); we convert with zlib, no imaging library needed."""
    if not (a.monitor and a.screenshot):
        return
    import struct, zlib
    ppm = a.screenshot.rsplit(".", 1)[0] + ".ppm"
    monitor(a.monitor, f"screendump {ppm}")
    for _ in range(10):
        try:
            d = open(ppm, "rb").read()
            magic, dims, maxval, px = d.split(b"\n", 3)
            w, h = map(int, dims.split())
            if len(px) >= w * h * 3:
                break
        except (OSError, ValueError):
            pass
        time.sleep(1)
    else:
        print(f"note: no screenshot ({ppm} not written)")
        return
    raw = b"".join(b"\x00" + px[y * w * 3:(y + 1) * w * 3] for y in range(h))
    chunk = lambda t, b: struct.pack(">I", len(b)) + t + b + struct.pack(">I", zlib.crc32(t + b) & 0xFFFFFFFF)
    with open(a.screenshot, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))
    os.remove(ppm)
    print(f"screenshot ({w}x{h}): {a.screenshot}")


def full(c, a):
    t0 = time.time()
    el = lambda: f"{(time.time() - t0) / 60:.0f} min"
    i, m = c.expect([r"eniac-guard: OK: Ubuntu will be installed on (/dev/[a-z0-9]+)", r"REFUSING TO INSTALL"], 60 * 60, "the stick guard")
    if i != 0:
        return step(False, "stick guard did not accept the blank disk")
    step(True, f"stick guard picked {m.group(1).decode()} ({el()})")
    i, _ = c.expect([r"eniac-late: done", r"eniac-late: release checksum FAILED", r"An error occurred|crash report|Traceback"], 180 * 60, "the end of late-commands")
    if i != 0:
        return step(False, "installer failed before late-commands finished")
    step(True, f"Ubuntu installed, late-commands done ({el()})")
    i, m = c.expect([r"eniac-firstboot: kiosk installed", r"KIOSK INSTALL FAILED", r"REFUSING TO INSTALL"], 150 * 60, "the first-boot kiosk install")
    if i == 2:
        return step(False, "after the install the VM booted the STICK again (boot order) and the guard refused")
    if i != 0:
        return step(False, "first-boot kiosk install failed")
    step(True, f"first boot: kiosk installed from the stick payload ({el()})")
    seg = c.buf[: c.pos]
    step(b"selftest: ok" in seg, "install.sh selftest line seen on the console")
    step(b"packages: offline" in seg, "first boot used the offline package bundle")
    i, _ = c.expect([r"login: ?$", r"login:"], 60 * 60, "the login prompt after the reboot into the exhibit")
    if i is None:
        return False
    step(True, f"rebooted into the installed system ({el()})")
    return health(c, a)


# Run as root on the installed box. Sent base64-encoded, so the markers only
# ever appear in the output, never in the echo of what we typed.
CHECK_SCRIPT = r"""
echo ==CHK-BEGIN==
echo "bridge=$(systemctl is-active eniac-touch-kiosk-bridge.service)"
echo "firstboot=$(systemctl is-enabled eniac-kiosk-firstboot.service 2>&1)"
echo "default=$(systemctl get-default)"
echo "http=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8740/)"
eniac-touch-kiosk selftest 2>&1 | tail -n 2
echo "chromium=$(dpkg-query -W -f='${Version}' chromium) $(readlink -f /usr/bin/chromium)"
echo "x=$(pgrep -c -u eniac-kiosk Xorg) chromium=$(pgrep -c -u eniac-kiosk -f chromium)"
echo "sources=$(ls /etc/apt/sources.list.d | tr '\n' ' ')"
echo "manifest-packages=$(grep -c '^package ' /opt/eniac-touch-kiosk/INSTALL-MANIFEST)"
echo "internet=$(timeout 8 curl -s -o /dev/null -w '%{http_code}' http://archive.ubuntu.com/ || true)"
echo "stick=$(sed -n 's/^stick-id=//p' /var/lib/eniac-stick/installed-by)"
echo "sshd=$(systemctl is-active ssh.socket 2>/dev/null) pwauth=$(cat /etc/ssh/sshd_config.d/*.conf 2>/dev/null | sed -n 's/^ *PasswordAuthentication  *//Ip' | head -n 1) keys=$(wc -l < /home/$SUDO_USER/.ssh/authorized_keys)"
efibootmgr | head -n 4
lsblk -o NAME,SIZE,TYPE,MOUNTPOINTS | head -n 12
eniac-touch-kiosk status 2>&1 | head -n 24
echo "firstboot-log-tail:"; tail -n 3 /var/log/eniac-kiosk-firstboot.log
echo "session-log:"; journalctl -b --no-pager -o cat -t eniac-touch-kiosk-session -t eniac-touch-kiosk-chromium | tail -n 25
echo "xorg-log-errors:"; grep -E '\(EE\)|modeset|Output .* connected' /home/eniac-kiosk/.local/share/xorg/Xorg.0.log 2>/dev/null | head -n 8
echo ==CHK-END==
"""


def health(c, a):
    time.sleep(a.settle)  # give X + Chromium (slow under TCG) time to come up
    c.send("\n")
    c.expect([r"login:"], 300, "login prompt")
    c.send(a.user + "\n")
    c.expect([r"[Pp]assword:"], 120, "password prompt")
    c.send(a.password + "\n")
    i, _ = c.expect([r"\$ $", r"\$ "], 300, "a shell")
    if i is None:
        return step(False, "could not log in on the serial console")
    import base64
    b64 = base64.b64encode(CHECK_SCRIPT.encode()).decode()
    pw = a.password.replace("'", "")
    c.send(f"echo {b64} | base64 -d > /tmp/chk.sh; echo '{pw}' | sudo -S -p '' bash /tmp/chk.sh\n")
    i, _ = c.expect([r"==CHK-END=="], 900, "health check output")
    begin = c.buf.rfind(b"==CHK-BEGIN==")
    out = c.buf[begin: c.pos].decode(errors="replace")
    print(out)
    ok = True
    ok &= step("bridge=active" in out, "bridge service active after the reboot")
    ok &= step("http=200" in out, "kiosk page served on 127.0.0.1:8740")
    ok &= step("selftest: ok" in out, "eniac-touch-kiosk selftest ok")
    ok &= step("firstboot=disabled" in out, "first-boot unit disabled itself")
    ok &= step("default=multi-user.target" in out, "default target multi-user")
    ok &= step(re.search(r"chromium=\S*xtradeb\S* (?!/snap/)", out) is not None, "chromium is the xtradeb .deb (not the snap)")
    src = re.search(r"sources=([^\n]*)", out)
    ok &= step(src is not None and "xtradeb" not in src.group(1), "offline install added no PPA source")
    ok &= step(re.search(r"internet=(000)?\s*\n", out) is not None, "the VM had no internet (offline install proven)")
    ok &= step(re.search(r"pwauth=no keys=[1-9]", out, re.I) is not None, "SSH: key only (password auth off, key installed)")
    xr = re.search(r"x=(\d+) chromium=(\d+)", out)
    ok &= step(xr is not None and xr.group(1) != "0", "X running on tty1 as eniac-kiosk")
    ok &= step(xr is not None and xr.group(2) != "0", "Chromium running as eniac-kiosk")
    screenshot(a)
    c.send(f"echo '{pw}' | sudo -S -p '' poweroff\n")
    return ok


def recheck(c, a):
    i, _ = c.expect([r"login:", r"REFUSING TO INSTALL"], 60 * 60, "the installed system's login prompt")
    if i != 0:
        return step(False, "did not boot the installed system (stick booted instead?)")
    step(True, "booted the installed disk (stick still attached)")
    return health(c, a)


def confirm_prompt(c, a):
    i, m = c.expect([r"eniac-guard: OK: Ubuntu will be installed on (/dev/[a-z0-9]+)", r"REFUSING TO INSTALL"], 60 * 60, "the stick guard")
    if i != 0:
        return step(False, "guard did not accept the blank disk")
    step(True, f"guard ran first and picked {m.group(1).decode()}")
    if a.screenshot:  # the guard holds its "WILL ERASE" banner for 15 s
        time.sleep(5)
        shot = a.screenshot
        a.screenshot = shot.replace(".png", "-banner.png")
        screenshot(a)
        a.screenshot = shot
    i, _ = c.expect([r"Continue with autoinstall\?", r"block-meta|run_curtin|partitioning"], 30 * 60, "the yes/no question")
    ok = step(i == 0, "installer stopped at 'Continue with autoinstall? (yes|no)' before touching the disk")
    if ok:
        time.sleep(20)  # let tty1 catch up
        screenshot(a)
    return ok


def guard_refuse(c, a):
    i, _ = c.expect([r"REFUSING TO INSTALL", r"eniac-guard: OK: Ubuntu will be installed"], 60 * 60, "the guard's verdict")
    if i != 0:
        return step(False, "guard accepted a disk it should have refused")
    c.expect([r"Power off, remove the USB stick"], 60, "end of refusal")
    found = re.findall(rb"eniac-guard: (FOUND: [^\n]*)", c.buf)
    for f in found:
        print("  " + f.decode(errors="replace"))
    step(bool(found), "refusal names what it found")
    i, _ = c.expect([r"Continue with autoinstall\?", r"block-meta|run_curtin|partitioning"], 120, "anything after the refusal", quiet=True)
    return step(i is None or i == 0, "installer did not proceed past the refusal")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--serial", required=True)
    p.add_argument("--monitor")
    p.add_argument("--log", required=True)
    p.add_argument("--scenario", choices=["full", "recheck", "confirm-prompt", "guard-refuse"], required=True)
    p.add_argument("--user", default="")
    p.add_argument("--password", default="")
    p.add_argument("--screenshot")
    p.add_argument("--settle", type=int, default=180)
    p.add_argument("--deadline", type=int, default=6 * 3600, help="overall timeout, seconds")
    a = p.parse_args()

    def overall(signum, frame):
        print(f"FAIL: overall deadline of {a.deadline}s reached", flush=True)
        sys.exit(1)

    signal.signal(signal.SIGALRM, overall)
    signal.alarm(a.deadline)
    c = Console(a.serial, a.log)
    fn = {"full": full, "recheck": recheck, "confirm-prompt": confirm_prompt, "guard-refuse": guard_refuse}[a.scenario]
    sys.exit(0 if fn(c, a) else 1)


if __name__ == "__main__":
    main()
