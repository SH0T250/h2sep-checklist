# Enrichment report — cluster "lobby-core" (001 Vestibule · 003 Lobby · 004 Reception · 005 Market)

Sheets read in full: A100, A120, A510.1–A510.4, A700, A900, A901, A903, A904 (A902/A905/A906/A907 verified
to serve 006/009/BOH/018 only), ID-1.6, ID-1.7, ID-3.1, ID-4.1–ID-4.7; finishes.md §5.1–5.4; ffe-public.md
whole file; concept_wiki millwork.md + artwork.md; conflicts.md B4, coordination_issues.md, OPEN_ITEMS.md.
DB queried (`space_items`) for the PA-106/PA-102 row structure.

## THE PA-106 QUESTION — settled

**ID-1.7 / ffe-public.md support 24, not 26. The 26 is the DB's deliberate 24 + 2-delta row emission; the
draft's single-line collapse kept only the 24-basis src string next to a qty of 26.**

Evidence:

- `ID-1.7.md` (tag list): **"PA-106 (tagged 8 / 6 / 4 / 6 across the lounge)"** → 8+6+4+6 = **24**.
- `A510.3.md` cross-reference §3: **"PA-106 reads 8 / 6 / 6 / 6 on A510.3 vs 8 / 6 / 4 / 6 on ID-1.7."**
  → A510.3 = **26**.
- `ffe-public.md` §5 Lobby table, verbatim row: **"PA-106 | 24 + 2 FLAGGED | A510.3 8/6/6/6 = 26 vs
  ID-1.7 8/6/4/6 = 24 (third tag instance differs)"**; §15 flag 19 repeats it.
- DB (`space_items`, space 003): **26 rows** = ITM-0770…0793, 24 rows with `instance_note` "1 of 24"…"24 of 24"
  and `source_sheet` **"ID-1.7 8/6/4/6 = 24"**, **plus** ITM-0794/0795 with `instance_note`
  **"A510.3 delta over ID-1.7; 1 of 2 / 2 of 2"**, `source_sheet` **"A510.3 8/6/6/6 = 26"**, note
  **"Third tag instance differs. Carried, not resolved."**

So the row count (26) is intentional and correct under the carry-both-readings rule; what is wrong is the
**aggregated draft line**, whose src ("ID-1.7 8/6/4/6 = 24") supports only 24 of its 26 units. Fix is to
restore the two-part provenance on the line (24 per ID-1.7 + 2 FLAGGED per A510.3 delta), not to change the
quantity silently. Per ffe-public §0.3 precedence ("**ID-1.7 governs loose-FF&E multipliers**"), the
governing base order quantity is **24** until MWT / the PA spec book reconciles the third tag instance.
Note: `A510.3.md` says to reconcile "against the FF&E Installation List" — **OV-002 disregards that
workbook**; reconcile via the spec book (`EGLMTHT…PA_FF&E & Finish Specs_Dynamic_250704.pdf`) / MWT instead.

## Lines added

### 001 Vestibule — 1 line (`tools/out/space-enrich/001.json`)
1. **Ceiling** — painted gyp system (assembly per 02/A120) — **FLAGGED**: three-way height conflict,
   A120 **8'-10"** vs A510.2 **9'-0"** vs ID-1.6 **8'-0"**. Draft had ceiling PAINT only.

### 003 Lobby — 4 lines (`003.json`)
1. **Ceiling** — painted gyp field 8'-10", 9'-0" north bay by the restroom corridor (A120; A510.2) — HIGH.
2. **Ceiling** — ACT plank feature panel at the 9'-6" raised zone over the lounge (~22'-0" × 15'-6") —
   **FLAGGED**: A120 legend reads it **"6x48 ACT"**, A510.2 legend lists **"Acoustic ceiling tile 8"×48""** —
   plank width unresolved. Entirely missing from the draft (which carries the zone only as PT-07 paint).
3. **Paint PT-04** at the lounge walls (A700 views 3 and 4) — MEDIUM (schedule area is guest-suite
   door/frame; ID-3.1 lounge views tag wallcoverings only).
4. **Wall Covering WC-01.1** at the lounge (A700 view 4) — **FLAGGED**: no schedule card
   (finishes.md W-6), ID-3.1 tags WC-11 on the same views.

### 004 Reception — 4 lines (`004.json`)
1. **Ceiling** — painted gyp 8'-10" (A510.2 explicit tag; A120 field default) — HIGH.
2. **FF&E - Casegoods, ACB-001** — M2 acoustic baffle ceiling over the front desk, panel widths ~9'-0" /
   ~4'-0" (A900 view 07 governs; fs p.7 card = MDC Zintra "Reception Desk Ceiling") — MEDIUM: no
   material/spacing/suspension on A900; tag digit variance ACB-001 vs ACB-01; ID-1.6 scatters the tag to
   Market 005 and ID-3.1 view 3 to the Lounge. finishes.md §5.3 recorded this row but deliberately did
   **not** emit it ("Ceilings category, outside the four in scope") — it was falling through every package.
3. **Paint PT-01** at the reception wall (A700 view 2) — MEDIUM (fs p.22 area is guest-suite window wall).
4. **Wall Covering WC-01.1** at reception (A700 views 2 and 6) — **FLAGGED** (same W-6 basis as at 003).

### 005 Market — 1 line (`005.json`)
1. **Ceiling** — painted gyp 8'-10", 7'-0" soffit/bulkhead at the market edge (A510.2; A120) — MEDIUM:
   ID-1.6 shows **ACB-01 acoustical ceiling ~8'-10"** at Market instead; architectural RCPs govern, but
   confirm no baffles intended before close-in.

## Lines considered and NOT added
- **001**: keyed note 7 extruded-aluminum wood-look soffit — it is the exterior porte-cochère canopy,
  outside the space. Storefront door/frame finish (A700 note 15) — Doors category, A600 scope.
- **003**: recessed fire-extinguisher cabinets (A510.4 gen. note B / A510.1 KN22 / A700 note 19) — no
  allowed category; belongs to the fire-appliance package. A700 notes 39/40 blocking (18"×18" @ 67",
  blade sign @ 91") — Drywall, not an allowed category. KN25 TV location — duplicate of draft M4.
  Hydration station — inside draft M3. A901.1 dish-recovery counter — carried in the DB at Breakfast 006
  (see discrepancy 6).
- **004**: wall graphics + art panels — the draft 003 lines explicitly span "lounge and reception"
  (ID-3.1); adding 004 copies would double-count. PL-01/PL-02/ST-01/quartz — inside the draft M1 label.
  A700 note 14 brushed-stainless elevator surround — belongs to Elevator Lobby 137. Safety deposit box —
  A510.1 note 19 leader lands at the room off door 012, NOT Reception (draft correctly omits it).
- **005**: 48"×16" signage blocking (A903, only dimensioned blocking call in A900–A907) — Drywall
  category, not allowed here; conflict M-7 (ID-4.5 says 48"×18"; OPEN_ITEMS repeats the 18" value) is
  already registered. WP-10 / FILM-01 — already in the draft.

## DISCREPANCIES — draft/DB vs sheets (for the verification pass)

1. **PA-106 qty-vs-src mismatch** (space 003) — see the settled question above. Line label/src should read
   like ffe-public §5: "24 + 2 FLAGGED (A510.3 8/6/6/6 = 26 vs ID-1.7 8/6/4/6 = 24)".
2. **PA-102, same collapse** (space 003) — draft qty **8**, src **"A510.3 x6"**, note "Base qty both sheets
   support". DB: 6 rows "1 of 6…6 of 6" src "A510.3 x6" + 2 rows src **"ID-1.7 prints (8) vs A510.3 x6"**
   ("Qty delta carried, not resolved"). Only 6 is supported by both sheets; the src supports 6 of the 8
   units. ffe-public §5: "PA-102 | 6 + 2 FLAGGED | A510.3 ×6 vs ID-1.7 (8)"; §15 flag 19.
3. **Perch seat-symbol count 8 vs 9** (space 003) — draft PA-107 note claims "A904 plan 4 draws NINE
   untagged seat symbols"; that follows `OPEN_ITEMS.md` A7 ("A904 draws NINE seats on perch plan 4"). But
   `A904.md` states **"eight seat symbols within the 16'-4" run on perch plan 4 — counted off the render"**
   and `ffe-public.md` §3.2 also says **eight**. The DB even contradicts itself: the M10 perch line's note
   says "draws eight untagged seats", the PA-107 note says NINE. One render recount needed; both FF&E
   sheets print PA-107 = 8 either way.
4. **Vestibule ceiling height, third value missing from the draft note** (space 001) — draft PT-07 note:
   "ID-1.6 gives 8'-0" — the two RCPs disagree" (A510.2 9'-0" vs ID-1.6 8'-0"). **A120 tags Vestibule 001
   at 8'-10"** — a third value from the base-building RCP that neither the draft nor finishes.md §5.1
   records. Now carried on the enrichment ceiling line.
5. **Lobby 9'-6" zone: paint vs ACT plank** (space 003) — draft PT-07 folds the 9'-6" raised zone into
   ceiling paint. A120 reads that panel as **6x48 ACT plank** ("painted gyp field with a 6x48 ACT plank
   feature panel over the seating area"); A510.2's legend lists ACT 8"×48". If the zone is plank, PT-07
   extent is the gyp field (8'-10" / 9'-0") only — and the plank width itself is a 6" vs 8" conflict
   between the two RCP legends.
6. **A901.1 dish-recovery counter placement** — `concept_wiki/millwork.md` §1 maps it to **Lobby 003**;
   `ffe-public.md` §3 (M5) and draft space-006 carry it at **Breakfast 006**, and `A901.1.md` itself says
   **"Space served: dish recovery / bussing station in the breakfast area"** (no room number on the sheet).
   The DB position (006) is the supported one; millwork.md's table row is the outlier and should be
   corrected. No rival line added at 003.
7. **A700 finishes absent from the reconciled finishes package** — finishes.md §5.2/§5.3 omit PT-04 +
   WC-01.1 (Lounge, A700 views 3/4) and PT-01 + WC-01.1 (Reception, A700 views 2/6) even though its own
   conflict **W-6** records WC-01.1 on A700 with no schedule card. Added as enrichment at MEDIUM/FLAGGED;
   the finishes package rows should eventually be regenerated to match.
8. **ACB-001/ACB-01 was falling through every package** — finishes.md §5.3 recorded it but did not emit
   ("Ceilings category, outside the four in scope"); the FF&E draft for 004 never picked it up although
   ffe-public lists it as millwork piece **M2**. Now carried (enrichment 004, code ACB-001 as drawn on
   A900 per millwork.md M-3).

## Open questions for Austin / RFI
- **PA-106 (and PA-102) final count** — reconcile the tag-instance deltas with MWT / the PA spec book
  (OV-002 bars the Installation List route). Order basis today: PA-106 = 24, PA-102 = 6, deltas flagged.
- **Lobby feature-panel plank size** — 6x48 (A120) vs 8"×48" (A510.2). RFI before plank/grid order.
- **Vestibule ceiling height** — 8'-10" (A120) vs 9'-0" (A510.2) vs 8'-0" (ID-1.6).
- **ACB-001 baffle** — material/finish/spacing/suspension not on A900 (fs p.7 = MDC Zintra); confirm spec
  and that Market 005 / Lounge placements on ID sheets are scatter, not scope. Gates the desk install.
- **WC-01.1** — no schedule card (W-6). Product unknown; not purchasable. RFI to MWT (also covers whether
  ID-3.1's WC-11 on the same walls supersedes it).
- **Market ceiling system** — confirm painted gyp (arch RCPs) over ID-1.6's ACB-01 before close-in.
- **Perch seat symbols** — recount A904 plan 4 on the 2576px render (8 per A904.md/ffe-public vs 9 per
  OPEN_ITEMS/draft note) so the PA-107 stool count question is argued from one number.
