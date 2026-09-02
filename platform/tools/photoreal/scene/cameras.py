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
from mathutils import Quaternion, Vector

from . import units

SENSOR_WIDTH_MM = 36.0
FOCAL_MM = 13.0
FNUMBER = 1.9
REFERENCE_VIEW = 'entry'
BASE_EXPOSURE = 0.5          # SCALED, stops

# Optional per view station overrides in three.js world feet: {'p': [...], 't': [...]}
# plus an optional 'roll' (degrees, positive turns the camera counterclockwise
# seen from behind, so the picture leans clockwise) and an optional 'f'
# (effective focal length in mm, 12 to 15, because the phone crops after
# distortion correction).  A missing view means "use the exhibit's station".
STATIONS = {
    # entry, photo-04 (20260812_141012.jpg).  Solved by least squares from the
    # photograph: the partition corner at the soffit, the bathroom door casing,
    # both window sill corners and both ceiling corners of the window wall
    # (all A550 shell points), rms residual 0.008 of the frame.  The phone
    # stood on the entry tile 1.9 ft off the bath partition, 24.75 ft from the
    # window wall, lens 5.9 ft up (held above eye level), pitched 6 degrees
    # down and rolled 1 degree.  The effective focal length came out at the
    # 15 mm end of the allowed range: the phone crops after distortion
    # correction, so its frame is narrower than a bare 13 mm.
    # Its exposureTrim (-0.85 stops, camera_profile.json) was MEASURED with
    # stats.py against the photograph's frame mean of 0.480: exposure -0.2
    # gave 0.518 and -0.6 gave 0.444 at 16 samples.
    'entry': {'p': [7.83, 5.92, 24.75], 't': [9.39, 3.17, 0.0], 'roll': 1.0, 'f': 15.0},
    # bath-shower, photo-24 (20260812_141304.jpg).  Fitted to the enclosure
    # frame's four outer corners, the curb's two floor corners and the drain
    # (rms 41 px at 2000 px).  The phone stood at the toilet leaning over the
    # vanity front, lens 5.2 ft up, square on the shower, pitched 22 degrees
    # down; the focal length again wanted the 15 mm end of the range.
    'bath-shower': {'p': [1.215, 5.182, 21.931], 't': [2.454, 2.964, 27.367], 'roll': -1.6, 'f': 15.0},
    # working, photo-05 (20260812_141016.jpg).  Fitted to seven A550 shell
    # points of the photograph (the window wall's top right ceiling corner,
    # both valance top corners, both glass sill corners, the entry partition
    # corner at the soffit and at the floor), rms 16 px at 2000 px.  The phone
    # stood on the entry tile 1.2 ft off the bath partition and 3.6 ft short
    # of the window wall's 29 ft mark, lens 5.3 ft up, turned 17 degrees
    # toward the working wall, pitched 9 degrees down, rolled 2.4 degrees;
    # the focal length again wanted the 15 mm end of the range.
    'working': {'p': [7.21, 5.27, 25.44], 't': [10.11, 3.67, 16.0], 'roll': 2.43, 'f': 15.0},
    # kitchen, photo-18 (20260812_141218.jpg).  Fitted to the door leaf's four
    # corners, the frame head, the lever height on the strike edge, the entry
    # can and the working wall corner with a pinhole solve, rms 15 px at
    # 1000 px.  The phone stood in the entry hall 0.9 ft off the bath
    # partition and 5.5 ft short of the corridor wall, lens 5.7 ft up, turned
    # 37 degrees toward the working wall, pitched 16.5 degrees down and rolled
    # 1.8 degrees; 15 mm fits better than 13.  The entry ceiling corner was
    # left out of the solve: the photograph puts the ceiling about half a
    # foot above the door head, more than the shell's soffit allows.
    'kitchen': {'p': [6.85, 5.67, 23.46], 't': [9.743, 4.251, 27.276], 'roll': -1.8, 'f': 15.0},
    # bed, photo-09 (20260812_141100.jpg).  Least squares against 20 photo
    # points (the accent wall's ceiling corner and ceiling line, the shade's
    # left edge top and bottom, the glass sill corner, the headboard and
    # mattress corners, both nightstand tops).  The phone stood at the foot
    # of the bed 2.2 ft off the working wall, 2.8 ft from the window wall,
    # lens 5.7 ft up, square on the accent wall, pitched 15 degrees down and
    # rolled 2 degrees; 15 mm again.  Residual rms 80 px at 2000 px: the
    # photograph's ceiling sits higher over the headboard than the shell's
    # 8.28 ft allows and its bed is shorter, so the shell points won.
    # Preview r1-2's edge overlay then showed the whole frame 12 px right of
    # the photograph at 1000 px (corner, shade edge, curtain edge alike), so
    # the aim turned 1.6 degrees toward the window.
    'bed': {'p': [9.82, 5.69, 2.84], 't': [-0.80, 2.92, 5.01], 'roll': 1.94, 'f': 15.0},
    # bath-vanity, photo-16 (20260812_141251.jpg).  Solved from the two
    # vanity wall corners (873 and 1988 px of 2000), the counter's front edge
    # and the x direction vanishing point that the mirror's top and bottom
    # edges give (287, 654), rms 33 px at 2000 px.  The phone stood against
    # the door partition's inner face (BIX 5.573 ft) at the vanity's right
    # end, 3.9 ft off the vanity wall, lens 4.25 ft up (held at the chest),
    # turned 46 degrees left along the wall, level; 15 mm again.  The
    # photograph's ceiling corner sits about 90 px higher than the shell's
    # 7.25 ft bath ceiling projects, so the ceiling lines were left out of
    # the solve and the shell was not changed.
    'bath-vanity': {'p': [5.37, 4.25, 24.43], 't': [2.474, 4.3, 21.675], 'f': 15.0},
    # lounge, photo-02 (20260812_141158.jpg).  Fitted to the A550 shell in the
    # photograph: the bath partition corner at the soffit and at the floor, the
    # accent wall ceiling corner at the partition and the accent wall ceiling
    # line.  The phone stood a step off the desk, 8.3 ft from the accent wall
    # and 14.2 ft from the window wall, turned 29 degrees toward the corridor,
    # lens about 3.6 ft up (held low, at the chest) and nearly level; the
    # focal length wanted the 15 mm end of the range like every other view.
    'lounge': {'p': [8.32, 3.64, 14.21], 't': [-0.40, 3.97, 19.09], 'roll': -2.0, 'f': 15.0},
}

def _look_at(obj, target, roll_deg=0.0):
    d = Vector(target) - obj.location
    q = d.to_track_quat('-Z', 'Y')
    if roll_deg:
        q = q @ Quaternion((0.0, 0.0, 1.0), math.radians(roll_deg))
    obj.rotation_euler = q.to_euler()


def exposure_for(view, profile):
    views = profile.get('views', {})
    ref = views.get(REFERENCE_VIEW, {})
    v = views.get(view, {})
    ev_ref = ref.get('ev100')
    ev = v.get('ev100')
    if ev_ref is None or ev is None:
        return BASE_EXPOSURE
    # exposureTrim (stops, per view in camera_profile.json) is the measured
    # correction after stats.py, on top of the EXIF difference.  SCALED.
    return BASE_EXPOSURE - (ev - ev_ref) + float(v.get('exposureTrim', 0.0))


def build_cameras(scene_json, profile, collection):
    cams = {}
    for name, rec in scene_json['cameras'].items():
        st = STATIONS.get(name)
        p = st['p'] if st else rec['p']
        t = st['t'] if st else rec['t']
        data = bpy.data.cameras.new('cam.' + name)
        data.sensor_fit = 'HORIZONTAL'
        data.sensor_width = SENSOR_WIDTH_MM
        data.lens = float(st.get('f', FOCAL_MM)) if st else FOCAL_MM
        data.clip_start = 0.03
        data.clip_end = 60.0
        obj = bpy.data.objects.new('cam.' + name, data)
        obj.location = Vector(units.three_to_blender(p))
        _look_at(obj, units.three_to_blender(t), float(st.get('roll', 0.0)) if st else 0.0)
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
