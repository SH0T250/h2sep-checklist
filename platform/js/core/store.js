// H2SEP Platform store.
// Local backend today, shaped like the Firestore ops the current app uses, so the
// Firebase backend drops in without rework (ruling D8). All writes are field-path
// patches applied atomically; check-off groups always travel together.

const LS_KEY = 'h2sep-platform-v1';
const ID_KEY = 'h2sep-platform-user';

function nowIso() { return new Date().toISOString(); }

export class Store {
  constructor(seed) {
    this.seed = seed;
    this.docs = {};
    for (const [id, doc] of Object.entries(seed.docs)) {
      this.docs[id] = structuredClone(doc);
    }
    this.activity = [];
    this.listeners = new Set();
    this.queued = 0;               // pending writes (offline story; local backend syncs instantly)
    this._replayOverlay();
  }

  // ---- identity (initials are the human identity, like the paper sheet) ----
  get user() {
    try { return JSON.parse(localStorage.getItem(ID_KEY)) || null; } catch { return null; }
  }
  setUser(name, initials) {
    localStorage.setItem(ID_KEY, JSON.stringify({ name: name.trim().slice(0, 40), initials: initials.trim().toUpperCase().slice(0, 3) }));
    this._emit();
  }

  // ---- persistence: an append-log of patches replayed over the seed ----
  _log() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; }
  }
  _replayOverlay() {
    for (const entry of this._log()) this._apply(entry.docId, entry.patch);
    for (const entry of this._log()) if (entry.activity) this.activity.push(entry.activity);
  }
  _persist(docId, patch, activity) {
    const log = this._log();
    log.push({ docId, patch, activity, at: nowIso() });
    localStorage.setItem(LS_KEY, JSON.stringify(log));
  }
  resetLocal() { localStorage.removeItem(LS_KEY); location.reload(); }

  _apply(docId, patch) {
    const doc = this.docs[docId];
    if (!doc) return;
    for (const [path, value] of Object.entries(patch)) {
      const parts = path.split('.');
      let target = doc;
      for (let i = 0; i < parts.length - 1; i++) {
        if (typeof target[parts[i]] !== 'object' || target[parts[i]] === null) target[parts[i]] = {};
        target = target[parts[i]];
      }
      target[parts[parts.length - 1]] = value;
    }
  }

  // ---- reads ----
  getDoc(id) { return this.docs[id] || null; }
  guestRooms() {
    return Object.values(this.docs)
      .filter(d => !d.deleted && d.type !== 'mep-punch' && !String(d.type).startsWith('space-'))
      .sort((a, b) => String(a.number).localeCompare(String(b.number)));
  }
  mepDoc(roomNo) { return this.docs[roomNo + '-MEP'] || null; }

  liveItems(doc) {
    return Object.entries(doc.items || {})
      .filter(([, it]) => !it.deleted)
      .sort((a, b) => (a[1].sort || 0) - (b[1].sort || 0) || a[0].localeCompare(b[0]));
  }
  roomStats(doc) {
    const items = this.liveItems(doc).map(([, it]) => it);
    const total = items.length;
    const done = items.filter(i => i.checked).length;
    const openIssues = items.filter(i => i.issue && !i.issueResolved).length
      + Object.values(doc.notes || {}).filter(n => !n.deleted && n.flag === 'issue' && !n.resolved).length;
    return { total, done, openIssues, complete: total > 0 && done === total && openIssues === 0 };
  }

  // ---- writes (each an atomic patch + activity record) ----
  _write(docId, patch, activityText) {
    const activity = activityText
      ? { text: activityText, by: this.user?.initials || '??', at: nowIso(), docId }
      : null;
    this._apply(docId, patch);
    if (activity) this.activity.push(activity);
    this._persist(docId, patch, activity);
    this._emit();
  }

  // Complete check-field group, never partial (parity contract).
  check(docId, itemId, on) {
    const u = this.user;
    if (!u) return;
    const p = `items.${itemId}.`;
    const doc = this.getDoc(docId);
    const label = doc?.items?.[itemId]?.code || doc?.items?.[itemId]?.label || itemId;
    this._write(docId, {
      [p + 'checked']: on,
      [p + 'initials']: on ? u.initials : '',
      [p + 'checkedAt']: on ? nowIso() : null,
      [p + 'checkedAtLocal']: on ? nowIso() : null,
      'updatedAt': nowIso(),
    }, `${on ? 'checked' : 'unchecked'} ${label} in ${docId}`);
  }

  setIssue(docId, itemId, issueText) {
    const p = `items.${itemId}.`;
    const doc = this.getDoc(docId);
    const label = doc?.items?.[itemId]?.code || itemId;
    this._write(docId, {
      [p + 'issue']: issueText,
      [p + 'issueResolved']: false,
      'updatedAt': nowIso(),
    }, issueText ? `flagged ${label} in ${docId}: ${issueText}` : `cleared issue on ${label} in ${docId}`);
  }
  resolveIssue(docId, itemId) {
    const p = `items.${itemId}.`;
    const doc = this.getDoc(docId);
    const label = doc?.items?.[itemId]?.code || itemId;
    this._write(docId, { [p + 'issueResolved']: true, 'updatedAt': nowIso() }, `resolved issue on ${label} in ${docId}`);
  }

  addNote(docId, text, flag) {
    const id = 'n_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    this._write(docId, {
      [`notes.${id}`]: { text: text.trim(), flag, resolved: false, createdAt: nowIso(), by: this.user?.initials || '' },
      'updatedAt': nowIso(),
    }, `added a room note in ${docId}`);
  }
  resolveNote(docId, noteId) {
    this._write(docId, { [`notes.${noteId}.resolved`]: true, 'updatedAt': nowIso() }, `resolved a room note in ${docId}`);
  }

  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _emit() { for (const fn of this.listeners) fn(); }
}

export async function loadStore() {
  let seed = window.__H2SEP_SEED;
  if (!seed) {
    const res = await fetch(new URL('../../data/slice-f1.json', import.meta.url));
    seed = await res.json();
  }
  return new Store(seed);
}
