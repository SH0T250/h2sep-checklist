// mep-ui.mjs — drive the MEP punch UI with a SYNTHETIC doc.
//
// Why synthetic: the real punch content is still being verified against the
// E/M/P sheets, and shipping unverified lines into the demo fixture would put
// them on a screen Austin shows people. This test injects a doc at runtime
// instead, so every MEP code path is exercised now without a single unverified
// line entering the repo.
//
// What it protects (the failure modes that would embarrass us on site):
//   * a punch check-off leaking into the FF&E room counters
//   * the FF&E ⇄ MEP switch appearing when there is nothing to switch to
//   * trade groups rendering in FF&E order, or without their letter chips
//   * the punch sheet printing a parts list instead of test procedures
//
//   node tests/mep-ui.mjs
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:8322/index.html?demo=1';
let failures = 0;
const ok = (cond, name) => {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name);
  if (!cond) failures++;
};

// A believable punch doc for room 101 (the demo fixture's only guest room): five trades, marks printed verbatim,
// one FLAGGED line with a real reason, every line carrying its punch step.
const MEP_101 = {
  number: '101-MEP', floor: 1, type: 'mep-punch', typeLabel: 'QQ Studio Connector',
  deleted: false, schemaV: 3, notes: {},
  items: {
    m1: { category: 'Mechanical', code: 'PTAC-2 / PTAC-1', label: 'Packaged terminal A/C unit in wall sleeve', qty: 1, reliability: 'FLAGGED', instanceNote: '⚑ M201 schedule and A555 KN1 disagree on which unit lands here; confirm before start-up.', src: 'M401 det.01', verifyAtPunch: 'Run heat and cool, confirm no sleeve air leak', sort: 1010, derived: true, checked: false, initials: '', checkedByName: '', checkedByUid: '', checkedAt: null, checkedAtLocal: null, issue: '', issueResolved: false, deleted: false },
    m2: { category: 'Mechanical', code: 'T', label: 'Thermostat, 7-day programmable, hardwired', qty: 1, reliability: 'HIGH', instanceNote: '', src: 'M201', verifyAtPunch: 'Set point 5 deg below room, confirm PTAC responds', sort: 1020, derived: true, checked: false, initials: '', checkedByName: '', checkedByUid: '', checkedAt: null, checkedAtLocal: null, issue: '', issueResolved: false, deleted: false },
    m3: { category: 'Mechanical', code: 'EAG-50', label: 'Exhaust air grille, 50 CFM, at the toilet', qty: 1, reliability: 'HIGH', instanceNote: '', src: 'M401', verifyAtPunch: 'Tissue test at grille — holds against the face', sort: 1030, derived: true, checked: false, initials: '', checkedByName: '', checkedByUid: '', checkedAt: null, checkedAtLocal: null, issue: '', issueResolved: false, deleted: false },
    e1: { category: 'Electrical', code: 'WS03', label: 'Wall sconce at the vanity', qty: 2, reliability: 'HIGH', instanceNote: '', src: 'E101 fixture schedule', verifyAtPunch: 'Switch on, both lamps lit, trim tight to wall', sort: 2010, derived: true, checked: false, initials: '', checkedByName: '', checkedByUid: '', checkedAt: null, checkedAtLocal: null, issue: '', issueResolved: false, deleted: false },
    e2: { category: 'Electrical', code: 'S21', label: 'Surface-mount downlight, bathroom', qty: 1, reliability: 'HIGH', instanceNote: '', src: 'E101 fixture schedule', verifyAtPunch: 'Switch on, lens seated, no gap at ceiling', sort: 2020, derived: true, checked: false, initials: '', checkedByName: '', checkedByUid: '', checkedAt: null, checkedAtLocal: null, issue: '', issueResolved: false, deleted: false },
    p1: { category: 'Plumbing', code: 'WC-3 / WC-4', label: 'Water closet, floor outlet, tank type 1.28 GPF', qty: 1, reliability: 'HIGH', instanceNote: '', src: 'P401/P402', verifyAtPunch: 'Fill and flush twice, check for rock and leak at base', sort: 3010, derived: true, checked: false, initials: '', checkedByName: '', checkedByUid: '', checkedAt: null, checkedAtLocal: null, issue: '', issueResolved: false, deleted: false },
    p2: { category: 'Plumbing', code: 'FD', label: 'Floor drain, guestroom bathroom', qty: 1, reliability: 'MEDIUM', instanceNote: 'Accessible-compartment clearance not dimensioned on A530; verify against the enlarged plan.', src: 'A530 kn20', verifyAtPunch: 'Pour 1 gal, confirm full draw and no standing water', sort: 3020, derived: true, checked: false, initials: '', checkedByName: '', checkedByUid: '', checkedAt: null, checkedAtLocal: null, issue: '', issueResolved: false, deleted: false },
    f1: { category: 'Fire Protection', code: '', label: 'Concealed pendent sprinkler head on drop', qty: 3, reliability: 'HIGH', instanceNote: '', src: 'FP-1', verifyAtPunch: 'Cover plate flush and unpainted, head not obstructed', sort: 4010, derived: true, checked: false, initials: '', checkedByName: '', checkedByUid: '', checkedAt: null, checkedAtLocal: null, issue: '', issueResolved: false, deleted: false },
    l1: { category: 'Low Voltage', code: 'WAP', label: 'Wireless access point in a 3-gang box', qty: 1, reliability: 'HIGH', instanceNote: '', src: 'A55x kn44', verifyAtPunch: 'Confirm terminated and labelled, plate vertical', sort: 5010, derived: true, checked: false, initials: '', checkedByName: '', checkedByUid: '', checkedAt: null, checkedAtLocal: null, issue: '', issueResolved: false, deleted: false },
  },
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ ...devices['Pixel 7'] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text()); });

await page.goto(BASE);
await page.waitForTimeout(600);

// Baseline: the switch must not be offered when the counterpart does not exist.
// Since v1.19.0 the demo fixture SHIPS room 101's real punch list (js/seed-mep.js),
// so this baseline has to create the no-punch-list condition rather than assume
// it — delete the doc, look, then let the injection below put one back. Testing
// it against a room that happens to have no punch doc would stop testing
// anything the day that room gets one.
await page.evaluate(() => {
  localStorage.setItem('h2sep-user', JSON.stringify({ name: 'QA Tester', initials: 'QT' }));
  sessionStorage.removeItem('h2sep-floorview');
  // A SECOND guest room, with no punch doc of its own — exactly what Austin
  // gets from "Add room". Deleting 101-MEP instead would not work: demoLoad()
  // re-seeds the whole fixture the moment a seeded doc id goes missing, which
  // is deliberate (a demo DB saved before the punch docs existed must not stay
  // punch-less forever) and would silently put the doc straight back.
  const db = JSON.parse(localStorage.getItem('h2sep-demo-db-v2') || 'null');
  if (db && db.rooms && db.rooms['101']) {
    db.rooms['199'] = { ...JSON.parse(JSON.stringify(db.rooms['101'])), number: '199' };
    localStorage.setItem('h2sep-demo-db-v2', JSON.stringify(db));
  }
});
await page.goto('about:blank');
await page.goto(BASE + '#/room/199');
await page.waitForTimeout(700);
ok(await page.locator('.doc-switch').count() === 0, 'no FF&E/MEP switch when the room has no punch list');
// ...and the room that DOES have one offers it, so the assertion above is
// proving absence rather than a selector that never matches anything.
await page.goto('about:blank');
await page.goto(BASE + '#/room/101');
await page.waitForTimeout(700);
ok(await page.locator('.doc-switch').count() > 0, 'the seeded punch list DOES offer the switch (control)');

const heroBefore = await (async () => {
  await page.goto('about:blank');
  await page.goto(BASE + '#/');
  await page.waitForTimeout(700);
  return (await page.locator('.hero-stats').innerText()).replace(/\n/g, ' ');
})();

// Inject the punch doc into the demo database, exactly as a sync would.
await page.evaluate((doc) => {
  const db = JSON.parse(localStorage.getItem('h2sep-demo-db-v2'));
  db.rooms[doc.number] = doc;
  localStorage.setItem('h2sep-demo-db-v2', JSON.stringify(db));
}, MEP_101);
// A goto that differs only by hash does NOT reload the document — the app
// would keep the state it built before the injection. Bounce through a blank
// page so demoLoad() actually re-reads localStorage.
await page.goto('about:blank');
await page.goto(BASE + '#/');
await page.waitForTimeout(800);

// 1. The hero counts FF&E turnover ONLY — a punch list must not inflate it.
const heroAfter = (await page.locator('.hero-stats').innerText()).replace(/\n/g, ' ');
ok(heroBefore === heroAfter, `MEP doc does not change the home counters (${heroAfter.trim()})`);

// 2. Floor screen offers the switch, and the FF&E grid still shows rooms only.
await page.goto('about:blank');
await page.goto(BASE + '#/floor/1');
await page.waitForTimeout(700);
ok(await page.locator('.floor-switch').count() === 1, 'floor 1 offers the FF&E / MEP PUNCH switch');
const ffeCards = await page.locator('.room-card:not(.add-ghost)').count();
ok(await page.locator('.room-card.mep-card').count() === 0, 'FF&E view shows no punch cards');

// 3. Switching shows the punch list — and only it.
await page.click('[data-floorview="mep"]');
await page.waitForTimeout(400);
ok(await page.locator('.room-card.mep-card').count() === 1, 'MEP view shows the punch card');
const mepCardText = await page.locator('.room-card.mep-card').innerText();
ok(/101/.test(mepCardText) && !/MEP-|101-MEP/.test(mepCardText), 'punch card is labelled with the ROOM number, not the doc id');
ok(/MEP . 9/.test(mepCardText.replace(/\s+/g, ' ')), 'punch card shows its 9 line items');
ok(await page.locator('.room-card.add-ghost').count() === 0, 'no "Add room" ghost in the MEP view');

// 4. The punch screen itself.
await page.click('.room-card.mep-card');
await page.waitForTimeout(500);
ok((await page.locator('.ab-title').innerText()).includes('MEP Punch'), 'punch screen titled "MEP Punch"');
ok(await page.locator('.item-row').count() === 9, 'all 9 punch lines render');

// Trade groups in MEP order with their letter chips — NOT the FF&E build order.
const heads = await page.locator('.cat-head .cat-name').allInnerTexts();
const letters = await page.locator('.cat-head .cat-letter').allInnerTexts();
ok(JSON.stringify(letters) === JSON.stringify(['M', 'E', 'P', 'FP', 'LV']),
  `trade letters render in M·E·P·FP·LV order (got ${letters.join(',')})`);
ok(/MECHANICAL . 0\/3/.test(heads[0]), `first group is MECHANICAL 0/3 (got "${heads[0]}")`);
ok(/LOW VOLTAGE . 0\/1/.test(heads[4]), `last group is LOW VOLTAGE 0/1 (got "${heads[4]}")`);

// The ×qty badge must survive — 3 sprinkler heads is not 1 sprinkler head.
ok(await page.locator('.item-row[data-item="f1"] .qtyb').innerText() === '×3',
  'sprinkler line carries its ×3 badge');
// A flagged line still says WHY.
ok((await page.locator('.item-row[data-item="m1"]').innerText()).includes('VERIFY'),
  'flagged PTAC line shows the verify chip');

// 5. Checking a punch line must not touch the FF&E room.
await page.locator('.item-row[data-item="p1"] .box').click();
await page.waitForTimeout(400);
ok(await page.locator('.item-row[data-item="p1"] .ink').innerText() === 'QT', 'punch line takes my initials');
await page.goto('about:blank');
await page.goto(BASE + '#/room/101');
await page.waitForTimeout(700);
const ffe101 = await page.locator('.rh-line').innerText();
ok(/14\/40/.test(ffe101), `FF&E room 101 still reads 14/40 — punch work did not leak in (got ${ffe101.split('\n')[0]})`);
ok(await page.locator('.doc-switch:not(.floor-switch)').count() === 1,
  'room 101 now offers the switch to its punch list');

// 6. Round-trip back to the punch list via the switch.
await page.click('.doc-switch .ds-btn:not(.on)');
await page.waitForTimeout(500);
ok(page.url().includes('101-MEP'), 'switch routes to the punch doc');
ok(await page.locator('.item-row[data-item="p1"] .ink').count() === 1, 'the check-off persisted');

// 7. The printable punch sheet.
await page.goto('http://localhost:8322/print.html?room=101-MEP&demo=1');
await page.waitForTimeout(1200);
const sheet = await page.locator('.sheet.mep').count();
ok(sheet === 1, 'print.html renders the MEP sheet variant');
ok((await page.locator('.title h1').innerText()).includes('MEP PUNCH'), 'sheet titled MEP PUNCH');
ok(await page.locator('.mep-cat').count() === 5, 'sheet has one section per trade');
ok(await page.locator('.signoff').count() === 5, 'every trade section carries its own sign-off block');
const steps = await page.locator('.vstep').count();
ok(steps === 9, `every line prints its punch step (${steps}/9)`);
ok((await page.locator('.sheet.mep').innerText()).includes('Fill and flush'),
  'the sheet prints the ACTION, not just the part');

ok(errors.length === 0, `no page errors (${errors.slice(0, 2).join(' | ') || 'none'})`);

await browser.close();
console.log(failures ? `\n${failures} FAILURE(S)` : '\nMEP UI: ALL PASS');
process.exit(failures ? 1 : 0);
