# H2SEP — ROOM TYPE PACKAGES (master reference table)

Home2 Suites by Hilton, Eagle Pass TX · Triun 24030 / architect 22-014 · 115 keys
Assembled 2026-08-07. **Status is deliberately empty on every row — this is the static reference layer.**
Read `README.md` first for the join, the precedence and the granularity rules.

**Columns:** `Cat` = one of the 21 categories · `Tag` = exactly as printed, never normalised · `Inst` = instance note (quantity is repeated rows, not a number) · `Trade` · `Source` · `Conf` = HIGH / MED / ASSUMPTION / FLAGGED · `Gran` = TYPE / ROOM / DERIVED.

**Trade codes:** FFE (FF&E install) · MW (millwork/casework) · GC · EC (United Electric) · MC (Iceberg, HVAC) · PC (Larry's Plumbing) · FS (Texas Fire Services) · FA (Security Integrated) · TILE (Keeper's) · PT (Painters) · WC (wallcovering trade) · DR (door/hardware) · OWN (owner/operator furnished).

**Live room types — 11.** *(Corrected 2026-08-07 by the canonical-join repair. This table previously read
"9, not 11" and retired `QQ Wide` / `QQ Wide Connecting`. That cited the **superseded** first version of
OV-001. `OVERRIDES.md` OV-001 is **LABEL-ONLY**: it changes `display_label` and nothing else.)*

> ⛔ **`room_type` IS THE JOIN KEY. `display_label` IS NOT.** The `room_type` column below is the controlled
> vocabulary, taken verbatim from `room_map.md`'s type reconciliation. The contract that lists every alias
> found in these packages and what it was rewritten to is **`packages/ROOM_TYPE_CANONICAL.md`**.
> Joining on `display_label` returns **zero rows** for the 47 QQ-family keys and sizes rooms
> 101 / 201 / 301 / 401 **55 sqft short** on every area-scaled quantity (G001: 535 vs 480 sqft).

| `room_type` (JOIN KEY) | `display_label` | Keys | Rooms | Room-type block | Bathroom block |
|---|---|---|---|---|---|
| `King Studio` | King Studio | 57 | per `room_map.md` | §2.1 | §4.1 |
| `King Studio Connecting` | King Studio Connector | 1 | 116 | §2.2 | §4.1 |
| `King Studio Acc.` | King Studio Accessible *(438)* · King Studio Accessible MOD Connector *(118)* | 2 | 118, 438 | §2.3 | §4.3 |
| `King One Bedroom` | King One Bedroom | 3 | 202, 302, 402 | §2.4 | §4.2 |
| `King One Bedroom Acc.` | King One Bedroom Accessible | 3 | 217, 317, 417 | §2.5 | §4.4 |
| `Queen-Queen` | QQ Studio | 31 | per `room_map.md` | §2.6 | §4.1 |
| **`QQ Wide`** | QQ Studio *(OV-001 label)* | **2** | **201, 301** | §2.6 | §4.1 |
| `QQ Connecting` | QQ Studio Connector | 6 | 103, 215, 236, 336, 403, 436 | §2.7 | §4.1 |
| **`QQ Wide Connecting`** | QQ Studio Connector *(OV-001 label)* | **2** | **101, 401** | §2.7 | §4.1 |
| `QQ Extended` | QQ Extended | 6 | 230, 232, 330, 332, 430, 432 | §2.8 | §4.1 |
| `QQ Acc.` | QQ Accessible | 2 | 238, 338 | §2.9 | §4.3 |
| | | **115** | | | |

**Room 118 and room 438 share one `room_type`.** `room_map.md` types both as `King Studio Acc.`; there is no
`KS Acc Connecting` row in the unit matrix (`room_map.md` unresolved item 3). Carry **`mod`** and
**`connecting`** as separate per-room booleans — 118 is `+ mod + connecting` (A100 prints
`KING STUDIO ACCESSIBLE MOD CONNECTOR`); **438's connector status is OPEN**, `conflicts.md` **B4.4**.
Do not encode either fact in the type string.

Every guestroom also gets **§1 GUESTROOM COMMON** in full.

---

# §1 — GUESTROOM COMMON

Applies to **all 115 keys**. The MEP packages resolve to room type only and state that this set is identical across every type; only the two deltas at the bottom of each subsection vary. No mechanical, electrical or plumbing sheet references the ID-5.10/5.11/5.12/5.13 bathroom types, so the bathroom MEP rows sit here, not in §4.

## 1.1 Mechanical — 16 rows, identical on every type

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| Mechanical | PTAC-1 / PTAC-2 | Packaged terminal A/C, G.E. — PTAC-1 `AZ65H12DAB` 11,900 BTU / PTAC-2 `AZ65H15DAB` 14,200 BTU, 208/1/60, in wall sleeve | | MC | M401 KN3; M201 PTAC schedule | see §1.1 delta | TYPE |
| Mechanical | — | PTAC wall sleeve kit, furnished w/ unit, caulked all around, min 3-1/4" AFF | | MC | M501 det. 9; M201 notes | HIGH | TYPE |
| Mechanical | — | Architectural wall grille / polypropylene louver kit furnished w/ unit; exterior face painted to match exterior wall, interior face to match interior wall; colour by architect | | MC | M401 KN1+KN5; M501 det. 9; M201 notes | HIGH | TYPE |
| Mechanical | — | PTAC drain kit, furnished w/ unit (1st–4th floor units) | | MC | M501 det. 9 | HIGH | TYPE |
| Mechanical | — | PTAC condensate drain run down wall — **plumbing scope** | | PC | M401 KN2; M501 det. 9 | HIGH | TYPE |
| Mechanical | — | Fresh-air filter, MERV 13 or 8, w/ bracket & gasket | | MC | M201 PTAC notes | HIGH | TYPE |
| Mechanical | — | Energy-management wall controller w/ occupancy sensor | | MC | M201 PTAC notes | HIGH | TYPE |
| Mechanical | T | Thermostat, 7-day programmable — **54" AFF non-accessible / 48" AFF accessible** | | MC | M401 KN4 (governs over M101 N29's 4'-0" default) | HIGH | TYPE |
| Mechanical | — | 4"Ø fresh-air duct above ceiling | | MC | M401 KN6 | HIGH | TYPE |
| Mechanical | — | 4"Ø toilet exhaust duct to EV riser | | MC | M401 | HIGH | TYPE |
| Mechanical | EAG-50 | Exhaust air grille, 50 CFM, @ toilet/bath | | MC | M401 | HIGH | TYPE |
| Mechanical | — | Aldes constant-airflow regulator at the 50 CFM ceiling exhaust inlet | | MC | M305 riser diagrams | HIGH | TYPE |
| Mechanical | VD | Volume damper @ toilet exhaust | | MC | M401 | HIGH | TYPE |
| Mechanical | FD | Fire damper @ rated ceiling penetration, toilet exhaust | | MC | M401; M301 N3; M501 det. 2 | HIGH | TYPE |
| Mechanical | WAG-30 | Wall air grille / transfer, 30 CFM, make-up to bath | | MC | M401 | HIGH | TYPE |
| Mechanical | EF-1 | Toilet exhaust fan, Panasonic `FV-0511VK2`, 50 CFM — **or a grille designation, not a fan** | | MC | M201/M202/M301–M304 **vs** M305 | **FLAGGED** | TYPE |

**EF-1 conflict (F3):** M201/M202/M301–M304 all read EF-1 as an in-room Panasonic fan; **M305's riser diagrams show a plain ceiling grille + Aldes regulator on a central EV riser driven by roof fans EF-8–EF-11, with no in-room fan.** Mutually exclusive. Do not order 115 fans off this. → `OPEN_ITEMS` C4.

**§1.1 deltas by type:**

| Type | PTAC mark | Conf | Thermostat |
|---|---|---|---|
| King Studio · KS Connecting · KS Acc. | **PTAC-1** | MED — M401 "PTAC-1 on most rooms" + M301 confirms all 16 floor-1 keys incl. King Studios 104–114/116/118 | 54" (48" on KS Acc.) |
| Queen-Queen · QQ Connecting · QQ Extended · QQ Acc. | **PTAC-2 / PTAC-1 — both carried** | **FLAGGED** — M401 details 01/02 show PTAC-2; M301 says PTAC-1 at all 16 floor-1 keys incl. QQ 105–115. No winner picked | 54" (48" on QQ Acc.) |
| King One Bedroom · King 1BR Acc. | **no mark** | **FLAGGED** — largest keys, no floor-1 instance to check, nothing states which. Below 85%, not guessed | 54" (48" on Acc.) |

**No M401 detail exists for QQ Wide / QQ Wide Connecting.** Under OV-001 those types no longer exist, so this gap is closed by the override rather than by a drawing — recorded because reversing OV-001 reopens it.

## 1.2 Plumbing — common to every guestroom

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| Plumbing | GV | Gate valve @ CWS riser take-off, wet wall | | PC | P401 | HIGH | TYPE |
| Plumbing | GV | Gate valve @ HWS riser take-off, wet wall | | PC | P401 | HIGH | TYPE |
| Plumbing | GV | Gate valve @ HWR riser take-off, wet wall | | PC | P401 | HIGH | TYPE |
| Plumbing | — | Domestic water branch to unit: **1/2" HWR + 3/4" HWS @120°F + 1" CWS** | | PC | P202 "TO F.U. GUESTROOM"; P401 | HIGH | TYPE |
| Plumbing | — | Fixture runouts within unit: 1/2" CWS, 1/2" HWS, 3/4" CWS | | PC | P401 branch sizes; P305 KN③ | HIGH | TYPE |
| Plumbing | ① | Sanitary sewer riser tie @ wet wall | | PC | P402; P201 riser schematic | HIGH | TYPE |
| Plumbing | — | Vent riser @ wet wall | | PC | P402 | HIGH | TYPE |
| Plumbing | — | WC waste 3" SS to 4" SS stack | | PC | P402 pipe sizes | HIGH | TYPE |
| Plumbing | — | 2" SS waste branch — lav / shower / tub / kitchenette sink | | PC | P402; P301 note | HIGH | TYPE |
| Plumbing | — | Vent piping 1-1/4" V individual, 1-1/2" V, 2" V branch | | PC | P402 | HIGH | TYPE |
| Plumbing | WC-3 / WC-4 | Water closet, guestroom, floor outlet, tank type 1.28 GPF. WC-3 = Champion Pro `211AA.104` (ADA) / WC-4 = Cadet Pro `215CA.104` | | PC | P401 + P402 unit plans; product P104 | MED — **which mark lands in which unit type is NOT stated**; the pair prints together | TYPE |
| Plumbing | L-2 / L-3 | Lavatory, guestroom — **DUAL MARK, carry both** | | PC | P401/P402 mark **L-2**; P104 schedule **L-3 / L-4** | **FLAGGED** | TYPE |
| Plumbing | — | Lavatory bowl: American Standard **Studio Under Counter**, `0614.000` / `0614.300` / `0618.000` — **no model selected on the submittal** | | PC | S4 submittal — **SUPERSEDES** P104's Decolav Callensia 1402-CWH | **FLAGGED** | TYPE |
| Plumbing | — | Lavatory faucet: Moen **M·Dura** `9417F12` / `9419F12`, single-hole, 1.2 gpm — **no model selected** | | PC | S4 submittal — **SUPERSEDES** P104's Delta 581LF (3-hole) | **FLAGGED** | TYPE |
| Plumbing | SK-3 / SK-4 | Kitchenette / wet-bar sink — **no scheduled product in P104** | | PC | P401 + P402 ("suite/extended units") | see §1.2 delta | TYPE |
| Plumbing | — | Kitchenette sink: American Standard **PEKOE 23×18 single bowl**, `18SB.10231800.075`, 18ga undermount, **26" cabinet required**; incl. grid `7302282-401.0750A`, waste `9028000.075`, clips `791676-100.0070A` | | PC | S4 submittal — settles that SK-3/SK-4 are real and P104 has the hole | HIGH | TYPE |
| Plumbing | — | Kitchenette faucet: Moen `8227` — sheet titles it a **two-handle 8" widespread 3-hole LAVATORY faucet** | | PC | S4 submittal, filed as "Kitchenette Faucet" | **FLAGGED** — a 3-hole 8" spread will not drop into a single-hole deck. Confirm hole pattern on the countertop shop drawing | TYPE |

**§1.2 deltas by type:**

| Type | Adds |
|---|---|
| King Studio · KS Connecting · QQ · QQ Conn · QQ Ext | **SH-1** shower, guestroom — **DUAL MARK**: P104's SH-1 is the 36"×36" *Employee* shower; guestroom is SH-3 (ADA, no threshold) / SH-4 (4" threshold), Kohler Rely 30"×60" pan, Delta T24859. FLAGGED. |
| KS Acc. · King 1BR Acc. · QQ Acc. | **BT-1** tub (Am. Std Princeton 2390.202, Delta T14261/R10000-UNWS) **OR** **SH-3** roll-in, 30"×60" pan, no threshold — **both carried, unresolved, see §4.3/§4.4 and `OPEN_ITEMS` A2**; plus **FD** floor drain, mark not scheduled (P104 has FD-1/FD-2/FD-3, none a guestroom bath drain), trap guard/primer per P301 GN6. |
| Kitchenette sink scope | **MED** on King One Bedroom, King 1BR Acc., QQ Extended (the "suite/extended units" P401/P402 name). **FLAGGED** on King Studio, KS Conn, QQ, QQ Conn — plans 01/05 cover QQ *and* QQ Ext on one drawing so the sheet cannot tell you. |

**Plumbing plan mapping:** 7 P401/P402 unit plans → 9 types. Stated for King Studio (03), King One Bdr (06), King One Bdr Acc. (07), QQ/QQ Ext (01 and/or 05 — which variant not stated), QQ Acc. (02). **Not stated** for King Studio Connecting and QQ Connecting (no connecting variant drawn — rows carried from base type as ASSUMPTION ≈90%: a connecting door is not a change to the wet wall, and the matrix states both share bathroom sheet ID-5.10). **King Studio Acc. is worse:** two plans (02 "King Acc." and 04 "King Std Acc.") both claim a King accessible. FLAGGED, not guessed.

## 1.3 Electrical / Low Voltage — common to every guestroom

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| Electrical | — | Guestroom panelboard, **100A MCB, 120/208V 1Ø 3W, NEMA 1**, located in the Bedroom. Square D / GE / Cutler-Hammer, **copper bus only, no aluminium bussing, no load centres** | | EC | E400 Panel A & B schedules; E103; E101 spec #10 | HIGH | TYPE |
| Electrical | — | Branch circuits in the room panel: Lighting · Convenience Receptacles · Bathroom GFCI · Refrigerator · Disposer · Dishwasher · Microwave/Hood · PTAC · Small Appliance · Spare (+ Motorized Shade on Panel B) | | EC | E400 | HIGH | TYPE |
| Electrical | — | Loads per room (E103): Small Appliances 3000 VA · Dishwasher 1068 · Disposer 480 · Refrigerator 173 · PTAC 2080 @208V · General Lighting area × 3 VA/SF · Microwave/Hood 850 (accessible splits 700 + 300) · Motorized Shade 114 (accessible only) | | EC | E103 load analysis | HIGH | TYPE |
| Electrical | — | Wall switches **+54" AFF** (E101 spec #18 governs; the legend on the same sheet prints 48" — conflict, 54" governs) | | EC | E101 spec #18; conflicts.md B1.5 | HIGH | TYPE |
| Electrical | — | Receptacles **+18" AFF**, all 120V 15A/20A non-locking receptacles in guestrooms and guest baths **tamper-resistant**; all devices rated 20A per local amendment; Hubbell, colour by architect | | EC | E101 spec #18, #25, GN #6, GN #10, spec #14 | HIGH | TYPE |
| Electrical | — | **AFCI** breakers per NEC 210.12; **GFCI** breaker on the bathroom circuit | | EC | E101 spec #31, GN #5; E400 panel notes 2–4 | HIGH | TYPE |
| Electrical | — | Bathroom switch with **integrated night light (typ.)** | | EC | E400 Keyed Note 1 | HIGH | TYPE |
| Electrical | — | Box rules: max 4"×4" box in a fire-rated wall; **no back-to-back boxes**; ≥6" separation non-rated, ≥24" fire/acoustic-rated; offset ~6" incl. TV and telephone; putty pads at back-to-back receptacle boxes | | EC | E101 spec #28, #29; E400 GN #1; A550 electrical plan note | HIGH | TYPE |
| Electrical | — | Wiring: CU THWN, min 1/2" conduit, min #12 CU, EMT concealed; 120V home runs ≥100 ft use #10; green continuous insulated **#6 min EGC** | | EC | E101 spec #12/#13/#24, GN #3, GN #12; E200 GN #1 | HIGH | TYPE |
| Electrical | — | Luminaire over tub/shower **enclosed, gasketed, wet-location listed** per NEC 550.14(D); fixtures over wet areas damp-rated | | EC | E400 GN #5; E101 spec note (1) | HIGH | TYPE |
| Electrical | — | Dishwasher switch **in the cabinet under the sink** | | EC | E101 GN #4 | HIGH | TYPE |
| FF&E - Lighting | S21 | Surface-mount downlight, guestroom restroom — Cooper Halo `SMD6R69SWH` (or approved equal) | | EC | E101 Lighting Fixture Schedule | HIGH | TYPE |
| FF&E - Lighting | WS03 | Wall sconce, guestroom vanity — Arkansas Lighting `3550V` (or approved equal) | | EC | E101 Lighting Fixture Schedule | **FLAGGED** — very likely the same physical fixture as FF&E **GR-203 Vanity Sconce**, counted twice across two packages. Buyout risk, both carried | TYPE |
| Electrical | — | Entry / closet / general room lighting — **fixture type never named on any sheet** | | EC | E400 lists the fixtures as present; no type given | **FLAGGED** | TYPE |
| Low Voltage | — | Data outlet, **CAT6, Panduit-brand cable + Panduit patch cord + Panduit locks on exposed connections**, labelled; +18" AFF | | EC | E101 GN #8 (Hilton brand standard) | HIGH | TYPE |
| Low Voltage | — | Telephone outlet + **3/4" conduit with pull string**; +18" AFF | | EC | E101 spec #16, symbol legend | HIGH | TYPE |
| Low Voltage | — | TV outlet w/ F connector, +18" AFF; smurf tube behind the TV | | EC | E101 legend; A550 keynotes 44/45/47 | HIGH | TYPE |
| Low Voltage | — | WAP in a 3-gang box under the desk, homerun to the floor IDF, ≥6" clearance between boxes | | EC | A550 keynotes 44/45/47 | HIGH | TYPE |

**Panel A vs Panel B (E103 "Panel" column — a printed value, not an inference):** Panel **A** on every non-accessible type; Panel **B** on King One Bdr Acc., King Studio Acc. Mod., King Acc., Queen Queen Acc. Panel B = the same circuits **plus motorized shade** plus ADA device heights.
**Device and drop counts per room are not stated in any extract** — they are on the E400 PDF. No takeoff attempted.
**Room-number → floor distribution panel (1G / 2A / 2B / 3A / 3B / 4A / 4B, 300A 22kA 500 KCMIL AL)** is in the "items served" column on the E103.2/.3/.4 PDFs and was not extracted.

## 1.4 Appliance — common to every guestroom

Presence is stated by the E400/E103 guestroom panel schedules (dedicated Refrigerator, Dishwasher, Disposer and Microwave/Hood circuits on every panel, all room types). Placement is tagged on the architectural enlarged plans as a **bare 3-digit 900-series, no GR- prefix**. Product identity is the Danby cutsheet set (S3).

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| Appliance | 901 | Refrigerator — Danby `DFF101B1BSSDB`, 10.1 cu.ft top-mount stainless, 115V/160W, 23.44"W × 26.19"D × 59.63"H, reversible hinge, R600a, ENERGY STAR, ADA per Danby internal testing | on the working wall | OWN / FFE | A550 / A551 / A552 / A553 / A554 / A555 / A556 plan tag; A530 legend `901 REFRIGERATOR`; product S3 | HIGH | TYPE |
| Appliance | 902 | Dishwasher — **both Danby models carried, unresolved**: 18" `DDW18D1ESS` (10 settings, 51 dB, attached cord) and 24" `DDW2404EBSS` (12 settings, 52 dB, **power cord sold separately**, spare 17476000000137) | on the working wall | OWN / FFE | A550–A556 plan tag; A530 legend; product S3 | **FLAGGED** — nothing distinguishes 18" from 24" by room type | TYPE |
| Appliance | — | Over-the-range microwave — Danby `DOM16A2SSDB`, 1.6 cu.ft, 1000 W, **300 CFM**, vented out or charcoal filter, **mounting brackets included** | wall-mounted, working wall | OWN / FFE | A550 keynote 11 "range-top style microwave affixed to wall" (also A553, A555); product S3 | HIGH on non-accessible types | TYPE |
| Appliance | — | Countertop microwave — Danby `DBMW1126BBS`, 1.1 cu.ft, 900 W, ADA-compliant per cutsheet | accessible types only | OWN / FFE | S3 + E103's accessible load split (700 microwave/hood + 300 range hood vs a single 850) | **ASSUMPTION 85%** — no document states it. Confirm against A551/A552/A554/A556 or the appliance transmittal before any PO | TYPE |
| Appliance | — | Garbage disposer — **480 VA circuit exists on every guestroom panel; no cutsheet in the Drive folder, no disposer in P104** | | PC / EC | E400 / E103 panel schedules | **FLAGGED** — the circuit is real, the product is not sourced | TYPE |
| Appliance | 903 | Television | one per room; **×2 on King One Bedroom and King 1BR Acc.** | OWN / FFE | A550/A553/A554/A555/A556 plan tags; A530 legend `903 TELEVISION` | HIGH | TYPE |
| Appliance | 904 | Clock / radio | | OWN / FFE | A550–A556 plan tags; A530 legend | HIGH | TYPE |
| Low Voltage | 905 | Telephone | **×2 tags on King 1BR Acc. (A554)** | OWN / FFE | A550–A556 plan tags; A530 legend `905 TELEPHONE` | HIGH | TYPE |

> **Closes FF&E gap G-6 and flag F-5.** The 900-series is placed on the architectural set, not legend-only. **`GR-905` is not an item** — A553 flag 1, verbatim: *"The furnishings legend lists 905 = TELEPHONE as a plain number, not as a GR- code… Read as the telephone (905). Do not create a GR-905 line item."* The `GR-905` row in the old FF&E package is deleted.
> **No guestroom coffee maker exists in any source.** No cutsheet, no 900-series tag. The only coffee maker in the set is the FETCO CBS-2152XTS at the breakfast servery (A513/A514), operator-furnished, public space. **Do not put one on a guestroom sheet.**

## 1.5 Doors — common to every guestroom

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| Doors | GR-1 | **Entry door** — type D2 "GUEST ROOM ENTRY", SGL 3'-0"×6'-8"×1 3/4", SC WOOD, frame F1 HM, **20-min rated**, hardware **set #1** | | DR | A600 guestroom schedule | HIGH | TYPE |
| Doors | — | HW set #1: 1 One-Way Viewer (**(2) @ accessible rooms**); 1 Privacy Latch; 1 Door Sweep; 1 Vinyl Threshold; 1 Perimeter Gasketing; 1 Door Closer w/ 90° Stop; 1 **Advance Card Lock**; 1.5 PR Hinges | | DR | A600 hardware sets | HIGH | TYPE |
| Doors | GR-2A | **Bathroom door** — type D1 flush, SGL 3'-0"×6'-8"×1 3/4", SC WOOD, F1 HM, no rating, hardware **set #5** (1 Roller Bumper *only at Optional Acc Q/Q Studio*; 1 Privacy Set; 1.5 PR Hinges) | | DR | A600; tagged on A550/A555 plans | HIGH | TYPE |
| Doors | GR-2B | Bathroom door — identical schedule row to GR-2A, hardware set #5. **A600 schedules both GR-2A and GR-2B with identical values and never states which room type gets which.** | | DR | A600 | **FLAGGED** | TYPE |
| Doors | — | Accessible-route note: *"All doors that are part of an accessible route shall provide a smooth surface within 10" AFF vertically on the push side extending the full width of a swinging door."* | | DR | A600 panel note | HIGH | TYPE |

**Adds by type:** connecting types (§2.2, §2.3, §2.7) add **GR-3**. King One Bedroom types (§2.4, §2.5) add **GR-4**. Rows are in those sections.
**A600 defect carried:** the DOOR FINISH, FRAME FINISH and all three DETAIL columns (HEAD / JAMB / SILL) are `--` on **every row of the whole schedule**. There is no head/jamb/sill detail reference anywhere. → `OPEN_ITEMS` B7.

## 1.6 Fire Sprinkler — guestroom

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| Fire Sprinkler | ◉ | Concealed pendent head, `VK430 7/16 FR 155 C PD`, K=4.3, 1/2" thread, ON DROP — bed / window area, branch 1¼" @ elev 12-8, drop tag "Drop 0-3" | head 1 of 3 | FS | FP-1 read at 700–800 dpi, rooms 107 (QQ) and 108 (King Studio) | HIGH on King Studio + Queen-Queen; **not verified on the other 7 types** | TYPE |
| Fire Sprinkler | ◉ | Same head — living / sofa area, 1¼" @ 12-8, "Drop 0-3" | head 2 of 3 | FS | FP-1 | as above | TYPE |
| Fire Sprinkler | ◉ | Same head — entry / kitchenette leg (outside the bath wall), 1¼" @ **10-8**, "Drop 0-3" | head 3 of 3 | FS | FP-1 | as above | TYPE |
| Fire Sprinkler | — | **Guest bathroom: no head drawn** in either verified room. Recorded as an observation, not an interpretation | | FS | FP-1 | HIGH (observed) | TYPE |

**Do not roll corridor heads into a room sheet** — corridor branch is separate, @ elev 12-0 / 13-4, drop tag "Drop 1-0".
**Standard supersession, carried:** the shop drawing (submittal, top of chain, stamped City of Eagle Pass FD) designs to **NFPA 13 (2021)** + NFPA 24 (2021). `CLAUDE.md`, from the G-series code analysis, says the building is **NFPA 13R**. Under precedence the submittal governs — **the installed system is NFPA 13.** Affects head-omission allowances and the TCO package. Verify against the permit-set G-sheet before quoting either standard formally. → `OPEN_ITEMS` A5.

## 1.7 Fire Alarm — guestroom

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| Fire Alarm | (S)SB | Ceiling smoke detector on low-frequency sounder base — Silent Knight `SKPHOTOW` head in System Sensor `B200S-LF-WH` LF sounder base. Two addresses: SLC (`L#-D-##`) + NAC/power supply (`PS#-#-#`). Located in the main room near the entry/sleeping boundary | 1 of 1 (**2 on the one-bedroom types**) | FA | FA-1 schedule (qty 121/121); FA-2/FA-3 read at 450–500 dpi on 303/305/307/311 (QQ) and 304/306/308 (KS) | HIGH | TYPE |
| Fire Alarm | — | **No horn/strobe, no CO detector, no pull station in a standard key** | | FA | FA-2 / FA-3 | HIGH (observed) | TYPE |
| Fire Alarm | ⊗ | `SCWLED` ceiling strobe @ **177 cd** — bed area | hearing-accessible keys only, 1 of 3 | FA | FA-3, verified rooms 309 and 313 | **FLAGGED — which 12 keys is not extracted** | TYPE |
| Fire Alarm | ⊗ | `SCWLED` ceiling strobe @ **177 cd** — living area | hearing-accessible keys only, 2 of 3 | FA | FA-3 rooms 309/313 | as above | TYPE |
| Fire Alarm | ⊗ | `SCWLED` ceiling strobe @ **15 cd** — guest bathroom (drawn with EOL resistor symbol) | hearing-accessible keys only, 3 of 3 | FA | FA-3 rooms 309/313 | as above | TYPE |

> **Mobility-accessible ≠ hearing-accessible.** Room 317 (King One Bedroom **Accessible**, wheelchair symbol drawn) shows **no strobes at all**; room 309 (plain Queen-Queen) shows three. G100.2 states **12** hearing-accessible keys building-wide. A102 alone draws the symbol in **309, 313, 316, 318**. A101 and A103 were never scanned for it. → `OPEN_ITEMS` A4.
> **Supersession, carried:** conflicts.md B1.9 records that fire-alarm device layout was "deferred to vendor performance design (NFPA 72) — not a device-by-device bill." **The FA-0…FA-3 submittal IS that performance design** and now supplies the device-by-device bill. Anything the E-series says about FA device counts is stale.

## 1.8 Drywall — guestroom (pointers only, no assemblies read)

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| Drywall | W5 | Guestroom demising walls, both sides — **assembly, rating and STC not read** | | GC | A550 / A555 plan tags → A300 | **FLAGGED** | TYPE |
| Drywall | W1 / W1A | Bathroom walls; W1A at the wet/plumbing wall — assembly not read | | GC | A550 / A555 → A300 | **FLAGGED** | TYPE |
| Drywall | W4 | Shower / tub end wall — assembly not read | | GC | A550 / A555 → A300 | **FLAGGED** | TYPE |
| Drywall | KN 32 | **3/4" FRT plywood blocking, full length of object** — placed at the working wall, headboard wall, sofa/art wall, ceiling divider and closet (×3 placements tagged on A550, ×3 on A555) | | GC | A550 / A555 keynote 32 | HIGH | TYPE |
| Drywall | KN 33 | Coordinate blocking with the fixture fabricator | | GC | A550 / A555 keynote 33 | HIGH | TYPE |
| Drywall | KN 8 | **Ceiling-mounted divider, 4'-4" wide — provide blocking as required.** Exists in the QQ and the King Studio; **does not exist in the one-bedroom suites** | | GC | A555 / A550 RCP keynote 8 | HIGH | TYPE |
| Drywall | KN 31 | Ceiling height **8'-3 3/8" is a MINIMUM.** Anything MEP wants below the truss in the main room must clear it | | GC | A550 keynote 31 | HIGH | TYPE |

**A300–A312 have never been read.** Every W-tag above is a pointer, not an assembly. This is the whole Drywall category and it gates paint, wallcovering and flooring. → `OPEN_ITEMS` B1.

---

# §2 — GUESTROOM TYPE BLOCKS

Governing source for every block is the **architectural enlarged guestroom sheet (A550–A556)**, with the RK FF&E sheet (ID-5.x) carried as the design-intent second reading. Where they disagree the A-sheet governs and the ID reading rides in the note. `ID-0.0` general note 3 applies as a standing qualifier to every ID-sourced row: *"This is a design intent drawing, not intended for architectural, engineering or construction use. Shop drawings must be provided to the interior designer for final approval."*

## §2.1 King Studio — `room_type = King Studio` — 57 keys
Governing: **A550 view 01** (KING STUDIO-ARCHITECTURAL PLAN). Design-intent twin: ID-5.1 view 1. Bathroom → §4.1.
Geometry: 12'-8" wide / **12'-0" CLEAR** × **29'-0" CLEAR** deep · bath 6'-3 1/2" · entry/kitchenette leg **6'-0" CLEAR** · window bay 3'-0" / 6'-0" / 3'-0".

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| FF&E - Seating | GR-100 | Ottoman | | FFE | A550 v01; ID-5.1 v1; A530 legend | HIGH | TYPE |
| FF&E - Seating | GR-101 | Sleeper Sofa (keynote 21 marks its extent) | | FFE | A550 v01; ID-5.1 v1 | HIGH | TYPE |
| FF&E - Seating | GR-103 | Task Chair (A530 legend prints "TASK CHAIR"; GR_FFE_Schedule calls it Ergonomic Task Chair) | | FFE | A550 v01 working wall; ID-5.1 v1 | HIGH | TYPE |
| FF&E - Lighting | GR-200 | Side Table Lamp | | FFE | A550 v01; ID-5.1 v1 | HIGH | TYPE |
| FF&E - Lighting | GR-201 | Desk Lamp | | FFE | A550 v01 working wall; ID-5.1 v1 | HIGH | TYPE |
| FF&E - Lighting | GR-202 | Nightstand Sconce | **1 of 2 — right side** | FFE | A550 v01 bed wall (tagged twice) | HIGH | TYPE |
| FF&E - Lighting | GR-202 | Nightstand Sconce | **2 of 2 — left side** | FFE | A550 v01 bed wall (tagged twice) | HIGH | TYPE |
| FF&E - Lighting | GR-204 | Sconce @ Wall Hook (A530 prints "SCONE @WALL HOOK" *sic*) | | FFE | A550 v01 working wall; ID-5.1 v1 | HIGH | TYPE |
| FF&E - Lighting | GR-205 | Floor Lamp (A530 legend: "FLOOR LAMP"; spec: "Floor Lamp @ Guest Suites") | | FFE | A550 v01; ID-5.1 v1 | HIGH | TYPE |
| FF&E - Casegoods | GR-301 | King Headboard | bed 1 of 1 | FFE | A550 v01; ID-5.1 v1 | HIGH | TYPE |
| FF&E - Casegoods | GR-304 | **Working Wall @ King Studio Suite** — full length of the corridor-side wall | | MW | A550 v01; GR_FFE_Schedule (A530 legend collapses GR-304→316 into one "WORKING WALL" row) | HIGH | TYPE |
| FF&E - Casegoods | — | **Working-wall installation sequence, verbatim:** *"LAYOUT AND CONSTRUCTION IS TO START AT REFRIGERATOR HOLD DIMENSION AND PROCEED UP THE WALL FROM THAT END--FINAL INSTALLATION IS SHELF AND ROD AT CLOSET. THESE ARE TO BE SCRIBED AT WALL AS REQUIRED"* | | MW | A550 on-sheet instruction box | HIGH | TYPE |
| FF&E - Casegoods | GR-318 | Sofa Table @ Sofa (A530 legend wording; spec: "Side Table @ Sofa") | | FFE | A550 v01; ID-5.1 v1 | HIGH | TYPE |
| FF&E - Casegoods | GR-319 | Nightstand @ Right | | FFE | A550 v01; ID-5.1 v1 | HIGH | TYPE |
| FF&E - Casegoods | GR-320 | Decorative Shelves above Desk | | MW/FFE | A550 v01 working wall; ID-5.1 v1 | HIGH | TYPE |
| FF&E - Casegoods | GR-323 | Nightstand @ Left | | FFE | A550 v01; ID-5.1 v1 | HIGH | TYPE |
| FF&E - Window | GR-400 | Blackout & Sheer Roller Shade — **manual**. Blackout extends **6" beyond the window opening**; sheer mounts **inside** the opening | | FFE | A550 v01 window wall + keyed note 4 (verbatim) | HIGH | TYPE |
| FF&E - Window | GR-402 | Divider Drapery | | FFE | A550 v01; A530 legend | HIGH | TYPE |
| FF&E - Window | GR-402.1 | Divider Drapery Hardware | | FFE | A550 v01; A530 legend | HIGH | TYPE |
| FF&E - Window | GR-403 | Closet Drapery @ Guest Suite | | FFE | A550 v01 working wall | HIGH | TYPE |
| FF&E - Art / Mirror | GR-500 | Art Above Sofa — **A530 general note I: provide blocking for all wall-mounted items** | | FFE | A550 v01; ID-5.1 v1 | HIGH | TYPE |
| FF&E - Art / Mirror | GR-502 | Full Length Mirror | | FFE | A550 v01 entry/mirror wall | HIGH | TYPE |
| FF&E - Bedding | GR-601 | King Mattress Set | bed 1 of 1 | FFE | A550 v01; ID-5.1 v1 | HIGH | TYPE |
| FF&E - Bedding | GR-601.1 | King Box Spring Cover | bed 1 of 1 | FFE | A550 v01; A530 legend | HIGH | TYPE |
| FF&E - Bedding | GR-603 | King Bed Base | bed 1 of 1 | FFE | A550 v01; ID-5.1 v1 | HIGH | TYPE |
| FF&E - Misc. | GR-325 | **NO DESCRIPTION IN ANY SOURCE — tag only.** Not on A550. Not in the Hilton spec. A530 legend ends at GR-324 | | — | ID-5.1 v1 tag placement only | **FLAGGED — do not purchase against this tag** | TYPE |
| Flooring | CPT-01 | Main Carpet Tile @ Guest Suite (field). *"Refer to product specification for carpet installation pattern"* — the hatch on the finish plan is diagrammatic, do not scale it | | TILE | A550 v03 finish plan; ID-5.1 v3; finish_schedule p.9 (Mohawk-Durkan) | HIGH | TYPE |
| Flooring | CPT-01.1 | Carpet Base @ Guest Suite — 45° mitered corners | | TILE | ID-5.1 finish tag list; finish_schedule p.10 | HIGH | TYPE |
| Flooring | CPT-02 | Accent Carpet Tile @ Guest Suite | | TILE | A550 v03; ID-5.1 v3; finish_schedule p.11 | HIGH | TYPE |
| Flooring | T-01 | Floor Tile @ Guest Suite Entry | | TILE | A550 v03 ("T-01 at bath and entry"); RK clarification §3 | HIGH — RK supersedes the schedule's "etc." to *"Lobby, Guest Suite Entry and Guest Suite Bathroom"* | TYPE |
| Flooring | T-01.1 | Tile Base @ Guest Suite Entry | | TILE | ID-5.1 finish tag list; RK §3 | HIGH | TYPE |
| Flooring | — | **"No finishes under shower"** | | TILE | A550 v03 | HIGH | TYPE |
| Flooring | TL-01.1 | Tile, tag as printed `TL-01.1` — **no TL-01.1 card in the 67-card finish schedule** | | TILE | ID-5.1 finish tag list | **FLAGGED — not normalised to T-01.1** | TYPE |
| Paint | PT-07 | Paint @ Ceiling — main room **8'-3 3/8"**, bath **7'-3"**, entry/kitchenette leg **7'-3"**, all PT-07 | | PT | A550 v02 RCP; finish_schedule p.28 "Ceilings" | HIGH | TYPE |
| Paint | PT-02 | Paint @ wall | | PT | A550 elevations; ID-5.1 finish tag list | MED — ⚠ finish_schedule PT-02 row is OCR-garbled, code inferred from card sequence, area not legible | TYPE |
| Paint | PT-04 | Paint @ Guest Suite Entry Door & Frame | | PT | A550 elevations; finish_schedule p.25 | HIGH | TYPE |
| Paint | PT-01 | Paint — **A550 lists PT-01 on its elevations; no ID-5.x sheet does.** finish_schedule p.22 area = "Guest Suite Window Wall Accent" | | PT | A550 elevation finish codes | MED — sheet and schedule agree on the area but the ID set never prints it | TYPE |
| Paint | PT-03 | Paint — listed on A550 elevations | | PT | A550 elevation finish codes | **FLAGGED** — ⚠ finish_schedule PT-03 row is OCR-garbled, code inferred from card sequence, area "[confirm in source]" | TYPE |
| Paint | PT-077 | Paint, tag as printed `PT-077` — not in the finish schedule; ID-5.1 calls it a "height variant", which is that file's characterisation, not the sheet's | | PT | ID-5.1 finish tag list | **FLAGGED** | TYPE |
| Paint | PT-078 | Paint, tag as printed `PT-078` — as above | | PT | ID-5.1 finish tag list | **FLAGGED** | TYPE |
| Wall Covering | WC-01 | Wallcovering @ Guest Suite Headboard & Sofa | | WC | A550 elevations; ID-5.1; finish_schedule p.60 (MDC) | HIGH | TYPE |
| Stone / Surround | ST-01 | Quartz @ Guest Suite — **window stool sits over the PTAC; sequence stone after PTAC set** | | MW | A550 elevations + GC note; finish_schedule p.41 (Daltile ONE Quartz) | HIGH | TYPE |
| Stone / Surround | PL-01 | Plastic laminate, working wall / casework | | MW | A550 elevations | HIGH | TYPE |
| Stone / Surround | SF-01 | Solid surface, tag as printed — **no SF card in the finish schedule** | | MW | ID-5.1 finish tag list; ID-5.5 elevations | **FLAGGED** | TYPE |
| Stone / Surround | SF-02 | Solid surface, tag as printed — as above | | MW | ID-5.1 finish tag list | **FLAGGED** | TYPE |

> **GR-401 removed from this type.** The old FF&E package carried it FLAGGED. **A550 view 01 tags GR-400 only**, and A550 keyed note 4 states the split verbatim: *"GR-400 IS MANUAL, GR-401 IS MOTORIZED."* GR-401 appears on A551/A552/A554/A556 (the accessible sheets) *instead of* GR-400. Electrical corroborates independently — the 114 VA motorized-shade load appears only on Panel B (accessible) rows of E103. **Flag F-3 is closed: GR-400 on all non-accessible types, GR-401 on all 7 accessible keys.** A motorized shade bought for a non-accessible key has no circuit.

## §2.2 King Studio Connector — `room_type = King Studio Connecting` — 1 key (room 116)
Governing: **A550 view 01.1 (KING STUDIO CONNECTOR)** — a partial plan of the working-wall / entry leg. Bathroom → §4.1.
Connector geometry: overall **30'-1 1/2"**, plus 20'-8 1/2" / 9'-5" / 11'-0". Walls W5 (demising) and W4 (bath end).

**= the full §2.1 King Studio package, plus:**

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| Doors | GR-3 | **Connecting door** — type D1 flush, SGL 3'-0"×6'-8"×1 3/4", SC WOOD, F1 HM, **45-min rated**, hardware **set #3**, remark **a: "PROVIDE (2) DOORS FOR EACH COMMUNICATING DOOR LOCATION"** | pair — 2 leaves | DR | A600 guestroom schedule; A550 v01.1 tag | HIGH | TYPE |
| Doors | — | HW set #3 (Connecting Doors): 2 Wall Stop; **2 Door Guard w/ Privacy Latch to match entry door**; 2 Door Sweeps; 1 Vinyl Threshold; 2 Perimeter Gasketing; **2 Conn. DR Deadbolt; 2 Connecting Latch**; 1 PR Hinges; 2 PR Spring Hinge | | DR | A600 hardware sets | HIGH | TYPE |
| Doors | KN 9 | *"ALTERNATE LOCATION OF DOOR FOR CONNECTING ROOMS TO ACCESSIBLE ROOMS--REFER TO OVERALL PLANS FOR LOCATION OF ACCESSIBLE ROOMS"* | | GC/DR | A550 keyed note 9 on view 01.1 | HIGH | TYPE |
| FF&E - Casegoods | GR-306 | Working Wall @ King Studio Suite Connector — **SUPERSEDES GR-304** for this variant | | MW | ID-5.1 line 31: *"Connector variant (view 1.1) adds: GR-206, GR-306, GR-403"* | MED — **A550 v01.1 does not enumerate a working-wall tag**; only ID-5.1 names GR-306 | TYPE |
| FF&E - Lighting | GR-206 | Table Lamp @ **Accessible** Working Wall — added on the connector variant | | FFE | ID-5.1 line 31 | **FLAGGED** — the Hilton schedule scopes GR-206 to the *accessible* working wall, yet ID-5.1 adds it to a non-accessible connector. A550 does not tag it. Confirm before ordering | TYPE |

> **Citation correction.** The previous package cited "ID-5.1 view 1.1" as a direct read on ~24 rows at HIGH confidence. **ID-5.1.md never enumerates view 1.1's tag list** — line 31 is the entire statement about that view. Those rows are now sourced to **A550 view 01 / 01.1**, which does carry the layout, with the King Studio package inherited to the connector. GR-306, GR-206 and GR-403 remain ID-5.1-line-31 statements and are marked accordingly.
> **Working-wall quantity:** the room-101 field sheet shows a **QQ** connector working wall tagged (x2). Whether a **King Studio** connector also gets 2 units is **not stated on any sheet**. Single instance recorded.

## §2.3 King Studio Accessible — `room_type = King Studio Acc.` — 2 keys (118 `+ mod + connecting`, and 438)
Two sheets exist for two keys: **A551 "KING STUDIO ACC."** and **A552 "KING STUDIO ACC. MOD."** (design-intent twins ID-5.2 and ID-5.3). Bathroom → §4.3.

> **ASSUMPTION (~90%) — which key is which.** A100 prints room **118** as `KING STUDIO ACCESSIBLE MOD CONNECTOR` (the word *Mod*, verbatim, with the ISA symbol drawn). A103 prints room **438** as `KING STUDIO ACCESSIBLE` with **no** Mod and no connector suffix. Only two KS Acc. keys exist, so the assignment closes: **118 = Acc. Mod. → A552 / ID-5.3 / M401 detail 05 / P401 plan 04 · 438 = Acc. → A551 / ID-5.2 / M401 detail 04 / P401 plan 02.** Four packages independently declared this unresolvable; it is not. **Issue one confirming RFI before the shower pan and the tempered-glass enclosure are ordered** — this single answer settles the FF&E sheet, the finish package, the mechanical detail, the plumbing unit plan and the glass/tile buy for both keys. → `OPEN_ITEMS` **Q2**.
> **118 is a connector. 438's connector status is 🚩 FLAGGED — `conflicts.md` B4.4 is OPEN.**
> *(Corrected 2026-08-07 by the canonical-join repair. This paragraph previously read "Both keys are
> connectors … conflicts.md §B4.4 supersedes 438 to King Studio Accessible Connector." **B4.4 does not
> supersede it — B4.4 explicitly leaves the connector question open**, and only Austin closes a conflict.)*
>
> | Position | Says | Source |
> |---|---|---|
> | **438 IS a connector** | connector | the Drive *Special Changes* correction (`RM 438 Changed to King Studio Accessible Connector.jpg`); **A100's Guestroom Matrix** `King Studio ACC, HA, **CD**` on floor 4 (CD = Connecting Door); A103 records 436 (QQ Connector) as adjoining 438; E400 detail 02 titled *"King Studio Acc. Conn."*; A551 tags door GR-3 with keynote 9 |
> | **438 is NOT a connector** | no connector | **A103 prints `KING STUDIO ACCESSIBLE` and nothing else** — and the same architect prints the full `KING STUDIO ACCESSIBLE MOD CONNECTOR` on 118, so he knows how to say it; **G001's matrix prints `King ACC, HA` on floor 4 with no CD** (`conflicts.md` **A11**) |
>
> **Neither position is adopted. `conflicts.md` B4.4 · A11.** The GR-3 row below is emitted for **118 at
> HIGH** and for **438 at FLAGGED — do not buy 438's connecting-door set on this row.**
>
> ⚠ **"King Studio Accessible Connector" is NOT a `room_type`.** No such row exists in `room_map.md`'s unit
> matrix. Both keys join as **`King Studio Acc.`**; connector and MOD are per-room booleans.

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| FF&E - Seating | GR-100 | Ottoman | | FFE | A551 + A552; ID-5.2 + ID-5.3 | HIGH | TYPE |
| FF&E - Seating | GR-101 | Sleeper Sofa | | FFE | A551 + A552 | HIGH | TYPE |
| FF&E - Seating | GR-103 | Task Chair | | FFE | A551 + A552 | HIGH | TYPE |
| FF&E - Lighting | GR-200 | Side Table Lamp | | FFE | A551 + A552 (both tag it) | HIGH — upgraded; ID-5.3 omitted it, the architectural twin does not | TYPE |
| FF&E - Lighting | GR-201 | Desk Lamp | | FFE | A551 + A552 | HIGH | TYPE |
| FF&E - Lighting | GR-202 | Nightstand Sconce | | FFE | A551 + A552 | HIGH | TYPE |
| FF&E - Lighting | GR-205 | Floor Lamp | | FFE | A551 + A552 | HIGH | TYPE |
| FF&E - Lighting | GR-206 | Table Lamp @ Accessible Working Wall | | FFE | A551 line 120 / A552 line 110 accessible-substitutions list; ID-5.2 + ID-5.3 | HIGH | TYPE |
| FF&E - Lighting | GR-208 | Nightstand Sconce @ QQ Side — **tagged on A552, a King sheet** | | FFE | A552 "Other FF&E tagged" | **FLAGGED** — GR-208 is the Queen-Queen outboard sconce (A555/A556). Its appearance on the KS Acc. Mod. sheet is unexplained. Not normalised, not dropped | TYPE |
| FF&E - Casegoods | GR-301 | King Headboard | bed 1 of 1 | FFE | A551 + A552 | HIGH | TYPE |
| FF&E - Casegoods | GR-307 | **Working Wall @ King Studio Suite Accessible** — lowered counter, knee clearance at the desk. **SUPERSEDES GR-304** | | MW | A551 + A552; GR_FFE_Schedule (not in the A530 legend, which collapses GR-304→316) | HIGH | TYPE |
| FF&E - Casegoods | GR-318 | Sofa Table @ Sofa | | FFE | A551 + A552 (both tag it) | HIGH — upgraded; ID-5.3 omitted it | TYPE |
| FF&E - Casegoods | GR-319 | Nightstand @ Right | | FFE | A551 + A552 | HIGH | TYPE |
| FF&E - Casegoods | GR-320 | Decorative Shelves above Desk | | MW/FFE | A552; ID-5.2 + ID-5.3 | HIGH | TYPE |
| FF&E - Casegoods | GR-323 | Nightstand @ Left | | FFE | A551 + A552 | HIGH | TYPE |
| FF&E - Window | GR-401 | **Motorized Roller Shade — NOT GR-400** | | FFE/EC | A551 line 47 verbatim *"GR-401 MOTORIZED ROLLER SHADE (not GR-400)"*; A552 line 51 | HIGH | TYPE |
| FF&E - Window | — | Motorized shade coordination: **power at the head, blocking at the head, and a switch inside the accessible reach range** (keynote 35 refers to the FF&E manual for shade switching). Three trades, one detail | | EC/GC/FFE | A552 line 133 | HIGH | TYPE |
| FF&E - Window | GR-404 | ADA Closet Drapery @ Guest Suite — **SUPERSEDES GR-403** | | FFE | A551 + A552; A530 legend | HIGH | TYPE |
| FF&E - Window | GR-405 | ADA Divider Drapery — **SUPERSEDES GR-402** | | FFE | A552 line 51; A551 line 120; GR_FFE_Schedule | HIGH — **not** in the A530 legend, which stops at GR-404 | TYPE |
| FF&E - Window | GR-402.1 | Divider Drapery Hardware | | FFE | A552 line 51; Guestroom_FFE_by_Room ID-5.2/5.3 | HIGH | TYPE |
| FF&E - Window | GR-403.ADA | **tag exactly as printed.** No GR-403.ADA exists in the Hilton schedule or the A530 legend | | FFE | ID-5.2.md / ID-5.3.md tag lists | **FLAGGED — not normalised to GR-404.** GR_FFE_Schedule *advises* reading it as the ADA closet-drapery variant; advice is not a correction, and it is not applied | TYPE |
| FF&E - Window | GR-4011 | **tag exactly as printed** on ID-5.3, one instance. Not in any schedule or legend | | FFE | ID-5.3.md; Guestroom_FFE_by_Room ID-5.3 | **FLAGGED** — ID-5.3 speculates it is GR-401 misread on a dense plan. Not normalised. Verify against the source PDF | TYPE |
| FF&E - Art / Mirror | GR-500 | Art Above Sofa | | FFE | A551 + A552 | HIGH | TYPE |
| FF&E - Art / Mirror | GR-502 | Full Length Mirror | | FFE | A551 (A552 does not list it) | MED | TYPE |
| FF&E - Art / Mirror | CUST-GR-503 | **tag exactly as printed.** GR_FFE_Schedule reads it as a custom version of GR-503 (Art Above Dining Table @ One Bedroom Suite) | | FFE | ID-5.2.md, ID-5.3.md | **FLAGGED** — custom ⇒ Hilton Design Review approval + long lead. Also odd: GR-503 is scoped to the One Bedroom Suite and this is a King Studio. Not on A551/A552. Do not assume the base GR-503 product | TYPE |
| FF&E - Bedding | GR-601 | King Mattress Set | bed 1 of 1 | FFE | A551 + A552 | HIGH | TYPE |
| FF&E - Bedding | **GR-603.ADA** | **King ACCESSIBLE Bed Base — replaces the standard GR-603** | bed 1 of 1 | FFE | A551 line 49 + line 120; A552 line 53 + line 110; A530 legend `GR-603.ADA KING ACCESSIBLE BED BASE` | HIGH | TYPE |
| FF&E - Bedding | GR-603.1 | King Bed Skirt | bed 1 of 1 | FFE | A551 line 49; A552 line 53; A530 legend | HIGH — upgraded from MED, the architectural set places it | TYPE |
| FF&E - Bedding | GR-601.1 | King Box Spring Cover | bed 1 of 1 | FFE | Guestroom_FFE_by_Room ID-5.2 only | MED — single extraction pass; A551/A552 do not list it | TYPE |
| FF&E - Misc. | GR-325 | NO DESCRIPTION IN ANY SOURCE — tag only | | — | ID-5.2 + ID-5.3 | **FLAGGED** | TYPE |
| FF&E - Misc. | GR-326 | NO DESCRIPTION IN ANY SOURCE — tag only. Appears **only** on the two accessible King Studio sheets. A530 legend ends at GR-324 | | — | ID-5.2 + ID-5.3 | **FLAGGED — do not purchase against this tag** | TYPE |
| Doors | GR-3 | Connecting door — 45-min, HW set #3, remark a (2 doors per communicating location). **Applies to both KS Acc. keys** | pair — 2 leaves | DR | A551 line 41 + A552 line 45 (door GR-3 with keynote 9); A600 | HIGH | TYPE |
| Flooring / Paint / WC / Stone | — | Same guestroom palette as §2.1 — CPT-01 / CPT-01.1 / CPT-02, T-01 / T-01.1, TL-01.1, WC-01, PT-02 / PT-04 / PT-07, ST-01, SF-01 / SF-02. Each code carries its §2.1 flags | | TILE/PT/WC/MW | ID-5.2 verbatim: *"Same guestroom palette as ID-5.1"* | MED — asserted as palette equality, not listed per space | TYPE |
| Flooring | T-02 | **Floor Tile @ ADA Roll-In Shower** — the only finish difference ID-5.3 states vs ID-5.2 | roll-in configuration only | TILE | ID-5.3 finish plan; A552 line 74 `T-02 ROLL-IN SHOWER TILE`; finish_schedule pp.46/47 | HIGH on the Acc. Mod. key | TYPE |
| Flooring | — | **"NO FINISHES UNDER SHOWER PAN"** | | TILE | A551 line 73 | HIGH | TYPE |

**GR-603.ADA closes gap G-5.** The old package stated GR-602.ADA/GR-603.ADA were "in the A530 legend but tagged nowhere" and emitted the standard GR-603. **A551, A552, A554 and A556 all tag the ADA bases explicitly.** 7 accessible keys, long-lead single-line items — flag to procurement now.

## §2.4 King One Bedroom — `room_type = King One Bedroom` — 3 keys (202, 302, 402)
Governing: **A553** (plans + elevations). Design-intent twin: ID-5.4 + ID-5.5. Bathroom → §4.2.

**= the §2.1 King Studio FF&E set, with these differences:**

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| FF&E - Casegoods | GR-315 | **Working Wall @ King One Bedroom Suite — tagged TWICE (both ends of the run).** SUPERSEDES GR-304 | | MW | A553 line 50; GR_FFE_Schedule | HIGH | TYPE |
| FF&E - Casegoods | GR-317 | Dining Table @ One Bedroom Suite | | FFE | A553 line 52; A530 legend | HIGH | TYPE |
| FF&E - Seating | GR-102 | Dining Chair @ One Bedroom Suite | chair 1 of 2 | FFE | A553 line 52 — **quantity notation printed on the sheet as "2X"** | HIGH | TYPE |
| FF&E - Seating | GR-102 | Dining Chair @ One Bedroom Suite | chair 2 of 2 | FFE | A553 line 52 ("2X") | HIGH | TYPE |
| FF&E - Art / Mirror | GR-503 | Art Above Dining Table @ One Bedroom Suite | | FFE | A553 line 52; ID-5.5 elevations (blue dashed art panels); A530 legend | HIGH | TYPE |
| FF&E - Window | GR-400 | Blackout & Sheer Roller Shade (manual) | **window 1 of 2** | FFE | A553 line 55 + line 111, verbatim *"(×2 — one per window)"* | HIGH | TYPE |
| FF&E - Window | GR-400 | Blackout & Sheer Roller Shade (manual) | **window 2 of 2** | FFE | A553 line 55 + line 111 | HIGH | TYPE |
| FF&E - Lighting | GR-202 | Nightstand Sconce | 1 of 2 | FFE | A553 line 55 "GR-202 nightstand sconce (×2)" | HIGH | TYPE |
| FF&E - Lighting | GR-202 | Nightstand Sconce | 2 of 2 | FFE | A553 line 55 | HIGH | TYPE |
| Appliance | 903 | Television | **1 of 2 — living room** | OWN/FFE | A553 line 51 + 110, verbatim *"903 television (tagged twice — one TV in each room)"* | HIGH | TYPE |
| Appliance | 903 | Television | **2 of 2 — bedroom** | OWN/FFE | A553 line 51 + 110 | HIGH | TYPE |
| Doors | GR-4 | **Bedroom door** — type D1 flush, SGL 3'-0"×6'-8"×1 3/4", SC WOOD, F1 HM, no rating, hardware **set #4** (1 Wall Stop; 1 Privacy Set; 1.5 PR Hinges) | | DR | A600 guestroom schedule | HIGH — the only guestroom type with an interior bedroom door | TYPE |
| FF&E - Bedding | GR-601 · GR-601.1 · GR-603 | King mattress set · king box spring cover · king bed base | bed 1 of 1 | FFE | A553 line 55 | HIGH | TYPE |
| Paint | PT-07 | Paint @ Ceiling **8'-3 3/8" AFF in BOTH the bedroom and the living room** | | PT | A553 / ID-5.4 RCP | HIGH | TYPE |
| Drywall | KN 8 | **The ceiling-mounted divider does NOT exist in the one-bedroom suites** | | GC | A555 GC note (explicit) | HIGH | TYPE |
| Stone / Surround | OPT-01.1 | Tag as printed `OPT-01.1` — **no OPT card in the finish schedule** | | MW | ID-5.5 wall finishes | **FLAGGED** — project.md names "OPT optional" as a family; category placement uncertain, could be an alternate for TL-01.1. Do not order against this tag | TYPE |
| Stone / Surround | ST-01 | **NOT listed on ID-5.4 / ID-5.5** although it appears on every other guestroom sheet | | MW | — | **FLAGGED — gap, not an omission by choice.** Not assumed present | TYPE |
| FF&E - Casegoods | GR-301 | King Headboard | bed 1 of 1 | FFE | **A553 does not tag it and neither does ID-5.4**; the accessible twin A554 does | **FLAGGED** — the suite has a king bed set (GR-601/GR-603) so a headboard exists physically. Missing tag, not a missing headboard. **Not added silently** | TYPE |

**Removed from this type:**
- **GR-401** — A553 lines 55 and 111 tag **GR-400 only**, twice. Flag F-3 closed for this type.
- **GR-600 (Queen Mattress Set)** — appeared in ID-5.4.md's tag list but not in the by-room pass, and **A553 does not carry it**. On a suite with a king bed, the architectural set settles it: **the row is dropped.** Recorded in `OPEN_ITEMS` D3 so it is not silently lost.
- **GR-905** — A553 flag 1 is explicit: read as **905 telephone**. Do not create a GR-905 line item. See §1.4.

## §2.5 King One Bedroom Accessible — `room_type = King One Bedroom Acc.` — 3 keys (217, 317, 417)
Governing: **A554** (plans + elevations). Design-intent twin: ID-5.6 + ID-5.7. Bathroom → §4.4.

**= the §2.4 King One Bedroom set, with these accessible substitutions:**

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| FF&E - Casegoods | GR-316 | **Working Wall @ King One Bedroom Suite Accessible — tagged TWICE.** SUPERSEDES GR-315 | | MW | A554 line 52 + 118; GR_FFE_Schedule | HIGH | TYPE |
| FF&E - Casegoods | GR-303 | **Accessible Vanity @ Guest Bath** — SUPERSEDES GR-302 | | MW | A554 line 51 + 118; A530 legend | HIGH — upgraded from MED; flag F-4 said it was "never placed on the architectural set", A554 places it | TYPE |
| FF&E - Casegoods | GR-324 | **Wall Shelf @ Accessible Bathroom** — SUPERSEDES GR-321 | | MW | A554 line 51 verbatim *"GR-324 accessible wall shelf"* + line 118; A530 legend | HIGH — upgraded. **Identity resolved 2:1**: A554 and ID-5.13 both call it a wall shelf; ID-5.12 calls it a grab-bar accessory package and is outvoted | TYPE |
| FF&E - Window | GR-401 | **Motorized Roller Shade at BOTH windows** | **window 1 of 2** | FFE/EC | A554 line 53 verbatim *"GR-401 motorized roller shade at both windows"*; line 76 keynote 49 *"(hardwired blackout roller shade with no exposed wires, ×2)"*; line 140 *"six motorized shades (two per key)"* | HIGH | TYPE |
| FF&E - Window | GR-401 | Motorized Roller Shade | **window 2 of 2** | FFE/EC | A554 lines 53 / 76 / 140 | HIGH | TYPE |
| FF&E - Window | — | Shade coordination: **hardwired, no exposed wires**; blocking + J-box + accessible-reach switch **at the head, before drywall** | | EC/GC | A554 keynote 49 | HIGH | TYPE |
| FF&E - Window | GR-404 | ADA Closet Drapery @ Guest Suite — SUPERSEDES GR-403 | | FFE | A554 line 53 + 118; A530 legend | HIGH | TYPE |
| FF&E - Window | GR-403.ADA | **tag exactly as printed.** No GR-403.ADA in the schedule or the A530 legend. Appears on the same sheet as GR-404 | | FFE | ID-5.6.md tag list | **FLAGGED — both carried, not normalised** | TYPE |
| FF&E - Bedding | **GR-603.ADA** | **King ACCESSIBLE Bed Base** — replaces GR-603 | bed 1 of 1 | FFE | A554 line 54 + 118; A530 legend | HIGH | TYPE |
| FF&E - Bedding | GR-603.1 | King Bed Skirt | bed 1 of 1 | FFE | A554 line 54; A530 legend | HIGH | TYPE |
| FF&E - Bedding | GR-601 | King Mattress Set | bed 1 of 1 | FFE | A554 line 54 | HIGH — upgraded from MED; ID-5.6.md's own list omitted it, A554 carries it | TYPE |
| FF&E - Casegoods | GR-301 | King Headboard | bed 1 of 1 | FFE | A554 line 54; Guestroom_FFE_by_Room ID-5.6 | HIGH — upgraded. **Note rewritten:** the earlier note claimed it was missing only from the non-accessible twin; in fact ID-5.6's own casegoods list also omitted it and only the by-room pass carried it. A554 settles it | TYPE |
| FF&E - Lighting | GR-202 | Nightstand Sconce | 1 of 2 | FFE | A554 line 60 "GR-202 nightstand sconce (×2)" | HIGH | TYPE |
| FF&E - Lighting | GR-202 | Nightstand Sconce | 2 of 2 | FFE | A554 line 60 | HIGH | TYPE |
| Low Voltage | 905 | Telephone | **×2 tags** | OWN/FFE | A554 line 60 "905 telephone (×2 tags)" | HIGH | TYPE |
| Appliance | 903 | Television | 1 of 2 / 2 of 2 — one per room | OWN/FFE | A554 line 62 | HIGH | TYPE |
| FF&E - Art / Mirror | GR-503 | Art Above Dining Table — **ID-5.7 notes accessible mounting heights must be verified for art, TV and sconces** | | FFE | A554 line 58; ID-5.6/5.7 | HIGH | TYPE |
| Doors | GR-4 | Bedroom door, HW set #4 | | DR | A600 | HIGH | TYPE |
| FF&E - Misc. | GR-325 | NO DESCRIPTION — tag only | | — | ID-5.6 v1 | **FLAGGED** | TYPE |

**Three keys. Everything on A554 is a three-off** — accessible working wall GR-316, accessible vanity GR-303, accessible wall shelf GR-324, **six motorized shades**, ADA closet drapery, three GR-603.ADA bases. All small-quantity long-lead.

## §2.6 QQ Studio — `room_type = Queen-Queen` (31) + `QQ Wide` (2: rooms 201, 301) — 33 keys
Governing: **A555 view 01**. Design-intent twin: ID-5.8 view 1. Bathroom → §4.1.
Geometry: **12'-8" wide / 12'-0" CLEAR × 37'-6 1/2" deep / 36'-5" CLEAR** · bath 6'-3 1/2" · window bay 3'-0" / 6'-0".

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| FF&E - Casegoods | GR-300 | Queen Headboard | **bed 1 of 2** | FFE | A555 line 66 "×2"; room-101 field sheet lists GR-300 twice | HIGH | TYPE |
| FF&E - Casegoods | GR-300 | Queen Headboard | **bed 2 of 2** | FFE | A555 line 66 "×2" | HIGH | TYPE |
| FF&E - Bedding | GR-600 | Queen Mattress Set | **bed 1 of 2** | FFE | A555 line 66 "×2" | HIGH | TYPE |
| FF&E - Bedding | GR-600 | Queen Mattress Set | **bed 2 of 2** | FFE | A555 line 66 "×2" | HIGH | TYPE |
| FF&E - Bedding | GR-600.1 | Queen Box Spring Cover (field sheet calls it "Q Bedwrap") | **bed 1 of 2** | FFE | A555 line 66 "×2"; A530 legend | HIGH | TYPE |
| FF&E - Bedding | GR-600.1 | Queen Box Spring Cover | **bed 2 of 2** | FFE | A555 line 66 "×2" | HIGH | TYPE |
| FF&E - Bedding | GR-602 | Queen Bed Base | **bed 1 of 2** | FFE | A555 line 66 "×2" | HIGH | TYPE |
| FF&E - Bedding | GR-602 | Queen Bed Base | **bed 2 of 2** | FFE | A555 line 66 "×2" | HIGH | TYPE |
| FF&E - Bedding | — | *"Ensure center supports are provided as necessary per vendor recommendation"* — coordinate bed centre-support blocking | | GC/FFE | ID-5.8 key note | HIGH | TYPE |
| FF&E - Lighting | GR-207 | **Nightstand Sconce @ Queen Queen CENTER** — between the beds | | FFE | A555 line 67; A530 legend | HIGH | TYPE |
| FF&E - Lighting | GR-208 | **Nightstand Sconce @ Queen Queen SIDE** — outboard | **1 of 2** | FFE | A555 line 67 "×2 (outboard)"; A530 legend; GR_FFE_Schedule | HIGH — **closes gap G-2**, which claimed GR-208 was tagged on no sheet | TYPE |
| FF&E - Lighting | GR-208 | Nightstand Sconce @ Queen Queen Side | **2 of 2** | FFE | A555 line 67 "×2" | HIGH | TYPE |
| FF&E - Casegoods | GR-322 | Nightstand @ Queen Queen | | FFE | A555 line 67; A530 legend | HIGH | TYPE |
| FF&E - Casegoods | GR-319 | Nightstand @ Right | | FFE | ID-5.8 v1; room-101 field sheet | HIGH | TYPE |
| FF&E - Casegoods | GR-323 | Nightstand @ Left | | FFE | ID-5.8 v1; room-101 field sheet | HIGH | TYPE |
| FF&E - Casegoods | GR-305 | Working Wall @ Queen Queen Studio Suite | | MW | ID-5.8 v1; GR_FFE_Schedule | **FLAGGED — see the working-wall conflict below** | TYPE |
| FF&E - Casegoods | GR-308 | Working Wall @ Queen Queen Studio Suite **Connector** — **tagged on A555's base QQ plan, not only on the connector view** | | MW | A555 line 70 + flag 2 | **FLAGGED — same conflict** | TYPE |
| FF&E - Seating | GR-100 | Ottoman | | FFE | A555 line 70; ID-5.8 v1 | HIGH | TYPE |
| FF&E - Seating | GR-101 | Sleeper Sofa | | FFE | A555 line 70 | HIGH | TYPE |
| FF&E - Seating | GR-103 | Task Chair | | FFE | A555 line 70 | HIGH | TYPE |
| FF&E - Lighting | GR-200 | Side Table Lamp | | FFE | A555 line 70 | HIGH | TYPE |
| FF&E - Lighting | GR-201 | Desk Lamp | | FFE | A555 line 70 | HIGH | TYPE |
| FF&E - Lighting | GR-202 | Nightstand Sconce | | FFE | ID-5.8 v1; room-101 field sheet | HIGH | TYPE |
| FF&E - Lighting | GR-204 | Sconce @ Wall Hook | | FFE | A555 line 70 | HIGH | TYPE |
| FF&E - Lighting | GR-205 | Floor Lamp | | FFE | A555 line 70 | HIGH | TYPE |
| FF&E - Casegoods | GR-318 | Sofa Table @ Sofa | | FFE | A555 line 70 | HIGH | TYPE |
| FF&E - Casegoods | GR-320 | Decorative Shelves above Desk | | MW/FFE | ID-5.8 v1 | MED — tagged on ID-5.8; **A555's working-wall list does not carry it** | TYPE |
| FF&E - Window | GR-400 | Blackout & Sheer Roller Shade (manual). Blackout 6" beyond opening, sheer inside | | FFE | A555 line 70 + line 80; keyed note 4 | HIGH | TYPE |
| FF&E - Window | GR-402 | Divider Drapery | | FFE | A555 line 70 | HIGH | TYPE |
| FF&E - Window | GR-402.1 | Divider Drapery Hardware | | FFE | A555 line 70 | HIGH | TYPE |
| FF&E - Window | GR-403 | Closet Drapery @ Guest Suite | | FFE | A555 line 70 | HIGH | TYPE |
| FF&E - Art / Mirror | GR-500 | Art Above Sofa | | FFE | A555 line 70 | HIGH | TYPE |
| FF&E - Art / Mirror | GR-502 | Full Length Mirror | | FFE | A555 line 70 | HIGH | TYPE |
| FF&E - Misc. | GR-325 | NO DESCRIPTION — tag only. Not on A555, not on the room-101 field sheet | | — | ID-5.8 v1 | **FLAGGED** | TYPE |
| Drywall | KN 8 | **Ceiling-mounted divider, 4'-4" wide** — separates the two-bed zone from the seating zone. Blocking in the ceiling **before the drywall lid** | | GC | A555 v02 RCP keynote 8 | HIGH | TYPE |
| Paint | PT-07 | Ceiling — main room **8'-3 3/8"**, bath **7'-3"**, entry/kitchenette leg **7'-3"** | | PT | A555 v02 RCP | HIGH | TYPE |
| Flooring / Paint / WC / Stone | — | Palette: CPT-01 + CPT-02 field, T-01 bath and entry, CPT-01.1, T-01.1, TL-01.1 (flagged), WC-01, PT-01 / PT-02 / PT-03 / PT-04 / PT-07 / PT-077 / PT-078 (flagged), PL-01, ST-01, SF-01 / SF-02 (flagged) | | TILE/PT/WC/MW | A555 v03 finish plan + elevation finish codes; ID-5.8 verbatim *"Same guestroom palette as the King sheets"* | MED on palette equality; individual codes carry their §2.1 flags | TYPE |
| Doors | GR-1 / GR-2A | Entry door / bath door — tagged on A555 view 01 | | DR | A555 door designations; A600 | HIGH | TYPE |

> **The QQ working-wall conflict — three placements of GR-308, one of them here.** `GR_FFE_Schedule` defines **GR-308 as "Working Wall @ Queen Queen Studio Suite *Connector*"**, and **GR-305** as the standard QQ working wall. But **A555 tags GR-308 on the base QQ plan** (line 70) and **A556 tags GR-308 on the accessible QQ plan** (line 50). A555's own flag 2 states the problem: *"Either the code is being used generically for the QQ working wall or one of the three placements is wrong. Unresolved."* **Both GR-305 and GR-308 are carried as FLAGGED rows on this type. Do not order two working walls for one room.** → `OPEN_ITEMS` **A1**.
> **GR-401 removed from this type** — A555 lines 70 and 80 tag GR-400 only. The room-101 field sheet also lists only GR-400. Flag F-3 closed.

## §2.7 QQ Studio Connector — `room_type = QQ Connecting` (6: 103, 215, 236, 336, 403, 436) + `QQ Wide Connecting` (2: rooms 101, 401) — 8 keys
Governing: **A555 view 01.1 "QQ STUDIO CONN. ARCHITECTURAL PLAN"** + separate electrical plan **view 04.1**. Design-intent twin: ID-5.8. Bathroom → §4.1.
Connector geometry: bathroom leg **11'-6"**. Walls W4 and W5.

**= the full §2.6 Queen-Queen package, plus:**

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| Doors | GR-3 | **Connecting door** — D1, SGL 3'-0"×6'-8"×1 3/4", SC WOOD, F1 HM, **45-min**, hardware **set #3**, remark **a: provide (2) doors for each communicating door location** | pair — 2 leaves | DR | A555 view 01.1 door designation; A600 | HIGH | TYPE |
| Doors | — | HW set #3 as §2.2. **The room-101 field sheet carries a standing deficiency line for the connecting-door lock** — set #3's `2 Conn. DR Deadbolt` + `2 Connecting Latch` + `2 Door Guard w/ Privacy Latch to Match Entry Door` is the hardware behind it | | DR | A600; room-101 field sheet | HIGH | TYPE |
| FF&E - Casegoods | GR-308 | Working Wall @ Queen Queen Studio Suite **Connector** — **ONE row per key.** The room-101 field sheet prints the same item as **`GR-308R` (x2)**; the `R` suffix exists in no document in the context set and the spec legend runs GR-304→GR-316 with no suffix | **quantity unresolved: sheet tags it once, field sheet prints (x2)** | MW | A555 line 70 + view 01.1; ID-5.8 line 19; GR_FFE_Schedule. Field spelling from the room-101 field sheet | **FLAGGED** | TYPE |

> **Working-wall row collapsed — this was a CRITICAL defect.** The previous package emitted **three** working-wall rows for one room: GR-308, GR-308R unit 1 of 2, GR-308R unit 2 of 2. That is a quantity invented by stacking two sources describing the same physical item. **ID-5.8 line 19 tags GR-308 once with no count; no file anywhere in the context set contains the string `GR-308R`** — its only source is text pasted into a task brief, which is not an openable document. **One row. Both spellings on the row. The (x2) is raised as an RFI, not emitted as rows.** If the (x2) is real it is two rows, never three. → `OPEN_ITEMS` **A1**.
> **Room 101 is a legitimate source for this type.** A100 numbers 101 `QUEEN QUEEN WIDE CONNECTOR`, and an earlier verifier demanded the field data be moved to QQ Wide Connecting on that basis. **Under OV-001 room 101 IS a QQ Studio Connector** — exactly what the field sheet is headed — so the data belongs here and moving it would inject the error. Field-sheet-only observations are marked `ROOM`, scoped to 101, and are never scaled to the other 7 keys.

**Room-101 field observations (Gran = ROOM, scoped to room 101 only, not type rules):**
GR-400, GR-202, GR-319, GR-300 ×2, GR-600 ×2, GR-600.1 ×2, GR-602 ×2, GR-207, GR-322, GR-323, GR-402, GR-402.1, GR-205, GR-101, GR-500, GR-200, GR-318, GR-502, GR-403, GR-100, **GR-308R ×2**, GR-103, GR-201, GR-204, connecting-door lock.
Tagged on ID-5.8 but **absent** from the field sheet: GR-320, GR-325, GR-401.

## §2.8 QQ Extended — `room_type = QQ Extended` — 6 keys (230, 232, 330, 332, 430, 432)
Governing: **A555 view 01** — the SAME plan as §2.6, with the extended depth carried as an **alternate dimension string tagged "@QQ EXT"**: **39'-10 1/4" deep / 38'-9" CLEAR** against the standard 37'-6 1/2" / 36'-5". Bathroom → §4.1.

**= the full §2.6 Queen-Queen package, at MED confidence throughout.**

A555 states the situation plainly (line 154, verbatim): *"The QQ Wide and QQ Ext variants are dimension strings on a standard plan, not separate drawings. The FF&E, finish and MEP layouts are drawn once."* **That closes gap G-3** — the earlier package said Extended-specific FF&E was "invisible in this set"; A555 says affirmatively that there is none drawn, which is a different and better answer.

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| — | — | Every §2.6 row applies | | | A555 (one plan covers QQ Std / QQ Ext); ID-5.8 title block "QQ Std., QQ Ext., & QQ Std. Conn." | MED | DERIVED |
| Plumbing | SK-3 / SK-4 | Kitchenette / wet-bar sink — **MED here** (QQ Ext is one of the "suite/extended units" P401/P402 names) rather than FLAGGED as on the standard QQ | | PC | P401 + P402 | MED | TYPE |
| FF&E - Window | GR-400 | Blackout & Sheer Roller Shade — **an Extended unit is 2'-3 3/4" deeper; whether the window count changes is not drawn.** One row emitted | | FFE | A555 v01 | MED — **do not assume one shade without checking the bay** | TYPE |

**Field action:** *"Mark the variant rooms on the floor plan before layout and confirm which dimension governs each"* (A555, verbatim). A crew reading only the 37'-6 1/2" string will build a standard room in an extended bay.

## §2.9 QQ Accessible — `room_type = QQ Acc.` — 2 keys (238, 338)
Governing: **A556**. Design-intent twin: ID-5.9. Bathroom → §4.3.
**This is the only accessible room type with two beds.** Across the 2 keys: **four GR-602.ADA bases, four GR-600 mattress sets, four GR-300 headboards.** A takeoff that treats accessible rooms as single-bed undercounts by half.

**= the §2.6 Queen-Queen package, with these accessible substitutions:**

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| FF&E - Bedding | **GR-602.ADA** | **Queen ACCESSIBLE Bed Base** — replaces GR-602 | **bed 1 of 2** | FFE | A556 line 52 + line 117 *"GR-602.ADA queen accessible bed bases (×2)"*; A530 legend | HIGH | TYPE |
| FF&E - Bedding | **GR-602.ADA** | Queen Accessible Bed Base | **bed 2 of 2** | FFE | A556 line 52 + 117 | HIGH | TYPE |
| FF&E - Bedding | GR-600 | Queen Mattress Set | bed 1 of 2 / bed 2 of 2 | FFE | A556 line 52 "×2" | HIGH | TYPE |
| FF&E - Casegoods | GR-300 | Queen Headboard | bed 1 of 2 / bed 2 of 2 | FFE | A556 line 52 "×2" | HIGH | TYPE |
| FF&E - Bedding | GR-602.1 | Queen Bedskirt | | FFE | Guestroom_FFE_by_Room ID-5.9 | MED — single extraction pass; A556 does not list it | TYPE |
| FF&E - Casegoods | GR-303 | **Accessible Vanity @ Guest Bath** — SUPERSEDES GR-302 | | MW | A556 line 49 + 117; A530 legend | HIGH — upgraded, F-4 partly closed | TYPE |
| FF&E - Casegoods | GR-309 | Working Wall @ Queen Queen Studio Suite Accessible — SUPERSEDES GR-305 | | MW | ID-5.9 v1; GR_FFE_Schedule | MED — **A556 does not tag GR-309; it tags GR-308** (see below) | TYPE |
| FF&E - Casegoods | GR-308 | Working Wall @ QQ Studio Suite **Connector** — tagged on this **accessible** plan | | MW | A556 line 50 + flag 3 | **FLAGGED** — a connector item on an accessible room. Third of three contested GR-308 placements → `OPEN_ITEMS` **A1** | TYPE |
| FF&E - Window | GR-401 | **Motorized Roller Shade — NOT GR-400.** Window bay split 7'-1" / **6'-0" (GR-401)** / 3'-9 1/4" | | FFE/EC | A556 line 36 + line 51 verbatim *"(not GR-400)"* + line 117 | HIGH | TYPE |
| FF&E - Window | GR-404 | ADA Closet Drapery @ Guest Suite — SUPERSEDES GR-403 | | FFE | A556 line 51 + 117; A530 legend | HIGH | TYPE |
| FF&E - Window | GR-403 | Closet Drapery @ Guest Suite — **A556 tags GR-403 AND GR-404 on the same accessible sheet** | | FFE | A556 line 51; ID-5.9.md tag list | **FLAGGED** — do not assume one replaces the other. The by-room extraction lists GR-404 only | TYPE |
| FF&E - Window | GR-405 | ADA Divider Drapery — SUPERSEDES GR-402 | | FFE | Guestroom_FFE_by_Room ID-5.9; GR_FFE_Schedule | MED — not in the A530 legend, not tagged on A556 | TYPE |
| FF&E - Window | GR-402.ADA | **tag exactly as printed.** No GR-402.ADA in the Hilton schedule or the A530 legend; the schedule's ADA divider drapery is GR-405 | | FFE | ID-5.9.md tag list | **FLAGGED — not normalised to GR-405.** RFI candidate | TYPE |
| FF&E - Window | GR-402.1 | Divider Drapery Hardware | | FFE | Guestroom_FFE_by_Room ID-5.9 | MED — absent from ID-5.9.md's own tag list | TYPE |
| FF&E - Lighting | GR-206 | Table Lamp @ Accessible Working Wall | | FFE | ID-5.9 v1; A530 legend | HIGH | TYPE |
| FF&E - Lighting | GR-208 | Nightstand Sconce @ QQ Side, outboard | 1 of 2 / 2 of 2 | FFE | A556 line 54 "×2 (outboard)" | HIGH | TYPE |
| FF&E - Lighting | GR-202 | Nightstand Sconce | | FFE | A556 line 54 | HIGH | TYPE |
| FF&E - Casegoods | GR-322 | Nightstand @ Queen Queen | | FFE | A556 line 54 | HIGH | TYPE |
| FF&E - Casegoods | GR-319 / GR-323 | Nightstand @ Right / @ Left | | FFE | A556 line 54 | HIGH | TYPE |
| FF&E - Lighting | GR-207 | Nightstand Sconce @ QQ Center | | FFE | ID-5.9 v1 | MED — **A556 line 54 lists GR-208 and GR-322 but not GR-207** | TYPE |
| FF&E - Misc. | GR-325 | NO DESCRIPTION — tag only | | — | ID-5.9 v1 | **FLAGGED** | TYPE |

**ID-5.9 carries a note about room 438.** ID-5.9 types it as a QQ Accessible; **A103 prints `KING STUDIO ACCESSIBLE`** and FA-3 independently agrees, so `room_map.md` types 438 as **`King Studio Acc.`** and **438 takes §2.3, not §2.9.** That half is settled (`conflicts.md` **B4.4**, "King Studio, not QQ: ✅ settled"). 🚩 **Whether 438 is a *connector* is NOT settled** — B4.4 and A11 leave it open; see the FLAGGED box in §2.3. *(Corrected 2026-08-07: this paragraph previously said the ruling "superseded [438] to King Studio Accessible Connector", which closed an open conflict and invented a type string that is in no unit matrix.)*

---

# §4 — BATHROOM PACKAGES

The bathroom's **mechanical, plumbing and electrical rows live in §1** — no MEP sheet in the set references the ID-5.10/5.11/5.12/5.13 bathroom types, and mapping them would be invention.
**HD tag identity is not resolved anywhere.** The tags' *presence* is stated; no HD legend exists in any guestroom sheet. Every HD description below comes from the A530 BATHROOM ACCESSORIES NOTES; where a sheet tags an HD code without the legend confirming the item, the row is MED.
**F-1, standing:** A530 states outright that per-accessory counts are *"countable off the views, but do not treat that as a takeoff."* **Plan-view rows are the reliable instance counts; elevation-sourced rows are MED** — an accessory drawn on two adjacent-wall elevations may be one physical item seen twice.

## §4.1 Standard Bathroom — `bathroom_type = Standard Bathroom` — A530 / ID-5.10
Serves (A530 title block, verbatim): **King Std., Std. Conn., QQ Std., Std. Conn., QQ Wide & QQ Ext.**
— i.e. `room_type` ∈ { `King Studio`, `King Studio Connecting`, `Queen-Queen`, **`QQ Wide`**, `QQ Connecting`, **`QQ Wide Connecting`**, `QQ Extended` } = §2.1, §2.2, §2.6, §2.7, §2.8.
*(Corrected 2026-08-07: this line previously ended "the Wide types are retired by OV-001" — the superseded OV-001. A530's own title block **names QQ Wide**, so the sheet always served it.)*
Configuration: **shower, no tub** — SS-01 surround, bi-pass sliding glass door (keynote 28), tempered glass (keynote 5).

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| FF&E - Lighting | GR-203 | Vanity Sconce (A530 prints "VANITY SCONE" *sic*) | | FFE/EC | A530 plan 01; ID-5.10 | HIGH — ⚠ likely the same fixture as electrical **WS03**, see §1.3 | TYPE |
| FF&E - Casegoods | GR-302 | Vanity @ Guest Bath (Left & Right) | | MW | A530 plan 01; ID-5.10 | HIGH | TYPE |
| FF&E - Casegoods | GR-321 | Wall Shelf @ Bathroom | | MW | A530 plan 01; ID-5.10 | HIGH | TYPE |
| FF&E - Art / Mirror | GR-501 | Vanity Mirror | | FFE | A530 plan 01; ID-5.10 | HIGH | TYPE |
| Bath Accessory | HD-12 | Robe / Coat Hook | 1 of 2 | GC | **A530 plan 01 ("×2")** | HIGH — plan-view count | TYPE |
| Bath Accessory | HD-12 | Robe / Coat Hook | 2 of 2 | GC | A530 plan 01 ("×2") | HIGH | TYPE |
| Bath Accessory | HD-22 | Towel Bar 24" | | GC | A530 plan 01 | HIGH | TYPE |
| Bath Accessory | HD-21 | Soap Dish, surface mounted | | GC | A530 plan 01 | HIGH | TYPE |
| Bath Accessory | HD-18 | Shower Footrest, surface mounted | | GC | A530 plan 01 | HIGH | TYPE |
| Bath Accessory | HD-16 | Shower Soap Dispenser, surface mounted, guestroom | | GC | A530 plan 01 | HIGH | TYPE |
| Bath Accessory | HD-03 | Toilet Tissue Dispenser @ vanity wall | | GC | A530 elevation 02 | MED — elevation only, not listed on ID-5.10 | TYPE |
| Bath Accessory | HD-08 | Grab Bar ADA 24" Vertical Mount @ door / shower-glass wall | | GC | A530 elevation 03 | MED — elevation only | TYPE |
| Flooring | T-01 | Floor Tile @ Guest Suite Bathroom | | TILE | RK clarification §3 verbatim *"Floor Tile @ Lobby, Guest Suite Entry and Guest Suite Bathroom"*; finish_schedule pp.42/43 | HIGH — **supersedes** the schedule's "etc." Two supplier options carried unresolved (Daltile Volume 1.0 Supp A / Ceramic Technics Palma Kobe Supp B) | TYPE |
| Flooring | T-01.1 | Tile Base @ Guest Suite Bathroom | | TILE | ID-5.10; RK §3; finish_schedule pp.44/45 | HIGH — same supersession, same two supplier options | TYPE |
| Flooring | — | **Tile shower walls — UNTAGGED.** No finish code printed. Not the same thing as SS-01 | | TILE | ID-5.10 verbatim "tile shower walls" | **FLAGGED — do not assign a code. RFI** | TYPE |
| Paint | PT-02 | Paint @ Guest Suite Bathroom | | PT | ID-5.10 | MED — ⚠ OCR-garbled schedule row | TYPE |
| Wall Covering | WC-02 | Wallcovering @ Guest Suite Bathroom | | WC | ID-5.10; finish_schedule p.61 (Wolf Gordon) — schedule area matches the sheet exactly | HIGH | TYPE |
| Stone / Surround | SS-01 | Shower Surround @ Guest Suite Bath, solid-surface base + walls — Mincey Marble TS-VS / 12×24 Vision | | MW | ID-5.10 fixtures; finish_schedule p.40 | HIGH — install responsibility **not stated in any source read** | TYPE |
| Doors | GR-2A | Bath door — see §1.5 | | DR | A530 plan 01; A550/A555 | HIGH | TYPE |

## §4.2 King One Bedroom Bathroom — `bathroom_type = King One Bedroom Bathroom` — A531 / ID-5.11 — 3 keys
Serves §2.4 — `room_type = King One Bedroom`. Larger suite bath; shower, no tub.

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| FF&E - Lighting / Casegoods / Art | GR-203 · GR-302 · GR-321 · GR-501 | Vanity sconce · vanity (L&R) · wall shelf · vanity mirror | | FFE/MW | A531 plan 01 + ID-5.11; **A553 line 53 independently tags all four plus GR-502** | HIGH | TYPE |
| Bath Accessory | HD-12 | Robe / Coat Hook | 1 of 3 | GC | A531 plan 01 — **"three separate placements"** | HIGH | TYPE |
| Bath Accessory | HD-12 | Robe / Coat Hook | 2 of 3 | GC | A531 plan 01 | HIGH | TYPE |
| Bath Accessory | HD-12 | Robe / Coat Hook | 3 of 3 | GC | A531 plan 01 | HIGH | TYPE |
| Bath Accessory | HD-22 | Towel Bar 24" | | GC | A531 plan 01 + elevation 04 | HIGH | TYPE |
| Bath Accessory | HD-01 | Toilet Paper Roll Holder | | GC | A531 plan 01 | HIGH | TYPE |
| Bath Accessory | HD-21 | Soap Dish | | GC | A531 plan 01 + elevation 03 | HIGH | TYPE |
| Bath Accessory | HD-18 | Shower Footrest | | GC | A531 plan 01 + elevation 02 | HIGH | TYPE |
| Bath Accessory | HD-16 | Shower Soap Dispenser | | GC | A531 plan 01 + elevation 03i | HIGH | TYPE |
| Bath Accessory | HD-08 | Grab Bar ADA 24" Vertical Mount @ shower wall | | GC | A531 elevation 02 | MED — elevation only | TYPE |
| Bath Accessory | HD-02 | Single Toilet Paper Holder @ toilet / towel wall | | GC | A531 elevation 04 | **FLAGGED — both HD-01 (plan) and HD-02 (elevation) appear in this one bath.** Not resolved | TYPE |
| Flooring | T-01 / T-01.1 | Floor tile / tile base @ Guest Suite Bathroom | | TILE | RK §3 area; **ID-5.11 does not print a tile code** — it says only "WC-02 wallcovering, PT-02 paint, tile" | MED — **confirm the code on the sheet** | TYPE |
| Flooring | TL-01.1 | Tile @ bath wall, tag as printed | | TILE | ID-5.5 (King 1BR bath-entry elevation) | **FLAGGED — no TL-01.1 card in the finish schedule** | TYPE |
| Paint | PT-02 | Paint @ Guest Suite Bathroom | | PT | ID-5.11 | MED — OCR-garbled schedule row | TYPE |
| Wall Covering | WC-02 | Wallcovering @ Guest Suite Bathroom | | WC | ID-5.11; finish_schedule p.61 | HIGH | TYPE |
| Stone / Surround | SS-01 | Shower Surround | | MW | ID-5.11 fixtures; finish_schedule p.40 | HIGH | TYPE |

## §4.3 Accessible Bathroom — `bathroom_type = Accessible Bathroom` — A532 + A532.1 / ID-5.12
Serves §2.3 (`room_type = King Studio Acc.` — both keys, 118 and 438) and §2.9 (`room_type = QQ Acc.`).

> ### ⚠ TWO MUTUALLY EXCLUSIVE CONFIGURATIONS. A ROOM GETS ONE, NEVER BOTH.
> **A532 draws plan `01 — PLAN - TUB`. A532.1 draws plan `01.1 — PLAN - ROLL IN SHOWER`.** The two branches are split below as **§4.3-T** and **§4.3-R**. Rendered as one flat list — which is what the previous package did — this reads as *three shower rods plus both a tub grab-bar set and a roll-in fold-down seat in a single bathroom*. It is not that.
> **Which config lands in which room is contested, and the architectural set leans hard one way.** The finishes package silently routed King Studio Acc. to "§4.3 tub"; plumbing put BT-1 on accessible plans 02/04/07 off P401's hedged *"generally show a tub."* But **A551 line 44 draws a roll-in shower with fold-down seat** (King Studio Acc.), **A552 lines 49/74 draw an accessible shower with fold-down seat, tempered-glass enclosure and `T-02 ROLL-IN SHOWER TILE`**, **A556 line 48 draws a roll-in with fold-down seat** (QQ Acc.), and **A103 line 51 draws a roll-in at room 417**. Against that, **A533 lines 28–29 say the King 1BR Acc. elevations are explicitly labelled TUB — "It is not a roll-in shower"** — and A554 line 151 flags its own tub/roll-in ambiguity.
> **Nothing is asserted. Both branches are carried.** A tub and a curbless pan are a different structural depression, different tile (T-02), and a different plumbing rough-in. Seven keys. → `OPEN_ITEMS` **A2**.

**Common to both configurations:**

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| FF&E - Lighting | GR-203 | Vanity Sconce | | FFE/EC | ID-5.12; A532 elevation 04; A556 line 49 | HIGH | TYPE |
| FF&E - Casegoods | GR-303 | Accessible Vanity @ Guest Bath — replaces GR-302 | | MW | **A556 line 49 + 117** (QQ Acc.); ID-5.12; A530 legend | HIGH — upgraded from MED; A532/A532.1 identify it only through keyed notes 6 and 8 | TYPE |
| FF&E - Casegoods | GR-324 | **Wall Shelf** @ Accessible Bathroom — replaces GR-321 | | MW | A554 line 51 (*"accessible wall shelf"*); ID-5.13; A530 legend. **ID-5.12 calls the same tag a grab-bar accessory package — outvoted 2:1** | HIGH | TYPE |
| FF&E - Art / Mirror | GR-501 | Vanity Mirror | | FFE | ID-5.12; A556 line 49 | HIGH | TYPE |
| FF&E - Art / Mirror | GR-503 | **tag as drawn on A532 elevation 04, pointing at the vanity mirror.** The A530 legend defines GR-503 as "ART ABOVE DINING TABLE @ONE BEDROOM SUITE" | | FFE | A532 elevation 04 | **FLAGGED — probable tag error, recorded as found** | TYPE |
| Bath Accessory | HD-08 | Grab Bar ADA 24" Vertical Mount @ toilet wall | | GC | A532 elevation 03 | MED | TYPE |
| Bath Accessory | HD-06 | Grab Bar ADA @ toilet wall | | GC | A532 elevation 03 | MED | TYPE |
| Bath Accessory | HD-12 | Robe / Coat Hook @ toilet wall | | GC | A532 elevation 03 | MED | TYPE |
| Bath Accessory | HD-10 | Grab Bar ADA 22" Horizontal Mount @ vanity wall | | GC | A532 elevation 04 | MED | TYPE |
| Bath Accessory | HD-02 | Single Toilet Paper Holder | | GC | A532 elevation 02; ID-5.12 family | MED | TYPE |
| Bath Accessory | B-05 | **ID-5.12 lists B-05 as "shower / fold-down seat."** A532 and A532.1 use **B-05 as a wall BASE finish tag**, and the finish schedule has no B family | | GC | ID-5.12 vs A532 / A532.1 | **FLAGGED — direct conflict, both readings carried** | TYPE |
| Bath Accessory | KN 16 | Keynote 16 is drawn on **all five bath sheets and is undefined in the legend.** A533/03i's blocking note suggests "bulk amenity dispenser" — not stated | | GC | A530–A533 | **FLAGGED — RFI. It may be a bath accessory that belongs in this package** | TYPE |
| GC | — | **Grab-bar blocking → GC / framing, before tile.** Gates the whole accessible accessory install | | GC | ID-5.12, ID-5.13 | HIGH | TYPE |
| Flooring | T-01.1 | Tile Base @ accessible Guest Suite Bathroom | | TILE | ID-5.12; finish_schedule pp.44/45 | HIGH | TYPE |
| Flooring | T-01 | Floor Tile @ accessible Guest Suite Bathroom | | TILE | RK §3 area — **ID-5.12 names only T-01.1** | MED — confirm on sheet | TYPE |
| Paint | PT-02 | Paint @ accessible Guest Suite Bathroom | | PT | ID-5.12 | MED — OCR-garbled schedule row | TYPE |
| Wall Covering | WC-02 | Wallcovering @ Guest Suite Bathroom | | WC | ID-5.12; finish_schedule p.61 | HIGH | TYPE |
| Wall Covering | WC-12 | Wallcovering, tag as printed | | WC | ID-5.12 ("WC-02 / WC-12 wallcovering") | **FLAGGED — CONFLICT.** finish_schedule p.64 assigns WC-12 to **"Hydration Station & Servery"**, a first-floor public F&B area. RFI before ordering | TYPE |
| Stone / Surround | SS-01 | Shower Surround — transfer tub or roll-in | | MW | ID-5.12 fixtures; finish_schedule p.40 | HIGH — one row; the sheet presents tub and roll-in as alternative configs of the same surround product | TYPE |

**§4.3-T — TUB configuration (A532 plan 01) — additional rows**

| Cat | Tag | Description | Inst | Trade | Source | Conf |
|---|---|---|---|---|---|---|
| Plumbing | BT-1 | Bathtub, guestroom ADA — American Standard Princeton `2390.202`, Delta `T14261` / `R10000-UNWS` | | PC | P401 (hedged: accessible units "generally show a tub"); product P104 | **FLAGGED — see A2** |
| Bath Accessory | HD-05 | **Shower Rod BOWED** @ tub elevation 05 | | GC | **A532 view 05 only** | HIGH |
| Bath Accessory | HD-09 | Grab Bar ADA 24" Horizontal Mount @ tub elevation 05 | | GC | A532 elevation 05 | HIGH |
| Bath Accessory | HD-16 | Shower Soap Dispenser @ tub elevation 05 | | GC | A532 elevation 05 | HIGH |
| Bath Accessory | HD-08 | Grab Bar ADA 24" Vertical Mount @ tub elevation 05 | | GC | A532 elevation 05 | MED |
| Bath Accessory | HD-08 | Grab Bar ADA 24" Vertical Mount @ tub / grab-bar wall | 1 of 2 | GC | A532 elevation 02 (sheet shows ×2) | MED |
| Bath Accessory | HD-08 | Grab Bar ADA 24" Vertical Mount @ tub / grab-bar wall | 2 of 2 | GC | A532 elevation 02 | MED |
| Bath Accessory | HD-06 | Grab Bar ADA @ tub / grab-bar wall | | GC | A532 elevation 02 | MED |
| Bath Accessory | HD-10 | Grab Bar ADA 22" Horizontal Mount @ elevation 02i (blocking) | | GC | A532 elevation 02i | MED |

> **HD-05 source corrected.** The previous package co-sourced HD-05 to "A532 elevation 05; ID-5.12 (listed there as HD-05.1)". **ID-5.12 lists HD-05.1 only** — using that entry to also source HD-05 conflates two rods the package elsewhere insists on keeping distinct, and double-books one ID-5.12 entry across two rows. **HD-05 is sourced to A532 view 05 alone.** ID-5.12's HD-05.1 stays attached to the rod row in §4.3-R.

**§4.3-R — ROLL-IN SHOWER configuration (A532.1 plan 01.1) — additional rows**

| Cat | Tag | Description | Inst | Trade | Source | Conf |
|---|---|---|---|---|---|---|
| Plumbing | SH-3 | Roll-in shower, guestroom ADA — 30"×60" pan, centre drain, **no threshold** | | PC | P104 SH-3; ID-5.12 "Plan — Roll-In Shower (1.1)"; A551/A552/A556 all draw a roll-in | **FLAGGED — see A2** |
| Bath Accessory | HD-5.1 | **Shower Rod STRAIGHT** @ main roll-in shower wall, view 02. **ID-5.12 prints the same rod as `HD-05.1`; A530 legend and A532.1 print `HD-5.1`. Same rod, two spellings — both recorded, not normalised.** Do not double-order | | GC | A532.1 view 02; ID-5.12 (as HD-05.1) | HIGH |
| Bath Accessory | HD-14 | **Folding Rectangular Shower Seat, surface mounted** @ folding-seat wall, view 03 | | GC | A532.1 view 03 — the **only** place HD-14 is tagged in the A530–A533 group | HIGH |
| Bath Accessory | HD-16 | Shower Soap Dispenser @ main roll-in shower wall, view 02 | | GC | A532.1 view 02 | HIGH |
| Bath Accessory | HD-21 | Soap Dish @ shower end wall, view 01i | | GC | A532.1 view 01i | HIGH |
| Bath Accessory | HD-18 | Shower Footrest @ shower end wall, view 01i | | GC | A532.1 view 01i | HIGH |
| Flooring | T-02 | Floor Tile @ ADA Roll-In Shower | | TILE | A552 line 74 `T-02 ROLL-IN SHOWER TILE`; ID-5.3 finish plan; finish_schedule pp.46/47 | HIGH |
| GC | — | **Tempered-glass shower enclosure** | | GC | A552 line 49 | HIGH |
| Flooring | — | **"NO FINISHES UNDER SHOWER PAN"** | | TILE | A551 line 73 | HIGH |

## §4.4 King One Bedroom Accessible Bathroom — `bathroom_type = King One Bedroom Accessible Bathroom` — A533 / ID-5.13 — 3 keys
Serves §2.5. **A533 states the configuration as an accessible TUB with removable seat, explicitly NOT a roll-in shower** (lines 28–29: *"elevations explicitly labelled TUB … It is not a roll-in shower"*).
⚠ **A554 line 50 and A103 line 51 both draw a ROLL-IN at these rooms.** The architectural set contradicts itself inside one discipline. → `OPEN_ITEMS` **A2**.

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| FF&E | GR-203 · GR-303 · GR-324 · GR-501 | Vanity sconce · accessible vanity · **wall shelf** @ accessible bathroom · vanity mirror | | FFE/MW | **A554 line 51** + ID-5.13; A530 legend. (A533 places no GR tag at all) | HIGH — upgraded from MED | TYPE |
| Bath Accessory | HD-12 | Robe / Coat Hook | 1 of 2 | GC | A533 plan 01 ("×2") | HIGH — plan-view count | TYPE |
| Bath Accessory | HD-12 | Robe / Coat Hook | 2 of 2 | GC | A533 plan 01 ("×2") | HIGH | TYPE |
| Bath Accessory | HD-22 | Towel Bar 24" | | GC | A533 plan 01 | HIGH | TYPE |
| Bath Accessory | HD-05 | Shower Rod **Bowed** @ tub wall 03 | | GC | A533 elevation 03 | HIGH | TYPE |
| Bath Accessory | HD-09 | Grab Bar ADA 24" Horizontal @ tub wall 03 | | GC | A533 elevation 03 | HIGH | TYPE |
| Bath Accessory | HD-16 | Shower Soap Dispenser @ tub wall 03 | | GC | A533 elevation 03 | HIGH | TYPE |
| Bath Accessory | HD-02 | Single Toilet Paper Holder @ toilet-paper / robe-hook wall 05 | | GC | A533 elevation 05 | HIGH | TYPE |
| Bath Accessory | HD-08 | Grab Bar ADA 24" Vertical @ toilet / grab-bar wall 02 | | GC | A533 elevation 02 | MED | TYPE |
| Bath Accessory | HD-08 | Grab Bar ADA 24" Vertical @ tub wall 03 | | GC | A533 elevation 03 | MED | TYPE |
| Bath Accessory | HD-08 | Grab Bar ADA 24" Vertical @ vanity wall 04 | | GC | A533 elevation 04 | MED | TYPE |
| Bath Accessory | HD-08 | Grab Bar ADA 24" Vertical @ toilet-paper / robe-hook wall 05 | | GC | A533 elevation 05 | MED | TYPE |
| Bath Accessory | HD-06 | Grab Bar ADA @ toilet / grab-bar wall 02 | | GC | A533 elevation 02 | MED | TYPE |
| Bath Accessory | HD-06 | Grab Bar ADA @ toilet-paper / robe-hook wall 05 | | GC | A533 elevation 05 | MED | TYPE |
| Bath Accessory | HD-10 | Grab Bar ADA 22" Horizontal @ toilet / grab-bar wall 02 | | GC | A533 elevation 02 | MED | TYPE |
| Plumbing | BT-1 | Bathtub, guestroom ADA, **with removable seat** — Am. Std Princeton `2390.202` | | PC | A533; P401 plan 07; P104 | MED — contradicted by A554/A103, see A2 | TYPE |
| Flooring | T-01 / T-01.1 | Floor tile / tile base @ accessible Guest Suite Bathroom | | TILE | ID-5.13 names only T-01.1; T-01 from RK §3 area | HIGH (T-01.1) / MED (T-01) | TYPE |
| Paint | PT-02 | Paint | | PT | ID-5.13 | MED — OCR-garbled schedule row | TYPE |
| Wall Covering | WC-02 | Wallcovering @ Guest Suite Bathroom | | WC | ID-5.13; finish_schedule p.61 | HIGH | TYPE |
| Stone / Surround | SS-01 | Shower Surround — transfer tub / shower | | MW | ID-5.13 fixtures; finish_schedule p.40 | HIGH | TYPE |

**A533's own stated grab-bar package is HD-06 ×2, HD-08 ×4, HD-09, HD-10** — that matches the per-wall rows above and is the closest thing to a stated count anywhere in the bath set.
**F-9 carried:** three different toilet-paper devices across four bath types — standard bath = HD-03, King 1BR bath = **both** HD-01 and HD-02, accessible baths = HD-02. Confirm before ordering.

---

# §5 — PUBLIC & AMENITY SPACES

**All amenity and public space is on floor 1.** Floors 2–4 carry only Electrical, Storage, House Keeping, Ice Machine, two stairs, the elevator lobby and the shaft. That is a fact about the building, not a gap.

> ### ⚠ THREE STANDING QUALIFIERS ON EVERY ROW IN §5
> **1. No PA description table exists anywhere in this context set.** ID-1.7 is the public-area FF&E master and carries **tag codes + quantities only**; A510.3 says the same in two places. ~65 PA items exist (PA-100 → PA-851); the drawings place ~45 and describe ~13. **Every PA row carries the tag — which is what a PO is written against — and cites the sheet that places it. The description is FLAGGED unless a drawing states it in words.** Get `EGLMTHT…PA_FF&E & Finish Specs_Dynamic_250704.pdf` from Drive before any PO.
> **2. ID-0.0 general note 3, verbatim:** *"This is a design intent drawing, not intended for architectural, engineering or construction use. Shop drawings must be provided to the interior designer for final approval."* **This applies to every ID-4.x millwork dimension below.** Where an architectural twin exists (A900–A907), the A-sheet governs and the ID dimension drops to MED.
> **3. Prefix is load-bearing.** A510.3 carries two colliding families: **PA-xxx** (FF&E tags) and **bare 3-digit furnishing-list numbers** (300–304, 400–409, 431–432, 800–821). `802` = GYM WIPES DISPENSER is **not** `PA-802`. `400` = FIRE PIT is **not** `PA-400`.

**Public-space MEP is not in this layer.** Electrical, Mechanical, Plumbing, Fire Sprinkler, Fire Alarm and Low Voltage have zero rows for every space in §5. See README §5 and `OPEN_ITEMS` B2.

**PA descriptions that ARE stated somewhere, and are therefore usable:**

| Tag | Description as printed | Where stated |
|---|---|---|
| PA-202 | decorative mirror above vanity | ID-3.4 |
| PA-204 | decorative corridor ceiling / light fixture | ID-1.11, ID-1.15, ID-1.16 + A120–A123 corridor sconce |
| PA-309 | table | A510.3 space table |
| PA-110 | chairs | A510.3 space table |
| PA-310 | meeting-room credenza | ID-4.7 verbatim |
| PA-400 | corridor window element — perch/bench **or** window treatment (unresolved) | ID-1.13 |
| PA-401 | decorative pendant | ID-3.1 view 4 |
| PA-402 | meeting-room stacking chairs | ID-1.7 |
| PA-501 | elevator-lobby console / feature piece | ID-1.13 |
| PA-502 | decorative sconce above vanity | ID-3.4 |
| PA-506 | fitness item (type not stated) | ID-3.2 views 4–7 |

**Removed from that list: PA-107 and PA-802.** A510.3 states twice that it prints no PA descriptions — *"No PA description table exists on this sheet"* and, under "Not at all", *"PA-xxx descriptions, manufacturers, models, finishes or prices — not on this sheet."* "(window-counter stools)" for PA-107 is the extractor's graphic characterisation, exactly like "PA-309 (table)" and "PA-110 (chairs)". "Likely breakfast banquettes" for PA-802 is the sheet index's own inference. **No drawing in this set prints a PA description.**

## §5.1 LOBBY 003 (with Vestibule 001 adjacency)
Ceiling 8'-10" field / 9'-6" feature zone (A510.2). Floor T-01 with CPT-11 inset (A510.4) — **the inset must be coordinated with outlets and FF&E placement** (A510.4 keyed note 12).

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| FF&E - Seating | PA-100 | description not stated | 1 | FFE | ID-1.7 (no multiplier); A510.3 Lobby 003 | **FLAGGED (desc)** | TYPE |
| FF&E - Seating | PA-101 | description not stated | 6 rows | FFE | ID-1.7 (6); A510.3 ×6 — agree | **FLAGGED (desc)** | TYPE |
| FF&E - Seating | PA-102 | description not stated | 6 rows | FFE | A510.3 ×6 | **FLAGGED (desc)** | TYPE |
| FF&E - Seating | PA-102 | description not stated — **delta** | 2 rows | FFE | ID-1.7 prints (8) vs A510.3 ×6 | **FLAGGED (qty + desc)** | TYPE |
| FF&E - Seating | PA-103 | description not stated | 3 rows | FFE | ID-1.7 / A510.3 agree | **FLAGGED (desc)** | TYPE |
| FF&E - Seating | PA-104 | description not stated | 4 rows | FFE | agree | **FLAGGED (desc)** | TYPE |
| FF&E - Seating | PA-106 | description not stated | 24 rows | FFE | ID-1.7 8/6/4/6 = 24 | **FLAGGED (desc)** | TYPE |
| FF&E - Seating | PA-106 | description not stated — **delta** | 2 rows | FFE | A510.3 8/6/6/6 = 26 (3rd tag instance differs) | **FLAGGED (qty + desc)** | TYPE |
| FF&E - Seating | PA-107 | description not stated. Placed at the window counter | 8 rows | FFE | ID-1.7 (8); A510.3 ×8 — agree | **FLAGGED (desc + qty)** — ⚠ **A904's window-perch plan 4 draws NINE seats**, untagged, against the 8 both FF&E sheets print | TYPE |
| FF&E - Seating | PA-111 | description not stated | 1 | FFE | ID-1.7 line 20 Lobby lounge cluster | **FLAGGED** — room assignment is prose, not a space table; **absent from A510.3** | TYPE |
| FF&E - Lighting | PA-200 | description not stated | 1 | FFE | ID-1.7 (no multiplier) | **FLAGGED (desc)** | TYPE |
| FF&E - Casegoods | PA-300 | description not stated | 11 rows | FFE | ID-1.7 5/3/3 | **FLAGGED (desc)** | TYPE |
| FF&E - Casegoods | PA-301 | description not stated | 4 rows | FFE | agree | **FLAGGED (desc)** | TYPE |
| FF&E - Casegoods | PA-302 | description not stated. Also tagged at Market 005 | 1 | FFE | ID-1.7 reads **"(several)" — no number printed** | **FLAGGED (qty + desc)** | TYPE |
| FF&E - Casegoods | PA-303 | description not stated | 2 rows | FFE | agree | **FLAGGED (desc)** | TYPE |
| FF&E - Casegoods | PA-304 | description not stated | 2 rows | FFE | agree | **FLAGGED (desc)** | TYPE |
| FF&E - Casegoods | PA-307 | description not stated | 3 rows | FFE | ID-1.7 ×3 locations — **the sheet does not say whether ×3 means three instances of one item or three instances each carrying an unread multiplier** | **FLAGGED** | TYPE |
| FF&E - Casegoods | PA-313 | description not stated | 1 | FFE | ID-1.7 line 22 lounge cluster | **FLAGGED** — absent from A510.3 | TYPE |
| FF&E - Casegoods | PA-316 | description not stated | 1 | FFE | ID-1.7 line 22 lounge cluster | **FLAGGED** — absent from A510.3 | TYPE |
| FF&E - Art / Mirror | PA-503 | description not stated — **carries a PRINTED quantity of 3** | 3 rows | FFE | ID-1.7 line 24 lounge cluster | **FLAGGED** — absent from A510.3. A tag with a stated quantity must not be silently dropped | TYPE |
| FF&E - Art / Mirror | PA-505 | description not stated | 1 | FFE | ID-1.7 line 24 lounge cluster | **FLAGGED** — absent from A510.3 | TYPE |
| FF&E - Window | PA-400 | corridor window element | 1 | FFE | A510.3 tags PA-400 in Lobby 003 | **FLAGGED — identity/location conflict.** ID-1.13 defines PA-400 as the *corridor* window element; ID-1.7 prints **PA-400 (×4)** and also places it in Meeting Room 018 | TYPE |
| FF&E - Lighting | PA-401 | decorative pendant (typ.), over the lounge | 1 | FFE | ID-3.1 view 4; A510.3 places it at Vestibule 001 / lobby side | MED — **"(typ.)" with no count** | TYPE |
| FF&E - Misc. | PA-800 | description not stated. Also tagged at Market 005 and Breakfast/Servery | 1 | FFE | ID-1.7 (no multiplier); A510.3 | **FLAGGED** | TYPE |
| FF&E - Misc. | PA-201 · PA-205 · PA-117 · PA-202 | Dashed decorative **ceiling / lighting feature zones** over Breakfast, the Lobby lounge and near the Market/Servery. **The sheet does not say which tag is over which space** | 1 row each | FFE | ID-1.6 | **ALL FOUR FLAGGED.** **PA-117, PA-201 and PA-205 appear on ID-1.6 and NOWHERE else** — not on ID-1.7's tag list, not on A510.3. Three of the four are orphans. The fourth, **PA-202, is defined as the public-restroom vanity mirror on ID-3.4 — the same code cannot be both** | TYPE |
| FF&E - Casegoods | — | **Coffee & hydration bar with media wall** — ~18'-6", 5 equal bays, quartz top + backsplash, PL-01 front, ST-01 accent, black melamine concealed. Integrated: **television (by others)**, **hydration station (see food-service drawings; 2"×12" min vent cutout; opening for floor-drain access)**, **trash grommet 9" dia brushed stainless with trash insert and trash can BY OTHERS** | | MW | ID-4.2 / ID-4.3 — **design intent only per ID-0.0 note 3; no A9xx twin read** | MED | TYPE |
| FF&E - Casegoods | — | **Dish recovery / bussing counter** — ~4'-6", 2cm quartz top + backsplash, PL-01, trash inserts 6" and 9" dia brushed stainless, **inserts by others**. Elevation ID-3.1 view 7. A510.3 note 3: *"THIS UNIT CONTAINS A DISH RECOVERY CART & (2) TRASH CANS, COORDINATE W/ MILLWORK VENDOR"* | | MW | ID-4.3; A510.3 note 3 + note 10 (OS&E DISH RECOVERY CART) | MED | TYPE |
| FF&E - Casegoods | — | **Window perch / communal work ledge** — counter-height, **16'-4" per A904 (dimensioned in TWO independent plan views, bay set-out 2'-0 1/2" · 4'-1" · 4'-1" · 4'-1" · 2'-0 1/2") / ~18'-4" per ID-4.6**. PL-02 top, 2"×1" steel tube legs, laminate modesty panel, **BYRNE ELECTRICAL BURELE, OR EQUAL surface outlet boxes, 4 equal on centre**, 2" grommet for table-lamp cord, **CORD GUIDE FOR POWER OUTLET AT 12" OC**, **WC-11 at the perch wall** | | MW | **A904 (governs — architectural construction sheet over design-intent sheet)** vs ID-4.6 | **FLAGGED — 2'-0" CONFLICT.** A904 PM note 2 verbatim: *"16'-4", not 18'-4". … Build to A904. If the FF&E stool count was set off 18'-4", it is wrong."* ⚠ **ID-4.6 does not state which room the perch is in** — it shares a sheet with Guest Laundry; it is carried here because PA-107 is in Lobby 003 per A510.3 | TYPE |
| FF&E - Art / Mirror | — | **Art panels, lounge and reception walls** — mount **4'-4 1/2" to centre of art** (verbatim). Count not stated | | FFE | **ID-3.1 view 3 only** (view 1 carries wall graphics, decorative pendants, WC-12 — not art panels) | MED | TYPE |
| FF&E - Art / Mirror | — | Wall graphics / branded signage, lounge + reception ("GRAPHICS" callouts). Count not stated | | FFE | ID-3.1 views 1 and 6 | MED | TYPE |
| Appliance | — | Media-wall television — coordinate outlet location with the media mount | | OWN | A510.4 keyed note 6; A510.1 keyed note 25 (TV LOCATION) | HIGH | TYPE |
| FF&E - Misc. | KN 1 | **TRASH CAN, RECYCLING BIN & ASH BIN**, tagged "at many points" in Lobby 003. **No count** | 1 row | GC/OWN | A510.3 keyed note 1 | **FLAGGED (qty)** | TYPE |
| FF&E - Misc. | KN 20 / 62 / 16 | **FEATURE WALL** (lobby/vestibule zone) · **HOUSE PHONE** · **LUGGAGE CART STORAGE** | 1 row each | GC | A510.1 keyed notes 20, 62, 16 | MED | TYPE |
| Fire Sprinkler | KN 22 | **FIRE EXTINGUISHER — must be in a FULLY RECESSED cabinet in public space** | | GC | A510.1 keyed note 22; A510.4 general note B | HIGH | TYPE |
| Flooring | CPT-11 | Carpet Tile @ Lobby Inset | | TILE | ID-1.8; finish_schedule p.14 "Lobby Inset" — sheet and schedule agree | HIGH | TYPE |
| Flooring | T-01 | Floor Tile @ Lobby (field) | | TILE | ID-1.8; A510.4; RK §3 names Lobby first | HIGH | TYPE |
| Flooring | T-01.1 | Tile Base @ Lobby | | TILE | RK §3; ID-3.1 views 5/6 show it in adjacent public areas | MED — not called out at Lobby specifically on ID-1.8 | TYPE |
| Flooring | — | **Decorative floor inset / medallion @ lounge — UNTAGGED.** No finish code, no pattern, no material, no supplier | | TILE | ID-1.8 (blue dashed outlines); its own note: *"confirm pattern/material and who supplies"* | **FLAGGED — feature item, likely long-lead. RFI** | TYPE |
| Wall Covering | WC-11 | Wallcovering @ Lobby | | WC | ID-3.1 views 3, 4, 6; finish_schedule p.63 "Lobby, Breakfast Room" (MDC) | HIGH | TYPE |
| Wall Covering | WC-12 | Wallcovering @ Lounge | | WC | ID-3.1 view 1 | MED — finish_schedule p.64 assigns WC-12 to "Hydration Station & Servery"; adjacency is plausible but not stated | TYPE |
| Paint | PT-04 | Paint | | PT | ID-3.1 view 2 (Reception / media wall) | MED — schedule area for PT-04 is "Guest Suite Entry Door & Frame"; public use is not covered by the schedule area | TYPE |
| Paint | PT-07 | Paint @ Ceiling, 9'-6" AFF, "By GC" | | PT | ID-1.6 | MED — ID-1.6 marks the Lobby ceiling "By GC" without printing a code at that space; PT-07 is the sheet-wide predominant ceiling finish | TYPE |
| Stone / Surround | ST-01 | Quartz @ patio / entry thresholds and public area | | MW | ID-1.8; finish_schedule p.41 "Public Area & Guest Suite" | HIGH | TYPE |
| Doors | 003 | Lobby door — D4 ALUM STOREFRONT, SGL 3'-0"×7'-0"×1 3/4", GLASS, ALUM frame, no rating, hardware set **#12** | | DR | A600 first-floor schedule | HIGH | TYPE |

## §5.2 VESTIBULE 001

| Cat | Tag | Description | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|
| Stone / Surround | ST-01 | Stone @ Vestibule / entry | MW | ID-1.8; finish_schedule p.41 | HIGH | TYPE |
| Flooring | T-01 | Floor Tile @ Vestibule / entry | TILE | ID-1.8; RK §3 | HIGH | TYPE |
| Paint | PT-07 | Paint @ Ceiling, 8'-0" AFF | PT | ID-1.6 | MED | TYPE |
| Doors | 001A | D5 ALUM SLIDING, 4'-0"×7'-0", GLASS/ALUM, hardware set **#6**, remark **b: BESAM UNISLIDE OC-S, overhead concealed fixed sidelite, narrow-stile single slide** | DR | A600 | HIGH | TYPE |
| Doors | 001B | D5 ALUM SLIDING, 4'-0"×7'-0", GLASS/ALUM, **no hardware set scheduled**, remark b | DR | A600 | HIGH | TYPE |
| Low Voltage | — | Intercom/buzzer + remote reader inside the vestibule (HW set #6) | EC | A600 hardware set #6; A600 remark f | HIGH | TYPE |

## §5.3 RECEPTION 004

| Cat | Tag | Description | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|
| FF&E - Misc. | 303 | **SAFE** | OWN | A510.3 furnishing list + space table | HIGH | TYPE |
| FF&E - Casegoods | PA-501 | elevator-lobby console / feature piece — also tagged here | FFE | A510.3; description from ID-1.13 | MED | TYPE |
| FF&E - Casegoods | — | **Front desk millwork** — ~11'-6" custom reception desk, guest-facing transaction counter + **lower ADA transaction surface** (~34"/42" tops); quartz top; PL-01 exposed / PL-02 secondary / ST-01 accent; **reeded/fluted painted front, 4'-6" of paneling**; black melamine concealed; base flush with 1/8" reveal; **brushed stainless L-bracket at counter edge**; adjustable shelf 2" OC, lockable file drawer, roll-out tray | MW | ID-4.1 — ⚠ **design intent only per ID-0.0 note 3. A900 (Front Desk) is the architectural twin and has NOT been read** | MED | TYPE |
| Electrical | — | Front-desk integrated: electrical/data outlets **turned horizontal @ 24" OC**, 1" grommet directly above the quad outlet, 2" grommets, access panel for pigtail, **fan + vent hole with KEKU clips**, blocking as required; recessed J-box routed from floor through millwork | EC/MW | ID-4.1; A510.4 keyed note 9 | MED | TYPE |
| Low Voltage | KN 16 | **Hardwired data is OPTIONAL in public spaces; wireless is REQUIRED** | EC | A510.4 keyed note 16 | HIGH | TYPE |
| FF&E - Misc. | KN 9 / KN 19 | **REGISTRATION DESK WITH ACCESSIBLE APPROACH** (refer FF&E package + HADG) · **SAFETY DEPOSIT BOX LOCATION** at the reception/work-stations millwork | GC/MW | A510.1 keyed notes 9 and 19 | HIGH | TYPE |
| Drywall | ACB-01 | **Wood baffle / slat feature ceiling** above the desk. **ACB-01 is a ceiling finish code, not a light fixture** | GC | ID-4.1 view 7; finish_schedule p.7 | **FLAGGED** — finish_schedule p.7 says "Reception Desk Ceiling", ID-1.6 places ACB-01 at **Home2 Market 005**, ID-3.1 view 3 at the **Lounge**. Three locations for one code | TYPE |
| Wall Covering | WP-10 | Wall Protection @ Reception Wall and Door — InPro Palladium Rigid Sheet & 3D Trim, on 3/4" MDF panel/trim | WC | ID-4.5 (reception feature wall); finish_schedule p.67 | MED | TYPE |
| Wall Covering | FILM-01 | Decorative window film on 3/8" tempered clear glass @ reception view windows — Solyx SX-C363 | WC | ID-4.5; finish_schedule p.18 | MED — category placement (Wall Covering) is a judgment call; film is not strictly a wall covering | TYPE |
| Flooring | T-01 / T-01.1 | Floor tile / tile base @ Reception | TILE | ID-1.8; ID-3.1 view 6 | HIGH | TYPE |
| Wall Covering | WC-11 | Wallcovering @ Reception | WC | ID-3.1 views 2 and 6; finish_schedule p.63 | HIGH | TYPE |
| Paint | PT-03 / PT-04 | Painted finish @ reception feature wall, to match house finishes | PT | ID-4.5 (codes genuinely printed) | HIGH for the callout — ⚠ **PT-03 is OCR-inferred in the extracted finish schedule** (code inferred from card sequence, product data garbled, location "[confirm in source]"). **Confirm the code against the source finish card before any paint order.** Same caveat wherever PT-06, RB-10, T-10 Supp B, T-12 Supp B or WC-13 appear | TYPE |

## §5.4 HOME2 MARKET 005

| Cat | Tag | Description | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|
| FF&E - Casegoods | PA-314 · PA-315 | description not stated, 1 row each, no multiplier | FFE | ID-1.7 / A510.3 | **FLAGGED (desc)** | TYPE |
| FF&E - Casegoods | PA-302 | also tagged here; ID-1.7 reads "(several)", no number | FFE | ID-1.7 / A510.3 | **FLAGGED (qty + desc)** | TYPE |
| FF&E - Misc. | PA-800 | also tagged here | FFE | A510.3 | **FLAGGED (desc)** | TYPE |
| FF&E - Casegoods | — | Market display shelving | MW | ID-4.5 — design intent; **A903 (Home2 Market & Reception Wall) is the architectural twin and has NOT been read** | MED | TYPE |
| FF&E - Casegoods | — | Retail display tables — verbatim *"see food-service display specifications"*; source/supplier to be confirmed | OWN/MW | ID-4.5 | **FLAGGED** | TYPE |
| Appliance | — | **Grab-and-go coolers / reach-in refrigerators** — the WC-11-framed glass units. **Equipment by others** (operator/owner); Triun provides the opening, finishes and electrical rough-in per architect/MEP | OWN | ID-4.5 | **FLAGGED** — no make/model on ID-4.5. ⚠ **A514's electrical schedule carries reach-in display refrigeration with make and model — item 35 REACH-IN DISPLAY FREEZER (TRUE `TS-23FG-HC~FGD01`) and item 36 REACH-IN DISPLAY REFRIGERATOR (TRUE `TSD-47G-HC-LD`) — with no room assignment and no equipment-schedule row. Reconcile before assuming these are or are not the Market units** | TYPE |
| FF&E - Misc. | — | **Home2 brand signage / "brand promise" sign**, centred between trim. **"48"×18" blocking required for signage, centered"** — blocking must be in the framing before wallcovering | GC | ID-4.5 | HIGH | TYPE |
| Flooring | T-01 | Floor Tile @ Market | TILE | ID-1.8; RK §3 | HIGH | TYPE |
| Wall Covering | WC-11 · WP-10 · FILM-01 | Wallcovering · wall protection on MDF trim · film on 3/8" tempered clear glass at the view windows | WC | ID-4.5 | MED | TYPE |
| Stone / Surround | PL-01 | "Dynamic" plastic laminate | MW | ID-4.5 | HIGH | TYPE |
| Drywall | ACB-01 | Acoustic ceiling ~8'-10" AFF | GC | ID-1.6; A510.2 tags Market 005 at 8'-10" | **FLAGGED** — see the three-location ACB-01 conflict in §5.3 | TYPE |

## §5.5 BREAKFAST 006 / SERVERY 009

> ⚠ **Location conflict, carried both ways.** ID-1.7 clusters **PA-309 and PA-110 (6)** at *"Breakfast 006 / Servery 009"*. **A510.3 tags PA-309 (table) and PA-110 (chairs) in Employee Breakroom 014.** Same two tags, two rooms, two sheets of the same plan. Emitted here per ID-1.7 (the FF&E master) and flagged.

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| FF&E - Casegoods | PA-309 | table | 1 | FFE | ID-1.7 cluster | **FLAGGED (room)** | TYPE |
| FF&E - Seating | PA-110 | chairs | 6 rows | FFE | ID-1.7 cluster | **FLAGGED (room)** | TYPE |
| FF&E - Seating | PA-802 | description not stated | 2 rows | FFE | ID-1.7 prints "(×2)" | **FLAGGED (desc)** — "likely breakfast banquettes" is the sheet index's own inference, not printed on the drawing | TYPE |
| FF&E - Misc. | PA-801 · PA-803 · PA-804 · PA-805 | description not stated, 1 row each, no multiplier | 1 each | FFE | ID-1.7 | **FLAGGED (desc)** — **none of PA-801/802/803/804/805 appears on A510.3 at all**; that sheet leaves the zone to the food-service package (keyed note 9: *"SEE FOOD SERVICE DWGS FOR EQUIPMENT INFORMATION"*). **Open: who buys and installs the PA-8xx items here** | TYPE |
| FF&E - Casegoods | — | **Breakfast Servery + Breakfast Bar millwork** — quartz top + backsplash as specified, PL-01 exposed, black melamine concealed, PL base, **LED uplighting / under-shelf lighting**, **French cleat** shelf mounting, adjustable shelves, **signage panel**. Ventilation slots and access panels required; power outlets and cord grommets coordinated to the food-service drawings **before fabrication** | | MW | ID-4.4 — design intent; **A902 (Breakfast Serving Counter) is the architectural twin and has NOT been read** | MED | TYPE |
| Appliance | — | Integrated, all *by others* / food-service vendor: yogurt machine, drop-in units, **panel-ready refrigerator** (millwork supplies the matching PL-01 front — **confirm the appliance model so the panel fits**), coffee/service equipment | | OWN | ID-4.4 | MED | TYPE |
| Appliance | 23 | BATTER MIX STARTER KIT (OPERATOR FURNISHED) | 1 · Servery 009 | OWN | A514 plan 1 | HIGH | TYPE |
| Appliance | 24 | WAFFLE MAKER (OPERATOR FURNISHED) — WELLS `BWB-1SE` | 1 · Servery 009 | OWN | A514 | HIGH | TYPE |
| Appliance | 25 | WAFFLE MAKER (FUTURE) (OPERATOR FURNISHED) — WELLS `BWB-1SE` | 1 · Servery 009 | OWN | A514 | HIGH | TYPE |
| Appliance | 26 | CONVEYOR TOASTER — APW WYOTT `ECO 4000-350L-HILTON` | 1 · Servery 009 | OWN | A514 | HIGH | TYPE |
| Appliance | 27 | DISPLAY SHOWCASE — EQUIPEX `WD780B-2/1` | 1 · Servery 009 | OWN | A514 | HIGH | TYPE |
| Appliance | 28 | JUICE DISPENSER (BY VENDOR) — BUNN-O-MATIC `JDF-4` | 1 · Servery 009 | OWN | A514 | HIGH | TYPE |
| Appliance | 29 | WARMING KETTLE — VOLLRATH `72017` | 1 · Servery 009 | OWN | A514 | HIGH | TYPE |
| Appliance | 30 | CEREAL DISPENSER — SERVER PRODUCTS `88920` | 1 · Breakfast 006 | OWN | A514 | HIGH | TYPE |
| Appliance | 31 | UNDERCOUNTER DISPLAY REFRIGERATOR — TRUE `TUC-27G-ADA-HC~FGD01` | 1 · Breakfast 006 | OWN | A514 | HIGH | TYPE |
| Appliance | 34 · 39 | **tagged on the Breakfast 006 counter and defined in NEITHER schedule on A514.** 34 is undefined anywhere in the A51x group | 1 row each | OWN | A514 plan tags | **FLAGGED — resolve with the food-service vendor before ordering** | TYPE |
| Appliance | — | Coffee maker — FETCO `CBS-2152XTS`, breakfast servery, **operator-furnished** | | OWN | A513 / A513.1 / A514 | HIGH | TYPE |
| Flooring | T-21 | Floor tile, tag as printed `T-21` | | TILE | ID-1.8 ("Servery / Breakfast: tile — T-21 / T-01 field") | **FLAGGED — no T-21 card exists in the 67-card finish schedule; the T-series stops at T-14. Do not normalise to T-01 or T-13. RFI** | TYPE |
| Flooring | T-01 · T-01.1 | Floor tile field · tile base @ Work Station & Servery | | TILE | ID-1.8; ID-3.3 view 8; RK §3 | HIGH | TYPE |
| Flooring | CPT-12.1 | Carpet Base @ Work Station & Servery | | TILE | ID-3.3 view 8 | MED — 🚩 finish_schedule p.17 assigns CPT-12.1 to **"BOH & Stairwells."** Both readings carried | TYPE |
| Wall Covering | WC-11 | Wallcovering @ Breakfast Room / Servery | | WC | ID-3.3 views 6–8; finish_schedule p.63 "Lobby, Breakfast Room" | HIGH at Breakfast / MED at Servery (schedule does not list Servery) | TYPE |
| Wall Covering | WC-12 | Wallcovering @ Servery / Hydration Station | | WC | finish_schedule p.64 (Momentum) — **the one place the WC-12 schedule area is affirmatively stated**; ID-3.3 views 6–7 | HIGH at Servery / MED at Breakfast | TYPE |
| Paint | PT-04 · PT-07 | Paint @ Breakfast · ceiling 8'-10" AFF (Breakfast) / 9'-2" AFF (Servery, Work Stations) | | PT | ID-3.3 views 6–8; ID-1.6 | MED | TYPE |
| FF&E - Art / Mirror | — | Art panels at the servery wall (blue dashed). Count not stated | | FFE | ID-3.3 view 8 | MED | TYPE |
| Doors | 006A · 006B | Breakfast — D1, SGL 4'-0"×6'-8", SC WOOD, F1 HM, **45-min**, hardware set **#25** (magnetic hold-open, weatherstrip, closer, latchset, 2 PR hinges) | | DR | A600 | HIGH | TYPE |

⚠ **A514's electrical table is headed "WALK-IN ELECTRICAL SCHEDULE"** — prototype carryover; it covers the whole breakfast/servery set. **Item numbers on the plan govern.**

## §5.6 MEETING ROOM 018

> **Standing note, verbatim from ID-1.7, governs this whole space:** *"Note: Purchasing agent to confirm with owner the quantity of table and chairs in the meeting space."* **Nothing here is a final count.**

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| FF&E - Seating | PA-402 | meeting-room stacking chairs | **3 rows** | FFE | A510.3 line 97 (3 tags in Meeting Room 018); ID-1.7 line 23 prints (×4) | MED — owner confirmation required | TYPE |
| FF&E - Window | PA-400 | corridor window element — **also placed here** | 1 | FFE | ID-1.7 line 33 Meeting Room cluster; **ID-1.7 prints PA-400 (×4)** | **FLAGGED** — 4 tag instances against 3 identified first-floor rooms (Lobby 003, Fitness 023, Meeting 018) plus ID-1.13's *"typical at all corridor windows"*. That is the actual shape of this conflict | TYPE |
| FF&E - Casegoods | — | **Folding tables** — shown **graphically on A510.3 with no tag and no count** | 1 | FFE | A510.3; ID-1.7 line 33 | **FLAGGED — do not invent a tag.** The FF&E spec book is the only place a table code could come from | TYPE |
| FF&E - Misc. | PA-807 | description not stated | 1 | FFE | **A510.3 tags it in Meeting Room 018; ID-1.7 groups PA-8xx under Breakfast/Servery** | **FLAGGED (room + desc)** | TYPE |
| FF&E - Casegoods | PA-310 | **Meeting-room credenza.** ID-4.7 verbatim: *"Specifications: refer to FF&E specifications PA-310 for balance of information."* Millwork: ~12'-6" base-cabinet run, four ~3'-6" bays + 1 1/2" **field-cut fillers each end** (*"fillers subject to change based on field dimensions"*); quartz top; PL-01 exposed with 3mm edgeband to match; black melamine concealed; PL base; ST-01 accent; pulls as specified; French-dovetail drawers, sides into fronts dado, back into sides, melamine bottoms / wood sides | | MW | ID-4.7 — design intent; **A907 (Meeting Room) is the architectural twin and has NOT been read** | MED | TYPE |
| FF&E - Art / Mirror | — | Art panel on the WC-10 wall (blue dashed). Count not stated | | FFE | ID-3.3 view 10 | MED | TYPE |
| Flooring | CPT-10 | Carpet Tile @ Meeting Room | | TILE | ID-1.8; A510.4; finish_schedule p.12 "Corridor, TV Lounge, Boardroom" | HIGH | TYPE |
| Flooring | CPT-13 | Carpet, tag as printed `CPT-13` | | TILE | ID-1.8 | **FLAGGED — no CPT-13 card.** The schedule's CPT series is 01, 01.1, 02, 10, 10.1, 11, 12, 12.ALT, 12.1. Do not normalise. ⚠ A510.4 carries CPT-10 only | TYPE |
| Flooring | VCT-15 | VCT, tag as printed `VCT-15`, noted "(typ.)" | | TILE | ID-1.8 | **FLAGGED — no VCT-15 card** (schedule has only VCT-10). Also unclear why VCT appears in a carpeted meeting room — possibly a storage alcove. Do not normalise | TYPE |
| Wall Covering | WC-10 | Wallcovering @ Meeting Room | | WC | ID-3.3 view 10; finish_schedule p.62 "Guest Corridor, Elevator Lobby, TV Lounge" | MED — schedule area does **not** list Meeting Room | TYPE |
| Paint | PT-04 · PT-07 | Paint @ Meeting Room · ceiling "By GC" | | PT | ID-3.3 view 10; ID-1.6 | MED — ⚠ **ceiling height 10'-0" AFF (A510.2) vs 10'-2" AFF (ID-1.6). 2" disagreement between the two RCPs** | TYPE |
| Doors | 018A · 018B | Meeting Room — D1, SGL 3'-0"×7'-0", SC WOOD, F1 HM, no rating, hardware set **#18A** (added by Δ2): 1 Panic Device; 1 Access Control; 1 Wall Stop; 1 Office Lock; 1.5 PR Hinges | | DR | A600 | HIGH | TYPE |

**Adjacent: Meeting Room Storage 029** (A511.1) — no FF&E tagged in it. Door 029: D1, 3'-0"×6'-8", SC WOOD, F1 HM, hardware set #14.

> **The "extra stacking chair" was withdrawn.** The previous package emitted a 4th PA-402 row as an "ID-1.7-only delta" against A510.3's 3. **A510.3 tags PA-402 in TWO rooms** — Meeting Room 018 (3 tags, line 97) and **Sales 022 (line 101)**. Total A510.3 PA-402 instances = **4**, which reconciles exactly with ID-1.7's (×4). There is no delta. The Sales 022 placement is emitted in §5.13.

## §5.7 FITNESS ROOM 023
The most completely described amenity space in the set, because **A510.3's furnishing list spells the items out in words.**

| Cat | Tag | Description | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|
| Appliance | 803 | TREADMILL | OWN | A510.3 "FITNESS EQUIPMENT:" boxed list | HIGH — **no counts printed on any row of this list** | TYPE |
| Appliance | 804 | FITNESS TRAINER ELLIPTICAL | OWN | A510.3 | HIGH | TYPE |
| Appliance | 805 | RECUMBENT CYCLE | OWN | A510.3 | HIGH | TYPE |
| Appliance | 808 | STRENGTH SYSTEM | OWN | A510.3 | HIGH | TYPE |
| FF&E - Misc. | 806 | FREE WEIGHTS & RACK | OWN | A510.3 | HIGH — **recategorised from Appliance**; free weights are not an appliance under any reading of the 21-category list | TYPE |
| FF&E - Misc. | 807 | WEIGHT BENCH | OWN | A510.3 | HIGH | TYPE |
| FF&E - Misc. | 809 | MEDICINE BALLS & RACK | OWN | A510.3 | HIGH — recategorised | TYPE |
| FF&E - Misc. | 810 | EXERCISE BALL | OWN | A510.3 | HIGH — recategorised | TYPE |
| FF&E - Misc. | 811 | EXERCISE MAT | OWN | A510.3 | HIGH — recategorised | TYPE |
| FF&E - Misc. | 800 | TOWEL HAMPER | OWN | A510.3 furnishing list | HIGH | TYPE |
| FF&E - Misc. | 801 | WATER & CUP DISPENSER | OWN | A510.3 | HIGH | TYPE |
| FF&E - Misc. | 802 | GYM WIPES DISPENSER — **not `PA-802`** | OWN | A510.3 | HIGH | TYPE |
| FF&E - Misc. | 812 | RULES SIGN | OWN | A510.3 | HIGH | TYPE |
| Appliance | 813 | WALL MOUNTED TELEVISION | OWN | A510.3; ID-3.2 views 4–7 (wall-mounted monitor/TV) | HIGH | TYPE |
| Low Voltage | 814 | **EMERGENCY TELEPHONE** — accessible reach range, volume control, **min. 28" long cord**, accessible route with clear floor space at the phone | EC | A510.3 furnishing list + keyed note 7 | HIGH | TYPE |
| FF&E - Misc. | 816 | TOWEL HOOK | GC | A510.3 | HIGH | TYPE |
| FF&E - Art / Mirror | 817 | WALL MOUNTED MIRROR. **A510.3 note 2 verbatim: "GENERAL CONTRACTOR TO PROVIDE PLATE MIRROR FOR RECEIPT OF DECORATIVE FRAME (REFER TO HOME 2 FITNESS GUIDE FOR ADDITIONAL INFO."** → the plate mirror is **GC scope**; the decorative frame is not | GC | A510.3 note 2; ID-3.2 views 4–7 (large wall mirrors) | HIGH | TYPE |
| FF&E - Misc. | 819 | WALL MOUNTED CLOCK | OWN | A510.3 | HIGH | TYPE |
| — | 815 · 818 | **absent from A510.3's furnishing list.** If a 815 or 818 bubble appears in the field it has no definition on the sheet | — | — | **FLAGGED** | TYPE |
| FF&E - Casegoods | PA-311 | description not stated | FFE | A510.3 | **FLAGGED (desc)** | TYPE |
| FF&E - Window | PA-400 | description/identity contested | FFE | A510.3 | **FLAGGED** — contradicts ID-1.13's definition of PA-400 as the corridor window element | TYPE |
| FF&E - Lighting | PA-401 | decorative pendant | FFE | A510.3 | MED | TYPE |
| FF&E - Lighting | PA-502 | decorative sconce | FFE | A510.3 | **FLAGGED** — this is a **4th** location for a pair ID-1.7 counts as PA-502 (×3) = three public restrooms. Either ID-1.7 undercounts or A510.3 mis-tags the fitness wall | TYPE |
| FF&E - Art / Mirror | PA-202 | decorative mirror | FFE | A510.3 | **FLAGGED** — same 4th-location problem; and PA-202 is also an ID-1.6 ceiling feature zone | TYPE |
| FF&E - Misc. | PA-506 | fitness item, type not stated | FFE | ID-3.2 views 4–7 | **FLAGGED** — **not on ID-1.7's list and not on A510.3** | TYPE |
| Electrical | KN 3 | **Flush-mounted floor outlet box with brushed aluminum cover plate, coordinate location with fitness equipment — tagged 3 TIMES in this room.** Rough-in must precede equipment placement | EC | A510.4 note 3 | HIGH | TYPE |
| Flooring | RF-15 | Rubber / resilient athletic flooring, tag as printed `RF-15` | TILE | ID-1.8 | **FLAGGED — CONFLICT, both carried.** finish_schedule p.36 has **RF-10 "Rubber Flooring, Fitness Center, Ecore"**; A510.4 also says RF-10. Sheet says RF-15. Do not normalise | TYPE |
| Flooring | RF-10 | Rubber Flooring @ Fitness Center (Ecore) | TILE | finish_schedule p.36; A510.4 | **FLAGGED** — competing with RF-15, no winner picked | TYPE |
| Flooring | RB-11 | Resilient Base @ Fitness Room — Tarkett Monument MW-48-S4 (Supp A) / Mohawk-Durkan H2D14 (Supp B) | TILE | ID-3.2 views 4–7; finish_schedule pp.32/33 — sheet and schedule agree exactly | HIGH | TYPE |
| Wall Covering | WC-14 | Wallcovering @ Fitness Center — National Solutions | WC | ID-3.2 views 4–7; finish_schedule p.66 — agree exactly | HIGH | TYPE |
| Wall Covering | WC-11 | Wallcovering @ Fitness Entry | WC | ID-3.1 view 5 | HIGH | TYPE |
| Flooring | T-01.1 | Tile Base @ Fitness Entry | TILE | ID-3.1 view 5 | HIGH | TYPE |
| Paint | PT-04 | Paint @ Fitness Room | PT | ID-3.2 views 4–7 | MED | TYPE |
| Stone / Surround | ST-01 | Stone @ window sills (typ.) | MW | ID-3.2 view 7; finish_schedule p.41 | HIGH | TYPE |
| Drywall | ACT-01 | Acoustic ceiling tile @ Fitness Center | GC | ID-1.6 (10'-2" AFF); finish_schedule p.8 | **FLAGGED** — ⚠ **A510.2 detail 03 says 9'-3" perimeter with a 10'-0" Tectum 2×2 accent zone; ID-1.6 says ACT-01 at 10'-2".** Disagree | TYPE |
| Doors | 023 | Fitness — D4, SGL 3'-0"×6'-8", ALUM/GL, ALUM frame, hardware set **#7** (closer, continuous hinge, **Advance Card Lock**) | DR | A600 | HIGH | TYPE |

## §5.8 GUEST LAUNDRY 024

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| Appliance | 406 | **COIN OPERATED WASHER** | 1 row, **qty flagged** | OWN | A510.3 furnishing list + space table — **no multiplier printed** | **FLAGGED (qty)** | TYPE |
| Appliance | 407 | **COIN OPERATED DRYER** | 1 row, **qty flagged** | OWN | A510.3 — no multiplier | **FLAGGED (qty)** | TYPE |
| FF&E - Misc. | 408 | DECORATIVE TRASH CAN | 1 | OWN | A510.3 — no multiplier | HIGH | TYPE |
| FF&E - Misc. | PA-109 | description not stated, no multiplier | 1 | FFE | A510.3 / ID-1.7 | **FLAGGED (desc)** | TYPE |
| FF&E - Casegoods | — | **Folding counter millwork** — ~5'-6" wide laminate folding counter, counter below, **stainless steel curtain rod**, **metal bracket install at 48" O.C. max**, scribe to wall, 30" min clearance. Verbatim: *"Blocking to be provided for all wall-mounted shelving brackets."* Laminate: **PL-01 per A904 / PL-01 + PL-02 per ID-4.6** | | MW | **A904 (governs) vs ID-4.6** | **FLAGGED — finish conflict, both carried.** A904's own comparison table: *"⚠ A904 tags only PL-01 at the laundry"* | TYPE |
| Electrical | — | ⚠ **A904: "Guest laundry: no power provision shown or noted. Flag."** | | EC | A904 | **FLAGGED** | TYPE |
| Wall Covering | WC-13 | Wallcovering @ Guest Laundry | | WC | ID-3.2 views 8–10 | MED — ⚠ finish_schedule p.65 **WC-13 row is OCR-garbled**: area and manufacturer both "[confirm in source]". ID-3.2 supplies the location the schedule lost; **product still unknown** | TYPE |
| Wall Covering | WC-10 | Wallcovering @ Guest Laundry | | WC | ID-3.3 views 1–3; finish_schedule p.62 | MED — schedule area does not list Guest Laundry | TYPE |
| Flooring | T-01 · T-01.1 | Floor tile (A510.4) · tile base | | TILE | A510.4; ID-3.2 views 8–10 | HIGH | TYPE |
| Flooring | RB-12 | Resilient Base @ Guest Laundry | | TILE | ID-3.3 views 1–3 | MED — finish_schedule pp.34/35 assign RB-12 to "Engineering & Housekeeping" | TYPE |
| Flooring | RB-10 | Resilient Base @ Guest Laundry / Breakroom run | | TILE | ID-3.3 views 1–3 | **FLAGGED** — ⚠ RB-10 **Supp A is OCR-garbled** (area "[confirm]", mfr "[likely Tarkett]", product Monument MW-280-S4); **Supp B is clean and reads "Employee Breakroom"** (Mohawk-Durkan H2D13) | TYPE |
| Paint | PT-04 | Paint @ Guest Laundry | | PT | ID-3.2 views 8–10 | MED | TYPE |
| Paint | PT-03 | Paint @ Guest Laundry | | PT | ID-3.3 views 1–3 | **FLAGGED** — ⚠ finish_schedule p.26 PT-03 row is OCR-garbled, code inferred from card sequence | TYPE |
| Stone / Surround | ST-01 | Stone @ window sills (typ.) | | MW | ID-3.3 views 1–3; finish_schedule p.41 | HIGH | TYPE |
| Stone / Surround | SF-05 | Solid surface counter, tag as printed `SF-05` | | MW | ID-3.2 view 8 | **FLAGGED — no SF card in the finish schedule.** The SF family is named in project.md; the card is not in the OCR set | TYPE |
| FF&E - Art / Mirror | — | Art panel @ view 9 | | FFE | ID-3.2 view 9 | MED | TYPE |

> **Two keyed notes were previously attached to this room in error and are moved to §5.14.** **A510.1 keyed note 60** (*"PROVIDE AT LEAST ONE ACC WASHING MASHINE AND DRYER; FRONT LOAD WITH OPENING LOCATED 15" MIN & 36" MAX AFF"* [*sic*]) lands at **Laundry 015**, the back-of-house commercial laundry — not Guest Laundry 024. **A510.4 keyed note 5** (coordinate laundry equipment power with the supplier's shop drawings **prior to rough-in**) is tagged **7 times across Laundry 015 and Dryer Room 016**, one per machine position, and **not at Guest Laundry 024 at all.** If the ADA front-load obligation is believed to apply to the guest machines too, that is a **FLAGGED cross-reference**, not a fact about the 406/407 buy. → `OPEN_ITEMS` D6.
> **Responsibility:** ID-3.2 / ID-3.3 both note washers/dryers are typically operator equipment. **Not stated on any sheet** — confirm OF/CI vs OF/OI before assuming Triun buys the machines.

## §5.9 PUBLIC RESTROOMS — WOMENS 019 · MENS 020 · UNISEX 027

**Room-number alias, record both:** A520 labels these **WOMEN 115** and **MEN 116**; A521 labels the unisex **121**. The first-floor plans (A510.1 / A510.2 / A510.4) label them **019 / 020 / 027**. **Plans govern: use 019 / 020 / 027; keep 115 / 116 / 121 as sheet-finding aliases only.** ⚠ Note 115 and 116 are live *guestroom* numbers on floor 1, and 121 is the floor-1 Guest Corridor — a naive join on those aliases will land in the wrong room.

**Tag spelling — do not normalise.** The sheets print `HD-01`, `HD-06A`, `HD-09A`, `HD-12` (two-digit padded) alongside **`HD-7B`** (unpadded). Recorded exactly as printed on ID-3.4.
**Public-restroom HD accessories are kept in their own package and are never merged with the guestroom-bath HD family** (conflicts.md B4.9).

| Cat | Tag | Description / placement | Room | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| Bath Accessory | HD-12 | at the **entry wall** of each room | 019, 020 | GC | A520 plan + elevations | MED — placement stated, **item identity not** (no HD legend in the set) | TYPE |
| Bath Accessory | HD-13 | paired at the **towel/waste wall** (ties to A510.1 keyed note 45 *"TOWEL DISPENSER / TRASH CAN"*) | 019, 020 | GC | A520 | MED | TYPE |
| Bath Accessory | HD-19 | paired at the **towel/waste wall** | 019, 020 | GC | A520 | MED | TYPE |
| Bath Accessory | HD-01 | at the **accessible water closet** (grab bars) | 019, 020 | GC | A520 | MED | TYPE |
| Bath Accessory | HD-06C | at the **accessible water closet** (grab bars) | 019, 020 | GC | A520 | MED | TYPE |
| Bath Accessory | HD-06A | at the elevation walls | 019, 020 | GC | A520 | MED | TYPE |
| Bath Accessory | HD-06B | at the elevation walls | 019, 020 | GC | A520 | MED | TYPE |
| Bath Accessory | HD-09A · HD-09B · HD-09C | **ID-3.4 adds these three; A520 does not carry them** | all three rooms | GC | ID-3.4 | **FLAGGED** | TYPE |
| Bath Accessory | HD-7B | **tag exactly as printed, unpadded.** ID-3.4 only | all three rooms | GC | ID-3.4 | **FLAGGED** | TYPE |
| Bath Accessory | HD-15 | A520 states HD-15 lives on **A521** | 027 | GC | A520 → A521 | **FLAGGED — A521 was read for room identity and ceiling height, but the HD wall-by-wall assignment was not extracted** | TYPE |
| FF&E - Art / Mirror | PA-202 | **decorative mirror above vanity** — mirror centreline dimensioned **~6'-6"** on ID-3.4 | one per room | FFE | ID-3.4 + A510.3 agree | HIGH (this is one of the few printed PA descriptions) | TYPE |
| FF&E - Lighting | PA-502 | **decorative sconce above vanity** | one per room | FFE | ID-3.4 + A510.3; ID-1.7 prints **PA-502 (×3)** = the three restrooms | HIGH — ⚠ but A510.3 also tags PA-502/PA-202 in Fitness 023, which would make four. Not resolved | TYPE |
| GC | — | **Blocking (A520 blocking elevations 4i / 5i / 6i, verbatim):** provide blocking for **vanity · mirror · wall sconce & mirror · grab bar · toilet bowl · tissue dispenser · paper towel dispenser · waste receptacle**, each "as needed". Heights dimensioned: 4", 5", 6", 10", 11", 9 3/4", 1'-0", 1'-1", 1'-1 3/4", 1'-5", 1'-6", 2'-0", 2'-4", 3'-7". **This is the sheet the framer needs before close-in** | 019, 020 | GC | A520 | HIGH | TYPE |
| Flooring | T-01 | Floor Tile @ Public Restrooms | all three | TILE | ID-1.8 | HIGH — ⚠ **the RK verbatim T-01 area ("Lobby, Guest Suite Entry and Guest Suite Bathroom") does NOT include public restrooms.** The sheet places it there anyway. Same class of text-vs-location mismatch as the stair landings. Both carried | TYPE |
| Flooring | T-01.1 | Tile Base @ Public Restrooms | all three | TILE | ID-3.4 | HIGH | TYPE |
| Flooring | T-10 | Wall Tile wainscot @ Public Restrooms — Daltile Color Wheel Classic Glazed Ceramic (Supp A) | all three | TILE | ID-3.4; finish_schedule pp.48/49 | HIGH — ⚠ **T-10 Supp B row is OCR-garbled** (mfr "[likely Ceramic Technics]", product "[confirm in source]"). Supp A is clean; the **area** is corroborated by ID-3.4. Flag is product-level, not location-level | TYPE |
| Wall Covering | WC-11 | Wallcovering @ Public Restrooms | all three | WC | ID-3.4; finish_schedule p.63 | MED — schedule area is Lobby/Breakfast Room, not restrooms | TYPE |
| Wall Covering | WC-02 | Wallcovering, tag as printed | all three | WC | ID-3.4 | **FLAGGED — CONFLICT.** finish_schedule p.61 assigns WC-02 to **"Guest Suite Bathroom."** ID-3.4 shows it in a **public** restroom. The mirror of the §4.3 WC-12 conflict. Both carried | TYPE |
| Drywall | — | ⚠ **Ceiling-height conflict at Unisex 027: A510.2 tags 8'-0"; A521 tags the same room 8'-6".** Gates grid, sprinkler drops and wallcovering height | 027 | GC | A510.2 vs A521 | **FLAGGED** | TYPE |
| Electrical | — | **GFCI receptacle at each vanity with 9" setout** | 019, 020 | EC | A520 view 3 | HIGH | TYPE |
| Doors | 019 · 020 | D1, SGL 3'-0"×6'-8", SC WOOD, F1 HM, no rating, hardware set **#21** (kick plate, wall stop, weatherstrip, closer, **privacy set**, 1.5 PR hinges) | 019, 020 | DR | A600 | HIGH | TYPE |
| Doors | 027 | D1, SGL 3'-0"×6'-8", **GALV HM** door and frame, no rating, hardware set **#21** | 027 | DR | A600 | HIGH | TYPE |

**Not in this package** (handoff): L-01 / L-01A / L-01B / L-01C lavatories, WC-02 water closet, urinal → Plumbing.

## §5.10 GUEST CORRIDORS — 121 (floor 1) · 221 / 321 / 421 (floors 2–4)

| Cat | Tag | Description | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|
| FF&E - Lighting | PA-204 | **decorative corridor ceiling / light fixture**, printed **"(typ.)"**. A120–A123 corroborate: **keyed note 6 "sconce placement" sits next to the PA-204 tag on every floor** | FFE/EC | ID-1.11, ID-1.15, ID-1.16; A120–A123 | HIGH (identity) / **FLAGGED (qty — no count printed on any sheet; no takeoff performed)** | TYPE |
| FF&E - Window | PA-400 | **corridor window element.** ID-1.13 verbatim: *"PA-400 — typical at all corridor windows."* **Neither the window count nor the item type (perch/bench vs window treatment) is stated** | FFE | ID-1.13, ID-1.15, ID-1.16; A904 records the perch-vs-corridor-window question as unresolved | **FLAGGED on both count and identity.** ID-1.7 prints PA-400 (×4) | TYPE |
| Wall Covering | WC-10 | Wallcovering @ corridor walls (typ.) | WC | ID-1.12 (fl 1), ID-1.13 view 1 (typ.); finish_schedule p.62 — agree exactly | HIGH | TYPE |
| Wall Covering | WC-12 | Wallcovering @ typical guest corridor | WC | ID-3.2 view 15 | **FLAGGED** — third instance of WC-12 outside its scheduled "Hydration Station & Servery" area. The pattern suggests the schedule's WC-12 area line is incomplete — **but that is an inference, so it is flagged, not asserted** | TYPE |
| Flooring | CPT-10 | Carpet Tile @ corridor floor | TILE | ID-1.12, ID-1.13 view 1; finish_schedule p.12 — agree exactly | HIGH | TYPE |
| Flooring | CPT-10.1 | Carpet Base @ corridor (floors 2–4) | TILE | ID-1.13 view 2; ID-3.2 views 11–15; finish_schedule p.13 | HIGH | TYPE |
| Paint | PT-07 | Paint @ corridor ceiling, **8'-2" AFF typ., alternating with 8'-0" gyp bulkhead bands** | PT | ID-1.11, ID-1.15, ID-1.16; A120–A123 | HIGH | TYPE |
| Paint | PT-04 | Paint @ typical guest corridor | PT | ID-3.2 view 15 | MED | TYPE |
| Flooring | — | **Tile / transition at corridor ends — UNTAGGED**, no code printed. Standing sheet note: *"refer to architect's drawings for transition details"* | TILE | ID-1.12 | **FLAGGED** | TYPE |
| Electrical | KN 15 | **Convenience outlets in corridors for housekeeping equipment, minimum every 50'** — constrains corridor FF&E placement | EC | A511.2 / A511.3 keyed note 15 | HIGH | TYPE |
| Electrical | KN 51 · KN 53 | ⚠ A511.3 tags both on the typical-floor plan. **51 is undefined anywhere in the sheet group**; 53 (*"provide power for plug in string light"*) is defined only on a list restricted to A510.1–A511.1 | EC | A511.3 | **FLAGGED — flag before rough-in** | TYPE |
| Doors | 121A | D1, SGL 3'-0"×6'-8", **ALUM/GL** in ALUM frame, hardware set **#12**, remarks c, e, g | DR | A600 | HIGH | TYPE |
| Doors | 121B | D1, **(2) 3'-0"**×6'-8", SC WOOD, F1 HM, **45-min**, hardware set **#22** (Public to Corridor Guestroom area — Hager 1303 spring hinges ×6, exit devices, lever trim, closers, **wall magnets 998 ×120vac**, smoke seals, kick plates, cylinders) | DR | A600 | HIGH | TYPE |

**Sequencing:** wallcovering and carpet go in **before** PA-204 / PA-400 install.

## §5.11 ELEVATOR LOBBIES — 137 (ground) · 237 / 337 / 437 (typical)

| Cat | Tag | Description | Room | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| FF&E - Casegoods | PA-501 | elevator-lobby console / feature piece. **No count printed** | 137 · typical | FFE | A510.3 (137); ID-1.13 (typical). Also tagged at Reception 004 | MED / **FLAGGED (qty)** | TYPE |
| Plumbing | 821 | **BOTTLE FILLING STATION** — tagged at Elevator Lobby **137** and again at the restroom-entry side of the corridor. Details **03/A510.1** and **04/A510.1**. **Plumbing rough-in required** | 137 | PC | A510.3 furnishing list; ID-3.2 view 1 | HIGH | TYPE |
| Wall Covering | WC-11 | Wallcovering @ Ground Floor Elevator Lobby | 137 | WC | ID-3.2 views 1–3; finish_schedule p.63 | MED — schedule area is Lobby/Breakfast | TYPE |
| Wall Covering | WC-10 | Wallcovering @ Elevator Lobby | both | WC | ID-3.2 views 1–3 and 11–14; ID-1.13 view 2; finish_schedule p.62 "Elevator Lobby" | HIGH | TYPE |
| Wall Covering | WC-09 | Wallcovering @ elevator-lobby **accent wall** | typical | WC | A511.3 | MED | TYPE |
| Flooring | T-01.1 | Tile Base @ Ground Floor Elevator Lobby | 137 | TILE | ID-3.2 views 1–3 | HIGH | TYPE |
| Flooring | T-01 | Floor Tile @ Elevator Lobby | typical | TILE | ID-1.13 view 2 | HIGH | TYPE |
| Flooring | CPT-10 · CPT-10.1 | Carpet tile · carpet base @ Elevator Lobby | typical (base both) | TILE | ID-1.13 view 2; ID-3.2 views 11–14; finish_schedule pp.12/13 | HIGH | TYPE |
| Paint | PT-04 | Paint @ Elevator Lobby | both | PT | ID-3.2 views 1–3 and 11–14 | MED | TYPE |
| Paint | PT-07 | Paint @ ceiling, 8'-3 3/8" AFF | 237 | PT | ID-1.16 | HIGH | TYPE |
| Stone / Surround | PL-01 | Plastic laminate @ typical elevator lobby | typical | MW | ID-3.2 views 11–14 | MED | TYPE |
| Doors | 137 | D4 ALUM STOREFRONT, SGL 3'-0"×6'-8", GLASS, ALUM frame, hardware set **#10**, remark c | 137 | DR | A600 | HIGH | TYPE |
| Doors | 237.337.437 | **D3 PAIR**, 4'-0"×6'-8", SC WOOD, **F2** HM, **45-min**, hardware set **#23** (magnetic hold open, coordinator, 2 wd auto flush bolts, latchset, 4 PR swing-clear hinges) | typical | DR | A600 upper-floors schedule | HIGH | TYPE |

**Adjacent on the typical floor:** Housekeeping 235/335/435 (VCT-10), Ice Machine 239/339/439 (T-01).
**432 ICE DISPENSER** is tagged at Ice Machine **139** on floor 1 (A510.3). **A510.1 keyed note 24** imposes the accessible ice-machine approach, **floor drain centred under the machine, positive slope, insulated drain pipes.**

## §5.12 BOH SPACES — Food Prep 007 · Dry Storage 008 · Housekeeping 032/235 · PBX 031 · Engineer 021 · Employee Breakroom 014 · Open Storage 017 · Laundry Discharge 013

> ### ⚠ THE BOH CARPET ROWS WERE DELETED. This was a CRITICAL defect.
> The finishes package emitted **CPT-12 carpet, CPT-12.1 carpet base and CPT-12.ALT** across Laundry 015, Dryer Room 016, Dry Storage 008, Open Storage 017 and Laundry Discharge 013, sourced from the finish schedule's "BOH & Stairwells" area alone. **A510.4 — the architect's first-floor finish and power plan, Rev 4 08/09/24 — gives: Laundry 015 / Dryer Room 016 / Open Storage 017 = SEALED CONCRETE (keyed note 4); Dry Storage 008 = T-13 quarry tile. No carpet appears in any of these rooms on the architectural finish plan.** ID-1.8 independently describes BOH flooring as "resilient/utility flooring — RF-11, T-13, T-21, VCT" with no carpet. **Those rows would have bought carpet tile for a commercial laundry.** CPT-12 / CPT-12.1 survive only at **Stairwells**, §5.13.

| Cat | Tag | Description | Room | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| Flooring | — | **Sealed concrete** | Laundry 015 · Dryer Room 016 · Open Storage 017 | GC | **A510.4 keyed note 4** | HIGH | TYPE |
| Flooring | T-13 | **Quarry Tile** — Daltile Quarry Tile 0942 (Supp A) / Ceramic Technics Essentials Quarry (Supp B) | Dry Storage 008 · Food Prep 007 | TILE | **A510.4**; ID-1.8; finish_schedule pp.54/55 "Food Prep" — sheet and schedule agree | HIGH | TYPE |
| Flooring | CPT-12 | Carpet Tile | **Sales 022** | TILE | **A510.4** | HIGH | TYPE |
| Flooring | VCT-10 | VCT @ Housekeeping 032 | 032 | TILE | ID-1.12; finish_schedule pp.58/59 | HIGH | TYPE |
| Flooring | VCT-10 | VCT @ PBX 031 — **separate physical room, separate row** | 031 | TILE | ID-1.12 | HIGH | TYPE |
| Flooring | VCT-10 | VCT @ Housekeeping 235 / 335 / 435 (typical floors) | 235/335/435 | TILE | ID-1.13 view 2 | HIGH | TYPE |
| Flooring | VCT-10 | VCT @ Engineering | 021 | TILE | finish_schedule pp.58/59 "(general / Engineering)" | MED — schedule states the area; no ID sheet reviewed prints VCT-10 at Engineer 021 specifically | TYPE |
| Flooring | VCT | **VCT, tag as printed with NO number** | BOH generally | TILE | ID-1.8 ("BOH … RF-11, T-13, T-21, VCT") | **FLAGGED — VCT-10 is the only VCT card in the schedule; VCT-15 appears on ID-1.8 at the Meeting Room. Which VCT belongs in BOH is not stated. Do not assume VCT-10** | TYPE |
| Flooring | RB-12 | Resilient Base @ Engineer — Tarkett Traditional Vinyl 1/8" Type TV, 38 Pewter (Supp A) / Mohawk-Durkan H2D15 (Supp B) | 021 | TILE | ID-3.3 view 9; finish_schedule pp.34/35 "Engineering & Housekeeping" — agree | HIGH | TYPE |
| Flooring | RB-12 | Resilient Base @ Housekeeping | 032/235 | TILE | finish_schedule pp.34/35 | MED — schedule area only; not printed at Housekeeping on any ID sheet reviewed | TYPE |
| Flooring | RF-11 | ERT rubber tile @ Employee Breakroom — **three unresolved supplier options**: Mohawk-Durkan (Supp A), Milliken (Supp B), Tarkett (Supp C) | 014 | TILE | ID-1.8; finish_schedule pp.37/38/39 "Employee Breakroom" | HIGH — no winner picked among the three suppliers | TYPE |
| Flooring | RB-10 | Resilient Base @ Employee Breakroom — Mohawk-Durkan H2D13 (Supp B) | 014 | TILE | ID-3.3 views 4–5; finish_schedule p.31 Supp B | MED — ⚠ RB-10 Supp A row OCR-garbled | TYPE |
| Paint | PT-03 | Paint @ Employee Breakroom | 014 | PT | ID-3.3 views 4–5 | **FLAGGED — CONFLICT, both carried.** ⚠ PT-03 is OCR-garbled AND finish_schedule p.26 assigns **PT-05 "Employee Breakroom"** | TYPE |
| Paint | PT-05 | Paint @ Employee Breakroom — Sherwin Williams Interior Latex | 014 | PT | finish_schedule p.26 | **FLAGGED** — competing with PT-03; PT-05 appears on **no** ID sheet reviewed | TYPE |
| Paint | PT-03 | Paint @ Engineer | 021 | PT | ID-3.3 view 9 | **FLAGGED** — OCR-garbled, area unknown in the schedule | TYPE |
| Wall Covering | WC-10 | Wallcovering @ Employee Breakroom | 014 | WC | ID-3.3 views 4–5 | MED — schedule area does not list Breakroom | TYPE |
| Paint | PT-07 | Paint @ ceilings — **heights printed per space:** Engineer 8'-0" · PBX 8'-6" · Housekeeping 12'-3 3/8" · Open Storage 8'-0" · Dry Storage 8'-0" · Laundry 12'-0" ("By GC") · Dryer Room 8'-2" · Food Prep per ID-1.6 | various | PT | ID-1.6, ID-1.11 | MED — heights printed per space; the **code** is the sheet-wide predominant ceiling finish, not printed at each space | TYPE |
| Doors | 007A/007B · 008 · 010 · 011 · 012 · 013A/013B · 014 · 021 · 025 · 028 · 029 · 030A/030B · 031 · 032A/032B · 033 | See A600 first-floor schedule for leaf, frame, rating and hardware set per door. Notable: **013A/013B Laundry Discharge are 90-min**; **033 Electrical is scheduled with a GLASS door in a GALV HM frame**; **028 Elevator Equipment carries remark g** | various | DR | A600 | HIGH | TYPE |
| FF&E - Misc. | KN 4 | **"Office furniture by owner"** — the ONE place A510.3 assigns responsibility, and it covers **Managers Office 011 / Engineer 021 / Sales 022 / Open Storage 017 only** | those four | OWN | A510.3 keyed note 4 | HIGH | TYPE |

## §5.13 SALES 022 · STAIRS 100 / 141 · POOL DECK

| Cat | Tag | Description | Room | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| FF&E - Seating | PA-402 | stacking chair — **A510.3 line 101 tags PA-402 at Sales 022.** This is the 4th of ID-1.7's ×4 | 022 | FFE | A510.3 line 101 | MED — **this placement was dropped from the previous package entirely** | TYPE |
| FF&E - Seating | PA-105 | description not stated | 022 | FFE | A510.3 line 101; keyed note 4 | **FLAGGED (desc)** — also dropped previously | TYPE |
| FF&E - Casegoods | PA-306 | description not stated | 022 | FFE | A510.3 line 101; ID-1.7 prints PA-306 (×2) | **FLAGGED (desc)** — also dropped previously | TYPE |
| Flooring | CPT-12 | Carpet Tile @ Sales | 022 | TILE | A510.4 | HIGH | TYPE |
| Doors | 022 | D1, SGL 3'-0"×6'-8", SC WOOD, F1 HM, hardware set **#18** (access control, wall stop, office lock, 1.5 PR hinges) | 022 | DR | A600 | HIGH | TYPE |

### 🚩 STAIR 1 (100) and STAIR 2 (141) — GROUND-FLOOR LANDINGS — THE CARRIED CONFLICT
**Do not resolve. Both readings emitted. Neither is marked superseded.**

| Cat | Tag | Description | Inst | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|---|
| Flooring | T-01 | Floor Tile @ ground-floor landing | **STAIR 1 (100)** | TILE | RK clarification §4 Change 1 — red revision cloud, hatched landing, red leader | **FLAGGED** | TYPE |
| Flooring | T-01.1 | Tile Base @ ground-floor landing | STAIR 1 (100) | TILE | RK §4 Change 1 | **FLAGGED** | TYPE |
| Flooring | T-01 | Floor Tile @ ground-floor landing | **STAIR 2 (141)** | TILE | RK §4 Change 2 — second red cloud, hatched landing at the south end adjacent to the door | **FLAGGED** | TYPE |
| Flooring | T-01.1 | Tile Base @ ground-floor landing | STAIR 2 (141) | TILE | RK §4 Change 2 | **FLAGGED** | TYPE |
| Flooring | CPT-12 | Carpet @ Stairwells — **competing base-spec finish** | both stairs | TILE | finish_schedule p.15 "BOH & Stairwells" (Mohawk-Durkan) | **FLAGGED** | TYPE |
| Flooring | CPT-12.1 | Carpet Base @ Stairwells | both stairs | TILE | finish_schedule p.17 | **FLAGGED** | TYPE |
| Flooring | CPT-12.ALT | **Alternate** Carpet Tile @ Stairwells | both stairs | TILE | finish_schedule p.16 | **FLAGGED — it is an ALTERNATE. No source states whether it was accepted. Do not order against it without a written acceptance** | TYPE |
| Doors | 100A · 141 | Stair — D1, 3'-0"×6'-8", **GALV HM** door and frame, **90-min**, hardware set **#16** (rain drip cap, sweep, threshold, weatherstrip, closer, rim exit device, rim panic interface); 141 carries remark g | 100, 141 | DR | A600 | HIGH | TYPE |
| Doors | 100B | Stair 1 — D1, 3'-0"×6'-8", SC WOOD, F1 HM, **90-min**, hardware set **#15**, remark g | 100 | DR | A600 | HIGH | TYPE |
| Doors | 200.300.400 · 241.341.441 | Upper-floor stair doors — D1, 3'-0"×6'-8", SC WOOD, F1 HM, **90-min**, hardware set **#15** | upper | DR | A600 | HIGH | TYPE |

**Five defects on the RK sheet keep the landing conflict open:** (1) **unrevisioned** — the revision table is a header with no rows, title block still 07/04/2025, so it is a marked-up print not a reissued sheet; (2) the callout text says *"Floor Tile @ Lobby, Guest Suite Entry and Guest Suite Bathroom"* — **"Stair" is not in that list**, yet both leaders point unambiguously into a stair enclosure; (3) **the sheet never says T-01 replaces CPT-12** — it may be a full replacement or only a tile transition zone at the exterior door; (4) **extent is not dimensioned** — no dimension, area or tile count on either hatch; (5) **floors 2–4 are silent** — both stairs run full height, the sheet is Floor 1 only.
**Floors 2–4 stair landings: NO SOURCE. No rows emitted. Do not extrapolate.**

### POOL DECK / PATIO — and the two outdoor zones

**Anti-double-count control.** Two distinct outdoor zones share tags. **Never write a single OF-705 or OF-711 line on a PO without naming the zone.** Cross-zone totals if someone insists on one number: OF-705 = 5 (entry) + 4 *or* 7 (pool); OF-711 = 6 (entry) + 18 (pool) = 24.

**Zone A — Entry / porte-cochère outdoor lounge** (ID-1.9, corroborated by AS102):
OF-700 ×4 · **OF-701 ×1 FLAGGED (on AS102 only, absent from ID-1.9)** · OF-702 ×10 · OF-703 ×4 · OF-704 ×3 · **OF-705 ×5 (zone A instance)** · OF-707 ×3 · OF-708 ×3 · OF-709 ×2 · **OF-711 ×6 (zone A instance)** · OF-716 ×2.

**Zone B — Pool deck / patio.** ⚠ **AS104 is Rev 5 dated 04/09/26 — the newest architectural sheet in the whole set** — and its own file note says it supersedes anything older describing the pool. ID-1.7 is dated 07/04/2025. **The precedence call is genuinely contested; both are carried, no winner picked.**
OF-705 ×4 normal **+ ×3 FLAGGED** (AS104 shows 7) · **OF-705.ADA ×1 FLAGGED** (ID-1.7 only) · **OF-706 ×1 FLAGGED** (AS104 + AS105 only) · OF-710 ×6 · OF-711 ×18 (agree) · OF-712 ×1 · OF-713 ×4 · OF-714 ×2 · OF-715 ×3 normal **+ ×2 FLAGGED** (ID-1.7 shows 5, AS104 shows 3) · OF-718 ×1 · **OF-719 ×1 FLAGGED** (ID-1.7 only) · **CUST-OF-720 ×1 FLAGGED** (ID-1.7 only, **custom ⇒ long lead**).

| Cat | Tag | Description | Trade | Source | Conf | Gran |
|---|---|---|---|---|---|---|
| Flooring | TL-14 | Deck tile, tag as printed `TL-14` | TILE | ID-1.8 "Pool deck / Patio" | **FLAGGED** — finish_schedule pp.56/57 print **T-14 "Floor Tile, Pool Deck"**. Sheet says TL-14. Not normalised. ⚠ the T-14 Supp A card is "marked (A) not (B)" — a card-labelling anomaly | TYPE |
| Flooring | TL-11 | Pool basin tile, tag as printed `TL-11` | TILE | ID-1.8 | **FLAGGED** — schedule prints **T-11 "Tile, Pool Waterline"**. Two differences: code notation and area wording. Not normalised | TYPE |
| Flooring | TL-12 | Depth marker tile, tag as printed `TL-12` | TILE | ID-1.8 | **FLAGGED** — schedule prints **T-12 "Depth Marker Tile, Pool"**; ⚠ its Supp B row is OCR-garbled | TYPE |
| Stone / Surround | ST-01 | Stone @ patio / entry thresholds | MW | ID-1.8; finish_schedule p.41 | HIGH | TYPE |
| Paint | PT-08 | Paint @ **Indoor** Pool Walls & Ceiling Inset — Sherwin Williams Pro Industrial Pre-Catalyzed Water-Based Epoxy | PT | finish_schedule p.29 | **FLAGGED** — 🚩 **the schedule says "Indoor Pool." H2SEP's pool is OUTDOOR** (ID-1.1 "OUTDOOR POOL"; ID-1.6 "Open to Sky"). PT-08 appears on **no** ID sheet reviewed. Likely prototype carryover. **Do not price PT-08 without confirmation** | TYPE |
| Fire Sprinkler | — | AS104 note 37: **≤48" AFF to any operable part at the pool** | GC | AS104 | HIGH | TYPE |
| FF&E - Misc. | — | **Thermally modified / acetylated wood at the porte-cochère trellis** — specialty long-lead, visible from the street, **verify no substitution** | GC | AS102 / AS105 | HIGH | TYPE |
| Doors | 034 · 035 · 036 | Pool Storage 2 / Pool Equipment / Pool Storage 1 — HM in GALV HM frames, hardware set **#14**; 035 is a **D3 pair, (2) 2'-11"**, F2 frame | DR | A600 | HIGH | TYPE |

---

# §6 — CODES IN THE SCHEDULE THAT LAND NOWHERE

Recorded so nothing disappears silently.

| Code | fs page | Schedule area | Status |
|---|---|---|---|
| PT-01 | 22 | Guest Suite Window Wall Accent | Printed on **A550's elevations** but on **no ID-5.x sheet**. Carried in §2.1 at MED. |
| PT-06 | 27 | "[confirm in source]" — ⚠ OCR-garbled | Area unknown **and** appears on no drawing reviewed. Fully unplaced. |
| PL-01 / PL-02 / PL-03 | 19–21 | (general) | Plastic laminate. Carried where a sheet places it (§2.1, §5.x millwork). PL-03 is placed nowhere. |
| ACB-01 | 7 | Reception Desk Ceiling | **Three different locations** — schedule says Reception Desk Ceiling, ID-1.6 says Market 005, ID-3.1 view 3 says Lounge. Ceiling finish, not a light fixture. |
| ACT-01 | 8 | Fitness Center | Corroborated by ID-1.6 at 10'-2" AFF; contradicted on height by A510.2. |
| CPT-12.ALT | 16 | BOH | Alternate. Acceptance not evidenced anywhere. |
| GR-208 | A530 legend | Nightstand Sconce @ QQ Side | **Now placed** — A555 and A556 tag it ×2 outboard; A552 tags it on a King sheet. Gap G-2 closed; the A552 placement is flagged in §2.3. |
| GR-602.ADA / GR-603.ADA | A530 legend | Accessible bed bases | **Now placed** — A551/A552/A554 (GR-603.ADA), A556 (GR-602.ADA ×2). Gap G-5 closed. |
| 901 / 902 / 903 / 904 / 905 | A530 legend | Appliances / electronics | **Now placed** — tagged on A550–A556. Gap G-6 closed. |

