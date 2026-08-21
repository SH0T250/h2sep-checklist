# Render versus photograph, critic log

Method: `platform/tools/blind-pair.mjs` puts the render and the matching photograph of room 110 on
one canvas as panel A and panel B, letterboxed to identical size. Which panel holds the render is a
hash of the view name and the round number. The critic is a fresh agent that sees only the composite
and is asked which panel is the render. Its answer is scored against a key it never sees.

A critic that picks correctly can tell. A critic that picks wrong, or says it could not tell, is the
bar Austin set.

## Round 0, control: the existing massing viewer

Run to prove the test discriminates before judging anything real. Paired the OLD room-3d.html
exhibit (room 105, bed preset) against photo-09, the bed elevation of room 110.

| | |
|---|---|
| Render was in | panel B |
| Critic answered | **panel B** |
| Correct | yes |
| Confidence | **instantly** |

Verbatim from the critic: "Panel B is not a failed photoreal render; it is a schematic block model
that was never trying."

Biggest gap named: **no light transport at all.** Flat per-face shading with no contact shadows, no
ambient occlusion and no bounced colour, so every object floats as coloured geometry rather than
sitting in a lit room.

Other tells it listed, worth keeping as a checklist for every future round:
- soft goods that are not soft: no pillow, no drape at the mattress corner, no sag over an edge
- a hard black seam where the bed meets the floor instead of a shadow pool
- aliased polygon edges, a pixel ladder no lens produces
- no material identity: wood with no grain, a sconce that emits nothing, glass that neither
  transmits nor reflects, carpet with no pile
- no sensor signature: zero grain, no vignette, no lens distortion, no highlight rolloff
- an impossible camera: a modelling viewport orbit rather than a place a person stood

What the critic used to identify the PHOTOGRAPH, which is the target to reproduce: raking light
losing texture into a corner, two globe lamps each producing a real inverse-square wash that dies
before it meets in the middle, quilted tufting where each button pulls a shallow crater and the
ticking wrinkles between them, low-light luminance noise in the shadows, and a blown window shade
where the sensor clipped.

CONCLUSION: the test discriminates. The baseline is "spotted instantly". Light transport is the
first thing the new King Studio scene has to earn, before any amount of texture work matters.

## Round 1: the new King Studio scene, first blind test

Seven views of platform/king-studio.html, each paired against the photograph of room 110 that the
photo index names for it. Panel assignment varied (A, B, A, B, A, B, B) and no critic saw a key.

| view | critic said | truth | outcome | confidence |
|---|---|---|---|---|
| bath-shower | A | A | spotted | instantly |
| bath-vanity | B | B | spotted | instantly |
| bed | A | A | spotted | instantly |
| entry | B | B | spotted | instantly |
| kitchen | A | A | spotted | instantly |
| lounge | B | B | spotted | instantly |
| working | B | B | spotted | instantly |

**SCORE: 7 of 7 identified. Zero fooled.**

### What the round bought, even though the verdict did not move

The seven round-0 critics had unanimously blamed missing shadows. That turned out to be wrong, and
the measurement is worth keeping:

- Shadows were rendering correctly all along. Turning them off changed 18.33% of pixels, so the maps
  had real content. The pristine boot frame and a force-rebaked frame were byte identical.
- The actual cause was that shadows had almost nothing to modulate. `scene.environment` was supplying
  **52.0% of the frame's mean luminance** as a fully unoccluded diffuse term, which nothing in the
  room can block. Of the remaining light-based illumination, **88.9% came from lights with
  castShadow false**. The two lights that did cast contributed **2.4% of the image**.
- The working wall could never receive a shadow at all: the sun's direction gave N dot L = -0.223 on
  that wall, so it was back-facing to the only meaningful caster in the scene.

Fixes applied: the environment map was demoted from light source to reflection on rough materials
(52.0% down to 19.4%), ten lights now cast instead of two, ceiling downlights were added that
actually face the walls, the sun's shadow frustum was widened to enclose 100% of the floor, and the
ambient and hemisphere terms were cut to give the image a real black point.

Measured improvement, bed view: pixels below mid grey went 18.5% -> 27.6%; p1 luminance 0.082 -> 0.043.
A better picture. Not a convincing one.

### Round 1's named gaps, in the critics' own priority order

1. **The bathroom mirror reflects nothing.** A flat vertical grey gradient. One critic: "that single
   failure exposes the whole panel as synthetic". This is the highest-value single fix in the set.
2. **Soft goods are rigid.** The mattress is a box with tufting painted on rather than dimpled into
   it; the critic contrasted it with the photograph, where "each button pulls a shallow crater and
   the ticking wrinkles between them". The curtain is an extruded ripple with identical pleats and
   no weighted hem. The sofa is a bevelled box.
3. **No camera signature anywhere.** No sensor noise, no chromatic aberration, no vignette, no lens
   distortion, no depth of field. Every critic listed the photograph's noise and clipped highlights
   as what marked it real.
4. **Metal and glass do no work.** No specular response on the faucet, the microwave or the fridge;
   glass that neither transmits nor layers reflections.
5. **bath-shower has no darks at all.** 0.2% of pixels below mid grey, p1 luminance 0.447. The critic
   noticed there is a daylight wash across the tile with no plausible source in a windowless room.

### Standing conclusion

The test discriminates and the score is honest. The gap is no longer "it looks fake", it is five
named, buildable things. Whether a browser scene can close all five against a phone photograph is
still an open question, and it should not hold up the floor 1 room data.


## Round 3

Method note that changes how every future round must measure: the renders are PNG at 2400x1650
and the photographs are JPEG at 2000x1500. **Both must be resampled to a common width before any
spatial statistic is taken**, and **chroma statistics must not be compared at all** without a
JPEG control. Two of round 3's first-pass findings were artefacts of ignoring this.

### What the round-2 critics said, and what it measured

Six of seven critics named the same cause: "a uniform ambient/dome fill is carrying the scene,
delete it and relight from physically placed emitters". **That diagnosis is wrong, and this is
the second round in a row where the critics have agreed on a cause that measurement rejects.**
Per-view ablation of `scene.environment` on the shipped build:

| view | environment share of frame mean | share of p1 |
|---|---|---|
| entry | 17.4% | — |
| lounge | 13.0% | — |
| bed | 8.5% | — |
| working | 13.6% | — |
| kitchen | 17.5% | — |
| bath-vanity | 2.0% | — |
| bath-shower | **0.4%** | 0.0% |

The bath-shower critic asked to "delete whatever flat ambient/HDRI fill is currently carrying the
scene". It carries 0.4% of that frame. Shadow-casting lights carry 63-89% of every frame; there
are 19 casters. The round-1 fix held.

### What was actually wrong

**1. THE WHOLE ROOM RENDERED AS ITS MIRROR IMAGE.** Not named by any of the fourteen critics
across rounds 1 and 2. The model is authored with z = 0 at the corridor wall and z = D at the
window, so entering the room is +z; in a right-handed scene with +y up, a camera at low z looking
toward +z has +x on its LEFT, which put the working wall (x = W) on the left of every frame.
Room 110 is the other way round. Confirmed against four pairings: photo-04 has the electrical
panel left and the shelf box right, photo-18 has the entry door right, photo-02 has the
full-length mirror left of the sofa, photo-09 has the divider curtain left - all four renders had
them reversed. Fixed with one group holding the finished model at `scale.z = -1, position.z = D`;
r128 flips the winding order for a negative-determinant `matrixWorld` (`determinant()<0` is in the
bundled renderer), so faces, normals and shadows follow. Camera stations, the two cube probes and
the bath material scope say `D - z`.

**2. No light fixture existed as an object.** MEASURED on the entry ceiling band: render max 0.799,
0.000% of pixels clipped, 0.068 mean saturation; photo-04 max 1.000, 1.534% clipped, 0.164
saturation. Ten recessed cans now exist as geometry - trim ring, a lens that is not tone mapped so
it saturates the way a source does, and an additive pool on the plane it sits in.

**3. The render clipped the wrong things.** MEASURED, lounge lamp shade: render mean 0.847 with
**16.9% of the shade clipped**; photo-02 mean 0.514 with **0.0%** clipped and three times the
internal gradient. A phone does not blow a lamp shade; it blows the source. The shade material now
carries a transmission gradient and the emitters left the tone curve (ACES asymptotes below 1.0,
so no tone-mapped emissive can ever saturate however hard it is driven).

**4. Where the photographs clip.** Of the pixels photo-18 clips, 86.7% are in the top quarter of
the frame; photo-16, 81.2%; photo-24, 87.7%. All three are the ceiling fixture, and all three
render cameras were aimed below the ceiling. Re-aimed.

**5. Stainless was white.** M.stainless was metalness 0.94, base 0.78 grey, envMapIntensity 1.9 -
a metal takes all its colour from the reflection, so a bright cube of a bright room at 1.9x can
only come out white. Base to 0.56, intensity to 1.0, plus a brushed roughness map.

**6. The window was the wrong colour.** MEASURED, photo-09's window rectangle: RGB
(0.595, 0.756, 0.831), blue minus red **+0.236**. The render's: (0.775, 0.749, 0.694), red minus
blue +0.081. A 0.32 swing on the brightest object in three frames, because the phone white
balances for 3000K lamps and daylight goes cyan.

### Two measurements that were WRONG, recorded so round 4 does not make them again

- **"Every surface carries 4-5x the photograph's chroma noise."** Carpet 0.0172 v 0.0046, bath tile
  0.0100 v 0.0019, ceiling 0.0048 v 0.0009 - five surfaces, one direction. It was the file format.
  The photographs are JPEG with 4:2:0 chroma subsampling. CONTROL: re-encoding the render as JPEG
  q92 4:2:0 took the carpet to 0.00616 and the tile to 0.00252, a residual of 1.3x. The
  desaturation pass built on it was backed out. Luminance bands survive the same control unchanged.
- **"The herringbone accent wall is 2.4-3.7x too contrasty."** A raycast through the screen point
  the box was measuring returns the full-length MIRROR's ShaderMaterial at 13.5 ft, not the
  wallpaper. Any region box must be confirmed by raycast or by cropping and looking at it.

### Result, mean per-view absolute error against the paired photograph, 7 views

| statistic | round 2 | round 3 | |
|---|---|---|---|
| frame mean | 0.0387 | 0.0229 | -40.8% |
| clipped pixels % | 0.4343 | 0.2358 | -45.7% |
| dark pixels % | 3.2819 | 2.1003 | -36.0% |
| p1 | 0.0281 | 0.0262 | -7.0% |
| p99 | 0.0655 | 0.0564 | -13.9% |
| 12x12 block sigma | 0.0307 | 0.0243 | -20.9% |
| frame sigma | 0.0342 | 0.0288 | -15.6% |
| saturation | 0.0461 | 0.0456 | -1.0% |
| warmth (R-B) | 0.0114 | 0.0124 | +8.2% |
| gradient energy | 0.0021 | 0.0026 | +26.4% |

Radial power spectrum, render/photograph, 1.000 is a match:

| band | round 2 | round 3 |
|---|---|---|
| 10-25 | 0.817 | 0.974 |
| 25-60 | 0.675 | 0.933 |
| 60-140 | 0.880 | 1.172 |
| 140-300 | 0.694 | 0.886 |
| 300-500 | 0.628 | 1.000 |

Mean |ratio - 1| across the five bands: 0.261 -> 0.076, a 71% reduction.

### Still open

- bath-shower: the enclosure glass is nearly invisible. Photo-24's dominant feature is the blown
  streak of the vanity fixture across the two panes and the doubled tile between the surfaces.
- bath-vanity: the ceiling is still out of frame after the aim correction, and the vanity wall
  measured L 0.726 against photo-16's 0.517 - half a stop over.
- The entry-zone carpet still reads lighter and greener than photo-04's dark navy.
- The car print over the sofa is a low-detail grey blob against a detailed dark photograph.
- Gradient energy now overshoots on some views and undershoots on others; the signed error
  improved but the absolute error got worse.

## Rounds 2 and 3

Both rounds: seven views, fresh critics, panels assigned by hash, no critic saw a key.

| round | identified the render | confidence |
|---|---|---|
| 2 | **7 of 7** | instantly, every one |
| 3 | **7 of 7** | instantly, every one |

Running total across three rounds: **21 judgements, 21 correct.**

### What round 2 actually fixed, and it was real work

The engineering was good and it was measured rather than guessed:

- **The mirror.** Diagnosed by instrumentation: the cube bake was working fine, but a cube environment
  map is an environment AT INFINITY, and in a 5 ft 6 in bathroom the reflected wall is 4 ft away, so
  the mirror showed a telephoto crop at the wrong parallax. Replaced with a true planar reflection
  (scene re-rendered from the mirrored camera, oblique near-plane clip, texture-matrix projection).
  **This worked and it is visible**: the bath mirror now carries the shower enclosure, the glass
  door, the tile and the grab bar, consistent with the room.
- **The bathroom light.** Per-light ablation found that `plane()` built every wall, floor and ceiling
  without `castShadow`, so the entire shell was transparent to light. The "diagonal daylight wash
  with no plausible source in a windowless room" was the sun, shining straight through the walls.
  71 surfaces now cast. The bath got its own fixtures.
- **A real camera pipeline.** Render to a multisample target with a depth texture, then a fullscreen
  pass doing barrel distortion, chromatic aberration rising with r squared, depth of field from the
  real depth buffer using a phone's thin-lens CoC, veiling glare, a tone curve, vignette and grain
  that rises into the shadows. Calibrated against the photographs' measured noise floor.
- **Soft goods with actual geometry.** Subdivided superellipsoid slabs, crowned, sagged where they
  overhang, with a crater pulled at each of 143 button positions and 3D value noise wrinkling. The
  stuck-on dimple spheres are gone.
- **Measured result:** bath-shower went from mean 0.766 / p1 0.447 / 0.2% of pixels below mid grey
  to mean 0.582 / p1 0.196 / 5.9%. The lounge went from 22.6% dark to 52.9%. The images genuinely
  changed.

### And the verdict did not move

Round 3's critics converged on the same complaint round 0 made: flat ambient fill, no contact
shadows, albedo-only surfaces. Reviewed by eye against the composites, they are still substantially
right, even though the specific mechanisms they name have been fixed and measured. The remaining
distance is not one bug. It is:

- **colour** - median saturation 0.146 against the photograph's 0.300, less than half. The
  herringbone wall and the carpet are drawn far greyer than they photograph. No camera curve fixes a
  wrong albedo.
- **light transport** - one bounce, everywhere. A 5 ft 6 in white bathroom bounces far harder than
  three point fills can imitate, and the falloff SHAPE is wrong, not just its level.
- **texture detail** - tile, wallpaper and solid surface are the flattest materials in the model, and
  sharpening cannot invent detail the texture does not have.
- **framing** - the render cameras are not standing where the photographer stood, so compositions
  differ even when the room is right.

### Standing conclusion after three rounds

The test is honest, the engineering each round has been real and measurable, and the score has not
moved: 21 of 21. A real-time browser renderer beating a phone photograph in a blind test is a
research-grade target, and it is not converging at a rate that more rounds of the same kind will fix.

What the loop DID produce is worth keeping: a dimensionally correct King Studio, built to A550, with
true planar mirrors, a physical camera model, deformed soft goods and per-room lighting. That is a
genuinely useful room model for showing a sub what goes where. It is not a photograph and should not
be sold as one.

**Recommendation: stop chasing indistinguishable, and keep the model for what it is good at.** If
photoreal is genuinely wanted later, the honest routes are a path-traced offline render or measured
material scans, not more rounds of this loop.

