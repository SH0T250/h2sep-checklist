// Rework one trade's punch lines across the slice MEP docs, per Austin's edits.
// Soft-deletes the trade's current lines (deleted:true, never removed) and adds
// the replacement lines clean. Applies to platform/data/slice-f1.json AND the
// live platform_rooms docs via field-path patches. Crew app data untouched.
//
// Usage: node platform/tools/rework_trade.mjs <spec.json> [--local-only]
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const specPath = process.argv[2];
if (!specPath) { console.error('usage: node rework_trade.mjs <spec.json> [--local-only]'); process.exit(2); }
const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const localOnly = process.argv.includes('--local-only');
const seedPath = resolve(root, 'data/slice-f1.json');
const seed = JSON.parse(readFileSync(seedPath, 'utf8'));

const blank = { checked: false, initials: '', checkedAt: null, checkedAtLocal: null,
  issue: '', issueResolved: false, deleted: false, derived: 1, trade: '' };

const patches = {}; // docId -> {fieldPath: value}
for (const docId of spec.docs) {
  const doc = seed.docs[docId];
  if (!doc) { console.error('missing doc', docId); process.exit(1); }
  const trade = spec.category;
  const old = Object.entries(doc.items).filter(([, it]) => !it.deleted && it.category === trade);
  if (!old.length) { console.error(docId, 'has no live', trade, 'lines'); process.exit(1); }
  const baseSort = Math.min(...old.map(([, it]) => it.sort || 0));
  const p = {};
  for (const [id] of old) { doc.items[id].deleted = true; p[`items.${id}.deleted`] = true; }
  spec.lines.forEach((line, i) => {
    const item = { ...blank, ...line, category: trade, sort: baseSort + i,
      qty: line.qty ?? 1, reliability: line.reliability ?? 'HIGH' };
    doc.items[line.id] = item;
    p[`items.${line.id}`] = item;
  });
  p['updatedAt'] = new Date().toISOString();
  patches[docId] = p;
  console.log(docId, `soft-deleted ${old.length} ${trade} lines, added ${spec.lines.length}`);
}
writeFileSync(seedPath, JSON.stringify(seed, null, 1));
console.log('seed JSON updated');
if (localOnly) process.exit(0);

// ---- push the same patches to the cloud ----
const API_KEY = 'AIzaSyAMRImRm7n7DsDACwH_71gChJTKRkaciT8';
const BASE = 'https://firestore.googleapis.com/v1/projects/h2sep-checklist/databases/(default)/documents';
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  const fields = {}; for (const [k, x] of Object.entries(v)) fields[k] = enc(x);
  return { mapValue: { fields } };
}
const auth = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
  { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"returnSecureToken":true}' })).json();
const H = { authorization: 'Bearer ' + auth.idToken, 'content-type': 'application/json' };
let fail = 0;
for (const [docId, p] of Object.entries(patches)) {
  // Firestore REST: nested field values must be set via a document body whose
  // provided fields mirror the mask paths. Build top-level "items" map carrying
  // only the touched entries; mask paths keep the rest of the doc intact.
  const maskParams = Object.keys(p).map(k => {
    const quoted = k.split('.').map(seg => /^[A-Za-z_][A-Za-z0-9_]*$/.test(seg) ? seg : '`' + seg + '`').join('.');
    return 'updateMask.fieldPaths=' + encodeURIComponent(quoted);
  }).join('&');
  const body = { fields: {} };
  for (const [path, value] of Object.entries(p)) {
    const segs = path.split('.');
    let cursor = body.fields;
    for (let i = 0; i < segs.length - 1; i++) {
      cursor[segs[i]] = cursor[segs[i]] || { mapValue: { fields: {} } };
      cursor = cursor[segs[i]].mapValue.fields;
    }
    cursor[segs[segs.length - 1]] = enc(value);
  }
  const r = await fetch(`${BASE}/projects/h2sep/platform_rooms/${encodeURIComponent(docId)}?${maskParams}`,
    { method: 'PATCH', headers: H, body: JSON.stringify(body) });
  if (!r.ok) { fail++; console.log(docId, 'CLOUD PATCH FAILED', r.status, (await r.text()).slice(0, 200)); continue; }
  // read-back: live trade lines must equal the spec
  const g = await (await fetch(`${BASE}/projects/h2sep/platform_rooms/${encodeURIComponent(docId)}`, { headers: H })).json();
  const items = g.fields.items.mapValue.fields;
  const live = Object.entries(items).filter(([, v]) => {
    const f = v.mapValue.fields;
    return f.category?.stringValue === spec.category && f.deleted?.booleanValue !== true;
  }).map(([id]) => id).sort();
  const want = spec.lines.map(l => l.id).sort();
  const ok = JSON.stringify(live) === JSON.stringify(want);
  console.log(docId, 'cloud verify:', ok ? 'OK' : `MISMATCH live=${live} want=${want}`);
  if (!ok) fail++;
}
process.exit(fail ? 1 : 0);
