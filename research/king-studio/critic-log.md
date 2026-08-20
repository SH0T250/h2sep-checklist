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
