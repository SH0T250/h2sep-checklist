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
render in orange on grey, white where they coincide), `wipe` (left half photo,
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
