#!/usr/bin/env python3
"""Assemble the v2 ENIAC kiosk Shorts (1080x1920, 30 fps), beat-locked to Hot Swing at 144 BPM.

  python3 scripts/assemble_short_v2.py --cut 8s-v2     -> output/short-8s-v2.mp4   (8.333 s)
  python3 scripts/assemble_short_v2.py --cut 30s-v2    -> output/short-30s-v2.mp4  (30.000 s)
Options: --audio-only (reuse rendered shots), --video-only, --out PATH.

Spec: storyboard/short-8s.md and storyboard/short-30s.md (v2). v1 cuts stay in scripts/assemble_short.py.
Everything is composed on the 1080x1920 canvas before any push; text, ripples, bloom, dim and the
yellow hit are drawn by FFmpeg; the footage is never sped up or slowed down (count steps are
retimed by trimming or holding a static frame only). Source: assets/video/source-v6 only.
Sound: voice + Hot Swing + one synthesised tap click (30 s only).
"""
import argparse, json, math, os, re, subprocess, sys
import numpy as np
import soundfile as sf
from PIL import ImageFont

ROOT = '/Users/nickd/Workspaces/eniac-kiosk-youtube'
FF = '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg'
SRC = f'{ROOT}/assets/video/source-v6'
MUSIC = f'{ROOT}/assets/audio/music/Hot Swing.mp3'
GEO_B = '/System/Library/Fonts/Supplemental/Georgia Bold.ttf'
FPS, SR, SAFE_W = 30, 44100, 840
BEAT = 60 / 144

ATT = f'{SRC}/attract-tap.mp4'
F2 = f'{SRC}/squares-fullspeed-lamps.mp4'
F2_EVENTS = f'{SRC}/squares-fullspeed-lamps.events.json'
FIN = f'{SRC}/finale.mp4'
PRIMES = f'{SRC}/eniac-touch-walkthrough-primes.mp4'
T_TAP = 24.050                  # attract-tap.events.json: first tap, clip time (s)
T_PICK = 24.408                 # picker 'settled' (clip time)

# ---- music: measured on the ffmpeg-decoded file (see notes): chord attack 46.565 s, hits 45.46 / 46.30,
# section start 18.225. Storyboard values (46.66, 45.56, 46.38, 18.325) are ~0.095 s late.
CHORD_FILE = 46.565

# ---- layers: (crop 'w:h:x:y' or None, out_w, out_h, x, y)
L_ACC8 = ('644:540:722:110', 860, 721, 60, 560)
L_ACC30 = ('644:540:722:110', 860, 721, 60, 600)

CUTS = {
    '8s-v2': dict(
        total=250 / FPS, out='short-8s-v2.mp4', audio=f'{ROOT}/assets/audio/short-8s-v2',
        music_ss=CHORD_FILE - 5.001,
        lines=[('Q', 0.10)], ducks=[(0.05, 3.05)], clicks=[],
        text=[  # (text, size, centre_y, t0, t1, fade_in, fade_out)
            ('ENIAC \u00b7 1946', 96, 330, 0.0, 4.70, 0.0, 0.25),
            ('COULD YOU PROGRAM IT?', 54, 440, 0.0, 4.70, 0.0, 0.25),
            ('Vintage Computer Federation', 56, 760, 5.001, 8.4, 0.12, 0.0),
            ('InfoAge \u00b7 2201 Marconi Rd \u00b7 Wall, NJ', 40, 850, 5.001, 8.4, 0.12, 0.0),
            ('Wed, Sat & Sun \u00b7 12 to 5', 50, 940, 5.001, 8.4, 0.12, 0.0),
            ('vcfed.org', 100, 1080, 5.001, 8.4, 0.12, 0.0),
        ],
        ripples=[], yellow=None),
    '30s-v2': dict(
        total=30.0, out='short-30s-v2.mp4', audio=f'{ROOT}/assets/audio/short-30s-v2',
        music_ss=CHORD_FILE - 28.333,
        lines=[('Q', 0.10), ('Y', 18.45), ('C', 21.75)],
        ducks=[(0.05, 3.05), (18.40, 20.10), (21.70, 24.75)],
        clicks=[3.194, 4.861],
        text=[
            ('COULD YOU PROGRAM', 66, 300, 0.0, 3.20, 0.0, 0.25),
            ('A 1946 COMPUTER?', 66, 382, 0.0, 3.20, 0.0, 0.25),
            ('COME TRY IT', 62, 580, 21.667, 30.1, 0.12, 0.0),
            ('Vintage Computer Federation', 56, 700, 22.083, 30.1, 0.12, 0.0),
            ('InfoAge \u00b7 2201 Marconi Rd \u00b7 Wall, NJ', 40, 790, 22.500, 30.1, 0.12, 0.0),
            ('Wed, Sat & Sun \u00b7 12 to 5', 52, 880, 22.917, 30.1, 0.12, 0.0),
            ('vcfed.org', 100, 1020, 23.333, 30.1, 0.12, 0.0),
        ],
        ripples=[(3.194, 540, 1340, 3.333), (4.861, 540, 1250, 5.0)], yellow=(28.333, 'vcfed.org', 100, 1020)),
}

ap = argparse.ArgumentParser()
ap.add_argument('--cut', required=True, choices=list(CUTS))
ap.add_argument('--audio-only', action='store_true')
ap.add_argument('--video-only', action='store_true')
ap.add_argument('--out')
args = ap.parse_args()
C = CUTS[args.cut]
TOTAL = C['total']
NFR = round(TOTAL * FPS)
B = f'{ROOT}/output/build/short-{args.cut}'
os.makedirs(B, exist_ok=True)
OUT = args.out or f'{ROOT}/output/{C["out"]}'


def run(cmd, quiet=False):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print(' '.join(cmd)); print(r.stderr[-3000:]); sys.exit(1)
    return r.stderr


def fr(t):
    return int(math.floor(t * FPS + 0.5))


# ------------------------------------------------------------------ lamp retime
def retimed_lamps(steps_t, hold_frames_total, name):
    """F2 run 1 (readout 0 -> 144, unbroken). steps_t[k] = output time (s) at which readout n=k+1 must first
    show. Output frame j of step k plays the source in REAL TIME (25 -> 30 fps by repeating frames) from the
    first frame showing the new readout; if the step's dwell is longer than the source's, the last frame
    (static lamps) is held. Nothing is sped up or slowed down. Returns path of a 644x540 30 fps clip."""
    ev = json.load(open(F2_EVENTS))['accumulator2_readout_changes']
    vals = [e['value'] for e in ev]
    run1 = []
    exp = ['1', '4', '9', '16', '25', '36', '49', '64', '81', '100', '121', '144']
    i0 = vals.index('1')
    for k, v in enumerate(exp):
        assert vals[i0 + k] == v, (vals[i0 + k], v)
        run1.append(ev[i0 + k]['clip_ms'] / 1000.0)
    seq = f'{B}/{name}-seq'
    os.makedirs(seq, exist_ok=True)
    allp = f'{B}/F2-crop'
    if not os.path.isdir(allp):
        os.makedirs(allp)
        run([FF, '-y', '-i', F2, '-vf', 'crop=644:540:722:110', f'{allp}/%04d.png'])
    # first 25 fps frame showing each new readout, found from the pixels of the readout box (the events
    # JSON is DOM time and is 0 to 2 frames early; it is used as a cross-check, tolerance 3 frames)
    from PIL import Image
    src_idx, prev = [], None
    for i in range(30, 215):
        a = np.asarray(Image.open(f'{allp}/{i + 1:04d}.png').convert('L').crop((384, 8, 634, 92)), float)
        if prev is not None and np.abs(a - prev).mean() > 5:
            src_idx.append(i)
        prev = a
    assert len(src_idx) == 12, src_idx
    for k, t in enumerate(run1):
        assert 0 <= src_idx[k] - t * 25 <= 3, (k, src_idx[k], t * 25)
    nstep = len(steps_t)
    f_start = [fr(t) for t in steps_t]
    j = 0
    for k in range(nstep):
        f_end = f_start[k + 1] if k + 1 < nstep else hold_frames_total
        last_src = src_idx[k + 1] - 1 if k + 1 < nstep else 10 ** 6
        for jj in range(f_start[k], f_end):
            s = min(src_idx[k] + int((jj - f_start[k]) * 25 / FPS), last_src)
            link = f'{seq}/{jj - f_start[0] + 1:04d}.png'
            if os.path.lexists(link): os.remove(link)
            os.symlink(f'{allp}/{s + 1:04d}.png', link)
    out = f'{B}/{name}.mkv'
    n = hold_frames_total - f_start[0]
    run([FF, '-y', '-framerate', str(FPS), '-i', f'{seq}/%04d.png', '-frames:v', str(n),
         '-c:v', 'libx264', '-crf', '0', '-pix_fmt', 'yuv444p', out])
    return out, src_idx


# ------------------------------------------------------------------ video shots
def BG(dark=0.30):
    return f'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=40:5,eq=brightness=-{dark}'



def bloom_k(pulses, tl=0.0):
    return '+'.join(f'{a}*exp(-(T-{t - tl:.4f})*{r})*gte(T,{t - tl:.4f})' for a, t, r in pulses)


def render_shot(name, src, ss, nframes, layers, bg_crop, push=None, bloom=None, dim=None, still_input=False,
                dim_layers=None, pan=None, button=None, bg_dark=0.30):
    """layers: [(crop|None, w, h, x, y)] composed over the blurred background; crops are of the SAME source frame.
    bloom: [(amp, t_local, rate)], dim: (t0_local, ramp, amount); button: separate dimmed layer."""
    dur = nframes / FPS
    n_l = len(layers) + 1 + (1 if button else 0)
    sp = ''.join(f'[s{i}]' for i in range(n_l))
    g = [f'[0:v]fps={FPS},split={n_l}{sp}']
    bgc = f'crop={bg_crop},' if bg_crop else ''
    g.append(f'[s0]{bgc}{BG(bg_dark)}[c0]')
    cur = 'c0'
    for i, (crop, w, h, x, y) in enumerate(layers):
        if pan and i == 0:
            cr = f"crop=820:492:'82+936*clip(t/5,0,1)*clip(t/5,0,1)*(3-2*clip(t/5,0,1))':200,"
        else:
            cr = f'crop={crop},' if crop else ''
        g.append(f'[s{i + 1}]{cr}scale={w}:{h}:flags=lanczos[l{i}]')
        g.append(f'[{cur}][l{i}]overlay={x}:{y}[c{i + 1}]')
        cur = f'c{i + 1}'
    if button:
        bcrop, w, h, x, y = button
        bd = 0.20
        pre = f'eq=brightness=-{dim_layers}' if dim_layers else 'null'
        if bloom:       # bloom on the poster layer only (under the dimmed button and under the text)
            g.append(f'[{cur}]format=gbrp,split[ba][bb];[bb]gblur=sigma=14[bbl];'
                     f"[ba][bbl]blend=all_expr='min(255,A+B*({bloom_k(bloom)}))',format=yuv420p[bm]")
            cur, bloom = 'bm', None
        # whole poster dimmed first, then the button layer at a lighter dim
        g.append(f'[{cur}]{pre}[pd]')
        g.append(f'[s{n_l - 1}]crop={bcrop},scale={w}:{h}:flags=lanczos,eq=brightness=-{bd}[bt]')
        g.append(f'[pd][bt]overlay={x}:{y}[cb]')
        cur = 'cb'
    if push:
        g.append(f"[{cur}]scale=w='1080*(1+{push - 1:.4f}*t/{dur:.4f})':h=-2:eval=frame:flags=bicubic[ps];"
                 f"color=c=black:s=1080x1920:r={FPS}[bk];[bk][ps]overlay=x='(W-w)/2':y='(H-h)/2':shortest=1[pp]")
        cur = 'pp'
    if bloom:
        g.append(f'[{cur}]format=gbrp,split[ba][bb];[bb]gblur=sigma=14[bbl];'
                 f"[ba][bbl]blend=all_expr='min(255,A+B*({bloom_k(bloom)}))'[bm]")
        cur = 'bm'
    if dim:
        t0, ramp, amt = dim
        g.append(f"[{cur}]format=yuv420p,eq=brightness='-{amt}*clip((t-{t0})/{ramp},0,1)':eval=frame[dm]")
        cur = 'dm'
    g.append(f'[{cur}]format=yuv420p[v]')
    out = f'{B}/{name}.mp4'
    inp = ['-ss', f'{ss:.3f}', '-t', f'{dur + 0.6:.3f}', '-i', src] if not still_input else ['-i', src]
    run([FF, '-y'] + inp + ['-filter_complex', ';'.join(g), '-map', '[v]', '-an', '-c:v', 'libx264',
        '-crf', '14', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-frames:v', str(nframes), out])
    return out


# layouts (storyboard 30 s section 5)
L1 = [('450:115:120:70', 720, 184, 180, 455), ('980:490:470:300', 1080, 540, 0, 665)]
L1_BG = '980:490:470:300'
L1_BTN = ('740:144:590:888', 925, 180, 78, 1250)
L2 = [('455:76:130:12', 637, 106, 222, 300), ('544:640:80:184', 789, 928, 146, 440)]
L2_BG = '544:640:80:184'
L4 = [('860:510:38:118', 900, 534, 40, 690)]
L5 = [(None, 1080, 648, 0, 636)]
L6 = [('1145:105:70:140', 860, 79, 110, 600), ('566:298:82:362', 838, 441, 121, 720)]
L6_BG = '566:298:82:362'


def build_video():
    shots = []
    if args.cut == '8s-v2':
        steps = [0.0, 1 * BEAT, 2 * BEAT, 3 * BEAT, 4 * BEAT, 5 * BEAT, 6 * BEAT, 7 * BEAT, 8 * BEAT,
                 3.901, 4.721, 5.001]
        lamp, idx = retimed_lamps(steps, NFR, 'lamps8')
        print('F2 source step frames (25 fps):', idx)
        pulses = [(0.55, 3.901, 9), (0.55, 4.721, 9), (1.0, 5.001, 6)]
        shots.append(render_shot('S1', lamp, 0, NFR, [(None, 860, 721, 60, 560)], None, push=1.04,
                                 bloom=pulses, dim=(5.001, 0.25, 0.32), still_input=True))
    else:
        steps = [5.0 + (k) * BEAT for k in range(12)]
        lamp, idx = retimed_lamps(steps, 300, 'lamps30')
        print('F2 source step frames (25 fps):', idx)
        d = T_TAP - 3.194                       # S1 in point (attract clip time)
        s7 = d - 8.333
        shots.append(render_shot('S1', ATT, d, 100, L1 + [('740:144:590:888', 925, 180, 78, 1250)], L1_BG, bg_dark=0.60))
        shots.append(render_shot('S2', ATT, T_PICK + 0.04, 50, L2, L2_BG, bg_dark=0.50))
        shots.append(render_shot('S3', lamp, 0, 150, [(None, 860, 721, 60, 600)], None, push=1.04,
                                 bloom=[(1.0, 9.583 - 5.0, 8)], still_input=True))
        shots.append(render_shot('S4', PRIMES, 143.0, 100, L4, '860:510:38:118', push=1.06))
        shots.append(render_shot('S5', FIN, 20.40, 150, L5, '820:492:300:200', pan=True))
        shots.append(render_shot('S6', FIN, 10.40, 100, L6, L6_BG, push=1.04))
        t7 = 21.667
        shots.append(render_shot('S7', ATT, s7, 250, L1[1:], L1_BG, bg_dark=0.60, button=L1_BTN, dim_layers=0.38 - 0.0,
                                 bloom=[(0.55, 27.235 - t7, 8), (0.55, 28.055 - t7, 8), (1.0, 28.333 - t7, 8)]))
    with open(f'{B}/concat.txt', 'w') as f:
        for o in shots:
            f.write(f"file '{o}'\n")
    run([FF, '-y', '-f', 'concat', '-safe', '0', '-i', f'{B}/concat.txt', '-c', 'copy', f'{B}/video-base.mp4'])


# ------------------------------------------------------------------------ audio
def lufs(x):
    p = f'{B}/_tmp_l.wav'
    sf.write(p, x, SR)
    err = run([FF, '-hide_banner', '-nostats', '-i', p, '-af', 'ebur128=peak=true', '-f', 'null', '-'])
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', err)[-1])


def tap_click():
    rng = np.random.default_rng(7)
    n = int(0.06 * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n) * (t < 0.006) * np.exp(-t / 0.0015)
    noise = np.diff(noise, prepend=0.0)
    y = noise / (np.abs(noise).max() + 1e-9) + 0.5 * np.sin(2 * np.pi * 170 * t) * np.exp(-t / 0.020)
    return y / np.abs(y).max()


def ramp_env(tt, plateaus, under, up, ramp=0.15):
    """dB envelope: `under` inside each plateau, raised-cosine ramps of `ramp` s outside it."""
    env = np.full(len(tt), float(up))
    for a, b in plateaus:
        w = np.zeros(len(tt))
        w[(tt >= a) & (tt <= b)] = 1
        lo = (tt >= a - ramp) & (tt < a)
        w[lo] = 0.5 - 0.5 * np.cos(np.pi * (tt[lo] - (a - ramp)) / ramp)
        hi = (tt > b) & (tt <= b + ramp)
        w[hi] = 0.5 + 0.5 * np.cos(np.pi * (tt[hi] - b) / ramp)
        env = np.minimum(env, up + (under - up) * w)
    return env


def build_audio(limit=0.794, target=-14.0):
    n = int(round(TOTAL * SR))
    voice = np.zeros(n)
    for name, st in C['lines']:
        p44 = f'{B}/{name}-44k.wav'
        run([FF, '-y', '-i', f"{C['audio']}/{name}.wav", '-ar', str(SR), '-ac', '1', p44])
        x, sr = sf.read(p44)
        a = int(round(st * SR))
        voice[a:a + len(x)] += x[:n - a]
        print(f'{name}: {st:.3f} -> {st + len(x) / SR:.3f} s')
    voice *= 10 ** ((-16 - lufs(voice)) / 20)
    run([FF, '-y', '-ss', f"{C['music_ss']:.3f}", '-i', MUSIC, '-t', f'{TOTAL:.3f}', '-ar', str(SR), '-ac', '1',
         f'{B}/music.wav'])
    mus, _ = sf.read(f'{B}/music.wav')
    mus = np.pad(mus, (0, max(0, n - len(mus))))[:n]
    mus = mus * 10 ** ((-17 - lufs(mus)) / 20)              # "up" = -17 LUFS
    k = 1000
    tt = np.arange(int(TOTAL * k)) / k
    env = ramp_env(tt, C['ducks'], -13.0, 0.0)               # under = -30 LUFS
    g = np.interp(np.arange(n) / SR, tt, 10 ** (env / 20))
    mix = voice + mus * g
    vpk = np.abs(voice).max()
    if C['clicks']:
        tap = tap_click()
        os.makedirs(f'{ROOT}/assets/audio/sfx', exist_ok=True)
        sf.write(f'{ROOT}/assets/audio/sfx/tap.wav', tap * 10 ** (-8 / 20), SR)
        open(f'{ROOT}/assets/audio/sfx/tap.txt', 'w').write(
            'synthesised UI tap (noise burst 6 ms, 1.5 ms decay, first-differenced + 170 Hz sine, 20 ms decay), '
            'not a recording of ENIAC or of the kiosk. Generated by scripts/assemble_short_v2.py.\n')
        amp = vpk * 10 ** (-8 / 20)
        for t in C['clicks']:
            a = int(round(t * SR))
            mix[a:a + len(tap)] += tap * amp
    sf.write(f'{B}/mix-raw.wav', mix, SR)

    def chain(gdb):
        return (f'acompressor=threshold=-20dB:ratio=3:attack=5:release=80,volume={gdb:.2f}dB,'
                f'alimiter=limit={limit}:attack=3:release=50:level=disabled,'
                f'apad=whole_dur={TOTAL:.4f},atrim=0:{TOTAL:.4f}')
    gdb = 0.0
    for _ in range(6):
        run([FF, '-y', '-i', f'{B}/mix-raw.wav', '-af', chain(gdb), '-ar', str(SR), '-ac', '2', f'{B}/mix-final.wav'])
        x, _ = sf.read(f'{B}/mix-final.wav')
        cur = lufs(x)
        if abs(cur - target) < 0.1:
            break
        gdb += target - cur
    print('mix LUFS', cur)


# --------------------------------------------------------------------- overlays
def fit(s, size):
    while size > 20 and ImageFont.truetype(GEO_B, size).getlength(s) + 10 > SAFE_W:
        size -= 2
    return size


def dt(textfile, size, cy, t0, t1, fi, fo, color='white', ypos=None):
    a = '1'
    if fi:
        a += f'*clip((t-{t0})/{fi},0,1)'
    if fo:
        a += f'*clip(({t1}-t)/{fo},0,1)'
    return (f"drawtext=fontfile='{GEO_B}':textfile='{textfile}':fontsize={size}:fontcolor={color}:"
            f"borderw=5:bordercolor=black:x=(w-text_w)/2:y={cy}-text_h/2:alpha='{a}':"
            f"enable='between(t,{t0},{t1})'")


def ripple_src(i):
    ex = ("hypot(X-300,Y-300)")
    u = 'clip(T/0.45,0,1)'
    a = (f"clip(max(clip(5.5-abs({ex}-(30+260*{u})),0,1)*220*(1-{u}),"
         f"lt(T,0.12)*clip(17.5-{ex},0,1)*200),0,255)")
    return (f"color=c=black:s=600x600:r={FPS}:d=0.5,format=yuva420p,"
            f"geq=lum=255:cb=128:cr=128:a='{a}'")


def final(out):
    parts = []
    for i, (s, size, cy, t0, t1, fi, fo) in enumerate(C['text']):
        sz = fit(s, size)
        if sz != size:
            print(f'text "{s}" {size} -> {sz} pt to fit safe width')
        p = f'{B}/t{i}.txt'
        open(p, 'w').write(s)
        parts.append(dt(p, sz, cy, t0, t1, fi, fo))
    if C['yellow']:
        c0, s, size, cy = C['yellow']
        p = f'{B}/yellow.txt'
        open(p, 'w').write(s)
        a = (f"if(lt(t,{c0}),0,if(lt(t,{c0 + 0.05}),(t-{c0})/0.05,"
             f"if(lt(t,{c0 + 0.65}),1-(t-{c0 + 0.05})/0.6,0)))")
        parts.append(f"drawtext=fontfile='{GEO_B}':textfile='{p}':fontsize={fit(s, size)}:fontcolor=0xFFC23A:"
                     f"borderw=5:bordercolor=black:x=(w-text_w)/2:y={cy}-text_h/2:alpha='{a}':"
                     f"enable='between(t,{c0},{c0 + 0.7})'")
    g = [f"[0:v]{','.join(parts)}[t0]"]
    inputs = ['-i', f'{B}/video-base.mp4']
    cur = 't0'
    for i, (t0, x, y, tend) in enumerate(C['ripples']):
        inputs += ['-f', 'lavfi', '-i', ripple_src(i)]
        g.append(f'[{i + 1}:v]setpts=PTS+{t0}/TB[r{i}]')
        g.append(f"[{cur}][r{i}]overlay=x={x - 300}:y={y - 300}:eof_action=pass:"
                 f"enable='between(t,{t0},{tend - 0.001})':format=auto[o{i}]")
        cur = f'o{i}'
    g.append(f'[{cur}]format=yuv420p[vout]')
    na = len(C['ripples']) + 1
    run([FF, '-y'] + inputs + ['-i', f'{B}/mix-final.wav', '-filter_complex', ';'.join(g),
         '-map', '[vout]', '-map', f'{na}:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
         '-pix_fmt', 'yuv420p', '-r', str(FPS), '-c:a', 'aac', '-b:a', '192k', '-ar', '44100',
         '-t', f'{TOTAL:.4f}', '-movflags', '+faststart', out])


def measure(path):
    err = run([FF, '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'])
    summ = err[err.rfind('Summary:'):]
    I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', summ).group(1))
    TP = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', summ).group(1))
    return I, TP


if __name__ == '__main__':
    if not args.audio_only:
        build_video()
    if args.video_only:
        sys.exit(0)
    lim = 0.794
    for attempt in range(4):
        build_audio(limit=lim)
        final(OUT)
        I, TP = measure(OUT)
        print(f'final file: {I} LUFS, true peak {TP} dBTP (limit {lim})')
        if TP <= -1.5 and abs(I + 14) <= 0.5:
            break
        lim *= 0.9
    print('wrote', OUT)
