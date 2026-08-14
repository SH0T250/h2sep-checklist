// build_mep_refs.mjs — emit refs/refs-mep.json, the punch list's reference index.
//
// Input : tools/out/mep-refs/verified/*.json   one file per trade, each a list of
//         {itemIds[], code, kind, title, driveId?, sheetId?, snippet?, note?, evidence}
//         entries that survived an adversarial verification pass.
//         tools/out/mep-refs/devices-floor1-all.json  the device inventory to validate against.
// Output: refs/refs-mep.json                   { schema, generated, byItemId, byCode, stats }
//
//   node tools/build_mep_refs.mjs [--check]
//
// WHY AN ITEM-ID INDEX. The FF&E index (refs/refs-101.json) joins on the printed
// tag because every FF&E line has one. Punch lines mostly do not: 439 of floor 1's
// 762 lines print their code as an em dash, and several that DO print a mark print
// a composite the drawings never print as one string ("PTAC-2 / PTAC-1"). Joining
// on `code` would hang one cutsheet off 439 unrelated devices — a toilet spec on a
// sprinkler head. tools/build_mep.mjs already hashes each device to a stable id,
// md5(category|mark|label|where), deliberately WITHOUT the room number, so the same
// physical device carries the same id in every room it appears in. That id is the
// join key. `byCode` rides alongside for the marks that really are unique.
//
// WHAT THIS REFUSES TO EMIT (each of these has bitten this project already):
//   * an itemId that exists in no punch doc — a typo'd id is invisible at runtime,
//     it just silently shows no refs
//   * a ref with neither driveId nor snippet AND no note — an entry the crew can
//     tap that then does nothing
//   * a plan ref naming a snippet file that is not on disk
//   * one document claiming more devices than MAX_FANOUT without an explicit
//     `packageWide: true` — the folder-name trap (refs/MEP-PARKED.md) produced
//     exactly this shape: one faucet cutsheet spraying across a whole family
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const IN = join(HERE, 'out', 'mep-refs');
const VERIFIED = join(IN, 'verified');
const OUT = join(ROOT, 'refs', 'refs-mep.json');
const CHECK_ONLY = process.argv.includes('--check');

// A single document may legitimately cover a lot of devices — the fire sprinkler
// shop drawings really do cover every head in the building. Above this many it
// must SAY it is package-wide, so a runaway match is loud instead of plausible.
const MAX_FANOUT = 12;

const errors = [], warnings = [];
const fail = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

// ---------------------------------------------------------------------------
// Every device id that actually exists, across ALL floors — the index ships to
// the whole hotel even though this pass was scoped to floor 1, because the ids
// are room-independent and a floor-2 PTAC is the same PTAC.
// ---------------------------------------------------------------------------
const MEP_DIR = join(HERE, 'out', 'mep');
const knownIds = new Map(); // itemId -> {code, label, category, rooms:Set}
if (existsSync(MEP_DIR)) {
  for (const f of readdirSync(MEP_DIR).filter(n => /-MEP\.json$/.test(n))) {
    const d = JSON.parse(readFileSync(join(MEP_DIR, f), 'utf8'));
    for (const [id, it] of Object.entries(d.items || {})) {
      if (!knownIds.has(id)) {
        knownIds.set(id, { code: it.code || '', label: it.label || '', category: it.category || '', rooms: new Set() });
      }
      knownIds.get(id).rooms.add(String(d.number).replace(/-MEP$/, ''));
    }
  }
}
if (!knownIds.size) fail('no punch docs found under tools/out/mep — run tools/build_mep.mjs first');

// ---------------------------------------------------------------------------
// Load the verified match sets.
// ---------------------------------------------------------------------------
if (!existsSync(VERIFIED)) mkdirSync(VERIFIED, { recursive: true });
const files = readdirSync(VERIFIED).filter(n => n.endsWith('.json')).sort();
const entries = [];
for (const f of files) {
  let raw;
  try { raw = JSON.parse(readFileSync(join(VERIFIED, f), 'utf8')); }
  catch (e) { fail(`${f}: not valid JSON — ${e.message}`); continue; }
  const list = Array.isArray(raw) ? raw : (raw.refs || raw.verified || []);
  if (!Array.isArray(list)) { fail(`${f}: expected an array, or {refs:[...]} / {verified:[...]}`); continue; }
  list.forEach((e, i) => entries.push({ ...e, _src: `${f}#${i}` }));
}

// ---------------------------------------------------------------------------
// Validate + build.
// ---------------------------------------------------------------------------
const byItemId = {};
const byCode = {};
let kept = 0, dropped = 0;

// Same identity a ref has at runtime, so the same document attached twice to one
// device collapses instead of rendering two identical rows.
const refKey = (r) => `${r.kind}|${r.driveId || r.snippet || r.title}`;

for (const e of entries) {
  const where = e._src;
  if (e.kind !== 'submittal' && e.kind !== 'plan') { fail(`${where}: kind must be "submittal" or "plan", got ${JSON.stringify(e.kind)}`); dropped++; continue; }
  if (!e.title || typeof e.title !== 'string') { fail(`${where}: missing title`); dropped++; continue; }

  const ids = Array.isArray(e.itemIds) ? e.itemIds.filter(Boolean).map(String) : [];
  const codes = Array.isArray(e.codes) ? e.codes.filter(Boolean).map(String) : (e.code ? [String(e.code)] : []);
  if (!ids.length && !codes.length) { fail(`${where} (${e.title}): attaches to nothing — needs itemIds or codes`); dropped++; continue; }

  // Tappable-but-dead check.
  if (!e.driveId && !e.snippet && !e.note) {
    fail(`${where} (${e.title}): no driveId, no snippet and no note — the crew would tap it and get nothing`);
    dropped++; continue;
  }
  if (e.snippet) {
    const rel = String(e.snippet).replace(/^(\.\/)?/, '');
    if (!existsSync(join(ROOT, rel))) { fail(`${where} (${e.title}): snippet ${rel} is not on disk`); dropped++; continue; }
  }
  if (e.driveId && !/^[A-Za-z0-9_-]{20,}$/.test(String(e.driveId))) {
    fail(`${where} (${e.title}): driveId ${JSON.stringify(e.driveId)} is not a plausible Drive file id`);
    dropped++; continue;
  }

  const unknown = ids.filter(id => !knownIds.has(id));
  if (unknown.length) {
    fail(`${where} (${e.title}): ${unknown.length} itemId(s) exist in no punch doc — ${unknown.slice(0, 4).join(', ')}`);
    dropped++; continue;
  }
  if (ids.length > MAX_FANOUT && !e.packageWide) {
    fail(`${where} (${e.title}): claims ${ids.length} devices (> ${MAX_FANOUT}) without packageWide:true — `
       + `set it deliberately if this really is a package-level document`);
    dropped++; continue;
  }

  // The runtime ref: exactly the shape js/refs.js validates, nothing extra.
  // Provenance (evidence, who verified it) stays out of the shipped file — it
  // belongs in the verified/ inputs, which are committed alongside.
  const ref = { kind: e.kind, title: e.title };
  if (e.sheetId) ref.sheetId = String(e.sheetId);
  if (e.driveId) ref.driveId = String(e.driveId);
  if (e.snippet) ref.snippet = String(e.snippet).replace(/^(\.\/)?/, '');
  if (e.note) ref.note = String(e.note);

  const push = (bag, key) => {
    const list = (bag[key] ||= []);
    if (list.some(r => refKey(r) === refKey(ref))) return;
    list.push(ref);
  };
  ids.forEach(id => push(byItemId, id));
  codes.forEach(c => push(byCode, c));
  kept++;
}

// A code-level entry that shadows nothing is dead weight; a code that ALSO has
// per-item entries never fires (refs.js tries itemId first). Say so.
for (const code of Object.keys(byCode)) {
  const devs = [...knownIds.entries()].filter(([, v]) => v.code === code);
  if (!devs.length) { warn(`byCode["${code}"]: no punch line prints that mark — the entry will never fire`); continue; }
  if (devs.every(([id]) => byItemId[id])) {
    warn(`byCode["${code}"]: every device with that mark already has an itemId entry — the fallback is unreachable`);
  }
}

const covered = Object.keys(byItemId).length;
const stats = {
  documents: kept,
  devicesWithRefs: covered,
  devicesTotal: knownIds.size,
  coveragePct: knownIds.size ? Math.round(covered / knownIds.size * 100) : 0,
  codeFallbacks: Object.keys(byCode).length,
};

if (errors.length) {
  console.error(`\n${errors.length} ERROR${errors.length === 1 ? '' : 'S'} — nothing written:\n`);
  errors.forEach(e => console.error('  ✗ ' + e));
  process.exit(1);
}
warnings.forEach(w => console.warn('  ! ' + w));

const out = {
  schema: 'h2sep-mep-refs/1',
  // No timestamp: this file is committed, and a clock in it would make every
  // rebuild a diff even when nothing changed.
  generatedBy: 'tools/build_mep_refs.mjs',
  stats,
  byItemId,
  byCode,
};

if (CHECK_ONLY) {
  const cur = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  const next = JSON.stringify(out, null, 1) + '\n';
  if (cur !== next) { console.error('refs/refs-mep.json is STALE — re-run without --check'); process.exit(1); }
  console.log('refs/refs-mep.json is up to date');
} else {
  writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  console.log(`refs/refs-mep.json written — ${stats.documents} document links, `
    + `${stats.devicesWithRefs}/${stats.devicesTotal} devices carry refs (${stats.coveragePct}%), `
    + `${stats.codeFallbacks} code fallback${stats.codeFallbacks === 1 ? '' : 's'}`);
  if (dropped) console.log(`  (${dropped} entries dropped — see errors above)`);
}
