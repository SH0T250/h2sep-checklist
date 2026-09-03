// Austin, 2026-09-03: 417 is being used as a loading room, so every FF&E line
// in it reads MISSING. Check-offs are left alone here: unchecking is his call.
import { writeFileSync, mkdirSync } from 'node:fs';
const SP = process.argv[2]; const APPLY = process.argv.includes('--apply');
const API_KEY = 'AIzaSyAMRImRm7n7DsDACwH_71gChJTKRkaciT8';
const BASE = 'https://firestore.googleapis.com/v1/projects/h2sep-checklist/databases/(default)/documents';
const COL = 'projects/h2sep/platform_rooms'; const ROOM = '417';
const enc = (v) => typeof v === 'boolean' ? { booleanValue: v } : typeof v === 'string' ? { stringValue: v } : { nullValue: null };
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
const getDoc = async () => dec({ mapValue: { fields: (await (await fetch(`${BASE}/${COL}/${ROOM}`, { headers: H })).json()).fields } });
const doc = await getDoc();
mkdirSync(SP + '/backups', { recursive: true });
writeFileSync(SP + '/backups/417-before.json', JSON.stringify(doc));
const live = Object.entries(doc.items).filter(([, it]) => !it.deleted);
const already = live.filter(([, it]) => it.issue === 'MISSING' && !it.issueResolved).length;
const checked = live.filter(([, it]) => it.checked).length;
console.log(`417 ${doc.typeLabel}: ${live.length} lines, ${already} already MISSING, ${checked} currently checked off`);
const patch = {}; let n = 0;
for (const [k, it] of live) {
  if (it.issue === 'MISSING' && !it.issueResolved) continue;
  patch[`items.${k}.issue`] = 'MISSING'; patch[`items.${k}.issueResolved`] = false; n++;
}
console.log(`would flag ${n} more lines MISSING`);
if (!APPLY) { console.log('dry run only'); process.exit(0); }
patch.updatedAt = new Date().toISOString();
const mask = Object.keys(patch).map(k => 'updateMask.fieldPaths=' + encodeURIComponent(
  k.split('.').map(s => /^[A-Za-z_][A-Za-z0-9_]*$/.test(s) ? s : '`' + s + '`').join('.'))).join('&');
const body = { fields: {} };
for (const [path, value] of Object.entries(patch)) {
  const segs = path.split('.'); let c = body.fields;
  for (let i = 0; i < segs.length - 1; i++) { c[segs[i]] = c[segs[i]] || { mapValue: { fields: {} } }; c = c[segs[i]].mapValue.fields; }
  c[segs[segs.length - 1]] = enc(value);
}
const r = await fetch(`${BASE}/${COL}/${ROOM}?${mask}`, { method: 'PATCH', headers: H, body: JSON.stringify(body) });
console.log(r.ok ? 'written' : 'FAIL ' + r.status + ' ' + (await r.text()).slice(0, 200));
const after = await getDoc();
const bad = Object.entries(after.items).filter(([, it]) => !it.deleted && !(it.issue === 'MISSING' && !it.issueResolved));
console.log(`readback: ${live.length - bad.length} of ${live.length} lines now read MISSING`);
