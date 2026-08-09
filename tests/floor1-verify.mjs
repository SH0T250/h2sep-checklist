#!/usr/bin/env node
// Verify the floor-1 build-out as the crew will actually see it: every room
// present under AUSTIN'S name, and the 3D button offered ONLY where a real
// per-room model exists. The container's browser cannot reach Firebase, so the
// live docs come over REST (node can) and are injected into the demo backend —
// the pixels are the shipped app rendering live data.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';

const BASE = 'http://localhost:8322/';
const OUT = '/tmp/claude-0/-home-user/e71b2418-bcd4-506a-95ce-32ce7af669ac/scratchpad/floor1';
mkdirSync(OUT, { recursive: true });

const cfg = readFileSync(new URL('../js/config.js', import.meta.url), 'utf8');
const KEY = cfg.match(/apiKey\s*:\s*["']([^"']+)["']/)[1];
// The expected 3D gating is written out HERE, independently. Reading it out of
// js/config.js — the very file under test — made this check self-referential:
// it passed whatever MODEL_ROOMS happened to say, so it could never catch a
// room being added to or missing from that list. That blindness is exactly how
// the ungated print-sheet 3D button shipped.
const EXPECT_3D = new Set([
  // floor 1 — QQ Studio Connector + QQ Studio
  '101', '103', '105', '107', '109', '111', '113', '115',
  // floor 2 — QQ Wide, QQ Studio, QQ Connecting, QQ Extended
  '201', '203', '205', '207', '209', '211', '213', '215',
  '228', '230', '232', '234', '236',
  // floor 3
  '301', '330', '332', '336',
  // floor 4
  '401', '403', '430', '432', '436',
]);
// Still read the shipped list, but only to assert it MATCHES the expectation.
const MODEL_ROOMS = JSON.parse(
  cfg.match(/MODEL_ROOMS = (\[[\s\S]*?\])/)[1].replace(/'/g, '"').replace(/,(\s*])/, '$1'));

const su = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${KEY}`,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"returnSecureToken":true}' })).json();
const list = await (await fetch(
  'https://firestore.googleapis.com/v1/projects/h2sep-checklist/databases/(default)/documents/projects/h2sep/rooms?pageSize=300',
  { headers: { Authorization: 'Bearer ' + su.idToken } })).json();

const dv = (v) => {
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, dv(x)]));
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dv);
  return null;
};
const rooms = {};
for (const d of (list.documents || [])) {
  const r = Object.fromEntries(Object.entries(d.fields).map(([k, v]) => [k, dv(v)]));
  rooms[r.number] = r;
}
console.log(`live rooms fetched: ${Object.keys(rooms).length}`);

// What floor 1 must look like, by Austin's folder names.
const EXPECT = {
  '101': 'QQ Studio Connector', '103': 'QQ Studio Connector',
  '104': 'King Studio', '106': 'King Studio', '108': 'King Studio',
  '110': 'King Studio', '112': 'King Studio', '114': 'King Studio',
  '105': 'QQ Studio', '107': 'QQ Studio', '109': 'QQ Studio',
  '111': 'QQ Studio', '113': 'QQ Studio', '115': 'QQ Studio',
  '116': 'King Studio Connector', '118': 'King Studio Acc Mod',
};

let fail = 0;
const check = (ok, msg) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + msg); if (!ok) fail++; };

// config.js must agree with the independent expectation above.
check(MODEL_ROOMS.length === EXPECT_3D.size
      && MODEL_ROOMS.every((r) => EXPECT_3D.has(r)),
      `config.js MODEL_ROOMS matches the expected ${EXPECT_3D.size} rooms `
      + `(got ${MODEL_ROOMS.length}: ${MODEL_ROOMS.filter((r) => !EXPECT_3D.has(r)).join(',') || 'no strays'})`);

for (const [no, label] of Object.entries(EXPECT)) {
  const r = rooms[no];
  if (!r) { check(false, `room ${no} exists live`); continue; }
  check(r.typeLabel === label, `room ${no} label is "${label}" (got "${r.typeLabel}")`);
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({
  viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36',
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

await page.goto(BASE + 'index.html?demo=1', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(1800);
const inputs = page.locator('input[type=text]');
if (await inputs.count() >= 2 && await inputs.first().isVisible().catch(() => false)) {
  await inputs.nth(0).fill('QA Preview');
  await inputs.nth(1).fill('QA');
  await page.locator('button:has-text("Start")').first().tap();
  await page.waitForTimeout(1200);
}
await page.evaluate((live) => {
  const db = JSON.parse(localStorage.getItem('h2sep-demo-db-v1'));
  db.rooms = live;                       // the whole live floor plan
  localStorage.setItem('h2sep-demo-db-v1', JSON.stringify(db));
  localStorage.setItem('h2sep-theme', 'light');
}, rooms);

// ---- floor 1 list ----
await page.goto('about:blank');
await page.goto(BASE + 'index.html?demo=1#/floor/1', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(1800);
await shot('01-floor1-list');

const shown = await page.evaluate(() => [...document.querySelectorAll('a.room-card')]
  .map((el) => (el.getAttribute('href') || '').split('/').pop()));
for (const no of Object.keys(EXPECT)) check(shown.includes(no), `floor 1 list shows room ${no}`);
check(shown.length === Object.keys(EXPECT).length,
      `floor 1 lists exactly ${Object.keys(EXPECT).length} rooms (got ${shown.length})`);

// The cards carry util.js abbreviations, not the full label — assert on those.
const bodyTxt = await page.locator('body').innerText();
for (const ab of ['QQ STU CONN', 'QQ STU', 'K STU', 'K STU CONN', 'K STU MOD'])
  check(bodyTxt.includes(ab), `floor 1 card shows "${ab}"`);
check(!/Queen-Queen|King Studio Acc\.|QQ Connecting/.test(bodyTxt),
      'floor 1 shows NO raw database type names');

// ---- 3D button offered only where a model exists ----
for (const [no, label] of Object.entries(EXPECT)) {
  await page.goto('about:blank');
  await page.goto(BASE + `index.html?demo=1#/room/${no}`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1100);
  const has3d = await page.locator('a[href*="room-3d"], button[data-act="model"], #btn-3d').count() > 0;
  const want = EXPECT_3D.has(no);
  check(has3d === want,
        `room ${no} (${label}) 3D button ${want ? 'present' : 'absent'}${has3d === want ? '' : ` — got ${has3d}`}`);
  // The room screen itself must show Austin's full name, not an abbreviation.
  // Read the type element directly — a body-text search false-passes on item
  // labels like "Working Wall @ King Studio Suite". The app upper-cases it.
  const shownType = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.rh-type, .room-type, .rc-type, .hdr-type')][0];
    return el ? el.textContent.trim() : '';
  });
  check(shownType.toUpperCase() === label.toUpperCase(),
        `room ${no} screen type reads "${label}" (got "${shownType}")`);
}

// ---- the PRINT SHEET's own 3D button (this was never checked, and shipped
// ungated: it offered the exhibit for every room, and room-3d.html answered
// with room 101's QQ geometry wearing the requested room's number) ----
for (const no of Object.keys(EXPECT)) {
  await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 60000 });
  await page.evaluate((r) => sessionStorage.setItem('h2sep-print-room', JSON.stringify(r)), rooms[no]);
  await page.goto(BASE + `print.html?room=${no}`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(900);
  const vis = await page.locator('#model-link').isVisible().catch(() => false);
  const want = EXPECT_3D.has(no);
  check(vis === want, `print sheet ${no}: 3D button ${want ? 'present' : 'absent'}${vis === want ? '' : ` — got ${vis}`}`);
}

// ---- a room with no geometry must SAY so, never impersonate room 101 ----
for (const no of ['104', '118', '999']) {
  await page.goto(BASE + `room-3d.html?room=${no}`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1200);
  const txt = (await page.locator('body').innerText()).toUpperCase();
  check(txt.includes('NO 3D MODEL'), `room-3d.html?room=${no} shows the no-model page`);
  check(!txt.includes('QQ STUDIO CONNECTOR'), `room-3d.html?room=${no} does NOT claim to be a QQ Studio Connector`);
}

// ---- no room may claim another room's partner or deficiency ----
for (const [no, wantPartner] of [['215', null], ['236', '238'], ['105', null]]) {
  await page.goto(BASE + `room-3d.html?room=${no}`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(3800);
  const body = await page.locator('body').innerText();
  check(!/ROOM 103 \(CONNECTING\)/.test(body) || no === '103',
        `room ${no} does not name room 103 as its neighbour`);
  // PARTS lives inside the exhibit's IIFE and is NOT on window — read the DOM
  // the crew actually sees instead. (An earlier version of this check used
  // window.PARTS, silently returned null, and would have passed a broken fix.)
  const door = await page.evaluate(() => {
    const row = document.querySelector('#sb-scroll .row[data-id="GR-3"]');
    if (!row) return null;
    return { name: (row.querySelector('.nm') || {}).textContent || '',
             def: !!row.querySelector('.chip.f') && /DEF/.test(row.querySelector('.chip.f').textContent) };
  });
  if (wantPartner) {
    check(!!door && door.name.includes(wantPartner),
          `room ${no} GR-3 row names room ${wantPartner} (got "${door && door.name}")`);
    check(!!door && !door.def,
          `room ${no} does NOT inherit room 101's door-lock deficiency chip`);
  } else {
    check(door === null || !door.def, `room ${no} carries no inherited door deficiency`);
  }
  const title = await page.title();
  check(!/QQ Studio Connector/i.test(title) || ['101','103','215','236','336','401','403','436'].includes(no),
        `room ${no} <title> does not say QQ Studio Connector (got "${title}")`);
}

// ---- screenshots of the new types ----
for (const [no, name] of [['104', '02-king-studio'], ['105', '03-qq-studio'],
                          ['118', '04-king-acc-mod'], ['116', '05-king-connector']]) {
  await page.goto('about:blank');
  await page.goto(BASE + `index.html?demo=1#/room/${no}`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1500);
  await shot(name);
}

// ---- the printable sheet for a brand-new King room ----
// print.html?demo=1 reads the BUNDLED fixture (101/103 only), so drive the real
// path instead: the sessionStorage hand-off the app uses when the crew taps the
// printer icon, carrying the live 104 doc. Firestore is unreachable from this
// container, so the sheet renders from the hand-off and then reports no signal —
// which is exactly the dead-zone path the crew relies on.
await page.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 60000 });
await page.evaluate((r) => sessionStorage.setItem('h2sep-print-room', JSON.stringify(r)), rooms['104']);
await page.goto(BASE + 'print.html?room=104', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(1500);
await shot('06-print-104');
const printTxt = await page.locator('body').innerText();
check(/King Studio/.test(printTxt), 'print sheet for 104 names the King Studio type');
check(/King Headboard/i.test(printTxt), 'print sheet for 104 carries King-only lines');
check(!/Queen Headboard/i.test(printTxt), 'print sheet for 104 carries NO queen-bed lines');

// ---- the 3D exhibit for a QQ Studio (no connecting door) ----
await page.goto(BASE + 'room-3d.html?room=105', { waitUntil: 'load', timeout: 90000 });
await page.waitForTimeout(4500);
await shot('07-3d-105-qq-studio');
await page.goto(BASE + 'room-3d.html?room=230', { waitUntil: 'load', timeout: 90000 });
await page.waitForTimeout(4500);
await shot('08-3d-230-qq-extended');

// The no-model page halts the exhibit script deliberately (that IS the fix), so
// its sentinel is expected. Anything else is a real error.
const realErrors = errors.filter((e) => !/no ROOM_GEOM entry for room/.test(e));
check(realErrors.length === 0, `no unexpected page errors${realErrors.length ? ' — ' + realErrors[0] : ''}`);
console.log(`\n${fail ? fail + ' FAILURES' : 'ALL PASS'}  · shots in ${OUT}`);
await browser.close();
process.exit(fail ? 1 : 0);
