"""entry zone.  The entry leg on the bathroom door side: tile, door, electrical panel, soffit cans.

apply() receives the Blender scene and the build context (see zones/__init__.py).
Anything placed here that no sheet or photograph fixes must be labelled
SCALED or STYLIZED in a comment beside it.  Every change below cites the
photograph that fixes it; the photograph is the as-built truth for the
furnishings, the A550 shell is never touched.
"""
from mathutils import Vector

from .. import units

# [PHOTO] photo-04 (20260812_141012.jpg): the electrical panel on the bath
# partition sits with its top about 5.75 ft up and its bottom about 4.35 ft up
# (solved with the fitted entry camera: the exhibit's 3.67 to 5.5 ft box
# projects 0.12 of the frame too low at the bottom while its top and its
# width match).  A 16 by 17 in flush cover, not the exhibit's 16 by 22.
PANEL_OBJECTS = ('entry.inl-8d9092-r55-m25.1', 'entry.inl-9ea1a3-r50-m25.1')
PANEL_OLD = (3.67, 5.5)     # exhibit box, feet
PANEL_NEW = (4.35, 5.75)    # photo-04, feet

# [PHOTO] photo-04 shows one soffit can between the camera and the leg end,
# centred at x 8.9 ft, z 22.44 ft (solved on the 7.2 ft leg ceiling with the
# fitted camera); the exhibit's middle can at z 21.5 projects 0.1 of the
# frame away from it.  photo-10 (20260812_141200.jpg), shot from the counter
# end looking at the corridor door, shows two soffit downlights in the whole
# leg, so the exhibit's third can at z 23.4 does not exist: it is hidden with
# its spot.  The corridor end can at z 26.17 stays where the exhibit put it
# (behind every entry camera; no photograph fixes it, SCALED).
CAN_MOVE = {'from': (8.97, 21.5), 'to': (8.9, 22.44),
            'objects': ('entry.canLens.2', 'entry.trim.6', 'entry.canHalo.2')}
CAN_HIDE = {'at': (9.4, 23.4),
            'objects': ('entry.canLens.3', 'entry.trim.7', 'entry.canHalo.3')}

# [PHOTO] photo-04: the white wall above the kitchen counter reads 0.29 in
# the photograph against 0.66 for the partition wall opposite, and the leg
# ceiling right beside the can is the brightest paint in the leg.  The
# exhibit's leg cans open 137 degrees (angle 1.2 rad, a shadow map rig that
# had to wash the walls) and flood both walls in the render.  A recessed LED
# downlight throws a beam of about 85 degrees to the edge, so the two leg
# cans get that cone; on axis intensity is unchanged (a Blender spot is a
# masked point light), so the pool on the tile stays as bright.  The exact
# beam angle is on no cut sheet: SCALED.
CAN_SPOT_SIZE = 1.5    # radians, SCALED
CAN_SPOT_BLEND = 0.4   # SCALED
CAN_POSITIONS = ((8.97, 26.167), CAN_MOVE['from'])   # the corridor end can and the moved one


def _rescale_height(obj, old, new):
    """Map the mesh's Blender Z from the old foot range onto the new one."""
    z0, z1 = units.ft(old[0]), units.ft(old[1])
    n0, n1 = units.ft(new[0]), units.ft(new[1])
    k = (n1 - n0) / (z1 - z0)
    for v in obj.data.vertices:
        v.co.z = n0 + (v.co.z - z0) * k


def _spot_near(ctx, x_ft, z_ft):
    for obj, rec in ctx['lights']:
        p = rec['position']
        if rec['type'] == 'SpotLight' and abs(p[0] - x_ft) < 0.05 and abs(p[2] - z_ft) < 0.05:
            return obj
    return None


def apply(scene, ctx):
    objs = ctx['objects']

    for name in PANEL_OBJECTS:
        o = objs.get(name)
        if o is not None:
            _rescale_height(o, PANEL_OLD, PANEL_NEW)

    fx, fz = CAN_MOVE['from']
    tx, tz = CAN_MOVE['to']
    delta = Vector((units.ft(tx - fx), -units.ft(tz - fz), 0.0))
    for name in CAN_MOVE['objects']:
        o = objs.get(name)
        if o is not None:
            o.location = o.location + delta
    spot = _spot_near(ctx, fx, fz)
    if spot is not None:
        spot.location = spot.location + delta

    for (cx, cz) in CAN_POSITIONS:
        spot = _spot_near(ctx, cx, cz)
        if spot is not None:
            spot.data.spot_size = CAN_SPOT_SIZE
            spot.data.spot_blend = CAN_SPOT_BLEND

    for name in CAN_HIDE['objects']:
        o = objs.get(name)
        if o is not None:
            o.hide_render = True
            o.hide_viewport = True
    spot = _spot_near(ctx, *CAN_HIDE['at'])
    if spot is not None:
        spot.hide_render = True
        spot.hide_viewport = True
    return None
