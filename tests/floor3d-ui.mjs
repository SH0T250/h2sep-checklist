// Headless checks for the assembled Floor 1 scene, platform/floor3d.html.
//
//   python3 -m http.server 8451 --directory platform
//   node tests/floor3d-ui.mjs [port]
//
// Same shape as tests/floor1-ui.mjs: launch, assert, print a pass/fail tally,
// exit non-zero on any failure or any console error.
//
// The checks that matter most are not "does it draw". They are the five things
// an earlier build of this scene got wrong and a verifier caught:
//   V1  no unproven 4'-3" working-wall shift is encoded anywhere.
//   V2  room 118's proof text quotes the PRINTED 18'-3 1/2" clear depth and
//       does not resurrect the debunked 18'-11" leg.
//   V3  each connecting opening is cut ONCE, from one datum, with no sliver of
//       wall left standing inside the hole.
//   V4  the packaged bundle path either inlines the scene or hard stops; it
//       never renders a silent blank iframe.
//   V5  both of room 118's clear floor circles are drawn, the second one
//       dashed, and the legend says both are stylized.
import { chromium } from '/opt/node22/lib/node_modules/playwright/node_modules/playwright-core/index.mjs';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXE = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const PORT = process.argv[2] || '8451';
const B = `http://localhost:${PORT}/floor3d.html?cb=${Date.now()}`;

let pass = 0, fail = 0;
const t = (name, cond, detail = '') => {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (detail ? '  ' + detail : '')); }
};

const browser = await chromium.launch({ executablePath: EXE,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 960 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });

await p.goto(B, { waitUntil: 'load' });
await p.waitForFunction(() => window.__FLOOR3D && window.__FLOOR3D.ready, { timeout: 45000 });
await p.waitForTimeout(1200);

const F = await p.evaluate(() => ({
  painted: window.__FLOOR3D.painted,
  floor: window.__FLOOR3D.floor,
  spaces: window.__FLOOR3D.spaces,
  pins: window.__FLOOR3D.pins,
  labels: window.__FLOOR3D.labels,
  meshes: window.__FLOOR3D.meshes,
  conn: window.__FLOOR3D.conn,
  walls: window.__FLOOR3D.walls(),
  rings: window.__FLOOR3D.rings(),
}));

console.log('\nTHE PLATE IS BUILT');
t('scene reports ready and painted', F.painted);
const rooms = F.spaces.filter(s => s.kind === 'king' || s.kind === 'qq');
const common = F.spaces.filter(s => s.kind === 'common' || s.kind === 'boh');
const stops = F.spaces.filter(s => s.kind === 'stop');
t('16 guest rooms', rooms.length === 16, String(rooms.length));
t('all 8 King keys and all 8 QQ keys', ['104','106','108','110','112','114','116','118',
  '101','103','105','107','109','111','113','115'].every(n => rooms.some(r => r.no === n)));
t('at least 30 common areas drawn', common.length >= 30, String(common.length));
t('46 or more spaces have geometry', rooms.length + common.length >= 46,
  String(rooms.length + common.length));
t('the pool deck is a hard stop with no geometry', stops.length === 1
  && stops[0].no === 'ZONEB' && stops[0].rects === 0);

console.log('\nEVERY SPACE HAS SOMETHING IN IT');
const bareRoom = rooms.filter(s => s.parts < 20);
t('every guest room carries real interior massing', bareRoom.length === 0,
  bareRoom.map(s => s.no + ':' + s.parts).join(','));
const withDoc = common.filter(s => s.total > 0);
const bareCommon = withDoc.filter(s => s.massed === 0);
t('every common area with a checklist carries stylized massing', bareCommon.length === 0,
  bareCommon.map(s => s.no).join(','));
t('common areas with no checklist doc are still drawn',
  common.filter(s => s.total === 0).every(s => s.parts > 0));

console.log('\nLIVE STATUS PAINT');
const truth = await p.evaluate(async () => {
  const r = await fetch('data/floor1-staged.json');
  const j = await r.json();
  let done = 0, total = 0, issues = 0;
  for (const d of Object.values(j.docs)) {
    for (const v of Object.values(d.items || {})) {
      if (v.deleted) continue;
      total++; if (v.checked) done++;
      if (v.issue && !v.issueResolved) issues++;
    }
  }
  return { done, total, issues };
});
t('done count matches the checklist file', F.floor.done === truth.done,
  F.floor.done + ' vs ' + truth.done);
t('382 crew check-offs are painted', F.floor.done === 382, String(F.floor.done));
t('289 open issues are counted', F.floor.issues === 289, String(F.floor.issues));
t('the chip reports the same numbers as the scene',
  (await p.textContent('#k-done')).replace(/,/g, '') === String(F.floor.done)
  && (await p.textContent('#k-iss')).replace(/,/g, '') === String(F.floor.issues));
t('no space claims progress it has no document for',
  F.spaces.every(s => s.total > 0 || (s.done === 0 && s.issues === 0)));

console.log('\nOPEN-ISSUE PINS  (C2: a vertical pin, not a rug)');
const withIssues = F.spaces.filter(s => s.issues > 0);
t('one pin per space with open issues', F.pins === withIssues.length,
  F.pins + ' pins for ' + withIssues.length + ' spaces');
t('every space with open issues has a pin', withIssues.every(s => s.pin));
t('no space without open issues has a pin', F.spaces.filter(s => s.issues === 0).every(s => !s.pin));
const pinH = await p.evaluate(() => {
  let minY = 1e9;
  window.__FLOOR3D.spaces.forEach(function () {});
  scene.traverse(o => {
    if (o.isMesh && o.material === MAT.pin && o.geometry.type === 'CylinderBufferGeometry')
      minY = Math.min(minY, o.position.y + o.scale.y / 2);
  });
  return { top: minY, cut: WALLCUT };
});
t('pin stems reach the wall cut, not the floor', pinH.top >= pinH.cut - 0.05,
  'stem top ' + pinH.top.toFixed(2) + ' vs cut ' + pinH.cut);
const legend = await p.textContent('.legend');
t('the legend promises the pin the model actually draws',
  /vertical red pin/i.test(legend) && /wall cut/i.test(legend) && /open-issue count/i.test(legend));
t('the legend says where the pin stands in a common area',
  /label anchor/i.test(legend) && /locates no door/i.test(legend));

console.log('\nV3  ONE HOLE, ONE DATUM, NO SLIVERS');
t('exactly two connecting openings on the floor', F.conn.length === 2);
for (const c of F.conn) {
  const inHole = F.walls.filter(w =>
    w.u0 < c.u - 0.01 && w.u1 > c.u + 0.01 &&
    w.v0 < c.v1 - 0.04 && w.v1 > c.v0 + 0.04 && w.y1 > 1.0);
  t(`${c.pair} opening is clear of wall`, inHole.length === 0,
    inHole.map(w => w.v0.toFixed(2) + '-' + w.v1.toFixed(2)).join(' '));
  // Only walls that run ACROSS the building through this datum and overlap the
  // hole's own V range count; a corridor or exterior wall running ALONG the
  // building crosses every U and is not a second cut of this opening.
  const crossing = F.walls.filter(w => w.u0 < c.u && w.u1 > c.u && w.y1 > 1.0
    && (w.u1 - w.u0) < 1.5 && w.v1 > c.v0 - 2 && w.v0 < c.v1 + 2);
  const bands = new Set(crossing.map(w => w.u0.toFixed(2) + ':' + w.u1.toFixed(2)));
  t(`${c.pair} is cut in ONE wall band, not three`, bands.size === 1,
    [...bands].join(' | '));
}
t('the 116|118 datum is A100 measured hole V 17.15 to 20.49',
  F.conn.some(c => c.pair === '116|118' && Math.abs(c.v0 - 17.15) < 0.01 && Math.abs(c.v1 - 20.49) < 0.01));
t('the 101|103 datum is A100 measured hole V 45.27 to 48.60',
  F.conn.some(c => c.pair === '101|103' && Math.abs(c.v0 - 45.27) < 0.01 && Math.abs(c.v1 - 48.60) < 0.01));
t('both spreads are written up beside the cut',
  F.conn.every(c => /A550|A555/.test(c.src) && /A100/.test(c.src)));

console.log('\nV5  BOTH OF ROOM 118 CLEAR FLOOR CIRCLES, DRAWN UNALIKE');
t('the bathroom turning circle is one solid ring', F.rings.solid === 1, String(F.rings.solid));
t('the second circle is drawn dashed, in segments', F.rings.dashed === 18, String(F.rings.dashed));
t('the legend calls the second circle stylized in size AND position',
  /SIZE AND\s*POSITION BOTH STYLIZED/i.test(legend.replace(/\s+/g, ' ')));

console.log('\nHOVER CARD AND CLICK THROUGH');
await p.evaluate(() => window.__FLOOR3D.open('118'));
await p.waitForTimeout(200);
const card = await p.evaluate(() => window.__FLOOR3D.card());
t('the card opens on room 118', !card.hidden && card.no === '118');
t('the card carries the basis chip', card.basis === 'MEASURED');
t('the card carries done / total and open issues',
  /DONE\s*14\s*\/\s*76/.test(card.nums) && /OPEN ISSUES\s*22/.test(card.nums));
t('V2  the 118 note quotes the PRINTED 18\'-3 1/2" clear depth',
  card.note.includes('18\'-3 1/2"') && /PRINTS and labels CLEAR/.test(card.note));
t('V2  the 118 note does not resurrect the debunked 18\'-11" leg',
  !card.note.includes('18\'-11"') && !card.src.includes('18\'-11"'));
t('the card names the pin basis for a guest room', /GR-1 entry door/.test(card.note));
await p.evaluate(() => window.__FLOOR3D.open('S-024'));
await p.waitForTimeout(150);
const anchorCard = await p.evaluate(() => window.__FLOOR3D.card());
t('a label-anchor space says its extent is the label box',
  /LABEL BOX, NOT A MEASURED ROOM/.test(anchorCard.note), anchorCard.note.slice(0, 60));
t('a label-anchor space is chipped SCALED', anchorCard.basis === 'SCALED');
await p.evaluate(() => window.__FLOOR3D.open('S-ZONEB'));
await p.waitForTimeout(150);
const stopCard = await p.evaluate(() => window.__FLOOR3D.card());
t('the pool deck card is an honest hard stop',
  /NOT ON A100/.test(stopCard.src) && /NO GEOMETRY IS DRAWN/.test(stopCard.note));

const hover = await p.evaluate(async () => {
  const c = document.querySelector('#stage canvas');
  const r = c.getBoundingClientRect();
  c.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse',
    clientX: r.width * 0.62, clientY: r.height * 0.45 }));
  await new Promise(r2 => setTimeout(r2, 120));
  return { hidden: document.getElementById('card').hidden,
           no: document.getElementById('c-no').textContent };
});
t('hovering the plate opens a card for a real space', !hover.hidden && hover.no.length > 0, hover.no);

const routes = await p.evaluate(() => ({
  room: window.__FLOOR3D.target('110'),
  space: window.__FLOOR3D.target('S-018'),
  none: window.__FLOOR3D.target('S-141'),
}));
t('a guest room routes to its room checklist', routes.room === '#/room/110', String(routes.room));
t('a common area routes to its space checklist', routes.space === '#/space/S018', String(routes.space));
t('a space with no checklist doc routes nowhere', routes.none === null, String(routes.none));

console.log('\nVIEW BAR AND EASED TRANSITIONS');
const d = (a, b) => Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1], a.p[2] - b.p[2]);
const before = await p.evaluate(() => window.__FLOOR3D.cam());
await p.click('#views button[data-view="guest"]');
await p.waitForTimeout(1500);
const after = await p.evaluate(() => window.__FLOOR3D.cam());
t('GUEST WING moves the camera', d(before, after) > 20, d(before, after).toFixed(1));
const eased = await p.evaluate(() => window.__FLOOR3D.probeTween('overview'));
t('the move is eased, not a jump cut', eased.tweening === true && eased.ms >= 400,
  JSON.stringify(eased));
await p.waitForTimeout(1400);
for (const v of ['common', 'overview', 'exploded']) {
  const p0 = await p.evaluate(() => window.__FLOOR3D.cam());
  await p.click(`#views button[data-view="${v}"]`);
  await p.waitForTimeout(1500);
  const p1 = await p.evaluate(() => window.__FLOOR3D.cam());
  t(`${v.toUpperCase()} moves the camera`, d(p0, p1) > 15, d(p0, p1).toFixed(1));
}
const drawn = F.spaces.filter(s => s.rects > 0).map(s => s.no);
const lifts = await p.evaluate(() => window.__FLOOR3D.lifts());
const flat = drawn.filter(n => !(lifts[n] > 3));
t('EXPLODED lifts every space, not only the guest rooms', flat.length === 0, flat.join(','));
const commonLift = common.filter(s => s.rects > 0).map(s => lifts[s.no]);
t('EXPLODED lifts common areas as far as guest rooms', Math.max(...commonLift) > 15,
  Math.max(...commonLift).toFixed(1));
await p.click('#views button[data-view="overview"]');
await p.waitForTimeout(1500);
const down = await p.evaluate(() => window.__FLOOR3D.lifts());
t('leaving EXPLODED puts every space back down', drawn.every(n => down[n] < 1.0));

console.log('\nTAGS TOGGLE');
await p.click('#btn-tags');
await p.waitForTimeout(300);
t('TAGS off hides every label',
  await p.evaluate(() => [...document.querySelectorAll('.lbl')].every(e => e.style.display === 'none')));
await p.click('#btn-tags');
await p.waitForTimeout(400);
t('TAGS on brings labels back',
  await p.evaluate(() => [...document.querySelectorAll('.lbl')].some(e => e.style.display === 'block')));

console.log('\nTITLE BLOCK AND HONESTY');
const panel = await p.textContent('#panel');
t('title block names the sheet, the issue and revision 5',
  /A100 FIRST FLOOR PLAN/.test(panel) && /08\/09\/24/.test(panel) && /12\/12\/24 REVISED PER RFI/.test(panel));
t('title block flags that revision 5 postdates the sheet date',
  /REVISION 5 POSTDATES THE SHEET DATE/i.test(panel));
t('the Triun mark is inlined, not fetched',
  await p.evaluate(() => (document.getElementById('logo').getAttribute('src') || '').startsWith('data:image/png;base64,')));
t('the panel lists the pool deck under NOT ON THIS SHEET',
  /Not on this sheet/i.test(panel) && /Pool Deck/i.test(panel));
t('the footer says the wall cut is a convention, not a dimension',
  /a drafting convention, not a\s*sheet dimension/i.test(panel.replace(/\s+/g, ' ')));

console.log('\nSTATUS PAINT FAILURE IS HONEST, NEVER SILENT  (V4 family)');
const p2 = await ctx.newPage();
await p2.route('**/data/floor1-staged.json', r => r.abort());
await p2.goto(`http://localhost:${PORT}/floor3d.html?cb=${Date.now()}x`, { waitUntil: 'load' });
await p2.waitForFunction(() => window.__FLOOR3D && window.__FLOOR3D.ready, { timeout: 45000 });
await p2.waitForTimeout(400);
t('with no status data the scene still draws its geometry',
  (await p2.evaluate(() => window.__FLOOR3D.meshes)) > 400);
t('with no status data the chip says so in red',
  !(await p2.evaluate(() => document.getElementById('k-warn').hidden))
  && /STATUS PAINT UNAVAILABLE/.test(await p2.textContent('#k-warn')));
t('with no status data a banner explains it', !(await p2.evaluate(() => document.getElementById('err').hidden)));
t('with no status data nothing is painted or pinned',
  (await p2.evaluate(() => window.__FLOOR3D.painted)) === false
  && (await p2.evaluate(() => window.__FLOOR3D.pins)) === 0);
await p2.close();

console.log('\nSOURCE RULES');
const src = readFileSync(resolve(ROOT, 'platform/tools/floor3d.src.html'), 'utf8');
const out = readFileSync(resolve(ROOT, 'platform/floor3d.html'), 'utf8');
const mod = readFileSync(resolve(ROOT, 'platform/js/modules/bim/module.js'), 'utf8');
const bld = readFileSync(resolve(ROOT, 'platform/tools/build_floor3d.mjs'), 'utf8');
t('V1  no wwShift constant anywhere', !/wwShift/.test(src));
// The only place 4'-3" may appear is inside the spec's own instruction not to
// encode it. Anywhere else, in any form, is the failure this check exists for.
const shiftHits = [...src.matchAll(/4'-3"/g)]
  .filter(m => !/not encode/i.test(src.slice(Math.max(0, m.index - 90), m.index).replace(/\s+/g, ' ')));
t('V1  no 4\'-3" or 51 * KIN shift is encoded',
  !/51\s*\*\s*KIN/.test(src) && shiftHits.length === 0, String(shiftHits.length) + ' loose hits');
t('V1  the connector comment says what the code does',
  /set out from the one PROVEN\s*fixture/.test(src.replace(/\s+/g, ' ').replace(/ /g, ' '))
  || /set out from the one PROVEN fixture/.test(src.replace(/\s+/g, ' ')));
t('no em dash or en dash in the source', !/[—–]/.test(src));
t('no em dash or en dash in the generated page', !/[—–]/.test(out));
t('no em dash or en dash in the module', !/[—–]/.test(mod));
t('the generated page says it is generated', /GENERATED FILE - do not hand edit/.test(out));
t('three.js is inlined, not fetched',
  /Three\.js Authors/.test(out) && !/<script[^>]+src=/.test(out));
t('the build copies three.js out of room3d.html', /room3d\.html/.test(bld));
t('V4  the module hard stops rather than framing a blank in a bundle',
  /__H2SEP_FLOOR_SRCDOC/.test(mod) && /__H2SEP_FLOOR_DATA/.test(mod)
  && /FLOOR 1 MODEL IS NOT IN THIS BUNDLE/.test(mod));
t('the module adds Floor 1 to the Model section',
  /path: '#\/floor', label: 'Floor 1'/.test(mod) && /section: 'Model'/.test(mod));

console.log('\n' + '='.repeat(60));
console.log(`${pass} passed, ${fail} failed`);
console.log('console errors: ' + (errs.length ? ('\n  ' + errs.slice(0, 8).join('\n  ')) : 'none'));
await browser.close();
process.exit(fail || errs.length ? 1 : 0);
