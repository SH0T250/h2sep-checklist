# E400 Guest-Room Luminaire Multiplicity — Extraction Report (H2SEP)

**Source verified:** `E400_p19.pdf` (Drive id `1R6bOsliAf35l7C-Pb4oA7IPKpxwuyiqf`, folder 10-H2S-Electrical-Pages `1SDIs6PAtD0VEkyVJXsBmERcf1_E9nE0Z`).
Sheet E400 "ENLARGED TYPICAL GUESTROOM PLAN", Project No. 22-014, scale 1/4" = 1'-0", Drawn RA/WN, Chkd AS/MI. Revision table shows Rev 8 "REVISED PER RFI" 04/10/25. Read both via embedded text layer (pymupdf) and visually at 5x-8.4x raster zoom on all six details; text and visual counts agree everywhere (35 S21 tags, 6 WS03 tags sheet-wide).
**E401:** Does NOT exist. Drive-wide search for "E401" returns nothing; the electrical per-sheet folder has no E401 file. The E400.md analysis confirms E400 is sheet 19 of 29 of `10-H2S - Electrical Pages.pdf`; no E401 in that set. UNVERIFIED beyond Drive holdings (if a paper E401 exists it is not in the project Drive).

## Q5 — Room types drawn on E400 (six details, each with printed title and detail number)

| Det | Printed title | Panel label printed on plan | S21 tags | WS03 tags |
|-----|---------------------------|----------------|----------|-----------|
| 01 | KING STUDIO | PANEL A | 5 | 1 |
| 02 | KING STUDIO ACC CONN. | PANEL (no letter printed) | 6 | 1 |
| 03 | KING ONE BEDROOM | PANEL B | 6 | 1 |
| 04 | KING ONE BEDROOM ACC | PANEL A | 8 | 1 |
| 05 | QQ STUDIO | PANEL A | 5 | 1 |
| 06 | QQ STUDIO ACC | PANEL A | 5 | 1 |

Fixture counts DIFFER between variants (5/6/6/8/5/5). These 6 details are geometric templates; per E400 panel note 1 ("SEE GUESTROOM LOAD ANALYSIS FOR DIFFERENT TYPES OF GUESTROOM, E103") there are further sub-variants on E103 — how many of the 115 keys use each template is NOT on this sheet.

DISCREPANCY vs the E400.md AI analysis: the .md claims Panel A = standard and Panel B = accessible rooms (02→B, 03→A, 04→B, 06→B). The printed sheet says otherwise — Detail 03 (King One Bedroom, non-accessible) is the only plan labeled "PANEL B"; Details 04 and 06 (accessible) are labeled "PANEL A"; Detail 02's leader label reads just "PANEL" with no letter (verified at 6x zoom). Trust the print.

## Q1 — S21 surface downlights per room: NOT 1 per room — 5 to 8 per room

S21 is used as the general-purpose surface downlight throughout each unit (bath, shower, entry/hall, closet passage, kitchenette, dining table), not just the restroom. Printed S21 tag counts and locations (visually traced leaders):

- **Det 01 KING STUDIO — 5 total:** 1 main bath (toilet/vanity room, ckt #1), 1 shower compartment (ckt #1), 1 kitchenette/passage, 2 entry/hall by closet.
- **Det 02 KING STUDIO ACC CONN. — 6 total:** 2 main bath (one of them sits inside the Rev-8 "REVISED PER RFI" cloud — added/relocated per RFI), 1 roll-in shower (ckt #1), 2 kitchenette/closet strip, 1 entry.
- **Det 03 KING ONE BEDROOM — 6 total:** 2 entry corridor, 2 kitchenette, 1 at dining table, 1 shower (ckt #1). See UNVERIFIED flag below re the main-bath fixture.
- **Det 04 KING ONE BEDROOM ACC — 8 total:** 3 kitchenette strip, 1 entry vestibule, 1 dining table, 2 main bath, 1 accessible tub/shower (ckt #1).
- **Det 05 QQ STUDIO — 5 total:** mirror of Det 01: 1 main bath, 1 shower, 1 kitchenette/passage, 2 entry/hall.
- **Det 06 QQ STUDIO ACC — 5 total:** 1 main bath, 1 roll-in shower, 1 kitchenette strip, 2 entry/closet.

Bath/restroom-zone S21 subtotals (main bath + shower compartment): Det 01 = 2, Det 02 = 3, Det 03 = 1 tagged (+1 untagged symbol, see flag), Det 04 = 3, Det 05 = 2, Det 06 = 2.

**UNVERIFIED (Det 03 only):** the main toilet/vanity room of Det 03 shows a round luminaire symbol (identical to the S21 symbol, wired on lighting ckt #1) with no S21 tag directly on it; the nearest S21 tag sits just outside the bath door at the dining table, where a second identical circle also appears. Whether Det 03 intends 6 or 7+ S21 luminaires cannot be settled from the printed tags alone — verify against E103 lighting VA or the architectural RCP before ordering.

## Q2 — WS03 vanity sconce: exactly 1 per room, all six details

One WS03 tag per detail, always at the bathroom vanity/lavatory wall directly above the sink (symbol is a wall-mounted fixture on the sink wall; bath GFCI ckt #5 adjacent in most details). No second WS03 anywhere. (Mounting height is not printed on E400 — that is on the E101 fixture schedule.)

## Q3 — Shower/tub wet-location light: it is an S21, not a separate type

Every shower/tub compartment (all six details) contains its own S21 tag with leader to a downlight symbol centered in the compartment, on lighting ckt #1. No other fixture type tag appears in any wet area on E400. The wet-location requirement is carried by E400 General Note 5, printed verbatim:
> "5. ANY LIGHT FIXTURES OVER WET AREAS TO BE DAMP LOCATION RATED W/ SHATTERPROOF LENS."
(E101's fixture-schedule note is the place where "enclosed and gasketed" wet-location language lives; E400 itself only prints the damp-rated/shatterproof-lens note above. So: same catalog fixture S21, wet-location-listed trim — not a distinct type.)

## Q4 — Other hardwired luminaires inside guest rooms on E400: NONE besides S21 and WS03

- Closet/entry lights, kitchenette lights, and dining-table lights are all tagged S21 (counted above). No dedicated closet/entry/kitchenette fixture type exists on this sheet.
- Keyed Note 1 (hexagon-1 symbol, appears at the bathroom switch in every detail), printed verbatim: "1. PROVIDE INTEGRATED NIGHT LIGHT IN BATHROOM SWITCH (TYP)." — a lamped device but integrated in the switch, not a luminaire tag.
- Non-luminaire tags present (for completeness): WAP, T (thermostat), J, H, SD (smoke det.), TV/data/receptacle symbols, PTAC ckt #2,4 at window wall, PANEL A/B.
- Panel schedules on-sheet: PANEL A (TYPICAL) and PANEL B (TYPICAL), both "LOCATION: BEDROOM, 120/208V, 1PH, 3W, NEMA 1, MCB 100A, MOUNTING: FLUSH", ckt 1 = LIGHTINGS 20/1. Panel notes 1-4 printed, incl. "2. INDICATES 'HACR' RATED CIRCUIT BREAKER." (the .md mis-transcribed this as "AFCI-rated"; print says HACR).

## Bulb-order implication (per template room, printed tags only)

| Room template | S21 | WS03 | Night-light switch (KN-1) |
|---|---|---|---|
| King Studio | 5 | 1 | 1 |
| King Studio Acc Conn | 6 | 1 | 1 |
| King One Bedroom | 6 (see flag) | 1 | 1 |
| King One Bedroom Acc | 8 | 1 | 1 |
| QQ Studio | 5 | 1 | 1 |
| QQ Studio Acc | 5 | 1 | 1 |

Multiply by room-type counts from E103 / architectural plans (not on E400) to get project totals.
