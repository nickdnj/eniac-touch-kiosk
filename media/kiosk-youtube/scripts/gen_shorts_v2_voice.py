#!/usr/bin/env python3
"""v2 Shorts voice lines (audio only). Same voice/settings/pipeline as gen_narration_v6.py.
Usage: gen_shorts_v2_voice.py id[:seed] ...   ids: Q Y C Y-alt1 Y-alt2 Y-alt3 (alt* require a seed)
Output: assets/audio/short-30s-v2/<id>.* ; Q is also copied to short-8s-v2 by the caller.
Run via: zsh -ic 'python3 scripts/gen_shorts_v2_voice.py Q Y C'  (key from env, never printed). No fallback voice."""
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
OUT=f"{ROOT}/assets/audio/short-30s-v2"
TXT={"Q":"Could you program a computer from nineteen forty-six?","Y":"Yes. With your fingertip.",
     "C":"Come try it, at the Vintage Computer Federation.",
     "C2":"Come try it at Info Age, home of the Vintage Computer Federation."}
def text_of(i): return TXT[i.split("-")[0]]
def gen(spec):
    i,_,s=spec.partition(":"); seed=int(s) if s else None
    text=text_of(i); say=text
    for a,b in ALIASES.items(): say=say.replace(a,b)
    body={"text":say,"model_id":"eleven_multilingual_v2","voice_settings":SETTINGS}
    if PD_ID: body["pronunciation_dictionary_locators"]=[{"pronunciation_dictionary_id":PD_ID,"version_id":PD_VER}]
    if seed is not None: body["seed"]=seed
    req=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128",json.dumps(body).encode(),{"xi-api-key":KEY,"Content-Type":"application/json"})
    try: r=json.load(urllib.request.urlopen(req,timeout=180))
    except Exception as e:
        raise SystemExit(f"TTS FAIL {i}: {e} {getattr(e,'read',lambda:b'')()[:300]}")
    os.makedirs(OUT,exist_ok=True); os.makedirs(f"{ROOT}/scripts/_raw/shorts-v2",exist_ok=True)
    raw=f"{ROOT}/scripts/_raw/shorts-v2/{i}.mp3"
    open(raw,"wb").write(base64.b64decode(r["audio_base64"]))
    p=subprocess.run([FF,"-hide_banner","-i",raw,"-af","loudnorm=I=-20:TP=-2:LRA=11:print_format=json","-f","null","-"],capture_output=True,text=True).stderr
    j,_=json.JSONDecoder().raw_decode(p[p.rindex("{"):])
    af=f"loudnorm=I=-20:TP=-2:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true"
    subprocess.run([FF,"-y","-v","error","-i",raw,"-af",af,"-ar","48000","-ac","1","-c:a","pcm_s16le",f"{OUT}/{i}.wav"],check=True)
    json.dump(r["alignment"],open(f"{OUT}/{i}.align.json","w"))
    open(f"{OUT}/{i}.txt","w").write(text+"\n")
    json.dump({"id":i,"text":text,"sent":say,"voice":VOICE,"model":"eleven_multilingual_v2","settings":SETTINGS,
               "pronunciation":PD_TAG,"endpoint":"with-timestamps","seed":seed,
               "generated":time.strftime("%Y-%m-%dT%H:%M:%S")},open(f"{OUT}/{i}.json","w"),indent=1)
    print(spec,"ok",flush=True)
with cf.ThreadPoolExecutor(2) as ex:
    for f in [ex.submit(gen,s) for s in sys.argv[1:]]: f.result()
