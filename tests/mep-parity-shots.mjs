// mep-parity-shots.mjs — shoot the MEP punch surface on the wall board and the
// same room on the crew phone, from matching views, for side-by-side review.
//
// The board and the phone are two independent renderers over one dataset. They
// drift silently, and the drift only shows up when somebody at the board reads
// a line differently from the walker holding the phone. tests/mep-dash.mjs
// asserts parity mechanically; this writes the pictures a human (or a critic
// agent) compares.
//
//   node tests/mep-parity-shots.mjs [outdir]
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] || '/tmp/mep-shots';
const B = process.env.BASE || 'http://localhost:8322';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const stats = {};

// ---- dashboard (wall screen) ----
const dctx = await browser.newContext({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 2 });
const d = await dctx.newPage();
d.on('pageerror', e => console.log('DASH pageerror:', e.message));
await d.goto(`${B}/dashboard.html?demo=1`, { waitUntil: 'networkidle' });
await d.waitForSelector('.mgrid', { timeout: 20000 });
await d.locator('#mep').scrollIntoViewIfNeeded();
await d.waitForTimeout(400);
await d.locator('.mep-row').screenshot({ path: `${OUT}/dash-mep-panel.png` });
await d.screenshot({ path: `${OUT}/dash-full.png`, fullPage: true });

await d.locator('[data-mroom]').first().click();
await d.waitForSelector('.mroom-list', { timeout: 10000 });
// Focus lands inside the dialog, which scrolls it — put it back at the top so
// the shot shows the head of the list, the same place the phone opens at.
await d.locator('.dsheet-body').evaluate(el => { el.scrollTop = 0; });
await d.waitForTimeout(300);
await d.locator('.dsheet').screenshot({ path: `${OUT}/dash-mep-room.png` });

// A line that carries a NOTED reference — the substitution warnings are the
// whole reason notes render, so shoot one that has something to say.
const noted = await d.evaluate(async () => {
  const idx = await (await fetch('./refs/refs-mep.json')).json();
  return Object.entries(idx.byItemId).filter(([, rs]) => rs.some(r => r.note)).map(([id]) => id);
});
let pick = null;
for (const id of noted) {
  if (await d.locator(`.mrow[data-item="${id}"] .mref-chip`).count()) { pick = id; break; }
}
if (!pick) pick = await d.locator('.mrow:has(.mref-chip)').first().getAttribute('data-item');
await d.locator(`.mrow[data-item="${pick}"] .mref-chip`).click();
await d.waitForSelector('.dref', { timeout: 10000 });
await d.waitForTimeout(300);
await d.locator('.dscrim').last().locator('.dsheet').screenshot({ path: `${OUT}/dash-mep-refs.png` });

stats.board = {
  cards: await d.locator('[data-mroom]').count(),
  rows: await d.locator('.mrow').count(),
  trades: await d.locator('.mcat').count(),
  refChips: await d.locator('.mref-chip').count(),
  refDocs: await d.locator('.dref').count(),
  refNotes: await d.locator('.dref-note').count(),
};

// ---- app (phone) ----
const actx = await browser.newContext({ ...devices['Pixel 7'], deviceScaleFactor: 3 });
// The app gates every screen behind "WHO ARE YOU?" — seed the identity the
// same way a crew member who already onboarded would have it.
await actx.addInitScript(() => {
  localStorage.setItem('h2sep-user', JSON.stringify({ name: 'QA Tester', initials: 'QA' }));
});
const a = await actx.newPage();
a.on('pageerror', e => console.log('APP pageerror:', e.message));
await a.goto(`${B}/index.html?demo=1#/room/101-MEP`, { waitUntil: 'networkidle' });
await a.waitForSelector('.item-row', { timeout: 20000 });
await a.waitForTimeout(400);
await a.screenshot({ path: `${OUT}/app-mep-room.png` });
await a.screenshot({ path: `${OUT}/app-mep-room-full.png`, fullPage: true });

await a.locator(`.item-row[data-item="${pick}"] .ref-count`).click();
await a.waitForSelector('.ref-link', { timeout: 10000 });
await a.waitForTimeout(300);
await a.screenshot({ path: `${OUT}/app-mep-refs.png` });

stats.app = {
  rows: await a.locator('.item-row').count(),
  trades: await a.locator('.cat-letter').count(),
  refChips: await a.locator('.ref-count').count(),
  refDocs: await a.locator('.ref-link').count(),
  refNotes: await a.locator('.ref-note').count(),
  doChips: await a.locator('.punch-do').count(),
  atChips: await a.locator('.punch-at').count(),
};

await a.goto(`${B}/index.html?demo=1#/floor/1`, { waitUntil: 'networkidle' });
await a.waitForTimeout(400);
await a.screenshot({ path: `${OUT}/app-floor1.png` });

await browser.close();
console.log(JSON.stringify(stats, null, 1));
console.log('shots ->', OUT);
