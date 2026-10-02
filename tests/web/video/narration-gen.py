#!/usr/bin/env python3
"""Render docs/video/narration.md to WAV clips for the walkthrough videos.
Output: build/video/narration/{video}-NN.wav, one {video}-review.mp3 per video
(every clip in order, for listening through), and manifest.json, read by
narrate.ts. Not part of CI.

  python3 tests/web/video/narration-gen.py                        # ElevenLabs, every video
  python3 tests/web/video/narration-gen.py --only tour,tubes      # just these videos
  python3 tests/web/video/narration-gen.py --engine kokoro [--voice af_heart] [--url http://127.0.0.1:8880]

Engines:
  elevenlabs (default)  Nick's cloned voice. Needs ELEVENLABS_API_KEY in the
                        environment (it is only exported in ~/.zshrc, so run
                        this through `zsh -ic '...'`). Voice id from --voice-id
                        or env VOICE_ID (default: "Nick 2"). Settings are Nick's
                        podcast ones. At most 3 requests at a time. A failed
                        request stops the run: there is no fallback voice.
  kokoro                a local OpenAI-compatible Kokoro server.

A clip is only re-rendered when its text, engine, voice or settings change
(a .json sidecar next to each WAV holds the hash); --force renders them all.

Text-to-speech notes: [FC] and [pause: ...] markers are stripped. Kokoro gets
"ENIAC" as "Eniac" because it spells the all-caps form oddly; ElevenLabs says
the all-caps form as a word (both checked with whisper.cpp), so it gets the
text as written. Lehmer's name is never spoken (pronunciation unverified,
fact-check C10); a line that contains it stops the run."""
import argparse, concurrent.futures, hashlib, json, os, re, subprocess, sys, tempfile, urllib.error, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
OUT = os.path.join(ROOT, "build", "video", "narration")

# Video id -> the heading that starts its section in docs/video/narration.md.
VIDEOS = {
    "squares": "## Video 1:",
    "primes": "## Video 2:",
    "trajectory": "## Video 3:",
    "tour": "## Video 4:",
    "attract": "## Clip A:",
    "explore": "## Clip B:",
    "tubes": "## Clip C:",
    "finale": "## Clip D:",
}

NICK_VOICE = "6SxuwKUiBpZjFTc06v9Y"  # ElevenLabs "Nick 2"
EL_MODEL = "eleven_multilingual_v2"
EL_SETTINGS = {"stability": 0.5, "similarity_boost": 0.75, "style": 0.4, "speed": 1.12}


def sections(md: str):
    for vid, hdr in VIDEOS.items():
        i = md.find(hdr)
        if i < 0:
            continue
        j = md.find("\n## ", i + 5)
        sec = md[i : j if j > 0 else len(md)]
        rows = [l for l in sec.splitlines() if l.startswith("| ") and not l.startswith("| Beat") and not l.startswith("|---")]
        yield vid, rows


def spoken(text: str, respell: bool) -> str:
    say = re.sub(r"\[FC\]|\[pause:[^\]]*\]", "", text)
    say = re.sub(r"\s+", " ", say).strip()
    if respell:
        say = say.replace("ENIAC", "Eniac")
    return say


def duration(path: str) -> float:
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]))


def to_wav(src: str, dst: str) -> None:
    subprocess.check_call(["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-ar", "44100", "-ac", "1", dst])


def elevenlabs(text: str, dst: str, voice_id: str, prev: str, nxt: str) -> None:
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        sys.exit("narration-gen: ELEVENLABS_API_KEY is not set (run through zsh -ic so ~/.zshrc exports it)")
    body = {"text": text, "model_id": EL_MODEL, "voice_settings": EL_SETTINGS}
    if prev:
        body["previous_text"] = prev
    if nxt:
        body["next_text"] = nxt
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "Accept": "audio/mpeg", "xi-api-key": key},
    )
    try:
        audio = urllib.request.urlopen(req, timeout=120).read()
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"ElevenLabs HTTP {e.code}: {e.read()[:400].decode('utf8', 'replace')}") from None
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
        f.write(audio)
    try:
        to_wav(f.name, dst)
    finally:
        os.unlink(f.name)


def kokoro(text: str, dst: str, voice: str, url: str) -> None:
    body = json.dumps({"model": "kokoro", "voice": voice, "input": text, "response_format": "wav"}).encode()
    req = urllib.request.Request(url + "/v1/audio/speech", data=body, headers={"Content-Type": "application/json"})
    open(dst, "wb").write(urllib.request.urlopen(req).read())


def review_mp3(vid: str, files: list[str]) -> str:
    """Every clip of one video in order, 0.6 s apart, as one MP3 to listen through."""
    dst = os.path.join(OUT, f"{vid}-review.mp3")
    cmd = ["ffmpeg", "-loglevel", "error", "-y"]
    parts = []
    for k, f in enumerate(files):
        cmd += ["-i", os.path.join(OUT, f)]
        parts.append(f"[{k}:a]aresample=44100,apad=pad_dur=0.6[a{k}]")
    parts.append("".join(f"[a{k}]" for k in range(len(files))) + f"concat=n={len(files)}:v=0:a=1[out]")
    cmd += ["-filter_complex", ";".join(parts), "-map", "[out]", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "128k", dst]
    subprocess.check_call(cmd)
    return dst


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine", choices=["elevenlabs", "kokoro"], default="elevenlabs")
    ap.add_argument("--voice-id", default=os.environ.get("VOICE_ID", NICK_VOICE), help="ElevenLabs voice id")
    ap.add_argument("--voice", default="af_heart", help="Kokoro voice")
    ap.add_argument("--url", default="http://127.0.0.1:8880", help="Kokoro server")
    ap.add_argument("--only", default="", help="comma-separated video ids (default: all)")
    ap.add_argument("--force", action="store_true", help="re-render clips even if unchanged")
    a = ap.parse_args()
    only = [v for v in a.only.split(",") if v]
    for v in only:
        if v not in VIDEOS:
            sys.exit(f"narration-gen: unknown video {v!r}; known: {', '.join(VIDEOS)}")
    respell = a.engine == "kokoro"
    voice = a.voice_id if a.engine == "elevenlabs" else a.voice
    settings = {"model": EL_MODEL, **EL_SETTINGS} if a.engine == "elevenlabs" else {"url": a.url}
    os.makedirs(OUT, exist_ok=True)
    md = open(os.path.join(ROOT, "docs", "video", "narration.md"), encoding="utf8").read()

    mpath = os.path.join(OUT, "manifest.json")
    old = json.load(open(mpath)) if os.path.exists(mpath) else []
    manifest = [r for r in old if only and r["video"] not in only and r["video"] in VIDEOS]
    jobs = []  # (row, text, prev, next)
    for vid, rows in sections(md):
        if only and vid not in only:
            continue
        cells = [[c.strip() for c in l.strip().strip("|").split("|")] for l in rows]
        says = [spoken(c[-1], respell) for c in cells]
        for n, (c, say) in enumerate(zip(cells, says)):
            if re.search(r"lehmer", say, re.I):
                sys.exit(f"narration-gen: {vid} row {n} speaks Lehmer's name (unverified pronunciation, fact-check C10)")
            row = {"video": vid, "idx": n, "beat": c[0], "text": say, "file": None, "dur": 0.0}
            manifest.append(row)
            if say:
                row["file"] = f"{vid}-{n:02d}.wav"
                prev = next((s for s in reversed(says[:n]) if s), "")
                nxt = next((s for s in says[n + 1 :] if s), "")
                jobs.append((row, say, prev, nxt))

    def render(job):
        row, say, prev, nxt = job
        path = os.path.join(OUT, row["file"])
        tag = hashlib.sha256(json.dumps([a.engine, voice, settings, say, prev, nxt]).encode()).hexdigest()
        side = path[:-4] + ".json"
        if not a.force and os.path.exists(path) and os.path.exists(side) and json.load(open(side)).get("hash") == tag:
            return row, False
        if a.engine == "elevenlabs":
            elevenlabs(say, path, voice, prev, nxt)
        else:
            kokoro(say, path, voice, a.url)
        json.dump({"hash": tag, "engine": a.engine, "voice": voice, "text": say}, open(side, "w"))
        return row, True

    made = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        futs = [pool.submit(render, j) for j in jobs]
        try:
            for f in concurrent.futures.as_completed(futs):
                row, fresh = f.result()  # re-raises the first failure: stop, no fallback
                made += fresh
        except BaseException:
            for f in futs:
                f.cancel()
            raise
    for row, *_ in jobs:
        row["dur"] = round(duration(os.path.join(OUT, row["file"])), 2)

    manifest.sort(key=lambda r: (list(VIDEOS).index(r["video"]), r["idx"]))
    json.dump(manifest, open(mpath, "w"), indent=1)
    print(f"{a.engine} ({voice}): {made} clips rendered, {len(jobs) - made} unchanged")
    for v in VIDEOS:
        if only and v not in only:
            continue
        rs = [r for r in manifest if r["video"] == v]
        if not rs:
            continue
        files = [r["file"] for r in rs if r["file"]]
        mp3 = review_mp3(v, files) if files else "-"
        print(f"{v}: {len(rs)} lines, {sum(r['dur'] for r in rs):.0f} s of speech, review {os.path.relpath(mp3, ROOT)}")


if __name__ == "__main__":
    main()
