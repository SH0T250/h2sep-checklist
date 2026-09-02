// Bulk marking on the platform dashboard, in a real browser, LOCAL MODE ONLY
// (window.__H2SEP_NO_BACKEND): every write lands in the local patch log, so
// the test can read back exactly what a bulk apply wrote and what undo undid,
// and nothing here can touch Firestore.
//
//   (cd platform && python3 -m http.server 8343 &) ; node tests/bulk-ui.mjs
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
const log = () => p.evaluate(() => JSON.parse(localStorage.getItem('h2sep-platform-v1') || '[]'));
const tap = async (sel) => p.evaluate((s) => {
  const r = document.querySelector(s); if (!r) return false;
  r.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 5, clientY: 5 }));
  r.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, clientX: 5, clientY: 5 }));
  return true;
}, sel);

// Identity and local mode are set BEFORE any page script runs, so the identity
// sheet never opens over the checklist and no patch log from an earlier run
// leaks in.
await p.addInitScript(() => {
  window.__H2SEP_NO_BACKEND = true;
  if (!sessionStorage.getItem('h2sep-bulk-test')) { localStorage.removeItem('h2sep-platform-v1'); sessionStorage.setItem('h2sep-bulk-test', '1'); }
  localStorage.setItem('h2sep-platform-user', JSON.stringify({ name: 'Test User', initials: 'TU', company: 'Triun, LLC' }));
  sessionStorage.setItem('h2sep-id-prompted', '1');
});

console.log('\nIN-ROOM SELECT MODE');
// Room 403 on floor 4: the crew holds almost no check-offs there, so there are clean lines.
await p.goto(B + '#/room/403', { waitUntil: 'networkidle' });
await p.waitForSelector('.item-row');
t('a Select lines button is on the checklist card', !!(await p.$('[data-bulk]')));
await p.click('[data-bulk]');
await p.waitForSelector('.item-row.selectable');
t('rows become selectable', (await p.$$('.item-row.selectable')).length > 10);
t('a bulk bar appears with zero selected', /0 selected/.test(await p.textContent('.bulkbar')));
// pick every line in the first category with the category toggle
await p.click('.cat-head .pickall');
const picked = await p.$$eval('.item-row.picked', r => r.length);
t('category select-all picks every line in that category', picked > 0, String(picked));
t('the bulk bar counts them', (await p.textContent('.bulkbar .cnt')).includes(`${picked} selected`), await p.textContent('.bulkbar .cnt'));
// tapping a picked row unpicks it
await tap('.item-row.picked');
t('tapping a picked row unpicks it', (await p.$$('.item-row.picked')).length === picked - 1);
await tap('.item-row.selectable:not(.picked)');
t('tapping a row picks it again', (await p.$$('.item-row.picked')).length === picked);
const before = (await log()).length;
await p.click('.bulkbar [data-act="check"]');
await p.waitForSelector('.sheet .preview');
const ph = await p.textContent('.sheet .preview .ph');
t('the confirm sheet previews a count', /\d+ will change/.test(ph), ph);
const willChange = Number((ph.match(/(\d+) will change/) || [])[1] || 0);
t('the confirm sheet names lines left alone with a reason, or says none', /left alone|Nothing left alone/.test(await p.textContent('.sheet')));
await p.click('.sheet [data-apply]');
await p.waitForTimeout(300);
const after = await log();
t('apply writes ONE patch for the document', after.length === before + 1, `${after.length - before} patch(es)`);
const patch = after[after.length - 1]?.patch || {};
const checkedKeys = Object.keys(patch).filter(k => k.endsWith('.checked'));
t('the patch checks exactly the previewed lines', checkedKeys.length === willChange && checkedKeys.every(k => patch[k] === true), `${checkedKeys.length} vs ${willChange}`);
t('every checked line carries the complete field group', checkedKeys.every(k => { const p0 = k.replace(/checked$/, ''); return patch[p0 + 'initials'] === 'TU' && patch[p0 + 'checkedByCo'] === 'Triun, LLC' && !!patch[p0 + 'checkedAt'] && !!patch[p0 + 'checkedAtLocal']; }));
t('the rows now show the initials', (await p.$$eval('.item-row .stamp.checked', s => s.map(x => x.textContent.trim()).filter(x => x === 'TU').length)) >= willChange);
t('a toast offers Undo', !!(await p.$('.toast button')));
await p.click('.toast button');
await p.waitForTimeout(300);
const afterUndo = await log();
t('undo writes one inverse patch that unchecks the same lines', afterUndo.length === after.length + 1 && Object.keys(afterUndo[afterUndo.length - 1].patch).filter(k => k.endsWith('.checked')).every(k => afterUndo[afterUndo.length - 1].patch[k] === false));
t('after undo no line shows TU', (await p.$$eval('.item-row .stamp.checked', s => s.filter(x => x.textContent.trim() === 'TU').length)) === 0);
t('select mode closed after apply', !(await p.$('.bulkbar')));

console.log('\nRULES THAT PROTECT OTHER PEOPLE\'S WORK');
// Room 205 on floor 2 has crew check-offs by other initials and open issues.
await p.goto(B + '#/room/205', { waitUntil: 'networkidle' });
await p.waitForSelector('.item-row');
await p.click('[data-bulk]');
await p.waitForSelector('.item-row.selectable');
await p.$$eval('.cat-head .pickall', els => els.forEach(e => e.click()));
const all = await p.$$eval('.item-row.picked', r => r.length);
await p.click('.bulkbar [data-act="check"]');
await p.waitForSelector('.sheet .preview');
const sheetText = await p.textContent('.sheet');
t('lines checked by someone else are left alone and say so', /checked by someone else/.test(sheetText));
t('lines with an open issue are left alone and say so', /open issue/.test(sheetText));
const n0 = Number((sheetText.match(/(\d+) will change/) || [])[1] || 0);
await p.click('.sheet [data-overwrite]');
await p.waitForTimeout(150);
const n1 = Number(((await p.textContent('.sheet')).match(/(\d+) will change/) || [])[1] || 0);
t('the restamp option is off by default and raises the count when turned on', n1 > n0, `${n0} -> ${n1}`);
await p.click('.sheet [data-close]');
await p.click('.bulkbar [data-act="cancel"]');
t('cancel leaves the selection', !(await p.$('.bulkbar')) && all > 0);

console.log('\nBULK MARK ACROSS ROOMS');
await p.goto(B + '#/bulk', { waitUntil: 'networkidle' });
await p.waitForSelector('.bulk-scope');
t('the Bulk mark screen renders', /Bulk mark/.test(await p.textContent('h1')));
await p.click('.bulk-scope [data-floor="4"]');
await p.waitForTimeout(150);
t('floor 4 scope reports 33 rooms', /33 rooms/.test(await p.textContent('.bulk-scope')), (await p.textContent('.bulk-scope')).match(/\d+ rooms/)?.[0]);
// pick the first tag whose preview has something to change (a flagged tag or
// one with open issues on every key is legitimately all "left alone")
let firstTag = '', ph2 = '';
const nTags = await p.$$eval('.taglist label', l => l.length);
for (let i = 0; i < Math.min(nTags, 12); i++) {
  await p.click(`.taglist label:nth-child(${i + 1}) input`);
  await p.waitForSelector('.preview');
  ph2 = await p.textContent('.preview .ph');
  firstTag = await p.$eval(`.taglist label:nth-child(${i + 1})`, l => l.textContent.trim().slice(0, 30));
  if (Number((ph2.match(/(\d+) will change/) || [])[1] || 0) > 0) break;
  await p.click(`.taglist label:nth-child(${i + 1}) input`);
  await p.waitForTimeout(100);
}
t('the preview counts lines across rooms for the picked tag', /\d+ will change/.test(ph2) && /room/.test(ph2), `${firstTag}: ${ph2}`);
const want = Number((ph2.match(/(\d+) will change/) || [])[1] || 0);
const b0 = (await log()).length;
await p.click('[data-apply]');
await p.waitForTimeout(400);
const l2 = await log();
const newPatches = l2.slice(b0);
t('apply writes one patch per room document', newPatches.length > 1 && new Set(newPatches.map(x => x.docId)).size === newPatches.length, `${newPatches.length} patches`);
t('the patches check the previewed number of lines', newPatches.reduce((n, x) => n + Object.keys(x.patch).filter(k => k.endsWith('.checked')).length, 0) === want);
t('a toast offers Undo across rooms', !!(await p.$('.toast button')));
await p.click('.toast button');
await p.waitForTimeout(400);
const l3 = await log();
t('undo reverses every room document', l3.length === l2.length + newPatches.length);
await p.goto(B + '#/activity', { waitUntil: 'networkidle' });
t('the activity log records the bulk edits and the undo', /bulk/.test(await p.textContent('body')) && /undid bulk/.test(await p.textContent('body')));

t('no page or console errors', errs.length === 0, errs.slice(0, 3).join(' ; '));
await b.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
