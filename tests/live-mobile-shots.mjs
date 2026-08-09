#!/usr/bin/env node
// Mobile-viewport verification of the LIVE deployed v1.8.0 build.
// Container egress blocks the browser from Google, so screenshots run the live
// URL in ?demo=1 (same deployed shell/JS/CSS; local demo backend); live DATA is
// REST-verified separately. Screenshots land in OUT for sending to Austin.
import { chromium } from 'playwright';

const BASE = 'http://localhost:8322/'; // byte-verified mirror of the live deploy
const OUT = '/tmp/claude-0/-home-user/e71b2418-bcd4-506a-95ce-32ce7af669ac/scratchpad/shots';
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--disable-background-networking', '--disable-component-update', '--disable-sync', '--disable-default-apps'] });
const ctx = await browser.newContext({
  viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36',
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

// 1) cold load, demo mode, light theme
await page.goto(BASE + 'index.html?demo=1', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(2500);
// pass the name gate if present
const nameInput = page.locator('input[name=crewname], #crewname, input[type=text]').first();
if (await nameInput.count() && await nameInput.isVisible().catch(() => false)) {
  await nameInput.fill('QA Preview');
  const goBtn = page.locator('button:has-text("Start"), button:has-text("Continue"), button[type=submit]').first();
  if (await goBtn.count()) await goBtn.tap();
  await page.waitForTimeout(1200);
}
await shot('01-home-light');

// 2) Room 101 checklist (×qty badges + ref chips)
await page.goto(BASE + 'index.html?demo=1#/room/101', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(2000);
await shot('02-room101-light');
console.log('qty badges:', await page.locator('.qtyb').count());
console.log('ref chips:', await page.locator('.ref-count').count());

// 3) ref popup (chip -> refs sheet -> plan snippet popup)
const chip = page.locator('.ref-count').first();
if (await chip.count()) {
  await chip.tap();
  await page.waitForTimeout(700);
  await shot('03-refs-sheet');
  const link = page.locator('.scrim .ref-link').first();
  if (await link.count()) {
    await link.tap();
    await page.waitForTimeout(900);
    await shot('04-ref-popup-snippet');
    const close = page.locator('.pop-scrim .paper-close').first();
    if (await close.count()) await close.tap();
  }
  await page.waitForTimeout(400);
  await page.mouse.click(10, 100); // close refs sheet via scrim
  await page.waitForTimeout(400);
}

// 4) dark mode via settings
await page.goto(BASE + 'index.html?demo=1#/settings', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(1500);
const darkBtn = page.locator('[data-theme-set=dark]').first();
if (await darkBtn.count()) { await darkBtn.tap(); await page.waitForTimeout(600); }
await shot('05-settings-dark');
await page.goto(BASE + 'index.html?demo=1#/room/101', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(1500);
console.log('theme after reload:', await page.evaluate(() => document.documentElement.getAttribute('data-theme')));
await shot('06-room101-dark');

console.log('page errors:', errors.length ? errors.join(' | ') : 'none');
await browser.close();
console.log('done -> ' + OUT);
