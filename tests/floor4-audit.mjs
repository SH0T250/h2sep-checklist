/* Adversarial audit of the staged FLOOR-4 seed (derived from tests/floor3-audit.mjs). Every check tries to FAIL the
 * data. Run: node tests/floor4-audit.mjs
 * Exit code 1 if any check fails. Nothing here writes to Firestore, pushes or
 * deploys. The generator and carry runs it performs write ONLY the floor-2
 * staged file, and the file is restored byte for byte afterwards.
 *
 * Floor 1's audit (tests/floor1-audit.mjs) is the template. What differs:
 *   - there is no approved slice and no mock-up on floor 3; the STAGED floor-2
 *     room of the same type is the reference, and a floor-3 room must match it
 *     on shape except for the floor-2 working-wall retags (D22, D33)
 *   - ruling D37 carries D22, D33 and D35 up by room type: plain Queen-Queen
 *     and QQ Extended take GR-305; the three connecting keys keep GR-308; 438
 *     keeps GR-307; the 4th Floor tab does not reconcile and every corrected
 *     line says so
 *   - floor 4 has two types no other upper floor has: QQ Wide Connecting (401,
 *     twin is LIVE floor-1 room 101) and King Studio Acc. (438, whose bath is
 *     its own and whose numbering donor is King Studio 104)
 *   - the crew's floor-4 work is 3 checks, 442 open issues, 1 note
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const SEED = 'platform/data/floor4-staged.json';
const REF = 'platform/data/floor2-staged.json';   // the staged floor-2 build, the same-type reference
const LIVE = 'platform/data/floor1-staged.json';
const seed = JSON.parse(readFileSync(SEED, 'utf8'));
const ref = JSON.parse(readFileSync(REF, 'utf8'));
const live = JSON.parse(readFileSync(LIVE, 'utf8'));
const docs = seed.docs;
const OTHER_SEEDS = Object.fromEntries(['platform/data/floor2-staged.json', 'platform/data/floor3-staged.json'].map((f) => [f, execSync(`md5sum ${f}`, { encoding: 'utf8' }).split(' ')[0]]));

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
const FLOOR2_ROOMS = ['401','402','403','404','405','406','407','408','409','410','411','412','413','414','415','416','417','418',
  '422','423','424','425','426','427','428','429','430','431','432','433','434','436','438'];   // floor 4 (name kept for the shared checks)
const PLAIN_QQ = ['405','407','409','411','413','415','428','434'];
const TWO_QUEEN = [...PLAIN_QQ, '430', '432'];              // GR-305 by D37
const CONNECTING = ['401', '403', '436'];
const CREW = { checks: 25, issues: 456, notes: 1 };   // read from the live crew app 2026-09-02 (evening), READ ONLY; D54 lands every line
/* The staged floor-2 room of the same type, for the shape comparison; the two
 * types floor 2 lacks are compared against their LIVE floor-1 room instead. */
const F2_TWIN = { 'King One Bedroom': '202', 'Queen-Queen': '203', 'King Studio': '204', 'QQ Connecting': '215',
  'King One Bedroom Acc.': '217', 'QQ Extended': '230' };
const F1_TWIN = { 'QQ Wide Connecting': '101' };

process.stdout.write('\nSTRUCTURE AND FIRESTORE RULES\n' + '-'.repeat(70) + '\n');

const ALLOWED = new Set(['number','floor','type','typeLabel','items','notes','deleted','schemaV','createdAt','updatedAt']);
check('every doc uses only rule-whitelisted top-level keys', () =>
  Object.entries(docs).flatMap(([id, d]) => Object.keys(d).filter((k) => !ALLOWED.has(k)).map((k) => `${id}: unexpected key "${k}"`)));
check('number === docId on every doc', () =>
  Object.entries(docs).filter(([id, d]) => d.number !== id).map(([id, d]) => `${id}: number=${JSON.stringify(d.number)}`));
check('doc id is a string of 8 chars or fewer', () =>
  Object.keys(docs).filter((id) => typeof id !== 'string' || id.length > 8).map((id) => `${id}: ${id.length} chars`));
check('floor is 4 on every doc', () =>
  Object.entries(docs).filter(([, d]) => d.floor !== 4).map(([id, d]) => `${id}: floor=${JSON.stringify(d.floor)}`));
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
check('all 33 floor-4 guest rooms present', () => FLOOR2_ROOMS.filter((r) => !docs[r]).map((r) => `room ${r} missing`));
check('every guest room has an MEP companion', () => FLOOR2_ROOMS.filter((r) => docs[r] && !docs[r + '-MEP']).map((r) => `${r} has no ${r}-MEP`));
check('no doc that is not a floor-4 room or a floor-4 space', () =>
  Object.keys(docs).filter((id) => !FLOOR2_ROOMS.includes(parentOf(id)) && !isSpace(id)).map((id) => `${id}: not floor 2`));
check('the three floor-4 spaces with gated lines are present (S421, S421-M, S437, S439)', () =>
  ['S421', 'S421-M', 'S437', 'S439'].filter((id) => !docs[id]).map((id) => `${id} missing`));
check('no MEP doc is an orphan (parent exists)', () =>
  Object.keys(docs).filter(isMep).filter((id) => !docs[parentOf(id)]).map((id) => `${id}: no parent doc ${parentOf(id)}`));
check('no doc is empty of live lines', () =>
  Object.entries(docs).filter(([, d]) => live_(d).length === 0).map(([id]) => `${id}: zero live lines`));
check('room type slug and label match the database display label', () => {
  const want = { 401: ['qq-wide-connecting', 'QQ Studio Connector'], 402: ['king-one-bedroom', 'King One Bedroom'], 403: ['qq-connecting', 'QQ Connecting'],
    404: ['king-studio', 'King Studio'], 405: ['queen-queen', 'Queen-Queen'], 417: ['king-one-bedroom-acc', 'King One Bedroom Acc.'],
    430: ['qq-extended', 'QQ Extended'], 438: ['king-studio-acc', 'King Studio Accessible Connector'] };
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
check('no floor-1 head total or first-floor sheet is CITED on a floor-4 line (quoted as removed is fine)', () =>
  liveLines.filter((x) => /144 total heads|1st floor/i.test(String(x.v.src || ''))).map((x) => `${x.id}/${x.k}: src ${String(x.v.src).slice(0, 80)}`));
check('A100 (the FIRST floor plan) is cited only where the line says it is a printed table', () =>
  liveLines.filter((x) => /\bA100\b/.test(String(x.v.src || '')) && !/PRINTED on it|table printed on it|A100 = "First Floor Plan"/i.test(String(x.v.instanceNote || '')))
    .map((x) => `${x.id}/${x.k}`));
check('the ruled lines D27 (hot/cold) and D28 (closer, lock) are on every guest room', () =>
  FLOOR2_ROOMS.flatMap((r) => {
    const o = [];
    if (!docs[r + '-MEP'].items.plmb_hotcold_a) o.push(`${r}-MEP: no plmb_hotcold_a (D27)`);
    if (!docs[r].items.dh_closer_a) o.push(`${r}: no dh_closer_a (D28)`);
    if (!docs[r].items.tvmount_a) o.push(`${r}: no tvmount_a (D46)`);
    if (docs[r].items.tvmount_a && docs[r].items['903_a'] && !(docs[r].items.tvmount_a.sort > docs[r].items['903_a'].sort && docs[r].items.tvmount_a.sort < docs[r].items['904_a']?.sort)) o.push(`${r}: tvmount_a is not directly under the Television`);
    if (!docs[r].items.dh_lock_a) o.push(`${r}: no dh_lock_a (D28)`);
    return o;
  }));
check('D29 bed skirt (bsq_a) on no floor-4 room (there is no QQ Acc. key on floor 4)', () =>
  FLOOR2_ROOMS.filter((r) => Boolean(docs[r].items.bsq_a)).map((r) => `${r}: bsq_a present`));
check('438 (King Studio Acc.) is its own room: GR-307 wall, GR-502 mirror, no GR-320 or GR-208, both bathing configurations open', () => {
  const codes = live_(docs['438']).map(([, v]) => v.code); const o = [];
  for (const t of ['GR-307', 'GR-502']) if (!codes.includes(t)) o.push(`438: no ${t}`);
  for (const t of ['GR-320', 'GR-208', 'GR-304']) if (codes.includes(t)) o.push(`438: carries ${t}, which is room 118's or the standard King Studio's`);
  if (!(docs['438'].notes || {}).n_config) o.push('438: no n_config note - the bathing question must be carried open');
  if (/ruling D19 closes|Flag closed by AJ ruling 2026-08-20/.test(JSON.stringify(docs['438'].items) + JSON.stringify(docs['438-MEP'].items))) o.push('438: a D19 closure (room 118 only) leaked onto a 438 line');
  return o;
});

process.stdout.write('\nRULING D37 ON FLOOR 4: D22, D33 AND D35 CARRIED UP BY ROOM TYPE\n' + '-'.repeat(70) + '\n');
const tagRooms = (tag) => Object.entries(docs).filter(([id]) => isRoom(id)).filter(([, d]) => live_(d).some(([, v]) => v.code === tag)).map(([id]) => id).sort();
check('GR-305 on the 8 plain Queen-Queen keys plus 430 and 432 (D37); GR-308 on the three connecting keys only; GR-309 on none', () => {
  const o = [];
  if (JSON.stringify(tagRooms('GR-305')) !== JSON.stringify(TWO_QUEEN.slice().sort())) o.push(`GR-305 on ${JSON.stringify(tagRooms('GR-305'))}`);
  if (JSON.stringify(tagRooms('GR-308')) !== JSON.stringify(CONNECTING)) o.push(`GR-308 on ${JSON.stringify(tagRooms('GR-308'))}`);
  if (tagRooms('GR-309').length) o.push(`GR-309 on ${tagRooms('GR-309')}`);
  return o;
});
check('GR-304 on the 17 King Studios, GR-307 on 438, GR-315 on 402, GR-316 on 417', () => {
  const o = [];
  if (tagRooms('GR-304').length !== 17) o.push(`GR-304 on ${tagRooms('GR-304').length} rooms`);
  if (JSON.stringify(tagRooms('GR-307')) !== '["438"]') o.push(`GR-307 on ${tagRooms('GR-307')}`);
  if (JSON.stringify(tagRooms('GR-315')) !== '["402"]') o.push(`GR-315 on ${tagRooms('GR-315')}`);
  if (JSON.stringify(tagRooms('GR-316')) !== '["417"]') o.push(`GR-316 on ${tagRooms('GR-316')}`);
  return o;
});
check('no room carries two working-wall tags live', () =>
  Object.entries(docs).filter(([id]) => isRoom(id)).filter(([, d]) => live_(d).filter(([, v]) => /^GR-3(04|05|07|08|09|15|16)$/.test(v.code || '')).length !== 1).map(([id]) => `${id}: not exactly one working wall`));
check('the corrected line cites D37 with Austin\'s words, the 10-against-11 arithmetic and the open hand, FLAGGED where B4.5 names it, and keeps B4.5', () =>
  TWO_QUEEN.flatMap((id) => {
    const [, v] = live_(docs[id]).find(([, x]) => x.code === 'GR-305'); const o = []; const t = String(v.instanceNote);
    if (!/Austin ruling D37/.test(t)) o.push(`${id}: note does not cite D37`);
    if (!/carry D22, D33 and D35 up by room type on floor 4/.test(t)) o.push(`${id}: note does not quote the ruling`);
    if (!/10 against 11, 3 against 2, 0 against 1/.test(t)) o.push(`${id}: note does not carry the arithmetic`);
    if (!/hand/i.test(t)) o.push(`${id}: note does not raise handedness`);
    if (/six units against six|eleven units against floor 2|floor 3 per the drawings/.test(t)) o.push(`${id}: note carries another floor's figures as this room's`);
    { const want = /B4\.5/.test(String(v.instanceNote)) ? 'FLAGGED' : 'MEDIUM'; if (v.reliability !== want) o.push(`${id}: reliability ${v.reliability}, want ${want}`); }
    if (!/B4\.5/.test(t)) o.push(`${id}: open conflict B4.5 dropped from the line`);
    return o;
  }));
check('every two-queen key records D37 in n_d22 and the three connecting keys say GR-308 stands', () =>
  [...TWO_QUEEN, ...CONNECTING].flatMap((id) => {
    const n = (docs[id].notes || {}).n_d22; if (!n) return [`${id}: no n_d22 note`];
    if (CONNECTING.includes(id)) return /GR-308 STANDS/.test(n.text) ? [] : [`${id}: n_d22 does not say GR-308 stands`];
    const o = [];
    if (!/RULING D37 APPLIED/.test(n.text)) o.push(`${id}: n_d22 does not say D37 applied`);
    if (!/DO NOT RECONCILE|DOES NOT RECONCILE/i.test(n.text)) o.push(`${id}: n_d22 hides that the 4th Floor tab does not reconcile`);
    return o;
  }));
check('no build-authored note from an earlier run survives a rebuild (only crew notes travel)', () =>
  Object.entries(docs).flatMap(([id, d]) => Object.entries(d.notes || {}).filter(([, n]) => !n.by && /NO CORRECTION ON FLOOR 4|RULING D35 APPLIED|RULING D33 APPLIED/.test(n.text)).map(([k]) => `${id}/${k}: stale note`)));
check('no line or note on floor 4 quotes a floor-2 or floor-3 room number as this room', () =>
  Object.entries(docs).flatMap(([id, d]) => Object.entries(d.notes || {}).filter(([k, n]) => k === 'n_type' && /Room [23]\d\d /.test(n.text)).map(([k]) => `${id}/${k}`)));

process.stdout.write('\nFLOOR-4 ROOMS AGAINST THEIR STAGED FLOOR-2 (OR LIVE FLOOR-1) TWINS\n' + '-'.repeat(70) + '\n');
const shape = (v) => JSON.stringify([v.category, v.code, v.qty, v.sort, v.reliability, v.label]);
const twinExempt = (k) => ['gr305_a', 'gr308_a', 'gr309_a', 'gr205_b', 'gr905_a'].includes(k);
const slugOf = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const twinDoc = (r) => {
  const t2 = Object.keys(F2_TWIN).find((t) => slugOf(t) === docs[r].type);
  if (t2) return { twin: F2_TWIN[t2], doc: ref.docs[F2_TWIN[t2]], mep: ref.docs[F2_TWIN[t2] + '-MEP'] };
  const t1 = Object.keys(F1_TWIN).find((t) => slugOf(t) === docs[r].type);
  if (t1) return { twin: F1_TWIN[t1] + ' (live floor 1)', doc: live.docs[F1_TWIN[t1]], mep: live.docs[F1_TWIN[t1] + '-MEP'] };
  return null;
};
check('every floor-4 room matches its twin on FF&E shape (working wall and crew-only lines aside; 438 has no twin and is checked on its own)', () =>
  FLOOR2_ROOMS.filter((r) => r !== '438').flatMap((r) => {
    const tw = twinDoc(r);
    if (!tw) return [`${r}: no twin for type ${docs[r].type}`];
    const twin = tw.twin;
    /* A LIVE floor-1 twin was built before the conflicts-table and worst-of-own-rows
     * rules, so its reliability is not comparable; the shape is. */
    const sh = /live floor 1/.test(twin) ? ((v) => JSON.stringify([v.category, v.code, v.qty, v.sort, v.label])) : shape;
    const a = Object.fromEntries(live_(docs[r]).map(([k, v]) => [k, sh(v)]));
    const b = Object.fromEntries(live_(tw.doc).map(([k, v]) => [k, sh(v)]));
    const out = [];
    for (const k of Object.keys(b)) if (!a[k] && !twinExempt(k)) out.push(`${r}/${k}: on twin ${twin}, missing here`);
    for (const k of Object.keys(a)) { if (twinExempt(k)) continue; if (!b[k]) out.push(`${r}/${k}: not on twin ${twin}`); else if (a[k] !== b[k]) out.push(`${r}/${k}: ${a[k]} vs twin ${b[k]}`); }
    return out;
  }));
check('every floor-4 MEP doc has the same line keys as its twin (438 aside)', () =>
  FLOOR2_ROOMS.filter((r) => r !== '438').flatMap((r) => {
    const tw = twinDoc(r); const twin = tw.twin;
    const a = new Set(live_(docs[r + '-MEP']).map(([k]) => k)); const b = new Set(live_(tw.mep).map(([k]) => k));
    const out = [];
    for (const k of b) if (!a.has(k)) out.push(`${r}-MEP/${k}: on twin, missing here`);
    for (const k of a) if (!b.has(k)) out.push(`${r}-MEP/${k}: not on twin ${twin}-MEP`);
    return out;
  }));
check('floor-4 lines cite floor-4 sheets (A103, A123), never A101, A102, A121 or A122 outside a quoted explanation', () =>
  Object.entries(docs).flatMap(([id, d]) => live_(d).filter(([, v]) => /\bA10[12]\b|\bA12[12]\b/.test(String(v.src).replace(/\([^)]*\)/g, ''))).map(([k, v]) => `${id}/${k}: src cites ${(String(v.src).replace(/\([^)]*\)/g, '').match(/\bA1[02][12]\b/) || [])[0]}`)));

process.stdout.write('\nSAME-TYPE ROOMS AGAINST THEIR FLOOR-1 DONORS\n' + '-'.repeat(70) + '\n');
const DONOR = { 404: '104', 406: '104', 408: '104', 410: '104', 412: '104', 414: '104', 416: '104', 418: '104', 422: '104', 423: '104',
  424: '104', 425: '104', 426: '104', 427: '104', 429: '104', 431: '104', 433: '104', 405: '105', 407: '105', 409: '105', 411: '105',
  413: '105', 415: '105', 428: '105', 434: '105', 403: '103', 436: '103', 401: '101' };
check('a same-type room has the same live FF&E keys, tags, counts and sorts as its donor (working wall aside)', () =>
  Object.entries(DONOR).flatMap(([r, d]) => {
    const a = Object.fromEntries(live_(docs[r]).map(([k, v]) => [k, [v.category, v.code, v.qty, v.sort]]));
    const b = Object.fromEntries(live_(live.docs[d]).map(([k, v]) => [k, [v.category, v.code, v.qty, v.sort]]));
    const out = [];
    const ww = (k) => ['gr305_a', 'gr308_a'].includes(k);
    for (const k of Object.keys(b)) if (!a[k] && !ww(k)) out.push(`${r}/${k}: on donor ${d}, missing here`);
    for (const k of Object.keys(a)) { if (ww(k)) continue; if (!b[k]) out.push(`${r}/${k}: not on donor ${d}`); else if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) out.push(`${r}/${k}: ${JSON.stringify(a[k])} vs donor ${JSON.stringify(b[k])}`); }
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
  Object.entries(DONOR).filter(([r]) => !['401', '403', '436'].includes(r)).flatMap(([r]) => {
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
  /* A crew note carries the app's own generated key (n_ + 11 characters); a
   * build-authored note has a fixed name. The author may be empty on either. */
  const BUILT = /^n_(type|dbroom|config|gategaps|gaps|conflicts|d22|rulings|typearea|ptac2|sheet|conndoor|doorlock|dup_)/;
  const n = Object.values(docs).reduce((a2, d) => a2 + Object.keys(d.notes || {}).filter((k) => !BUILT.test(k)).length, 0);
  return n === CREW.notes ? [] : [`${n} crew-authored notes in the build; the live app has ${CREW.notes}`];
});
check('the retagged working wall exists live on every D37 key (the carry reconciles the crew\'s checks exactly)', () =>
  TWO_QUEEN.flatMap((id) => { const w = Object.values(docs[id].items).find((v) => v.code === 'GR-305' && !v.deleted); return !w ? [`${id}: no live GR-305`] : []; }));
check('every note carries non-empty text (a crew note stored as a plain string must arrive whole)', () =>
  Object.entries(docs).flatMap(([id, d]) => Object.entries(d.notes || {}).filter(([, n]) => typeof n.text !== 'string' || !n.text.trim()).map(([k]) => `${id}/${k}: empty note`)));
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
    execSync('node platform/tools/build_floor2.mjs --floor=4 404 405 --partial >/dev/null 2>&1');
    const after = JSON.parse(readFileSync(SEED, 'utf8')); const [c1, i1] = count(after); const out = [];
    if (c1 !== c0) out.push(`checks ${c0} -> ${c1} after a rebuild`);
    if (i1 !== i0) out.push(`open issues ${i0} -> ${i1} after a rebuild`);
    for (const id of ['S421', 'S421-M', 'S437', 'S439']) if (!after.docs[id]) out.push(`${id} lost on a room rebuild`);
    return out;
  } finally { writeFileSync(SEED, keep); }
});
check('generator selftest passes', () => {
  const keep = readFileSync(SEED, 'utf8');
  try { const out = execSync('node platform/tools/build_floor2.mjs --floor=4 --selftest 2>&1', { encoding: 'utf8' }); return /SELFTEST PASSED/.test(out) ? [] : ['selftest did not report PASSED']; }
  finally { writeFileSync(SEED, keep); }
});
check('the spaces path is reproducible and leaves the rooms alone', () => {
  const keep = readFileSync(SEED, 'utf8');
  try {
    const before = JSON.parse(keep);
    execSync('node platform/tools/build_floor2.mjs --floor=4 --spaces >/dev/null 2>&1');
    const after = JSON.parse(readFileSync(SEED, 'utf8')); const out = [];
    // A field-authored line the carry restored on a space is not the generator's to reproduce (D54).
    // Structure only: the --spaces path is followed by the carry, which owns field state on spaces (D54).
    const strip = (d) => { if (!d) return d; const c = JSON.parse(JSON.stringify(d)); for (const [k, v] of Object.entries(c.items || {})) { if (/FIELD-AUTHORED|THIS LINE EXISTS BECAUSE/.test(String(v.instanceNote || ''))) { delete c.items[k]; continue; } for (const f of ['checked', 'initials', 'checkedAt', 'checkedAtLocal', 'checkedByCo', 'issue', 'issueResolved']) delete v[f]; } delete c.updatedAt; return c; };
    for (const id of Object.keys(before.docs)) if (JSON.stringify(strip(before.docs[id])) !== JSON.stringify(strip(after.docs[id]))) out.push(`${id} changed on a --spaces run`);
    return out;
  } finally { writeFileSync(SEED, keep); }
});
check('the floor-1 seed, the approved slice, the mock-ups and the floor-2 and floor-3 seeds were never written to by a floor-4 run', () => {
  const md5 = (f) => execSync(`md5sum ${f}`, { encoding: 'utf8' }).split(' ')[0];
  const out = [];
  for (const f of ['platform/data/floor2-staged.json', 'platform/data/floor3-staged.json']) if (md5(f) !== OTHER_SEEDS[f]) out.push(`${f} changed during this audit's floor-4 runs`);
  const status = execSync('git status --porcelain platform/data/slice-f1.json platform/data/floor1-staged.json platform/data/ref-rooms-staged.json', { encoding: 'utf8' }).trim();
  if (status) out.push(`modified: ${status}`);
  return out;
});

process.stdout.write('\n' + '='.repeat(70) + '\n');
process.stdout.write(`${pass} passed, ${fail} failed\n`);
if (fail) { process.stdout.write('\nFAILURES:\n'); for (const f of failures) process.stdout.write(`  ${f.name}\n`); }
process.exit(fail ? 1 : 0);
