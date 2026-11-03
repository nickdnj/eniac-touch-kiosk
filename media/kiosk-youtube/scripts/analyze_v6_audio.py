#!/usr/bin/env python3
"""Durations, ENIAC windows (by character timestamps), phoneme proxy. Run with the M2 venv python."""
import json,re,os,sys,subprocess
R="/Users/nickd/Workspaces/eniac-kiosk-youtube"; FP="/opt/homebrew/opt/ffmpeg-full/bin/ffprobe"
V6=f"{R}/assets/audio/source-lines-v6"
SRC={"N01":(V6,"N01",f"{R}/assets/audio/narration/N01.wav"),"N02":(V6,"N02",f"{R}/assets/audio/narration/N02.wav"),
"N03":(V6,"N03",f"{R}/assets/audio/narration/N03.wav"),"N04":(V6,"N04",f"{R}/assets/audio/narration/N04.wav"),
"N05":(V6,"N05",f"{R}/assets/audio/narration/N05.wav"),"N06":(V6,"N06",f"{R}/assets/audio/narration/N06.wav"),
"finale-00":(V6,"finale-00",f"{R}/assets/audio/source-lines-v5/finale-00.wav"),
"tour-27":(V6,"tour-27",f"{R}/assets/audio/source-lines-v3/tour-27.wav")}
def dur(p): return float(subprocess.check_output([FP,"-v","quiet","-show_entries","format=duration","-of","csv=p=0",p]).decode())
ALL={k:(f"{d}/{n}.wav",f"{d}/{n}.align.json") for k,(d,n,_) in SRC.items()}
for k,d,n in [("s30-L1","short-30s","L1"),("s30-L2","short-30s","L2"),("s8-L1","short-8s","L1")]:
    ALL[k]=(f"{R}/assets/audio/{d}/{n}.wav",f"{R}/assets/audio/{d}/{n}.align.json")
def windows(k,pad=0.04):
    a=json.load(open(ALL[k][1])); c="".join(a["characters"]); out=[]
    for m in re.finditer("Ennie-ack",c):
        out.append((round(a["character_start_times_seconds"][m.start()]-pad,3),round(a["character_end_times_seconds"][m.end()-1]+pad,3)))
    return out
if __name__=="__main__":
    mode=sys.argv[1]
    if mode=="durations":
        res={"note":"duration_s v6 vs v5; flag if |delta|>0.3 s","lines":{}}
        for k,(d,n,v5) in SRC.items():
            v6=dur(f"{d}/{n}.wav"); v5d=dur(v5)
            res["lines"][k]={"v6_s":round(v6,3),"v5_s":round(v5d,3),"delta_s":round(v6-v5d,3),"flag_gt_0.3s":abs(v6-v5d)>0.3,"v5_file":v5.replace(R+"/","")}
        json.dump(res,open(f"{V6}/durations.json","w"),indent=1)
        for k,v in res["lines"].items(): print(k,v)
    if mode=="phones":
        sys.path.insert(0,os.path.dirname(sys.argv[2]))
        import torch,soundfile as sf,numpy as np
        from ph import fe,tok,model
        tmp=sys.argv[3]; out={}
        for k in ALL:
            w=windows(k)
            if not w: continue
            subprocess.check_call(["/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg","-v","error","-y","-i",ALL[k][0],"-ar","16000","-ac","1",f"{tmp}/{k}.16.wav"])
            x,sr=sf.read(f"{tmp}/{k}.16.wav",dtype="float32")
            with torch.no_grad(): lg=model(fe(x,sampling_rate=16000,return_tensors="pt").input_values).logits[0]
            ids=lg.argmax(-1).tolist(); res=[]
            for s,e in w:
                ph=[];prev=None
                for i,t in enumerate(ids):
                    if t!=prev and t!=tok.pad_token_id and s<=i*0.02<=e: ph.append(tok.convert_ids_to_tokens(t))
                    prev=t
                p=" ".join(ph); res.append({"window":[s,e],"phones":p,"long_i":"aɪ" in p.replace(" ",""),
                   "ee_ack":bool(re.search(r"n (i|iː|ɪ|ɪː)\b.*k",p))})
            out[k]=res; print(k,res)
        json.dump(out,open(f"{R}/output/v6-eniac-phones.json","w"),indent=1,ensure_ascii=False)
