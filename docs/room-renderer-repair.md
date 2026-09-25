# Room renderer recovery

The viewer previously aborted at its single `WebGLRenderer` constructor. A
browser refusing a graphics context then displayed an empty stage and never
finished building the room or its item list. The failing browser's underlying
GPU/driver state was not available; Room 104 rendered on the inspection browser.

The viewer now tries the default GPU, a lower-demand profile, and WebGL 1. If
those fail, or a running context is lost, the matching Three.js r128 SVG renderer
renders the existing scene. A notice identifies the simpler lighting and lack
of shadows. Camera controls, object selection, labels and room-specific data use
the existing logic. A stable input surface preserves controls during fallback.
The software renderer redraws on changes, capped at 20 fps. Navigation releases
GPU contexts, and the mobile pixel budget also applies after resizing.

Validation on 2026-09-25:

- Eight Node regression tests pass: startup profiles, no-WebGL mode, redraws,
  context loss, cleanup, generated viewers and cache/app version consistency.
- Local browser: Room 104 starts with canvas WebGL creation forced to fail;
  model-object clicks, sidebar selection, orbit and camera presets work.
- Room 101 starts in WebGL, switches to SVG after an actual
  `WEBGL_lose_context` event, and returns to WebGL using Retry graphics.
- Room 118's accessible King model renders in SVG. Room 104 also renders in a
  390 × 844 iframe. These checks are browser viewport tests, not physical-device tests.
- The checked-in HTML scripts parse. Both viewer files are unchanged outside
  the renderer block and its redraw invalidation call, verified against the
  pre-repair Git revision. No operational database writes are part of testing.

To rebuild this repair, run `node tools/room3d-renderer-build.mjs`. It updates
rendering in place while preserving each viewer's geometry. The old
`tests/build-room3d.mjs preview101/room101-3d.html ...` pipeline already fails at
`ANCHOR MISSING: mirror box` on the original revision. Do not use that old
preview pipeline or derive the platform viewer from the crew viewer to update
the current King geometry. The renderer integration is included in those
generators for when their source drift is resolved.

The crew app version is 1.19.9 and its model cache is `h2sep-model-8`, so accepting
the app's update retires the previously cached crew model. The platform viewer
is fetched normally from `platform/room3d.html`.
