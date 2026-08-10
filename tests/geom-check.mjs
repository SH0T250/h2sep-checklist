// Each room must render its OWN geometry: wide vs standard width, standard vs
// extended depth, the mirrored rooms actually reversed, and — the one that
// matters most in the field — a room with no connecting door must not draw one.
import { chromium } from 'playwright';

// [room, expected W, expected D, expected mirror, expected connecting]
const F = 1 / 12;
const QQ_W = 12.0, WIDE_W = 12 + 11.375 * F, QQ_D = 36 + 5 * F, EXT_D = 38 + 9 * F;
// [room, W, D, mirror, connecting, EXPECTED VARIANT]. The variant is pinned HERE
// rather than read back off the page: taking it from window.__h2sep3d meant the
// expectation moved with the page, so a room claiming the wrong type agreed with
// itself and the check could never fail.
const CASES = [
  ['101', WIDE_W, QQ_D,  false, true,  'QQ Wide Connecting'],
  ['103', QQ_W,   QQ_D,  true,  true,  'QQ Connecting'],
  ['215', QQ_W,   QQ_D,  false, true,  'QQ Connecting'],
  ['436', QQ_W,   QQ_D,  true,  true,  'QQ Connecting'],
  ['105', QQ_W,   QQ_D,  false, false, 'QQ Studio'],
  ['115', QQ_W,   QQ_D,  false, false, 'QQ Studio'],
  ['201', WIDE_W, QQ_D,  false, false, 'QQ Wide'],
  ['301', WIDE_W, QQ_D,  false, false, 'QQ Wide'],
  ['230', QQ_W,   EXT_D, true,  false, 'QQ Extended'],
  ['432', QQ_W,   EXT_D, true,  false, 'QQ Extended'],
  ['334', QQ_W,   QQ_D,  true,  false, 'QQ Studio'],   // floor 3, even side
  ['405', QQ_W,   QQ_D,  false, false, 'QQ Studio'],   // floor 4, odd side
];

// COVERAGE GATE. The cases below spot-check ten representative rooms, but the
// real hazard is a room that is OFFERED a 3D model and has no geometry for it.
// That used to fall back to room 101 silently; it now shows a no-model page,
// but either way the room should never have been in MODEL_ROOMS. Prove the two
// lists agree before testing anything, by reading BOTH files rather than
// trusting one of them.
import { readFileSync } from 'node:fs';
const CFG = readFileSync(new URL('../js/config.js', import.meta.url), 'utf8');
const GEOM_SRC = readFileSync(new URL('../room-3d.html', import.meta.url), 'utf8');
const modelRooms = JSON.parse(CFG.match(/MODEL_ROOMS = (\[[\s\S]*?\])/)[1]
  .replace(/'/g, '"').replace(/,(\s*])/, '$1'));
const geomBlock = GEOM_SRC.match(/var ROOM_GEOM = \{([\s\S]*?)\n\};/)[1];
const geomRooms = new Set([...geomBlock.matchAll(/^\s*'(\d+)':/gm)].map((m) => m[1]));
const noGeom = modelRooms.filter((r) => !geomRooms.has(r));
const orphan = [...geomRooms].filter((r) => !modelRooms.includes(r));
console.log(`coverage: ${modelRooms.length} MODEL_ROOMS · ${geomRooms.size} ROOM_GEOM entries in the BUILT room-3d.html`);
if (noGeom.length) console.log('FAIL  MODEL_ROOMS with NO geometry: ' + noGeom.join(', '));
if (orphan.length) console.log('FAIL  ROOM_GEOM entries not offered in the app: ' + orphan.join(', '));
let coverageFail = noGeom.length + orphan.length;
if (!coverageFail) console.log('ok    every room offered a model has its own geometry, and vice versa');

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 900, height: 700 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));

let pass = 0, fail = 0;
const near = (a, e) => Math.abs(a - e) < 0.01;

for (const [room, wantW, wantD, wantMirror, wantConn, wantVariant] of CASES) {
  await p.goto(`http://localhost:8322/room-3d.html?room=${room}`,
               { waitUntil: 'load', timeout: 90000 });
  await p.waitForTimeout(3500);
  const g = await p.evaluate(() => {
    const h = window.__h2sep3d;
    if (!h) return null;
    return {
      W: h.W, D: h.D, mirror: h.mirror, conn: h.conn, variant: h.variant,
      hasDoorPart: h.hasDoorPart,
      // Does the sidebar actually list a connecting door row?
      doorRow: !!document.querySelector('[data-id="GR-3"]'),
      caveat: (document.getElementById('caveat') || {}).textContent || '',
      // Headings must name the room the CREW knows, never the modelled room's.
      headings: [...document.querySelectorAll('#ministrip b, #drawerbar b, .tb h1')]
        .map((el) => el.textContent.replace(/\s+/g, ' ').trim()),
    };
  }).catch(() => null);

  const problems = [];
  if (!g) problems.push('no test hook');
  else {
    if (!near(g.W, wantW)) problems.push(`W ${g.W.toFixed(3)} != ${wantW.toFixed(3)}`);
    if (!near(g.D, wantD)) problems.push(`D ${g.D.toFixed(3)} != ${wantD.toFixed(3)}`);
    if (g.mirror !== wantMirror) problems.push(`mirror ${g.mirror} != ${wantMirror}`);
    if (g.conn !== wantConn) problems.push(`conn ${g.conn} != ${wantConn}`);
    // The real defect this guards: a solid-wall room drawing a GR-3.
    if (g.hasDoorPart !== wantConn) problems.push(`GR-3 part present=${g.hasDoorPart}, expected ${wantConn}`);
    if (g.doorRow !== wantConn) problems.push(`GR-3 sidebar row=${g.doorRow}, expected ${wantConn}`);
    // The caveat must name the variant it is actually showing.
    if (g.caveat.indexOf(String(g.variant).toUpperCase()) !== 0)
      problems.push(`caveat does not lead with variant: ${g.caveat.slice(0, 48)}`);
    // The defect this guards: a QQ Extended room announcing "QQ STUDIO CONNECTOR".
    const CREW = { 'QQ Wide Connecting': 'QQ STUDIO CONNECTOR', 'QQ Connecting': 'QQ STUDIO CONNECTOR',
                   'QQ Studio': 'QQ STUDIO', 'QQ Wide': 'QQ STUDIO', 'QQ Extended': 'QQ EXTENDED' };
    // Assert the page's OWN variant claim against the pinned expectation first —
    // everything downstream keys off it, so if this is wrong the rest is theatre.
    if (g.variant !== wantVariant) problems.push(`variant is "${g.variant}", expected "${wantVariant}"`);
    const wantName = CREW[wantVariant];
    for (const h of g.headings) {
      if (!h.includes(`ROOM ${room}`)) problems.push(`heading says "${h}", not room ${room}`);
      if (!h.includes(wantName)) problems.push(`heading "${h}" should name ${wantName}`);
    }
  }

  if (problems.length) { fail++; console.log(`FAIL ${room}  ${problems.join(' · ')}`); }
  else { pass++; console.log(`ok   ${room}  ${g.variant} · W=${g.W.toFixed(3)} D=${g.D.toFixed(3)} mirror=${g.mirror} conn=${g.conn}`); }
}

console.log(`\n${pass}/${CASES.length} passed`);
if (errs.length) console.log('page errors:', errs.slice(0, 3));
await b.close();
process.exit(fail || coverageFail || errs.length ? 1 : 0);
