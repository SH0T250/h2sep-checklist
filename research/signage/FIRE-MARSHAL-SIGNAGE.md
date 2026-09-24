# Fire marshal signage — H2SEP

_Home2 Suites by Hilton · Eagle Pass, TX · IBC Group R-1 · 4 stories · sprinklered ·
2 exit stairs · 2 elevators · breakfast/food prep · guest laundry · outdoor pool.
Researched 2026-08-20._

## 1. The adopted code is settled: 2018 IFC

**Verified by extracting the City's own Fire Marshal document.** Verbatim:

> *"Building construction in the City of Eagle Pass shall meet the requirements of the **2018
> International Fire Code**, local amendments, as well as all applicable NFPA Standards. **All
> final system testing, and inspections will be witnessed by the City of Eagle Pass Fire
> Marshal's Office.**"*

The City's commercial and residential permit applications add the rest of the family: **2018
IBC · 2018 IRC · 2018 IFC · 2017 NEC · 2018 IMC · 2018 IPC · 2018 IEBC · 2018 IECC · and the
2012 Texas Accessibility Standards.**

Two things this settles for the repo:

1. **It corroborates the inference from G300.** The COMcheck certificate on the permit set is
   against the **2018 IECC** — the same cycle. `PROJECT-FINDINGS.md` §8 flagged that as
   inference from a sibling code; it is now confirmed from the City directly.
2. **The City names the 2012 TAS by name.** That is the standard G401 does *not* cite — it
   cites California CBC 11B (`conflicts` A10). The City's own permit application names the
   standard the sheet should have been drawn to. See `CBC-vs-TAS-DELTA.md`.

⚠ **The City's own checklist contains a stale line.** Item 4 reads *"An automatic system shall
be installed throughout buildings in accordance with the international fire code **2012**
edition"* while items 6, 9, 16, 17 and the header all say **2018**. Treat 2018 as governing and
don't let anyone cite item 4 as authority for a 2012 provision.

⚠ **H2SEP is a "mid-rise" in the City's framing.** Checklist item 23: *"See mid-rise building
construction section if residential occupancy that is **three or more stories** in height but is
not classified as a high-rise."* At 4 stories R-1 that is this building. **Request the mid-rise
section — we do not have it.**

### Eagle Pass Fire Marshal's Office

| | |
|---|---|
| Fire Marshal | **Eleazar Cuevas** — ecuevas@eaglepasstx.gov |
| Phone | **(830) 773-1915** |
| Address | 32 Foster Maldonado Blvd., Eagle Pass, TX 78852 |
| Plan review | Up to **10 working days**; approved plans + permit stay on the job site |
| Local extinguisher rule | *"A minimum of one **2A-10BC** fire extinguisher per **3000 sq.ft.** With a maximum travel distance of **75 ft**. Indicate the location and size of all fire extinguishers."* |
| Local address rule | *"Address must be legible from the street or fire lane."* |
| Local rated-wall rule | 2-hr designation *"clearly indicated"* on plans with the **UL listing number** |

This is also the office that **stamped the sprinkler shop drawing** carrying the phantom
"NFPA 13 (2021)" edition (`PROJECT-FINDINGS.md` §8). Same office, same submittal chain.

## 2. Means of egress marking

| # | Sign | Where | Requirement | Citation |
|---|---|---|---|---|
| 1 | **EXIT sign** | Every exit and exit access door. Placed so **any point in an exit access corridor is within 100 ft** (or the listed viewing distance, whichever is less) of the nearest visible sign | "EXIT", illuminated at all times | IFC 1013.1, 1013.3 |
| 2 | **Directional EXIT** | Wherever the exit or path of travel is **not immediately visible** — corridor intersections, elevator lobbies, dead-end heads | "EXIT" + chevron. *"the direction of the chevron directional indicator cannot be readily changed"* | IFC 1013.1, 1013.6.1 |
| 3 | ⭐ **FLOOR-LEVEL EXIT SIGNS — R-1 specific** | **"…in all areas serving guestrooms in Group R-1 occupancies."** Every guest corridor (121/221/321/421), at each exit and stair door | **Bottom of sign 10 in. min – 18 in. max above the floor.** Flush to door or wall; if wall-mounted, **edge within 4 in. of the door frame on the latch side.** Internally illuminated per UL 924 | **IFC 1013.2** |
| 4 | Externally illuminated sign lettering | All external signs | Letters **≥6 in. high**, principal strokes **≥¾ in. wide**, letters **≥2 in. wide** (except "I"), **letter spacing ≥⅜ in.**; face intensity **≥5 foot-candles** | IFC 1013.6.1, 1013.6.2 |
| 5 | Emergency power | All exit signs | **90 minutes** minimum on loss of primary power | IFC 1013.6.3 |
| 6 | ⭐ **Tactile + Braille "EXIT"** | *"adjacent to each door to… an exit stairway or ramp, an exit passageway and the exit discharge"* → **every stair door on every floor + the discharge doors** | "EXIT" in visual characters, raised characters and Braille per ICC A117.1. Illumination not required | **IFC 1013.4** |
| 7 | ⭐⭐ **STAIRWAY IDENTIFICATION SIGN** | **Inside** each stair, **at every floor landing**, **5 ft above the landing**, readable with doors open **and** closed. **Required — 4 stories is "more than three"** | Must designate: **floor level** · **terminus of top and bottom** · **stairway identification** · **story of, and direction to, the exit discharge** · **availability of roof access** for the fire department | **IFC 1023.9** |
| 8 | Stair ID sign construction | Same | Sign **min 18 in. × 12 in.** · stairway ID letters **≥1½ in.** · **floor level number ≥5 in. high, in the center of the sign** · all other lettering **≥1 in.** · **non-glare**, contrasting | **IFC 1023.9.1** |
| 9 | Floor-level tactile sign at stairs | Inside the stair, **adjacent to the door leading back into the corridor**, each landing | Floor level in visual characters, raised characters **and Braille** per ICC A117.1 | IFC 1023.9 |
| 10 | "Elevator Lobby" sign | Only where a stair landing has 2+ doors to the floor and one gives direct access to an enclosed elevator lobby | "Elevator Lobby", ≥1 in. letters, non-glare contrasting | IFC 1023.10 |
| 11 | **Occupant load posted** | *"Every room or space that is an assembly occupancy"* — **near the main exit or exit access doorway**. For H2SEP: Breakfast 006, Servery 009, Meeting Room 018, Fitness 023, pool — **whichever the FMO classifies as assembly** | *"of an approved legible permanent design"*. **No lettering size in the code — get the format approved** | **IFC 1004.9** |
| 12 | Delayed egress sign | On the door, **above and within 12 in. of the exit hardware** | **"PUSH UNTIL ALARM SOUNDS. DOOR CAN BE OPENED IN 15 [30] SECONDS."** (or "PULL…" where the door swings opposite egress) | IFC 1010.1.9.8.1 — only if delayed egress locks are used |
| 13 | "PUSH TO EXIT" | At the manual unlocking device, **40–48 in. AFF, within 5 ft of the secured doors** | **"PUSH TO EXIT"** | IFC 1010.1.9.9 — only if sensor-release locks are used |
| 14 | Two-way communication instruction sign | **At the elevator landing on each accessible floor above the level of exit discharge — floors 2, 3, 4** | Directions for use, instructions for summoning assistance, and **written identification of the location** | IBC 1009.8.2 |

⚠ **Item 3 is the one most often missed and the biggest quantity surprise.** Low-level exit
signs are an **R-1-specific** requirement — a hotel-only rule that doesn't appear on most
commercial jobs. They land in all four guest corridors at every exit and stair door, mounted
at ankle height.

**Not required inside guest rooms:** *"Exit signs are not required in… individual sleeping
units or dwelling units in Group R-1"* (IFC 1013.1 Exc. 3).

## 3. Site and fire service features

| # | Sign | Requirement | Citation |
|---|---|---|---|
| 15 | **Premises address numbers** | **Visible from the street fronting the property.** Arabic numerals or letters — **numbers shall not be spelled out**. Characters **≥4 in. high with ≥½ in. stroke**, **contrasting** with background. Where the building can't be seen from the public way, a monument/pole sign is required | **IFC 505.1** + City checklist item 15 |
| 16 | **NO PARKING — FIRE LANE** | *"approved signs or other approved notices or markings that include the words **NO PARKING—FIRE LANE**"*, maintained clean and legible | **IFC 503.3** |
| 17 | Fire lane sign dimensions | **12 in. wide × 18 in. high, red letters on white reflective background.** Both sides of 20–26 ft lanes; one side of lanes >26 and <32 ft | IFC **Appendix D103.6** — ⚠ **conditional, see below** |
| 18 | Fire lane geometry | **20 ft minimum width**, dimensioned on the site plan; hydrant hose lay 250 ft (**500 ft if sprinklered**) | Code of Ords. Sec. 23-92; IFC 503.2.1 |
| 19 | **Knox Box / key box** | UL 1037-listed, location approved by the fire code official. Owner must notify the FMO and re-key when a lock changes | IFC 506.1, 506.2 |
| 20 | ⭐ **Elevator key box label** | Front cover **permanently labeled "Fire Department Use Only—Elevator Keys"**. Mounted **at each elevator bank in the lobby nearest the lowest level of FD access, 5 ft 6 in. AFF, right side of the bank** | IFC 506.1.2 — where the elevator uses a non-standardized key |
| 21 | ⭐ **Fire protection room identification** | *"Rooms containing controls for air-conditioning systems, **sprinkler risers and valves**, or other fire detection, suppression or control elements shall be identified for the use of the fire department."* Signs *"constructed of durable materials, permanently installed and readily visible"* → fire riser room, FACP, mechanical, electrical | **IFC 509.1** |
| 22 | Utility equipment identification | Gas shutoffs, electric meters, service switches — *"clearly and legibly marked to identify the unit or space that it serves"* | IFC 509.1.1 |
| 23 | "THIS DOOR BLOCKED" | Exterior side of any non-functional door that still looks like a door. **Stroke ≥¾ in., letters ≥6 in.**, contrasting | IFC 504.2 — only if such a door exists |
| 24 | ⭐ **Roof access stairway sign** | Buildings **four or more stories** must have a stairway to the roof, *"marked at street and floor levels with a sign indicating that the stairway continues to the roof."* **Applies to H2SEP** | **IFC 504.3** |

⚠ **The fire lane sign spec is conditional, and it is the #1 discretionary item.** IFC 101.2.1:
*"Provisions in the appendices shall not apply unless specifically adopted."* The 12"×18"
red-on-white spec lives in **Appendix D**, so it binds only if Eagle Pass adopted Appendix D.
Base IFC 503.3 says *"signs **or** other approved notices **or markings**"* — leaving wording,
letter size, color and spacing entirely to the fire code official. **No published Eagle Pass
fire-lane marking standard was found. Get the spec in writing before striping or fabricating.**

## 4. Fire protection systems

| # | Sign | Requirement | Citation |
|---|---|---|---|
| 25 | ⭐ **FDC identification** | **A metal sign with raised letters not less than 1 in.** reading **AUTOMATIC SPRINKLERS** or **STANDPIPES** or **TEST CONNECTION** or a combination. Where the FDC doesn't serve the whole building, an added sign must state **which portions** it serves | **IFC 912.5** |
| 26 | FDC locator sign | Where the FDC isn't visible to approaching apparatus: **"FDC" ≥6 in. high**, words **≥2 in.**, or an arrow | IFC 912.2.2 |
| 27 | **Standpipe hose connection ID** | Cabinets containing standpipes, hose, extinguishers or FD valves: **permanently attached sign, letters ≥2 in., contrasting color**. *Exception: not needed where the door has an approved clear vision panel or is full glass* | **IFC 905.7.1** |
| 28 | Extinguisher location indicators | *"In rooms or areas in which visual obstruction cannot be completely avoided, means shall be provided to indicate the locations of extinguishers."* Mounting: top ≤5 ft AFF (≤40 lb), bottom ≥4 in. off floor | IFC 906.5, 906.6, 906.9; NFPA 10 |
| 29 | ⭐ **NFPA 13 hydraulic design nameplate** | At **every riser, floor control assembly and alarm valve**. Weatherproof metal or rigid plastic, secured with corrosion-resistant wire or chain: design area location and size, discharge densities, **flow and residual pressure at the base of the riser**, occupancy classification, hose stream allowance, **and the installing contractor's name** | NFPA 13 — section number varies by edition |
| 30 | ⭐ **Control valve / drain / test connection signs** | Every control valve, main drain, auxiliary drain, venting valve and inspector's test connection — **control valve signs must identify the portion of the building served**, and where multiple valves exist, indicate where the others are | NFPA 13 |
| 31 | Local reinforcement | The City's sprinkler submittal checklist has an explicit line: *"**All labeling and signage posted in accordance with NFPA 13, 13D, 13R.**"* | Eagle Pass FMO sprinkler submittal |
| 32 | Kitchen hood suppression | Distinctive audible + visible alarms **and warning signs** to warn of pending agent discharge | IFC 904.3.4 — if a Type I hood with fixed suppression is provided |

⚠ **Item 31 puts the NFPA 13 vs 13R conflict on the Fire Marshal's own checklist.** The City
asks for signage "in accordance with NFPA 13, **13D, 13R**" without picking one, while
`conflicts` **B5.3** has G002 saying NFPA 13, G100 saying 13R, and the FD-stamped shop drawing
saying 13 — at a phantom 2021 edition. **The riser signage content depends on which standard
and which edition, so resolve B5.3 before the riser nameplates are fabricated.**

## 5. Elevators, shafts and rooms

| # | Sign | Requirement | Citation |
|---|---|---|---|
| 33 | ⭐ **Elevator emergency sign** | Adjacent to **each elevator call station on all floors**. ⚠ **The IFC and IBC give different legends** — IFC 606.3: **"IN FIRE EMERGENCY, DO NOT USE ELEVATOR. USE EXIT STAIRS."** IBC 3002.3: **"IN CASE OF FIRE, ELEVATORS ARE OUT OF SERVICE. USE EXIT STAIRS."** Most listed pictorial signs satisfy both — **ask the FMO which they want** | IFC 606.3 / IBC 3002.3 |
| 34 | ⭐ **Star of Life (stretcher elevator)** | Buildings **four or more stories** need a stretcher-capable elevator, identified by the **international symbol for emergency medical services (star of life)**, **≥3 in. high**, **placed inside on both sides of the hoistway door frame**. **Applies to H2SEP** | **IBC 3002.4** |
| 35 | **SHAFTWAY** | On exterior openings reachable by the FD that open on a hoistway/shaftway, and on interior door/window openings to one: **"SHAFTWAY" in red letters ≥6 in. on a white background.** *Interior exception: not required where readily discernible as a shaftway by construction* | **IFC 316.2** |
| 36 | **ELECTRICAL ROOM** | *"Doors into electrical control panel rooms shall be marked with a plainly visible and legible sign stating **ELECTRICAL ROOM** or similar approved wording."* Plus each disconnecting means legibly and durably marked to indicate its purpose | **IFC 604.3.1** |
| 37 | Elevator machine room ID | Identified for fire department use (IFC 509.1); typical wording "ELEVATOR MACHINE ROOM — AUTHORIZED PERSONNEL ONLY" plus high-voltage marking. ASME A17.1 requires access doors self-closing, self-locking, kept locked | IFC 509.1; ASME A17.1 |
| 38 | Emergency power identification | Sign at the **service-entrance equipment** giving type and location of on-site emergency power sources; all boxes, enclosures, transfer switches, generators and power panels for emergency circuits **permanently marked** | NEC 2017 §§700.7, 700.10(A) |
| 39 | Arc-flash / high voltage | Arc-flash warning marking on switchboards, panelboards, MCCs; "DANGER — HIGH VOLTAGE — KEEP OUT" over 1,000 V | NEC 2017 §§110.16, 110.21(B), 110.34(C) |

**H2SEP has 4 electrical rooms** (033, 219, 319, 419) and **2 elevators** — item 34 means
**2 cabs × 4 floors × 2 jambs = 16 star-of-life placements**, on top of the 16 ADA hoistway
floor designations at the same jambs.

## 6. ⭐⭐ Fire barrier stenciling — the one that gets missed above the ceiling

**IBC 703.7**, verbatim scope:

> *"Where there is an **accessible concealed floor, floor-ceiling or attic space**, fire walls,
> fire barriers, fire partitions, smoke barriers and smoke partitions or any other wall required
> to have protected openings or penetrations shall be effectively and permanently identified
> with signs or stenciling in the concealed space."*

| Spec | Requirement |
|---|---|
| Location | Within **15 ft of the end of each wall** and at intervals **not exceeding 30 ft** measured horizontally along the wall |
| Lettering | **Not less than 3 in. high with a minimum ⅜ in. stroke, in a contrasting color** |
| Suggested wording | **"FIRE AND/OR SMOKE BARRIER — PROTECT ALL OPENINGS"** (or other approved wording) |

This lands **above the corridor and guest-room ceilings, on both sides of every rated wall.**
H2SEP's rated walls are already known from the DB: **W3/W3A** (stair, elevator and linen chute
walls, 2 HR), **W4** (corridor walls, 1 HR, STC 54), **W5** (guestroom demising). **This is a
painter/drywall scope item that has to happen before the ceiling closes** — and it is exactly
what a fire marshal looks for on a rough-in walk.

**Fire door marking:** *"FIRE DOOR—DO NOT BLOCK"* on doors designed to be normally open;
*"FIRE DOOR—KEEP CLOSED"* on doors designed to be normally closed. **Letters ≥1 in.**,
permanently displayed (IFC 705.2.2, where required by the fire code official — **assume
required**). Manufacturer listing labels must stay **legible and unpainted** (IFC 705.2.1).

## 7. Guest room evacuation diagram — mandatory here

**IFC 403.10.1.1** makes it a City requirement, not just a brand or NFPA one:

> *"A diagram depicting **two evacuation routes** shall be posted on or immediately adjacent to
> every required egress door from each hotel or motel sleeping unit."*

**× 115 keys.** NFPA 101 §28.7.4 adds that the diagram must reflect the **actual room
arrangement, exit locations and room identification**. The brand SKU is `H2SN-EVP79`
(7.75" × 9.25", ≈$19) — see `BRAND-AND-PROJECT-RECORD.md`.

## 8. Hazardous materials and no-smoking

| # | Sign | Requirement | Citation |
|---|---|---|---|
| 40 | **NFPA 704 diamond — pool chemical room** | At entrances where hazmat is stored *"in quantities requiring a permit"* **and at specific entrances and locations designated by the fire code official**. Permit trigger: corrosive **liquids > 55 gal**, corrosive **solids > 1,000 lb** (IFC Table 105.6.20) | IFC 5003.5 |
| 41 | Container labeling | *"Individual containers, cartons or packages shall be conspicuously marked or labeled in an approved manner. **Rooms or cabinets containing compressed gases shall be conspicuously labeled: COMPRESSED GAS**"* — relevant if CO₂ is used for pH control | IFC 5003.5.1 |
| 42 | Hazmat sign durability | *"shall not be obscured or removed, shall be **in English as a primary language** or in symbols allowed by this code, shall be durable, and the size, color and lettering shall be approved"* | IFC 5003.6 |
| 43 | **"NO SMOKING"** | *"The fire code official is authorized to order the posting of 'No Smoking' signs."* ⚠ *"The **content, lettering, size, color and location** of required 'No Smoking' signs **shall be approved**"* — entirely at the FMO's discretion | IFC 310.3–310.5 |

A typical hotel pool room may sit **below** the permit quantities — but Texas fire marshals
routinely require the diamond under the "designated by the fire code official" clause. See
`POOL-SIGNAGE.md` §5 for the ratings guidance (calcium hypochlorite is **OX**; muriatic acid
takes **no** bottom-quadrant symbol; **"COR" is not a valid NFPA 704 symbol**).

## 9. Not required — do not over-build

| Item | Why not |
|---|---|
| **Fire Command Center** | High-rise only (occupied floor >75 ft). H2SEP is 48'-1¼" |
| **Fire Service Access Elevator symbols** | Only where IBC 403.6.1 applies — occupied floor >120 ft |
| **Occupant Evacuation Elevator signage** | Only where IBC 3008 elevators are provided |
| **AREA OF REFUGE signs** | ⚠ **Not required in buildings sprinklered throughout per 903.3.1.1/903.3.1.2** (IBC 1009.3.3 Exc. 2, 1009.4.2 Exc. 2). **But that waiver keys to NFPA 13, not 13R** — so `conflicts` **B5.3** decides it. Same finding as `ADA-TAS-REQUIREMENTS.md` |
| **"WHEN ALARM SOUNDS—CALL FIRE DEPARTMENT"** at pull stations | Only where the alarm is **not** monitored by a supervising station |
| **Exit signs inside guest rooms** | Expressly excepted for R-1 (IFC 1013.1 Exc. 3) |
| **Luminous egress path markings** (IFC 1025) | High-rise only. *(Note: if it applied, stair ID signs would have to be made of the same luminous material)* |
| **"NOT AN EXIT" signs** | ⚠ **The 2018 IFC and IBC contain no such requirement.** It comes from **NFPA 101 §7.10.8.3** — *"NO" in letters 2 in. high with ⅜ in. stroke, "EXIT" in letters 1 in. high, EXIT below NO*. Texas's SFMO adopted NFPA 101-2021 effective 9/1/2023, so it may arrive via a state inspection or an FMO request. **Ask; don't assume either way** |

## 10. Ask the Fire Marshal these twelve things before fabricating

Call **(830) 773-1915** / email **ecuevas@eaglepasstx.gov**. Get answers in writing and attach
them to the sign submittal.

1. **Has Eagle Pass adopted IFC Appendix D?** Decides whether the 12"×18" red-on-white fire lane
   spec is enforceable or whether the FMO has its own.
2. **The fire lane marking standard** — curb color, stencil wording, letter size, repeat
   interval, sign post height and spacing. **Nothing is published; this is the top discretionary
   item.**
3. **The local amendments** to the 2018 IFC in Code of Ordinances **Chapter 13** — request a PDF.
4. **Room ID sign letter heights** for FIRE RISER / FACP / ELECTRICAL / MECHANICAL. IFC 509.1
   sets none.
5. **Which elevator legend** — IFC 606.3 or IBC 3002.3 wording.
6. **Knox Box** — required? Which model, which location? And is an elevator key box (506.1.2)
   required?
7. **NFPA 704 on the pool chemical room** — required even below permit quantities?
8. **ERRCS** — is emergency responder radio coverage required (IFC 510.1), and what markings?
9. **Which spaces are assembly** for the occupant load posting, and the required sign format.
10. **"NOT AN EXIT" signs** — does the FMO want NFPA 101 §7.10.8.3 signs?
11. **Which NFPA 13 edition** the FMO reviews to — and **what the stamped shop drawing actually
    cites**, given that NFPA 13 has no 2021 edition.
12. **The mid-rise construction section** referenced by checklist item 23 — we don't have it.

## Sources

**City of Eagle Pass** — [Fire Marshal's Office](https://www.eaglepasstx.gov/171/Fire-Marshal) ·
[Building Construction Plan Review](https://www.eaglepasstx.gov/DocumentCenter/View/144/Construction-Plan-Review-Requirements-PDF) *(text in §1 extracted directly from this PDF)* ·
[Fire Sprinkler Plan Submittal](https://www.eaglepasstx.gov/DocumentCenter/View/1224/Fire-Sprinkler-Plan-Submittal) ·
[Fire Alarm Plan Submittal](https://www.eaglepasstx.gov/DocumentCenter/View/1222/Fire-Alarm-Plan-Submittal-Requirements) ·
[Commercial Permit Application](https://www.eaglepasstx.gov/DocumentCenter/View/3359/Building-Permit-Application-Commercial-) ·
[Residential Permit Application (full code list)](https://www.eaglepasstx.gov/DocumentCenter/View/1927/Building-Permit-Application-Residential-PDF) ·
[Commercial Development Permit Guide 2023](https://www.eaglepasstx.gov/DocumentCenter/View/2497/Commercial-Development-Permit-Guide-2023) ·
[Code of Ordinances Ch. 13](https://library.municode.com/TX/eagle_pass/codes/code_of_ordinances?nodeId=PTIICOOR_CH13FIPRPR)

**Model codes** — [2018 IFC (ICC)](https://codes.iccsafe.org/content/IFC2018) ·
[2018 IBC (ICC)](https://codes.iccsafe.org/content/IBC2018) · verbatim text read from the
unamended 2018 base at [up.codes IFC-2018](https://up.codes/viewer/wyoming/ifc-2018) and
[up.codes IBC-2018](https://up.codes/viewer/wyoming/ibc-2018)

**Texas** — [Texas State Law Library — Building Codes](https://guides.sll.texas.gov/building-codes/texas) ·
[Gov't Code §419.909](https://codes.findlaw.com/tx/government-code/gov-t-sect-419-909/) ·
[H&S Code §792.002](https://codes.findlaw.com/tx/health-and-safety-code/health-safety-sect-792-002/) ·
[TDI/SFMO adopted codes — NFPA 1 & 101 2021, eff. 9/1/2023](https://www.tdi.texas.gov/fire/fmfsinotices.html) ·
[TDI/SFMO rules and statutes](https://www.tdi.texas.gov/fire/fmfsirules.html) ·
[28 TAC Ch. 34](http://txrules.elaws.us/rule/title28_chapter34)

**NFPA (secondary — primary text is paywalled)** — [NFPA 101 §7.10.8.3 "No Exit"](https://up.codes/s/no-exit) ·
[§7.10.8 Special Signs](https://up.codes/s/special-signs) ·
[§28.7.4 Emergency Instructions](https://up.codes/s/emergency-instructions-for-residents-or-guests) ·
[NFPA 13 signage guide](https://www.sprinklerage.com/here-is-your-sign/) ·
[QRFS sprinkler sign guide](https://blog.qrfs.com/87-complete-guide-to-fire-sprinkler-signs-and-system-marking/)

---
_Confidence: items quoted verbatim above were read from the code text or from the City's own
documents. NFPA section numbers are from secondary sources because NFPA primary text is
paywalled — the requirements are sound, the section numbers should be confirmed against the
edition the FMO reviews to. **No section number in this document was invented.**_
