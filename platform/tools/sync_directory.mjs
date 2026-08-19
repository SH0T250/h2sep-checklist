// Sync the project contact list (Google Sheet) into the app's directory doc:
//   projects/h2sep/platform_rooms/_dir
//
// The Sheet is the source of truth for the rows it holds. This tool writes ONLY
// the fields that actually changed, as field-path patches, so:
//   - a contact added inside the app (no src) is never touched or archived
//   - a row deleted from the Sheet is ARCHIVED (deleted: true), never destroyed
//   - re-running with no Sheet changes writes nothing at all
//
// The same field mapping runs automatically from the Sheet itself, see
// tools/appsscript/SyncContacts.gs. This tool is the manual and audit path.
//
// The Sheet carries personal cell numbers, so its local copy lives in
// tools/private/ (gitignored). Contacts go to Firestore, never to this repo.
//
// Usage: node platform/tools/sync_directory.mjs [--dry-run]
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API_KEY = 'AIzaSyAMRImRm7n7DsDACwH_71gChJTKRkaciT8';
const BASE = 'https://firestore.googleapis.com/v1/projects/h2sep-checklist/databases/(default)/documents';
const COL = 'projects/h2sep/platform_rooms';
const DOC = '_dir';
const dry = process.argv.includes('--dry-run');
const sheetWins = process.argv.includes('--sheet-wins');   // force: overwrite app edits too
const NOW = new Date().toISOString();
const FIELDS = ['category', 'org', 'scope', 'name', 'title', 'phone', 'email', 'address', 'note'];

function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  const fields = {};
  for (const [k, x] of Object.entries(v)) fields[k] = enc(x);
  return { mapValue: { fields } };
}
function dec(v) {
  if (!v || typeof v !== 'object') return v;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
  if ('mapValue' in v) {
    const o = {};
    for (const [k, x] of Object.entries(v.mapValue.fields || {})) o[k] = dec(x);
    return o;
  }
  return v;
}
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18) || 'x';

// Same row mapping as the Apps Script. Keep the two in step.
function parseSheet() {
  const raw = readFileSync(resolve(root, 'tools/private/contact-list-raw.md'), 'utf8');
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const COLS = ['category', 'org', 'scope', 'name', 'title', 'phone', 'email', 'address', 'procore', 'note'];
  const head = lines.shift().split('|');
  if (head.length !== COLS.length) throw new Error(`header has ${head.length} columns, expected ${COLS.length}`);
  const out = {};
  const seen = new Set();
  let skipped = 0, sort = 0;
  for (const line of lines) {
    const cells = line.split('|').map(s => s.replace(/<PIPE>/g, ' |').replace(/\\(.)/g, '$1').trim());
    if (cells.length !== COLS.length) throw new Error(`row has ${cells.length} columns: ${line.slice(0, 60)}`);
    const r = Object.fromEntries(COLS.map((k, i) => [k, cells[i]]));
    if (!r.org && !r.name) { skipped++; continue; }
    let id = 'c_' + slug(r.org) + '_' + slug(r.name || 'x').slice(0, 6);
    while (seen.has(id)) id += 'x';
    seen.add(id);
    sort += 10;
    out[id] = {
      category: r.category || 'Other', org: r.org, scope: r.scope, name: r.name, title: r.title,
      phone: r.phone, email: r.email, address: r.address, note: r.note,
      sort, deleted: false, src: 'sheet',
    };
  }
  return { rows: out, skipped };
}

async function signIn() {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  const j = await r.json();
  if (!j.idToken) throw new Error('anon sign-in failed: ' + JSON.stringify(j).slice(0, 200));
  return j.idToken;
}

const { rows, skipped } = parseSheet();
console.log(`sheet: ${Object.keys(rows).length} contacts (${skipped} empty row skipped)`);

const token = await signIn();
const H = { authorization: 'Bearer ' + token, 'content-type': 'application/json' };
const got = await (await fetch(`${BASE}/${COL}/${DOC}`, { headers: H })).json();
if (!got.fields) throw new Error('_dir not found; run seed_directory.mjs first');
const live = dec({ mapValue: { fields: got.fields } });
const liveItems = live.items || {};
console.log(`live: ${Object.keys(liveItems).length} contact records`);

// ---- diff ----
const patch = {};
const added = [], changed = [], archived = [], appOnly = [], conflicts = [];

// A record edited inside the app since its last sync is NOT overwritten. The
// Sheet is the source of truth for rows nobody has touched in the app; where
// the two disagree, Austin decides, so the conflict is reported, not resolved.
function appEdited(have) {
  const since = have.syncedAt || have.createdAt || '';
  return !!have.updatedAt && have.updatedAt > since;
}
for (const [id, want] of Object.entries(rows)) {
  const have = liveItems[id];
  if (!have) {
    added.push(`${want.org}${want.name ? ' / ' + want.name : ''}`);
    patch[`items.${id}`] = { ...want, createdAt: NOW, updatedAt: NOW, syncedAt: NOW };
    continue;
  }
  const diffs = FIELDS.filter(f => String(have[f] ?? '') !== String(want[f] ?? ''));
  if (have.deleted) diffs.push('deleted');           // came back into the sheet
  if (have.src !== 'sheet') diffs.push('src');
  if (!diffs.length) continue;
  if (appEdited(have) && !sheetWins) {
    conflicts.push(`${want.org}${want.name ? ' / ' + want.name : ''}: ${diffs.filter(f => f !== 'src').map(f =>
      `${f} is "${have[f] ?? ''}" in the app, "${want[f] ?? ''}" in the sheet`).join('; ')}`);
    continue;
  }
  changed.push(`${want.org}${want.name ? ' / ' + want.name : ''}: ${diffs.join(', ')}`);
  for (const f of diffs) {
    if (f === 'deleted') patch[`items.${id}.deleted`] = false;
    else if (f === 'src') patch[`items.${id}.src`] = 'sheet';
    else patch[`items.${id}.${f}`] = want[f];
  }
  patch[`items.${id}.updatedAt`] = NOW;
  patch[`items.${id}.syncedAt`] = NOW;
}
for (const [id, have] of Object.entries(liveItems)) {
  if (rows[id]) continue;
  if (have.src !== 'sheet') { appOnly.push(`${have.org} (added in the app, left alone)`); continue; }
  if (have.deleted) continue;
  archived.push(`${have.org}${have.name ? ' / ' + have.name : ''}`);
  patch[`items.${id}.deleted`] = true;
  patch[`items.${id}.updatedAt`] = NOW;
}

const show = (label, arr) => { if (arr.length) console.log(`\n${label} (${arr.length}):`), arr.forEach(x => console.log('   ' + x)); };
show('ADDED', added);
show('CHANGED', changed);
show('ARCHIVED (removed from the sheet, kept in the app as archived)', archived);
show('APP-ONLY', appOnly);
show('CONFLICT, left as the app has it (rerun with --sheet-wins to take the sheet)', conflicts);

if (!Object.keys(patch).length) { console.log('\nno changes, nothing written'); process.exit(0); }
if (dry) { console.log(`\ndry run: would write ${Object.keys(patch).length} field paths`); process.exit(0); }

patch['updatedAt'] = NOW;
const quote = seg => /^[A-Za-z_][A-Za-z0-9_]*$/.test(seg) ? seg : '`' + seg.replace(/`/g, '\\`') + '`';
const mask = Object.keys(patch).map(p => p.split('.').map(quote).join('.'));
const params = mask.map(m => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&');
const fields = {};
for (const [p, v] of Object.entries(patch)) fields[p.split('.').pop()] = null; // placeholder, replaced below

// Firestore REST wants the nested document body, not flat paths.
function nest(patchObj) {
  const doc = {};
  for (const [path, value] of Object.entries(patchObj)) {
    const parts = path.split('.');
    let t = doc;
    for (let i = 0; i < parts.length - 1; i++) t = (t[parts[i]] ??= {});
    t[parts[parts.length - 1]] = value;
  }
  return doc;
}
const body = JSON.stringify({ fields: enc(nest(patch)).mapValue.fields });
const r = await fetch(`${BASE}/${COL}/${DOC}?${params}`, { method: 'PATCH', headers: H, body });
if (!r.ok) { console.log('WRITE FAILED', r.status, (await r.text()).slice(0, 400)); process.exit(1); }

// ---- read back and verify ----
const after = dec({ mapValue: { fields: (await (await fetch(`${BASE}/${COL}/${DOC}`, { headers: H })).json()).fields } });
let bad = 0;
for (const [id, want] of Object.entries(rows)) {
  const have = after.items?.[id];
  if (!have) { bad++; console.log(`VERIFY FAIL ${id} missing`); continue; }
  const skip = conflicts.some(c => c.startsWith(`${want.org}${want.name ? ' / ' + want.name : ''}:`));
  if (!skip) for (const f of FIELDS) {
    if (String(have[f] ?? '') !== String(want[f] ?? '')) { bad++; console.log(`VERIFY FAIL ${id}.${f}: ${JSON.stringify(have[f])} != ${JSON.stringify(want[f])}`); }
  }
  if (have.deleted) { bad++; console.log(`VERIFY FAIL ${id} still archived`); }
}
const liveCount = Object.values(after.items || {}).filter(c => !c.deleted).length;
console.log(`\nwrote ${Object.keys(patch).length - 1} field paths`);
console.log(`read-back: ${liveCount} active contacts, ${Object.keys(after.items || {}).length} records total`);
console.log(bad ? `DONE WITH ${bad} VERIFY FAILURES` : 'DONE, every sheet row verified in the cloud');
process.exit(bad ? 1 : 0);
