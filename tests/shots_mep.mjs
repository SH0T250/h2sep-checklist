// shots_mep.mjs — screenshots of the REAL punch content, for showing people.
//
// The mep-ui test deliberately uses a synthetic doc, because when it was
// written the content was still unverified. It is verified now and seeded, so
// these shots load the actual seeded doc through the actual render path — what
// Austin sees is what the crew sees.
//
//   node tests/shots_mep.mjs [room]
import { chromium, devices } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOM = process.argv[2] || '105';
const BASE = 'http://localhost:8322/index.html?demo=1';
const OUT = join(HERE, '..', 'tools', 'out', 'shots');
mkdirSync(OUT, { recursive: true });

const mep = JSON.parse(readFileSync(join(HERE, '..', 'tools', 'out', 'mep', `${ROOM}-MEP.json`), 'utf8'));
const ffe = JSON.parse(readFileSync(join(HERE, '..', 'tools', 'out', 'mep', `${ROOM}-MEP.json`), 'utf8'));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ ...devices['Pixel 7'] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(BASE);
await page.waitForTimeout(600);
await page.evaluate(([m, room]) => {
  localStorage.setItem('h2sep-user', JSON.stringify({ name: 'Austin', initials: 'AJ' }));
  const db = JSON.parse(localStorage.getItem('h2sep-demo-db-v2') || '{"rooms":{}}');
  db.rooms[`${room}-MEP`] = m;
  localStorage.setItem('h2sep-demo-db-v2', JSON.stringify(db));
}, [mep, ROOM]);

// Hash-only navigation does not reload the document, so bounce through blank
// to make the app re-read what we just wrote.
await page.goto('about:blank');
await page.goto(`${BASE}#/room/${ROOM}-MEP`);
await page.waitForTimeout(1100);
await page.screenshot({ path: join(OUT, `mep-${ROOM}-top.png`) });

// Open the first trade group so the punch steps are visible. Best-effort:
// a missing or unclickable header must not cost us the other shots.
try {
  const firstGroup = page.locator('.cat-head, .cat h3, [data-cat]').first();
  if (await firstGroup.count({ timeout: 3000 })) {
    await firstGroup.click({ timeout: 5000 });
    await page.waitForTimeout(600);
  }
} catch { /* group already open, or laid out differently — shots below still work */ }
await page.screenshot({ path: join(OUT, `mep-${ROOM}-open.png`) });

// Scrolled a little way in, where the punch steps live. A fullPage shot of a
// 64-line punch list is ~17 MB and unusable for review.
await page.evaluate(() => window.scrollBy(0, 900));
await page.waitForTimeout(400);
await page.screenshot({ path: join(OUT, `mep-${ROOM}-lines.png`) });

// The printable sheet, at paper width.
const p2 = await ctx.newPage();
await p2.setViewportSize({ width: 1000, height: 1400 });
await p2.goto(`http://localhost:8322/print.html?demo=1&room=${ROOM}-MEP`);
await p2.waitForTimeout(1400);
await p2.screenshot({ path: join(OUT, `mep-${ROOM}-print.png`) });

console.log(`lines in doc: ${Object.keys(mep.items).length}`);
console.log(`page errors: ${errors.length ? errors.join(' | ') : 'none'}`);
console.log(`wrote shots to ${OUT}`);
await browser.close();
