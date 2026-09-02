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

await p.goto(B + '#/bim', { waitUntil: 'networkidle' });
await p.waitForSelector('.mrow');
const mrows = await p.$$eval('.mrow b', r => r.map(x => x.textContent.trim()));
t('3D BIM hub lists floor-1 rooms only', mrows.length === 16 && mrows.every(n => n.startsWith('1')), mrows.length + ' rows: ' + mrows.join(','));
t('3D BIM hub says the upper floors have no models yet', (await p.textContent('body')).includes('Floors 2 to 4 (99 rooms)'));
await p.goto(B + '#/room/338', { waitUntil: 'networkidle' });
await p.waitForSelector('.pagehead');
t('room 338 offers no 3D model button', !(await p.$('a[href="#/bim/338"]')));
await p.goto(B + '#/room/105', { waitUntil: 'networkidle' });
await p.waitForSelector('.pagehead');
t('room 105 still offers its 3D model', !!(await p.$('a[href="#/bim/105"]')));
await p.goto(B + '#/room/110', { waitUntil: 'networkidle' });
await p.waitForSelector('.pagehead');
t('room 110 (King Studio) offers its 3D model', !!(await p.$('a[href="#/bim/110"]')));

await p.goto(B + '#/', { waitUntil: 'networkidle' });
await p.waitForSelector('.trades');
const trows = await p.$$eval('.trades .trow:not(.th)', rs => rs.map(r => ({ name: r.querySelector('.tn').textContent.trim(), pct: r.querySelector('.tp').textContent.trim(), frac: r.querySelector('.tf').textContent.replace(/\s+/g, ' ').trim(), fl: [...r.querySelectorAll('.tfl')].map(x => x.textContent.trim()) })));
t('the dashboard has a percent complete by trade table', trows.length > 8, String(trows.length));
t('FF&E leads the table with its families under it', trows[0].name === 'FF&E' && trows.slice(1, 4).every(r => !/^FF&E$/.test(r.name)), trows.slice(0, 4).map(r => r.name).join(','));
t('every MEP trade is a row', ['Mechanical', 'Electrical', 'Plumbing', 'Fire Sprinkler', 'Fire Alarm', 'Low Voltage'].every(n => trows.some(r => r.name === n)), trows.map(r => r.name).join(','));   // D52: Fire Protection became Fire Sprinkler + Fire Alarm on the guest rooms
t('every row shows a percent, a checked count and four floor cells', trows.every(r => /^\d+%$/.test(r.pct) && /^\d+ \/ \d+$/.test(r.frac) && r.fl.length === 4), JSON.stringify(trows[0]));
const ffe = trows[0];
t('the FF&E percent matches its checked count', Math.round(Number(ffe.frac.split(' / ')[0]) / Number(ffe.frac.split(' / ')[1]) * 100) + '%' === ffe.pct, `${ffe.frac} vs ${ffe.pct}`);

await p.goto(B + '#/prints', { waitUntil: 'networkidle' }); await p.waitForSelector('.rlist .room-row');
t('the Print sheets hub lists every room and common area', (await p.$$('.rlist .room-row')).length === 155, String((await p.$$('.rlist .room-row')).length));
t('the hub offers a packet per floor and the whole building', (await p.$$('a[href^="#/print-floor/"]')).length === 5);
await p.goto(B + '#/print/S221', { waitUntil: 'networkidle' }); await p.waitForSelector('.paper');
t('a common-area space has a print sheet with its MEP punch', /MEP PUNCH/.test(await p.textContent('.paper')) && /Space S221/.test(await p.textContent('.paper')));
await p.goto(B + '#/print/338', { waitUntil: 'networkidle' }); await p.waitForSelector('.paper');
const before338 = (await p.$$('.paper .p-box')).length;
const firstEmpty = await p.evaluate(() => { const d = window.__store.getDoc('338'); const id = Object.entries(d.items).find(([, it]) => !it.deleted && !it.checked && !it.issue && it.reliability !== 'FLAGGED')[0]; window.__store.check('338', id, true); return id; });
await p.waitForTimeout(300);
t('an open print sheet redraws when a line is checked', (await p.$$eval('.paper .p-box', b => b.filter(x => x.textContent.trim() === 'TU').length)) === 1 && (await p.$$('.paper .p-box')).length === before338, firstEmpty);
await p.evaluate((id) => window.__store.check('338', id, false), firstEmpty);
await p.goto(B + '#/print-floor/2', { waitUntil: 'networkidle' }); await p.waitForSelector('.paper');
t('the floor 2 packet holds 36 sheets with page breaks', (await p.$$('.paper')).length === 36 && (await p.$$('.p-break')).length >= 35, String((await p.$$('.paper')).length));
await p.goto(B + '#/space/S221', { waitUntil: 'networkidle' }); await p.waitForSelector('.pagehead');
t('a common area has a Print sheet button', !!(await p.$('a[href="#/print/S221"]')));

console.log('\nRESOLVED ISSUES ARE NOT FLAGS (D50)');
await p.goto(B + '#/room/404', { waitUntil: 'networkidle' }); await p.waitForSelector('.item-row');
await p.evaluate(() => document.querySelectorAll('.scrim').forEach(s => s.remove()));   // the identity sheet from the first load of this test run
const rid = await p.evaluate(() => { const d = window.__store.getDoc('404'); const id = Object.entries(d.items).find(([, it]) => !it.deleted && !it.checked && !it.issue && it.reliability !== 'FLAGGED')[0]; window.__store.setIssue('404', id, 'MISSING'); return id; });
await p.waitForTimeout(200);
const openBefore = await p.evaluate(() => window.__store.roomStats(window.__store.getDoc('404')).openIssues);
t('an open issue shows a red pill and counts', !!(await p.$(`.item-row[data-item="${rid}"] .issue-pill`)) && openBefore >= 1);
await p.evaluate((id) => window.__store.resolveIssue('404', id), rid); await p.waitForTimeout(400);
t('a resolved issue shows no flag pill', !(await p.$(`.item-row[data-item="${rid}"] .issue-pill`)) && !!(await p.$(`.item-row[data-item="${rid}"] .issue-done`)));
t('a resolved issue counts nowhere on the room', (await p.evaluate(() => window.__store.roomStats(window.__store.getDoc('404')).openIssues)) === openBefore - 1);
const tap2 = async (sel) => p.evaluate((s) => { const r = document.querySelector(s); r.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 5, clientY: 5 })); r.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, clientX: 5, clientY: 5 })); }, sel);
await tap2(`.item-row[data-item="${rid}"]`); await p.waitForTimeout(500);
t('tapping a line with a resolved issue checks it instead of opening the issue sheet', !!(await p.$(`.item-row[data-item="${rid}"] .stamp.checked`)) && !(await p.$('.sheet')), `sheet=${!!(await p.$('.sheet'))} checked=${await p.evaluate((id) => window.__store.getDoc('404').items[id].checked, rid)} hash=${await p.evaluate(() => location.hash)} row=${await p.$eval(`.item-row[data-item="${rid}"]`, r => r.className).catch(() => 'missing')}`);
await p.goto(B + '#/', { waitUntil: 'networkidle' }); await p.waitForSelector('.trades');
const openCells = await p.$$eval('.trades .trow.head .ti', c => c.map(x => x.textContent.trim()));
t('the trade table renders open-issue counts', openCells.length > 0);
await p.evaluate((id) => { window.__store.check('404', id, false); window.__store.setIssue('404', id, ''); }, rid);

console.log('\nITEM STATUS BOARD');
await p.goto(B + '#/', { waitUntil: 'networkidle' }); await p.waitForSelector('.istat');
const kv = await p.$$eval('.istat-kpis .kpi', k => Object.fromEntries(k.map(x => [x.querySelector('.kl').textContent.trim(), Number(x.querySelector('.kv').textContent.trim().split(' ')[0])])));
t('the item status board shows the pending, missing, in box and need install counts', ['Pending', 'Missing', 'In box', 'Need install', 'Installed'].every(k => Number.isFinite(kv[k])) && kv.Missing > 100 && kv['In box'] > 0, JSON.stringify(kv));
const truth = await p.evaluate(() => { let miss = 0, pend = 0; for (const [id, d] of Object.entries(window.__store.docs)) { if (id.startsWith('_')) continue; for (const it of Object.values(d.items)) { if (it.deleted) continue; const open = it.issue && !it.issueResolved; if (it.optional && !it.checked && !open) continue; /* D52: an if-needed line joins the count only once acted on */ if (open && it.issue === 'MISSING') miss++; if (!it.checked && !open) pend++; } } return { miss, pend }; });
t('its counts match a direct count of the store', kv.Missing === truth.miss && kv.Pending === truth.pend, JSON.stringify({ kv, truth }));
const nrows = await p.$$eval('.istat-t tr[data-key]', r => r.length);
t('every distinct line has a row', nrows > 100, String(nrows));
await p.fill('.istat [data-filter]', 'PTAC'); await p.waitForTimeout(900); await p.waitForFunction(() => [...document.querySelectorAll('.istat-t tr[data-key] .tn')].every(x => /PTAC/i.test(x.textContent)) && document.querySelectorAll('.istat-t tr[data-key]').length > 0, null, { timeout: 5000 }).catch(() => {});
t('the filter narrows the rows', (await p.$$eval('.istat-t tr[data-key]', r => r.length)) < 40 && (await p.$$eval('.istat-t tr[data-key] .tn', r => r.length > 0 && r.every(x => /PTAC/i.test(x.textContent)))), String(await p.$$eval('.istat-t tr[data-key]', r => r.length)));
await p.click('.istat-t tr[data-key]'); await p.waitForSelector('.bulk-scope');
t('tapping a row opens Bulk mark with that tag picked', (await p.$$('.taglist input:checked')).length === 1 && /will change|left alone|Nothing to apply|Apply/.test(await p.textContent('.bulk-scope')));
await p.evaluate(() => sessionStorage.removeItem('h2sep-p-istat'));

console.log('\nBUILD NOTES ARE NOT CREW FLAGS (D55)');
await p.goto(B + '#/room/438', { waitUntil: 'networkidle' }); await p.waitForSelector('.pagehead');
const noteBtn = await p.$eval('[data-note]', b => b.textContent.trim());
t('room 438 counts only crew and office notes in its header', /Room notes( · [1-3])?$/.test(noteBtn), noteBtn);
const st438 = await p.evaluate(() => window.__store.roomStats(window.__store.getDoc('438')));
const n438 = await p.evaluate(() => { const d = window.__store.getDoc('438'); const notes = Object.entries(d.notes || {}).filter(([, n]) => n.flag === 'issue' && !n.resolved); const build = notes.filter(([id, n]) => /^n_/.test(id) && !(n.by || n.createdBy)).length; const items = Object.values(d.items).filter(it => !it.deleted && it.issue && !it.issueResolved).length; return { red: notes.length, build, items }; });
t('build notes do not count as open issues', n438.build >= 3 && st438.openIssues === n438.items + (n438.red - n438.build), JSON.stringify({ ...n438, openIssues: st438.openIssues }));

t('no page or console errors', errs.length === 0, errs.slice(0, 3).join(' ; '));
await b.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
