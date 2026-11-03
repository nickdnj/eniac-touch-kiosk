set -e
S=$1; R=$2; cd /Users/nickd/Workspaces/eniac-kiosk-youtube
python3 - $S $R <<'P'
import json,sys,bisect
S,R=sys.argv[1:3]; d=json.load(open(f"{S}/{R}/frames.json")); T0=d["T0"]
fr=sorted((t-T0,n) for t,n in d["frames"]); ts=[t for t,_ in fr]
FPS=30
with open(S+"/concat.txt","w") as o:
    for i in range(int(32.5*FPS)):
        t=i/FPS; k=max(bisect.bisect_right(ts,t)-1,0)
        o.write(f"file '{R}/{fr[k][1]}'\nduration {1/FPS:.6f}\n")
    o.write(f"file '{R}/{fr[-1][1]}'\n")
P
ffmpeg -v error -y -f concat -safe 0 -i $S/concat.txt -loop 1 -t 32.5 -i output/short-panels/endcard.png -i output/short-panels/audio.wav \
 -filter_complex "[0:v]fps=30,format=yuv420p[v];[1:v]format=rgba,fade=t=in:st=28.8:d=0.6:alpha=1[e];[v][e]overlay=0:0:format=auto,format=yuv420p[o]" \
 -map "[o]" -map 2:a -t 32.5 -c:v libx264 -preset slow -crf 17 -c:a aac -b:a 192k -movflags +faststart output/short-panels.mp4
