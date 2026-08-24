import fs from 'node:fs';
const ROOT = '/home/user/h2sep-checklist';
const REF = JSON.parse(fs.readFileSync(ROOT + '/platform/data/ref-rooms-staged.json', 'utf8'));
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
console.log('\n== 4. VERDICTS ON THE PAGE ==');
const mod = await import(ROOT + '/research/ref-rooms/mockbook.data.mjs');
for (const room of ['202', '217', '230', '238']) {
  const v = mod.VERIFIER[room];
  ok(v.round === 3, `room ${room}: VERIFIER round is ${v.round}, expected 3`);
  ok(v.verdict === 'FAIL', `room ${room}: verdict ${v.verdict}`);
  ok(HTML.includes(`Independent check, round 3: <span class="verdict-fail">FAIL</span>`),
    'page must print "Independent check, round 3: FAIL"');
  for (const d of v.defects) {
    ok(d.state === 'OPEN', `room ${room}: a defect is not OPEN`);
    ok(HTML.includes(`<div class="vbody">${esc(d.text)}</div>`),
      `room ${room}: round-3 finding not rendered verbatim -> ${d.text.slice(0, 70)}`);
  }
  console.log(`  room ${room}: FAIL, round 3, ${v.defects.length} findings, all OPEN and rendered verbatim`);
}
const openBadges = (HTML.match(/<span class="count">(\d+) open<\/span>/g) || []);
console.log(`  open-count badges: ${openBadges.join(' ')}`);
ok((HTML.match(/verdict-fail/g) || []).length >= 8, 'FAIL must be shown on every type');
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
