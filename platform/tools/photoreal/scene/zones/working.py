"""working zone.  The working wall: desk, task chair, navy shelves, dresser, TV, wardrobe.

apply() receives the Blender scene and the build context (see
zones/__init__.py).  Anything placed here that no sheet or photograph fixes
is labelled SCALED or STYLIZED in a comment beside it.

Everything below is read off photo-05 (20260812_141016.jpg), the working
view, through the station fitted to its shell points (cameras.STATIONS), so
positions carry that fit's uncertainty (about 0.3 ft at the desk).
"""
import math
import bpy
from mathutils import Vector

from .. import units

# [PHOTO 20260812_141016.jpg] both navy shelves are bare; the exhibit's vase,
# two books and the tray on them are not in the room.
SHELF_DECOR = ['working.inl-2e4a4f-r30-m0.1', 'working.inl-8a6b4a-r60-m0.1',
               'working.inl-9c3c33-r60-m0.1', 'working.inl-d8d3c6-r35-m0.1']

# [PHOTO 20260812_141016.jpg] the exhibit's desk lamp is a black gooseneck
# with a 0.3 ft head.  The room has a white articulated lamp with a white
# drum shade that the phone blows to white, clamped at the counter end of the
# desk.  The exhibit's parts are hidden and rebuilt below.
DESK_LAMP_PARTS = ['working.lampShade.2', 'working.blackMetal.17', 'working.blackMetal.18',
                   'working.blackMetal.19', 'working.inl-fff3dd-r50-m0-effd8a2.1']

DESK_TOP = 'working.woodWarm.1'          # ash slab, x 10.17..11.98, y 2.87..3.0, z 11.5..20 (feet)
DRESSER_Z0, DRESSER_Z1 = 11.5, 14.0      # the exhibit's dresser footprint along the wall
# [PHOTO 20260812_141016.jpg] the desk top sits a step below the dresser top:
# in the photograph the dresser reads as a raised block under the TV and the
# desk slab runs from its near face to the counter about 0.4 ft lower.  0.37
# ft is SCALED (a 30 in desk against a 34.5 in dresser); the sheets give
# neither.
DESK_DROP_FT = 0.37

LOWER_SHELF = 'working.navyShelf.2'      # x 11.25..11.98, y 3.67..3.78, z 15.17..18.67
# [PHOTO 20260812_141016.jpg] the lower navy shelf is short, about 1.4 ft,
# with a vertical navy bookend panel rising from its far (TV side) end; the
# upper shelf is the long one.  Extents SCALED from the photograph.
LOWER_SHELF_Z0, LOWER_SHELF_Z1 = 16.0, 17.4
BOOKEND_H_FT = 0.8

# Desk lamp geometry in exhibit feet, SCALED from the photograph through the
# fitted station: drum shade 0.52 ft across and 0.48 ft tall with its centre
# 4.55 ft up, 1.25 ft off the wall, 0.45 ft short of the counter end.
LAMP_BASE = (11.55, 2.63 + 0.04, 19.75)   # on the lowered desk top
LAMP_DRUM_C = (10.75, 4.55, 19.55)
LAMP_DRUM_R = 0.26
LAMP_DRUM_H = 0.48
LAMP_ARM_R = 0.035
LAMP_SHADE_EMISSION = 6.0                 # SCALED: the photograph clips the shade to white
LAMP_SHADE_COLOR = (1.0, 0.86, 0.66)      # a 3000 K bulb through linen, linear


def _b(p):
    """Exhibit feet (x, y up, z) to a Blender Vector in metres."""
    return Vector(units.three_to_blender(p))


def _mesh_object(name, verts, faces, mat, collection):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.update()
    for p in me.polygons:
        p.use_smooth = False
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    collection.objects.link(ob)
    return ob


def _box(name, lo, hi, mat, collection):
    """Axis aligned box between two exhibit-feet corners."""
    a, b = _b(lo), _b(hi)
    x0, x1 = sorted((a.x, b.x)); y0, y1 = sorted((a.y, b.y)); z0, z1 = sorted((a.z, b.z))
    v = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
         (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    return _mesh_object(name, v, f, mat, collection)


def _tube(name, p0, p1, radius_ft, mat, collection, caps=True, segments=24):
    """Cylinder from p0 to p1 (exhibit feet) with the given radius in feet."""
    a, b = _b(p0), _b(p1)
    axis = (b - a)
    n = axis.normalized()
    u = n.cross(Vector((0, 0, 1)))
    if u.length < 1e-6:
        u = n.cross(Vector((1, 0, 0)))
    u.normalize()
    w = n.cross(u)
    r = units.ft(radius_ft)
    verts, faces = [], []
    for i in range(segments):
        t = 2 * math.pi * i / segments
        d = (u * math.cos(t) + w * math.sin(t)) * r
        verts.append(a + d)
        verts.append(b + d)
    for i in range(segments):
        j = (i + 1) % segments
        faces.append((2 * i, 2 * j, 2 * j + 1, 2 * i + 1))
    if caps:
        faces.append(tuple(2 * i for i in reversed(range(segments))))
        faces.append(tuple(2 * i + 1 for i in range(segments)))
    ob = _mesh_object(name, verts, faces, mat, collection)
    for p in ob.data.polygons:
        p.use_smooth = len(p.vertices) == 4
    return ob


def _principled(name, base, roughness, emission=None, strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    p = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = (base[0], base[1], base[2], 1.0)
    p.inputs['Roughness'].default_value = roughness
    if emission is not None:
        p.inputs['Emission Color'].default_value = (emission[0], emission[1], emission[2], 1.0)
        p.inputs['Emission Strength'].default_value = strength
    return mat


def _hide(ctx, names):
    for n in names:
        ob = ctx['objects'].get(n)
        if ob is not None:
            ob.hide_render = True
            ob.hide_viewport = True


def apply(scene, ctx):
    objects = ctx['objects']
    col = ctx['collections'].get('working') or scene.collection
    mats = ctx['materials']

    _hide(ctx, SHELF_DECOR)

    # Desk top: trim the slab to the desk proper (z 14..20) and drop it; put a
    # matching ash slab back on the dresser at the exhibit's height.
    desk = objects.get(DESK_TOP)
    if desk is not None and desk.type == 'MESH':
        y_cut = -units.ft(DRESSER_Z1)          # Blender y of exhibit z = 14
        for v in desk.data.vertices:
            if v.co.y > y_cut + 1e-4:
                v.co.y = y_cut
            v.co.z -= units.ft(DESK_DROP_FT)
        _box('working.dresserTop', (10.17, 2.87, DRESSER_Z0), (11.98, 3.0, DRESSER_Z1 + 0.02),
             desk.data.materials[0], col)

    # Lower navy shelf: shorten to the photograph's extent and add the bookend.
    shelf = objects.get(LOWER_SHELF)
    if shelf is not None and shelf.type == 'MESH':
        y0, y1 = -units.ft(LOWER_SHELF_Z1), -units.ft(LOWER_SHELF_Z0)
        for v in shelf.data.vertices:
            v.co.y = min(max(v.co.y, y0), y1)
        _box('working.shelfBookend', (11.30, 3.78, LOWER_SHELF_Z0), (11.98, 3.78 + BOOKEND_H_FT, LOWER_SHELF_Z0 + 0.05),
             shelf.data.materials[0], col)

    # Task chair frame: black, not the exhibit's silver.  [PHOTO 20260812_141016.jpg]
    cf = mats.get('chairFrame')
    if cf is not None and cf.node_tree is not None:
        p = next((n for n in cf.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if p is not None:
            p.inputs['Base Color'].default_value = (0.02, 0.02, 0.022, 1.0)
            p.inputs['Roughness'].default_value = 0.45
            p.inputs['Metallic'].default_value = 0.0

    # Desk lamp.
    _hide(ctx, DESK_LAMP_PARTS)
    white = _principled('working.deskLampWhite', (0.80, 0.80, 0.78), 0.35)
    glow = _principled('working.deskLampShade', (0.85, 0.82, 0.74), 0.9, LAMP_SHADE_COLOR, LAMP_SHADE_EMISSION)
    cx, cy, cz = LAMP_DRUM_C
    _tube('working.deskLampBase', LAMP_BASE, (LAMP_BASE[0], LAMP_BASE[1] + 0.08, LAMP_BASE[2]), 0.22, white, col)
    elbow = (11.25, 3.75, 19.75)
    _tube('working.deskLampArm1', (LAMP_BASE[0], LAMP_BASE[1] + 0.08, LAMP_BASE[2]), elbow, LAMP_ARM_R, white, col)
    _tube('working.deskLampArm2', elbow, (cx + 0.2, cy + 0.1, cz), LAMP_ARM_R, white, col)
    drum = _tube('working.deskLampDrum', (cx, cy - LAMP_DRUM_H / 2, cz), (cx, cy + LAMP_DRUM_H / 2, cz),
                 LAMP_DRUM_R, glow, col, caps=False)
    drum.visible_shadow = False          # like the exhibit's shades: the spot inside gets out
    # Move the exhibit's desk spot into the drum, pointing down at the desk.
    for ob, rec in ctx['lights']:
        p = rec.get('position') or []
        if len(p) == 3 and abs(p[0] - 10.82) < 0.2 and abs(p[2] - 19.2) < 0.3 and abs(p[1] - 4.2) < 0.3:
            ob.location = _b((cx, cy - 0.05, cz))
            d = Vector((0.0, 0.0, -1.0))
            ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
            if ob.data.type == 'SPOT':
                ob.data.spot_size = math.radians(110.0)   # an open drum, not a can  [SCALED]
                ob.data.spot_blend = 0.6
    return None
