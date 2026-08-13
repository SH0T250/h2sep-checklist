# Minutes layout specification

Measured off `H2SEP PII Subcontractor Weekly Meeting Minutes: Meeting #80`, the
Procore "Publishing Engine 2026" export the project has used for every prior
meeting. All units are PDF points, origin top-left, US Letter 612 × 792.

Regenerating Meeting #80 from `data/minutes-80.json` reproduces the original
span-for-span: 642 of 642 text spans on the same page at the same position,
maximum baseline drift 0.06 pt, and every one of its 92 horizontal rules at the
same y over the same span of x.

One known sub-point difference remains: the source draws each cell's vertical
border separately, leaving a ~1 pt gap at every row boundary and overshooting
the table's outer corners by 0.5 pt. This renderer draws those verticals
continuously. The difference is invisible at print size.

## Type

| Role | Font | Size |
|---|---|---|
| Body, table cells, footer | Arial | 8 |
| Document title | Arial Bold | 14 |
| Section headings, "Scheduled Attendees" | Arial Bold | 10 |
| Closing disclaimer | Arial | 7 |
| Level 1 / 3 / 4 bullet glyphs (`•` `▪`) | Times New Roman | 8 |
| Level 2 bullet glyph (`o`) | Courier New | 5.36 |

Rendering uses those faces where they are available (see `extract_fonts.py`)
and Liberation Sans / Serif / Mono otherwise — metric-compatible clones, so
positions and line breaks are unaffected.

Text is **kerned**. The source applies pair kerning, which makes a long line up
to 2.4 pt narrower than its unkerned advance widths. The embedded subsets have
had their `kern` table stripped, so values are read from the Liberation face of
the same weight; that removes the systematic width bias (mean error +0.158 pt →
+0.014 pt) though a residual of about 0.35 pt RMS remains where Liberation's
pairs differ from Arial's.

A span's baseline sits `0.77625 × size` below the top of its bounding box.

## Colour

| Role | Value |
|---|---|
| Text | `#000000` |
| Hyperlinks (Join Meeting, attachments) | `#0000FF`, underlined at 0.195 pt |

Hyperlinks also carry a `/URI` link annotation covering the label, inset 0.39
below and 7.90 above its bbox top. Without it the blue text looks clickable and
does nothing.
| Table rules and separators | `#D8D8D8` at 0.99975 pt |
| Table header shading | `#F2F2F2` |

## Frame

Content spans x 36 → 576. Page 1 carries the logo at (38, 40.56)–(117.5, 92.98)
and a right-aligned project block ending at x 573.99. Pages 2+ carry a running
head at y 29.75 and a rule at y 40.89, with the first table starting at y 50.40.
The footer sits at y 754.27: page number centred on x 306, print stamp
right-aligned to 573.99. No table rule may fall below y 738.66.

## Tables

Row height 20.2612; baseline 12.2009 below the row top; a wrapped line inside a
row adds 11.265.

Scheduled Attendees cell boundaries: 36, 132.75, 256.37, 353.12, 489.60, 576.
Item table cell boundaries: 36, 64.80, 117.64, 264.34, 437.44, 495.04, 532.80, 576.

An item row is 19.762 tall when a Description cell hangs below it and 20.2612
when it stands alone. Its bottom rule starts at x 65.3 rather than 36 in the
first case, so the "No." cell reads as one tall merged cell down the item; when
the row stands alone the rule runs the full width.

A rule of the same weight is drawn above every bold sub-heading inside a
Description cell ("Official Documented Meeting Minutes"), also from x 65.3,
sitting 12.2009 above that heading's baseline.

## Description cells

Text flows from x 69.30 and wraps at x 571.5. Bullet levels indent as:

| Level | Marker x | Text x | Marker baseline |
|---|---|---|---|
| 1 | 84.50 | 93.30 | on the text baseline |
| 2 | 108.08 | 117.30 | 2.00 above the text baseline |
| 3 | 132.46 | 141.30 | on the text baseline |
| 4 | 156.42 | 165.30 | on the text baseline |

### Vertical rhythm

Two line-box heights are in play. A paragraph led by an 8 pt Times marker
(levels 1, 3, 4) is fractionally taller than one led by the 5.36 pt Courier `o`
of level 2, or by no marker at all:

```
base(from, to) = 11.3047  if from ∈ {1,3,4} and to <= from
                 11.2615  otherwise
```

The advance between two paragraphs is `base(from, to) + 8.0 × |to − from|`. A
wrapped continuation line always advances by 11.2615. A bold sub-heading
("Official Documented Meeting Minutes") advances by
`11.2615 + 8.0 × from + 9.0`.

A cell's first baseline sits 12.2009 below its top rule. Its bottom rule sits
`8.060 + 8.0 × level` below the last baseline, plus 0.0432 when that last line
was at an 8 pt-marker level.

### Authored space

Some blocks in the source carry an extra paragraph break that no geometric rule
accounts for. `extract.py` measures the residual and records it as `extra` on
the line below it, so a regenerated document reproduces the original spacing and
an edited one inherits each block's spacing. Meeting #80 has eight such lines.

## Section rhythm

A section heading's bbox top sits 13.38 below the preceding closing rule; its
table starts 14.22 below that. Consecutive items in one section are separated by
11.76. A heading may stand alone at the foot of a page with its table starting
overleaf — the source does this for `SCHEDULE & COORDINATION` and `NEXT MEETING`.
