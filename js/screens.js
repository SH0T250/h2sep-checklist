// Screen renderers. Each returns an HTML string and wires events after mount
// via the returned `wire(el)` function.
import { esc, fmtWhen, roomStats, typeAbbrev, platform, vibrate, toast, roomSort, isSpaceDoc, isMepDoc, mepParent, mepIdFor, CATEGORY_ORDER, MEP_CATEGORY_ORDER, MEP_LETTER } from './util.js';
import { SPACE_META } from './space-meta.js';
import * as store from './store.js';
import * as sheets from './sheets.js';
import { refsFor } from './refs.js';
import { getTheme, setTheme, toggleTheme } from './theme.js';
import { APP_VERSION, MODEL_ROOMS } from './config.js';

// Writing is allowed once initials exist; on iOS it additionally requires the
// installed (standalone) app — Safari-tab check-offs can be stranded by install.
export function canWrite() {
  if (!store.getUser()) return false;
  if (platform.isIOS && !platform.standalone) return false;
  // Live mode: one successful invisible sign-in is required before check-offs
  // count (otherwise queued writes would be rejected at sync and vanish).
  if (!store.isWriteReady()) return false;
  return true;
}

function offlinePill() {
  const n = store.pendingCount();
  if (store.isOnline() && n === 0) return '';
  if (!store.isOnline()) return `<button class="pill offline" data-pill>⇅ Offline${n ? ' · ' + n : ''}</button>`;
  return `<button class="pill syncing" data-pill>⇅ Syncing…</button>`;
}

function appBar({ title, back = null, icons = '', logo = false }) {
  return `
  <header class="appbar">
    ${back !== null
      ? `<a class="ab-btn" href="${esc(back)}" aria-label="Back">‹</a>`
      : (logo ? '' : `<span class="ab-mark"><img src="./img/tmark.png" alt="Triūn"></span>`)}
    ${logo
      ? `<h1 class="ab-title ab-title-logo"><img class="ab-logo" src="./img/logo-full-dark.png" alt="TRIŪN Construction | Engineering — ${esc(title)}"></h1>`
      : `<h1 class="ab-title">${esc(title)}</h1>`}
    <div class="ab-right">${offlinePill()}${icons}</div>
  </header>
  ${store.getMode() === 'demo' ? `<div class="demo-strip">Demo mode — saved on this phone only. Firebase hookup pending.</div>` : ''}`;
}

function wireCommon(el) {
  const pill = el.querySelector('[data-pill]');
  if (pill) pill.addEventListener('click', () => {
    const n = store.pendingCount();
    sheets.sheet(`<p class="confirm-msg">${store.isOnline()
      ? 'Back online — changes are syncing now.'
      : `No connection. Everything still works — ${n || 'your'} change${n === 1 ? ' is' : 's are'} saved on this phone and will sync automatically when you have signal.`}</p>`,
      { title: store.isOnline() ? 'Syncing' : 'Offline' });
  });
  const search = el.querySelector('[data-goto]');
  if (search) search.addEventListener('click', sheets.goToRoomSheet);
}

// ============================ S1 HOME ============================

export function renderHome(el) {
  store.ensureAllFloorsSubscribed();
  const floors = Object.entries(store.getFloors()).sort((a, b) => a[1].sort - b[1].sort);
  const all = store.getAllRooms();
  let tItems = 0, tDone = 0, tIssues = 0, tRooms = all.length, tRoomsDone = 0;
  const byFloor = {};
  for (const r of all) {
    const s = roomStats(r);
    tItems += s.total; tDone += s.done; tIssues += s.openIssues;
    if (s.complete) tRoomsDone++;
    (byFloor[r.floor] = byFloor[r.floor] || []).push(s);
  }
  const pct = tItems ? Math.round(tDone / tItems * 100) : 0;
  const ring = ringSVG(pct, 96);

  el.innerHTML = appBar({
    title: 'H2SEP · Room Checklists',
    logo: true,
    icons: `<button class="ab-btn" data-goto aria-label="Go to room">⌕</button>
            <a class="ab-btn" href="#/settings" aria-label="Settings">⚙</a>`,
  }) + `
  <main class="content">
    ${all.length === 0 && !store.isReady() ? `<div class="empty">Loading…</div>` : ''}
    ${all.length === 0 && store.isReady() ? `
      <div class="empty">No rooms yet.<br>Add a floor and rooms, or ask Claude to load your paper sheets.</div>` : `
      <section class="hero card">
        ${ring}
        <div class="hero-stats">
          <div><b>${tDone.toLocaleString()}</b> / ${tItems.toLocaleString()} items checked</div>
          <div><b>${tRoomsDone}</b> / ${tRooms} rooms complete</div>
          <div class="issue-text">${tIssues} open issue${tIssues === 1 ? '' : 's'}</div>
        </div>
      </section>`}
    <section class="floor-list">
      ${floors.map(([n, f]) => {
        const stats = byFloor[n] || byFloor[Number(n)] || [];
        const rooms = stats.length;
        const items = stats.reduce((a, s) => a + s.total, 0);
        const done = stats.reduce((a, s) => a + s.done, 0);
        const iss = stats.reduce((a, s) => a + s.openIssues, 0);
        const p = items ? Math.round(done / items * 100) : 0;
        return `
        <a class="floor-card card" href="#/floor/${esc(n)}">
          <div class="fc-left"><div class="fc-name">${esc(f.label)}</div>
            <div class="fc-sub">${rooms} room${rooms === 1 ? '' : 's'}</div></div>
          <div class="fc-bar"><div class="bar"><div class="bar-fill" style="width:${p}%"></div></div></div>
          <div class="fc-right"><span class="fc-pct">${p}%</span>
            ${iss ? `<span class="badge">${iss}</span>` : ''}</div>
        </a>`;
      }).join('')}
      ${(() => {
        // Common areas roll up into ONE card beside the levels — Austin's
        // call: a facilities walk is its own trip, not a floor's sub-list.
        const sp = store.getSpaces();
        if (!sp.length) return '';
        let items = 0, done = 0, iss = 0;
        for (const r of sp) {
          const s = roomStats(r);
          items += s.total; done += s.done; iss += s.openIssues;
        }
        const p = items ? Math.round(done / items * 100) : 0;
        return `
        <a class="floor-card card common-card" href="#/common">
          <div class="fc-left"><div class="fc-name">Common Areas</div>
            <div class="fc-sub">${sp.length} space${sp.length === 1 ? '' : 's'} · lobby, amenities, BOH</div></div>
          <div class="fc-bar"><div class="bar"><div class="bar-fill" style="width:${p}%"></div></div></div>
          <div class="fc-right"><span class="fc-pct">${p}%</span>
            ${iss ? `<span class="badge">${iss}</span>` : ''}</div>
        </a>`;
      })()}
      <button class="add-ghost" data-add-floor>+ Add floor</button>
    </section>
  </main>`;

  wireCommon(el);
  el.querySelector('[data-add-floor]').addEventListener('click', async () => {
    if (!(await sheets.requireAdmin())) return;
    const s = sheets.sheet(`
      <form class="note-form">
        <input type="tel" inputmode="numeric" name="num" placeholder="Floor number (e.g. 5)" required class="pin-input">
        <button class="btn primary full">Add floor</button>
      </form>`, { title: 'New floor' });
    s.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const n = e.target.num.value.trim();
      if (!n) return;
      store.addFloor(n, 'Level ' + n);
      s.remove();
    });
  });
}

function ringSVG(pct, size) {
  const r = (size - 10) / 2, c = 2 * Math.PI * r;
  return `
  <svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${pct}% complete">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--hairline)" stroke-width="8"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--done)" stroke-width="8"
      stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}"
      transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" class="ring-text">${pct}%</text>
  </svg>`;
}

// ============================ S2 FLOOR ============================

const FILTERS = ['All', 'In progress', 'Issues', 'Done', 'Not started'];

export function renderFloor(el, floorN) {
  store.ensureFloorSubscribed(floorN);
  const floors = Object.entries(store.getFloors()).sort((a, b) => a[1].sort - b[1].sort);
  const f = store.getFloors()[floorN] || { label: 'Level ' + floorN };
  const filter = sessionStorage.getItem('h2sep-filter') || 'All';
  // Which checklist family this floor is showing. MEP punch lists are a
  // separate body of work on the same rooms — a different crew, a different
  // day — so the floor shows one or the other, never a mixed grid.
  const mepDocs = store.getMepDocs(floorN);
  const view = mepDocs.length && sessionStorage.getItem('h2sep-floorview') === 'mep' ? 'mep' : 'ffe';
  const rooms = view === 'mep' ? mepDocs : store.getRooms(floorN);
  const withStats = rooms.map(r => ({ r, s: roomStats(r) }));
  const counts = {
    All: rooms.length,
    'In progress': withStats.filter(x => x.s.done > 0 && !x.s.complete).length,
    Issues: withStats.filter(x => x.s.openIssues > 0).length,
    Done: withStats.filter(x => x.s.complete).length,
    'Not started': withStats.filter(x => x.s.done === 0 && x.s.total > 0).length,
  };
  const visible = withStats.filter(({ s }) => {
    if (filter === 'In progress') return s.done > 0 && !s.complete;
    if (filter === 'Issues') return s.openIssues > 0;
    if (filter === 'Done') return s.complete;
    if (filter === 'Not started') return s.done === 0 && s.total > 0;
    return true;
  });

  el.innerHTML = appBar({
    title: f.label, back: '#/',
    icons: `<button class="ab-btn" data-goto aria-label="Go to room">⌕</button>`,
  }) + `
  <main class="content">
    <div class="seg">
      ${floors.map(([n, fl]) => `<a class="seg-btn ${String(n) === String(floorN) ? 'on' : ''}"
        href="#/floor/${esc(n)}">${esc(String(fl.sort))}</a>`).join('')}
    </div>
    ${mepDocs.length ? `
    <div class="doc-switch floor-switch" role="tablist" aria-label="Checklist type">
      <button class="ds-btn ${view === 'ffe' ? 'on' : ''}" role="tab" aria-selected="${view === 'ffe'}"
        data-floorview="ffe">FF&amp;E · ${store.getRooms(floorN).length}</button>
      <button class="ds-btn ${view === 'mep' ? 'on' : ''}" role="tab" aria-selected="${view === 'mep'}"
        data-floorview="mep">MEP PUNCH · ${mepDocs.length}</button>
    </div>` : ''}
    <div class="chips">
      ${FILTERS.map(x => `<button class="chip ${x === filter ? 'on' : ''}" data-filter="${esc(x)}">
        ${esc(x)}${counts[x] ? ' · ' + counts[x] : ''}</button>`).join('')}
    </div>
    <div class="room-grid">
      ${visible.map(({ r, s }) => {
        const t = typeAbbrev(r.typeLabel);
        const base = view === 'mep' ? (mepParent(r.number) || r.number) : r.number;
        return `
        <a class="room-card ${view === 'mep' ? 'mep-card ' : ''}${s.complete ? 'done' : ''} ${s.openIssues ? 'issues' : ''}" href="#/room/${esc(r.number)}">
          ${s.openIssues ? `<span class="badge tr">${s.openIssues}</span>` : (s.complete ? `<span class="done-glyph tr">✓</span>` : '')}
          <div class="rc-num">${esc(base)}</div>
          <div class="rc-type">${view === 'mep' ? 'MEP · ' + s.total : esc(t.abbrev) + (t.ada ? ' <span class="ada">ADA</span>' : '')}</div>
          <div class="bar rc-bar"><div class="bar-fill" style="width:${s.pct}%"></div></div>
        </a>`;
      }).join('')}
      ${view === 'mep' ? '' : `<button class="room-card add-ghost" data-add-room>+ Add<br>room</button>`}
    </div>
    ${visible.length === 0 ? `<div class="empty">No ${filter === 'All' ? '' : filter.toLowerCase() + ' '}rooms on this floor yet.</div>` : ''}
  </main>`;

  wireCommon(el);
  el.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => {
    sessionStorage.setItem('h2sep-filter', b.dataset.filter);
    renderFloor(el, floorN);
  }));
  el.querySelectorAll('[data-floorview]').forEach(b => b.addEventListener('click', () => {
    sessionStorage.setItem('h2sep-floorview', b.dataset.floorview);
    renderFloor(el, floorN);
  }));
  const addBtn = el.querySelector('[data-add-room]');
  if (addBtn) addBtn.addEventListener('click', async () => {
    if (!(await sheets.requireAdmin())) return;
    location.hash = '#/room-new/' + floorN;
  });
}

// ============================ S2b COMMON AREAS ============================

// One screen for all 66 non-guest spaces, grouped by level. Name-forward cards
// ("003 · Lobby") because nobody knows the Fitness Room by its door number.
export function renderCommon(el) {
  store.ensureAllFloorsSubscribed();
  const spaces = store.getSpaces();
  const filter = sessionStorage.getItem('h2sep-cfilter') || 'All';
  const withStats = spaces.map(r => ({ r, s: roomStats(r) }));
  const counts = {
    All: spaces.length,
    'In progress': withStats.filter(x => x.s.done > 0 && !x.s.complete).length,
    Issues: withStats.filter(x => x.s.openIssues > 0).length,
    Done: withStats.filter(x => x.s.complete).length,
    'Not started': withStats.filter(x => x.s.done === 0 && x.s.total > 0).length,
  };
  const visible = withStats.filter(({ s }) => {
    if (filter === 'In progress') return s.done > 0 && !s.complete;
    if (filter === 'Issues') return s.openIssues > 0;
    if (filter === 'Done') return s.complete;
    if (filter === 'Not started') return s.done === 0 && s.total > 0;
    return true;
  });
  const byFloor = {};
  for (const x of visible) (byFloor[x.r.floor] = byFloor[x.r.floor] || []).push(x);

  el.innerHTML = appBar({
    title: 'Common Areas', back: '#/',
    icons: `<button class="ab-btn" data-goto aria-label="Go to room">⌕</button>`,
  }) + `
  <main class="content">
    <div class="chips">
      ${FILTERS.map(x => `<button class="chip ${x === filter ? 'on' : ''}" data-filter="${esc(x)}">
        ${esc(x)}${counts[x] ? ' · ' + counts[x] : ''}</button>`).join('')}
    </div>
    ${Object.entries(byFloor).sort((a, b) => Number(a[0]) - Number(b[0])).map(([fl, xs]) => `
      <h2 class="common-floor-head">Level ${esc(fl)} <span>· ${xs.length} space${xs.length === 1 ? '' : 's'}</span></h2>
      <div class="space-list">
        ${xs.map(({ r, s }) => `
        <a class="space-card card ${s.complete ? 'done' : ''} ${s.openIssues ? 'issues' : ''}" href="#/room/${esc(r.number)}">
          <span class="sc-num">${esc(r.number.replace('ZONE-', 'ZONE '))}</span>
          <span class="sc-main">
            <span class="sc-name">${esc(r.typeLabel || '—')}</span>
            <span class="bar sc-bar"><span class="bar-fill" style="width:${s.pct}%"></span></span>
          </span>
          <span class="sc-right">
            ${s.openIssues ? `<span class="badge">${s.openIssues}</span>` : ''}
            ${s.complete ? `<span class="done-glyph">✓</span>` : `<span class="sc-count">${s.done}/${s.total}</span>`}
          </span>
        </a>`).join('')}
      </div>`).join('')}
    ${visible.length === 0 ? `<div class="empty">${spaces.length === 0
      ? (store.isReady() ? 'No common areas yet — they arrive with the next data load.' : 'Loading…')
      : 'No ' + filter.toLowerCase() + ' spaces.'}</div>` : ''}
  </main>`;

  wireCommon(el);
  el.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => {
    sessionStorage.setItem('h2sep-cfilter', b.dataset.filter);
    renderCommon(el);
  }));
}

// ============================ S3 ROOM ============================

let lastScrollEnd = 0;
document.addEventListener('scroll', () => { lastScrollEnd = Date.now(); }, { capture: true, passive: true });

// CATEGORY_ORDER moved to util.js (the printable sheets need it too).

// Trade-filter selection (null = All). Per-visit only: any navigation resets
// it, so every room opens on All; re-renders from data changes keep it.
let tradeFilter = null;
window.addEventListener('hashchange', () => { tradeFilter = null; });

// Collapsed category sections, per room, remembered on this device so a crew
// member working one trade doesn't re-open the others on every visit. Storage
// failures (private mode) degrade to "everything open" rather than throwing.
const LS_COLLAPSED = 'h2sep-collapsed';
function collapsedSet() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_COLLAPSED)) || []); }
  catch { return new Set(); }
}
function catKey(roomNumber, cat) { return roomNumber + ' ' + cat; }
function isCatCollapsed(roomNumber, cat) { return collapsedSet().has(catKey(roomNumber, cat)); }
function setCatCollapsed(roomNumber, cat, shut) {
  const s = collapsedSet();
  s[shut ? 'add' : 'delete'](catKey(roomNumber, cat));
  try { localStorage.setItem(LS_COLLAPSED, JSON.stringify([...s])); } catch (_) { /* session-only */ }
}

export function renderRoom(el, number) {
  const room = store.getRoom(number);
  if (!room) {
    // Might be on an unsubscribed floor (deep link): subscribe by floor digit heuristic.
    const guess = String(number).length >= 3 ? String(number)[0] : null;
    if (guess) store.ensureFloorSubscribed(guess);
    store.ensureAllFloorsSubscribed();
    el.innerHTML = appBar({ title: 'Room ' + number, back: '#/' }) +
      `<main class="content"><div class="empty">${store.isReady() ? 'Room not found (yet).' : 'Loading…'}</div></main>`;
    wireCommon(el);
    return;
  }
  const s = roomStats(room);
  const w = canWrite();
  const items = Object.entries(room.items || {})
    .filter(([, it]) => !it.deleted)
    .sort((a, b) => (a[1].sort || 0) - (b[1].sort || 0));
  // duplicate-instance chips
  const codeCount = {}, codeSeen = {};
  items.forEach(([, it]) => { codeCount[it.code] = (codeCount[it.code] || 0) + 1; });

  // Full-trade rooms carry item.category — group + chip-filter those.
  // Legacy rooms (no category on any item) keep the flat list untouched.
  const catMode = items.some(([, it]) => it.category);
  let groups = null;
  if (catMode) {
    const byCat = new Map();
    for (const row of items) {
      const cat = row[1].category || '';
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat).push(row);
    }
    // An MEP punch sheet orders itself by TRADE (M · E · P · FP · LV), not by
    // the FF&E build sequence — a punch walker works one trade at a time and
    // the plumber never wants to scroll past the sconces.
    const ORDER = isMepDoc(room) ? MEP_CATEGORY_ORDER : CATEGORY_ORDER;
    const known = [], unknown = [];
    for (const cat of byCat.keys()) {
      if (!cat) continue;
      (ORDER.indexOf(cat) >= 0 ? known : unknown).push(cat);
    }
    known.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
    unknown.sort((a, b) => a.localeCompare(b));
    const order = known.concat(unknown);
    if (byCat.has('')) order.push(''); // ad-hoc/uncategorized items last
    groups = order.map(cat => ({
      cat, label: cat || 'Other', rows: byCat.get(cat),
      letter: isMepDoc(room) ? (MEP_LETTER[cat] || '') : '',
    }));
    // Stale per-visit selection (e.g. category vanished in a remote update).
    if (tradeFilter !== null && !byCat.has(tradeFilter)) tradeFilter = null;
  } else {
    tradeFilter = null;
  }
  const flaggedCount = catMode ? items.filter(([, it]) => it.reliability === 'FLAGGED').length : 0;
  const mostlyDerived = catMode && items.length > 0 &&
    items.filter(([, it]) => it.derived).length / items.length >= 0.9;

  // One row renderer for both modes — identical markup to the original flat
  // list when the new fields (category/reliability/instanceNote/'' code) are
  // absent, so legacy rooms render exactly as before.
  // A punch row is shaped differently from an FF&E row. FF&E instance notes are
  // a few words, so they sit in a narrow right-hand rail; MEP notes are whole
  // paragraphs of drawing evidence and collapse that rail into an unreadable
  // ribbon. And the punch STEP — the action the walker performs, the entire
  // point of a punch list — was rendering on the printed sheet only, so the
  // crew working off a phone could not see what to do.
  const isMepRow = isMepDoc(room);
  const rowHTML = ([id, it]) => {
    codeSeen[it.code] = (codeSeen[it.code] || 0) + 1;
    // Duplicate-tag ordinal always shows so siblings never look like missing
    // rows; the db's instanceNote rides along with it when present.
    const ordinal = it.code && codeCount[it.code] > 1 ? `${codeSeen[it.code]} of ${codeCount[it.code]}` : '';
    const inst = it.instanceNote && ordinal && !/\d+\s+of\s+\d+/.test(it.instanceNote)
      ? `${it.instanceNote} · ${ordinal}`
      : (it.instanceNote || ordinal);
    const openIssue = it.issue && !it.issueResolved;
    const flagged = it.reliability === 'FLAGGED';
    const pendingDot = store.isRoomPending(room.number) && store.isItemRecentLocal(room.number, id);
    return `
        <div class="item-row ${it.checked ? 'checked' : ''} ${openIssue ? 'issue' : ''}${flagged ? ' flagged' : ''}" role="listitem"
             data-item="${esc(id)}" ${openIssue ? 'data-has-issue' : ''}>
          <button class="box" role="checkbox" aria-checked="${it.checked}"
            aria-label="${esc((it.code ? it.code + ' ' : '') + it.label + (it.checked ? ', checked by ' + (it.initials || 'unknown') : ''))}"
            data-box="${esc(id)}">
            ${it.checked ? `<span class="ink">${esc(it.initials || '✓')}</span>` : ''}
            ${openIssue ? `<span class="box-flag">⚑</span>` : ''}
            ${pendingDot ? `<span class="pend-dot" title="Waiting to sync"></span>` : ''}
          </button>
          <div class="item-main" data-rowtap="${esc(id)}">
            <div class="item-line1">${it.code ? `<b class="code">${esc(it.code)}</b> ` : ''}${Number(it.qty) > 1 ? `<span class="qtyb" aria-label="quantity ${Number(it.qty)}">×${Number(it.qty)}</span>` : ''}<span class="lbl">${esc(it.label)}</span></div>
            ${flagged ? `<div class="verify-chip warn">⚠ VERIFY — sources disagree</div>` : ''}
            ${it.reliability === 'MEDIUM' || it.reliability === 'LOW' ? `<div class="verify-chip">verify${it.reliability === 'LOW' ? ' — scaled source' : ''}</div>` : ''}
            ${openIssue ? `<div class="item-note">— ${esc(it.issue.toUpperCase())}</div>` : ''}
            ${it.issue && it.issueResolved ? `<div class="item-note resolved"><s>— ${esc(it.issue.toUpperCase())}</s></div>` : ''}
            ${(n => n ? `<button class="ref-count" data-refchip="${esc(id)}" aria-label="References">📎 ${n} ref${n > 1 ? 's' : ''}</button>` : '')(refsFor(room.number, it, id).length)}
            ${isMepRow && it.where ? `<div class="punch-where"><span class="punch-at">AT</span> ${esc(it.where)}</div>` : ''}
            ${isMepRow && it.verifyAtPunch ? `<div class="punch-step"><span class="punch-do">DO</span> ${esc(it.verifyAtPunch)}</div>` : ''}
            ${isMepRow && inst ? `<div class="punch-note">${esc(inst)}</div>` : ''}
          </div>
          ${!isMepRow && inst ? `<span class="inst${it.instanceNote ? ' inst-note' : ''}">${esc(inst)}</span>` : ''}
          <button class="flag-btn ${openIssue ? 'on' : ''}" data-flag="${esc(id)}" aria-label="Flag issue">⚑</button>
        </div>`;
  };

  // A space's prev/next walks the other common areas, never into guest rooms
  // (and vice versa) — flipping from "Lobby" to "Room 101" mid-swipe reads as
  // a bug even when every number is technically adjacent.
  const isSpace = isSpaceDoc(room);
  // An MEP punch doc walks the other MEP docs on its floor — swiping from the
  // 105 punch list into the 107 FF&E list would be a different trade's work.
  const isMep = isMepDoc(room);
  const mepBase = isMep ? (mepParent(room.number) || room.number) : null;
  const siblings = (isMep ? store.getMepDocs(room.floor)
    : isSpace ? store.getSpaces(room.floor) : store.getRooms(room.floor)).map(r => r.number);
  const idx = siblings.indexOf(room.number);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  const notes = Object.entries(room.notes || {});
  const openNotes = notes.filter(([, n]) => !n.resolved);
  const resolvedNotes = notes.filter(([, n]) => n.resolved);
  const meta = isSpace ? (SPACE_META[room.number] || {}) : {};

  el.innerHTML = appBar({
    title: isMep ? 'MEP Punch · ' + mepBase
      : isSpace ? (room.typeLabel || 'Space') + ' · ' + room.number : 'Room ' + room.number,
    back: isSpace ? '#/common' : '#/floor/' + room.floor,
    icons: `<button class="ab-btn" data-goto aria-label="Go to room">⌕</button>
            <button class="ab-btn" data-more aria-label="More">⋮</button>`,
  }) + `
  <main class="content room-content">
    <section class="room-head card">
      <div class="rh-top">
        <span class="rh-num">${isMep ? 'MEP ' + esc(mepBase)
          : isSpace ? esc(room.typeLabel || 'Space') : 'Room ' + esc(room.number)}</span>
        <span class="rh-right">
        ${isSpace ? '' : `<a class="sheet-btn" href="./refs.html?room=${encodeURIComponent(room.number)}" aria-label="Submittals and plan references">📄</a>`}
        <a class="sheet-btn" href="./print.html?room=${encodeURIComponent(room.number)}" aria-label="Printable checklist sheet">🖨</a>
        ${!isMep && MODEL_ROOMS.includes(room.number) ? `<a class="sheet-btn" href="./room-3d.html?room=${encodeURIComponent(room.number)}" aria-label="3D room model">🧊</a>` : ''}
        <span class="rh-type">${isMep
          ? 'PUNCH · ' + esc((room.typeLabel || '').toUpperCase())
          : isSpace
          ? 'SPACE ' + esc(room.number) + ' · LEVEL ' + esc(String(room.floor))
          : esc((room.typeLabel || '').toUpperCase())}</span></span>
      </div>
      ${(() => {
        // FF&E ⇄ MEP toggle. Only drawn when the counterpart doc actually
        // exists, so a room with no punch list never offers a dead tab.
        if (isSpace) return '';
        const base = isMep ? mepBase : room.number;
        const hasMep = !!store.getMepFor(base);
        const hasFfe = !!store.getRoom(base);
        if (!hasMep || !hasFfe) return '';
        return `<div class="doc-switch" role="tablist" aria-label="Checklist type">
          <a class="ds-btn ${isMep ? '' : 'on'}" role="tab" aria-selected="${!isMep}"
             href="#/room/${encodeURIComponent(base)}">FF&amp;E</a>
          <a class="ds-btn ${isMep ? 'on' : ''}" role="tab" aria-selected="${isMep}"
             href="#/room/${encodeURIComponent(mepIdFor(base))}">MEP PUNCH</a>
        </div>`;
      })()}
      ${isSpace && meta.note ? `<div class="rh-plan-note">${esc(meta.sheet ? meta.sheet + ' — ' : '')}${esc(meta.note)}</div>` : ''}
      <div class="bar rh-bar"><div class="bar-fill" style="width:${s.pct}%"></div></div>
      <div class="rh-line">${s.done}/${s.total} checked · ${s.pct}%
        ${s.openIssues ? `<button class="issue-jump" data-jump>⚠ ${s.openIssues} issue${s.openIssues === 1 ? '' : 's'}</button>` : ''}
      </div>
      ${flaggedCount ? `<button class="flag-line" data-jump-flagged>⚠ ${flaggedCount} flagged — two sources disagree; verify both before ordering</button>` : ''}
      ${openNotes.map(([id, n]) => `
        <button class="note-row ${n.flag === 'issue' ? 'red' : ''}" data-note="${esc(id)}">
          <span class="star">★</span> ${esc(n.flag === 'issue' ? n.text.toUpperCase() : n.text)}
        </button>`).join('')}
      ${resolvedNotes.length ? `<details class="resolved-notes"><summary>Resolved (${resolvedNotes.length})</summary>
        ${resolvedNotes.map(([id, n]) => `<button class="note-row muted" data-note="${esc(id)}"><span class="star">★</span> <s>${esc(n.text)}</s></button>`).join('')}
      </details>` : ''}
      ${w ? `<button class="add-note-btn" data-add-note>+ ★ Add room note</button>` : ''}
      ${mostlyDerived ? `<div class="derived-note">Lines come from the room-type package (typicals), not per-room walk.</div>` : ''}
      <div class="how-line">👆 <b>Tap</b> a line to initial &amp; complete · <b>long-hold</b> for options (issue, notes, refs)</div>
    </section>

    ${catMode ? `
    <div class="chips trade-chips">
      <button class="chip tchip ${tradeFilter === null ? 'on' : ''}" data-trade-all>All · ${items.length}</button>
      ${groups.map(g => `<button class="chip tchip ${tradeFilter === g.cat ? 'on' : ''}"
        data-trade="${esc(g.cat)}">${esc(g.label)} · ${g.rows.length}</button>`).join('')}
    </div>
    <section class="item-groups">
      ${groups.map(g => {
        const done = g.rows.filter(([, it]) => it.checked).length;
        const hide = tradeFilter !== null && tradeFilter !== g.cat;
        const shut = isCatCollapsed(room.number, g.cat);
        return `
      <section class="cat-group ${hide ? 'hidden' : ''}${shut ? ' collapsed' : ''}" data-cat="${esc(g.cat)}">
        <button class="cat-head" data-cattoggle="${esc(g.cat)}" aria-expanded="${!shut}">
          <span class="cat-caret" aria-hidden="true">▾</span>
          ${g.letter ? `<span class="cat-letter" aria-hidden="true">${esc(g.letter)}</span>` : ''}
          <span class="cat-name">${esc(g.label.toUpperCase())} · ${done}/${g.rows.length}</span>
        </button>
        <div class="item-list" role="list">${g.rows.map(rowHTML).join('')}</div>
      </section>`;
      }).join('')}
      ${w ? `<button class="add-ghost" data-add-item>+ Add item</button>` : ''}
    </section>` : `
    <section class="item-list" role="list">
      ${items.map(rowHTML).join('')}
      ${w ? `<button class="add-ghost" data-add-item>+ Add item</button>` : ''}
    </section>`}
  </main>
  <footer class="room-foot">
    ${prev ? `<a class="foot-arrow" href="#/room/${esc(prev)}">‹ ${esc(prev)}</a>` : `<span class="foot-arrow dim"></span>`}
    <button class="foot-mid" data-top>${isSpace ? esc(room.typeLabel || room.number) : 'Room ' + esc(room.number)} — ${s.done}/${s.total}</button>
    ${next ? `<a class="foot-arrow" href="#/room/${esc(next)}">${esc(next)} ›</a>` : `<span class="foot-arrow dim"></span>`}
  </footer>
  ${!w && store.getUser() ? `<div class="readonly-strip">View only — ${platform.isIOS && !platform.standalone
    ? 'install the app to check items (Settings → install steps)'
    : (!store.isWriteReady()
      ? 'connecting this phone… needs one moment of signal before check-offs count'
      : 'set your initials in Settings')}</div>` : ''}`;

  wireCommon(el);

  el.querySelector('[data-more]').addEventListener('click', () => {
    // Spaces skip two entries: refs (submittal refs are guest-room data) and
    // Room settings (its template picker has nothing valid to offer a space —
    // restoring the Lobby "from template" could only ever mean a guest-room
    // package, so the door is closed rather than guarded).
    const sh = sheets.sheet(`
      ${isSpace ? '' : `<a class="btn ghost full" href="./refs.html?room=${encodeURIComponent(room.number)}">📄 Submittals &amp; plan references</a>`}
      <a class="btn ghost full" href="./print.html?room=${encodeURIComponent(room.number)}">🖨 Printable sheet (for the door)</a>
      ${MODEL_ROOMS.includes(room.number) ? `<a class="btn ghost full" href="./room-3d.html?room=${encodeURIComponent(room.number)}">🧊 3D room model</a>` : ''}
      <button class="btn ghost full hidden" data-act="paper">📄 Original paper sheet (photo)</button>
      <button class="btn ghost full" data-act="add-item">+ Add item to this ${isSpace ? 'space' : 'room'}</button>
      <button class="btn ghost full" data-act="theme">${getTheme() === 'dark' ? '☀ Light mode' : '🌙 Dark mode'}</button>
      ${isSpace ? '' : `<button class="btn ghost full" data-act="edit">Room settings (admin)</button>`}
      <button class="btn ghost full danger-text" data-act="delete">Delete ${isSpace ? 'space' : 'room'} (admin)</button>`,
      { title: isSpace ? (room.typeLabel || 'Space') + ' · ' + room.number : 'Room ' + room.number });
    // The original paper photo is history now that the printable sheet is
    // generated from live data — still reachable, but only for rooms that
    // actually have a scan. Revealed from the bundled index (offline-safe).
    const paperBtn = sh.querySelector('[data-act=paper]');
    paperBtn.addEventListener('click', () => { sh.remove(); sheets.paperSheetOverlay(room.number); });
    fetch('./sheets/index.json')
      .then(r => (r.ok ? r.json() : []))
      .then(list => { if (Array.isArray(list) && list.includes(room.number)) paperBtn.classList.remove('hidden'); })
      .catch(() => { /* no index cached -> leave it hidden rather than dead */ });
    sh.querySelector('[data-act=theme]').addEventListener('click', () => { sh.remove(); toggleTheme(); });
    sh.querySelector('[data-act=add-item]').addEventListener('click', () => { sh.remove(); addItemFlow(room); });
    sh.querySelector('[data-act=edit]')?.addEventListener('click', async () => {
      sh.remove();
      if (await sheets.requireAdmin()) location.hash = '#/room-new/' + room.floor + '?edit=' + room.number;
    });
    sh.querySelector('[data-act=delete]').addEventListener('click', async () => {
      sh.remove();
      if (!(await sheets.requireAdmin())) return;
      const what = isSpace ? (room.typeLabel || 'space') + ' (' + room.number + ')' : 'Room ' + room.number;
      if (await sheets.confirmDialog(`Delete ${what}? It disappears from every phone (recoverable by admin/Claude).`, { danger: true, okLabel: 'Delete' })) {
        // fire-and-forget: offline, the write promise won't resolve until
        // sync — but the local change is already live. Never block the UI on it.
        store.softDeleteRoom(room.number).catch(e => toast('Could not save: ' + e.message));
        location.hash = isSpace ? '#/common' : '#/floor/' + room.floor;
      }
    });
  });

  // Jump targets always come from ALL items — if the trade filter hides the
  // first match, drop back to All (re-render) so the row is reachable.
  function revealAndScroll(sel) {
    let t = el.querySelector(sel);
    if (t && t.offsetParent === null && tradeFilter !== null) {
      tradeFilter = null;
      renderRoom(el, number);
      t = el.querySelector(sel);
    }
    // A collapsed category hides its rows — open the one holding the target,
    // otherwise the jump silently lands nowhere.
    const group = t && t.closest('.cat-group.collapsed');
    if (group) {
      group.classList.remove('collapsed');
      const head = group.querySelector('[data-cattoggle]');
      if (head) head.setAttribute('aria-expanded', 'true');
      setCatCollapsed(room.number, group.dataset.cat, false);
    }
    if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  const jump = el.querySelector('[data-jump]');
  if (jump) jump.addEventListener('click', () => revealAndScroll('.item-row.issue'));
  const jumpFlagged = el.querySelector('[data-jump-flagged]');
  if (jumpFlagged) jumpFlagged.addEventListener('click', () => revealAndScroll('.item-row.flagged'));
  el.querySelectorAll('.tchip').forEach(b => b.addEventListener('click', () => {
    tradeFilter = ('tradeAll' in b.dataset) ? null : b.dataset.trade;
    // Picking a trade means "show me this" — never leave it collapsed-empty.
    if (tradeFilter !== null) setCatCollapsed(room.number, tradeFilter, false);
    renderRoom(el, number);
  }));

  // Category collapse: toggle in place (no re-render) so the crew's scroll
  // position survives, and the header they just tapped stays under the thumb.
  el.querySelectorAll('[data-cattoggle]').forEach(b => b.addEventListener('click', () => {
    const group = b.closest('.cat-group');
    const shut = group.classList.toggle('collapsed');
    b.setAttribute('aria-expanded', String(!shut));
    setCatCollapsed(room.number, b.dataset.cattoggle, shut);
  }));

  el.querySelectorAll('[data-note]').forEach(b => b.addEventListener('click', () =>
    sheets.noteSheet(room, b.dataset.note, { canWrite: w })));
  const addNote = el.querySelector('[data-add-note]');
  if (addNote) addNote.addEventListener('click', () => sheets.addNoteSheet(room));

  const addItem = el.querySelector('[data-add-item]');
  if (addItem) addItem.addEventListener('click', () => addItemFlow(room));

  el.querySelector('[data-top]').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // Hand the room over to print.html before navigating. That page is a cold
  // load with no store behind it, so without this a crew member in a dead
  // zone would watch it spin — with it, the sheet paints from what this phone
  // already knows and only refreshes if there is signal.
  // Write the handoff AS THE ROOM RENDERS, not only when a print/refs link is
  // clicked. The 3D exhibit is a separate page with no store behind it, and its
  // back bar links straight to refs.html and print.html — so a crew member who
  // went room -> 3D -> SHEET in a dead zone arrived with nothing handed over and
  // watched it spin. Writing it here means whatever room they last opened is
  // already in sessionStorage, whichever route they take afterwards.
  const handOff = () => {
    try { sessionStorage.setItem('h2sep-print-room', JSON.stringify(room)); }
    catch (_) { /* full/blocked — page falls back to a live read */ }
  };
  handOff();
  el.querySelectorAll('a[href*="print.html"], a[href*="refs.html"], a[href*="room-3d.html"]')
    .forEach(a => a.addEventListener('click', handOff));

  // ---- item interactions ----
  function tapItem(id) {
    const it = room.items[id];
    if (it.checked) { sheets.checkedItemSheet(room, id, { canWrite: w }); return; }
    if (it.issue && !it.issueResolved) { sheets.issueItemSheet(room, id, { canWrite: w }); return; }
    if (!w) { readOnlyNudge(); return; }
    const scrollAdjacent = Date.now() - lastScrollEnd < 400;
    store.checkItem(room.number, id).catch(e => toast('Could not save: ' + e.message));
    vibrate();
    if (scrollAdjacent) {
      toast('Checked ' + (it.code || it.label.slice(0, 40)), { action: 'Undo', onAction: () => store.uncheckItem(room.number, id) });
    }
  }
  // 📎 chip opens the references sheet without checking the row (field speed:
  // a plain row tap still checks — refs never get in the way of checking).
  el.querySelectorAll('[data-refchip]').forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation();
    sheets.itemRefsSheet(room, b.dataset.refchip);
  }));
  el.querySelectorAll('[data-box]').forEach(b => b.addEventListener('click', () => tapItem(b.dataset.box)));
  el.querySelectorAll('[data-rowtap]').forEach(r => r.addEventListener('click', () => tapItem(r.dataset.rowtap)));
  el.querySelectorAll('[data-flag]').forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!w) { readOnlyNudge(); return; }
    sheets.issueSheet(room, b.dataset.flag);
  }));

  // long-press → issue sheet
  el.querySelectorAll('.item-row').forEach(row => {
    let timer = null;
    row.addEventListener('touchstart', () => {
      timer = setTimeout(() => { timer = null; if (w) sheets.issueSheet(room, row.dataset.item); }, 500);
    }, { passive: true });
    ['touchend', 'touchmove', 'touchcancel'].forEach(ev =>
      row.addEventListener(ev, () => { if (timer) { clearTimeout(timer); timer = null; } }, { passive: true }));
  });

  function readOnlyNudge() {
    toast(platform.isIOS && !platform.standalone
      ? 'Install the app first — Share → Add to Home Screen'
      : (!store.isWriteReady()
        ? 'Almost ready — this phone needs a moment of signal first'
        : 'Set your name & initials in Settings first'));
  }

  async function addItemFlow(room) {
    if (!w) { readOnlyNudge(); return; }
    if (!(await sheets.requireAdmin())) return;
    const sh = sheets.sheet(`
      <form class="note-form">
        <input type="text" name="code" placeholder="Code (e.g. GR-700)" maxlength="20" autocomplete="off"
               style="text-transform:uppercase" required>
        <input type="text" name="label" placeholder="Item name (e.g. Luggage Rack)" maxlength="80" autocomplete="off" required>
        <button class="btn primary full" type="submit">Add to ${isSpaceDoc(room) ? esc(room.typeLabel || room.number) : 'Room ' + esc(room.number)}</button>
      </form>`, { title: '+ Add item' });
    sh.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      store.addAdhocItem(room.number, e.target.code.value.trim().toUpperCase(), e.target.label.value.trim());
      sh.remove();
    });
  }
}

// ============================ S4 ADD ROOM ============================

export function renderRoomNew(el, floorN, editNumber = null) {
  if (!store.isAdmin()) {
    // Deep-linked here without the PIN: ask, then re-render or bounce.
    el.innerHTML = appBar({ title: 'Admin required', back: '#/floor/' + floorN }) +
      `<main class="content"><div class="empty">Adding or editing rooms needs the admin PIN.</div></main>`;
    sheets.pinSheet().then((ok) => {
      if (ok) renderRoomNew(el, floorN, editNumber);
      else location.hash = '#/floor/' + floorN;
    });
    return;
  }
  const templates = store.getTemplates();
  const editing = editNumber ? store.getRoom(editNumber) : null;
  // Deep-linked template settings for a SPACE doc: every option in the picker
  // is a guest-room package, so any Save would be wrong. Bounce to the space.
  if (editing && isSpaceDoc(editing)) {
    toast('Spaces have no room template — add items from the space screen.');
    location.hash = '#/room/' + editing.number;
    return;
  }
  el.innerHTML = appBar({ title: editing ? 'Room ' + editNumber + ' settings' : 'New room', back: editing ? '#/room/' + editNumber : '#/floor/' + floorN }) + `
  <main class="content">
    <form class="form card" id="room-form">
      <label>Room number
        <input type="tel" inputmode="numeric" name="number" required maxlength="6"
          value="${esc(editing ? editing.number : '')}" ${editing ? 'readonly' : ''} autocomplete="off">
      </label>
      <div class="field-hint" data-floor-hint>${esc('Level ' + floorN)}</div>
      <label>Room type
        <select name="type">
          <option value="">— no template (empty room) —</option>
          ${Object.entries(templates).map(([slug, t]) =>
            `<option value="${esc(slug)}" ${editing && editing.type === slug ? 'selected' : ''}>
              ${esc(t.name)} (${Object.keys(t.items || {}).length} items)</option>`).join('')}
        </select>
      </label>
      <div class="field-hint" data-tpl-hint></div>
      <button class="btn primary full" type="submit">${editing ? 'Save' : 'Create room'}</button>
    </form>
  </main>`;

  wireCommon(el);
  const form = el.querySelector('#room-form');
  const hint = el.querySelector('[data-tpl-hint]');
  const floorHint = el.querySelector('[data-floor-hint]');
  function updateHints() {
    const slug = form.type.value;
    hint.textContent = slug && templates[slug]
      ? `Will pre-load ${Object.keys(templates[slug].items).length} items from “${templates[slug].name}”.` : '';
    const n = form.number.value.trim();
    if (n.length >= 3) floorHint.textContent = 'Level ' + n[0];
    if (n && !editing && store.getRoom(n)) floorHint.textContent = `⚠ Room ${n} already exists — open it instead of re-creating.`;
  }
  form.type.addEventListener('change', updateHints);
  form.number.addEventListener('input', updateHints);
  updateHints();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const number = form.number.value.trim();
    if (!number) return;
    if (!editing && store.getRoom(number)) {
      if (!(await sheets.confirmDialog(`Room ${number} already exists. Merge the template into it?`))) return;
    }
    const fl = number.length >= 3 ? Number(number[0]) : Number(floorN);
    // fire-and-forget: latency compensation creates the room locally at once;
    // awaiting server ack would hang this button in a dead zone.
    store.createRoom({ number, floor: fl, typeSlug: form.type.value })
      .catch(e => toast('Could not save: ' + e.message));
    toast((editing ? 'Saved' : 'Created') + ' room ' + number);
    location.hash = '#/room/' + number;
  });
}

// ============================ S7 SETTINGS ============================

export function renderSettings(el) {
  const u = store.getUser() || { name: '', initials: '' };
  el.innerHTML = appBar({ title: 'Settings', back: '#/' }) + `
  <main class="content">
    <section class="card form">
      <h2>You</h2>
      <label>Full name<input type="text" name="name" id="set-name" value="${esc(u.name)}" maxlength="40" autocomplete="name"></label>
      <label>Initials<input type="text" name="initials" id="set-initials" value="${esc(u.initials)}" maxlength="3"
        style="text-transform:uppercase" autocomplete="off"></label>
      <div class="preview-line">
        <span class="box demo-box"><span class="ink" id="ink-preview">${esc(u.initials || 'AB')}</span></span>
        This is how your check mark will look
      </div>
      <button class="btn primary" id="save-user">Save</button>
    </section>
    <section class="card form">
      <h2>Appearance</h2>
      <div class="seg theme-seg">
        <button class="seg-btn ${getTheme() === 'light' ? 'on' : ''}" data-theme-set="light">☀ Light</button>
        <button class="seg-btn ${getTheme() === 'dark' ? 'on' : ''}" data-theme-set="dark">🌙 Dark</button>
      </div>
      <div class="field-hint">Saved on this phone only.</div>
    </section>
    <section class="card form">
      <h2>Admin</h2>
      ${store.isAdmin()
        ? `<div class="admin-on">Admin mode on</div><button class="btn ghost" id="lock-admin">Lock</button>`
        : `<button class="btn ghost" id="unlock-admin">Enter admin PIN…</button>`}
      <div class="field-hint">Admin can add floors/rooms/items and delete things.</div>
    </section>
    <section class="card form">
      <h2>Sync &amp; storage</h2>
      <div class="field-hint">
        ${store.getMode() === 'demo'
          ? 'Demo mode — data lives on this phone only until Firebase is connected.'
          : (store.isOnline()
              ? (store.pendingCount() ? `Online — syncing ${store.pendingCount()} change(s)…` : 'Online — all changes synced.')
              : `Offline — ${store.pendingCount() || 'no'} change(s) queued on this phone.`)}
      </div>
      <a class="btn ghost" href="./dashboard.html" target="_blank" rel="noopener">Open live dashboard ↗</a>
      <button class="btn ghost" id="show-install">Install instructions</button>
      <div class="field-hint">Version ${esc(APP_VERSION)} · <a href="#" id="check-update">check for update</a></div>
    </section>
  </main>`;

  wireCommon(el);
  el.querySelectorAll('[data-theme-set]').forEach(b => b.addEventListener('click', () => {
    setTheme(b.dataset.themeSet);
    el.querySelectorAll('[data-theme-set]').forEach(x =>
      x.classList.toggle('on', x.dataset.themeSet === getTheme()));
  }));
  const nameI = el.querySelector('#set-name'), initI = el.querySelector('#set-initials');
  initI.addEventListener('input', () => {
    el.querySelector('#ink-preview').textContent = initI.value.toUpperCase() || 'AB';
  });
  el.querySelector('#save-user').addEventListener('click', () => {
    if (!initI.value.trim()) { toast('Initials are required'); return; }
    store.setUser(nameI.value, initI.value);
    toast('Saved');
  });
  const unlock = el.querySelector('#unlock-admin');
  if (unlock) unlock.addEventListener('click', async () => { await sheets.pinSheet(); renderSettings(el); });
  const lock = el.querySelector('#lock-admin');
  if (lock) lock.addEventListener('click', () => { store.lockAdmin(); renderSettings(el); });
  el.querySelector('#show-install').addEventListener('click', () => { location.hash = '#/install'; });
  el.querySelector('#check-update').addEventListener('click', async (e) => {
    e.preventDefault();
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) { await reg.update(); toast('Checked — you have the newest version unless a banner appears.'); }
    else toast('Not installed as an app yet.');
  });
}

// ============================ S8 ONBOARDING / INSTALL ============================

export function renderWelcome(el, { installOnly = false } = {}) {
  const needsInstallGate = platform.isIOS && !platform.standalone;
  const androidPrompt = window.__installPrompt;
  const u = store.getUser();

  el.innerHTML = `
  <main class="content welcome">
    <img class="welcome-logo" src="./img/logo-full-light.png" alt="TRIŪN Construction | Engineering">
    <h1 class="welcome-title">H2SEP Room Checklists</h1>
    <p class="welcome-sub">Home2 Suites · Eagle Pass TX</p>

    ${needsInstallGate || installOnly ? `
    <section class="card form">
      <h2>${needsInstallGate ? 'Step 1 — Install the app' : 'Install the app'}</h2>
      ${platform.inAppBrowser ? `
        <p class="warn-line">You're inside another app's browser. Open this page in <b>Safari</b> first:</p>
        <button class="btn primary full" id="copy-link">Copy link</button>` : ''}
      ${platform.isIOS ? `
        <ol class="install-steps">
          <li>Tap the <b>Share</b> button <span class="ios-glyph">⎋</span> at the bottom of Safari</li>
          <li>Scroll down — tap <b>“Add to Home Screen”</b></li>
          <li>Tap <b>Add</b>, then open the app from its new icon</li>
        </ol>
        <p class="field-hint">Must be done in Safari. Installing protects your offline check-offs — that's why it's required on iPhone.</p>` : `
        ${androidPrompt ? `<button class="btn primary full" id="android-install">Install app</button>` : `
        <ol class="install-steps">
          <li>Tap the browser menu (⋮)</li>
          <li>Tap <b>“Add to Home screen”</b> / <b>“Install app”</b></li>
        </ol>`}`}
      ${needsInstallGate ? `<a class="skip-link" href="#/" id="view-only">Skip for now — view only</a>` : ''}
    </section>` : ''}

    ${!needsInstallGate && !installOnly ? `
    <section class="card form">
      <h2>Who are you?</h2>
      <label>Full name<input type="text" id="wb-name" maxlength="40" autocomplete="name" value="${esc(u ? u.name : '')}"></label>
      <label>Initials (goes in the check box)<input type="text" id="wb-initials" maxlength="3"
        style="text-transform:uppercase" autocomplete="off" value="${esc(u ? u.initials : '')}"></label>
      <div class="preview-line"><span class="box demo-box"><span class="ink" id="wb-preview">${esc(u && u.initials || 'AB')}</span></span>
        Your check mark</div>
      <button class="btn primary full" id="wb-go">Start</button>
    </section>
    <section class="card how">
      <div>👆 <b>Tap the box</b> — your initials go in, just like the paper.</div>
      <div>⚑ <b>Long-press or tap the flag</b> to mark a problem (NEED INSTALL, IN BOX…).</div>
      <div>📶 <b>No signal? Keep working.</b> Everything syncs when you're back in coverage.</div>
    </section>` : ''}
    ${installOnly ? `<a class="skip-link" href="#/">‹ Back</a>` : ''}
  </main>`;

  const nameI = el.querySelector('#wb-name'), initI = el.querySelector('#wb-initials');
  if (initI) {
    nameI.addEventListener('input', () => {
      const parts = nameI.value.trim().split(/\s+/).filter(Boolean);
      if (!initI.dataset.touched) {
        initI.value = parts.map(p => p[0]).join('').toUpperCase().slice(0, 3);
        el.querySelector('#wb-preview').textContent = initI.value || 'AB';
      }
    });
    initI.addEventListener('input', () => {
      initI.dataset.touched = '1';
      el.querySelector('#wb-preview').textContent = initI.value.toUpperCase() || 'AB';
    });
    el.querySelector('#wb-go').addEventListener('click', () => {
      if (!initI.value.trim()) { toast('Initials are required to check items'); initI.focus(); return; }
      store.setUser(nameI.value, initI.value);
      location.hash = '#/';
    });
  }
  const vo = el.querySelector('#view-only');
  if (vo) vo.addEventListener('click', () => sessionStorage.setItem('h2sep-viewonly', '1'));
  const ai = el.querySelector('#android-install');
  if (ai) ai.addEventListener('click', async () => {
    androidPrompt.prompt();
    await androidPrompt.userChoice;
    window.__installPrompt = null;
    location.hash = '#/';
  });
  const cp = el.querySelector('#copy-link');
  if (cp) cp.addEventListener('click', () => {
    navigator.clipboard?.writeText(location.href.split('#')[0]);
    toast('Link copied — paste it in Safari');
  });
}
