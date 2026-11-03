"""Narration for ENIAC Plays Battleship, recut v3 (audio-only phase).
Voice Nick 2 on ElevenLabs, no fallback: any TTS failure stops the run.
Pronunciation respellings live in scripts/pronunciation-aliases-battleship.json.

Usage (key comes from the interactive zsh env; it is never written anywhere):
  zsh -ic 'python3 scripts/gen_narration.py'                 # all 15 VO lines (VO05 is cut) + 4 cut lines, then rebuild outputs
  zsh -ic 'python3 scripts/gen_narration.py VO05 CUT8-01'    # only these ids
  zsh -ic 'python3 scripts/gen_narration.py --alias ENIAC'   # only lines whose text contains the token (after an alias swap)
  python3 scripts/gen_narration.py --list-alias ENIAC        # show which ids an --alias run would redo (no API call)
  python3 scripts/gen_narration.py --build-only              # rebuild durations / review mp3s / pronunciation reel from existing takes
"""
import argparse, base64, glob, json, os, re, shutil, subprocess, sys, tempfile, urllib.request
ROOT = "/Users/nickd/Workspaces/eniac-battleship-video"
OUT = f"{ROOT}/assets/audio/narration"
RAW = f"{ROOT}/scripts/_raw"
ALIAS_FILE = f"{ROOT}/scripts/pronunciation-aliases-battleship.json"
SB = f"{ROOT}/storyboard/storyboard-data.json"
FF = "/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg"
FP = "/opt/homebrew/opt/ffmpeg-full/bin/ffprobe"
VOICE = "6SxuwKUiBpZjFTc06v9Y"
MODEL = "eleven_multilingual_v2"
SETTINGS = {"stability": 0.5, "similarity_boost": 0.75, "style": 0.4, "speed": 1.12, "use_speaker_boost": True}

L = {  # written text, recut v3 (storyboard/script.md). Asserted against storyboard-data.json below.
"VO01": "That's a game of Battleship. Every shot is worked out by ENIAC, a computer from nineteen forty-six. Well, by a faithful simulation of it.",
"VO02": "I'm Nick, a docent at the Vintage Computer Federation museum. This is ENIAC. It filled a room.",
"VO03": "It was built for the U.S. Army, to work out where artillery shells would land, for the firing tables gun crews used. It was unveiled on February fifteenth, nineteen forty-six.",
"VO04": "So aiming a gun is the most ENIAC thing you can do. Our kiosk lets you, on a simulation that follows the real machine pulse by pulse.",
"VO06": "Here's the game. An enemy destroyer, just under eleven thousand feet away. I pick a destroyer, its quick gun, and the steepest angle: twenty degrees.",
"VO07": "Ships and guns are just the game. My gun and angle become two numbers on the Constant Transmitter. The simulated machine does the rest.",
"VO08": "The kiosk places every cable and switch for me. The Master Programmer is the conductor. The accumulators hold the numbers: which hop, how far along, how high.",
"VO09": "Press READ to take in the card. Then init: the initiating pulse button, as the simulator labels it.",
"VO10": "This is firing-table arithmetic: fifty tiny steps for every second of flight. The multiplier squares the speed. Function Table Two looks up how hard the air pushes back. The punch makes one card: one dot. Join the dots, and that's the shell's path.",
"VO11": "Short. Five hundred and fifteen feet short. That's the destroyer's fastest gun at the steepest angle. It can't reach.",
"VO12": "In this game, the same shot always lands in the same place. So I need more speed: a bigger ship.",
"VO13": "The cruiser. Its long gun. With that speed, I aim lower: ten degrees.",
"VO14": "Four feet off. Sunk. Type your name, and you're on today's board.",
"VO15": "The game is built on Brian Stuart's recreation of the trajectory program. Thank you, Brian L. Stuart, for the simulator that makes it possible.",
"VO16": "Come beat today's high score on a faithful simulation of an eighty-year-old computer. Vintage Computer Federation, at Info Age in Wall, New Jersey. Wednesdays, Saturdays and Sundays, noon to five.",
}
# Short-cut lines: id -> (cut key in storyboard-data.json, beat index, text)
CUTS = {
"CUT30-01": ("30s", 0, "ENIAC is from nineteen forty-six. This game runs on a faithful simulation of it. Let's sink a ship."),
"CUT30-02": ("30s", 2, "Every second of flight is fifty tiny steps of arithmetic, and one punched card. Each card is one dot."),
"CUT30-03": ("30s", 4, "Play it at the Vintage Computer Federation, Info Age, Wall, New Jersey."),
"CUT8-01":  ("8s", 0, "Sink a ship on a simulated ENIAC. The real one's from nineteen forty-six."),
}
for k, (_, _, t) in CUTS.items(): L[k] = t
# Advisory (tighter than the scene) limits taken from the edit-rhythm table / script notes.
ADVISORY = {
 "VO10": (15.0, "scene is 23 s, but the uncut last-2-hops tail starts 1:42 (15 s in) and VO10 must clear before the last card"),
 "VO11": (7.5, "VO11 starts ~1.0 s after the result appears (table: 1:52.5 to 2:00)"),
}

def secs(mmss):
    m, s = mmss.split(":"); return int(m) * 60 + float(s)

def load_aliases():
    j = json.load(open(ALIAS_FILE)); return j["aliases"], j.get("reel_tokens", ["ENIAC", "init"])

def to_spoken(text, aliases, reel=()):
    """Return (spoken_text, spans). spans = [(label, start, end)] in the spoken text for every aliased/reel token."""
    eff = {t: t for t in reel}; eff.update(aliases)
    keys = sorted(eff, key=len, reverse=True); low = {k.casefold(): k for k in eff}
    rx = re.compile(r"(?<!\w)(?:" + "|".join(re.escape(k) for k in keys) + r")(?!\w)", re.I)
    out = []; spans = []; pos = 0; n = 0
    for m in rx.finditer(text):
        g = m.group(0); k = g if g in eff else low[g.casefold()]; a = eff[k]
        if g not in eff:
            a = a.upper() if g.isupper() and len(g) > 1 else (a[0].upper() + a[1:] if g[0].isupper() else a)
        out.append(text[pos:m.start()]); n += len(out[-1]); out.append(a)
        spans.append((k[:-2] if k.endswith("'s") else k, n, n + len(a))); n += len(a); pos = m.end()
    out.append(text[pos:]); return "".join(out), spans

def token_rx(tok): return re.compile(r"(?<!\w)" + re.escape(tok) + r"(?:'s)?(?!\w)", re.I)

def dur(f):
    return float(subprocess.check_output([FP, "-v", "quiet", "-show_entries", "format=duration", "-of", "csv=p=0", f]).decode())

def budgets():
    d = json.load(open(SB)); b = {}
    for s in d["scenes"]:
        nid = s.get("narration_id")
        if nid and "(cut)" in nid: continue
        if nid and "+" not in nid: b[nid] = (float(s["duration_s"]), f"scene {s['id']} {s['start']}-{s['end']}")
        elif nid:  # "VO12 + VO13": shared scene
            for x in nid.replace(" ", "").split("+"): b[x] = (None, f"scene {s['id']} {s['start']}-{s['end']} shared, combined budget {s['duration_s']} s")
    # consistency: the text in this file must match the storyboard
    for s in d["scenes"]:
        nid = s.get("narration_id")
        if not nid or "(cut)" in nid: continue
        want = " ".join(L[x] for x in nid.replace(" ", "").split("+"))
        assert want == s["narration"], f"text drift vs storyboard-data.json for {nid}"
    for k, (ck, bi, t) in CUTS.items():
        beat = d["cuts"][ck]["beats"][bi]; assert beat["vo"] == t, f"text drift for {k}"
        a, z = beat["t"].split("-"); b[k] = (secs(z) - secs(a), f"{ck} cut beat {beat['t']}")
    shared = {s["narration_id"].replace(" ", ""): float(s["duration_s"]) for s in d["scenes"] if s.get("narration_id") and "+" in s["narration_id"] and "(cut)" not in s["narration_id"]}
    return b, shared

def tts(k, text, key):
    al_, rt_ = load_aliases(); say, spans = to_spoken(text, al_, rt_)
    body = json.dumps({"text": say, "model_id": MODEL, "voice_settings": SETTINGS}).encode()
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128",
                                 body, {"xi-api-key": key, "Content-Type": "application/json"})
    try: r = json.loads(urllib.request.urlopen(req, timeout=180).read())
    except Exception as e:
        print("TTS FAIL", k, type(e).__name__, getattr(e, "code", ""), getattr(e, "read", lambda: b"")()[:300]); sys.exit(1)
    return say, spans, r

def record(k, text, key):
    aliases, _ = load_aliases()
    say, spans, r = tts(k, text, key)
    raw = f"{RAW}/{k}.mp3"; open(raw, "wb").write(base64.b64decode(r["audio_base64"]))
    al = r.get("alignment") or r.get("normalized_alignment")
    p = subprocess.run([FF, "-hide_banner", "-i", raw, "-af", "loudnorm=I=-20:TP=-2:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
    j, _ = json.JSONDecoder().raw_decode(p[p.rindex("{"):])
    af = (f"loudnorm=I=-20:TP=-2:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}"
          f":measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    subprocess.run([FF, "-y", "-v", "error", "-i", raw, "-af", af, "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", f"{OUT}/{k}.wav"], check=True)
    open(f"{OUT}/{k}.txt", "w").write(text + "\n")
    json.dump({"text": text, "sent": say, "voice": VOICE, "model": MODEL, "settings": SETTINGS,
               "aliases": aliases, "spans": spans, "alias_file": "scripts/pronunciation-aliases-battleship.json", "alignment": al},
              open(f"{OUT}/{k}.json", "w"))
    print(k, "ok", round(dur(f"{OUT}/{k}.wav"), 2), "s")

def concat_mp3(ids, out, gap_s=0.7):
    tmp = tempfile.mkdtemp(); gap = f"{tmp}/g.wav"
    subprocess.run([FF, "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", str(gap_s), "-c:a", "pcm_s16le", gap], check=True)
    open(f"{tmp}/l.txt", "w").write("".join(f"file '{OUT}/{i}.wav'\nfile '{gap}'\n" for i in ids))
    subprocess.run([FF, "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", f"{tmp}/l.txt", "-c:a", "libmp3lame", "-b:a", "160k", out], check=True)
    shutil.rmtree(tmp)

def build():
    b, shared = budgets()
    vo = sorted(i for i in L if i.startswith("VO") and os.path.exists(f"{OUT}/{i}.wav"))
    cu = [i for i in CUTS if os.path.exists(f"{OUT}/{i}.wav")]
    lines = []; tot = 0
    for i in vo + cu:
        d = dur(f"{OUT}/{i}.wav"); bud, note = b[i]; adv = ADVISORY.get(i)
        e = {"id": i, "seconds": round(d, 3), "text": open(f"{OUT}/{i}.txt").read().strip(), "budget_s": bud, "budget_note": note,
             "over_budget": bool(bud is not None and d > bud), "over_by_s": round(d - bud, 3) if bud is not None and d > bud else 0}
        if adv: e.update({"advisory_budget_s": adv[0], "advisory_note": adv[1], "over_advisory": d > adv[0]})
        if i.startswith("VO"): tot += d
        lines.append(e)
    sec = {x["id"]: x["seconds"] for x in lines}
    combo = None
    if "VO12" in sec and "VO13" in sec:
        c = shared["VO12+VO13"]; combo = {"seconds": round(sec["VO12"] + sec["VO13"], 3), "budget_s": c, "over_budget": sec["VO12"] + sec["VO13"] > c}
    json.dump({"voice": f"Nick 2 {VOICE}", "model": MODEL, "settings": SETTINGS, "aliases": load_aliases()[0],
               "total_narration_seconds": round(tot, 3), "vo12_plus_vo13": combo, "lines": lines},
              open(f"{OUT}/durations.json", "w"), indent=1)
    if len(vo) == sum(1 for k in L if k.startswith("VO")): concat_mp3(vo, f"{OUT}/review-all.mp3")
    if cu: concat_mp3(cu, f"{OUT}/review-cuts.mp3")
    # pronunciation reel: every spoken ENIAC / init in context
    pad = 0.7; clips = []
    rt = load_aliases()[1]
    for i in vo + cu:
        j = json.load(open(f"{OUT}/{i}.json")); a = j["alignment"]
        ch, st, en = a["characters"], a["character_start_times_seconds"], a["character_end_times_seconds"]
        assert "".join(ch) == j["sent"], f"{i}: alignment text differs from sent text"
        for lab, s0, s1 in j["spans"]:
            if lab in rt: clips.append((i, lab, j["sent"][s0:s1], max(0, st[s0] - pad), min(dur(f"{OUT}/{i}.wav"), en[s1 - 1] + pad)))
    tmp = tempfile.mkdtemp(); g = f"{tmp}/g.wav"
    subprocess.run([FF, "-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono", "-t", "1.2", "-c:a", "pcm_s16le", g], check=True)
    ls = []
    for n, (i, lab, heard, t0, t1) in enumerate(clips):
        f = f"{tmp}/c{n:02d}.wav"
        subprocess.run([FF, "-y", "-v", "error", "-ss", f"{t0:.3f}", "-to", f"{t1:.3f}", "-i", f"{OUT}/{i}.wav",
                        "-af", "afade=t=in:d=0.02,afade=t=out:st=%.3f:d=0.03" % (t1 - t0 - 0.03), f], check=True)
        ls.append(f"file '{f}'\nfile '{g}'\n")
    open(f"{tmp}/l.txt", "w").write("".join(ls))
    subprocess.run([FF, "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", f"{tmp}/l.txt", "-c:a", "libmp3lame", "-b:a", "160k", f"{OUT}/pronunciation-reel.mp3"], check=True)
    json.dump([{"n": n + 1, "line": i, "token": lab, "heard_as": h, "clip_start": round(a, 2), "clip_end": round(z, 2)} for n, (i, lab, h, a, z) in enumerate(clips)],
              open(f"{OUT}/pronunciation-reel-index.json", "w"), indent=1)
    shutil.rmtree(tmp)
    print(f"build: total VO {tot:.2f}s, clips in reel {len(clips)}")
    for x in lines:
        flag = " OVER BUDGET by %.2f" % x["over_by_s"] if x["over_budget"] else ""
        flag += " (over advisory %.1f)" % x["advisory_budget_s"] if x.get("over_advisory") else ""
        print(f"  {x['id']:9s} {x['seconds']:6.2f}s  budget {x['budget_s']}{flag}")
    if combo: print("  VO12+VO13", combo)

ap = argparse.ArgumentParser()
ap.add_argument("ids", nargs="*"); ap.add_argument("--alias", action="append", default=[])
ap.add_argument("--list-alias", action="append", default=[]); ap.add_argument("--build-only", action="store_true")
ap.add_argument("--no-build", action="store_true")
a = ap.parse_args()
for t in a.list_alias: print(t, "->", [k for k, v in L.items() if token_rx(t).search(v)]); 
if a.list_alias: sys.exit(0)
wanted = list(a.ids)
for t in a.alias:
    hit = [k for k, v in L.items() if token_rx(t).search(v)]
    if not hit: sys.exit(f"no line contains token {t!r}")
    wanted += hit
for k in wanted: assert k in L, f"unknown id {k}"
ids = [k for k in L if k in wanted] if (a.ids or a.alias) else list(L)
if not a.build_only:
    for k in ids: assert "lehmer" not in L[k].lower()
    words = sum(len(v.split()) for k, v in L.items() if k.startswith("VO"))
    print(f"VO words {words} (storyboard-data declares 353); budgets/text check:", "ok" if budgets() else "")
    key = os.environ.get("ELEVENLABS_API_KEY") or sys.exit("ELEVENLABS_API_KEY not set (run via zsh -ic). No fallback voice: stopping.")
    os.makedirs(RAW, exist_ok=True)
    print("recording:", ids)
    for k in ids: record(k, L[k], key)
if not a.no_build: build()
