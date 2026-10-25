#!/usr/bin/env python3
"""One-off: ElevenLabs 'Nick 2' audio for the HeyGen intro (alias ENIAC -> Ennie-ack, as locked)."""
import os, json, sys, urllib.request
TEXT = ("Hi, I'm Nick, a docent at the Vintage Computer Federation museum in Wall, New Jersey. "
        "We just put a new game on our ENIAC kiosk. It's Battleship, but the shots are worked out "
        "by a simulation of a computer from nineteen forty-six. Let me show you.")
SENT = TEXT.replace("ENIAC", "Ennie-ack").replace("Info Age", "Info Age")
out = sys.argv[1]
body = json.dumps({"text": SENT, "model_id": "eleven_multilingual_v2",
    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "style": 0.4, "use_speaker_boost": True, "speed": 1.12}}).encode()
req = urllib.request.Request("https://api.elevenlabs.io/v1/text-to-speech/6SxuwKUiBpZjFTc06v9Y?output_format=mp3_44100_128",
    data=body, headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": "application/json"})
open(out, "wb").write(urllib.request.urlopen(req, timeout=120).read())
open(out + ".txt", "w").write(TEXT + "\n\n[sent to voice]: " + SENT + "\n")
print("ok", out)
