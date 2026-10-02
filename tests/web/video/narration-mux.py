#!/usr/bin/env python3
"""Lay the narration clips onto a recorded walkthrough at the offsets that
narrate.ts logged, and write an H.264/AAC MP4. Not part of CI.

  python3 tests/web/video/narration-mux.py squares build/video/out/<dir>/video.webm docs/video/eniac-touch-walkthrough-squares.mp4"""
import json, os, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
video, src, dst = sys.argv[1:4]
ndir = os.path.join(ROOT, "build", "video", "narration")
said = json.load(open(os.path.join(ndir, f"{video}-timeline.json")))["said"]
cmd = ["ffmpeg", "-loglevel", "error", "-y", "-i", src]
for s in said:
    cmd += ["-i", os.path.join(ndir, s["file"])]
parts, labels = [], []
for k, s in enumerate(said, start=1):
    ms = max(0, int(round(s["at"])))
    parts.append(f"[{k}:a]aresample=48000,adelay={ms}|{ms}[a{k}]")
    labels.append(f"[a{k}]")
parts.append(f"{''.join(labels)}amix=inputs={len(said)}:normalize=0:dropout_transition=0,apad[aout]")
cmd += ["-filter_complex", ";".join(parts), "-map", "0:v", "-map", "[aout]",
        "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k", "-ac", "1", "-shortest", "-movflags", "+faststart", dst]
subprocess.check_call(cmd)
print(dst, f"{os.path.getsize(dst) / 1e6:.1f} MB, {len(said)} lines")
