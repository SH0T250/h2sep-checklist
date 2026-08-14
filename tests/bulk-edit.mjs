// Dashboard editing suite — demo mode only (bulk writes + live data must
// never mix in CI; live-invariants pins room 101's exact field work).
//
// Run: node tests/bulk-edit.mjs        (expects the shared server on :8322 —
// do NOT kill/rebind that port; see lifecycle-test.mjs's scar tissue.)
import { readFileSync } from 'node:fs';
const DEMO_PIN = readFileSync(new URL('../js/config.js', import.meta.url), 'utf8')
  .match(/DEMO_PIN\s*=\s*'([^']+)'/)[1];
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:8322/dashboard.html?demo=1';
let failures = 0;
const ok = (cond, name) => {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name);
  if (!cond) failures++;
};
// Poll instead of guessing sleeps (lifecycle-test.mjs pattern) — bulk writes
// across docs are exactly where a fixed sleep is most fragile.
const waitFor = async (fn, ms = 5000, poll = 100) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await fn()) return true;
    await new Promise(r => setTimeout(r, poll));
  }
  return false;
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1000 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => {
  if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text());
});

// ---------- seed a multi-room demo DB (the real bulk shape) ----------
// Load once so store seeds the schemaV-3 fixture, then merge extra rooms in
// (Object.assign form — replacing db.rooms would get discarded by the
// schemaV guard) and bounce through about:blank for a real reload.
await page.goto(BASE);
await page.waitForTimeout(800);
await page.evaluate(() => {
  const db = JSON.parse(localStorage.getItem('h2sep-demo-db-v2'));
  const mk = (number, floor) => {
    const items = {};
    for (const [id, code, label] of [
      ['gr402_a', 'GR-402', 'Divider Drapery'],
      ['gr4021_a', 'GR-402.1', 'Divider Drapery Hardware'],
      ['gr403_a', 'GR-403', 'Closet Drapery @ Guest Suite'],
    ]) {
      items[id] = {
        code, label, sort: 10, category: 'FF&E - Window', qty: 1,
        reliability: 'HIGH', derived: 1, src: 'A555', instanceNote: '',
        checked: false, initials: '', checkedByName: '', checkedByUid: '',
        checkedAt: null, checkedAtLocal: null,
        issue: 'MISSING', issueResolved: false, deleted: false,
      };
    }
    return {
      number: String(number), floor, type: 'qq-studio', typeLabel: 'QQ Studio',
      items, notes: {}, deleted: false, schemaV: 1,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
  };
  Object.assign(db.rooms, {
    215: mk(215, 2), 301: mk(301, 3), 405: mk(405, 4),
  });
  localStorage.setItem('h2sep-demo-db-v2', JSON.stringify(db));
});
await page.goto('about:blank');
await page.goto(BASE);
await page.waitForTimeout(1000);

// ---------- read-only state ----------
ok(await page.locator('#edit-toggle').isVisible(), 'EDIT pill visible');
ok(await page.locator('#bulk-open').isHidden(), 'BULK EDIT hidden until edit mode');
ok(await page.locator('#inventory .inv-tbl').count() === 1, 'inventory panel renders read-only');
ok(await page.locator('#inventory [data-bulk]').first().isHidden(), 'per-row BULK buttons hidden read-only');
const issuesBefore = Number((await page.textContent('#k-issues')).trim());
// 6 FF&E items + 1 room note + 1 punch line (js/seed-mep.js, since v1.19.0) + 9
// injected. The punch issue belongs in this total on purpose: dash.js counts
// MEP issues in the headline tile because a flagged fixture is a real problem
// on a real wall, even though the board refuses to EDIT punch lines.
ok(issuesBefore === 17, `17 open issues seeded (6+1+1 fixture + 9 injected) — got ${issuesBefore}`);

// ---------- identity + edit mode ----------
await page.click('#edit-toggle');
await page.fill('#de-name', 'QA Tester');
ok(await page.inputValue('#de-ini') === 'QT', 'initials auto-derive from name');
await page.click('.dsheet .dbtn.primary');
await waitFor(async () => (await page.textContent('#edit-toggle')).includes('EDITING'));
ok((await page.textContent('#edit-toggle')).includes('QT'), 'edit pill shows initials');
ok(await page.locator('#bulk-open').isVisible(), 'BULK EDIT appears in edit mode');

// ---------- single-item parity: tap to check in the room browser ----------
await page.click('#floors .frow[data-floor="2"]');
await page.click('.droom');   // room 215
const checkedBefore = await page.locator('.drow.checked').count();
// all three rows carry open issues → tap opens the resolve sheet (app parity)
await page.click('.drow.issue');
ok(await page.locator('[data-act=rc]').isVisible(), 'issue row opens resolve sheet');
await page.click('[data-act=rc]');   // Resolve & check ✓
ok(await waitFor(async () => (await page.locator('.drow.checked').count()) === checkedBefore + 1),
  'resolve & check marks the row (room sheet live-refreshes)');
const ink = await page.locator('.drow.checked .dink').first().textContent();
ok(ink === 'QT', `initials go in the box like the app (got "${ink}")`);
await page.click('.dsheet-x');

// ---------- references actually resolve on the dashboard --------------------
// Regression: refsFor() only returns anything after initRefs() has fetched the
// index, and initRefs was wired into app.js but never dash.js — so every
// References section on the board rendered empty while the data sat on disk.
await page.click('#floors .frow[data-floor="1"]');
await page.click('.droom');            // room 101 — the room the index was cut for
// A checked row opens its sheet; an unchecked clean row would instant-check
// (app parity), so pick the one that opens.
await page.locator('.drow.checked').first().click();
const drefs = await page.locator('.dscrim').last().locator('.dref').count();
ok(drefs > 0, `item sheet renders reference rows from the index (got ${drefs})`);
await page.locator('.dscrim').last().locator('.dsheet-x').click();
await page.click('.dsheet-x');         // room sheet (it replaced the floor sheet)

// ---------- drawer chrome: the UNFILTERED open is the one operators see -----
// Regression: .bd-col grid items without min-width:0 let the code column's
// min-content (full ceiling/finish labels) claim the whole sheet, pushing
// WHERE/DO WHAT and the Apply button outside it. Every earlier assertion in
// this file filled #bd-q first, which hid the bug.
await page.click('#bulk-open');
const geom = await page.evaluate(() => {
  const bd = document.querySelector('.bd');
  const sheet = bd.closest('.dsheet');
  const cols = [...bd.querySelectorAll(':scope > .bd-col')];
  const sr = sheet.getBoundingClientRect();
  return {
    cols: cols.map(c => { const r = c.getBoundingClientRect();
      return { left: r.left, right: r.right, w: r.width }; }),
    sheet: { left: sr.left, right: sr.right },
    applyVisible: (() => { const r = document.querySelector('#bd-apply').getBoundingClientRect();
      return r.right <= sr.right + 1 && r.width > 0; })(),
  };
});
ok(geom.cols.length === 3, 'drawer renders all three columns');
ok(geom.cols.every(c => c.left >= geom.sheet.left - 1 && c.right <= geom.sheet.right + 1),
  `all 3 columns stay inside the sheet on an unfiltered open (got ${
    geom.cols.map(c => Math.round(c.w)).join('/')}px in ${
    Math.round(geom.sheet.right - geom.sheet.left)}px)`);
ok(geom.applyVisible, 'Apply button is inside the sheet on an unfiltered open');

// Regression: the footer Close must route through closeSheet(), which is what
// clears `inert` off header/main/footer. s.remove() leaves the whole dashboard
// swallowing clicks, and a touch-only wall board has no keydown to self-heal.
await page.click('.dsheet [data-act=cancel]');
const inertAfter = await page.evaluate(() => ({
  scrims: document.querySelectorAll('.dscrim').length,
  main: document.querySelector('main').hasAttribute('inert'),
  header: document.querySelector('header').hasAttribute('inert'),
}));
ok(inertAfter.scrims === 0, 'footer Close dismisses the drawer');
ok(!inertAfter.main && !inertAfter.header,
  'footer Close clears inert from the page (dashboard still clickable)');
await page.click('#bulk-open', { timeout: 3000 });   // proves clicks land after Close
ok(await page.locator('.bd').isVisible(), 'page still responds to clicks after Close');

// ---------- bulk flow: divider hardware MISSING everywhere → resolve+check --
// scope: only GR-402.1
await page.fill('#bd-q', '402.1');
await page.click('.bd-code:not(.all) input');
// state: open issue, wording MISSING
await page.click('#bd-state [data-state="issue"]');
await page.click('#bd-isslist [data-iss="MISSING"]');
await page.check('input[name="bd-act"][value="resolveAndCheck"]');
const preview = await page.textContent('#bd-preview');
ok(/3\s*items? will change across\s*3\s*rooms/.test(preview.replace(/\s+/g, ' ')),
  `preview says 3 items / 3 rooms (got "${preview.trim().slice(0, 90)}")`);
await page.click('#bd-apply');
// PIN gate (stacked over the drawer)
await page.fill('.dpin', DEMO_PIN);
await page.click('.dscrim:last-of-type .dbtn.primary');
// typed confirm (also stacked)
ok(await waitFor(() => page.locator('.dscrim:last-of-type [data-act=ok]').isVisible()),
  'confirm dialog appears after PIN');
await page.click('.dscrim:last-of-type [data-act=ok]');
ok(await waitFor(async () =>
  Number((await page.textContent('#k-issues')).trim()) === issuesBefore - 3 - 1),
  'open issues drop by exactly the previewed 3 (+1 from the single fix)');
ok(await page.locator('#bd-undo-btn').isVisible(), 'undo affordance appears in the drawer');

// drawer still open, preview refreshed: same scope now has nothing to do
const preview2 = await page.textContent('#bd-preview');
ok(/Nothing to change/.test(preview2), 'preview re-computes to nothing-left after apply');

// ---------- undo restores the exact before-state ----------
await page.click('#bd-undo-btn');
ok(await waitFor(async () =>
  Number((await page.textContent('#k-issues')).trim()) === issuesBefore - 1),
  'undo restores all three MISSING flags');
await page.click('.dsheet-x');

// ---------- state survives a real reload (demo DB persisted) ----------
await page.goto('about:blank');
await page.goto(BASE);
await page.waitForTimeout(900);
ok(Number((await page.textContent('#k-issues')).trim()) === issuesBefore - 1,
  'edits persist across reload');

// ---------- wrong PIN is refused ----------
// Admin unlock rides sessionStorage and legitimately survives same-tab
// reloads (app behavior) — drop it so the gate actually gates.
await page.evaluate(() => sessionStorage.removeItem('h2sep-admin'));
await page.click('#edit-toggle');   // user remembered; goes straight to edit
await waitFor(async () => (await page.textContent('#edit-toggle')).includes('EDITING'));
await page.click('#bulk-open');
await page.click('#bd-state [data-state="issue"]');
await page.check('input[name="bd-act"][value="resolveIssue"]');
await page.click('#bd-apply');
await page.fill('.dpin', '0000');
await page.click('.dscrim:last-of-type .dbtn.primary');
ok(await page.locator('.dpin-err').isVisible(), 'wrong PIN refused');
ok((await page.textContent('.dpin-err')).includes('Wrong PIN'), 'wrong-PIN message exact');
await page.click('.dscrim:last-of-type .dsheet-x');
await page.click('.dsheet-x');

// ---------- the problem wordings are reachable without a guessing game ------
// Regression: the wording chips (MISSING / IN BOX / DAMAGED — the vocabulary
// the crew actually flags in) only rendered once "Open issue" was chosen, so an
// operator sitting on "Any state" saw no way to say "the missing ones" and no
// hint that another chip would reveal one.
await page.click('#bulk-open');
ok(await page.$eval('#bd-state .dchip.on', e => e.textContent.trim()) === 'Any state',
  'drawer opens on Any state');
const wordings = await page.$$eval('#bd-isslist [data-iss]', els => els.map(e => e.dataset.iss).filter(Boolean));
ok(wordings.length > 0, `problem wordings are offered without changing state (got ${wordings.length})`);
ok(wordings.includes('MISSING'), 'MISSING is one of them');
await page.click('#bd-isslist [data-iss="MISSING"]');
await page.waitForTimeout(250);
ok(await page.$eval('#bd-state .dchip.on', e => e.textContent.trim()) === 'Open issue',
  'picking a wording moves the state chip with it (chips never contradict the filter)');
ok(await page.$eval('#bd-isslist [data-iss].on', e => e.dataset.iss) === 'MISSING',
  'the picked wording stays lit');
const wPrev = (await page.textContent('#bd-preview')).replace(/\s+/g, ' ');
ok(/\d+ items? will change/.test(wPrev), `preview narrows to the picked problem (got "${wPrev.trim().slice(0, 70)}")`);
await page.click('.dsheet [data-act=cancel]');

// ---------- MEP punch lists are reported, never edited, from this board -----
// Regression: MEP punch docs share the rooms collection with guest rooms and
// are told apart only by their type slug. A verifier reproduced a one-click
// erasure of finished mechanical work via the issue table, with no PIN.
await page.evaluate(() => {
  const db = JSON.parse(localStorage.getItem('h2sep-demo-db-v2'));
  db.rooms['105-MEP'] = {
    number: '105-MEP', floor: 1, type: 'mep-punch', typeLabel: 'MEP Punch',
    items: {
      mp1: { code: 'PTAC-2', label: 'Packaged terminal A/C unit', category: 'Mechanical',
        checked: true, initials: 'MP', checkedByName: 'Mech Pete', checkedByUid: 'u_mp',
        checkedAt: null, checkedAtLocal: new Date().toISOString(),
        issue: 'DAMAGED', issueResolved: false, deleted: false, sort: 1 },
    },
    notes: {}, deleted: false, schemaV: 3,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  localStorage.setItem('h2sep-demo-db-v2', JSON.stringify(db));
});
await page.goto('about:blank');
await page.goto(BASE);
await page.waitForTimeout(900);
await page.click('#edit-toggle');
await waitFor(async () => (await page.textContent('#edit-toggle')).includes('EDITING'));

const mepRow = page.locator('#issue-table tr', { hasText: 'PTAC-2' });
ok(await mepRow.count() === 1, 'an MEP punch problem still SHOWS on the board');
ok(await mepRow.getAttribute('data-room') === null,
  'the MEP row is not wired as an editable item (no data-room)');
ok(!(await mepRow.getAttribute('class') || '').includes('clickable'),
  'the MEP row is not presented as clickable in edit mode');

// The exported entry point refuses it even when called directly.
await page.evaluate(async () => {
  const e = await import('./js/dash-edit.js');
  e.openItemSheet('105-MEP', 'mp1');
});
await page.waitForTimeout(300);
ok(await page.locator('.dscrim').count() === 0, 'openItemSheet refuses an MEP doc outright');
const mepAfter = await page.evaluate(() =>
  JSON.parse(localStorage.getItem('h2sep-demo-db-v2')).rooms['105-MEP'].items.mp1);
ok(mepAfter.checked === true && mepAfter.initials === 'MP',
  "the mechanic's check-off survives untouched");

// It is invisible to the FF&E inventory and to bulk scope.
ok(await page.locator('#inventory [data-bulk]', { hasText: 'PTAC-2' }).count() === 0,
  'MEP items stay out of the FF&E inventory');
await page.click('#bulk-open');
// "PTAC" alone also matches "recepTACle" on a real common-area line, so
// filter on the full MEP code.
await page.fill('#bd-q', 'PTAC-2');
ok(await page.locator('.bd-code:not(.all)').count() === 0,
  'MEP items are unreachable from the bulk drawer');
await page.click('.dsheet [data-act=cancel]');

ok(errors.length === 0, 'no page errors' + (errors.length ? ':\n' + errors.join('\n') : ''));

await browser.close();
console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
