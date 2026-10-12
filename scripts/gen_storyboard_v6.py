#!/usr/bin/env python3
"""Generate the v6 storyboard data (timeline, cut points, voice events, overlays) from what is ON DISK.

v6 = the v5/v5b structure (same chapters, units, overlays, music cues, no end screen) re-cut against the
kiosk-main re-recordings in assets/video/source-v6/ and the v6 standalone lines in assets/audio/source-lines-v6/.

Nothing is hard-coded in seconds. Every clip and every WAV is probed; every cut point is an ANCHOR to a narration
line of the clip (line start/end + the offset v5 used, measured from output/build/v5-line-positions.json), so a clip or
line length change re-times the whole program:

  * baked units (B, B2, D, E, G, I, N, O): window = anchor_in .. anchor_out, duration is whatever it is.
  * units that carry a standalone line (A, H, J, K, L, M, O, P): duration = lead-in offset + probed line duration
    + the SAME tail slack v5 had after that line. A longer line therefore extends the host unit's hold
    (photo pan, card, muted footage; last frame is cloned only if the footage runs out), a shorter line shortens it.
    Audio is never sped up, never trimmed; only silence is added or removed.

Where the line positions come from (per clip, auto):
  audio mode    clip has ONE audio stream: each per-line WAV is cross-correlated into it (exact, as v5 did).
  timeline mode clip is video-only: the kiosk narrate.ts timeline (<clip>-timeline.json, `at` in ms) shifted by the
                logged mux cuts + scripts/v6_mux_cuts.json (hand --cut values). Voice is then the per-line WAVs.

Run:
  python3 scripts/gen_storyboard_v6.py --dry-run            # provisional clips -> output/build/v6-dryrun/
  python3 scripts/gen_storyboard_v6.py                      # final             -> output/build/v6/
Writes <build>/storyboard-data.v6.json (and storyboard/storyboard-data.v6.json only with --write-storyboard).
"""
import argparse, json, os, subprocess, sys, re, hashlib
import numpy as np

ROOT = '/Users/nickd/Workspaces/eniac-kiosk-youtube'
FFP = '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe'
FF = '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg'
KIOSK = '/Users/nickd/Workspaces/eniac-touch-kiosk'
KWT = f'{KIOSK}/.claude/worktrees'
FPS = 25
INTRO = 8.12                      # VCF Power-On intro (203 frames @25), unchanged from v5

ap = argparse.ArgumentParser()
ap.add_argument('--dry-run', action='store_true', help='provisional run: build dir output/build/v6-dryrun, timelines from takes-silent')
ap.add_argument('--build-dir')
ap.add_argument('--src-dir', default=f'{ROOT}/assets/video/source-v6')
ap.add_argument('--wav-dir', help='kiosk per-line narration WAVs (default: kiosk video-v6b build/video/narration; dry-run: video-v5)')
ap.add_argument('--timeline-dir', help='kiosk <clip>-timeline.json dir (default: wav-dir; dry-run: video-v6 takes-silent)')
ap.add_argument('--timeline-file', action='append', default=[], help='clip=filename override, repeatable')
ap.add_argument('--takes-dir', help='kiosk raw webm dir, only for the cut-sum sanity check')
ap.add_argument('--webm', action='append', default=[], help='clip=filename override for the raw webm, repeatable')
ap.add_argument('--mux-cuts', default=f'{ROOT}/scripts/v6_mux_cuts.json')
ap.add_argument('--force-mode', choices=['audio', 'timeline'], help='override the per-clip audio/timeline auto choice')
ap.add_argument('--write-storyboard', action='store_true')
A = ap.parse_args()

DRY = A.dry_run
BUILD = A.build_dir or f'{ROOT}/output/build/' + ('v6-dryrun' if DRY else 'v6')
SRC = A.src_dir.rstrip('/')
# dry run: the provisional clips were paced with the v5 WAV durations, so the matching (old-pronunciation) v5 voice is
# laid at their timeline positions; the v6 re-generated kiosk lines differ by up to +-2.7 s per line and cannot fit that pacing.
WAV_DIR = A.wav_dir or (f'{KWT}/video-v5/build/video/narration' if DRY else f'{KWT}/video-v6b/build/video/narration')
TL_DIR = A.timeline_dir or (f'{KWT}/video-v6/build/video/takes-silent' if DRY else WAV_DIR)
TAKES = A.takes_dir or (f'{KWT}/video-v6/build/video/takes-silent' if DRY else f'{KWT}/video-v6b/build/video/takes')
TL_FILE = {'tour': 'tour-fixed-v5pace-timeline.json'} if DRY else {}
WEBM = {'tour': 'tour-fixed-v5pace.webm'} if DRY else {}
for kv in A.timeline_file:
    k, v = kv.split('=')
    TL_FILE[k] = v
for kv in A.webm:
    k, v = kv.split('=')
    WEBM[k] = v
os.makedirs(BUILD, exist_ok=True)

LINES_V6 = f'{ROOT}/assets/audio/source-lines-v6'
CLIPS = {
    'tour': 'eniac-touch-tour.mp4',
    'squares': 'eniac-touch-walkthrough-squares.mp4',
    'primes': 'eniac-touch-walkthrough-primes.mp4',
    'trajectory': 'eniac-touch-walkthrough-trajectory.mp4',
    'finale': 'finale.mp4',
}
ORIG = 'original-ui-tour.mp4'
V5_LINES = json.load(open(f'{ROOT}/output/build/v5-line-positions.json'))
V5_TL = json.load(open(f'{ROOT}/output/build/v5/timeline.json'))   # v5 unit starts / durations (reference only)


def fr(s):
    return round(s * FPS) / FPS


def probe(path, entries, stream=None):
    cmd = [FFP, '-v', 'error']
    if stream:
        cmd += ['-select_streams', stream]
    cmd += ['-show_entries', entries, '-of', 'json', path]
    return json.loads(subprocess.run(cmd, capture_output=True, text=True, check=True).stdout)


def clip_info(path):
    j = probe(path, 'stream=codec_type,width,height,r_frame_rate,duration:format=duration')
    v = [s for s in j['streams'] if s['codec_type'] == 'video'][0]
    n, d = v['r_frame_rate'].split('/')
    return dict(path=path, dur=float(j['format']['duration']), w=v['width'], h=v['height'], fps=float(n) / float(d),
                audio_streams=sum(1 for s in j['streams'] if s['codec_type'] == 'audio'),
                mtime=os.path.getmtime(path), size=os.path.getsize(path))


def wav_dur(path):
    return float(probe(path, 'format=duration')['format']['duration'])


def decode_mono(path, sr=8000):
    r = subprocess.run([FF, '-v', 'error', '-i', path, '-vn', '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'],
                       capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.float32).astype(np.float64)


class Xcorr:
    """Normalised cross-correlation of a short template into a window of one long signal.

    Computed per search window (not once over the whole clip): a whole-clip FFT has rounding noise that, divided by the
    near-zero energy of silent stretches, produces scores > 1 at meaningless offsets. Windows whose energy is below
    1% of the template's are excluded (a real match has about the template's energy)."""

    def __init__(self, sig, sr):
        self.sig, self.sr = sig, sr
        self.n = len(sig)
        self.cs = np.concatenate([[0.0], np.cumsum(sig ** 2)])

    def find(self, tpl, t_lo=0.0, t_hi=None):
        m = len(tpl)
        a = max(0, int(t_lo * self.sr))
        b = self.n if t_hi is None else min(self.n, int(t_hi * self.sr) + m)
        if b - a < m:
            return None, -1.0
        seg = self.sig[a:b]
        N = 1 << (len(seg) + m).bit_length()
        c = np.fft.irfft(np.fft.rfft(seg, N) * np.fft.rfft(tpl[::-1], N), N)[m - 1:len(seg)]
        en = self.cs[a + m:b + 1] - self.cs[a:b - m + 1]
        tn = float(np.linalg.norm(tpl))
        ncc = np.where(en > 0.01 * tn * tn, c / (np.sqrt(np.maximum(en, 1e-12)) * tn), -1.0)
        k = int(np.argmax(ncc))
        # refine to the sample: the peak of a speech template is sharp, k is already the argmax
        return (a + k) / self.sr, float(min(ncc[k], 1.0))


# --------------------------------------------------------------------------- clips
CL = {}
for k, f in CLIPS.items():
    p = f'{SRC}/{f}'
    if not os.path.exists(p):
        sys.exit(f'FATAL: missing clip {p}')
    CL[k] = clip_info(p)
OUI_PATH = f'{SRC}/{ORIG}'
if not os.path.exists(OUI_PATH):
    sys.exit(f'FATAL: missing {OUI_PATH}')
OUI = clip_info(OUI_PATH)
for k, c in list(CL.items()) + [('original-ui-tour', OUI)]:
    assert not re.search(r'source-v[345]/|/source/', c['path']), f'v3/v4/v5 clips must never be used: {c["path"]}'

MUXCUTS = {}
if os.path.exists(A.mux_cuts):
    mc = json.load(open(A.mux_cuts))
    MUXCUTS = {k: [tuple(x) for x in v] for k, v in mc.items() if not k.startswith('_')}
    MUXCUTS_STATUS = mc.get('_status', '')
else:
    MUXCUTS_STATUS = 'no file'

# --------------------------------------------------------------------------- line positions
XC = []


def print_xc(clip):
    print(f'  audio-mode location, {clip}: line  predicted(timeline)  found  delta  score')
    for c, lid, pr, st, sc, wh in XC:
        if c == clip:
            print(f'    {lid:14s} {pr:8.2f} {"-" if st is None else format(st, "8.2f"):>8s} '
                  f'{"-" if st is None else format(st - pr, "+6.2f"):>7s}  {sc:.3f}  {wh if wh != "window" else ""}')


LINES = {}   # clip -> {line_id: dict(start,end,wav,wav_dur,tl_dur,src)}
JUMPS = {}   # clip -> [clip-time of each hard cut jump]
DIAG = []


def load_timeline(clip):
    p = f'{TL_DIR}/{TL_FILE.get(clip, clip + "-timeline.json")}'
    if not os.path.exists(p):
        sys.exit(f'FATAL: timeline missing for {clip}: {p}')
    return p, json.load(open(p))


for clip, ci in CL.items():
    tlp, tl = load_timeline(clip)
    logged = [(c['from'] / 1000, c['to'] / 1000) for c in tl.get('cuts', [])]
    cuts = sorted(logged + MUXCUTS.get(clip, []))
    merged = []
    for f_, t_ in cuts:
        if merged and f_ <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], t_))
        else:
            merged.append((f_, t_))
    cuts = merged

    def shifted(sec):
        return sec - sum(t_ - f_ for f_, t_ in cuts if t_ <= sec)

    JUMPS[clip] = [shifted(f_) for f_, t_ in cuts if f_ > 0.5]   # the mux joins here (a cut at ~0 is just a trim)
    # sanity: raw webm length - cuts == clip length
    wp = f'{TAKES}/{WEBM.get(clip, clip + ".webm")}'
    if os.path.exists(wp):
        raw = float(probe(wp, 'format=duration')['format']['duration'])
        exp = raw - sum(t_ - f_ for f_, t_ in cuts)
        ok = abs(exp - ci['dur']) < 0.25
        DIAG.append((clip, f'raw {raw:.2f} - cuts {sum(t_ - f_ for f_, t_ in cuts):.2f} = {exp:.2f} vs clip {ci["dur"]:.2f}',
                     'OK' if ok else 'MISMATCH: scripts/v6_mux_cuts.json does not describe this clip'))
        if not ok:
            DIAG[-1] = DIAG[-1] + ('FAIL',)
    else:
        DIAG.append((clip, f'raw webm not found ({wp}); cut-sum check skipped', 'WARN'))
    mode = A.force_mode or ('audio' if ci['audio_streams'] == 1 else 'timeline')
    ci['mode'] = mode
    ci['timeline'] = tlp
    ci['mux_cuts'] = cuts
    said = tl['said']
    LINES[clip] = {}
    sig = Xcorr(decode_mono(ci['path']), 8000) if mode == 'audio' else None
    tmin = 0.0
    for s in said:
        lid = os.path.splitext(s['file'])[0]
        wp_ = f'{WAV_DIR}/{s["file"]}'
        if not os.path.exists(wp_):
            sys.exit(f'FATAL: narration WAV missing {wp_}')
        wd = wav_dur(wp_)
        pred = shifted(s['at'] / 1000)
        e = dict(wav=wp_, wav_dur=wd, tl_dur=s['dur'], pred=pred)
        if mode == 'audio':
            tpl = decode_mono(wp_)
            # 1. window around the timeline prediction (+-10 s), never earlier than the previous line
            st, sc = sig.find(tpl, max(0.0, pred - 10.0, tmin - 0.05), pred + 10.0)
            where = 'window'
            if st is None or sc < 0.9:        # 2. whole clip (timeline/cuts file may be out of date)
                st, sc = sig.find(tpl, max(0.0, tmin - 0.05), None)
                where = 'whole clip'
            e.update(start=st, score=sc, src='xcorr', end=(st or 0.0) + wd)
            XC.append((clip, lid, pred, st, sc, where))
            if st is None or sc < 0.9:
                print_xc(clip)
                sys.exit(f'FATAL: {clip}/{lid}: best correlation {sc:.3f} < 0.9 anywhere after {tmin:.1f} s; line absent from the clip audio '
                         f'(WAVs in {WAV_DIR} are not what was muxed?)')
            tmin = st + 0.1
        else:
            e.update(start=pred, src='timeline', end=pred + s['dur'])
        LINES[clip][lid] = e
    over = [(lid, e['wav_dur'] - e['tl_dur']) for lid, e in LINES[clip].items() if e['wav_dur'] - e['tl_dur'] > 0.15]
    if over:
        DIAG.append((clip, 'WAV longer than the pacing the take was recorded with by >0.15 s: ' +
                     ', '.join(f'{a} +{b:.2f}' for a, b in over) + ' (provisional pacing; re-pace when the final take lands)', 'WARN'))
    DIAG.append((clip, f'mode={mode}; {len(said)} lines; jumps at ' + (', '.join(f'{j:.2f}' for j in JUMPS[clip]) or 'none'), 'OK'))
    if mode == 'audio':
        d = max(abs(e['start'] - e['pred']) for e in LINES[clip].values())
        DIAG.append((clip, f'xcorr vs timeline+cuts max delta {d:.2f} s' + ('' if d < 0.5 else ' (cuts file out of date?)'), 'OK' if d < 0.5 else 'WARN'))

PUSHED = []


def L(clip, lid):
    e = LINES[clip].get(lid)
    if e is None:
        sys.exit(f'FATAL: line {lid} not found in {clip} timeline (the kiosk narration changed?)')
    return e


def anchor(clip, lid, ref, off, kind, muted=False):
    """Cut time = line start/end + v5 offset, frame aligned, never inside a spoken word.
    kind 'in': the cut must not fall inside any line. kind 'out': same. Pushed (and logged) if the line is longer
    than the take was paced for."""
    e = L(clip, lid)
    base = e['start'] if ref == 'start' else max(e['end'], e['start'] + e['wav_dur'])
    t = fr(base + off)
    for lid2, e2 in ([] if muted else LINES[clip].items()):
        s2, en2 = e2['start'], max(e2['end'], e2['start'] + e2['wav_dur'])
        if s2 + 0.02 < t < en2 - 0.02:
            t2 = fr(en2 + 0.04) if ref == 'end' or kind == 'out' else fr(en2 + 0.04)
            PUSHED.append(f'{clip}: {kind} edge {t:.2f} fell inside {lid2} ({s2:.2f}-{en2:.2f}); pushed to {t2:.2f}')
            t = t2
    return t


def check_no_jump(clip, a, b, name):
    for j in JUMPS[clip]:
        if a + 0.04 < j < b - 0.04:
            sys.exit(f'FATAL: unit {name}: hand-cut jump at {j:.2f} s lies inside the window {a:.2f}-{b:.2f} of {clip}')


def check_len(clip, b, name):
    if b > CL[clip]['dur'] + 1e-6:
        sys.exit(f'FATAL: unit {name}: window end {b:.2f} beyond clip length {CL[clip]["dur"]:.2f} ({clip})')


# --------------------------------------------------------------------------- standalone lines
def sdur(name):
    return wav_dur(f'{LINES_V6}/{name}.wav')


SL = {n: sdur(n) for n in ['N01', 'N02', 'N03', 'N04', 'N05', 'N06', 'finale-00', 'tour-27']}


def char_times(name):
    a = json.load(open(f'{LINES_V6}/{name}.align.json'))
    return ''.join(a['characters']), a['character_start_times_seconds'], a['character_end_times_seconds']


# tour-27 bridge ("Now it's my turn to program ENIAC."): cut in the middle of the word gap after the first sentence
tx, st_, en_ = char_times('tour-27')
i_dot = tx.index('.')
j_next = i_dot + 1
while tx[j_next] == ' ':
    j_next += 1
BRIDGE = round((en_[i_dot] + st_[j_next]) / 2, 3)    # v5: gap 2.06-2.37, cut 2.21 (midpoint)
assert 1.5 < BRIDGE < 4.0, BRIDGE
# N06 url word: where "V C F E D" starts
tx6, st6, en6 = char_times('N06')
K6 = tx6.index('V C F E D')
N06_URL = round(st6[K6], 3)

# --------------------------------------------------------------------------- v5 tails (kept per unit)
# v5 unit slots and line durations (storyboard v5 / durations.json): tail = slot - lead - line
V5 = dict(A=(13.4, 0.3, 12.446), H=(3.3, 0.5, 2.21), J=(9.52, 0.4, 8.498), K=(7.8, 0.15, 7.291),
          L=(11.0, 0.3, 10.124), M=(4.5, 0.2, 3.437), O=(13.8, 0.4, 12.585))
TAIL = {u: round(s - o - l, 3) for u, (s, o, l) in V5.items()}
TAIL['K'] = max(TAIL['K'], 0.35)                 # v5 FIT rule: >= 0.2 s; keep the crossfade-out clean
END_TAIL = 1.79      # P: v5b ended 1.79 s after N06 (18.36 s unit, no end screen)
OFF = dict(A=0.3, H=0.5, J=0.4, K=0.15, L=0.3, M=0.2, O=0.4, P=0.5)

# --------------------------------------------------------------------------- cuts (anchors measured from v5)
# (clip, line, ref, offset)  v5 value = v5 cut - v5 line position (output/build/v5-line-positions.json)
ANCH = {
    'B_in':  ('tour', 'tour-01', 'start', -0.034),
    'B_out': ('tour', 'tour-11', 'start', -0.624),
    'B2_in': ('tour', 'tour-12', 'start', -0.839),
    'B2_out': ('tour', 'tour-12', 'end', 0.276),
    'D_in':  ('tour', 'tour-13', 'start', -0.083),
    'D_out': ('tour', 'tour-14', 'end', 0.147),
    'E_in':  ('tour', 'tour-16', 'start', -0.356),
    'E_out': ('tour', 'tour-25', 'end', 0.256),
    'G_in':  ('tour', 'tour-27', 'start', -0.367),
    'G_out': ('tour', 'tour-27', 'end', 0.165),
    'I_in':  ('squares', 'squares-02', 'start', -0.071),
    'I_out': ('squares', 'squares-19', 'start', -0.230),
    'N_in':  ('finale', 'finale-01', 'start', -0.255),
    'N_out': ('finale', 'finale-03', 'end', 1.362),
    'O_in':  ('finale', 'finale-04', 'start', 0.208),
    'O_end': ('finale', 'finale-04', 'end', 0.132),
    'J_in':  ('primes', 'primes-11', 'start', -0.117),
    'K_land': ('trajectory', 'trajectory-12', 'start', 0.0),     # "Landed" screen arrives here
}
K_PRE, K_POST = 5.779, 2.021      # v5 K window: 132.60 = land - 5.78; 140.40 = land + 2.02 (summary screen at +2.86)
S05_AFTER_T04 = 0.352             # picker -> Explore screen change 42.64 = end(tour-04) 42.29 + 0.35
S04_AFTER_T02 = 0.145             # 33.95 = end(tour-02) 33.805 + 0.145 (scene metadata only)
OUI_IN, OUI_OUT = 26.64, 41.64    # Stuart's own capture, fixed
assert OUI['dur'] >= OUI_OUT - 0.01, OUI

cut = {}
for k, (clip, lid, ref, off) in ANCH.items():
    if k in ('K_land', 'J_in'):
        continue
    kind = 'in' if k.endswith('_in') else 'out'
    cut[k] = anchor(clip, lid, ref, off, kind, muted=k in ('O_in', 'O_end'))   # O is muted footage: edges may sit inside the muted line

D = {}   # unit durations
C = {}   # unit -> (clip key, in, src_len)
# baked units
for u, clip in [('B', 'tour'), ('B2', 'tour'), ('D', 'tour'), ('E', 'tour'), ('G', 'tour'), ('I', 'squares'), ('N', 'finale')]:
    a, b = cut[f'{u}_in'], cut[f'{u}_out']
    check_len(clip, b, u)
    check_no_jump(clip, a, b, u)
    D[u] = fr(b - a)
    C[u] = (clip, a, D[u])
# O: muted footage then freeze, N05 sets the length
D['O'] = fr(OFF['O'] + SL['N05'] + TAIL['O'])
o_in, o_end = cut['O_in'], cut['O_end']
check_len('finale', o_end, 'O')
check_no_jump('finale', o_in, o_end, 'O')
C['O'] = ('finale', o_in, fr(o_end - o_in))
# J, K muted footage; line sets the length
D['J'] = fr(OFF['J'] + SL['N02'] + TAIL['J'])
j_in = anchor('primes', 'primes-11', 'start', ANCH['J_in'][3], 'in')
check_len('primes', j_in + D['J'], 'J')
check_no_jump('primes', j_in, j_in + D['J'], 'J')
C['J'] = ('primes', j_in, D['J'])
D['K'] = fr(OFF['K'] + SL['N03'] + TAIL['K'])
land = L('trajectory', 'trajectory-12')['start']
k_in = fr(land - K_PRE)
jumps_before = [j for j in JUMPS['trajectory'] if j <= k_in + 0.2 and j > k_in - 5]
if jumps_before:      # never start before the last hand-cut jump
    k_in = max(k_in, fr(max(jumps_before) + 0.2))
k_out_wish = k_in + D['K']
check_len('trajectory', k_out_wish, 'K')
check_no_jump('trajectory', k_in, k_out_wish, 'K')
K_SUMMARY = land + 2.86          # v5: summary screen appears 2.86 s after the Landed line
assert k_out_wish < K_SUMMARY - 0.1, f'K window runs into the summary screen ({k_out_wish:.2f} vs {K_SUMMARY:.2f})'
C['K'] = ('trajectory', k_in, D['K'])
# U original UI
D['U'] = fr(OUI_OUT - OUI_IN)
# cards / invite
D['C'], D['F'] = fr(1.8), fr(1.8)
D['A'] = fr(OFF['A'] + SL['N01'] + TAIL['A'])
D['H'] = fr(OFF['H'] + BRIDGE + TAIL['H'])
D['L'] = fr(OFF['L'] + SL['N04'] + TAIL['L'])
D['M'] = fr(OFF['M'] + SL['finale-00'] + TAIL['M'])
D['P'] = fr(OFF['P'] + SL['N06'] + END_TAIL)

UNIT_ORDER = ['A', 'B', 'B2', 'U', 'C', 'D', 'E', 'F', 'G', 'H', 'IJ', 'K', 'L', 'M', 'NO', 'P']
D['IJ'] = fr(D['I'] + D['J'])
D['NO'] = fr(D['N'] + D['O'])
OV = {'A': 0.5, 'B': 0.4, 'B2': 0.5, 'U': 0.5, 'C': 0.4, 'D': 0.4, 'E': 0.4, 'F': 0.4, 'G': 0.4, 'H': 0.4, 'IJ': 0.4,
      'K': 0.4, 'L': 0.4, 'M': 0.4, 'NO': 0.5, 'P': 0.0}
PS = {}
t = 0.0
for u in UNIT_ORDER:
    PS[u] = fr(t)
    t = PS[u] + D[u] - OV[u]
PS['I'] = PS['IJ']
PS['J'] = fr(PS['IJ'] + D['I'])
PS['N'] = PS['NO']
PS['O'] = fr(PS['NO'] + D['N'])
TOTAL = fr(PS['P'] + D['P'])

# --------------------------------------------------------------------------- scene/overlay metadata
B_in = cut['B_in']
S05_screen = L('tour', 'tour-04')['end'] + S05_AFTER_T04
S05_OFF = fr(S05_screen - B_in)
EXP_TAG_TIN = round(S05_OFF + 1.5, 2)
# A: chapter-1 lower third rides on the line (v5: 8.6-12.2 over N01 0.3+12.446)
scale = SL['N01'] / 12.446
ch1_tin = round(0.3 + (8.6 - 0.3) * scale, 2)
ch1_tout = round(0.3 + (12.2 - 0.3) * scale, 2)
# E cutaway P2 rides on tour-16
e_line = L('tour', 'tour-16')
E_IN_SRC = cut['E_in']
cp2_in = round(e_line['start'] + 0.244 - E_IN_SRC, 2)
cp2_out = round(max(e_line['end'], e_line['start'] + e_line['wav_dur']) + 0.05 - E_IN_SRC, 2)
assert 0.2 < cp2_in < cp2_out <= D['E'], (cp2_in, cp2_out, D['E'])
# G cutaway P3 starts in the word gap after the six names (tour-27)
g_line = L('tour', 'tour-27')
gw = g_line['wav']
frac = None
txt27 = json.load(open(gw.replace('.wav', '.json')))['text']
frac = (txt27.index('Lichterman.') + len('Lichterman.')) / len(txt27)
exp_t = frac * g_line['wav_dur']
r = subprocess.run([FF, '-hide_banner', '-nostats', '-i', gw, '-af', 'silencedetect=noise=-35dB:d=0.08', '-f', 'null', '-'],
                   capture_output=True, text=True).stderr
gs = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', r)]
ge = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', r)]
gaps = [(a, b) for a, b in zip(gs, ge)]
best = min(gaps, key=lambda g: abs((g[0] + g[1]) / 2 - exp_t))
assert abs((best[0] + best[1]) / 2 - exp_t) < 1.2, ('names gap not found', exp_t, gaps)
g_gap_mid = (best[0] + best[1]) / 2
cp3_in = round(g_line['start'] + g_gap_mid - cut['G_in'], 2)
assert 0.5 < cp3_in < D['G'] - 1, cp3_in
# P: url word
url_tin = round(OFF['P'] + N06_URL, 2)
duck_end = round(OFF['P'] + SL['N06'] + 0.1, 2)

# --------------------------------------------------------------------------- voice events
VOICE = []   # dict(unit, offset, kind, path, ss, t, label)
VOICE.append(dict(unit='A', offset=OFF['A'], kind='wav', path=f'{LINES_V6}/N01.wav', ss=None, t=None, label='N01'))
for u in ('B', 'B2', 'D', 'E', 'G', 'I', 'N'):
    clip, a, d = C[u]
    inside = []
    for lid, e in LINES[clip].items():
        s, en = e['start'], max(e['end'], e['start'] + e['wav_dur'])
        if en <= a + 0.02 or s >= a + d - 0.02:
            continue
        if s < a - 0.02 or en > a + d + 0.02:
            sys.exit(f'FATAL: line {lid} ({s:.2f}-{en:.2f}) straddles the edge of unit {u} ({a:.2f}-{a + d:.2f})')
        inside.append(dict(id=lid, start_in_unit=round(s - a, 3), wav=e['wav'], dur=e['wav_dur']))
    VOICE.append(dict(unit=u, offset=0.0, kind='baked', clip=clip, path=CL[clip]['path'], ss=a, t=d, label=f'{clip} lines {inside[0]["id"]}..{inside[-1]["id"]}',
                      lines=inside))
VOICE += [
    dict(unit='H', offset=OFF['H'], kind='wav', path=f'{LINES_V6}/tour-27.wav', ss=0.0, t=BRIDGE, label='tour-27 bridge (first sentence)'),
    dict(unit='J', offset=OFF['J'], kind='wav', path=f'{LINES_V6}/N02.wav', ss=None, t=None, label='N02'),
    dict(unit='K', offset=OFF['K'], kind='wav', path=f'{LINES_V6}/N03.wav', ss=None, t=None, label='N03'),
    dict(unit='L', offset=OFF['L'], kind='wav', path=f'{LINES_V6}/N04.wav', ss=None, t=None, label='N04'),
    dict(unit='M', offset=OFF['M'], kind='wav', path=f'{LINES_V6}/finale-00.wav', ss=None, t=None, label='finale-00'),
    dict(unit='O', offset=OFF['O'], kind='wav', path=f'{LINES_V6}/N05.wav', ss=None, t=None, label='N05 (single Stuart thank-you)'),
    dict(unit='P', offset=OFF['P'], kind='wav', path=f'{LINES_V6}/N06.wav', ss=None, t=None, label='N06'),
]
for v in VOICE:
    v['program_t'] = round(PS[v['unit']] + v['offset'], 3)
    for ln in v.get('lines', []):
        ln['program_t'] = round(v['program_t'] + ln['start_in_unit'], 3)
VOICE.sort(key=lambda v: v['program_t'])
# same overlap rule the assembler enforces: no two voice events may overlap by more than 0.02 s
_iv = []
for v in VOICE:
    if v['kind'] == 'baked':      # per spoken line: the unit windows themselves overlap in the crossfades, in silence
        for ln in v['lines']:
            _iv.append((ln['program_t'], ln['program_t'] + ln['dur'], v['unit'] + ' ' + ln['id']))
    else:
        _d = (v['t'] if v['t'] is not None else SL[os.path.splitext(os.path.basename(v['path']))[0]])
        _iv.append((v['program_t'], v['program_t'] + _d, v['unit'] + ' ' + v['label']))
_iv.sort()
VOICE_GAPS = []
for _k in range(1, len(_iv)):
    _g = _iv[_k][0] - _iv[_k - 1][1]
    VOICE_GAPS.append((round(_g, 2), _iv[_k - 1][2], _iv[_k][2]))
    if _g < -0.02:
        sys.exit(f'FATAL: voice overlap {_g:.2f} s between {_iv[_k - 1][2]} and {_iv[_k][2]}')

# --------------------------------------------------------------------------- overlays (v5 layout, times resolved)
OVL = dict(
    A=dict(credit=dict(text='U.S. Army Photo', tin=0.6, tout=round(D['A'] - 0.4, 2)),
           lower_third=dict(text='Nick DeMarco', sub='Docent and Exhibit Developer, Vintage Computer Federation', tin=0.6, tout=5.6),
           chapter_lt=dict(n=1, title='Meet the kiosk', tin=ch1_tin, tout=ch1_tout)),
    B=dict(header_tag=dict(label='CHAPTER 2', text='Explore ENIAC', right=1165, tin=EXP_TAG_TIN, tout=round(S05_OFF + 5.0, 2))),
    E=dict(credit=dict(text='U.S. Army Photo', tin=round(cp2_in + 0.2, 2), tout=round(cp2_out - 0.4, 2), side='r'),
           cutaway=dict(photo='P2', tin=cp2_in, tout=cp2_out)),
    G=dict(credit=dict(text='Betty Jean Jennings and Frances Bilas, 1946 · U.S. Army Photo', tin=round(cp3_in + 0.2, 2),
                       tout=round(D['G'] - 0.4, 2), side='l'),
           cutaway=dict(photo='P3', tin=cp3_in, tout=D['G'])),
    J=dict(header_tags=[dict(label='CHAPTER 6', text='Only at the museum', right=1175, tin=0.3, tout=3.5),
                        dict(label='MISSION 2', text='Primes  ·  live at the museum', right=1175, tin=3.6, tout=round(D['J'], 2))]),
    K=dict(column_tag=dict(label='MISSION 3', lines=["Brian Stuart's reconstruction", "of ENIAC's 1946 shell flight"], size=25, tin=0.3, tout=round(D['K'], 2))),
    P=dict(url_tin=url_tin, duck_end=duck_end, end_fade=1.2),
)

CH = [(1, 'Meet the kiosk', 0.0), (2, 'Explore ENIAC', PS['B'] + EXP_TAG_TIN), (3, 'Keeping ENIAC alive', PS['C']),
      (4, 'The first programmers', PS['F']), (5, 'Mission 1: Squares', PS['H']), (6, 'Only at the museum', PS['J']),
      (7, 'The finale', PS['M']), (8, 'Come see it', PS['P'])]
YT = []
for n, title, p in CH:
    tt = 0.0 if n == 1 else round(p + INTRO, 2)
    YT.append(dict(n=n, title=title, t=tt, stamp=f'{int(tt // 60)}:{int(tt % 60):02d}'))

# --------------------------------------------------------------------------- how overruns are absorbed
ABSORB = []
for u, name, v6d, v5d in [('A', 'N01', SL['N01'], 12.446), ('J', 'N02', SL['N02'], 8.498), ('K', 'N03', SL['N03'], 7.291),
                          ('L', 'N04', SL['N04'], 10.124), ('O', 'N05', SL['N05'], 12.585), ('P', 'N06', SL['N06'], 16.068)]:
    v5slot = V5[u][0] if u in V5 else 17.4
    how = {
        'A': 'photo Ken Burns pan/zoom stretched over the longer unit (4% slower, same framing)',
        'J': 'muted primes footage window extended at its out edge (source continues; no freeze)',
        'K': 'muted trajectory window extended at its out edge ("Landed" is held; ends before the summary screen)',
        'L': 'invite card holds shorter (blurred freeze, no motion)',
        'O': 'freeze-last-frame hold shortened (muted f3 footage, then held)',
        'P': 'close card holds shorter; ends 1.79 s after the last word (v5b end), 1.2 s fade',
    }[u]
    ABSORB.append(dict(unit=u, line=name, v5_line=v5d, v6_line=round(v6d, 3), delta_line=round(v6d - v5d, 3), v5_slot=v5slot,
                       v6_slot=D[u], delta_slot=round(D[u] - v5slot, 3), tail=round(D[u] - OFF.get(u, 0) - v6d, 3), how=how))
ABSORB.append(dict(unit='H', line='tour-27 bridge', v5_line=2.21, v6_line=BRIDGE, delta_line=round(BRIDGE - 2.21, 3), v5_slot=3.3,
                   v6_slot=D['H'], delta_slot=round(D['H'] - 3.3, 3), tail=round(D['H'] - OFF['H'] - BRIDGE, 3),
                   how=f'chapter-5 card holds longer; bridge is the first sentence only, cut mid word-gap (full v6 line is {SL["tour-27"]:.2f} s)'))

# --------------------------------------------------------------------------- write
V5_UNITS = {u: dict(start=V5_TL['PS'][u], dur=V5_TL['DUR'][u]) for u in V5_TL['PS'] if u in V5_TL['DUR']}


def cuts_json():
    out = {}
    for u, (clip, a, d) in C.items():
        out[u] = [CL[clip]['path'], round(a, 3), round(a + d, 3)]
    out['U'] = [OUI['path'], OUI_IN, OUI_OUT]
    return out


data = dict(
    project='Program ENIAC: Our New Touch-Screen Exhibit', version='6.0', provisional=DRY,
    mode='DRY RUN on provisional clips' if DRY else 'final',
    config=dict(build=BUILD, src=SRC, wav_dir=WAV_DIR, timeline_dir=TL_DIR, takes_dir=TAKES, mux_cuts_file=A.mux_cuts,
                mux_cuts_status=MUXCUTS_STATUS, music='assets/audio/music/swing-bed-v5.wav'),
    format=dict(resolution='1920x1080', fps=FPS, audio='48 kHz'),
    intro=dict(dur=INTRO),
    program_total_s=TOTAL, total_with_intro_s=round(TOTAL + INTRO, 2),
    total_with_intro=f'{int((TOTAL + INTRO) // 60)}:{(TOTAL + INTRO) % 60:05.2f}',
    clips={k: dict(path=c['path'], dur=round(c['dur'], 3), w=c['w'], h=c['h'], fps=c['fps'], audio_streams=c['audio_streams'],
                   mode=c['mode'], timeline=c['timeline'], mux_cuts=c['mux_cuts'], jumps=JUMPS[k]) for k, c in CL.items()},
    original_ui=dict(path=OUI['path'], dur=OUI['dur'], fps=OUI['fps']),
    lines={k: {lid: {kk: (round(vv, 3) if isinstance(vv, float) else vv) for kk, vv in e.items()} for lid, e in v.items()} for k, v in LINES.items()},
    standalone={k: round(v, 3) for k, v in SL.items()}, bridge_end=BRIDGE, n06_url_t=N06_URL,
    units=[dict(unit=u, program_in=PS[u], dur=D[u], crossfade_out=OV[u]) for u in UNIT_ORDER],
    subunits={u: dict(program_in=PS[u], dur=D[u]) for u in ('I', 'J', 'N', 'O')},
    cuts=cuts_json(), cut_anchors={k: dict(clip=v[0], line=v[1], ref=v[2], offset_s=v[3], t=cut.get(k)) for k, v in ANCH.items()},
    s05_off=S05_OFF, voice_events=VOICE, overlays=OVL, youtube_chapters=YT,
    absorb=ABSORB, pushed_edges=PUSHED, diag=[list(x) for x in DIAG],
    v5_reference=V5_UNITS, v5_total_s=V5_TL['TOTAL'],
    music_cues=dict(duck=-23.0, gap=-14.0, card=-9.0, title=-5.0, up_u=-6.0, after_close=-7.0, note='unchanged from v5; Q/end-screen cues removed (v5b)'),
)
out = f'{BUILD}/storyboard-data.v6.json'
json.dump(data, open(out, 'w'), indent=1, ensure_ascii=False)
if A.write_storyboard:
    if DRY:
        sys.exit('refusing to write storyboard/ from a dry run')
    json.dump(data, open(f'{ROOT}/storyboard/storyboard-data.v6.json', 'w'), indent=1, ensure_ascii=False)

# chapters file for the YouTube description
ch_txt = '\n'.join(f"{y['stamp']} {y['title']}" for y in YT) + '\n'
open(f'{BUILD}/chapters.txt', 'w').write(ch_txt)

if __name__ == '__main__':
    print(f'MODE: {data["mode"]}   build {BUILD}')
    print(f'mux cuts file: {MUXCUTS_STATUS}')
    for d in DIAG:
        print('  diag', *d)
    for p in PUSHED:
        print('  PUSHED', p)
    print(f'program {TOTAL:.2f}s  with intro {TOTAL + INTRO:.2f}s ({data["total_with_intro"]})   v5 program {V5_TL["TOTAL"]:.2f}s (v5b 474.28s)')
    print(f'{"unit":4s} {"start":>8s} {"dur":>7s} {"v5 start":>9s} {"v5 dur":>7s}   source')
    for u in UNIT_ORDER:
        v5 = V5_UNITS.get(u, {})
        src_ = ''
        if u in C:
            clip, a, d = C[u]
            src_ = f'{clip} {a:.2f}-{a + d:.2f}'
        print(f'{u:4s} {PS[u]:8.2f} {D[u]:7.2f} {v5.get("start", float("nan")):9.2f} {v5.get("dur", float("nan")):7.2f}   {src_}')
    print('voice gaps between consecutive events (s), smallest 5:')
    for g in sorted(VOICE_GAPS)[:5]:
        print('  ', *g)
    for k_ in LINES:
        sc_ = [e['score'] for e in LINES[k_].values() if 'score' in e]
        if sc_:
            print(f'  xcorr {k_}: {len(sc_)} lines, min score {min(sc_):.3f}')
    print('absorbed overruns:')
    for a in ABSORB:
        print(f"  {a['unit']:2s} {a['line']:15s} line {a['v5_line']:.3f}->{a['v6_line']:.3f} ({a['delta_line']:+.3f})  slot {a['v5_slot']:.2f}->{a['v6_slot']:.2f} "
              f"({a['delta_slot']:+.2f}) tail {a['tail']:.2f}  {a['how']}")
    print('chapters (with intro):')
    print(ch_txt)
