// Austin, 2026-09-03: on floor 4 the working wall was not installed, only boxes
// were in the room. He wrote the box numbers at the foot of each sheet and asked
// for them listed under that room's working wall line. The list goes in the flag
// text so it prints directly under the label on both apps. instanceNote is NOT
// touched: on the FLAGGED lines it carries open document conflicts.
import { writeFileSync, mkdirSync } from 'node:fs';
const SP = process.argv[2];
const APPLY = process.argv.includes('--apply');
const API_KEY = 'AIzaSyAMRImRm7n7DsDACwH_71gChJTKRkaciT8';
const BASE = 'https://firestore.googleapis.com/v1/projects/h2sep-checklist/databases/(default)/documents';
const COL = 'projects/h2sep/platform_rooms';
const enc = (v) => v === null || v === undefined ? { nullValue: null }
  : typeof v === 'boolean' ? { booleanValue: v }
  : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v })
  : typeof v === 'string' ? { stringValue: v }
  : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } }
  : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
function dec(v) {
  if (!v || typeof v !== 'object') return v;
  if ('stringValue' in v) return v.stringValue; if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue); if ('doubleValue' in v) return v.doubleValue;
  if ('timestampValue' in v) return v.timestampValue; if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
  if ('mapValue' in v) { const o = {}; for (const [k, x] of Object.entries(v.mapValue.fields || {})) o[k] = dec(x); return o; }
  return v;
}
const auth = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"returnSecureToken":true}' })).json();
const H = { authorization: 'Bearer ' + auth.idToken, 'content-type': 'application/json' };
const getDoc = async (id) => dec({ mapValue: { fields: (await (await fetch(`${BASE}/${COL}/${id}`, { headers: H })).json()).fields } });

// room -> [item key, new flag text], transcribed from the footer of that room's sheet
const EDITS = {
  // Austin's corrections 2026-09-03: room 430 reads L1-L4 not 1-4; the "BOXES ON
  // SITE" wording comes out; the printed prior notes are correct and stay; on
  // 438 the pieces are listed under the tag exactly as he wrote them, GR-309-R-5
  // included; on 436 the L2 box was opened, so it says so.
  '430': ['gr305_a', 'MISSING: PIECE GR-305L1-4 - IN BOX, NOT INSTALLED: L1, L2, L3, L4'],
  '431': ['gr304_a', 'IN BOX, NOT INSTALLED: L1, L2, L3, L4, L5, L6'],
  '433': ['gr304_a', 'MISSING: PIECES GR-304-4 AND GR-304-2 - IN BOX, NOT INSTALLED: R1, R3, R4, R5'],
  '436': ['gr308_a', 'IN BOX, NOT INSTALLED: L1, L2 OPEN, L3, L4, L5, L7'],
  '438': ['gr307_a', 'IN BOX, NOT INSTALLED: GR-307-R-1, GR-307-R-2, GR-307-R-4, GR-309-R-5, GR-307-R-6, GR-307-R-7'],
};
const backup = {}; const plan = [];
for (const [room, [key, text]] of Object.entries(EDITS)) {
  const doc = await getDoc(room); backup[room] = doc;
  const it = doc.items[key];
  if (!it) { console.log(room, 'NO SUCH LINE', key); continue; }
  plan.push({ room, key, code: it.code, from: it.issue || '(no flag)', to: text });
}
mkdirSync(SP + '/backups', { recursive: true });
writeFileSync(SP + '/backups/working-wall-before.json', JSON.stringify(backup));
for (const p of plan) console.log(`${p.room} ${p.code}\n   was: ${p.from}\n   now: ${p.to}`);
if (!APPLY) { console.log('\ndry run only'); process.exit(0); }
let fail = 0;
for (const p of plan) {
  const patch = { [`items.${p.key}.issue`]: p.to, [`items.${p.key}.issueResolved`]: false, updatedAt: new Date().toISOString() };
  const mask = Object.keys(patch).map(k => 'updateMask.fieldPaths=' + encodeURIComponent(k.split('.').join('.'))).join('&');
  const body = { fields: {} };
  for (const [path, value] of Object.entries(patch)) {
    const segs = path.split('.'); let c = body.fields;
    for (let i = 0; i < segs.length - 1; i++) { c[segs[i]] = c[segs[i]] || { mapValue: { fields: {} } }; c = c[segs[i]].mapValue.fields; }
    c[segs[segs.length - 1]] = enc(value);
  }
  const r = await fetch(`${BASE}/${COL}/${p.room}?${mask}`, { method: 'PATCH', headers: H, body: JSON.stringify(body) });
  console.log(p.room, r.ok ? 'written' : 'FAIL ' + r.status + ' ' + (await r.text()).slice(0, 160));
  if (!r.ok) fail++;
}
let bad = 0;
for (const p of plan) {
  const it = (await getDoc(p.room)).items[p.key];
  if (it.issue !== p.to || it.issueResolved) { bad++; console.log('READBACK MISMATCH', p.room, it.issue); }
}
console.log(`readback: ${plan.length - bad} of ${plan.length} match; ${fail} failed writes`);
process.exit(fail || bad ? 1 : 0);
