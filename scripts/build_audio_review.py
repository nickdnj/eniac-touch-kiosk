import json,re,subprocess,glob,os
R="/Users/nickd/Workspaces/eniac-battleship-video"; N=f"{R}/assets/audio/narration"
FF="/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg"; FP="/opt/homebrew/opt/ffmpeg-full/bin/ffprobe"
# scene budgets (s) from storyboard; notes explain tighter limits
B={"VO01":(8,"scene 2, 0:04-0:12"),"VO02":(7,"scene 3"),"VO03":(12,"scene 4"),"VO04":(10,"scene 5"),"VO05":(12,"scene 6"),
"VO06":(9,"scene 7"),"VO07":(10,"scene 8"),"VO08":(12,"scene 9"),"VO09":(7,"scene 10"),
"VO10":(19,"scene 11 is 24 s but VO must end ~hop 12 (~1:48-1:50) so callouts clear before last 4 hops: 1:31-1:50"),
"VO11":(6.5,"scene 12, from ~1:57.5 to 2:04"),"VO12":(None,"scene 13 (11 s) shared with VO13"),"VO13":(None,"scene 13 shared, spaced to 3 taps"),
"VO14":(4,"scene 17"),"VO15":(9,"scene 18"),"VO16":(10,"scene 19")}
def dur(f): return float(subprocess.check_output([FP,"-v","quiet","-show_entries","format=duration","-of","csv=p=0",f]).decode())
ids=sorted(os.path.basename(f)[:-4] for f in glob.glob(f"{N}/VO*.wav"))
m=[];tot=0
for i in ids:
    d=dur(f"{N}/{i}.wav"); t=open(f"{N}/{i}.txt").read().strip(); b,note=B[i]
    m.append({"id":i,"seconds":round(d,3),"text":t,"budget_s":b,"budget_note":note,"over_budget":(b is not None and d>b)}); tot+=d
# combined VO12+VO13 check
c=[x for x in m if x["id"] in("VO12","VO13")]; comb=sum(x["seconds"] for x in c)
json.dump({"voice":"Nick 2 6SxuwKUiBpZjFTc06v9Y","total_narration_seconds":round(tot,3),"vo12_plus_vo13_seconds":round(comb,3),"lines":m},open(f"{N}/durations.json","w"),indent=1)
# review mp3: 0.7 s gap between lines
gap=f"{N}/_gap.wav"; subprocess.run([FF,"-y","-v","error","-f","lavfi","-i","anullsrc=r=48000:cl=mono","-t","0.7","-c:a","pcm_s16le",gap],check=True)
lst=f"{N}/_list.txt"; open(lst,"w").write("".join(f"file '{N}/{i}.wav'\nfile '{gap}'\n" for i in ids))
subprocess.run([FF,"-y","-v","error","-f","concat","-safe","0","-i",lst,"-c:a","libmp3lame","-b:a","160k",f"{N}/review-all.mp3"],check=True)
# pronunciation reel
clips=[];pad=0.7
for i in ids:
    j=json.load(open(f"{N}/{i}.json")); a=j["alignment"]; s=j["sent"]
    ch,st,en=a["characters"],a["character_start_times_seconds"],a["character_end_times_seconds"]
    txt="".join(ch)
    for mt in re.finditer(r"Ennie-ack(?:'s)?|\binit\b",txt):
        t0=max(0,st[mt.start()]-pad); t1=min(dur(f"{N}/{i}.wav"),en[mt.end()-1]+pad)
        lab="init" if mt.group(0)=="init" else mt.group(0)
        clips.append((i,lab,t0,t1))
rd=f"{N}/_reel"; os.makedirs(rd,exist_ok=True); gap2=f"{rd}/g.wav"
subprocess.run([FF,"-y","-v","error","-f","lavfi","-i","anullsrc=r=48000:cl=mono","-t","1.2","-c:a","pcm_s16le",gap2],check=True)
lines=[]
for n,(i,lab,t0,t1) in enumerate(clips):
    f=f"{rd}/c{n:02d}.wav"
    subprocess.run([FF,"-y","-v","error","-ss",f"{t0:.3f}","-to",f"{t1:.3f}","-i",f"{N}/{i}.wav","-af","afade=t=in:d=0.02,afade=t=out:st=%.3f:d=0.03"%(t1-t0-0.03),f],check=True)
    lines.append(f"file '{f}'\nfile '{gap2}'\n")
open(f"{rd}/l.txt","w").write("".join(lines))
subprocess.run([FF,"-y","-v","error","-f","concat","-safe","0","-i",f"{rd}/l.txt","-c:a","libmp3lame","-b:a","160k",f"{N}/pronunciation-reel.mp3"],check=True)
json.dump([{"n":n+1,"line":i,"token":lab,"clip_start":round(a,2),"clip_end":round(b,2)} for n,(i,lab,a,b) in enumerate(clips)],open(f"{N}/pronunciation-reel-index.json","w"),indent=1)
import shutil; shutil.rmtree(rd); os.remove(gap); os.remove(lst)
print("total",round(tot,2),"review",round(dur(f"{N}/review-all.mp3"),2),"reel",round(dur(f"{N}/pronunciation-reel.mp3"),2),"clips",len(clips))
for x in m: print(x["id"],x["seconds"],x["budget_s"],"OVER" if x["over_budget"] else "")
print("VO12+13",round(comb,2))
