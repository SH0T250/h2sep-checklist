/* Hand-authored copy for the reference-room mock book.
 * Everything here is prose written for Austin. Every VERBATIM quote used on the
 * page is pulled at build time from platform/data/ref-rooms-staged.json,
 * platform/data/floor1-staged.json, data/project.sqlite or the crew snapshot -
 * never retyped here. */

export const TYPES = [
  {
    id: '202',
    n: '01',
    type: 'King One Bedroom',
    rooms: ['202', '302', '402'],
    rep: '202',
    sheets: 'A553 plan 01 · elevations A553.1 / A553.2 · ID-5.4 / ID-5.5 · bath A531 / ID-5.11',
    donor: '104',
    donorType: 'King Studio',
    story:
      'Three keys of the only King suite in the building: a king bedroom plus a separate living room with a sofa, a dining table for two and a second TV, which is why this type takes TWO PTAC units per key where every other room takes one.',
    context:
      'It is the closest thing to the built King Studio (room 104), so the package text leans on 104 for the tags they truly share and ships everything else straight from the reference database. The crew has already worked this room: 16 lines checked off and 27 open issues came across from the crew app.',
  },
  {
    id: '217',
    n: '02',
    type: 'King One Bedroom Acc.',
    rooms: ['217', '317', '417'],
    rep: '217',
    sheets: 'A554 plan 01 · elevations A554.1 · ID-5.6 / ID-5.7 · bath A533 / ID-5.13',
    donor: '104',
    donorType: 'King Studio',
    story:
      'The accessible twin of the One Bedroom, three keys, and its bathroom cannot be built from the drawings as they stand: A533 calls an accessible TUB, A554 and A103 draw a ROLL-IN, so both bath packages ship side by side and flagged.',
    context:
      'Nobody has ruled on this key. Ruling D19 put ROOM 118 on the roll-in and named no other room, and ruling D26 has the 118 tub-mark RFI on hold. Until that is answered this room is a checklist, not a buy list. The crew has 7 open issues here and no check-offs yet.',
  },
  {
    id: '230',
    n: '03',
    type: 'QQ Extended',
    rooms: ['230', '232', '330', '332', '430', '432'],
    rep: '230',
    sheets: 'A555 plan 01 with the "@QQ EXT" alternate dimension string · bath A530',
    donor: '105',
    donorType: 'Queen-Queen',
    story:
      'Six keys that are a standard Queen-Queen drawn on the same A555 plan with a deeper alternate dimension string tagged @QQ EXT, so the package is live room 105 almost line for line.',
    context:
      'Same sheet as the donor means no citation gets re-pointed and every A555 reference stands as written. The one real difference is the working wall: 105 now carries GR-305 under ruling D22, and this room ships GR-308 exactly as the database transcribes it, because D22 was proved on a floor-1 count that says nothing about this type. The crew has 17 check-offs and 23 open issues here.',
  },
  {
    id: '238',
    n: '04',
    type: 'QQ Acc.',
    rooms: ['238', '338'],
    rep: '238',
    sheets: 'A556 plan 01 · ID-5.9 · bath A532 / A532.1 / ID-5.12',
    donor: '105',
    donorType: 'Queen-Queen',
    story:
      'Two keys, the only accessible type in the building with two beds, and it carries both open questions at once: the tub-versus-roll-in bathroom and the working-wall tag.',
    context:
      'It leans on live room 105 because that is the only other two-queen type that is built, but the accessible bath package is this room’s own. It is the most flagged room in this set: 17 flagged lines across the two documents. The crew has 6 check-offs and 30 open issues.',
  },
];

/* WHO OWES THE ANSWER.
 * Keyed by a stable id. Where the source document names the owner, the basis
 * is quoted. Where no document names anyone, that is said plainly instead of
 * inventing a name. */
export const OWNERS = {
  bathing: {
    who: 'AUSTIN',
    line: 'Austin closes the configuration. data/project.sqlite states it verbatim: "Only Austin can close this."',
    also:
      'The matrix disagreement underneath it is an RFI nobody has sent: conflicts.md A11, verbatim, "RFI to MWT: which matrix governs?" Ruling D26 records that the room-118 tub-mark RFI is ON HOLD at Austin’s instruction, so this is deliberately open, not forgotten.',
  },
  ptac_mark: {
    who: 'MEP ENGINEER',
    line: 'The mechanical engineer, by RFI. No RFI has been raised.',
    also:
      'The documents decline to answer: M401 keynote 7 declines to be the authority, M302-M304 give no room numbers, and M401’s sentence "each guestroom is served by a single PTAC" is wrong for the One Bedroom types. The mark is left blank on the line rather than guessed.',
  },
  ptac_count: {
    who: 'FIELD + MEP ENGINEER',
    line: 'Triun counts the sleeves in the field; the engineer confirms the second unit’s sub-assembly.',
    also:
      'The room’s own rows carry two units and the whole ten-row PTAC sub-assembly repeats for the second one. The condensed punch shows a single thermostat line, which does not match two units.',
  },
  heads: {
    who: 'FIRE PROTECTION',
    line: 'The fire protection designer, or the sprinkler sub’s stamped shop drawings for floors 2, 3 and 4.',
    also:
      'FP-1, FP-2 and FP-3 were read head by head on rooms 107 and 108 only. Nothing was counted on this type, so the line ships with NO quantity at all and the crew verifies every head it can see.',
  },
  workingwall: {
    who: 'RK DESIGN + TRIUN',
    line: 'Triun pulls the 2nd, 3rd and 4th Floor tabs of FF&E Installation List.xlsx; RK Design confirms the tag before any casework is released.',
    also:
      'Ruling D22 fixed the floor-1 Queen-Queen wall to GR-305 on an exact workbook count (6 plain keys, 6 units; 2 connecting keys, 2 units). That arithmetic covers floor 1 and those two types only. Extending it to this type would be a guess, so the tag ships as drawn.',
  },
  gr404: {
    who: 'RK DESIGN',
    line: 'RK Design says which drapery this key takes.',
    also: 'GR-403 and GR-404 are alternates tagged on the same sheet, not a pair. Buying both buys one you will never hang.',
  },
  microwave: {
    who: 'RK DESIGN / APPLIANCE TRANSMITTAL',
    line: 'Confirm against A551 / A552 / A554 / A556 or the appliance transmittal before any purchase order.',
    also: 'No document states the countertop microwave. It is an ~85% inference off the accessible 700 + 300 VA circuit split.',
  },
  a532_accessory: {
    who: 'ARCHITECT',
    line: 'The architect. A532.1, the roll-in plan, tags no toilet-wall or vanity-wall accessory at all.',
    also:
      'The tagged elevations belong to the TUB plan. The roll-in views carry "blocking for grab bar" leaders, so the items are required but nobody drew them.',
  },
  elevation_count: {
    who: 'FIELD COUNT',
    line: 'Count it in the room. The elevations are not a takeoff and say so.',
    also: 'A530 prints the warning in its own words: do not treat that as a takeoff.',
  },
  gr905: {
    who: 'ARCHITECT',
    line: 'The architect. Ask what GR-905 is before ordering anything against it.',
    also:
      'No legend or spec describes it. A530 carries a 900-series in a different tag shape where 905 = TELEPHONE, but no document states the two are the same, so the room carries both a 905 row and a GR-905 row. conflicts.md B4.2 takes the opposite position and calls GR-905 the plain telephone tag. Two live positions, unresolved.',
  },
  paint: {
    who: 'ARCHITECT (RFI)',
    line: 'The architect, by RFI. Same physical condition, four sheets, two paint codes.',
    also: 'A531 forbids resolving it silently. PT-02’s finish-schedule card is also OCR-garbled.',
  },
  st02: {
    who: 'ARCHITECT / INTERIOR DESIGNER',
    line: 'The architect and RK Design together. This one is purchase-order grade.',
    also: 'ST-02 has no card in the 67-card finish schedule, and the same detail in the same room type is tagged ST-01 on other sheets. One of the two is wrong.',
  },
  w7s8: {
    who: 'ARCHITECT',
    line: 'The architect. Which bath walls back a shaft is not stated per room type.',
    also: 'W7 carries no rating of its own; the rating is S8’s. Neither is tagged on A550-A556 or A530-A533.',
  },
  tile: {
    who: 'ARCHITECT (RFI)',
    line: 'The architect, by RFI. The shower wall tile has no finish code printed anywhere.',
    also: 'ID-5.10 says "tile shower walls" in words and stops there. It is not SS-01.',
  },
  base: {
    who: 'ARCHITECT',
    line: 'The architect. There is no "B" family in the 67-card finish schedule.',
    also: 'A532 carries no T-01.1 and no floor-finish tag either.',
  },
  wc12: {
    who: 'ARCHITECT / RK DESIGN',
    line: 'The architect or RK Design. The finish schedule scopes WC-12 to the Hydration Station and Servery, not a guest bath.',
    also: '',
  },
  a533_medium: {
    who: 'FIELD COUNT + ARCHITECT',
    line: 'Count them in the room, and have the architect confirm the accessible bath accessory schedule for this type.',
    also:
      'data/project.sqlite carries these rows at MEDIUM for room 217 with no reason recorded, except HD-08, whose own row says "counts as stated by A533’s own summary block". The staged HD-08 line instead carries room 104’s caveat, "elevation-sourced - not a takeoff", which says the opposite of what room 217’s own source says. The independent check calls that out as a defect.',
  },
  carpetbase: {
    who: 'FIELD / FINISH SCHEDULE',
    line: 'Carried from the scheduled area, not tagged on A555. Confirm at the walk.',
    also: '',
  },
  gr3door: {
    who: 'ARCHITECT',
    line: 'The architect. No room of this type is flagged connecting, yet A554 draws a connecting leaf.',
    also: 'Keynote 9 explains it as the alternate door position for rooms connecting TO accessible rooms. Flag F-03 says it is not a buy. Confirm before the door schedule is released.',
  },
  sk34: {
    who: 'PLUMBING ENGINEER (RFI)',
    line: 'The plumbing engineer, by RFI.',
    also: 'P401 and P402 restrict the kitchenette sink to "the suite/extended units" and assign it to none of the seven unit plans; P104 schedules no product. A dishwasher with no drawn sink is itself an RFI.',
  },
  gr301: {
    who: 'ARCHITECT',
    line: 'The architect. The King headboard is not tagged on A553 but is tagged on its accessible twin A554.',
    also: 'Read as a missing tag, not a missing headboard. It was NOT added to the checklist.',
  },
  gr6001: {
    who: 'ARCHITECT',
    line: 'The architect. The Queen box spring cover is tagged on A555 for the standard QQ and not on A556 for this type.',
    also: 'Two keys affected. Not added.',
  },
  ptrap: {
    who: 'DESIGNER + PLUMBING SUB',
    line: 'Assign it before the accessible vanities are ordered.',
    also: 'Stated only on G402. Zero hits across A532, A532.1, A533, A551, A552, A554, A556, ID-5.12, ID-5.13, P104, P401 and P402. Cheap item, fails a TAS walk on seven keys.',
  },
  p118: {
    who: 'PLUMBING ENGINEER',
    line: 'The plumbing engineer. Listed here because it sits in this type’s gap set; the key it hits is 118.',
    also: 'P401/P402 offer no Acc. Mod. plan and E400 has the same hole.',
  },
  b45: {
    who: 'RK DESIGN',
    line: 'RK Design, before final takeoff. This one is NOT carried anywhere in the staged package.',
    also: 'conflicts.md B4.5 is OPEN and names GR-300, GR-305, GR-307, GR-308, GR-318, GR-322, GR-323 and GR-325 as ambiguous without A530.',
  },
  b42: {
    who: 'RK DESIGN / FF&E LIST',
    line: 'Confirm via FF&E Installation List.xlsx. This one is NOT carried anywhere in the staged package.',
    also: 'B4.2 says GR-905 is the plain 905 telephone tag and not a GR- item, which is the opposite of what the room note says. Both positions are live.',
  },
  split438: {
    who: 'ARCHITECT',
    line: 'The architect. Which of A551 and A552 governs which key is a ~90% assumption in the database, not a stated fact.',
    also:
      'room_types "King Studio Acc." records it verbatim: two sheets for two keys, A551 "King Studio Acc." and A552 "King Studio Acc. Mod.", assumed 118 = Acc. Mod. and 438 = Acc. It matters here because room 438 is one of the seven accessible keys in the same tub-versus-roll-in conflict, and because ruling D19 rests on which sheet governs 118.',
  },
};

/* Which owner covers which flagged / medium line, by item key. */
export const FLAG_OWNER_BY_KEY = {
  hd05_a: 'bathing', hd14_a: 'bathing', hd51_a: 'bathing',
  plmb_shower_a: 'bathing', plmb_shencl_a: 'bathing',
  db_itm0712: 'bathing', db_itm0714: 'bathing', db_itm0715: 'bathing',
  db_itm0716: 'bathing', db_itm0717: 'bathing',
  db_itm0721: 'bathing', db_itm0723: 'bathing', db_itm0724: 'bathing',
  db_itm0725: 'bathing', db_itm0726: 'bathing',
  mech_ptac: 'ptac_mark',
  fp_heads_a: 'heads',
  gr308_a: 'workingwall',
  gr404_a: 'gr404',
  u_ef5592c066: 'microwave',
};

/* The bath accessory lines mean different things in different rooms, so they
 * are resolved per room and never by tag alone. */
export const FLAG_OWNER_BY_ROOM_KEY = {
  '202:hd02_a': 'elevation_count',
  '202:hd08_a': 'elevation_count',
  '230:hd03_a': 'elevation_count',
  '230:hd08_a': 'elevation_count',
  '217:hd02_a': 'a533_medium',
  '217:hd06_a': 'a533_medium',
  '217:hd08_a': 'a533_medium',
  '217:hd09_a': 'a533_medium',
  '217:hd10_a': 'a533_medium',
  '238:hd02_a': 'a532_accessory',
  '238:hd06_a': 'a532_accessory',
  '238:hd08_a': 'a532_accessory',
  '238:hd10_a': 'a532_accessory',
};

/* Gated rows (recorded in the room note, no checklist line) - owner by tag. */
export const GATED_OWNER = {
  'GR-905': 'gr905',
  'PT-04': 'paint',
  'PT-02': 'paint',
  'ST-02': 'st02',
  'W7 / S8': 'w7s8',
  'SS-01': 'bathing',
  'GR-3': 'gr3door',
  'CPT-01.1': 'carpetbase',
  '<untagged>': 'tile',
  'B-05': 'base',
  'WC-12': 'wc12',
};

/* Document gaps (placeholders) - owner by placeholder id. */
export const GAP_OWNER = {
  'PH-GU-001': 'heads',
  'PH-GU-003': 'sk34',
  'PH-GU-005': 'bathing',
  'PH-GU-006': 'bathing',
  'PH-GU-009': 'gr301',
  'PH-GU-010': 'gr6001',
  'PH-GU-012': 'gr905',
  'PH-GU-016': 'p118',
  'PH-GU-027': 'ptrap',
};

/* Open conflicts in data/project.sqlite that touch a room and are NOT carried
 * anywhere in the staged package. The verifier found these; they are shown as
 * their own block so nothing is hidden. */
export const UNCARRIED = {
  '202': ['B4.5', 'B4.2'],
  '217': ['B4.5'],
  '230': ['B4.5'],
  '238': ['B4.5'],
};

export const EXTRA_CARRIED = {
  '217': ['split438'],
  '238': ['split438'],
};

/* Verifier output, verbatim. */
export const VERIFIER = {
  '202': {
    verdict: 'FAIL',
    defects: [
      "MATERIAL - Live crew line dropped with an open field issue. The crew's room 202 doc (tools/out/backups/crew-ref-rooms-snapshot.json) holds 42 lines including gr905_a (GR-905, category 'FF&E - Misc', reliability FLAGGED, src A553, sort 21000) carrying an OPEN issue 'MISSING'. The staged doc 202 has no such line, so 27 of the crew's 28 open issues are carried and one is lost. meta.fieldState discloses the count ('1 with no line (202/gr905_a)') but the ROOM records nothing: note n_gategaps names GR-905 as a gated row and quotes its sqlite note, yet never says the crew already flagged it MISSING in the field. Floor 1's carry was exact by design (289 issues to 289, run fails otherwise); this one is 27/28 and does not fail. Under D24 ('NOTHING is deleted') this is a regression against work the crew app already holds. Secondary hazard: crew gr905_a sits at sort 21000, the slot the new D28 line dh_closer_a now occupies, so restoring the line later collides.",
      "MATERIAL - Conflicts-table entry B4.2 (status OPEN) touches this room and appears nowhere in doc 202 or 202-MEP. B4.2 topic 'FF&E - GR-325, GR-326, GR-905 not in the standard spec', positions: 'Confirm via FF&E Installation List.xlsx - which OV-002 excludes. GR-905 is separately resolved as the plain 905 telephone tag, not a GR- item.' Room 202 carries BOTH the 905 Telephone line and the GR-905 row. B4.2 takes the OPPOSITE position from the only text the doc does carry (ITM-0280 in n_gategaps: 'recorded as printed, NOT merged with the 905 TELEPHONE tag'). Two live positions exist in the reference DB and the mock-up shows one, so the reader cannot see that the conflict is two-sided.",
      "MATERIAL - Conflicts-table entry B4.5 (status OPEN) touches this room and is absent from both docs. B4.5 topic 'FF&E - GR tags ambiguous without A530', positions: 'GR-300/305/307/308/318/322/323/325 - confirm before final takeoff.' Room 202 ships gr318_a (GR-318 Sofa Table @ Sofa, qty 1) and gr323_a (GR-323 Nightstand @ Left, qty 1). Neither line is flagged, neither carries a note, and no room note mentions B4.5. A takeoff-grade ambiguity on two shipped tags is carried nowhere.",
      "MODERATE - Gated-out rows whose sqlite note states an explicit document conflict are dropped without record whenever the row's reliability is HIGH. Note n_gategaps is scoped to 'FLAGGED or MEDIUM' rows only (it captures 4: GR-905, PT-04/ITM-0303, ST-02/ITM-0308, W7-S8/ITM-0077), so these three conflicts on room 202 disappear entirely: ITM-0073 (Drywall W5) 'rating design conflict carried - A300 prints UL U340, A315 cites UL U301 / USG 810218'; ITM-0074 (Drywall W4) 'rating design conflict carried - A300 prints \\'UL #311\\', A315 prints \\'#U311\\'. A550 also reads W4 as the shower/tub end wall (MEDIUM)'; ITM-0108 (Stone / Surround SS-01) whose note cites conflicts.md A11 and a rescope off 'All guestroom types'. The hard rule is that a document conflict is CARRIED and FLAGGED; filtering the carry by row reliability rather than by the presence of a conflict drops three of them.",
      "MODERATE - instanceNote lost on gr315_a, an unshared tag that the stated package rule says must ship from sqlite verbatim. Donor room 104 carries GR-304 (Working Wall @ King Studio Suite), not GR-315, so gr315_a has no live counterpart and by meta.packageSource must ship 'from data/project.sqlite verbatim with its own reliability'. sqlite room_items for room 202 / GR-315 carries instance_note 'ONE run - A553 tags it twice, both ends of the same run'; the staged line ships instanceNote ''. The crew's live 202 doc already carries that exact sentence. It is the one sentence that stops a reader of A553 from treating a twice-tagged run as two working walls against a qty-1 line. (Mechanism: the donor convention discards sqlite instance_note on every line, which explains how it happened but not why an unshared tag lost its only disambiguating text.)",
      "MINOR - db_itm0319 ships under category 'Fire Alarm', a band the app does not know and that exists on no floor-1 guest room. build_floor1.mjs defines APP_MEP_CATEGORY_ORDER = {Mechanical, Electrical, Plumbing, Fire Protection, Low Voltage} and reports any MEP category outside it ('MEP CATEGORIES THE APP DOES NOT KNOW ... it will sort last'); build_ref_rooms.mjs has no equivalent check, so this shipped unreported. Net effect: room 202's two smoke-detector lines land in two different bands - fp_smoke_a under 'Fire Protection' at sort 4011 and the second detector under 'Fire Alarm' at sort 7010, in a group that renders after everything else. A floor-1 category census confirms zero 'Fire Alarm' lines anywhere in the approved build.",
    ],
  },
  '217': {
    verdict: 'FAIL',
    defects: [
      "905_a (Appliance, tag 905, Telephone) in /home/user/h2sep-checklist/platform/data/ref-rooms-staged.json doc 217 ships qty 2 at reliability HIGH with an EMPTY instanceNote. The fold's first row by rowid is ITM-0347 (rowid 4914), reliability MEDIUM, primary_sheet A554, instance_note 'tag 2 of 2 - A554 tags 905 twice', note 'second tag read at MEDIUM; the first 905 is the common-core row'. The second row is ITM-0082 (rowid 5054, HIGH, A550). The line correctly takes src=A554 from ITM-0347 but does NOT take its MEDIUM reliability, and drops both of its notes. Donor room 104's 905 line is qty 1 / HIGH off A550 - a one-telephone room - so it cannot supply reliability for the tag that creates 217's second unit. Net effect: a qty-2 telephone count published at HIGH when data/project.sqlite explicitly downgrades the tag that produces unit 2, with nothing on the line saying so.",
      "hd08_a (Bath Accessory, HD-08, 'Grab Bar ADA 24\" VERTICAL MOUNT', qty 4) carries instanceNote '⚑ elevation-sourced - not a takeoff', byte-identical to LIVE room 104's hd08_a, which derives from 104's own DB row ITM-0136 (note 'elevation-sourced - not a takeoff', primary_sheet A530). Room 217's own rows say the opposite: ITM-0348 note is \"counts as stated by A533's own summary block\". The build imported the donor's contradicting caveat onto a line whose own source states the count IS printed, and dropped this room's own note entirely. Label/citation fidelity failure - the donor's caveat is not a shared fact with this tag on this room.",
      "mech_tstat in doc 217-MEP ships qty 1 at reliability HIGH with no flag, while the same document's mech_ptac ships qty 2 and quotes this room's own rows verbatim in its instanceNote: 'NO PTAC mark is stated for this type ... TWO units per key: A554 places keynote 30 x2, thermostat x2 and J-box x2' (room_items ITM-0395/ITM-0396), and ITM-0396 adds that the 10-row PTAC sub-assembly '(sleeve, louver, drain kit, low-ambient kit, fresh-air kit, filter, access panel, EMS controller, thermostat, sub-base) REPEATS for this second unit'. The DB transcribes only one thermostat row (ITM-0060, instance_note 'PTAC 1'). A documented count conflict on a checklist line is silently resolved to 1 - it is neither carried on the line, nor flagged, nor mentioned in any room note. Violates 'a document conflict is CARRIED and FLAGGED, never resolved'.",
      "mech_ptac in doc 217-MEP makes a false citation-corroboration claim. Its instanceNote states: \"What is left - \\\"A554 KN1\\\" - is numbering the database writes sheet-independently, so it holds on A554 and this room's own row(s) ITM-0395, ITM-0396, ITM-0061 cite it too.\" None of those three rows cites A554 KN1: ITM-0395 and ITM-0396 cite 'M401 detail 07; M201 schedule; A554.1 view 01 + view 07', and ITM-0061 cites 'M501 det.9; A55x KN30'. The only room-217 row that cites A55x kn1 is ITM-0010 (Electrical, 'PTAC branch circuit'). Root cause is in /home/user/h2sep-checklist/platform/tools/build_ref_rooms.mjs: composeMepCitation() builds ownRowIds from any row citing ANY A55-series segment (lines 1035-1046) and then prints that list as corroborating the surviving segment (line 1086). A fabricated provenance statement on a FLAGGED line the crew would use to find the keynote.",
      "conflicts.md B4.5 (status OPEN in data/project.sqlite conflicts table): 'FF&E - GR tags ambiguous without A530 ... GR-300/305/307/308/318/322/323/325 - confirm before final takeoff.' Room 217 carries GR-318 (gr318_a, 'Sofa Table @ Sofa') and GR-323 (gr323_a, 'Nightstand @ Left'), both at reliability HIGH with empty instanceNote and issue ''. B4.5 appears in no item flag and in none of the five room notes (n_config, n_dbroom, n_gaps, n_gategaps, n_type) on either doc 217 or 217-MEP. LOWER CONFIDENCE / INHERITED: live floor-1 rooms 104 and 118 have the identical gap, so this was carried in from the approved donor rather than introduced here - but the conflict does touch this room and is not carried.",
    ],
  },
  '230': {
    verdict: 'FAIL',
    defects: [
      "DEFECT 1 (room-230-specific, provable) — 230-MEP / fp_heads_a: the `src` ends with the segment \"FP-1, verified head-by-head on rooms 107 and 108\", which is byte-verbatim the `source_sheet` of ROOM 105's Fire Sprinkler rows ITM-0447 / ITM-0448 / ITM-0449. `SELECT * FROM room_items WHERE room_no='230' AND category IN ('Fire Sprinkler','Fire Protection')` returns ZERO rows — room 230 has no sprinkler row of any kind. The line therefore asserts a head-by-head verification provenance that does not exist for this room or this type, and it contradicts its OWN instanceNote on the same line, which correctly says \"NO HEAD COUNT IS VERIFIED FOR THIS ROOM TYPE\" and quotes PH-GU-001 (\"No head count is verified for ... QQ Extended\"). Cause: platform/tools/build_ref_rooms.mjs `fpNoCount()` (~line 1446) rewrites instanceNote, deletes qty and downgrades reliability to MEDIUM, but never touches `src`, so the donor's row-derived citation rides through untouched.",
      "DEFECT 2 (same line, floor mis-citation) — 230-MEP / fp_heads_a `src` cites only FP-1 and quotes \"144 total heads 1st floor\". Room 230 is on FLOOR 2 (rooms.floor = '2'). FP-2 is the floor-2 sprinkler sheet — it is named in PH-GU-001's own suggested_sheet (\"FP-1 / FP-2 / FP-3\") and quoted inside this very line's note — yet FP-2 never appears in any `src` in either 230 document (0 occurrences). meta.mepSource explicitly promises the punch is \"re-cited onto this room's own sheet\"; the architectural re-point was a no-op here because QQ Extended shares A555 with the donor, and the non-architectural sheets (FP series) were never re-pointed at all. A crew member sent to FP-1 with a 1st-floor head total is on the wrong sheet.",
      "DEFECT 3 (5 lines, inherited from the live donor but wrong for this room) — 230-MEP elec_panel, elec_outlets, elec_sink_sw, lv_wap and lv_tvdata all cite A555 electrical view 04.1. data/project.sqlite room_types identifies view 04.1 as the QQ CONNECTING plan, verbatim: \"QQ Connecting | Rooms 103, 215, 236, 336, 403, 436. A555 view 01.1 'QQ Studio Conn.' + electrical view 04.1\". Room 230 is QQ Extended, rooms.connecting = '0', and its own room_types row reads \"Same A555 view 01 plan\". No room_items row for 230 (or for donor 105) cites 04.1 or 01.1 anywhere — `source_sheet LIKE '%04.1%'` returns nothing for either room. build_floor1.mjs's own documented rule says the '.1' variant \"is dropped where rooms.connecting = 0\", but that rule was only wired into the King-family composition path, so the QQ path carries the connecting-plan reference onto a non-connecting room. Inherited verbatim from live 105-MEP (which has the same flaw), and nothing in 230's notes discloses it.",
      "DEFECT 4 (minor, conflicts-table coverage) — conflicts.md B4.5 is OPEN (\"FF&E - GR tags ambiguous without A530 — GR-300/305/307/308/318/322/323/325 — confirm before final takeoff\") and names FOUR tags this room carries as live lines: GR-300 (gr300_a, qty 2), GR-308 (gr308_a), GR-318 (gr318_a) and GR-322 (gr322_a, qty 3 on D12). B4.5 appears nowhere in doc 230 or 230-MEP — 0 occurrences of the id or of \"final takeoff\". Only the GR-308 half of that ambiguity is carried, via note n_d22. Mitigating: floor1-staged (approved, LIVE) does not carry B4.5 either, so this is an inherited convention rather than a regression, and the GR-322 qty-3 line does carry \"Confirm both positions in the field before ordering.\"",
    ],
  },
  '238': {
    verdict: 'FAIL',
    defects: [
      "DEFECT 1 (severe) - /home/user/h2sep-checklist/platform/data/ref-rooms-staged.json docs['238'].items.gr403_a: an OPEN document conflict unique to this room type is RESOLVED BY OMISSION. data/project.sqlite room_items for room 238, tag GR-403 (source A556:51) is reliability FLAGGED with note verbatim: \"F-5 - A556 tags GR-403 AND GR-404 on the same drawing. They are ALTERNATES, a manual closet drapery and an ADA closet drapery, not a pair. Both carried, both flagged. DO NOT BUY BOTH\". The staged line ships reliability HIGH with instanceNote \"\" - the flag, the F-5 citation and the DO-NOT-BUY-BOTH warning are all gone. Its partner gr404_a (sort 19020) correctly ships FLAGGED carrying that same F-5 note, so the document now reads as one confirmed drapery plus one flagged alternate, which is exactly the purchasing trap the database warns against. Cause: platform/tools/build_ref_rooms.mjs:1798 takes `reliability` (and instanceNote) from the donor for ANY tag shared with live room 105; room 105's GR-403 is HIGH because 105 has no GR-404 alternate. That fact about room 105 is not evidence about room 238. No floor-1 room carries this conflict, so there is no precedent excusing it. Violates the hard rule that a document conflict is CARRIED and FLAGGED, never resolved.",
      "DEFECT 2 (major) - docs['238'].items.hd12_a: reliability downgraded FLAGGED -> HIGH and the room's own note erased. data/project.sqlite room 238 HD-12 row: reliability FLAGGED, source_sheet \"A532 elevations (keyed to the TUB plan)\", note \"ASSUMPTION - see HD-02 note\" - i.e. this line is part of the tub-versus-roll-in assumption chain that is OPEN on this key. The staged line ships reliability HIGH with instanceNote \"\". Its three siblings with the identical database note and no donor counterpart (hd02_a, hd06_a, hd10_a) all correctly ship FLAGGED with \"⚑ ASSUMPTION - see HD-02 note\", so the same conflict is flagged on three lines and silently dropped on the fourth. Same donor-override cause (build_ref_rooms.mjs:1798); qty was correctly taken from sqlite (1, not the donor's 2), which proves the reliability/note carry is the isolated fault. (Live room 118 ships the same downgrade, so the behaviour is precedented on floor 1 - it is still an unflagged open conflict on a room being staged for Austin's approval.)",
      "DEFECT 3 (major) - docs['238'].items.hd08_a: reliability downgraded FLAGGED -> MEDIUM and the rationale carried is a different room's. data/project.sqlite room 238 HD-08 row: reliability FLAGGED, source_sheet \"A532 elevations (keyed to the TUB plan)\", note \"ASSUMPTION - see HD-02 note\". The staged line ships reliability MEDIUM with instanceNote \"⚑ elevation-sourced - not a takeoff\", which is donor room 105's note describing A530:43, room 105's shower-wall elevation. The line's `src` correctly reads A532, so the shipped line now pairs room 238's citation with room 105's reason, and room 238's own ASSUMPTION flag is gone. Same cause (build_ref_rooms.mjs:1798).",
      "DEFECT 4 (moderate) - docs['238-MEP'].items db_itm0712, db_itm0714, db_itm0715, db_itm0716, db_itm0717: each instanceNote asserts \"Room 238 carries BOTH configurations, both are built, neither is superseded\", three sentences after quoting data/project.sqlite verbatim that Configuration A (TUB) and Configuration B (ROLL-IN SHOWER) are \"MUTUALLY EXCLUSIVE - only one gets built on each key\". The note therefore contradicts itself and tells the field that both a tub and a roll-in get built in one accessible bathroom. The database's own words are \"Both are emitted\", and the FF&E-side config lines in the same package (hd05_a, hd14_a, hd51_a) use the correct wording \"Build only what the answer turns out to be, and see the room note.\" The five MEP lines should carry that same wording.",
    ],
  },
};

/* The short list a PM needs: defects that change what gets bought or what the
 * crew does, distilled from the verifier output above. */
export const BUY_STOPPERS = [
  {
    room: '238',
    line: 'gr403_a  GR-403 Closet Drapery',
    what: 'Ships HIGH with no note. The database has it FLAGGED with "DO NOT BUY BOTH" - GR-403 and GR-404 are alternates on one sheet.',
    effect: 'Reads as one confirmed drapery plus one alternate. Someone buys both.',
  },
  {
    room: '202',
    line: 'gr905_a  GR-905',
    what: 'The crew app holds this line with an open MISSING issue. The staged doc has no such line, so 27 of the crew’s 28 issues carried and one did not.',
    effect: 'Field work already recorded would be lost at cutover. Ruling D24 says nothing is deleted.',
  },
  {
    room: '217',
    line: '905_a  Telephone, qty 2',
    what: 'Published at HIGH. The row that creates the second telephone is MEDIUM in the database and says "A554 tags 905 twice".',
    effect: 'A count that is uncertain reads as certain across three keys.',
  },
  {
    room: '217',
    line: 'mech_tstat  Thermostat, qty 1',
    what: 'The PTAC line on the same page ships qty 2 and quotes "thermostat x2". The thermostat line still says 1.',
    effect: 'A documented count conflict was resolved silently. One thermostat gets rough-in on a two-PTAC room.',
  },
  {
    room: '230',
    line: 'fp_heads_a  Sprinkler heads',
    what: 'The citation still points at FP-1 and quotes "144 total heads 1st floor". Room 230 is on floor 2; FP-2 is its sheet.',
    effect: 'The crew is sent to the wrong sprinkler sheet.',
  },
  {
    room: '238',
    line: 'hd12_a and hd08_a  Bath accessories',
    what: 'Both are FLAGGED "ASSUMPTION - see HD-02 note" in the database and ship HIGH and MEDIUM here, with hd08_a carrying room 105’s reason instead of its own.',
    effect: 'Two lines of the tub-versus-roll-in assumption chain look settled when they are not.',
  },
  {
    room: '238-MEP',
    line: 'the five bathing-configuration lines',
    what: 'Each note says "Room 238 carries BOTH configurations, both are built" three sentences after quoting "MUTUALLY EXCLUSIVE - only one gets built".',
    effect: 'Read literally it tells the field to build a tub and a roll-in in one bathroom.',
  },
  {
    room: 'all four',
    line: 'conflicts.md B4.5',
    what: 'OPEN, and it names GR-300, GR-305, GR-307, GR-308, GR-318, GR-322, GR-323, GR-325 as ambiguous without A530. It appears in no line and no note.',
    effect: 'A takeoff-grade ambiguity on tags that are shipping is carried nowhere. Floor 1 has the same hole.',
  },
];
