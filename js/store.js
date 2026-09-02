// Data layer. One interface, two backends:
//  - LIVE: Firestore with offline persistence (when config.js has a firebaseConfig)
//  - DEMO: this-device-only localStorage (before Firebase is connected)
//
// Write invariants (from design/data-model-and-sync.md):
//  - every check/uncheck writes its complete field group in ONE update (atomic)
//  - room creation always merges (never plain set)
//  - soft deletes only
//  - never signOut()

import { firebaseConfig, PROJECT_ID, DEMO_PIN } from './config.js';
import { FLOORS, TEMPLATES, seedRooms, blankItem } from './seed.js';
import { seedSpaces } from './seed-spaces.js';
import { sha256Hex, randomId, codeSlug, roomSort, isSpaceDoc, isMepDoc, mepParent, mepIdFor } from './util.js';

const LS_USER = 'h2sep-user';
// v2: demo DB gained common-area spaces. Bumping the KEY (not sniffing doc
// shapes) is what retires stale caches — a v1 blob is simply never read, and
// tests that inject their own demo DB stay in control of its contents.
const LS_DEMO_DB = 'h2sep-demo-db-v2';
const SS_ADMIN = 'h2sep-admin';

// ?demo=1 forces device-local demo mode even when Firebase is configured —
// used for UI testing and safe experimentation; never affects live data.
const forceDemo = new URLSearchParams(location.search).has('demo');

const state = {
  mode: (firebaseConfig && !forceDemo) ? 'live' : 'demo',
  ready: false,
  uid: '',
  online: navigator.onLine,
  rooms: new Map(),          // number -> room object
  pendingRooms: new Set(),   // rooms with unacked local writes (live mode)
  recentLocal: new Map(),    // `${room}/${itemId}` -> last local-touch timestamp
  floors: { ...FLOORS },
  templates: null,           // slug -> {name, items}
  pinMeta: null,             // {pinSalt, pinHash} (live) — demo uses DEMO_PIN
  subscribedFloors: new Set(),
  pendingFloors: new Set(),  // floors requested before Firestore finished loading
  floorFromCache: new Map(), // floor -> last snapshot's fromCache (server contact)
};

const subscribers = new Set();
const remoteChangeHandlers = new Set();

function notify() { subscribers.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }
export function subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); }
// Fired when a *remote* update un-checks an item or changes its initials (finding 8).
export function onRemoteSurprise(fn) { remoteChangeHandlers.add(fn); return () => remoteChangeHandlers.delete(fn); }

window.addEventListener('online',  () => { state.online = true;  notify(); });
window.addEventListener('offline', () => { state.online = false; notify(); });

// ---------- user / admin ----------

export function getUser() {
  try { return JSON.parse(localStorage.getItem(LS_USER)) || null; } catch { return null; }
}
export function setUser(name, initials) {
  localStorage.setItem(LS_USER, JSON.stringify({ name: name.trim(), initials: initials.trim().toUpperCase() }));
  notify();
}
export function isAdmin() { return sessionStorage.getItem(SS_ADMIN) === '1'; }
// Live mode can only verify a PIN after the config/app snapshot delivers
// pinSalt/pinHash — before that, every PIN reads as wrong. UI must gate on
// this or an admin typing the RIGHT PIN gets told it's wrong.
export function canVerifyPin() {
  return state.mode === 'demo' || !!(state.pinMeta && state.pinMeta.pinHash);
}
export function lockAdmin() { sessionStorage.removeItem(SS_ADMIN); notify(); }

export async function verifyPin(pin) {
  let ok = false;
  if (state.mode === 'demo') {
    ok = pin === DEMO_PIN;
  } else if (state.pinMeta && state.pinMeta.pinHash) {
    ok = (await sha256Hex(state.pinMeta.pinSalt + pin)) === state.pinMeta.pinHash;
  }
  if (ok) {
    sessionStorage.setItem(SS_ADMIN, '1');
    if (state.mode === 'live') claimAdminRole(pin); // server-side allowlist; fire & forget
    notify();
  }
  return ok;
}

// ---------- getters ----------

export function getMode() { return state.mode; }
export function isReady() { return state.ready; }
export function isOnline() { return state.online; }
export function getUid() { return state.uid; }
export function getFloors() { return state.floors; }
export function getRoom(number) { return state.rooms.get(String(number)) || null; }
export function getRooms(floor) {
  return [...state.rooms.values()]
    .filter(r => !r.deleted && !isSpaceDoc(r) && !isMepDoc(r) && r.floor === Number(floor))
    .sort((a, b) => roomSort(a.number, b.number));
}
export function getAllRooms() {
  return [...state.rooms.values()].filter(r => !r.deleted && !isSpaceDoc(r) && !isMepDoc(r))
    .sort((a, b) => roomSort(a.number, b.number));
}
// MEP punch docs, same collection, told apart by their `mep-punch` type slug.
// EXCLUDED from getRooms/getAllRooms above so a room's FF&E progress, the floor
// grid, the hero counters and the dashboard never absorb punch check-offs.
export function getMepDocs(floor = null) {
  return [...state.rooms.values()]
    .filter(r => !r.deleted && isMepDoc(r) && (floor === null || r.floor === Number(floor)))
    .sort((a, b) => roomSort(a.number, b.number));
}
// The MEP doc for a guest room, or null. Takes either "105" or "105-MEP".
export function getMepFor(roomNumber) {
  const base = mepParent(roomNumber) || String(roomNumber);
  const d = state.rooms.get(mepIdFor(base));
  return d && !d.deleted ? d : null;
}
// Common-area spaces share the collection with guest rooms and are told apart
// by their `space-` type slug (see util.isSpaceDoc). Same floor listeners feed
// both, so subscribing floors 1–4 is enough to see every space.
export function getSpaces(floor = null) {
  return [...state.rooms.values()]
    .filter(r => !r.deleted && isSpaceDoc(r) && (floor === null || r.floor === Number(floor)))
    .sort((a, b) => (a.floor - b.floor) || roomSort(a.number, b.number));
}
export function isRoomPending(number) { return state.pendingRooms.has(String(number)); }
export function isItemRecentLocal(number, itemId) { return state.recentLocal.has(number + '/' + itemId); }
export function pendingCount() { return state.pendingRooms.size; }
export function getTemplates() { return state.templates || {}; }
// Live mode needs one successful (invisible) sign-in before writes are legal —
// otherwise queued check-offs would be REJECTED at sync time and vanish.
export function isWriteReady() { return state.mode === 'demo' || !!state.uid; }
// True while any floor listener is serving from cache (no server contact) —
// the dashboard pill uses this to say RECONNECTING instead of a false LIVE.
export function isFromCache() {
  for (const v of state.floorFromCache.values()) if (v) return true;
  return false;
}

function markLocal(number, itemId) {
  state.recentLocal.set(String(number) + '/' + itemId, Date.now());
}

// Detect remote surprises: item flipped checked->unchecked or initials changed
// by someone else while we watch.
function diffForSurprises(prev, next) {
  if (!prev) return;
  for (const [id, before] of Object.entries(prev.items || {})) {
    const after = (next.items || {})[id];
    if (!after || !before.checked) continue;
    // Suppress the heads-up only for items I touched in the last 5 minutes —
    // an item I checked this morning still warns me if it flips this afternoon.
    const touched = state.recentLocal.get(next.number + '/' + id);
    if (touched && Date.now() - touched < 300_000) continue;
    if (!after.checked) {
      remoteChangeHandlers.forEach(fn => fn({ room: next.number, itemId: id, kind: 'unchecked', before, after }));
    } else if (after.initials !== before.initials) {
      remoteChangeHandlers.forEach(fn => fn({ room: next.number, itemId: id, kind: 'initials', before, after }));
    }
  }
}

// =====================================================================
// DEMO BACKEND (localStorage, this phone only)
// =====================================================================

let demoDB = null;

function demoLoad() {
  try { demoDB = JSON.parse(localStorage.getItem(LS_DEMO_DB)); } catch { demoDB = null; }
  // The demo fixture now mirrors the live room (40 categorized lines with real
  // qty), so a DB seeded from an older, differently-shaped fixture has to be
  // re-seeded or demo mode would keep showing the retired layout.
  const stale = demoDB && demoDB.rooms && (demoDB.rooms['101'] || {}).schemaV !== 3;
  if (!demoDB || !demoDB.rooms || stale) {
    demoDB = { rooms: { ...seedRooms(), ...seedSpaces() }, floors: { ...FLOORS } };
    demoSave();
  }
}
function demoSave() { localStorage.setItem(LS_DEMO_DB, JSON.stringify(demoDB)); }
function demoRefresh() {
  state.rooms = new Map(Object.entries(demoDB.rooms).map(([n, r]) => [n, r]));
  state.floors = demoDB.floors;
  notify();
}

function demoUpdateItem(number, itemId, patch) {
  const room = demoDB.rooms[number];
  if (!room || !room.items[itemId]) return;
  Object.assign(room.items[itemId], patch);
  room.updatedAt = new Date().toISOString();
  demoSave(); demoRefresh();
}

// =====================================================================
// LIVE BACKEND (Firestore)
// =====================================================================

let fs = null;   // firestore module namespace
let db = null;

async function liveInit() {
  const [{ initializeApp }, fsm, authm] = await Promise.all([
    import('../firebase/firebase-app.js'),
    import('../firebase/firebase-firestore.js'),
    import('../firebase/firebase-auth.js'),
  ]);
  fs = fsm;
  const app = initializeApp(firebaseConfig);
  db = fs.initializeFirestore(app, {
    localCache: fs.persistentLocalCache({
      tabManager: fs.persistentMultipleTabManager(),
      cacheSizeBytes: fs.CACHE_SIZE_UNLIMITED,
    }),
  });
  const auth = authm.getAuth(app);
  // Sign-in with RETRY: a phone that boots in a dead zone must keep trying,
  // because queued writes made without auth would be rejected (and rolled
  // back) when signal returns. Writes are blocked until uid exists.
  let signInDelay = 2000;
  const trySignIn = () => {
    if (auth.currentUser) return;
    authm.signInAnonymously(auth).catch((e) => {
      console.warn('anon sign-in failed — retrying', e.code || e);
      signInDelay = Math.min(signInDelay * 2, 60_000);
      setTimeout(trySignIn, signInDelay);
    });
  };
  let coreAttached = false;
  authm.onAuthStateChanged(auth, (u) => {
    if (u) {
      state.uid = u.uid; signInDelay = 2000;
      // Attach listeners only AFTER the first successful sign-in — rules
      // reject unauthenticated listens, which would strand dead listeners.
      // (Persisted auth resolves offline, so offline cold starts still work.)
      if (!coreAttached) {
        coreAttached = true;
        fs.onSnapshot(fs.doc(db, 'projects', PROJECT_ID, 'config', 'app'), (snap) => {
          const d = snap.data();
          if (d) {
            if (d.floors) state.floors = d.floors;
            state.pinMeta = { pinSalt: d.pinSalt || '', pinHash: d.pinHash || '' };
            notify();
          }
        }, e => console.warn('config listener', e.code || e));
        liveSubscribeTemplates();
      }
      for (const f of state.pendingFloors) {
        state.pendingFloors.delete(f);
        ensureFloorSubscribed(f);
      }
      notify();
    } else trySignIn();
  });
  window.addEventListener('online', () => { if (!auth.currentUser) trySignIn(); });
}

// Ruling D54 (2026-09-02): the crew app and the office platform share ONE set of
// records, projects/h2sep/platform_rooms. The old 'rooms' collection is frozen
// as an archive; every check, issue and note it held was carried across first.
const ROOMS_COLLECTION = 'platform_rooms';
function roomsCol() { return fs.collection(db, 'projects', PROJECT_ID, ROOMS_COLLECTION); }
function roomRef(number) { return fs.doc(db, 'projects', PROJECT_ID, ROOMS_COLLECTION, String(number)); }

function liveSubscribeFloor(floor) {
  const q = fs.query(roomsCol(), fs.where('floor', '==', Number(floor)));
  const retry = (e) => {
    // A dead listener must never look "subscribed" — unmark and retry, or a
    // whole floor would silently show empty for the rest of the session.
    console.error('rooms listener floor ' + floor, e);
    state.subscribedFloors.delete(String(floor));
    setTimeout(() => ensureFloorSubscribed(floor), 10_000);
  };
  fs.onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
    state.floorFromCache.set(String(floor), snap.metadata.fromCache);
    snap.docChanges().forEach(ch => {
      const data = ch.doc.data();
      const number = ch.doc.id;
      if (ch.type === 'removed') { state.rooms.delete(number); return; }
      const prev = state.rooms.get(number);
      if (!ch.doc.metadata.hasPendingWrites) diffForSurprises(prev, { ...data, number });
      state.rooms.set(number, { ...data, number });
      if (ch.doc.metadata.hasPendingWrites) state.pendingRooms.add(number);
      else state.pendingRooms.delete(number);
    });
    state.ready = true;
    notify();
  }, retry);
}

async function liveSubscribeTemplates() {
  fs.onSnapshot(fs.collection(db, 'projects', PROJECT_ID, 'templates'), (snap) => {
    const t = {};
    snap.forEach(d => { t[d.id] = d.data(); });
    state.templates = t;
    notify();
  }, e => console.error('templates listener', e));
}

async function claimAdminRole(pin) {
  if (!state.uid) return;
  try {
    await fs.setDoc(fs.doc(db, 'projects', PROJECT_ID, 'roles', state.uid), {
      name: (getUser() || {}).name || 'device',
      pin,
      grantedAt: fs.serverTimestamp(),
    });
  } catch (e) {
    // Rules-enforced admin may be unavailable (e.g. fallback rules); UI gate still applies.
    console.warn('role claim failed (UI-gate admin only)', e);
  }
}

function auditAppend(action, number, itemId, extra = {}) {
  if (state.mode !== 'live' || !db) return;
  // Sharded per hour so a single doc can never hit Firestore's 1 MiB ceiling.
  const now = new Date().toISOString();
  const day = now.slice(0, 10).replace(/-/g, '') + '-' + now.slice(11, 13);
  const entryId = (state.uid || 'anon').slice(-6) + '_' + Date.now().toString(36);
  const u = getUser() || {};
  fs.setDoc(fs.doc(db, 'projects', PROJECT_ID, 'activity', day), {
    entries: {
      [entryId]: {
        t: fs.serverTimestamp(), uid: state.uid, name: u.name || '',
        room: String(number), itemId: itemId || '', action, ...extra,
      },
    },
  }, { merge: true }).catch(e => console.warn('audit append failed', e));
}

// =====================================================================
// WRITE OPERATIONS (shared interface)
// =====================================================================

export async function checkItem(number, itemId) {
  const u = getUser(); if (!u) throw new Error('no user');
  markLocal(number, itemId);
  if (state.mode === 'demo') {
    demoUpdateItem(number, itemId, {
      checked: true, initials: u.initials, checkedByName: u.name, checkedByUid: 'demo',
      checkedAt: new Date().toISOString(), checkedAtLocal: new Date().toISOString(),
    });
    return;
  }
  const p = 'items.' + itemId + '.';
  await fs.updateDoc(roomRef(number), {
    [p + 'checked']: true,
    [p + 'initials']: u.initials,
    [p + 'checkedByName']: u.name,
    [p + 'checkedByUid']: state.uid,
    [p + 'checkedAt']: fs.serverTimestamp(),
    [p + 'checkedAtLocal']: new Date(),
    updatedAt: fs.serverTimestamp(),
  });
}

export async function uncheckItem(number, itemId) {
  const room = getRoom(number);
  const prev = room && room.items[itemId];
  markLocal(number, itemId);
  auditAppend('uncheck', number, itemId, { was: prev ? (prev.initials || '') : '' });
  if (state.mode === 'demo') {
    demoUpdateItem(number, itemId, {
      checked: false, initials: '', checkedByName: '', checkedByUid: '',
      checkedAt: null, checkedAtLocal: null,
    });
    return;
  }
  const p = 'items.' + itemId + '.';
  await fs.updateDoc(roomRef(number), {
    [p + 'checked']: false,
    [p + 'initials']: '',
    [p + 'checkedByName']: '',
    [p + 'checkedByUid']: '',
    [p + 'checkedAt']: null,
    [p + 'checkedAtLocal']: null,
    updatedAt: fs.serverTimestamp(),
  });
}

export async function setIssue(number, itemId, note) {
  const room = getRoom(number);
  const prev = room && room.items[itemId];
  if (prev && prev.issue && prev.issue !== note) {
    auditAppend('issue-replace', number, itemId, { was: prev.issue, to: note });
  }
  markLocal(number, itemId);
  if (state.mode === 'demo') {
    demoUpdateItem(number, itemId, { issue: note, issueResolved: false });
    return;
  }
  const p = 'items.' + itemId + '.';
  await fs.updateDoc(roomRef(number), {
    [p + 'issue']: note,
    [p + 'issueResolved']: false,
    updatedAt: fs.serverTimestamp(),
  });
}

// resolveIssue(..., {check:true}) = the "fixed it, checking it off" one-tap.
export async function resolveIssue(number, itemId, { check = false, clear = false } = {}) {
  const u = getUser();
  // Guard against a stale open sheet: if a teammate already checked this item
  // while the sheet sat open, resolve the issue but do NOT restamp their mark.
  const fresh = getRoom(number)?.items?.[itemId];
  if (check && fresh && fresh.checked) check = false;
  markLocal(number, itemId);
  if (state.mode === 'demo') {
    const patch = clear ? { issue: '', issueResolved: false } : { issueResolved: true };
    if (check && u) Object.assign(patch, {
      checked: true, initials: u.initials, checkedByName: u.name, checkedByUid: 'demo',
      checkedAt: new Date().toISOString(), checkedAtLocal: new Date().toISOString(),
    });
    demoUpdateItem(number, itemId, patch);
    return;
  }
  const p = 'items.' + itemId + '.';
  const patch = { updatedAt: fs.serverTimestamp() };
  if (clear) { patch[p + 'issue'] = ''; patch[p + 'issueResolved'] = false; }
  else patch[p + 'issueResolved'] = true;
  if (check && u) {
    patch[p + 'checked'] = true;
    patch[p + 'initials'] = u.initials;
    patch[p + 'checkedByName'] = u.name;
    patch[p + 'checkedByUid'] = state.uid;
    patch[p + 'checkedAt'] = fs.serverTimestamp();
    patch[p + 'checkedAtLocal'] = new Date();
  }
  await fs.updateDoc(roomRef(number), patch);
}

export async function addRoomNote(number, text, flag = 'issue') {
  const u = getUser() || { name: '' };
  const id = randomId('n_');
  markLocal(number, id);
  if (state.mode === 'demo') {
    const room = demoDB.rooms[number]; if (!room) return;
    room.notes = room.notes || {};
    room.notes[id] = { text, flag, resolved: false, createdBy: u.name, createdByUid: 'demo', createdAt: new Date().toISOString() };
    demoSave(); demoRefresh();
    return;
  }
  await fs.updateDoc(roomRef(number), {
    ['notes.' + id]: {
      text, flag, resolved: false, createdBy: u.name, createdByUid: state.uid,
      createdAt: fs.serverTimestamp(),
    },
    updatedAt: fs.serverTimestamp(),
  });
}

// Toggle from CURRENT state (not the caller's snapshot) so two people racing
// can't accidentally re-open a note the other just resolved.
export async function toggleRoomNote(number, noteId) {
  const fresh = getRoom(number)?.notes?.[noteId];
  if (!fresh) return;
  return setRoomNoteResolved(number, noteId, !fresh.resolved);
}

export async function setRoomNoteResolved(number, noteId, resolved) {
  if (state.mode === 'demo') {
    const n = demoDB.rooms[number]?.notes?.[noteId]; if (!n) return;
    n.resolved = resolved; demoSave(); demoRefresh();
    return;
  }
  await fs.updateDoc(roomRef(number), {
    ['notes.' + noteId + '.resolved']: resolved,
    updatedAt: fs.serverTimestamp(),
  });
}

export async function createRoom({ number, floor, typeSlug }) {
  number = String(number).trim();
  const templates = getTemplates();
  const tpl = typeSlug && templates[typeSlug];
  const existing = getRoom(number);
  // NEVER overwrite existing item entries (their check-offs are live data):
  // template items are appended only where the id is missing.
  const items = {};
  if (tpl) {
    for (const [id, t] of Object.entries(tpl.items)) {
      if (!existing || !existing.items || !existing.items[id]) items[id] = blankItem(t);
    }
  }
  if (state.mode === 'demo') {
    if (existing && demoDB.rooms[number]) {
      const r = demoDB.rooms[number];
      Object.assign(r, { floor: Number(floor), type: typeSlug || r.type, typeLabel: tpl ? tpl.name : r.typeLabel, deleted: false });
      Object.assign(r.items, items);
      r.updatedAt = new Date().toISOString();
    } else {
      demoDB.rooms[number] = {
        number, floor: Number(floor), type: typeSlug || '', typeLabel: tpl ? tpl.name : '',
        items, notes: {}, deleted: false, schemaV: 1,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
    }
    demoSave(); demoRefresh();
    return;
  }
  if (existing) {
    const patch = {
      floor: Number(floor), deleted: false, updatedAt: fs.serverTimestamp(),
    };
    if (typeSlug) { patch.type = typeSlug; patch.typeLabel = tpl ? tpl.name : ''; }
    for (const [id, it] of Object.entries(items)) patch['items.' + id] = it;
    await fs.updateDoc(roomRef(number), patch);
  } else {
    await fs.setDoc(roomRef(number), {
      number, floor: Number(floor), type: typeSlug || '', typeLabel: tpl ? tpl.name : '',
      items, notes: {}, deleted: false, schemaV: 1,
      createdAt: fs.serverTimestamp(), updatedAt: fs.serverTimestamp(),
    }, { merge: true }); // merge: concurrent same-number creation unions cleanly
  }
}

export async function addAdhocItem(number, code, label) {
  const room = getRoom(number); if (!room) return;
  // deterministic-ish id: next instance letter for this code, else x_ id
  const s = codeSlug(code);
  const existing = Object.keys(room.items || {}).filter(k => k.startsWith(s + '_')).length;
  const id = existing < 26 ? s + '_' + String.fromCharCode(97 + existing) : randomId();
  const maxSort = Math.max(0, ...Object.values(room.items || {}).map(i => i.sort || 0));
  const item = { ...blankItem({ code, label, sort: maxSort + 10 }) };
  markLocal(number, id);
  if (state.mode === 'demo') {
    demoDB.rooms[number].items[id] = item;
    demoSave(); demoRefresh();
    return;
  }
  await fs.updateDoc(roomRef(number), {
    ['items.' + id]: item,
    updatedAt: fs.serverTimestamp(),
  });
}

export async function softDeleteItem(number, itemId) {
  auditAppend('item-delete', number, itemId);
  if (state.mode === 'demo') { demoUpdateItem(number, itemId, { deleted: true }); return; }
  await fs.updateDoc(roomRef(number), {
    ['items.' + itemId + '.deleted']: true,
    updatedAt: fs.serverTimestamp(),
  });
}

export async function softDeleteRoom(number) {
  auditAppend('room-delete', number, '');
  if (state.mode === 'demo') {
    demoDB.rooms[number].deleted = true; demoSave(); demoRefresh();
    return;
  }
  await fs.updateDoc(roomRef(number), { deleted: true, updatedAt: fs.serverTimestamp() });
}

export async function addFloor(n, label) {
  if (state.mode === 'demo') {
    demoDB.floors[String(n)] = { label, sort: Number(n) };
    demoSave(); demoRefresh();
    return;
  }
  await fs.setDoc(fs.doc(db, 'projects', PROJECT_ID, 'config', 'app'), {
    floors: { [String(n)]: { label, sort: Number(n) } },
  }, { merge: true });
}

// ---------- bulk (dashboard) ----------

// Everything the bulk engine (js/bulk.js) needs to write through THIS store's
// backend without owning a second Firebase app instance. Demo applies are
// buffered: applyDemo mutates in place, commitDemo persists + notifies once —
// a 500-item bulk must not stringify the whole DB 500 times.
export function getBulkContext() {
  if (state.mode === 'demo') {
    return {
      mode: 'demo',
      uid: 'demo',
      user: getUser(),
      applyDemo(number, itemId, fields) {
        const room = demoDB.rooms[number];
        if (!room || !room.items[itemId]) return;
        for (const [k, v] of Object.entries(fields)) {
          if (v === undefined) delete room.items[itemId][k];   // exact-inverse restore of an absent field
          else room.items[itemId][k] = v;
        }
        room.updatedAt = new Date().toISOString();
      },
      commitDemo() { demoSave(); demoRefresh(); },
    };
  }
  return { mode: 'live', fs, db, projectId: PROJECT_ID, uid: state.uid, user: getUser() };
}

// All live docs — guest rooms AND common-area spaces — for inventory building.
export function getAllDocs() {
  return [...state.rooms.values()].filter(r => !r.deleted);
}

// ---------- subscriptions ----------

export function ensureFloorSubscribed(floor) {
  const f = String(floor);
  if (state.subscribedFloors.has(f)) return;
  if (state.mode === 'live') {
    // Screens can render before Firestore's dynamic import resolves OR before
    // the first sign-in completes (rules reject unauthenticated listens).
    // Queue the request — liveInit's auth callback flushes the queue. Marking
    // a floor "subscribed" without a live listener is how Floor 1 went dark.
    if (!fs || !db || !state.uid) { state.pendingFloors.add(f); return; }
    state.subscribedFloors.add(f);
    liveSubscribeFloor(f);
  } else {
    state.subscribedFloors.add(f);
  }
}
export function ensureAllFloorsSubscribed() {
  Object.keys(state.floors).forEach(ensureFloorSubscribed);
}

// ---------- init ----------

export async function init() {
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (_) {}
  if (state.mode === 'demo') {
    demoLoad();
    state.templates = TEMPLATES;
    demoRefresh();
    state.ready = true;
    notify();
  } else {
    await liveInit();
    // Floors queue in pendingFloors until the first sign-in completes;
    // templates + config listeners attach in the auth callback.
    ensureAllFloorsSubscribed();
  }
  return state.mode;
}
