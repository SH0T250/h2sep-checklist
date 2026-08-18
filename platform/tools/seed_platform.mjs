// Seed the platform slice into Firestore: projects/h2sep/platform_rooms/{id}.
// CREATE-ONLY (currentDocument.exists=false): an existing doc is never touched,
// same discipline as tools/seed_rooms.mjs. The crew app's rooms collection is
// never written. Run AFTER the rules addition for platform_rooms is published.
//
// Usage: node platform/tools/seed_platform.mjs [--verify-only]
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const seed = JSON.parse(readFileSync(resolve(root, 'data/slice-f1.json'), 'utf8'));

const API_KEY = 'AIzaSyAMRImRm7n7DsDACwH_71gChJTKRkaciT8';
const PROJECT = 'h2sep-checklist';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const COL = 'projects/h2sep/platform_rooms';
const verifyOnly = process.argv.includes('--verify-only');

// ---- Firestore REST value encoding ----
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') {
    // timestamps in the extract are ISO strings; keep them as strings (the
    // app treats them as ISO), no server-timestamp rewriting on seed.
    return { stringValue: v };
  }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v === 'object') {
    const fields = {};
    for (const [k, x] of Object.entries(v)) fields[k] = enc(x);
    return { mapValue: { fields } };
  }
  throw new Error('unencodable: ' + typeof v);
}

async function signIn() {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  const j = await r.json();
  if (!j.idToken) throw new Error('anon sign-in failed: ' + JSON.stringify(j).slice(0, 200));
  console.log('anon uid:', j.localId);
  return j.idToken;
}

const token = await signIn();
const H = { authorization: 'Bearer ' + token, 'content-type': 'application/json' };
let failures = 0;

for (const [id, doc] of Object.entries(seed.docs)) {
  const url = `${BASE}/${COL}/${encodeURIComponent(id)}`;
  if (!verifyOnly) {
    const body = JSON.stringify({ fields: enc(doc).mapValue.fields });
    const r = await fetch(`${BASE}/${COL}?documentId=${encodeURIComponent(id)}`, { method: 'POST', headers: H, body });
    if (r.status === 409) { console.log(id, 'EXISTS — untouched (create-only)'); }
    else if (!r.ok) { failures++; console.log(id, 'FAILED', r.status, (await r.text()).slice(0, 160)); continue; }
    else console.log(id, 'created');
  }
  // read-back verify
  const g = await fetch(url, { headers: H });
  if (!g.ok) { failures++; console.log(id, 'VERIFY FAILED', g.status); continue; }
  const got = await g.json();
  const liveItems = Object.keys(got.fields?.items?.mapValue?.fields || {}).length;
  const wantItems = Object.keys(doc.items || {}).length;
  console.log(id, `verify: ${liveItems}/${wantItems} items`, liveItems === wantItems ? 'OK' : 'MISMATCH');
  if (liveItems !== wantItems) failures++;
}
process.exit(failures ? 1 : 0);
