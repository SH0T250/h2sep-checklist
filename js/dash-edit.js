// Dashboard editing layer — the app's editing parity, plus bulk.
//
// The crew app is the tool for standing IN a room. The dashboard is where you
// see the whole building at once — so this layer gives it two things:
//   1. The app's own single-item flows, verbatim: tap a line to initial &
//      complete, the issue sheet with the paper vocabulary, resolve & check,
//      un-check with confirm-if-not-mine + Undo. Same store, same invariants.
//   2. Bulk: "divider hardware is MISSING in forty rooms — one delivery just
//      arrived, check them all off." Scope → preview → PIN → apply → undo.
//
// Single-item edits need only a name + initials (exactly like the app).
// Bulk applies are PIN-gated, previewed with honest skip reasons, audited,
// and reversible — the undo stack holds the exact before-state.

import * as store from './store.js';
import * as bulk from './bulk.js';
import { esc, toast, vibrate, isSpaceDoc, isMepDoc, CATEGORY_ORDER, fmtWhen } from './util.js';
import { refsFor } from './refs.js';

let editMode = false;
let rerender = () => {};
let invSearch = '';
let invCaret = [0, 0];
let invCat = null;
// Undo entries live in memory only: the `before` snapshots hold live Firestore
// Timestamp objects that do not survive JSON. The audit log is the durable
// record; this stack is the "oh no, wrong scope" instant reverse.
const undoStack = [];   // { id, label, inverse, at }
let bulkSeq = 0;

export function isEdit() { return editMode; }

export function initEdit({ refresh }) {
  rerender = refresh;
  const btn = document.getElementById('edit-toggle');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    if (editMode) { setEditMode(false); return; }
    if (!store.getUser()) {
      const ok = await identitySheet();
      if (!ok) return;
    }
    setEditMode(true);
  });
  const bulkBtn = document.getElementById('bulk-open');
  if (bulkBtn) bulkBtn.addEventListener('click', () => openBulkDrawer());
  // Someone else un-checking an item I can see deserves a heads-up here just
  // like it gets one in the app.
  store.onRemoteSurprise(({ room, kind, before }) => {
    if (kind === 'unchecked') {
      toast(`Heads up: ${before.initials || 'a'} check in ${room} was removed from another device`);
    }
  });
  reflect();
}

function setEditMode(on) {
  editMode = on;
  reflect();
  rerender();
}

function reflect() {
  const btn = document.getElementById('edit-toggle');
  const bulkBtn = document.getElementById('bulk-open');
  const u = store.getUser();
  if (btn) {
    btn.classList.toggle('on', editMode);
    btn.innerHTML = editMode
      ? `✎ EDITING${u ? ` <span class="et-ini">${esc(u.initials)}</span>` : ''}`
      : '✎ EDIT';
    btn.setAttribute('aria-pressed', String(editMode));
  }
  if (bulkBtn) bulkBtn.hidden = !editMode;
  document.body.classList.toggle('edit-mode', editMode);
}

// THE editing surface's population. MEP punch docs live in the same rooms
// collection as guest rooms and common areas, told apart only by their
// `mep-punch` type slug — so without this filter the bulk engine would class
// them as guest rooms and a scope of "Guest rooms · un-check" would silently
// reach into the mechanical punch lists, which this dashboard's editing surface
// was never designed to touch. The app owns those lists; the board reports
// their totals (dash.js compute()) but does not edit them.
function editableDocs() {
  return store.getAllDocs().filter(r => !isMepDoc(r));
}

function canWrite() {
  return !!store.getUser() && store.isWriteReady();
}

function writeNudge() {
  toast(store.isWriteReady()
    ? 'Set your name & initials first (tap ✎ EDIT)'
    : 'Connecting… needs one moment of signal before check-offs count');
}

// Stable identity of everything a plan would touch, so two plans computed a
// human pause apart can be compared for MEMBERSHIP rather than just count.
function changeSetKey(plan) {
  return (plan.changes || [])
    .map(c => c.room + '\u0000' + c.itemId)
    .sort()
    .join('\u0001');
}

// How much a bulk plan can be trusted to reflect the building, in two grades,
// because the two signals do not deserve equal confidence.
//
//   'offline'  navigator.onLine is false. Unambiguous, so destructive actions
//              are refused outright.
//   'cache'    the browser claims to be online but every floor listener is
//              serving cache — site wifi that filters Firebase, the exact
//              condition the RECONNECTING pill already shows. Real, but it can
//              also be momentarily true around normal write latency, so this
//              grade WARNS in the strongest terms rather than hard-blocking:
//              a false positive must never strand the operator with a refusal
//              they cannot get past.
//
// Apply and undo both read this one helper, so they cannot drift apart again.
function dataTrust() {
  if (store.getMode() !== 'live') return 'live';
  if (!store.isOnline()) return 'offline';
  if (store.isFromCache()) return 'cache';
  return 'live';
}

// ---------------------------------------------------------------- identity

// Same contract as the app's welcome screen: name → auto-derived initials the
// user can correct, stored via store.setUser (the shared h2sep-user key).
function identitySheet() {
  return new Promise((resolve) => {
    const s = sheet(`
      <form class="dform" autocomplete="off">
        <label class="dlabel" for="de-name">Your name</label>
        <input id="de-name" name="name" type="text" maxlength="40" placeholder="e.g. Austin Jones" required>
        <label class="dlabel" for="de-ini">Initials (go in the box, like paper)</label>
        <input id="de-ini" name="initials" type="text" maxlength="3" placeholder="AJ" required enterkeyhint="go" style="text-transform:uppercase">
        <button class="dbtn primary full" type="submit">Start editing</button>
      </form>`, { title: 'Who is checking?' , onClose: () => resolve(false) });
    const form = s.querySelector('form');
    const nameI = form.name, iniI = form.initials;
    const u = store.getUser();
    if (u) { nameI.value = u.name; iniI.value = u.initials; }
    let iniTouched = !!u;
    nameI.addEventListener('input', () => {
      if (iniTouched) return;
      iniI.value = nameI.value.trim().split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 3);
    });
    iniI.addEventListener('input', () => { iniTouched = true; });
    if (!window.matchMedia('(pointer: coarse)').matches) nameI.focus();
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = nameI.value.trim(), ini = iniI.value.trim().toUpperCase();
      if (!name || !ini) return;
      store.setUser(name, ini);
      resolve(true);
      s.closeSheet();
    });
  });
}

// ---------------------------------------------------------------- sheets

function closeSheets() {
  document.querySelectorAll('.dscrim').forEach(el => el.remove());
}

// stack:true layers this sheet OVER whatever is open (PIN over the bulk
// drawer, confirm over the PIN spot) instead of replacing it — the drawer
// must survive its own confirmation flow or Undo has no home to return to.
function sheet(html, { title = '', wide = false, onClose = null, stack = false } = {}) {
  if (!stack) closeSheets();
  const depth = document.querySelectorAll('.dscrim').length;
  const scrim = document.createElement('div');
  scrim.className = 'dscrim';
  if (depth) scrim.style.zIndex = String(40 + depth * 2);
  scrim.innerHTML = `
    <div class="dsheet ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" ${title ? `aria-label="${esc(title)}"` : ''}>
      ${title ? `<div class="dsheet-title">${esc(title)}<button class="dsheet-x" aria-label="Close">✕</button></div>` : ''}
      <div class="dsheet-body">${html}</div>
    </div>`;
  const prevFocus = document.activeElement;
  const setInert = () => {
    // The page behind an aria-modal layer must actually be inert, or keyboard
    // and SR users Tab straight through the "modal" into the dashboard.
    const any = document.querySelectorAll('.dscrim').length > 0;
    ['header', 'main', 'footer'].forEach(sel => {
      const el = document.querySelector(sel);
      if (el) { if (any) el.setAttribute('inert', ''); else el.removeAttribute('inert'); }
    });
  };
  const close = () => {
    scrim.remove();
    document.removeEventListener('keydown', onKey);
    setInert();
    if (prevFocus && prevFocus.isConnected && prevFocus.focus) prevFocus.focus();
    if (onClose) onClose();
  };
  // Escape closes the TOP sheet only — a stacked PIN pops back to the drawer.
  // Self-cleaning: a sheet torn down by closeSheets() (replaced, not closed)
  // detects it's no longer in the DOM and drops its own listener.
  const onKey = (e) => {
    if (!scrim.isConnected) { document.removeEventListener('keydown', onKey); setInert(); return; }
    const all = document.querySelectorAll('.dscrim');
    const isTop = all[all.length - 1] === scrim;
    if (!isTop) return;
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    // Focus trap: Tab cycles inside the top sheet only.
    if (e.key === 'Tab') {
      const focusables = [...scrim.querySelectorAll(
        'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])')]
        .filter(el => !el.disabled && el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && (document.activeElement === first || !scrim.contains(document.activeElement))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !scrim.contains(document.activeElement))) {
        e.preventDefault(); first.focus();
      }
    }
  };
  document.addEventListener('keydown', onKey);
  scrim.addEventListener('click', (e) => { if (e.target === scrim) close(); });
  const x = scrim.querySelector('.dsheet-x');
  if (x) x.addEventListener('click', close);
  document.body.appendChild(scrim);
  setInert();
  // Move focus INTO the dialog so keyboard users aren't left underneath an
  // aria-modal layer. On touch devices focusing an input would POP THE
  // KEYBOARD over half the screen — focus the dialog shell there instead.
  requestAnimationFrame(() => {
    scrim.classList.add('open');
    if (scrim.contains(document.activeElement)) return;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const dlg = scrim.querySelector('.dsheet');
    const target = coarse
      ? (dlg.setAttribute('tabindex', '-1'), dlg)
      : scrim.querySelector('input, button:not(.dsheet-x), [tabindex]') || scrim.querySelector('.dsheet-x');
    if (target) target.focus();
  });
  scrim.closeSheet = close;
  return scrim;
}

function confirmDialog(msg, { danger = false, okLabel = 'OK', stack = false, title = 'Confirm' } = {}) {
  return new Promise((resolve) => {
    const s = sheet(`
      <p class="dconfirm">${esc(msg)}</p>
      <div class="dbtn-row">
        <button class="dbtn ghost" data-act="cancel">Cancel</button>
        <button class="dbtn ${danger ? 'danger' : 'primary'}" data-act="ok">${esc(okLabel)}</button>
      </div>`, { onClose: () => resolve(false), stack, title });
    s.querySelector('[data-act=ok]').addEventListener('click', () => { resolve(true); s.closeSheet(); });
    s.querySelector('[data-act=cancel]').addEventListener('click', () => { resolve(false); s.closeSheet(); });
  });
}

function pinSheet() {
  return new Promise((resolve) => {
    const s = sheet(`
      <form class="dform">
        <input type="tel" inputmode="numeric" pattern="[0-9]*" name="pin" maxlength="6"
               aria-label="Admin PIN" placeholder="Admin PIN" autocomplete="off" class="dpin">
        <div class="dpin-err" hidden>Wrong PIN</div>
        <button class="dbtn primary full" type="submit">Unlock</button>
      </form>`, { title: 'Admin PIN — bulk edits change many rooms at once', onClose: () => resolve(false), stack: true });
    const form = s.querySelector('form');
    if (!window.matchMedia('(pointer: coarse)').matches) form.pin.focus();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      // Before the config snapshot lands the store can't verify ANY pin —
      // saying "wrong PIN" to a correct PIN would be a lie.
      if (!store.canVerifyPin()) {
        const err = s.querySelector('.dpin-err');
        err.textContent = 'Still connecting — try again in a few seconds';
        err.hidden = false;
        return;
      }
      const ok = await store.verifyPin(form.pin.value.trim());
      if (ok) { resolve(true); s.closeSheet(); }
      else {
        const err = s.querySelector('.dpin-err');
        err.textContent = 'Wrong PIN';
        err.hidden = false;
        form.pin.select();
      }
    });
  });
}

async function requireAdmin() {
  if (store.isAdmin()) return true;
  return pinSheet();
}

// ------------------------------------------------------- single item flows
// These call the SAME store functions the app calls — checkItem, uncheckItem,
// setIssue, resolveIssue — so every invariant (atomic field groups, initials
// stamping, remote-surprise suppression) is inherited, not re-implemented.

function itemTitle(it) { return (it.code ? it.code + ' · ' : '') + it.label; }

function provLine(it) {
  const bits = [];
  if (it.category) bits.push(esc(it.category));
  if (it.src) bits.push('sheet ' + esc(it.src));
  if (it.derived) bits.push('from room-type package');
  return bits.length ? `<div class="dprov">${bits.join(' · ')}</div>` : '';
}

function whereLabel(room) {
  return isSpaceDoc(room) ? `${room.typeLabel || 'Space'} ${room.number}` : 'Rm ' + room.number;
}

// References (submittals + plan snippets), same join the app uses (refs.js).
// Snippets render inline in a stacked viewer; submittals open in Drive.
function refsSection(room, item, itemId) {
  const refs = refsFor(room.number, item, itemId, room.typeLabel || '');
  if (!refs.length) return '';
  return `<div class="dref-head">References</div>` + refs.map((r, i) => `
    <button class="dref" data-refi="${i}">
      <span aria-hidden="true">${r.kind === 'plan' ? '📐' : '📄'}</span>
      <span class="dref-main">${esc(r.title)}<em>${r.kind === 'plan' ? 'Plan detail' : 'Submittal'}${r.sheetId ? ' · sheet ' + esc(r.sheetId) : ''}</em></span>
      <span aria-hidden="true">›</span>
    </button>`).join('');
}

// One opener for every reference on the board — item sheets and the inventory
// attachments list alike: snippet images stack a viewer, submittals open Drive.
function openRef(r) {
  if (!r) return;
  if (r.kind === 'plan' && r.snippet) {
    const v = sheet(`<img class="dref-img" src="./refs/${esc(String(r.snippet).replace(/^(\.\/)?(refs\/)?/, ''))}"
      alt="${esc(r.title + (r.sheetId ? ' — sheet ' + r.sheetId : ''))}">`,
      { title: r.title + (r.sheetId ? ' · ' + r.sheetId : ''), stack: true, wide: true });
    v.querySelector('.dref-img').addEventListener('error', () => {
      v.querySelector('.dsheet-body').innerHTML = `<div class="dempty">Snippet image not available on this device yet.</div>`;
    });
  } else if (r.driveId) {
    window.open('https://drive.google.com/file/d/' + encodeURIComponent(r.driveId) + '/view', '_blank', 'noopener');
  } else {
    toast(r.title);
  }
}

function wireRefs(s, room, item, itemId) {
  const refs = refsFor(room.number, item, itemId, room.typeLabel || '');
  s.querySelectorAll('[data-refi]').forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation();
    openRef(refs[Number(b.dataset.refi)]);
  }));
}

// The crew app owns the MEP punch lists. This board reports their totals but
// must never write them: store.getRoom() resolves by id with no type filter, so
// every EXPORTED entry point that takes a room number guards here — otherwise a
// caller passing "105-MEP" gets a sheet that calls it "Rm 105-MEP" and can
// un-check finished mechanical work with no PIN in the way.
function refuseMep(room) {
  if (!room || !isMepDoc(room)) return false;
  toast('MEP punch lists are edited in the app, not on the dashboard.');
  return true;
}

export function openItemSheet(roomNumber, itemId, opts = {}) {
  const room = store.getRoom(roomNumber);
  if (refuseMep(room)) return;
  const it = room && room.items && room.items[itemId];
  if (!it) { toast('Item not found (removed?)'); return; }
  if (it.checked) return checkedSheet(room, itemId, opts);
  if (it.issue && !it.issueResolved) return issueOpenSheet(room, itemId, opts);
  // unchecked + clean: check it (with confirm-free tap parity there'd be no
  // sheet at all — but on the dashboard a click could be a mis-click on a
  // wall-size screen, so show the small act sheet instead)
  const s = sheet(`
    ${provLine(it)}
    <button class="dbtn primary full" data-act="check">✓ Check off — initials go in</button>
    <button class="dbtn ghost full" data-act="flag">⚑ Flag a problem…</button>
    ${refsSection(room, it, itemId)}
  `, { title: itemTitle(it) + ' — ' + whereLabel(room), stack: opts.stack });
  wireRefs(s, room, it, itemId);
  s.querySelector('[data-act=check]').addEventListener('click', () => {
    if (!canWrite()) { writeNudge(); return; }
    s.closeSheet();
    store.checkItem(room.number, itemId).catch(e => toast('Could not save: ' + e.message));
    vibrate();
    toast(`Checked ${it.code || it.label.slice(0, 40)} · ${whereLabel(room)}`, {
      action: 'Undo', onAction: () => store.uncheckItem(room.number, itemId).catch(() => {}),
    });
  });
  s.querySelector('[data-act=flag]').addEventListener('click', () => { s.closeSheet(); issueEditSheet(room, itemId, opts); });
}

function checkedSheet(room, itemId, opts = {}) {
  const it = room.items[itemId];
  const me = store.getUser();
  const mine = me && it.initials === me.initials;
  const who = it.checkedByName || it.initials
    ? `Checked by ${esc(it.checkedByName || it.initials)}${it.initials ? ` (${esc(it.initials)})` : ''}`
    : 'Checked (from paper sheet)';
  const whenLocal = fmtWhen(it.checkedAtLocal);
  const whenSync = fmtWhen(it.checkedAt);
  const whenLine = whenLocal
    ? `checked ${whenLocal}${whenSync && whenSync !== whenLocal ? ` · synced ${whenSync}` : ''}` : '';
  const s = sheet(`
    <div class="dwho">${who}${whenLine ? `<br><span class="dprov">${esc(whenLine)}</span>` : ''}</div>
    ${provLine(it)}
    <button class="dbtn ghost full" data-act="uncheck">Un-check</button>
    <button class="dbtn ghost full" data-act="flag">⚑ Flag a problem…</button>
    ${refsSection(room, it, itemId)}
  `, { title: itemTitle(it) + ' — ' + whereLabel(room), stack: opts.stack });
  wireRefs(s, room, it, itemId);
  s.querySelector('[data-act=uncheck]').addEventListener('click', async () => {
    if (!canWrite()) { writeNudge(); return; }
    s.closeSheet();
    if (!mine) {
      const ok = await confirmDialog(`Remove ${it.initials || 'this'} check?`, { danger: true, okLabel: 'Un-check', stack: opts.stack });
      if (!ok) return;
    }
    store.uncheckItem(room.number, itemId).catch(() => {});
    toast('Un-checked', { action: 'Undo', onAction: () => store.checkItem(room.number, itemId).catch(() => {}) });
  });
  s.querySelector('[data-act=flag]').addEventListener('click', () => { s.closeSheet(); issueEditSheet(room, itemId, opts); });
}

function issueOpenSheet(room, itemId, opts = {}) {
  const it = room.items[itemId];
  const s = sheet(`
    <div class="dissue">— ${esc(it.issue)}</div>
    ${provLine(it)}
    <button class="dbtn primary full" data-act="rc">Resolve &amp; check ✓</button>
    <button class="dbtn ghost full" data-act="r">Resolve only</button>
    <button class="dbtn ghost full" data-act="e">Edit note…</button>
    <button class="dbtn ghost full" data-act="c">Clear flag (mistake)</button>
    ${refsSection(room, it, itemId)}
  `, { title: itemTitle(it) + ' — ' + whereLabel(room), stack: opts.stack });
  wireRefs(s, room, it, itemId);
  const guard = (fn) => () => { if (!canWrite()) { writeNudge(); return; } s.closeSheet(); fn(); };
  s.querySelector('[data-act=rc]').addEventListener('click', guard(() => {
    store.resolveIssue(room.number, itemId, { check: true }).catch(e => toast('Could not save: ' + e.message));
    vibrate();
  }));
  s.querySelector('[data-act=r]').addEventListener('click', guard(() =>
    store.resolveIssue(room.number, itemId).catch(e => toast('Could not save: ' + e.message))));
  s.querySelector('[data-act=e]').addEventListener('click', () => { s.closeSheet(); issueEditSheet(room, itemId, opts); });
  s.querySelector('[data-act=c]').addEventListener('click', guard(() =>
    store.resolveIssue(room.number, itemId, { clear: true }).catch(e => toast('Could not save: ' + e.message))));
}

function issueEditSheet(room, itemId, opts = {}) {
  const it = room.items[itemId];
  const cur = it.issue && !it.issueResolved ? it.issue : '';
  const s = sheet(`
    <div class="dchips">
      ${bulk.CANONICAL_ISSUES.map(q => `<button class="dchip ${q === cur ? 'on' : ''}" aria-pressed="${q === cur}" data-note="${esc(q)}">${esc(q)}</button>`).join('')}
      <button class="dchip alt" data-custom>CUSTOM…</button>
    </div>
    <form class="dform dcustom" hidden>
      <input type="text" name="note" aria-label="Describe the problem" placeholder="Type the problem…" maxlength="120" autocomplete="off">
      <button class="dbtn primary full" type="submit">Save</button>
    </form>
    ${it.issue ? `<button class="dbtn ghost full" data-clear>Clear current flag (“${esc(it.issue)}”)</button>` : ''}
    ${provLine(it)}
    ${refsSection(room, it, itemId)}
  `, { title: itemTitle(it) + ' — flag issue', stack: opts.stack });
  wireRefs(s, room, it, itemId);
  const write = (note) => {
    if (!canWrite()) { writeNudge(); return; }
    store.setIssue(room.number, itemId, note).catch(e => toast('Could not save: ' + e.message));
    vibrate(); s.closeSheet();
  };
  s.querySelectorAll('.dchip[data-note]').forEach(b => b.addEventListener('click', () => write(b.dataset.note)));
  const form = s.querySelector('.dcustom');
  s.querySelector('[data-custom]').addEventListener('click', () => { form.hidden = false; form.note.focus(); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = form.note.value.trim().toUpperCase();
    if (v) write(v);
  });
  const clr = s.querySelector('[data-clear]');
  if (clr) clr.addEventListener('click', () => {
    if (!canWrite()) { writeNudge(); return; }
    store.resolveIssue(room.number, itemId, { clear: true }).catch(() => {});
    s.closeSheet();
  });
}

// ------------------------------------------------------------ room browser

export function openFloorSheet(floorKey, floorLabel) {
  const isCommon = floorKey === 'common';
  const list = isCommon ? store.getSpaces() : store.getRooms(floorKey);
  const cards = list.map(r => {
    const items = Object.values(r.items || {}).filter(i => !i.deleted);
    const done = items.filter(i => i.checked).length;
    const iss = items.filter(i => i.issue && !i.issueResolved).length;
    const pct = items.length ? Math.round(done / items.length * 100) : 0;
    return `
      <button class="droom ${done === items.length && items.length ? 'done' : ''}" data-room="${esc(r.number)}">
        <span class="droom-num">${esc(isCommon ? (r.typeLabel || 'Space') + ' ' + r.number : r.number)}</span>
        <span class="droom-bar"><span style="width:${pct}%"></span></span>
        <span class="droom-sub">${done}/${items.length}${iss ? ` · <em>⚠ ${iss}</em>` : ''}</span>
      </button>`;
  }).join('');
  const s = sheet(
    `<div class="droom-grid">${cards || '<div class="dempty">Nothing here yet.</div>'}</div>`,
    { title: (floorLabel || (isCommon ? 'Common Areas' : 'Level ' + floorKey)) + ' — pick a room', wide: true });
  s.querySelectorAll('[data-room]').forEach(b =>
    b.addEventListener('click', () => openRoomSheet(b.dataset.room)));
}

export function openRoomSheet(roomNumber) {
  if (!store.getRoom(roomNumber)) { toast('Room not loaded yet'); return; }
  if (refuseMep(store.getRoom(roomNumber))) return;
  let scrim = null;
  const paint = () => {
    const room = store.getRoom(roomNumber);
    if (!room) return;
    const items = Object.entries(room.items || {})
      .filter(([, it]) => !it.deleted)
      .sort((a, b) => (a[1].sort || 0) - (b[1].sort || 0));
  const byCat = new Map();
  for (const row of items) {
    const cat = row[1].category || '';
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push(row);
  }
  const known = [...byCat.keys()].filter(c => c && CATEGORY_ORDER.includes(c))
    .sort((a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b));
  const unknown = [...byCat.keys()].filter(c => c && !CATEGORY_ORDER.includes(c)).sort();
  const order = [...known, ...unknown, ...(byCat.has('') ? [''] : [])];

  const codeCount = {}, codeSeen = {};
  items.forEach(([, it]) => { if (it.code) codeCount[it.code] = (codeCount[it.code] || 0) + 1; });
  const rowHTML = ([id, it]) => {
    const open = it.issue && !it.issueResolved;
    if (it.code) codeSeen[it.code] = (codeSeen[it.code] || 0) + 1;
    const ordinal = it.code && codeCount[it.code] > 1 ? `${codeSeen[it.code]} of ${codeCount[it.code]}` : '';
    const flagged = it.reliability === 'FLAGGED';
    return `
      <div class="drow ${it.checked ? 'checked' : ''} ${open ? 'issue' : ''}" data-item="${esc(id)}"
           role="checkbox" tabindex="0" aria-checked="${!!it.checked}"
           aria-label="${esc((it.code ? it.code + ' ' : '') + it.label + (it.checked ? ', checked by ' + (it.initials || 'unknown') : (open ? ', open issue: ' + it.issue : '')))}">
        <span class="dbox" aria-hidden="true">
          ${it.checked ? `<span class="dink">${esc(it.initials || '✓')}</span>` : ''}
          ${open ? `<span class="dbox-flag">⚑</span>` : ''}
        </span>
        <span class="drow-main">
          ${it.code ? `<b>${esc(it.code)}</b> ` : ''}${Number(it.qty) > 1 ? `<span class="dqty">×${Number(it.qty)}</span> ` : ''}${esc(it.label)}${ordinal ? ` <span class="dordinal">${esc(ordinal)}</span>` : ''}
          ${flagged ? `<span class="dverify">⚠ VERIFY — sources disagree</span>` : ''}
          ${open ? `<span class="drow-note">— ${esc(String(it.issue).toUpperCase())}</span>` : ''}
        </span>
        <button class="dflag ${open ? 'on' : ''}" data-flag="${esc(id)}" aria-label="Flag issue on ${esc(it.code || it.label)}">⚑</button>
      </div>`;
  };
  const body = order.map(cat => {
    const rows = byCat.get(cat);
    const done = rows.filter(([, it]) => it.checked).length;
    return `
      <div class="dcat">
        <div class="dcat-head">${esc((cat || 'OTHER').toUpperCase())} · ${done}/${rows.length}</div>
        ${rows.map(rowHTML).join('')}
      </div>`;
  }).join('');

  const done = items.filter(([, it]) => it.checked).length;
    const notes = Object.entries(room.notes || {});
    const openNotes = notes.filter(([, n]) => !n.resolved);
    const isSpace = isSpaceDoc(room);
    const siblings = (isSpace ? store.getSpaces() : store.getRooms(room.floor)).map(r => r.number);
    const idx = siblings.indexOf(room.number);
    const prev = idx > 0 ? siblings[idx - 1] : null;
    const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
    const html =
      `${openNotes.map(([nid, n]) => `
        <button class="dnote ${n.flag === 'issue' ? 'red' : ''}" data-note="${esc(nid)}">
          <span aria-hidden="true">★</span> ${esc(n.flag === 'issue' ? n.text.toUpperCase() : n.text)}
        </button>`).join('')}
       <div class="droom-list">${body || '<div class="dempty">No checklist lines (by design for elevators).</div>'}</div>
       <div class="dhint">👆 Tap a line to initial &amp; complete · ⚑ flags a problem — same as the app.</div>
       <div class="dbtn-row droom-nav">
         ${prev ? `<button class="dbtn ghost small" data-nav="${esc(prev)}">‹ ${esc(prev)}</button>` : '<span></span>'}
         <button class="dbtn ghost small" data-backfloor>${isSpace ? 'All common areas' : 'Level ' + esc(String(room.floor)) + ' rooms'}</button>
         ${next ? `<button class="dbtn ghost small" data-nav="${esc(next)}">${esc(next)} ›</button>` : '<span></span>'}
       </div>
       <span class="vh" aria-live="polite" data-roomlive></span>`;
    const title = `${whereLabel(room)} — ${done}/${items.length} checked`;
    const titleEl = scrim && scrim.querySelector('.dsheet-title');
    if (scrim && scrim.isConnected && titleEl) {
      // live refresh in place — keep the crew's scroll position
      const bodyEl = scrim.querySelector('.dsheet-body');
      const keep = bodyEl.scrollTop;
      bodyEl.innerHTML = html;
      bodyEl.scrollTop = keep;
      titleEl.firstChild.textContent = title;
      scrim.querySelector('.dsheet').setAttribute('aria-label', title);
      const lv = scrim.querySelector('[data-roomlive]');
      if (lv) lv.textContent = title;
    } else {
      scrim = sheet(html, { title, wide: true });
    }

    const activate = (r) => {
      const id = r.dataset.item;
      const fresh = store.getRoom(roomNumber);
      const it = fresh && fresh.items[id];
      if (!it) return;
      // Direct tap parity: unchecked+clean line checks instantly with initials.
      if (!it.checked && !(it.issue && !it.issueResolved)) {
        if (!canWrite()) { writeNudge(); return; }
        store.checkItem(roomNumber, id).catch(e => toast('Could not save: ' + e.message));
        vibrate();
        toast(`Checked ${it.code || it.label.slice(0, 30)}`, {
          action: 'Undo',
          onAction: () => store.uncheckItem(roomNumber, id).catch(() => {}),
        });
        return;
      }
      openItemSheet(roomNumber, id, { stack: true });
    };
    scrim.querySelectorAll('.drow').forEach(r => {
      r.addEventListener('click', () => activate(r));
      r.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(r); }
      });
    });
    // ⚑ opens the flag sheet WITHOUT checking the row — the app's own split.
    scrim.querySelectorAll('[data-flag]').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!canWrite()) { writeNudge(); return; }
      const fresh = store.getRoom(roomNumber);
      if (fresh && fresh.items[b.dataset.flag]) issueEditSheet(fresh, b.dataset.flag, { stack: true });
    }));
    // ★ room notes: tap to resolve / re-open, same two-tap as the app
    scrim.querySelectorAll('[data-note]').forEach(b => b.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!canWrite()) { writeNudge(); return; }
      const fresh = store.getRoom(roomNumber);
      const n = fresh && fresh.notes && fresh.notes[b.dataset.note];
      if (!n) return;
      const ok = await confirmDialog(n.text, { okLabel: n.resolved ? 'Re-open' : 'Mark resolved', stack: true, title: '★ Room note' });
      if (ok) store.setRoomNoteResolved(roomNumber, b.dataset.note, !n.resolved).catch(() => {});
    }));
    // prev / next / back-to-floor
    scrim.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => openRoomSheet(b.dataset.nav)));
    const backB = scrim.querySelector('[data-backfloor]');
    if (backB) backB.addEventListener('click', () => {
      const fresh = store.getRoom(roomNumber);
      if (isSpaceDoc(fresh)) openFloorSheet('common', 'Common Areas');
      else openFloorSheet(String(fresh.floor), 'Level ' + fresh.floor);
    });
  };
  paint();
  // Repaint on every store change while open (my own writes echo back through
  // notify, and a crew member's remote check shows up live). Unsubscribe once
  // the sheet is gone.
  const unsub = store.subscribe(() => {
    if (!scrim || !scrim.isConnected) { unsub(); return; }
    paint();
  });
}

// -------------------------------------------------------- inventory panel

// ---- inventory attachments (cut sheets / submittals / plan snippets) ----
// Aggregated per inventory row from the SAME per-(room, item) join the item
// sheets use. That per-room join matters: one code can be different products
// in different spaces (kitchen-equipment "01" is a reach-in freezer in Food
// Prep and a refrigeration rack in the walk-in), so a ref is only credited to
// the rooms whose own items carry it — and the list says where each document
// applies whenever it doesn't cover the whole row.
function buildRowRefs(docs) {
  const agg = new Map();  // inventoryKey -> Map(refKey -> { ref, rooms:Set })
  for (const room of docs) {
    if (!room || room.deleted) continue;
    for (const [itemId, item] of Object.entries(room.items || {})) {
      if (!item || item.deleted) continue;
      const key = bulk.inventoryKey(item);
      let m = agg.get(key);
      if (!m) { m = new Map(); agg.set(key, m); }
      for (const r of refsFor(room.number, item, itemId, room.typeLabel || '')) {
        const rk = r.kind + '|' + (r.driveId || r.snippet || '') + '|' + (r.sheetId || '') + '|' + r.title;
        let e = m.get(rk);
        if (!e) { e = { ref: r, rooms: new Set() }; m.set(rk, e); }
        e.rooms.add(room.number);
      }
    }
  }
  return agg;
}

// Untagged rows have no short code — their "label" is the full item sentence
// (e.g. a procedural paint note), which would otherwise balloon the dialog
// title into a multi-line paragraph. Codes are always short; only labels get
// clipped.
function titleClip(s, max = 60) {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
}

function attachmentsSheet(row, entries) {
  const list = [...entries.values()];
  const s = sheet(list.map((e, i) => {
    const where = e.rooms.size < row.rooms.size ? ' · ' + [...e.rooms].sort().join(', ') : '';
    return `
    <button class="dref" data-refi="${i}">
      <span aria-hidden="true">${e.ref.kind === 'plan' ? '📐' : '📄'}</span>
      <span class="dref-main">${esc(e.ref.title)}<em>${e.ref.kind === 'plan' ? 'Plan detail' : 'Submittal'}${e.ref.sheetId ? ' · sheet ' + esc(e.ref.sheetId) : ''}${esc(where)}</em></span>
      <span aria-hidden="true">›</span>
    </button>`;
  }).join(''), { title: titleClip(row.code || row.label) + ' — attachments' });
  s.querySelectorAll('[data-refi]').forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const en = list[Number(b.dataset.refi)];
    if (en) openRef(en.ref);
  }));
}

export function renderInventory(container, docs) {
  const inv = bulk.buildInventory(docs);
  const rowRefs = buildRowRefs(docs);
  const cats = [...new Set(inv.map(r => r.category || 'Other'))];
  const q = invSearch.trim().toLowerCase();
  const rows = inv.filter(r => {
    if (invCat && (r.category || 'Other') !== invCat) return false;
    if (q && !(r.code.toLowerCase().includes(q) || r.label.toLowerCase().includes(q))) return false;
    return true;
  });

  const hadFocus = document.activeElement && document.activeElement.id === 'inv-q';
  const prevScroll = container.querySelector('.inv-scroll')?.scrollTop || 0;

  container.innerHTML = `
    <div class="inv-tools">
      <input id="inv-q" type="search" aria-label="Find item by code or name" placeholder="Find item — code or name…" value="${esc(invSearch)}" autocomplete="off">
      <div class="inv-chips">
        <button class="dchip small ${invCat === null ? 'on' : ''}" aria-pressed="${invCat === null}" data-cat="">All</button>
        ${cats.map(c => `<button class="dchip small ${invCat === c ? 'on' : ''}" aria-pressed="${invCat === c}" data-cat="${esc(c)}">${esc(c.replace('FF&E - ', ''))}</button>`).join('')}
      </div>
    </div>
    <div class="inv-scroll">
      <table class="tbl inv-tbl">
        <thead><tr><th>Code</th><th>Item</th><th>Progress</th><th>Issues</th><th aria-label="Attachments">📎</th><th></th></tr></thead>
        <tbody>
          ${rows.map(r => `
          <tr data-key="${esc(r.key)}">
            <td class="code">${esc(r.code || '—')}</td>
            <td class="inv-lbl">${esc(r.label)}<span class="inv-sub">${esc(r.category || '')} · ${r.rooms.size} room${r.rooms.size === 1 ? '' : 's'}</span></td>
            <td class="inv-prog">
              <span class="bar inv-bar"><span class="bar-fill" style="width:${r.pct}%"></span></span>
              <span class="inv-nums">${r.checked}/${r.total}</span>
            </td>
            <td>${r.openIssues ? `<span class="ibadge">⚠ ${r.openIssues}</span>` : '<span class="inv-zero">—</span>'}</td>
            <td class="inv-att">${(n => n
              ? `<button class="dchip small att" data-att="${esc(r.key)}" aria-label="${n} attachment${n === 1 ? '' : 's'} for ${esc(r.code || r.label)}">📎 ${n}</button>`
              : '<span class="inv-zero">—</span>')((rowRefs.get(r.key) || { size: 0 }).size)}</td>
            <td class="inv-act"><button class="dbtn tiny" data-bulk="${esc(r.key)}" aria-label="Bulk edit ${esc(r.code || r.label)}">BULK EDIT</button></td>
          </tr>`).join('')}
          ${rows.length ? '' : '<tr><td colspan="6" class="empty-line">No items match.</td></tr>'}
        </tbody>
      </table>
    </div>`;

  const qEl = container.querySelector('#inv-q');
  qEl.addEventListener('input', () => {
    invSearch = qEl.value;
    invCaret = [qEl.selectionStart, qEl.selectionEnd];
    renderInventory(container, editableDocs());
  });
  if (hadFocus) {
    qEl.focus();
    // put the caret back where it was — forcing it to the end makes editing
    // the middle of a query impossible on a live-refreshing board
    try { qEl.setSelectionRange(invCaret[0], invCaret[1]); } catch (_) {}
  }
  container.querySelector('.inv-scroll').scrollTop = prevScroll;
  container.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => {
    invCat = b.dataset.cat || null;
    renderInventory(container, editableDocs());
  }));
  // Attachments are informative — they open in view mode, no edit gate.
  container.querySelectorAll('[data-att]').forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const row = inv.find(r => r.key === b.dataset.att);
    const entries = rowRefs.get(b.dataset.att);
    if (row && entries && entries.size) attachmentsSheet(row, entries);
  }));
  container.querySelectorAll('[data-bulk]').forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!isEdit()) { toast('Tap ✎ EDIT first'); return; }
    const row = inv.find(r => r.key === b.dataset.bulk);
    // A row with open issues suggests resolve+check — scope to those issues so
    // the preview count matches the ⚠ badge that invited the click.
    openBulkDrawer(row && row.openIssues
      ? { keys: [b.dataset.bulk], state: 'issue', suggest: row }
      : { keys: [b.dataset.bulk], suggest: row });
  }));
}

// ------------------------------------------------------------ bulk drawer

const DRAWER_ACTIONS = [
  ['resolveAndCheck', 'Resolve issue & check off ✓', 'the “it arrived, it’s in” one-tap for a whole product line'],
  ['check',           'Check off',                   'initials go in everywhere the scope matches'],
  ['setIssue',        'Flag a problem',              'stamp the same issue note on every match'],
  ['resolveIssue',    'Resolve issue only',          'issue closes, box stays empty'],
  ['renameIssue',     'Re-word issues',              'merge “NEEDS SHADE.” / “NEEDS SHADE” style variants'],
  ['clearIssue',      'Clear issue (mistake)',       'removes the flag text entirely'],
  ['uncheck',         'Un-check',                    'removes initials — use with care'],
];

export function openBulkDrawer(preset = {}) {
  const docs = editableDocs();
  let inv = bulk.buildInventory(docs);
  const scope = bulk.emptyScope();
  if (preset.keys) preset.keys.forEach(k => scope.keys.add(k));
  if (preset.state) scope.state = preset.state;
  if (preset.issueText) { scope.state = 'issue'; scope.issueText = preset.issueText; }
  // A drawer opened bare from the header must not sit ARMED at "every item in
  // the building" — the operator has to narrow something (or arrived from a
  // row/issue-type that already did) before Apply lights up.
  let armed = scope.keys.size > 0 || scope.state !== 'any' || !!preset.issueText;
  const arm = () => { armed = true; };
  let action = preset.action ||
    (preset.suggest && preset.suggest.openIssues ? 'resolveAndCheck' : 'check');
  let text = '';
  let renameFrom = new Set();

  const floorEntries = Object.entries(store.getFloors()).sort((a, b) => (a[1].sort || 0) - (b[1].sort || 0));

  const s = sheet(`
    <div class="bd">
      <div class="bd-col">
        <div class="bd-h">1 · WHICH ITEMS</div>
        <input id="bd-q" type="search" aria-label="Filter item codes" placeholder="Filter codes…" autocomplete="off">
        <div class="bd-codes" id="bd-codes"></div>
      </div>
      <div class="bd-col">
        <div class="bd-h">2 · WHERE &amp; WHAT STATE</div>
        <div class="bd-sub">Floors</div>
        <div class="dchips" id="bd-floors">
          <button class="dchip small on" data-floor="" aria-pressed="true">All</button>
          ${floorEntries.map(([n, f]) => `<button class="dchip small" data-floor="${esc(n)}" aria-pressed="false">${esc(f.label)}</button>`).join('')}
        </div>
        <div class="bd-sub">Count</div>
        <div class="dchips">
          <button class="dchip small on" id="bd-guest" aria-pressed="true">Guest rooms</button>
          <button class="dchip small on" id="bd-spaces" aria-pressed="true">Common areas</button>
        </div>
        <div class="bd-sub">Only items that are…</div>
        <div class="dchips" id="bd-state">
          <button class="dchip small on" data-state="any" aria-pressed="true">Any state</button>
          <button class="dchip small" data-state="unchecked" aria-pressed="false">Not checked</button>
          <button class="dchip small" data-state="issue" aria-pressed="false">Open issue</button>
          <button class="dchip small" data-state="checked" aria-pressed="false">Checked</button>
        </div>
        <div id="bd-isslist" class="bd-isslist" hidden></div>
      </div>
      <div class="bd-col">
        <div class="bd-h">3 · DO WHAT</div>
        <div class="bd-actions" id="bd-actions">
          ${DRAWER_ACTIONS.map(([k, l, hint]) => `
            <label class="bd-act"><input type="radio" name="bd-act" value="${k}" ${k === action ? 'checked' : ''}>
              <span><b>${esc(l)}</b><em>${esc(hint)}</em></span></label>`).join('')}
        </div>
        <div id="bd-text-wrap" hidden>
          <div class="bd-sub" id="bd-text-label">Issue text</div>
          <div class="dchips" id="bd-text-picks">
            ${bulk.CANONICAL_ISSUES.map(t => `<button class="dchip small" data-pick="${esc(t)}">${esc(t)}</button>`).join('')}
          </div>
          <input id="bd-text" type="text" maxlength="120" aria-label="Issue wording" placeholder="Type the problem…" autocomplete="off" style="text-transform:uppercase">
        </div>
        <div id="bd-rename-wrap" hidden>
          <div class="bd-sub">Which existing wordings to change</div>
          <div class="bd-isslist" id="bd-rename-list"></div>
        </div>
      </div>
    </div>
    <div class="bd-preview" id="bd-preview" aria-live="polite"></div>
    <div class="dbtn-row bd-foot">
      <div class="bd-undo" id="bd-undo"></div>
      <button class="dbtn ghost" data-act="cancel">Close</button>
      <button class="dbtn primary" id="bd-apply" disabled>Apply</button>
    </div>
  `, { title: 'Bulk edit — scope · preview · apply', wide: true });

  // MUST route through closeSheet, not s.remove(): close() is what clears the
  // `inert` attribute off header/main/footer. A bare remove() leaves the whole
  // dashboard swallowing clicks, and a touch-only wall board has no keydown to
  // trip the listener's self-heal — the page is dead until reload.
  s.querySelector('[data-act=cancel]').addEventListener('click', () => s.closeSheet());

  // ----- codes column
  let codeQ = '';
  const codesEl = s.querySelector('#bd-codes');
  const renderCodes = () => {
    const q = codeQ.toLowerCase();
    const list = inv.filter(r => !q || r.code.toLowerCase().includes(q) || r.label.toLowerCase().includes(q));
    const scrollTop = codesEl.scrollTop;   // a live repaint must not jump the list
    codesEl.innerHTML = `
      <label class="bd-code all"><input type="checkbox" id="bd-allcodes" ${scope.keys.size === 0 ? 'checked' : ''}>
        <span><b>Every item</b><em>${inv.length} codes</em></span></label>
      ${list.map(r => {
        const head = r.code || r.label;
        const sub = (r.code ? r.label : '') + (r.openIssues ? `${r.code ? ' · ' : ''}⚠${r.openIssues} open` : '');
        return `
      <label class="bd-code"><input type="checkbox" data-key="${esc(r.key)}" ${scope.keys.has(r.key) ? 'checked' : ''}>
        <span class="bd-code-txt"><b>${esc(head)}</b>${sub ? `<em>${esc(sub)}</em>` : ''}</span></label>`;
      }).join('')}`;
    codesEl.scrollTop = scrollTop;
    codesEl.querySelector('#bd-allcodes').addEventListener('change', (e) => {
      // Un-ticking "Every item" when nothing else is picked is a NO-OP — the box
      // re-checks itself below. Arming on it would let one stray tap on a phone
      // scroll silently put Apply live across the whole building, which is the
      // one thing the disarm interlock exists to prevent. Only a tick that
      // actually narrows (or clears an existing narrowing) counts as intent.
      const wasNarrowed = scope.keys.size > 0;
      if (e.target.checked) scope.keys.clear();
      if (wasNarrowed) arm();
      renderCodes(); renderIssueFilter(); refresh();
    });
    codesEl.querySelectorAll('[data-key]').forEach(cb => cb.addEventListener('change', () => {
      if (cb.checked) scope.keys.add(cb.dataset.key); else scope.keys.delete(cb.dataset.key);
      codesEl.querySelector('#bd-allcodes').checked = scope.keys.size === 0;
      arm(); renderIssueFilter(); refresh();
    }));
  };
  s.querySelector('#bd-q').addEventListener('input', (e) => { codeQ = e.target.value; renderCodes(); });

  // ----- floors / doc types / state
  s.querySelector('#bd-floors').addEventListener('click', (e) => {
    const b = e.target.closest('[data-floor]'); if (!b) return;
    const f = b.dataset.floor;
    if (!f) scope.floors.clear();
    else if (scope.floors.has(f)) scope.floors.delete(f);
    else scope.floors.add(f);
    s.querySelectorAll('#bd-floors [data-floor]').forEach(x => {
      const on = x.dataset.floor === '' ? scope.floors.size === 0 : scope.floors.has(x.dataset.floor);
      x.classList.toggle('on', on);
      x.setAttribute('aria-pressed', String(on));
    });
    arm(); renderIssueFilter(); refresh();
  });
  const guestBtn = s.querySelector('#bd-guest'), spacesBtn = s.querySelector('#bd-spaces');
  const reflectDocTypes = () => {
    guestBtn.classList.toggle('on', scope.includeGuest);
    guestBtn.setAttribute('aria-pressed', String(scope.includeGuest));
    spacesBtn.classList.toggle('on', scope.includeSpaces);
    spacesBtn.setAttribute('aria-pressed', String(scope.includeSpaces));
  };
  reflectDocTypes();
  guestBtn.addEventListener('click', () => {
    scope.includeGuest = !scope.includeGuest;
    if (!scope.includeGuest && !scope.includeSpaces) scope.includeSpaces = true;
    reflectDocTypes(); arm(); renderIssueFilter(); refresh();
  });
  spacesBtn.addEventListener('click', () => {
    scope.includeSpaces = !scope.includeSpaces;
    if (!scope.includeGuest && !scope.includeSpaces) scope.includeGuest = true;
    reflectDocTypes(); arm(); renderIssueFilter(); refresh();
  });
  const issListEl = s.querySelector('#bd-isslist');
  const reflectState = () => {
    s.querySelectorAll('#bd-state [data-state]').forEach(x => {
      const on = x.dataset.state === scope.state;
      x.classList.toggle('on', on);
      x.setAttribute('aria-pressed', String(on));
    });
  };
  s.querySelector('#bd-state').addEventListener('click', (e) => {
    const b = e.target.closest('[data-state]'); if (!b) return;
    scope.state = b.dataset.state;
    scope.issueText = '';
    reflectState();
    arm(); renderIssueFilter();
    refresh();
  });
  const renderIssueFilter = () => {
    // The wordings are the vocabulary the crew actually flags in — MISSING, IN
    // BOX, DAMAGED — and picking one is the most common way to say what a bulk
    // is FOR. Gating this behind the "Open issue" chip hid it: the operator saw
    // no way to say "the missing ones" and had no reason to guess that another
    // chip would reveal it. So the list is shown whenever the current scope
    // contains flagged items, and picking a wording narrows to open issues on
    // its own — you cannot be flagged MISSING without having an open issue.
    const counts = new Map();
    for (const t of bulk.resolveTargets(editableDocs(), { ...scope, state: 'issue', issueText: '' })) {
      counts.set(t.item.issue, (counts.get(t.item.issue) || 0) + 1);
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (!top.length) { issListEl.hidden = true; return; }
    const total = top.reduce((n, [, c]) => n + c, 0);
    const anyOn = scope.state !== 'issue' || !scope.issueText;
    issListEl.hidden = false;
    issListEl.innerHTML = `<div class="bd-sub">…flagged with this problem</div>
      <div class="dchips">
        <button class="dchip small ${anyOn ? 'on' : ''}" data-iss="">${
          scope.state === 'issue' ? `Any problem · ${total}` : 'Don\u2019t filter'}</button>
        ${top.slice(0, 12).map(([t, n]) => `<button class="dchip small ${scope.state === 'issue' && scope.issueText === t ? 'on' : ''}" data-iss="${esc(t)}">${esc(t.length > 26 ? t.slice(0, 24) + '\u2026' : t)} · ${n}</button>`).join('')}
      </div>`;
    issListEl.querySelectorAll('[data-iss]').forEach(b => {
      b.setAttribute('aria-pressed', String(b.classList.contains('on')));
      b.addEventListener('click', () => {
        scope.issueText = b.dataset.iss;
        // Naming a problem IS asking for the flagged ones. Move the state with
        // it so the chips never contradict the filter above them.
        if (scope.issueText) scope.state = 'issue';
        reflectState();
        arm(); renderIssueFilter();
        refresh();
      });
    });
  };

  // ----- action + text
  const textWrap = s.querySelector('#bd-text-wrap');
  const renameWrap = s.querySelector('#bd-rename-wrap');
  const textInput = s.querySelector('#bd-text');
  const reflectAction = () => {
    const needsText = bulk.ACTIONS[action].needsText;
    textWrap.hidden = !needsText;
    s.querySelector('#bd-text-label').textContent = action === 'renameIssue' ? 'New wording' : 'Issue text';
    renameWrap.hidden = action !== 'renameIssue';
    if (action === 'renameIssue') renderRenameList();
  };
  s.querySelector('#bd-actions').addEventListener('change', (e) => {
    action = e.target.value;
    reflectAction();
    refresh();
  });
  s.querySelectorAll('#bd-text-picks [data-pick]').forEach(b => b.addEventListener('click', () => {
    textInput.value = b.dataset.pick;
    text = b.dataset.pick;
    refresh();
  }));
  textInput.addEventListener('input', () => { text = textInput.value.trim().toUpperCase(); refresh(); });

  const renderRenameList = () => {
    const counts = new Map();   // wording -> {open, resolved}
    for (const t of bulk.resolveTargets(editableDocs(), { ...scope, state: 'any' })) {
      if (!t.item.issue) continue;
      const c = counts.get(t.item.issue) || { open: 0, resolved: 0 };
      if (t.item.issueResolved) c.resolved++; else c.open++;
      counts.set(t.item.issue, c);
    }
    const list = [...counts.entries()].sort((a, b) => (b[1].open + b[1].resolved) - (a[1].open + a[1].resolved));
    const el = s.querySelector('#bd-rename-list');
    el.innerHTML = list.map(([t, c]) => `
      <label class="bd-code"><input type="checkbox" data-from="${esc(t)}" ${renameFrom.has(t) ? 'checked' : ''}>
        <span class="bd-code-txt"><b>${esc(t)}</b><em>${c.open} open${c.resolved ? ` + ${c.resolved} resolved` : ''}</em></span></label>`).join('')
      || '<div class="dempty">No issue text in scope.</div>';
    el.querySelectorAll('[data-from]').forEach(cb => cb.addEventListener('change', () => {
      if (cb.checked) renameFrom.add(cb.dataset.from); else renameFrom.delete(cb.dataset.from);
      refresh();
    }));
  };

  // ----- preview + apply
  const previewEl = s.querySelector('#bd-preview');
  const applyBtn = s.querySelector('#bd-apply');
  let currentPlan = null;

  let applying = false;   // true while executePlan is in flight
  const refresh = () => {
    const u = store.getUser();
    const opts = {
      user: u, uid: store.getUid(), text,
      renameFrom: action === 'renameIssue' ? renameFrom : null,
    };
    let err = '';
    if (!armed) err = 'Pick items, a floor, or a state first — a bulk edit should never start at “everything in the building”.';
    if (bulk.ACTIONS[action].needsText && !text) err = 'Type or pick the wording first.';
    if (action === 'renameIssue' && renameFrom.size === 0) err = 'Pick which existing wordings to change.';
    if ((action === 'check' || action === 'resolveAndCheck') && !u) err = 'Set your name & initials first.';
    if (err) {
      currentPlan = null;
      previewEl.innerHTML = `<span class="bd-warn">${esc(err)}</span>`;
      if (!applying) { applyBtn.disabled = true; applyBtn.textContent = 'Apply'; }
      return;
    }
    currentPlan = bulk.planAction(editableDocs(), scope, action, opts);
    const c = currentPlan.counts;
    // Checking off an item does not close its issue — say so up front rather
    // than letting 40 red rows silently survive a "checked everything" pass.
    const leavesOpen = action === 'check'
      ? currentPlan.changes.filter(ch => {
          const it = store.getRoom(ch.room)?.items?.[ch.itemId];
          return it && it.issue && !it.issueResolved;
        }).length : 0;
    const skips = currentPlan.skipReasons.map(([why, n]) => `${n} ${why}`).join(' · ');
    const roomsPreview = currentPlan.roomList.slice(0, 14).join(', ') +
      (currentPlan.roomList.length > 14 ? ` +${currentPlan.roomList.length - 14} more` : '');
    previewEl.innerHTML = c.changing
      ? `<b class="bd-n">${c.changing}</b> item${c.changing === 1 ? '' : 's'} will change across
         <b>${c.rooms}</b> room${c.rooms === 1 ? '' : 's'}
         <span class="bd-rooms">(${esc(roomsPreview)})</span>
         ${c.skipped ? `<span class="bd-skips">leaving alone: ${esc(skips)}</span>` : ''}
         ${leavesOpen ? `<span class="bd-warn">⚠ ${leavesOpen} of these have an OPEN ISSUE that will stay open — use “Resolve issue &amp; check off” if the problem is actually fixed.</span>` : ''}`
      : `<span class="bd-warn">Nothing to change with this scope${c.skipped ? ` — ${esc(skips)}` : ''}.</span>`;
    // While a bulk is committing, the button belongs to the apply flow —
    // a crew write echoing back must not relabel it or, worse, re-enable it
    // and let a second apply start before the first has settled.
    if (!applying) {
      applyBtn.disabled = !c.changing;
      applyBtn.textContent = c.changing ? `Apply ${c.changing} change${c.changing === 1 ? '' : 's'}` : 'Apply';
    }
    applyBtn.classList.toggle('danger', bulk.ACTIONS[action].destructive);
  };

  const renderUndo = () => {
    const el = s.querySelector('#bd-undo');
    if (!el) return;
    el.innerHTML = undoStack.length
      ? `<button class="dbtn ghost small" id="bd-undo-btn">↩ Undo: ${esc(undoStack[undoStack.length - 1].label)}</button>`
      : '';
    const b = el.querySelector('#bd-undo-btn');
    if (b) b.addEventListener('click', async () => {
      await performUndo();
      renderUndo(); refresh();
    });
  };

  applyBtn.addEventListener('click', async () => {
    if (!currentPlan || !currentPlan.counts.changing) return;
    if (!canWrite()) { writeNudge(); return; }
    // Stale-data interlock: every guard in the plan evaluates against a cache
    // that stops being true the moment the connection does.
    const trust = dataTrust();
    if (trust === 'offline' && bulk.ACTIONS[action].destructive) {
      toast('You\u2019re offline — un-check and clear-issue can erase crew work you can\u2019t see. Reconnect first.');
      return;
    }
    if (trust !== 'live') {
      const cached = trust === 'cache';
      const goOn = await confirmDialog(
        (cached
          ? 'This screen is NOT reaching the server — it is showing the last data it received. '
          : 'You\u2019re OFFLINE. This plan was computed from the last data this screen saw. ') +
        (bulk.ACTIONS[action].destructive
          ? 'Un-checking or clearing issues now can erase crew work made since then that is invisible here. '
          : 'Crew check-offs made since then are invisible here and could be skipped or double-stamped. ') +
        'Apply anyway (it syncs when the connection returns)?',
        { danger: true, okLabel: 'Apply anyway', stack: true,
          title: cached ? 'No server contact' : 'Offline — cached data' });
      if (!goOn) return;
    }
    if (!(await requireAdmin())) return;
    // Re-plan against the freshest state AFTER the PIN pause — a crew member
    // may have checked something during it, and their write must survive.
    refresh();
    if (!currentPlan || !currentPlan.counts.changing) { renderUndo(); return; }
    const plan = currentPlan;
    const label = bulk.describePlan(plan);
    const actionName = bulk.ACTIONS[plan.action].label;
    const sure = await confirmDialog(
      `${actionName} — ${plan.counts.changing} item${plan.counts.changing === 1 ? '' : 's'} across ${plan.counts.rooms} room${plan.counts.rooms === 1 ? '' : 's'}? ${bulk.ACTIONS[plan.action].destructive ? 'This removes field data. ' : ''}You can undo from this drawer.`,
      { danger: bulk.ACTIONS[plan.action].destructive, okLabel: actionName, stack: true, title: 'Apply bulk edit' });
    if (!sure) return;
    // FINAL re-plan at the moment of commitment. The confirm dialog is a
    // human-paced pause — a crew check-off landing during it must survive, so
    // the plan that EXECUTES is derived from state as of right now. If the
    // world changed enough to move the count, stop and make the operator look.
    refresh();
    if (!currentPlan || !currentPlan.counts.changing) {
      toast('The building changed while you confirmed — nothing left matching this scope.');
      renderUndo(); return;
    }
    // Compare change-set IDENTITY, not cardinality: one item leaving scope while
    // another enters keeps the count equal, and executing that would hit an item
    // the operator never previewed — the exact thing this gate exists to stop.
    if (changeSetKey(currentPlan) !== changeSetKey(plan)) {
      const now = currentPlan.counts.changing, was = plan.counts.changing;
      toast(now === was
        ? `Heads up: the building changed while you confirmed — same count (${now}), but not the same items. Review the preview and Apply again.`
        : `Heads up: the building changed while you confirmed — the plan is now ${now} items (was ${was}). Review the preview and Apply again.`);
      renderUndo(); return;
    }
    const finalPlan = currentPlan;
    const finalLabel = bulk.describePlan(finalPlan);
    applying = true;
    applyBtn.disabled = true;
    applyBtn.textContent = 'Applying…';
    const ctx = store.getBulkContext();
    const bulkId = Date.now().toString(36) + '-' + (++bulkSeq);
    let flowDone = false;   // late server acks must not overwrite the reset label
    try {
      const res = await bulk.executePlan(finalPlan, ctx, (done, tot) => {
        if (!flowDone) applyBtn.textContent = `Syncing ${done}/${tot}…`;
      });
      if (res.acked === false && !res.pending) {
        // A batch was REJECTED by the server (rules / not-found). The SDK
        // rolls its optimistic writes back, so live state is already honest —
        // tell the operator plainly instead of pretending success.
        toast('⚠ The server rejected some of this bulk edit — nothing to undo for the rejected part. Check the numbers and retry.');
      } else {
        undoStack.push({ id: bulkId, label: finalLabel, inverse: bulk.invertPlan(finalPlan), at: new Date() });
        if (undoStack.length > 20) undoStack.shift();
        bulk.auditBulk(finalPlan, ctx, bulkId);
        // The drawer's ↩ Undo is the durable affordance; the toast only offers
        // one when the drawer is gone, so two Undos never sit side by side.
        const drawerShowsUndo = s.isConnected;
        toast(
          res.pending ? `${finalLabel} — queued, syncs when online` : finalLabel,
          drawerShowsUndo ? {} : { action: 'Undo', onAction: () => performUndo() });
        vibrate();
        // Queued writes can still be REJECTED when signal returns — say so.
        if (res.pending && res.settle) {
          res.settle.then(okAll => {
            if (!okAll) toast('⚠ Some queued bulk writes were rejected when syncing — check the board against reality.');
          });
        }
      }
    } catch (e) {
      console.error('bulk apply failed', e);
      toast('Bulk edit failed: ' + (e.message || e));
    }
    flowDone = true;
    applying = false;
    renderUndo();
    refresh();
  });

  renderCodes();
  renderIssueFilter();
  reflectAction();
  refresh();
  renderUndo();

  // A crew member checking items WHILE the drawer sits open changes what the
  // preview means — recompute it on every store change so the number Austin
  // confirms is never a stale number. (Apply re-plans once more after the
  // PIN pause, so this is belt on top of braces.)
  // Own the hook by identity: when THIS drawer is replaced by a newer one, its
  // last subscription callback must not clear the newer drawer's hook.
  const mine = () => { if (s.isConnected) renderUndo(); };
  const unsub = store.subscribe(() => {
    if (!s.isConnected) {
      unsub();
      if (drawerUndoRefresh === mine) drawerUndoRefresh = null;
      return;
    }
    // An item code added from a phone while this drawer sits open must become
    // selectable, and the ⚠N open badges must stay honest — rebuild the
    // inventory, keeping the operator's typed filter and ticked codes.
    inv = bulk.buildInventory(editableDocs());
    renderCodes();
    refresh();
  });
  drawerUndoRefresh = mine;
}

let drawerUndoRefresh = null;   // set while a drawer is open
let undoRunning = false;
async function performUndo() {
  if (undoRunning) return;   // a double-tap must not fire the inverse twice
  const entry = undoStack.pop();
  if (!entry) { toast('Nothing to undo'); return; }
  undoRunning = true;
  try {
    // Same stale-data interlock the apply path uses. An undo is a write like
    // any other — and undoing a bulk CHECK is functionally a bulk un-check, so
    // on cached data it can clobber crew work this screen cannot see: the
    // "touched since" test that makes undo safe is only as good as the data
    // it reads.
    const trust = dataTrust();
    if (trust !== 'live') {
      const goOn = await confirmDialog(
        (trust === 'cache'
          ? 'This screen is NOT reaching the server — it is showing the last data it received. '
          : 'You\u2019re OFFLINE. ') +
        'Anything the crew changed since then is invisible here, so this undo could overwrite their work. Undo anyway?',
        { danger: true, okLabel: 'Undo anyway', stack: true,
          title: trust === 'cache' ? 'No server contact' : 'Offline — cached data' });
      if (!goOn) { undoStack.push(entry); return; }
    }
    // Undo is NOT a blind write: re-derive against current state so anything
    // a crew member touched after the bulk is left alone, with a reason.
    const derived = bulk.deriveUndoPlan(entry.inverse, editableDocs());
    if (!derived.counts.changing) {
      toast('Nothing left to undo — every item has been touched since the bulk edit.');
      return;
    }
    if (derived.counts.skipped) {
      const ok = await confirmDialog(
        `Undo ${derived.counts.changing} of ${entry.inverse.changes.length} — ${derived.counts.skipped} item${derived.counts.skipped === 1 ? ' was' : 's were'} changed by someone since the bulk edit and will be left alone.`,
        { okLabel: 'Undo the rest', stack: true, title: 'Undo — partial' });
      if (!ok) { undoStack.push(entry); return; }
    }
    const ctx = store.getBulkContext();
    const res = await bulk.executePlan(derived, ctx, () => {});
    if (res.acked === false && !res.pending) {
      // Server rejected it — nothing was restored. Keep the entry undoable.
      undoStack.push(entry);
      toast('⚠ Undo was rejected by the server — nothing was restored. Check the connection and retry.');
      return;
    }
    bulk.auditBulk(derived, ctx, entry.id + '-undo');
    toast(res.pending ? `Undone (queued): ${entry.label}` : `Undone: ${entry.label}`);
    // A queued undo can still be REJECTED when the connection returns. Say so,
    // and hand the entry back so the operator can try again — the same
    // contract the apply path honours.
    if (res.pending && res.settle) {
      res.settle.then(okAll => {
        if (okAll) return;
        undoStack.push(entry);
        if (drawerUndoRefresh) drawerUndoRefresh();
        toast('⚠ The queued undo was rejected when syncing — nothing was restored. Try again.');
      });
    }
  } catch (e) {
    // Push it back — a failed undo must stay undoable.
    undoStack.push(entry);
    console.error('undo failed', e);
    toast('Undo failed: ' + (e.message || e));
  } finally {
    undoRunning = false;
    if (drawerUndoRefresh) drawerUndoRefresh();
  }
}

export function undoCount() { return undoStack.length; }
