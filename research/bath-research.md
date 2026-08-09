# Bath Fixture Research — Room-Type Restroom Scope (Room 101, QQ Wide Connecting)

**Drive-verified only. Every claim cites a Drive file (title + id) or a DB row (src sheet).**
DB = `data/project.sqlite` in the app repo (source of truth per Austin's ruling #1).
Room 101 is **non-accessible** (rooms.accessible=0, src A100) — its bath is a **shower bath, not a tub bath** (A530: "the standard guest bath is a SHOWER, not a tub", carried on DB row ITM-0645).

Master citations used throughout:

| Short name | Drive file | id |
|---|---|---|
| P104 schedule | `P104.md` (AI Context extract of P104 Plumbing Fixtures Schedule, Rev 08/09/24) | `18BLFBqeAYdNNj7Pxo8lKHybgKHZTYMBY` |
| A530 extract | `A530.txt` (Enlarged Unit Bathroom — HD legend, keyed notes, GR legend) | `1zey5TySJPt0PO8clXOM1rrFFRBSfxiTB` |
| G402 extract | `G402.md` (Accessibility for Guestrooms — TA accessory schedule + ADA details) | `1zyL4M5_pjJtxKiQx38_3-xKPwrZ-6HeS` |
| Moen vanity faucet cutsheet | `Moen Bathroom Vanity Faucet.pdf` (Submittals › Bathroom Vanity & Kitchenette Sink & Facuet - PD & Cutsheets) | `1cJVzmAEPWJPpKAN9Gm9GemcC1ktzPhdE` |
| AmStd vanity sink cutsheet | `American Standard Bathroom Vanity Sink.pdf` (same folder) | `14O35Dqt2gqUH5QPf51dPY_p5YqmNMf4e` |
| Moen kitchenette faucet cutsheet | `Moen Kitchenette Faucet.pdf` (same folder) | `12hxybuB0ibfs__1X5RgmrwVvyXAV90Db` |
| AmStd kitchenette sink cutsheet | `American Standard Kitchenette Sink.pdf` (same folder) | `17ckGAqG7vHvhjZmr2Xu9OXuZthF-fgVc` |

---

## 1. Toilet — WC-3 / WC-4

**As specified (P104 schedule, Drive id 18BLFBqeAYdNNj7Pxo8lKHybgKHZTYMBY):**
- **WC-3** (Guestroom, Floor Outlet, **ADA**): **American Standard Champion Pro 211AA.104**, flush tank manual **1.28 GPF**, seat **AS 5257A.65C.020** slow-close elongated closed-front w/ cover. Connections 1/2" CW, 3" S/W, 2" V.
- **WC-4** (Guestroom, Floor Outlet): **American Standard Cadet Pro 215CA.104**, same 1.28 GPF tank + same 5257A.65C.020 seat.
- DB row ITM-0042 (src P401/P402 marks; P104; A530 kn19/kn21) carries both marks **FLAGGED**: "which mark lands on which unit type is never assigned by any source." Room 101 is non-accessible, which points at WC-4, but no drawing says so — do not resolve silently.

**ADA line:** 1.28 GPF tank type; A530 keyed note (Drive id 1zey5TySJPt0PO8clXOM1rrFFRBSfxiTB): **"LEVER REQUIRED ON THE SIDE OF TANK OPPOSITE INSIDE CORNER OF WALL"**; G402 TA 15 requires **blocking** at the toilet; G402 cross-ref G600: 60"×56" WC clearance (accessible baths). Champion Pro 211AA.104 is the mark P104 itself designates ADA.

**Cutsheet / dims:** No toilet cutsheet exists on Drive (searched Submittals + fullText for model numbers). **Dims NOT FOUND ON DRIVE — awaiting Austin** (no submittal; per ruling #5, not chased).

## 2. Lavatory / vanity sink — L-3 / L-4 (+ proposed substitution)

**As specified (P104):** **L-3** (Guestrooms, Undermount, Rect, ADA) and **L-4** (Guestrooms, Undermount, Rect): **Decolav Callensia 1402-CWH**, both with faucet Delta 581LF-GPM-PP (see §3). DB row ITM-0043 (src P401/P402 marks; P104) carries the **DUAL MARK**: P401/P402 print L-2, P104 schedules L-3/L-4; P104's own L-2 is the employee/pool wall-hung lav. No Decolav cutsheet on Drive → **Callensia dims NOT FOUND ON DRIVE — awaiting Austin.**

**On Drive instead — PROPOSED SUBSTITUTION (not approved):** `American Standard Bathroom Vanity Sink.pdf` (id 14O35Dqt2gqUH5QPf51dPY_p5YqmNMf4e) = **American Standard Studio® Under Counter Sink 0614.000** (unglazed rim) / 0614.300 (glazed underside) / 0618.000 (larger). DB row ITM-0045 (src "S4 product data", reliability FLAGGED): "catalogue pages, no model ticked, no stamp — not a submittal, supersedes nothing today."
- **Dims (0614 cutsheet):** rim **19-3/4" × 13-3/4"** (502×350 mm); bowl **18" W × 12" F-B × 6-7/16" deep**; vitreous china, front overflow. (0618: 23-5/8" × 16-5/8".)
- **ADA line (printed on the cutsheet):** "MEETS THE AMERICANS WITH DISABILITIES ACT GUIDELINES AND ICC ANSI A117.1… Install lavatory **864mm (34") from finished floor**. Lavatory installed **102mm (4") minimum from front edge of countertop** provides **686mm (27") knee clearance**." Marked **BARRIER FREE**.
- Vanity context (G402 details 03/06, all 115 keys): counter **2'-10" MAX** height, vanity **5'-8" W × 2'-1" D**; accessible variant open below w/ 2'-3" min clear + pipe wrap (TA 24).

## 3. Vanity faucet

**As specified (P104, L-3/L-4 remarks):** **Delta 581LF-GPM-PP**, manual, **1.0 GPM**, less 3-hole escutcheon. Also on DB row ITM-0044 (src P104). No Delta cutsheet on Drive → **dims NOT FOUND ON DRIVE — awaiting Austin.**

**On Drive instead — PROPOSED SUBSTITUTION (not approved):** `Moen Bathroom Vanity Faucet.pdf` (id 1cJVzmAEPWJPpKAN9Gm9GemcC1ktzPhdE) = **Moen M-Dura 9417F12** (1.2 gpm, without drain) / **9419F12** (1.2 gpm, all-metal drain), single-handle lavatory faucet, chrome, WaterSense, 1255 Duralast cartridge. Same FLAGGED status via DB row ITM-0045 — and it notes: **if stamped, the countertop cutout changes from 3-hole to single-hole** ("THIS FAUCET IS DESIGNED TO BE INSTALLED THRU 1 HOLE, 1-1/4" MIN. DIA." per cutsheet).
- **ADA line (printed on cutsheet):** "**ADA for lever handle**" — lever style handle, temperature controlled by 100° arc of travel (no tight grasping/twisting, consistent with G402 general note 11 / A530 general note G).
- **Dims (cutsheet critical dims):** overall height **6-1/2"** (165mm); spout tip height ~**4-1/2"** (114mm); reach **4-7/8"** (124mm); base **2"** (51mm); deck-to-aerator dims 6-3/4"/4" as printed; max deck thickness 3-3/4".

## 4. Kitchenette / wet-bar sink + faucet — SK-3 / SK-4

DB row ITM-0051 (src P401/P402; S4 product data, reliability **FLAGGED**): "Kitchenette / wet-bar sink + faucet — American Standard PEKOE 18SB.10231800.075 + Moen 8227." Flag verbatim: P401/P402 restrict SK-3/SK-4 to "the suite/extended units" and assign them to none of the 7 unit plans; **P104 schedules no product for either mark** (P104's SK-1/SK-2 are laundry sinks — confirmed against the P104 Drive extract).

**Drive cutsheets (both in Submittals › Bathroom Vanity & Kitchenette Sink & Facuet folder):**
- `American Standard Kitchenette Sink.pdf` (id 17ckGAqG7vHvhjZmr2Xu9OXuZthF-fgVc) = **American Standard PEKOE® 18SB.10231800.075**, 18-ga stainless undermount single bowl. **Dims: 23" × 18" × 10" deep** (584×457×254 mm); bowl 21" × 16" × 10"; 26" cabinet required.
- `Moen Kitchenette Faucet.pdf` (id 12hxybuB0ibfs__1X5RgmrwVvyXAV90Db) = **Moen M-Dura 8227**, two-handle **8" widespread** faucet, chrome, 1.5 gpm, 3-hole (1-9/32" min dia). **The cutsheet itself is titled "M-DURA Two-Handle LAVATORY Faucet"** — matches the DB flag that the "Kitchenette Faucet" file is on its face a lavatory faucet. **Dims:** printed critical dims 13-1/4" (337mm) / 14-1/2" (369mm) overall; spout ~3-1/4" (82mm) h × reach dims as printed; 8" (204mm) centers.
- **ADA line (Moen 8227 cutsheet):** "**ADA for lever handles**", 1/4-turn operation.

**Whether Room 101 (QQ Wide Connecting) actually gets SK-3/SK-4 is unassigned by the drawings — carried FLAGGED, awaiting Austin.**

## 5. Tub / shower hardware

**Room 101 scope = shower (SH-1 / SH-4 dual mark), NOT a tub.**
- DB row ITM-0645 (src P401/P402 mark SH-1; P104 SH-4; A530): **Kohler Rely series**, **30" × 60" pan, center drain, 4" threshold**, **Delta T24859** supply/trim, SS-01 Mincey Marble solid surround. P104 Drive extract confirms: SH-4 = Guestroom shower, Kohler Rely, 30"×60" pan, **4" threshold**, Delta T24859 (SH-3 ADA variant = same pan, **no threshold**). Shower head/trim also on DB row ITM-0049 (Delta T24859, src A530-A533 kn 9; P104) and pressure-balancing valve DB row ITM-0050 (A530 kn14).
- Door: bi-pass sliding glass, brushed aluminium, clear glass, **24" bar pull** — DB row ITM-0646 (A530 kn28; A550/A555 kn5), text confirmed in the A530 Drive extract.
- No Kohler or Delta cutsheet on Drive → **trim dims NOT FOUND ON DRIVE — awaiting Austin.**

**BT-1 (bathtub) — NOT in Room-101 scope.** P104: **BT-1** Bathtub (Guestroom, ADA) = **American Standard Princeton 2390.202**, supply **Delta T14261 / R10000-UNWS**. DB rows ITM-0703/0712/0721 carry it only on the 7 accessible keys, **FLAGGED** behind the open tub-vs-roll-in conflict (conflicts.md A11 / C-01 — "Do not order the 438 bath package off either matrix"; Austin's RFI to MWT). Tub rim band 17" min / 19" max AFF (DB note + G402 detail 01). No AS Princeton cutsheet on Drive → **tub dims NOT FOUND ON DRIVE — awaiting Austin.**

**ADA line (shower/tub, from G402 Drive extract):** hand-held shower units require on/off control with **non-positive shut-off** (A530 keyed note); shower hose **min 59"** long; controls 15"–48" AFF, no tight grasping/pinching/twisting; floor slope max **1:48**; accessible shower head/rod "maximize +6'-2" to 6'-6"" ; folding seat top at 2'-3", max 6" projection folded; clear floor 30" min / 34" clear.

## 6. Accessories (HD-*) — Bobrick CONFIRM/REFUTE

**Bobrick: NOT CONFIRMED — zero evidence on Drive.** A `fullText contains 'Bobrick'` search across the entire Drive returns **no files**. No accessory cutsheet or submittal of any brand exists in the Submittals folder (contents enumerated: RK Hospitality FF&E pdfs, Kalisher art, fire alarm/sprinkler shops, appliance folders, vanity/kitchenette sink-faucet folder — nothing for HD accessories). The governing drawing (G402, id 1zyL4M5_pjJtxKiQx38_3-xKPwrZ-6HeS) deliberately names no manufacturer: the TA accessory schedule header reads **"REFER TO STANDARDS MANUAL FOR ACCEPTABLE MANUFACTURERS."**
→ **Accessory manufacturer + models: NOT FOUND ON DRIVE — awaiting Austin** (matches SESSION_HANDOFF §5 open item "Confirm restroom accessory manufacturer (Bobrick?)" and ruling #5: never chase).

**Room 101 accessory set (DB room_items, room_no=101):**

| Tag | Item (DB description) | Qty | Src sheet | ADA/mounting line (Drive-cited) |
|---|---|---|---|---|
| HD-03 | Toilet Tissue Dispenser | 1 | A530:40 (vanity wall elev 02), MEDIUM reliability — elevation-sourced | Blocking required (G402 TA 1.2); within 27"–80" AFF protrude ≤4" (G402 note 10) |
| HD-08 | Grab Bar ADA 24" **vertical** mount | 1 | A530:43 (shower wall elev 03), MEDIUM — elevation-sourced | A530: "WALL MOUNTED GRAB BARS W/ REQUIRED CLEARANCES — **12" ABOVE AND 1-1/2" BELOW**. REFER TO ACCESSIBILITY STANDARDS & HADG"; G402: blocking rated **250 lbs** vert+horiz |
| HD-12 | Robe / Coat Hook | 2 | A530:35 | Blocking (G402 TA 2/TA 21); protrusion ≤4" rule |
| HD-16 | Shower Soap Dispenser, surface mtd | 1 | A530:35; A532.1:30; A533:44 | A530 kn24 blocking for amenity dispenser; controls-reach band 15"–48" AFF (G402 note 11) |
| HD-18 | Shower Footrest, surface mtd | 1 | A530:35 | A530: "PROVIDE BLOCKING FOR FOOTREST AS NEEDED"; G402 TA 14.2 blocking required |
| HD-21 | Soap Dish, surface mtd | 1 | A530:35 | G402: soap dishes are among the few TA items **not** blocking-checked; accessible soap-dish band 17"–19" AFF at tub (G402 det 01) |
| HD-22 | Towel Bar **24"** | 1 | A530:35 | Length from A530 HD legend ("TOWEL BAR 24""); blocking required (G402 TA 5) |

Full HD legend (A530 Drive extract) also defines HD-01/02 TP holders, HD-05/5.1 shower rods bowed/straight, HD-06/09/10/11/20 grab bars (24"H/22"/36"/12"), HD-13/17 dispensers, HD-14 folding shower seat — those land on other room types (accessible keys), not 101.

**Grab-bar spec detail for the accessible keys** (for completeness, G402 details 01/02): tub head TA 4 = 12" bar at 33"–36" AFF; tub back TA 4.2 = 24" ×2 (lower 8"–10" above rim); tub foot TA 4.2 + TA 4.9 vertical; shower back TA 4.3 = 36" at 33"–36"; shower front TA 4.2 = 24"; finishes polished/brushed chrome, brushed nickel, or stainless (G402 schedule note 2).

## 7. CAD availability

**On Drive: none.** Search for `dwg` / `CAD` / `Revit` / `rvt` titles returns only two legend PNGs (`IDA-DWG.png`, `A-ABBR-DWG.png`) and text references. The architect's .dwg names appear only as title-block text (e.g. "22-014 A530 ENLARGE UNIT BATHROOM.dwg", A530 extract; "22-014 G402 ACCESSIBILITY FOR GUESTROOMS.dwg", G402 extract) — the files themselves are not on Drive. `cadOnDrive: false` for every fixture.

Manufacturer-published CAD/Revit (general product-line knowledge only — external sites NOT fetched per scope, so **unverified for these exact SKUs**): Moen, American Standard/LIXIL, Kohler, and Delta all normally publish 2D/3D CAD and Revit content on their spec/pro pages. Treat as "likely available, unverified."

## 8. Summary of gaps (all = "NOT FOUND ON DRIVE — awaiting Austin")

1. Accessory (HD-*) manufacturer + model numbers — Bobrick unconfirmed, zero Drive evidence.
2. Toilet cutsheet/dims (Champion Pro 211AA.104 / Cadet Pro 215CA.104).
3. Decolav Callensia 1402-CWH cutsheet/dims (spec-of-record lav).
4. Delta 581LF-GPM-PP cutsheet/dims (spec-of-record faucet).
5. Kohler Rely pan + Delta T24859 trim cutsheets.
6. AS Princeton 2390.202 tub cutsheet (accessible keys only; also blocked by open tub-vs-roll-in conflict).
7. WC-3-vs-WC-4 per-unit assignment; SK-3/SK-4 unit assignment; Moen/AmStd substitution stamp status.
