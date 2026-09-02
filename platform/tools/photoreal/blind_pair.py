#!/usr/bin/env python3
"""Build a genuine blind A/B composite for the render versus photograph loop.

Port of platform/tools/blind-pair.mjs to Pillow, with two additions the
critic log (research/king-studio/critic-log.md, round 3) demands:

  1. Before compositing, the render is round-tripped through JPEG q92 with
     4:2:0 chroma subsampling at the photograph's width, so the file-format
     fingerprint (blocking, chroma smoothing) is the same on both panels.
  2. Both images are resampled to the panel width with the same filter, so
     neither the original pixel size nor the resampling kernel can give the
     answer away.

Which panel holds the render is decided by sha256 of "h2sep|<view>|<round><salt>",
reproducible for us and not guessable by the critic. The answer key is written
beside the composite and the critic never sees it. The composite carries no EXIF.

Usage:
  python3 platform/tools/photoreal/blind_pair.py --view bed --round 3 --salt a \
      --render <jpg or png> --photo <jpg> --out <dir>

Prints JSON: {"composite": <path>, "key": <path>}.
"""
import argparse
import hashlib
import io
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

PANEL_W, PANEL_H = 1000, 750     # panel box, 4:3 like the photographs
BAND, GAP, PAD = 46, 16, 16      # label band, gap between panels, outer padding
BG = (24, 24, 26)
RESAMPLE = Image.LANCZOS
FONT_PATH = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'


def render_panel_for(view, rnd, salt):
    """The render lands in panel A when the first hash byte is even."""
    h = hashlib.sha256(f'h2sep|{view}|{rnd}{salt}'.encode('utf-8')).digest()
    return 'A' if h[0] % 2 == 0 else 'B'


def jpeg_roundtrip(im, width, quality=92):
    """Re-encode an image as JPEG q92 4:2:0 at the given width and decode it again.

    The photographs are JPEG q92 4:2:0 straight from the phone; a PNG render put
    beside one has sharper chroma and no block structure, which is a tell that has
    nothing to do with the picture.
    """
    if im.width != width:
        h = max(1, round(im.height * width / im.width))
        im = im.resize((width, h), RESAMPLE)
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=quality, subsampling=2, optimize=True)
    buf.seek(0)
    return Image.open(buf).convert('RGB')


def fit(im):
    """Letterbox onto the panel box, resampling with the common filter."""
    im = im.convert('RGB')
    scale = min(PANEL_W / im.width, PANEL_H / im.height)
    w = max(1, round(im.width * scale))
    h = max(1, round(im.height * scale))
    im = im.resize((w, h), RESAMPLE)
    canvas = Image.new('RGB', (PANEL_W, PANEL_H), BG)
    canvas.paste(im, ((PANEL_W - w) // 2, (PANEL_H - h) // 2))
    return canvas


def build(view, rnd, salt, render_path, photo_path, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    photo = Image.open(photo_path).convert('RGB')
    render = Image.open(render_path).convert('RGB')
    render = jpeg_roundtrip(render, photo.width)

    panel = render_panel_for(view, rnd, salt)
    a_im, b_im = (render, photo) if panel == 'A' else (photo, render)
    a, b = fit(a_im), fit(b_im)

    W = PAD * 2 + PANEL_W * 2 + GAP
    H = PAD * 2 + BAND + PANEL_H
    out = Image.new('RGB', (W, H), BG)
    out.paste(a, (PAD, PAD + BAND))
    out.paste(b, (PAD + PANEL_W + GAP, PAD + BAND))

    d = ImageDraw.Draw(out)
    try:
        font = ImageFont.truetype(FONT_PATH, 30)
    except Exception:
        font = ImageFont.load_default()
    d.text((PAD + PANEL_W // 2 - 14, PAD + 6), 'A', fill=(235, 235, 238), font=font)
    d.text((PAD + PANEL_W + GAP + PANEL_W // 2 - 14, PAD + 6), 'B', fill=(235, 235, 238), font=font)

    stem = f'{view}-r{rnd}{salt}'
    composite = os.path.join(out_dir, stem + '.png')
    key = os.path.join(out_dir, stem + '.key.json')
    # A fresh Image with no info dict: nothing from either source (EXIF, ICC,
    # text chunks) can leak into the composite.
    out.save(composite, 'PNG', optimize=True)
    with open(key, 'w') as f:
        json.dump({
            'view': view, 'round': rnd, 'salt': salt,
            'renderPanel': panel, 'photoPanel': 'B' if panel == 'A' else 'A',
            'photo': os.path.basename(photo_path), 'render': render_path,
            'composite': composite,
        }, f, indent=1)
    return composite, key


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--view', required=True)
    ap.add_argument('--round', required=True, type=int)
    ap.add_argument('--salt', default='a', help='one letter, varies the panel draw within a round')
    ap.add_argument('--render', required=True)
    ap.add_argument('--photo', required=True)
    ap.add_argument('--out', required=True, help='directory for the composite and its key')
    args = ap.parse_args(argv)
    for name, p in (('render', args.render), ('photo', args.photo)):
        if not os.path.isfile(p):
            print(f'{name} not found: {p}', file=sys.stderr)
            return 2
    composite, key = build(args.view, args.round, args.salt, args.render, args.photo, args.out)
    print(json.dumps({'composite': composite, 'key': key}))
    return 0


if __name__ == '__main__':
    sys.exit(main())
