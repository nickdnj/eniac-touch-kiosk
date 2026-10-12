#!/usr/bin/env python3
"""Pre-flight for the v6 long cut. Fails LOUDLY (exit 1, FAIL rows) so a stale or wrong clip can never reach the encode.

  python3 scripts/preflight_v6.py                 # before the final run: source clips + inputs
  python3 scripts/preflight_v6.py --final         # after the final run: output/eniac-kiosk-v6.mp4 loudness / TP / duration
  python3 scripts/preflight_v6.py --all           # both
  options: --dry-run (use the dry-run build + DRYRUN file name), --silent-form (accept video-only clips when the per-line
           WAVs + timelines are present: M1's "silent video plus separate WAVs" form), --src-dir, --wav-dir, --kiosk-worktree

Source clip checks (assets/video/source-v6/):
  fresh        mtime is later than the creation of the kiosk-main worktree the clips were recorded from
  audio        exactly ONE audio stream (original-ui-tour.mp4: none, it is Stuart's own capture)
               video-only is a FAIL when narration WAVs are expected (unless --silent-form and WAVs+timeline exist)
  size         1920x1080
  lamps        a verify image for the clip exists in _verify/, is newer than the clip, and no *WRONG*/*FAIL* image is newer
  not-old      clip is not byte-identical to a v3/v4/v5 clip (lamps upside down there)
Inputs: kiosk worktree contains main 62ef8d7, mux-cuts file not PROVISIONAL, storyboard data not a dry run, v6 standalone WAVs.
Final file: integrated loudness -14 LUFS +-0.5, true peak <= -1.5 dBTP, duration == timeline total (+-0.15 s) and 6-9 min,
            1 video + 1 audio stream, 1920x1080, 25 fps.
"""
import argparse, datetime, glob, hashlib, json, os, re, subprocess, sys

ROOT = '/Users/nickd/Workspaces/eniac-kiosk-youtube'
FF = '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg'
FFP = '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe'
KIOSK = '/Users/nickd/Workspaces/eniac-touch-kiosk'
MIN_COMMIT = '62ef8d7'

ap = argparse.ArgumentParser()
ap.add_argument('--final', nargs='?', const='AUTO', help='check the rendered file (default output/eniac-kiosk-v6.mp4)')
ap.add_argument('--all', action='store_true')
ap.add_argument('--dry-run', action='store_true')
ap.add_argument('--silent-form', action='store_true')
ap.add_argument('--src-dir', default=f'{ROOT}/assets/video/source-v6')
ap.add_argument('--wav-dir')
ap.add_argument('--kiosk-worktree', help='worktree the clips were recorded from (default: auto, the newest kiosk worktree containing main)')
ap.add_argument('--build-dir')
ap.add_argument('--lufs-target', type=float, default=-14.0)
A = ap.parse_args()
DO_FINAL = A.final is not None or A.all
DO_CLIPS = A.all or A.final is None
BUILD = A.build_dir or f'{ROOT}/output/build/' + ('v6-dryrun' if A.dry_run else 'v6')
SRC = A.src_dir.rstrip('/')
ROWS = []


def row(check, subject, ok, detail, warn=False):
    res = 'PASS' if ok else ('WARN' if warn else 'FAIL')
    ROWS.append((check, subject, res, detail))
    return ok


def sh(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def probe(path):
    r = sh([FFP, '-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate,sample_rate,channels:format=duration',
            '-of', 'json', path])
    return json.loads(r.stdout)


def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


# --------------------------------------------------------------------------- kiosk worktree (creation time)
def find_worktree():
    if A.kiosk_worktree:
        return A.kiosk_worktree
    out = sh(['git', '-C', KIOSK, 'worktree', 'list', '--porcelain']).stdout
    cands = []
    for blk in out.split('\n\n'):
        m = re.search(r'worktree (.+)', blk)
        h = re.search(r'HEAD (\w+)', blk)
        if not (m and h) or m.group(1) == KIOSK:
            continue
        if sh(['git', '-C', KIOSK, 'merge-base', '--is-ancestor', MIN_COMMIT, h.group(1)]).returncode == 0:
            cands.append(m.group(1))
    if not cands:
        return None
    return max(cands, key=lambda p: os.stat(os.path.join(p, '.git')).st_birthtime)


WT = find_worktree()
WT_BORN = None
if WT:
    WT_BORN = os.stat(os.path.join(WT, '.git')).st_birthtime
    head = sh(['git', '-C', WT, 'rev-parse', '--short=7', 'HEAD']).stdout.strip()
    anc = sh(['git', '-C', KIOSK, 'merge-base', '--is-ancestor', MIN_COMMIT, head]).returncode == 0
    row('kiosk', os.path.basename(WT), anc, f'HEAD {head} contains {MIN_COMMIT}; worktree created '
        f'{datetime.datetime.fromtimestamp(WT_BORN):%Y-%m-%d %H:%M:%S}')
else:
    row('kiosk', 'worktree', False, f'no kiosk worktree contains {MIN_COMMIT}; pass --kiosk-worktree')

# --------------------------------------------------------------------------- clips
CLIPS = {
    'eniac-touch-tour.mp4': dict(verify=['tour_', 'eniac-touch-tour'], audio=1),
    'eniac-touch-walkthrough-squares.mp4': dict(verify=['squares_', 'eniac-touch-walkthrough-squares'], audio=1),
    'eniac-touch-walkthrough-primes.mp4': dict(verify=['primes_', 'eniac-touch-walkthrough-primes'], audio=1),
    'eniac-touch-walkthrough-trajectory.mp4': dict(verify=['traj_', 'trajectory_', 'eniac-touch-walkthrough-trajectory'], audio=1),
    'finale.mp4': dict(verify=['finale_'], audio=1),
    'original-ui-tour.mp4': dict(verify=['original-ui', 'original_ui', 'oui_'], audio=0, exempt_fresh='Stuart\'s own eniactk -D capture, not a kiosk recording'),
}
EXTRA = {'squares-fullspeed-lamps.mp4': dict(verify=['squares-fullspeed-lamps', 'fullspeed'], audio=0, optional=True)}
VER = f'{SRC}/_verify'
ver_files = [f for f in glob.glob(f'{VER}/*') if os.path.isfile(f)]
OLD = []
for d in ('source-v3', 'source-v4', 'source-v5'):
    OLD += glob.glob(f'{ROOT}/assets/video/{d}/*.mp4')
OLD_BY_SIZE = {}
for p in OLD:
    OLD_BY_SIZE.setdefault(os.path.getsize(p), []).append(p)

WAV_DIR = A.wav_dir or (f'{WT}/build/video/narration' if WT else None)


def narration_for(clip):
    key = {'eniac-touch-tour.mp4': 'tour', 'eniac-touch-walkthrough-squares.mp4': 'squares', 'eniac-touch-walkthrough-primes.mp4': 'primes',
           'eniac-touch-walkthrough-trajectory.mp4': 'trajectory', 'finale.mp4': 'finale'}.get(clip)
    if not key or not WAV_DIR:
        return key, None, 'no narration dir'
    tl = f'{WAV_DIR}/{key}-timeline.json'
    if not os.path.exists(tl):
        return key, None, f'{tl} missing'
    said = json.load(open(tl))['said']
    miss = [s['file'] for s in said if not os.path.exists(f'{WAV_DIR}/{s["file"]}')]
    if miss:
        return key, None, f'{len(miss)} WAVs missing ({miss[0]}...)'
    return key, len(said), 'ok'


def check_clip(name, spec):
    p = f'{SRC}/{name}'
    if not os.path.exists(p):
        row('exists', name, False, 'missing' + (' (optional extra clip for the 8 s Short)' if spec.get('optional') else ''), warn=spec.get('optional', False))
        return
    j = probe(p)
    v = [s for s in j['streams'] if s['codec_type'] == 'video']
    a = [s for s in j['streams'] if s['codec_type'] == 'audio']
    mt = os.path.getmtime(p)
    # fresh
    if spec.get('exempt_fresh'):
        row('fresh', name, True, 'EXEMPT: ' + spec['exempt_fresh'], warn=True)
    elif WT_BORN is None:
        row('fresh', name, False, 'cannot compare: no kiosk worktree found')
    else:
        row('fresh', name, mt > WT_BORN, f'clip {datetime.datetime.fromtimestamp(mt):%H:%M:%S} vs worktree {datetime.datetime.fromtimestamp(WT_BORN):%H:%M:%S}'
            + ('' if mt > WT_BORN else '  STALE: recorded before the kiosk-main worktree existed'))
    # audio
    want = spec['audio']
    if want == 1:
        if len(a) == 1:
            row('audio', name, True, '1 audio stream')
        elif len(a) == 0:
            key, n, why = narration_for(name)
            if A.silent_form and n:
                row('audio', name, True, f'video-only + {n} narration WAVs and timeline ({WAV_DIR}); voice laid per line', warn=True)
            else:
                row('audio', name, False, f'video-only, but narration WAVs are expected ({"WAVs and timeline present" if n else why}); '
                    'mux the voice in, or re-run with --silent-form')
        else:
            row('audio', name, False, f'{len(a)} audio streams, expected exactly 1')
    else:
        row('audio', name, len(a) == 0, f'{len(a)} audio streams (none expected)')
    # size
    ok = bool(v) and v[0]['width'] == 1920 and v[0]['height'] == 1080
    row('size', name, ok, f'{v[0]["width"]}x{v[0]["height"]} @ {v[0]["r_frame_rate"]}' if v else 'no video stream')
    # lamps verify image
    mine = [f for f in ver_files if any(os.path.basename(f).startswith(pre) for pre in spec['verify'])]
    bad = [f for f in mine if re.search(r'WRONG|FAIL', os.path.basename(f)) and os.path.getmtime(f) >= mt]
    good = [f for f in mine if os.path.getmtime(f) >= mt and not re.search(r'WRONG|FAIL', os.path.basename(f))]
    if bad:
        row('lamps', name, False, f'{os.path.basename(bad[0])} is a failure image newer than the clip')
    elif good:
        row('lamps', name, True, f'{len(good)} verify image(s) newer than the clip, e.g. {os.path.basename(sorted(good)[0])}')
    elif mine:
        row('lamps', name, False, f'verify images exist ({len(mine)}) but are OLDER than the clip: re-check this version by eye')
    else:
        row('lamps', name, False, f'no verify image in _verify/ (prefixes {spec["verify"]}); look at the accumulator shots and save one')
    # not an old clip
    same = [o for o in OLD_BY_SIZE.get(os.path.getsize(p), []) if sha(o) == sha(p)]
    if same and name != 'original-ui-tour.mp4':
        row('not-old', name, False, f'byte-identical to {os.path.relpath(same[0], ROOT)}')
    elif same:
        row('not-old', name, True, f'byte-identical to {os.path.relpath(same[0], ROOT)} (expected: Stuart capture carried over)', warn=True)
    else:
        row('not-old', name, True, 'differs from every v3/v4/v5 clip')


def check_inputs():
    mc = f'{ROOT}/scripts/v6_mux_cuts.json'
    if os.path.exists(mc):
        st = json.load(open(mc)).get('_status', '')
        row('inputs', 'scripts/v6_mux_cuts.json', not st.upper().startswith('PROVISIONAL'), st[:110] or 'no _status')
    else:
        row('inputs', 'scripts/v6_mux_cuts.json', False, 'missing')
    sb = f'{BUILD}/storyboard-data.v6.json'
    if os.path.exists(sb):
        d = json.load(open(sb))
        modes = {k: c['mode'] for k, c in d['clips'].items()}
        row('inputs', 'storyboard-data.v6.json', not d.get('provisional') or A.dry_run, f'provisional={d.get("provisional")}, modes {modes}')
        # no unit window may run past its clip
        for u, (f, a_, b) in d['cuts'].items():
            ln = None
            for k, c in d['clips'].items():
                if c['path'] == f:
                    ln = c['dur']
            if ln is not None:
                row('inputs', f'window {u}', b <= ln + 1e-6, f'{a_:.2f}-{b:.2f} within clip {ln:.2f}')
    else:
        row('inputs', 'storyboard-data.v6.json', False, f'missing: run scripts/gen_storyboard_v6.py {"--dry-run" if A.dry_run else ""} ({BUILD})')
    miss = [n for n in ['N01', 'N02', 'N03', 'N04', 'N05', 'N06', 'finale-00', 'tour-27']
            if not os.path.exists(f'{ROOT}/assets/audio/source-lines-v6/{n}.wav')]
    row('inputs', 'source-lines-v6', not miss, 'all 8 standalone WAVs present' if not miss else f'missing {miss}')
    row('inputs', 'music bed', os.path.exists(f'{ROOT}/assets/audio/music/swing-bed-v5.wav'), 'assets/audio/music/swing-bed-v5.wav (unchanged from v5)')


# --------------------------------------------------------------------------- final file
def check_final(path):
    if not os.path.exists(path):
        row('final', os.path.basename(path), False, 'file does not exist')
        return
    if A.dry_run and 'DRYRUN' not in path:
        row('final', os.path.basename(path), False, 'dry run must not write the final name')
    if not A.dry_run and 'DRYRUN' in path:
        row('final', os.path.basename(path), False, 'DRYRUN file passed as the final')
    j = probe(path)
    v = [s for s in j['streams'] if s['codec_type'] == 'video']
    a = [s for s in j['streams'] if s['codec_type'] == 'audio']
    dur = float(j['format']['duration'])
    row('final', 'streams', len(v) == 1 and len(a) == 1, f'{len(v)} video, {len(a)} audio')
    if v:
        row('final', 'video', (v[0]['width'], v[0]['height'], v[0]['r_frame_rate']) == (1920, 1080, '25/1'),
            f'{v[0]["width"]}x{v[0]["height"]} {v[0]["r_frame_rate"]}')
    if a:
        row('final', 'audio', a[0].get('sample_rate') == '48000' and a[0].get('channels') == 2, f'{a[0].get("sample_rate")} Hz, {a[0].get("channels")} ch')
    r = sh([FF, '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'])
    summ = r.stderr[r.stderr.rfind('Summary:'):]
    mi = re.search(r'I:\s+(-?[\d.]+) LUFS', summ)
    mp = re.search(r'Peak:\s+(-?[\d.]+) dBFS', summ)
    if mi is None or mp is None:
        raise SystemExit('ebur128 summary not found in ffmpeg output for ' + path)
    i = float(mi.group(1))
    tp = float(mp.group(1))
    row('final', 'loudness', abs(i - A.lufs_target) <= 0.5, f'{i:.1f} LUFS (target {A.lufs_target:.0f} +-0.5)')
    row('final', 'true peak', tp <= -1.5, f'{tp:.1f} dBTP (<= -1.5)')
    tl = f'{BUILD}/timeline.json'
    if os.path.exists(tl):
        exp = json.load(open(tl))['EXPECTED_TOTAL_WITH_INTRO']
        row('final', 'duration', abs(dur - exp) <= 0.15, f'{dur:.2f} s vs timeline {exp:.2f} s')
    else:
        row('final', 'duration', False, f'{tl} missing; cannot compare')
    row('final', 'length range', 360 <= dur <= 540, f'{int(dur // 60)}:{dur % 60:05.2f} (6:00-9:00; v5b was 8:02)')


if DO_CLIPS:
    check_inputs()
    for n, s in CLIPS.items():
        check_clip(n, s)
    for n, s in EXTRA.items():
        check_clip(n, s)
if DO_FINAL:
    f = A.final if A.final not in (None, 'AUTO') else (f'{ROOT}/output/eniac-kiosk-v6-DRYRUN.mp4' if A.dry_run else f'{ROOT}/output/eniac-kiosk-v6.mp4')
    check_final(f)

w = [max(len(str(r[i])) for r in ROWS) for i in range(3)]
print(f'{"check":{w[0]}s}  {"subject":{w[1]}s}  result  detail')
for c, s, res, d in ROWS:
    print(f'{c:{w[0]}s}  {s:{w[1]}s}  {res:6s}  {d}')
nf = sum(1 for r in ROWS if r[2] == 'FAIL')
nw = sum(1 for r in ROWS if r[2] == 'WARN')
print(f'\n{"FAIL: " + str(nf) + " check(s) failed. DO NOT RUN THE FINAL ASSEMBLY / DO NOT UPLOAD." if nf else "PASS"}  ({len(ROWS)} checks, {nw} warnings)')
sys.exit(1 if nf else 0)
