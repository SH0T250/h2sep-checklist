/* Adversarial audit of the staged FLOOR-2 seed. Every check tries to FAIL the
 * data. Run: node tests/floor2-audit.mjs
 * Exit code 1 if any check fails. Nothing here writes to Firestore, pushes or
 * deploys. The generator and carry runs it performs write ONLY the floor-2
 * staged file, and the file is restored byte for byte afterwards.
 *
 * Floor 1's audit (tests/floor1-audit.mjs) is the template. What differs:
 *   - there is no approved slice on floor 2; the four mock-up rooms Austin is
 *     reviewing (ruling D30) are the reference instead, and the build must
 *     reproduce them on shape and text
 *   - ruling D22 reaches the EIGHT plain Queen-Queen keys and no other type
 *   - the crew's floor-2 work is 579 checks, 696 open issues, 28 notes
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const SEED = 'platform/data/floor2-staged.json';
const REF = 'platform/data/ref-rooms-staged.json';
const LIVE = 'platform/data/floor1-staged.json';
const seed = JSON.parse(readFileSync(SEED, 'utf8'));
const ref = JSON.parse(readFileSync(REF, 'utf8'));
const live = JSON.parse(readFileSync(LIVE, 'utf8'));
const docs = seed.docs;

let pass = 0, fail = 0;
const failures = [];
function check(name, fn) {
  let bad;
  try { bad = fn(); } catch (e) { bad = ['threw: ' + e.message]; }
  if (!bad || bad.length === 0) { pass++; process.stdout.write(`  PASS  ${name}\n`); }
  else {
    fail++; failures.push({ name, bad });
    process.stdout.write(`  FAIL  ${name}  (${bad.length})\n`);
    for (const b of bad.slice(0, 6)) process.stdout.write(`          ${b}\n`);
    if (bad.length > 6) process.stdout.write(`          ... and ${bad.length - 6} more\n`);
  }
}
const isRoom = (id) => /^\d{3}$/.test(id);
const isMep = (id) => id.endsWith('-MEP') || id.endsWith('-M');
const isSpace = (id) => /^S/.test(id);
const parentOf = (id) => id.replace(/-MEP$|-M$/, '');
const live_ = (d) => Object.entries(d.items || {}).filter(([, v]) => !v.deleted);
const FLOOR2_ROOMS = ['201','202','203','204','205','206','207','208','209','210','211','212','213','214','215','216','217','218',
  '222','223','224','225','226','227','228','229','230','231','232','233','234','236','238'];
const PLAIN_QQ = ['203','205','207','209','211','213','228','234'];
const GR305_ROOMS = ['201','203','205','207','209','211','213','228','230','232','234'];   // D22 + D33
const MOCKUPS = ['202','217','230','238'];
const CREW = { checks: 579, issues: 696, notes: 28 };   // read from the live crew app 2026-09-02, READ ONLY

process.stdout.write('\nSTRUCTURE AND FIRESTORE RULES\n' + '-'.repeat(70) + '\n');

const ALLOWED = new Set(['number','floor','type','typeLabel','items','notes','deleted','schemaV','createdAt','updatedAt']);
check('every doc uses only rule-whitelisted top-level keys', () =>
  Object.entries(docs).flatMap(([id, d]) => Object.keys(d).filter((k) => !ALLOWED.has(k)).map((k) => `${id}: unexpected key "${k}"`)));
check('number === docId on every doc', () =>
  Object.entries(docs).filter(([id, d]) => d.number !== id).map(([id, d]) => `${id}: number=${JSON.stringify(d.number)}`));
check('doc id is a string of 8 chars or fewer', () =>
  Object.keys(docs).filter((id) => typeof id !== 'string' || id.length > 8).map((id) => `${id}: ${id.length} chars`));
check('floor is 2 on every doc', () =>
  Object.entries(docs).filter(([, d]) => d.floor !== 2).map(([id, d]) => `${id}: floor=${JSON.stringify(d.floor)}`));
check('items is a map of 200 or fewer', () =>
  Object.entries(docs).filter(([, d]) => typeof d.items !== 'object' || d.items === null || Array.isArray(d.items) || Object.keys(d.items).length > 200)
    .map(([id, d]) => `${id}: ${Object.keys(d.items || {}).length} items`));
check('notes is a map when present', () =>
  Object.entries(docs).filter(([, d]) => 'notes' in d && (typeof d.notes !== 'object' || d.notes === null || Array.isArray(d.notes)))
    .map(([id]) => `${id}: notes is not a map`));
check('type and typeLabel within rule length limits', () =>
  Object.entries(docs).flatMap(([id, d]) => {
    const o = [];
    if (d.type && String(d.type).length > 60) o.push(`${id}: type ${String(d.type).length} chars`);
    if (d.typeLabel && String(d.typeLabel).length > 120) o.push(`${id}: typeLabel ${String(d.typeLabel).length} chars`);
    return o;
  }));

process.stdout.write('\nCOVERAGE\n' + '-'.repeat(70) + '\n');
check('all 33 floor-2 guest rooms present', () => FLOOR2_ROOMS.filter((r) => !docs[r]).map((r) => `room ${r} missing`));
check('every guest room has an MEP companion', () => FLOOR2_ROOMS.filter((r) => docs[r] && !docs[r + '-MEP']).map((r) => `${r} has no ${r}-MEP`));
check('no doc that is not a floor-2 room or a floor-2 space', () =>
  Object.keys(docs).filter((id) => !FLOOR2_ROOMS.includes(parentOf(id)) && !isSpace(id)).map((id) => `${id}: not floor 2`));
check('the three floor-2 spaces with gated lines are present (S221, S221-M, S237, S239)', () =>
  ['S221', 'S221-M', 'S237', 'S239'].filter((id) => !docs[id]).map((id) => `${id} missing`));
check('no MEP doc is an orphan (parent exists)', () =>
  Object.keys(docs).filter(isMep).filter((id) => !docs[parentOf(id)]).map((id) => `${id}: no parent doc ${parentOf(id)}`));
check('no doc is empty of live lines', () =>
  Object.entries(docs).filter(([, d]) => live_(d).length === 0).map(([id]) => `${id}: zero live lines`));
check('room type slug and label match the database display label', () => {
  const want = { 201: ['qq-wide', 'QQ Studio'], 202: ['king-one-bedroom', 'King One Bedroom'], 203: ['queen-queen', 'Queen-Queen'],
    204: ['king-studio', 'King Studio'], 215: ['qq-connecting', 'QQ Connecting'], 217: ['king-one-bedroom-acc', 'King One Bedroom Acc.'],
    230: ['qq-extended', 'QQ Extended'], 238: ['qq-acc', 'QQ Acc.'] };
  return Object.entries(want).filter(([r, [t, l]]) => docs[r].type !== t || docs[r].typeLabel !== l).map(([r]) => `${r}: ${docs[r].type} / ${docs[r].typeLabel}`);
});

process.stdout.write('\nLINE-LEVEL INVARIANTS\n' + '-'.repeat(70) + '\n');
const allLines = Object.entries(docs).flatMap(([id, d]) => Object.entries(d.items || {}).map(([k, v]) => ({ id, k, v })));
const liveLines = allLines.filter((x) => !x.v.deleted);
check('item keys match ^[a-z0-9_]{1,40}$', () => allLines.filter((x) => !/^[a-z0-9_]{1,40}$/.test(x.k)).map((x) => `${x.id}/${x.k}`));
check('every live line has a non-empty label', () => liveLines.filter((x) => !x.v.label || !String(x.v.label).trim()).map((x) => `${x.id}/${x.k}`));
check('every live line has a citation (src)', () => liveLines.filter((x) => !x.v.src || !String(x.v.src).trim()).map((x) => `${x.id}/${x.k} (${x.v.code || 'untagged'})`));
check('every built guest-room line carries a SOURCE sentence (space lines carry the database text verbatim, as on floor 1)', () =>
  liveLines.filter((x) => !isSpace(x.id) && !/(^|\s)SOURCE\./.test(String(x.v.instanceNote || ''))).map((x) => `${x.id}/${x.k}`));
check('reliability is one of HIGH / MEDIUM / LOW / FLAGGED', () =>
  liveLines.filter((x) => x.v.reliability !== undefined && !['HIGH','MEDIUM','LOW','FLAGGED'].includes(x.v.reliability)).map((x) => `${x.id}/${x.k}: ${JSON.stringify(x.v.reliability)}`));
check('qty is a positive integer when present', () =>
  liveLines.filter((x) => 'qty' in x.v && (!Number.isInteger(x.v.qty) || x.v.qty < 1)).map((x) => `${x.id}/${x.k}: qty=${JSON.stringify(x.v.qty)}`));
check('category is present on every live line', () => liveLines.filter((x) => !x.v.category).map((x) => `${x.id}/${x.k}`));
check('sort is a number on every line and unique within a doc', () =>
  Object.entries(docs).flatMap(([id, d]) => {
    const seen = new Map(); const out = [];
    for (const [k, v] of live_(d)) {
      if (typeof v.sort !== 'number') { out.push(`${id}/${k}: sort not a number`); continue; }
      if (seen.has(v.sort)) out.push(`${id}: sort ${v.sort} on both ${seen.get(v.sort)} and ${k}`);
      seen.set(v.sort, k);
    }
    return out;
  }));
check('check-off groups are complete, never half-written', () =>
  allLines.filter((x) => { const v = x.v; if (!v.checked) return v.initials || v.checkedAt; return !v.initials; })
    .map((x) => `${x.id}/${x.k}: checked=${x.v.checked} initials=${JSON.stringify(x.v.initials)} at=${JSON.stringify(x.v.checkedAt)}`));
const isCarriedDelta = (v) => /delta|not resolved|conflict|FIELD-AUTHORED/i.test(String(v.instanceNote || ''));
check('a duplicate tag in one doc is always a declared conflict or a field-authored crew line', () =>
  Object.entries(docs).flatMap(([id, d]) => {
    const byKey = new Map(); const out = [];
    for (const [k, v] of live_(d)) { if (!v.code) continue; const key = v.category + '|' + v.code; if (!byKey.has(key)) byKey.set(key, []); byKey.get(key).push([k, v]); }
    for (const [key, group] of byKey) {
      if (group.length < 2) continue;
      if (group.filter(([, v]) => !isCarriedDelta(v)).length === group.length) out.push(`${id}: ${key} on ${group.map(([k]) => k).join(', ')} - duplicated with no conflict declared`);
    }
    return out;
  }));
check('no line says it was born clean while carrying a check', () =>
  liveLines.filter((x) => x.v.checked && /born clean/i.test(String(x.v.instanceNote || ''))).map((x) => `${x.id}/${x.k}`));
check('no floor-1 head total or first-floor sheet is CITED on a floor-2 line (quoted as removed is fine)', () =>
  liveLines.filter((x) => /144 total heads|1st floor/i.test(String(x.v.src || ''))).map((x) => `${x.id}/${x.k}: src ${String(x.v.src).slice(0, 80)}`));
check('A100 (the FIRST floor plan) is cited only where the line says it is a printed table', () =>
  liveLines.filter((x) => /\bA100\b/.test(String(x.v.src || '')) && !/PRINTED on it|table printed on it|A100 = "First Floor Plan"/i.test(String(x.v.instanceNote || '')))
    .map((x) => `${x.id}/${x.k}`));
check('the ruled lines D27 (hot/cold) and D28 (closer, lock) are on every guest room', () =>
  FLOOR2_ROOMS.flatMap((r) => {
    const o = [];
    if (!docs[r + '-MEP'].items.plmb_hotcold_a) o.push(`${r}-MEP: no plmb_hotcold_a (D27)`);
    if (!docs[r].items.dh_closer_a) o.push(`${r}: no dh_closer_a (D28)`);
    if (!docs[r].items.dh_lock_a) o.push(`${r}: no dh_lock_a (D28)`);
    return o;
  }));
check('D29 bed skirt (bsq_a) on 238 and on no other room', () =>
  FLOOR2_ROOMS.filter((r) => (r === '238') !== Boolean(docs[r].items.bsq_a)).map((r) => `${r}: bsq_a ${docs[r].items.bsq_a ? 'present' : 'missing'}`));

process.stdout.write('\nRULING D22 ON FLOOR 2, THE WORKING WALL\n' + '-'.repeat(70) + '\n');
const tagRooms = (tag) => Object.entries(docs).filter(([id]) => isRoom(id)).filter(([, d]) => live_(d).some(([, v]) => v.code === tag)).map(([id]) => id).sort();
check('GR-305 on the eight plain Queen-Queen keys (D22) plus 201, 230, 232 (D33)', () => {
  const got = tagRooms('GR-305'); return JSON.stringify(got) === JSON.stringify(GR305_ROOMS) ? [] : [`got ${JSON.stringify(got)} want ${JSON.stringify(GR305_ROOMS)}`];
});
check('GR-308 on exactly the two connecting keys (215, 236)', () => {
  const want = ['215','236']; const got = tagRooms('GR-308');
  return JSON.stringify(got) === JSON.stringify(want) ? [] : [`got ${JSON.stringify(got)} want ${JSON.stringify(want)}`];
});
check('GR-309 on 238 only (D33)', () => {
  const got = tagRooms('GR-309'); return JSON.stringify(got) === '["238"]' ? [] : [`got ${JSON.stringify(got)}`];
});
check('GR-304 on the 17 King Studios, GR-315 on 202, GR-316 on 217', () => {
  const o = [];
  if (tagRooms('GR-304').length !== 17) o.push(`GR-304 on ${tagRooms('GR-304').length} rooms`);
  if (JSON.stringify(tagRooms('GR-315')) !== '["202"]') o.push(`GR-315 on ${tagRooms('GR-315')}`);
  if (JSON.stringify(tagRooms('GR-316')) !== '["217"]') o.push(`GR-316 on ${tagRooms('GR-316')}`);
  return o;
});
check('no room carries two working-wall tags live', () =>
  Object.entries(docs).filter(([id]) => isRoom(id)).filter(([, d]) => live_(d).filter(([, v]) => /^GR-3(04|05|08|09|15|16)$/.test(v.code || '')).length !== 1).map(([id]) => `${id}: not exactly one working wall`));
check('the corrected line cites its ruling, the 2nd Floor tab, and the open handedness, at MEDIUM, and keeps B4.5', () =>
  [...GR305_ROOMS, '238'].flatMap((id) => {
    const [, v] = live_(docs[id]).find(([, x]) => x.code === (id === '238' ? 'GR-309' : 'GR-305')); const o = [];
    const ruling = PLAIN_QQ.includes(id) ? 'D22' : 'D33';
    if (!String(v.instanceNote).includes('Austin ruling ' + ruling)) o.push(`${id}: note does not cite ${ruling}`);
    if (id !== '238' && !/B4\.5/.test(String(v.instanceNote))) o.push(`${id}: open conflict B4.5 dropped from the line`);
    if (id === '238' && /B4\.5/.test(String(v.instanceNote))) o.push(`238: B4.5 does not name GR-309 and must not ride on it`);
    if (!/2nd Floor/.test(String(v.instanceNote))) o.push(`${id}: note does not cite the 2nd Floor tab`);
    if (!/hand/i.test(String(v.instanceNote))) o.push(`${id}: note does not raise handedness`);
    if (/1st Floor tab lists|six units against six/.test(String(v.instanceNote))) o.push(`${id}: note carries floor-1 figures`);
    if (v.reliability !== 'MEDIUM') o.push(`${id}: reliability ${v.reliability}`);
    return o;
  }));
check('no build-authored note from an earlier run survives a rebuild (only crew notes travel)', () =>
  Object.entries(docs).flatMap(([id, d]) => Object.entries(d.notes || {}).filter(([, n]) => !n.by && /OPEN FOR AUSTIN\. This room carries GR-308/.test(n.text)).map(([k]) => `${id}/${k}: stale note`)));
check('the D33 rooms record the ruling in n_d22 with Austin\'s words', () =>
  ['201','230','232','238'].flatMap((id) => {
    const o = []; const n = (docs[id].notes || {}).n_d22;
    if (!n) return [`${id}: no n_d22 note`];
    if (!/RULING D33 APPLIED/.test(n.text)) o.push(`${id}: n_d22 does not say D33 applied`);
    if (!/ok retag 201, 230, 232 to GR-305 and 238 to GR-309/.test(n.text)) o.push(`${id}: n_d22 does not quote the ruling`);
    return o;
  }));

process.stdout.write('\nTHE MOCK-UPS ARE REPRODUCED\n' + '-'.repeat(70) + '\n');
const shape = (v) => JSON.stringify([v.category, v.code, v.qty, v.sort, v.reliability, v.label, v.src]);
check('the four mock-up rooms (D30) re-build to the same shape and text, plus the carried crew state', () =>
  MOCKUPS.flatMap((r) => [r, r + '-MEP']).flatMap((id) => {
    const out = [];
    for (const [k, v] of Object.entries(ref.docs[id].items)) {
      const b = docs[id].items[k];
      /* D33 retagged the working wall on 230 (GR-305) and 238 (GR-309) after the
       * mock-ups were delivered; that one declared difference is expected. */
      if (k === 'gr308_a' && ['230', '238'].includes(id)) { if (b) out.push(`${id}/gr308_a: still present after D33`); continue; }
      if (!b) { if (/FIELD-AUTHORED|THIS LINE EXISTS BECAUSE THE CREW/.test(String(v.instanceNote))) continue; out.push(`${id}/${k}: in the mock-up, missing from the build`); continue; }
      if (shape(v) !== shape(b)) out.push(`${id}/${k}: shape differs`);
      if (String(v.instanceNote) !== String(b.instanceNote) && !/THIS LINE EXISTS BECAUSE/.test(String(v.instanceNote))) out.push(`${id}/${k}: note text differs`);
    }
    for (const k of Object.keys(docs[id].items)) {
      if (!ref.docs[id].items[k] && !((id === '230' && k === 'gr305_a') || (id === '238' && k === 'gr309_a'))) out.push(`${id}/${k}: in the build, not in the mock-up`);
    }
    return out;
  }));

process.stdout.write('\nSAME-TYPE ROOMS AGAINST THEIR FLOOR-1 DONORS\n' + '-'.repeat(70) + '\n');
const DONOR = { 204: '104', 206: '104', 208: '104', 210: '104', 212: '104', 214: '104', 216: '104', 218: '104', 222: '104', 223: '104',
  224: '104', 225: '104', 226: '104', 227: '104', 229: '104', 231: '104', 233: '104', 203: '105', 205: '105', 207: '105', 209: '105',
  211: '105', 213: '105', 228: '105', 234: '105', 215: '103', 236: '103' };
check('a same-type room has the same live FF&E keys, tags, counts and sorts as its donor (D22 retag aside)', () =>
  Object.entries(DONOR).flatMap(([r, d]) => {
    const a = Object.fromEntries(live_(docs[r]).map(([k, v]) => [k, [v.category, v.code, v.qty, v.sort]]));
    const b = Object.fromEntries(live_(live.docs[d]).map(([k, v]) => [k, [v.category, v.code, v.qty, v.sort]]));
    const out = [];
    for (const k of Object.keys(b)) if (!a[k]) out.push(`${r}/${k}: on donor ${d}, missing here`);
    for (const k of Object.keys(a)) { if (!b[k]) out.push(`${r}/${k}: not on donor ${d}`); else if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) out.push(`${r}/${k}: ${JSON.stringify(a[k])} vs donor ${JSON.stringify(b[k])}`); }
    return out;
  }));
check('a same-type room has the same MEP line keys as its donor (no stray own line for a placed row)', () =>
  Object.entries(DONOR).flatMap(([r, d]) => {
    const a = new Set(live_(docs[r + '-MEP']).map(([k]) => k)); const b = new Set(live_(live.docs[d + '-MEP']).map(([k]) => k));
    const out = [];
    for (const k of b) if (!a.has(k)) out.push(`${r}-MEP/${k}: on donor, missing here`);
    for (const k of a) if (!b.has(k)) out.push(`${r}-MEP/${k}: not on donor ${d}-MEP`);
    return out;
  }));
check('the sprinkler line on a room with head rows counts those rows (3), with no wrong-count sentence', () =>
  Object.entries(DONOR).filter(([r]) => !['215', '236'].includes(r)).flatMap(([r]) => {
    const v = docs[r + '-MEP'].items.fp_heads_a; const o = [];
    if (v.qty !== 3) o.push(`${r}-MEP: fp_heads_a qty ${v.qty}`);
    if (/transcribes 2 of this unit/.test(String(v.instanceNote))) o.push(`${r}-MEP: wrong-count sentence survived`);
    if (/144 total heads 1st floor\)/.test(String(v.src))) o.push(`${r}-MEP: floor-1 total still cited`);
    return o;
  }));
check('the PTAC line on a King Studio carries the mark and the unit row, not a duplicate line', () =>
  Object.entries(DONOR).filter(([, d]) => d === '104').flatMap(([r]) => {
    const m = docs[r + '-MEP'].items; const o = [];
    if (!m.mech_ptac) return [`${r}-MEP: no mech_ptac`];
    if (m.mech_ptac.code !== 'PTAC-1') o.push(`${r}-MEP: mech_ptac mark ${JSON.stringify(m.mech_ptac.code)}`);
    if (Object.values(m).some((v) => v !== m.mech_ptac && !v.deleted && v.code === 'PTAC-1')) o.push(`${r}-MEP: a second PTAC-1 line`);
    return o;
  }));

process.stdout.write("\nTHE CREW'S WORK\n" + '-'.repeat(70) + '\n');
const liveChecked = liveLines.filter((x) => x.v.checked);
const liveIssues = liveLines.filter((x) => x.v.issue && String(x.v.issue).trim() && !x.v.issueResolved);
check(`the crew's ${CREW.checks} check-offs are all present in the build`, () =>
  liveChecked.length === CREW.checks ? [] : [`${liveChecked.length} checked lines; the live app has ${CREW.checks} on floor 2`]);
check(`the crew's ${CREW.issues} open issues are all present in the build`, () =>
  liveIssues.length === CREW.issues ? [] : [`${liveIssues.length} open issues; the live app has ${CREW.issues} on floor 2`]);
check('every checked line carries initials', () => liveChecked.filter((x) => !x.v.initials || !String(x.v.initials).trim()).map((x) => `${x.id}/${x.k}`));
check(`the crew's ${CREW.notes} notes came across`, () => {
  const n = Object.values(docs).reduce((a2, d) => a2 + Object.values(d.notes || {}).filter((x) => x.by !== '' && x.by !== undefined).length, 0);
  return n === CREW.notes ? [] : [`${n} crew-authored notes in the build; the live app has ${CREW.notes}`];
});
check('the retagged working wall kept the crew\'s check on every D22 and D33 key', () =>
  [...GR305_ROOMS, '238'].flatMap((id) => { const tag = id === '238' ? 'GR-309' : 'GR-305'; const w = Object.values(docs[id].items).find((v) => v.code === tag && !v.deleted); return !w ? [`${id}: no live ${tag}`] : (!w.checked ? [`${id}: ${tag} not checked, but the crew checked the wall under GR-308`] : []); }));
check('no personal names or account ids in the committed seed', () => {
  const raw = readFileSync(SEED, 'utf8'); const out = [];
  for (const f of ['checkedByName', 'checkedByUid', 'createdByUid', 'createdBy']) if (raw.includes(`"${f}"`)) out.push(`field ${f} is present`);
  for (const m of raw.matchAll(/"(?:by|initials)":\s*"([^"]{4,})"/g)) if (/\s/.test(m[1]) && /^[A-Z]/.test(m[1])) out.push(`looks like a full name: ${JSON.stringify(m[1])}`);
  return out;
});
check('meta records an exact carry reconciliation', () =>
  /Reconciliation is exact/.test(String(seed.meta.fieldState || '')) ? [] : ['meta.fieldState does not record an exact reconciliation - run carry_floor2.mjs']);

process.stdout.write('\nDETERMINISM AND THE GENERATOR\n' + '-'.repeat(70) + '\n');
const count = (j) => { let c = 0, i = 0; for (const d of Object.values(j.docs)) for (const v of Object.values(d.items)) { if (v.deleted) continue; if (v.checked) c++; if (v.issue && String(v.issue).trim() && !v.issueResolved) i++; } return [c, i]; };
check('a rebuild preserves the crew\'s work and the space docs', () => {
  const keep = readFileSync(SEED, 'utf8');
  try {
    const [c0, i0] = count(JSON.parse(keep));
    execSync('node platform/tools/build_floor2.mjs 204 203 --partial >/dev/null 2>&1');
    const after = JSON.parse(readFileSync(SEED, 'utf8')); const [c1, i1] = count(after); const out = [];
    if (c1 !== c0) out.push(`checks ${c0} -> ${c1} after a rebuild`);
    if (i1 !== i0) out.push(`open issues ${i0} -> ${i1} after a rebuild`);
    for (const id of ['S221', 'S221-M', 'S237', 'S239']) if (!after.docs[id]) out.push(`${id} lost on a room rebuild`);
    return out;
  } finally { writeFileSync(SEED, keep); }
});
check('generator selftest passes', () => {
  const keep = readFileSync(SEED, 'utf8');
  try { const out = execSync('node platform/tools/build_floor2.mjs --selftest 2>&1', { encoding: 'utf8' }); return /SELFTEST PASSED/.test(out) ? [] : ['selftest did not report PASSED']; }
  finally { writeFileSync(SEED, keep); }
});
check('the spaces path is reproducible and leaves the rooms alone', () => {
  const keep = readFileSync(SEED, 'utf8');
  try {
    const before = JSON.parse(keep);
    execSync('node platform/tools/build_floor2.mjs --spaces >/dev/null 2>&1');
    const after = JSON.parse(readFileSync(SEED, 'utf8')); const out = [];
    for (const id of Object.keys(before.docs)) if (JSON.stringify(before.docs[id]) !== JSON.stringify(after.docs[id])) out.push(`${id} changed on a --spaces run`);
    return out;
  } finally { writeFileSync(SEED, keep); }
});
check('the floor-1 seed, the approved slice and the mock-ups were never written to', () => {
  const status = execSync('git status --porcelain platform/data/slice-f1.json platform/data/floor1-staged.json platform/data/ref-rooms-staged.json', { encoding: 'utf8' }).trim();
  return status ? [`modified: ${status}`] : [];
});

process.stdout.write('\n' + '='.repeat(70) + '\n');
process.stdout.write(`${pass} passed, ${fail} failed\n`);
if (fail) { process.stdout.write('\nFAILURES:\n'); for (const f of failures) process.stdout.write(`  ${f.name}\n`); }
process.exit(fail ? 1 : 0);
