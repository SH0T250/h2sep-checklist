// Round ledger for the render versus photograph loop.
//
// One JSON file per view at research/king-studio/photo-loop/ledger/<view>.json,
// committed, text only. Shape:
//   { view, photo, rounds: [ { round, renderJpg, critics: [ {pick, correct,
//     confidence, tells, biggestGap, secondaryGaps, realismScore, wowed} ],
//     fix: { changed, commit, notes }, status } ] }
// status is one of spotted, fooled, wowed, pending.
//
// Nothing is ever dropped: append adds a critic, fix replaces only the fix
// block of one round, status replaces only the status. Rounds are kept in
// ascending order.
//
// Usage:
//   node platform/tools/photoreal/ledger.mjs append --view bed --round 3 --json '<verdict json>' [--render-jpg <path>] [--key <key.json>]
//   node platform/tools/photoreal/ledger.mjs fix    --view bed --round 3 --json '<fix json>'
//   node platform/tools/photoreal/ledger.mjs status --view bed --round 3 --status spotted
//   node platform/tools/photoreal/ledger.mjs show   --view bed
//   node platform/tools/photoreal/ledger.mjs seed   (writes any missing ledger file with an empty rounds array)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..', '..');
export const LEDGER_DIR = resolve(repo, 'research/king-studio/photo-loop/ledger');

// The seven judged views and the photograph each is paired with (file name only).
export const VIEWS = {
  'entry': '20260812_141012.jpg',
  'lounge': '20260812_141158.jpg',
  'bed': '20260812_141100.jpg',
  'working': '20260812_141016.jpg',
  'kitchen': '20260812_141218.jpg',
  'bath-vanity': '20260812_141251.jpg',
  'bath-shower': '20260812_141304.jpg',
};
export const STATUSES = ['spotted', 'fooled', 'wowed', 'pending'];

const args = {};
const positional = [];
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) {
    const eq = a.indexOf('=');
    if (eq > 0) args[a.slice(2, eq)] = a.slice(eq + 1);
    else { args[a.slice(2)] = process.argv[i + 1]; i++; }
  } else positional.push(a);
}
const cmd = positional[0];

export function ledgerPath(view) { return resolve(LEDGER_DIR, `${view}.json`); }

export function load(view) {
  const p = ledgerPath(view);
  if (existsSync(p)) {
    const l = JSON.parse(readFileSync(p, 'utf8'));
    if (!Array.isArray(l.rounds)) l.rounds = [];
    return l;
  }
  return { view, photo: VIEWS[view] || '', rounds: [] };
}

export function save(l) {
  mkdirSync(LEDGER_DIR, { recursive: true });
  l.rounds.sort((a, b) => a.round - b.round);
  writeFileSync(ledgerPath(l.view), JSON.stringify(l, null, 1) + '\n');
}

function getRound(l, n, create) {
  let r = l.rounds.find(x => x.round === n);
  if (!r && create) {
    r = { round: n, renderJpg: '', critics: [], fix: null, status: 'pending' };
    l.rounds.push(r);
  }
  return r;
}

function parseJson(s, what) {
  if (!s) fail(`--json is required for ${what}`);
  try { return JSON.parse(s); } catch (e) { fail(`--json is not valid JSON: ${e.message}`); }
}

function fail(msg) { console.error(msg); process.exit(2); }

function needView() {
  const view = args.view;
  if (!view) fail('--view is required');
  if (!VIEWS[view]) fail(`unknown view ${view}; one of ${Object.keys(VIEWS).join(', ')}`);
  return view;
}
function needRound() {
  const n = Number(args.round);
  if (!Number.isInteger(n) || n < 0) fail('--round must be a non negative integer');
  return n;
}

function normalizeVerdict(v, keyFile) {
  const out = {
    pick: v.pick === 'A' || v.pick === 'B' ? v.pick : (v.pick ?? null),
    correct: typeof v.correct === 'boolean' ? v.correct : null,
    confidence: v.confidence ?? '',
    tells: Array.isArray(v.tells) ? v.tells : (v.tells ? [String(v.tells)] : []),
    biggestGap: v.biggestGap ?? '',
    secondaryGaps: Array.isArray(v.secondaryGaps) ? v.secondaryGaps : (v.secondaryGaps ? [String(v.secondaryGaps)] : []),
    realismScore: v.realismScore ?? null,
    wowed: v.wowed === true,
  };
  if (keyFile) {
    const key = JSON.parse(readFileSync(keyFile, 'utf8'));
    if (out.pick === 'A' || out.pick === 'B') out.correct = out.pick === key.renderPanel;
    out.renderPanel = key.renderPanel;
  }
  // Anything else the critic reported is kept rather than dropped.
  for (const k of Object.keys(v)) if (!(k in out)) out[k] = v[k];
  return out;
}

const commands = {
  seed() {
    const done = [];
    for (const view of Object.keys(VIEWS)) {
      if (existsSync(ledgerPath(view))) continue;
      save({ view, photo: VIEWS[view], rounds: [] });
      done.push(view);
    }
    console.log(JSON.stringify({ seeded: done }));
  },
  append() {
    const view = needView(), n = needRound();
    const v = parseJson(args.json, 'append');
    const l = load(view);
    const r = getRound(l, n, true);
    if (args['render-jpg']) r.renderJpg = args['render-jpg'];
    r.critics.push(normalizeVerdict(v, args.key));
    save(l);
    console.log(JSON.stringify({ view, round: n, critics: r.critics.length, file: ledgerPath(view) }));
  },
  fix() {
    const view = needView(), n = needRound();
    const f = parseJson(args.json, 'fix');
    const l = load(view);
    const r = getRound(l, n, true);
    r.fix = {
      changed: Array.isArray(f.changed) ? f.changed : (f.changed ? [String(f.changed)] : []),
      commit: f.commit ?? '',
      notes: f.notes ?? '',
    };
    for (const k of Object.keys(f)) if (!(k in r.fix)) r.fix[k] = f[k];
    if (args['render-jpg']) r.renderJpg = args['render-jpg'];
    save(l);
    console.log(JSON.stringify({ view, round: n, fix: r.fix, file: ledgerPath(view) }));
  },
  status() {
    const view = needView(), n = needRound();
    const s = args.status;
    if (!STATUSES.includes(s)) fail(`--status must be one of ${STATUSES.join(', ')}`);
    const l = load(view);
    const r = getRound(l, n, true);
    r.status = s;
    if (args['render-jpg']) r.renderJpg = args['render-jpg'];
    save(l);
    console.log(JSON.stringify({ view, round: n, status: s, file: ledgerPath(view) }));
  },
  show() {
    const view = needView();
    console.log(JSON.stringify(load(view), null, 1));
  },
};

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!commands[cmd]) fail(`usage: ledger.mjs <seed|append|fix|status|show> ...`);
  commands[cmd]();
}
