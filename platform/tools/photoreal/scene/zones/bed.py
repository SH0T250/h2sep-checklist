"""bed zone.  The bed end: mattress, headboard, nightstands, globe lamps, curtain, window, shade, PTAC.

apply() receives the Blender scene and the build context (see
zones/__init__.py).  Anything placed here that no sheet or photograph fixes
is labelled SCALED or STYLIZED in a comment beside it.
"""
from .. import units

# [PHOTO 20260812_141100.jpg, photo-09] The upholstered headboard is shorter
# than the exhibit's 4.25 ft.  In the photograph its top edge sits 150 to
# 183 px (of 1500) above the mattress top along the accent wall; the exhibit's
# 1.70 ft rise renders 200 px at the same station (preview r1-1 edges
# overlay, the headboard top 30 px high at 1000 px while the ceiling corner,
# the shade and the mattress foot coincide).  Scaled to 0.80 of the rise:
# top at 3.90 ft, bottom edge unchanged.
HEADBOARD = 'bed.plum.1'
HEADBOARD_TOP_FT = 3.90
HEADBOARD_BOTTOM_FT = 2.17     # the exhibit's, hidden behind the mattress


def apply(scene, ctx):
    hb = ctx['objects'].get(HEADBOARD)
    if hb is not None and hb.type == 'MESH':
        z0 = units.ft(HEADBOARD_BOTTOM_FT)
        z1_old = units.ft(4.25)
        z1_new = units.ft(HEADBOARD_TOP_FT)
        k = (z1_new - z0) / (z1_old - z0)
        for v in hb.data.vertices:
            v.co.z = z0 + (v.co.z - z0) * k
    apply_ptac_and_window(scene, ctx)
    return None


# [PHOTO 20260812_141100.jpg, photo-09] The PTAC under the window is a full
# sleeve unit, not the exhibit's 8.5 in deep box: against the render at the
# same station its top sits 40 px (of 1500) higher and its far end 54 px
# further from the camera, and its top face reads about a foot deep.  The
# exhibit box x 4.25 to 7.75, y 0 to 1.33, z 0.04 to 0.75 (three.js feet) is
# mapped to x 3.85 to 7.75 (its far end 0.4 ft nearer the accent wall; the
# near end keeps the exhibit's, since preview r1-4 showed the unit ending
# inside the frame at 7.25 while the photograph's runs off the right edge),
# y 0 to 1.45 and z 0 to 1.00.  Depth and height are read off the
# photograph, SCALED; 46 in overall is the sleeve plus its end trims.
PTAC = {
    'bed.solidWhite.1': None,
    'bed.louvre.1': None,
}
PTAC_OLD = ((4.25, 7.75), (0.0, 1.33), (0.04, 0.75))
PTAC_NEW = ((3.85, 7.75), (0.0, 1.45), (0.00, 1.00))

# [PHOTO 20260812_141100.jpg, photo-09] the glass is one undivided pane; the
# exhibit's centre mullion at x 5.96 to 6.04 is not in the photograph.
HIDE = ['bed.inl-f0eee9-r34-m0.5']


def _remap_ptac(obj):
    """Affine map of an exhibit PTAC mesh from PTAC_OLD to PTAC_NEW (Blender metres)."""
    if obj is None or obj.type != 'MESH':
        return
    (x0, x1), (y0, y1), (z0, z1) = PTAC_OLD
    (X0, X1), (Y0, Y1), (Z0, Z1) = PTAC_NEW
    for v in obj.data.vertices:
        # Blender X = three x, Blender Y = -three z, Blender Z = three y
        tx = v.co.x / units.FT
        tz = -v.co.y / units.FT
        ty = v.co.z / units.FT
        tx = X0 + (tx - x0) * (X1 - X0) / (x1 - x0)
        ty = Y0 + (ty - y0) * (Y1 - Y0) / (y1 - y0)
        tz = Z0 + (tz - z0) * (Z1 - Z0) / (z1 - z0)
        v.co.x = tx * units.FT
        v.co.y = -tz * units.FT
        v.co.z = ty * units.FT


def apply_ptac_and_window(scene, ctx):
    objects = ctx['objects']
    for name in PTAC:
        _remap_ptac(objects.get(name))
    for name in HIDE:
        o = objects.get(name)
        if o is not None:
            o.hide_render = True
            o.hide_viewport = True
