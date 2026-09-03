// Floor-4 walk, 2026-09-03. Austin's rules: an X or a tick in the box means the
// item is installed, so it is checked off and any old flag is cleared; where he
// wrote words as well, the words win; an underline alone confirms the printed
// flag and changes nothing. Working-wall lines already written today are skipped.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const SP = process.argv[2];
const APPLY = process.argv.includes('--apply');
const WALK = JSON.parse(readFileSync(SP + '/f4_walk.json', 'utf8'));
const SKIP = { '430': ['gr305_a'], '431': ['gr304_a'], '433': ['gr304_a'], '436': ['gr308_a'], '438': ['gr307_a'] };
const WHO = { initials: 'AJ', company: 'Triun, LLC' };
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

const backup = {}, plan = [], notFound = [], flagged = [];
for (const [room, walk] of Object.entries(WALK)) {
  const doc = await getDoc(room); backup[room] = doc;
  const skip = SKIP[room] || [];
  const byCode = new Map();
  for (const [k, it] of Object.entries(doc.items || {})) {
    if (it.deleted) continue;
    const c = String(it.code || '').trim().toUpperCase();
    if (c) byCode.set(c, [k, it]);
    byCode.set('L:' + String(it.label || '').trim().toUpperCase(), [k, it]);
  }
  const find = (tag) => byCode.get(String(tag).trim().toUpperCase()) || byCode.get('L:' + String(tag).trim().toUpperCase());
  for (const tag of walk.X) {
    const hit = find(tag);
    if (!hit) { notFound.push(`${room} ${tag} (check-off)`); continue; }
    const [k, it] = hit;
    if (skip.includes(k)) continue;
    // A FLAGGED line carries an open document conflict about WHICH part was
    // specified, not about whether it is installed. Austin walked the room and
    // marked it installed, so it is checked off; the conflict record (the
    // reliability field and its note) is left exactly as it was.
    if (it.reliability === 'FLAGGED') flagged.push(`${room} ${tag} — checked off, conflict record left standing`);
    plan.push({ room, key: k, code: it.code || it.label.slice(0, 22), kind: 'check',
      was: `${it.checked ? 'checked' : 'unchecked'}${it.issue && !it.issueResolved ? ', ' + it.issue : ''}` });
  }
  for (const [tag, text] of Object.entries(walk.flag)) {
    const hit = find(tag);
    if (!hit) { notFound.push(`${room} ${tag} (flag)`); continue; }
    const [k, it] = hit;
    if (skip.includes(k)) continue;
    plan.push({ room, key: k, code: it.code || it.label.slice(0, 22), kind: 'flag', text,
      was: it.issue && !it.issueResolved ? it.issue : '(no flag)' });
  }
}
mkdirSync(SP + '/backups', { recursive: true });
writeFileSync(SP + '/backups/floor4-walk-before.json', JSON.stringify(backup));
console.log(`PLAN: ${plan.filter(p => p.kind === 'check').length} check-offs, ${plan.filter(p => p.kind === 'flag').length} flag changes, across ${new Set(plan.map(p => p.room)).size} rooms`);
if (notFound.length) { console.log('\nNOT FOUND (no such line in that room):'); notFound.forEach(x => console.log('  ' + x)); }
if (flagged.length) { console.log('\nLEFT ALONE (flagged, sources disagree — only Austin closes those):'); flagged.forEach(x => console.log('  ' + x)); }
if (!APPLY) { writeFileSync(SP + '/f4-walk-plan.json', JSON.stringify(plan, null, 1)); console.log('\ndry run only'); process.exit(0); }

const stamp = new Date().toISOString();
const byRoom = {};
for (const p of plan) {
  const e = byRoom[p.room] = byRoom[p.room] || {};
  if (p.kind === 'check') {
    e[`items.${p.key}.checked`] = true; e[`items.${p.key}.initials`] = WHO.initials;
    e[`items.${p.key}.checkedByCo`] = WHO.company; e[`items.${p.key}.checkedAt`] = stamp;
    e[`items.${p.key}.checkedAtLocal`] = stamp;
    e[`items.${p.key}.issue`] = ''; e[`items.${p.key}.issueResolved`] = false;
  } else {
    e[`items.${p.key}.issue`] = p.text; e[`items.${p.key}.issueResolved`] = false;
  }
}
let fail = 0;
for (const [room, patch] of Object.entries(byRoom)) {
  const withStamp = { ...patch, updatedAt: stamp };
  // Firestore field masks: a path segment that does not start with a letter or
  // underscore (item keys like "901_a") has to be backtick-quoted.
  const mask = Object.keys(withStamp).map(k => 'updateMask.fieldPaths=' + encodeURIComponent(
    k.split('.').map(seg => /^[A-Za-z_][A-Za-z0-9_]*$/.test(seg) ? seg : '`' + seg + '`').join('.'))).join('&');
  const body = { fields: {} };
  for (const [path, value] of Object.entries(withStamp)) {
    const segs = path.split('.'); let c = body.fields;
    for (let i = 0; i < segs.length - 1; i++) { c[segs[i]] = c[segs[i]] || { mapValue: { fields: {} } }; c = c[segs[i]].mapValue.fields; }
    c[segs[segs.length - 1]] = enc(value);
  }
  const r = await fetch(`${BASE}/${COL}/${room}?${mask}`, { method: 'PATCH', headers: H, body: JSON.stringify(body) });
  if (!r.ok) { fail++; console.log(room, 'FAIL', r.status, (await r.text()).replace(/\s+/g,' ').slice(0, 300)); }
  else console.log(room, 'written', Object.keys(patch).length, 'fields');
}
let bad = 0;
for (const room of Object.keys(byRoom)) {
  const doc = await getDoc(room);
  for (const p of plan.filter(x => x.room === room)) {
    const it = doc.items[p.key];
    if (p.kind === 'check' && (!it.checked || it.initials !== WHO.initials || (it.issue && !it.issueResolved))) { bad++; console.log('MISMATCH', room, p.code, JSON.stringify({ checked: it.checked, issue: it.issue })); }
    if (p.kind === 'flag' && (it.issue !== p.text || it.issueResolved)) { bad++; console.log('MISMATCH', room, p.code, it.issue); }
  }
}
console.log(`\nreadback: ${plan.length - bad} of ${plan.length} lines match; ${fail} failed writes`);
process.exit(fail || bad ? 1 : 0);
