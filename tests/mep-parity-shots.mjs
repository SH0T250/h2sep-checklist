// Screenshot the dashboard MEP surface and the matching app punch screens.
import { chromium, devices } from 'playwright';
const OUT = process.argv[2] || '/tmp/claude-0/-home-user-h2sep-checklist/83e949f9-bbcb-5a58-b7fe-b5c2d1bb0f20/scratchpad/shots';
const B = 'http://localhost:8322';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

// ---- dashboard (wall screen) ----
const dctx = await browser.newContext({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 2 });
const d = await dctx.newPage();
d.on('console', m => { if (m.type() === 'error') console.log('DASH console error:', m.text()); });
d.on('pageerror', e => console.log('DASH pageerror:', e.message));
await d.goto(`${B}/dashboard.html?demo=1`, { waitUntil: 'networkidle' });
await d.waitForSelector('.mgrid', { timeout: 15000 });
await d.locator('#mep').scrollIntoViewIfNeeded();
await d.waitForTimeout(400);
await d.locator('.mep-row').screenshot({ path: `${OUT}/dash-mep-panel.png` });
await d.screenshot({ path: `${OUT}/dash-full.png`, fullPage: true });
// room drill-in
await d.locator('[data-mroom]').first().click();
await d.waitForSelector('.mroom-list', { timeout: 8000 });
await d.waitForTimeout(400);
await d.locator('.dsheet').screenshot({ path: `${OUT}/dash-mep-room.png` });
// the reference sheet, opened from a punch line's 📎 chip
await d.locator('.mref-chip').first().click();
await d.waitForSelector('.dref', { timeout: 8000 });
await d.waitForTimeout(300);
await d.locator('.dscrim').last().locator('.dsheet').screenshot({ path: `${OUT}/dash-mep-refs.png` });
console.log('dash ref rows:', await d.locator('.dref').count(),
            '| notes:', await d.locator('.dref-note').count());
await d.keyboard.press('Escape');
console.log('dash cards:', await d.locator('[data-mroom]').count(),
            '| rows:', await d.locator('.mrow').count(),
            '| trade groups:', await d.locator('.mcat').count(),
            '| ref chips:', await d.locator('.mref-chip').count());

// ---- app (phone) ----
const actx = await browser.newContext({ ...devices['Pixel 7'] });
// The app gates every screen behind "WHO ARE YOU?" — seed the identity the
// same way a crew member who already onboarded would have it.
await actx.addInitScript(() => {
  localStorage.setItem('h2sep-user', JSON.stringify({ name: 'QA Tester', initials: 'QA' }));
});
const a = await actx.newPage();
a.on('pageerror', e => console.log('APP pageerror:', e.message));
await a.goto(`${B}/index.html?demo=1#/room/101-MEP`, { waitUntil: 'networkidle' });
await a.waitForSelector('.item-row', { timeout: 15000 });
await a.waitForTimeout(500);
await a.screenshot({ path: `${OUT}/app-mep-room.png`, fullPage: true });
console.log('app rows:', await a.locator('.item-row').count(),
            '| ref chips:', await a.locator('.ref-count').count(),
            '| DO chips:', await a.locator('.punch-do').count(),
            '| AT chips:', await a.locator('.punch-at').count());
// app: same reference list, reached the same way
await a.locator('.ref-count').first().click();
await a.waitForSelector('.ref-link', { timeout: 8000 });
await a.waitForTimeout(300);
await a.screenshot({ path: `${OUT}/app-mep-refs.png` });
console.log('app ref rows:', await a.locator('.ref-link').count(),
            '| notes:', await a.locator('.ref-note').count());
await a.goto(`${B}/index.html?demo=1#/floor/1`, { waitUntil: 'networkidle' });
await a.waitForTimeout(400);
await a.screenshot({ path: `${OUT}/app-floor1.png`, fullPage: true });

await browser.close();
console.log('shots ->', OUT);
