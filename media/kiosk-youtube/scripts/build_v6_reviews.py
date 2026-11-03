#!/usr/bin/env python3
"""Gate 2 review MP3s and the ENIAC reel for the v6 standalone + Short audio."""
import json,subprocess,os,sys
sys.path.insert(0,"/Users/nickd/Workspaces/eniac-kiosk-youtube/scripts")
from analyze_v6_audio import ALL,windows,dur,R
FF="/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg"
T=os.environ["V6TMP"]; os.makedirs(T,exist_ok=True)
def sh(*a): subprocess.check_call([FF,"-v","error","-y",*a])
def silence(n,s): 
    p=f"{T}/sil{n}.wav"; sh("-f","lavfi","-i",f"anullsrc=r=48000:cl=mono","-t",str(s),"-c:a","pcm_s16le",p); return p
def concat(parts,out):
    lst=f"{T}/l.txt"; open(lst,"w").write("".join(f"file '{p}'\n" for p in parts))
    sh("-f","concat","-safe","0","-i",lst,"-ar","44100","-ac","1","-c:a","libmp3lame","-b:a","128k",out)
def build(order,out,idx,gap,note=""):
    g=silence(f"g{gap}",gap); parts=[];t=0;lines=[]
    for k,label,cut in order:
        p=ALL[k][0]
        if cut: 
            p2=f"{T}/{k}.cut.wav"; sh("-i",p,"-t",str(cut),"-af","afade=t=out:st=%s:d=0.05"%(cut-0.05),"-c:a","pcm_s16le",p2); p=p2
        d=dur(p); lines.append(f"{t:7.2f}s  {k:10s} {d:6.2f}s  {label}"); parts+=[p,g]; t+=d+gap
    concat(parts[:-1],out)
    open(idx,"w").write(note+"\n".join(lines)+f"\n\ntotal {t-gap:.2f}s, gaps {gap}s\n"); print("\n".join(lines))
txt=lambda k:open(ALL[k][0].replace(".wav",".txt")).read().strip()
# v5 timeline order: A N01, H tour-27 bridge, J N02, K N03, L N04, M finale-00, O N05, P N06
order=[("N01","N01",None),("tour-27","tour-27 (timeline bridge excerpt, 0 to 2.64 s of the 8.92 s line; rest is baked in the kiosk recording)",2.64),
       ("N02","N02",None),("N03","N03",None),("N04","N04",None),("finale-00","finale-00",None),("N05","N05",None),("N06","N06",None)]
build(order,f"{R}/output/narration-review-v6.mp3",f"{R}/output/narration-review-v6-index.txt",0.6,
 "narration-review-v6.mp3  (Gate 2 listening review, v6 standalone lines, v5 timeline order, 0.6 s gaps)\n\n")
build([("s30-L1","30 s Short L1: Touch the screen.",None),("s30-L2","30 s Short L2",None),("s8-L1","8 s Short L1",None)],
 f"{R}/output/narration-review-v6-shorts.mp3",f"{R}/output/narration-review-v6-shorts-index.txt",0.6,
 "narration-review-v6-shorts.mp3  (30 s L1, L2, 8 s L1; no spoken ENIAC)\n\n")
# ENIAC reel
pad=0.08; g=silence("g0.5",0.5); parts=[];t=0;lines=[]
reel_order=["N01","tour-27","N02","N03","N04","N05","N06","s30-L1","s30-L2","s8-L1"]
n=0
for k in reel_order:
    for j,(s,e) in enumerate(windows(k,pad)):
        n+=1; c=f"{T}/reel{n}.wav"; s=max(s,0)
        sh("-i",ALL[k][0],"-ss",str(s),"-to",str(e),"-af","afade=t=in:d=0.01,loudnorm=I=-20:TP=-2:LRA=11","-ar","48000","-ac","1","-c:a","pcm_s16le",c)
        d=dur(c); ctx=txt(k)
        lines.append(f"{t:6.2f}s  {k}#{j+1}  window {s:.3f}-{e:.3f} s in the line  variant: alias Ennie-ack, take 1  ({ctx[:60]}...)"); parts+=[c,g]; t+=d+0.5
concat(parts[:-1],f"{R}/output/eniac-reel-v6-standalone.mp3")
open(f"{R}/output/eniac-reel-v6-standalone-index.txt","w").write("eniac-reel-v6-standalone.mp3: every spoken ENIAC in the new standalone lines (alias Ennie-ack), cut by character timestamps +/-0.08 s, 0.5 s gaps.\nShort lines (30 s L1, L2; 8 s L1) speak no ENIAC.\n\n"+"\n".join(lines)+f"\n\n{n} clips, {t-0.5:.1f}s\n")
print("\n".join(lines))
