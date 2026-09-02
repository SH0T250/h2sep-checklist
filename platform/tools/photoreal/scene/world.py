"""The world outside the window, and the colour management.

DAYLIGHT.  The photographs were taken 2026-08-12 at about 14:10 CDT in Eagle
Pass TX (28.709 N, 100.499 W).  The NOAA solar position for that instant is
elevation 75.1 degrees, azimuth 202.1 degrees (a little west of south): the
sun is nearly overhead, so whichever way the window faces, direct sun can
only reach a strip just inside the sill.  The daylight in the room is sky.

WHICH WAY THE WINDOW FACES is not on any sheet this pipeline has, so it is
SCALED: WINDOW_AZIMUTH below is a choice, made so the sky through the glass is
the soft, slightly cool wash the photographs show and no hard sun patch lands
on the carpet.  The exhibit's own DirectionalLight came from high on the
window side, which is consistent with this.

The sky is Blender's physical sky (the Nishita model, called single or
multiple scattering in Blender 5) with its sun disc on, so direct sun and sky
light come from one consistent source.  SKY_STRENGTH is SCALED against the
lamps in the same way WATT_PER_UNIT is (lights.py).

WHAT THE CAMERA SEES through the glass is the exhibit's sky card, kept as an
emission surface that only camera and glossy rays can hit (materials.py and
build.py): the photographs blow the window to white and the card does that
without the world having to.
"""
import math
import bpy

SUN_ELEVATION_DEG = 75.09     # NOAA, Eagle Pass, 2026-08-12 19:10 UTC
SUN_AZIMUTH_DEG = 202.12      # NOAA, degrees clockwise from north
WINDOW_AZIMUTH_DEG = 20.0     # SCALED: compass bearing the window looks out on
SKY_STRENGTH = 0.25           # SCALED: world strength against the lamps
SUN_INTENSITY = 1.0           # physical sky sun disc, scaled with SKY_STRENGTH
AIR_DENSITY = 1.0
DUST_DENSITY = 1.6            # SCALED: August haze over the Rio Grande

VIEW_TRANSFORM = 'AgX'
# The phone's auto white balance settled between the 3000 K lamps and the
# daylight: walls near neutral, lamps yellow, the window cyan (critic log,
# round 3: photo-09's window is blue minus red +0.236).  SCALED.
WHITE_BALANCE_K = 4200.0
WHITE_BALANCE_TINT = 0.0
LOOK_CANDIDATES = ['AgX - Base Contrast', 'Base Contrast', 'None', 'NONE']


def sun_rotation_for_room():
    """Sky texture sun_rotation (radians) so the sun sits where the compass says.

    The room's Blender +Y axis points out of the window, so it carries the
    window's compass bearing.  The sky node's sun_rotation is measured counter
    clockwise from +Y when seen from above; a compass azimuth is clockwise, so
    the relative bearing is negated.
    """
    rel = SUN_AZIMUTH_DEG - WINDOW_AZIMUTH_DEG
    return math.radians(-rel)


def build_world(scene):
    world = bpy.data.worlds.new('king-studio-sky')
    world.use_nodes = True
    nt = world.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputWorld')
    out.location = (400, 0)
    bg = nt.nodes.new('ShaderNodeBackground')
    bg.location = (200, 0)
    bg.inputs['Strength'].default_value = SKY_STRENGTH
    sky = nt.nodes.new('ShaderNodeTexSky')
    sky.location = (-100, 0)
    types = [i.identifier for i in sky.bl_rna.properties['sky_type'].enum_items]
    sky.sky_type = 'MULTIPLE_SCATTERING' if 'MULTIPLE_SCATTERING' in types else ('NISHITA' if 'NISHITA' in types else types[0])
    sky.sun_disc = True
    sky.sun_intensity = SUN_INTENSITY
    sky.sun_elevation = math.radians(SUN_ELEVATION_DEG)
    sky.sun_rotation = sun_rotation_for_room()
    sky.altitude = 220.0        # Eagle Pass is about 220 m above sea level
    sky.air_density = AIR_DENSITY
    if hasattr(sky, 'dust_density'):
        sky.dust_density = DUST_DENSITY
    nt.links.new(sky.outputs['Color'], bg.inputs['Color'])
    nt.links.new(bg.outputs['Background'], out.inputs['Surface'])
    scene.world = world
    return world


def apply_color_management(scene, exposure=0.0):
    scene.display_settings.display_device = 'sRGB'
    try:
        scene.view_settings.view_transform = VIEW_TRANSFORM
    except TypeError:
        scene.view_settings.view_transform = 'Filmic'
    for look in LOOK_CANDIDATES:
        try:
            scene.view_settings.look = look
            break
        except TypeError:
            continue
    scene.view_settings.exposure = float(exposure)
    scene.view_settings.gamma = 1.0
    if hasattr(scene.view_settings, 'use_white_balance'):
        scene.view_settings.use_white_balance = True
        scene.view_settings.white_balance_temperature = WHITE_BALANCE_K
        scene.view_settings.white_balance_tint = WHITE_BALANCE_TINT
