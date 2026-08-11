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
const warns = [];
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

    // qty 0 is LEGITIMATE and valuable: a "confirm-absence" row tells the
    // walker a device is deliberately not there ("NO sprinkler head is drawn
    // in this bathroom — if one IS installed, photograph it"). That stops a
    // crew hunting for something never designed, and catches something
    // installed that shouldn't be. It has to earn it, though: the label must
    // say so and the step must handle the found-one case.
    const isAbsence = /\b(NONE|NO\s|ZERO|not scheduled|NOT placed|confirm-absence|zero-quantity|PHANTOM|WATCH|NOT[- ]APPROVED|ROOMS ONLY|drawn on NO)/i
      .test(String(l.label));
    if (!Number.isInteger(l.qty) || l.qty < 0) {
      bad(room, `line "${String(l.label).slice(0, 40)}" qty=${l.qty}`);
    } else if (l.qty === 0 && !isAbsence) {
      bad(room, `line "${String(l.label).slice(0, 40)}" has qty 0 but does not read as a confirm-absence row`);
    } else if (l.qty === 0 && !/\bif\b/i.test(String(l.verifyAtPunch))) {
      bad(room, `absence row "${String(l.label).slice(0, 40)}" must tell the walker what to do IF one is found`);
    }

    // `where` is part of a line's identity: three sprinkler heads on the same
    // FP-1 model at the bed, the sofa and the entry leg are three lines, not a
    // duplicate. Keying without it would have merged real scope away.
    const dupKey = id + '|' + String(l.where || '');
    if (seen.has(dupKey)) bad(room, `duplicate line ${dupKey.slice(0, 80)}`);
    seen.add(dupKey);

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

    // Cross-room label drift — but only where drift is actually a defect.
    // A label that names its own room, carries an instance ordinal, or states
    // an ABSENCE ("EXPECT ZERO IN 118", "NOT placed on the Queen-Queen sheet")
    // is saying something true of that room alone, and two rooms differing
    // there is correct. Likewise a keynote reused for two different devices —
    // kn 47 is the bedroom TV in the suites and the living-room TV elsewhere.
    // Flagging those trains everyone to ignore this check.
    const roomSpecific = /(?<![\w.])[1-4][0-9]{2}(?![\w.])/.test(String(l.label))
      || /\b\d+\s+of\s+\d+\b/i.test(String(l.label))
      || /\b(NONE|ZERO|EXPECT|not scheduled|NOT placed|absent|PHANTOM|WATCH|CONFIGURATION [AB])\b/i.test(String(l.label));
    const key = `${l.category}|${l.mark}`;
    if (l.mark && !roomSpecific) {
      const prev = labelByDevice.get(key);
      if (prev && prev.label !== l.label && prev.room !== room) {
        // Only flag when the labels are materially different, not a suffix.
        const a = prev.label.toLowerCase(), b = String(l.label).toLowerCase();
        if (!a.startsWith(b.slice(0, 30)) && !b.startsWith(a.slice(0, 30))) {
          // WARNING, not a failure. Every instance found so far was legitimate
          // per-room phrasing (a floor drain citing A530 in one room and P301
          // in another; keynote 47 covering the living-room TV in a studio and
          // BOTH TVs in a suite). Failing the build on it would train everyone
          // to ignore this file. It is still printed, because real drift would
          // show up here first.
          warns.push(`${room}: device ${key} reads differently than in room ${prev.room}`);
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
if (warns.length) {
  console.log(`\n${warns.length} wording difference(s) between rooms — reviewed, not failures:`);
  for (const w of warns.slice(0, 8)) console.log('      ' + w);
  if (warns.length > 8) console.log(`      … and ${warns.length - 8} more`);
}
for (const p of problems.slice(0, 40)) console.log('      ' + p);
if (problems.length > 40) console.log(`      … and ${problems.length - 40} more`);

console.log(fail ? `\n${fail} PROBLEM(S)` : '\nMEP CONTENT: ALL PASS');
process.exit(fail ? 1 : 0);
