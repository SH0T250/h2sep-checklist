// Bottom sheets & modal helpers (no routes; overlay on current screen).
import { esc, fmtWhen, vibrate } from './util.js';
import * as store from './store.js';

const QUICK_PICKS = ['NEED INSTALL', 'NEED PROPER PLACE', 'IN BOX', 'DAMAGED', 'MISSING', 'WRONG ITEM'];

export function closeSheets() {
  document.querySelectorAll('.scrim').forEach(el => el.remove());
}

export function sheet(html, { title = '' } = {}) {
  closeSheets();
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  scrim.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true" ${title ? `aria-label="${esc(title)}"` : ''}>
      <div class="sheet-grab"></div>
      ${title ? `<div class="sheet-title">${esc(title)}</div>` : ''}
      <div class="sheet-body">${html}</div>
    </div>`;
  scrim.addEventListener('click', (e) => { if (e.target === scrim) scrim.remove(); });
  document.body.appendChild(scrim);
  requestAnimationFrame(() => scrim.classList.add('open'));
  return scrim;
}

export function confirmDialog(msg, { danger = false, okLabel = 'OK' } = {}) {
  return new Promise((resolve) => {
    const s = sheet(`
      <p class="confirm-msg">${esc(msg)}</p>
      <div class="btn-row">
        <button class="btn ghost" data-act="cancel">Cancel</button>
        <button class="btn ${danger ? 'danger' : 'primary'}" data-act="ok">${esc(okLabel)}</button>
      </div>`);
    s.querySelector('[data-act=ok]').addEventListener('click', () => { s.remove(); resolve(true); });
    s.querySelector('[data-act=cancel]').addEventListener('click', () => { s.remove(); resolve(false); });
  });
}

// ---- issue sheet: flag an item with the paper vocabulary ----
export function issueSheet(room, itemId) {
  const item = room.items[itemId];
  const s = sheet(`
    <div class="chip-grid">
      ${QUICK_PICKS.map(q => `<button class="chip-pick" data-note="${esc(q)}">${esc(q)}</button>`).join('')}
      <button class="chip-pick custom" data-custom>CUSTOM…</button>
    </div>
    <form class="custom-note hidden">
      <input type="text" name="note" placeholder="Type the problem…" maxlength="120" autocomplete="off">
      <button class="btn primary" type="submit">Save</button>
    </form>
    ${item.issue ? `<button class="btn ghost full" data-clear>Clear current flag (“${esc(item.issue)}”)</button>` : ''}`,
    { title: `${item.code} · ${item.label} — flag issue` });

  s.querySelectorAll('.chip-pick[data-note]').forEach(b => b.addEventListener('click', () => {
    store.setIssue(room.number, itemId, b.dataset.note);
    vibrate(); s.remove();
  }));
  const form = s.querySelector('.custom-note');
  s.querySelector('[data-custom]').addEventListener('click', () => {
    form.classList.remove('hidden');
    form.note.focus();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = form.note.value.trim().toUpperCase();
    if (v) { store.setIssue(room.number, itemId, v); s.remove(); }
  });
  const clr = s.querySelector('[data-clear]');
  if (clr) clr.addEventListener('click', () => { store.resolveIssue(room.number, itemId, { clear: true }); s.remove(); });
}

// ---- tapped a checked item ----
export function checkedItemSheet(room, itemId, { canWrite }) {
  const item = room.items[itemId];
  const me = store.getUser();
  const mine = me && item.initials === me.initials;
  const whoLine = item.checkedByName || item.initials
    ? `Checked by ${esc(item.checkedByName || item.initials)}${item.initials ? ` (${esc(item.initials)})` : ''}`
    : 'Checked (from paper sheet)';
  const whenLocal = fmtWhen(item.checkedAtLocal);
  const whenSync = fmtWhen(item.checkedAt);
  const whenLine = whenLocal
    ? `checked ${whenLocal}${whenSync && whenSync !== whenLocal ? ` · synced ${whenSync}` : ''}` : '';
  const s = sheet(`
    <div class="who-line">${whoLine}${whenLine ? `<br><span class="muted">${esc(whenLine)}</span>` : ''}</div>
    ${canWrite ? `
      <button class="btn ghost full" data-act="uncheck">Un-check</button>
      <button class="btn ghost full" data-act="flag">Flag issue…</button>` : ''}
  `, { title: `${item.code} · ${item.label}` });
  if (!canWrite) return;
  s.querySelector('[data-act=uncheck]').addEventListener('click', async () => {
    s.remove();
    if (!mine) {
      const ok = await confirmDialog(`Remove ${item.initials || 'this'} check?`, { danger: true, okLabel: 'Un-check' });
      if (!ok) return;
    }
    // fire-and-forget: the local un-check is instant; awaiting server ack
    // would keep the Undo toast from ever appearing in a dead zone.
    store.uncheckItem(room.number, itemId).catch(() => {});
    const { toast } = await import('./util.js');
    toast('Un-checked', {
      action: 'Undo',
      onAction: () => store.checkItem(room.number, itemId).catch(() => {}),
    });
  });
  s.querySelector('[data-act=flag]').addEventListener('click', () => { s.remove(); issueSheet(room, itemId); });
}

// ---- tapped an open-issue item's box ----
export function issueItemSheet(room, itemId, { canWrite }) {
  const item = room.items[itemId];
  const s = sheet(`
    <div class="issue-note-line">— ${esc(item.issue)}</div>
    ${canWrite ? `
      <button class="btn primary full" data-act="resolve-check">Resolve &amp; check ✓</button>
      <button class="btn ghost full" data-act="resolve">Resolve only</button>
      <button class="btn ghost full" data-act="edit">Edit note…</button>
      <button class="btn ghost full" data-act="clear">Clear flag (mistake)</button>` : ''}
  `, { title: `${item.code} · ${item.label}` });
  if (!canWrite) return;
  s.querySelector('[data-act=resolve-check]').addEventListener('click', () => {
    store.resolveIssue(room.number, itemId, { check: true }); vibrate(); s.remove();
  });
  s.querySelector('[data-act=resolve]').addEventListener('click', () => {
    store.resolveIssue(room.number, itemId); s.remove();
  });
  s.querySelector('[data-act=edit]').addEventListener('click', () => { s.remove(); issueSheet(room, itemId); });
  s.querySelector('[data-act=clear]').addEventListener('click', () => {
    store.resolveIssue(room.number, itemId, { clear: true }); s.remove();
  });
}

// ---- room-level note ----
export function addNoteSheet(room) {
  const s = sheet(`
    <form class="note-form">
      <input type="text" name="text" placeholder="e.g. CONNECTING DOOR LOCK – NOT LOCKING" maxlength="200" autocomplete="off" required>
      <label class="check-line"><input type="checkbox" name="isIssue" checked> This is a problem (shows red)</label>
      <button class="btn primary full" type="submit">Add note</button>
    </form>`, { title: `★ Room ${room.number} note` });
  const form = s.querySelector('form');
  form.text.focus();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = form.text.value.trim();
    if (!text) return;
    store.addRoomNote(room.number, form.isIssue.checked ? text.toUpperCase() : text,
      form.isIssue.checked ? 'issue' : 'info');
    s.remove();
  });
}

export function noteSheet(room, noteId, { canWrite }) {
  const note = room.notes[noteId];
  const s = sheet(`
    <div class="who-line">${esc(note.text)}${note.createdBy ? `<br><span class="muted">added by ${esc(note.createdBy)}</span>` : ''}</div>
    ${canWrite ? `
      <button class="btn primary full" data-act="toggle">${note.resolved ? 'Re-open' : 'Mark resolved'}</button>` : ''}
  `, { title: `★ Room ${room.number} note` });
  if (!canWrite) return;
  s.querySelector('[data-act=toggle]').addEventListener('click', () => {
    // toggle from live state, not this sheet's snapshot (two-people race)
    store.toggleRoomNote(room.number, noteId); s.remove();
  });
}

// ---- admin PIN ----
export function pinSheet() {
  return new Promise((resolve) => {
    const s = sheet(`
      <form class="pin-form">
        <input type="tel" inputmode="numeric" pattern="[0-9]*" name="pin" maxlength="6"
               placeholder="Admin PIN" autocomplete="off" class="pin-input">
        <div class="pin-err hidden">Wrong PIN</div>
        <button class="btn primary full" type="submit">Unlock admin</button>
      </form>`, { title: 'Admin' });
    const form = s.querySelector('form');
    form.pin.focus();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const ok = await store.verifyPin(form.pin.value.trim());
      if (ok) { s.remove(); resolve(true); }
      else { s.querySelector('.pin-err').classList.remove('hidden'); form.pin.select(); }
    });
    s.addEventListener('click', (e) => { if (e.target === s) resolve(false); });
  });
}

export async function requireAdmin() {
  if (store.isAdmin()) return true;
  return pinSheet();
}

// ---- original paper-sheet photo viewer ----
export function paperSheetOverlay(roomNumber) {
  closeSheets();
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  scrim.innerHTML = `
    <div class="paper-view" role="dialog" aria-modal="true" aria-label="Paper sheet — Room ${esc(roomNumber)}">
      <div class="paper-bar"><span>Room ${esc(roomNumber)} — original paper sheet</span>
        <button class="paper-close" aria-label="Close">✕</button></div>
      <div class="paper-scroll"><img src="./sheets/${esc(roomNumber)}.jpg" alt="Paper checklist for room ${esc(roomNumber)}"></div>
    </div>`;
  const img = scrim.querySelector('img');
  img.addEventListener('error', async () => {
    // Distinguish "no sheet exists" from "sheet exists but not downloaded yet"
    // using the bundled index (works offline).
    let exists = false;
    try {
      const idx = await (await fetch('./sheets/index.json')).json();
      exists = Array.isArray(idx) && idx.includes(String(roomNumber));
    } catch (_) { /* index unavailable — fall through to generic message */ }
    scrim.querySelector('.paper-scroll').innerHTML = exists
      ? `<div class="paper-none">Room ${esc(roomNumber)}'s sheet is on file but not downloaded to this phone yet.<br>
         <span class="muted">It downloads automatically the next time you have signal.</span></div>`
      : `<div class="paper-none">No paper sheet on file for Room ${esc(roomNumber)} yet.<br>
         <span class="muted">Send a photo of the page to Claude and it'll show up here.</span></div>`;
  });
  img.addEventListener('click', () => img.classList.toggle('zoomed'));
  scrim.querySelector('.paper-close').addEventListener('click', () => scrim.remove());
  scrim.addEventListener('click', (e) => { if (e.target === scrim) scrim.remove(); });
  document.body.appendChild(scrim);
  requestAnimationFrame(() => scrim.classList.add('open'));
}

// ---- go-to-room keypad ----
export function goToRoomSheet() {
  const s = sheet(`
    <form class="goto-form">
      <input type="tel" inputmode="numeric" pattern="[0-9]*" name="num" maxlength="6"
             placeholder="Room #" autocomplete="off" class="pin-input">
      <button class="btn primary full" type="submit">Go</button>
    </form>`, { title: 'Go to room' });
  const form = s.querySelector('form');
  form.num.focus();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const n = form.num.value.trim();
    if (!n) return;
    s.remove();
    location.hash = '#/room/' + n;
  });
}
