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
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out', 'mep');
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

// Floor and room-type label come from the SAME room table the FF&E side reads,
// never from a table written here. A hand-kept dict covered floor 1 only, so
// every 2xx/3xx/4xx punch doc built with an empty typeLabel — and `floor` was
// hardcoded to 1, which would have stacked all 115 punch lists onto floor 1's
// screen and left floors 2-4 showing none. The punch doc must call room 302
// exactly what the FF&E doc calls it, and sit on the same floor.
const DB_META = JSON.parse(execFileSync('python3', ['-c', `
import sqlite3, json
cx = sqlite3.connect(${JSON.stringify(join(HERE, '..', 'data', 'project.sqlite'))})
rows = cx.execute("SELECT room_no, floor, display_label FROM rooms")
print(json.dumps({r[0]: {"floor": int(r[1]), "label": r[2] or ""} for r in rows}))
`], { encoding: 'utf8' }));

// The DB is not the authority on what a room is CALLED — the live FF&E doc is,
// because that is the name the crew reads on the room screen. They disagree:
// the DB calls 105 "Queen-Queen" where the live doc says "QQ Studio", and calls
// 103 "QQ Connecting" where the live doc says "QQ Studio Connector". Building
// from the DB put six punch docs under a name their own FF&E doc never uses.
// So live wins, from the newest backup (local, and literally the shipped
// data); the DB fills gaps and says so.
function liveMeta() {
  const files = readdirSync(OUT.replace(/\/mep$/, ''))
    .filter((f) => /^backup-.*\.json$/.test(f)).sort();
  if (!files.length) return {};
  const raw = JSON.parse(readFileSync(join(OUT.replace(/\/mep$/, ''), files[files.length - 1]), 'utf8'));
  const out = {};
  for (const d of (raw.collections && raw.collections.rooms) || []) {
    const id = d.name.split('/').pop();
    const f = d.fields || {};
    const type = (f.type && f.type.stringValue) || '';
    if (type.startsWith('space-') || type === 'mep-punch') continue;
    out[id] = {
      floor: Number((f.floor && f.floor.integerValue) || 0),
      label: (f.typeLabel && f.typeLabel.stringValue) || '',
    };
  }
  return out;
}
const LIVE_META = liveMeta();
const ROOM_META = { ...DB_META, ...LIVE_META };
console.log(`room names: ${Object.keys(LIVE_META).length} from the live FF&E docs, `
  + `${Object.keys(DB_META).filter((k) => !LIVE_META[k]).length} from the drawing database\n`);

const CAT_SORT = {
  'Mechanical': 1000, 'Electrical': 2000, 'Plumbing': 3000,
  'Fire Protection': 4000, 'Low Voltage': 5000,
};

const CLEAN = {
  checked: false, checkedAt: null, checkedAtLocal: null,
  checkedByName: '', checkedByUid: '', initials: '',
  issue: '', issueResolved: false, deleted: false,
};

// The LOCATION is part of a line's identity. Three sprinkler heads on one FP-1
// model at the bed, the sofa and the entry leg are three devices; so are the
// two PTAC units in a One Bedroom suite, one in the bedroom and one in the
// living room. Hashing without `where` collided them into a single id and the
// second unit vanished from the punch list.
const idFor = (cat, mark, label, where) =>
  createHash('md5').update(`${cat}|${mark}|${label}|${where || ''}`).digest('hex').slice(0, 12);

// ---------------------------------------------------------------------------
// ACCESSIBLE-ROOM BATHROOM CONFIGURATION (room 118 and its six siblings)
//
// The drawings carry TWO complete, mutually exclusive accessible bathrooms —
// Configuration A (ADA tub, bowed shower rod) and Configuration B (roll-in
// shower, straight rod, diverter valve, hand shower, glass enclosure) — and
// the conflict is OPEN in the set (conflicts.md A11 / B4.4,
// coordination_issues.md C-01, all seven accessible keys).
//
// On a materials list that ambiguity is survivable. On a PUNCH LIST it is a
// hazard: a walker can tick "bathtub installed" AND "roll-in shower installed"
// for one bathroom, and the room reports complete having verified a fixture
// that is not in it. So when both configurations appear, the builder injects
// ONE decision line ahead of them. That line is not invented scope — it is a
// procedural instruction that quotes the open conflict — and every config line
// is stamped with which set it belongs to and what to do with the other.
// ---------------------------------------------------------------------------
const CONFIG_RE = /^CONFIGURATION\s+([AB])\b/i;

function applyConfigRule(lines, room) {
  const tagged = lines.filter((l) => CONFIG_RE.test(l.label || ''));
  if (!tagged.length) return lines;
  const sets = new Set(tagged.map((l) => CONFIG_RE.exec(l.label)[1].toUpperCase()));
  if (sets.size < 2) return lines;           // only one configuration drawn — nothing to decide

  const nA = tagged.filter((l) => /^CONFIGURATION\s+A/i.test(l.label)).length;
  const nB = tagged.filter((l) => /^CONFIGURATION\s+B/i.test(l.label)).length;

  for (const l of tagged) {
    const which = CONFIG_RE.exec(l.label)[1].toUpperCase();
    const other = which === 'A' ? 'B' : 'A';
    l.reliability = 'FLAGGED';
    l.instanceNote = (l.instanceNote ? l.instanceNote + ' · ' : '')
      + `Belongs to CONFIGURATION ${which} only. If this room was built to `
      + `configuration ${other}, mark this line N/A — do not punch both sets.`;
    l.verifyAtPunch = `[CONFIG ${which}] ${l.verifyAtPunch}`;
  }

  const decision = {
    category: 'Plumbing',
    mark: '',
    label: 'BATHROOM CONFIGURATION — confirm which one was built before punching anything below',
    qty: 1,
    reliability: 'FLAGGED',
    instanceNote: `⚑ The drawings show room ${room} BOTH ways and the conflict is open: `
      + `CONFIGURATION A is an ADA tub (BT-1) with a bowed rod (${nA} line${nA === 1 ? '' : 's'}); `
      + `CONFIGURATION B is a roll-in shower (SH-1 / SH-3) with a straight rod, diverter valve, `
      + `hand shower and glass enclosure (${nB} line${nB === 1 ? '' : 's'}). `
      + `Recorded open in conflicts.md A11 / B4.4 and coordination_issues.md C-01 across all seven `
      + `accessible keys. Only one is in the room — punch that set and mark the other N/A.`,
    src: 'conflicts.md A11 / B4.4 · coordination_issues.md C-01',
    where: 'guest bathroom',
    verifyAtPunch: 'Look in the bathroom: tub or roll-in shower? Write it here, then punch only that set',
    origin: 'sheets-only',
  };
  // Ahead of every plumbing line so the decision is made before the fixtures.
  return [decision, ...lines];
}

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
    const id = idFor(cat, mark, l.label, l.where);
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

  const meta = ROOM_META[room];
  if (!meta) {
    console.error(`${room}: NOT IN THE ROOM TABLE — refusing to guess its floor or type`);
    problems++; continue;
  }
  const doc = {
    number: `${room}-MEP`,
    floor: meta.floor,
    type: 'mep-punch',
    typeLabel: meta.label,
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
