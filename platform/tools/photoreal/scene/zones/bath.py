"""bath zone.  The bathroom: vanity, mirror, toilet, shower enclosure and its glass.

apply() receives the Blender scene and the build context (see
zones/__init__.py).  Every change below cites the photograph that fixes it;
anything the photograph does not fix is labelled SCALED or STYLIZED.

Two bath views share this module: bath-vanity (photo-16, 20260812_141251.jpg)
and bath-shower (photo-24, 20260812_141304.jpg).  Keep the hunks small.
"""
import bpy
from mathutils import Vector

from .. import units

FT = units.FT


def _obj(ctx, name):
    return ctx['objects'].get(name)


def _hide(ctx, *names):
    for n in names:
        o = _obj(ctx, n)
        if o is not None:
            o.hide_render = True
            o.hide_viewport = True


def _remap(ctx, names, fx=None, fy=None, fz=None):
    """Move the vertices of the named objects with per axis functions in
    three.js feet (x right, y up, z toward the corridor)."""
    for n in names:
        o = _obj(ctx, n)
        if o is None or o.type != 'MESH':
            continue
        for v in o.data.vertices:
            x, y, z = v.co.x / FT, v.co.z / FT, -v.co.y / FT
            if fx:
                x = fx(x)
            if fy:
                y = fy(y)
            if fz:
                z = fz(z)
            v.co = Vector((x * FT, -z * FT, y * FT))


def _box(ctx, name, mat_key, x, y, z):
    """An axis aligned box in three.js feet with a box projected UV layer,
    linked into the bath collection."""
    (x0, x1), (y0, y1), (z0, z1) = x, y, z
    b = lambda px, py, pz: (px * FT, -pz * FT, py * FT)
    vs = [b(x0, y0, z0), b(x1, y0, z0), b(x1, y1, z0), b(x0, y1, z0),
          b(x0, y0, z1), b(x1, y0, z1), b(x1, y1, z1), b(x0, y1, z1)]
    # faces wound so the normals point out (three.js axes: +z is toward the room)
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (2, 3, 7, 6), (1, 2, 6, 5), (3, 0, 4, 7)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(vs, [], faces)
    me.update()
    uv = me.uv_layers.new(name='UVMap')
    for poly in me.polygons:
        n = poly.normal
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            if abs(n.x) > 0.5:
                u, w = co.y, co.z
            elif abs(n.y) > 0.5:
                u, w = co.x, co.z
            else:
                u, w = co.x, co.y
            uv.data[li].uv = (u * 2.0, w * 2.0)
    o = bpy.data.objects.new(name, me)
    mat = ctx['materials'].get(mat_key)
    if mat is not None:
        me.materials.append(mat)
    ctx['collections']['bath'].objects.link(o)
    ctx['objects'][name] = o
    return o


# ---------------------------------------------------------------------------
# [PHOTO 20260812_141251.jpg, photo-16] The vanity wall, seen from the door
# partition with the bath-vanity station of cameras.py.  Back projecting the
# photograph's corners onto the wall plane (z 20.66 ft) with that camera:
#   mirror frame  x 0.38 to 4.62, y 2.9 to 5.9   (the exhibit: 0.66 to 3.94, 3.36 to 5.74)
#   LED bar       x 0.85 to 4.85, 0.7 ft above the frame (exhibit: 0.88 to 3.72, 0.2 ft above)
#   bar backplate a short block near the bar's middle, not a full length rail
#   counter       right end about 1 ft short of the partition (exhibit: 1.24 ft)
# The mirror is therefore about 50 in wide by 30 in tall, the bar a 48 in
# batten, the vanity about 52 in.  The heights and the exact ends are read
# off a camera with a 33 px residual, so they are rounded: SCALED within
# about 2 in.
MIRROR_X = (0.66, 3.94, 0.40, 4.55)     # from, to
MIRROR_Y = (3.36, 5.74, 3.25, 5.75)
BAR_X = (0.88, 3.72, 0.85, 4.85)
BAR_DY = 0.45
PLATE_X = (0.8, 3.8, 2.85, 3.55)
VANITY_X = (3.12, 4.34, 4.60)           # hinge, old right end, new right end


def _lin(a0, a1, b0, b1):
    k = (b1 - b0) / (a1 - a0)
    return lambda v: b0 + (v - a0) * k


def apply_vanity_wall(scene, ctx):
    _remap(ctx, ['bath.frameYellow.1', 'bath.mirror.3'],
           fx=_lin(*MIRROR_X), fy=_lin(*MIRROR_Y))
    _remap(ctx, ['bath.ledStrip.1'], fx=_lin(*BAR_X), fy=lambda y: y + BAR_DY)
    _remap(ctx, ['bath.chromeSoft.5'], fx=_lin(*PLATE_X), fy=lambda y: y + BAR_DY)
    # the three exhibit spots that stand in for the bar follow the batten
    fx = _lin(*BAR_X)
    for obj, rec in ctx['lights']:
        p = rec['position']
        if 20.5 < p[2] < 21.5 and 5.5 < p[1] < 6.2 and p[0] < 5.0:
            obj.location = Vector(units.three_to_blender((fx(p[0]), p[1] + BAR_DY, p[2])))
    # vanity casework and top: stretch everything right of the basin
    hinge, old, new = VANITY_X
    k = (new - hinge) / (old - hinge)
    fxv = lambda x: x if x <= hinge else hinge + (x - hinge) * k
    vanity = []
    for name, o in ctx['objects'].items():
        if not name.startswith('bath.') or o.type != 'MESH' or name == 'bath.contact.1':
            continue
        bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
        zmax = max(-c.y for c in bb) / FT
        ymax = max(c.z for c in bb) / FT
        xmax = max(c.x for c in bb) / FT
        if zmax < 22.5 and ymax < 2.75 and xmax > hinge:
            vanity.append(name)
    _remap(ctx, vanity, fx=fxv)


# [PHOTO 20260812_141251.jpg, photo-16] The faucet stands behind the basin
# against the wall side of the counter, spout toward the room; the exhibit
# put it on the front edge with the spout toward the wall.  Mirrored in z
# about the base and moved back so the base sits 0.2 ft off the wall.
FAUCET = ['bath.chrome.16', 'bath.chrome.17', 'bath.chrome.18', 'bath.chrome.19', 'bath.chrome.20']
FAUCET_Z_SUM = 22.26 * 2 - 1.41          # z' = FAUCET_Z_SUM - z


def apply_faucet(scene, ctx):
    _remap(ctx, FAUCET, fz=lambda z: FAUCET_Z_SUM - z)


# [PHOTO 20260812_141251.jpg, photo-16 and 20260812_141248.jpg, photo-15]
# The two dark shelf rails are on the toilet side wall (x = 0), staggered,
# just below the mirror's bottom edge; nothing hangs on the wall right of the
# mirror.  The exhibit's two shelves (one poking through the side wall, one
# right of the mirror) are hidden and two ledges are built on the side wall.
# Their depth into the room (4 in) and the 1 in thickness are SCALED.
RAILS = [
    # name, y0, y1, z0, z1
    ('bath.rail.near', 3.98, 4.06, 20.62, 21.62),
    ('bath.rail.far', 4.18, 4.26, 21.78, 23.10),
]


def apply_rails(scene, ctx):
    _hide(ctx, 'bath.woodDark.8', 'bath.woodDark.9')
    for name, y0, y1, z0, z1 in RAILS:
        _box(ctx, name, 'woodDark', (0.0, 0.34), (y0, y1), (z0, z1))


# [PHOTO 20260812_141251.jpg, photo-16] The bath fixtures read warm: the
# wallpaper's cream reads R minus B of 0.055 and the frame's lit face
# (164, 120, 39) is a saturated yellow orange.  The exhibit's bar spots and
# the can are #fff2e0 and #fff4e8 (about 4500 K); a 3000 K LED batten and
# can are nearer #ffd9b0.  Applied to every fixture inside the bath.  The
# frame's base colour is set from the photograph's lit face against the
# paper (albedo about 0.95, 0.72, 0.22 in sRGB).
BATH_LIGHT_COLOR = '#ffd9b0'
FRAME_COLOR = '#f2b838'


def apply_colour(scene, ctx):
    for obj, rec in ctx['lights']:
        p = rec['position']
        if p[2] > 20.5 and p[0] < 5.6:
            obj.data.color = units.hex_to_linear(BATH_LIGHT_COLOR)
    mat = ctx['materials'].get('frameYellow')
    if mat is not None and mat.use_nodes:
        for node in mat.node_tree.nodes:
            if node.type == 'BSDF_PRINCIPLED' and not node.inputs['Base Color'].is_linked:
                node.inputs['Base Color'].default_value = (*units.hex_to_linear(FRAME_COLOR), 1.0)


# ---------------------------------------------------------------------------
# bath-shower view, round 1 [PHOTO 20260812_141304.jpg, photo-24, with photo-22
# 20260812_141256.jpg and photo-23 20260812_141302.jpg].  Read against the
# bath-shower station of cameras.py, which was fitted to the enclosure frame:
#   toilet     a standard two piece with its tank against the toilet wall
#              beside the shower: the seat's room side tip lands at x 2.2,
#              z 24.3 and the tank top at 2.55 ft; the exhibit's box toilet
#              (a 1.3 ft tank, 0.85 ft further from the shower) is hidden
#   door leaf  photo-22 shows the hinges on the shower side jamb, photo-23
#              the leaf open only about 30 degrees into the bathroom with the
#              doorway beyond it, photo-24 its face filling the left of the
#              frame with the paper holder on it; the exhibit exported none
#   towel bar  the dark bar with chrome posts is on the OUTSIDE of the right
#              (front) pane at 3.3 ft spanning x 0.6 to 2.5; the exhibit hung
#              it inside the left pane with a towel on it
#   grab bars  a chrome vertical bar on the left wall near the enclosure and a
#              second bar at the back whose run is ambiguous in the
#              photograph: drawn as a horizontal back wall bar, SCALED
#   shelf      a small white corner ledge in the back left corner at 3.2 ft
#   can light  the outer bath downlight rendered the wallpaper wall 0.8 to
#              1.1 stops over photo-24 while the shower base matched, so it
#              is turned down 0.7 stops, measured, SCALED
import math
import bmesh
from mathutils import Matrix

SHOWER_HIDE = [
    'bath.porcelain.3', 'bath.porcelain.4', 'bath.porcelain.5', 'bath.porcelain.6',   # toilet
    'bath.chrome.24',                                                                  # its lever
    'bath.inl-1b1c1e-r34-m55.1', 'bath.chrome.9', 'bath.chrome.10',                    # inside towel bar
    'bath.inl-f4f2ec-r94-m0.4',                                                        # the towel on it
]


def _link_bm(ctx, name, bm, mat_key, smooth=False):
    me = bpy.data.meshes.new(name)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        for poly in me.polygons:
            poly.use_smooth = True
    mat = ctx['materials'].get(mat_key)
    if mat is not None:
        me.materials.append(mat)
    o = bpy.data.objects.new(name, me)
    ctx['collections']['bath'].objects.link(o)
    ctx['objects'][name] = o
    return o


def _cyl(ctx, name, p0, p1, r, mat_key, segments=24, r1=None):
    """A cylinder (a cone when r1 is given) from p0 to p1 in three.js feet."""
    a = Vector(units.three_to_blender(p0))
    b = Vector(units.three_to_blender(p1))
    d = b - a
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=r * FT,
                          radius2=(r if r1 is None else r1) * FT, depth=d.length)
    bm.transform(Matrix.Translation((a + b) / 2.0) @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4())
    return _link_bm(ctx, name, bm, mat_key, smooth=True)


def _ellipse(ctx, name, cx, cz, y0, y1, ax, az, mat_key, ax0=None, az0=None, segments=48):
    """A vertical elliptical frustum: centre (cx, cz) ft, y0 to y1, half axes at the
    top ax (along x) and az (along z), ax0 and az0 at the bottom."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=1.0, radius2=1.0, depth=1.0)
    ax0 = ax if ax0 is None else ax0
    az0 = az if az0 is None else az0
    for v in bm.verts:
        t = v.co.z + 0.5
        v.co = Vector((v.co.x * (ax0 + (ax - ax0) * t) * FT, v.co.y * (az0 + (az - az0) * t) * FT,
                       (y0 + (y1 - y0) * t) * FT))
    c = units.three_to_blender((cx, 0.0, cz))
    bm.transform(Matrix.Translation((c[0], c[1], 0.0)))
    return _link_bm(ctx, name, bm, mat_key, smooth=True)


def _prism(ctx, name, pts_xz, y0, y1, mat_key):
    """A vertical prism over a polygon given in three.js (x, z) feet."""
    bm = bmesh.new()
    lo = [bm.verts.new(units.three_to_blender((x, y0, z))) for x, z in pts_xz]
    hi = [bm.verts.new(units.three_to_blender((x, y1, z))) for x, z in pts_xz]
    bm.faces.new(lo)
    bm.faces.new(list(reversed(hi)))
    n = len(pts_xz)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new([lo[i], lo[j], hi[j], hi[i]])
    return _link_bm(ctx, name, bm, mat_key)


def apply_shower_view(scene, ctx):
    _hide(ctx, *SHOWER_HIDE)
    # toilet  [photo-24]; the bowl and foot proportions are SCALED (18.5 by 14.5 in rim, 15 in seat)
    zc = 24.2
    _box(ctx, 'bath.fix.toilet.tank', 'porcelain', (0.08, 0.78), (1.3, 2.5), (zc - 0.8, zc + 0.8))
    _box(ctx, 'bath.fix.toilet.lid', 'porcelain', (0.05, 0.82), (2.5, 2.58), (zc - 0.83, zc + 0.83))
    _ellipse(ctx, 'bath.fix.toilet.bowl', 1.5, zc, 0.55, 1.25, 0.77, 0.6, 'porcelain', ax0=0.55, az0=0.42)
    _ellipse(ctx, 'bath.fix.toilet.foot', 1.45, zc, 0.0, 0.56, 0.55, 0.42, 'porcelain', ax0=0.62, az0=0.5)
    _box(ctx, 'bath.fix.toilet.neck', 'porcelain', (0.75, 1.05), (0.9, 1.3), (zc - 0.45, zc + 0.45))
    _ellipse(ctx, 'bath.fix.toilet.seat', 1.5, zc, 1.25, 1.36, 0.8, 0.63, 'porcelain')   # lid down [photo-24]
    _cyl(ctx, 'bath.fix.toilet.lever', (0.78, 2.3, zc + 0.62), (1.05, 2.3, zc + 0.62), 0.03, 'chrome')
    # door leaf hinged just inside the shower side jamb, open 30 degrees (SCALED, 25 to 35 in photo-23)
    ang = math.radians(30.0)
    hx, hz = 5.52, 25.66
    u = (-math.sin(ang), -math.cos(ang))     # along the leaf from the hinge
    n = (-math.cos(ang), math.sin(ang))      # through the leaf toward its bathroom face
    w, t, h0, h1 = 2.92, 0.146, 0.04, 6.71   # 35 in wide, 1.75 in thick, 6 ft 8 in tall
    corners = [(hx, hz), (hx + w * u[0], hz + w * u[1]),
               (hx + w * u[0] + t * n[0], hz + w * u[1] + t * n[1]), (hx + t * n[0], hz + t * n[1])]
    _prism(ctx, 'bath.fix.door.leaf', corners, h0, h1, 'trim')    # a white painted flush door
    s, y = 2.4, 2.1                          # paper holder: a chrome spindle off the leaf face [photo-24, photo-15]
    px, pz = hx + s * u[0] + t * n[0], hz + s * u[1] + t * n[1]
    _cyl(ctx, 'bath.fix.door.paper.post', (px, y, pz), (px + 0.5 * n[0], y, pz + 0.5 * n[1]), 0.028, 'chrome')
    _cyl(ctx, 'bath.fix.door.paper.plate', (px, y, pz), (px + 0.03 * n[0], y, pz + 0.03 * n[1]), 0.11, 'chrome')
    # towel bar outside the front pane (pane face at z 26.09)  [photo-24]
    yb, zb = 3.3, 25.96
    _cyl(ctx, 'bath.fix.towelbar', (0.6, yb, zb), (2.5, yb, zb), 0.04, 'inl-1b1c1e-r34-m55')
    for x in (0.6, 2.5):
        _cyl(ctx, 'bath.fix.towelbar.post.%s' % x, (x, yb, 26.09), (x, yb, zb), 0.045, 'chrome')
    # grab bars, 1.25 in chrome 1.5 in off the tile, with flanges  [photo-24]
    _cyl(ctx, 'bath.fix.grab.vertical', (4.87, 2.6, 27.1), (4.87, 4.2, 27.1), 0.052, 'chrome')
    for yy in (2.6, 4.2):
        _cyl(ctx, 'bath.fix.grab.vertical.flange.%s' % yy, (4.99, yy, 27.1), (4.93, yy, 27.1), 0.13, 'chrome')
        _cyl(ctx, 'bath.fix.grab.vertical.stub.%s' % yy, (4.99, yy, 27.1), (4.87, yy, 27.1), 0.052, 'chrome')
    _cyl(ctx, 'bath.fix.grab.back', (4.7, 2.6, 28.85), (2.7, 2.6, 28.85), 0.052, 'chrome')   # run SCALED
    for xx in (4.7, 2.7):
        _cyl(ctx, 'bath.fix.grab.back.flange.%s' % xx, (xx, 2.6, 28.97), (xx, 2.6, 28.91), 0.13, 'chrome')
        _cyl(ctx, 'bath.fix.grab.back.stub.%s' % xx, (xx, 2.6, 28.97), (xx, 2.6, 28.85), 0.052, 'chrome')
    # corner soap ledge, back left corner  [photo-24]; size SCALED
    _prism(ctx, 'bath.fix.shelf', [(4.98, 28.97), (4.23, 28.97), (4.98, 28.22)], 3.15, 3.25, 'porcelain')
    # the outer bath downlight (exhibit spot at x 3.3, z 24.3): 0.7 stops down, measured against photo-24
    for obj, rec in ctx['lights']:
        p = rec.get('position') or []
        if len(p) == 3 and abs(p[0] - 3.3) < 0.2 and abs(p[2] - 24.3) < 0.2:
            obj.data.energy *= 0.6


def apply(scene, ctx):
    apply_vanity_wall(scene, ctx)
    apply_faucet(scene, ctx)
    apply_rails(scene, ctx)
    apply_colour(scene, ctx)
    apply_shower_view(scene, ctx)
    return None
