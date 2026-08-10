# Circulation cluster — enrichment report

Date 2026-08-10. Cluster as assigned: 33 space numbers (6 on floor 1 + 9 each on floors 2–4; the brief's header said "24" — the enumerated list is 33 and all 33 were processed). **29 enrichment files written** to `tools/out/space-enrich/`; **4 spaces got no file** (140, 240, 340, 440 — nothing sheet-stated in the scope categories; see below). Floors 2–4 were verified sheet-by-sheet (A121 / A122 / A123), not assumed identical; the two genuine floor-4 deltas found (437 height, 439 text-layer overprint) are flagged on their lines.

## Lines added per space

| Space | Added | Summary |
|---|---|---|
| 100 Stair 1 | 2 | Ceiling FLAGGED (8'-0" tag in the gyp band at the stair head, A120 — ambiguous whether it governs the stair or the corridor bulkhead); Paint FLAGGED (wall-mounted 1.5" oak handrail, stained — A431) |
| 121 Guest Corridor | 1 | Ceiling FLAGGED (ACT bays 8'-2" / gyp bands 8'-0", A120 — C-05 system conflict vs ID-1.11) |
| 137 Elev. Lobby | 2 | Ceiling FLAGGED (painted gyp, 8'-0" tag, A120 — conflicts A510.2's 8'-10", both Rev 4); Appliance HIGH (821 BOTTLE FILLING STATION, A510.3 + details 03/04 A510.1 — missing from draft) |
| 139 Ice Machine | 1 | Ceiling FLAGGED (ACT grid 8'-0", A120 Rev 4 — vs draft PT-07 paint line; vs upper floors' 8'-2", possible revision skew) |
| 140 Elev. | 0 | **No file.** See "spaces with nothing to add." |
| 141 Stair 2 | 1 | Paint FLAGGED (1.5" oak handrail, stained — A433; note ties to draft's A510.1 note-58 underside-paint line) |
| 200/300/400 Stair 1 | 2 each | Paint FLAGGED (handrail, A431); Flooring FLAGGED (landing marker: floors 2–4 NO SOURCE — mirrors finishes.md §2/§5.23 defect 5, not resolved) |
| 219/319/419 Electrical | 1 each | Ceiling FLAGGED (8'-3 3/8" tag, **no legend hatch** — system undetermined, A121/A122/A123 flags verbatim) |
| 220/320/420 Storage | 1 each | Ceiling FLAGGED (same: 8'-3 3/8" tag, no hatch) |
| 221/321/421 Guest Corridor | 1 each | Ceiling FLAGGED (ACT bays 8'-2" / gyp bands 8'-0", TYP. — per-floor sheet; C-05) |
| 235/335/435 House Keeping | 1 each | Ceiling FLAGGED (8'-3 3/8" tag, no hatch; ID-1.16 corroborates height; chute keyed note 2 in this block — A450 shaft closure coordination) |
| 237/337 Elevator Lobby | 1 each | Ceiling FLAGGED (8'-3 3/8" tag, no hatch; ID-1.16's PT-07 implies painted lid — arch RCP hatches none) |
| 437 Elevator Lobby | 1 | Ceiling FLAGGED (A123 tags **8'-0"**, differs from 237/337; A123's own flag: "intentional or drafting slip — verify") |
| 239/339 Ice Machine | 2 each | Ceiling HIGH (ACT grid 8'-2", A121/A122); Ceiling MEDIUM (flush access panel, ISC CAP-1818, keyed note 5 — confirm size w/ EOR) |
| 439 Ice Machine | 2 | Ceiling FLAGGED (8'-2" renders but DWG text layer holds 8'-0" **and** 8'-2" at identical coordinates — A123 flag: read printed sheet); access panel MEDIUM |
| 241/341/441 Stair 2 | 2 each | Paint FLAGGED (handrail, A433); Flooring FLAGGED (landing marker, floors 2–4 NO SOURCE) |
| 240/340/440 Elev. | 0 | **No file.** |

## Spaces with nothing to add (no file) — per space

- **140, 240, 340, 440 (Elev., two hoistways under one number per floor):** No ceiling tag on any RCP (A120–A123 flags). A440/A441 state hoistway construction only (2x4 studs, 5/8" Type X, rated assembly, pit ladder, vents) — **no cab interior finishes are stated on A440 or A441**, and none appear in finishes.md, ffe-public.md, or the concept wiki. The only elevator finish statement in the set — A700 keyed note 14, "Elevator and surround — finish to be brushed stainless steel" — is already carried on the 137 draft (FF&E - Misc, HIGH); it is keyed at the ground-floor lobby face and is not repeated on A701's typical-floor views 11–14, so it was not extended to 240/340/440 or to 237/337/437. Caution: coordination_issues.md **D-02** says `A440.md` is unreliable (sheet actually prints OTIS **GEN 3 EDGE**, CAB 1 3500 lbs / CAB 2 2500 lbs — not "Gen2") — but re-reading it changes nothing here: no finish category content either way.

## Lines considered and NOT added

- **Ceiling lines for stairs 141/200/241/300/341/400/441:** no ceiling tag exists on any RCP (A120–A123 flags list them explicitly). Nothing to cite.
- **Stair-2 underside paint (A510.1 note 58) for 241/341/441:** the note is placed once, at Stair 2 on the floor-1 enlarged plan (A510.1 general note A restricts that keyed-note list to A510.1–A511.1). No upper-floor equivalent exists — not extrapolated. Draft 141 already carries it for floor 1.
- **CPT-12 / T-01 landing finishes on upper stairs:** deliberately not emitted — mirrors the carried conflict (finishes.md §2/§5.23: "No rows emitted for upper-floor landings. Do not extrapolate."). A FLAGGED no-source marker line was added instead.
- **Access panel at 139:** keyed note 5 (CAP-1818) is NOT placed on A120 — only on A121–A123. A120.md: treat floor 1 as intent, confirm by RFI. Not added.
- **Brushed stainless (A700 note 14) at 237/337/437:** not tagged on the typical-floor elevations (A701 views 11–14) — not added.
- **Second 821 bottle filler ("restroom-entry side of the corridor," ffe-public §13.2):** location is the public-block corridor by 019/020, not a numbered circulation space in this cluster — left to the lobby/public cluster; flagged in 137's note "do not sum."
- **A450 chute items at 235/335/435:** chute doors/rated assemblies are construction/doors scope, not in the allowed finish categories.
- **Sealed-concrete / VCT / RB / WC lines:** all already in drafts (verified against finishes.md §5.18–§5.22 line by line — no gaps besides the ones added).

## DISCREPANCIES (draft/DB vs sheets — for the verification pass)

1. **137 ceiling height — two Rev-4 sheets disagree.** A120 (Rev 4, 08/09/24) tags Elev. Lobby 137 **8'-0"** painted gyp; A510.2 (also Rev 4, 08/09/24) tabulates 137 at **8'-10"**. Draft PT-07 line (src A510.2, MEDIUM) carries 8'-10". Same-revision architectural conflict — RFI candidate, not a skew artifact.
2. **139 ceiling system — draft Paint line vs RCP hatch.** Draft carries "PT-07 ceiling paint, 8'-0" AFF" (src A510.2, MEDIUM). A120 (Rev 4) hatches 139 as **ACT grid** at 8'-0" — and A510.2's own extraction says it prints **no PT codes at all** ("no PT code is given here → A510.4 / FF&E finish schedule"), so the PT-07 attribution at 139 is unsupported at the source. An ACT lay-in lid is not a painted lid. Per brief rule 2 the rival reading was not added as a clean line — the added Ceiling line is FLAGGED carrying both readings; resolve before ordering either.
3. **Ice-alcove height differs across floors, possibly revision skew.** 139 = 8'-0" (A120 Rev 4 + A510.2 Rev 4); 239/339/439 = 8'-2" (A121–A123, base issue 06/09/23, empty revision blocks). A123's text layer holds both 8'-0" and 8'-2" at the same coordinates at the 439 alcove (only 8'-2" renders). Flagged with the skew reason on the 139 and 439 lines, per the brief.
4. **437 ceiling height.** A123 tags **8'-0"**; A121/A122 tag 237/337 at **8'-3 3/8"**; draft 437 PT-07 line says 8'-3 3/8" (src ID-1.16 "typical", HIGH). A123's own flag: "may be intentional (roof/structure change at the top floor) or a drafting slip. Verify — do not assume." The draft's HIGH grade on 437 overstates certainty for this floor. (A121-vs-A123 is within the unrevised set — not the A120 skew.)
5. **Corridor ceiling SYSTEM — C-05.** Registered in coordination_issues.md: A120–A123 = ACT bays 8'-2" between gyp bands 8'-0"; ID-1.11/1.15/1.16 = PT-07 painted gyp 8'-2" typ., **no ACT anywhere in the corridor**. The draft PT-07 lines (121/221/321/421) cite *both* families in one src string ("ID-1.11 / ID-1.15 / ID-1.16; A120–A123") as if they agree — misleading; they disagree on the trade. Blocks grid/tile buy, mock-up, and sprinkler head type (A120 gen. note I: concealed in public ceilings).
6. **139 T-01 draft line is missing the dished-fall requirement.** finishes.md §5.21 attaches keyed note 19 (A510.4/A511.2: floor drain w/ trap primer in dished recess — "the tile must be laid to a dished fall") and A510.1 note 24 (accessible ice machine, drain centered under machine, positive slope, insulate drain pipes) to 139's tile. The draft's T-01 label/instanceNote carries none of it. Not added (would duplicate the T-01 line) — recommend annotating the existing draft line.
7. **821 BOTTLE FILLING STATION missing from draft 137.** Tagged on A510.3 at 137 with details 03/04 A510.1; OPEN_ITEMS lists its rough-in as awaiting a receiving package. Added HIGH. Responsibility (OF/CI vs OWN) not stated on any sheet — A510.3 flag 7.
8. **Draft 121 PT-07 label says "8'-2\" AFF typ., alternating with 8'-0\" gyp bulkhead bands"** — the 8'-2" segments are the *ACT* bays per A120, so a paint line spanning both heights presupposes the ID (all-gyp) reading of C-05. Consistent with #5; noting so the verification pass reads the label as one side of the conflict, not fact.
9. **A510.2 lists "first-floor guest corridor / circulation" at 8'-10"** — matches neither corridor value on A120 (8'-2"/8'-0"). Probably scoped to the enlarged-lobby circulation stub, but the row is unqualified. Minor; noted on 121's line.
10. **Stair handrail finish exists only in the A43x extractions.** A431/A433 state "wall-mounted 1.5\" dia. oak handrail, stained" (detail 06/A431; A434). No stain/finish code exists in the 67-card schedule; no ID sheet covers stairs; and sibling extraction A440.md was proven wrong on the elevator (D-02: "re-read from the source before quoting"). All 8 handrail lines are FLAGGED pending a read of the printed A431/A433/A434. Related: A510.1 note 58 paints the Stair-2 *underside* "to match stair railing" — a painted railing vs a stained-oak handrail is unreconciled.

## Open questions for Austin / RFI candidates

1. **RFI — Elev. Lobby 137 lid: 8'-0" (A120 Rev 4) or 8'-10" (A510.2 Rev 4)?** Both current issue; gates framing, WC-10/WC-11 cut heights and the PA-501/821 wall.
2. **RFI — corridor ceiling system (C-05):** ACT bays + gyp bands (A120–A123) vs continuous PT-07 gyp (ID-1.11/1.15/1.16)? Highest-repetition ceiling in the building; also decides concealed-head count and ACT tile size (2'x2' vs 2'x4' not distinguishable at 3/32").
3. **RFI — Ice Machine lid:** ACT (A120 hatch) vs painted PT-07 (draft reading) at 139; and 8'-0" vs 8'-2" across floors given the A123 text-layer overprint and the A120-vs-A121–123 revision skew.
4. **RFI — Elevator Lobby 437 at 8'-0" vs 8'-3 3/8"** (A123's own "verify — do not assume").
5. **Direction needed — upper-floor stair landings/treads (all 6 upper stair spaces + treads on floor 1):** no finish source anywhere; ground-floor landing conflict (T-01/T-01.1 vs CPT-12/CPT-12.1) still open per finishes.md §2 — mirrored, not resolved.
6. **Confirm — ceiling system for 219/319/419, 220/320/420, 235/335/435, 237/337/437:** height tag 8'-3 3/8" (8'-0" at 437) with **no hatch** on A121–A123; A120's floor-1 analogues were open-to-structure but that is inference.
7. **Confirm — elevator cab interiors (140/240/340/440):** no finish stated in the architectural or FF&E set; presumably the OTIS Gen 3 Edge supplier package (Div 14) — confirm cab finish selections and whether they route through Franchise Design Services.
8. **Confirm — CAP-1818 access panel:** size with EOR before grids close at 239/339/439; product not keyed on floor 1 (A120) — apply by intent or RFI.
