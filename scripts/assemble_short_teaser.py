#!/usr/bin/env python3
"""Assemble the 1080x1920 teaser Short to storyboard/short-teaser.md (v2, Trajectory).

Re-runnable:  python3 scripts/assemble_short_teaser.py [--audio-only] [--keep]
Intermediates: output/build/short-teaser/   Output: output/short-teaser.mp4
Only two overlays (hook, invite), drawn with FFmpeg drawtext. No other text.
"""
import json, os, re, subprocess, sys
import numpy as np
import soundfile as sf

ROOT = '/Users/nickd/Workspaces/eniac-kiosk-youtube'
FF = '/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg'
FP = '/opt/homebrew/opt/ffmpeg-full/bin/ffprobe'
B = f'{ROOT}/output/build/short-teaser'
SRC = f'{ROOT}/assets/video/source-v5'
PH = f'{ROOT}/assets/images/photos'
AUD = f'{ROOT}/assets/audio/short-teaser'
MUSIC = f'{ROOT}/assets/audio/music/Hot Swing.mp3'
OUT = f'{ROOT}/output/short-teaser.mp4'
GEO_B = '/System/Library/Fonts/Supplemental/Georgia Bold.ttf'
FPS = 30
TOTAL = 45.0
SR = 44100
os.makedirs(B, exist_ok=True)

TOUR = f'{SRC}/eniac-touch-tour.mp4'
TRAJ = f'{SRC}/eniac-touch-walkthrough-trajectory.mp4'
PRIM = f'{SRC}/eniac-touch-walkthrough-primes.mp4'
SQUA = f'{SRC}/eniac-touch-walkthrough-squares.mp4'


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print(' '.join(cmd)); print(r.stderr[-3000:]); sys.exit(1)
    return r.stderr


# ----------------------------------------------------------------- video shots
BG = ('scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,'
      'boxblur=40:5,colorchannelmixer=rr=0.7:gg=0.7:bb=0.7')


def pb(crop, fh):
    """Blurred-fill pillarbox. crop = 'crop=w:h:x:y' (x may be an expression)."""
    y = (1920 - fh) // 2
    return (f'[0:v]fps={FPS},{crop},split[f][g];'
            f'[g]{BG}[bg];[f]scale=1080:{fh}:flags=lanczos[fg];'
            f'[bg][fg]overlay=0:{y},format=yuv420p[v]')


def zoom_still(src_crop, pre_w, pre_h, out_w, out_h, n, z1):
    return (f'{src_crop}scale={pre_w}:{pre_h}:flags=lanczos,'
            f"zoompan=z='1+{z1 - 1}*on/{n}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={n}:s={out_w}x{out_h}:fps={FPS}")


EASE = "st(0,clip((t-{a})/{d},0,1));{x0}+({x1}-{x0})*ld(0)*ld(0)*(3-2*ld(0))"

# (name, out_start, out_end, kind, params)
SHOTS = [
    ('S1', 0.00, 6.10, 'vid', dict(src=TOUR, ss=18.00, fc=pb('crop=780:730:570:270', 1012))),
    ('S2', 6.10, 10.70, 'still', dict(img=f'{PH}/P1-beck-snyder-eniac.jpg')),
    ('S3', 10.70, 13.85, 'vid', dict(src=TRAJ, ss=16.20, fc=pb('crop=1300:660:60:100', 548))),
    ('S4', 13.85, 17.05, 'vid', dict(src=TRAJ, ss=65.00, fc=pb(
        "crop=1180:980:x='" + EASE.format(a=1.2, d=2.0, x0=720, x1=0) + "':y=30", 898))),
    ('S5a', 17.05, 18.55, 'vid', dict(src=TRAJ, ss=77.50, fc=pb(
        "crop=1000:650:x='" + EASE.format(a=0, d=1.5, x0=150, x1=900) + "':y=150", 702))),
    ('S5b', 18.55, 21.65, 'vid', dict(src=TRAJ, ss=88.00, fc=pb('crop=1340:980:0:30', 790))),
    ('S6', 21.65, 23.20, 'vid', dict(src=TRAJ, ss=119.80, fc=pb('crop=1340:980:0:30', 790))),
    ('S7', 23.20, 26.50, 'vid', dict(src=TRAJ, ss=137.10, fc=pb('crop=1340:980:0:30', 790))),
    ('S8', 26.50, 29.90, 'still', dict(img=f'{PH}/P3-two-women-operating-eniac.jpg')),
    ('S9a', 29.90, 31.00, 'vid', dict(src=PRIM, ss=105.00, fc=pb('crop=1380:860:20:50', 674))),
    ('S9b', 31.00, 32.00, 'vid', dict(src=SQUA, ss=136.00, fc=pb('crop=1100:760:0:40', 746))),
    ('S10', 32.00, 45.00, 'vid', dict(src=TOUR, ss=22.00, fc=None)),
]
# optional per-shot in-point nudges (seconds added to ss) found by frame-stepping
NUDGE = json.load(open(f'{B}/nudges.json')) if os.path.exists(f'{B}/nudges.json') else {}


def frames_for(i):
    a = round(SHOTS[i][1] * FPS); b = round(SHOTS[i][2] * FPS)
    return b - a


def render_shot(i):
    name, t0, t1, kind, p = SHOTS[i]
    n = frames_for(i)
    out = f'{B}/{name}.mp4'
    common = ['-an', '-c:v', 'libx264', '-crf', '14', '-preset', 'fast', '-pix_fmt', 'yuv420p',
              '-r', str(FPS), '-frames:v', str(n), out]
    if kind == 'vid':
        ss = p['ss'] + NUDGE.get(name, 0.0)
        if name == 'S10':
            # CW 607x1080 @ x=657 (centred on button; full label fits), push 1.00 -> 1.03, darkened 35%
            dur = t1 - t0
            fc = (f"[0:v]fps={FPS},crop=607:1080:657:0,scale=w='1080*(1+0.03*t/{dur})':h=-2:eval=frame:flags=bicubic,"
                  f"crop=1080:1920,eq=brightness=-0.35,format=yuv420p[v]")
        else:
            fc = p['fc']
        run([FF, '-y', '-ss', f'{ss:.3f}', '-t', f'{n / FPS + 0.5:.3f}', '-i', p['src'],
             '-filter_complex', fc, '-map', '[v]'] + common)
    else:
        if name == 'S2':
            # whole photo to 2160 wide, slow push 1.00 -> 1.08, PB fill
            fc = (f"[0:v]{zoom_still('', 2160, 1650, 1080, 826, n, 1.08)},split[f][g];"
                  f"[g]{BG}[bg];[bg][f]overlay=0:{(1920 - 826) // 2},format=yuv420p[v]")
        else:
            fc = (f"[0:v]{zoom_still('crop=2193:3899:2450:0,', 1620, 2880, 1080, 1920, n, 1.12)},format=yuv420p[v]")
        run([FF, '-y', '-i', p['img'], '-filter_complex', fc, '-map', '[v]'] + common)
    return out


def build_video_base():
    outs = [render_shot(i) for i in range(len(SHOTS))]
    with open(f'{B}/concat.txt', 'w') as f:
        for o in outs:
            f.write(f"file '{o}'\n")
    run([FF, '-y', '-f', 'concat', '-safe', '0', '-i', f'{B}/concat.txt', '-c', 'copy', f'{B}/video-base.mp4'])


# ----------------------------------------------------------------------- audio
LINES = [('line-01', 0.30), ('traj-02', 6.28), ('traj-03', 10.86), ('traj-04', 13.86),
         ('traj-05', 17.10), ('traj-06', 21.96), ('traj-07', 24.87), ('line-08', 32.43)]


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
    for name, st in LINES:
        x, sr = sf.read(f'{AUD}/{name}.wav'); assert sr == SR
        if x.ndim > 1: x = x.mean(1)
        a = int(st * SR); voice[a:a + len(x)] += x[:n - a]
        ivals.append((st, st + len(x) / SR))
    voice *= 10 ** ((-16 - lufs(voice)) / 20)               # voice at -16 LUFS
    # music: decode, first 45 s
    run([FF, '-y', '-i', MUSIC, '-t', str(TOTAL), '-ar', str(SR), '-ac', '1', f'{B}/music.wav'])
    mus, _ = sf.read(f'{B}/music.wav'); mus = np.pad(mus, (0, max(0, n - len(mus))))[:n]
    up_gain = -20 - lufs(mus)                                # music alone at -20 LUFS = "up"
    UP, UNDER = up_gain, up_gain - 12                        # under = -32 LUFS
    k = 1000
    tt = np.arange(int(TOTAL * k)) / k
    env = np.full(len(tt), UP)
    for s, e in ivals:
        if s >= 42.7: continue
        env[(tt >= s - 0.05) & (tt < e + 0.05)] = UNDER
    env[(tt < 0.3)] = UP
    env[tt >= 42.7] = UP
    w = int(0.15 * k); env = np.convolve(np.pad(env, (w, w), mode='edge'), np.ones(w) / w, 'same')[w:-w]
    fade = np.clip((TOTAL - tt) / 0.8, 0, 1) * (tt >= 44.2) + (tt < 44.2)
    gain = 10 ** (env / 20) * fade
    g = np.interp(np.arange(n) / SR, tt, gain)
    mix = voice + mus * g
    sf.write(f'{B}/mix-raw.wav', mix, SR)
    # light compression of voice peaks, then search the gain so the *limited* result lands on -14 LUFS
    # integrated with sample peak <= -2 dBFS (true peak <= -1.5 dBTP after AAC)
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


def dt(textfile, size, y, t0, t1, fi, fo):
    al = f"if(lt(t,{t0}),0,if(lt(t,{t0 + fi}),(t-{t0})/{fi},if(gt(t,{t1 - fo}),({t1}-t)/{fo},1)))"
    return (f"drawtext=fontfile='{GEO_B}':textfile='{textfile}':fontsize={size}:fontcolor=white:"
            f"borderw=5:bordercolor=black:x=(w-text_w)/2:y={y}:alpha='{al}':enable='between(t,{t0},{t1})'")


def final():
    h1 = txt('hook1', 'PROGRAM ENIAC'); h2 = txt('hook2', 'WITH YOUR FINGERTIP')
    i1 = txt('inv1', 'VCF museum \u00b7 Wall, NJ'); i2 = txt('inv2', 'vcfed.org')
    vf = ','.join([
        dt(h1, 68, 285, 0.0, 3.6, 0.15, 0.25),
        dt(h2, 68, 375, 0.0, 3.6, 0.15, 0.25),
        dt(i1, 56, 900, 33.5, TOTAL, 0.3, 0.0001),
        dt(i2, 88, 990, 33.5, TOTAL, 0.3, 0.0001),
    ])
    run([FF, '-y', '-i', f'{B}/video-base.mp4', '-i', f'{B}/mix-final.wav', '-vf', vf,
         '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
         '-pix_fmt', 'yuv420p', '-r', str(FPS), '-c:a', 'aac', '-b:a', '192k', '-ar', '44100',
         '-t', str(TOTAL), '-movflags', '+faststart', OUT])


if __name__ == '__main__':
    if '--audio-only' not in sys.argv:
        build_video_base()
    build_audio()
    final()
    print('wrote', OUT)
