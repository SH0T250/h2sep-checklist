#!/usr/bin/env python3
"""Shower surround tile for the King Studio render: seamless maps at true scale.

    python3 platform/tools/photoreal/textures/showerTile.py

Writes to textures/out/:
  showerTile_color.png   sRGB base colour
  showerTile_rough.png   linear roughness
  showerTile_bump.png    linear height for a Bump node
  showerTile.json        the repeat in metres, the map files, the bump distance
                         (materials.OVERRIDES['showerTile'] = {'textures': 'showerTile'})

What the photographs fix (20260812_141304 photo-24, 20260812_141302 photo-23):
  format   a white 12 by 24 inch glazed wall tile laid in a horizontal running
           bond with a half offset; in photo-24 the back wall carries seven
           courses between the curb and the header, which at 12 inches each
           is the 6.5 ft header height the enclosure has.
  colour   plain white, neutral to a hair warm: in photo-24 the back wall
           reads sRGB (0.72, 0.72, 0.70) beside the moulded base at (0.69,
           0.68, 0.65), so the tile is at least as bright as the base, which
           the exhibit draws as #fbfaf8.  The grout is a light warm grey a
           little darker than the tile and barely reads at 1000 px.
  finish   glazed: sharp reflections of the downlight and the header bar with
           a faint waviness across each tile (a pressed glaze, not a mirror).
SCALED: the grout width (1/16 inch, the usual for a rectified wall tile) and
the amount of glaze waviness.
"""
import json
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')

FT = 0.3048
TILE_W = 2.0 * FT            # 24 inches
TILE_H = 1.0 * FT            # 12 inches
REPEAT = (TILE_W, 2.0 * TILE_H)   # one tile wide, two courses tall (the half offset repeats every two)
N = 1024                     # pixels across one repeat (0.6 mm per pixel)
PX_M = REPEAT[0] / N
SEED = 110

TILE = np.array([0.86, 0.855, 0.835], np.float32)   # linear albedo, white glaze a hair warm
GROUT = np.array([0.56, 0.54, 0.50], np.float32)    # light warm grey grout
GROUT_MM = 1.6               # SCALED 1/16 inch
BUMP_DISTANCE_M = 0.0008


def linear_to_srgb(c):
    c = np.clip(c, 0.0, 1.0)
    return np.where(c <= 0.0031308, 12.92 * c, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def periodic_noise(rng, shape, sigma_px):
    """Tileable low frequency noise in 0..1 (FFT blurred white noise)."""
    n = rng.standard_normal(shape).astype(np.float32)
    F = np.fft.rfft2(n)
    fy = np.fft.fftfreq(shape[0])[:, None]
    fx = np.fft.rfftfreq(shape[1])[None, :]
    g = np.exp(-2.0 * (np.pi * sigma_px) ** 2 * (fx ** 2 + fy ** 2))
    b = np.fft.irfft2(F * g, s=shape).astype(np.float32)
    b -= b.mean()
    b /= (b.std() + 1e-9)
    return b


def main():
    os.makedirs(OUT, exist_ok=True)
    rng = np.random.default_rng(SEED)
    W = N
    H = int(round(N * REPEAT[1] / REPEAT[0]))
    ys, xs = np.mgrid[0:H, 0:W]
    course_h = H / 2.0
    g = GROUT_MM / 1000.0 / PX_M          # grout width in pixels
    course = np.floor(ys / course_h).astype(int)
    v = ys - course * course_h            # position within the course
    u = (xs + (course % 2) * (W / 2.0)) % W   # half offset on alternate courses
    # distance to the nearest grout centre line, in pixels
    dv = np.minimum(v, course_h - v)
    du = np.minimum(u, W - u)
    d = np.minimum(dv, du)
    grout = np.clip((g / 2.0 + 0.5 - d), 0.0, 1.0)          # 1 inside the grout, soft 1 px edge
    ease = np.clip((d - g / 2.0) / 3.0, 0.0, 1.0)            # 3 px eased tile arris

    # colour: white glaze with a faint cloud, grout a little darker
    cloud = periodic_noise(rng, (H, W), 40.0) * 0.012
    tile_col = TILE[None, None, :] * (1.0 + cloud[..., None])
    color = tile_col * (1.0 - grout[..., None]) + GROUT[None, None, :] * grout[..., None]

    # roughness: glaze 0.10 with a slow waviness, grout matte
    wave = periodic_noise(rng, (H, W), 25.0) * 0.02
    rough = np.clip(0.10 + wave, 0.06, 0.16) * (1.0 - grout) + 0.75 * grout

    # height: grout recessed, tile face nearly flat with a faint glaze ripple
    ripple = periodic_noise(rng, (H, W), 12.0) * 0.03
    h = np.clip(0.75 + ripple, 0.0, 1.0) * ease * (1.0 - grout) + 0.15 * grout

    Image.fromarray((linear_to_srgb(color) * 255 + 0.5).astype(np.uint8), 'RGB').save(os.path.join(OUT, 'showerTile_color.png'), optimize=True)
    Image.fromarray((np.clip(rough, 0, 1) * 255 + 0.5).astype(np.uint8), 'L').save(os.path.join(OUT, 'showerTile_rough.png'), optimize=True)
    Image.fromarray((np.clip(h, 0, 1) * 255 + 0.5).astype(np.uint8), 'L').save(os.path.join(OUT, 'showerTile_bump.png'), optimize=True)
    spec = {
        'surface': 'showerTile',
        'repeat_m': [REPEAT[0], REPEAT[1]],
        'pixels': {'color': [W, H], 'roughness': [W, H], 'bump': [W, H]},
        'maps': {'color': 'showerTile_color.png', 'roughness': 'showerTile_rough.png', 'bump': 'showerTile_bump.png'},
        'bump_distance_m': BUMP_DISTANCE_M,
        'projection': 'box',
        'notes': 'white 12 by 24 glazed tile, half offset running bond, from photo-24 and photo-23; grout width SCALED',
    }
    with open(os.path.join(OUT, 'showerTile.json'), 'w') as f:
        json.dump(spec, f, indent=1)
    print(os.path.join(OUT, 'showerTile.json'))


if __name__ == '__main__':
    main()
