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

  // ---- bulk: many lines at once, ONE atomic patch per document ----
  // Same rules as the crew dashboard's bulk engine: every line left alone is
  // reported with its reason (a bulk tool that silently drops rows is how you
  // end up believing you checked forty and actually checked twelve); another
  // person's initials are field evidence and are never overwritten unless the
  // user says so; a flagged line or a line with an open issue is never checked
  // off in bulk, because on paper those lines need a person's eyes.
  static BULK_SKIP = {
    ALREADY_CHECKED: 'already checked off',
    OTHER_INITIALS: 'checked by someone else',
    NOT_CHECKED: 'not checked',
    FLAGGED: 'flagged, sources disagree: open the line',
    OPEN_ISSUE: 'open issue: resolve it first',
    NO_OPEN_ISSUE: 'no open issue',
    NO_ISSUE: 'no issue to clear',
    SAME_ISSUE: 'already flagged with that text',
  };
  static BULK_ACTIONS = {
    check: 'Mark checked', uncheck: 'Mark unchecked', resolve: 'Resolve issues',
    resolveAndCheck: 'Resolve and check', setIssue: 'Flag an issue', clearIssue: 'Clear issues',
  };

  // targets: [{ docId, itemId }]. Returns the exact writes and the exact skips.
  planBulk(targets, action, opts = {}) {
    const u = this.user;
    const { text = '', overwriteChecked = false } = opts;
    const S = Store.BULK_SKIP;
    const changes = [], skipped = [];
    const stamp = nowIso();
    const CHECK_FIELDS = ['checked', 'initials', 'checkedByCo', 'checkedAt', 'checkedAtLocal'];
    const checkOn = () => ({ checked: true, initials: u.initials, checkedByCo: u.company || '', checkedAt: stamp, checkedAtLocal: stamp });
    const checkOff = () => ({ checked: false, initials: '', checkedByCo: '', checkedAt: null, checkedAtLocal: null });
    for (const t of targets) {
      const doc = this.getDoc(t.docId);
      const it = doc?.items?.[t.itemId];
      if (!it || it.deleted) continue;
      const base = { docId: t.docId, itemId: t.itemId, code: it.code || '', label: it.label || '' };
      const skip = (why) => skipped.push({ ...base, why });
      const mine = u && it.initials === u.initials;
      const openIssue = !!(it.issue && !it.issueResolved);
      let fields = null;
      if (action === 'check') {
        if (it.reliability === 'FLAGGED') { skip(S.FLAGGED); continue; }
        if (openIssue) { skip(S.OPEN_ISSUE); continue; }
        if (it.checked) { if (mine || !overwriteChecked) { skip(mine ? S.ALREADY_CHECKED : S.OTHER_INITIALS); continue; } }
        fields = checkOn();
      } else if (action === 'uncheck') {
        if (!it.checked) { skip(S.NOT_CHECKED); continue; }
        if (!mine && !overwriteChecked) { skip(S.OTHER_INITIALS); continue; }
        fields = checkOff();
      } else if (action === 'resolve') {
        if (!openIssue) { skip(S.NO_OPEN_ISSUE); continue; }
        fields = { issueResolved: true };
      } else if (action === 'resolveAndCheck') {
        if (it.reliability === 'FLAGGED') { skip(S.FLAGGED); continue; }
        const canCheck = !it.checked || (overwriteChecked && !mine);
        if (!openIssue && !canCheck) { skip(it.checked ? S.ALREADY_CHECKED : S.NO_OPEN_ISSUE); continue; }
        fields = {};
        if (openIssue) fields.issueResolved = true;
        if (canCheck) Object.assign(fields, checkOn());
      } else if (action === 'setIssue') {
        if (it.issue === text && !it.issueResolved) { skip(S.SAME_ISSUE); continue; }
        fields = { issue: text, issueResolved: false };
      } else if (action === 'clearIssue') {
        if (!it.issue) { skip(S.NO_ISSUE); continue; }
        fields = { issue: '', issueResolved: false };
      } else {
        throw new Error('unknown bulk action: ' + action);
      }
      const before = {};
      for (const k of Object.keys(fields)) before[k] = k in it ? it[k] : null;
      changes.push({ ...base, fields, before });
    }
    void CHECK_FIELDS;
    return { action, text, changes, skipped, docs: [...new Set(changes.map(c => c.docId))] };
  }

  // Apply a plan: one patch per document, one activity line per document, and
  // an in-memory undo entry that holds the exact before-state.
  applyBulk(plan) {
    if (!this.user) return null;
    if (!plan.changes.length) return { docs: 0, lines: 0 };
    const byDoc = new Map();
    for (const c of plan.changes) {
      if (!byDoc.has(c.docId)) byDoc.set(c.docId, { patch: {}, inverse: {}, n: 0 });
      const d = byDoc.get(c.docId);
      for (const [k, v] of Object.entries(c.fields)) { d.patch[`items.${c.itemId}.${k}`] = v; d.inverse[`items.${c.itemId}.${k}`] = c.before[k]; }
      d.n++;
    }
    const verb = Store.BULK_ACTIONS[plan.action] || plan.action;
    const entry = { id: 'b' + Date.now().toString(36), label: `${verb}: ${plan.changes.length} line(s) in ${byDoc.size} document(s)`, inverse: [], at: nowIso() };
    for (const [docId, d] of byDoc) {
      d.patch.updatedAt = nowIso();
      this._write(docId, d.patch, `bulk ${verb.toLowerCase()} on ${d.n} line(s) in ${docId}${plan.text ? ` (${plan.text})` : ''}`);
      entry.inverse.push({ docId, patch: d.inverse, n: d.n });
    }
    this.bulkUndo = this.bulkUndo || [];
    this.bulkUndo.push(entry);
    return { docs: byDoc.size, lines: plan.changes.length, entry };
  }

  undoBulk(entry) {
    const stack = this.bulkUndo || [];
    const e = entry || stack[stack.length - 1];
    if (!e) return false;
    this.bulkUndo = stack.filter(x => x !== e);
    for (const inv of e.inverse) this._write(inv.docId, { ...inv.patch, updatedAt: nowIso() }, `undid bulk edit on ${inv.n} line(s) in ${inv.docId}`);
    return true;
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
    // The staged seeds paint first, one file per floor; Firestore replaces
    // them within seconds. Every floor that loads is merged into one seed.
    // The approved floor-1 slice stays as the fallback so the app still boots
    // if every staged file is ever absent.
    const floors = [];
    for (const f of ['../../data/floor1-staged.json', '../../data/floor2-staged.json', '../../data/floor3-staged.json', '../../data/floor4-staged.json']) {
      try {
        const res = await fetch(new URL(f, import.meta.url));
        if (res.ok) floors.push(await res.json());
      } catch { /* that floor stays absent until Firestore arrives */ }
    }
    if (floors.length) {
      seed = { docs: {}, meta: { ...(floors[0].meta || {}), floors: floors.map(x => x.meta && x.meta.floor).filter(Boolean) } };
      for (const fl of floors) Object.assign(seed.docs, fl.docs);
    } else {
      try {
        const res = await fetch(new URL('../../data/slice-f1.json', import.meta.url));
        if (res.ok) seed = await res.json();
      } catch { /* nothing to paint from */ }
    }
  }
  return new Store(seed);
}
