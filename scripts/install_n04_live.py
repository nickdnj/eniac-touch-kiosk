#!/usr/bin/env python3
"""Install a chosen N04 live-respelling take (scripts/gen_n04_live.py) as source-lines-v6/N04.*; the previous take is kept as N04.pre-live.*.
Usage: install_n04_live.py <take-tag>"""
import shutil, sys, json, subprocess, os
V="/Users/nickd/Workspaces/eniac-kiosk-youtube/assets/audio/source-lines-v6"; t=sys.argv[1]
for ext in ("wav","align.json","json"):
    if not os.path.exists(f"{V}/N04.pre-live.{ext}"): shutil.copy2(f"{V}/N04.{ext}",f"{V}/N04.pre-live.{ext}")
    shutil.copy2(f"{V}/_live-takes/N04-{t}.{ext}",f"{V}/N04.{ext}")
dp=f"{V}/durations.json"
if os.path.exists(dp):
    d=json.load(open(dp)); new=float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f"{V}/N04.wav"]))
    if "N04" in d.get("lines",{}):
        l=d["lines"]["N04"]; l["pre_live_v6_s"]=l.get("v6_s"); l["v6_s"]=round(new,3); l["delta_s"]=round(new-l["v5_s"],3); l["flag_gt_0.3s"]=abs(l["delta_s"])>0.3
        l["note"]="re-taken with 'Live'->'Lyve' respelling (Nick: verb /liv/ at ~7:00)"
        json.dump(d,open(dp,"w"),indent=1)
print("installed N04",t)
