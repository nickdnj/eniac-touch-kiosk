#!/usr/bin/env python3
"""Assemble 'ENIAC Plays Battleship' main video (draft 1) with FFmpeg.

    python3 scripts/assemble.py [--only audio|video] [--standin]

Reads: storyboard (timings baked in below), assets/audio/narration/*.wav + durations.json,
assets/audio/music/*.mp3, assets/images/P*.jpg, assets/video/raw/R*.webm (+ -beats.json),
assets/video/manifest.json (clip map, once the re-recorded R2/R3 are final).
Writes: output/battleship-main-draft1.mp4 and output/work/* (scratch, rebuildable).
All text is drawn as PNG overlays composited in FFmpeg (this ffmpeg has no drawtext);
nothing is baked into images. No Hasbro assets anywhere.
"""
import os, sys, json, glob
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from assemble_lib import *

ROOT = os.path.dirname(HERE)
RAW = ROOT + "/assets/video/raw"
NAR = ROOT + "/assets/audio/narration"
MUS = ROOT + "/assets/audio/music"
IMG = ROOT + "/assets/images"
OUT = ROOT + "/output"
WORK = OUT + "/work"
os.makedirs(WORK, exist_ok=True)

DUR = {l["id"]: l["seconds"] for l in json.load(open(NAR + "/durations.json"))["lines"]}

# ------------------------------------------------------------------ clip map
sys.path.insert(0, HERE)
from clipmap import load_clipmap  # R2/R3/R4 mapping (beats -> shots)
CM = load_clipmap(RAW)


def beatmap(f):
    d = {}
    for b in json.load(open(f)):
        d.setdefault(b["beat"], []).append(b["at"] / 1000.0)
    return d


def align_time(vo, phrase, which=0):
    """Seconds into VO wav where `phrase` starts (ElevenLabs char alignment)."""
    d = json.load(open("%s/%s.json" % (NAR, vo)))
    a = d["alignment"]
    text = "".join(a["characters"])
    i = -1
    for _ in range(which + 1):
        i = text.find(phrase, i + 1)
    if i < 0:
        return None
    scale = DUR[vo] / max(a["character_end_times_seconds"][-1], 1e-6)
    scale = scale if 0.8 < scale < 1.25 and abs(scale - 1) > 0.03 else 1.0
    return a["character_start_times_seconds"][i] * scale


# ------------------------------------------------------------------ timeline
segs = []        # (path)
overlays = []    # overlay dicts
vo_events = []   # (t, id)
sfx_events = []  # (t, kind, gain)
T = {}           # anchors
cursor = [0.0]
n_seg = [0]


def add_seg(builder, dur, **kw):
    n_seg[0] += 1
    p = "%s/seg%03d.mp4" % (WORK, n_seg[0])
    if not (os.environ.get("REUSE") and os.path.exists(p)):
        builder(p, dur=dur, **kw)
    segs.append(p)
    t = cursor[0]
    cursor[0] += nfr(dur) / FPS
    return t


def clip(src, ss, dur, **kw):
    return add_seg(lambda p, dur, **k: seg_clip(p, src, ss, dur, **k), dur, **kw)


def photo(img, dur, **kw):
    return add_seg(lambda p, dur, **k: seg_photo(p, img, dur, **k), dur, **kw)


def vo(vid, t):
    vo_events.append((t, vid))
    return t + DUR[vid]


def ov(png, t0, t1, x, y, fin=0.3, fout=0.3):
    overlays.append(dict(png=png, t0=t0, t1=t1, x=x, y=y, fin=fin, fout=fout))


def box(name, lines, **kw):
    p = "%s/ov_%s.png" % (WORK, name)
    png_box_text(p, lines, **kw)
    return p


def credit(name, text):
    p = "%s/ov_%s.png" % (WORK, name)
    png_credit(p, text)
    return p


BR_X = "W-w-40"   # bottom-right anchor expressions
LEAD, TAIL = 0.3, 0.35


def scene_dur(slot, vid=None, lead=LEAD):
    return max(slot, lead + DUR[vid] + TAIL) if vid else slot


def build():
    R1 = CM["r1"]
    P = lambda n: glob.glob("%s/%s-*.jpg" % (IMG, n))[0]
    # ---- Chapter 1 -------------------------------------------------------------
    # S1: R1 title loop; SUNK! stamp lands at 3.0 s (stamp onset ~4.7 s in source loop)
    T["s1"] = clip(R1, CM["r1_stamp_onset"] - 3.0, 4.0)
    T["stamp"] = T["s1"] + 3.0
    # S2: R1 continues, then plan screen; VO01
    T["s2"] = cursor[0]
    clip(R1, CM["r1_stamp_onset"] + 1.0, 3.5)
    clip(*CM["plan"], 4.5, hold=0.5)
    vo("VO01", T["s2"] + LEAD)
    title = box("title", ["ENIAC PLAYS BATTLESHIP"], size=84, font=FONT_BLK, pad=(50, 30),
                bg=(10, 18, 36, 225), accent=(214, 40, 40, 255))
    ov(title, T["s2"] + 0.5, T["s2"] + 5.0, "(W-w)/2", "H-h-150", fin=0.5, fout=0.5)
    # ---- Chapter 2 -------------------------------------------------------------
    d = scene_dur(7, "VO02")
    T["s3"] = photo(P("P1"), d, fade_in=0.4, fade_out=0.25)
    vo("VO02", T["s3"] + LEAD)
    lt = box("lt", ["Nick DeMarco", "Docent, Vintage Computer Federation"], size=48, accent=(214, 40, 40, 255))
    ov(lt, T["s3"] + 0.5, T["s3"] + 5.0, "70", "H-h-120")
    ov(credit("c_army1", "U.S. Army Photo"), T["s3"] + 0.5, T["s3"] + d - 0.3, BR_X, "H-h-30", 0.3, 0.3)
    d = scene_dur(12, "VO03")
    T["s4"] = cursor[0]
    photo(P("P4"), 6.0, motion="pan-down", fade_in=0.25, fade_out=0.25)
    photo(P("P2"), d - 6.0, fade_in=0.25, fade_out=0.25)
    vo("VO03", T["s4"] + LEAD)
    ov(credit("c_p4", "War Department, TM 6-215 (1941) · Internet Archive"), T["s4"] + 0.5, T["s4"] + 5.8, BR_X, "H-h-30", 0.3, 0.3)
    date = box("date", ["Shown to the public", "February 15, 1946"], size=52, accent=(214, 40, 40, 255))
    ov(date, T["s4"] + 7.0, T["s4"] + d - 0.6, "70", "H-h-130")
    ov(credit("c_army2", "U.S. Army Photo"), T["s4"] + 6.5, T["s4"] + d - 0.3, BR_X, "H-h-30", 0.3, 0.3)
    d = scene_dur(10, "VO04")
    T["s5"] = cursor[0]
    cm_b = CM["briefing"]
    clip(cm_b[0], cm_b[1], 5.0)
    clip(*CM["plan"], d - 5.0, hold=0.9)
    vo("VO04", T["s5"] + LEAD)
    # ---- Chapter 3 -------------------------------------------------------------
    d = scene_dur(12, "VO05")
    T["s6"] = cursor[0]
    photo(P("P3"), 6.0, fade_in=0.25, fade_out=0.25)
    clip(CM["r6"], 0.0, d - 6.0, hold=max(0, d - 6.0 - 12.0) + 0.0)
    vo("VO05", T["s6"] + LEAD)
    cap = box("cap3", ["Betty Jean Jennings (left) and Frances Bilas (right), 1946"], size=38, accent=(214, 40, 40, 255))
    ov(cap, T["s6"] + 0.5, T["s6"] + 5.7, "70", "H-h-120")
    ov(credit("c_army3", "U.S. Army Photo"), T["s6"] + 0.5, T["s6"] + 5.7, BR_X, "H-h-30", 0.3, 0.3)
    # ---- Chapter 4: you play -----------------------------------------------------
    A, B = CM["A"], CM["B"]
    # S7 pick a ship (aim screen, slow taps, dials, load)
    d = scene_dur(9, "VO06")
    T["s7"] = clip(A["file"], A["aim_open"] - 0.2, d)
    vo("VO06", T["s7"] + LEAD)
    # S8 two numbers: build intro, then tour stop 7 (Constant Transmitter, out of order)
    d = scene_dur(10, "VO07")
    T["s8"] = cursor[0]
    clip(A["file"], CM["build_intro"] + 1.0, 3.0)
    clip(A["file"], CM["tour"][7] + 0.2, d - 3.0)
    vo("VO07", T["s8"] + LEAD)
    call = lambda nm, txt: box(nm, [txt], size=44, accent=(255, 193, 7, 255), bg=(10, 18, 36, 225))
    ov(call("co_ct", "Constant Transmitter"), T["s8"] + 3.2, T["s8"] + d - 0.4, BR_X, "H-h-190", 0.25, 0.3)
    # S9 room walk: tour stops 2 (Master Programmer) and 6 (Accumulators)
    d = scene_dur(12, "VO08")
    T["s9"] = cursor[0]
    clip(A["file"], CM["tour"][2] + 0.2, d / 2)
    clip(A["file"], CM["tour"][6] + 0.2, d - d / 2)
    vo("VO08", T["s9"] + LEAD)
    mp = align_time("VO08", "The Master Programmer")
    ov(call("co_mp", "Master Programmer"), T["s9"] + 0.4, T["s9"] + d / 2 - 0.2, BR_X, "H-h-190", 0.25, 0.25)
    ov(call("co_acc", "Accumulators"), T["s9"] + d / 2 + 0.3, T["s9"] + d - 0.3, BR_X, "H-h-190", 0.25, 0.3)
    # S10 READ, init
    d = scene_dur(7, "VO09")
    T["s10"] = clip(A["file"], A["read"] - 0.4, d)
    vo("VO09", T["s10"] + LEAD)
    T["initA_tick"] = T["s10"] + 0.4 + (A["init"] - A["read"])
    # S11 flight A
    build_flight_A(A)
    # S12 splash
    build_result_A(A)
    # ---- Chapter 5 ------------------------------------------------------------------
    build_reaim(A, B)
    build_flight_B(B)
    build_sunk(B)
    # S17 name on the board
    d = scene_dur(4, "VO14")
    T["s17"] = clip(CM["name"][0], CM["name"][1], d, hold=max(0, d - CM["name"][2]))
    vo("VO14", T["s17"] + LEAD)
    # ---- Chapter 6 -------------------------------------------------------------------
    d = scene_dur(9, "VO15")
    T["s18"] = clip(R1, 6.0, d, hold=0)
    vo("VO15", T["s18"] + LEAD)
    st = box("stuart", ["Simulator: Brian L. Stuart, Drexel University", "cs.drexel.edu/~bls96/eniac"], size=44,
             accent=(255, 193, 7, 255))
    ov(st, T["s18"] + 0.6, T["s18"] + d - 0.4, "(W-w)/2", "H-h-150")
    d = scene_dur(10, "VO16")
    T["s19"] = clip(R1, 6.0, d, darken=0.75, vf_extra="boxblur=16:2")
    vo("VO16", T["s19"] + LEAD)
    lines = ["Come play ENIAC Battleship", "Vintage Computer Federation", "InfoAge Science and History Museums",
             "2201 Marconi Rd, Wall NJ", "Wed, Sat & Sun · 12 to 5"]
    sizes = [78, 52, 52, 46, 52]
    y = 250
    t0 = T["s19"] + 0.4
    for i, (ln, sz) in enumerate(zip(lines, sizes)):
        p = "%s/ov_end%d.png" % (WORK, i)
        png_box_text(p, [ln], size=sz, bg=(0, 0, 0, 0), font=FONT_BLK if i == 0 else FONT_B, pad=(10, 6),
                     colors=[(255, 255, 255, 255) if i else (255, 214, 90, 255)])
        ov(p, t0 + i * 1.3, T["s19"] + d - 0.5, "(W-w)/2", str(y), 0.5, 0.5)
        y += int(sz * 1.15) + 24
    cr = credit("c_music", "Photos: U.S. Army; War Department TM 6-215 (1941), Internet Archive   ·   Music: Kevin MacLeod (incompetech.com), CC BY 4.0")
    ov(cr, T["s19"] + 0.4, T["s19"] + d - 0.5, "40", "H-h-24", 0.5, 0.5)
    T["end"] = cursor[0]
    clip_end = None


# ------------------------------------------------------------------ finale pieces
CUTS = {
    "cards": "crop=640:360:760:480,scale=1920:1080:flags=bicubic",
    "lamps": "crop=853:480:0:600,scale=1920:1080:flags=bicubic",
}


def call_box(name, txt):
    return box(name, [txt], size=44, accent=(255, 193, 7, 255), bg=(10, 18, 36, 225))


def condensed_pieces(F, F_cut, target):
    """Flights run ~3.7 s/hop on the recording machine (storyboard assumed 1.5), so they are
    condensed by jump cuts, never sped up: the first card, a middle cycle of plot / card-strip
    punch-in / lamp punch-in cutaways (same deterministic shot from the repeat take), then the
    last 3 hops uncut to the landing."""
    hops, landed = F["hops"], F["landed"]
    real_start = hops[-4] + 0.3
    real_dur = landed - real_start
    head = 2.0
    pieces = [("plot", F["file"], F["head_ss"], head)]
    avail = target - head - real_dur
    n = max(int(avail / 1.6), 3)
    each = avail / n
    mids = len(hops) - 5
    cyc = ["plot", "cards", "lamps"]
    for i in range(n):
        idx = 1 + int((i + 0.5) * mids / n)
        k = cyc[i % 3]
        if k == "plot" or not F_cut:
            f, t = F["file"], hops[idx]
        else:
            f, t = F_cut["file"], F_cut["hops"][min(idx, len(F_cut["hops"]) - 1)]
        pieces.append((k, f, t - 0.3, each))
    pieces.append(("plot", F["file"], real_start, real_dur))
    return pieces


def build_flight_A(A):
    T["s11"] = cursor[0]
    for kind, f, ss, du in condensed_pieces(A, CM.get("A_cut"), 26.0):
        clip(f, ss, du, vf_extra=CUTS.get(kind, ""))
    T["landA"] = cursor[0]
    vo("VO10", T["s11"] + LEAD)
    base = T["s11"] + LEAD
    c_m = align_time("VO10", "The multiplier") or 6
    c_f = align_time("VO10", "Function Table") or 9
    c_p = align_time("VO10", "Then the punch") or 13
    ov(call_box("co_mult", "Multiplier"), base + c_m, base + c_f - 0.2, BR_X, "H-h-190", 0.25, 0.25)
    ov(call_box("co_ft2", "Function Table 2"), base + c_f, base + c_p - 0.2, BR_X, "H-h-190", 0.25, 0.25)
    ov(call_box("co_punch", "One card = one dot"), base + c_p, base + c_p + 4.5, BR_X, "H-h-190", 0.25, 0.3)
    T["A_drum"] = [T["landA"] - (A["landed"] - h) for h in A["hops"][-3:]]


def build_result_A(A):
    d = (A["result"] - A["landed"]) + 1.9 + DUR["VO11"] + 0.4
    T["s12"] = cursor[0]
    clip(A["file"], A["landed"], d, hold=max(0, d - (A["result_end"] - A["landed"])))
    T["resA"] = T["s12"] + (A["result"] - A["landed"])
    vo("VO11", T["resA"] + 1.9)
    ov(box("short", ["515 FT SHORT"], size=76, font=FONT_BLK, pad=(40, 22), accent=(214, 40, 40, 255)),
       T["resA"] + 0.6, T["resA"] + 3.2, "760", "300", 0.3, 0.4)


def build_reaim(A, B):
    # hold on the aim screen, then slow taps; VO13 is cut into three words spaced to the taps
    T["s13"] = cursor[0]
    clip(B["file"], B["aim_open"] - 0.1, 3.4 + 3.0, hold=3.0)
    t_tap0 = B["ship"] - 0.5
    clip(B["file"], t_tap0, B["load"] + 0.9 - t_tap0)
    base = T["s13"] + 6.4
    T["taps13"] = [base + (B[k] - t_tap0) for k in ("ship", "gun", "elev")]
    vo("VO12", T["s13"] + 0.3)
    T["vo13_words"] = []
    for ph, tt in zip(("The cruiser", "Its long gun", "Ten degrees"), T["taps13"]):
        T["vo13_words"].append(tt)
    T["vo13"] = T["taps13"][0]
    # S14: load, READ, INIT; no voice
    T["s14"] = cursor[0]
    clip(B["file"], B["load"] + 0.9, 1.0)
    clip(B["file"], B["read"] - 0.3, 1.0)
    clip(B["file"], B["init"] - 0.6, 1.0)
    T["initB"] = cursor[0]


def build_flight_B(B):
    T["s15"] = cursor[0]
    for kind, f, ss, du in condensed_pieces(B, CM.get("B_cut"), 19.0):
        clip(f, ss, du, vf_extra=CUTS.get(kind, ""))
    T["landB"] = cursor[0]
    T["B_drum"] = [T["landB"] - (B["landed"] - h) for h in B["hops"][-3:]]


def build_sunk(B):
    T["s16"] = cursor[0]
    dur = 7.0
    clip(B["file"], B["landed"], dur, hold=max(0, dur - (B["result_end"] - B["landed"])))
    T["resB"] = T["s16"] + (B["result"] - B["landed"])
    stamp = "%s/ov_stamp.png" % WORK
    png_stamp(stamp, size=120)
    ov(stamp, T["s16"] + 0.15, T["s16"] + 2.9, "520", "40", 0.05, 0.4)
    T["s16_end"] = cursor[0]


# ------------------------------------------------------------------ audio
def build_audio(total):
    n = int(total * SR)
    nar = np.zeros((n, 2), dtype=np.float32)
    vo_events.extend([])
    for t, vid in vo_events:
        x, sr = sf.read("%s/%s.wav" % (NAR, vid), dtype="float32")
        assert sr == SR, sr
        x = np.stack([x, x], 1) if x.ndim == 1 else x
        place(nar, x, t)
    # VO13 cut into three phrases, each landed on its tap (alignment from the TTS json)
    x13, _ = sf.read("%s/VO13.wav" % NAR, dtype="float32")
    x13 = np.stack([x13, x13], 1) if x13.ndim == 1 else x13
    d13 = json.load(open(NAR + "/VO13.json"))["alignment"]
    txt13 = "".join(d13["characters"])
    st = [d13["character_start_times_seconds"][txt13.find(p)] for p in ("The cruiser", "Its long gun", "Ten degrees")]
    en = st[1:] + [DUR["VO13"]]
    for tt, a0, a1 in zip(T["vo13_words"], st, en):
        seg = x13[int(max(a0 - 0.04, 0) * SR):int(a1 * SR)]
        place(nar, seg, tt - 0.05)
    # narration loudness: -3 dBFS peak-ish; final loudnorm later
    peak = np.max(np.abs(nar))
    nar *= 0.7 / max(peak, 1e-6)
    act = smooth(np.abs(nar).max(1), 0.35)
    act = np.clip(act / 0.12, 0, 1)
    act = smooth(act, 0.4)

    hs = load_audio(MUS + "/Hot Swing.mp3")
    pe = load_audio(MUS + "/Private Eye.mp3")
    bm = load_audio(MUS + "/Bumbly March.mp3")
    music = np.zeros((n, 2), dtype=np.float32)

    def bed(t0, t1, track, ss, gain_pts, duck=0.62, lp=None):
        seg = loop_to(track[int(ss * SR):], int((t1 - t0) * SR), xf=0.6)
        if lp:
            seg = lowpass(seg, lp)
        i0 = int(t0 * SR)
        g = env_from_points(len(seg), [(a - t0, b) for a, b in gain_pts])
        a = act[i0:i0 + len(seg)]
        gd = g * (1 - duck * a[:len(seg)])
        music[i0:i0 + len(seg)] += seg[:len(gd)] * gd[:, None] if len(gd) == len(seg) else 0

    s = T
    A_mode = CM["A"].get("mode")
    # M1/M2/M3: Hot Swing bed from 0 to just before flight A thin-out
    flightA_start = s["s11"]
    bed(0.0, flightA_start + 0.5, hs, 0.0,
        [(0, 0.55), (4.0, 0.55), (6.0, 0.30), (flightA_start - 1, 0.30), (flightA_start + 0.5, 0.0)])
    # brass hit on the stamp: Hot Swing's final chord, quiet
    chord = hs[int(46.2 * SR):int(50.06 * SR)].copy()
    chord *= np.linspace(1, 0.0, len(chord))[:, None] ** 0.7
    place(music, chord[: int(1.6 * SR)], s["stamp"] - 0.02, 0.5)
    # Flight A: bed thins to snare and bass (lowpassed, low) until music-out before the last 3 hops
    outA = s["A_drum"][0] - 0.5
    bed(flightA_start, outA, hs, 12.0, [(flightA_start, 0.0), (flightA_start + 0.5, 0.20), (outA - 0.8, 0.20), (outA, 0.0)],
        lp=900)
    # drums on the last cards of A, splash at landing, silence
    for t in s["A_drum"]:
        sfx_events.append((t, "drum", 0.7))
    sfx_events.append((s["landA"], "splash", 0.8))
    # M4 trombone figure on the result reveal (Bumbly March opening, ~2 s; unverified)
    fig = bm[int(0.0 * SR):int(2.4 * SR)].copy()
    fig *= np.linspace(1, 0, len(fig))[:, None] ** 0.5
    place(music, fig, s["resA"] + 1.0, 0.45)
    # M3' bed returns low from VO11 start through re-aim (rising snare under VO13)
    reA = s["resA"] + 2.4
    bed(reA, s["initB"], hs, 14.0, [(reA, 0.0), (reA + 1.0, 0.16), (s["initB"] - 0.5, 0.16), (s["initB"], 0.0)], duck=0.7)
    # rising snare under VO13 and the B load/read/init
    roll_dur = (s["initB"] + 0.6) - s["vo13"]
    roll = synth_snare_roll(roll_dur, 0.03, 0.5)
    place(music, roll, s["vo13"], 0.5)
    for t in s["taps13"]:
        sfx_events.append((t, "tap", 0.8))
    sfx_events.append((s["initA_tick"], "tap", 1.0))
    # M7 Private Eye build through flight B until music-out before last 3 hops
    outB = s["B_drum"][0] - 0.5
    bed(s["initB"], outB, pe, 34.0, [(s["initB"], 0.0), (s["initB"] + 1.5, 0.45), (outB - 1.0, 0.55), (outB, 0.0)], duck=0.0)
    for t in s["B_drum"]:
        sfx_events.append((t, "drum", 0.8))
    # M5 impact + sting, then 1.5 s quiet
    sfx_events.append((s["landB"], "impact", 0.9))
    sting = hs[int(46.2 * SR):int(50.06 * SR)].copy()
    place(music, sting, s["landB"], 0.9)
    # S17 tag bed, ducked, then M6 closer (button ending at video end)
    t17 = s["s17"]
    bed(t17, s["s18"] + 0.0, hs, 5.0, [(t17, 0.0), (t17 + 0.3, 0.30), (s["s18"] - 0.1, 0.30), (s["s18"], 0.0)])
    closer_len = total - s["s18"]
    ss_c = 50.06 - closer_len
    cl = hs[int(max(ss_c, 0) * SR):].copy()
    gi = env_from_points(len(cl), [(0, 0.0), (0.8, 0.30), (closer_len - 4.5, 0.30), (closer_len - 3.6, 0.55), (closer_len, 0.55)])
    a = act[int(s["s18"] * SR):int(s["s18"] * SR) + len(cl)]
    gd = gi[:len(a)] * (1 - 0.55 * a)
    music[int(s["s18"] * SR):int(s["s18"] * SR) + len(a)] += cl[:len(a)] * gd[:, None]
    # SFX
    sfx = np.zeros((n, 2), dtype=np.float32)
    syn = dict(drum=synth_drum(), splash=synth_splash(), impact=synth_impact(), tap=synth_tap())
    for t, kind, g in sfx_events:
        place(sfx, syn[kind], t, g)
    # room tone in the quiet beat
    mix = nar + music + sfx
    mix += room_tone(n)
    mix = np.clip(mix, -1, 1)
    sf.write(WORK + "/mix.wav", mix, SR)
    # loudness master
    ff("-i", WORK + "/mix.wav", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", SR, WORK + "/final-audio.wav")


# ------------------------------------------------------------------ main
if __name__ == "__main__":
    build()
    total = cursor[0]
    print("timeline anchors:", json.dumps({k: (round(v, 2) if not isinstance(v, list) else [round(x, 2) for x in v]) for k, v in T.items()}))
    print("total", total)
    base = WORK + "/video-base.mp4"
    concat(segs, base)
    vid = WORK + "/video-ov.mp4"
    overlay_pass(base, overlays, vid, total)
    build_audio(total)
    ff("-i", vid, "-i", WORK + "/final-audio.wav", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
       "-shortest", "-movflags", "+faststart", OUT + "/battleship-main-draft1.mp4")
    json.dump(dict(anchors={k: v for k, v in T.items()}, total=total), open(WORK + "/timeline.json", "w"))
    print("done", OUT + "/battleship-main-draft1.mp4")
