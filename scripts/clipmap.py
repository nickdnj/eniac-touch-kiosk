"""Clip map: which footage feeds which storyboard scene.
STANDIN mode (no assets/video/manifest.json yet): R4 (round B shot) and R5 (a battleship
shot) stand in for the missing R2/R3 so the pipeline can be proven end to end."""
import json, os


def _b(f):
    d = {}
    for b in json.load(open(f)):
        d.setdefault(b["beat"], []).append(b["at"] / 1000.0)
    return d


def _flight(raw, name):
    b = _b("%s/%s-beats.json" % (raw, name))
    hops = [b["hop-%d" % i][0] for i in range(1, 40) if "hop-%d" % i in b]
    return dict(file="%s/%s.webm" % (raw, name), aim_open=b["aim-open"][0], ship=b["ship"][0], gun=b["gun"][0],
                elev=b["elev"][0], load=b["load"][0], read=b["read"][0], init=b["init"][0], hops=hops,
                landed=b["landed"][0], result=b["result"][0], result_end=b["end"][0] if "end" in b else b["result"][0] + 6)


def _seq(path):
    return [(b["beat"], b["at"] / 1000.0) for b in json.load(open(path))]


def _first(seq, name, start=0.0, end=1e9):
    for n, t in seq:
        if n == name and start <= t < end:
            return t
    raise KeyError(name)


def _flight_from(seq, f, lo, hi, aim="aim-open"):
    hops, seen = [], set()
    for n, t in seq:
        if n.startswith("hop-") and lo <= t < hi and n not in seen:
            seen.add(n)
            hops.append(t)
    g = lambda n: _first(seq, n, lo, hi)
    return dict(file=f, aim_open=g(aim), ship=g("ship"), gun=g("gun"), elev=g("elev"), load=g("load"),
                read=g("read"), init=g("init"), hops=hops, landed=g("landed"), result=g("result"))


def load_clipmap(raw):
    V = os.path.dirname(raw)
    r2 = _seq(raw + "/R2-beats.json")
    f2 = V + "/R2.mp4"
    fire = _first(r2, "fire-again")
    A = _flight_from(r2, f2, 0, fire)
    A["result_end"] = fire
    A["head_ss"] = A["hops"][0] + 1.0          # S10 already shows the first card
    B = _flight_from(r2, f2, fire, 1e9, aim="aim-open-B")
    B["result_end"] = _first(r2, "name-open")
    B["head_ss"] = B["init"] + 0.5
    B["fire"] = fire
    t = lambda n, lo=0: _first(r2, n, lo)
    # cutaway sources (same deterministic shots): R3 = round A again, R4 = round B again
    r3 = _seq(raw + "/R3-beats.json")
    r4 = _seq(raw + "/R4-beats.json")
    A_cut = dict(file=V + "/R3.mp4", hops=[t_ for n, t_ in r3 if n.startswith("hop-")])
    B_cut = dict(file=V + "/R4.mp4", hops=[t_ for n, t_ in r4 if n.startswith("hop-")])
    return dict(
        r1=V + "/R1.mp4", r1_stamp_onset=4.95, r6=V + "/R6.mp4",
        plan=(f2, t("plan") + 0.3), briefing=(f2, t("briefing") + 0.2),
        A=A, B=B, A_cut=A_cut, B_cut=B_cut,
        tour={i: t("tour-%d" % i) for i in range(1, 9)},
        build_intro=t("build-intro"),
        name=(f2, t("name-typed") - 2.0, _first(r2, "end") - t("name-typed") + 2.0),
    )
