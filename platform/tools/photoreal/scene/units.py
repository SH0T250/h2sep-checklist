"""Unit and axis conventions shared by every module.

The exhibit is authored in FEET with Y up.  Blender is metres with Z up.
export.mjs already writes the OBJ in Blender coordinates; the light and camera
records in scene.json carry both, and these helpers convert the three.js
values where a module wants to start from the exhibit's numbers.
"""
import math

FT = 0.3048                      # metres per foot
IN = FT / 12.0                   # metres per inch


def ft(x):
    """Feet to metres."""
    return x * FT


def three_to_blender(v):
    """three.js world (x, y, z) in feet to Blender (x, -z, y) in metres."""
    return (v[0] * FT, -v[2] * FT, v[1] * FT)


def three_dir_to_blender(d):
    """A direction (unit vector, no scale) from three.js axes to Blender axes."""
    return (d[0], -d[2], d[1])


def srgb_to_linear(c):
    """One sRGB channel in 0..1 to linear."""
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def hex_to_linear(h, default=(1.0, 1.0, 1.0)):
    """'#rrggbb' as an sRGB display colour to a linear RGB tuple.

    The exhibit hands its hex colours to three.js r128, which uses them as
    linear values.  Here they are read as the sRGB swatches the author picked,
    which is what Blender's own colour picker does with a hex value; the flat
    colours therefore come out a little darker and more saturated than in the
    exhibit.  That direction matches the critic log's finding that the exhibit
    drew its surfaces greyer than they photograph.  materials.OVERRIDES is the
    place to move any single one.
    """
    if not h:
        return default
    h = h.lstrip('#')
    r = int(h[0:2], 16) / 255.0
    g = int(h[2:4], 16) / 255.0
    b = int(h[4:6], 16) / 255.0
    return (srgb_to_linear(r), srgb_to_linear(g), srgb_to_linear(b))


def hex_to_srgb(h, default=(1.0, 1.0, 1.0)):
    """'#rrggbb' to a 0..1 tuple without any transfer curve."""
    if not h:
        return default
    h = h.lstrip('#')
    return (int(h[0:2], 16) / 255.0, int(h[2:4], 16) / 255.0, int(h[4:6], 16) / 255.0)


def ev100(iso, exposure_time, fnumber=1.9):
    """Exposure value at ISO 100: log2(F^2 / T) - log2(ISO / 100)."""
    return math.log2(fnumber * fnumber / exposure_time) - math.log2(iso / 100.0)
