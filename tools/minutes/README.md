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
