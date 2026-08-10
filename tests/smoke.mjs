// Local smoke test of the H2SEP checklist app (demo mode).
import { readFileSync as _rf } from 'node:fs';
const DEMO_PIN = _rf(new URL('../js/config.js', import.meta.url), 'utf8')
  .match(/DEMO_PIN\s*=\s*'([^']+)'/)[1];
import { chromium, devices } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:8322/index.html?demo=1';
let failures = 0;
const ok = (cond, name) => {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name);
  if (!cond) failures++;
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

// ---------- main flow (Android-ish phone) ----------
{
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => {
    // 404 on sheets/<room>.jpg is the by-design probe for rooms with no paper sheet
    if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text());
  });

  await page.goto(BASE);
  await page.waitForTimeout(600);

  // Onboarding
  ok(await page.locator('.welcome-title').count() === 1, 'onboarding shows first');
  await page.fill('#wb-name', 'QA Tester');
  ok(await page.inputValue('#wb-initials') === 'QT', 'initials auto-derive from name');
  await page.click('#wb-go');
  await page.waitForTimeout(300);

  // Home
  ok(await page.locator('.hero').count() === 1, 'home hero renders');
  ok((await page.locator('.floor-card:not(.common-card)').count()) === 4, '4 floor cards');
  ok((await page.locator('.common-card').count()) === 1, 'Common Areas card on home');
  const heroText = await page.locator('.hero-stats').innerText();
  ok(/14\s*\/\s*40 items checked/.test(heroText.replace(/\n/g, ' ')), 'hero counts 14/40 (Room 101 post-cutover state — spaces NOT mixed in)');
  ok(/7 open issues/.test(heroText), 'hero counts 7 open issues (6 item + 1 room note)');

  // Floor 1
  await page.click('.floor-card');
  await page.waitForTimeout(300);
  ok(await page.locator('.room-card:not(.add-ghost)').count() === 1, 'floor 1 shows Room 101');
  ok(await page.locator('.room-card .badge').innerText() === '7', 'room card issue badge = 7');

  // Room 101
  await page.click('.room-card:not(.add-ghost)');
  await page.waitForTimeout(300);
  ok(await page.locator('.item-row').count() === 40, '40 item rows render');
  ok((await page.locator('.rh-type').innerText()).includes('QQ STUDIO'), 'type label shown');
  ok((await page.locator('.note-row.red').innerText()).includes('CONNECTING DOOR LOCK'), 'red ★ room note');
  ok(await page.locator('.item-row .ink').first().innerText() === 'CC', 'paper CC initials render');
  // Post-cutover the list is DEDUPED: one line per tag carrying a ×qty badge,
  // instead of the paper sheet's repeated _a/_b instances.
  ok(await page.locator('.inst').filter({ hasText: ' of ' }).count() === 0, 'no duplicate-instance rows after dedupe');
  ok(await page.locator('.item-row[data-item="gr300_a"] .qtyb').innerText() === '×2', 'GR-300 carries a ×2 badge');
  ok(await page.locator('.item-row[data-item="gr402_a"] .ink').innerText() === 'AJ', 'AJ check-off carried from the cutover');

  // Check an unchecked, un-flagged item (GR-403 Closet Drapery)
  const gr403 = page.locator('.item-row[data-item="gr403_a"]');
  ok(await gr403.count() === 1, 'gr403_a row exists');
  await gr403.locator('.box').click();
  await page.waitForTimeout(300);
  ok(await gr403.locator('.ink').innerText() === 'QT', 'tap fills box with MY initials');

  // Tap the checked item again -> who/when sheet, un-check
  await gr403.locator('.box').click();
  await page.waitForTimeout(300);
  ok((await page.locator('.who-line').innerText()).includes('QA Tester'), 'checked sheet shows who');
  await page.click('[data-act=uncheck]');
  await page.waitForTimeout(300);
  ok(await gr403.locator('.ink').count() === 0, 'un-check clears initials');

  // Issue item: GR-103 Task Chair IN BOX -> Resolve & check
  const gr103 = page.locator('.item-row[data-item="gr103_a"]');
  ok((await gr103.locator('.item-note').innerText()).includes('IN BOX'), 'red inline note — IN BOX');
  await gr103.locator('.box').click();
  await page.waitForTimeout(300);
  await page.click('[data-act=resolve-check]');
  await page.waitForTimeout(300);
  ok(await gr103.locator('.ink').innerText() === 'QT', 'Resolve & check stamps initials');
  ok(await gr103.locator('.item-note.resolved').count() === 1, 'issue note struck through after resolve');

  // Flag a new issue via ⚑ quick-pick
  const gr402 = page.locator('.item-row[data-item="gr402_a"]');
  await gr402.locator('.flag-btn').click();
  await page.waitForTimeout(300);
  await page.click('.chip-pick[data-note="DAMAGED"]');
  await page.waitForTimeout(300);
  ok((await gr402.locator('.item-note').innerText()).includes('DAMAGED'), 'quick-pick flag writes red note');

  // Add a room note
  await page.click('[data-add-note]');
  await page.fill('.note-form input[name=text]', 'Touch up paint N wall');
  await page.click('.note-form .btn');
  await page.waitForTimeout(300);
  ok((await page.locator('.room-head').innerText()).includes('TOUCH UP PAINT N WALL'), 'room note added');

  // Footer / prev-next
  ok((await page.locator('.foot-mid').innerText()).includes('Room 101'), 'footer shows room');

  // Go-to-room keypad
  await page.click('[data-goto]');
  await page.fill('.goto-form input[name=num]', '101');
  await page.click('.goto-form .btn');
  await page.waitForTimeout(300);
  ok(page.url().includes('#/room/101'), 'go-to-room routes');

  // Admin PIN + add room
  await page.goto(BASE + '#/floor/2');
  await page.waitForTimeout(300);
  await page.click('[data-add-room]');
  await page.waitForTimeout(300);
  await page.fill('.pin-form input[name=pin]', '9999');
  await page.click('.pin-form .btn');
  await page.waitForTimeout(200);
  ok(await page.locator('.pin-err:not(.hidden)').count() === 1, 'wrong PIN rejected');
  // Read the demo PIN from config rather than duplicating it here — one place
  // to change, and no second copy of a credential in the repo.
  await page.fill('.pin-form input[name=pin]', DEMO_PIN);
  await page.click('.pin-form .btn');
  await page.waitForTimeout(300);
  ok(page.url().includes('room-new'), 'correct PIN opens add-room');
  await page.fill('#room-form input[name=number]', '201');
  await page.selectOption('#room-form select[name=type]', 'qq-studio-connector');
  await page.click('#room-form .btn');
  await page.waitForTimeout(400);
  ok(page.url().includes('#/room/201'), 'room 201 created & routed');
  ok(await page.locator('.item-row').count() === 40, 'room 201 pre-loaded 40 items from template');
  ok(await page.locator('.item-row .ink').count() === 0, 'new room starts unchecked');

  // Regression: re-saving room settings must NOT wipe existing check-offs
  await page.goto(BASE + '#/room-new/1?edit=101');
  await page.waitForTimeout(400);
  await page.selectOption('#room-form select[name=type]', 'qq-studio-connector');
  await page.click('#room-form .btn');
  await page.waitForTimeout(400);
  ok(page.url().includes('#/room/101'), 'edit-save routes back to room');
  const inkCount = await page.locator('.item-row .ink').count();
  ok(inkCount >= 14, `re-applying template preserves check-offs (${inkCount} checked)`);

  // Persistence across reload (demo localStorage)
  await page.goto(BASE + '#/room/101');
  await page.reload();
  await page.waitForTimeout(600);
  const gr402b = page.locator('.item-row[data-item="gr402_a"]');
  ok((await gr402b.locator('.item-note').innerText()).includes('DAMAGED'), 'demo data persists across reload');

  // Service worker registered
  const swState = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return reg ? 'registered' : 'none';
  });
  ok(swState === 'registered', 'service worker registered');

  // Manifest reachable & valid
  const mf = await page.evaluate(async () => {
    const r = await fetch('./manifest.webmanifest'); return r.ok ? r.json() : null;
  });
  ok(mf && mf.display === 'standalone' && mf.icons.length === 3, 'manifest valid');

  // ---- v1.8.0: theme (light default, Settings seg, ⋮ toggle, persistence) ----
  const theme = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  ok(await theme() === 'light', 'default theme is light');
  await page.goto(BASE + '#/settings');
  await page.waitForTimeout(300);
  ok(await page.locator('.theme-seg [data-theme-set="light"].on').count() === 1, 'Settings seg marks Light active');
  await page.click('[data-theme-set="dark"]');
  await page.waitForTimeout(200);
  ok(await theme() === 'dark', 'Dark seg switches data-theme');
  ok(await page.evaluate(() => localStorage.getItem('h2sep-theme')) === 'dark', 'theme choice stored (h2sep-theme)');
  await page.reload();
  await page.waitForTimeout(600);
  ok(await theme() === 'dark', 'dark theme survives reload');
  await page.goto(BASE + '#/room/101');
  await page.waitForTimeout(300);
  await page.click('[data-more]');
  await page.waitForTimeout(300);
  const themeBtn = page.locator('.sheet [data-act=theme]');
  ok(await themeBtn.count() === 1, 'room ⋮ sheet has theme toggle');
  ok((await themeBtn.innerText()).includes('Light mode'), '⋮ toggle offers Light while dark');
  await themeBtn.click();
  await page.waitForTimeout(200);
  ok(await theme() === 'light', '⋮ toggle flips back to light');

  // ---- v1.8.0: 📎 reference chips (still on room 101) ----
  const gr500 = page.locator('.item-row[data-item="gr500_a"]');
  ok((await gr500.locator('.ref-count').innerText()).trim() === '📎 2 refs', 'GR-500 shows 📎 2 refs chip');
  const gr403r = page.locator('.item-row[data-item="gr403_a"]');
  ok((await gr403r.locator('.ref-count').innerText()).trim() === '📎 1 ref', 'GR-403 chip is singular (1 ref)');
  // Since the v1.8.1 refs rework every line joins the index (untagged lines
  // join by item id), so full coverage is the invariant worth pinning: a
  // regression that drops an item's refs shows up as a missing chip here.
  ok(await page.locator('.ref-count').count() === 40, 'all 40 lines carry a refs chip');
  await gr403r.locator('.ref-count').click();
  await page.waitForTimeout(300);
  const refSheetText = await page.locator('.scrim .sheet').innerText();
  // CSS uppercases the section head, so innerText reads REFERENCES
  ok(/references/i.test(refSheetText), 'chip opens the References sheet');
  ok(refSheetText.includes('ID-5.8'), 'refs sheet shows the sheetId');
  // pin the sheet identity: every item sheet renders the same References block,
  // so also require the NEUTRAL refs sheet — ref links present, none of the
  // flag/checked/issue furniture (chip grid, who-line, action buttons)
  ok(await page.locator('.scrim .ref-link').count() === 1, 'refs sheet lists GR-403’s single ref link');
  ok(await page.locator('.scrim .chip-grid, .scrim .who-line, .scrim [data-act]').count() === 0,
     'chip opens the neutral refs sheet, not a flag/check sheet');
  ok(await gr403r.locator('.ink').count() === 0, 'chip tap did NOT check the row');
  // ref link -> plan-snippet popup (GR-403's ref is kind 'plan' with a bundled
  // snippet under ./refs/, so this stays local — no Drive/network involved)
  await page.locator('.scrim .ref-link').click();
  await page.waitForTimeout(300);
  ok(await page.locator('.pop-scrim').count() === 1, 'ref link opens the snippet popup');
  ok(await page.locator('.pop-scrim [data-bed] img').count() === 1, 'popup shows the local plan snippet image');
  await page.click('.pop-scrim .paper-close');
  await page.waitForTimeout(300);
  ok(await page.locator('.pop-scrim').count() === 0, '✕ closes the popup');
  // the refs sheet intentionally stays open beneath the popup — close it now
  await page.locator('.scrim').click({ position: { x: 5, y: 5 } });
  await page.waitForTimeout(300);
  ok(await page.locator('.scrim').count() === 0, 'refs sheet closes on scrim tap');
  // refs never block checking: a plain row tap on the same item still checks
  await gr403r.locator('[data-rowtap]').click();
  await page.waitForTimeout(300);
  ok(await gr403r.locator('.ink').innerText() === 'QT', 'plain row tap still checks item with refs');
  await gr403r.locator('.box').click();
  await page.waitForTimeout(300);
  ok((await page.locator('.who-line').innerText()).includes('QA Tester'), 'item sheet still opens on refs item');
  await page.click('[data-act=uncheck]'); // restore
  await page.waitForTimeout(300);

  // ---- v1.8.0: ×qty badge (real quantities from the room package) ----
  const qtyb = page.locator('.item-row[data-item="hd12_a"] .qtyb');
  ok(await qtyb.count() === 1, 'qty 2 renders a .qtyb badge');
  ok(await qtyb.innerText() === '×2', 'badge reads ×2');
  ok(await page.locator('.item-row[data-item="gr100_a"] .qtyb').count() === 0, 'qty 1 renders no badge');
  ok(await page.locator('.qtyb').count() === 6, 'exactly the six qty-2 tags carry a badge');

  // ---- v1.9.0: collapsible categories ----
  const bathGroup = page.locator('.cat-group[data-cat="Bath Accessory"]');
  const bathHead = bathGroup.locator('[data-cattoggle]');
  ok(await bathHead.count() === 1, 'each category header is a collapse toggle');
  const bathRowsBefore = await bathGroup.locator('.item-row').count();
  ok(bathRowsBefore > 0, 'bath accessory group has rows to hide');
  ok(await bathGroup.locator('.item-row').first().isVisible(), 'category starts expanded');
  await bathHead.click();
  await page.waitForTimeout(250);
  ok(await bathGroup.locator('.item-row').first().isVisible() === false, 'tapping the header collapses the group');
  ok(await bathHead.getAttribute('aria-expanded') === 'false', 'collapsed header reports aria-expanded=false');
  // other categories are untouched
  ok(await page.locator('.cat-group[data-cat="Appliance"] .item-row').first().isVisible(),
    'collapsing one category leaves the others open');
  await page.reload();
  await page.waitForTimeout(900);
  ok(await page.locator('.cat-group[data-cat="Bath Accessory"] .item-row').first().isVisible() === false,
    'collapsed state survives a reload');
  await page.locator('.cat-group[data-cat="Bath Accessory"] [data-cattoggle]').click();
  await page.waitForTimeout(250);
  ok(await page.locator('.cat-group[data-cat="Bath Accessory"] .item-row').first().isVisible(),
    'tapping again re-opens the group');

  // ---- v1.9.0: how-to hint + sheet/model buttons ----
  const how = await page.locator('.how-line').innerText();
  ok(/tap/i.test(how) && /long-hold/i.test(how), 'room head explains tap + long-hold');
  const printLink = page.locator('.rh-right a[href*="print.html"]');
  ok(await printLink.count() === 1, 'header links to the printable sheet');
  ok((await printLink.getAttribute('href')).includes('room=101'), 'print link carries the room number');
  const modelLink = page.locator('.rh-right a[href*="room-3d.html"]');
  ok(await modelLink.count() === 1, 'room 101 header links to the 3D model');

  // ---- v1.9.0: printable sheet, incl. the dead-zone handoff ----
  // Tapping 🖨 stashes the room so print.html (a cold page with no store)
  // paints immediately instead of spinning when there is no signal.
  const checkedInApp = await page.locator('.item-row.checked').count();
  await printLink.click();
  await page.waitForTimeout(2500);
  ok(/print\.html/.test(page.url()), 'printer icon opens the print sheet');
  ok(await page.locator('.item').count() === 40, 'print sheet lists all 40 lines');
  ok(await page.locator('.box.done').count() === checkedInApp,
     `print sheet check-offs match the app (${checkedInApp})`);
  ok(await page.locator('.p2').count() === 1, 'print sheet has the second page');
  ok(/this phone/i.test(await page.locator('#state').innerText()),
     'sheet paints from the handed-over room without waiting on the network');
  ok((await page.locator('.sheet').innerText()).includes('CONNECTING DOOR LOCK'),
     'room note prints on the sheet');
  await page.goBack();
  await page.waitForTimeout(800);

  // ---- v1.17.0: common areas — home card, section, space screen, print ----
  await page.goto(BASE + '#/');
  await page.waitForTimeout(400);
  await page.click('.common-card');
  await page.waitForTimeout(400);
  ok(page.url().includes('#/common'), 'home Common Areas card routes to #/common');
  ok(await page.locator('.space-card').count() === 2, 'common screen lists both demo spaces');
  ok(/level 1/i.test(await page.locator('.common-floor-head').first().innerText()),
     'spaces grouped under a Level heading');
  const womensCard = page.locator('.space-card', { hasText: 'WOMENS' });
  ok(await womensCard.count() === 1, 'space card shows the NAME, not just a number');

  // Space screen
  await womensCard.click();
  await page.waitForTimeout(400);
  ok(page.url().includes('#/room/019'), 'space card routes to its doc');
  ok((await page.locator('.rh-num').innerText()) === 'WOMENS', 'space head shows the name');
  ok((await page.locator('.rh-type').innerText()).includes('SPACE 019'), 'space head shows number + level');
  ok(await page.locator('.item-row').count() === 24, 'WOMENS lists its 24 lines (incl. 4 sheet-enriched)');
  // Trade sections precede FF&E in the crew walk order
  const listText = await page.locator('main').innerText();
  ok(listText.indexOf('Paint') >= 0 && listText.indexOf('Bath Accessory') >= 0
     && listText.indexOf('Paint') < listText.indexOf('FF&E'),
     'trades sort above FF&E on the space screen');
  ok(await page.locator('.rh-right a[href*="refs.html"]').count() === 0,
     'space offers no submittal-refs button (guest-room data)');

  // Check-off works on a space doc
  const spaceRow = page.locator('.item-row').first();
  await spaceRow.locator('.box').click();
  await page.waitForTimeout(300);
  ok(await spaceRow.locator('.ink').count() === 1, 'checking an item works on a space');

  // ⋮ menu: no Room settings for spaces; add-item present and works
  await page.click('[data-more]');
  await page.waitForTimeout(300);
  ok(await page.locator('[data-act=edit]').count() === 0, 'space menu hides Room settings');
  ok(await page.locator('[data-act=add-item]').count() === 1, 'space menu offers add-item');
  await page.click('[data-act=add-item]');
  await page.waitForTimeout(300);
  await page.fill('.note-form input[name=code]', 'PA-300');
  await page.fill('.note-form input[name=label]', 'Console table (per designer)');
  await page.click('.note-form .btn');
  await page.waitForTimeout(400);
  ok(await page.locator('.item-row').count() === 25, 'Austin can add a line item to a space');

  // Template-settings deep link bounces off spaces (belt for the hidden menu)
  await page.goto(BASE + '#/room-new/1?edit=019');
  await page.waitForTimeout(500);
  ok(page.url().includes('#/room/019'), 'template settings deep-link bounces back to the space');

  // Space print sheet: flowing trade-ordered layout, name title, live counts
  const spPrint = page.locator('.rh-right a[href*="print.html"]');
  await spPrint.click();
  await page.waitForTimeout(2500);
  ok(/print\.html\?room=019/.test(page.url()), 'space 🖨 opens its print sheet');
  ok(await page.locator('.sheet.sp').count() === 1, 'space sheet uses the flow layout');
  const spSheet = await page.locator('.sheet').innerText();
  ok(spSheet.includes('WOMENS') && spSheet.includes('Space 019'), 'space sheet titled by name + number');
  ok(spSheet.includes('Common Area Turnover Checklist'), 'space sheet says what it is');
  ok(await page.locator('.item').count() === 25, 'space sheet lists all 25 lines (incl. the added one)');
  ok(await page.locator('.box.done').count() === 1, 'space sheet shows the check-off');
  ok(await page.locator('#model-link').count() === 0, 'space sheet offers no 3D model');
  await page.goBack();
  await page.waitForTimeout(600);

  // Guest floor grids stay guest-only; go-to finds spaces
  await page.goto(BASE + '#/floor/1');
  await page.waitForTimeout(400);
  ok(!(await page.locator('main').innerText()).includes('WOMENS'),
     'floor 1 guest grid does not leak spaces');
  await page.click('[data-goto]');
  await page.fill('.goto-form input[name=num]', '019');
  await page.click('.goto-form .btn');
  await page.waitForTimeout(300);
  ok(page.url().includes('#/room/019'), 'go-to keypad reaches a space by number');

  // Dashboard demo: Common Areas row present, keys metric NOT polluted
  await page.goto(new URL('dashboard.html?demo=1', BASE).href);
  await page.waitForTimeout(900);
  const dashText = await page.locator('body').innerText();
  ok(dashText.includes('Common Areas'), 'dashboard shows a Common Areas row');
  const kRooms = (await page.locator('#k-rooms').innerText()).replace(/\s/g, '');
  ok(!kRooms.includes('/3'), `dashboard keys count excludes the 2 spaces (got ${kRooms})`);

  ok(errors.length === 0, 'no console/page errors' + (errors.length ? ' -> ' + errors.join(' | ') : ''));
  await ctx.close();
}

// ---------- iOS gate (Safari UA, not standalone) ----------
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.waitForTimeout(600);
  const t = await page.locator('body').innerText();
  ok(t.includes('Add to Home Screen'), 'iOS un-installed shows install gate');
  ok(await page.locator('#wb-name').count() === 0, 'iOS gate hides name form until installed');
  await page.click('#view-only');
  await page.waitForTimeout(400);
  ok(await page.locator('.hero').count() === 1, 'view-only skip reaches home');
  await page.goto(BASE + '#/room/101');
  await page.waitForTimeout(400);
  ok(await page.locator('.readonly-strip').count() === 1 || await page.locator('.item-row').count() === 40,
     'room renders read-only on iOS Safari');
  const before = await page.locator('.item-row[data-item="gr403_a"] .ink').count();
  await page.locator('.item-row[data-item="gr403_a"] .box').click();
  await page.waitForTimeout(300);
  const after = await page.locator('.item-row[data-item="gr403_a"] .ink').count();
  ok(before === after, 'iOS Safari tap does NOT check (gated)');
  await ctx.close();
}

await browser.close();
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures ? 1 : 0);
