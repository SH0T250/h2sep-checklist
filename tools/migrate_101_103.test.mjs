#!/usr/bin/env node
// migrate_101_103.test.mjs — OFFLINE fixture test for the 101/103 cutover.
//
// No network: the live room-101 doc is a snapshot in RAW REST format
// (tools/fixtures/room-101-live-2026-08-09.json, fetched 2026-08-09) and the
// template is the same file the migrate tool defaults to. The carry
// computation is imported from migrate_101_103.mjs as a pure function.
//
//   node tools/migrate_101_103.test.mjs

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeCarry, buildRoomPayload, buildReport, decodeDoc, RULES_TOP_KEYS } from './migrate_101_103.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// ---- load fixture + template (same default the migrate CLI uses) ----
const fixture = JSON.parse(await readFile(join(HERE, 'fixtures', 'room-101-live-2026-08-09.json'), 'utf8'));
const finalPath = join(HERE, 'out', 'template-101-final.json');
const templatePath = existsSync(finalPath) ? finalPath : join(HERE, '..', 'preview101', 'template-101.json');
const template = JSON.parse(await readFile(templatePath, 'utf8'));
const live = decodeDoc(fixture);

let passed = 0;
const ok = (name, fn) => { fn(); passed++; console.log('ok -', name); };

// fixture sanity: matches the live state verified 2026-08-09
ok('fixture: 30 legacy items, 18 checked, schemaV 1', () => {
  assert.equal(Object.keys(live.items).length, 30);
  assert.equal(Object.values(live.items).filter((it) => it.checked === true).length, 18);
  assert.equal(live.schemaV, 1);
});

const carry = computeCarry(live.items, template.items);

// ---- 14 checked lines with exact initials ----
ok('carry: exactly 14 template lines checked, exact initials', () => {
  const expect = {
    gr100_a: 'CC', gr101_a: 'CC', gr200_a: 'CC', gr201_a: 'CC', gr204_a: 'CC',
    gr205_a: 'CC', gr300_a: 'CC', gr308_a: 'CC', gr318_a: 'CC', gr322_a: 'CC',
    gr400_a: 'CC', gr402_a: 'AJ', gr500_a: 'CC', gr502_a: 'CC',
  };
  const got = Object.fromEntries(Object.entries(carry.items)
    .filter(([, it]) => it.checked === true).map(([id, it]) => [id, it.initials]));
  assert.deepEqual(got, expect);
  assert.equal(carry.checkedCount, 14);
});

ok('carry: gr402_a keeps AJ provenance (name/uid/timestamps)', () => {
  const it = carry.items.gr402_a;
  assert.equal(it.initials, 'AJ');
  // Provenance must be COPIED from the live instance, whatever its values —
  // the fixture's name/uid are redacted placeholders, so read them from the
  // fixture rather than hardcoding (keeps the fixture committable).
  const src = live.items.gr402_a;
  assert.equal(it.checkedByName, src.checkedByName);
  assert.ok(it.checkedByName.length > 0);
  assert.equal(it.checkedByUid, src.checkedByUid);
  assert.ok(it.checkedByUid.length > 0);
  assert.equal(it.checkedAt.__ts, '2026-08-09T00:13:46.991Z');
});

// ---- folded orphans recorded on gr322_a, never dropped ----
ok('folded orphans: gr322_a instanceNote records GR-319 and GR-323 (checked, CC)', () => {
  const note = carry.items.gr322_a.instanceNote;
  assert.match(note, /GR-319/);
  assert.match(note, /GR-323/);
  assert.match(note, /checked \(CC\) before dedupe/);
  assert.equal(carry.folded.length, 2);
  assert.deepEqual(carry.folded.map((f) => f.code).sort(), ['GR-319', 'GR-323']);
  assert.ok(carry.folded.every((f) => f.checked && f.initials === 'CC'));
  assert.ok(carry.folded.every((f) => f.blocking === false)); // no open issues today
});

// a fold line with an OPEN issue: text lands in the DOC note AND blocks --execute
ok('folded orphan with open issue: persisted on gr322_a note + blocking', () => {
  const items = JSON.parse(JSON.stringify(live.items));
  items.gr319_a.issue = 'BROKEN LEG';
  const c = computeCarry(items, template.items);
  assert.match(c.items.gr322_a.instanceNote, /GR-319 issue "BROKEN LEG" \(OPEN\)/);
  assert.ok(c.folded.find((f) => f.code === 'GR-319').blocking);
  assert.ok(!c.folded.find((f) => f.code === 'GR-323').blocking);
});

// ---- alias carry: GR-202 pair -> GR-208 issue ----
ok('alias GR-202 -> gr208_a: issue "NEED INSTALL", unchecked', () => {
  const it = carry.items.gr208_a;
  assert.equal(it.issue, 'NEED INSTALL');
  assert.equal(it.checked, false);
  assert.equal(it.issueResolved, false);
});

ok('issues carried: GR-103, GR-207, GR-600, GR-600.1, GR-602 too', () => {
  assert.equal(carry.items.gr103_a.issue, 'IN BOX');
  assert.equal(carry.items.gr207_a.issue, '?');
  assert.equal(carry.items.gr600_a.issue, 'NEED PROPER PLACE');
  assert.equal(carry.items.gr6001_a.issue, 'NEED PROPER PLACE');
  assert.equal(carry.items.gr602_a.issue, 'NEED PROPER PLACE');
});

// ---- 30-instance accounting ----
ok('accounting: all 30 legacy instances mapped/folded/orphan/deleted', () => {
  const a = carry.accounting;
  assert.equal(a.total, 30);
  assert.equal(a.mapped + a.folded + a.orphan + a.deleted, 30);
  assert.equal(a.folded, 2);
  assert.equal(a.orphan, 0);
  assert.equal(a.deleted, 0); // all 30 live instances are deleted:false today
  assert.equal(carry.orphans.length, 0);
  assert.equal(carry.partials.length, 0);
});

// a crew soft-deleted legacy instance takes NO carry and can't demote its group
ok('deleted legacy instance: bucketed, group stays checked via survivor', () => {
  const items = JSON.parse(JSON.stringify(live.items));
  items.gr300_b.deleted = true;
  items.gr300_b.checked = false;
  const c = computeCarry(items, template.items);
  assert.equal(c.items.gr300_a.checked, true); // sole non-deleted instance is checked
  assert.equal(c.partials.length, 0);
  assert.equal(c.accounting.deleted, 1);
  assert.equal(c.accounting.mapped + c.accounting.folded + c.accounting.orphan + c.accounting.deleted, 30);
});

// ---- payload shape ----
const payload = buildRoomPayload(template, live, carry.items, '2026-08-09T12:00:00.000Z');
ok('payload: only rules-whitelisted top-level keys (accessible/connecting stripped)', () => {
  for (const k of Object.keys(payload)) assert.ok(RULES_TOP_KEYS.includes(k), `non-whitelist key: ${k}`);
  assert.ok(!('accessible' in payload) && !('connecting' in payload));
});

ok('payload: item id set == template id set exactly', () => {
  assert.deepEqual(Object.keys(payload.items).sort(), Object.keys(template.items).sort());
});

ok('payload: original createdAt preserved, updatedAt restamped, live note wins', () => {
  assert.equal(payload.createdAt.__ts, '2026-07-31T06:04:19.909Z');
  assert.equal(payload.updatedAt.__ts, '2026-08-09T12:00:00.000Z');
  assert.equal(payload.notes.n_doorlock.text, live.notes.n_doorlock.text);
  assert.equal(payload.notes.n_doorlock.createdAt.__ts, live.notes.n_doorlock.createdAt.__ts);
});

// ---- report renders with the accounting line ----
ok('report: ends with a full accounting line', () => {
  const report = buildReport(carry, {
    templatePath, mode: 'TEST',
    liveMeta: { itemCount: 30, checkedCount: 18, schemaV: 1, createdAt: live.createdAt.__ts },
  });
  assert.match(report, /ALL 30 legacy instances accounted for: 28 mapped \+ 2 folded \+ 0 orphan \+ 0 deleted = 30 of 30\./);
  assert.match(report, /FOLDED ORPHANS \(2\)/);
  // "[paper code …]" only for REAL aliases — GR-308R yes, GR-300 pair no
  assert.match(report, /\*\*GR-308\*\* .*\[paper code GR-308R\]/);
  assert.doesNotMatch(report, /\[paper code GR-300/);
});

console.log(`\n${passed} checks passed — migrate_101_103 fixture test OK`);
