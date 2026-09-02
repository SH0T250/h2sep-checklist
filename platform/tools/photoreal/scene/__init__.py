"""Blender Cycles scene for the King Studio (Room 110) photoreal loop.

The package turns platform/tools/photoreal/export/ (written by export.mjs from
the exhibit platform/king-studio.html) into a Cycles scene.  build.py drives
it; every module here is small and single purpose:

  units.py      feet to metres, three.js axes to Blender axes, sRGB hex to linear
  materials.py  Principled BSDF per exported material, OVERRIDES for hand tuning
  lights.py     three.js lights to Blender lights, one conversion constant
  world.py      the sky outside the window and the colour management
  cameras.py    one camera per view, phone lens, per view exposure from EXIF
  zones/        per zone object replacements, empty until a later agent fills one

Nothing here changes the room's dimensions.  Those are proven off A550 and
carried by the exhibit's geometry; this package is about light, materials and
cameras.
"""
