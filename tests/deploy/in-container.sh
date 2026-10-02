#!/usr/bin/env bash
# pass() always succeeds, so `test && pass || bad` is safe here.
# shellcheck disable=SC2015,SC2012
# Runs INSIDE a throwaway ubuntu:24.04 container (see test-install-container.sh).
# No systemd and no X in a container, so this covers: preflight, apt (X11
# packages + Chromium .deb from the xtradeb PPA), users, files, manifest,
# idempotent re-run, the bridge + core running as `eniac`, the headless
# selftest, a headless Chromium render of the kiosk page, and removal with
# a before/after diff. It does NOT cover: systemd units, tty1 autologin,
# startx/kiosk-session, touch, or power behaviour.
set -uo pipefail
TARBALL="$1"
fail=0
pass() { echo "PASS: $*"; }
bad()  { echo "FAIL: $*"; fail=1; }

export DEBIAN_FRONTEND=noninteractive
snapshot() { # what an install may touch, minus apt's caches and logs
  {
    dpkg-query -W -f='${db:Status-Status} ${Package}\n' | awk '$1=="installed"{print "pkg " $2}'
    cut -d: -f1 /etc/passwd | sed 's/^/user /'
    cut -d: -f1 /etc/group | sed 's/^/group /'
    find /etc /opt /usr/local /home /var/lib /run -xdev \
      \( -path /var/lib/apt -o -path /var/lib/dpkg -o -path /var/cache -o -path /var/lib/ucf \
         -o -path /etc/ld.so.cache -o -path /var/lib/systemd/deb-systemd-helper-enabled \) -prune -o -print 2>/dev/null | sed 's/^/path /'
  } | LC_ALL=C sort
}

echo "== server-like baseline"
# A bare ubuntu:24.04 image lacks what every Ubuntu 24.04 Server install has;
# without these the installer would "add" systemd/dbus and removal would
# leave their maintainer-script users and dirs behind, which is not what
# happens on a real box.
base_ok=0
for _ in 1 2 3; do
  apt-get update -q >/dev/null 2>&1
  if apt-get install -y -q --no-install-recommends \
       systemd systemd-sysv dbus udev iproute2 procps sudo software-properties-common >/dev/null; then base_ok=1; break; fi
  sleep 20
done
[ "$base_ok" = 1 ] && pass "baseline packages present" || bad "baseline install failed (network?)"

echo "== snapshot before"
snapshot > /tmp/before.txt

echo "== unpack + install"
mkdir -p /root/rel && tar -xzf "$TARBALL" -C /root/rel
REL="$(ls -d /root/rel/eniac-touch-kiosk-*)"
if "$REL/install.sh" > /tmp/install1.log 2>&1; then pass "install.sh exit 0"; else bad "install.sh failed"; tail -40 /tmp/install1.log; fi
tail -5 /tmp/install1.log

echo "== checks"
id eniac >/dev/null 2>&1 && pass "user eniac" || bad "no user eniac"
id eniac-kiosk >/dev/null 2>&1 && pass "user eniac-kiosk" || bad "no user eniac-kiosk"
if id -nG eniac-kiosk | tr ' ' '\n' | grep -qxE 'sudo|admin|adm'; then bad "eniac-kiosk is an admin"; else pass "eniac-kiosk has no sudo ($(id -nG eniac-kiosk))"; fi
[ "$(passwd -S eniac-kiosk | awk '{print $2}')" = L ] && pass "eniac-kiosk password locked" || bad "eniac-kiosk password not locked"
for f in /opt/eniac-touch-kiosk/current/bin/eniac-bridge /etc/eniac-touch-kiosk/config.yaml /etc/eniac-touch-kiosk/config.yaml.dist \
         /etc/systemd/system/eniac-touch-kiosk-bridge.service /etc/systemd/system/getty@tty1.service.d/eniac-touch-kiosk-autologin.conf \
         /home/eniac-kiosk/.bash_profile /home/eniac-kiosk/.xinitrc /usr/local/bin/eniac-touch-kiosk /usr/local/sbin/eniac-touch-kiosk-uninstall \
         /etc/apt/preferences.d/eniac-touch-kiosk-chromium /opt/eniac-touch-kiosk/INSTALL-MANIFEST; do
  [ -e "$f" ] && pass "exists $f" || bad "missing $f"
done
cbin="$(readlink -f /usr/bin/chromium)"
[[ "$cbin" != /snap/* ]] && ! grep -qs /snap/ /usr/bin/chromium && pass "chromium is not the snap ($cbin)" || bad "chromium is the snap"
policy="$(apt-cache policy chromium)"; sed -n '1,8p' <<<"$policy"
grep -q 'Installed: .*xtradeb' <<<"$policy" && pass "chromium candidate comes from the xtradeb PPA" || bad "chromium not from xtradeb"
if dpkg -l chromium-browser 2>/dev/null | grep -q '^ii'; then bad "snap shim chromium-browser installed"; else pass "no chromium-browser shim"; fi
v="$(runuser -u eniac-kiosk -- /usr/bin/chromium --version 2>/dev/null)" && pass "chromium runs: $v" || bad "chromium --version failed"
echo "-- manifest"; grep -v '^package ' /opt/eniac-touch-kiosk/INSTALL-MANIFEST; echo "package lines: $(grep -c '^package ' /opt/eniac-touch-kiosk/INSTALL-MANIFEST)"

echo "== idempotent re-run"
cp /opt/eniac-touch-kiosk/INSTALL-MANIFEST /tmp/manifest1
if "$REL/install.sh" > /tmp/install2.log 2>&1; then pass "second install.sh exit 0"; else bad "second install failed"; tail -30 /tmp/install2.log; fi
grep -q 'already installed and identical' /tmp/install2.log && pass "second run did not re-copy the release" || bad "second run re-copied"
cmp -s /tmp/manifest1 /opt/eniac-touch-kiosk/INSTALL-MANIFEST && pass "manifest unchanged by re-run" || { bad "manifest changed"; diff /tmp/manifest1 /opt/eniac-touch-kiosk/INSTALL-MANIFEST; }
[ "$(ls /opt/eniac-touch-kiosk/releases | wc -l)" = 1 ] && pass "one release dir" || bad "releases: $(ls /opt/eniac-touch-kiosk/releases)"

echo "== upgrade to a second release, offline (--no-packages)"
REL2=/root/rel/next && cp -a "$REL" "$REL2"
sed -i 's/^version=.*/version=9.9.9-test/' "$REL2/BUILD-INFO"
(cd "$REL2" && find . -type f ! -name SHA256SUMS | LC_ALL=C sort | sed "s|^\./||" | xargs sha256sum) > /tmp/sums && mv /tmp/sums "$REL2/SHA256SUMS"
if "$REL2/install.sh" --no-packages > /tmp/install3.log 2>&1; then pass "upgrade install exit 0"; else bad "upgrade failed"; tail -20 /tmp/install3.log; fi
[ "$(readlink /opt/eniac-touch-kiosk/current)" = releases/9.9.9-test ] && pass "current -> 9.9.9-test" || bad "current -> $(readlink /opt/eniac-touch-kiosk/current)"
[ "$(readlink /opt/eniac-touch-kiosk/previous)" = "releases/$(sed -n 's/^version=//p' "$REL/BUILD-INFO")" ] && pass "previous -> first release" || bad "previous -> $(readlink /opt/eniac-touch-kiosk/previous)"
"$REL/install.sh" --no-packages > /tmp/install4.log 2>&1 && pass "re-install of the first release (manual rollback) exit 0" || bad "reinstall first failed"
[ "$(readlink /opt/eniac-touch-kiosk/previous)" = releases/9.9.9-test ] && pass "previous -> 9.9.9-test after going back" || bad "previous wrong after going back"
[ "$(ls /opt/eniac-touch-kiosk/releases | wc -l)" = 2 ] && pass "two release dirs kept" || bad "releases: $(ls /opt/eniac-touch-kiosk/releases)"

echo "== bridge as eniac (what the systemd unit runs), selftest, page"
install -d -o eniac -g eniac -m 0750 /run/eniac-touch-kiosk /var/lib/eniac-touch-kiosk
runuser -u eniac -- /opt/eniac-touch-kiosk/current/bin/eniac-bridge serve --config /etc/eniac-touch-kiosk/config.yaml > /tmp/bridge.log 2>&1 &
BPID=$!
for _ in $(seq 1 30); do (exec 3<>/dev/tcp/127.0.0.1/8740) 2>/dev/null && break; sleep 1; done
if (exec 3<>/dev/tcp/127.0.0.1/8740) 2>/dev/null; then pass "bridge listening on 127.0.0.1:8740"; else bad "bridge not listening"; cat /tmp/bridge.log; fi
resp="$(exec 3<>/dev/tcp/127.0.0.1/8740; printf 'GET / HTTP/1.0\r\nHost: 127.0.0.1:8740\r\n\r\n' >&3; cat <&3)"
grep -q '200 OK' <<<"$resp" && grep -qi '<html' <<<"$resp" && pass "GET / serves the kiosk page" || bad "GET / failed: ${resp:0:300}"
if eniac-touch-kiosk selftest; then pass "selftest (Squares on the amd64 core)"; else bad "selftest failed"; fi
eniac-touch-kiosk version
echo "== headless Chromium render (as eniac-kiosk, 1920x1080)"
if timeout 120 runuser -u eniac-kiosk -- /usr/bin/chromium --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
     --user-data-dir=/tmp/hl-profile --window-size=1920,1080 --virtual-time-budget=8000 \
     --screenshot=/tmp/kiosk-1920x1080.png http://127.0.0.1:8740/ > /tmp/chromium.log 2>&1 && [ -s /tmp/kiosk-1920x1080.png ]; then
  pass "headless Chromium rendered the page ($(stat -c %s /tmp/kiosk-1920x1080.png) bytes)"
else
  bad "headless Chromium render failed"; tail -15 /tmp/chromium.log
fi
grep -q 'ws:' /tmp/bridge.log && grep 'ws:' /tmp/bridge.log | tail -3
kill "$BPID" 2>/dev/null; wait "$BPID" 2>/dev/null
rm -rf /tmp/hl-profile

echo "== uninstall --purge-packages"
if eniac-touch-kiosk-uninstall --purge-packages > /tmp/uninstall.log 2>&1; then pass "uninstall exit 0"; else bad "uninstall failed"; fi
tail -25 /tmp/uninstall.log
apt-get update -q >/dev/null 2>&1
snapshot > /tmp/after.txt
if diff /tmp/before.txt /tmp/after.txt > /tmp/diff.txt; then
  pass "system identical to before install (packages, users, groups, files)"
else
  bad "differences after removal:"; cat /tmp/diff.txt
fi

echo "== uninstall again (nothing installed: must be a clean no-op)"
"$REL/uninstall.sh" > /tmp/uninstall2.log 2>&1 && pass "second uninstall exit 0" || { bad "second uninstall failed"; cat /tmp/uninstall2.log; }
exit $fail
