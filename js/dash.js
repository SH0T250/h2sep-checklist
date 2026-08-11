// H2SEP Live Dashboard — realtime view over the same Firestore the app
// writes to, and (since v1.18.0) an editing surface with the app's parity:
// tap-to-check with initials, the issue sheet, and PIN-gated bulk edits.
//
// Data + writes ride js/store.js — the app's own backend — so every write
// invariant (atomic check groups, soft deletes, listeners-after-sign-in)
// is inherited rather than re-implemented. ?demo=1 renders the bundled
// demo DB (device-local, clearly labeled DEMO).
import * as store from './store.js';
import * as edit from './dash-edit.js';
import { esc, roomSort, isSpaceDoc, roomStats, isMepDoc, mepParent } from './util.js';
import { initRefs } from './refs.js';

const $ = (id) => document.getElementById(id);

let lastUpdate = null;
let bootAt = Date.now();

// ---------- data ----------

async function start() {
  store.subscribe(() => { lastUpdate = new Date(); render(); });
  await store.init();
  store.ensureAllFloorsSubscribed();

  if (store.getMode() === 'demo') {
    // Give demo check-offs synthetic times spread over the past week so the
    // feed and activity chart demonstrate themselves (clearly labeled DEMO).
    const ctx = store.getBulkContext();
    let i = 0, touched = false;
    for (const r of store.getAllDocs()) {
      for (const [id, it] of Object.entries(r.items || {})) {
        if (it.checked && !it.checkedAtLocal) {
          const d = new Date();
          d.setDate(d.getDate() - (i % 6));
          d.setHours(8 + (i * 3) % 9, (i * 17) % 60, 0, 0);
          ctx.applyDemo(r.number, id, { checkedAtLocal: d.toISOString() });
          touched = true;
          i++;
        }
      }
    }
    if (touched) ctx.commitDemo();
  }

  edit.initEdit({ refresh: render });
  render();

  // The plan snippets and submittals shown in every item sheet come from the
  // refs index, which is inert until it is fetched — without this the
  // References section renders empty on a board that has the data. Non-blocking:
  // the board paints first, refs fill in when the index lands.
  initRefs().then(render).catch(e => console.warn('refs index unavailable', e));
}

function liveState() {
  if (store.getMode() === 'demo') return 'demo';
  if (store.isReady()) {
    if (!store.isOnline()) return 'cache';
    return store.isFromCache && store.isFromCache() ? 'reconnecting' : 'on';
  }
  // No data yet: distinguish "still connecting" from "sign-in is being
  // blocked" (site wifi with a filter) the way the old dashboard did.
  if (store.isOnline() && !store.getUid() && Date.now() - bootAt > 15_000) return 'authfail';
  return 'connecting';
}

function setLive(state) {
  const pill = $('live-pill');
  // Unsynced local writes must stay visible after the 3-second toast dies —
  // the pill is the one always-on surface, so it carries the queue count.
  const pend = store.pendingCount ? store.pendingCount() : 0;
  const q = pend ? ` · ${pend} SYNCING` : '';
  if (state === 'on') { pill.className = 'live-pill on'; pill.innerHTML = '<span class="live-dot"></span>LIVE' + q; }
  else if (state === 'demo') { pill.className = 'live-pill off'; pill.innerHTML = '<span class="live-dot"></span>DEMO DATA'; }
  else if (state === 'reconnecting') { pill.className = 'live-pill off'; pill.innerHTML = '<span class="live-dot"></span>RECONNECTING…' + q; }
  else if (state === 'cache') { pill.className = 'live-pill off'; pill.innerHTML = '<span class="live-dot"></span>OFFLINE — CACHED' + (pend ? ` · ${pend} QUEUED` : ''); }
  else if (state === 'authfail') { pill.className = 'live-pill off'; pill.innerHTML = '<span class="live-dot"></span>SIGN-IN BLOCKED — RETRYING (network filter?)'; }
  else { pill.className = 'live-pill off'; pill.innerHTML = '<span class="live-dot"></span>CONNECTING…'; }
}

// ---------- metrics ----------

function toDate(ts) {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  const d = new Date(ts);
  return isNaN(d) ? null : d;
}

function compute() {
  const all = store.getAllDocs();
  // Guest rooms and common-area spaces split here so "X / 115 rooms" stays a
  // statement about KEYS. Spaces still feed the crew/issue/feed panels —
  // an issue in the Lobby is an issue — under their own names.
  const live = all.filter(r => !isSpaceDoc(r) && !isMepDoc(r));
  const spaceDocs = all.filter(isSpaceDoc);
  // MEP punch docs are a THIRD population. They must never land in `live` — a
  // toilet checked off in 105-MEP would otherwise move "X / 115 rooms complete"
  // and the 4,688-item hero, which count FF&E turnover only.
  const mepDocs = all.filter(isMepDoc);
  const m = {
    items: 0, checked: 0, roomsTotal: live.length, roomsDone: 0, roomsGoing: 0, roomsNotStarted: 0,
    issues: 0, roomsWithIssues: 0, checkedToday: 0,
    perFloor: {}, issueTypes: new Map(), crew: new Map(),
    issueRows: [], feed: [], days: [],
    spaces: { count: spaceDocs.length, items: 0, checked: 0, issues: 0, done: 0 },
    mep: { count: mepDocs.length, items: 0, checked: 0, issues: 0, done: 0, docsWithIssues: 0 },
  };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dayKeys = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    dayKeys.push(d.toISOString().slice(0, 10));
  }
  const dayCounts = Object.fromEntries(dayKeys.map(k => [k, 0]));

  for (const r of [...live, ...spaceDocs, ...mepDocs]) {
    const s = roomStats(r);
    const isSp = isSpaceDoc(r);
    const isMep = isMepDoc(r);
    // Where an item lives, as the panels should say it: "Rm 214" / "Lobby 003"
    // / "MEP 105". An MEP issue is still an issue and still belongs in the
    // feed and the issue table — under a name that says which list it is on.
    const where = isSp ? `${r.typeLabel || 'Space'} ${r.number}`
      : (isMep ? `MEP ${mepParent(r.number) || r.number}` : null);
    // Which population feeds which number — the rule, stated once:
    //
    //   PROGRESS (items checked, the ring, rooms complete, "+N today") counts
    //   FF&E turnover only: guest rooms + common areas. MEP punch lines are a
    //   parallel list over the same rooms with their own 7,500-line
    //   denominator, so folding them in would count the building against
    //   itself and move a percentage that means "ready to hand over".
    //
    //   PROBLEMS (the issue tile, the by-type bars, the issue table, the feed)
    //   count EVERYTHING, MEP included. A flagged toilet is a real problem on
    //   a real wall, and the table already lists it as "MEP 105". A tile that
    //   disagreed with the table under it is how a wall board loses trust.
    m.issues += s.openIssues;
    if (s.openIssues > 0) m.docsWithIssues = (m.docsWithIssues || 0) + 1;
    if (!isMep) { m.items += s.total; m.checked += s.done; }
    if (isMep) {
      m.mep.items += s.total; m.mep.checked += s.done; m.mep.issues += s.openIssues;
      if (s.openIssues > 0) m.mep.docsWithIssues++;
      if (s.complete) m.mep.done++;
    } else if (isSp) {
      m.spaces.items += s.total; m.spaces.checked += s.done; m.spaces.issues += s.openIssues;
      if (s.complete) m.spaces.done++;
    } else {
      if (s.complete) m.roomsDone++;
      else if (s.done > 0) m.roomsGoing++;
      else m.roomsNotStarted++;
      if (s.openIssues > 0) m.roomsWithIssues++;
      const f = (m.perFloor[r.floor] = m.perFloor[r.floor] || { rooms: 0, items: 0, checked: 0, issues: 0 });
      f.rooms++; f.items += s.total; f.checked += s.done; f.issues += s.openIssues;
    }

    const entries = Object.entries(r.items || {}).filter(([, it]) => !it.deleted);
    for (const [itemId, it] of entries.sort((a, b) => (a[1].sort || 0) - (b[1].sort || 0))) {
      if (it.issue && !it.issueResolved) {
        m.issueTypes.set(it.issue, (m.issueTypes.get(it.issue) || 0) + 1);
        // isMep keeps the row VISIBLE (a punch problem is a problem) but not
        // editable from here: the crew app owns those lists, and this board's
        // item sheet would mislabel "105-MEP" as a guest room and let one tap
        // un-check finished mechanical work with no PIN in the way.
        m.issueRows.push({ room: r.number, where, code: it.code, label: it.label, note: it.issue, isNote: false, itemId, isMep });
      }
      if (it.checked) {
        const who = it.initials || '—';
        const c = m.crew.get(who) || { total: 0, today: 0, name: it.checkedByName || '' };
        c.total++;
        const when = toDate(it.checkedAtLocal) || toDate(it.checkedAt);
        if (when) {
          // c.today is the PEOPLE panel (all work counts). m.checkedToday is
          // the foot of the ITEMS CHECKED tile, so it follows that tile.
          if (when >= today) { c.today++; if (!isMep) m.checkedToday++; }
          const k = when.toISOString().slice(0, 10);
          if (k in dayCounts) dayCounts[k]++;
          m.feed.push({ who, code: it.code, room: r.number, where, when });
        }
        m.crew.set(who, c);
      }
    }
    for (const n of Object.values(r.notes || {})) {
      if (n.flag === 'issue' && !n.resolved) {
        m.issueRows.push({ room: r.number, where, code: '', label: '', note: n.text, isNote: true, itemId: '' });
      }
    }
  }
  m.pct = m.items ? Math.round(m.checked / m.items * 100) : 0;
  m.issueRows.sort((a, b) => roomSort(a.room, b.room));
  m.feed.sort((a, b) => b.when - a.when);
  m.days = dayKeys.map(k => ({ key: k, n: dayCounts[k] }));
  return m;
}

// ---------- render ----------

function ring(pct, size = 108) {
  const r = (size - 12) / 2, c = 2 * Math.PI * r;
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${pct}% complete">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--track)" stroke-width="10"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--good)" stroke-width="10"
      stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}"
      transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" class="ring-text">${pct}%</text>
  </svg>`;
}

function hbarRow({ label, sub, val, max, bad = false, tip, data = '' }) {
  const w = max ? Math.max(2, Math.round(val / max * 100)) : 0;
  return `
  <div class="hb" data-tip="${esc(tip || '')}" ${data}>
    <span class="hb-label">${esc(label)}${sub ? ` <span class="hb-sub">${esc(sub)}</span>` : ''}</span>
    <span class="hb-track"><span class="hb-fill ${bad ? 'bad' : ''}" style="width:${w}%"></span></span>
    <span class="hb-val">${val}</span>
  </div>`;
}

function fmtTime(d) {
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// The board re-renders on every store change and every 60s. A keyboard user's
// focus must survive that — capture a selector for the focused row/control
// before the innerHTML rebuild and restore it after.
function focusKeyOf(el) {
  if (!el || el === document.body) return null;
  if (el.id === 'inv-q') return null;                    // inventory handles its own
  if (el.matches?.('#floors [data-floor]')) return `#floors [data-floor="${CSS.escape(el.dataset.floor)}"]`;
  if (el.matches?.('#issue-types [data-isstype]')) return `#issue-types [data-isstype="${CSS.escape(el.dataset.isstype)}"]`;
  if (el.matches?.('#issue-table tr[data-item]')) return `#issue-table tr[data-room="${CSS.escape(el.dataset.room)}"][data-item="${CSS.escape(el.dataset.item)}"]`;
  if (el.matches?.('#inventory [data-bulk]')) return `#inventory [data-bulk="${CSS.escape(el.dataset.bulk)}"]`;
  if (el.matches?.('#inventory [data-cat]')) return `#inventory [data-cat="${CSS.escape(el.dataset.cat)}"]`;
  return null;
}

function render() {
  const focusKey = focusKeyOf(document.activeElement);
  const m = compute();
  setLive(liveState());

  $('ring').innerHTML = ring(m.pct) + `
    <div class="ring-side">${m.checked.toLocaleString()} of ${m.items.toLocaleString()} items<br>
    ${m.roomsGoing} room${m.roomsGoing === 1 ? '' : 's'} in progress</div>`;

  $('k-items').innerHTML = `${m.checked.toLocaleString()}<span class="of"> / ${m.items.toLocaleString()}</span>`;
  $('k-items-foot').textContent = m.checkedToday ? `+${m.checkedToday} today` : 'none today yet';
  $('k-rooms').innerHTML = `${m.roomsDone}<span class="of"> / ${m.roomsTotal}</span>`;
  $('k-rooms-foot').textContent = `${m.roomsGoing} in progress · ${m.roomsNotStarted} not started`;
  $('k-issues').textContent = m.issues;
  // docsWithIssues spans all three populations, so name them separately
  // rather than letting MEP masquerade as a common-area space.
  const mepIssueDocs = m.mep.docsWithIssues || 0;
  const spIss = (m.docsWithIssues || 0) - m.roomsWithIssues - mepIssueDocs;
  $('k-issues-foot').textContent = m.issues
    ? `across ${m.roomsWithIssues} room${m.roomsWithIssues === 1 ? '' : 's'}` +
      (spIss ? ` + ${spIss} space${spIss === 1 ? '' : 's'}` : '') +
      (mepIssueDocs ? ` + ${mepIssueDocs} MEP punch list${mepIssueDocs === 1 ? '' : 's'}` : '')
    : 'nothing open';

  // floors — in edit mode each row opens the floor's room browser
  const editing = edit.isEdit();
  const fl = Object.entries(store.getFloors()).sort((a, b) => (a[1].sort || 0) - (b[1].sort || 0));
  $('floors').innerHTML = fl.map(([n, f]) => {
    const d = m.perFloor[n] || m.perFloor[Number(n)] || { rooms: 0, items: 0, checked: 0, issues: 0 };
    const pct = d.items ? Math.round(d.checked / d.items * 100) : 0;
    return `
    <div class="frow ${editing ? 'clickable' : ''}" data-floor="${esc(n)}" data-floor-label="${esc(f.label)}"
         data-tip="${esc(`${f.label}: ${d.checked}/${d.items} items checked · ${d.rooms} room${d.rooms === 1 ? '' : 's'} · ${d.issues} open issue${d.issues === 1 ? '' : 's'}${editing ? ' — click to open rooms' : ''}`)}">
      <div><div class="frow-name">${esc(f.label)}</div><div class="frow-sub">${d.rooms} ROOM${d.rooms === 1 ? '' : 'S'}</div></div>
      <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
      <div class="frow-right">${pct}%${d.issues ? ` <span class="ibadge">⚠ ${d.issues}</span>` : ''}</div>
    </div>`;
  }).join('') + (m.spaces.count ? (() => {
    const sp = m.spaces;
    const pct = sp.items ? Math.round(sp.checked / sp.items * 100) : 0;
    return `
    <div class="frow ${editing ? 'clickable' : ''}" data-floor="common" data-floor-label="Common Areas"
         data-tip="${esc(`Common areas: ${sp.checked}/${sp.items} items checked · ${sp.count} spaces · ${sp.issues} open issues${editing ? ' — click to open spaces' : ''}`)}">
      <div><div class="frow-name">Common Areas</div><div class="frow-sub">${sp.count} SPACES</div></div>
      <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
      <div class="frow-right">${pct}%${sp.issues ? ` <span class="ibadge">⚠ ${sp.issues}</span>` : ''}</div>
    </div>`;
  })() : '');
  if (editing) {
    $('floors').querySelectorAll('[data-floor]').forEach(row => {
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      const go = () => edit.openFloorSheet(row.dataset.floor, row.dataset.floorLabel);
      row.addEventListener('click', go);
      row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  }

  // issue types (single red hue + labels) — in edit mode a row opens the bulk
  // drawer pre-scoped to exactly that wording
  const types = [...m.issueTypes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const tmax = types.length ? types[0][1] : 0;
  $('issue-types').innerHTML = types.length
    ? types.map(([t, n]) => hbarRow({
        label: t, val: n, max: tmax, bad: true,
        tip: `${n} item${n === 1 ? '' : 's'} flagged “${t}”${editing ? ' — click to bulk edit these' : ''}`,
        data: `data-isstype="${esc(t)}"`,
      })).join('')
    : `<div class="empty-line">No open item issues. 🎉</div>`;
  if (editing) {
    $('issue-types').querySelectorAll('[data-isstype]').forEach(row => {
      row.classList.add('clickable');
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      const go = () => edit.openBulkDrawer({ issueText: row.dataset.isstype, action: 'resolveAndCheck' });
      row.addEventListener('click', go);
      row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  }

  // crew (single cyan hue)
  const crew = [...m.crew.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 8);
  const cmax = crew.length ? crew[0][1].total : 0;
  $('crew').innerHTML = crew.length
    ? crew.map(([ini, c]) => hbarRow({
        label: ini, sub: c.today ? `+${c.today} today` : (c.name || ''),
        val: c.total, max: cmax,
        tip: `${c.name || ini}: ${c.total} check-off${c.total === 1 ? '' : 's'} total${c.today ? `, ${c.today} today` : ''}`,
      })).join('')
    : `<div class="empty-line">No check-offs yet.</div>`;

  // inventory panel — always informative; BULK buttons act only in edit mode
  // MEP punch docs are excluded here for the same reason dash-edit.js filters
  // them: the INVENTORY panel is the FF&E item list, and its rows open the bulk
  // drawer.
  edit.renderInventory($('inventory'), store.getAllDocs().filter(r => !isMepDoc(r)));
  $('inv-hint').textContent = editing ? 'BULK EDIT works per row' : 'tap ✎ EDIT to change things';
  // Visible affordance hints (not hover-only): the panel headers say what
  // clicking does while editing.
  const fh = document.getElementById('floors-hint');
  if (fh) fh.textContent = editing ? '— click a floor to open its rooms' : '';
  const ih = document.getElementById('issues-hint');
  if (ih) ih.textContent = editing ? '— click a row to fix or bulk edit' : '';
  const lh = document.getElementById('issuelist-hint');
  if (lh) lh.textContent = editing ? '— click a row to open the item' : '';

  // issue table — in edit mode a row opens the item's resolve sheet
  $('issue-table').querySelector('tbody').innerHTML = m.issueRows.length
    ? m.issueRows.map(r => `
      <tr class="${r.isNote ? 'note-row' : ''} ${editing && !r.isNote && !r.isMep ? 'clickable' : ''}"
          ${!r.isNote && !r.isMep ? `data-room="${esc(r.room)}" data-item="${esc(r.itemId)}"` : ''}>
        <td class="rm">${esc(r.where || r.room)}</td>
        <td class="code">${esc(r.code)}</td>
        <td>${esc(r.label)}</td>
        <td class="prob">${esc(r.note.toUpperCase())}</td>
      </tr>`).join('')
    : `<tr><td colspan="4" class="empty-line">Nothing open. 🎉</td></tr>`;
  if (editing) {
    // Rows stay ROWS (overriding a tr's role breaks SR table navigation) —
    // tabindex + keydown make them operable without stealing the semantics.
    $('issue-table').querySelectorAll('tr[data-item]').forEach(tr => {
      tr.setAttribute('tabindex', '0');
      const go = () => edit.openItemSheet(tr.dataset.room, tr.dataset.item);
      tr.addEventListener('click', go);
      tr.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  }

  // feed
  $('feed').innerHTML = m.feed.length
    ? m.feed.slice(0, 14).map(f => `
      <div class="feed-item">
        <span class="feed-who">${esc(f.who)}</span>
        <span class="feed-what">checked <b>${esc(f.code)}</b> · ${esc(f.where || 'Rm ' + f.room)}</span>
        <span class="feed-when">${esc(fmtTime(f.when))}</span>
      </div>`).join('')
    : `<div class="empty-line">Check-offs with timestamps will appear here.<br>
       <span style="font-size:11.5px">(Items imported from paper sheets don't carry a time.)</span></div>`;

  // 14-day chart
  const dmax = Math.max(1, ...m.days.map(d => d.n));
  const peak = Math.max(...m.days.map(d => d.n));
  const peakIdx = m.days.map(d => d.n).lastIndexOf(peak);
  $('spark').innerHTML = m.days.map((d, i) => {
    const h = Math.round(d.n / dmax * 100);
    const dt = new Date(d.key + 'T12:00:00');
    const lbl = `${dt.getMonth() + 1}/${dt.getDate()}`;
    return `
    <div class="sp-col" data-tip="${esc(`${lbl}: ${d.n} check-off${d.n === 1 ? '' : 's'}`)}">
      <span class="sp-top">${i === peakIdx && peak > 0 ? d.n : ''}</span>
      <div class="sp-bar ${d.n === 0 ? 'zero' : ''}" style="height:${Math.max(2, h)}%"></div>
      <span class="sp-x">${i % 2 === 1 ? lbl : ''}</span>
    </div>`;
  }).join('');

  $('updated').textContent = store.getMode() === 'demo'
    ? 'showing built-in demo data (?demo=1) — edits stay on this device'
    : (lastUpdate ? `updated ${fmtTime(lastUpdate)}` : 'waiting for data…');

  if (focusKey) {
    const back = document.querySelector(focusKey);
    if (back) back.focus();
  }
}

// ---------- tooltip (hover layer) ----------
const tip = $('tip');
// A click either navigates or opens a sheet — either way the hover context is
// gone, and a tooltip floating over a modal reads as a glitch.
document.addEventListener('click', () => { tip.hidden = true; });
document.addEventListener('mousemove', (e) => {
  const t = e.target.closest('[data-tip]');
  if (t && t.dataset.tip) {
    tip.hidden = false;
    tip.textContent = t.dataset.tip;
    const x = Math.min(e.clientX + 14, window.innerWidth - 280);
    tip.style.left = x + 'px';
    tip.style.top = (e.clientY + 16) + 'px';
  } else tip.hidden = true;
});

// ---------- clock ----------
setInterval(() => {
  $('clock').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}, 1000);
// re-roll "today" boundaries + relative bits every minute
setInterval(render, 60_000);

start();
