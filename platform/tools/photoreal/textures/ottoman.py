#!/usr/bin/env python3
"""The lounge ottoman's upholstery for the King Studio render: seamless maps at true scale.

    python3 platform/tools/photoreal/textures/ottoman.py

Writes to textures/out/:
  ottoman_color.png   sRGB base colour
  ottoman_rough.png   linear roughness
  ottoman.json        the repeat in metres and the map files
                      (materials.OVERRIDES['ottoman'] = {'textures': 'ottoman'})

What the photograph fixes (20260812_141158 photo-02, the ottoman in front of
the sofa, and 20260812_141120 photo-11):
  pattern  a tessellation of equilateral triangles in navy and cream with a
           few slate blue ones, each triangle about 2.6 in tall (six to seven
           rows across the 17 in face), the colours falling without a strict
           order.  The exhibit drew a grey and white lattice.
  colour   sampled on the front face: the darkest fifth of the pixels read
           sRGB (30, 32, 38), the lightest fifth (143, 137, 128), so the navy
           sits about 3.5 stops under the cream in the same light.
  finish   a flat woven cotton, no sheen.
STYLIZED: which triangle takes which colour (a seeded draw), the share of
slate triangles, and the weave noise.
"""
import json
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')

IN = 0.0254
SIDE = 3.0 * IN                          # triangle side, 2.6 in tall
H = SIDE * np.sqrt(3.0) / 2.0
COLS, ROWS = 4, 4                        # cells per repeat; rows alternate a half cell offset
REPEAT = (COLS * SIDE, ROWS * H)         # 0.305 m by 0.264 m, seamless
N = 768                                  # pixels across one repeat
SEED = 158

NAVY = np.array([0.028, 0.034, 0.058], np.float32)    # linear albedo
CREAM = np.array([0.60, 0.56, 0.48], np.float32)
SLATE = np.array([0.12, 0.15, 0.20], np.float32)
ROUGH = 0.85


def linear_to_srgb(c):
    c = np.clip(c, 0.0, 1.0)
    return np.where(c <= 0.0031308, 12.92 * c, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def triangle_index(x, y):
    """Which triangle of the lattice each point falls in: (index along the row, row)."""
    r = np.floor(y / H).astype(int)
    yf = y - r * H
    xs = x - (r % 2) * SIDE / 2.0
    c = np.floor(xs / SIDE).astype(int)
    xf = xs - c * SIDE
    up = np.abs(xf - SIDE / 2.0) <= (1.0 - yf / H) * SIDE / 2.0
    idx = np.where(up, 2 * c, np.where(xf > SIDE / 2.0, 2 * c + 1, 2 * c - 1))
    return idx, r


def main():
    os.makedirs(OUT, exist_ok=True)
    rng = np.random.default_rng(SEED)
    ny = int(round(N * REPEAT[1] / REPEAT[0]))
    ys, xs = np.mgrid[0:ny, 0:N]
    x = (xs + 0.5) / N * REPEAT[0]
    y = (ys + 0.5) / ny * REPEAT[1]
    idx, r = triangle_index(x, y)
    ncol = 2 * COLS
    idx = np.mod(idx, ncol)
    r = np.mod(r, ROWS)
    draw = rng.random((ROWS, ncol))
    palette = np.where(draw[..., None] < 0.45, NAVY, np.where(draw[..., None] < 0.85, CREAM, SLATE))
    color = palette[r, idx].astype(np.float32)
    # weave: fine noise, a few percent, the same on every channel
    weave = 1.0 + 0.06 * (rng.random((ny, N, 1)).astype(np.float32) - 0.5)
    color = color * weave
    rough = np.full((ny, N), ROUGH, np.float32) + 0.03 * (rng.random((ny, N)).astype(np.float32) - 0.5)
    Image.fromarray((linear_to_srgb(color) * 255 + 0.5).astype(np.uint8)).save(os.path.join(OUT, 'ottoman_color.png'))
    Image.fromarray((np.clip(rough, 0, 1) * 255 + 0.5).astype(np.uint8)).save(os.path.join(OUT, 'ottoman_rough.png'))
    spec = {
        'repeat_m': [REPEAT[0], REPEAT[1]],
        'maps': {'color': 'ottoman_color.png', 'roughness': 'ottoman_rough.png'},
        'projection': 'box',
        'source': 'textures/ottoman.py, photo-02 20260812_141158',
    }
    with open(os.path.join(OUT, 'ottoman.json'), 'w') as f:
        json.dump(spec, f, indent=1)
    print(os.path.join(OUT, 'ottoman.json'))


if __name__ == '__main__':
    main()
