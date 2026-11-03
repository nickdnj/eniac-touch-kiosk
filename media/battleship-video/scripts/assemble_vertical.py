#!/usr/bin/env python3
"""9:16 cuts for ENIAC Plays Battleship (draft 1): 30 s, 8 s and the ~45 s short.

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
WORK = OUT + "/work_v"
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
    result=[(1300, 900, 0, 60)],
    aim=[(1920, 1000, 0, 40)],
    stack=[(1400, 460, 0, 60), (1400, 260, 0, 520), (1400, 270, 0, 780)],
)
YPOS = dict(board=[430], result=[400], aim=[500], stack=[330, 720, 960])


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
        syn = dict(drum=synth_drum(), splash=synth_splash(), impact=synth_impact(), tap=synth_tap())
        sting = hs[int(46.2 * SR):int(50.06 * SR)].copy()
        for t, kind, g in self.sfx:
            if kind == "sting":
                place(music, sting, t, g)
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


def flight_pieces(F, n_mid, mid_dur, head, real_hops):
    """Jump-cut pieces for a stacked flight: head, n_mid mid-flight snippets, then the last
    `real_hops` hops uncut to the landing."""
    hops, landed = F["hops"], F["landed"]
    rs = hops[-(real_hops + 1)] + 0.3
    pcs = [(F["head_ss"], head)]
    mids = len(hops) - real_hops - 2
    for i in range(n_mid):
        idx = 1 + int((i + 0.5) * mids / n_mid)
        pcs.append((hops[idx] - 0.3, mid_dur))
    pcs.append((rs, landed - rs))
    return pcs, rs


def end_card(c, dur, lines, vo=None, t_in=0.3):
    t = c.add(CM["r1"], 6.0, dur, "board", darken=0.75, blur=True)
    y = 560
    for i, (ln, sz) in enumerate(lines):
        p = "%s/%s_end%d.png" % (WORK, c.name, i)
        png_box_text(p, [ln], size=sz, bg=(0, 0, 0, 0), font=FONT_BLK if i == 0 else FONT_B, pad=(10, 6),
                     colors=[(255, 214, 90, 255) if i == 0 else (255, 255, 255, 255)])
        c.ov(p, t + t_in + i * 0.8, t + dur - 0.3, "(W-w)/2", str(y), 0.4, 0.4)
        y += int(sz * 1.2) + 28
    if vo is not None:
        c.vo.append((t + 0.4, vo))
    return t


def title_ov(c, t0, t1):
    p = c.box("title", ["ENIAC PLAYS", "BATTLESHIP"], size=96, font=FONT_BLK, pad=(46, 26), accent=(214, 40, 40, 255),
              line_gap=4)
    c.ov(p, t0, t1, "(W-w)/2", "170", 0.4, 0.4)


def stamp_ov(c, t0, t1, x="(W-w)/2", y="260"):
    p = "%s/%s_stamp.png" % (WORK, c.name)
    png_stamp(p, size=130)
    c.ov(p, t0, t1, x, y, 0.05, 0.35)


def build_30():
    A, B = CM["A"], CM["B"]
    f2 = B["file"]
    c = Cut("v30")
    o = CM["r1_stamp_onset"]
    t = c.add(CM["r1"], o - 2.6, 3.4, "board")           # stamp lands at 2.6 s
    c.sfx.append((t + 2.6, "chord", 0.5))
    title_ov(c, t + 0.4, t + 3.2)
    c.vo.append((t + 0.1, vo_slice("VO01", "That's a game", "And every")))
    # picks: Cruiser, Long gun, 10 deg
    t = c.add(f2, B["ship"] - 0.9, 4.2, "aim", hold=0.0)
    for k in ("ship", "gun", "elev"):
        c.sfx.append((t + 0.9 + (B[k] - B["ship"]), "tap", 0.8))
    c.vo.append((t + 0.9, vo_slice("VO13")))
    # flight B condensed, last 2 hops real time
    pcs, rs = flight_pieces(B, 2, 1.3, 1.6, 2)
    tf0 = c.cur
    for ss, du in pcs:
        c.add(f2, ss, du, "stack")
    land = c.cur
    for h in B["hops"][-2:]:
        c.sfx.append((land - (B["landed"] - h), "drum", 0.8))
    c.vo.append((tf0 + 0.3, vo_slice("VO10", "For every second", "The multiplier")))
    c.vo.append((land - 9.6, vo_slice("VO10", "Then the punch", "Join the dots")))
    c.beds.append((0.0, tf0 + 0.2, 20.0, 0.30))
    # impact + result + stamp
    t = c.add(f2, B["landed"], 4.0, "result")
    c.sfx.append((t, "impact", 0.9)); c.sfx.append((t, "sting", 0.9))
    stamp_ov(c, t + 0.15, t + 3.0)
    # end card
    et = end_card(c, 6.0, [("Come play", 70), ("Vintage Computer Federation", 44), ("InfoAge, Wall NJ", 44),
                           ("2201 Marconi Rd", 40), ("Wed, Sat & Sun · 12 to 5", 44)],
                  vo_slice("VO16", "Vintage Computer", "Wednesdays"))
    c.beds.append((et, c.cur, 28.0, 0.3))
    return c.render(OUT + "/battleship-30s-vertical.mp4")


def build_8():
    B = CM["B"]
    f2 = B["file"]
    c = Cut("v8")
    h = B["hops"]
    s0 = B["landed"] - 3.4
    t = c.add(f2, s0, 5.0, "stack")        # last hop, impact, result
    land = t + 3.4
    for hh in h[-2:]:
        if hh > s0:
            c.sfx.append((land - (B["landed"] - hh), "drum", 0.8))
    c.sfx.append((land, "impact", 0.9)); c.sfx.append((land, "sting", 0.9))
    stamp_ov(c, land + 0.15, land + 1.6)
    c.vo.append((0.3, vo_slice("VO01", "a computer from nineteen")))
    end_card(c, 3.0, [("ENIAC PLAYS", 64), ("BATTLESHIP", 64), ("VCF museum \u00b7 InfoAge, Wall NJ", 38),
                      ("Wed, Sat & Sun \u00b7 12 to 5", 40)], None, t_in=0.1)
    return c.render(OUT + "/battleship-8s-vertical.mp4")


def build_short():
    A, B = CM["A"], CM["B"]
    f2 = A["file"]
    c = Cut("vshort")
    o = CM["r1_stamp_onset"]
    t = c.add(CM["r1"], o - 2.6, 3.4, "board")
    c.sfx.append((t + 2.6, "chord", 0.5))
    title_ov(c, t + 0.4, t + 3.2)
    c.vo.append((t + 0.1, vo_slice("VO01")))
    c.cur_vo_end = None
    # P3 then R6 (six programmers)
    p3 = "%s/v_p3.mp4" % WORK
    # P3 pre-cropped to 9:16 BEFORE zoompan
    pre = "%s/p3_916.png" % WORK
    from PIL import Image
    im = Image.open(glob.glob(IMG + "/P3-*.jpg")[0])
    w0, h0 = im.size
    cw = int(h0 * 9 / 16)
    cx = int(w0 * 0.50 - cw / 2)
    im.crop((cx, 0, cx + cw, h0)).resize((1080, 1920), Image.LANCZOS).save(pre)
    ff("-i", pre, "-vf", "zoompan=z='1+0.06*on/%d':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=%d:s=1080x1920:fps=30,format=yuv420p" % (nfr(4.0), nfr(4.0)),
       "-frames:v", nfr(4.0), *VENC, p3)
    c.segs.append(p3); t = c.cur; c.cur += nfr(4.0) / FPS
    png_credit("%s/v_cr.png" % WORK, "U.S. Army Photo")
    c.ov("%s/v_cr.png" % WORK, t + 0.3, t + 3.7, "W-w-30", "H-h-60")
    cap = c.box("cap3", ["Betty Jean Jennings and Frances Bilas, 1946"], size=36, accent=(214, 40, 40, 255))
    c.ov(cap, t + 0.3, t + 3.7, "40", "H-h-170")
    c.vo.append((t + 0.2, vo_slice("VO05", "Ennie-ack's first programmers", "They worked")))
    c.add(CM["r6"], 0.0, 3.0, "result" if False else "board")
    # round A picks and dials
    t = c.add(f2, A["ship"] - 0.9, 5.0, "aim")
    c.vo.append((t + 0.2, vo_slice("VO07", "My gun", "The rest")))
    for k in ("ship", "gun", "elev"):
        c.sfx.append((t + 0.9 + (A[k] - A["ship"]), "tap", 0.8))
    # flight A condensed
    pcs, rs = flight_pieces(A, 3, 1.1, 1.4, 2)
    tf = c.cur
    for ss, du in pcs:
        c.add(f2, ss, du, "stack")
    land = c.cur
    for h in A["hops"][-2:]:
        c.sfx.append((land - (A["landed"] - h), "drum", 0.8))
    c.vo.append((tf + 0.2, vo_slice("VO10", "Then the punch", "Join the dots")))
    c.sfx.append((land, "splash", 0.8))
    t = c.add(f2, A["landed"], A["result"] - A["landed"] + 2.4, "result")
    ov = c.box("short", ["515 FT SHORT"], size=76, font=FONT_BLK, pad=(40, 22), accent=(214, 40, 40, 255))
    c.ov(ov, t + (A["result"] - A["landed"]) + 0.4, t + (A["result"] - A["landed"]) + 2.4, "(W-w)/2", "170", 0.3, 0.3)
    c.vo.append((t + (A["result"] - A["landed"]) + 0.2, vo_slice("VO11", "Short.", "And that")))
    # re-aim
    B_ = CM["B"]
    t = c.add(B_["file"], B_["ship"] - 0.9, 5.2, "aim")
    c.vo.append((t + 0.1, vo_slice("VO12", "I need a bigger ship")))
    c.vo.append((t + 2.0, vo_slice("VO13")))
    for k in ("ship", "gun", "elev"):
        c.sfx.append((t + 0.9 + (B_[k] - B_["ship"]), "tap", 0.8))
    pcs, rs = flight_pieces(B_, 1, 1.1, 1.2, 2)
    tb = c.cur
    for ss, du in pcs:
        c.add(B_["file"], ss, du, "stack")
    land = c.cur
    for h in B_["hops"][-2:]:
        c.sfx.append((land - (B_["landed"] - h), "drum", 0.8))
    t = c.add(B_["file"], B_["landed"], 4.0, "result")
    c.sfx.append((t, "impact", 0.9)); c.sfx.append((t, "sting", 0.9))
    stamp_ov(c, t + 0.15, t + 3.0)
    et = end_card(c, 9.0, [("Come play", 70), ("Vintage Computer Federation", 44), ("InfoAge, Wall NJ", 44),
                           ("2201 Marconi Rd", 40), ("Wed, Sat & Sun · 12 to 5", 44)],
                  vo_slice("VO16", "Vintage Computer", "Wednesdays"))
    c.beds.append((0.0, tf + 0.5, 5.0, 0.28))
    c.beds.append((et, c.cur, 28.0, 0.3))
    return c.render(OUT + "/battleship-short-vertical.mp4")


if __name__ == "__main__":
    which = sys.argv[1:] or ["30", "8", "short"]
    for w in which:
        d = dict(zip(("30", "8", "short"), (build_30, build_8, build_short)))[w]()
        print(w, "duration", round(d, 2))
