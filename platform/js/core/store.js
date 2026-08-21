// H2SEP Platform store.
// Local backend today, shaped like the Firestore ops the current app uses, so the
// Firebase backend drops in without rework (ruling D8). All writes are field-path
// patches applied atomically; check-off groups always travel together.

const LS_KEY = 'h2sep-platform-v1';
const ID_KEY = 'h2sep-platform-user';

function nowIso() { return new Date().toISOString(); }

export class Store {
  // Long suffix first: a doc that has both is the guest-room one.
  static MEP_SUFFIXES = ['-MEP', '-M'];

  constructor(seed) {
    this.seed = seed;
    this.docs = {};
    for (const [id, doc] of Object.entries(seed.docs)) {
      this.docs[id] = structuredClone(doc);
    }
    this.activity = [];
    this.listeners = new Set();
    this.queued = 0;               // pending writes (offline story; local backend syncs instantly)
    this.backend = null;           // set by attachBackend() when Firebase is configured
    this.status = { mode: 'local', ready: true, fromCache: false, pending: 0, message: null };
    this._replayOverlay();
  }

  // ---- identity (initials are the human identity, like the paper sheet) ----
  get user() {
    try { return JSON.parse(localStorage.getItem(ID_KEY)) || null; } catch { return null; }
  }
  setUser(name, initials, company = '') {
    localStorage.setItem(ID_KEY, JSON.stringify({
      name: name.trim().slice(0, 40),
      initials: initials.trim().toUpperCase().slice(0, 3),
      company: String(company || '').trim().slice(0, 60),
    }));
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
    return Object.entries(this.docs)
      .filter(([id, d]) => !id.startsWith('_') && !d.deleted && d.type !== 'mep-punch' && !String(d.type).startsWith('space-'))
      .map(([, d]) => d)
      .sort((a, b) => String(a.number).localeCompare(String(b.number)));
  }
  // An MEP companion doc is suffixed '-MEP' on a guest room (105-MEP) and '-M'
  // on a common-area space (S003-M, SZONEB-M). The short suffix is not a typo:
  // the published Firestore rule caps a document id at 8 characters and
  // 'SZONEA-MEP' is 10, so the space docs cannot use the long one. The app
  // resolves both, preferring the long suffix, and every caller goes through
  // these two so the rule lives in exactly one place.
  // Common-area spaces: same document shape as a guest room, distinguished by a
  // "space-" type. Identified by ID rather than by type, because a space with
  // MEP lines and no FF&E lines legitimately owns the parent id and carries the
  // punch type - filtering on type alone would hide it.
  spaces() {
    const isCompanion = (id) => Store.MEP_SUFFIXES.some((sfx) => id.endsWith(sfx));
    return Object.entries(this.docs)
      .filter(([id, d]) => !id.startsWith('_') && !d.deleted &&
        String(d.type).startsWith('space-') && !isCompanion(id))
      .map(([, d]) => d)
      .sort((a, b) => String(a.typeLabel || a.number).localeCompare(String(b.typeLabel || b.number)));
  }

  mepDocId(parentId) {
    for (const suffix of Store.MEP_SUFFIXES) {
      const id = String(parentId) + suffix;
      if (this.docs[id]) return id;
    }
    return null;
  }
  mepDoc(parentId) { return this.docs[this.mepDocId(parentId)] || null; }

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
      ? { text: activityText, by: this.user?.initials || '??', byCo: this.user?.company || '', at: nowIso(), docId }
      : null;
    this._apply(docId, patch);          // optimistic: the tap lands instantly
    if (activity) this.activity.push(activity);
    if (this.backend) {
      // Firestore keeps its own offline queue and flushes on reconnect, so a
      // failure here is a real rejection (rules/auth), not a dead zone.
      this.backend.patch(docId, patch).catch(err => {
        this.status.message = 'Could not save: ' + (err.code || err.message);
        this._emit();
      });
    } else {
      this._persist(docId, patch, activity);
    }
    this._emit();
  }

  // Generic patch entry point for modules that keep their own records (the
  // directory keeps contacts in _dir and assignments in _asg). Same atomic
  // field-path write every other call site uses, so offline and sync behave
  // identically for module data and checklist data.
  write(docId, patch, activityText) { this._write(docId, patch, activityText); }

  // A module doc may not exist yet on a fresh project. Create it locally, and
  // in the cloud with merge, so the first write from any device lands.
  async ensureDoc(docId, data) {
    if (this.docs[docId]) return;                 // already have it: never write a skeleton over live records
    this.docs[docId] = structuredClone(data);
    this._emit();
    if (this.backend?.isWriteReady?.()) {
      try { await this.backend.createIfMissing(docId, data); } catch { /* rules or offline: local copy still works */ }
    }
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
      [p + 'checkedByCo']: on ? (u.company || '') : '',
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

  // Firebase takes over as the source of truth when attached. Remote docs
  // replace local ones wholesale: the server copy already carries every
  // patch this device sent, so there is nothing local worth preserving.
  async attachBackend(backend) {
    this.backend = backend;
    this.status = { mode: 'firebase', ready: false, fromCache: false, pending: 0, message: null };
    await backend.start({
      onChange: docs => {
        if (Object.keys(docs).length) {
          for (const [id, d] of Object.entries(docs)) this.docs[id] = d;
        }
        this._emit();
      },
      onStatus: st => {
        this.status = { mode: 'firebase', ...st };
        this._emit();
      },
    });
  }

  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _emit() { for (const fn of this.listeners) fn(); }
}

export async function loadStore() {
  let seed = window.__H2SEP_SEED;
  if (!seed) {
    // The full floor-1 seed paints first; Firestore replaces it within seconds.
    // The approved slice stays as the fallback so the app still boots if the
    // staged file is ever absent.
    for (const f of ['../../data/floor1-staged.json', '../../data/slice-f1.json']) {
      try {
        const res = await fetch(new URL(f, import.meta.url));
        if (res.ok) { seed = await res.json(); break; }
      } catch { /* try the next */ }
    }
  }
  return new Store(seed);
}
