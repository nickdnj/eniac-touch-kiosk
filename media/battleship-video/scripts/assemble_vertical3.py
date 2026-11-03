#!/usr/bin/env python3
"""9:16 cuts for ENIAC Plays Battleship (draft 3 / recut v3.1): 30 s, 8 s and the ~45 s short.

    python3 scripts/assemble_vertical.py [30|8|short ...]

Layouts are built from regions of the 16:9 kiosk frame cropped to the panel's aspect BEFORE
scaling into a 1080x1920 canvas (stacked panels: plot / punched cards / lamps). Overlays are
PNGs composited in FFmpeg. The spec lines that were never recorded (e.g. 'Let's sink a ship.')
are replaced by slices of the existing VO takes (alignment JSON), listed in the report.
"""
import os, sys, json, glob
import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from assemble_lib import *
from clipmap import load_clipmap

ROOT = os.path.dirname(HERE)
OUT = ROOT + "/output"
NAR = ROOT + "/assets/audio/narration"
MUS = ROOT + "/assets/audio/music"
IMG = ROOT + "/assets/images"
WORK = OUT + "/work_v3"
os.makedirs(WORK, exist_ok=True)
CM = load_clipmap(ROOT + "/assets/video/raw")
VW, VH = 1080, 1920
BG = "0x08121e"


def vo_slice(vid, p0=None, p1=None):
    """(samples) from phrase p0 start to phrase p1 start (or end of file)."""
    x, sr = sf.read("%s/%s.wav" % (NAR, vid), dtype="float32")
    x = np.stack([x, x], 1) if x.ndim == 1 else x
    a = json.load(open("%s/%s.json" % (NAR, vid)))["alignment"]
    txt = "".join(a["characters"])
    st = a["character_start_times_seconds"]
    i0 = txt.find(p0) if p0 else 0
    assert i0 >= 0, (vid, p0)
    t0 = max(st[i0] - 0.03, 0) if p0 else 0.0
    t1 = x.shape[0] / sr
    if p1:
        i1 = txt.find(p1, i0 + 1)
        assert i1 >= 0, (vid, p1)
        t1 = st[i1] - 0.02
    return x[int(t0 * SR):int(t1 * SR)]


REG = dict(
    board=[(1400, 1000, 0, 50)],
    full=[(1920, 1000, 0, 40)],
    result=[(900, 640, 0, 40), (1000, 640, 920, 40)],
    aim=[(940, 560, 0, 60), (960, 560, 960, 60)],
    stack=[(1100, 440, 0, 60), (1400, 260, 0, 500), (1400, 270, 0, 780)],
)
YPOS = dict(full=[500], board=[430], result=[250, 1032], aim=[290, 949], stack=[300, 760, 990])


def vseg(out, file, ss, dur, layout, hold=0.0, darken=0.0, blur=False):
    regs = REG[layout]
    ys = YPOS[layout]
    n = len(regs)
    src = max(dur - hold, 0.04)
    pre = "fps=%d,scale=%d:%d,setsar=1" % (FPS, W, H)
    if hold:
        pre += ",tpad=stop_mode=clone:stop_duration=%.2f" % (hold + 1)
    if darken:
        pre += ",eq=brightness=-%.2f" % darken
    if blur:
        pre += ",boxblur=14:2"
    parts = ["[1:v]%s,split=%d%s" % (pre, n, "".join("[s%d]" % i for i in range(n)))]
    last = "0:v"
    for i, ((cw, ch, cx, cy), y) in enumerate(zip(regs, ys)):
        sh = int(round(ch * VW / cw / 2) * 2)
        parts.append("[s%d]crop=%d:%d:%d:%d,scale=%d:%d:flags=bicubic[p%d]" % (i, cw, ch, cx, cy, VW, sh, i))
        parts.append("[%s][p%d]overlay=0:%d[b%d]" % (last, i, y, i))
        last = "b%d" % i
    parts.append("[%s]format=yuv420p[v]" % last)
    ff("-f", "lavfi", "-i", "color=c=%s:s=%dx%d:r=%d" % (BG, VW, VH, FPS),
       "-ss", "%.3f" % ss, "-t", "%.3f" % src, "-i", file,
       "-filter_complex", ";".join(parts), "-map", "[v]", "-frames:v", nfr(dur), *VENC, out)


class Cut:
    def __init__(self, name):
        self.name = name
        self.segs, self.ovs, self.vo, self.sfx, self.beds, self.cur, self.n = [], [], [], [], [], 0.0, 0

    def add(self, file, ss, dur, layout, **kw):
        self.n += 1
        p = "%s/%s_%02d.mp4" % (WORK, self.name, self.n)
        vseg(p, file, ss, dur, layout, **kw)
        self.segs.append(p)
        t = self.cur
        self.cur += nfr(dur) / FPS
        return t

    def ov(self, png, t0, t1, x, y, fin=0.25, fout=0.25):
        self.ovs.append(dict(png=png, t0=t0, t1=t1, x=x, y=y, fin=fin, fout=fout))

    def box(self, nm, lines, **kw):
        p = "%s/%s_%s.png" % (WORK, self.name, nm)
        png_box_text(p, lines, **kw)
        return p

    def render(self, outpath, bed_ss=0.0, bed_gain=0.30, sting_t=None, quiet_end=0.0):
        total = self.cur
        base = "%s/%s_base.mp4" % (WORK, self.name)
        concat(self.segs, base)
        vid = "%s/%s_ov.mp4" % (WORK, self.name)
        overlay_pass(base, self.ovs, vid, total, chunk=10.0)
        n = int(total * SR)
        nar = np.zeros((n, 2), dtype=np.float32)
        for t, x in self.vo:
            place(nar, x, t)
        nar *= 0.7 / max(np.max(np.abs(nar)), 1e-6) if len(self.vo) else 1
        act = np.clip(smooth(np.abs(nar).max(1), 0.35) / 0.12, 0, 1)
        act = smooth(act, 0.4)
        hs = load_audio(MUS + "/Hot Swing.mp3")
        music = np.zeros((n, 2), dtype=np.float32)
        for (t0, t1, ss, gain) in self.beds:
            seg = loop_to(hs[int(ss * SR):], int((t1 - t0) * SR), xf=0.5)
            i0 = int(t0 * SR)
            g = env_from_points(len(seg), [(0, 0), (0.4, gain), (max(t1 - t0 - 0.5, 0.5), gain), (t1 - t0, 0)])
            a = act[i0:i0 + len(seg)]
            music[i0:i0 + len(a)] += seg[:len(a)] * (g[:len(a)] * (1 - 0.6 * a))[:, None]
        sfx = np.zeros((n, 2), dtype=np.float32)
        SF = ROOT + "/assets/audio/sfx"
        splash = lowpass(sfx_file(SF + "/Bathtub_water_splashes.ogg", 3.4, 1.8, 1.0, 0.04), 5000) * 1.3
        boom = sfx_file(SF + "/Explosion_10.ogg", 0, None, 0.8, 0.02)
        thump = synth_impact(2.2) * 0.6
        impact = np.zeros((max(len(boom), len(thump)), 2), dtype=np.float32)
        impact[:len(boom)] += boom; impact[:len(thump)] += thump
        impact[int(0.15 * SR):int(0.15 * SR) + int(1.6 * SR)] += splash[:int(1.6 * SR)] * 0.5
        syn = dict(drum=synth_drum(), splash=splash, impact=impact, tap=synth_tap())
        sting = hs[int(46.2 * SR):int(50.06 * SR)].copy()
        for t, kind, g in self.sfx:
            if kind == "sting":
                place(music, sting[:int(2.6 * SR)] * np.linspace(1, 0, int(2.6 * SR))[:, None] ** 0.5, t, g)
            elif kind == "chord":
                place(music, sting[:int(1.6 * SR)] * np.linspace(1, 0, int(1.6 * SR))[:, None], t, g)
            else:
                place(sfx, syn[kind], t, g)
        mix = np.clip(nar + music + sfx + room_tone(n), -1, 1)
        sf.write("%s/%s_mix.wav" % (WORK, self.name), mix, SR)
        ff("-i", "%s/%s_mix.wav" % (WORK, self.name), "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", SR,
           "%s/%s_audio.wav" % (WORK, self.name))
        ff("-i", vid, "-i", "%s/%s_audio.wav" % (WORK, self.name), "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
           "-shortest", "-movflags", "+faststart", outpath)
        return total



def pieces(F, head, n_mid, mid_dur, tail_hops=2):
    """Plain jump cuts: head, n_mid mid-flight snippets, last 2 hops uncut."""
    hops, landed = F["hops"], F["landed"]
    rs = hops[-(tail_hops + 1)] + 0.3
    pcs = [(F["head_ss"], head)]
    mids = len(hops) - tail_hops - 2
    for i in range(n_mid):
        idx = 1 + int((i + 0.5) * mids / n_mid)
        pcs.append((hops[idx] - 0.3, mid_dur))
    pcs.append((rs, landed - rs))
    return pcs


def end_card(c, dur, lines, vo=None, t_in=0.3):
    t = c.add(CM["r1"], 6.0, dur, "board", darken=0.75, blur=True)
    y = 560
    for i, (ln, sz) in enumerate(lines):
        p = "%s/%s_end%d.png" % (WORK, c.name, i)
        png_box_text(p, [ln], size=sz, bg=(0, 0, 0, 0), font=FONT_BLK if i == 0 else FONT_B, pad=(10, 6),
                     colors=[(255, 214, 90, 255) if i == 0 else (255, 255, 255, 255)])
        c.ov(p, t + t_in + i * 0.7, t + dur - 0.3, "(W-w)/2", str(y), 0.4, 0.4)
        y += int(sz * 1.2) + 28
    if vo is not None:
        c.vo.append((t + 0.3, vo))
    return t


def title_ov(c, t0, t1):
    p = c.box("title", ["ENIAC PLAYS", "BATTLESHIP"], size=96, font=FONT_BLK, pad=(46, 26), accent=(214, 40, 40, 255), line_gap=4)
    c.ov(p, t0, t1, "(W-w)/2", "170", 0.4, 0.4)


def stamp_ov(c, t0, t1):
    p = "%s/%s_stamp.png" % (WORK, c.name)
    png_stamp(p, size=130)
    c.ov(p, t0, t1, "(W-w)/2", "260", 0.04, 0.35)


def whole(vid):
    return vo_slice(vid)


def sink_sequence(c, F, land_hold=0.8, res_dur=3.2):
    """Landing hold, jump over the kiosk's wait, result; impact on landing, sting + stamp on the result frame."""
    t = c.add(F["file"], F["landed"], land_hold, "result")
    c.sfx.append((t, "impact", 0.9))
    t2 = c.add(F["file"], F["result"] - 0.1, res_dur, "result")
    c.sfx.append((t2 + 0.1, "sting", 0.9))
    stamp_ov(c, t2 + 0.1, t2 + min(2.6, res_dur - 0.2))
    return t2


def flight(c, F, head, n_mid, mid_dur, tail_hops=2):
    tf = c.cur
    for ss, du in pieces(F, head, n_mid, mid_dur, tail_hops):
        c.add(F["file"], ss, du, "stack")
    land = c.cur
    # a drum on the card before the last; none on the last (it is ~0.1 s before the landing)
    for h in F["hops"][-2:-1]:
        c.sfx.append((land - (F["landed"] - h), "drum", 0.8))
    return tf, land


def build_30():
    B = CM["B"]
    c = Cut("v30")
    o = CM["r1_stamp_onset"]
    t = c.add(CM["r1"], o - 2.6, 3.4, "board")
    c.sfx.append((t + 2.6, "chord", 0.5))
    title_ov(c, t + 0.4, t + 3.2)
    c.vo.append((t + 0.1, whole("CUT30-01")))          # 7.25 s line: the first beat runs to ~7.3 s
    t = c.add(B["file"], B["ship"] - 0.9, 3.9, "aim")
    for k in ("ship", "gun", "elev"):
        c.sfx.append((t + 0.9 + (B[k] - B["ship"]) - 0.12, "tap", 0.8))
    tf, land = flight(c, B, 1.0, 2, 1.2, 2)
    c.vo.append((tf + 0.2, whole("CUT30-02")))
    c.beds.append((0.0, tf + 0.2, 20.0, 0.30))
    sink_sequence(c, B, 0.7, 3.0)
    et = end_card(c, max(30.0 - c.cur, 5.0), [("Play it at our", 56), ("ENIAC exhibit", 70), ("Vintage Computer Federation", 44),
                           ("InfoAge, Wall NJ", 44), ("2201 Marconi Rd", 40), ("Wed, Sat & Sun \u00b7 12 to 5", 44)],
                  whole("CUT30-03"))
    c.beds.append((et, c.cur, 28.0, 0.3))
    return c.render(OUT + "/battleship-30s-vertical-draft3.mp4")


def build_8():
    B = CM["B"]
    c = Cut("v8")
    rs = B["landed"] - 3.4
    t = c.add(B["file"], rs, 3.4, "stack")
    land = c.cur
    for h in B["hops"][-2:-1]:
        if h > rs:
            c.sfx.append((land - (B["landed"] - h), "drum", 0.8))
    sink_sequence(c, B, 0.6, 1.4)
    c.vo.append((0.2, whole("CUT8-01")))
    end_card(c, 8.0 - c.cur, [("ENIAC PLAYS", 64), ("BATTLESHIP", 64), ("VCF museum \u00b7 InfoAge, Wall NJ", 38),
                              ("Wed, Sat & Sun \u00b7 12 to 5", 40)], None, t_in=0.1)
    return c.render(OUT + "/battleship-8s-vertical-draft3.mp4")


def build_short():
    A, B = CM["A"], CM["B"]
    c = Cut("vshort")
    o = CM["r1_stamp_onset"]
    t = c.add(CM["r1"], o - 2.6, 3.4, "board")
    c.sfx.append((t + 2.6, "chord", 0.5))
    title_ov(c, t + 0.4, t + 3.2)
    c.vo.append((t + 0.1, whole("VO01")))
    c.add(CM["plan"][0], CM["plan"][1], DUR1 - 3.4, "full")
    t = c.add(A["file"], A["ship"] - 0.9, 4.2, "aim")
    c.vo.append((t + 0.2, vo_slice("VO07", "Ships and guns", "The simulated")))
    for k in ("ship", "gun", "elev"):
        c.sfx.append((t + 0.9 + (A[k] - A["ship"]) - 0.12, "tap", 0.8))
    tf, land = flight(c, A, 1.0, 0, 1.0, 1)
    c.vo.append((tf + 0.2, vo_slice("VO10", "The punch", "Join the dots")))
    c.beds.append((0.0, tf + 0.5, 5.0, 0.28))
    c.sfx.append((land - 0.05, "splash", 0.9))
    c.add(A["file"], A["landed"], 1.3, "result")
    t = c.add(A["file"], A["result"] - 0.1, 3.6, "result")
    c.ov(c.box("short", ["515 FT SHORT"], size=76, font=FONT_BLK, pad=(40, 22), accent=(214, 40, 40, 255)), t + 0.5, t + 3.3, "(W-w)/2", "170", 0.3, 0.3)
    c.vo.append((t + 0.4, vo_slice("VO11", "Short.", "That's the destroyer")))
    t = c.add(B["file"], B["ship"] - 0.9, 4.6, "aim")
    c.vo.append((t + 0.0, vo_slice("VO12", "So I need more speed")))
    c.vo.append((t + 1.9, whole("VO13")))
    for k in ("ship", "gun", "elev"):
        c.sfx.append((t + 0.9 + (B[k] - B["ship"]) - 0.12, "tap", 0.8))
    tb, land = flight(c, B, 0.8, 0, 1.0, 1)
    sink_sequence(c, B, 0.8, 3.4)
    et = end_card(c, 8.6, [("Play it at our", 56), ("ENIAC exhibit", 70), ("Vintage Computer Federation", 44),
                           ("InfoAge, Wall NJ", 44), ("2201 Marconi Rd", 40), ("Wed, Sat & Sun \u00b7 12 to 5", 44)],
                  vo_slice("VO16", "Vintage Computer"))
    c.beds.append((et, c.cur, 28.0, 0.3))
    return c.render(OUT + "/battleship-short-vertical-draft3.mp4")


DUR1 = 8.2

if __name__ == "__main__":
    which = sys.argv[1:] or ["30", "8", "short"]
    for w in which:
        d = dict(zip(("30", "8", "short"), (build_30, build_8, build_short)))[w]()
        print(w, "duration", round(d, 2))
