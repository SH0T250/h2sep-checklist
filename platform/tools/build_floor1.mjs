#!/usr/bin/env node
/**
 * build_floor1.mjs - deterministic Floor-1 guestroom document generator.
 *
 * H2SEP / Home2 Suites by Hilton, Eagle Pass TX - Triun Construction & Engineering.
 *
 *   node platform/tools/build_floor1.mjs --selftest
 *   node platform/tools/build_floor1.mjs 107 109 111 113 115
 *   node platform/tools/build_floor1.mjs --fresh 107 109
 *   node platform/tools/build_floor1.mjs --stamp=2026-08-20T00:00:00.000Z 107
 *
 * READS   data/project.sqlite                (read only)
 *         platform/data/slice-f1.json        (approved reference, READ ONLY, never written)
 * WRITES  platform/data/floor1-staged.json   (the staging seed - the ONLY output)
 *
 * Never touches Firestore. Never pushes. Never deploys.
 *
 * ---------------------------------------------------------------------------
 * THE REDUCTION RECIPE (reverse engineered from the approved slice, proven by
 * --selftest against rooms 101 / 103 / 105 on category, tag and qty)
 *
 *   1 CATEGORY GATE  keep only the 8 FF&E-ish categories in GATE_CATEGORIES.
 *                    Plumbing / Electrical / Mechanical / Low Voltage / Fire
 *                    Alarm route to the MEP doc; everything else is dropped.
 *   2 FOLD           group kept rows by (category, tag); qty = rows in group.
 *   3 D12 OVERRIDE   GR-322 Nightstand @ Queen Queen ships qty 3 (Austin's
 *                    ruling: a two-queen room has three nightstands).
 *   4 UNTAGGED       untagged rows are NOT folded; each keeps its own line with
 *                    an empty code and key 'u_' + md5(cat|desc|note|occ)[0..10).
 *   5 SORT           (categoryIndex + 1) * 1000 + withinBandOrdinal * 10.
 *   6 KEY            '<tagslug>_<occ>', tagslug = lowercase, non-alphanumerics
 *                    stripped (GR-402.1 -> gr4021), occ = a, b, c ...
 *   7 PACKAGE        label / src / reliability / instanceNote / trade / derived
 *                    / attachments are carried from the approved room of the
 *                    SAME room_type. sqlite supplies the shape; the approved
 *                    slice supplies the curated content (it holds the ruling
 *                    text, the closed flags and the submittal links, and those
 *                    are not in the DB). Nothing is invented here.
 *
 * MEP: the 22 live lines are a type-level constant - a field-level diff of all
 * 22 lines across 101-MEP / 103-MEP / 105-MEP shows zero deltas - so the MEP
 * doc is COPIED, not recomputed. assertMepConstant() re-proves that on every
 * run before any copy is made.
 *
 * FIELD STATE IS NOT TEMPLATE: new rooms are born clean (checked false,
 * initials '', checkedAt null, checkedAtLocal null, issue '', issueResolved
 * false). The package is copied; the crew's punch state never is.
 *
 * ---------------------------------------------------------------------------
 * THE KING FAMILY - COMPOSED PACKAGES (added 2026-08-20)
 *
 * There is no approved King room in slice-f1.json, so step 7 above cannot copy
 * a same-type package. The King package is COMPOSED instead, and every field
 * still traces to a document:
 *
 *   a SHAPE            category, tag, qty, key and sort come from sqlite,
 *                      exactly as for the QQ rooms. Room 104 gates 43 rows and
 *                      folds to 41 lines (HD-12 x2, GR-202 x2).
 *   b label AND src    taken from sqlite (description, primary_sheet). These
 *                      two rules are not assumed - assertDerivationRules()
 *                      re-derives them for all 120 approved lines on every run
 *                      and hard-fails on a single mismatch. This is what
 *                      RE-POINTS the King citations from A555 to A550: the DB
 *                      already carries A550 as primary_sheet on the King rows.
 *   c SHARED TAGS      32 of the 41 King tags also exist in approved room 105.
 *                      For those, reliability / instanceNote / trade / derived
 *                      / attachments are carried from 105 verbatim, because
 *                      that is where Austin's rulings, the closed flags and the
 *                      Drive submittal links live. sqlite has none of them.
 *   d KING-ONLY TAGS   the remaining 9 have no approved source anywhere, so
 *                      reliability / trade / derived come from sqlite and
 *                      instanceNote is the sqlite `note` verbatim ('' when the
 *                      DB has none), prefixed '\u2691 ' when reliability is not
 *                      HIGH - the same shape the approved MEDIUM lines carry.
 *                      NOTHING is written that the DB does not say.
 *
 * WORKING WALL HANDEDNESS IS NOT BUILT. The FF&E Installation workbook splits
 * GR-304 into L and R (3 rooms each on floor 1) but never says WHICH rooms.
 * A550 prints the tag once, plain, with no suffix, and its furnishings legend
 * collapses the whole family to one 'GR-304 -316 WORKING WALL' row. Every King
 * room therefore carries the plain GR-304 tag. Open question, not a guess.
 *
 * THE KING-FAMILY MEP DOCUMENT IS COMPOSED, NOT COPIED  (rebuilt 2026-08-20)
 *
 * The previous build COPIED the Queen-Queen -MEP doc into every King room. That
 * carried the QQ sheet (A555) onto 14 of the 22 live lines, carried the QQ
 * CONNECTING view (04.1) onto five lines in rooms whose rooms.connecting = 0,
 * carried the QQ room's UNRESOLVED PTAC-1/PTAC-2 question into rooms whose own
 * DB row resolves it, and discarded the room-specific Fire Sprinkler take-off
 * the database holds for rooms 104-115. All four are fixed here.
 *
 *   SHAPE          the 22 condensed lines stay - key, category, sort and the
 *                  D10 verification wording are Austin's approved condensation.
 *   CITATIONS      every `src` comes off THIS room's own room_items rows, and
 *                  the SHEET NAME is the only thing a mapping is allowed to
 *                  change. A555 -> A550 as a STRING SUBSTITUTION was tried on
 *                  2026-08-20 and was wrong: it rewrote 56 view numbers along
 *                  with the sheet name across the seven King rooms, pointing
 *                  the smoke detector at A550 view 06 (the entry / mirror wall
 *                  elevation) and the thermostat at A550 view 07 (the bed /
 *                  sofa wall). assertSheetNumberingShared() now proves, number
 *                  by number, WHICH references survive a sheet change - the
 *                  database's own 'A55x kn<n>' wildcard, plus view 01, view
 *                  01.1, KN1 and view 08 on the A550/A555 pair - and
 *                  composeMepCitation() REMOVES every number outside that set
 *                  rather than rewriting it, preferring the room's own row and
 *                  saying in the line note what it dropped and why.
 *   CONNECTING     the '.1' view variant is the CONNECTING plan (room_types:
 *                  "A555 view 01.1 'QQ Studio Conn.' + electrical view 04.1").
 *                  It is dropped where rooms.connecting = 0 and kept where it
 *                  is 1 (room 116, room 118).
 *   PTAC           where the room's own row carries a resolved mark, the line
 *                  carries that mark and quotes the row's reasoning verbatim.
 *   SPRINKLER      where the room has its own Fire Sprinkler rows, the head
 *                  count and the head-by-head positions are carried instead of
 *                  being thrown away.
 *   ACCOUNTING     MEP_CONDENSED_SOURCES + MEP_ROUGH_IN_ITEMS must cover the
 *                  donor's MEP rows EXACTLY (assertMepCondensationCovers). A
 *                  row in the target room that is neither condensed, nor a
 *                  known variant, nor a ruled drop, becomes its OWN line - it
 *                  is never silently lost. That is what gives room 118 its
 *                  five ADA electrical lines and its two Config-B plumbing
 *                  lines on top of the 22.
 *
 * The QQ rooms (107-115) keep the proven copy path: their type has an approved
 * -MEP doc and this tool is create-only against approved work.
 * ---------------------------------------------------------------------------
 */

import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const DB_PATH = resolve(REPO, 'data', 'project.sqlite');
const SLICE_PATH = resolve(REPO, 'platform', 'data', 'slice-f1.json');
const OUT_PATH = resolve(REPO, 'platform', 'data', 'floor1-staged.json');

/* Determinism: the record bodies carry ONE stamp, and it is a declared
 * constant, not Date.now(). Re-running the same arguments therefore rewrites a
 * byte-identical file. Override with --stamp=<ISO> for a dated wave. */
const DEFAULT_STAMP = '2026-08-20T00:00:00.000Z';

/* Approved. Create-only: this tool refuses to regenerate these. */
const APPROVED_ROOMS = ['101', '103', '105'];
const APPROVED_DOC_IDS = ['101', '103', '105', '101-MEP', '103-MEP', '105-MEP'];

/* Room 118 King Studio Acc. was BLOCKED while its bathing configuration was an
 * open question. IT IS NOW UNBLOCKED, and here is the provenance, because a
 * build agent correctly refused to take the ruling on the say-so of a file.
 *
 * On 2026-08-20 Austin was asked directly, in conversation, which of a tub or a
 * roll-in shower room 118 gets. He was shown the conflict verbatim: A533 says
 * accessible tub, A554 and A103 draw a roll-in, and the FF&E Installation 1st
 * Floor tab carries 16 shower bases and 16 shower doors against 16 rooms with no
 * tub line. He chose ROLL-IN SHOWER. That is the owner answering a direct
 * question, not text found in a repository, and it is recorded as ruling D19.
 *
 * The guard that stood here was right in principle and is worth keeping in
 * spirit: an instruction that reaches a tool only as repository text is NOT the
 * owner's approval. Anything else still open stays blocked. */
const BLOCKED_ROOMS = {};

/* Still open on 118 even with the roll-in settled, and NOT resolvable by this
 * tool. These ride as flagged lines or as questions for Austin, never as guesses:
 *  - A100 and G001 both mark 118 'T' (tub). Conflicts A11 and B4.4 stay OPEN
 *    until Austin closes them as superseded by the roll-in.
 *  - Grab bars and bath accessories (HD-02, HD-06, HD-08, HD-10, HD-12) have no
 *    drawn source on the roll-in plan. On the only floor-1 ADA room these are a
 *    pass or fail item at inspection. This needs an RFI.
 *  - No towel bar, no GR-321 wall shelf, no GR-501 vanity mirror and no GR-502
 *    full length mirror is tagged for 118, though every other room type gets them. */

/* Step 1 gate. */
const GATE_CATEGORIES = new Set([
  'Bath Accessory', 'Appliance', 'FF&E - Casegoods', 'FF&E - Bedding',
  'FF&E - Seating', 'FF&E - Lighting', 'FF&E - Window', 'FF&E - Art / Mirror', 'Door Hardware',
]);

/* Categories that belong to the MEP doc, not the FF&E doc. Listed so that a
 * category we have never seen before is REPORTED rather than silently dropped. */
const MEP_CATEGORIES = new Set([
  'Plumbing', 'Electrical', 'Mechanical', 'Low Voltage', 'Fire Alarm',
  'Fire Sprinkler', 'Fire Protection',
]);

/* Step 5 band order - crew works top of wall down, trades, then FF&E. */
const CATEGORY_ORDER = [
  'Drywall', 'Paint', 'Wall Covering', 'Flooring', 'Stone / Surround',
  'Doors', 'Electrical', 'Mechanical', 'Plumbing', 'Fire Sprinkler',
  'Fire Alarm', 'Low Voltage', 'Bath Accessory', 'Appliance',
  'FF&E - Casegoods', 'FF&E - Bedding', 'FF&E - Seating', 'FF&E - Lighting',
  'FF&E - Window', 'FF&E - Art / Mirror', 'FF&E - Misc',
];
const CATEGORY_INDEX = new Map(CATEGORY_ORDER.map((c, i) => [c, i]));

/* Step 3. Austin's ruling D12, scoped to this exact tag only. */
/* AUSTIN RULING D22 (2026-08-20): the plain Queen-Queen working wall is GR-305,
 * not GR-308. Austin instructed "fix GR-305 on 105-115".
 *
 * WHY THIS IS A CORRECTION AND NOT A RENAME. data/project.sqlite carries NO
 * GR-305 row anywhere in the building: every Queen-Queen room, connecting or
 * not, was transcribed as GR-308. The transcriber saw the oddity and said so in
 * the row itself ("printed '@ Queen Queen Studio Suite Connector' in the spec
 * but tagged on the BASE QQ plan") and marked the row FLAGGED. Ruling D11 later
 * closed that flag as a naming quirk with no order impact. D11 was decided
 * WITHOUT the FF&E Installation workbook, and the workbook shows it was wrong.
 *
 * The workbook's 1st Floor tab carries the two tags as SEPARATE purchased parts
 * with separate counts:
 *     GR-305  Working Wall @ QQ             L = 2, R = 4   -> 6 units
 *     GR-308  Working Wall @ QQ Connector   L = 1, R = 1   -> 2 units
 * Floor 1 has exactly 6 plain Queen-Queen keys (105 107 109 111 113 115) and
 * exactly 2 QQ connecting keys (101 QQ Wide Connecting, 103 QQ Connecting).
 * 6 and 2. The counts reconcile with no remainder, which is what makes this
 * evidence rather than a guess. Two different part numbers were ordered, so a
 * crew told to install GR-308 in room 109 would hang the wrong casework.
 *
 * WHAT THIS RULING DOES NOT SETTLE: which of the six rooms takes the LEFT hand
 * and which takes the RIGHT. The workbook gives floor totals (2 L, 4 R), never a
 * room assignment, and no drawing this tool can read states it per room. The
 * line therefore ships as the base tag with handedness called out as open. It is
 * NOT guessed, and reliability drops to MEDIUM to say so. */
/* AUSTIN RULINGS D27 AND D28 (2026-08-21, given directly in conversation):
 * lines ADDED to every floor-1 guest room by the owner's instruction.
 *
 * D27: "Make sure to add hot and cold water work." One plumbing punch line per
 * room verifying hot AND cold arrive at every fixture, correct sides.
 * The P202/P305 series documents the 120F HWS distribution these lines test.
 *
 * D28: "Make sure to add items to FF&E - 1. Door Closer installed ... 2. Door
 * Lock Installed". Two FF&E lines per room under a new Door Hardware category.
 * Product identities are transcribed VERBATIM from the labels Austin
 * photographed on site 2026-08-21, not guessed:
 *   closer: RIXSON R21013, Series 10, UL Classified "MISCELLANEOUS FIRE DOOR
 *           ACCESSORIES 2MF0"
 *   lock:   NORTON RIXSON / ASSA ABLOY box label "10-336", DOOR, finish 630;
 *           one unit photographed installed on a guestroom frame
 * These are owner-directed CHECK items, so they exist by ruling rather than by
 * a sheet takeoff; the note on each line says exactly that. */
/* D46 (2026-09-02): "add TV mount to each room. Doesn't matter about the tag, just
 * put it underneath TV." One Appliance line per guest room, sort 14025, directly
 * under the Television (903, sort 14020). No tag asserted. */
/* D29 (2026-08-24): "make sure to add Bed Skirts to the ADA rooms." The King
 * accessible keys already carry GR-603.1 from the drawings; the QQ Acc. rooms
 * (238, 338) have two GR-602.ADA open accessible bases and NO skirt row - the
 * standard queens use a GR-600.1 Box Spring Cover an open base cannot take, and
 * no queen skirt tag exists in the document set. Owner-ruled line, qty 2
 * matching the room's own two accessible base rows. Floor 1 has no QQ Acc.
 * room, so this entry is a documented no-op here and fires on floors 2-4. */
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
    ruling: 'D46', doc: 'ffe', key: 'tvmount_a', category: 'Appliance', sort: 14025,
    code: '', qty: 1,
    label: 'TV mount',
    src: 'D46 (AJ 2026-09-02); owner-directed check item',
    note: 'Added by Austin ruling D46: "add TV mount to each room. Doesn\'t matter about the tag, ' +
      'just put it underneath TV." Placed directly under the Television line. No document tag is ' +
      'asserted for this item; it exists by the owner\'s instruction. Check the mount is installed ' +
      'on the working wall where the TV goes, level, and secure to the backing.',
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

/* Apply the ruled additions to a freshly built doc. Idempotent by key. */
function addRuledLines(roomNo, doc, kind, stamp, room) {
  const added = [];
  for (const r of RULED_LINE_ADDITIONS) {
    if (r.doc !== kind) continue;
    if (r.applies && !r.applies(room || {})) continue;
    if (doc.items[r.key]) continue;              // already there (field state may ride on it)
    doc.items[r.key] = {
      code: r.code, label: r.label, category: r.category, qty: r.qty, sort: r.sort,
      src: r.src, reliability: 'HIGH', instanceNote: r.note, trade: '', derived: 0,
      deleted: false, checked: false, initials: '', checkedAt: null, checkedAtLocal: null,
      issue: '', issueResolved: false,
    };
    added.push(r.key + ' (' + r.ruling + ')');
  }
  return added;
}

const TAG_CORRECTIONS = [
  {
    ruling: 'D22',
    from: 'GR-308',
    to: 'GR-305',
    roomTypes: ['Queen-Queen'],
    floors: ['1'],
    label: 'Working Wall @ Queen Queen Studio Suite',
    workbook: 'GR-305 Working Wall @ QQ, 1st Floor tab: L = 2, R = 4, six units against six plain QQ keys',
    handedness: 'The workbook splits GR-305 into 2 LEFT and 4 RIGHT across these six rooms. ' +
      'No drawing and no schedule this tool can read says WHICH room takes which hand, so no hand is ' +
      'assigned here. Confirm the per-room handedness with RK Design before this casework is released.',
  },
];

const QTY_OVERRIDES = [
  { tag: 'GR-322', category: 'FF&E - Casegoods', qty: 3, ruling: 'D12',
    because: 'a two-queen room has three nightstands' },
  /* D20: GR-202 Nightstand Sconce is 2 per King room, 16 across the 8 King
   * family keys on floor 1. The DB already carries two rows on 104-116; room
   * 118 carries one ("only ONE sconce is listed for two nightstands on A551 -
   * transcribed as tagged, not doubled"). The override makes the ruling hold
   * on every King key rather than only where the DB happened to draw both. */
  { tag: 'GR-202', category: 'FF&E - Lighting', qty: 2, ruling: 'D20',
    because: 'a King-family key has two nightstands and takes two GR-202 nightstand sconces, one per '
      + 'nightstand - which is how data/project.sqlite already draws rooms 104 through 116' },
];

/* Room types that have no approved room of their own and must COMPOSE their
 * package. `donorType` names the approved room_type that supplies the curated
 * content (rulings, closed flags, submittal links) for the tags the two types
 * share. Tags the donor does not have fall back to sqlite, never to invention.
 *
 * Citation: data/project.sqlite `room_types` - King Studio room_sheet A550
 * view 01 (57 keys); King Studio Connecting room_sheet A550 view 01.1, 1 key
 * (room 116), "King Studio package + GR-3 connecting door". */
const COMPOSED_TYPES = {
  'King Studio': { donorType: 'Queen-Queen' },
  'King Studio Connecting': { donorType: 'Queen-Queen' },
  'King Studio Acc.': { donorType: 'Queen-Queen' },
};

/* ===========================================================================
 * THE COMPOSED MEP DOCUMENT - the D10 condensation, expressed as data.
 * =========================================================================== */

/* The room whose approved -MEP doc carries the 22-line D10 shape, and whose
 * room_items rows the condensation map below is written against. */
const MEP_DONOR_ROOM = '105';

/* The QQ guestroom sheet the approved citations name, and the '.1' view suffix
 * that means "the CONNECTING variant of that view". Both are re-proved against
 * the DB by assertSheetNumberingShared() before any re-point happens. */
const MEP_DONOR_SHEET = 'A555';

/* The OTHER half of the only sheet PAIR the database says anything about. A
 * pair proof ('A550 view 01' vs 'A555 view 01') licenses exactly one
 * substitution, A555 -> A550, and says nothing about A551 / A552 / A556. */
const KING_PAIR_SHEET = 'A550';

/* D10 CONDENSATION MAP. For each approved MEP line key, the room_items.item_id
 * values IN THE DONOR ROOM that the line stands for. Read off the approved
 * line's own label / instanceNote / src - e.g. mech_grille_bath's note says it
 * "Covers the EF-1 exhaust fan running, the volume damper, the ceiling fire
 * damper, the constant-airflow regulator, and the ceiling access panel", which
 * is exactly ITM-0070 / ITM-0066 / ITM-0067 / ITM-0065 / ITM-0064. */
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

/* Donor MEP rows the approved 22-line punch deliberately does NOT carry:
 * concealed distribution and rough-in, none of which a finish walk can see.
 * Listed by name so that a row which is neither condensed nor listed here
 * fails the build instead of vanishing. */
const MEP_ROUGH_IN_ITEMS = [
  'ITM-0032', 'ITM-0033', 'ITM-0034',   // gate valves at the CWS/HWS/HWR risers
  'ITM-0035',                            // domestic water branch set to unit
  'ITM-0036',                            // fixture runouts
  'ITM-0037',                            // sanitary sewer riser tie
  'ITM-0038',                            // vent riser at the wet wall
  'ITM-0040',                            // 2" SS waste branch
  'ITM-0041',                            // vent piping
];

/* Rows that fill a condensed line's slot but carry a ROOM-SPECIFIC item_id
 * because the type differs there. Verified against the DB: the six King Studio
 * rooms share ITM-0150/0151/0152/0156/0157/0158, room 116 has ITM-0200/0201/
 * 0202, room 118 has ITM-0240 and its Configuration-B plumbing rows. */
const MEP_VARIANT_SLOTS = {
  'ITM-0150': 'plmb_shower_a', 'ITM-0200': 'plmb_shower_a', 'ITM-0706': 'plmb_shower_a',
  'ITM-0151': 'plmb_shencl_a', 'ITM-0201': 'plmb_shencl_a', 'ITM-0730': 'plmb_shencl_a',
  'ITM-0152': 'mech_ptac', 'ITM-0202': 'mech_ptac', 'ITM-0240': 'mech_ptac',
  'ITM-0156': 'fp_heads_a', 'ITM-0157': 'fp_heads_a', 'ITM-0158': 'fp_heads_a',
};

/* Whose words are the line's label? 'row' means the approved label IS the
 * product description off the DB row, so it must track THIS room's row (a
 * roll-in shower is not a 4-inch-threshold shower and must not be labelled as
 * one). Anything not listed keeps the approved D10 verification wording, and
 * this room's own row text goes into the note instead. */
const MEP_LABEL_FROM_ROW = new Set(['plmb_shower_a', 'plmb_shencl_a']);

/* Sentences in the approved donor text that a room's own row can RESOLVE.
 * Asserted present before they are touched; the build stops if the approved
 * wording ever changes underneath this tool. */
const PTAC_DONOR_M401 = 'M401 det.01 + KN3 + KN7';
const PTAC_NAMEPLATE = 'Model reads off the nameplate: AZ65H12DAB is PTAC-1, AZ65H15DAB is PTAC-2.';
const FP_COUNT_SENTENCE = 'head count varies by room, so verify every head you can see rather than counting to a number.';

/* Austin ruling D19 (research/construction-os/DECISIONS.md, 2026-08-20): room
 * 118 gets the ROLL-IN SHOWER package, not a tub. The mutually exclusive tub
 * rows are dropped - matched on the DATABASE'S OWN description prefix, never on
 * a keyword guess - and the build fails if dropping them would leave no
 * Configuration B row behind. */
const CONFIG_A_PREFIX = 'CONFIGURATION A (TUB) - ';
const CONFIG_B_PREFIX = 'CONFIGURATION B (ROLL-IN SHOWER) - ';
const CONFIG_A_DROP_ROOMS = { 118: 'D19' };

/* Lines that exist on the FF&E Installation workbook but on no plan sheet the
 * database transcribed.
 *
 * THE NUMBER IN THE WORKBOOK IS A FLOOR TOTAL, NOT A TAKE-OFF. The tab prints
 * one figure for the whole floor; no sheet tags the item in the room. Turning
 * that figure into a per-room quantity by folding N synthetic rows put a count
 * on the line that no drawing states - and on GR-324 it put 2 units in the one
 * accessible key on a floor whose workbook total is 2. So the line is emitted
 * as ONE row with NO QUANTITY AT ALL, the same way space S017's tag 404
 * STORAGE SHELVING is emitted: the item is real, the count is not established,
 * and the note says exactly that.
 *
 * Guarded three ways by injectWorkbookRows(): the room must be the only key on
 * its floor that can carry the tag, the tag must not already exist in sqlite
 * for that room, and every injected row carries its evidence and a MEDIUM
 * reliability with 'confirm before ordering' in the note. */
const WORKBOOK_SRC = 'FF&E Installation workbook, "1st Floor FF&E Installation" tab '
  + '(Drive 1vHg6-8vDVLpoE-x0jwjijOOlXJX4B1Jy)';
const WORKBOOK_ROWS = {
  118: [
    {
      tag: 'GR-303', category: 'FF&E - Casegoods', floorTotal: 1,
      description: 'ACCESSIBLE Vanity @ Guest Bath',
      because: 'floor 1 has exactly one accessible key and it is 118',
    },
    {
      tag: 'GR-324', category: 'FF&E - Casegoods', floorTotal: 2,
      description: 'Wall Shelf @ ACCESSIBLE Bathroom',
      because: 'floor 1 has exactly one accessible key and it is 118',
    },
  ],
};

/* room_types.room_sheet is ambiguous for exactly one floor-1 type: King Studio
 * Acc. reads 'A551 / A552' for two keys, 118 and 438. The database's own rows
 * settle it and assertRoomSheetResolution() re-proves the evidence every run.
 * Nothing here is asserted that the DB does not already state. */
const ROOM_SHEET_RESOLUTION = {
  118: {
    sheet: 'A552',
    otherSheet: 'A551',
    otherRoom: '438',
    onlyHere: ['GR-320', 'GR-208'],
    onlyThere: ['GR-502'],
    why: "room 118 carries GR-320 and GR-208, both primary_sheet A552 ('present on A552 (118), absent on A551 (438)'); "
       + 'room 438 carries GR-502 on A551 and neither of the other two. A552 is titled '
       + "'Enl. Guest Room Plans & Elevs - King Studio Acc. Mod.'",
  },
};

/* The doc-level `type` slug is DERIVED, and the derivation is proved against
 * the three approved docs on every run (see assertDerivationRules). */
const typeSlug = (roomType) => roomType.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/* Constant across 101-MEP / 103-MEP / 105-MEP. Asserted, not assumed. */
const MEP_DOC_TYPE = 'mep-punch';

/* Field state a newly born line carries. Never copied from an approved room. */
const CLEAN_FIELD_STATE = {
  checked: false,
  initials: '',
  checkedAt: null,
  checkedAtLocal: null,
  issue: '',
  issueResolved: false,
};

/* --------------------------------------------------------------------- utils */

function die(msg) {
  process.stderr.write('build_floor1: FATAL: ' + msg + '\n');
  process.exit(1);
}

/** Code-point-wise compare, so JS orders tags the way the reference generator did. */
function cmpStr(a, b) {
  const A = [...a], B = [...b];
  const n = Math.min(A.length, B.length);
  for (let i = 0; i < n; i++) {
    const x = A[i].codePointAt(0), y = B[i].codePointAt(0);
    if (x !== y) return x < y ? -1 : 1;
  }
  return A.length === B.length ? 0 : (A.length < B.length ? -1 : 1);
}

/** Step 6 slug: lowercase, every non-alphanumeric stripped. */
const tagSlug = (tag) => tag.toLowerCase().replace(/[^a-z0-9]/g, '');

/** 1 -> a, 2 -> b, ... 27 -> aa. */
function occSuffix(n) {
  let s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(97 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

const md5 = (s) => createHash('md5').update(s, 'utf8').digest('hex');

/* Internal grouping-key separator. NUL cannot occur in a sheet value, so two
 * different (category, tag) pairs can never collide into one group key. */
const SEP = '\u0000';

/** Deterministic JSON: object keys sorted at every depth, 2-space indent. */
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
/* A space document id, as opposed to a guest-room one. Rooms are three digits. */
const isSpaceDocId = (id) => !/^\d{3}(-MEP)?$/.test(id);
const clone = (v) => JSON.parse(JSON.stringify(v));
const deepEqual = (a, b) => stringify(a) === stringify(b);

/** Doc ordering in the output file: room number ascending, base doc before -MEP.
 *
 * Space doc ids are not numeric ('S003', 'SZONEA-M'), and parseInt returns NaN
 * for them - a NaN comparator makes Array.prototype.sort implementation-defined
 * and would destroy the byte-identical-rebuild guarantee. Numeric ids therefore
 * sort first, ascending; every non-numeric id sorts after them, code-point-wise.
 * Guest-room ordering is unchanged. */
function cmpDocId(a, b) {
  const na = parseInt(a, 10), nb = parseInt(b, 10);
  const aNum = Number.isFinite(na), bNum = Number.isFinite(nb);
  if (aNum !== bNum) return aNum ? -1 : 1;
  if (aNum && na !== nb) return na - nb;
  return cmpStr(a, b);
}

/* --------------------------------------------------------------- sqlite read */

function openDb() {
  if (!existsSync(DB_PATH)) die('database not found at ' + DB_PATH);
  return new DatabaseSync(DB_PATH, { readOnly: true });
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

/* ------------------------------------------------------- the reduction recipe */

/**
 * Reduce a room's raw room_items rows to the FF&E line shape.
 * A "line" is { key, code, category, qty, sort, sqlite:{...} }.
 */
/* Rewrite a tag under a ruling, on the room's own rows, before anything is
 * grouped or keyed - so the key, the ordering and the fold all follow from the
 * corrected tag rather than being patched afterwards. Returns what it changed. */
function applyTagCorrections(roomNo, room, rows) {
  const applied = [];
  for (const c of TAG_CORRECTIONS) {
    if (!c.roomTypes.includes(room.room_type)) continue;
    if (c.floors && !c.floors.includes(String(room.floor))) {
      die('room ' + roomNo + ' is type ' + JSON.stringify(room.room_type) + ' but sits on floor ' +
          room.floor + ', and correction ' + c.ruling + ' is only evidenced for floor(s) ' +
          c.floors.join('/') + '. Check that floor\'s FF&E Installation tab before building it.');
    }
    const hit = rows.filter((r) => r.tag === c.from);
    if (!hit.length) continue;
    for (const r of hit) r.tag = c.to;
    applied.push({ ruling: c.ruling, from: c.from, to: c.to, rows: hit.length, spec: c });
  }
  return applied;
}

/* The correction is only trustworthy because the counts reconcile. Re-prove that
 * from the database on every run rather than trusting the comment above: floor 1
 * must hold exactly six plain Queen-Queen keys and exactly two QQ connecting
 * keys, matching the workbook's 6 and 2. If the room mix ever changes, stop. */
function assertTagCorrectionCounts(db) {
  for (const c of TAG_CORRECTIONS) {
    if (c.ruling !== 'D22') continue;
    const plain = db.prepare(
      "select count(*) n from rooms where floor = 1 and room_type = 'Queen-Queen'").get().n;
    const conn = db.prepare(
      "select count(*) n from rooms where floor = 1 and room_type in ('QQ Connecting','QQ Wide Connecting')").get().n;
    if (plain !== 6 || conn !== 2) {
      die('D22 count check failed: the workbook pairs GR-305 with 6 units and GR-308 with 2, but ' +
          'floor 1 now has ' + plain + ' plain Queen-Queen and ' + conn + ' QQ connecting keys. ' +
          'The correction is only evidence while those reconcile.');
    }
    const stray = db.prepare("select count(*) n from room_items where tag = 'GR-305'").get().n;
    if (stray !== 0) {
      die('D22 assumed the database carries no GR-305 row anywhere, but it now has ' + stray +
          '. Re-check the correction before applying it.');
    }
  }
}

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

/**
 * Inject the workbook-only rows for a room, one synthetic row per physical
 * unit, BEFORE the reduction. Refuses if the tag already exists in sqlite for
 * that room, and refuses unless the room really is the only key on its floor
 * that can carry the line.
 */
function injectWorkbookRows(db, roomNo, room, rows) {
  const spec = WORKBOOK_ROWS[roomNo];
  if (!spec) return { rows, injected: [] };

  const accessible = db.prepare("SELECT room_no FROM rooms WHERE floor = ? AND accessible = '1'").all(room.floor)
    .map((r) => r.room_no).sort(cmpStr);
  if (stringify(accessible) !== stringify([String(roomNo)])) {
    die('room ' + roomNo + ': the workbook injection assumes this is the ONLY accessible key on floor ' +
        room.floor + ', but rooms.accessible = 1 on: ' + (accessible.join(', ') || 'no room at all') +
        '. Refusing to place a workbook line by elimination.');
  }

  const have = new Set(db.prepare('SELECT DISTINCT tag FROM room_items WHERE room_no = ? AND tag IS NOT NULL')
    .all(roomNo).map((r) => r.tag));
  const out = rows.slice();
  const injected = [];
  let synth = 9000000;
  for (const w of spec) {
    if (have.has(w.tag)) {
      die('room ' + roomNo + ': refusing to inject ' + w.tag +
          ' - data/project.sqlite already carries that tag for this room. The DB row governs.');
    }
    /* Where else does the database actually draw this tag? Reported as a fact,
     * never used to pick a number for this room. */
    const elsewhere = db.prepare('SELECT room_no, COUNT(*) AS n FROM room_items WHERE tag = ? GROUP BY room_no ORDER BY room_no')
      .all(w.tag).map((x) => 'room ' + x.room_no + ' x' + x.n);
    const note = 'PLACEMENT IS THE FF&E INSTALLATION WORKBOOK\'S; THE QUANTITY IS NOBODY\'S. '
      + 'The "1st Floor FF&E Installation" tab carries a FLOOR TOTAL of ' + w.floorTotal + ' for ' + w.tag
      + ' on floor 1, and ' + w.because + ' (rooms.accessible = 1 on room ' + roomNo
      + ' and on no other floor-' + room.floor + ' key). A floor total is a SCHEDULE TOTAL, not a count taken '
      + 'off a drawing: data/project.sqlite transcribes no ' + w.tag + ' row for this room and no sheet tags '
      + 'the item here'
      + (elsewhere.length ? ' (the database does draw ' + w.tag + ' elsewhere - ' + elsewhere.join(', ')
          + ' - none of them on floor ' + room.floor + ')' : '')
      + '. THE LINE THEREFORE SHIPS WITH NO QUANTITY: the item is real, the count is not. Reliability MEDIUM. '
      + 'Confirm the count before ordering.';
    out.push({
      rowid: ++synth,
      item_id: 'SYN-' + roomNo + '-' + w.tag,
      room_type: room.room_type,
      category: w.category,
      tag: w.tag,
      description: w.description,
      instance_note: null,
      note,
      trade_responsible: null,
      source_sheet: WORKBOOK_SRC,
      primary_sheet: null,
      reliability: 'MEDIUM',
      derived: 1,
      /* Read by reduceFFE: this line carries no qty at all. */
      qty_unknown: 1,
    });
    injected.push(w.tag + ' (workbook floor total ' + w.floorTotal + '; line emitted with NO quantity)');
  }
  return { rows: out, injected };
}

/**
 * SORT IS MEASURED, NOT ASSUMED.
 *
 * The approved work uses two band-ordinal conventions and they disagree
 * wherever a group folds more than one raw row:
 *
 *   'line'  the ordinal advances once per emitted LINE   (rooms 101, 103)
 *   'row'   the ordinal advances once per RAW ROW, so a folded pair of rows
 *           leaves a 10-wide gap behind it                (room 105)
 *
 * Rooms 107 and 115 take their whole package from approved room 105, so they
 * must reproduce 105's numbering exactly - under the 'line' convention eleven
 * of their FF&E lines came out 10 low (one 20 low), which is what the
 * verifiers found. Rather than hard-code either rule, this reads the approved
 * doc and reports which convention reproduces it, and refuses if neither does.
 */
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

/** The convention the approved reference room uses, measured on every run. */
function conventionOf(db, slice, refNo) {
  const { rows } = readRoom(db, refNo);
  const red = reduceFFE(refNo, rows);
  const got = detectSortConvention(slice.docs[refNo].items, red);
  if (!got.convention) {
    die('neither sort convention reproduces approved room ' + refNo + ' - refusing to number a new room:\n  ' +
        Object.entries(got.misses).map(([k, v]) => k + ': ' + v.join('; ')).join('\n  '));
  }
  return got.convention;
}

/* ------------------------------------------------------------- slice reading */

function loadSlice() {
  if (!existsSync(SLICE_PATH)) die('approved slice not found at ' + SLICE_PATH);
  const slice = JSON.parse(readFileSync(SLICE_PATH, 'utf8'));
  for (const id of APPROVED_DOC_IDS) {
    if (!slice.docs || !slice.docs[id]) die('approved slice is missing doc ' + id);
  }
  return slice;
}

/** room_type -> approved reference room number, read off the DB, not hard-coded. */
function buildTypeReference(db) {
  const map = new Map();
  for (const n of APPROVED_ROOMS) {
    const row = db.prepare('SELECT room_type FROM rooms WHERE room_no = ?').get(n);
    if (!row) die('approved room ' + n + ' is missing from the rooms table');
    map.set(row.room_type, n);
  }
  return map;
}

/** Re-prove the MEP type-level constant on every run. */
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

/* ------------------------------------------------- derivation-rule prover */

/**
 * The King package leans on two rules that the QQ path never needed:
 *
 *   label == room_items.description
 *   src   == room_items.primary_sheet, falling back to source_sheet
 *
 * Both are re-proved here against every line of all three approved rooms
 * (120 lines) before any King room is composed. A single mismatch aborts the
 * run: if the rule does not hold, the King `src` values it produces - the
 * A555 -> A550 re-point - would be a guess, and this tool does not guess.
 *
 * The doc-level `type` slug derivation is proved the same way.
 */
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

/**
 * Report - never rewrite - MEP `src` strings that cite the Queen-Queen sheet.
 * A550 and A555 do not share a view numbering (A550 view 06/07 are interior
 * elevations; the MEP citations use A555 view 06/07 as plans), and no document
 * in the set states the A550 equivalents. Rewriting them would be a guess.
 */
function mepSheetCitations(slice, refNo) {
  const out = [];
  const items = slice.docs[refNo + '-MEP'].items;
  for (const k of Object.keys(items).sort(cmpStr)) {
    const v = items[k];
    if (v.deleted) continue;
    const src = String(v.src || '');
    /* 'A550/A555 ...' names both sheets and is type-neutral - not a finding. */
    const bare = src.replace(/A550\s*\/\s*A555/g, '').replace(/A555\s*\/\s*A550/g, '');
    if (bare.includes('A555')) {
      out.push({ key: k, category: v.category, label: v.label });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ selftest */

/**
 * Regenerate 101 / 103 / 105 from sqlite and diff the shape against the
 * approved slice on (category, tag, qty), keyed by item key.
 */
function selftest(db, slice) {
  const results = [];
  let ok = true;
  for (const roomNo of APPROVED_ROOMS) {
    const { room, rows } = readRoom(db, roomNo);
    /* The selftest has to walk the SAME path the build walks, corrections and
     * all, or it proves nothing about what the build actually emits. A ruled
     * correction means an approved room is now DELIBERATELY different from its
     * stored copy - so the expected difference is declared here, and any delta
     * that is not on that list is still a failure. */
    assertTagCorrectionCounts(db);
    const corrs = applyTagCorrections(roomNo, room, rows);
    const expected = new Set();
    for (const c of corrs) {
      expected.add('MISSING:' + tagSlug(c.from) + '_a');
      expected.add('EXTRA:' + tagSlug(c.to) + '_a');
    }
    const probe = reduceFFE(roomNo, rows);
    const approved = slice.docs[roomNo].items;
    const found = detectSortConvention(approved, probe);
    const red = reduceFFE(roomNo, rows, found.convention || 'line');

    const deltas = [];
    const sortNotes = [];
    if (!found.convention) {
      deltas.push('SORT: neither band-ordinal convention reproduces this room - ' +
        Object.entries(found.misses).map(([k, v]) => k + ' misses ' + v.length).join(', '));
    }
    const gen = new Map(red.lines.map((l) => [l.key, l]));
    const appKeys = Object.keys(approved).sort(cmpStr);
    const genKeys = [...gen.keys()].sort(cmpStr);

    const ruled = [];
    for (const k of genKeys) {
      if (!(k in approved)) {
        const g = gen.get(k);
        const line = 'EXTRA   ' + k + ' (' + g.category + ' / ' + (g.code || '<untagged>') + ' / qty ' + g.qty + ') generated but not in approved';
        if (expected.has('EXTRA:' + k)) ruled.push(line + '  [RULED, expected]');
        else deltas.push(line);
      }
    }
    for (const k of appKeys) {
      if (!gen.has(k)) {
        const a = approved[k];
        const line = 'MISSING ' + k + ' (' + a.category + ' / ' + (a.code || '<untagged>') + ' / qty ' + a.qty + ') approved but not generated';
        if (expected.has('MISSING:' + k)) ruled.push(line + '  [RULED, expected]');
        else deltas.push(line);
      }
    }
    /* A declared correction that did NOT show up is also a failure: it means the
     * ruling silently stopped applying. */
    for (const e of expected) {
      const [kind, key] = e.split(':');
      const showed = kind === 'EXTRA' ? gen.has(key) && !(key in approved) : (key in approved) && !gen.has(key);
      if (!showed) deltas.push('RULED CORRECTION DID NOT APPLY: expected ' + kind + ' ' + key);
    }

    for (const k of genKeys) {
      if (!(k in approved)) continue;
      const g = gen.get(k), a = approved[k];
      if (g.category !== a.category) deltas.push(k + ': category ' + JSON.stringify(g.category) + ' != ' + JSON.stringify(a.category));
      if (g.code !== a.code) deltas.push(k + ': tag ' + JSON.stringify(g.code) + ' != ' + JSON.stringify(a.code));
      if (g.qty !== a.qty) deltas.push(k + ': qty ' + g.qty + ' != ' + a.qty);
      /* Sort is now a DELTA, not a note: a new room of this type must land on
       * the approved room's numbering, line for line. */
      if (g.sort !== a.sort) deltas.push(k + ': sort ' + g.sort + ' != approved ' + a.sort);
    }

    results.push({
      room: roomNo,
      raw: red.rawCount,
      gated: red.gatedCount,
      folded: red.foldedGroups,
      generated: red.lines.length,
      approved: appKeys.length,
      convention: found.convention,
      ruled,
      deltas,
      sortNotes,
      unknownCategories: red.unknownCategories,
    });
    if (deltas.length) ok = false;
  }

  const mepLive = assertMepConstant(slice);
  const proof = assertDerivationRules(db, slice);

  process.stdout.write('\nSELFTEST - regenerate 101 / 103 / 105 from sqlite, diff on (category, tag, qty, sort)\n');
  process.stdout.write('-'.repeat(78) + '\n');
  for (const r of results) {
    process.stdout.write(
      'room ' + r.room + ': ' + r.raw + ' raw rows -> ' + r.gated + ' gated -> ' + r.generated +
      ' lines (' + r.folded + ' folded groups); approved has ' + r.approved + '\n');
    if (r.unknownCategories.length) {
      process.stdout.write('  NOTE unrecognised categories: ' + r.unknownCategories.join(', ') + '\n');
    }
    process.stdout.write('  sort convention measured off the approved doc: ' +
      (r.convention ? '"' + r.convention + '" (band ordinal advances once per ' +
        (r.convention === 'row' ? 'RAW ROW' : 'LINE') + ')' : 'NONE FITS') + '\n');
    if (r.deltas.length === 0) {
      process.stdout.write('  PASS 0 deltas on (category, tag, qty, sort) across ' + r.generated + ' lines\n');
    } else {
      process.stdout.write('  FAIL ' + r.deltas.length + ' delta(s):\n');
      for (const d of r.deltas) process.stdout.write('    - ' + d + '\n');
    }
    if (r.ruled && r.ruled.length) {
      process.stdout.write('  RULED ' + r.ruled.length + ' deliberate difference(s) from the stored approved copy:\n');
      for (const d of r.ruled) process.stdout.write('    - ' + d + '\n');
    }
    if (r.sortNotes.length) {
      process.stdout.write('  INFO ' + r.sortNotes.length + ' sort value(s) differ from the recipe band (line ORDER unchanged):\n');
      for (const s of r.sortNotes) process.stdout.write('    - ' + s + '\n');
    }
  }
  process.stdout.write('MEP: type-level constant re-proved - ' + mepLive + ' live lines identical across 101/103/105-MEP\n');
  process.stdout.write('DERIVATION: src == room_items.primary_sheet re-proved on all ' + proof.checked +
    ' approved lines,\n  plus the doc type-slug on all 6 approved docs. This is the rule the King\n' +
    '  composition uses to re-point citations from A555 to A550.\n');
  for (const n of proof.labelNotes) process.stdout.write('  INFO ' + n + '\n');
  process.stdout.write('-'.repeat(78) + '\n');
  const ruledTotal = results.reduce((n, r) => n + (r.ruled ? r.ruled.length : 0), 0);
  process.stdout.write(ok
    ? 'SELFTEST PASSED - zero unexplained deltas on all three approved rooms' +
      (ruledTotal ? ' (' + ruledTotal + ' ruled difference(s), listed above)' : '') + '\n\n'
    : 'SELFTEST FAILED\n\n');
  return ok;
}

/* ---------------------------------------------------------------- generation */

/**
 * Whole-room notes for a generated doc - the same shape store.addNote() writes
 * ({ text, flag, resolved, createdAt, by }), with deterministic ids so a
 * rebuild stays byte-identical. Every note QUOTES a source; none is authored.
 *
 * Note 1 is the one the app was silently dropping: data/project.sqlite
 * rooms.note. On room 115 that note is a documented room-IDENTITY conflict
 * ("A100 reads 115 here; ID-1.1 wrongly reads 114. A100 governs"), and a crew
 * standing in the doorway needs to see it rather than have the app assert a
 * room number the drawings argue about.
 */
function buildRoomNotes(db, roomNo, room, rows, stamp, report) {
  const notes = {};
  const added = [];
  const add = (id, text) => {
    notes[id] = { text, flag: 'info', resolved: false, createdAt: stamp, by: '' };
    added.push(id);
  };

  if (room.note) {
    add('n_dbroom', 'FROM THE DRAWING RECORD (data/project.sqlite rooms.note for room ' +
      roomNo + ', verbatim): "' + room.note + '"');
  }

  const res = ROOM_SHEET_RESOLUTION[roomNo];
  if (res) {
    const rt = db.prepare('SELECT room_sheet, bath_sheet, notes FROM room_types WHERE type_name = ?')
      .get(room.room_type) || {};
    const bath = rows.find((r) => /A532\.1|A532 plan 01\.1/.test(String(r.source_sheet || '')));
    add('n_sheet',
      'SHEET IDENTITY. room_types "' + room.room_type + '" reads room_sheet ' + JSON.stringify(rt.room_sheet || '') +
      ' and bath_sheet ' + JSON.stringify(rt.bath_sheet || '') + ', notes: "' + (rt.notes || '') + '". ' +
      'This build resolves room ' + roomNo + ' to ' + res.sheet + ' - ' + res.why + '. ' +
      (bath ? 'The bath is the roll-in plan (room_items ' + bath.item_id + ' cites "' + bath.source_sheet + '"). ' : '') +
      'Citations off other sheets are carried VERBATIM and are not rewritten to match: the room\'s own PTAC row ' +
      'still cites A551/A552, and the bath keynotes still cite the A530-A533 range, exactly as the database writes them.');
  }

  /* What Austin's ruling settled, and the part of it he did NOT settle. The
   * ruled lines stop carrying the conflict; the conflict itself does not stop
   * existing, so it rides here where the crew and the architect both see it. */
  for (const [id, note] of Object.entries(configRuledRoomNotes(db, roomNo, report.configRuling, stamp))) {
    notes[id] = note;
    added.push(id);
  }

  if (String(room.connecting) === '1') {
    const door = rows.find((r) => r.category === 'Doors' && /connecting door/i.test(String(r.description || '')));
    if (door) {
      add('n_conndoor',
        'CONNECTING KEY. ' + (door.tag ? door.tag + ': ' : '') + door.description +
        ' (' + (door.source_sheet || door.primary_sheet || 'no citation') + '). ' +
        'Category "Doors" sits outside the approved checklist gate, so the connecting door carries no ' +
        'checkable line in either doc - the same as every other connecting key. It is recorded here so it ' +
        'is not lost.');
    } else {
      report.unresolved.push('room ' + roomNo + ' has rooms.connecting = 1 but no "connecting door" row in room_items');
    }
  }

  report.roomNotes = added;
  return notes;
}

/* REGENERATION IS NOT REPLACEMENT.
 *
 * Room 105 is approved and already carries real field state in the live
 * database. Rebuilding it must therefore preserve two things the rebuild does
 * not know about:
 *
 *  1. A LINE THE REBUILD NO LONGER PRODUCES. Ruling D22 retags the working wall,
 *     so gr308_a stops existing and gr305_a appears. gr308_a is a line a person
 *     may already have checked off. It is carried forward as deleted: true with
 *     a note naming what superseded it - the same soft-delete discipline every
 *     other supersede on this project uses. Deletes are blocked in the published
 *     rules anyway, so a tombstone is the only honest way to retire a line.
 *
 *  2. THE MEP DOC'S FIELD HISTORY. 105-MEP holds 22 live lines and 77 already
 *     deleted ones - that room's own supersede record. A fresh build emits only
 *     the 22. The 77 are copied back verbatim.
 *
 * Anything else that differs is reported line by line, so no field changes
 * silently on an approved room. */
/* Re-apply field state from the copy already in the staged seed onto a freshly
 * built pair of documents. Matched by item key, which is stable by
 * construction. A line that no longer exists cannot take its state with it, so
 * it is counted and reported rather than passed over in silence. */
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

function carryForwardApproved(roomNo, ffe, mep, slice, stamp) {
  const out = { tombstoned: [], historyCarried: 0, changed: [], added: [] };
  const oldFfe = slice.docs[roomNo];
  const oldMep = slice.docs[roomNo + '-MEP'];
  if (!oldFfe || !oldMep) die('cannot regenerate ' + roomNo + ': it is not in the approved slice');

  /* 1. tombstone every approved FF&E line the rebuild dropped */
  for (const [k, v] of Object.entries(oldFfe.items)) {
    if (k in ffe.items) continue;
    if (v.deleted) { ffe.items[k] = clone(v); continue; }
    const t = clone(v);
    t.deleted = true;
    t.instanceNote = 'SUPERSEDED on ' + stamp.slice(0, 10) + '. This line was retired when the room was ' +
      'regenerated; the work it stood for is now carried by another line in this room. Kept, not deleted, ' +
      'so any check-off already recorded against it survives. Previous note: ' +
      (v.instanceNote ? JSON.stringify(v.instanceNote) : 'none');
    ffe.items[k] = t;
    out.tombstoned.push(k + ' (' + (v.code || '<untagged>') + ')');
  }

  /* 2. carry the MEP field history back */
  for (const [k, v] of Object.entries(oldMep.items)) {
    if (k in mep.items) continue;
    if (!v.deleted) {
      const t = clone(v);
      t.deleted = true;
      t.instanceNote = 'SUPERSEDED on ' + stamp.slice(0, 10) + ' when room ' + roomNo +
        ' was regenerated. Previous note: ' + (v.instanceNote ? JSON.stringify(v.instanceNote) : 'none');
      mep.items[k] = t;
      out.tombstoned.push(roomNo + '-MEP/' + k + ' (' + (v.code || '<untagged>') + ')');
    } else {
      mep.items[k] = clone(v);
      out.historyCarried++;
    }
  }

  /* 3. report every other field that moved, on both docs */
  const FIELDS = ['code', 'label', 'category', 'qty', 'reliability', 'src', 'instanceNote', 'trade', 'sort'];
  for (const [docId, oldDoc, newDoc] of [[roomNo, oldFfe, ffe], [roomNo + '-MEP', oldMep, mep]]) {
    for (const [k, nv] of Object.entries(newDoc.items)) {
      const ov = oldDoc.items[k];
      if (!ov) { out.added.push(docId + '/' + k + ' (' + (nv.code || '<untagged>') + ')'); continue; }
      for (const f of FIELDS) {
        const a = ov[f] === undefined ? '' : String(ov[f]);
        const b2 = nv[f] === undefined ? '' : String(nv[f]);
        if (a !== b2) {
          out.changed.push(docId + '/' + k + '.' + f + ': ' + JSON.stringify(a).slice(0, 90) +
            ' -> ' + JSON.stringify(b2).slice(0, 90));
        }
      }
      /* Field state belongs to whoever checked the box, never to a rebuild. */
      for (const f of ['checked', 'initials', 'checkedAt', 'checkedAtLocal', 'checkedByCo', 'issue', 'issueResolved']) {
        if (ov[f] !== undefined) nv[f] = clone(ov[f]);
      }
    }
  }
  /* Room notes are field-authored too. */
  if (oldFfe.notes) for (const [k, v] of Object.entries(oldFfe.notes)) if (!(k in (ffe.notes || {}))) (ffe.notes = ffe.notes || {})[k] = clone(v);
  if (oldMep.notes) for (const [k, v] of Object.entries(oldMep.notes)) if (!(k in (mep.notes || {}))) (mep.notes = mep.notes || {})[k] = clone(v);
  return out;
}

function buildFFEDoc(db, roomNo, slice, typeRef, stamp, report) {
  const { room, rows: dbRows } = readRoom(db, roomNo);
  const inj = injectWorkbookRows(db, roomNo, room, dbRows);
  const rows = inj.rows;
  report.injected = inj.injected;
  const roomType = room.room_type;

  /* Ruled tag corrections run on this room's own rows BEFORE grouping, so the
   * key, the fold and the ordering all follow from the corrected tag. */
  assertTagCorrectionCounts(db);
  const corrections = applyTagCorrections(roomNo, room, rows);
  report.tagCorrections = corrections.map((c) => c.ruling + ': ' + c.from + ' -> ' + c.to + ' on ' + c.rows + ' row(s)');

  const composed = COMPOSED_TYPES[roomType] || null;
  let refNo = typeRef.get(roomType);

  if (!refNo && !composed) {
    die('room ' + roomNo + ': room_type ' + JSON.stringify(roomType) +
        ' has no approved reference room and no composition rule. Approved types are: ' +
        [...typeRef.keys()].join(', ') +
        '. Nothing is guessed - build the reference for that type first.');
  }

  /* COMPOSED type: the donor supplies curated content for the SHARED tags only. */
  let donorNo = null;
  if (composed) {
    donorNo = typeRef.get(composed.donorType);
    if (!donorNo) {
      die('room ' + roomNo + ': composed type ' + JSON.stringify(roomType) +
          ' needs an approved ' + JSON.stringify(composed.donorType) + ' room and there is none');
    }
    refNo = donorNo;
  }
  const ref = slice.docs[refNo];

  /* Number this room the way its own approved reference is numbered. Measured
   * off that doc on every run; never assumed. */
  const convention = conventionOf(db, slice, refNo);
  const red = reduceFFE(roomNo, rows, convention);
  report.sortConvention = convention;

  /* Index the donor/reference package so a line is matched on what it IS, not
   * on where it happened to sort. Tagged lines match on (category, tag).
   * Untagged lines have no tag, so they match on their content-derived key
   * (md5 of category|description|instance note|occurrence), stable by
   * construction across rooms. */
  const refIndex = new Map();
  const donorKey = (category, code, key) => (code ? category + SEP + code : 'u' + SEP + key);
  for (const k of Object.keys(ref.items)) {
    const v = ref.items[k];
    const dk = donorKey(v.category, v.code, k);
    if (refIndex.has(dk)) {
      die('room ' + roomNo + ': reference room ' + refNo + ' has two lines matching ' +
          JSON.stringify(dk) + ' - cannot resolve the package unambiguously');
    }
    refIndex.set(dk, { key: k, item: v });
  }

  const items = {};
  const fromDonor = [];
  const fromSqlite = [];
  const donorQtyNotes = [];
  const donorLabelNotes = [];
  const ruledClosed = [];
  const correctedLines = [];
  const overrideNotes = [];

  for (const line of red.lines) {
    /* Shape is always sqlite. Package content depends on whether the donor has
     * this exact (category, tag). */
    const hit = refIndex.get(donorKey(line.category, line.code, line.key));

    let pkg;
    const corr = corrections.find((c) => c.to === line.code);
    if (corr) {
      /* The donor still files this run under the OLD tag, so match it there and
       * keep everything the donor legitimately knows - the citation, the trade,
       * the submittals. Only the identity of the part changes, plus the honesty
       * about what is still open. */
      const old = refIndex.get(line.category + SEP + corr.from);
      if (!old) {
        die('room ' + roomNo + ': ruling ' + corr.ruling + ' corrects ' + corr.from + ' to ' + corr.to +
            ' but reference room ' + refNo + ' has no ' + corr.from + ' line in category ' +
            JSON.stringify(line.category) + ' to carry forward');
      }
      const r = old.item;
      pkg = {
        label: corr.spec.label,
        src: r.src,
        reliability: 'MEDIUM',
        instanceNote:
          'Austin ruling ' + corr.ruling + ': this room takes ' + corr.to + ', not ' + corr.from + '. ' +
          'The two are different purchased parts, not two names for one. The FF&E Installation ' +
          'workbook 1st Floor tab lists ' + corr.spec.workbook + ', and ' + corr.from +
          ' (Working Wall @ QQ Connector) separately as L = 1, R = 1 against the two connecting keys ' +
          '101 and 103. Six and two, with no remainder. ' +
          'data/project.sqlite transcribed every Queen-Queen room as ' + corr.from +
          ' and carries no ' + corr.to + ' row anywhere in the building; its own row here says the ' +
          'spec book printed the Connector name on the base QQ plan, and it flagged that. Ruling D11 ' +
          'previously closed that flag as a naming quirk with no order impact - the workbook shows ' +
          'otherwise, so D22 supersedes D11 on this line only. ' +
          'STILL OPEN: ' + corr.spec.handedness,
        trade: r.trade,
        derived: r.derived,
        attachments: r.attachments,
      };
      correctedLines.push(corr.to + ' (' + corr.ruling + ', was ' + corr.from + ')');
    } else if (!composed) {
      /* Unchanged QQ path: strict key match against the same-type approved room. */
      const r = ref.items[line.key];
      if (!r) {
        report.unresolved.push((line.code || '<untagged>') + ' (' + line.category + ', key ' + line.key +
          ') - not present in approved reference room ' + refNo);
        continue;
      }
      if (r.category !== line.category) {
        report.unresolved.push(line.key + ': category ' + JSON.stringify(line.category) + ' (sqlite) != ' + JSON.stringify(r.category) + ' (room ' + refNo + ')');
        continue;
      }
      if (r.code !== line.code) {
        report.unresolved.push(line.key + ': tag ' + JSON.stringify(line.code) + ' (sqlite) != ' + JSON.stringify(r.code) + ' (room ' + refNo + ')');
        continue;
      }
      if (r.qty !== line.qty) {
        report.unresolved.push(line.key + ': qty ' + line.qty + ' (recipe) != ' + r.qty + ' (room ' + refNo + ')');
        continue;
      }
      pkg = {
        label: r.label, src: r.src, reliability: r.reliability, instanceNote: r.instanceNote,
        trade: r.trade, derived: r.derived, attachments: r.attachments,
      };
    } else if (hit) {
      /* SHARED tag: carry the donor's curated reliability / ruling text /
       * trade / derived / attachments. label and src come from sqlite, which is
       * what re-points the citation from A555 to A550 - the rule is proved by
       * assertDerivationRules() on all 120 approved lines before we get here. */
      const r = hit.item;
      /* Whose label? This room's own DB row is the default, because the DB
       * writes some tags differently per type (the King GR-302 row reads
       * 'Vanity @ Guest Bath (Left & Right)', verbatim off the A550 furnishings
       * legend, where the QQ row reads just 'Vanity @ Guest Bath'). The donor
       * label is carried ONLY when it EXTENDS this room's label - the
       * submittal-enrichment case (the disposer gains '- Moen MGXP33C'), the
       * one case where the donor knows something the DB does not. Neither
       * branch authors text; both quote a document. */
      const donorExtends = r.label.length > line.sqlite.label.length && r.label.startsWith(line.sqlite.label);
      if (r.label !== line.sqlite.label) {
        donorLabelNotes.push((line.code || '<untagged>') + ': ' +
          (donorExtends
            ? 'donor label extends sqlite (' + JSON.stringify(r.label) + ') - donor text carried'
            : 'this room\'s own sqlite label ' + JSON.stringify(line.sqlite.label) +
              ' differs from donor ' + JSON.stringify(r.label) + ' - own row carried'));
      }
      if (r.qty !== line.qty) {
        donorQtyNotes.push(line.code + ': qty ' + line.qty + ' here vs ' + r.qty + ' in donor room ' + refNo +
          ' (sqlite governs; donor supplies text only)');
      }
      pkg = {
        label: donorExtends ? r.label : line.sqlite.label,
        src: line.sqlite.src,
        reliability: r.reliability,
        instanceNote: r.instanceNote,
        trade: r.trade,
        derived: r.derived,
        attachments: r.attachments,
      };
      fromDonor.push(line.code || '<untagged>');
    } else {
      /* TYPE-ONLY tag: no approved source exists anywhere. Everything comes
       * from the DB row, verbatim. The flag prefix mirrors the shape the
       * approved MEDIUM lines already carry; nothing is authored here. */
      const note = line.sqlite.note || '';
      pkg = {
        label: line.sqlite.label,
        src: line.sqlite.src,
        reliability: line.sqlite.reliability,
        instanceNote: note ? (line.sqlite.reliability === 'HIGH' ? note : '\u2691 ' + note) : '',
        trade: line.sqlite.trade,
        derived: line.sqlite.derived,
        attachments: undefined,
      };
      fromSqlite.push((line.code || '<untagged>') + (line.sqlite.reliability !== 'HIGH' ? ' [' + line.sqlite.reliability + ']' : ''));
    }

    if (pkg.src === '') {
      report.unresolved.push(line.key + ' (' + (line.code || '<untagged>') + '): no source sheet in sqlite and none in the reference - refusing to emit an uncited line');
      continue;
    }

    if (composed) {
      /* Austin ruling D19 applies to the FF&E doc exactly as it does to the MEP
       * doc. HD-14 and HD-5.1 are Configuration B lines flagged for one reason
       * only - tub or roll-in - and the owner has answered that. */
      const ruledRow = line.rows.find((r) => configBIsRuled(red.drops, r));
      if (ruledRow) {
        pkg.reliability = CONFIG_RULED_RELIABILITY;
        pkg.instanceNote = configBRuledNote(red.drops.ruling, roomNo, ruledRow);
        ruledClosed.push(line.key + ' (' + ruledRow.item_id + ')');
      }
      /* A ruling that overrode the row count has to say so on the line, or the
       * note ends up contradicting the number right next to it. */
      if (line.overrideChanged) {
        const own = line.sqlite.note
          ? " This room's own row is a single transcribed tag - data/project.sqlite note, verbatim: \"" +
            line.sqlite.note + '".'
          : " This room's own rows number " + line.rawRows + '.';
        pkg.instanceNote = 'Austin ruling ' + line.overrideRuling + ': ' + line.overrideBecause + '.' + own +
          ' The line therefore ships qty ' + line.qty + ' on the ruling rather than on the ' + line.rawRows +
          ' row(s) the drawing set tags. Confirm both positions in the field before ordering.';
        overrideNotes.push(line.key + ': qty ' + line.rawRows + ' -> ' + line.qty + ' per ruling ' + line.overrideRuling);
      }
    }

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
      checked: CLEAN_FIELD_STATE.checked,
      initials: CLEAN_FIELD_STATE.initials,
      checkedAt: CLEAN_FIELD_STATE.checkedAt,
      checkedAtLocal: CLEAN_FIELD_STATE.checkedAtLocal,
      issue: CLEAN_FIELD_STATE.issue,
      issueResolved: CLEAN_FIELD_STATE.issueResolved,
    };
    /* Omitted entirely - not null, not 1 - when no drawing states a count. */
    if (line.qtyUnknown) delete item.qty;
    if (Array.isArray(pkg.attachments) && pkg.attachments.length) item.attachments = clone(pkg.attachments);
    items[line.key] = item;
  }

  if (!composed) {
    /* Same-type path only: anything in the reference we did not reproduce is a
     * hole. A composed type legitimately does not carry the donor's whole set. */
    const producedKeys = new Set(red.lines.map((l) => l.key));
    /* A tag this run deliberately corrected is EXPECTED to stop being produced
     * under its old key. That is the ruling doing its job, not a hole. It is
     * still recorded, and the old line is tombstoned rather than dropped. */
    const supersededKeys = new Set(corrections.map((c) => tagSlug(c.from) + '_a'));
    for (const k of Object.keys(ref.items).sort(cmpStr)) {
      if (producedKeys.has(k)) continue;
      if (supersededKeys.has(k)) {
        const c = corrections.find((x) => tagSlug(x.from) + '_a' === k);
        report.superseded = report.superseded || [];
        report.superseded.push(k + ' (' + c.from + ') superseded by ' + tagSlug(c.to) + '_a (' + c.to +
          ') under ruling ' + c.ruling);
        continue;
      }
      report.unresolved.push((ref.items[k].code || '<untagged>') + ' (key ' + k + ') present in room ' +
        refNo + ' but not produced from sqlite for ' + roomNo);
    }
  } else {
    const produced = new Set(red.lines.map((l) => donorKey(l.category, l.code, l.key)));
    report.donorUnused = [...refIndex.keys()].filter((k) => !produced.has(k))
      .map((k) => refIndex.get(k).item.code || '<untagged>').sort(cmpStr);
  }

  if (report.unresolved.length) {
    die('room ' + roomNo + ': ' + report.unresolved.length +
        ' unresolved line(s) - refusing to write a partial room:\n  ' + report.unresolved.join('\n  '));
  }

  report.ffeLines = Object.keys(items).length;
  report.refRoom = refNo;
  report.composed = !!composed;
  report.donorRoom = donorNo;
  report.fromDonor = fromDonor.sort(cmpStr);
  report.fromSqlite = fromSqlite.sort(cmpStr);
  report.donorQtyNotes = donorQtyNotes;
  report.donorLabelNotes = donorLabelNotes;
  report.roomType = roomType;
  report.rawRows = red.rawCount;
  report.gatedRows = red.gatedCount;
  report.foldedGroups = red.foldedGroups;
  report.unknownCategories = red.unknownCategories;
  report.configDropped = red.configDropped;
  report.configRuling = red.configRuling;
  report.configBLeft = red.configBLeft;
  report.ffeRuledClosed = ruledClosed.sort(cmpStr);
  report.correctedLines = correctedLines.sort(cmpStr);
  report.qtyOverrideNotes = overrideNotes.sort(cmpStr);
  report.qtyUnknown = red.lines.filter((l) => l.qtyUnknown).map((l) => l.code || '<untagged>').sort(cmpStr);

  /* Doc-level identity. For an approved type it is copied. For a composed type
   * the slug is derived (rule proved against all three approved docs) and the
   * label is rooms.display_label - a value read off A100, not authored here. */
  const type = composed ? typeSlug(roomType) : ref.type;
  const typeLabel = composed ? room.display_label : ref.typeLabel;
  if (!typeLabel) die('room ' + roomNo + ': rooms.display_label is empty - no label to carry');
  report.docType = type;
  report.docTypeLabel = typeLabel;

  return {
    number: room.room_no,
    floor: Number.parseInt(room.floor, 10),
    type,
    typeLabel,
    schemaV: ref.schemaV,
    items,
    notes: buildRoomNotes(db, roomNo, room, rows, stamp, report),
    deleted: false,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

/* ================================================================= composed MEP */

const isMepRow = (r) => MEP_CATEGORIES.has(r.category);

/** 'A55x' is the database's own type-neutral wildcard for "this room's A55-series
 *  guestroom sheet". Resolving it is a substitution, not an inference. */
const resolveSheetWildcard = (text, roomSheet) => String(text || '').replace(/A55x/g, roomSheet);

/** Citations are written as '; '-separated segments throughout the DB and the
 *  approved slice. Split / rejoin without reordering or reformatting. */
const citeSegments = (s) => String(s || '').split(';').map((x) => x.trim()).filter(Boolean);
const citeJoin = (a) => a.join('; ');

/* The two kinds of SHEET-SPECIFIC number a citation can carry. A view number
 * means a different drawing on a different sheet; a keynote number means a
 * different note. Both are matched so that neither can be carried across a
 * sheet boundary by accident. 'views 04/04.1 and 07' is ONE token holding
 * three numbers, and each number is judged on its own. */
const CITE_VIEW_TOKEN = /\b(views?|elevations?|el\.)(\s*)(\d+(?:\.\d+)?(?:\s*(?:\/|and|,|\+)\s*\d+(?:\.\d+)?)*)/gi;
const CITE_KN_TOKEN = /\b(keyed notes?|keynotes?|kn)(\s*\.?\s*)(\d+(?:\s*(?:\/|and|,)\s*\d+)*)/gi;
const citeNums = (list) => String(list).split(/\s*(?:\/|and|,|\+)\s*/).filter(Boolean);
const citeViewNumbers = (t) => new Set([...String(t || '').matchAll(CITE_VIEW_TOKEN)].flatMap((m) => citeNums(m[3])));
const citeKeynoteNumbers = (t) => new Set([...String(t || '').matchAll(CITE_KN_TOKEN)].flatMap((m) => citeNums(m[3])));

/**
 * Prove that the D10 condensation map accounts for EVERY MEP row in the donor
 * room. If a donor row is neither condensed onto a line nor listed as rough-in,
 * this tool does not know what the approved doc did with it and must not guess.
 */
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

/**
 * Prove - from the database, not from a comment - that A550 and A555 share
 * their keynote AND their view numbering, and that the '.1' suffix on a view
 * means the CONNECTING variant of that view. This is the rule that lets a King
 * citation be re-pointed off the Queen-Queen sheet instead of being copied.
 */
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

/** Re-prove the DB evidence behind every hard-coded room-sheet resolution. */
function assertRoomSheetResolution(db) {
  const out = [];
  const tagsOf = (no) => new Map(db.prepare(
    'SELECT tag, primary_sheet FROM room_items WHERE room_no = ? AND tag IS NOT NULL').all(no)
    .map((x) => [x.tag, x.primary_sheet]));
  for (const [roomNo, r] of Object.entries(ROOM_SHEET_RESOLUTION)) {
    const here = tagsOf(roomNo), there = tagsOf(r.otherRoom);
    const bad = [];
    for (const t of r.onlyHere) {
      if (!here.has(t)) bad.push('room ' + roomNo + ' does not carry ' + t);
      else if (here.get(t) !== r.sheet) bad.push('room ' + roomNo + ' ' + t + ' primary_sheet is ' + JSON.stringify(here.get(t)) + ', expected ' + JSON.stringify(r.sheet));
      if (there.has(t)) bad.push('room ' + r.otherRoom + ' also carries ' + t + ' - it does not separate the two sheets');
    }
    for (const t of r.onlyThere) {
      if (here.has(t)) bad.push('room ' + roomNo + ' carries ' + t + ', which belongs to ' + r.otherSheet);
      if (!there.has(t)) bad.push('room ' + r.otherRoom + ' does not carry ' + t);
      else if (there.get(t) !== r.otherSheet) bad.push('room ' + r.otherRoom + ' ' + t + ' primary_sheet is ' + JSON.stringify(there.get(t)));
    }
    if (bad.length) {
      die('the room-sheet resolution for room ' + roomNo + ' is NOT supported by the database:\n  ' + bad.join('\n  '));
    }
    out.push('room ' + roomNo + ' -> ' + r.sheet + ' (' + r.why + ')');
  }
  return out;
}

/** This room's own A55-series guestroom sheet, off room_types, resolved where the DB is ambiguous. */
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

/* ===========================================================================
 * CITATIONS ARE NOT STRINGS TO BE SEARCH-AND-REPLACED.
 *
 * The 2026-08-20 regression: the King MEP citations were "fixed" by running
 * A555 -> A550 across the whole citation string. That rewrote the SHEET NAME,
 * which was the intent, and it silently rewrote every VIEW NUMBER with it,
 * which was not. 'A555 view 06 (SD symbol)' became 'A550 view 06' - but view
 * 06 on A550 is the entry / mirror wall elevation (ITM-0143 and ITM-0144 both
 * cite 'A550 el.06'), and 'A555 KN24 view 07' became 'A550 KN24 view 07' when
 * A550 view 07 is the bed / sofa wall elevation (ITM-0141, 'A550 el.07') and
 * the room's OWN thermostat row ITM-0060 cites 'A550 KN24' with no view at all.
 *
 * So the rule here is narrow and it is enforced number by number:
 *
 *   1 'A550/A555 ...' names BOTH sheets and is type-neutral. Never touched.
 *   2 the SHEET NAME is mapped: A555 -> this room's own guestroom sheet.
 *   3 every VIEW and KEYNOTE number is kept ONLY if assertSheetNumberingShared()
 *     proved that exact number shared - by the database's own 'A55x' wildcard
 *     (holds on any A55-series sheet) or by a two-sheet pair proof (holds for
 *     A550 vs A555 and nothing else). Anything else is REMOVED, not rewritten.
 *   4 a '.1' view is the CONNECTING variant and is removed where the room is
 *     not a connecting key.
 *   5 where step 3 strips a segment down to a bare sheet name, THIS ROOM'S OWN
 *     rows supply the replacement citation if it has any. If it has none, the
 *     sheet stands alone and the line's note says why.
 * =========================================================================== */

/**
 * Rewrite ONE citation segment that names the donor sheet.
 * Returns { text, removed, connectingRemoved }.
 */
function repointCiteSegment(seg, roomSheet, isConnecting, numbering) {
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
  out = out.split(MEP_DONOR_SHEET).join(roomSheet);
  return { text: out, removed, connectingRemoved };
}

/**
 * Compose this room's citation for one condensed MEP line.
 *   donorSrc  the approved Queen-Queen line's citation
 *   mine      THIS room's own room_items rows that feed this line
 * Returns { src, note, removed, connectingRemoved, ownUsed }.
 */
function composeMepCitation(donorSrc, mine, roomSheet, isConnecting, numbering) {
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
    if (!seg.includes(MEP_DONOR_SHEET) || BOTH.test(seg)) { kept.push(seg); continue; }
    const r = repointCiteSegment(seg, roomSheet, isConnecting, numbering);
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
    outcome = ownUsed ? "replaced by this room's own row(s) " + ownRowIds.join(', ')
      : survivors.length ? 'proven sheet-independent numbering kept: ' + survivors.join('; ')
      : 'sheet cited alone - this room has no row of its own';
    const how = ownUsed
      ? "This room's own row(s) " + ownRowIds.join(', ') + ' supply the ' + roomSheet + ' reference instead.'
      : survivors.length
        ? 'What is left - ' + survivors.map((x) => '"' + x + '"').join(', ') + ' - is numbering the database ' +
          "writes sheet-independently, so it holds on " + roomSheet +
          (ownRowIds.length ? " and this room's own row(s) " + ownRowIds.join(', ') + ' cite it too.' : '.')
        : 'This room has no row of its own that places this line on a guestroom sheet, so the sheet is cited ' +
          'with no view or keynote number at all. Confirm it on ' + roomSheet + ' before relying on one.';
    note = 'CITATION. The approved Queen-Queen line cites ' +
      donorQuoted.map((x) => '"' + x + '"').join(' and ') + ' on ' + MEP_DONOR_SHEET + '. ' +
      'data/project.sqlite proves ' + MEP_DONOR_SHEET + ' and ' + roomSheet + ' share only the numbers it writes ' +
      "sheet-independently ('A55x kn<n>', 'A55x view 02')" +
      (roomSheet === KING_PAIR_SHEET ? ' plus view 01, view 01.1, KN1 and view 08 on the A550/A555 pair' : '') +
      ', so ' + uniq.join(', ') + ' ' + (uniq.length > 1 ? 'are' : 'is') + ' NOT carried onto ' + roomSheet + '. ' + how;
  }

  return { src: citeJoin(kept), note, removed, connectingRemoved, ownUsed, ownRowIds, outcome };
}

/** The instanceNote shape the approved MEDIUM / FLAGGED lines already use. */
function sqliteNote(row) {
  const parts = [];
  if (row.instance_note) parts.push(row.instance_note);
  if (row.note) parts.push(row.note);
  const text = parts.join(' — ');
  if (!text) return '';
  return row.reliability === 'HIGH' ? text : '⚑ ' + text;
}

/* ===========================================================================
 * AUSTIN RULING D19, APPLIED - and what it deliberately does NOT close.
 *
 * D19 is the OWNER answering a direct question: room 118 is built to
 * Configuration B, the roll-in shower. A Configuration B line whose ONLY
 * reason for being flagged was "tub or roll-in?" is therefore not flagged any
 * more, and its note states the ruling once instead of arguing with itself.
 *
 * The test for "only reason" is not a keyword guess. The database writes ONE
 * identical `note` on every Configuration A and Configuration B row of the
 * room - that string IS the tub-versus-roll-in question - so a row whose note
 * is exactly that string, and nothing else, is flagged for that and for
 * nothing else. A row carrying any other note keeps its flag.
 *
 * What D19 does NOT close: A100 and G001 still print a 'T' (tub) mark for the
 * room and conflicts.md A11 / B4.4 are still formally OPEN. That is the
 * ARCHITECT'S to close, so it rides as a ROOM NOTE on both of the room's docs
 * rather than disappearing with the line flags.
 * =========================================================================== */

/* A ruled Config-B line is not HIGH: the configuration is settled by a ruling,
 * not by a corrected drawing, and the drawings still disagree. */
const CONFIG_RULED_RELIABILITY = 'MEDIUM';

/** The one note the DB writes on every Config-A / Config-B row of the room. */
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

/**
 * Is this row a Configuration B row whose ONLY reason for being flagged is the
 * question the ruling just closed? `drops` comes from configADrops(), which
 * already refused to drop anything without a ruling.
 */
function configBIsRuled(drops, row) {
  if (!drops || !drops.ruling || !row) return false;
  if (!String(row.description || '').startsWith(CONFIG_B_PREFIX)) return false;
  if (!drops.conflictNote) return false;
  return String(row.note || '') === drops.conflictNote;
}

/** The line note a ruled Configuration B line carries. States the ruling once. */
function configBRuledNote(ruling, roomNo, row) {
  const own = row && row.instance_note ? ' Row provenance: ' + row.instance_note + '.' : '';
  return 'Austin ruling ' + ruling + ' (the owner, asked directly on 2026-08-20): room ' + roomNo +
    ' is built to Configuration B, the ROLL-IN SHOWER. The Configuration A (TUB) rows are dropped from this ' +
    'room and this is a line that gets built.' + own +
    ' Reliability ' + CONFIG_RULED_RELIABILITY + ' rather than HIGH because the ruling closed the configuration, ' +
    'not the drawings: A100 and G001 still mark this room "T" (tub) and conflicts.md A11 / B4.4 are still open ' +
    'for the architect. See the room note.';
}

/**
 * The room note that carries what the ruling did NOT close. Quotes the
 * database's own words for the open conflict rather than paraphrasing them.
 * Used by both of the room's docs.
 */
function configRuledRoomNotes(db, roomNo, ruling, stamp) {
  if (!ruling) return {};
  const rows = db.prepare('SELECT description, note FROM room_items WHERE room_no = ?').all(roomNo);
  const conflict = configConflictNote(rows);
  /* Quote the part of the database's note that is STILL TRUE - the two
   * verbatim conflict extracts - rather than the whole thing. The sentences
   * before them ("Both are emitted. Neither is superseded. Only Austin can
   * close this.") were written while the question was open; D19 is Austin
   * closing it, so repeating them here would re-open it in the reader's head. */
  const cut = conflict ? conflict.indexOf('A11 verbatim:') : -1;
  const openPart = cut >= 0 ? conflict.slice(cut).trim() : conflict;
  const text = 'BATHING CONFIGURATION - RULED, WITH ONE THING STILL OPEN. Austin ruling ' + ruling +
    ' (the owner, asked directly on 2026-08-20): room ' + roomNo + ' is built to Configuration B, the ROLL-IN ' +
    'SHOWER. Every Configuration A (TUB) line is dropped from this room, and the Configuration B lines are the ' +
    'ones to build - they are no longer carried as an open conflict on this key. ' +
    'WHAT THE RULING DOES NOT CLOSE IS THE DRAWINGS, and that is the architect\'s to close, not the crew\'s: ' +
    'A100 and G001 both still mark room ' + roomNo + ' "T" (tub), and conflicts.md A11 and B4.4 are still ' +
    'formally OPEN on it. data/project.sqlite records the open part this way, verbatim: "' + openPart + '" ' +
    'The ruling supersedes the tub mark for construction. It does not correct the drawings. Nobody should order ' +
    'a bath package off either matrix, and the architect still owes a corrected A100 / G001, until A11 and B4.4 ' +
    'are closed.';
  return {
    n_config: { text, flag: 'info', resolved: false, createdAt: stamp, by: '' },
  };
}

/* ===========================================================================
 * THE ROOM'S OWN SPRINKLER TAKE-OFF.
 *
 * The approved donor line ships qty 1 and says the count varies by room. The
 * database holds one row PER HEAD for rooms 104 through 115 - King and
 * Queen-Queen alike - so the room can state its own take-off instead of
 * throwing those rows away. Shared by the copy path and the composed path so
 * that two rooms across a corridor from each other read the same way.
 * =========================================================================== */
const FP_HEADS_KEY = 'fp_heads_a';
const FP_HEADS_ITEM_IDS = new Set([
  ...(MEP_CONDENSED_SOURCES[FP_HEADS_KEY] || []),
  ...Object.keys(MEP_VARIANT_SLOTS).filter((id) => MEP_VARIANT_SLOTS[id] === FP_HEADS_KEY),
]);

/** This room's own sprinkler-head rows, in a deterministic order. */
const sprinklerRowsFor = (rows) => (rows || [])
  .filter((r) => FP_HEADS_ITEM_IDS.has(r.item_id))
  .slice()
  .sort((a, b) => cmpStr(String(a.item_id), String(b.item_id)));

/**
 * Fold the room's own heads into the approved line. Returns null when the room
 * has no sprinkler rows of its own (116 and 118 have none), in which case the
 * approved line stands untouched.
 */
function sprinklerTakeoff(roomNo, heads, src, instanceNote) {
  if (!heads || !heads.length) return null;
  const positions = heads.map((r) => r.instance_note).filter(Boolean).join('; ');
  const extras = [...new Set(heads.map((r) => r.note).filter(Boolean))].join(' ');
  const cites = [...new Set(heads.map((r) => r.source_sheet).filter(Boolean))];
  if (!String(instanceNote).includes(FP_COUNT_SENTENCE)) {
    die('room ' + roomNo + ': approved ' + FP_HEADS_KEY + ' instanceNote no longer contains the head-count sentence');
  }
  const own = "this room's own take-off is " + heads.length + ' concealed pendent head(s) on drops — ' +
    positions + '. ' + (extras ? extras + '. ' : '') + 'Verify every head you can see.';
  return {
    qty: heads.length,
    src: citeJoin([...new Set([...citeSegments(src), ...cites])]),
    instanceNote: String(instanceNote).replace(FP_COUNT_SENTENCE, own),
    report: FP_HEADS_KEY + ': ' + heads.length + ' room-specific sprinkler head row(s) carried (' +
      heads.map((r) => r.item_id).join(', ') + ')',
  };
}

/**
 * Configuration A (TUB) rows, matched on the DATABASE'S OWN description prefix.
 * Returns the set of rowids to drop. Refuses to drop anything without a ruling,
 * and refuses to drop if it would leave the room with no Configuration B row.
 */
function configADrops(roomNo, rows) {
  const a = rows.filter((r) => String(r.description || '').startsWith(CONFIG_A_PREFIX));
  const b = rows.filter((r) => String(r.description || '').startsWith(CONFIG_B_PREFIX));
  if (!a.length) return { ids: new Set(), ruling: null, a: [], b };
  const ruling = CONFIG_A_DROP_ROOMS[roomNo];
  if (!ruling) {
    die('room ' + roomNo + ' carries ' + a.length + ' "' + CONFIG_A_PREFIX +
        '" row(s) and no ruling closes the tub-versus-roll-in question for it. Not guessing.');
  }
  if (!b.length) {
    die('room ' + roomNo + ': dropping the ' + a.length + ' Configuration A (TUB) row(s) per ruling ' +
        ruling + ' would leave NO Configuration B (ROLL-IN SHOWER) row behind - that would delete the ' +
        "room's bathing package outright. Refusing.");
  }
  return { ids: new Set(a.map((r) => r.rowid)), ruling, a, b, conflictNote: configConflictNote(rows) };
}

/**
 * Build the MEP doc for a COMPOSED room type from that room's own rows.
 * Shape and wording: the approved donor's 22 condensed lines.
 * Citations, marks, counts: this room's own room_items.
 */
function buildComposedMepDoc(db, roomNo, room, rows, slice, donorNo, floor, stamp, report, identity, numbering) {
  const ref = slice.docs[donorNo + '-MEP'];
  if (!ref) die('room ' + roomNo + ': approved slice has no ' + donorNo + '-MEP to take the D10 shape from');
  if (ref.type !== MEP_DOC_TYPE) die('room ' + roomNo + ': ' + donorNo + '-MEP type is not ' + JSON.stringify(MEP_DOC_TYPE));

  const donorLive = {};
  let skippedDeleted = 0;
  for (const k of Object.keys(ref.items)) {
    if (ref.items[k].deleted) { skippedDeleted++; continue; }
    donorLive[k] = ref.items[k];
  }

  const donorRows = readRoom(db, MEP_DONOR_ROOM).rows.filter(isMepRow);
  const donorById = new Map(donorRows.map((r) => [r.item_id, r]));
  const keyOfDonorItem = new Map();
  for (const [key, ids] of Object.entries(MEP_CONDENSED_SOURCES)) for (const id of ids) keyOfDonorItem.set(id, key);

  const roomSheet = roomSheetFor(db, room, roomNo);
  const isConnecting = String(room.connecting) === '1';
  const drops = configADrops(roomNo, rows);

  /* Classify every MEP row this room has. Nothing may fall through. */
  const support = new Map();
  const newRows = [];
  const roughIn = [];
  const droppedHere = [];
  for (const r of rows) {
    if (!isMepRow(r)) continue;
    if (drops.ids.has(r.rowid)) { droppedHere.push(r); continue; }
    const key = keyOfDonorItem.get(r.item_id) || MEP_VARIANT_SLOTS[r.item_id] || null;
    if (key) {
      if (!(key in donorLive)) die('room ' + roomNo + ': row ' + r.item_id + ' maps to MEP line ' + key + ', which is not live in ' + donorNo + '-MEP');
      if (!support.has(key)) support.set(key, []);
      support.get(key).push(r);
    } else if (MEP_ROUGH_IN_ITEMS.includes(r.item_id)) {
      roughIn.push(r);
    } else {
      newRows.push(r);
    }
  }

  const items = {};
  const repointed = [];
  const citationDropped = [];
  const connectingDropped = [];
  const resolutions = [];
  const ruledClosed = [];

  for (const key of Object.keys(donorLive).sort(cmpStr)) {
    const d = donorLive[key];
    const mine = support.get(key) || [];
    const variants = mine.filter((r) => MEP_VARIANT_SLOTS[r.item_id] === key);
    const variant = variants[0] || null;
    const donorVariant = (MEP_CONDENSED_SOURCES[key] || []).map((id) => donorById.get(id)).find(Boolean) || null;

    let code = d.code, label = d.label, reliability = d.reliability, trade = d.trade;
    let derived = d.derived, qty = d.qty, instanceNote = d.instanceNote;
    /* Citations: sheet name mapped, every view and keynote number judged on its
     * own, this room's own rows preferred over the donor's string. */
    const cite = composeMepCitation(d.src, mine, roomSheet, isConnecting, numbering);
    let src = cite.src;
    let citeNote = cite.note;
    if (src !== d.src) repointed.push(key);
    if (cite.removed.length) {
      citationDropped.push(key + ': ' + [...new Set(cite.removed)].join(', ') + ' -> ' + cite.outcome);
    }
    /* A '.1' view is the CONNECTING variant of that view. Reported, never
     * sniffed for with a bare '.1' test, which also matches 'Art. 210.12'. */
    if (cite.connectingRemoved.length) connectingDropped.push(key);

    const rowDiffers = variant && donorVariant && variant.description !== donorVariant.description;

    if (rowDiffers && MEP_LABEL_FROM_ROW.has(key)) {
      /* The approved label IS the product description, and this room's product
       * is a different one. Rebuild the line from this room's own row; the key,
       * the category and the sort stay the approved ones. */
      code = variant.tag || '';
      label = variant.description;
      src = resolveSheetWildcard(variant.source_sheet || variant.primary_sheet || '', roomSheet);
      reliability = variant.reliability;
      trade = variant.trade_responsible || '';
      derived = variant.derived;
      instanceNote = sqliteNote(variant);
      citeNote = '';   /* the citation is this room's own row now, not the donor's string */
      if (configBIsRuled(drops, variant)) {
        reliability = CONFIG_RULED_RELIABILITY;
        instanceNote = configBRuledNote(drops.ruling, roomNo, variant);
        ruledClosed.push(key + ' (' + variant.item_id + ')');
      }
      resolutions.push(key + ": rebuilt from this room's own row " + variant.item_id);
    }

    if (key === 'mech_ptac' && variant) {
      /* Resolve the mark the donor room could not. */
      code = variant.tag || code;
      if (!citeSegments(d.src).some((x) => x === PTAC_DONOR_M401)) {
        die('room ' + roomNo + ': approved mech_ptac src no longer contains ' + JSON.stringify(PTAC_DONOR_M401) +
            ' - the PTAC resolution was written against that text and must not run blind');
      }
      const donorSegs = citeSegments(d.src).filter((x) => !/^M401\b/.test(x) && !/^A55\d/.test(x));
      const mineSegs = citeSegments(resolveSheetWildcard(variant.source_sheet || '', roomSheet));
      src = citeJoin([...mineSegs, ...donorSegs]);
      citeNote = '';   /* every A55-series segment came from this room's own row */
      if (!String(instanceNote).includes(PTAC_NAMEPLATE)) {
        die('room ' + roomNo + ': approved mech_ptac instanceNote no longer contains the nameplate sentence');
      }
      const why = variant.note ? ' — "' + variant.note + '"' : '';
      const resolved = "This room's own row resolves the mark: " + (variant.tag || '(untagged)') +
        ' (data/project.sqlite room_items ' + variant.item_id + ', reliability ' + variant.reliability + ')' + why + '.';
      instanceNote = String(instanceNote).replace(PTAC_NAMEPLATE, resolved + ' ' + PTAC_NAMEPLATE);
      resolutions.push('mech_ptac: mark resolved to ' + (variant.tag || '(untagged)') + ' from ' + variant.item_id);
    }

    if (key === FP_HEADS_KEY) {
      const heads = sprinklerRowsFor(mine);
      const take = sprinklerTakeoff(roomNo, heads, src, instanceNote);
      if (take) { qty = take.qty; src = take.src; instanceNote = take.instanceNote; resolutions.push(take.report); }
    }

    if (!src) die('room ' + roomNo + ': MEP line ' + key + ' would carry no citation');
    if (citeNote) instanceNote = (instanceNote ? instanceNote + ' ' : '') + citeNote;

    items[key] = {
      id: key, code, label, category: d.category, qty, src, reliability, instanceNote,
      trade, derived, sort: d.sort, deleted: false, ...CLEAN_FIELD_STATE,
    };
    if (Array.isArray(d.attachments) && d.attachments.length) items[key].attachments = clone(d.attachments);
  }

  /* Rows this room has that the donor does not, and that no condensed line
   * claims. They become their own lines - never silently lost. */
  const nextSort = new Map();
  for (const v of Object.values(items)) {
    nextSort.set(v.category, Math.max(nextSort.get(v.category) || 0, v.sort));
  }
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
    if (configBIsRuled(drops, r)) {
      reliability = CONFIG_RULED_RELIABILITY;
      note = configBRuledNote(drops.ruling, roomNo, r);
      ruledClosed.push(key + ' (' + r.item_id + ')');
    }
    items[key] = {
      id: key, code: r.tag || '', label: r.description, category: c, qty: 1, src,
      reliability, instanceNote: note, trade: r.trade_responsible || '',
      derived: r.derived, sort: base, deleted: false, ...CLEAN_FIELD_STATE,
    };
    added.push((r.tag || '<untagged>') + ' [' + c + '] ' + r.item_id);
  }

  report.mepLines = Object.keys(items).length;
  report.mepSkippedDeleted = skippedDeleted;
  report.mepRefRoom = donorNo + '-MEP';
  report.mepComposed = true;
  report.mepRoomSheet = roomSheet;
  report.mepConnecting = isConnecting;
  report.mepRepointed = repointed.sort(cmpStr);
  report.mepCitationDropped = citationDropped.sort(cmpStr);
  report.mepRuledClosed = ruledClosed.sort(cmpStr);
  report.mepConnectingDropped = connectingDropped.sort(cmpStr);
  report.mepResolutions = resolutions;
  report.mepAdded = added;
  report.mepRoughIn = roughIn.length;
  report.mepDropped = droppedHere.map((r) => (r.tag || '<untagged>') + ' [' + r.category + '] ' + r.item_id + ' - ' + r.description.slice(0, 70));
  report.mepDropRuling = drops.ruling;
  report.mepUnsupported = Object.keys(donorLive).filter((k) => !(support.get(k) || []).length).sort(cmpStr);

  return {
    number: roomNo + '-MEP',
    floor,
    type: MEP_DOC_TYPE,
    typeLabel: identity.typeLabel,
    schemaV: ref.schemaV,
    items,
    /* The bathing-configuration ruling and what it does NOT close belong on
     * both sheets: four of the six ruled lines live here, not on the FF&E doc. */
    notes: configRuledRoomNotes(db, roomNo, drops.ruling, stamp),
    deleted: false,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

function buildMepDoc(db, roomNo, rows, slice, refNo, floor, stamp, report, identity) {
  const ref = slice.docs[refNo + '-MEP'];
  if (!ref) die('room ' + roomNo + ': approved slice has no ' + refNo + '-MEP to copy');
  if (ref.type !== MEP_DOC_TYPE) {
    die('room ' + roomNo + ': ' + refNo + '-MEP type is ' + JSON.stringify(ref.type) +
        ', expected ' + JSON.stringify(MEP_DOC_TYPE));
  }

  /* The live lines only. The reference's deleted:true rows are that room's own
   * supersede history (their ids are per-room randoms, disjoint between 101,
   * 103 and 105); copying them into a brand new room would fabricate a history
   * that never happened and duplicate ids across rooms. */
  const items = {};
  let skippedDeleted = 0;
  for (const k of Object.keys(ref.items).sort(cmpStr)) {
    const v = ref.items[k];
    if (v.deleted) { skippedDeleted++; continue; }
    const item = clone(v);
    item.checked = CLEAN_FIELD_STATE.checked;
    item.initials = CLEAN_FIELD_STATE.initials;
    item.checkedAt = CLEAN_FIELD_STATE.checkedAt;
    item.checkedAtLocal = CLEAN_FIELD_STATE.checkedAtLocal;
    item.issue = CLEAN_FIELD_STATE.issue;
    item.issueResolved = CLEAN_FIELD_STATE.issueResolved;
    item.deleted = false;
    item.id = k;
    items[k] = item;
  }

  /* The one thing a straight copy used to throw away: this room's OWN Fire
   * Sprinkler rows. The database holds three of them for every room 104-115,
   * so a Queen-Queen states its own head-by-head take-off exactly the way the
   * King rooms already do. Nothing else in the copy is touched. */
  const resolutions = [];
  const fp = items[FP_HEADS_KEY];
  if (fp) {
    const take = sprinklerTakeoff(roomNo, sprinklerRowsFor(rows), fp.src, fp.instanceNote);
    if (take) {
      fp.qty = take.qty;
      fp.src = take.src;
      fp.instanceNote = take.instanceNote;
      resolutions.push(take.report);
    }
  }

  report.mepLines = Object.keys(items).length;
  report.mepSkippedDeleted = skippedDeleted;
  report.mepRefRoom = refNo + '-MEP';
  report.mepResolutions = resolutions;

  return {
    number: roomNo + '-MEP',
    floor,
    type: MEP_DOC_TYPE,
    /* The MEP LINES are the proven type-level constant. The doc's own label is
     * this room's label, not the donor's - a King room is not a 'QQ Studio'. */
    typeLabel: identity.typeLabel,
    schemaV: ref.schemaV,
    items,
    notes: {},
    deleted: false,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

/* ===========================================================================
 * FLOOR-1 COMMON AREAS ("spaces" mode)  -  added 2026-08-20
 *
 * Austin's ruling D18: floor-1 common areas use the PLAN numbering from the
 * architectural drawings, which is exactly what data/project.sqlite `spaces`
 * carries (39 rows where floor='1', primary_sheet A100 for the numbered rooms,
 * ID-1.9 / ID-1.7 for the two exterior FF&E zones). The QC Deficiency Tracker
 * numbering is NOT used anywhere in this path.
 *
 * WHAT IS THE SAME AS A GUEST ROOM
 *   - the category gate (GATE_CATEGORIES -> FF&E doc, MEP_CATEGORIES -> MEP doc)
 *   - fold duplicate rows by tag into a quantity
 *   - sort bands, key scheme, soft delete (deleted:false, never destroyed)
 *   - CLEAN_FIELD_STATE: every space line is born clean
 *   - label / src / reliability / instanceNote / trade / derived come from
 *     sqlite columns, using the SAME derivation rules assertDerivationRules()
 *     re-proves against all 120 approved guest-room lines on every run.
 *
 * WHAT IS DIFFERENT, AND WHY
 *
 *  a NO DONOR EXISTS. slice-f1.json holds no approved common-area doc, so there
 *    is no curated package to carry. Every field is sqlite verbatim - the same
 *    branch the King "type-only tag" path uses. Nothing is composed, nothing is
 *    borrowed from a guest room. js/seed-spaces.js does hold two hand-built
 *    fixtures (019, 121) but its own header calls them "demo-mode fixtures", so
 *    they are used as a CROSS-CHECK (assertSpaceFixtureAgreement) and never as
 *    a source.
 *
 *  b FOLD KEY IS (category, tag, source_sheet), NOT (category, tag).
 *    This is the one substantive change, and it exists to stop the tool
 *    silently resolving a conflict Austin has not ruled on. The database
 *    deliberately carries unresolved sheet disagreements as extra "delta" rows:
 *    Lobby 003 PA-102 is 6 rows sourced "A510.3 x6" plus 2 rows sourced
 *    "ID-1.7 prints (8) vs A510.3 x6". Folding on (category, tag) alone sums
 *    them to 8 - which is not a count any single sheet states, it is this tool
 *    picking the larger of two conflicting sheets. On ZONE-B OF-715 that same
 *    fold would pick 5 (ID-1.7, 07/04/2025) over 3 (AS104 Rev 5, 04/09/26),
 *    contradicting the database's own recorded precedence reasoning.
 *    Adding source_sheet to the key splits exactly those disagreements into
 *    separate, separately-cited lines and leaves every other group untouched.
 *    Across all floor-1 gated rows it splits 6 groups and no others, and
 *    assertSpaceMultipliers() then proves that EVERY documented "N of M"
 *    multiplier equals its group's row count, with zero exceptions. Under the
 *    plain (category, tag) fold that same check fails on 4 groups.
 *
 *  c QUANTITY CAN BE ABSENT. A guest-room line always has a qty because a
 *    guest-room row set is a takeoff. Many public-area tags are placed on the
 *    sheet with NO count printed anywhere - the database says so in its own
 *    words ("Count NOT stated on any sheet. One row emitted; quantity FLAGGED",
 *    "No multiplier on either sheet"). For those, `qty` is OMITTED from the
 *    line rather than defaulted to 1, and the reason is written into
 *    instanceNote. The renderers all test `it.qty > 1`, so an absent qty simply
 *    shows no multiplier badge - it never displays as 0 or NaN.
 *    An omitted qty is recoverable; a fabricated 1 is not.
 *
 *  d THE FF&E INSTALLATION WORKBOOK IS NOT A QUANTITY SOURCE. Its "1st Floor
 *    FF&E Installation" tab carries the public-area rows PA-100..PA-807-3 plus
 *    PV-36 with tags and container numbers filled in and EVERY TOTAL BLANK.
 *    It is therefore not consulted for counts by this tool at all, and no
 *    public-area quantity anywhere in this path comes from it.
 *
 *  e DOC IDS ARE PREFIXED. Guest rooms use the bare room number and require
 *    number == docId. Spaces need the same discipline but must also satisfy the
 *    published Firestore rule d.number.size() <= 8, and must not be mistaken
 *    for a guest room. See SPACE_ID_PREFIX below.
 *
 *  f SPACES WITH NO GATED LINE ARE NOT BUILT. Stair 1 (100) has 12 documented
 *    rows, every one of them Flooring / Paint / Drywall / Doors - categories
 *    the approved gate keeps out of both docs. Emitting an empty checklist for
 *    it would tell the crew "nothing to verify here", which is false. Such
 *    spaces are refused and listed in the report instead.
 *
 * THE GATE DROPS A LOT, AND THAT IS REPORTED, NOT HIDDEN. 333 of the 759
 * floor-1 space_items rows fall in Flooring / FF&E - Misc / Doors / Paint /
 * Drywall / Wall Covering / Stone-Surround. The approved guest-room docs carry
 * none of those categories in either doc, so following Austin's approved
 * precedent means they land nowhere. reportSpaceGateDrops() prints the full
 * per-category, per-space breakdown so Austin can rule on it. Widening the gate
 * is a one-line change; it is HIS call, not this tool's.
 * =========================================================================== */

/* Doc id scheme. 'S' + the space number with every non-alphanumeric stripped:
 *   001 -> S001      033 -> S033      141 -> S141
 *   ZONE-A -> SZONEA          ZONE-B -> SZONEB
 * and the MEP companion takes a '-M' suffix:
 *   001 -> S001-M    ZONE-A -> SZONEA-M
 * Longest id in the whole floor-1 set is 'SZONEA-M' / 'SZONEB-M' at exactly 8
 * characters, so d.number.size() <= 8 holds with nothing to spare. The guest
 * rooms' '-MEP' suffix would make that id 10 characters and is why the space
 * companion is '-M'. assertSpaceIds() re-proves the length bound, the
 * number == docId identity and global uniqueness on every run. */
const SPACE_ID_PREFIX = 'S';
const SPACE_MEP_SUFFIX = '-M';
const SPACE_ID_MAX = 8;

/* Both space doc types start with 'space-'. That prefix is THE discriminator
 * the platform store and js/util.isSpaceDoc use to keep common areas out of the
 * guest-room lists (platform/js/core/store.js:72, js/store.js:97). */
const SPACE_MEP_DOC_TYPE = 'space-mep-punch';

/* FF&E band ordering reuses CATEGORY_ORDER. The MEP band reuses the app's own
 * five-group order (js/util.js MEP_CATEGORY_ORDER) so a space MEP sheet sorts
 * the way a guest-room MEP sheet does - Mechanical 1xxx, Electrical 2xxx,
 * Plumbing 3xxx, Fire Protection 4xxx, Low Voltage 5xxx, exactly as the
 * approved 101-MEP doc is numbered. 'Fire Sprinkler' and 'Fire Alarm' appear in
 * space_items but are NOT in the app's list; they are appended after it so the
 * five known indices keep their approved numbering, and the stored `category`
 * string is left VERBATIM - no row is relabelled 'Fire Protection' to make it
 * fit. reportSpaceUnknownMepCategories() flags them for the app side. */
const SPACE_MEP_ORDER = [
  'Mechanical', 'Electrical', 'Plumbing', 'Fire Protection', 'Low Voltage',
  'Fire Sprinkler', 'Fire Alarm',
];
const SPACE_MEP_INDEX = new Map(SPACE_MEP_ORDER.map((c, i) => [c, i]));
const APP_MEP_CATEGORY_ORDER = new Set([
  'Mechanical', 'Electrical', 'Plumbing', 'Fire Protection', 'Low Voltage',
]);

/* The database's own words for "this sheet places the tag but prints no count".
 * Matched against space_items.note ONLY, never authored. A line is emitted with
 * NO qty when it is a single row, its reliability is FLAGGED, and its note says
 * one of these. Anything else keeps qty = number of rows folded. */
const SPACE_NO_COUNT_RE =
  /no multiplier|count not stated|no count printed|not stated on any sheet|neither the window count|quantity flagged|no count/i;

/* A documented multiplier, as the database writes it: the whole note is "1 of 6",
 * or it ends with "; 1 of 4", optionally trailing a parenthetical like
 * "1 of 3 (model 1WD24K3)". Deliberately anchored so that "vanity position 1 of
 * 3" - a POSITION within a run of three differently-tagged lavatories, not a
 * multiplier - does not match. */
const SPACE_MULTIPLIER_RE = /(?:^|;\s*)(\d+) of (\d+)(?:\s*\([^)]*\))?$/;

const spaceIdSlug = (spaceNo) => String(spaceNo).toUpperCase().replace(/[^A-Z0-9]/g, '');
const spaceDocId = (spaceNo) => SPACE_ID_PREFIX + spaceIdSlug(spaceNo);
const spaceMepDocId = (spaceNo) => spaceDocId(spaceNo) + SPACE_MEP_SUFFIX;

/* 'WOMENS' -> 'space-womens', 'Guest Corridor' -> 'space-guest-corridor'.
 * Same slug function the guest-room doc types use, just prefixed. This
 * reproduces the two js/seed-spaces.js fixtures exactly, which is one of the
 * things assertSpaceFixtureAgreement() checks. */
const spaceTypeSlug = (name) => 'space-' + typeSlug(name);

/* --------------------------------------------------------- spaces: db read */

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

/* ------------------------------------------------- spaces: the reduction */

/**
 * Reduce one space's raw space_items rows to lines, for ONE band.
 * band is 'ffe' (GATE_CATEGORIES) or 'mep' (MEP_CATEGORIES).
 * Returns { lines, keptRows, foldedGroups, splitGroups, qtyUnknown }.
 */
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

/* -------------------------------------------------- spaces: the provers */

/**
 * Prove the fold key. For EVERY gated tag group on floor 1, if any of its rows
 * carries a documented multiplier ("1 of 6", "ZONE B (pool deck); 2 of 4"),
 * then that multiplier MUST equal the number of rows folded into the group.
 * This is what makes the (category, tag, source_sheet) key a derivation rather
 * than a preference: under the plain (category, tag) key this check FAILS.
 */
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

/** Doc-id discipline: number == docId, <= 8 chars, unique, disjoint from rooms. */
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

/**
 * Cross-check against js/seed-spaces.js. Those two docs (019, 121) are the only
 * other place a common-area doc has ever been built, and their own header calls
 * them demo fixtures - so a disagreement is REPORTED, never acted on, and they
 * are never used as a source. Agreement on the doc type slug is the useful
 * signal: it says the 'space-' + typeSlug(name) rule was not invented here.
 */
function spaceFixtureAgreement(db) {
  const path = resolve(REPO, 'js', 'seed-spaces.js');
  if (!existsSync(path)) return null;
  const src = readFileSync(path, 'utf8');
  const out = [];
  for (const m of src.matchAll(/"(\d{3})":\s*\{/g)) {
    const no = m[1];
    const tail = src.slice(m.index, m.index + 40000);
    const t = /"type":\s*"(space-[^"]+)"/.exec(tail);
    const row = db.prepare("SELECT name FROM spaces WHERE floor='1' AND space_no = ?").get(no);
    if (!t || !row) continue;
    out.push({ space: no, fixtureType: t[1], derivedType: spaceTypeSlug(row.name), agrees: t[1] === spaceTypeSlug(row.name) });
  }
  return out;
}

/** Rows the approved category gate keeps out of BOTH docs, by category and space. */
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

/** MEP categories present in space_items that the app's MEP_CATEGORY_ORDER lacks. */
function spaceUnknownMepCategories(db, floor = '1') {
  const out = new Map();
  for (const r of db.prepare("SELECT space_no, category, COUNT(*) c FROM space_items WHERE floor = ? GROUP BY space_no, category").all(floor)) {
    if (!MEP_CATEGORIES.has(r.category) || APP_MEP_CATEGORY_ORDER.has(r.category)) continue;
    if (!out.has(r.category)) out.set(r.category, []);
    out.get(r.category).push(r.space_no + ' x' + r.c);
  }
  return out;
}

/* ------------------------------------------------- spaces: doc generation */

/**
 * Tags the database records in MORE THAN ONE floor-1 space, on the SAME sheet,
 * where the rows themselves say so ("Also tagged at Elevator Lobby 137 ... -
 * separate rows, do not sum") and then give CONFLICTING answers - PA-501 is
 * recorded at Reception 004 as MEDIUM with a count and at Elev. Lobby 137 as
 * FLAGGED with none.
 *
 * This tool does not pick a winner. The tag is emitted ONCE, on the
 * lowest-numbered space that carries it, with NO quantity and reliability
 * FLAGGED, and every recorded position is written into the line note. The
 * space that loses the line gets a doc note saying so, so nobody standing in
 * that room thinks the tag was forgotten.
 */
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

/** The conflict, written out so Austin can rule on it from the line itself. */
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

/* ------------------------------------------------------- spaces: the driver */

function mainSpaces(db, slice, positional, opts) {
  const FLOOR = '1';
  const all = readSpaceList(db, FLOOR);
  const byNo = new Map(all.map((s) => [s.space_no, s]));

  /* Which spaces? 'all' or nothing means every floor-1 space. */
  let wanted;
  if (!positional.length || (positional.length === 1 && positional[0] === 'all')) {
    wanted = all.slice();
  } else {
    wanted = [];
    for (const a of positional) {
      const s = byNo.get(a) || byNo.get(a.toUpperCase());
      if (!s) {
        die('space ' + JSON.stringify(a) + ' is not a floor-1 space. Known: ' +
            all.map((x) => x.space_no).join(', '));
      }
      wanted.push(s);
    }
  }

  /* Provers run before anything is written. */
  const mult = assertSpaceMultipliers(db, FLOOR);
  const ids = assertSpaceIds(db, all);
  assertDerivationRules(db, slice);
  const drops = spaceGateDrops(db, FLOOR);
  const dups = spaceDuplicateTags(db, FLOOR);
  const dupReport = { dupKept: [], dupSuppressed: [] };
  const fixtures = spaceFixtureAgreement(db);
  const unknownMep = spaceUnknownMepCategories(db, FLOOR);

  const W = process.stdout.write.bind(process.stdout);
  W('\nFLOOR-1 COMMON AREAS  (Austin ruling D18 - PLAN numbering from the architectural set)\n');
  W('='.repeat(100) + '\n');
  W('spaces on floor 1 in data/project.sqlite: ' + all.length + '  (verified against the DB, not the brief)\n');
  W('doc id scheme: ' + JSON.stringify(SPACE_ID_PREFIX + '<space_no minus punctuation>') +
    ', MEP companion ' + JSON.stringify(SPACE_MEP_SUFFIX) + ' - ' + ids.count +
    ' ids, longest ' + JSON.stringify(ids.longest) + ' (' + ids.longest.length + ' chars, limit ' + SPACE_ID_MAX + ')\n');
  W('fold key proved: ' + mult.multipliersChecked + ' documented "N of M" multipliers across ' +
    mult.groupsChecked + ' gated tag groups, all equal to their folded row count\n');

  /* ---- build ---- */
  const built = [];
  const skipped = [];
  const rows = [];
  let totalFfe = 0, totalMep = 0, totalUnknownQty = 0;
  const allSplits = [];
  const mepOnlySpaces = [];
  const docs = {};

  for (const s of wanted) {
    const { space, rows: raw } = readSpace(db, s.space_no, FLOOR);
    const ffe = reduceSpaceBand(s.space_no, raw, 'ffe');
    const mep = reduceSpaceBand(s.space_no, raw, 'mep');
    const droppedHere = drops.bySpace.get(s.space_no);
    const dropped = droppedHere ? droppedHere.n : 0;

    rows.push({
      no: s.space_no, name: s.name, raw: raw.length,
      ffe: ffe.lines.length, mep: mep.lines.length,
      unknownQty: ffe.qtyUnknown.length + mep.qtyUnknown.length,
      dropped,
      docId: spaceDocId(s.space_no),
    });

    for (const sp of [...ffe.splitGroups, ...mep.splitGroups]) allSplits.push({ space: s.space_no, ...sp });

    if (!ffe.lines.length && !mep.lines.length) {
      /* Note (f): an empty checklist would read as "nothing to verify". */
      skipped.push({
        no: s.space_no, name: s.name, raw: raw.length, dropped,
        cats: droppedHere ? [...droppedHere.cats].map(([c, n]) => c + ' x' + n).sort(cmpStr) : [],
      });
      continue;
    }

    if (ffe.lines.length) {
      const doc = buildSpaceBandDoc(space, 'ffe', ffe, opts.stamp, dups, dupReport);
      docs[spaceDocId(s.space_no)] = doc;
      totalFfe += Object.keys(doc.items).length;
    }
    if (mep.lines.length) {
      /* A space with MEP lines and NO FF&E lines has no parent document to hang
       * an "-M" companion off, and the app reaches an MEP doc only through its
       * parent. Written that way, those lines exist in the seed and are
       * invisible in the app - which is worse than missing, because the count
       * looks right. So an MEP-only space owns the PARENT id outright: one
       * document, reachable, non-empty, nothing lost. */
      const mepOnly = !ffe.lines.length;
      const id = mepOnly ? spaceDocId(s.space_no) : spaceMepDocId(s.space_no);
      const doc = buildSpaceBandDoc(space, 'mep', mep, opts.stamp, dups, dupReport, mepOnly ? id : undefined);
      docs[id] = doc;
      totalMep += Object.keys(doc.items).length;
      if (mepOnly) mepOnlySpaces.push(s.space_no + ' ' + s.name + ' -> ' + id + ' (' + mep.lines.length + ' line(s), no FF&E band)');
    }
    totalUnknownQty += ffe.qtyUnknown.length + mep.qtyUnknown.length;
    built.push({
      no: s.space_no, name: s.name,
      ffe: ffe.lines.length, mep: mep.lines.length,
      qtyUnknown: [...ffe.qtyUnknown, ...mep.qtyUnknown],
    });
  }

  /* ---- the per-space table ---- */
  W('\nPER-SPACE LINE COUNTS\n' + '-'.repeat(100) + '\n');
  W('  no     name                              raw   FF&E    MEP  qty?  gated-out   doc id\n');
  for (const r of rows) {
    const thin = (r.ffe + r.mep) === 0 ? '  <- NO PACKAGE' : ((r.ffe + r.mep) <= 2 ? '  <- thin' : '');
    W('  ' + r.no.padEnd(7) + r.name.slice(0, 33).padEnd(34) +
      String(r.raw).padStart(4) + String(r.ffe).padStart(7) + String(r.mep).padStart(7) +
      String(r.unknownQty).padStart(6) + String(r.dropped).padStart(11) + '   ' +
      r.docId.padEnd(7) + thin + '\n');
  }
  W('-'.repeat(100) + '\n');
  W('  TOTAL  ' + rows.length + ' spaces' + String(rows.reduce((n, r) => n + r.raw, 0)).padStart(29) +
    String(totalFfe).padStart(7) + String(totalMep).padStart(7) + String(totalUnknownQty).padStart(6) +
    String(drops.total).padStart(11) + '\n');

  /* ---- the honest map ---- */
  if (skipped.length) {
    W('\nSPACES WITH NO PACKAGE UNDER THE APPROVED GATE - NO DOC WRITTEN (' + skipped.length + ')\n' + '-'.repeat(100) + '\n');
    for (const s of skipped) {
      W('  ' + s.no.padEnd(7) + s.name.padEnd(30) + s.raw + ' documented row(s), all gated out: ' +
        (s.cats.join(', ') || 'none - the space has no rows at all') + '\n');
    }
  }

  const thin = built.filter((b) => (b.ffe + b.mep) <= 2);
  if (thin.length) {
    W('\nTHIN PACKAGES - BUILT, BUT 1-2 LINES ONLY (' + thin.length + ')\n' + '-'.repeat(100) + '\n');
    for (const b of thin) W('  ' + b.no.padEnd(7) + b.name.padEnd(30) + b.ffe + ' FF&E + ' + b.mep + ' MEP\n');
  }

  if (totalUnknownQty) {
    W('\nLINES EMITTED WITH NO QUANTITY - no sheet in the set states a count (' + totalUnknownQty + ')\n' + '-'.repeat(100) + '\n');
    for (const b of built) {
      if (!b.qtyUnknown.length) continue;
      W('  ' + b.no.padEnd(7) + b.name.padEnd(28) + b.qtyUnknown.join(', ') + '\n');
    }
    W('  (qty is OMITTED from these lines, not defaulted to 1. The reason is written into instanceNote.)\n');
  }

  if (dups.size) {
    W('\nUNRESOLVED CROSS-SPACE DUPLICATE TAGS - emitted ONCE, no quantity, no winner picked (' + dups.size + ')\n' + '-'.repeat(100) + '\n');
    for (const [tag, d] of dups) {
      W('  ' + tag + '  recorded in space(s) ' + d.spaces.join(', ') + ' on ' + d.sheet + '\n');
      for (const pos of d.positions) {
        W('      ' + pos.space.padEnd(8) + pos.name.padEnd(18) + pos.itemId + '  ' + pos.reliability.padEnd(8) +
          JSON.stringify(pos.description) + '\n');
      }
      W('      -> kept on ' + spaceDocId(d.keep) + ', FLAGGED, quantity omitted; the other doc(s) carry a note saying why.\n');
    }
    for (const x of dupReport.dupKept) W('  ' + x + '\n');
    for (const x of dupReport.dupSuppressed) W('  ' + x + '\n');
    W('  OPEN for Austin: which space carries each of these, and how many there are.\n');
  }

  if (allSplits.length) {
    W('\nUNRESOLVED SHEET-VS-SHEET COUNT CONFLICTS - carried as separate lines, NOT summed (' + allSplits.length + ')\n' + '-'.repeat(100) + '\n');
    for (const s of allSplits) {
      W('  space ' + s.space + '  ' + s.tag + ' [' + s.category + ']\n');
      for (const p of s.parts) W('      ' + String(p.rows).padStart(3) + ' row(s)  <-  ' + JSON.stringify(p.sheet) + '\n');
    }
    W('  Folding these on (category, tag) alone would silently pick the larger sheet.\n' +
      '  OPEN for Austin: which sheet governs each of these.\n');
  }

  W('\nROWS THE APPROVED CATEGORY GATE KEEPS OUT OF BOTH DOCS (' + drops.total + ' of ' +
    rows.reduce((n, r) => n + r.raw, 0) + ')\n' + '-'.repeat(100) + '\n');
  for (const [c, n] of [...drops.byCategory].sort((a, b) => b[1] - a[1])) {
    W('  ' + String(n).padStart(4) + '  ' + c + '\n');
  }
  W('  These categories appear in NEITHER approved guest-room doc, so following Austin\'s\n' +
    '  approved precedent puts them nowhere. For a common area they are the substance of a\n' +
    '  finish walk. OPEN for Austin: widen the gate for spaces, or leave them out.\n');

  if (unknownMep.size) {
    W('\nMEP CATEGORIES THE APP DOES NOT KNOW\n' + '-'.repeat(100) + '\n');
    for (const [c, where] of unknownMep) {
      W('  ' + c + ' (' + where.join(', ') + ') is not in js/util.js MEP_CATEGORY_ORDER - it will sort last.\n');
    }
    W('  Category strings are stored VERBATIM; nothing was relabelled to fit the app.\n');
  }

  if (fixtures && fixtures.length) {
    W('\nCROSS-CHECK vs js/seed-spaces.js (demo fixtures - never used as a source)\n' + '-'.repeat(100) + '\n');
    for (const f of fixtures) {
      W('  space ' + f.space + ': fixture type ' + JSON.stringify(f.fixtureType) +
        (f.agrees ? ' == derived' : ' != derived ' + JSON.stringify(f.derivedType)) + '\n');
    }
  }

  W('\nAPP-SIDE: the PLATFORM app now resolves both suffixes. platform/js/core/store.js\n' +
    "  mepDocId() tries '-MEP' then '" + SPACE_MEP_SUFFIX + "' and every caller goes through it, so all " +
    Object.keys(docs).filter((k) => k.endsWith(SPACE_MEP_SUFFIX)).length +
    ' space MEP doc(s)\n  resolve without the 8-character Firestore id cap being broken.\n' +
    "  STILL OPEN, in the LIVE crew app and deliberately not touched here: js/util.js\n" +
    "  mepParent() matches /^(\\d+)-MEP$/ and mepIdFor() appends '-MEP'. Neither understands a\n" +
    '  space MEP id. That is the live application and it is out of this scope.\n');

  if (opts.reportOnly) {
    W('\n--spaces-report: analysis only. Nothing written.\n\n');
    return;
  }

  /* ---- merge and write ---- */
  const outDocs = {};
  let spaceRegen = [];
  let prevMetaSp = {};
  if (!opts.fresh && existsSync(OUT_PATH)) {
    const prev = JSON.parse(readFileSync(OUT_PATH, 'utf8'));
    prevMetaSp = prev.meta || {};
    spaceRegen = (prev.meta && prev.meta.regeneratedRooms) || [];
    /* A room deliberately regenerated by the room path is NOT restored here.
     * This path does not build rooms and has no business overwriting one. */
    const keepApproved = new Set(spaceRegen.flatMap((n) => [n, n + '-MEP']));
    for (const [k, v] of Object.entries(prev.docs || {})) {
      if (!APPROVED_DOC_IDS.includes(k) || keepApproved.has(k)) outDocs[k] = v;
    }
  }
  const carriedRooms = Object.keys(outDocs).length;
  const regenIds = new Set(spaceRegen.flatMap((n) => [n, n + '-MEP']));
  for (const id of APPROVED_DOC_IDS) if (!regenIds.has(id)) outDocs[id] = clone(slice.docs[id]);
  for (const [k, v] of Object.entries(docs)) outDocs[k] = v;

  for (const id of APPROVED_DOC_IDS) {
    if (regenIds.has(id)) continue;
    if (!deepEqual(outDocs[id], slice.docs[id])) die('internal error: approved doc ' + id + ' was modified');
  }

  /* An empty checklist tells the crew "nothing to verify here", which is false.
   * A space with no gated line is refused earlier; this catches the other way
   * in - a doc emptied by suppressing a duplicate. */
  for (const [id, d] of Object.entries(outDocs)) {
    if (!Object.keys(d.items || {}).length) {
      die('doc ' + JSON.stringify(id) + ' would be written with ZERO lines - an empty checklist reads as ' +
          '"nothing to verify here". Refusing. (If a duplicate suppression emptied it, the tag must stay ' +
          'on this doc and move off the other one.)');
    }
  }

  /* number == docId, for every doc in the file. */
  for (const [id, d] of Object.entries(outDocs)) {
    if (d.number !== id) die('doc ' + JSON.stringify(id) + ' has number ' + JSON.stringify(d.number) + ' - number must equal docId');
    if (String(id).length > SPACE_ID_MAX) die('doc id ' + JSON.stringify(id) + ' exceeds ' + SPACE_ID_MAX + ' characters');
  }

  const prevMeta = (!opts.fresh && existsSync(OUT_PATH))
    ? (JSON.parse(readFileSync(OUT_PATH, 'utf8')).meta || {}) : {};

  const out = {
    meta: {
      ...prevMetaSp,
      ...prevMeta,
      generator: 'platform/tools/build_floor1.mjs',
      project: 'H2SEP - Home2 Suites by Hilton, Eagle Pass TX',
      floor: 1,
      builtAt: opts.stamp,
      stampIsConstant: true,
      approvedSource: 'platform/data/slice-f1.json (read only, never written)',
approvedDocs: APPROVED_DOC_IDS.slice(),
      /* Carried through so the room path does not lose it on the next wave. */
      regeneratedRooms: spaceRegen.slice().sort(cmpStr),
      spaceNumbering: 'PLAN numbering from the architectural set (Austin ruling D18); data/project.sqlite spaces table. NOT the QC Deficiency Tracker numbering.',
      spaceShapeSource: 'data/project.sqlite space_items (category gate + fold by category/tag/source_sheet)',
      spacePackageSource: 'data/project.sqlite space_items columns verbatim - no approved common-area doc exists to copy from',
      spaceIdScheme: "'S' + space_no with non-alphanumerics stripped; MEP companion suffix '-M'; every id <= " + SPACE_ID_MAX + ' chars and number == docId',
      spaceQtyPolicy: 'qty is the number of folded rows; it is OMITTED (not defaulted to 1) where no sheet states a count',
      spaceFfeWorkbook: 'FF&E Installation "1st Floor FF&E Installation" tab (Drive 1vHg6-8vDVLpoE-x0jwjijOOlXJX4B1Jy) carries the public-area tags and container numbers with EVERY TOTAL BLANK; used for tag identity only, never for quantities',
      /* Describes the FILE, not the run: both build paths write the same two
       * lists off the final document set, so whichever path happens to run last
       * cannot change the seed's metadata. */
      stagedDocs: Object.keys(outDocs).filter((k) => !APPROVED_DOC_IDS.includes(k)).sort(cmpDocId),
      spaceDocs: Object.keys(outDocs).filter((k) => isSpaceDocId(k)).sort(cmpDocId),
      spacesWithNoPackage: skipped.map((s) => s.no + ' ' + s.name),
      fieldState: 'generated docs are born clean: checked false, initials empty, checkedAt null, issue empty',
      redaction: 'no personal contact data; approved docs carry initials only, as received',
    },
    docs: Object.fromEntries(Object.keys(outDocs).sort(cmpDocId).map((k) => [k, outDocs[k]])),
  };

  writeFileSync(OUT_PATH, stringify(out), 'utf8');

  W('\n' + '='.repeat(100) + '\n');
  W('wrote ' + OUT_PATH.replace(REPO + '/', '') + '\n');
  W('  ' + carriedRooms + ' guest-room doc(s) carried forward untouched, ' +
    APPROVED_DOC_IDS.length + ' approved docs verbatim, ' + Object.keys(docs).length + ' space doc(s) added\n');
  W('  ' + built.length + ' of ' + wanted.length + ' spaces built (' + totalFfe + ' FF&E lines + ' +
    totalMep + ' MEP lines), ' + skipped.length + ' refused for having no gated line\n');
  W('Firestore not touched. Nothing pushed. Nothing deployed. slice-f1.json not written.\n\n');
}

/* ---------------------------------------------------------------------- main */

function main(argv) {
  const args = argv.slice(2);
  let stamp = DEFAULT_STAMP;
  let fresh = false, wantSelftest = false, spacesMode = false, spacesReportOnly = false, regen = false;
  const positional = [];

  for (const a of args) {
    if (a === '--selftest') { wantSelftest = true; continue; }
    if (a === '--fresh') { fresh = true; continue; }
    if (a === '--regen') { regen = true; continue; }
    if (a === '--spaces') { spacesMode = true; continue; }
    if (a === '--spaces-report') { spacesMode = true; spacesReportOnly = true; continue; }
    if (a.startsWith('--stamp=')) {
      stamp = a.slice('--stamp='.length);
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(stamp)) {
        die('--stamp must be ISO like 2026-08-20T00:00:00.000Z, got ' + JSON.stringify(stamp));
      }
      continue;
    }
    if (a.startsWith('-')) die('unknown flag ' + a);
    positional.push(a);
  }

  const db = openDb();
  const slice = loadSlice();

  /* Common-area path. Entirely separate from the guest-room path: it never
   * rebuilds a room doc, and the room path never sees a space. */
  if (spacesMode) return mainSpaces(db, slice, positional, { stamp, fresh, reportOnly: spacesReportOnly });

  const rooms = [];
  for (const a of positional) {
    if (!/^\d{3}$/.test(a)) die('room numbers only, got ' + JSON.stringify(a));
    rooms.push(a);
  }

  if (wantSelftest) {
    const ok = selftest(db, slice);
    if (!ok) process.exit(1);
    if (!rooms.length) return;
  }

  if (!rooms.length) {
    process.stdout.write('usage: node platform/tools/build_floor1.mjs [--selftest] [--fresh] [--stamp=<ISO>] <room> ...\n' +
      '       node platform/tools/build_floor1.mjs --spaces [all | <space_no> ...]\n' +
      '       node platform/tools/build_floor1.mjs --spaces-report        (analysis only, writes nothing)\n');
    return;
  }

  /* CREATE-ONLY by default. The approved rooms are copied verbatim and never
   * rebuilt unless --regen says so on this run, for the rooms named on this
   * command line. Regeneration NEVER destroys: a line the rebuild no longer
   * produces is carried forward as deleted with a supersede note, and the MEP
   * doc's field history is copied over untouched. */
  const regenRooms = regen ? rooms.filter((n) => APPROVED_ROOMS.includes(n)) : [];
  const refused = rooms.filter((n) => APPROVED_ROOMS.includes(n) && !regenRooms.includes(n));
  if (refused.length) {
    die('refusing to modify approved room(s) ' + refused.join(', ') + ' - this tool is create-only. ' +
        'They are copied into the staging seed verbatim from slice-f1.json. Pass --regen to rebuild them.');
  }
  const regenDocIds = new Set(regenRooms.flatMap((n) => [n, n + '-MEP']));
  for (const n of rooms) {
    if (BLOCKED_ROOMS[n]) die('room ' + n + ' is BLOCKED: ' + BLOCKED_ROOMS[n] + '. Not building it.');
  }
  const dupes = rooms.filter((n, i) => rooms.indexOf(n) !== i);
  if (dupes.length) die('room number(s) given more than once: ' + [...new Set(dupes)].join(', '));

  /* The MEP copy assumption is re-proved before any copy happens. */
  assertMepConstant(slice);
  /* And the label/src/type-slug derivations the King composition depends on. */
  const proof = assertDerivationRules(db, slice);
  /* And everything the COMPOSED MEP document leans on. */
  const cover = assertMepCondensationCovers(db, slice);
  const numbering = assertSheetNumberingShared(db);
  const sheetRes = assertRoomSheetResolution(db);
  const typeRef = buildTypeReference(db);

  /* Carry forward whatever earlier waves already staged. */
  const docs = {};
  let prevRegen = [];
  let prevMetaRm = {};
  if (!fresh && existsSync(OUT_PATH)) {
    const prev = JSON.parse(readFileSync(OUT_PATH, 'utf8'));
    prevMetaRm = prev.meta || {};
    prevRegen = (prev.meta && prev.meta.regeneratedRooms) || [];
    const keepApproved = new Set(prevRegen.flatMap((n) => [n, n + '-MEP']));
    for (const [k, v] of Object.entries(prev.docs || {})) {
      if (!APPROVED_DOC_IDS.includes(k) || keepApproved.has(k)) docs[k] = v;
    }
  }

  /* Requirement 4 - the approved 6, verbatim, so the seed is loadable on its own.
   * A room being regenerated on this run is built below instead. */
  const alreadyRegen = new Set(prevRegen.flatMap((n) => [n, n + '-MEP']));
  for (const id of APPROVED_DOC_IDS) {
    if (regenDocIds.has(id) || alreadyRegen.has(id)) continue;   // built below, or already rebuilt in an earlier wave
    docs[id] = clone(slice.docs[id]);
  }

  const reports = [];
  for (const roomNo of rooms) {
    const report = { room: roomNo, unresolved: [] };
    const ffe = buildFFEDoc(db, roomNo, slice, typeRef, stamp, report);
    const { room, rows } = readRoom(db, roomNo);
    /* A type with an approved -MEP doc of its own keeps the proven copy path.
     * A composed type builds its MEP doc from its own rows instead. */
    const mep = report.composed
      ? buildComposedMepDoc(db, roomNo, room, rows, slice, report.donorRoom, ffe.floor, stamp, report,
        { typeLabel: ffe.typeLabel }, numbering)
      : buildMepDoc(db, roomNo, rows, slice, report.refRoom, ffe.floor, stamp, report,
        { typeLabel: ffe.typeLabel });
    if (!report.composed) report.mepSheetCitations = mepSheetCitations(slice, report.refRoom);
    if (regenRooms.includes(roomNo)) {
      report.regen = carryForwardApproved(roomNo, ffe, mep, slice, stamp);
    }
    /* A REBUILD MUST NEVER ERASE THE CREW'S WORK. Field state belongs to
     * whoever checked the box, not to the generator. If this room already
     * exists in the staged seed with checks, initials, timestamps, issues or
     * notes on it - carried in from the live app by carry_field_state.mjs -
     * that state is re-applied to the freshly built lines. Without this, every
     * regeneration silently reset the floor to zero. */
    report.ruledAdded = [...addRuledLines(roomNo, ffe, 'ffe', stamp, room), ...addRuledLines(roomNo, mep, 'mep', stamp, room)];
    report.statePreserved = preserveFieldState(docs, roomNo, ffe, mep);
    docs[roomNo] = ffe;
    docs[roomNo + '-MEP'] = mep;
    reports.push(report);
  }

  /* Post-condition: the approved docs in the output are the slice, unchanged -
   * except any deliberately regenerated on this run, which are diffed instead. */
  for (const id of APPROVED_DOC_IDS.filter((x) => !regenDocIds.has(x) && !alreadyRegen.has(x))) {
    if (!deepEqual(docs[id], slice.docs[id])) die('internal error: approved doc ' + id + ' was modified');
  }

  const out = {
    meta: {
      ...prevMetaRm,
      generator: 'platform/tools/build_floor1.mjs',
      project: 'H2SEP - Home2 Suites by Hilton, Eagle Pass TX',
      floor: 1,
      builtAt: stamp,
      stampIsConstant: true,
      approvedSource: 'platform/data/slice-f1.json (read only, never written)',
      shapeSource: 'data/project.sqlite room_items (category gate + fold + D12 override)',
      packageSource: 'approved room of the same room_type in slice-f1.json',
      mepSource: 'type-level constant; live lines copied from the same-type approved -MEP doc',
      approvedDocs: APPROVED_DOC_IDS.slice(),
      /* An approved room that has been deliberately regenerated is recorded in
       * the FILE, so any later run - including the common-area path, which does
       * not build rooms at all - knows not to restore the stored copy over it.
       * Without this, running --spaces after --regen silently undid the
       * regeneration and the equality assertion below enforced the undo. */
      regeneratedRooms: [...new Set([...(prevRegen || []), ...regenRooms])].sort(cmpStr),
      /* Describes the FILE, not the run, so that building in waves and
       * building in one shot produce a byte-identical seed. */
      stagedDocs: Object.keys(docs).filter((k) => !APPROVED_DOC_IDS.includes(k)).sort(cmpDocId),
      spaceDocs: Object.keys(docs).filter((k) => isSpaceDocId(k)).sort(cmpDocId),
      fieldState: 'generated docs are born clean: checked false, initials empty, checkedAt null, issue empty',
      redaction: 'no personal contact data; approved docs carry initials only, as received',
    },
    docs: Object.fromEntries(Object.keys(docs).sort(cmpDocId).map((k) => [k, docs[k]])),
  };

  writeFileSync(OUT_PATH, stringify(out), 'utf8');

  process.stdout.write('\nBUILD REPORT\n' + '-'.repeat(78) + '\n');
  process.stdout.write('src / type-slug derivation rules re-proved on ' + proof.checked + ' approved lines' +
    (proof.labelNotes.length ? ' (' + proof.labelNotes.length + ' label(s) enriched by submittal)' : '') + '\n');
  process.stdout.write('D10 condensation map re-proved: ' + cover.donorRows + ' donor MEP rows -> ' +
    cover.lines + ' condensed lines + ' + cover.roughIn + ' rough-in rows deliberately off the punch\n');
  process.stdout.write('A550 / A555 shared numbering re-proved from the database:\n');
  for (const f of numbering.facts) process.stdout.write('    - ' + f + '\n');
  for (const f of sheetRes) process.stdout.write('  room-sheet resolution: ' + f + '\n');
  process.stdout.write('\n');
  for (const r of reports) {
    process.stdout.write(
      'room ' + r.room + '  type ' + r.roomType + '  -> doc type ' + r.docType +
      ' / ' + JSON.stringify(r.docTypeLabel) + '\n' +
      '  package: ' + (r.composed
        ? 'COMPOSED - ' + r.fromDonor.length + ' shared tag(s) carried from approved room ' + r.donorRoom +
          ', ' + r.fromSqlite.length + ' type-only tag(s) built from sqlite'
        : 'copied from approved same-type room ' + r.refRoom) + '\n' +
      '  FF&E : ' + r.ffeLines + ' lines   [' + r.rawRows + ' raw rows -> ' + r.gatedRows +
      ' gated -> ' + r.ffeLines + ' after ' + r.foldedGroups + ' folds]   sort convention "' +
      r.sortConvention + '" (measured off room ' + r.refRoom + ')\n' +
      '  MEP  : ' + r.mepLines + ' lines   [' + r.mepSkippedDeleted + ' deleted history rows in ' +
      r.mepRefRoom + ' deliberately not copied]\n' +
      '  unresolved tags: ' + (r.unresolved.length ? r.unresolved.join('; ') : 'none') + '\n');
    if (!r.composed) {
      for (const x of r.mepResolutions || []) {
        process.stdout.write("    MEP copy enriched from this room's own rows - " + x + '\n');
      }
    }
    if (r.composed) {
      process.stdout.write('  type-only tags (sqlite is the only source): ' + r.fromSqlite.join(', ') + '\n');
      process.stdout.write('  donor tags not applicable to this type: ' +
        (r.donorUnused.length ? r.donorUnused.join(', ') : 'none') + '\n');
      if (r.donorQtyNotes.length) {
        process.stdout.write('  qty differs from donor on: ' + r.donorQtyNotes.join('; ') + '\n');
      }
      for (const n of r.donorLabelNotes) process.stdout.write('  INFO ' + n + '\n');
      if (r.mepComposed) {
        process.stdout.write('  MEP composed from this room\'s own rows against sheet ' + r.mepRoomSheet +
          ' (rooms.connecting = ' + (r.mepConnecting ? '1' : '0') + ')\n');
        process.stdout.write('    citations re-pointed off ' + MEP_DONOR_SHEET + ': ' +
          (r.mepRepointed.length ? r.mepRepointed.join(', ') : 'none') + '\n');
        process.stdout.write('    connecting ".1" view citation ' +
          (r.mepConnecting ? 'KEPT (this room IS connecting)' : 'dropped on: ' +
            (r.mepConnectingDropped.length ? r.mepConnectingDropped.join(', ') : 'none')) + '\n');
        for (const x of r.mepCitationDropped || []) {
          process.stdout.write('    citation number NOT carried across sheets - ' + x + '\n');
        }
        for (const x of r.mepResolutions) process.stdout.write('    resolved: ' + x + '\n');
        if (r.mepRuledClosed && r.mepRuledClosed.length) {
          process.stdout.write('    ruling ' + r.mepDropRuling + ' closes the flag on ' + r.mepRuledClosed.length +
            ' Configuration B line(s): ' + r.mepRuledClosed.join(', ') + '\n');
        }
        if (r.mepAdded.length) {
          process.stdout.write('    ' + r.mepAdded.length + ' room-specific row(s) added as their own line(s): ' +
            r.mepAdded.join('; ') + '\n');
        }
        if (r.mepDropped.length) {
          process.stdout.write('    ' + r.mepDropped.length + ' row(s) dropped by ruling ' + r.mepDropRuling + ':\n');
          for (const x of r.mepDropped) process.stdout.write('        - ' + x + '\n');
        }
        process.stdout.write('    ' + r.mepRoughIn + ' rough-in / distribution row(s) left off the punch, as in the approved doc\n');
        if (r.mepUnsupported.length) {
          process.stdout.write('    NOTE ' + r.mepUnsupported.length + ' condensed line(s) have no row of their own in this room ' +
            '(carried on the donor citation): ' + r.mepUnsupported.join(', ') + '\n');
        }
      }
    }
    if (r.injected && r.injected.length) {
      process.stdout.write('  workbook-only lines (the workbook states a FLOOR TOTAL, no sheet states a count): ' +
        r.injected.join(', ') + '\n');
    }
    if (r.qtyUnknown && r.qtyUnknown.length) {
      process.stdout.write('  FF&E line(s) emitted with NO quantity because no drawing states one: ' +
        r.qtyUnknown.join(', ') + '\n');
    }
    if (r.qtyOverrideNotes && r.qtyOverrideNotes.length) {
      process.stdout.write('  quantity set by ruling, and the note says so: ' + r.qtyOverrideNotes.join('; ') + '\n');
    }
    if (r.correctedLines && r.correctedLines.length) {
      process.stdout.write('  ruled TAG CORRECTION on ' + r.correctedLines.length +
        ' line(s): ' + r.correctedLines.join(', ') + '\n');
    }
    if (r.superseded && r.superseded.length) {
      for (const sup of r.superseded) process.stdout.write('    ' + sup + '\n');
    }
    if (r.ruledAdded && r.ruledAdded.length) {
      process.stdout.write('  ruled line additions: ' + r.ruledAdded.join(', ') + '\n');
    }
    if (r.statePreserved && (r.statePreserved.lines || r.statePreserved.notes)) {
      process.stdout.write('  field state preserved from the staged copy: ' + r.statePreserved.lines +
        ' line(s), ' + r.statePreserved.notes + ' note(s)\n');
      for (const o of r.statePreserved.orphaned) process.stdout.write('    WORK WITH NO LINE TO LAND ON: ' + o + '\n');
    }
    if (r.regen) {
      process.stdout.write('  REGENERATED an approved room. tombstoned ' + r.regen.tombstoned.length +
        ' line(s), carried ' + r.regen.historyCarried + ' history row(s), ' +
        r.regen.changed.length + ' field change(s), ' + r.regen.added.length + ' new line(s)\n');
      for (const t of r.regen.tombstoned) process.stdout.write('    tombstoned: ' + t + '\n');
      for (const c of r.regen.changed.slice(0, 12)) process.stdout.write('    changed: ' + c + '\n');
      if (r.regen.changed.length > 12) process.stdout.write('    ... and ' + (r.regen.changed.length - 12) + ' more field change(s)\n');
      for (const c of r.regen.added) process.stdout.write('    added: ' + c + '\n');
    }
    if (r.ffeRuledClosed && r.ffeRuledClosed.length) {
      process.stdout.write('  ruling ' + r.configRuling + ' closes the flag on ' + r.ffeRuledClosed.length +
        ' FF&E Configuration B line(s): ' + r.ffeRuledClosed.join(', ') + '\n');
    }
    if (r.configDropped && r.configDropped.length) {
      process.stdout.write('  ruling ' + r.configRuling + ' drops ' + r.configDropped.length +
        ' FF&E row(s) matched on the description prefix ' + JSON.stringify(CONFIG_A_PREFIX) +
        ' (' + r.configBLeft + ' Configuration B row(s) survive):\n');
      for (const x of r.configDropped) process.stdout.write('        - ' + x + '\n');
    }
    if (r.roomNotes && r.roomNotes.length) {
      process.stdout.write('  room notes seeded: ' + r.roomNotes.join(', ') + '\n');
    }
    if (r.unknownCategories.length) {
      process.stdout.write('  NOTE unrecognised sqlite categories seen: ' + r.unknownCategories.join(', ') + '\n');
    }
  }
  const totalDocs = Object.keys(out.docs).length;
  process.stdout.write('-'.repeat(78) + '\n');
  process.stdout.write('wrote ' + OUT_PATH.replace(REPO + '/', '') + ' - ' + totalDocs + ' docs (' +
    APPROVED_DOC_IDS.length + ' approved verbatim + ' + (totalDocs - APPROVED_DOC_IDS.length) + ' staged)\n');
  process.stdout.write('Firestore not touched. Nothing pushed. Nothing deployed.\n\n');
}

main(process.argv);
