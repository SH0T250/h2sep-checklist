// link_mep_plan_refs.mjs — turn each punch line's `src` citation into a real,
// openable reference to the sheet it came from.
//
// Input : tools/out/mep-refs/sheet-map.json   sheet id -> Drive file, each id read
//         off the sheet's own printed TITLE BLOCK (never inferred from a filename).
//         tools/out/mep/*-MEP.json            the punch docs, whose items carry `src`.
// Output: tools/out/mep-refs/verified/plan-sheets.json  (fed to build_mep_refs.mjs)
//         tools/out/mep-refs/plan-link-report.md        what matched and what did not
//
//   node tools/link_mep_plan_refs.mjs
//
// WHY THE FILENAME IS NOT THE SHEET ID. The Drive mirrors name plan files by
// ORDINAL — mech_sheet4.pdf is M301, mech_sheet9.pdf is M401. Trusting the
// ordinal would have sent every walker looking at a PTAC detail to the second
// floor's duct plan. Every id in sheet-map.json was confirmed by opening the
// PDF; this script only joins, it never guesses a sheet.
//
// WHAT IT REFUSES TO LINK: a sheet cited in `src` that is not in the map. E103
// is cited 25 times and the map holds E103.2 — a DIFFERENT sheet (Electrical
// Calculations vs Electrical Panels). Collapsing one onto the other because the
// prefix matches is exactly the class of error this whole pipeline exists to
// avoid, so unmapped citations are reported, not resolved.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const IN = join(HERE, 'out', 'mep-refs');
const OUTDIR = join(IN, 'verified');
if (!existsSync(OUTDIR)) mkdirSync(OUTDIR, { recursive: true });

const map = JSON.parse(readFileSync(join(IN, 'sheet-map.json'), 'utf8'));
const SHEETS = new Map(map.sheets.map(s => [s.sheetId, s]));

// The two fire submittals are 4-page shop-drawing SETS whose internal sheets are
// FP-1..FP-4 and FA-0..FA-3. A punch line cites the internal sheet; the crew has
// to open one PDF and turn to the right page, so the page is carried in the note
// rather than left for them to hunt. Page numbers were read off the PDFs.
const FIRE_SETS = {
  'FP-1': { set: 'FP', page: 1, of: 'Fire Sprinkler Shop Drawings (Texas Fire Services LLC)' },
  'FP-2': { set: 'FP', page: 2, of: 'Fire Sprinkler Shop Drawings (Texas Fire Services LLC)' },
  'FP-3': { set: 'FP', page: 3, of: 'Fire Sprinkler Shop Drawings (Texas Fire Services LLC)' },
  'FP-4': { set: 'FP', page: 4, of: 'Fire Sprinkler Shop Drawings (Texas Fire Services LLC)' },
  'FA-0': { set: 'FA', page: 1, of: 'Fire Alarm Shop Drawings (Security Integrated, Inc.)' },
  'FA-1': { set: 'FA', page: 2, of: 'Fire Alarm Shop Drawings (Security Integrated, Inc.)' },
  'FA-2': { set: 'FA', page: 3, of: 'Fire Alarm Shop Drawings (Security Integrated, Inc.)' },
  'FA-3': { set: 'FA', page: 4, of: 'Fire Alarm Shop Drawings (Security Integrated, Inc.)' },
};
const FIRE_DRIVE = {
  FP: (SHEETS.get('FP-1') || {}).pdfDriveId || '',
  FA: (SHEETS.get('FA-2') || {}).pdfDriveId || '',
};
// What a first-floor guestroom device should actually be pointed at within each
// set: the sheet that draws floor 1. FA-2 covers floors 1 AND 2 on one sheet, so
// the note has to say which half — the mapper flagged that explicitly.
const FIRE_FLOOR1 = {
  FP: { sheetId: 'FP-1', page: 1, note: 'Sprinkler shop drawings, page 1 of 4 — FP-1 is the 1ST FLOOR automatic sprinkler installation plan.' },
  FA: { sheetId: 'FA-2', page: 3, note: 'Fire alarm shop drawings, page 3 of 4 — sheet FA-2 draws floors 1 AND 2 side by side; read the 1st Floor half.' },
};

// M/E/P contract sheets: three letters of prefix, three digits, optional .N.
// Deliberately anchored so "1.28 GPF", "M11" and "kn 43" cannot match.
const SHEET_RE = /\b((?:M|E|P)[1-7]\d{2}(?:\.\d)?)\b/g;
const FIRE_RE = /\b(F[PA]-?[0-4])\b/g;

// ---------------------------------------------------------------------------
const devices = new Map(); // itemId -> {src, category, code, label, rooms:Set}
const MEP_DIR = join(HERE, 'out', 'mep');
for (const f of readdirSync(MEP_DIR).filter(n => /-MEP\.json$/.test(n))) {
  const d = JSON.parse(readFileSync(join(MEP_DIR, f), 'utf8'));
  for (const [id, it] of Object.entries(d.items || {})) {
    if (!devices.has(id)) {
      devices.set(id, { src: it.src || '', category: it.category || '', code: it.code || '',
                        label: it.label || '', floors: new Set(), rooms: new Set() });
    }
    devices.get(id).floors.add(Number(d.floor));
    devices.get(id).rooms.add(String(d.number).replace(/-MEP$/, ''));
  }
}

const bySheet = new Map();      // sheetId -> Set(itemId)
const unmapped = new Map();     // sheetId -> count
let devicesLinked = 0, devicesUnlinked = 0;
const unlinkedRows = [];

for (const [id, d] of devices) {
  let linked = 0;
  const seen = new Set();

  for (const m of d.src.matchAll(SHEET_RE)) {
    const sid = m[1];
    if (seen.has(sid)) continue;
    seen.add(sid);
    if (!SHEETS.has(sid)) { unmapped.set(sid, (unmapped.get(sid) || 0) + 1); continue; }
    if (!bySheet.has(sid)) bySheet.set(sid, new Set());
    bySheet.get(sid).add(id);
    linked++;
  }

  // Fire sets: any FP-* / FA-* citation resolves to the one PDF for that set,
  // pointed at the sheet that draws THIS device's floor. Every punch device in
  // this pass is a guestroom device, so a device living only on floor 1 gets
  // floor 1's sheet; a device carried on several floors gets the set's own
  // first-floor sheet plus a note, because one ref cannot name four pages.
  for (const m of d.src.matchAll(FIRE_RE)) {
    const raw = m[1].replace(/^(F[PA])-?/, '$1-');
    const info = FIRE_SETS[raw];
    if (!info || !FIRE_DRIVE[info.set]) continue;
    const key = 'SET:' + info.set;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!bySheet.has(key)) bySheet.set(key, new Set());
    bySheet.get(key).add(id);
    linked++;
  }

  if (linked) devicesLinked++;
  else { devicesUnlinked++; unlinkedRows.push(d); }
}

// ---------------------------------------------------------------------------
const entries = [];
for (const [key, ids] of [...bySheet.entries()].sort()) {
  if (key.startsWith('SET:')) {
    const set = key.slice(4);
    const f1 = FIRE_FLOOR1[set];
    entries.push({
      kind: 'submittal',              // a shop drawing opens as a document, not a snippet
      sheetId: f1.sheetId,
      title: `${FIRE_SETS[f1.sheetId].of} — ${f1.sheetId}, page ${f1.page}`,
      driveId: FIRE_DRIVE[set],
      note: f1.note,
      itemIds: [...ids].sort(),
      packageWide: true,
      evidence: 'sheet-map.json: page order read off the PDF itself, sheet stamps FP-1..FP-4 / FA-0..FA-3',
    });
    continue;
  }
  const s = SHEETS.get(key);
  entries.push({
    kind: 'plan',
    sheetId: s.sheetId,
    title: `${s.title} — sheet ${s.sheetId}`,
    driveId: s.pdfDriveId,
    itemIds: [...ids].sort(),
    packageWide: true,              // a contract sheet legitimately draws many devices
    evidence: s.howConfirmed,
  });
}

writeFileSync(join(OUTDIR, 'plan-sheets.json'), JSON.stringify(entries, null, 1) + '\n');

// ---------------------------------------------------------------------------
const lines = [];
lines.push('# MEP punch — plan-sheet reference linking\n');
lines.push('Generated by `tools/link_mep_plan_refs.mjs` from `sheet-map.json` (every sheet id read');
lines.push('off its own printed title block) joined to each punch line\'s `src` citation.\n');
lines.push(`**${devicesLinked} of ${devices.size} distinct devices** now carry at least one openable`);
lines.push(`sheet reference; ${devicesUnlinked} cite no sheet this map holds.\n`);
lines.push('| Sheet | Title | Devices | Drive |');
lines.push('|---|---|---:|---|');
for (const e of entries) {
  lines.push(`| ${e.sheetId} | ${e.title.replace(/\|/g, '/')} | ${e.itemIds.length} | \`${e.driveId}\` |`);
}
if (unmapped.size) {
  lines.push('\n## Cited but NOT in the sheet map — deliberately unresolved\n');
  lines.push('These sheet ids appear in punch-line `src` strings but no confirmed Drive file');
  lines.push('was located for them. They are left unlinked rather than guessed at: `E103`');
  lines.push('(Electrical Calculations) is not `E103.2` (Electrical Panels), and pointing a');
  lines.push('walker at the wrong one is worse than pointing them at nothing.\n');
  lines.push('| Sheet | Cited by |');
  lines.push('|---|---:|');
  for (const [sid, n] of [...unmapped.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${sid} | ${n} device${n === 1 ? '' : 's'} |`);
  }
}
if (unlinkedRows.length) {
  lines.push('\n## Devices with no linkable sheet\n');
  lines.push('| Trade | Mark | Line | src |');
  lines.push('|---|---|---|---|');
  for (const d of unlinkedRows.slice(0, 60)) {
    lines.push(`| ${d.category} | ${d.code || '—'} | ${d.label.slice(0, 70).replace(/\|/g, '/')} `
      + `| ${(d.src || '(none)').slice(0, 90).replace(/\|/g, '/')} |`);
  }
  if (unlinkedRows.length > 60) lines.push(`\n…and ${unlinkedRows.length - 60} more.`);
}
writeFileSync(join(IN, 'plan-link-report.md'), lines.join('\n') + '\n');

console.log(`plan refs: ${entries.length} documents, ${devicesLinked}/${devices.size} devices linked, `
  + `${devicesUnlinked} unlinked, ${unmapped.size} sheet ids cited but unmapped`);
for (const e of entries) console.log(`  ${e.sheetId.padEnd(8)} ${String(e.itemIds.length).padStart(4)} devices`);
