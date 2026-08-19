# "Electrical Takeoff - 20232102" workspace — full exploration report
Project: H2SEP (Home2 Suites, Eagle Pass TX, 115 keys, 4 floors). Date explored: 2026-08-14.

Drive location: "1. Plans & Specs..." (12k6I2u_4t2lpb61OH0HdCBY4LCpCpNPm) -> Electrical subfolder (1QifD8XVQx_-XwqUMeuMnL2C1B6jlRZkF) -> **Electrical Takeoff - 20232102** (folder id 1hE9zOoiE1x547s-o2V3UXz4T_Uc_61bZ, created 2026-08-14).

## What this workspace IS
A CAD-extraction working directory (mirrored from `C:\Users\Austin\Downloads\Electrical Takeoff - 20232102\` per artifact paths inside its JSON files). It contains the 22-014 electrical DWG set converted to DXF (ODA File Converter + libredwg), python inventory scripts, CSV inventories of every block INSERT/text/layer, per-sheet insert mapping, rendered block symbol PNGs, embedded OLE Excel workbooks extracted from the Calculation & Panels sheet, and a completed **fire-alarm device count**. It is NOT a priced estimate: no pricing, no quotes, no vendor packages found anywhere in the tree.

## Complete tree (all 20 top-level subfolders + root files)

```
Electrical Takeoff - 20232102/  (1hE9zOoiE1x547s-o2V3UXz4T_Uc_61bZ)
├── analysis-bbox-sheet-map.json      845 KB  — insert bbox -> sheet-viewport mapping results
├── analysis-room-text-tags.json      1.1 KB  — per-room-dxf text-tag scan (ALL ENTRIES EMPTY — raw_counts {}, text_records [])
├── conversion-summary.json           6.9 KB  — libredwg DWG->DXF conversion summary (14 files)
├── oda-conversion-summary.json       4.5 KB  — ODA converter run summary
├── .venv/                            — Python virtualenv (Scripts/, Lib/, share/, pyvenv.cfg). Tooling only.
├── analysis-images/                  — 20 PNGs: E101 fire-alarm legend crops, E400 room crops (KS, KSA, KOB, KOBA, QQ, QQA),
│                                       E501-E504 floor renders, pdf-page-12..19 96dpi renders. Visual working images.
├── block-renders/                    — matplotlib renders of individual block symbols per sheet (E200/E300/E301/E400/E500/E600
│                                       prefixed PNGs, ~70 files), render-manifest.json, test.png
│   └── guestroom/                    — 24 renders of guestroom xref blocks incl. lighting: 26_RECESSED_DOWNLIGHT_ROUND_FB (R-4),
│                                       26_WALL_SCONCE_RBW_DIMPLE_FB (GR-202), 12_SCONCE_GUEST_BATH (GR-203), 12_LAMP_TABLE_ROUND (GR-200),
│                                       12_LAMP_TABLE_BENT (GR-201), 12_LAMP_TABLE_AND_SCONCE (GR-204), 12_LAMP_FLOOR_OFFSET_TILT (GR-205),
│                                       GA_EXHAUST_FAN, junction/motion_sensor/voice outlet etc. + manifest.json, guestroom-contact-sheet.png
├── block-renders-targeted/           — ~100+ PNGs (paged listing): per-room-type block renders (room-king-studio__*, room-king-onebed__*,
│                                       room-qq__*, room-qq-acc__*), E101-canon__*, E300-devices__*, E301-devices__*, E400-direct__*
│                                       (incl. LT-DL-01, PENDANT, WMSD1, GFI receptacles), E500__* FA symbols; manifest.json, contact sheets
├── conversion-logs/                  — 13 .log files, one per source DWG:
│                                       22-014 E100 Electrical Load Analysis & One Line Diagram / E101 Electrical Notes & Diagrams /
│                                       E102 Wiring Details / E103 Electrical Details / E104 - E104.4 Electrical Calculation & Panels /
│                                       E200~E204 Electrical Floor Plan / E300 Power First Floor Plan / E301 Enlarge Food Prep & Dry Storage /
│                                       E400 Enlarge Typical Unit / E500~E504 Fire Alarm / E600 Electrical Site Plan / E700 Electrical Details /
│                                       MWT-TB2436 Elec
├── converted-dxf/                    — MWT-TB2436 Elec.dxf (525 KB) only
├── equipment-renders/                — 18 PNGs: E100 one-line & fire-pump notes, E200 lighting-controls, E204 roof, E300 plan/electrical
│                                       room/equipment clusters, E600 site (top/middle/bottom), E600-1 photometric, E600 pole detail, E700 details
│   ├── ole-binaries/                 — 15 .bin OLE streams (E103-5BD76 … E103_4-5BEF1) extracted from the Calculation & Panels DWG
│   └── ole-workbooks/                — 15 .xlsx recovered from those OLE streams (same names) — THE ELECTRICAL CALC WORKBOOKS (see below)
├── guestroom-analysis/               — per-room-type xref DXF inventory: files.csv (17 room dxfs), inserts.csv (1783 instances),
│                                       insert-summary.csv (1164 rows: file|block|layer|count), layer-summary.csv, texts.csv, summary.json
├── inventory/                        — whole-set DXF inventory (14 files): files.json, inserts.csv (2134 rows), blocks.csv, layers.csv,
│                                       texts.csv, viewports.csv, sheet_inserts.csv (811 mapped inserts), unmapped_model_inserts.csv (1239),
│                                       inventory-summary.json, sheet-mapping-summary.json
├── legend-renders/                   — 5 PNGs of E101 legend regions: lighting-switches, receptacles-low-voltage, fire-alarm-devices,
│                                       equipment-modules, abbreviations
├── oda-all-dxf/                      — 13 DXFs (independent 2nd ODA conversion): x_stairs, x-site data (+opt 1/2), x-rcp notes, x-notes,
│                                       x-grid, x-interior note, x-enlarged plans notes, x-floor plan notes, x-enl finish & power plan,
│                                       MWT_1117_TB CONCEPTUAL, MWT-TB2436
├── oda-dxf/                          — EMPTY in Drive listing (primary ODA output dir per fire-alarm-analysis.json source paths)
├── oda-electrical-input/             — MWT-TB2436 Elec.dwg (source DWG, 212 KB)
├── oda-test-input/                   — EMPTY
├── oda-test-output/                  — EMPTY
├── scripts/                          — 20 .py pipeline scripts: convert_electrical(.py/_oda.py), extract_oda_portable, inventory_dxf,
│                                       map_inserts_to_sheets, build_xref_graph, explore_relevant_dxf, inventory_guestroom_xrefs,
│                                       render_guestroom_blocks, render_legend_crops, render_block_contact_sheets, extract_target_mleaders,
│                                       scan_ole, list_ole_streams, extract_e104_workbooks, summarize_selected_ole_ranges,
│                                       render_equipment_targets, bbox_map_relevant, extract_room_text_tags, render_targeted_blocks
├── subagents/                        — fire-alarm-counts.csv + fire-alarm-analysis.json  ** COMPLETED FA DEVICE TAKEOFF **
├── test/                             — E200-E204.svg + 3 conversion logs (dxf/json/svg)
├── tools/                            — ODAFileConverter-portable/, oda-extracted/ (MSI contents), oda-cab-raw/, libredwg-0.14-win64/,
│                                       oda-portable-manifest.json  (converter binaries only)
└── xref-analysis/                    — files.csv (10.5 KB), xref-edges.csv (127 KB), insert-summary.csv (937 KB), summary.json, errors.json ({})
```

Sibling folder **H2SEP_Electrical_AI_Context** (1ZQ8_h3fF20_7iYA5OjBkTQhh1EdQavwN):
```
H2SEP_Electrical_AI_Context/
└── 0. AI Context/ (1JEV631PCWuhjwnz5FT23W0bKfjtzvbXL)
    ├── drawings/        (1ZU7hi-YciaK0ixWSE4J_qiuyomWRir2C)  — per-sheet .md analyses
    ├── drawings_split/  (1zehvMrmWJiN9VoROfUFR0AIvhLu9ESas)  — per-sheet PDFs (e.g. 10-H2S-Electrical-Pages)
    ├── CLAUDE.md (6.7 KB), drawings.md (11.9 KB), project.md (1.9 KB)
```
No takeoff/count files in the sibling; it is the drawing-context library.

---

# EVERY LIGHTING/FIXTURE COUNT FOUND (verbatim, with sources)

## 1. LIGHTING FIXTURE SCHEDULE — types only, NO quantities printed
Source: equipment-renders/ole-workbooks/**E103_1-5BFA5.xlsx**, worksheet "LIGHT FIXT." (OLE workbook embedded in DWG "22-014 E104 - E104.4 Electrical Calculation & Panels"). Header row verbatim: "LIGHTING FIXTURE SCHEDULE (ALL LIGHTING FIXTURES WILL BE VERIFIED BY ARCHITECT/OWNER PRIOR TO INSTALLATION.)". Columns: TYPE | DESCRIPTION | MANUFACTURER AND MODEL | MOUNTING | LAMP TYPE | FIXTURE WATTS | NOTES. Typos are as printed.

| TYPE | DESCRIPTION | MANUFACTURER AND MODEL | MOUNTING | LAMP | WATTS |
|---|---|---|---|---|---|
| LR01 | RECESSED LINEAR | (blank) | RECESSED | LED | 7/FT |
| LR02 | RECESSED LINEAR | (blank) | RECESSED | LED | 3/FT |
| LR03 | LINEAR TAPE LIGHT | (blank) | SURFACE | LED | 7/FT |
| R01 | 2-INCH DOWNLIGHT / GENERAL LIGHTING PUBLIC AREAS | COOPER - PORTFOLIO # LDA2B102R309027D010 - 2LBD2MW OR APPROVED EQUAL | RECESSED | LED | 10 |
| R02 | 2-INCH DOWNLIGHT / EXTERIOR PORT/CO | JUNO # 2CPNC-G2-DB-10LM-27K-90CRI-SP-120-ZT-BBL OR APPROVED EQUAL | RECESSED | LED | 10 |
| R05 | 2-INCH DOWNLIGHT / DINING ENCLOSED BOOTH | COOPER- PORTFOLIO # LDA2B102R609027D010 - 2LBD1MB OR APPROVED EQUAL | RECESSED | LED | 10 |
| R06 | 4-INCH WALLWASH / ELEVATOR WALLWASH / DINING SERVICE WALLWASH | COOPER - PORTFOLIO # LDA4A18927DE010 - 4LLWW0LI | RECESSED | LED | 23 |
| R10 | 4-INCH DOWNLIGHT / FITNESS | COOPER - PORTFOLIO # LDS4C209030D010PS0MW OR APPROVED EQUAL | RECESSED | LED | 23 |
| R11 | 4-INCH DOWNLIGHT / GUEST CORRIDOR | COOPER - PORTFOLIO # LDS4C109027D010PS0MW OR APPROVED EQUAL | RECESSED | LED | 14 |
| R20 | WET LOCATION DOWNLIGHT / POOL SOFFITS | LITHONIA LIGHTING # 4BEMW-LED-27K-90CRI-M6 OR APPROVED EQUAL | RECESSED | LED | 14 |
| T01 | RECESSED 2X2 / GENERAL BOH | COOPER - METALUX # 22CZ2-39-UNV-L835-CD1-U | RECESSED | LED | 19 |
| T02 | RECESSED 2X2 / FOOD PREP | COOPER - METALUX # 22GR-LD5-43-F1-UNV-L835-CD1-U | RECESSED | LED | 30 |
| S01 | SURFACE MOUNT UTILITY / ELEC/MECH/STORAGE | COOPER - METALUX # 4SNLED-LD5-47SL-LW-UNV-L930 OR APPROVED EQUAL | SURFACE | LED | 33 |
| S02 | SURFACE MOUNT UTILITY / ENCLOSED STAIRWWELLS [sic] | COOPER - METALUX # 4SNLED-LD5-47SL-LW-UNV-L930-CD1-U OR APPROVED EQUAL | SURFACE | LED | 50 |
| S03 | EXTERIOR WALL SCONCE / REAR ENTRY & POOL | (blank) | SURFACE | LED | 10 |
| S20 | SURFACE MOUNT DOWNLIGHT / PUBLIC RESTROOMS | COOPER - HALO # SMD6R69SWH OR APPROVED EQUAL | SURFACE | LED | 10 |
| S21 | SURFACE MOUNT DOWNLIGHT / GUESTROOM RESTROOM | COOPER - HALO # SMD6R69SWH OR APPROVED EQUAL | SURFACE | LED | 10 |
| S22 | SURFACE MOUNT DOWNLIGHT / POOL OTS | (blank) | SURFACE | LED | 10 |
| TR01 | TRACK | (blank) | SURFACE | LED | (blank) |
| TR10 | TRACK MOUNT ADJUSTABLE / MARKET, RECEPTION | (blank) | TRACK | LED | 10 |
| WS01 | WALL SCONCE / GUEST CORRIDORS | ARKANSAS LIGHTING # 4093C OR APPROVED EQUAL | SURFACE | LED | 14 |
| WS02 | WALL SCONCE / LOBBY RESTROOMS | (blank) | SURFACE | LED | 43 |
| WS03 | WALL SCONCE / GUESTROOM VANITY | ARKANSAS LIGHTING # 3550V OR APPROVED EQUAL | SURFACE | LED | 43 |
| WS04 | WALL SCONCE / GUESTROON NIGHT STAND [sic] | (blank) | (blank) | LED | (blank) |
| WS05 | WALL SCONCE / GUESTROON COUNCH [sic] | (blank) | (blank) | LED | (blank) |
| WS06 | WALL SCONCE / GUESTROOM DESK | (blank) | (blank) | LED | (blank) |
| WS07 | WALL SCONCE / DINING | (blank) | (blank) | LED | (blank) |
| WS08 | WALL SCONCE / DINING PRIVATE BOOTH | (blank) | (blank) | LED | (blank) |
| WS09 | WALL SCONCE / GUESTROOM DINING TABLE | ARKANSAS LIGHTING # 6439SDW OR APPROVED EQUAL | WALL | LED | 20 |
| G01 | EXTERIOR LINEAR STRING LIGHT | AMERICAN LIGHTING # LS-MS-24-100-BK *(this model appears in E103_1-5BFA5.xlsx; blank in E103-5BD76.xlsx variant)* | (blank) | LED | 5 |
| G02 | EXTERIOR LINEAR TAPE LIGHT | (blank) | SURFACE | LED | 7/FT |
| G03 | EXTERIOR LINEAR TAPE LIGHT | (blank) | SURFACE | LED | 7/FT |
| WS10 | WALL SCONCE / POOL | (blank) | SURFACE | LED | 17 |
| B01 | EXTERIOR BOLLARD | (blank) | FLUSH | LED | 10 |
| P01 | EXTERIOR AREA LIGHT / 1-LIGHT PER POLE | LITHONIA LIGHTING # KAD-LED-60C-530-30K-R3-MVOLT *(in 5BFA5; blank in 5BD76)* | FLUSH | LED | 40 |
| P02 | EXTERIOR AREA LIGHT / 2-LIGHTS PER POLS [sic] | LITHONIA LIGHTING # KAD-LED-60C-530-30K-R3-MVOLT *(in 5BFA5; blank in 5BD76)* | FLUSH | LED | 80 |
| P03 | PEDESTRIAN POLE | (blank) | FLUSH | LED | 30 |
| SA | (blank) | LSI CORP # MRM-LED-18L-SIL-FTA-UNV-DIM-50-70CRI-ALSCS04-BLK-IL *(in E103-5BD76.xlsx; blank in 5BFA5)* | POLE | LED | 135 |
| SB | (blank) | LSI CORP # MRM-LED-18L-SIL-FTA-UNV-DIM-50-70CRI-ALSCS04-BLK-IL *(in E103-5BD76.xlsx; blank in 5BFA5)* | POLE | LED | 2-135 |

NOTE: The schedule has NO quantity column. Variants exist across the 15 extracted workbooks (E103-5BD76 vs E103_1-5BFA5 differ on which rows carry manufacturer data, as flagged above). Other worksheets in these workbooks: FEEDER, ELC. LOAD, GR LOAD, 1FL/2FL/3FL/4FL + MDP + TYP. PNL (UNIT) panelboard schedules, FP CALC, KITCHEN EQ. SCH., LAUNDRY EQ., ELC. SC., VD. CALC, PV CALC. — load/panel data, not fixture counts.

## 2. FIRE ALARM DEVICE COUNTS — complete, quantities printed
Source: subagents/**fire-alarm-counts.csv** and subagents/**fire-alarm-analysis.json** (drawing set E500-E504; E500 excluded as diagrammatic; counts verified against two independent DXF conversions; unresolved_item_count = 0; confidence "high" on every row).

Per floor (device type = count):
- E501 First Floor (floor_total 105): Smoke Detector 49; Strobe Light 15cd 24; Combination Horn/Strobe 30cd 8; Manual Pull Station 4; Heat Detector 4; Magnetic Door Holder 10; Fire Bell 2; CO Detector 2; Water Flow Switch 1; Supervised Valve 1
- E502 Second Floor (35): Smoke 16; Strobe 15cd 3; Horn/Strobe 30cd 9; Pull Station 2; Heat 1; MDH 2; Flow Switch 1; Supervised Valve 1
- E503 Third Floor (35): Smoke 16; Strobe 15cd 3; Horn/Strobe 30cd 9; Pull Station 2; Heat 1; MDH 2; Flow Switch 1; Supervised Valve 1
- E504 Fourth Floor (37): Smoke 17; Strobe 15cd 3; Horn/Strobe 30cd 10; Pull Station 2; Heat 1; MDH 2; Flow Switch 1; Supervised Valve 1

Totals by device type (printed in fire-alarm-analysis.json): Smoke Detector 98; Strobe Light 33; Combination Horn/Strobe 36; Manual Pull Station 10; Heat Detector 7; Magnetic Door Holder 16; Fire Bell 2; CO Detector 2; Water Flow Switch 4; Supervised Valve 4. Device total 212 (reconciliations printed: 105+35+35+37=212; 98+33+36+10+7+16+2+2+4+4=212). JSON also notes 3 FA-BP booster panels sit in the E500 one-line (excluded from plan counts).

## 3. Per-sheet lighting-block INSERT counts (from mapped CAD inventory)
Source: inventory/**sheet_inserts.csv** (811 rows; one row per mapped insert; counts below are exact row tallies per sheet_layout+block_name).
Lighting-relevant blocks:
- LT-EMXC (exit/emergency combo light block): E101 legend 1; **E200-1st 10; E201-2nd 6; E202-3rd 6; E203-4th 6**
- SWITCH1: E200-1st 21; E201-2nd 4; E202-3rd 5; E203-4th 5
- Troffer Light - 2x4 Parabolic - ALB-018 (LOBBY AREA RCP): E101 1 (legend/sample)
- Z1 - ALY-036 (FIRST FLOOR_LOBBY LEVEL RCP): E101 1 (legend/sample)
- SITE PLAN sheet: A$Cdabd6002 x6 (anonymous block — rendered at block-renders/E600__A_Cdabd6002.png; identity as site pole light UNVERIFIED), Photometric x1, XFR1000 x2, MECHANICAL EQUIPMENT x2, TAG x2, DIMBLK x4
- ENL. GUESTROOM sheet: E_WR_CKT 73; MS 6; VISUAL 6; plus anonymous A$C blocks (A$C2fcb0d28 x7 etc.)
CAVEAT (as observed in the data, not inferred quantities): guestroom luminaire symbols on E200-series floor plans live inside unit xref/anonymous blocks (block "1" x13/x23/x23 on E201/E202/E203; A$C2b2e519d x33/20/21/20), so E200-series rows do NOT directly enumerate in-room fixtures.

## 4. Model-space lighting inserts not mapped to a sheet viewport
Source: inventory/**unmapped_model_inserts.csv** (1,239 rows). Lighting-related rows (file | block | count):
- 22-014 E200~E204 Electrical Floor Plan.dxf | LT-EMXC | 1
- 22-014 E300 Power First Floor Plan.dxf | LT-EMXC | 12
- 22-014 E301 Enlarge Food Prep & Dry Storage.dxf | Clev_Symbols_Fluorescent Light Fixture (ELECTRICAL PLAN - WALK-IN) | 2
- 22-014 E400 Enlarge Typical Unit.dxf | 26_RECESSED_DOWNLIGHT_ROUND_FB (GR_K_STUDIO_ACC_RCP) | 2
- 22-014 E400 Enlarge Typical Unit.dxf | 26_RECESSED_DOWNLIGHT_ROUND_FB (GR_K_STUDIO_RCP) | 3
- 22-014 E400 Enlarge Typical Unit.dxf | LT-DL-01 | 3
- 22-014 E400 Enlarge Typical Unit.dxf | LT-EMXC | 1
- 22-014 E400 Enlarge Typical Unit.dxf | PENDANT | 1
- 22-014 E400 Enlarge Typical Unit.dxf | WMSD1 | 1
- 22-014 E500~E504 Fire Alarm.dxf | LT-EMXC | 1
- 22-014 E700 Electrical Details.dxf | LT-EMXC | 10

## 5. Guestroom per-room-type lighting block counts (17 room xref DXFs)
Source: guestroom-analysis/**insert-summary.csv** (1,164 rows; count column printed per file|block|layer). Full lighting rows (layer E_LI / E_LI 2 / E_LI 3; GR-2xx are the arch lighting spec tags):

x-king studio.dxf: RECESSED_DOWNLIGHT R-4 x4; WALL_SCONCE GR-202 x2; SCONCE_GUEST BATH GR-203 x1; LAMP_TABLE_ROUND GR-200 x2; LAMP_TABLE_BENT GR-201 x1; LAMP_TABLE AND SCONCE GR-204 x1; LAMP_FLOOR GR-205 x1; EXHAUST FAN x1
x-king studio connecting.dxf: R-4 x4; GR-202 x2; GR-203 x1; GR-200 x1; GR-201 x1; GR-204 x1; GR-205 x1; EXHAUST FAN x1
x-king studio acc.dxf: R-4 x5; WALL_SCONCE ACC GR-208 x2; GR-203 x1; GR-200 x1; GR-201 x1; LAMP_GR_NIGHTSTAND GR-207 x1; GR-205 x1; EXHAUST FAN x1
x-king studio acc swr.dxf: R-4 x5; GR-208 x2; GR-203 x1; GR-200 x1; GR-201 x1; GR-207 x1; GR-205 x1; EXHAUST FAN x1
x-king studio acc tub.dxf: R-4 x5; GR-208 x2; GR-203 x1; GR-200 x1; GR-201 x1; GR-207 x1; GR-205 x1; EXHAUST FAN x1
x-king studio acc mod connector.dxf: R-4 x2 (ACC_RCP) + x3 (STUDIO_RCP); GR-202 x2; GR-200 x1; GR-201 x1; GR-204 x1; GR-205 x1
x-king one bdr.dxf: R-4 x2; GR-202 x2; GR-203 x1; GR-200 x1; GR-201 x1; GR-206 (LAMP_TABLE AND SCONCE) x1; GR-205 x1
x-king one bed acc.dxf: R-4 x1; GR-202 x3; GR-203 x1; GR-200 x1; GR-201 x1; GR-205 x1
x-qq.dxf: R-4 x1 (K_STUDIO_RCP) + x3 (QQ_RCP); GR-202 x3; GR-203 x1; GR-200 x1; GR-201 x1; GR-204 x1; GR-205 x1; EXHAUST FAN x1
x-qq ext.dxf: R-4 x1 + x3; GR-202 x3; GR-203 x1; GR-200 x1; GR-201 x1; GR-204 x1; GR-205 x1; EXHAUST FAN x1
x-qq mod.dxf: R-4 x1 + x3; GR-202 x3; GR-203 x1; GR-200 x1; GR-201 x1; GR-204 x1; GR-205 x1; EXHAUST FAN x1
x-qq connector.dxf: R-4 x1 + x3; GR-202 x3; GR-203 x1; GR-200 x1; GR-201 x1; GR-204 x1; GR-205 x1; EXHAUST FAN x1
x-qq mod connector.dxf: R-4 x1 + x3; GR-202 x3; GR-203 x1; GR-200 x1; GR-201 x1; GR-204 x1; GR-205 x1; EXHAUST FAN x1
x-qq acc.dxf: GR-208 x2 + x1; GR-203 x1; GR-200 x1; GR-201 x1; GR-207 x1; GR-205 x1  (no downlight row printed)
x-qq acc swr.dxf: GR-208 x2 + x1; GR-203 x1; GR-200 x1; GR-201 x1; GR-207 x1; GR-205 x1
x-qq acc tub.dxf: GR-208 x2 + x1; GR-203 x1; GR-200 x1; GR-201 x1; GR-207 x1; GR-205 x1
x-king acc conn.dxf: no rows matching lighting patterns in insert-summary.csv (its blocks are anonymous *U6x ATG blocks) — UNVERIFIED for lighting.

## 6. Room-type counts (multiplier context, printed values)
Source: E103_1-5BFA5.xlsx, worksheet "GR LOAD" ("TYPICAL GUEST ROOMS LOAD ANALYSIS", #ROOMS column):
King Studio 44; King Studio, HI, CD 1; King Studio, CD 7; King One Bdr ACC, HA, CD 1; King One Bdr ACC, HA 2; King Studio, HI 6; King One Bdr 3; King Studio ACC MOD, CD 1; King ACC, HA 2; Queen Queen 27; Queen Queen ACC, CD 1; Queen Queen, HI 3; Queen Queen (Ext) 6; Queen Queen (Wide) 2; Queen Queen (Wide), CD 2; Queen Queen, CD 7. **TOTAL ROOMS : 115** (printed).

## Bottom line
- The workspace is a CAD-quantity-extraction pipeline, not a conduit/wire-only takeoff and not a priced package. It DOES contain luminaire-relevant counts: a completed fire-alarm device takeoff (212 devices, per-floor, verified), LT-EMXC exit/em-light counts per floor plan sheet, guestroom per-room-type lighting block counts, and the full LIGHTING FIXTURE SCHEDULE (types/models/watts — no quantities).
- No file in the workspace prints total building-wide luminaire quantities by fixture type (LR01, R01, WS01, etc.). Deriving those would require multiplying per-room counts by room counts and adding public-area symbols — NOT done here per no-guess rule.
