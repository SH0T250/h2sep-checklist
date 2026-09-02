// Whole-floor offer on every kind of line in the CREW app, demo mode only
// (?demo=1: every write lands in the device-local demo database, nothing here
// can touch Firestore). Covers D57 widened by D58: an FF&E room, an MEP punch
// doc, a common area, a common area's punch doc, and the issue sheet's
// "Resolve & check", plus the Common areas page keeping punch docs off its list.
//
//   (python3 -m http.server 8322 &) ; node tests/whole-floor-crew.mjs
import { chromium } from '/tmp/claude-0/-home-user-h2sep-checklist/18be7c92-db26-548f-a957-ab5e606c8fa1/scratchpad/node_modules/playwright-core/index.mjs';
const EXE = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const BASE = process.env.BASE || 'http://localhost:8322/index.html?demo=1';
const b = await chromium.launch({ executablePath: EXE });
const ctx = await b.newContext({ viewport: { width: 420, height: 860 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
p.on('dialog', d => d.accept());
let pass = 0, fail = 0;
const t = (name, cond, detail = '') => { if (cond) { pass++; console.log('  PASS  ' + name); } else { fail++; console.log('  FAIL  ' + name + (detail ? '  ' + detail : '')); } };
await p.addInitScript(() => {
  try { localStorage.setItem('h2sep-user', JSON.stringify({ name: 'QA Tester', initials: 'QT' })); } catch (_) { /* about:blank has no storage */ }
});
const db = () => p.evaluate(() => JSON.parse(localStorage.getItem('h2sep-demo-db-v2')));
const open = async (hash) => { await p.goto('about:blank'); await p.goto(BASE + hash); await p.waitForSelector('.item-row', { timeout: 8000 }); };
const cleanBox = () => p.evaluate(() => { const r = [...document.querySelectorAll('.item-row')].find(x => !x.classList.contains('checked') && !x.classList.contains('issue') && !x.classList.contains('flagged')); return r ? r.dataset.item : null; });
const toastButtons = () => p.$$eval('#toast.show .toast-action', b => b.map(x => x.textContent.trim()));
const line = (category, code, label, extra = {}) => ({
  category, code, label, qty: 1, reliability: 'HIGH', instanceNote: '', src: 'test', sort: 10, derived: true,
  checked: false, initials: '', checkedByName: '', checkedByUid: '', checkedAt: null, checkedAtLocal: null,
  issue: '', issueResolved: false, deleted: false, ...extra,
});

// Seed: a second guest room cloned from the fixture's room 101, two punch docs,
// two common areas and their punch docs, all on floor 1.
await p.goto(BASE); await p.waitForTimeout(900);
await p.evaluate((mk) => {
  const line = new Function('return ' + mk)();
  const db = JSON.parse(localStorage.getItem('h2sep-demo-db-v2'));
  const r101 = db.rooms['101'];
  const items102 = {};
  for (const [id, it] of Object.entries(r101.items)) items102[id] = { ...it, checked: false, initials: '', checkedByName: '', checkedByUid: '', checkedAt: null, checkedAtLocal: null, issue: '', issueResolved: false };
  const now = new Date().toISOString();
  db.rooms['102'] = { ...r101, number: '102', items: items102, notes: {}, createdAt: now, updatedAt: now };
  const mep = (number) => ({ number, floor: 1, type: 'mep-punch', typeLabel: r101.typeLabel, deleted: false, schemaV: 3, notes: {}, createdAt: now, updatedAt: now, items: {
    m2: line('Mechanical', 'T', 'Thermostat, 7-day programmable, hardwired', { verifyAtPunch: 'Set point 5 deg below room' }),
    e1: line('Electrical', 'WS03', 'Wall sconce at the vanity', { verifyAtPunch: 'Switch on, both lamps lit' }),
  } });
  db.rooms['101-MEP'] = mep('101-MEP'); db.rooms['102-MEP'] = mep('102-MEP');
  const space = (number, type, typeLabel) => ({ number, floor: 1, type, typeLabel, deleted: false, schemaV: 3, notes: {}, createdAt: now, updatedAt: now, items: {
    dc: line('Doors & Hardware', '', 'Door closer'),
    dl: line('Doors & Hardware', '', 'Door lock'),
  } });
  db.rooms['S1A'] = space('S1A', 'space-fitness', 'Fitness Room'); db.rooms['S1B'] = space('S1B', 'space-lobby', 'Lobby');
  const spaceMep = (number) => ({ number, floor: 1, type: 'space-mep-punch', typeLabel: 'Common area punch', deleted: false, schemaV: 3, notes: {}, createdAt: now, updatedAt: now, items: {
    e9: line('Electrical', 'EM', 'Emergency light and exit sign', { verifyAtPunch: 'Test button, lamps hold 90 s' }),
  } });
  db.rooms['S1A-M'] = spaceMep('S1A-M'); db.rooms['S1B-M'] = spaceMep('S1B-M');
  localStorage.setItem('h2sep-demo-db-v2', JSON.stringify(db));
}, line.toString());

async function floorCheck(from, to, label) {
  await open('#/room/' + from);
  const id = await cleanBox();
  t(`${label}: a clean line exists in ${from}`, !!id);
  await p.click(`[data-box="${id}"]`); await p.waitForSelector('#toast.show');
  const tb = await toastButtons();
  t(`${label}: the check toast offers Undo and Whole floor 1`, tb.includes('Undo') && tb.includes('Whole floor 1'), tb.join('|'));
  await p.click('#toast.show .toast-action:last-child'); await p.waitForTimeout(700);
  const d = await db();
  const target = d.rooms[to] && d.rooms[to].items[id];
  t(`${label}: Whole floor checked the same line in ${to} with the tester's initials`, !!target && target.checked === true && target.initials === 'QT', JSON.stringify(target && { checked: target.checked, initials: target.initials }));
  const others = Object.entries(d.rooms).filter(([k, r]) => k !== from && k !== to && r.items && r.items[id] && r.items[id].checked);
  t(`${label}: no other document was touched`, others.length === 0, others.map(([k]) => k).join(','));
  return id;
}

console.log('\nFF&E ROOM');
await floorCheck('101', '102', 'FF&E');
console.log('\nMEP PUNCH');
await floorCheck('101-MEP', '102-MEP', 'MEP');
console.log('\nCOMMON AREA');
await floorCheck('S1A', 'S1B', 'Common area');
console.log('\nCOMMON AREA PUNCH');
await floorCheck('S1A-M', 'S1B-M', 'Common area punch');

console.log('\nISSUE SHEET: RESOLVE & CHECK');
await p.evaluate(() => {
  const db = JSON.parse(localStorage.getItem('h2sep-demo-db-v2'));
  const it = Object.entries(db.rooms['102'].items).find(([, x]) => !x.checked && !x.deleted);
  it[1].issue = 'MISSING'; it[1].issueResolved = false;
  localStorage.setItem('h2sep-demo-db-v2', JSON.stringify(db));
});
await open('#/room/102');
const issId = await p.evaluate(() => { const r = document.querySelector('.item-row.issue'); return r ? r.dataset.item : null; });
t('the issue line renders', !!issId);
await p.click(`[data-box="${issId}"]`); await p.waitForSelector('[data-act=resolve-check]');
await p.click('[data-act=resolve-check]'); await p.waitForSelector('#toast.show');
const tbi = await toastButtons();
t('Resolve & check offers Whole floor 1', tbi.includes('Whole floor 1'), tbi.join('|'));

console.log('\nCOMMON AREAS PAGE');
await p.goto('about:blank'); await p.goto(BASE + '#/common'); await p.waitForTimeout(800);
const commonText = await p.evaluate(() => document.body.innerText);
t('lists the common areas', /Fitness Room/.test(commonText) && /Lobby/.test(commonText));
t('keeps common-area punch docs off the list', !/S1A-M|S1B-M/.test(commonText));

t('no page or console errors', errs.length === 0, errs.slice(0, 3).join(' ; '));
await b.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
