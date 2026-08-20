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

