#!/usr/bin/env python3
"""Assemble the v6 long cut (VCF intro + main program, v5b ending: no end screen) from
<build>/storyboard-data.v6.json written by scripts/gen_storyboard_v6.py.

Structure, overlays, music bed (swing-bed-v5.wav), cue levels, -14 LUFS / TP <= -1.5 target and encode are v5's.
Differences from assemble_v5.py:
  * every duration / cut / voice position is READ from the JSON (probed from the clips and WAVs by the generator);
  * sources are assets/video/source-v6 only (asserted: no v3/v4/v5 kiosk clip can be used: lamps would be upside down);
  * voice: a clip with its own audio stream is decoded as in v5; a video-only clip gets its per-line WAVs laid at the
    located positions (identical result). The standalone v6 lines (N01..N06, finale-00, tour-27 bridge) are WAVs;
  * no S21 end screen: P is the last unit, ends 1.79 s after the last word and fades out over 1.2 s (v5b);
  * writes <build>/chapters.txt (YouTube description) and <build>/timeline.json (read by preflight_v6.py).

Run:
  python3 scripts/gen_storyboard_v6.py --dry-run && python3 scripts/assemble_v6.py --dry-run     # output/eniac-kiosk-v6-DRYRUN.mp4
  python3 scripts/gen_storyboard_v6.py            && python3 scripts/assemble_v6.py               # output/eniac-kiosk-v6.mp4
  options: [--force] [--stage units|audio|final|all] [--build-dir DIR] [--out FILE]
"""
import json, math, os, subprocess, sys, re, shutil
import numpy as np
import soundfile as sf
from PIL import ImageFont

ROOT = '/Users/nickd/Workspaces/eniac-kiosk-youtube'
FF = '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg'
FFP = '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe'
DRY = '--dry-run' in sys.argv
FORCE = '--force' in sys.argv
STAGE = sys.argv[sys.argv.index('--stage') + 1] if '--stage' in sys.argv else 'all'


def argv_val(flag, default):
    return sys.argv[sys.argv.index(flag) + 1] if flag in sys.argv else default


BUILD = argv_val('--build-dir', f'{ROOT}/output/build/' + ('v6-dryrun' if DRY else 'v6'))
FINAL = argv_val('--out', f'{ROOT}/output/eniac-kiosk-v6-DRYRUN.mp4' if DRY else f'{ROOT}/output/eniac-kiosk-v6.mp4')
if not DRY and 'DRYRUN' in FINAL:
    sys.exit('--out names a DRYRUN file in a non-dry run')
SBP = f'{BUILD}/storyboard-data.v6.json'
if not os.path.exists(SBP):
    sys.exit(f'missing {SBP}: run scripts/gen_storyboard_v6.py {"--dry-run" if DRY else ""} first')
SB = json.load(open(SBP))
assert str(SB['version']).startswith('6'), SB['version']
if SB['provisional'] and not DRY:
    sys.exit('storyboard data is from a dry run; regenerate without --dry-run')
if DRY and not SB['provisional']:
    sys.exit('refusing: --dry-run assembly of non-provisional data would be written to the DRYRUN name')

UNITS = f'{BUILD}/units'
AUD = f'{BUILD}/audio'
TXT = f'{BUILD}/text'
IMG = f'{BUILD}/img'
for d in (UNITS, AUD, TXT, IMG):
    os.makedirs(d, exist_ok=True)

FPS = 25
W, H = 1920, 1080
SR = 48000
MUSIC = f'{ROOT}/{SB["config"]["music"]}'
PH = f'{ROOT}/assets/images/photos'
V5_INTRO = f'{ROOT}/output/build/v5/intro25.mp4'
V2_INTRO = f'{ROOT}/output/build/v2/intro25.mp4'
INTRO_SRC = f'{ROOT}/output/build/intro/vcf_intro_eniac_8s.mp4'
INTRO_FRAMES = 203
INTRO_DUR = INTRO_FRAMES / 25.0  # 8.12 s

GEO_B = '/System/Library/Fonts/Supplemental/Georgia Bold.ttf'
ARI = '/System/Library/Fonts/Supplemental/Arial.ttf'
ARI_B = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
AMBER = '0xE8A33D'
NAVY = '0x14263F'


def fr(s):
    return round(s * FPS) / FPS


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        print(' '.join(cmd)[:600])
        print(r.stderr[-3000:])
        raise SystemExit(f'ffmpeg failed ({r.returncode})')
    return r


def ffmpeg(args):
    return run([FF, '-hide_banner', '-y', '-loglevel', 'error'] + args)


def tw(text, font, size):
    return ImageFont.truetype(font, size).getlength(text)


# --------------------------------------------------------------------------- timeline (from the JSON)
UNIT_ORDER = [u['unit'] for u in SB['units']]
DUR = {u['unit']: fr(u['dur']) for u in SB['units']}
OV = {u['unit']: u['crossfade_out'] for u in SB['units']}
for k, v in SB['subunits'].items():
    DUR[k] = fr(v['dur'])
CUT = {k: (v[0], v[1], v[2]) for k, v in SB['cuts'].items()}
for k, v in CUT.items():
    assert re.search(r'/assets/video/source-v6/', v[0]) or SB['config']['src'] in v[0], v[0]
    assert not re.search(r'source-v[345]/|/video/source/', v[0]), f'old kiosk clip in the cut list: {v[0]}'
OVL = SB['overlays']
PS = {}
t = 0.0
for u in UNIT_ORDER:
    PS[u] = fr(t)
    ju = next(x for x in SB['units'] if x['unit'] == u)
    assert abs(PS[u] - ju['program_in']) < 0.011, (u, PS[u], ju['program_in'])
    t = PS[u] + DUR[u] - OV[u]
PS['I'] = PS['IJ']
PS['J'] = fr(PS['IJ'] + DUR['I'])
PS['N'] = PS['NO']
PS['O'] = fr(PS['NO'] + DUR['N'])
TOTAL = fr(PS['P'] + DUR['P'])
assert abs(TOTAL - SB['program_total_s']) < 0.011, (TOTAL, SB['program_total_s'])
S05_TAG_PROG = PS['B'] + OVL['B']['header_tag']['tin']


def right_edge_ok(o):
    assert o['right'] <= 1175 or o['text'] == 'Explore ENIAC', o


# --------------------------------------------------------------------------- overlays (v5 styling)
def lt_chapter(n, title, tin, tout, y=104):
    w = max(tw(title, ARI_B, 40), tw(f'CHAPTER {n}', ARI_B, 22)) + 56
    return dict(tin=tin, tout=tout, rise=16, ops=[
        ('box', 60, y, w, 96, 'black@0.7'),
        ('box', 60, y, 7, 96, AMBER),
        ('text', f'CHAPTER {n}', 86, y + 10, 22, ARI_B, AMBER),
        ('text', title, 86, y + 38, 40, ARI_B, 'white'),
    ])


def lt_person(name, sub, tin, tout, y=60, alpha=0.62):
    w = max(tw(name, ARI_B, 44), tw(sub, ARI, 26)) + 56
    return dict(tin=tin, tout=tout, rise=16, ops=[
        ('box', 60, y, w, 118, f'black@{alpha}'),
        ('box', 60, y, 7, 118, AMBER),
        ('text', name, 86, y + 10, 44, ARI_B, 'white'),
        ('text', sub, 86, y + 68, 26, ARI, '0xDDDDDD'),
    ])


def tag_hdr(text, tin, tout, x_right=1580, y=17, size=26, label=None):
    """Compact tag in the empty gap of the kiosk header bar (y 0-95), right-aligned to x_right."""
    ops = []
    w = tw(text, ARI_B, size) + 52
    if label:
        w += tw(label, ARI_B, 18) + 22
    x = x_right - w
    ops += [('box', x, y, w, 62, 'black@0.8'), ('box', x + w - 7, y, 7, 62, AMBER)]
    tx = x + 24
    if label:
        ops.append(('text', label, tx, y + 22, 18, ARI_B, AMBER))
        tx += tw(label, ARI_B, 18) + 22
    ops.append(('text', text, tx, y + 17, size, ARI_B, 'white'))
    return dict(tin=tin, tout=tout, rise=0, ops=ops)


def tag_col(label, lines, tin, tout, x=1434, y=455, w=446, h=140, size=25):
    """Two-line tag in the trajectory right column (box x1434-1880, y455-595)."""
    ops = [('box', x, y, w, h, 'black@0.8'), ('box', x + w - 7, y, 7, h, AMBER),
           ('text', label, x + 22, y + 14, 20, ARI_B, AMBER)]
    for k, ln in enumerate(lines):
        assert tw(ln, ARI_B, size) < w - 22 - 7 - 14, ln
        ops.append(('text', ln, x + 22, y + 44 + k * 38, size, ARI_B, 'white'))
    return dict(tin=tin, tout=tout, rise=0, ops=ops)


def credit(text, tin, tout, side='r'):
    w = tw(text, ARI, 24)
    x = W - 56 - w if side == 'r' else 56
    return dict(tin=tin, tout=tout, rise=0, ops=[
        ('box', x - 14, 1026, w + 28, 38, 'black@0.5'),
        ('text', text, x, 1032, 24, ARI, 'white'),
    ])


def center_text(text, y, size, font, color, tin, tout, rise=22):
    x = (W - tw(text, font, size)) / 2
    return dict(tin=tin, tout=tout, rise=rise, ops=[('text', text, x, y, size, font, color)])


def card_layers(n, title, dur):
    L = []
    L.append(center_text('C H A P T E R   ' + str(n), 380, 34, ARI_B, AMBER, 0.15, dur, 14))
    L.append(center_text(title, 440, 104, GEO_B, 'white', 0.15, dur, 20))
    lw = 180
    L.append(dict(tin=0.3, tout=dur, rise=0, ops=[('box', (W - lw) / 2, 600, lw, 5, AMBER)]))
    return L


_A, _B, _E, _G, _J, _K, _P = (OVL.get(k, {}) for k in 'ABEGJKP')
_k = _K['column_tag']
assert 'reconstruction' in ' '.join(_k['lines']) and 'recreation' not in ' '.join(_k['lines']).lower()
right_edge_ok(_B['header_tag'])
for _o in _J['header_tags']:
    right_edge_ok(_o)

LAYERS = {
    'A': [
        credit(_A['credit']['text'], _A['credit']['tin'], _A['credit']['tout'], 'r'),
        lt_person(_A['lower_third']['text'], _A['lower_third']['sub'], _A['lower_third']['tin'], _A['lower_third']['tout']),
        # chapter 1 lives on the opening photo: the kiosk screen after it has no clear space
        lt_chapter(_A['chapter_lt']['n'], _A['chapter_lt']['title'], _A['chapter_lt']['tin'], _A['chapter_lt']['tout']),
    ],
    'B': [tag_hdr(_B['header_tag']['text'], _B['header_tag']['tin'], _B['header_tag']['tout'], x_right=_B['header_tag']['right'],
                  label=_B['header_tag']['label'])],
    'B2': [],
    'U': [],
    'C': card_layers(3, 'Keeping ENIAC alive', DUR['C']),
    'D': [],
    'E': [credit(_E['credit']['text'], _E['credit']['tin'], _E['credit']['tout'], _E['credit']['side'])],
    'F': card_layers(4, 'The first programmers', DUR['F']),
    'G': [credit(_G['credit']['text'].replace(' \u00b7 ', '  \u00b7  '), _G['credit']['tin'], _G['credit']['tout'], _G['credit']['side'])],
    'H': card_layers(5, 'Mission 1: Squares', DUR['H']),
    'I': [],
    'J': [tag_hdr(o['text'], o['tin'], o['tout'], x_right=o['right'], label=o['label']) for o in _J['header_tags']],
    'K': [tag_col(_k['label'], _k['lines'], _k['tin'], _k['tout'], size=_k['size'])],
    'L': [
        dict(tin=0.3, tout=DUR['L'], rise=0, ops=[('box', 0, 350, W, 330, 'black@0.5')]),
        center_text('Live, card by card. Only at the museum.', 400, 84, GEO_B, 'white', 0.4, DUR['L'], 24),
        center_text('Vintage Computer Federation  \u00b7  InfoAge, Wall, NJ', 540, 40, ARI, '0xE6E6E6', 1.2, DUR['L'], 14),
    ],
    'M': card_layers(7, 'The finale', DUR['M']),
    'N': [],
    'O': [],  # no Stuart lower third (v2 decision)
    'P': [
        center_text('Come program ENIAC in person', 250, 92, GEO_B, 'white', 0.5, DUR['P'], 22),
        center_text('Vintage Computer Federation', 420, 46, ARI_B, '0xE6E6E6', 2.0, DUR['P'], 14),
        center_text('InfoAge Science and History Museums  \u00b7  Wall, New Jersey', 490, 40, ARI, '0xE6E6E6', 2.0, DUR['P'], 14),
        center_text('vcfed.org', 640, 112, GEO_B, AMBER, _P['url_tin'], DUR['P'], 20),
    ],
}


def layer_filters(layers, base_label, tag):
    """Each layer is an RGBA colour source with text drawn on it, faded, time-shifted, overlaid on base_label."""
    parts = []
    cur = base_label
    for i, L in enumerate(layers):
        tin, tout = L['tin'], L['tout']
        d = fr(max(0.6, tout - tin))
        ops = []
        for k, op in enumerate(L['ops']):
            if op[0] == 'box':
                _, x, y, w, h, col = op
                ops.append(f'drawbox=x={int(x)}:y={int(y)}:w={int(w)}:h={int(h)}:color={col}:t=fill:replace=1')
            else:
                _, text, x, y, size, font, col = op
                fn = f'{TXT}/{tag}_{i}_{k}.txt'
                with open(fn, 'w') as f:
                    f.write(text)
                ops.append(f"drawtext=fontfile='{font}':textfile='{fn}':fontsize={size}:fontcolor={col}:"
                           f"x={int(x)}:y={int(y)}:shadowcolor=black@0.75:shadowx=2:shadowy=2")
        fi = min(0.35, d / 3)
        chain = (f'color=c=black@0:s={W}x{H}:r={FPS}:d={d},format=rgba,' + ','.join(ops) +
                 f',fade=t=in:st=0:d={fi}:alpha=1,fade=t=out:st={d - fi:.3f}:d={fi}:alpha=1,setpts=PTS+{tin}/TB[{tag}L{i}]')
        parts.append(chain)
        rise = L.get('rise', 0)
        ypos = f"'{rise}*max(0,1-(t-{tin})/0.45)'" if rise else '0'
        nxt = f'{tag}b{i}'
        parts.append(f'[{cur}][{tag}L{i}]overlay=x=0:y={ypos}:format=auto:eof_action=pass:repeatlast=0[{nxt}]')
        cur = nxt
    return parts, cur


# --------------------------------------------------------------------------- stills
def prep_images():
    def ff_img(src, out, vf, extra_in=None):
        if os.path.exists(out) and not FORCE:
            return
        ffmpeg((extra_in or []) + ['-i', src, '-vf', vf, '-frames:v', '1', out])

    photos = {'P1': f'{PH}/P1-beck-snyder-eniac.jpg', 'P2': f'{PH}/P2-changing-a-tube-clean.jpg',
              'P3': f'{PH}/P3-two-women-operating-eniac.jpg'}
    info = {}
    for k, p in photos.items():
        r = run([FFP, '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', p])
        w, h = map(int, r.stdout.strip().split(','))
        fw = int(round(w * H / h / 2) * 2)
        info[k] = fw
        ff_img(p, f'{IMG}/{k}-bg.png',
               f'scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},gblur=sigma=28,eq=brightness=-0.22')
        ff_img(p, f'{IMG}/{k}-fg.png', f'scale={fw * 2}:{H * 2}:flags=lanczos')
    PRIMES, TRAJ, TOUR = (SB['clips'][k]['path'] for k in ('primes', 'trajectory', 'tour'))
    # L: split background = primes freeze at the end of J | trajectory freeze ("Landed") at the end of K
    j_end = CUT['J'][2] - 0.02
    k_end = CUT['K'][2] - 0.10
    out = f'{IMG}/split.png'
    if not os.path.exists(out) or FORCE:
        ffmpeg(['-ss', f'{j_end:.2f}', '-i', PRIMES, '-ss', f'{k_end:.2f}', '-i', TRAJ, '-filter_complex',
                f'[0:v]crop=960:1080:480:0[a];[1:v]crop=960:1080:480:0[b];[a][b]hstack,gblur=sigma=5,lutyuv=y=val*0.7,'
                f'drawbox=x=958:y=0:w=4:h=1080:color={AMBER}:t=fill', '-frames:v', '1', out])
    # P: blurred freeze of the live attract room (v5: tour at 30.0 = B in + 18.52)
    out = f'{IMG}/s20-bg.png'
    if not os.path.exists(out) or FORCE:
        ffmpeg(['-ss', f'{CUT["B"][1] + 18.52:.2f}', '-i', TOUR, '-vf', 'gblur=sigma=22,lutyuv=y=val*0.45', '-frames:v', '1', out])
    return info


# --------------------------------------------------------------------------- units
def enc_args():
    return ['-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', str(FPS),
            '-g', '50', '-bf', '2', '-profile:v', 'high']


def photo_graph(fw, d, inp_bg, inp_fg, zoom0, dz, pan, label):
    n = int(round(d * FPS))
    xexpr = f"(iw-iw/zoom)*on/{n}" if pan else "iw/2-iw/zoom/2"
    return [
        f"[{inp_fg}:v]zoompan=z='{zoom0}+{dz}*on/{n}':x='{xexpr}':y='ih/2-ih/zoom/2':d={n}:s={fw}x{H}:fps={FPS}[{label}z]",
        f"[{inp_bg}:v]fps={FPS},format=yuv420p[{label}bg]",
        f"[{label}bg][{label}z]overlay=x=(W-w)/2:y=0:shortest=1[{label}]",
    ]


def render_unit(name, info):
    out = f'{UNITS}/{name}.mp4'
    if os.path.exists(out) and not FORCE:
        return out
    d = DUR[name]
    inputs = []
    g = []
    base = None
    layers = LAYERS.get(name, [])

    if name == 'A':
        inputs += ['-loop', '1', '-framerate', str(FPS), '-t', f'{d:.3f}', '-i', f'{IMG}/P1-bg.png', '-i', f'{IMG}/P1-fg.png']
        g += photo_graph(info['P1'], d, 0, 1, 1.0, 0.10, True, 'ph')
        base = 'ph'
    elif name in ('B', 'B2', 'D', 'E', 'G'):
        spec = CUT[name]
        inputs += ['-ss', f'{spec[1]}', '-t', f'{d:.3f}', '-i', spec[0]]
        g.append(f'[0:v]setpts=PTS-STARTPTS,fps={FPS},scale={W}:{H},format=yuv420p[src]')
        base = 'src'
        cw = OVL.get(name, {}).get('cutaway')
        if cw:
            pk, off = cw['photo'], cw['tin']
            cd = fr(cw['tout'] - off)
            z0, dz, pan = (1.0, 0.07, False) if name == 'E' else (1.0, 0.09, False)
            inputs += ['-loop', '1', '-framerate', str(FPS), '-t', f'{cd:.3f}', '-i', f'{IMG}/{pk}-bg.png', '-i', f'{IMG}/{pk}-fg.png']
            g += photo_graph(info[pk], cd, 1, 2, z0, dz, pan, 'cp')
            fi = 0.4
            fo = f',fade=t=out:st={cd - fi:.3f}:d={fi}:alpha=1' if name == 'E' else ''
            g.append(f'[cp]format=yuva420p,fade=t=in:st=0:d={fi}:alpha=1{fo},setpts=PTS+{off}/TB[cpa]')
            g.append('[src][cpa]overlay=x=0:y=0:format=auto:eof_action=pass:repeatlast=0[srcc]')
            base = 'srcc'
    elif name == 'U':
        inputs += ['-ss', f'{CUT["U"][1]}', '-t', f'{d:.3f}', '-i', CUT['U'][0]]
        g.append(f'[0:v]setpts=PTS-STARTPTS,fps={FPS},scale={W}:{H},format=yuv420p[src]')
        base = 'src'
    elif name == 'IJ':
        raise RuntimeError('IJ is built from I and J')
    elif name in ('I', 'J', 'K', 'N', 'O'):
        src_len = CUT[name][2] - CUT[name][1]
        take = min(d, src_len)
        inputs += ['-ss', f'{CUT[name][1]}', '-t', f'{take:.3f}', '-i', CUT[name][0]]
        extra = ''
        if d - take > 0.02:      # footage runs out before the unit does: hold the last frame (muted footage only)
            extra = f',tpad=stop_mode=clone:stop_duration={d - take:.3f}'
        g.append(f'[0:v]setpts=PTS-STARTPTS,fps={FPS},scale={W}:{H},format=yuv420p{extra}[src]')
        base = 'src'
    elif name in ('C', 'F', 'H', 'M'):
        g.append(f'color=c={NAVY}:s={W}x{H}:r={FPS}:d={d},format=yuv420p,vignette=PI/3.2:eval=init[card]')
        base = 'card'
    elif name == 'L':
        inputs += ['-loop', '1', '-framerate', str(FPS), '-t', f'{d:.3f}', '-i', f'{IMG}/split.png']
        g.append(f'[0:v]fps={FPS},format=yuv420p[card]')
        base = 'card'
    elif name == 'P':
        inputs += ['-loop', '1', '-framerate', str(FPS), '-t', f'{d:.3f}', '-i', f'{IMG}/s20-bg.png']
        g.append(f'[0:v]fps={FPS},format=yuv420p[card]')
        base = 'card'
    else:
        raise RuntimeError(name)

    parts, last = layer_filters(layers, base, name)
    g += parts
    g.append(f'[{last}]trim=duration={d:.3f},setpts=PTS-STARTPTS,format=yuv420p[vout]')
    script = f'{BUILD}/fg_{name}.txt'
    with open(script, 'w') as f:
        f.write(';\n'.join(g))
    ffmpeg(inputs + ['-filter_complex_script', script, '-map', '[vout]', '-frames:v', str(int(round(d * FPS)))] + enc_args() + [out])
    return out


def build_units():
    info = prep_images()
    for n in ['A', 'B', 'B2', 'U', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P']:
        p = f'{UNITS}/{n}.mp4'
        existed = os.path.exists(p) and not FORCE
        render_unit(n, info)
        print(('cached ' if existed else 'built  ') + n, flush=True)
    for merged, parts in (('IJ', ['I', 'J']), ('NO', ['N', 'O'])):
        out = f'{UNITS}/{merged}.mp4'
        if os.path.exists(out) and not FORCE:
            continue
        lst = f'{BUILD}/concat_{merged}.txt'
        with open(lst, 'w') as f:
            for p in parts:
                f.write(f"file '{UNITS}/{p}.mp4'\n")
        ffmpeg(['-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', out])


# --------------------------------------------------------------------------- audio
def load(path, ss=None, t=None, fade=0.04):
    """Decode to 48k stereo float with short fades at both edges."""
    af = [f'afade=t=in:st=0:d={fade}']
    if t is not None:
        af.append(f'afade=t=out:st={t - fade:.3f}:d={fade}')
    args = []
    if ss is not None:
        args += ['-ss', f'{ss}']
    if t is not None:
        args += ['-t', f'{t:.4f}']
    tmp = f'{AUD}/_tmp.wav'
    ffmpeg(args + ['-i', path, '-af', ','.join(af), '-ac', '2', '-ar', str(SR), '-c:a', 'pcm_f32le', tmp])
    x, _sr = sf.read(tmp, dtype='float32')
    return x


def voice_events():
    """(program_time, path, ss, t, label, fade). Baked units: the clip's own audio if it has exactly one audio stream
    (v5 behaviour), else the located per-line WAVs."""
    ev = []
    CHECK_IV.clear()
    for e in SB['voice_events']:
        u = e['unit']
        pt = PS[u] + e['offset']
        assert abs(pt - e['program_t']) < 0.011, (e, pt)
        if e['kind'] == 'baked':
            ci = SB['clips'][e['clip']]
            if ci['audio_streams'] == 1:
                for ln in e['lines']:   # overlap check per spoken line (unit windows overlap in the crossfades, in silence)
                    CHECK_IV.append((PS[u] + ln['start_in_unit'], PS[u] + ln['start_in_unit'] + ln['dur'], ln['id']))
                fade = 0.008 if u == 'I' else 0.04
                ev.append((pt, e['path'], e['ss'], e['t'], e['label'], fade, False))
            else:
                for ln in e['lines']:
                    ev.append((PS[u] + ln['start_in_unit'], ln['wav'], None, None, ln['id'] + ' (wav)', 0.01, True))
        else:
            ev.append((pt, e['path'], e['ss'], e['t'], e['label'], 0.04 if e['t'] is not None else 0.02, True))
    return ev


CHECK_IV = []
STAGE_AUDIO_MODE_LINES = True


def smooth_db(target, attack, release, rate):
    """Asymmetric one-pole smoother on a dB curve: fast when going down (duck), slower coming up."""
    out = np.empty_like(target)
    y = target[0]
    ka = math.exp(-1.0 / (attack * rate))
    kr = math.exp(-1.0 / (release * rate))
    for i, v in enumerate(target):
        k = ka if v < y else kr
        y = k * y + (1 - k) * v
        out[i] = y
    return out


def build_audio():
    n_total = int(round(TOTAL * SR))
    voice = np.zeros((n_total + SR * 2, 2), dtype=np.float32)
    intervals = []
    for (pt, path, ss, t, label, fade, chk) in voice_events():
        x = load(path, ss, t, fade=fade)
        s = int(round(pt * SR))
        voice[s:s + len(x)] += x
        if chk:      # standalone and per-line events; audio-mode unit windows are checked per line below
            intervals.append((pt, pt + len(x) / SR, label))
    if STAGE_AUDIO_MODE_LINES:
        intervals += CHECK_IV
    intervals.sort()
    print('voice events:')
    worst = 9.0
    for k, (a, b, l) in enumerate(intervals):
        gap = (a - intervals[k - 1][1]) if k else 9.0
        worst = min(worst, gap)
        flag = '   <-- OVERLAP' if gap < -0.02 else ('   (tight)' if gap < 0.1 else '')
        print(f'  {a:8.2f} - {b:8.2f}  {l}  gap {gap:5.2f}{flag}')
    if worst < -0.02:
        raise SystemExit('voice events overlap: a line is longer than the slot it was recorded/placed for')
    if intervals[-1][1] > TOTAL:
        raise SystemExit(f'last voice line ends at {intervals[-1][1]:.2f} s, after the program end {TOTAL:.2f} s')
    voice = voice[:n_total]
    sf.write(f'{AUD}/voice.wav', voice, SR, subtype='FLOAT')

    # --- voice-activity mask at 100 Hz
    hop = SR // 100
    mono = voice.mean(axis=1)
    nfr = n_total // hop
    rms = np.sqrt(np.mean(mono[:nfr * hop].reshape(nfr, hop) ** 2, axis=1) + 1e-12)
    act = rms > 10 ** (-52 / 20)
    gap = int(1.5 * 100)          # bridge gaps < 1.5 s (no pumping between words / sentences)
    idx = np.where(act)[0]
    mask = np.zeros(nfr, dtype=bool)
    for a, b in zip(idx[:-1], idx[1:]):
        if 1 < b - a <= gap:
            mask[a:b] = True
    mask[idx] = True
    lead = int(0.3 * 100)         # lead the duck by 0.3 s
    m2 = mask.copy()
    for i in np.where(mask)[0]:
        m2[max(0, i - lead):i + 1] = True
    mask = m2

    # --- cue levels (dB gain on the bed, whose reference level is about -17 LUFS): unchanged from v5
    DUCK = -23.0     # under voice
    GAP = -14.0      # lamp-play pauses and long gaps (>1.5 s)
    CARD = -9.0      # chapter cards without voice
    TITLE = -5.0
    UP = -6.0
    AFTER = -7.0     # close card after the last word (v5b has no end screen, so no END cue)
    target = np.full(nfr, GAP, dtype=np.float64)
    tt = np.arange(nfr) / 100.0

    def setrange(a, b, v):
        target[(tt >= a) & (tt < b)] = v

    for u in ('C', 'F', 'H', 'M'):
        setrange(PS[u], PS[u] + DUR[u], CARD)
    setrange(PS['U'], PS['U'] + DUR['U'], UP)   # S05b: feature moment, no voice, bed raised
    setrange(0, 0.3, TITLE)
    setrange(PS['P'] + _P['duck_end'], TOTAL, AFTER)
    target[mask] = DUCK
    env = smooth_db(target, attack=0.25, release=0.7, rate=100.0)
    env_a = np.interp(np.arange(n_total) / SR, tt, env)
    gain = 10 ** (env_a / 20.0)
    fo = np.ones(n_total)
    nf = 3 * SR
    fo[-nf:] = np.linspace(1, 0, nf) ** 1.5     # bed fades out over the last 3 s
    mus, sr = sf.read(MUSIC, dtype='float32')
    assert sr == SR
    first = int(np.argmax(np.abs(mus).max(axis=1) > 1e-4))   # bed has ~1.5 s digital silence up front
    mus = mus[first:].copy()
    nfi = int(0.4 * SR)
    mus[:nfi] *= np.linspace(0, 1, nfi)[:, None].astype(np.float32)
    if len(mus) < n_total:
        raise SystemExit(f'music bed is {len(mus) / SR:.1f} s, program {TOTAL:.1f} s: extend swing-bed-v5.wav (do not loop silently)')
    mus = mus[:n_total]
    mus = mus * (gain * fo)[:, None].astype(np.float32)
    sf.write(f'{AUD}/music-ducked.wav', mus, SR, subtype='FLOAT')
    mix = voice + mus
    sf.write(f'{AUD}/mix-raw.wav', mix, SR, subtype='FLOAT')
    master(f'{AUD}/mix-raw.wav', f'{AUD}/master.wav')
    json.dump({'PS': PS, 'DUR': DUR, 'TOTAL': TOTAL, 'INTRO': INTRO_DUR, 'EXPECTED_TOTAL_WITH_INTRO': round(INTRO_DUR + TOTAL, 3),
               'FINAL': FINAL, 'DRY': DRY, 'chapters': SB['youtube_chapters']}, open(f'{BUILD}/timeline.json', 'w'), indent=1)


def measure(path):
    r = subprocess.run([FF, '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True)
    s = r.stderr
    summ = s[s.rfind('Summary:'):]
    mi = re.search(r'I:\s+(-?[\d.]+) LUFS', summ)
    mp = re.search(r'Peak:\s+(-?[\d.]+) dBFS', summ)
    if mi is None or mp is None:
        raise SystemExit('ebur128 summary not found in ffmpeg output for ' + path)
    i = float(mi.group(1))
    tp = float(mp.group(1))
    return i, tp


def master(src, dst, target=-14.0, tp_lim=-2.7):
    i0, _ = measure(src)
    gain_db = target - i0
    for it in range(5):
        lim = 10 ** (tp_lim / 20)
        ffmpeg(['-i', src, '-af', f'volume={gain_db:.3f}dB,alimiter=limit={lim:.4f}:attack=3:release=60:level=disabled,aresample={SR}',
                '-c:a', 'pcm_f32le', dst])
        i1, tp = measure(dst)
        print(f'master iter {it}: gain {gain_db:+.2f} dB -> {i1:.2f} LUFS, TP {tp:.2f} dBTP', flush=True)
        # pre-AAC true peak must leave ~0.4 dB for the AAC encode so the FILE stays <= -1.5 dBTP
        if abs(i1 - target) <= 0.15 and tp <= -2.2:
            break
        gain_db += target - i1
        if tp > -2.2:
            tp_lim -= 0.3


# --------------------------------------------------------------------------- final
def prep_intro():
    """Intro -> 25 fps video (exactly INTRO_FRAMES frames) + audio loudnormed to -15 LUFS / -1.5 dBTP (two-pass, linear)."""
    vid = f'{BUILD}/intro25.mp4'
    for cand in (V5_INTRO, V2_INTRO):
        if os.path.exists(cand) and not os.path.exists(vid):
            n = subprocess.run([FFP, '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries',
                                'stream=nb_read_frames,r_frame_rate', '-of', 'csv=p=0', cand], capture_output=True, text=True).stdout.strip()
            if n == f'25/1,{INTRO_FRAMES}':
                shutil.copy(cand, vid)
    wav = f'{AUD}/intro-norm.wav'
    if not os.path.exists(vid):
        ffmpeg(['-i', INTRO_SRC, '-vf', f'fps={FPS},tpad=stop_mode=clone:stop_duration=1,format=yuv420p', '-frames:v', str(INTRO_FRAMES),
                '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-g', '50',
                '-profile:v', 'high', vid])
    tgt = 'I=-15:TP=-1.5:LRA=11'
    r = subprocess.run([FF, '-hide_banner', '-nostats', '-i', INTRO_SRC, '-vn', '-af', f'loudnorm={tgt}:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True)
    m = json.loads(r.stderr[r.stderr.rfind('{'):r.stderr.rfind('}') + 1])
    ln = (f"loudnorm={tgt}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
          f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    ffmpeg(['-i', INTRO_SRC, '-vn', '-af', f'{ln},aresample={SR},apad,atrim=0:{INTRO_DUR:.4f}', '-ac', '2', '-c:a', 'pcm_f32le', wav])
    print('intro audio:', measure(wav))
    return vid, wav


def build_final():
    order = UNIT_ORDER
    ivid, iwav = prep_intro()
    a_i, _ = sf.read(iwav, dtype='float32')
    a_m, _ = sf.read(f'{AUD}/master.wav', dtype='float32')
    a_i = a_i[:int(round(INTRO_DUR * SR))]
    full = np.vstack([a_i, a_m])
    sf.write(f'{AUD}/final-mix.wav', full, SR, subtype='FLOAT')
    total = INTRO_DUR + TOTAL
    fade = _P['end_fade']
    cmd = ['-i', ivid]
    for u in order:
        cmd += ['-i', f'{UNITS}/{u}.mp4']
    cmd += ['-i', f'{AUD}/final-mix.wav']
    g = [f'[0:v]settb=AVTB,fps={FPS},format=yuv420p[vi]']
    for k, u in enumerate(order):
        g.append(f'[{k + 1}:v]settb=AVTB,fps={FPS},format=yuv420p[v{k}]')
    cur = 'v0'
    for k in range(1, len(order)):
        prev = order[k - 1]
        ov = OV[prev]
        off = PS[order[k]]
        if ov <= 0:
            raise RuntimeError('straight cuts are pre-merged')
        g.append(f'[{cur}][v{k}]xfade=transition=fade:duration={ov}:offset={off:.3f}[x{k}]')
        cur = f'x{k}'
    g.append(f'[{cur}]settb=AVTB,fps={FPS},format=yuv420p[main]')
    g.append('[vi][main]concat=n=2:v=1:a=0,format=yuv420p[vcat]')
    g.append(f'[vcat]fade=t=out:st={total - fade:.3f}:d={fade}[vout]')      # v5b: 1.2 s fade at the very end
    g.append(f'[{len(order) + 1}:a]afade=t=out:st={total - fade:.3f}:d={fade}[aout]')
    script = f'{BUILD}/fg_final.txt'
    open(script, 'w').write(';\n'.join(g))
    ffmpeg(cmd + ['-filter_complex_script', script, '-map', '[vout]', '-map', '[aout]',
                  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high', '-level', '4.2',
                  '-pix_fmt', 'yuv420p', '-r', str(FPS), '-g', '50', '-bf', '2',
                  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
                  '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709',
                  '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2',
                  '-t', f'{total:.3f}', '-movflags', '+faststart', FINAL])
    chapters = [(y['n'], y['title'], y['t']) for y in SB['youtube_chapters']]
    txt = ''.join(f"{int(t_ // 60)}:{int(t_ % 60):02d} {ti}\n" for _, ti, t_ in chapters)
    open(f'{BUILD}/chapters.txt', 'w').write(txt)
    if not DRY:
        os.makedirs(f'{ROOT}/output/upload', exist_ok=True)
        open(f'{ROOT}/output/upload/chapters-v6.txt', 'w').write(txt)
    print('YouTube chapters (intro offset %.2f s):' % INTRO_DUR)
    print(txt)
    i, tp = measure(FINAL)
    print(f'final: {FINAL}: {i:.2f} LUFS, TP {tp:.2f} dBTP')


if __name__ == '__main__':
    print(f'MODE {"DRY RUN (provisional clips)" if DRY else "FINAL"}   build {BUILD}   out {FINAL}')
    print(f'program timeline: total {TOTAL:.2f}s (+ intro {INTRO_DUR:.2f} = {TOTAL + INTRO_DUR:.2f}s)')
    for u in UNIT_ORDER:
        print(f'  {u:3s} start {PS[u]:8.2f}  dur {DUR[u]:7.2f}')
    if STAGE in ('units', 'all'):
        build_units()
    if STAGE in ('audio', 'all'):
        build_audio()
    if STAGE in ('final', 'all'):
        build_final()
