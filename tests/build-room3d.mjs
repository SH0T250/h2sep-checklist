#!/usr/bin/env node
// Build the in-app 3D exhibit (room-3d.html) from the preview package's
// exhibit, re-applying the phone pass. Keeping this as a script means the
// preview exhibit stays the single source of the geometry/labels, and a new
// preview build can be re-wrapped for the app in one command instead of
// hand-merging a 700 KB file.
//
//   node tests/build-room3d.mjs <src preview101/room101-3d.html> <out room-3d.html>
import { readFileSync, writeFileSync } from 'node:fs';

const [src, out] = process.argv.slice(2);
if (!src || !out) { console.error('usage: build-room3d.mjs <src> <out>'); process.exit(1); }
let s = readFileSync(src, 'utf8');

// Every edit is anchored on exact text; a missed anchor means the exhibit
// changed shape and the patch must be reviewed, so fail loudly rather than
// silently shipping an unpatched (desktop-only) build.
function sub(anchor, replacement, label) {
  const n = s.split(anchor).length - 1;
  if (n !== 1) { console.error(`ANCHOR ${n === 0 ? 'MISSING' : 'AMBIGUOUS (' + n + ')'}: ${label}`); process.exit(1); }
  s = s.replace(anchor, replacement);
  console.log('  ok ', label);
}

sub(`<meta name="viewport" content="width=device-width, initial-scale=1">`,
`<!-- viewport-fit=cover so the notch/home-indicator areas are ours to pad -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="theme-color" content="#0b0f13">
<link rel="icon" href="./icons/favicon-48.png">`, 'viewport + app chrome');

// Appended at the END of the stylesheet on purpose: the exhibit's own phone
// rules live near the bottom, so anything earlier loses the cascade at equal
// specificity.
sub(`  #err[hidden]{display:none}`,
`  #err[hidden]{display:none}

  /* ================= IN-APP PASS =================
     The exhibit already has its own phone layout (bottom drawer, 44px
     targets, card as a bottom sheet) — this adds only what it cannot know
     about: that it is now a screen INSIDE the crew PWA, reached from a room
     and expected to lead back to one. */
  #backbar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 22; display: none;
    padding: calc(env(safe-area-inset-top) + 6px) 10px 6px;
    background: linear-gradient(180deg, var(--bg) 45%, transparent);
    pointer-events: none;
  }
  #backbar a {
    pointer-events: auto; display: inline-flex; align-items: center; gap: 6px;
    min-height: 44px; padding: 10px 13px; border-radius: 9px; text-decoration: none;
    font: 700 12px/1 var(--mono); letter-spacing: .06em; color: var(--ink);
    background: var(--chipbg); border: 1px solid var(--line);
  }
  #backbar .sp { flex: 1; }
  #backbar .row { display: flex; gap: 8px; align-items: center; }
  @media (max-width: 900px) {
    #backbar { display: block; }
    /* Drop the view chips below the back bar, and out from under the notch —
       the exhibit's own rule pins them to a bare top:10px. */
    #views { top: calc(env(safe-area-inset-top) + 58px); }
    #burger { top: calc(env(safe-area-inset-top) + 58px); }
    .lbl { font-size: 10px; padding: 2px 5px; }
    .lbl.t2 { display: none; }        /* secondary labels are noise on a phone */
  }
  /* Seven chips (LIGHT TAGS ISO TOP BEDS BATH KITCH) overflow a 412px screen
     by a few pixels and wrap KITCH onto a lonely second row — tighten the
     tracking rather than let the control bar look broken. Touch height is
     untouched. */
  @media (max-width: 430px) {
    #views { gap: 4px; }
    #views button { padding-left: 7px; padding-right: 7px; font-size: 10.5px; letter-spacing: .06em; }
  }

  /* Thirty-plus leader labels cannot be legible on a 412px screen at any
     camera distance, so phones start with tags OFF: the model reads clean and
     a tap on any piece opens the detail card. The TAGS chip brings them back
     for anyone who wants the full annotated exhibit. */
  body.tags-off .lbl,
  body.tags-off #leaders { display: none; }

  /* Touch devices never get a hover state — kill the sticky highlight look. */
  @media (hover: none) {
    #views button:hover { color: var(--mut); border-color: var(--line); }
    .row:hover { background: none; border-left-color: transparent; }
  }`, 'phone CSS');

sub(`<div id="stage" aria-label="3D model viewport"></div>`,
`<div id="backbar">
  <div class="row">
    <a id="bb-back" href="./index.html#/room/101">&lsaquo; ROOM 101</a>
    <span class="sp"></span>
    <a id="bb-refs" href="./refs.html?room=101&amp;from=3d">&#128196; REFS</a>
    <a id="bb-print" href="./print.html?room=101">&#128424; SHEET</a>
  </div>
</div>

<div id="stage" aria-label="3D model viewport"></div>`, 'back bar markup');

sub(`  <button data-v="iso" class="on">ISO</button>`,
`  <button id="tags-btn" aria-pressed="false" title="Show or hide tag labels">TAGS</button>
  <button data-v="iso" class="on">ISO</button>`, 'TAGS button');

// ---- per-room geometry -------------------------------------------------
// Must land BEFORE any geometry is built: W is consumed from the next line on.
sub(`var W = 13.17, D = 36.4, H = 9.0, T = 0.35;`,
`/* ---- PER-ROOM GEOMETRY ----------------------------------------------------
   Dimensions are the architect's, off A555 ("Enl. Guest Room Plans & Elevs -
   QQ Std., QQ Ext., & QQ Std. Conn."), which dimensions the QQ family once and
   tags the variants in the dimension strings themselves:

     QQ standard   12'-8"  bay ·  12'-0"      CLEAR  x  37'-6 1/2" · 36'-5" CLEAR
     QQ Wide       13'-10" bay ·  12'-11 3/8" CLEAR  @QQ WIDE
     QQ Extended                                     x  39'-10 1/4" · 38'-9" CLEAR  @QQ EXT

   So the QQ Connecting rooms are ELEVEN INCHES narrower than the Wide ones,
   and QQ Extended is 2'-4" DEEPER than the standard — they are not the same
   room. A555 flag: the sheet is drawn ONCE with alternate dimension strings,
   so where the extra width/depth is absorbed "is not separately drawn" and is
   stylized here; the clear dimensions themselves are the architect's.

   \`mirror\` flips the plan left-for-right about the room centreline. Which side
   of the double-loaded corridor a room sits on is certain (odd numbers one
   side, even the other, per A100-A103); \`basis\` records how each room's
   handedness was arrived at so nothing here reads as more certain than it is.

   \`conn\` is whether the room has a GR-3 connecting door. A non-connecting room
   gets a continuous demising wall instead of the door opening — drawing a door
   into a wall that is solid on the plan is exactly the kind of confident-wrong
   detail this exhibit must never show. */
var QQ_D = 36.417, EXT_D = 38.75;   /* 36'-5" and 38'-9" CLEAR, per A555 */
var QQ_W = 12.0,   WIDE_W = 12.948; /* 12'-0" and 12'-11 3/8" CLEAR */
var ROOM_GEOM = {
  /* ---- QQ Studio Connector (GR-3 connecting door) ---- */
  '101': {w: WIDE_W, d: QQ_D, conn: true, mirror: false, variant: 'QQ Wide Connecting',
          basis: 'as modelled from A555 @QQ WIDE + the 101 field sheet'},
  '401': {w: WIDE_W, d: QQ_D, conn: true, mirror: false, variant: 'QQ Wide Connecting',
          basis: 'same wide bay as 101; A103 labels it QUEEN QUEEN WIDE, adjoins 403'},
  '103': {w: QQ_W, d: QQ_D, conn: true, mirror: true,  variant: 'QQ Connecting',
          basis: 'pairs with 101 — the connecting door is on their shared wall, so the plan reads opposite-hand'},
  '403': {w: QQ_W, d: QQ_D, conn: true, mirror: true,  variant: 'QQ Connecting',
          basis: 'pairs with 401, same relationship as 103 to 101'},
  '215': {w: QQ_W, d: QQ_D, conn: true, mirror: false, variant: 'QQ Connecting',
          basis: 'odd side of the corridor like 101; A101 does not name its connecting partner — HANDEDNESS UNCONFIRMED'},
  '236': {w: QQ_W, d: QQ_D, conn: true, mirror: true,  variant: 'QQ Connecting',
          basis: 'even side of the corridor (opposite hand to the odd side); connects to 238 — CONFIRM ON PLAN'},
  '336': {w: QQ_W, d: QQ_D, conn: true, mirror: true,  variant: 'QQ Connecting',
          basis: 'even side; A102 draws the connecting door in the 336/338 demising wall — CONFIRM ON PLAN'},
  '436': {w: QQ_W, d: QQ_D, conn: true, mirror: true,  variant: 'QQ Connecting',
          basis: 'even side; adjoins 438 — CONFIRM ON PLAN'},

  /* ---- QQ Studio (base Queen-Queen, no connecting door) ---- */
  '105': {w: QQ_W, d: QQ_D, conn: false, mirror: false, variant: 'QQ Studio',
          basis: 'base QQ per A555 (12\\'-0" clear); odd side of the corridor like 101'},
  '107': {w: QQ_W, d: QQ_D, conn: false, mirror: false, variant: 'QQ Studio',
          basis: 'base QQ per A555; odd side of the corridor'},
  '109': {w: QQ_W, d: QQ_D, conn: false, mirror: false, variant: 'QQ Studio',
          basis: 'base QQ per A555; odd side of the corridor'},
  '111': {w: QQ_W, d: QQ_D, conn: false, mirror: false, variant: 'QQ Studio',
          basis: 'base QQ per A555; odd side of the corridor'},
  '113': {w: QQ_W, d: QQ_D, conn: false, mirror: false, variant: 'QQ Studio',
          basis: 'base QQ per A555; odd side of the corridor'},
  '115': {w: QQ_W, d: QQ_D, conn: false, mirror: false, variant: 'QQ Studio',
          basis: 'base QQ per A555; odd side of the corridor'},

  /* ---- floor 2 QQ Studios (Queen-Queen, no connecting door) ---- */
  '203': {w: QQ_W, d: QQ_D, conn: false, mirror: false, variant: 'QQ Studio',
          basis: 'base QQ per A555; odd side of the corridor, same hand as 105'},
  '205': {w: QQ_W, d: QQ_D, conn: false, mirror: false, variant: 'QQ Studio',
          basis: 'base QQ per A555; odd side of the corridor, same hand as 105'},
  '207': {w: QQ_W, d: QQ_D, conn: false, mirror: false, variant: 'QQ Studio',
          basis: 'base QQ per A555; odd side of the corridor, same hand as 105'},
  '209': {w: QQ_W, d: QQ_D, conn: false, mirror: false, variant: 'QQ Studio',
          basis: 'base QQ per A555; odd side of the corridor, same hand as 105'},
  '211': {w: QQ_W, d: QQ_D, conn: false, mirror: false, variant: 'QQ Studio',
          basis: 'base QQ per A555; odd side of the corridor, same hand as 105'},
  '213': {w: QQ_W, d: QQ_D, conn: false, mirror: false, variant: 'QQ Studio',
          basis: 'base QQ per A555; odd side of the corridor, same hand as 105'},
  '228': {w: QQ_W, d: QQ_D, conn: false, mirror: true,  variant: 'QQ Studio',
          basis: 'base QQ per A555; EVEN side of the corridor so the plan reads opposite-hand \u2014 CONFIRM ON PLAN'},
  '234': {w: QQ_W, d: QQ_D, conn: false, mirror: true,  variant: 'QQ Studio',
          basis: 'base QQ per A555; EVEN side of the corridor so the plan reads opposite-hand \u2014 CONFIRM ON PLAN'},
  /* ---- QQ Wide (the wide bay WITHOUT a connecting door) ---- */
  '201': {w: WIDE_W, d: QQ_D, conn: false, mirror: false, variant: 'QQ Wide',
          basis: 'A555 @QQ WIDE width, base (non-connecting) plan; odd side of the corridor'},
  '301': {w: WIDE_W, d: QQ_D, conn: false, mirror: false, variant: 'QQ Wide',
          basis: 'A555 @QQ WIDE width, base plan; stacks over 201'},

  /* ---- QQ Extended (standard bay, deeper room) ---- */
  '230': {w: QQ_W, d: EXT_D, conn: false, mirror: true, variant: 'QQ Extended',
          basis: 'A555 @QQ EXT depth (38\\'-9" clear); even side of the corridor — CONFIRM ON PLAN'},
  '232': {w: QQ_W, d: EXT_D, conn: false, mirror: true, variant: 'QQ Extended',
          basis: 'A555 @QQ EXT depth; even side — CONFIRM ON PLAN'},
  '330': {w: QQ_W, d: EXT_D, conn: false, mirror: true, variant: 'QQ Extended',
          basis: 'A555 @QQ EXT depth; even side, stacks over 230 — CONFIRM ON PLAN'},
  '332': {w: QQ_W, d: EXT_D, conn: false, mirror: true, variant: 'QQ Extended',
          basis: 'A555 @QQ EXT depth; even side, stacks over 232 — CONFIRM ON PLAN'},
  '430': {w: QQ_W, d: EXT_D, conn: false, mirror: true, variant: 'QQ Extended',
          basis: 'A555 @QQ EXT depth; even side, stacks over 330 — CONFIRM ON PLAN'},
  '432': {w: QQ_W, d: EXT_D, conn: false, mirror: true, variant: 'QQ Extended',
          basis: 'A555 @QQ EXT depth; even side, stacks over 332 — CONFIRM ON PLAN'},
};
/* Connecting partners off the floor plans: A100 (101/103), A101 (236->238),
   A102 (336/338 demising wall), A103 (401/403, 436->438). 215's partner is NOT
   named on A101 — left blank rather than guessed. */
var PARTNER_OF = {'101':'103','103':'101','401':'403','403':'401',
                  '236':'238','336':'338','436':'438','215':''};
var ROOM_NO = (new URLSearchParams(location.search).get('room') || '101').trim();
/* A room with no entry here has NO MODEL. Falling back to room 101 would draw
   its two queen beds, its 12'-11 3/8" bay and its GR-3 connecting door under
   the requested room's number — a confidently wrong exhibit, which is worse
   than none. Say so and stop instead. */
if (!ROOM_GEOM[ROOM_NO]) {
  document.documentElement.innerHTML =
    '<head><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>No 3D model \\u2014 Room ' + ROOM_NO + '</title></head><body style="margin:0;'
    + 'background:#0b0f13;color:#e8eef4;font:15px/1.6 ui-monospace,Menlo,monospace;'
    + 'display:flex;align-items:center;justify-content:center;min-height:100vh;'
    + 'padding:24px;text-align:center"><div><div style="font-size:34px">\\uD83E\\uDDCA</div>'
    + '<h1 style="font-size:17px;letter-spacing:.06em">NO 3D MODEL FOR ROOM '
    + ROOM_NO + ' YET</h1><p style="color:#8fa3b5;max-width:34em">This room type has '
    + 'not been modelled. Rather than show another room\\u2019s geometry with this '
    + 'number on it, the exhibit stops here.</p><p><a href="./index.html#/room/'
    + encodeURIComponent(ROOM_NO) + '" style="color:#22b8e6">\\u2039 Back to room '
    + ROOM_NO + '</a></p></div></body>';
  throw new Error('no ROOM_GEOM entry for room ' + ROOM_NO);
}
var GEOM = ROOM_GEOM[ROOM_NO];
var MIRROR = !!GEOM.mirror;
var CONN = GEOM.conn !== false;
var PARTNER = CONN ? (PARTNER_OF[ROOM_NO] || '') : '';
var W = GEOM.w, D = GEOM.d, H = 9.0, T = 0.35;`, 'per-room W/D + mirror + connecting flags');

// Mirroring is applied at the two geometry primitives rather than by scaling a
// parent group: a negative scale flips face winding and wrecks the lighting,
// whereas reflecting the centre point keeps every normal correct.
sub(`function box(x1,y1,z1, x2,y2,z2, mat, noShadow){
  var m = new THREE.Mesh(BOX, mat);
  m.scale.set(Math.abs(x2-x1), Math.abs(y2-y1), Math.abs(z2-z1));
  m.position.set((x1+x2)/2, (y1+y2)/2, (z1+z2)/2);`,
`function box(x1,y1,z1, x2,y2,z2, mat, noShadow){
  var m = new THREE.Mesh(BOX, mat);
  m.scale.set(Math.abs(x2-x1), Math.abs(y2-y1), Math.abs(z2-z1));
  m.position.set((x1+x2)/2, (y1+y2)/2, (z1+z2)/2);
  if (MIRROR) m.position.x = W - m.position.x;`, 'mirror box');

sub(`function cyl(cx,cz, r, y1,y2, mat){
  var m = new THREE.Mesh(CYL, mat);
  m.scale.set(r, y2-y1, r);
  m.position.set(cx, (y1+y2)/2, cz);`,
`function cyl(cx,cz, r, y1,y2, mat){
  var m = new THREE.Mesh(CYL, mat);
  m.scale.set(r, y2-y1, r);
  m.position.set(MIRROR ? W - cx : cx, (y1+y2)/2, cz);`, 'mirror cyl');

sub(`var renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));`,
`/* Phone budget: a mid-range Android runs this at a fraction of a laptop's
   fill rate. Drop MSAA, cap the pixel ratio harder, and use the cheap shadow
   filter — the exhibit still reads correctly and stays at a usable frame
   rate in a crew member's hand. */
var MOBILE = matchMedia('(max-width: 900px), (hover: none)').matches;
var renderer = new THREE.WebGLRenderer({antialias: !MOBILE, powerPreference: 'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, MOBILE ? 1.75 : 2));`, 'renderer budget');

// Everything that positions in WORLD x without going through box()/cyl() has
// to be reflected too, or mirrored rooms end up with the sconces, shower pull
// and closet rod on the wrong wall. MX() is the single reflection helper.
sub(`var V3 = function(x,y,z){ return new THREE.Vector3(x,y,z); };`,
`var V3 = function(x,y,z){ return new THREE.Vector3(x,y,z); };
/* Reflect a world x across the room centreline (no-op when not mirrored). */
function MX(x){ return MIRROR ? W - x : x; }
/* Reflect a Y-rotation to match. */
function MRY(r){ return MIRROR ? -r : r; }`, 'MX/MRY helpers');

sub(`  g.position.set(8.85,0,-0.1); g.rotation.y = -0.62;`,
`  g.position.set(MX(8.85),0,-0.1); g.rotation.y = MRY(-0.62);`, 'mirror: entry group');

sub(`  g.position.set(W-0.12, 0, -5.55); g.rotation.y = -0.1;`,
`  g.position.set(MX(W-0.12), 0, -5.55); g.rotation.y = MRY(-0.1);`, 'mirror: connecting-door group');

// ---- non-connecting rooms: solid demising wall, no GR-3 ------------------
// A base QQ / QQ Wide / QQ Extended has no connecting door. The wall gets its
// missing segment back and the whole GR-3 assembly is skipped.
sub(`wallSeg(W,0, W,-5.2);  wallSeg(W,-8.2, W,-D);     /* gap = connecting door */`,
`if (CONN) { wallSeg(W,0, W,-5.2);  wallSeg(W,-8.2, W,-D); }  /* gap = connecting door */
else       { wallSeg(W,0, W,-D); }                           /* solid demising wall */`,
  'wall: connecting gap only when the room connects');

sub(`/* ---- Connecting door GR-3 (room feature, highlighted Triun cyan) ---- */
var pDoor = reg(`,
`/* ---- Connecting door GR-3 (room feature, highlighted Triun cyan) ---- */
if (CONN) {
var pDoor = reg(`, 'GR-3: open guard');

// The GR-3 card is authored for room 101: it names room 103 as the partner and
// carries room 101's OWN field deficiency (the door lock that will not lock).
// Left alone, six other rooms told the crew they have a standing lock defect
// that was only ever observed in 101, and named a floor-1 room as their
// neighbour. Author it per-room instead. (PARTS lives inside the exhibit's
// IIFE, so this must happen HERE, at registration — not from an appended block.)
sub(`name:'Connecting Door → Room 103', qty:1,`,
`name:'Connecting Door → ' + (PARTNER ? 'Room ' + PARTNER : 'adjoining room'), qty:1,`,
  'GR-3 name per room');

sub(`so Room 101 carries ONE GR-3 leaf and Room 103 carries the other. Both leaves drawn for context.',`,
`so Room ' + ROOM_NO + ' carries ONE GR-3 leaf and ' + (PARTNER ? 'Room ' + PARTNER : 'the adjoining room') + ' carries the other. Both leaves drawn for context.',`,
  'GR-3 description per room');

sub(`  note:'★ CONNECTING DOOR LOCK — NOT LOCKING. Standing deficiency on the room-101 field sheet; set #3 deadbolt / connecting latch / door guard is the hardware behind it.',`,
`  note: ROOM_NO === '101' ? '★ CONNECTING DOOR LOCK — NOT LOCKING. Standing deficiency on the room-101 field sheet; set #3 deadbolt / connecting latch / door guard is the hardware behind it.' : '',
  flagIsRoom101Only: true,`,
  'GR-3 deficiency stays on room 101');

// flag:true drives the ★ DEF chip. Only room 101 has the deficiency.
sub(`  cat:'Doors · room feature', flag:true,`,
`  cat:'Doors · room feature', flag: ROOM_NO === '101',`,
  'GR-3 deficiency chip only on room 101');

sub(`  g.position.set(MX(W-0.12), 0, -5.55); g.rotation.y = MRY(-0.1);
  scenery(g);
})();`,
`  g.position.set(MX(W-0.12), 0, -5.55); g.rotation.y = MRY(-0.1);
  scenery(g);
})();
}`, 'GR-3: close guard');

// The cyan wash exists to read the connecting door; without one it is just a
// blue smear on a blank wall.
sub(`fill.position.set(W+3, 6.5, -6.7);            /* cyan wash at the connecting door */`,
`fill.position.set(W+3, 6.5, -6.7);            /* cyan wash at the connecting door */
if (!CONN) fill.intensity = 0;`, 'cyan wash only when the room connects');

sub(`tagLbl('GR-3',     V3(W+0.1,7.4,-6.7),   26, -34, 4, ' · CONN. → 103');`,
`if (CONN) tagLbl('GR-3', V3(W+0.1,7.4,-6.7), 26, -34, 4, ' · CONN. → 103');`,
  'GR-3 tag label only when the room connects');

sub(`addLabel({anchor:V3(W+5,0.4,-5.7),  html:'ROOM 103 (CONNECTING)', cls:'min', dx:-70, dy:-12, noleader:true, pri:3});`,
`if (CONN) addLabel({anchor:V3(W+5,0.4,-5.7), html:'ROOM 103 (CONNECTING)', cls:'min', dx:-70, dy:-12, noleader:true, pri:3});`,
  'partner label only when the room connects');

// PARTS['GR-3'] does not exist in a non-connecting room, and the sidebar list
// dereferences every ORDER id.
sub(`ORDER.forEach(function(id){
  var p = PARTS[id];
  var b = document.createElement('button');`,
`ORDER.forEach(function(id){
  var p = PARTS[id];
  if (!p) return;              /* GR-3 is absent in a non-connecting room */
  var b = document.createElement('button');`, 'sidebar: skip absent parts');

// The cyan-glow keeper reaches for pDoor at module level, outside the door's
// own block — in a non-connecting room that is a hard TypeError that kills the
// whole scene, so it has to be guarded too.
sub(`/* cyan door materials keep their glow when unhighlighted */
pDoor.mats.forEach(function(m){ m.userData.keepEm = true;`,
`/* cyan door materials keep their glow when unhighlighted */
if (CONN) pDoor.mats.forEach(function(m){ m.userData.keepEm = true;`,
  'GR-3 glow keeper guarded');

sub(`  g.position.set(x,y,z); g.rotation.y = rotY||0;`,
`  g.position.set(MX(x),y,z); g.rotation.y = MRY(rotY||0);`, 'mirror: sconce placer');

sub(`  rod.position.set(W-1.25, 5.5, -24.05); scenery(rod); })();`,
`  rod.position.set(MX(W-1.25), 5.5, -24.05); scenery(rod); })();`, 'mirror: closet rod');

sub(`  pull.position.set(SHX1+1.35, 3.4, SHZ2+0.16); pull.castShadow = true;`,
`  pull.position.set(MX(SHX1+1.35), 3.4, SHZ2+0.16); pull.castShadow = true;`, 'mirror: shower pull');

sub(`  b.scale.set(0.85,0.55,0.72); b.position.set(1.45,1.15,-4.6); b.castShadow=true; scenery(b); })();`,
`  b.scale.set(0.85,0.55,0.72); b.position.set(MX(1.45),1.15,-4.6); b.castShadow=true; scenery(b); })();`, 'mirror: bath bin');

sub(`  bar.position.set(4.0, 3.8, -11.1); bar.castShadow = true;`,
`  bar.position.set(MX(4.0), 3.8, -11.1); bar.castShadow = true;`, 'mirror: bar');

sub(`    post.position.set(px, 3.8, -11.19);`,
`    post.position.set(MX(px), 3.8, -11.19);`, 'mirror: posts');

// Labels ride on world anchors and fan out with a signed dx — both flip.
sub(`  var L = {el:el, line:line, dot:dot, anchor:o.anchor, dx:o.dx, dy:o.dy, w:0, h:0,`,
`  if (MIRROR && o.anchor) { o.anchor = o.anchor.clone(); o.anchor.x = W - o.anchor.x; }
  var L = {el:el, line:line, dot:dot, anchor:o.anchor, dx:(MIRROR ? -o.dx : o.dx), dy:o.dy, w:0, h:0,`, 'mirror: label anchors');

sub(`renderer.shadowMap.type = THREE.PCFSoftShadowMap;`,
`renderer.shadowMap.type = MOBILE ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;`, 'shadow filter');

sub(`sun.shadow.mapSize.set(2048, 2048);`,
`sun.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048);`, 'shadow map size');

sub(`var activePreset = null;`,
`/* ---- portrait framing ----------------------------------------------------
   The room is 13'-2" wide by 36'-5" deep — a long, narrow footprint. On a
   landscape screen the designed ISO reads fine, but on a portrait phone the
   long axis fights the short screen axis and the far end falls off frame.
   Two corrections, both aspect-driven so a rotated phone re-frames itself:
     1. a steeper, higher ISO that lays the room's depth DOWN the screen, and
     2. a pull-back on every preset, since a narrow viewport sees less width
        at the same distance.                                                */
var ISO_PORTRAIT = {pos:[34, 47, 14], tgt:[CX, 1.5, CZ]};
function aspectNow(){ return window.innerWidth / Math.max(1, window.innerHeight); }
function isPortrait(){ return aspectNow() < 0.95; }
/* Vertical FOV widens on narrow screens, but only to 42° — past that the
   perspective distortion makes a stylized exhibit look like a fisheye. */
function fovFor(a){
  if (a >= 1.2) return 35;
  var t = Math.min(1, (1.2 - a) / (1.2 - 0.45));
  return 35 + (42 - 35) * t;
}
/* Distance multiplier. Tuned so the room fills roughly two thirds of a phone
   screen — the wider FOV above already recovers most of the lost extent, so
   this stays gentle; overshooting here shrinks the room to a chip. */
function dollyFor(a){ return Math.max(1, Math.min(0.55 / Math.max(a, 0.3), 1.35)); }
/* Zoom-reveal for tags (see updateLabels): closer than ZOOM_TAGS_DIST feet and
   the labels within ZOOM_TAGS_RADIUS of what you're aimed at fade in, so a
   close-up is identifiable without the wide shot turning into label soup. */
var ZOOM_TAGS_DIST = 34, ZOOM_TAGS_RADIUS = 14;
function applyFov(){
  camera.fov = fovFor(aspectNow());
  camera.updateProjectionMatrix();
}

var activePreset = null;`, 'portrait framing helpers');

sub(`function applyView(name, animate){
  var v = VIEWS[name] || VIEWS.iso;`,
`function applyView(name, animate){
  var v = VIEWS[name] || VIEWS.iso;
  if (name === 'iso' && isPortrait()) v = ISO_PORTRAIT;
  // Presets are composed against the un-mirrored plan, so reflect them too or
  // BATH/KITCH would aim at the wrong end of a mirrored room.
  if (MIRROR) v = {pos:[MX(v.pos[0]), v.pos[1], v.pos[2]], tgt:[MX(v.tgt[0]), v.tgt[1], v.tgt[2]]};`, 'applyView portrait ISO + mirror');

sub(`  var pos = V3(v.pos[0], v.pos[1], v.pos[2]), tgt = V3(v.tgt[0], v.tgt[1], v.tgt[2]);`,
`  var pos = V3(v.pos[0], v.pos[1], v.pos[2]), tgt = V3(v.tgt[0], v.tgt[1], v.tgt[2]);
  // Pull back along the view direction so a narrow screen still holds the
  // whole framing the preset was composed for. Take the offset BEFORE
  // rewriting pos — copy(tgt) would otherwise clobber the value we measure.
  var k = dollyFor(aspectNow());
  if (k > 1) {
    var off = pos.clone().sub(tgt).multiplyScalar(k);
    pos.copy(tgt).add(off);
  }`, 'applyView dolly');

sub(`  camera.aspect = w/h;
  camera.updateProjectionMatrix();`,
`  camera.aspect = w/h;
  applyFov();               // re-widen/narrow when the phone is rotated
  camera.updateProjectionMatrix();`, 'resize fov');

sub(`  var end = VIEWS.iso;
  camera.position.set(end.pos[0]*2.1, end.pos[1]*2.4, end.pos[2]*2.6);
  controls.update();
  tweenTo(V3(end.pos[0], end.pos[1], end.pos[2]), V3(end.tgt[0], end.tgt[1], end.tgt[2]), 2000);`,
`  // Fly in to whatever ISO the current aspect actually uses, dolly included —
  // otherwise the intro lands on the desktop framing and snaps on first touch.
  var end = isPortrait() ? ISO_PORTRAIT : VIEWS.iso;
  var k = dollyFor(aspectNow());
  var tgt = V3(end.tgt[0], end.tgt[1], end.tgt[2]);
  var dest = V3(end.pos[0], end.pos[1], end.pos[2]);
  if (k > 1) {
    var doff = dest.clone().sub(tgt).multiplyScalar(k);
    dest.copy(tgt).add(doff);
  }
  camera.position.set(dest.x*2.1, dest.y*2.4, dest.z*2.6);
  controls.update();
  tweenTo(dest, tgt, 2000);`, 'intro framing');

sub(`renderer.domElement.addEventListener('pointermove', function(e){`,
`renderer.domElement.addEventListener('pointermove', function(e){
  // Touch has no hover: on a phone every orbit frame would raycast the whole
  // scene for a highlight nobody can see. Tap-to-select still works below.
  if (e.pointerType === 'touch') return;`, 'skip hover raycast on touch');

sub(`function updateLabels(){
  var W2 = window.innerWidth, H2 = window.innerHeight;
  var i, L;`,
`function updateLabels(){
  var W2 = window.innerWidth, H2 = window.innerHeight;
  var i, L;
  // Tags off (the phone default) still reveals tags as you ZOOM IN: pull the
  // camera close and the labels for whatever you are looking at fade in, so
  // the wide shot stays clean but a close-up is still identifiable. The TAGS
  // chip forces them all on. Note the loop writes style.display inline every
  // frame, so a CSS class alone could never hold labels down — the pass
  // itself has to be gated.
  var tagsOff = document.body.classList.contains('tags-off');
  var camDist = camera.position.distanceTo(controls.target);
  var zoomTags = tagsOff && camDist < ZOOM_TAGS_DIST;
  if (tagsOff && !zoomTags){
    for (i = 0; i < labels.length; i++){
      L = labels[i];
      L.el.style.display = 'none';
      if (L.line){ L.line.style.display = 'none'; L.dot.style.display = 'none'; }
      L.w = 0; L.h = 0;   // force re-measure when they come back
    }
    return;
  }`, 'tags-off label skip');

sub(`    L.vis = !(behind || sx < -260 || sx > W2+260 || sy < -160 || sy > H2+160);`,
`    L.vis = !(behind || sx < -260 || sx > W2+260 || sy < -160 || sy > H2+160);
    // Zoom-reveal keeps only the labels near what the camera is aimed at;
    // showing all 47 at close range would be worse than showing none.
    if (L.vis && zoomTags && L.anchor.distanceTo(controls.target) > ZOOM_TAGS_RADIUS) L.vis = false;`, 'zoom-tag radius filter');

sub(`/* ---------------- burger / sidebar scroll ---------------- */`,
`/* ---------------- tag labels on/off ----------------
   Phones start clean (tap a piece for its card); desktop keeps the annotated
   exhibit it was composed as. */
var tagsBtn = document.getElementById('tags-btn');
function setTags(on){
  document.body.classList.toggle('tags-off', !on);
  tagsBtn.classList.toggle('on', on);
  tagsBtn.setAttribute('aria-pressed', String(on));
  requestRenderIfFrozen();
}
setTags(!MOBILE);
tagsBtn.addEventListener('click', function(){
  setTags(document.body.classList.contains('tags-off'));
});

/* ---------------- burger / sidebar scroll ---------------- */`, 'tags toggle wiring');

sub(`renderFrame();
renderFrame();`,
`/* Test hook: the exhibit runs inside an IIFE, so expose just enough for the
   harness (and a console session) to assert framing without shipping the
   whole scope to the page. */
window.__h2sep3d = {
  camera: camera, controls: controls, applyView: applyView,
  W: W, D: D, mirror: MIRROR, conn: CONN, variant: GEOM.variant, basis: GEOM.basis,
  bathX: MX(BATHX),
  /* Present only when the room actually has a GR-3 — the check asserts on it. */
  hasDoorPart: !!PARTS['GR-3'],
  frame: function(){ return {
    aspect: window.innerWidth / window.innerHeight,
    fov: camera.fov,
    dist: camera.position.distanceTo(controls.target),
    pos: camera.position.toArray(),
    tgt: controls.target.toArray(),
    portrait: isPortrait(),
  }; },
};

renderFrame();
renderFrame();`, 'test hook');

sub(`window.__h2sep3d = {`,
`/* ---- room-aware exhibit -------------------------------------------------
   The geometry is Room 101's (QQ Wide Connecting), and every QQ Studio
   Connector shares the same 40-line package — so the exhibit doubles as the
   typical for its siblings. It must not keep SAYING "Room 101" when it was
   opened from another room, and its links have to lead back to THAT room, so
   the number is swapped in at load and a plain-language caveat is added when
   the room being viewed is not the one that was modeled. */
(function(){
  var qsRoom = (new URLSearchParams(location.search).get('room') || '101').trim();
  var demo = new URLSearchParams(location.search).has('demo');
  var suffix = '?room=' + encodeURIComponent(qsRoom) + (demo ? '&demo=1' : '');
  var back = document.getElementById('bb-back');
  if (back) { back.href = './index.html#/room/' + encodeURIComponent(qsRoom);
              back.textContent = '\u2039 ROOM ' + qsRoom; }
  var refs = document.getElementById('bb-refs');
  if (refs) refs.href = './refs.html?room=' + encodeURIComponent(qsRoom) + '&from=3d' + (demo ? '&demo=1' : '');
  var pr = document.getElementById('bb-print');
  if (pr) pr.href = './print.html' + suffix;
  /* Connecting partners, off the floor plans: A100 (101/103), A101 (236->238),
     A102 (336/338 demising wall), A103 (401/403, 436->438). 215's partner is
     not named on A101 — left blank rather than guessed. */
  var PARTNER = {'101':'103','103':'101','401':'403','403':'401',
                 '236':'238','336':'338','436':'438','215':''};
  var partner = CONN ? (PARTNER[qsRoom] || '') : '';
  var wide = GEOM.w > 12.5;
  var ext  = GEOM.d > 37;
  var VAR  = String(GEOM.variant || '').toUpperCase();
  /* Two different names, on purpose. VAR is the ARCHITECT'S variant off A555
     and belongs on the TYPE row and the caveat next to its dimensions. LABEL is
     the name the crew knows the room by — the same string the app's room screen
     shows — and belongs in the headings. Room 101 is "QQ Wide Connecting" on
     the drawings and "QQ Studio Connector" on a phone; both are correct in
     their own place. */
  var TYPE_LABEL = {
    'QQ Wide Connecting': 'QQ Studio Connector',
    'QQ Connecting':      'QQ Studio Connector',
    'QQ Studio':          'QQ Studio',
    'QQ Wide':            'QQ Studio',
    'QQ Extended':        'QQ Extended',
  };
  var LABEL = (TYPE_LABEL[GEOM.variant] || GEOM.variant || '').toUpperCase();
  var typeLine = VAR + ' &middot; '
    + (wide ? '13&prime;-10&Prime; BAY &middot; 12&prime;-11⅜&Prime; CLEAR'
            : '12&prime;-8&Prime; BAY &middot; 12&prime;-0&Prime; CLEAR')
    + (ext ? ' &middot; 38&prime;-9&Prime; DEEP' : '');

  if (qsRoom !== '101') {
    document.title = document.title.replace('Room 101', 'Room ' + qsRoom);
    document.querySelectorAll('#ministrip b, #drawerbar b, .tb h1').forEach(function(el){
      el.innerHTML = el.innerHTML.replace(/ROOM 101/g, 'ROOM ' + qsRoom);
    });
  }
  /* The <title> also carries the modelled room's TYPE — a QQ Extended room was
     showing "QQ Studio Connector" in the tab and in any bookmark. */
  document.title = document.title.split('QQ Studio Connector')
                                 .join(TYPE_LABEL[GEOM.variant] || GEOM.variant);

  /* The drawer hard-codes "42 ITEMS" (room 101's count). A non-connecting room
     lists 41 — it has no GR-3. Count what is actually on screen. */
  (function(){
    var n = document.querySelectorAll('#sb-scroll .row[data-id]').length;
    if (!n) return;
    document.querySelectorAll('#drawerbar span, #ministrip span').forEach(function(el){
      if (el.innerHTML.indexOf('42 ITEMS') !== -1)
        el.innerHTML = el.innerHTML.split('42 ITEMS').join(n + ' ITEMS');
    });
  })();
  /* Those same headings hard-code the modelled room's TYPE. Leaving it makes a
     QQ Extended room announce itself as a QQ Studio Connector, which is worse
     than showing nothing — rewrite it to the variant actually on screen. */
  document.querySelectorAll('#ministrip b, #drawerbar b, .tb h1').forEach(function(el){
    el.innerHTML = el.innerHTML.split('QQ STUDIO CONNECTOR').join(LABEL);
  });
  /* The sidebar TYPE / CONNECTS rows and the two in-scene labels are written
     for 101; rewrite them for whichever room is actually being shown rather
     than let a 12-foot room claim to be the 13'-10" wide one. */
  var metaB = document.querySelectorAll('.meta b');
  if (metaB[2]) metaB[2].innerHTML = typeLine;
  if (metaB[3]) metaB[3].innerHTML = !CONN
    ? 'NONE &middot; SOLID DEMISING WALL BOTH SIDES'
    : (partner ? 'ROOM ' + partner + ' &middot; GR-3 PAIR &middot; 1 LEAF/RM'
               : 'CONNECTING &middot; PARTNER NOT NAMED ON THE FLOOR PLAN');
  /* Plain split/join, never a regex: this replacement lives inside a template
     literal in the build script, which silently eats regex backslashes. */
  function swapText(nodes, from, to){
    nodes.forEach(function(el){
      if (el.innerHTML.indexOf(from) !== -1) el.innerHTML = el.innerHTML.split(from).join(to);
    });
  }
  var lbls = [].slice.call(document.querySelectorAll('.lbl'));
  var legend = [].slice.call(document.querySelectorAll('.legend div'));
  var rows = [].slice.call(document.querySelectorAll('#sb-scroll .nm'));
  /* These strings all name room 103, room 101's partner. They must be rewritten
     for EVERY room, not only when a partner is known: room 215 connects to a
     room A101 never names, and leaving the default made it claim a floor-1
     room as its neighbour. */
  if (partner) {
    swapText(lbls, 'ROOM 103 (CONNECTING)', 'ROOM ' + partner + ' (CONNECTING)');
    swapText(lbls, 'CONN. \u2192 103', 'CONN. \u2192 ' + partner);
    swapText(legend, 'ROOM 103', 'ROOM ' + partner);
    swapText(rows, 'Room 103', 'Room ' + partner);
  } else if (CONN) {
    swapText(lbls, 'ROOM 103 (CONNECTING)', 'ADJOINING ROOM (NOT NAMED ON PLAN)');
    swapText(lbls, 'CONN. \u2192 103', 'CONN. \u2192 ?');
    swapText(legend, 'ROOM 103', 'ADJOINING ROOM');
    swapText(rows, 'Room 103', 'the adjoining room');
  }

  /* The in-scene dimension label is written for the wide connecting bay; every
     other room rewrites it to its own variant (identity swap on 101/401). */
  swapText(lbls, '13\u2032-10\u2033 WIDE \u00b7 QQ WIDE CONNECTING',
                 (wide ? '13\u2032-10\u2033 WIDE' : '12\u2032-0\u2033 CLEAR') + ' \u00b7 ' + VAR);

  /* A room with no connecting door has no cyan door for the legend to key. */
  if (!CONN) legend.forEach(function(el){
    if (el.textContent.indexOf('CONNECTING DOOR') !== -1) el.style.display = 'none';
  });

  var cav = document.getElementById('caveat');
  if (cav) {
    cav.innerHTML = VAR + ' &middot; '
      + (wide ? '12&prime;-11⅜&Prime; CLEAR' : '12&prime;-0&Prime; CLEAR')
      + (ext ? ' &times; 38&prime;-9&Prime; DEEP' : '')
      + ' &middot; ' + (GEOM.mirror
            ? (/CONFIRM ON PLAN|UNCONFIRMED/i.test(GEOM.basis || '')
                 ? 'MIRRORED \u2014 HANDEDNESS NOT YET CONFIRMED &middot; '
                 : 'MIRRORED PER FLOOR PLAN &middot; ')
            : '')
      /* A555 draws the QQ family ONCE with alternate dimension strings, so the
         clear dimensions are the architect's but WHERE the extra depth is
         absorbed is not on the sheet. Say so rather than imply it was drawn. */
      + (ext ? 'EXTRA DEPTH NOT LOCATED ON A555 &middot; ' : '')
      + 'ITEM LOCATIONS STYLIZED &middot; EXHIBIT ONLY';
  }
})();

window.__h2sep3d = {`, 'room-aware links + labels');

writeFileSync(out, s);
console.log(`built ${out} (${(s.length / 1024).toFixed(0)} KB)`);
