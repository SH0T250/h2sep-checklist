// build_mep.mjs — turn the reviewed MEP punch line sets into seedable room docs.
//
// Input : tools/out/mep/_lines-<room>.json   (one reviewed line set per room,
//         written from the extraction/reconcile/critique workflow)
// Output: tools/out/mep/<room>-MEP.json      (a doc seed_rooms.mjs can write)
//
// The doc id is "<room>-MEP" and its type slug is "mep-punch" — that slug is
// the ONLY thing telling the app this is a punch list rather than a guest room
// (js/util.js isMepDoc), so it is written here and asserted by the tests.
//
// Item ids are md5(category|mark|label) — deliberately NOT including the room
// number, so the same device carries the same id in every room. That is what
// lets the floor rollup total "PTAC" across 16 rooms without string-matching
// labels, and what makes re-running this script idempotent.
//
//   node tools/build_mep.mjs
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out', 'mep');
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

// Room type labels come from the room map, not from the reconciler — the punch
// doc must call room 118 exactly what the FF&E doc calls it or the two screens
// disagree on the same room's name.
const TYPE_LABEL = {
  '101': 'QQ Studio Connector', '103': 'QQ Studio Connector',
  '104': 'King Studio', '105': 'QQ Studio', '106': 'King Studio',
  '107': 'QQ Studio', '108': 'King Studio', '109': 'QQ Studio',
  '110': 'King Studio', '111': 'QQ Studio', '112': 'King Studio',
  '113': 'QQ Studio', '114': 'King Studio', '115': 'QQ Studio',
  '116': 'King Studio Connector', '118': 'King Studio Acc Mod',
};

const CAT_SORT = {
  'Mechanical': 1000, 'Electrical': 2000, 'Plumbing': 3000,
  'Fire Protection': 4000, 'Low Voltage': 5000,
};

const CLEAN = {
  checked: false, checkedAt: null, checkedAtLocal: null,
  checkedByName: '', checkedByUid: '', initials: '',
  issue: '', issueResolved: false, deleted: false,
};

const idFor = (cat, mark, label) =>
  createHash('md5').update(`${cat}|${mark}|${label}`).digest('hex').slice(0, 12);

let built = 0, problems = 0;
for (const f of readdirSync(OUT).filter((x) => /^_lines-.+\.json$/.test(x)).sort()) {
  const room = f.replace(/^_lines-/, '').replace(/\.json$/, '');
  const src = JSON.parse(readFileSync(join(OUT, f), 'utf8'));
  const lines = src.lines || [];
  if (!lines.length) { console.error(`${room}: NO LINES — refusing to build an empty punch doc`); problems++; continue; }

  const items = {};
  const perCat = {};
  for (const l of lines) {
    const cat = l.category;
    if (!CAT_SORT[cat]) { console.error(`${room}: unknown category "${cat}" on "${l.label}"`); problems++; continue; }
    // A MEDIUM/FLAGGED line with no explanation is the defect class Austin has
    // been burned by twice. Refuse rather than ship a bare flag.
    if ((l.reliability === 'FLAGGED' || l.reliability === 'MEDIUM') && !String(l.instanceNote || '').trim()) {
      console.error(`${room}: BARE FLAG — "${l.label}" is ${l.reliability} with no instanceNote`);
      problems++; continue;
    }
    if (!String(l.verifyAtPunch || '').trim()) {
      console.error(`${room}: NO PUNCH STEP — "${l.label}" has nothing for the walker to do`);
      problems++; continue;
    }
    const mark = l.mark || '';
    const id = idFor(cat, mark, l.label);
    if (items[id]) { console.error(`${room}: DUPLICATE line id for "${l.label}"`); problems++; continue; }
    perCat[cat] = (perCat[cat] || 0) + 1;
    items[id] = {
      category: cat,
      code: mark,
      label: l.label,
      qty: Number(l.qty) > 0 ? Number(l.qty) : 1,
      reliability: l.reliability || 'HIGH',
      instanceNote: l.instanceNote || '',
      src: l.src || '',
      where: l.where || '',
      verifyAtPunch: l.verifyAtPunch,
      derived: true,
      sort: CAT_SORT[cat] + perCat[cat] * 10,
      trade: '',
      ...CLEAN,
    };
  }

  const doc = {
    number: `${room}-MEP`,
    floor: 1,
    type: 'mep-punch',
    typeLabel: TYPE_LABEL[room] || '',
    items,
    notes: {},
    deleted: false,
    schemaV: 3,
  };
  writeFileSync(join(OUT, `${room}-MEP.json`), JSON.stringify(doc, null, 2) + '\n');
  const cats = Object.entries(perCat).sort((a, b) => CAT_SORT[a[0]] - CAT_SORT[b[0]])
    .map(([c, n]) => `${c.split(' ')[0]} ${n}`).join(' · ');
  console.log(`${room}-MEP: ${Object.keys(items).length} lines (${cats})`);
  built++;
}
console.log(`\nbuilt ${built} MEP punch doc(s); ${problems} problem(s)`);
process.exit(problems ? 1 : 0);
