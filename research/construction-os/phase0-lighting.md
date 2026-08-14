# H2SEP Lighting Takeoff Reconnaissance — Phase 0 (Bulb Order for 115-Key Hotel)

Date: 2026-08-14 · Prepared for Austin Jones / Triun C&E · Project: Home2 Suites by Hilton, Eagle Pass TX (Proj. No. 22-014, Prototype v3.0)

Coverage note: all 29 Electrical per-sheet analyses (E100–E801) read in full; RCP analyses A120–A123, ID-1.6/1.7/1.11/3.4 read in full; `data/project.sqlite` queried directly. The two Hilton FF&E spec-book PDFs and the RK Hospitality guest-room submittal were read via full-text extraction with exhaustive keyword scans over 100% of the extracted text (the 37 MB RK PDF's extraction is itself partial — noted below where it matters). No quantity in this report is guessed; anything not printed in a source is flagged.

---

## 1. ANSWER: Does a fixture schedule exist in the electrical set? — YES

**E101 — "Electrical Notes & Legends of Symbols" (sheet 2 of 29) carries the LIGHTING FIXTURE SCHEDULE** (top center-right of the sheet). Austin's assumption that no schedule exists is wrong at the design-set level — the electricians may not have it in hand, but it is in the issued set.

- 22 fixture types, each with description, manufacturer + full catalog number ("or approved equal"), mounting, and Lamp column = **LED for every type** (integrated-LED luminaires; no screw-base retail bulbs on the electrical side).
- **The schedule has per-row Qty and Watts columns that were NOT transcribed into the AI analysis** — the analysis explicitly says "Per-row Qty and exact Watts are in the schedule's right columns — open the PDF." Indicative only: SA/SB poles 137W; public downlights ~10–50W; sconces ~14–47W.
- Source: `drawings/E101.md` (Drive id `1aBVI_6PI9bqza6g6zP4-Npz2SGrB0d2_`); sheet PDF `drawings_split/10-H2S-Electrical-Pages/E101_p02.pdf`.
- All fixtures "verified by architect/owner prior to install"; substitutions need architect approval and (per E800) a COMcheck re-run.
- **E101 spec item #4: the electrician's 1-year guarantee explicitly EXCLUDES lamps** — consistent with the owner/client buying bulbs.

**Second count source already in the set:** E800 (Interior Lighting COMcheck, sheet 28) and E801 (Exterior, sheet 29) contain "Proposed Lighting Power" tables with per-fixture **lamp description, watts/lamp, # lamps, # fixtures, fixture watts** — i.e., a building-wide fixture count by type already exists on paper. Values not transcribed in the analyses. PDFs: `E800_p28.pdf`, `E801_p29.pdf` (analyses: `1z37vKm1FrC3UDBw85sKEChUKzpRQTPn5`, `1yzgmukMxH_oflNKuCV5611suDEIshbrB`). Note both COMcheck certificates carry a wrong carried-over project title ("Bailey's Forest Event Center"; owner Patel Holdings LLC) — flagged in the analyses.

---

## 2. Fixture-type inventory

### 2A. Electrical (architectural) fixtures — E101 Lighting Fixture Schedule — ALL integrated LED, NO bulbs to order (per schedule)

| Type | Description / location | Mfr & model (or approved equal) | Mtg | Lamp |
|---|---|---|---|---|
| R01 | 2" downlight — general public areas | Juno 2CPNC-G2-DB-10LM-27K-90CRI-FL-MVOLT-ZT-WWH | Recessed | LED |
| R02 | 2" downlight — exterior portico | Juno 2CPNC-G2-DB-10LM-27K-90CRI-SP-120-ZT-BBL | Recessed | LED |
| R05 | 2" downlight — dining enclosed booth | Cooper Portfolio LDA2B102R609027D010-2LBD1MB | Recessed | LED |
| R06 | 4" wallwash — elevator/dining service | Cooper Portfolio LDA4A18927DE010-4LLWW0LI | Recessed | LED |
| R10 | 4" downlight — fitness | Cooper Portfolio LDS4C209030D010PS0MW | Recessed | LED |
| T01 | 2x2 troffer — general BOH | Cooper Metalux 22CZ2-39-UNV-L835-CD1-U | Recessed | LED |
| T02 | 2x2 — food prep | Cooper Metalux 22GR-LD5-43-F1-UNV-L835-CD1-U | Recessed | LED |
| S01 | Surface utility — elec/mech/storage | Lithonia BLWP4-30L-SDSM-GZ1-LP835 | Surface | LED |
| S02 | Surface — enclosed stairwells | Cooper Metalux 4SNLED-LD5-47SL-LW-UNV-L930-CD1-U | Surface | LED |
| S03 | Exterior wall sconce | Kichler 55086BK | — | LED |
| S04 | Surface — housekeeping | Lithonia CLX-L48-5000LM-SEF-FDL-MVOLT-GZ10-40K-WH | Surface | LED |
| S05 | Pendant light | Challenger Lighting CA5815 | Pendant | LED |
| S21 | Surface downlight — guestroom restroom | Cooper Halo SMD6R69SWH | Surface | LED |
| TR01 / TR10 | Track / track adjustable — market, reception | Juno TL381L-30K-9CRI-NFL-BL (SAME model both rows) | Track | LED |
| WS01 | Wall sconce — guest corridors | Arkansas Lighting 4093C | Wall | LED |
| WS02 | Wall sconce — lobby restrooms | **NO MODEL LISTED on sheet** | Wall | LED |
| WS03 | Wall sconce — guestroom vanity | Arkansas Lighting 3550V | Wall | LED |
| WP | Wall pack | Lithonia WPX2-LED-30K-MVOLT-DBLXD | Wall | LED |
| G01 | Exterior linear string light | American Lighting LS-MS-24-100-BK | — | LED |
| SA / SB | Exterior area light, 1-lamp / 2-lamp pole | Lithonia KAD-LED-60C-700-30K-R3-MVOLT-SPD04-DDBXD | Pole | LED |

Counts known for this family:
- **SA/SB pole luminaires: "~17" Lithonia KAD LED units** per the E600.1 Photometric Site Plan luminaire list (analysis prints the qty as approximate — VERIFY exact count on `E600.1_p26.pdf` / E600). Analyses: `12y48Fy8XHDMbT0-FgDgVTOw3xAZvAwLj` (E600.1), `1L4ZryURV4_Wmy5eVqgrWfS1mbzpxha6B` (E600).
- Everything else: counts exist ONLY in the untranscribed E101 Qty column and E800/E801 COMcheck tables, or via takeoff (see §4).
- Guestroom-repetition shortcut: **S21 (bath downlight) and WS03 (vanity sconce) are 1-per-guestroom items per E400/E101/A530 → 115 each** if the typical room plans hold (sqlite `items` rows ITM-0023/ITM-0024 record them "All guestroom types", HIGH reliability — but per-room multiplicity beyond 1 is not printed; treat 115 as floor, verify on E400 PDF).
- Additional types on plans NOT in the transcribed schedule: **X1, X2** (stair lighting per E200–E203 keyed notes, circuits 1A-31/33), and the A120-series RCP legend letters (R/L/M/P/W/EX incl. "cove strip", "undermount linear", "pendant at banquette", "wall pack"). X1/X2 lamping unverified — see gaps.

### 2B. FF&E decorative fixtures, GUEST ROOMS (GR-2xx) — the actual BULB order

Specs from **"Home2-Dynamic FF&E Specifications Guest Suites — Seating, Lighting, Bed sets, Casework, Window treatments.pdf"** (Drive id `1bpuBuYy6tM1Yj5naLnM0u8ueIU4VodQE`; required vendors Arkansas Lighting / Illumination Lighting / Trinity Lighting). Counts from `/home/user/h2sep-checklist/data/project.sqlite` `room_items` (derived from A550–A556 room-type plans × the 115-room spine; reliability HIGH unless noted).

| Tag | Item (spec book name) | Lamp spec (verbatim fields) | Lamps/fixture | Fixtures bldg-wide | Bulbs |
|---|---|---|---|---|---|
| GR-200 | Side Table Lamp (round base, tapered shade) | **A15 LED, E26 Medium Socket, 2700K — 8.5W** | 1 | **115** | 115 |
| GR-201 | Desk Lamp (articulated) | **A15 LED, E26 Medium Socket, 2700K — 10W** | 1 | **115** | 115 |
| GR-202 | Nightstand Sconce (wall-mounted, corded) | **Replaceable LED Board, 2700K — 10W** (integrated, NO bulb) | board | **132** | 0 |
| GR-203 | Vanity Sconce (48"W x 2.5"D x 5"H, hardwired) | **Replaceable LED Board, 3000K — 24W** (integrated, NO bulb) | board | **115** | 0 |
| GR-204 | Sconce @ Wall Hooks (casegood-mounted, corded) | **A15 LED, E26 Medium Socket, 2700K — 8.5W** | 1 | **107** | 107 |
| GR-205 | Floor Lamp @ Guest Suites (sleeper sofa) | **A15 LED, E26 Medium Socket, 2700K — 10W** | 1 | **115** | 115 |
| GR-206 | Table Lamp @ Accessible Working Wall (fluted) | **A15 LED, E26 medium socket, 2700K — 8.5W** | 1 | **2** | 2 |
| GR-207 | Nightstand Sconce @ QQ Center (2-shade, plug-in) | **Replaceable LED Board, 2700K — 10W each / 20W total, "Lamp Quantity: 2 (1 per shade)"** (NO bulb) | 2 boards | **47** | 0 |
| GR-208 | Nightstand Sconce @ QQ Side (52" OC AFF) | **Replaceable LED Board, 2700K — 10W, qty 1** (NO bulb) | board | **99** | 0 |

**Screw-base bulb subtotal (guest rooms): 454 × A15 LED, E26 medium base, 2700K** — split **224 @ 8.5W** (GR-200 115 + GR-204 107 + GR-206 2) and **230 @ 10W** (GR-201 115 + GR-205 115). Zero other bulb sizes in the guest-room package. Plus attic stock as the client wishes.

Count derivations (sqlite, per room type — key counts: King Studio 57, KS Connecting 1, KS Acc 2, King One Bdr 3, K1B Acc 3, Queen-Queen 31, QQ Conn 6, QQ Ext 6, QQ Wide 2, QQ Wide Conn 2, QQ Acc 2 = 115):
- GR-207 (47): QQ 31 + QQ Conn 6 + QQ Ext 6 + QQ Wide 2 + QQ Wide Conn 2. QQ Acc uses a GR-202 at center instead (ITM-0661).
- GR-208 (99): 2 per QQ-family room (31/6/6/2/2 ×2 = 94) + 4 in the two QQ Acc + **1 FLAGGED instance in room 118 (King Studio Acc Mod Connector)** — printed as GR-208 on A552 keynote 56, recorded as printed with flag F-4 (a QQ item tagged in a King room). Verify room 118 before ordering its sconce.
- GR-204 (107): 58 King-Studio-family ("working wall") + 49 QQ-family; absent in K1B (6 rms) and KS Acc (2 rms).
- GR-202 (132): 2× in King Studio/KS Conn/K1B/K1B Acc (114+2+6+6) + 1× in KS Acc (2) and QQ Acc (2).
- GR-200/201/203/205: 1 per room, all 115 rooms.

Note: the **RK Hospitality FF&E Guest Room Shop Drawings/Specs/Product Data submittal** (`1yWG61b5tTRk9a37npjB8gil0JH-0-k-J`, Submittals folder) contains NO GR-2xx lighting content in its extractable text — it is casegoods (working wall incl. **integrated LED strip light in closet, 2700K, with LED switch** — part of the casegood, no bulb). The extraction of this 37 MB PDF is partial; a lighting section could exist in unextracted pages. UNVERIFIED.

### 2C. FF&E decorative fixtures, PUBLIC AREAS (PA-2xx = Lighting series)

Specs from **"Home2-Dynamic FF&E Specifications Public Areas — Seating, Lighting, Casegoods, Win T, Art-Mirrors, Outdoor, Millwork.pdf"** (`1vC3HV7dT-WoVHspJaZg3RvuONwmKlQi_`).

| Tag | Item | Lamp spec | Lamps/fix | Fixture count | Bulbs |
|---|---|---|---|---|---|
| PA-200 | Perch Table Lamp | **"Product Deleted" (May-23) — "No spec for Perch Table lamp"** | — | tag still placed on ID sheets (sqlite: Lobby 003) | **GAP** |
| PA-201 | Pendant Lighting @ Focus Booth (27" dia bell) | **A15 LED, E26 Medium Socket, 3000K — 11W, qty 1**, hardwired | 1 | **UNVERIFIED — takeoff** | ? |
| PA-202 | Bathroom Vanity Light (24"W cylinder bar; 3 suppliers A/B/C) | **15W LED board / LED strip, 3000K** — lamp-quantity field prints "2" (integrated, NO bulb) | 2 boards | tagged **×3** (Womens 019, Mens 020, Unisex 027) per ID-1.7/ID-3.4 | 0 |
| PA-203 | Floor Lamp @ TV Lounge | **A15 LED, E26 Medium Socket, 2700K — 10W, qty 1** | 1 | UNVERIFIED — takeoff | ? |
| PA-204 | **Wall Sconce @ Guest Corridor** (cylinder, hardwired) | **LED E26 medium socket, 3000K — 11W**, lamp-quantity field prints "2" | 2 | **UNVERIFIED** — tagged "(typ.)" on ID-1.11/1.15/1.16 + A120–A123 keyed note 6; per-corridor count never printed. Takeoff from E200–E203 / ID corridor PDFs required | ? |
| PA-205 | Pendant Lighting @ Reception | **A15 LED, E26 Medium Socket, 3000K — 11W, qty 3** | 3 | UNVERIFIED — takeoff | ? |
| PA-206 | Table Lamp at TV Lounge | **A15 LED, E26 medium socket, 2700K — 8.5W** | 1 | UNVERIFIED — takeoff | ? |

Every public-area FF&E screw-base is again **A15 LED / E26** (8.5W-2700K, 10W-2700K, or 11W-3000K). PA-205's bell pendant takes 3 lamps each.

Other decorative/lighting items logged in sqlite `space_items`: PA-201/202/205/117 "dashed decorative ceiling/lighting feature zones" over Breakfast/Lobby/Market-Servery on ID-1.6 (which tag covers which space NOT printed — FLAGGED); PA-401 "decorative pendant (typ.) over the lounge" (×2 rows, Lobby); LED tape light at all open servery shelves (A902); emergency exit lights; Unisex 027 RCP fixtures (R wet-location downlight, W wall sconce, EX exit) from A521.

---

## 3. Fixture counts that EXIST today vs. counts requiring takeoff

**Exists now (citable):**
- Guest-room FF&E lighting: full per-room and building totals in `data/project.sqlite` (table above) — 115/115/132/115/107/115/2/47/99.
- PA-502-family restroom items ×3; PA-202 vanity light ×3 restrooms (ID-1.7 prints "PA-502 (×3)"; ID-3.4 shows one per vanity).
- SA/SB site poles ≈17 (E600.1 luminaire list — approximate as transcribed; verify).
- S21 + WS03: 1 per guestroom per E400/E101 → 115 each (multiplicity >1 not printed; verify on E400 PDF).
- On paper but NOT transcribed: **E101 schedule Qty column** and **E800/E801 COMcheck # fixtures / # lamps tables** — reading those 3 PDF pages is the single fastest way to a building-wide architectural-fixture count.

**Requires actual takeoff against `drawings_split` single-sheet PDFs** (symbols placed, never tabulated): R01/R02/R05/R06/R10, T01/T02, S01/S02/S04/S05, TR01/TR10, WS01, WS02, WP, G01 (length), X1/X2, exit/emergency units — sheets `E200_p12`, `E201_p13`, `E202_p14`, `E203_p15`, `E301_p18`, `E400_p19`, `E600_p25`; PA-201/203/204/205/206 fixture counts — ID-1.6/1.7/1.11/1.13–1.16 + E200–E203.

---

## 4. GAP LIST (candidates for next round: manufacturer web search, PDF takeoff, or Austin/RFI)

1. **E101 Qty + Watts columns** — read `E101_p02.pdf`. Highest-value single read.
2. **E800/E801 COMcheck proposed-lighting tables** — building-wide # fixtures & # lamps per type; read `E800_p28.pdf`/`E801_p29.pdf`. (Also fix the wrong COMcheck project title for the permit record.)
3. **WS02 (lobby-restroom sconce): no model number on E101** — RFI, and reconcile against FF&E PA-202 (possible double-buy: electrical WS02 vs FF&E PA-202 in the same rooms).
4. **Dedupe electrical vs FF&E fixtures**: WS03 Arkansas 3550V (electrical) vs GR-203 (FF&E, same vendor Arkansas Lighting, both "guestroom vanity") — almost certainly the same physical fixture, spec'd twice; likewise WS01 Arkansas 4093C vs PA-204 (both "guest corridor" sconces). Confirm who buys which before any order.
5. **PA-204 corridor sconce count** — "(typ.)" only; takeoff needed. 4 corridors (121/221/321/421).
6. **PA-200 deleted product** whose tag still appears on ID sheets — confirm with owner/purchasing whether a perch table lamp is still required.
7. **Tag-family conflicts** (RFI-grade): drawing tag **PA-401 "decorative pendant"** vs spec book **PA-401 = Roller Shade @ Fitness/Breakroom** (400-series = Window Treatment); **PA-502** printed at restroom vanities as "sconce" on ID-3.4 analysis while spec book **PA-502 = Bathroom Mirror** (500-series = Art & Mirrors) and PA-202 is the vanity LIGHT — tags appear swapped on the ID sheets; **PA-117** (ID-1.6 ceiling feature zone) has NO entry in the spec book at all.
8. **X1/X2 stair fixtures** — on E200–E203 keyed notes but absent from the 22-type schedule transcription; verify type/lamping on the E101/E200 PDFs.
9. **Do fixtures ship with lamps?** The Hilton spec pages give lamp specs but never say lamps are included; E101 excludes lamps from warranty. Confirm with the FF&E vendor (Arkansas Lighting / Illumination Lighting / Trinity Lighting — contacts on spec pages: mgunter@arkansaslighting.com, annette@illuminationlighting.com, shutchison@trinitylighting.com) or with RK Hospitality; otherwise the 454+ A15 bulbs must be bought outright.
10. **Replaceable LED boards as spare parts** (GR-202 ×132, GR-203 ×115, GR-207 ×94 boards, GR-208 ×99, PA-202/PA-204 boards): not "bulbs," but the client may want attic stock — manufacturer part numbers not printed; vendor inquiry.
11. **"All quantities to be verified by hotel operator prior to purchasing"** — standing instruction on every FF&E lighting spec page; meeting-room quantities additionally "confirm with owner" (ID-1.7 note).
12. **Room 118 GR-208 flag (F-4)** and A123's two real type changes (403 QQ Connector, 438 King Studio Accessible) — verify against room matrix before finalizing per-room counts.
13. **SA/SB exact pole/head count** ("~17" approximate; SB is 2-head, so heads ≠ poles) — verify on E600/E600.1 PDFs.
14. **G01 string light** run length/quantity (site) + corridor "plug-in string light" power (A511.3 KN53, floors 2–4 — the string light itself is unspecified anywhere found). UNVERIFIED.
15. Integrated millwork lighting (closet LED strip in working wall; servery LED tape; undercabinet lighting "by others" with outlet only per A55x kn50) — confirm supplier/scope; no bulbs.
16. Guestroom shower wet-location light (A55x kn18 / E101 Note 1: enclosed, gasketed, wet-location) — FLAGGED row ITM-0025; confirm whether S21 serves this or a separate fixture exists.

---

## 5. Source register

| Source | ID / path |
|---|---|
| E100–E801 analyses (29 files, all read) | Drive folder `drawings` = `1TbePa-dtCeiQdTRFiw0pg1EZ9GUtdljZ` (under H2SEP_AI_Context `1A3nUR8TOBvxVc4wO-iOp4oCguPo6x5vG`); key: E101 `1aBVI_6PI9bqza6g6zP4-Npz2SGrB0d2_`, E400 `1Ymk_QKJ29ziMW1iSyenCAjiQRbtpmojt`, E800 `1z37vKm1FrC3UDBw85sKEChUKzpRQTPn5`, E801 `1yzgmukMxH_oflNKuCV5611suDEIshbrB`, E600.1 `12y48Fy8XHDMbT0-FgDgVTOw3xAZvAwLj` |
| RCP analyses | A120 `1UDVUw-U64NpgeUt6W20Vivi2T22_GVf7`, A121 `1SfBIS7IIsTD1tvF6c2CFTYG7ZQ64IE2k`, A122 `1mlQh6f71UVuv6HBRhdt17ye5t6Yqhebb`, A123 `1dtPTuhqlzv1NwHlS2xL-N8HjQt3enLpk` |
| ID-series | ID-1.6 `1IRuVYzmYyx95dp-Y0iMDdSLXUIWqA5nf`, ID-1.7 `1sw_LmB8xW0HnYZTD5TQSV6bZh0NHasZU`, ID-1.11 `1t5_wIjpe-pGR41fLzSVmmM2hOsirn2SD`, ID-3.4 `1EZz9xgKIDUAVsgrYKnEFLV2jlBa2npys` |
| Guest Suites FF&E spec book (GR lamping) | `1bpuBuYy6tM1Yj5naLnM0u8ueIU4VodQE` (Home2Suites Specs folder `1rGOOzJwswUOgXBwRMamXSI_XAcqeOfxY`) |
| Public Areas FF&E spec book (PA lamping) | `1vC3HV7dT-WoVHspJaZg3RvuONwmKlQi_` |
| RK Hospitality Guest Room submittal (casegoods; no GR-2xx lighting in extract) | `1yWG61b5tTRk9a37npjB8gil0JH-0-k-J` (Submittals folder `1fLJO0537clxG-wmQ8FGf14giaD-LdF6O`) |
| Room/fixture counts DB | `/home/user/h2sep-checklist/data/project.sqlite` (tables `room_items`, `space_items`, `room_types`, `items`) |
| Takeoff PDFs (next round) | `drawings_split/10-H2S-Electrical-Pages/…` per-sheet files named in §3/§4 |
