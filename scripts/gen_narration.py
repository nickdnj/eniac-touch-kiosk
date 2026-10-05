import json, os, subprocess, sys, urllib.request
ROOT="/Users/nickd/Workspaces/eniac-kiosk-youtube"
OUT=f"{ROOT}/assets/audio/narration"
FF="/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg"
FP="/opt/homebrew/opt/ffmpeg-full/bin/ffprobe"
KEY=os.environ["ELEVENLABS_API_KEY"]
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
    body=json.dumps({"text":t,"model_id":"eleven_multilingual_v2","voice_settings":{"stability":0.5,"similarity_boost":0.75,"style":0.4,"speed":1.12,"use_speaker_boost":True}}).encode()
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
    print(k,"ok")
