# Enrichment report — cluster "exterior-zones" (ZONE-A, ZONE-B)

Sheets read in full: AS100, AS102, AS103, AS104 (Rev 5 04/09/26 — governing for pool deck), AS104.1, AS105 (Rev 5), ID-1.7, ID-1.9, ID-1.8 (grep), A510.3, ffe-public.md §4, finishes.md §5.24 + conflict register, tile.md, conflicts.md / coordination_issues.md / OPEN_ITEMS.md / RFI_register.md greps.

**FF&E completeness check first:** both drafts carry every row ffe-public.md §4 states — Zone A all 11 OF tags + fire pit 400 (qtys 4/1F/10/4/3/5/3/3/2/6/2 all match), Zone B all 12 OF tags incl. both OF-705 rows (4+3F), both OF-715 rows (3+2F), OF-705.ADA, OF-719, CUST-OF-720 (all match). **No FF&E rows missed by the DB.** Zones kept separate per flag 6 — nothing summed. No umbrella rows exist to add: "umbrellas" appears only as ID-1.7.md's location-cluster *inference* about what the OF-7xx family contains, not as a stated row anywhere.

## ZONE-A — 4 lines added (tools/out/space-enrich/ZONE-A.json)

1. **Ceiling / HIGH** — canopy soffit: "extruded aluminum soffit system with a natural wood look paint finish, similar finish to trellis" (AS102 view 3 CANOPY-RCP; AS103 "CEILING MATERIAL: ALUM. SOFFIT..."). Draft had no ceiling line.
2. **Paint / HIGH** — exposed steel at canopy + trellis: high performance coating; "3 coats of enamel prior to setting" (shop-applied); primed/painted tube steel canopy columns (AS103 verbatim notes; AS102 kn 38). Draft had no paint line.
3. **Flooring / MEDIUM** — colored concrete with exposed aggregate **or** sand finish under the drop-off (AS102 text; = AS100 legend PAVING #2). MEDIUM because the sheet offers two finishes with no selection, and the sitework-vs-GC flatwork split needs confirming.
4. **Appliance / FLAGGED** — exterior gas grill at the outdoor lounge (AS102 plan shows lounge "with fire pit and grill"; kn 40 remote-emergency-shut-off text). FLAGGED: on no FF&E/furnishing list (absent from ID-1.9 and A510.3's FURNISHING LIST), and AS104 Rev 5 shows a patio grill in the adjoining zone — one grill or two is unresolved.

**Not added (Zone A):**
- **Decorative non-slip paving (kn 8 / AS100 PAVING #3 "decorative non-slip tile pavers")** — cannot be placed in Zone A from text. AS102's keyed list demonstrably carries notes that do NOT land on its plan (kn 49 "OPTIONAL POOL" is on the list; no pool on the sheet), so list membership ≠ placement. If the lounge floor finish is wanted, the note-8 bubbles / PAVING #3 hatch must be read off the AS102 plan graphic.
- **24"×54" FRC planters (kn 48), bollards (kn 20), trash/recycling/ash bins (kn 47)** — site furnishings on no ffe-public row; planters additionally risk double-carry against OF-716, which ID-1.9 groups as "accent pieces / planters area".
- **Canopy lighting** (recessed cans, continuous LED strip, string lights) — electrical fixtures, outside the allowed categories; carried only as a sequencing warning inside the Ceiling line's note (rough-in per kn 52/53 before soffit closes).
- **PTAC wall detail + 1/4" stone window sill embedded on AS103** — guestroom assembly hiding on a site sheet (AS103's own flag); not a Zone A item.

## ZONE-B — 9 lines added (tools/out/space-enrich/ZONE-B.json)

1. **Paint / HIGH** — trellis steel: "ALL EXPOSED STEEL...HIGH PERFORMANCE COATING AT TRELLIS" (AS105 details 10/11); "primed and painted tube steel" (AS104 kn 22). Draft's only paint line was the flagged PT-08 — different scope, no overlap.
2. **FF&E - Misc / FLAGGED** — pool-patio trellis wood infill, Thermory/Accoya per AS105 kn 40 legend, top of slat @ 9'-0". FLAGGED on AS105's own three-descriptions conflict (see discrepancy D6). Zone A twin already in draft; separate structures.
3. **Stone / Surround / HIGH** — brick precast coping, non-slip, full mortar bed, expansion joints (AS104 detail 4, kn 17/33/35). Ownership caveat noted (pool design-build by others).
4. **Ceiling / FLAGGED** — direct-attached Tectum panels over continuous vapor barrier (AS104/AS104.1 kn 44+25; AS104.1 RCP lays out S03 @ 8'-0" o.c. + OTS/W/L). FLAGGED: pool is outdoor/open-to-sky, so panel location (equipment building vs covered patio) is graphic-only, and AS104.1 never got Rev 5 (version skew).
5. **Ceiling / FLAGGED** — "painted tube steel canopy with wood finished soffit / modified wood canopy with steel support" (AS105 kn 4+5). FLAGGED: AS105's list carries prototype boilerplate (kn 11/13), so bubble placement must be confirmed on the elevations; kn 21's "decking and beam" corroborates a covered condition.
6. **Flooring / FLAGGED, code T-04** — printed on AS104 Rev 5 pool section; **no card, carried by no package in the set**.
7. **Flooring / FLAGGED, code T-05 (typ.)** — same; possibly the "decorative tile border — full perimeter" the sheet states in words (not confirmed).
8. **Stone / Surround / FLAGGED, code SF-01** — printed on AS104 Rev 5 pool section; SF family has no schedule card (coordination_issues S-08); elsewhere SF-01 is guestroom-only.
9. **Appliance / HIGH** — exterior gas grill at patio (AS104 plan text; AS105 dedicated views 7/8 ELEVATION/SECTION - PATIO GRILL, OF-706 tagged on that elevation). Count cross-check vs the AS102 lounge grill noted.

**Not added (Zone B):**
- **"Concrete deck, integrated color and finish" (AS104 coping detail)** — rival to the draft's TL-14 deck-tile line; per rule 2 reported as discrepancy D1 instead of added.
- **Pool vessel**: white plaster shell, decorative tile border, underwater lights, depth-marker geometry — pool-vessel scope, design-build by others (draft already carries TL-11/TL-12 and the 034/035/036 no-source flag).
- **AS104 accessibility/equipment stack** (fixed pool lift, SS handrail, stair entry, ladder, perimeter fence w/ 3'-0" gate, drinking fountains, house/emergency phones, damp-rated speakers, FE cabinet, hose bibbs, key-card entry, string lights, S03/OTS/W/L fixtures) — outside the allowed categories (EC/PC/pool-sub/code items).
- **Half-height brick patio enclosure wall + precast concrete cap** (AS105 detail 9, kn 39, T.O. 4'-0") — masonry site wall = hardscape, outside categories.
- **EX-1 / EX-5 / EX-6 envelope palette** (fiber cement "San Francisco Bay" / EIFS white / face brick "Stone") — building envelope, outside categories; note AS105's flag that the EX notation must be reconciled against A200/A201 before ordering.

## DISCREPANCIES (for the verification pass)

- **D1 — Pool deck surface: tile vs concrete.** Draft carries Flooring TL-14 "deck tile" (ID-1.8; fs pp.56/57 T-14 "Floor Tile, Pool Deck"). AS104 Rev 5 coping detail states "**CONCRETE DECK, INTEGRATED COLOR AND FINISH**" and notes deck slope/relief-joint rules for a concrete deck (kn 19/24/28). Two finish systems for the same surface, and the governing sheet is the newer one. Related: AS104 kn 39 "INDOOR POOL RECEIVE TILE" is flagged prototype boilerplate on the same sheet. No rival line added. RFI-grade.
- **D2 — Tile notation, new corroboration.** AS104 Rev 5 prints **T-11 / T-12** (schedule notation) on the pool section while the draft carries ID-1.8's **TL-11 / TL-12**. Bears on conflict T-6 (not normalised, both carried): the newest architectural sheet sides with the T-xx notation. Not added (same physical items as draft lines).
- **D3 — T-04 / T-05 / SF-01 missed by every package.** Printed on AS104 Rev 5; absent from finishes.md §5.24, from the FE-G5 no-card list, and from the fs card set (T-series cards stop at T-14 with gaps). Now added FLAGGED — the DB had no trace of them.
- **D4 — Fire pit zone flag can likely be resolved to Zone A.** Draft 400_a is FLAGGED "zone not stated" (A510.3's furnishing list places it in no space — the outdoor zones aren't on A510.3 at all; the pool/patio enlarged finish+FF&E sheet A512 is missing, RFI register R-05). AS102's plan shows the fire pit **in the entry outdoor lounge** (with kn 31 defining it: manual emergency remote shut-off, underground gas line, safety screen); AS104 Rev 5's plan notes a grill but **no fire pit** at the pool patio. Sheet evidence supports the Zone A assignment the draft already carries.
- **D5 — ST-01 zone assignment.** Carried in ZONE-B draft ("stone at patio / entry thresholds", ID-1.8 / A510.4 line 43 / fs p.41). A510.4 puts the 3 tagged locations "along the **south** storefront wall base / thresholds", while ID-1.7 places the pool deck **north** and ID-1.8 also tags ST-01 at "Vestibule 001 / entry". If the south storefront faces the entry lounge, some or all ST-01 thresholds may physically sit in Zone A. Verify on the plan graphic before punch-walking it under Zone B.
- **D6 — Trellis material identity, both zones.** Three descriptions for one element family (AS105's own flag): kn 40 legend "thermally modified or acetylated wood — Thermory / Accoya"; AS105 details 10/11 "2x4 fire retardant treated wood"; AS103 "2x6 thermally modified/acetylated slats". Slat size 2x6 vs 2x4 additionally differs between sheets. Affects cost and fire rating. Zone A's draft wood line (HIGH, src AS102/AS105) does not mention the conflict; my Zone B line carries it FLAGGED. RFI candidate.
- **D7 — AS104.1 version skew.** Power/RCP companion is still 06/09/23 Rev 1 while AS104/AS105 are Rev 5 04/09/26. Anything taken from AS104.1 (Tectum RCP layout, device locations) may be stale — flagged inside the Tectum line; also the highest-value coordination check before pool electrical rough-in per the sheet file.
- **D8 — Grill count.** AS102 (06/09/23) shows a grill at the entry lounge; AS104/AS105 (Rev 5) show a patio grill at the pool. Zones adjoin and AS102's own flag says AS104 is newer where they meet. Two placements are drawn; whether that is two purchases is unstated, and the grill is on no furnishing/FF&E list. Both lines carry the cross-check note.
- **Verified consistent (no action):** draft OF-700 qty 4 matches current ID-1.9 (conflicts.md B4.6's untagged version is superseded); all draft OF qtys match ffe-public §4 exactly; PT-08 draft flag matches conflict P-4; OF-701 provenance note (ID-1.1 vs ID-1.9) already carried on the draft line.

## Open questions for Austin / RFI

1. **One exterior gas grill or two** (entry lounge per AS102 vs pool patio per AS104/AS105)? Who buys — no furnishing-list or OF-tag entry exists for either. (D8)
2. **What are T-04, T-05, SF-01 on the AS104 Rev 5 pool section?** No schedule card anywhere. RFI to MWT citing AS104 views 2/3/4. (D3)
3. **Pool deck: TL-14/T-14 tile or integral-color concrete?** AS104 Rev 5 vs ID-1.8/fs; kn 39 "INDOOR POOL RECEIVE TILE" boilerplate muddies it. (D1)
4. **Trellis infill: Thermory/Accoya vs 2x4 FRT vs 2x6** — three descriptions, one element; fire-rating and cost impact. (D6)
5. **Where is the Tectum "pool ceiling" (kn 44+25) on an open-to-sky pool** — equipment building or covered patio? And does the AS104.1 RCP survive Rev 5? (D7)
6. **RFI #94** (porte-cochere canopy coordination, referenced by ID-1.9) is not in the local RFI_register (which uses R-xx numbering) — confirm its status in the live Procore/email record.
7. Standing missing-sheet items touching these zones, already registered: **A512** (pool/patio enlarged finish+FF&E plan — R-05) and **AS101** (site enlargements — R-06). Their absence is why the outdoor zones have no architect's finish/FF&E tabulation and why zone assignments (fire pit, ST-01) need graphic verification.
