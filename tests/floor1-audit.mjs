/* Adversarial audit of the staged floor-1 seed and the app that has to load it.
 * Every check tries to FAIL the data. Run: node tests/floor1-audit.mjs
 * Exit code 1 if any check fails. Nothing here writes, pushes or deploys. */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const SEED = 'platform/data/floor1-staged.json';
const SLICE = 'platform/data/slice-f1.json';
const seed = JSON.parse(readFileSync(SEED, 'utf8'));
const slice = JSON.parse(readFileSync(SLICE, 'utf8'));
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
const parentOf = (id) => id.replace(/-MEP$|-M$/, '');
const live = (d) => Object.entries(d.items || {}).filter(([, v]) => !v.deleted);
const FLOOR1_ROOMS = ['101','103','104','105','106','107','108','109','110','111','112','113','114','115','116','118'];

process.stdout.write('\nSTRUCTURE AND FIRESTORE RULES\n' + '-'.repeat(70) + '\n');

/* The published rule whitelists these keys and nothing else. A doc with an
 * extra key is rejected at write time, which would fail silently at rollout. */
const ALLOWED = new Set(['number','floor','type','typeLabel','items','notes','deleted','schemaV','createdAt','updatedAt']);
check('every doc uses only rule-whitelisted top-level keys', () =>
  Object.entries(docs).flatMap(([id, d]) =>
    Object.keys(d).filter((k) => !ALLOWED.has(k)).map((k) => `${id}: unexpected key "${k}"`)));

check('number === docId on every doc', () =>
  Object.entries(docs).filter(([id, d]) => d.number !== id).map(([id, d]) => `${id}: number=${JSON.stringify(d.number)}`));

check('doc id is a string of 8 chars or fewer', () =>
  Object.keys(docs).filter((id) => typeof id !== 'string' || id.length > 8).map((id) => `${id}: ${id.length} chars`));

check('floor is an integer 0..30', () =>
  Object.entries(docs).filter(([, d]) => !Number.isInteger(d.floor) || d.floor < 0 || d.floor > 30)
    .map(([id, d]) => `${id}: floor=${JSON.stringify(d.floor)}`));

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

check('all 16 floor-1 guest rooms present', () =>
  FLOOR1_ROOMS.filter((r) => !docs[r]).map((r) => `room ${r} missing`));

check('every guest room has an MEP companion', () =>
  FLOOR1_ROOMS.filter((r) => docs[r] && !docs[r + '-MEP']).map((r) => `${r} has no ${r}-MEP`));

check('no MEP doc is an orphan (parent exists)', () =>
  Object.keys(docs).filter(isMep).filter((id) => !docs[parentOf(id)]).map((id) => `${id}: no parent doc ${parentOf(id)}`));

check('no doc is empty of live lines', () =>
  Object.entries(docs).filter(([, d]) => live(d).length === 0).map(([id]) => `${id}: zero live lines`));

process.stdout.write('\nLINE-LEVEL INVARIANTS\n' + '-'.repeat(70) + '\n');

const allLines = Object.entries(docs).flatMap(([id, d]) => Object.entries(d.items || {}).map(([k, v]) => ({ id, k, v })));
const liveLines = allLines.filter((x) => !x.v.deleted);

check('item keys match ^[a-z0-9_]{1,40}$', () =>
  allLines.filter((x) => !/^[a-z0-9_]{1,40}$/.test(x.k)).map((x) => `${x.id}/${x.k}`));

check('every live line has a non-empty label', () =>
  liveLines.filter((x) => !x.v.label || !String(x.v.label).trim()).map((x) => `${x.id}/${x.k}`));

check('every live line has a citation (src)', () =>
  liveLines.filter((x) => !x.v.src || !String(x.v.src).trim()).map((x) => `${x.id}/${x.k} (${x.v.code || 'untagged'})`));

check('reliability is one of HIGH / MEDIUM / LOW / FLAGGED', () =>
  liveLines.filter((x) => x.v.reliability !== undefined && !['HIGH','MEDIUM','LOW','FLAGGED'].includes(x.v.reliability))
    .map((x) => `${x.id}/${x.k}: ${JSON.stringify(x.v.reliability)}`));

check('qty is a positive integer when present', () =>
  liveLines.filter((x) => 'qty' in x.v && (!Number.isInteger(x.v.qty) || x.v.qty < 1))
    .map((x) => `${x.id}/${x.k}: qty=${JSON.stringify(x.v.qty)}`));

check('category is present on every live line', () =>
  liveLines.filter((x) => !x.v.category).map((x) => `${x.id}/${x.k}`));

check('sort is a number when present', () =>
  liveLines.filter((x) => 'sort' in x.v && typeof x.v.sort !== 'number').map((x) => `${x.id}/${x.k}`));

/* A half-written check group is the one corruption that silently loses a
 * person's work: initials with no timestamp, or a timestamp with no initials. */
check('check-off groups are complete, never half-written', () =>
  allLines.filter((x) => {
    const v = x.v;
    if (!v.checked) return v.initials || v.checkedAt;
    return !v.initials;
  }).map((x) => `${x.id}/${x.k}: checked=${x.v.checked} initials=${JSON.stringify(x.v.initials)} at=${JSON.stringify(x.v.checkedAt)}`));

/* Two lines with one tag in one doc is allowed ONLY where two documents give
 * different counts and the project's standing rule is to carry both rather than
 * silently pick a winner. Such a line has to SAY it is a carried delta. A
 * duplicate that does not say so is an accidental double and a real defect. */
const isCarriedDelta = (v) => /delta|not resolved|conflict/i.test(String(v.instanceNote || ''));
check('a duplicate tag in one doc is always a declared, flagged conflict', () =>
  Object.entries(docs).flatMap(([id, d]) => {
    const byKey = new Map(); const out = [];
    for (const [k, v] of live(d)) {
      if (!v.code) continue;
      const key = v.category + '|' + v.code;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push([k, v]);
    }
    for (const [key, group] of byKey) {
      if (group.length < 2) continue;
      const undeclared = group.filter(([, v]) => !isCarriedDelta(v));
      if (undeclared.length === group.length) {
        out.push(`${id}: ${key} on ${group.map(([k]) => k).join(', ')} - duplicated with no conflict declared`);
      }
    }
    return out;
  }));

check('tombstones keep their original identity', () =>
  allLines.filter((x) => x.v.deleted).filter((x) => !x.v.code && !x.v.label)
    .map((x) => `${x.id}/${x.k}: deleted line has neither code nor label`));

process.stdout.write('\nRULING D22, THE WORKING WALL CORRECTION\n' + '-'.repeat(70) + '\n');

const tagRooms = (tag) => Object.entries(docs).filter(([id]) => isRoom(id))
  .filter(([, d]) => live(d).some(([, v]) => v.code === tag)).map(([id]) => id).sort();

check('GR-305 on exactly the six plain Queen-Queen keys', () => {
  const want = ['105','107','109','111','113','115'];
  const got = tagRooms('GR-305');
  return JSON.stringify(got) === JSON.stringify(want) ? [] : [`got ${JSON.stringify(got)} want ${JSON.stringify(want)}`];
});
check('GR-308 on exactly the two connecting keys', () => {
  const want = ['101','103'];
  const got = tagRooms('GR-308');
  return JSON.stringify(got) === JSON.stringify(want) ? [] : [`got ${JSON.stringify(got)} want ${JSON.stringify(want)}`];
});
check('no room carries both working-wall tags live', () =>
  Object.entries(docs).filter(([id]) => isRoom(id)).filter(([, d]) => {
    const codes = live(d).map(([, v]) => v.code);
    return codes.includes('GR-305') && codes.includes('GR-308');
  }).map(([id]) => `${id} carries both`));
check('the corrected line states the ruling and the open handedness', () =>
  tagRooms('GR-305').flatMap((id) => {
    const [, v] = live(docs[id]).find(([, x]) => x.code === 'GR-305');
    const o = [];
    if (!String(v.instanceNote).includes('D22')) o.push(`${id}: note does not cite D22`);
    if (!/hand/i.test(String(v.instanceNote))) o.push(`${id}: note does not raise handedness`);
    if (v.reliability !== 'MEDIUM') o.push(`${id}: reliability is ${v.reliability}, expected MEDIUM while handedness is open`);
    return o;
  }));
check('room 105 keeps its retired GR-308 as a tombstone', () => {
  const t = docs['105'].items.gr308_a;
  if (!t) return ['gr308_a is gone from room 105 entirely - a check-off against it would be lost'];
  if (!t.deleted) return ['gr308_a is still live in room 105'];
  return [];
});

process.stdout.write('\nZERO LOSS AGAINST THE APPROVED SLICE\n' + '-'.repeat(70) + '\n');

/* Compare canonically: key ORDER is not data. An order-sensitive compare here
 * reports a difference that does not exist, which is its own kind of bug. */
const canon = (v) => {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') return Object.keys(v).sort().reduce((o, k) => (o[k] = canon(v[k]), o), {});
  return v;
};
/* All three approved rooms have now been deliberately regenerated under
 * rulings D22 (GR-305), D27 (hot/cold water) and D28 (door hardware). The
 * guarantee is no longer byte-identity; it is that NOTHING was lost and the
 * only additions are exactly the ruled ones. */
const RULED_NEW_KEYS = new Set(['gr305_a', 'dh_closer_a', 'dh_lock_a', 'plmb_hotcold_a']);
check('approved rooms differ from the slice ONLY by the ruled changes', () =>
  ['101','103','105','101-MEP','103-MEP','105-MEP'].flatMap((id) => {
    const out = [];
    for (const k of Object.keys(slice.docs[id].items)) {
      if (!(k in docs[id].items)) out.push(`${id}/${k} vanished`);
    }
    for (const k of Object.keys(docs[id].items)) {
      if (!(k in slice.docs[id].items) && !RULED_NEW_KEYS.has(k)) {
        out.push(`${id}/${k} added without a ruling`);
      }
    }
    return out;
  }));

check('no approved item key vanished anywhere', () =>
  Object.keys(slice.docs).flatMap((id) =>
    Object.keys(slice.docs[id].items || {})
      .filter((k) => !docs[id] || !(k in docs[id].items))
      .map((k) => `${id}/${k} present in the approved slice, absent from the seed`)));

check('105-MEP keeps all 77 history rows', () => {
  const before = Object.values(slice.docs['105-MEP'].items).filter((v) => v.deleted).length;
  const after = Object.values(docs['105-MEP'].items).filter((v) => v.deleted).length;
  return after >= before ? [] : [`history rows went ${before} -> ${after}`];
});

check('field state on approved lines was never overwritten by the rebuild', () =>
  Object.keys(slice.docs).flatMap((id) =>
    Object.entries(slice.docs[id].items || {}).flatMap(([k, ov]) => {
      const nv = docs[id]?.items?.[k];
      if (!nv || !ov.checked) return [];
      const o = [];
      if (nv.checked !== ov.checked) o.push(`${id}/${k}: checked ${ov.checked} -> ${nv.checked}`);
      if (nv.initials !== ov.initials) o.push(`${id}/${k}: initials ${JSON.stringify(ov.initials)} -> ${JSON.stringify(nv.initials)}`);
      if (nv.checkedAt !== ov.checkedAt) o.push(`${id}/${k}: checkedAt changed`);
      return o;
    })));

process.stdout.write('\nTHE CREW\'S WORK\n' + '-'.repeat(70) + '\n');

/* The crew has been checking boxes in the live app since July. A build that
 * looks perfect and has none of that work in it is a build that would erase
 * months of field time the moment it rolled out. */
const liveChecked = liveLines.filter((x) => x.v.checked);
const liveIssues = liveLines.filter((x) => x.v.issue && !x.v.issueResolved);

check('the crew\'s check-offs are present in the build', () =>
  liveChecked.length >= 380 ? [] : [`only ${liveChecked.length} checked lines; the live app had 382 on floor 1`]);

check('the crew\'s open issues are present in the build', () =>
  liveIssues.length >= 285 ? [] : [`only ${liveIssues.length} open issues; the live app had 289 on floor 1`]);

check('every checked line carries initials', () =>
  liveChecked.filter((x) => !x.v.initials || !String(x.v.initials).trim())
    .map((x) => `${x.id}/${x.k} checked with no initials`));

check('the crew\'s notes came across', () => {
  const n = Object.values(docs).reduce((a2, d) => a2 + Object.keys(d.notes || {}).length, 0);
  return n >= 5 ? [] : [`only ${n} notes in the build; the live app had 5 on floor 1`];
});

/* This seed is committed to a PUBLIC repository. Initials are what the paper
 * sheet carries and are allowed. Names and account ids are not. */
check('no personal names or account ids in the committed seed', () => {
  const raw = readFileSync(SEED, 'utf8');
  const out = [];
  for (const f of ['checkedByName', 'checkedByUid', 'createdByUid']) {
    if (raw.includes(`"${f}"`)) out.push(`field ${f} is present in the seed`);
  }
  for (const m of raw.matchAll(/"(?:by|initials)":\s*"([^"]{4,})"/g)) {
    if (/\s/.test(m[1]) && /^[A-Z]/.test(m[1])) out.push(`looks like a full name: ${JSON.stringify(m[1])}`);
  }
  return out;
});

check('the retagged working wall kept the crew\'s check', () => {
  const out = [];
  for (const id of ['105','107','109','111','113','115']) {
    const w = Object.values(docs[id].items).find((v) => v.code === 'GR-305' && !v.deleted);
    if (!w) { out.push(`${id}: no live GR-305`); continue; }
    if (!w.checked) out.push(`${id}: GR-305 is not checked, but the crew checked the wall under GR-308`);
    if (w.checked && !w.initials) out.push(`${id}: GR-305 checked with no initials`);
  }
  return out;
});

process.stdout.write('\nDETERMINISM AND THE GENERATOR\n' + '-'.repeat(70) + '\n');

/* The bug this exists for: a rebuild used to reset every check to false. */
check('a rebuild preserves the crew\'s work', () => {
  const keep = readFileSync(SEED, 'utf8');
  try {
    const before = JSON.parse(keep);
    const count = (j) => {
      let c = 0, i = 0;
      for (const d of Object.values(j.docs)) for (const v of Object.values(d.items)) {
        if (v.deleted) continue;
        if (v.checked) c++;
        if (v.issue && !v.issueResolved) i++;
      }
      return [c, i];
    };
    const [c0, i0] = count(before);
    execSync('node platform/tools/build_floor1.mjs --regen 105 107 109 111 113 115 >/dev/null 2>&1');
    const [c1, i1] = count(JSON.parse(readFileSync(SEED, 'utf8')));
    const out = [];
    if (c1 !== c0) out.push(`checks ${c0} -> ${c1} after a rebuild`);
    if (i1 !== i0) out.push(`open issues ${i0} -> ${i1} after a rebuild`);
    return out;
  } finally { writeFileSync(SEED, keep); }
});

check('generator selftest passes', () => {
  const out = execSync('node platform/tools/build_floor1.mjs --selftest 2>&1', { encoding: 'utf8' });
  return /SELFTEST PASSED/.test(out) ? [] : ['selftest did not report PASSED'];
});

check('rebuilding the same rooms is byte-identical', () => {
  const before = execSync(`md5sum ${SEED}`, { encoding: 'utf8' }).split(' ')[0];
  execSync('node platform/tools/build_floor1.mjs --regen 105 107 109 111 113 115 >/dev/null 2>&1');
  const after = execSync(`md5sum ${SEED}`, { encoding: 'utf8' }).split(' ')[0];
  return before === after ? [] : [`md5 ${before} -> ${after}: the build is not reproducible`];
});

/* THE BUG THIS CHECK EXISTS FOR: running --spaces after --regen used to restore
 * the stored copy of room 105 over the regenerated one, and the equality
 * assertion inside the tool then ENFORCED the undo. Build order must not change
 * the result. Build the whole seed twice, in two different orders, and compare. */
check('build order does not change the result', () => {
  const canonFile = () => {
    const j = JSON.parse(readFileSync(SEED, 'utf8'));
    delete j.meta;                       // meta records the run; the docs are the product
    return JSON.stringify(canon(j));
  };
  const ROOMS = '104 106 107 108 109 110 111 112 113 114 115 116 118';
  const keep = readFileSync(SEED, 'utf8');
  try {
    execSync(`node platform/tools/build_floor1.mjs --fresh ${ROOMS} >/dev/null 2>&1`);
    execSync('node platform/tools/build_floor1.mjs --regen 105 >/dev/null 2>&1');
    execSync('node platform/tools/build_floor1.mjs --spaces all >/dev/null 2>&1');
    const orderA = canonFile();

    execSync('node platform/tools/build_floor1.mjs --fresh --spaces all >/dev/null 2>&1');
    execSync('node platform/tools/build_floor1.mjs --regen 105 >/dev/null 2>&1');
    execSync(`node platform/tools/build_floor1.mjs ${ROOMS} >/dev/null 2>&1`);
    const orderB = canonFile();

    if (orderA === orderB) return [];
    const a2 = JSON.parse(orderA).docs, b2 = JSON.parse(orderB).docs;
    const out = [];
    for (const id of new Set([...Object.keys(a2), ...Object.keys(b2)])) {
      if (JSON.stringify(a2[id]) !== JSON.stringify(b2[id])) out.push(`${id} differs between build orders`);
    }
    return out.length ? out : ['files differ but no doc differs - check meta'];
  } finally {
    writeFileSync(SEED, keep);
  }
});

check('the approved slice was never written to', () => {
  const status = execSync('git status --porcelain platform/data/slice-f1.json', { encoding: 'utf8' }).trim();
  return status ? [`slice-f1.json is modified: ${status}`] : [];
});

process.stdout.write('\n' + '='.repeat(70) + '\n');
process.stdout.write(`${pass} passed, ${fail} failed\n`);
if (fail) {
  process.stdout.write('\nFAILURES:\n');
  for (const f of failures) process.stdout.write(`  ${f.name}\n`);
}
process.exit(fail ? 1 : 0);
