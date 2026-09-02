"""One camera per view, with the phone's real lens.

Every photograph was shot on the Galaxy S25 Ultra ultrawide: 13 mm
35mm-equivalent, f/1.9.  The exhibit's 71 degree cameras are wrong for those
frames, so every camera here is a 36 mm sensor with a 13 mm lens (about 108
degrees across the 4:3 frame), placed at the exhibit's station as a starting
point.  A later agent refines each station against its photograph; the
positions and targets are read from scene.json and can be overridden per
view through STATIONS below (three.js feet, the same numbers as the
exhibit's VIEWS table) without touching the exporter.

EXPOSURE.  The seven views share one lighting rig; they differ only the way
the phone's auto exposure differed.  For each view:

    EV100 = log2(F^2 / T) - log2(ISO / 100)

is read from the photograph's EXIF (camera_profile.json carries the values so
a build does not need the photographs present).  The Blender exposure for a
view is

    exposure = BASE_EXPOSURE - (EV100_view - EV100_reference)

so a view the phone exposed a stop shorter renders a stop darker.  The
reference is the entry view (ISO 320 at 1/120 s, EV100 7.08).  BASE_EXPOSURE
is SCALED: the one number that maps the rig's brightness to the photographs'
mid tones, set by comparing the bed view to photo-09.
"""
import math
import bpy
from mathutils import Vector

from . import units

SENSOR_WIDTH_MM = 36.0
FOCAL_MM = 13.0
FNUMBER = 1.9
REFERENCE_VIEW = 'entry'
BASE_EXPOSURE = 0.5          # SCALED, stops

# Optional per view station overrides in three.js world feet: {'p': [...], 't': [...]}.
# Empty means "use the exhibit's station from scene.json".
STATIONS = {
}


def _look_at(obj, target):
    d = Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


def exposure_for(view, profile):
    views = profile.get('views', {})
    ref = views.get(REFERENCE_VIEW, {})
    v = views.get(view, {})
    ev_ref = ref.get('ev100')
    ev = v.get('ev100')
    if ev_ref is None or ev is None:
        return BASE_EXPOSURE
    return BASE_EXPOSURE - (ev - ev_ref)


def build_cameras(scene_json, profile, collection):
    cams = {}
    for name, rec in scene_json['cameras'].items():
        st = STATIONS.get(name)
        p = st['p'] if st else rec['p']
        t = st['t'] if st else rec['t']
        data = bpy.data.cameras.new('cam.' + name)
        data.sensor_fit = 'HORIZONTAL'
        data.sensor_width = SENSOR_WIDTH_MM
        data.lens = FOCAL_MM
        data.clip_start = 0.03
        data.clip_end = 60.0
        obj = bpy.data.objects.new('cam.' + name, data)
        obj.location = Vector(units.three_to_blender(p))
        _look_at(obj, units.three_to_blender(t))
        obj['view'] = name
        obj['station_p_ft'] = list(p)
        obj['station_t_ft'] = list(t)
        v = profile.get('views', {}).get(name, {})
        obj['ev100'] = float(v.get('ev100', 0.0))
        obj['iso'] = int(v.get('iso', 100))
        obj['exposure'] = float(exposure_for(name, profile))
        collection.objects.link(obj)
        cams[name] = obj
    return cams
