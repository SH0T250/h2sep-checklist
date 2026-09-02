"""three.js lights to Blender lights.

The exhibit runs with physicallyCorrectLights, so PointLight and SpotLight
intensities are candela-like (radiant intensity per steradian on axis) and
the DirectionalLight is an irradiance.  Blender's point and spot lights take
a power in watts where the intensity on axis is P / (4 pi) per steradian for
both types (a spot is a masked point light).  One constant therefore converts
both:

    watts = intensity * WATT_PER_UNIT

WATT_PER_UNIT is SCALED.  The exhibit's numbers were tuned against its own
ACES exposure of 0.745, not measured, so the constant is set by rendering the
bed view and matching the lamp pools in photo-09.  It is one number so that
the whole rig moves together; the per view differences stay in the cameras'
exposure (cameras.py).

Which exhibit lights are real fixtures:
  keep   every light that casts a shadow in the exhibit (its real fixtures
         all do: the four lamps, the ceiling cans, the desk lamp, the entry
         and kitchenette fixtures, the bath bar and cans)
  keep   the one non casting warm point (colour #ffc98a, the warm() colour) in
         the wardrobe: the reading light and hanging bay LED merged
  drop   the daylight wash spot at the window (a rasteriser fake for the light
         through the opening; the world does it here)
  drop   every other non casting point (they are bounce fakes), the hemisphere
         light, the ambient light and the upward "bounce" directional
  drop   the sun DirectionalLight: world.py puts a physical sun in the sky
         instead, at the computed solar position for the photograph's time
"""
import math
import bpy
from mathutils import Vector

from . import units

WATT_PER_UNIT = 1.0          # SCALED: Blender watts per exhibit intensity unit
# The exhibit's spots (ceiling cans, the bath bar, the desk lamp) were tuned
# against a shadow map rig where nothing bounced.  MEASURED on the first
# preview pass: with one constant the bath rendered two stops under the
# photograph at its EXIF exposure (ISO 80, 1/120 s) while the lamp lit lounge
# matched, so the fixtures the phone metered as bright are the spots.  SCALED.
SPOT_GAIN = 3.0
BULB_RADIUS = 0.035          # metres, a frosted globe or a lamp bulb  [SCALED]
CAN_RADIUS = 0.045           # metres, a recessed can lens             [SCALED]
WARM_COLOR = '#ffc98a'       # the exhibit's warm() lamp colour


def classify(L, shell):
    """Return 'keep' or a reason string for dropping this exhibit light."""
    t = L['type']
    if t in ('HemisphereLight', 'AmbientLight'):
        return 'ambient fake'
    if t == 'DirectionalLight':
        return 'sun handled by world.py' if L['intensity'] > 4 else 'bounce fake'
    if t == 'SpotLight':
        # the daylight wash sits within a foot of the window (three.js world z near 0)
        if abs(L['position'][2]) < 1.0 and L['intensity'] > 100:
            return 'daylight wash fake'
        return 'keep'
    if t == 'PointLight':
        if L['castShadow']:
            return 'keep'
        if L['color'].lower() == WARM_COLOR:
            return 'keep'
        return 'bounce fill fake'
    return 'unknown type'


def _look_at(obj, target):
    d = Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def build_lights(scene_json, collection):
    """Create Blender lights for the kept exhibit lights.  Returns [(obj, record)]."""
    made = []
    dropped = []
    n = 0
    for L in scene_json['lights']:
        why = classify(L, scene_json['shell'])
        if why != 'keep':
            dropped.append((L['type'], why))
            continue
        n += 1
        kind = 'SPOT' if L['type'] == 'SpotLight' else 'POINT'
        data = bpy.data.lights.new('light.%02d.%s' % (n, kind.lower()), kind)
        data.color = units.hex_to_linear(L['color'])
        data.energy = float(L['intensity']) * WATT_PER_UNIT * (SPOT_GAIN if kind == 'SPOT' else 1.0)
        data.use_shadow = True
        if kind == 'SPOT':
            data.spot_size = min(math.pi, 2.0 * float(L['angle']))
            data.spot_blend = float(L.get('penumbra', 0.5))
            data.shadow_soft_size = CAN_RADIUS
        else:
            data.shadow_soft_size = BULB_RADIUS
        obj = bpy.data.objects.new(data.name, data)
        obj.location = Vector(L['positionBlender'])
        if L.get('targetBlender'):
            _look_at(obj, L['targetBlender'])
        obj['exhibit'] = L['type']
        obj['exhibit_intensity'] = float(L['intensity'])
        collection.objects.link(obj)
        made.append((obj, L))
    return made, dropped
