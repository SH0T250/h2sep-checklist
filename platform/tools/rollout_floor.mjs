/* Roll a staged upper-floor build into the live platform collection.
 *
 * This is platform/tools/rollout_floor1.mjs made floor-parametric. The
 * floor-1 tool stands as the record of the floor-1 cutover and is not
 * changed; this tool refuses --floor=1 so that record cannot be re-run by
 * accident.
 *
 * DRY RUN BY DEFAULT. Writing requires --apply, and --apply refuses to run
 * unless a backup succeeds first.
 *
 * This is a THREE-WAY reconciliation, not a copy. Three sources hold real work:
 *   1. the staged seed        structure, corrected tags, plus the crew's work
 *                             carried in from the crew app by carry_floor2.mjs
 *   2. the live platform docs what anyone has done inside the NEW app on a
 *                             document that already exists live (the D30
 *                             mock-ups, or a doc from an earlier rollout)
 *   3. the crew collection    never written, only ever read
 *
 * MERGE RULE: a rollout never destroys a completed human action.
 *   - checked true beats checked false
 *   - issueResolved true beats issueResolved false
 *   - a non-empty issue beats an empty one when nothing else distinguishes them
 *   - a note the live app holds and the build does not is kept
 *   - a line the live app holds and the build does not is archived, never dropped
 * Every disagreement is REPORTED, not quietly settled. Nothing is fabricated:
 * every value written was set by a person in one app or the other.
 *
 * ONLY THE DOCUMENTS IN THE STAGED FILE ARE TOUCHED. Every other live document
 * (floor 1, the other floors, _dir, _asg) is left exactly as it is.
 *
 * The crew's own collection (projects/h2sep/rooms) is NEVER written here.
 *
 * Usage:
 *   node platform/tools/rollout_floor.mjs --floor=2            dry run, the default
 *   node platform/tools/rollout_floor.mjs --floor=2 --apply    writes, after a backup
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '..');
const API_KEY = 'AIzaSyAMRImRm7n7DsDACwH_71gChJTKRkaciT8';
const BASE = 'https://firestore.googleapis.com/v1/projects/h2sep-checklist/databases/(default)/documents';
const COL = 'projects/h2sep/platform_rooms';
const CREW = 'projects/h2sep/rooms';

const floorArg = process.argv.find((a) => a.startsWith('--floor='));
const FLOOR = floorArg ? Number(floorArg.slice('--floor='.length)) : NaN;
if (![2, 3, 4].includes(FLOOR)) {
  console.error('usage: node platform/tools/rollout_floor.mjs --floor=<2|3|4> [--apply]');
  console.error('floor 1 was rolled out by rollout_floor1.mjs and that record is not re-run here.');
  process.exit(2);
}
const SEED = resolve(root, `data/floor${FLOOR}-staged.json`);
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
async function readCollection(col, H) {
  const out = {};
  let pageToken = '';
  do {
    const r = await fetch(`${BASE}/${col}?pageSize=100${pageToken ? '&pageToken=' + pageToken : ''}`, { headers: H });
    const j = await r.json();
    if (j.error) throw new Error(`${col}: ${JSON.stringify(j.error).slice(0, 200)}`);
    for (const d of j.documents || []) {
      out[d.name.split('/').pop()] = { data: dec({ mapValue: { fields: d.fields } }), updateTime: d.updateTime };
    }
    pageToken = j.nextPageToken || '';
  } while (pageToken);
  return out;
}

const seed = JSON.parse(readFileSync(SEED, 'utf8'));
if (Number(seed.meta && seed.meta.floor) !== FLOOR) {
  console.error(`REFUSING: ${SEED} says meta.floor=${seed.meta && seed.meta.floor}, not ${FLOOR}`);
  process.exit(2);
}
for (const [id, d] of Object.entries(seed.docs)) {
  if (Number(d.floor) !== FLOOR) { console.error(`REFUSING: doc ${id} carries floor=${d.floor}, not ${FLOOR}`); process.exit(2); }
  if (d.number !== id) { console.error(`REFUSING: doc ${id} carries number=${d.number}`); process.exit(2); }
}
console.log(`FLOOR ${FLOOR}  seed ${SEED}`);

const token = await signIn();
const H = { authorization: 'Bearer ' + token, 'content-type': 'application/json' };

/* ---- read the live collection, and the crew collection's timestamps ---- */
const liveDocs = await readCollection(COL, H);
const crewBefore = await readCollection(CREW, H);

console.log(`live collection: ${Object.keys(liveDocs).length} docs`);
console.log(`crew collection: ${Object.keys(crewBefore).length} docs (read only, never written)`);
console.log(`staged build   : ${Object.keys(seed.docs).length} docs\n`);

/* ---- backup before anything ---- */
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
mkdirSync(resolve(repo, 'tools/out/backups'), { recursive: true });
const backupPath = resolve(repo, `tools/out/backups/platform-before-floor${FLOOR}-rollout-${stamp}.json`);
writeFileSync(backupPath, JSON.stringify(liveDocs, null, 1));
const backupCheck = JSON.parse(readFileSync(backupPath, 'utf8'));
if (Object.keys(backupCheck).length !== Object.keys(liveDocs).length) { console.error('BACKUP FAILED to round-trip'); process.exit(1); }
console.log(`backup: ${backupPath} (${Object.keys(backupCheck).length} docs)\n`);

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
  else updates.push(`${id}: structure and text refreshed, no field-state change`);
}

const orphanLive = Object.keys(liveDocs).filter((id) => !seed.docs[id]);

console.log(`CREATE  ${creates.length} new doc(s)`);
console.log('   ' + creates.join(', ') + '\n');
console.log(`UPDATE  ${updates.length} existing doc(s)`);
for (const u of updates) console.log('   ' + u);
console.log();
console.log(`UNTOUCHED  ${orphanLive.length} live doc(s) outside this floor's build (left exactly as they are)`);
console.log('   ' + orphanLive.join(', ') + '\n');
if (conflicts.length) {
  console.log(`CONFLICTS RESOLVED IN FAVOR OF THE LIVE APP  (${conflicts.length}) - a rollout never undoes someone's work`);
  for (const c of conflicts) console.log('   ' + c);
  console.log();
}
if (preserved.length) {
  console.log(`PRESERVED  (${preserved.length})`);
  for (const p of preserved.slice(0, 40)) console.log('   ' + p);
  if (preserved.length > 40) console.log(`   ... and ${preserved.length - 40} more`);
  console.log();
}

/* ---- prove nothing is lost, before writing ---- */
let liveChecks = 0, liveIssues = 0, liveNotes = 0, mergedChecks = 0, mergedIssues = 0, mergedNotes = 0;
for (const [id, l] of Object.entries(liveDocs)) {
  if (!seed.docs[id]) continue;
  liveChecks += Object.values(l.data.items || {}).filter((i) => i.checked && !i.deleted).length;
  liveIssues += Object.values(l.data.items || {}).filter((i) => i.issue && !i.issueResolved && !i.deleted).length;
  liveNotes += Object.keys(l.data.notes || {}).length;
}
for (const [id, m] of Object.entries(merged)) {
  if (!liveDocs[id]) continue;
  mergedChecks += Object.values(m.items).filter((i) => i.checked && !i.deleted).length;
  mergedIssues += Object.values(m.items).filter((i) => i.issue && !i.issueResolved && !i.deleted).length;
  mergedNotes += Object.keys(m.notes || {}).length;
}
console.log('ZERO-LOSS CHECK, over the docs that already exist live');
console.log(`  checks  live ${liveChecks}  ->  after rollout ${mergedChecks}  ${mergedChecks >= liveChecks ? 'OK' : 'WOULD LOSE WORK'}`);
console.log(`  notes   live ${liveNotes}  ->  after rollout ${mergedNotes}  ${mergedNotes >= liveNotes ? 'OK' : 'WOULD LOSE WORK'}`);
console.log(`  open issues  live ${liveIssues}  ->  after rollout ${mergedIssues}  (a resolved issue is never reopened: ${conflicts.filter((c) => c.includes('RESOLVED')).length} resolution(s) protected)`);
const wouldLose = mergedChecks < liveChecks || mergedNotes < liveNotes;

const totals = Object.values(merged).reduce((a, d) => {
  for (const i of Object.values(d.items)) { if (i.deleted) continue; if (i.checked) a.c++; if (i.issue && !i.issueResolved) a.i++; }
  a.n += Object.keys(d.notes || {}).length;
  return a;
}, { c: 0, i: 0, n: 0 });
console.log(`\nAFTER ROLLOUT floor ${FLOOR} would hold ${Object.keys(merged).length} docs, ${totals.c} check-offs, ${totals.i} open issues, ${totals.n} notes.`);
console.log(`The platform collection would hold ${Object.keys(liveDocs).length + creates.length} docs.`);

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
const after = await readCollection(COL, H);
let bad = 0;
for (const [id, doc] of Object.entries(merged)) {
  const a = after[id] && after[id].data;
  if (!a) { bad++; console.log(`  VERIFY FAIL ${id} missing`); continue; }
  if (Object.keys(a.items).length !== Object.keys(doc.items).length) {
    bad++; console.log(`  VERIFY FAIL ${id}: ${Object.keys(a.items).length} items, expected ${Object.keys(doc.items).length}`);
  }
  const ac = Object.values(a.items).filter((i) => i.checked && !i.deleted).length;
  const dc = Object.values(doc.items).filter((i) => i.checked && !i.deleted).length;
  if (ac !== dc) { bad++; console.log(`  VERIFY FAIL ${id}: ${ac} checks in the cloud, expected ${dc}`); }
  if (Object.keys(a.notes || {}).length !== Object.keys(doc.notes || {}).length) { bad++; console.log(`  VERIFY FAIL ${id}: note count differs`); }
}
for (const id of orphanLive) {
  if (!after[id]) { bad++; console.log(`  VERIFY FAIL ${id}: a doc outside this floor is missing`); continue; }
  if (after[id].updateTime !== liveDocs[id].updateTime) { bad++; console.log(`  VERIFY FAIL ${id}: a doc outside this floor moved (${liveDocs[id].updateTime} -> ${after[id].updateTime})`); }
}
const crewAfter = await readCollection(CREW, H);
let crewMoved = 0;
for (const [id, d] of Object.entries(crewBefore)) if (!crewAfter[id] || crewAfter[id].updateTime !== d.updateTime) crewMoved++;
if (Object.keys(crewAfter).length !== Object.keys(crewBefore).length) crewMoved++;
console.log(`\ncrew collection: ${Object.keys(crewBefore).length} docs re-read, ${crewMoved === 0 ? 'every updateTime identical before and after - UNTOUCHED' : crewMoved + ' MOVED'}`);
if (crewMoved) bad++;
console.log(failures || bad ? `\nDONE WITH ${failures} write failure(s) and ${bad} verify failure(s)` : `\nDONE, every floor-${FLOOR} document verified in the cloud, every other document unmoved`);
process.exit(failures || bad ? 1 : 0);
