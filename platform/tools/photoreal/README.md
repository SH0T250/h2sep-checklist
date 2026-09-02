# Photoreal loop tools

Tools for the King Studio (room 110) render versus photograph loop. The render
pipeline (export from the exhibit, Blender Cycles, camera signature post pass) and
the judging harness (blind composites, camera matching, measurement, ledger,
progress page) live side by side here. The photographs never enter the repo;
they live only under the session scratch directory, and every path below that
starts with `$SCRATCH` means
`/tmp/claude-0/-home-user-h2sep-checklist/fb47d53f-23f6-5d8f-88e1-343b94d9771e/scratchpad`.

## Judging harness

All python tools run on the system python3 with Pillow and numpy. The node tools
run on node 22 with no npm dependencies. Every one of them prints its output path
or a JSON line so a workflow can chain them. The loop itself is described in
`research/king-studio/photo-loop/README.md`, and the tell checklist a critic is
handed is `platform/tools/photoreal/critic-checklist.md`.

Two measurement rules from `research/king-studio/critic-log.md` round 3 are built
into every tool and must not be relaxed:

1. Resample both images to a common width with the same filter before any
   spatial statistic. The renders and the photographs are different sizes.
2. Never compare chroma without a JPEG q92 4:2:0 control on the render. The
   photographs carry that subsampling and a PNG render beside one measures
   several times the chroma noise purely from the file format.

### blind_pair.py, the blind composite

```
python3 platform/tools/photoreal/blind_pair.py --view bed --round 3 --salt a \
    --render $SCRATCH/renders/bed/r3.jpg \
    --photo $SCRATCH/demo-room/full/20260812_141100.jpg \
    --out $SCRATCH/blind
```

Prints `{"composite": ..., "key": ...}`. Writes `<out>/<view>-r<round><salt>.png`,
two 1000x750 panels labelled only A and B, and `<out>/<view>-r<round><salt>.key.json`
with `renderPanel`, `photo` (file name) and `render`. The render's panel is the
parity of the first byte of sha256 of `h2sep|<view>|<round><salt>`, so it is
reproducible and not guessable. Before compositing the render is round-tripped
through JPEG q92 4:2:0 at the photograph's width and both images are resampled
to the panel with LANCZOS. The composite carries no EXIF or text chunks. The
critic sees the composite and never the key.

### overlay.py, camera matching

```
python3 platform/tools/photoreal/overlay.py --mode blend --render <img> --photo <img> --out <file or dir>
```

Modes: `blend` (50/50 mix at 1000 px), `edges` (Sobel edges, photo in cyan and
render in orange on gray, white where they coincide), `wipe` (left half photo,
right half render), `diff` (absolute luminance difference, 0.25 is white). If
`--out` is a directory the file is `overlay-<mode>.jpg`. Prints the output path.
The render is letterboxed onto the photograph's aspect, never stretched.

### stats.py, the measured comparison

```
python3 platform/tools/photoreal/stats.py --render <img> --photo <img> [--width 1000] [--json] [--markdown]
```

Both images go to 1000 px wide first. Rows: frame mean luminance, clipped
percent (L >= 0.98), dark percent (L < 0.5), p1, p99, 12x12 block sigma, frame
sigma, mean saturation and warmth (R minus B) with the JPEG control applied to
the render and marked as such, gradient energy, and the radial power spectrum
ratio render over photo in five bands of cycles per frame. Each row carries a
verdict: over, under or match (within 5 percent of the photograph's value), and
for the spectrum bands busier or smoother than photo (within 8 percent is a
match). `--json` appends the numbers as one JSON object for the ledger.

Baseline on record, the three.js exhibit's bed view
(`$SCRATCH/shots/baseline/bed.png`, 2400x1800) against photograph
20260812_141100.jpg (2000x1500), before this loop started:

| statistic | render | photo | delta | verdict |
|---|---|---|---|---|
| frame mean luminance | 0.4479 | 0.4145 | +0.0334 | over |
| clipped % (L >= 0.98) | 0.095% | 0.097% | -0.002% | match |
| dark % (L < 0.5) | 59.296% | 73.326% | -14.030% | under |
| p1 luminance | 0.0507 | 0.0344 | +0.0163 | over |
| p99 luminance | 0.8712 | 0.8631 | +0.0081 | match |
| 12x12 block sigma | 0.0918 | 0.0953 | -0.0035 | match |
| frame sigma | 0.2242 | 0.1927 | +0.0315 | over |
| mean saturation (JPEG control) | 0.1808 | 0.2744 | -0.0936 | under |
| warmth (R - B) (JPEG control) | 0.0709 | 0.0580 | +0.0129 | over |
| gradient energy | 0.0994 | 0.1429 | -0.0434 | under |
| spectrum 10-25 c/frame | 3.026e+05 | 3.037e+05 | ratio 0.996 | match |
| spectrum 25-60 c/frame | 3.042e+04 | 3.371e+04 | ratio 0.903 | smoother than photo |
| spectrum 60-140 c/frame | 3066 | 2413 | ratio 1.271 | busier than photo |
| spectrum 140-300 c/frame | 464.4 | 312.5 | ratio 1.486 | busier than photo |
| spectrum 300-500 c/frame | 53.96 | 69.01 | ratio 0.782 | smoother than photo |

Reading it: the exhibit is a third of a stop bright in the shadows (p1 and dark
percent), carries two thirds of the photograph's saturation even after the JPEG
control, has less edge content overall (gradient energy) but too much power at
60 to 300 cycles per frame (procedural texture busier than the photograph's
carpet and wallpaper at that scale) and too little at 300 to 500 (no sensor
grain).

### ledger.mjs, the round ledger

```
node platform/tools/photoreal/ledger.mjs append --view bed --round 3 --json '<verdict json>'
node platform/tools/photoreal/ledger.mjs fix    --view bed --round 3 --json '<fix json>'
node platform/tools/photoreal/ledger.mjs status --view bed --round 3 --status spotted
node platform/tools/photoreal/ledger.mjs show   --view bed
```

Ledgers live at `research/king-studio/photo-loop/ledger/<view>.json` and are
committed; they hold text only. `append` adds a critic verdict
(`{pick, correct, confidence, tells, biggestGap, secondaryGaps, realismScore, wowed}`)
to the round, creating the round and the file if needed; `--render-jpg` sets the
round's render path. `fix` sets the round's `{changed, commit, notes}`. `status`
sets `spotted`, `fooled`, `wowed` or `pending`. Nothing is ever removed; a
critic's `correct` is recomputed from `pick` against the blind key when
`--key <key.json>` is passed.

### page.mjs, the progress page

```
node platform/tools/photoreal/page.mjs [out] [--updated "2026-09-02 15:00"]
```

Writes `$SCRATCH/progress/photo-loop.html` by default: one self-contained page
(images as data URIs) with the photograph beside the latest render for each of
the seven views, the verdict badge, the critic's confidence and biggest gap, the
round history and a collapsed details block with every tell and every fix. The
latest render is `$SCRATCH/renders/<view>/latest.jpg` when it exists, otherwise
the three.js baseline screenshot labelled as such. The page embeds photographs
and is never committed. The last updated stamp comes from `--updated` or the
`PHOTO_LOOP_UPDATED` env, so the file does not change unless the data did.

## Render pipeline

The offline path: the exhibit's proven A550 geometry and camera stations go
into Blender Cycles (the `bpy` 5.0.1 python module, CPU only, 4 cores,
OpenImageDenoise) and a post pass puts the phone's camera signature on the
frame. Nothing in it changes the room's dimensions; it is about light,
materials, cameras and the picture. Anything placed that no sheet or
photograph fixes is labelled SCALED or STYLIZED in a code comment beside it.

Files, all under `platform/tools/photoreal/`:

| file | what it is |
|---|---|
| `export.mjs` | playwright script: the exhibit to `export/` (OBJ, scene.json, textures) |
| `build.py` | rebuilds `export/king-studio.blend` from the export and `scene/` |
| `scene/` | the python package build.py runs: units, materials, lights, world, cameras, zones |
| `render.py` | renders one view at preview or judge quality, then runs post.py |
| `post.py` | the camera signature; also `--measure` for calibrating grain against a photograph |
| `camera_profile.json` | per view EXIF, exposure values and every post parameter |
| `export/` | derived and gitignored: `mesh.obj`, `scene.json`, `textures/*.png`, `king-studio.blend` |

### export.mjs, the exhibit to files

```
PW=/opt/node22/lib/node_modules/playwright/node_modules/playwright-core/index.mjs \
CHROME=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell \
node platform/tools/photoreal/export.mjs [--base=http://localhost:8343] [--out=<dir>]
```

Needs an http-server at the repo root (port 8343 by default). Boots
`platform/king-studio.html?view=bed`, waits for `window.__ready`, then walks
`window.KS.scene`. The exhibit keeps `M`, `TEX`, `MIRRORS`, `CANS` and the shell
constants inside its closure, so the script intercepts the page response with a
playwright route and appends them to `window.KS`; the committed page is never
edited. Prints boot time, export time and counts. About 35 s to boot on
SwiftShader, 11 s to export: 411 meshes, 129,486 triangles, 33 textures, 32
lights, 99 material keys.

Writes to `export/`:

- `mesh.obj`: one `o <zone>.<materialKey>.<n>` per mesh with `usemtl
  <materialKey>`. Vertices are world space, converted from the exhibit's feet
  with Y up to Blender metres with Z up: three.js `(x, y, z)` to Blender
  `(x, -z, y)` times 0.3048. The finished model sits in a group with
  `scale.z = -1`, so every mesh has a negative determinant and its triangle
  winding is flipped on the way out; normals go through the normal matrix.
  Each clone's texture repeat and offset are baked into its UVs, so one
  material key serves every clone `tiled()` made. Verified in bpy: the shell is
  3.658 m by 8.839 m in plan (12 ft by 29 ft) with a 2.524 m ceiling, the window
  wall at Blender Y = 0 (the +Y end) and the corridor wall at Y = -8.839; the
  bath sits at the -Y end on the -X side.
- `scene.json`: `materials` keyed by material key (type, colour, roughness,
  metalness, emissive, opacity, transparency, transmission, ior, side, and per
  texture channel the png file with repeat, offset and wrap), `lights` (type,
  colour, intensity, decay, distance, angle, penumbra, world position and
  target in both coordinate systems, castShadow), `cameras` (every `VIEWS`
  station in feet and metres) plus the exhibit's `hfov` of 71, `mirrors` (the
  planar mirror mesh names), `shell` (every section 1 constant) and
  `shellBlender`, `meshes` (name, zone, material, triangle count, bbox, flags)
  and `counts`.
- `textures/*.png`: one file per distinct canvas, at native size, named by its
  `TEX` key; `srgb` is recorded per texture (bump maps are linear).

Material keys: the exhibit's `M` keys, plus `mirror` (silvered planar
reflectors), `mirrorGlass` (the two shower panes, which carry the GLASS define),
`canLens` and `canHalo` (the recessed can lens and its additive floor pool),
`sky` (the daylight card outside the glass), and `inl-<hex>-r<roughness>-m<metalness>[...]`
for the materials the furniture code builds inline with `std()` and never puts
in `M`; identical inline materials merge. Zones come from the world bounding box
centre: `bath` inside the bath rectangle, `entry` and `kitchen` (working wall
side) in the entry leg, `working` within 2.5 ft of x = W, `lounge` between the
entry leg and the divider soffit, `bed` beyond it, `shell` for the room planes.
Meshes whose material is a `MIRRORS` entry are named `<zone>.mirror.<n>`.

### build.py, the Cycles scene

```
python3 platform/tools/photoreal/build.py [--export DIR] [--out FILE.blend] [--quiet]
```

Deterministic, about 1.3 s. Factory settings, imports `mesh.obj` with Blender
axes (`forward_axis='Y', up_axis='Z'`, the exporter already converted), puts
objects into collections by zone, builds every material, lights, world, cameras,
calls `scene/zones/*.apply()`, sets Cycles defaults sane for an interior (light
tree, 10 bounces, indirect clamp 8, no caustics) and saves
`export/king-studio.blend`.

`scene/materials.py`: a Principled BSDF per material. Base colour from the
exported map multiplied by the material colour, else the colour alone (hex read
as an sRGB display colour, see `units.hex_to_linear`); roughness and metallic
from the exported values, the brushed roughness map multiplied in; bumpMap to a
Bump node with Distance = the exhibit's bumpScale in metres; emissive colour and
emissiveMap into the Principled emission. The window and the shower panes become
real glass (Transmission Weight 1) with shadow rays passed straight through so
daylight does not depend on caustic paths. Planar mirrors become metallic 1,
roughness 0. The exhibit's `toneMapped:false` emitters (globe, ledStrip, canLens,
sky card) become Emission surfaces at strengths in `EMISSION` that are SCALED.
The roller shade mixes in a Translucent BSDF. The rasteriser's occlusion decals
(edge, contact, canHalo) are hidden; lamp shades, globes and the sky card have
shadow visibility off so the point light inside a shade gets out and the sky
gets in. `OVERRIDES`, keyed by material key, is the hand tuning point (base
colour, roughness, metallic, emission strength and colour, bump distance, hide,
no shadow, alpha).

`scene/lights.py`: the exhibit runs with physicallyCorrectLights, so point and
spot intensities are candela-like and one constant converts both to Blender
watts (a spot in Cycles is a masked point light with the same on-axis
intensity): `watts = intensity * WATT_PER_UNIT`, SCALED. Kept: every light that
casts a shadow in the exhibit (its real fixtures all do) plus the one
non-casting warm point in the wardrobe. Dropped: the daylight wash spot, every
other non-casting point (bounce fakes), the hemisphere, ambient and upward
bounce directional, and the sun (the world does it).

`scene/world.py`: Blender's physical sky (multiple scattering) with the sun disc
at the NOAA solar position for Eagle Pass on 2026-08-12 19:10 UTC, elevation
75.1 and azimuth 202.1 degrees, so direct sun can only reach a strip inside the
sill. The compass bearing of the window is on no sheet: `WINDOW_AZIMUTH_DEG` is
SCALED. `SKY_STRENGTH` is the world's level against the lamps, SCALED. Colour
management is AgX with the phone's white balance (`WHITE_BALANCE_K`, SCALED).

`scene/cameras.py`: one camera per view at the exhibit's station (three.js
feet, converted), sensor width 36 mm, focal length 13 mm, horizontal fit, which
is the Galaxy S25 Ultra ultrawide the photographs were shot on. `STATIONS` takes
per view overrides in the exhibit's feet for the agent that refines them. Per
view exposure: `EV100 = log2(F^2 / T) - log2(ISO / 100)` from the photograph's
EXIF (in `camera_profile.json`), and `exposure = BASE_EXPOSURE - (EV100_view -
EV100_entry)`, so the seven views share one lighting rig and differ only the
way the phone's auto exposure differed. `BASE_EXPOSURE` is SCALED.

`scene/zones/<zone>.py`: `apply(scene, ctx)`, empty except for a docstring;
later agents put per zone object replacements there. `ctx` carries the scene
json, materials, collections, objects, lights and cameras.

### render.py, one view

```
python3 platform/tools/photoreal/render.py --view <name> --quality preview|judge \
    [--round N] [--tag t] [--samples n] [--out path] [--exposure stops] [--no-post] [--force-build]
```

Takes an exclusive `flock` on `$SCRATCH/render.lock` (one Blender render at a
time on the 4 core box) and prints how long it waited. Rebuilds the scene if
any file under `scene/`, `build.py`, `camera_profile.json` or
`export/scene.json` is newer than the .blend. Cycles CPU, adaptive sampling,
OpenImageDenoise with albedo and normal passes, light tree on.

| quality | size | samples | adaptive threshold | output |
|---|---|---|---|---|
| preview | 600x450 | 48 | 0.05 | `$SCRATCH/renders/<view>/preview-<tag>.jpg` |
| judge | 1200x900 | 160 | 0.02 | `$SCRATCH/renders/<view>/r<N>.png`, `r<N>.jpg`, `latest.jpg` |

`--round N` names the judge output; without it the next free number is used.
`--out` overrides the png path and puts the jpg beside it. Prints the render
seconds, the post seconds and the total. `PHOTOREAL_SCRATCH` and
`PHOTOREAL_RENDERS` override the directories.

### post.py, the camera signature

```
python3 platform/tools/photoreal/post.py <in.png> <out.jpg> --view <name>
python3 platform/tools/photoreal/post.py --measure <image> --box x,y,w,h [--width 2000]
```

In order: barrel distortion residue, lateral chromatic aberration rising with
r squared, vignette, a mild S tone curve with a soft shoulder and a small
saturation lift, ISP style unsharp mask, sensor grain scaled by the view's ISO
(square root, relative to `isoRef`) and rising into the shadows, then JPEG q92
4:2:0 with no EXIF. Every parameter is in `camera_profile.json` (`defaults`,
overridable per view under `views.<view>.post`).

Grain calibration, `--measure`: std of a 64x64 patch's luminance minus its own
blur, at a stated width. On the bed photograph's flat ceiling: 0.0039 at 2000 px
and 0.0038 at 1200 px; the entry and lounge ceilings 0.0039 and 0.0043. The
phone's denoiser leaves noise that is spatially correlated, so it does not fall
when the frame is downsampled and the render's grain is not scaled by width
(`grainWidthExponent` 0). `grainStd` 0.004 at `isoRef` 200 is that measurement.
Everything is deliberately small: an over graded frame is its own tell.

### Timings on this box (4 cores, CPU Cycles)

| step | time |
|---|---|
| export.mjs | 35 to 60 s to boot the exhibit on SwiftShader, 11 s to export |
| build.py | 1.3 s |
| preview render, 600x450, 48 samples | 30 to 70 s (the bath views are slowest: glass and a small white box) |
| judge render, 1200x900, 160 samples, bed view | 401.5 s render, 1.2 s post, 403 s total |

A judge render must finish under 15 minutes; the bed view does in under 7. If a
view ever runs long, lower `--samples` (120 keeps the denoised frame clean on
these interiors) rather than the resolution.

### Calibration on record

- Grain: bed judge frame r1.jpg measures 0.0040 on the ceiling at 1200 px
  against the photograph's 0.0038 at the same width and box (the raw Cycles
  PNG measures 0.0020, the denoiser's residual; the post pass adds the rest).
- Exposure balance: with one constant for every light the bath rendered two
  stops under its EXIF exposure while the lamp lit lounge matched, so the
  exhibit's spot lights carry `SPOT_GAIN` 3.0 (SCALED). `BASE_EXPOSURE` 0.5,
  `SKY_STRENGTH` 0.25, `WHITE_BALANCE_K` 5000 were set by looking at all
  seven previews beside their photographs; 4200 K turned the carpet teal.
- The exhibit's tan ceiling (0xcdc1ac) is overridden to white paint in
  `materials.OVERRIDES`: the photographs show a white ceiling, and in a path
  tracer a tan ceiling darkens the whole room's second bounce.

### What does not work yet

Honest list after the first pass, for the agents that follow:

- Framing. Every camera stands at the exhibit's station, which was chosen for
  a 71 degree lens. With the real 108 degree ultrawide the bed frame is taken
  from the lounge, not from the foot of the bed where photo-09 was shot, and
  the same is true to a lesser degree of every view. `cameras.STATIONS` is
  the override point; the harness's overlay tool is the way to refine.
- Colour of the big surfaces. The exhibit's carpet texture is grey green and
  reads teal in daylight; the photographs' carpet is charcoal navy with a tan
  pattern. The roller shade motif renders paler than the photograph's deep
  reds. Both are material work (`OVERRIDES`, or a new texture in a zone
  module), not pipeline work.
- Brightness balance per zone. The bath and entry still sit a little under
  their photographs at their EXIF exposures; the lounge and bed are close.
  One more pass on `SPOT_GAIN` or per fixture power in `lights.py` is needed.
- Coincident surfaces. The exhibit relies on depth order in several places.
  The shell planes are nudged; a flush box against a non shell box would
  still shadow itself. None showed in the seven previews after the fix, but
  look for pure black patches.
- Soft goods and detail are the exhibit's geometry as exported: the mattress
  and pillows carry the exhibit's tufting mesh, the curtain is the exhibit's
  ripple. Better objects go into `scene/zones/<zone>.py`.
- No depth of field and no motion blur in the post pass; the ultrawide at
  f/1.9 has almost none at these distances, so this is deliberate for now.
- The window is a white card, not a view. The photographs blow it to white
  with a cyan cast; the render's card is neutral white at strength 6.
