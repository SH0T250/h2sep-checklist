/* WHAT THIS FILE IS FOR
 *
 * Three rounds of independent checks kept failing this package on the same
 * thing: PROSE THAT OVER-PROMISES. A note said "no row of this room cites it"
 * and a row did. A meta rule said "every line carries a SOURCE sentence" and 25
 * lines did not. A note said "the line ships at the WORST of them, HIGH" beside
 * a field reading FLAGGED. None of those were data errors - the data was right
 * and the sentence about it was wrong.
 *
 * So this file is the guard on the SENTENCES. It walks every instanceNote and
 * every room note in platform/data/ref-rooms-staged.json and fails on:
 *
 *   1  ROOM-WIDE NEGATIVES.  Any sentence that asserts something about EVERY row
 *      of a room ("no row of this room cites it", "this room has no ... of its
 *      own", "nothing corroborates"). A claim like that is the hardest kind to
 *      keep true through a rebuild and it is never necessary: naming what IS
 *      cited, and by which row, says the same thing and cannot rot.
 *
 *   2  A META CLAIM WITH NOTHING BEHIND IT.  Every claim in meta is listed below
 *      with the check that proves it. A claim with no check, or a check that
 *      fails, stops the run. Adding a sentence to meta means adding its proof
 *      here.
 *
 *   3  A NOTE THAT RESTATES A FIELD.  A note may not print a reliability word or
 *      a "ships qty N" for its own line, because the field beside it already
 *      says that and the two can drift apart. Quoting a ROW's reliability
 *      ("ITM-0043 [HIGH]") is fine - that is the database's reading of a row,
 *      not a claim about this line's field.
 *
 *   4  A LINE WITH NO SOURCE SENTENCE, or an empty note.
 *
 * Usage:  node platform/tools/assert_ref_claims.mjs
 *         node platform/tools/assert_ref_claims.mjs --seed platform/data/other.json
 *
 * It READS. It writes nothing, anywhere.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const argv = process.argv.slice(2);
const flagOf = (n, d) => { const i = argv.indexOf(n); return i === -1 ? d : argv[i + 1]; };
const SEED = resolve(REPO, flagOf('--seed', 'platform/data/ref-rooms-staged.json'));
const GEN = resolve(REPO, 'platform/tools/build_ref_rooms.mjs');
const CARRY = resolve(REPO, 'platform/tools/carry_ref_state.mjs');

if (!existsSync(SEED)) { process.stderr.write('no seed at ' + SEED + '\n'); process.exit(2); }
const seed = JSON.parse(readFileSync(SEED, 'utf8'));
const gen = readFileSync(GEN, 'utf8');
const carry = existsSync(CARRY) ? readFileSync(CARRY, 'utf8') : '';

const failures = [];
const fail = (where, why) => failures.push({ where, why });
let checks = 0;
const W = (s) => process.stdout.write(s);

/* Every piece of prose this package ships, with an address. */
const prose = [];
/* The room notes THIS PACKAGE authors. Anything else in doc.notes was written
 * by a person in the crew app and carried in by carry_ref_state.mjs; a crew
 * member's own words are evidence, not a claim this tool makes, and they are
 * not rewritten to satisfy a rule of ours. They are counted and named, never
 * failed on. */
const GENERATOR_NOTE_KEYS = new Set(['n_type', 'n_dbroom', 'n_config', 'n_gategaps', 'n_gaps', 'n_d22',
  'n_conflicts', 'n_rulings', 'n_typearea', 'n_ptac2']);
const crewNotes = [];
for (const [docId, doc] of Object.entries(seed.docs || {})) {
  for (const [k, it] of Object.entries(doc.items || {})) {
    prose.push({ where: docId + '/' + k, kind: 'item', text: String(it.instanceNote || ''), item: it });
  }
  for (const [k, n] of Object.entries(doc.notes || {})) {
    if (!GENERATOR_NOTE_KEYS.has(k)) { crewNotes.push(docId + '/' + k); continue; }
    prose.push({ where: docId + '/note ' + k, kind: 'note', text: String(n.text || '') });
  }
}
for (const [k, v] of Object.entries(seed.meta || {})) {
  if (typeof v === 'string') prose.push({ where: 'meta.' + k, kind: 'meta', text: v });
}

/* ---------------------------------------------------------- 1  NO NEGATIVES */

/* A room-wide negative asserts something about EVERY row of a room. Each
 * pattern below was written off a sentence a verifier actually caught. */
const ROOM_WIDE_NEGATIVE = [
  [/\bno\s+(?:\w+\s+){0,3}row\s+of\s+th(?:is|e)\s+room/i, 'no row of this room ...'],
  [/\bth(?:is|e)\s+room\s+has\s+no\b/i, 'this room has no ...'],
  [/\bth(?:is|e)\s+room\s+carries\s+no\b/i, 'this room carries no ...'],
  [/\bth(?:is|e)\s+room\s+holds\s+no\b/i, 'this room holds no ...'],
  [/\bno\s+row\s+of\s+its\s+own\b/i, 'no row of its own'],
  [/\bhas\s+NO\s+[A-Za-z0-9 /&.'-]{0,40}\s*row\b/i, 'has NO ... row'],
  [/\bnothing\s+corroborates\b/i, 'nothing corroborates'],
  [/\bnot\s+corroborated\s+anywhere\b/i, 'NOT corroborated anywhere'],
  [/\broom\s+\d{3}\s+has\s+no\s+line\b/i, 'room N has no line'],
  [/\bnothing\s+here\s+was\s+borrowed\b/i, 'nothing here was borrowed'],
  [/\bcarries\s+no\s+[A-Za-z0-9 /&.'-]{0,30}\s*row\b/i, 'carries no ... row'],
  [/\bno\s+source\s+of\s+its\s+own\b/i, 'no source of its own'],
];
for (const p of prose) {
  for (const [re, label] of ROOM_WIDE_NEGATIVE) {
    checks++;
    const m = re.exec(p.text);
    if (m) {
      fail(p.where, 'ROOM-WIDE NEGATIVE [' + label + ']: ...' +
        p.text.slice(Math.max(0, m.index - 70), m.index + 130).replace(/\s+/g, ' ') + '...');
      break;
    }
  }
}

/* ---------------------------------------- 2  EVERY META CLAIM HAS ITS PROOF */

const items = () => Object.entries(seed.docs).flatMap(([d, doc]) =>
  Object.entries(doc.items).map(([k, it]) => [d + '/' + k, it, d]));
const notes = () => Object.entries(seed.docs).flatMap(([d, doc]) =>
  Object.entries(doc.notes || {}).map(([k, n]) => [d + '/' + k, n, d]));
const genHas = (needle) => gen.includes(needle);

/* Each entry: a phrase that must appear in the named meta field, and a check
 * that proves it against the code or the shipped data. Returns '' for pass or
 * the reason it failed. */
const META_CLAIMS = [
  ['donorRule', 'Every line on both documents carries a SOURCE sentence',
    () => {
      const bad = items().filter(([, it]) => !/(^|\s)SOURCE\./.test(String(it.instanceNote || '')));
      return bad.length ? bad.length + ' line(s) carry none: ' + bad.slice(0, 5).map((x) => x[0]).join(', ') : '';
    }],
  ['donorRule', 'assertDocRules() refuses to write a line without one',
    () => (genHas("': no SOURCE sentence - meta.donorRule promises one on every line'")
      ? '' : 'assertDocRules() has no SOURCE-sentence check')],
  ['donorRule', 'A NOTE NEVER RESTATES A VALUE ANOTHER FIELD CARRIES',
    () => {
      /* proved by check 3 below; here we only prove the code stopped printing
       * the two sentences that used to do it. */
      const gone = !genHas("'the WORST of them, ' + ownWorst") && !genHas("'the line ships the worst of them, '");
      return gone ? '' : 'the generator still prints a shipped-reliability sentence into a note';
    }],
  ['donorRule', 'where this room has rows of the donor\'s mark family the mark is read off them and where it has ' +
    'none the mark field is left EMPTY',
    () => {
      const fp = items().filter(([w]) => w.endsWith('/fp_heads_a'));
      const bad = fp.filter(([, it]) => it.code !== '');
      return bad.length ? 'fp_heads_a still carries a mark on ' + bad.map((x) => x[0]).join(', ') : '';
    }],
  ['citationRule', 'labelled UNVERIFIED for this room rather than asserted',
    () => (genHas("'. UNVERIFIED for this room: '") ? '' : 'composeMepCitation() prints no UNVERIFIED label')],
  ['citationRule', 'KEPT where this room\'s own row names it outright',
    () => (genHas('const named0 = still0.filter') && gen.indexOf('const named0 = still0.filter') <
      gen.indexOf("const range = ownSrcs.find((o) => citesSheet(o, id) && sib && citesSheet(o, sib));")
      ? '' : 'floorTrueCitation() does not test the own-row name before the range re-point')],
  ['citationRule', 'corroborated NUMBER BY NUMBER against EVERY row of this room',
    () => (genHas('floorTrueCitation(item.src, roomFloor, rows, floorIdx') &&
      genHas('composeMepCitation(d.src, mine, roomSheet, isConnecting, numbering, donorSheet, rows)')
      ? '' : 'a citation pass is still handed the support set of one line instead of every row')],
  ['citationRule', 'replaced by room_types.bath_sheet for THIS type with NO number on it, marked UNVERIFIED',
    () => (genHas('function bathTrueCitation(') && genHas('THE BATH-SHEET REFERENCE IS UNVERIFIED FOR THIS ROOM TYPE')
      ? '' : 'there is no bath-sheet pass')],
  ['citationRule', 'where the row\'s own source_sheet carries the entry for this type that fuller citation is what ' +
    'the line cites',
    () => (genHas('function ffeTypeCitation(') ? '' : 'there is no FF&E type-sheet pass')],
  ['citationRule', 'a mark merely PRINTED by a cited schedule is left alone with this room\'s own marks in that ' +
    'family named beside it',
    () => (genHas('function citedMarkNote(') ? '' : 'there is no cited-mark pass')],
  ['citationRule', 'every MEP line says so in its SOURCE sentence',
    () => {
      const mep = items().filter(([w]) => /-MEP\//.test(w));
      const bad = mep.filter(([, it]) => !/(^|\s)SOURCE\./.test(String(it.instanceNote || '')));
      return bad.length ? bad.length + ' MEP line(s) carry no SOURCE sentence' : '';
    }],
  ['conflictPolicy', 'An entry reaches A LINE on two of those three',
    () => (genHas('const conflictsOnLine = (hits, codes, rowIds) =>') &&
      genHas('h.rows.some((r) => ids.includes(r))') ? '' : 'conflictsOnLine() does not test the row citation')],
  ['conflictPolicy', 'a key-only match rides in n_conflicts and on no line',
    () => (genHas('const conflictsOnLine = (hits, codes, rowIds) =>') &&
      !/conflictsOnLine[\s\S]{0,400}h\.keys/.test(gen) ? '' : 'conflictsOnLine() tests h.keys')],
  ['conflictPolicy', 'n_gategaps prints from the matcher\'s own word list',
    () => (genHas("CONFLICT_WORDS.map((w) => '\"' + w + '\"').join(', ')") ? ''
      : 'n_gategaps does not print CONFLICT_WORDS')],
  ['conflictPolicy', 'matched one mark at a time',
    () => (genHas('function splitMarks(code)') ? '' : 'splitMarks() is gone')],
  ['recipeSource', 'proved byte-faithful on every run by assertRecipeByteFaithful()',
    () => (genHas('function assertRecipeByteFaithful()') && genHas('  const fid = assertRecipeByteFaithful();')
      ? '' : 'assertRecipeByteFaithful() is not called by main()')],
  ['fieldState', 'born clean', 'optional',
    /* carry_ref_state.mjs rewrites this field after it carries the crew's work,
     * so the claim is only checked in the shape it has BEFORE the carry. */
    () => {
      if (!/born clean/.test(String(seed.meta.fieldState || ''))) return 'SKIP';
      const bad = items().filter(([, it]) => it.checked !== false || it.initials !== '' ||
        it.checkedAt !== null || it.issue !== '');
      return bad.length ? bad.length + ' line(s) are not born clean' : '';
    }],
  /* OPTIONAL: this sentence only exists after platform/tools/carry_ref_state.mjs
   * has run. Before the carry the field says "born clean" and there is nothing
   * to reconcile, so the claim is checked when it is there and skipped when it
   * is not - never waved through once it IS there. */
  ['fieldState', 'Reconciliation is exact', 'optional',
    () => {
      const t = String(seed.meta.fieldState || '');
      if (!/Reconciliation is exact/.test(t)) return 'SKIP';
      const m = /crew (\d+) check\(s\) = (\d+) on live lines \+ (\d+) with no line/.exec(t);
      const m2 = /crew (\d+) open issue\(s\) = (\d+) on live lines \+ (\d+) with no line/.exec(t);
      if (!m || !m2) return 'the fieldState sentence does not state the reconciliation it claims';
      const live = items().filter(([, it]) => !it.deleted);
      const checked = live.filter(([, it]) => it.checked).length;
      const open = live.filter(([, it]) => it.issue && String(it.issue).trim() && !it.issueResolved).length;
      const bits = [];
      if (Number(m[1]) !== Number(m[2]) + Number(m[3])) bits.push('the check identity does not hold');
      if (Number(m2[1]) !== Number(m2[2]) + Number(m2[3])) bits.push('the issue identity does not hold');
      if (checked !== Number(m[2])) bits.push('meta says ' + m[2] + ' checks on live lines, the seed holds ' + checked);
      if (open !== Number(m2[2])) bits.push('meta says ' + m2[2] + ' open issues on live lines, the seed holds ' + open);
      return bits.join('; ');
    }],
  ['writesNothingElse', 'floor1-staged.json, slice-f1.json and the crew Firestore collection are READ ONLY',
    () => {
      const okGen = genHas('const NEVER_WRITE = [SLICE_PATH, DONOR_PATH, RECIPE_PATH,') &&
        genHas('function snapshotProtectedFiles()');
      /* The anonymous sign-in is a POST to identitytoolkit, which is not the
       * crew collection. What must never exist is a write to Firestore. */
      const writesFirestore = /method:\s*'(PATCH|PUT|DELETE)'/.test(carry) ||
        carry.split('\n').some((l) => /method:\s*'POST'/.test(l) && /BASE|firestore/.test(l));
      const okCarry = !carry || (!writesFirestore &&
        carry.includes("fetch(url, { method: 'GET', headers })") &&
        carry.includes('it can only ever issue a GET'));
      return okGen && okCarry ? '' : 'a protected-file guard is missing (' +
        (okGen ? '' : 'build; ') + (okCarry ? '' : 'carry') + ')';
    }],
  ['stampIsConstant', '',
    () => (seed.meta.stampIsConstant === true && genHas("const DEFAULT_STAMP = '") ? '' : 'the stamp is not constant')],
  ['rulingsApplied', 'D29',
    () => {
      const bsq = items().filter(([w]) => w.endsWith('/bsq_a'));
      if (bsq.length !== 1) return 'D29 is claimed but ' + bsq.length + ' bsq_a line(s) exist';
      const [w, it] = bsq[0];
      if (!w.startsWith('238/')) return 'bsq_a landed on ' + w + ', not on the QQ Acc. key';
      if (it.qty !== 2 || it.code !== 'BS-Q') return 'bsq_a does not carry D29\'s ruled tag and count';
      return '';
    }],
];

for (const entry of META_CLAIMS) {
  const [field, phrase] = entry;
  const optional = entry.length === 4 && entry[2] === 'optional';
  const prove = entry[entry.length - 1];
  checks++;
  const text = String((seed.meta || {})[field] || '');
  if (!text) { fail('meta.' + field, 'the field this claim belongs to is missing'); continue; }
  if (phrase && !text.includes(phrase)) {
    if (optional) continue;
    fail('meta.' + field, 'the claim checked here is no longer in the field: ' + JSON.stringify(phrase.slice(0, 70)));
    continue;
  }
  const why = prove();
  if (why && why !== 'SKIP') fail('meta.' + field, 'CLAIM NOT PROVED - "' + phrase.slice(0, 60) + '": ' + why);
}

/* Nothing in meta may be a claim with no entry above. Every sentence-bearing
 * meta field has to be listed, so a new rule cannot arrive unchecked. */
const META_FIELDS_WITH_CLAIMS = new Set(META_CLAIMS.map(([f]) => f));
const META_DESCRIPTIVE = new Set(['generator', 'project', 'purpose', 'builtAt', 'shapeSource', 'packageSource',
  'mepSource', 'redaction', 'fieldStateCarriedAt']);
for (const [k, v] of Object.entries(seed.meta || {})) {
  if (typeof v !== 'string') continue;
  checks++;
  if (!META_FIELDS_WITH_CLAIMS.has(k) && !META_DESCRIPTIVE.has(k)) {
    fail('meta.' + k, 'a meta field with prose in it and no proof listed in assert_ref_claims.mjs');
  }
}

/* ------------------------------------------- 3  A NOTE MAY NOT RESTATE A FIELD */

/* "ITM-0043 [HIGH]" and "row(s) read HIGH" are quotes of a ROW. "the line
 * ships at ... HIGH" and "this line ships qty 3" are claims about the fields on
 * THIS line, and those are the ones that drift. */
const FIELD_RESTATEMENT = [
  [/\bthis line ships (?:at )?(?:the WORST of them, )?(HIGH|MEDIUM|FLAGGED)\b/i, 'reliability'],
  [/\bthe line ships (?:at )?(?:the WORST of them, )?(HIGH|MEDIUM|FLAGGED)\b/i, 'reliability'],
  [/\bships the worst of them, (HIGH|MEDIUM|FLAGGED)\b/i, 'reliability'],
  [/\bthe reliability on this line is (HIGH|MEDIUM|FLAGGED)\b/i, 'reliability'],
];
for (const p of prose) {
  if (p.kind !== 'item') continue;
  for (const [re, field] of FIELD_RESTATEMENT) {
    checks++;
    const m = re.exec(p.text);
    if (!m) continue;
    fail(p.where, 'NOTE RESTATES THE ' + field.toUpperCase() + ' FIELD (' + m[1] + ', field reads ' +
      p.item.reliability + '): ...' + p.text.slice(Math.max(0, m.index - 60), m.index + 90).replace(/\s+/g, ' ') + '...');
    break;
  }
  /* A qty claim has to agree with the qty field wherever it is made. */
  const q = /\bships qty (\d+)\b/i.exec(p.text);
  checks++;
  if (q && Number(q[1]) !== Number(p.item.qty)) {
    fail(p.where, 'NOTE RESTATES THE QTY FIELD (' + q[1] + ', field reads ' + p.item.qty + ')');
  }
}

/* ------------------------------ 4  A SOURCE SENTENCE AND SOMETHING TO READ */

for (const p of prose) {
  if (p.kind !== 'item') continue;
  checks++;
  if (!p.text.trim()) { fail(p.where, 'EMPTY instanceNote - the line explains nothing'); continue; }
  if (!/(^|\s)SOURCE\./.test(p.text)) fail(p.where, 'no SOURCE sentence on the line');
}

/* --------------------------------------------- 5  A HEADER DESCRIBES ITS LIST */

/* n_gategaps used to be headed "ROWS THAT CANNOT CARRY A CHECKLIST LINE" while
 * one of the rows it listed had a line. A header is a claim like any other. */
for (const [where, n] of notes()) {
  if (!/\/n_gategaps$/.test(where)) continue;
  checks++;
  const t = String(n.text || '');
  if (/CANNOT CARRY A CHECKLIST LINE/.test(t)) {
    fail(where, 'the header claims the rows below cannot carry a line; carry_ref_state.mjs rebuilds some of them ' +
      'as lines');
  }
  checks++;
  if (/carry_ref_state\.mjs REBUILDS a gated row as a line/.test(t) &&
      !(carry.includes('function rebuildFromDb(') && carry.includes('pdoc.items[key] = rebuilt;'))) {
    fail(where, 'the note says carry_ref_state.mjs rebuilds a gated row as a line; that tool does not');
  }
  const m = /(\d+) row\(s\) of room \d+ sit in a category outside/.exec(t);
  if (!m) fail(where, 'the header does not state how many rows it heads');
  else {
    const listed = (t.match(/\bITM-\d{4}\b/g) || []).length;
    if (listed !== Number(m[1])) {
      fail(where, 'the header says ' + m[1] + ' row(s) and the list holds ' + listed);
    }
  }
}

/* ------------------------------------------------------------------- report */

W('\nCLAIM ASSERTIONS  ' + SEED.replace(REPO + '/', '') + '\n' + '='.repeat(100) + '\n');
W('  ' + prose.length + ' pieces of prose walked (' +
  prose.filter((p) => p.kind === 'item').length + ' line notes, ' +
  prose.filter((p) => p.kind === 'note').length + ' room notes, ' +
  prose.filter((p) => p.kind === 'meta').length + ' meta fields)\n');
if (crewNotes.length) {
  W('  ' + crewNotes.length + ' crew-authored note(s) left alone - a crew member\'s own words are evidence, not ' +
    'a claim of ours: ' + crewNotes.join(', ') + '\n');
}
W('  ' + checks + ' assertions run\n');
W('  ' + META_CLAIMS.length + ' meta claims, each tied to a check against the generator or the shipped data\n\n');
if (!failures.length) {
  W('PASS - no room-wide negative, no meta claim without a proof, no note restating a field,\n');
  W('       no line without a SOURCE sentence, no header that miscounts its own list.\n\n');
  process.exit(0);
}
W('FAIL - ' + failures.length + ' claim(s) the package cannot back:\n\n');
for (const f of failures) W('  ' + f.where + '\n      ' + f.why + '\n');
W('\n');
process.exit(1);
