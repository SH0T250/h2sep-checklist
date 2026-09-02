#!/usr/bin/env node
/* Builds research/floor2/floor2book.html - the floor-2 review book Austin
 * approves from. Reads only. Writes exactly one file: floor2book.html.
 *
 *   node research/floor2/build_floor2book.mjs
 *
 * Sources (all READ ONLY):
 *   platform/data/floor2-staged.json      the staged floor-2 build, crew work carried
 *   platform/data/floor1-staged.json      the LIVE floor-1 build (donors)
 *   platform/data/ref-rooms-staged.json   the four mock-ups (D30)
 *   data/project.sqlite                   rooms and spaces tables
 *   research/floor2/build.log             the generator's own report
 *   research/floor2/carry.log             the crew-carry reconciliation
 *   research/floor2/audit.log             tests/floor2-audit.mjs output
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const FLOOR = (process.argv.find((a) => a.startsWith('--floor=')) || '--floor=2').slice('--floor='.length);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const HERE = path.join(ROOT, 'research', 'floor' + FLOOR);
const rd = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const txt = (p) => (fs.existsSync(path.join(HERE, p)) ? fs.readFileSync(path.join(HERE, p), 'utf8') : '');

const F2 = rd('platform/data/floor' + FLOOR + '-staged.json');
const F1 = rd('platform/data/floor1-staged.json');
const REF = rd('platform/data/ref-rooms-staged.json');
const buildLog = txt('build.log'), carryLog = txt('carry.log'), auditLog = txt('audit.log');

const DB = JSON.parse(execFileSync('python3', ['-c', `
import sqlite3, json
c = sqlite3.connect(${JSON.stringify(path.join(ROOT, 'data/project.sqlite'))})
cur = c.cursor()
rooms = {r[0]: {"type": r[1], "acc": r[2], "conn": r[3], "label": r[4], "note": r[5]} for r in cur.execute("select room_no, room_type, accessible, connecting, display_label, note from rooms where floor=?", (${JSON.stringify(FLOOR)},))}
spaces = {r[0]: {"name": r[1], "note": r[2]} for r in cur.execute("select space_no, name, note from spaces where floor=?", (${JSON.stringify(FLOOR)},))}
print(json.dumps({"rooms": rooms, "spaces": spaces}))
`], { encoding: 'utf8' }));

const DONOR = { 'King Studio': '104', 'King One Bedroom': '104', 'King One Bedroom Acc.': '104', 'Queen-Queen': '105',
  'QQ Wide': '105', 'QQ Extended': '105', 'QQ Acc.': '105', 'QQ Connecting': '103' };
const MOCKUP = FLOOR === '2' ? { 202: 'King One Bedroom', 217: 'King One Bedroom Acc.', 230: 'QQ Extended', 238: 'QQ Acc.' } : {};
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const live = (d) => Object.entries(d.items || {}).filter(([, v]) => !v.deleted);
const isSpace = (id) => /^S/.test(id);
const isRoom = (id) => /^\d{3}$/.test(id);

/* ---------------------------------------------------------------- numbers */
const docs = F2.docs;
const roomIds = Object.keys(docs).filter(isRoom).sort();
const spaceIds = Object.keys(docs).filter(isSpace).sort();
const lines = Object.entries(docs).flatMap(([id, d]) => live(d).map(([k, v]) => ({ id, k, v })));
const rel = { HIGH: 0, MEDIUM: 0, FLAGGED: 0 };
for (const l of lines) rel[l.v.reliability] = (rel[l.v.reliability] || 0) + 1;
const checks = lines.filter((l) => l.v.checked).length;
const issues = lines.filter((l) => l.v.issue && String(l.v.issue).trim() && !l.v.issueResolved).length;
const crewNotes = Object.values(docs).reduce((n, d) => n + Object.values(d.notes || {}).filter((x) => x.by).length, 0);
const carriedLines = lines.filter((l) => /FIELD-AUTHORED LINE|THIS LINE EXISTS BECAUSE THE CREW/.test(String(l.v.instanceNote))).length;

/* Same-type rooms: lines that are HIGH on the floor-1 donor and not HIGH here. */
const stricter = [];
for (const r of roomIds) {
  const t = DB.rooms[r].type;
  if (!['King Studio', 'Queen-Queen', 'QQ Connecting'].includes(t)) continue;
  const d = DONOR[t];
  for (const suf of ['', '-MEP']) {
    for (const [k, v] of live(docs[r + suf])) {
      const dv = (F1.docs[d + suf] || { items: {} }).items[k];
      if (dv && !dv.deleted && dv.reliability === 'HIGH' && v.reliability !== 'HIGH') stricter.push({ room: r + suf, key: k, code: v.code, rel: v.reliability });
    }
  }
}
const stricterByKey = new Map();
for (const s of stricter) { const kk = s.key + ' ' + (s.code || ''); stricterByKey.set(kk, (stricterByKey.get(kk) || 0) + 1); }

/* ----------------------------------------------------------- audit digest */
const auditLines = auditLog.split('\n').filter((l) => /^\s+(PASS|FAIL)\s/.test(l)).map((l) => l.trim());
const auditPass = auditLines.filter((l) => l.startsWith('PASS')).length;
const auditFail = auditLines.filter((l) => l.startsWith('FAIL')).length;
const auditTotal = (auditLog.match(/(\d+) passed, (\d+) failed/) || [])[0] || '';
const carryRecon = (carryLog.match(/RECONCILIATION[\s\S]*?CREW COLLECTION[^\n]*/) || [''])[0];
const carryRestored = (carryLog.match(/LINES REBUILT[\s\S]*?\n\n/) || [''])[0];

/* -------------------------------------------------------------- the page */
const roomRows = roomIds.map((r) => {
  const info = DB.rooms[r];
  const ffe = docs[r], mep = docs[r + '-MEP'];
  const fl = live(ffe), ml = live(mep);
  const flag = (arr) => arr.filter(([, v]) => v.reliability !== 'HIGH').length;
  const ch = [...fl, ...ml].filter(([, v]) => v.checked).length;
  const op = [...fl, ...ml].filter(([, v]) => v.issue && String(v.issue).trim() && !v.issueResolved).length;
  const nn = Object.values(ffe.notes || {}).filter((x) => x.by).length;
  const ww = fl.map(([, v]) => v.code).find((c) => /^GR-3(04|05|08|09|15|16)$/.test(c || '')) || '';
  const d22 = (ffe.notes || {}).n_d22;
  const d22state = !d22 ? '' : /APPLIED/.test(d22.text) ? 'applied' : /STANDS/.test(d22.text) ? 'stands' : 'open';
  const bath = (ffe.notes || {}).n_config ? 'both configurations, open' : '';
  return { r, info, ffe: fl.length, mep: ml.length, fflag: flag(fl), mflag: flag(ml), ch, op, nn, ww, d22state, bath, mock: MOCKUP[r] || '' };
});
const spaceRows = spaceIds.filter((id) => !id.endsWith('-M')).map((id) => {
  const no = id.slice(1); const d = docs[id]; const m = docs[id + '-M'];
  return { id, no, name: DB.spaces[no]?.name || d.typeLabel, ffe: live(d).length, mep: m ? live(m).length : 0,
    flag: [...live(d), ...(m ? live(m) : [])].filter(([, v]) => v.reliability !== 'HIGH').length };
});
const noPackage = (F2.meta.spacesWithNoPackage || []);

const wwTable = FLOOR === '3' ? [
  ['GR-304', 'Working Wall @ King', '17', roomRows.filter((x) => x.ww === 'GR-304').length, 'stands, HIGH (reconciles: 17 = 17)', 'the King Studios'],
  ['GR-305', 'Working Wall @ QQ', '11 printed (L 5 + R 6) against 12 keys', roomRows.filter((x) => x.ww === 'GR-305').length, 'D35 (Austin, 2026-09-02): D22 and D33 carried up by room type. MEDIUM while the hand and the twelfth unit are open', roomRows.filter((x) => x.ww === 'GR-305').map((x) => x.r).join(' ')],
  ['GR-308', 'Working Wall @ QQ Connector', '2 printed against 1 key', roomRows.filter((x) => x.ww === 'GR-308').length, 'stands on the one connecting key', roomRows.filter((x) => x.ww === 'GR-308').map((x) => x.r).join(' ')],
  ['GR-309', 'Working Wall @ QQ Accessible (printed GR-309R)', '1', roomRows.filter((x) => x.ww === 'GR-309').length, 'D35; the spec and ID-5.9 also name GR-309. MEDIUM while the hand is open', roomRows.filter((x) => x.ww === 'GR-309').map((x) => x.r).join(' ')],
  ['GR-315', 'Working Wall @ K 1 BDRM Suite', '1', roomRows.filter((x) => x.ww === 'GR-315').length, 'stands, HIGH', roomRows.filter((x) => x.ww === 'GR-315').map((x) => x.r).join(' ')],
  ['GR-316', 'Working Wall @ K Accessible', '1', roomRows.filter((x) => x.ww === 'GR-316').length, 'stands, HIGH', roomRows.filter((x) => x.ww === 'GR-316').map((x) => x.r).join(' ')],
] : FLOOR !== '2' ? [
  ['GR-304', 'Working Wall @ King', String(F2.meta.workbookTab || '').includes('GR-304 17') ? '17' : '?', roomRows.filter((x) => x.ww === 'GR-304').length, 'stands, HIGH (reconciles: 17 = 17)', 'the King Studios'],
  ['GR-308', 'as transcribed on every two-queen key', 'tab: GR-305 11, GR-308 2', roomRows.filter((x) => x.ww === 'GR-308').length, 'OPEN. The ' + FLOOR + 'th Floor tab prints the same figures as the 2nd and does not reconcile with this floor, so no floor-2 ruling is applied here', roomRows.filter((x) => x.ww === 'GR-308').map((x) => x.r).join(' ')],
  ['GR-315', 'Working Wall @ K 1 BDRM Suite', '1', roomRows.filter((x) => x.ww === 'GR-315').length, 'stands, HIGH', roomRows.filter((x) => x.ww === 'GR-315').map((x) => x.r).join(' ')],
  ['GR-316', 'Working Wall @ K Accessible', '1', roomRows.filter((x) => x.ww === 'GR-316').length, 'stands, HIGH', roomRows.filter((x) => x.ww === 'GR-316').map((x) => x.r).join(' ')],
] : [
  ['GR-304', 'Working Wall @ King', '17', roomRows.filter((x) => x.ww === 'GR-304').length, 'stands, HIGH', 'the 17 King Studios'],
  ['GR-305', 'Working Wall @ QQ', '11 (L 5 + R 6)', roomRows.filter((x) => x.ww === 'GR-305').length, 'D22 on the 8 plain Queen-Queen keys; D33 (Austin, 2026-09-02) on QQ Wide 201 and QQ Extended 230, 232. MEDIUM while the hand is open', '201 203 205 207 209 211 213 228 230 232 234'],
  ['GR-308', 'Working Wall @ QQ Connector', '2 (L 1 + R 1)', roomRows.filter((x) => x.ww === 'GR-308').length, 'stands on the 2 connecting keys', '215 236'],
  ['GR-309', 'Working Wall @ QQ Accessible (printed GR-309R)', '1', roomRows.filter((x) => x.ww === 'GR-309').length, 'D33 (Austin, 2026-09-02); the spec and ID-5.9 also name GR-309. MEDIUM while the hand is open', '238'],
  ['GR-315', 'Working Wall @ K 1 BDRM Suite', '1', roomRows.filter((x) => x.ww === 'GR-315').length, 'stands, HIGH', '202'],
  ['GR-316', 'Working Wall @ K Accessible', '1', roomRows.filter((x) => x.ww === 'GR-316').length, 'stands, HIGH', '217'],
];

const decisions = FLOOR !== '2' ? [
  ['Approve floor ' + FLOOR + ' for rollout', 'Nothing here is live. Approval starts the cutover: backup first, three-way merge, read-back verify, crew collection never written (the floor-1 runbook).'],
  ...(FLOOR === '3'
    ? [['Working walls, ruled', 'D35, 2026-09-02: "carry D22 and D33 up by room type on floor 3". Applied: the nine plain Queen-Queens, 301, 330 and 332 take GR-305; 338 takes GR-309; 336 keeps GR-308. The 3rd Floor tab still prints 11 GR-305 walls against these 12 keys and 2 connectors against 1, so the purchase record is one wall short and the hand per room is unknown; every line says so.']]
    : [['Working walls on the two-queen keys', 'The ' + FLOOR + 'th Floor tab prints the same six figures as the 2nd and this floor\'s key mix differs, so the arithmetic does not close. Every two-queen wall ships GR-308 as transcribed, FLAGGED, with the arithmetic on the line. Say whether the floor-2 and floor-3 rulings carry up by room type.']]),
  ['GR-305 handedness', 'Still open building-wide. D26 records you are answering this yourself.'],
  ['Bathing configuration on 317 and 338', 'Both the tub and the roll-in rows are carried and flagged on each; D19 covered room 118 only and was not extended. Do not order a bath package for either key until ruled.'],
  ['Common-area finish rows', 'Six of the nine floor-' + FLOOR + ' spaces have only paint, drywall, flooring, doors and wall-covering rows, which your approved gate keeps off every checklist, so they get no document. Same question floors 1 and 2 left open.'],
  ['Stricter flags than floor 1 on the same room types', `${stricter.length} lines that are HIGH on the floor-1 donor are MEDIUM or FLAGGED here, for the same reasons as on floor 2: open conflicts-table entries carried onto the line, and the worst-of-own-rows MEP rule.`],
] : [
  ['Approve floor 2 for rollout', 'Nothing here is live. Approval starts the cutover: backup first, three-way merge, read-back verify, crew collection never written (the floor-1 runbook).'],
  ['Working walls, ruled', 'D33, 2026-09-02: "ok retag 201, 230, 232 to GR-305 and 238 to GR-309". Applied. The crew\'s check-offs on those four walls came across the retag. Nothing left to decide here except the hand.'],
  ['GR-305 handedness', 'The tab splits floor 2 into 5 LEFT and 6 RIGHT. No document says which room takes which hand. D26 records you are answering this yourself.'],
  ['Bathing configuration on 217 and 238', 'Both the tub and the roll-in rows are carried and flagged on each; D19 covered room 118 only and was not extended. Do not order a bath package for either key until ruled.'],
  ['Common-area finish rows', 'Six of the nine floor-2 spaces have only paint, drywall, flooring, doors and wall-covering rows, which your approved gate keeps off every checklist, so they get no document. Same question floor 1 left open: widen the gate for spaces, or leave them out.'],
  ['Stricter flags than floor 1 on the same room types', `${stricter.length} lines that are HIGH on the floor-1 donor are MEDIUM or FLAGGED here. Every one comes from an OPEN entry in the conflicts table (B4.5, B4.2, B3.1, A11, B4.4) or the worst-of-own-rows MEP rule, which the mock-ups already follow. Floor 1 was built before that rule. Either close those conflicts or rule that floor 1's HIGH stands, and the lines follow.`],
];

const html = `<title>Floor ${FLOOR} Review Book</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{--paper:#F5F7FA;--ink:#1C2230;--muted:#5B6678;--line:#D3DAE5;--panel:#FFFFFF;--navy:#1B2A41;--steel:#3E6491;--steel-soft:#E4ECF6;--amber:#B8741E;--amber-soft:#FBF1E0;--green:#2C7A57;--green-soft:#E2F2EA;--red:#B23A32;--red-soft:#F9E5E3;--mono:'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,monospace;--sans:'IBM Plex Sans',system-ui,-apple-system,Segoe UI,sans-serif;--serif:'Source Serif 4',Georgia,'Times New Roman',serif}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--paper:#131822;--ink:#E6EAF1;--muted:#9AA6B8;--line:#2B3547;--panel:#1B2230;--navy:#DCE6F5;--steel:#8FB0DC;--steel-soft:#1F2D42;--amber:#E0A050;--amber-soft:#3A2C14;--green:#6CC59A;--green-soft:#173327;--red:#E58078;--red-soft:#3D1F1C}}
:root[data-theme="dark"]{--paper:#131822;--ink:#E6EAF1;--muted:#9AA6B8;--line:#2B3547;--panel:#1B2230;--navy:#DCE6F5;--steel:#8FB0DC;--steel-soft:#1F2D42;--amber:#E0A050;--amber-soft:#3A2C14;--green:#6CC59A;--green-soft:#173327;--red:#E58078;--red-soft:#3D1F1C}
body{background:var(--paper);color:var(--ink);font-family:var(--sans);font-size:15px;line-height:1.55;margin:0}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px 80px}
.band{position:sticky;top:0;z-index:5;background:var(--navy);color:var(--paper);font-family:var(--mono);font-size:12px;letter-spacing:.08em;text-transform:uppercase;padding:10px 24px;display:flex;gap:24px;flex-wrap:wrap}
.band b{color:var(--amber)}
h1{font-family:var(--serif);font-weight:600;font-size:44px;line-height:1.05;margin:40px 0 8px;text-wrap:balance;color:var(--navy)}
h2{font-family:var(--serif);font-weight:600;font-size:26px;margin:56px 0 12px;text-wrap:balance;color:var(--navy)}
h3{font-size:15px;font-weight:600;margin:24px 0 8px;letter-spacing:.02em}
p{max-width:72ch}
.lede{font-size:18px;color:var(--muted);max-width:70ch;margin:0 0 28px}
.eyebrow{font-family:var(--mono);font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--steel);margin:0 0 6px}
.tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:24px 0}
.tile{background:var(--panel);border:1px solid var(--line);padding:14px 16px}
.tile .n{font-family:var(--serif);font-size:32px;font-weight:600;line-height:1;font-variant-numeric:tabular-nums;color:var(--navy)}
.tile .l{font-size:12px;color:var(--muted);margin-top:6px;text-transform:uppercase;letter-spacing:.06em}
.tile.ok .n{color:var(--green)}.tile.warn .n{color:var(--amber)}
table{border-collapse:collapse;width:100%;font-size:13.5px;font-variant-numeric:tabular-nums}
th{text-align:left;font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);border-bottom:2px solid var(--line);padding:8px 10px;white-space:nowrap}
td{border-bottom:1px solid var(--line);padding:7px 10px;vertical-align:top}
td.num,th.num{text-align:right}
.scroll{overflow-x:auto;background:var(--panel);border:1px solid var(--line)}
code,.tag{font-family:var(--mono);font-size:12.5px}
.tag{background:var(--steel-soft);color:var(--steel);padding:1px 6px;border-radius:2px;white-space:nowrap}
.pill{display:inline-block;font-family:var(--mono);font-size:11px;letter-spacing:.04em;padding:2px 7px;border-radius:2px;white-space:nowrap}
.pill.ok{background:var(--green-soft);color:var(--green)}.pill.warn{background:var(--amber-soft);color:var(--amber)}.pill.bad{background:var(--red-soft);color:var(--red)}.pill.info{background:var(--steel-soft);color:var(--steel)}
.decide{display:grid;grid-template-columns:1fr;gap:10px;margin:16px 0}
.decide div{background:var(--panel);border:1px solid var(--line);border-left:4px solid var(--amber);padding:12px 16px}
.decide b{display:block;font-family:var(--serif);font-size:17px;margin-bottom:4px;color:var(--navy)}
pre{background:var(--panel);border:1px solid var(--line);padding:14px 16px;font-family:var(--mono);font-size:12px;line-height:1.5;overflow-x:auto;white-space:pre}
.audit{columns:2;column-gap:32px;font-family:var(--mono);font-size:12px;line-height:1.7}
.audit div{break-inside:avoid}
.audit .p::before{content:'PASS ';color:var(--green);font-weight:600}.audit .f::before{content:'FAIL ';color:var(--red);font-weight:600}
.foot{margin-top:56px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font-size:13px}
a{color:var(--steel)}
@media (max-width:700px){.audit{columns:1}h1{font-size:34px}.tiles{grid-template-columns:repeat(2,1fr)}}
</style>
<div class="band"><span>H2SEP · Home2 Suites Eagle Pass · Triun 24030</span><span><b>Floor ${FLOOR} · staged · not live</b></span><span>${esc(F2.meta.builtAt || '')}</span></div>
<div class="wrap">
<p class="eyebrow">Review book</p>
<h1>Floor ${FLOOR}, built out for approval</h1>
<p class="lede">Every floor-${FLOOR} guest room and common area the drawings hold, as FF&amp;E checklists and MEP punches, with the crew's real work carried in from the live app. ${esc(FLOOR === '2' ? 'Austin, 2026-09-02: "I need the 2 floor built out. Just the FF&E & MEP not the 3d bim yet."' : 'Austin, 2026-09-02: "once completed lets start floor 3 just no 3d BIM yet."')} Nothing here has been written to the live database.</p>

<div class="tiles">
<div class="tile"><div class="n">${roomIds.length}</div><div class="l">guest rooms</div></div>
<div class="tile"><div class="n">${spaceRows.length}</div><div class="l">common areas with a package</div></div>
<div class="tile"><div class="n">${Object.keys(docs).length}</div><div class="l">documents</div></div>
<div class="tile"><div class="n">${lines.length}</div><div class="l">checklist lines</div></div>
<div class="tile ok"><div class="n">${checks}</div><div class="l">crew check-offs carried</div></div>
<div class="tile warn"><div class="n">${issues}</div><div class="l">open crew issues carried</div></div>
<div class="tile"><div class="n">${crewNotes}</div><div class="l">crew notes carried</div></div>
<div class="tile warn"><div class="n">${rel.FLAGGED + rel.MEDIUM}</div><div class="l">lines flagged or medium</div></div>
</div>

<h2>What needs your word</h2>
<div class="decide">${decisions.map(([t, b]) => `<div><b>${esc(t)}</b>${esc(b)}</div>`).join('')}</div>

<h2>How it was built</h2>
<p>The same recipe that built floor 1 and the four mock-ups, proved byte for byte against the floor-1 generator on every run. Each room takes its shape (category, tag, count, sort) from its own rows in the reference database, and its package text (rulings, closed flags, submittal links) from the floor-1 room of the same type where one exists: King Studios from 104, Queen-Queens from 105, connecting rooms from 103. The four types with no floor-1 room take the donor the mock-ups used. A donor may enrich a line; it may not launder it: this room's own reliability, own citation and own marks govern, and every line says in a SOURCE sentence where each part of it came from.</p>
<p>Sheet citations were re-judged for floor 2. A first-floor sheet is dropped and quoted as removed, or re-pointed to its second-floor sibling where the database proves the pairing; A100 survives only where the citation is to a table printed on it. The sprinkler line on a room with head rows counts those rows and drops the first-floor head total; a room type with no verified heads ships with no count at all.</p>

<h2>The working walls, reconciled against the purchase record</h2>
${FLOOR === '2' ? `<p>The FF&amp;E Installation workbook's 2nd Floor tab lists the working walls as separate purchased parts. Every count reconciles against the floor's key mix with no remainder. That is the evidence standard ruling D22 used on floor 1. D22 covers the plain Queen-Queen keys; D33 (Austin, 2026-09-02) covers the three other two-queen keys and the accessible key.</p>` : `<p>${esc(F2.meta.workbookTab || '')}</p>`}
<div class="scroll"><table>
<tr><th>tag</th><th>workbook item</th><th class="num">tab count</th><th class="num">rooms here</th><th>treatment</th><th>rooms</th></tr>
${wwTable.map((r) => `<tr><td><span class="tag">${esc(r[0])}</span></td><td>${esc(r[1])}</td><td class="num">${esc(r[2])}</td><td class="num">${r[3]}</td><td>${esc(r[4])}</td><td><code>${esc(r[5])}</code></td></tr>`).join('')}
</table></div>

<h2>Every room</h2>
<p>Lines are live lines. Flags count MEDIUM and FLAGGED lines. Carried work is the crew's, from the live app, initials only. D22 shows how the working-wall ruling landed on the room.</p>
<div class="scroll"><table>
<tr><th>room</th><th>type</th><th>from</th><th class="num">FF&amp;E</th><th class="num">flags</th><th class="num">MEP</th><th class="num">flags</th><th>wall</th><th>D22</th><th class="num">checks</th><th class="num">open</th><th class="num">notes</th><th>open questions</th></tr>
${roomRows.map((x) => `<tr><td><b>${x.r}</b></td><td>${esc(x.info.type)}${x.mock ? ' <span class="pill info">mock-up</span>' : ''}</td><td>${esc(DONOR[x.info.type])}</td><td class="num">${x.ffe}</td><td class="num">${x.fflag}</td><td class="num">${x.mep}</td><td class="num">${x.mflag}</td><td><span class="tag">${esc(x.ww)}</span></td><td>${x.d22state === 'applied' ? '<span class="pill ok">applied</span>' : x.d22state === 'open' ? '<span class="pill warn">open</span>' : x.d22state === 'stands' ? '<span class="pill info">stands</span>' : ''}</td><td class="num">${x.ch}</td><td class="num">${x.op}</td><td class="num">${x.nn}</td><td>${esc(x.bath)}</td></tr>`).join('')}
</table></div>

<h2>Common areas</h2>
<p>Plan numbering from A10${Number(FLOOR) - 1} (ruling D18). A space whose only rows are finishes gets no document under the approved gate, and is listed so nobody thinks it was forgotten.</p>
<div class="scroll"><table>
<tr><th>doc</th><th>space</th><th class="num">FF&amp;E lines</th><th class="num">MEP lines</th><th class="num">flags</th></tr>
${spaceRows.map((s) => `<tr><td><b>${esc(s.id)}</b></td><td>${esc(s.no)} ${esc(s.name)}</td><td class="num">${s.ffe}</td><td class="num">${s.mep}</td><td class="num">${s.flag}</td></tr>`).join('')}
</table></div>
<h3>No package under the approved gate</h3>
<p>${esc(noPackage.join(' · '))}</p>

<h2>The crew's work, reconciled exactly</h2>
<p>Read from the live crew collection, never written. Names and account ids dropped on the way in; note authors reduced to initials. The identity below is the run's own output: the crew's totals equal what landed plus what is named, or the tool refuses to write.</p>
<pre>${esc(carryRecon || 'carry.log not found - run platform/tools/carry_floor2.mjs')}</pre>
${carryRestored ? `<h3>Lines that exist because the crew is already working them</h3><pre>${esc(carryRestored.trim())}</pre>` : ''}

<h2>Where floor 2 is stricter than floor 1</h2>
<p>${stricter.length} lines on the same-type rooms are HIGH on the floor-1 donor and MEDIUM or FLAGGED here. None is a new fact about the room: each is an OPEN entry in the conflicts table carried onto the line, or the MEP rule that a condensed line is never read better than the worst of this room's own rows. The mock-ups already follow both rules; floor 1 was built before them. They are listed so the difference is a decision and not a surprise.</p>
<div class="scroll"><table><tr><th>line</th><th class="num">rooms</th></tr>
${[...stricterByKey.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `<tr><td><code>${esc(k)}</code></td><td class="num">${n}</td></tr>`).join('')}
</table></div>

<h2>Verification</h2>
<p>tests/floor${FLOOR}-audit.mjs, ${esc(auditTotal || `${auditPass} passed, ${auditFail} failed`)}. Every check tries to fail the data; the generator's own selftest re-derives every room from the database and proves the recipe still reproduces the approved floor-1 rooms.</p>
<div class="audit">${auditLines.map((l) => `<div class="${l.startsWith('PASS') ? 'p' : 'f'}">${esc(l.replace(/^(PASS|FAIL)\s+/, ''))}</div>`).join('')}</div>

<h2>Sources</h2>
<p>platform/data/floor${FLOOR}-staged.json (the build) · platform/tools/build_floor2.mjs --floor=${FLOOR} (the generator) · platform/tools/carry_floor2.mjs --floor=${FLOOR} (the crew carry) · tests/floor${FLOOR}-audit.mjs · data/project.sqlite · FF&amp;E Installation workbook, ${FLOOR === '2' ? '2nd' : FLOOR === '3' ? '3rd' : '4th'} Floor tab · rulings D12, D18, D20, D22, D24, D26, D27, D28, D29, D30, D32, D33 in research/construction-os/DECISIONS.md.</p>
<div class="foot">Generated by research/floor2/build_floor2book.mjs --floor=${FLOOR} from the staged file. Staged for approval. Not live. Nothing deployed.</div>
</div>
`;
fs.mkdirSync(HERE, { recursive: true });
fs.writeFileSync(path.join(HERE, 'floor' + FLOOR + 'book.html'), html, 'utf8');
console.log('wrote research/floor' + FLOOR + '/floor' + FLOOR + 'book.html', html.length, 'bytes;', roomIds.length, 'rooms,', spaceRows.length, 'spaces,', lines.length, 'lines,', stricter.length, 'stricter lines');
