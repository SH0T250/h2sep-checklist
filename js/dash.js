// H2SEP Live Dashboard — read-only realtime view over the same Firestore the
// app writes to. ?demo=1 renders from the bundled Room 101 fixture instead.
import { firebaseConfig, PROJECT_ID } from './config.js';
import { FLOORS, seedRooms } from './seed.js';
import { seedSpaces } from './seed-spaces.js';
import { esc, roomStats, roomSort, isSpaceDoc, isMepDoc, mepParent } from './util.js';

const DEMO = new URLSearchParams(location.search).has('demo') || !firebaseConfig;
const $ = (id) => document.getElementById(id);

let rooms = new Map();     // number -> room
let floors = { ...FLOORS };
let lastUpdate = null;

// ---------- data ----------

async function start() {
  if (DEMO) {
    const seeded = { ...seedRooms(), ...seedSpaces() };
    // Give demo check-offs synthetic times spread over the past week so the
    // feed and activity chart demonstrate themselves (clearly labeled DEMO).
    let i = 0;
    for (const r of Object.values(seeded)) {
      for (const it of Object.values(r.items)) {
        if (it.checked) {
          const d = new Date();
          d.setDate(d.getDate() - (i % 6));
          d.setHours(8 + (i * 3) % 9, (i * 17) % 60, 0, 0);
          it.checkedAtLocal = d.toISOString();
          i++;
        }
      }
    }
    rooms = new Map(Object.entries(seeded));
    setLive('demo');
    render();
    return;
  }
  try {
    const [{ initializeApp }, fs, authm] = await Promise.all([
      import('../firebase/firebase-app.js'),
      import('../firebase/firebase-firestore.js'),
      import('../firebase/firebase-auth.js'),
    ]);
    const app = initializeApp(firebaseConfig);
    const db = fs.getFirestore(app);
    const auth = authm.getAuth(app);

    // SIGN IN FIRST. Rules require auth; attaching listeners before the
    // invisible sign-in completes gets permission-denied and a dead OFFLINE
    // dashboard. Retry sign-in forever (backoff + on regaining network).
    await new Promise((resolve) => {
      let delay = 2000;
      const attempt = () => {
        if (auth.currentUser) return;
        authm.signInAnonymously(auth).catch((e) => {
          console.warn('sign-in failed — retrying', e.code || e);
          setLive('authfail');
          delay = Math.min(delay * 2, 30_000);
          setTimeout(attempt, delay);
        });
      };
      authm.onAuthStateChanged(auth, (u) => { if (u) resolve(); else attempt(); });
      window.addEventListener('online', () => { if (!auth.currentUser) { delay = 2000; attempt(); } });
    });

    const attachListeners = () => {
      fs.onSnapshot(fs.doc(db, 'projects', PROJECT_ID, 'config', 'app'), (snap) => {
        const d = snap.data();
        if (d && d.floors) { floors = d.floors; render(); }
      }, (e) => console.warn('config listener', e.code || e));
      fs.onSnapshot(fs.collection(db, 'projects', PROJECT_ID, 'rooms'), (snap) => {
        snap.docChanges().forEach((ch) => {
          if (ch.type === 'removed') rooms.delete(ch.doc.id);
          else rooms.set(ch.doc.id, { ...ch.doc.data(), number: ch.doc.id });
        });
        lastUpdate = new Date();
        setLive(snap.metadata.fromCache ? 'cache' : 'on');
        render();
      }, (e) => {
        // Never die silently — drop the dead listener and re-attach.
        console.warn('rooms listener error — re-attaching in 10s', e.code || e);
        setLive('cache');
        setTimeout(attachListeners, 10_000);
      });
    };
    attachListeners();
  } catch (e) {
    console.error(e);
    setLive('off');
  }
}

function setLive(state) {
  const pill = $('live-pill');
  if (state === 'on') { pill.className = 'live-pill on'; pill.innerHTML = '<span class="live-dot"></span>LIVE'; }
  else if (state === 'demo') { pill.className = 'live-pill off'; pill.innerHTML = '<span class="live-dot"></span>DEMO DATA'; }
  else if (state === 'cache') { pill.className = 'live-pill off'; pill.innerHTML = '<span class="live-dot"></span>RECONNECTING…'; }
  else if (state === 'authfail') { pill.className = 'live-pill off'; pill.innerHTML = '<span class="live-dot"></span>SIGN-IN BLOCKED — RETRYING (network filter?)'; }
  else { pill.className = 'live-pill off'; pill.innerHTML = '<span class="live-dot"></span>OFFLINE'; }
}

// ---------- metrics ----------

function toDate(ts) {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  const d = new Date(ts);
  return isNaN(d) ? null : d;
}

function compute() {
  const all = [...rooms.values()].filter(r => !r.deleted);
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
    mep: { count: mepDocs.length, items: 0, checked: 0, issues: 0, done: 0 },
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
    if (isMep) {
      m.mep.items += s.total; m.mep.checked += s.done; m.mep.issues += s.openIssues;
      if (s.complete) m.mep.done++;
    } else if (isSp) {
      m.spaces.items += s.total; m.spaces.checked += s.done; m.spaces.issues += s.openIssues;
      if (s.complete) m.spaces.done++;
    } else {
      m.items += s.total; m.checked += s.done; m.issues += s.openIssues;
      if (s.complete) m.roomsDone++;
      else if (s.done > 0) m.roomsGoing++;
      else m.roomsNotStarted++;
      if (s.openIssues > 0) m.roomsWithIssues++;
      const f = (m.perFloor[r.floor] = m.perFloor[r.floor] || { rooms: 0, items: 0, checked: 0, issues: 0 });
      f.rooms++; f.items += s.total; f.checked += s.done; f.issues += s.openIssues;
    }

    const entries = Object.entries(r.items || {}).filter(([, it]) => !it.deleted);
    for (const [, it] of entries.sort((a, b) => (a[1].sort || 0) - (b[1].sort || 0))) {
      if (it.issue && !it.issueResolved) {
        m.issueTypes.set(it.issue, (m.issueTypes.get(it.issue) || 0) + 1);
        m.issueRows.push({ room: r.number, where, code: it.code, label: it.label, note: it.issue, isNote: false });
      }
      if (it.checked) {
        const who = it.initials || '—';
        const c = m.crew.get(who) || { total: 0, today: 0, name: it.checkedByName || '' };
        c.total++;
        const when = toDate(it.checkedAtLocal) || toDate(it.checkedAt);
        if (when) {
          if (when >= today) { c.today++; m.checkedToday++; }
          const k = when.toISOString().slice(0, 10);
          if (k in dayCounts) dayCounts[k]++;
          m.feed.push({ who, code: it.code, room: r.number, where, when });
        }
        m.crew.set(who, c);
      }
    }
    for (const n of Object.values(r.notes || {})) {
      if (n.flag === 'issue' && !n.resolved) {
        m.issueRows.push({ room: r.number, where, code: '', label: '', note: n.text, isNote: true });
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

function hbarRow({ label, sub, val, max, bad = false, tip }) {
  const w = max ? Math.max(2, Math.round(val / max * 100)) : 0;
  return `
  <div class="hb" data-tip="${esc(tip || '')}">
    <span class="hb-label">${esc(label)}${sub ? ` <span class="hb-sub">${esc(sub)}</span>` : ''}</span>
    <span class="hb-track"><span class="hb-fill ${bad ? 'bad' : ''}" style="width:${w}%"></span></span>
    <span class="hb-val">${val}</span>
  </div>`;
}

function fmtTime(d) {
  return d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function render() {
  const m = compute();

  $('ring').innerHTML = ring(m.pct) + `
    <div class="ring-side">${m.checked.toLocaleString()} of ${m.items.toLocaleString()} items<br>
    ${m.roomsGoing} room${m.roomsGoing === 1 ? '' : 's'} in progress</div>`;

  $('k-items').innerHTML = `${m.checked.toLocaleString()}<span class="of"> / ${m.items.toLocaleString()}</span>`;
  $('k-items-foot').textContent = m.checkedToday ? `+${m.checkedToday} today` : 'none today yet';
  $('k-rooms').innerHTML = `${m.roomsDone}<span class="of"> / ${m.roomsTotal}</span>`;
  $('k-rooms-foot').textContent = `${m.roomsGoing} in progress · ${m.roomsNotStarted} not started`;
  $('k-issues').textContent = m.issues;
  $('k-issues-foot').textContent = m.roomsWithIssues
    ? `across ${m.roomsWithIssues} room${m.roomsWithIssues === 1 ? '' : 's'}` : 'no rooms affected';

  // floors
  const fl = Object.entries(floors).sort((a, b) => (a[1].sort || 0) - (b[1].sort || 0));
  $('floors').innerHTML = fl.map(([n, f]) => {
    const d = m.perFloor[n] || m.perFloor[Number(n)] || { rooms: 0, items: 0, checked: 0, issues: 0 };
    const pct = d.items ? Math.round(d.checked / d.items * 100) : 0;
    return `
    <div class="frow" data-tip="${esc(`${f.label}: ${d.checked}/${d.items} items checked · ${d.rooms} rooms · ${d.issues} open issues`)}">
      <div><div class="frow-name">${esc(f.label)}</div><div class="frow-sub">${d.rooms} ROOM${d.rooms === 1 ? '' : 'S'}</div></div>
      <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
      <div class="frow-right">${pct}%${d.issues ? ` <span class="ibadge">⚠ ${d.issues}</span>` : ''}</div>
    </div>`;
  }).join('') + (m.spaces.count ? (() => {
    const sp = m.spaces;
    const pct = sp.items ? Math.round(sp.checked / sp.items * 100) : 0;
    return `
    <div class="frow" data-tip="${esc(`Common areas: ${sp.checked}/${sp.items} items checked · ${sp.count} spaces · ${sp.issues} open issues`)}">
      <div><div class="frow-name">Common Areas</div><div class="frow-sub">${sp.count} SPACES</div></div>
      <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
      <div class="frow-right">${pct}%${sp.issues ? ` <span class="ibadge">⚠ ${sp.issues}</span>` : ''}</div>
    </div>`;
  })() : '');

  // issue types (single red hue + labels)
  const types = [...m.issueTypes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const tmax = types.length ? types[0][1] : 0;
  $('issue-types').innerHTML = types.length
    ? types.map(([t, n]) => hbarRow({ label: t, val: n, max: tmax, bad: true, tip: `${n} item${n === 1 ? '' : 's'} flagged “${t}”` })).join('')
    : `<div class="empty-line">No open item issues. 🎉</div>`;

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

  // issue table
  $('issue-table').querySelector('tbody').innerHTML = m.issueRows.length
    ? m.issueRows.map(r => `
      <tr class="${r.isNote ? 'note-row' : ''}">
        <td class="rm">${esc(r.where || r.room)}</td>
        <td class="code">${esc(r.code)}</td>
        <td>${esc(r.label)}</td>
        <td class="prob">${esc(r.note.toUpperCase())}</td>
      </tr>`).join('')
    : `<tr><td colspan="4" class="empty-line">Nothing open. 🎉</td></tr>`;

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

  $('updated').textContent = DEMO
    ? 'showing built-in demo data (?demo=1)'
    : (lastUpdate ? `updated ${fmtTime(lastUpdate)}` : 'waiting for data…');
}

// ---------- tooltip (hover layer) ----------
const tip = $('tip');
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
