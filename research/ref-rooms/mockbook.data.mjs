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
      'It is the closest thing to the built King Studio (room 104), so the package text leans on 104 for the tags they truly share and ships everything else straight from the reference database. The crew has already worked this room, and every check-off and every open issue they recorded came across. The counts are in the strip below and they are read off the file, not typed here.',
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
      'It leans on live room 105 because that is the only other two-queen type that is built, but the accessible bath package is this room\'s own. It is the most flagged room in this set by a wide margin, because both open questions land on it at once. The counts are in the strip below and they are read off the file, not typed here.',
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
    line: 'Triun counts what is installed in the room; the engineer confirms the second unit\'s sub-assembly.',
    also:
      'The room\'s own rows carry two PTAC units and say the whole ten-row sub-assembly (sleeve, louver, drain kit, low-ambient kit, fresh-air kit, filter, access panel, EMS controller, thermostat, sub-base) repeats for the second one. The reference database transcribes those members ONCE, for PTAC 1. The lines therefore ship the transcribed row count and say so on their face rather than doubling a row the database does not hold. Counting the installed units is the only honest way to close it.',
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
  wall_rating: {
    who: 'ARCHITECT (RFI)',
    line: 'The architect, by RFI, and the answer has to reach the inspector before the walls are closed.',
    also:
      'Two rated guestroom walls carry two different UL listings on two sheets. W5: A300 prints UL U340 while A315 cites UL U301 with USG 810218. W4: A300 prints "UL #311" and A315 prints "#U311", and A550 also reads W4 as the shower and tub end wall. Both are the same physical wall on the same job. conflicts.md B5.6 is open on the same two tags for a different reason, because the franchise note points them at sheets A300W and A305W that do not exist in the G000 index.',
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
    also: 'Stated only on G402. Zero hits across A532, A532.1, A533, A551, A552, A554, A556, ID-5.12, ID-5.13, P104, P401 and P402. Cheap item, fails a TAS walk on seven keys. It is a real gap on those seven accessible keys. Where it appears under a room that is not accessible, the independent check found it was matched only because the sheet names G402 and P402 were read as room key 402. See the open findings above.',
  },
  p118: {
    who: 'PLUMBING ENGINEER',
    line: 'The plumbing engineer. The key it hits is 118, not this one.',
    also: 'P401/P402 offer no Acc. Mod. plan and E400 has the same hole. The independent check found that this placeholder is in this room\'s gap set only because the sheet name P402 was read as room key 402. It is a real gap on room 118 and it does not belong under this header. See the open findings above.',
  },
  b45: {
    who: 'RK DESIGN',
    line: 'RK Design, before final takeoff.',
    also: 'conflicts.md B4.5 is OPEN and names GR-300, GR-305, GR-307, GR-308, GR-318, GR-322, GR-323 and GR-325 as ambiguous without A530. The fix round put it on every line in this package that carries one of those tags, and in room note n_conflicts. Nothing about it is settled; it is now visible.',
  },
  b42: {
    who: 'RK DESIGN / FF&E LIST',
    line: 'Confirm via FF&E Installation List.xlsx.',
    also: 'B4.2 says GR-905 is the plain 905 telephone tag and not a GR- item, which is the opposite of what the room note says. Both positions are live, and the fix round put the entry on the 905 line and on the GR-905 line so the reader can see both.',
  },
  b31: {
    who: 'PLUMBING ENGINEER (RFI)',
    line: 'The plumbing engineer, by RFI, before anyone orders guestroom trim. The conflicts table says exactly that in its own words.',
    also:
      'conflicts.md B3.1 is OPEN: P401 and P402 mark SH-1 / L-2 / SK-3 / SK-4 while the P104 schedule lists guestroom showers SH-3 and SH-4, lavs L-3 and L-4, and only SK-1 and SK-2 for the laundry. Both sets are carried. The independent check found the entry riding on the kitchenette sink line and NOT on the shower or lavatory lines whose marks it also names, so read the carriage table in this section before you trust the flags.',
  },
  wc02: {
    who: 'ARCHITECT / RK DESIGN',
    line: 'The architect or RK Design. Two sheets give this accessible bathroom two different finish palettes.',
    also:
      'Room 217 row ITM-0378 says it in its own words: A533 uses the standard palette WC-02 / T-01.1 / PT-02 for an accessible bath while A532 uses WC-12 / B-05 / PT-04. Confirm which is intended. The independent check found that this one is in no line and in no note, because the row does not happen to use the word conflict.',
  },
  grille_material: {
    who: 'MEP ENGINEER',
    line: 'The mechanical engineer. Three documents give the room grille three different instructions and none of them settles the material.',
    also:
      'Room 230 row ITM-0053 reads, verbatim, "material unsettled - polypropylene vs aluminum, three instructions, no source settles it", cited M201 vs M501 det.9 vs M401 KN1/KN5. The line as staged says the grille is painted to match, which is a statement about finish on a part whose material is not decided.',
  },
  bath_exhaust: {
    who: 'MEP ENGINEER (RFI)',
    line: 'The mechanical engineer, by RFI, before any regulator or fan is ordered.',
    also:
      'Room 230 rows ITM-0070 and ITM-0065 are both FLAGGED. ITM-0070: M305 shows a plain ceiling grille plus an Aldes regulator on a central riser and NO in-room fan, fan versus grille designation unresolved, coordination_issues C-06, do not order 115. ITM-0065: M305\'s own numbers give 49 inlets against about 119 needed, count unsupported by its only source.',
  },
  m_series_floor: {
    who: 'TRIUN (SHEET CHECK)',
    line: 'No RFI needed. Somebody reads the floor-2 mechanical plan and re-points the citation.',
    also:
      'M301 is the Mechanical First Floor Plan. Rooms 202, 217, 230 and 238 are all on floor 2, whose plan is M302. The sprinkler line was re-pointed by the fix round and the M-series was not, so a crew member sent to M301 line 30 or M301 GN5 is on the wrong sheet.',
  },
  ptac_detail: {
    who: 'TRIUN (SHEET CHECK)',
    line: 'No RFI needed. The detail number on M401 has to match the room type before the line goes out.',
    also:
      'M401 is the Mechanical Typical Guestroom sheet and it carries seven room types, so on that sheet the detail number IS the room type. Room 238\'s own row cites M401 detail 02; the staged line cites detail 01, which is the plain Queen-Queen. Room 230 legitimately carries detail 01.',
  },
  st02_a556: {
    who: 'ARCHITECT / INTERIOR DESIGNER',
    line: 'Same owner as ST-02 itself. The point here is that the staged citation states something room 238\'s own row denies.',
    also:
      'Room 238 row ITM-0694 reads ST-02 on A556 el.07 and says A550, A551, A552, A553.2 and A555 tag ST-01 at the identical condition, deliberately leaving A556 off that list. The staged line cites A556 as ST-01 tagged, which is the donor room\'s reading of the donor room\'s drawing.',
  },
  generator_fix: {
    who: 'GENERATOR FIX (TRIUN)',
    line: 'Nobody outside owes an answer. The generator states something about this room that the reference database contradicts, and the generator gets corrected.',
    also:
      'The corroboration test walks only the rows in the support set for one condensed line and then prints a room-wide negative. Room 202 has a row that does cite the segment in question, so the sentence is wrong in the room\'s own data.',
  },
  n_gaps_scope: {
    who: 'GENERATOR FIX (TRIUN)',
    line: 'Nobody outside owes an answer. This is a bug in the placeholder matcher and it gets fixed in the generator.',
    also:
      'The matcher accepts the sheet designations P402 and G402 as room key 402, so a gap about room 118\'s plumbing plan and a gap about accessible lavatory p-trap wrap ride under a header that says they are gaps against this room type. Room 202 is not an accessible key.',
  },
  reliability_fold: {
    who: 'GENERATOR FIX (TRIUN)',
    line: 'Nobody outside owes an answer. The line prints the folded worst-case reliability against the full row list, so a mixed group misreports its members.',
    also:
      'On a package whose whole premise is quoting the database verbatim, a live line must not say a row reads MEDIUM when the database reads it HIGH.',
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
  gr403_a: 'gr404',
  gr404_a: 'gr404',
  u_ef5592c066: 'microwave',
  /* flagged by the fix round, when the OPEN conflicts table was carried onto
   * the lines that hold the tags each entry names */
  '905_a': 'b42',
  gr905_a: 'gr905',
  gr300_a: 'b45',
  gr318_a: 'b45',
  gr322_a: 'b45',
  gr323_a: 'b45',
  plmb_ksink_a: 'b31',
  /* the second PTAC unit: both of these lines carry the same count conflict */
  mech_tstat: 'ptac_count',
  mech_grille_rm: 'ptac_count',
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
  '238:hd12_a': 'a532_accessory',
};

/* Gated rows (recorded in the room note, no checklist line) - owner by tag. */
export const GATED_OWNER = {
  'GR-905': 'gr905',
  'PT-04': 'paint',
  'PT-02': 'paint',
  'ST-02': 'st02',
  'W7 / S8': 'w7s8',
  W4: 'wall_rating',
  W5: 'wall_rating',
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

/* Where the four types stood after ROUND 1, and what the fix round did about it.
 * Every "CLOSED" line below was checked against the current
 * platform/data/ref-rooms-staged.json before it was written here. */
export const ROUND1 = [
  { room: "202", finding: "The crew's own gr905_a line, carrying an open MISSING issue, had no line in the staged doc, so 27 of the crew's 28 issues carried and one was lost.", state: "CLOSED", how: "The gated row is rebuilt as a real line, 202/gr905_a, FLAGGED, sort 22000, carrying its own row text and saying on its face why it exists. The carry is exact again: 28 crew issues in, 28 on live lines, none with no line." },
  { room: "202", finding: "Conflicts-table entry B4.2 (OPEN) touched the room and appeared in neither document.", state: "CLOSED", how: "B4.2 now rides the 905 line and the GR-905 line, both FLAGGED, and is quoted verbatim in the new room note n_conflicts on both documents." },
  { room: "202", finding: "Conflicts-table entry B4.5 (OPEN) touched the room and appeared in neither document.", state: "CLOSED", how: "B4.5 now rides gr318_a and gr323_a, both FLAGGED, and is quoted verbatim in n_conflicts." },
  { room: "202", finding: "Gated-out rows whose own note states a document conflict were dropped whenever the row read HIGH, losing three conflicts (ITM-0073 W5, ITM-0074 W4, ITM-0108 SS-01).", state: "CLOSED", how: "The gate note n_gategaps now carries a gated row at ANY reliability when its own note states a conflict. All three are present, and the note count went from 4 rows to 7." },
  { room: "202", finding: "gr315_a lost its only disambiguating sentence, 'ONE run - A553 tags it twice, both ends of the same run'.", state: "CLOSED", how: "The sentence is back on the line, and the line now states that room 104 has no counterpart so nothing was borrowed." },
  { room: "202", finding: "db_itm0319 shipped under category 'Fire Alarm', a band the crew app does not know.", state: "DISCLOSED, NOT MOVED", how: "The band is unchanged, because the reference database files the row that way and moving it would be the tool overruling the database. The line now carries a CATEGORY NOTE saying the app knows five MEP bands and this line will sort after all of them. Widening the band list is Austin's call." },
  { room: "217", finding: "905_a shipped qty 2 at HIGH with an empty note, although the row that creates the second telephone reads MEDIUM.", state: "CLOSED", how: "The line ships FLAGGED and states the fold in full: two rows, ITM-0347 'tag 2 of 2 - A554 tags 905 twice' at MEDIUM, and ITM-0082. See round 2, which found the reliability sentence still names the wrong rows." },
  { room: "217", finding: "hd08_a carried room 104's caveat, 'elevation-sourced - not a takeoff', which says the opposite of what room 217's own row says.", state: "CLOSED", how: "The line now carries room 217's own words, 'counts as stated by A533's own summary block', plus the four rows behind the count." },
  { room: "217", finding: "mech_tstat shipped qty 1 at HIGH while mech_ptac on the same page shipped qty 2 and quoted 'thermostat x2'.", state: "CLOSED", how: "The thermostat line ships FLAGGED with a COUNT CONFLICT CARRIED, NOT RESOLVED block: two PTAC units, the sub-assembly transcribed once, count what is installed before signing off." },
  { room: "217", finding: "mech_ptac claimed three of the room's own rows corroborate 'A554 KN1' when none of them cites it.", state: "CLOSED", how: "The claim is reversed: the line now says no row of this room's own cites that number. See round 2, which found the reversed sentence is itself false for room 202." },
  { room: "217", finding: "Conflicts-table entry B4.5 (OPEN) named two tags the room ships and appeared nowhere.", state: "CLOSED", how: "B4.5 rides gr318_a and gr323_a and is quoted in n_conflicts." },
  { room: "230", finding: "fp_heads_a carried room 105's sprinkler provenance, 'FP-1, verified head-by-head on rooms 107 and 108', for a room that has no sprinkler row at all.", state: "CLOSED", how: "The citation is replaced by PH-GU-001's own sheet list, FP-1 / FP-2 / FP-3, and the line states that room 230 has no Fire Sprinkler row of its own so none of room 105's text is carried." },
  { room: "230", finding: "The same line cited FP-1 and quoted '144 total heads 1st floor' for a floor-2 room.", state: "CLOSED", how: "The citation now says, in the src itself, ROOM 230 IS ON FLOOR 2 - read the sheet that covers floor 2, and records that the donor cited a first-floor sheet with a first-floor total which is NOT carried. Which FP sheet covers floor 2 is not stated in the database and is not guessed." },
  { room: "230", finding: "Five electrical and low-voltage lines cited A555 electrical view 04.1, the QQ CONNECTING plan, on a non-connecting room.", state: "CLOSED", how: "View 04.1 is off all five src strings. Each line carries a CITATION note quoting room_types on what the '.1' variant is and stating that rooms.connecting is 0 for this room." },
  { room: "230", finding: "Conflicts-table entry B4.5 (OPEN) named four tags the room ships and appeared nowhere.", state: "CLOSED", how: "B4.5 rides gr300_a, gr308_a, gr318_a and gr322_a and is quoted in n_conflicts." },
  { room: "238", finding: "gr403_a resolved an open conflict by omission: FLAGGED with 'DO NOT BUY BOTH' in the database, shipped HIGH with an empty note.", state: "CLOSED", how: "The line ships FLAGGED carrying the F-5 note verbatim, and states that room 105 carrying the tag at HIGH is a fact about room 105 and not evidence about this room." },
  { room: "238", finding: "hd12_a was downgraded from FLAGGED to HIGH and its own note erased.", state: "CLOSED", how: "It ships FLAGGED with 'ASSUMPTION - see HD-02 note' and the same donor-does-not-close-a-flag sentence." },
  { room: "238", finding: "hd08_a was downgraded to MEDIUM and carried room 105's reason instead of its own.", state: "CLOSED", how: "It ships FLAGGED with room 238's own words, and prints room 105's different text as the donor's, explicitly labelled as room 105's reading of room 105's drawing." },
  { room: "238", finding: "Five MEP bathing lines said 'Room 238 carries BOTH configurations, both are built', three sentences after quoting that the two are mutually exclusive.", state: "CLOSED", how: "The wording is now 'BOTH ARE EMITTED ONTO THIS CHECKLIST AND NEITHER IS SUPERSEDED; they are MUTUALLY EXCLUSIVE and only one of them gets built. Build only what the answer turns out to be, and see the room note.'" },
];

/* An open conflict that is carried in a room note rather than on a line,
 * because the tag it names has no line of its own in this package. */
export const EXTRA_CARRIED = {
  '217': ['split438'],
  '238': ['split438'],
};

/* ROUND 2, verbatim. `sev` is the severity the verifier itself wrote at the
 * head of its finding; where it wrote none, none is invented here. A defect
 * marked closed was closed by rebuilding this document and nothing else, and
 * it is still printed word for word. */
export const VERIFIER = {
  '202': {
    verdict: "FAIL",
    round: 2,
    defects: [
      {
        sev: null,
        state: "CLOSED BY THIS REBUILD",
        closedBy: "Closed by this rebuild. research/ref-rooms/mockbook.html has been re-rendered from the current platform/data/ref-rooms-staged.json, and research/ref-rooms/mockbook.data.mjs has been rewritten so the round-1 findings it hand-carried no longer print as live defects. The finding is left here word for word so the record shows it was raised and what answered it.",
        owner: null,
        text: "research/ref-rooms/mockbook.html is STALE - it was never rebuilt after the fix round, so the artifact Austin approves from contradicts the fixed data for room 202. Re-running `node research/ref-rooms/build_mockbook.mjs` produces a materially different file (as-shipped 524,123 bytes / md5 de0b993720455f3f33d246d2d61c8323 -> rebuilt ~694.6 KB / md5 77bbfa24ffb4a30b98e250e2b07eeb09). The shipped mockbook contains ZERO occurrences of 'OPEN DOCUMENT CONFLICT' although the fixed 202 / 202-MEP data now carries one on 5 lines (905_a, gr318_a, gr323_a, gr905_a, plmb_ksink_a); it has none of the three notes the fix added (n_conflicts, n_ptac2, n_rulings - 0 hits for 'OPEN DOCUMENT CONFLICTS THAT TOUCH THIS ROOM', 'TWO PTAC UNITS', \"AUSTIN'S QUANTITY RULINGS\"); and it still prints the superseded round-1 verifier finding 'The staged doc 202 has no such line, so 27 of the crew's 28 open issues are carried and one is lost', which the rebuilt gr905_a line already fixed.",
      },
      {
        sev: null,
        state: "OPEN",
        owner: "b31",
        text: "platform/data/ref-rooms-staged.json, doc 202-MEP, key plmb_shower_a: OPEN conflicts-table entry B3.1 is NOT carried on a line whose tag it names. B3.1 (status OPEN, conflicts.md B3.1) reads verbatim 'P401/P402 mark SH-1 / L-2 / SK-3 / SK-4; the P104 schedule lists guestroom showers SH-3/SH-4...'. Room 202's own row ITM-0310 carries tag 'SH-1 / SH-4' with its own sqlite note 'DUAL MARK CARRY - P401/P402 print SH-1, P104 schedules SH-4'. The line ships reliability HIGH with no conflict text, while plmb_ksink_a (SK-3 / SK-4) is FLAGGED and carries the same entry. plmb_shower_a's own src string already ends 'conflicts.md B3.1'. Cause: openConflictsFor()/conflictsOnTag() in platform/tools/build_ref_rooms.mjs match only the whole composite tag string, so 'SH-1 / SH-4' misses even though B3.1 names SH-1 literally and SH-4 via the tool's own CONFLICT_TAG_FAMILY expansion of 'SH-3/SH-4'. Consequences: meta.conflictPolicy's assertion that 'every OPEN entry naming ... one of its tags rides on the line that carries the tag, FLAGGED' is false for room 202, and note n_conflicts (in BOTH doc 202 and doc 202-MEP) understates B3.1 as 'names tag(s) SK-3 / SK-4'. Same miss on doc 202-MEP key plmb_lavfaucet_a, whose src quotes 'P104 REMARKS column on rows L-3 and L-4' - the L-2 / L-3 / L-4 marks B3.1 disputes - at reliability HIGH with no carry.",
      },
      {
        sev: null,
        state: "OPEN",
        owner: "n_gaps_scope",
        text: "platform/data/ref-rooms-staged.json, docs 202 AND 202-MEP, note n_gaps: two placeholders that are not about this room or this type ride under the header 'DOCUMENT GAPS THE DATABASE RAISES AGAINST THIS ROOM TYPE'. (a) PH-GU-016 is explicitly scoped 'Plumbing unit plan for room 118 (King Studio Acc. MOD Connector)' and its text is entirely about room 118. (b) PH-GU-027 is 'P-trap and supply-line protection at ACCESSIBLE lavatories'; room 202 is rooms.accessible = 0, and the placeholder's own why says 'fails a TAS walk on 7 keys' - the seven accessible keys, which do not include 202/302/402. Both are selected only because the key test in platform/tools/build_ref_rooms.mjs, new RegExp('(^|[^0-9])' + k + '([^0-9]|$)'), matches the SHEET designations 'P402' (PH-GU-016) and 'G402'/'P402' (PH-GU-027) as room key 402. The conflicts matcher in the same file uses the correct boundary class '[^0-9A-Za-z-]' and correctly rejects P402/G402; the placeholder matcher does not. (PH-GU-003 is also selected only via this same false positive, though it happens to be genuinely relevant to this room's SK-3/SK-4 line.)",
      },
      {
        sev: null,
        state: "OPEN",
        owner: "generator_fix",
        text: "platform/data/ref-rooms-staged.json, doc 202-MEP, key mech_ptac, instanceNote: a false statement about this room. The note reads 'NO row of this room's own cites that number: its own A55-series row(s) (ITM-0320, ITM-0321, ITM-0061) cite different numbers, so nothing in this room corroborates it.' The surviving citation segment is 'A553 KN1', and room 202's own row ITM-0010 ('PTAC branch circuit, 208 V, 2080 VA', Electrical, HIGH) has source_sheet 'E400; E103; A55x kn1', which the tool's own resolveSheetWildcard renders as exactly 'A553 kn1'. The corroboration test in composeMepCitation only walks the rows in the support set for this one condensed line, then prints a room-wide negative that the database contradicts.",
      },
    ],
  },
  '217': {
    verdict: "FAIL",
    round: 2,
    defects: [
      {
        sev: "HIGH",
        state: "CLOSED BY THIS REBUILD",
        closedBy: "Closed by this rebuild. research/ref-rooms/mockbook.html has been re-rendered from the current platform/data/ref-rooms-staged.json, and research/ref-rooms/mockbook.data.mjs has been rewritten so the round-1 findings it hand-carried no longer print as live defects. The finding is left here word for word so the record shows it was raised and what answered it.",
        owner: null,
        text: "COLLATERAL / HIGH - research/ref-rooms/mockbook.html is a PRE-FIX render and still shows room 217's round-1 defects. The mockbook was built 2026-08-24 16:54; platform/data/ref-rooms-staged.json was rewritten by the fix round at 17:32 and the renderer was never re-run. In the HTML that Austin approves from, 217-MEP/fp_heads_a `src` still reads \"FP-1 head schedule, both rows (... 144 total heads 1st floor); FP-1 design notes block; ...; FP-1, verified head-by-head on rooms 107 and 108\" - a FIRST-FLOOR sheet with a first-floor head total on a floor-2 room, which is exactly the round-1 finding; 217-MEP/mech_tstat still renders qty 1 at reliability HIGH with no count-conflict note (the JSON now ships it FLAGGED with 'COUNT CONFLICT CARRIED, NOT RESOLVED'); and the three notes the fix round added to BOTH 217 docs appear nowhere in the file - grep counts 0 for 'OPEN DOCUMENT CONFLICTS THAT TOUCH THIS ROOM' (n_conflicts), 'TWO PTAC UNITS, ONE TRANSCRIBED SUB-ASSEMBLY' (n_ptac2) and \"AUSTIN'S QUANTITY RULINGS, EVALUATED FOR THIS ROOM\" (n_rulings). Compounding it, research/ref-rooms/mockbook.data.mjs (16:50) still hand-carries the round-1 verifier entry '217 | mech_tstat Thermostat, qty 1 | The PTAC line on the same page ships qty 2 and quotes \"thermostat x2\". The thermostat line still says 1.' as a live DEFECT, so a plain re-render would print a defect that no longer exists. Fix: update mockbook.data.mjs's VERIFIER block, then re-run research/ref-rooms/build_mockbook.mjs.",
      },
      {
        sev: "HIGH",
        state: "OPEN",
        owner: "b31",
        text: "HIGH - platform/data/ref-rooms-staged.json, docs 217 and 217-MEP: OPEN conflicts-table entry B3.1 is not carried on the two room-217 lines whose tags it names. conflicts.B3.1 (status OPEN, topic 'Plumbing - fixture-mark mismatch') names marks SH-1, L-2, SK-3, SK-4, SH-3, SH-4, L-3, L-4 and says 'Verify governing marks before ordering guestroom trim.' Room 217 holds sqlite tag 'SH-1 / SH-3' (ITM-0724, emitted as 217-MEP/db_itm0724) and the emitted line 217-MEP/plmb_shower_a carries code 'SH-1 / SH-4'. Neither line carries the 'OPEN DOCUMENT CONFLICT B3.1' block (only 217-MEP/plmb_ksink_a does), and note n_conflicts on BOTH 217 and 217-MEP states 'B3.1 ... names tag(s) SK-3 / SK-4' - understating which of this room's lines the open conflict touches. This violates the build's own stated conflictPolicy ('every OPEN entry naming ... one of its tags rides on the line that carries the tag, FLAGGED'). Cause: platform/tools/build_ref_rooms.mjs openConflictsFor() (~line 2012-2024) tests the room's tag string whole, and conflictHaystack()/CONFLICT_TAG_FAMILY (~line 1995-2010) expands only same-prefix slash runs such as 'GR-300/305/307/308/318/322/323/325', so the mixed-prefix run 'SH-1 / L-2 / SK-3 / SK-4' is never split and the room's own compound tag 'SH-1 / SH-3' never matches. Same gap present on 202-MEP, 230-MEP and 238-MEP plmb_shower_a.",
      },
      {
        sev: "MEDIUM",
        state: "OPEN",
        owner: "wc02",
        text: "MEDIUM - platform/data/ref-rooms-staged.json, docs 217 and 217-MEP, note n_gategaps: a document conflict on room 217's own gated-out row is silently lost. The note promises it lists rows that 'state a DOCUMENT CONFLICT in their own note at any reliability', but room 217's row ITM-0378 (Wall Covering, tag WC-02, HIGH, cited A533; finish_schedule p.61) is absent from n_gategaps and from every line in both docs (0 occurrences of 'ITM-0378', 'WC-02', 'WC-12' or 'Confirm which is intended'). Its sqlite note states a live disagreement about THIS room's own bathroom finish, verbatim: 'W-3 - A533 uses the STANDARD palette (WC-02 / T-01.1 / PT-02) for an accessible bath while A532 uses WC-12 / B-05 / PT-04. Confirm which is intended'. Cause: platform/tools/build_ref_rooms.mjs CONFLICT_IN_NOTE_RE (~line 1993) matches only /conflict|conflicts\\.md|contradic|mutually exclusive|do not buy|not stated|RFI/i; the register id 'W-3' plus 'Confirm which is intended' hits none of them. The comparable Paint row ITM-0374 rode only because its note happens to spell the word 'P-1 CONFLICT'. n_gategaps therefore reports '6 row(s)' where 7 qualify.",
      },
      {
        sev: "LOW-MEDIUM",
        state: "OPEN",
        owner: "reliability_fold",
        text: "LOW-MEDIUM - platform/data/ref-rooms-staged.json, doc 217, key 905_a: the line asserts a reliability the database does not carry. instanceNote reads 'RELIABILITY. The reliability on this line starts from THIS room's own data/project.sqlite row(s) ITM-0347, ITM-0082, which read MEDIUM.' In data/project.sqlite, room 217's ITM-0082 (Appliance, tag 905, 'Telephone') reads HIGH; only ITM-0347 reads MEDIUM. The sentence also argues 'LIVE room 104 carries the same tag at HIGH, which is a fact about room 104 and not evidence about this room', which is misleading given room 217 carries its own HIGH row for the same tag. Cause: platform/tools/build_ref_rooms.mjs lines 2383-2384 print the folded worst-case reliability against the full row-id list, so any folded group with mixed reliabilities misreports its members. On a build whose premise is quoting the database verbatim and never guessing, a live line must not state a row reads MEDIUM when the database reads it HIGH.",
      },
    ],
  },
  '230': {
    verdict: "FAIL",
    round: 2,
    defects: [
      {
        sev: "HIGH",
        state: "CLOSED BY THIS REBUILD",
        closedBy: "Closed by this rebuild. research/ref-rooms/mockbook.html has been re-rendered from the current platform/data/ref-rooms-staged.json, and research/ref-rooms/mockbook.data.mjs has been rewritten so the round-1 findings it hand-carried no longer print as live defects. The finding is left here word for word so the record shows it was raised and what answered it.",
        owner: null,
        text: "[HIGH] research/ref-rooms/mockbook.html is STALE - the delivered mock-up does not render the fixed data. On-disk/committed mockbook.html is 524,123 bytes (md5 de0b993720455f3f33d246d2d61c8323) and was rendered from the PRE-fix ref-rooms-staged.json (346,812 bytes in commit e06dfd0). Re-running `node research/ref-rooms/build_mockbook.mjs` against the current staged file yields 711,280 bytes (md5 77bbfa24ffb4a30b98e250e2b07eeb09); two consecutive runs are byte-identical, so this is staleness, not nondeterminism. Concretely the delivered book still shows room 230 / 230-MEP / fp_heads_a citing \"FP-1 head schedule ... 144 total heads 1st floor\" (the exact defect the fix round claims to have closed) and contains 0 occurrences of \"OPEN DOCUMENT CONFLICTS THAT TOUCH THIS ROOM\" against 8 in the fresh render. Everything the fix round did to room 230 is invisible in the artifact Austin is being asked to approve. (I restored mockbook.html to its found state after testing; the working tree is unchanged.)",
      },
      {
        sev: "HIGH",
        state: "OPEN",
        owner: "b31",
        text: "[HIGH] platform/data/ref-rooms-staged.json doc 230-MEP key plmb_shower_a - OPEN conflict B3.1 names this line's own mark and is not carried; the line ships reliability HIGH with no conflict text. sqlite conflicts B3.1 (status OPEN) positions, verbatim: \"P401/P402 mark SH-1 / L-2 / SK-3 / SK-4; the P104 schedule lists guestroom showers SH-3/SH-4, lavs L-3/L-4, and only SK-1/SK-2 (laundry). BOTH SETS CARRIED. Verify governing marks before ordering guestroom trim.\" Room 230's own row ITM-0545 is tagged \"SH-1 / SH-4\" and its own note reads \"DUAL MARK CARRY - P401/P402 print SH-1, P104 schedules SH-4; P104's own SH-1 is the 36x36 employee shower.\" The sibling line plmb_ksink_a (tag \"SK-3 / SK-4\") IS flagged FLAGGED and carries B3.1 verbatim - so the same open entry flags one of this room's two dual-mark lines and not the other. Root cause in platform/tools/build_ref_rooms.mjs openConflictsFor(): CONFLICT_TAG_FAMILY expands slash-runs in the CONFLICT ENTRY's text but the room's own tag is matched as one whole literal string, so \"SK-3 / SK-4\" matches only because that exact substring happens to appear in B3.1's positions text, while \"SH-1 / SH-4\" does not. Which line gets flagged is decided by string coincidence, not by evidence.",
      },
      {
        sev: "HIGH",
        state: "OPEN",
        owner: "b31",
        text: "[HIGH] platform/data/ref-rooms-staged.json doc 230 note n_conflicts (and the build report) under-report B3.1, and its lavatory half lands nowhere at all. n_conflicts states B3.1 \"names tag(s) SK-3 / SK-4\". B3.1 also names SH-1, SH-4, L-2, L-3 and L-4, every one of which room 230 carries: ITM-0545 tag \"SH-1 / SH-4\" and ITM-0043 tag \"L-2 / L-3 / L-4\" (own note: \"DUAL MARK CARRY - P401/P402 print L-2, P104 schedules L-3/L-4; P104's own L-2 is the employee/pool wall-hung lav\"). ITM-0043 is folded by MEP_CONDENSED_SOURCES onto 230-MEP/plmb_lavfaucet_a, whose `code` is \"—\" (em dash), so conflictsOnTag() can never match it. Result: the lavatory-mark dispute appears nowhere in doc 230, doc 230-MEP, or n_conflicts. The build report repeats the under-count: \"4 open entr(y/ies) touch this room: B3.1 [tags SK-3 / SK-4] ...\". This violates the artifact's own meta.conflictPolicy (\"every OPEN entry naming one of these rooms' keys or one of its tags rides on the line that carries the tag, FLAGGED\").",
      },
      {
        sev: "HIGH",
        state: "OPEN",
        owner: "grille_material",
        text: "[HIGH] platform/data/ref-rooms-staged.json doc 230-MEP key mech_grille_rm - a FLAGGED row shipped as a HIGH line with a completely EMPTY note. The line's only source row is room 230's own ITM-0053, reliability FLAGGED, note verbatim: \"material unsettled - polypropylene vs aluminum, three instructions, no source settles it\" (source_sheet \"M201 vs M501 det.9 vs M401 KN1/KN5\"). The staged line reads reliability \"HIGH\", instanceNote \"\" and label \"Room wall grille at the PTAC set, painted to match\" - an assertion about finish on a part whose material three documents disagree about. The room's own reliability does not govern and the conflict is lost.",
      },
      {
        sev: "HIGH",
        state: "OPEN",
        owner: "bath_exhaust",
        text: "[HIGH] platform/data/ref-rooms-staged.json doc 230-MEP key mech_grille_bath - two FLAGGED rows and three MEDIUM rows folded into a HIGH line, none of their notes carried. Room 230's own rows: ITM-0070 FLAGGED, note verbatim \"M305 shows a plain ceiling grille + Aldes regulator on a central riser and NO in-room fan - fan vs grille designation unresolved, coordination_issues C-06. Do not order 115\"; ITM-0065 FLAGGED, note verbatim \"M305's own numbers give 49 inlets against ~119 needed (2,450 CFM / 50). Count unsupported by its only source - the single most expensive unverified line in the package\"; ITM-0064, ITM-0066, ITM-0069 all MEDIUM. The staged line ships reliability HIGH with the note \"Covers the EF-1 exhaust fan running, the volume damper, the ceiling fire damper, the constant-airflow regulator, and the ceiling access panel that reaches them\" - asserting the existence of exactly the fan and the regulator count the documents dispute.",
      },
    ],
  },
  '238': {
    verdict: "FAIL",
    round: 2,
    defects: [
      {
        sev: null,
        state: "OPEN",
        owner: "st02_a556",
        text: "platform/data/ref-rooms-staged.json | doc 238-MEP | key mech_grille_rm | field src -- ships \"A556 (ST-01 tagged, no PT code)\". FALSE FOR THIS ROOM. Room 238's own row ITM-0694 reads tag ST-02, primary_sheet A556 el.07, reliability FLAGGED, note verbatim: \"S-1, purchase-order-grade gap. ST-02 has NO card in the finish schedule. A550/A551/A552/A553.2/A555 tag ST-01 at the identical condition. Not normalised\" - A556 is deliberately excluded from that ST-01 list. The claim is donor room 105's reading of its OWN drawing (ITM-0440, ST-01 on A555 el.08). The generator dropped the donor's view number but re-pointed the donor's factual assertion onto A556 and shipped it at HIGH. It also contradicts this same document's note n_gategaps, which carries ST-02/ITM-0694 verbatim.",
      },
      {
        sev: null,
        state: "OPEN",
        owner: "ptac_detail",
        text: "platform/data/ref-rooms-staged.json | doc 238-MEP | key mech_ptac | field src -- cites \"M401 det.01\". Room 238's OWN PTAC row ITM-0695 cites \"M401 detail 02; M201 schedule; A556 KN1 / view 07\". Detail 01 is donor room 105's number (ITM-0443, \"M401 detail 01\"). sheets.M401 = \"Mechanical Typical Guestroom - 7 room types, PTAC layout\", i.e. the detail number IS the room type, so this sends the QQ Acc. crew to the plain Queen-Queen detail. Room 230 legitimately carries det.01; 238 was not re-judged.",
      },
      {
        sev: null,
        state: "OPEN",
        owner: "m_series_floor",
        text: "platform/data/ref-rooms-staged.json | doc 238-MEP | keys mech_ptac and mech_tstat | field src -- cite \"M301 line 30\" and \"M301 GN5\". sheets.M301 = \"Mechanical First Floor Plan\"; room 238 is on FLOOR 2 (rooms.floor = 2), whose plan is M302. Neither of this room's own rows for these items (ITM-0695, ITM-0060, ITM-0018) cites M301 line 30 or M301 GN5 - both segments are donor room 105 floor-1 text. This is the identical defect class the fix round repaired for the sprinkler line (fp_heads_a now says \"ROOM 238 IS ON FLOOR 2 - read the sheet that covers floor 2\"); the guard in build_ref_rooms.mjs is FP-series only and nothing covers the M-series.",
      },
      {
        sev: null,
        state: "OPEN",
        owner: "b31",
        text: "platform/data/ref-rooms-staged.json | doc 238-MEP | key db_itm0715 (and plmb_shower_a) -- OPEN conflicts-table entry B3.1 names this line's tag and does not ride on it. B3.1 positions, verbatim: \"P401/P402 mark SH-1 / L-2 / SK-3 / SK-4; the P104 schedule lists guestroom showers SH-3/SH-4, lavs L-3/L-4...\". db_itm0715 carries this room's own tag \"SH-1 / SH-3\" (ITM-0715) - the exact P401/P402-vs-P104 mark disagreement B3.1 describes - and carries no B3.1 quote. Room 238 also carries tag \"L-2 / L-3 / L-4\" (ITM-0043, note \"DUAL MARK CARRY - P401/P402 print L-2, P104 schedules L-3/L-4\"), which likewise gets no carriage on any line or note. Cause: openConflictsFor() in platform/tools/build_ref_rooms.mjs tests the whole raw tag string literally against the entry text, so composite marks can never match; only \"SK-3 / SK-4\" appears verbatim in B3.1 and only plmb_ksink_a got flagged.",
      },
      {
        sev: null,
        state: "OPEN",
        owner: "b31",
        text: "platform/data/ref-rooms-staged.json | docs 238 and 238-MEP | note n_conflicts -- states \"B3.1 [conflicts.md B3.1] names tag(s) SK-3 / SK-4\". That is a false narrowing of the entry it then quotes verbatim in the same sentence: B3.1 names SH-1, SH-3, SH-4, L-2, L-3 and L-4 as well, and room 238 carries all of them (ITM-0715 \"SH-1 / SH-3\", ITM-0043 \"L-2 / L-3 / L-4\"). The note tells the reader the entry is narrower than its own quoted text shows.",
      },
    ],
  },
};

/* The short list a PM needs: the round-2 findings that change what gets bought
 * or where the crew is sent. Each one names who owes the answer. */
export const BUY_STOPPERS = [
  { room: "238-MEP", line: "mech_ptac  PTAC, source sheet", owner: "ptac_detail", what: "The citation reads M401 det.01. Room 238's own row cites M401 detail 02. On M401 the detail number IS the room type, seven of them on one sheet.", effect: "The QQ Acc. crew is sent to the plain Queen-Queen PTAC layout." },
  { room: "238-MEP", line: "mech_ptac and mech_tstat, source sheet", owner: "m_series_floor", what: "Both cite M301 line 30 and M301 GN5. M301 is the Mechanical First Floor Plan and room 238 is on floor 2, whose plan is M302. Neither of this room's own rows cites those segments.", effect: "The crew is sent to the wrong mechanical sheet. The sprinkler line was re-pointed for floor 2 and the M-series was not." },
  { room: "238-MEP", line: "mech_grille_rm  source sheet", owner: "st02_a556", what: "Ships \"A556 (ST-01 tagged, no PT code)\" at HIGH. Room 238's own row reads ST-02 on A556 and deliberately leaves A556 off the list of sheets that tag ST-01.", effect: "The line states as fact the opposite of what the room's own row says, and contradicts this same document's gate note." },
  { room: "230-MEP", line: "mech_grille_rm  Room wall grille", owner: "grille_material", what: "The only row behind it is FLAGGED, \"material unsettled - polypropylene vs aluminum, three instructions, no source settles it\". The line ships HIGH with an empty note and a label that says painted to match.", effect: "A finish instruction on a part whose material three documents dispute. The room's own reliability did not govern." },
  { room: "230-MEP", line: "mech_grille_bath  Bath exhaust", owner: "bath_exhaust", what: "Two FLAGGED rows and three MEDIUM rows fold into one HIGH line. The FLAGGED rows say \"NO in-room fan ... Do not order 115\" and \"49 inlets against ~119 needed ... count unsupported by its only source\".", effect: "The line asserts the existence of exactly the fan and the regulator count the documents dispute. The database calls it the single most expensive unverified line in the package." },
  { room: "all four", line: "plmb_shower_a and the lavatory line", owner: "b31", what: "OPEN entry B3.1 names SH-1, SH-3, SH-4, L-2, L-3 and L-4. The shower line carries the mark and ships HIGH with no conflict text; the lavatory fold carries no tag at all so nothing can match it. Only the kitchenette sink line got flagged.", effect: "B3.1's own instruction is \"verify governing marks before ordering guestroom trim\", and on these lines it is not on the page." },
  { room: "217", line: "ITM-0378  WC-02 bathroom wall covering", owner: "wc02", what: "The room's own row says A533 uses WC-02 / T-01.1 / PT-02 for this accessible bath while A532 uses WC-12 / B-05 / PT-04, and asks which is intended. It is in no line and in no note.", effect: "A live disagreement about this room's own bathroom finish is invisible. The gate note says it lists rows like this one and reports 6 where 7 qualify." },
  { room: "217", line: "905_a  Telephone, reliability sentence", owner: "reliability_fold", what: "The line says rows ITM-0347 and ITM-0082 \"read MEDIUM\". ITM-0082 reads HIGH in the database.", effect: "On a package that promises the database verbatim, a line states something about the database that is not true." },
  { room: "202", line: "note n_gaps  two placeholders", owner: "n_gaps_scope", what: "PH-GU-016 is about room 118's plumbing plan and PH-GU-027 is about accessible lavatories. Room 202 is not accessible. Both are matched only because the sheet names P402 and G402 look like room key 402.", effect: "Two gaps that belong to other rooms print under a header saying they are gaps against this room type." },
];
