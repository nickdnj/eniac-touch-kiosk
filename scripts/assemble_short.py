#!/usr/bin/env python3
"""Assemble a 1080x1920 ENIAC kiosk Short, parameterised per cut.

  python3 scripts/assemble_short.py --cut 8s            -> output/short-8s.mp4
  python3 scripts/assemble_short.py --cut 30s           -> output/short-30s-DRAFT.mp4
  python3 scripts/assemble_short.py --cut 30s --final   -> output/short-30s.mp4 (only after tour clip is final)
Options: --audio-only (skip shot renders), --out PATH.

Derived from scripts/assemble_short_teaser.py (not edited). Differences: source-v6, per-cut
SHOTS/LINES/TOTAL/music/overlays, post-composite push on the PB shots, CW shots parametrised
(push + darken), text auto-fitted to the Shorts safe width, 48 k -> 44.1 k resample of the VO.
Nudges (frame-step in-point corrections, seconds): output/build/short-<cut>/nudges.json {"B1": 0.08}.
Text is drawn with FFmpeg drawtext only; footage is clean (no baked-in text).
"""
import argparse, json, os, re, subprocess, sys
import numpy as np
import soundfile as sf
from PIL import ImageFont

ROOT = '/Users/nickd/Workspaces/eniac-kiosk-youtube'
FF = '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg'
FP = '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe'
SRC = f'{ROOT}/assets/video/source-v6'          # v5 has lamps 0-at-top: never use it
MUSIC = f'{ROOT}/assets/audio/music/Hot Swing.mp3'
GEO_B = '/System/Library/Fonts/Supplemental/Georgia Bold.ttf'
FPS = 30
SR = 44100
SAFE_W = 840        # centred text must fit x 120..960 (right 120 px reserved for Shorts UI)

TOUR = f'{SRC}/eniac-touch-tour.mp4'
LAMP = f'{SRC}/squares-fullspeed-lamps.mp4'     # 14 s, Full speed, continuous flicker, reset at about 7.0 s

ACC1 = 'crop=670:428:20:222'       # accumulator 1 lamp grid + 0-9 labels (below header readout)
ACC2 = 'crop=670:428:720:222'      # accumulator 2 (v6 layout; the v5 plan x=600 would clip its right edge)

CUTS = {
    '8s': dict(
        total=8.0, audio=f'{ROOT}/assets/audio/short-8s',
        lines=[('L1', 0.30)],
        shots=[('S1', 0.0, 8.0, 'pb', dict(src=LAMP, ss=1.8, crop=ACC1, fh=690, push=1.06))],
        music_ss=42, hold_under_until=4.9,   # L1 ends 4.76; storyboard 4.65 -> moved (see notes)
        swell=None, fade_from=None,          # big ending lands on the last frame, no fade
        text=[  # (lines [(text,size,y)], t0, t1, fade_in, fade_out)
            ([('ENIAC \u00b7 1946', 96, 400)], 0.0, 4.0, 0.15, 0.25),
            ([('Vintage Computer Federation', 52, 1355), ('Wall, NJ \u00b7 vcfed.org', 64, 1420)],
             4.8, 8.0, 0.3, 0.0001),
        ]),
    '30s': dict(
        total=30.0, audio=f'{ROOT}/assets/audio/short-30s',
        lines=[('L1', 4.60), ('L2', 8.90)],
        shots=[
            ('B1', 0.0, 7.2, 'cw', dict(src=TOUR, ss=29.30, push=1.04, dark=0.0)),
            ('B2', 7.2, 8.6, 'pb', dict(src=TOUR, ss=36.90, crop='crop=1800:900:60:40', fh=540, push=None)),
            ('B3a', 8.6, 14.6, 'pb', dict(src=LAMP, ss=0.0, crop=ACC1, fh=690, push=1.05)),
            ('B3b', 14.6, 20.6, 'pb', dict(src=LAMP, ss=7.5, crop=ACC2, fh=690, push=1.05)),
            ('B4', 20.6, 30.0, 'cw', dict(src=TOUR, ss=22.00, push=1.03, dark=0.35)),
        ],
        music_ss=20, hold_under_until=None, swell=20.6, fade_from=28.8,
        text=[
            ([('PROGRAM ENIAC', 68, 285), ('WITH YOUR FINGERTIP', 68, 375)], 0.0, 3.6, 0.15, 0.25),
            ([('Vintage Computer Federation', 60, 760),
              ('InfoAge \u00b7 2201 Marconi Rd \u00b7 Wall, NJ', 44, 860),
              ('Wed, Sat & Sun, 12 to 5', 56, 950),
              ('vcfed.org', 88, 1050)], 21.2, 30.0, 0.3, 0.0001),
        ]),
}

ap = argparse.ArgumentParser()
ap.add_argument('--cut', required=True, choices=list(CUTS))
ap.add_argument('--final', action='store_true')
ap.add_argument('--audio-only', action='store_true')
ap.add_argument('--out')
args = ap.parse_args()
C = CUTS[args.cut]
TOTAL = C['total']
B = f'{ROOT}/output/build/short-{args.cut}'
os.makedirs(B, exist_ok=True)
if args.out:
    OUT = args.out
elif args.cut == '30s' and not args.final:
    OUT = f'{ROOT}/output/short-30s-DRAFT.mp4'
else:
    OUT = f'{ROOT}/output/short-{args.cut}.mp4'
SHOTS = C['shots']
NUDGE = json.load(open(f'{B}/nudges.json')) if os.path.exists(f'{B}/nudges.json') else {}


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print(' '.join(cmd)); print(r.stderr[-3000:]); sys.exit(1)
    return r.stderr


# ----------------------------------------------------------------- video shots
BG = ('scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,'
      'boxblur=40:5,colorchannelmixer=rr=0.7:gg=0.7:bb=0.7')


def push_tail(src_label, push, dur, post=''):
    """Scale the 1080x1920 composite up (1.00 -> push, per frame) and centre it on a 1080x1920 canvas.
    crop cannot be used: its iw is fixed at config time, so it would stay left/top anchored."""
    if not push:
        return f'[{src_label}]{post}format=yuv420p[v]'
    return (f"[{src_label}]scale=w='1080*(1+{push - 1:.4f}*t/{dur})':h=-2:eval=frame:flags=bicubic[s];"
            f"color=c=black:s=1080x1920:r={FPS}[k];"
            f"[k][s]overlay=x='(W-w)/2':y='(H-h)/2':shortest=1,{post}format=yuv420p[v]")


def pb(crop, fh, push=None, dur=0):
    """Blurred-fill pillarbox of a crop window, composited first, then pushed."""
    y = (1920 - fh) // 2
    return (f'[0:v]fps={FPS},{crop},split[f][g];'
            f'[g]{BG}[bg];[f]scale=1080:{fh}:flags=lanczos[fg];'
            f'[bg][fg]overlay=0:{y}[c];' + push_tail('c', push, dur))


def cw(push, dark, dur):
    """Centre-window 607x1080 @ x=657 (S10 recipe), push, optional darken."""
    eq = f'eq=brightness=-{dark},' if dark else ''
    return (f"[0:v]fps={FPS},crop=607:1080:657:0,scale=1080:1920:flags=bicubic[c];" + push_tail('c', push, dur, eq))


def render_shot(i):
    name, t0, t1, kind, p = SHOTS[i]
    n = round(t1 * FPS) - round(t0 * FPS)
    dur = n / FPS
    ss = p['ss'] + NUDGE.get(name, 0.0)
    fc = cw(p['push'], p['dark'], dur) if kind == 'cw' else pb(p['crop'], p['fh'], p['push'], dur)
    out = f'{B}/{name}.mp4'
    run([FF, '-y', '-ss', f'{ss:.3f}', '-t', f'{dur + 0.5:.3f}', '-i', p['src'],
         '-filter_complex', fc, '-map', '[v]', '-an', '-c:v', 'libx264', '-crf', '14', '-preset', 'fast',
         '-pix_fmt', 'yuv420p', '-r', str(FPS), '-frames:v', str(n), out])
    return out


def build_video_base():
    outs = [render_shot(i) for i in range(len(SHOTS))]
    with open(f'{B}/concat.txt', 'w') as f:
        for o in outs:
            f.write(f"file '{o}'\n")
    run([FF, '-y', '-f', 'concat', '-safe', '0', '-i', f'{B}/concat.txt', '-c', 'copy', f'{B}/video-base.mp4'])


# ----------------------------------------------------------------------- audio
def lufs(path_or_arr, sr=SR):
    p = path_or_arr
    if not isinstance(p, str):
        p = f'{B}/_tmp_l.wav'; sf.write(p, path_or_arr, sr)
    err = run([FF, '-hide_banner', '-nostats', '-i', p, '-af', 'ebur128=peak=true', '-f', 'null', '-'])
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', err)
    return float(m[-1])


def build_audio():
    n = int(TOTAL * SR)
    voice = np.zeros(n)
    ivals = []
    for name, st in C['lines']:
        p44 = f'{B}/{name}-44k.wav'
        run([FF, '-y', '-i', f"{C['audio']}/{name}.wav", '-ar', str(SR), '-ac', '1', p44])
        x, sr = sf.read(p44); assert sr == SR
        a = int(round(st * SR)); voice[a:a + len(x)] += x[:n - a]
        ivals.append((st, st + len(x) / SR))
        print(f'{name}: {st:.2f} -> {st + len(x) / SR:.3f} s')
    voice *= 10 ** ((-16 - lufs(voice)) / 20)               # voice at -16 LUFS
    run([FF, '-y', '-ss', str(C['music_ss']), '-i', MUSIC, '-t', str(TOTAL), '-ar', str(SR), '-ac', '1', f'{B}/music.wav'])
    mus, _ = sf.read(f'{B}/music.wav'); assert len(mus) >= n - 5, 'music too short'
    mus = np.pad(mus, (0, max(0, n - len(mus))))[:n]
    up_gain = -20 - lufs(mus)                                # music alone at -20 LUFS = "up"
    UP, UNDER = up_gain, up_gain - 12                        # under = -32 LUFS
    k = 1000
    tt = np.arange(int(TOTAL * k)) / k
    env = np.full(len(tt), UP)
    for s, e in ivals:
        if C['swell'] is not None and s >= C['swell']: continue
        e2 = max(e + 0.05, C['hold_under_until'] or 0)
        env[(tt >= s - 0.05) & (tt < e2)] = UNDER
    env[tt >= (C['swell'] if C['swell'] is not None else 1e9)] = UP
    env[tt < min(s for s, _ in ivals) - 0.05] = UP
    w = int(0.15 * k); env = np.convolve(np.pad(env, (w, w), mode='edge'), np.ones(w) / w, 'same')[w:-w]
    if C['fade_from'] is not None:
        ff = C['fade_from']
        fade = np.where(tt >= ff, np.clip((TOTAL - tt) / (TOTAL - ff), 0, 1), 1.0)
    else:
        fade = np.ones(len(tt))
    gain = 10 ** (env / 20) * fade
    g = np.interp(np.arange(n) / SR, tt, gain)
    mix = voice + mus * g
    sf.write(f'{B}/mix-raw.wav', mix, SR)

    def chain(g):
        return (f"acompressor=threshold=-20dB:ratio=3:attack=5:release=80,volume={g:.2f}dB,"
                f"alimiter=limit=0.80:attack=3:release=50:level=disabled,"
                f"apad=whole_dur={TOTAL},atrim=0:{TOTAL}")
    g = 0.0
    for _ in range(6):
        run([FF, '-y', '-i', f'{B}/mix-raw.wav', '-af', chain(g), '-ar', str(SR), '-ac', '2', f'{B}/mix-final.wav'])
        cur = lufs(f'{B}/mix-final.wav')
        if abs(cur + 14) < 0.15: break
        g += (-14 - cur)
    print('mix LUFS', lufs(f'{B}/mix-final.wav'))


# --------------------------------------------------------------------- overlays
def txt(name, s):
    p = f'{B}/{name}.txt'
    open(p, 'w').write(s); return p


def fit(s, size):
    """Shrink font size until the outlined text fits SAFE_W."""
    while size > 20:
        w = ImageFont.truetype(GEO_B, size).getlength(s) + 10
        if w <= SAFE_W: break
        size -= 2
    return size


def dt(textfile, size, y, t0, t1, fi, fo):
    al = f"if(lt(t,{t0}),0,if(lt(t,{t0 + fi}),(t-{t0})/{fi},if(gt(t,{t1 - fo}),({t1}-t)/{fo},1)))"
    return (f"drawtext=fontfile='{GEO_B}':textfile='{textfile}':fontsize={size}:fontcolor=white:"
            f"borderw=5:bordercolor=black:x=(w-text_w)/2:y={y}:alpha='{al}':enable='between(t,{t0},{t1})'")


def final():
    parts = []
    for gi, (lines, t0, t1, fi, fo) in enumerate(C['text']):
        for li, (s, size, y) in enumerate(lines):
            sz = fit(s, size)
            if sz != size: print(f'text "{s}" {size} -> {sz} pt to fit safe width')
            parts.append(dt(txt(f'g{gi}l{li}', s), sz, y, t0, t1, fi, fo))
    run([FF, '-y', '-i', f'{B}/video-base.mp4', '-i', f'{B}/mix-final.wav', '-vf', ','.join(parts),
         '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
         '-pix_fmt', 'yuv420p', '-r', str(FPS), '-c:a', 'aac', '-b:a', '192k', '-ar', '44100',
         '-t', str(TOTAL), '-movflags', '+faststart', OUT])


if __name__ == '__main__':
    if not args.audio_only:
        build_video_base()
    build_audio()
    final()
    print('wrote', OUT)
