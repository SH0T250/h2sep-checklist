# Weekly meeting minutes toolchain

Regenerates the H2SEP PII Subcontractor Weekly Meeting Minutes in the same
layout as the Procore export the project has always used, so a rebuilt set of
minutes is visually indistinguishable from the ones already in circulation.

| File | Purpose |
|---|---|
| `layout.py` | The layout engine. Geometry constants are documented in `SPEC.md`. |
| `extract.py` | Parses an existing minutes PDF back into the JSON content model. |
| `render.py` | Renders a JSON content model to PDF. |
| `build81.py` | Applies Cesar's marked-up agenda to turn Meeting #80 into #81. |
| `diffpdf.py` | Compares two minutes PDFs span-by-span and reports positional drift. |
| `extract_fonts.py` | Lifts the document's own typefaces out of a reference PDF. |
| `progress_page.py` | Builds the verification page showing each piece against its source. |

## Typefaces

The export embeds Arial, Arial Bold, Times New Roman and Courier New. Those
faces are licensed and are **not** committed here; run `extract_fonts.py`
against a minutes PDF you already hold to populate `tools/minutes/fonts/`
(gitignored):

```sh
python3 extract_fonts.py /path/to/Meeting80.pdf
```

Without them the renderer falls back to Liberation Sans / Serif / Mono, which
are metric-compatible — line breaking and every position stay identical, only
the letterforms differ slightly.

**They are true subsets.** They carry a full cmap but an outline only for the
characters Meeting #80 happened to use: Arial Bold, for instance, has no `1`,
because no bold `1` appears anywhere in #80. A glyph with no contours renders
as nothing at all, so the renderer checks outline coverage per string and falls
back to Liberation for any string the subset cannot draw. It reports what it
substituted:

```
typefaces: document's own faces for mono, sans, sans-bold, serif
  sans-bold: fell back to Liberation for strings containing 1 (absent from the embedded subset)
```

Because the two families share metrics, substituting mid-document shifts
nothing. Read that line after every render — it is the warning that a new
meeting number or a new word has reached past what the subset covers.

## Regenerating Meeting #81

```sh
cd tools/minutes
python3 build81.py ../../data/minutes-80.json ../../data/minutes-81.json
python3 render.py ../../data/minutes-81.json \
    ../../out/H2SEP_PII_Subcontractor_Weekly_Meeting_Minutes_81.pdf \
    ../../img/triun-logo.png
```

## Regression test

`data/minutes-80.json` was extracted from the genuine Meeting #80 export.
Re-rendering it must reproduce that PDF span-for-span:

```sh
python3 render.py ../../data/minutes-80.json /tmp/rebuild80.pdf ../../img/triun-logo.png
python3 diffpdf.py /path/to/Meeting80.pdf /tmp/rebuild80.pdf
```

Expected: 642 reference spans, 642 candidate spans, 0 missing, 0 extra,
max |dy| ≤ 0.06 pt.

## Next meeting

Extract the issued minutes back to JSON, edit the content, re-render:

```sh
python3 extract.py ../../out/...Minutes_81.pdf > ../../data/minutes-82.json
# edit data/minutes-82.json, then render
```
