#!/usr/bin/env python3
"""The camera signature: what a phone's lens, sensor and ISP do to a clean frame.

    python3 post.py <in.png> <out.jpg> --view <name>
    python3 post.py --measure <image> --box x,y,w,h [--width 2000]

Applied in this order, every parameter from camera_profile.json (defaults,
then the view's own "post" block if it has one):
  1. barrel distortion residue     the ultrawide is corrected in the phone, a
                                   little barrel survives (distort, k1)
  2. lateral chromatic aberration  red and blue scaled apart, rising with r^2 (ca)
  3. vignette                      cos^n style falloff at the corners
  4. tone curve                    a mild S: contrast about mid grey, lift in
                                   the toe, a soft shoulder; small saturation lift
  5. sharpening                    the unsharp mask every ISP applies
  6. sensor grain                  luminance noise with a little chroma, scaled
                                   by the view's ISO and rising into the shadows
  7. JPEG                          quality 92, 4:2:0 chroma, no EXIF

The grain level is calibrated with --measure on a flat wall patch of the
photograph at its 2000 px width: std of the patch minus its own 9 px blur.
MEASURED on the ceiling of photo-09 (bed): 0.0039 at 2000 px and 0.0038 at
1200 px; photo-04 and photo-02 ceilings 0.0039 and 0.0043.  The phone's
denoiser leaves noise that is spatially correlated, so it does not fall when
the frame is downsampled, and the render's grain is therefore NOT scaled by
the width ratio (grainWidthExponent 0 in the profile; 1 would be white
noise).  Everything is deliberately small.
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
PROFILE = os.path.join(HERE, 'camera_profile.json')


def load_params(profile_path, view):
    prof = json.load(open(profile_path))
    p = dict(prof.get('defaults', {}))
    v = prof.get('views', {}).get(view, {})
    p.update(v.get('post', {}))
    p['iso'] = v.get('iso', p.get('isoRef', 200))
    return p


def _remap(img, k1, scale_r=1.0, scale_b=1.0):
    """Radial resample: barrel by k1 and per channel scale for lateral CA."""
    h, w = img.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = (w - 1) / 2.0, (h - 1) / 2.0
    nx = (xx - cx) / cx
    ny = (yy - cy) / cx          # normalise by the half width so r is isotropic
    r2 = nx * nx + ny * ny
    out = np.empty_like(img)
    for c, s in ((0, scale_r), (1, 1.0), (2, scale_b)):
        # source position for each output pixel: pull inward for barrel
        f = (1.0 + k1 * r2) * s
        sx = cx + nx * f * cx
        sy = cy + ny * f * cx
        out[..., c] = _bilinear(img[..., c], sx, sy)
    return out


def _bilinear(ch, sx, sy):
    h, w = ch.shape
    sx = np.clip(sx, 0, w - 1.001)
    sy = np.clip(sy, 0, h - 1.001)
    x0 = np.floor(sx).astype(np.int32)
    y0 = np.floor(sy).astype(np.int32)
    fx = sx - x0
    fy = sy - y0
    a = ch[y0, x0]
    b = ch[y0, x0 + 1]
    c = ch[y0 + 1, x0]
    d = ch[y0 + 1, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def _tone(x, contrast, lift, shoulder, saturation):
    # S curve about mid grey, then a soft shoulder that keeps the very top from
    # clipping in one hard step (the phone's HDR merge does this)
    y = 0.5 + (x - 0.5) * (1.0 + contrast) - (x - 0.5) ** 3 * contrast * 2.0
    y = lift + y * (1.0 - lift)
    hi = y > shoulder
    y = np.where(hi, shoulder + (1.0 - shoulder) * (1.0 - np.exp(-(y - shoulder) / (1.0 - shoulder + 1e-6))), y)
    y = np.clip(y, 0.0, 1.0)
    if abs(saturation - 1.0) > 1e-3:
        lum = y @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
        y = lum[..., None] + (y - lum[..., None]) * saturation
        y = np.clip(y, 0.0, 1.0)
    return y


def _sharpen(img, amount, radius):
    pil = Image.fromarray((np.clip(img, 0, 1) * 255.0 + 0.5).astype(np.uint8))
    blur = np.asarray(pil.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32) / 255.0
    return np.clip(img + (img - blur) * amount, 0.0, 1.0)


def _grain(img, std, shadow_gain, chroma, iso, iso_ref, width_ratio, seed):
    rng = np.random.default_rng(seed)
    h, w = img.shape[:2]
    lum = img @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    # a small sensor's noise grows with ISO (roughly with its square root in
    # the display domain) and is loudest in the shadows after the tone curve
    level = std * np.sqrt(max(iso, 1) / float(iso_ref)) * width_ratio
    weight = 1.0 + shadow_gain * (1.0 - np.clip(lum, 0, 1)) ** 2
    n_l = rng.standard_normal((h, w), dtype=np.float32) * level * weight
    n_c = rng.standard_normal((h, w, 3), dtype=np.float32) * level * chroma * weight[..., None]
    return np.clip(img + n_l[..., None] + n_c, 0.0, 1.0)


def apply_signature(in_path, out_path, view, profile_path=PROFILE, seed=None):
    p = load_params(profile_path, view)
    img = np.asarray(Image.open(in_path).convert('RGB'), dtype=np.float32) / 255.0
    h, w = img.shape[:2]
    # 1 + 2: distortion residue and lateral CA in one resample
    ca = float(p.get('ca', 0.0))
    img = _remap(img, float(p.get('distort', 0.0)), 1.0 + ca, 1.0 - ca)
    # 3: vignette
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    nx = (xx - (w - 1) / 2.0) / ((w - 1) / 2.0)
    ny = (yy - (h - 1) / 2.0) / ((w - 1) / 2.0)
    r = np.sqrt(nx * nx + ny * ny) / np.sqrt(1.0 + (h / float(w)) ** 2)
    vig = 1.0 - float(p.get('vignette', 0.0)) * r ** float(p.get('vignettePower', 2.0))
    img = img * vig[..., None]
    # 4: tone
    img = _tone(img, float(p.get('contrast', 0.0)), float(p.get('lift', 0.0)),
                float(p.get('shoulder', 1.0)), float(p.get('saturation', 1.0)))
    # 5: sharpen
    img = _sharpen(img, float(p.get('sharpen', 0.0)), float(p.get('sharpenRadius', 1.0)))
    # 6: grain, calibrated at the photograph's width
    width_ratio = (float(p.get('measureWidth', 2000)) / float(w)) ** float(p.get('grainWidthExponent', 0.0))
    if seed is None:
        seed = abs(hash(view)) % (2 ** 31)
    img = _grain(img, float(p.get('grainStd', 0.0)), float(p.get('grainShadowGain', 0.0)),
                 float(p.get('grainChroma', 0.0)), float(p['iso']), float(p.get('isoRef', 200)),
                 width_ratio, seed)
    # 7: JPEG, 4:2:0, no EXIF
    out = Image.fromarray((img * 255.0 + 0.5).astype(np.uint8))
    out.save(out_path, 'JPEG', quality=int(p.get('jpegQuality', 92)), subsampling=2, optimize=True)
    return out_path


def measure(path, box, width):
    """Noise of a flat patch: std of luminance minus its own 9 px blur, at a common width."""
    im = Image.open(path).convert('RGB')
    if im.width != width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    x, y, bw, bh = box
    crop = im.crop((x, y, x + bw, y + bh))
    a = np.asarray(crop, dtype=np.float32) / 255.0
    lum = a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    blur = np.asarray(Image.fromarray((lum * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4.5)), dtype=np.float32) / 255.0
    resid = lum - blur
    return {'path': path, 'box': box, 'width': width, 'mean': float(lum.mean()),
            'std': float(resid.std()), 'chromaStd': float((a - lum[..., None]).std())}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('inp', nargs='?')
    ap.add_argument('out', nargs='?')
    ap.add_argument('--view', default='bed')
    ap.add_argument('--profile', default=PROFILE)
    ap.add_argument('--measure', default=None)
    ap.add_argument('--box', default='0,0,64,64')
    ap.add_argument('--width', type=int, default=2000)
    a = ap.parse_args()
    if a.measure:
        box = [int(v) for v in a.box.split(',')]
        print(json.dumps(measure(a.measure, box, a.width)))
        return
    if not a.inp or not a.out:
        ap.error('need <in.png> <out.jpg> or --measure')
    apply_signature(a.inp, a.out, a.view, a.profile)
    print(a.out)


if __name__ == '__main__':
    main()
