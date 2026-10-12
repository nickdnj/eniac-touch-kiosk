#!/usr/bin/env python3
"""N04 only: 'Live, card by card' came out as the verb /liv/ (Nick, 2026-10-12). TTS-level respelling of the adjective
'Live' -> 'Lyve' (on-screen/script text stays 'Live'), applied to THIS line only, case-sensitive, whole word.
Same voice/settings/alias/endpoint/loudnorm as gen_narration_v6.py. Writes takes to assets/audio/source-lines-v6/_live-takes/.
Usage (via zsh -ic so the key is in the env):  gen_n04_live.py <take-tag> [respelling]   e.g. t1 Lyve
Installing the chosen take is a separate, explicit step (scripts/install_n04_live.py)."""
import json, os, sys, subprocess, urllib.request, base64, time, re
ROOT="/Users/nickd/Workspaces/eniac-kiosk-youtube"; FF="/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg"
KEY=os.environ["ELEVENLABS_API_KEY"]; VOICE="6SxuwKUiBpZjFTc06v9Y"
SETTINGS={"stability":0.5,"similarity_boost":0.75,"style":0.4,"speed":1.12,"use_speaker_boost":True}
tag=sys.argv[1]; respell=sys.argv[2] if len(sys.argv)>2 else "Lyve"
V6=f"{ROOT}/assets/audio/source-lines-v6"; OUT=f"{V6}/_live-takes"; os.makedirs(OUT,exist_ok=True)
text=open(f"{ROOT}/assets/audio/narration/N04.txt").read().strip()
say=text.replace("ENIAC","Ennie-ack")                       # the ENIAC alias, as gen_narration_v6.py
say=re.sub(r"\bLive\b",respell,say)                         # this line only: case-sensitive, whole word
assert say!=text.replace("ENIAC","Ennie-ack")
body={"text":say,"model_id":"eleven_multilingual_v2","voice_settings":SETTINGS}
req=urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128",json.dumps(body).encode(),{"xi-api-key":KEY,"Content-Type":"application/json"})
try: r=json.load(urllib.request.urlopen(req,timeout=180))
except Exception as e: raise SystemExit(f"TTS FAIL N04 {tag}: {e} {getattr(e,'read',lambda:b'')()[:300]}")
mp3=f"{OUT}/N04-{tag}.mp3"; open(mp3,"wb").write(base64.b64decode(r["audio_base64"]))
p=subprocess.run([FF,"-hide_banner","-i",mp3,"-af","loudnorm=I=-20:TP=-2:LRA=11:print_format=json","-f","null","-"],capture_output=True,text=True).stderr
j,_=json.JSONDecoder().raw_decode(p[p.rindex("{"):])
af=f"loudnorm=I=-20:TP=-2:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true"
subprocess.run([FF,"-y","-v","error","-i",mp3,"-af",af,"-ar","48000","-ac","1","-c:a","pcm_s16le",f"{OUT}/N04-{tag}.wav"],check=True)
json.dump(r["alignment"],open(f"{OUT}/N04-{tag}.align.json","w"))
json.dump({"id":"N04","text":text,"sent":say,"voice":VOICE,"model":"eleven_multilingual_v2","settings":SETTINGS,"pronunciation":'inline:{"ENIAC": "Ennie-ack"} + live-> '+respell+" (N04 only)",
           "endpoint":"with-timestamps","take":tag,"generated":time.strftime("%Y-%m-%dT%H:%M:%S")},open(f"{OUT}/N04-{tag}.json","w"),indent=1)
print("N04",tag,"ok",flush=True)
