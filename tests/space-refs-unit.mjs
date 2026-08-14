#!/usr/bin/env node
// Space refs — the joins the app will actually do, plus index hygiene.
//
// The hazard this file pins: common-area kitchen-equipment codes are NOT
// unique across spaces ("01" is a reach-in freezer in Food Prep 007 and a
// refrigeration rack elsewhere). refs-spaces.json is therefore room-scoped,
// and the join must never leak one room's cutsheet onto another room's code.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, failn = 0;
const ok = (cond, msg) => {
  if (cond) { pass++; }
  else { failn++; console.error('  ✗ ' + msg); }
};

// ---- serve the bundled indexes to refs.js through a fetch stub ----
const files = {
  './refs/refs-101.json': join(ROOT, 'refs', 'refs-101.json'),
  './refs/refs-spaces.json': join(ROOT, 'refs', 'refs-spaces.json'),
};
globalThis.fetch = async (url) => {
  const p = files[String(url)];
  if (!p || !existsSync(p)) return { ok: false };
  return { ok: true, json: async () => JSON.parse(readFileSync(p, 'utf8')) };
};
const { initRefs, refsFor } = await import('../js/refs.js');
await initRefs();

// ---- index hygiene ----
const idxPath = files['./refs/refs-spaces.json'];
ok(existsSync(idxPath), 'refs/refs-spaces.json exists');
const idx = JSON.parse(readFileSync(idxPath, 'utf8'));
const rooms = Object.keys(idx);
ok(rooms.length > 0, 'index has rooms');
let refCount = 0, subCount = 0, planCount = 0;
for (const [room, codes] of Object.entries(idx)) {
  ok(!Array.isArray(codes) && typeof codes === 'object',
    `room ${room} is a code map (room-scoped), not a flat array`);
  for (const [code, refs] of Object.entries(codes)) {
    ok(Array.isArray(refs) && refs.length, `${room}/${code} refs is a non-empty array`);
    for (const r of refs) {
      refCount++;
      if (r.kind === 'submittal') subCount++;
      if (r.kind === 'plan') planCount++;
      ok(r.kind === 'submittal' || r.kind === 'plan', `${room}/${code} ref kind valid`);
      ok(typeof r.title === 'string' && r.title.length > 3, `${room}/${code} ref has a title`);
      if (r.kind === 'submittal') {
        ok(typeof r.driveId === 'string' && r.driveId.length > 10,
          `${room}/${code} submittal has a driveId`);
      }
      if (r.snippet) {
        const f = String(r.snippet).replace(/^(\.\/)?(refs\/)?/, '');
        ok(existsSync(join(ROOT, 'refs', f)), `${room}/${code} snippet ${f} exists on disk`);
      }
    }
  }
}
console.log(`index: ${rooms.length} rooms, ${refCount} refs (${subCount} submittal / ${planCount} plan)`);

// ---- every indexed room/code exists in the reviewed space docs ----
const spaceDocs = {};
for (const f of (await import('node:fs')).readdirSync(join(ROOT, 'tools', 'out', 'spaces'))) {
  if (!f.endsWith('.json')) continue;
  const d = JSON.parse(readFileSync(join(ROOT, 'tools', 'out', 'spaces', f), 'utf8'));
  spaceDocs[String(d.number)] = d;
}
for (const [room, codes] of Object.entries(idx)) {
  const doc = spaceDocs[room];
  ok(!!doc, `indexed room ${room} exists in tools/out/spaces`);
  if (!doc) continue;
  const carried = new Set();
  for (const [iid, it] of Object.entries(doc.items || {})) {
    carried.add(iid);
    if (it.code) carried.add(String(it.code).trim());
  }
  for (const code of Object.keys(codes)) {
    ok(carried.has(code), `room ${room} actually carries "${code}"`);
  }
}

// ---- the room-scoped join: resolves in its room, never leaks across ----
const joinRooms = Object.entries(idx).filter(([, codes]) => Object.keys(codes).length);
if (joinRooms.length) {
  const [room, codes] = joinRooms[0];
  const code = Object.keys(codes)[0];
  const doc = spaceDocs[room];
  const [iid, item] = Object.entries(doc.items).find(([id, it]) =>
    (String(it.code || '').trim() || id) === code) || [null, { code }];
  const got = refsFor(room, { code: item.code || code }, iid || '', doc.typeLabel || '');
  ok(got.length > 0, `refsFor resolves ${room}/${code} (got ${got.length})`);
  const other = refsFor('999', { code: item.code || code }, '', 'Nowhere');
  ok(other.length === 0,
    `room-scoped entry ${room}/${code} does NOT resolve from another room (got ${other.length})`);
}

// ---- ambiguous kitchen codes must never appear as global (flat) keys ----
// (a flat key in refs-spaces.json would resolve for EVERY room via byCode)
for (const [k, v] of Object.entries(idx)) {
  ok(!Array.isArray(v), `top-level key ${k} is not a flat refs array`);
}


// ---- the 📄 entry-point gate ----
// A references page that can only come up empty is a dead action, so the
// button is gated on the room actually resolving refs. This pins both
// directions: floor-1 spaces (published) offer it, upper-floor spaces
// (not yet published, but carrying real checklist items) do not.
const { roomHasRefs } = await import('../js/refs.js');
const readDoc = (n) => {
  const p = join(ROOT, 'tools', 'out', 'spaces', `space-${n}.json`);
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
};
for (const n of ['003', '019', '007']) {
  const d = readDoc(n);
  if (d) ok(roomHasRefs(d) === true, `floor-1 space ${n} offers the references page`);
}
for (const n of ['221', '237', '239', '321', '421']) {
  const d = readDoc(n);
  if (d) {
    const items = Object.values(d.items || {}).filter(i => !i.deleted).length;
    ok(roomHasRefs(d) === false,
      `unpublished floor-${d.floor} space ${n} (${items} items) hides the references page`);
  }
}
// A doc with no items at all must never claim refs.
ok(roomHasRefs({ number: '999', items: {} }) === false, 'empty room resolves no refs');
ok(roomHasRefs(null) === false, 'null room resolves no refs');

console.log(`\nspace-refs-unit (with gate): ${pass} passed, ${failn} failed`);
process.exit(failn ? 1 : 0);
