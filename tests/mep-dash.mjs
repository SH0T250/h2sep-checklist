// mep-dash.mjs — drive the MEP PUNCH surface on the wall dashboard, and assert
// it agrees with the crew app line for line.
//
// The interesting failures this protects against are not "does it render":
//
//   * the board offering a punch check-off. dash-edit.js refuses punch writes;
//     a browsable surface that quietly re-opened that door would let anyone
//     standing at the wall un-check a mechanical test performed in the field.
//   * DIVERGENCE. Two independent renderers over one dataset drift, and the
//     drift is invisible until somebody standing at the board reads a line
//     differently from the walker holding the phone. So the parity block below
//     reads the SAME room on both surfaces and compares what each one shows.
//   * punch docs leaking into the FF&E populations they were separated from.
//
//   node tests/mep-dash.mjs
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:8322';
let failures = 0;
const ok = (cond, name) => {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name);
  if (!cond) failures++;
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errors = [];

// ---------------------------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------------------------
const dctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const dash = await dctx.newPage();
dash.on('pageerror', (e) => errors.push('dash: ' + e));
dash.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push('dash: ' + m.text()); });

await dash.goto(`${BASE}/dashboard.html?demo=1`);
await dash.waitForSelector('.mgrid', { timeout: 20000 });

ok(await dash.locator('#mep').count() === 1, 'the board has an MEP PUNCH panel');
const cards = await dash.locator('[data-mroom]').count();
ok(cards >= 1, `a card per punch list on the level (${cards})`);
ok((await dash.locator('.mc-num').first().innerText()).startsWith('MEP '),
  'the card names the ROOM, not the doc id (MEP 101, never 101-MEP)');
ok((await dash.locator('#mep-hint').innerText()).includes('lines'),
  'the panel header carries the building-wide roll-up');

// The roll-up strip must agree with the cards under it, not be a second
// independently-computed number that can drift.
const rollLines = Number((await dash.locator('.mroll span').nth(1).innerText()).replace(/\D/g, ''));
const cardLines = await dash.locator('.mc-foot').evaluateAll(
  els => els.reduce((n, e) => n + Number((e.textContent.match(/\/(\d+) lines/) || [0, 0])[1]), 0));
ok(rollLines === cardLines, `roll-up line count equals the sum of the cards (${rollLines} vs ${cardLines})`);

// ---- room drill-in ----
await dash.locator('[data-mroom]').first().click();
await dash.waitForSelector('.mroom-list', { timeout: 10000 });

const dashTitle = await dash.locator('.dsheet-title').innerText();
ok(/^MEP \d+ — \d+\/\d+ checked/.test(dashTitle), `sheet titled "MEP <room> — n/m checked" (got "${dashTitle.split('\n')[0]}")`);

const letters = await dash.locator('.mcat-letter').allInnerTexts();
ok(letters.join(',') === 'M,E,P,FP,LV',
  `trade groups render in walking order with their letters (got ${letters.join(',') || 'none'})`);

const dashRows = await dash.locator('.mrow').count();
ok(dashRows > 0, `punch lines render (${dashRows})`);
ok(await dash.locator('.punch-do').count() === await dash.locator('.mrow').count()
   || await dash.locator('.punch-do').count() > 0, 'lines carry their DO step');
ok(await dash.locator('.punch-at').count() > 0, 'lines carry their AT location');

// ---- trade filter, mirroring the app's chip row ----
const chipTexts = await dash.locator('.mchip').allInnerTexts();
ok(chipTexts.length === letters.length + 1,
  `a chip per trade plus All (${chipTexts.length} chips for ${letters.length} trades)`);
ok(/^All · \d+/.test(chipTexts[0]), `the first chip is All with a count (got "${chipTexts[0]}")`);
const allRows = await dash.locator('.mrow:visible').count();
await dash.locator('.mchip').nth(3).click();          // Plumbing
await dash.waitForSelector('.mchip.on', { timeout: 5000 });
await dash.waitForTimeout(300);
const filteredRows = await dash.locator('.mrow:visible').count();
ok(filteredRows > 0 && filteredRows < allRows,
  `filtering to one trade narrows the list (${allRows} -> ${filteredRows})`);
ok(await dash.locator('.mcat:visible').count() === 1, 'exactly one trade group is left showing');
await dash.locator('[data-trade-all]').click();
await dash.waitForTimeout(300);
ok(await dash.locator('.mrow:visible').count() === allRows, 'All restores every line');

// THE WRITE REFUSAL. Nothing in the punch surface may be a check control.
ok(await dash.locator('.mrow [role="checkbox"]').count() === 0,
  'no punch line exposes a checkbox role on the board');
ok(await dash.locator('.mrow button:not(.mref-chip)').count() === 0,
  'the only button on a punch line is its reference chip');
ok(await dash.locator('.mflag-line').count() > 0,
  'the board leads with the flagged count, as the phone does');
const beforeChecked = dashTitle;
await dash.locator('.mrow').first().click({ force: true });
await dash.waitForTimeout(400);
ok((await dash.locator('.dsheet-title').innerText()) === beforeChecked,
  'clicking a punch line changes nothing — the board cannot check punch work');

// A line whose drawings tag nothing must not print an em dash where a mark
// goes — 439 of floor 1's 762 lines carry "\u2014" as their code.
const boardMarks = await dash.locator('.mcode').allInnerTexts();
ok(!boardMarks.some(m => /^[\u2014\u2013-]$/.test(m.trim())),
  `no punch line renders a bare dash as its mark (${boardMarks.length} marks shown)`);
ok(boardMarks.length > 0 && boardMarks.length < dashRows,
  `some lines have marks and some do not (${boardMarks.length} of ${dashRows})`);

// ---- references ----
const chips = await dash.locator('.mref-chip').count();
ok(chips > 0, `punch lines carry reference chips (${chips})`);
await dash.locator('.mref-chip').first().click();
await dash.waitForSelector('.dref', { timeout: 10000 });
const drefs = await dash.locator('.dref').count();
ok(drefs > 0, `the chip opens a reference list (${drefs} documents)`);
ok(await dash.locator('.dscrim').count() === 2, 'the reference sheet STACKS over the room sheet');
await dash.keyboard.press('Escape');
await dash.waitForTimeout(300);
ok(await dash.locator('.dscrim').count() === 1, 'Escape closes only the top sheet');
// The inert teardown is the round-2 blocker; a stacked sheet must not leave the
// page inert once every layer is gone.
await dash.keyboard.press('Escape');
await dash.waitForTimeout(300);
ok(await dash.locator('main[inert]').count() === 0,
  'closing the last sheet clears inert — the board stays clickable');

// ---- populations stay separate ----
const invText = await dash.locator('#inventory').innerText();
ok(!/PTAC|EAG-50|WAP\b/.test(invText), 'punch devices stay out of the FF&E inventory panel');
const floorRows = await dash.locator('#floors').innerText();
ok(!/MEP/.test(floorRows), 'punch docs are not listed as guest-room floors');

// ---------------------------------------------------------------------------
// PARITY — the same room, both surfaces, compared field by field.
// ---------------------------------------------------------------------------
const actx = await browser.newContext({ ...devices['Pixel 7'] });
await actx.addInitScript(() => {
  localStorage.setItem('h2sep-user', JSON.stringify({ name: 'QA Tester', initials: 'QA' }));
});
const app = await actx.newPage();
app.on('pageerror', (e) => errors.push('app: ' + e));
await app.goto(`${BASE}/index.html?demo=1#/room/101-MEP`);
await app.waitForSelector('.item-row', { timeout: 20000 });

// Re-open the same room on the board (the sheets were closed above).
await dash.locator('[data-mroom]').first().click();
await dash.waitForSelector('.mroom-list', { timeout: 10000 });

const appRows = await app.locator('.item-row').count();
const boardRows = await dash.locator('.mrow').count();
ok(appRows === boardRows, `same line count on both surfaces (app ${appRows}, board ${boardRows})`);

const appChips = await app.locator('.ref-count').count();
const boardChips = await dash.locator('.mref-chip').count();
ok(appChips === boardChips, `same number of lines carry references (app ${appChips}, board ${boardChips})`);

const appDo = await app.locator('.punch-do').count();
const boardDo = await dash.locator('.punch-do').count();
ok(appDo === boardDo, `same number of DO steps (app ${appDo}, board ${boardDo})`);

const appAt = await app.locator('.punch-at').count();
const boardAt = await dash.locator('.punch-at').count();
ok(appAt === boardAt, `same number of AT locations (app ${appAt}, board ${boardAt})`);

// Identity, not just counts: the marks and labels must be the same strings in
// the same order. Equal counts hide swapped membership — the same trap the
// bulk engine's drift detection was rewritten for.
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const appLabels = (await app.locator('.item-line1').allInnerTexts()).map(norm);
const boardLabels = (await dash.locator('.mrow-l1').allInnerTexts()).map(norm);
const firstDiff = appLabels.findIndex((l, i) => l !== boardLabels[i]);
ok(firstDiff === -1,
  firstDiff === -1 ? 'every line reads identically, in the same order, on both surfaces'
    : `line ${firstDiff} differs — app "${appLabels[firstDiff]}" vs board "${boardLabels[firstDiff]}"`);

// Same trades, same order.
const appCats = (await app.locator('.cat-letter').allInnerTexts()).map(norm);
ok(appCats.join(',') === letters.join(','),
  `trade order matches (app ${appCats.join(',')}, board ${letters.join(',')})`);

// And the reference LIST for one line matches document for document.
const pickId = await dash.locator('.mrow:has(.mref-chip)').first().getAttribute('data-item');
await dash.locator(`.mrow[data-item="${pickId}"] .mref-chip`).click();
await dash.waitForSelector('.dref', { timeout: 10000 });
const boardDocs = (await dash.locator('.dref-main').allInnerTexts())
  .map(t => norm(t.split('\n')[0]));
await app.locator(`.item-row[data-item="${pickId}"] .ref-count`).click();
await app.waitForSelector('.ref-link', { timeout: 10000 });
const appDocs = (await app.locator('.ref-name').allInnerTexts()).map(norm);
ok(JSON.stringify(appDocs) === JSON.stringify(boardDocs),
  `the same line lists the same documents on both surfaces (${appDocs.length} docs)`);
ok(appDocs.length > 0, 'that line actually had documents to compare');

ok(errors.length === 0, `no console/page errors (${errors.slice(0, 2).join(' | ') || 'none'})`);

await browser.close();
console.log(failures ? `\n${failures} FAILURE(S)` : '\nMEP DASH: ALL PASS');
process.exit(failures ? 1 : 0);
