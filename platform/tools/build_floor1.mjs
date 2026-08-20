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

/* Room 118 King Studio Acc. is BLOCKED - its bathing configuration is an open
 * question. Refuse it by name rather than guess. */
const BLOCKED_ROOMS = { 118: 'King Studio Acc. - bathing configuration is an open question' };

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
  const proof = assertDerivationRules(db, slice);

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
  process.stdout.write('DERIVATION: src == room_items.primary_sheet re-proved on all ' + proof.checked +
    ' approved lines,\n  plus the doc type-slug on all 6 approved docs. This is the rule the King\n' +
    '  composition uses to re-point citations from A555 to A550.\n');
  for (const n of proof.labelNotes) process.stdout.write('  INFO ' + n + '\n');
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

  for (const line of red.lines) {
    /* Shape is always sqlite. Package content depends on whether the donor has
     * this exact (category, tag). */
    const hit = refIndex.get(donorKey(line.category, line.code, line.key));

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

    /* Note (c): a single FLAGGED row whose note says no count is printed gets
     * NO qty at all. Everything else is folded row count. */
    const note = g.first.note || '';
    const countIsUnknown = g.rows.length === 1
      && g.first.reliability === 'FLAGGED'
      && SPACE_NO_COUNT_RE.test(note);
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

function buildSpaceBandDoc(space, band, red, stamp) {
  const isMep = band === 'mep';
  const docId = isMep ? spaceMepDocId(space.space_no) : spaceDocId(space.space_no);
  const items = {};

  for (const line of red.lines) {
    if (!line.sqlite.src) {
      die('space ' + space.space_no + ' line ' + line.key + ' (' + (line.code || '<untagged>') +
          '): no primary_sheet and no source_sheet in sqlite - refusing to emit an uncited line');
    }

    /* instanceNote carries the database's own text, verbatim. The flag prefix
     * mirrors the shape the approved MEDIUM guest-room lines already use.
     * Where the count is unknown, the DB's own explanation of WHY is what gets
     * shown, so a crew member reading the line sees the reason, not a blank. */
    const parts = [];
    if (line.sqlite.instanceNote) parts.push(line.sqlite.instanceNote);
    if (line.qtyUnknown && line.sqlite.note) parts.push('QTY NOT STATED - ' + line.sqlite.note);
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
    notes: {},
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
      docs[spaceDocId(s.space_no)] = buildSpaceBandDoc(space, 'ffe', ffe, opts.stamp);
      totalFfe += ffe.lines.length;
    }
    if (mep.lines.length) {
      docs[spaceMepDocId(s.space_no)] = buildSpaceBandDoc(space, 'mep', mep, opts.stamp);
      totalMep += mep.lines.length;
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

  W('\nAPP-SIDE OPEN ITEM: js/util.js mepParent() matches /^(\\d+)-MEP$/ and mepIdFor() appends\n' +
    "  '-MEP'. Neither understands a space MEP id, so " + Object.keys(docs).filter((k) => k.endsWith(SPACE_MEP_SUFFIX)).length +
    ' space MEP doc(s) will not link\n  to their parent until those helpers learn the space scheme. Not patched here.\n');

  if (opts.reportOnly) {
    W('\n--spaces-report: analysis only. Nothing written.\n\n');
    return;
  }

  /* ---- merge and write ---- */
  const outDocs = {};
  if (!opts.fresh && existsSync(OUT_PATH)) {
    const prev = JSON.parse(readFileSync(OUT_PATH, 'utf8'));
    for (const [k, v] of Object.entries(prev.docs || {})) {
      if (!APPROVED_DOC_IDS.includes(k)) outDocs[k] = v;
    }
  }
  const carriedRooms = Object.keys(outDocs).length;
  for (const id of APPROVED_DOC_IDS) outDocs[id] = clone(slice.docs[id]);
  for (const [k, v] of Object.entries(docs)) outDocs[k] = v;

  for (const id of APPROVED_DOC_IDS) {
    if (!deepEqual(outDocs[id], slice.docs[id])) die('internal error: approved doc ' + id + ' was modified');
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
      ...prevMeta,
      generator: 'platform/tools/build_floor1.mjs',
      project: 'H2SEP - Home2 Suites by Hilton, Eagle Pass TX',
      floor: 1,
      builtAt: opts.stamp,
      stampIsConstant: true,
      approvedSource: 'platform/data/slice-f1.json (read only, never written)',
      approvedDocs: APPROVED_DOC_IDS.slice(),
      spaceNumbering: 'PLAN numbering from the architectural set (Austin ruling D18); data/project.sqlite spaces table. NOT the QC Deficiency Tracker numbering.',
      spaceShapeSource: 'data/project.sqlite space_items (category gate + fold by category/tag/source_sheet)',
      spacePackageSource: 'data/project.sqlite space_items columns verbatim - no approved common-area doc exists to copy from',
      spaceIdScheme: "'S' + space_no with non-alphanumerics stripped; MEP companion suffix '-M'; every id <= " + SPACE_ID_MAX + ' chars and number == docId',
      spaceQtyPolicy: 'qty is the number of folded rows; it is OMITTED (not defaulted to 1) where no sheet states a count',
      spaceFfeWorkbook: 'FF&E Installation "1st Floor FF&E Installation" tab (Drive 1vHg6-8vDVLpoE-x0jwjijOOlXJX4B1Jy) carries the public-area tags and container numbers with EVERY TOTAL BLANK; used for tag identity only, never for quantities',
      spaceDocs: Object.keys(docs).sort(cmpDocId),
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
  let fresh = false, wantSelftest = false, spacesMode = false, spacesReportOnly = false;
  const positional = [];

  for (const a of args) {
    if (a === '--selftest') { wantSelftest = true; continue; }
    if (a === '--fresh') { fresh = true; continue; }
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
  /* And the label/src/type-slug derivations the King composition depends on. */
  const proof = assertDerivationRules(db, slice);
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
  process.stdout.write('src / type-slug derivation rules re-proved on ' + proof.checked + ' approved lines' +
    (proof.labelNotes.length ? ' (' + proof.labelNotes.length + ' label(s) enriched by submittal)' : '') + '\n\n');
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
      for (const n of r.donorLabelNotes) process.stdout.write('  INFO ' + n + '\n');
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
