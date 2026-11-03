#!/usr/bin/env python3
"""Seed the worktree's narration cache from the v3 WAVs: every row whose own
text is unchanged gets the old WAV plus a sidecar carrying the NEW cache hash
(which includes its neighbours' text), so narration-gen only sends truly
changed lines to ElevenLabs.  usage: rebless.py <worktree> <old manifest> <old wav dir> [--dry]"""
import hashlib, importlib.util, json, os, shutil, sys
wt, oldman, olddir = sys.argv[1:4]; dry = "--dry" in sys.argv
spec = importlib.util.spec_from_file_location("ng", os.path.join(wt, "tests/web/video/narration-gen.py"))
ng = importlib.util.module_from_spec(spec); spec.loader.exec_module(ng)
old = json.load(open(oldman))
out = os.path.join(wt, "build/video/narration"); os.makedirs(out, exist_ok=True)
md = open(os.path.join(wt, "docs/video/narration.md"), encoding="utf8").read()
settings = {"model": ng.EL_MODEL, **ng.EL_SETTINGS}
reused, todo = 0, []
for vid, rows in ng.sections(md):
    cells = [[c.strip() for c in l.strip().strip("|").split("|")] for l in rows]
    says = [ng.spoken(c[-1], False) for c in cells]
    for n, say in enumerate(says):
        if not say: continue
        prev = next((s for s in reversed(says[:n]) if s), "")
        nxt = next((s for s in says[n + 1:] if s), "")
        tag = hashlib.sha256(json.dumps(["elevenlabs", ng.NICK_VOICE, settings, say, prev, nxt]).encode()).hexdigest()
        f = f"{vid}-{n:02d}.wav"
        src = [r for r in old if r["video"] == vid and r["text"] == say and r["file"]]
        if src and os.path.exists(os.path.join(olddir, src[0]["file"])):
            reused += 1
            if not dry:
                shutil.copy2(os.path.join(olddir, src[0]["file"]), os.path.join(out, f))
                json.dump({"hash": tag, "engine": "elevenlabs", "voice": ng.NICK_VOICE, "text": say, "from": "v3:" + src[0]["file"]}, open(os.path.join(out, f[:-4] + ".json"), "w"))
        else:
            todo.append((f, say))
print(f"reused {reused}; to render {len(todo)}")
for f, s in todo: print("  RENDER", f, s)
