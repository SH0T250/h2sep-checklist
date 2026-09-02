"""Per zone object replacements.

Each module exposes apply(scene, ctx) and starts empty.  build.py calls them
in order after the exhibit's geometry, materials, lights and cameras exist,
so a zone module can hide an exhibit object and put a better one in its
place, or move a light, without touching the importer.

ctx is a dict with: 'scene_json', 'materials' ({key: bpy material}),
'collections' ({zone: bpy collection}), 'objects' ({name: bpy object}),
'lights' ([(obj, record)]), 'cameras' ({view: obj}), 'export_dir'.

Zones, from the mesh names the exporter gives (<zone>.<materialKey>.<n>):
  shell    the six room planes
  entry    the tiled entry leg, bathroom door side
  kitchen  the kitchenette run on the working wall side of the entry leg
  working  the desk, dresser, TV and wardrobe run along x = W
  lounge   sofa, ottoman, lamps and mirror between the entry and the soffit
  bed      the bed, nightstands, curtain and window end
  bath     everything inside the bathroom
"""
from . import shell, entry, kitchen, working, lounge, bed, bath

ORDER = [shell, entry, kitchen, working, lounge, bed, bath]


def apply_all(scene, ctx):
    for mod in ORDER:
        mod.apply(scene, ctx)
