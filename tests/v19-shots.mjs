#!/usr/bin/env node
// Phone-viewport check of the v1.9.0 additions: collapsible categories, the
// live-data print sheet, and the 3D exhibit. Runs against the local app tree
// in demo mode (the container's browser cannot reach Firebase).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:8322/';
const OUT = '/tmp/claude-0/-home-user/e71b2418-bcd4-506a-95ce-32ce7af669ac/scratchpad/shots19';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({
  viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36',
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push('console: ' + m.text()); });
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

// onboarding
await page.goto(BASE + 'index.html?demo=1', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(1200);
await page.fill('#wb-name', 'QA Tester');
await page.click('#wb-go');
await page.waitForTimeout(600);

// 1) room with categories + hint line
await page.goto(BASE + 'index.html?demo=1#/room/101', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(1200);
await shot('20-room-hint');
console.log('categories:', await page.locator('.cat-group').count(),
  '| qty badges:', await page.locator('.qtyb').count(),
  '| ref chips:', await page.locator('.ref-count').count(),
  '| hint:', (await page.locator('.how-line').innerText()).slice(0, 70));

// 2) collapse the first two categories to show the compaction
for (const cat of ['Bath Accessory', 'Appliance']) {
  await page.locator(`.cat-group[data-cat="${cat}"] [data-cattoggle]`).click();
  await page.waitForTimeout(200);
}
await page.waitForTimeout(300);
await shot('21-categories-collapsed');

// 3) print sheet from data
await page.goto(BASE + 'print.html?room=101&demo=1', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(1500);
await shot('22-print-sheet');
console.log('print lines:', await page.locator('.item').count(),
  '| checked boxes:', await page.locator('.box.done').count(),
  '| page2 present:', await page.locator('.p2').count());

// 4) 3D exhibit, portrait
await page.goto(BASE + 'room-3d.html?room=101', { waitUntil: 'load', timeout: 90000 });
await page.waitForTimeout(6000);
await shot('23-3d-portrait');
console.log('3d canvas:', await page.locator('#stage canvas').count(),
  '| backbar:', await page.locator('#backbar a').count(),
  '| runtime err shown:', await page.locator('#err:not([hidden])').count());

// 5) tap an item in the 3D model -> detail card as bottom sheet
await page.locator('#drawerbar').click(); // v1.8.1: the phone list is a bottom drawer
await page.waitForTimeout(600);
await shot('24-3d-item-list');

console.log('page errors:', errors.length ? errors.join(' | ') : 'none');
await browser.close();
console.log('done -> ' + OUT);
