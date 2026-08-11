// live-invariants.mjs — assert the things that must be true of LIVE Firestore,
// whatever produced it.
//
// The suites next door drive the UI. This one checks the data the UI renders,
// because the defects that actually reached the crew were data defects that
// every UI test happily rendered:
//
//   * room 118 carried type "king-studio-acc" (room 438's 42-line package) while
//     holding 43 items and the label "King Studio Acc Mod". Opening its settings
//     preselected the wrong template and one Save would have renamed the room and
//     injected a GR-502 mirror the drawings do not put in it. Every suite passed.
//   * a legacy 30-line "QQ Studio Connector" template stayed live next to two
//     correct ones with the identical display name, so the Add-room picker
//     offered three indistinguishable options, one of which built a room with no
//     appliances and no bath accessories.
//
// Neither is visible from the DOM. Both are one query away from here.
//
//   node tests/live-invariants.mjs
import { readFileSync } from 'node:fs';

const cfg = readFileSync(new URL('../js/config.js', import.meta.url), 'utf8');
const KEY = cfg.match(/apiKey\s*:\s*["']([^"']+)["']/)[1];
const ROOT = 'https://firestore.googleapis.com/v1/projects/h2sep-checklist/databases/(default)/documents/projects/h2sep';

let fail = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + msg); if (!ok) fail++; };

const dv = (v) => {
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, dv(x)]));
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dv);
  return null;
};
const decode = (d) => Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, dv(v)]));

const su = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${KEY}`,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"returnSecureToken":true}' })).json();
const H = { Authorization: 'Bearer ' + su.idToken };

// Firestore caps a list response by BYTES, not just by pageSize, and hands
// back a nextPageToken when it truncates. Reading one page was fine while the
// collection was small; once the 115 punch docs landed it returned 13 rooms
// out of 296 and the count invariants "failed" against data that was actually
// correct — the far more dangerous version of which is a partial page that
// still LOOKS plausible and lets a real break through. Always drain it.
async function listAll(collection) {
  const out = [];
  let token = '';
  do {
    const url = `${ROOT}/${collection}?pageSize=300${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`;
    const resp = await (await fetch(url, { headers: H })).json();
    if (resp.error) throw new Error(`${collection}: ${resp.error.message}`);
    out.push(...(resp.documents || []));
    token = resp.nextPageToken || '';
  } while (token);
  return out;
}

const allDocs = (await listAll('rooms')).map(decode);
// Common-area spaces share the collection; their `space-` type slug is the
// discriminator (util.isSpaceDoc). Guest-room invariants must not drift just
// because spaces arrived — the split IS one of the invariants.
// THREE populations, one collection. Guest rooms carry FF&E turnover, spaces
// carry common-area turnover, MEP docs carry the punch list for a guest room.
// `rooms` must exclude BOTH others or the 115-key invariants below start
// counting punch lists as keys.
const mepDocs = allDocs.filter((r) => String(r.type || '') === 'mep-punch');
const rooms = allDocs.filter((r) => !String(r.type || '').startsWith('space-')
  && String(r.type || '') !== 'mep-punch');
const spaces = allDocs.filter((r) => String(r.type || '').startsWith('space-'));
const templates = Object.fromEntries((await listAll('templates')).map((d) => [d.name.split('/').pop(), decode(d)]));

console.log(`${rooms.length} guest rooms · ${spaces.length} spaces · ${mepDocs.length} MEP punch · ${Object.keys(templates).length} templates\n`);

// ---- 1. every room's slug must name a template that IS that room's package ----
// This is the invariant room 118 broke. A slug is a join key: if it points at a
// template with a different item set, the app will offer to "restore" the room
// into the wrong shape.
const slugProblems = [];
for (const r of rooms) {
  const t = templates[r.type];
  if (!t) { slugProblems.push(`${r.number}: type "${r.type}" names no live template`); continue; }
  const rk = new Set(Object.keys(r.items || {}));
  const tk = new Set(Object.keys(t.items || {}));
  const missing = [...tk].filter((k) => !rk.has(k));
  // A line the room has and the template lacks is only a defect if it came
  // from a PACKAGE (derived). A crew member adding "Lamp shades are in the
  // room in a box" on site is the app working — room 201 carries exactly
  // that — and must never fail the build.
  const extra = [...rk].filter((k) => !tk.has(k) && r.items[k].derived);
  const added = [...rk].filter((k) => !tk.has(k) && !r.items[k].derived).length;
  if (missing.length || extra.length) {
    slugProblems.push(`${r.number} (${r.typeLabel}) vs template "${r.type}": `
      + `${missing.length} line(s) the template would ADD [${missing.slice(0, 4).join(',')}], `
      + `${extra.length} derived line(s) the template does not have [${extra.slice(0, 4).join(',')}]`);
  } else if (added) {
    console.log(`        (${r.number}: ${added} line(s) added on site — expected, not a defect)`);
  }
}
check(slugProblems.length === 0, `every room's type slug names a template with that room's exact package`);
slugProblems.forEach((p) => console.log('        ' + p));

// ---- 2. no two templates may share a display name ----
// Three "QQ Studio Connector" entries in one dropdown is a coin flip.
const byName = {};
for (const [slug, t] of Object.entries(templates)) (byName[t.name] ||= []).push(slug);
const dupes = Object.entries(byName).filter(([, s]) => s.length > 1);
// Two slugs sharing a name is legitimate ONLY when they carry the identical
// package (a Queen-Queen and a QQ Wide room are the same 40 lines).
const badDupes = dupes.filter(([, slugs]) => {
  const sigs = slugs.map((s) => JSON.stringify(Object.keys(templates[s].items || {}).sort()));
  return new Set(sigs).size > 1;
});
check(badDupes.length === 0, `no two templates share a display name while carrying different packages`);
badDupes.forEach(([n, s]) => console.log(`        "${n}" -> ${s.map((x) => `${x} (${Object.keys(templates[x].items).length} lines)`).join(' vs ')}`));

// ---- 3. no template may carry field state ----
const dirtyTpl = Object.entries(templates).filter(([, t]) =>
  Object.values(t.items || {}).some((i) => i.checked || i.initials || i.issue || i.checkedByName));
check(dirtyTpl.length === 0, `no template carries a check-off, initials or an issue`);
dirtyTpl.forEach(([s]) => console.log('        ' + s));

// ---- 4. FIELD WORK IS LIVE (era changed 2026-08-10) ----------------------
// Until 2026-08-10 only room 101 carried work — the 14 check-offs carried from
// the paper sheet at cutover — so this asserted "exactly one worked room". The
// crew then started walking: ~960 check-offs appeared across 47 rooms in a day
// (two crew accounts, plus the 13 'paper' marks carried at cutover).
// Asserting an empty hotel now would fail on SUCCESS, so the invariant flips
// from "nothing is worked" to "nothing that was worked can rot":
//   * the paper-carried marks must never disappear (they cannot be re-derived)
//   * every check-off must be attributable and time-stamped
const worked = rooms.filter((r) => Object.values(r.items || {}).some((i) => i.checked || i.issue)
  || Object.keys(r.notes || {}).length);
console.log(`        field work live in ${worked.length} room(s) — the crew is walking`);

const r101 = rooms.find((r) => r.number === '101');
const ck = Object.values(r101.items).filter((i) => i.checked).length;
const iss = Object.values(r101.items).filter((i) => i.issue).length;
const nts = Object.keys(r101.notes || {}).length;
// A FLOOR, not an equality: work only ever accumulates. A drop means loss.
check(ck >= 14 && iss >= 6 && nts >= 1,
  `room 101 never lost its carried paper work — ≥14 check-offs / ≥6 issues / ≥1 note (got ${ck}/${iss}/${nts})`);

// The 13 'paper' check-offs migrated at cutover carry checkedByUid 'paper' and
// exist in no other source. If they vanish, they are gone for good.
const paperMarks = rooms.reduce((n, r) =>
  n + Object.values(r.items || {}).filter((i) => i.checked && i.checkedByUid === 'paper').length, 0);
check(paperMarks >= 13, `the cutover's paper check-offs survive (${paperMarks} found, expected ≥13)`);

// Every check-off must say WHO and WHEN, or the record is not defensible in a
// turnover meeting. 'paper' marks predate app auth and are exempt from uid.
const orphanChecks = [];
for (const r of allDocs) {
  for (const [id, i] of Object.entries(r.items || {})) {
    if (!i.checked) continue;
    if (!String(i.initials || '').trim()) { orphanChecks.push(`${r.number}/${i.code || id}: no initials`); continue; }
    // The cutover's paper marks legitimately have no timestamp — the paper
    // sheet recorded WHO but never WHEN. Requiring one would mean inventing it.
    if (i.checkedByUid === 'paper') continue;
    if (!i.checkedAtLocal && !i.checkedAt) orphanChecks.push(`${r.number}/${i.code || id}: no timestamp`);
  }
}
check(orphanChecks.length === 0,
  `every check-off carries initials and a timestamp (${orphanChecks.length} orphaned)`);
if (orphanChecks.length) console.log('        ' + orphanChecks.slice(0, 8).join(', '));

// ---- 5. every FLAGGED or MEDIUM line must explain itself (rooms AND spaces) ----
const bare = [];
for (const r of allDocs) {
  for (const [id, i] of Object.entries(r.items || {})) {
    if ((i.reliability === 'FLAGGED' || i.reliability === 'MEDIUM') && !String(i.instanceNote || '').trim()) {
      bare.push(`${r.number}/${i.code || id}`);
    }
  }
}
check(bare.length === 0, `no FLAGGED/MEDIUM line is left without an explanation (${bare.length} bare)`);
if (bare.length) console.log('        ' + bare.slice(0, 12).join(', '));

// ---- 6. top-level keys stay inside what the security rules allow ----
const ALLOWED = new Set(['number', 'floor', 'type', 'typeLabel', 'items', 'notes',
  'deleted', 'schemaV', 'createdAt', 'updatedAt']);
const strays = allDocs.flatMap((r) => Object.keys(r).filter((k) => !ALLOWED.has(k)).map((k) => `${r.number}.${k}`));
check(strays.length === 0, `no doc carries a field outside the rules whitelist`);
if (strays.length) console.log('        ' + strays.slice(0, 10).join(', '));

// ---- 7. the hotel is 115 keys across four floors ----
const byFloor = rooms.reduce((a, r) => ((a[r.floor] = (a[r.floor] || 0) + 1), a), {});
check(rooms.length === 115, `115 rooms live (got ${rooms.length})`);
check(JSON.stringify(byFloor) === JSON.stringify({ 1: 16, 2: 33, 3: 33, 4: 33 }),
  `floors are 16/33/33/33 (got ${JSON.stringify(byFloor)})`);

// ---- 8. every room offered a 3D model exists, and none is a non-QQ type ----
const MODEL_ROOMS = JSON.parse(cfg.match(/MODEL_ROOMS = (\[[\s\S]*?\])/)[1]
  .replace(/'/g, '"').replace(/,(\s*])/, '$1'));
const live = new Set(rooms.map((r) => r.number));
const ghosts = MODEL_ROOMS.filter((n) => !live.has(n));
check(ghosts.length === 0, `every room offered a 3D model exists live (${ghosts.join(',') || 'none missing'})`);
const nonQQ = MODEL_ROOMS.filter((n) => {
  const r = rooms.find((x) => x.number === n);
  return r && !/^QQ /.test(r.typeLabel);
});
check(nonQQ.length === 0, `no non-QQ room is offered the QQ exhibit (${nonQQ.join(',') || 'none'})`);

// ---- 9. common-area spaces (once seeded) mirror the app's own metadata ----
// Zero spaces is legal — the pre-seed era. The moment ANY space doc exists,
// the whole population has to be coherent with js/space-meta.js: same numbers,
// same floors, same names. A half-seeded or renamed space is exactly the kind
// of quiet drift this suite exists to catch.
if (spaces.length === 0) {
  console.log('        (no spaces seeded yet — space invariants idle)');
} else {
  const metaSrc = readFileSync(new URL('../js/space-meta.js', import.meta.url), 'utf8');
  const META = JSON.parse(metaSrc.slice(metaSrc.indexOf('{'), metaSrc.lastIndexOf('}') + 1));

  const unknown = spaces.filter((s) => !META[s.number]).map((s) => s.number);
  check(unknown.length === 0, `every live space is one the app knows (${unknown.join(',') || 'all known'})`);

  const wrong = spaces.flatMap((s) => {
    const mm = META[s.number];
    if (!mm) return [];
    const bad = [];
    if (s.typeLabel !== mm.name) bad.push(`${s.number}: label "${s.typeLabel}" vs meta "${mm.name}"`);
    if (Number(s.floor) !== Number(mm.floor)) bad.push(`${s.number}: floor ${s.floor} vs meta ${mm.floor}`);
    return bad;
  });
  check(wrong.length === 0, `every space carries its plan name and true floor`);
  wrong.forEach((w) => console.log('        ' + w));

  const spaceIds = new Set(spaces.map((s) => s.number));
  const roomIds = new Set(rooms.map((r) => r.number));
  const clash = [...spaceIds].filter((n) => roomIds.has(n));
  check(clash.length === 0, `no space id collides with a guest-room number (${clash.join(',') || 'none'})`);

  // Era check, same spirit as the room-101 check above: until the crew starts
  // walking common areas, a check-off or note on a space could only have come
  // from a seeding defect. Loosen this deliberately when that era ends.
  const dirty = spaces.filter((s) => Object.values(s.items || {}).some((i) => i.checked || i.issue)
    || Object.keys(s.notes || {}).length);
  check(dirty.length === 0,
    `no seeded space carries field work yet (${dirty.map((s) => s.number).join(',') || 'all clean'})`);
}

// ---- MEP punch docs ----------------------------------------------------
// The failure this guards against: an MEP doc that looks fine on screen but
// is joined to the wrong room, or one whose punch lines have no punch step —
// a "checklist" the crew cannot act on. Neither is visible from the DOM.
if (!mepDocs.length) {
  console.log('        (no MEP punch docs seeded yet — MEP invariants idle)');
} else {
  const roomIds = new Set(rooms.map((r) => r.number));

  const orphan = mepDocs.filter((d) => {
    const m = /^(\d+)-MEP$/.exec(d.number);
    return !m || !roomIds.has(m[1]);
  }).map((d) => d.number);
  check(orphan.length === 0,
    `every MEP punch doc names a live guest room (${orphan.join(',') || 'all joined'})`);

  const badFloor = mepDocs.filter((d) => {
    const base = (/^(\d+)-MEP$/.exec(d.number) || [])[1];
    const parent = rooms.find((r) => r.number === base);
    return parent && Number(parent.floor) !== Number(d.floor);
  }).map((d) => d.number);
  check(badFloor.length === 0,
    `every MEP doc sits on its room's floor (${badFloor.join(',') || 'all agree'})`);

  const badLabel = mepDocs.filter((d) => {
    const base = (/^(\d+)-MEP$/.exec(d.number) || [])[1];
    const parent = rooms.find((r) => r.number === base);
    return parent && parent.typeLabel !== d.typeLabel;
  }).map((d) => d.number);
  check(badLabel.length === 0,
    `every MEP doc calls its room what the FF&E doc calls it (${badLabel.join(',') || 'all agree'})`);

  const MEP_CATS = new Set(['Mechanical', 'Electrical', 'Plumbing', 'Fire Protection', 'Low Voltage']);
  const strayCat = [];
  const noStep = [];
  const bareFlag = [];
  for (const d of mepDocs) {
    for (const [id, i] of Object.entries(d.items || {})) {
      if (!MEP_CATS.has(i.category)) strayCat.push(`${d.number}/${i.code || id}:"${i.category}"`);
      if (!String(i.verifyAtPunch || '').trim()) noStep.push(`${d.number}/${i.code || id}`);
      if ((i.reliability === 'FLAGGED' || i.reliability === 'MEDIUM') && !String(i.instanceNote || '').trim()) {
        bareFlag.push(`${d.number}/${i.code || id}`);
      }
    }
  }
  check(strayCat.length === 0, `every MEP line sits in one of the five trade groups (${strayCat.length} stray)`);
  if (strayCat.length) console.log('        ' + strayCat.slice(0, 8).join(', '));
  // A punch line with no action is not a punch line. This is the invariant that
  // separates this list from a parts inventory.
  check(noStep.length === 0, `every MEP line carries a punch step the walker performs (${noStep.length} without)`);
  if (noStep.length) console.log('        ' + noStep.slice(0, 8).join(', '));
  check(bareFlag.length === 0, `no MEP line is left FLAGGED/MEDIUM without an explanation (${bareFlag.length} bare)`);
  if (bareFlag.length) console.log('        ' + bareFlag.slice(0, 8).join(', '));

  // Same era check as rooms/spaces: nothing has been punched yet, so a
  // check-off could only be a seeding defect. Loosen when the walk starts.
  const dirty = mepDocs.filter((d) => Object.values(d.items || {}).some((i) => i.checked || i.issue));
  check(dirty.length === 0,
    `no seeded MEP doc carries field work yet (${dirty.map((d) => d.number).join(',') || 'all clean'})`);

  const byFloor = mepDocs.reduce((a, d) => ((a[d.floor] = (a[d.floor] || 0) + 1), a), {});
  console.log(`        ${mepDocs.length} MEP punch docs · by floor ${JSON.stringify(byFloor)} · `
    + `${mepDocs.reduce((n, d) => n + Object.keys(d.items || {}).length, 0)} punch lines`);
}

console.log(fail ? `\n${fail} FAILURE(S)` : '\nLIVE INVARIANTS: ALL PASS');
process.exit(fail ? 1 : 0);
