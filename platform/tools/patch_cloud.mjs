// Apply field-path edits to the slice seed JSON and the cloud platform_rooms
// docs in one pass, with read-back verification. Edits file: {docId: {fieldPath: value}}
// Usage: node platform/tools/patch_cloud.mjs <edits.json> [--local-only]
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const edits = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const localOnly = process.argv.includes('--local-only');
const seedPath = resolve(root, 'data/slice-f1.json');
const seed = JSON.parse(readFileSync(seedPath, 'utf8'));

function applyLocal(doc, path, value) {
  const segs = path.split('.');
  let t = doc;
  for (let i = 0; i < segs.length - 1; i++) {
    if (typeof t[segs[i]] !== 'object' || t[segs[i]] === null) t[segs[i]] = {};
    t = t[segs[i]];
  }
  t[segs[segs.length - 1]] = value;
}
for (const [docId, p] of Object.entries(edits)) {
  const doc = seed.docs[docId];
  if (!doc) { console.error('missing', docId); process.exit(1); }
  for (const [path, value] of Object.entries(p)) applyLocal(doc, path, value);
  console.log(docId, Object.keys(p).length, 'paths applied locally');
}
writeFileSync(seedPath, JSON.stringify(seed, null, 1));
if (localOnly) process.exit(0);

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
for (const [docId, p] of Object.entries(edits)) {
  const withStamp = { ...p, updatedAt: new Date().toISOString() };
  const mask = Object.keys(withStamp).map(k =>
    'updateMask.fieldPaths=' + encodeURIComponent(k.split('.').map(s => /^[A-Za-z_][A-Za-z0-9_]*$/.test(s) ? s : '`' + s + '`').join('.'))).join('&');
  const body = { fields: {} };
  for (const [path, value] of Object.entries(withStamp)) {
    const segs = path.split('.');
    let c = body.fields;
    for (let i = 0; i < segs.length - 1; i++) { c[segs[i]] = c[segs[i]] || { mapValue: { fields: {} } }; c = c[segs[i]].mapValue.fields; }
    c[segs[segs.length - 1]] = enc(value);
  }
  const r = await fetch(`${BASE}/projects/h2sep/platform_rooms/${encodeURIComponent(docId)}?${mask}`,
    { method: 'PATCH', headers: H, body: JSON.stringify(body) });
  console.log(docId, r.ok ? 'cloud OK' : 'CLOUD FAIL ' + r.status + ' ' + (await r.text()).slice(0, 160));
  if (!r.ok) fail++;
}
process.exit(fail ? 1 : 0);
