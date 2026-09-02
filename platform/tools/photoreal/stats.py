#!/usr/bin/env python3
"""Measured comparison of a render against its photograph.

This is the round 3 measurement from research/king-studio/critic-log.md done
right, with both traps closed:

  * BOTH images are resampled to a common width (default 1000 px) with the
    same filter before any spatial statistic is taken. A 2400 px PNG beside
    a 2000 px JPEG has different block sigma, gradient energy and spectrum for
    reasons that have nothing to do with the picture.
  * Chroma statistics (saturation, warmth) are taken from the render AFTER a
    JPEG q92 4:2:0 round trip at the photograph's width, because the
    photographs carry that subsampling and the render otherwise measures
    several times the photograph's chroma noise purely from the file format.
    The output says so on the rows it applies to.

Statistics, all on luminance in 0..1 unless stated:
  mean            frame mean luminance
  clipped %       pixels with luminance >= 0.98
  dark %          pixels with luminance < 0.5
  p1, p99         luminance percentiles
  block sigma     mean of the per block standard deviation on a 12x12 block grid
                  (local texture and noise)
  frame sigma     standard deviation of the whole frame (global contrast)
  saturation      mean HSV saturation, JPEG control applied to the render
  warmth          mean (R - B), JPEG control applied to the render
  gradient energy mean Sobel gradient magnitude (edge and detail content)
  spectrum bands  ratio of radially averaged power, render over photo, in five
                  bands of cycles per frame: 10-25, 25-60, 60-140, 140-300, 300-500.
                  1.000 is a match; below 1 the render is smoother than the
                  photograph at that scale, above 1 it is busier.

Usage:
  python3 platform/tools/photoreal/stats.py --render <img> --photo <img> [--width 1000] [--json]
Prints a table of render, photo, delta and a verdict per row. With --json the
same numbers are printed as one JSON object after the table.
"""
import argparse
import io
import json
import os
import sys

import numpy as np
from PIL import Image

RESAMPLE = Image.LANCZOS
BANDS = [(10, 25), (25, 60), (60, 140), (140, 300), (300, 500)]


def load_rgb(path, width, aspect=None):
    im = Image.open(path).convert('RGB')
    if aspect is None:
        aspect = im.width / im.height
    h = max(1, round(width / aspect))
    if abs(im.width / im.height - aspect) > 1e-3:
        # Letterbox onto the photograph's aspect so the two arrays line up.
        scale = min(width / im.width, h / im.height)
        w2, h2 = max(1, round(im.width * scale)), max(1, round(im.height * scale))
        im = im.resize((w2, h2), RESAMPLE)
        canvas = Image.new('RGB', (width, h), (0, 0, 0))
        canvas.paste(im, ((width - w2) // 2, (h - h2) // 2))
        im = canvas
    else:
        im = im.resize((width, h), RESAMPLE)
    return im


def jpeg_control(path, width, quality=92):
    """Round trip through JPEG q92 4:2:0 at the photograph's width, then decode."""
    im = Image.open(path).convert('RGB')
    if im.width != width:
        im = im.resize((width, max(1, round(im.height * width / im.width))), RESAMPLE)
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=quality, subsampling=2)
    buf.seek(0)
    return Image.open(buf).convert('RGB')


def to_float(im):
    return np.asarray(im, dtype=np.float32) / 255.0


def luma(arr):
    return 0.2126 * arr[..., 0] + 0.7152 * arr[..., 1] + 0.0722 * arr[..., 2]


def saturation(arr):
    mx = arr.max(axis=2)
    mn = arr.min(axis=2)
    with np.errstate(divide='ignore', invalid='ignore'):
        s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0.0)
    return float(s.mean())


def block_sigma(gray, n=12):
    h, w = gray.shape
    bh, bw = h // n, w // n
    sig = []
    for by in range(n):
        for bx in range(n):
            blk = gray[by * bh:(by + 1) * bh, bx * bw:(bx + 1) * bw]
            sig.append(blk.std())
    return float(np.mean(sig))


def sobel_energy(gray):
    kx = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=np.float32)
    ky = kx.T
    p = np.pad(gray, 1, mode='edge')
    gx = np.zeros_like(gray)
    gy = np.zeros_like(gray)
    for dy in range(3):
        for dx in range(3):
            sl = p[dy:dy + gray.shape[0], dx:dx + gray.shape[1]]
            gx += kx[dy, dx] * sl
            gy += ky[dy, dx] * sl
    return float(np.hypot(gx, gy).mean())


def radial_power(gray):
    """Radially averaged power spectrum indexed by cycles per frame width."""
    g = gray - gray.mean()
    wy = np.hanning(g.shape[0])[:, None]
    wx = np.hanning(g.shape[1])[None, :]
    f = np.fft.fftshift(np.fft.fft2(g * wy * wx))
    p = np.abs(f) ** 2
    h, w = p.shape
    cy, cx = h // 2, w // 2
    yy, xx = np.indices(p.shape)
    # Normalize both axes to cycles per frame width so the radius is isotropic.
    r = np.sqrt(((xx - cx)) ** 2 + ((yy - cy) * (w / h)) ** 2)
    rint = r.astype(np.int32)
    total = np.bincount(rint.ravel(), weights=p.ravel())
    count = np.bincount(rint.ravel())
    with np.errstate(divide='ignore', invalid='ignore'):
        return np.where(count > 0, total / np.maximum(count, 1), 0.0)


def band_power(radial, lo, hi):
    hi = min(hi, len(radial) - 1)
    if hi <= lo:
        return 0.0
    return float(radial[lo:hi].mean())


def measure(render_path, photo_path, width=1000):
    photo_im = load_rgb(photo_path, width)
    aspect = photo_im.width / photo_im.height
    render_im = load_rgb(render_path, width, aspect)
    # Chroma control: the render through the photograph's JPEG pipeline at the
    # photograph's native width, then to the common width like everything else.
    photo_native_w = Image.open(photo_path).width
    ctrl = jpeg_control(render_path, photo_native_w)
    ctrl_im = ctrl.resize((render_im.width, render_im.height), RESAMPLE) if ctrl.size != render_im.size else ctrl

    P, R, C = to_float(photo_im), to_float(render_im), to_float(ctrl_im)
    lp, lr = luma(P), luma(R)
    rp, rr = radial_power(lp), radial_power(lr)

    rows = []

    def row(key, label, rv, pv, unit='', control=False, ratio=False):
        rows.append({'key': key, 'label': label, 'render': rv, 'photo': pv,
                     'delta': rv - pv, 'unit': unit, 'control': control, 'ratio': ratio})

    row('mean', 'frame mean luminance', float(lr.mean()), float(lp.mean()))
    row('clipped', 'clipped % (L >= 0.98)', float((lr >= 0.98).mean() * 100), float((lp >= 0.98).mean() * 100), '%')
    row('dark', 'dark % (L < 0.5)', float((lr < 0.5).mean() * 100), float((lp < 0.5).mean() * 100), '%')
    row('p1', 'p1 luminance', float(np.percentile(lr, 1)), float(np.percentile(lp, 1)))
    row('p99', 'p99 luminance', float(np.percentile(lr, 99)), float(np.percentile(lp, 99)))
    row('blockSigma', '12x12 block sigma', block_sigma(lr), block_sigma(lp))
    row('frameSigma', 'frame sigma', float(lr.std()), float(lp.std()))
    row('saturation', 'mean saturation', saturation(C), saturation(P), control=True)
    row('warmth', 'warmth (R - B)', float((C[..., 0] - C[..., 2]).mean()), float((P[..., 0] - P[..., 2]).mean()), control=True)
    row('gradient', 'gradient energy', sobel_energy(lr), sobel_energy(lp))
    for lo, hi in BANDS:
        pr, pp = band_power(rr, lo, hi), band_power(rp, lo, hi)
        ratio = pr / pp if pp > 0 else float('nan')
        rows.append({'key': f'spectrum_{lo}_{hi}', 'label': f'spectrum {lo}-{hi} c/frame',
                     'render': pr, 'photo': pp, 'delta': ratio, 'unit': 'ratio', 'control': False, 'ratio': True})
    return rows, {'width': width, 'size': [render_im.width, render_im.height]}


def verdict(r):
    if r['ratio']:
        x = r['delta']
        if x != x:
            return 'no photo power in band'
        if abs(x - 1) < 0.08:
            return 'match'
        return 'busier than photo' if x > 1 else 'smoother than photo'
    d = r['delta']
    scale = abs(r['photo']) if r['photo'] else 1.0
    rel = abs(d) / max(scale, 1e-6)
    if rel < 0.05:
        return 'match'
    return 'over' if d > 0 else 'under'


def fmt(v, r):
    if r['unit'] == '%':
        return f'{v:7.3f}%'
    if r['unit'] == 'ratio':
        return f'{v:8.3g}'
    return f'{v:8.4f}'


def table(rows, meta):
    lines = []
    lines.append(f"resampled both to {meta['size'][0]}x{meta['size'][1]} (LANCZOS); chroma rows marked * use the render after JPEG q92 4:2:0 at the photograph's width")
    lines.append(f"{'statistic':28} {'render':>10} {'photo':>10} {'delta':>10}  verdict")
    for r in rows:
        label = r['label'] + (' *' if r['control'] else '')
        if r['ratio']:
            d = f"{r['delta']:10.3f}"
        elif r['unit'] == '%':
            d = f"{r['delta']:+9.3f}%"
        else:
            d = f"{r['delta']:+10.4f}"
        lines.append(f"{label:28} {fmt(r['render'], r):>10} {fmt(r['photo'], r):>10} {d:>10}  {verdict(r)}")
    return '\n'.join(lines)


def markdown(rows, meta):
    lines = ['| statistic | render | photo | delta | verdict |', '|---|---|---|---|---|']
    for r in rows:
        label = r['label'] + (' (JPEG control)' if r['control'] else '')
        if r['ratio']:
            lines.append(f"| {label} | {r['render']:.4g} | {r['photo']:.4g} | ratio {r['delta']:.3f} | {verdict(r)} |")
        elif r['unit'] == '%':
            lines.append(f"| {label} | {r['render']:.3f}% | {r['photo']:.3f}% | {r['delta']:+.3f}% | {verdict(r)} |")
        else:
            lines.append(f"| {label} | {r['render']:.4f} | {r['photo']:.4f} | {r['delta']:+.4f} | {verdict(r)} |")
    return '\n'.join(lines)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--render', required=True)
    ap.add_argument('--photo', required=True)
    ap.add_argument('--width', type=int, default=1000)
    ap.add_argument('--json', action='store_true', help='also print the numbers as JSON')
    ap.add_argument('--markdown', action='store_true', help='print a markdown table instead of the plain one')
    args = ap.parse_args(argv)
    for name, p in (('render', args.render), ('photo', args.photo)):
        if not os.path.isfile(p):
            print(f'{name} not found: {p}', file=sys.stderr)
            return 2
    rows, meta = measure(args.render, args.photo, args.width)
    print(markdown(rows, meta) if args.markdown else table(rows, meta))
    if args.json:
        out = {r['key']: {'render': r['render'], 'photo': r['photo'], 'delta': r['delta'],
                          'verdict': verdict(r), 'jpegControl': r['control']} for r in rows}
        out['_meta'] = dict(meta, render=args.render, photo=os.path.basename(args.photo))
        print(json.dumps(out))
    return 0


if __name__ == '__main__':
    sys.exit(main())
