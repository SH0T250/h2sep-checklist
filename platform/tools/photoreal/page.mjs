// Progress page for the render versus photograph loop.
//
// Reads the seven ledgers, the 900 px photographs and the latest render for
// each view, and writes ONE self-contained HTML page with every image as a data
// URI. The page embeds photographs of the client's unopened hotel, so it is
// written to the session scratch directory and never committed.
//
// Usage:
//   node platform/tools/photoreal/page.mjs [out] [--updated "2026-09-02 15:00"]
// Env:
//   PHOTO_LOOP_UPDATED   same as --updated
//   PHOTO_LOOP_SCRATCH   scratch root (default: this session's scratchpad)
// The last updated stamp is taken from the argument or the env, never from the
// clock, so rebuilding with the same data gives the same file.
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { execFileSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { VIEWS, load as loadLedger } from './ledger.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const SCRATCH = process.env.PHOTO_LOOP_SCRATCH
  || '/tmp/claude-0/-home-user-h2sep-checklist/fb47d53f-23f6-5d8f-88e1-343b94d9771e/scratchpad';
const PHOTOS = `${SCRATCH}/demo-room/small`;
const RENDERS = `${SCRATCH}/renders`;
const BASELINE = `${SCRATCH}/shots/baseline`;
const MAX_BYTES = 12 * 1024 * 1024;

const args = {};
const positional = [];
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) { args[a.slice(2)] = process.argv[i + 1]; i++; } else positional.push(a);
}
const OUT = positional[0] || `${SCRATCH}/progress/photo-loop.html`;
const UPDATED = args.updated || process.env.PHOTO_LOOP_UPDATED || '';

const VIEW_TITLES = {
  'entry': 'Entry', 'lounge': 'Lounge', 'bed': 'Bed', 'working': 'Working wall',
  'kitchen': 'Kitchen', 'bath-vanity': 'Bath vanity', 'bath-shower': 'Bath shower',
};

// ---- images ----
// Every image is re-encoded to a 900 px wide JPEG through Pillow so the page
// stays small and the photograph and the render carry the same encoding.
function embedJpeg(path, width = 900, quality = 82) {
  if (!path || !existsSync(path)) return null;
  const b64 = execFileSync('python3', ['-c', `
import sys, io, base64
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
w = int(sys.argv[2])
if im.width > w:
    im = im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS)
buf = io.BytesIO()
im.save(buf, 'JPEG', quality=int(sys.argv[3]), subsampling=2, optimize=True)
sys.stdout.write(base64.b64encode(buf.getvalue()).decode())
`, path, String(width), String(quality)], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return `data:image/jpeg;base64,${b64}`;
}

function latestRender(view) {
  const latest = `${RENDERS}/${view}/latest.jpg`;
  if (existsSync(latest)) return { path: latest, label: 'latest render', baseline: false };
  const base = `${BASELINE}/${view}.png`;
  if (existsSync(base)) return { path: base, label: 'three.js baseline, before this loop', baseline: true };
  return { path: null, label: 'no render yet', baseline: true };
}

// ---- ledger reading ----
function summarise(ledger) {
  const rounds = [...ledger.rounds].sort((a, b) => a.round - b.round);
  const last = rounds[rounds.length - 1] || null;
  const lastJudged = [...rounds].reverse().find(r => r.critics && r.critics.length) || null;
  const critic = lastJudged ? lastJudged.critics[lastJudged.critics.length - 1] : null;
  let status = last ? (last.status || 'pending') : 'pending';
  return { rounds, last, lastJudged, critic, status };
}

const BADGE = {
  wowed: 'WOWED', fooled: 'FOOLED THIS ROUND', spotted: 'SPOTTED', pending: 'PENDING',
};

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---- gather ----
const views = Object.keys(VIEWS).map(view => {
  const ledger = loadLedger(view);
  const s = summarise(ledger);
  const render = latestRender(view);
  return {
    view, title: VIEW_TITLES[view] || view, photo: ledger.photo, ...s, render,
    photoData: embedJpeg(`${PHOTOS}/${ledger.photo}`),
    renderData: embedJpeg(render.path),
  };
});

const tally = { wowed: 0, fooled: 0, spotted: 0, pending: 0 };
for (const v of views) tally[v.status in tally ? v.status : 'pending']++;

// ---- render ----
function chip(r) {
  const st = r.status || 'pending';
  const short = { wowed: 'wowed', fooled: 'fooled', spotted: 'spotted', pending: 'pending' }[st] || st;
  return `<span class="chip chip-${esc(st)}" title="round ${r.round}: ${esc(short)}">r${r.round} ${esc(short)}</span>`;
}

function list(items) {
  if (!items || !items.length) return '<p class="muted">none recorded</p>';
  return `<ul>${items.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
}

function details(v) {
  if (!v.rounds.length) return '<p class="muted">No rounds yet.</p>';
  return v.rounds.map(r => {
    const critics = (r.critics || []).map((c, i) => `
      <div class="critic">
        <div class="critic-head">critic ${i + 1}: picked ${esc(c.pick ?? '?')}${c.correct === true ? ', correct' : c.correct === false ? ', wrong' : ''}${c.confidence ? `, ${esc(c.confidence)}` : ''}${c.realismScore != null ? `, realism ${esc(c.realismScore)}` : ''}${c.wowed ? ', wowed' : ''}</div>
        ${c.biggestGap ? `<p><strong>Biggest gap:</strong> ${esc(c.biggestGap)}</p>` : ''}
        <p class="label">Tells</p>${list(c.tells)}
        ${c.secondaryGaps && c.secondaryGaps.length ? `<p class="label">Secondary gaps</p>${list(c.secondaryGaps)}` : ''}
      </div>`).join('');
    const fix = r.fix ? `
      <div class="fix">
        <p class="label">Fix${r.fix.commit ? ` (commit ${esc(r.fix.commit)})` : ''}</p>
        ${list(r.fix.changed)}
        ${r.fix.notes ? `<p class="muted">${esc(r.fix.notes)}</p>` : ''}
      </div>` : '';
    return `<section class="round">
      <h4>Round ${r.round} ${chip(r)}</h4>
      ${critics || '<p class="muted">no verdict yet</p>'}
      ${fix}
    </section>`;
  }).join('');
}

function row(v) {
  const c = v.critic;
  const badge = BADGE[v.status] || BADGE.pending;
  const img = (data, alt) => data
    ? `<img src="${data}" alt="${esc(alt)}" loading="lazy">`
    : `<div class="missing">${esc(alt)}</div>`;
  return `
  <article class="view" id="${esc(v.view)}">
    <header class="view-head">
      <h2>${esc(v.title)}</h2>
      <span class="badge badge-${esc(v.status)}">${badge}</span>
    </header>
    <div class="pair">
      <figure>
        ${img(v.photoData, `photograph ${v.photo}`)}
        <figcaption>photograph</figcaption>
      </figure>
      <figure>
        ${img(v.renderData, v.render.label)}
        <figcaption>${esc(v.render.label)}${v.last && !v.render.baseline ? `, round ${v.last.round}` : ''}</figcaption>
      </figure>
    </div>
    <dl class="facts">
      <div><dt>Round</dt><dd>${v.last ? v.last.round : 'none yet'}</dd></div>
      <div><dt>Confidence</dt><dd>${c && c.confidence ? esc(c.confidence) : 'no verdict yet'}</dd></div>
      <div class="wide"><dt>Biggest remaining gap</dt><dd>${c && c.biggestGap ? `"${esc(c.biggestGap)}"` : 'no verdict yet'}</dd></div>
      <div class="wide"><dt>History</dt><dd class="chips">${v.rounds.length ? v.rounds.map(chip).join(' ') : '<span class="muted">no rounds yet</span>'}</dd></div>
    </dl>
    <details>
      <summary>Every tell and every fix</summary>
      ${details(v)}
    </details>
  </article>`;
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Photo loop, room 110 King Studio</title>
<style>
:root {
  color-scheme: light dark;
  --bg: #f7f6f3; --panel: #ffffff; --ink: #1d1d1b; --muted: #6b6a66; --rule: #dedcd6;
  --wowed: #1f7a3f; --fooled: #2c6db3; --spotted: #a63a2b; --pending: #7a7772;
  --badge-ink: #ffffff;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #161615; --panel: #1f1f1d; --ink: #ecebe7; --muted: #a09e98; --rule: #33322f;
    --wowed: #4fb872; --fooled: #6ea6e6; --spotted: #e0705f; --pending: #8f8c86; --badge-ink: #111;
  }
}
:root[data-theme="dark"] {
  --bg: #161615; --panel: #1f1f1d; --ink: #ecebe7; --muted: #a09e98; --rule: #33322f;
  --wowed: #4fb872; --fooled: #6ea6e6; --spotted: #e0705f; --pending: #8f8c86; --badge-ink: #111;
}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--ink);
  font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
main { max-width: 1180px; margin: 0 auto; padding: 24px 20px 60px; }
h1 { font-size: 24px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
h2 { font-size: 19px; font-weight: 600; margin: 0; }
h4 { font-size: 14px; margin: 14px 0 6px; }
.sub { color: var(--muted); margin: 0 0 6px; }
.goal { margin: 0 0 18px; max-width: 70ch; }
.tally { display: flex; flex-wrap: wrap; gap: 10px 22px; padding: 12px 0; border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); margin-bottom: 26px; }
.tally div { display: flex; flex-direction: column; }
.tally b { font-size: 22px; font-weight: 600; line-height: 1.1; }
.tally span { color: var(--muted); font-size: 13px; }
.tally .stamp { margin-left: auto; text-align: right; }
.view { background: var(--panel); border: 1px solid var(--rule); border-radius: 8px; padding: 16px 18px; margin-bottom: 22px; }
.view-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.badge { font-size: 12px; font-weight: 700; letter-spacing: 0.06em; padding: 4px 10px; border-radius: 999px; color: var(--badge-ink); white-space: nowrap; }
.badge-wowed { background: var(--wowed); } .badge-fooled { background: var(--fooled); }
.badge-spotted { background: var(--spotted); } .badge-pending { background: var(--pending); }
.pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
figure { margin: 0; }
figure img, .missing { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: contain; background: #111; border-radius: 4px; }
.missing { display: grid; place-items: center; color: #aaa; font-size: 13px; }
figcaption { font-size: 13px; color: var(--muted); margin-top: 5px; }
.facts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; margin: 14px 0 0; }
.facts .wide { grid-column: 1 / -1; }
.facts div { display: flex; flex-direction: column; }
dt { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
dd { margin: 0; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font-size: 12px; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--rule); color: var(--ink); background: transparent; }
.chip-wowed { border-color: var(--wowed); color: var(--wowed); }
.chip-fooled { border-color: var(--fooled); color: var(--fooled); }
.chip-spotted { border-color: var(--spotted); color: var(--spotted); }
details { margin-top: 14px; border-top: 1px solid var(--rule); padding-top: 10px; }
summary { cursor: pointer; color: var(--muted); font-size: 14px; }
.round { padding: 4px 0 8px; }
.critic, .fix { border-left: 3px solid var(--rule); padding: 2px 0 2px 12px; margin: 8px 0; }
.critic-head { font-weight: 600; font-size: 14px; }
.label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin: 8px 0 2px; }
ul { margin: 2px 0 6px; padding-left: 20px; }
li { margin: 2px 0; }
.muted { color: var(--muted); }
footer { color: var(--muted); font-size: 13px; margin-top: 30px; }
@media (max-width: 700px) {
  main { padding: 16px 12px 40px; }
  .pair { grid-template-columns: 1fr; }
  .facts { grid-template-columns: 1fr; }
  .tally .stamp { margin-left: 0; text-align: left; width: 100%; }
  .view { padding: 12px; }
}
</style>
</head>
<body>
<main>
  <h1>Photo loop: render versus photograph</h1>
  <p class="sub">H2SEP, Home2 Suites by Hilton, Eagle Pass TX. Room 110, King Studio. Triun Construction and Engineering.</p>
  <p class="goal">Goal: seven still images of the King Studio guest room that a harsh, fresh-eyed critic cannot tell apart from the phone photographs of that room, judged blind, one view at a time.</p>
  <div class="tally">
    <div><b>${tally.wowed}</b><span>wowed</span></div>
    <div><b>${tally.fooled}</b><span>fooled</span></div>
    <div><b>${tally.spotted}</b><span>spotted</span></div>
    <div><b>${tally.pending}</b><span>pending</span></div>
    <div><b>${views.length}</b><span>views</span></div>
    <div class="stamp"><b>${esc(UPDATED || 'not stamped')}</b><span>last updated</span></div>
  </div>
  ${views.map(row).join('\n')}
  <footer>Photograph left, latest render right, shown at the same size. A round is spotted when the critic picked the render, fooled when it picked the photograph or could not tell, wowed when it was fooled and said so with enthusiasm. Ledgers: research/king-studio/photo-loop/ledger.</footer>
</main>
</body>
</html>
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);
const bytes = statSync(OUT).size;
if (bytes > MAX_BYTES) {
  console.error(`page is ${bytes} bytes, over the ${MAX_BYTES} byte cap`);
  process.exit(1);
}
console.log(JSON.stringify({ out: OUT, bytes, tally, updated: UPDATED }));
