#!/usr/bin/env python3
"""Assemble output/eniac-kiosk-v5.mp4 (VCF intro + main program) from storyboard/storyboard-data.json (v5).

v5: + S05a (B2, tour 114.00-126.40) and S05b (U, original-ui-tour 26.64-41.64 conformed 30->25 fps, music only, bed raised);
S12 incl. 'See the whole room'; generic finale; extended music bed swing-bed-v5.wav.

v4: v3 + footage re-recorded WITHOUT the caption box (source-v5); S15 freezes primes 111.84 / traj 140.82 (Landed); S20 tour 30.0.
v3: re-recorded kiosk footage (assets/video/source-v5), re-voiced N03/N04/N05, re-timed cuts. Timeline,
cut points and voice events are READ from the v4 JSON; the overlay layout (tags, cards) is built here from
the JSON overlay specs (text / label / tin / tout / right edge) with the v2 styling.

Re-runnable:  python3 scripts/assemble_v5.py [--force] [--stage units|audio|final|all]
Intermediates live in output/build/v5/.
"""
import json, math, os, subprocess, sys, re
import numpy as np
import soundfile as sf
from PIL import ImageFont, Image, ImageDraw

ROOT = '/Users/nickd/Workspaces/eniac-kiosk-youtube'
FF = '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg'
FFP = '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe'
BUILD = f'{ROOT}/output/build/v5'
V2_INTRO = f'{ROOT}/output/build/v2/intro25.mp4'
INTRO_SRC = f'{ROOT}/output/build/intro/vcf_intro_eniac_8s.mp4'
UNITS = f'{BUILD}/units'
AUD = f'{BUILD}/audio'
TXT = f'{BUILD}/text'
IMG = f'{BUILD}/img'
for d in (UNITS, AUD, TXT, IMG):
    os.makedirs(d, exist_ok=True)

FPS = 25
W, H = 1920, 1080
SR = 48000
SRC = f'{ROOT}/assets/video/source-v5'
TOUR = f'{SRC}/eniac-touch-tour.mp4'
SQUARES = f'{SRC}/eniac-touch-walkthrough-squares.mp4'
PRIMES = f'{SRC}/eniac-touch-walkthrough-primes.mp4'
TRAJ = f'{SRC}/eniac-touch-walkthrough-trajectory.mp4'
FINALE = f'{SRC}/finale.mp4'
ORIG = f'{SRC}/original-ui-tour.mp4'
NARR = f'{ROOT}/assets/audio/narration'
LINES = f'{ROOT}/assets/audio/source-lines-v5'
MUSIC = f'{ROOT}/assets/audio/music/swing-bed-v5.wav'
PH = f'{ROOT}/assets/images/photos'
FINAL = f'{ROOT}/output/eniac-kiosk-v5.mp4'
INTRO_FRAMES = 203
INTRO_DUR = INTRO_FRAMES / 25.0  # 8.12 s

GEO_B = '/System/Library/Fonts/Supplemental/Georgia Bold.ttf'
ARI = '/System/Library/Fonts/Supplemental/Arial.ttf'
ARI_B = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
AMBER = '0xE8A33D'
NAVY = '0x14263F'

FORCE = '--force' in sys.argv
STAGE = 'all'
if '--stage' in sys.argv:
    STAGE = sys.argv[sys.argv.index('--stage') + 1]


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


# --------------------------------------------------------------------------- timeline (from the v4 JSON)
SB = json.load(open(f'{ROOT}/storyboard/storyboard-data.json'))
assert str(SB['version']).startswith("5"), SB['version']
UNIT_ORDER = [u['unit'] for u in SB['units']]
DUR = {u['unit']: fr(u['dur']) for u in SB['units']}
OV = {u['unit']: u['crossfade_out'] for u in SB['units']}
SCN = {sc['id']: sc for sc in SB['scenes']}
for sc in SB['scenes']:
    if sc['unit'] in ('I', 'J', 'N', 'O'):   # sub-units of the merged IJ / NO units
        DUR[sc['unit']] = fr(sc['dur'])
CUT = {k: (f'{ROOT}/{v[0]}', v[1], v[2]) for k, v in SB['cuts'].items()}
PS = {}
t = 0.0
for u in UNIT_ORDER:
    PS[u] = fr(t)
    t = PS[u] + DUR[u] - OV[u]
    ju = next(x for x in SB['units'] if x['unit'] == u)
    assert abs(PS[u] - ju['program_in']) < 0.011, (u, PS[u], ju['program_in'])
# sub-unit program starts
PS['I'] = PS['IJ']
PS['J'] = fr(PS['IJ'] + DUR['I'])
PS['N'] = PS['NO']
PS['O'] = fr(PS['NO'] + DUR['N'])
TOTAL = fr(PS['Q'] + DUR['Q'])
assert abs(TOTAL - SB['program_total_s']) < 0.011, (TOTAL, SB['program_total_s'])
EXP_TAG_TIN = next(o for o in SCN['S05']['overlays'] if o['type'] == 'header-tag')['tin']  # Explore chapter tag, inside unit B
S05_TAG_PROG = PS['B'] + EXP_TAG_TIN


def res_t(v, d):
    """JSON tin/tout: number, 'end', or 'end-0.4'."""
    if isinstance(v, (int, float)):
        return float(v)
    return d - (float(v[4:]) if v.startswith('end-') else 0.0)


def json_ov(sid, typ):
    return [o for o in SCN[sid]['overlays'] if o['type'] == typ]


def right_edge(o):
    return int(re.search(r'right edge x(\d+)', o['pos']).group(1))


# --------------------------------------------------------------------------- overlays
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


def tag_right(text, tin, tout, y=60):
    w = tw(text, ARI_B, 30) + 52
    x = W - 60 - w
    return dict(tin=tin, tout=tout, rise=12, ops=[
        ('box', x, y, w, 62, 'black@0.62'),
        ('box', x + w - 7, y, 7, 62, AMBER),
        ('text', text, x + 24, y + 15, 30, ARI_B, 'white'),
    ])


def tag_hdr(text, tin, tout, x_right=1580, y=17, size=26, label=None):
    """Compact tag that lives in the empty gap of the kiosk header bar (y 0-95), right-aligned to x_right."""
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
    big = f'CHAPTER {n}' if n else ''
    ops = []
    L = []
    L.append(center_text('C H A P T E R   ' + str(n), 380, 34, ARI_B, AMBER, 0.15, dur, 14))
    L.append(center_text(title, 440, 104, GEO_B, 'white', 0.15, dur, 20))
    lw = 180
    L.append(dict(tin=0.3, tout=dur, rise=0, ops=[('box', (W - lw) / 2, 600, lw, 5, AMBER)]))
    return L


def hdr_from(o, d):
    assert right_edge(o) <= 1175 or o['text'] == 'Explore ENIAC', o
    return tag_hdr(o['text'], o['tin'], res_t(o['tout'], d), x_right=right_edge(o), label=o.get('label'))


_a = SCN['S02']['overlays']
_cr = json_ov('S02', 'credit')[0]
_lt = json_ov('S02', 'lower-third')[0]
_ch = json_ov('S02', 'chapter-lower-third')[0]
_k = json_ov('S14', 'column-tag')[0]
assert 'reconstruction' in ' '.join(_k['lines']) and 'recreation' not in ' '.join(_k['lines']).lower()
assert not SCN['S05a']['overlays'] and not SCN['S05b']['overlays'] and not SCN['S03']['overlays'] and not SCN['S04']['overlays'] and not SCN['S18']['overlays']

LAYERS = {
    'A': [
        credit(_cr['text'], _cr['tin'], res_t(_cr['tout'], DUR['A']), 'r'),
        lt_person(_lt['text'], _lt['sub'], _lt['tin'], _lt['tout']),
        # chapter 1 lives on the opening photo: the kiosk screen after it has no clear space
        lt_chapter(1, 'Meet the kiosk', _ch['tin'], _ch['tout']),
    ],
    'B': [hdr_from(json_ov('S05', 'header-tag')[0], DUR['B'])],   # S03/S04: no overlays
    'B2': [],
    'U': [],   # S05b: no overlays
    'C': card_layers(3, 'Keeping ENIAC alive', DUR['C']),
    'D': [],
    'E': [credit('U.S. Army Photo', 0.8, 7.2, 'r')],
    'F': card_layers(4, 'The first programmers', DUR['F']),
    'G': [credit(json_ov('S10', 'credit')[0]['text'].replace(' \u00b7 ', '  \u00b7  '), json_ov('S10', 'credit')[0]['tin'],
                 res_t(json_ov('S10', 'credit')[0]['tout'], DUR['G']), 'l')],
    'H': card_layers(5, 'Mission 1: Squares', DUR['H']),
    'I': [],
    'J': [hdr_from(o, DUR['J']) for o in json_ov('S13', 'header-tag')],
    'K': [tag_col(_k['label'], _k['lines'], _k['tin'], res_t(_k['tout'], DUR['K']), size=_k['size'])],
    'L': [
        dict(tin=0.3, tout=DUR['L'], rise=0, ops=[('box', 0, 350, W, 330, 'black@0.5')]),
        center_text('Live, card by card. Only at the museum.', 400, 84, GEO_B, 'white', 0.4, DUR['L'], 24),
        center_text('Vintage Computer Federation  \u00b7  InfoAge, Wall, NJ', 540, 40, ARI, '0xE6E6E6', 1.2, DUR['L'], 14),
    ],
    'M': card_layers(7, 'The finale', DUR['M']),
    'N': [],
    'O': [],  # S18: no Stuart lower third
    'P': [
        center_text('Come program ENIAC in person', 250, 92, GEO_B, 'white', 0.5, DUR['P'], 22),
        center_text('Vintage Computer Federation', 420, 46, ARI_B, '0xE6E6E6', 2.0, DUR['P'], 14),
        center_text('InfoAge Science and History Museums  \u00b7  Wall, New Jersey', 490, 40, ARI, '0xE6E6E6', 2.0, DUR['P'], 14),
        center_text('vcfed.org', 640, 112, GEO_B, AMBER, 0.5 + 12.6, DUR['P'], 20),
    ],
    'Q': [
        center_text('Thanks for watching', 62, 88, GEO_B, 'white', 0.3, DUR['Q'], 16),
        center_text('Vintage Computer Federation  \u00b7  InfoAge Science and History Museums  \u00b7  Wall, NJ  \u00b7  vcfed.org',
                    190, 30, ARI, '0xE6E6E6', 0.6, DUR['Q'], 10),
        center_text('Exhibit by Nick DeMarco, Docent and Exhibit Developer, Vintage Computer Federation',
                    1012, 28, ARI, '0xDDDDDD', 0.8, DUR['Q'], 0),
    ],
}


def layer_filters(layers, base_label, tag):
    """Return (filter chain str, final label). Each layer is an RGBA color source with text drawn on it,
    faded, time-shifted, then overlaid on `base_label`."""
    parts = []
    cur = base_label
    for i, L in enumerate(layers):
        tin, tout = L['tin'], L['tout']
        d = max(0.6, tout - tin)
        d = fr(d)
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
        a = (extra_in or []) + ['-i', src, '-vf', vf, '-frames:v', '1', out]
        ffmpeg(a)

    photos = {
        'P1': f'{PH}/P1-beck-snyder-eniac.jpg',
        'P2': f'{PH}/P2-changing-a-tube-clean.jpg',
        'P3': f'{PH}/P3-two-women-operating-eniac.jpg',
    }
    info = {}
    for k, p in photos.items():
        r = run([FFP, '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', p])
        w, h = map(int, r.stdout.strip().split(','))
        fw = int(round(w * H / h / 2) * 2)
        info[k] = fw
        ff_img(p, f'{IMG}/{k}-bg.png',
               f'scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},gblur=sigma=28,eq=brightness=-0.22')
        ff_img(p, f'{IMG}/{k}-fg.png', f'scale={fw * 2}:{H * 2}:flags=lanczos')
    # S15 split background (primes freeze | trajectory freeze)
    out = f'{IMG}/split.png'
    if not os.path.exists(out) or FORCE:
        ffmpeg(['-ss', '111.90', '-i', PRIMES, '-ss', '140.30', '-i', TRAJ, '-filter_complex',
                f'[0:v]crop=960:1080:480:0[a];[1:v]crop=960:1080:480:0[b];[a][b]hstack,gblur=sigma=5,lutyuv=y=val*0.7,'
                f'drawbox=x=958:y=0:w=4:h=1080:color={AMBER}:t=fill', '-frames:v', '1', out])
    # S20 blurred freeze of the live attract room
    out = f'{IMG}/s20-bg.png'
    if not os.path.exists(out) or FORCE:
        ffmpeg(['-ss', '30.0', '-i', TOUR, '-vf', 'gblur=sigma=22,lutyuv=y=val*0.45', '-frames:v', '1', out])
    # S21 end screen panels (no text; YouTube elements go on top)
    out = f'{IMG}/endscreen.png'
    if not os.path.exists(out) or FORCE:
        im = Image.new('RGB', (W, H), (20, 38, 63))
        dr = ImageDraw.Draw(im, 'RGBA')
        for (x, y, w, h) in [(150, 300, 760, 428), (1010, 300, 760, 428)]:
            dr.rounded_rectangle((x, y, x + w, y + h), 14, fill=(8, 18, 32, 200), outline=(232, 163, 61, 255), width=3)
        dr.ellipse((960 - 110, 870 - 110, 960 + 110, 870 + 110), fill=(8, 18, 32, 200), outline=(232, 163, 61, 255), width=3)
        im.save(out)
    return info


# --------------------------------------------------------------------------- units
def enc_args():
    return ['-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', str(FPS),
            '-g', '50', '-bf', '2', '-profile:v', 'high']


def photo_graph(k, fw, d, inp_bg, inp_fg, zoom0, dz, pan, label):
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

    def add_src(path, ss, t):
        inputs.extend(['-ss', f'{ss}', '-t', f'{t:.3f}', '-i', path])
        return len(inputs and [x for x in inputs if x == '-i']) - 1

    if name == 'A':
        inputs += ['-loop', '1', '-framerate', str(FPS), '-t', f'{d:.3f}', '-i', f'{IMG}/P1-bg.png', '-i', f'{IMG}/P1-fg.png']
        g += photo_graph('P1', info['P1'], d, 0, 1, 1.0, 0.10, True, 'ph')
        base = 'ph'
    elif name in ('B', 'B2', 'D', 'E', 'G'):
        spec = {'B': CUT['B'], 'B2': CUT['B2'], 'D': CUT['D'], 'E': CUT['E'], 'G': CUT['G']}[name]
        inputs += ['-ss', f'{spec[1]}', '-t', f'{d:.3f}', '-i', spec[0]]
        g.append(f'[0:v]setpts=PTS-STARTPTS,fps={FPS},scale={W}:{H},format=yuv420p[src]')
        base = 'src'
        cw = SCN['S08' if name == 'E' else 'S10'].get('cutaway') if name in ('E', 'G') else None
        if cw:
            pk, off = cw['photo'], cw['offset_in']
            cd = fr(cw['offset_out'] - off if name == 'E' else d - off)
            z0, dz, pan = (1.0, 0.07, False) if name == 'E' else (1.0, 0.09, False)
            inputs += ['-loop', '1', '-framerate', str(FPS), '-t', f'{cd:.3f}', '-i', f'{IMG}/{pk}-bg.png', '-i', f'{IMG}/{pk}-fg.png']
            g += photo_graph(pk, info[pk], cd, 1, 2, z0, dz, pan, 'cp')
            fi = 0.4
            fo = f',fade=t=out:st={cd - fi:.3f}:d={fi}:alpha=1' if name == 'E' else ''
            g.append(f'[cp]format=yuva420p,fade=t=in:st=0:d={fi}:alpha=1{fo},setpts=PTS+{off}/TB[cpa]')
            g.append(f'[src][cpa]overlay=x=0:y=0:format=auto:eof_action=pass:repeatlast=0[srcc]')
            base = 'srcc'
    elif name == 'U':
        inputs += ['-ss', f'{CUT["U"][1]}', '-t', f'{d:.3f}', '-i', CUT['U'][0]]
        g.append(f'[0:v]setpts=PTS-STARTPTS,fps={FPS},scale={W}:{H},format=yuv420p[src]')
        base = 'src'
    elif name == 'IJ':
        raise RuntimeError('IJ is built from I and J')
    elif name in ('I', 'J', 'K', 'N', 'O'):
        spec = {
            'I': (CUT['I'][0], CUT['I'][1], d),
            'J': (CUT['J'][0], CUT['J'][1], d),
            'K': (CUT['K'][0], CUT['K'][1], d),
            'N': (CUT['N'][0], CUT['N'][1], d),
            'O': (CUT['O'][0], CUT['O'][1], CUT['O'][2] - CUT['O'][1]),
        }[name]
        inputs += ['-ss', f'{spec[1]}', '-t', f'{spec[2]:.3f}', '-i', spec[0]]
        extra = ''
        if name == 'O':
            extra = f',tpad=stop_mode=clone:stop_duration={d - (CUT['O'][2] - CUT['O'][1]):.3f}'
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
    elif name == 'Q':
        inputs += ['-loop', '1', '-framerate', str(FPS), '-t', f'{d:.3f}', '-i', f'{IMG}/endscreen.png']
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
    for n in ['A', 'B', 'B2', 'U', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q']:
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
    af = []
    if t is not None:
        af.append(f'afade=t=in:st=0:d={fade}')
        af.append(f'afade=t=out:st={t - fade:.3f}:d={fade}')
    else:
        af.append(f'afade=t=in:st=0:d={fade}')
    args = []
    if ss is not None:
        args += ['-ss', f'{ss}']
    if t is not None:
        args += ['-t', f'{t:.4f}']
    tmp = f'{AUD}/_tmp.wav'
    ffmpeg(args + ['-i', path, '-af', ','.join(af), '-ac', '2', '-ar', str(SR), '-c:a', 'pcm_f32le', tmp])
    x, sr = sf.read(tmp, dtype='float32')
    return x


def voice_events():
    ev = []  # (program_time, path, ss, t, label, fade)
    for e in SB['voice_events']:
        pt = fr(PS[e['unit']] + e['offset']) if False else PS[e['unit']] + e['offset']
        assert abs(pt - e['program_t']) < 0.011, (e, pt)
        # 'The Squares in point (15.68) is ~50 ms before the first word: <=10 ms fade there
        fade = 0.008 if e['unit'] == 'I' else (0.04 if e['t'] is not None else 0.02)
        ev.append((pt, f"{ROOT}/{e['path']}", e['ss'], e['t'], e['label'], fade))
    return ev


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
    for (pt, path, ss, t, label, fade) in voice_events():
        x = load(path, ss, t, fade=fade)
        s = int(round(pt * SR))
        voice[s:s + len(x)] += x
        intervals.append((pt, pt + len(x) / SR, label))
    # sanity: voice clips of different sources must not collide in program time except in silence
    print('voice events:')
    for a, b, l in intervals:
        print(f'  {a:8.2f} - {b:8.2f}  {l}')
    voice = voice[:n_total]
    sf.write(f'{AUD}/voice.wav', voice, SR, subtype='FLOAT')

    # --- voice-activity mask at 100 Hz
    hop = SR // 100
    mono = voice.mean(axis=1)
    nfr = n_total // hop
    rms = np.sqrt(np.mean(mono[:nfr * hop].reshape(nfr, hop) ** 2, axis=1) + 1e-12)
    act = rms > 10 ** (-52 / 20)
    # bridge gaps < 1.5 s (no pumping between words / sentences), lead the duck by 0.3 s
    gap = int(1.5 * 100)
    idx = np.where(act)[0]
    mask = np.zeros(nfr, dtype=bool)
    for a, b in zip(idx[:-1], idx[1:]):
        if 1 < b - a <= gap:
            mask[a:b] = True
    mask[idx] = True
    lead = int(0.3 * 100)
    m2 = mask.copy()
    for i in np.where(mask)[0]:
        m2[max(0, i - lead):i + 1] = True
    mask = m2

    # --- cue levels (dB gain on the bed, whose reference level is about -17 LUFS)
    DUCK = -23.0     # under voice: about 20 dB below the narration after mastering
    GAP = -14.0      # lamp-play pauses and long gaps (>1.5 s)
    CARD = -9.0      # chapter cards without voice
    TITLE = -5.0
    UP = -6.0
    END = -4.0
    target = np.full(nfr, GAP, dtype=np.float64)
    tt = np.arange(nfr) / 100.0

    def setrange(a, b, v):
        target[(tt >= a) & (tt < b)] = v

    for u in ('C', 'F', 'H', 'M'):
        setrange(PS[u], PS[u] + DUR[u], CARD)
    setrange(PS['U'], PS['U'] + DUR['U'], UP)   # S05b: feature moment, no voice, bed raised
    setrange(0, 0.3, TITLE)
    setrange(PS['P'] + 0.5 + 16.07 + 0.1, PS['Q'], -7.0)
    setrange(PS['Q'], TOTAL, END)
    target[mask] = DUCK
    # N05 a touch lower (cue sheet: -24 under N05)
    env = smooth_db(target, attack=0.25, release=0.7, rate=100.0)
    # up-sample to audio rate
    env_a = np.interp(np.arange(n_total) / SR, tt, env)
    gain = 10 ** (env_a / 20.0)
    # fade out the bed over the last 3 s
    fo = np.ones(n_total)
    nf = 3 * SR
    fo[-nf:] = np.linspace(1, 0, nf) ** 1.5
    # music: bed from t=0
    mus, sr = sf.read(MUSIC, dtype='float32')
    assert sr == SR
    # the bed has ~1.5 s of digital silence up front; start on the first audible sample, short fade-in
    first = int(np.argmax(np.abs(mus).max(axis=1) > 1e-4))
    mus = mus[first:].copy()
    nfi = int(0.4 * SR)
    mus[:nfi] *= np.linspace(0, 1, nfi)[:, None].astype(np.float32)
    if len(mus) < n_total:
        mus = np.vstack([mus, np.zeros((n_total - len(mus), 2), np.float32)])
    mus = mus[:n_total]
    mus = mus * (gain * fo)[:, None].astype(np.float32)
    sf.write(f'{AUD}/music-ducked.wav', mus, SR, subtype='FLOAT')
    mix = voice + mus
    sf.write(f'{AUD}/mix-raw.wav', mix, SR, subtype='FLOAT')

    # --- master: -14 LUFS, TP <= -1.5 dBTP (iterate gain, peak limiter in front)
    master(f'{AUD}/mix-raw.wav', f'{AUD}/master.wav')
    json.dump({'PS': PS, 'DUR': DUR, 'TOTAL': TOTAL}, open(f'{BUILD}/timeline.json', 'w'), indent=1)


def measure(path):
    r = subprocess.run([FF, '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True)
    s = r.stderr
    summ = s[s.rfind('Summary:'):]
    i = float(re.search(r'I:\s+(-?[\d.]+) LUFS', summ).group(1))
    tp = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', summ).group(1))
    return i, tp


def master(src, dst, target=-14.0, tp_lim=-2.0):
    gain_db = 0.0
    i0, _ = measure(src)
    gain_db = target - i0
    for it in range(5):
        # gain, then a transparent true-peak-safe limiter
        lim = 10 ** (tp_lim / 20)
        ffmpeg(['-i', src, '-af', f'volume={gain_db:.3f}dB,alimiter=limit={lim:.4f}:attack=3:release=60:level=disabled,aresample={SR}',
                '-c:a', 'pcm_f32le', dst])
        i1, tp = measure(dst)
        print(f'master iter {it}: gain {gain_db:+.2f} dB -> {i1:.2f} LUFS, TP {tp:.2f} dBTP', flush=True)
        if abs(i1 - target) <= 0.15:
            break
        gain_db += target - i1


# --------------------------------------------------------------------------- final
def prep_intro():
    """Intro -> 25 fps video (exactly INTRO_FRAMES frames) + audio loudnormed to -15 LUFS / -1.5 dBTP (two-pass, linear)."""
    vid = f'{BUILD}/intro25.mp4'
    if os.path.exists(V2_INTRO) and not os.path.exists(vid):
        n = subprocess.run([FFP, '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames,r_frame_rate', '-of', 'csv=p=0', V2_INTRO], capture_output=True, text=True).stdout.strip()
        if n == f'25/1,{INTRO_FRAMES}':
            import shutil; shutil.copy(V2_INTRO, vid)
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
    # audio = intro + main program master
    a_i, _ = sf.read(iwav, dtype='float32')
    a_m, _ = sf.read(f'{AUD}/master.wav', dtype='float32')
    a_i = a_i[:int(round(INTRO_DUR * SR))]
    full = np.vstack([a_i, a_m])
    sf.write(f'{AUD}/final-mix.wav', full, SR, subtype='FLOAT')
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
    g.append('[vi][main]concat=n=2:v=1:a=0,format=yuv420p[vout]')
    script = f'{BUILD}/fg_final.txt'
    open(script, 'w').write(';\n'.join(g))
    ffmpeg(cmd + ['-filter_complex_script', script, '-map', '[vout]', '-map', f'{len(order) + 1}:a',
                  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-profile:v', 'high', '-level', '4.2',
                  '-pix_fmt', 'yuv420p', '-r', str(FPS), '-g', '50', '-bf', '2',
                  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv', '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709',
                  '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2',
                  '-t', f'{INTRO_DUR + TOTAL:.3f}', '-movflags', '+faststart', FINAL])
    chapters = [(1, 'Meet the kiosk', 0.0), (2, 'Explore ENIAC', S05_TAG_PROG), (3, 'Keeping ENIAC alive', PS['C']),
                (4, 'The first programmers', PS['F']), (5, 'Mission 1: Squares', PS['H']), (6, 'Only at the museum', PS['J']),
                (7, 'The finale', PS['M']), (8, 'Come see it', PS['P'])]
    print('YouTube chapters (intro offset %.2f s):' % INTRO_DUR)
    for n, t_, ts in chapters:
        tt_ = 0.0 if n == 1 else ts + INTRO_DUR
        print(f'  {int(tt_ // 60)}:{int(tt_ % 60):02d}  {t_}   ({tt_:.2f}s)')


if __name__ == '__main__':
    print(f'program timeline: total {TOTAL:.2f}s')
    for u in UNIT_ORDER:
        print(f'  {u:3s} start {PS[u]:8.2f}  dur {DUR[u]:7.2f}')
    if STAGE in ('units', 'all'):
        build_units()
    if STAGE in ('audio', 'all'):
        build_audio()
    if STAGE in ('final', 'all'):
        build_final()
