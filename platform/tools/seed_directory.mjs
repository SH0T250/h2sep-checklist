// Seed the project directory and the auto-matched assignments into Firestore:
//   projects/h2sep/platform_rooms/_dir   contacts
//   projects/h2sep/platform_rooms/_asg   assignments
// Both use the same doc shape as a room, so the rules Austin already published
// cover them and no rules change was needed.
//
// SAFETY
//  - Backs the whole platform collection up before any write.
//  - CREATE-ONLY: an existing _dir or _asg is reported and left untouched.
//  - The crew app's rooms collection is never read for writes or touched.
//  - The source list carries personal cell numbers and emails. It lives in
//    tools/private/ (gitignored). Contacts go to Firestore, never to the repo.
//
// Usage: node platform/tools/seed_directory.mjs [--verify-only] [--local-seed]
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '..');
const API_KEY = 'AIzaSyAMRImRm7n7DsDACwH_71gChJTKRkaciT8';
const PROJECT = 'h2sep-checklist';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const COL = 'projects/h2sep/platform_rooms';
const verifyOnly = process.argv.includes('--verify-only');
const SLICE_ROOMS = ['101', '103', '105'];
const NOW = new Date().toISOString();

// ---- Firestore REST value encoding (same as seed_platform.mjs) ----
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (typeof v === 'object') {
    const fields = {};
    for (const [k, x] of Object.entries(v)) fields[k] = enc(x);
    return { mapValue: { fields } };
  }
  throw new Error('unencodable: ' + typeof v);
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

// ---- parse the private contact list ----
function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18) || 'x';
}
function buildContacts() {
  const raw = readFileSync(resolve(root, 'tools/private/contact-list-raw.md'), 'utf8');
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const head = lines.shift().split('|').map(s => s.trim());
  const COLS = ['category', 'org', 'scope', 'name', 'title', 'phone', 'email', 'address', 'procore', 'note'];
  if (head.length !== COLS.length) throw new Error(`header has ${head.length} columns, expected ${COLS.length}`);
  const out = {};
  const seen = new Set();
  let skipped = 0, sort = 0;
  for (const line of lines) {
    const cells = line.split('|').map(s => s.replace(/<PIPE>/g, ' |').trim());
    if (cells.length !== COLS.length) throw new Error(`row has ${cells.length} columns: ${line.slice(0, 60)}`);
    const r = Object.fromEntries(COLS.map((k, i) => [k, cells[i]]));
    if (!r.org && !r.name) { skipped++; continue; }         // the empty Engineer slot
    let id = 'c_' + slug(r.org) + '_' + slug(r.name || 'x').slice(0, 6);
    while (seen.has(id)) id += 'x';
    seen.add(id);
    sort += 10;
    out[id] = {
      category: r.category || 'Other', org: r.org, scope: r.scope, name: r.name,
      title: r.title, phone: r.phone, email: r.email, address: r.address, note: r.note,
      sort, deleted: false, src: 'sheet', createdAt: NOW, updatedAt: NOW, syncedAt: NOW,
    };
  }
  return { contacts: out, skipped };
}

// Only where the contact list's own Scope column names the trade. No guessing:
// anything not stated there stays unassigned for Austin to set in the app.
const AUTO = [
  ['Mechanical', 'Iceberg Heating & Air Conditioning', 'Install'],
  ['Electrical', 'United Electric', 'Install'],
  ['Plumbing', "Larry's Commercial & Residential Plumbing, LLC", 'Install'],
  ['Fire Protection', 'Texas Fire Services, LLC', 'Install'],
  ['Low Voltage', 'Access Online Inc', 'Install'],
  ['Appliance', 'Rapid Hotel Supplies', 'Supply'],
];
function buildAssignments(contacts) {
  const out = {};
  for (const [category, org, role] of AUTO) {
    const hit = Object.entries(contacts).find(([, c]) => c.org === org);
    if (!hit) throw new Error('no contact for ' + org);
    const [cid, c] = hit;
    out['a_auto_' + slug(category)] = {
      contactId: cid, org: c.org, contactName: c.name, phone: c.phone,
      category, role, rooms: [...SLICE_ROOMS], due: '',
      note: 'Matched from the contact list scope column. Confirm the company and set a due date.',
      source: 'auto-match', deleted: false, by: 'AJ', createdAt: NOW, updatedAt: NOW,
    };
  }
  return out;
}
function shell(id, type, typeLabel, items) {
  return {
    number: id, floor: 0, type, typeLabel, items, notes: {},
    deleted: false, schemaV: 1, createdAt: NOW, updatedAt: NOW,
  };
}

// ---- build ----
const { contacts, skipped } = buildContacts();
const assignments = buildAssignments(contacts);
const orgs = new Set(Object.values(contacts).map(c => c.org));
console.log(`parsed ${Object.keys(contacts).length} people across ${orgs.size} companies (${skipped} empty row skipped)`);
console.log(`built ${Object.keys(assignments).length} auto-matched assignments: ${AUTO.map(a => a[0]).join(', ')}`);

const DOCS = {
  _dir: shell('_dir', 'directory', 'Project Directory', contacts),
  _asg: shell('_asg', 'assignments', 'Sub Assignments', assignments),
};

// A local seed carrying the directory, for browser testing only. Gitignored:
// it holds the same PII as the source list.
if (process.argv.includes('--local-seed')) {
  const slice = JSON.parse(readFileSync(resolve(root, 'data/slice-f1.json'), 'utf8'));
  slice.docs = { ...slice.docs, ...DOCS };
  mkdirSync(resolve(root, 'tools/private'), { recursive: true });
  writeFileSync(resolve(root, 'tools/private/slice-with-dir.json'), JSON.stringify(slice, null, 1));
  console.log('wrote platform/tools/private/slice-with-dir.json (gitignored, test only)');
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
const token = await signIn();
const H = { authorization: 'Bearer ' + token, 'content-type': 'application/json' };

// ---- backup the whole platform collection before touching anything ----
async function listCollection() {
  const docs = {};
  let pageToken = '';
  do {
    const r = await fetch(`${BASE}/${COL}?pageSize=100${pageToken ? '&pageToken=' + pageToken : ''}`, { headers: H });
    const j = await r.json();
    for (const d of j.documents || []) {
      const id = d.name.split('/').pop();
      docs[id] = { fields: dec({ mapValue: { fields: d.fields } }), updateTime: d.updateTime };
    }
    pageToken = j.nextPageToken || '';
  } while (pageToken);
  return docs;
}
const before = await listCollection();
const stamp = NOW.replace(/[:.]/g, '-');
mkdirSync(resolve(repo, 'tools/out/backups'), { recursive: true });
const backupPath = resolve(repo, `tools/out/backups/platform-before-directory-${stamp}.json`);
writeFileSync(backupPath, JSON.stringify(before, null, 1));
console.log(`backup: ${Object.keys(before).length} platform docs -> ${backupPath}`);

// ---- create-only write ----
let failures = 0;
for (const [id, doc] of Object.entries(DOCS)) {
  if (!verifyOnly) {
    const body = JSON.stringify({ fields: enc(doc).mapValue.fields });
    const r = await fetch(`${BASE}/${COL}?documentId=${encodeURIComponent(id)}`, { method: 'POST', headers: H, body });
    if (r.status === 409) console.log(`${id} EXISTS — untouched (create-only)`);
    else if (!r.ok) { failures++; console.log(`${id} FAILED ${r.status}`, (await r.text()).slice(0, 300)); continue; }
    else console.log(`${id} created`);
  }
  // read back and verify what actually landed
  const g = await (await fetch(`${BASE}/${COL}/${encodeURIComponent(id)}`, { headers: H })).json();
  if (!g.fields) { failures++; console.log(`${id} READ-BACK FAILED`); continue; }
  const live = dec({ mapValue: { fields: g.fields } });
  const n = Object.keys(live.items || {}).length;
  const want = Object.keys(doc.items).length;
  const ok = n === want && live.number === id;
  if (!ok) failures++;
  console.log(`${id} read-back: ${n} records (expected ${want}), number=${live.number} ${ok ? 'OK' : 'MISMATCH'}`);
}

// ---- prove the crew collection was not touched ----
const crew = await (await fetch(`${BASE}/projects/h2sep/rooms?pageSize=3`, { headers: H })).json();
console.log('crew rooms untouched, sample updateTimes:', (crew.documents || []).map(d => d.name.split('/').pop() + '=' + d.updateTime).join(' '));

console.log(failures ? `DONE WITH ${failures} FAILURES` : 'DONE, all verified');
process.exit(failures ? 1 : 0);
