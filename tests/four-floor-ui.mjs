import { chromium } from '/tmp/claude-0/-home-user-h2sep-checklist/18be7c92-db26-548f-a957-ab5e606c8fa1/scratchpad/node_modules/playwright-core/index.mjs';
const EXE = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const B = 'http://localhost:8343/';
const b = await chromium.launch({ executablePath: EXE });
const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => { if (cond) { pass++; console.log('  PASS  ' + name); } else { fail++; console.log('  FAIL  ' + name + (detail ? '  ' + detail : '')); } };

// Local mode only: the seed files must carry all four floors on their own.
await p.addInitScript(() => { window.__H2SEP_NO_BACKEND = true; });
await p.goto(B, { waitUntil: 'networkidle' });
await p.evaluate(() => { localStorage.setItem('h2sep-platform-user', JSON.stringify({ name: 'Test User', initials: 'TU', company: 'Triun, LLC' })); sessionStorage.setItem('h2sep-id-prompted', '1'); });
await p.goto(B + '#/', { waitUntil: 'networkidle' });
await p.waitForSelector('.room-row', { timeout: 20000 });
const body = await p.textContent('body');
t('sidebar says FLOORS 1-4 LIVE', body.includes('FLOORS 1-4 LIVE'));
t('dashboard note says floors 1 to 4', /Floors 1 to 4: 115 guest rooms built/.test(body), body.match(/Floors? [^.]*guest rooms built\./)?.[0]);
const rows = await p.$$eval('.room-row', r => r.length);
t('115 guest rooms listed on the dashboard', rows === 115, String(rows));
const heads = await p.$$eval('.rlist-floor', r => r.map(x => x.textContent.trim()));
t('four floor headings in order', heads.join('|') === 'Floor 1|Floor 2|Floor 3|Floor 4', heads.join('|'));
t('% of floors 1 to 4 on the KPI', body.includes('% of floors 1 to 4'));

await p.goto(B + '#/rooms', { waitUntil: 'networkidle' });
await p.waitForSelector('.room-row');
const sub = await p.textContent('.pagehead .sub');
t('rooms page subtitle', /115 guest rooms on floors 1 to 4/.test(sub), sub);

await p.goto(B + '#/room/338', { waitUntil: 'networkidle' });
await p.waitForSelector('.pagehead');
const r338 = await p.textContent('body');
t('room 338 opens (QQ Acc., floor 3)', /ROOM 338|Room 338/.test(r338) && /Floor 3/.test(r338));
t('room 338 shows GR-309 working wall', r338.includes('GR-309'));

await p.goto(B + '#/room/438?view=mep', { waitUntil: 'networkidle' });
await p.waitForSelector('.pagehead');
const r438 = await p.textContent('body');
t('room 438 MEP view opens on floor 4', /Floor 4/.test(r438));

await p.goto(B + '#/common', { waitUntil: 'networkidle' });
await p.waitForSelector('.room-row');
const cbody = await p.textContent('body');
const cheads = await p.$$eval('.rlist-floor', r => r.map(x => x.textContent.trim()));
t('common areas span floors 1 to 4', /spaces on floors 1 to 4/.test(cbody), cbody.match(/\d+ spaces on [^·]*/)?.[0]);
t('common areas grouped by floor', cheads.join('|') === 'Floor 1|Floor 2|Floor 3|Floor 4', cheads.join('|'));

t('no page or console errors', errs.length === 0, errs.slice(0, 3).join(' ; '));
await b.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
