#!/usr/bin/env node
// Screenshot the REAL migrated Room 101 rendered by the deployed v1.8.0 build.
// The container's browser can't reach Firebase, so the live doc is fetched via
// REST (node CAN reach it), decoded, and injected into the demo backend's
// localStorage DB — the pixels are the deployed app rendering the live data.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';

const BASE = 'http://localhost:8322/'; // byte-verified mirror of the live deploy
const OUT = '/tmp/claude-0/-home-user/e71b2418-bcd4-506a-95ce-32ce7af669ac/scratchpad/shots';
mkdirSync(OUT, { recursive: true });

// ---- fetch + decode live room 101 ----
const cfg = readFileSync(new URL('../js/config.js', import.meta.url), 'utf8');
const KEY = cfg.match(/apiKey\s*:\s*["']([^"']+)["']/)[1];
const su = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${KEY}`,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) })).json();
const doc = await (await fetch(
  'https://firestore.googleapis.com/v1/projects/h2sep-checklist/databases/(default)/documents/projects/h2sep/rooms/101',
  { headers: { Authorization: 'Bearer ' + su.idToken } })).json();
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
const room = Object.fromEntries(Object.entries(doc.fields).map(([k, v]) => [k, dv(v)]));
const checked = Object.values(room.items).filter((it) => it.checked).length;
console.log(`live 101 fetched: ${Object.keys(room.items).length} items, ${checked} checked`);

// ---- render it through the deployed build ----
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({
  viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36',
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

// seed demo db, then swap in the real doc
await page.goto(BASE + 'index.html?demo=1', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(2000);
// pass the crew-identity gate (fresh profile)
const inputs = page.locator('main input[type=text], .content input[type=text], input[type=text]');
if (await inputs.count() >= 2 && await inputs.first().isVisible().catch(() => false)) {
  await inputs.nth(0).fill('QA Preview');
  await inputs.nth(1).fill('QA');
  await page.locator('button:has-text("Start")').first().tap();
  await page.waitForTimeout(1200);
}
await page.evaluate((liveRoom) => {
  const db = JSON.parse(localStorage.getItem('h2sep-demo-db-v2'));
  db.rooms['101'] = liveRoom;
  localStorage.setItem('h2sep-demo-db-v2', JSON.stringify(db));
  localStorage.setItem('h2sep-theme', 'light');
}, room);

// 1) the migrated room, light — full reload so the app boots from the
// injected DB (hash-only navigation would keep the in-memory seed)
await page.goto('about:blank');
await page.goto(BASE + 'index.html?demo=1#/room/101', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(2000);
await shot('10-room101-migrated-top');
console.log('qty badges:', await page.locator('.qtyb').count(), '| ref chips:', await page.locator('.ref-count').count(),
  '| checked boxes:', await page.locator('.item-row.checked').count());

// 2) scroll to the casegoods (GR-302 vanity + GR-322 nightstand fold note area)
const gr322 = page.locator('[data-item=gr322_a]');
if (await gr322.count()) { await gr322.scrollIntoViewIfNeeded(); await page.waitForTimeout(400); await shot('11-room101-migrated-casegoods'); }

// 3) flagged appliances (dishwasher / disposer ⚑)
const dw = page.locator('[data-item="902_a"]');
if (await dw.count()) { await dw.scrollIntoViewIfNeeded(); await page.waitForTimeout(400); await shot('12-room101-migrated-appliances'); }

// 4) a ref popup from the real room (GR-300 has 2 refs + snippet)
const chip300 = page.locator('[data-item=gr300_a] .ref-count');
if (await chip300.count()) {
  await chip300.scrollIntoViewIfNeeded();
  await chip300.tap(); await page.waitForTimeout(700);
  const link = page.locator('.scrim .ref-link').first();
  if (await link.count()) { await link.tap(); await page.waitForTimeout(900); await shot('13-ref-popup-gr300'); }
}

// 5) dark mode of the same room (about:blank forces a real reload)
await page.evaluate(() => localStorage.setItem('h2sep-theme', 'dark'));
await page.goto('about:blank');
await page.goto(BASE + 'index.html?demo=1#/room/101', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(1800);
await shot('14-room101-migrated-dark');

console.log('page errors:', errors.length ? errors.join(' | ') : 'none');
await browser.close();
console.log('done');
