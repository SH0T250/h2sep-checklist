// Tracking module (module one): rooms, checklists, check-off, issues, notes.
// FF&E and MEP punch stay separate populations, like the crew app today.

import { ic, el, esc, fmtWhen, toast, sheet, pressable } from '../../core/ui.js';

const QUICK_PICKS = ['NEED INSTALL', 'NEED PROPER PLACE', 'IN BOX', 'DAMAGED', 'MISSING', 'WRONG ITEM'];
// Copy that states a count has to be derived, or it goes stale the moment the
// build grows - which is worse than saying nothing, because it reads as fact.
function sliceNote(store) {
  const n = store ? store.guestRooms().length : 0;
  return `Floor 1: ${n} guest rooms built. Floors 2 to 4 arrive with the next rollout.`;
}

// The printer icon opens the live in-app sheet (#/print/<no>), always current.
// Drive PDF revisions are generated and uploaded by tools at each milestone.

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
      <span class="sub">${esc(sliceNote(store))}</span>
      <span class="spacer"></span>
    </div>
    <div class="kpis">
      <div class="kpi"><div class="kl">Items checked</div><div class="kv">${done}<small> of ${total}</small></div><div class="kc">${pct}% of floor 1</div></div>
      <div class="kpi"><div class="kl">Open issues</div><div class="kv">${issues}</div><div class="kc">issue flags plus red room notes</div></div>
      <div class="kpi"><div class="kl">Rooms complete</div><div class="kv">${complete}<small> of ${rows.length}</small></div><div class="kc">every line checked, zero open issues</div></div>
      <div class="kpi"><div class="kl">MEP punch lists</div><div class="kv">${mepCount}</div><div class="kc">separate from FF&amp;E, per room</div></div>
    </div>
    <section class="card">
      <div class="card-head"><h2>Rooms</h2><span class="card-cap">floor 1</span><span class="spacer"></span><span class="card-cap">tap a room to open its checklist</span></div>
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
    <div class="pagehead"><h1 class="h1">Rooms</h1><span class="sub">${rooms.length} guest rooms on floor 1</span></div>
    <div class="filters">${chips.map(([k, l]) => `<button class="fl ${k === filter ? 'on' : ''}" data-f="${k}">${l} <b>${buckets[k].length}</b></button>`).join('')}</div>
    <section class="card"><div class="rlist"></div></section>
  </div>`);
  root.querySelectorAll('.fl').forEach(b => b.addEventListener('click', () => {
    sessionStorage.setItem('h2sep-p-filter', b.dataset.f); location.hash = '#/rooms'; dispatchEvent(new HashChangeEvent('hashchange'));
  }));
  const list = root.querySelector('.rlist');
  const shown = buckets[filter] || stats;
  if (!shown.length) list.append(el(`<div class="coming"><b>No rooms match</b><span>Nothing on floor 1 matches that filter right now.</span></div>`));
  for (const { r, s } of shown) list.append(roomRow(r, s));
  return root;
}

function renderRoom(ctx, { no }) {
  const { store } = ctx;
  const doc = store.getDoc(no);
  if (!doc) return el(`<div class="coming">${ic('door')}<b>Room ${esc(no)} is not in this build</b><span>${esc(sliceNote(store))}</span></div>`);

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
        <a class="btn" href="#/print/${esc(no)}">${ic('printer')}Print sheet</a>
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
  // Never concatenate the suffix here: a space MEP doc is '-M', not '-MEP'.
  const activeId = view === 'mep' ? store.mepDocId(no) : no;
  const groups = groupByCategory(store.liveItems(active));
  for (const [cat, entries] of groups) {
    const done = entries.filter(([, it]) => it.checked).length;
    list.append(el(`<div class="cat-head">${esc(cat)}<span style="letter-spacing:0">·</span><span>${done} of ${entries.length} checked</span>
      <span class="spacer"></span>${ownerChip(store, cat, no)}</div>`));
    for (const [id, it] of entries) list.append(itemRow(ctx, activeId, id, it));
  }
  return root;
}

// A company name short enough to sit next to initials on a checklist line.
function shortCo(co) {
  let t = String(co || '').trim().replace(/,?\s+(LLC|L\.L\.C\.|Inc\.?|Corp\.?|Corporation|Company|Co\.)$/i, '');
  if (t.length > 22) t = t.slice(0, 21).trimEnd() + '\u2026';
  return t;
}
// Companies on the job, from the directory module's doc. Guarded: the identity
// sheet still works with a plain text box if the directory is not loaded.
function companyOptions(store) {
  const dir = store.getDoc('_dir');
  return [...new Set(Object.values(dir?.items || {}).filter(c => !c.deleted && c.org).map(c => c.org))]
    .sort((a, b) => a.localeCompare(b));
}
function contactByName(store, name) {
  const n = String(name || '').trim().toLowerCase();
  if (!n) return null;
  return Object.values(store.getDoc('_dir')?.items || {}).find(c => !c.deleted && String(c.name || '').toLowerCase() === n) || null;
}

// Who owns a scope, read straight off the directory module's assignment doc.
// Kept as a guarded read rather than an import so tracking still runs on its
// own if the directory module is not registered.
function ownerChip(store, category, roomNo) {
  const asg = store.getDoc('_asg');
  const hit = Object.values(asg?.items || {}).find(a =>
    !a.deleted && a.category === category && (a.rooms || []).includes(String(roomNo)));
  const href = `#/assignments?cat=${encodeURIComponent(category)}&rooms=${encodeURIComponent(roomNo)}`;
  return hit
    ? `<a class="owner-chip" href="${href}" title="${esc(hit.role || 'Install')} · ${esc(hit.contactName || '')}">${ic('people')}${esc(hit.org || 'assigned')}</a>`
    : `<a class="owner-chip none" href="${href}">${ic('people')}assign</a>`;
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
        ${it.checked ? `<span class="meta">${esc(it.initials)}${it.checkedByCo ? ` · <b class="co">${esc(shortCo(it.checkedByCo))}</b>` : ''} · ${it.checkedAt ? fmtWhen(it.checkedAt) : 'from paper'}</span>` : ''}
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
      <div style="font-size:13px">${it.checked ? `<b>Checked</b> · ${esc(it.initials)}${it.checkedByCo ? ' · ' + esc(it.checkedByCo) : ''}${it.checkedAt ? ' · ' + fmtWhen(it.checkedAt) : ' · from paper'}` : '<b>Not checked off</b> · tap the box to stamp your initials'}</div>
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
  const u = store.user;
  let orgs = companyOptions(store);
  // The directory arrives over live sync, often seconds AFTER this sheet opens
  // on a fresh device - which left the company list empty. Subscribe while the
  // sheet is up and refill the options the moment the directory lands.
  let unsub = null;
  const { close } = sheet(`
    <div class="sh"><b style="font-size:15px">Who is checking?</b></div>
    <div style="font-size:13px;color:var(--muted);margin-bottom:4px">Your initials go on every box you check, exactly like initialing the paper sheet. Your company rides along with them, so anyone reading the list knows which outfit signed the line.</div>
    <div class="field"><label>Your name</label><input data-name maxlength="40" placeholder="Full name" value="${esc(u?.name || '')}"/></div>
    <div class="field"><label>Initials</label><input data-init maxlength="3" placeholder="AB" value="${esc(u?.initials || '')}" style="width:110px;text-transform:uppercase;font-family:var(--mono);font-weight:700"/></div>
    <div class="field"><label>Company you work for</label>
      <select data-co>
        <option value="">Pick your company</option>
        ${orgs.map(o => `<option ${u?.company === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}
        <option value="__other" ${u?.company && !orgs.includes(u.company) ? 'selected' : ''}>Not on the list, type it</option>
      </select></div>
    <div class="field" data-otherwrap style="display:${u?.company && !orgs.includes(u.company) ? 'block' : 'none'}"><label>Company name</label>
      <input data-other maxlength="60" placeholder="Company name" value="${esc(u?.company && !orgs.includes(u.company) ? u.company : '')}"/></div>
    <div class="srow"><button class="btn primary" data-go>Start</button></div>`, { onClose: () => { if (unsub) unsub(); } });
  const s = document.querySelector('.sheet');
  const nameEl = s.querySelector('[data-name]'), initEl = s.querySelector('[data-init]');
  const coEl = s.querySelector('[data-co]'), otherEl = s.querySelector('[data-other]');
  const otherWrap = s.querySelector('[data-otherwrap]');
  const fillCompanies = () => {
    const now = companyOptions(store);
    if (now.length === orgs.length) return;
    orgs = now;
    const picked = coEl.value;
    coEl.innerHTML = `<option value="">Pick your company</option>`
      + orgs.map(o => `<option>${esc(o)}</option>`).join('')
      + `<option value="__other">Not on the list, type it</option>`;
    if (picked && [...coEl.options].some(o => o.value === picked)) coEl.value = picked;
  };
  unsub = store.subscribe(fillCompanies);
  fillCompanies();
  let touched = !!u?.initials, coTouched = !!u?.company;
  initEl.addEventListener('input', () => { touched = true; });
  coEl.addEventListener('change', () => {
    coTouched = true;
    otherWrap.style.display = coEl.value === '__other' ? 'block' : 'none';
  });
  nameEl.addEventListener('input', () => {
    if (!touched) initEl.value = nameEl.value.split(/\s+/).filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 3);
    // If they are already in the project directory, their company is known.
    const hit = contactByName(store, nameEl.value);
    if (hit && !coTouched && orgs.includes(hit.org)) coEl.value = hit.org;
  });
  s.querySelector('[data-go]').addEventListener('click', () => {
    if (!initEl.value.trim()) { toast('Initials are required to check items'); return; }
    const company = coEl.value === '__other' ? otherEl.value.trim() : coEl.value;
    if (!company) { toast('Pick the company you work for'); return; }
    if (unsub) unsub();
    store.setUser(nameEl.value || initEl.value, initEl.value, company);
    close();
  });
}

// ---------- common areas (floor 1 spaces) ----------

function spaceRow(ctx, sp) {
  const { store } = ctx;
  const mep = store.mepDoc(sp.number);
  const a = store.roomStats(sp);
  const b = mep ? store.roomStats(mep) : { total: 0, done: 0, openIssues: 0 };
  const total = a.total + b.total, done = a.done + b.done, issues = a.openIssues + b.openIssues;
  const complete = total > 0 && done === total && issues === 0;
  const status = complete ? ['done', 'Done'] : issues > 0 ? ['issue', 'Issues'] : done > 0 ? ['prog', 'In Progress'] : ['ns', 'Not Started'];
  const row = el(`<div class="room-row" role="link" tabindex="0" aria-label="Open ${esc(sp.typeLabel || sp.number)}">
    <span class="rno mono" style="width:64px;font-size:13px">${esc(sp.number)}</span>
    <span class="rtype">${esc(sp.typeLabel || sp.type)}</span>
    <span class="chip ${status[0]} sm"><i class="dot"></i>${status[1]}</span>
    <span class="riss ${issues ? '' : 'none'}">${issues ? ic('flag', 'flag-ic') + ' ' + issues + ' open' : '0 open'}</span>
    <span class="rfrac">${done}/${total}</span>
    ${ic('chev', 'chev')}
  </div>`);
  pressable(row, { tap: () => { location.hash = `#/space/${sp.number}`; } });
  return row;
}

function renderCommon(ctx) {
  const { store } = ctx;
  const spaces = store.spaces();
  if (!spaces.length) {
    return comingSoon('Common Areas', 'The floor-1 spaces arrive with the data rollout.')();
  }
  let total = 0, done = 0, issues = 0;
  for (const sp of spaces) {
    const mep = store.mepDoc(sp.number);
    for (const d of [sp, mep].filter(Boolean)) {
      const st = store.roomStats(d);
      total += st.total; done += st.done; issues += st.openIssues;
    }
  }
  const root = el(`<div>
    <div class="pagehead"><h1 class="h1">Common Areas</h1>
      <span class="sub">${spaces.length} floor-1 spaces \u00b7 plan numbering from the architectural set</span></div>
    <div class="kpis">
      <div class="kpi"><div class="kl">Lines checked</div><div class="kv">${done}<small> of ${total}</small></div><div class="kc">FF&amp;E and MEP punch together</div></div>
      <div class="kpi"><div class="kl">Open issues</div><div class="kv">${issues}</div><div class="kc">flags and red space notes</div></div>
      <div class="kpi"><div class="kl">Spaces</div><div class="kv">${spaces.length}</div><div class="kc">every floor-1 space with a package</div></div>
    </div>
    <section class="card"><div class="rlist"></div></section>
  </div>`);
  const list = root.querySelector('.rlist');
  for (const sp of spaces) list.append(spaceRow(ctx, sp));
  return root;
}

function renderSpace(ctx, { id }) {
  const { store } = ctx;
  const doc = store.getDoc(id);
  if (!doc) return el(`<div class="coming">${ic('layers')}<b>${esc(id)} is not in this build</b>
    <span>Only floor-1 spaces with a package are built.</span></div>`);
  const mep = store.mepDoc(id);
  const view = new URLSearchParams((location.hash.split('?')[1] || '')).get('view') === 'mep' && mep ? 'mep' : 'ffe';
  const active = view === 'mep' ? mep : doc;
  const s = store.roomStats(active);
  const activeId = view === 'mep' ? store.mepDocId(id) : id;

  const root = el(`<div>
    <div class="pagehead">
      <button class="icon-btn" data-back aria-label="Back to common areas">${ic('back')}</button>
      <div><h1 class="h1">${esc(doc.typeLabel || doc.type)}</h1>
      <div class="sub">Space ${esc(doc.number)} \u00b7 Floor ${esc(doc.floor)}</div></div>
      <span class="spacer"></span>
      <div class="hdr-actions">
        <button class="btn" data-note>${ic('note')}Space notes${noteCount(doc) ? ` \u00b7 ${noteCount(doc)}` : ''}</button>
      </div>
    </div>
    ${mep ? `<div class="filters"><span class="seg">
      <button data-v="ffe" class="${view === 'ffe' ? 'on' : ''}">FF&amp;E \u00b7 ${store.roomStats(doc).done}/${store.roomStats(doc).total}</button>
      <button data-v="mep" class="${view === 'mep' ? 'on' : ''}">MEP PUNCH \u00b7 ${store.roomStats(mep).done}/${store.roomStats(mep).total}</button>
    </span></div>` : ''}
    <section class="card">
      <div class="card-head"><h2>${view === 'mep' ? 'MEP punch' : 'Checklist'}</h2>
        <span class="card-cap">${s.done} of ${s.total} checked</span><span class="spacer"></span>
        <span class="bar cy" style="width:130px"><i style="width:${s.total ? s.done / s.total * 100 : 0}%"></i></span></div>
      <div class="how" style="padding:8px 16px;color:var(--subtle);font-size:11.5px">Tap a line to stamp your initials. Press and hold for the issue sheet.</div>
      <div class="ilist"></div>
    </section>
  </div>`);
  root.querySelector('[data-back]').addEventListener('click', () => { location.hash = '#/common'; });
  root.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => {
    location.hash = `#/space/${id}` + (b.dataset.v === 'mep' ? '?view=mep' : '');
  }));
  root.querySelector('[data-note]').addEventListener('click', () => notesSheet(ctx, id));

  const list = root.querySelector('.ilist');
  for (const [cat, entries] of groupByCategory(store.liveItems(active))) {
    const done = entries.filter(([, it]) => it.checked).length;
    list.append(el(`<div class="cat-head">${esc(cat)}<span style="letter-spacing:0">\u00b7</span><span>${done} of ${entries.length} checked</span></div>`));
    for (const [iid, it] of entries) list.append(itemRow(ctx, activeId, iid, it));
  }
  return root;
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
      <div class="note-row"><span class="nfl info">${esc(a.by)}</span><span class="nt">${esc(a.text)}${a.byCo ? ` <b class="co">${esc(shortCo(a.byCo))}</b>` : ''}</span><span class="nd">${fmtWhen(a.at)}</span></div>`).join('')
      : `<div class="coming">${ic('pulse')}<b>Nothing yet</b><span>Check a line in any room and it lands here with your initials and a timestamp.</span></div>`}</section>
  </div>`);
}

// ---------- print sheet (live data, paper-styled, like the first build) ----------

function renderPrint(ctx, { no }) {
  const { store } = ctx;
  const doc = store.getDoc(no);
  if (!doc) return el(`<div class="coming"><b>Room ${esc(no)} is not in this build</b></div>`);
  const mep = store.mepDoc(no);
  const now = new Date();
  const stamp = `${now.toLocaleDateString('en-US')} · ${fmtWhen(now.toISOString())}`;

  function section(title, d) {
    const groups = groupByCategory(store.liveItems(d));
    let html = '';
    for (const [cat, entries] of groups) {
      html += `<div class="p-cat">${esc(cat.toUpperCase())}</div>`;
      for (const [, it] of entries) {
        const openIssue = it.issue && !it.issueResolved;
        html += `<div class="p-row">
          <span class="p-box">${it.checked ? esc(it.initials || '') : ''}</span>
          <span class="p-tag">${esc(shortCode(it) || '')}</span>
          <span class="p-lbl">${esc(shortLabel(it))}${it.qty > 1 ? ` <b>x${it.qty}</b>` : ''}
            ${openIssue ? `<span class="p-issue">! ${esc(it.issue)}</span>` : ''}</span>
        </div>`;
      }
    }
    return `<div class="p-sect"><div class="p-sect-h">${esc(title)}</div>${html}</div>`;
  }

  const notes = Object.values(doc.notes || {}).filter(n => !n.deleted && !n.resolved);
  // Legend of everyone whose initials appear on this sheet, and their company.
  const signers = [...new Set([doc, mep].filter(Boolean).flatMap(d =>
    store.liveItems(d).filter(([, it]) => it.checked && it.initials)
      .map(([, it]) => it.initials + (it.checkedByCo ? ' \u2014 ' + shortCo(it.checkedByCo) : ''))))].sort();
  const root = el(`<div class="paper-wrap">
    <div class="pagehead noprint">
      <button class="icon-btn" data-back aria-label="Back">${ic('back')}</button>
      <div><h1 class="h1">Room ${esc(no)} print sheet</h1>
        <div class="sub">generated from live data, current as of right now</div></div>
      <span class="spacer"></span>
      <button class="btn primary" data-print>${ic('printer')}Print or save PDF</button>
    </div>
    <div class="paper">
      <div class="p-head">
        <img src="${window.__H2SEP_LOGO || 'img/triun-logo.png'}" alt="Triun"/>
        <div class="p-title"><b>ROOM ${esc(no)}</b><span>${esc(doc.typeLabel || doc.type)} · Floor ${esc(doc.floor)}</span></div>
        <div class="p-tb">
          <div><span>PROJECT</span><b>H2SEP</b></div>
          <div><span>JOB</span><b>TRIUN 24030</b></div>
          <div><span>GENERATED</span><b>${esc(stamp)}</b></div>
        </div>
      </div>
      ${notes.length ? `<div class="p-notes"><b>ROOM NOTES:</b> ${notes.map(n => esc(n.text)).join(' · ')}</div>` : ''}
      ${section('FF&E CHECKLIST', doc)}
      ${mep ? `<div class="p-break"></div>${section('MEP PUNCH', mep)}
        <div class="p-sign"><span>Punch walked by: ____________________</span><span>Date: ____________</span></div>` : ''}
      ${signers.length ? `<div class="p-signers"><b>SIGNED BY:</b> ${signers.map(x => `${esc(x)}`).join(' &nbsp;·&nbsp; ')}</div>` : ''}
      <div class="p-foot">Initials in the box mean checked, like the paper sheet. Generated from live data · Triun Construction &amp; Engineering</div>
    </div>
  </div>`);
  root.querySelector('[data-back]').addEventListener('click', () => { location.hash = `#/room/${no}`; });
  root.querySelector('[data-print]').addEventListener('click', () => window.print());
  return root;
}

export function trackingModule(store) {
  return {
    id: 'tracking',
    name: 'Tracking',
    nav: [
      { path: '#/', label: 'Dashboard', icon: 'grid', order: 10 },
      { path: '#/rooms', label: 'Rooms', icon: 'door', order: 20,
        get count() { return store ? String(store.guestRooms().length) : ''; } },
      { path: '#/common', label: 'Common Areas', icon: 'layers', order: 30,
        get count() { return store ? String(store.spaces().length) : ''; } },
      { path: '#/categories', label: 'Categories', icon: 'tagi', order: 40 },
      { path: '#/files', label: 'Files', icon: 'file', order: 70 },
      { path: '#/activity', label: 'Activity', icon: 'pulse', order: 80 },
    ],
    routes: [
      { match: /^#\/$/, render: renderDashboard },
      { match: /^#\/rooms$/, render: renderRooms },
      { match: /^#\/room\/(?<no>[^?]+)/, render: renderRoom },
      { match: /^#\/print\/(?<no>[^?]+)/, render: renderPrint },
      { match: /^#\/activity$/, render: renderActivity },
      { match: /^#\/common$/, render: renderCommon },
      { match: /^#\/space\/(?<id>[^?]+)/, render: renderSpace },
      { match: /^#\/categories$/, render: comingSoon('Categories', 'The 21 real categories plus the custom category creator.') },
      { match: /^#\/files$/, render: comingSoon('Files', 'Plans, submittals, and exports with spec jump links.') },
    ],
  };
}
