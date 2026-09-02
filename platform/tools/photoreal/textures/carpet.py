#!/usr/bin/env python3
"""Guest room carpet for the King Studio render: seamless maps at true scale.

    python3 platform/tools/photoreal/textures/carpet.py

Writes to textures/out/:
  carpet_color.png   sRGB base colour
  carpet_rough.png   linear roughness
  carpet_bump.png    linear height for a Bump node
  carpet.json        the physical size of one repeat in metres, the map files,
                     the bump distance and the Principled inputs the material
                     needs (materials.OVERRIDES['carpet'] = {'textures': 'carpet'})

Deterministic: numpy's default_rng with a fixed seed, no Pillow filters that
depend on the platform.  Pillow and numpy only.

What the photographs fix (entry 20260812_141012, lounge 20260812_141158, bed
20260812_141100), all Galaxy S25 Ultra ultrawide frames with auto white balance
under mixed daylight and 3000 K lamps, so every colour below was reasoned
against the white painted ceiling in the same frame rather than read as an
absolute:

  field    a very dark charcoal with a hint of navy.  0.29 to 0.33 of the
           ceiling white in sRGB in the entry foreground, 0.25 to 0.27 in the
           lamp lit lounge, neutral to slightly cooler than the white.
  motifs   shards, long isosceles triangles and parallelograms, 250 to 550 mm
           long and 80 to 220 mm wide, filled with parallel DASHED hatch lines
           about 22 mm apart and 7 to 10 mm wide, the way a cut and loop
           carpet draws a line in a second yarn.  Three yarns: a light grey
           (0.55 to 0.68 of the white, slightly cooler than the field), a
           muted mustard gold (0.5 to 0.65 of the white with R about 1.45 B in
           linear light) and a pale blue (a smaller share).  Roughly 12 percent
           of the field area is light yarn, 3 to 4 percent mustard.
  scale    from the entry photograph with the 13 mm equivalent lens (720 px
           focal length at 2000 px width), the camera about 1.5 m up and its
           horizon 50 px above centre: a floor pixel at row 1190 is 2.2 m out
           and 3.1 mm wide, and the mustard shard there is 110 px, so about
           340 mm; the hatch pitch measures 8 to 10 px at rows near 1300
           (2.5 mm per px), so 20 to 25 mm.  Both carry the camera height
           uncertainty, about 15 percent.
  pile     cut pile: every boundary is fuzzy, the yarn lines are ragged, a
           soft sheen.  The maps carry tuft scale noise (about 2.5 mm) in
           colour, roughness and height, and the shard edges are jittered.

SCALED: the size of one repeat.  A hospitality broadloom repeats, but no
photograph shows two copies of the same motif, so the repeat is kept at the
exhibit's 3 ft tile (0.9144 m) and the motifs are laid out so that the tile
does not read as a grid.
STYLIZED: the exact shard shapes, their count per tile and the hatch angles;
the photographs fix the family, the sizes and the coverage, not the drawing.
"""
import json
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')

N = 2048                     # pixels per repeat
REPEAT_M = 0.9144            # SCALED: 3 ft, the exhibit's tile
PX_M = REPEAT_M / N          # 0.4465 mm per pixel
SEED = 110                   # room 110

# Albedos in linear light.  The field is the anchor: a 0.033 mean albedo is
# the dark end of a charcoal cut pile.  The photographs put the field a third
# of the way up the ceiling white in sRGB under the entry downlight, and
# bluer than the white by about 1.3 in linear light; a probe render with a
# flat 0.04 floor still sat at 0.54 of the ceiling, so the rest of that gap
# is the entry's light balance, not the carpet.  The yarns are multiples of
# the field measured in the photographs (see the module docstring).
FIELD = np.array([0.027, 0.030, 0.040], np.float32)            # charcoal navy
LIGHT = np.array([0.118, 0.124, 0.146], np.float32)            # light grey, slightly cool
MUSTARD = np.array([0.150, 0.112, 0.058], np.float32)          # muted mustard gold
BLUE = np.array([0.084, 0.102, 0.150], np.float32)             # pale blue, the rare yarn
TONAL = 1.35                 # tonal blocks: the field lightened, no second yarn

HATCH_PITCH_MM = 22.0        # measured 20 to 25 mm
HATCH_WIDTH_MM = 7.0         # measured 7 to 10 mm; the render read fat at 9
DASH_MM = (28.0, 60.0)       # dash length range
GAP_MM = (9.0, 16.0)         # gap range
BUMP_DISTANCE_M = 0.0012     # pile relief the Bump node sees


def mm(v):
    """Millimetres to pixels."""
    return v / 1000.0 / PX_M


def linear_to_srgb(c):
    c = np.clip(c, 0.0, 1.0)
    return np.where(c <= 0.0031308, 12.92 * c, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def periodic_noise(rng, sigma_px):
    """Seamless Gaussian filtered white noise, unit variance, zero mean.

    Filtering in the frequency domain makes the tile periodic by construction,
    so the pile texture never shows a seam.
    """
    w = rng.standard_normal((N, N)).astype(np.float32)
    F = np.fft.rfft2(w)
    ky = np.fft.fftfreq(N)[:, None]
    kx = np.fft.rfftfreq(N)[None, :]
    g = np.exp(-2.0 * (np.pi * sigma_px) ** 2 * (kx ** 2 + ky ** 2))
    n = np.fft.irfft2(F * g, s=(N, N)).astype(np.float32)
    n -= n.mean()
    n /= n.std() + 1e-9
    return n


def blur(a, sigma_px):
    """Seamless Gaussian blur of one channel."""
    F = np.fft.rfft2(a.astype(np.float32))
    ky = np.fft.fftfreq(N)[:, None]
    kx = np.fft.rfftfreq(N)[None, :]
    g = np.exp(-2.0 * (np.pi * sigma_px) ** 2 * (kx ** 2 + ky ** 2))
    return np.fft.irfft2(F * g, s=(N, N)).astype(np.float32)


def wrap(d):
    """Shortest periodic offset on the tile."""
    return (d + N / 2.0) % N - N / 2.0


def shard(Xj, Yj, cx, cy, ang, kind, length, width, shear=0.0):
    """Inside mask and local (u, v) for one shard, periodic on the tile."""
    dx = wrap(Xj - cx)
    dy = wrap(Yj - cy)
    c, s = np.cos(ang), np.sin(ang)
    u = dx * c + dy * s
    v = -dx * s + dy * c
    if kind == 'tri':
        # base at u = -length/2, point at u = +length/2
        half = (width / 2.0) * (length / 2.0 - u) / length
        inside = (u > -length / 2.0) & (u < length / 2.0) & (np.abs(v) < half)
    else:
        inside = (np.abs(v) < width / 2.0) & (np.abs(u - v * shear) < length / 2.0)
    return inside, u, v


def hatch(u, v, hang, pitch, width, dash, gap, salt):
    """Dashed parallel lines across a shard's local frame."""
    hc, hs = np.cos(hang), np.sin(hang)
    a = u * hc + v * hs            # across the lines
    b = -u * hs + v * hc           # along the lines
    idx = np.floor(a / pitch)
    inband = (a - idx * pitch) < width
    period = dash + gap
    phase = np.mod(np.sin(idx * 12.9898 + salt) * 43758.5453, 1.0) * period
    ondash = np.mod(b + phase, period) < dash
    return inband & ondash


MAX_BYTES = 2 * 1024 * 1024   # the maps are committed; each stays under 2 MB


def save(img, name):
    """Write a map, stepping the size down until the file is under MAX_BYTES.
    Returns the pixel size written."""
    path = os.path.join(OUT, name)
    for px in (N, 1536, 1024, 768):
        im = img if px == img.size[0] else img.resize((px, px), Image.LANCZOS)
        im.save(path, optimize=True)
        if os.path.getsize(path) <= MAX_BYTES:
            return px
    return px


def main():
    rng = np.random.default_rng(SEED)
    os.makedirs(OUT, exist_ok=True)

    ys, xs = np.mgrid[0:N, 0:N].astype(np.float32)
    # every boundary in a cut pile is slightly ragged: jitter the sampling
    # position by about half a millimetre at a 1.5 mm scale before any shape
    # is evaluated (a tuft's worth, no more; the photographs' dashes are neat)
    jit = mm(0.55)
    Xj = xs + jit * periodic_noise(rng, mm(0.7))
    Yj = ys + jit * periodic_noise(rng, mm(0.7))

    # field: charcoal with a slow mottle (dye lot and soil, +-8 percent)
    mottle = 1.0 + 0.08 * periodic_noise(rng, mm(120.0))
    color = FIELD[None, None, :] * mottle[:, :, None]
    height = np.zeros((N, N), np.float32)
    yarn = np.zeros((N, N), np.float32)        # 0 field, 1 second yarn

    # tonal blocks: three big parallelograms per tile where the field is a
    # shade lighter, no second yarn.  STYLIZED count and placement.
    for _ in range(3):
        m, _, _ = shard(Xj, Yj, rng.uniform(0, N), rng.uniform(0, N),
                        rng.choice([0.0, np.pi / 3, 2 * np.pi / 3]) + rng.normal(0, 0.1),
                        'para', mm(rng.uniform(380, 560)), mm(rng.uniform(140, 260)),
                        shear=rng.uniform(-0.6, 0.6))
        color[m] *= TONAL

    # motif shards.  Orientation from a family of six directions with jitter so
    # the shards read as one design rather than a scatter.  STYLIZED count:
    # eleven per tile leaves about three quarters of the field plain, which
    # is what the entry photograph shows (12 percent light yarn coverage with
    # the dashes filling about 40 percent of a shard).
    angles = np.arange(6) * np.pi / 6.0
    shards = []
    for i in range(11):
        kind = 'tri' if rng.random() < 0.6 else 'para'
        length = mm(rng.uniform(230, 500))
        width = mm(rng.uniform(80, 220)) if kind == 'tri' else mm(rng.uniform(60, 150))
        r = rng.random()
        yarn_col = LIGHT if r < 0.66 else (MUSTARD if r < 0.93 else BLUE)
        shards.append(dict(
            cx=rng.uniform(0, N), cy=rng.uniform(0, N),
            ang=rng.choice(angles) + rng.normal(0, 0.12),
            kind=kind, length=length, width=width,
            shear=rng.uniform(-0.7, 0.7),
            # hatch along the shard, across it, or at 45 degrees
            hang=rng.choice([0.0, np.pi / 2, np.pi / 4, -np.pi / 4]) + rng.normal(0, 0.05),
            dash=mm(rng.uniform(*DASH_MM)), gap=mm(rng.uniform(*GAP_MM)),
            col=yarn_col * rng.uniform(0.9, 1.1),
            salt=float(i) * 7.13,
        ))
    pitch = mm(HATCH_PITCH_MM)
    lw = mm(HATCH_WIDTH_MM)
    for sd in shards:
        inside, u, v = shard(Xj, Yj, sd['cx'], sd['cy'], sd['ang'], sd['kind'],
                             sd['length'], sd['width'], sd['shear'])
        lines = inside & hatch(u, v, sd['hang'], pitch, lw, sd['dash'], sd['gap'], sd['salt'])
        color[lines] = sd['col']
        yarn[lines] = 1.0
        # the second yarn stands a touch proud of the field
        height[lines] = 1.0

    # pile: tufts about 2.5 mm across and finer fibre noise
    tuft = periodic_noise(rng, mm(1.1))
    fibre = periodic_noise(rng, mm(0.35))
    shade = 1.0 + 0.10 * tuft + 0.05 * fibre
    color = color * np.clip(shade, 0.6, 1.4)[:, :, None]
    # a one pixel blur softens every edge the way pile does
    for ch in range(3):
        color[:, :, ch] = blur(color[:, :, ch], 1.0)
    color = np.clip(color, 0.0, 1.0)

    # roughness: high everywhere, the second yarn a touch smoother, tuft noise
    rough = 0.84 + 0.05 * tuft - 0.04 * blur(yarn, 1.0)
    rough = np.clip(rough, 0.55, 1.0)

    # height: tufts plus the proud yarn, one pixel blur
    h = 0.5 + 0.16 * tuft + 0.06 * fibre + 0.22 * (blur(height, 1.2) - 0.5)
    h = np.clip(h, 0.0, 1.0)

    sizes = {}
    sizes['color'] = save(Image.fromarray((linear_to_srgb(color) * 255 + 0.5).astype(np.uint8), 'RGB'), 'carpet_color.png')
    sizes['roughness'] = save(Image.fromarray((rough * 255 + 0.5).astype(np.uint8), 'L'), 'carpet_rough.png')
    sizes['bump'] = save(Image.fromarray((h * 255 + 0.5).astype(np.uint8), 'L'), 'carpet_bump.png')

    spec = {
        'surface': 'carpet',
        'repeat_m': [REPEAT_M, REPEAT_M],
        'pixels': sizes,
        'maps': {
            'color': 'carpet_color.png',
            'roughness': 'carpet_rough.png',
            'bump': 'carpet_bump.png',
        },
        'bump_distance_m': BUMP_DISTANCE_M,
        # cut pile sheen: the Principled sheen lobe is the velvet term.  SCALED
        # small: at 0.35 the floor rendered pale tan at the entry's grazing view
        'principled': {'Sheen Weight': 0.08, 'Sheen Roughness': 0.7},
        'projection': 'flat',
        'notes': 'repeat SCALED to the exhibit 3 ft tile; colours and hatch pitch measured '
                 'against the photographs; shard drawing STYLIZED',
    }
    with open(os.path.join(OUT, 'carpet.json'), 'w') as f:
        json.dump(spec, f, indent=1)
        f.write('\n')
    print('carpet: one repeat is %.4f m x %.4f m at %d px (%.3f mm per px)' % (REPEAT_M, REPEAT_M, N, PX_M * 1000))
    for name in ('carpet_color.png', 'carpet_rough.png', 'carpet_bump.png', 'carpet.json'):
        p = os.path.join(OUT, name)
        print('  %-18s %7.1f kB' % (name, os.path.getsize(p) / 1024.0))


if __name__ == '__main__':
    main()
