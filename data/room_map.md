# H2SEP — Room Map (authoritative room-number spine)

_Built 2026-08-07 from the architectural floor plans **A100 / A101 / A102 / A103**, the plan of record for room numbers and room types._
_Cross-checked against the unit matrix in `project.md` §3 and the flags in `conflicts.md`. Every row is a literal label from the sheet's vector text layer, visually confirmed on a render. Nothing here is inferred._

> **Precedence.** Plans govern. Where the FF&E set (ID-1.1–1.4) or the unit matrix disagrees with A100–A103, this file follows the architectural plan and the disagreement is recorded, not silently resolved.

---

> ## ✅ INDEPENDENTLY VERIFIED — 2026-08-07
>
> A **blind second extraction** of A100–A103 was run by a separate agent working from the source PDF only, with no access to this file, to `drawings/A100.md`–`A103.md`, or to any prior output. Its result was diffed row by row against this file.
>
> **115 of 115 room numbers matched. 115 of 115 verbatim type strings matched. 64 of 64 space numbers matched. Zero disagreements.**
>
> Including the fiddly ones both reads got independently right: the `QUEEN QUEEN EXT.` trailing period on floor 2 vs `QUEEN QUEEN EXT` with no period on floors 3–4; `HOUSEKEEPING` one word on floor 1 vs `HOUSE KEEPING` two words on floors 2–4; `ACCESSIBLE MOD` not `MODIFIED` on 118; 438 as `KING STUDIO ACCESSIBLE` with no CONNECTOR; and the three buried stale 213 / 313 / 413 tags.
>
> **This spine is trustworthy. Build the app on it.** Full record: `VERIFICATION.md`.
>
> One transcription defect was found and fixed by the diff: space **019** is printed `WOMENS` on A100, with **no apostrophe** (this file had normalised it to "Women's"). Corrected below.

## Verdict

**The room map reconciles. 115 keys. Floor split 16 / 33 / 33 / 33. Zero rooms unaccounted for, zero padded.**

There is exactly **one** type-string delta in the whole building (room 401), and it is a label problem, not a count problem. Everything else is exact, floor by floor and type by type.

### Type reconciliation — extracted vs `project.md` unit matrix

| Type (matrix name) | Matrix F1/F2/F3/F4 | Extracted F1/F2/F3/F4 | Matrix total | Extracted total | Δ |
|---|---|---|---|---|---|
| King Studio | 6 / 17 / 17 / 17 | 6 / 17 / 17 / 17 | 57 | 57 | **0** |
| King Studio Connecting | 1 / 0 / 0 / 0 | 1 / 0 / 0 / 0 | 1 | 1 | **0** |
| King Studio Acc. | 1 / 0 / 0 / 1 | 1 / 0 / 0 / 1 | 2 | 2 | **0** |
| King One Bedroom | 0 / 1 / 1 / 1 | 0 / 1 / 1 / 1 | 3 | 3 | **0** |
| King One Bedroom Acc. | 0 / 1 / 1 / 1 | 0 / 1 / 1 / 1 | 3 | 3 | **0** |
| Queen-Queen | 6 / 8 / 9 / 8 | 6 / 8 / 9 / 8 | 31 | 31 | **0** |
| QQ Connecting | 1 / 2 / 1 / 2 | 1 / 2 / 1 / 2 | 6 | 6 | **0** |
| QQ Extended | 0 / 2 / 2 / 2 | 0 / 2 / 2 / 2 | 6 | 6 | **0** |
| QQ Wide | 0 / 1 / 1 / 0 | 0 / 1 / 1 / 1 | 2 | 3 | **+1** |
| QQ Wide Connecting | 1 / 0 / 0 / 1 | 1 / 0 / 0 / 0 | 2 | 1 | **-1** |
| QQ Acc. | 0 / 1 / 1 / 0 | 0 / 1 / 1 / 0 | 2 | 2 | **0** |
| **Floor totals** | **16 / 33 / 33 / 33** | **16 / 33 / 33 / 33** | **115** | **115** | **0** |

### The one delta — room 401

| | |
|---|---|
| Room | **401**, floor 4, NW corner |
| A103 label as drawn | `QUEEN QUEEN` / `WIDE` |
| Unit matrix expects on floor 4 | QQ Wide = 0, **QQ Wide Connecting = 1** |
| Effect on counts | **none** — 401 is the single wide QQ on the floor either way |
| Effect on a string join | **breaks it** — `QQ Wide` will not match `QQ Wide Connecting` |

A103 states 401 adjoins **403 (QUEEN QUEEN CONNECTOR)**, so a connecting pair *is* drawn — the `CONNECTOR` suffix simply never made it onto the 401 tag. The floor-1 analogue is tagged correctly: **101 QUEEN QUEEN WIDE CONNECTOR** next to **103 QUEEN QUEEN CONNECTOR**. **Do not rename 401 in this file.** Raise it with the architect; the matrix is probably right and the tag is probably short a word, but the sheet does not say so.

Below, room 401 carries `connecting: true` because the drawn connecting door and the matrix both support it, and the type column keeps the sheet's own string. That is the honest split.

---

## Keys — 115 rooms

`Type` = the canonical `project.md` matrix name. `Label as drawn` = the literal string on the sheet. Where the two differ the difference is called out.

### Floor 1 — 16 keys (sheet A100)

| Room | Type | Label as drawn | Acc | Conn | Note |
|---|---|---|---|---|---|
| **101** | QQ Wide Connecting | QUEEN QUEEN WIDE CONNECTOR |  | Y | Delta-5 revision cloud at adjacent demising wall |
| **103** | QQ Connecting | QUEEN QUEEN CONNECTOR |  | Y |  |
| **104** | King Studio | KING STUDIO |  |  |  |
| **105** | Queen-Queen | QUEEN QUEEN |  |  |  |
| **106** | King Studio | KING STUDIO |  |  |  |
| **107** | Queen-Queen | QUEEN QUEEN |  |  |  |
| **108** | King Studio | KING STUDIO |  |  |  |
| **109** | Queen-Queen | QUEEN QUEEN |  |  |  |
| **110** | King Studio | KING STUDIO |  |  |  |
| **111** | Queen-Queen | QUEEN QUEEN |  |  |  |
| **112** | King Studio | KING STUDIO |  |  |  |
| **113** | Queen-Queen | QUEEN QUEEN |  |  |  |
| **114** | King Studio | KING STUDIO |  |  | The ONLY 114 in the building. ID-1.1 also tags a north QQ as 114 - that is the FF&E-set error, conflicts.md B4.3 |
| **115** | Queen-Queen | QUEEN QUEEN |  |  | A100 reads 115 here; ID-1.1 wrongly reads 114. A100 governs |
| **116** | King Studio Connecting | KING STUDIO CONNECTOR |  | Y |  |
| **118** | King Studio Acc. | KING STUDIO ACCESSIBLE MOD CONNECTOR | **Y** | Y | Matrix carries it only as King Studio Acc.; sheet also says CONNECTOR. ISA symbol drawn |

### Floor 2 — 33 keys (sheet A101)

| Room | Type | Label as drawn | Acc | Conn | Note |
|---|---|---|---|---|---|
| **201** | QQ Wide | QUEEN QUEEN WIDE |  |  | NE corner |
| **202** | King One Bedroom | KING ONE BEDROOM |  |  | enlarged plan 01/A553 |
| **203** | Queen-Queen | QUEEN QUEEN |  |  |  |
| **204** | King Studio | KING STUDIO |  |  |  |
| **205** | Queen-Queen | QUEEN QUEEN |  |  |  |
| **206** | King Studio | KING STUDIO |  |  |  |
| **207** | Queen-Queen | QUEEN QUEEN |  |  |  |
| **208** | King Studio | KING STUDIO |  |  |  |
| **209** | Queen-Queen | QUEEN QUEEN |  |  | HEARING-impaired (communication features) symbol drawn in room - not mobility accessible |
| **210** | King Studio | KING STUDIO |  |  |  |
| **211** | Queen-Queen | QUEEN QUEEN |  |  |  |
| **212** | King Studio | KING STUDIO |  |  |  |
| **213** | Queen-Queen | QUEEN QUEEN |  |  | HEARING-impaired symbol drawn in room. The real, plotted 213 (east side); a stale 213 also hides under the 222 tag - see scrape hazards |
| **214** | King Studio | KING STUDIO |  |  |  |
| **215** | QQ Connecting | QUEEN QUEEN CONNECTOR |  | Y | partner room not named on A101 |
| **216** | King Studio | KING STUDIO |  |  | HEARING-impaired symbol drawn in room |
| **217** | King One Bedroom Acc. | KING ONE BEDROOM ACCESSIBLE | **Y** |  | enlarged plan 01/A554 |
| **218** | King Studio | KING STUDIO |  |  | HEARING-impaired symbol drawn in room |
| **222** | King Studio | KING STUDIO |  |  | stale superseded 213 tag buried under this number box; 222 is the plotted number |
| **223** | King Studio | KING STUDIO |  |  |  |
| **224** | King Studio | KING STUDIO |  |  |  |
| **225** | King Studio | KING STUDIO |  |  |  |
| **226** | King Studio | KING STUDIO |  |  |  |
| **227** | King Studio | KING STUDIO |  |  |  |
| **228** | Queen-Queen | QUEEN QUEEN |  |  |  |
| **229** | King Studio | KING STUDIO |  |  |  |
| **230** | QQ Extended | QUEEN QUEEN EXT. |  |  |  |
| **231** | King Studio | KING STUDIO |  |  |  |
| **232** | QQ Extended | QUEEN QUEEN EXT. |  |  |  |
| **233** | King Studio | KING STUDIO |  |  | southernmost KS, adjacent House Keeping 235 / linen chute |
| **234** | Queen-Queen | QUEEN QUEEN |  |  |  |
| **236** | QQ Connecting | QUEEN QUEEN CONNECTOR |  | Y |  |
| **238** | QQ Acc. | QUEEN QUEEN ACCESSIBLE | **Y** |  | enlarged plan 01/A556; SW corner |

### Floor 3 — 33 keys (sheet A102)

| Room | Type | Label as drawn | Acc | Conn | Note |
|---|---|---|---|---|---|
| **301** | QQ Wide | QUEEN QUEEN WIDE |  |  |  |
| **302** | King One Bedroom | KING ONE BEDROOM |  |  | enlarged plan 01/A553 |
| **303** | Queen-Queen | QUEEN QUEEN |  |  |  |
| **304** | King Studio | KING STUDIO |  |  |  |
| **305** | Queen-Queen | QUEEN QUEEN |  |  |  |
| **306** | King Studio | KING STUDIO |  |  |  |
| **307** | Queen-Queen | QUEEN QUEEN |  |  |  |
| **308** | King Studio | KING STUDIO |  |  |  |
| **309** | Queen-Queen | QUEEN QUEEN |  |  | HEARING-accessible (communication features) symbol drawn in room - not mobility accessible |
| **310** | King Studio | KING STUDIO |  |  |  |
| **311** | Queen-Queen | QUEEN QUEEN |  |  |  |
| **312** | King Studio | KING STUDIO |  |  |  |
| **313** | Queen-Queen | QUEEN QUEEN |  |  | HEARING-accessible symbol. The real, plotted 313; a stale 313 also hides under the 322 tag |
| **314** | King Studio | KING STUDIO |  |  |  |
| **315** | Queen-Queen | QUEEN QUEEN |  |  | enlarged plan 01.1/A555 in this vicinity |
| **316** | King Studio | KING STUDIO |  |  | HEARING-accessible symbol drawn in room |
| **317** | King One Bedroom Acc. | KING ONE BEDROOM ACCESSIBLE | **Y** |  | roll-in bath drawn; enlarged plan 01/A554 |
| **318** | King Studio | KING STUDIO |  |  | HEARING-accessible symbol drawn in room |
| **322** | King Studio | KING STUDIO |  |  | stale superseded 313 tag buried under this number box; 322 is the plotted number |
| **323** | King Studio | KING STUDIO |  |  | enlarged plan 01/A550 |
| **324** | King Studio | KING STUDIO |  |  |  |
| **325** | King Studio | KING STUDIO |  |  |  |
| **326** | King Studio | KING STUDIO |  |  | detail 08/A425 adjacent |
| **327** | King Studio | KING STUDIO |  |  |  |
| **328** | Queen-Queen | QUEEN QUEEN |  |  |  |
| **329** | King Studio | KING STUDIO |  |  |  |
| **330** | QQ Extended | QUEEN QUEEN EXT |  |  |  |
| **331** | King Studio | KING STUDIO |  |  |  |
| **332** | QQ Extended | QUEEN QUEEN EXT |  |  |  |
| **333** | King Studio | KING STUDIO |  |  |  |
| **334** | Queen-Queen | QUEEN QUEEN |  |  |  |
| **336** | QQ Connecting | QUEEN QUEEN CONNECTOR |  | Y | connecting door drawn in the 336/338 demising wall; pairing not stated in text |
| **338** | QQ Acc. | QUEEN QUEEN ACCESSIBLE | **Y** |  | the 336 connecting door lands in this room wall, but 338 itself is NOT labeled connector |

### Floor 4 — 33 keys (sheet A103)

| Room | Type | Label as drawn | Acc | Conn | Note |
|---|---|---|---|---|---|
| **401** | QQ Wide | QUEEN QUEEN WIDE |  | Y | LABEL DELTA: sheet says WIDE only; matrix expects QQ Wide Connecting on floor 4. A103 notes it adjoins 403 (QQ Connector) |
| **402** | King One Bedroom | KING ONE BEDROOM |  |  | SW corner, two-bay wide |
| **403** | QQ Connecting | QUEEN QUEEN CONNECTOR |  | Y | pairs with 401 |
| **404** | King Studio | KING STUDIO |  |  |  |
| **405** | Queen-Queen | QUEEN QUEEN |  |  |  |
| **406** | King Studio | KING STUDIO |  |  |  |
| **407** | Queen-Queen | QUEEN QUEEN |  |  |  |
| **408** | King Studio | KING STUDIO |  |  |  |
| **409** | Queen-Queen | QUEEN QUEEN |  |  |  |
| **410** | King Studio | KING STUDIO |  |  |  |
| **411** | Queen-Queen | QUEEN QUEEN |  |  |  |
| **412** | King Studio | KING STUDIO |  |  |  |
| **413** | Queen-Queen | QUEEN QUEEN |  |  | the real, plotted 413 (north row); a stale 413 also hides under the 422 tag |
| **414** | King Studio | KING STUDIO |  |  |  |
| **415** | Queen-Queen | QUEEN QUEEN |  |  |  |
| **416** | King Studio | KING STUDIO |  |  |  |
| **417** | King One Bedroom Acc. | KING ONE BEDROOM ACCESSIBLE | **Y** |  | two-bay wide; ISA symbol; roll-in shower drawn |
| **418** | King Studio | KING STUDIO |  |  | even run jumps 418 -> 422; there is no guestroom 420 |
| **422** | King Studio | KING STUDIO |  |  | stale superseded 413 tag buried under this number box; 422 is the plotted number |
| **423** | King Studio | KING STUDIO |  |  | Delta-4 revision triangle adjacent |
| **424** | King Studio | KING STUDIO |  |  |  |
| **425** | King Studio | KING STUDIO |  |  |  |
| **426** | King Studio | KING STUDIO |  |  |  |
| **427** | King Studio | KING STUDIO |  |  |  |
| **428** | Queen-Queen | QUEEN QUEEN |  |  |  |
| **429** | King Studio | KING STUDIO |  |  |  |
| **430** | QQ Extended | QUEEN QUEEN EXT |  |  |  |
| **431** | King Studio | KING STUDIO |  |  |  |
| **432** | QQ Extended | QUEEN QUEEN EXT |  |  |  |
| **433** | King Studio | KING STUDIO |  |  |  |
| **434** | Queen-Queen | QUEEN QUEEN |  |  |  |
| **436** | QQ Connecting | QUEEN QUEEN CONNECTOR |  | Y | adjoins 438 |
| **438** | King Studio Acc. | KING STUDIO ACCESSIBLE | **Y** |  | A103 says KING STUDIO ACCESSIBLE - no connector suffix, not QQ. ID-1.4 says QQ Acc; Drive correction says KS Acc Connector. conflicts.md B4.4 |

---

## Non-guestroom spaces — 64 numbered spaces

Public, amenity, circulation and back-of-house. Numbers come from the same four floor plans.

**All amenity and public space is on floor 1.** Floors 2–4 carry only Electrical, Storage, House Keeping, Ice Machine plus the two stairs, the elevator lobby and the shaft. That is a fact about the building, not a gap in extraction.

### Floor 1 — 37 spaces (sheet A100)

| No. | Name | Note |
|---|---|---|
| **001** | Vestibule | doors 001A/001B; canopy above at entry |
| **003** | Lobby | door 003 |
| **004** | Reception | no door tag - open to lobby |
| **005** | Market | Home2 Market; open |
| **006** | Breakfast | doors 006A/006B |
| **007** | Food Prep | doors 007A/007B |
| **008** | Dry Storage | door 008 |
| **009** | Servery | open to breakfast |
| **010** | Work Stations | door 010 |
| **011** | Managers Office | door 011 |
| **012** | Closet | door 012 |
| **013** | Laundry Discharge | doors 013A/013B; 01/A450 linen chute callout |
| **014** | Employee Breakroom | door 014 |
| **015** | Laundry | doors 015A/015B |
| **016** | Dryer Room | door 016 |
| **017** | Open Storage | no door tag; Delta-4 cloud |
| **018** | Meeting Room | doors 018A/018B |
| **019** | WOMENS | public restroom off lobby corridor; door 019. **Printed with no apostrophe on A100** — 019 is `WOMENS`, 020 is `MEN'S`. Not normalised. (A520 prints a third and fourth variant for the same two rooms — see conflicts) |
| **020** | MEN'S | public restroom off lobby corridor; door 020 |
| **021** | Engineer | office, NOT a restroom, despite sitting in the 019/020 wall run; door 021 |
| **022** | Sales | door 022 |
| **023** | Fitness Room | door 023; equipment by others |
| **024** | Guest Laundry | no door tag on A100 |
| **025** | Mech. | door 025; near Stair 2 |
| **027** | Unisex | public unisex restroom; door 027 |
| **028** | Elev. Eq. | elevator equipment room; door 028; 01/A432 |
| **029** | Meeting Rm. Sto. | door 029 |
| **030** | Mech. / Plumb. Room | doors 030A/030B; WH, WS, BP in room |
| **031** | PBX | door 031 |
| **032** | Housekeeping | doors 032A/032B |
| **033** | Electrical | door 033; main electrical / MDP room this floor |
| **100** | Stair 1 | doors 100A/100B; 01/A430 |
| **121** | Guest Corridor | doors 121A/121B |
| **137** | Elev. Lobby | door 137 |
| **139** | Ice Machine | alcove; no door tag |
| **140** | Elev. | ONLY elevator number on A100 but TWO hoistways drawn - see gaps |
| **141** | Stair 2 | door 141; 01/A440, 01/A432 |

### Floor 2 — 9 spaces (sheet A101)

| No. | Name | Note |
|---|---|---|
| **200** | Stair 1 | door 200; window type I; 02/A430, 02/A431 |
| **219** | Electrical | door 219; W4/W8 |
| **220** | Storage | door 220; W4; adjacent clouded X-hatched shaft tagged 05/A425, unnamed |
| **221** | Guest Corridor | single double-loaded corridor, 247'-11 1/4" long |
| **235** | House Keeping | door 235; linen chute 02/A450 |
| **237** | Elevator Lobby | door 237; W6/W3 |
| **239** | Ice Machine | alcove opposite the elevator lobby |
| **240** | Elev. | TWO cabs under one number; 02/A440 |
| **241** | Stair 2 | door 241; window type I; 02/A431 |

### Floor 3 — 9 spaces (sheet A102)

| No. | Name | Note |
|---|---|---|
| **300** | Stair 1 | door 300; 02/A430 |
| **319** | Electrical | door 319; W4/W8; 04/A425 |
| **320** | Storage | door 320; W4; unnamed clouded chute/shaft at the 319/320 boundary; 05/A425 |
| **321** | Guest Corridor | full length; clear width 5'-1 3/4" |
| **335** | House Keeping | door 335; 02/A450 |
| **337** | Elevator Lobby | door 337; W3/W6 |
| **339** | Ice Machine | no door tag; 07/A425 adjacent |
| **340** | Elev. | TWO cars under one number; 02/A440 |
| **341** | Stair 2 | door 341; 02/A431 |

### Floor 4 — 9 spaces (sheet A103)

| No. | Name | Note |
|---|---|---|
| **400** | Stair 1 | west stair; door tag 400; 02/A430 |
| **419** | Electrical | door 419; W4/W8 |
| **420** | Storage | door 420; W4 |
| **421** | Guest Corridor | single corridor, full length of floor |
| **435** | House Keeping | door 435; 02/A450 |
| **437** | Elevator Lobby | door 437; W6 |
| **439** | Ice Machine | east end, off elevator lobby |
| **440** | Elev. | **CORRECTED 2026-08-07** — A103 draws **TWO cars side by side** under the single number 440, identical to 140 / 240 / 340. The earlier "one shaft on floor 4" reading was wrong (verified on the render; `drawings/A103.md` fixed). Do not invent 440A/440B |
| **441** | Stair 2 | east stair; door 441; 02/A431 |

### Exterior detached — 3 spaces (sheet AS104, **not** on A100)

| No. | Name | Note |
|---|---|---|
| **034** | Pool Storage 2 | exterior detached pool building; source AS104, not on A100 |
| **035** | Pool Equipment | exterior detached pool building; source AS104, not on A100 |
| **036** | Pool Storage 1 | exterior detached pool building; source AS104, not on A100 |

These are numbered rooms in the pool building, outside the hotel envelope. They belong in the app's space list but must not be counted as first-floor interior spaces. The shaded `MECHANICAL EQUIPMENT` rectangle outside the building outline on A100 has **no** room number and is an exterior pad — do **not** create an interior room record for it.

---

## Scrape hazards — read before writing an importer

### 1. Three phantom duplicate room numbers (floors 2, 3, 4)

Stale CAD text was never purged. On each upper floor a superseded room tag sits at the **identical insertion point** as a live one, hidden under the newer white-filled tag box. The plotted sheet is clean; the **text layer is not**.

| Floor | Sheet | Buried stale number | Plotted number | The stale number is ALSO a live room on the same floor |
|---|---|---|---|---|
| 2 | A101 | 213 | **222** | yes — 213 is a live QUEEN QUEEN on the east side |
| 3 | A102 | 313 | **322** | yes — 313 is a live QUEEN QUEEN across the corridor |
| 4 | A103 | 413 | **422** | yes — 413 is a live QUEEN QUEEN in the north row |

A naive text scrape yields **34 rooms per upper floor with 213 / 313 / 413 appearing twice**. The same duplication hits the RCPs (A121 / A122 / A123 carry the identical stale tags). **De-duplicate by coordinate and keep the last-drawn tag.** This file already has it right.

### 2. Guestroom numbers are not a dense sequence

- Floor 1: 101–118 odd north / even south; **002, 026, 034+ are unused interior numbers**; there is no 102, 117 or 119.
- Floors 2–4: `x19` Electrical, `x20` Storage, `x21` Guest Corridor, `x35` House Keeping, `x37` Elevator Lobby, `x39` Ice Machine, `x40` Elev., `x41` Stair 2, `x00` Stair 1 — **none are keys**.
- The even guestroom run jumps **218 → 222**, **318 → 322**, **418 → 422**. There is no guestroom 220 / 320 / 420.
- Enumerating `x00`–`x41` as guestrooms produces phantom keys. Use this table, not a range.

### 3. Room 114 is not duplicated on the plans

`conflicts.md` **B4.3** is confirmed closed by A100: **114 is a King Studio, 115 is the Queen-Queen.** The duplicate-114 defect lives in the FF&E set (ID-1.1), not in the architectural set. Correct ID-1.1; plans govern.

---

## Confidence

| | |
|---|---|
| Room numbers | **HIGH** — every one is a literal string in a true-vector text layer, position-matched to its type label and confirmed on a render |
| Room types | **HIGH** for 114 of 115. **MEDIUM for 401** (label vs matrix, see above) |
| Accessible flags | **HIGH** for the 7 mobility-accessible keys (118, 217, 238, 317, 338, 417, 438) — ISA symbol drawn in room |
| Connecting flags | **MEDIUM** — the label carries the word CONNECTOR, but A100–A103 **never state the partner room**. Pairings must come from ID-1.1–1.4 |
| Space numbers and names | **HIGH** |
| Anything else about these rooms | **not on these sheets** — see below |

The 7 mobility-accessible keys match `CLAUDE.md` / G100.2 (**115 = 108 standard + 7 accessible**) exactly.

---

## Unresolved — do not paper over these

1. **Room 401 type string** (above). Architect confirmation needed. Count-neutral, join-breaking.
2. **Room 438 — three sources, three labels.** A103 (08/09/24) `KING STUDIO ACCESSIBLE` · ID-1.4 `QQ Accessible` · Drive correction `King Studio Accessible Connector`. The `project.md` matrix already carries the corrected **King Studio Acc. on floor 4**, and A103 independently agrees it is a King Studio Accessible — so `conflicts.md` **B4.4** is half closed. **Still open: whether 438 is a connector.** A103 does not say so.
3. **Room 118 loses an attribute in the matrix.** Sheet: `KING STUDIO ACCESSIBLE MOD CONNECTOR`. Matrix: `King Studio Acc.` only. The app must carry **both** `accessible` and `connecting` for 118. There is no `KS Acc Connecting` row in the matrix.
4. **Second elevator has no room number.** A100, A101, A102 **and A103** each draw **two** hoistways/cabs under a single number (140 / 240 / 340 / 440). *(Corrected 2026-08-07 — A103 was previously recorded here as drawing only one. It draws two.)* ID-1.1 lists an Elevator **138** that appears nowhere on A100. The E-series references Elevator 1 and Elevator 2. **Do not invent 140A/140B.** Source the split from the elevator sheets (A440/A441) before any one-record-per-elevator data model.
5. **Connecting-room partners are never stated architecturally.** Doors are drawn; pairs are not named. `ID-1.1`–`ID-1.4` are the stated authority. Until they are joined, `connecting: true` means "this room has a connecting door", not "this room connects to room X".
6. **12 hearing/communication-features rooms — 8 of 12 now identified, 4 still unknown.** *(Updated 2026-08-07.)* The crossed-ear symbol is drawn, with no text label, in:
   - **Floor 2 (A101):** **209, 213** (Queen Queen) · **216, 218** (King Studio) — found on the render 2026-08-07, matches A100's Guestroom Matrix exactly (2nd floor QQ HI = 2, KS HI = 2).
   - **Floor 3 (A102):** **309, 313** (Queen Queen) · **316, 318** (King Studio).
   - **Floor 1 (A100) and floor 4 (A103): NOT YET SCANNED for this symbol.** A100's matrix says floor 1 has King Studio HI = 1 and floor 4 has KS HI = 2 + QQ HI = 1, which would be the remaining 4.

   The printed type strings for all of these are plain `QUEEN QUEEN` / `KING STUDIO`, so **a room record built from the type string alone loses the HI flag entirely.** Carry `hearing_impaired` as a separate per-room boolean.

   ⚠ The two matrices disagree on the HI breakdown — A100's HI rows sum to 12, G001's sum to 10. See `conflicts.md` **A11**. **Do not order 12 visual-alarm / shaker / doorbell kits until floors 1 and 4 are scanned and the count is reconciled against a single matrix.**
7. **Unnamed clouded shaft** between Storage and Electrical on floors 2–4, tagged `05/A425`, never labeled. Make-up-air riser (M301/M302) or linen chute (A450) is inference from another discipline. Verify before framing.
8. **Revision skew.** A100 is revised to **Rev 5 REVISED PER RFI 12/12/24**; A101–A103 stop at **Rev 4 08/09/24**; the upper-floor RCPs A121–A123 have an **empty revision block** and still read 06/09/23. Revisions 1–3 are undated on every floor plan. Confirm the current released issue against Procore before relying on any of it.

---

## What this file cannot answer

A100–A103 are room-index and layout sheets. Of the 21 app categories they speak only to **Doors** (BOH doors only — guestroom doors are untagged) and, indirectly, **Drywall** (partition tags W3–W8, assemblies on A300/A301). They carry **zero** finishes, zero FF&E tags, zero MEP, zero fire, zero low-voltage and **zero room areas**.

| To answer | Join to |
|---|---|
| finishes, FF&E per guestroom | `ID-5.x`, `A530`–`A533`, `A550`–`A556`, `reference/Guestroom_FFE_by_Room.md` |
| finishes, FF&E per public space | `ID-1.x`, `ID-3.x`, `A510.1`–`A514`, `A520`/`A521`, `A700`–`A702`, `A900`–`A907` |
| ceilings | `A120`–`A123` (guestroom ceilings are deferred to unnamed "enlarged guestroom clg. plans") |
| doors and windows | `A600` / `A610` |
| wall assemblies, ratings, STC | `A300` / `A301` + the UL sheets `A302`–`A309` |
| mechanical, electrical, plumbing per room | `M301`–`M305`, `E200`–`E204`, `P301`–`P310` |
