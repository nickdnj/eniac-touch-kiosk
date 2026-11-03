import json, os, subprocess, sys, urllib.request
ROOT="/Users/nickd/Workspaces/eniac-kiosk-youtube"
OUT=f"{ROOT}/assets/audio/narration"
FF="/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg"
FP="/opt/homebrew/opt/ffmpeg-full/bin/ffprobe"
KEY=os.environ["ELEVENLABS_API_KEY"]
# M2 (2026-10-12): ENIAC must be said EN-ee-ack every time. The pronunciation fix comes from
# project.json brief.voice.pronunciation_dictionary: either a server-side dictionary (id +
# version_id, sent as pronunciation_dictionary_locators) or, until that exists, the same alias
# applied here as a text substitution. Neither configured = stop; never render unfixed.
# Env overrides: PRONUNCIATION_DICT_ID, PRONUNCIATION_DICT_VERSION_ID. Text is otherwise fed as written.
_PD=json.load(open(f"{ROOT}/project.json"))["brief"]["voice"].get("pronunciation_dictionary",{})
PD_ID=os.environ.get("PRONUNCIATION_DICT_ID") or _PD.get("id")
PD_VER=os.environ.get("PRONUNCIATION_DICT_VERSION_ID") or _PD.get("version_id")
ALIASES={} if PD_ID else dict(_PD.get("inline_alias_fallback") or {})
if not PD_ID and not ALIASES:
    sys.exit("gen_narration: no pronunciation fix configured (project.json brief.voice.pronunciation_dictionary)")
PD_TAG=f"dict:{PD_ID}:{PD_VER}" if PD_ID else "inline:"+json.dumps(ALIASES,sort_keys=True)
SETTINGS={"stability":0.5,"similarity_boost":0.75,"style":0.4,"speed":1.12,"use_speaker_boost":True}
L={
"N01":"Hi, I'm Nick, a docent at the Vintage Computer Federation museum, and I want to introduce you to our new ENIAC exhibit: the room-sized computer of nineteen forty-six, on a touch screen you can program yourself.",
"N02":"And that card punch? You'll meet it at the museum. In Mission Two, ENIAC hunts for prime numbers, and punches a card for every one it finds.",
"N03":"Then, in Mission Three, you wire ENIAC to fly a cannon shell, with a punched card for every second of flight, all the way to the landing.",
"N04":"The primes hunt, and Brian Stuart's reconstruction of ENIAC's nineteen forty-six shell flight? Live, card by card, only at the museum. Come wire them up yourself.",
"N05":"And the person who made all of this possible: Brian L. Stuart of Drexel University. He wrote the simulator behind every lamp you've seen, and it simulates ENIAC at the level of individual pulses. Brian, thank you.",
"N06":"So that's our new ENIAC exhibit. Come see it in person, and program ENIAC yourself, at the Vintage Computer Federation, inside the Info Age Science and History Museums in Wall, New Jersey. Plan your visit at V C F E D dot org. Thanks for watching!",
"N-ALT1":"Now it's my turn to program ENIAC.",
}
ONLY=sys.argv[1:]
for k,t in L.items():
    if ONLY and k not in ONLY: continue
    assert "lehmer" not in t.lower()
    say=t
    for a,b in ALIASES.items(): say=say.replace(a,b)
    req_body={"text":say,"model_id":"eleven_multilingual_v2","voice_settings":SETTINGS}
    if PD_ID: req_body["pronunciation_dictionary_locators"]=[{"pronunciation_dictionary_id":PD_ID,"version_id":PD_VER}]
    body=json.dumps(req_body).encode()
    req=urllib.request.Request("https://api.elevenlabs.io/v1/text-to-speech/6SxuwKUiBpZjFTc06v9Y?output_format=mp3_44100_128",body,{"xi-api-key":KEY,"Content-Type":"application/json","Accept":"audio/mpeg"})
    try: data=urllib.request.urlopen(req,timeout=120).read()
    except Exception as e:
        print("TTS FAIL",k,e, getattr(e,'read',lambda:b'')()[:300]); sys.exit(1)
    raw=f"{OUT}/{k}.raw.mp3"; open(raw,"wb").write(data)
    # two-pass loudnorm to -20 LUFS, 48k mono
    p=subprocess.run([FF,"-hide_banner","-i",raw,"-af","loudnorm=I=-20:TP=-2:LRA=11:print_format=json","-f","null","-"],capture_output=True,text=True).stderr
    j,_=json.JSONDecoder().raw_decode(p[p.rindex("{"):])
    af=f"loudnorm=I=-20:TP=-2:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true"
    subprocess.run([FF,"-y","-v","error","-i",raw,"-af",af,"-ar","48000","-ac","1","-c:a","pcm_s16le",f"{OUT}/{k}.wav"],check=True)
    os.makedirs(f"{ROOT}/scripts/_raw",exist_ok=True); os.replace(raw,f"{ROOT}/scripts/_raw/{k}.mp3")
    open(f"{OUT}/{k}.txt","w").write(t+"\n")
    # provenance sidecar: text as written, what was sent, voice settings and the pronunciation fix
    json.dump({"text":t,"sent":say,"voice":"6SxuwKUiBpZjFTc06v9Y","model":"eleven_multilingual_v2","settings":SETTINGS,"pronunciation":PD_TAG},open(f"{OUT}/{k}.json","w"),indent=1)
    print(k,"ok")
