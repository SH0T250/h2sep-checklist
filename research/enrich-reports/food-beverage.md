# Enrichment report — food-beverage cluster

Spaces **006 Breakfast · 007 Food Prep · 008 Dry Storage · 009 Servery · 014 Employee Breakroom**
Run 2026-08-10 per `scratchpad/enrich-brief.md`. Sheets read: A100, A120, A510.2, A511.1, A511.2, A511.3, A513, A513.1, A514, A901.1, A902, A905, ID-1.6, ID-1.7, ID-1.8, ID-3.3, ID-4.3, ID-4.4; finishes.md §5.5/§5.7/§5.9 (+ §6 register); ffe-public.md §7/§13.4; conflicts.md / coordination_issues.md / OPEN_ITEMS.md greps; DB `space_items`.

**Context:** the DB has **zero rows in category "Ceiling" anywhere** — every draft in this cluster carries a PT-07 ceiling-*paint* line but no ceiling *system* line. That is the main gap this pass fills. A511.1/A511.2 cover only the west BOH block (029–033, 017, 139, corridor) and A511.3 the typical upper floor — neither adds anything for these five spaces.

## Lines added

| Space | File | Lines |
|---|---|---|
| 006 | `tools/out/space-enrich/006.json` | 2 |
| 007 | `tools/out/space-enrich/007.json` | 1 |
| 008 | `tools/out/space-enrich/008.json` | 1 |
| 009 | `tools/out/space-enrich/009.json` | 1 |
| 014 | `tools/out/space-enrich/014.json` | 2 |

- **006** — Ceiling: painted gyp 8'-10" + access panel (A120), FLAGGED on the height conflict vs A510.2 (see D1). Flooring: **T-01.1 at the wall behind the dish recovery counter** (printed tag, A901.1 elevation 2 — a tag ID-4.3 omits), HIGH, split out so the tile trade gets a checkable line; it existed only inside the draft's M5 casegoods label.
- **007** — Ceiling: ACT grid 8'-0" (A120 + A510.2 agree on height), MEDIUM — A120's own flag: 2'x2' vs 2'x4' tile not readable at 3/32"; A513 view 2 shows 2'x2' troffers.
- **008** — Ceiling: **open to structure, paint all elements, 12'-3 3/8"** per A120, FLAGGED — direct conflict with A510.2/ID-1.6 (8'-0") and A513 view 2's fixture layout (see D1).
- **009** — Ceiling: painted gyp, two levels 8'-10"/8'-2" per A120, FLAGGED — three sheets give three field heights (see D1).
- **014** — Ceiling: **ACT grid 8'-0"** per A120, FLAGGED — A510.2 says 9'-0" and the draft PT-07 line reads as a painted lid; system AND height contested (see D1/D2). Appliance: **unspecified appliance opening in M11** ("CONFIRM WITH APPLIANCE SPEC" / "VIF", 4'-0" MAX), FLAGGED — stated on A905, in neither DB nor draft, and the cabinet gets built to that opening.

## Lines considered and NOT added

- **A513 items 03 hand sink, 08 dish/pot washing sinks, 09 pre-rinse faucet, 10 eye wash station (007)** — absent from the draft but **present in the DB as category "Plumbing"**, which the app vocabulary excludes. Same for 007 doors + keyed-note/901 Electrical rows, 006/008/014 doors, 009 Electrical/Mechanical/Drywall rows (grommets, outlet notes, juicer vents, signage blocking), and 014 **L-2A/L-2B sink+faucet** and **405 breakroom sink**. The draft-vs-DB delta is a deliberate category filter, not a DB gap; re-adding them under "Appliance" would miscategorize and later double up against the DB rows.
- **PA-201 / PA-202 / PA-205 / PA-117 decorative ceiling/lighting zones** (ID-1.6, "over Breakfast … near the Market/Servery") — already emitted FLAGGED at **Lobby 003** because the sheet does not say which tag is over which space (ffe-public flags: PA-117 absent from ID-1.7; PA-202 identity collision with the restroom mirror). Not duplicated at 006/009.
- **ST-01 window sills** (ID-3.3 views 1–3) — the view group covers Guest Laundry and Breakroom jointly; which room's sills is not stated. Draft 014 already carries ST-01 at the breakroom/laundry-discharge wall (a different condition, A510.4 line 31).
- **"Wall clock/monitor"** on ID-3.3 views 4–5 (breakroom) — most likely the draft's 431 wall-mounted TV; if it is a clock *in addition*, it appears nowhere else. Adding it would guess an identity.
- **Roller-shade pockets** (A510.2 detail 02) — which openings get shades is inspection-only; nothing ties one to 006/009.
- **A514 item 901 convenience receptacle** (+48" AFF standard) — Electrical category, filtered (DB row exists at 007).
- Sprinkler-head finish (A120 gen. note I, concealed heads in public ceilings) — FP scope, no matching category.

## DISCREPANCIES — for the verification pass

- **D1 — UNREGISTERED ceiling conflict family: A120 vs A510.2, both Rev 4 / 08-09-24.** finishes.md register C-1 covers only A510.2-vs-ID-1.6 at 015/016/017/018/021, C-2 covers 027; **A120 appears in no ceiling conflict entry anywhere** (packages cite A510.2 alone for these rooms). Per space:
  | Space | A120 (Rev 4) | A510.2 (Rev 4) | ID-1.6 | Draft carries |
  |---|---|---|---|---|
  | 006 | painted gyp **8'-10"** | **9'-0"** + 8'-2" soffit at servery edge | 8'-10" | 9'-0" (pt07_a) |
  | 007 | ACT **8'-0"** | 8'-0" (agrees) | — (not listed) | PT-07 paint 8'-0" |
  | 008 | **open to structure 12'-3 3/8", paint all elements** | **8'-0"** | PT-07 8'-0" | PT-07 paint 8'-0" |
  | 009 | painted gyp **8'-10" + 8'-2"** | **9'-0"** | 9'-2" | 9'-0" (pt07_a) |
  | 014 | **ACT 8'-0"** | **9'-0"** | — (not listed) | PT-07 paint 9'-0" |
  The pattern extends beyond this cluster (e.g. Work Stations 010: A120 8'-10" vs A510.2 9'-0"; Managers Office 011: A120 gyp field ~8'-10" vs A510.2 8'-0") — flag to the lobby/BOH cluster agents.
- **D2 — PT-07 ceiling-paint lines in ACT rooms.** Drafts 007 and 014 carry PT-07 "Ceiling paint" (src A510.2) in rooms A120 hatches as **ACT grid**; A510.2 tabulates heights only, not systems, and ID-1.6's PT-07 list names neither room. If A120's ACT reading holds, those paint lines are wrong-trade lines (008's is defensible — "paint all elements" — but at open-structure height, not 8'-0").
- **D3 — Panel-ready appliances placed at 009 but drawn on Breakfast-Bar views.** A902's two "PANEL READY UNDERCOUNTER REFRIGERATOR" call-outs sit on **views 4 and 5 (B'Fast Bar – Shelves Detail)** and the "PANEL READY UNDERCABINET FRIDGE" on **view 3 (Breakfast Bar – Elevation)** — the M7 bar, i.e. Breakfast 006. Draft 009 rows `x_70fba9a7a9` (qty 2) and `x_cb989abf5e` label all three "integrated into the servery millwork". No rival rows added at 006 per rule 2 — location needs a ruling.
- **D4 — Stale citation on draft 009 `wc11`/`wc12`:** `wc12_a` src still includes "ID-3.3 view 8", which finishes.md §5.5 struck by audit (view 8 tags **WC-11**, not WC-12); the row properly stands on A510.4 line 30 + fs p.64. Grade unaffected.
- **D5 — Draft 014 `rf11_a` (HIGH, empty note) omits register F-10:** RF-11 has **three unresolved supplier options** (Mohawk-Durkan Supp A / Milliken Supp B / Tarkett Supp C, fs pp.37–39, "no winner picked — flag it on the PO").
- **D6 — Draft 006 M5 row says "ID-4.3 corroborates" but hides the insert-diameter split:** A901.1 states trash drops **Ø6"/Ø8" twice** (note + plan); ID-4.3 reads **6"/9"**. Inserts are BY OTHERS and the 2 cm quartz is cut once — confirm against the actual insert (A901.1 PM note 1).
- **D7 — A514 model variances not flagged on draft 007 rows:** item 18 **TWT-67~SPEC1** (A514) vs **TWT-67-HC~SPEC3** (A513/A513.1, cited by draft); item 22 **HDC12A2** (A514) vs **HDC12A2/BMS2024** (A513/A513.1 — BMS2024 is the shelf). A513/A513.1 govern equipment, but the variance is on record (ffe-public §7.3) and absent from the rows.

## Open questions / RFI candidates

1. **Ceiling RFI (new):** which sheet governs first-floor ceiling systems and heights where A120 and A510.2 — both Rev 4, 08-09-24 — disagree: 006 (8'-10" vs 9'-0"), 008 (open structure 12'-3 3/8" vs 8'-0" lid), 009 (8'-10"/8'-2" vs 9'-0"), 014 (ACT 8'-0" vs painted 9'-0"). 008 and 014 change trade scope, not just trim height.
2. **A514 undefined tags 34/39 vs A902 breakfast-bar appliance openings (speculative, flagged as such):** the two undefined item tags sit on the Breakfast 006 counter, and A902's breakfast-bar views carry exactly two panel-ready undercounter-refrigerator openings. If the food-service vendor confirms they are the same items, two open flags close at once. Not asserted anywhere — vendor/RFI question only.
3. **Who supplies the M11 break-room appliance** (A905 opening, 4'-0" MAX, "confirm with appliance spec") — no supplier, make or size stated in the set.
4. Already registered, still open, relevant here (no action taken): PA-8xx buyer at 006/009 (OPEN_ITEMS Q4) · T-21 no-card (T-4) · A513 vs A513.1 qty conflicts items 02/16 (second 208V/27.8A oven circuit) · "1A2" panel designation (conflicts.md B1.7) · PA-309/PA-110 room conflict (carried both ways in drafts).
