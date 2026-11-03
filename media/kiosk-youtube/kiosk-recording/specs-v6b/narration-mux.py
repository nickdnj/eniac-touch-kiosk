#!/usr/bin/env python3
"""Lay the narration clips onto a recorded walkthrough at the offsets that
narrate.ts logged, remove the cuts it logged (trimWait / cutFrom..cutTo), and
write an H.264/AAC MP4. Not part of CI.

  python3 tests/web/video/narration-mux.py squares build/video/out/<dir>/video.webm docs/video/eniac-touch-walkthrough-squares.mp4 [--cut 41.5-63]

--cut FROM-TO (seconds of the recording, repeatable) removes more dead time
by hand, after watching a take. A cut that would clip a spoken line is an
error. Cuts are cuts: nothing is sped up, so what is shown is what happened."""
import argparse, json, os, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
ap = argparse.ArgumentParser()
ap.add_argument("video")
ap.add_argument("src")
ap.add_argument("dst")
ap.add_argument("--cut", action="append", default=[], help="FROM-TO in seconds of the recording")
a = ap.parse_args()

ndir = os.path.join(ROOT, "build", "video", "narration")
tl = json.load(open(os.path.join(ndir, f"{a.video}-timeline.json")))
said = tl["said"]
cuts = [(c["from"] / 1000, c["to"] / 1000) for c in tl.get("cuts", [])]
for c in a.cut:
    f, t = c.split("-")
    cuts.append((float(f), float(t)))
src_len = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", a.src]))
cuts = sorted((max(0.0, f), min(t, src_len)) for f, t in cuts if t > f)
merged = []
for f, t in cuts:
    if merged and f <= merged[-1][1]:
        merged[-1] = (merged[-1][0], max(merged[-1][1], t))
    else:
        merged.append((f, t))
cuts = merged

for s in said:
    st, en = s["at"] / 1000, s["at"] / 1000 + s["dur"]
    for f, t in cuts:
        if st < t and en > f:
            sys.exit(f"narration-mux: cut {f:.1f}-{t:.1f} s would clip line {s['idx']} ({st:.1f}-{en:.1f} s)")


def shifted(sec: float) -> float:
    return sec - sum(t - f for f, t in cuts if t <= sec)


keep, prev = [], 0.0
for f, t in cuts:
    keep.append((prev, f))
    prev = t
keep.append((prev, src_len))
keep = [(f, t) for f, t in keep if t - f > 0.05]

cmd = ["ffmpeg", "-loglevel", "error", "-y", "-i", a.src]
for s in said:
    cmd += ["-i", os.path.join(ndir, s["file"])]
parts = []
for k, (f, t) in enumerate(keep):
    parts.append(f"[0:v]trim=start={f:.3f}:end={t:.3f},setpts=PTS-STARTPTS[v{k}]")
parts.append("".join(f"[v{k}]" for k in range(len(keep))) + f"concat=n={len(keep)}:v=1:a=0[vout]")
labels = []
for k, s in enumerate(said, start=1):
    ms = max(0, int(round(shifted(s["at"] / 1000) * 1000)))
    parts.append(f"[{k}:a]aresample=48000,adelay={ms}|{ms}[a{k}]")
    labels.append(f"[a{k}]")
parts.append(f"{''.join(labels)}amix=inputs={len(said)}:normalize=0:dropout_transition=0,apad[aout]")
cmd += ["-filter_complex", ";".join(parts), "-map", "[vout]", "-map", "[aout]", "-r", "25",
        "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k", "-ac", "1", "-shortest", "-movflags", "+faststart", a.dst]
subprocess.check_call(cmd)
out_len = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", a.dst]))
cut_s = sum(t - f for f, t in cuts)
print(f"{a.dst}: {os.path.getsize(a.dst) / 1e6:.1f} MB, {out_len:.0f} s, {len(said)} lines, {len(cuts)} cuts ({cut_s:.0f} s removed)")
