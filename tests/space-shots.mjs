#!/usr/bin/env node
// Screenshot common-area spaces as the crew will see them: live Firestore docs
// (REST — node can reach Firebase, the container's browser cannot) injected
// into the demo backend, rendered by the local build on :8322.
//
//   node tests/space-shots.mjs 003 006 023          # specific spaces
//   node tests/space-shots.mjs --out /path 003      # custom output dir
//   node tests/space-shots.mjs --dash               # dashboard inventory too
//
// Per space: <n>.png (room screen) and, when an item carries refs,
// <n>-refs.png (the 📎 item references sheet open).
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
let OUT = new URL('../../claude-shots', import.meta.url).pathname;
const oi = args.indexOf('--out');
if (oi !== -1) { OUT = args[oi + 1]; args.splice(oi, 2); }
const DASH = args.includes('--dash');
const rooms = args.filter((a) => !a.startsWith('--'));
mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:8322/';
const cfg = readFileSync(new URL('../js/config.js', import.meta.url), 'utf8');
const KEY = cfg.match(/apiKey\s*:\s*["']([^"']+)["']/)[1];
const su = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${KEY}`,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"returnSecureToken":true}' })).json();
const dv = (v) => {
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, dv(x)]));
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dv);
  return null;
};
async function liveDoc(n) {
  const d = await (await fetch(
    `https://firestore.googleapis.com/v1/projects/h2sep-checklist/databases/(default)/documents/projects/h2sep/rooms/${encodeURIComponent(n)}`,
    { headers: { Authorization: 'Bearer ' + su.idToken } })).json();
  if (!d.fields) throw new Error(n + ' not found live');
  return Object.fromEntries(Object.entries(d.fields).map(([k, v]) => [k, dv(v)]));
}

const docs = {};
for (const n of rooms) { docs[n] = await liveDoc(n); console.log(`live ${n}: ${Object.keys(docs[n].items || {}).length} items`); }

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({
  viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36',
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

// boot demo, pass the crew gate, inject live docs, hard reload
await page.goto(BASE + 'index.html?demo=1', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(1800);
const inputs = page.locator('main input[type=text], .content input[type=text], input[type=text]');
if (await inputs.count() >= 2 && await inputs.first().isVisible().catch(() => false)) {
  await inputs.nth(0).fill('QA Preview');
  await inputs.nth(1).fill('QA');
  await page.locator('button:has-text("Start")').first().tap();
  await page.waitForTimeout(1000);
}
await page.evaluate((live) => {
  const key = Object.keys(localStorage).find((k) => /^h2sep-demo-db-v\d+$/.test(k));
  const db = JSON.parse(localStorage.getItem(key));
  for (const [n, doc] of Object.entries(live)) db.rooms[n] = doc;
  localStorage.setItem(key, JSON.stringify(db));
}, docs);

for (const n of rooms) {
  await page.goto('about:blank');
  await page.goto(BASE + 'index.html?demo=1#/room/' + n, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/${n}.png` });
  // open the first 📎 references chip, if any item resolved refs
  const chip = page.locator('[data-refchip]').first();
  if (await chip.count()) {
    await chip.scrollIntoViewIfNeeded();
    await chip.tap();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${n}-refs.png` });
    // open the first reference itself (plan snippet or submittal fallback)
    const ref = page.locator('.ref-link').first();
    if (await ref.count()) {
      await ref.tap();
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${OUT}/${n}-pop.png` });
    }
  }
  console.log(`${n}: shot${await chip.count() ? ' + refs sheet' : ' (no ref chips)'}${errors.length ? ' ERRORS ' + errors.join(' | ') : ''}`);
}

if (DASH) {
  const dpage = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  dpage.on('pageerror', (e) => errors.push('dash pageerror: ' + e.message));
  await dpage.goto(BASE + 'dashboard.html?demo=1', { waitUntil: 'load', timeout: 60000 });
  await dpage.waitForTimeout(1500);
  await dpage.evaluate((live) => {
    const key = Object.keys(localStorage).find((k) => /^h2sep-demo-db-v\d+$/.test(k));
    if (!key) return;
    const db = JSON.parse(localStorage.getItem(key));
    for (const [n, doc] of Object.entries(live)) db.rooms[n] = doc;
    localStorage.setItem(key, JSON.stringify(db));
  }, docs);
  await dpage.goto('about:blank');
  await dpage.goto(BASE + 'dashboard.html?demo=1', { waitUntil: 'load', timeout: 60000 });
  await dpage.waitForTimeout(2000);
  const inv = dpage.locator('#inventory');
  if (await inv.count()) await inv.scrollIntoViewIfNeeded();
  await dpage.screenshot({ path: `${OUT}/dash-inventory.png` });
  const att = dpage.locator('[data-att]').first();
  if (await att.count()) {
    await att.click();
    await dpage.waitForTimeout(700);
    await dpage.screenshot({ path: `${OUT}/dash-attachments.png` });
  }
  console.log('dashboard: shot' + (await att.count() ? ' + attachments sheet' : ' (no 📎 buttons)'));
}

await browser.close();
if (errors.length) { console.error('PAGE ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('done ->', OUT);
