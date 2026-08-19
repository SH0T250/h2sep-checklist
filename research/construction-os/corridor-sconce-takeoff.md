# H2SEP Corridor Wall Sconce Takeoff — WS01 / FF&E PA-204 (Gap L3)

Home2 Suites, Eagle Pass TX — 115 keys, 4 floors. Counted from lighting floor plans
E200/E201/E202/E203 (Drive folder 10-H2S-Electrical-Pages), sheets dated 08/09/24,
"CONSTRUCTION AND BID SET", Rev 4.

## Result summary

| Floor | Corridor | VISUAL COUNT (drawn symbols) | Confidence | Text-layer "WS01" labels | Agreement |
|-------|----------|------------------------------|------------|--------------------------|-----------|
| 1st (E200_p12) | 121 | **16** | High | 14 | Disagree: 2 drawn sconces unlabeled |
| 2nd (E201_p13) | 221 | **35** | High | 35 | Exact match |
| 3rd (E202_p14) | 321 | **34** | High | 36 raw / **34 on plan** (2 strays in notes block) | Match after cleaning |
| 4th (E203_p15) | 421 | **35** | High | 34 | Disagree: 1 drawn sconce unlabeled |
| **Total drawn** | | **120** | | 117 raw plan labels | |

**Recommended order basis: 120 as drawn; 121 if the E202 drafting omission is confirmed (see flag below).**

Where the two methods disagree, I trust the VISUAL count. The unlabeled symbols are
full wall-sconce symbols sitting on the corridor lighting circuit arcs, at EQ-dimensioned
spacing, identical in size/shape to the labeled ones — the tags were simply omitted
(consistent with the "(typ.)" tagging convention that created this gap). Stray text
objects and junction-box circles were excluded (criteria below).

## Per-floor detail

### 1st floor — E200, Guest Corridor 121 — VISUAL 16 (High)
- 7 opposite-wall pairs at stations (page units, W→E): 483, 565, 664, 736, 830, **~898 (pair drawn but UNLABELED)**, 1004.
- 2 singles on the south wall at 1071 and 1173 (north side is Rm. Sto. 029 / PBX 031 back-of-house at that stretch).
- Text layer: 14 labels. The ~898 pair carries no WS01 tags but sits between the labeled 830 and 1004 pairs on the same circuit with an "EQ" spacing dimension — counted as 2 real sconces. Zoom crop: `E200_zoom_898.png`.
- Public areas east of the corridor (lobby 003, breakfast, servery 009, meeting 018, fitness 023, laundry 015, pool deck, vestibule 001): **zero WS01**. Public lighting is R01/R05/R10/R02 recessed downlights, T01/T02 troffers, G01 string lights. Restrooms (Unisex 027, Women's 019, Men's 020, Sales 022 area) use **WS02** vanity sconces — a different fixture type, 3 tagged on E200, NOT included in the WS01 count.

### 2nd floor — E201, Guest Corridor 221 — VISUAL 35 (High)
- 16 opposite-wall pairs at stations 364, 492, 570, 671, 741, 842, 912, 1048, 1184, 1254, 1326, 1426, 1525, 1597, 1697, 1768 = 32.
- 3 singles at the east end: south wall at ~1855 (ice-machine alcove 239) and ~1958, plus 1 in the elevator lobby area at ~1995. All labeled.
- Text layer: 35. Exact 1:1 match with symbols.

### 3rd floor — E202, Guest Corridor 321 — VISUAL 34 (High)
- Same 16 pairs (369–1769) = 32, plus 2 singles at ~1957 (ice alcove 339) and ~1996 (elevator lobby).
- Text layer raw count 36, but two "WS01" strings are tiny stray text objects buried inside the GENERAL NOTES block at the sheet's top-left (crop `E202_oddlabels.png`) — not fixtures. Plan labels = 34, matching visual.
- **FLAG:** E202 does NOT draw a sconce at the ice-alcove station ~1845, where E201 has a labeled WS01 and E203 has an unlabeled (but clearly drawn) sconce symbol (compare crops `E201_p13_zoom_1845.png` / `E202_p14_zoom_1845.png` / `E203_p15_zoom_1845.png`). Floors 2–4 are architecturally identical, so this is very likely a drafting omission and the field quantity for floor 3 is probably 35. Recommend RFI/field verification before finalizing; as drawn it is 34.

### 4th floor — E203, Guest Corridor 421 — VISUAL 35 (High)
- Same 16 pairs (372–1769) = 32, plus singles at ~1957 and ~1998, **plus 1 UNLABELED sconce symbol at ~1845** (ice-alcove station, mirroring E201's labeled one) — full sconce symbol with stem/base on the south corridor wall, on the lighting circuit.
- Text layer: 34 labels. Visual 35 trusted for the same reason as floor 1.

## Symbol criteria (per E101 legend, crop `E101_legend_sconce.png`)
- **WALL SCONCE (WS01):** circle with two short side ticks, on a stem with a base bar drawn tangent to the wall; mounting column reads "WALL". Counted only when the base bar lands on a corridor wall of spaces 121/221/321/421 (or the contiguous east-end ice/elevator alcove).
- Excluded look-alikes:
  - Junction/homerun circles — smaller plain circle, no side ticks, no stem/base, with a circuit tag (e.g. 1B#35, 1B#44, 1B#49) or bare on the wall line.
  - R01/R05/R10/R02 recessed downlights — circle with small concentric center dot, no stem (ceiling).
  - X2 exit light — circle with shaded quadrants (ceiling).
  - X1 emergency battery unit — twin-head trapezoid symbol (wall).
  - Guest-room interior fixtures live in the "REFER TO ENLARGED GUESTROOM PLAN (E-400)" xref blocks and were not counted.

## Other corridor-mounted fixture types observed
- **X1** emergency battery twin-head wall units and **X2** exit lights are the only other tagged corridor fixtures on floors 2–4 (guest corridors have NO downlights — WS01 sconces are the sole normal lighting). The known LT-EMXC exit/emergency combo counts are 10/6/6/6 per prior takeoff; sheet text in the corridor band shows X1+X2 in that order of magnitude (E200 band counts are inflated by stair-adjacent labels).
- **No R11** appears anywhere on the four lighting sheets.
- First-floor east public corridor (past Guest Corridor 121) is lit with R01 recessed downlights, not sconces.
- **WS02** (restroom vanity sconce, 3 tagged on E200) is a separate type — do not merge into the PA-204 bulb count.

## Method
1. Pulled E200_p12/E201_p13/E202_p14/E203_p15 + E101_p02 (legend) from Drive, base64-decoded.
2. Text-layer pass: PyMuPDF word extraction with coordinates; every exact "WS01" string located and mapped (pages are rotated 270 deg; visible X = unrotated y, visible Y = 1728 − unrotated x). pdftotext unavailable in this environment; PyMuPDF extraction served as the text-object cross-check.
3. Visual pass: rasterized the corridor band (visible Y 810–970) in five 370-pt segments per floor at 4x (~288 DPI), counted sconce symbols against the E101 legend criteria; 8x zooms to adjudicate every unlabeled or ambiguous mark; 2x tiles over E200's public east half to rule out public-area WS01s.
4. Reconciled: every labeled symbol verified visually; every visual-only symbol zoomed and classified.

## Crops (all in scratchpad)
- Legend: `E101_legend_sconce.png`
- Corridor segments (5 per floor, W→E): `E200_p12_corr_seg0..4.png`, `E201_p13_corr_seg0..4.png`, `E202_p14_corr_seg0..4.png`, `E203_p15_corr_seg0..4.png`
- Adjudication zooms: `E200_zoom_898.png` (unlabeled 1st-floor pair), `E201_p13_zoom_1845.png`, `E202_p14_zoom_1845.png`, `E203_p15_zoom_1845.png` (ice-alcove station on floors 2/3/4)
- Stray labels: `E202_oddlabels.png` (two hidden WS01 strings in notes block)
- Public-area sweep: `E200_public_t0..t3.png`; overviews `E20x_*_overview.png`
