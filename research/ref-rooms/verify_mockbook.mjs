import fs from 'node:fs';
const ROOT = '/home/user/h2sep-checklist';
const REF = JSON.parse(fs.readFileSync(ROOT + '/platform/data/ref-rooms-staged.json', 'utf8'));
const LIVE = JSON.parse(fs.readFileSync(ROOT + '/platform/data/floor1-staged.json', 'utf8'));
const HTML = fs.readFileSync(ROOT + '/research/ref-rooms/mockbook.html', 'utf8');
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&amp;/g, '&');
/* the renderer's exact escape, copied from build_mockbook.mjs line 183 */
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');
let fails = 0, checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails++; console.log('  FAIL  ' + msg); } };

/* ---------- 1. LINE COUNTS, per document ---------- */
console.log('\n== 1. RENDERED LINE COUNTS vs SEED ==');
const docBlocks = HTML.split('<div class="doc">').slice(1);
const byDoc = new Map();
for (const b of docBlocks) {
  const id = (b.match(/doc <code>([^<]+)<\/code>/) || [])[1];
  const pill = Number((b.match(/<span class="pill">(\d+) lines<\/span>/) || [])[1]);
  const body = b.slice(b.indexOf('<tbody>'), b.indexOf('</tbody>'));
  const rows = (body.match(/<tr class="row[^"]*">/g) || []).length;
  const bandTotals = (body.match(/<span class="band-n">(\d+) lines?<\/span>/g) || [])
    .map((m) => Number(m.match(/(\d+)/)[1])).reduce((a, n) => a + n, 0);
  const noteRows = (body.match(/<tr class="noterow[^"]*">/g) || []).length;
  byDoc.set(id, { pill, rows, bandTotals, noteRows, body });
}
let totRows = 0, totSeed = 0;
for (const id of Object.keys(REF.docs)) {
  const seedN = Object.keys(REF.docs[id].items || {}).length;
  const seedNotes = Object.values(REF.docs[id].items || {}).filter((i) => i.instanceNote).length;
  const r = byDoc.get(id);
  if (!r) { ok(false, `doc ${id} not rendered at all`); continue; }
  ok(r.rows === seedN, `doc ${id}: rendered ${r.rows} line rows, seed has ${seedN}`);
  ok(r.pill === seedN, `doc ${id}: header pill says ${r.pill} lines, seed has ${seedN}`);
  ok(r.bandTotals === seedN, `doc ${id}: band headers total ${r.bandTotals}, seed has ${seedN}`);
  ok(r.noteRows === seedNotes, `doc ${id}: ${r.noteRows} instanceNote rows rendered, seed has ${seedNotes} non-empty`);
  totRows += r.rows; totSeed += seedN;
  console.log(`  doc ${id.padEnd(8)} lines ${String(seedN).padStart(3)} rendered ${String(r.rows).padStart(3)}`
    + `  pill ${String(r.pill).padStart(3)}  bands ${String(r.bandTotals).padStart(3)}`
    + `  instanceNotes ${String(seedNotes).padStart(3)}/${String(r.noteRows).padStart(3)}`);
}
ok(totRows === totSeed, `grand total rendered ${totRows} vs seed ${totSeed}`);
console.log(`  TOTAL      seed ${totSeed}  rendered ${totRows}`);
/* summary table's own FF&E / MEP totals */
const ffTot = ['202', '217', '230', '238'].reduce((a, r) => a + Object.keys(REF.docs[r].items).length, 0);
const mepTot = ['202', '217', '230', '238'].reduce((a, r) => a + Object.keys(REF.docs[r + '-MEP'].items).length, 0);
ok(HTML.includes(`<div><span class="k">Lines drawn up</span><span class="v">${ffTot + mepTot}</span></div>`),
  `title block "Lines drawn up" should read ${ffTot + mepTot}`);
console.log(`  title block "Lines drawn up" = ${ffTot + mepTot} (FF&E ${ffTot} + MEP ${mepTot})`);

/* every single line's own values, verbatim ---------------------------------- */
console.log('\n== 1b. EVERY LINE\'S TAG / QTY / LABEL / SRC / RELIABILITY / instanceNote ==');
let cellFails = 0, cells = 0;
for (const id of Object.keys(REF.docs)) {
  const body = byDoc.get(id).body;
  for (const [key, it] of Object.entries(REF.docs[id].items)) {
    const want = [];
    want.push(`<code>${esc(it.code || '--')}</code>`);
    want.push(`<div class="lbl">${esc(it.label)}</div>`);
    if (it.src) want.push(`<span class="src">${esc(it.src)}</span>`);
    if (it.instanceNote) want.push(`<div class="note clamped">${esc(it.instanceNote)}</div>`);
    for (const w of want) {
      cells++;
      if (!body.includes(w)) { cellFails++; console.log(`  FAIL  ${id}/${key}: not rendered verbatim -> ${w.slice(0, 110)}`); }
    }
  }
}
checks += cells; fails += cellFails;
console.log(`  ${cells - cellFails}/${cells} line fields rendered byte-for-byte from the seed`);

/* ---------- 2. B3.1 ---------- */
console.log('\n== 2. B3.1 CARRIAGE ==');
const b31Items = [];
for (const id of Object.keys(REF.docs)) {
  for (const [key, it] of Object.entries(REF.docs[id].items)) {
    if (/B3\.1/.test(it.instanceNote || '') || /B3\.1/.test(it.src || '')) b31Items.push({ id, key, it });
  }
}
console.log(`  seed carries B3.1 on ${b31Items.length} line(s)`);
for (const { id, key, it } of b31Items) {
  const body = byDoc.get(id).body;
  ok(it.instanceNote ? body.includes(`<div class="note clamped">${esc(it.instanceNote)}</div>`) : true,
    `${id}/${key}: B3.1 instanceNote not rendered verbatim`);
  ok(it.src ? body.includes(`<span class="src">${esc(it.src)}</span>`) : true,
    `${id}/${key}: B3.1 src not rendered verbatim`);
  console.log(`  ${id}/${key}  rel=${it.reliability}  code=${JSON.stringify(it.code || '')}`);
}
const relOk = b31Items.every((x) => x.it.reliability === 'FLAGGED');
ok(relOk, 'every B3.1 line should ship FLAGGED');
console.log(`  all ${b31Items.length} ship FLAGGED: ${relOk}`);
/* the conflicts-table entry text itself, as the seed states it in n_conflicts */
for (const room of ['202', '217', '230', '238']) {
  const n = (REF.docs[room].notes || {}).n_conflicts;
  ok(!!n, `room ${room}: n_conflicts missing from seed`);
  if (!n) continue;
  ok(/B3\.1/.test(n.text), `room ${room}: n_conflicts does not mention B3.1`);
  ok(HTML.includes(`<div class="notebody">${esc(n.text)}</div>`), `room ${room}: n_conflicts not rendered verbatim`);
  const mepN = (REF.docs[room + '-MEP'].notes || {}).n_conflicts;
  ok(mepN && mepN.text === n.text, `room ${room}: n_conflicts differs between the FF&E and MEP docs (only the FF&E copy is rendered)`);
}
const b31Html = (HTML.match(/B3\.1/g) || []).length;
console.log(`  "B3.1" appears ${b31Html} time(s) in the rendered page`);
ok(b31Html > 0, 'B3.1 must appear in the page');

/* ---------- 3. ROOM NOTES ---------- */
console.log('\n== 3. ROOM NOTES ==');
const THREE = ['n_conflicts', 'n_ptac2', 'n_rulings'];
const bodies = [...HTML.matchAll(/<div class="notebody">([\s\S]*?)<\/div>/g)].map((m) => unesc(m[1]));
for (const room of ['202', '217', '230', '238']) {
  const notes = REF.docs[room].notes || {};
  const keys = Object.keys(notes);
  ok(HTML.includes(`Room notes as they will appear in the app <span class="count">${keys.length}</span>`),
    `room ${room}: note count header should read ${keys.length}`);
  for (const k of keys) {
    ok(bodies.includes(notes[k].text), `room ${room}/${k}: note body not rendered verbatim`);
    ok(HTML.includes(`<summary><code>${esc(k)}</code>`), `room ${room}/${k}: note key not rendered`);
  }
  /* the MEP doc's notes are not rendered separately - so any that differ would be invisible */
  const mepNotes = REF.docs[room + '-MEP'].notes || {};
  for (const k of Object.keys(mepNotes)) {
    ok(notes[k] !== undefined, `room ${room}: MEP-only note ${k} has no rendered home`);
    ok(notes[k] && notes[k].text === mepNotes[k].text,
      `room ${room}/${k}: MEP copy differs from the rendered FF&E copy`);
  }
  const three = THREE.filter((k) => notes[k]);
  console.log(`  room ${room}: ${keys.length} notes, all verbatim; of the three fix-round notes present: ${three.join(', ') || '(none)'}`);
}
for (const k of THREE) {
  const rooms = ['202', '217', '230', '238'].filter((r) => (REF.docs[r].notes || {})[k]);
  const rendered = rooms.filter((r) => bodies.includes(REF.docs[r].notes[k].text));
  ok(rooms.length === rendered.length, `${k}: seed has it on ${rooms.join(',')} but rendered on ${rendered.join(',')}`);
  console.log(`  ${k.padEnd(12)} seed rooms [${rooms.join(', ')}] -> rendered [${rendered.join(', ')}]`);
}

/* ---------- 4. VERDICTS ---------- */
/* Round 4 RAN. All four types came back FAIL and none of the findings is
 * fixed, so this section pins the verdict word, the count, and the verbatim
 * text of every finding onto the rendered page. The expected counts are hard
 * numbers on purpose: a silently shortened finding list is the exact failure
 * this file exists to catch. */
console.log('\n== 4. VERDICTS ON THE PAGE ==');
const mod = await import(ROOT + '/research/ref-rooms/mockbook.data.mjs');
const R4_EXPECT = { '202': 3, '217': 2, '230': 3, '238': 2 };
let r4total = 0;
for (const room of ['202', '217', '230', '238']) {
  const v = mod.VERIFIER[room];
  ok(v.round === 4, `room ${room}: VERIFIER round is ${v.round}, expected 4`);
  ok(v.verdict === 'FAIL', `room ${room}: verdict ${v.verdict}, expected FAIL`);
  ok(v.pending === false, `room ${room}: round 4 was run, so it must not be marked pending`);
  ok(v.defects.length === R4_EXPECT[room],
    `room ${room}: round 4 carries ${v.defects.length} finding(s), expected ${R4_EXPECT[room]}`);
  r4total += v.defects.length;
  ok(HTML.includes(`Independent check, round 4: <span class="verdict-fail">FAIL</span>`),
    'page must print "Independent check, round 4: FAIL"');
  ok(HTML.includes(`<span class="count">${v.defects.length} finding${v.defects.length === 1 ? '' : 's'} raised</span>`),
    `room ${room}: the verifier block must badge ${v.defects.length} findings raised`);
  ok(!HTML.includes('class="verdict-pass"'),
    'no verdict on this page may be painted PASS - the fixing side does not award itself one');
  for (const d of v.defects) {
    ok(d.state === 'OPEN', `room ${room}: a defect is not OPEN`);
    ok(d.sev === null, `room ${room}: a severity was invented; round 4 wrote none`);
    ok(HTML.includes(`<div class="vbody">${esc(d.text)}</div>`),
      `room ${room}: round-4 finding not rendered verbatim -> ${d.text.slice(0, 70)}`);
  }
  /* the type's own header badge and its approve box */
  ok(HTML.includes(`round 4 &middot; ${v.defects.length} finding${v.defects.length === 1 ? '' : 's'} open and unfixed`),
    `room ${room}: approve box must say ${v.defects.length} open and unfixed`);
  console.log(`  room ${room}: FAIL, round 4, ${v.defects.length} finding(s) open and unfixed; ` +
    `prior round ${v.priorRound} was ${v.priorVerdict} with ${v.priorFindings} finding(s)`);
}
ok(r4total === 10, `round 4 should carry 10 findings across the four types, carries ${r4total}`);
console.log(`  round 4 total: ${r4total} findings, all OPEN, all rendered word for word`);

/* ---------- 4b. THE FRONT PAGE STATES THE VERDICTS AND THE TRAJECTORY ------ */
/* Austin approves from the front page. It has to carry the four verdicts and
 * the round-by-round counts without him scrolling, and it must not soften
 * either one. */
console.log('\n== 4b. FRONT PAGE: FOUR VERDICTS AND THE TRAJECTORY ==');
const head = HTML.slice(0, HTML.indexOf('<section class="block" id="summary">'));
ok(/ROUND 4 FAILED ALL FOUR TYPES/.test(head), 'front page must say round 4 failed all four types');
for (const room of ['202', '217', '230', '238']) {
  const n = mod.VERIFIER[room].defects.length;
  ok(head.includes(`${room} `) && new RegExp(`${room}[^<]*&mdash; FAIL, ${n}\\s+finding`).test(head),
    `front page must name room ${room} as FAIL with ${n} findings`);
}
ok(/not one of them is fixed/.test(head), 'front page must say plainly that none of the findings is fixed');
const R = mod.ROUND_RAISED;
ok(R[1] === 21 && R[2] === 26 && R[3] === 25, `ROUND_RAISED should read 21/26/25, reads ${JSON.stringify(R)}`);
for (const n of [R[1], R[2], R[3], r4total]) {
  ok(new RegExp(`<b>${n}</b>`).test(head), `front page must print the round count ${n}`);
}
ok(head.includes(`findings per round ${R[1]} &rarr; ${R[2]} &rarr; ${R[3]} &rarr; ${r4total}`),
  `title block must print the trajectory ${R[1]} -> ${R[2]} -> ${R[3]} -> ${r4total}`);
/* and it must not oversell: no PASS, no "clean", no "approved" */
ok(!/\bPASS\b/.test(head.replace(/verdict-pass/g, '')), 'front page must not print the word PASS');
ok(/not\s+a\s+clean\s+package\s+and\s+it\s+is\s+not\s+offered\s+as\s+one/.test(head),
  'front page must say the package is not clean');
console.log(`  front page: four FAIL verdicts named, trajectory ${R[1]} -> ${R[2]} -> ${R[3]} -> ${r4total}, `
  + 'no PASS anywhere, "none of them is fixed" stated');

/* ---------- 4c. THE D29 BED SKIRT LINE ON 238 ---------- */
/* Ruling D29 is the newest line in the package and the only one added after the
 * round-3 fix. It has to be in the seed, rendered, and byte-identical to the
 * approved generator's own definition - build_floor1.mjs is the authority and
 * this build may not have drifted from it. */
console.log('\n== 4c. D29 QUEEN BED SKIRT, room 238 ==');
const bsq = (REF.docs['238'].items || {}).bsq_a;
ok(!!bsq, 'seed doc 238 must carry the D29 bed skirt line bsq_a');
if (bsq) {
  ok(bsq.code === 'BS-Q', `bsq_a code is ${JSON.stringify(bsq.code)}, expected "BS-Q"`);
  ok(bsq.qty === 2, `bsq_a qty is ${bsq.qty}, expected 2 (one per GR-602.ADA base row)`);
  ok(bsq.label === 'Queen Bed Skirt @ ACCESSIBLE bed base', `bsq_a label is ${JSON.stringify(bsq.label)}`);
  ok(bsq.category === 'FF&E - Bedding', `bsq_a category is ${JSON.stringify(bsq.category)}`);
  ok(/D29/.test(bsq.src || ''), 'bsq_a src must cite ruling D29');
  ok(/no queen skirt/.test(bsq.instanceNote || ''), 'bsq_a note must state that no document tags a queen skirt');
  ok(/confirm the size with the FF&E supplier/.test(bsq.instanceNote || ''),
    'bsq_a note must carry D29\'s confirm-before-ordering instruction');
  const body238 = byDoc.get('238').body;
  ok(body238.includes(`<code>${esc(bsq.code)}</code>`), 'bsq_a mark not rendered');
  ok(body238.includes(`<div class="lbl">${esc(bsq.label)}</div>`), 'bsq_a label not rendered');
  ok(body238.includes(`<div class="note clamped">${esc(bsq.instanceNote)}</div>`), 'bsq_a note not rendered verbatim');
  ok(body238.includes(`<span class="src">${esc(bsq.src)}</span>`), 'bsq_a src not rendered verbatim');
  /* the two generators must agree on this line, word for word */
  const f1 = fs.readFileSync(ROOT + '/platform/tools/build_floor1.mjs', 'utf8');
  const rr = fs.readFileSync(ROOT + '/platform/tools/build_ref_rooms.mjs', 'utf8');
  const cut = (s) => {
    const i = s.indexOf("ruling: 'D29', doc: 'ffe', key: 'bsq_a'");
    return i < 0 ? null : s.slice(i, s.indexOf('applies:', i));
  };
  const a = cut(f1), b = cut(rr);
  ok(a && b && a === b, 'the D29 bsq_a definition must be byte-identical in build_floor1.mjs and build_ref_rooms.mjs');
  /* and it applies to 238 only - floor 1 has no QQ Acc. key, so LIVE is untouched */
  const liveHas = Object.keys(LIVE.docs || {}).some((d) => (LIVE.docs[d].items || {}).bsq_a);
  ok(!liveHas, 'no LIVE floor-1 room may carry bsq_a - floor 1 has no QQ Acc. key (D29)');
  const otherRefHas = ['202', '217', '230'].filter((r) => (REF.docs[r].items || {}).bsq_a);
  ok(otherRefHas.length === 0, `bsq_a must be on 238 only, also found on ${otherRefHas.join(', ')}`);
  console.log(`  238/bsq_a  ${bsq.code}  qty ${bsq.qty}  ${bsq.label}`);
  console.log('  rendered verbatim; definition byte-identical to build_floor1.mjs; absent from LIVE and from 202/217/230');
}
/* Round 3's findings are HISTORY now, and every one of them has to still be on
 * the page word for word - a fix round that quietly shortens the record of what
 * it was fixing is the same failure in a new place. */
ok(Array.isArray(mod.ROUND3) && mod.ROUND3.length === 25,
  `ROUND3 should hold the 25 round-3 findings, holds ${(mod.ROUND3 || []).length}`);
let r3rendered = 0;
for (const r of mod.ROUND3) {
  if (HTML.includes(esc(r.text))) r3rendered++;
  ok(/NOT RE-VERIFIED/.test(r.state), `a round-3 finding claims more than NOT RE-VERIFIED: ${r.text.slice(0, 60)}`);
  ok(r.how && r.how.length > 40, `a round-3 finding has no mechanism recorded: ${r.text.slice(0, 60)}`);
}
ok(r3rendered === mod.ROUND3.length, `only ${r3rendered}/${mod.ROUND3.length} round-3 findings rendered`);
console.log(`  round-3 history: ${r3rendered}/${mod.ROUND3.length} findings printed word for word, each with its mechanism`);
const openBadges = (HTML.match(/<span class="count">(\d+) finding/g) || []);
console.log(`  finding-count badges: ${openBadges.join(' ')}`);
/* FAIL has to be visible on every type in all three places it belongs: the
 * summary row, the type header, and the type's own verifier block. */
const failBadges = (HTML.match(/class="verdict-fail"/g) || []).length;
ok(failBadges >= 12, `FAIL must be painted on every type in every place it belongs; found ${failBadges}`);
console.log(`  FAIL badges painted: ${failBadges}`);
/* round 2 history preserved */
ok(mod.ROUND2.length === 30, `ROUND2 history should hold 30 findings, holds ${mod.ROUND2.length}`);
let r2rendered = 0;
for (const r of mod.ROUND2) if (HTML.includes(esc(r.text))) r2rendered++;
ok(r2rendered === mod.ROUND2.length, `only ${r2rendered}/${mod.ROUND2.length} round-2 findings rendered`);
console.log(`  round-2 history: ${r2rendered}/${mod.ROUND2.length} findings still printed word for word`);
console.log(`  round-1 history: ${mod.ROUND1.length} findings`);

/* ---------- 5. STAMP / SEED IDENTITY ---------- */
console.log('\n== 5. SEED IDENTITY ==');
const stamp = String(REF.meta.builtAt || '').slice(0, 10);
const carried = String(REF.meta.fieldStateCarriedAt || REF.meta.builtAt || '').slice(0, 10);
ok(HTML.includes(`Rendered from the seed stamped ${esc(stamp)}`), `page must name the seed stamp ${stamp}`);
ok(HTML.includes(`field state carried ${esc(carried)}`), `page must name the carry stamp ${carried}`);
console.log(`  seed builtAt ${REF.meta.builtAt}  fieldStateCarriedAt ${REF.meta.fieldStateCarriedAt}`);

console.log(`\n== RESULT: ${checks - fails}/${checks} checks passed, ${fails} failed ==`);
process.exit(fails ? 1 : 0);
