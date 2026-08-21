/* Carry the crew's real work into the staged floor-1 build.
 *
 * The crew has been checking boxes and raising issues in the live app since
 * July. The staged rooms are born clean. Rolling out a clean build over that
 * would erase months of field work, so the state is carried FORWARD first and
 * proved line for line before anything is ever written to the cloud.
 *
 * READS the live crew collection. WRITES only the staged seed file.
 * It never writes to Firestore and never touches the crew's data.
 *
 * What travels:  checked, initials, checkedAt, checkedAtLocal, issue, issueResolved
 * What does NOT: checkedByName and checkedByUid. Those are real people's names
 *                and account ids, and this seed lives in a PUBLIC repository.
 *                Initials are what the paper sheet carries and what the
 *                approved slice already carries, so initials are the line.
 *
 * Usage: node platform/tools/carry_field_state.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '..');
const API_KEY = 'AIzaSyAMRImRm7n7DsDACwH_71gChJTKRkaciT8';
const BASE = 'https://firestore.googleapis.com/v1/projects/h2sep-checklist/databases/(default)/documents';
const CREW = 'projects/h2sep/rooms';           // the crew's live data. READ ONLY.
const SEED = resolve(root, 'data/floor1-staged.json');
const dry = process.argv.includes('--dry-run');

const FIELD_STATE = ['checked', 'initials', 'checkedAt', 'checkedAtLocal', 'issue', 'issueResolved'];
const PII_FIELDS = ['checkedByName', 'checkedByUid'];

/* Ruling D22 retagged the plain Queen-Queen working wall from GR-308 to GR-305.
 * The crew checked that wall off under the old tag. It is the same physical run
 * of casework, so the work travels with it - recorded, never silent. */
const RULED_REMAP = { gr308_a: 'gr305_a' };

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
/* "Morgan Davis" -> "MD". A lowercase marker like "paper import" is not a
 * person and is carried verbatim. */
function redactAuthor(name) {
  const s = String(name || '').trim();
  if (!s) return '';
  const words = s.split(/\s+/);
  const looksLikeAPerson = words.length >= 2 && words.every((w) => /^[A-Z]/.test(w));
  return looksLikeAPerson ? words.map((w) => w[0]).join('').toUpperCase().slice(0, 3) : s;
}
const crewIdFor = (pid) =>
  pid.startsWith('S') ? pid.slice(1).replace(/-M$/, '') + (pid.endsWith('-M') ? '-MEP' : '') : pid;

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
const H = { authorization: 'Bearer ' + token };

/* Snapshot the crew's data before reading anything into the build. */
const snapshot = {};
for (const pid of Object.keys(seed.docs)) {
  const cid = crewIdFor(pid);
  const g = await (await fetch(`${BASE}/${CREW}/${encodeURIComponent(cid)}`, { headers: H })).json();
  if (g.fields) snapshot[cid] = dec({ mapValue: { fields: g.fields } });
}
mkdirSync(resolve(repo, 'tools/out/backups'), { recursive: true });
const snapPath = resolve(repo, 'tools/out/backups/crew-floor1-snapshot.json');
writeFileSync(snapPath, JSON.stringify(snapshot, null, 1));
console.log(`snapshot: ${Object.keys(snapshot).length} live crew docs -> ${snapPath}`);
console.log('(gitignored: it carries crew names and account ids)\n');

let carried = 0, remapped = 0, notesCarried = 0, piiDropped = 0;
const noCrewDoc = [], notCarried = [], perDoc = [];

for (const [pid, pdoc] of Object.entries(seed.docs)) {
  const crew = snapshot[crewIdFor(pid)];
  if (!crew) { noCrewDoc.push(pid); continue; }
  let n = 0, r = 0, nn = 0;

  for (const [key, ci] of Object.entries(crew.items || {})) {
    const hasState = ci.checked || (ci.issue && String(ci.issue).trim()) || ci.checkedAt;
    for (const f of PII_FIELDS) if (ci[f]) piiDropped++;

    let targets = [];
    if (key in pdoc.items) targets.push(key);
    const remap = RULED_REMAP[key];
    if (remap && remap in pdoc.items) { targets.push(remap); if (hasState) r++; }

    if (!targets.length) {
      if (hasState) {
        notCarried.push(`${pid}/${key} (${ci.code || 'untagged'}) has field state and no line in the build`);
      }
      continue;
    }
    for (const tk of targets) {
      const t = pdoc.items[tk];
      for (const f of FIELD_STATE) if (ci[f] !== undefined) t[f] = ci[f];
      for (const f of PII_FIELDS) delete t[f];
    }
    if (hasState) n++;
  }

  /* Notes are field-authored too, and they carry the author's full name. */
  for (const [nk, note] of Object.entries(crew.notes || {})) {
    pdoc.notes = pdoc.notes || {};
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

console.log('CARRIED');
console.log(perDoc.join('\n'));
console.log(`\n  ${carried} lines with field state, ${notesCarried} notes, ${remapped} carried across the D22 retag`);
console.log(`  ${piiDropped} personal name/uid field(s) dropped on the way in`);
if (noCrewDoc.length) console.log(`\n  ${noCrewDoc.length} staged doc(s) have no crew counterpart (new work, nothing to carry)`);
if (notCarried.length) {
  console.log('\nNOT CARRIED - these need a decision, they are not silently dropped:');
  for (const x of notCarried) console.log('  ' + x);
}

/* Prove it: every check and open issue the crew has must be present in the
 * build afterwards. A count that does not reconcile fails the run. */
let crewChecks = 0, crewIssues = 0, seedChecks = 0, seedIssues = 0;
for (const [pid, pdoc] of Object.entries(seed.docs)) {
  const crew = snapshot[crewIdFor(pid)];
  if (crew) {
    crewChecks += Object.values(crew.items || {}).filter((i) => i.checked).length;
    crewIssues += Object.values(crew.items || {}).filter((i) => i.issue && !i.issueResolved).length;
  }
  /* Count what the app SHOWS: a tombstone is history, not a live line. The
   * D22 retag deliberately leaves the retired line checked as a record of who
   * checked it and when, so counting tombstones would double-count that work. */
  seedChecks += Object.values(pdoc.items).filter((i) => i.checked && !i.deleted).length;
  seedIssues += Object.values(pdoc.items).filter((i) => i.issue && !i.issueResolved && !i.deleted).length;
}
const tombstoned = Object.values(seed.docs).reduce((n, d) =>
  n + Object.values(d.items).filter((i) => i.deleted && i.checked).length, 0);
console.log('\nRECONCILIATION  (live lines only; a tombstone is history, not a second check)');
if (tombstoned) console.log(`  ${tombstoned} retired line(s) keep their original check as a record`);
console.log(`  checks  crew ${crewChecks}  ->  build ${seedChecks}  ${seedChecks === crewChecks ? 'EXACT' : seedChecks > crewChecks ? 'MORE THAN THE CREW HAS - investigate' : 'LOST WORK'}`);
console.log(`  issues  crew ${crewIssues}  ->  build ${seedIssues}  ${seedIssues === crewIssues ? 'EXACT' : seedIssues > crewIssues ? 'MORE THAN THE CREW HAS - investigate' : 'LOST WORK'}`);
const lost = seedChecks !== crewChecks || seedIssues !== crewIssues;

if (dry) { console.log('\ndry run: seed not written'); process.exit(lost ? 1 : 0); }
const canonical = (v) => Array.isArray(v) ? v.map(canonical)
  : (v && typeof v === 'object')
    ? Object.keys(v).sort().reduce((o, k) => (o[k] = canonical(v[k]), o), {})
    : v;
writeFileSync(SEED, JSON.stringify(canonical(seed), null, 2) + '\n', 'utf8');
console.log(`\nwrote ${SEED}`);
console.log('Firestore not touched. The crew collection was read, never written.');
process.exit(lost ? 1 : 0);
