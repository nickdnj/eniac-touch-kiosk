#!/usr/bin/env python3
"""v6 standalone narration + Short VO (audio only). Same voice/settings as gen_narration.py.
Pronunciation: project.json brief.voice.pronunciation_dictionary (server dictionary if id set,
else the inline alias, same as gen_narration.py). Uses the with-timestamps endpoint so ENIAC
windows can be cut by character timing. Never falls back to another voice: any API failure stops.
Usage: gen_narration_v6.py [--seed N] [id ...]      ids: N01..N06 finale-00 tour-27 s30-L1 s30-L2 s8-L1
Run via: zsh -ic 'python3 scripts/gen_narration_v6.py'  (key from env, never printed)"""
import json, os, sys, subprocess, urllib.request, base64, concurrent.futures as cf, time
ROOT="/Users/nickd/Workspaces/eniac-kiosk-youtube"
FF="/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg"
KEY=os.environ["ELEVENLABS_API_KEY"]
VOICE="6SxuwKUiBpZjFTc06v9Y"
_PD=json.load(open(f"{ROOT}/project.json"))["brief"]["voice"].get("pronunciation_dictionary",{})
PD_ID=os.environ.get("PRONUNCIATION_DICT_ID") or _PD.get("id")
PD_VER=os.environ.get("PRONUNCIATION_DICT_VERSION_ID") or _PD.get("version_id")
ALIASES={} if PD_ID else dict(_PD.get("inline_alias_fallback") or {})
if not PD_ID and not ALIASES: sys.exit("no pronunciation fix configured")
PD_TAG=f"dict:{PD_ID}:{PD_VER}" if PD_ID else "inline:"+json.dumps(ALIASES,sort_keys=True)
SETTINGS={"stability":0.5,"similarity_boost":0.75,"style":0.4,"speed":1.12,"use_speaker_boost":True}
V6=f"{ROOT}/assets/audio/source-lines-v6"
def nar(k): return open(f"{ROOT}/assets/audio/narration/{k}.txt").read().strip()
LINES={}
for k in ["N01","N02","N03","N04","N05","N06"]: LINES[k]=(nar(k),V6,k)
LINES["finale-00"]=("Finish all three missions, and the kiosk ends with a finale.",V6,"finale-00")
LINES["tour-27"]=("Now it's my turn to program ENIAC. Mission one is Squares. Picture tiles on a floor: three rows of three make nine.",V6,"tour-27")
LINES["s30-L1"]=("Touch the screen.",f"{ROOT}/assets/audio/short-30s","L1")
LINES["s30-L2"]=("Watch a nineteen forty-six computer work, lamp by lamp.",f"{ROOT}/assets/audio/short-30s","L2")
LINES["s8-L1"]=("Come watch a nineteen forty-six computer work, at the Vintage Computer Federation.",f"{ROOT}/assets/audio/short-8s","L1")
args=sys.argv[1:]; seed=None
if args[:1]==["--seed"]: seed=int(args[1]); args=args[2:]
ids=args or list(LINES)
calls=0
def gen(i):
    text,outdir,name=LINES[i]
    say=text
    for a,b in ALIASES.items(): say=say.replace(a,b)
    body={"text":say,"model_id":"eleven_multilingual_v2","voice_settings":SETTINGS}
    if PD_ID: body["pronunciation_dictionary_locators"]=[{"pronunciation_dictionary_id":PD_ID,"version_id":PD_VER}]
    if seed is not None: body["seed"]=seed
    req=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128",json.dumps(body).encode(),{"xi-api-key":KEY,"Content-Type":"application/json"})
    try: r=json.load(urllib.request.urlopen(req,timeout=180))
    except Exception as e:
        raise SystemExit(f"TTS FAIL {i}: {e} {getattr(e,'read',lambda:b'')()[:300]}")
    os.makedirs(f"{ROOT}/scripts/_raw/v6",exist_ok=True)
    raw=f"{ROOT}/scripts/_raw/v6/{i}.mp3"
    if os.path.exists(raw): os.replace(raw,f"{ROOT}/scripts/_raw/v6/{i}.prev-{int(time.time())}.mp3")
    open(raw,"wb").write(base64.b64decode(r["audio_base64"]))
    p=subprocess.run([FF,"-hide_banner","-i",raw,"-af","loudnorm=I=-20:TP=-2:LRA=11:print_format=json","-f","null","-"],capture_output=True,text=True).stderr
    j,_=json.JSONDecoder().raw_decode(p[p.rindex("{"):])
    af=f"loudnorm=I=-20:TP=-2:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true"
    wav=f"{outdir}/{name}.wav"
    subprocess.run([FF,"-y","-v","error","-i",raw,"-af",af,"-ar","48000","-ac","1","-c:a","pcm_s16le",wav],check=True)
    # alignment is for the un-normalised mp3; loudnorm linear does not shift time
    json.dump(r["alignment"],open(f"{outdir}/{name}.align.json","w"))
    open(f"{outdir}/{name}.txt","w").write(text+"\n")
    json.dump({"id":i,"text":text,"sent":say,"voice":VOICE,"model":"eleven_multilingual_v2","settings":SETTINGS,
               "pronunciation":PD_TAG,"endpoint":"with-timestamps","seed":seed,"previous_text":None,"next_text":None,
               "generated":time.strftime("%Y-%m-%dT%H:%M:%S")},open(f"{outdir}/{name}.json","w"),indent=1)
    print(i,"ok",flush=True)
with cf.ThreadPoolExecutor(2) as ex:
    futs=[ex.submit(gen,i) for i in ids]
    for f in futs: f.result()
