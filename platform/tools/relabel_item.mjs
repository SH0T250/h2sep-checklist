/* Change ONE field on ONE item key across every live document that carries it,
 * only where the current value equals the expected old value. Backup first,
 * one PATCH per document with an updateMask on that single path plus
 * updatedAt, read-back verified, crew collection read only.
 *   node platform/tools/relabel_item.mjs --key=tvmount_a --field=label --from="TV mount installed" --to="TV mount" [--apply]
 */
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (n) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : ''; };
const KEY = arg('key'), FIELD = arg('field'), FROM = arg('from'), TO = arg('to'), apply = process.argv.includes('--apply');
if (!/^[A-Za-z0-9_-]+$/.test(KEY) || !/^[A-Za-z]+$/.test(FIELD) || !TO) { console.error('usage: --key= --field= --from= --to= [--apply]'); process.exit(2); }
const API_KEY = 'AIzaSyAMRImRm7n7DsDACwH_71gChJTKRkaciT8';
const BASE = 'https://firestore.googleapis.com/v1/projects/h2sep-checklist/databases/(default)/documents';
function dec(v){if(!v||typeof v!=='object')return v;if('stringValue'in v)return v.stringValue;if('booleanValue'in v)return v.booleanValue;if('integerValue'in v)return Number(v.integerValue);if('doubleValue'in v)return v.doubleValue;if('timestampValue'in v)return v.timestampValue;if('nullValue'in v)return null;if('arrayValue'in v)return(v.arrayValue.values||[]).map(dec);if('mapValue'in v){const o={};for(const[k,x]of Object.entries(v.mapValue.fields||{}))o[k]=dec(x);return o;}return v;}
const j = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"returnSecureToken":true}' })).json();
const H = { authorization: 'Bearer ' + j.idToken, 'content-type': 'application/json' };
async function col(c) { const out = {}; let t = ''; do { const r = await (await fetch(`${BASE}/${c}?pageSize=300${t ? '&pageToken=' + t : ''}`, { headers: H })).json(); if (r.error) throw new Error(JSON.stringify(r.error)); for (const d of r.documents || []) out[d.name.split('/').pop()] = { data: dec({ mapValue: { fields: d.fields } }), updateTime: d.updateTime }; t = r.nextPageToken || ''; } while (t); return out; }
const live = await col('projects/h2sep/platform_rooms'); const crewBefore = await col('projects/h2sep/rooms');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
mkdirSync(resolve(repo, 'tools/out/backups'), { recursive: true });
const bk = resolve(repo, `tools/out/backups/platform-before-relabel-${KEY}-${stamp}.json`); writeFileSync(bk, JSON.stringify(live, null, 1)); console.log('backup:', bk);
const todo = Object.entries(live).filter(([, d]) => d.data.items && d.data.items[KEY] && d.data.items[KEY][FIELD] === FROM).map(([id]) => id);
const other = Object.entries(live).filter(([, d]) => d.data.items && d.data.items[KEY] && d.data.items[KEY][FIELD] !== FROM && d.data.items[KEY][FIELD] !== TO).map(([id]) => id);
console.log(`CHANGE ${todo.length} document(s): items.${KEY}.${FIELD} "${FROM}" -> "${TO}"`); if (other.length) console.log(`LEFT ALONE ${other.length} with another value: ${other.join(', ')}`);
if (!apply) { console.log('DRY RUN. Nothing written.'); process.exit(0); }
let failures = 0;
for (const id of todo) {
  const url = `${BASE}/projects/h2sep/platform_rooms/${encodeURIComponent(id)}?updateMask.fieldPaths=${encodeURIComponent(`items.${KEY}.${FIELD}`)}&updateMask.fieldPaths=updatedAt`;
  const body = JSON.stringify({ fields: { items: { mapValue: { fields: { [KEY]: { mapValue: { fields: { [FIELD]: { stringValue: TO } } } } } } }, updatedAt: { stringValue: new Date().toISOString() } } });
  const r = await fetch(url, { method: 'PATCH', headers: H, body }); if (!r.ok) { failures++; console.log(id, 'FAILED', r.status, (await r.text()).slice(0, 160)); }
}
const after = await col('projects/h2sep/platform_rooms'); let bad = 0;
for (const id of todo) { const a = after[id].data.items, b = live[id].data.items; if (a[KEY][FIELD] !== TO) { bad++; console.log('VERIFY FAIL', id); } for (const k of Object.keys(b)) { const x = { ...b[k] }, y = { ...a[k] }; if (k === KEY) { delete x[FIELD]; delete y[FIELD]; } if (JSON.stringify(x) !== JSON.stringify(y)) { bad++; console.log('VERIFY FAIL', id, 'item', k, 'changed'); break; } } }
for (const id of Object.keys(live)) if (!todo.includes(id) && after[id] && after[id].updateTime !== live[id].updateTime) { bad++; console.log('VERIFY FAIL', id, 'outside the patch moved'); }
const crewAfter = await col('projects/h2sep/rooms'); const moved = Object.entries(crewBefore).filter(([id, d]) => !crewAfter[id] || crewAfter[id].updateTime !== d.updateTime).map(([id]) => id);
console.log(`crew collection: ${Object.keys(crewBefore).length} docs re-read, ${moved.length ? 'moved by the crew during the run: ' + moved.join(', ') : 'every updateTime identical - UNTOUCHED'} (this tool never writes it)`);
console.log(failures || bad ? `DONE WITH ${failures} write failure(s) and ${bad} verify failure(s)` : `DONE: ${todo.length} document(s) relabeled and verified, nothing else moved`);
process.exit(failures || bad ? 1 : 0);
