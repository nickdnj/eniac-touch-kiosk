#!/usr/bin/env python3
"""Create the ENIAC pronunciation dictionary on the ElevenLabs account and record its ids.
Run through zsh -ic (the key is only exported in ~/.zshrc). The API key needs the
pronunciation_dictionaries_write permission. Rules come from project.json
brief.voice.pronunciation_dictionary.rules. The key is never printed or written."""
import json, os, sys, urllib.request, urllib.error
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
P = f"{ROOT}/project.json"
d = json.load(open(P)); pd = d["brief"]["voice"]["pronunciation_dictionary"]
body = {"name": "eniac-kiosk-pronunciation", "description": "ENIAC kiosk video: say ENIAC as EN-ee-ack (alias rules; phoneme rules are not honoured by eleven_multilingual_v2)",
        "rules": pd["rules"]}
req = urllib.request.Request("https://api.elevenlabs.io/v1/pronunciation-dictionaries/add-from-rules", json.dumps(body).encode(),
                             {"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": "application/json"})
try:
    r = json.load(urllib.request.urlopen(req, timeout=60))
except urllib.error.HTTPError as e:
    sys.exit(f"create failed: HTTP {e.code} {e.read()[:300].decode('utf8','replace')}")
pd["id"], pd["version_id"] = r["id"], r["version_id"]
pd["status"] = "created"
open(P, "w").write(json.dumps(d, indent=2, ensure_ascii=False))
print("dictionary", r["id"], "version", r["version_id"])
