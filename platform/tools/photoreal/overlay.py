#!/usr/bin/env python3
"""Camera matching aid: put a render over its photograph so a fix agent can see
where the camera station, focal length and framing disagree.

Both images are resampled to the same width (default 1000 px) with the same
filter before anything is compared, per critic-log.md round 3. If the aspect
ratios differ the render is letterboxed onto the photograph's aspect, so
nothing is stretched.

Modes:
  blend  50/50 mix of photo and render. Doubled edges show the misalignment.
  edges  Sobel edges of both drawn in two colors on mid gray: photo edges in
         cyan, render edges in orange. Where they coincide the line goes white.
  wipe   left half photograph, right half render, with a one pixel seam line.
  diff   absolute difference of luminance, scaled so a 0.25 difference is white.

Usage:
  python3 platform/tools/photoreal/overlay.py --mode blend --render <img> --photo <img> \
      --out <path or dir> [--width 1000]
Prints the output path.
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image

RESAMPLE = Image.LANCZOS
GREY = (118, 118, 118)


def load(path, width, aspect=None):
    im = Image.open(path).convert('RGB')
    if aspect is None:
        aspect = im.width / im.height
    h = max(1, round(width / aspect))
    scale = min(width / im.width, h / im.height)
    w2, h2 = max(1, round(im.width * scale)), max(1, round(im.height * scale))
    im = im.resize((w2, h2), RESAMPLE)
    canvas = Image.new('RGB', (width, h), GREY)
    canvas.paste(im, ((width - w2) // 2, (h - h2) // 2))
    return canvas


def luma(arr):
    return 0.2126 * arr[..., 0] + 0.7152 * arr[..., 1] + 0.0722 * arr[..., 2]


def sobel(gray):
    """Gradient magnitude, normalized to the 99th percentile of the frame."""
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
    mag = np.hypot(gx, gy)
    top = np.percentile(mag, 99) or 1.0
    return np.clip(mag / top, 0, 1)


def mode_blend(photo, render):
    return Image.blend(photo, render, 0.5)


def mode_edges(photo, render):
    ep = sobel(luma(np.asarray(photo, dtype=np.float32) / 255.0))
    er = sobel(luma(np.asarray(render, dtype=np.float32) / 255.0))
    out = np.empty(ep.shape + (3,), dtype=np.float32)
    base = 0.42
    # photo edges: cyan (add to G and B); render edges: orange (add to R, half to G).
    out[..., 0] = base + 0.58 * er
    out[..., 1] = base + 0.58 * ep + 0.30 * er
    out[..., 2] = base + 0.58 * ep
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))


def mode_wipe(photo, render):
    w, h = photo.size
    out = photo.copy()
    out.paste(render.crop((w // 2, 0, w, h)), (w // 2, 0))
    px = out.load()
    for y in range(h):
        px[w // 2, y] = (255, 210, 60)
    return out


def mode_diff(photo, render):
    lp = luma(np.asarray(photo, dtype=np.float32) / 255.0)
    lr = luma(np.asarray(render, dtype=np.float32) / 255.0)
    d = np.clip(np.abs(lp - lr) / 0.25, 0, 1)
    return Image.fromarray((d * 255).astype(np.uint8)).convert('RGB')


MODES = {'blend': mode_blend, 'edges': mode_edges, 'wipe': mode_wipe, 'diff': mode_diff}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--mode', choices=sorted(MODES), default='blend')
    ap.add_argument('--render', required=True)
    ap.add_argument('--photo', required=True)
    ap.add_argument('--width', type=int, default=1000)
    ap.add_argument('--out', required=True, help='output file, or a directory for overlay-<mode>.jpg')
    args = ap.parse_args(argv)
    for name, p in (('render', args.render), ('photo', args.photo)):
        if not os.path.isfile(p):
            print(f'{name} not found: {p}', file=sys.stderr)
            return 2
    photo = load(args.photo, args.width)
    render = load(args.render, args.width, aspect=photo.width / photo.height)
    out_im = MODES[args.mode](photo, render)
    out = args.out
    if os.path.isdir(out) or out.endswith('/'):
        os.makedirs(out, exist_ok=True)
        out = os.path.join(out, f'overlay-{args.mode}.jpg')
    else:
        os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    if out.lower().endswith('.png'):
        out_im.save(out, 'PNG', optimize=True)
    else:
        out_im.save(out, 'JPEG', quality=92)
    print(out)
    return 0


if __name__ == '__main__':
    sys.exit(main())
