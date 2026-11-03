#!/bin/bash
# Inside the container: Brian L. Stuart's eniactk -D on a 1920x1080 X screen
# (the museum panel's size), recorded with ffmpeg x11grab, cropped to its window.
set -u
SECS=${SECS:-42}
Xvfb :99 -screen 0 1920x1080x24 -nolisten tcp >/out/xvfb.log 2>&1 &
XPID=$!
export DISPLAY=:99
sleep 2
mkdir -p /run/oui && cd /run/oui
ln -s /upstream/images images; ln -s /upstream/programs programs; cp /upstream/demo.card . 2>/dev/null
cp /bin-in/eniac-core /bin-in/eniactk /usr/local/bin/
(tail -f /dev/null | eniac-core -v "eniactk -D" trajdemo.e > /out/eniac.log 2>&1) &
for i in $(seq 1 40); do
  W=$(xwininfo -root -children 2>/dev/null | awk '/"[^"]*": \("wish"|"[Ee]niac"/{print $1; exit}')
  [ -n "$W" ] && break; sleep 0.5
done
xwininfo -root -tree > /out/tree.txt 2>&1
sleep 3  # images load
G=$(xwininfo -id "$W" 2>/dev/null)
echo "$G" > /out/win.txt
X=$(echo "$G" | awk '/Absolute upper-left X/{print $4}'); Y=$(echo "$G" | awk '/Absolute upper-left Y/{print $4}')
WW=$(echo "$G" | awk '/Width:/{print $2}'); HH=$(echo "$G" | awk '/Height:/{print $2}')
echo "window $W at $X,$Y ${WW}x${HH}" | tee -a /out/win.txt
ffmpeg -loglevel error -y -f x11grab -framerate 30 -video_size ${WW}x${HH} -i :99.0+$X,$Y -t $SECS \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p" \
  -c:v libx264 -crf 18 -preset medium -movflags +faststart /out/original-ui-tour.mp4
echo "ffmpeg rc=$?"
pkill -f eniactk; pkill -f eniac-core; pkill wish; pkill tail; kill $XPID
sleep 1; pgrep -a "eniac|wish" || echo "processes gone"
