#!/usr/bin/env node
/**
 * build_ref_rooms.mjs - deterministic REFERENCE-ROOM generator for the four
 * floor-2/3/4 guestroom types that have no approved reference room.
 *
 * H2SEP / Home2 Suites by Hilton, Eagle Pass TX - Triun job 24030.
 *
 *   node platform/tools/build_ref_rooms.mjs --selftest
 *   node platform/tools/build_ref_rooms.mjs            (builds all four)
 *   node platform/tools/build_ref_rooms.mjs 202 --partial   (rebuild one, carry the rest)
 *   node platform/tools/build_ref_rooms.mjs --verify-determinism
 *   node platform/tools/build_ref_rooms.mjs --stamp=2026-08-24T00:00:00.000Z
 *
 * READS   data/project.sqlite               (read only)
 *         platform/data/floor1-staged.json  (LIVE floor-1 seed - the text DONOR,
 *                                            READ ONLY, never written)
 *         platform/data/slice-f1.json       (approved slice - READ ONLY, used
 *                                            only to re-prove the recipe)
 * WRITES  platform/data/ref-rooms-staged.json   (a NEW file - the ONLY output)
 *
 * Never touches Firestore. Never pushes. Never deploys. Never writes
 * floor1-staged.json or slice-f1.json.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS BUILDS - Austin's standing sequence in ruling D28: deliver the FULL
 * mock-ups of the four unapproved room types for his approval. One
 * representative room per type, FF&E and MEP:
 *
 *   King One Bedroom       202  (202/302/402)  sheet A553, bath A531
 *   King One Bedroom Acc.  217  (217/317/417)  sheet A554, bath A533
 *   QQ Extended            230  (230/232/330/332/430/432) sheet A555, bath A530
 *   QQ Acc.                238  (238/338)      sheet A556, bath A532/A532.1
 *
 * STAGED FOR APPROVAL. NOT LIVE. NOT PUSHED.
 *
 * ---------------------------------------------------------------------------
 * THE REDUCTION RECIPE IS NOT RE-INVENTED HERE.
 *
 * build_floor1.mjs owns the recipe and its --selftest proves it against the
 * three approved rooms. That file is a script, not a module: it has no exports
 * and calls main(process.argv) on load, so it cannot be imported without
 * running it. The recipe is therefore COPIED, and the copy is MECHANICALLY
 * PROVED byte-faithful on every single run by assertRecipeByteFaithful(), which
 * re-reads build_floor1.mjs from disk, extracts each named function's source
 * span, and compares it character for character with the copy in this file.
 * A one-character drift in either file aborts the build. Nothing silently
 * forks. The proof is printed in the report.
 *
 * Two functions are carried as DERIVED rather than EXACT copies, and the
 * transform that produces them is declared as data (RECIPE_DERIVED) and
 * re-applied to build_floor1.mjs's own source on every run, so the derivation
 * is checked too, not just asserted:
 *
 *   repointCiteSegment  } the donor sheet was the hard-coded constant
 *   composeMepCitation  } MEP_DONOR_SHEET ('A555'), because floor 1 only ever
 *                         donated from a Queen-Queen room. Here the King family
 *                         donates from room 104 (A550), so the donor sheet
 *                         becomes a PARAMETER. The transform is exactly:
 *                         MEP_DONOR_SHEET -> donorSheet, plus the parameter in
 *                         the signature, plus one added early-return guard in
 *                         composeMepCitation for donorSheet === roomSheet.
 *
 * ---------------------------------------------------------------------------
 * WHERE THE PACKAGE TEXT COMES FROM, LINE BY LINE
 *
 * sqlite gives every line its SHAPE (category, tag, quantity, key, sort). It
 * does not hold Austin's rulings, the closed flags or the Drive submittal
 * links - those live in the built floor-1 documents. So, per the standing rule:
 *
 *   QQ Extended (230) and QQ Acc. (238) lean on LIVE room 105 (Queen-Queen).
 *   King One Bedroom (202) and King One Bedroom Acc. (217) lean on LIVE room
 *   104 (King Studio) ONLY for tags they genuinely share.
 *
 * A tag with no live counterpart in the donor ships from sqlite VERBATIM with
 * its own reliability - never from a different room type, never invented. Every
 * line's source is recorded and printed: DONOR, SQLITE or RULING, and every line
 * carries that source ON ITSELF as a SOURCE sentence.
 *
 * A DONOR MAY ENRICH. IT MAY NOT LAUNDER. (round-2 correction)
 * The first build handed the donor's reliability AND note straight onto every
 * shared tag, which shipped a room's own FLAG away five times over - 238's
 * gr403_a ("DO NOT BUY BOTH") at HIGH with an empty note, 238's hd12_a and
 * hd08_a with their ASSUMPTION flags gone, 217's 905_a at HIGH on a tag its own
 * row downgrades, and 217's hd08_a wearing room 104's contradicting caveat. The
 * rule now:
 *   - the TARGET room's own reliability governs; a donor raises it only where
 *     the donor's text carries a RULING that closes the flag for the PRODUCT
 *     (Austin's D11 submittal closures name a model, not a room);
 *   - where the room's own row has words, THOSE words govern, and a donor note
 *     that is a reading of the donor's own drawing is dropped and quoted on the
 *     line as not carried;
 *   - where the room's own row is silent, the approved package text rides whole
 *     and the line says where it came from.
 * Every folded line also states WHY its quantity is what it is, row by row.
 * See "A DONOR MAY ENRICH. IT MAY NOT LAUNDER." further down.
 *
 * DELETED DONOR LINES ARE NOT A SOURCE. Live room 105 carries gr308_a as a
 * deleted tombstone (retired by ruling D22 with a "SUPERSEDED" note). Indexing
 * it as a donor would have stamped that supersede note onto room 230, which
 * still legitimately carries GR-308. The donor index therefore skips
 * deleted:true lines. See DONOR_INDEX_SKIPS_DELETED.
 *
 * ---------------------------------------------------------------------------
 * CONFLICTS ARE CARRIED, NEVER RESOLVED
 *
 * Every open document conflict rides into the output as a FLAGGED line and/or a
 * room note carrying data/project.sqlite's own words VERBATIM. This tool
 * resolves nothing.
 *
 * That includes the data/project.sqlite CONFLICTS TABLE, which the first build
 * never read (round-2 correction). Every OPEN entry naming one of these rooms'
 * keys or one of its tags now rides on the line that carries the tag, FLAGGED,
 * and in room note n_conflicts - B4.2 (GR-905 versus the plain 905 telephone
 * tag), B4.5 (GR tags ambiguous without A530), B3.1, B5.6 and A11. And a
 * gated-out row whose own note states a conflict rides in n_gategaps at ANY
 * reliability: how well a row was READ says nothing about whether the documents
 * AGREE, and scoping that note to FLAGGED/MEDIUM dropped three real conflicts
 * off room 202.
 *
 * In particular:
 *
 *  1 ROOM 217 AND ROOM 238 - TUB versus ROLL-IN, OPEN.
 *    Ruling D19 put room 118 on the roll-in shower. D19 IS SCOPED TO ROOM 118
 *    AND TO NOTHING ELSE. Rooms 217 and 238 each carry three Configuration A
 *    (TUB) rows and five Configuration B (ROLL-IN SHOWER) rows, every one of
 *    them FLAGGED, and the database's own note says: "Both are emitted. Neither
 *    is superseded. Only Austin can close this."
 *    So BOTH configurations are built, both FLAGGED, and a room note on both
 *    documents carries the conflict text verbatim. Nothing is dropped.
 *    CONFIG_A_DROP_ROOMS is EMPTY in this tool, deliberately.
 *
 *  2 KING ONE BEDROOM ST-02 WINDOW STOOL - OPEN, and it cannot ride on a line,
 *    because "Stone / Surround" sits outside Austin's approved category gate.
 *    It rides as a room note instead, quoting the row: "S-1 CONFLICT,
 *    purchase-order-grade gap. ST-02 is NOT in the 67-card finish schedule."
 *
 *  3a SPRINKLER CITATION - THE DONOR'S FP SHEET IS THE DONOR'S FLOOR.
 *    The donor's fp_heads_a cites "FP-1 head schedule ... 144 total heads 1st
 *    floor" and "FP-1, verified head-by-head on rooms 107 and 108". These rooms
 *    are on FLOOR 2 and no head in them was verified, so those segments are
 *    REMOVED, quoted on the line as removed, and replaced with PH-GU-001's own
 *    sheet list plus this room's own rooms.floor. Which FP sheet covers floor 2
 *    is nowhere stated in the database and is NOT guessed. See fpNoCount().
 *
 *  3b A SHARED SHEET IS NOT A SHARED CONNECTING PLAN.
 *    Room 230 sits on A555, the same sheet as donor 105, so its citations stand
 *    verbatim - except the '.1' variant, which room_types identifies as the QQ
 *    CONNECTING plan and which build_floor1.mjs drops wherever
 *    rooms.connecting = 0. That rule only ran on the re-point path, so five of
 *    230's lines pointed a non-connecting room at the connecting electrical
 *    plan. See sameSheetCitation().
 *
 *  3c A CORROBORATION CLAIM IS CHECKED NUMBER BY NUMBER.
 *    composeMepCitation() used to print every row citing ANY A55-series sheet as
 *    corroborating whatever number survived the sift, which put a fabricated
 *    "and this room's own rows cite it too" on room 217's FLAGGED PTAC line. A
 *    row corroborates only when it cites the SAME number on the SAME sheet.
 *
 *  3 SPRINKLER HEAD COUNT - NOT VERIFIED for any of these four types.
 *    None of the four rooms has a single Fire Sprinkler row in sqlite, and
 *    placeholder PH-GU-001 says head counts were read head-by-head on rooms 107
 *    and 108 ONLY. The donor line carries qty 3 and room 104's own head
 *    positions. Copying either onto a one-bedroom SUITE would be fabrication,
 *    so fp_heads_a ships with NO QUANTITY AT ALL, reliability MEDIUM, carrying
 *    PH-GU-001 verbatim - the same way GR-303/GR-324 and space S017 tag 404
 *    already ship. See FP_NO_COUNT.
 *
 *  4 PTAC MARK - OPEN on all four rooms, in two different ways, and the donor
 *    must not close either. Room 104's line reads code PTAC-1 because 104's own
 *    row resolved it; 202/217 have TWO PTACs with NO MARK AT ALL, and 230/238
 *    have one row tagged "PTAC-2 / PTAC-1" with both marks carried. The donor's
 *    resolution sentence is stripped and replaced with this room's own rows,
 *    verbatim. See ptacFromOwnRows().
 *
 *  5 GR-305 vs GR-308 (ruling D22) - NOT APPLIED to 230 or 238, on purpose.
 *    D22 is evidenced by the FF&E Installation workbook's 1st Floor tab, where
 *    GR-305 (6 units) reconciles against six plain Queen-Queen keys and GR-308
 *    (2 units) against two QQ connecting keys. QQ Extended and QQ Acc. are
 *    NEITHER of those types and are not on floor 1, so that arithmetic says
 *    nothing about them. Both rooms therefore carry GR-308 exactly as sqlite
 *    transcribes it, and a room note records that the naming question is open
 *    for these types and must be confirmed against the 2nd/3rd/4th floor tabs
 *    before casework is released. Applying D22 here would be a guess.
 *
 *  6 GR-301 KING HEADBOARD is missing from room 202 (placeholder PH-GU-009:
 *    "Missing tag, not a missing headboard - not added. Gap G-4"). It is NOT
 *    added. It rides as a room note. Its accessible twin 217 does carry it.
 *
 * ---------------------------------------------------------------------------
 * RULINGS APPLIED, AND SCOPED TO THE EVIDENCE THEY REST ON
 *
 *   D12  a room with two queen beds has THREE nightstands. Applied to 230,
 *        whose drawing tags the nightstand family ONCE (GR-322 alone) - which
 *        is the exact situation D12 was ruled about. NOT applied to 238, which
 *        already tags GR-319 + GR-322 + GR-323 separately: the fold already
 *        yields three nightstands there, and forcing GR-322 to 3 would ship
 *        FIVE. Not applied to 202/217, which are King rooms. Reported per room.
 *   D20  King rooms take 2 nightstand sconces. 202 and 217 already carry
 *        GR-202 x2 in sqlite, so the ruling restates the fold and changes
 *        nothing. NOT applied to 238: 238 is a QQ Acc. key, not a King key, and
 *        its own row says "A556 carries GR-208 x2 + GR-202, NOT the
 *        GR-207/GR-208 centre/outboard split used on A555". Doubling GR-202
 *        there would invent a fourth sconce for three nightstands.
 *   D22  see conflict 5 above - deliberately NOT applied.
 *   D27  hot/cold water line on EVERY room MEP punch.
 *   D28  Door Hardware band - closer + lock on EVERY room FF&E.
 *   D18 / D23 / D24 are floor-1 / common-area / cutover rulings and do not
 *        reach this build.
 *
 * FIELD STATE: the lines this tool writes are born clean, and that is only half
 * the story. THE CREW HAS BEEN WORKING ROOMS 202, 217, 230 AND 238 IN THE LIVE
 * APP SINCE AUGUST, so platform/tools/carry_ref_state.mjs runs AFTER every build
 * and carries their check-offs, initials, timestamps, issues and notes in under
 * ruling D24 - with EXACT reconciliation, or it refuses to write. It also
 * REBUILDS any line the crew holds work on that the category gate left with no
 * home (room 202's GR-905, which the crew has flagged MISSING); that line is
 * rebuilt from data/project.sqlite's own row, in its own sort band after the D28
 * Door Hardware lines. This tool cannot do that itself: it never touches
 * Firestore, so it cannot see what the crew holds.
 *
 * DETERMINISM: one declared constant stamp, canonical JSON with object keys
 * sorted at every depth. Re-running the same arguments rewrites a byte-
 * identical file. --verify-determinism proves it in-process.
 * ---------------------------------------------------------------------------
 */

import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const DB_PATH = resolve(REPO, 'data', 'project.sqlite');
const SLICE_PATH = resolve(REPO, 'platform', 'data', 'slice-f1.json');
const DONOR_PATH = resolve(REPO, 'platform', 'data', 'floor1-staged.json');
const OUT_PATH = resolve(REPO, 'platform', 'data', 'ref-rooms-staged.json');
const RECIPE_PATH = resolve(HERE, 'build_floor1.mjs');

/* Determinism. Not Date.now(). Override with --stamp=<ISO> for a dated wave. */
const DEFAULT_STAMP = '2026-08-24T00:00:00.000Z';

/* Files this tool must never write, checked at startup AND after the write. */
const NEVER_WRITE = [SLICE_PATH, DONOR_PATH, RECIPE_PATH,
  resolve(REPO, 'platform', 'data', 'slice-f1.json')];

/* ===========================================================================
 * THE FOUR REPRESENTATIVE ROOMS
 * =========================================================================== */

const REP_ROOMS = {
  202: {
    type: 'King One Bedroom', keys: ['202', '302', '402'],
    donor: '104', donorType: 'King Studio',
    sheets: 'A553 plan 01; elevations A553.1 / A553.2; ID-5.4 / ID-5.5; bath A531 / ID-5.11',
    why: 'closest built type with an approved package: King Studio room 104 - same bed family, '
      + 'same kitchenette, same bath fixtures. Shared tags only; anything else ships from sqlite.',
  },
  217: {
    type: 'King One Bedroom Acc.', keys: ['217', '317', '417'],
    donor: '104', donorType: 'King Studio',
    sheets: 'A554 plan 01; elevations A554.1; ID-5.6 / ID-5.7; bath A533 / ID-5.13',
    why: 'closest built type with an approved package: King Studio room 104. The ACCESSIBLE bath '
      + 'package is this room’s own and is not taken from 104.',
  },
  230: {
    type: 'QQ Extended', keys: ['230', '232', '330', '332', '430', '432'],
    donor: '105', donorType: 'Queen-Queen',
    sheets: 'A555 plan 01 with the "@QQ EXT" alternate dimension string; bath A530',
    why: 'same room_sheet as the donor (room_types QQ Extended room_sheet = A555, identical to '
      + 'Queen-Queen), so no citation re-point is needed at all - every A555 reference stands verbatim.',
  },
  238: {
    type: 'QQ Acc.', keys: ['238', '338'],
    donor: '105', donorType: 'Queen-Queen',
    sheets: 'A556 plan 01; ID-5.9; bath A532 / A532.1 / ID-5.12',
    why: 'closest built type with an approved package: Queen-Queen room 105 - the only other '
      + 'two-queen type that is built. The ACCESSIBLE bath package is this room’s own.',
  },
};

/* die() is NOT copied. build_floor1.mjs's version hard-codes a "build_floor1:"
 * prefix, and an error from THIS tool wearing the other tool's name sends the
 * reader to the wrong file. It is an error printer, not a reduction rule. */
function die(msg) {
  process.stderr.write('build_ref_rooms: FATAL: ' + msg + '\n');
  process.exit(1);
}

/* ===========================================================================
 * RECIPE PROVENANCE - what is copied from build_floor1.mjs and how.
 * =========================================================================== */

/* EXACT: the source span in build_floor1.mjs must equal the span in this file,
 * character for character. Proved on every run. */
const RECIPE_EXACT = [
  'openDb', 'cmpStr', 'tagSlug', 'occSuffix', 'md5', 'SEP', 'canonical', 'stringify',
  'clone', 'deepEqual', 'cmpDocId', 'readRoom', 'typeSlug', 'CLEAN_FIELD_STATE',
  'reduceFFE', 'detectSortConvention', 'sqliteNote',
  'citeSegments', 'citeJoin', 'CITE_VIEW_TOKEN', 'CITE_KN_TOKEN', 'citeNums', 'citeViewNumbers', 'citeKeynoteNumbers',
  'resolveSheetWildcard', 'isMepRow', 'roomSheetFor',
  'configConflictNote', 'isConfigRow',
  'assertSheetNumberingShared', 'assertMepCondensationCovers',
  'assertMepConstant', 'assertDerivationRules',
];

/* DERIVED: the span in this file must equal build_floor1.mjs's span after the
 * listed textual transform, applied in order. Anything else is drift. */
const RECIPE_DERIVED = {
  repointCiteSegment: [
    ['function repointCiteSegment(seg, roomSheet, isConnecting, numbering) {',
      'function repointCiteSegment(seg, roomSheet, isConnecting, numbering, donorSheet) {'],
    ['out.split(MEP_DONOR_SHEET).join(roomSheet)', 'out.split(donorSheet).join(roomSheet)'],
  ],
  composeMepCitation: [
    ['function composeMepCitation(donorSrc, mine, roomSheet, isConnecting, numbering) {',
      'function composeMepCitation(donorSrc, mine, roomSheet, isConnecting, numbering, donorSheet) {\n'
      + '  /* ADDED (build_ref_rooms): room 230 sits on the SAME sheet as its donor\n'
      + '   * (QQ Extended room_sheet A555 == Queen-Queen room_sheet A555). There is\n'
      + '   * nothing to re-point, and running the number sift would strip A555 view\n'
      + '   * numbers off a room that IS on A555. So the donor citation stands - with\n'
      + '   * ONE exception, which a shared sheet does not make shared: the \'.1\'\n'
      + '   * CONNECTING plan variant. See sameSheetCitation(). */\n'
      + '  if (donorSheet === roomSheet) {\n'
      + '    return sameSheetCitation(donorSrc, isConnecting, roomSheet);\n'
      + '  }'],
    ['  const ownRowIds = [];',
      '  const ownRowIds = [];\n'
      + '  /* ADDED (build_ref_rooms): the A55-series segments each row contributes,\n'
      + '   * kept PER ROW, so a corroboration claim can be tested number by number\n'
      + '   * instead of on the bare fact that the row cites some A55-series sheet.\n'
      + '   * Room 217 is why: its own rows cite A554.1 view 01/07 and A554 KN30, and\n'
      + '   * the surviving donor segment is "A554 KN1". None of those rows cites KN1,\n'
      + '   * yet all three were being printed as corroborating it. */\n'
      + '  const ownSegsByRow = [];'],
    ['    if (used && !ownRowIds.includes(r.item_id)) ownRowIds.push(r.item_id);',
      '    if (used && !ownRowIds.includes(r.item_id)) ownRowIds.push(r.item_id);\n'
      + '    if (used) ownSegsByRow.push({ id: r.item_id, segs: segs.filter((s) => /A55\\d/.test(s)) });'],
    ['    const survivors = kept.filter((x) => x.includes(roomSheet) && !BOTH.test(x) &&\n'
      + '      (citeViewNumbers(x).size || citeKeynoteNumbers(x).size));',
      '    const survivors = kept.filter((x) => x.includes(roomSheet) && !BOTH.test(x) &&\n'
      + '      (citeViewNumbers(x).size || citeKeynoteNumbers(x).size));\n'
      + '    /* ADDED (build_ref_rooms): CORROBORATION IS NUMBER BY NUMBER. A row of this\n'
      + '     * room\'s own corroborates a surviving reference only when it cites one of\n'
      + '     * the SAME view or keynote number ON THIS ROOM\'S OWN SHEET. Citing the\n'
      + '     * same SHEET is not evidence - it is the very thing the sift just finished\n'
      + '     * disproving - and citing the same NUMBER on a different sheet is not\n'
      + '     * evidence either. Both tests have to pass. */\n'
      + '    const survivorViews = new Set(survivors.flatMap((x) => [...citeViewNumbers(x)]));\n'
      + '    const survivorKns = new Set(survivors.flatMap((x) => [...citeKeynoteNumbers(x)]));\n'
      + '    const corroborating = ownSegsByRow.filter((o) => o.segs.some((s) => s.includes(roomSheet) && (\n'
      + '      [...citeViewNumbers(s)].some((n) => survivorViews.has(n))\n'
      + '      || [...citeKeynoteNumbers(s)].some((n) => survivorKns.has(n))))).map((o) => o.id);'],
    ["          (ownRowIds.length ? \" and this room's own row(s) \" + ownRowIds.join(', ') + ' cite it too.' : '.')",
      "          (corroborating.length\n"
      + "            ? \" and this room's own row(s) \" + corroborating.join(', ') + ' cite the same number on the same sheet.'\n"
      + "            : ownRowIds.length\n"
      + "              ? '. NO row of this room\\'s own cites that number: its own A55-series row(s) (' +\n"
      + "                ownRowIds.join(', ') + ') cite different numbers, so nothing in this room corroborates it. ' +\n"
      + "                'Confirm it on ' + roomSheet + ' before relying on it.'\n"
      + "              : '. This room has no A55-series row of its own to corroborate it - confirm it on ' +\n"
      + "                roomSheet + ' before relying on it.')"],
    ['repointCiteSegment(seg, roomSheet, isConnecting, numbering)',
      'repointCiteSegment(seg, roomSheet, isConnecting, numbering, donorSheet)'],
    ['if (!seg.includes(MEP_DONOR_SHEET) || BOTH.test(seg))', 'if (!seg.includes(donorSheet) || BOTH.test(seg))'],
    ["' on ' + MEP_DONOR_SHEET + '. ' +", "' on ' + donorSheet + '. ' +"],
    /* The donor is not always a Queen-Queen room here: rooms 202 and 217 take
     * their MEP text from King Studio room 104. Saying "the approved
     * Queen-Queen line" on a King citation note would be simply untrue on the
     * page a crew reads, so the phrase becomes donor-neutral. */
    ["note = 'CITATION. The approved Queen-Queen line cites ' +", "note = 'CITATION. The donor line cites ' +"],
    ["'data/project.sqlite proves ' + MEP_DONOR_SHEET + ' and ' + roomSheet",
      "'data/project.sqlite proves ' + donorSheet + ' and ' + roomSheet"],
  ],
};

/* ===========================================================================
 * COPIED FROM build_floor1.mjs - the constants the recipe reads.
 * These are DATA, not logic, and are re-proved against build_floor1.mjs by
 * assertRecipeConstants() on every run.
 * =========================================================================== */

const GATE_CATEGORIES = new Set([
  'Bath Accessory', 'Appliance', 'FF&E - Casegoods', 'FF&E - Bedding',
  'FF&E - Seating', 'FF&E - Lighting', 'FF&E - Window', 'FF&E - Art / Mirror', 'Door Hardware',
]);

const MEP_CATEGORIES = new Set([
  'Plumbing', 'Electrical', 'Mechanical', 'Low Voltage', 'Fire Alarm',
  'Fire Sprinkler', 'Fire Protection',
]);

const CATEGORY_ORDER = [
  'Drywall', 'Paint', 'Wall Covering', 'Flooring', 'Stone / Surround',
  'Doors', 'Electrical', 'Mechanical', 'Plumbing', 'Fire Sprinkler',
  'Fire Alarm', 'Low Voltage', 'Bath Accessory', 'Appliance',
  'FF&E - Casegoods', 'FF&E - Bedding', 'FF&E - Seating', 'FF&E - Lighting',
  'FF&E - Window', 'FF&E - Art / Mirror', 'FF&E - Misc',
];
const CATEGORY_INDEX = new Map(CATEGORY_ORDER.map((c, i) => [c, i]));

const SPACE_MEP_ORDER = ['Mechanical', 'Electrical', 'Plumbing', 'Fire Protection', 'Low Voltage',
  'Fire Sprinkler', 'Fire Alarm'];
const SPACE_MEP_INDEX = new Map(SPACE_MEP_ORDER.map((c, i) => [c, i]));

/* The five MEP bands the CREW APP itself knows (js/util.js MEP_CATEGORY_ORDER).
 * build_floor1.mjs reports any space row outside this set because such a line
 * "will sort last"; this tool had no equivalent check, so room 202's second
 * smoke detector shipped under 'Fire Alarm' - a band no floor-1 guest room
 * carries - at sort 7010, in a group that renders after everything else, while
 * the first smoke detector sat under 'Fire Protection' at 4011. The category
 * string is still carried verbatim; the LINE and the REPORT now say so. */
const APP_MEP_CATEGORY_ORDER = new Set([
  'Mechanical', 'Electrical', 'Plumbing', 'Fire Protection', 'Low Voltage',
]);

/* The three approved rooms the recipe proves itself against. Read only. */
const APPROVED_ROOMS = ['101', '103', '105'];
const APPROVED_DOC_IDS = ['101', '103', '105', '101-MEP', '103-MEP', '105-MEP'];

const MEP_DONOR_ROOM = '105';
const MEP_DONOR_SHEET = 'A555';
const KING_PAIR_SHEET = 'A550';
const MEP_DOC_TYPE = 'mep-punch';

const CONFIG_A_PREFIX = 'CONFIGURATION A (TUB) - ';
const CONFIG_B_PREFIX = 'CONFIGURATION B (ROLL-IN SHOWER) - ';

/* DELIBERATELY EMPTY. Ruling D19 is scoped to room 118 and this tool does not
 * build room 118. No room in this set has a ruling on tub-versus-roll-in, so
 * NOTHING is dropped and both configurations ship FLAGGED. */
const CONFIG_A_DROP_ROOMS = {};

const MEP_CONDENSED_SOURCES = {
  mech_ptac: ['ITM-0443', 'ITM-0052', 'ITM-0054', 'ITM-0055', 'ITM-0056',
    'ITM-0057', 'ITM-0058', 'ITM-0061', 'ITM-0048'],
  mech_tstat: ['ITM-0060', 'ITM-0059', 'ITM-0018'],
  mech_grille_rm: ['ITM-0053'],
  mech_grille_bath: ['ITM-0064', 'ITM-0070', 'ITM-0066', 'ITM-0067', 'ITM-0065',
    'ITM-0063', 'ITM-0068', 'ITM-0062', 'ITM-0069'],
  elec_panel: ['ITM-0001', 'ITM-0002', 'ITM-0003', 'ITM-0004', 'ITM-0005',
    'ITM-0006', 'ITM-0007', 'ITM-0008', 'ITM-0009', 'ITM-0010', 'ITM-0011',
    'ITM-0012', 'ITM-0013'],
  elec_gfci: ['ITM-0015'],
  elec_lights: ['ITM-0014', 'ITM-0022', 'ITM-0023', 'ITM-0024', 'ITM-0025'],
  elec_outlets: ['ITM-0021', 'ITM-0017', 'ITM-0019', 'ITM-0020'],
  elec_sink_sw: ['ITM-0016'],
  plmb_wc_a: ['ITM-0042', 'ITM-0039'],
  plmb_lavfaucet_a: ['ITM-0044', 'ITM-0043', 'ITM-0045'],
  plmb_shower_a: ['ITM-0441'],
  plmb_showerhead_a: ['ITM-0049', 'ITM-0050'],
  plmb_shencl_a: ['ITM-0442'],
  plmb_fd_a: ['ITM-0046'],
  plmb_trapguard_a: ['ITM-0047'],
  plmb_ksink_a: ['ITM-0051'],
  fp_heads_a: ['ITM-0447', 'ITM-0448', 'ITM-0449'],
  fp_smoke_a: ['ITM-0078'],
  lv_wap: ['ITM-0026'],
  lv_tvdata: ['ITM-0027', 'ITM-0029', 'ITM-0030'],
  lv_phone_db: ['ITM-0028', 'ITM-0031'],
};

const MEP_ROUGH_IN_ITEMS = [
  'ITM-0032', 'ITM-0033', 'ITM-0034', 'ITM-0035', 'ITM-0036', 'ITM-0037',
  'ITM-0038', 'ITM-0040', 'ITM-0041',
];

const MEP_LABEL_FROM_ROW = new Set(['plmb_shower_a', 'plmb_shencl_a']);

const PTAC_DONOR_M401 = 'M401 det.01 + KN3 + KN7';
const PTAC_NAMEPLATE = 'Model reads off the nameplate: AZ65H12DAB is PTAC-1, AZ65H15DAB is PTAC-2.';
const FP_COUNT_SENTENCE = 'head count varies by room, so verify every head you can see rather than counting to a number.';

/* room_types.room_sheet is unambiguous for all four of these types (A553, A554,
 * A555, A556), so no resolution entry is needed. The A551/A552 split that room
 * 118 and room 438 argue about does not reach any room in this set - recorded
 * so the reader knows it was checked, not forgotten. */
const ROOM_SHEET_RESOLUTION = {};

/* The donor index must ignore retired lines. See the header. */
const DONOR_INDEX_SKIPS_DELETED = true;

/* ===========================================================================
 * RULED LINE ADDITIONS - D27 and D28, copied verbatim from build_floor1.mjs and
 * re-proved against it by assertRuledAdditionsMatchLive().
 * =========================================================================== */

const RULED_LINE_ADDITIONS = [
  {
    ruling: 'D27', doc: 'mep', key: 'plmb_hotcold_a', category: 'Plumbing', sort: 3018,
    code: 'HW/CW', qty: 1,
    label: 'Hot and cold water working at every fixture',
    src: 'D27 (AJ 2026-08-21); P202/P305 HWS distribution',
    note: 'Added by Austin ruling D27. Run hot and cold at the lavatory, the shower and the ' +
      'kitchenette sink: both temperatures arrive, hot on the LEFT, and hot gets hot within a ' +
      'reasonable wait. Any fixture that fails gets its own issue on its own line.',
  },
  {
    ruling: 'D28', doc: 'ffe', key: 'dh_closer_a', category: 'Door Hardware', sort: 21000,
    code: 'DH-1', qty: 1,
    label: 'Door closer installed - Rixson R21013 Series 10',
    src: 'D28 (AJ 2026-08-21); label on delivered product',
    note: 'Added by Austin ruling D28. Label transcribed verbatim from the delivered part: ' +
      'RIXSON R21013, Series 10, UL Classified, MISCELLANEOUS FIRE DOOR ACCESSORIES 2MF0. ' +
      'Check the closer is installed, the door self-closes and latches from any open position.',
  },
  {
    ruling: 'D28', doc: 'ffe', key: 'dh_lock_a', category: 'Door Hardware', sort: 21010,
    code: 'DH-2', qty: 1,
    label: 'Door lock installed - 10-336, finish 630',
    src: 'D28 (AJ 2026-08-21); box label on delivered product',
    note: 'Added by Austin ruling D28. Box label transcribed verbatim: NORTON RIXSON / ASSA ABLOY ' +
      '10-336, DOOR, finish 630, qty 1. One unit photographed installed on a guestroom frame ' +
      '2026-08-21. Check the lock is installed and operates: latches, locks and releases.',
  },
];

/* ===========================================================================
 * QUANTITY OVERRIDES, SCOPED TO THE EVIDENCE EACH RULING RESTS ON.
 *
 * build_floor1.mjs applies these on (tag, category) alone, which is correct for
 * floor 1 because every floor-1 key that carries the tag is inside the ruling's
 * evidence. It is NOT correct here, and applying them blind would ship a
 * fabricated count on room 238 twice over. Each override therefore carries a
 * `scope` predicate, and the decision - applied or declined - is REPORTED for
 * every room, with the reason.
 * =========================================================================== */

const QTY_OVERRIDE_RULES = [
  {
    tag: 'GR-322', category: 'FF&E - Casegoods', qty: 3, ruling: 'D12',
    because: 'a two-queen room has three nightstands',
    /* D12's own words: "The room 101 paper sheet's GR-319/GR-322/GR-323 count was
     * correct; drawings tag the family once." The ruling exists because the
     * drawing collapses three nightstands into ONE tag. Where the drawing
     * already tags all three separately - room 238 carries GR-319, GR-322 AND
     * GR-323 off A556:54 - the fold ALREADY yields three, and forcing GR-322 to
     * 3 would ship five nightstands into a two-queen room. */
    scope: (ctx) => {
      const siblings = ['GR-319', 'GR-323'].filter((t) => ctx.tagsInCategory.has(t));
      if (siblings.length) {
        return { apply: false, why: 'the drawing already tags the nightstand family separately in this room ('
          + ['GR-322', ...siblings].sort(cmpStr).join(' + ') + '), so the fold already yields '
          + (1 + siblings.length) + ' nightstands. D12 was ruled for the case where the drawing tags the '
          + 'family ONCE. Forcing qty 3 here would ship ' + (3 + siblings.length) + '.' };
      }
      return { apply: true, why: 'this room tags the nightstand family once (GR-322 only) and carries '
        + ctx.queenBeds + ' queen bed(s), which is exactly the case D12 was ruled on' };
    },
  },
  {
    tag: 'GR-202', category: 'FF&E - Lighting', qty: 2, ruling: 'D20',
    because: 'a King-family key has two nightstands and takes two GR-202 nightstand sconces, one per '
      + 'nightstand - which is how data/project.sqlite already draws rooms 104 through 116',
    /* D20 says "2 per King room" and reasons entirely about the eight King-family
     * keys on floor 1. Room 238 is a QQ Acc. key. Its own row says why it carries
     * a single GR-202: "A556 carries GR-208 x2 + GR-202, NOT the GR-207/GR-208
     * centre/outboard split used on A555. No GR-207 on this sheet." Doubling it
     * would invent a fourth sconce for three nightstands. */
    scope: (ctx) => (/^King\b/.test(ctx.roomType)
      ? { apply: true, why: 'room type ' + JSON.stringify(ctx.roomType) + ' is a King-family key, which is '
          + 'the set D20 was ruled on' }
      : { apply: false, why: 'room type ' + JSON.stringify(ctx.roomType) + ' is NOT a King-family key. D20 '
          + 'reasons only about the King rooms; this room’s own sqlite row explains its single GR-202 '
          + 'and it also carries GR-208 x2. Doubling GR-202 here would invent a sconce.' }),
  },
];

/* reduceFFE is a byte-exact copy and reads the module-level QTY_OVERRIDES.
 * The scope decision is therefore made OUTSIDE the recipe: resolveQtyOverrides()
 * evaluates each rule's scope predicate against the room and assigns the subset
 * that actually applies, before the reduction runs. The recipe never changes;
 * only the table it is handed does, and every decision is reported.
 */
let QTY_OVERRIDES = [];

/* ###########################################################################
 * VERBATIM COPY REGION - do not hand-edit.
 *
 * Every function between the BEGIN and END markers below is a character-for-
 * character copy of the same-named function in platform/tools/build_floor1.mjs.
 * assertRecipeByteFaithful() re-reads that file on every run and re-proves it.
 * Editing anything in here without editing build_floor1.mjs identically will
 * abort the next build with a diff.
 * ######################################################################### */

/* ==== BEGIN VERBATIM COPY FROM build_floor1.mjs ==== */

function openDb() {
  if (!existsSync(DB_PATH)) die('database not found at ' + DB_PATH);
  return new DatabaseSync(DB_PATH, { readOnly: true });
}

function cmpStr(a, b) {
  const A = [...a], B = [...b];
  const n = Math.min(A.length, B.length);
  for (let i = 0; i < n; i++) {
    const x = A[i].codePointAt(0), y = B[i].codePointAt(0);
    if (x !== y) return x < y ? -1 : 1;
  }
  return A.length === B.length ? 0 : (A.length < B.length ? -1 : 1);
}

const tagSlug = (tag) => tag.toLowerCase().replace(/[^a-z0-9]/g, '');

function occSuffix(n) {
  let s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(97 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

const md5 = (s) => createHash('md5').update(s, 'utf8').digest('hex');

const SEP = '\u0000';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort(cmpStr)) out[k] = canonical(value[k]);
    return out;
  }
  return value;
}

const stringify = (v) => JSON.stringify(canonical(v), null, 2) + '\n';

const clone = (v) => JSON.parse(JSON.stringify(v));

const deepEqual = (a, b) => stringify(a) === stringify(b);

function cmpDocId(a, b) {
  const na = parseInt(a, 10), nb = parseInt(b, 10);
  const aNum = Number.isFinite(na), bNum = Number.isFinite(nb);
  if (aNum !== bNum) return aNum ? -1 : 1;
  if (aNum && na !== nb) return na - nb;
  return cmpStr(a, b);
}

function readRoom(db, roomNo) {
  const room = db.prepare(
    'SELECT room_no, floor, room_type, display_label, accessible, connecting, note FROM rooms WHERE room_no = ?'
  ).get(roomNo);
  if (!room) die('room ' + roomNo + ' does not exist in the rooms table');
  const rows = db.prepare(
    'SELECT rowid AS rowid, item_id, room_type, category, tag, description, instance_note, note,' +
    '       trade_responsible, source_sheet, primary_sheet, reliability, derived' +
    '  FROM room_items WHERE room_no = ? ORDER BY rowid'
  ).all(roomNo);
  if (!rows.length) die('room ' + roomNo + ' has no rows in room_items');
  /* Join key is room_type, never display_label. */
  for (const r of rows) {
    if (r.room_type !== room.room_type) {
      die('room ' + roomNo + ': room_items.room_type ' + JSON.stringify(r.room_type) +
          ' != rooms.room_type ' + JSON.stringify(room.room_type) + ' (rowid ' + r.rowid + ')');
    }
  }
  return { room, rows };
}

const typeSlug = (roomType) => roomType.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const CLEAN_FIELD_STATE = {
  checked: false,
  initials: '',
  checkedAt: null,
  checkedAtLocal: null,
  issue: '',
  issueResolved: false,
};

function reduceFFE(roomNo, rows, convention) {
  /* STEP 0 - ruled drops. Matched on the DATABASE'S OWN description prefix. */
  const drops = configADrops(roomNo, rows);
  const configDropped = rows.filter((r) => drops.ids.has(r.rowid));

  /* STEP 1 - category gate. */
  const kept = [];
  const unknownCategories = new Set();
  let mepRowCount = 0;
  for (const r of rows) {
    if (drops.ids.has(r.rowid)) continue;
    if (GATE_CATEGORIES.has(r.category)) kept.push(r);
    else if (MEP_CATEGORIES.has(r.category)) mepRowCount++;
    else if (!CATEGORY_INDEX.has(r.category)) unknownCategories.add(r.category);
  }

  /* STEP 2 + STEP 4 - fold tagged rows by (category, tag); untagged rows stand alone. */
  const groups = [];            // ordered by first appearance (rowid order)
  const byCatTag = new Map();
  const untaggedOcc = new Map();
  for (const r of kept) {
    const tag = r.tag || '';
    if (tag) {
      const gk = r.category + SEP + tag;
      let g = byCatTag.get(gk);
      if (!g) { g = { tag, category: r.category, rows: [], first: r }; byCatTag.set(gk, g); groups.push(g); }
      g.rows.push(r);
    } else {
      const tk = r.category + SEP + r.description + SEP + (r.instance_note || '');
      const occ = (untaggedOcc.get(tk) || 0) + 1;
      untaggedOcc.set(tk, occ);
      groups.push({ tag: '', category: r.category, rows: [r], first: r, untaggedOcc: occ });
    }
  }

  /* STEP 6 - keys. Occurrence counted per raw tag string across the room. */
  const tagOcc = new Map();
  for (const g of groups) {
    if (g.tag) {
      const n = (tagOcc.get(g.tag) || 0) + 1;
      tagOcc.set(g.tag, n);
      const slug = tagSlug(g.tag);
      if (!slug) die('room ' + roomNo + ': tag ' + JSON.stringify(g.tag) + ' slugs to an empty string');
      g.key = slug + '_' + occSuffix(n);
    } else {
      const basis = g.category + '|' + g.first.description + '|' + (g.first.instance_note || '') + '|' + g.untaggedOcc;
      g.key = 'u_' + md5(basis).slice(0, 10);
    }
  }

  /* Ordering: category band, then tag ascending (untagged last), then description, rowid. */
  const catIdx = (c) => {
    if (!CATEGORY_INDEX.has(c)) die('room ' + roomNo + ': category ' + JSON.stringify(c) + ' is not in CATEGORY_ORDER');
    return CATEGORY_INDEX.get(c);
  };
  const ordered = groups.slice().sort((a, b) => {
    const d = catIdx(a.category) - catIdx(b.category);
    if (d) return d;
    const at = a.tag === '' ? 1 : 0, bt = b.tag === '' ? 1 : 0;
    if (at !== bt) return at - bt;
    if (a.tag !== b.tag) return cmpStr(a.tag, b.tag);
    const dd = cmpStr(a.first.description || '', b.first.description || '');
    if (dd) return dd;
    return a.first.rowid - b.first.rowid;
  });

  /* STEP 3 + STEP 5 - quantity override and sort band. */
  const lines = [];
  const seen = new Set();
  let prevCat = null, ordinal = 0, rowOrdinal = 0;
  let foldedGroups = 0;
  for (const g of ordered) {
    if (g.category !== prevCat) { prevCat = g.category; ordinal = 0; rowOrdinal = 0; } else ordinal++;

    let qty = g.rows.length;
    let overrideRuling = null;
    let overrideBecause = '';
    for (const ov of QTY_OVERRIDES) {
      if (ov.tag === g.tag && ov.category === g.category) { qty = ov.qty; overrideRuling = ov.ruling; overrideBecause = ov.because || ''; }
    }
    /* A ruling that only restates the fold changed nothing and needs no note;
     * a ruling that OVERRIDES the row count is doing work and has to say so. */
    const overrideChanged = !!overrideRuling && qty !== g.rows.length;
    /* No drawing states a count for this line - so it ships without one, the
     * same rule the common-area path uses for a tag group with no printed
     * count. See WORKBOOK_ROWS. */
    const qtyUnknown = g.rows.some((r) => r.qty_unknown);
    if (qtyUnknown) qty = undefined;
    if (g.rows.length > 1) foldedGroups++;

    if (seen.has(g.key)) die('room ' + roomNo + ': key collision ' + JSON.stringify(g.key));
    if (!/^[a-z0-9_]{1,40}$/.test(g.key)) die('room ' + roomNo + ': key ' + JSON.stringify(g.key) + ' violates ^[a-z0-9_]{1,40}$');
    seen.add(g.key);

    lines.push({
      key: g.key,
      code: g.tag,
      category: g.category,
      qty,
      qtyUnknown,
      overrideRuling,
      overrideBecause,
      overrideChanged,
      /* STEP 5 has TWO conventions in the approved work, and which one a room
       * uses is measured off its own approved doc, never assumed. See
       * detectSortConvention(): rooms 101 / 103 advance the band ordinal once
       * per LINE, room 105 advances it once per RAW ROW, so a folded group of
       * two leaves a gap behind it. Rooms 107-115 and the whole King family
       * take their package from 105 and must therefore use 105's numbering. */
      sortByLine: (catIdx(g.category) + 1) * 1000 + ordinal * 10,
      sortByRow: (catIdx(g.category) + 1) * 1000 + rowOrdinal * 10,
      sort: (catIdx(g.category) + 1) * 1000 + (convention === 'row' ? rowOrdinal : ordinal) * 10,
      rawRows: g.rows.length,
      /* The raw rows behind the line, so a ruling can be matched against the
       * row it actually rules on rather than against a rendered string. */
      rows: g.rows,
      sqlite: {
        label: g.first.description,
        src: g.first.primary_sheet || g.first.source_sheet || '',
        reliability: g.first.reliability,
        instanceNote: g.first.instance_note || '',
        note: g.first.note || '',
        trade: g.first.trade_responsible || '',
        derived: g.first.derived,
      },
    });
    rowOrdinal += g.rows.length;
  }

  return {
    lines,
    rawCount: rows.length,
    convention: convention === 'row' ? 'row' : 'line',
    gatedCount: kept.length,
    foldedGroups,
    mepRowCount,
    unknownCategories: [...unknownCategories].sort(cmpStr),
    configDropped: configDropped.map((r) => (r.tag || '<untagged>') + ' [' + r.category + '] - ' + r.description),
    configRuling: drops.ruling,
    configBLeft: drops.b.length,
    drops,
  };
}

function detectSortConvention(approvedItems, red) {
  const tries = [['row', 'sortByRow'], ['line', 'sortByLine']];
  const misses = {};
  for (const [name, field] of tries) {
    const bad = [];
    for (const line of red.lines) {
      const a = approvedItems[line.key];
      if (!a) continue;
      if (line[field] !== a.sort) bad.push(line.key + ': ' + line[field] + ' != approved ' + a.sort);
    }
    if (!bad.length) return { convention: name, misses };
    misses[name] = bad;
  }
  return { convention: null, misses };
}

function sqliteNote(row) {
  const parts = [];
  if (row.instance_note) parts.push(row.instance_note);
  if (row.note) parts.push(row.note);
  const text = parts.join(' — ');
  if (!text) return '';
  return row.reliability === 'HIGH' ? text : '⚑ ' + text;
}

const citeSegments = (s) => String(s || '').split(';').map((x) => x.trim()).filter(Boolean);

const citeJoin = (a) => a.join('; ');

const CITE_VIEW_TOKEN = /\b(views?|elevations?|el\.)(\s*)(\d+(?:\.\d+)?(?:\s*(?:\/|and|,|\+)\s*\d+(?:\.\d+)?)*)/gi;

const CITE_KN_TOKEN = /\b(keyed notes?|keynotes?|kn)(\s*\.?\s*)(\d+(?:\s*(?:\/|and|,)\s*\d+)*)/gi;

const citeNums = (list) => String(list).split(/\s*(?:\/|and|,|\+)\s*/).filter(Boolean);

const citeViewNumbers = (t) => new Set([...String(t || '').matchAll(CITE_VIEW_TOKEN)].flatMap((m) => citeNums(m[3])));

const citeKeynoteNumbers = (t) => new Set([...String(t || '').matchAll(CITE_KN_TOKEN)].flatMap((m) => citeNums(m[3])));

const resolveSheetWildcard = (text, roomSheet) => String(text || '').replace(/A55x/g, roomSheet);

const isMepRow = (r) => MEP_CATEGORIES.has(r.category);

function roomSheetFor(db, room, roomNo) {
  const rt = db.prepare('SELECT room_sheet FROM room_types WHERE type_name = ?').get(room.room_type);
  if (!rt || !rt.room_sheet) die('room ' + roomNo + ': room_types has no room_sheet for ' + JSON.stringify(room.room_type));
  const sheet = String(rt.room_sheet).trim();
  if (/^A\d{3}(\.\d+)?$/.test(sheet)) return sheet;
  const res = ROOM_SHEET_RESOLUTION[roomNo];
  if (!res) {
    die('room ' + roomNo + ': room_types.room_sheet is ' + JSON.stringify(sheet) +
        ' - ambiguous, and no proven resolution exists for this room. Refusing to pick a sheet.');
  }
  return res.sheet;
}

function configConflictNote(rows) {
  const notes = new Set(rows
    .filter((r) => isConfigRow(r))
    .map((r) => String(r.note || '')));
  if (notes.size !== 1) return null;
  const only = [...notes][0];
  return only && /MUTUALLY EXCLUSIVE/.test(only) ? only : null;
}

const isConfigRow = (r) => String(r.description || '').startsWith(CONFIG_A_PREFIX)
  || String(r.description || '').startsWith(CONFIG_B_PREFIX);

function assertSheetNumberingShared(db) {
  const rt = (name) => {
    const row = db.prepare('SELECT type_name, room_sheet, notes FROM room_types WHERE type_name = ?').get(name);
    if (!row) die('room_types has no row for ' + JSON.stringify(name));
    return row;
  };
  const problems = [];
  const facts = [];
  /* WILDCARD evidence: true on ANY A55-series guestroom sheet. */
  const wildcardViews = new Set(), wildcardKeynotes = new Set();
  /* PAIR evidence: true of A550 vs A555 and of NOTHING ELSE. */
  const pairViews = new Set(), pairKeynotes = new Set();

  const king = rt('King Studio'), qq = rt('Queen-Queen');
  const kingConn = rt('King Studio Connecting'), qqConn = rt('QQ Connecting');
  if (king.room_sheet !== KING_PAIR_SHEET) problems.push('King Studio room_sheet is ' + JSON.stringify(king.room_sheet) + ', expected ' + JSON.stringify(KING_PAIR_SHEET));
  if (qq.room_sheet !== MEP_DONOR_SHEET) problems.push('Queen-Queen room_sheet is ' + JSON.stringify(qq.room_sheet) + ', expected ' + JSON.stringify(MEP_DONOR_SHEET));
  if (!String(king.notes).includes('A550 view 01')) problems.push('room_types King Studio notes do not state "A550 view 01"');
  if (!String(qq.notes).includes('A555 view 01')) problems.push('room_types Queen-Queen notes do not state "A555 view 01"');
  pairViews.add('01');
  facts.push('room_types: King Studio "A550 view 01" vs Queen-Queen "A555 view 01" - view 01 is the same view number on both sheets');
  if (!String(kingConn.notes).includes('A550 view 01.1')) problems.push('room_types King Studio Connecting notes do not state "A550 view 01.1"');
  if (!String(qqConn.notes).includes('A555 view 01.1')) problems.push('room_types QQ Connecting notes do not state "A555 view 01.1"');
  if (!String(qqConn.notes).includes('electrical view 04.1')) problems.push('room_types QQ Connecting notes do not state "electrical view 04.1"');
  pairViews.add('01.1');
  facts.push('room_types: "A550 view 01.1" (King Studio Connecting) and "A555 view 01.1 ... + electrical view 04.1" (QQ Connecting) - the ".1" suffix IS the connecting variant, on both sheets');

  /* The same physical row, written for a QQ room and for a King room. */
  const donorPtac = db.prepare("SELECT source_sheet FROM room_items WHERE item_id = 'ITM-0443' LIMIT 1").get();
  const kingPtac = db.prepare("SELECT source_sheet FROM room_items WHERE item_id = 'ITM-0152' LIMIT 1").get();
  if (!donorPtac || !kingPtac) {
    problems.push('room_items is missing the PTAC rows ITM-0443 / ITM-0152 that prove the shared numbering');
  } else {
    const archOf = (t) => citeSegments(t).filter((x) => /^A55\d/.test(x)).join('; ');
    const a = archOf(donorPtac.source_sheet), b = archOf(kingPtac.source_sheet);
    if (!a || !b) problems.push('the PTAC rows carry no A55-series citation to compare');
    else if (a.split(MEP_DONOR_SHEET).join(KING_PAIR_SHEET) !== b) {
      problems.push('room_items ITM-0443 ' + JSON.stringify(a) + ' does not re-point onto ITM-0152 ' +
        JSON.stringify(b) + ' - the A555 -> A550 substitution is NOT proven, refusing to re-point any citation');
    } else {
      /* Only the numbers the two strings ACTUALLY carry are proved - not the
       * substitution as a licence to rewrite anything else. */
      for (const n of citeViewNumbers(b)) pairViews.add(n);
      for (const n of citeKeynoteNumbers(b)) pairKeynotes.add(n);
      facts.push('room_items: ITM-0443 ' + JSON.stringify(a) + ' and ITM-0152 ' + JSON.stringify(b) +
        ' - proves keynote ' + [...citeKeynoteNumbers(b)].join('/') + ' and view ' + [...citeViewNumbers(b)].join('/') +
        ' only, on those two sheets only');
    }
  }

  /* The database's own type-neutral wildcard. 'A55x kn14' / 'A55x view 02' say,
   * in the database's own hand, that the number holds on WHICHEVER A55-series
   * sheet the room uses. That is the only evidence that reaches A552 / A556. */
  for (const r of db.prepare("SELECT DISTINCT source_sheet FROM room_items WHERE source_sheet LIKE '%A55x%'").all()) {
    const t = String(r.source_sheet || '');
    for (const m of t.matchAll(/A55x\s+(?:keyed note|keynotes?|kn)\s*\.?\s*(\d+)/gi)) wildcardKeynotes.add(m[1]);
    for (const m of t.matchAll(/A55x\s+(?:views?|elevations?|el\.)\s*(\d+(?:\.\d+)?)/gi)) wildcardViews.add(m[1]);
  }
  if (!wildcardKeynotes.size) {
    problems.push("room_items carries no 'A55x kn<n>' wildcard citation - the sheet-independent keynote evidence this build relies on is gone");
  }
  facts.push('room_items "A55x" wildcard (the DB\'s own "this room\'s A55-series sheet"): keynote(s) ' +
    [...wildcardKeynotes].sort(cmpStr).join('/') + ' and view(s) ' + [...wildcardViews].sort(cmpStr).join('/') +
    ' are written sheet-independently, so they hold on any A55-series guestroom sheet');

  /* Rows that name BOTH sheets on one reference ('A550/A555 kn5'). */
  const both = db.prepare("SELECT DISTINCT source_sheet FROM room_items WHERE source_sheet LIKE '%A550/A555%' OR source_sheet LIKE '%A555/A550%'").all();
  for (const r of both) {
    const t = String(r.source_sheet || '');
    for (const m of t.matchAll(/A55[05]\s*\/\s*A55[05]\s+(?:keyed note|keynotes?|kn)\s*\.?\s*(\d+)/gi)) pairKeynotes.add(m[1]);
    for (const m of t.matchAll(/A55[05]\s*\/\s*A55[05]\s+(?:views?|elevations?|el\.)\s*(\d+(?:\.\d+)?)/gi)) pairViews.add(m[1]);
  }
  if (both.length) {
    facts.push('room_items rows naming both sheets on one reference (' + both.length + ' distinct citation string(s), e.g. ' +
      JSON.stringify(String(both[0].source_sheet)) + '): keynote(s) ' + [...pairKeynotes].sort(cmpStr).join('/') +
      ' and view(s) ' + [...pairViews].sort(cmpStr).join('/') + ' are proved shared BETWEEN A550 AND A555 ONLY');
  }

  if (problems.length) {
    die('A550 / A555 shared numbering is NOT proven by the database - refusing to re-point MEP citations:\n  ' +
        problems.join('\n  '));
  }
  return { facts, wildcardViews, wildcardKeynotes, pairViews, pairKeynotes };
}

function assertMepCondensationCovers(db, slice) {
  const { rows } = readRoom(db, MEP_DONOR_ROOM);
  const donorIds = rows.filter(isMepRow).map((r) => r.item_id);
  const claimed = new Map();
  for (const [key, ids] of Object.entries(MEP_CONDENSED_SOURCES)) {
    for (const id of ids) {
      if (claimed.has(id)) {
        die('MEP condensation map claims ' + id + ' for both ' + claimed.get(id) + ' and ' + key);
      }
      claimed.set(id, key);
    }
  }
  for (const id of MEP_ROUGH_IN_ITEMS) {
    if (claimed.has(id)) die('MEP condensation map lists ' + id + ' as rough-in AND condenses it onto ' + claimed.get(id));
    claimed.set(id, '<rough-in, deliberately not on the approved punch>');
  }
  const problems = [];
  for (const id of donorIds) {
    if (!claimed.has(id)) problems.push('donor room ' + MEP_DONOR_ROOM + ' row ' + id + ' is not accounted for by the condensation map');
  }
  const donorSet = new Set(donorIds);
  for (const id of claimed.keys()) {
    if (!donorSet.has(id)) problems.push('condensation map names ' + id + ', which is not a MEP row of donor room ' + MEP_DONOR_ROOM);
  }
  const refItems = slice.docs[MEP_DONOR_ROOM + '-MEP'].items;
  const live = Object.keys(refItems).filter((k) => !refItems[k].deleted).sort(cmpStr);
  const mapped = Object.keys(MEP_CONDENSED_SOURCES).sort(cmpStr);
  if (stringify(live) !== stringify(mapped)) {
    problems.push('the condensation map covers ' + mapped.length + ' line key(s); the approved ' +
      MEP_DONOR_ROOM + '-MEP has ' + live.length + ' live line(s) - they must be the same set');
  }
  if (problems.length) die('the D10 condensation map is not sound:\n  ' + problems.join('\n  '));
  return { donorRows: donorIds.length, lines: mapped.length, roughIn: MEP_ROUGH_IN_ITEMS.length };
}

function assertMepConstant(slice) {
  const FIELDS = ['code', 'label', 'qty', 'category', 'src', 'instanceNote',
    'reliability', 'issue', 'trade', 'derived', 'sort'];
  const liveOf = (id) => Object.fromEntries(
    Object.entries(slice.docs[id].items).filter(([, v]) => !v.deleted));
  const base = liveOf('101-MEP');
  const baseKeys = Object.keys(base).sort(cmpStr);
  const deltas = [];
  for (const id of ['103-MEP', '105-MEP']) {
    const other = liveOf(id);
    const otherKeys = Object.keys(other).sort(cmpStr);
    if (stringify(baseKeys) !== stringify(otherKeys)) {
      deltas.push(id + ': live line set differs from 101-MEP');
      continue;
    }
    for (const k of baseKeys) {
      for (const f of FIELDS) {
        if (stringify(base[k][f]) !== stringify(other[k][f])) {
          deltas.push(id + '.' + k + '.' + f + ': ' + JSON.stringify(base[k][f]) + ' != ' + JSON.stringify(other[k][f]));
        }
      }
      if (stringify(base[k].attachments) !== stringify(other[k].attachments)) {
        deltas.push(id + '.' + k + '.attachments differs');
      }
    }
  }
  if (deltas.length) {
    die('MEP is NOT a type-level constant - the copy assumption is void:\n  ' + deltas.join('\n  '));
  }
  return baseKeys.length;
}

function assertDerivationRules(db, slice) {
  const deltas = [];
  const labelNotes = [];
  let checked = 0;
  for (const roomNo of APPROVED_ROOMS) {
    const { room, rows } = readRoom(db, roomNo);
    const red = reduceFFE(roomNo, rows);
    const approved = slice.docs[roomNo].items;

    const want = typeSlug(room.room_type);
    if (slice.docs[roomNo].type !== want) {
      deltas.push('room ' + roomNo + ': type slug ' + JSON.stringify(want) +
        ' != approved ' + JSON.stringify(slice.docs[roomNo].type));
    }
    if (slice.docs[roomNo + '-MEP'].type !== MEP_DOC_TYPE) {
      deltas.push(roomNo + '-MEP: type ' + JSON.stringify(slice.docs[roomNo + '-MEP'].type) +
        ' != ' + JSON.stringify(MEP_DOC_TYPE));
    }

    for (const line of red.lines) {
      const a = approved[line.key];
      if (!a) continue;
      checked++;
      /* HARD rule. src is what re-points a King citation from A555 to A550, so
       * if it ever stops tracking primary_sheet the King build must stop too. */
      if (a.src !== line.sqlite.src) {
        deltas.push(roomNo + '.' + line.key + '.src: sqlite ' + JSON.stringify(line.sqlite.src) +
          ' != approved ' + JSON.stringify(a.src));
      }
      /* SOFT. label tracks room_items.description on every approved line except
       * where an approved submittal enriched it (the garbage disposer gains its
       * Moen model number). Those are exactly the lines whose curated text the
       * composed path carries from the donor, so this is an observation. */
      if (a.label !== line.sqlite.label) {
        labelNotes.push(roomNo + '.' + line.key + ': approved label is enriched beyond sqlite - sqlite ' +
          JSON.stringify(line.sqlite.label) + ' vs approved ' + JSON.stringify(a.label));
      }
    }
  }
  if (deltas.length) {
    die('the src / type-slug derivation rules that the King composition depends on DO NOT HOLD:\n  ' +
        deltas.join('\n  '));
  }
  return { checked, labelNotes };
}

/* ==== END VERBATIM COPY ==== */

/* ==== BEGIN DERIVED COPY (transform declared in RECIPE_DERIVED) ==== */

function repointCiteSegment(seg, roomSheet, isConnecting, numbering, donorSheet) {
  const removed = [];
  const connectingRemoved = [];
  const isProven = (kind, n) => {
    if (kind === 'view' && /\.1$/.test(n) && !isConnecting) { connectingRemoved.push('view ' + n); return false; }
    const wild = kind === 'view' ? numbering.wildcardViews : numbering.wildcardKeynotes;
    if (wild.has(n)) return true;
    /* The pair proof is about A550 vs A555. It reaches no other sheet. */
    if (roomSheet !== KING_PAIR_SHEET) return false;
    const pair = kind === 'view' ? numbering.pairViews : numbering.pairKeynotes;
    return pair.has(n);
  };
  const sift = (kind, singular, plural) => (whole, word, gap, list) => {
    const nums = citeNums(list);
    const keep = nums.filter((n) => isProven(kind, n));
    for (const n of nums) if (!keep.includes(n)) removed.push(kind + ' ' + n);
    /* Nothing removed -> the donor's own wording survives byte for byte. */
    if (keep.length === nums.length) return whole;
    if (!keep.length) return '';
    /* A shortened list is re-written, so the word has to agree with what is left. */
    const many = keep.length > 1;
    const w = /^(kn|el\.)$/i.test(word) ? word
      : /^e/i.test(word) ? (many ? 'elevations' : 'elevation')
      : /^k/i.test(word) ? (many ? 'keynotes' : 'keynote')
      : (many ? plural : singular);
    return w + gap + keep.join('/');
  };

  let out = String(seg)
    .replace(CITE_VIEW_TOKEN, sift('view', 'view', 'views'))
    .replace(CITE_KN_TOKEN, sift('keynote', 'keynote', 'keynotes'));

  /* Tidy the punctuation the removals left behind, without touching wording. */
  out = out
    .replace(/\(\s*(?:and|,|;|\+|\/|\s)*\)/g, '')
    .replace(/\(\s*[,;+/]\s*/g, '(')
    .replace(/\s*[,;+/]\s*\)/g, ')')
    .replace(/\s+([,;.])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/[,;+/]$/, '')
    .trim();

  /* Step 2 - the sheet name itself, last, so the numbers were judged against
   * the DONOR sheet they were written for. */
  out = out.split(donorSheet).join(roomSheet);
  return { text: out, removed, connectingRemoved };
}

function composeMepCitation(donorSrc, mine, roomSheet, isConnecting, numbering, donorSheet) {
  /* ADDED (build_ref_rooms): room 230 sits on the SAME sheet as its donor
   * (QQ Extended room_sheet A555 == Queen-Queen room_sheet A555). There is
   * nothing to re-point, and running the number sift would strip A555 view
   * numbers off a room that IS on A555. So the donor citation stands - with
   * ONE exception, which a shared sheet does not make shared: the '.1'
   * CONNECTING plan variant. See sameSheetCitation(). */
  if (donorSheet === roomSheet) {
    return sameSheetCitation(donorSrc, isConnecting, roomSheet);
  }
  const BOTH = /A55\d\s*\/\s*A55\d/;
  /* This room's own A55-series citation segments, the DB's wildcard resolved. */
  const ownArch = [];
  const ownRowIds = [];
  /* ADDED (build_ref_rooms): the A55-series segments each row contributes,
   * kept PER ROW, so a corroboration claim can be tested number by number
   * instead of on the bare fact that the row cites some A55-series sheet.
   * Room 217 is why: its own rows cite A554.1 view 01/07 and A554 KN30, and
   * the surviving donor segment is "A554 KN1". None of those rows cites KN1,
   * yet all three were being printed as corroborating it. */
  const ownSegsByRow = [];
  for (const r of mine || []) {
    const segs = citeSegments(resolveSheetWildcard(r.source_sheet || r.primary_sheet || '', roomSheet));
    let used = false;
    for (const seg of segs) {
      if (!/A55\d/.test(seg)) continue;
      used = true;
      if (!ownArch.includes(seg)) ownArch.push(seg);
    }
    if (used && !ownRowIds.includes(r.item_id)) ownRowIds.push(r.item_id);
    if (used) ownSegsByRow.push({ id: r.item_id, segs: segs.filter((s) => /A55\d/.test(s)) });
  }

  const kept = [];
  const removed = [];
  const connectingRemoved = [];
  const donorQuoted = [];
  let ownUsed = false;

  for (const seg of citeSegments(donorSrc)) {
    if (!seg.includes(donorSheet) || BOTH.test(seg)) { kept.push(seg); continue; }
    const r = repointCiteSegment(seg, roomSheet, isConnecting, numbering, donorSheet);
    if (r.removed.length) donorQuoted.push(seg);
    removed.push(...r.removed);
    connectingRemoved.push(...r.connectingRemoved);
    if (r.text === roomSheet && ownArch.length) {
      /* Nothing proven survived. This room's own rows carry the citation. */
      ownUsed = true;
      for (const o of ownArch) if (!kept.includes(o)) kept.push(o);
      continue;
    }
    if (r.text) kept.push(r.text);
  }

  let note = '';
  let outcome = '';
  if (removed.length) {
    const uniq = [...new Set(removed)];
    /* What is LEFT pointing at a guestroom sheet, after the removals? */
    const survivors = kept.filter((x) => x.includes(roomSheet) && !BOTH.test(x) &&
      (citeViewNumbers(x).size || citeKeynoteNumbers(x).size));
    /* ADDED (build_ref_rooms): CORROBORATION IS NUMBER BY NUMBER. A row of this
     * room's own corroborates a surviving reference only when it cites one of
     * the SAME view or keynote number ON THIS ROOM'S OWN SHEET. Citing the
     * same SHEET is not evidence - it is the very thing the sift just finished
     * disproving - and citing the same NUMBER on a different sheet is not
     * evidence either. Both tests have to pass. */
    const survivorViews = new Set(survivors.flatMap((x) => [...citeViewNumbers(x)]));
    const survivorKns = new Set(survivors.flatMap((x) => [...citeKeynoteNumbers(x)]));
    const corroborating = ownSegsByRow.filter((o) => o.segs.some((s) => s.includes(roomSheet) && (
      [...citeViewNumbers(s)].some((n) => survivorViews.has(n))
      || [...citeKeynoteNumbers(s)].some((n) => survivorKns.has(n))))).map((o) => o.id);
    outcome = ownUsed ? "replaced by this room's own row(s) " + ownRowIds.join(', ')
      : survivors.length ? 'proven sheet-independent numbering kept: ' + survivors.join('; ')
      : 'sheet cited alone - this room has no row of its own';
    const how = ownUsed
      ? "This room's own row(s) " + ownRowIds.join(', ') + ' supply the ' + roomSheet + ' reference instead.'
      : survivors.length
        ? 'What is left - ' + survivors.map((x) => '"' + x + '"').join(', ') + ' - is numbering the database ' +
          "writes sheet-independently, so it holds on " + roomSheet +
          (corroborating.length
            ? " and this room's own row(s) " + corroborating.join(', ') + ' cite the same number on the same sheet.'
            : ownRowIds.length
              ? '. NO row of this room\'s own cites that number: its own A55-series row(s) (' +
                ownRowIds.join(', ') + ') cite different numbers, so nothing in this room corroborates it. ' +
                'Confirm it on ' + roomSheet + ' before relying on it.'
              : '. This room has no A55-series row of its own to corroborate it - confirm it on ' +
                roomSheet + ' before relying on it.')
        : 'This room has no row of its own that places this line on a guestroom sheet, so the sheet is cited ' +
          'with no view or keynote number at all. Confirm it on ' + roomSheet + ' before relying on one.';
    note = 'CITATION. The donor line cites ' +
      donorQuoted.map((x) => '"' + x + '"').join(' and ') + ' on ' + donorSheet + '. ' +
      'data/project.sqlite proves ' + donorSheet + ' and ' + roomSheet + ' share only the numbers it writes ' +
      "sheet-independently ('A55x kn<n>', 'A55x view 02')" +
      (roomSheet === KING_PAIR_SHEET ? ' plus view 01, view 01.1, KN1 and view 08 on the A550/A555 pair' : '') +
      ', so ' + uniq.join(', ') + ' ' + (uniq.length > 1 ? 'are' : 'is') + ' NOT carried onto ' + roomSheet + '. ' + how;
  }

  return { src: citeJoin(kept), note, removed, connectingRemoved, ownUsed, ownRowIds, outcome };
}

/* ==== END DERIVED COPY ==== */

/* ###########################################################################
 * END OF COPIED RECIPE. Everything below is this tool's own.
 * ######################################################################### */

/* ================== A SHARED SHEET IS NOT A SHARED CONNECTING PLAN
 *
 * build_floor1.mjs proves the '.1' view variant is the CONNECTING plan -
 * room_types, verbatim: "A555 view 01.1 'QQ Studio Conn.' + electrical view
 * 04.1" - and its header records the rule: "It is dropped where
 * rooms.connecting = 0 and kept where it is 1". That rule lives inside
 * repointCiteSegment(), which only ever runs when the donor sheet and the room
 * sheet DIFFER. Room 230 (QQ Extended) shares A555 with donor room 105 and has
 * rooms.connecting = 0, so the whole donor citation used to ride through
 * untouched and five of its lines - elec_panel, elec_outlets, elec_sink_sw,
 * lv_wap, lv_tvdata - pointed a NON-connecting room at the CONNECTING
 * electrical plan, view 04.1.
 *
 * A shared sheet makes the SHEET shared. It does not make the CONNECTING plan
 * shared. So this pass applies exactly ONE rule - drop '.1' views on a
 * non-connecting room - and touches no other number, because every other number
 * on the donor line was written for the sheet this room is actually on.
 * ========================================================================== */

/** Drop the '.1' CONNECTING view variant from one citation segment. */
function dropConnectingViews(seg, isConnecting) {
  const connectingRemoved = [];
  if (isConnecting) return { text: String(seg), connectingRemoved };
  const sift = (whole, word, gap, list) => {
    const nums = citeNums(list);
    const keep = nums.filter((n) => !/\.1$/.test(n));
    for (const n of nums) if (!keep.includes(n)) connectingRemoved.push('view ' + n);
    if (keep.length === nums.length) return whole;
    if (!keep.length) return '';
    const many = keep.length > 1;
    const w = /^(kn|el\.)$/i.test(word) ? word
      : /^e/i.test(word) ? (many ? 'elevations' : 'elevation')
      : /^k/i.test(word) ? (many ? 'keynotes' : 'keynote')
      : (many ? 'views' : 'view');
    return w + gap + keep.join('/');
  };
  /* Same punctuation tidy repointCiteSegment uses, so a shortened list reads
   * the way the approved lines already read. */
  const out = String(seg).replace(CITE_VIEW_TOKEN, sift)
    .replace(/\(\s*(?:and|,|;|\+|\/|\s)*\)/g, '')
    .replace(/\(\s*[,;+/]\s*/g, '(')
    .replace(/\s*[,;+/]\s*\)/g, ')')
    .replace(/\s+([,;.])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/[,;+/]$/, '')
    .trim();
  return { text: out, connectingRemoved };
}

/** The citation for a room that sits on its donor's own sheet. */
function sameSheetCitation(donorSrc, isConnecting, roomSheet) {
  const kept = [];
  const connectingRemoved = [];
  for (const seg of citeSegments(donorSrc)) {
    const r = dropConnectingViews(seg, isConnecting);
    connectingRemoved.push(...r.connectingRemoved);
    if (r.text) kept.push(r.text);
  }
  const uniq = [...new Set(connectingRemoved)];
  const note = uniq.length
    ? 'CITATION. This room sits on the SAME guestroom sheet as the donor (' + roomSheet + '), so every reference ' +
      'on this line stands verbatim with ONE exception: ' + uniq.join(', ') + '. data/project.sqlite room_types ' +
      'identifies the ".1" variant as the CONNECTING plan, verbatim: "A555 view 01.1 \'QQ Studio Conn.\' + ' +
      'electrical view 04.1". This room\'s rooms.connecting is 0, so the connecting plan is not this room\'s plan ' +
      'and is not carried. Nothing else on the line was touched.'
    : '';
  return {
    src: citeJoin(kept), note, removed: [], connectingRemoved, ownUsed: false, ownRowIds: [],
    outcome: uniq.length ? 'connecting-plan view(s) dropped on a non-connecting room: ' + uniq.join(', ') : '',
  };
}

/* --------------------------------------------------- recipe-fidelity prover */

/** Pull one top-level function/const source span out of a module's text. */
function spanOf(src, name) {
  const lines = src.split('\n');
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const starts = [new RegExp('^function ' + esc + '\\('), new RegExp('^const ' + esc + ' = ')];
  for (let i = 0; i < lines.length; i++) {
    if (!starts.some((r) => r.test(lines[i]))) continue;
    if (lines[i].startsWith('function ')) {
      for (let j = i; j < lines.length; j++) if (lines[j] === '}') return lines.slice(i, j + 1).join('\n');
      return null;
    }
    let buf = '', depth = 0;
    for (let j = i; j < lines.length; j++) {
      buf += (j > i ? '\n' : '') + lines[j];
      for (const ch of lines[j]) { if ('([{'.includes(ch)) depth++; else if (')]}'.includes(ch)) depth--; }
      if (depth <= 0 && /;\s*$/.test(lines[j])) return buf;
    }
    return null;
  }
  return null;
}

/**
 * THE COPY CANNOT DRIFT. Re-read build_floor1.mjs from disk, extract every
 * function named in RECIPE_EXACT and RECIPE_DERIVED, and compare it with the
 * copy in THIS file. EXACT spans must match character for character. DERIVED
 * spans must match after the declared transform is applied to build_floor1's
 * own text - so the transform itself is re-checked, not merely asserted.
 *
 * If build_floor1.mjs changes, this build stops and says which function moved.
 * That is the point: the reduction rules have exactly one owner.
 */
function assertRecipeByteFaithful() {
  if (!existsSync(RECIPE_PATH)) die('cannot prove the recipe copy: ' + RECIPE_PATH + ' is missing');
  const theirs = readFileSync(RECIPE_PATH, 'utf8');
  const mine = readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const problems = [];
  let exact = 0, derived = 0;
  for (const name of RECIPE_EXACT) {
    const a = spanOf(theirs, name), b = spanOf(mine, name);
    if (a === null) { problems.push(name + ': not found in build_floor1.mjs'); continue; }
    if (b === null) { problems.push(name + ': not found in this file'); continue; }
    if (a !== b) {
      const al = a.split('\n'), bl = b.split('\n');
      let k = 0; while (k < al.length && k < bl.length && al[k] === bl[k]) k++;
      problems.push(name + ': COPY HAS DRIFTED at line ' + (k + 1) + ' of the span\n      build_floor1: ' +
        JSON.stringify(al[k] === undefined ? '<end>' : al[k]) + '\n      this file   : ' +
        JSON.stringify(bl[k] === undefined ? '<end>' : bl[k]));
      continue;
    }
    exact++;
  }
  for (const [name, transform] of Object.entries(RECIPE_DERIVED)) {
    const a = spanOf(theirs, name), b = spanOf(mine, name);
    if (a === null) { problems.push(name + ': not found in build_floor1.mjs'); continue; }
    if (b === null) { problems.push(name + ': not found in this file'); continue; }
    let want = a;
    for (const [from, to] of transform) {
      if (!want.includes(from)) {
        problems.push(name + ': declared transform no longer applies - build_floor1.mjs does not contain ' +
          JSON.stringify(from.slice(0, 80)));
        want = null; break;
      }
      want = want.split(from).join(to);
    }
    if (want === null) continue;
    if (want !== b) {
      const al = want.split('\n'), bl = b.split('\n');
      let k = 0; while (k < al.length && k < bl.length && al[k] === bl[k]) k++;
      problems.push(name + ': DERIVED COPY HAS DRIFTED at line ' + (k + 1) + ' of the span\n      expected: ' +
        JSON.stringify(al[k] === undefined ? '<end>' : al[k]) + '\n      found   : ' +
        JSON.stringify(bl[k] === undefined ? '<end>' : bl[k]));
      continue;
    }
    derived++;
  }
  if (problems.length) {
    die('the copied reduction recipe no longer matches platform/tools/build_floor1.mjs.\n  ' +
        'The recipe has ONE owner and this tool must not fork it. Re-sync, then re-run:\n  ' +
        problems.join('\n  '));
  }
  return { exact, derived, total: exact + derived };
}

/**
 * The recipe also reads constant TABLES. Re-prove each one against
 * build_floor1.mjs's own source text so a gate category or a condensation entry
 * cannot quietly differ between the two files.
 */
function assertRecipeConstants() {
  const theirs = readFileSync(RECIPE_PATH, 'utf8');
  const checked = [];
  const problems = [];
  const cmp = (label, name, value) => {
    const span = spanOf(theirs, name);
    if (span === null) { problems.push(name + ' not found in build_floor1.mjs'); return; }
    /* Compare the VALUES, by evaluating their literal in isolation. */
    let got;
    try {
      const body = span.replace(new RegExp('^const ' + name + ' = '), 'return ').replace(/;\s*$/, ';');
      got = new Function('"use strict"; ' + body)();
    } catch (e) { problems.push(name + ': could not evaluate build_floor1.mjs literal (' + e.message + ')'); return; }
    const norm = (v) => stringify(v instanceof Set ? [...v].sort(cmpStr) : v instanceof Map ? [...v.entries()] : v);
    if (norm(got) !== norm(value)) problems.push(name + ': table differs from build_floor1.mjs');
    else checked.push(label);
  };
  cmp('APPROVED_ROOMS', 'APPROVED_ROOMS', APPROVED_ROOMS);
  cmp('APPROVED_DOC_IDS', 'APPROVED_DOC_IDS', APPROVED_DOC_IDS);
  cmp('GATE_CATEGORIES (' + GATE_CATEGORIES.size + ')', 'GATE_CATEGORIES', GATE_CATEGORIES);
  cmp('MEP_CATEGORIES (' + MEP_CATEGORIES.size + ')', 'MEP_CATEGORIES', MEP_CATEGORIES);
  cmp('CATEGORY_ORDER (' + CATEGORY_ORDER.length + ')', 'CATEGORY_ORDER', CATEGORY_ORDER);
  cmp('MEP_CONDENSED_SOURCES (' + Object.keys(MEP_CONDENSED_SOURCES).length + ' lines)', 'MEP_CONDENSED_SOURCES', MEP_CONDENSED_SOURCES);
  cmp('MEP_ROUGH_IN_ITEMS (' + MEP_ROUGH_IN_ITEMS.length + ')', 'MEP_ROUGH_IN_ITEMS', MEP_ROUGH_IN_ITEMS);
  cmp('MEP_LABEL_FROM_ROW', 'MEP_LABEL_FROM_ROW', MEP_LABEL_FROM_ROW);
  cmp('APP_MEP_CATEGORY_ORDER (' + APP_MEP_CATEGORY_ORDER.size + ')', 'APP_MEP_CATEGORY_ORDER', APP_MEP_CATEGORY_ORDER);
  cmp('RULED_LINE_ADDITIONS (D27/D28)', 'RULED_LINE_ADDITIONS', RULED_LINE_ADDITIONS);
  for (const [n, v] of [['MEP_DONOR_ROOM', MEP_DONOR_ROOM], ['MEP_DONOR_SHEET', MEP_DONOR_SHEET],
    ['KING_PAIR_SHEET', KING_PAIR_SHEET], ['MEP_DOC_TYPE', MEP_DOC_TYPE],
    ['CONFIG_A_PREFIX', CONFIG_A_PREFIX], ['CONFIG_B_PREFIX', CONFIG_B_PREFIX],
    ['PTAC_DONOR_M401', PTAC_DONOR_M401], ['PTAC_NAMEPLATE', PTAC_NAMEPLATE],
    ['FP_COUNT_SENTENCE', FP_COUNT_SENTENCE]]) {
    const span = spanOf(theirs, n);
    if (span === null) { problems.push(n + ' not found in build_floor1.mjs'); continue; }
    if (!span.includes(JSON.stringify(v).slice(1, -1)) && !span.includes(v)) problems.push(n + ' differs from build_floor1.mjs');
    else checked.push(n);
  }
  if (problems.length) {
    die('a constant table this tool copied from build_floor1.mjs no longer matches it:\n  ' + problems.join('\n  '));
  }
  return checked;
}

/* --------------------------------------------------------------- guardrails */

/** Nothing outside OUT_PATH may be written. Proved by mtime, before and after. */
function snapshotProtectedFiles() {
  const out = {};
  for (const p of [...new Set(NEVER_WRITE)]) {
    if (existsSync(p)) { const s = statSync(p); out[p] = s.mtimeMs + ':' + s.size; }
  }
  return out;
}

/* ============================================================ ruled drops OFF
 *
 * DELIBERATE DIVERGENCE FROM build_floor1.mjs, and the only one in the ruled-
 * drop path. build_floor1's configADrops() DIES when a room carries
 * Configuration A rows and no ruling closes the tub-versus-roll-in question,
 * because on floor 1 that could only mean a missing ruling.
 *
 * Here it means something else: ruling D19 answered the question for ROOM 118
 * AND FOR NO OTHER KEY. Rooms 217 and 238 are two of the seven accessible keys
 * the conflict is open on. The right answer is not to stop and not to pick -
 * it is to CARRY BOTH configurations, FLAGGED, with the database's own words.
 *
 * So this version drops NOTHING, ever, and returns the conflict note so the
 * lines and the room note can quote it verbatim. If a ruling is ever added to
 * CONFIG_A_DROP_ROOMS this reverts to build_floor1's exact behaviour.
 * ========================================================================== */
function configADrops(roomNo, rows) {
  const a = rows.filter((r) => String(r.description || '').startsWith(CONFIG_A_PREFIX));
  const b = rows.filter((r) => String(r.description || '').startsWith(CONFIG_B_PREFIX));
  if (!a.length) return { ids: new Set(), ruling: null, a: [], b, conflictNote: null, carried: false };
  const ruling = CONFIG_A_DROP_ROOMS[roomNo];
  if (ruling) {
    if (!b.length) {
      die('room ' + roomNo + ': dropping the ' + a.length + ' Configuration A (TUB) row(s) per ruling ' +
          ruling + ' would leave NO Configuration B (ROLL-IN SHOWER) row behind. Refusing.');
    }
    return { ids: new Set(a.map((r) => r.rowid)), ruling, a, b, conflictNote: configConflictNote(rows), carried: false };
  }
  /* NO RULING. Carry everything, resolve nothing. */
  return { ids: new Set(), ruling: null, a, b, conflictNote: configConflictNote(rows), carried: true };
}

/** Is this row one of the two mutually exclusive bathing configurations? */
const configOf = (r) => (String(r.description || '').startsWith(CONFIG_A_PREFIX) ? 'A'
  : String(r.description || '').startsWith(CONFIG_B_PREFIX) ? 'B' : null);

/* --------------------------------------------------- scoped quantity rulings */

/**
 * Decide which QTY_OVERRIDE_RULES actually apply to this room, and why. The
 * decision is made HERE, outside the byte-exact recipe, and is reported for
 * every room whether it applied or not.
 */
function resolveQtyOverrides(room, rows) {
  const gated = rows.filter((r) => GATE_CATEGORIES.has(r.category));
  const queenBeds = rows.filter((r) => /Queen Mattress Set/.test(String(r.description || ''))).length;
  const kingBeds = rows.filter((r) => /King Mattress Set/.test(String(r.description || ''))).length;
  const applied = [], declined = [];
  for (const rule of QTY_OVERRIDE_RULES) {
    const here = gated.filter((r) => r.tag === rule.tag && r.category === rule.category);
    if (!here.length) {
      declined.push({ ruling: rule.ruling, tag: rule.tag, why: 'this room carries no ' + rule.tag +
        ' row in ' + rule.category + ' - the ruling has nothing to act on' });
      continue;
    }
    const tagsInCategory = new Set(gated.filter((r) => r.category === rule.category).map((r) => r.tag).filter(Boolean));
    const verdict = rule.scope({ roomType: room.room_type, tagsInCategory, queenBeds, kingBeds, rows: here });
    if (verdict.apply) {
      applied.push({ ruling: rule.ruling, tag: rule.tag, from: here.length, to: rule.qty, why: verdict.why, rule });
    } else {
      declined.push({ ruling: rule.ruling, tag: rule.tag, why: verdict.why, sqliteQty: here.length });
    }
  }
  QTY_OVERRIDES = applied.map((a) => a.rule);
  return { applied, declined, queenBeds, kingBeds };
}

/* ------------------------------------------------------------- file loading */

function loadSlice() {
  if (!existsSync(SLICE_PATH)) die('approved slice not found at ' + SLICE_PATH);
  const slice = JSON.parse(readFileSync(SLICE_PATH, 'utf8'));
  for (const id of ['101', '103', '105', '101-MEP', '103-MEP', '105-MEP']) {
    if (!slice.docs || !slice.docs[id]) die('approved slice is missing doc ' + id);
  }
  return slice;
}

function loadDonorFile() {
  if (!existsSync(DONOR_PATH)) {
    die('the LIVE floor-1 seed is not at ' + DONOR_PATH + '. It is the package-text donor for ' +
        'every one of these rooms and there is no substitute - build floor 1 first.');
  }
  const live = JSON.parse(readFileSync(DONOR_PATH, 'utf8'));
  const need = new Set();
  for (const r of Object.values(REP_ROOMS)) { need.add(r.donor); need.add(r.donor + '-MEP'); }
  for (const id of [...need].sort(cmpStr)) {
    if (!live.docs || !live.docs[id]) die('floor1-staged.json has no doc ' + id + ' to donate package text from');
  }
  return live;
}

/** The sort convention, measured off the approved slice exactly as floor 1 does. */
function conventionOf(db, slice, refNo) {
  const { rows } = readRoom(db, refNo);
  QTY_OVERRIDES = QTY_OVERRIDE_RULES.map((r) => r);   /* floor-1 behaviour, for the measurement only */
  const red = reduceFFE(refNo, rows);
  const got = detectSortConvention(slice.docs[refNo].items, red);
  if (!got.convention) {
    die('neither sort convention reproduces approved room ' + refNo + ' - refusing to number a new room:\n  ' +
        Object.entries(got.misses).map(([k, v]) => k + ': ' + v.join('; ')).join('\n  '));
  }
  return got.convention;
}

/**
 * The donor documents in floor1-staged.json are what these rooms are numbered
 * against, so re-derive each donor room from sqlite under the measured
 * convention and prove its sort values still reproduce the LIVE doc. If the
 * live floor has drifted from the recipe, stop rather than number a new room
 * against a number the app no longer uses.
 */
function assertDonorNumbering(db, live, convention) {
  const out = [];
  for (const donorNo of [...new Set(Object.values(REP_ROOMS).map((r) => r.donor))].sort(cmpStr)) {
    const { room, rows } = readRoom(db, donorNo);
    resolveQtyOverrides(room, rows);
    const red = reduceFFE(donorNo, rows, convention);
    const items = live.docs[donorNo].items;
    const bad = [];
    for (const l of red.lines) {
      const a = items[l.key];
      if (!a || a.deleted) continue;
      if (l.sort !== a.sort) bad.push(l.key + ': recipe ' + l.sort + ' != live ' + a.sort);
      if (l.qty !== a.qty) bad.push(l.key + ': qty ' + l.qty + ' != live ' + a.qty);
    }
    if (bad.length) {
      die('LIVE donor room ' + donorNo + ' no longer reproduces from the recipe under convention "' +
          convention + '" - refusing to number a new room against it:\n  ' + bad.join('\n  '));
    }
    out.push('room ' + donorNo + ': ' + red.lines.length + ' recipe line(s) reproduce the live doc on (qty, sort)');
  }
  return out;
}

/* =========================================================================== 
 * WHICH CONDENSED MEP LINE DOES ONE OF THIS ROOM'S ROWS FILL?
 *
 * On floor 1 the answer was a hand-written list of item_ids (MEP_VARIANT_SLOTS)
 * because there were three rooms to place. Four more types would mean four more
 * hand-written lists, and a hand-written list is a place to make a mistake.
 *
 * The database answers it itself. The D10 condensation was written against the
 * donor's rows; a row in ANOTHER room whose category AND description are
 * character-for-character the donor row's is THE SAME PRODUCT, transcribed for
 * a different key. That is evidence, not a guess, and it is checked:
 *
 *  - the map is built ONLY from the rows MEP_CONDENSED_SOURCES already names,
 *  - a description claimed by two different line keys aborts the build,
 *  - and CONFIGURATION A / CONFIGURATION B rows are EXCLUDED outright. That
 *    exclusion is the whole reason this is safe: room 217's roll-in shower row
 *    must NOT be allowed to slide into the standard shower's slot, because
 *    doing that would silently answer the question Austin has not answered.
 * =========================================================================== */
function buildDescSlotMap(db) {
  const byKey = new Map();      // "category\0description" -> line key
  const unitRows = new Map();   // line key -> [donor row, ...]
  const problems = [];
  let skippedConfig = 0;
  for (const [key, ids] of Object.entries(MEP_CONDENSED_SOURCES)) {
    for (const id of ids) {
      const r = db.prepare('SELECT category, description FROM room_items WHERE item_id = ? LIMIT 1').get(id);
      if (!r) { problems.push('condensation map names ' + id + ', which is not in room_items'); continue; }
      if (configOf(r)) { skippedConfig++; continue; }
      const dk = r.category + SEP + r.description;
      if (byKey.has(dk) && byKey.get(dk) !== key) {
        problems.push('description ' + JSON.stringify(String(r.description).slice(0, 60)) +
          ' is claimed by both ' + byKey.get(dk) + ' and ' + key + ' - cannot place it unambiguously');
        continue;
      }
      byKey.set(dk, key);
      if (!unitRows.has(key)) unitRows.set(key, []);
      unitRows.get(key).push({ item_id: id, category: r.category, description: r.description });
    }
  }
  if (problems.length) die('the description-identity slot map is not sound:\n  ' + problems.join('\n  '));
  return { byKey, unitRows, skippedConfig, size: byKey.size };
}

/* ================================================= sprinkler head count: NONE
 *
 * The donor line has already had its honest "head count varies by room" sentence
 * REPLACED by room 104's / 105's own head-by-head take-off, because those rooms
 * have sprinkler rows. None of these four rooms has a single Fire Sprinkler row,
 * and placeholder PH-GU-001 says head counts were read on rooms 107 and 108 only.
 *
 * So the donor's take-off is taken back out and PH-GU-001's own words go in, and
 * THE LINE SHIPS WITH NO QUANTITY - the same way a workbook-only FF&E line and
 * space S017's tag 404 already ship. An omitted count is recoverable in the
 * field; a fabricated one is not.
 *
 * THE CITATION HAS TO COME OUT TOO, and the first version of this tool forgot it.
 * The instanceNote said "NO HEAD COUNT IS VERIFIED FOR THIS ROOM TYPE" while the
 * `src` on the very same line still read "FP-1 head schedule ... 144 total heads
 * 1st floor" and "FP-1, verified head-by-head on rooms 107 and 108". Both of
 * those are the DONOR's row text (room_items.source_sheet on rooms 104/105) and
 * both are false here twice over: this room is on FLOOR 2, and no head in it was
 * ever verified. A crew member reading that line was being sent to a first-floor
 * sheet with a first-floor total.
 *
 * So every FP-series segment is REMOVED and quoted in the note as removed, and
 * what replaces it is PH-GU-001's own suggested_sheet plus this room's own
 * rooms.floor. Nothing asserts WHICH of FP-1 / FP-2 / FP-3 covers floor 2,
 * because data/project.sqlite nowhere says so - it names the three sheets and
 * stops, and so does this line.
 * ========================================================================== */
const FP_HEADS_KEY = 'fp_heads_a';
/* Any sprinkler row at all, matched on CATEGORY rather than on a list of
 * item_ids, so a head this tool has never seen still trips the guard. */
const sprinklerRowsIn = (rows) => (rows || []).filter((r) => r.category === 'Fire Sprinkler' || r.category === 'Fire Protection');
const FP_TAKEOFF_RE = /this room's own take-off is [\s\S]*?Verify every head you can see\./;
/* A citation segment that names a sprinkler sheet. FP-1/FP-2/FP-3 are the three
 * PH-GU-001 names; the pattern is the series, not a hard-coded FP-1. */
const FP_SHEET_RE = /\bFP-\d\b/;

/* citeSegments() is the recipe's own splitter and it splits on EVERY semicolon.
 * The sprinkler citation carries semicolons INSIDE a parenthetical - "FP-1 head
 * schedule, both rows (... K=4.3; ... K=5.6; 144 total heads 1st floor)" - so
 * the recipe splitter cuts one citation into three and only the first piece
 * still names FP-1. Removing on that split left "144 total heads 1st floor)"
 * behind on a floor-2 room. This splitter honours parentheses. It is used ONLY
 * where a whole segment has to be removed or quoted; the recipe's own splitter
 * is untouched and still governs every path build_floor1.mjs owns. */
function citeSegmentsBalanced(s) {
  const out = [];
  let buf = '', depth = 0;
  for (const ch of String(s || '')) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (ch === ';' && depth === 0) { out.push(buf.trim()); buf = ''; continue; }
    buf += ch;
  }
  out.push(buf.trim());
  return out.filter(Boolean);
}

function fpNoCount(db, roomNo, roomType, donorNo, item, report, floor) {
  const ph = db.prepare("SELECT * FROM placeholders WHERE placeholder_id = 'PH-GU-001'").get();
  if (!ph) die('placeholder PH-GU-001 is missing from data/project.sqlite - refusing to ship a sprinkler line without it');
  if (!FP_TAKEOFF_RE.test(String(item.instanceNote))) {
    die('room ' + roomNo + ': donor ' + donorNo + '-MEP ' + FP_HEADS_KEY + ' no longer carries a room-specific ' +
        'head take-off clause. This tool was written to REMOVE that clause and must not run blind - re-read the ' +
        'donor line and re-check this code.');
  }
  /* The donor's FP-series citation is a fact about the donor's floor and about
   * the two rooms the count was read on. It does not travel. */
  const segs = citeSegmentsBalanced(item.src);
  const donorFp = segs.filter((s) => FP_SHEET_RE.test(s) || /\d+ total heads|head-by-head/i.test(s));
  const kept = segs.filter((s) => !donorFp.includes(s));
  if (!donorFp.length) {
    die('room ' + roomNo + ': donor ' + donorNo + '-MEP ' + FP_HEADS_KEY + ' no longer cites an FP-series sheet. ' +
        'This tool was written to REMOVE that citation and must not run blind - re-read the donor line.');
  }
  const replacementSeg = ph.suggested_sheet + ' (the sprinkler sheets data/project.sqlite placeholder ' +
    ph.placeholder_id + ' names, and it names no more than that). ROOM ' + roomNo + ' IS ON FLOOR ' + floor +
    ' - read the sheet that covers floor ' + floor + '. The donor line cited a FIRST-FLOOR sheet with a ' +
    'first-floor head total; that citation is NOT carried onto this room';
  const removedSentence = ' CITATION NOT CARRIED: the donor line (room ' + donorNo + ') cited ' +
    donorFp.map((x) => '"' + x + '"').join(' and ') + '. That is room ' + donorNo + "'s own row text - a FLOOR 1 " +
    'sheet, a floor-1 head total, and a head-by-head verification performed on rooms 107 and 108. Room ' + roomNo +
    ' is on FLOOR ' + floor + ' and has NO Fire Sprinkler row of its own in data/project.sqlite, so none of it is ' +
    'carried here. What replaces it is ' + ph.placeholder_id + "'s own suggested sheet list, verbatim: \"" +
    ph.suggested_sheet + '". Which of those covers floor ' + floor + ' is not stated anywhere in ' +
    'data/project.sqlite and is not guessed here.';
  const replacement = 'NO HEAD COUNT IS VERIFIED FOR THIS ROOM TYPE, and none is asserted here. ' +
    'data/project.sqlite placeholders ' + ph.placeholder_id + ' (' + ph.suggested_sheet + '), verbatim: "' +
    ph.what_is_missing + '" Why it is left open, verbatim: "' + ph.why + '" ' +
    'The donor line (room ' + donorNo + ') carries a count of ' + item.qty + ' taken off its OWN rows; that count ' +
    'is NOT copied here and THIS LINE SHIPS WITH NO QUANTITY AT ALL. ' + FP_COUNT_SENTENCE;
  /* The donor's own prose around the take-off names FP-1 as well ("Ceiling and
   * side-wall heads per the FP-1 rows"). That is the same floor-1 reference, so
   * it is neutralised in the surviving prose - and ONLY there, so that the
   * quoted-as-removed segments below keep the donor's words byte for byte. */
  const m = FP_TAKEOFF_RE.exec(String(item.instanceNote));
  const neutral = (t) => t.replace(/\bFP-\d\b/g, 'sprinkler head-schedule');
  const kernel = neutral(String(item.instanceNote).slice(0, m.index)) + replacement
    + neutral(String(item.instanceNote).slice(m.index + m[0].length));
  const out = clone(item);
  out.instanceNote = kernel + removedSentence;
  out.src = citeJoin([...kept, replacementSeg]);
  out.reliability = 'MEDIUM';
  delete out.qty;
  report.fpNoCount = FP_HEADS_KEY + ': donor qty ' + item.qty + ' NOT copied; line ships with no quantity, ' +
    'reliability MEDIUM, carrying PH-GU-001 verbatim; ' + donorFp.length + ' donor FP-series citation segment(s) ' +
    'removed (floor-1 sheet, floor-1 total, rooms 107/108 verification) and replaced with ' + ph.placeholder_id +
    "'s own sheet list plus this room's floor (" + floor + ')';
  return out;
}

/* ============================================================== the PTAC mark
 *
 * Room 104's line reads code "PTAC-1" because 104's own row resolved it and the
 * composed build wrote that resolution into the note. NONE of these four rooms
 * resolves it, and they fail to resolve it in two different ways:
 *
 *   202 / 217   TWO PTAC rows, BOTH UNTAGGED, both FLAGGED. The database says
 *               "NO PTAC mark is stated for this type."
 *   230 / 238   ONE row tagged "PTAC-2 / PTAC-1" - the dual mark carried with no
 *               winner picked, FLAGGED.
 *
 * The donor's resolution is therefore CUT OUT and replaced with this room's own
 * rows, quoted. The mark is whatever this room's rows say, and empty if they say
 * nothing. Both markers are asserted before anything is cut.
 * ========================================================================== */
const PTAC_RESOLVED_RE = /This room's own row resolves the mark:[\s\S]*?(?=Model reads off the nameplate:)/;

function ptacFromOwnRows(roomNo, item, mine, report) {
  if (!mine.length) return item;
  if (!String(item.instanceNote).includes(PTAC_NAMEPLATE)) {
    die('room ' + roomNo + ': the donor mech_ptac note no longer contains the nameplate sentence - ' +
        'the PTAC resolution was written against that text and must not run blind');
  }
  const out = clone(item);
  const hadDonorResolution = PTAC_RESOLVED_RE.test(String(item.instanceNote));
  let base = String(item.instanceNote).replace(PTAC_RESOLVED_RE, '');

  const marks = [...new Set(mine.map((r) => r.tag).filter(Boolean))];
  const flagged = mine.some((r) => String(r.reliability).toUpperCase() === 'FLAGGED');
  const quotes = mine.map((r) => 'room_items ' + r.item_id + (r.instance_note ? ' ("' + r.instance_note + '")' : '') +
    ', tag ' + (r.tag ? JSON.stringify(r.tag) : 'NONE') +
    ', reliability ' + r.reliability + (r.note ? ' — "' + r.note + '"' : '')).join('  |  ');

  const verdict = marks.length === 0
    ? 'THE MARK IS UNRESOLVED AND IS LEFT BLANK. This room\'s own row(s) carry NO PTAC mark at all.'
    : marks.length === 1 && /\//.test(marks[0])
      ? 'THE MARK IS UNRESOLVED. This room\'s own row carries BOTH marks, ' + marks[0] +
        ', with no winner picked, and it is shipped exactly that way.'
      : 'This room\'s own row(s) state the mark: ' + marks.join(' / ') + '.';

  base = base.replace(/\s+$/, '') + ' ' + verdict + ' Source row(s), verbatim: ' + quotes + '. ' +
    (hadDonorResolution
      ? 'The donor room ' + report.donorRoom + ' line resolved its own mark from its own row; THAT RESOLUTION IS ' +
        'NOT CARRIED HERE and has been removed, because it is a fact about room ' + report.donorRoom + '. '
      : '') +
    (mine.length > 1
      ? 'THIS ROOM HAS ' + mine.length + ' PTAC UNITS, not one - the quantity on this line is this room\'s own row count. '
      : '');
  out.instanceNote = base.replace(/\s{2,}/g, ' ').trim();
  out.code = marks.length === 1 ? marks[0] : (marks.length ? marks.join(' / ') : '');
  if (flagged) out.reliability = 'FLAGGED';
  report.ptac = 'mech_ptac: ' + mine.length + ' unit row(s) ' + mine.map((r) => r.item_id).join(', ') +
    '; mark ' + (out.code ? JSON.stringify(out.code) : 'NONE (unresolved, left blank)') +
    '; reliability ' + out.reliability + (hadDonorResolution ? "; donor's own-row resolution removed" : '');
  return out;
}

/* ============================ the donor's OWN citation note is not this room's
 *
 * Eight of room 104-MEP's twenty-three lines end in a paragraph that begins
 * "CITATION. The approved Queen-Queen line cites ...". That paragraph was
 * written BY build_floor1 ABOUT ROOM 104: it records which view and keynote
 * numbers survived the A555 -> A550 re-point when the King Studio was composed.
 *
 * It is a true statement about room 104 and a FALSE one about room 202. Left in
 * place it would tell a crew standing in a King One Bedroom that "view 03 is
 * NOT carried onto A550" - naming a sheet this room is not on, about a re-point
 * that is not this room's. So it is removed, and THIS room's own re-point note
 * (composed against THIS room's sheet, a line below) takes its place.
 *
 * Removing it loses nothing: every number it discusses is re-judged for this
 * room from scratch, against this room's sheet, on this run.
 * ========================================================================== */
const DONOR_CITE_PARAGRAPH_RE = /\s*CITATION\. The (?:approved Queen-Queen|donor) line cites [\s\S]*$/;

function stripDonorCitationNote(text) {
  const s = String(text || '');
  if (!DONOR_CITE_PARAGRAPH_RE.test(s)) return { text: s, stripped: false };
  return { text: s.replace(DONOR_CITE_PARAGRAPH_RE, '').trim(), stripped: true };
}

/** What replaces it: the same fact, told about THIS room. */
function ownRepointNote(donorNo, donorSheet, roomSheet) {
  return 'CITATION. The text and the citation on this line come from LIVE room ' + donorNo + ', whose own ' +
    'guestroom sheet is ' + donorSheet + '; the sheet name is mapped to this room\'s sheet ' + roomSheet + ' and ' +
    'every view and keynote number is re-judged for ' + roomSheet + ' from the database on this run. ' +
    'data/project.sqlite proves no view-numbering pair between ' + donorSheet + ' and ' + roomSheet +
    ' (the only pair it proves is A550/A555), so only numbering the database writes sheet-independently ' +
    '(\'A55x kn<n>\', \'A55x view 02\') survives, plus this room\'s own rows. The donor line carried its own ' +
    're-point note about ' + donorSheet + '; that is a fact about room ' + donorNo + ' and has been removed. ' +
    'A segment carrying no view or keynote number is mapped on the sheet name alone - confirm it on ' + roomSheet + '.';
}

/* ==================================================== the unresolved bathroom
 *
 * plmb_shower_a and plmb_shencl_a are the two condensed lines whose label IS the
 * product description (MEP_LABEL_FROM_ROW). In rooms 217 and 238 there is no
 * neutral product to put there: the room's only bathing rows are the mutually
 * exclusive Configuration A and Configuration B rows, and Austin has not ruled.
 *
 * Both configurations ship as their own FLAGGED lines further down. These two
 * condensed lines keep the donor's product text - dropping a line from Austin's
 * approved D10 punch is not this tool's call - but they are marked FLAGGED and
 * relabelled with the house CONFIGURATION prefix so that nobody reads the
 * standard-room fixture as an answer for an accessible key.
 * ========================================================================== */
const CONFLICT_LABEL_PREFIX = 'BATHING CONFIGURATION UNRESOLVED (TUB vs ROLL-IN) - the text below is the ' +
  'STANDARD guestroom fixture, NOT a ruling for this key: ';

function bathingUnresolvedLine(roomNo, key, item, drops, donorNo) {
  const out = clone(item);
  const listOf = (rows) => rows.map((r) => (r.tag ? r.tag + ' ' : '') + r.item_id + ' "' +
    String(r.description).replace(CONFIG_A_PREFIX, '').replace(CONFIG_B_PREFIX, '') + '"').join('; ');
  out.label = CONFLICT_LABEL_PREFIX + item.label;
  out.reliability = 'FLAGGED';
  out.instanceNote = (item.instanceNote ? item.instanceNote + ' ' : '') +
    'CONFLICT CARRIED, NOT RESOLVED. Room ' + roomNo + ' is one of the seven accessible keys on which the ' +
    'tub-versus-roll-in question is OPEN. This room has NO neutral bathing row of its own: everything it ' +
    'carries is one configuration or the other, and every one of those rows is FLAGGED in ' +
    'data/project.sqlite. The product text on this line is donor room ' + donorNo + "'s STANDARD guestroom " +
    'fixture and it is NOT an answer for this key. ' +
    'CONFIGURATION A (TUB) rows in this room: ' + listOf(drops.a) + '. ' +
    'CONFIGURATION B (ROLL-IN SHOWER) rows in this room: ' + listOf(drops.b) + '. ' +
    'Every one of them is emitted on its own line in this document or on the FF&E document. ' +
    'Austin ruling D19 put ROOM 118 on the roll-in shower; D19 IS SCOPED TO ROOM 118 AND REACHES NO OTHER KEY, ' +
    'and ruling D26 records that the room-118 tub-mark RFI is ON HOLD at his instruction. ' +
    'data/project.sqlite states the conflict this way, verbatim: "' + (drops.conflictNote || '') + '"';
  return out;
}

/* ===================================== A DONOR MAY ENRICH. IT MAY NOT LAUNDER.
 *
 * The first build handed the donor line's `reliability` AND `instanceNote`
 * straight onto every shared tag. That is wrong in both directions and it shipped
 * five real defects:
 *
 *   238 gr403_a  sqlite FLAGGED with "F-5 - A556 tags GR-403 AND GR-404 ...
 *                ALTERNATES ... DO NOT BUY BOTH" shipped HIGH with an empty note,
 *                because donor room 105 is HIGH - and room 105 is HIGH only
 *                because it has no GR-404 alternate. A fact about room 105 is not
 *                evidence about room 238.
 *   238 hd12_a   FLAGGED "ASSUMPTION - see HD-02 note" shipped HIGH, blank, while
 *                its three identical siblings shipped FLAGGED with the note.
 *   238 hd08_a   FLAGGED "ASSUMPTION - see HD-02 note" shipped MEDIUM carrying
 *                room 105's reason, "elevation-sourced - not a takeoff".
 *   217 hd08_a   own row says "counts as stated by A533's own summary block";
 *                the donor's opposite caveat shipped in its place.
 *   217 905_a    sqlite MEDIUM ("second tag read at MEDIUM") shipped HIGH.
 *
 * THE RULE, and it is the same rule the citations already follow:
 *
 *   RELIABILITY  the TARGET room's own data/project.sqlite reliability governs.
 *                A donor may RAISE it only where the donor's own text carries a
 *                RULING that closes the flag for the PRODUCT - Austin's D11
 *                submittal closures, which name a model number and not a room -
 *                and the line then says so in words. Nothing else moves a flag.
 *   TEXT         where the room's own row carries words, THOSE words govern. The
 *                donor's note rides on top only when it carries a ruling or a
 *                submittal, i.e. something data/project.sqlite structurally
 *                cannot hold. A donor note that is a READING OF THE DONOR'S OWN
 *                DRAWING is dropped, and the line records that it was dropped and
 *                quotes what it said.
 *                Where the room's own row is silent there is nothing to
 *                contradict, so the approved package text rides whole - and the
 *                line still says where it came from.
 *   LABEL        the room's own row's description governs unless the donor's
 *                label EXTENDS it (same opening text, more of it).
 *   CITATION     always the room's own row. Never the donor's.
 *
 * Every one of those decisions is written onto the line as a SOURCE sentence, so
 * a reader never has to guess which document a word came from.
 * ========================================================================== */

/* The exact shape build_floor1.mjs writes when Austin closes a flag by ruling.
 * Asserted to still exist in the LIVE donor file on every run. */
const DONOR_FLAG_CLOSURE_RE = /Flag closed by AJ ruling \d{4}-\d{2}-\d{2}\./;
/* A donor note that is a ruling or a submittal - the two things the database
 * cannot hold, and therefore the only two things a donor may add to a line whose
 * own row already speaks. */
const DONOR_ENRICHMENT_RE = /(Approved submittal on file|Submittal on file|Flag closed by AJ ruling|Austin rul)/;

const RELIABILITY_RANK = { FLAGGED: 1, MEDIUM: 2, HIGH: 3 };
const relRank = (r) => RELIABILITY_RANK[String(r).toUpperCase()] || 0;

/* The database's own notes rarely end in a full stop. Sentences from different
 * documents get joined on one line, so each one gets a stop of its own rather
 * than running into the next. Nothing else about the text is touched. */
const endStop = (s) => (/[.!?:"'”)\]]$/.test(String(s).trim()) ? String(s).trim() : String(s).trim() + '.');

/** The room's OWN words for one line. Per-row instance notes ride the fold. */
function ownLineText(line) {
  const rows = line.rows || [];
  if (rows.length <= 1) {
    return [line.sqlite.instanceNote, line.sqlite.note].filter(Boolean).join(' — ');
  }
  const notes = [];
  for (const r of rows) {
    const n = String(r.note || '').trim();
    if (n && !notes.includes(n)) notes.push(n);
  }
  return notes.join(' — ');
}

/**
 * WHY THE QUANTITY IS WHAT IT IS. A folded line's number is a row count, and the
 * rows say what each one is. 217's telephone shipped "qty 2" with a blank note
 * and no way to tell where the second one came from; this is that sentence.
 */
function foldSentence(roomNo, line) {
  const rows = line.rows || [];
  if (rows.length <= 1) return '';
  const each = rows.map((r) => r.item_id + (r.instance_note ? ' "' + r.instance_note + '"' : ' (no row note)') +
    (String(r.reliability).toUpperCase() !== 'HIGH' ? ' [' + r.reliability + ']' : '') +
    ' [cited: ' + (r.primary_sheet || r.source_sheet || 'no citation') + ']').join(', ');
  return 'QTY ' + rows.length + ' IS THIS ROOM\'S OWN FOLD, not a donor count: data/project.sqlite transcribes ' +
    rows.length + ' separate row(s) for ' + (line.code ? 'tag ' + line.code : 'this untagged item') + ' in room ' +
    roomNo + ' - ' + each + '. The quantity on this line is that row count and nothing else.';
}

/* ============================================== THE CONFLICTS TABLE ALSO RIDES
 *
 * data/project.sqlite has a `conflicts` table and the first build never read it.
 * B4.2 (GR-905 vs the 905 telephone tag) and B4.5 (GR tags ambiguous without
 * A530) are both OPEN, both name tags these rooms ship, and both appeared
 * nowhere - so the reader of room 202 saw one side of a two-sided question and
 * the reader of room 230 saw four takeoff-grade ambiguities as HIGH.
 *
 * Matching is mechanical and deliberately narrow, so nothing arrives by accident:
 *   - a ROOM KEY of this type named in the entry (with a non-alphanumeric
 *     boundary either side, so sheet names like "M302" and "P202" do not count);
 *   - a TAG this room carries, of at least two characters and containing a digit
 *     (so the thermostat tag "T" does not match the letter T in "A100 marks T");
 *   - slash-run tag families are expanded first, because the table writes
 *     "GR-300/305/307/308/318/322/323/325" and means eight tags.
 * Only OPEN entries ride. Every match lands on the line that carries the tag,
 * FLAGGED, with the entry quoted verbatim, and every match - line or not - is
 * listed in room note n_conflicts.
 * ========================================================================== */

/* A row whose OWN note says the documents disagree - matched on the database's
 * own vocabulary, never authored. Used to decide what rides in n_gategaps, so a
 * conflict is carried on the presence of the conflict and not on how confident
 * the transcriber was. */
const CONFLICT_IN_NOTE_RE = /conflict|conflicts\.md|contradic|mutually exclusive|do not buy|not stated|RFI\b/i;

const CONFLICT_TAG_FAMILY = /\b([A-Z]{2,}-)(\d+(?:\.\d+)?)((?:\s*\/\s*\d+(?:\.\d+)?)+)/g;
const reEsc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const conflictTagUsable = (t) => String(t).length >= 2 && /\d/.test(String(t));

/** The entry's own text, with slash-run tag families spelled out. */
function conflictHaystack(c) {
  const base = [c.topic, c.positions, c.source].map((x) => String(x || '')).join('  ');
  const extra = [];
  for (const m of base.matchAll(CONFLICT_TAG_FAMILY)) {
    if (!extra.includes(m[1] + m[2])) extra.push(m[1] + m[2]);
    for (const n of m[3].split('/').map((s) => s.trim()).filter(Boolean)) {
      if (!extra.includes(m[1] + n)) extra.push(m[1] + n);
    }
  }
  return base + (extra.length ? '  ' + extra.join(' ') : '');
}

function openConflictsFor(db, roomNo, keys, rows) {
  const tags = [...new Set(rows.map((r) => r.tag).filter(Boolean))].filter(conflictTagUsable).sort(cmpStr);
  const out = [];
  for (const c of db.prepare('SELECT * FROM conflicts ORDER BY conflict_id').all()) {
    if (String(c.status).toUpperCase() !== 'OPEN') continue;
    const hay = conflictHaystack(c);
    const hitKeys = keys.filter((k) => new RegExp('(^|[^0-9A-Za-z-])' + k + '([^0-9A-Za-z]|$)').test(hay));
    const hitTags = tags.filter((t) => new RegExp('(^|[^0-9A-Za-z-])' + reEsc(t) + '([^0-9A-Za-z]|$)').test(hay));
    if (!hitKeys.length && !hitTags.length) continue;
    out.push({ id: c.conflict_id, c, keys: hitKeys, tags: hitTags });
  }
  return out;
}

/** The entry, verbatim, as it rides on a line or in a note. */
function conflictQuote(h) {
  return 'OPEN DOCUMENT CONFLICT ' + h.id + ', carried from the data/project.sqlite conflicts table and NOT ' +
    'resolved here. Source: ' + h.c.source + '. Status: ' + h.c.status + '. Topic, verbatim: "' + h.c.topic +
    '". Positions, verbatim: "' + h.c.positions + '"';
}

/** Conflicts that name the tag this line carries. */
const conflictsOnTag = (hits, code) => (code ? hits.filter((h) => h.tags.includes(code)) : []);

/* ================================= THE PTAC SUB-ASSEMBLY REPEATS, OR IT DOESN'T
 *
 * Rooms 202 and 217 carry TWO PTAC units and their own second-unit row says, in
 * the database's own words, that the whole ten-row sub-assembly "REPEATS for this
 * second unit" - sleeve, louver, drain kit, low-ambient kit, fresh-air kit,
 * filter, access panel, EMS controller, THERMOSTAT, sub-base. The database
 * transcribes each of those ten rows ONCE, marked "PTAC 1".
 *
 * So mech_tstat shipped qty 1 at HIGH, with no flag, in a room whose own rows say
 * "thermostat x2". That is a documented count conflict resolved to 1 in silence.
 *
 * It is not resolved here either. The count is NOT doubled - inventing a row the
 * database does not transcribe would be the same fabrication in the other
 * direction - and the line is FLAGGED with the room's own words on it. Carried
 * and flagged, never resolved.
 * ========================================================================== */
const PTAC_UNIT_RE = /^Packaged terminal A\/C unit/;
const PTAC_SUBASSEMBLY_REPEAT_RE = /The whole \d+-row PTAC sub-assembly[\s\S]*?REPEATS for this second unit/;
const PTAC_MEMBER_RE = /^PTAC \d+$/;

/** { units, repeatNote } for a room - the open second-unit question, or null. */
function ptacRepeat(rows) {
  const units = rows.filter((r) => PTAC_UNIT_RE.test(String(r.description || '')));
  if (units.length < 2) return null;
  const withNote = units.map((r) => (PTAC_SUBASSEMBLY_REPEAT_RE.exec(String(r.note || '')) || [null])[0]).filter(Boolean);
  if (!withNote.length) return null;
  return { units, quote: withNote[0], ids: units.map((r) => r.item_id) };
}

/* -------------------------------------------------------------- room notes */

const noteOf = (text, stamp, flag) => ({ text, flag: flag || 'info', resolved: false, createdAt: stamp, by: '' });

/**
 * Every note QUOTES a document. None is authored. Ids are stable so a rebuild
 * stays byte-identical.
 */
function buildRoomNotes(db, roomNo, room, rows, red, drops, stamp, report) {
  const notes = {};
  const spec = REP_ROOMS[roomNo];

  notes.n_type = noteOf(
    'REFERENCE ROOM, STAGED FOR APPROVAL - NOT LIVE. Room ' + roomNo + ' is the representative key for room type "' +
    room.room_type + '" (' + spec.keys.length + ' key(s) on this type: ' + spec.keys.join(', ') + '). ' +
    'Sheets: ' + spec.sheets + '. ' +
    'Austin ruling D24 records that this type has no approved reference room, so one reference room is built and ' +
    'approved before the type generates at scale; ruling D28 sets the sequence and asks for the full mock-up first. ' +
    'Package text for the tags this type shares with a built type is carried from LIVE room ' + spec.donor + ' (' +
    spec.donorType + ') - ' + spec.why + ' Any tag with no counterpart in room ' + spec.donor +
    ' ships from data/project.sqlite verbatim, with its own reliability.', stamp);

  if (room.note) {
    notes.n_dbroom = noteOf('FROM THE DRAWING RECORD (data/project.sqlite rooms.note for room ' + roomNo +
      ', verbatim): "' + room.note + '"', stamp);
  }

  /* The bathing conflict, carried whole. */
  if (drops.carried) {
    const listOf = (r) => (r.tag ? r.tag + ' ' : '') + r.item_id + ' [' + r.category + '] "' + r.description + '"';
    notes.n_config = noteOf(
      'BATHING CONFIGURATION - OPEN. NOBODY HAS RULED ON THIS KEY. Room ' + roomNo + ' carries ' + drops.a.length +
      ' Configuration A (TUB) row(s) and ' + drops.b.length + ' Configuration B (ROLL-IN SHOWER) row(s). They are ' +
      'MUTUALLY EXCLUSIVE - only one gets built - and every one of them is FLAGGED in data/project.sqlite. ' +
      'BOTH ARE EMITTED ONTO THIS CHECKLIST AND NEITHER IS SUPERSEDED - which is the database\'s own word, ' +
      'EMITTED, and is not a statement that both get built. Only one of them gets built. Build what the answer ' +
      'turns out to be. Do not order a bath package for this key. ' +
      'data/project.sqlite records it this way, verbatim: "' + (drops.conflictNote || '') + '" ' +
      'room_types "' + room.room_type + '" adds, verbatim: "' + (report.roomTypeNotes || '') + '" ' +
      'WHAT IS AND IS NOT RULED: Austin ruling D19 (2026-08-20) put ROOM 118 on the ROLL-IN SHOWER. That ruling names ' +
      'room 118 and only room 118; it does not reach room ' + roomNo + ', and this tool has not extended it. ' +
      'Ruling D26 (2026-08-24) records his instruction to HOLD the room-118 tub-mark RFI. ' +
      'CONFIGURATION A (TUB) rows here: ' + drops.a.map(listOf).join('; ') + '. ' +
      'CONFIGURATION B (ROLL-IN SHOWER) rows here: ' + drops.b.map(listOf).join('; ') + '.', stamp, 'issue');
  }

  /* Conflicts and gaps that cannot ride on a line because their category sits
   * outside Austin's approved checklist gate. They ride here instead of being
   * lost. Each quotes the row. */
  /* WHICH gated-out rows ride here was the second defect in this note. It was
   * scoped to FLAGGED and MEDIUM rows only, so three rows on room 202 whose own
   * sqlite note states an explicit DOCUMENT CONFLICT vanished without a record
   * purely because the transcriber rated them HIGH - ITM-0073 and ITM-0074
   * ("rating design conflict carried - A300 prints UL U340, A315 cites UL
   * U301"), and ITM-0108, which cites conflicts.md A11. Reliability is a
   * statement about how well the row was read. It is not a statement about
   * whether a conflict exists. A conflict rides on the presence of the conflict.
   */
  const gateNotes = [];
  let gateConflicts = 0;
  for (const r of rows) {
    if (GATE_CATEGORIES.has(r.category) || MEP_CATEGORIES.has(r.category)) continue;
    const own = [r.instance_note, r.note].filter(Boolean).join(' — ');
    const statesConflict = CONFLICT_IN_NOTE_RE.test(own);
    if (String(r.reliability).toUpperCase() === 'HIGH' && !statesConflict) continue;
    if (statesConflict) gateConflicts++;
    gateNotes.push((r.tag || '<untagged>') + ' [' + r.category + ', ' + r.reliability +
      (statesConflict ? ', STATES A DOCUMENT CONFLICT' : '') + '] ' + r.item_id +
      ' "' + r.description + '"' + (r.instance_note ? ' (' + r.instance_note + ')' : '') +
      (r.note ? ' — data/project.sqlite note, verbatim: "' + r.note + '"' : '') +
      ' [cited: ' + (r.source_sheet || r.primary_sheet || 'no citation') + ']');
  }
  if (gateNotes.length) {
    notes.n_gategaps = noteOf(
      'ROWS THAT CANNOT CARRY A CHECKLIST LINE. ' + gateNotes.length + ' row(s) in this room are either FLAGGED or ' +
      'MEDIUM in data/project.sqlite, or state a DOCUMENT CONFLICT in their own note at any reliability (' +
      gateConflicts + ' of them do), and sit in a category outside Austin\'s approved checklist gate (the gate keeps ' +
      'Paint, Drywall, Flooring, Doors, Stone / Surround, Wall Covering and FF&E - Misc out of BOTH documents, which ' +
      'is how every approved floor-1 room already works). They are recorded here so the conflict is not lost with ' +
      'the line. A HIGH row that states a conflict is listed too: how well a row was READ says nothing about ' +
      'whether the documents AGREE. Widening the gate is Austin\'s call, not this tool\'s. ' +
      gateNotes.join('  ||  '), stamp, 'issue');
  }

  /* Placeholders the database itself raises against THIS room type.
   *
   * Matching on the type name alone is not enough: "King One Bedroom" is a
   * PREFIX of "King One Bedroom Acc.", so a naive substring test hangs room
   * 217's bathing-configuration gap on room 202 as well. A type name counts as
   * mentioned only where at least one of its occurrences is NOT the opening of
   * a LONGER type name at the same position. A placeholder naming one of this
   * type's own room keys also counts. */
  const allTypes = db.prepare('SELECT type_name FROM room_types').all().map((r) => r.type_name);
  const mentionsType = (text, name) => {
    const hay = String(text);
    const longer = allTypes.filter((t) => t !== name && t.startsWith(name));
    let i = hay.indexOf(name);
    while (i !== -1) {
      if (!longer.some((t) => hay.startsWith(t, i))) return true;
      i = hay.indexOf(name, i + 1);
    }
    return false;
  };
  const phs = db.prepare("SELECT * FROM placeholders WHERE scope = 'guestroom'").all().filter((p) => {
    const hay = String(p.topic) + ' ' + String(p.what_is_missing) + ' ' + String(p.suggested_sheet);
    return mentionsType(hay, room.room_type)
      || spec.keys.some((k) => new RegExp('(^|[^0-9])' + k + '([^0-9]|$)')
        .test(String(p.topic) + ' ' + String(p.what_is_missing)));
  });
  if (phs.length) {
    notes.n_gaps = noteOf(
      'DOCUMENT GAPS THE DATABASE RAISES AGAINST THIS ROOM TYPE - nothing here has been filled in, and nothing ' +
      'here was added to the checklist. ' +
      phs.map((p) => p.placeholder_id + ' (' + p.topic + ', suggested sheet ' + p.suggested_sheet + '): "' +
        p.what_is_missing + '"' + (p.why ? ' Why it stays open: "' + p.why + '"' : '')).join('  ||  '), stamp, 'issue');
  }

  /* Ruling D22 - deliberately NOT applied to these types. */
  if (report.d22) notes.n_d22 = noteOf(report.d22, stamp, 'issue');

  /* EVERY OPEN ENTRY IN THE CONFLICTS TABLE THAT TOUCHES THIS ROOM.
   *
   * The lines carry the ones that name a tag they hold. This note carries ALL of
   * them, including the ones that name a tag the category gate keeps off both
   * documents (room 202's GR-905, and the W4 / W5 drywall types) and the ones
   * that name a KEY of this type rather than a tag (A11 names room 338). A
   * conflict that has nowhere to sit is exactly the conflict that gets lost. */
  const conflictHits = openConflictsFor(db, roomNo, spec.keys, rows);
  if (conflictHits.length) {
    notes.n_conflicts = noteOf(
      'OPEN DOCUMENT CONFLICTS THAT TOUCH THIS ROOM - ' + conflictHits.length + ' entr(y/ies) in the ' +
      'data/project.sqlite conflicts table, quoted verbatim, every one of them status OPEN. NOTHING HERE IS ' +
      'RESOLVED BY THIS TOOL. Wherever a line in this package carries one of the tags an entry names, that line is ' +
      'FLAGGED and carries the entry with it. An entry that names a tag the category gate keeps off both documents, ' +
      'or that names one of this type\'s room keys (' + spec.keys.join(', ') + ') rather than a tag, has no line ' +
      'to sit on and is carried here only. ' +
      conflictHits.map((h) => h.id + ' [' + h.c.source + ']' +
        (h.tags.length ? ' names tag(s) ' + h.tags.join(', ') : '') +
        (h.keys.length ? ' names room key(s) ' + h.keys.join(', ') + ' of this type' : '') +
        ' - topic, verbatim: "' + h.c.topic + '"; positions, verbatim: "' + h.c.positions + '"').join('  ||  '),
      stamp, 'issue');
  }

  /* THE QUANTITY RULINGS, DECIDED OR DECLINED, ON EVERY ROOM.
   *
   * meta.rulingsApplied says "D12 (scoped)" for the whole FILE. That does not
   * tell an approver reading ROOM 202 whether D12 was declined on purpose or
   * simply forgotten. Each room now records the decision and the reason, even
   * where the ruling changed nothing. */
  const ov = report.qtyOverrides;
  if (ov && (ov.applied.length || ov.declined.length)) {
    const lines = [];
    for (const a of ov.applied) {
      lines.push(a.ruling + ' on ' + a.tag + ': APPLIED - ' + (a.from === a.to
        ? 'and it CHANGED NOTHING, because data/project.sqlite already draws ' + a.from + ' here. It is recorded so ' +
          'the number is known to be the ruling\'s and the drawing\'s at once.'
        : 'qty ' + a.from + ' -> ' + a.to + ', and the line itself says so.') + ' Why: ' + a.why + '.');
    }
    for (const d of ov.declined) {
      lines.push(d.ruling + ' on ' + d.tag + ': CONSIDERED AND DECLINED. Why: ' + d.why +
        (d.sqliteQty !== undefined ? ' The line ships qty ' + d.sqliteQty + ', which is what this room\'s own ' +
          'drawing tags.' : ''));
    }
    notes.n_rulings = noteOf(
      'AUSTIN\'S QUANTITY RULINGS, EVALUATED FOR THIS ROOM. Each ruling below was tested against THIS room\'s own ' +
      'evidence, not applied on the tag alone, and the outcome is recorded whether it changed the count or not. ' +
      'Bed count in this room: ' + ov.queenBeds + ' queen, ' + ov.kingBeds + ' king. ' + lines.join('  ||  '), stamp);
  }

  /* The second PTAC, and the ten rows the database transcribes once. */
  const ptac2 = ptacRepeat(rows);
  if (ptac2) {
    notes.n_ptac2 = noteOf(
      'TWO PTAC UNITS, ONE TRANSCRIBED SUB-ASSEMBLY - OPEN, CARRIED, NOT RESOLVED. data/project.sqlite gives room ' +
      roomNo + ' ' + ptac2.units.length + ' PTAC unit rows (' + ptac2.ids.join(', ') + '), both FLAGGED, and the ' +
      'second one says, verbatim: "' + ptac2.quote + '" The database transcribes each of those ten member rows ' +
      'ONCE, marked "PTAC 1". So the quantity on every condensed line fed by one of them - the thermostat and the ' +
      'room grille among them - is a ONE that this room\'s own row says should be a TWO, and no document states the ' +
      'second set as its own rows. Neither number is asserted here: the lines ship the transcribed count, FLAGGED, ' +
      'carrying this text. COUNT WHAT IS INSTALLED. Closing it means either a document that states the second set ' +
      'or Austin\'s ruling.', stamp, 'issue');
  }

  report.roomNotes = Object.keys(notes).sort(cmpStr);
  return notes;
}

/** The D22 scope decision, stated for every room that carries GR-305 or GR-308. */
function d22ScopeNote(db, room, roomNo, rows) {
  const hit = rows.filter((r) => r.tag === 'GR-308' || r.tag === 'GR-305');
  if (!hit.length) return null;
  const r = hit[0];
  const f1plain = db.prepare("select count(*) n from rooms where floor = 1 and room_type = 'Queen-Queen'").get().n;
  const f1conn = db.prepare("select count(*) n from rooms where floor = 1 and room_type in ('QQ Connecting','QQ Wide Connecting')").get().n;
  const sameType = db.prepare('select count(*) n from rooms where room_type = ?').get(room.room_type).n;
  return 'WORKING WALL TAG - RULING D22 IS DELIBERATELY NOT APPLIED TO THIS ROOM, and the naming question is OPEN ' +
    'for this type. This room carries ' + r.tag + ', exactly as data/project.sqlite transcribes it' +
    (r.note ? ' — the row\'s own note, verbatim: "' + r.note + '"' : '') + '. ' +
    'Austin ruling D22 (2026-08-20) corrected GR-308 to GR-305 on the plain Queen-Queen rooms, and the ONLY thing ' +
    'that made it evidence rather than a guess was an exact reconciliation on the FF&E Installation workbook\'s ' +
    '1st Floor tab: GR-305 Working Wall @ QQ at 6 units against the ' + f1plain + ' plain Queen-Queen keys on floor 1, ' +
    'and GR-308 Working Wall @ QQ Connector at 2 units against the ' + f1conn + ' QQ connecting keys. Six and two, ' +
    'no remainder. THAT ARITHMETIC SAYS NOTHING ABOUT THIS TYPE. Room ' + roomNo + ' is "' + room.room_type +
    '" (' + sameType + ' key(s) building-wide), which is neither of the two types D22 reconciled, and it is not on ' +
    'floor 1. Carrying D22 across would be extending a ruling past its evidence, so the tag ships as transcribed and ' +
    'reliability is unchanged. TO CLOSE THIS: check the 2nd / 3rd / 4th Floor FF&E Installation tabs for a GR-305 ' +
    'or GR-308 line against this type and confirm with RK Design before any casework is released. Note also that ' +
    'D22 left the GR-305 handedness (2 LEFT, 4 RIGHT) open on floor 1, and ruling D26 records that Austin is ' +
    'answering that one himself.';
}

/* ======================================================== the FF&E document */

function buildFFEDoc(db, roomNo, live, convention, stamp, report) {
  const spec = REP_ROOMS[roomNo];
  const { room, rows } = readRoom(db, roomNo);
  const donorNo = spec.donor;
  const ref = live.docs[donorNo];

  report.roomType = room.room_type;
  report.donorRoom = donorNo;
  report.donorType = spec.donorType;
  const rt = db.prepare('SELECT room_sheet, bath_sheet, notes FROM room_types WHERE type_name = ?').get(room.room_type) || {};
  report.roomTypeNotes = rt.notes || '';

  /* Rulings, scoped to their evidence, decided before the reduction runs. */
  const ov = resolveQtyOverrides(room, rows);
  report.qtyOverrides = ov;

  const red = reduceFFE(roomNo, rows, convention);
  report.rawRows = red.rawCount;
  report.gatedRows = red.gatedCount;
  report.foldedGroups = red.foldedGroups;
  report.mepRowCount = red.mepRowCount;
  report.unknownCategories = red.unknownCategories;
  report.gateDropped = rows.length - red.gatedCount - red.mepRowCount;
  report.d22 = d22ScopeNote(db, room, roomNo, rows);

  /* Donor index. LIVE lines only - a retired tombstone is not a source. */
  const refIndex = new Map();
  const donorKey = (category, code, key) => (code ? category + SEP + code : 'u' + SEP + key);
  let donorTombstones = 0;
  for (const k of Object.keys(ref.items)) {
    const v = ref.items[k];
    if (DONOR_INDEX_SKIPS_DELETED && v.deleted) { donorTombstones++; continue; }
    const dk = donorKey(v.category, v.code, k);
    if (refIndex.has(dk)) {
      die('room ' + roomNo + ': donor room ' + donorNo + ' has two live lines matching ' + JSON.stringify(dk));
    }
    refIndex.set(dk, { key: k, item: v });
  }
  report.donorTombstonesSkipped = donorTombstones;

  const items = {};
  const fromDonor = [], fromSqlite = [], donorQtyNotes = [], donorLabelNotes = [], overrideNotes = [];
  const flagged = [], configLines = [], declinedLines = [];
  const relKept = [], donorTextDropped = [], donorClosures = [], conflictLines = [];
  const drops = configADrops(roomNo, rows);

  /* Every OPEN entry in the conflicts table that names this room's keys or one
   * of its tags. Read once, used on the lines and again in the room note. */
  const conflictHits = openConflictsFor(db, roomNo, spec.keys, rows);
  report.conflictHits = conflictHits.map((h) => h.id + (h.tags.length ? ' [tags ' + h.tags.join(', ') + ']' : '') +
    (h.keys.length ? ' [keys ' + h.keys.join(', ') + ']' : ''));

  for (const line of red.lines) {
    const hit = refIndex.get(donorKey(line.category, line.code, line.key));
    const tagLabel = line.code || '<untagged>';
    const ownText = ownLineText(line);
    const rowIds = line.rows.map((r) => r.item_id).join(', ');
    /* SOURCE sentences. Every decision this loop makes is written onto the line
     * so a reader never has to guess which document a word came from. They are
     * kept apart until the end because a ruling-scope decision REPLACES the
     * package text, and a "where the text came from" sentence must not survive
     * text that is no longer there. */
    const prov = [];
    let provText = '';
    let pkg, source;
    if (hit) {
      /* SHARED tag. Shape and citation are this room's own; the donor supplies
       * trade, derived and submittal links, and may ENRICH the text - see
       * "A DONOR MAY ENRICH. IT MAY NOT LAUNDER." above. */
      const r = hit.item;
      const donorText = String(r.instanceNote || '');
      const donorExtends = r.label.length > line.sqlite.label.length && r.label.startsWith(line.sqlite.label);
      if (r.label !== line.sqlite.label) {
        donorLabelNotes.push(tagLabel + ': ' + (donorExtends
          ? 'donor label extends sqlite (' + JSON.stringify(r.label) + ') - donor text carried'
          : "this room's own sqlite label " + JSON.stringify(line.sqlite.label) + ' differs from donor ' +
            JSON.stringify(r.label) + ' - own row carried'));
        prov.push(donorExtends
          ? 'LABEL. This room\'s own data/project.sqlite row reads "' + line.sqlite.label + '". The approved line for ' +
            'this tag on LIVE room ' + donorNo + ' extends that same text to "' + r.label + '", so the longer ' +
            'wording ships. The tag, the count and the citation are still this room\'s own.'
          : 'LABEL. This room\'s own data/project.sqlite row reads "' + line.sqlite.label + '" and that is what ships. ' +
            'LIVE room ' + donorNo + ' labels the same tag "' + r.label + '"; that is a fact about room ' + donorNo + '.');
      }
      if (r.qty !== line.qty) {
        donorQtyNotes.push(tagLabel + ': qty ' + line.qty + ' here vs ' + r.qty +
          ' in donor room ' + donorNo + ' (sqlite governs; the donor supplies text only)');
      }

      /* RELIABILITY. This room's own row governs. A donor raises it only on a
       * ruling that closes the flag for the product. */
      const closes = DONOR_FLAG_CLOSURE_RE.test(donorText);
      let reliability = line.sqlite.reliability;
      if (r.reliability !== line.sqlite.reliability) {
        if (relRank(r.reliability) > relRank(line.sqlite.reliability) && closes) {
          reliability = r.reliability;
          donorClosures.push(line.key + ' (' + tagLabel + '): ' + line.sqlite.reliability + ' -> ' + r.reliability +
            ' on the ruling closure carried in the donor text');
          prov.push('RELIABILITY. data/project.sqlite has this room\'s row at ' + line.sqlite.reliability +
            '. The line ships at ' + r.reliability + ' because the approved package for this tag carries a RULING ' +
            'that closes that flag for the PRODUCT - it names a model, not a room - and that ruling text is on this ' +
            'line above. Nothing else may move a flag.');
        } else {
          relKept.push(line.key + ' (' + tagLabel + '): sqlite ' + line.sqlite.reliability + ' KEPT over donor ' +
            r.reliability);
          prov.push('RELIABILITY. The reliability on this line starts from THIS room\'s own data/project.sqlite ' +
            'row(s) ' + rowIds + ', which read ' + line.sqlite.reliability + '. LIVE room ' + donorNo +
            ' carries the same tag at ' + r.reliability + ', which is a fact about room ' + donorNo +
            ' and not evidence about this room. A donor may enrich a line; it may not close its flag.');
        }
      }

      /* TEXT. Where this room's row speaks, it governs. */
      let base;
      if (ownText) {
        base = ownText;
        if (donorText && DONOR_ENRICHMENT_RE.test(donorText)) {
          base = endStop(base) + ' FROM THE APPROVED PACKAGE for ' +
            (line.code ? 'tag ' + line.code : 'this untagged item') + ' (LIVE room ' + donorNo + '), carried ' +
            'because it is a ruling or a submittal and data/project.sqlite holds neither: ' +
            donorText.replace(/^⚑\s*/, '');
        } else if (donorText && donorText.replace(/^⚑\s*/, '') !== ownText) {
          donorTextDropped.push(line.key + ' (' + tagLabel + '): ' + JSON.stringify(donorText.slice(0, 60)));
          provText = ('TEXT. This room\'s own row(s) ' + rowIds + ' carry their own words and those govern the line. ' +
            'The approved line for this tag on LIVE room ' + donorNo + ' carries different text, verbatim: "' +
            donorText + '". That is room ' + donorNo + '\'s reading of room ' + donorNo + '\'s own drawing, it ' +
            'carries no ruling and no submittal, and it is NOT carried here.');
        }
      } else {
        base = donorText;
        if (donorText) {
          provText = ('TEXT. This room\'s own data/project.sqlite row(s) ' + rowIds + ' carry no note, so the wording ' +
            'above is the approved package text for tag ' + tagLabel + ', carried from LIVE room ' + donorNo +
            ' (' + spec.donorType + '). The citation, the count and the reliability on this line are this room\'s own.');
        }
      }
      pkg = {
        label: donorExtends ? r.label : line.sqlite.label,
        src: line.sqlite.src,
        reliability,
        instanceNote: base,
        trade: r.trade,
        derived: r.derived,
        attachments: r.attachments,
      };
      source = 'DONOR ' + donorNo;
      fromDonor.push(tagLabel);
      prov.push('SOURCE. Shape (category, tag, quantity, key, sort) and citation from data/project.sqlite room ' +
        roomNo + '\'s own row(s) ' + rowIds + '; package text from the approved line for ' +
        (line.code ? 'tag ' + line.code : 'this untagged item') + ' on LIVE room ' + donorNo +
        ' (' + spec.donorType + ').');
    } else {
      /* TYPE-ONLY tag: no live counterpart anywhere. Everything from the DB row,
       * verbatim, at the DB's own reliability. Nothing is borrowed from another
       * room type and nothing is invented. */
      pkg = {
        label: line.sqlite.label,
        src: line.sqlite.src,
        reliability: line.sqlite.reliability,
        instanceNote: ownText,
        trade: line.sqlite.trade,
        derived: line.sqlite.derived,
        attachments: undefined,
      };
      source = 'SQLITE';
      fromSqlite.push(tagLabel + (line.sqlite.reliability !== 'HIGH' ? ' [' + line.sqlite.reliability + ']' : ''));
      prov.push('SOURCE. Everything on this line is data/project.sqlite room ' + roomNo + '\'s own row(s) ' + rowIds +
        ', verbatim, at the database\'s own reliability. LIVE room ' + donorNo + ' has no line for ' +
        (line.code ? 'tag ' + line.code : 'this untagged item') + ', so nothing here was borrowed from another ' +
        'room type.');
    }

    if (!pkg.src) {
      report.unresolved.push(line.key + ' (' + (line.code || '<untagged>') +
        '): no source sheet in sqlite and none in the donor - refusing to emit an uncited line');
      continue;
    }

    /* A ruling that OVERRODE the row count has to say so on the line. */
    if (line.overrideChanged) {
      const own = ownText
        ? " This room's own row(s) " + rowIds + ' carry this text, verbatim: "' + ownText + '".'
        : " This room's own rows number " + line.rawRows + '.';
      const why = (report.qtyOverrides.applied.find((a) => a.tag === line.code) || {}).why || '';
      pkg.instanceNote = 'Austin ruling ' + line.overrideRuling + ': ' + line.overrideBecause + '.' + own +
        ' Applied here because ' + why + '. The line therefore ships qty ' + line.qty + ' on the ruling rather than ' +
        'on the ' + line.rawRows + ' row(s) the drawing set tags. Confirm both positions in the field before ordering.';
      overrideNotes.push(line.key + ': qty ' + line.rawRows + ' -> ' + line.qty + ' per ruling ' + line.overrideRuling);
      provText = 'TEXT. The wording above is the RULING, written here from Austin ruling ' + line.overrideRuling +
        ' and this room\'s own row(s) ' + rowIds + '. It replaces whatever package text this tag carries elsewhere, ' +
        'because a note that describes a different count beside this one would contradict the number next to it.';
    }

    /* A ruling this room is OUTSIDE the scope of must not arrive on the line
     * anyway, wearing the donor's words. Room 238 is the case that forced this:
     * donor room 105 carries GR-322 at qty 3 under ruling D12, with a curated
     * note that says "the drawings tag the family once as GR-322". Room 238's
     * drawing (A556:54) tags all three separately - GR-319, GR-322, GR-323 - so
     * the line correctly ships qty 1, and the donor's note would have sat
     * beside that 1 asserting 3 and describing a drawing this room does not
     * have. The note is replaced with the scope decision, and the donor's own
     * words are quoted inside it rather than deleted. */
    const declined = report.qtyOverrides.declined.find((x) => x.tag === line.code && x.sqliteQty !== undefined);
    if (declined) {
      const donorSays = hit && hit.item.qty !== line.qty
        ? 'Donor room ' + donorNo + ' carries this line at qty ' + hit.item.qty + ' under that ruling, with this note, ' +
          'verbatim: "' + (hit.item.instanceNote || '(none)') + '" THAT COUNT AND THAT NOTE ARE NOT CARRIED HERE. '
        : '';
      pkg.instanceNote = 'RULING SCOPE - ' + declined.ruling + ' WAS CONSIDERED FOR THIS LINE AND DELIBERATELY NOT ' +
        'APPLIED. ' + donorSays + 'Why: ' + declined.why + ' This line therefore ships qty ' + line.qty +
        ', which is what this room\'s own drawing tags' +
        (ownText ? ' - data/project.sqlite text on this room\'s own row(s) ' + rowIds + ', verbatim: "' + ownText + '"' : '') + '.' +
        /* Only if it says something the sentence above has not already quoted. */
        (pkg.instanceNote && !donorSays && !String(ownText).includes(pkg.instanceNote.replace(/^⚑ /, ''))
          ? ' Carried note: ' + JSON.stringify(pkg.instanceNote) : '');
      declinedLines.push(line.key + ' (' + declined.ruling + ' not applied, qty ' + line.qty + ')');
      provText = 'TEXT. The wording above is the RULING-SCOPE decision, written here from ' + declined.ruling +
        ' and this room\'s own row(s) ' + rowIds + '. It replaces the package text this tag carries on LIVE room ' +
        donorNo + ', which asserts the ruling\'s count and describes a drawing this room does not have; that text ' +
        'is quoted above rather than deleted.';
    }

    /* An open bathing-configuration row keeps its flag and says which side it
     * is on. Nothing is dropped and nothing is chosen. */
    const cfg = line.rows.map(configOf).find(Boolean);
    if (cfg && drops.carried) {
      pkg.reliability = 'FLAGGED';
      pkg.instanceNote = (pkg.instanceNote ? pkg.instanceNote + ' ' : '') +
        'CONFLICT CARRIED, NOT RESOLVED: this is a CONFIGURATION ' + cfg +
        (cfg === 'A' ? ' (TUB)' : ' (ROLL-IN SHOWER)') + ' line. Room ' + roomNo + ' carries BOTH configurations and ' +
        'nobody has ruled on this key - ruling D19 named ROOM 118 and no other. Build only what the answer turns out ' +
        'to be, and see the room note.';
      configLines.push(line.key + ' (Config ' + cfg + ', ' + (line.code || '<untagged>') + ')');
    }

    /* An OPEN entry in the conflicts table that names this line's tag rides ON
     * the line, verbatim, and flags it. Carried, never resolved. */
    const onTag = conflictsOnTag(conflictHits, line.code);
    let conflictText = '';
    if (onTag.length) {
      const wasRel = pkg.reliability;
      pkg.reliability = 'FLAGGED';
      conflictText = onTag.map((h) => conflictQuote(h) + ' It names this line\'s tag, ' + line.code +
        '. The entry travels with the line and the line is FLAGGED for it' +
        (wasRel === 'FLAGGED' ? '' : ' - its own data/project.sqlite row(s) read ' + wasRel +
          ', and the open conflict flags it further') +
        '; confirm before any takeoff or purchase.').join(' ');
      conflictLines.push(line.key + ' (' + line.code + ' <- ' + onTag.map((h) => h.id).join(', ') + ')');
    }

    /* The note, assembled in one place: this room's own words first, then why
     * the number is the number, then what is open on it, then where every word
     * on the line came from. The flag mark is decided on the FINAL reliability. */
    const flagMark = pkg.reliability !== 'HIGH' && pkg.instanceNote ? '⚑ ' : '';
    pkg.instanceNote = [
      pkg.instanceNote ? flagMark + pkg.instanceNote : '',
      foldSentence(roomNo, line),
      conflictText,
      provText,
      ...prov,
    ].filter(Boolean).map(endStop).join(' ').replace(/\s{2,}/g, ' ').trim();

    const item = {
      code: line.code,
      label: pkg.label,
      category: line.category,
      qty: line.qty,
      src: pkg.src,
      reliability: pkg.reliability,
      instanceNote: pkg.instanceNote,
      trade: pkg.trade,
      derived: pkg.derived,
      sort: line.sort,
      deleted: false,
      ...CLEAN_FIELD_STATE,
    };
    if (line.qtyUnknown) delete item.qty;
    if (Array.isArray(pkg.attachments) && pkg.attachments.length) item.attachments = clone(pkg.attachments);
    items[line.key] = item;
    if (item.reliability !== 'HIGH') flagged.push(line.key + ' [' + item.reliability + '] ' + (line.code || '<untagged>'));
    report.lineSources = report.lineSources || {};
    report.lineSources[line.key] = source;
  }

  if (report.unresolved.length) {
    die('room ' + roomNo + ': ' + report.unresolved.length + ' unresolved line(s) - refusing to write a partial room:\n  ' +
        report.unresolved.join('\n  '));
  }

  const produced = new Set(red.lines.map((l) => donorKey(l.category, l.code, l.key)));
  report.donorUnused = [...refIndex.keys()].filter((k) => !produced.has(k))
    .map((k) => refIndex.get(k).item.code || '<untagged>').sort(cmpStr);
  report.ffeLines = Object.keys(items).length;
  report.fromDonor = fromDonor.sort(cmpStr);
  report.fromSqlite = fromSqlite.sort(cmpStr);
  report.donorQtyNotes = donorQtyNotes;
  report.donorLabelNotes = donorLabelNotes;
  report.qtyOverrideNotes = overrideNotes.sort(cmpStr);
  report.ffeFlagged = flagged.sort(cmpStr);
  report.ffeConfigLines = configLines.sort(cmpStr);
  report.ffeDeclinedLines = declinedLines.sort(cmpStr);
  report.ffeRelKept = relKept.sort(cmpStr);
  report.ffeDonorClosures = donorClosures.sort(cmpStr);
  report.ffeDonorTextDropped = donorTextDropped.sort(cmpStr);
  report.ffeConflictLines = conflictLines.sort(cmpStr);
  report.configCarried = drops.carried;
  report.configA = drops.a.length;
  report.configB = drops.b.length;

  const typeLabel = room.display_label;
  if (!typeLabel) die('room ' + roomNo + ': rooms.display_label is empty - no label to carry');
  report.docType = typeSlug(room.room_type);
  report.docTypeLabel = typeLabel;

  return {
    doc: {
      number: room.room_no,
      floor: Number.parseInt(room.floor, 10),
      type: typeSlug(room.room_type),
      typeLabel,
      schemaV: ref.schemaV,
      items,
      notes: buildRoomNotes(db, roomNo, room, rows, red, drops, stamp, report),
      deleted: false,
      createdAt: stamp,
      updatedAt: stamp,
    },
    room, rows, red, drops,
  };
}

/* ========================================================= the MEP document */

function buildMepDoc(db, roomNo, room, rows, live, floor, stamp, report, identity, numbering, descSlots) {
  const spec = REP_ROOMS[roomNo];
  const donorNo = spec.donor;
  const ref = live.docs[donorNo + '-MEP'];
  if (ref.type !== MEP_DOC_TYPE) die('room ' + roomNo + ': ' + donorNo + '-MEP type is not ' + JSON.stringify(MEP_DOC_TYPE));

  const donorLive = {};
  let skippedDeleted = 0;
  for (const k of Object.keys(ref.items)) {
    if (ref.items[k].deleted) { skippedDeleted++; continue; }
    donorLive[k] = ref.items[k];
  }

  /* The donor's own guestroom sheet - the sheet its citations were written for. */
  const donorRoom = db.prepare('SELECT room_type FROM rooms WHERE room_no = ?').get(donorNo);
  const donorSheet = roomSheetFor(db, donorRoom, donorNo);
  const roomSheet = roomSheetFor(db, room, roomNo);
  const isConnecting = String(room.connecting) === '1';
  const drops = configADrops(roomNo, rows);

  const keyOfDonorItem = new Map();
  for (const [key, ids] of Object.entries(MEP_CONDENSED_SOURCES)) for (const id of ids) keyOfDonorItem.set(id, key);

  /* Classify every MEP row this room has. Nothing may fall through. */
  const support = new Map();     // line key -> rows
  const unitHits = new Map();    // line key -> rows matched by product identity
  const newRows = [];
  const roughIn = [];
  const placedBy = [];
  for (const r of rows) {
    if (!isMepRow(r)) continue;
    if (drops.ids.has(r.rowid)) continue;
    let key = keyOfDonorItem.get(r.item_id) || null;
    let how = key ? 'item_id' : null;
    if (!key && !configOf(r)) {
      const dk = r.category + SEP + r.description;
      if (descSlots.byKey.has(dk)) { key = descSlots.byKey.get(dk); how = 'product identity'; }
    }
    if (key) {
      if (!(key in donorLive)) die('room ' + roomNo + ': row ' + r.item_id + ' maps to MEP line ' + key +
        ', which is not live in ' + donorNo + '-MEP');
      if (!support.has(key)) support.set(key, []);
      support.get(key).push(r);
      if (how === 'product identity') {
        if (!unitHits.has(key)) unitHits.set(key, []);
        unitHits.get(key).push(r);
        placedBy.push(r.item_id + ' -> ' + key + ' (description is character-for-character donor row ' +
          descSlots.unitRows.get(key).map((u) => u.item_id).join('/') + ')');
      }
    } else if (MEP_ROUGH_IN_ITEMS.includes(r.item_id)) {
      roughIn.push(r);
    } else {
      newRows.push(r);
    }
  }

  const items = {};
  const repointed = [], citationDropped = [], connectingDropped = [], resolutions = [];
  const qtyFromRows = [], flagged = [], configLines = [], donorCiteStripped = [];
  const conflictLines = [], ptacRepeatLines = [], unknownBandLines = [];

  /* The same OPEN conflicts-table entries the FF&E document carries. An entry
   * that names a tag on an MEP line rides on that line too. */
  const conflictHits = openConflictsFor(db, roomNo, spec.keys, rows);
  /* The open second-unit question, where this room has one. */
  const ptac2 = ptacRepeat(rows);

  for (const key of Object.keys(donorLive).sort(cmpStr)) {
    const d = donorLive[key];
    const mine = support.get(key) || [];
    const units = unitHits.get(key) || [];

    let code = d.code, label = d.label, reliability = d.reliability, trade = d.trade;
    let derived = d.derived, qty = d.qty;
    /* The donor's own A555 -> A550 re-point note is a fact about the donor room.
     * Out it comes, before anything else reads or edits this note. */
    const donorCite = stripDonorCitationNote(d.instanceNote);
    let instanceNote = donorCite.text;
    if (donorCite.stripped) donorCiteStripped.push(key);

    const cite = composeMepCitation(d.src, mine, roomSheet, isConnecting, numbering, donorSheet);
    let src = cite.src;
    let citeNote = cite.note;
    if (src !== d.src) repointed.push(key);
    if (cite.removed.length) citationDropped.push(key + ': ' + [...new Set(cite.removed)].join(', ') + ' -> ' + cite.outcome);
    if (cite.connectingRemoved.length) connectingDropped.push(key);

    /* QUANTITY. The donor's count stands unless THIS room's own rows prove a
     * different number of the SAME physical unit - which only the product-
     * identity match can prove. Never a raw row count: elec_panel folds 13 rows
     * and is still one panelboard. */
    if (units.length) {
      const byDesc = new Map();
      for (const u of units) byDesc.set(u.description, (byDesc.get(u.description) || 0) + 1);
      const most = Math.max(...byDesc.values());
      if (most !== qty) {
        qtyFromRows.push(key + ': donor qty ' + qty + ' -> ' + most + ' (this room has ' + most +
          ' row(s) of the identical product: ' + units.map((u) => u.item_id +
            (u.instance_note ? ' "' + u.instance_note + '"' : '')).join(', ') + ')');
        instanceNote = instanceNote + ' QUANTITY IS THIS ROOM\'S OWN, not the donor\'s: data/project.sqlite ' +
          'transcribes ' + most + ' of this unit for room ' + roomNo + ' (' +
          units.map((u) => u.item_id + (u.instance_note ? ' "' + u.instance_note + '"' : '')).join(', ') +
          '), against ' + qty + ' in donor room ' + donorNo + '.';
        qty = most;
      }
    }

    /* A variant row whose product genuinely differs rebuilds the line - the same
     * rule floor 1 uses (MEP_LABEL_FROM_ROW). Config rows never get here. */
    const variant = units[0] || null;
    const donorUnit = (descSlots.unitRows.get(key) || [])[0] || null;
    if (variant && donorUnit && MEP_LABEL_FROM_ROW.has(key) && variant.description !== donorUnit.description) {
      code = variant.tag || '';
      label = variant.description;
      src = resolveSheetWildcard(variant.source_sheet || variant.primary_sheet || '', roomSheet);
      reliability = variant.reliability;
      trade = variant.trade_responsible || '';
      derived = variant.derived;
      instanceNote = sqliteNote(variant);
      citeNote = '';
      resolutions.push(key + ": rebuilt from this room's own row " + variant.item_id);
    }

    let item = {
      id: key, code, label, category: d.category, qty, src, reliability, instanceNote,
      trade, derived, sort: d.sort, deleted: false, ...CLEAN_FIELD_STATE,
    };
    if (Array.isArray(d.attachments) && d.attachments.length) item.attachments = clone(d.attachments);

    if (key === 'mech_ptac') item = ptacFromOwnRows(roomNo, item, units, report);

    if (key === FP_HEADS_KEY) {
      const heads = sprinklerRowsIn(rows);
      if (heads.length) {
        die('room ' + roomNo + ' unexpectedly has ' + heads.length + ' sprinkler row(s) in sqlite. This tool was ' +
            'written for four types that have NONE and therefore removes the donor take-off. Re-check before building.');
      }
      item = fpNoCount(db, roomNo, room.room_type, donorNo, item, report, room.floor);
    }

    /* An accessible key with no neutral bathing row keeps the D10 line but says
     * plainly that the product text is not an answer for this key. */
    if (drops.carried && MEP_LABEL_FROM_ROW.has(key) && !units.length) {
      item = bathingUnresolvedLine(roomNo, key, item, drops, donorNo);
      configLines.push(key + ' (donor product text, marked UNRESOLVED)');
    }

    if (!item.src) die('room ' + roomNo + ': MEP line ' + key + ' would carry no citation');
    /* This room's own re-point note, replacing the donor's. Only where a
     * re-point actually happened - room 230 shares its donor's sheet and needs
     * no note at all. */
    if (donorSheet !== roomSheet && (donorCite.stripped || citeNote)) {
      item.instanceNote = (item.instanceNote ? item.instanceNote + ' ' : '') + ownRepointNote(donorNo, donorSheet, roomSheet);
    }
    if (citeNote) item.instanceNote = (item.instanceNote ? item.instanceNote + ' ' : '') + citeNote;

    /* THE PTAC SUB-ASSEMBLY REPEATS - CARRIED, NOT RESOLVED. This room has more
     * than one PTAC and its own row says the whole sub-assembly repeats for the
     * second unit; the database transcribes each member ONCE, marked "PTAC 1".
     * mech_ptac already takes its count from the unit rows. Every OTHER
     * condensed line fed by a "PTAC n" member is flagged and told to count. */
    if (ptac2 && key !== 'mech_ptac' && mine.some((r) => PTAC_MEMBER_RE.test(String(r.instance_note || '')))) {
      const members = mine.filter((r) => PTAC_MEMBER_RE.test(String(r.instance_note || '')));
      item.reliability = 'FLAGGED';
      item.instanceNote = endStop(item.instanceNote) + ' COUNT CONFLICT CARRIED, NOT RESOLVED. Room ' + roomNo +
        ' has ' + ptac2.units.length + ' PTAC units (' + ptac2.ids.join(', ') + '), and this room\'s own ' +
        'data/project.sqlite row says, verbatim: "' + ptac2.quote + '". This line is fed by ' +
        members.map((r) => r.item_id + ' ("' + r.instance_note + '")').join(', ') +
        ' - the database transcribes that member ONCE, for PTAC 1 only. The quantity here is therefore the ' +
        'transcribed row count and is NOT doubled: inventing a row the database does not hold would be the same ' +
        'fabrication in the other direction. COUNT WHAT IS INSTALLED before signing this line off, and see the ' +
        'room note.';
      ptacRepeatLines.push(key + ' (' + members.map((r) => r.item_id).join(', ') + ')');
    }

    /* An OPEN conflicts-table entry that names this line's tag. */
    const onTag = conflictsOnTag(conflictHits, item.code);
    if (onTag.length) {
      const wasRel = item.reliability;
      item.reliability = 'FLAGGED';
      item.instanceNote = endStop(item.instanceNote) + ' ' + onTag.map((h) => conflictQuote(h) +
        ' It names this line\'s tag, ' + item.code + '. The entry travels with the line and the line is FLAGGED ' +
        'for it' + (wasRel === 'FLAGGED' ? '' : ' - it read ' + wasRel + ' before this entry was applied') +
        '; confirm before any takeoff or purchase.').join(' ');
      conflictLines.push(key + ' (' + item.code + ' <- ' + onTag.map((h) => h.id).join(', ') + ')');
    }

    item.instanceNote = String(item.instanceNote).replace(/\s{2,}/g, ' ').trim();
    items[key] = item;
    if (item.reliability !== 'HIGH') flagged.push(key + ' [' + item.reliability + '] ' + (item.code || '<untagged>'));
  }

  /* Rows this room has that no condensed line claims. Their own lines - never
   * silently lost. This is where the second smoke detector, the second TV data
   * jack, the ADA electrical set and BOTH bathing configurations land. */
  const nextSort = new Map();
  for (const v of Object.values(items)) nextSort.set(v.category, Math.max(nextSort.get(v.category) || 0, v.sort));
  const added = [];
  for (const r of newRows) {
    const c = r.category;
    if (!SPACE_MEP_INDEX.has(c)) die('room ' + roomNo + ': MEP category ' + JSON.stringify(c) + ' has no band position');
    const base = nextSort.has(c) ? nextSort.get(c) + 1 : (SPACE_MEP_INDEX.get(c) + 1) * 1000 + 10;
    nextSort.set(c, base);
    const key = 'db_' + String(r.item_id).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!/^[a-z0-9_]{1,40}$/.test(key)) die('room ' + roomNo + ': MEP key ' + JSON.stringify(key) + ' violates ^[a-z0-9_]{1,40}$');
    if (items[key]) die('room ' + roomNo + ': MEP key collision ' + JSON.stringify(key));
    const src = resolveSheetWildcard(r.source_sheet || r.primary_sheet || '', roomSheet);
    if (!src) die('room ' + roomNo + ': row ' + r.item_id + ' has no citation in sqlite - refusing to emit an uncited line');
    let note = sqliteNote(r);
    let reliability = r.reliability;
    const cfg = configOf(r);
    if (cfg && drops.carried) {
      reliability = 'FLAGGED';
      /* The wording matters and the first build got it wrong: it said "both are
       * built" three sentences after quoting the database saying the two are
       * "MUTUALLY EXCLUSIVE - only one gets built on each key". That reads as an
       * instruction to install a tub AND a roll-in in one accessible bathroom.
       * The database's own word is EMITTED. This is the FF&E side's wording,
       * used verbatim so the two documents cannot say different things. */
      note = (note ? note + ' ' : '') + 'CONFLICT CARRIED, NOT RESOLVED: this is a CONFIGURATION ' + cfg +
        (cfg === 'A' ? ' (TUB)' : ' (ROLL-IN SHOWER)') + ' line. Room ' + roomNo + ' carries BOTH configurations and ' +
        'nobody has ruled on this key - ruling D19 named ROOM 118 and no other. BOTH ARE EMITTED ONTO THIS ' +
        'CHECKLIST AND NEITHER IS SUPERSEDED; they are MUTUALLY EXCLUSIVE and only one of them gets built. ' +
        'Build only what the answer turns out to be, and see the room note.';
      configLines.push(key + ' (Config ' + cfg + ', ' + (r.tag || '<untagged>') + ')');
    }

    /* A category the APP does not know sorts after everything else. The string
     * is left EXACTLY as the database writes it - no row is relabelled to make
     * it fit, which is the rule build_floor1.mjs already follows for spaces -
     * and the line says so, because the build report is not shipped with the
     * document and Austin reads the document. */
    if (!APP_MEP_CATEGORY_ORDER.has(c)) {
      note = endStop(note) + ' CATEGORY NOTE: data/project.sqlite files this row under "' + c + '". The crew app ' +
        'knows five MEP bands (' + [...APP_MEP_CATEGORY_ORDER].join(', ') + '), so this line sorts AFTER all of ' +
        'them instead of beside the others of its trade. The category string is carried exactly as the database ' +
        'writes it and no row was relabelled to make it fit; widening the app\'s band list is Austin\'s call.';
      unknownBandLines.push(key + ' [' + c + '] ' + r.item_id);
    }

    /* An OPEN conflicts-table entry that names this row's tag. */
    const onTag = conflictsOnTag(conflictHits, r.tag || '');
    if (onTag.length) {
      const wasRel = reliability;
      reliability = 'FLAGGED';
      note = endStop(note) + ' ' + onTag.map((h) => conflictQuote(h) + ' It names this line\'s tag, ' + r.tag +
        '. The entry travels with the line and the line is FLAGGED for it' +
        (wasRel === 'FLAGGED' ? '' : ' - its own data/project.sqlite row reads ' + wasRel +
          ', and the open conflict flags it further') +
        '; confirm before any takeoff or purchase.').join(' ');
      conflictLines.push(key + ' (' + r.tag + ' <- ' + onTag.map((h) => h.id).join(', ') + ')');
    }

    items[key] = {
      id: key, code: r.tag || '', label: r.description, category: c, qty: 1, src,
      reliability, instanceNote: String(note).replace(/\s{2,}/g, ' ').trim(), trade: r.trade_responsible || '',
      derived: r.derived, sort: base, deleted: false, ...CLEAN_FIELD_STATE,
    };
    added.push((r.tag || '<untagged>') + ' [' + c + '] ' + r.item_id);
    if (reliability !== 'HIGH') flagged.push(key + ' [' + reliability + '] ' + (r.tag || '<untagged>'));
  }

  report.mepLines = Object.keys(items).length;
  report.mepSkippedDeleted = skippedDeleted;
  report.mepRefRoom = donorNo + '-MEP';
  report.mepDonorSheet = donorSheet;
  report.mepRoomSheet = roomSheet;
  report.mepRepointed = repointed.sort(cmpStr);
  report.mepCitationDropped = citationDropped.sort(cmpStr);
  report.mepConnectingDropped = connectingDropped.sort(cmpStr);
  report.mepResolutions = resolutions;
  report.mepDonorCiteStripped = donorCiteStripped.sort(cmpStr);
  report.mepQtyFromRows = qtyFromRows;
  report.mepPlacedByProduct = placedBy;
  report.mepAdded = added;
  report.mepRoughIn = roughIn.length;
  report.mepFlagged = flagged.sort(cmpStr);
  report.mepConfigLines = configLines.sort(cmpStr);
  report.mepConflictLines = conflictLines.sort(cmpStr);
  report.mepPtacRepeatLines = ptacRepeatLines.sort(cmpStr);
  report.mepUnknownBand = unknownBandLines.sort(cmpStr);
  report.ptacRepeat = ptac2 ? ptac2.units.length + ' PTAC unit(s) ' + ptac2.ids.join(', ') +
    '; the sub-assembly repeat is OPEN and carried on ' + ptacRepeatLines.length + ' line(s)' : '';
  report.mepUnsupported = Object.keys(donorLive).filter((k) => !(support.get(k) || []).length).sort(cmpStr);

  return {
    number: roomNo + '-MEP',
    floor,
    type: MEP_DOC_TYPE,
    typeLabel: identity.typeLabel,
    schemaV: ref.schemaV,
    items,
    notes: buildRoomNotes(db, roomNo, room, rows, null, drops, stamp, { ...report, roomNotes: [] }),
    deleted: false,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

/** D27 and D28, on every room. Idempotent by key. */
function addRuledLines(doc, kind) {
  const added = [];
  for (const r of RULED_LINE_ADDITIONS) {
    if (r.doc !== kind) continue;
    if (doc.items[r.key]) continue;
    doc.items[r.key] = {
      code: r.code, label: r.label, category: r.category, qty: r.qty, sort: r.sort,
      src: r.src, reliability: 'HIGH',
      /* Same SOURCE discipline as every other line: a reader must be able to see
       * that this one comes from a RULING and not from a drawing. */
      instanceNote: endStop(r.note) + ' SOURCE. This line is not derived from data/project.sqlite at all. It is a ' +
        'RULED LINE ADDITION: Austin ruling ' + r.ruling + ' put it on every guest room, and it is carried in the ' +
        'generator (RULED_LINE_ADDITIONS) byte-identically to the version build_floor1.mjs puts on the LIVE ' +
        'floor-1 rooms, so no rebuild can drop it and the two floors cannot drift apart.',
      trade: '', derived: 0,
      deleted: false, ...CLEAN_FIELD_STATE,
    };
    added.push(r.key + ' (' + r.ruling + ')');
  }
  return added;
}

/* --------------------------------------------------- Firestore rules checks */

const DOC_KEYS = new Set(['createdAt', 'deleted', 'floor', 'items', 'notes', 'number', 'schemaV', 'type', 'typeLabel', 'updatedAt']);
const ITEM_KEYS = new Set(['attachments', 'category', 'checked', 'checkedAt', 'checkedAtLocal', 'code', 'deleted',
  'derived', 'id', 'initials', 'instanceNote', 'issue', 'issueResolved', 'label', 'qty', 'reliability', 'sort',
  'src', 'trade', 'verifyAtPunch', 'where']);
const NOTE_KEYS = new Set(['by', 'createdAt', 'flag', 'redactedAuthor', 'resolved', 'text']);
const DOC_ID_MAX = 8;
const ITEMS_MAX = 200;

/** The published Firestore rules, re-checked on the built documents. */
function assertDocRules(docs) {
  const problems = [];
  const checks = [];
  for (const [id, d] of Object.entries(docs)) {
    if (String(id).length > DOC_ID_MAX) problems.push('doc id ' + JSON.stringify(id) + ' is ' + id.length + ' chars, max ' + DOC_ID_MAX);
    if (d.number !== id) problems.push('doc ' + JSON.stringify(id) + ': number ' + JSON.stringify(d.number) + ' != docId');
    const n = Object.keys(d.items || {}).length;
    if (n > ITEMS_MAX) problems.push('doc ' + id + ' has ' + n + ' items, max ' + ITEMS_MAX);
    if (!n) problems.push('doc ' + id + ' would be written with ZERO lines - an empty checklist reads as "nothing to verify here"');
    for (const k of Object.keys(d)) if (!DOC_KEYS.has(k)) problems.push('doc ' + id + ': non-whitelisted doc key ' + JSON.stringify(k));
    for (const [ik, it] of Object.entries(d.items || {})) {
      if (!/^[a-z0-9_]{1,40}$/.test(ik)) problems.push('doc ' + id + ': item key ' + JSON.stringify(ik) + ' violates ^[a-z0-9_]{1,40}$');
      for (const k of Object.keys(it)) if (!ITEM_KEYS.has(k)) problems.push('doc ' + id + '/' + ik + ': non-whitelisted item key ' + JSON.stringify(k));
      if (typeof it.sort !== 'number') problems.push('doc ' + id + '/' + ik + ': sort is not a number');
      if (!it.src) problems.push('doc ' + id + '/' + ik + ': empty src - an uncited line');
      if (it.checked !== false || it.initials !== '' || it.checkedAt !== null || it.issue !== '') {
        problems.push('doc ' + id + '/' + ik + ': field state is not clean - a staged room must be born clean');
      }
    }
    for (const [nk, nt] of Object.entries(d.notes || {})) {
      for (const k of Object.keys(nt)) if (!NOTE_KEYS.has(k)) problems.push('doc ' + id + '/note ' + nk + ': non-whitelisted note key ' + JSON.stringify(k));
    }
    checks.push(id + ': id ' + String(id).length + '/' + DOC_ID_MAX + ' chars, ' + n + '/' + ITEMS_MAX + ' items, ' +
      Object.keys(d.notes || {}).length + ' note(s)');
  }
  if (problems.length) die('the built documents violate the published Firestore doc rules:\n  ' + problems.join('\n  '));
  return checks;
}

/* ---------------------------------------------------------------- the build */

function buildAll(db, live, slice, rooms, stamp, numbering, descSlots, convention) {
  const docs = {};
  const reports = [];
  for (const roomNo of rooms) {
    const report = { room: roomNo, unresolved: [] };
    const { doc: ffe, room, rows } = buildFFEDoc(db, roomNo, live, convention, stamp, report);
    const mep = buildMepDoc(db, roomNo, room, rows, live, ffe.floor, stamp, report,
      { typeLabel: ffe.typeLabel }, numbering, descSlots);
    report.ruledAdded = [...addRuledLines(ffe, 'ffe'), ...addRuledLines(mep, 'mep')];
    report.ffeLines = Object.keys(ffe.items).length;
    report.mepLines = Object.keys(mep.items).length;
    docs[roomNo] = ffe;
    docs[roomNo + '-MEP'] = mep;
    reports.push(report);
  }
  return { docs, reports };
}

function assemble(docs, stamp, rooms) {
  return {
    meta: {
      generator: 'platform/tools/build_ref_rooms.mjs',
      project: 'H2SEP - Home2 Suites by Hilton, Eagle Pass TX (Triun job 24030)',
      purpose: 'REFERENCE-ROOM MOCK-UPS, STAGED FOR AUSTIN\'S APPROVAL. Not live, not pushed, not deployed. '
        + 'One representative room for each of the four types that have no approved reference room (ruling D24).',
      builtAt: stamp,
      stampIsConstant: true,
      recipeSource: 'platform/tools/build_floor1.mjs - the reduction recipe is COPIED and proved byte-faithful '
        + 'on every run by assertRecipeByteFaithful(); this tool does not own the recipe',
      shapeSource: 'data/project.sqlite room_items (category gate + fold by (category, tag) + scoped ruled overrides)',
      packageSource: 'platform/data/floor1-staged.json (LIVE floor 1, READ ONLY) - curated text for SHARED tags only; '
        + 'a tag with no live counterpart ships from data/project.sqlite verbatim with its own reliability',
      donorRule: 'A DONOR MAY ENRICH, NEVER LAUNDER. The target room\'s own data/project.sqlite reliability and its '
        + 'own note govern every line. A donor raises a reliability only where its text carries a RULING that closes '
        + 'the flag for the PRODUCT (a model number, not a room), and the line says so in words. Donor text that is a '
        + 'reading of the donor room\'s own drawing is dropped, quoted on the line as not carried. Every line carries '
        + 'a SOURCE sentence naming which document each part of it came from.',
      mepSource: 'the D10 condensed punch of the nearest LIVE type, re-cited onto this room\'s own sheet; '
        + 'rows no condensed line claims become their own lines and are never lost. Non-architectural citations are '
        + 're-pointed too: the sprinkler line\'s FP-series citation is a fact about the DONOR\'s floor and the two '
        + 'rooms the count was read on, so it is removed and replaced with PH-GU-001\'s own sheet list plus this '
        + 'room\'s floor. Where the room shares its donor\'s sheet, the citation stands verbatim except for the '
        + '".1" CONNECTING plan variant, which is dropped wherever rooms.connecting = 0.',
      citationRule: 'A corroboration claim is checked NUMBER BY NUMBER on this room\'s own sheet. A row of this '
        + 'room\'s own only corroborates a surviving donor reference when it cites the same view or keynote number '
        + 'on the same sheet; citing the same sheet, or the same number on another sheet, is not evidence and the '
        + 'line says so instead.',
      donorMap: Object.fromEntries(Object.keys(REP_ROOMS).map((r) => [r, REP_ROOMS[r].donor])),
      roomTypes: Object.fromEntries(Object.keys(REP_ROOMS).map((r) => [r, REP_ROOMS[r].type])),
      typeKeys: Object.fromEntries(Object.keys(REP_ROOMS).map((r) => [r, REP_ROOMS[r].keys])),
      rulingsApplied: ['D12 (scoped)', 'D20 (scoped)', 'D27', 'D28'],
      rulingsDeliberatelyNotApplied: [
        'D19 - scoped to room 118 only; rooms 217 and 238 carry BOTH bathing configurations, FLAGGED',
        'D22 - its workbook reconciliation covers floor-1 Queen-Queen and QQ Connecting only; 230 and 238 carry '
          + 'GR-308 as transcribed, with the naming question recorded as OPEN',
      ],
      conflictPolicy: 'document conflicts are CARRIED as FLAGGED lines and room notes quoting data/project.sqlite '
        + 'verbatim. Nothing is resolved by this tool. That now includes the data/project.sqlite conflicts TABLE: '
        + 'every OPEN entry naming one of these rooms\' keys or one of its tags rides on the line that carries the '
        + 'tag, FLAGGED, and in room note n_conflicts - and a gated-out row whose own note states a conflict rides '
        + 'in n_gategaps at ANY reliability, because how well a row was read says nothing about whether the '
        + 'documents agree.',
      fieldState: 'every line is born clean: checked false, initials empty, checkedAt null, issue empty. '
        + 'Floor 2-4 crew work is carried at rollout by platform/tools/carry_field_state.mjs under ruling D24, not here.',
      redaction: 'no personal contact data, no photographs, no crew names',
      stagedDocs: Object.keys(docs).sort(cmpDocId),
      writesNothingElse: 'floor1-staged.json, slice-f1.json and the crew Firestore collection are READ ONLY',
    },
    docs: Object.fromEntries(Object.keys(docs).sort(cmpDocId).map((k) => [k, docs[k]])),
  };
}

/* ------------------------------------------------------------------ selftest
 *
 * Three things get proved, in this order:
 *
 *  1 THE RECIPE IS NOT FORKED. Every copied span still matches build_floor1.mjs.
 *  2 THE RECIPE STILL WORKS. It reproduces the three APPROVED rooms and both
 *    LIVE donor rooms on (category, tag, qty, sort) - the same proof
 *    build_floor1 --selftest makes, re-made here against the file this tool
 *    actually donates from.
 *  3 THE OUTPUT IS WHAT IT CLAIMS. The four rooms are RE-DERIVED from sqlite
 *    independently and diffed against what the tool just built, then checked
 *    against the Firestore doc rules.
 */
function selftest(db, live, slice, built, convention, numbering, descSlots) {
  let ok = true;
  const W = (s) => process.stdout.write(s);
  W('\nSELFTEST\n' + '='.repeat(100) + '\n');

  const fid = assertRecipeByteFaithful();
  W('1. RECIPE FIDELITY  ' + fid.exact + ' function(s) byte-identical to build_floor1.mjs, ' +
    fid.derived + ' derived by the declared transform. PASS\n');
  const consts = assertRecipeConstants();
  W('   constant tables re-proved against build_floor1.mjs: ' + consts.length + ' (' + consts.slice(0, 6).join(', ') + ', ...)\n');

  W('\n2. THE RECIPE STILL REPRODUCES APPROVED AND LIVE WORK\n');
  for (const [refNo, src, label] of [['101', slice, 'approved slice'], ['103', slice, 'approved slice'],
    ['105', slice, 'approved slice'], ['104', live, 'LIVE floor-1 seed'], ['105', live, 'LIVE floor-1 seed']]) {
    const { room, rows } = readRoom(db, refNo);
    resolveQtyOverrides(room, rows);
    QTY_OVERRIDES = QTY_OVERRIDE_RULES.map((r) => r);   /* floor-1 semantics for a floor-1 room */
    const probe = reduceFFE(refNo, rows);
    const items = src.docs[refNo].items;
    const found = detectSortConvention(items, probe);
    const red = reduceFFE(refNo, rows, found.convention || 'line');
    const deltas = [];
    for (const l of red.lines) {
      const a = items[l.key];
      if (!a) {
        /* Ruling D22 retags the working wall on the LIVE floor: gr308_a is a
         * tombstone there and gr305_a is the live line. Expected, and named. */
        if (l.code === 'GR-308' && items.gr305_a) continue;
        deltas.push('EXTRA ' + l.key + ' (' + (l.code || '<untagged>') + ')'); continue;
      }
      if (a.deleted) continue;
      if (l.category !== a.category) deltas.push(l.key + ': category ' + l.category + ' != ' + a.category);
      if (l.code !== a.code) deltas.push(l.key + ': tag ' + l.code + ' != ' + a.code);
      if (l.qty !== a.qty) deltas.push(l.key + ': qty ' + l.qty + ' != ' + a.qty);
      if (l.sort !== a.sort) deltas.push(l.key + ': sort ' + l.sort + ' != ' + a.sort);
    }
    W('   room ' + refNo + ' (' + label + '): ' + red.lines.length + ' line(s), convention "' +
      (found.convention || 'NONE') + '" - ' + (deltas.length ? 'FAIL ' + deltas.join('; ') : 'PASS 0 deltas on (category, tag, qty, sort)') + '\n');
    if (deltas.length) ok = false;
  }
  W('   MEP type-level constant: ' + assertMepConstant(slice) + ' live lines identical across 101/103/105-MEP. PASS\n');
  const proof = assertDerivationRules(db, slice);
  W('   src == room_items.primary_sheet re-proved on ' + proof.checked + ' approved lines. PASS\n');

  W('\n3. THE FOUR REFERENCE ROOMS RE-DERIVE TO WHAT WAS BUILT\n');
  for (const roomNo of Object.keys(REP_ROOMS)) {
    const doc = built.docs[roomNo];
    if (!doc) continue;
    const { room, rows } = readRoom(db, roomNo);
    resolveQtyOverrides(room, rows);
    const red = reduceFFE(roomNo, rows, convention);
    const expect = new Map(red.lines.map((l) => [l.key, l]));
    const ruled = new Set(RULED_LINE_ADDITIONS.filter((r) => r.doc === 'ffe').map((r) => r.key));
    const deltas = [];
    for (const [k, v] of Object.entries(doc.items)) {
      if (ruled.has(k)) continue;
      const e = expect.get(k);
      if (!e) { deltas.push('built line ' + k + ' does not re-derive from sqlite'); continue; }
      if (e.category !== v.category) deltas.push(k + ': category ' + e.category + ' != ' + v.category);
      if (e.code !== v.code) deltas.push(k + ': tag ' + JSON.stringify(e.code) + ' != ' + JSON.stringify(v.code));
      if (e.qty !== v.qty) deltas.push(k + ': qty ' + e.qty + ' != ' + v.qty);
      if (e.sort !== v.sort) deltas.push(k + ': sort ' + e.sort + ' != ' + v.sort);
    }
    for (const k of expect.keys()) if (!(k in doc.items)) deltas.push('re-derived line ' + k + ' is missing from the built doc');

    /* The MEP doc: every one of this room's MEP rows must be accounted for -
     * on a condensed line, on its own line, or as declared rough-in. */
    const mep = built.docs[roomNo + '-MEP'];
    const mepRows = rows.filter(isMepRow);
    const ownLines = new Set(Object.keys(mep.items).filter((k) => k.startsWith('db_')));
    const keyOfDonorItem = new Map();
    for (const [key, ids] of Object.entries(MEP_CONDENSED_SOURCES)) for (const id of ids) keyOfDonorItem.set(id, key);
    let condensed = 0, own = 0, rough = 0, lost = 0;
    for (const r of mepRows) {
      const byId = keyOfDonorItem.get(r.item_id);
      const byDesc = !configOf(r) && descSlots.byKey.get(r.category + SEP + r.description);
      if ((byId && mep.items[byId]) || (byDesc && mep.items[byDesc])) { condensed++; continue; }
      if (ownLines.has('db_' + String(r.item_id).toLowerCase().replace(/[^a-z0-9]/g, ''))) { own++; continue; }
      if (MEP_ROUGH_IN_ITEMS.includes(r.item_id)) { rough++; continue; }
      lost++; deltas.push('MEP row ' + r.item_id + ' (' + r.category + ') is accounted for NOWHERE');
    }
    W('   room ' + roomNo + ': FF&E ' + Object.keys(doc.items).length + ' line(s), MEP ' +
      Object.keys(mep.items).length + ' line(s); ' + mepRows.length + ' MEP row(s) = ' + condensed +
      ' condensed + ' + own + ' own line(s) + ' + rough + ' rough-in + ' + lost + ' lost - ' +
      (deltas.length ? 'FAIL\n     - ' + deltas.join('\n     - ') : 'PASS') + '\n');
    if (deltas.length) ok = false;
  }

  W('\n4. FIRESTORE DOC RULES\n');
  for (const c of assertDocRules(built.docs)) W('   ' + c + '\n');
  W('   PASS - every doc id <= ' + DOC_ID_MAX + ' chars, number == docId, items <= ' + ITEMS_MAX +
    ', doc/item/note keys all whitelisted, every line born clean and cited\n');

  W('\n' + '='.repeat(100) + '\n' + (ok ? 'SELFTEST PASSED\n' : 'SELFTEST FAILED\n'));
  return ok;
}

/* -------------------------------------------------------------------- report */

function printReport(reports, numbering, donorProof, fid, descSlots, convention) {
  const W = (s) => process.stdout.write(s);
  W('\nBUILD REPORT - four reference rooms, staged for approval\n' + '='.repeat(100) + '\n');
  W('recipe: ' + fid.exact + ' function(s) copied byte-identically from build_floor1.mjs, ' + fid.derived +
    ' derived by declared transform, all re-proved this run\n');
  W('sort convention measured off the approved slice: "' + convention + '"\n');
  for (const d of donorProof) W('donor numbering: ' + d + '\n');
  W('product-identity slot map: ' + descSlots.size + ' donor row description(s) can place a row on a condensed line. ' +
    'CONFIGURATION A / CONFIGURATION B rows are excluded from this map on BOTH sides (' + descSlots.skippedConfig +
    ' on the donor side, and every one of them on the target side), so no bathing conflict can be auto-resolved into a slot.\n');
  for (const f of numbering.facts) W('sheet numbering: ' + f + '\n');

  for (const r of reports) {
    const spec = REP_ROOMS[r.room];
    W('\n' + '-'.repeat(100) + '\nROOM ' + r.room + '  ' + r.roomType + '  (type keys: ' + spec.keys.join(', ') + ')\n');
    W('  doc type ' + r.docType + ' / ' + JSON.stringify(r.docTypeLabel) + '   sheets: ' + spec.sheets + '\n');
    W('  FF&E : ' + r.ffeLines + ' lines   [' + r.rawRows + ' raw rows -> ' + r.gatedRows + ' gated -> ' +
      (r.ffeLines - 2) + ' after ' + r.foldedGroups + ' folds, + 2 ruled D28 lines]\n');
    W('  MEP  : ' + r.mepLines + ' lines   [' + r.mepRowCount + ' MEP rows; ' + r.mepRoughIn +
      ' rough-in left off the punch; ' + r.mepSkippedDeleted + ' deleted history row(s) in ' + r.mepRefRoom + ' not copied]\n');
    W('  gate : ' + r.gateDropped + ' row(s) dropped by Austin\'s approved category gate (Paint / Drywall / Flooring / ' +
      'Doors / Stone-Surround / Wall Covering / FF&E-Misc), same as every approved floor-1 room\n');

    W('\n  DONOR USAGE - LIVE room ' + r.donorRoom + ' (' + r.donorType + ')\n');
    W('    ' + r.fromDonor.length + ' shared tag(s) took the donor\'s curated text: ' + r.fromDonor.join(', ') + '\n');
    W('    ' + r.fromSqlite.length + ' tag(s) have NO live counterpart and ship from sqlite VERBATIM: ' +
      (r.fromSqlite.join(', ') || 'none') + '\n');
    W('    ' + r.donorUnused.length + ' donor tag(s) not applicable to this type: ' + (r.donorUnused.join(', ') || 'none') + '\n');
    if (r.donorTombstonesSkipped) {
      W('    ' + r.donorTombstonesSkipped + ' RETIRED donor line(s) skipped - a tombstone is not a source\n');
    }
    for (const n of r.donorLabelNotes) W('    label: ' + n + '\n');
    for (const n of r.donorQtyNotes) W('    qty:   ' + n + '\n');
    W('    THE DONOR MAY ENRICH, NEVER LAUNDER:\n');
    W('      reliability KEPT from this room\'s own sqlite row over the donor\'s on ' + r.ffeRelKept.length +
      ' line(s)' + (r.ffeRelKept.length ? ': ' + r.ffeRelKept.join('; ') : '') + '\n');
    W('      reliability RAISED on a ruling that closes the flag for the product on ' + r.ffeDonorClosures.length +
      ' line(s)' + (r.ffeDonorClosures.length ? ': ' + r.ffeDonorClosures.join('; ') : '') + '\n');
    W('      donor text DROPPED as a reading of the donor\'s own drawing on ' + r.ffeDonorTextDropped.length +
      ' line(s)' + (r.ffeDonorTextDropped.length ? ': ' + r.ffeDonorTextDropped.join('; ') : '') +
      ' (quoted on the line as not carried)\n');
    W('    MEP text donated from ' + r.mepRefRoom + ', written for sheet ' + r.mepDonorSheet +
      ', re-cited onto ' + r.mepRoomSheet + (r.mepDonorSheet === r.mepRoomSheet
        ? ' - SAME SHEET, so every citation stands verbatim and no number is re-judged. The ONE exception is the\n' +
          '      \'.1\' CONNECTING plan variant, which room_types identifies as the connecting plan and which is\n' +
          '      dropped wherever rooms.connecting = 0 - a shared sheet is not a shared connecting plan.\n'
        : '\n'));
    if (r.mepConnectingDropped.length) {
      W('      CONNECTING plan reference(s) dropped on a NON-connecting room (rooms.connecting = 0), and the line\n' +
        '      says so: ' + r.mepConnectingDropped.join(', ') + '\n');
    }
    if (r.mepDonorCiteStripped && r.mepDonorCiteStripped.length) {
      W('      ' + r.mepDonorCiteStripped.length + " donor line(s) carried the DONOR's own re-point note (a fact about room " +
        r.donorRoom + ", not this room); removed and replaced with this room's own: " + r.mepDonorCiteStripped.join(', ') + '\n');
    }
    for (const x of r.mepCitationDropped) W('      citation number NOT carried across sheets - ' + x + '\n');
    if (r.mepUnsupported.length) {
      W('      ' + r.mepUnsupported.length + ' condensed line(s) have no row of their own in this room (carried on the ' +
        'donor citation): ' + r.mepUnsupported.join(', ') + '\n');
    }
    for (const x of r.mepPlacedByProduct) W('      placed by product identity: ' + x + '\n');
    for (const x of r.mepQtyFromRows) W('      quantity from THIS room\'s rows - ' + x + '\n');
    for (const x of r.mepResolutions) W('      ' + x + '\n');
    if (r.mepAdded.length) {
      W('      ' + r.mepAdded.length + ' row(s) no condensed line claims, each given its own line: ' + r.mepAdded.join('; ') + '\n');
    }

    W('\n  RULINGS\n');
    for (const a of r.qtyOverrides.applied) {
      W('    APPLIED  ' + a.ruling + ' on ' + a.tag + ': ' + (a.from === a.to
        ? 'the ruling RESTATES the fold (sqlite already draws ' + a.from + ') and changes nothing'
        : 'qty ' + a.from + ' -> ' + a.to + ', and the line note says so') + ' - ' + a.why + '\n');
    }
    for (const dn of r.qtyOverrides.declined) W('    DECLINED ' + dn.ruling + ' on ' + dn.tag + ' - ' + dn.why + '\n');
    W('    APPLIED  D27 + D28 ruled lines: ' + r.ruledAdded.join(', ') + '\n');
    if (r.ffeDeclinedLines && r.ffeDeclinedLines.length) {
      W('    the declined ruling is written ONTO the line so the note cannot contradict the number: ' +
        r.ffeDeclinedLines.join(', ') + '\n');
    }
    if (r.d22) W('    DECLINED D22 - see room note n_d22 (GR-308 carried as transcribed; naming question OPEN for this type)\n');

    W('\n  FLAGS CARRIED (nothing resolved)\n');
    W('    FF&E ' + r.ffeFlagged.length + ' non-HIGH line(s): ' + (r.ffeFlagged.join(', ') || 'none') + '\n');
    W('    MEP  ' + r.mepFlagged.length + ' non-HIGH line(s): ' + (r.mepFlagged.join(', ') || 'none') + '\n');
    if (r.configCarried) {
      W('    BATHING CONFIGURATION OPEN: ' + r.configA + ' Configuration A (TUB) row(s) and ' + r.configB +
        ' Configuration B (ROLL-IN SHOWER) row(s), ALL EMITTED, ALL FLAGGED, NEITHER SUPERSEDED - and only one\n' +
        '      of them gets built.\n' +
        '      Austin ruling D19 covered ROOM 118 ONLY and has NOT been extended.\n' +
        '      FF&E: ' + (r.ffeConfigLines.join(', ') || 'none') + '\n' +
        '      MEP : ' + (r.mepConfigLines.join(', ') || 'none') + '\n');
    }
    if (r.fpNoCount) W('    ' + r.fpNoCount + '\n');
    if (r.ptac) W('    ' + r.ptac + '\n');
    if (r.ptacRepeat) W('    PTAC SUB-ASSEMBLY REPEAT (open): ' + r.ptacRepeat +
      (r.mepPtacRepeatLines.length ? ' - ' + r.mepPtacRepeatLines.join(', ') : '') + '\n');
    W('\n  CONFLICTS TABLE (data/project.sqlite conflicts, OPEN entries only)\n');
    W('    ' + (r.conflictHits.length ? r.conflictHits.length + ' open entr(y/ies) touch this room: ' +
      r.conflictHits.join('; ') : 'none touch this room') + '\n');
    W('    carried as a FLAG on ' + (r.ffeConflictLines.length + r.mepConflictLines.length) + ' line(s)' +
      ([...r.ffeConflictLines, ...r.mepConflictLines].length
        ? ': ' + [...r.ffeConflictLines, ...r.mepConflictLines].join('; ') : '') +
      '; every one of them is also in room note n_conflicts\n');
    if (r.mepUnknownBand.length) {
      W('    MEP CATEGORIES THE APP DOES NOT KNOW - ' + r.mepUnknownBand.length + ' line(s) sort last and say so on ' +
        'the line: ' + r.mepUnknownBand.join(', ') + '. The category string is carried verbatim; widening the app\'s ' +
        'band list is Austin\'s call\n');
    }
    W('    room notes seeded: ' + r.roomNotes.join(', ') + '\n');
    if (r.unknownCategories.length) W('    NOTE unrecognised sqlite categories: ' + r.unknownCategories.join(', ') + '\n');
  }
}

/* ---------------------------------------------------------------------- main */

function main(argv) {
  const args = argv.slice(2);
  let stamp = DEFAULT_STAMP, wantSelftest = false, verifyDet = false, partial = false;
  const positional = [];
  for (const a of args) {
    if (a === '--selftest') { wantSelftest = true; continue; }
    if (a === '--verify-determinism') { verifyDet = true; continue; }
    if (a === '--partial') { partial = true; continue; }
    if (a.startsWith('--stamp=')) {
      stamp = a.slice('--stamp='.length);
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(stamp)) {
        die('--stamp must be ISO like 2026-08-24T00:00:00.000Z, got ' + JSON.stringify(stamp));
      }
      continue;
    }
    if (a.startsWith('-')) die('unknown flag ' + a);
    positional.push(a);
  }
  const rooms = positional.length ? positional : Object.keys(REP_ROOMS).sort(cmpStr);
  for (const r of rooms) {
    if (!REP_ROOMS[r]) {
      die('room ' + JSON.stringify(r) + ' is not one of the four reference rooms (' +
          Object.keys(REP_ROOMS).sort(cmpStr).join(', ') + '). This tool builds those and nothing else.');
    }
  }

  const before = snapshotProtectedFiles();
  const fid = assertRecipeByteFaithful();
  assertRecipeConstants();

  const db = openDb();
  const slice = loadSlice();
  const live = loadDonorFile();

  /* Everything the build leans on, re-proved from the database first. */
  assertMepConstant(slice);
  assertDerivationRules(db, slice);
  assertMepCondensationCovers(db, slice);
  const numbering = assertSheetNumberingShared(db);
  const descSlots = buildDescSlotMap(db);
  const convention = conventionOf(db, slice, MEP_DONOR_ROOM);
  const donorProof = assertDonorNumbering(db, live, convention);

  /* A REVIEW SET IS REVIEWED AS A SET. Building a subset and writing it would
   * quietly delete the other rooms from the file Austin is looking at, which is
   * the kind of thing nobody notices until the meeting. So: naming rooms is
   * allowed, writing a short file is not - unless --partial says so, and then
   * the untouched rooms are carried forward from the existing file verbatim and
   * the report says which. Every room is a pure function of the database, the
   * donor and the stamp, so a full run and a sequence of --partial runs land on
   * the same bytes either way. */
  const all = Object.keys(REP_ROOMS).sort(cmpStr);
  const missing = all.filter((r) => !rooms.includes(r));
  if (missing.length && !partial) {
    die('you named ' + rooms.join(', ') + ', which would write a file MISSING ' + missing.join(', ') +
        '. These four rooms are one review set. Run with no room arguments to build all four, or pass ' +
        '--partial to rebuild only the named rooms and carry the others forward from the existing file.');
  }

  const built = buildAll(db, live, slice, rooms, stamp, numbering, descSlots, convention);

  let carried = [];
  if (missing.length) {
    if (!existsSync(OUT_PATH)) {
      die('--partial needs an existing ' + OUT_PATH.replace(REPO + '/', '') + ' to carry ' + missing.join(', ') +
          ' forward from, and there is none. Build all four first.');
    }
    const prev = JSON.parse(readFileSync(OUT_PATH, 'utf8'));
    for (const r of missing) {
      for (const id of [r, r + '-MEP']) {
        if (!prev.docs || !prev.docs[id]) die('--partial cannot carry room ' + r + ' forward: the existing file has no doc ' + id);
        built.docs[id] = prev.docs[id];
      }
      carried.push(r);
    }
  }
  assertDocRules(built.docs);

  if (wantSelftest) {
    const ok = selftest(db, live, slice, built, convention, numbering, descSlots);
    if (!ok) process.exit(1);
  }

  const out = assemble(built.docs, stamp, rooms);
  const text = stringify(out);

  if (verifyDet) {
    const again = buildAll(db, live, slice, rooms, stamp, numbering, descSlots, convention);
    const text2 = stringify(assemble(again.docs, stamp, rooms));
    if (text !== text2) die('the build is NOT deterministic: two in-process runs differ');
    process.stdout.write('\nDETERMINISM: two independent in-process builds are byte-identical (md5 ' +
      md5(text) + ')\n');
  }

  writeFileSync(OUT_PATH, text, 'utf8');

  /* Nothing outside OUT_PATH may have been touched. */
  const after = snapshotProtectedFiles();
  if (stringify(before) !== stringify(after)) {
    die('a protected file changed during this run - that must never happen:\n  ' +
        Object.keys(before).filter((k) => before[k] !== after[k]).join('\n  '));
  }

  printReport(built.reports, numbering, donorProof, fid, descSlots, convention);
  process.stdout.write('\n' + '='.repeat(100) + '\n');
  if (carried.length) {
    process.stdout.write('--partial: rebuilt ' + rooms.join(', ') + '; carried room(s) ' + carried.join(', ') +
      ' forward from the existing file, unchanged\n');
  }
  process.stdout.write('wrote ' + OUT_PATH.replace(REPO + '/', '') + '  (' + Object.keys(out.docs).length +
    ' docs: ' + Object.keys(out.docs).sort(cmpDocId).join(', ') + ')\n');
  process.stdout.write('  md5 ' + md5(text) + '   ' + text.length + ' bytes\n');
  process.stdout.write('READ ONLY and untouched, verified by size+mtime: floor1-staged.json, slice-f1.json, build_floor1.mjs\n');
  process.stdout.write('STAGED FOR APPROVAL. Firestore not touched. Nothing pushed. Nothing deployed.\n\n');
}

main(process.argv);
