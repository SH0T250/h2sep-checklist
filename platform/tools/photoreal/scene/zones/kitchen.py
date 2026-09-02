"""kitchen zone.  The kitchenette run: counter, sink, dishwasher, fridge, microwave, shelf box.

Round 1 (photo-18, 20260812_141218.jpg, with photo-03 20260812_141209.jpg
and photo-10 20260812_141200.jpg for the run's order).  The photographs are
the as-built truth for the furnishings, so the exhibit's run is reshaped
here without touching the shell:

  fridge     the exhibit's box is 32 in wide, 30 in deep and 66 in tall and
             stops 4 in short of the corridor wall.  Photo-18 shows a 24 in
             top freezer standing against the corridor wall, its top level
             with the microwave's bottom, stainless doors on a black cabinet
             with horizontal bar handles along the top of each door.
  microwave  the exhibit hangs it 2.5 ft from the fridge; photo-03 and
             photo-18 put its right end flush with the fridge's side and its
             top just under the upper cabinet's top strip.
  counter    runs to the fridge's side (photo-18: the drawer stack meets the
             fridge), so the counter, base run, toe kick and backsplash are
             stretched to the fridge.
  fronts     from the window end: dishwasher, a two door sink cabinet with
             the sink centred on it, a drawer stack with three drawers
             against the fridge (photo-03).  The exhibit's three identical
             doors and three pulls at one height become that.
  door       photo-18 shows the hinges on the fridge side and the lever and
             keycard reader on the partition side; the exhibit had the lever
             on the fridge side.  The reader is added (the exhibit has none).
  switch     a single switch plate on the partition wall beside the door
             (photo-18, right edge); the exhibit has none there.

Every coordinate below is three.js world feet, the exhibit's own numbers,
converted with units.three_to_blender.  Anything the photographs do not fix
(exact appliance model dimensions, the pull lengths) is SCALED.
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


def _move(ctx, name, dx=0.0, dy=0.0, dz=0.0):
    """Translate an exhibit object by three.js feet (x, y up, z)."""
    o = _obj(ctx, name)
    if o is not None:
        o.location += Vector((dx * FT, -dz * FT, dy * FT))
    return o


def _stretch(ctx, name, axis, lo, hi, to):
    """Move every vertex of an exhibit mesh whose three.js coordinate on
    axis ('x', 'y' or 'z') lies in [lo, hi] onto a new value, so a box grows
    or shrinks along one face without losing its UVs."""
    o = _obj(ctx, name)
    if o is None or o.type != 'MESH':
        return None
    for v in o.data.vertices:
        co = v.co
        tx, ty, tz = co.x / FT, co.z / FT, -co.y / FT   # to three.js feet
        if axis == 'x' and lo <= tx <= hi:
            co.x = to * FT
        elif axis == 'y' and lo <= ty <= hi:
            co.z = to * FT
        elif axis == 'z' and lo <= tz <= hi:
            co.y = -to * FT
    o.data.update()
    return o


def _box(ctx, name, mat_key, x, y, z, uv_scale=0.5):
    """A closed box in three.js feet ranges x=(x0,x1), y=(y0,y1), z=(z0,z1)
    with simple planar UVs (uv_scale is texture repeats per foot)."""
    (x0, x1), (y0, y1), (z0, z1) = x, y, z
    corners = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
               (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    verts = [units.three_to_blender(c) for c in corners]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    uv = me.uv_layers.new(name='UVMap')
    for poly in me.polygons:
        n = poly.normal
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            if abs(n.x) > 0.5:
                u, v = -co.y, co.z
            elif abs(n.y) > 0.5:
                u, v = co.x, co.z
            else:
                u, v = co.x, -co.y
            uv.data[li].uv = (u / FT * uv_scale, v / FT * uv_scale)
    me.validate()
    me.update()
    ob = bpy.data.objects.new(name, me)
    mat = ctx['materials'].get(mat_key)
    if mat is not None:
        ob.data.materials.append(mat)
    ob['zone'] = 'kitchen'
    ctx['collections']['kitchen'].objects.link(ob)
    ctx['objects'][name] = ob
    return ob


def apply(scene, ctx):
    mats = ctx['materials']

    # --- fridge.  [PHOTO-18] 24 in wide against the corridor wall, front
    # 25 in off the working wall, top level with the microwave's bottom.
    # The exhibit box is kept (its brushed stainless UVs) and reshaped; the
    # cabinet sides, top and back get the satin black of the photograph.
    fr = 'kitchen.stainless.6'
    _stretch(ctx, fr, 'x', 9.4, 9.7, 9.9)     # front face 9.5 -> 9.9 (25 in deep)  SCALED depth
    _stretch(ctx, fr, 'z', 25.9, 26.5, 27.0)  # counter side 26.0 -> 27.0
    _stretch(ctx, fr, 'z', 28.5, 28.8, 28.98) # back to the corridor wall
    _stretch(ctx, fr, 'y', 5.3, 5.7, 5.15)    # top 5.5 -> 5.15, just under the microwave's bottom
    o = _obj(ctx, fr)
    black = mats.get('inl-1b1d20-r35-m0')
    if o is not None and black is not None:
        # faces are picked by where they sit, not by their normals (the
        # exporter's winding is flipped): only the front face at x = 9.9
        # keeps the brushed stainless.
        o.data.materials.append(black)
        for poly in o.data.polygons:
            if poly.center.x / FT > 9.95:
                poly.material_index = len(o.data.materials) - 1
    # door split and the vertical edge line: the split moves to the freezer
    # line, the edge line goes (the reshaped box has its own edge).
    _hide(ctx, 'kitchen.inl-2a2d31-r100-m0.2', 'kitchen.chromeSoft.2', 'kitchen.chromeSoft.3',
          'kitchen.woodWarm.1', 'kitchen.woodWarm.2')
    sp = 'kitchen.inl-2a2d31-r100-m0.1'
    _stretch(ctx, sp, 'x', 9.47, 9.49, 9.895)
    _stretch(ctx, sp, 'x', 9.50, 9.52, 9.915)
    _stretch(ctx, sp, 'z', 25.9, 26.5, 27.05)
    _stretch(ctx, sp, 'z', 28.5, 28.8, 28.95)
    _stretch(ctx, sp, 'y', 1.60, 1.68, 3.62)  # freezer door line, SCALED from photo-18 (about a quarter down)
    _stretch(ctx, sp, 'y', 1.70, 1.76, 3.70)
    # horizontal bar handles along the top of each door [PHOTO-18], SCALED length
    for i, hy in enumerate((4.85, 3.45)):
        _box(ctx, 'kitchen.fridgeHandle.%d' % (i + 1), 'blackMetal',
             (9.80, 9.88), (hy, hy + 0.06), (27.2, 28.8))
        _box(ctx, 'kitchen.fridgeHandleStandoff.%d' % (i + 1), 'blackMetal',
             (9.88, 9.9), (hy, hy + 0.06), (27.25, 28.75))

    # --- microwave.  [PHOTO-03, PHOTO-18] right end flush with the fridge's
    # counter side, bottom 5.24 ft up so the top sits under the upper strip.
    for n in ('kitchen.stainless.4', 'kitchen.stainless.5', 'kitchen.inl-141619-r7-m35.1',
              'kitchen.inl-27292c-r35-m40.1', 'kitchen.chromeSoft.1', 'kitchen.inl-b9bdc1-r45-m70.1'):
        _move(ctx, n, dz=1.9, dy=0.7)

    # --- counter, base run, toe kick, backsplash and the upper box run to the
    # fridge's side at z = 27.0 [PHOTO-18].
    for n, beyond in (('kitchen.solidWhite.1', 26.0), ('kitchen.woodGrey.1', 26.0),
                      ('kitchen.inl-3a332c-r80-m0.1', 26.0), ('kitchen.solidWhite.2', 26.0),
                      ('kitchen.woodGrey.2', 26.0), ('kitchen.woodGrey.3', 26.0)):
        _stretch(ctx, n, 'z', beyond, 26.3, 27.0 if n != 'kitchen.woodGrey.3' else 26.94)

    # --- fronts.  [PHOTO-03] dishwasher 20.45 to 22.45 (exhibit), sink
    # cabinet 22.45 to 25.5 with two doors, drawer stack 25.5 to 27.0.
    _move(ctx, 'kitchen.inl-120f0c-r100-m0.2', dz=23.97 - 23.65)    # sink doors meet
    _move(ctx, 'kitchen.inl-120f0c-r100-m0.1', dz=25.50 - 24.87)    # sink cabinet / drawers
    # sink door pulls sit at the top of each door beside the split [PHOTO-18]
    _move(ctx, 'kitchen.blackMetal.3', dz=23.05 - 22.54, dy=0.25)
    _move(ctx, 'kitchen.blackMetal.2', dz=24.07 - 23.76, dy=0.25)
    # drawer stack: three drawers under an open cubby, a pull at the top of
    # each drawer [PHOTO-18]; the exhibit's third door pull becomes the top one
    _move(ctx, 'kitchen.blackMetal.1', dz=25.75 - 24.98, dy=2.15 - 2.36)
    for i, py in enumerate((1.42, 0.70)):
        _box(ctx, 'kitchen.drawerPull.%d' % (i + 1), 'blackMetal',
             (9.867, 9.887), (py, py + 0.05), (25.75, 26.57))
    for i, py in enumerate((2.15, 1.42, 0.70)):
        _box(ctx, 'kitchen.drawerPullStandoff.%d' % (i + 1), 'blackMetal',
             (9.887, 9.92), (py, py + 0.05), (25.8, 26.52))
    # drawer gap lines [PHOTO-18], SCALED drawer heights
    for i, gy in enumerate((2.30, 1.57, 0.85)):
        _box(ctx, 'kitchen.drawerGap.%d' % (i + 1), 'inl-120f0c-r100-m0',
             (9.909, 9.922), (gy, gy + 0.02), (25.52, 26.98))
    # the open cubby above the drawers reads as a dark recess [PHOTO-18]; a
    # shadowed inset face 3 in behind the front.  SCALED depth.
    _box(ctx, 'kitchen.cubbyBack', 'inl-3a332c-r80-m0',
         (9.92, 10.20), (2.34, 2.80), (25.52, 26.98))

    # --- sink and faucet centred on the sink cabinet [PHOTO-03].
    for n in ('kitchen.stainless.1', 'kitchen.inl-2b2e31-r50-m60.1', 'kitchen.chrome.1',
              'kitchen.chrome.2', 'kitchen.chrome.3', 'kitchen.chrome.4'):
        _move(ctx, n, dz=23.97 - 24.1)
    # The exhibit's sink is a closed stainless box under a closed counter
    # top, so no basin shows.  [PHOTO-18] the undermount basin is open: a
    # cutter box is subtracted from the counter top and from the stainless
    # box, which leaves a stainless lined bowl 6.5 in deep (SCALED, a real
    # bar sink is 7 to 8 in) with the counter's edge showing around it.
    _hide(ctx, 'kitchen.inl-2b2e31-r50-m60.1')
    cutter = _box(ctx, 'kitchen.sinkCutter', None,
                  (10.32, 11.58), (2.35, 3.30), (23.35, 24.59))
    cutter.hide_render = True
    cutter.hide_viewport = True
    cutter.display_type = 'WIRE'
    for n in ('kitchen.solidWhite.1', 'kitchen.stainless.1'):
        host = _obj(ctx, n)
        if host is not None:
            m = host.modifiers.new('sinkCut', 'BOOLEAN')
            m.operation = 'DIFFERENCE'
            m.object = cutter
            if hasattr(m, 'solver'):
                m.solver = 'EXACT'

    # --- entry door hardware.  [PHOTO-18] lever on the partition side; the
    # exhibit put it on the fridge side.  Mirrored about the A550 door centre.
    door_cx = float(ctx['scene_json']['shell'].get('DOOR_CX', 7.8333))
    for n in ('entry.chromeSoft.6', 'entry.chromeSoft.7'):
        o = _obj(ctx, n)
        if o is not None:
            cx = (o.bound_box[0][0] + o.bound_box[6][0]) / 2.0 / FT
            _move(ctx, n, dx=2.0 * (door_cx - cx))
    # keycard reader above the lever [PHOTO-18], SCALED size
    _box(ctx, 'entry.keycardReader', 'inl-1b1d20-r35-m0',
         (6.42, 6.68), (4.45, 4.95), (28.72, 28.81))
    # single switch plate on the partition wall beside the door [PHOTO-18], SCALED
    _box(ctx, 'entry.switchPlate', 'trim',
         (5.97, 5.995), (3.55, 3.93), (28.22, 28.45))
    _box(ctx, 'entry.switchRocker', 'trim',
         (5.995, 6.01), (3.62, 3.86), (28.28, 28.39))
    return None
