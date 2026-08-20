# H2SEP signage compliance — start here

Every sign this hotel is required to carry, who requires it, and what the permit set already
gets wrong. Compiled 2026-08-20 for Home2 Suites by Hilton, **3386 East Main Street, Eagle
Pass, TX 78852** — 115 keys, 4 stories, Type V-A, R-1/A-2/B, sprinklered, outdoor pool.

## The files

| File | Covers |
|---|---|
| **`PROJECT-FINDINGS.md`** | What the permit set already says about signage, and where it breaks. **Read this first.** |
| `FIRE-MARSHAL-SIGNAGE.md` | 2018 IFC / IBC — egress marking, stair ID, FDC, riser, barriers, hazmat. Eagle Pass FMO contacts and the 12 questions to ask. |
| `ADA-TAS-REQUIREMENTS.md` | 2010 ADA / 2012 TAS — tactile room ID, parking, elevators, guest rooms, areas of refuge. |
| `CBC-vs-TAS-DELTA.md` | What to **delete** from G401 and what it's **missing**, because it was drawn to California code. |
| `POOL-SIGNAGE.md` | 25 TAC Ch. 265 Subch. L — verbatim sign text and letter heights, depth-marker tile specs, chemical room. |
| `TEXAS-STATUTORY-NOTICES.md` | Human trafficking, innkeeper, firearms, food service, labor posters, elevator and boiler certificates, TABC. |
| `CITY-OF-EAGLE-PASS.md` | Sign ordinance (Apx. A § 15), adopted codes, fire lane spec, local no-smoking rule, permits and fees. |
| `../../docs/H2SEP-Signage-Compliance-Report.pdf` | **All of the below as one sourced PDF** — 74 pages, 147 numbered citations, built by `tools/pdf/build.sh`. |
| `BRAND-AND-PROJECT-RECORD.md` | The TDLR project record, Hilton brand scope, vendors, budget, and the two-sign problem. |
| `sign-schedule.md` / `.json` | Per-space schedule, generated from the verified spine. |
| `space-classes.json` | All 69 spaces classified by sign family. |

Regenerate the schedule with `python3 tools/gen_sign_schedule.py`. It exits non-zero if
`space-classes.json` drifts from `data/project.sqlite`.

## The five things that matter most

1. **G401 — the project's own signage sheet — is drawn to California code.** `conflicts` A10.
   The City's permit application names the **2012 TAS** by name. A TDLR Registered Accessibility
   Specialist (**Landy Perkins, RAS #371**) inspects against TAS, and **plan review is already
   complete while the inspection is not** — so the exposure is entirely in what gets installed.
   → `CBC-vs-TAS-DELTA.md`
2. **Nobody owns the signage scope.** `conflicts` B5.4 — G002 note 9 says owner, G003 says GC,
   G003.2 Division 10 says Division 10. 115 room-number plaques are unassigned. Settle it
   before TCO.
3. **The NFPA 13 vs 13R conflict decides two signage packages.** `conflicts` B5.3. The IBC
   area-of-refuge waiver keys to **NFPA 13 and does not extend to 13R**, and the City's own
   sprinkler checklist asks for signage per "NFPA 13, 13D, 13R" without picking one. Also: the
   FD-stamped shop drawing cites **NFPA 13 (2021)**, an edition that does not exist.
4. **Blocking is already committed and carries an unresolved dimension.** A903 says 48"×16",
   ID-4.5 says 48"×18" for the same Market brand signage. It buries when the wall is rocked.
5. **Eagle Pass allows two permanent signs per business; a Home2 package is three.** Zoning
   Appendix A § 15 — verbatim, plus **one free-standing sign per legal lot**, a **250 sq ft
   aggregate cap**, **35 ft** max height, and **no digital or animated signage at all**. Relief is
   a narrow ZBAA variance, and dropping a brand sign needs **Hilton's** written consent too.
   → `CITY-OF-EAGLE-PASS.md`

⚠ **One code question is genuinely open.** The codified ordinance says **2015** I-Codes / 2014
NEC; the City's own June 2025 permit forms and Fire Marshal plan review say **2018** ICC / 2017
NEC. Both are sourced. Build to 2018 and get the adopting ordinance in writing — but note the
provisions that drive sign fabrication are **identical in both editions**, so the sign package is
unaffected either way.

✅ **Answered: IFC Appendix D is adopted** (§ 13-32(Q), verbatim), so the **12" × 18" red-on-white
reflective "NO PARKING—FIRE LANE"** spec is law here. **Appendix J is not adopted**, so no
building information sign is required. Spacing interval and curb striping remain undefined — ask
the Fire Marshal.

## Who to call

| Office | Contact |
|---|---|
| **Eagle Pass Fire Marshal** | Eleazar Cuevas · **(830) 773-1915** · ecuevas@eaglepasstx.gov · 32 Foster Maldonado Blvd. |
| **City Health Unit** (food + pool) | **(830) 773-7781** · 3295 Bob Rogers Dr. |
| **Building / Development Services** | 3295 Bob Rogers Dr. · (830) 773-7781 |
| **Assigned RAS** | Landy Perkins, RAS #371 |
| Architect | MWT Architect, Alden NY |
| Owner | H2EP LLC |

## Counted, not estimated

Off the verified spine — 69 spaces (66 in the `spaces` table plus pool rooms 034/035/036 carried
off the A600 door schedule) and 115 keys:

115 room number plaques · 115 evacuation diagrams · 55 tactile room IDs · 35 restricted-access ·
16 elevator hoistway jamb designations · 16 star-of-life placements · 8 stair ID signs · 8
tactile EXIT · 8 stair floor-level · 6 restroom signs · 5 occupant-load postings · 5 accessible
parking sign stacks · 4+4 electrical room ID and arc-flash · plus low-level R-1 exit signs in all
four guest corridors.

## How to read the confidence markers

Everything quoted verbatim was read from code text, rule text, or the City's own documents —
several were extracted from source PDFs directly rather than summarized. Where a section number
came from a secondary source (NFPA text is paywalled), it says so. **No citation in this package
was invented.** Items marked ⚠ are unresolved and need a person to decide.

Nine premises we started this research with turned out to be wrong — each is called out where it
appears, because each one changes what gets bought.
