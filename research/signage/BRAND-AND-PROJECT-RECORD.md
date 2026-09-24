# Home2 / Hilton brand signage + the verified project record

_H2SEP · researched 2026-08-20. Companion to `ADA-TAS-REQUIREMENTS.md`,
`CBC-vs-TAS-DELTA.md`, `PROJECT-FINDINGS.md`._

## 1. The project record, verified against the State of Texas

Pulled directly from **TDLR Architectural Barriers project TABS2024001033** — the state's
own record, and the first external source in this repo that independently corroborates the
room map.

| Field | Value (verbatim from TDLR) |
|---|---|
| Project name | "HOME2 Suites by Hilton Hotel" |
| **Address** | **"3386 East main Street, Eagle Pass, TX 78852"** *(sic — lowercase "main")* |
| Owner | **"H2EP LLC"**, 3301 E. Main Street, Eagle Pass, TX 78852 |
| Architect | **"MWT Architect"**, 3827 Billo Road, Alden, New York 14004 |
| Scope of work | **"4 Story, 115 Key HOME2 Suites by Hilton Hotel with pool"** |
| **Keys** | **115** |
| **Stories** | **4** |
| Building area | 70,796 ft² |
| Estimated cost | $12,000,000 |
| Registered | 9/15/2023 |
| **Plan review** | **"Review Complete"** |
| **Inspection** | **Not yet assigned** — must be requested within 30 days of completion, no later than the first anniversary |
| **Assigned RAS** | **Landy Perkins, RAS #371** |

**Three independent confirmations of the spine.** The state record's **115 keys** and
**4 stories** match `room_map.md` (115/115 verified by blind second extraction) and G100
exactly, and "MWT Architect" confirms the firm the repo's conflict register keeps naming as
the RFI recipient. The room map is corroborated from outside the drawing set.

### ⚠ What "Review Complete" does and does not mean

The TDLR **plan review is finished. The RAS inspection has not happened.** Those check
different things:

- **Plan review** looks at drawings. A RAS reviews against TAS regardless of what standard
  the sheet *cites*, so G401's California citations (`conflicts` A10) would not necessarily
  fail review as long as the dimensions happen to comply.
- **Inspection** looks at what is physically installed — **mounting heights, latch-side
  placement, 18"×18" clear floor space, Braille grade and dot geometry.** That is exactly
  where signage built to G401-as-drawn gets written up.

**Plan review passing is not evidence the signage is right.** The exposure is entirely
downstream, and it lands on the owner: Gov't Code §469.101/§469.105 make the **owner**, not
the architect or GC, legally responsible for obtaining the inspection.

**Action:** get the sign schedule in front of **Landy Perkins (RAS #371)** *before*
installation, not after. Signage mounting height and latch-side placement are among the most
common RAS punch items, and re-hanging signs across 115 keys plus 55 rooms is pure rework.

## 2. Accessible parking — now computable

A third-party project abstract lists **127 parking spaces** (not stated on the TDLR record —
treat as **MEDIUM** confidence until G001's parking matrix is pulled).

At 127 spaces, **2010 ADA / TAS Table 208.2** (101–150 band) gives:

| Item | Count |
|---|---|
| Accessible spaces required | **5** |
| Van spaces (⌈5 ÷ 6⌉, §208.2.4) | **1** |
| Standard accessible | 4 |
| TAS 502.6 ISA identification signs | **5** |
| "Van Accessible" designation | **1** |
| **16 TAC §68.104 "Violators Subject to Fine and Towing" plaques** | **5** |
| **§68.104 pavement ISA (painted, contrasting)** | **5** |
| **§68.104 "NO PARKING" aisle stencil** (12" caps, 2" stroke) | one per access aisle |
| **Occ. Code §2308.301 tow sign** | one at **each** driveway/curb cut |

⚠ **§208.2 Advisory: the count is computed separately for each parking facility, not off the
site total.** If the 127 spaces read as two lots, each is calculated independently and the
total goes **up**. This is a frequent RAS citation. **Pull G001's parking matrix** (see
`PROJECT-FINDINGS.md` §1) before locking the count.

## 3. Brand standards — what is public, and what to request

**Nobody outside the Hilton owner ecosystem can read the Home2 signage standard.** What *is*
public is **Exhibit H of the 2026 US Home2 Franchise Disclosure Document**, which reproduces
the complete **table of contents** of the brand standards manual with real section and page
numbers, effective **05 January 2026**. That lets us name the section precisely without
inventing its content.

| Section | Title | Page |
|---|---|---|
| **2519.00** | **SIGNAGE AND GRAPHICS** | 2500-334 |
| 2501.00 | EXTERIOR | 2500-5 |
| 2509.00 | CIRCULATION | 2500-91 |
| 2513.00 | BACK-OF-HOUSE | 2500-144 |
| 2516.00 | FIRE PROTECTION AND LIFE SAFETY | 2500-291 |
| 2517.00 | ACCESSIBILITY GUIDELINES | 2500-318 |
| 726.00 | SIGNAGE (operations volume) | 700-36 |
| 801–803.00 | HILTON TRADEMARKS AND LOGOS / BRAND IDENTITY | 800-2 |

> **None of these sections has been read.** We know they exist, their titles and their page
> ranges. Anyone quoting a requirement "per 2519.00" without the manual in hand is guessing.

**Request from the franchisee (H2EP LLC) via the Hilton Owner's Portal → Design Information
Site**, which MWT and the GC also have access to:

1. **§2519.00 SIGNAGE AND GRAPHICS** (vol. 2500, p. 2500-334ff) — the single most important
   document for this scope.
2. §2501.00 EXTERIOR and §2509.00 CIRCULATION — prototype plans in these sections usually
   carry the sign locations.
3. §726.00 SIGNAGE from the operations volume.
4. **Hilton's current list of licensed exterior sign vendors** for South Texas.
5. **Which of the two design packages was approved** — the sign catalog mirrors them as
   **"Neutral"** (`H2SN-…`) and **"Wood."** Every interior SKU is finish-specific and
   non-interchangeable, so this gates every order.

## 4. Two procurement rules that constrain the scope

**Exterior signage is a closed list.** FDD Item 8, verbatim: *"You must purchase exterior
signage from a vendor currently licensed by us. You may contact us for a current list in your
area."* Interior is open **provided the standards are met**, except anything bearing a Hilton
or Home2 mark, which must come from an approved and licensed supplier. Getting a new supplier
approved takes **60–90 days**.

**Sign changes still need Hilton's written consent.** The Franchise Agreement's definition of
"Designs" expressly includes **signs**, and approved plans cannot be changed without further
written consent. TDLR shows plan review complete, so the design-review gate has been passed —
**any sign change now needs Hilton's sign-off, not just the City's.** That matters directly
because of the two-sign problem in §6.

## 5. Budget, from published figures

| Line | Amount | Source |
|---|---|---|
| FDD Item 7 "Signage" | **$45,800 – $66,500** (107-suite prototype) | 2026 US Home2 FDD |
| What it covers, verbatim (Note 9) | *"Signs include freestanding signs and primary identification for the building. The amount includes installation, freight, foundation and wiring."* | FDD Note 9 |
| What it does **not** cover | Interior wayfinding, ADA, amenity graphics, BOH and regulatory signage — those sit inside **FF&E, $1.91M–$2.77M** | FDD Item 7 |
| ADA consultant | $2,500 – $10,000 (separate line) | FDD Item 7 Note 12 |

**Practical read for 115 keys:** roughly **$50–70k exterior** (brand-licensed vendor,
installed) plus **$35–70k interior**. Catalog unit pricing supports the interior figure —
room number plaques ≈$38 × 115 ≈ $4.4k, directionals $29–$84, pool rules sign $227, elevator
changeable display $196.

⚠ **Note the prototype mismatch:** the FDD's cost basis is a **107-suite** Home2 with **7
accessible suites**. H2SEP is **115 keys**. The accessible count coincidentally also lands at
7 (ADA Table 224.2), but **do not carry prototype quantities across** — compute from the
actual 115. See `ADA-TAS-REQUIREMENTS.md`.

## 6. ⚠ Eagle Pass allows two signs. A Home2 package is three.

**Eagle Pass Zoning Ordinance, Appendix A §15** (Regulations for placement of signs and
billboards): *"Each business establishment shall be allowed to erect and maintain two (2)
permanent type signs."* A permit from the Building Department is required with plans and
specs, and a **wind-load certificate signed by the sign owner is required for any new sign
6 ft or more above grade**.

A standard Home2 exterior package is **two wall signs + one monument = three**. Something has
to give: a variance, or dropping a sign. **And dropping a brand ID sign needs Hilton's written
consent as well as the City's** (§4 above). Raise this with both sides now — it is a long-lead
approval, not a field decision.

*(City rules are covered in depth in the city research file; flagged here because it collides
directly with the brand package.)*

## 7. Nomenclature — do not spec retired language

| Use | Not |
|---|---|
| **"Home2 Breakfast"** (std. 428.00) | ~~"Inspired Table"~~ — survives only in Hilton marketing copy and the vendor's **retired** "H2S" package |
| **"Home2 MKT"** (std. 415.00) | — |
| **"Neutral" / "Wood"** finish families | ~~"Home2 Suites V3"~~ and ~~"H2S"~~ — both explicitly **Retired**; must not be used on a new build |
| **Spin2Cycle** — one room, but split across **502.00 FITNESS CENTER** and **716.00 GUEST LAUNDRY** | — |

H2SEP's space list matches the current nomenclature: **005 Market**, **006 Breakfast**,
**009 Servery**, **023 Fitness Room**, **024 Guest Laundry**.

## 8. Vendors

| Vendor | Evidence | Contact | Confidence |
|---|---|---|---|
| **HOTELSIGNS.com** (Intersign Corp.) | **Strongest.** Operates a Home2 Suites Sign Store carrying the full current catalog in both finish families, with Hilton part-number conventions (`H2SN-…`, `HH-…`), retired-package flagging, and Honors/Diamond/EV SKUs. Displays a "vendor approved" badge. | 2156 Amnicola Hwy, Chattanooga TN · **888-273-8726** · emailus@hotelsigns.com | **High** for interior. Does **not** publish exterior building ID or monument fabrication. |
| Identity Group | Hilton-brand product categories confirmed; no Home2-specific catalog visible | 800-325-7409 · dailyorders@identitygroup.com | Medium |
| ADAHotelSigns.com | Sells a Home2 Guarantee Sign (HM2-1917). Claims "approved," does not state formal licensure | 800-742-5507 · hiltonbrands@adahotelsigns.com | Medium |
| Ortwein Sign | Full exterior capability (pylon, monument, channel letters, porte-cochère). **No Hilton licensure claim** | 1-866-867-9208 · sales@ortweinsign.com | Medium capability / **Unverified** license |
| Comet Signs | **San Antonio — nearest major sign plant to Eagle Pass.** No Hilton license claim found | cometsigns.com | Medium logistics / Unverified |
| National Signs (Aria) | Texas hospitality exterior + interior, handles permitting | 713-863-0600 | Medium / Unverified |
| ⚠ **"Hilton Displays"** | **NOT affiliated with Hilton Hotels** — an independent sign company in Greenville SC | — | Flagged to avoid confusion |

**Could not substantiate** a Hilton or Home2 approval claim for ASI, Best Sign Systems,
Cornerstone, Gemini, ImageWorks or Jones Sign. **Do not represent any of them as
Hilton-approved without the official list.**

### The procurement path that actually works

1. **Get Hilton's licensed exterior vendor list** for South Texas. This is the gating item.
2. **Interior: use HOTELSIGNS' free SignSpec service.** Send the floor plans; they return a
   sign list with location numbers, a signage location plan and a quote package built against
   NFPA/ICC/ADA. Free, and it produces the sign schedule the GC needs to coordinate blocking,
   power and mounting heights — which matters here because **the blocking is already
   committed and carries an unresolved dimension conflict** (`PROJECT-FINDINGS.md` §4).
   Lead time: ships 10–15 business days after order acceptance; individual SKUs 2–4 weeks.
3. **Lock Neutral vs Wood before ordering anything.**
4. **Route any sign change through Hilton, not just the City.**

## 9. Brand SKUs worth knowing (current catalog, "Neutral" family)

| Item | SKU | Size | ~Price |
|---|---|---|---|
| Guest room number | `H2SN-RN73` | 7" × 3.625" | $38 |
| Guest room number w/ no-smoking symbol | `H2SN-RN73-SYM` | same | $39 |
| Guest room evacuation map | `H2SN-EVP79` | 7.75" × 9.25" | $19 |
| Elevator changeable display — "Required" | `H2SN-MH2114` | 21.5" × 14.625" | $196 |
| Elevator door-jamb floor designation | `GSS-EDJ32` / `EDJ34` | 3.75" × 2.25" / 4" | $20 / $21 |
| "In Case of Fire — Use Stairs" | `H2SN-ICOF108` / `IFE108` | 10.375" × 8.5" | $42 |
| Restroom ID w/ ISA (unisex / women / men) | `H2SN-RG62` / `RG31` / `RG32` | 7.75" × 6.875" | $40 |
| Common room ID (BOH workhorse, 2–8 line) | `H2SN-CR36` … `CR1011-2` | 3.75"×6.875" up | $35–$133 |
| Custom regulatory sign | `H2SN-RGCC` / `RGCC2` | 7.75" × 6.875" | $43 / $50 |
| Directional (2–8 line) | `H2SN-D36` … `D1011` | — | $29–$84 |
| Accessible-route directional | `H2SN-DA96` (`-DYN`) | 9.5" × 6.875" | $40 |
| Meeting room sign w/ sliding panel | `H2SN-MR168` | 16.5" × 8.5" | $154 |
| Pool rules w/ hours | `H2SN-PR2935` | 29.5" × 35" | $227 |
| No Diving / No Lifeguard | `H2SN-DV2335` | — | $175 |
| Recreation area emergency telephone | `H2SN-G1111eo` / `-EX` | 11.875" sq | $66 / $31 |
| Fitness Center w/ accent (ext + int rated) | `H2SN-FC2925` | 29.5" × 25.75" | $187 |
| Hilton Honors front desk block | `HH-HC610` | 6" × 10.5" × 2.75" | $110 |

⚠ **Choose one ISA style property-wide.** Both the standard symbol and the Dynamic/"active"
ISA (`-DYN`) are catalogued. **Specify the standard Figure 703.7.2.1 symbol** — neither the
Access Board nor TDLR has adopted the Dynamic icon, and mixing them reads as an error. See
`ADA-TAS-REQUIREMENTS.md`.

## 10. Open questions for the franchisee and Hilton

**Blocking a quote:**
1. **Neutral or Wood?** Everything downstream depends on it.
2. **Hilton's licensed exterior vendor list** for South Texas.
3. **§2519.00 SIGNAGE AND GRAPHICS**, plus 2501.00, 2509.00 and 726.00.
4. **Was the exterior sign package inside the Plans and Designs Hilton already consented to?**
   If so, that exhibit fixes letter heights, elevations and monument dimensions.
5. **Confirm the final accessible / communication-features key mix at 115.**

**Brand scope:**
6. **Is a porte-cochère sign required, permitted, or prohibited?** Could not be sourced — the
   largest unverified exterior item.
7. Is the "Owned & operated under license from Hilton" plaque required at Home2?
8. Written confirmation of **"Home2 Breakfast"** on signage, so nothing is fabricated in
   retired language.
9. Standard vs Dynamic ISA — one choice, property-wide.
10. Nursing room (717.00)? Premium Experience rooms (317.00)?
11. **Who supplies CleanStay door seals, DND devices and conservation cards** — sign vendor,
    HSM, or operations? These routinely fall between scopes.
12. EV charging: how many stalls, which layout from the Diamond/EV family?

**Local:**
13. **The two-sign limit vs the three-sign package** (§6). Variance or reduction — and Hilton
    must consent either way.
14. **Wind-load certificate** for the monument and any sign ≥6 ft above grade; confirm the
    exterior vendor will produce sealed calcs for the Maverick County wind zone.
15. **Get the sign schedule to RAS #371 before installation.**

## Sources

[TDLR TABS2024001033](https://www.tdlr.texas.gov/TABS/Search/Print/TABS2024001033) ·
[2026 US Home2 FDD](https://hmd-wp.go-vip.net/wp-content/uploads/2026/03/2026-US-FDD-Home2.pdf) ·
[2025 FDD](https://hmd-wp.go-vip.net/wp-content/uploads/2025/03/2025-US-FDD-Home2.pdf) ·
[Hilton — Home2 Eagle Pass](https://www.hilton.com/en/hotels/eglmtht-home2-suites-eagle-pass/) ·
[EP Business Journal groundbreaking](https://www.epbusinessjournal.com/2024/07/creative-ventures-holds-groundbreaking-ceremony-for-new-home-2-suites-by-hilton/) ·
[MWT Architect](https://www.hotelarchitect.com/hilton-architect/) ·
[HOTELSIGNS Home2 store](https://www.hotelsigns.com/home2suites/) ·
[SignSpec](https://www.hotelsigns.com/signspec) ·
[Eagle Pass Code of Ordinances](https://library.municode.com/tx/eagle_pass/codes/code_of_ordinances?nodeId=PTIICOOR_APXAZOOR) ·
[Dublin OH Home2 Master Sign Plan 17-006](https://dublinohiousa.gov/dev/dev/wp-content/uploads/2017/01/17-006-Master-Sign-Plan-Statement.pdf) ·
[Hilton Owner's Portal — Design Information Site](https://hilton.my.site.com/s/article/Design-Information-Site)
