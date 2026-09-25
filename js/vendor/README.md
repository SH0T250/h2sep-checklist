# Three.js compatibility renderer

Unmodified Three.js r128 files, matching the Three.js release embedded in the room viewers:

- https://github.com/mrdoob/three.js/blob/r128/examples/js/renderers/Projector.js
- https://github.com/mrdoob/three.js/blob/r128/examples/js/renderers/SVGRenderer.js
- https://github.com/mrdoob/three.js/blob/r128/LICENSE

`node tools/room3d-renderer-build.mjs` embeds these files, their license, and
`js/room-renderer.js` into both viewers without changing their room geometry.
The software renderer is used only when the browser cannot provide WebGL, or
when an existing GPU context is lost. Lighting is simplified and shadows are
unavailable; camera controls, raycast selection, room geometry and item cards
use the existing viewer logic. The SVG scene redraws on changes at up to 20 fps.

Run `node --test tests/room-renderer.test.mjs` for regression checks. Run
`node tests/serve-room-renderer.mjs` for isolated browser checks with no backend.
The server prints its local URL; `mode=software` forces WebGL creation to fail,
and the GPU fixture has a button to simulate context loss. `/phone` embeds a
390 × 844 viewer. None of those test controls are included in the live viewers.
