#!/bin/bash
# Temporary: try Brian Stuart's ENIAC simulator (github.com/blstuart/eniac-simulator)
# on the Model 4 kiosk's touchscreen. The kiosk software is not touched.
#   ./eniac-try.sh install   # apt install go + tk, clone, build (asks for sudo once)
#   ./eniac-try.sh start     # show ENIAC on the kiosk screen, on top of Chromium
#   ./eniac-try.sh fix       # patch the multiplier-status crash and rebuild
#   ./eniac-try.sh stop     # close it; the Model 4 kiosk is underneath, unchanged
#   ./eniac-try.sh remove    # delete /opt/eniac-simulator (apt packages left; see below)
set -e
DIR=/opt/eniac-simulator
case "$1" in
install)
  sudo apt-get install -y golang-go tk
  [ -d $DIR ] || sudo git clone --depth 1 https://github.com/blstuart/eniac-simulator $DIR
  sudo chown -R kiosk:kiosk $DIR
  bash "$0" fix
  ;;
fix)
  # Upstream bug (2026-09-22): the multiplier status is sent as "%2d " (" 0 ..."),
  # and eniactk splits on single spaces, so it indexes an empty field and panics
  # the first time the multiplier runs. Send the stage without padding.
  sudo -u kiosk sed -i 's/Sprintf("%2d ", stage)/Sprintf("%d ", stage)/' $DIR/src/mult.go
  sudo -u kiosk bash -c "cd $DIR/src && go build -o eniac && cd ../vis && go build -o eniactk eniactk.go"
  echo "built: $(ls $DIR/src/eniac $DIR/vis/eniactk)"
  ;;
start)
  if pgrep -u kiosk -f 'src/eniac -v' >/dev/null; then echo "already running; stop it first"; exit 1; fi
  # borrow the kiosk session's X authority from its running xinit
  XA=$(sudo sh -c 'tr "\0" "\n" < /proc/$(pgrep -u kiosk -x xinit)/cmdline | grep -A1 -- "-auth" | tail -1')
  sudo -u kiosk env DISPLAY=:0 XAUTHORITY="$XA" HOME=/home/kiosk bash -c \
    "cd $DIR && nohup setsid sh -c 'tail -f /dev/null | src/eniac -v \"vis/eniactk -D\" trajdemo.e' >/tmp/eniac.log 2>&1 &"
  sleep 4; pgrep -a wish && echo "ENIAC is up on the kiosk screen (log: /tmp/eniac.log)"
  ;;
stop)
  sudo pkill -u kiosk -f 'src/eniac -v' || true
  sudo pkill -u kiosk -x wish || true
  sudo pkill -u kiosk -f 'vis/eniactk' || true
  echo "stopped"
  ;;
remove)
  bash "$0" stop; sudo rm -rf $DIR
  echo "removed $DIR. To drop the packages too: sudo apt-get remove golang-go tk && sudo apt-get autoremove"
  ;;
*) sed -n 2,9p "$0" ;;
esac
