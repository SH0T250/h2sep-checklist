// dash-mep.js — the MEP PUNCH surface on the wall dashboard.
//
// WHY THIS EXISTS. The punch lists shipped to the crew app first (v1.18.0) and
// the board could only report their totals: a tile said "N MEP punch lists" and
// the issue table printed rows labelled "MEP 105". Nobody standing at the board
// could see WHAT was on a punch list, and there was no way to pull up the
// cutsheet for the fixture being argued about. This module gives the board the
// same structure the phone has — floor → room → trade → line — plus the
// submittal and plan references on every line.
//
// READ-ONLY BY DESIGN. dash-edit.js refuses every write against an `mep-punch`
// doc (refuseMep), and that refusal stands: the punch list is signed off trade
// by trade in the field, and a wall screen in the trailer is the wrong place to
// un-check a mechanical test somebody performed. Everything here browses; the
// only interactive elements open a reference or navigate. If that call is ever
// reversed it must be reversed in dash-edit.js, behind the PIN, not here.
//
// PARITY IS THE SPEC. Every visual decision below mirrors js/screens.js:
// MEP_CATEGORY_ORDER for the groups, MEP_LETTER for the M/E/P/FP/LV chips,
// the DO chip on the punch step, the paragraph-width note, the ⚠ VERIFY chip
// on FLAGGED lines, the "n of m" ordinal on repeated marks. A line that reads
// one way on the phone and another way on the board is a defect here.

import * as store from './store.js';
import { esc, isMepDoc, mepParent, roomStats, MEP_CATEGORY_ORDER, MEP_LETTER } from './util.js';
import { refsFor } from './refs.js';
import { sheet, refsSection, wireRefs } from './dash-edit.js';

// Which floor the panel is showing. Session-scoped like the app's floor view,
// so a refresh of a wall screen left on Level 3 comes back on Level 3.
const FLOOR_KEY = 'h2sep-dash-mepfloor';
function currentFloor() {
  const v = Number(sessionStorage.getItem(FLOOR_KEY) || 0);
  return Number.isFinite(v) && v > 0 ? v : 0; // 0 = "not chosen yet"
}
function setFloor(f) {
  try { sessionStorage.setItem(FLOOR_KEY, String(f)); } catch (_) { /* private mode */ }
}

// ---------------------------------------------------------------------------
// Line rendering — shared by the room sheet and the trade sheet.
// ---------------------------------------------------------------------------

// Ordinals need the WHOLE room's code counts, not the group's: "1 of 3" on a
// sprinkler head means the first of the three in this room, and computing it
// per trade group would be right only because sprinklers happen to live in one
// group. Fire dampers do not — FD appears under Mechanical AND Plumbing.
function codeCounts(items) {
  const n = {};
  for (const [, it] of items) if (it.code) n[it.code] = (n[it.code] || 0) + 1;
  return n;
}

function lineHTML([id, it], room, counts, seen) {
  if (it.code) seen[it.code] = (seen[it.code] || 0) + 1;
  const ordinal = it.code && counts[it.code] > 1 ? `${seen[it.code]} of ${counts[it.code]}` : '';
  // Same rule as the app: the ordinal joins the instance note rather than
  // taking its own line, unless the note already states one.
  const inst = it.instanceNote && ordinal && !/\d+\s+of\s+\d+/.test(it.instanceNote)
    ? `${it.instanceNote} · ${ordinal}`
    : (it.instanceNote || ordinal);
  const openIssue = it.issue && !it.issueResolved;
  const flagged = it.reliability === 'FLAGGED';
  const nrefs = refsFor(room.number, it, id).length;
  return `
    <div class="mrow ${it.checked ? 'checked' : ''} ${openIssue ? 'issue' : ''}${flagged ? ' flagged' : ''}"
         data-item="${esc(id)}" role="listitem">
      <span class="mbox" aria-hidden="true">
        ${it.checked ? `<span class="mink">${esc(it.initials || '✓')}</span>` : ''}
        ${openIssue ? `<span class="mbox-flag">⚑</span>` : ''}
      </span>
      <div class="mrow-main">
        <div class="mrow-l1">${it.code ? `<b class="mcode">${esc(it.code)}</b> ` : ''}${
          Number(it.qty) > 1 ? `<span class="mqty" aria-label="quantity ${Number(it.qty)}">×${Number(it.qty)}</span> ` : ''
        }<span class="mlbl">${esc(it.label)}</span></div>
        ${flagged ? `<div class="mverify warn">⚠ VERIFY — sources disagree</div>` : ''}
        ${it.reliability === 'MEDIUM' || it.reliability === 'LOW'
          ? `<div class="mverify">verify${it.reliability === 'LOW' ? ' — scaled source' : ''}</div>` : ''}
        ${openIssue ? `<div class="mrow-note">— ${esc(String(it.issue).toUpperCase())}</div>` : ''}
        ${it.issue && it.issueResolved ? `<div class="mrow-note resolved"><s>— ${esc(String(it.issue).toUpperCase())}</s></div>` : ''}
        ${it.where ? `<div class="punch-where"><span class="punch-at">AT</span> ${esc(it.where)}</div>` : ''}
        ${it.verifyAtPunch ? `<div class="punch-step"><span class="punch-do">DO</span> ${esc(it.verifyAtPunch)}</div>` : ''}
        ${inst ? `<div class="punch-note">${esc(inst)}</div>` : ''}
        ${nrefs ? `<button class="mref-chip" data-refchip="${esc(id)}"
            aria-label="References for ${esc(it.code || it.label)}">📎 ${nrefs} ref${nrefs > 1 ? 's' : ''}</button>` : ''}
      </div>
    </div>`;
}

// Group the room's lines into the five trades, in walking order. Unknown
// categories append alphabetically rather than vanishing — a punch doc that
// grows a sixth trade must still show every line it has.
function tradeGroups(items) {
  const byCat = new Map();
  for (const row of items) {
    const cat = row[1].category || '';
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push(row);
  }
  const known = [], unknown = [];
  for (const cat of byCat.keys()) {
    if (!cat) continue;
    (MEP_CATEGORY_ORDER.indexOf(cat) >= 0 ? known : unknown).push(cat);
  }
  known.sort((a, b) => MEP_CATEGORY_ORDER.indexOf(a) - MEP_CATEGORY_ORDER.indexOf(b));
  unknown.sort((a, b) => a.localeCompare(b));
  const order = known.concat(unknown);
  if (byCat.has('')) order.push('');
  return order.map(cat => ({
    cat, label: cat || 'Other', rows: byCat.get(cat),
    letter: MEP_LETTER[cat] || '',
  }));
}

function sortedItems(room) {
  return Object.entries(room.items || {})
    .filter(([, it]) => !it.deleted)
    .sort((a, b) => (a[1].sort || 0) - (b[1].sort || 0));
}

// ---------------------------------------------------------------------------
// Room sheet — the drill-in. Mirrors the app's room screen for a punch doc.
// ---------------------------------------------------------------------------
export function openMepRoomSheet(roomNumber) {
  const room = store.getRoom(roomNumber);
  if (!room || !isMepDoc(room)) return;
  const base = mepParent(room.number) || room.number;
  const items = sortedItems(room);
  const counts = codeCounts(items);
  const seen = {};
  const groups = tradeGroups(items);
  const s = roomStats(room);

  const body = groups.map(g => {
    const done = g.rows.filter(([, it]) => it.checked).length;
    const open = g.rows.filter(([, it]) => it.issue && !it.issueResolved).length;
    return `
      <section class="mcat">
        <div class="mcat-head">
          ${g.letter ? `<span class="mcat-letter">${esc(g.letter)}</span>` : ''}
          <span class="mcat-name">${esc(g.label.toUpperCase())}</span>
          <span class="mcat-count">${done}/${g.rows.length}${open ? ` · ${open} open` : ''}</span>
        </div>
        <div class="mcat-rows" role="list">${g.rows.map(r => lineHTML(r, room, counts, seen)).join('')}</div>
      </section>`;
  }).join('');

  // Prev/next walks the other PUNCH docs on this floor, never into an FF&E
  // room — the same rule the app's punch screen follows. Landing on "Rm 103"
  // from "MEP 101" would be a different checklist entirely.
  const siblings = store.getMepDocs(room.floor).map(r => r.number);
  const idx = siblings.indexOf(room.number);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  const html = `
    <div class="mroom-sub">${esc(room.typeLabel || '')} · ${items.length} punch line${items.length === 1 ? '' : 's'}
      across ${groups.length} trade${groups.length === 1 ? '' : 's'}${s.openIssues ? ` · <b class="issue-ink">${s.openIssues} open</b>` : ''}</div>
    <div class="mroom-list">${body || '<div class="dempty">No punch lines on this doc.</div>'}</div>
    <div class="dhint">📎 opens the cutsheet or plan detail · punch lines are checked off in the crew app, not here.</div>
    <div class="dbtn-row droom-nav">
      ${prev ? `<button class="dbtn ghost small" data-mnav="${esc(prev)}">‹ MEP ${esc(mepParent(prev) || prev)}</button>` : '<span></span>'}
      <button class="dbtn ghost small" data-mback>Level ${esc(String(room.floor))} punch lists</button>
      ${next ? `<button class="dbtn ghost small" data-mnav="${esc(next)}">MEP ${esc(mepParent(next) || next)} ›</button>` : '<span></span>'}
    </div>`;

  const scrim = sheet(html, { title: `MEP ${base} — ${s.done}/${items.length} checked`, wide: true });

  // Reference chips. refsSection/wireRefs is the same join and the same popup
  // behaviour the FF&E item sheet uses, so a cutsheet opened from a punch line
  // and one opened from a casegood line behave identically.
  scrim.querySelectorAll('[data-refchip]').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const id = btn.dataset.refchip;
    const it = room.items[id];
    if (!it) return;
    const rs = sheet(
      `<div class="dprov">${esc(it.category || '')}${it.src ? ' · sheet ' + esc(it.src) : ''}</div>
       ${refsSection(room, it, id) || '<div class="dempty">No references published for this line yet.</div>'}`,
      { title: (it.code ? it.code + ' · ' : '') + it.label, stack: true, wide: true });
    wireRefs(rs, room, it, id);
  }));

  scrim.querySelectorAll('[data-mnav]').forEach(b => b.addEventListener('click', () => {
    openMepRoomSheet(b.dataset.mnav);
  }));
  const back = scrim.querySelector('[data-mback]');
  if (back) back.addEventListener('click', () => { scrim.closeSheet(); setFloor(room.floor); });
  return scrim;
}

// ---------------------------------------------------------------------------
// The panel itself.
// ---------------------------------------------------------------------------

// Roll one floor's punch docs up into the numbers the panel header prints.
function floorRoll(docs) {
  let lines = 0, done = 0, issues = 0, complete = 0;
  for (const d of docs) {
    const s = roomStats(d);
    lines += s.total; done += s.done; issues += s.openIssues;
    if (s.complete) complete++;
  }
  return { docs: docs.length, lines, done, issues, complete,
           pct: lines ? Math.round(done / lines * 100) : 0 };
}

export function renderMep(container, allDocs) {
  if (!container) return;
  const mep = allDocs.filter(isMepDoc);
  if (!mep.length) {
    container.innerHTML = '<div class="empty-line">No MEP punch lists have been published yet.</div>';
    const hint = document.getElementById('mep-hint');
    if (hint) hint.textContent = '';
    return;
  }

  const floors = [...new Set(mep.map(d => Number(d.floor) || 0))].sort((a, b) => a - b);
  // Default to the LOWEST floor that actually has punch docs rather than a
  // hardcoded 1 — the board must not open on an empty tab if floor 1 is ever
  // re-seeded or the panel is reused on another project.
  let floor = currentFloor();
  if (!floors.includes(floor)) floor = floors[0];

  const onFloor = mep.filter(d => Number(d.floor) === floor)
    .sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true }));
  const roll = floorRoll(onFloor);
  const all = floorRoll(mep);

  const tabs = floors.map(f => {
    const n = mep.filter(d => Number(d.floor) === f).length;
    return `<button class="mtab ${f === floor ? 'on' : ''}" role="tab" aria-selected="${f === floor}"
      data-mfloor="${f}">LEVEL ${f} · ${n}</button>`;
  }).join('');

  const cards = onFloor.map(d => {
    const s = roomStats(d);
    const base = mepParent(d.number) || d.number;
    return `
      <button class="mcard ${s.complete ? 'done' : ''} ${s.openIssues ? 'issues' : ''}" data-mroom="${esc(d.number)}"
        aria-label="MEP punch list for room ${esc(base)}, ${s.done} of ${s.total} checked${s.openIssues ? ', ' + s.openIssues + ' open issues' : ''}">
        <span class="mc-num">MEP ${esc(base)}</span>
        <span class="mc-type">${esc(d.typeLabel || '')}</span>
        <span class="mc-bar"><span class="mc-fill" style="width:${s.pct}%"></span></span>
        <span class="mc-foot">${s.done}/${s.total} lines${s.openIssues ? ` · <b class="issue-ink">${s.openIssues}⚑</b>` : ''}</span>
      </button>`;
  }).join('');

  container.innerHTML = `
    <div class="mtabs" role="tablist" aria-label="Punch list floor">${tabs}</div>
    <div class="mroll">
      <span><b>${roll.docs}</b> punch list${roll.docs === 1 ? '' : 's'}</span>
      <span><b>${roll.lines.toLocaleString()}</b> lines</span>
      <span><b>${roll.done.toLocaleString()}</b> checked</span>
      <span class="${roll.issues ? 'issue-ink' : ''}"><b>${roll.issues}</b> open issue${roll.issues === 1 ? '' : 's'}</span>
      <span><b>${roll.complete}</b> complete</span>
    </div>
    <div class="mgrid">${cards || '<div class="empty-line">No punch lists on this level.</div>'}</div>`;

  const hint = document.getElementById('mep-hint');
  if (hint) {
    hint.textContent = `${all.docs} lists · ${all.lines.toLocaleString()} lines building-wide`;
  }

  container.querySelectorAll('[data-mfloor]').forEach(b => b.addEventListener('click', () => {
    setFloor(Number(b.dataset.mfloor));
    renderMep(container, allDocs);
  }));
  container.querySelectorAll('[data-mroom]').forEach(b => b.addEventListener('click', () => {
    openMepRoomSheet(b.dataset.mroom);
  }));
}
