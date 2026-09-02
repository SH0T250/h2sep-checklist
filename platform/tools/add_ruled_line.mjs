/* Add a ruled line to every LIVE guest-room document that lacks it, additively.
 *
 * The line itself comes from the staged seeds (floor1..4-staged.json), which
 * the generators produced from RULED_LINE_ADDITIONS, so what goes live is
 * byte-for-byte what a rebuild would produce. This tool never rewrites a
 * document: it PATCHes exactly one item path (items.<key>) plus updatedAt on
 * documents where the key is absent, and leaves every other field, every other
 * item, and every other document untouched. Nothing is ever deleted.
 *
 * DRY RUN BY DEFAULT. --apply writes, after a backup of the live collection.
 * The crew collection (projects/h2sep/rooms) is read before and after and
 * never written.
 *
 *   node platform/tools/add_ruled_line.mjs --key=tvmount_a
 *   node platform/tools/add_ruled_line.mjs --key=tvmount_a --apply
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '..');
const API_KEY = 'AIzaSyAMRImRm7n7DsDACwH_71gChJTKRkaciT8';
const BASE = 'https://firestore.googleapis.com/v1/projects/h2sep-checklist/databases/(default)/documents';
const COL = 'projects/h2sep/platform_rooms';
const CREW = 'projects/h2sep/rooms';
const keyArg = process.argv.find(a => a.startsWith('--key='));
const KEY = keyArg ? keyArg.slice(6) : '';
if (!/^[A-Za-z0-9_-]{1,40}$/.test(KEY)) { console.error('usage: add_ruled_line.mjs --key=<itemKey> [--apply]'); process.exit(2); }
const apply = process.argv.includes('--apply');

function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  const f = {}; for (const [k, x] of Object.entries(v)) f[k] = enc(x);
  return { mapValue: { fields: f } };
}
function dec(v) {
  if (!v || typeof v !== 'object') return v;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
  if ('mapValue' in v) { const o = {}; for (const [k, x] of Object.entries(v.mapValue.fields || {})) o[k] = dec(x); return o; }
  return v;
}
async function signIn() {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"returnSecureToken":true}' });
  const j = await r.json(); if (!j.idToken) throw new Error('anon sign-in failed'); return j.idToken;
}
async function readCollection(col, H) {
  const out = {}; let pageToken = '';
  do {
    const j = await (await fetch(`${BASE}/${col}?pageSize=300${pageToken ? '&pageToken=' + pageToken : ''}`, { headers: H })).json();
    if (j.error) throw new Error(`${col}: ${JSON.stringify(j.error).slice(0, 200)}`);
    for (const d of j.documents || []) out[d.name.split('/').pop()] = { data: dec({ mapValue: { fields: d.fields } }), updateTime: d.updateTime };
    pageToken = j.nextPageToken || '';
  } while (pageToken);
  return out;
}

/* ---- the line, from the seeds ---- */
const seedLine = {};   // docId -> item
for (const f of [1, 2, 3, 4]) {
  const path = resolve(root, `data/floor${f}-staged.json`);
  if (!existsSync(path)) continue;
  const j = JSON.parse(readFileSync(path, 'utf8'));
  for (const [id, d] of Object.entries(j.docs)) if (d.items && d.items[KEY] && !d.items[KEY].deleted) seedLine[id] = d.items[KEY];
}
const shapes = new Set(Object.values(seedLine).map(it => JSON.stringify({ ...it, checked: 0, initials: 0, checkedAt: 0, checkedAtLocal: 0, issue: 0, issueResolved: 0 })));
console.log(`seed carries ${KEY} on ${Object.keys(seedLine).length} document(s), ${shapes.size} distinct shape(s)`);
if (!Object.keys(seedLine).length) { console.error('nothing to add: the seeds do not carry this key'); process.exit(2); }

const H = { authorization: 'Bearer ' + await signIn(), 'content-type': 'application/json' };
const live = await readCollection(COL, H);
const crewBefore = await readCollection(CREW, H);
console.log(`live collection ${Object.keys(live).length} docs; crew collection ${Object.keys(crewBefore).length} docs (read only)`);

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
mkdirSync(resolve(repo, 'tools/out/backups'), { recursive: true });
const backupPath = resolve(repo, `tools/out/backups/platform-before-${KEY}-${stamp}.json`);
writeFileSync(backupPath, JSON.stringify(live, null, 1));
console.log(`backup: ${backupPath}`);

const todo = [], already = [], missingLive = [];
for (const [id, it] of Object.entries(seedLine)) {
  const l = live[id];
  if (!l) { missingLive.push(id); continue; }
  if (l.data.items && l.data.items[KEY]) { already.push(id); continue; }
  // born clean: the live line starts unchecked with no issue, whatever the seed's field state
  todo.push({ id, item: { ...it, checked: false, initials: '', checkedAt: null, checkedAtLocal: null, issue: '', issueResolved: false } });
}
console.log(`ADD     ${todo.length} document(s): ${todo.map(t => t.id).join(', ')}`);
console.log(`SKIP    ${already.length} already carry ${KEY}`);
if (missingLive.length) console.log(`ABSENT  ${missingLive.length} seed document(s) not live (left alone): ${missingLive.join(', ')}`);
if (!apply) { console.log('\nDRY RUN. Nothing was written. Re-run with --apply.'); process.exit(0); }

let failures = 0;
for (const t of todo) {
  const body = JSON.stringify({ fields: { items: { mapValue: { fields: { [KEY]: enc(t.item) } } }, updatedAt: enc(new Date().toISOString()) } });
  const url = `${BASE}/${COL}/${encodeURIComponent(t.id)}?updateMask.fieldPaths=${encodeURIComponent('items.' + KEY)}&updateMask.fieldPaths=updatedAt`;
  const r = await fetch(url, { method: 'PATCH', headers: H, body });
  if (!r.ok) { failures++; console.log(`  ${t.id} FAILED ${r.status} ${(await r.text()).slice(0, 200)}`); }
}
const after = await readCollection(COL, H);
let bad = 0;
for (const t of todo) {
  const a = after[t.id];
  if (!a || !a.data.items[KEY]) { bad++; console.log(`  VERIFY FAIL ${t.id}: ${KEY} missing`); continue; }
  const before = live[t.id].data.items, now = a.data.items;
  if (Object.keys(now).length !== Object.keys(before).length + 1) { bad++; console.log(`  VERIFY FAIL ${t.id}: item count ${Object.keys(before).length} -> ${Object.keys(now).length}`); }
  for (const k of Object.keys(before)) if (JSON.stringify(before[k]) !== JSON.stringify(now[k])) { bad++; console.log(`  VERIFY FAIL ${t.id}: item ${k} changed`); break; }
}
for (const id of Object.keys(live)) if (!todo.some(t => t.id === id) && after[id] && after[id].updateTime !== live[id].updateTime) { bad++; console.log(`  VERIFY FAIL ${id}: a document outside the patch moved`); }
const crewAfter = await readCollection(CREW, H);
const crewMoved = Object.entries(crewBefore).filter(([id, d]) => !crewAfter[id] || crewAfter[id].updateTime !== d.updateTime).length;
console.log(`\ncrew collection: ${Object.keys(crewBefore).length} docs re-read, ${crewMoved ? crewMoved + ' MOVED' : 'every updateTime identical before and after - UNTOUCHED'}`);
if (crewMoved) bad++;
console.log(failures || bad ? `DONE WITH ${failures} write failure(s) and ${bad} verify failure(s)` : `DONE: ${KEY} added to ${todo.length} document(s), every one verified, nothing else moved`);
process.exit(failures || bad ? 1 : 0);
