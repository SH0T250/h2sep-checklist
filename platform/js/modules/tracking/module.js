// Tracking module (module one): rooms, checklists, check-off, issues, notes.
// FF&E and MEP punch stay separate populations, like the crew app today.

import { ic, el, esc, fmtWhen, toast, sheet, pressable } from '../../core/ui.js';

const QUICK_PICKS = ['NEED INSTALL', 'NEED PROPER PLACE', 'IN BOX', 'DAMAGED', 'MISSING', 'WRONG ITEM'];
const SLICE_NOTE = 'Slice build: rooms 101, 103, 105 at 100%. The other 112 rooms arrive with the data rollout.';

// Aug 14 door-sheet PDFs in Drive (folder 7, Guest Room FF&E and Finishes).
// Room 103 has no sheet in Drive yet; flagged to Austin.
const PRINT_SHEETS = {
  '101': '18nSnm4ZoueyW1P7iE_K-MVuTT80mLk9u', '104': '1XQn2pVpnQ_JgTmzDl95-FN4uQVHJSVAF',
  '105': '1h2PAGJVtHbq9RAOr-lE3knO9N4Zbkmz-', '109': '1V3jZ3DxFIDststv57Tjg-X4d85-BFddh',
  '116': '18MlxBMq56YvqyRpjMmlTUMceyO0TBzL6', '118': '1A6N9Wcweb9m_JDMftCCxv25DFaL-G55l',
  '202': '1O3WWFtMH-E61SMDmdt8k_NtXj5Q8BoKy', '215': '1msubXqGbG0nLaI2jI2cA4L2WRQ6UDKBe',
  '230': '1jT-UlxO6Sf1P_CUgFMA7qke-gok6f462', '238': '11FR41rxjQ7EH8F9eyv0TEtw9d2WVvJxV',
};
function printSheetUrl(no) {
  return PRINT_SHEETS[no] ? `https://drive.google.com/file/d/${PRINT_SHEETS[no]}/view` : null;
}

// Category display order mirrors the crew app (work top-of-wall down for MEP; FF&E families for rooms).
function groupByCategory(entries) {
  const groups = new Map();
  for (const [id, it] of entries) {
    const cat = it.category || 'Other';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push([id, it]);
  }
  return groups;
}

function specRef(it) {
  if (!it.src) return '';
  const parts = String(it.src).split(';').map(x => x.trim()).filter(Boolean);
  const lead = (parts[0].match(/^[A-Z]{1,2}[0-9]{3}(?:\.[0-9]+)?/) || [parts[0].split(' ')[0]])[0];
  const more = parts.length > 1 ? ` +${parts.length - 1}` : '';
  return `<span class="speclink">${ic('jump')}${esc(lead)}${more}</span>`;
}
function fullSrc(it) { return String(it.src || '').trim(); }

// Crew-facing short label (Austin: "too much clutter"). The full label, model
// numbers, and the verification paper trail stay intact in the item sheet;
// the list row carries only what a punch walk needs.
function shortLabel(it) {
  let t = String(it.label || '');
  t = t.split(' \u2014 ')[0];                                   // cut at " — "
  t = t.split(/\s+-\s+(?=[A-Z]{1,4}-?\d)/)[0];                  // " - WC-3 ..." tag dumps
  t = t.split(/\s+-\s+(?=[A-Z][a-z]+\s+[A-Z0-9])/)[0];          // " - Danby DDW..." brand+model
  t = t.replace(/\s*\(.{12,}\)\s*$/, '');                      // trailing long parenthetical
  t = t.trim().replace(/[,;:]$/, '');
  if (t.length > 64) {
    const cut = t.slice(0, 64);
    t = cut.slice(0, Math.max(cut.lastIndexOf(' '), 40)) + '\u2026';
  }
  return t || it.label || '';
}
function shortCode(it) {
  const c = String(it.code || '').trim();
  if (!c || c === '\u2014' || c === '-' || c === '\u2013') return '';
  if (c.length <= 10) return c;
  const head = c.split('/')[0].trim().split(' ').slice(0, 2).join(' ');
  return (head.length > 10 ? head.slice(0, 9) : head) + '\u2026';
}
function hasDetail(it) {
  return !!(it.instanceNote || (it.label && shortLabel(it) !== it.label)
    || (it.code && String(it.code).length > 10) || String(it.src || '').includes(';'));
}

// ---------- screens ----------

function renderDashboard(ctx) {
  const { store } = ctx;
  const rooms = store.guestRooms();
  let total = 0, done = 0, issues = 0, complete = 0;
  const rows = rooms.map(r => {
    const s = store.roomStats(r);
    total += s.total; done += s.done; issues += s.openIssues;
    if (s.complete) complete++;
    return { r, s };
  });
  const mepCount = rooms.reduce((n, r) => n + (store.mepDoc(r.number) ? 1 : 0), 0);
  const pct = total ? Math.round(done / total * 100) : 0;

  const root = el(`<div>
    <div class="pagehead">
      <h1 class="h1">Dashboard</h1>
      <span class="sub">${esc(SLICE_NOTE)}</span>
      <span class="spacer"></span>
    </div>
    <div class="kpis">
      <div class="kpi"><div class="kl">Items checked</div><div class="kv">${done}<small> of ${total}</small></div><div class="kc">${pct}% of the three-room slice</div></div>
      <div class="kpi"><div class="kl">Open issues</div><div class="kv">${issues}</div><div class="kc">issue flags plus red room notes</div></div>
      <div class="kpi"><div class="kl">Rooms complete</div><div class="kv">${complete}<small> of ${rows.length}</small></div><div class="kc">every line checked, zero open issues</div></div>
      <div class="kpi"><div class="kl">MEP punch lists</div><div class="kv">${mepCount}</div><div class="kc">separate from FF&amp;E, per room</div></div>
    </div>
    <section class="card">
      <div class="card-head"><h2>Rooms</h2><span class="card-cap">floor 1 slice</span><span class="spacer"></span><span class="card-cap">tap a room to open its checklist</span></div>
      <div class="rlist"></div>
    </section>
  </div>`);

  const list = root.querySelector('.rlist');
  for (const { r, s } of rows) list.append(roomRow(r, s));
  return root;
}

function roomRow(r, s) {
  const status = s.complete ? ['done', 'Done'] : s.openIssues > 0 ? ['issue', 'Issues'] : s.done > 0 ? ['prog', 'In Progress'] : ['ns', 'Not Started'];
  const row = el(`<div class="room-row" role="link" tabindex="0" aria-label="Open room ${esc(r.number)}">
    <span class="rno mono">${esc(r.number)}</span>
    <span class="rtype">${esc(r.typeLabel || r.type)}</span>
    <span class="chip ${status[0]} sm"><i class="dot"></i>${status[1]}</span>
    <span class="riss ${s.openIssues ? '' : 'none'}">${s.openIssues ? ic('flag', 'flag-ic') + ' ' + s.openIssues + ' open' : '0 open'}</span>
    <span class="rfrac">${s.done}/${s.total}</span>
    ${ic('chev', 'chev')}
  </div>`);
  pressable(row, { tap: () => { location.hash = `#/room/${r.number}`; } });
  return row;
}

function renderRooms(ctx) {
  const { store } = ctx;
  const rooms = store.guestRooms();
  const filter = sessionStorage.getItem('h2sep-p-filter') || 'all';
  const stats = rooms.map(r => ({ r, s: store.roomStats(r) }));
  const buckets = {
    all: stats,
    prog: stats.filter(x => x.s.done > 0 && !x.s.complete),
    issues: stats.filter(x => x.s.openIssues > 0),
    done: stats.filter(x => x.s.complete),
    ns: stats.filter(x => x.s.done === 0 && x.s.total > 0),
  };
  const chips = [['all', 'All'], ['prog', 'In progress'], ['issues', 'Issues'], ['done', 'Done'], ['ns', 'Not started']];

  const root = el(`<div>
    <div class="pagehead"><h1 class="h1">Rooms</h1><span class="sub">3 of 115 in this slice · floor 1</span></div>
    <div class="filters">${chips.map(([k, l]) => `<button class="fl ${k === filter ? 'on' : ''}" data-f="${k}">${l} <b>${buckets[k].length}</b></button>`).join('')}</div>
    <section class="card"><div class="rlist"></div></section>
  </div>`);
  root.querySelectorAll('.fl').forEach(b => b.addEventListener('click', () => {
    sessionStorage.setItem('h2sep-p-filter', b.dataset.f); location.hash = '#/rooms'; dispatchEvent(new HashChangeEvent('hashchange'));
  }));
  const list = root.querySelector('.rlist');
  const shown = buckets[filter] || stats;
  if (!shown.length) list.append(el(`<div class="coming"><b>No rooms match</b><span>Nothing in this slice matches that filter right now.</span></div>`));
  for (const { r, s } of shown) list.append(roomRow(r, s));
  return root;
}

function renderRoom(ctx, { no }) {
  const { store } = ctx;
  const doc = store.getDoc(no);
  if (!doc) return el(`<div class="coming">${ic('door')}<b>Room ${esc(no)} is not in this slice</b><span>${esc(SLICE_NOTE)}</span></div>`);

  const view = new URLSearchParams((location.hash.split('?')[1] || '')).get('view') === 'mep' && store.mepDoc(no) ? 'mep' : 'ffe';
  const active = view === 'mep' ? store.mepDoc(no) : doc;
  const s = store.roomStats(active);
  const mep = store.mepDoc(no);
  const has3d = ctx.modelRooms.includes(no);

  const root = el(`<div>
    <div class="pagehead">
      <button class="icon-btn" data-back aria-label="Back to rooms">${ic('back')}</button>
      <div>
        <h1 class="h1">Room ${esc(no)}</h1>
        <div class="sub">${esc(doc.typeLabel || doc.type)} · Floor ${esc(doc.floor)}</div>
      </div>
      <span class="spacer"></span>
      <div class="hdr-actions">
        ${has3d ? `<a class="btn" href="#/bim/${esc(no)}">${ic('cube')}3D model</a>` : ''}
        ${printSheetUrl(no) ? `<a class="btn" href="${printSheetUrl(no)}" target="_blank" rel="noopener">${ic('printer')}Print sheet</a>` : ''}
        <button class="btn" data-note>${ic('note')}Room notes${noteCount(doc) ? ` · ${noteCount(doc)}` : ''}</button>
      </div>
    </div>
    ${mep ? `<div class="filters"><span class="seg">
      <button data-v="ffe" class="${view === 'ffe' ? 'on' : ''}">FF&amp;E · ${store.roomStats(doc).done}/${store.roomStats(doc).total}</button>
      <button data-v="mep" class="${view === 'mep' ? 'on' : ''}">MEP PUNCH · ${store.roomStats(mep).done}/${store.roomStats(mep).total}</button>
    </span></div>` : ''}
    <section class="card">
      <div class="card-head">
        <h2>${view === 'mep' ? 'MEP punch' : 'Checklist'}</h2>
        <span class="card-cap">${s.done} of ${s.total} checked</span>
        <span class="spacer"></span>
        <span class="bar cy" style="width:130px"><i style="width:${s.total ? s.done / s.total * 100 : 0}%"></i></span>
      </div>
      <div class="how" style="padding:8px 16px;color:var(--subtle);font-size:11.5px">Tap a line to stamp your initials, like the paper sheet. Press and hold for the issue sheet.</div>
      <div class="ilist"></div>
    </section>
  </div>`);

  root.querySelector('[data-back]').addEventListener('click', () => { location.hash = '#/rooms'; });
  root.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => {
    location.hash = `#/room/${no}` + (b.dataset.v === 'mep' ? '?view=mep' : '');
  }));
  root.querySelector('[data-note]').addEventListener('click', () => notesSheet(ctx, no));

  const list = root.querySelector('.ilist');
  const activeId = view === 'mep' ? no + '-MEP' : no;
  const groups = groupByCategory(store.liveItems(active));
  for (const [cat, entries] of groups) {
    const done = entries.filter(([, it]) => it.checked).length;
    list.append(el(`<div class="cat-head">${esc(cat)}<span style="letter-spacing:0">·</span><span>${done} of ${entries.length} checked</span></div>`));
    for (const [id, it] of entries) list.append(itemRow(ctx, activeId, id, it));
  }
  return root;
}

function noteCount(doc) {
  return Object.values(doc.notes || {}).filter(n => !n.deleted).length;
}

function itemRow(ctx, docId, itemId, it) {
  const { store } = ctx;
  const flagged = it.reliability === 'FLAGGED';
  const openIssue = it.issue && !it.issueResolved;
  const row = el(`<div class="item-row ${flagged ? 'flagged' : ''}" role="button" tabindex="0"
      aria-label="${esc(it.label)}${it.checked ? ', checked' : ''}">
    <span class="stamp ${it.checked ? 'checked' : ''}">${it.checked ? esc(it.initials || '✓') : ''}</span>
    <span class="mid">
      <span class="l1">
        ${shortCode(it) ? `<span class="tag">${esc(shortCode(it))}</span>` : ''}
        <span class="nm">${esc(shortLabel(it))}</span>
        ${it.qty > 1 ? `<span class="qty">x${it.qty}</span>` : ''}
        ${flagged ? `<span class="chip hold sm">FLAGGED</span>` : ''}
      </span>
      <span class="l2">
        ${it.issue ? `<span class="issue-pill ${it.issueResolved ? 'res' : ''}">${ic('flag', 'flag-ic')}${esc(it.issue)}</span>` : ''}
        ${specRef(it)}
        ${it.checked && it.checkedAt ? `<span class="meta">${esc(it.initials)} · ${fmtWhen(it.checkedAt)}</span>` : (it.checked ? `<span class="meta">${esc(it.initials)} · from paper</span>` : '')}
        ${(it.attachments || []).length ? `<span class="detail-cue clip">${ic('clip')}${(it.attachments).length}</span>` : ''}
        ${hasDetail(it) ? `<span class="detail-cue">${ic('note')}details</span>` : ''}
      </span>
    </span>
  </div>`);

  pressable(row, {
    tap: () => {
      if (!store.user) return identityGate(ctx);
      if (openIssue || it.issue || flagged) return itemSheet(ctx, docId, itemId);
      store.check(docId, itemId, !it.checked);
      if (!it.checked) toast(`Checked ${it.code || it.label}`, { label: 'Undo', fn: () => store.check(docId, itemId, false) });
    },
    hold: () => itemSheet(ctx, docId, itemId),
  });
  return row;
}

function itemSheet(ctx, docId, itemId) {
  const { store } = ctx;
  const doc = store.getDoc(docId);
  const it = doc.items[itemId];
  const { close } = sheet(`
    <div class="sh">
      ${shortCode(it) ? `<span class="tag">${esc(shortCode(it))}</span>` : ''}
      <b style="font-size:15px">${esc(shortLabel(it))}</b>
      ${it.qty > 1 ? `<span class="qty">x${it.qty}</span>` : ''}
      <button class="icon-btn x" data-close aria-label="Close">${ic('x')}</button>
    </div>
    ${shortLabel(it) !== (it.label || '') || (it.code && String(it.code).length > 10) || String(it.src || '').includes(';') ? `<div class="fulldetail">${it.code && String(it.code).length > 10 ? `<div class="fd-code">${esc(it.code)}</div>` : ''}${shortLabel(it) !== (it.label || '') ? `<div>${esc(it.label)}</div>` : ''}${String(it.src || '').includes(';') ? `<div class="fd-src"><span>Sources</span> ${esc(fullSrc(it))}</div>` : ''}</div>` : ''}
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:6px">
      <button class="stamp big ${it.checked ? 'checked' : ''}" data-check>${it.checked ? esc(it.initials) : ''}</button>
      <div style="font-size:13px">${it.checked ? `<b>Checked</b> · ${esc(it.initials)}${it.checkedAt ? ' · ' + fmtWhen(it.checkedAt) : ' · from paper'}` : '<b>Not checked off</b> · tap the box to stamp your initials'}</div>
      <span class="spacer"></span>${specRef(it)}
    </div>
    ${it.reliability === 'FLAGGED' && it.instanceNote ? `<div class="conflict"><div class="ch">${ic('flag', 'flag-ic')}FLAGGED · SOURCES DISAGREE</div><div style="font-size:13px;padding:6px 0">${esc(it.instanceNote)}</div><div class="foot">Do not order or close from either position. Only Austin closes conflicts.</div></div>` : ''}
    ${it.reliability !== 'FLAGGED' && it.instanceNote ? `<div class="vnote"><div class="vn-h">Verification notes</div><div>${esc(it.instanceNote)}</div></div>` : ''}
    ${(it.attachments || []).length ? `<div class="attaches">${it.attachments.map(a => `<a class="btn attach" href="${esc(a.url)}" target="_blank" rel="noopener">${ic('clip')}${esc(a.label)}</a>`).join('')}</div>` : ''}
    <div class="field"><label>Issue</label></div>
    <div class="qps">${QUICK_PICKS.map(q => `<button class="qp ${it.issue === q ? 'on' : ''}" data-q="${q}">${q}</button>`).join('')}</div>
    <div class="field"><label>Custom note on the issue</label>
      <input data-custom placeholder="${it.issue && !QUICK_PICKS.includes(it.issue) ? esc(it.issue) : 'Type what is wrong (optional)'}" value="${!QUICK_PICKS.includes(it.issue || '') ? esc(it.issue || '') : ''}"/></div>
    <div class="srow">
      ${it.issue && !it.issueResolved ? '<button class="btn" data-resolve>Mark issue resolved</button>' : ''}
      ${it.issue ? '<button class="btn" data-clear>Clear issue</button>' : ''}
      <button class="btn primary" data-save>Save</button>
    </div>`);

  const sheetEl = document.querySelector('.sheet');
  sheetEl.querySelector('[data-check]').addEventListener('click', () => {
    if (!store.user) { close(); return identityGate(ctx); }
    store.check(docId, itemId, !it.checked); close();
  });
  let picked = QUICK_PICKS.includes(it.issue || '') ? it.issue : '';
  sheetEl.querySelectorAll('.qp').forEach(b => b.addEventListener('click', () => {
    picked = picked === b.dataset.q ? '' : b.dataset.q;
    sheetEl.querySelectorAll('.qp').forEach(x => x.classList.toggle('on', x.dataset.q === picked));
  }));
  sheetEl.querySelector('[data-save]').addEventListener('click', () => {
    const custom = sheetEl.querySelector('[data-custom]').value.trim();
    const issue = custom || picked;
    if (issue !== (it.issue || '')) store.setIssue(docId, itemId, issue);
    close();
  });
  sheetEl.querySelector('[data-resolve]')?.addEventListener('click', () => { store.resolveIssue(docId, itemId); close(); });
  sheetEl.querySelector('[data-clear]')?.addEventListener('click', () => { store.setIssue(docId, itemId, ''); close(); });
}

function notesSheet(ctx, roomNo) {
  const { store } = ctx;
  const doc = store.getDoc(roomNo);
  const notes = Object.entries(doc.notes || {}).filter(([, n]) => !n.deleted)
    .sort((a, b) => String(a[1].createdAt).localeCompare(String(b[1].createdAt)));
  const { close } = sheet(`
    <div class="sh"><b style="font-size:15px">Room ${esc(roomNo)} notes</b><button class="icon-btn x" data-close aria-label="Close">${ic('x')}</button></div>
    <div class="card" style="margin-bottom:10px">${notes.length ? notes.map(([id, n]) => `
      <div class="note-row ${n.resolved ? 'resolved' : ''}">
        <span class="nfl ${n.flag === 'issue' ? 'issue' : 'info'}">${n.flag === 'issue' ? 'ISSUE' : 'INFO'}</span>
        <span class="nt">${esc(n.text)}</span>
        <span class="nd">${n.by ? esc(n.by) + ' · ' : ''}${fmtWhen(n.createdAt)}</span>
        ${!n.resolved ? `<button class="btn" style="padding:3px 9px;font-size:11px" data-res="${id}">Resolve</button>` : ''}
      </div>`).join('') : '<div class="coming" style="padding:22px"><b>No notes yet</b></div>'}</div>
    <div class="field"><label>New note</label><textarea data-text rows="2" placeholder="Whole-room note, like the star notes on paper"></textarea></div>
    <div style="display:flex;gap:8px;margin-top:8px;align-items:center">
      <label style="display:flex;gap:6px;align-items:center;font-size:12.5px"><input type="checkbox" data-flag/> Mark as issue (red)</label>
      <span class="spacer"></span><button class="btn primary" data-add>Add note</button>
    </div>`);
  const s = document.querySelector('.sheet');
  s.querySelectorAll('[data-res]').forEach(b => b.addEventListener('click', () => { store.resolveNote(roomNo, b.dataset.res); close(); notesSheet(ctx, roomNo); }));
  s.querySelector('[data-add]').addEventListener('click', () => {
    const text = s.querySelector('[data-text]').value.trim();
    if (!text) return;
    if (!store.user) { close(); return identityGate(ctx); }
    store.addNote(roomNo, text, s.querySelector('[data-flag]').checked ? 'issue' : 'info');
    close(); notesSheet(ctx, roomNo);
  });
}

export function identityGate(ctx) {
  const { store } = ctx;
  const { close } = sheet(`
    <div class="sh"><b style="font-size:15px">Who is checking?</b></div>
    <div style="font-size:13px;color:var(--muted);margin-bottom:4px">Your initials go on every box you check, exactly like initialing the paper sheet.</div>
    <div class="field"><label>Your name</label><input data-name maxlength="40" placeholder="Full name"/></div>
    <div class="field"><label>Initials</label><input data-init maxlength="3" placeholder="AB" style="width:110px;text-transform:uppercase;font-family:var(--mono);font-weight:700"/></div>
    <div class="srow"><button class="btn primary" data-go>Start</button></div>`);
  const s = document.querySelector('.sheet');
  const nameEl = s.querySelector('[data-name]'), initEl = s.querySelector('[data-init]');
  let touched = false;
  initEl.addEventListener('input', () => { touched = true; });
  nameEl.addEventListener('input', () => {
    if (!touched) initEl.value = nameEl.value.split(/\s+/).filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 3);
  });
  s.querySelector('[data-go]').addEventListener('click', () => {
    if (!initEl.value.trim()) { toast('Initials are required to check items'); return; }
    store.setUser(nameEl.value || initEl.value, initEl.value);
    close();
  });
}

function comingSoon(title, body) {
  return () => el(`<div><div class="pagehead"><h1 class="h1">${esc(title)}</h1></div>
    <section class="card"><div class="coming">${ic('wrench')}<b>${esc(title)} ships with the full rollout</b><span>${esc(body)} The approved mock for this screen is in the Mock Book, and the module slot is already registered.</span></div></section></div>`);
}

function renderActivity(ctx) {
  const { store } = ctx;
  const acts = [...store.activity].reverse();
  return el(`<div>
    <div class="pagehead"><h1 class="h1">Activity</h1><span class="sub">every action in this browser, newest first</span></div>
    <section class="card">${acts.length ? acts.map(a => `
      <div class="note-row"><span class="nfl info">${esc(a.by)}</span><span class="nt">${esc(a.text)}</span><span class="nd">${fmtWhen(a.at)}</span></div>`).join('')
      : `<div class="coming">${ic('pulse')}<b>Nothing yet</b><span>Check a line in any room and it lands here with your initials and a timestamp.</span></div>`}</section>
  </div>`);
}

export function trackingModule() {
  return {
    id: 'tracking',
    name: 'Tracking',
    nav: [
      { path: '#/', label: 'Dashboard', icon: 'grid' },
      { path: '#/rooms', label: 'Rooms', icon: 'door', count: '3' },
      { path: '#/common', label: 'Common Areas', icon: 'layers', count: '66' },
      { path: '#/categories', label: 'Categories', icon: 'tagi' },
      { path: '#/assignments', label: 'Assignments', icon: 'people' },
      { path: '#/contacts', label: 'Contacts', icon: 'contact' },
      { path: '#/files', label: 'Files', icon: 'file' },
      { path: '#/activity', label: 'Activity', icon: 'pulse' },
    ],
    routes: [
      { match: /^#\/$/, render: renderDashboard },
      { match: /^#\/rooms$/, render: renderRooms },
      { match: /^#\/room\/(?<no>[^?]+)/, render: renderRoom },
      { match: /^#\/activity$/, render: renderActivity },
      { match: /^#\/common$/, render: comingSoon('Common Areas', 'All 66 spaces are confirmed (ruling D2) and arrive with the data rollout.') },
      { match: /^#\/categories$/, render: comingSoon('Categories', 'The 21 real categories plus the custom category creator.') },
      { match: /^#\/assignments$/, render: comingSoon('Assignments', 'Assign rooms, filtered sets, or whole categories to your subs with due dates.') },
      { match: /^#\/contacts$/, render: comingSoon('Contacts', 'Imported from your project directory, editable like the first app.') },
      { match: /^#\/files$/, render: comingSoon('Files', 'Plans, submittals, and exports with spec jump links.') },
    ],
  };
}
