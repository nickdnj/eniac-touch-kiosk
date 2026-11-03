#!/usr/bin/env python3
"""Draft 2 (recut v3) of 'ENIAC Plays Battleship'. Run: python3 scripts/assemble_draft2.py
(REUSE=1 skips re-rendering unchanged video segments in output/work2).

Changes vs draft 1 (editor notes in storyboard.md): no zooms or punch-ins anywhere (photos are
static holds, P4 keeps its pan, kiosk footage always full frame, unscaled); flights condensed by
plain jump cuts on the full frame, last 2 hops uncut; kiosk waits after both landings are cut
out; stamp and sting land on the frame where the kiosk shows the result; the re-aim beat is
cut to the picture; SFX from Wikimedia Commons public-domain files; overlays kept off buttons.
Text is drawn as PNG overlays (this ffmpeg has no drawtext). No Hasbro assets.
"""
import os, sys, json, glob
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from assemble_lib import *
from clipmap import load_clipmap, _seq, _first

ROOT = os.path.dirname(HERE)
NAR = ROOT + "/assets/audio/narration"
MUS = ROOT + "/assets/audio/music"
SFXD = ROOT + "/assets/audio/sfx"
IMG = ROOT + "/assets/images"
OUT = ROOT + "/output"
WORK = OUT + "/work2"
os.makedirs(WORK, exist_ok=True)
CM = load_clipmap(ROOT + "/assets/video/raw")
R2B = _seq(ROOT + "/assets/video/raw/R2-beats.json")
DUR = {l["id"]: l["seconds"] for l in json.load(open(NAR + "/durations.json"))["lines"]}
BR_Y = "H-h-52"          # bottom band, clear of kiosk buttons (footer text is at the very bottom left)
CTR = "(W-w)/2"

segs, overlays, vo_events, sfx_events, T = [], [], [], [], {}
cursor = [0.0]
n_seg = [0]
LEAD, TAIL = 0.3, 0.35


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


def call(nm, txt):
    return box(nm, [txt], size=44, accent=(255, 193, 7, 255), bg=(10, 18, 36, 225))


def scene_dur(slot, vid=None, lead=LEAD):
    return max(slot, lead + DUR[vid] + TAIL) if vid else slot


def align_time(vid, phrase, which=0):
    a = json.load(open("%s/%s.json" % (NAR, vid)))["alignment"]
    text = "".join(a["characters"])
    i = -1
    for _ in range(which + 1):
        i = text.find(phrase, i + 1)
    if i < 0:
        return None
    return a["character_start_times_seconds"][i]


def jump_cuts(F, F_cut, target, head, n_mid, cut_every=None):
    """Plain jump cuts on the FULL frame: head, n_mid snippets spread through the middle hops
    (alternating the main take and the repeat take of the same shot), last 2 hops uncut."""
    hops, landed = F["hops"], F["landed"]
    rs = hops[-3] + 0.3
    tail = landed - rs
    each = (target - head - tail) / n_mid
    pcs = [(F["file"], F["head_ss"], head)]
    mids = len(hops) - 4
    for i in range(n_mid):
        idx = 1 + int((i + 0.5) * mids / n_mid)
        if F_cut and i % 2 == 1:
            pcs.append((F_cut["file"], F_cut["hops"][min(idx, len(F_cut["hops"]) - 1)] - 0.3, each))
        else:
            pcs.append((F["file"], hops[idx] - 0.3, each))
    pcs.append((F["file"], rs, tail))
    return pcs, tail


def build():
    R1 = CM["r1"]
    P = lambda n: glob.glob("%s/%s-*.jpg" % (IMG, n))[0]
    A, B = CM["A"], CM["B"]
    f2 = A["file"]
    red = (214, 40, 40, 255)
    # ---- Chapter 1 ---
    T["s1"] = clip(R1, CM["r1_stamp_onset"] - 3.0, 4.0)
    T["stamp"] = T["s1"] + 3.0
    d = scene_dur(9, "VO01")
    T["s2"] = cursor[0]
    clip(R1, CM["r1_stamp_onset"] + 1.0, 4.0)
    clip(*CM["plan"], d - 4.0, hold=1.0)
    vo("VO01", T["s2"] + LEAD)
    title = box("title", ["ENIAC PLAYS BATTLESHIP"], size=72, font=FONT_BLK, pad=(40, 24), bg=(10, 18, 36, 225), accent=red)
    ov(title, T["s2"] + 0.5, T["s2"] + 5.0, "700-w/2", "800", 0.5, 0.5)    # over the board, clear of the right-hand buttons
    # ---- Chapter 2 ---
    d = scene_dur(7, "VO02")
    T["s3"] = photo(P("P1"), d, motion="static", fade_in=0.4, fade_out=0.25)
    vo("VO02", T["s3"] + LEAD)
    lt = box("lt", ["Nick DeMarco", "Docent, Vintage Computer Federation"], size=48, accent=red)
    ov(lt, T["s3"] + 0.5, T["s3"] + 5.0, "70", "H-h-120")
    ov(credit("c_army1", "U.S. Army Photo"), T["s3"] + 0.5, T["s3"] + d - 0.3, "W-w-40", "H-h-30")
    d = scene_dur(11, "VO03")
    T["s4"] = cursor[0]
    photo(P("P4"), 5.5, motion="pan-down", fade_in=0.25, fade_out=0.25)
    photo(P("P2"), d - 5.5, motion="static", fade_in=0.25, fade_out=0.25)
    vo("VO03", T["s4"] + LEAD)
    ov(credit("c_p4", "War Department, TM 6-215 (1941) · Internet Archive"), T["s4"] + 0.5, T["s4"] + 5.3, "W-w-40", "H-h-30")
    ov(box("date", ["Shown to the public", "February 15, 1946"], size=52, accent=red), T["s4"] + 6.5, T["s4"] + d - 0.6, "70", "H-h-130")
    ov(credit("c_army2", "U.S. Army Photo"), T["s4"] + 6.0, T["s4"] + d - 0.3, "W-w-40", "H-h-30")
    d = scene_dur(9, "VO04")
    T["s5"] = cursor[0]
    clip(CM["briefing"][0], CM["briefing"][1], 4.5)
    clip(*CM["plan"], d - 4.5, hold=0.5)
    vo("VO04", T["s5"] + LEAD)
    # ---- Chapter 3 ---
    d = scene_dur(12, "VO05")
    T["s6"] = cursor[0]
    photo(P("P3"), 6.0, motion="static", fade_in=0.25, fade_out=0.25)
    clip(CM["r6"], 0.0, d - 6.0, hold=max(0, d - 6.0 - 12.0))
    vo("VO05", T["s6"] + LEAD)
    ov(box("cap3", ["Betty Jean Jennings (left) and Frances Bilas (right), 1946"], size=38, accent=red), T["s6"] + 0.5, T["s6"] + 5.7, "70", "H-h-120")
    ov(credit("c_army3", "U.S. Army Photo"), T["s6"] + 0.5, T["s6"] + 5.7, "W-w-40", "H-h-30")
    # ---- Chapter 4 ---
    d = scene_dur(9.5, "VO06")
    T["s7"] = clip(f2, A["aim_open"] - 0.2, d)
    vo("VO06", T["s7"] + LEAD)
    d = scene_dur(9, "VO07")
    T["s8"] = cursor[0]
    clip(f2, CM["build_intro"] + 1.0, 2.5)
    clip(f2, CM["tour"][7] + 0.2, d - 2.5)
    vo("VO07", T["s8"] + LEAD)
    ct = align_time("VO07", "Constant") or 3.0
    ov(call("co_ct", "Constant Transmitter"), T["s8"] + max(LEAD + ct - 0.2, 2.6), T["s8"] + d - 0.4, CTR, BR_Y, 0.25, 0.3)
    d = scene_dur(9.5, "VO08")
    T["s9"] = cursor[0]
    clip(f2, CM["tour"][2] + 0.2, d / 2)
    clip(f2, CM["tour"][6] + 0.2, d - d / 2)
    vo("VO08", T["s9"] + LEAD)
    ov(call("co_mp", "Master Programmer"), T["s9"] + 0.6, T["s9"] + d / 2 - 0.2, CTR, BR_Y, 0.25, 0.25)
    ov(call("co_acc", "Accumulators"), T["s9"] + d / 2 + 0.3, T["s9"] + d - 0.3, CTR, BR_Y, 0.25, 0.3)
    d = scene_dur(7, "VO09")
    T["s10"] = clip(f2, A["read"] - 0.4, d)
    vo("VO09", T["s10"] + LEAD)
    T["initA_tick"] = T["s10"] + 0.4 + (A["init"] - A["read"])
    # ---- S11 flight A: jump cuts on the full frame, last 2 hops uncut ---
    T["s11"] = cursor[0]
    pcs, tail = jump_cuts(A, CM["A_cut"], 22.0, 2.0, 6)
    for f, ss, du in pcs:
        clip(f, ss, du)
    T["landA"] = cursor[0]
    end10 = vo("VO10", T["s11"] + LEAD)
    base = T["s11"] + LEAD
    cm_, cf_, cp_ = (align_time("VO10", k) for k in ("The multiplier", "Function Table", "The punch"))
    ov(call("co_mult", "Multiplier"), base + cm_, base + cf_ - 0.15, "W-w-60", BR_Y, 0.25, 0.2)
    ov(call("co_ft2", "Function Table 2"), base + cf_, base + cp_ - 0.15, "W-w-60", BR_Y, 0.25, 0.2)
    ov(call("co_punch", "One card = one dot"), base + cp_, base + cp_ + 4.0, "W-w-60", BR_Y, 0.25, 0.3)
    T["A_drum"] = [T["landA"] - (A["landed"] - h) for h in A["hops"][-2:]]
    T["vo10_end"] = end10
    # ---- S12: hold the splash, jump over the kiosk's wait to the result ---
    T["s12"] = cursor[0]
    hold_s = 1.3
    clip(f2, A["landed"], hold_s)
    res_vis = A["result"] - 0.1                    # first frame of the result screen
    pos = cursor[0] - T["s12"]
    d12_tail = 1.0 + DUR["VO11"] + 0.4
    clip(f2, res_vis, d12_tail)
    T["resA"] = T["s12"] + pos
    vo("VO11", T["resA"] + 1.0)
    ov(box("short", ["515 FT SHORT"], size=76, font=FONT_BLK, pad=(40, 22), accent=red), T["resA"] + 0.6, T["resA"] + 2.8, "760", "300", 0.3, 0.4)
    # ---- Chapter 5: the re-aim, cut to the picture ---
    T["s13"] = cursor[0]
    # result A hold ending on the 'Fire again' tap, then jump over the kiosk's loading wait to the aim screen
    D1 = 2.2
    clip(f2, A["result_end"] - 0.05 - D1, D1)       # ends just before the click: the loading screen it triggers is cut out
    ss13 = B["aim_open"]
    d13 = (B["load"] + 0.6) - ss13
    clip(f2, ss13, d13)
    # beat timestamps are logged just after the highlight appears: visual tap = beat - 0.12 s (checked by frame diff)
    tap = {k: T["s13"] + D1 + (B[k] - ss13) - 0.12 for k in ("ship", "gun", "elev")}
    T["taps13"] = [tap["ship"], tap["gun"], tap["elev"]]
    vo("VO12", T["s13"] + 0.2)
    T["vo12_end"] = T["s13"] + 0.2 + DUR["VO12"]
    T["s14"] = cursor[0]
    clip(f2, B["load"] + 0.7, 1.0)
    clip(f2, B["read"] - 0.3, 1.0)
    clip(f2, B["init"] - 0.6, 1.0)
    T["initB"] = cursor[0]
    # ---- S15 flight B ---
    T["s15"] = cursor[0]
    pcs, tail = jump_cuts(B, CM["B_cut"], 12.0, 1.6, 2)
    for f, ss, du in pcs:
        clip(f, ss, du)
    T["landB"] = cursor[0]
    T["B_drum"] = [T["landB"] - (B["landed"] - h) for h in B["hops"][-2:]]
    # ---- S16: landing, jump over the wait, 'Ship sunk!' result, stamp on that frame ---
    T["s16"] = cursor[0]
    clip(f2, B["landed"], 1.0)
    clip(f2, B["result"] - 0.1, 5.1)
    T["resB"] = T["s16"] + 1.0 + 0.1               # result screen visible (kiosk 'Ship sunk!')
    T["s16_end"] = cursor[0]
    stamp = "%s/ov_stamp.png" % WORK
    png_stamp(stamp, size=130)
    ov(stamp, T["resB"] + 0.1, T["resB"] + 2.6, "W-w-120", "175", 0.04, 0.4)   # 3 frames after the screen shows
    # ---- S17 ---
    nm_open = _first(R2B, "name-open"); nm_typed = _first(R2B, "name-typed"); board = _first(R2B, "board")
    T["s17"] = cursor[0]
    clip(f2, nm_open - 4.2, 1.5)             # result screen hold (Four feet off. Sunk.)
    clip(f2, nm_typed - 1.4, 1.5)            # keyboard: YOU NEXT typed
    clip(f2, board - 0.1, 2.0)               # Today board
    vo("VO14", T["s17"] + 0.2)
    # ---- Chapter 6 ---
    d = scene_dur(9, "VO15")
    T["s18"] = clip(R1, 6.0, d)
    vo("VO15", T["s18"] + LEAD)
    st = box("stuart", ["Simulator: Brian L. Stuart, Drexel University", "cs.drexel.edu/~bls96/eniac"], size=44, accent=(255, 193, 7, 255))
    ov(st, T["s18"] + 0.6, T["s18"] + d - 0.4, "700-w/2", "700")
    d = scene_dur(11, "VO16", lead=0.4) + 0.0
    T["s19"] = clip(R1, 6.0, d, darken=0.75, vf_extra="boxblur=16:2")
    vo("VO16", T["s19"] + 0.4)
    lines = ["Play it at our ENIAC exhibit", "Vintage Computer Federation", "InfoAge Science and History Museums",
             "2201 Marconi Rd, Wall NJ", "Wed, Sat & Sun · 12 to 5"]
    sizes = [72, 52, 52, 46, 52]
    y, t0 = 250, T["s19"] + 0.4
    for i, (ln, sz) in enumerate(zip(lines, sizes)):
        p = "%s/ov_end%d.png" % (WORK, i)
        png_box_text(p, [ln], size=sz, bg=(0, 0, 0, 0), font=FONT_BLK if i == 0 else FONT_B, pad=(10, 6),
                     colors=[(255, 214, 90, 255) if i == 0 else (255, 255, 255, 255)])
        ov(p, t0 + i * 1.5, T["s19"] + d - 0.5, CTR, str(y), 0.5, 0.5)
        y += int(sz * 1.15) + 24
    ov(credit("c_music", "Music: Kevin MacLeod (incompetech.com), CC BY 4.0   \u00b7   Splash and explosion sounds: public domain (Wikimedia Commons)"),
       T["s19"] + 0.4, T["s19"] + d - 0.5, "40", "H-h-24", 0.5, 0.5)
    ov(credit("c_photos", "Photos: U.S. Army; War Department TM 6-215 (1941), Internet Archive"),
       T["s19"] + 0.4, T["s19"] + d - 0.5, "40", "H-h-66", 0.5, 0.5)
    T["end"] = cursor[0]


def build_audio(total):
    n = int(total * SR)
    nar = np.zeros((n, 2), dtype=np.float32)
    for t, vid in vo_events:
        x, sr = sf.read("%s/%s.wav" % (NAR, vid), dtype="float32")
        assert sr == SR
        x = np.stack([x, x], 1) if x.ndim == 1 else x
        place(nar, x, t)
    # VO13 in three phrases cut to the three taps; "ten degrees" lands on the 10-degree tap
    x13, _ = sf.read("%s/VO13.wav" % NAR, dtype="float32")
    x13 = np.stack([x13, x13], 1) if x13.ndim == 1 else x13
    al = json.load(open(NAR + "/VO13.json"))["alignment"]
    txt = "".join(al["characters"]); cs = al["character_start_times_seconds"]
    st = [cs[txt.find(p)] for p in ("The cruiser", "Its long gun", "With that speed")]
    t_ten = cs[txt.find("ten degrees")]
    en = [st[1], st[2], DUR["VO13"]]
    tap = T["taps13"]
    # phrase 1 on the ship tap; phrase 2 leads its tap by 0.3 s; phrase 3 follows phrase 2 so that
    # "ten degrees" lands within ~0.3 s of the 10-degree tap (the phrase is 1.6 s long before the words)
    p1 = tap[0] - 0.05
    p2 = tap[1] - 0.30
    p2_end = p2 + (en[1] - 0.02 - max(st[1] - 0.04, 0))
    p3 = max(p2_end + 0.08, tap[2] - 0.05 - (t_ten - st[2]))
    place_t = [p1, p2, p3]
    for k in range(3):
        a0 = max(st[k] - 0.04, 0)
        a1 = en[k] - 0.02
        seg = x13[int(a0 * SR):int(a1 * SR)].copy()
        f = int(0.02 * SR); seg[-f:] *= np.linspace(1, 0, f)[:, None]
        place(nar, seg, place_t[k])
    T["ten_lands"] = p3 + (t_ten - st[2])
    T["vo13_places"] = place_t
    nar *= 0.7 / max(np.max(np.abs(nar)), 1e-6)
    act = np.clip(smooth(np.abs(nar).max(1), 0.35) / 0.12, 0, 1)
    act = smooth(act, 0.4)

    hs = load_audio(MUS + "/Hot Swing.mp3")
    pe = load_audio(MUS + "/Private Eye.mp3")
    bm = load_audio(MUS + "/Bumbly March.mp3")
    music = np.zeros((n, 2), dtype=np.float32)

    def bed(t0, t1, track, ss, pts, duck=0.62, lp=None):
        seg = loop_to(track[int(ss * SR):], int((t1 - t0) * SR), xf=0.6)
        if lp:
            seg = lowpass(seg, lp)
        i0 = int(t0 * SR)
        g = env_from_points(len(seg), [(a - t0, b) for a, b in pts])
        a = act[i0:i0 + len(seg)]
        gd = (g * (1 - duck * np.pad(a, (0, len(seg) - len(a)))))[:len(seg)]
        music[i0:i0 + len(seg)] += seg[:len(music[i0:i0 + len(seg)])] * gd[:len(music[i0:i0 + len(seg)]), None]

    s = T
    fa = s["s11"]
    bed(0.0, fa + 0.5, hs, 0.0, [(0, 0.55), (4.0, 0.55), (6.0, 0.30), (fa - 1, 0.30), (fa + 0.5, 0.0)])
    chord = hs[int(46.2 * SR):int(50.06 * SR)].copy()
    place(music, chord[:int(1.4 * SR)] * np.linspace(1, 0, int(1.4 * SR))[:, None] ** 0.7, s["stamp"] - 0.02, 0.5)
    outA = s["A_drum"][0] - 0.6
    bed(fa, outA, hs, 12.0, [(fa, 0.0), (fa + 0.5, 0.20), (outA - 0.8, 0.20), (outA, 0.0)], lp=900)
    for t in s["A_drum"]:
        sfx_events.append((t, "drum", 0.7))
    sfx_events.append((s["landA"] - 0.05, "splash", 0.9))
    # trombone 'missed' figure: Bumbly March 1.62-2.40 s (clean isolated phrase by energy; not auditioned by ear)
    fig = bm[int(1.62 * SR):int(2.40 * SR)].copy()
    f = int(0.03 * SR); fig[:f] *= np.linspace(0, 1, f)[:, None]; fig[-f:] *= np.linspace(1, 0, f)[:, None]
    place(music, fig, s["resA"] + 0.1, 0.8)
    reA = s["resA"] + 1.0
    bed(reA, s["initB"], hs, 14.0, [(reA, 0.0), (reA + 1.0, 0.16), (s["initB"] - 0.5, 0.16), (s["initB"], 0.0)], duck=0.7)
    roll = synth_snare_roll((s["initB"] + 0.6) - s["taps13"][0], 0.03, 0.5)
    place(music, roll, s["taps13"][0], 0.5)
    for t in s["taps13"]:
        sfx_events.append((t, "tap", 0.8))
    sfx_events.append((s["initA_tick"], "tap", 1.0))
    outB = s["B_drum"][0] - 0.6
    bed(s["initB"], outB, pe, 34.0, [(s["initB"], 0.0), (s["initB"] + 1.5, 0.45), (outB - 1.0, 0.55), (outB, 0.0)], duck=0.0)
    for t in s["B_drum"]:
        sfx_events.append((t, "drum", 0.8))
    sfx_events.append((s["landB"], "impact", 0.9))
    # brass sting on the frame where the kiosk shows 'Ship sunk!' (with the stamp), rings out, then 1.5 s of quiet
    q_end = s["s16_end"] - 1.5
    t_st = s["resB"] + 0.1
    stl = int((q_end - t_st) * SR)
    sting = hs[int(46.2 * SR):int(46.2 * SR) + stl].copy()
    sting[-int(0.8 * SR):] *= np.linspace(1, 0, int(0.8 * SR))[:, None]
    place(music, sting, t_st, 0.9)
    t17 = s["s17"]
    bed(t17, s["s18"], hs, 5.0, [(t17, 0.0), (t17 + 0.3, 0.30), (s["s18"] - 0.1, 0.30), (s["s18"], 0.0)])
    cl_len = total - s["s18"]
    cl = hs[int(max(50.06 - cl_len, 0) * SR):].copy()
    gi = env_from_points(len(cl), [(0, 0.0), (0.8, 0.30), (cl_len - 4.5, 0.30), (cl_len - 3.6, 0.55), (cl_len, 0.55)])
    a = act[int(s["s18"] * SR):int(s["s18"] * SR) + len(cl)]
    gd = gi[:len(a)] * (1 - 0.55 * a)
    music[int(s["s18"] * SR):int(s["s18"] * SR) + len(a)] += cl[:len(a)] * gd[:, None]

    sfx = np.zeros((n, 2), dtype=np.float32)
    splash = sfx_file(SFXD + "/Bathtub_water_splashes.ogg", 3.4, 1.8, 1.0, 0.04)     # PD splash (Wikimedia Commons)
    splash = lowpass(splash, 5000) * 1.3
    boom = sfx_file(SFXD + "/Explosion_10.ogg", 0, None, 0.8, 0.02)                  # PD explosion (Wikimedia Commons)
    thump = synth_impact(2.2)[:, :] * 0.6
    L = max(len(boom), len(thump))
    impact = np.zeros((L, 2), dtype=np.float32); impact[:len(boom)] += boom; impact[:len(thump)] += thump
    wat = splash[:int(1.6 * SR)]; impact[int(0.15 * SR):int(0.15 * SR) + len(wat)] += wat * 0.5
    syn = dict(drum=synth_drum(), splash=splash, impact=impact, tap=synth_tap())
    for t, kind, g in sfx_events:
        place(sfx, syn[kind], t, g)
    mix = np.clip(nar + music + sfx + room_tone(n), -1, 1)
    sf.write(WORK + "/mix.wav", mix, SR)
    ff("-i", WORK + "/mix.wav", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", SR, WORK + "/final-audio.wav")


if __name__ == "__main__":
    build()
    total = cursor[0]
    print("anchors:", json.dumps({k: (round(v, 2) if not isinstance(v, list) else [round(x, 2) for x in v]) for k, v in T.items()}))
    print("total", round(total, 2))
    assert T["vo10_end"] < T["A_drum"][0] - 0.3, "VO10 must clear before the last cards"
    base = WORK + "/video-base.mp4"
    concat(segs, base)
    vid = WORK + "/video-ov.mp4"
    overlay_pass(base, overlays, vid, total)
    build_audio(total)
    ff("-i", vid, "-i", WORK + "/final-audio.wav", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
       "-movflags", "+faststart", OUT + "/battleship-main-draft2.mp4")
    json.dump(dict(anchors=T, total=total), open(WORK + "/timeline.json", "w"))
    print("done", OUT + "/battleship-main-draft2.mp4")
