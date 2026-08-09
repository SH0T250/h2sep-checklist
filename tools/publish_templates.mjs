// publish_templates.mjs — put the APPROVED room templates into Firestore so the
// app's "Add room" flow builds a correct room.
//
// Why this exists: the only template doc in Firestore was the legacy
// pre-cutover shape — 30 lines carrying nothing but code/label/sort. Every
// appliance, the disposer, the microwave and all seven bath accessories were
// missing, and so were category/qty/reliability. Anyone using "Add room" in the
// app got a room that was wrong the moment it was created, and the Room Settings
// screen reported every live room as having "no template" because no slug in
// Firestore matched the slugs the rooms actually carry.
//
// The templates written here are the same reviewed JSON the seeding pipeline
// uses, so a room created in the app and a room created by the tools are the
// same room.
//
//   node tools/publish_templates.mjs --dry-run
//   node tools/publish_templates.mjs --execute
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const cfgText = await readFile(join(HERE, '..', 'js', 'config.js'), 'utf8');
const cfgValue = (n) => (cfgText.match(new RegExp(n + String.raw`\s*:\s*["']([^"']+)["']`)) || [])[1];
const cfgConst = (n) => (cfgText.match(new RegExp(String.raw`export\s+const\s+` + n + String.raw`\s*=\s*["']([^"']+)["']`)) || [])[1];

const API_KEY = cfgValue('apiKey');
const FB_PROJECT = cfgValue('projectId');
const APP_PROJECT = cfgConst('PROJECT_ID') || 'h2sep';
const PIN = cfgConst('DEMO_PIN');
const BASE = `https://firestore.googleapis.com/v1/projects/${FB_PROJECT}/databases/(default)/documents`;

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
if (!EXECUTE && !args.includes('--dry-run')) { console.error('pass --dry-run or --execute'); process.exit(2); }

// slug -> {name, file}. The SLUG must match the `type` the rooms carry, or the
// app reports "no template" for them. Two slugs may share one package: a
// Queen-Queen and a QQ Wide room are the same 40 lines, and both display as
// "QQ Studio" under Austin's naming.
const TEMPLATES = {
  'qq-wide-connecting':     { name: 'QQ Studio Connector',  file: 'template-101-final.json' },
  'qq-connecting':          { name: 'QQ Studio Connector',  file: 'template-101-final.json' },
  'queen-queen':            { name: 'QQ Studio',            file: 'template-qq-studio.json' },
  'qq-wide':                { name: 'QQ Studio',            file: 'template-qq-wide.json' },
  'qq-extended':            { name: 'QQ Extended',          file: 'template-qq-extended.json' },
  'qq-acc':                 { name: 'QQ ACC',               file: 'template-qq-acc.json' },
  'king-one-bedroom':       { name: 'King One Bedroom',     file: 'template-king-one-bedroom.json' },
  'king-one-bedroom-acc':   { name: 'King One Bedroom ACC', file: 'template-king-one-bedroom-acc.json' },
  'king-studio-acc':        { name: 'King Studio Acc',      file: 'template-king-studio-acc.json' },
  'king-studio':            { name: 'King Studio',          file: 'template-king-studio.json' },
  'king-studio-connecting': { name: 'King Studio Connector', file: 'template-king-studio-connector.json' },
  'king-studio-acc-mod':    { name: 'King Studio Acc Mod',  file: 'template-king-studio-acc-mod.json' },
};

// Exactly the fields js/seed.js blankItem() reads. Anything else is dead weight
// in the doc and drifts from what the seeding pipeline produces.
const KEEP = ['code', 'label', 'sort', 'category', 'qty', 'reliability', 'derived', 'src', 'instanceNote'];

const val = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  return { stringValue: String(v) };
};

const su = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"returnSecureToken":true}' })).json();
const AUTH = { Authorization: 'Bearer ' + su.idToken, 'Content-Type': 'application/json' };
console.log('anon uid:', su.localId);

if (EXECUTE) {
  const NOW = new Date().toISOString();
  const r = await fetch(`${BASE}/projects/${APP_PROJECT}/roles/${su.localId}`, {
    method: 'PATCH', headers: AUTH,
    body: JSON.stringify({ fields: { name: val('publish_templates.mjs ' + NOW.slice(0, 10)), pin: val(PIN), grantedAt: { timestampValue: NOW } } }),
  });
  if (!r.ok) { console.error('role claim FAILED', r.status, (await r.text()).slice(0, 300)); process.exit(1); }
  console.log('role claim: OK');
}

let failed = 0;
for (const [slug, { name, file }] of Object.entries(TEMPLATES)) {
  let doc;
  try { doc = JSON.parse(await readFile(join(OUT, file), 'utf8')); }
  catch (e) { console.error(`${slug}: cannot read ${file} — ${e.message}`); failed++; continue; }

  const items = {};
  let dirty = 0;
  for (const [id, it] of Object.entries(doc.items)) {
    // A template must never carry field state. If one does, the generator is
    // broken and publishing it would seed someone else's check-off into every
    // new room — refuse rather than launder it.
    if (it.checked || it.initials || it.issue || it.checkedAt || it.checkedByName) dirty++;
    const f = {};
    for (const k of KEEP) if (it[k] !== undefined && it[k] !== null && it[k] !== '') f[k] = val(it[k]);
    items[id] = { mapValue: { fields: f } };
  }
  if (dirty) { console.error(`${slug}: REFUSING — ${dirty} item(s) carry field state`); failed++; continue; }

  const cats = {};
  for (const it of Object.values(doc.items)) cats[it.category] = (cats[it.category] || 0) + 1;
  console.log(`${slug.padEnd(24)} "${name}" · ${Object.keys(items).length} lines · ${Object.keys(cats).length} categories · from ${file}`);
  if (!EXECUTE) continue;

  const resp = await fetch(`${BASE}/projects/${APP_PROJECT}/templates/${slug}`, {
    method: 'PATCH', headers: AUTH,
    body: JSON.stringify({ fields: { name: val(name), items: { mapValue: { fields: items } }, updatedAt: { timestampValue: new Date().toISOString() } } }),
  });
  if (!resp.ok) { console.error(`  FAILED ${resp.status} ${(await resp.text()).slice(0, 240)}`); failed++; continue; }

  const back = await (await fetch(`${BASE}/projects/${APP_PROJECT}/templates/${slug}`, { headers: AUTH })).json();
  const n = Object.keys(back.fields?.items?.mapValue?.fields || {}).length;
  if (n !== Object.keys(items).length) { console.error(`  VERIFY FAILED — wrote ${Object.keys(items).length}, read back ${n}`); failed++; }
  else console.log(`  VERIFY OK — ${n} lines live`);
}
console.log(`\n${EXECUTE ? 'published' : 'would publish'} ${Object.keys(TEMPLATES).length - failed}/${Object.keys(TEMPLATES).length} templates; ${failed} failure(s)`);
process.exit(failed ? 1 : 0);
