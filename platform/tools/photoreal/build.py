#!/usr/bin/env python3
"""Rebuild the Cycles scene from the exhibit export, every time, from sources.

    python3 platform/tools/photoreal/build.py [--export DIR] [--out FILE.blend] [--quiet]

Reads platform/tools/photoreal/export/ (mesh.obj, scene.json, textures/) written
by export.mjs, plus camera_profile.json, and writes
platform/tools/photoreal/export/king-studio.blend.  Deterministic: the same
inputs give the same file.  Finishes in well under a minute on this box (the
OBJ import is a few hundred milliseconds; the materials are the slow part).

Steps, in order:
  1. factory settings, empty file
  2. import mesh.obj with Blender axes (the exporter already converted)
  3. collections per zone from the object name prefix
  4. materials from scene.json (scene/materials.py), assigned by key
  5. object flags: hidden decals, shadow visibility off for shades and the sky card
  6. lights (scene/lights.py), world and colour management (scene/world.py)
  7. cameras with the phone lens and per view exposure (scene/cameras.py)
  8. zones/*.apply() for per zone replacements
  9. Cycles defaults sane for an interior, then save
"""
import argparse
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import bpy  # noqa: E402

from scene import materials, lights, world, cameras, units  # noqa: E402
from scene import zones  # noqa: E402

ZONES = ['shell', 'entry', 'kitchen', 'working', 'lounge', 'bed', 'bath']


def log(quiet, *a):
    if not quiet:
        print('[build]', *a, flush=True)


def build(export_dir, out_path, quiet=False):
    t0 = time.time()
    scene_json = json.load(open(os.path.join(export_dir, 'scene.json')))
    profile = json.load(open(os.path.join(HERE, 'camera_profile.json')))
    tex_dir = os.path.join(export_dir, 'textures')

    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.name = 'king-studio'
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.length_unit = 'METERS'

    # 2. geometry
    t = time.time()
    bpy.ops.wm.obj_import(filepath=os.path.join(export_dir, 'mesh.obj'),
                          forward_axis='Y', up_axis='Z', use_split_objects=True,
                          use_split_groups=False, validate_meshes=True)
    imported = [o for o in bpy.data.objects if o.type == 'MESH']
    log(quiet, 'imported %d meshes in %.1f s' % (len(imported), time.time() - t))

    # 3. collections by zone
    root = scene.collection
    for c in list(root.children):
        root.children.unlink(c)
    cols = {}
    for z in ZONES + ['lights', 'cameras']:
        col = bpy.data.collections.new(z)
        root.children.link(col)
        cols[z] = col
    objects = {}
    for o in imported:
        zone = o.name.split('.')[0]
        col = cols.get(zone, cols['shell'])
        for c in o.users_collection:
            c.objects.unlink(o)
        col.objects.link(o)
        objects[o.name] = o

    # 4. materials
    t = time.time()
    mats = materials.build_materials(scene_json, tex_dir)
    by_name = {m['name']: m for m in scene_json['meshes']}
    missing = set()
    for o in imported:
        rec = by_name.get(o.name)
        key = rec['material'] if rec else o.name.split('.')[1]
        mat = mats.get(key)
        if mat is None:
            missing.add(key)
            continue
        o.data.materials.clear()
        o.data.materials.append(mat)
        hide, no_shadow = materials.object_flags(key)
        if hide:
            o.hide_render = True
            o.hide_viewport = True
        if no_shadow:
            o.visible_shadow = False
        if key == 'sky':
            # camera and glossy rays see the blown card; diffuse light comes from the world
            o.visible_diffuse = False
            o.visible_transmission = True
            o.visible_volume_scatter = False
        o['material_key'] = key
        o['zone'] = rec['zone'] if rec else o.name.split('.')[0]
    # the OBJ importer's placeholder materials are not wanted
    for m in list(bpy.data.materials):
        if m.users == 0:
            bpy.data.materials.remove(m)
    log(quiet, 'built %d materials in %.1f s%s' % (len(mats), time.time() - t,
        (' (missing: %s)' % sorted(missing)) if missing else ''))

    # 5a. The exhibit lays box faces exactly flush with the shell planes (the
    # closed bathroom door leaf sits in the plane of its wall, cabinet backs sit
    # on the working wall).  A rasteriser resolves that by depth order; in a
    # path tracer two coincident surfaces shadow each other completely and both
    # render black.  MEASURED on the bath-vanity frame: the door side of the
    # bath was 0.000 until either surface was hidden.  Each shell plane moves
    # 1 mm away from the room along its own normal, so a flush face wins.
    for o in imported:
        if not o.name.startswith('shell.') or len(o.data.polygons) > 4:
            continue
        n = o.data.polygons[0].normal.copy()
        if n.length < 0.5:
            continue
        o.location -= n.normalized() * 0.001
    # 5b. smooth shading where the exhibit meant it (bevelled boxes carry normals already)
    for o in imported:
        if o.data.has_custom_normals:
            continue
        for p in o.data.polygons:
            p.use_smooth = True

    # 6. lights, world
    made, dropped = lights.build_lights(scene_json, cols['lights'])
    log(quiet, 'lights: kept %d, dropped %d (%s)' % (len(made), len(dropped),
        ', '.join(sorted(set(d[1] for d in dropped)))))
    world.build_world(scene)
    world.apply_color_management(scene, cameras.BASE_EXPOSURE)

    # 7. cameras
    cams = cameras.build_cameras(scene_json, profile, cols['cameras'])
    scene.camera = cams.get('bed') or next(iter(cams.values()))
    log(quiet, 'cameras: %s' % ', '.join('%s (exp %+.2f)' % (k, v['exposure']) for k, v in cams.items()))

    # 8. zones
    ctx = {'scene_json': scene_json, 'materials': mats, 'collections': cols, 'objects': objects,
           'lights': made, 'cameras': cams, 'export_dir': export_dir}
    zones.apply_all(scene, ctx)

    # 9. Cycles defaults for an interior; render.py sets samples and size per run
    scene.render.engine = 'CYCLES'
    cy = scene.cycles
    cy.device = 'CPU'
    cy.use_light_tree = True
    cy.max_bounces = 10
    cy.diffuse_bounces = 5
    cy.glossy_bounces = 6
    cy.transmission_bounces = 8
    cy.transparent_max_bounces = 12
    cy.volume_bounces = 0
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    cy.sample_clamp_direct = 0.0
    cy.sample_clamp_indirect = 8.0
    cy.blur_glossy = 0.5
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.image_settings.color_depth = '8'
    scene.render.film_transparent = False
    scene['photoreal_build'] = {
        'exportedAt': scene_json.get('exportedAt'),
        'meshes': len(imported), 'materials': len(mats), 'lights': len(made),
        'builtAt': time.strftime('%Y-%m-%dT%H:%M:%S'),
    }

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=out_path, compress=False, relative_remap=False)
    log(quiet, 'saved %s in %.1f s total' % (out_path, time.time() - t0))
    return out_path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--export', default=os.path.join(HERE, 'export'))
    ap.add_argument('--out', default=None)
    ap.add_argument('--quiet', action='store_true')
    a = ap.parse_args()
    out = a.out or os.path.join(a.export, 'king-studio.blend')
    build(a.export, out, a.quiet)


if __name__ == '__main__':
    main()
