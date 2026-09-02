// Printable room turnover sheet — the door-hung paper checklist, generated
// from LIVE room data so what prints always matches what the phones show.
//
// The typography is the approved preview sheet (css/print.css, extracted
// verbatim); only the body is data-driven. Reads the room doc ONCE — a print
// is a snapshot, and the sheet stamps the time it was taken.
//
//   print.html?room=101        live Firestore
//   print.html?room=101&demo=1 bundled demo fixture (no network)
import { firebaseConfig, PROJECT_ID, MODEL_ROOMS } from './config.js';
import { seedRooms } from './seed.js';
import { seedSpaces } from './seed-spaces.js';
import { esc, isSpaceDoc, isMepDoc, mepParent, CATEGORY_ORDER, MEP_CATEGORY_ORDER, MEP_LETTER } from './util.js';
import { SPACE_META } from './space-meta.js';

const params = new URLSearchParams(location.search);
const ROOM = (params.get('room') || '101').trim();
const DEMO = params.has('demo') || !firebaseConfig;
const $ = (id) => document.getElementById(id);

// Print keeps the paper's short category names; the app's data uses the
// canonical "FF&E - …" strings. Anything unmapped prints as-is.
const CAT_LABEL = {
  'FF&E - Casegoods': 'Casegoods',
  'FF&E - Bedding': 'Bedding',
  'FF&E - Seating': 'Seating',
  'FF&E - Lighting': 'Lighting',
  'FF&E - Window': 'Window Treatments',
  'FF&E - Art / Mirror': 'Art / Mirror',
  'FF&E - Misc': 'Misc',
  'Appliance': 'Appliances',
  'Bath Accessory': 'Bath Accessories',
};
// Page 1 carries the FF&E families in this order; page 2 carries the rest.
const PAGE1 = ['FF&E - Casegoods', 'FF&E - Bedding', 'FF&E - Seating',
  'FF&E - Lighting', 'FF&E - Window', 'FF&E - Art / Mirror', 'FF&E - Misc'];
const PAGE2 = ['Appliance', 'Bath Accessory'];

// ---------- data ----------
// The app hands the room over in sessionStorage when the crew taps 🖨, so the
// sheet paints instantly and still works in a dead zone (the app's own store
// is offline-capable; a cold page load here is not).
const HANDOFF_KEY = 'h2sep-print-room';
function handoffRoom() {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw);
    return r && String(r.number) === ROOM ? r : null;
  } catch { return null; }
}

async function loadRoom() {
  if (DEMO) {
    // Read the SAME demo database the app writes to, not just the pristine
    // fixtures. Two reasons: MEP punch docs only ever exist in that database,
    // and a demo user who checks a line or adds an item was previously handed
    // a sheet that silently omitted their own work.
    try {
      const db = JSON.parse(localStorage.getItem('h2sep-demo-db-v2'));
      if (db && db.rooms && db.rooms[ROOM]) return db.rooms[ROOM];
    } catch (_) { /* fall through to the bundled fixtures */ }
    const r = seedRooms()[ROOM] || seedSpaces()[ROOM];
    if (!r) throw new Error('Room ' + ROOM + ' is not in the demo fixture');
    return r;
  }
  const [{ initializeApp }, fs, authm] = await Promise.all([
    import('../firebase/firebase-app.js'),
    import('../firebase/firebase-firestore.js'),
    import('../firebase/firebase-auth.js'),
  ]);
  const app = initializeApp(firebaseConfig);
  const db = fs.getFirestore(app);
  const auth = authm.getAuth(app);
  // Rules require auth for reads — sign in BEFORE touching the doc.
  if (!auth.currentUser) await authm.signInAnonymously(auth);
  const snap = await fs.getDoc(fs.doc(db, 'projects', PROJECT_ID, 'platform_rooms', ROOM));
  if (!snap.exists()) throw new Error('Room ' + ROOM + ' not found');
  return snap.data();
}

// ---------- render ----------
function groupsFor(room, cats) {
  const out = [];
  const items = Object.entries(room.items || {})
    .filter(([, it]) => !it.deleted)
    .sort((a, b) => (a[1].sort || 0) - (b[1].sort || 0) ||
      String(a[1].code || '').localeCompare(String(b[1].code || '')));
  for (const cat of cats) {
    const rows = items.filter(([, it]) => (it.category || '') === cat);
    if (rows.length) out.push({ cat, label: CAT_LABEL[cat] || cat, rows });
  }
  return out.map((g) => g.label ? g : { ...g, label: 'ADDED ON SITE' });
}
// Categories present in the room but not named in either page list — they
// still have to print, so they ride along at the end of page 2.
function leftoverCats(room) {
  const known = new Set([...PAGE1, ...PAGE2]);
  const seen = [];
  for (const it of Object.values(room.items || {})) {
    const c = it.category || '';
    if (!known.has(c) && !seen.includes(c)) seen.push(c);
  }
  return seen.sort();
}

function itemHTML([, it]) {
  const openIssue = it.issue && !it.issueResolved;
  const qty = Number(it.qty) > 1 ? ` <span class="qty">×${Number(it.qty)}</span>` : '';
  const flag = it.reliability === 'FLAGGED' ? '&nbsp;<span class="flag nw">⚑&nbsp;FLAGGED</span>' : '';
  const issue = openIssue ? ` <span class="issue">&#8212;&nbsp;${esc(it.issue.toUpperCase())}</span>` : '';
  const note = it.instanceNote ? `<div class="inote">${esc(it.instanceNote)}</div>` : '';
  const tag = it.code ? `<b class="tag">${esc(it.code)}</b><span class="dash"> – </span>` : '';
  return `<div class="item"><div class="item-text">${tag}<span class="lbl">${esc(it.label)}${qty}</span>${issue}${flag}${note}</div>` +
    `<div class="box${it.checked ? ' done' : ''}">${it.checked ? esc(it.initials || '✓') : ''}</div></div>`;
}

function sectionsHTML(groups) {
  return groups.map(g => `<section class="cat">
<h3 class="cat-head">${esc(g.label)}</h3>
${g.rows.map(itemHTML).join('\n')}
</section>`).join('\n');
}

// ---- common-area sheet: one flowing trade-ordered list, N pages ----
// Spaces don't get the guest sheet's fixed two-page split: a 4-line closet and
// the 48-line Lobby share one layout that flows to as many pages as it needs,
// categories in crew walk order (ceiling → walls → floor → doors → FF&E).
function renderSpace(room) {
  const items = Object.entries(room.items || {}).filter(([, it]) => !it.deleted);
  const units = items.reduce((n, [, it]) => n + (Number(it.qty) > 0 ? Number(it.qty) : 1), 0);
  const done = items.filter(([, it]) => it.checked).length;
  const srcs = [...new Set(items.map(([, it]) => it.src).filter(Boolean))].sort();
  const srcLine = srcs.length > 6 ? srcs.slice(0, 6).join(' · ') + ` +${srcs.length - 6} more` : srcs.join(' · ');
  const openNotes = Object.values(room.notes || {}).filter(n => !n.resolved);
  const noteLine = openNotes.map(n => `★ ${esc(n.text.toUpperCase())}`).join(' &nbsp;·&nbsp; ');
  const meta = SPACE_META[room.number] || {};

  // Categories present, in canonical order; anything unknown rides at the end.
  const present = [...new Set(items.map(([, it]) => it.category || ''))];
  const cats = [
    ...CATEGORY_ORDER.filter(c => present.includes(c)),
    ...present.filter(c => c && !CATEGORY_ORDER.includes(c)).sort(),
    ...(present.includes('') ? [''] : []),
  ];
  const groups = groupsFor(room, cats);
  const stamp = new Date().toLocaleString([], {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  $('sheet').innerHTML = `<div class="sheet sp">
  <header class="hdr">
    <img src="./img/logo-full-light.png" alt="Triun Construction &amp; Engineering">
    <div class="proj">
      <b>H2SEP · Home2 Suites by Hilton — Eagle Pass, TX</b><br>
      Triun Job 24030 · 115 Keys<br>
      <span class="mut">Common Area Turnover Checklist · FF&amp;E / Finishes scope</span>
    </div>
  </header>

  <div class="title">
    <h1>${esc((room.typeLabel || 'SPACE').toUpperCase())}</h1>
    <h2>Space ${esc(room.number.replace('ZONE-', 'Zone '))} · Common Area</h2>
    <div class="meta">Level ${esc(String(room.floor))} &nbsp;·&nbsp; ${done}/${items.length} verified at print time</div>
    ${meta.note ? `<div class="plan-note">${esc(meta.sheet ? meta.sheet + ' — ' : '')}${esc(meta.note)}</div>` : ''}
    ${noteLine ? `<div class="room-note top">${noteLine}</div>` : ''}
  </div>

  ${items.length === 0 ? `<div class="empty-space">No line items are drawn for this space in the
    reference set. Items added in the app will appear here.</div>` : `
  <div class="items sp-items">
${sectionsHTML(groups)}
  </div>`}

  <footer class="ftr">
    <span>${items.length} lines / ${units} units${srcLine ? ` · sources ${esc(srcLine)}` : ''} · printed ${esc(stamp)}</span>
    <span>Initials in box = verified in space · red = open issue</span>
  </footer>
</div>`;
  document.title = `${room.typeLabel || 'Space'} ${room.number} — Print Sheet · H2SEP`;
  $('state').textContent = DEMO ? 'Demo data — not live check-offs' : `Live as of ${stamp}`;
}

// MEP PUNCH SHEET. Same paper as the turnover sheets, different job: every
// line is an action a walker performs, so the verify step prints under the
// item and each trade starts its own page — the plumber gets a page that is
// only plumbing, and can sign it without carrying the electrician's work.
function renderMep(room) {
  const base = mepParent(room.number) || room.number;
  const items = Object.entries(room.items || {}).filter(([, it]) => !it.deleted);
  const units = items.reduce((n, [, it]) => n + (Number(it.qty) > 0 ? Number(it.qty) : 1), 0);
  const done = items.filter(([, it]) => it.checked).length;
  const srcs = [...new Set(items.map(([, it]) => it.src).filter(Boolean))].sort();
  const srcLine = srcs.length > 6 ? srcs.slice(0, 6).join(' · ') + ` +${srcs.length - 6} more` : srcs.join(' · ');
  const openNotes = Object.values(room.notes || {}).filter(n => !n.resolved);
  const noteLine = openNotes.map(n => `★ ${esc(n.text.toUpperCase())}`).join(' &nbsp;·&nbsp; ');

  const present = [...new Set(items.map(([, it]) => it.category || ''))];
  const cats = [
    ...MEP_CATEGORY_ORDER.filter(c => present.includes(c)),
    ...present.filter(c => c && !MEP_CATEGORY_ORDER.includes(c)).sort(),
    ...(present.includes('') ? [''] : []),
  ];
  const groups = groupsFor(room, cats);
  const stamp = new Date().toLocaleString([], {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  const mepItemHTML = ([, it]) => {
    const openIssue = it.issue && !it.issueResolved;
    const qty = Number(it.qty) > 1 ? ` <span class="qty">×${Number(it.qty)}</span>` : '';
    const flag = it.reliability === 'FLAGGED' ? '&nbsp;<span class="flag nw">⚑&nbsp;FLAGGED</span>' : '';
    const issue = openIssue ? ` <span class="issue">&#8212;&nbsp;${esc(it.issue.toUpperCase())}</span>` : '';
    const note = it.instanceNote ? `<div class="inote">${esc(it.instanceNote)}</div>` : '';
    const tag = it.code ? `<b class="tag">${esc(it.code)}</b><span class="dash"> – </span>` : '';
    const step = it.verifyAtPunch ? `<div class="vstep">▸ ${esc(it.verifyAtPunch)}</div>` : '';
    return `<div class="item"><div class="item-text">${tag}<span class="lbl">${esc(it.label)}${qty}</span>${issue}${flag}${step}${note}</div>` +
      `<div class="box${it.checked ? ' done' : ''}">${it.checked ? esc(it.initials || '✓') : ''}</div></div>`;
  };
  const mepSections = (gs) => gs.map((g, i) => `<section class="cat mep-cat${i ? ' brk' : ''}">
<h3 class="cat-head">${esc((MEP_LETTER[g.cat] || '').toUpperCase())}${MEP_LETTER[g.cat] ? ' · ' : ''}${esc(g.label.toUpperCase())} <span class="cat-n">${g.rows.length} item${g.rows.length === 1 ? '' : 's'}</span></h3>
${g.rows.map(mepItemHTML).join('\n')}
<div class="signoff">Trade: ______________________ &nbsp; Signed: ______________________ &nbsp; Date: ____________</div>
</section>`).join('\n');

  $('sheet').innerHTML = `<div class="sheet mep">
  <header class="hdr">
    <img src="./img/logo-full-light.png" alt="Triun Construction &amp; Engineering">
    <div class="proj">
      <b>H2SEP · Home2 Suites by Hilton — Eagle Pass, TX</b><br>
      Triun Job 24030 · 115 Keys<br>
      <span class="mut">MEP Punch List · Mechanical / Electrical / Plumbing / Fire Protection / Low Voltage</span>
    </div>
  </header>

  <div class="title">
    <h1>MEP PUNCH — ROOM #${esc(base)}</h1>
    <h2>${esc((room.typeLabel || '').trim())}</h2>
    <div class="meta">Floor ${esc(String(room.floor))} &nbsp;·&nbsp; ${done}/${items.length} verified at print time
      &nbsp;·&nbsp; installed &amp; verifiable scope (concealed rough-in not listed)</div>
    ${noteLine ? `<div class="room-note top">${noteLine}</div>` : ''}
  </div>

  ${items.length === 0 ? `<div class="empty-space">No MEP punch lines for this room yet.</div>` : `
  <div class="items mep-items">
${mepSections(groups)}
  </div>`}

  <footer class="ftr">
    <span>${items.length} lines / ${units} units${srcLine ? ` · sheets ${esc(srcLine)}` : ''} · printed ${esc(stamp)}</span>
    <span>Initials in box = verified in room · red = open issue · ⚑ = drawings disagree, confirm before sign-off</span>
  </footer>
</div>`;
  document.title = `MEP Punch ${base} — Print Sheet · H2SEP`;
  $('state').textContent = DEMO ? 'Demo data — not live check-offs' : `Live as of ${stamp}`;
}

function render(room) {
  if (isMepDoc(room)) return renderMep(room);
  if (isSpaceDoc(room)) return renderSpace(room);
  const items = Object.entries(room.items || {}).filter(([, it]) => !it.deleted);
  const units = items.reduce((n, [, it]) => n + (Number(it.qty) > 0 ? Number(it.qty) : 1), 0);
  const done = items.filter(([, it]) => it.checked).length;
  const srcs = [...new Set(items.map(([, it]) => it.src).filter(Boolean))].sort().join(' · ');
  const openNotes = Object.values(room.notes || {}).filter(n => !n.resolved);
  const noteLine = openNotes.map(n => `★ ${esc(n.text.toUpperCase())}`).join(' &nbsp;·&nbsp; ');
  const g1 = groupsFor(room, PAGE1);
  const g2 = groupsFor(room, [...PAGE2, ...leftoverCats(room)]);
  const title = (room.typeLabel || '').trim();
  const stamp = new Date().toLocaleString([], {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  $('sheet').innerHTML = `<div class="sheet">
  <header class="hdr">
    <img src="./img/logo-full-light.png" alt="Triun Construction &amp; Engineering">
    <div class="proj">
      <b>H2SEP · Home2 Suites by Hilton — Eagle Pass, TX</b><br>
      Triun Job 24030 · 115 Keys<br>
      <span class="mut">Room Turnover Checklist · FF&amp;E / Appliance / Bath Accessory scope</span>
    </div>
  </header>

  <div class="title">
    <h1>ROOM #${esc(room.number)}</h1>
    <h2>${esc(title)}</h2>
    <div class="meta">Floor ${esc(String(room.floor))} &nbsp;·&nbsp; ${done}/${items.length} verified at print time</div>
    ${noteLine ? `<div class="room-note top">${noteLine}</div>` : ''}
  </div>

  <div class="items">
${sectionsHTML(g1)}
  </div>

  ${g2.length ? `<div class="p2">
    <div class="cont-head">
      <b>ROOM #${esc(room.number)} &nbsp;·&nbsp; ${esc(title)}</b>
      <span>H2SEP · Triun Job 24030 &nbsp;·&nbsp; page 2 — ${esc(g2.map(g => g.label).join(' &amp; '))}</span>
    </div>
    ${noteLine ? `<div class="room-note cont">${noteLine}</div>` : ''}
    <div class="items">
${sectionsHTML(g2)}
    </div>
  </div>` : ''}

  <footer class="ftr">
    <span>${items.length} lines / ${units} units${srcs ? ` · sources ${esc(srcs)}` : ''} · printed ${esc(stamp)}</span>
    <span>Initials in box = verified in room · red = open issue</span>
  </footer>
</div>`;
  document.title = `Room ${room.number} — Print Sheet · H2SEP`;
  $('state').textContent = DEMO
    ? 'Demo data — not live check-offs'
    : `Live as of ${stamp}`;
}

// ---------- boot ----------
$('back-link').href = './index.html#/room/' + encodeURIComponent(ROOM);
// The 3D button is gated exactly as the room screen gates it (screens.js:353,
// :417). Without this the sheet offered the exhibit for EVERY room, and
// room-3d.html would answer with room 101's two-queen-bed QQ geometry wearing
// the requested room's number — wrong beds, wrong dimensions, and a connecting
// door that isn't there. A missing button is honest; a relabelled wrong room
// is not.
if (MODEL_ROOMS.includes(ROOM)) {
  $('model-link').href = './room-3d.html?room=' + encodeURIComponent(ROOM) + (DEMO ? '&demo=1' : '');
} else {
  $('model-link').remove();
}
$('print-btn').addEventListener('click', () => window.print());

// Paint whatever the app handed over first — a sheet on screen beats a spinner.
const handed = DEMO ? null : handoffRoom();
if (handed) {
  render(handed);
  $('state').textContent = 'From this phone — checking for newer…';
}

// Firestore retries a dead network forever rather than rejecting, so cap the
// wait ourselves; otherwise "Loading…" is all a crew member in a dead zone
// would ever see.
const TIMEOUT_MS = 10_000;
Promise.race([
  loadRoom(),
  new Promise((_, rej) => setTimeout(() => rej(new Error('no signal')), TIMEOUT_MS)),
])
  .then(render)
  .catch((e) => {
    if (handed) {
      // The handed-over copy is already on screen and is what this phone shows.
      $('state').textContent = 'No signal — printing this phone’s copy';
      return;
    }
    $('state').textContent = 'Could not load: ' + (e.message || e);
    $('sheet').innerHTML = `<div class="sheet"><div class="title"><h1>ROOM #${esc(ROOM)}</h1>
      <div class="meta">No signal. Open this sheet from the room screen while you have
      service, or reload once you are back in coverage.</div></div></div>`;
  });
