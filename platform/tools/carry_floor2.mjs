/* Carry the crew's real work into the STAGED FLOOR-2 BUILD.
 *
 * Same discipline as platform/tools/carry_field_state.mjs (floor 1, ruling D23)
 * and platform/tools/carry_ref_state.mjs (the four mock-ups), under the standing
 * directive D24 sets for floors 2-4: "ALL notes, markups, check-offs, initials,
 * timestamps and issues from the old crew app come with them, and NOTHING is
 * deleted." A floor build that arrives clean is wrong by definition.
 *
 * READS  projects/h2sep/rooms - the crew's live collection. READ ONLY, GET only.
 * WRITES platform/data/floor2-staged.json and a gitignored local snapshot.
 * It never writes to Firestore, never deploys, never pushes.
 *
 * What travels:  checked, initials, checkedAt, checkedAtLocal, issue,
 *                issueResolved, and the room notes.
 * What does NOT: checkedByName and checkedByUid. Those are real people's names
 *                and account ids and this seed lives in a PUBLIC repository.
 *                Note authors are reduced to initials ("Austin Jones" -> "AJ").
 *
 * Every floor-2 guest room (with its -MEP doc) and every floor-2 common-area
 * doc the crew app holds is read. The common-area docs map by id: the platform
 * writes space docs as 'S' + space_no (S221) with '-M' for the MEP companion,
 * the crew app holds them as the bare number (221).
 *
 * Usage:
 *   node platform/tools/carry_floor2.mjs --dry-run
 *   node platform/tools/carry_floor2.mjs
 *   node platform/tools/carry_floor2.mjs --rooms 203,204
 *   node platform/tools/carry_floor2.mjs --floor=3 --dry-run      (floor 3, floor3-staged.json)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '..');
const DB_PATH = resolve(repo, 'data', 'project.sqlite');
const API_KEY = 'AIzaSyAMRImRm7n7DsDACwH_71gChJTKRkaciT8';
const BASE = 'https://firestore.googleapis.com/v1/projects/h2sep-checklist/databases/(default)/documents';
const CREW = 'projects/h2sep/rooms'; // the crew's live data. READ ONLY.

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(name);
  return i === -1 ? dflt : argv[i + 1];
};
const dry = argv.includes('--dry-run');
const FLOOR = (() => {
  const a = process.argv.find((x) => x.startsWith('--floor='));
  const f = a ? a.slice('--floor='.length) : '2';
  if (!/^[2-4]$/.test(f)) throw new Error('--floor must be 2, 3 or 4');
  return f;
})();
const SEED = resolve(repo, flag('--seed', 'platform/data/floor' + FLOOR + '-staged.json'));
const SNAP = resolve(repo, 'tools/out/backups/crew-floor' + FLOOR + '-snapshot.json');

/* Every floor-2 guest room in the reference database, unless --rooms narrows
 * it; each room pulls its -MEP doc with it. The staged file's common-area docs
 * (ids starting with 'S') are always included. */

const dbRooms = (() => {
  const d = new DatabaseSync(DB_PATH, { readOnly: true });
  const r = d.prepare('SELECT room_no FROM rooms WHERE floor = ? ORDER BY room_no').all(FLOOR).map((x) => x.room_no);
  d.close();
  return r;
})();
const rooms = String(flag('--rooms', dbRooms.join(','))).split(',').map((s) => s.trim()).filter(Boolean);

const FIELD_STATE = ['checked', 'initials', 'checkedAt', 'checkedAtLocal', 'issue', 'issueResolved'];
const PII_FIELDS = ['checkedByName', 'checkedByUid'];

/* Ruling D22 on floor 2 (build_floor2.mjs): the eight plain Queen-Queen keys
 * are retagged GR-308 -> GR-305 against the workbook's 2nd Floor tab. The crew
 * checked that wall off under the old tag. It is the same physical run of
 * casework, so the work travels with it - recorded, never silent. The remap
 * only fires where the BUILD carries gr305_a and no live gr308_a; on 201, 230,
 * 232, 238 and the two connecting keys the build keeps gr308_a, the key matches
 * directly, and nothing is remapped. */
const RULED_REMAP = { gr308_a: ['gr305_a', 'gr309_a'] };
/* D33 (2026-09-02) retags 201, 230, 232 to GR-305 and 238 to GR-309; the crew
 * checked those walls off under GR-308 too, so the same remap carries them. */

/* ================== A LINE THE CREW HOLDS OPEN WORK ON MUST EXIST IN THE BUILD
 *
 * Round 1 lost one. The crew's room 202 doc holds 42 lines including gr905_a
 * (GR-905, category "FF&E - Misc", reliability FLAGGED, with an OPEN field issue
 * reading "MISSING"). Austin's approved category gate keeps FF&E - Misc out of
 * both documents, so the rebuild had no line for it, and 27 of the crew's 28
 * open issues carried while the 28th was reported and then dropped. Under ruling
 * D24 - "ALL notes, markups, check-offs, initials, timestamps and issues from
 * the old crew app come with them, and NOTHING is deleted" - that is a
 * regression against work the crew app already holds, and naming it in a report
 * is not the same as keeping it.
 *
 * So a crew line that holds field work and has no home in the build is REBUILT
 * from data/project.sqlite - this room's own row for that tag, its own
 * description, its own citation, its own reliability, its own note, verbatim -
 * and the crew's state lands on it. Nothing is taken from the crew document
 * except the field state: the crew's older build text is not evidence about the
 * drawings, and the database is.
 *
 * WHERE IT SITS. The D28 Door Hardware band is 21000/21010, and CATEGORY_ORDER
 * would put FF&E - Misc at (20+1)*1000 = 21000 - a collision with dh_closer_a,
 * which is exactly the slot the crew's own gr905_a occupies today. Restored
 * lines therefore get their own band AFTER Door Hardware, so nothing lands on
 * top of a D28 line and the ordering stays stable when more are restored.
 *
 * WHAT IT IS NOT. This does not widen Austin's category gate. It restores the
 * specific lines the crew is already working, one per crew key, and each one
 * says on its face why it exists. Widening the gate stays his call.
 * ========================================================================== */
const RESTORED_BAND_BASE = 22000;   // after D28's Door Hardware band at 21000/21010
const RESTORED_BAND_STEP = 10;

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

/* ------------------------------------------------- rebuilding a dropped line */

if (!existsSync(DB_PATH)) throw new Error('data/project.sqlite is missing; a dropped crew line cannot be rebuilt from it');
const db = new DatabaseSync(DB_PATH, { readOnly: true });

/** The instanceNote shape every approved MEDIUM / FLAGGED line already uses. */
function sqliteNote(row) {
  const parts = [];
  if (row.instance_note) parts.push(row.instance_note);
  if (row.note) parts.push(row.note);
  const text = parts.join(' — ');
  if (!text) return '';
  return String(row.reliability).toUpperCase() === 'HIGH' ? text : '⚑ ' + text;
}

/**
 * Rebuild one crew line from THIS room's own database rows, or return null when
 * the database has nothing to rebuild it from - in which case the line stays an
 * orphan and is reported, because inventing it would be worse than losing it.
 */
function rebuildFromDb(roomNo, crewItem, sortAt) {
  const code = String(crewItem.code || '').trim();
  const category = String(crewItem.category || '').trim();
  if (!code || !category) return null;
  const rows = db.prepare(
    'SELECT rowid AS rowid, item_id, category, tag, description, instance_note, note,' +
    '       trade_responsible, source_sheet, primary_sheet, reliability, derived' +
    '  FROM room_items WHERE room_no = ? AND tag = ? AND category = ? ORDER BY rowid'
  ).all(roomNo, code, category);
  if (!rows.length) return null;
  const first = rows[0];
  const src = first.primary_sheet || first.source_sheet || '';
  if (!src) return null;
  const own = sqliteNote(first);
  /* The same conflicts-table carry the built lines get, for the one thing the
   * builder could not reach. Matched on the tag with a non-alphanumeric
   * boundary either side, so "GR-905" does not match inside a longer token. */
  const conflicts = db.prepare("SELECT * FROM conflicts WHERE UPPER(status) = 'OPEN' ORDER BY conflict_id").all()
    .filter((c) => new RegExp('(^|[^0-9A-Za-z-])' + code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^0-9A-Za-z]|$)')
      .test([c.topic, c.positions, c.source].join('  ')));
  const conflictText = conflicts.map((c) => ' OPEN DOCUMENT CONFLICT ' + c.conflict_id + ', carried from the ' +
    'data/project.sqlite conflicts table and NOT resolved here. Source: ' + c.source + '. Status: ' + c.status +
    '. Topic, verbatim: "' + c.topic + '". Positions, verbatim: "' + c.positions + '" It names this line\'s tag, ' +
    code + ', and it takes a DIFFERENT position from the row note above - both are live in the reference database ' +
    'and both are shown. Confirm before any takeoff or purchase.').join('');
  const why = 'THIS LINE EXISTS BECAUSE THE CREW IS ALREADY WORKING IT. Austin\'s approved category gate keeps "' +
    category + '" off both reference documents, so the rebuild produced no line for ' + code + ' and the field work ' +
    'the crew app already holds on it had nowhere to land. Ruling D24 is explicit that NOTHING is deleted, so the ' +
    'line is rebuilt here from data/project.sqlite room ' + roomNo + '\'s own row(s) ' +
    rows.map((r) => r.item_id).join(', ') + ' - its own description, its own citation, its own reliability and its ' +
    'own note, verbatim - and the crew\'s check-off and issue are carried onto it. Nothing but the field state comes ' +
    'from the crew document. The row is also recorded in room note n_gategaps with the rest of the gated-out rows. ' +
    'It sits in its own band after the D28 Door Hardware lines so it cannot collide with them. Widening the gate ' +
    'itself is Austin\'s call, not this tool\'s. SOURCE. Everything on this line except the check-off and the ' +
    'issue is data/project.sqlite room ' + roomNo + '\'s own row(s) ' + rows.map((r) => r.item_id).join(', ') +
    ', verbatim, at the database\'s own reliability. The check-off, the initials, the timestamp and the issue are ' +
    'the crew\'s, carried from the live crew app READ ONLY.';
  return {
    code,
    label: first.description,
    category,
    qty: rows.length,
    src,
    reliability: first.reliability,
    instanceNote: (own ? (/[.!?"']$/.test(own.trim()) ? own.trim() : own.trim() + '.') + ' ' : '') + why + conflictText,
    trade: first.trade_responsible || '',
    derived: first.derived,
    sort: sortAt,
    deleted: false,
    checked: false,
    initials: '',
    checkedAt: null,
    checkedAtLocal: null,
    issue: '',
    issueResolved: false,
  };
}

/**
 * A line the crew ADDED THEMSELVES in the app - no category, no citation, a
 * label in their own words ("Lamp shades are in the room in a box.") - is a
 * field markup, and ruling D24 says markups travel. It cannot be rebuilt from
 * the database because it is not a document line; it is carried VERBATIM as its
 * own line, the category taken from this room's own row for the same tag where
 * one exists, and it says on its face what it is. Nothing is invented: every
 * word on the line is the crew's or the database's.
 */
function restoreFieldAuthored(roomNo, crewItem, sortAt) {
  const code = String(crewItem.code || '').trim();
  const label = String(crewItem.label || '').trim();
  if (!label) return null;
  let category = String(crewItem.category || '').trim();
  let catSource = 'the crew line itself';
  if (!category && code) {
    const row = db.prepare('SELECT category FROM room_items WHERE room_no = ? AND tag = ? ORDER BY rowid').get(roomNo, code);
    if (row) { category = row.category; catSource = 'this room\'s own data/project.sqlite row for tag ' + code; }
  }
  if (!category) return null;
  return {
    code,
    label,
    category,
    qty: Number.isInteger(crewItem.qty) && crewItem.qty > 0 ? crewItem.qty : 1,
    src: 'field-authored in the crew app (room ' + roomNo + '); no drawing citation',
    reliability: ['HIGH', 'MEDIUM', 'FLAGGED'].includes(String(crewItem.reliability).toUpperCase()) ? String(crewItem.reliability).toUpperCase() : 'MEDIUM',
    instanceNote: 'FIELD-AUTHORED LINE, carried verbatim from the crew app under ruling D24 ("ALL notes, markups, ' +
      'check-offs ... come with them, and NOTHING is deleted"). This is not a package line and no drawing states it: ' +
      'the label is the crew\'s own words, the tag ' + (code ? code : '(none)') + ' is the crew\'s, and the category comes from ' +
      catSource + '. It sits in its own band after the D28 Door Hardware lines so it cannot collide with a built line. ' +
      'SOURCE. Everything on this line is the crew app\'s, READ ONLY, except the category where noted.',
    trade: '',
    derived: 0,
    sort: sortAt,
    deleted: false,
    checked: false,
    initials: '',
    checkedAt: null,
    checkedAtLocal: null,
    issue: '',
    issueResolved: false,
  };
}

/* ------------------------------------------------------------------- the run */

const seed = JSON.parse(readFileSync(SEED, 'utf8'));
const wanted = [];
for (const r of rooms) for (const id of [r, `${r}-MEP`]) if (id in seed.docs) wanted.push(id);
/* The common-area docs, always. The platform id is 'S' + space_no ('-M' for the
 * MEP companion); the crew app holds the bare number and no MEP companion. */
const isSpaceDoc = (id) => /^S/.test(id);
if (!argv.includes('--rooms')) for (const id of Object.keys(seed.docs)) if (isSpaceDoc(id)) wanted.push(id);
const crewIdFor = (pid) => (isSpaceDoc(pid) ? pid.slice(1).replace(/-M$/, '') + (pid.endsWith('-M') ? '-MEP' : '') : pid);
if (!wanted.length) throw new Error(`no staged doc in ${SEED} matches --rooms ${rooms.join(',')}`);

const token = await signIn();
const H = { authorization: 'Bearer ' + token };

/* Snapshot the crew's data BEFORE reading anything into the build, and keep the
 * server's updateTime so the run can prove afterwards that nothing moved. */
const snapshot = {};
const missingCrewDoc = [];
for (const id of wanted) {
  const g = await getJson(`${BASE}/${CREW}/${encodeURIComponent(crewIdFor(id))}`, H);
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
const orphans = [], perDoc = [], noteClashes = [], restored = [];

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
    const remap = [].concat(RULED_REMAP[key] || []).find((t) => t in pdoc.items);
    if (remap) { targets.push(remap); if (state) r++; }

    if (!targets.length) {
      /* A line the crew holds work on must EXIST. Rebuild it from this room's
       * own database rows and let the work land on it. Only where the database
       * has nothing to rebuild it from does it stay an orphan - named, counted
       * in the reconciliation below, and never silently dropped. */
      if (state) {
        const roomNo = pid.replace(/-MEP$/, '');
        const nextSort = RESTORED_BAND_BASE + restored.filter((x) => x.doc === pid).length * RESTORED_BAND_STEP;
        const fromDb = (pid.endsWith('-MEP') || isSpaceDoc(pid)) ? null : rebuildFromDb(roomNo, ci, nextSort);
        const rebuilt = fromDb || ((pid.endsWith('-MEP') || isSpaceDoc(pid)) ? null : restoreFieldAuthored(roomNo, ci, nextSort));
        if (rebuilt) {
          if (Object.values(pdoc.items).some((v) => v.sort === rebuilt.sort)) {
            throw new Error(`restoring ${pid}/${key} would collide at sort ${rebuilt.sort}`);
          }
          pdoc.items[key] = rebuilt;
          restored.push({
            doc: pid, key, code: rebuilt.code, category: rebuilt.category,
            reliability: rebuilt.reliability, sort: rebuilt.sort, crewSort: ci.sort, fieldAuthored: !fromDb,
            checked: !!ci.checked, openIssue: isOpenIssue(ci), issue: String(ci.issue || ''),
          });
          targets.push(key);
        } else {
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
          continue;
        }
      } else {
        continue;
      }
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
    /* A note already present with the SAME text is this tool's own earlier
     * carry, preserved through a rebuild; only a DIFFERENT text under the same
     * key would be a build-authored note about to be overwritten. */
    if (nk in pdoc.notes && pdoc.notes[nk].text !== note.text) noteClashes.push(`${pid}/${nk}`);
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

if (restored.length) {
  console.log('\nLINES REBUILT SO THE CREW\'S WORK HAS SOMEWHERE TO LAND (ruling D24: nothing is deleted):');
  for (const x of restored) {
    console.log(`  ${x.doc}/${x.key}  ${x.code}  [${x.category}]  ${x.reliability}`);
    console.log(x.fieldAuthored
      ? `      FIELD-AUTHORED in the crew app (no category, no citation): carried verbatim, category from this room's own row for the tag`
      : `      rebuilt from data/project.sqlite room ${x.doc}'s own row(s), not from the crew document`);
    console.log(`      sort ${x.crewSort} in the crew app -> ${x.sort} here (its own band, after the D28 Door Hardware lines)`);
    console.log(`      carried: checked=${x.checked}  openIssue=${x.openIssue}${x.issue ? ' "' + x.issue + '"' : ''}`);
  }
}

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
    const t = seed.docs[pid].items[[].concat(RULED_REMAP[key] || []).find((x) => x in seed.docs[pid].items) || key];
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
if (restored.length) console.log(`  ${restored.length} line(s) rebuilt above so the work lands on a line instead of being named and lost`);
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
  const g = await getJson(`${BASE}/${CREW}/${encodeURIComponent(crewIdFor(id))}?mask.fieldPaths=number`, H);
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
  'CARRIED from the live crew app by platform/tools/carry_floor2.mjs (READ ONLY on projects/h2sep/rooms) under ' +
  'ruling D24\'s standing directive. ' + carried + ' line(s) and ' + notesCarried + ' note(s) of real field work. ' +
  'checkedByName and checkedByUid are dropped; note authors are reduced to initials. Reconciliation is exact: ' +
  'crew ' + crewChecks + ' check(s) = ' + seedChecks + ' on live lines + ' + orphanChecks + ' with no line; ' +
  'crew ' + crewIssues + ' open issue(s) = ' + seedIssues + ' on live lines + ' + orphanIssues + ' with no line' +
  (orphans.length ? ' (' + orphans.map((o) => o.doc + '/' + o.key + ' ' + o.code + ' [' + o.category + ']').join('; ') + ').' : '.') +
  (restored.length
    ? ' ' + restored.length + ' line(s) the category gate left with no home were REBUILT from data/project.sqlite so ' +
      'the crew\'s work lands on a line rather than being named and lost (' +
      restored.map((x) => x.doc + '/' + x.key + ' ' + x.code + ' [' + x.category + '] ' + x.reliability +
        ', sort ' + x.sort + (x.fieldAuthored ? ', FIELD-AUTHORED in the crew app and carried verbatim' : '')).join('; ') +
      '); each carries its own row text and says on its face why it exists.'
    : '');
seed.meta.fieldStateCarriedAt = new Date().toISOString();
writeFileSync(SEED, JSON.stringify(canonical(seed), null, 2) + '\n', 'utf8');
console.log(`\nwrote ${SEED}`);
console.log('Firestore not touched. The crew collection was read, never written. Nothing pushed, nothing deployed.');
process.exit(0);
