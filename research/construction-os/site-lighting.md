# H2SEP Site / Exterior Lighting — E600 & E600.1 Extraction

Sources (Drive, H2SEP_AI_Context/.../10-H2S-Electrical-Pages):
- E600_p25.pdf — "ELECTRICAL SITE PLAN", sheet E600, scale 1" = 20'-0", DATE: 6/18/25, Proj. 22-014, Prototype 3.0. Revisions printed: 5 "REVISED PER RFI" 12/12/24; 9 "REVISED PER RFI" 06/10/25.
- E600.1_p26.pdf — "PHOTOMETRIC SITE PLAN", sheet E600.1, scale 1" = 20'-0", DATE: 8/2/24, Proj. 22-014, Prototype 3.0. No revisions filled in.

Method: text-layer extraction (PyMuPDF) cross-checked against visual reads of 200–600 dpi rasters. The E600.1 luminaire schedule and plan are an embedded raster image (no text layer) — read visually from 500 dpi crops. Every pole symbol was individually zoom-verified.

---

## 1. E600.1 Luminaire Schedule ("Luminaire List") — complete transcription

Exactly one row is printed. There is NO symbol column and NO SA/SB label or split in this table.

| Manufacturer | Article name | Item number | Fitting | Luminous flux | Light loss factor | Connected load | Quantity |
|---|---|---|---|---|---|---|---|
| LITHONIA | KAD LED, 60 LED, 700mA MVOLT DRIVER, 3000K, TYPE 3 OPTICS. | KAD LED 60C 700 30K R3 MVOLT | 1x | 14865 lm | 1.00 | 137 W | **17** |

Also printed on E600.1 — "Calculation Summary":

| Name | Parameter | Min | Max | Average | Mean/Min | Max/Min |
|---|---|---|---|---|---|---|
| Parking Lot | Perpendicular illuminance (Adaptive) | 0.11 fc | 5.93 fc | 2.28 fc | 20.42 | 53.16 |

Printed pole quantity = **17** (exact printed value). The prior "~17" is this number. Note it is a single line item with Fitting "1x" — the table does not say whether 17 counts poles or heads, and it does not split single-arm vs double-arm.

## 2. SA / SB split — from symbol counting (schedule has no split)

**The split below is VISUAL COUNTING, not a printed schedule quantity** (stated explicitly per instructions). Confidence: HIGH — every count was obtained twice independently (E600 text-layer label coordinates AND visual symbol reads on both sheets), and each of the 16 pole symbols on E600.1 was individually zoom-verified at 500–600 dpi.

E600 legend (printed): circle-with-one-arm = "SINGLE ARM STREET LIGHT"; circle-with-two-arms = "DOUBLE ARM STREET LIGHT"; also TRANSFORMER, "J" = JUNCTION BOX, EV CHARGING.

Counts — identical on E600 (labeled SA/SB) and E600.1 (symbols only, unlabeled):
- **SA (single-arm, 1 head): 13 poles**
  - 5 along north parking row (circuit LA1#26 labeled at west end)
  - 2 on second row south of the north row
  - 1 west drive aisle (near transformer), 1 east drive aisle (labeled LA1#28)
  - 2 mid-site row south of building
  - 1 south-central lot, 1 southeast lot (labeled LA1#30)
- **SB (double-arm, 2 heads): 3 poles**
  - 1 west-central lot, 1 mid-central lot, 1 east side (labeled LA1#32)
- **Totals: 16 poles; heads = 13×1 + 3×2 = 19 heads**

**DISCREPANCY (flagged, not resolved on these sheets):** E600.1's printed Quantity **17** matches neither 16 poles nor 19 heads counted on either plan. E600.1 is dated 8/2/24; E600 was revised per RFI 12/12/24 and 06/10/25 (current 6/18/25) — the photometric predates the RFI revisions. Which figure governs the bulb order is UNVERIFIED from these sheets; reconcile against the lighting fixture schedule sheet (E601-series) / RFI record before ordering.

Fixture heads per the list are Lithonia KAD LED 60C 700 30K R3 MVOLT, 137 W each, 14865 lm, 3000K, Type 3 optics. Per-head watts/lumens are printed; total connected load for site poles is NOT printed.

## 3. G01 exterior string light

**UNVERIFIED / NOT PRINTED on E600 or E600.1.** No "G01", no string-light run length, and no string-light symbol or note appears anywhere on either sheet (text layer searched; plan visually scanned). Any G01 quantity must come from another sheet (e.g., E601 fixture schedule or the architectural/landscape sheets).

## 4. Wall packs (WP) and exterior sconces (S03)

- **WP — 3 placements printed on E600** (no schedule quantity printed anywhere on these sheets; count is of plan placements, each drawn as a "J" junction box + wall-fixture symbol with a "WP" tag):
  1. WP + J on circuit **LA1#44** (north side of south building wing / porte-cochere drive)
  2. WP + J on circuit **LA1#46** (south side, mid)
  3. WP + J on circuit **LA1#48** (southeast corner)
- **S03 — UNVERIFIED / NOT PRINTED** on E600 or E600.1. No "S03" appears on either sheet.
- **S01 — printed once** on E600 detail 03 "ENLARGED DUMPSTER" (1/2" = 1'-0"): a fixture tagged "S01" on the dumpster enclosure wall, with note: CONNECT TO SITE LIGHTING CIRCUIT "LA1#28".

## Other printed items on E600 relevant to site electrical scope (exact text)

- "PROPOSED 1000kVA PAD-MOUNTED TRANSFORMER"
- "BOLLARDS - 48" HIGH 6" DIA. (10x TYP.)" — printed count 10 bollards (protective, at transformer area; not luminaires)
- EV charging: 4 EV symbols with J-boxes, circuits printed "EV#1,3", "EV#5,7", "EV#2,4", "EV#6,8" (8 circuit numbers across 4 dual-port stations)
- Site lighting circuits printed on plan: LA1#26, LA1#28, LA1#30, LA1#32 (poles); LA1#44, LA1#46, LA1#48 (WPs)
- Detail 02 "TYPICAL POLE BASE DETAIL" (N.T.S.), printed values: pole "25'-0""; "PAINTED ROUND TAPERED STEEL POLE."; "LUMINAIRE — SEE LIGHTING FIXTURE SCHEDULES"; "CONCRETE PIER, 24" DIAMETER"; "24" DIA."; "5'-6""; "2'-6" MIN."; "1'-0""; "2 3/4""; "(6) #8 RE-BARS W/ #3 TIES 16" O.C."; "ANCHOR BOLTS (4)"; "COPPER WELD GROUND ROD, 3/4" x 10'-0""; "#6 AWG"; "#6 GROUND CONDUCTORS"; "BUSSMAN FUSE HOLDERS AND FUSES IN BASE. (TYPICAL ALL CONDUCTORS)"; "HAND HOLE AND COVER"; "BOLT COVER"; "1" CHAMFER"; "LEVELING NUT."; "GROUT POLE BASE."; "CADWELD CONNECTION TO GROUND ROD."; NOTE: "LEVELING NUTS SHALL BE USED. POLE BEARING PLATE SHALL NOT BE SHIMMED AGAINST PIER CONCRETE."

## Bulb-order quick math (derived from the above; derivation, not printed)

- If ordering per current site plan (E600, 6/18/25): 19 KAD LED heads (13 SA + 3 SB×2) on 16 poles.
- If ordering per printed photometric list (E600.1, 8/2/24): 17 fixtures.
- Plus 3 WP wall packs (model NOT printed on these sheets — UNVERIFIED) and 1 S01 dumpster fixture (model on fixture schedule sheet).
