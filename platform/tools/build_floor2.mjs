#!/usr/bin/env node
/**
 * build_floor2.mjs - deterministic FLOOR 2 guest-room generator, FF&E and MEP.
 *
 * H2SEP / Home2 Suites by Hilton, Eagle Pass TX - Triun job 24030.
 *
 *   node platform/tools/build_floor2.mjs --selftest
 *   node platform/tools/build_floor2.mjs                (builds every floor-2 room)
 *   node platform/tools/build_floor2.mjs 204 --partial  (rebuild one, carry the rest)
 *   node platform/tools/build_floor2.mjs --spaces       (the floor-2 common areas)
 *   node platform/tools/build_floor2.mjs --verify-determinism
 *   node platform/tools/build_floor2.mjs --stamp=2026-09-02T00:00:00.000Z
 *
 * READS   data/project.sqlite               (read only)
 *         platform/data/floor1-staged.json  (LIVE floor 1 - the text DONOR, READ ONLY)
 *         platform/data/slice-f1.json       (approved slice - READ ONLY, re-proves the recipe)
 *         platform/data/floor2-staged.json  (its own previous output, for --partial, for the
 *                                            common-area docs it carries forward, and for the
 *                                            crew field state a rebuild must never erase)
 * WRITES  platform/data/floor2-staged.json   (the ONLY output)
 *
 * Never touches Firestore. Never pushes. Never deploys. Never writes
 * floor1-staged.json, slice-f1.json or ref-rooms-staged.json.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS BUILDS. Austin, 2026-09-02: "I need the 2 floor built out. Just the
 * FF&E & MEP not the 3d bim yet." Every guest room the rooms table puts on
 * floor 2 - 33 keys - gets an FF&E checklist and an MEP punch. STAGED FOR HIS
 * APPROVAL. NOT LIVE. The common areas are a separate path (--spaces).
 *
 * THIS FILE IS platform/tools/build_ref_rooms.mjs GENERALISED TO A FLOOR.
 * build_ref_rooms.mjs built the four reference mock-ups (202, 217, 230, 238)
 * that Austin reviews from the mock book (ruling D30). Those four rooms are
 * floor-2 keys, so this tool is that tool with three changes and no new
 * reduction logic:
 *
 *   1  THE ROOM TABLE IS READ FROM THE DATABASE. Every floor-2 key in
 *      data/project.sqlite rooms is built; the donor is chosen by ROOM TYPE
 *      from DONOR_BY_TYPE. Same-type donors (King Studio <- 104, Queen-Queen
 *      <- 105, QQ Connecting <- 103) share every tag, so the approved package
 *      text rides whole and only the sheet numbering is re-judged for floor 2.
 *      The four mock-up types keep exactly the donor the mock-ups used.
 *   2  RULING D22 IS APPLIED TO THE PLAIN QUEEN-QUEEN KEYS ON THIS FLOOR, and
 *      to no other type, because the FF&E Installation workbook's 2nd Floor
 *      tab reconciles the same way its 1st Floor tab did (see TAG_CORRECTIONS
 *      below). The evidence for the other two-queen types is written onto
 *      their lines and left for Austin.
 *   3  A REBUILD PRESERVES FIELD STATE. The crew has been working floor 2 in
 *      the live app since August. carry_floor2.mjs brings that work in after
 *      the build; this tool re-applies whatever the staged file already holds
 *      so a regeneration can never zero the floor (the D23 lesson).
 *
 * Everything below the "VERBATIM COPY REGION" marker is a character-for-
 * character copy of build_floor1.mjs, re-proved on every run, exactly as
 * build_ref_rooms.mjs does it. The reduction recipe still has ONE owner.
 * The long design notes that follow are build_ref_rooms.mjs's, kept because
 * every one of them still governs the lines this tool writes.
 * ---------------------------------------------------------------------------
 */
/*
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
 * ---------------------------------------------------------------------------
 * ROUND-3 CORRECTIONS - eight mechanisms, each one a rule and not a patch
 *
 *  1 A MARK LIST IS A LIST. Every mark list is split on "/" and "," on both
 *    sides and matched one mark at a time, with no prefix rule. B3.1 was
 *    flagging the kitchenette sink on all four rooms only because the substring
 *    "SK-3 / SK-4" happens to appear in it verbatim, and missing every shower
 *    and every lavatory. A line carries the marks of its own code AND of every
 *    row of this room folded into it. See splitMarks(), openConflictsFor().
 *  2 THE MEP CONDENSATION MAY NOT LAUNDER EITHER. A condensed line ships at the
 *    WORST reliability among THIS room's rows behind it, and every row that is
 *    not HIGH or whose note states a conflict is quoted on the line. Room 230's
 *    mech_grille_rm shipped a FLAGGED row as a HIGH line with an EMPTY note.
 *  3 A FLOOR-1 SHEET IS NOT A FLOOR-2 CITATION. Which sheet covers which floor
 *    is read out of the sheets table, never guessed. See floorTrueCitation().
 *  4 THE MARK COMES FROM THE TARGET ROOM. A bathing-unresolved line takes its
 *    mark from this room's own bathing rows in the donor's mark family, or
 *    ships with no mark at all. See bathingUnresolvedLine().
 *  5 A NEGATIVE ABOUT THE ROOM IS PROVED ON THE ROOM. The corroboration test
 *    walks every row of the room, not the support set of one line.
 *  6 THE PLACEHOLDER MATCHER USES THE CONFLICTS MATCHER'S BOUNDARY, and also
 *    selects on a mark this room carries. "P402" is not room key 402.
 *  7 A CONFLICT IN A GATED-OUT ROW'S NOTE IS MATCHED ON THE DATABASE'S OWN
 *    WORDS OR ON TWO SHEETS SET AGAINST EACH OTHER. Room 217's WC-02 row said
 *    "Confirm which is intended" and vanished.
 *  8 A TAG ASSERTION INSIDE A CITATION IS A READING, and it is the donor's.
 *    See ownTagAssertions().
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
 *    are floor-1 keys (107 and 108), this room is on another floor, and no
 *    head in it was verified, so those segments are
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
 *   D29  Queen Bed Skirt (BS-Q, qty 2) on the ACCESSIBLE QQ Acc. keys, which in
 *        this set is room 238 and no other. The predicate is build_floor1.mjs's
 *        own and is copied with the entry; the three rooms it does not reach
 *        each report the scope decision rather than passing over it in silence.
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
/* WHICH FLOOR. --floor=3 builds floor 3 into floor3-staged.json with the same
 * recipe, the same donors and its own workbook profile (FLOOR_PROFILES below).
 * Default 2, so every floor-2 command line keeps working unchanged. */
const FLOOR = (() => {
  const a = process.argv.find((x) => x.startsWith('--floor='));
  const f = a ? a.slice('--floor='.length) : '2';
  if (!/^[2-4]$/.test(f)) { process.stderr.write('build_floor2: FATAL: --floor must be 2, 3 or 4\n'); process.exit(1); }
  return f;
})();
const OUT_PATH = resolve(REPO, 'platform', 'data', 'floor' + FLOOR + '-staged.json');
const REF_PATH = resolve(REPO, 'platform', 'data', 'ref-rooms-staged.json');
/* The other floors' staged files are protected too: a floor-3 run must never
 * touch floor2-staged.json. */
const OTHER_FLOOR_PATHS = ['2', '3', '4'].filter((f) => f !== FLOOR).map((f) => resolve(REPO, 'platform', 'data', 'floor' + f + '-staged.json'));
const RECIPE_PATH = resolve(HERE, 'build_floor1.mjs');

/* Determinism. Not Date.now(). Override with --stamp=<ISO> for a dated wave. */
const DEFAULT_STAMP = '2026-09-02T00:00:00.000Z';

/* Files this tool must never write, checked at startup AND after the write. */
const NEVER_WRITE = [SLICE_PATH, DONOR_PATH, RECIPE_PATH, REF_PATH, ...OTHER_FLOOR_PATHS,
  resolve(REPO, 'platform', 'data', 'slice-f1.json')];

/* ===========================================================================
 * THE FOUR REPRESENTATIVE ROOMS
 * =========================================================================== */

/* THE ROOM TABLE IS READ FROM THE DATABASE, NOT TYPED IN. Every floor-2 key in
 * data/project.sqlite rooms is built; the donor is chosen by ROOM TYPE from the
 * map below and nothing else. A type with no entry in the map is a hard stop,
 * never a guess. `keys` is every key of that type building-wide, from the
 * rooms table, which is what the conflicts-table room-key test needs. */
/* ===========================================================================
 * RULING D22 ON FLOOR 2 - THE WORKING WALL TAG, RECONCILED AGAINST THE
 * WORKBOOK'S OWN 2nd FLOOR TAB.
 *
 * D22 (2026-08-20): "The plain Queen-Queen working wall is GR-305, not
 * GR-308." Its evidence was an exact reconciliation on the FF&E Installation
 * workbook's 1st Floor tab. build_ref_rooms.mjs deliberately did NOT carry it
 * to rooms 230 and 238 because that arithmetic said nothing about floor 2.
 *
 * The 2nd Floor tab was read for this build (Drive 1vHg6-8vDVLpoE-x0jwjijOOlXJX4B1Jy,
 * "2nd Floor FF&E Installation"). It lists, as separate purchased parts:
 *   GR-304 Working Wall @ K            L 9 + R 8 = 17   floor 2 has 17 King Studio keys
 *   GR-305 Working Wall @ QQ           L 5 + R 6 = 11   8 plain Queen-Queen + 1 QQ Wide + 2 QQ Extended = 11
 *   GR-308 Working Wall @ QQ Connector L 1 + R 1 =  2   floor 2 has 2 QQ Connecting keys (215, 236)
 *   GR-309R Working Wall @ QQ Accessible          1    floor 2 has 1 QQ Acc. key (238)
 *   GR-315 Working Wall @ K 1 BDRM Suite          1    room 202, which sqlite already tags GR-315
 *   GR-316 Working Wall @ K Accessible            1    room 217, which sqlite already tags GR-316
 * Every count reconciles with no remainder. assertTagCorrectionCountsF2() re-proves
 * the key counts from the database on every run.
 *
 * WHAT IS APPLIED: D22, to the type it names - the 8 plain Queen-Queen keys.
 * WHAT IS NOT: QQ Wide (201) and QQ Extended (230, 232) are not "plain
 * Queen-Queen" and D22 does not name them, even though the tab's 11 only
 * reconciles with them counted as GR-305. QQ Acc. (238) is a DIFFERENT part
 * again (GR-309R purchased; the spec and ID-5.9 say GR-309; A556 tags GR-308).
 * Retagging those four rooms would be a new ruling, so they ship GR-308 exactly
 * as data/project.sqlite transcribes them, with this evidence written onto the
 * line and into room note n_d22 for Austin to close.
 * =========================================================================== */
/* PER-FLOOR PROFILE: the workbook tab read for this floor, the working-wall
 * figures it prints, whether those figures MUST reconcile against the floor's
 * key mix for the build to proceed, and Austin's ask for the floor, verbatim.
 * Floor 2's tab reconciled with no remainder and carried D22 and D33. Floor 3's
 * tab prints the SAME six figures as floor 2's while floor 3's key mix differs
 * (9 plain Queen-Queen, 1 connecting), so it cannot reconcile; it is recorded
 * as evidence, no correction is applied on it, and the lines say so. */
const FLOOR_PROFILES = {
  '2': {
    tab: '2nd Floor FF&E Installation',
    counts: { 'GR-304': 17, 'GR-305': 11, 'GR-308': 2, 'GR-309R': 1, 'GR-315': 1, 'GR-316': 1 },
    mustReconcile: true,
    ask: 'Austin, 2026-09-02: "I need the 2 floor built out. Just the FF&E & MEP not the 3d bim yet."',
  },
  '3': {
    tab: '3rd Floor FF&E Installation',
    counts: { 'GR-304': 17, 'GR-305': 11, 'GR-308': 2, 'GR-309R': 1, 'GR-315': 1, 'GR-316': 1 },
    mustReconcile: false,
    ask: 'Austin, 2026-09-02: "once completed lets start floor 3 just no 3d BIM yet."',
  },
  '4': {
    tab: '4th Floor FF&E Installation',
    counts: { 'GR-304': 17, 'GR-305': 11, 'GR-308': 2, 'GR-309R': 1, 'GR-315': 1, 'GR-316': 1 },
    mustReconcile: false,
    ask: 'Austin, 2026-09-02: "once completed lets start floor 4 just no 3d BIM yet."',
  },
};
const PROFILE = FLOOR_PROFILES[FLOOR];
const WORKBOOK_F2 = 'FF&E Installation workbook, "' + PROFILE.tab + '" tab (Drive 1vHg6-8vDVLpoE-x0jwjijOOlXJX4B1Jy)';
const WORKBOOK_F2_COUNTS = PROFILE.counts;
/* Set by assertTagCorrectionCountsF2() in main(); read by the room notes. */
let TAB_FACTS = { facts: [], mismatches: [] };
const TAG_CORRECTIONS_F2 = [
  {
    ruling: 'D22',
    from: 'GR-308',
    to: 'GR-305',
    roomTypes: ['Queen-Queen'],
    floors: ['2'],
    label: 'Working Wall @ Queen Queen Studio Suite',
    workbook: 'GR-305 Working Wall @ QQ, 2nd Floor tab: L = 5, R = 6, eleven units against floor 2\'s eleven ' +
      'non-connecting two-queen keys (8 plain Queen-Queen, 1 QQ Wide, 2 QQ Extended), and GR-308 Working Wall @ QQ ' +
      'Connector separately as L = 1, R = 1 against the two connecting keys 215 and 236. Eleven and two, no remainder',
    handedness: 'The 2nd Floor tab splits GR-305 into 5 LEFT and 6 RIGHT across those eleven keys. No drawing and ' +
      'no schedule this tool can read says WHICH room takes which hand, so no hand is assigned here. Ruling D26 ' +
      'records that Austin is answering the handedness question himself; confirm the per-room hand with RK Design ' +
      'before this casework is released.',
    basis: 'Austin ruling D22 (2026-08-20), applied to a plain Queen-Queen key on floor 2 with the 2nd Floor tab ' +
      'reconciled as stated',
  },
  /* RULING D33 (2026-09-02). Austin, on the floor-2 review book: "ok retag 201,
   * 230, 232 to GR-305 and 238 to GR-309". The evidence was the same 2nd Floor
   * tab: its eleven GR-305 walls only reconcile with QQ Wide and QQ Extended
   * counted in, and its one GR-309R wall is the one QQ Acc. key. */
  {
    ruling: 'D33',
    from: 'GR-308',
    to: 'GR-305',
    roomTypes: ['QQ Wide', 'QQ Extended'],
    floors: ['2'],
    label: 'Working Wall @ Queen Queen Studio Suite',
    workbook: 'GR-305 Working Wall @ QQ, 2nd Floor tab: L = 5, R = 6, eleven units, which reconcile ONLY as the 8 ' +
      'plain Queen-Queen keys plus QQ Wide 201 plus QQ Extended 230 and 232; GR-308 Working Wall @ QQ Connector is ' +
      'listed separately at L = 1, R = 1 against the two connecting keys 215 and 236',
    handedness: 'The 2nd Floor tab splits GR-305 into 5 LEFT and 6 RIGHT across those eleven keys. No drawing and ' +
      'no schedule this tool can read says WHICH room takes which hand, so no hand is assigned here. Ruling D26 ' +
      'records that Austin is answering the handedness question himself; confirm the per-room hand with RK Design ' +
      'before this casework is released.',
    basis: 'Austin ruling D33 (2026-09-02), on the floor-2 review book: "ok retag 201, 230, 232 to GR-305 and 238 ' +
      'to GR-309" - the purchase record only reconciles with this key on GR-305',
  },
  {
    ruling: 'D33',
    from: 'GR-308',
    to: 'GR-309',
    roomTypes: ['QQ Acc.'],
    floors: ['2'],
    label: 'Working Wall @ Queen Queen Studio Suite Accessible',
    workbook: 'GR-309R Working Wall @ QQ Accessible, 2nd Floor tab: ONE unit, against the ONE QQ Acc. key on floor 2 ' +
      '(238); the FF&E spec and ID-5.9 name GR-309 for this room type and A556 tags GR-308 on the accessible plan - ' +
      'three documents against one, and the workbook is the purchase record',
    handedness: 'The 2nd Floor tab prints the part as GR-309R. Whether that R is a hand is not stated by any ' +
      'document this tool can read and is not asserted here; confirm the hand with RK Design before this casework ' +
      'is released.',
    basis: 'Austin ruling D33 (2026-09-02), on the floor-2 review book: "ok retag 201, 230, 232 to GR-305 and 238 ' +
      'to GR-309"',
  },
  /* RULING D35 (2026-09-02). Austin, on the floor-3 review book: "carry D22 and
   * D33 up by room type on floor 3". The 3rd Floor tab does NOT reconcile with
   * floor 3's key mix (12 two-queen walls against 11 printed, 1 connector
   * against 2), so the evidence here is the ruling itself, extending the
   * floor-2 rulings BY ROOM TYPE: plain Queen-Queen, QQ Wide and QQ Extended
   * take GR-305; QQ Acc. takes GR-309; the connecting key keeps GR-308. */
  {
    ruling: 'D35',
    from: 'GR-308',
    to: 'GR-305',
    roomTypes: ['Queen-Queen', 'QQ Wide', 'QQ Extended'],
    floors: ['3'],
    label: 'Working Wall @ Queen Queen Studio Suite',
    quote: 'carry D22 and D33 up by room type on floor 3',
    workbook: 'the 3rd Floor tab prints GR-305 Working Wall @ QQ at L = 5, R = 6, eleven units, and GR-308 Working Wall ' +
      '@ QQ Connector at L = 1, R = 1; floor 3 per the drawings has 9 plain Queen-Queen + 1 QQ Wide + 2 QQ Extended = ' +
      '12 two-queen keys and ONE connecting key (336), so the tab does NOT reconcile (12 against 11, 1 against 2) and is ' +
      'not the evidence for this line. The evidence is the ruling: D22 (plain Queen-Queen, floor 1 and floor 2) and D33 ' +
      '(QQ Wide and QQ Extended, floor 2) carried up by room type at Austin\'s instruction',
    handedness: 'The 3rd Floor tab splits GR-305 into 5 LEFT and 6 RIGHT for eleven walls where floor 3 has twelve; no ' +
      'document this tool can read says which room takes which hand or accounts for the twelfth wall, so no hand is ' +
      'assigned here. Confirm the per-room hand and the twelfth unit with RK Design before this casework is released.',
    basis: 'Austin ruling D35 (2026-09-02), on the floor-3 review book: "carry D22 and D33 up by room type on floor 3"',
  },
  {
    ruling: 'D35',
    from: 'GR-308',
    to: 'GR-309',
    roomTypes: ['QQ Acc.'],
    floors: ['3'],
    label: 'Working Wall @ Queen Queen Studio Suite Accessible',
    quote: 'carry D22 and D33 up by room type on floor 3',
    workbook: 'the 3rd Floor tab prints GR-309R Working Wall @ QQ Accessible at ONE unit against the ONE QQ Acc. key on ' +
      'floor 3 (338), which reconciles; the FF&E spec and ID-5.9 name GR-309 for this room type while the accessible plan ' +
      'tags GR-308. D33 retagged floor 2\'s QQ Acc. key (238) to GR-309 on that evidence',
    handedness: 'The 3rd Floor tab prints the part as GR-309R. Whether that R is a hand is not stated by any document ' +
      'this tool can read and is not asserted here; confirm the hand with RK Design before this casework is released.',
    basis: 'Austin ruling D35 (2026-09-02), on the floor-3 review book: "carry D22 and D33 up by room type on floor 3"',
  },
  /* RULING D37 (2026-09-02). Austin, on the floor-4 review book: "carry D22,
   * D33 and D35 up by room type on floor 4". Floor 4 has no QQ Acc. key, so
   * the GR-309 half has nothing to reach; the three connecting keys (401 QQ
   * Wide Connecting, 403, 436) keep GR-308; 438 (King Studio Acc.) carries
   * GR-307 and is untouched. */
  {
    ruling: 'D37',
    from: 'GR-308',
    to: 'GR-305',
    roomTypes: ['Queen-Queen', 'QQ Wide', 'QQ Extended'],
    floors: ['4'],
    label: 'Working Wall @ Queen Queen Studio Suite',
    quote: 'carry D22, D33 and D35 up by room type on floor 4',
    workbook: 'the 4th Floor tab prints GR-305 Working Wall @ QQ at L = 5, R = 6, eleven units, GR-308 Working Wall @ QQ ' +
      'Connector at L = 1, R = 1, and one GR-309R; floor 4 per the drawings has 8 plain Queen-Queen + 0 QQ Wide + 2 QQ ' +
      'Extended = 10 two-queen keys, THREE connecting keys (401, 403, 436) and no QQ Acc. key, so the tab does NOT ' +
      'reconcile (10 against 11, 3 against 2, 0 against 1) and is not the evidence for this line. The evidence is the ' +
      'ruling: D22 (plain Queen-Queen, floors 1 and 2), D33 (QQ Wide and QQ Extended, floor 2) and D35 (floor 3) ' +
      'carried up by room type at Austin\'s instruction',
    handedness: 'The 4th Floor tab splits GR-305 into 5 LEFT and 6 RIGHT for eleven walls where floor 4 has ten; no ' +
      'document this tool can read says which room takes which hand or accounts for the eleventh unit, so no hand is ' +
      'assigned here. Confirm the per-room hand with RK Design before this casework is released.',
    basis: 'Austin ruling D37 (2026-09-02), on the floor-4 review book: "carry D22, D33 and D35 up by room type on floor 4"',
  },
];

function applyTagCorrectionsF2(roomNo, room, rows) {
  const applied = [];
  for (const c of TAG_CORRECTIONS_F2) {
    if (!c.roomTypes.includes(room.room_type)) continue;
    /* A correction reaches the floors it is evidenced on and no other; a room on
     * another floor keeps its transcribed tag and the room note says why. */
    if (!c.floors.includes(String(room.floor))) continue;
    const hit = rows.filter((r) => r.tag === c.from);
    if (!hit.length) continue;
    if (hit.length !== 1) die('room ' + roomNo + ': ' + hit.length + ' rows tagged ' + c.from + ', expected ONE working wall per key');
    for (const r of hit) r.tag = c.to;
    applied.push({ ruling: c.ruling, from: c.from, to: c.to, rows: hit.map((r) => r.item_id), ownNote: hit[0].note || '', spec: c });
  }
  return applied;
}

/* The correction is only evidence while the counts reconcile. Re-proved from the
 * database on every run, never trusted from the comment above. */
function assertTagCorrectionCountsF2(db) {
  const n = (sql) => db.prepare(sql).get(FLOOR).n;
  const plain = n("select count(*) n from rooms where floor = ? and room_type = 'Queen-Queen'");
  const wide = n("select count(*) n from rooms where floor = ? and room_type = 'QQ Wide'");
  const ext = n("select count(*) n from rooms where floor = ? and room_type = 'QQ Extended'");
  const conn = n("select count(*) n from rooms where floor = ? and room_type in ('QQ Connecting','QQ Wide Connecting')");
  const acc = n("select count(*) n from rooms where floor = ? and room_type = 'QQ Acc.'");
  const ks = n("select count(*) n from rooms where floor = ? and room_type = 'King Studio'");
  const k1 = n("select count(*) n from rooms where floor = ? and room_type = 'King One Bedroom'");
  const k1a = n("select count(*) n from rooms where floor = ? and room_type = 'King One Bedroom Acc.'");
  const facts = [], mismatches = [];
  const want = (tag, got, how) => {
    if (WORKBOOK_F2_COUNTS[tag] !== got) {
      const msg = tag + ': the ' + PROFILE.tab + ' tab lists ' + WORKBOOK_F2_COUNTS[tag] + ', floor ' + FLOOR +
        '\'s key mix gives ' + got + ' (' + how + ')';
      if (PROFILE.mustReconcile) {
        die('working-wall count check failed on floor ' + FLOOR + ': ' + msg + '. The corrections are only evidence while those match.');
      }
      mismatches.push(msg);
      return;
    }
    facts.push(tag + ' = ' + got + ' (' + how + ')');
  };
  want('GR-304', ks, ks + ' King Studio');
  want('GR-305', plain + wide + ext, plain + ' plain Queen-Queen + ' + wide + ' QQ Wide + ' + ext + ' QQ Extended');
  want('GR-308', conn, conn + ' connecting key(s)');
  want('GR-309R', acc, acc + ' QQ Acc.');
  want('GR-315', k1, k1 + ' King One Bedroom');
  want('GR-316', k1a, k1a + ' King One Bedroom Acc.');
  const stray = db.prepare("select count(*) n from room_items where tag = 'GR-305' or tag = 'GR-309'").get().n;
  if (stray !== 0) die('D22/D33 assume the database carries no GR-305 or GR-309 row anywhere, but it now has ' + stray + '.');
  const k1tags = db.prepare("select r.room_no, i.tag from rooms r join room_items i on i.room_no = r.room_no where r.floor = ? and r.room_type in ('King One Bedroom','King One Bedroom Acc.') and i.tag in ('GR-315','GR-316')").all(FLOOR);
  if (k1tags.length !== k1 + k1a) die('expected every King One Bedroom key on floor ' + FLOOR + ' to carry GR-315 / GR-316 in sqlite; found ' + JSON.stringify(k1tags));
  TAB_FACTS = { facts, mismatches };
  return { plain, wide, ext, conn, acc, ks, facts, mismatches };
}

/** The D22 line text for a corrected floor-2 room. Replaces the donor's note,
 *  which is a true statement about FLOOR 1 and a false one about this room. */
function d22LineNote(roomNo, corr, flaggedByConflict) {
  const c = corr.spec;
  const history = c.ruling === 'D22'
    ? 'D22 was ruled on floor 1 against the FF&E Installation workbook\'s 1st Floor tab; room ' + roomNo +
      ' is on floor ' + FLOOR + ', and the SAME reconciliation holds on the ' + WORKBOOK_F2 + ': '
    : c.ruling === 'D33'
      ? 'Ruling D22 (2026-08-20) corrected the plain Queen-Queen keys on this evidence and D33 extends it to this key ' +
        'on the ' + WORKBOOK_F2 + ': '
      : 'Rulings D22 (2026-08-20) and D33 (2026-09-02) retagged every two-queen key on floor 2 against the workbook\'s ' +
        '2nd Floor tab, which reconciled exactly; ' + c.ruling + ' carries them up to floor ' + FLOOR + ' BY ROOM TYPE. ' +
        'What the purchase record (' + WORKBOOK_F2 + ') says: ';
  return 'Austin ruling ' + c.ruling + ': this room takes ' + c.to + ', not ' + c.from + '. The two are different ' +
    'purchased parts, not two names for one. ' + history + c.workbook + '. data/project.sqlite transcribed this room ' +
    'as ' + c.from + ' and carries no ' + c.to + ' row anywhere in the building; its own row note, verbatim: "' +
    corr.ownNote + '". STILL OPEN: ' + c.handedness + ' SOURCE. Tag: ' + c.basis + '. Label: the workbook\'s own ' +
    'item name. Citation, quantity, category and sort: this room\'s own data/project.sqlite row(s) ' +
    corr.rows.join(', ') + (flaggedByConflict
      ? '. Reliability FLAGGED: an OPEN conflicts-table entry names this mark and travels with the line (quoted below); ' +
        'the ruling on its own would make it MEDIUM, and it becomes MEDIUM once that entry is closed, while the ' +
        'handedness stays open.'
      : '. Reliability MEDIUM while the handedness is open.');
}

const DONOR_BY_TYPE = {
  'King Studio':           { donor: '104', donorType: 'King Studio',
    why: 'SAME TYPE as LIVE floor-1 room 104 (King Studio): every tag is shared and the approved package text rides whole; only the sheet numbering is re-judged for this floor.' },
  'King One Bedroom':      { donor: '104', donorType: 'King Studio',
    why: 'closest built type with an approved package: King Studio room 104 - same bed family, same kitchenette, same bath fixtures. Shared tags only; anything else ships from sqlite. Reference mock-up: room 202 (ruling D30).' },
  'King One Bedroom Acc.': { donor: '104', donorType: 'King Studio',
    why: 'closest built type with an approved package: King Studio room 104. The ACCESSIBLE bath package is this room\'s own and is not taken from 104. Reference mock-up: room 217 (ruling D30).' },
  'Queen-Queen':           { donor: '105', donorType: 'Queen-Queen',
    why: 'SAME TYPE as LIVE floor-1 room 105 (Queen-Queen): every tag is shared and the approved package text rides whole; only the sheet numbering is re-judged for this floor.' },
  'QQ Wide':               { donor: '105', donorType: 'Queen-Queen',
    why: 'room_types says QQ Wide inherits its item rows from Queen-Queen (one A555 plan, alternate dimension strings; override OV-001 makes the difference label-only, display_label "QQ Studio"), so LIVE room 105 is the same package. Quantities are this room\'s own rows.' },
  'QQ Extended':           { donor: '105', donorType: 'Queen-Queen',
    why: 'same room_sheet as the donor (room_types QQ Extended room_sheet = A555, identical to Queen-Queen), so the SHEET NAME needs no re-point and every A555 reference stands verbatim WITH ONE EXCEPTION: the ".1" variant, which room_types identifies as the QQ CONNECTING plan and which is dropped because this room\'s rooms.connecting is 0. Reference mock-up: room 230 (ruling D30).' },
  'QQ Acc.':               { donor: '105', donorType: 'Queen-Queen',
    why: 'closest built type with an approved package: Queen-Queen room 105 - the only other two-queen type that is built. The ACCESSIBLE bath package is this room\'s own. Reference mock-up: room 238 (ruling D30).' },
  'QQ Connecting':         { donor: '103', donorType: 'QQ Connecting',
    why: 'SAME TYPE as APPROVED floor-1 room 103 (QQ Connecting, rooms.connecting = 1): every tag is shared, the ".1" connecting plan references are KEPT, and the approved package text rides whole; only the sheet numbering is re-judged for this floor.' },
  /* Floor 4 adds the two types floors 2 and 3 do not have; both have a LIVE
   * floor-1 room of the SAME type. */
  'QQ Wide Connecting':    { donor: '101', donorType: 'QQ Wide Connecting',
    why: 'SAME TYPE as APPROVED floor-1 room 101 (QQ Wide Connecting, rooms.connecting = 1; display_label "QQ Studio Connector" per OV-001): every tag is shared, the ".1" connecting plan references are KEPT, and the approved package text rides whole; only the sheet numbering is re-judged for this floor.' },
  'King Studio Acc.':      { donor: '104', donorType: 'King Studio',
    why: 'closest built type with an approved package: King Studio room 104 - same bed family, same kitchenette, same working-wall family. Shared tags only; the ACCESSIBLE bath package is this room\'s own and ships from sqlite. LIVE room 118 (King Studio Acc. Mod., A552) is deliberately NOT the donor: it was built under ruling D19, which put room 118 on the roll-in shower and reaches no other key, so its closed bathing lines and its D19-shaped numbering must not travel. This room carries BOTH bathing configurations, FLAGGED, exactly as the accessible mock-ups 217 and 238 do.' },
};
/* Filled by loadRoomTable(db) before anything reads it. Keyed by room number,
 * same shape the reference-room table had: type, keys, donor, donorType, sheets, why. */
const REP_ROOMS = {};
function loadRoomTable(db) {
  const rooms = db.prepare('SELECT room_no, room_type FROM rooms WHERE floor = ? ORDER BY room_no').all(FLOOR);
  if (!rooms.length) die('no rooms on floor ' + FLOOR + ' in data/project.sqlite');
  for (const r of rooms) {
    const d = DONOR_BY_TYPE[r.room_type];
    if (!d) die('room ' + r.room_no + ' is type ' + JSON.stringify(r.room_type) + ' and DONOR_BY_TYPE names no donor for it. Not guessing one.');
    const rt = db.prepare('SELECT room_sheet, bath_sheet FROM room_types WHERE type_name = ?').get(r.room_type) || {};
    const keys = db.prepare('SELECT room_no FROM rooms WHERE room_type = ? ORDER BY room_no').all(r.room_type).map((x) => x.room_no);
    REP_ROOMS[r.room_no] = {
      type: r.room_type, keys,
      donor: d.donor, donorType: d.donorType,
      sheets: 'plan A10' + (Number(FLOOR) - 1) + '; room sheet ' + (rt.room_sheet || '?') + '; bath ' + (rt.bath_sheet || '?'),
      why: d.why,
    };
  }
  return Object.keys(REP_ROOMS).sort(cmpStr);
}

/* die() is NOT copied. build_floor1.mjs's version hard-codes a "build_floor1:"
 * prefix, and an error from THIS tool wearing the other tool's name sends the
 * reader to the wrong file. It is an error printer, not a reduction rule. */
function die(msg) {
  process.stderr.write('build_floor2: FATAL: ' + msg + '\n');
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
  'FIELD_STATE_KEYS', 'preserveFieldState',
  /* the common-area recipe, copied for the --spaces path */
  'SPACE_ID_PREFIX', 'SPACE_MEP_SUFFIX', 'SPACE_ID_MAX', 'SPACE_MEP_DOC_TYPE', 'SPACE_MULTIPLIER_RE', 'isSpaceDocId', 'spaceIdSlug', 'spaceDocId', 'spaceMepDocId', 'spaceTypeSlug', 'readSpaceList', 'readSpace', 'reduceSpaceBand', 'assertSpaceMultipliers', 'assertSpaceIds', 'spaceGateDrops', 'spaceUnknownMepCategories', 'spaceDuplicateTags', 'duplicateConflictText', 'buildSpaceBandDoc',
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
      "function composeMepCitation(donorSrc, mine, roomSheet, isConnecting, numbering, donorSheet, allRows) {\n"
      + "  /* ADDED (build_ref_rooms): room 230 sits on the SAME sheet as its donor\n"
      + "   * (QQ Extended room_sheet A555 == Queen-Queen room_sheet A555). There is\n"
      + "   * nothing to re-point, and running the number sift would strip A555 view\n"
      + "   * numbers off a room that IS on A555. So the donor citation stands - with\n"
      + "   * ONE exception, which a shared sheet does not make shared: the '.1'\n"
      + "   * CONNECTING plan variant. See sameSheetCitation(). */\n"
      + "  if (donorSheet === roomSheet) {\n"
      + "    return sameSheetCitation(donorSrc, isConnecting, roomSheet);\n"
      + "  }"],
    ["    const survivors = kept.filter((x) => x.includes(roomSheet) && !BOTH.test(x) &&\n"
      + "      (citeViewNumbers(x).size || citeKeynoteNumbers(x).size));",
      "    const survivorsOf = () => kept.filter((x) => x.includes(roomSheet) && !BOTH.test(x) &&\n"
      + "      (citeViewNumbers(x).size || citeKeynoteNumbers(x).size));\n"
      + "    /* ADDED (build_ref_rooms): THIS ROOM'S OWN GUESTROOM-SHEET REFERENCE IS\n"
      + "     * USED WHEREVER IT EXISTS, not only where the re-pointed donor segment\n"
      + "     * reduces to the bare sheet name. 217-MEP/lv_phone_db reduced to \"A554 tag\n"
      + "     * 905\" - not the bare \"A554\" - so the old test failed, the non-empty\n"
      + "     * ownArch built from ITM-0031 (\"A55x kn28; A550 P&S legend\", which resolves\n"
      + "     * to A554 kn28) was thrown away, and the line printed a claim about the\n"
      + "     * whole room that its own support row contradicts. Where nothing numbered\n"
      + "     * survives the sift, this room's own rows supply the reference and the line\n"
      + "     * says which rows they are. */\n"
      + "    if (!ownUsed && ownArch.length && !survivorsOf().length) {\n"
      + "      ownUsed = true;\n"
      + "      for (const o of ownArch) if (!kept.includes(o)) kept.push(o);\n"
      + "    }\n"
      + "    const survivors = survivorsOf();\n"
      + "    /* ADDED (build_ref_rooms): CORROBORATION IS NUMBER BY NUMBER, AND A CLAIM\n"
      + "     * ABOUT THE WHOLE ROOM IS TESTED AGAINST THE WHOLE ROOM.\n"
      + "     * Citing the same SHEET is not evidence - it is the very thing the sift\n"
      + "     * just finished disproving - and citing the same NUMBER on a different\n"
      + "     * sheet is not evidence either, so both tests have to pass. And the walk\n"
      + "     * is over EVERY row of this room, not over the support set of this one\n"
      + "     * condensed line: room 202's own ITM-0010 cites \"A55x kn1\", which resolves\n"
      + "     * to exactly the surviving \"A553 kn1\", and the line still printed \"NO row\n"
      + "     * of this room's own cites that number\" because ITM-0010 is not one of\n"
      + "     * mech_ptac's source rows. A negative about the room has to be proved on\n"
      + "     * the room. */\n"
      + "    const survivorViews = new Set(survivors.flatMap((x) => [...citeViewNumbers(x)]));\n"
      + "    const survivorKns = new Set(survivors.flatMap((x) => [...citeKeynoteNumbers(x)]));\n"
      + "    const roomSegsByRow = [];\n"
      + "    for (const r of allRows || []) {\n"
      + "      const segs = citeSegments(resolveSheetWildcard(r.source_sheet || r.primary_sheet || '', roomSheet))\n"
      + "        .filter((s) => s.includes(roomSheet));\n"
      + "      if (segs.length) roomSegsByRow.push({ id: r.item_id, segs });\n"
      + "    }\n"
      + "    const proofOf = (nums, kind) => [...nums].sort(cmpStr).map((n) => ({\n"
      + "      what: (kind === 'view' ? 'view ' : 'keynote ') + n,\n"
      + "      rows: roomSegsByRow.filter((o) => o.segs.some((s) => (kind === 'view'\n"
      + "        ? citeViewNumbers(s) : citeKeynoteNumbers(s)).has(n))).map((o) => o.id),\n"
      + "    }));\n"
      + "    const numberProof = [...proofOf(survivorViews, 'view'), ...proofOf(survivorKns, 'kn')];\n"
      + "    const corroborated = numberProof.filter((p) => p.rows.length);\n"
      + "    const uncorroborated = numberProof.filter((p) => !p.rows.length);"],
    ["    outcome = ownUsed ? \"replaced by this room's own row(s) \" + ownRowIds.join(', ')\n"
      + "      : survivors.length ? 'proven sheet-independent numbering kept: ' + survivors.join('; ')\n"
      + "      : 'sheet cited alone - this room has no row of its own';\n"
      + "    const how = ownUsed\n"
      + "      ? \"This room's own row(s) \" + ownRowIds.join(', ') + ' supply the ' + roomSheet + ' reference instead.'\n"
      + "      : survivors.length\n"
      + "        ? 'What is left - ' + survivors.map((x) => '\"' + x + '\"').join(', ') + ' - is numbering the database ' +\n"
      + "          \"writes sheet-independently, so it holds on \" + roomSheet +\n"
      + "          (ownRowIds.length ? \" and this room's own row(s) \" + ownRowIds.join(', ') + ' cite it too.' : '.')\n"
      + "        : 'This room has no row of its own that places this line on a guestroom sheet, so the sheet is cited ' +\n"
      + "          'with no view or keynote number at all. Confirm it on ' + roomSheet + ' before relying on one.';",
      "    /* WHAT IS SAID IS WHAT IS CITED, AND BY WHICH ROW. The corroboration text\n"
      + "     * used to close on room-wide negatives - \"NO row of this room's own cites\n"
      + "     * that number\", \"this room has no row of its own that places this line on a\n"
      + "     * guestroom sheet\". A sentence like that is a claim about every row in the\n"
      + "     * room, it is the hardest kind of claim to keep true through a rebuild, and\n"
      + "     * on 217-MEP/lv_phone_db it was already false. So the line names the rows\n"
      + "     * that DO corroborate, labels the numbers that are UNVERIFIED for this room,\n"
      + "     * and stops there. */\n"
      + "    const unverified = uncorroborated.map((p) => p.what).join(', ');\n"
      + "    outcome = ownUsed ? \"replaced by this room's own row(s) \" + ownRowIds.join(', ')\n"
      + "      : survivors.length ? 'proven sheet-independent numbering kept: ' + survivors.join('; ')\n"
      + "      : 'sheet cited by name only';\n"
      + "    const how = ownUsed\n"
      + "      ? \"This room's own row(s) \" + ownRowIds.join(', ') + ' supply the ' + roomSheet + ' reference instead, and ' +\n"
      + "        'that reference is on this line above.'\n"
      + "      : survivors.length\n"
      + "        ? 'What is left - ' + survivors.map((x) => '\"' + x + '\"').join(', ') + ' - is numbering the database ' +\n"
      + "          \"writes sheet-independently, so it holds on \" + roomSheet +\n"
      + "          (corroborated.length\n"
      + "            ? \", and this room's own rows corroborate it NUMBER BY NUMBER: \" +\n"
      + "              corroborated.map((p) => p.what + ' <- ' + p.rows.join(', ')).join('; ') +\n"
      + "              (uncorroborated.length\n"
      + "                ? '. UNVERIFIED for this room: ' + unverified + ' - read ' +\n"
      + "                  (uncorroborated.length > 1 ? 'them' : 'it') + ' on ' + roomSheet + ' and confirm before relying ' +\n"
      + "                  'on ' + (uncorroborated.length > 1 ? 'them' : 'it') + '.'\n"
      + "                : '.')\n"
      + "            : '. UNVERIFIED for this room: ' + unverified + ' - the corroboration test is NUMBER BY NUMBER on ' +\n"
      + "              roomSheet + ' and it is run against EVERY row of this room rather than only the rows behind this ' +\n"
      + "              'line' + (roomSegsByRow.length\n"
      + "                ? ' (' + roomSegsByRow.length + ' row(s) of this room cite ' + roomSheet + ', at other numbers)'\n"
      + "                : '') + '. Read ' + (uncorroborated.length > 1 ? 'them' : 'it') + ' on ' + roomSheet +\n"
      + "              ' and confirm before relying on ' + (uncorroborated.length > 1 ? 'them' : 'it') + '.')\n"
      + "        : 'The sheet is cited by name only, with no view or keynote number on it. Confirm the location on ' +\n"
      + "          roomSheet + ' before relying on one.';"],
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

/* COPIED from build_floor1.mjs (proved by assertRecipeConstants): the floor-1
 * placement of the King-family variant rows - the PTAC unit, the shower, the
 * enclosure and the three sprinkler heads - onto their condensed lines. A row
 * named here is placed the way floor 1 placed it, before product identity is
 * tried; without it room 204's PTAC unit row landed as a line of its own. */
const MEP_VARIANT_SLOTS = {
  'ITM-0150': 'plmb_shower_a', 'ITM-0200': 'plmb_shower_a', 'ITM-0706': 'plmb_shower_a',
  'ITM-0151': 'plmb_shencl_a', 'ITM-0201': 'plmb_shencl_a', 'ITM-0730': 'plmb_shencl_a',
  'ITM-0152': 'mech_ptac', 'ITM-0202': 'mech_ptac', 'ITM-0240': 'mech_ptac',
  'ITM-0156': 'fp_heads_a', 'ITM-0157': 'fp_heads_a', 'ITM-0158': 'fp_heads_a',
};

const MEP_LABEL_FROM_ROW = new Set(['plmb_shower_a', 'plmb_shencl_a']);

const PTAC_DONOR_M401 = 'M401 det.01 + KN3 + KN7';
const PTAC_NAMEPLATE = 'Model reads off the nameplate: AZ65H12DAB is PTAC-1, AZ65H15DAB is PTAC-2.';
const FP_COUNT_SENTENCE = 'head count varies by room, so verify every head you can see rather than counting to a number.';

/* room_types.room_sheet is unambiguous for all four of these types (A553, A554,
 * A555, A556), so no resolution entry is needed. The A551/A552 split that room
 * 118 and room 438 argue about does not reach any room in this set - recorded
 * so the reader knows it was checked, not forgotten. */
/* room_types.room_sheet is ambiguous for exactly one type, King Studio Acc.:
 * "A551 / A552". build_floor1.mjs resolved room 118 to A552 on the rows that
 * exist only there; the same database facts resolve room 438 to A551: 438
 * carries GR-502 (primary_sheet A551) and carries NEITHER GR-320 NOR GR-208,
 * the two rows whose own note reads "present on A552 (118), absent on A551
 * (438)". room_types adds, verbatim: "ASSUMPTION ~90%: 118 = Acc. Mod.
 * (A552/ID-5.3), 438 = Acc. (A551/ID-5.2)". */
const ROOM_SHEET_RESOLUTION = {
  438: {
    sheet: 'A551',
    otherSheet: 'A552',
    otherRoom: '118',
    onlyHere: ['GR-502'],
    onlyThere: ['GR-320', 'GR-208'],
    why: "room 438 carries GR-502 on A551 and neither GR-320 nor GR-208, the two rows data/project.sqlite marks " +
      "'present on A552 (118), absent on A551 (438)'. A551 is titled 'Enl. Guest Room Plans & Elevs - King Studio Acc.'",
  },
};

/* The donor index must ignore retired lines. See the header. */
const DONOR_INDEX_SKIPS_DELETED = true;

/* ===========================================================================
 * RULED LINE ADDITIONS - D27, D28 and D29, copied verbatim from
 * build_floor1.mjs and re-proved against it on every run by
 * assertRecipeConstants().
 *
 * D29 (2026-08-24): "make sure to add Bed Skirts to the ADA rooms." The King
 * accessible keys already carry GR-603.1 from the drawings; the QQ Acc. rooms
 * (238, 338) have two GR-602.ADA open accessible bases and NO skirt row - the
 * standard queens use a GR-600.1 Box Spring Cover an open base cannot take, and
 * no queen skirt tag exists in the document set. Owner-ruled line, qty 2
 * matching the room's own two accessible base rows. It fires on room 238 of
 * this set - the only QQ Acc. representative - and on no other, which is why
 * `applies` is honoured here rather than dropped.
 * =========================================================================== */

const RULED_LINE_ADDITIONS = [
  {
    ruling: 'D29', doc: 'ffe', key: 'bsq_a', category: 'FF&E - Bedding', sort: 16060,
    code: 'BS-Q', qty: 2,
    label: 'Queen Bed Skirt @ ACCESSIBLE bed base',
    src: 'D29 (AJ 2026-08-24); rooms own GR-602.ADA rows',
    note: 'Added by Austin ruling D29: bed skirts on the ADA rooms. This room has two GR-602.ADA ' +
      'ACCESSIBLE open bed bases and the drawing set tags no queen skirt (the standard queen rooms ' +
      'use a GR-600.1 Box Spring Cover an open base cannot take). Qty 2 matches the room\'s own two ' +
      'accessible base rows. No document tag exists for this item - confirm the size with the FF&E ' +
      'supplier before ordering.',
    applies: (room) => String(room.accessible) === '1' && room.room_type === 'QQ Acc.',
  },
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
          + 'reasons only about the King rooms; this room\'s own sqlite row explains its single GR-202 '
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

function composeMepCitation(donorSrc, mine, roomSheet, isConnecting, numbering, donorSheet, allRows) {
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
  for (const r of mine || []) {
    const segs = citeSegments(resolveSheetWildcard(r.source_sheet || r.primary_sheet || '', roomSheet));
    let used = false;
    for (const seg of segs) {
      if (!/A55\d/.test(seg)) continue;
      used = true;
      if (!ownArch.includes(seg)) ownArch.push(seg);
    }
    if (used && !ownRowIds.includes(r.item_id)) ownRowIds.push(r.item_id);
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
    const survivorsOf = () => kept.filter((x) => x.includes(roomSheet) && !BOTH.test(x) &&
      (citeViewNumbers(x).size || citeKeynoteNumbers(x).size));
    /* ADDED (build_ref_rooms): THIS ROOM'S OWN GUESTROOM-SHEET REFERENCE IS
     * USED WHEREVER IT EXISTS, not only where the re-pointed donor segment
     * reduces to the bare sheet name. 217-MEP/lv_phone_db reduced to "A554 tag
     * 905" - not the bare "A554" - so the old test failed, the non-empty
     * ownArch built from ITM-0031 ("A55x kn28; A550 P&S legend", which resolves
     * to A554 kn28) was thrown away, and the line printed a claim about the
     * whole room that its own support row contradicts. Where nothing numbered
     * survives the sift, this room's own rows supply the reference and the line
     * says which rows they are. */
    if (!ownUsed && ownArch.length && !survivorsOf().length) {
      ownUsed = true;
      for (const o of ownArch) if (!kept.includes(o)) kept.push(o);
    }
    const survivors = survivorsOf();
    /* ADDED (build_ref_rooms): CORROBORATION IS NUMBER BY NUMBER, AND A CLAIM
     * ABOUT THE WHOLE ROOM IS TESTED AGAINST THE WHOLE ROOM.
     * Citing the same SHEET is not evidence - it is the very thing the sift
     * just finished disproving - and citing the same NUMBER on a different
     * sheet is not evidence either, so both tests have to pass. And the walk
     * is over EVERY row of this room, not over the support set of this one
     * condensed line: room 202's own ITM-0010 cites "A55x kn1", which resolves
     * to exactly the surviving "A553 kn1", and the line still printed "NO row
     * of this room's own cites that number" because ITM-0010 is not one of
     * mech_ptac's source rows. A negative about the room has to be proved on
     * the room. */
    const survivorViews = new Set(survivors.flatMap((x) => [...citeViewNumbers(x)]));
    const survivorKns = new Set(survivors.flatMap((x) => [...citeKeynoteNumbers(x)]));
    const roomSegsByRow = [];
    for (const r of allRows || []) {
      const segs = citeSegments(resolveSheetWildcard(r.source_sheet || r.primary_sheet || '', roomSheet))
        .filter((s) => s.includes(roomSheet));
      if (segs.length) roomSegsByRow.push({ id: r.item_id, segs });
    }
    const proofOf = (nums, kind) => [...nums].sort(cmpStr).map((n) => ({
      what: (kind === 'view' ? 'view ' : 'keynote ') + n,
      rows: roomSegsByRow.filter((o) => o.segs.some((s) => (kind === 'view'
        ? citeViewNumbers(s) : citeKeynoteNumbers(s)).has(n))).map((o) => o.id),
    }));
    const numberProof = [...proofOf(survivorViews, 'view'), ...proofOf(survivorKns, 'kn')];
    const corroborated = numberProof.filter((p) => p.rows.length);
    const uncorroborated = numberProof.filter((p) => !p.rows.length);
    /* WHAT IS SAID IS WHAT IS CITED, AND BY WHICH ROW. The corroboration text
     * used to close on room-wide negatives - "NO row of this room's own cites
     * that number", "this room has no row of its own that places this line on a
     * guestroom sheet". A sentence like that is a claim about every row in the
     * room, it is the hardest kind of claim to keep true through a rebuild, and
     * on 217-MEP/lv_phone_db it was already false. So the line names the rows
     * that DO corroborate, labels the numbers that are UNVERIFIED for this room,
     * and stops there. */
    const unverified = uncorroborated.map((p) => p.what).join(', ');
    outcome = ownUsed ? "replaced by this room's own row(s) " + ownRowIds.join(', ')
      : survivors.length ? 'proven sheet-independent numbering kept: ' + survivors.join('; ')
      : 'sheet cited by name only';
    const how = ownUsed
      ? "This room's own row(s) " + ownRowIds.join(', ') + ' supply the ' + roomSheet + ' reference instead, and ' +
        'that reference is on this line above.'
      : survivors.length
        ? 'What is left - ' + survivors.map((x) => '"' + x + '"').join(', ') + ' - is numbering the database ' +
          "writes sheet-independently, so it holds on " + roomSheet +
          (corroborated.length
            ? ", and this room's own rows corroborate it NUMBER BY NUMBER: " +
              corroborated.map((p) => p.what + ' <- ' + p.rows.join(', ')).join('; ') +
              (uncorroborated.length
                ? '. UNVERIFIED for this room: ' + unverified + ' - read ' +
                  (uncorroborated.length > 1 ? 'them' : 'it') + ' on ' + roomSheet + ' and confirm before relying ' +
                  'on ' + (uncorroborated.length > 1 ? 'them' : 'it') + '.'
                : '.')
            : '. UNVERIFIED for this room: ' + unverified + ' - the corroboration test is NUMBER BY NUMBER on ' +
              roomSheet + ' and it is run against EVERY row of this room rather than only the rows behind this ' +
              'line' + (roomSegsByRow.length
                ? ' (' + roomSegsByRow.length + ' row(s) of this room cite ' + roomSheet + ', at other numbers)'
                : '') + '. Read ' + (uncorroborated.length > 1 ? 'them' : 'it') + ' on ' + roomSheet +
              ' and confirm before relying on ' + (uncorroborated.length > 1 ? 'them' : 'it') + '.')
        : 'The sheet is cited by name only, with no view or keynote number on it. Confirm the location on ' +
          roomSheet + ' before relying on one.';
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
  cmp('MEP_VARIANT_SLOTS (' + Object.keys(MEP_VARIANT_SLOTS).length + ')', 'MEP_VARIANT_SLOTS', MEP_VARIANT_SLOTS);
  cmp('APP_MEP_CATEGORY_ORDER (' + APP_MEP_CATEGORY_ORDER.size + ')', 'APP_MEP_CATEGORY_ORDER', APP_MEP_CATEGORY_ORDER);
  cmp('RULED_LINE_ADDITIONS (D27/D28/D29)', 'RULED_LINE_ADDITIONS', RULED_LINE_ADDITIONS);
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
  {
    const m = /const SPACE_NO_COUNT_RE =\s*\n?\s*(\/.*?\/i);/.exec(theirs);
    if (!m || m[1] !== '/' + SPACE_NO_COUNT_RE.source + '/i') problems.push('SPACE_NO_COUNT_RE differs from build_floor1.mjs');
    else checked.push('SPACE_NO_COUNT_RE');
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
      declined.push({ ruling: rule.ruling, tag: rule.tag, why: 'the ruling is about tag ' + rule.tag + ' in ' +
        rule.category + ', and what this room draws in that category is ' +
        ([...new Set(gated.filter((r) => r.category === rule.category).map((r) => r.tag || '<untagged>'))].sort(cmpStr)
          .join(', ') || 'nothing in this room\'s ' + rule.category + ' band') +
        ', so the ruling has nothing here to act on' });
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

/* ==== VERBATIM from build_floor1.mjs (proved by assertRecipeByteFaithful) ==== */
const FIELD_STATE_KEYS = ['checked', 'initials', 'checkedAt', 'checkedAtLocal', 'checkedByCo', 'issue', 'issueResolved'];
function preserveFieldState(existingDocs, roomNo, ffe, mep) {
  const out = { lines: 0, notes: 0, orphaned: [] };
  for (const [id, fresh] of [[roomNo, ffe], [roomNo + '-MEP', mep]]) {
    const prev = existingDocs[id];
    if (!prev) continue;
    for (const [k, ov] of Object.entries(prev.items || {})) {
      const hasState = ov.checked || (ov.issue && String(ov.issue).trim()) || ov.checkedAt;
      const nv = fresh.items[k];
      if (!nv) {
        if (hasState && !ov.deleted) out.orphaned.push(id + '/' + k + ' (' + (ov.code || 'untagged') + ')');
        continue;
      }
      let touched = false;
      for (const f of FIELD_STATE_KEYS) {
        if (ov[f] !== undefined && ov[f] !== null && ov[f] !== '' && ov[f] !== false) { nv[f] = ov[f]; touched = true; }
        else if (ov[f] !== undefined) nv[f] = ov[f];
      }
      if (touched && hasState) out.lines++;
    }
    for (const [nk, note] of Object.entries(prev.notes || {})) {
      fresh.notes = fresh.notes || {};
      if (!(nk in fresh.notes)) { fresh.notes[nk] = note; out.notes++; }
    }
  }
  return out;
}


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
/* THE CONVENTION IS MEASURED PER DONOR. The approved floor-1 rooms were numbered
 * under two conventions ("row" and "line", see reduceFFE STEP 5), and a new room
 * is numbered the way ITS donor is - room 103 (QQ Connecting) does not number
 * the way room 105 does, and pretending it did failed the proof below. */
function donorConventions(db, live) {
  const out = {};
  for (const donorNo of [...new Set(Object.values(REP_ROOMS).map((r) => r.donor))].sort(cmpStr)) {
    const { room, rows } = readRoom(db, donorNo);
    resolveQtyOverrides(room, rows);
    const probe = reduceFFE(donorNo, rows);
    const got = detectSortConvention(live.docs[donorNo].items, probe);
    if (!got.convention) {
      die('neither sort convention reproduces LIVE donor room ' + donorNo + ' - refusing to number a new room against it:\n  ' +
          Object.entries(got.misses).map(([k, v]) => k + ': ' + v.join('; ')).join('\n  '));
    }
    out[donorNo] = got.convention;
  }
  return out;
}
const conventionFor = (convention, roomNo) => (typeof convention === 'string' ? convention : convention[REP_ROOMS[roomNo].donor]);

function assertDonorNumbering(db, live, conventions) {
  const out = [];
  for (const donorNo of [...new Set(Object.values(REP_ROOMS).map((r) => r.donor))].sort(cmpStr)) {
    const convention = conventions[donorNo];
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
    out.push('room ' + donorNo + ': ' + red.lines.length + ' recipe line(s) reproduce the live doc on (qty, sort) under convention "' + convention + '"');
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

/* ============================ A TAG ASSERTION IN A CITATION IS A READING, NOT
 *                              A CITATION, AND IT IS THE DONOR'S READING
 *
 * Room 105's mech_grille_rm cites "A555 view 08 (ST-01 tagged, no PT code)" -
 * a statement of FACT about what room 105's own drawing tags. The re-point
 * machinery maps the sheet name and carries the assertion, so room 238 shipped
 * "A556 (ST-01 tagged, no PT code)" at HIGH while its OWN row ITM-0694 reads
 * tag ST-02 on A556 el.07 and its own note names A550/A551/A552/A553.2/A555 as
 * the sheets that tag ST-01 - deliberately excluding A556. The document said
 * the opposite of what this room's own row says, and contradicted its own
 * n_gategaps note two screens further down.
 *
 * So: where a carried citation ASSERTS a tag on a sheet, and this room's own
 * rows tag that sheet family in the same mark family with a DIFFERENT mark, the
 * assertion is corrected to the room's own mark and the row is quoted. Where
 * the room's own rows agree - rooms 202, 217 and 230 all do - nothing moves.
 * ========================================================================== */
const CITED_TAG_ASSERT_RE = /^(.*?)\(\s*([A-Za-z]{1,4}-\d+(?:\.\d+)?)\s+tagged\b/;

function ownTagAssertions(src, roomNo, rows) {
  const fixes = [];
  const out = citeSegmentsBalanced(src).map((seg) => {
    const m = CITED_TAG_ASSERT_RE.exec(seg);
    if (!m) return seg;
    const ids = sheetIdsIn(m[1]);
    if (!ids.length) return seg;
    const sheet = ids[ids.length - 1];
    const asserted = m[2];
    const fam = markFamily(asserted);
    if (!fam) return seg;
    const own = (rows || []).filter((r) => {
      const cites = String(r.source_sheet || '') + ' ' + String(r.primary_sheet || '');
      return new RegExp('\\b' + reEsc(sheet) + '\\b').test(cites) &&
        splitMarks(r.tag).some((t) => markFamily(t) === fam);
    });
    if (!own.length) return seg;
    const ownMarks = [...new Set(own.flatMap((r) => splitMarks(r.tag).filter((t) => markFamily(t) === fam)))].sort(cmpStr);
    if (ownMarks.includes(asserted)) return seg;
    fixes.push({ sheet, asserted, ownMarks, rows: own });
    return seg.replace(new RegExp('\\(\\s*' + reEsc(asserted) + '\\s+tagged'), '(' + ownMarks.join(' / ') + ' tagged');
  });
  if (!fixes.length) return { src, note: '', changed: false, fixes };
  const note = fixes.map((f) => 'TAG ASSERTION CORRECTED. The citation carried onto this line asserted that ' +
    f.sheet + ' tags ' + f.asserted + '. THAT IS THE DONOR ROOM\'S READING OF ITS OWN DRAWING and it is not true ' +
    'of room ' + roomNo + ': this room\'s own data/project.sqlite row(s) tag ' + ownMarksList(f) +
    '. The assertion is corrected to this room\'s own mark and the row(s) are quoted: ' +
    f.rows.map((r) => r.item_id + ' [' + r.reliability + '] tag "' + r.tag + '" "' + r.description + '" [cited: ' +
      (r.source_sheet || r.primary_sheet || 'no citation') + ']' +
      (r.note ? ' - data/project.sqlite note, verbatim: "' + r.note + '"' : '')).join('; ') + '.').join(' ');
  return { src: citeJoin(out), note, changed: true, fixes };
}

const ownMarksList = (f) => f.ownMarks.join(' / ') + ' on ' + f.sheet;

/* ==================================== A FLOOR-1 SHEET IS NOT A FLOOR-2 CITATION
 *
 * fpNoCount() stripped the donor's FP-series citation because it was a fact
 * about the DONOR'S FLOOR. Nothing did the same for any other discipline, so
 * these floor-2 rooms shipped "M301 line 30" and "M301 GN5" on the PTAC and the
 * thermostat, "P301 note 9" on the floor drain, "P301 note 6" on the trap guard
 * and "A120/A121 General Note I" on the sprinkler line itself - M301 is the
 * Mechanical FIRST Floor Plan, P301 the Sanitary Sewer FIRST Floor Plan and
 * A120 the FIRST-floor RCP, every one of them per data/project.sqlite's own
 * sheets table.
 *
 * WHICH SHEET COVERS THIS FLOOR IS NOT GUESSED. It is read out of the sheets
 * table: a sheet whose TITLE names a floor joins a SERIES with every other
 * sheet whose title is identical but for the floor word, so "Mechanical First
 * Floor Plan" and "Mechanical Second Floor Plan" are one series and M302 is
 * proven to be M301's floor-2 sibling. Where the titles are NOT identical but
 * for the floor word - P305 "Domestic Water & Gas First Floor Plan" against
 * P306 "Domestic Water Second Floor Plan" - no series is proven and nothing is
 * re-pointed.
 *
 * Three outcomes, and every line says which one it got:
 *   KEPT       this room's OWN row cites that sheet by name. The room's own row
 *              governs its own citation; the line records that it is a
 *              floor-1 sheet on a floor-2 room.
 *   RE-POINTED this room's own row cites a RANGE that spans both the donor's
 *              sheet and this floor's sibling ("P301-P310 GN6"), so the sheet
 *              number moves to this floor's sheet and the line says so.
 *   DROPPED    neither - the segment is the donor's floor and it is removed,
 *              quoted as removed, and replaced by the series sibling for this
 *              floor with NO view, note or detail number asserted on it.
 * ========================================================================== */
const FLOOR_WORDS = { first: 1, second: 2, third: 3, fourth: 4 };
const FLOOR_TITLE_RE = /\b(first|second|third|fourth)\s+floor\b/i;
const SHEET_TOKEN_RE = /\b([A-Z]{1,3})-?(\d{3})(?:\.\d+)?\b/g;
const SHEET_RANGE_RE = /\b([A-Z]{1,3})(\d{3})\s*[-–]\s*(?:[A-Z]{1,3})?(\d{3})\b/g;

/** The floor each sheet covers, and the sibling series it belongs to. */
function floorSheetIndex(db) {
  const byId = new Map();
  const series = new Map();
  for (const s of db.prepare('SELECT sheet_id, title FROM sheets ORDER BY sheet_id').all()) {
    const title = String(s.title || '');
    const m = FLOOR_TITLE_RE.exec(title);
    if (!m) continue;
    const floor = FLOOR_WORDS[m[1].toLowerCase()];
    const key = title.replace(FLOOR_TITLE_RE, '@').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!series.has(key)) series.set(key, new Map());
    series.get(key).set(floor, s.sheet_id);
    byId.set(String(s.sheet_id), { floor, series: key, title });
  }
  return { byId, series };
}

const sheetIdsIn = (text) => [...String(text || '').matchAll(SHEET_TOKEN_RE)].map((m) => m[1] + m[2]);

/** Does this citation text name that sheet, either outright or inside a range? */
function citesSheet(text, id) {
  const s = String(text || '');
  if (new RegExp('\\b' + reEsc(id) + '\\b').test(s)) return true;
  const pre = id.replace(/\d+$/, '');
  const n = Number.parseInt(id.slice(pre.length), 10);
  for (const m of s.matchAll(SHEET_RANGE_RE)) {
    if (m[1] !== pre) continue;
    const lo = Number.parseInt(m[2], 10);
    const hi = Number.parseInt(m[3], 10);
    if (n >= Math.min(lo, hi) && n <= Math.max(lo, hi)) return true;
  }
  return false;
}

/* A sheet number followed by one of these names a table PRINTED ON that sheet -
 * a building-wide artefact, not the floor drawing. "A100 Guestroom Matrix" is
 * the unit mix for all four floors and it does not become false on floor 2.
 * Deliberately narrow: "note", "line", "GN" and "detail" are NOT here, because
 * those are exactly the floor-specific references this pass exists to catch. */
const SHEET_WIDE_ARTEFACT_RE = /^(?:[A-Za-z][A-Za-z-]*\s+){0,2}(matrix|schedule|index|legend|unit mix)\b/i;

function floorTrueCitation(src, floor, ownRows, idx, roomSheet, donorNo, roomNo) {
  const stripRanges = (o) => String(o).replace(SHEET_RANGE_RE, ' ');
  const ownSrcs = (ownRows || []).map((r) => resolveSheetWildcard(r.source_sheet || r.primary_sheet || '', roomSheet));
  const ownRowsOf = (id) => (ownRows || []).filter((r) =>
    citesSheet(resolveSheetWildcard(r.source_sheet || r.primary_sheet || '', roomSheet), id));
  const ownOf = (id) => ownRowsOf(id).map((r) => r.item_id);
  /* The citation the room's own row actually writes, quoted so the reader sees
   * the room's own words rather than a claim about them. */
  const ownCiteOf = (id) => {
    const r = ownRowsOf(id)[0];
    return r ? resolveSheetWildcard(r.source_sheet || r.primary_sheet || '', roomSheet) : '';
  };
  const sibling = (id) => (idx.series.get(idx.byId.get(id).series) || new Map()).get(floor) || '';
  const artefact = (text, id) => {
    const m = new RegExp('\\b' + reEsc(id) + '\\b\\s*(.*)$').exec(String(text));
    return m ? (SHEET_WIDE_ARTEFACT_RE.exec(m[1]) || [null, null])[1] : null;
  };
  const wrongIn = (text) => [...new Set(sheetIdsIn(text))]
    .filter((id) => idx.byId.has(id) && idx.byId.get(id).floor !== floor).sort(cmpStr);

  const kept = [], dropped = [], trimmed = [], repointed = [], ownKept = [], spanned = [], wide = [];
  for (const raw of citeSegmentsBalanced(src)) {
    let seg = raw;
    if (!wrongIn(seg).length) { kept.push(seg); continue; }

    /* "E501-E504 + E400" is a RANGE and the range already covers this floor.
     * The citation is the range; nothing about it is a different floor. */
    const spans = wrongIn(seg).filter((id) => {
      const sib = sibling(id);
      return sib && [...String(seg).matchAll(SHEET_RANGE_RE)].length > 0 && citesSheet(seg, sib);
    });
    if (spans.length === wrongIn(seg).length) {
      kept.push(seg);
      for (const id of spans) spanned.push(id + ' (cited inside a range that also covers ' + sibling(id) + ')');
      continue;
    }

    /* KEPT BEATS RE-POINTED BEATS TRIMMED, which is the precedence this
     * function's own header declares and the order meta.citationRule states.
     * This room's own row names that sheet outright - not inside a range - so
     * its own citation governs and stays, marked for what it is. The walk is
     * over EVERY row of this room, not the support set of one condensed line:
     * rooms 202/217/230/238 all carry ITM-0062, ITM-0067 and ITM-0070 citing
     * M301, and ITM-0036 citing "P305/P306 keynote 3". */
    let still0 = wrongIn(seg);
    const named0 = still0.filter((id) => ownSrcs.some((o) => new RegExp('\\b' + reEsc(id) + '\\b').test(stripRanges(o))));
    if (named0.length === still0.length) {
      kept.push(seg);
      for (const id of named0) ownKept.push(id + ' = "' + idx.byId.get(id).title + '" (this room\'s own row(s) ' +
        ownOf(id).join(', ') + ' cite it, verbatim: "' + ownCiteOf(id) + '")');
      continue;
    }

    /* A table PRINTED on a floor sheet is not a floor reference. */
    const artefacts0 = still0.filter((id) => artefact(seg, id));
    if (artefacts0.length === still0.length) {
      kept.push(seg);
      for (const id of artefacts0) {
        wide.push(id + ' = "' + idx.byId.get(id).title + '", cited for the ' + artefact(seg, id) +
          ' printed on it, which is a building-wide table and not a floor drawing');
      }
      continue;
    }

    /* This room's own row cites a RANGE spanning both sheets: move the number. */
    let moved = false;
    for (const id of still0) {
      const sib = sibling(id);
      const range = ownSrcs.find((o) => citesSheet(o, id) && sib && citesSheet(o, sib));
      if (!sib || !range) continue;
      seg = seg.replace(new RegExp('\\b' + reEsc(id) + '\\b', 'g'), sib);
      repointed.push(id + ' -> ' + sib + ' (this room\'s own row(s) ' + ownOf(id).join(', ') +
        ' cite the range "' + range + '", which spans both)');
      moved = true;
    }
    if (moved && !wrongIn(seg).length) { kept.push(seg); continue; }

    /* A sheet number in a "/" list with another sheet: drop just that number.
     * "A120/A121 General Note I" -> "A121 General Note I" on floor 2. A trim
     * is only REPORTED if the segment survives: on floor 3 the same list loses
     * A120 and then A121 too, and the whole segment is dropped, so saying
     * "what is left is A121" would name a second-floor sheet as this room's. */
    const segTrimmed = [];
    for (const id of wrongIn(seg)) {
      const others = sheetIdsIn(seg).filter((x) => x !== id);
      if (!others.length) continue;
      const next = seg
        .replace(new RegExp('\\b' + reEsc(id) + '\\s*\\/\\s*'), '')
        .replace(new RegExp('\\s*\\/\\s*' + reEsc(id) + '\\b'), '');
      if (next !== seg) {
        const sib = sibling(id);
        segTrimmed.push(id + ' = "' + idx.byId.get(id).title + '" (dropped from the cited list; what is left is ' +
          others.join(', ') + (sib && others.includes(sib) ? ', which is this room\'s floor' : '') + ')');
        seg = next;
      }
    }
    const still = wrongIn(seg);
    if (!still.length) { kept.push(seg); trimmed.push(...segTrimmed); continue; }

    dropped.push({ seg: raw, ids: still });
  }

  if (!dropped.length && !trimmed.length && !repointed.length && !ownKept.length && !wide.length) {
    return { src, note: '', changed: false, dropped, trimmed, repointed, ownKept, spanned, wide };
  }

  const sibs = [];
  for (const d of dropped) {
    for (const id of d.ids) {
      const sib = sibling(id);
      if (!sib || sibs.some((x) => x.sheet === sib)) continue;
      sibs.push({ sheet: sib, title: idx.byId.get(sib).title, from: id, fromTitle: idx.byId.get(id).title });
    }
  }
  for (const s of sibs) {
    kept.push(s.sheet + ' (data/project.sqlite sheets: "' + s.title + '" - the sheet of that series that covers ' +
      'THIS room\'s floor, ' + floor + '. NO view, note or detail number is asserted on it: the number the donor ' +
      'line carried belongs to ' + s.from + ', and this reference is UNVERIFIED for floor ' + floor + ')');
  }

  const bits = [];
  if (dropped.length) {
    bits.push('FLOOR. Room ' + roomNo + ' is on FLOOR ' + floor + '. ' + dropped.length +
      ' citation segment(s) carried from LIVE room ' + donorNo + ' point at a sheet that data/project.sqlite\'s ' +
      'own sheets table says covers a DIFFERENT floor, so ' +
      (dropped.length > 1 ? 'they are' : 'it is') + ' NOT carried. Removed, quoted verbatim: ' +
      dropped.map((d) => '"' + d.seg + '" [' + d.ids.map((id) => id + ' = "' + idx.byId.get(id).title + '"').join(', ') + ']').join('; ') +
      '.' + (sibs.length
        ? ' What replaces ' + (dropped.length > 1 ? 'them' : 'it') + ' is the sheet the sheets table proves covers ' +
          'floor ' + floor + ' for the same series (' + sibs.map((s) => s.from + ' -> ' + s.sheet).join(', ') +
          '), cited with NO number on it. THE FLOOR-PLAN REFERENCE IS UNVERIFIED FOR THIS FLOOR: read the sheet ' +
          'and confirm the number before relying on it.'
        : ' data/project.sqlite\'s sheets table proves a floor-' + floor + ' sibling only where a sheet title is ' +
          'identical but for the floor word, and that is not the case for this series, so the reference is removed ' +
          'and no replacement is invented.'));
  }
  if (repointed.length) {
    bits.push('FLOOR. Sheet number(s) moved onto this room\'s floor because THIS room\'s own row proves the ' +
      'reference spans it: ' + repointed.join('; ') + '. The note/detail NUMBER is the donor\'s and is not ' +
      're-proved here - confirm it on the sheet.');
  }
  if (trimmed.length) {
    bits.push('FLOOR. A cited list named a sheet that draws a different floor; that sheet number is dropped from ' +
      'the list and every other word is left alone: ' + trimmed.join('; ') + '.');
  }
  if (wide.length) {
    bits.push('FLOOR. A sheet that draws a different floor is cited here and it STAYS, because the citation is to ' +
      'a table PRINTED on it rather than to the drawing: ' + wide.join('; ') + '.');
  }
  if (ownKept.length) {
    bits.push('FLOOR. This citation names a sheet that covers another floor and it STAYS, because it is THIS ' +
      'room\'s own data/project.sqlite row that cites it and the room\'s own row governs its own citation: ' +
      ownKept.join('; ') + '. Read it knowing which floor it draws.');
  }
  return { src: citeJoin(kept), note: bits.join(' '), changed: true, dropped, trimmed, repointed, ownKept, spanned, wide };
}

/* ============ A BATHROOM SHEET DRAWS ONE SET OF ROOM TYPES, NOT ALL OF THEM
 *
 * floorTrueCitation() answers "which FLOOR does this sheet draw". Nothing asked
 * the same question of the bathroom enlargements, so the approved D10 lines
 * carried LIVE room 104's and room 105's readings of THEIR bath sheet onto
 * rooms drawn on a different one:
 *
 *   202  bath A531  shipped "A530 keyed note 13 (placed on view 03)",
 *                   "A530 keyed note 24", "A530 keyed note 19 (placed on plan
 *                   01)", "A530 keyed note 9 (placed on plan 01 and elevation
 *                   05)", "A530 keyed note 20 (placed on plan 01, standard
 *                   guest bath)" and "A530 keyed note 28 (elevation 04)"
 *   217  bath A533  the same six, and A533's own view numbering is different -
 *                   room 217's rows cite A533:37, A533:44, A533:50, A533:93,
 *                   elev 03 and views 02/05
 *   238  bath A532 / A532.1   the same six, and its own enclosure rows read
 *                   "A532 elev 02; A532.1 views 01, 02" and "A532.1 view 02
 *                   keyed note 11"
 *
 * A PLACEMENT NUMBER IS THE THING THAT DOES NOT TRANSFER. The sheets table
 * titles A530 "Enl. Bathroom - King Std., Std. Conn., QQ Std., Std. Conn., QQ
 * Wide & QQ Ext.", so a plan, view, elevation or keyed-note number read off it
 * is a fact about those types. Three outcomes, and the line says which:
 *   KEPT (range)      the citation is a RANGE that also covers this type's own
 *                     bath sheet - "A530-A533 General Note G".
 *   KEPT (unnumbered) the citation carries no placement number to transfer, so
 *                     nothing is asserted about where on the sheet to look.
 *   DROPPED           a placement number off another type's bath sheet. Removed,
 *                     quoted verbatim, and replaced by room_types.bath_sheet for
 *                     THIS type with NO number on it, marked UNVERIFIED.
 *
 * It runs on DONOR-derived condensed lines only. A line built from this room's
 * OWN row carries that row's own citation, and the room's own row governs its
 * own citation - the same rule the floor pass states.
 * ========================================================================== */
const BATH_TITLE_RE = /^Enl\.\s*Bathroom\b/i;
const BATH_PLACEMENT_RE = /\b(?:plans?|views?|elevations?|keyed notes?|keynotes?|kn)\b\s*\.?\s*\d|\bel\.\s*\d|:\s*\d/i;

/** Every sheet the sheets table titles as a bathroom enlargement, by base id. */
function bathSheetIndex(db) {
  const byId = new Map();
  for (const s of db.prepare('SELECT sheet_id, title FROM sheets ORDER BY sheet_id').all()) {
    const title = String(s.title || '');
    if (!BATH_TITLE_RE.test(title)) continue;
    const id = String(s.sheet_id).replace(/\.\d+$/, '');
    if (!byId.has(id)) byId.set(id, title);
  }
  return byId;
}

function bathTrueCitation(src, bathSheet, roomType, idx, donorNo, roomNo) {
  const none = { src, note: '', changed: false, dropped: [], spanned: [], unnumbered: [] };
  const mineIds = [...new Set(sheetIdsIn(bathSheet))];
  if (!mineIds.length) return none;
  const wrongIn = (t) => [...new Set(sheetIdsIn(t))].filter((id) => idx.has(id) && !mineIds.includes(id)).sort(cmpStr);

  const kept = [], dropped = [], spanned = [], unnumbered = [];
  for (const raw of citeSegmentsBalanced(src)) {
    const wrong = wrongIn(raw);
    if (!wrong.length) { kept.push(raw); continue; }
    if ([...String(raw).matchAll(SHEET_RANGE_RE)].length && mineIds.some((m) => citesSheet(raw, m))) {
      kept.push(raw);
      for (const id of wrong) spanned.push(id + ' = "' + idx.get(id) + '" (cited inside a range that also covers ' + bathSheet + ')');
      continue;
    }
    if (!BATH_PLACEMENT_RE.test(raw)) {
      kept.push(raw);
      for (const id of wrong) unnumbered.push(id + ' = "' + idx.get(id) + '"');
      continue;
    }
    dropped.push({ seg: raw, ids: wrong });
  }
  if (!dropped.length && !spanned.length && !unnumbered.length) return none;

  if (dropped.length) {
    kept.push(bathSheet + ' (data/project.sqlite room_types.bath_sheet for "' + roomType + '" - the bathroom ' +
      'sheet that draws THIS room type. NO plan, view, elevation or keyed-note number is asserted on it: the ' +
      'number the donor line carried was read on ' + [...new Set(dropped.flatMap((d) => d.ids))].sort(cmpStr).join(', ') +
      ', and this reference is UNVERIFIED for this room type)');
  }

  const bits = [];
  if (dropped.length) {
    bits.push('BATH SHEET. Room ' + roomNo + '\'s bathroom is drawn on ' + bathSheet + ' - data/project.sqlite ' +
      'room_types.bath_sheet for type "' + roomType + '". ' + dropped.length + ' citation segment(s) carried from ' +
      'the approved line on LIVE room ' + donorNo + ' read a plan, view, elevation or keyed-note number off a ' +
      'bathroom sheet the sheets table gives to other room types, which makes ' +
      (dropped.length > 1 ? 'them room ' : 'it room ') + donorNo + '\'s reading of room ' + donorNo + '\'s own bath ' +
      'drawing, so ' + (dropped.length > 1 ? 'they are' : 'it is') + ' NOT carried. Removed, quoted verbatim: ' +
      dropped.map((d) => '"' + d.seg + '" [' + d.ids.map((id) => id + ' = "' + idx.get(id) + '"').join(', ') + ']').join('; ') +
      '. What replaces ' + (dropped.length > 1 ? 'them' : 'it') + ' is ' + bathSheet + ', cited with NO number on ' +
      'it. THE BATH-SHEET REFERENCE IS UNVERIFIED FOR THIS ROOM TYPE: read the sheet and confirm the number before ' +
      'relying on it.');
  }
  if (spanned.length) {
    bits.push('BATH SHEET. A citation names a bathroom sheet drawn for other room types and it STAYS, because it is ' +
      'cited inside a RANGE that also covers this type\'s own bath sheet: ' + spanned.join('; ') + '.');
  }
  if (unnumbered.length) {
    bits.push('BATH SHEET. A citation names a bathroom sheet drawn for other room types and it STAYS, because it ' +
      'carries no plan, view, elevation or keyed-note number to transfer: ' + unnumbered.join('; ') +
      '. Room ' + roomNo + '\'s own bathroom is drawn on ' + bathSheet + ' (data/project.sqlite ' +
      'room_types.bath_sheet for "' + roomType + '") - read it there.');
  }
  return { src: citeJoin(kept), note: bits.join(' '), changed: true, dropped, spanned, unnumbered };
}

/* ====== AN ENLARGEMENT SHEET DRAWS THE TYPES ITS OWN TITLE NAMES, AND NO OTHER
 *
 * The FF&E citation is room_items.primary_sheet, straight out of the recipe
 * (reduceFFE, byte-copied from build_floor1.mjs and not this tool's to change).
 * On LIVE room 104 that is right, because A550 IS room 104's sheet. On these
 * four types it is not: twelve to fourteen lines a room shipped a bare "A550",
 * "A530", "A533" or "A532.1" - the enlargement sheet for somebody else's room
 * type - while the SAME row's own source_sheet carries the entry for this type
 * and was thrown away. ITM-0084's source_sheet is "A550:60; A551:52; A553:55;
 * A554:58; A555:70; A556:56"; room 217's entry in it is A554:58.
 *
 * NOTHING IS DELETED AND NOTHING IS INVENTED. Where the row's own source_sheet
 * says more than its primary_sheet, the line cites the row's own source_sheet -
 * the database's fuller record of the same row - and the note names the segment
 * that covers this room's own sheet. Where neither names this type's sheet, the
 * citation stands and the line names the sheet room_types gives this type,
 * marked UNVERIFIED for it.
 * ========================================================================== */
const TYPE_SHEET_TITLE_RE = /^Enl\.\s*(?:Bathroom|Guest ?[Rr]oom)\b/i;

function typeSheetIndex(db) {
  const byId = new Map();
  for (const s of db.prepare('SELECT sheet_id, title FROM sheets ORDER BY sheet_id').all()) {
    const title = String(s.title || '');
    if (!TYPE_SHEET_TITLE_RE.test(title)) continue;
    const id = String(s.sheet_id).replace(/\.\d+$/, '');
    if (!byId.has(id)) byId.set(id, title);
  }
  return byId;
}

function ffeTypeCitation(line, roomType, roomSheet, bathSheet, idx, roomNo) {
  const src0 = String(line.sqlite.src || '');
  const ownIds = [...new Set([...sheetIdsIn(roomSheet), ...sheetIdsIn(bathSheet)])];
  const foreignIn = (t) => [...new Set(sheetIdsIn(t))].filter((id) => idx.has(id) && !ownIds.includes(id)).sort(cmpStr);
  const foreign = foreignIn(src0);
  if (!foreign.length || !ownIds.length) return { src: src0, note: '', changed: false };

  const covers = (t) => ownIds.some((id) => citesSheet(t, id));
  const first = (line.rows || [])[0] || {};
  const full = resolveSheetWildcard(first.source_sheet || '', roomSheet);
  const ownSegs = (t) => citeSegments(t).filter((s) => covers(s));

  const foreignList = foreign.map((id) => id + ' = "' + idx.get(id) + '"').join('; ');
  const typeSheets = 'room_sheet ' + roomSheet + (bathSheet ? ' and bath_sheet ' + bathSheet : '') +
    ' (data/project.sqlite room_types for "' + roomType + '")';

  if (covers(src0)) {
    return {
      src: src0,
      note: 'CITATION. This citation names an enlargement sheet the data/project.sqlite sheets table draws for ' +
        'other room types (' + foreignList + ') and it STAYS, because the same citation also covers room ' + roomNo +
        '\'s own ' + typeSheets + '.',
      changed: true, kind: 'covered',
    };
  }
  if (full && full !== src0 && covers(full)) {
    return {
      src: full,
      note: 'CITATION. data/project.sqlite\'s primary_sheet for this room\'s row(s) reads "' + src0 + '", and the ' +
        'sheets table titles it ' + foreignList + ' - the enlargement sheet for other room types. The SAME row ' +
        'carries a fuller citation of its own, and that is what this line cites, verbatim: "' + full + '". The ' +
        'entry in it that covers room ' + roomNo + '\'s own ' + typeSheets + ' is ' +
        ownSegs(full).map((s) => '"' + s + '"').join(', ') + '.',
      changed: true, kind: 'repointed',
    };
  }
  const finalSrc = full && full !== src0 ? full : src0;
  const finalForeign = foreignIn(finalSrc);
  return {
    src: finalSrc,
    note: 'CITATION. This line cites ' +
      finalForeign.map((id) => id + ' = "' + idx.get(id) + '"').join('; ') + ' - ' +
      (finalForeign.length > 1 ? 'enlargement sheets' : 'an enlargement sheet') +
      ' the data/project.sqlite sheets table draws for other room types' + (full && full !== src0
        ? ', taken here from the fuller citation the row itself carries, verbatim: "' + full + '"'
        : ', which is data/project.sqlite\'s primary_sheet for this room\'s own row') +
      '. The sheet that draws room ' + roomNo + ' is ' + typeSheets + ': read the tag there. THIS CITATION IS ' +
      'UNVERIFIED FOR THIS ROOM TYPE.',
    changed: true, kind: 'unverified',
  };
}

/* ============== A MARK PRINTED INSIDE A CITATION IS A FACT ABOUT THE SCHEDULE
 *
 * plmb_shower_a cites "P104 rows SH-3 and SH-4" and plmb_wc_a cites "P104 rows
 * WC-3 and WC-4". Those are true statements about what the P104 schedule
 * prints, and they came from the approved line on the donor room - but on room
 * 238 the MARK field reads "SH-1 / SH-3" off this room's own row ITM-0715, so a
 * reader met SH-4 in the citation with nothing saying whose mark it is.
 *
 * Nothing is removed: P104 really does print both rows. The line simply says
 * which marks of that family THIS room's own rows carry, and names them.
 * ========================================================================== */
const CITED_MARK_RE = /\b([A-Za-z]{1,4})-(\d+(?:\.\d+)?)\b/g;

function citedMarkNote(src, rows, category, roomNo) {
  const own = new Map();                       // family -> Map(mark -> [rowIds])
  for (const r of rows || []) {
    if (r.category !== category || !r.tag) continue;
    for (const m of splitMarks(r.tag)) {
      const fam = markFamily(m);
      if (!fam || !atomicMark(m)) continue;
      if (!own.has(fam)) own.set(fam, new Map());
      if (!own.get(fam).has(m)) own.get(fam).set(m, []);
      if (!own.get(fam).get(m).includes(r.item_id)) own.get(fam).get(m).push(r.item_id);
    }
  }
  if (!own.size) return '';
  const cited = new Map();                     // family -> Set(marks)
  for (const m of String(src || '').matchAll(CITED_MARK_RE)) {
    const mark = m[1] + '-' + m[2];
    const fam = markFamily(mark);
    if (!fam || !own.has(fam)) continue;
    if (!cited.has(fam)) cited.set(fam, new Set());
    cited.get(fam).add(mark);
  }
  const bits = [];
  for (const fam of [...cited.keys()].sort(cmpStr)) {
    const citedMarks = [...cited.get(fam)].sort(cmpStr);
    const ownMarks = [...own.get(fam).keys()].sort(cmpStr);
    if (citedMarks.every((m) => ownMarks.includes(m))) continue;
    bits.push('The document(s) cited above print ' + citedMarks.join(', ') + ' in the ' + fam +
      ' family, which is a fact about those documents. The mark(s) room ' + roomNo + '\'s own ' +
      'data/project.sqlite rows state in that family are ' +
      ownMarks.map((m) => m + ' (' + own.get(fam).get(m).join(', ') + ')').join(', ') +
      '. Read the citation as a pointer to the schedule and the room\'s own row for what this key holds.');
  }
  return bits.length ? 'MARKS IN THE CITATION. ' + bits.join(' ') : '';
}

function fpNoCount(db, roomNo, roomType, donorNo, item, report, floor) {
  const ph = db.prepare("SELECT * FROM placeholders WHERE placeholder_id = 'PH-GU-001'").get();
  if (!ph) die('placeholder PH-GU-001 is missing from data/project.sqlite - refusing to ship a sprinkler line without it');
  /* The donor line carries EITHER the donor room's own take-off clause (105, 104)
   * OR the approved type-level count sentence untouched (103, which has no head
   * rows of its own). Both are replaced below; neither is a hard stop. */
  const takeoff = FP_TAKEOFF_RE.exec(String(item.instanceNote));
  const countIdx = String(item.instanceNote).indexOf(FP_COUNT_SENTENCE);
  if (!takeoff && countIdx === -1) {
    die('room ' + roomNo + ': donor ' + donorNo + '-MEP ' + FP_HEADS_KEY + ' carries neither a room-specific head ' +
        'take-off clause nor the approved count sentence. This tool was written to REPLACE one of them and must not ' +
        'run blind - re-read the donor line and re-check this code.');
  }
  /* The donor's FP-series citation is a fact about the donor's floor and about
   * the two rooms the count was read on. It does not travel. */
  const segs = citeSegmentsBalanced(item.src);
  const donorFp = segs.filter((s) => FP_SHEET_RE.test(s) || /\d+ total heads|head-by-head/i.test(s));
  const kept = segs.filter((s) => !donorFp.includes(s));
  if (!donorFp.length && takeoff) {
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
    ' is on FLOOR ' + floor + ', and what this package holds for its sprinkler scope is data/project.sqlite ' +
    'placeholder ' + ph.placeholder_id + ', quoted above. What replaces the donor citation is ' + ph.placeholder_id +
    "'s own suggested sheet list, verbatim: \"" + ph.suggested_sheet + '". Which of those covers floor ' + floor +
    ' is not stated anywhere in data/project.sqlite and is not guessed here.';
  /* THE MARK IS THE TARGET ROOM'S, OR THERE IS NO MARK - the same rule the
   * bathing lines follow, and the same reason the donor's qty and the donor's
   * FP-series citation come off. "FP" is the D10 line code the APPROVED donor
   * line carries; this room's sprinkler scope is a placeholder, so there is no
   * row of this room to read a mark off and the field is left EMPTY. */
  const markSentence = ' MARK. The approved D10 line for this item on LIVE room ' + donorNo + ' carries mark "' +
    String(item.code || '') + '". THAT MARK IS ROOM ' + donorNo + "'S AND IT IS NOT CARRIED HERE: the mark field on " +
    'this line is left EMPTY, for the same reason the donor\'s count and the donor\'s FP-series citation are left ' +
    'off. Read the mark off the sprinkler sheet that covers floor ' + floor + ' when ' + ph.placeholder_id +
    ' is closed.';
  const replacement = 'NO HEAD COUNT IS VERIFIED FOR THIS ROOM TYPE, and none is asserted here. ' +
    'data/project.sqlite placeholders ' + ph.placeholder_id + ' (' + ph.suggested_sheet + '), verbatim: "' +
    ph.what_is_missing + '" Why it is left open, verbatim: "' + ph.why + '" ' +
    'The donor line (room ' + donorNo + ') carries a count of ' + item.qty + ' taken off its OWN rows; that count ' +
    'is NOT copied here and THIS LINE SHIPS WITH NO QUANTITY AT ALL. ' + FP_COUNT_SENTENCE;
  /* The donor's own prose around the take-off names FP-1 as well ("Ceiling and
   * side-wall heads per the FP-1 rows"). That is the same floor-1 reference, so
   * it is neutralised in the surviving prose - and ONLY there, so that the
   * quoted-as-removed segments below keep the donor's words byte for byte. */
  const m = takeoff || { index: countIdx, 0: FP_COUNT_SENTENCE };
  const neutral = (t) => t.replace(/\bFP-\d\b/g, 'sprinkler head-schedule');
  const kernel = neutral(String(item.instanceNote).slice(0, m.index)) + replacement
    + neutral(String(item.instanceNote).slice(m.index + m[0].length));
  const out = clone(item);
  const donorMark = String(item.code || '');
  out.instanceNote = kernel + removedSentence + (donorMark ? markSentence : '');
  out.src = citeJoin([...kept, replacementSeg]);
  out.reliability = 'MEDIUM';
  out.code = '';
  delete out.qty;
  report.fpNoCount = FP_HEADS_KEY + ': donor qty ' + item.qty + ' NOT copied; donor mark ' +
    JSON.stringify(donorMark) + ' NOT copied; line ships with no quantity and no mark, ' +
    'reliability MEDIUM, carrying PH-GU-001 verbatim; ' + donorFp.length + ' donor FP-series citation segment(s) ' +
    'removed (floor-1 sheet, floor-1 total, rooms 107/108 verification) and replaced with ' + ph.placeholder_id +
    "'s own sheet list plus this room's floor (" + floor + ')';
  return out;
}

/**
 * The sprinkler line for a room that HAS head rows of its own. The count, the
 * head positions and the citation are this room's rows; the donor's take-off
 * clause (a statement about the donor room) and the donor's floor-1 head TOTAL
 * are removed and quoted as not carried. Mirrors build_floor1's
 * sprinklerTakeoff(), which is how every floor-1 line of this kind was written.
 */
function fpOwnTakeoff(roomNo, donorNo, item, heads, report, floor) {
  if (!FP_TAKEOFF_RE.test(String(item.instanceNote))) {
    die('room ' + roomNo + ': donor ' + donorNo + '-MEP ' + FP_HEADS_KEY + ' no longer carries a room-specific ' +
        'head take-off clause - re-read the donor line and re-check this code.');
  }
  const sorted = heads.slice().sort((a, b) => cmpStr(String(a.item_id), String(b.item_id)));
  const positions = sorted.map((r) => r.instance_note).filter(Boolean).join('; ');
  const extras = [...new Set(sorted.map((r) => r.note).filter(Boolean))].join(' ');
  const ownCites = [...new Set(sorted.map((r) => r.source_sheet || r.primary_sheet).filter(Boolean))];
  const own = "this room's own take-off is " + sorted.length + ' concealed pendent head(s) on drops - ' +
    positions + '. ' + (extras ? endStop(extras) + ' ' : '') + 'Verify every head you can see.';
  const m = FP_TAKEOFF_RE.exec(String(item.instanceNote));
  const kernel = String(item.instanceNote).slice(0, m.index) + own + String(item.instanceNote).slice(m.index + m[0].length);
  /* The donor's floor-1 head total is a fact about floor 1 and does not travel. */
  const segs = citeSegmentsBalanced(item.src);
  const floorTotal = segs.filter((x) => /\d+ total heads/i.test(x));
  const kept = segs.filter((x) => !floorTotal.includes(x));
  const out = clone(item);
  out.qty = sorted.length;
  out.src = citeJoin([...new Set([...kept, ...ownCites])]);
  out.reliability = sorted.every((r) => String(r.reliability).toUpperCase() === 'HIGH') ? item.reliability : 'MEDIUM';
  out.instanceNote = kernel + ' SOURCE. Count and head positions: this room\'s own data/project.sqlite rows ' +
    sorted.map((r) => r.item_id).join(', ') + ' (' + sorted.length + ' rows, reliability ' +
    [...new Set(sorted.map((r) => r.reliability))].join('/') + '), which cite ' + (ownCites.join('; ') || 'no sheet') +
    '. Product text: the approved D10 line on LIVE room ' + donorNo + '. ROOM ' + roomNo + ' IS ON FLOOR ' + floor +
    (floorTotal.length
      ? ': the donor citation segment ' + floorTotal.map((x) => '"' + x + '"').join(' and ') + ' is a FIRST-FLOOR head ' +
        'total and is NOT carried.'
      : '.') +
    ' data/project.sqlite placeholder PH-GU-001 names FP-1 / FP-2 / FP-3 as the sprinkler sheets and does not say which ' +
    'covers floor ' + floor + '; this room\'s own rows cite the sheet named above, and that citation is carried as the ' +
    'database wrote it, not re-judged here.';
  report.fpOwn = FP_HEADS_KEY + ': ' + sorted.length + ' room-specific sprinkler head row(s) carried (' +
    sorted.map((r) => r.item_id).join(', ') + '); donor floor-1 head total ' + (floorTotal.length ? 'removed' : 'absent') +
    '; reliability ' + out.reliability;
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
    ', reliability ' + r.reliability + (r.note ? ' - "' + r.note + '"' : '')).join('  |  ');

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
  /* THE M401 DETAIL NUMBER IS THE ROOM TYPE, NOT A DETAIL.
   * sheets.M401, verbatim: "Mechanical Typical Guestroom - 7 room types, PTAC
   * layout". Seven details, one per type. The donor's number is the DONOR'S
   * type, so carrying it sends a QQ Acc. crew to the plain Queen-Queen layout -
   * which is exactly what room 238 shipped ("M401 det.01" against its own row's
   * "M401 detail 02"). This room's own row states its own number or the line
   * says nothing about a detail at all. */
  const ownDet = [...new Set(mine.map((r) => (/M401\s*(?:detail|det\.)\s*(\d+)/i
    .exec(String(r.source_sheet || r.primary_sheet || '')) || [])[1]).filter(Boolean))];
  let detNote = '';
  if (ownDet.length === 1) {
    const want = ownDet[0];
    const has = [...new Set([...String(out.src).matchAll(/M401\s*(?:detail|det\.)\s*(\d+)/gi)].map((m) => m[1]))];
    const wrong = has.filter((n) => n !== want);
    if (wrong.length) {
      out.src = String(out.src).replace(/(M401\s*(?:detail|det\.)\s*)(\d+)/gi, (w, p, n) => (n === want ? w : p + want));
      detNote = ' M401 DETAIL RE-POINTED. data/project.sqlite sheets records M401 as "Mechanical Typical Guestroom ' +
        '- 7 room types, PTAC layout", so the DETAIL NUMBER on that sheet identifies the ROOM TYPE. The citation ' +
        'carried from LIVE room ' + report.donorRoom + ' read detail ' + wrong.join('/') + ', which is room ' +
        report.donorRoom + '\'s type. THIS room\'s own row(s) ' + mine.map((r) => r.item_id).join(', ') +
        ' cite M401 detail ' + want + ', and that is what the line now cites.';
    } else if (!has.length) {
      out.src = citeJoin([...citeSegmentsBalanced(out.src), 'M401 detail ' + want +
        ' (this room\'s own row(s) ' + mine.map((r) => r.item_id).join(', ') + '; M401 draws one typical ' +
        'guestroom detail per room type)']);
      detNote = ' M401 DETAIL ADDED FROM THIS ROOM\'S OWN ROW(S). The donor citation named M401 with no detail ' +
        'number; M401 draws seven typical-guestroom details, one per room type, and this room\'s own row(s) ' +
        mine.map((r) => r.item_id).join(', ') + ' cite detail ' + want + '.';
    }
  } else if (ownDet.length > 1) {
    detNote = ' M401 DETAIL UNRESOLVED IN THIS ROOM\'S OWN ROWS: they cite detail ' + ownDet.sort(cmpStr).join(' and ') +
      '. Neither is chosen here and the donor\'s number is left exactly as it was carried - read M401 and confirm.';
  }
  out.instanceNote = (base + detNote).replace(/\s{2,}/g, ' ').trim();
  out.code = marks.length === 1 ? marks[0] : (marks.length ? marks.join(' / ') : '');
  if (flagged) out.reliability = 'FLAGGED';
  report.ptac = 'mech_ptac: ' + mine.length + ' unit row(s) ' + mine.map((r) => r.item_id).join(', ') +
    '; mark ' + (out.code ? JSON.stringify(out.code) : 'NONE (unresolved, left blank)') +
    '; reliability ' + out.reliability + (hadDonorResolution ? "; donor's own-row resolution removed" : '') +
    (ownDet.length ? '; M401 detail ' + ownDet.join('/') + " from this room's own row(s)" : '');
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
 * relabeled with the house CONFIGURATION prefix so that nobody reads the
 * standard-room fixture as an answer for an accessible key.
 * ========================================================================== */
const CONFLICT_LABEL_PREFIX = 'BATHING CONFIGURATION UNRESOLVED (TUB vs ROLL-IN) - the text below is the ' +
  'STANDARD guestroom fixture, NOT a ruling for this key: ';

/** The prefix family of one mark: "SH-1" -> SH, "kn 28" -> kn, "BT-1" -> BT. */
function markFamily(m) {
  const s = String(m || '').trim();
  const dash = /^([A-Za-z]{1,4})-\d/.exec(s);
  if (dash) return dash[1].toUpperCase();
  const word = /^([A-Za-z]{1,4})\s+\d/.exec(s);
  if (word) return word[1].toLowerCase();
  return null;
}

function bathingUnresolvedLine(roomNo, key, item, drops, donorNo, bathSheet) {
  const out = clone(item);
  const listOf = (rows) => rows.map((r) => (r.tag ? r.tag + ' ' : '') + r.item_id + ' "' +
    String(r.description).replace(CONFIG_A_PREFIX, '').replace(CONFIG_B_PREFIX, '') + '"').join('; ');
  out.label = CONFLICT_LABEL_PREFIX + item.label;
  out.reliability = 'FLAGGED';

  /* THE MARK IS THE TARGET ROOM'S, OR THERE IS NO MARK.
   *
   * This line keeps the donor's PRODUCT TEXT by design - dropping a line from
   * Austin's approved D10 punch is not this tool's call - but it was also
   * keeping the donor's MARK, and a mark is a purchase instruction. Room 238
   * shipped "SH-1 / SH-4" when its own row reads "SH-1 / SH-3" and it holds no
   * SH-4 row anywhere, and "kn 28 / kn 5" when it holds neither keynote. The
   * mark now comes from THIS room's own bathing rows in the same category and
   * the same mark family as the donor's mark, or the field is left EMPTY. The
   * donor's mark is quoted as not carried either way. */
  const wantFams = [...new Set(splitMarks(item.code).map(markFamily).filter(Boolean))];
  const ownRows = [...drops.a, ...drops.b]
    .filter((r) => r.category === item.category && r.tag)
    .filter((r) => splitMarks(r.tag).some((m) => wantFams.includes(markFamily(m))));
  const donorMark = String(item.code || '');
  out.code = ownRows.length ? ownRows.map((r) => r.tag).join(' / ') : '';
  const markSentence = ' MARK. ' + (donorMark
    ? 'The approved line for this item on LIVE room ' + donorNo + ' carries mark "' + donorMark + '". THAT MARK IS ' +
      'ROOM ' + donorNo + "'S AND IS NOT CARRIED HERE"
    : 'The approved line for this item on LIVE room ' + donorNo + ' carries no mark') +
    (ownRows.length
      ? ': the mark on this line is THIS room\'s own, taken from its own data/project.sqlite bathing row(s) ' +
        ownRows.map((r) => r.item_id + ' tagged "' + r.tag + '" [' + r.reliability + '] "' +
          String(r.description).replace(CONFIG_A_PREFIX, '').replace(CONFIG_B_PREFIX, '') + '" [cited: ' +
          (r.source_sheet || r.primary_sheet || 'no citation') + ']').join('; ') +
        '. Those rows are the OPEN bathing configuration, so the mark is carried and NOT resolved.'
      : ', and the mark field on this line is left EMPTY rather than filled with the donor\'s. The marks room ' +
        roomNo + ' carries in this trade are on the configuration rows listed below; read the mark off them.') +
    (bathSheet ? ' This room type\'s bath is drawn on ' + bathSheet + ' (data/project.sqlite room_types.bath_sheet), ' +
      'not on the donor\'s bath sheet - read every bath dimension, elevation and keyed note there, and see the ' +
      'BATH SHEET paragraph on this line for what was carried and what was not.' : '');

  out.instanceNote = (item.instanceNote ? item.instanceNote + ' ' : '') + markSentence.trim() + ' ' +
    'CONFLICT CARRIED, NOT RESOLVED. Room ' + roomNo + ' is one of the seven accessible keys on which the ' +
    'tub-versus-roll-in question is OPEN. Every bathing row this room carries is one configuration or the other, ' +
    'and every one of those rows is FLAGGED in ' +
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

/* Appending to an EMPTY note must not leave a bare full stop in front of the
 * first word. mech_grille_rm on room 230 had no note at all, so the first thing
 * a reader saw was ". THIS ROOM'S OWN ROWS ...". */
const appendNote = (note, add) => (String(note || '').trim() ? endStop(note) + ' ' + add : String(add).trim());

/** The room's OWN words for one line. Per-row instance notes ride the fold. */
function ownLineText(line) {
  const rows = line.rows || [];
  if (rows.length <= 1) {
    return [line.sqlite.instanceNote, line.sqlite.note].filter(Boolean).join(' - ');
  }
  const notes = [];
  for (const r of rows) {
    const n = String(r.note || '').trim();
    if (n && !notes.includes(n)) notes.push(n);
  }
  return notes.join(' - ');
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
 * own vocabulary, never authored. Used to decide what rides in n_gategaps and
 * what is quoted on a condensed line, so a conflict is carried on the presence
 * of the conflict and not on how confident the transcriber was.
 *
 * THE LIST IS THE SINGLE SOURCE. Room note n_gategaps prints this exact array,
 * so the note cannot advertise a word the matcher does not hold. It used to
 * print "superseded" while the matcher held only that inflection, and
 * data/project.sqlite's ITM-0095 writes "RK SUPERSEDES the finish schedule
 * area text" - one letter away, and the row fell through on all four rooms.
 * Four more forms the database actually writes were missing the same way:
 *   "DUAL MARK CARRY - P401/P402 print SH-1, P104 schedules SH-4"  ITM-0545
 *   "DUAL MARK CARRY - P401/P402 print L-2, P104 schedules L-3/L-4"  ITM-0043
 *   "no source states the equivalence, both carried"                 ITM-0024
 *   "RK supersedes the finish schedule area text"                    ITM-0095
 * Every one of them is a document disagreement stated on a room's own row. */
const CONFLICT_WORDS = [
  'conflict', 'conflicts.md', 'contradic', 'mutually exclusive', 'do not buy', 'not stated', 'RFI',
  'confirm which', 'confirm before', 'confirm with', 'which is intended', 'disagree', 'unresolved',
  'unsettled', 'no source settles', 'no source states', 'no source assigns', 'never assigned',
  'not normalised', 'two different', 'is wrong for', 'supersede', 'dual mark carry',
];
const reEscLit = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CONFLICT_IN_NOTE_RE = new RegExp(
  CONFLICT_WORDS.map((w) => (w === 'RFI' ? '\\bRFI\\b' : reEscLit(w))).join('|'), 'i');

/* Two sheets set against each other in one sentence IS a document conflict,
 * whatever words the transcriber reached for. Room 217's ITM-0378 - "A533 uses
 * the STANDARD palette ... while A532 uses WC-12 ... Confirm which is intended" -
 * is the row that forced this: it states a live disagreement about THIS room's
 * own bathroom finish, it was rated HIGH, and it matched none of the words
 * above, so it vanished from n_gategaps entirely.
 *
 * IT IS DELIBERATELY NARROW and it stays narrow. ITM-0545 and ITM-0043 set two
 * sheets against each other with nothing but a comma - "P401/P402 print SH-1,
 * P104 schedules SH-4" - and widening the connective list to a bare comma would
 * read every note that lists two sheet numbers as a document conflict. Those
 * two rows are caught on the database's own phrase for exactly this situation,
 * "DUAL MARK CARRY", which is in CONFLICT_WORDS above. */
const SHEET_VS_SHEET_RE = /\b[A-Z]{1,3}-?\d{2,3}(?:\.\d+)?\b[^.;]{0,110}?\b(?:vs\.?|versus|while|against|but)\b[^.;]{0,110}?\b[A-Z]{1,3}-?\d{2,3}(?:\.\d+)?\b/;

/** Does this row's own note say the documents disagree? */
const rowStatesConflict = (text) => CONFLICT_IN_NOTE_RE.test(String(text || '')) || SHEET_VS_SHEET_RE.test(String(text || ''));

/* data/project.sqlite writes an entry citation as "conflicts.md A11 / B4.4", so
 * ONE citation can name two entries. Room 238's nine accessible-key rows carry
 * exactly that string and B4.4 was landing nowhere. */
const CONFLICT_ID_CITE_RE = /conflicts\.md\s+([A-Z]\d+(?:\.\d+)?(?:\s*\/\s*[A-Z]\d+(?:\.\d+)?)*)/g;

const CONFLICT_TAG_FAMILY = /\b([A-Za-z]{1,4}-)(\d+(?:\.\d+)?)((?:\s*\/\s*\d+(?:\.\d+)?)+)/g;
const reEsc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const conflictTagUsable = (t) => String(t).length >= 2 && /\d/.test(String(t));

/* ------------------------------------------------------- A MARK LIST IS A LIST
 *
 * "SH-1 / SH-4", "L-2 / L-3 / L-4", "kn 28 / kn 5" and "WC-3 / WC-4" are not
 * four marks. They are four LISTS of marks, and an OPEN conflict that names one
 * half of a list names the line that carries the list.
 *
 * The old matcher tested the room's tag as ONE literal string against the entry
 * text, and expanded slash runs on the ENTRY side only where the run repeated a
 * single prefix ("GR-300/305/307/308"). So B3.1 - "P401/P402 mark SH-1 / L-2 /
 * SK-3 / SK-4; the P104 schedule lists guestroom showers SH-3/SH-4, lavs
 * L-3/L-4" - flagged the kitchenette sink on all four rooms purely because the
 * substring "SK-3 / SK-4" happens to appear in it verbatim, and missed every
 * shower and every lavatory in the package. Which line got flagged was decided
 * by string coincidence.
 *
 * Now EVERY mark list is split, on both sides, on the separators the database
 * itself writes - "/" and "," - with no prefix rule at all, and marks are
 * matched one at a time. The whole string stays a candidate too, so a run the
 * entry prints verbatim still matches verbatim.
 * ========================================================================== */

/** One mark list -> the whole string plus each mark in it, normalised. */
function splitMarks(code) {
  const raw = String(code == null ? '' : code).trim();
  if (!raw) return [];
  const out = [];
  const push = (s) => {
    const t = String(s).replace(/\s+/g, ' ').trim();
    if (t && !out.includes(t)) out.push(t);
  };
  push(raw);
  for (const part of raw.split(/[/,]/)) push(part);
  return out;
}

/** Every usable mark carried by any of these mark lists, deduped and sorted. */
function marksOf(codes) {
  const out = [];
  for (const c of [].concat(codes)) {
    for (const m of splitMarks(c)) if (conflictTagUsable(m) && !out.includes(m)) out.push(m);
  }
  return out.sort(cmpStr);
}

/* A whole mark LIST stays a matching candidate, because an entry may print the
 * run verbatim, but it is not a mark and it does not belong in a mark list a
 * human reads. "SK-3 / SK-4" reports as SK-3, SK-4. */
const atomicMark = (m) => !/[/,]/.test(String(m));
const readableMarks = (ms) => (ms.some(atomicMark) ? ms.filter(atomicMark) : ms.slice());

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
  const rawTags = [...new Set(rows.map((r) => r.tag).filter(Boolean))].sort(cmpStr);
  const marksByTag = new Map();
  const allMarks = [];
  for (const t of rawTags) {
    const ms = marksOf(t);
    marksByTag.set(t, ms);
    for (const m of ms) if (!allMarks.includes(m)) allMarks.push(m);
  }
  allMarks.sort(cmpStr);

  /* An entry THIS ROOM'S OWN ROWS name by id. Nine of room 238's rows say
   * "conflicts.md A11 / B4.4 ... are OPEN on all seven accessible keys (118,
   * 217, 238, ...)", which is the database saying B4.4 touches this key. */
  const citedBy = new Map();
  for (const r of rows) {
    const own = [r.instance_note, r.note].filter(Boolean).join(' - ');
    for (const m of String(own).matchAll(CONFLICT_ID_CITE_RE)) {
      for (const id of m[1].split('/').map((s) => s.trim()).filter(Boolean)) {
        if (!citedBy.has(id)) citedBy.set(id, []);
        if (!citedBy.get(id).includes(r.item_id)) citedBy.get(id).push(r.item_id);
      }
    }
  }

  const out = [];
  for (const c of db.prepare('SELECT * FROM conflicts ORDER BY conflict_id').all()) {
    if (String(c.status).toUpperCase() !== 'OPEN') continue;
    const hay = conflictHaystack(c);
    /* A room key is matched as a standalone number. A number reached through a
     * slash or a dot is part of a tag run ("GR-300/305/307/308", "GR-600.1"),
     * not a room, so those are excluded: B4.5 names tags 305 and 307, not
     * rooms 305 and 307 (which exist on floor 3). */
    const hitKeys = keys.filter((k) => new RegExp('(^|[^0-9A-Za-z\\-/.])' + k + '([^0-9A-Za-z./]|$)').test(hay));
    const hitMarks = allMarks.filter((t) => new RegExp('(^|[^0-9A-Za-z-])' + reEsc(t) + '([^0-9A-Za-z]|$)').test(hay));
    const hitTags = rawTags.filter((t) => (marksByTag.get(t) || []).some((m) => hitMarks.includes(m)));
    const hitRows = (citedBy.get(c.conflict_id) || []).slice().sort(cmpStr);
    if (!hitKeys.length && !hitMarks.length && !hitRows.length) continue;
    out.push({ id: c.conflict_id, c, keys: hitKeys, marks: hitMarks, tags: hitTags, rows: hitRows });
  }
  return out;
}

/** The entry, verbatim, as it rides on a line or in a note. */
function conflictQuote(h) {
  return 'OPEN DOCUMENT CONFLICT ' + h.id + ', carried from the data/project.sqlite conflicts table and NOT ' +
    'resolved here. Source: ' + h.c.source + '. Status: ' + h.c.status + '. Topic, verbatim: "' + h.c.topic +
    '". Positions, verbatim: "' + h.c.positions + '"';
}

/**
 * Conflicts that name one of the MARKS this line carries. `codes` is every mark
 * list the line holds: its own code AND the tag on every data/project.sqlite row
 * of this room folded into it - which is how the lavatory dispute finally lands,
 * because plmb_lavfaucet_a's code is an em dash and its evidence is row
 * ITM-0043, tagged "L-2 / L-3 / L-4".
 */
const conflictsOnMarks = (hits, codes) => {
  const marks = marksOf(codes);
  if (!marks.length) return [];
  return hits.filter((h) => h.marks.some((m) => marks.includes(m)));
};

const conflictsOnTag = (hits, code) => conflictsOnMarks(hits, [code]);

/* ==================== AN ENTRY A ROW CITES BY ID REACHES THAT ROW'S OWN LINE
 *
 * meta.conflictPolicy states three tests - a mark this room carries, a room key
 * of this type, or a citation of the entry by id in one of this room's own rows
 * - and said every match lands on the line. conflictsOnMarks() only ever
 * filtered on h.marks, so the THIRD test could reach room note n_conflicts and
 * nothing else. Room 238's rows ITM-0712 through ITM-0720 cite "conflicts.md
 * A11 / B4.4" by id and every one of them HAS a line in this package
 * (db_itm0712, db_itm0714..0717, hd05_a, hd14_a, hd51_a), so B4.4's own
 * instruction - "Do not order the 438 bath package" - sat in a room note while
 * the eight bathing lines it is about said nothing about it.
 *
 * A KEY match still rides in the room note only: a key is a fact about the
 * room, not about any one line, and that is what the policy now says.
 * ========================================================================== */
const conflictsOnLine = (hits, codes, rowIds) => {
  const marks = marksOf(codes);
  const ids = (rowIds || []).filter(Boolean);
  return hits.filter((h) => h.marks.some((m) => marks.includes(m)) || h.rows.some((r) => ids.includes(r)));
};

/** The marks of THIS line that a given entry actually names. */
const markHitsFor = (h, codes) => {
  const marks = marksOf(codes);
  return readableMarks(h.marks.filter((m) => marks.includes(m)));
};

/** The rows behind THIS line that cite a given entry by id. */
const rowHitsFor = (h, rowIds) => h.rows.filter((r) => (rowIds || []).includes(r));

/** The sentence that rides on a line, naming what actually matched it. */
function conflictOnLineText(h, codes, wasRel, rowWord, rowIds) {
  const hit = markHitsFor(h, codes);
  const byRow = rowHitsFor(h, rowIds);
  const why = [];
  if (hit.length) {
    why.push('It names ' + (hit.length > 1 ? 'marks ' : 'mark ') + hit.join(', ') + ', which this line carries' +
      (readableMarks(marksOf(codes)).length > hit.length
        ? ' (this line\'s full mark list: ' + readableMarks(marksOf(codes)).join(', ') + ')' : '') + '.');
  }
  if (byRow.length) {
    why.push('data/project.sqlite ' + rowWord + ' ' + byRow.join(', ') + ' behind this line cite' +
      (byRow.length > 1 ? '' : 's') + ' this entry BY ID, which is the database itself saying the entry touches ' +
      'this item.');
  }
  return conflictQuote(h) + ' ' + why.join(' ') +
    ' The entry travels with the line and the line is FLAGGED for it' +
    (String(wasRel).toUpperCase() === 'FLAGGED' ? '' : ' - its own data/project.sqlite ' + rowWord + ' read ' +
      wasRel + ', and the open conflict flags it further') +
    '; confirm before any takeoff or purchase.';
}

/* ======================= AN OPEN ENTRY THAT PRINTS AN AREA FOR THIS ROOM TYPE
 *
 * A13 is the only OPEN entry in the conflicts table that prints a gross AREA
 * against a type in this set - positions, verbatim: "G001 Unit Mix: Queen Queen
 * 480 sqft vs Queen Queen (Wide) 535 sqft; also QQ Ext 510, King Studio 387..."
 * - and it named no tag and no room key, so openConflictsFor() correctly did not
 * match it and it rode NOWHERE. That is a decision either way, so it is made
 * here and written down rather than left to a matcher's silence: AN OPEN ENTRY
 * THAT PRINTS AN AREA FOR THIS TYPE RIDES AS A ROOM NOTE, and on no line,
 * because an area is a fact about the type and not about any one item.
 *
 * The test is mechanical and stated: the entry names the type by its full
 * room_types name, or by a prefix of that name at least six characters long
 * ending at a word boundary, immediately followed by a number - which is how
 * G001 writes "QQ Ext 510" for room_types "QQ Extended". Nothing is inferred
 * from the number itself and no area is asserted anywhere in this package.
 * ========================================================================== */
const TYPE_AREA_MIN_PREFIX = 6;

/* The conflicts table writes type names its own way: "Queen Queen" for
 * Queen-Queen, "Queen Queen (Wide)" for QQ Wide, "QQ Ext" for QQ Extended.
 * A13 names the plain Queen-Queen and the QQ Wide areas and reached neither
 * type while the matcher required the database's own spelling. */
const TYPE_AREA_ALIASES = {
  'Queen-Queen': ['Queen Queen'],
  'QQ Wide': ['Queen Queen (Wide)', 'Queen Queen Wide', 'QQ (Wide)'],
  'QQ Wide Connecting': ['Queen Queen (Wide) Connector', 'Queen Queen Wide Connector', 'QQ Wide Connector'],
  'QQ Extended': ['QQ Ext', 'Queen Queen Ext', 'Queen Queen Extended', 'Queen Queen (Ext)'],
  'QQ Connecting': ['QQ Connector', 'Queen Queen Connector', 'QQ Studio Connector'],
  'QQ Acc.': ['QQ Acc', 'Queen Queen Acc', 'Queen Queen Accessible', 'QQ Accessible'],
  'King Studio Acc.': ['King Studio Acc', 'King Studio Accessible', 'KS Acc'],
  'King One Bedroom Acc.': ['King One Bedroom Acc', 'King One Bedroom Accessible', 'K1B Acc'],
};
function typeAreaConflictsFor(db, room) {
  const name = String(room.room_type || '');
  const forms = [];
  for (let n = name.length; n >= TYPE_AREA_MIN_PREFIX; n--) {
    const p = name.slice(0, n);
    if (/[\s.]$/.test(p)) continue;
    forms.push(p);
  }
  for (const a of TYPE_AREA_ALIASES[name] || []) if (!forms.includes(a)) forms.push(a);
  const out = [];
  for (const c of db.prepare('SELECT * FROM conflicts ORDER BY conflict_id').all()) {
    if (String(c.status).toUpperCase() !== 'OPEN') continue;
    const hay = [c.topic, c.positions].map((x) => String(x || '')).join('  ');
    const hit = forms.filter((p) => new RegExp('(^|[^0-9A-Za-z])' + reEsc(p) + '\\s+\\d').test(hay));
    if (!hit.length) continue;
    out.push({ id: c.conflict_id, c, form: hit[0] });
  }
  return out;
}

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
    'FLOOR ' + FLOOR + ' BUILD, STAGED FOR APPROVAL - NOT LIVE. Room ' + roomNo + ' is room type "' + room.room_type + '" (' +
    spec.keys.length + ' key(s) of this type building-wide: ' + spec.keys.join(', ') + '). Sheets: ' + spec.sheets + '. ' +
    PROFILE.ask + ' ' +
    'Package text for the tags this room shares with a built floor-1 room is carried from room ' + spec.donor + ' (' +
    spec.donorType + ') - ' + spec.why + ' Any tag with no counterpart in room ' + spec.donor +
    ' ships from data/project.sqlite verbatim, with its own reliability. Ruling D24 makes it law that every ' +
    'check-off, initial, timestamp, issue and note the crew app already holds on this room travels with it; ' +
    'platform/tools/carry_floor2.mjs --floor=' + FLOOR + ' does that after every build and proves the reconciliation is exact.', stamp);

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
    const own = [r.instance_note, r.note].filter(Boolean).join(' - ');
    const statesConflict = rowStatesConflict(own);
    if (String(r.reliability).toUpperCase() === 'HIGH' && !statesConflict) continue;
    if (statesConflict) gateConflicts++;
    gateNotes.push((r.tag || '<untagged>') + ' [' + r.category + ', ' + r.reliability +
      (statesConflict ? ', STATES A DOCUMENT CONFLICT' : '') + '] ' + r.item_id +
      ' "' + r.description + '"' + (r.instance_note ? ' (' + r.instance_note + ')' : '') +
      (r.note ? ' - data/project.sqlite note, verbatim: "' + r.note + '"' : '') +
      ' [cited: ' + (r.source_sheet || r.primary_sheet || 'no citation') + ']');
  }
  if (gateNotes.length) {
    notes.n_gategaps = noteOf(
      'ROWS OUTSIDE AUSTIN\'S CHECKLIST GATE THAT ARE FLAGGED, MEDIUM, OR STATE A DOCUMENT CONFLICT. ' +
      'That is exactly the list below and exactly how it was selected: ' + gateNotes.length + ' row(s) of room ' +
      roomNo + ' sit in a category outside Austin\'s approved checklist gate (the gate keeps Paint, Drywall, ' +
      'Flooring, Doors, Stone / Surround, Wall Covering and FF&E - Misc off the normal FF&E and MEP lists, which is ' +
      'how every approved floor-1 room already works) AND are either FLAGGED or MEDIUM in data/project.sqlite, or ' +
      'state a DOCUMENT CONFLICT in their own note at any reliability (' + gateConflicts + ' of them do). They are ' +
      'recorded here so the conflict travels with the room. A HIGH row that states a conflict is listed too: how ' +
      'well a row was READ says nothing about whether the documents AGREE. A row counts as stating a conflict on ' +
      'the database\'s own words - the conflict vocabulary, printed here from the matcher\'s own list so the two ' +
      'cannot drift apart (' + CONFLICT_WORDS.map((w) => '"' + w + '"').join(', ') + ', matched case-insensitively ' +
      'as substrings, so "supersede" catches both "superseded" and "supersedes") OR two sheet numbers set against ' +
      'each other in one sentence by the words "vs", "versus", "while", "against" or "but", which is what an accessible key\'s ' +
      'WC-02 row does. Being listed here does not by itself decide whether a row also carries a checklist line: ' +
      'platform/tools/carry_floor2.mjs --floor=' + FLOOR + ' REBUILDS a gated row as a line where the crew already holds field work on ' +
      'it, and that line says on its face why it exists. Widening the gate itself is Austin\'s call, not this ' +
      'tool\'s. ' + gateNotes.join('  ||  '), stamp, 'issue');
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
  /* THE KEY TEST USES THE SAME BOUNDARY THE CONFLICTS MATCHER USES.
   *
   * It used to be new RegExp('(^|[^0-9])' + k + '([^0-9]|$)'), which reads the
   * SHEET names "P402" and "G402" as room key 402 and dragged two placeholders
   * that are about somewhere else entirely under a header saying they are gaps
   * against THIS type: PH-GU-016, whose whole text is about room 118, and
   * PH-GU-027, which is about ACCESSIBLE lavatories on a room whose
   * rooms.accessible is 0. The conflicts matcher in this same file already had
   * the right boundary class; the placeholder matcher did not.
   *
   * AND IT TESTS THE MARKS TOO. Selecting on the type name and the room key
   * alone left out the placeholders that are most about this room - PH-GU-003
   * is the SK-3 / SK-4 unit-type assignment on a room that ships a SK-3 / SK-4
   * line, PH-GU-004 is WC-3 vs WC-4 on a room that ships a WC-3 / WC-4 line -
   * so a mark this room actually carries now selects a placeholder, split mark
   * by mark by the same splitter the conflicts table uses. */
  const keyRe = (k) => new RegExp('(^|[^0-9A-Za-z-])' + k + '([^0-9A-Za-z]|$)');
  const roomMarks = marksOf(rows.map((r) => r.tag).filter(Boolean));
  const allPh = db.prepare("SELECT * FROM placeholders WHERE scope = 'guestroom' ORDER BY placeholder_id").all();
  const phs = [];
  for (const p of allPh) {
    const wide = String(p.topic) + ' ' + String(p.what_is_missing) + ' ' + String(p.suggested_sheet);
    const narrow = String(p.topic) + ' ' + String(p.what_is_missing);
    const why = [];
    if (mentionsType(wide, room.room_type)) why.push('names this room type by name');
    const hitKeys = spec.keys.filter((k) => keyRe(k).test(narrow));
    if (hitKeys.length) why.push('names room key(s) ' + hitKeys.join(', ') + ' of this type');
    const hitMarks = roomMarks.filter((m) => keyRe(reEsc(m)).test(narrow));
    if (hitMarks.length) why.push('names mark(s) ' + hitMarks.join(', ') + ' that this room carries');
    if (why.length) phs.push({ p, why });
  }
  if (phs.length) {
    notes.n_gaps = noteOf(
      'DOCUMENT GAPS THE DATABASE RAISES AGAINST THIS ROOM TYPE - nothing here has been filled in, and nothing ' +
      'here was added to the checklist. THIS IS NOT THE COMPLETE PLACEHOLDER LIST. data/project.sqlite holds ' +
      allPh.length + ' guestroom placeholder(s); the ' + phs.length + ' below are the ones the database itself ' +
      'ties to this room, on one of three mechanical tests, and each entry says which test caught it: it names ' +
      'this room type by name, or it names one of this type\'s room keys (' + spec.keys.join(', ') + ') with a ' +
      'non-alphanumeric boundary either side so that sheet names like P402 and G402 are NOT read as room key 402, ' +
      'or it names a MARK this room carries. A placeholder that is relevant to this room in some way the database ' +
      'does not state is NOT here, and a reader should treat this as a starting point rather than a closed set. ' +
      phs.map((x) => x.p.placeholder_id + ' (' + x.p.topic + ', suggested sheet ' + x.p.suggested_sheet +
        ') [selected because it ' + x.why.join('; and it ') + ']: "' +
        x.p.what_is_missing + '"' + (x.p.why ? ' Why it stays open: "' + x.p.why + '"' : '')).join('  ||  '),
      stamp, 'issue');
  }

  /* Ruling D22 - deliberately NOT applied to these types. */
  if (report.d22) notes.n_d22 = noteOf(report.d22.text, stamp, report.d22.flag);

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
      'RESOLVED BY THIS TOOL. An entry rides here on any of THREE tests, and each one below says which test ' +
      'caught it: (1) it names a MARK this room carries - every mark list on a row or a line is split on "/" and ' +
      '"," and matched mark by mark, so "SH-1 / SH-4" is matched as SH-1 and SH-4 and not as one string; (2) it ' +
      'names one of this type\'s room keys (' + spec.keys.join(', ') + '); (3) one of THIS room\'s own ' +
      'data/project.sqlite rows cites the entry by id. TESTS 1 AND 3 ALSO PUT THE ENTRY ON A LINE: a line whose ' +
      'mark the entry names, and a line whose supporting row cites the entry by id, is FLAGGED and carries the ' +
      'entry verbatim. TEST 2 DOES NOT: a room key is a fact about the room and not about any one item, so a ' +
      'key-only match is carried here and on no line. An entry whose mark the category gate keeps off the normal ' +
      'FF&E and MEP lists is carried here too. ' +
      conflictHits.map((h) => h.id + ' [' + h.c.source + ']' +
        (h.marks.length ? ' names mark(s) ' + readableMarks(h.marks).join(', ') + ', carried in this room on tag(s) ' +
          h.tags.map((t) => '"' + t + '"').join(', ') : '') +
        (h.keys.length ? (h.marks.length ? '; also' : '') + ' names room key(s) ' + h.keys.join(', ') +
          ' of this type' : '') +
        (h.rows.length ? (h.marks.length || h.keys.length ? '; also' : '') + ' cited by id in this room\'s own ' +
          'row(s) ' + h.rows.join(', ') : '') +
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

  /* An OPEN entry that prints an AREA for this room type. Decided, not silent. */
  const areaHits = typeAreaConflictsFor(db, room);
  if (areaHits.length) {
    notes.n_typearea = noteOf(
      'OPEN DOCUMENT CONFLICT ON THIS ROOM TYPE\'S AREA - carried here and on no line, deliberately. ' +
      areaHits.length + ' OPEN entr(y/ies) in the data/project.sqlite conflicts table print a gross AREA against ' +
      'room type "' + room.room_type + '". An area is a fact about the TYPE and not about any one checklist item, ' +
      'and the entry names no tag and no room key of this type, so it has no line to sit on. It is recorded here ' +
      'so that a reader knows it was considered rather than missed. NOTHING IS RESOLVED AND NO AREA IS ASSERTED ' +
      'ANYWHERE IN THIS PACKAGE. How it was matched: the entry names the type by its full room_types name, or by ' +
      'a prefix of it at least ' + TYPE_AREA_MIN_PREFIX + ' characters long ending at a word boundary and ' +
      'immediately followed by a number - G001 writes this type as "' + areaHits[0].form + '". ' +
      areaHits.map((h) => h.id + ' [' + h.c.source + '] - topic, verbatim: "' + h.c.topic +
        '"; positions, verbatim: "' + h.c.positions + '"').join('  ||  ') +
      ' TO CLOSE IT: the prototype gross areas on G001 are, in the entry\'s own words, "evidence, not proof" - ' +
      'a field measurement of this key settles what this room actually is.', stamp, 'issue');
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
function d22ScopeNote(db, room, roomNo, rows, corrections) {
  const hit = rows.filter((r) => r.tag === 'GR-308' || r.tag === 'GR-305' || r.tag === 'GR-309');
  if (!hit.length) return null;
  const r = hit[0];
  const sameType = db.prepare('select count(*) n from rooms where room_type = ?').get(room.room_type).n;
  const printed = Object.entries(WORKBOOK_F2_COUNTS).map(([t, c]) => t + ' ' + c).join(', ');
  const tab = TAB_FACTS.mismatches.length === 0
    ? 'The ' + WORKBOOK_F2 + ' lists the working walls as separate purchased parts (' + printed + ') and every one of ' +
      'those counts reconciles against floor ' + FLOOR + '\'s own key mix with no remainder (' + TAB_FACTS.facts.join('; ') + ').'
    : 'The ' + WORKBOOK_F2 + ' lists the working walls as separate purchased parts (' + printed + '). THOSE FIGURES DO ' +
      'NOT RECONCILE with floor ' + FLOOR + '\'s own key mix: ' + TAB_FACTS.mismatches.join('; ') + '. Where they do ' +
      'reconcile: ' + (TAB_FACTS.facts.join('; ') || 'nowhere') + '. The tab prints the same six figures as the 2nd Floor ' +
      'tab, and ruling D20 already found a copied-down figure on these tabs, so this tab is NOT treated as evidence ' +
      'for this floor.';
  if (corrections && corrections.length) {
    const c = corrections[0];
    const who = c.ruling === 'D22'
      ? 'Room ' + roomNo + ' is a plain Queen-Queen key, the type D22 names, and it takes '
      : c.ruling === 'D33'
        ? 'Austin ruled on 2026-09-02, reviewing the floor-2 book: "ok retag 201, 230, 232 to GR-305 and 238 to GR-309" ' +
          '(D33). Room ' + roomNo + ' (' + room.room_type + ') therefore takes '
        : 'Austin ruled on 2026-09-02, reviewing the floor-' + FLOOR + ' book: "' + c.spec.quote + '" (' + c.ruling + '). ' +
          'Room ' + roomNo + ' (' + room.room_type + ') therefore takes ';
    return { flag: 'issue', summary: 'APPLIED ' + c.ruling + ' - ' + c.from + ' -> ' + c.to + ' (2nd Floor tab reconciled); handedness OPEN',
      text: 'WORKING WALL TAG - RULING ' + c.ruling + ' APPLIED TO THIS ROOM. ' + who + c.to + ' (' + c.spec.label +
        '), not the ' + c.from + ' data/project.sqlite transcribed off the architectural plan. ' + tab + ' ' +
        c.spec.handedness + ' The line itself (' + c.to + ') carries the full ruling text and ships at reliability ' +
        'MEDIUM while the hand is open.' };
  }
  if (/Connecting/.test(room.room_type)) {
    return { flag: 'info', summary: 'GR-308 is the connector wall and stands',
      text: 'WORKING WALL TAG - GR-308 STANDS. Room ' + roomNo + ' is a QQ Connecting key and GR-308 IS the connector ' +
        'working wall. ' + tab + ' Ruling D22 corrected the PLAIN Queen-Queen keys and does not touch a connecting key.' +
        (r.note ? ' The row\'s own note, verbatim: "' + r.note + '".' : '') };
  }
  if (TAB_FACTS.mismatches.length) {
    return { flag: 'issue', summary: 'NO CORRECTION ON FLOOR ' + FLOOR + ' - the ' + PROFILE.tab + ' tab does not reconcile; ' +
        r.tag + ' carried as transcribed, OPEN for Austin',
      text: 'WORKING WALL TAG - OPEN FOR AUSTIN. This room carries ' + r.tag + ', exactly as data/project.sqlite transcribes ' +
        'it' + (r.note ? ' - the row\'s own note, verbatim: "' + r.note + '"' : '') + '. On floor 2, rulings D22 and D33 ' +
        'retagged every two-queen key against the 2nd Floor tab of the purchase record because that tab reconciled with ' +
        'floor 2\'s key mix exactly. ' + tab + ' So no tag is changed on this floor: applying a floor-2 ruling on a tab that ' +
        'does not reconcile would be a guess. Room ' + roomNo + ' is "' + room.room_type + '" (' + sameType + ' key(s) ' +
        'building-wide). TO CLOSE THIS: Austin confirms the working-wall tag for this key (D22 and D33 name the floor-2 ' +
        'keys by type and number) and the LEFT / RIGHT hand with RK Design before any casework is released. Until then the ' +
        'line ships FLAGGED as transcribed.' };
  }
  const likely = room.room_type === 'QQ Acc.'
    ? 'For this room the tab purchased GR-309R "Working Wall @ QQ Accessible", ONE unit against the ONE QQ Acc. key on ' +
      'this floor, and the row\'s own note records that the spec and ID-5.9 also say GR-309 while the accessible plan ' +
      'tags GR-308. Three documents against one, and the workbook is the purchase record.'
    : 'For this room type the tab\'s GR-305 count reconciles ONLY with the QQ Wide and QQ Extended keys counted in, ' +
      'which puts room ' + roomNo + ' on GR-305 in the purchase record.';
  return { flag: 'issue', summary: 'DECLINED - ' + room.room_type + ' is not a type a ruling names on this floor; ' + r.tag +
      ' carried as transcribed, tab evidence recorded, OPEN for Austin',
    text: 'WORKING WALL TAG - OPEN FOR AUSTIN. This room carries ' + r.tag + ', exactly as data/project.sqlite transcribes ' +
      'it' + (r.note ? ' - the row\'s own note, verbatim: "' + r.note + '"' : '') + '. Room ' + roomNo + ' is "' + room.room_type +
      '" (' + sameType + ' key(s) building-wide), and no ruling names this key, so the tag is NOT changed here: retagging ' +
      'it would be a new ruling, not the application of an existing one. THE EVIDENCE, so it can be closed with one word: ' +
      tab + ' ' + likely + ' TO CLOSE THIS: Austin confirms the tag for this key (and the LEFT / RIGHT hand per room) with ' +
      'RK Design before any casework is released. Until then the line ships FLAGGED as transcribed.' };
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

  /* Rulings, scoped to their evidence, decided before the reduction runs. The
   * D22 tag correction goes FIRST so the key, the fold and the ordering all
   * follow from the corrected tag, exactly as build_floor1.mjs does it. */
  const corrections = applyTagCorrectionsF2(roomNo, room, rows);
  report.corrections = corrections;
  const ov = resolveQtyOverrides(room, rows);
  report.qtyOverrides = ov;

  const red = reduceFFE(roomNo, rows, convention);
  report.rawRows = red.rawCount;
  report.gatedRows = red.gatedCount;
  report.foldedGroups = red.foldedGroups;
  report.mepRowCount = red.mepRowCount;
  report.unknownCategories = red.unknownCategories;
  report.gateDropped = rows.length - red.gatedCount - red.mepRowCount;
  report.d22 = d22ScopeNote(db, room, roomNo, rows, corrections);

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
  const conflictTextByKey = {};
  const fromDonor = [], fromSqlite = [], donorQtyNotes = [], donorLabelNotes = [], overrideNotes = [];
  const flagged = [], configLines = [], declinedLines = [];
  const relKept = [], donorTextDropped = [], donorClosures = [], conflictLines = [], typeCiteFixed = [];
  const typeIdx = typeSheetIndex(db);
  const drops = configADrops(roomNo, rows);

  /* Every OPEN entry in the conflicts table that names this room's keys or one
   * of its tags. Read once, used on the lines and again in the room note. */
  const conflictHits = openConflictsFor(db, roomNo, spec.keys, rows);
  report.conflictHits = conflictHits.map((h) => h.id + (h.marks.length ? ' [marks ' + readableMarks(h.marks).join(', ') + ']' : '') +
    (h.keys.length ? ' [keys ' + h.keys.join(', ') + ']' : '') +
    (h.rows.length ? ' [cited by own row(s) ' + h.rows.join(', ') + ']' : ''));

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
          prov.push('RELIABILITY. data/project.sqlite reads this room\'s row at ' + line.sqlite.reliability +
            '. The approved package for this tag carries a RULING that closes that flag for the PRODUCT - it names ' +
            'a model, not a room - and that ruling text is on this line above, so the flag is closed here on the ' +
            'ruling and on nothing else. Nothing but a ruling of that kind may move a flag.');
        } else {
          relKept.push(line.key + ' (' + tagLabel + '): sqlite ' + line.sqlite.reliability + ' KEPT over donor ' +
            r.reliability);
          /* ROW BY ROW, NOT FOLD BY FOLD. This sentence used to print the FOLDED
           * worst-case reliability against the FULL row-id list, so room 217's
           * 905_a said "row(s) ITM-0347, ITM-0082 ... read MEDIUM" when the
           * database reads ITM-0082 HIGH. On a build whose whole premise is
           * quoting the database verbatim, a line may not say the database says
           * something it does not say. Every row is now named at its own
           * reliability, and where they disagree the line says so and quotes the
           * row that pulls it down. */
          const perRow = line.rows.map((x) => x.item_id + ' [' + x.reliability + ']').join(', ');
          const worstRows = line.rows.filter((x) =>
            String(x.reliability).toUpperCase() === String(line.sqlite.reliability).toUpperCase());
          const mixed = new Set(line.rows.map((x) => String(x.reliability).toUpperCase())).size > 1;
          const worstQuotes = worstRows.map((x) => x.item_id +
            (x.instance_note ? ' ("' + x.instance_note + '")' : '') +
            (x.note ? ' - note, verbatim: "' + x.note + '"' : '')).join('; ');
          /* THE NOTE DOES NOT RESTATE THE RELIABILITY FIELD. It used to end
           * "the line ships the worst of them, MEDIUM" - and on 217/905_a the
           * conflicts-table block below then raised the same line to FLAGGED,
           * so the badge and the sentence disagreed. The note now says which
           * rows there are and how they are read; the field says what the line
           * ships, and every block that MOVES the field announces its own move. */
          prov.push('RELIABILITY. This line is read no better than the worst of THIS room\'s own ' +
            'data/project.sqlite row(s), each shown at its own reading: ' + perRow + '. ' +
            (mixed
              ? 'They do not agree, and a fold is only as well read as its weakest row. What pulls it down: ' +
                worstQuotes + '. ' +
                'The higher-read row(s) on this same tag are not evidence that the lower one was read better.'
              : 'They agree with one another.') +
            ' LIVE room ' + donorNo + ' carries the same tag at ' + r.reliability + ', which is a fact about room ' +
            donorNo + ' and not evidence about this room. A donor may enrich a line; it may not close its flag.');
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
      /* THE POSITIVE STATEMENT IS THE WHOLE STATEMENT. This used to close with
       * "LIVE room 105 has no line for tag GR-308, so nothing here was borrowed
       * from another room type" - and platform/data/floor1-staged.json DOES
       * hold 105/gr308_a, as a D22 tombstone. The intent was "no LIVE line",
       * the words said something the approved floor-1 build contradicts, and a
       * claim about another document is not needed to say where THIS line came
       * from. Naming every row it is built from says it completely. */
      prov.push('SOURCE. Every field on this line - label, tag, count, citation, reliability and text - is ' +
        'data/project.sqlite room ' + roomNo + '\'s own row(s) ' + rowIds + ', verbatim, at the database\'s own ' +
        'reliability. The approved package for LIVE room ' + donorNo + ' (' + spec.donorType + ') supplied nothing ' +
        'to it: the donor index this build reads is LIVE lines only, and a retired tombstone is not a source.');
    }

    /* AN ENLARGEMENT SHEET DRAWS THE TYPES ITS TITLE NAMES. See ffeTypeCitation(). */
    const tc = ffeTypeCitation(line, room.room_type, rt.room_sheet || '', rt.bath_sheet || '', typeIdx, roomNo);
    if (tc.changed) {
      if (tc.src !== pkg.src) typeCiteFixed.push(line.key + ' (' + tagLabel + '): ' +
        JSON.stringify(pkg.src) + ' -> ' + JSON.stringify(tc.src) + ' [' + tc.kind + ']');
      else typeCiteFixed.push(line.key + ' (' + tagLabel + '): ' + JSON.stringify(pkg.src) + ' [' + tc.kind + ']');
      pkg.src = tc.src;
      prov.push(tc.note);
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
        'on the ' + line.rawRows + ' row(s) the drawing set tags. Confirm all three positions in the field before ordering.';
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
    /* Every mark this line carries: its own tag AND the tag on every row of this
     * room folded into it. Marks are matched one at a time - see splitMarks(). */
    const lineCodes = [line.code, ...line.rows.map((x) => x.tag)].filter(Boolean);
    const lineRowIds = line.rows.map((x) => x.item_id);
    const onTag = conflictsOnLine(conflictHits, lineCodes, lineRowIds);
    let conflictText = '';
    if (onTag.length) {
      const wasRel = pkg.reliability;
      pkg.reliability = 'FLAGGED';
      conflictText = onTag.map((h) => conflictOnLineText(h, lineCodes, wasRel, 'row(s)', lineRowIds)).join(' ');
      conflictTextByKey[line.key] = conflictText;
      conflictLines.push(line.key + ' (' + readableMarks(marksOf(lineCodes)).join(' + ') + ' <- ' +
        onTag.map((h) => h.id + '[' + (markHitsFor(h, lineCodes).join(',') ||
          'cited by ' + rowHitsFor(h, lineRowIds).join(',')) + ']').join(', ') + ')');
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
  /* A corrected line carries THIS floor's ruling text, not the donor's floor-1
   * note (a true statement about floor 1 and a false one about this room). */
  const correctedLines = [];
  for (const corr of corrections) {
    /* The corrected line still carries every OPEN conflicts-table entry that
     * names it, after the ruling text - a ruling on the tag does not close B4.5. */
    const keys = Object.keys(items).filter((k) => items[k].code === corr.to);
    if (keys.length !== 1) die('room ' + roomNo + ': expected exactly one ' + corr.to + ' line after correction, found ' + keys.length);
    const it = items[keys[0]];
    it.label = corr.spec.label;
    const conf = conflictTextByKey[keys[0]] || '';
    /* An OPEN conflicts-table entry that names the corrected mark keeps the line
     * FLAGGED, exactly as it does on every other line; the ruling alone would
     * make it MEDIUM, and the note says both. */
    it.reliability = conf ? 'FLAGGED' : 'MEDIUM';
    it.instanceNote = '⚑ ' + d22LineNote(roomNo, corr, Boolean(conf)) + (conf ? ' ' + conf : '');
    correctedLines.push(corr.to + ' (' + corr.ruling + ', was ' + corr.from + ') on ' + keys[0]);
    if (!flagged.some((f) => f.startsWith(keys[0] + ' '))) flagged.push(keys[0] + ' [MEDIUM] ' + corr.to);
  }
  report.correctedLines = correctedLines;
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
  report.ffeTypeCiteFixed = typeCiteFixed.sort(cmpStr);
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
  const bathSheet = String((db.prepare('SELECT bath_sheet FROM room_types WHERE type_name = ?')
    .get(room.room_type) || {}).bath_sheet || '');
  const isConnecting = String(room.connecting) === '1';
  const drops = configADrops(roomNo, rows);
  /* Which sheet covers which floor, read out of data/project.sqlite's own
   * sheets table. See floorTrueCitation(). */
  const floorIdx = floorSheetIndex(db);
  const bathIdx = bathSheetIndex(db);
  const roomFloor = Number.parseInt(room.floor, 10);

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
    if (!key && !configOf(r) && MEP_VARIANT_SLOTS[r.item_id]) { key = MEP_VARIANT_SLOTS[r.item_id]; how = 'variant slot'; }
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
      } else if (how === 'variant slot') {
        if (!unitHits.has(key)) unitHits.set(key, []);
        unitHits.get(key).push(r);
        placedBy.push(r.item_id + ' -> ' + key + ' (floor-1 variant slot, MEP_VARIANT_SLOTS - the placement build_floor1 used)');
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
  const relFromOwn = [], floorFixed = [], markFromOwn = [], tagAssertFixed = [], bathFixed = [], citedMarkLines = [];

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

    const cite = composeMepCitation(d.src, mine, roomSheet, isConnecting, numbering, donorSheet, rows);
    let src = cite.src;
    let citeNote = cite.note;
    if (src !== d.src) repointed.push(key);
    if (cite.removed.length) citationDropped.push(key + ': ' + [...new Set(cite.removed)].join(', ') + ' -> ' + cite.outcome);
    if (cite.connectingRemoved.length) connectingDropped.push(key);

    /* QUANTITY. The donor's count stands unless THIS room's own rows prove a
     * different number of the SAME physical unit - which only the product-
     * identity match can prove. Never a raw row count: elec_panel folds 13 rows
     * and is still one panelboard. */
    if (units.length && key !== FP_HEADS_KEY) {
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
    let rebuiltFromOwnRow = '';
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
      rebuiltFromOwnRow = variant.item_id;
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
      /* A room WITH sprinkler rows of its own (the standard types the database
       * drew head by head) takes its OWN take-off, exactly as floor 1 did for
       * rooms 107 through 115. A room with none gets the honest no-count line. */
      item = heads.length
        ? fpOwnTakeoff(roomNo, donorNo, item, heads, report, room.floor)
        : fpNoCount(db, roomNo, room.room_type, donorNo, item, report, room.floor);
    }

    /* An accessible key with no neutral bathing row keeps the D10 line but says
     * plainly that the product text is not an answer for this key. */
    if (drops.carried && MEP_LABEL_FROM_ROW.has(key) && !units.length) {
      const donorMark = String(item.code || '');
      item = bathingUnresolvedLine(roomNo, key, item, drops, donorNo, bathSheet);
      configLines.push(key + ' (donor product text, marked UNRESOLVED)');
      if (item.code !== donorMark) {
        markFromOwn.push(key + ': donor mark ' + JSON.stringify(donorMark) + ' -> ' +
          (item.code ? JSON.stringify(item.code) + " from this room's own bathing row(s)" : 'NO MARK (this room has none of that family)'));
      }
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
      item.instanceNote = appendNote(item.instanceNote, 'COUNT CONFLICT CARRIED, NOT RESOLVED. Room ' + roomNo +
        ' has ' + ptac2.units.length + ' PTAC units (' + ptac2.ids.join(', ') + '), and this room\'s own ' +
        'data/project.sqlite row says, verbatim: "' + ptac2.quote + '". This line is fed by ' +
        members.map((r) => r.item_id + ' ("' + r.instance_note + '")').join(', ') +
        ' - the database transcribes that member ONCE, for PTAC 1 only. The quantity here is therefore the ' +
        'transcribed row count and is NOT doubled: inventing a row the database does not hold would be the same ' +
        'fabrication in the other direction. COUNT WHAT IS INSTALLED before signing this line off, and see the ' +
        'room note.');
      ptacRepeatLines.push(key + ' (' + members.map((r) => r.item_id).join(', ') + ')');
    }

    /* ============ A CONDENSED LINE IS NEVER BETTER READ THAN ITS WORST ROW
     *
     * The FF&E path already runs "a donor may enrich, never launder". The MEP
     * path did not: every line started at the DONOR line's reliability and only
     * the PTAC, the sprinkler line, the bathing variant and the conflicts table
     * could move it. So room 230's mech_grille_rm shipped its single FLAGGED
     * row ("material unsettled - polypropylene vs aluminum, three instructions,
     * no source settles it") as a HIGH line with an EMPTY note; mech_grille_bath
     * folded two FLAGGED rows and three MEDIUM rows into one HIGH line; and
     * eight more lines sat above their own rows with the conflict text dropped.
     * That made meta.donorRule false for the whole MEP document.
     *
     * THE RULE, applied to every condensed line: the reliability is the WORST of
     * THIS room's own rows behind it (never better, and the donor's own flag is
     * never lifted either), and every row that is not HIGH, or whose own note
     * states a document conflict, is quoted ON THE LINE. Nothing is resolved.
     *
     * THE NOTE DOES NOT RESTATE THE RELIABILITY FIELD, and that is deliberate.
     * It used to end "the line ships at the WORST of them, HIGH", built from the
     * local ownWorst - so when the PTAC-repeat block above had already lowered
     * the same line to FLAGGED, the badge and the sentence said two different
     * things about one field (202-MEP and 217-MEP mech_tstat). A note explains
     * WHY a reading is what it is; the reliability field states WHAT it is. Two
     * fields that cannot disagree are better than two fields kept in step by
     * hand. Every block that MOVES the reading still says so in its own words -
     * the PTAC count conflict, the conflicts table, the sprinkler line and the
     * bathing variant all announce their own move.
     * ================================================================= */
    if (mine.length) {
      const ownWorst = mine.reduce((w, r) => (relRank(r.reliability) < relRank(w)
        ? String(r.reliability).toUpperCase() : w), 'HIGH');
      /* The DONOR line's own reading, read off the donor line rather than off
       * item.reliability, which earlier blocks in this loop may already have
       * moved for reasons that have nothing to do with room ' + donorNo. */
      const donorRel = String(d.reliability || '').toUpperCase();
      const before = item.reliability;
      const speaks = mine.filter((r) => relRank(r.reliability) < relRank('HIGH') ||
        rowStatesConflict([r.instance_note, r.note].filter(Boolean).join(' - ')));
      if (relRank(ownWorst) < relRank(item.reliability)) item.reliability = ownWorst;
      if (speaks.length) {
        const already = String(item.instanceNote || '');
        const quotes = speaks.map((r) => r.item_id + ' [' + r.reliability + ']' +
          (r.tag ? ' tag "' + r.tag + '"' : '') + ' "' + r.description + '"' +
          (r.instance_note ? ' (' + r.instance_note + ')' : '') +
          (r.note ? ' - data/project.sqlite note, verbatim: "' + r.note + '"' : '') +
          ' [cited: ' + (r.source_sheet || r.primary_sheet || 'no citation') + ']')
          .filter((q) => !already.includes(q));
        item.instanceNote = appendNote(item.instanceNote, 'THIS ROOM\'S OWN ROWS GOVERN THIS LINE. ' +
          'data/project.sqlite feeds this condensed line from ' + mine.length + ' row(s) of room ' + roomNo +
          ' (' + mine.map((r) => r.item_id + ' [' + r.reliability + ']').join(', ') + '), each shown at its own ' +
          'reading, and a condensed line is never read better than the worst of them' +
          (relRank(ownWorst) < relRank(donorRel)
            ? ' - the approved line for this item on LIVE room ' + donorNo + ' reads ' + donorRel +
              ', and a fact about room ' + donorNo + ' does not close a flag on room ' + roomNo + '.'
            : '.') +
          (quotes.length
            ? ' Row(s) that are not HIGH, or whose own note states a document conflict, carried verbatim and NOT ' +
              'resolved: ' + quotes.join('  ||  ') + '.'
            : ''));
        relFromOwn.push(key + ': donor ' + donorRel + ' -> ' + item.reliability + ' (worst of ' +
          mine.map((r) => r.item_id + ' [' + r.reliability + ']').join(', ') +
          (before !== donorRel ? '; already moved to ' + before + ' earlier in this build' : '') + ')');
      } else if (relRank(ownWorst) < relRank(before)) {
        relFromOwn.push(key + ': ' + before + ' -> ' + item.reliability);
      }
    }

    /* A FLOOR-1 SHEET IS NOT A FLOOR-2 CITATION. See floorTrueCitation(). */
    const ff = floorTrueCitation(item.src, roomFloor, rows, floorIdx, roomSheet, donorNo, roomNo);
    if (ff.changed) {
      item.src = ff.src;
      if (ff.note) item.instanceNote = appendNote(item.instanceNote, ff.note);
      floorFixed.push(key + ': ' +
        [ff.dropped.length ? ff.dropped.length + ' dropped (' + ff.dropped.flatMap((d) => d.ids).join(', ') + ')' : '',
          ff.repointed.length ? 're-pointed ' + ff.repointed.map((x) => x.split(' (')[0]).join(', ') : '',
          ff.trimmed.length ? 'trimmed from the cited list ' + ff.trimmed.map((x) => x.split(' =')[0]).join(', ') : '',
          ff.wide.length ? 'kept (building-wide table) ' + ff.wide.map((x) => x.split(' =')[0]).join(', ') : '',
          ff.ownKept.length ? "kept on this room's own row(s) " + ff.ownKept.map((x) => x.split(' =')[0]).join(', ') : '',
        ].filter(Boolean).join('; '));
    }

    /* A BATH SHEET DRAWS ONE SET OF ROOM TYPES. See bathTrueCitation(). */
    const bf = bathTrueCitation(item.src, bathSheet, room.room_type, bathIdx, donorNo, roomNo);
    if (bf.changed) {
      item.src = bf.src;
      if (bf.note) item.instanceNote = appendNote(item.instanceNote, bf.note);
      bathFixed.push(key + ': ' +
        [bf.dropped.length ? bf.dropped.length + ' dropped (' + [...new Set(bf.dropped.flatMap((d) => d.ids))].sort(cmpStr).join(', ') + ') -> ' + bathSheet : '',
          bf.spanned.length ? 'kept (range spans this type\'s bath sheet) ' + bf.spanned.map((x) => x.split(' =')[0]).join(', ') : '',
          bf.unnumbered.length ? 'kept (no placement number) ' + bf.unnumbered.map((x) => x.split(' =')[0]).join(', ') : '',
        ].filter(Boolean).join('; '));
    }

    /* A tag ASSERTION inside a carried citation is the donor's reading. */
    const ta = ownTagAssertions(item.src, roomNo, rows);
    if (ta.changed) {
      item.src = ta.src;
      item.instanceNote = appendNote(item.instanceNote, ta.note);
      tagAssertFixed.push(key + ': ' + ta.fixes.map((f) => f.asserted + ' -> ' + f.ownMarks.join('/') +
        ' on ' + f.sheet + " (this room's own row(s) " + f.rows.map((r) => r.item_id).join(', ') + ')').join('; '));
    }

    /* A MARK PRINTED INSIDE A CITATION. See citedMarkNote(). */
    const cm = citedMarkNote(item.src, rows, item.category, roomNo);
    if (cm) {
      item.instanceNote = appendNote(item.instanceNote, cm);
      citedMarkLines.push(key);
    }

    /* An OPEN conflicts-table entry that names one of this line's MARKS - its
     * own code AND the tag on every row of this room folded into it. */
    const lineCodes = [item.code, ...mine.map((r) => r.tag)].filter(Boolean);
    const lineRowIds = mine.map((r) => r.item_id);
    const onTag = conflictsOnLine(conflictHits, lineCodes, lineRowIds);
    if (onTag.length) {
      const wasRel = item.reliability;
      item.reliability = 'FLAGGED';
      item.instanceNote = appendNote(item.instanceNote,
        onTag.map((h) => conflictOnLineText(h, lineCodes, wasRel, 'row(s)', lineRowIds)).join(' '));
      conflictLines.push(key + ' (' + readableMarks(marksOf(lineCodes)).join(' + ') + ' <- ' +
        onTag.map((h) => h.id + '[' + (markHitsFor(h, lineCodes).join(',') ||
          'cited by ' + rowHitsFor(h, lineRowIds).join(',')) + ']').join(', ') + ')');
    }

    /* ============ EVERY MEP LINE SAYS WHERE ITS WORDS CAME FROM
     *
     * meta.donorRule has always promised "Every line carries a SOURCE sentence
     * naming which document each part of it came from". All 44 FF&E lines did.
     * ZERO of the MEP lines did, and 202-MEP/elec_gfci shipped an instanceNote
     * that was the empty string beside a citation that was LIVE room 104's text
     * word for word. A crew member had no way to tell which half of the line
     * was room 202's. The promise is now kept on this document too.
     * ================================================================= */
    const ruledHere = RULED_LINE_ADDITIONS.find((x) => x.key === key && x.doc === 'mep');
    if (ruledHere) {
      item.instanceNote = appendNote(item.instanceNote, ruledSourceSentence(ruledHere, room));
    } else if (rebuiltFromOwnRow) {
      item.instanceNote = appendNote(item.instanceNote, 'SOURCE. This line is rebuilt from data/project.sqlite ' +
        'room ' + roomNo + '\'s own row ' + rebuiltFromOwnRow + ': its tag, its label, its citation, its ' +
        'reliability and its note are that row\'s, verbatim. The approved D10 line for this item on LIVE room ' +
        donorNo + ' (' + spec.donorType + ') supplied the key, the category and the sort band, and nothing else.');
    } else {
      item.instanceNote = appendNote(item.instanceNote, 'SOURCE. The label, the category and the sort band on this ' +
        'line are the approved D10 condensed line for this item on LIVE room ' + donorNo + ' (' + spec.donorType +
        '). Its citation was written for guestroom sheet ' + donorSheet + ' and is judged here against ' +
        'data/project.sqlite: ' + (donorSheet === roomSheet
          ? 'room ' + roomNo + ' is drawn on that same sheet, so the guestroom references stand as written apart ' +
            'from the CONNECTING plan variant'
          : 'the guestroom references are re-pointed onto room ' + roomNo + '\'s own sheet ' + roomSheet +
            ' number by number') +
        ', the sheets table decides which FLOOR each sheet covers and which room types each BATHROOM sheet draws, ' +
        'and every one of those decisions is written on this line above. View, keynote, note and row numbers on ' +
        'sheets OUTSIDE that guestroom-and-bathroom set are the approved line\'s and are not re-proved for room ' +
        roomNo + ' - read them on the sheet before relying on them. ' + (mine.length
          ? 'The reliability and the quoted row text on this line are data/project.sqlite room ' + roomNo +
            '\'s own row(s) ' + mine.map((r) => r.item_id).join(', ') + '.'
          : 'The wording above it is the approved line\'s throughout: read it as room ' + donorNo + '\'s punch ' +
            'text applied to room ' + roomNo + ', and verify it in room ' + roomNo + '.'));
    }

    /* `id` rides exactly where the LIVE donor line carries one. The D27 ruled
     * addition has none on the live floor-1 rooms, and this tool was stamping
     * one onto it - a silent drift on the one line that claims byte identity
     * with live. */
    if (!('id' in d)) delete item.id;

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
     * is left EXACTLY as the database writes it - no row is relabeled to make
     * it fit, which is the rule build_floor1.mjs already follows for spaces -
     * and the line says so, because the build report is not shipped with the
     * document and Austin reads the document. */
    if (!APP_MEP_CATEGORY_ORDER.has(c)) {
      note = appendNote(note, 'CATEGORY NOTE: data/project.sqlite files this row under "' + c + '". The crew app ' +
        'knows five MEP bands (' + [...APP_MEP_CATEGORY_ORDER].join(', ') + '), so this line sorts AFTER all of ' +
        'them instead of beside the others of its trade. The category string is carried exactly as the database ' +
        'writes it and no row was relabeled to make it fit; widening the app\'s band list is Austin\'s call.');
      unknownBandLines.push(key + ' [' + c + '] ' + r.item_id);
    }

    /* A FLOOR-1 SHEET ON A FLOOR-2 ROOM, on a line built from the room's OWN
     * row. The citation is this room's own and the room's own row governs its
     * own citation, so NOTHING is removed here - the line simply says which
     * floor the sheet draws, so a crew member is not sent to it blind. */
    const ffRow = floorTrueCitation(src, roomFloor, rows, floorIdx, roomSheet, donorNo, roomNo);
    if (ffRow.changed) {
      if (ffRow.note) note = appendNote(note, ffRow.note);
      floorFixed.push(key + ' (own row): ' +
        [ffRow.ownKept.length ? "kept on this room's own row " + ffRow.ownKept.map((x) => x.split(' =')[0]).join(', ') : '',
          ffRow.wide.length ? 'kept (building-wide table) ' + ffRow.wide.map((x) => x.split(' =')[0]).join(', ') : '',
          ffRow.dropped.length ? ffRow.dropped.length + ' dropped (' + ffRow.dropped.flatMap((x) => x.ids).join(', ') + ')' : '',
        ].filter(Boolean).join('; '));
      if (ffRow.src !== src) die('room ' + roomNo + ': the floor pass changed the citation on ' + key +
        ", which is built from this room's OWN row - that must never happen");
    }

    /* An OPEN conflicts-table entry that names one of this row's MARKS. */
    const rowCodes = [r.tag].filter(Boolean);
    const rowIdsHere = [r.item_id];
    const onTag = conflictsOnLine(conflictHits, rowCodes, rowIdsHere);
    if (onTag.length) {
      const wasRel = reliability;
      reliability = 'FLAGGED';
      note = appendNote(note, onTag.map((h) => conflictOnLineText(h, rowCodes, wasRel, 'row', rowIdsHere)).join(' '));
      conflictLines.push(key + ' (' + (readableMarks(marksOf(rowCodes)).join(' + ') || r.item_id) + ' <- ' +
        onTag.map((h) => h.id + '[' + (markHitsFor(h, rowCodes).join(',') ||
          'cited by ' + rowHitsFor(h, rowIdsHere).join(',')) + ']').join(', ') + ')');
    }

    /* This document's SOURCE discipline reaches the own-row lines too. */
    note = appendNote(note, 'SOURCE. Every field on this line is data/project.sqlite room ' + roomNo +
      '\'s own row ' + r.item_id + ', verbatim - its tag, its label, its citation, its reliability and its note. ' +
      'The line exists so that a row the approved D10 condensed punch does not fold into any of its lines still ' +
      'reaches the crew on a line of its own.');

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
  report.mepRelFromOwn = relFromOwn.sort(cmpStr);
  report.mepFloorFixed = floorFixed.sort(cmpStr);
  report.mepBathFixed = bathFixed.sort(cmpStr);
  report.mepCitedMarkLines = citedMarkLines.sort(cmpStr);
  report.mepMarkFromOwn = markFromOwn.sort(cmpStr);
  report.mepTagAssertFixed = tagAssertFixed.sort(cmpStr);
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

/** The SOURCE sentence a ruled line carries, wherever it is built - by
 *  addRuledLines() on a room whose donor has no such line, or by the MEP donor
 *  loop on a room whose LIVE donor already carries it. One text, one place. */
function ruledSourceSentence(r, room) {
  return 'SOURCE. This line is a RULED LINE ADDITION: Austin ruling ' + r.ruling + ' put it on ' +
    (typeof r.applies === 'function'
      ? 'the rooms his ruling names - here, the accessible QQ Acc. keys - and room ' + room.room_no +
        ' is one of them (rooms.room_type "' + room.room_type + '", rooms.accessible ' + room.accessible + ')'
      : 'every guest room') +
    '. Its words, its tag, its count and its citation are the ruling\'s, and they are carried in the generator ' +
    '(RULED_LINE_ADDITIONS) byte-identically to the version build_floor1.mjs puts on the LIVE floor-1 rooms, ' +
    'which assertRecipeConstants() re-proves against that file on every run, so no rebuild can drop it and the ' +
    'two floors cannot drift apart. Its citation is still judged against data/project.sqlite\'s sheets table for ' +
    'this room\'s floor, and the line says what that pass did.';
}

/** D27, D28 and D29. Idempotent by key. A ruling with its own `applies`
 *  predicate fires only on the rooms build_floor1.mjs scopes it to - D29 is
 *  scoped to accessible QQ Acc. keys, so it lands on room 238 and nowhere else,
 *  and the scope decision is REPORTED for every room rather than being silent. */
function addRuledLines(doc, kind, room, report) {
  const added = [];
  for (const r of RULED_LINE_ADDITIONS) {
    if (r.doc !== kind) continue;
    if (typeof r.applies === 'function' && !r.applies(room)) {
      (report.ruledOutOfScope = report.ruledOutOfScope || []).push(r.ruling + '/' + r.key +
        ': out of scope for room ' + room.room_no + ' ("' + room.room_type + '", rooms.accessible ' +
        room.accessible + '); build_floor1.mjs scopes it the same way and this tool copies the predicate');
      continue;
    }
    if (doc.items[r.key]) continue;
    doc.items[r.key] = {
      code: r.code, label: r.label, category: r.category, qty: r.qty, sort: r.sort,
      src: r.src, reliability: 'HIGH',
      /* Same SOURCE discipline as every other line: a reader must be able to see
       * that this one comes from a RULING and not from a drawing. */
      instanceNote: endStop(r.note) + ' ' + ruledSourceSentence(r, room),
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
      /* meta.donorRule promises a SOURCE sentence on EVERY line. A promise the
       * build does not enforce is a promise that quietly stops being true, so
       * this is the enforcement: a line with no SOURCE sentence is not written. */
      if (!/(^|\s)SOURCE\./.test(String(it.instanceNote || ''))) {
        problems.push('doc ' + id + '/' + ik + ': no SOURCE sentence - meta.donorRule promises one on every line');
      }
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
    const { doc: ffe, room, rows } = buildFFEDoc(db, roomNo, live, conventionFor(convention, roomNo), stamp, report);
    const mep = buildMepDoc(db, roomNo, room, rows, live, ffe.floor, stamp, report,
      { typeLabel: ffe.typeLabel }, numbering, descSlots);
    report.ruledAdded = [...addRuledLines(ffe, 'ffe', room, report), ...addRuledLines(mep, 'mep', room, report)];
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
      generator: 'platform/tools/build_floor2.mjs',
      floor: Number(FLOOR),
      project: 'H2SEP - Home2 Suites by Hilton, Eagle Pass TX (Triun job 24030)',
      purpose: 'FLOOR ' + FLOOR + ' GUEST ROOMS AND COMMON AREAS, STAGED FOR AUSTIN\'S APPROVAL. Not live, not deployed. Every '
        + 'floor-' + FLOOR + ' key in data/project.sqlite rooms, FF&E and MEP, plus the floor-' + FLOOR + ' spaces (--spaces path). '
        + PROFILE.ask,
      workbookTab: WORKBOOK_F2 + ' prints ' + Object.entries(WORKBOOK_F2_COUNTS).map(([t, n]) => t + ' ' + n).join(', ') +
        (TAB_FACTS.mismatches.length
          ? '. DOES NOT RECONCILE with this floor\'s key mix: ' + TAB_FACTS.mismatches.join('; ') + '. Not used as evidence.'
          : '. Reconciled against this floor\'s key mix with no remainder: ' + TAB_FACTS.facts.join('; ')),
      builtAt: stamp,
      stampIsConstant: true,
      recipeSource: 'platform/tools/build_floor1.mjs - the reduction recipe is COPIED and proved byte-faithful '
        + 'on every run by assertRecipeByteFaithful(); this tool does not own the recipe',
      shapeSource: 'data/project.sqlite room_items (category gate + fold by (category, tag) + scoped ruled overrides)',
      packageSource: 'platform/data/floor1-staged.json (LIVE floor 1, READ ONLY) - curated text for SHARED tags only; '
        + 'a tag with no live counterpart ships from data/project.sqlite verbatim with its own reliability',
      donorRule: 'A DONOR MAY ENRICH, NEVER LAUNDER. The target room\'s own data/project.sqlite reliability and its '
        + 'own note govern every line, on BOTH documents. On the MEP document a condensed line is never read better '
        + 'than the WORST of the rows of THIS room that feed it, and every one of those rows that is not HIGH, or '
        + 'whose own note states a document conflict, is quoted on the line verbatim. On the FF&E document a donor '
        + 'raises a reliability only where its text carries a RULING that closes the flag for the PRODUCT (a model '
        + 'number, not a room), and the line says so in words; a folded line names EVERY row at its OWN reading, '
        + 'never the fold\'s worst against the whole list. The MARK is the target room\'s too: on the bathing lines '
        + 'and on the sprinkler line, where this room has rows of the donor\'s mark family the mark is read off '
        + 'them and where it has none the mark field is left EMPTY, and the donor\'s mark is quoted as not carried '
        + 'either way. Donor text that is a reading of the donor room\'s own drawing is dropped, quoted on the line '
        + 'as not carried - including a tag ASSERTION inside a citation, which is corrected to this room\'s own row. '
        + 'A NOTE NEVER RESTATES A VALUE ANOTHER FIELD CARRIES: it says why a reading is what it is, and the '
        + 'reliability and qty fields say what it is, so the two cannot disagree. Every line on both documents '
        + 'carries a SOURCE sentence naming which document each part of it came from; assertDocRules() refuses to '
        + 'write a line without one.',
      mepSource: 'the D10 condensed punch of the nearest LIVE type, re-cited onto this room\'s own sheet; '
        + 'rows no condensed line claims become their own lines and are never lost. Non-architectural citations are '
        + 're-pointed too: the sprinkler line\'s FP-series citation is a fact about the DONOR\'s floor and the two '
        + 'rooms the count was read on, so it is removed and replaced with PH-GU-001\'s own sheet list plus this '
        + 'room\'s floor. Where the room shares its donor\'s sheet, the citation stands verbatim except for the '
        + '".1" CONNECTING plan variant, which is dropped wherever rooms.connecting = 0.',
      citationRule: 'THE CITATION IS JUDGED IN FOUR PASSES, AND EVERY PASS WRITES ITS DECISION ONTO THE LINE. '
        + '(1) GUESTROOM SHEET: a donor view or keynote number survives the move to this room\'s sheet only where '
        + 'data/project.sqlite proves the two sheets share that numbering; what survives is then corroborated '
        + 'NUMBER BY NUMBER against EVERY row of this room; a number that walk matches is named with the row(s) '
        + 'that match it, and a number it does not reach is labelled UNVERIFIED for this room rather than asserted. '
        + 'Citing the same sheet, or the same '
        + 'number on another sheet, is not corroboration. (2) FLOOR: a sheet whose title in data/project.sqlite\'s '
        + 'sheets table names a floor that is not this room\'s is KEPT where this room\'s own row names it outright, '
        + 'or where the citation is a range that already spans this floor, or where the citation is to a '
        + 'building-wide table printed on it; RE-POINTED to the sibling sheet the sheets table proves covers this '
        + 'floor where this room\'s own row cites a range spanning both; and otherwise DROPPED, quoted verbatim as '
        + 'removed and replaced by that sibling cited with NO number on it, marked UNVERIFIED for this floor. '
        + '(3) BATHROOM: a bathroom enlargement sheet the sheets table draws for OTHER room types keeps its place '
        + 'while it carries no plan, view, elevation or keyed-note number, or while it is cited inside a range that '
        + 'also covers this type\'s own bath sheet; a placement number read on it is the donor room\'s reading of '
        + 'the donor room\'s own bath drawing, so the segment is dropped, quoted verbatim, and replaced by '
        + 'room_types.bath_sheet for THIS type with NO number on it, marked UNVERIFIED for this room type. On the '
        + 'FF&E document the same question is asked of room_items.primary_sheet, and where the row\'s own '
        + 'source_sheet carries the entry for this type that fuller citation is what the line cites. (4) MARKS: a '
        + 'mark asserted inside a citation is corrected to this room\'s own row, and a mark merely PRINTED by a '
        + 'cited schedule is left alone with this room\'s own marks in that family named beside it. NUMBERS ON '
        + 'SHEETS OUTSIDE THE GUESTROOM AND BATHROOM SET - E103 row numbers, P104 schedule rows, M401 details - are '
        + 'the approved line\'s and are NOT re-proved here; every MEP line says so in its SOURCE sentence.',
      donorMap: Object.fromEntries(Object.keys(REP_ROOMS).map((r) => [r, REP_ROOMS[r].donor])),
      roomTypes: Object.fromEntries(Object.keys(REP_ROOMS).map((r) => [r, REP_ROOMS[r].type])),
      typeKeys: Object.fromEntries(Object.keys(REP_ROOMS).map((r) => [r, REP_ROOMS[r].keys])),
      rulingsApplied: ['D12 (scoped)', 'D20 (scoped)',
        ...(FLOOR === '2' ? ['D22 (the eight plain Queen-Queen keys, 2nd Floor tab reconciled 11 = 8 + 1 + 2 and 2 = 2; '
          + 'handedness OPEN, reliability MEDIUM)',
          'D33 (Austin 2026-09-02: "ok retag 201, 230, 232 to GR-305 and 238 to GR-309"; handedness OPEN, reliability MEDIUM)'] : []),
        ...(FLOOR === '3' ? ['D35 (Austin 2026-09-02: "carry D22 and D33 up by room type on floor 3" - plain Queen-Queen, QQ Wide '
          + 'and QQ Extended take GR-305, QQ Acc. takes GR-309, the connecting key keeps GR-308; the 3rd Floor tab does not '
          + 'reconcile and is not the evidence; handedness OPEN, reliability MEDIUM)'] : []),
        ...(FLOOR === '4' ? ['D37 (Austin 2026-09-02: "carry D22, D33 and D35 up by room type on floor 4" - plain Queen-Queen and '
          + 'QQ Extended take GR-305, the three connecting keys keep GR-308, 438 keeps GR-307; the 4th Floor tab does not '
          + 'reconcile and is not the evidence; handedness OPEN, reliability MEDIUM)'] : []),
        'D27', 'D28', 'D29 (scoped to the accessible QQ Acc. keys)'],
      rulingsDeliberatelyNotApplied: [
        'D19 - scoped to room 118 only; the accessible keys carry BOTH bathing configurations, FLAGGED',
        ...(['2', '3', '4'].includes(FLOOR) ? [] : ['the working-wall rulings name floors 2, 3 and 4; every two-queen working wall on '
          + 'this floor ships as transcribed with the evidence in room note n_d22, OPEN for Austin']),
      ],
      conflictPolicy: 'document conflicts are CARRIED as FLAGGED lines and room notes quoting data/project.sqlite '
        + 'verbatim. Nothing is resolved by this tool. That includes the data/project.sqlite conflicts TABLE, and '
        + 'matching is done MARK BY MARK: every mark list - "SH-1 / SH-4", "L-2 / L-3 / L-4", "kn 28 / kn 5" - is '
        + 'split on "/" and "," on BOTH sides and matched one mark at a time, so an entry that names half of a '
        + 'pair names the line. A condensed line carries the marks of its own code AND of every data/project.sqlite '
        + 'row of this room folded into it, which is how the lavatory dispute reaches a line whose code is an em '
        + 'dash. An entry reaches THIS ROOM on three tests - a mark this room carries, a room key of this type, or '
        + 'a citation of the entry by id in one of this room\'s own rows - and every entry that reaches the room is '
        + 'in room note n_conflicts, which says for each one which test caught it. An entry reaches A LINE on two of '
        + 'those three: a mark the line carries, or a citation by id in one of the rows behind that line. Every '
        + 'entry that reaches a line is quoted on it, the line is FLAGGED, and the line says which test caught it. '
        + 'A ROOM KEY is a fact about the room and not about any one item, so a key-only match rides in n_conflicts '
        + 'and on no line. A gated-out row whose own note states a conflict rides in n_gategaps at ANY reliability - '
        + 'matched on the database\'s own conflict vocabulary, which n_gategaps prints from the matcher\'s own word '
        + 'list, OR on two sheet numbers set against each other in one sentence by "vs", "versus", "while", '
        + '"against" or "but" - because how well a row was read says nothing about whether the documents agree. An '
        + 'OPEN entry that prints an AREA for this room type rides as room note n_typearea and on no line, because '
        + 'an area is a fact about the type.',
      fieldState: 'built lines are born clean; platform/tools/carry_floor2.mjs then carries the crew\'s real work in '
        + 'under ruling D24 and overwrites this sentence with its exact reconciliation. A rebuild re-applies whatever '
        + 'field state the staged file already holds (preserveFieldState), so regenerating never zeroes the floor.',
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

  W('\n3. EVERY BUILT ROOM RE-DERIVES FROM THE DATABASE\n');
  for (const roomNo of Object.keys(REP_ROOMS)) {
    const doc = built.docs[roomNo];
    if (!doc) continue;
    const deltas0 = [];
    const { room, rows } = readRoom(db, roomNo);
    const corr = applyTagCorrectionsF2(roomNo, room, rows);
    resolveQtyOverrides(room, rows);
    const red = reduceFFE(roomNo, rows, conventionFor(convention, roomNo));
    const expect = new Map(red.lines.map((l) => [l.key, l]));
    /* A declared ruled difference that fails to appear is also a failure. */
    for (const c of corr) {
      if (!Object.values(doc.items).some((v) => v.code === c.to)) deltas0.push('ruling ' + c.ruling + ' declared ' + c.to + ' and the built doc has no such line');
      if (Object.values(doc.items).some((v) => v.code === c.from)) deltas0.push('ruling ' + c.ruling + ' retired ' + c.from + ' and the built doc still carries it');
    }
    const ruled = new Set(RULED_LINE_ADDITIONS.filter((r) => r.doc === 'ffe').map((r) => r.key));
    const deltas = deltas0.splice(0);
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
      const byId = keyOfDonorItem.get(r.item_id) || (!configOf(r) && MEP_VARIANT_SLOTS[r.item_id]);
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
  W('\nBUILD REPORT - floor ' + FLOOR + ', ' + reports.length + ' guest room(s), staged for approval\n' + '='.repeat(100) + '\n');
  W('recipe: ' + fid.exact + ' function(s) copied byte-identically from build_floor1.mjs, ' + fid.derived +
    ' derived by declared transform, all re-proved this run\n');
  W('sort convention measured off the approved slice for room ' + MEP_DONOR_ROOM + ': "' + convention.slice + '"; per donor: ' + JSON.stringify(convention.byDonor) + '\n');
  for (const d of donorProof) W('donor numbering: ' + d + '\n');
  W('product-identity slot map: ' + descSlots.size + ' donor row description(s) can place a row on a condensed line. ' +
    'CONFIGURATION A / CONFIGURATION B rows are excluded from this map on BOTH sides (' + descSlots.skippedConfig +
    ' on the donor side, and every one of them on the target side), so no bathing conflict can be auto-resolved into a slot.\n');
  for (const f of numbering.facts) W('sheet numbering: ' + f + '\n');

  for (const r of reports) {
    const spec = REP_ROOMS[r.room];
    W('\n' + '-'.repeat(100) + '\nROOM ' + r.room + '  ' + r.roomType + '  (' + spec.keys.length + ' key(s) of this type: ' + spec.keys.join(', ') + ')\n');
    W('  doc type ' + r.docType + ' / ' + JSON.stringify(r.docTypeLabel) + '   sheets: ' + spec.sheets + '\n');
    W('  FF&E : ' + r.ffeLines + ' lines   [' + r.rawRows + ' raw rows -> ' + r.gatedRows + ' gated -> ' +
      (r.ffeLines - r.ruledAdded.filter((x) => !x.startsWith('plmb_hotcold_a')).length) + ' after ' + r.foldedGroups +
      ' folds, + ' + r.ruledAdded.filter((x) => !x.startsWith('plmb_hotcold_a')).length + ' ruled FF&E line(s)]\n');
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
    for (const x of r.mepFloorFixed || []) W('      FLOOR-WRONG CITATION - ' + x + '\n');
    for (const x of r.mepRelFromOwn || []) W('      reliability from THIS room\'s own rows (never the donor\'s) - ' + x + '\n');
    for (const x of r.mepMarkFromOwn || []) W('      mark from THIS room\'s own rows - ' + x + '\n');
    for (const x of r.mepTagAssertFixed || []) W('      TAG ASSERTION corrected to THIS room\'s own row - ' + x + '\n');
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
    W('    APPLIED  ruled lines: ' + r.ruledAdded.join(', ') + '\n');
    for (const s of (r.ruledOutOfScope || [])) W('    DECLINED ' + s + '\n');
    if (r.ffeDeclinedLines && r.ffeDeclinedLines.length) {
      W('    the declined ruling is written ONTO the line so the note cannot contradict the number: ' +
        r.ffeDeclinedLines.join(', ') + '\n');
    }
    if (r.d22) W('    D22: ' + r.d22.summary + ' - see room note n_d22\n');
    if (r.correctedLines && r.correctedLines.length) W('    ruled TAG CORRECTION on ' + r.correctedLines.length + ' line(s): ' + r.correctedLines.join(', ') + '\n');

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
    if (r.fpOwn) W('    ' + r.fpOwn + '\n');
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

/* ==== VERBATIM from build_floor1.mjs - the common-area recipe (proved by assertRecipeByteFaithful) ==== */
const SPACE_ID_PREFIX = 'S';

const SPACE_MEP_SUFFIX = '-M';

const SPACE_ID_MAX = 8;

const SPACE_MEP_DOC_TYPE = 'space-mep-punch';

const SPACE_MULTIPLIER_RE = /(?:^|;\s*)(\d+) of (\d+)(?:\s*\([^)]*\))?$/;

const isSpaceDocId = (id) => !/^\d{3}(-MEP)?$/.test(id);

const spaceIdSlug = (spaceNo) => String(spaceNo).toUpperCase().replace(/[^A-Z0-9]/g, '');

const spaceDocId = (spaceNo) => SPACE_ID_PREFIX + spaceIdSlug(spaceNo);

const spaceMepDocId = (spaceNo) => spaceDocId(spaceNo) + SPACE_MEP_SUFFIX;

const spaceTypeSlug = (name) => 'space-' + typeSlug(name);

function readSpaceList(db, floor = '1') {
  const rows = db.prepare(
    'SELECT space_no, name, note, primary_sheet, source_sheet FROM spaces WHERE floor = ? ORDER BY space_no'
  ).all(floor);
  if (!rows.length) die('no spaces on floor ' + floor);
  return rows;
}

function readSpace(db, spaceNo, floor = '1') {
  const space = db.prepare(
    'SELECT space_no, name, note, primary_sheet, source_sheet, floor FROM spaces WHERE floor = ? AND space_no = ?'
  ).get(floor, spaceNo);
  if (!space) die('space ' + JSON.stringify(spaceNo) + ' does not exist on floor ' + floor);
  const rows = db.prepare(
    'SELECT rowid AS rowid, space_no, space_name, category, tag, description, instance_note, note,' +
    '       trade_responsible, source_sheet, primary_sheet, reliability, derived' +
    '  FROM space_items WHERE floor = ? AND space_no = ? ORDER BY rowid'
  ).all(floor, spaceNo);
  return { space, rows };
}

function reduceSpaceBand(spaceNo, rows, band) {
  const gate = band === 'ffe' ? GATE_CATEGORIES : MEP_CATEGORIES;
  const orderIndex = band === 'ffe' ? CATEGORY_INDEX : SPACE_MEP_INDEX;
  const bandName = band === 'ffe' ? 'FF&E' : 'MEP';

  /* STEP 1 - category gate. */
  const kept = rows.filter((r) => gate.has(r.category));
  if (!kept.length) return { lines: [], keptRows: 0, foldedGroups: 0, splitGroups: [], qtyUnknown: [] };

  /* STEP 2 + 4 - fold tagged rows by (category, tag, source_sheet); untagged
   * rows never fold. See note (b) above for why source_sheet is in the key. */
  const groups = [];
  const byKey = new Map();
  const bySheetlessKey = new Map();   // (category, tag) -> groups, to detect splits
  const untaggedOcc = new Map();
  for (const r of kept) {
    const tag = r.tag || '';
    if (tag) {
      const sheet = r.source_sheet || '';
      const gk = r.category + SEP + tag + SEP + sheet;
      let g = byKey.get(gk);
      if (!g) {
        g = { tag, category: r.category, sheet, rows: [], first: r };
        byKey.set(gk, g);
        groups.push(g);
        const sk = r.category + SEP + tag;
        if (!bySheetlessKey.has(sk)) bySheetlessKey.set(sk, []);
        bySheetlessKey.get(sk).push(g);
      }
      g.rows.push(r);
    } else {
      const tk = r.category + SEP + r.description + SEP + (r.instance_note || '');
      const occ = (untaggedOcc.get(tk) || 0) + 1;
      untaggedOcc.set(tk, occ);
      groups.push({ tag: '', category: r.category, sheet: r.source_sheet || '', rows: [r], first: r, untaggedOcc: occ });
    }
  }

  /* Report the groups the source_sheet key split apart - each one is a live
   * sheet-versus-sheet disagreement that this tool refuses to resolve. */
  const splitGroups = [];
  for (const [sk, gs] of bySheetlessKey) {
    if (gs.length < 2) continue;
    const [category, tag] = sk.split(SEP);
    splitGroups.push({
      category, tag,
      parts: gs.map((g) => ({ sheet: g.sheet, rows: g.rows.length })),
    });
  }

  /* STEP 6 - keys, occurrence counted per raw tag across the band. */
  const tagOcc = new Map();
  for (const g of groups) {
    if (g.tag) {
      const n = (tagOcc.get(g.tag) || 0) + 1;
      tagOcc.set(g.tag, n);
      const slug = tagSlug(g.tag);
      if (!slug) {
        die('space ' + spaceNo + ' (' + bandName + '): tag ' + JSON.stringify(g.tag) +
            ' slugs to an empty string - refusing to emit a line with no stable key');
      }
      g.key = slug + '_' + occSuffix(n);
    } else {
      const basis = g.category + '|' + g.first.description + '|' + (g.first.instance_note || '') + '|' + g.untaggedOcc;
      g.key = 'u_' + md5(basis).slice(0, 10);
    }
  }

  const catIdx = (c) => {
    if (!orderIndex.has(c)) {
      die('space ' + spaceNo + ' (' + bandName + '): category ' + JSON.stringify(c) + ' has no band position');
    }
    return orderIndex.get(c);
  };

  const ordered = groups.slice().sort((a, b) => {
    const d = catIdx(a.category) - catIdx(b.category);
    if (d) return d;
    const at = a.tag === '' ? 1 : 0, bt = b.tag === '' ? 1 : 0;
    if (at !== bt) return at - bt;
    if (a.tag !== b.tag) return cmpStr(a.tag, b.tag);
    /* Base rows before delta rows: the earlier rowid is the base set. */
    return a.first.rowid - b.first.rowid;
  });

  /* STEP 3 + 5 - quantity and sort band. */
  const lines = [];
  const seen = new Set();
  const qtyUnknown = [];
  let prevCat = null, ordinal = 0, foldedGroups = 0;

  for (const g of ordered) {
    if (g.category !== prevCat) { prevCat = g.category; ordinal = 0; } else ordinal++;
    if (g.rows.length > 1) foldedGroups++;

    if (seen.has(g.key)) die('space ' + spaceNo + ' (' + bandName + '): key collision ' + JSON.stringify(g.key));
    if (!/^[a-z0-9_]{1,40}$/.test(g.key)) {
      die('space ' + spaceNo + ' (' + bandName + '): key ' + JSON.stringify(g.key) + ' violates ^[a-z0-9_]{1,40}$');
    }
    seen.add(g.key);

    /* Note (c): a FLAGGED group whose own note says no count is printed gets NO
     * qty at all. Everything else is folded row count.
     *
     * This deliberately does NOT require the group to be a single row. S017
     * Open Storage tag 404 STORAGE SHELVING is two FLAGGED rows whose own note
     * reads "A510.3 shows two TAG GROUPS, not two counted units. Quantity
     * within each group is not printed." Folding those two rows into qty 2 put
     * a unit count on the line that no sheet states. A row count is not a
     * quantity when the database says the rows are tag groups. */
    const note = g.first.note || '';
    const groupNotes = g.rows.map((r) => r.note || '');
    const countIsUnknown = g.rows.every((r) => r.reliability === 'FLAGGED')
      && groupNotes.some((n) => SPACE_NO_COUNT_RE.test(n));
    if (countIsUnknown) qtyUnknown.push((g.tag || '<untagged>') + ' [' + g.category + ']');

    /* MEP band keeps the approved 1xxx..5xxx numbering (offset 10), FF&E band
     * keeps the guest-room recipe's (idx+1)*1000 + ordinal*10. */
    const sort = band === 'mep'
      ? (catIdx(g.category) + 1) * 1000 + 10 + ordinal
      : (catIdx(g.category) + 1) * 1000 + ordinal * 10;

    lines.push({
      key: g.key,
      code: g.tag,
      category: g.category,
      qty: countIsUnknown ? undefined : g.rows.length,
      qtyUnknown: countIsUnknown,
      sort,
      rawRows: g.rows.length,
      sheet: g.sheet,
      sqlite: {
        label: g.first.description,
        src: g.first.primary_sheet || g.first.source_sheet || '',
        reliability: g.first.reliability,
        instanceNote: g.first.instance_note || '',
        note,
        trade: g.first.trade_responsible || '',
        derived: g.first.derived,
      },
    });
  }

  return { lines, keptRows: kept.length, foldedGroups, splitGroups, qtyUnknown };
}

function assertSpaceMultipliers(db, floor = '1') {
  const spaces = readSpaceList(db, floor);
  const bad = [];
  let groupsChecked = 0, multipliersChecked = 0;
  for (const s of spaces) {
    const { rows } = readSpace(db, s.space_no, floor);
    for (const band of ['ffe', 'mep']) {
      const gate = band === 'ffe' ? GATE_CATEGORIES : MEP_CATEGORIES;
      const byKey = new Map();
      for (const r of rows) {
        if (!gate.has(r.category) || !r.tag) continue;
        const gk = r.category + SEP + r.tag + SEP + (r.source_sheet || '');
        if (!byKey.has(gk)) byKey.set(gk, []);
        byKey.get(gk).push(r);
      }
      for (const [gk, arr] of byKey) {
        groupsChecked++;
        let m = null;
        for (const r of arr) {
          const x = SPACE_MULTIPLIER_RE.exec(r.instance_note || '');
          if (x) m = x;
        }
        if (!m) continue;
        multipliersChecked++;
        if (Number(m[2]) !== arr.length) {
          bad.push('space ' + s.space_no + ' ' + gk.split(SEP).join(' / ') +
            ': sheet says ' + m[2] + ', ' + arr.length + ' row(s) folded');
        }
      }
    }
  }
  if (bad.length) {
    die('the space fold key does NOT reproduce the documented multipliers - refusing to build:\n  ' +
        bad.join('\n  '));
  }
  return { groupsChecked, multipliersChecked };
}

function assertSpaceIds(db, spaces) {
  const seen = new Map();
  const problems = [];
  const roomNos = new Set(db.prepare('SELECT room_no FROM rooms').all().map((r) => r.room_no));
  for (const s of spaces) {
    for (const id of [spaceDocId(s.space_no), spaceMepDocId(s.space_no)]) {
      if (id.length > SPACE_ID_MAX) {
        problems.push('doc id ' + JSON.stringify(id) + ' is ' + id.length +
          ' chars, over the published rule d.number.size() <= ' + SPACE_ID_MAX);
      }
      if (!/^[A-Z0-9-]+$/.test(id)) problems.push('doc id ' + JSON.stringify(id) + ' has unexpected characters');
      if (seen.has(id)) {
        problems.push('doc id ' + JSON.stringify(id) + ' generated for both space ' +
          seen.get(id) + ' and space ' + s.space_no);
      }
      seen.set(id, s.space_no);
      if (roomNos.has(id)) problems.push('doc id ' + JSON.stringify(id) + ' collides with guest room ' + id);
    }
  }
  if (problems.length) die('space doc id scheme is not sound:\n  ' + problems.join('\n  '));
  let longest = '';
  for (const id of seen.keys()) if (id.length > longest.length) longest = id;
  return { count: seen.size, longest };
}

function spaceGateDrops(db, floor = '1') {
  const spaces = readSpaceList(db, floor);
  const byCategory = new Map();
  const bySpace = new Map();
  let total = 0;
  for (const s of spaces) {
    const { rows } = readSpace(db, s.space_no, floor);
    for (const r of rows) {
      if (GATE_CATEGORIES.has(r.category) || MEP_CATEGORIES.has(r.category)) continue;
      total++;
      byCategory.set(r.category, (byCategory.get(r.category) || 0) + 1);
      if (!bySpace.has(s.space_no)) bySpace.set(s.space_no, { name: s.name, n: 0, cats: new Map() });
      const e = bySpace.get(s.space_no);
      e.n++;
      e.cats.set(r.category, (e.cats.get(r.category) || 0) + 1);
    }
  }
  return { total, byCategory, bySpace };
}

function spaceUnknownMepCategories(db, floor = '1') {
  const out = new Map();
  for (const r of db.prepare("SELECT space_no, category, COUNT(*) c FROM space_items WHERE floor = ? GROUP BY space_no, category").all(floor)) {
    if (!MEP_CATEGORIES.has(r.category) || APP_MEP_CATEGORY_ORDER.has(r.category)) continue;
    if (!out.has(r.category)) out.set(r.category, []);
    out.get(r.category).push(r.space_no + ' x' + r.c);
  }
  return out;
}

function spaceDuplicateTags(db, floor = '1') {
  const rows = db.prepare(
    'SELECT space_no, space_name, item_id, category, tag, description, note, reliability,' +
    '       source_sheet, primary_sheet' +
    '  FROM space_items WHERE floor = ? AND tag IS NOT NULL AND tag != \'\' ORDER BY space_no, rowid'
  ).all(floor);

  const byTag = new Map();
  for (const r of rows) {
    if (!GATE_CATEGORIES.has(r.category) && !MEP_CATEGORIES.has(r.category)) continue;
    if (!byTag.has(r.tag)) byTag.set(r.tag, []);
    byTag.get(r.tag).push(r);
  }

  const out = new Map();
  for (const [tag, all] of byTag) {
    const spaces = [...new Set(all.map((r) => r.space_no))];
    if (spaces.length < 2) continue;
    /* Same sheet, and the rows themselves cross-reference each other. */
    const sheets = new Set(all.map((r) => r.primary_sheet || ''));
    const crossRefs = all.filter((r) => /also tagged at/i.test(String(r.note || '')));
    if (sheets.size !== 1 || crossRefs.length < 2) continue;
    /* Conflicting answers: the records disagree on reliability or wording. */
    const answers = new Set(all.map((r) => r.reliability + '|' + r.description));
    if (answers.size < 2) continue;

    /* WHERE the one surviving line sits is decided by the DATABASE'S OWN words,
     * not by a coin flip: a record whose description says "... also tagged at
     * X" is marking itself as the secondary transcription of a tag that lives
     * somewhere else. If exactly one record is the plain one, it carries the
     * line. If nothing distinguishes them, the lowest-numbered space does, and
     * the note says so. Either way the ANSWER - which room, how many - is left
     * open for Austin; only the placement of the single line is settled. */
    const primary = all.filter((r) => !/also tagged at/i.test(String(r.description || '')));
    const primarySpaces = [...new Set(primary.map((r) => r.space_no))];
    const decided = primarySpaces.length === 1;
    const keep = decided ? primarySpaces[0] : spaces.slice().sort(cmpStr)[0];
    const keepWhy = decided
      ? 'It is listed on ' + spaceDocId(keep) + ' because every OTHER record of this tag describes itself as '
        + '"also tagged at ..." - the database marks those as secondary transcriptions of a tag that lives here.'
      : 'No record distinguishes itself, so it is listed on ' + spaceDocId(keep) +
        ', the lowest-numbered space that carries it. That placement is arbitrary and is NOT a ruling.';
    out.set(tag, {
      keep,
      keepWhy,
      spaces: spaces.slice().sort(cmpStr),
      sheet: [...sheets][0],
      positions: all.map((r) => ({
        space: r.space_no, name: r.space_name, itemId: r.item_id,
        reliability: r.reliability, description: r.description,
        src: r.source_sheet || r.primary_sheet || '', note: r.note || '',
      })),
    });
  }
  return out;
}

function duplicateConflictText(tag, dup) {
  const parts = dup.positions.map((p) =>
    p.name + ' ' + p.space + ' (' + p.itemId + ', reliability ' + p.reliability + '): "' +
    p.description + '" — ' + p.src + (p.note ? ' — note: "' + p.note + '"' : ''));
  return 'UNRESOLVED DUPLICATE. ' + tag + ' is recorded ' + dup.positions.length +
    ' times in data/project.sqlite, all on ' + (dup.sheet || 'the same sheet') +
    ', with conflicting answers. This tool does not pick a winner and does not sum them. ' +
    'The recorded positions are: ' + parts.join('  ||  ') + '. ' +
    'The line is emitted ONCE, with NO quantity and reliability FLAGGED. ' + dup.keepWhy + ' ' +
    'OPEN for Austin: which space carries it, and how many there are.';
}

function buildSpaceBandDoc(space, band, red, stamp, dups, report, docIdOverride) {
  const isMep = band === 'mep';
  const docId = docIdOverride || (isMep ? spaceMepDocId(space.space_no) : spaceDocId(space.space_no));
  const items = {};
  const notes = {};

  for (const line of red.lines) {
    if (!line.sqlite.src) {
      die('space ' + space.space_no + ' line ' + line.key + ' (' + (line.code || '<untagged>') +
          '): no primary_sheet and no source_sheet in sqlite - refusing to emit an uncited line');
    }

    /* An unresolved cross-space duplicate is emitted once, and only once. */
    const dup = line.code ? (dups && dups.get(line.code)) : null;
    if (dup && dup.keep !== space.space_no) {
      notes['n_dup_' + tagSlug(line.code)] =
        { text: 'NOT LISTED HERE ON PURPOSE. ' + duplicateConflictText(line.code, dup) +
                ' It is carried on doc ' + spaceDocId(dup.keep) + ' only, so the seed cannot imply two of them.',
          flag: 'info', resolved: false, createdAt: stamp, by: '' };
      if (report) report.dupSuppressed.push(line.code + ' suppressed on ' + docId + ' (kept on ' + spaceDocId(dup.keep) + ')');
      continue;
    }

    /* instanceNote carries the database's own text, verbatim. The flag prefix
     * mirrors the shape the approved MEDIUM guest-room lines already use.
     * Where the count is unknown, the DB's own explanation of WHY is what gets
     * shown, so a crew member reading the line sees the reason, not a blank. */
    const parts = [];
    if (line.sqlite.instanceNote) parts.push(line.sqlite.instanceNote);
    if (line.qtyUnknown && line.sqlite.note) {
      parts.push('QTY NOT STATED' +
        (line.rawRows > 1 ? ' (' + line.rawRows + ' source rows folded here, but no sheet prints a unit count)' : '') +
        ' - ' + line.sqlite.note);
    }
    else if (line.sqlite.note && line.sqlite.reliability !== 'HIGH') parts.push(line.sqlite.note);
    let instanceNote = parts.join(' — ');
    if (instanceNote && line.sqlite.reliability !== 'HIGH') instanceNote = '⚑ ' + instanceNote;

    const item = {
      code: line.code,
      label: line.sqlite.label,
      category: line.category,
      src: line.sqlite.src,
      reliability: line.sqlite.reliability,
      instanceNote,
      trade: line.sqlite.trade,
      derived: line.sqlite.derived,
      sort: line.sort,
      deleted: false,
      checked: CLEAN_FIELD_STATE.checked,
      initials: CLEAN_FIELD_STATE.initials,
      checkedAt: CLEAN_FIELD_STATE.checkedAt,
      checkedAtLocal: CLEAN_FIELD_STATE.checkedAtLocal,
      issue: CLEAN_FIELD_STATE.issue,
      issueResolved: CLEAN_FIELD_STATE.issueResolved,
    };
    /* Note (c): omitted entirely, not null and not 1, when no sheet states it. */
    if (!line.qtyUnknown) item.qty = line.qty;

    if (dup) {
      /* Do not pick a winner: FLAGGED, no quantity, conflict in the note. */
      delete item.qty;
      item.reliability = 'FLAGGED';
      item.instanceNote = '⚑ ' + duplicateConflictText(line.code, dup);
      if (report) report.dupKept.push(line.code + ' emitted once on ' + docId + ' (recorded in spaces ' + dup.spaces.join(', ') + ')');
    }
    items[line.key] = item;
  }

  return {
    number: docId,
    floor: Number.parseInt(space.floor, 10),
    type: isMep ? SPACE_MEP_DOC_TYPE : spaceTypeSlug(space.name),
    /* The sheet's own name for the room, off A100 (or ID-1.9 / ID-1.7 for the
     * two exterior zones). Not authored here. */
    typeLabel: space.name,
    schemaV: 3,
    items,
    notes,
    deleted: false,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

const SPACE_NO_COUNT_RE =
  /no multiplier|count not stated|no count printed|not stated on any sheet|neither the window count|quantity flagged|no count/i;

/* ===========================================================================
 * FLOOR-2 COMMON AREAS ("--spaces" path). The recipe above is build_floor1's,
 * byte for byte; this driver is the floor-2 orchestration: which spaces, the
 * honest report, and the merge into the same staged file the room path writes.
 * A space with no line under Austin's approved gate gets NO document, and is
 * listed, exactly as floor 1 did it (D18 numbering: the plan's own numbers).
 * =========================================================================== */
function mainSpaces2(db, positional, opts, before) {
  const all = readSpaceList(db, FLOOR);
  const byNo = new Map(all.map((s) => [s.space_no, s]));
  let wanted;
  if (!positional.length || (positional.length === 1 && positional[0] === 'all')) {
    wanted = all.slice();
  } else {
    wanted = [];
    for (const a of positional) {
      const s = byNo.get(a) || byNo.get(a.toUpperCase());
      if (!s) die('space ' + JSON.stringify(a) + ' is not a floor-' + FLOOR + ' space. Known: ' + all.map((x) => x.space_no).join(', '));
      wanted.push(s);
    }
  }
  const mult = assertSpaceMultipliers(db, FLOOR);
  const ids = assertSpaceIds(db, all);
  const drops = spaceGateDrops(db, FLOOR);
  const dups = spaceDuplicateTags(db, FLOOR);
  const dupReport = { dupKept: [], dupSuppressed: [] };
  const unknownMep = spaceUnknownMepCategories(db, FLOOR);

  const W = process.stdout.write.bind(process.stdout);
  W('\nFLOOR-' + FLOOR + ' COMMON AREAS  (Austin ruling D18 - PLAN numbering from the architectural set)\n');
  W('='.repeat(100) + '\n');
  W('spaces on floor ' + FLOOR + ' in data/project.sqlite: ' + all.length + '  (verified against the DB, not the brief)\n');
  W('doc id scheme: ' + JSON.stringify(SPACE_ID_PREFIX + '<space_no minus punctuation>') + ', MEP companion ' +
    JSON.stringify(SPACE_MEP_SUFFIX) + ' - ' + ids.count + ' ids, longest ' + JSON.stringify(ids.longest) +
    ' (' + ids.longest.length + ' chars, limit ' + SPACE_ID_MAX + ')\n');
  W('fold key proved: ' + mult.multipliersChecked + ' documented "N of M" multipliers across ' +
    mult.groupsChecked + ' gated tag groups, all equal to their folded row count\n');

  const built = [], skipped = [], rows = [], allSplits = [], mepOnlySpaces = [];
  let totalFfe = 0, totalMep = 0, totalUnknownQty = 0;
  const docs = {};
  for (const s of wanted) {
    const { space, rows: raw } = readSpace(db, s.space_no, FLOOR);
    const ffe = reduceSpaceBand(s.space_no, raw, 'ffe');
    const mep = reduceSpaceBand(s.space_no, raw, 'mep');
    const droppedHere = drops.bySpace.get(s.space_no);
    const dropped = droppedHere ? droppedHere.n : 0;
    rows.push({ no: s.space_no, name: s.name, raw: raw.length, ffe: ffe.lines.length, mep: mep.lines.length,
      unknownQty: ffe.qtyUnknown.length + mep.qtyUnknown.length, dropped, docId: spaceDocId(s.space_no) });
    for (const sp of [...ffe.splitGroups, ...mep.splitGroups]) allSplits.push({ space: s.space_no, ...sp });
    if (!ffe.lines.length && !mep.lines.length) {
      skipped.push({ no: s.space_no, name: s.name, raw: raw.length, dropped,
        cats: droppedHere ? [...droppedHere.cats].map(([c, n]) => c + ' x' + n).sort(cmpStr) : [] });
      continue;
    }
    if (ffe.lines.length) {
      const doc = buildSpaceBandDoc(space, 'ffe', ffe, opts.stamp, dups, dupReport);
      docs[spaceDocId(s.space_no)] = doc;
      totalFfe += Object.keys(doc.items).length;
    }
    if (mep.lines.length) {
      /* An MEP-only space owns the PARENT id outright, so it is reachable in the app. */
      const mepOnly = !ffe.lines.length;
      const id = mepOnly ? spaceDocId(s.space_no) : spaceMepDocId(s.space_no);
      const doc = buildSpaceBandDoc(space, 'mep', mep, opts.stamp, dups, dupReport, mepOnly ? id : undefined);
      docs[id] = doc;
      totalMep += Object.keys(doc.items).length;
      if (mepOnly) mepOnlySpaces.push(s.space_no + ' ' + s.name + ' -> ' + id + ' (' + mep.lines.length + ' line(s), no FF&E band)');
    }
    totalUnknownQty += ffe.qtyUnknown.length + mep.qtyUnknown.length;
    built.push({ no: s.space_no, name: s.name, ffe: ffe.lines.length, mep: mep.lines.length, qtyUnknown: [...ffe.qtyUnknown, ...mep.qtyUnknown] });
  }

  W('\nPER-SPACE LINE COUNTS\n' + '-'.repeat(100) + '\n');
  W('  no     name                              raw   FF&E    MEP  qty?  gated-out   doc id\n');
  for (const r of rows) {
    const thin = (r.ffe + r.mep) === 0 ? '  <- NO PACKAGE' : ((r.ffe + r.mep) <= 2 ? '  <- thin' : '');
    W('  ' + r.no.padEnd(7) + r.name.slice(0, 33).padEnd(34) + String(r.raw).padStart(4) + String(r.ffe).padStart(7) +
      String(r.mep).padStart(7) + String(r.unknownQty).padStart(6) + String(r.dropped).padStart(11) + '   ' + r.docId.padEnd(7) + thin + '\n');
  }
  W('-'.repeat(100) + '\n');
  W('  TOTAL  ' + rows.length + ' spaces' + String(rows.reduce((n, r) => n + r.raw, 0)).padStart(29) +
    String(totalFfe).padStart(7) + String(totalMep).padStart(7) + String(totalUnknownQty).padStart(6) + String(drops.total).padStart(11) + '\n');
  if (skipped.length) {
    W('\nSPACES WITH NO PACKAGE UNDER THE APPROVED GATE - NO DOC WRITTEN (' + skipped.length + ')\n' + '-'.repeat(100) + '\n');
    for (const s of skipped) {
      W('  ' + s.no.padEnd(7) + s.name.padEnd(30) + s.raw + ' documented row(s), all gated out: ' +
        (s.cats.join(', ') || 'none - the space has no rows at all') + '\n');
    }
  }
  if (mepOnlySpaces.length) {
    W('\nMEP-ONLY SPACES (own the parent id so the app can reach them)\n' + '-'.repeat(100) + '\n');
    for (const x of mepOnlySpaces) W('  ' + x + '\n');
  }
  const thin = built.filter((b) => (b.ffe + b.mep) <= 2);
  if (thin.length) {
    W('\nTHIN PACKAGES - BUILT, BUT 1-2 LINES ONLY (' + thin.length + ')\n' + '-'.repeat(100) + '\n');
    for (const b of thin) W('  ' + b.no.padEnd(7) + b.name.padEnd(30) + b.ffe + ' FF&E + ' + b.mep + ' MEP\n');
  }
  if (totalUnknownQty) {
    W('\nLINES EMITTED WITH NO QUANTITY - no sheet in the set states a count (' + totalUnknownQty + ')\n' + '-'.repeat(100) + '\n');
    for (const b of built) if (b.qtyUnknown.length) W('  ' + b.no.padEnd(7) + b.name.padEnd(28) + b.qtyUnknown.join(', ') + '\n');
    W('  (qty is OMITTED from these lines, not defaulted to 1. The reason is written into instanceNote.)\n');
  }
  if (dups.size) {
    W('\nUNRESOLVED CROSS-SPACE DUPLICATE TAGS - emitted ONCE, no quantity, no winner picked (' + dups.size + ')\n' + '-'.repeat(100) + '\n');
    for (const [tag, d] of dups) W('  ' + tag + '  recorded in space(s) ' + d.spaces.join(', ') + ' on ' + d.sheet + ' -> kept on ' + spaceDocId(d.keep) + '\n');
    for (const x of dupReport.dupKept) W('  ' + x + '\n');
    for (const x of dupReport.dupSuppressed) W('  ' + x + '\n');
  }
  if (allSplits.length) {
    W('\nUNRESOLVED SHEET-VS-SHEET COUNT CONFLICTS - carried as separate lines, NOT summed (' + allSplits.length + ')\n' + '-'.repeat(100) + '\n');
    for (const s of allSplits) {
      W('  space ' + s.space + '  ' + s.tag + ' [' + s.category + ']\n');
      for (const p of s.parts) W('      ' + String(p.rows).padStart(3) + ' row(s)  <-  ' + JSON.stringify(p.sheet) + '\n');
    }
  }
  W('\nROWS THE APPROVED CATEGORY GATE KEEPS OUT OF BOTH DOCS (' + drops.total + ' of ' + rows.reduce((n, r) => n + r.raw, 0) + ')\n' + '-'.repeat(100) + '\n');
  for (const [c, n] of [...drops.byCategory].sort((a, b) => b[1] - a[1])) W('  ' + String(n).padStart(4) + '  ' + c + '\n');
  W('  These categories appear in NEITHER approved guest-room doc, so following Austin\'s approved precedent puts\n' +
    '  them nowhere. For a common area they are the substance of a finish walk. OPEN for Austin (same as floor 1):\n' +
    '  widen the gate for spaces, or leave them out.\n');
  if (unknownMep.size) {
    W('\nMEP CATEGORIES THE APP DOES NOT KNOW\n' + '-'.repeat(100) + '\n');
    for (const [c, where] of unknownMep) W('  ' + c + ' (' + where.join(', ') + ') is not in the app\'s MEP band list - it will sort last.\n');
  }
  if (opts.reportOnly) { W('\n--spaces-report: analysis only. Nothing written.\n\n'); return; }

  /* Merge into the staged file: room docs and untouched space docs carried forward. */
  const prev = existsSync(OUT_PATH) ? JSON.parse(readFileSync(OUT_PATH, 'utf8')) : { meta: {}, docs: {} };
  const outDocs = {};
  const rebuiltIds = new Set(wanted.flatMap((s) => [spaceDocId(s.space_no), spaceMepDocId(s.space_no)]));
  for (const [k, v] of Object.entries(prev.docs || {})) if (!rebuiltIds.has(k)) outDocs[k] = v;
  for (const [k, v] of Object.entries(docs)) outDocs[k] = v;
  for (const [id, d] of Object.entries(outDocs)) {
    if (!Object.keys(d.items || {}).length) die('doc ' + JSON.stringify(id) + ' would be written with ZERO lines. Refusing.');
    if (d.number !== id) die('doc ' + JSON.stringify(id) + ' has number ' + JSON.stringify(d.number) + ' - number must equal docId');
    if (String(id).length > SPACE_ID_MAX) die('doc id ' + JSON.stringify(id) + ' exceeds ' + SPACE_ID_MAX + ' characters');
  }
  const out = {
    meta: {
      ...(prev.meta || {}),
      spaceGenerator: 'platform/tools/build_floor2.mjs --spaces (recipe copied byte-for-byte from build_floor1.mjs)',
      spaceNumbering: 'PLAN numbering from the architectural set (Austin ruling D18); data/project.sqlite spaces table, floor ' + FLOOR + '.',
      spaceShapeSource: 'data/project.sqlite space_items (category gate + fold by category/tag/source_sheet)',
      spacePackageSource: 'data/project.sqlite space_items columns verbatim - no approved common-area doc exists to copy from',
      spaceIdScheme: "'S' + space_no with non-alphanumerics stripped; MEP companion suffix '-M'; every id <= " + SPACE_ID_MAX + ' chars and number == docId',
      spaceQtyPolicy: 'qty is the number of folded rows; it is OMITTED (not defaulted to 1) where no sheet states a count',
      spaceDocs: Object.keys(outDocs).filter((k) => isSpaceDocId(k)).sort(cmpDocId),
      spacesWithNoPackage: skipped.map((s) => s.no + ' ' + s.name),
      stagedDocs: Object.keys(outDocs).sort(cmpDocId),
    },
    docs: Object.fromEntries(Object.keys(outDocs).sort(cmpDocId).map((k) => [k, outDocs[k]])),
  };
  writeFileSync(OUT_PATH, stringify(out), 'utf8');
  const after = snapshotProtectedFiles();
  if (stringify(before) !== stringify(after)) die('a protected file changed during this run - that must never happen');
  W('\n' + '='.repeat(100) + '\n');
  W('wrote ' + OUT_PATH.replace(REPO + '/', '') + ': ' + Object.keys(docs).length + ' space doc(s) written, ' +
    (Object.keys(outDocs).length - Object.keys(docs).length) + ' doc(s) carried forward untouched\n');
  W('  ' + built.length + ' of ' + wanted.length + ' spaces built (' + totalFfe + ' FF&E lines + ' + totalMep +
    ' MEP lines), ' + skipped.length + ' refused for having no gated line\n');
  W('FLOOR ' + FLOOR + ' STAGED FOR APPROVAL. NOT LIVE. Firestore not touched. Nothing pushed. Nothing deployed.\n\n');
}

function main(argv) {
  const args = argv.slice(2);
  let stamp = DEFAULT_STAMP, wantSelftest = false, verifyDet = false, partial = false;
  let spacesMode = false, spacesReportOnly = false;
  const positional = [];
  for (const a of args) {
    if (a === '--selftest') { wantSelftest = true; continue; }
    if (a === '--spaces') { spacesMode = true; continue; }
    if (a === '--spaces-report') { spacesMode = true; spacesReportOnly = true; continue; }
    if (a === '--verify-determinism') { verifyDet = true; continue; }
    if (a === '--partial') { partial = true; continue; }
    if (a.startsWith('--floor=')) continue;   /* read at module load; see FLOOR */
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
  const before = snapshotProtectedFiles();
  const fid = assertRecipeByteFaithful();
  assertRecipeConstants();

  const db = openDb();
  const slice = loadSlice();
  const live = loadDonorFile();
  const floorRooms = loadRoomTable(db);
  const d22counts = assertTagCorrectionCountsF2(db);

  /* Common-area path. Entirely separate from the guest-room path: it never
   * rebuilds a room doc, and the room path never rebuilds a space. */
  if (spacesMode) return mainSpaces2(db, positional, { stamp, reportOnly: spacesReportOnly }, before);

  const rooms = positional.length ? positional : floorRooms.slice();
  for (const r of rooms) {
    if (!REP_ROOMS[r]) {
      die('room ' + JSON.stringify(r) + ' is not a floor-' + FLOOR + ' guest room (' +
          floorRooms.join(', ') + '). This tool builds those and nothing else.');
    }
  }

  /* Everything the build leans on, re-proved from the database first. */
  assertMepConstant(slice);
  assertDerivationRules(db, slice);
  assertMepCondensationCovers(db, slice);
  const numbering = assertSheetNumberingShared(db);
  const descSlots = buildDescSlotMap(db);
  const sliceConvention = conventionOf(db, slice, MEP_DONOR_ROOM);
  const convention = donorConventions(db, live);
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
        '. The floor is one review set. Run with no room arguments to build the whole floor, or pass ' +
        '--partial to rebuild only the named rooms and carry the others forward from the existing file.');
  }

  const built = buildAll(db, live, slice, rooms, stamp, numbering, descSlots, convention);

  /* --partial: the rooms NOT rebuilt this run are carried forward verbatim from
   * the existing file, WITH whatever field state they hold - so they join the
   * output in finish(), after the born-clean doc rules and the selftest have
   * been proved on the rooms that were actually built. */
  const carried = missing.slice();
  if (missing.length && !existsSync(OUT_PATH)) {
    die('--partial needs an existing ' + OUT_PATH.replace(REPO + '/', '') + ' to carry ' + missing.join(', ') +
        ' forward from, and there is none. Build the whole floor first.');
  }
  assertDocRules(built.docs);

  if (wantSelftest) {
    const ok = selftest(db, live, slice, built, convention, numbering, descSlots);
    if (!ok) process.exit(1);
  }

  /* A REBUILD MUST NEVER ERASE THE CREW'S WORK, and the common-area docs the
   * --spaces path wrote are carried forward untouched. Applied AFTER the
   * born-clean doc rules and the selftest have passed on the fresh build, and
   * applied identically to every build this run makes, so the determinism
   * check compares like with like. Two kinds of line the generator does not
   * produce are carried forward as well, because the crew's work sits on them:
   * a line carry_floor2.mjs rebuilt from the database because the category
   * gate had left the crew's work with no home, and a line the crew authored
   * themselves in the app. Both say what they are on their face. */
  const prevDocs = existsSync(OUT_PATH) ? ((JSON.parse(readFileSync(OUT_PATH, 'utf8')).docs) || {}) : {};
  const CARRIED_LINE_RE = /FIELD-AUTHORED LINE|THIS LINE EXISTS BECAUSE THE CREW IS ALREADY WORKING IT/;
  const finish = (d) => {
    const report = [];
    for (const r of rooms) {
      /* preserveFieldState carries every previous note the fresh build lacks.
       * A CREW note (by != '') must travel; a note THIS TOOL authored on an
       * earlier run (by === '') must not - it would resurrect text the new
       * build deliberately no longer says. */
      const freshNotes = new Set([...Object.keys(d[r].notes || {}), ...Object.keys(d[r + '-MEP'].notes || {})]);
      const p = preserveFieldState(prevDocs, r, d[r], d[r + '-MEP']);
      for (const id of [r, r + '-MEP']) {
        for (const [nk, note] of Object.entries(d[id].notes || {})) {
          if (!freshNotes.has(nk) && !note.by) { delete d[id].notes[nk]; p.notes--; }
        }
      }
      const kept = [];
      for (const id of [r, r + '-MEP']) {
        for (const [k, ov] of Object.entries((prevDocs[id] || {}).items || {})) {
          if (d[id].items[k] || ov.deleted || !CARRIED_LINE_RE.test(String(ov.instanceNote || ''))) continue;
          if (Object.values(d[id].items).some((v) => v.sort === ov.sort)) die(id + '/' + k + ': carried crew line collides at sort ' + ov.sort);
          d[id].items[k] = clone(ov);
          kept.push(id + '/' + k);
          p.orphaned = p.orphaned.filter((o) => !o.startsWith(id + '/' + k + ' '));
        }
      }
      if (p.lines || p.notes || p.orphaned.length || kept.length) report.push({ room: r, ...p, kept });
    }
    for (const r of missing) {
      for (const id of [r, r + '-MEP']) {
        if (!prevDocs[id]) die('--partial cannot carry room ' + r + ' forward: the existing file has no doc ' + id);
        d[id] = clone(prevDocs[id]);
      }
    }
    for (const [id, doc] of Object.entries(prevDocs)) {
      if (!/^\d{3}(-MEP)?$/.test(id) && !d[id]) d[id] = doc;
    }
    return report;
  };
  const preserved = finish(built.docs);

  const out = assemble(built.docs, stamp, rooms);
  const text = stringify(out);

  if (verifyDet) {
    const again = buildAll(db, live, slice, rooms, stamp, numbering, descSlots, convention);
    finish(again.docs);
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

  printReport(built.reports, numbering, donorProof, fid, descSlots, { slice: sliceConvention, byDonor: convention });
  process.stdout.write('\n' + '='.repeat(100) + '\n');
  if (preserved.length) {
    process.stdout.write('field state preserved from the previous staged file (a rebuild never zeroes the crew\'s work):\n');
    for (const p of preserved) {
      process.stdout.write('  room ' + p.room + ': ' + p.lines + ' line(s), ' + p.notes + ' note(s)' +
        (p.kept.length ? '; carried crew line(s) kept: ' + p.kept.join(', ') : '') +
        (p.orphaned.length ? '; WORK WITH NO LINE TO LAND ON: ' + p.orphaned.join(', ') : '') + '\n');
    }
  }
  for (const f of d22counts.facts) process.stdout.write(PROFILE.tab + ' tab reconciled: ' + f + '\n');
  for (const f of d22counts.mismatches) process.stdout.write(PROFILE.tab + ' tab DOES NOT RECONCILE: ' + f + '\n');
  if (carried.length) {
    process.stdout.write('--partial: rebuilt ' + rooms.join(', ') + '; carried room(s) ' + carried.join(', ') +
      ' forward from the existing file, unchanged\n');
  }
  process.stdout.write('wrote ' + OUT_PATH.replace(REPO + '/', '') + '  (' + Object.keys(out.docs).length +
    ' docs: ' + Object.keys(out.docs).sort(cmpDocId).join(', ') + ')\n');
  process.stdout.write('  md5 ' + md5(text) + '   ' + text.length + ' bytes\n');
  process.stdout.write('READ ONLY and untouched, verified by size+mtime: floor1-staged.json, slice-f1.json, ref-rooms-staged.json, build_floor1.mjs\n');
  process.stdout.write('FLOOR ' + FLOOR + ' STAGED FOR APPROVAL. NOT LIVE. Firestore not touched. Nothing pushed. Nothing deployed.\n\n');
}

main(process.argv);
