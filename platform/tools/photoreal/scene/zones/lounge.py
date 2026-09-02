"""lounge zone.  The lounge: sofa, ottoman, table and floor lamps, car print, full length mirror.

apply() receives the Blender scene and the build context (see zones/__init__.py).
Anything placed here that no sheet or photograph fixes is labelled SCALED or
STYLIZED in a comment beside it.  Every change to an exhibit object cites the
photograph that shows it differently.

Everything below is read off photo-02 (20260812_141158.jpg), the lounge view,
through the station fitted to its shell points (cameras.STATIONS), by casting
the photograph's pixel rays back onto a known plane (the accent wall for the
print, the partition face for the mirror), so positions carry that fit's
uncertainty (about 0.3 ft at the accent wall).
"""
import math
import bpy
from mathutils import Vector

from .. import units

FT = 0.3048

# [PHOTO 20260812_141158.jpg, photo-02] the full length mirror on the bath
# partition is smaller than the exhibit's 2.7 by 6.3 ft frame.  Against the
# partition corner (7.25 ft to the soffit) the photograph puts the frame top
# at 6.1 ft and the bottom at 0.7 ft, and photo-13 (20260812_141153.jpg) shows
# it at about a 1 to 2.8 width to height ratio: a 2.0 by 5.4 ft frame, the
# usual 22 by 64 inch hotel mirror.  The left frame edge stays where the
# exhibit put it, 0.2 ft off the corner, which the photograph agrees with.
MIRROR_FRAME_EXHIBIT = {'x0': 5.76, 'x1': 3.04, 'y0': 0.64, 'y1': 6.94}   # ft, exhibit bbox
MIRROR_FRAME_PHOTO = {'x0': 5.76, 'x1': 3.76, 'y0': 0.70, 'y1': 6.10}     # ft, from the photograph

# [PHOTO 20260812_141158.jpg, photo-02] the car print over the sofa: the
# photograph's frame corners cast onto the accent wall land at z 17.14 to
# 14.12 and y 5.26 to 3.37, a 3.0 by 1.9 ft frame (a 36 by 24 in print) whose
# top left corner sits where the exhibit's does.  The exhibit's frame is 3.67
# by 2.5 ft; both the frame and the picture inside it shrink about that
# corner.
PRINT_TOP_LEFT = (5.29, 17.13)          # (y, z) ft, the exhibit's corner, kept
PRINT_SCALE_Y = 1.89 / 2.5
PRINT_SCALE_Z = 3.03 / 3.667
PRINT_PARTS = ['lounge.frameBlack.1', 'lounge.inl-ffffff-r55-m0-carPrint.1']

# [PHOTO 20260812_141158.jpg, photo-02] the sofa is shorter than the exhibit's
# 6.6 ft: its right arm (the window end) stops where the photograph's back
# corner ray meets the wall plane, z 13.0, while the left arm still meets the
# side table at z 18.6.  A 5.6 ft sleeper sofa (67 in), so the arms keep
# their thickness and only the seat, the back and the cushions between them
# shorten.
SOFA_PARTS = ['lounge.tweed.%d' % i for i in range(1, 9)] + \
             ['lounge.blackMetal.%d' % i for i in range(5, 9)]
SOFA_Z0_EXHIBIT, SOFA_Z0_PHOTO = 12.0, 13.0        # ft, right arm outer face
SOFA_ARM_R_INNER = 12.62                          # ft, exhibit right arm inner face
SOFA_ARM_L_INNER = 17.98                          # ft, exhibit left arm inner face

# [PHOTO 20260812_141158.jpg, photo-02] the ottoman is a fabric cube about 20
# in square and 17 in tall standing in front of the sofa with one face toward
# the phone; the exhibit's diamond set pouf is hidden and a box takes its
# place.  The centre comes from the photograph's top face rays cast onto a
# plane at the cube's height, its yaw from the direction to the station
# (SCALED: the face is square to the phone in the photograph).  The cloth is
# textures/ottoman.py through the exhibit's ottoman material.
OTTOMAN_HIDE = ['lounge.ottoman.1', 'lounge.contact.4']
OTTOMAN_CENTER = (4.5, 15.25)          # (x, z) ft
OTTOMAN_SIDE = 1.65
OTTOMAN_H = 1.40
OTTOMAN_YAW_DEG = -30.0                # about the vertical, SCALED to face the station

# [PIPELINE] the entry partition stub (entry.paintWhite.2, x 5.57 to 5.97)
# ends on the same plane as the bath front wall (entry.paintWhite.4) at
# z 20.156, so its end face fought the wall's face and rendered as a black
# strip 0.4 ft wide at the mirror wall corner in every lounge preview.  The
# stub's end is drawn back inside the wall's body; nothing visible moves.
PARTITION_STUB = 'entry.paintWhite.2'
PARTITION_STUB_Z_END = 20.30           # ft, inside paintWhite.4 (z 20.156 to 20.552)


def _z_ft(v):
    return -v.co.y / FT


def _set_z_ft(v, z):
    v.co.y = -z * FT


def _remap_mirror(obj):
    """Affine remap of a wall mounted mesh in its own plane (x and z in Blender)."""
    e, ph = MIRROR_FRAME_EXHIBIT, MIRROR_FRAME_PHOTO
    sx = (ph['x1'] - ph['x0']) / (e['x1'] - e['x0'])
    sz = (ph['y1'] - ph['y0']) / (e['y1'] - e['y0'])
    px, pz = e['x0'] * FT, e['y0'] * FT
    tx, tz = ph['x0'] * FT, ph['y0'] * FT
    me = obj.data
    for v in me.vertices:
        x, y, z = v.co
        v.co = Vector((tx + (x - px) * sx, y, tz + (z - pz) * sz))
    me.update()


def _remap_print(obj):
    """Shrink a print part about its top left corner (Blender z up, y along the wall)."""
    y_top = PRINT_TOP_LEFT[0] * FT           # Blender z
    y_left = -PRINT_TOP_LEFT[1] * FT         # Blender y of exhibit z 17.13
    me = obj.data
    for v in me.vertices:
        x, y, z = v.co
        v.co = Vector((x, y_left + (y - y_left) * PRINT_SCALE_Z, y_top + (z - y_top) * PRINT_SCALE_Y))
    me.update()


def _sofa_z(z):
    """Piecewise remap of exhibit z (ft) along the sofa: the right arm shifts, the middle shortens."""
    shift = SOFA_Z0_PHOTO - SOFA_Z0_EXHIBIT
    if z <= SOFA_ARM_R_INNER + 1e-4:
        return z + shift
    if z >= SOFA_ARM_L_INNER - 1e-4:
        return z
    span_e = SOFA_ARM_L_INNER - SOFA_ARM_R_INNER
    span_p = span_e - shift
    return SOFA_ARM_L_INNER - (SOFA_ARM_L_INNER - z) * span_p / span_e


def _remap_sofa(obj):
    me = obj.data
    for v in me.vertices:
        _set_z_ft(v, _sofa_z(_z_ft(v)))
    me.update()


def _mesh_object(name, verts, faces, mat, collection):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.update()
    for p in me.polygons:
        p.use_smooth = False
    if mat is not None:
        me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    collection.objects.link(ob)
    return ob


def _ottoman(mat, collection):
    cx, cz = OTTOMAN_CENTER
    c = Vector(units.three_to_blender((cx, 0.0, cz)))
    a = math.radians(OTTOMAN_YAW_DEG)
    hx = OTTOMAN_SIDE * FT / 2.0
    h = OTTOMAN_H * FT
    corners = []
    for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        x, y = sx * hx, sy * hx
        corners.append((c.x + x * math.cos(a) - y * math.sin(a), c.y + x * math.sin(a) + y * math.cos(a)))
    verts = [(x, y, c.z + 0.01) for x, y in corners] + [(x, y, c.z + h) for x, y in corners]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    return _mesh_object('lounge.ottomanCube', verts, faces, mat, collection)


def _hide(ctx, names):
    for n in names:
        ob = ctx['objects'].get(n)
        if ob is not None:
            ob.hide_render = True
            ob.hide_viewport = True


def apply(scene, ctx):
    objects = ctx['objects']
    col = ctx['collections'].get('lounge') or scene.collection

    for name in ('lounge.mirror.1', 'lounge.frameWhite.1'):
        obj = objects.get(name)
        if obj is not None:
            _remap_mirror(obj)

    for name in PRINT_PARTS:
        obj = objects.get(name)
        if obj is not None:
            _remap_print(obj)

    for name in SOFA_PARTS:
        obj = objects.get(name)
        if obj is not None:
            _remap_sofa(obj)

    stub = objects.get(PARTITION_STUB)
    if stub is not None and stub.type == 'MESH':
        for v in stub.data.vertices:
            if _z_ft(v) < PARTITION_STUB_Z_END:
                _set_z_ft(v, PARTITION_STUB_Z_END)
        stub.data.update()

    _hide(ctx, OTTOMAN_HIDE)
    _ottoman(ctx['materials'].get('ottoman'), col)
    return None
