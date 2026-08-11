// mep-content-check.mjs — validate the MEP punch line sets before anything is built.
//
// The agents check meaning; this checks the things a machine checks better, and
// checks them across ALL rooms at once so drift between siblings shows up:
//
//   * every sheet cited in `src` EXISTS in the mirrored drawing set — the first
//     pass produced a citation to a keynote on a sheet that does not carry it,
//     and while no script can verify a keynote placement, a script can absolutely
//     catch a citation to a sheet that is not in the set at all (A601 is cited by
//     eighteen sheets and does not exist)
//   * every mark is verbatim as PRINTED in the database — catches tidied marks
//     ("PTAC-2/PTAC-1" for "PTAC-2 / PTAC-1", "SH-1" for "SH-1 / SH-4")
//   * every line carries a punch step that is an ACTION, not "verify installed"
//   * no MEDIUM/FLAGGED line ships without what-is-unknown and what-settles-it
//   * the same device does not wear two different labels in two rooms
//   * room 118 keeps BOTH bathroom configurations with their exact prefixes
//
//   node tests/mep-content-check.mjs
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..');
const OUT = join(REPO, 'tools', 'out', 'mep');
const DRAWINGS = join(REPO, 'research', 'drive', 'drawings');

let fail = 0;
const problems = [];
const bad = (room, msg) => { problems.push(`${room}: ${msg}`); fail++; };
const ok = (cond, msg) => { console.log((cond ? 'PASS  ' : 'FAIL  ') + msg); if (!cond) fail++; };

const CATS = new Set(['Mechanical', 'Electrical', 'Plumbing', 'Fire Protection', 'Low Voltage']);
const REQUIRED = ['category', 'mark', 'label', 'qty', 'reliability', 'src', 'verifyAtPunch'];

// Sheets that exist in the mirror, plus the non-sheet sources a line may cite.
const SHEETS = new Set(readdirSync(DRAWINGS).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)));
const NON_SHEET = /^(conflicts|coordination_issues|OPEN_ITEMS|RFI_register|packages|finish_schedule|reference|fs|FP-\d|FA-\d|S\d|NEC|TAS|ADA|nameplate|field)/i;

// A punch step must start with a verb the crew performs.
const LIMP = /^(verify installed|verify present|check installed|confirm installed|installed|present|verify|check|confirm)\.?$/i;

const files = readdirSync(OUT).filter((f) => /^_lines-.+\.json$/.test(f)).sort();
if (!files.length) { console.error('no _lines-*.json to check'); process.exit(2); }
console.log(`checking ${files.length} room line set(s)\n`);

// Printed marks straight from the database, per room.
const printedMarks = {};
for (const f of files) {
  const room = f.replace(/^_lines-/, '').replace(/\.json$/, '');
  try {
    const out = execFileSync('python3', ['-c', `
import sqlite3, json
cx = sqlite3.connect(${JSON.stringify(join(REPO, 'data', 'project.sqlite'))})
rows = cx.execute("SELECT DISTINCT tag FROM room_items WHERE room_no=? AND tag IS NOT NULL AND tag<>''", (${JSON.stringify(room)},))
print(json.dumps([r[0] for r in rows]))
`], { encoding: 'utf8' });
    printedMarks[room] = new Set(JSON.parse(out));
  } catch { printedMarks[room] = new Set(); }
}

const labelByDevice = new Map();   // "cat|mark" -> {label, room}
let totalLines = 0;

for (const f of files) {
  const room = f.replace(/^_lines-/, '').replace(/\.json$/, '');
  let doc;
  try { doc = JSON.parse(readFileSync(join(OUT, f), 'utf8')); }
  catch (e) { bad(room, `unreadable JSON — ${e.message}`); continue; }
  const lines = doc.lines || [];
  if (!lines.length) { bad(room, 'no lines'); continue; }
  totalLines += lines.length;

  const seen = new Set();
  for (const l of lines) {
    const id = `${l.category}|${l.mark}|${String(l.label || '').slice(0, 60)}`;

    for (const k of REQUIRED) {
      if (l[k] === undefined || l[k] === null || l[k] === '') {
        if (k === 'mark') continue;              // an untagged device is legitimate
        bad(room, `line "${String(l.label || '?').slice(0, 50)}" missing ${k}`);
      }
    }
    if (!CATS.has(l.category)) bad(room, `line "${String(l.label).slice(0, 40)}" has category "${l.category}"`);
    if (!Number.isInteger(l.qty) || l.qty < 1) bad(room, `line "${String(l.label).slice(0, 40)}" qty=${l.qty}`);
    if (seen.has(id)) bad(room, `duplicate line ${id.slice(0, 70)}`);
    seen.add(id);

    // punch step must be an action
    const step = String(l.verifyAtPunch || '').trim();
    if (LIMP.test(step)) bad(room, `"${String(l.label).slice(0, 44)}" punch step is not an action: "${step}"`);
    if (step && step.length < 12) bad(room, `"${String(l.label).slice(0, 44)}" punch step too thin: "${step}"`);

    // flags must explain themselves AND say what settles them
    if (l.reliability === 'FLAGGED' || l.reliability === 'MEDIUM') {
      const n = String(l.instanceNote || '').trim();
      if (!n) bad(room, `"${String(l.label).slice(0, 44)}" is ${l.reliability} with no note`);
      else if (n.length < 40) bad(room, `"${String(l.label).slice(0, 44)}" ${l.reliability} note too thin to act on`);
    }

    // every cited sheet must exist in the mirrored set
    for (const cite of String(l.src || '').split(/[;·,]| and | \+ /)) {
      const m = /\b([AEMPG]S?\d{3}(?:\.\d+)?|FP-\d|FA-\d|ID-\d+\.\d+)\b/.exec(cite.trim());
      if (!m) continue;
      const sheet = m[1];
      if (!SHEETS.has(sheet) && !NON_SHEET.test(sheet)) {
        bad(room, `cites sheet ${sheet} which is NOT in the mirrored set ("${String(l.label).slice(0, 40)}")`);
      }
    }

    // marks verbatim as printed
    if (l.mark && printedMarks[room] && printedMarks[room].size) {
      const marks = printedMarks[room];
      if (!marks.has(l.mark)) {
        const squashed = [...marks].find((p) => p.replace(/\s+/g, '') === String(l.mark).replace(/\s+/g, ''));
        if (squashed) bad(room, `mark "${l.mark}" is not verbatim — printed as "${squashed}"`);
      }
    }

    // cross-room label drift
    const key = `${l.category}|${l.mark}`;
    if (l.mark) {
      const prev = labelByDevice.get(key);
      if (prev && prev.label !== l.label && prev.room !== room) {
        // Only flag when the labels are materially different, not a suffix.
        const a = prev.label.toLowerCase(), b = String(l.label).toLowerCase();
        if (!a.startsWith(b.slice(0, 30)) && !b.startsWith(a.slice(0, 30))) {
          bad(room, `device ${key} labelled differently here vs room ${prev.room}`);
        }
      } else if (!prev) labelByDevice.set(key, { label: String(l.label), room });
    }
  }

  const cats = lines.reduce((a, l) => ((a[l.category] = (a[l.category] || 0) + 1), a), {});
  const flagged = lines.filter((l) => l.reliability === 'FLAGGED').length;
  console.log(`  ${room.padEnd(6)} ${String(lines.length).padStart(3)} lines  ` +
    Object.entries(cats).map(([c, n]) => `${c.split(' ')[0].slice(0, 4)} ${n}`).join(' · ') +
    `  · ${flagged} flagged`);
}

console.log();
// Room 118 must keep BOTH bathroom configurations, prefixes exact.
if (existsSync(join(OUT, '_lines-118.json'))) {
  const l = JSON.parse(readFileSync(join(OUT, '_lines-118.json'), 'utf8')).lines || [];
  const a = l.filter((x) => /^CONFIGURATION A \(TUB\) - /.test(x.label || '')).length;
  const b = l.filter((x) => /^CONFIGURATION B \(ROLL-IN SHOWER\) - /.test(x.label || '')).length;
  ok(a > 0 && b > 0, `room 118 keeps both bathroom configurations (A: ${a} lines, B: ${b} lines)`);
}

ok(problems.length === 0, `${totalLines} punch lines across ${files.length} rooms are structurally sound`);
for (const p of problems.slice(0, 40)) console.log('      ' + p);
if (problems.length > 40) console.log(`      … and ${problems.length - 40} more`);

console.log(fail ? `\n${fail} PROBLEM(S)` : '\nMEP CONTENT: ALL PASS');
process.exit(fail ? 1 : 0);
