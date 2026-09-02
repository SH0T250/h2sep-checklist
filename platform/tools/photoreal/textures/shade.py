#!/usr/bin/env python3
"""Patterned roller shade over the King Studio window: one printed repeat at
true scale, as maps for the Cycles material (materials.OVERRIDES['shade']).

    python3 platform/tools/photoreal/textures/shade.py

Writes to textures/out/:
  shade_color.png   sRGB base color, the print as it reflects room light
  shade_rough.png   linear roughness
  shade_bump.png    linear height, the fabric weave only (a print has no relief)
  shade.json        the physical size of one repeat, the map files, the bump
                    distance, where the repeat starts, and the translucent
                    settings: the material mixes a Translucent BSDF whose color
                    is the color map raised to a power (light crosses the ink
                    and the fabric once, so the backlit inks stay deep) and
                    emits the same transmitted print for camera and glossy rays
                    as the stand in for the daylight behind it (the world's
                    sky is scaled down against the lamps and the sky card is
                    camera only, so a Translucent BSDF alone gets a tenth of
                    the light the photographs show through the fabric)

Deterministic: numpy's default_rng with fixed seeds, Pillow drawing and
resampling only.  Pillow and numpy.

MEASURED, all from the photographs (Galaxy S25 Ultra ultrawide, 13 mm
equivalent, auto white balance, mixed daylight and 3000 K lamps):

  repeat   Photograph 20260812_141031 (bed view toward the window corner)
           shows the whole shade face.  Its four fabric corners were picked at
           full resolution and the quadrilateral rectified with the known
           lens (focal length 2000 * 13 / 36 = 722 px at 2000 px width); the
           rectangle's aspect fell out of the lens model (the two plane axes
           came out orthogonal to 1 degree), 0.677 tall to 1 wide, so with the
           exhibit's 7 ft shade the visible drop is 4.74 ft.  Autocorrelating
           the rectified face gives one print repeat every 434 px across and
           446 px down at 200 px per ft: 2.17 ft by 2.23 ft, 0.661 m by
           0.680 m, a straight repeat (no half drop: the best two dimensional
           match is at zero vertical shift).  The two differ by 3 percent,
           inside the corner picking error, so one square repeat of 0.67 m
           (26.4 in) is used.  About 3.2 repeats run across the shade and the
           print starts, as the photograph shows, with the charcoal hook and
           the ochre rule lines at the shade's top left corner.
  layout   Every motif below is placed where the averaged repeat of the
           rectified photograph shows it, in repeat coordinates (u right,
           v down, 0 to 1).  Where the photograph's blur hides a shape's
           exact outline, the outline is STYLIZED; the family, position, size
           and color of each motif are from the photograph.
  colors  Sampled as medians inside each motif across every visible repeat
           and expressed as a ratio to the fabric's cream in linear light,
           because the frame mixes cyan daylight through the fabric with the
           warm lamps and no absolute value in it means anything.  Cream
           itself is set from the same frame against the white painted PTAC
           face and the ceiling: the backlit cream reads level with the
           white paint, so its albedo is a warm off white.
           burgundy 0.24 0.05 0.06   rust 0.44 0.23 0.15    ochre 0.56 0.35 0.19
           plum     0.24 0.09 0.10   gray 0.38 0.35 0.35    charcoal 0.085 0.08 0.105
           tan      0.61 0.46 0.30   slate blue gray line ink about 0.40 0.44 0.48
  weave    SCALED: a plain weave roller fabric at 1.3 mm per thread, kept
           subtle (3 percent in color, 0.05 mm of relief); no photograph
           resolves the weave.
  print    The print is a screen print on a light fabric: flat inks with dry
           brush edges and lighter open strokes in the scrappy blocks.  The
           brush texture is STYLIZED.
"""
import json
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')

N = 2048                       # pixels per repeat
SS = 2                         # supersample for the drawn masks
REPEAT_M = 0.67                # MEASURED, see the module docstring
PX_M = REPEAT_M / N            # 0.327 mm per pixel
SEED = 110

# Where the repeat starts on the shade, Blender world meters: the shade mesh
# bed.shade.1 spans x 2.5 to 9.5 ft and hangs from z 7.9167 ft (scene.json
# bbox), and the print's origin is that top left corner.
ORIGIN_M = [2.5 * 0.3048, 0.0, 7.9166667 * 0.3048]

# Albedos, linear light.  Cream is the anchor; the inks are cream times the
# measured ratios (module docstring).
CREAM = np.array([0.80, 0.765, 0.70], np.float32)
BURGUNDY = CREAM * np.array([0.24, 0.05, 0.06], np.float32)
PLUM = CREAM * np.array([0.24, 0.09, 0.10], np.float32)
RUST = CREAM * np.array([0.44, 0.23, 0.15], np.float32)
OCHRE = CREAM * np.array([0.56, 0.35, 0.19], np.float32)
TAN = CREAM * np.array([0.61, 0.46, 0.30], np.float32)
GRAY = CREAM * np.array([0.38, 0.35, 0.35], np.float32)
CHARCOAL = CREAM * np.array([0.085, 0.08, 0.105], np.float32)
SLATE = CREAM * np.array([0.40, 0.44, 0.48], np.float32)

THREADS = 512                  # SCALED weave: 512 per repeat, 1.31 mm
BUMP_DISTANCE_M = 0.00005      # 0.05 mm of weave relief
TRANSLUCENT_MIX = 0.60         # SCALED: fraction of a Translucent BSDF, tuned on the bed preview
TRANS_GAMMA = 1.50             # SCALED: the color map raised to this power is what gets through
TRANS_TINT = [1.20, 1.0, 0.82]  # SCALED: warms the transmitted daylight so the backlit cream sits
                               # just cooler than the ceiling white, as the bed photograph has it
BACKLIGHT = 0.50               # SCALED: emission of the transmitted print for camera and glossy
                               # rays, the daylight the world does not carry (see materials.py);
                               # set so the cream reads 1.17 times the ceiling white as in 20260812_141100
ROUGH_CREAM = 0.86
ROUGH_INK = 0.78

M = N * SS
OFFS = [(dx * M, dy * M) for dx in (-1, 0, 1) for dy in (-1, 0, 1)]


# --- periodic noise -----------------------------------------------------------

def pnoise(cells, seed, passes=3):
    """Tileable smooth noise in 0..1 at N x N from a cells x cells random grid."""
    rng = np.random.default_rng(seed)
    g = rng.random((cells, cells), np.float32)
    k = N // cells
    a = np.repeat(np.repeat(g, k, axis=0), k, axis=1)
    r = max(1, k // 2)
    for _ in range(passes):
        s = np.zeros_like(a)
        for d in range(-r, r + 1):
            s += np.roll(a, d, axis=0)
        a = s / (2 * r + 1)
        s = np.zeros_like(a)
        for d in range(-r, r + 1):
            s += np.roll(a, d, axis=1)
        a = s / (2 * r + 1)
    a -= a.min()
    return a / max(a.max(), 1e-6)


def streaks(seed, cells_x=256, cells_y=32):
    """Tileable noise that is fine across and long down: dry brush strokes."""
    rng = np.random.default_rng(seed)
    g = rng.random((cells_y, cells_x), np.float32)
    a = np.repeat(np.repeat(g, N // cells_y, axis=0), N // cells_x, axis=1)
    for r, axis in ((N // cells_y // 2, 0), (2, 1)):
        s = np.zeros_like(a)
        for d in range(-r, r + 1):
            s += np.roll(a, d, axis=axis)
        a = s / (2 * r + 1)
    a -= a.min()
    return a / max(a.max(), 1e-6)


# --- mask drawing (Pillow at 2x, wrapped, then downsampled) ------------------

class Mask:
    def __init__(self):
        self.im = Image.new('L', (M, M), 0)
        self.d = ImageDraw.Draw(self.im)

    def _bb(self, x0, y0, x1, y1, ox, oy):
        return [x0 * M + ox, y0 * M + oy, x1 * M + ox, y1 * M + oy]

    def rect(self, x0, y0, x1, y1):
        for ox, oy in OFFS:
            self.d.rectangle(self._bb(x0, y0, x1, y1, ox, oy), fill=255)

    def disc(self, cx, cy, r, fill=255):
        for ox, oy in OFFS:
            self.d.ellipse(self._bb(cx - r, cy - r, cx + r, cy + r, ox, oy), fill=fill)

    def pie(self, cx, cy, r, a0, a1, fill=255):
        """Sector, Pillow angles: 0 is +u (right), 90 is +v (down)."""
        for ox, oy in OFFS:
            self.d.pieslice(self._bb(cx - r, cy - r, cx + r, cy + r, ox, oy), a0, a1, fill=fill)

    def ring(self, cx, cy, r_in, r_out, a0, a1):
        self.pie(cx, cy, r_out, a0, a1, 255)
        if r_in > 0:
            self.disc(cx, cy, r_in, 0)

    def arch(self, cx, cy, r_in, r_out, leg_bottom):
        """Top half ring with straight legs down to leg_bottom."""
        self.ring(cx, cy, r_in, r_out, 180, 360)
        self.rect(cx - r_out, cy - 0.001, cx - r_in, leg_bottom)
        self.rect(cx + r_in, cy - 0.001, cx + r_out, leg_bottom)

    def poly(self, pts):
        for ox, oy in OFFS:
            self.d.polygon([(x * M + ox, y * M + oy) for x, y in pts], fill=255)

    def hlines(self, x0, x1, y0, y1, pitch, thick, rng, jitter=0.0):
        y = y0
        while y < y1:
            a = x0 + rng.uniform(-jitter, jitter)
            b = x1 + rng.uniform(-jitter, jitter)
            self.rect(a, y, b, y + thick)
            y += pitch

    def vlines(self, x0, x1, y0, y1, pitch, thick, rng, jitter=0.0):
        x = x0
        while x < x1:
            a = y0 + rng.uniform(-jitter, jitter)
            b = y1 + rng.uniform(-jitter, jitter)
            self.rect(x, a, x + thick, b)
            x += pitch

    def dashes(self, x0, x1, y0, y1, px, py, w, h, rng, keep=1.0):
        y = y0
        while y < y1:
            x = x0
            while x < x1:
                if rng.random() < keep:
                    jx = rng.uniform(-w * 0.3, w * 0.3)
                    self.rect(x + jx, y, x + jx + w, y + h)
                x += px
            y += py

    def text(self, x0, x1, y0, y1, pitch, h, rng):
        """Rows of tiny dashes of random length: the print's scribble blocks."""
        y = y0
        while y < y1:
            x = x0 + rng.uniform(0, 0.01)
            while x < x1:
                ln = rng.uniform(0.003, 0.014)
                if rng.random() < 0.8:
                    self.rect(x, y, min(x + ln, x1), y + h)
                x += ln + rng.uniform(0.002, 0.006)
            y += pitch

    def array(self, blur=1.2):
        im = self.im.resize((N, N), Image.BOX)
        if blur:
            im = im.filter(ImageFilter.GaussianBlur(blur))
        return np.asarray(im).astype(np.float32) / 255.0


def ragged(m, noise, amount, width=0.22):
    """Turn a soft mask into an ink edge that wobbles with the noise."""
    t = 0.5 + (noise - 0.5) * amount
    return np.clip((m - t) / width + 0.5, 0.0, 1.0)


# --- the print ------------------------------------------------------------------

def paint(color, cov, mask, ink, coverage):
    """Lay an ink over the canvas: mask is the shape, coverage the ink density."""
    a = mask * coverage
    color *= (1.0 - a)[..., None]
    color += (a[..., None] * ink[None, None, :])
    cov[:] = np.maximum(cov, a)


def build():
    rng = np.random.default_rng(SEED)
    edge = pnoise(128, 1)        # edge wobble, about 5 mm
    grain = pnoise(512, 2)       # ink density grain, about 1.3 mm
    st1, st2, st3 = streaks(3), streaks(4), streaks(5)
    dense = np.clip(0.93 + 0.07 * grain, 0, 1)             # flat ink, faint dry brush
    brushy = np.clip(0.45 + 1.0 * st1 - 0.3 * grain, 0, 1)   # scrappy vertical strokes
    brushy2 = np.clip(0.35 + 1.1 * st2 - 0.3 * grain, 0, 1)
    brushy3 = np.clip(0.50 + 0.9 * st3 - 0.25 * grain, 0, 1)

    color = np.empty((N, N, 3), np.float32)
    color[:] = CREAM
    cov = np.zeros((N, N), np.float32)

    def flat(draw_fn, ink, coverage=None, rag=0.9):
        m = Mask()
        draw_fn(m)
        paint(color, cov, ragged(m.array(), edge, rag), ink, dense if coverage is None else coverage)

    def crisp(draw_fn, ink, coverage=None):
        m = Mask()
        draw_fn(m)
        paint(color, cov, ragged(m.array(0.8), edge, 0.3, 0.3), ink, dense if coverage is None else coverage)

    # -- background washes and things other inks sit over
    flat(lambda m: m.rect(0.21, 0.16, 0.41, 0.39), TAN, 0.30 * dense)            # faint wash under the triangles
    flat(lambda m: m.rect(0.00, 0.28, 0.06, 0.60), RUST, brushy)                  # scrappy strip left of the gray disc
    flat(lambda m: m.rect(0.965, 0.56, 1.0, 0.72), OCHRE, brushy2)                # bar at the right edge under the hook
    flat(lambda m: m.rect(0.13, 0.17, 0.20, 0.42), OCHRE, brushy3)                # ochre dry brush block
    flat(lambda m: m.rect(0.58, 0.03, 0.83, 0.23), TAN, np.clip(0.75 + 0.25 * grain, 0, 1))   # tan block
    flat(lambda m: m.rect(0.80, 0.90, 0.85, 0.97), TAN, 0.8 * dense)              # small tan block by the text
    flat(lambda m: m.ring(0.30, 1.00, 0.0, 0.20, 180, 270), RUST * 1.08, np.clip(0.55 + 0.6 * st3, 0, 1))  # tan quarter disc

    # -- fine line work (slate and ochre rules, dash fields, scribbles)
    crisp(lambda m: m.hlines(0.11, 0.36, 0.03, 0.15, 0.016, 0.0035, rng, 0.012), RUST, np.clip(0.55 + 0.5 * grain, 0, 1))
    crisp(lambda m: m.vlines(0.43, 0.60, 0.30, 0.56, 0.014, 0.003, rng, 0.01), SLATE, np.clip(0.5 + 0.5 * grain, 0, 1))
    crisp(lambda m: m.hlines(0.00, 0.10, 0.50, 0.60, 0.018, 0.0035, rng, 0.01), OCHRE, np.clip(0.5 + 0.5 * grain, 0, 1))
    crisp(lambda m: m.hlines(0.73, 0.85, 0.60, 0.68, 0.016, 0.0035, rng, 0.01), OCHRE, np.clip(0.5 + 0.5 * grain, 0, 1))
    crisp(lambda m: m.hlines(0.80, 0.90, 0.83, 0.90, 0.02, 0.004, rng, 0.01), GRAY, np.clip(0.5 + 0.5 * grain, 0, 1))
    crisp(lambda m: m.vlines(0.00, 0.10, 0.83, 0.98, 0.012, 0.003, rng, 0.01), SLATE, np.clip(0.5 + 0.5 * grain, 0, 1))
    crisp(lambda m: m.dashes(0.10, 0.30, 0.57, 0.73, 0.013, 0.026, 0.005, 0.018, rng, 0.85), SLATE, np.clip(0.45 + 0.55 * grain, 0, 1))
    crisp(lambda m: m.text(0.90, 1.00, 0.28, 0.50, 0.02, 0.005, rng), CHARCOAL, np.clip(0.6 + 0.4 * grain, 0, 1))
    crisp(lambda m: m.text(0.52, 0.79, 0.84, 0.98, 0.016, 0.005, rng), CHARCOAL, np.clip(0.55 + 0.45 * grain, 0, 1))
    crisp(lambda m: m.hlines(0.39, 0.48, 0.63, 0.68, 0.014, 0.006, rng, 0.015), OCHRE, np.clip(0.5 + 0.5 * st2, 0, 1))

    # -- triangles, four columns of seven, pointing right
    def tris(m):
        for c in range(4):
            for r in range(6):
                x0 = 0.215 + c * 0.05
                y0 = 0.168 + r * 0.036
                m.poly([(x0, y0), (x0, y0 + 0.031), (x0 + 0.042, y0 + 0.0155)])
    flat(tris, RUST, np.clip(0.7 + 0.3 * grain, 0, 1), 0.6)

    # -- the big flat shapes
    flat(lambda m: m.pie(1.03, 0.02, 0.245, 90, 270), BURGUNDY)                            # half disc, flat side right, across the corner
    flat(lambda m: m.ring(0.26, 0.30, 0.16, 0.25, 180, 270), CHARCOAL)                      # hook at the top left
    flat(lambda m: m.ring(0.57, 0.06, 0.0, 0.19, 90, 180), CHARCOAL)                        # quarter disc
    flat(lambda m: m.disc(0.19, 0.45, 0.12), GRAY)                                          # gray disc
    flat(lambda m: m.arch(0.605, 0.55, 0.185, 0.275, 0.57), BURGUNDY)                       # the big arch
    flat(lambda m: m.arch(0.685, 0.475, 0.04, 0.085, 0.58), RUST)                           # inner rust arch
    flat(lambda m: (m.disc(0.685, 0.485, 0.03), m.rect(0.655, 0.485, 0.715, 0.535)), OCHRE)  # ochre pill
    flat(lambda m: m.rect(0.21, 0.60, 0.30, 0.86), PLUM, np.clip(0.7 + 0.6 * st1, 0, 1))    # plum scrappy block
    flat(lambda m: m.rect(0.30, 0.60, 0.36, 0.85), RUST, np.clip(0.3 + 0.9 * st2, 0, 1))    # rust strokes beside it
    flat(lambda m: m.ring(0.32, 0.87, 0.11, 0.17, 270, 450), BURGUNDY)                      # half ring, bottom left
    flat(lambda m: m.rect(0.51, 0.60, 0.575, 0.80), RUST)                                   # rust bar
    flat(lambda m: m.arch(0.6875, 0.775, 0.06, 0.1025, 0.83), PLUM)                         # plum arch
    flat(lambda m: (m.disc(0.69, 0.78, 0.052), m.rect(0.638, 0.78, 0.742, 0.835)), GRAY)    # gray inside it
    # the charcoal hook on the right: a half ring with legs, cut at the right leg
    def hook(m):
        m.ring(0.925, 0.64, 0.05, 0.13, 0, 180)
        m.rect(0.795, 0.56, 0.875, 0.641)
        m.rect(0.975, 0.55, 1.055, 0.641)
    flat(hook, CHARCOAL)

    # -- cream dashes knocked out of the tan block
    m = Mask()
    m.dashes(0.595, 0.83, 0.045, 0.225, 0.026, 0.03, 0.011, 0.02, rng, 0.92)
    knock = ragged(m.array(0.8), edge, 0.3, 0.3) * np.clip(0.7 + 0.3 * grain, 0, 1)
    color *= (1.0 - knock)[..., None]
    color += (knock[..., None] * CREAM[None, None, :])
    cov *= (1.0 - knock)

    # -- weave: a plain weave, threads across and down
    j, i = np.mgrid[0:N, 0:N].astype(np.float32)
    ph = 2 * np.pi * THREADS / N
    warp = np.sin(ph * i) * np.sin(ph * j)
    weave = 0.5 + 0.5 * warp                                 # 0..1 height
    fabric = 0.5 + 0.5 * (np.sin(ph * i) + np.sin(ph * j)) * 0.5
    color *= (1.0 + 0.015 * (fabric - 0.5) * 2)[..., None]
    color *= (1.0 + 0.02 * (grain - 0.5))[..., None]           # slight unevenness of the fabric itself
    color = np.clip(color, 0, 1)

    rough = ROUGH_CREAM - (ROUGH_CREAM - ROUGH_INK) * cov + 0.03 * (weave - 0.5) + 0.02 * (grain - 0.5)
    return color, np.clip(rough, 0, 1), weave


def to_srgb(lin):
    lin = np.clip(lin, 0, 1)
    return np.where(lin <= 0.0031308, lin * 12.92, 1.055 * np.power(lin, 1 / 2.4) - 0.055)


def save(name, arr, srgb, palette=False):
    a = to_srgb(arr) if srgb else np.clip(arr, 0, 1)
    im = Image.fromarray((a * 255 + 0.5).astype(np.uint8))
    if palette:
        # nine inks and a soft weave fit 256 colors (mean error 0.3 of 255)
        # and the file drops from 2.5 MB to 1.5 MB; median cut is deterministic
        im = im.quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    path = os.path.join(OUT, name)
    im.save(path, optimize=True)
    return path


def main():
    os.makedirs(OUT, exist_ok=True)
    color, rough, bump = build()
    files = {
        'color': save('shade_color.png', color, True, palette=True),
        'roughness': save('shade_rough.png', rough, False),
        'bump': save('shade_bump.png', bump, False),
    }
    spec = {
        'surface': 'shade',
        'repeat_m': [REPEAT_M, REPEAT_M],
        'pixels': N,
        'maps': {k: os.path.basename(v) for k, v in files.items()},
        'origin_m': ORIGIN_M,
        'bump_distance_m': BUMP_DISTANCE_M,
        'translucent': {'mix': TRANSLUCENT_MIX, 'gamma': TRANS_GAMMA, 'scale': TRANS_TINT, 'backlight': BACKLIGHT},
        'principled': {'Roughness': ROUGH_CREAM},
        'projection': 'box',
        'notes': 'repeat and layout measured on the rectified shade of photograph 20260812_141031; '
                 'colors as ratios to the cream; weave SCALED; brush texture STYLIZED',
    }
    with open(os.path.join(OUT, 'shade.json'), 'w') as f:
        json.dump(spec, f, indent=1)
    print('shade: one repeat = %.3f m x %.3f m (%.1f in), %d px, %.3f mm per px' % (
        REPEAT_M, REPEAT_M, REPEAT_M / 0.0254, N, PX_M * 1000))
    for k, v in files.items():
        print('  %-12s %s  %.2f MB' % (k, v, os.path.getsize(v) / 1e6))


if __name__ == '__main__':
    main()
