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

console.log('\nREVIEW FINDINGS, FIXED AT THE MECHANISM');
// (1) Undo never overwrites a line someone changed since the bulk.
await p.goto(B + '#/room/407', { waitUntil: 'networkidle' });
await p.waitForSelector('.item-row');
await p.click('[data-bulk]'); await p.waitForSelector('.item-row.selectable');
await p.click('.cat-head .pickall');
await p.click('.bulkbar [data-act="check"]'); await p.waitForSelector('.sheet .preview');
const n407 = Number(((await p.textContent('.sheet .preview .ph')).match(/(\d+) will change/) || [])[1] || 0);
await p.click('.sheet [data-apply]'); await p.waitForTimeout(300);
// a crew phone unchecks one of those lines in between
const changedId = await p.evaluate(() => { const l = JSON.parse(localStorage.getItem('h2sep-platform-v1')); const last = l[l.length - 1]; const k = Object.keys(last.patch).find(x => x.endsWith('.checked')); const itemId = k.split('.')[1]; window.__store.check(last.docId, itemId, false); return itemId; });
await p.waitForTimeout(200);
const undoLen0 = (await log()).length;
await p.click('.toast button'); await p.waitForTimeout(400);
const undoPatch = (await log()).slice(undoLen0).pop()?.patch || {};
t('undo skips the line changed since and reverts the rest', !Object.keys(undoPatch).some(k => k.startsWith('items.' + changedId + '.')) && Object.keys(undoPatch).filter(k => k.endsWith('.checked')).length === n407 - 1, `${Object.keys(undoPatch).filter(k => k.endsWith('.checked')).length} of ${n407}`);
t('the undo toast says one line was left alone', /1 left alone/.test(await p.textContent('.toast')), await p.textContent('.toast'));
// (2) ABSENT: a field the line never had does not come back as null
const absentOk = await p.evaluate((id) => { const d = window.__store.getDoc('407'); return Object.values(d.items).filter(it => !it.deleted && !it.checked).every(it => !('checkedByCo' in it) || it.checkedByCo === ''); }, changedId);
t('undo restores absent fields as absent, never null', absentOk);
// (3) Re-plan at Apply: the checklist moves between preview and Apply
await p.goto(B + '#/room/409', { waitUntil: 'networkidle' }); await p.waitForSelector('.item-row');
await p.click('[data-bulk]'); await p.waitForSelector('.item-row.selectable'); await p.click('.cat-head .pickall');
await p.click('.bulkbar [data-act="check"]'); await p.waitForSelector('.sheet .preview');
await p.evaluate(() => { const clean = [...document.querySelectorAll('.item-row.picked')].find(r => !r.querySelector('.stamp.checked') && !r.querySelector('.issue-pill') && !r.classList.contains('flagged')); window.__store.setIssue('409', clean.dataset.item, 'DAMAGED'); });
const lenBefore = (await log()).length;
await p.click('.sheet [data-apply]'); await p.waitForTimeout(300);
t('Apply re-plans and refuses a stale preview', (await log()).length === lenBefore && /changed since the preview/.test(await p.textContent('.toast')));
t('the sheet re-rendered with the new count', /open issue/.test(await p.textContent('.sheet')));
await p.click('.sheet [data-close]'); await p.click('.bulkbar [data-act="cancel"]');
// (4) Flag an issue previews how many lines lose an existing issue text
await p.goto(B + '#/room/205', { waitUntil: 'networkidle' }); await p.waitForSelector('.item-row');
await p.click('[data-bulk]'); await p.waitForSelector('.item-row.selectable'); await p.click('.cat-head .pickall');
await p.click('.bulkbar [data-act="setIssue"]'); await p.waitForSelector('.sheet .qp');
await p.click('.sheet .qp[data-q="DAMAGED"]'); await p.click('.sheet [data-next]'); await p.waitForSelector('.sheet .preview');
t('flagging over an existing issue says how many texts are replaced', /will have their issue text replaced/.test(await p.textContent('.sheet .preview .ph')) && /replaces "MISSING"/.test(await p.textContent('.sheet')));
await p.click('.sheet [data-close]'); await p.click('.bulkbar [data-act="cancel"]');
// (5) No identity: the Bulk screen must not crash, and the plan says why
await p.evaluate(() => localStorage.removeItem('h2sep-platform-user'));
await p.goto(B + '#/bulk', { waitUntil: 'networkidle' }); await p.waitForTimeout(300);
await p.evaluate(() => { document.querySelector('.scrim')?.remove(); });
t('the Bulk screen renders without an identity', !!(await p.$('.bulk-scope')));
t('without an identity every stamping line is left alone with "set your initials first"', /set your initials first/.test(await p.textContent('.bulk-scope')));
t('disabled buttons look disabled', await p.$eval('[data-apply]', b => b.disabled && getComputedStyle(b).opacity !== '1' || b.disabled && getComputedStyle(b).backgroundColor !== 'rgb(2, 169, 222)'));
await p.evaluate(() => localStorage.setItem('h2sep-platform-user', JSON.stringify({ name: 'Test User', initials: 'TU', company: 'Triun, LLC' })));
// (6) Tag rows merge codes that share a label
await p.goto(B + '#/bulk', { waitUntil: 'networkidle' }); await p.waitForSelector('.bulk-scope');
await p.evaluate(() => sessionStorage.setItem('h2sep-p-bulkq', JSON.stringify({ floors: [2], types: [], kind: 'mep', cats: ['Mechanical'], codes: [], action: 'check', text: '' })));
await p.goto(B + '#/bulk', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForSelector('.taglist label');
const labels = await p.$$eval('.taglist label', ls => ls.map(l => l.textContent.replace(/\s+/g, ' ').trim()));
t('one PTAC row covers every PTAC code on the floor', labels.filter(l => /PTAC installed and working/.test(l)).length === 1 && labels.some(l => /PTAC.*\/.*PTAC installed and working/.test(l)), labels.filter(l => /PTAC unit/.test(l)).join(' | '));   // D52 label
const ptacIdx = labels.findIndex(l => /PTAC installed and working/.test(l));
await p.click(`.taglist label:nth-child(${ptacIdx + 1}) input`); await p.waitForSelector('.preview');
const ptacWant = Number(((await p.textContent('.preview .ph')).match(/(\d+) will change/) || [])[1] || 0);
await p.click('[data-apply]'); await p.waitForTimeout(400);
t('the merged PTAC row applies across every code it covers', ptacWant > 2 && /Done/.test(await p.textContent('.preview.done')), `${ptacWant} lines`);
t('the Undo last bulk edit button is offered after a bulk', !!(await p.$('[data-undo-last]')));
await p.click('[data-undo-last]'); await p.waitForTimeout(400);
t('Undo last bulk edit reverts it and says so', /Undone/.test(await p.textContent('.preview.done')));

console.log('\nQA ATTACKER FINDINGS, FIXED');
await p.evaluate(() => sessionStorage.setItem('h2sep-p-bulkq', JSON.stringify({ floors: [4], types: [], kind: 'ffe', cats: ['Bath Accessory'], codes: [], action: 'setIssue', text: '' })));
await p.goto(B + '#/bulk', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForSelector('.taglist label');
await p.click('.taglist label:nth-child(1) input'); await p.waitForSelector('.preview');
t('Flag an issue with no text: Apply is disabled and says why', await p.$eval('[data-apply]', b => b.disabled && /Pick an issue first/.test(b.textContent)));
t('with no text every line is left alone with the reason', /pick an issue or type one first/.test(await p.textContent('.preview')));
const pickedKey = await p.$eval('.taglist label:nth-child(1) input', i => i.dataset.code);
await p.click('.bulk-scope [data-cat="Bath Accessory"]'); await p.waitForTimeout(150);
await p.click('.bulk-scope [data-cat="Appliance"]'); await p.waitForTimeout(150);
t('a picked tag stays on screen when the category chips would hide it', !!(await p.$(`.taglist input[data-code="${pickedKey}"]:checked`)));
await p.fill('[data-filter]', 'zzzz'); await p.waitForTimeout(500);
t('a picked tag stays on screen when the filter would hide it', !!(await p.$(`.taglist input[data-code="${pickedKey}"]:checked`)));
await p.goto(B + '#/room/403', { waitUntil: 'networkidle' }); await p.waitForSelector('.item-row');
await p.click('[data-bulk]'); await p.waitForSelector('.item-row.selectable');
await p.click('.cat-head .pickall'); await p.evaluate(() => window.__store._emit()); await p.waitForTimeout(150);
t('the category button reads CLEAR after a re-render while its lines are picked', /clear/i.test(await p.textContent('.cat-head .pickall')) && (await p.$$('.item-row.picked')).length > 0);
await p.focus('.cat-head .pickall'); await p.keyboard.press('Enter'); await p.waitForTimeout(100);
t('the category button works from the keyboard', (await p.$$('.item-row.picked')).length === 0);
t('no dead selection boxes in the markup', (await p.$$('.item-row .pick')).length === 0);
await p.click('.bulkbar [data-act="cancel"]');

console.log('\nONE-TAP FLAGS AND SCROLL');
await p.goto(B + '#/room/403', { waitUntil: 'networkidle' }); await p.waitForSelector('.item-row');
await p.click('[data-bulk]'); await p.waitForSelector('.item-row.selectable');
t('the bulk bar offers Missing and In box one-tap flags', !!(await p.$('.bulkbar [data-act="flag:MISSING"]')) && !!(await p.$('.bulkbar [data-act="flag:IN BOX"]')));
await p.click('.cat-head .pickall');
await p.click('.bulkbar [data-act="flag:IN BOX"]'); await p.waitForSelector('.sheet .preview');
t('In box goes straight to a preview titled with the text', /Flag an issue · IN BOX/.test(await p.textContent('.sheet .sh')), await p.textContent('.sheet .sh'));
const lenF = (await log()).length;
await p.click('.sheet [data-apply]'); await p.waitForTimeout(300);
const fp = (await log()).slice(lenF)[0]?.patch || {};
t('the flag writes IN BOX on every previewed line', Object.keys(fp).filter(k => k.endsWith('.issue')).length > 0 && Object.keys(fp).filter(k => k.endsWith('.issue')).every(k => fp[k] === 'IN BOX'));
await p.click('.toast button'); await p.waitForTimeout(300);
// scroll: checking a line at the bottom of a long checklist keeps the position
await p.goto(B + '#/room/406', { waitUntil: 'networkidle' }); await p.waitForSelector('.item-row');
await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await p.waitForTimeout(200);
const y0 = await p.evaluate(() => window.scrollY);
const clean = await p.evaluate(() => { const rows = [...document.querySelectorAll('.item-row')].reverse(); const r = rows.find(x => !x.querySelector('.stamp.checked') && !x.querySelector('.issue-pill') && !x.classList.contains('flagged')); r.scrollIntoView(); return r.dataset.item; });
const yBefore = await p.evaluate(() => window.scrollY);
await tap(`.item-row[data-item="${clean}"]`); await p.waitForTimeout(400);
const yAfter = await p.evaluate(() => window.scrollY);
t('checking a line keeps the scroll position', Math.abs(yAfter - yBefore) < 40 && yBefore > 300, `${yBefore} -> ${yAfter} (page bottom ${y0})`);
t('the line shows as checked', !!(await p.$(`.item-row[data-item="${clean}"] .stamp.checked`)));

await p.evaluate(() => sessionStorage.setItem('h2sep-p-bulkq', JSON.stringify({ floors: [4], types: [], kind: 'ffe', cats: ['Appliance'], codes: [], action: 'check', text: '' })));
await p.goto(B + '#/bulk', { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForSelector('.taglist label');
t('the Do what row offers Missing and In box chips', !!(await p.$('[data-action="setIssue"][data-preset="MISSING"]')) && !!(await p.$('[data-action="setIssue"][data-preset="IN BOX"]')));
await p.click('[data-preset="IN BOX"]'); await p.waitForTimeout(200);
await p.click('.taglist label:nth-child(1) input'); await p.waitForSelector('.preview');
t('In box chip arms a flag with the text set, and the preview counts lines', await p.$eval('[data-preset="IN BOX"]', b => b.classList.contains('on')) && /\d+ will change/.test(await p.textContent('.preview .ph')) && !(await p.$eval('[data-apply]', b => b.disabled)));

console.log('\nWHOLE FLOOR AFTER A CHECK (D57)');
await p.goto(B + '#/room/405', { waitUntil: 'networkidle' }); await p.waitForSelector('.item-row');
const cleanId = await p.evaluate(() => { const r = [...document.querySelectorAll('.item-row')].find(x => !x.querySelector('.stamp.checked') && !x.querySelector('.issue-pill') && !x.classList.contains('flagged')); return r.dataset.item; });
await tap(`.item-row[data-item="${cleanId}"]`); await p.waitForSelector('.toast');
const tb = await p.$$eval('.toast button', b => b.map(x => x.textContent.trim()));
t('the check toast offers Undo and Whole floor 4', tb.includes('Undo') && tb.includes('Whole floor 4'), tb.join('|'));
await p.click('.toast button:nth-child(3), .toast button:last-child'); await p.waitForSelector('.sheet .preview');
const wf = await p.textContent('.sheet .preview .ph');
t('Whole floor previews the other rooms on the floor', /will change in \d+ rooms/.test(wf) && /other room/.test(await p.textContent('.sheet .sh')), wf);
const nWf = Number((wf.match(/(\d+) will change/) || [])[1] || 0);
const lenWf = (await log()).length;
await p.click('.sheet [data-apply]'); await p.waitForTimeout(500);
const newWf = (await log()).slice(lenWf);
t('apply writes one patch per other room and checks exactly the previewed lines', newWf.length > 1 && newWf.reduce((n, x) => n + Object.keys(x.patch).filter(k => k.endsWith('.checked')).length, 0) === nWf && !newWf.some(x => x.docId === '405'), `${newWf.length} patches, ${nWf} lines`);
await p.click('.toast button'); await p.waitForTimeout(400);
t('undo reverses the floor', (await log()).length === lenWf + newWf.length * 2);
await p.evaluate((id) => window.__store.check('405', id, false), cleanId);

console.log('\nWHOLE FLOOR ON EVERY KIND OF LINE (D58)');
const cleanRow = () => p.evaluate(() => { const r = [...document.querySelectorAll('.item-row')].find(x => !x.querySelector('.stamp.checked') && !x.querySelector('.issue-pill') && !x.classList.contains('flagged')); return r ? r.dataset.item : null; });
const toastButtons = () => p.$$eval('.toast button', b => b.map(x => x.textContent.trim()));
// MEP punch line in room 405: the floor offer walks the other rooms' punch docs only.
await p.goto(B + '#/room/405?view=mep', { waitUntil: 'networkidle' }); await p.waitForSelector('.item-row');
const mepId = await cleanRow();
await tap(`.item-row[data-item="${mepId}"]`); await p.waitForSelector('.toast');
t('an MEP punch check offers Whole floor 4', (await toastButtons()).includes('Whole floor 4'), (await toastButtons()).join('|'));
await p.click('.toast button:last-child'); await p.waitForSelector('.sheet .preview');
t('the MEP preview walks the other rooms', /other room/.test(await p.textContent('.sheet .sh')));
const lenMep = (await log()).length;
await p.click('.sheet [data-apply]'); await p.waitForTimeout(500);
const newMep = (await log()).slice(lenMep);
t('MEP apply writes only to other punch docs on floor 4', newMep.length > 1 && newMep.every(x => /^4\d\d-MEP$/.test(x.docId) && x.docId !== '405-MEP'), newMep.map(x => x.docId).join(','));
await p.click('.toast button'); await p.waitForTimeout(400);
t('MEP undo reverses the floor', (await log()).length === lenMep + newMep.length * 2);
await p.evaluate((id) => window.__store.check('405-MEP', id, false), mepId);
// Common area S421 on floor 4: the floor offer walks the other common areas only.
await p.goto(B + '#/space/S421', { waitUntil: 'networkidle' }); await p.waitForSelector('.item-row');
const spId = await cleanRow();
await tap(`.item-row[data-item="${spId}"]`); await p.waitForSelector('.toast');
t('a common-area check offers Whole floor 4', (await toastButtons()).includes('Whole floor 4'), (await toastButtons()).join('|'));
await p.click('.toast button:last-child'); await p.waitForTimeout(400);
const spSheet = !!(await p.$('.sheet .preview'));
if (spSheet) {
  t('the common-area preview walks the other common areas', /other common area/.test(await p.textContent('.sheet .sh')));
  const lenSp = (await log()).length;
  await p.click('.sheet [data-apply]'); await p.waitForTimeout(500);
  const newSp = (await log()).slice(lenSp);
  t('common-area apply writes only to other floor-4 common areas', newSp.length >= 1 && newSp.every(x => /^S4\d\d$/.test(x.docId) && x.docId !== 'S421'), newSp.map(x => x.docId).join(','));
  await p.click('.toast button'); await p.waitForTimeout(400);
  t('common-area undo reverses the floor', (await log()).length === lenSp + newSp.length * 2);
} else {
  t('the common-area line is carried by another floor-4 common area', false, 'no preview sheet: ' + (await p.textContent('.toast').catch(() => '')));
}
await p.evaluate((id) => window.__store.check('S421', id, false), spId);
// A flagged line opens its sheet instead of checking; the stamp inside the sheet offers the floor too.
await p.goto(B + '#/room/405', { waitUntil: 'networkidle' }); await p.waitForSelector('.item-row');
const flId = await p.evaluate(() => { const r = [...document.querySelectorAll('.item-row.flagged')].find(x => !x.querySelector('.stamp.checked')); return r ? r.dataset.item : null; });
await tap(`.item-row[data-item="${flId}"]`); await p.waitForSelector('.sheet [data-check]');
await p.click('.sheet [data-check]'); await p.waitForSelector('.toast');
t('the line sheet stamp offers Undo and Whole floor 4', (await toastButtons()).includes('Undo') && (await toastButtons()).includes('Whole floor 4'), (await toastButtons()).join('|'));
t('the sheet closed and the flagged line is checked', !(await p.$('.sheet')) && (await p.evaluate((id) => !!window.__store.getDoc('405').items[id].checked, flId)));
await p.click('.toast button:first-child'); await p.waitForTimeout(300);
t('Undo from the sheet toast unchecks it', await p.evaluate((id) => !window.__store.getDoc('405').items[id].checked, flId));

console.log('\nFLAG THE WHOLE FLOOR FROM THE LINE SHEET (D59)');
await p.goto(B + '#/room/405', { waitUntil: 'networkidle' }); await p.waitForSelector('.item-row');
const isId = await cleanRow();
// press and hold opens the sheet on a clean line
await p.evaluate((id) => { const r = document.querySelector(`.item-row[data-item="${id}"]`); r.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: 5, clientY: 5 })); }, isId);
await p.waitForTimeout(700);
await p.evaluate((id) => { const r = document.querySelector(`.item-row[data-item="${id}"]`); r.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, clientX: 5, clientY: 5 })); }, isId);
await p.waitForSelector('.sheet [data-save]');
t('the line sheet carries the whole-floor box', !!(await p.$('.sheet [data-floor]')) && /every other guest room on floor 4/.test(await p.textContent('.sheet .floor-opt')));
await p.click('.sheet .qp[data-q="MISSING"]'); await p.check('.sheet [data-floor]'); await p.click('.sheet [data-save]');
await p.waitForSelector('.sheet .preview');
t('Save flags this line and previews the flag for the other rooms', /Flag an issue/.test(await p.textContent('.sheet .sh')) && /MISSING/.test(await p.textContent('.sheet .sh')) && /other room/.test(await p.textContent('.sheet .sh')) && (await p.evaluate((id) => window.__store.getDoc('405').items[id].issue, isId)) === 'MISSING');
const lenIs = (await log()).length;
await p.click('.sheet [data-apply]'); await p.waitForTimeout(500);
const newIs = (await log()).slice(lenIs);
t('apply flags MISSING on the same line in the other floor-4 rooms only', newIs.length > 1 && newIs.every(x => /^4\d\d$/.test(x.docId) && x.docId !== '405' && Object.entries(x.patch).some(([k, v]) => k.endsWith('.issue') && v === 'MISSING')), newIs.map(x => x.docId).join(','));
await p.click('.toast button'); await p.waitForTimeout(400);
t('undo clears the floor flags again', (await log()).length === lenIs + newIs.length * 2);
await p.evaluate((id) => window.__store.setIssue('405', id, ''), isId);

t('no page or console errors', errs.length === 0, errs.slice(0, 3).join(' ; '));
await b.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
