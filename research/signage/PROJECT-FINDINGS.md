# H2SEP signage — what the permit set already says, and where it breaks

_Compiled 2026-08-20 from `data/project.sqlite` (238-sheet index, 66 spaces, 115 keys,
1,606 items, 45 conflicts, 51 placeholders) — the same spine `room_map.md` verified
115/115 by blind second extraction. Nothing in this file is inferred from a code book;
it is what the project's own documents state. Requirements research is in the sibling
files._

## 1. The set already contains a signage sheet. Nobody has read it.

| Sheet | Title as indexed | Rev | Date |
|---|---|---|---|
| **G401** | **Accessibility — signage standards** | — | 06/09/23 |
| G400 | Accessibility — public-space mounting heights, pool lift, laundry, lockers, fountains | — | 06/09/23 |
| G402 | Accessibility for Guestrooms — vanity/shower/tub details, grab-bar layouts, blocking, TA accessory schedule | — | 06/09/23 |
| G600 | First Floor Accessibility Plan — clearances, door size & closer-force notes | — | 06/09/23 |
| G100 | Building Code Analysis — Type V-A, NFPA 13R, R-1/A-2/B, 48'-1 1/4" / 4 stories | — | 06/09/23 |
| G100.2 | Code Analysis — accessible units (115 / 7 accessible / 12 hearing), plumbing-fixture counts | — | 06/09/23 |
| G200 | Life Safety — First Floor Plan (**308 occupants**) | **4** | 08/09/24 |
| G201 | Life Safety — Typical Floor Plan (**83 occupants/floor**) | **4** | 08/09/24 |
| G001 | Project Information — site/zoning/area/**parking matrices**, codes, deferred submittals | — | 06/09/23 |

**G401 is the project's own signage standard and it has never been extracted into this
repo — only its title is indexed.** Same for G400, G402, G600 and the parking matrix on
G001. Read G401 before buying a single sign; it is the sheet the plan reviewer will hold
the installation against.

G200/G201 are **rev 4 (08/09/24)** — the only G-sheets that were ever revised, and the
newest life-safety information in the set. Exit-sign and egress-path locations come off
those two sheets, not off the 06/09/23 originals.

## 2. G401 is drawn to CALIFORNIA code, on a Texas job

`conflicts` table, **A10 — "Accessibility code basis — out-of-state codes on a Texas
project", status OPEN**, verbatim:

> G400/G401 cite California CBC 11B. G001's Code Summary cites NO accessibility standard
> at all — no TAS, no ANSI A117.1, no ADA. G003 Franchise Note 13 cites CBC 11B-404.2.11.
> G002 General Note 7 requires firestopping to the NCBC (North Carolina). All three are on
> the permit set.

The sheet that tells the contractor how to build the signage cites the **California**
Building Code. Texas commercial construction over the registration threshold is reviewed
and inspected against the **2012 Texas Accessibility Standards** by a TDLR-registered
Accessibility Specialist. A RAS inspects to TAS. Building G401 as drawn is building to
the wrong state's standard, and the parking signage is where California and Texas diverge
hardest — Texas has a statutory sign wording (fine amount + towing warning) that appears
nowhere in the California code. Delta analysis in the sibling file.

This is prototype/boilerplate carryover, and it is **not isolated**: the finish schedule
carries **PT-08 "Paint at INDOOR Pool Walls & Ceiling Inset"** (FLAGGED) on a pool that
AS104 titles *Enlarged **Outdoor** Pool & Patio Plan*. Same failure mode, different
discipline. Treat every G-sheet boilerplate citation as suspect until checked.

## 3. Nobody is contractually holding the signage scope

`conflicts` table, **B5.4 — "General — room-signage scope seam", status OPEN**, verbatim:

> G002 General Note 9: 'ROOM IDENTIFICATION AND INTERIOR SIGNAGE BY OWNER'. But G003 lists
> (n) Interior Signage Review and (o) guest room numbering as GC-provided, and G003.2
> Exhibit C Division 10 includes Signage. Settle who buys 115 room-number plaques and the
> ADA signage package before TCO.

Three documents on the same permit set assign the interior signage package three
different ways. At 115 room-number plaques plus ~230 other code-driven signs (§6), this
is a real number, and it is unowned. **Settle it before TCO, not at TCO.**

## 4. The drawings point at a "SIGNAGE PACKAGE" that is not in the set

A902 (Servery 009) prints **"GRAPHIC (SEE SIGNAGE PACKAGE)"** at seven positions on
elevation 13 — HIGH reliability, trade GC. The signage package it refers to is in no
indexed sheet and no Drive folder in this context set.

Blocking for signage is, however, already committed in the framing — it has to be in the
wall before drywall:

| Space | Blocking called for | Sheet | Reliability |
|---|---|---|---|
| Lobby 003 | 18" high blocking at **91" AFF** for a blade sign at end of wall | A700 keyed note 40 | HIGH |
| Home2 Market 005 | **48" × 16"** blocking for signage, CENTERED — "must be in the stud wall before drywall" | A903 | HIGH |
| Home2 Market 005 | *(same element)* **48" × 18"** blocking for signage, centered | ID-4.5 | HIGH |
| Servery 009 | Blocking for signage — **no dimension given** | A902 | HIGH |

⚠ **A903 says 48"×16", ID-4.5 says 48"×18" for the same Market brand-signage blocking.**
Two inches, two sheets, and the blocking is buried once the wall closes. Resolve before
the Market wall is rocked.

Also already committed: **Fitness Room 023 item 812 "RULES SIGN"** (A510.3 furnishing
list, HIGH, owner-furnished) and **ZONE-B TL-12 "Depth marker tile"** (ID-1.8, FLAGGED) —
the pool depth markers are specified as *tile*, not applied signage, which makes them a
TILE-trade item on the critical path, not a sign-vendor item.

## 5. Three pool rooms have doors but no room record

A600 schedules doors for **034 Pool Storage 2**, **035 Pool Equipment**, and **036 Pool
Storage 1** (HM in galvanized HM frames, hardware set #14, HIGH). None of the three
appears in the `spaces` table — the space spine runs 001–033 and then jumps to the
circulation numbers. **002 and 026 are likewise absent.**

**035 Pool Equipment is the pool chemical room.** That is the single room a fire marshal
will most reliably ask about — NFPA 704 placard, chemical identification, restricted
access — and it currently has no space record, no interior finish source ("Pool building
034 / 035 / 036 INTERIOR FINISHES — NO SOURCE", FLAGGED) and no signage line anywhere.
It is carried in `sign-schedule.json` off the door schedule and flagged as such.

## 6. What the building actually needs, counted

Counted off the verified spine — 69 spaces (66 in the `spaces` table + the 3 pool-building
rooms) and 115 keys. Quantities are counts, not estimates.

| Sign family | Qty | Basis |
|---|---:|---|
| Guest room number plaque, tactile + Braille | 115 | one per key |
| Guest room emergency evacuation map | 115 | one per key, inside entry door |
| Room identification, tactile (public + BOH + pool building) | 55 | by space class |
| "Employees Only" / restricted access | 35 | BOH + pool building |
| Stair identification sign (inside enclosure, each landing) | 8 | 2 stairs × 4 floors |
| Stair door tactile "EXIT" | 8 | 2 stairs × 4 floors |
| Stair floor-level designation | 8 | 2 stairs × 4 floors |
| Elevator hoistway floor designation (both jambs) | 16 | 2 cabs × 4 floors × 2 jambs |
| Elevator lobby fire-service sign | 4 | lobbies 137/237/337/437 |
| Public restroom (door symbol + wall tactile) | 6 | 019 WOMENS · 020 MEN'S · 027 Unisex |
| Occupant-load posting | 5 | 006 · 009 · 018 · 023 · ZONE-B |
| Electrical room ID + arc-flash | 4 + 4 | 033 · 219 · 319 · 419 |
| Communication-features room identification | **12 or 10** | **disputed — see below** |

⚠ **The hearing-accessible count does not reconcile.** `conflicts` **A11**: A100's
Guestroom Matrix HI rows sum to **12**, G001's sum to **10**, and G100.2 states **12**.
Only 8 are physically located (209, 213, 216, 218 on A101; 309, 313, 316, 318 on A102);
**floors 1 and 4 have never been scanned for the crossed-ear symbol.** The repo's standing
instruction (`room_map.md`, `PH-GU-002`) is: *do not order 12 visual-alarm / shaker /
doorbell kits until floors 1 and 4 are scanned and the count is reconciled against a
single matrix.* The same caution applies to any signage that identifies those rooms.

**A11 is decidable on the count, and the answer is 12.** 115 keys lands in the "101 to
150" row of both ADA scoping tables (2010 ADA Standards for Accessible Design, verified
against two independent renderings of the published tables):

| Table | Row for 101–150 rooms | Requires |
|---|---|---|
| **224.2** Guest Rooms with Mobility Features | 5 without roll-in / 2 with roll-in / **7 total** | 7 mobility keys |
| **224.4** Guest Rooms with Communication Features | **12** | 12 communication-features keys |

The design provides exactly **7** mobility keys — 118, 217, 238, 317, 338, 417, 438 —
which matches 224.2 on the nose, and the 5-tub/2-roll-in split G100.2 states is exactly
the table's split. So the architect scoped the counts off the right tables even though
G401 cites the wrong state's standard.

On the hearing count the two matrices are **not equally valid**: 224.4 sets the minimum at
**12**, so A100/G100.2's 12 meets it exactly and **G001's 10 would be two rooms short of
the federal minimum**. The count question is therefore closed — it is 12 — and G001's
matrix is simply wrong on that row. What is still genuinely open is *which* rooms: only 8
of the 12 are located (209, 213, 216, 218, 309, 313, 316, 318), and floors 1 and 4 have
never been scanned. Scan them; do not re-litigate the number.

⚠ This does **not** unblock ordering. `PH-GU-002`'s hold stands, because the hold is about
*which keys* get the kits, not how many. Sources:
[Table 224.2](https://www.corada.com/documents/2010ADAStandards/224-2) ·
[224.2 + 224.4](https://up.codes/s/transient-lodging-guest-rooms)

## 7. Fire-protection documents the set does not contain

`placeholders` **PH-SP-019**, verbatim:

> **Fire Sprinkler and Fire Alarm devices in public and amenity spaces** — Neither category
> can be populated from A5xx, A7xx or A9xx. Only two fire-protection facts exist in the
> whole group: recessed extinguisher cabinets and AS104 note 37. *The FP set is not indexed
> at all in this context set.* → request and index the FP series.

So the fire marshal's signage scope cannot be closed from this repo alone. What *is*
recorded: **fire extinguishers in fully recessed cabinets** in the public spaces (A510.1
keyed note 22 / A510.4 general note B / A700 keyed note 19, HIGH), and emergency exit
lights recorded at only two spaces (Food Prep 007 via A513, Unisex 027 via A521) — which
is coverage of the *index*, not of the building. Exit-sign locations live on **G200/G201
rev 4** and the **E200–E203** lighting plans.

Fire alarm is a **vendor performance design** (`conflicts` B1.9): device layout was
deferred to the FA-0…FA-3 submittal under NFPA 72, which now supplies the bill.

## 8. Two code-basis facts to carry into any fire marshal conversation

**Sprinkler standard is contested three ways** (`conflicts` **B5.3**, OPEN): G002 General
Building Note 8 says NFPA 13 flat; G100 and `project.md` say the basis of design is
**NFPA 13R**; the stamped shop drawing — top of the precedence chain, and **stamped by the
City of Eagle Pass FD** — designs to NFPA 13. Under precedence the installed system is
NFPA 13.

⚠ **The edition recorded for that stamped shop drawing does not exist.**
`room_type_packages.md` records it as *"NFPA 13 (2021) + NFPA 24 (2021)"*. NFPA revises on
a three-year cycle: **NFPA 13 editions are 2016, 2019, 2022 and 2025 — there is no 2021
edition**, and the same is true of NFPA 24. So "2021" is either the shop drawing's own
issue date misread as an edition, or a transcription error, or the drawing genuinely cites
a non-existent edition. Since this is the document the AHJ stamped, **confirm what the
shop drawing actually cites before quoting an edition to the fire marshal.**

**The energy code dates the permit cycle.** G300 is a COMcheck certificate against the
**2018 IECC**, Climate Zone 2b. That is real evidence the design was permitted on the
**2018 I-code family**, which would put the fire code at **IFC 2018** — but it is
inference from a sibling code, not a statement of the adopted fire code. G001's Code
Summary is where the adopted editions are actually printed, and G001 has not been
extracted. **Confirm the adopted IFC/IBC edition with the City before ordering
code-dimensioned signs** (stair ID lettering sizes and exit-sign letter heights differ
between editions).

## 9. Do these five things first

1. **Pull G401, G400, G402, G600 and G001** out of the permit set and read them. G401 is
   the signage standard; G001 carries the adopted-code summary and the parking matrix that
   sets the accessible-parking sign count.
2. **Raise conflict A10 as an RFI to MWT** — G400/G401 cite California CBC 11B on a Texas
   project. Ask for the sheets to be reissued to 2012 TAS.
3. **Settle conflict B5.4** — who buys the interior signage package: owner (G002 note 9),
   GC (G003 n/o), or Division 10 (G003.2 Exhibit C).
4. **Get the "SIGNAGE PACKAGE"** that A902 refers to, and resolve the Market blocking
   dimension (48"×16" per A903 vs 48"×18" per ID-4.5) **before that wall is rocked**.
5. **Request and index the FP series**, and confirm what the Eagle Pass FD–stamped
   sprinkler shop drawing actually cites for NFPA 13/24 editions.
