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
 * MEP CITATIONS ARE NOT REWRITTEN for King rooms. The 22 live lines are copied
 * verbatim, as proven. Many of their `src` strings name A555 views and keynotes
 * (the QQ sheet). A550 and A555 do NOT share a view numbering, and no document
 * in the set states the A550 equivalents, so rewriting them would be a guess.
 * reportMepSheetCitations() prints every affected line instead.
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

/* Rooms refused by name because a governing question is still open. Room 118
 * lived here until Austin's ruling D19 (2026-08-20) settled its bathing
 * configuration; see the ROOM 118 block below. Empty is the honest state now. */
const BLOCKED_ROOMS = {};

/* Step 1 gate. */
const GATE_CATEGORIES = new Set([
  'Bath Accessory', 'Appliance', 'FF&E - Casegoods', 'FF&E - Bedding',
  'FF&E - Seating', 'FF&E - Lighting', 'FF&E - Window', 'FF&E - Art / Mirror',
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
const QTY_OVERRIDES = [
  { tag: 'GR-322', category: 'FF&E - Casegoods', qty: 3, ruling: 'D12' },
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
};

/* The doc-level `type` slug is DERIVED, and the derivation is proved against
 * the three approved docs on every run (see assertDerivationRules). */
const typeSlug = (roomType) => roomType.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/* Constant across 101-MEP / 103-MEP / 105-MEP. Asserted, not assumed. */
const MEP_DOC_TYPE = 'mep-punch';

/* ===========================================================================
 * ROOM 118 - King Studio Accessible. Austin's ruling D19 (2026-08-20).
 *
 * 118 was BLOCKED because its bathing configuration was an open question:
 * data/project.sqlite emits BOTH mutually exclusive packages on every one of
 * the seven accessible keys and supersedes neither ("Only Austin can close
 * this" - items.note on ITM-0703..0711).  D19 closes it: ROLL-IN SHOWER.
 *
 * Verified against the documents rather than taken on trust:
 *   - A551.md (sheet 88, 'ENL. GUEST ROOM PLANS & ELEVS - KING STUDIO ACC.')
 *     view 01: "roll-in shower with fold-down seat".  No tub is drawn.
 *   - A552.md (sheet 89, '... KING STUDIO ACC. MOD.') view 01: accessible
 *     shower with fold-down seat behind a tempered-glass enclosure (kn 5);
 *     view 03 finish plan: T-02 tagged "ROLL-IN SHOWER TILE".  No tub.
 *   - FF&E Installation.xlsx, '1st Floor FF&E Installation' tab: 6034-L
 *     Shower Base TOTAL 16 and NOVA-6076 Shower Door TOTAL 16 on a 16-key
 *     floor, with no tub line anywhere on the tab.
 * Three independent documents, no tub.  D19 is confirmed, not merely applied.
 *
 * WHICH SHEET IS CITED, AND WHY: A552 (King Studio Acc. Mod.) governs 118.
 * room_types carries an explicit ~90% assumption to that effect, and the
 * database's own row set proves it out - 118 carries GR-320 and GR-208, which
 * A552 tags and A551 does not, and carries NO GR-502, which A551 tags and
 * A552 does not (items.note on ITM-0251: "NOT tagged on A552, so not emitted
 * for 118").  The shared rows keep sqlite's A551 citation verbatim because
 * both sheets tag those items identically; nothing is rewritten here.
 * =========================================================================== */

/* Rooms with no approved reference room of their own room_type.  Their package
 * is sourced from sqlite directly (label / src / reliability / instanceNote /
 * trade / derived are all sqlite columns), never guessed, and never borrowed
 * from a room of a DIFFERENT type. */
const SELF_SOURCED_ROOMS = new Set(['118']);

/* The database marks the two mutually exclusive bath packages by an explicit
 * prefix on the description.  Dropping by that prefix cannot over-reach: it is
 * the database's own marker, not a keyword guess. */
const CONFIG_A_PREFIX = 'CONFIGURATION A (TUB) - ';
const CONFIG_B_PREFIX = 'CONFIGURATION B (ROLL-IN SHOWER) - ';

const D19_CLOSURE =
  'Bathing configuration closed by AJ ruling D19 (2026-08-20): room 118 gets the ROLL-IN SHOWER ' +
  'package, not a tub. A551 draws a roll-in shower with fold-down seat and A552 draws an accessible ' +
  'shower with fold-down seat behind a tempered-glass door; neither sheet draws a tub. The FF&E ' +
  'Installation "1st Floor" tab carries 16 shower bases (6034-L) and 16 shower doors (NOVA-6076) ' +
  'for 16 keys and no tub line. The Configuration A rows (BT-1, HD-05 bowed rod, 2" tub waste) are ' +
  'dropped. Flag closed.';

/* Rows the ruling drops, asserted by count so a database change cannot pass
 * silently.  These three are the ONLY Configuration A rows on room 118. */
const CONFIG_DROP_EXPECT = {
  118: [
    { category: 'Plumbing',       tag: 'BT-1',  desc: 'Bathtub, guestroom ADA' },
    { category: 'Bath Accessory', tag: 'HD-05', desc: 'Shower rod, BOWED' },
    { category: 'Plumbing',       tag: '',      desc: '2" SS tub waste + trap' },
  ],
};

/* Lines added on documentary evidence from a schedule rather than a plan tag.
 * Each row is ONE physical unit, exactly the way sqlite models multiples, so
 * the existing fold step derives qty from the row count and nothing overrides
 * a quantity by hand.  Injected BEFORE the reduction so the ordinary gate,
 * fold, key and sort machinery handles them - one code path, no special case.
 *
 * EVIDENCE.  The FF&E Installation.xlsx "1st Floor FF&E Installation" tab
 * lists these items with a floor total, and floor 1 has exactly ONE accessible
 * key - room 118 (rooms table: accessible='1' on 118 and on no other floor-1
 * room).  A floor total of 1 or 2 on an accessible-only item on a floor with
 * one accessible room is a statement about room 118.  The architectural sheets
 * do not tag them, which is placeholder PH-GU-007 verbatim: "The two accessible
 * King Studios have no tagged accessible vanity and no tagged accessible wall
 * shelf - only keyed notes 6 and 8. Gap G-1."  The schedule fills that gap.
 *
 * reliability MEDIUM: schedule-sourced, not plan-tagged. Stated, not implied. */
const ROOM_ADDITIONS = {
  118: [
    {
      units: 1,
      category: 'FF&E - Casegoods',
      tag: 'GR-303',
      /* description verbatim from items.item_id ITM-0324 / ITM-0653, the same
       * tag as built on A554 and A556. The FF&E tab prints "Accesible" (sic). */
      description: 'ACCESSIBLE Vanity @ Guest Bath',
      instance_note:
        'Added on schedule evidence, not a plan tag. FF&E Installation.xlsx "1st Floor FF&E ' +
        'Installation" tab: GR-303 Accesible Vanity @ Guest Bath, TOTAL 1. Floor 1 has exactly one ' +
        'accessible key (room 118), so that 1 is this room. A552 and A532/A532.1 tag no accessible ' +
        'vanity - placeholder PH-GU-007 (gap G-1) records the omission. Confirm the tag on the ' +
        'A532/A532.1 elevation before ordering.',
      source_sheet: 'FF&E Installation.xlsx, 1st Floor FF&E Installation tab',
      primary_sheet: 'FF&E Installation.xlsx (1st Floor tab)',
      reliability: 'MEDIUM',
      derived: 1,
    },
    {
      units: 2,
      category: 'FF&E - Casegoods',
      tag: 'GR-324',
      description: 'Wall Shelf @ ACCESSIBLE Bathroom',
      instance_note:
        'Added on schedule evidence, not a plan tag. FF&E Installation.xlsx "1st Floor FF&E ' +
        'Installation" tab: GR-324 Wall Shelf @ Accessible Bathroom, TOTAL 2. Floor 1 has exactly ' +
        'one accessible key (room 118), so both are this room. A552 and A532/A532.1 tag no ' +
        'accessible wall shelf - placeholder PH-GU-007 (gap G-1). Confirm before ordering.',
      source_sheet: 'FF&E Installation.xlsx, 1st Floor FF&E Installation tab',
      primary_sheet: 'FF&E Installation.xlsx (1st Floor tab)',
      reliability: 'MEDIUM',
      derived: 1,
    },
  ],
};

/* Submittals are PROJECT-WIDE product decisions (D11), not room-specific
 * curation, so a self-sourced room carries them too. Matched by exact
 * (category, code) against the approved room named here; the build dies if the
 * approved line has moved. Nothing is copied for a tag the room does not have. */
const SUBMITTAL_CARRY = {
  118: [
    { key: '901_a',        from: '101', category: 'Appliance',    code: '901',      why: 'D11 Danby refrigerator submittal' },
    { key: '902_a',        from: '101', category: 'Appliance',    code: '902',      why: 'D11 Danby dishwasher submittal, closes the 18-vs-24-inch flag' },
    { key: 'u_ce20ab6281', from: '101', category: 'Appliance',    code: '',         why: 'D11 Moen MGXP33C disposer submittal, closes the existence flag' },
    { key: 'gr4021_a',     from: '101', category: 'FF&E - Window', code: 'GR-402.1', why: 'D11 WINGITS WRD5SS36SN divider hardware submittal' },
  ],
};

/* MEP.  The 22-line punch is a type-level constant (D10) proved identical
 * across 101/103/105-MEP on every run.  Room 118 takes that constant, with two
 * lines RE-SOURCED because they assert standard-room facts the accessible
 * documents contradict, and seven lines ADDED that exist only on this room.
 * Every replacement and every addition is a verbatim sqlite row - no text is
 * composed here. */
const MEP_ROOM_RULINGS = {
  118: {
    /* The QQ constant's shower line says '4" threshold'.  A roll-in is
     * curbless.  Shipping the constant unchanged would assert a threshold that
     * D19 just ruled out - the single most dangerous line in the room. */
    replace: [
      { key: 'plmb_shower_a', match: { category: 'Plumbing', tag: 'SH-1 / SH-3' },
        why: 'D19: the roll-in pan governs. The QQ constant asserts a 4" threshold and SS-01 solid surround; the roll-in is curbless and requires a slab depression.' },
      { key: 'plmb_shencl_a', match: { category: 'Plumbing', tag: 'kn 5' },
        why: 'A552 keynote 5 tags a tempered-glass shower door at 118. The QQ constant carries the standard-room bi-pass sliding door (A530 kn 28).' },
    ],
    /* Order inside a band is presentation, not a claim.  Appended to the tail
     * of their own band so no existing sort value moves. */
    add: [
      { key: 'plmb_diverter_b',        sort: 3018, match: { category: 'Plumbing',  tag: 'kn 10' } },
      { key: 'plmb_handshower_b',      sort: 3019, match: { category: 'Plumbing',  tag: 'kn 11' } },
      { key: 'elec_ada_shade_circuit', sort: 2015, match: { category: 'Electrical', tag: '', desc: 'Motorized-shade circuit on the room panel' } },
      { key: 'elec_ada_shade_switch',  sort: 2016, match: { category: 'Electrical', tag: '', desc: 'Switch controlling the mechanical shade' } },
      { key: 'elec_ada_mw_hood',       sort: 2017, match: { category: 'Electrical', tag: '', desc: 'Microwave/hood circuit split' } },
      { key: 'elec_ada_welcome_sw',    sort: 2018, match: { category: 'Electrical', tag: '', desc: '3-way welcome light switch' } },
      { key: 'elec_ada_reach_outlet',  sort: 2019, match: { category: 'Electrical', tag: '', desc: 'At least one outlet AND one data connection' } },
    ],
  },
};

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
const clone = (v) => JSON.parse(JSON.stringify(v));
const deepEqual = (a, b) => stringify(a) === stringify(b);

/** Doc ordering in the output file: room number ascending, base doc before -MEP. */
function cmpDocId(a, b) {
  const na = parseInt(a, 10), nb = parseInt(b, 10);
  if (na !== nb) return na - nb;
  return cmpStr(a, b);
}

/* --------------------------------------------------------------- sqlite read */

function openDb() {
  if (!existsSync(DB_PATH)) die('database not found at ' + DB_PATH);
  return new DatabaseSync(DB_PATH, { readOnly: true });
}

function readRoom(db, roomNo) {
  const room = db.prepare(
    'SELECT room_no, floor, room_type, display_label, accessible, connecting FROM rooms WHERE room_no = ?'
  ).get(roomNo);
  if (!room) die('room ' + roomNo + ' does not exist in the rooms table');
  const rows = db.prepare(
    'SELECT rowid AS rowid, room_type, category, tag, description, instance_note, note,' +
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
function reduceFFE(roomNo, rows) {
  /* STEP 1 - category gate. */
  const kept = [];
  const unknownCategories = new Set();
  let mepRowCount = 0;
  for (const r of rows) {
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
  let prevCat = null, ordinal = 0;
  let foldedGroups = 0;
  for (const g of ordered) {
    if (g.category !== prevCat) { prevCat = g.category; ordinal = 0; } else ordinal++;

    let qty = g.rows.length;
    let overrideRuling = null;
    for (const ov of QTY_OVERRIDES) {
      if (ov.tag === g.tag && ov.category === g.category) { qty = ov.qty; overrideRuling = ov.ruling; }
    }
    if (g.rows.length > 1) foldedGroups++;

    if (seen.has(g.key)) die('room ' + roomNo + ': key collision ' + JSON.stringify(g.key));
    if (!/^[a-z0-9_]{1,40}$/.test(g.key)) die('room ' + roomNo + ': key ' + JSON.stringify(g.key) + ' violates ^[a-z0-9_]{1,40}$');
    seen.add(g.key);

    lines.push({
      key: g.key,
      code: g.tag,
      category: g.category,
      qty,
      overrideRuling,
      sort: (catIdx(g.category) + 1) * 1000 + ordinal * 10,
      rawRows: g.rows.length,
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
  }

  return {
    lines,
    rawCount: rows.length,
    gatedCount: kept.length,
    foldedGroups,
    mepRowCount,
    unknownCategories: [...unknownCategories].sort(cmpStr),
  };
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
      if (a.label !== line.sqlite.label) {
        deltas.push(roomNo + '.' + line.key + '.label: sqlite ' + JSON.stringify(line.sqlite.label) +
          ' != approved ' + JSON.stringify(a.label));
      }
      if (a.src !== line.sqlite.src) {
        deltas.push(roomNo + '.' + line.key + '.src: sqlite ' + JSON.stringify(line.sqlite.src) +
          ' != approved ' + JSON.stringify(a.src));
      }
    }
  }
  if (deltas.length) {
    die('the label/src derivation rules that the King composition depends on DO NOT HOLD:\n  ' +
        deltas.join('\n  '));
  }
  return checked;
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
    const { rows } = readRoom(db, roomNo);
    const red = reduceFFE(roomNo, rows);
    const approved = slice.docs[roomNo].items;

    const deltas = [];
    const sortNotes = [];
    const gen = new Map(red.lines.map((l) => [l.key, l]));
    const appKeys = Object.keys(approved).sort(cmpStr);
    const genKeys = [...gen.keys()].sort(cmpStr);

    for (const k of genKeys) {
      if (!(k in approved)) {
        const g = gen.get(k);
        deltas.push('EXTRA   ' + k + ' (' + g.category + ' / ' + (g.code || '<untagged>') + ' / qty ' + g.qty + ') generated but not in approved');
      }
    }
    for (const k of appKeys) {
      if (!gen.has(k)) {
        const a = approved[k];
        deltas.push('MISSING ' + k + ' (' + a.category + ' / ' + (a.code || '<untagged>') + ' / qty ' + a.qty + ') approved but not generated');
      }
    }

    for (const k of genKeys) {
      if (!(k in approved)) continue;
      const g = gen.get(k), a = approved[k];
      if (g.category !== a.category) deltas.push(k + ': category ' + JSON.stringify(g.category) + ' != ' + JSON.stringify(a.category));
      if (g.code !== a.code) deltas.push(k + ': tag ' + JSON.stringify(g.code) + ' != ' + JSON.stringify(a.code));
      if (g.qty !== a.qty) deltas.push(k + ': qty ' + g.qty + ' != ' + a.qty);
      if (g.sort !== a.sort) sortNotes.push(k + ': recipe sort ' + g.sort + ', approved ' + a.sort);
    }

    results.push({
      room: roomNo,
      raw: red.rawCount,
      gated: red.gatedCount,
      folded: red.foldedGroups,
      generated: red.lines.length,
      approved: appKeys.length,
      deltas,
      sortNotes,
      unknownCategories: red.unknownCategories,
    });
    if (deltas.length) ok = false;
  }

  const mepLive = assertMepConstant(slice);
  const provedLines = assertDerivationRules(db, slice);

  process.stdout.write('\nSELFTEST - regenerate 101 / 103 / 105 from sqlite, diff on (category, tag, qty)\n');
  process.stdout.write('-'.repeat(78) + '\n');
  for (const r of results) {
    process.stdout.write(
      'room ' + r.room + ': ' + r.raw + ' raw rows -> ' + r.gated + ' gated -> ' + r.generated +
      ' lines (' + r.folded + ' folded groups); approved has ' + r.approved + '\n');
    if (r.unknownCategories.length) {
      process.stdout.write('  NOTE unrecognised categories: ' + r.unknownCategories.join(', ') + '\n');
    }
    if (r.deltas.length === 0) {
      process.stdout.write('  PASS 0 deltas on (category, tag, qty) across ' + r.generated + ' lines\n');
    } else {
      process.stdout.write('  FAIL ' + r.deltas.length + ' delta(s):\n');
      for (const d of r.deltas) process.stdout.write('    - ' + d + '\n');
    }
    if (r.sortNotes.length) {
      process.stdout.write('  INFO ' + r.sortNotes.length + ' sort value(s) differ from the recipe band (line ORDER unchanged):\n');
      for (const s of r.sortNotes) process.stdout.write('    - ' + s + '\n');
    }
  }
  process.stdout.write('MEP: type-level constant re-proved - ' + mepLive + ' live lines identical across 101/103/105-MEP\n');
  process.stdout.write('DERIVATION: label == room_items.description and src == room_items.primary_sheet re-proved\n' +
    '  on all ' + provedLines + ' approved lines, plus the doc type-slug on all 6 approved docs.\n' +
    '  These are the rules the King composition uses to re-point citations from A555 to A550.\n');
  process.stdout.write('-'.repeat(78) + '\n');
  process.stdout.write(ok ? 'SELFTEST PASSED - zero deltas on all three approved rooms\n\n'
                          : 'SELFTEST FAILED\n\n');
  return ok;
}

/* ---------------------------------------------------------------- generation */

function buildFFEDoc(db, roomNo, slice, typeRef, stamp, report) {
  const { room, rows } = readRoom(db, roomNo);
  const red = reduceFFE(roomNo, rows);
  const roomType = room.room_type;

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

  /* Index the donor/reference package by (category, tag) rather than by key, so
   * a tag is matched on what it IS, not on where it happened to sort. */
  const refByTag = new Map();
  for (const k of Object.keys(ref.items)) {
    const v = ref.items[k];
    refByTag.set(v.category + SEP + v.code, { key: k, item: v });
  }

  const items = {};
  const fromDonor = [];
  const fromSqlite = [];
  const donorQtyNotes = [];

  for (const line of red.lines) {
    /* Shape is always sqlite. Package content depends on whether the donor has
     * this exact (category, tag). */
    const hit = refByTag.get(line.category + SEP + line.code);

    let pkg;
    if (!composed) {
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
      if (r.label !== line.sqlite.label) {
        report.unresolved.push(line.key + ' (' + line.code + '): label disagrees between sqlite and donor room ' +
          refNo + ' - sqlite ' + JSON.stringify(line.sqlite.label) + ' vs donor ' + JSON.stringify(r.label));
        continue;
      }
      if (r.qty !== line.qty) {
        donorQtyNotes.push(line.code + ': qty ' + line.qty + ' here vs ' + r.qty + ' in donor room ' + refNo +
          ' (sqlite governs; donor supplies text only)');
      }
      pkg = {
        label: line.sqlite.label,
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
    if (Array.isArray(pkg.attachments) && pkg.attachments.length) item.attachments = clone(pkg.attachments);
    items[line.key] = item;
  }

  if (!composed) {
    /* Same-type path only: anything in the reference we did not reproduce is a
     * hole. A composed type legitimately does not carry the donor's whole set. */
    const producedKeys = new Set(red.lines.map((l) => l.key));
    for (const k of Object.keys(ref.items).sort(cmpStr)) {
      if (!producedKeys.has(k)) {
        report.unresolved.push((ref.items[k].code || '<untagged>') + ' (key ' + k + ') present in room ' +
          refNo + ' but not produced from sqlite for ' + roomNo);
      }
    }
  } else {
    const produced = new Set(red.lines.map((l) => l.category + SEP + l.code));
    report.donorUnused = [...refByTag.keys()].filter((k) => !produced.has(k))
      .map((k) => refByTag.get(k).item.code || '<untagged>').sort(cmpStr);
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
  report.roomType = roomType;
  report.rawRows = red.rawCount;
  report.gatedRows = red.gatedCount;
  report.foldedGroups = red.foldedGroups;
  report.unknownCategories = red.unknownCategories;

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
    notes: {},
    deleted: false,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

function buildMepDoc(roomNo, slice, refNo, floor, stamp, report, identity) {
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

  report.mepLines = Object.keys(items).length;
  report.mepSkippedDeleted = skippedDeleted;
  report.mepRefRoom = refNo + '-MEP';

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

/* ---------------------------------------------------------------------- main */

function main(argv) {
  const args = argv.slice(2);
  let stamp = DEFAULT_STAMP;
  let fresh = false, wantSelftest = false;
  const rooms = [];

  for (const a of args) {
    if (a === '--selftest') { wantSelftest = true; continue; }
    if (a === '--fresh') { fresh = true; continue; }
    if (a.startsWith('--stamp=')) {
      stamp = a.slice('--stamp='.length);
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(stamp)) {
        die('--stamp must be ISO like 2026-08-20T00:00:00.000Z, got ' + JSON.stringify(stamp));
      }
      continue;
    }
    if (a.startsWith('-')) die('unknown flag ' + a);
    if (!/^\d{3}$/.test(a)) die('room numbers only, got ' + JSON.stringify(a));
    rooms.push(a);
  }

  const db = openDb();
  const slice = loadSlice();

  if (wantSelftest) {
    const ok = selftest(db, slice);
    if (!ok) process.exit(1);
    if (!rooms.length) return;
  }

  if (!rooms.length) {
    process.stdout.write('usage: node platform/tools/build_floor1.mjs [--selftest] [--fresh] [--stamp=<ISO>] <room> ...\n');
    return;
  }

  /* CREATE-ONLY. The approved rooms are copied verbatim and never rebuilt. */
  const refused = rooms.filter((n) => APPROVED_ROOMS.includes(n));
  if (refused.length) {
    die('refusing to modify approved room(s) ' + refused.join(', ') + ' - this tool is create-only. ' +
        'They are copied into the staging seed verbatim from slice-f1.json.');
  }
  for (const n of rooms) {
    if (BLOCKED_ROOMS[n]) die('room ' + n + ' is BLOCKED: ' + BLOCKED_ROOMS[n] + '. Not building it.');
  }
  const dupes = rooms.filter((n, i) => rooms.indexOf(n) !== i);
  if (dupes.length) die('room number(s) given more than once: ' + [...new Set(dupes)].join(', '));

  /* The MEP copy assumption is re-proved before any copy happens. */
  assertMepConstant(slice);
  /* And so are the label/src/type-slug derivations the King path depends on. */
  const provedLines = assertDerivationRules(db, slice);
  const typeRef = buildTypeReference(db);

  /* Carry forward whatever earlier waves already staged. */
  const docs = {};
  if (!fresh && existsSync(OUT_PATH)) {
    const prev = JSON.parse(readFileSync(OUT_PATH, 'utf8'));
    for (const [k, v] of Object.entries(prev.docs || {})) {
      if (!APPROVED_DOC_IDS.includes(k)) docs[k] = v;
    }
  }

  /* Requirement 4 - the approved 6, verbatim, so the seed is loadable on its own. */
  for (const id of APPROVED_DOC_IDS) docs[id] = clone(slice.docs[id]);

  const reports = [];
  for (const roomNo of rooms) {
    const report = { room: roomNo, unresolved: [] };
    const ffe = buildFFEDoc(db, roomNo, slice, typeRef, stamp, report);
    const mep = buildMepDoc(roomNo, slice, report.refRoom, ffe.floor, stamp, report,
      { typeLabel: ffe.typeLabel });
    report.mepSheetCitations = mepSheetCitations(slice, report.refRoom);
    docs[roomNo] = ffe;
    docs[roomNo + '-MEP'] = mep;
    reports.push(report);
  }

  /* Post-condition: the approved docs in the output are the slice, unchanged. */
  for (const id of APPROVED_DOC_IDS) {
    if (!deepEqual(docs[id], slice.docs[id])) die('internal error: approved doc ' + id + ' was modified');
  }

  const out = {
    meta: {
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
      /* Describes the FILE, not the run, so that building in waves and
       * building in one shot produce a byte-identical seed. */
      stagedDocs: Object.keys(docs).filter((k) => !APPROVED_DOC_IDS.includes(k)).sort(cmpDocId),
      fieldState: 'generated docs are born clean: checked false, initials empty, checkedAt null, issue empty',
      redaction: 'no personal contact data; approved docs carry initials only, as received',
    },
    docs: Object.fromEntries(Object.keys(docs).sort(cmpDocId).map((k) => [k, docs[k]])),
  };

  writeFileSync(OUT_PATH, stringify(out), 'utf8');

  process.stdout.write('\nBUILD REPORT\n' + '-'.repeat(78) + '\n');
  process.stdout.write('label/src/type-slug derivation rules re-proved on ' + provedLines + ' approved lines\n\n');
  for (const r of reports) {
    process.stdout.write(
      'room ' + r.room + '  type ' + r.roomType + '  -> doc type ' + r.docType +
      ' / ' + JSON.stringify(r.docTypeLabel) + '\n' +
      '  package: ' + (r.composed
        ? 'COMPOSED - ' + r.fromDonor.length + ' shared tag(s) carried from approved room ' + r.donorRoom +
          ', ' + r.fromSqlite.length + ' type-only tag(s) built from sqlite'
        : 'copied from approved same-type room ' + r.refRoom) + '\n' +
      '  FF&E : ' + r.ffeLines + ' lines   [' + r.rawRows + ' raw rows -> ' + r.gatedRows +
      ' gated -> ' + r.ffeLines + ' after ' + r.foldedGroups + ' folds]\n' +
      '  MEP  : ' + r.mepLines + ' lines   [' + r.mepSkippedDeleted + ' deleted history rows in ' +
      r.mepRefRoom + ' deliberately not copied]\n' +
      '  unresolved tags: ' + (r.unresolved.length ? r.unresolved.join('; ') : 'none') + '\n');
    if (r.composed) {
      process.stdout.write('  type-only tags (sqlite is the only source): ' + r.fromSqlite.join(', ') + '\n');
      process.stdout.write('  donor tags not applicable to this type: ' +
        (r.donorUnused.length ? r.donorUnused.join(', ') : 'none') + '\n');
      if (r.donorQtyNotes.length) {
        process.stdout.write('  qty differs from donor on: ' + r.donorQtyNotes.join('; ') + '\n');
      }
      if (r.mepSheetCitations && r.mepSheetCitations.length) {
        process.stdout.write('  OPEN: ' + r.mepSheetCitations.length + ' of ' + r.mepLines +
          ' MEP lines cite A555 (the Queen-Queen sheet) and were NOT re-pointed to A550 -\n' +
          '        A550 and A555 do not share a view numbering and no document states the\n' +
          '        A550 equivalents. Lines: ' + r.mepSheetCitations.map((c) => c.key).join(', ') + '\n');
      }
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
