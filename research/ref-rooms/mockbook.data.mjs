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
    also: 'Stated only on G402. Zero hits across A532, A532.1, A533, A551, A552, A554, A556, ID-5.12, ID-5.13, P104, P401 and P402. Cheap item, fails a TAS walk on seven keys. It is a real gap on those seven accessible keys, and it no longer appears under rooms that are not accessible: the round-2 check found it matched only because the sheet names G402 and P402 were read as room key 402, and the boundary class is fixed.',
  },
  p118: {
    who: 'PLUMBING ENGINEER',
    line: 'The plumbing engineer. The key it hits is 118, not this one.',
    also: 'P401/P402 offer no Acc. Mod. plan and E400 has the same hole. The round-2 check found this placeholder in room 202\'s gap set only because the sheet name P402 was read as room key 402. It is a real gap on room 118, it does not belong under that header, and it is no longer there.',
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
      'conflicts.md B3.1 is OPEN: P401 and P402 mark SH-1 / L-2 / SK-3 / SK-4 while the P104 schedule lists guestroom showers SH-3 and SH-4, lavs L-3 and L-4, and only SK-1 and SK-2 for the laundry. Both sets are carried. The round-2 check found the entry riding on the kitchenette sink line and NOT on the shower or lavatory lines whose marks it also names. The round-3 fix splits every mark list on both sides and matches marks one at a time, so B3.1 now rides FLAGGED on the shower line, the lavatory line and the accessible roll-in row in every room that carries those marks. The QUESTION is unchanged and unresolved.',
  },
  wc02: {
    who: 'ARCHITECT / RK DESIGN',
    line: 'The architect or RK Design. Two sheets give this accessible bathroom two different finish palettes.',
    also:
      'Room 217 row ITM-0378 says it in its own words: A533 uses the standard palette WC-02 / T-01.1 / PT-02 for an accessible bath while A532 uses WC-12 / B-05 / PT-04. Confirm which is intended. The round-2 check found it in no line and in no note, because the row does not happen to use the word conflict; the round-3 fix widened the test to the database\'s own vocabulary and to two sheets set against each other in one sentence, and the row now rides in n_gategaps on both 217 documents.',
  },
  grille_material: {
    who: 'MEP ENGINEER',
    line: 'The mechanical engineer. Three documents give the room grille three different instructions and none of them settles the material.',
    also:
      'Room 230 row ITM-0053 reads, verbatim, "material unsettled - polypropylene vs aluminum, three instructions, no source settles it", cited M201 vs M501 det.9 vs M401 KN1/KN5. The line used to ship HIGH with an empty note and a label saying painted to match; it now ships FLAGGED with that row quoted on it. The material is still not decided by any document.',
  },
  bath_exhaust: {
    who: 'MEP ENGINEER (RFI)',
    line: 'The mechanical engineer, by RFI, before any regulator or fan is ordered.',
    also:
      'Room 230 rows ITM-0070 and ITM-0065 are both FLAGGED. ITM-0070: M305 shows a plain ceiling grille plus an Aldes regulator on a central riser and NO in-room fan, fan versus grille designation unresolved, coordination_issues C-06, do not order 115. ITM-0065: M305\'s own numbers give 49 inlets against about 119 needed, count unsupported by its only source. Both now ride on the mech_grille_bath line, which ships FLAGGED; the reference database calls ITM-0065 the single most expensive unverified line in the package.',
  },
  m_series_floor: {
    who: 'TRIUN (SHEET CHECK)',
    line: 'No RFI needed. Somebody reads the floor-2 mechanical plan and re-points the citation.',
    also:
      'M301 is the Mechanical First Floor Plan. Rooms 202, 217, 230 and 238 are all on floor 2, whose plan is M302. The round-2 check found the sprinkler line re-pointed and the M-series not. The round-3 fix reads the floor of every cited sheet out of the sheets table and trims, re-points or drops it. What is left is a sheet check, not an RFI: M302 is now cited with NO number on it and somebody has to read it and confirm the number.',
  },
  ptac_detail: {
    who: 'TRIUN (SHEET CHECK)',
    line: 'No RFI needed. The detail number on M401 has to match the room type before the line goes out.',
    also:
      'M401 is the Mechanical Typical Guestroom sheet and it carries seven room types, so on that sheet the detail number IS the room type. Room 238\'s own row cites M401 detail 02 and the line now cites detail 02. Room 230 keeps detail 01 on its own row\'s evidence, and rooms 202 and 217 now carry detail 06 and detail 07 from their own rows, where the donor citation named no detail at all.',
  },
  st02_a556: {
    who: 'ARCHITECT / INTERIOR DESIGNER',
    line: 'Same owner as ST-02 itself. The point here is that the staged citation states something room 238\'s own row denies.',
    also:
      'Room 238 row ITM-0694 reads ST-02 on A556 el.07 and says A550, A551, A552, A553.2 and A555 tag ST-01 at the identical condition, deliberately leaving A556 off that list. The staged line used to cite A556 as ST-01 tagged, which is the donor room\'s reading of the donor room\'s drawing; it now cites ST-02 and carries ITM-0694 verbatim. The ST-02 gap itself is unchanged and purchase-order grade.',
  },
  generator_fix: {
    who: 'GENERATOR FIX (TRIUN)',
    line: 'Nobody outside owes an answer. The generator states something about this room that the reference database contradicts, and the generator gets corrected.',
    also:
      'The corroboration test used to walk only the rows in the support set for one condensed line and then print a room-wide negative; room 202 has a row, ITM-0010, that does cite the segment in question. It now walks every row of the room and reports number by number, naming the rows that corroborate and the numbers nothing in the room corroborates.',
  },
  n_gaps_scope: {
    who: 'GENERATOR FIX (TRIUN)',
    line: 'Nobody outside owes an answer. This is a bug in the placeholder matcher and it gets fixed in the generator.',
    also:
      'The matcher used to accept the sheet designations P402 and G402 as room key 402, so a gap about room 118\'s plumbing plan and a gap about accessible lavatory p-trap wrap rode under a header saying they are gaps against this room type. It now uses the conflicts matcher\'s boundary class and also selects on a mark the room carries, and every entry prints which test caught it.',
  },
  reliability_fold: {
    who: 'GENERATOR FIX (TRIUN)',
    line: 'Nobody outside owes an answer. The line prints the folded worst-case reliability against the full row list, so a mixed group misreports its members.',
    also:
      'On a package whose whole premise is quoting the database verbatim, a live line must not say a row reads MEDIUM when the database reads it HIGH. A folded line now names every row at its own reading and quotes the row that pulls the fold down.',
  },
  donor_launder: {
    who: 'GENERATOR FIX (TRIUN) - DONE',
    line: 'Nobody outside owed this one. The MEP condensation was shipping condensed lines above the reliability of the room\'s own rows behind them and dropping those rows\' words.',
    also:
      'The rule now runs on both documents: a condensed line ships at the WORST reliability among THIS room\'s own rows, and every row that is not HIGH, or whose own note states a document conflict, is quoted on the line verbatim. The document questions those rows raise - the grille material, the exhaust fan, the regulator count, the unnamed fixture types, the receptacle count, the two primer products, the optional data outlet, the doorbell scope and the thermostat height - are all still OPEN and are now on the page instead of behind it.',
  },
  n_type_conn: {
    who: 'GENERATOR FIX (TRIUN) - DONE',
    line: 'Nobody outside owed this one. The room note claimed a completeness the document did not have.',
    also:
      'Room 230 shares sheet A555 with its donor, so the SHEET name needs no re-point - but the ".1" view is the QQ CONNECTING plan and this room is not connecting, so it is dropped on five lines. The note now says that, and names the five.',
  },
  ruled_id: {
    who: 'GENERATOR FIX (TRIUN) - DONE',
    line: 'Nobody outside owed this one. The D27 hot/cold line carried an `id` field the live floor-1 line does not.',
    also:
      'The MEP builder now carries `id` exactly where the live donor line carries one, so the ruled line matches live. Its citation deliberately does NOT match live any more: P305 is the Domestic Water & Gas FIRST Floor Plan and these rooms are on floor 2, so P305 is dropped from the cited list and P202 is kept, and the line says so.',
  },
  a13: {
    who: 'FIELD MEASUREMENT (TRIUN)',
    line: 'Measure the key. G001\'s areas are prototype gross areas and the entry says so in its own words: "evidence, not proof".',
    also:
      'conflicts.md A13 is OPEN and prints a 55 sqft area difference between QQ and QQ Wide, with QQ Ext at 510 sqft. It names no tag and no room key, so it rides as room note n_typearea on room 230 and on no line. Nothing in this package asserts an area.',
  },
  b44: {
    who: 'ARCHITECT (RFI TO MWT)',
    line: 'Same RFI as A11: which unit matrix governs. The reference database calls B4.4 OPEN on all seven accessible keys.',
    also:
      'Nine of room 238\'s own rows say it verbatim: "conflicts.md A11 / B4.4 and coordination_issues.md C-01 are OPEN on all seven accessible keys (118, 217, 238, 317, 338, 417, 438)". B4.4\'s own text says do not order the 438 bath package off either matrix. It is now enumerated in n_conflicts on rooms 217 and 238 because those rooms\' own rows cite it by id.',
  },
  own_mark: {
    who: 'GENERATOR FIX (TRIUN) - DONE, THEN THE ARCHITECT',
    line: 'The generator was putting the donor room\'s MARK on an accessible key. That is fixed. What the mark points at is still the open bathing question.',
    also:
      'Room 238 has no neutral bathing row: everything it carries is Configuration A or Configuration B and every one of those rows is FLAGGED. The shower line now carries this room\'s own "SH-1 / SH-3" from ITM-0715 and the enclosure line carries "kn 10 / kn 11" from ITM-0716 and ITM-0717, with the donor\'s "SH-1 / SH-4" and "kn 28 / kn 5" quoted as not carried. This room type\'s bath is drawn on A532 / A532.1, not on the donor\'s bath sheet.',
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

/* ROUND 2, verbatim, and what the ROUND-3 FIX did about each one. This is
 * HISTORY, not the current verdict: it is the previous check's findings kept
 * word for word so the record shows what was raised and what answered it.
 * The CURRENT verdict is round 3, in VERIFIER below, and round 3 re-opened two
 * of these closures in its own words - see 238 plmb_shencl_a and plmb_shower_a,
 * where the round-3 check states that the fix changed the mark and left the
 * citation. Nothing here is edited to agree with that; both are printed. */
export const ROUND2 = [
  {
    room: "202",
    sev: null,
    state: "CLOSED BY THIS REBUILD",
    owner: null,
    text: "research/ref-rooms/mockbook.html is STALE - it was never rebuilt after the fix round, so the artifact Austin approves from contradicts the fixed data for room 202. Re-running `node research/ref-rooms/build_mockbook.mjs` produces a materially different file (as-shipped 524,123 bytes / md5 de0b993720455f3f33d246d2d61c8323 -> rebuilt ~694.6 KB / md5 77bbfa24ffb4a30b98e250e2b07eeb09). The shipped mockbook contains ZERO occurrences of 'OPEN DOCUMENT CONFLICT' although the fixed 202 / 202-MEP data now carries one on 5 lines (905_a, gr318_a, gr323_a, gr905_a, plmb_ksink_a); it has none of the three notes the fix added (n_conflicts, n_ptac2, n_rulings - 0 hits for 'OPEN DOCUMENT CONFLICTS THAT TOUCH THIS ROOM', 'TWO PTAC UNITS', \"AUSTIN'S QUANTITY RULINGS\"); and it still prints the superseded round-1 verifier finding 'The staged doc 202 has no such line, so 27 of the crew's 28 open issues are carried and one is lost', which the rebuilt gr905_a line already fixed.",
    how: "Closed by this rebuild. research/ref-rooms/mockbook.html has been re-rendered from the current platform/data/ref-rooms-staged.json - which the round-3 fix rebuilt and re-carried - and research/ref-rooms/mockbook.data.mjs has been rewritten so that every round-2 finding it hand-carries prints at its CURRENT state rather than as a live defect. The finding is left here word for word so the record shows it was raised and what answered it.",
  },
  {
    room: "202",
    sev: null,
    state: "CLOSED BY THE ROUND-3 FIX",
    owner: "b31",
    text: "platform/data/ref-rooms-staged.json, doc 202-MEP, key plmb_shower_a: OPEN conflicts-table entry B3.1 is NOT carried on a line whose tag it names. B3.1 (status OPEN, conflicts.md B3.1) reads verbatim 'P401/P402 mark SH-1 / L-2 / SK-3 / SK-4; the P104 schedule lists guestroom showers SH-3/SH-4...'. Room 202's own row ITM-0310 carries tag 'SH-1 / SH-4' with its own sqlite note 'DUAL MARK CARRY - P401/P402 print SH-1, P104 schedules SH-4'. The line ships reliability HIGH with no conflict text, while plmb_ksink_a (SK-3 / SK-4) is FLAGGED and carries the same entry. plmb_shower_a's own src string already ends 'conflicts.md B3.1'. Cause: openConflictsFor()/conflictsOnTag() in platform/tools/build_ref_rooms.mjs match only the whole composite tag string, so 'SH-1 / SH-4' misses even though B3.1 names SH-1 literally and SH-4 via the tool's own CONFLICT_TAG_FAMILY expansion of 'SH-3/SH-4'. Consequences: meta.conflictPolicy's assertion that 'every OPEN entry naming ... one of its tags rides on the line that carries the tag, FLAGGED' is false for room 202, and note n_conflicts (in BOTH doc 202 and doc 202-MEP) understates B3.1 as 'names tag(s) SK-3 / SK-4'. Same miss on doc 202-MEP key plmb_lavfaucet_a, whose src quotes 'P104 REMARKS column on rows L-3 and L-4' - the L-2 / L-3 / L-4 marks B3.1 disputes - at reliability HIGH with no carry.",
    how: "Closed by the round-3 fix, in the generator. A MARK LIST IS NOW A LIST: platform/tools/build_ref_rooms.mjs splits every mark list on \"/\" and \",\" on BOTH sides - splitMarks() - with no prefix rule at all, and matches marks one at a time; and a condensed line now carries the marks of its own code AND of every data/project.sqlite row of this room folded into it. B3.1 now rides FLAGGED on plmb_shower_a in ALL FOUR rooms, on plmb_lavfaucet_a in all four (its code is an em dash and its evidence is row ITM-0043, tagged \"L-2 / L-3 / L-4\"), on 217-MEP/db_itm0724 and 238-MEP/db_itm0715, and on plmb_ksink_a as before. Room note n_conflicts now states the full mark list - L-2, L-3, L-4, SH-1, SH-3 or SH-4, SK-3, SK-4 - instead of \"names tag(s) SK-3 / SK-4\", and says which of three tests caught the entry. The DOCUMENT conflict is not resolved and is not closed: the plumbing engineer still owes the answer, and B3.1's own words are on every one of those lines.",
  },
  {
    room: "202",
    sev: null,
    state: "CLOSED BY THE ROUND-3 FIX",
    owner: "n_gaps_scope",
    text: "platform/data/ref-rooms-staged.json, docs 202 AND 202-MEP, note n_gaps: two placeholders that are not about this room or this type ride under the header 'DOCUMENT GAPS THE DATABASE RAISES AGAINST THIS ROOM TYPE'. (a) PH-GU-016 is explicitly scoped 'Plumbing unit plan for room 118 (King Studio Acc. MOD Connector)' and its text is entirely about room 118. (b) PH-GU-027 is 'P-trap and supply-line protection at ACCESSIBLE lavatories'; room 202 is rooms.accessible = 0, and the placeholder's own why says 'fails a TAS walk on 7 keys' - the seven accessible keys, which do not include 202/302/402. Both are selected only because the key test in platform/tools/build_ref_rooms.mjs, new RegExp('(^|[^0-9])' + k + '([^0-9]|$)'), matches the SHEET designations 'P402' (PH-GU-016) and 'G402'/'P402' (PH-GU-027) as room key 402. The conflicts matcher in the same file uses the correct boundary class '[^0-9A-Za-z-]' and correctly rejects P402/G402; the placeholder matcher does not. (PH-GU-003 is also selected only via this same false positive, though it happens to be genuinely relevant to this room's SK-3/SK-4 line.)",
    how: "Closed by the round-3 fix. The placeholder matcher now uses the same boundary class the conflicts matcher always used, '(^|[^0-9A-Za-z-])' + key + '([^0-9A-Za-z]|$)', so the sheet designations P402 and G402 are no longer read as room key 402: PH-GU-016 (room 118's plumbing plan) and PH-GU-027 (accessible lavatories) are gone from room 202's n_gaps. A third test was added at the same time - a placeholder that names a MARK this room carries - which is why PH-GU-003 stays on room 202 on the evidence that actually ties it there (the SK-3 / SK-4 line), and why PH-GU-004 (WC-3 / WC-4) and PH-GU-012 (the 905 tag) now appear on the rooms that ship those marks. Every entry now prints WHICH test selected it, and the note no longer reads as a closed set.",
  },
  {
    room: "202",
    sev: null,
    state: "CLOSED BY THE ROUND-3 FIX",
    owner: "generator_fix",
    text: "platform/data/ref-rooms-staged.json, doc 202-MEP, key mech_ptac, instanceNote: a false statement about this room. The note reads 'NO row of this room's own cites that number: its own A55-series row(s) (ITM-0320, ITM-0321, ITM-0061) cite different numbers, so nothing in this room corroborates it.' The surviving citation segment is 'A553 KN1', and room 202's own row ITM-0010 ('PTAC branch circuit, 208 V, 2080 VA', Electrical, HIGH) has source_sheet 'E400; E103; A55x kn1', which the tool's own resolveSheetWildcard renders as exactly 'A553 kn1'. The corroboration test in composeMepCitation only walks the rows in the support set for this one condensed line, then prints a room-wide negative that the database contradicts.",
    how: "Closed by the round-3 fix. composeMepCitation() now receives EVERY row of the room and tests corroboration NUMBER BY NUMBER against all of them, instead of against the support set of one condensed line - a negative about the room has to be proved on the room. 202-MEP/mech_ptac now reads \"...and this room's own rows corroborate it NUMBER BY NUMBER: keynote 1 <- ITM-0010\", which is the row the database always had. The same change corrected 238-MEP/elec_sink_sw, which now attributes keynote 14 to ITM-0016 and keynote 15 to ITM-0007 rather than both to ITM-0016, and where only some numbers are corroborated the line now names the ones that are not.",
  },
  {
    room: "217",
    sev: "HIGH",
    state: "CLOSED BY THIS REBUILD",
    owner: null,
    text: "COLLATERAL / HIGH - research/ref-rooms/mockbook.html is a PRE-FIX render and still shows room 217's round-1 defects. The mockbook was built 2026-08-24 16:54; platform/data/ref-rooms-staged.json was rewritten by the fix round at 17:32 and the renderer was never re-run. In the HTML that Austin approves from, 217-MEP/fp_heads_a `src` still reads \"FP-1 head schedule, both rows (... 144 total heads 1st floor); FP-1 design notes block; ...; FP-1, verified head-by-head on rooms 107 and 108\" - a FIRST-FLOOR sheet with a first-floor head total on a floor-2 room, which is exactly the round-1 finding; 217-MEP/mech_tstat still renders qty 1 at reliability HIGH with no count-conflict note (the JSON now ships it FLAGGED with 'COUNT CONFLICT CARRIED, NOT RESOLVED'); and the three notes the fix round added to BOTH 217 docs appear nowhere in the file - grep counts 0 for 'OPEN DOCUMENT CONFLICTS THAT TOUCH THIS ROOM' (n_conflicts), 'TWO PTAC UNITS, ONE TRANSCRIBED SUB-ASSEMBLY' (n_ptac2) and \"AUSTIN'S QUANTITY RULINGS, EVALUATED FOR THIS ROOM\" (n_rulings). Compounding it, research/ref-rooms/mockbook.data.mjs (16:50) still hand-carries the round-1 verifier entry '217 | mech_tstat Thermostat, qty 1 | The PTAC line on the same page ships qty 2 and quotes \"thermostat x2\". The thermostat line still says 1.' as a live DEFECT, so a plain re-render would print a defect that no longer exists. Fix: update mockbook.data.mjs's VERIFIER block, then re-run research/ref-rooms/build_mockbook.mjs.",
    how: "Closed by this rebuild. research/ref-rooms/mockbook.html has been re-rendered from the current platform/data/ref-rooms-staged.json - which the round-3 fix rebuilt and re-carried - and research/ref-rooms/mockbook.data.mjs has been rewritten so that every round-2 finding it hand-carries prints at its CURRENT state rather than as a live defect. The finding is left here word for word so the record shows it was raised and what answered it.",
  },
  {
    room: "217",
    sev: "HIGH",
    state: "CLOSED BY THE ROUND-3 FIX",
    owner: "b31",
    text: "HIGH - platform/data/ref-rooms-staged.json, docs 217 and 217-MEP: OPEN conflicts-table entry B3.1 is not carried on the two room-217 lines whose tags it names. conflicts.B3.1 (status OPEN, topic 'Plumbing - fixture-mark mismatch') names marks SH-1, L-2, SK-3, SK-4, SH-3, SH-4, L-3, L-4 and says 'Verify governing marks before ordering guestroom trim.' Room 217 holds sqlite tag 'SH-1 / SH-3' (ITM-0724, emitted as 217-MEP/db_itm0724) and the emitted line 217-MEP/plmb_shower_a carries code 'SH-1 / SH-4'. Neither line carries the 'OPEN DOCUMENT CONFLICT B3.1' block (only 217-MEP/plmb_ksink_a does), and note n_conflicts on BOTH 217 and 217-MEP states 'B3.1 ... names tag(s) SK-3 / SK-4' - understating which of this room's lines the open conflict touches. This violates the build's own stated conflictPolicy ('every OPEN entry naming ... one of its tags rides on the line that carries the tag, FLAGGED'). Cause: platform/tools/build_ref_rooms.mjs openConflictsFor() (~line 2012-2024) tests the room's tag string whole, and conflictHaystack()/CONFLICT_TAG_FAMILY (~line 1995-2010) expands only same-prefix slash runs such as 'GR-300/305/307/308/318/322/323/325', so the mixed-prefix run 'SH-1 / L-2 / SK-3 / SK-4' is never split and the room's own compound tag 'SH-1 / SH-3' never matches. Same gap present on 202-MEP, 230-MEP and 238-MEP plmb_shower_a.",
    how: "Closed by the round-3 fix, in the generator. A MARK LIST IS NOW A LIST: platform/tools/build_ref_rooms.mjs splits every mark list on \"/\" and \",\" on BOTH sides - splitMarks() - with no prefix rule at all, and matches marks one at a time; and a condensed line now carries the marks of its own code AND of every data/project.sqlite row of this room folded into it. B3.1 now rides FLAGGED on plmb_shower_a in ALL FOUR rooms, on plmb_lavfaucet_a in all four (its code is an em dash and its evidence is row ITM-0043, tagged \"L-2 / L-3 / L-4\"), on 217-MEP/db_itm0724 and 238-MEP/db_itm0715, and on plmb_ksink_a as before. Room note n_conflicts now states the full mark list - L-2, L-3, L-4, SH-1, SH-3 or SH-4, SK-3, SK-4 - instead of \"names tag(s) SK-3 / SK-4\", and says which of three tests caught the entry. The DOCUMENT conflict is not resolved and is not closed: the plumbing engineer still owes the answer, and B3.1's own words are on every one of those lines.",
  },
  {
    room: "217",
    sev: "MEDIUM",
    state: "CLOSED BY THE ROUND-3 FIX",
    owner: "wc02",
    text: "MEDIUM - platform/data/ref-rooms-staged.json, docs 217 and 217-MEP, note n_gategaps: a document conflict on room 217's own gated-out row is silently lost. The note promises it lists rows that 'state a DOCUMENT CONFLICT in their own note at any reliability', but room 217's row ITM-0378 (Wall Covering, tag WC-02, HIGH, cited A533; finish_schedule p.61) is absent from n_gategaps and from every line in both docs (0 occurrences of 'ITM-0378', 'WC-02', 'WC-12' or 'Confirm which is intended'). Its sqlite note states a live disagreement about THIS room's own bathroom finish, verbatim: 'W-3 - A533 uses the STANDARD palette (WC-02 / T-01.1 / PT-02) for an accessible bath while A532 uses WC-12 / B-05 / PT-04. Confirm which is intended'. Cause: platform/tools/build_ref_rooms.mjs CONFLICT_IN_NOTE_RE (~line 1993) matches only /conflict|conflicts\\.md|contradic|mutually exclusive|do not buy|not stated|RFI/i; the register id 'W-3' plus 'Confirm which is intended' hits none of them. The comparable Paint row ITM-0374 rode only because its note happens to spell the word 'P-1 CONFLICT'. n_gategaps therefore reports '6 row(s)' where 7 qualify.",
    how: "Closed by the round-3 fix. The gate-note conflict test now matches the database's OWN conflict vocabulary - \"confirm which\", \"confirm before\", \"which is intended\", \"disagree\", \"unresolved\", \"unsettled\", \"no source settles\", \"never assigned\", \"not normalised\", \"two different\", \"superseded\" - OR two sheet numbers set against each other in one sentence. Room 217's ITM-0378 now rides in n_gategaps on BOTH 217 documents, marked STATES A DOCUMENT CONFLICT, with its note quoted verbatim, and the note now counts 7 rows where it counted 6. The finish question itself is untouched and still open.",
  },
  {
    room: "217",
    sev: "LOW-MEDIUM",
    state: "CLOSED BY THE ROUND-3 FIX",
    owner: "reliability_fold",
    text: "LOW-MEDIUM - platform/data/ref-rooms-staged.json, doc 217, key 905_a: the line asserts a reliability the database does not carry. instanceNote reads 'RELIABILITY. The reliability on this line starts from THIS room's own data/project.sqlite row(s) ITM-0347, ITM-0082, which read MEDIUM.' In data/project.sqlite, room 217's ITM-0082 (Appliance, tag 905, 'Telephone') reads HIGH; only ITM-0347 reads MEDIUM. The sentence also argues 'LIVE room 104 carries the same tag at HIGH, which is a fact about room 104 and not evidence about this room', which is misleading given room 217 carries its own HIGH row for the same tag. Cause: platform/tools/build_ref_rooms.mjs lines 2383-2384 print the folded worst-case reliability against the full row-id list, so any folded group with mixed reliabilities misreports its members. On a build whose premise is quoting the database verbatim and never guessing, a live line must not state a row reads MEDIUM when the database reads it HIGH.",
    how: "Closed by the round-3 fix. A folded FF&E line now names EVERY row at its OWN reading instead of printing the fold's worst against the whole row list. Room 217's 905_a now reads \"the WORST of THIS room's own data/project.sqlite row(s), each at its own reading: ITM-0347 [MEDIUM], ITM-0082 [HIGH]. They do not agree, so the line ships the worst of them, MEDIUM\", and it quotes ITM-0347's own note as the reason rather than arguing from room 104.",
  },
  {
    room: "230",
    sev: "HIGH",
    state: "CLOSED BY THIS REBUILD",
    owner: null,
    text: "[HIGH] research/ref-rooms/mockbook.html is STALE - the delivered mock-up does not render the fixed data. On-disk/committed mockbook.html is 524,123 bytes (md5 de0b993720455f3f33d246d2d61c8323) and was rendered from the PRE-fix ref-rooms-staged.json (346,812 bytes in commit e06dfd0). Re-running `node research/ref-rooms/build_mockbook.mjs` against the current staged file yields 711,280 bytes (md5 77bbfa24ffb4a30b98e250e2b07eeb09); two consecutive runs are byte-identical, so this is staleness, not nondeterminism. Concretely the delivered book still shows room 230 / 230-MEP / fp_heads_a citing \"FP-1 head schedule ... 144 total heads 1st floor\" (the exact defect the fix round claims to have closed) and contains 0 occurrences of \"OPEN DOCUMENT CONFLICTS THAT TOUCH THIS ROOM\" against 8 in the fresh render. Everything the fix round did to room 230 is invisible in the artifact Austin is being asked to approve. (I restored mockbook.html to its found state after testing; the working tree is unchanged.)",
    how: "Closed by this rebuild. research/ref-rooms/mockbook.html has been re-rendered from the current platform/data/ref-rooms-staged.json - which the round-3 fix rebuilt and re-carried - and research/ref-rooms/mockbook.data.mjs has been rewritten so that every round-2 finding it hand-carries prints at its CURRENT state rather than as a live defect. The finding is left here word for word so the record shows it was raised and what answered it.",
  },
  {
    room: "230",
    sev: "HIGH",
    state: "CLOSED BY THE ROUND-3 FIX",
    owner: "b31",
    text: "[HIGH] platform/data/ref-rooms-staged.json doc 230-MEP key plmb_shower_a - OPEN conflict B3.1 names this line's own mark and is not carried; the line ships reliability HIGH with no conflict text. sqlite conflicts B3.1 (status OPEN) positions, verbatim: \"P401/P402 mark SH-1 / L-2 / SK-3 / SK-4; the P104 schedule lists guestroom showers SH-3/SH-4, lavs L-3/L-4, and only SK-1/SK-2 (laundry). BOTH SETS CARRIED. Verify governing marks before ordering guestroom trim.\" Room 230's own row ITM-0545 is tagged \"SH-1 / SH-4\" and its own note reads \"DUAL MARK CARRY - P401/P402 print SH-1, P104 schedules SH-4; P104's own SH-1 is the 36x36 employee shower.\" The sibling line plmb_ksink_a (tag \"SK-3 / SK-4\") IS flagged FLAGGED and carries B3.1 verbatim - so the same open entry flags one of this room's two dual-mark lines and not the other. Root cause in platform/tools/build_ref_rooms.mjs openConflictsFor(): CONFLICT_TAG_FAMILY expands slash-runs in the CONFLICT ENTRY's text but the room's own tag is matched as one whole literal string, so \"SK-3 / SK-4\" matches only because that exact substring happens to appear in B3.1's positions text, while \"SH-1 / SH-4\" does not. Which line gets flagged is decided by string coincidence, not by evidence.",
    how: "Closed by the round-3 fix, in the generator. A MARK LIST IS NOW A LIST: platform/tools/build_ref_rooms.mjs splits every mark list on \"/\" and \",\" on BOTH sides - splitMarks() - with no prefix rule at all, and matches marks one at a time; and a condensed line now carries the marks of its own code AND of every data/project.sqlite row of this room folded into it. B3.1 now rides FLAGGED on plmb_shower_a in ALL FOUR rooms, on plmb_lavfaucet_a in all four (its code is an em dash and its evidence is row ITM-0043, tagged \"L-2 / L-3 / L-4\"), on 217-MEP/db_itm0724 and 238-MEP/db_itm0715, and on plmb_ksink_a as before. Room note n_conflicts now states the full mark list - L-2, L-3, L-4, SH-1, SH-3 or SH-4, SK-3, SK-4 - instead of \"names tag(s) SK-3 / SK-4\", and says which of three tests caught the entry. The DOCUMENT conflict is not resolved and is not closed: the plumbing engineer still owes the answer, and B3.1's own words are on every one of those lines.",
  },
  {
    room: "230",
    sev: "HIGH",
    state: "CLOSED BY THE ROUND-3 FIX",
    owner: "b31",
    text: "[HIGH] platform/data/ref-rooms-staged.json doc 230 note n_conflicts (and the build report) under-report B3.1, and its lavatory half lands nowhere at all. n_conflicts states B3.1 \"names tag(s) SK-3 / SK-4\". B3.1 also names SH-1, SH-4, L-2, L-3 and L-4, every one of which room 230 carries: ITM-0545 tag \"SH-1 / SH-4\" and ITM-0043 tag \"L-2 / L-3 / L-4\" (own note: \"DUAL MARK CARRY - P401/P402 print L-2, P104 schedules L-3/L-4; P104's own L-2 is the employee/pool wall-hung lav\"). ITM-0043 is folded by MEP_CONDENSED_SOURCES onto 230-MEP/plmb_lavfaucet_a, whose `code` is \"—\" (em dash), so conflictsOnTag() can never match it. Result: the lavatory-mark dispute appears nowhere in doc 230, doc 230-MEP, or n_conflicts. The build report repeats the under-count: \"4 open entr(y/ies) touch this room: B3.1 [tags SK-3 / SK-4] ...\". This violates the artifact's own meta.conflictPolicy (\"every OPEN entry naming one of these rooms' keys or one of its tags rides on the line that carries the tag, FLAGGED\").",
    how: "Closed by the round-3 fix, in the generator. A MARK LIST IS NOW A LIST: platform/tools/build_ref_rooms.mjs splits every mark list on \"/\" and \",\" on BOTH sides - splitMarks() - with no prefix rule at all, and matches marks one at a time; and a condensed line now carries the marks of its own code AND of every data/project.sqlite row of this room folded into it. B3.1 now rides FLAGGED on plmb_shower_a in ALL FOUR rooms, on plmb_lavfaucet_a in all four (its code is an em dash and its evidence is row ITM-0043, tagged \"L-2 / L-3 / L-4\"), on 217-MEP/db_itm0724 and 238-MEP/db_itm0715, and on plmb_ksink_a as before. Room note n_conflicts now states the full mark list - L-2, L-3, L-4, SH-1, SH-3 or SH-4, SK-3, SK-4 - instead of \"names tag(s) SK-3 / SK-4\", and says which of three tests caught the entry. The DOCUMENT conflict is not resolved and is not closed: the plumbing engineer still owes the answer, and B3.1's own words are on every one of those lines.",
  },
  {
    room: "230",
    sev: "HIGH",
    state: "CLOSED BY THE ROUND-3 FIX",
    owner: "grille_material",
    text: "[HIGH] platform/data/ref-rooms-staged.json doc 230-MEP key mech_grille_rm - a FLAGGED row shipped as a HIGH line with a completely EMPTY note. The line's only source row is room 230's own ITM-0053, reliability FLAGGED, note verbatim: \"material unsettled - polypropylene vs aluminum, three instructions, no source settles it\" (source_sheet \"M201 vs M501 det.9 vs M401 KN1/KN5\"). The staged line reads reliability \"HIGH\", instanceNote \"\" and label \"Room wall grille at the PTAC set, painted to match\" - an assertion about finish on a part whose material three documents disagree about. The room's own reliability does not govern and the conflict is lost.",
    how: "Closed by the round-3 fix. The MEP condensation now runs the same rule the FF&E path runs: a condensed line ships at the WORST reliability among THIS room's own rows behind it - never the donor's - and every one of those rows that is not HIGH, or whose own note states a document conflict, is quoted ON THE LINE verbatim. On room 230 that moved elec_lights, lv_phone_db, lv_tvdata, mech_grille_bath, mech_grille_rm, plmb_ksink_a, plmb_lavfaucet_a and plmb_wc_a to FLAGGED and elec_outlets, plmb_fd_a and plmb_trapguard_a to MEDIUM, and put \"material unsettled\", \"fan vs grille designation unresolved\", \"49 inlets against ~119 needed\", \"fixture type not named\", \"count per room is NOT STATED\", \"two different primer products\", \"printed 'optional'\", \"which rooms carry it is unresolved\" and \"HEIGHT FLAGGED\" onto the lines they belong to. meta.donorRule now says so for both documents. None of those document questions is resolved - they are now visible.",
  },
  {
    room: "230",
    sev: "HIGH",
    state: "CLOSED BY THE ROUND-3 FIX",
    owner: "bath_exhaust",
    text: "[HIGH] platform/data/ref-rooms-staged.json doc 230-MEP key mech_grille_bath - two FLAGGED rows and three MEDIUM rows folded into a HIGH line, none of their notes carried. Room 230's own rows: ITM-0070 FLAGGED, note verbatim \"M305 shows a plain ceiling grille + Aldes regulator on a central riser and NO in-room fan - fan vs grille designation unresolved, coordination_issues C-06. Do not order 115\"; ITM-0065 FLAGGED, note verbatim \"M305's own numbers give 49 inlets against ~119 needed (2,450 CFM / 50). Count unsupported by its only source - the single most expensive unverified line in the package\"; ITM-0064, ITM-0066, ITM-0069 all MEDIUM. The staged line ships reliability HIGH with the note \"Covers the EF-1 exhaust fan running, the volume damper, the ceiling fire damper, the constant-airflow regulator, and the ceiling access panel that reaches them\" - asserting the existence of exactly the fan and the regulator count the documents dispute.",
    how: "Closed by the round-3 fix. The MEP condensation now runs the same rule the FF&E path runs: a condensed line ships at the WORST reliability among THIS room's own rows behind it - never the donor's - and every one of those rows that is not HIGH, or whose own note states a document conflict, is quoted ON THE LINE verbatim. On room 230 that moved elec_lights, lv_phone_db, lv_tvdata, mech_grille_bath, mech_grille_rm, plmb_ksink_a, plmb_lavfaucet_a and plmb_wc_a to FLAGGED and elec_outlets, plmb_fd_a and plmb_trapguard_a to MEDIUM, and put \"material unsettled\", \"fan vs grille designation unresolved\", \"49 inlets against ~119 needed\", \"fixture type not named\", \"count per room is NOT STATED\", \"two different primer products\", \"printed 'optional'\", \"which rooms carry it is unresolved\" and \"HEIGHT FLAGGED\" onto the lines they belong to. meta.donorRule now says so for both documents. None of those document questions is resolved - they are now visible.",
  },
  {
    room: "230",
    sev: "HIGH",
    state: "CLOSED BY THE ROUND-3 FIX",
    owner: "donor_launder",
    text: "[HIGH] platform/data/ref-rooms-staged.json doc 230-MEP - eight further condensed lines ship above their own sqlite rows' reliability with the rows' conflict notes dropped, making meta.donorRule (\"The target room's own data/project.sqlite reliability and its own note govern every line\") false for the whole MEP document. Line [shipped] vs worst own row: elec_lights [HIGH] vs ITM-0022 FLAGGED (\"present on the plan; fixture type is never named on any sheet\") and ITM-0025 FLAGGED (\"fixture type not named\"); plmb_wc_a [HIGH] vs ITM-0042 FLAGGED (\"both marks carried; which mark lands on which unit type is never assigned by any source\") - and its raise rests on \"Flag closed for the punch list by AJ ruling 2026-08-18\", which names no model number, so it does not meet donorRule's \"a RULING that closes the flag for the PRODUCT (a model number, not a room)\"; plmb_lavfaucet_a [HIGH] vs ITM-0045 FLAGGED (\"catalogue pages, no model ticked, no stamp - not a submittal, supersedes nothing today\"); lv_tvdata [HIGH] vs ITM-0030 FLAGGED (\"printed 'optional'; whether it is in scope is never stated - a x115 cost item\"); lv_phone_db [HIGH] vs ITM-0031 FLAGGED (\"which rooms carry it is unresolved - coordination_issues C-04\"); plmb_trapguard_a [HIGH] vs ITM-0047 MEDIUM (\"two different primer products are scheduled - P104 PPP SMP-500-115V vs P102 Sioux Chief 695\"); plmb_fd_a [HIGH] vs ITM-0046 MEDIUM; elec_outlets [HIGH] vs ITM-0021 MEDIUM (\"count per room is NOT STATED on any sheet - one row emitted, see placeholder\"). Also mech_tstat [HIGH] drops ITM-0060's own note \"HEIGHT FLAGGED - 48\\\" (A550 KN24, M101 N29, G402 n11, G400) vs 54\\\" (M401 KN4) vs 60\\\" (E101). coordination_issues C-03\". Verified by grep of doc 230-MEP: zero occurrences of \"DUAL MARK CARRY\", \"material unsettled\", \"fan vs grille designation\", \"49 inlets\", \"fixture type not named\", \"count per room is NOT STATED\", \"two different primer products\", \"whether it is in scope is never stated\", \"which rooms carry it is unresolved\", \"HEIGHT FLAGGED\". Root cause: platform/tools/build_ref_rooms.mjs buildMepDoc() starts each line at `let reliability = d.reliability` (the DONOR line's) and consults this room's own rows only for the PTAC (ptacFromOwnRows), the sprinkler line (fpNoCount), the bathing variant and conflicts-on-tag - the FF&E path's \"donor may enrich, never launder\" reliability rule is never run on MEP.",
    how: "Closed by the round-3 fix. The MEP condensation now runs the same rule the FF&E path runs: a condensed line ships at the WORST reliability among THIS room's own rows behind it - never the donor's - and every one of those rows that is not HIGH, or whose own note states a document conflict, is quoted ON THE LINE verbatim. On room 230 that moved elec_lights, lv_phone_db, lv_tvdata, mech_grille_bath, mech_grille_rm, plmb_ksink_a, plmb_lavfaucet_a and plmb_wc_a to FLAGGED and elec_outlets, plmb_fd_a and plmb_trapguard_a to MEDIUM, and put \"material unsettled\", \"fan vs grille designation unresolved\", \"49 inlets against ~119 needed\", \"fixture type not named\", \"count per room is NOT STATED\", \"two different primer products\", \"printed 'optional'\", \"which rooms carry it is unresolved\" and \"HEIGHT FLAGGED\" onto the lines they belong to. meta.donorRule now says so for both documents. None of those document questions is resolved - they are now visible.",
  },
  {
    room: "230",
    sev: "MEDIUM",
    state: "CLOSED BY THE ROUND-3 FIX",
    owner: "m_series_floor",
    text: "[MEDIUM] platform/data/ref-rooms-staged.json doc 230-MEP keys mech_ptac and mech_tstat - `src` cites a FIRST-FLOOR sheet on a floor-2 room. mech_ptac.src: \"M201 PTAC schedule (...); M401 det.01 + KN3 + KN7; M301 line 30; M501 det.9; A555 KN1 view 08\". mech_tstat.src: \"... M201 PTAC notes; M301 GN5; ...\". sqlite sheets: M301 = \"Mechanical First Floor Plan\", M302 = \"Mechanical Second Floor Plan\"; rooms.floor for 230 = '2'. Room 230's own row ITM-0547 cites only \"M401 detail 01; M201 schedule; A555 KN1 / view 08\" - M301 is donor room 105's (floor 1) citation carried verbatim. This is the identical defect class the fix round closed on fp_heads_a (fpNoCount() explicitly strips \"a FLOOR 1 sheet\"), but nothing strips floor-1 sheets from any other line; composeMepCitation() short-circuits to sameSheetCitation() for room 230 and touches only the \".1\" connecting variant. Compounding: the same mech_ptac line quotes ITM-0547's note saying \"M301 says PTAC-1 at all 16 first-floor guestrooms, which includes QQ 101-115\", so the line sends a floor-2 crew to a sheet it simultaneously states covers floor 1.",
    how: "Closed by the round-3 fix. floorTrueCitation() reads WHICH SHEET COVERS WHICH FLOOR out of data/project.sqlite's own sheets table - a sheet whose title names a floor joins a series with every sheet whose title is identical but for the floor word, which proves M301/M302 and P301/P302 and does NOT prove P305/P306 - and nothing is guessed. On all four rooms: \"M301 line 30\" and \"M301 GN5\" are removed, quoted verbatim as removed, and replaced by M302 cited with NO number on it and marked UNVERIFIED for this floor; \"P301 note 9\" goes the same way to P302; \"P301 note 6\" is RE-POINTED to P302 because this room's own row ITM-0047 cites the range \"P301-P310 GN6\" which spans both; \"A120/A121 General Note I\" loses the floor-1 half and reads \"A121 General Note I\"; and \"P202/P305 HWS distribution\" on the D27 line loses P305 and keeps P202. Two references are deliberately KEPT and labelled: \"E501-E504\" because the range already covers floor 2, and \"A100 Guestroom Matrix\" because the citation is to a building-wide table printed on that sheet and not to the floor drawing.",
  },
  {
    room: "230",
    sev: "MEDIUM",
    state: "CLOSED BY THE ROUND-3 FIX",
    owner: "m_series_floor",
    text: "[MEDIUM] platform/data/ref-rooms-staged.json doc 230-MEP - three more floor-1 sheet citations on a floor-2 room. plmb_fd_a.src ends \"P301 note 9 (floor drain 2\\\")\" and plmb_trapguard_a.src opens \"P301 note 6 ('All floor drains to be installed with trap guards / primers')\"; sqlite sheets: P301 = \"Sanitary Sewer First Floor Plan\", P302 = \"Sanitary Sewer Second Floor Plan\". fp_heads_a.src still carries \"A120/A121 General Note I\"; A120 = \"Reflected Ceiling Plan - First Floor\", A121 = Second Floor - left in on the very line whose whole fix was removing floor-1 citations. plmb_hotcold_a.src is \"D27 (AJ 2026-08-21); P202/P305 HWS distribution\"; P305 = \"Domestic Water & Gas First Floor Plan\" (floor 2 is P306) - carried because RULED_LINE_ADDITIONS is asserted byte-identical to build_floor1.mjs, so closing this one needs a ruling, but as shipped the citation is false for this floor.",
    how: "Closed by the round-3 fix. floorTrueCitation() reads WHICH SHEET COVERS WHICH FLOOR out of data/project.sqlite's own sheets table - a sheet whose title names a floor joins a series with every sheet whose title is identical but for the floor word, which proves M301/M302 and P301/P302 and does NOT prove P305/P306 - and nothing is guessed. On all four rooms: \"M301 line 30\" and \"M301 GN5\" are removed, quoted verbatim as removed, and replaced by M302 cited with NO number on it and marked UNVERIFIED for this floor; \"P301 note 9\" goes the same way to P302; \"P301 note 6\" is RE-POINTED to P302 because this room's own row ITM-0047 cites the range \"P301-P310 GN6\" which spans both; \"A120/A121 General Note I\" loses the floor-1 half and reads \"A121 General Note I\"; and \"P202/P305 HWS distribution\" on the D27 line loses P305 and keeps P202. Two references are deliberately KEPT and labelled: \"E501-E504\" because the range already covers floor 2, and \"A100 Guestroom Matrix\" because the citation is to a building-wide table printed on that sheet and not to the floor drawing.",
  },
  {
    room: "230",
    sev: "LOW",
    state: "CLOSED BY THE ROUND-3 FIX",
    owner: "n_type_conn",
    text: "[LOW] platform/data/ref-rooms-staged.json doc 230 note n_type contradicts five of its own MEP lines. n_type states \"...same room_sheet as the donor (room_types QQ Extended room_sheet = A555, identical to Queen-Queen), so no citation re-point is needed at all - every A555 reference stands verbatim.\" But 230-MEP/elec_panel, elec_outlets, elec_sink_sw, lv_wap and lv_tvdata each carry \"...so every reference on this line stands verbatim with ONE exception: view 04.1\", and the connecting-plan reference WAS dropped on all five (105-MEP elec_panel src \"A555 keynote 51 views 04/04.1 and 07\" -> 230-MEP \"A555 keynote 51 views 04/07\"). The room note asserts a completeness the document does not have.",
    how: "Closed by the round-3 fix. REP_ROOMS[230].why - which is what n_type quotes - now states the exception instead of claiming there is none: the sheet name needs no re-point and every A555 reference stands verbatim WITH ONE EXCEPTION, the \".1\" CONNECTING plan variant, which is dropped because rooms.connecting is 0, and it names the five lines that carry the drop. It also records that citations outside the A-series are re-judged for floor, which is the round-3 change above.",
  },
  {
    room: "230",
    sev: "LOW",
    state: "CLOSED BY THE ROUND-3 FIX",
    owner: "ruled_id",
    text: "[LOW] platform/data/ref-rooms-staged.json doc 230-MEP key plmb_hotcold_a carries an `id` field the LIVE floor-1 line does not, while the D27/D28 lines claim byte identity with live. floor1-staged 105-MEP/plmb_hotcold_a has no `id` key; ref-rooms 230-MEP/plmb_hotcold_a has `id: \"plmb_hotcold_a\"`. The line's own note on doc 230's dh_closer_a/dh_lock_a says the ruled additions are \"carried in the generator (RULED_LINE_ADDITIONS) byte-identically to the version build_floor1.mjs puts on the LIVE floor-1 rooms, so no rebuild can drop it and the two floors cannot drift apart\" - the emitted lines have already drifted (the D28 lines also differ from live by an appended SOURCE paragraph). assertRuledAdditionsMatchLive() does not catch the extra key.",
    how: "Closed by the round-3 fix. The MEP builder now carries an `id` field exactly where the LIVE donor line carries one - if (!('id' in d)) delete item.id - so plmb_hotcold_a ships with no `id` on all four rooms, matching 105-MEP on the live floor-1 rooms. The D27 line's citation also lost its floor-1 half in the same round (P305 dropped, P202 kept), which is a deliberate divergence from live and is stated on the line.",
  },
  {
    room: "230",
    sev: "LOW",
    state: "CLOSED BY THE ROUND-3 FIX, ONE RESIDUE STATED",
    owner: "n_gaps_scope",
    text: "[LOW] platform/data/ref-rooms-staged.json doc 230 note n_gaps over-claims completeness. It is headed \"DOCUMENT GAPS THE DATABASE RAISES AGAINST THIS ROOM TYPE - nothing here has been filled in\" and carries only PH-GU-001, because buildRoomNotes() selects placeholders on a literal room_type-name or room-key mention. Omitted placeholders that name marks this room actually ships as live lines: PH-GU-003 \"Kitchenette sink SK-3 / SK-4 unit-type assignment ... P401/P402 restrict it to 'the suite/extended units' and assign it to none of the seven unit plans\" (room 230 IS the extended type and ships plmb_ksink_a tagged SK-3 / SK-4 - this is the placeholder most about this room); PH-GU-004 \"WC-3 vs WC-4 per unit type\" (ships plmb_wc_a tagged WC-3 / WC-4); PH-GU-015 \"Duplex receptacle count per guestroom\" (ITM-0021's own note says \"see placeholder\"); PH-GU-012 \"GR-905 identity\" (ships tag 905).",
    how: "Closed by the round-3 fix, with one residue stated plainly. The note now says in its own header that it is NOT the complete placeholder list, prints how many guestroom placeholders the database holds against how many were selected, and says which of three mechanical tests caught each one. The mark test added in the same change brings in PH-GU-003 (SK-3 / SK-4), PH-GU-004 (WC-3 / WC-4) and PH-GU-012 (the 905 tag) on room 230, which is three of the four the finding names. THE RESIDUE: PH-GU-015 (duplex receptacle count) is still not selected, because it names no mark, no room key and no type name, and ITM-0021's note says \"see placeholder\" without an id - there is no mechanical link, and inventing one would be a guess. The note's own wording now tells the reader that.",
  },
  {
    room: "230",
    sev: "LOW",
    state: "DECIDED AND DOCUMENTED BY THE ROUND-3 FIX",
    owner: "a13",
    text: "[LOW / scope question] sqlite conflicts A13 (status OPEN) is the only entry that prints an area for this room's type - positions, verbatim: \"G001 Unit Mix: Queen Queen 480 sqft vs Queen Queen (Wide) 535 sqft; also QQ Ext 510, King Studio 387...\" - and it is carried nowhere in doc 230 or 230-MEP. openConflictsFor() matches only room keys and tags by design, so a type-name mention never rides. Flagging for a ruling on whether type-name mentions should be in scope rather than as a code bug.",
    how: "Decided and documented by the round-3 fix, which is what the finding asked for. AN OPEN ENTRY THAT PRINTS AN AREA FOR THIS ROOM TYPE RIDES AS A ROOM NOTE AND ON NO LINE, because an area is a fact about the type and not about any one item. Room 230 now carries note n_typearea with A13 quoted verbatim. The test is mechanical and stated in the note: the entry names the type by its full room_types name, or by a prefix of it at least six characters long ending at a word boundary and immediately followed by a number - G001 writes this type as \"QQ Ext 510\". Nothing is resolved; the note says a field measurement of this key is what settles it.",
  },
  {
    room: "238",
    sev: null,
    state: "CLOSED BY THE ROUND-3 FIX",
    owner: "st02_a556",
    text: "platform/data/ref-rooms-staged.json | doc 238-MEP | key mech_grille_rm | field src -- ships \"A556 (ST-01 tagged, no PT code)\". FALSE FOR THIS ROOM. Room 238's own row ITM-0694 reads tag ST-02, primary_sheet A556 el.07, reliability FLAGGED, note verbatim: \"S-1, purchase-order-grade gap. ST-02 has NO card in the finish schedule. A550/A551/A552/A553.2/A555 tag ST-01 at the identical condition. Not normalised\" - A556 is deliberately excluded from that ST-01 list. The claim is donor room 105's reading of its OWN drawing (ITM-0440, ST-01 on A555 el.08). The generator dropped the donor's view number but re-pointed the donor's factual assertion onto A556 and shipped it at HIGH. It also contradicts this same document's note n_gategaps, which carries ST-02/ITM-0694 verbatim.",
    how: "Closed by the round-3 fix. ownTagAssertions() treats a TAG ASSERTION inside a carried citation as what it is - the DONOR room's reading of the DONOR's own drawing - and corrects it against this room's own rows. Room 238's mech_grille_rm now cites \"A556 (ST-02 tagged, no PT code)\" and carries ITM-0694 verbatim, including its note that A550/A551/A552/A553.2/A555 tag ST-01 at the identical condition and A556 does not. Rooms 202, 217 and 230 were checked by the same rule and nothing moved on them, because their own rows agree with the assertion. The ST-02 gap itself is still open and still purchase-order grade.",
  },
  {
    room: "238",
    sev: null,
    state: "CLOSED BY THE ROUND-3 FIX",
    owner: "ptac_detail",
    text: "platform/data/ref-rooms-staged.json | doc 238-MEP | key mech_ptac | field src -- cites \"M401 det.01\". Room 238's OWN PTAC row ITM-0695 cites \"M401 detail 02; M201 schedule; A556 KN1 / view 07\". Detail 01 is donor room 105's number (ITM-0443, \"M401 detail 01\"). sheets.M401 = \"Mechanical Typical Guestroom - 7 room types, PTAC layout\", i.e. the detail number IS the room type, so this sends the QQ Acc. crew to the plain Queen-Queen detail. Room 230 legitimately carries det.01; 238 was not re-judged.",
    how: "Closed by the round-3 fix. ptacFromOwnRows() now takes the M401 DETAIL NUMBER from this room's own PTAC row, because sheets.M401 is \"Mechanical Typical Guestroom - 7 room types, PTAC layout\" and on that sheet the detail number IS the room type. 238-MEP now cites \"M401 det.02\" per ITM-0695 and says on the line that detail 01 was the donor's type and is not carried; 230 keeps detail 01 because its own row ITM-0547 cites detail 01; and rooms 202 and 217, whose donor citation named M401 with no detail at all, now carry \"M401 detail 06\" and \"M401 detail 07\" from ITM-0320/ITM-0321 and ITM-0395/ITM-0396.",
  },
  {
    room: "238",
    sev: null,
    state: "CLOSED BY THE ROUND-3 FIX",
    owner: "m_series_floor",
    text: "platform/data/ref-rooms-staged.json | doc 238-MEP | keys mech_ptac and mech_tstat | field src -- cite \"M301 line 30\" and \"M301 GN5\". sheets.M301 = \"Mechanical First Floor Plan\"; room 238 is on FLOOR 2 (rooms.floor = 2), whose plan is M302. Neither of this room's own rows for these items (ITM-0695, ITM-0060, ITM-0018) cites M301 line 30 or M301 GN5 - both segments are donor room 105 floor-1 text. This is the identical defect class the fix round repaired for the sprinkler line (fp_heads_a now says \"ROOM 238 IS ON FLOOR 2 - read the sheet that covers floor 2\"); the guard in build_ref_rooms.mjs is FP-series only and nothing covers the M-series.",
    how: "Closed by the round-3 fix. floorTrueCitation() reads WHICH SHEET COVERS WHICH FLOOR out of data/project.sqlite's own sheets table - a sheet whose title names a floor joins a series with every sheet whose title is identical but for the floor word, which proves M301/M302 and P301/P302 and does NOT prove P305/P306 - and nothing is guessed. On all four rooms: \"M301 line 30\" and \"M301 GN5\" are removed, quoted verbatim as removed, and replaced by M302 cited with NO number on it and marked UNVERIFIED for this floor; \"P301 note 9\" goes the same way to P302; \"P301 note 6\" is RE-POINTED to P302 because this room's own row ITM-0047 cites the range \"P301-P310 GN6\" which spans both; \"A120/A121 General Note I\" loses the floor-1 half and reads \"A121 General Note I\"; and \"P202/P305 HWS distribution\" on the D27 line loses P305 and keeps P202. Two references are deliberately KEPT and labelled: \"E501-E504\" because the range already covers floor 2, and \"A100 Guestroom Matrix\" because the citation is to a building-wide table printed on that sheet and not to the floor drawing.",
  },
  {
    room: "238",
    sev: null,
    state: "CLOSED BY THE ROUND-3 FIX",
    owner: "b31",
    text: "platform/data/ref-rooms-staged.json | doc 238-MEP | key db_itm0715 (and plmb_shower_a) -- OPEN conflicts-table entry B3.1 names this line's tag and does not ride on it. B3.1 positions, verbatim: \"P401/P402 mark SH-1 / L-2 / SK-3 / SK-4; the P104 schedule lists guestroom showers SH-3/SH-4, lavs L-3/L-4...\". db_itm0715 carries this room's own tag \"SH-1 / SH-3\" (ITM-0715) - the exact P401/P402-vs-P104 mark disagreement B3.1 describes - and carries no B3.1 quote. Room 238 also carries tag \"L-2 / L-3 / L-4\" (ITM-0043, note \"DUAL MARK CARRY - P401/P402 print L-2, P104 schedules L-3/L-4\"), which likewise gets no carriage on any line or note. Cause: openConflictsFor() in platform/tools/build_ref_rooms.mjs tests the whole raw tag string literally against the entry text, so composite marks can never match; only \"SK-3 / SK-4\" appears verbatim in B3.1 and only plmb_ksink_a got flagged.",
    how: "Closed by the round-3 fix, in the generator. A MARK LIST IS NOW A LIST: platform/tools/build_ref_rooms.mjs splits every mark list on \"/\" and \",\" on BOTH sides - splitMarks() - with no prefix rule at all, and matches marks one at a time; and a condensed line now carries the marks of its own code AND of every data/project.sqlite row of this room folded into it. B3.1 now rides FLAGGED on plmb_shower_a in ALL FOUR rooms, on plmb_lavfaucet_a in all four (its code is an em dash and its evidence is row ITM-0043, tagged \"L-2 / L-3 / L-4\"), on 217-MEP/db_itm0724 and 238-MEP/db_itm0715, and on plmb_ksink_a as before. Room note n_conflicts now states the full mark list - L-2, L-3, L-4, SH-1, SH-3 or SH-4, SK-3, SK-4 - instead of \"names tag(s) SK-3 / SK-4\", and says which of three tests caught the entry. The DOCUMENT conflict is not resolved and is not closed: the plumbing engineer still owes the answer, and B3.1's own words are on every one of those lines.",
  },
  {
    room: "238",
    sev: null,
    state: "CLOSED BY THE ROUND-3 FIX",
    owner: "b31",
    text: "platform/data/ref-rooms-staged.json | docs 238 and 238-MEP | note n_conflicts -- states \"B3.1 [conflicts.md B3.1] names tag(s) SK-3 / SK-4\". That is a false narrowing of the entry it then quotes verbatim in the same sentence: B3.1 names SH-1, SH-3, SH-4, L-2, L-3 and L-4 as well, and room 238 carries all of them (ITM-0715 \"SH-1 / SH-3\", ITM-0043 \"L-2 / L-3 / L-4\"). The note tells the reader the entry is narrower than its own quoted text shows.",
    how: "Closed by the round-3 fix, in the generator. A MARK LIST IS NOW A LIST: platform/tools/build_ref_rooms.mjs splits every mark list on \"/\" and \",\" on BOTH sides - splitMarks() - with no prefix rule at all, and matches marks one at a time; and a condensed line now carries the marks of its own code AND of every data/project.sqlite row of this room folded into it. B3.1 now rides FLAGGED on plmb_shower_a in ALL FOUR rooms, on plmb_lavfaucet_a in all four (its code is an em dash and its evidence is row ITM-0043, tagged \"L-2 / L-3 / L-4\"), on 217-MEP/db_itm0724 and 238-MEP/db_itm0715, and on plmb_ksink_a as before. Room note n_conflicts now states the full mark list - L-2, L-3, L-4, SH-1, SH-3 or SH-4, SK-3, SK-4 - instead of \"names tag(s) SK-3 / SK-4\", and says which of three tests caught the entry. The DOCUMENT conflict is not resolved and is not closed: the plumbing engineer still owes the answer, and B3.1's own words are on every one of those lines.",
  },
  {
    room: "238",
    sev: null,
    state: "CLOSED BY THE ROUND-3 FIX",
    owner: "b44",
    text: "platform/data/ref-rooms-staged.json | docs 238 and 238-MEP | note n_conflicts -- the header claims to enumerate \"OPEN DOCUMENT CONFLICTS THAT TOUCH THIS ROOM - 5 entr(y/ies)\" but omits conflicts-table entry B4.4 (status OPEN, source \"conflicts.md B4.4 + A11\", topic \"FF&E - room 438 label and configuration\"). Nine of room 238's own sqlite rows (ITM-0712, 0713, 0714, 0715, 0716, 0717, 0718, 0719, 0720) state verbatim: \"conflicts.md A11 / B4.4 and coordination_issues.md C-01 are OPEN on all seven accessible keys (118, 217, 238, 317, 338, 417, 438)\". By the room's own rows B4.4 touches this key, so the count of 5 and the completeness claim are wrong. (B4.4's text is not lost - it rides inside n_config and on the eight configuration lines - but the conflicts enumeration disagrees with the database.)",
    how: "Closed by the round-3 fix. An OPEN entry now also rides when one of THIS room's own data/project.sqlite rows cites it BY ID: openConflictsFor() reads \"conflicts.md A11 / B4.4\" out of a row's note and matches both ids. Room 238's n_conflicts now enumerates 6 entries including B4.4, and names the nine rows (ITM-0712 to ITM-0720) that cite it. Room 217 gains B4.4 on the same evidence, because its own nine accessible-key rows say the same thing. The note now states all three tests it applies, so the count is checkable against the database.",
  },
  {
    room: "238",
    sev: null,
    state: "CLOSED BY THE ROUND-3 FIX",
    owner: "own_mark",
    text: "platform/data/ref-rooms-staged.json | doc 238-MEP | key plmb_shencl_a | fields code and src -- ships mark \"kn 28 / kn 5\" while the line's own instanceNote declares \"view 01, keynote 5 are NOT carried onto A556\", so half the shipped mark has no surviving citation anywhere on the line. The retained citation \"A530 keyed note 28 (elevation 04) and keyed note 27 (plan 01)\" has no backing row in room 238 (no 238 row cites A530 kn27 or kn28), and sheets.A530 = \"Enl. Bathroom - King Std., Std. Conn., QQ Std., Std. Conn., QQ Wide & QQ Ext.\" - QQ Acc. is drawn on A532 / A532.1 (room_types.bath_sheet = 'A532 / A532.1'). This is donor room 105's reading of its own bath sheet, placement callouts included, on a room whose bath is a different drawing.",
    how: "Closed by the round-3 fix. THE MARK COMES FROM THE TARGET ROOM, ALWAYS. On a bathing-unresolved line - one that keeps the donor's product text because dropping a line from Austin's approved D10 punch is not the tool's call - the code is now taken from THIS room's own bathing rows in the same category and the same mark family as the donor's mark, or the field is left EMPTY. 238-MEP/plmb_shower_a now ships \"SH-1 / SH-3\" from ITM-0715 and 238-MEP/plmb_shencl_a ships \"kn 10 / kn 11\" from ITM-0716 and ITM-0717; both lines quote the donor's mark as NOT carried, quote the rows the mark came from, and state that this room type's bath is drawn on A532 / A532.1 (room_types.bath_sheet) and not on the donor's bath sheet, so any bath-sheet keynote in the citation is the donor's reading and has to be confirmed there.",
  },
  {
    room: "238",
    sev: null,
    state: "CLOSED BY THE ROUND-3 FIX",
    owner: "own_mark",
    text: "platform/data/ref-rooms-staged.json | doc 238-MEP | key plmb_shower_a | field code -- ships \"SH-1 / SH-4\", donor room 105's mark pair. Room 238's own shower row ITM-0715 resolves the pair as \"SH-1 / SH-3\" (P401/P402 mark SH-1; P104 SH-3) and no SH-4 row exists anywhere in room 238. The line's own src even reads \"P104 rows SH-3 and SH-4\", so the code and its citation disagree with each other and with the room's own row.",
    how: "Closed by the round-3 fix. THE MARK COMES FROM THE TARGET ROOM, ALWAYS. On a bathing-unresolved line - one that keeps the donor's product text because dropping a line from Austin's approved D10 punch is not the tool's call - the code is now taken from THIS room's own bathing rows in the same category and the same mark family as the donor's mark, or the field is left EMPTY. 238-MEP/plmb_shower_a now ships \"SH-1 / SH-3\" from ITM-0715 and 238-MEP/plmb_shencl_a ships \"kn 10 / kn 11\" from ITM-0716 and ITM-0717; both lines quote the donor's mark as NOT carried, quote the rows the mark came from, and state that this room type's bath is drawn on A532 / A532.1 (room_types.bath_sheet) and not on the donor's bath sheet, so any bath-sheet keynote in the citation is the donor's reading and has to be confirmed there.",
  },
  {
    room: "238",
    sev: null,
    state: "CLOSED BY THE ROUND-3 FIX",
    owner: "generator_fix",
    text: "platform/data/ref-rooms-staged.json | doc 238-MEP | key elec_sink_sw | field instanceNote -- asserts that for \"A556 keynote 14 and keynote 15\" ... \"this room's own row(s) ITM-0016 cite the same number on the same sheet\". ITM-0016 cites only \"A55x kn14\"; keynote 15 is carried by a different row, ITM-0007 (\"E400; E103; A55x kn15\"), which the note never names. The two-number claim is attributed to a row that backs one of them. (The generator does list multiple rows elsewhere - elec_outlets names ITM-0017, ITM-0019, ITM-0020 - so this is an attribution miss, not the declared method.)",
    how: "Closed by the round-3 fix. composeMepCitation() now receives EVERY row of the room and tests corroboration NUMBER BY NUMBER against all of them, instead of against the support set of one condensed line - a negative about the room has to be proved on the room. 202-MEP/mech_ptac now reads \"...and this room's own rows corroborate it NUMBER BY NUMBER: keynote 1 <- ITM-0010\", which is the row the database always had. The same change corrected 238-MEP/elec_sink_sw, which now attributes keynote 14 to ITM-0016 and keynote 15 to ITM-0007 rather than both to ITM-0016, and where only some numbers are corroborated the line now names the ones that are not.",
  },
  {
    room: "238",
    sev: null,
    state: "CLOSED BY THIS REBUILD",
    owner: null,
    text: "research/ref-rooms/mockbook.html -- STALE: the rendered deliverable was never regenerated after the fix round. The on-disk file is byte-identical to the round-1 commit e06dfd0 (md5 de0b993720455f3f33d246d2d61c8323, 524,123 bytes), while a fresh, deterministic run of research/ref-rooms/build_mockbook.mjs against the current platform/data/ref-rooms-staged.json produces md5 77bbfa24ffb4a30b98e250e2b07eeb09 (694.6 KB, identical across two runs). The published page contains ZERO occurrences of \"OPEN DOCUMENT CONFLICT\" (the entire conflicts-table carriage - B3.1/B4.2/B4.5 on 905_a, gr300_a, gr308_a, gr318_a, gr322_a, gr323_a, plmb_ksink_a, and note n_conflicts) and zero occurrences of \"ROOM 238 IS ON FLOOR 2\" (the fp_heads_a floor-1 citation fix). Every fix-round change to room 238 is invisible in the artifact Austin is asked to approve.",
    how: "Closed by this rebuild. research/ref-rooms/mockbook.html has been re-rendered from the current platform/data/ref-rooms-staged.json - which the round-3 fix rebuilt and re-carried - and research/ref-rooms/mockbook.data.mjs has been rewritten so that every round-2 finding it hand-carries prints at its CURRENT state rather than as a live defect. The finding is left here word for word so the record shows it was raised and what answered it.",
  },
];

/* ROUND 3, the last independent check, printed exactly as it was returned, with
 * what the ROUND-4 FIX did about each finding beside it.
 *
 * A separate agent read the round-3 platform/data/ref-rooms-staged.json with no
 * knowledge of how it was assembled and FAILED ALL FOUR TYPES, with 25
 * findings. Every one of them is printed WORD FOR WORD below, including its own
 * bracketed head, and none is softened. `sev` is the severity or priority
 * marker the checker itself wrote; where it wrote none (the room-238 findings),
 * none is invented.
 *
 * `how` is the fixing side's account of the mechanism, and it is exactly that -
 * an account, not a verdict. Every one of them is checkable against
 * platform/tools/build_ref_rooms.mjs and against the rebuilt seed. NOBODY
 * OUTSIDE THIS BUILD HAS RE-READ THE FILE, which is why the round-4 verdict
 * below is UNVERIFIED and not PASS. */
export const ROUND3 = [
  {
    room: "202",
    sev: "HIGH",
    state: "ADDRESSED BY THE ROUND-4 FIX · NOT RE-VERIFIED",
    text: "[HIGH] platform/data/ref-rooms-staged.json | doc 202-MEP | key mech_tstat | fields `reliability` + `instanceNote` -- the line contradicts itself. `reliability` = \"FLAGGED\", while its own instanceNote states \"...data/project.sqlite feeds this condensed line from 3 row(s) of room 202 (ITM-0018 [HIGH], ITM-0059 [HIGH], ITM-0060 [HIGH]), and the line ships at the WORST of them, HIGH.\" All three support rows are HIGH in data/project.sqlite (verified directly), and no OPEN conflicts-table entry names any mark this line carries (code \"T\"; B3.1/B4.2/B4.5/B5.6/A11 name none of it), so priority-1's rule yields HIGH. Root cause in platform/tools/build_ref_rooms.mjs: the PTAC-repeat block (~line 3437) sets item.reliability='FLAGGED' BEFORE the worst-of-own-rows block (~line 3468), and that later block builds its sentence from the local `ownWorst` rather than the final `item.reliability`, so the sentence is emitted unconditionally and is now false. Either the reliability is wrong (must be HIGH per priority 1) or the sentence is wrong (must say the count conflict flagged it further, the way plmb_shower_a's conflict text correctly does: \"its own data/project.sqlite row(s) read HIGH, and the open conflict flags it further\"). As shipped, a reader is told two different things about the same field, and the mock book renders the contradiction (FLAGGED badge above a note claiming HIGH).",
    how: "Closed by the round-4 fix, at the cause. A NOTE NO LONGER RESTATES A VALUE ANOTHER FIELD CARRIES. The worst-of-own-rows block in build_ref_rooms.mjs used to end \"and the line ships at the WORST of them, HIGH\", built from the local ownWorst, so the PTAC-repeat block above it could lower the same line to FLAGGED and leave the sentence behind. The sentence now reads \"...each shown at its own reading, and a condensed line is never read better than the worst of them\" - it explains WHY and names every feeding row at its own reliability, and the reliability field alone says what the line ships. Every block that MOVES the reading still announces its own move. The same rewrite covers 217-MEP/mech_tstat and 217/905_a. platform/tools/assert_ref_claims.mjs now fails the build on any note that prints a reliability word for its own line.",
  },
  {
    room: "202",
    sev: "HIGH",
    state: "ADDRESSED BY THE ROUND-4 FIX · NOT RE-VERIFIED",
    text: "[HIGH] platform/data/ref-rooms-staged.json | doc 202 (FF&E) | note n_gategaps | field `text` -- the note states a negative its own document contradicts. It is headed \"ROWS THAT CANNOT CARRY A CHECKLIST LINE\" and lists, among the 7, \"GR-905 [FF&E - Misc, FLAGGED] ITM-0280\". But doc 202 DOES carry a checklist line for exactly that row: key gr905_a, category \"FF&E - Misc\", sort 22000, code \"GR-905\", reliability FLAGGED, carrying the crew's issue \"MISSING\" (meta.fieldState itself announces \"1 line(s) the category gate left with no home were REBUILT ... (202/gr905_a ...)\"). gr905_a's own note admits \"The row is also recorded in room note n_gategaps\", but n_gategaps was never amended to say the row now has a line, so the note and the line list disagree. The identical text on doc 202-MEP is true (no GR-905 line there); only the FF&E copy is false. Fix: the FF&E copy must except GR-905 from the \"cannot carry a line\" claim and point at gr905_a.",
    how: "Closed by the round-4 fix. The header is now a literal description of the list it heads: \"ROWS OUTSIDE AUSTIN'S CHECKLIST GATE THAT ARE FLAGGED, MEDIUM, OR STATE A DOCUMENT CONFLICT\", and the body says plainly that being listed here does not by itself decide whether a row also carries a checklist line - platform/tools/carry_ref_state.mjs REBUILDS a gated row as a line where the crew already holds field work on it, which is exactly what happened to 202/gr905_a. The note and the line no longer disagree. assert_ref_claims.mjs fails the build if the old header returns or if the header's row count stops matching the list.",
  },
  {
    room: "202",
    sev: "MEDIUM",
    state: "ADDRESSED BY THE ROUND-4 FIX · NOT RE-VERIFIED",
    text: "[MEDIUM] platform/data/ref-rooms-staged.json | doc 202-MEP | key fp_heads_a | field `code` -- the mark \"FP\" is carried from the LIVE room-104 line onto a room that has no row of that family. Room 202 has ZERO Fire Sprinkler / Fire Protection rows in data/project.sqlite (verified: its only fire rows are ITM-0078 and ITM-0319, both category \"Fire Alarm\", tag \"(S)SB\"), and no row anywhere in room_items or items carries tag 'FP' (count = 0). meta.donorRule is explicit: \"The MARK is the target room's too: where this room has no row of the donor's mark family the donor's mark is not carried at all.\" The tool correctly stripped the donor's qty 3 from this line for precisely this reason (`qty` is absent) and correctly stripped the donor's FP-1 citations, but left the donor's mark in the tag column, so the line still displays a mark this room cannot prove.",
    how: "Closed by the round-4 fix. fpNoCount() now strips the MARK as well as the count and the FP-series citation, for the same stated reason, and writes a MARK paragraph quoting the donor's mark as not carried. The line ships code \"\" on all four rooms. assert_ref_claims.mjs ties meta.donorRule's mark sentence to that field.",
  },
  {
    room: "202",
    sev: "MEDIUM",
    state: "ADDRESSED BY THE ROUND-4 FIX · NOT RE-VERIFIED",
    text: "[MEDIUM] platform/data/ref-rooms-staged.json | doc 202-MEP | all 25 keys, worst at key elec_gfci | field `instanceNote` -- meta.donorRule states, of BOTH documents, \"Every line carries a SOURCE sentence naming which document each part of it came from.\" Zero of the 25 lines in 202-MEP contains a SOURCE sentence (all 44 FF&E lines in doc 202 do). Most MEP lines at least carry a CITATION or \"THIS ROOM'S OWN ROWS GOVERN THIS LINE\" paragraph, but elec_gfci carries NOTHING: its instanceNote is the empty string while its entire `src` (\"A530 keyed note 13 (placed on view 03); G402 schedule general note 6; A530 keyed note 24; E400 Panel A/B bathroom-GFCI circuit + panel note 4; E101 spec #25 ... and #18; A530 general note D; G400 detail 02\") is LIVE room 104's text shipped verbatim at HIGH, of which only \"A530 kn13\" (ITM-0015) and \"A530 kn24\" (ITM-0014) are corroborated by room 202's own rows. plmb_showerhead_a is the same class (note is only \"Trim Delta T24859.\"). A crew member reading these lines has no way to tell which parts are room 202's and which are room 104's -- the exact laundering the donorRule exists to prevent.",
    how: "Closed by the round-4 fix. Every MEP line now carries a SOURCE sentence - the condensed lines, the own-row db_ lines and the ruled D27/D28/D29 lines each get their own wording - so all 295 lines in the package have one. 202-MEP/elec_gfci went from an EMPTY instanceNote to a bath-sheet paragraph plus a SOURCE sentence naming what came from LIVE room 104 and what came from room 202's own row. assertDocRules() now REFUSES to write a line with no SOURCE sentence, so the promise in meta.donorRule cannot quietly stop being true.",
  },
  {
    room: "217",
    sev: "PRIORITY 3+5 / HIGH",
    state: "ADDRESSED BY THE ROUND-4 FIX · NOT RE-VERIFIED",
    text: "PRIORITY 3+5 / HIGH - platform/data/ref-rooms-staged.json, doc 217-MEP, key mech_ptac, field instanceNote (and src): the line states a room-wide negative that data/project.sqlite contradicts. Verbatim: '1 citation segment(s) carried from LIVE room 104 point at a sheet that data/project.sqlite's own sheets table says covers a DIFFERENT floor, and no row of this room's own cites it, so it is NOT carried. Removed, quoted verbatim: \"M301 line 30\" [M301 = \"Mechanical First Floor Plan\"]'. Room 217 has THREE of its own rows citing M301: ITM-0062 source_sheet 'M401 KN6; M301', ITM-0067 'M401; M301 N3; M501 det.2', ITM-0070 'M201; M301-M304' (a range that also spans M302, this room's floor). Per meta.citationRule ('...is not carried unless this room's own row cites it') the segment should have been KEPT and reported as ownKept, not dropped and replaced with an UNVERIFIED M302. Cause: platform/tools/build_ref_rooms.mjs line ~3499 calls floorTrueCitation(item.src, roomFloor, mine, ...) passing `mine` - the support set of this one condensed line - so ownSrcs/ownOf never see ITM-0062/0067/0070. This is round-2 finding #3's exact defect class, recorded as closed: composeMepCitation was widened to walk allRows, floorTrueCitation was not.",
    how: "Closed by the round-4 fix, at the named cause. floorTrueCitation() is now handed EVERY row of the room, exactly as composeMepCitation() already was, and its per-segment precedence was reordered to the order its own header declares: KEPT (this room's own row names the sheet outright) beats RE-POINTED beats TRIMMED beats DROPPED. Room 217's ITM-0062, ITM-0067 and ITM-0070 cite M301, so the segment is KEPT and the line quotes the row's own citation verbatim. The false room-wide negative is gone from the sentence entirely.",
  },
  {
    room: "217",
    sev: "PRIORITY 3+5 / HIGH",
    state: "ADDRESSED BY THE ROUND-4 FIX · NOT RE-VERIFIED",
    text: "PRIORITY 3+5 / HIGH - platform/data/ref-rooms-staged.json, doc 217-MEP, key mech_tstat, field instanceNote (and src): same false room-wide negative. Verbatim: '...and no row of this room's own cites it, so it is NOT carried. Removed, quoted verbatim: \"M301 GN5\" [M301 = \"Mechanical First Floor Plan\"]'. Room 217's own rows ITM-0062, ITM-0067 and ITM-0070 all cite M301. Same cause (floorTrueCitation receives `mine`, not all rows).",
    how: "Closed by the same round-4 fix as the mech_ptac finding: floorTrueCitation() walks all of the room's rows and the own-row KEPT test runs before the range re-point, so \"M301 GN5\" stays and the line names ITM-0062, ITM-0067 and ITM-0070 as the rows that cite it.",
  },
  {
    room: "217",
    sev: "PRIORITY 3+5 / HIGH",
    state: "ADDRESSED BY THE ROUND-4 FIX · NOT RE-VERIFIED",
    text: "PRIORITY 3+5 / HIGH - platform/data/ref-rooms-staged.json, doc 217-MEP, key plmb_fd_a, field instanceNote (and src): same false room-wide negative, on P301. Verbatim: '...and no row of this room's own cites it, so it is NOT carried. Removed, quoted verbatim: \"P301 note 9 (floor drain 2\\\")\" [P301 = \"Sanitary Sewer First Floor Plan\"]'. Room 217's own rows ITM-0040 (source_sheet 'P402; P301'), ITM-0047 ('P301-P310 GN6; P501 det.12') and ITM-0723 ('P402; P301 note (tub 2\\\")') all cite P301 - and the tool itself uses ITM-0047's P301-P310 range to re-point plmb_trapguard_a on the very next line, proving the row is visible to the build. Same cause.",
    how: "Closed by the same round-4 fix. Room 217's ITM-0040 cites \"P402; P301\" outright, so \"P301 note 9 (floor drain 2\\\")\" is KEPT and reported as ownKept with the row's own citation quoted. plmb_trapguard_a's P301 is kept on the same test rather than re-pointed, so the two plumbing lines now treat the same sheet the same way.",
  },
  {
    room: "217",
    sev: "PRIORITY 1+5 / HIGH",
    state: "ADDRESSED BY THE ROUND-4 FIX · NOT RE-VERIFIED",
    text: "PRIORITY 1+5 / HIGH - platform/data/ref-rooms-staged.json, doc 217-MEP, key mech_tstat, field instanceNote vs field reliability: the note asserts a reliability the line does not ship. It reads 'data/project.sqlite feeds this condensed line from 3 row(s) of room 217 (ITM-0018 [HIGH], ITM-0059 [HIGH], ITM-0060 [HIGH]), and the line ships at the WORST of them, HIGH.' The item's reliability field is FLAGGED (lowered afterwards by the PTAC-2 COUNT CONFLICT rule, which does not say it flags the line). The audit sentence that exists to let Austin check the reliability is therefore false on its face. Cause: build_ref_rooms.mjs composes the worst-of-rows sentence at ~line 3483 and the PTAC repeat block at ~line 3436 sets reliability='FLAGGED' without amending it. Same fault on doc 202-MEP key mech_tstat.",
    how: "Closed by the round-4 note rewrite described against the 202-MEP finding: the audit sentence names the feeding rows at their own readings and no longer asserts what the line ships.",
  },
  {
    room: "217",
    sev: "PRIORITY 1+5 / MEDIUM",
    state: "ADDRESSED BY THE ROUND-4 FIX · NOT RE-VERIFIED",
    text: "PRIORITY 1+5 / MEDIUM - platform/data/ref-rooms-staged.json, doc 217, key 905_a, field instanceNote vs field reliability: the note's closing reliability sentence reads 'The reliability on this line is the WORST of THIS room's own data/project.sqlite row(s), each at its own reading: ITM-0347 [MEDIUM], ITM-0082 [HIGH]. They do not agree, so the line ships the worst of them, MEDIUM'. The item ships reliability FLAGGED (raised to FLAGGED by the B4.2 conflict carry earlier in the same note). Both the claim 'the reliability on this line is the WORST of THIS room's own row(s)' and 'ships ... MEDIUM' are false for the line as shipped.",
    how: "Closed by the round-4 note rewrite. The FF&E RELIABILITY paragraph now reads \"This line is read no better than the worst of THIS room's own data/project.sqlite row(s), each shown at its own reading: ITM-0347 [MEDIUM], ITM-0082 [HIGH]. They do not agree, and a fold is only as well read as its weakest row.\" It states the evidence and not the field, so the B4.2 conflict carry that raises the line to FLAGGED cannot contradict it.",
  },
  {
    room: "217",
    sev: "PRIORITY 3+5 / MEDIUM",
    state: "ADDRESSED BY THE ROUND-4 FIX · NOT RE-VERIFIED",
    text: "PRIORITY 3+5 / MEDIUM - platform/data/ref-rooms-staged.json, doc 217-MEP, key lv_phone_db, field instanceNote (and src): the note denies a row it quotes in the same paragraph. It reads 'This room has no row of its own that places this line on a guestroom sheet, so the sheet is cited with no view or keynote number at all.' This line's OWN support row ITM-0031 (tag DB, doorbell) has source_sheet 'A55x kn28; A550 P&S legend', which the tool's own resolveSheetWildcard renders as 'A554 kn28' - a guestroom-sheet placement with a keynote number - and the same note quotes it verbatim later as '[cited: A55x kn28; A550 P&S legend]'. That own-row reference is also absent from src, which carries only the re-pointed donor segment 'A554 tag 905'. Cause: composeMepCitation sets ownUsed only when the re-pointed donor segment reduces to exactly roomSheet; here it reduces to 'A554 tag 905', so the non-empty ownArch built from ITM-0031 is discarded and the 'no row of its own' branch prints.",
    how: "Closed by the round-4 fix. composeMepCitation() no longer requires the re-pointed donor segment to reduce to exactly the bare sheet name before it will use this room's own rows: wherever the sift leaves no numbered guestroom reference and the room's own A55-series rows do have one, those rows supply the citation and are named. 217-MEP/lv_phone_db now cites \"A554 kn28\" from ITM-0031 and says \"This room's own row(s) ITM-0028, ITM-0031 supply the A554 reference instead\". The room-wide negative it used to print is gone.",
  },
  {
    room: "217",
    sev: "PRIORITY 3 / MEDIUM",
    state: "ADDRESSED BY THE ROUND-4 FIX · NOT RE-VERIFIED",
    text: "PRIORITY 3 / MEDIUM - platform/data/ref-rooms-staged.json, doc 217, field src on 12 lines: the FF&E citation is the raw room_items.primary_sheet of a common-core row, which names a sheet that data/project.sqlite's sheets table says does not draw this room's type. Ten lines cite bare 'A550' = 'Enl. Guest Room Plans & Elevs - King Std. & King Std. Conn.' (901_a, 902_a, 904_a, gr318_a, gr100_a, gr101_a, gr200_a, gr201_a, gr205_a, gr500_a) and two cite bare 'A530' = 'Enl. Bathroom - King Std., Std. Conn., QQ Std., Std. Conn., QQ Wide & QQ Ext.' (hd16_a, gr203_a). Room 217 is King One Bedroom Acc.: room_types.room_sheet = A554, bath_sheet = A533. Nine of these rows carry the true reference for THIS room in their own source_sheet and it is discarded: ITM-0084/0086/0085/0087/0088/0089/0091 all list 'A554:58', ITM-0090 lists 'A554:51' and 'A533', ITM-0092 lists 'A533:44'. The MEP document re-points exactly this class of donor/foreign-sheet citation onto A554; the FF&E document does not, and no line or note discloses it. On LIVE room 104 the same recipe is correct because A550 IS room 104's sheet, so the falsehood is introduced by re-using the recipe on a new type.",
    how: "Closed by the round-4 fix. A new pass, ffeTypeCitation(), asks of every FF&E citation the question floorTrueCitation() asks of a floor: does data/project.sqlite's sheets table say this enlargement sheet draws THIS room type? Where the row's own source_sheet carries the entry for this type, the line cites that fuller citation instead of the bare primary_sheet - 217/gr318_a now cites \"A550:60; A551:52; A553:55; A554:58; A555:70; A556:56\" and the note names \"A554:58\" as the entry that covers this room. Where neither names this type's sheet, the citation stands and the line says which sheet room_types gives this type, marked UNVERIFIED. Nothing is deleted: reduceFFE() is byte-copied from build_floor1.mjs and was not touched.",
  },
  {
    room: "217",
    sev: "PRIORITY 3 / MEDIUM",
    state: "ADDRESSED BY THE ROUND-4 FIX · NOT RE-VERIFIED",
    text: "PRIORITY 3 / MEDIUM - platform/data/ref-rooms-staged.json, doc 217-MEP, field src on keys elec_gfci, plmb_wc_a, plmb_showerhead_a, plmb_fd_a: donor bath-sheet PLACEMENTS on A530 are carried onto a room whose bath is drawn on A533, with no re-point and no warning. Verbatim: elec_gfci 'A530 keyed note 13 (placed on view 03)' and 'A530 keyed note 24'; plmb_wc_a 'A530 keyed note 19 (placed on plan 01)'; plmb_showerhead_a 'A530 keyed note 9 (placed on plan 01 and elevation 05)'; plmb_fd_a 'A530 keyed note 20 (placed on plan 01, standard guest bath)'. data/project.sqlite room_types.bath_sheet for 'King One Bedroom Acc.' is A533, and A533's own view numbering is different (room 217's rows cite A533:37, A533:44, A533:50, A533:93, elev 03, views 02/05, el.04), so a plan-01/view-03/elevation-05 placement is not transferable. plmb_shower_a and plmb_shencl_a DO carry the sentence 'This room type's bath is drawn on A533 ... confirm it on A533' - these four do not, and elec_gfci ships with an entirely empty instanceNote. The build applies a bath-sheet check only inside bathingUnresolvedLine().",
    how: "Closed by the round-4 fix. A new pass, bathTrueCitation(), reads the sheets table for the room types each BATHROOM enlargement draws. A plan, view, elevation or keyed-note number read on another type's bath sheet is the donor room's reading of the donor room's own bath drawing: it is dropped, quoted verbatim as removed, and replaced by room_types.bath_sheet for THIS type cited with NO number on it and marked UNVERIFIED. A citation that carries no placement number, or that sits inside a range covering this type's own bath sheet, stays and says so. elec_gfci, plmb_wc_a, plmb_showerhead_a and plmb_fd_a now carry that paragraph on 202, 217 and 238; room 230's bath IS A530, so nothing there moves.",
  },
  {
    room: "217",
    sev: "PRIORITY 3 / LOW-MEDIUM",
    state: "ADDRESSED BY THE ROUND-4 FIX · NOT RE-VERIFIED",
    text: "PRIORITY 3 / LOW-MEDIUM - platform/data/ref-rooms-staged.json, doc 217-MEP, key elec_panel, field src: the donor's calculation-row numbers are asserted for this room with no corroboration and no disclaimer. src carries 'E103 rows 14 and 15'. No row of room 217 cites E103 with those row numbers: ITM-0002 cites 'E400; E103; E101 #12/#13' (no row number) and this room's own accessible-key rows ITM-0388 and ITM-0390 cite 'E103 rows 4/5/8/9/11'. meta.citationRule promises that an uncorroborated donor number is called out on the line ('citing the same sheet ... is not evidence and the line says so instead'); elec_panel's instanceNote says nothing about it, because the number-by-number corroboration in composeMepCitation is applied only to A55-series segments.",
    how: "Closed by the round-4 fix, by disclosure on the line rather than by a number nobody can prove. Every MEP line's new SOURCE sentence states that view, keynote, note and row numbers on sheets OUTSIDE the guestroom-and-bathroom set are the approved line's and are NOT re-proved for this room - read them on the sheet before relying on them. 217-MEP/elec_panel carries it, so \"E103 rows 14 and 15\" is no longer an unlabelled assertion. meta.citationRule was rewritten to say exactly that, and assert_ref_claims.mjs holds it to it.",
  },
  {
    room: "230",
    sev: "CONFIRMED · priority 1",
    state: "ADDRESSED BY THE ROUND-4 FIX · NOT RE-VERIFIED",
    text: "[CONFIRMED · priority 1] platform/data/ref-rooms-staged.json › docs[\"230-MEP\"].items.plmb_shower_a.instanceNote — source conflict text LOST. This line's only supporting sqlite row for room 230 is ITM-0545 (mapped by product-identity, per the generator's own report). That row's note reads verbatim: \"DUAL MARK CARRY - P401/P402 print SH-1, P104 schedules SH-4; P104's own SH-1 is the 36x36 employee shower. A530: the standard guest bath is a SHOWER, not a tub\". It appears NOWHERE in doc 230 or 230-MEP (0 hits for \"DUAL MARK CARRY\", \"36x36 employee shower\", \"ITM-0545\"). The line carries no \"THIS ROOM'S OWN ROWS GOVERN THIS LINE\" block at all, so the reader is never told which row of room 230 feeds it. meta.donorRule promises \"every one of those rows that is not HIGH, OR WHOSE OWN NOTE STATES A DOCUMENT CONFLICT, is quoted on the line verbatim\", and the tool's own second test (n_gategaps: \"two sheet numbers set against each other in one sentence\") is satisfied by \"P401/P402 print SH-1, P104 schedules SH-4\". Root cause: SHEET_VS_SHEET_RE at platform/tools/build_ref_rooms.mjs:2412 requires a connective (vs|versus|while|against|but) which this note does not use, and CONFLICT_IN_NOTE_RE (:2403) has no matching vocabulary — so rowStatesConflict() returns false and `speaks` is empty. (Reliability itself is correct: FLAGGED, driven by conflict B3.1.)",
    how: "Closed by the round-4 fix, at the named cause. CONFLICT_WORDS - the vocabulary rowStatesConflict() matches on - gained the database's own phrase for this exact situation, \"DUAL MARK CARRY\", plus \"supersede\" (which catches both \"superseded\" and \"supersedes\"), \"no source states\" and \"no source assigns\". ITM-0545's note is now quoted verbatim on the line, employee shower and all. SHEET_VS_SHEET_RE was deliberately NOT widened to a bare comma: that would read every note listing two sheet numbers as a conflict, and the row is caught on the database's own words instead.",
  },
  {
    room: "230",
    sev: "CONFIRMED · priority 1",
    state: "ADDRESSED BY THE ROUND-4 FIX · NOT RE-VERIFIED",
    text: "[CONFIRMED · priority 1] platform/data/ref-rooms-staged.json › docs[\"230-MEP\"].items.plmb_lavfaucet_a.instanceNote — source conflict text LOST, and the note affirmatively misleads. The block names ITM-0043 [HIGH] as one of the 3 feeding rows, then states \"Row(s) that are not HIGH, or whose own note states a document conflict, carried verbatim and NOT resolved: ITM-0045 ...\" — implying ITM-0043 has nothing to say. ITM-0043's own note in data/project.sqlite reads verbatim: \"DUAL MARK CARRY - P401/P402 print L-2, P104 schedules L-3/L-4; P104's own L-2 is the employee/pool wall-hung lav\". That text appears nowhere in either doc (0 hits for \"employee/pool wall-hung\"). Same root cause as the plmb_shower_a defect (SHEET_VS_SHEET_RE / CONFLICT_IN_NOTE_RE under-match). The fact that P104's own L-2 is a different fixture — the employee/pool wall-hung lav — is material to the open B3.1 mark question and is not recoverable anywhere in the package.",
    how: "Closed by the same vocabulary fix. ITM-0043's \"DUAL MARK CARRY - P401/P402 print L-2, P104 schedules L-3/L-4; P104's own L-2 is the employee/pool wall-hung lav\" is now quoted on the line on 230-MEP and 238-MEP, so the fact that P104's own L-2 is a different fixture is in the package where the B3.1 mark question is.",
  },
  {
    room: "230",
    sev: "CONFIRMED · priority 5, completeness of a room-scoped claim",
    state: "ADDRESSED BY THE ROUND-4 FIX · NOT RE-VERIFIED",
    text: "[CONFIRMED · priority 5, completeness of a room-scoped claim] platform/data/ref-rooms-staged.json › docs[\"230\"].notes.n_gategaps.text (and the identical copy on docs[\"230-MEP\"].notes.n_gategaps.text) — the note claims to list every gated-out row of this room that \"state[s] a DOCUMENT CONFLICT in their own note at any reliability\", and states the count as 8 rows / 7 stating a conflict. It omits ITM-0095 [Flooring, tag T-01, HIGH], whose own note reads verbatim: \"RK supersedes the finish schedule area text to include 'Guest Suite Bathroom'\" — a document supersession between the RK ID set and the finish schedule. The note's own declared vocabulary list includes \"superseded\"; CONFLICT_IN_NOTE_RE (build_ref_rooms.mjs:2403) matches \"superseded\" but not the DB's actual word \"supersedes\", so the row is dropped. I re-ran the tool's exact two regexes over all 31 gated rows of room 230: ITM-0095 is the ONLY additional row a reader would call a document conflict, so the fix is one row, and the stated counts (8 / 7) become 9 / 8.",
    how: "Closed by the round-4 fix. \"supersede\" replaced \"superseded\" in CONFLICT_WORDS, so ITM-0095 (\"RK supersedes the finish schedule area text to include 'Guest Suite Bathroom'\") is caught on all four rooms; room 230's note now reads 9 rows, 8 of them stating a conflict. The note also prints the vocabulary FROM the matcher's own list rather than from a hand-kept copy, so the advertised words and the matched words cannot drift apart again.",
  },
  {
    room: "230",
    sev: "LOWER CONFIDENCE · priority 4",
    state: "ADDRESSED BY THE ROUND-4 FIX · NOT RE-VERIFIED",
    text: "[LOWER CONFIDENCE · priority 4] platform/data/ref-rooms-staged.json › docs[\"230-MEP\"].items.fp_heads_a.code = \"FP\" — room 230 has ZERO Fire Sprinkler rows in data/project.sqlite (the line's own instanceNote says so: \"Room 230 is on FLOOR 2 and has NO Fire Sprinkler row of its own in data/project.sqlite\"), and no row of room 230 carries the tag \"FP\". meta.donorRule states \"The MARK is the target room's too: where this room has no row of the donor's mark family the donor's mark is not carried at all.\" The mark is carried anyway. Mitigations: \"FP\" is a curated D10 line code rather than a mark read off a drawing (donor room 105's sprinkler rows ITM-0447/0448/0449 are also untagged), the line ships MEDIUM with no qty, and everything else on it is correctly emptied and explained. Same class: elec_gfci.code = \"GFCI\", which is also not a tag on any room-230 row — but room 230 does carry GFCI rows (ITM-0005, ITM-0015), so that one is descriptively true.",
    how: "Closed by the round-4 fix - the same mark strip applied for the 202 finding. fp_heads_a ships with no mark, no quantity and PH-GU-001 quoted, on all four rooms.",
  },
  {
    room: "230",
    sev: "LOWER CONFIDENCE · priority 5",
    state: "ADDRESSED BY THE ROUND-4 FIX · NOT RE-VERIFIED",
    text: "[LOWER CONFIDENCE · priority 5] platform/data/ref-rooms-staged.json › docs[\"230\"].items.gr308_a.instanceNote — the closing sentence asserts \"LIVE room 105 has no line for tag GR-308, so nothing here was borrowed from another room type.\" platform/data/floor1-staged.json docs[\"105\"].items.gr308_a exists; it is a tombstone (deleted:true, \"SUPERSEDED on 2026-08-20\", retired by ruling D22). The generator's own report says \"1 RETIRED donor line(s) skipped - a tombstone is not a source\", so the intent is \"no LIVE (non-retired) line\", but as written the sentence is a negative about the approved floor-1 build that the approved floor-1 build contradicts, and it sits in the same package as note n_d22, which is entirely about the fact that room 105 DID carry GR-308. Suggested fix: qualify it (\"no live line — 105's gr308_a is a D22 tombstone, and a tombstone is not a source\").",
    how: "Closed by the round-4 fix, by deleting the claim rather than by qualifying it. The SOURCE sentence on a sqlite-only FF&E line now states positively what the line is built from - \"Every field on this line ... is data/project.sqlite room 230's own row(s) ITM-0501, verbatim, at the database's own reliability\" - and adds that the donor index this build reads is LIVE lines only and a retired tombstone is not a source. The negative about the approved floor-1 build is gone.",
  },
  {
    room: "238",
    sev: null,
    state: "ADDRESSED BY THE ROUND-4 FIX · NOT RE-VERIFIED",
    text: "238-MEP | key plmb_shencl_a | field src -- ships \"A530 keyed note 28 (elevation 04) and keyed note 27 (plan 01); A556\". FALSE FOR THIS ROOM. sheets.A530 = \"Enl. Bathroom - King Std., Std. Conn., QQ Std., Std. Conn., QQ Wide & QQ Ext.\" - QQ Acc. is not drawn on it; room_types.bath_sheet for \"QQ Acc.\" = \"A532 / A532.1\". NO row of room 238 cites A530 kn27 or kn28 anywhere (its own enclosure rows are ITM-0716 [cited: A532 elev 02; A532.1 views 01, 02] and ITM-0717 [cited: A532.1 view 02 keyed note 11]). This is donor room 105's reading of room 105's own bath drawing, placement callouts included. Round 2 raised this exact finding (research/ref-rooms/mockbook.data.mjs, VERIFIER '238') and it is recorded as \"CLOSED BY THE ROUND-3 FIX\", but the fix only changed the `code` field (kn 28 / kn 5 -> kn 10 / kn 11); `src` is untouched. The instanceNote's caveat says \"any bath-sheet keynote carried in the citation above is room 105's reading\" - \"above\" is the row citations quoted inside the MARK block, not the src field - and build_ref_rooms.mjs has no bath-sheet equivalent of floorTrueCitation() (bathSheet is used only for that one sentence in bathingUnresolvedLine(), line 2266).",
    how: "Closed by the round-4 bath-sheet pass described against the 217 finding. \"A530 keyed note 28 (elevation 04) and keyed note 27 (plan 01)\" is removed and quoted verbatim as removed; the line now cites \"A556; A532 / A532.1 (... NO plan, view, elevation or keyed-note number is asserted on it ... UNVERIFIED for this room type)\". This is the src field, which the round-3 fix left untouched.",
  },
  {
    room: "238",
    sev: null,
    state: "ADDRESSED BY THE ROUND-4 FIX · NOT RE-VERIFIED",
    text: "238-MEP | key plmb_shower_a | field src -- ships \"P401/P402 mark SH-1; P104 rows SH-3 and SH-4; A530 plan 01 dimensions and bathing configuration; A556 printed note 'NO FINISHES UNDER SHOWER'; A550/A555 keynote 26\". Two carried-donor residues on a room whose code was corrected: (a) \"A530 plan 01\" - A530 does not draw QQ Acc. (see above) and no room-238 row cites A530 plan 01; the room's own bathing row ITM-0715 cites A532 plan 01.1 / A532.1; (b) \"P104 rows SH-3 and SH-4\" keeps SH-4, which is donor room 105's half of the pair - room 238 holds NO SH-4 row anywhere and its own row ITM-0715 resolves the pair as \"SH-1 / SH-3\". Round 3 fixed the `code` (SH-1 / SH-4 -> SH-1 / SH-3) and left the citation asserting the donor's mark and the donor's bath-sheet view.",
    how: "Closed by the round-4 fix on both halves. (a) \"A530 plan 01 dimensions and bathing configuration\" is dropped by the bath-sheet pass and replaced by A532 / A532.1 with no number on it. (b) A new pass, citedMarkNote(), leaves \"P104 rows SH-3 and SH-4\" alone - P104 really does print both - and states beside it which marks of that family room 238's own rows carry: \"SH-1 (ITM-0715), SH-3 (ITM-0715)\". Nothing is deleted and nothing about this room is asserted off the donor's row.",
  },
  {
    room: "238",
    sev: null,
    state: "ADDRESSED BY THE ROUND-4 FIX · NOT RE-VERIFIED",
    text: "238-MEP | key plmb_lavfaucet_a | field instanceNote -- source conflict text LOST. Support row ITM-0043 [HIGH], tag \"L-2 / L-3 / L-4\", carries the data/project.sqlite note \"DUAL MARK CARRY - P401/P402 print L-2, P104 schedules L-3/L-4; P104's own L-2 is the employee/pool wall-hung lav\". That is a document disagreement stated on this room's own row, and it is quoted nowhere in doc 238 or 238-MEP (searched: 'DUAL MARK CARRY' and 'employee/pool' both absent). The line names ITM-0043 only in its roster list. Cause: rowStatesConflict() (build_ref_rooms.mjs line 2414) - CONFLICT_IN_NOTE_RE matches none of the words in the note, and SHEET_VS_SHEET_RE requires vs|versus|while|against|but between the two sheet numbers while this note uses a comma. The consequence is that the one fact explaining WHY the P401/P402 L-2 mark is ambiguous (P104's own L-2 is a different, employee/pool fixture) is not in the package at all; B3.1's quoted positions do not contain it.",
    how: "Closed by the same CONFLICT_WORDS fix as the 230 finding: \"DUAL MARK CARRY\" now matches, and ITM-0043's note is quoted verbatim on 238-MEP/plmb_lavfaucet_a.",
  },
  {
    room: "238",
    sev: null,
    state: "ADDRESSED BY THE ROUND-4 FIX · NOT RE-VERIFIED",
    text: "238 and 238-MEP | note n_gategaps | count and body -- ITM-0095 [Flooring, HIGH, tag T-01] \"Floor tile, bathroom\", note verbatim \"RK supersedes the finish schedule area text to include 'Guest Suite Bathroom'\", is a gated-out row stating a document conflict (RK area statement against the finish schedule) and is NOT listed; the note therefore says \"8 row(s)\" when 9 qualify by its own stated test. The note itself advertises \"superseded\" as part of the vocabulary; CONFLICT_IN_NOTE_RE matches \"superseded\" but not \"supersedes\", so the row falls through. The same word form is what carries ITM-0009 (\"superseded on the 7 accessible keys by the 700 VA + 300 VA split\") onto 238-MEP/elec_panel, so the treatment is inconsistent within the same document. Text absent from both docs (searched 'RK supersedes').",
    how: "Closed by the same \"supersede\" fix. Room 238's note now lists ITM-0095 and reads 9 rows.",
  },
  {
    room: "238",
    sev: null,
    state: "ADDRESSED BY THE ROUND-4 FIX · NOT RE-VERIFIED",
    text: "238-MEP | key plmb_hotcold_a | field src -- the D27 ruled line ships \"D27 (AJ 2026-08-21); P202 HWS distribution\". P305 (\"Domestic Water & Gas First Floor Plan\") was DROPPED from the cited list and nothing was put in its place, so this floor-2 line now cites no domestic-water floor plan at all. Every other floor-wrong sheet in this document is RE-POINTED to the sibling that covers floor 2 with an UNVERIFIED marker (mech_ptac and mech_tstat: M301 -> M302; plmb_fd_a: P301 -> P302; plmb_trapguard_a: P301 -> P302), and P306 = \"Domestic Water Second Floor Plan\" exists in the sheets table. Room 238's OWN row ITM-0036 cites the pair \"P305/P306 keynote 3\", which is the same own-row range evidence that made plmb_trapguard_a re-point rather than trim - and meta.citationRule says a floor-wrong sheet stays \"unless this room's own row cites it\". Cause: floorTrueCitation() is passed only the line's support rows (`mine`, build_ref_rooms.mjs line 3491), which is empty for a RULED_LINE_ADDITION, so neither the own-row exception nor the sibling re-point can fire.",
    how: "Closed by the round-4 fix, at the named cause. floorTrueCitation() is handed every row of the room, so the D27 ruled line - which has no support rows of its own - is now judged against ITM-0036's \"P305/P306 keynote 3\". P305 is KEPT on the own-row test, the line quotes that row's citation verbatim, and the trim that used to silently drop it runs only after the own-row and range tests have both failed.",
  },
  {
    room: "238",
    sev: null,
    state: "ADDRESSED BY THE ROUND-4 FIX · NOT RE-VERIFIED",
    text: "238-MEP | key elec_lights | field instanceNote -- support row ITM-0024 [HIGH, tag WS03] \"Wall sconce, guestroom vanity - Arkansas Lighting 3550V LED\", note verbatim \"may be the same physical device as FF&E GR-203 Vanity Sconce; no source states the equivalence, both carried\", is not quoted on the line, and elec_lights' own text explicitly claims to cover \"the vanity sconce\". The mirror-image warning IS carried on 238/gr203_a (from ITM-0090), so the two documents disagree about whether the crew is told this line and the FF&E line may be the same fixture. Cause: rowStatesConflict() - the vocabulary has \"no source settles\" and \"not stated\" but not \"no source states\".",
    how: "Closed by the round-4 vocabulary fix. \"no source states\" is in CONFLICT_WORDS, so ITM-0024's warning - \"may be the same physical device as FF&E GR-203 Vanity Sconce; no source states the equivalence, both carried\" - is now quoted on 238-MEP/elec_lights, and the two documents say the same thing about the vanity sconce.",
  },
  {
    room: "238",
    sev: null,
    state: "ADDRESSED BY THE ROUND-4 FIX · NOT RE-VERIFIED",
    text: "meta.conflictPolicy vs 238-MEP keys db_itm0712, db_itm0714, db_itm0715, db_itm0716, db_itm0717 and 238 keys hd05_a, hd14_a, hd51_a | field instanceNote -- the stated policy is that an entry rides on THREE tests (a mark this room carries, a room key of this type, or a citation of the entry by id in one of this room's own rows) and that \"Every match lands on the line, FLAGGED, and in room note n_conflicts\". A11 and B4.4 match room 238 ONLY through the third test (rows ITM-0712 through ITM-0720 cite \"conflicts.md A11 / B4.4\" by id) and the entry blocks - \"OPEN DOCUMENT CONFLICT A11/B4.4 ... Topic, verbatim ... Positions, verbatim ...\" - ride on NO line; those eight lines carry only the row's own quoted note. conflictsOnMarks() (line 2541) filters on h.marks only, so a hit with rows but no marks can never reach a line. B4.4's positions text (\"STILL OPEN: whether 438 is a CONNECTOR ... Do not order the 438 bath package.\") appears only in n_conflicts, not on the bathing lines it was matched through.",
    how: "Closed by the round-4 fix. conflictsOnMarks() filtered on h.marks only, so an entry matched through the THIRD test could reach room note n_conflicts and nothing else. conflictsOnLine() now also matches an entry that one of the rows BEHIND a line cites by id, and conflictOnLineText() says which test caught it. A11 and B4.4 now ride on 238-MEP/db_itm0712, db_itm0714, db_itm0715, db_itm0716, db_itm0717 and on 238/hd05_a, hd14_a, hd51_a - eight lines, all FLAGGED, carrying B4.4's own \"Do not order the 438 bath package\". A ROOM KEY match still rides in the note and on no line, and meta.conflictPolicy now says exactly that, because a key is a fact about the room and not about any one item.",
  },
]

/* ROUND 4 RAN, IT READ THIS SEED, AND IT FAILED ALL FOUR TYPES.
 *
 * A checker with no knowledge of how this package was assembled read the
 * rebuilt platform/data/ref-rooms-staged.json - the same file this page renders
 * - and returned FAIL on 202, 217, 230 and 238 with ten findings: three, two,
 * three and two. Every one of them is printed below WORD FOR WORD.
 *
 * NONE OF THEM IS FIXED, and none is marked closed, answered or softened. The
 * round-3 loop ended here by design (see the round-3 checkpoint: "round 4 is
 * the last round ... if round 4 still fails, the loop stops and Austin gets the
 * book with the honest verdict trail"). This is that book.
 *
 * The checker wrote no severity or priority marker on any of the ten, so `sev`
 * is null on all ten and none is invented - the same rule ROUND3 states.
 *
 * Trajectory, from the checkpoint commits: 21 findings in round 1, 26 in round
 * 2, 25 in round 3, 10 now. See ROUND_RAISED below for what those numbers are
 * and are not. */
export const VERIFIER = {
  "202": {
    verdict: "FAIL",
    round: 4,
    pending: false,
    priorRound: 3,
    priorVerdict: "FAIL",
    priorFindings: 4,
    defects: [
      { state: "OPEN", sev: null, text: "doc 202-MEP | key plmb_shencl_a | fields instanceNote + src -- the citation note asserts a reference the line does not carry. Verbatim: \"This room's own row(s) ITM-0311 supply the A553 reference instead, and that reference is on this line above.\" The src reads \"A550/A555 kn5; A531 (... NO plan, view, elevation or keyed-note number is asserted on it ... UNVERIFIED for this room type)\" -- there is no A553 reference anywhere on the line (verified: /A553/ does not match src). What ITM-0311 actually supplies is its own citation \"A530 kn28; A550/A555 kn5\", i.e. keynote 5 on the King Studio and QQ guestroom sheets, neither of which draws room 202 (sheets.A550 = \"Enl. Guest Room Plans & Elevs - King Std. & King Std. Conn.\", A555 = QQ; room_types.room_sheet for \"King One Bedroom\" = A553). The same sentence therefore contradicts its own preceding clause, which says \"keynote 5 [is] NOT carried onto A553\", and then tells the reader an A553 reference is on the line. Cause: build_ref_rooms.mjs composeMepCitation() line ~1356 builds the ownUsed sentence as \"supply the \" + roomSheet + \" reference instead, and that reference is on this line above\" without testing that any pushed ownArch segment actually names roomSheet; ownArch here holds only the BOTH-sheet segment \"A550/A555 kn5\". This is the only one of the 5 ownUsed sentences in the package where the claim is false (202-MEP/lv_phone_db, 217-MEP/lv_phone_db, 238-MEP/elec_outlets, 238-MEP/lv_phone_db all do carry their room sheet)." },
      { state: "OPEN", sev: null, text: "doc 202-MEP | key mech_tstat | field instanceNote (against field qty) -- the note's stated derivation of the quantity disagrees with the quantity field on the same line, which is exactly what meta.donorRule promises cannot happen (\"A NOTE NEVER RESTATES A VALUE ANOTHER FIELD CARRIES: it says why a reading is what it is, and the reliability and qty fields say what it is, so the two cannot disagree\"). Verbatim: \"This line is fed by ITM-0059 (\\\"PTAC 1\\\"), ITM-0060 (\\\"PTAC 1\\\") - the database transcribes that member ONCE, for PTAC 1 only. The quantity here is therefore the transcribed row count and is NOT doubled\". The line names TWO transcribed rows (ITM-0059 energy-management wall controller, ITM-0060 thermostat -- two different sub-assembly members, not one) and ships qty 1; its own SOURCE sentence names three feeding rows (ITM-0018, ITM-0059, ITM-0060). \"The transcribed row count\" is 2 (or 3), the field reads 1, and a reader checking the arithmetic printed on the line cannot make it come out. The identical sentence on 202-MEP/mech_grille_rm is true because that line is fed by exactly one member row (ITM-0053, qty 1); the template is only false where more than one member feeds the line. Cause: build_ref_rooms.mjs PTAC-repeat block (~line 3894) prints one fixed sentence regardless of how many member rows it just listed." },
      { state: "OPEN", sev: null, text: "doc 202-MEP | keys mech_ptac, mech_tstat, plmb_fd_a, plmb_trapguard_a, plmb_hotcold_a | field instanceNote -- the FLOOR-keep sentence attributes ONE row's citation string to two or three rows as their verbatim words, and offers as evidence rows the keep rule itself excludes. mech_ptac and mech_tstat: \"(this room's own row(s) ITM-0062, ITM-0067, ITM-0070 cite it, verbatim: \\\"M401 KN6; M301\\\")\" -- only ITM-0062 writes that string; ITM-0067 writes \"M401; M301 N3; M501 det.2\" and ITM-0070 writes \"M201; M301-M304\". plmb_fd_a and plmb_trapguard_a: \"(... ITM-0040, ITM-0047 cite it, verbatim: \\\"P402; P301\\\")\" -- ITM-0047 writes \"P301-P310 GN6; P501 det.12\". plmb_hotcold_a: \"(... ITM-0036, ITM-0047 cite it, verbatim: \\\"P305/P306 keynote 3\\\")\" -- ITM-0047 again writes \"P301-P310 GN6; P501 det.12\" and never writes P305 at all outside that range. Compounding it, the branch this sentence justifies is the one whose own code comment and meta.citationRule wording are \"this room's own row names that sheet outright - not inside a range\" (named0 is computed over stripRanges(ownSrcs)), yet the row list printed as its evidence is built by ownOf()/citesSheet() WITHOUT stripping ranges, so ITM-0070 (M301 only inside \"M301-M304\") and ITM-0047 (P301/P305 only inside \"P301-P310\") are advertised as proving a test they do not pass. A reader who opens ITM-0047 or ITM-0070 to check the quoted \"verbatim\" citation finds different words." },
    ],
  },
  "217": {
    verdict: "FAIL",
    round: 4,
    pending: false,
    priorRound: 3,
    priorVerdict: "FAIL",
    priorFindings: 9,
    defects: [
      { state: "OPEN", sev: null, text: "doc meta / field `citationRule` (pass 1) + doc `217-MEP`, field `instanceNote` on keys elec_lights, elec_outlets, elec_panel, elec_sink_sw, lv_phone_db, lv_tvdata, lv_wap, mech_grille_bath, mech_tstat — META CLAIM THE CODE DOES NOT IMPLEMENT. meta.citationRule promises: \"what survives is then corroborated NUMBER BY NUMBER against EVERY row of this room; a number that walk matches is named with the row(s) that match it, and a number it does not reach is labelled UNVERIFIED for this room rather than asserted.\" In build_ref_rooms.mjs, composeMepCitation() gates the entire corroboration/UNVERIFIED block behind `if (removed.length) { ... }` (line ~1296), so the walk is only run and reported on lines where at least one donor number was DROPPED. On these 9 donor-fed lines nothing was dropped, so their surviving donor numbers are asserted onto room 217's own sheet A554 with neither a naming row nor an UNVERIFIED label: elec_panel `src` = \"... A554 keynote 51\" (corroborating row ITM-0001 \"A55x kn51\" never named), mech_grille_bath \"A554 keynote 19 view 02\" (ITM-0064 \"A55x KN19\" never named), mech_tstat \"A554 KN24\" (ITM-0018 \"A55x kn24\"), elec_lights \"A554 keynote 3\" (ITM-0014), elec_outlets \"A554 kn36; A554 kn25; A554 kn50\", elec_sink_sw \"A554 keynote 14 and keynote 15\", lv_wap \"A554 keynote 44\", lv_tvdata \"A554 keynote 47\", lv_phone_db \"A554 kn28\". Only mech_ptac carries the promised naming (\"keynote 1 <- ITM-0010\"). The numbers themselves are all DB-wildcard-proven, so this is a disclosure/rule violation, not a wrong citation." },
      { state: "OPEN", sev: null, text: "doc meta / field `mepSource` + doc `217-MEP` (no key — the rows reach no line) — CHECKABLE FALSEHOOD. meta.mepSource states \"rows no condensed line claims become their own lines and are never lost.\" Nine of room 217's own Plumbing rows are claimed by no condensed line, are emitted as no line, and (7 of the 9) are not named anywhere in either 217 document: ITM-0032 / ITM-0033 / ITM-0034 (gate valves at the CWS / HWS / HWR riser take-offs), ITM-0035 (domestic water branch set to unit), ITM-0036 (fixture runouts), ITM-0037 (sanitary sewer riser tie), ITM-0038 (vent riser), ITM-0040 (2\" SS waste branch), ITM-0041 (vent piping). They are dropped by the copied constant MEP_ROUGH_IN_ITEMS (build_ref_rooms.mjs:555-558), which marks them '<rough-in, deliberately not on the approved punch>'. That exclusion is never disclosed anywhere in the shipped seed (grep for \"rough-in\" in ref-rooms-staged.json returns only \"the rough-in consequence of BT-1\"), so the sentence's \"never lost\" is unqualified and untrue for those rows." },
    ],
  },
  "230": {
    verdict: "FAIL",
    round: 4,
    pending: false,
    priorRound: 3,
    priorVerdict: "FAIL",
    priorFindings: 5,
    defects: [
      { state: "OPEN", sev: null, text: "meta.mepSource (field: meta.mepSource; affects doc 230-MEP) — CHECKABLE FALSEHOOD / meta claim the code does not implement. The field states: \"rows no condensed line claims become their own lines and are never lost.\" Room 230 has 22 Plumbing rows; nine of them (ITM-0032, ITM-0033, ITM-0034, ITM-0035, ITM-0036, ITM-0037, ITM-0038, ITM-0040, ITM-0041) are claimed by NO condensed line and are given NO line of their own. Seven of the nine (0032, 0033, 0034, 0035, 0037, 0038, 0041) appear nowhere at all in doc 230 or doc 230-MEP — not on a line, not in a room note; the other two (0036, 0040) surface only as citation-provenance inside FLOOR sentences on plmb_hotcold_a / plmb_fd_a / plmb_trapguard_a. The generator routes exactly these nine to a third, undisclosed bucket, `MEP_ROUGH_IN_ITEMS` at platform/tools/build_ref_rooms.mjs:555 (consumed at :3774), and the generator's own selftest counts four outcomes — \"condensed + own line(s) + rough-in + lost\" (build_ref_rooms.mjs:4505-4517) — while meta.mepSource admits only two. The scope itself is fine (D10 is the owner ruling), but the meta sentence asserts a completeness the code does not deliver, and the reader of the shipped document has no way to learn that nine of this room's own rows were dropped. meta.mepSource is also classed as META_DESCRIPTIVE in platform/tools/assert_ref_claims.mjs:262, so no check ever tests this claim." },
      { state: "OPEN", sev: null, text: "doc 230-MEP / key fp_smoke_a / fields src + instanceNote (rule: meta.citationRule) — the FLOOR pass made a decision and wrote nothing onto the line. meta.citationRule opens \"THE CITATION IS JUDGED IN FOUR PASSES, AND EVERY PASS WRITES ITS DECISION ONTO THE LINE\", and pass (2) says an off-floor sheet is KEPT \"where the citation is a range that already spans this floor\". fp_smoke_a's src carries \"E501-E504 + E400\"; data/project.sqlite's sheets table titles E501 = \"Fire Alarm First Floor Plan\" and E504 = \"Fire Alarm Fourth Floor Plan\", neither of which is room 230's floor. Both were kept on the range-span test, and the line's instanceNote contains no FLOOR sentence at all. Cause: floorTrueCitation() pushes the range-span result into `spanned` (build_ref_rooms.mjs:2002, :2015) and then never emits a bit for it — the note builder at :2081-:2132 handles dropped, repointed, trimmed, wide and ownKept only, and :2081 returns note:'' / changed:false because `spanned` is not in the early-return guard. The sibling pass bathTrueCitation() DOES print its equivalent range-span sentence (:2229-:2231), which shows the intent. Every other off-floor decision on this room is written onto its line (M301 on mech_ptac and mech_tstat, P301 on plmb_fd_a and plmb_trapguard_a, P305 on plmb_hotcold_a, A100 on plmb_wc_a, A120 on fp_heads_a); fp_smoke_a alone is silent." },
      { state: "OPEN", sev: null, text: "doc 230 / keys gr322_a, hd12_a, gr300_a, gr208_a, gr600_a, gr6001_a, gr602_a / field instanceNote (rule: meta.donorRule) — notes restate a value their own line's fields carry. meta.donorRule states: \"A NOTE NEVER RESTATES A VALUE ANOTHER FIELD CARRIES: it says why a reading is what it is, and the reliability and qty fields say what it is, so the two cannot disagree.\" gr322_a's instanceNote says \"The line therefore ships qty 3 on the ruling rather than on the 1 row(s) the drawing set tags\" beside a qty field reading 3. The six fold lines each open \"QTY 2 IS THIS ROOM'S OWN FOLD, not a donor count: ...\" beside a qty field reading 2 (hd12_a, gr300_a, gr208_a, gr600_a, gr6001_a, gr602_a) — and each already carries the non-restating sentence that does the work (\"The quantity on this line is that row count and nothing else\"), so the leading number is pure duplication of the field. The guard in platform/tools/assert_ref_claims.mjs:293 documents the ban in its own header (\":25\" — \"A note may not print a reliability word or a 'ships qty N' for its own line\") but implements it only as an agreement test (`if (q && Number(q[1]) !== Number(p.item.qty))`), so a restatement that happens to agree is never caught. Note the approved LIVE donor line (floor1-staged.json 105/gr322_a) states the D12 ruling with no qty restatement, so this wording is new to the ref-rooms build, not inherited house style." },
    ],
  },
  "238": {
    verdict: "FAIL",
    round: 4,
    pending: false,
    priorRound: 3,
    priorVerdict: "FAIL",
    priorFindings: 7,
    defects: [
      { state: "OPEN", sev: null, text: "doc platform/data/ref-rooms-staged.json | key docs/238/notes/n_type (identical text in docs/238-MEP/notes/n_type) | field text -- CHECKABLE FALSEHOOD. The note reads: \"closest built type with an approved package: Queen-Queen room 105 - the only other two-queen type that is built.\" Room 105 is NOT the only other built two-queen type. Floor 1 is LIVE (D24) and its approved slice (D5) also carries room 103, rooms.room_type 'QQ Connecting', and room 101, rooms.room_type 'QQ Wide Connecting' - both two-queen types, each shipping GR-300 Queen Headboard qty 2 and GR-600 Queen Mattress Set qty 2 in platform/data/floor1-staged.json (docs/101/items/gr300_a, docs/103/items/gr300_a). Three built two-queen types exist, not one. The room contradicts itself: docs/238/notes/n_d22 rests its whole argument on \"the 2 QQ connecting keys\" being built and reconciled on floor 1. Origin: platform/tools/build_ref_rooms.mjs, REP_ROOMS['238'].why (lines 315-316)." },
      { state: "OPEN", sev: null, text: "doc platform/data/ref-rooms-staged.json | key meta/donorRule (the rule this file states for docs/238 and docs/238-MEP) | field text -- META CLAIM THE CODE DOES NOT IMPLEMENT, added this round (not present at HEAD). The new sentence reads: \"A NOTE NEVER RESTATES A VALUE ANOTHER FIELD CARRIES: it says why a reading is what it is, and the reliability and qty fields say what it is, so the two cannot disagree.\" Room 238's own notes restate both fields, repeatedly: docs/238/items/gr208_a, gr300_a, gr600_a and gr602ada_a all open \"QTY 2 IS THIS ROOM'S OWN FOLD...\" against qty 2; docs/238/items/gr202_a and gr322_a both say \"This line therefore ships qty 1\" against qty 1; docs/238/items/bsq_a says \"Qty 2 matches the room's own two accessible base rows\" against qty 2 (that one is the D29 text mandated byte-identical from build_floor1.mjs, so the line cannot be the thing that changes); and every carried-conflict paragraph on 905_a, gr300_a, gr308_a, gr318_a, gr322_a, gr323_a, hd05_a, hd14_a, hd51_a, plmb_ksink_a, plmb_lavfaucet_a, plmb_shower_a and the db_itm07xx lines ends \"the line is FLAGGED for it\" against reliability FLAGGED. The claim is written as an absolute (\"NEVER\") and the generator does the opposite on the room it governs. Origin: platform/tools/build_ref_rooms.mjs, assemble() meta.donorRule string." },
    ],
  },
};

/* WHAT EACH ROUND RAISED, and where the number comes from. These are the counts
 * the round checkpoints record (git log: e06dfd0, 9eb041d, b0253e6) and they are
 * NOT the same as the row counts of the ROUND1 / ROUND2 / ROUND3 arrays on this
 * page, which are the write-ups kept of each round:
 *
 *   round 1  raised 21   ROUND1 keeps 19 summarised rows
 *   round 2  raised 26   ROUND2 keeps 30 rows - the 26 seed findings plus the
 *                        four separate COLLATERAL findings that the delivered
 *                        mockbook.html was a stale pre-fix render
 *   round 3  raised 25   ROUND3 keeps 25 rows, one per finding, verbatim
 *   round 4  raised 10   VERIFIER above holds all ten, verbatim
 *
 * The round-1 difference between 21 and 19 is not reconciled anywhere in this
 * repository and is not reconciled here either; the page says so rather than
 * picking whichever number reads better. */
export const ROUND_RAISED = { 1: 21, 2: 26, 3: 25 };

/* The short list a PM needs: the round-2 findings that change what gets bought
 * or where the crew is sent. Each one names who owes the answer. */
export const BUY_STOPPERS = [
  { room: "all four", line: "plmb_shower_a, plmb_lavfaucet_a, plmb_ksink_a, and the accessible roll-in rows", owner: "b31", what: "conflicts.md B3.1 is OPEN and names SH-1, SH-3, SH-4, L-2, L-3, L-4, SK-3 and SK-4. P401/P402 print one set of marks and the P104 schedule prints another, and BOTH SETS ARE CARRIED. Every line in this package that carries one of those marks now ships FLAGGED with the entry on it.", effect: "B3.1's own instruction is \u2018verify governing marks before ordering guestroom trim\u2019. Nobody has verified them. Ordering trim off either set is ordering off half the evidence." },
  { room: "217 and 238", line: "the whole bath package \u2014 plmb_shower_a, plmb_shencl_a, db_itm0712/0714/0715/0716/0717, hd05_a, hd14_a, hd51_a", owner: "bathing", what: "Tub or roll-in is UNRESOLVED on both keys. Every bathing row on both rooms is FLAGGED in the reference database, and the database says in its own words that both are emitted, neither is superseded, they are mutually exclusive and only Austin can close it.", effect: "Different slab depression, drain, tile and glass buy. Do not order a bath package for either key." },
  { room: "230-MEP and all four", line: "mech_grille_bath  Bath exhaust", owner: "bath_exhaust", what: "Two FLAGGED rows fold into this line and now govern it: ITM-0070 says M305 shows a plain ceiling grille plus an Aldes regulator on a central riser and NO in-room fan, and ITM-0065 says M305's own numbers give 49 inlets against about 119 needed.", effect: "The reference database calls ITM-0065 the single most expensive unverified line in the package, and ITM-0070 says in its own words: do not order 115." },
  { room: "230-MEP and all four", line: "mech_grille_rm  Room wall grille", owner: "grille_material", what: "The only row behind it is FLAGGED: \u2018material unsettled - polypropylene vs aluminum, three instructions, no source settles it\u2019, cited M201 vs M501 det.9 vs M401 KN1/KN5.", effect: "The line says painted to match on a part whose material three documents dispute. Settle the material before anything is released." },
  { room: "all four", line: "fp_heads_a  Sprinkler heads", owner: "heads", what: "The line ships with NO QUANTITY AT ALL. FP-1, FP-2 and FP-3 were read head by head on rooms 107 and 108 only, and which of the three covers floor 2 is nowhere stated in the reference database.", effect: "3 heads x 115 keys is a purchase-order-grade quantity and none of it is verified for these four types. Verify every head you can see." },
  { room: "202 and 217", line: "mech_ptac, mech_tstat, mech_grille_rm", owner: "ptac_count", what: "Both rooms carry TWO PTAC units and their own row says the whole ten-row sub-assembly repeats for the second one. The reference database transcribes each member ONCE, for PTAC 1.", effect: "Every condensed line fed by a \u2018PTAC 1\u2019 member ships the transcribed count, FLAGGED, and says so. Count what is installed before signing any of them off." },
  { room: "all four", line: "mech_ptac, mech_tstat, plmb_fd_a  source sheets", owner: "m_series_floor", what: "The floor-1 references are gone: M301 line 30, M301 GN5 and P301 note 9 are removed and quoted as removed, and M302 and P302 are cited with NO number on them because the sheets table proves the sheet and nothing proves the number.", effect: "Not an RFI, a sheet check. Somebody reads M302 and P302 for these rooms and writes the numbers back. Until then those references are UNVERIFIED for floor 2 and the lines say so." },
  { room: "238", line: "ST-02 window stool over the PTAC", owner: "st02", what: "Room 238's own row reads ST-02 on A556 el.07, ST-02 has NO card in the 67-card finish schedule, and every other sheet tags ST-01 at the identical condition. The mech_grille_rm citation now says ST-02 instead of the donor's ST-01.", effect: "Purchase-order grade. One of the two tags is wrong and nobody has said which." },
  { room: "230 and 238", line: "gr308_a  Working wall", owner: "workingwall", what: "Ruling D22 retagged the floor-1 Queen-Queen wall to GR-305 on an exact workbook count. That arithmetic covers floor 1 and two types, and neither of them is this one, so the tag ships exactly as the reference database transcribes it.", effect: "A crew told to install the wrong working wall hangs the wrong casework. Check the 2nd, 3rd and 4th floor tabs and confirm with RK Design before release." },
  { room: "217 and 238", line: "room note n_conflicts \u2014 B4.4 and A11", owner: "b44", what: "Nine of each room's own rows say conflicts.md A11 / B4.4 and coordination_issues C-01 are OPEN on all seven accessible keys. Both entries are now enumerated on both rooms because those rooms' own rows cite them by id.", effect: "B4.4 says do not order the 438 bath package off either matrix, and A11 is an RFI to MWT that nobody has sent: which unit matrix governs." },
  { room: "202", line: "905_a and gr905_a  Telephone / GR-905", owner: "gr905", what: "No legend or spec describes GR-905. conflicts.md B4.2 says it is the plain 905 telephone tag; the reference database carries 905 and GR-905 as two separate unmerged rows. Both positions are live and both are on the page.", effect: "Ask the architect what GR-905 is before ordering anything against it." },
  { room: "230", line: "room note n_gaps \u2014 one residue", owner: "n_gaps_scope", what: "The gap note now says plainly that it is not the complete placeholder list. PH-GU-015, the duplex receptacle count per guestroom, is still not selected: it names no mark, no room key and no type name, and ITM-0021's note says \u2018see placeholder\u2019 without an id.", effect: "The receptacle count per room is NOT STATED on any sheet. Read it off the E400 / E103.2 panel schedules before rough-in is priced." },
];

