"""Shared helpers for assemble.py: rendering segments, overlay PNGs, audio synth.
All text overlays are PNGs drawn here (this ffmpeg build has no drawtext) and
composited by ffmpeg `overlay` with alpha fades. Nothing is baked into images.
"""
import os, subprocess, json, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

FPS = 30
W, H = 1920, 1080
SR = 48000
FONT_B = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
FONT_BLK = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
FONT_R = "/System/Library/Fonts/Supplemental/Arial.ttf"


def run(cmd, timeout=900, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, **kw)
    if r.returncode != 0:
        raise RuntimeError("FAILED: %s\n%s" % (" ".join(map(str, cmd)), r.stderr[-3000:]))
    return r


def ff(*args):
    return run(["ffmpeg", "-y", "-v", "error", "-nostdin"] + [str(a) for a in args])


VENC = ["-r", str(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p", "-an"]


def nfr(dur):
    return int(round(dur * FPS))


# ---------------------------------------------------------------- video segments
def seg_clip(out, src, ss, dur, hold=0.0, darken=0.0, vf_extra=""):
    """Kiosk footage, 1920x1080, never flipped. `hold` freezes the last frame (tpad)."""
    vf = "fps=%d,scale=%d:%d:flags=bicubic,setsar=1" % (FPS, W, H)
    if darken:
        vf += ",eq=brightness=-%.2f" % darken
    if vf_extra:
        vf += "," + vf_extra
    src_dur = max(dur - hold, 0.04)
    if hold:
        vf += ",tpad=stop_mode=clone:stop_duration=%.3f" % (hold + 1)
    ff("-ss", "%.3f" % ss, "-t", "%.3f" % src_dur, "-i", src, "-vf", vf, "-frames:v", nfr(dur), *VENC, out)


def seg_black(out, dur):
    ff("-f", "lavfi", "-i", "color=c=black:s=%dx%d:r=%d" % (W, H, FPS), "-frames:v", nfr(dur), *VENC, out)


def img_size(path):
    with Image.open(path) as im:
        return im.size


def seg_photo(out, img, dur, motion="zoom", fade_in=0.0, fade_out=0.0, zoom_end=1.08):
    """Photo with blurred-fill background and the full photo fitted (landscape: gentle
    Ken Burns zoom; portrait: pillarboxed, optional vertical pan 'pan-down')."""
    n = nfr(dur)
    w0, h0 = img_size(img)
    bg = ("[0:v]scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d,boxblur=40:6,"
          "eq=brightness=-0.35,setsar=1,fps=%d[bg]" % (W, H, W, H, FPS))
    if motion == "pan-down":
        # portrait page: width 1100, scroll a 1100x1080 window top to bottom
        pw = 1100
        ph = int(round(h0 * pw / w0 / 2) * 2)
        travel = max(ph - 1080, 0)
        fg = ("[1:v]scale=%d:%d:flags=lanczos,fps=%d,crop=%d:1080:0:'min(%d,%d*t/%.3f)'[fg]"
              % (pw, ph, FPS, pw, travel, travel, dur))
        fgw = pw
        graph = bg + ";" + fg + ";[bg][fg]overlay=(W-w)/2:0,format=yuv420p"
    elif motion == "static":
        fh = 1080
        fw = int(round(w0 * fh / h0 / 2) * 2)
        if fw > W:
            fw = W
            fh = int(round(h0 * fw / w0 / 2) * 2)
        fg = "[1:v]scale=%d:%d:flags=lanczos,fps=%d[fg]" % (fw, fh, FPS)
        graph = bg + ";" + fg + ";[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p"
    else:
        fh = 1080
        fw = int(round(w0 * fh / h0 / 2) * 2)
        if fw > W:
            fw = W
            fh = int(round(h0 * fw / w0 / 2) * 2)
        sw = min(w0, 2880)
        sh = int(round(h0 * sw / w0))
        fg = ("[1:v]scale=%d:%d:flags=lanczos,zoompan=z='1+%.4f*on/%d':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=%d:s=%dx%d:fps=%d[fg]"
              % (sw, sh, zoom_end - 1, n, n, fw, fh, FPS))
        graph = bg + ";" + fg + ";[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p"
    fades = ""
    if fade_in:
        fades += ",fade=t=in:st=0:d=%.2f" % fade_in
    if fade_out:
        fades += ",fade=t=out:st=%.3f:d=%.2f" % (dur - fade_out, fade_out)
    graph += fades + "[v]"
    ff("-loop", "1", "-t", "%.3f" % dur, "-framerate", FPS, "-i", img, "-i", img,
       "-filter_complex", graph, "-map", "[v]", "-frames:v", n, *VENC, out)


def concat(paths, out):
    lst = out + ".txt"
    with open(lst, "w") as f:
        for p in paths:
            f.write("file '%s'\n" % p)
    ff("-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", out)


# ---------------------------------------------------------------- overlay PNGs
def _font(path, size):
    return ImageFont.truetype(path, size)


def _shadow_text(d, xy, text, font, fill=(255, 255, 255, 255), sh=(0, 0, 0, 200), off=3):
    d.text((xy[0] + off, xy[1] + off), text, font=font, fill=sh)
    d.text(xy, text, font=font, fill=fill)


def png_box_text(path, lines, size=44, pad=(34, 22), bg=(10, 18, 36, 215), accent=None,
                 font=FONT_B, line_gap=10, colors=None, align="left", radius=14):
    """Rounded box with one or more text lines. Saved at its tight size."""
    fonts = [_font(font, size if i == 0 else int(size * 0.72)) for i in range(len(lines))]
    dm = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    ws = [dm.textlength(t, font=f) for t, f in zip(lines, fonts)]
    hs = [f.size * 1.15 for f in fonts]
    bw = int(max(ws) + pad[0] * 2 + (10 if accent else 0))
    bh = int(sum(hs) + line_gap * (len(lines) - 1) + pad[1] * 2)
    im = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, bw - 1, bh - 1], radius=radius, fill=bg)
    x0 = pad[0] + (10 if accent else 0)
    if accent:
        d.rounded_rectangle([0, 0, 9, bh - 1], radius=4, fill=accent)
    y = pad[1]
    for i, (t, f) in enumerate(zip(lines, fonts)):
        col = (colors[i] if colors else (255, 255, 255, 255))
        x = x0 if align == "left" else (bw - ws[i]) / 2
        d.text((x, y), t, font=f, fill=col)
        y += hs[i] + line_gap
    im.save(path)
    return im.size


def png_credit(path, text, size=26):
    f = _font(FONT_R, size)
    dm = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    w = int(dm.textlength(text, font=f)) + 24
    im = Image.new("RGBA", (w, size + 22), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, w - 1, size + 21], radius=8, fill=(0, 0, 0, 120))
    d.text((12, 8), text, font=f, fill=(235, 235, 235, 255))
    im.save(path)
    return im.size


def png_stamp(path, text="SUNK!", size=150):
    f = _font(FONT_BLK, size)
    dm = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    tw = int(dm.textlength(text, font=f))
    pad = 36
    bw, bh = tw + pad * 2, int(size * 1.2) + pad
    im = Image.new("RGBA", (bw + 120, bh + 120), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    ox = 60
    d.rounded_rectangle([ox, 60, ox + bw, 60 + bh], radius=10, fill=(214, 40, 40, 235),
                        outline=(255, 255, 255, 255), width=8)
    d.text((ox + pad, 60 + pad // 2 - 6), text, font=f, fill=(255, 255, 255, 255))
    im = im.rotate(8, resample=Image.BICUBIC, expand=True)
    im.save(path)
    return im.size


def png_dim_band(path, h=260):
    im = Image.new("RGBA", (W, h), (0, 0, 0, 0))
    px = np.zeros((h, W, 4), dtype=np.uint8)
    a = np.linspace(0, 150, h).astype(np.uint8)
    px[..., 3] = a[:, None]
    Image.fromarray(px).save(path)


# ---------------------------------------------------------------- overlay pass
def overlay_pass(base, overlays, out, total_dur, chunk=15.0):
    """Chunked: each ~15 s window of the base gets only the overlays active in it
    (one huge filtergraph with ~25 looped inputs deadlocked ffmpeg)."""
    parts = []
    nchunks = int(math.ceil(total_dur / chunk))
    for ci in range(nchunks):
        c0 = ci * chunk
        c1 = min(c0 + chunk, total_dur)
        act = [o for o in overlays if o["t0"] < c1 and o["t1"] > c0]
        cp = "%s.chunk%02d.mp4" % (out, ci)
        if not act:
            ff("-ss", "%.3f" % c0, "-i", base, "-t", "%.3f" % (c1 - c0), "-r", FPS, "-c:v", "libx264",
               "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p", "-an", cp)
        else:
            inputs = ["-ss", "%.3f" % c0, "-t", "%.3f" % (c1 - c0), "-i", base]
            fparts, last = [], "0:v"
            for i, o in enumerate(act, start=1):
                s0, s1 = max(o["t0"], c0), min(o["t1"], c1)
                d = o["t1"] - o["t0"]
                inputs += ["-loop", "1", "-framerate", str(FPS), "-t", "%.3f" % (c1 - c0 + 1), "-i", o["png"]]
                fin, fout = o.get("fin", 0.3), o.get("fout", 0.3)
                ch = "[%d:v]format=rgba" % i
                # fades are defined on the overlay's own clock (shifted to chunk time below)
                st0 = o["t0"] - c0
                if fin and st0 >= 0:
                    ch += ",fade=t=in:st=%.3f:d=%.2f:alpha=1" % (st0, fin)
                if fout and st0 + d - fout >= 0:
                    ch += ",fade=t=out:st=%.3f:d=%.2f:alpha=1" % (st0 + d - fout, fout)
                fparts.append(ch + "[o%d]" % i)
                en = "between(t,%.3f,%.3f)" % (st0, st0 + d)
                fparts.append("[%s][o%d]overlay=x=%s:y=%s:enable='%s':format=auto:shortest=0[v%d]"
                              % (last, i, o["x"], o["y"], en, i))
                last = "v%d" % i
            gp = cp + ".filter.txt"
            open(gp, "w").write(";".join(fparts))
            ff(*inputs, "-filter_complex_script", gp, "-map", "[%s]" % last, "-t", "%.3f" % (c1 - c0),
               "-r", FPS, "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p", "-an", cp)
        parts.append(cp)
    concat(parts, out)


# ---------------------------------------------------------------- audio
def load_audio(path, ss=0.0, dur=None):
    cmd = ["ffmpeg", "-v", "error", "-nostdin", "-ss", "%.3f" % ss]
    if dur:
        cmd += ["-t", "%.3f" % dur]
    cmd += ["-i", path, "-ar", str(SR), "-ac", "2", "-f", "f32le", "-"]
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode:
        raise RuntimeError(r.stderr.decode()[-1000:])
    return np.frombuffer(r.stdout, dtype=np.float32).reshape(-1, 2).copy()


def place(buf, clip, t, gain=1.0):
    i = int(round(t * SR))
    if i < 0:
        clip = clip[-i:]
        i = 0
    n = min(len(clip), len(buf) - i)
    if n > 0:
        buf[i:i + n] += clip[:n] * gain


def env_from_points(n, pts):
    """pts: [(t, gain), ...] piecewise-linear gain envelope over n samples."""
    ts = np.array([p[0] for p in pts]) * SR
    gs = np.array([p[1] for p in pts])
    return np.interp(np.arange(n), ts, gs).astype(np.float32)


def smooth(x, sec):
    k = max(int(sec * SR), 1)
    ker = np.ones(k, dtype=np.float32) / k
    return np.convolve(x, ker, mode="same")


def loop_to(music, n, xf=0.5):
    """Loop a stereo clip to n samples with short crossfades."""
    xs = int(xf * SR)
    out = np.zeros((n, 2), dtype=np.float32)
    pos = 0
    first = True
    while pos < n:
        seg = music.copy()
        if not first:
            fi = np.linspace(0, 1, xs)[:, None]
            seg[:xs] *= fi
            pos -= xs
            # previous tail fade-out already handled by overlap-add with fade on tail below
        tail = np.linspace(1, 0, xs)[:, None]
        seg[-xs:] *= tail
        end = min(pos + len(seg), n)
        out[pos:end] += seg[:end - pos]
        pos = pos + len(seg)
        first = False
    return out


def synth_drum(dur=0.45, f0=95, f1=48):
    t = np.arange(int(dur * SR)) / SR
    fr = f1 + (f0 - f1) * np.exp(-t * 18)
    ph = 2 * np.pi * np.cumsum(fr) / SR
    s = np.sin(ph) * np.exp(-t * 9)
    rng = np.random.default_rng(3)
    n = rng.standard_normal(len(t)) * np.exp(-t * 60) * 0.25
    x = (s + n).astype(np.float32)
    return np.stack([x, x], 1) * 0.9


def synth_tap():
    t = np.arange(int(0.06 * SR)) / SR
    x = (np.sin(2 * np.pi * 1400 * t) * np.exp(-t * 90) * 0.5).astype(np.float32)
    return np.stack([x, x], 1)


def lowpass(x, fc):
    """One-pole lowpass via FFT convolution with a truncated exponential kernel (no scipy)."""
    a = math.exp(-2 * math.pi * fc / SR)
    klen = int(min(8.0 / max(1 - a, 1e-6), SR))
    k = ((1 - a) * a ** np.arange(klen)).astype(np.float32)
    n = len(x)
    nf = 1 << int(math.ceil(math.log2(n + klen)))
    K = np.fft.rfft(k, nf)
    out = np.empty_like(x)
    for c in range(x.shape[1]):
        out[:, c] = np.fft.irfft(np.fft.rfft(x[:, c], nf) * K, nf)[:n]
    return out


def synth_splash(dur=1.6):
    rng = np.random.default_rng(7)
    t = np.arange(int(dur * SR)) / SR
    n = rng.standard_normal((len(t), 2)).astype(np.float32)
    n = lowpass(n, 2500) - lowpass(n, 300)
    env = (1 - np.exp(-t * 60)) * np.exp(-t * 3.2)
    return n * env[:, None].astype(np.float32) * 2.2


def synth_impact(dur=2.6):
    rng = np.random.default_rng(11)
    t = np.arange(int(dur * SR)) / SR
    fr = 38 + 70 * np.exp(-t * 7)
    ph = 2 * np.pi * np.cumsum(fr) / SR
    boom = np.sin(ph) * np.exp(-t * 2.4)
    n = rng.standard_normal(len(t)).astype(np.float32)
    n = lowpass(n[:, None], 1800)[:, 0] - lowpass(n[:, None], 200)[:, 0]
    water = n * (1 - np.exp(-t * 40)) * np.exp(-t * 2.2) * 1.2
    x = (boom * 1.1 + water * 0.6).astype(np.float32)
    return np.stack([x, x], 1)


def synth_snare_roll(dur, start_gain=0.05, end_gain=0.5, rate=14):
    rng = np.random.default_rng(5)
    n = int(dur * SR)
    out = np.zeros((n, 2), dtype=np.float32)
    k = int(0.07 * SR)
    t = np.arange(k) / SR
    hit = (rng.standard_normal(k) * np.exp(-t * 55)).astype(np.float32)
    hit = np.stack([hit, hit], 1)
    steps = int(dur * rate)
    for i in range(steps):
        pos = int(i / rate * SR)
        g = start_gain + (end_gain - start_gain) * (i / max(steps - 1, 1)) ** 1.5
        e = min(pos + k, n)
        out[pos:e] += hit[:e - pos] * g
    return out


def room_tone(n):
    rng = np.random.default_rng(1)
    x = rng.standard_normal((n, 2)).astype(np.float32)
    return lowpass(x, 400) * 0.004


def sfx_file(path, ss=0.0, dur=None, gain=1.0, fade=0.05):
    x = load_audio(path, ss, dur)
    f = int(fade * SR)
    if f and len(x) > 2 * f:
        x[:f] *= np.linspace(0, 1, f)[:, None]
        x[-f:] *= np.linspace(1, 0, f)[:, None]
    return x * gain
