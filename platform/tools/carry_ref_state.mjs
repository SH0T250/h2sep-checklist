/* Carry the crew's real work into the four STAGED REFERENCE-ROOM MOCK-UPS.
 *
 * Same discipline as platform/tools/carry_field_state.mjs, which did this for
 * floor 1 under ruling D23, and the same standing directive D24 sets for
 * floors 2-4: "ALL notes, markups, check-offs, initials, timestamps and issues
 * from the old crew app come with them, and NOTHING is deleted."
 *
 * platform/tools/build_ref_rooms.mjs builds these four rooms BORN CLEAN and its
 * header says "there is no crew work to carry". That is false for these keys:
 * the crew has been working rooms 202, 217, 230 and 238 in the live app since
 * August. A mock-up that arrives clean is wrong by definition (D24). This tool
 * is the step that makes it right, and it runs AFTER every build.
 *
 * READS  projects/h2sep/rooms - the crew's live collection. READ ONLY, GET only.
 * WRITES platform/data/ref-rooms-staged.json and a gitignored local snapshot.
 * It never writes to Firestore, never deploys, never pushes.
 *
 * What travels:  checked, initials, checkedAt, checkedAtLocal, issue,
 *                issueResolved, and the room notes.
 * What does NOT: checkedByName and checkedByUid. Those are real people's names
 *                and account ids and this seed lives in a PUBLIC repository.
 *                Note authors are reduced to initials ("Austin Jones" -> "AJ").
 *                Initials are what the paper sheet carries and what every
 *                approved room already carries, so initials are the line.
 *
 * Usage:
 *   node platform/tools/carry_ref_state.mjs --dry-run
 *   node platform/tools/carry_ref_state.mjs
 *   node platform/tools/carry_ref_state.mjs --rooms 202,230
 *   node platform/tools/carry_ref_state.mjs --seed platform/data/other.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '..');
const API_KEY = 'AIzaSyAMRImRm7n7DsDACwH_71gChJTKRkaciT8';
const BASE = 'https://firestore.googleapis.com/v1/projects/h2sep-checklist/databases/(default)/documents';
const CREW = 'projects/h2sep/rooms'; // the crew's live data. READ ONLY.

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(name);
  return i === -1 ? dflt : argv[i + 1];
};
const dry = argv.includes('--dry-run');
const SEED = resolve(repo, flag('--seed', 'platform/data/ref-rooms-staged.json'));
const SNAP = resolve(repo, 'tools/out/backups/crew-ref-rooms-snapshot.json');

/* The four types with no approved reference room (D24), one representative
 * room each. --rooms narrows this; each room pulls its -MEP doc with it. */
const DEFAULT_ROOMS = ['202', '217', '230', '238'];
const rooms = String(flag('--rooms', DEFAULT_ROOMS.join(','))).split(',').map((s) => s.trim()).filter(Boolean);

const FIELD_STATE = ['checked', 'initials', 'checkedAt', 'checkedAtLocal', 'issue', 'issueResolved'];
const PII_FIELDS = ['checkedByName', 'checkedByUid'];

/* DELIBERATELY EMPTY, and that is a ruling, not an oversight.
 *
 * carry_field_state.mjs carries gr308_a -> gr305_a because D22 retagged the
 * plain Queen-Queen working wall on FLOOR 1. D22's reconciliation is the
 * workbook's 1st Floor tab: GR-305 at 6 units against floor 1's six plain QQ
 * keys, GR-308 at 2 against its two QQ connecting keys. That arithmetic says
 * nothing about floor 2, and build_ref_rooms.mjs records the naming question as
 * OPEN for rooms 230 and 238, which ship GR-308 exactly as data/project.sqlite
 * transcribes it. Remapping here would silently resolve an open conflict on
 * Austin's behalf. Rooms 230 and 238 hold gr308_a on BOTH sides, so the key
 * matches directly and no remap is needed to carry the work. */
const RULED_REMAP = {};

/* -------------------------------------------------------------- Firestore IO */

/** Every call goes through here, and it can only ever issue a GET. */
async function getJson(url, headers) {
  const r = await fetch(url, { method: 'GET', headers });
  return r.json();
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

/** "Austin Jones" -> "AJ". A lowercase marker like "paper import" is not a
 *  person and is carried verbatim. */
function redactAuthor(name) {
  const s = String(name || '').trim();
  if (!s) return '';
  const words = s.split(/\s+/);
  const looksLikeAPerson = words.length >= 2 && words.every((w) => /^[A-Z]/.test(w));
  return looksLikeAPerson ? words.map((w) => w[0]).join('').toUpperCase().slice(0, 3) : s;
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

const hasState = (ci) => !!(ci.checked || (ci.issue && String(ci.issue).trim()) || ci.checkedAt);
const isOpenIssue = (ci) => !!(ci.issue && String(ci.issue).trim() && !ci.issueResolved);

/* ------------------------------------------------------------------- the run */

const seed = JSON.parse(readFileSync(SEED, 'utf8'));
const wanted = [];
for (const r of rooms) for (const id of [r, `${r}-MEP`]) if (id in seed.docs) wanted.push(id);
if (!wanted.length) throw new Error(`no staged doc in ${SEED} matches --rooms ${rooms.join(',')}`);

const token = await signIn();
const H = { authorization: 'Bearer ' + token };

/* Snapshot the crew's data BEFORE reading anything into the build, and keep the
 * server's updateTime so the run can prove afterwards that nothing moved. */
const snapshot = {};
const missingCrewDoc = [];
for (const id of wanted) {
  const g = await getJson(`${BASE}/${CREW}/${encodeURIComponent(id)}`, H);
  if (!g.fields) { missingCrewDoc.push(id); continue; }
  snapshot[id] = { updateTime: g.updateTime, doc: dec({ mapValue: { fields: g.fields } }) };
}
mkdirSync(resolve(repo, 'tools/out/backups'), { recursive: true });
writeFileSync(SNAP, JSON.stringify(snapshot, null, 1));
console.log(`seed:     ${SEED}`);
console.log(`rooms:    ${rooms.join(', ')}  ->  docs ${wanted.join(' ')}`);
console.log(`snapshot: ${Object.keys(snapshot).length} live crew doc(s) -> ${SNAP}`);
console.log('(gitignored: it carries crew names and account ids)\n');
if (missingCrewDoc.length) {
  console.log(`  ${missingCrewDoc.length} staged doc(s) have no crew counterpart, nothing to carry: ${missingCrewDoc.join(' ')}\n`);
}

let carried = 0, remapped = 0, notesCarried = 0, piiDropped = 0, pkgTextKept = 0;
const orphans = [], perDoc = [], noteClashes = [];

for (const pid of wanted) {
  const snap = snapshot[pid];
  if (!snap) continue;
  const pdoc = seed.docs[pid];
  const crew = snap.doc;
  let n = 0, r = 0, nn = 0;

  for (const [key, ci] of Object.entries(crew.items || {})) {
    const state = hasState(ci);
    for (const f of PII_FIELDS) if (ci[f]) piiDropped++;

    const targets = [];
    if (key in pdoc.items) targets.push(key);
    const remap = RULED_REMAP[key];
    if (remap && remap in pdoc.items) { targets.push(remap); if (state) r++; }

    if (!targets.length) {
      /* Never a silent drop. Every key that holds field work and has no line to
       * land on is named, with the reason it has no line, and it is counted in
       * the reconciliation below so the arithmetic still closes. */
      if (state) {
        orphans.push({
          doc: pid,
          key,
          code: ci.code || '<untagged>',
          category: ci.category || '<no category>',
          label: String(ci.label || '').slice(0, 90),
          checked: !!ci.checked,
          openIssue: isOpenIssue(ci),
          issue: String(ci.issue || ''),
          initials: ci.initials || '',
        });
      }
      continue;
    }
    for (const tk of targets) {
      const t = pdoc.items[tk];
      /* Package text - label, instanceNote, attachments, reliability, src - is
       * the mock-up's whole point and comes from the build. Only field state
       * travels; a divergence in the crew's older build text is left alone. */
      if ((ci.instanceNote || '') !== (t.instanceNote || '')) pkgTextKept++;
      for (const f of FIELD_STATE) if (ci[f] !== undefined) t[f] = ci[f];
      for (const f of PII_FIELDS) delete t[f];
    }
    if (state) n++;
  }

  /* Notes are field-authored too, and they carry the author's full name. */
  for (const [nk, note] of Object.entries(crew.notes || {})) {
    pdoc.notes = pdoc.notes || {};
    if (nk in pdoc.notes) noteClashes.push(`${pid}/${nk}`);
    pdoc.notes[nk] = {
      text: note.text,
      flag: note.flag || 'info',
      resolved: !!note.resolved,
      createdAt: note.createdAt,
      by: redactAuthor(note.createdBy),
    };
    if (note.createdByUid) piiDropped++;
    nn++;
  }
  carried += n; remapped += r; notesCarried += nn;
  if (n || nn) perDoc.push(`  ${pid.padEnd(9)} ${String(n).padStart(3)} line(s) with state, ${nn} note(s)`);
}

if (noteClashes.length) {
  throw new Error('a crew note key collides with a note the build authored, which would overwrite it: ' + noteClashes.join(', '));
}

console.log('CARRIED');
console.log(perDoc.length ? perDoc.join('\n') : '  (nothing)');
console.log(`\n  ${carried} line(s) with field state, ${notesCarried} note(s), ${remapped} carried across a ruled retag`);
console.log(`  ${piiDropped} personal name/uid field(s) dropped on the way in`);
console.log(`  ${pkgTextKept} line(s) kept the mock-up's package text over the crew build's older text (field state only travels)`);

if (orphans.length) {
  console.log('\nSTATE WITH NO LINE TO LAND ON - carried nowhere, dropped nowhere, listed here:');
  for (const o of orphans) {
    console.log(`  ${o.doc}/${o.key}  ${o.code}  [${o.category}]`);
    console.log(`      "${o.label}"`);
    console.log(`      checked=${o.checked}${o.initials ? ' (' + o.initials + ')' : ''}  openIssue=${o.openIssue}${o.issue ? ' "' + o.issue + '"' : ''}`);
  }
}

/* -------------------------------------------------------- exact reconciliation
 * Not "about right". The crew's totals must equal what landed plus what is
 * named above, as an identity, or the run fails. */

let crewChecks = 0, crewIssues = 0, seedChecks = 0, seedIssues = 0;
for (const pid of wanted) {
  const snap = snapshot[pid];
  if (snap) {
    for (const ci of Object.values(snap.doc.items || {})) {
      if (ci.checked) crewChecks++;
      if (isOpenIssue(ci)) crewIssues++;
    }
  }
  /* Count what the app SHOWS: a tombstone is history, not a live line.
   * The open-issue test is the SAME predicate used on the crew side, whitespace
   * trim included. Two different tests on the two sides of an identity can make
   * a real loss reconcile, which is the one thing this block exists to stop. */
  const items = Object.values(seed.docs[pid].items);
  seedChecks += items.filter((i) => i.checked && !i.deleted).length;
  seedIssues += items.filter((i) => isOpenIssue(i) && !i.deleted).length;
}

/* State that landed on a tombstone would vanish from the counts above without
 * ever being named as an orphan. The seed carries no tombstones today; this is
 * the guard that keeps that true rather than assumed. */
const landedOnTombstone = [];
for (const pid of wanted) {
  const snap = snapshot[pid];
  if (!snap) continue;
  for (const [key, ci] of Object.entries(snap.doc.items || {})) {
    if (!hasState(ci)) continue;
    const t = seed.docs[pid].items[RULED_REMAP[key] && RULED_REMAP[key] in seed.docs[pid].items ? RULED_REMAP[key] : key];
    if (t && t.deleted) landedOnTombstone.push(`${pid}/${key} (${ci.code || '<untagged>'})`);
  }
}
if (landedOnTombstone.length) {
  console.log('\nSTATE THAT LANDED ON A RETIRED LINE - it would not show in the app:');
  for (const x of landedOnTombstone) console.log('  ' + x);
}
const orphanChecks = orphans.filter((o) => o.checked).length;
const orphanIssues = orphans.filter((o) => o.openIssue).length;
const tombstoned = wanted.reduce((n, pid) =>
  n + Object.values(seed.docs[pid].items).filter((i) => i.deleted && i.checked).length, 0);

const line = (what, crew, build, orphan) => {
  const ok = crew === build + orphan;
  console.log(`  ${what.padEnd(7)} crew ${String(crew).padStart(3)}  =  build ${String(build).padStart(3)} + ${orphan} with no line   ${ok ? 'EXACT' : build + orphan > crew ? 'MORE THAN THE CREW HAS - investigate' : 'LOST WORK'}`);
  return ok;
};
console.log('\nRECONCILIATION  (live lines only; a tombstone is history, not a second check)');
if (tombstoned) console.log(`  ${tombstoned} retired line(s) keep their original check as a record`);
const okChecks = line('checks', crewChecks, seedChecks, orphanChecks);
const okIssues = line('issues', crewIssues, seedIssues, orphanIssues);
/* Counting the notes we just counted proves nothing. Go back to the snapshot and
 * confirm every crew note is actually PRESENT in the seed, with its text intact
 * and its author reduced - the redaction must not have eaten the note itself. */
let crewNotes = 0, notesLanded = 0;
const noteMisses = [];
for (const pid of wanted) {
  const snap = snapshot[pid];
  if (!snap) continue;
  for (const [nk, note] of Object.entries(snap.doc.notes || {})) {
    crewNotes++;
    const landed = ((seed.docs[pid].notes || {})[nk]);
    if (landed && landed.text === note.text && !('createdBy' in landed) && !('createdByUid' in landed)) notesLanded++;
    else noteMisses.push(`${pid}/${nk}`);
  }
}
const okNotes = crewNotes === notesLanded;
console.log(`  notes   crew ${String(crewNotes).padStart(3)}  =  build ${String(notesLanded).padStart(3)} present with text intact   ${okNotes ? 'EXACT' : 'LOST WORK'}`);
for (const m of noteMisses) console.log(`      MISSING OR ALTERED: ${m}`);

/* The published Firestore rules, re-checked after the carry. The build's
 * born-clean assertion is deliberately NOT re-run: carrying field state is
 * exactly what this tool is for. */
const DOC_KEYS = new Set(['createdAt', 'deleted', 'floor', 'items', 'notes', 'number', 'schemaV', 'type', 'typeLabel', 'updatedAt']);
const ITEM_KEYS = new Set(['attachments', 'category', 'checked', 'checkedAt', 'checkedAtLocal', 'code', 'deleted',
  'derived', 'id', 'initials', 'instanceNote', 'issue', 'issueResolved', 'label', 'qty', 'reliability', 'sort',
  'src', 'trade', 'verifyAtPunch', 'where']);
const NOTE_KEYS = new Set(['by', 'createdAt', 'flag', 'redactedAuthor', 'resolved', 'text']);
const problems = [];
for (const [id, d] of Object.entries(seed.docs)) {
  if (String(id).length > 8) problems.push(`doc id ${JSON.stringify(id)} is ${id.length} chars, max 8`);
  if (d.number !== id) problems.push(`doc ${JSON.stringify(id)}: number ${JSON.stringify(d.number)} != docId`);
  const n = Object.keys(d.items || {}).length;
  if (n > 200) problems.push(`doc ${id} has ${n} items, max 200`);
  for (const k of Object.keys(d)) if (!DOC_KEYS.has(k)) problems.push(`doc ${id}: non-whitelisted doc key ${JSON.stringify(k)}`);
  for (const [ik, it] of Object.entries(d.items || {})) {
    for (const k of Object.keys(it)) if (!ITEM_KEYS.has(k)) problems.push(`doc ${id}/${ik}: non-whitelisted item key ${JSON.stringify(k)}`);
    for (const f of PII_FIELDS) if (f in it) problems.push(`doc ${id}/${ik}: PII field ${f} survived into the seed`);
  }
  for (const [nk, nt] of Object.entries(d.notes || {})) {
    for (const k of Object.keys(nt)) if (!NOTE_KEYS.has(k)) problems.push(`doc ${id}/note ${nk}: non-whitelisted note key ${JSON.stringify(k)}`);
    if (/uid/i.test(JSON.stringify(Object.keys(nt)))) problems.push(`doc ${id}/note ${nk}: a uid key survived into the seed`);
  }
}
console.log(`\nFIRESTORE DOC RULES  ${problems.length ? 'FAIL' : 'PASS'} - doc id <= 8 chars, number == docId, items <= 200, whitelisted keys only, no PII`);
for (const p of problems) console.log('  ' + p);

/* Prove the crew collection was never written: re-read every doc and compare
 * the server's updateTime to the one captured before the run. */
let untouched = true;
const moved = [];
for (const id of Object.keys(snapshot)) {
  const g = await getJson(`${BASE}/${CREW}/${encodeURIComponent(id)}?mask.fieldPaths=number`, H);
  if (g.updateTime !== snapshot[id].updateTime) { untouched = false; moved.push(`${id} ${snapshot[id].updateTime} -> ${g.updateTime}`); }
}
console.log(`\nCREW COLLECTION  ${untouched ? 'UNTOUCHED' : 'CHANGED - investigate'} - ${Object.keys(snapshot).length} doc(s) re-read, updateTime identical before and after`);
for (const m of moved) console.log('  ' + m);

const failed = !okChecks || !okIssues || !okNotes || problems.length > 0 || !untouched || landedOnTombstone.length > 0;

if (dry) {
  console.log('\ndry run: seed not written');
  process.exit(failed ? 1 : 0);
}
if (failed) {
  console.log('\nREFUSING TO WRITE: the run did not reconcile. Nothing was changed.');
  process.exit(1);
}
const canonical = (v) => Array.isArray(v) ? v.map(canonical)
  : (v && typeof v === 'object')
    ? Object.keys(v).sort().reduce((o, k) => (o[k] = canonical(v[k]), o), {})
    : v;
seed.meta = seed.meta || {};
seed.meta.fieldState =
  'CARRIED from the live crew app by platform/tools/carry_ref_state.mjs (READ ONLY on projects/h2sep/rooms) under ' +
  'ruling D24\'s standing directive. ' + carried + ' line(s) and ' + notesCarried + ' note(s) of real field work. ' +
  'checkedByName and checkedByUid are dropped; note authors are reduced to initials. Reconciliation is exact: ' +
  'crew ' + crewChecks + ' check(s) = ' + seedChecks + ' on live lines + ' + orphanChecks + ' with no line; ' +
  'crew ' + crewIssues + ' open issue(s) = ' + seedIssues + ' on live lines + ' + orphanIssues + ' with no line' +
  (orphans.length ? ' (' + orphans.map((o) => o.doc + '/' + o.key + ' ' + o.code + ' [' + o.category + ']').join('; ') + ').' : '.');
seed.meta.fieldStateCarriedAt = new Date().toISOString();
writeFileSync(SEED, JSON.stringify(canonical(seed), null, 2) + '\n', 'utf8');
console.log(`\nwrote ${SEED}`);
console.log('Firestore not touched. The crew collection was read, never written. Nothing pushed, nothing deployed.');
process.exit(0);
