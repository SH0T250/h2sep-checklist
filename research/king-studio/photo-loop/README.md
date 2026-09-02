# Photo loop: render versus photograph, room 110 King Studio

The goal: seven still images of the King Studio guest room (room 110, Home2
Suites by Hilton, Eagle Pass) that a fresh critic cannot tell from the phone
photographs of that room, judged blind, one view at a time.

The earlier rounds ran on the real-time three.js exhibit
(`platform/king-studio.html`) and scored 21 of 21 spotted; `../critic-log.md`
holds every lesson from those rounds. This loop runs on offline path-traced
renders from Blender Cycles built from the exhibit's geometry and camera
stations. The tools live in `platform/tools/photoreal/`; that README documents
every command.

## The seven views and their photographs

| view | photograph |
|---|---|
| entry | 20260812_141012.jpg |
| lounge | 20260812_141158.jpg |
| bed | 20260812_141100.jpg |
| working | 20260812_141016.jpg |
| kitchen | 20260812_141218.jpg |
| bath-vanity | 20260812_141251.jpg |
| bath-shower | 20260812_141304.jpg |

All seven photographs are landscape 4:3, Samsung Galaxy S25 Ultra ultrawide
camera (13 mm equivalent, about 105 to 108 degrees horizontal before the
phone's distortion correction), f/1.9, auto white balance, shot on
2026-08-12 around 2:10 pm. The photographs are never committed: the repo is
public and they show a client's unopened hotel.

## One round, one view

1. Render `renders/<view>/r<N>.png` (1200x900 Cycles output), run the camera
   signature post pass to `r<N>.jpg` (JPEG q92 4:2:0, no EXIF), copy it to
   `renders/<view>/latest.jpg`.
2. `blind_pair.py` builds `blind/<view>-r<N><salt>.png`: two identical
   1000x750 panels labelled A and B, the render's panel chosen by a hash, the
   key written beside it. The render goes through the same JPEG pipeline as
   the photograph first so the file format is not a tell.
3. A fresh critic sees only the composite and the checklist in
   `platform/tools/photoreal/critic-checklist.md`, and answers: which panel is
   the render, how confident, what gave it away, what is the biggest gap.
4. `ledger.mjs append` records the verdict; the pick is scored against the
   key the critic never saw. `ledger.mjs status` marks the round `spotted`
   (correct pick), `fooled` (wrong pick or could not tell), or `wowed` (fooled
   and the critic said so with enthusiasm). `pending` is a round with a render
   but no verdict yet.
5. The fix agent uses `overlay.py` for camera matching and `stats.py` for the
   measured gap, changes light, materials, cameras or the post pass (never the
   room's dimensions, which are proven off A550), and `ledger.mjs fix` records
   what changed and the commit.
6. `page.mjs` rebuilds the progress page from the ledgers and the latest
   renders.

## Rules that came out of the earlier rounds

- Resample both images to a common width before any spatial statistic.
- Never compare chroma without the JPEG q92 4:2:0 control on the render.
- Confirm any region box by cropping and looking at it; a measurement through
  the wrong surface (round 3 measured a mirror, not the wallpaper) is worse
  than none.
- The critics have twice agreed on a cause that measurement rejected (missing
  shadows in round 0, ambient fill in round 3). Record what they say, then
  measure before building the fix.
- Look at every image produced before claiming anything about it.

## Files

- `ledger/<view>.json`: the committed record of every round for that view.
  Shape: `{ view, photo, rounds: [ { round, renderJpg, critics: [ { pick,
  correct, confidence, tells, biggestGap, secondaryGaps, realismScore, wowed } ],
  fix: { changed, commit, notes }, status } ] }`. History is never dropped.
- The progress page, blind composites and renders live in the session scratch
  directory and are never committed because they embed the photographs.
