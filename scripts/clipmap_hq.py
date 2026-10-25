"""Clip map for the HQ re-record (assets/video/hq). Beats are in VIDEO time (ms from first frame)."""
import json, os

HQ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "video", "hq")
HQ = os.path.abspath(HQ)


def seq(name):
    return [(b["beat"], b["at"] / 1000.0) for b in json.load(open("%s/%s-beats.json" % (HQ, name)))]


def first(sq, name, lo=0.0, hi=1e9):
    for n, t in sq:
        if n == name and lo <= t < hi:
            return t
    raise KeyError(name)


def hops(sq, prefix, lo=0.0, hi=1e9):
    out, seen = [], set()
    for n, t in sq:
        if n.startswith(prefix) and n[len(prefix):].isdigit() and lo <= t < hi and n not in seen:
            seen.add(n); out.append(t)
    return out


def load_clipmap():
    r2 = seq("R2")
    f2 = HQ + "/R2.mp4"
    fire = first(r2, "fire-again")
    g = lambda n, lo=0.0, hi=1e9: first(r2, n, lo, hi)
    A = dict(file=f2, aim_open=g("aim-open"), ship=g("ship", 0, fire), gun=g("gun", 0, fire), elev=g("elev", 0, fire),
             load=g("load", 0, fire), read=g("read", 0, fire), run_open=g("run-open", 0, fire), init=g("init", 0, fire),
             hops=hops(r2, "A-hop-"), landed=g("landed", 0, fire), result=g("result", 0, fire), result_end=fire)
    B = dict(file=f2, aim_open=g("aim-open-B"), ship=g("ship", fire), gun=g("gun", fire), elev=g("elev", fire),
             load=g("load", fire), read=g("read", fire), run_open=g("run-open", fire), init=g("init", fire),
             hops=hops(r2, "B-hop-"), landed=g("landed", fire), result=g("result", fire), result_end=g("name-open"))
    r3, r4 = seq("R3"), seq("R4")
    A_cut = dict(file=HQ + "/R3.mp4", hops=hops(r3, "hop-"))
    B_cut = dict(file=HQ + "/R4.mp4", hops=hops(r4, "hop-"))
    return dict(
        r1=HQ + "/R1.mp4", r1_stamp_onset=2.45,
        plan=(f2, g("plan") + 0.3), briefing=(f2, g("briefing") + 0.2),
        A=A, B=B, A_cut=A_cut, B_cut=B_cut,
        tour={i: g("tour-%d" % i) for i in range(1, 10)}, build_intro=g("build-intro", 0, fire),
        r2seq=r2, fire=fire)
