// Submittals & plan references for one room — the "what am I looking at"
// reference view, reachable from the room screen, the print sheet and the 3D
// exhibit. Grouped BY DOCUMENT rather than by item: a crew member opens this
// to pull up a cutsheet, and one submittal usually covers a dozen tags.
//
//   refs.html?room=101            back goes to the room
//   refs.html?room=101&from=3d    back goes to the 3D exhibit
//
// Tapping any entry opens the app's own reference popup (Drive preview for
// submittals, locally cached snippet for plan sheets) so this page behaves
// exactly like the 📎 chip inside the checklist.
import { esc, isSpaceDoc } from './util.js';
import { initRefs, refsFor } from './refs.js';
import { refPopup } from './sheets.js';
import { firebaseConfig, PROJECT_ID } from './config.js';
import { seedRooms } from './seed.js';
import { seedSpaces } from './seed-spaces.js';

const params = new URLSearchParams(location.search);
const ROOM = (params.get('room') || '101').trim();
const FROM = params.get('from') || '';
const DEMO = params.has('demo') || !firebaseConfig;
const $ = (id) => document.getElementById(id);

// Back target: "exactly back to the 3D model" when that is where we came from.
$('back-link').href = FROM === '3d'
  ? './room-3d.html?room=' + encodeURIComponent(ROOM) + (DEMO ? '&demo=1' : '')
  : './index.html#/room/' + encodeURIComponent(ROOM);
$('title').textContent = 'Room ' + ROOM + ' · References';

// ---------- room data (same handoff the print sheet uses) ----------
function handoffRoom() {
  try {
    const r = JSON.parse(sessionStorage.getItem('h2sep-print-room') || 'null');
    return r && String(r.number) === ROOM ? r : null;
  } catch { return null; }
}
async function liveRoom() {
  const [{ initializeApp }, fs, authm] = await Promise.all([
    import('../firebase/firebase-app.js'),
    import('../firebase/firebase-firestore.js'),
    import('../firebase/firebase-auth.js'),
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = authm.getAuth(app);
  if (!auth.currentUser) await authm.signInAnonymously(auth);
  const snap = await fs.getDoc(fs.doc(fs.getFirestore(app), 'projects', PROJECT_ID, 'rooms', ROOM));
  if (!snap.exists()) throw new Error('room not found');
  return snap.data();
}

// ---------- grouping ----------
// One entry per distinct document; the tags it covers ride along so a gap is
// visible (a submittal covering one tag is as honest as one covering twelve).
function groupRefs(room) {
  const docs = new Map(); // key -> { ref, tags:Set }
  const items = Object.entries(room.items || {})
    .filter(([, it]) => !it.deleted)
    .sort((a, b) => (a[1].sort || 0) - (b[1].sort || 0));
  for (const [id, it] of items) {
    for (const r of refsFor(room.number, it, id, room.typeLabel || '')) {
      const key = r.kind + '|' + (r.driveId || r.snippet || r.title);
      if (!docs.has(key)) docs.set(key, { ref: r, tags: new Set() });
      docs.get(key).tags.add(it.code || it.label);
    }
  }
  return [...docs.values()];
}

function card(entry, i) {
  const r = entry.ref;
  const tags = [...entry.tags];
  const sheetChip = r.sheetId ? `<span class="rp-sheet">${esc(r.sheetId)}</span>` : '';
  return `
    <button class="rp-card" data-ref="${i}">
      <div class="rp-ico">${r.kind === 'plan' ? '📐' : '📄'}</div>
      <div class="rp-main">
        <div class="rp-title">${esc(r.title)}${sheetChip}</div>
        <div class="rp-tags">${tags.length} item${tags.length === 1 ? '' : 's'} · ${esc(tags.join(', '))}</div>
      </div>
      <div class="rp-chev">›</div>
    </button>`;
}

function render(room) {
  // A space doc titles itself "Lobby 003", not "Room 003" — same wording the
  // room screen uses. The boot-time title stays as the pre-data fallback.
  if (isSpaceDoc(room) && room.typeLabel) {
    $('title').textContent = room.typeLabel + ' ' + room.number + ' · References';
  }
  const entries = groupRefs(room);
  const subs = entries.filter(e => e.ref.kind === 'submittal');
  const plans = entries.filter(e => e.ref.kind === 'plan');
  const flat = [...subs, ...plans];   // index order must match data-ref
  $('body').innerHTML = `
    <p class="rp-lead">Everything this room's lines point at. Tap to open —
      plan snippets are stored on this phone; submittals open from Drive.</p>
    <section class="rp-sec">
      <h2 class="rp-head">Submittals · ${subs.length}</h2>
      ${subs.length ? subs.map((e, i) => card(e, i)).join('')
        : `<div class="rp-none">No submittals linked yet for this room.</div>`}
    </section>
    <section class="rp-sec">
      <h2 class="rp-head">Plan sheets · ${plans.length}</h2>
      ${plans.length ? plans.map((e, i) => card(e, subs.length + i)).join('')
        : `<div class="rp-none">No plan snippets for this room.</div>`}
    </section>`;
  $('body').querySelectorAll('[data-ref]').forEach(b =>
    b.addEventListener('click', () => refPopup(flat[Number(b.dataset.ref)].ref)));
  $('expand-btn').classList.add('hidden');   // nothing to expand in this layout
}

// ---------- boot ----------
(async () => {
  await initRefs();
  // Common-area spaces live in their own fixture file — same lookup the
  // print sheet does, or refs.html?room=019&demo=1 renders an empty room
  // and reports no references for a space that has plenty.
  if (DEMO) {
    render(seedRooms()[ROOM] || seedSpaces()[ROOM] || { number: ROOM, items: {} });
    return;
  }
  const handed = handoffRoom();
  if (handed) render(handed);
  try {
    render(await Promise.race([
      liveRoom(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('no signal')), 10_000)),
    ]));
  } catch (e) {
    if (handed) return;   // this phone's copy is already on screen
    $('body').innerHTML = `<div class="empty">No signal — open this from the room screen
      while you have service, or reload once you're back in coverage.</div>`;
  }
})();
