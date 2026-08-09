// Device-lifecycle harness: simulates a crew phone through install/update/
// dead-zone cycles against a mutable copy of the app. Run from scratchpad.
import { chromium, devices } from 'playwright';
import { execSync } from 'child_process';
import fs from 'fs';

const SP = process.cwd();
// The mutable copy must live OUTSIDE the repo. Now that the tests ship inside
// the app repo, `cwd + '/lifecycle-app'` asked cp to copy the repo into itself.
const APPDIR = (process.env.TMPDIR || '/tmp').replace(/\/$/, '') + '/h2sep-lifecycle-app';
// The app IS this repo now — there is no separate mirror to drift from.
const SRC = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
// Its OWN port. This used to be 8322 — the shared server the other suites and
// any interactive session use — and line 20 kills whatever holds it, so running
// the lifecycle suite silently tore down everyone else's server and left it
// dead. A test must not destroy the environment it shares.
const PORT = 8329;
const BASE = `http://localhost:${PORT}/index.html?demo=1`;

let fails = 0;
const ok = (c, n) => { console.log((c ? 'PASS  ' : 'FAIL  ') + n); if (!c) fails++; };
const step = (n) => console.log('\n== ' + n);

// fresh mutable copy + server
execSync(`rm -rf ${APPDIR} && cp -r ${SRC} ${APPDIR}`);
try { execSync(`fuser -k ${PORT}/tcp 2>/dev/null`); } catch { /* port already free */ }
const server = (await import('child_process')).spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: APPDIR, stdio: 'ignore', detached: true });
await new Promise(r => setTimeout(r, 800));

function bumpVersion(v, { addSheet = null, skew = false } = {}) {
  let sw = fs.readFileSync(`${APPDIR}/sw.js`, 'utf8');
  sw = sw.replace(/const VERSION = '[^']+'/, `const VERSION = '${v}'`);
  fs.writeFileSync(`${APPDIR}/sw.js`, sw);
  if (!skew) { // normal deploy keeps config's APP_VERSION in lockstep
    let cfg = fs.readFileSync(`${APPDIR}/js/config.js`, 'utf8');
    cfg = cfg.replace(/APP_VERSION = '[^']+'/, `APP_VERSION = '${v.replace('h2sep-v', '')}'`);
    fs.writeFileSync(`${APPDIR}/js/config.js`, cfg);
  }
  if (addSheet) {
    fs.copyFileSync(`${APPDIR}/sheets/101.jpg`, `${APPDIR}/sheets/${addSheet}.jpg`);
    const idx = JSON.parse(fs.readFileSync(`${APPDIR}/sheets/index.json`, 'utf8'));
    idx.push(addSheet);
    fs.writeFileSync(`${APPDIR}/sheets/index.json`, JSON.stringify(idx));
  }
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ ...devices['Pixel 7'] });
let page = await ctx.newPage();
page.on('pageerror', e => console.log('  pageerror:', String(e).slice(0, 120)));

const cacheNames = () => page.evaluate(() => caches.keys());
const sheetCached = (n) => page.evaluate(async (n) => {
  const c = await caches.open('h2sep-sheets');
  return !!(await c.match('./sheets/' + n + '.jpg'));
}, n);
const activeVersions = async () => (await cacheNames()).filter(k => k.startsWith('h2sep-v'));
const forceUpdateCheck = () => page.evaluate(async () => {
  const r = await navigator.serviceWorker.getRegistration();
  if (r) await r.update();
});
async function waitFor(fn, ms = 15000, poll = 300) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await fn()) return true; await new Promise(r => setTimeout(r, poll)); }
  return false;
}

// ---------- PHASE 1: fresh install ----------
step('PHASE 1 — fresh install, first day with signal');
await page.goto(BASE);
await page.waitForTimeout(1000);
await page.fill('#wb-name', 'Lifecycle Phone'); await page.click('#wb-go');
ok(await waitFor(async () => (await activeVersions()).length === 1, 10000), 'shell precached');
ok(await waitFor(() => sheetCached('101'), 10000), 'sheet 101 auto-downloaded to permanent cache');

step('PHASE 1b — dead zone: cold reload offline');
await ctx.setOffline(true);
await page.goto(BASE + '#/room/101');
await page.waitForTimeout(900);
ok(await page.locator('.item-row').count() === 40, 'app cold-boots offline');
// Since v1.9.0 the header carries 🖨 (printable sheet) and 🧊 (3D model); the
// ORIGINAL paper photo moved into the ⋮ menu, revealed from sheets/index.json.
ok(await page.locator('.rh-right .sheet-btn').count() >= 1, 'header sheet buttons show offline');
await page.click('[data-more]');
await page.waitForTimeout(500);
ok(await page.locator('.scrim [data-act=paper]:not(.hidden)').count() === 1, '📄 paper entry shows offline');
await page.click('.scrim [data-act=paper]');
await page.waitForTimeout(700);
ok(await page.evaluate(() => { const i = document.querySelector('.paper-scroll img'); return i && i.complete && i.naturalWidth > 0; }), 'sheet opens offline');
await ctx.setOffline(false);

// ---------- PHASE 2: normal update WITH a new sheet ----------
step('PHASE 2 — v-next deploys with a NEW sheet (102); user taps banner');
bumpVersion('h2sep-v9.0.1-test', { addSheet: '102' });
await page.goto(BASE);
await forceUpdateCheck();
ok(await waitFor(() => page.locator('#update-banner').count().then(c => c === 1), 15000), 'update banner appears');
await Promise.all([page.waitForNavigation({ timeout: 15000 }).catch(() => {}), page.click('#update-banner')]);
await page.waitForTimeout(1200);
const vs2 = await activeVersions();
ok(vs2.length === 1 && vs2[0] === 'h2sep-v9.0.1-test', 'old shell cache purged, new active: ' + vs2.join(','));
ok(await sheetCached('101'), 'sheet 101 SURVIVED the update');
ok(await waitFor(() => sheetCached('102'), 15000), 'NEW sheet 102 auto-downloaded');

// ---------- PHASE 3: update released while phone is OFFLINE ----------
step('PHASE 3 — next version ships while phone is in a dead zone');
bumpVersion('h2sep-v9.0.2-test');
await ctx.setOffline(true);
await page.goto(BASE + '#/room/101');
await page.waitForTimeout(900);
ok(await page.locator('.item-row').count() === 40, 'offline phone keeps working on old version');
ok(await page.locator('.rh-right .sheet-btn').count() >= 1, 'header sheet buttons still show');
ok(await sheetCached('101') && await sheetCached('102'), 'both sheets still cached offline');
await ctx.setOffline(false);
await page.goto(BASE);
await forceUpdateCheck();
ok(await waitFor(() => page.locator('#update-banner').count().then(c => c === 1), 15000), 'back in signal: update banner appears');
await Promise.all([page.waitForNavigation({ timeout: 15000 }).catch(() => {}), page.click('#update-banner')]);
await page.waitForTimeout(1000);
ok((await activeVersions())[0] === 'h2sep-v9.0.2-test', 'update lands after reconnect');

// ---------- PHASE 4: user IGNORES the banner, then closes the app ----------
step('PHASE 4 — worker never taps the banner, just closes the app');
bumpVersion('h2sep-v9.0.3-test');
await page.goto(BASE);
await forceUpdateCheck();
await waitFor(() => page.locator('#update-banner').count().then(c => c === 1), 15000);
await page.close();               // app swiped away; all clients gone
await new Promise(r => setTimeout(r, 800));
page = await ctx.newPage();       // next morning: reopen
page.on('pageerror', e => console.log('  pageerror:', String(e).slice(0, 120)));
await page.goto(BASE + '#/room/101');
await page.waitForTimeout(1500);
ok(await page.locator('.item-row').count() === 40, 'reopen works');
ok(await waitFor(async () => (await activeVersions())[0] === 'h2sep-v9.0.3-test', 10000), 'ignored update self-activates on reopen');
ok(await sheetCached('101') && await sheetCached('102'), 'sheets survived ignored-update path');

// ---------- PHASE 5: rapid double update (skipped version) ----------
step('PHASE 5 — phone that missed a version jumps two at once');
bumpVersion('h2sep-v9.0.5-test');
await page.goto(BASE);
await forceUpdateCheck();
await waitFor(() => page.locator('#update-banner').count().then(c => c === 1), 15000);
await Promise.all([page.waitForNavigation({ timeout: 15000 }).catch(() => {}), page.click('#update-banner')]);
await page.waitForTimeout(1000);
const vs5 = await activeVersions();
ok(vs5.length === 1 && vs5[0] === 'h2sep-v9.0.5-test', 'exactly one shell cache after jump: ' + vs5.join(','));
ok(await sheetCached('101') && await sheetCached('102'), 'sheets intact after version jump');
const allCaches = await cacheNames();
ok(allCaches.every(k => k.startsWith('h2sep-v') || k === 'h2sep-sheets' || k === 'h2sep-refs'), 'no stray caches: ' + allCaches.join(','));

// ---------- PHASE 6: mixed-version deploy must be REFUSED ----------
step('PHASE 6 — CDN race: new sw.js but stale app files (skewed build)');
bumpVersion('h2sep-v9.0.6-test', { skew: true }); // config still says 9.0.5
await page.goto(BASE);
await forceUpdateCheck();
await page.waitForTimeout(2500);
ok(await page.locator('#update-banner').count() === 0, 'skewed build: no update banner (install refused)');
ok((await activeVersions())[0] === 'h2sep-v9.0.5-test', 'phone stays on last consistent version');
ok(await page.locator('.hero').count() === 1, 'app keeps working normally');
// CDN "settles": config catches up -> update must now land
bumpVersion('h2sep-v9.0.6-test');
await page.goto(BASE);
await forceUpdateCheck();
ok(await waitFor(() => page.locator('#update-banner').count().then(c => c === 1), 15000), 'consistent build: banner appears');
await Promise.all([page.waitForNavigation({ timeout: 15000 }).catch(() => {}), page.click('#update-banner')]);
await page.waitForTimeout(1000);
ok((await activeVersions())[0] === 'h2sep-v9.0.6-test', 'settled deploy installs cleanly');

// ---------- PHASE 7: update TAPPED while offline; new sheet arrives on signal ----------
step('PHASE 7 — new sheet ships; user taps update banner in a dead zone');
bumpVersion('h2sep-v9.0.7-test', { addSheet: '103' });
await page.goto(BASE);
await forceUpdateCheck();
await waitFor(() => page.locator('#update-banner').count().then(c => c === 1), 15000);
await ctx.setOffline(true); // dead-zone hallway
await Promise.all([page.waitForNavigation({ timeout: 15000 }).catch(() => {}), page.click('#update-banner')]);
await page.waitForTimeout(1500);
ok(await page.evaluate(() => document.querySelector('#app') && document.body.innerText.length > 50), 'NO white screen — app up right after offline update');
ok((await activeVersions())[0] === 'h2sep-v9.0.7-test', 'offline activation completed instantly');
ok(await sheetCached('101') && await sheetCached('102'), 'old sheets intact');
// NOTE: Playwright's offline emulation doesn't apply to service-worker network,
// so the SW may fetch 103 "through" the fake dead zone — either state is fine
// here; what matters is 103 is present after signal returns.
await ctx.setOffline(false); // walks back into signal
await page.waitForTimeout(500);
ok(await waitFor(() => sheetCached('103'), 15000), 'new sheet auto-downloads once in signal (no new version needed)');

// ---------- PHASE 8: live-mode cold start with returning user (regression: Floor-1 killer) ----------
step('PHASE 8 — LIVE mode cold start, returning user (no ?demo)');
const p8 = await ctx.newPage();
const p8errors = [];
p8.on('pageerror', e => p8errors.push(String(e)));
await p8.goto(`http://localhost:${PORT}/index.html`); // LIVE mode; Firestore unreachable here
await p8.waitForTimeout(3000);
ok(p8errors.length === 0, 'no crash on live cold start (was: TypeError killed Floor 1) ' + (p8errors[0] || ''));
ok(await p8.evaluate(() => document.body.innerText.length > 20), 'renders a sane screen while data loads');
await p8.close();

await browser.close();
try { process.kill(-server.pid); } catch {}
console.log(fails ? `\n${fails} FAILURES` : '\nLIFECYCLE: ALL PASS');
process.exit(fails ? 1 : 0);
