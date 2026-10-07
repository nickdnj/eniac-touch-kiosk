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
# Original UI switch (docs/original-ui-switch.md 8): tk/wish, the shipped
# original-ui/ tree, the tmpfiles dir, ReadWritePaths, the appended config
# block, set-pin + login with a 4-digit PIN, the SSH ui-request door, and a
# smoke run of the supervisor under Xvfb (eniactk + images + tk inactive on
# a real X server; xvfb is part of this container's baseline only).
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
       systemd systemd-sysv dbus udev iproute2 procps sudo software-properties-common xvfb >/dev/null; then base_ok=1; break; fi
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
sbx="$(dpkg -L chromium-sandbox 2>/dev/null | grep -m1 '/chrome-sandbox$')"
[ -n "$sbx" ] && [ -u "$sbx" ] && pass "chromium-sandbox setuid helper present ($sbx)" || bad "chromium-sandbox helper missing (Chromium can't start on Ubuntu 24.04)"
v="$(runuser -u eniac-kiosk -- /usr/bin/chromium --version 2>/dev/null)" && pass "chromium runs: $v" || bad "chromium --version failed"
echo "-- manifest"; grep -v '^package ' /opt/eniac-touch-kiosk/INSTALL-MANIFEST; echo "package lines: $(grep -c '^package ' /opt/eniac-touch-kiosk/INSTALL-MANIFEST)"

echo "== idempotent re-run"
cp /opt/eniac-touch-kiosk/INSTALL-MANIFEST /tmp/manifest1
if "$REL/install.sh" > /tmp/install2.log 2>&1; then pass "second install.sh exit 0"; else bad "second install failed"; tail -30 /tmp/install2.log; fi
grep -q 'already installed and identical' /tmp/install2.log && pass "second run did not re-copy the release" || bad "second run re-copied"
cmp -s /tmp/manifest1 /opt/eniac-touch-kiosk/INSTALL-MANIFEST && pass "manifest unchanged by re-run" || { bad "manifest changed"; diff /tmp/manifest1 /opt/eniac-touch-kiosk/INSTALL-MANIFEST; }
[ "$(ls /opt/eniac-touch-kiosk/releases | wc -l)" = 1 ] && pass "one release dir" || bad "releases: $(ls /opt/eniac-touch-kiosk/releases)"

echo "== original UI: package, release tree, switch dir, unit, config"
dpkg -s tk >/dev/null 2>&1 && pass "package tk installed" || bad "package tk missing"
[ -x /usr/bin/wish ] && pass "/usr/bin/wish present" || bad "no /usr/bin/wish"
grep -q '^package tk$' /opt/eniac-touch-kiosk/INSTALL-MANIFEST && pass "tk recorded in the manifest" || bad "tk not in the manifest"
OUI=/opt/eniac-touch-kiosk/current/original-ui
[ "$(head -c4 "$OUI/bin/eniactk" | od -An -c | tr -d ' ')" = '177ELF' ] && pass "original-ui/bin/eniactk is an ELF" || bad "eniactk is not an ELF"
"$OUI/bin/eniactk" -h 2>&1 | grep -q -- '-D' && pass "eniactk runs here (usage lists -D)" || bad "eniactk does not run"
[ -r "$OUI/programs/trajdemo.e" ] && [ -r "$OUI/demo.card" ] && pass "original-ui/programs/trajdemo.e and demo.card resolve" || bad "original-ui links broken"
[ -s "$OUI/images/e1900.ppm" ] && [ -s "$OUI/images/e1900s5.ppm" ] && [ -s "$OUI/images/control.ppm" ] && pass "original-ui/images has the 1900 set" || bad "images missing"
[ -f /etc/tmpfiles.d/eniac-touch-kiosk.conf ] && grep -q '^file /etc/tmpfiles.d/eniac-touch-kiosk.conf$' /opt/eniac-touch-kiosk/INSTALL-MANIFEST && pass "tmpfiles conf written and recorded" || bad "tmpfiles conf"
[ "$(stat -c '%a %U:%G' /run/eniac-touch-kiosk-ui 2>/dev/null)" = "2770 eniac:eniac-kiosk" ] && pass "/run/eniac-touch-kiosk-ui is 2770 eniac:eniac-kiosk" || bad "switch dir: $(stat -c '%a %U:%G' /run/eniac-touch-kiosk-ui 2>&1)"
grep -qx 'ReadWritePaths=-/run/eniac-touch-kiosk-ui' /etc/systemd/system/eniac-touch-kiosk-bridge.service && pass "bridge unit has ReadWritePaths" || bad "unit lacks ReadWritePaths"
[ "$(grep -c '^originalUi:' /etc/eniac-touch-kiosk/config.yaml)" = 1 ] && pass "config.yaml has one originalUi block" || bad "originalUi blocks: $(grep -c '^originalUi:' /etc/eniac-touch-kiosk/config.yaml)"
[ ! -e /etc/eniac-touch-kiosk/admin-pin ] && pass "no default PIN (no TTY: not prompted)" || bad "a PIN file exists without set-pin"
grep -q 'set-pin' /tmp/install1.log && pass "installer says how to set the PIN" || bad "no set-pin reminder"

echo "== original UI: an old config.yaml gets the block appended once"
sed -n '/^# Original UI switch/,$!p' /etc/eniac-touch-kiosk/config.yaml | grep -v -e 'pinFile' -e 'uiSwitch:' -e 'originalUi:' > /tmp/old-config.yaml
sed -i 's/^admin: .*/admin: { sessionTimeoutS: 120, allowPowerActions: false, allowUpdates: false }/' /tmp/old-config.yaml
cp /tmp/old-config.yaml /etc/eniac-touch-kiosk/config.yaml
"$REL/install.sh" --no-packages > /tmp/install-append.log 2>&1 && pass "re-install over an old config exit 0" || { bad "re-install over old config failed"; tail -20 /tmp/install-append.log; }
grep -q 'appended the originalUi block' /tmp/install-append.log && pass "installer appended the block" || bad "no append logged"
"$REL/install.sh" --no-packages > /tmp/install-append2.log 2>&1
[ "$(grep -c '^originalUi:' /etc/eniac-touch-kiosk/config.yaml)" = 1 ] && pass "appended exactly once" || bad "originalUi blocks after two runs: $(grep -c '^originalUi:' /etc/eniac-touch-kiosk/config.yaml)"

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

echo "== original UI: healthz, PIN 2468 end to end, the SSH door"
http() { # <method> <path> [body] [extra header]
  exec 3<>/dev/tcp/127.0.0.1/8740
  printf '%s %s HTTP/1.0\r\nHost: 127.0.0.1:8740\r\nOrigin: http://127.0.0.1:8740\r\nContent-Type: application/json\r\nContent-Length: %d\r\n%s\r\n%s' \
    "$1" "$2" "${#3}" "${4:+$4$'\r\n'}" "$3" >&3
  cat <&3; exec 3<&-
}
hz="$(http GET /healthz '')"
grep -q '"originalUi":{"available":true' <<<"$hz" && pass "/healthz: originalUi available" || bad "/healthz originalUi: $(grep -o '"originalUi":{[^}]*' <<<"$hz")"
grep -q '"code":"NO_PIN"' <<<"$(http POST /api/admin/login '{"pin":"2468"}')" && pass "login before set-pin: NO_PIN" || bad "login without a PIN file did not say NO_PIN"
echo 2468 | eniac-touch-kiosk set-pin --stdin && pass "set-pin --stdin 2468" || bad "set-pin failed"
[ "$(stat -c '%a %U:%G' /etc/eniac-touch-kiosk/admin-pin)" = "640 root:eniac" ] && pass "admin-pin is 0640 root:eniac" || bad "admin-pin: $(stat -c '%a %U:%G' /etc/eniac-touch-kiosk/admin-pin)"
grep -q 2468 /etc/eniac-touch-kiosk/admin-pin && bad "the PIN is stored in clear" || pass "only the hash is stored"
login="$(http POST /api/admin/login '{"pin":"2468"}')"
tok="$(grep -o '"token":"[0-9a-f]*"' <<<"$login" | cut -d'"' -f4)"
[ ${#tok} = 32 ] && pass "login with 2468: a token" || bad "login with 2468: ${login:0:300}"
grep -q '"code":"BAD_PIN"' <<<"$(http POST /api/admin/login '{"pin":"1357"}')" && pass "a wrong PIN: BAD_PIN" || bad "wrong PIN not refused"
oui="$(http POST /api/admin/original-ui '{}' "Authorization: Bearer $tok")"
grep -q '202' <<<"$oui" && grep -q '"mode":"interactive"' <<<"$oui" && pass "POST original-ui: 202 interactive" || bad "original-ui: ${oui:0:300}"
grep -q 'door=staff' /run/eniac-touch-kiosk-ui/mode && pass "the request file says door=staff" || bad "no staff request file"
eniac-touch-kiosk original-ui off | grep -q withdrawn && pass "original-ui off withdraws it" || bad "off failed"
eniac-touch-kiosk original-ui tour | grep -q 'requested: tour' && pass "original-ui tour (SSH door)" || bad "ui-request tour failed"
st="$(eniac-touch-kiosk original-ui status)"; echo "$st"
grep -q 'door=remote' <<<"$st" && pass "original-ui status shows the request" || bad "status: $st"
eniac-touch-kiosk original-ui off >/dev/null

echo "== original UI: the supervisor under Xvfb (tour, idle 60 s, warn 5 s)"
if command -v Xvfb >/dev/null; then
  install -d -o eniac-kiosk -m 0700 /tmp/xvfb-home
  t0=$(date +%s)
  timeout 150 runuser -u eniac-kiosk -- xvfb-run -a -s '-screen 0 1920x1080x24' \
    /opt/eniac-touch-kiosk/current/deploy/kiosk/original-ui --mode tour --idle-s 60 --warn-s 5 > /tmp/oui-smoke.log 2>&1
  rc=$?
  echo "supervisor exit $rc after $(( $(date +%s) - t0 )) s"; tail -15 /tmp/oui-smoke.log
  [ "$rc" = 10 ] && pass "supervisor ran Stuart's UI on X and returned on idle (exit 10)" || bad "supervisor smoke exit $rc"
  grep -q 'images e1900' /tmp/oui-smoke.log && pass "picked the 1900 image set for 1920x1080" || bad "image width not 1900"
  grep -qi -e 'eniactk exited' -e 'core exited' -e 'window (wish) is gone' -e 'couldn.t open' /tmp/oui-smoke.log && bad "the smoke log shows a failure" || pass "no core/eniactk/wish failure in the log"
else
  echo "SKIP: no Xvfb in this container"
fi
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
