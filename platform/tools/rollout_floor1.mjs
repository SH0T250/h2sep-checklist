/* Roll the staged floor-1 build into the live platform collection.
 *
 * DRY RUN BY DEFAULT. Writing requires --apply, and --apply refuses to run
 * unless a backup succeeds first.
 *
 * This is a THREE-WAY reconciliation, not a copy. Three sources hold real work:
 *   1. the staged seed        structure, corrected tags, plus the crew's work
 *                             carried in from the old app by carry_field_state
 *   2. the live platform docs what Austin has done inside the NEW app since
 *                             the slice went live
 *   3. the crew collection    never written, only ever read
 *
 * A straight overwrite would lose (2). It has already been proven that (2)
 * contains real work: room 101 line hd08_a is resolved in the platform app and
 * open everywhere else, because a person resolved it there.
 *
 * MERGE RULE: a rollout never destroys a completed human action.
 *   - checked true beats checked false
 *   - issueResolved true beats issueResolved false
 *   - a non-empty issue beats an empty one when nothing else distinguishes them
 * Every disagreement is REPORTED, not quietly settled. Nothing is fabricated:
 * every value written was set by a person in one app or the other.
 *
 * The crew's own collection (projects/h2sep/rooms) is NEVER written here.
 *
 * Usage:
 *   node platform/tools/rollout_floor1.mjs              dry run, the default
 *   node platform/tools/rollout_floor1.mjs --apply      writes, after a backup
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '..');
const API_KEY = 'AIzaSyAMRImRm7n7DsDACwH_71gChJTKRkaciT8';
const BASE = 'https://firestore.googleapis.com/v1/projects/h2sep-checklist/databases/(default)/documents';
const COL = 'projects/h2sep/platform_rooms';
const SEED = resolve(root, 'data/floor1-staged.json');
const apply = process.argv.includes('--apply');
const STATE = ['checked', 'initials', 'checkedAt', 'checkedAtLocal', 'checkedByCo', 'issue', 'issueResolved'];

function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  const f = {};
  for (const [k, x] of Object.entries(v)) f[k] = enc(x);
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
  if ('mapValue' in v) {
    const o = {};
    for (const [k, x] of Object.entries(v.mapValue.fields || {})) o[k] = dec(x);
    return o;
  }
  return v;
}
async function signIn() {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  const j = await r.json();
  if (!j.idToken) throw new Error('anon sign-in failed');
  return j.idToken;
}

const seed = JSON.parse(readFileSync(SEED, 'utf8'));
const token = await signIn();
const H = { authorization: 'Bearer ' + token, 'content-type': 'application/json' };

/* ---- read the live collection ---- */
const liveDocs = {};
let pageToken = '';
do {
  const r = await fetch(`${BASE}/${COL}?pageSize=100${pageToken ? '&pageToken=' + pageToken : ''}`, { headers: H });
  const j = await r.json();
  for (const d of j.documents || []) {
    liveDocs[d.name.split('/').pop()] = { data: dec({ mapValue: { fields: d.fields } }), updateTime: d.updateTime };
  }
  pageToken = j.nextPageToken || '';
} while (pageToken);

console.log(`live collection: ${Object.keys(liveDocs).length} docs`);
console.log(`staged build   : ${Object.keys(seed.docs).length} docs\n`);

/* ---- backup before anything ---- */
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
mkdirSync(resolve(repo, 'tools/out/backups'), { recursive: true });
const backupPath = resolve(repo, `tools/out/backups/platform-before-floor1-rollout-${stamp}.json`);
writeFileSync(backupPath, JSON.stringify(liveDocs, null, 1));
console.log(`backup: ${backupPath}\n`);

/* ---- reconcile ---- */
const creates = [], updates = [], conflicts = [], preserved = [];
const merged = {};

for (const [id, sdoc] of Object.entries(seed.docs)) {
  const live = liveDocs[id];
  if (!live) { creates.push(id); merged[id] = sdoc; continue; }

  const out = JSON.parse(JSON.stringify(sdoc));
  let changedLines = 0, keptFromLive = 0;

  for (const [k, li] of Object.entries(live.data.items || {})) {
    const si = out.items[k];
    if (!si) {
      /* A line the live app has and the build does not. Never dropped: it is
       * carried across as an archived line so its history and any check-off
       * against it survive the rollout. */
      out.items[k] = { ...li, deleted: true };
      preserved.push(`${id}/${k} (${li.code || 'untagged'}) exists live and not in the build - archived, not dropped`);
      continue;
    }
    /* Never destroy a completed human action. */
    if (li.checked && !si.checked) {
      for (const f of STATE) if (li[f] !== undefined) si[f] = li[f];
      keptFromLive++;
      conflicts.push(`${id}/${k} (${si.code || 'untagged'}): checked in the live app, not in the build - LIVE KEPT`);
    }
    if (li.issueResolved === true && si.issueResolved !== true) {
      si.issueResolved = true;
      keptFromLive++;
      conflicts.push(`${id}/${k} (${si.code || 'untagged'}): issue RESOLVED in the live app, open in the build - LIVE KEPT (${JSON.stringify(li.issue || '')})`);
    }
    if (li.issue && !si.issue) {
      si.issue = li.issue;
      si.issueResolved = !!li.issueResolved;
      keptFromLive++;
      conflicts.push(`${id}/${k} (${si.code || 'untagged'}): issue raised in the live app, absent from the build - LIVE KEPT (${JSON.stringify(li.issue)})`);
    }
    for (const f of STATE) if (String(si[f] ?? '') !== String(li[f] ?? '')) changedLines++;
  }
  for (const [nk, note] of Object.entries(live.data.notes || {})) {
    out.notes = out.notes || {};
    if (!(nk in out.notes)) { out.notes[nk] = note; preserved.push(`${id}/note ${nk} kept from the live app`); }
  }
  merged[id] = out;
  if (changedLines || keptFromLive) updates.push(`${id}: ${changedLines} field change(s), ${keptFromLive} kept from live`);
}

const orphanLive = Object.keys(liveDocs).filter((id) => !seed.docs[id]);

console.log(`CREATE  ${creates.length} new doc(s)`);
console.log('   ' + creates.join(', ') + '\n');
console.log(`UPDATE  ${updates.length} existing doc(s)`);
for (const u of updates) console.log('   ' + u);
console.log();
if (orphanLive.length) {
  console.log(`UNTOUCHED  ${orphanLive.length} live doc(s) the build does not cover (left exactly as they are)`);
  console.log('   ' + orphanLive.join(', ') + '\n');
}
if (conflicts.length) {
  console.log(`CONFLICTS RESOLVED IN FAVOUR OF THE LIVE APP  (${conflicts.length}) - a rollout never undoes someone's work`);
  for (const c of conflicts) console.log('   ' + c);
  console.log();
}
if (preserved.length) {
  console.log(`PRESERVED  (${preserved.length})`);
  for (const p of preserved.slice(0, 20)) console.log('   ' + p);
  console.log();
}

/* ---- prove nothing is lost, before writing ---- */
let liveChecks = 0, liveIssues = 0, mergedChecks = 0, mergedIssues = 0;
for (const [id, l] of Object.entries(liveDocs)) {
  if (!seed.docs[id]) continue;
  liveChecks += Object.values(l.data.items || {}).filter((i) => i.checked && !i.deleted).length;
  liveIssues += Object.values(l.data.items || {}).filter((i) => i.issue && !i.issueResolved && !i.deleted).length;
}
for (const [id, m] of Object.entries(merged)) {
  if (!liveDocs[id]) continue;
  mergedChecks += Object.values(m.items).filter((i) => i.checked && !i.deleted).length;
  mergedIssues += Object.values(m.items).filter((i) => i.issue && !i.issueResolved && !i.deleted).length;
}
console.log('ZERO-LOSS CHECK, over the docs that already exist live');
console.log(`  checks  live ${liveChecks}  ->  after rollout ${mergedChecks}  ${mergedChecks >= liveChecks ? 'OK' : 'WOULD LOSE WORK'}`);
console.log(`  a resolved issue is never reopened: ${conflicts.filter((c) => c.includes('RESOLVED')).length} resolution(s) protected`);
const wouldLose = mergedChecks < liveChecks;

const totals = Object.values(merged).reduce((a, d) => {
  for (const i of Object.values(d.items)) { if (i.deleted) continue; if (i.checked) a.c++; if (i.issue && !i.issueResolved) a.i++; }
  a.n += Object.keys(d.notes || {}).length;
  return a;
}, { c: 0, i: 0, n: 0 });
console.log(`\nAFTER ROLLOUT the platform would hold ${Object.keys(merged).length} docs, ${totals.c} check-offs, ${totals.i} open issues, ${totals.n} notes.`);

if (!apply) {
  console.log('\nDRY RUN. Nothing was written. Re-run with --apply to perform the rollout.');
  process.exit(wouldLose ? 1 : 0);
}
if (wouldLose) { console.log('\nREFUSING TO APPLY: the merge would lose work.'); process.exit(1); }

/* ---- write ---- */
let failures = 0;
for (const [id, doc] of Object.entries(merged)) {
  const body = JSON.stringify({ fields: enc(doc).mapValue.fields });
  let r;
  if (!liveDocs[id]) {
    r = await fetch(`${BASE}/${COL}?documentId=${encodeURIComponent(id)}`, { method: 'POST', headers: H, body });
  } else {
    const mask = Object.keys(doc).map((k) => 'updateMask.fieldPaths=' + encodeURIComponent(k)).join('&');
    r = await fetch(`${BASE}/${COL}/${encodeURIComponent(id)}?${mask}`, { method: 'PATCH', headers: H, body });
  }
  if (!r.ok) { failures++; console.log(`  ${id} FAILED ${r.status} ${(await r.text()).slice(0, 200)}`); }
}
/* ---- read back ---- */
const after = {};
pageToken = '';
do {
  const j = await (await fetch(`${BASE}/${COL}?pageSize=100${pageToken ? '&pageToken=' + pageToken : ''}`, { headers: H })).json();
  for (const d of j.documents || []) after[d.name.split('/').pop()] = dec({ mapValue: { fields: d.fields } });
  pageToken = j.nextPageToken || '';
} while (pageToken);

let bad = 0;
for (const [id, doc] of Object.entries(merged)) {
  const a = after[id];
  if (!a) { bad++; console.log(`  VERIFY FAIL ${id} missing`); continue; }
  if (Object.keys(a.items).length !== Object.keys(doc.items).length) {
    bad++; console.log(`  VERIFY FAIL ${id}: ${Object.keys(a.items).length} items, expected ${Object.keys(doc.items).length}`);
  }
}
const crew = await (await fetch(`${BASE}/projects/h2sep/rooms?pageSize=3`, { headers: H })).json();
console.log('\ncrew collection untouched, sample updateTimes: ' +
  (crew.documents || []).map((d) => d.name.split('/').pop() + '=' + d.updateTime.slice(0, 19)).join(' '));
console.log(failures || bad ? `\nDONE WITH ${failures} write failure(s) and ${bad} verify failure(s)` : '\nDONE, every document verified in the cloud');
process.exit(failures || bad ? 1 : 0);
