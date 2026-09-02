# Floor 1 furnishing kits

A kit is one plain browser script in this directory that furnishes one or more
common areas of the Floor 1 scene (`platform/floor3d.html`). Kits exist so
several people can furnish different rooms at the same time without editing
the same file: the lobby kit and the fitness kit never touch each other, and
neither touches the scene source.

The build (`node platform/tools/build_floor3d.mjs`) inlines every `*.js` file
here into the page, `_registry.js` first and the rest in name order, each
wrapped in a comment that names the file. With no kit files present the scene
renders exactly as it did before kits existed.

## What a kit file looks like

```js
/* Fitness Room 023. Pieces from ID-1.7 sheet 8 (fitness plan); room extents A100. */
KITS['fitness'] = {
  spaces: ['023'],                 // COMMON numbers this kit furnishes
  basis:  'MIXED',                 // 'MEASURED' | 'SCALED' | 'MIXED'
  source: 'ID-1.7 sheet 8 fitness plan; room extents A100',
  build:  function(ctx){
    /* Treadmill row along the south wall. Footprint 7'-0" x 3'-0" MEASURED
       off the ID-1.7 equipment schedule; the row spacing is SCALED off the plan. */
    for (var i = 0; i < 3; i++)
      ctx.box({u:243.0, v:4.5 + i*4.0, du:7.0, dv:3.0, y0:0, y1:1.3, mat:'appl', basis:'SCALED'});
    /* Dumbbell rack, 6'-0" x 2'-0", turned to run along V. SCALED position. */
    ctx.box({u:224.5, v:20.0, du:6.0, dv:2.0, y1:2.6, rot:90, mat:'metal', basis:'SCALED'});
    /* Mirror wall, ID-1.7 elevation: 12'-0" run, 4" off the north wall. MEASURED. */
    ctx.plate({u:222.1, v:15.0, du:0.3, dv:12.0, y:0.9, t:2.8, mat:'art', basis:'MEASURED'});
    return ctx.tally();
  }
};
```

Rules for the file itself:

- Plain script. No `import`, no `export`, no modules, no fetches. Everything the
  page already defines (THREE, MAT, the helpers) is in scope.
- One `KITS['<name>'] = {...}` per file, where `<name>` is the file name without
  `.js`. Names are lower case letters, digits and hyphens.
- Every piece gets a code comment saying what it is, which sheet it comes from,
  and whether its size and position are MEASURED or SCALED. Never guess a
  number: a dimension is either read off a sheet (say which) or scaled off a
  drawing (say so).
- No em dashes or en dashes anywhere. The build rejects them, as it rejects a
  stray `</script>` and a kit file that never registers.
- A kit claims a space by listing its COMMON number in `spaces`. One kit per
  space: if two files claim the same number the one that sorts first wins and
  the other gets a console warning. A space with no sourced furniture should be
  left out of `spaces`; it keeps the generic per-checklist-line massing.

## The coordinate frame

Everything is in A100's own frame, in feet:

- `u` runs ALONG the building, from the north face (U = 0) to the south face
  (U = 246.46).
- `v` runs ACROSS the building, from the west face (V = 0) toward the east face.
  South of U 162.7 the west face steps out to V = -7.38 (the Sales and Fitness
  bump-out), so V can go negative there.
- `y` is up from the finished floor.

In three.js terms the scene maps `x = V`, `y = up`, `z = U`. You never need
that: the helpers take `u`, `v`, `y` and do the conversion. If you build raw
geometry yourself, `V3(v, y, u)` makes a vector in the right order.

Each space's measured rectangle is `ctx.sp.box` (`u0, v0, u1, v1`). The COMMON
table in `platform/tools/floor3d.src.html` lists every common space with its
extents and where they came from; `research/floor1-3d/a100-layout.json` has the
same numbers.

The plan is cut at 4'-0" (`ctx.WALLCUT`). Pieces are capped at `ctx.MASSCAP`
(3.86 ft), the same cap the generic massing uses, so nothing pokes through the
cut plane.

## What `build(ctx)` gets

`build` is called once for EACH space in `spaces`, with `ctx.sp` set to that
space. Put the pieces that belong to that space in that call: they land in
`ctx.sp.group`, so the EXPLODED view lifts them with their room, and each one is
hoverable for that room. A kit that lists several spaces branches on
`ctx.sp.no`.

| Field | What it is |
| --- | --- |
| `ctx.sp` | The space record: `no`, `name`, `basis` (`MEASURED` or `SCALED`), `box` (`u0, v0, u1, v1`), `group` (a THREE.Group). |
| `ctx.kit` | Your kit's name. |
| `ctx.box(o)` | A box. `o = {u, v, du, dv, y0, y1, rot, mat, basis}`. Centred at `(u, v)`; `du` feet along U, `dv` feet along V; `y0` to `y1` up (default 0 to 1). |
| `ctx.cyl(o)` | A vertical cylinder. `o = {u, v, r, y0, y1, mat, basis}`. |
| `ctx.plate(o)` | A thin horizontal plate. `o = {u, v, du, dv, y, t, rot, mat, basis}`. Bottom at `y`, thickness `t` (default 0.08 ft). |
| `ctx.tally()` | `{placed, measured, scaled}` so far. Return it from `build`. |
| `ctx.MAT` | The scene's material table. Names: `wood`, `woodDk`, `uphol`, `metal`, `counter`, `appl`, `applDk`, `art`, `glass`, `linen`, `plinth`, `wrap`, `head`, `ghost`. |
| `ctx.massMat(name, scaled)` | The lighter SCALED version of a MAT. The helpers call it for you. |
| `ctx.THREE`, `ctx.bx`, `ctx.cylAt`, `ctx.wbx`, `ctx.V3`, `ctx.pick` | The raw scene tools, for a piece the three helpers cannot express. `bx(u0,v0,u1,v1,y0,y1,mat,parent)` is an axis-aligned box by corners; `cylAt(u,v,r,y0,y1,mat,parent)`; `wbx(u0,v0,u1,v1,h,mat,parent)` is a wall with the light cut cap. Pass `ctx.sp.group` as `parent` and call `ctx.pick(mesh, ctx.sp)` so the piece hovers. Raw pieces are not counted; add them to your returned tally. |
| `ctx.MASSCAP`, `ctx.WALLCUT` | 3.86 and 4.0 feet. |

`mat` is a MAT name (a string) and `basis` is `'MEASURED'` or `'SCALED'` for
every piece. MEASURED draws crisp; SCALED draws through `massMat`, the lighter
finish the rest of the scene uses for scaled things. The helpers refuse a piece
with no basis, on purpose. A ready-made THREE.Material is also accepted as
`mat` for the rare piece that needs its own.

Every helper counts the piece it places, so `return ctx.tally();` is the whole
bookkeeping. If you return your own object it must be `{placed, measured,
scaled}`.

## Placing a rotated piece

`rot` is degrees about the vertical. Positive turns the piece counterclockwise
on the plan with north at the top: its U axis swings toward +V. At `rot: 90`
the piece's `du` runs along V and its `dv` along U. A desk 6 ft long that runs
across the building is either `{du:2.5, dv:6}` with no rotation or
`{du:6, dv:2.5, rot:90}`; both draw the same box. Use a rotation only for a
piece the sheet actually turns, and say in the comment which sheet turns it.

## What the scene does with a kit

- `massing(sp)` looks up a kit for the space before drawing the generic
  per-checklist-line blocks. If one claims the space, its `build` runs instead,
  and the generic blocks are skipped for that space only.
- The hover card gets one extra line: `Furnished from <source>: <measured>
  measured, <scaled> scaled`, and the count chip reads PIECES instead of
  BLOCKS.
- The legend says furnished kits are drawn crisp where MEASURED and lighter
  where SCALED.
- A kit that throws is reported on the console (which fails the UI test) and
  the space falls back to the generic blocks, so a broken kit can never leave a
  room half furnished and silent.
- Kits are geometry from the sheets, not status, so they draw even when the
  checklist status paint is unavailable.

## Rebuild, look, test

```sh
node platform/tools/build_floor3d.mjs            # writes platform/floor3d.html (generated, never hand-edit)
python3 -m http.server 8611 --directory platform  # any free port above 8500
node tests/floor3d-ui.mjs 8611                    # must pass, with no console errors
```

To look at your kit, open `http://localhost:<port>/floor3d.html` headless with
Playwright (the pattern is in `tests/floor3d-ui.mjs`), wait for
`window.__FLOOR3D.ready`, then `window.__FLOOR3D.go('common')` or
`go('exploded')` and `window.__FLOOR3D.open('S-<no>')` to show the card, and
screenshot at 1600 by 1000. Look at every screenshot before saying what it
shows. `window.__FLOOR3D.spaces` reports each space's `kit` and `massed`
count; `window.__FLOOR3D.card()` reports the card text including the kit line.

## Who commits what

A kit agent commits only its own `platform/tools/floor3d-kits/<kit>.js` (and,
if it corrected a source, its own research record). Do not commit
`platform/floor3d.html`, `floor3d.src.html`, `build_floor3d.mjs`,
`_registry.js` or this README; the scene owner rebuilds and commits the
generated page once, after every kit has landed. Never `git add -A`.
