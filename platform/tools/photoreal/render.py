#!/usr/bin/env python3
"""Render one view of the King Studio Cycles scene.

    python3 platform/tools/photoreal/render.py --view <name> --quality preview|judge
        [--round N] [--tag t] [--samples n] [--out path] [--exposure stops]
        [--no-post] [--force-build]

Quality:
  preview   400x300, 32 samples, adaptive, denoised.  Sized for a quick look while a
            dozen agents share four cores; judge quality is the picture that counts.
  judge     1200x900, 160 samples, adaptive threshold 0.02, OpenImageDenoise,
            light tree.  Must finish under 15 minutes on the 4 core box.

Output (conventions shared with the harness):
  judge     <renders>/<view>/r<N>.png (raw Cycles), r<N>.jpg (after post.py),
            and latest.jpg (a copy of the jpg)
  preview   <renders>/<view>/preview-<tag>.jpg
  --out     overrides the png path; the jpg lands beside it

Only one Blender render runs at a time: the script takes an exclusive flock on
<scratch>/render.lock and prints how long it waited.  If any file under
scene/ or build.py or camera_profile.json is newer than the .blend, the scene
is rebuilt first (build.py, under a second).

<renders> is $PHOTOREAL_RENDERS if set, else <scratch>/renders where <scratch>
is $PHOTOREAL_SCRATCH or the session scratchpad this pipeline was built in.
"""
import argparse
import fcntl
import glob
import os
import shutil
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

DEFAULT_SCRATCH = '/tmp/claude-0/-home-user-h2sep-checklist/fb47d53f-23f6-5d8f-88e1-343b94d9771e/scratchpad'
SCRATCH = os.environ.get('PHOTOREAL_SCRATCH', DEFAULT_SCRATCH)
RENDERS = os.environ.get('PHOTOREAL_RENDERS', os.path.join(SCRATCH, 'renders'))
LOCK = os.path.join(SCRATCH, 'render.lock')
EXPORT = os.path.join(HERE, 'export')
BLEND = os.path.join(EXPORT, 'king-studio.blend')

QUALITY = {
    'preview': dict(w=400, h=300, samples=32, threshold=0.08, denoise=True),
    'judge': dict(w=1200, h=900, samples=160, threshold=0.02, denoise=True),
}


def sources_newer_than(blend):
    if not os.path.exists(blend):
        return True
    bt = os.path.getmtime(blend)
    files = glob.glob(os.path.join(HERE, 'scene', '**', '*.py'), recursive=True)
    files += [os.path.join(HERE, 'build.py'), os.path.join(HERE, 'camera_profile.json'),
              os.path.join(EXPORT, 'scene.json')]
    return any(os.path.exists(f) and os.path.getmtime(f) > bt for f in files)


def ensure_built(force):
    if force or sources_newer_than(BLEND):
        t = time.time()
        subprocess.run([sys.executable, os.path.join(HERE, 'build.py'), '--quiet'], check=True)
        print('[render] rebuilt scene in %.1f s' % (time.time() - t), flush=True)


def render(view, q, samples, out_png, exposure_override=None, seed=0):
    import bpy
    bpy.ops.wm.open_mainfile(filepath=BLEND)
    scene = bpy.context.scene
    cam = bpy.data.objects.get('cam.' + view)
    if cam is None:
        raise SystemExit('no camera for view %r; views: %s' % (view, [o.name[4:] for o in bpy.data.objects if o.name.startswith('cam.')]))
    scene.camera = cam
    exposure = float(cam['exposure']) if exposure_override is None else float(exposure_override)
    scene.view_settings.exposure = exposure

    scene.render.engine = 'CYCLES'
    cy = scene.cycles
    cy.device = 'CPU'
    cy.samples = samples
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = q['threshold']
    cy.adaptive_min_samples = 0
    cy.use_light_tree = True
    cy.seed = seed
    cy.use_denoising = q['denoise']
    if q['denoise']:
        try:
            cy.denoiser = 'OPENIMAGEDENOISE'
            cy.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
            cy.denoising_prefilter = 'ACCURATE'
            cy.denoising_use_gpu = False
        except TypeError as e:
            print('[render] denoiser setup:', e)
    scene.render.threads_mode = 'AUTO'
    scene.render.resolution_x = q['w']
    scene.render.resolution_y = q['h']
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.image_settings.color_depth = '8'
    scene.render.filepath = out_png
    scene.render.use_file_extension = False
    t = time.time()
    bpy.ops.render.render(write_still=True)
    return time.time() - t, exposure


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--view', required=True)
    ap.add_argument('--quality', default='preview', choices=sorted(QUALITY))
    ap.add_argument('--round', type=int, default=None)
    ap.add_argument('--tag', default=None)
    ap.add_argument('--samples', type=int, default=None)
    ap.add_argument('--out', default=None)
    ap.add_argument('--exposure', type=float, default=None, help='override the view exposure (stops)')
    ap.add_argument('--seed', type=int, default=0)
    ap.add_argument('--no-post', action='store_true')
    ap.add_argument('--force-build', action='store_true')
    a = ap.parse_args()

    q = dict(QUALITY[a.quality])
    samples = a.samples or q['samples']
    view_dir = os.path.join(RENDERS, a.view)
    os.makedirs(view_dir, exist_ok=True)
    if a.out:
        png = a.out
        jpg = os.path.splitext(png)[0] + '.jpg'
    elif a.quality == 'judge':
        n = a.round
        if n is None:
            have = [int(os.path.basename(f)[1:-4]) for f in glob.glob(os.path.join(view_dir, 'r*.png'))
                    if os.path.basename(f)[1:-4].isdigit()]
            n = (max(have) + 1) if have else 1
        png = os.path.join(view_dir, 'r%d.png' % n)
        jpg = os.path.join(view_dir, 'r%d.jpg' % n)
    else:
        tag = a.tag or time.strftime('%H%M%S')
        png = os.path.join(view_dir, 'preview-%s.png' % tag)
        jpg = os.path.join(view_dir, 'preview-%s.jpg' % tag)

    os.makedirs(SCRATCH, exist_ok=True)
    t0 = time.time()
    with open(LOCK, 'w') as lockf:
        fcntl.flock(lockf, fcntl.LOCK_EX)
        waited = time.time() - t0
        print('[render] lock acquired after %.1f s' % waited, flush=True)
        ensure_built(a.force_build)
        secs, exposure = render(a.view, q, samples, png, a.exposure, a.seed)
        print('[render] %s %s %dx%d %d samples exposure %+.2f: %.1f s -> %s' %
              (a.view, a.quality, q['w'], q['h'], samples, exposure, secs, png), flush=True)
        if not a.no_post:
            t = time.time()
            from post import apply_signature
            apply_signature(png, jpg, a.view, os.path.join(HERE, 'camera_profile.json'))
            print('[render] post %.1f s -> %s' % (time.time() - t, jpg), flush=True)
            if a.quality == 'judge' and not a.out:
                shutil.copyfile(jpg, os.path.join(view_dir, 'latest.jpg'))
        if a.quality == 'preview' and not a.no_post and os.path.exists(png) and not a.out:
            os.remove(png)     # previews are the jpg only
    print('[render] total %.1f s' % (time.time() - t0), flush=True)


if __name__ == '__main__':
    main()
