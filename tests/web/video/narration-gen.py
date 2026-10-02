#!/usr/bin/env python3
"""Render docs/video/narration.md to WAV clips with a local Kokoro TTS server
(OpenAI-compatible, default http://127.0.0.1:8880). Output: build/video/narration/
{video}-NN.wav plus manifest.json, read by narrate.ts. Not part of CI.

  python3 tests/web/video/narration-gen.py [--voice af_heart] [--url http://127.0.0.1:8880]

Text-to-speech notes: [FC] and [pause: ...] markers are stripped; "ENIAC" is
sent as "Eniac" because Kokoro spells the all-caps form oddly (checked with
whisper.cpp: "Eniac" is heard as ENIAC)."""
import argparse, json, os, re, subprocess, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
ap = argparse.ArgumentParser()
ap.add_argument("--voice", default="af_heart")
ap.add_argument("--url", default="http://127.0.0.1:8880")
a = ap.parse_args()
out_dir = os.path.join(ROOT, "build", "video", "narration")
os.makedirs(out_dir, exist_ok=True)
md = open(os.path.join(ROOT, "docs", "video", "narration.md"), encoding="utf8").read()
videos = {"squares": "## Video 1", "primes": "## Video 2", "trajectory": "## Video 3"}
manifest = []
for vid, hdr in videos.items():
    i = md.index(hdr)
    j = md.find("\n## ", i + 5)
    sec = md[i : j if j > 0 else len(md)]
    rows = [l for l in sec.splitlines() if l.startswith("| ") and not l.startswith("| Beat") and not l.startswith("|---")]
    for n, line in enumerate(rows):
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        beat, text = cells[0], cells[-1]
        say = re.sub(r"\[FC\]|\[pause:[^\]]*\]", "", text)
        say = re.sub(r"\s+", " ", say).strip().replace("ENIAC", "Eniac")
        name, dur = None, 0.0
        if say:
            name = f"{vid}-{n:02d}.wav"
            body = json.dumps({"model": "kokoro", "voice": a.voice, "input": say, "response_format": "wav"}).encode()
            req = urllib.request.Request(a.url + "/v1/audio/speech", data=body, headers={"Content-Type": "application/json"})
            path = os.path.join(out_dir, name)
            open(path, "wb").write(urllib.request.urlopen(req).read())
            dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]))
        manifest.append({"video": vid, "idx": n, "beat": beat, "text": say, "file": name, "dur": round(dur, 2)})
json.dump(manifest, open(os.path.join(out_dir, "manifest.json"), "w"), indent=1)
for v in videos:
    rs = [r for r in manifest if r["video"] == v]
    print(f"{v}: {len(rs)} lines, {sum(r['dur'] for r in rs):.0f} s of speech")
