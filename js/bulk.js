// Bulk edit engine for the live dashboard.
//
// The crew app edits ONE item at a time, which is right when you are standing
// in the room. It is wrong when a whole product line lands on site: "divider
// drapery hardware" is one delivery, and it is flagged MISSING in forty rooms
// at once. This module turns that into one reviewed, reversible write.
//
// Nothing here touches the DOM. It computes:
//   buildInventory()  — every item CODE in the building, with its live counts
//   resolveTargets()  — which item instances a scope selects
//   planAction()      — the exact per-item before/after, plus what it SKIPS
//   executePlan()     — chunked batched writes + an audit entry
//   invertPlan()      — the exact reverse, which is what UNDO applies
//
// Write invariants inherited from design/data-model-and-sync.md and obeyed here:
//   - a check/uncheck writes its COMPLETE field group in one update (atomic)
//   - soft deletes only; deleted items are never targets
//   - room top-level keys stay inside the rules whitelist (we only ever write
//     dotted `items.<id>.<field>` paths plus `updatedAt`)
//   - never overwrite a concurrent crew write: the plan is recomputed against
//     live state at confirm time, and check-offs that already carry someone
//     else's initials are SKIPPED unless explicitly overwritten.

import { CATEGORY_ORDER, isSpaceDoc, roomSort, toast } from './util.js';

// Firestore caps a batch at 500 writes. One room doc = one write no matter how
// many of its items change, so this chunk size is in DOCUMENTS, with headroom.
export const BATCH_CHUNK = 400;

// Items per recovery document. At roughly 300 bytes of encoded before/after per
// item this keeps each page around a quarter of Firestore's 1 MiB ceiling, with
// headroom for long ad-hoc labels and issue wording.
export const RECOVERY_PAGE_ITEMS = 800;

// Marker for "let the server stamp this". executePlan swaps it for
// serverTimestamp() (live) or an ISO string (demo) at write time — it must
// never leak into a `before` snapshot, or undo would rewrite the clock.
export const SERVER_TS = Object.freeze({ __serverTimestamp: true });
const isServerTs = (v) => !!v && typeof v === 'object' && v.__serverTimestamp === true;

// The field group a check-off owns. Writing all six together is the atomicity
// invariant: a half-written check-off (checked with no initials) is the one
// shape the paper sheets never produced and the crew would not trust.
export const CHECK_FIELDS = [
  'checked', 'initials', 'checkedByName', 'checkedByUid', 'checkedAt', 'checkedAtLocal',
];
export const ISSUE_FIELDS = ['issue', 'issueResolved'];

// The crew app's issue vocabulary — sheets.js QUICK_PICKS, same strings, same
// order, so a flag set from the dashboard reads identically to one set from a
// phone. The picker additionally offers every distinct string already live in
// the data, because the real vocabulary is whatever is in the database.
export const CANONICAL_ISSUES = [
  'NEED INSTALL', 'NEED PROPER PLACE', 'IN BOX', 'DAMAGED', 'MISSING', 'WRONG ITEM',
];

export const ACTIONS = {
  check:          { label: 'Check off',            verb: 'checked off',      needsText: false, destructive: false },
  uncheck:        { label: 'Uncheck',              verb: 'unchecked',        needsText: false, destructive: true  },
  resolveAndCheck:{ label: 'Resolve + check off',  verb: 'resolved & checked', needsText: false, destructive: false },
  resolveIssue:   { label: 'Resolve issue',        verb: 'resolved',         needsText: false, destructive: false },
  clearIssue:     { label: 'Clear issue',          verb: 'cleared',          needsText: false, destructive: true  },
  setIssue:       { label: 'Flag a problem',       verb: 'flagged',          needsText: true,  destructive: false },
  renameIssue:    { label: 'Rewrite issue text',   verb: 're-worded',        needsText: true,  destructive: false },
};

// ---------------------------------------------------------------- inventory

// Items carry a code ("GR-402.1"), but a handful of real lines have none — the
// garbage disposer is evidenced only by an electrical circuit. Those must still
// be reachable, so a code-less line keys on its label instead and says so.
export function inventoryKey(item) {
  const code = String(item.code || '').trim();
  return code ? 'c:' + code : 'l:' + String(item.label || '(unlabelled)').trim().toLowerCase();
}

function catRank(cat) {
  const i = CATEGORY_ORDER.indexOf(cat);
  return i === -1 ? CATEGORY_ORDER.length + 1 : i;
}

// Walk every live doc once and group item instances by code. `rooms` is any
// iterable of room documents (guest rooms and common-area spaces alike).
export function buildInventory(rooms) {
  const byKey = new Map();
  for (const room of rooms) {
    if (!room || room.deleted) continue;
    const isSpace = isSpaceDoc(room);
    for (const [itemId, item] of Object.entries(room.items || {})) {
      if (!item || item.deleted) continue;
      const key = inventoryKey(item);
      let row = byKey.get(key);
      if (!row) {
        row = {
          key,
          code: String(item.code || '').trim(),
          label: String(item.label || '').trim(),
          category: item.category || '',
          total: 0, checked: 0, openIssues: 0,
          issueCounts: new Map(),   // exact string -> n
          rooms: new Set(),
          floors: new Set(),
          spaces: 0, guest: 0,
          labels: new Map(),        // label -> n, to pick the most common
        };
        byKey.set(key, row);
      }
      row.total++;
      row.rooms.add(room.number);
      row.floors.add(String(room.floor));
      if (isSpace) row.spaces++; else row.guest++;
      const lbl = String(item.label || '').trim();
      if (lbl) row.labels.set(lbl, (row.labels.get(lbl) || 0) + 1);
      if (!row.category && item.category) row.category = item.category;
      if (item.checked) row.checked++;
      if (item.issue && !item.issueResolved) {
        row.openIssues++;
        row.issueCounts.set(item.issue, (row.issueCounts.get(item.issue) || 0) + 1);
      }
    }
  }
  // Labels vary by room ("Sconce @ Wall Hook" vs "@ Wall Hook, working wall").
  // Show the one most rooms use, and record that variants exist rather than
  // silently picking a winner.
  for (const row of byKey.values()) {
    let best = row.label, bestN = -1;
    for (const [lbl, n] of row.labels) if (n > bestN) { best = lbl; bestN = n; }
    row.label = best || row.label;
    row.labelVariants = row.labels.size;
    row.unchecked = row.total - row.checked;
    row.pct = row.total ? Math.round(row.checked / row.total * 100) : 0;
  }
  return [...byKey.values()].sort((a, b) =>
    catRank(a.category) - catRank(b.category) ||
    String(a.category).localeCompare(String(b.category)) ||
    String(a.code || a.label).localeCompare(String(b.code || b.label), undefined, { numeric: true }));
}

// ------------------------------------------------------------------- scope

export function emptyScope() {
  return {
    keys: new Set(),          // inventory keys; empty = every code
    floors: new Set(),        // '1'..'4'; empty = every floor
    includeGuest: true,
    includeSpaces: true,
    rooms: null,              // Set of room numbers, or null for all
    state: 'any',             // any | unchecked | checked | issue | noissue
    issueText: '',            // when state === 'issue', '' means any open issue
  };
}

function matchesState(item, scope) {
  const open = !!(item.issue && !item.issueResolved);
  switch (scope.state) {
    case 'unchecked': return !item.checked;
    case 'checked':   return !!item.checked;
    case 'issue':     return open && (!scope.issueText || item.issue === scope.issueText);
    case 'noissue':   return !open;
    default:          return true;
  }
}

// Every item instance the scope selects, in room order. This is the honest
// denominator the preview reports against.
export function resolveTargets(rooms, scope) {
  const out = [];
  const list = [...rooms].filter(r => r && !r.deleted);
  list.sort((a, b) => roomSort(a.number, b.number));
  for (const room of list) {
    const isSpace = isSpaceDoc(room);
    if (isSpace && !scope.includeSpaces) continue;
    if (!isSpace && !scope.includeGuest) continue;
    if (scope.floors.size && !scope.floors.has(String(room.floor))) continue;
    if (scope.rooms && !scope.rooms.has(room.number)) continue;
    for (const [itemId, item] of Object.entries(room.items || {})) {
      if (!item || item.deleted) continue;
      if (scope.keys.size && !scope.keys.has(inventoryKey(item))) continue;
      if (!matchesState(item, scope)) continue;
      out.push({ room, roomNumber: room.number, floor: room.floor, isSpace, itemId, item });
    }
  }
  return out;
}

// -------------------------------------------------------------------- plan

// Why an item was left alone. Shown verbatim in the preview — a bulk tool that
// silently drops rows is how you end up believing you checked forty and
// actually checked twelve.
const SKIP = {
  ALREADY_CHECKED:  'already checked off',
  ALREADY_UNCHECKED:'not checked',
  OTHER_INITIALS:   'checked by someone else',
  NO_OPEN_ISSUE:    'no open issue',
  NO_ISSUE_TEXT:    'no issue text to change',
  SAME_ISSUE:       'already flagged with that text',
  ALREADY_RESOLVED: 'issue already resolved',
  NO_CHANGE:        'nothing would change',
};

// A field the item never had must come back as ABSENT on undo, not null —
// writing null onto a legacy 12-field item would not be the exact inverse.
export const ABSENT = Object.freeze({ __absentField: true });
const isAbsent = (v) => !!v && typeof v === 'object' && v.__absentField === true;

function pick(item, fields) {
  const out = {};
  for (const f of fields) out[f] = f in item ? item[f] : ABSENT;
  return out;
}

function checkPatch(user, uid) {
  return {
    checked: true,
    initials: user.initials,
    checkedByName: user.name,
    checkedByUid: uid || '',
    checkedAt: SERVER_TS,
    checkedAtLocal: new Date(),
  };
}

const UNCHECK_PATCH = {
  checked: false, initials: '', checkedByName: '', checkedByUid: '',
  checkedAt: null, checkedAtLocal: null,
};

/**
 * Turn a scope + action into the exact set of item-level writes.
 *
 * opts.overwriteChecked — restamp items already checked by someone else.
 *   OFF by default: the crew's initials are field evidence, and a bulk pass
 *   must not quietly claim another person's work.
 */
export function planAction(rooms, scope, action, opts = {}) {
  const { user, uid = '', text = '', overwriteChecked = false, renameFrom = null } = opts;
  const targets = resolveTargets(rooms, scope);
  const changes = [];
  const skipped = [];
  const skip = (t, why) => skipped.push({ ...t, why });

  for (const t of targets) {
    const it = t.item;
    let fields = null;

    switch (action) {
      case 'check': {
        if (it.checked) {
          const mine = user && it.initials === user.initials;
          if (!overwriteChecked) { skip(t, mine ? SKIP.ALREADY_CHECKED : SKIP.OTHER_INITIALS); continue; }
          if (mine) { skip(t, SKIP.ALREADY_CHECKED); continue; }
        }
        fields = checkPatch(user, uid);
        break;
      }
      case 'uncheck': {
        if (!it.checked) { skip(t, SKIP.ALREADY_UNCHECKED); continue; }
        fields = { ...UNCHECK_PATCH };
        break;
      }
      case 'resolveIssue': {
        if (!it.issue) { skip(t, SKIP.NO_OPEN_ISSUE); continue; }
        if (it.issueResolved) { skip(t, SKIP.ALREADY_RESOLVED); continue; }
        fields = { issueResolved: true };
        break;
      }
      case 'resolveAndCheck': {
        const openIssue = it.issue && !it.issueResolved;
        const canCheck = !it.checked || (overwriteChecked && !(user && it.initials === user.initials));
        if (!openIssue && !canCheck) {
          skip(t, it.checked ? SKIP.ALREADY_CHECKED : SKIP.NO_OPEN_ISSUE);
          continue;
        }
        fields = {};
        if (openIssue) fields.issueResolved = true;
        if (canCheck) Object.assign(fields, checkPatch(user, uid));
        break;
      }
      case 'clearIssue': {
        if (!it.issue) { skip(t, SKIP.NO_ISSUE_TEXT); continue; }
        fields = { issue: '', issueResolved: false };
        break;
      }
      case 'setIssue': {
        if (it.issue === text && !it.issueResolved) { skip(t, SKIP.SAME_ISSUE); continue; }
        fields = { issue: text, issueResolved: false };
        break;
      }
      case 'renameIssue': {
        // Normalisation pass: only touches items whose issue string is one of
        // the selected variants, so "INSTALLED NEEDS SHADE." and "INSTALLED
        // NEEDS SHADE" can collapse without disturbing anything else.
        if (!it.issue) { skip(t, SKIP.NO_ISSUE_TEXT); continue; }
        if (renameFrom && !renameFrom.has(it.issue)) { skip(t, SKIP.NO_ISSUE_TEXT); continue; }
        if (it.issue === text) { skip(t, SKIP.SAME_ISSUE); continue; }
        fields = { issue: text };
        break;
      }
      default:
        throw new Error('unknown bulk action: ' + action);
    }

    // Drop no-ops so the count the user confirms is the count that changes.
    const keys = Object.keys(fields);
    const before = pick(it, keys);
    const identical = keys.every(k => !isServerTs(fields[k]) && sameValue(before[k], fields[k]));
    if (identical) { skip(t, SKIP.NO_CHANGE); continue; }

    changes.push({
      room: t.roomNumber, floor: t.floor, isSpace: t.isSpace, itemId: t.itemId,
      code: it.code || '', label: it.label || '', fields, before,
    });
  }

  const roomsTouched = new Set(changes.map(c => c.room));
  return {
    action, text,
    changes, skipped,
    counts: {
      targeted: targets.length,
      changing: changes.length,
      skipped: skipped.length,
      rooms: roomsTouched.size,
      docWrites: roomsTouched.size,
      batches: Math.ceil(roomsTouched.size / BATCH_CHUNK) || 0,
    },
    roomList: [...roomsTouched].sort(roomSort),
    skipReasons: tally(skipped.map(s => s.why)),
  };
}

function sameValue(a, b) {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (isAbsent(a) || isAbsent(b)) return isAbsent(a) && isAbsent(b);
  return a === b;
}

function tally(list) {
  const m = new Map();
  for (const x of list) m.set(x, (m.get(x) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

// The exact reverse of a plan: every change becomes before<->after swapped.
// Undo is therefore a normal plan running through the normal write path, which
// means it is batched, audited and itself undoable.
export function invertPlan(plan) {
  return {
    action: 'undo:' + plan.action,
    text: plan.text,
    changes: plan.changes.map(c => ({ ...c, fields: c.before, before: c.fields })),
    skipped: [],
    counts: { ...plan.counts, skipped: 0 },
    roomList: plan.roomList,
    skipReasons: [],
  };
}

// Undo must never be a blind write. Re-derive the inverse against CURRENT
// state: an item someone touched after the bulk (re-checked under their own
// initials, re-flagged, anything) is SKIPPED with a reason, because reverting
// it would erase work the bulk did not do. Timestamp fields are excluded from
// the touch test — server stamps never compare equal to their markers.
const UNDO_STABLE_FIELDS = ['checked', 'initials', 'checkedByName', 'checkedByUid', 'issue', 'issueResolved'];

export function deriveUndoPlan(inverse, rooms) {
  const byNum = new Map();
  for (const r of rooms) if (r && !r.deleted) byNum.set(r.number, r);
  const changes = [], skipped = [];
  for (const c of inverse.changes) {
    const room = byNum.get(c.room);
    const it = room && room.items && room.items[c.itemId];
    if (!it || it.deleted) { skipped.push({ ...c, why: 'item no longer exists' }); continue; }
    // c.before here is what the BULK WROTE (inverse swaps the pair). If the
    // item's stable fields no longer match that write, someone else has been
    // here since — leave their work alone.
    const applied = c.before;
    const touched = UNDO_STABLE_FIELDS.some(k =>
      k in applied && !isServerTs(applied[k]) && !isAbsent(applied[k]) &&
      !(applied[k] instanceof Date) && it[k] !== applied[k]);
    if (touched) { skipped.push({ ...c, why: 'changed since the bulk edit' }); continue; }
    changes.push(c);
  }
  const roomsTouched = new Set(changes.map(c => c.room));
  return {
    action: inverse.action,
    text: inverse.text,
    changes, skipped,
    counts: {
      targeted: inverse.changes.length,
      changing: changes.length,
      skipped: skipped.length,
      rooms: roomsTouched.size,
      docWrites: roomsTouched.size,
      batches: Math.ceil(roomsTouched.size / BATCH_CHUNK) || 0,
    },
    roomList: [...roomsTouched].sort(roomSort),
    skipReasons: tally(skipped.map(x => x.why)),
  };
}

// ------------------------------------------------------------------- write

// Collapse per-item changes into one dotted-path payload per room document.
export function payloadsFor(plan) {
  const byRoom = new Map();
  for (const c of plan.changes) {
    let p = byRoom.get(c.room);
    if (!p) { p = {}; byRoom.set(c.room, p); }
    for (const [k, v] of Object.entries(c.fields)) p['items.' + c.itemId + '.' + k] = v;
  }
  return byRoom;
}

/**
 * Apply a plan.
 *
 * ctx (live): { mode:'live', fs, db, projectId, uid, user }
 * ctx (demo): { mode:'demo', applyDemo(room, itemId, fields) }
 * onProgress(done, total) is called per chunk so a 181-document write can show
 * a bar instead of freezing.
 */
export async function executePlan(plan, ctx, onProgress = () => {}) {
  const byRoom = payloadsFor(plan);
  const entries = [...byRoom.entries()];
  const total = entries.length;
  if (!total) return { written: 0, batches: 0, acked: true, pending: false, settle: Promise.resolve(true) };

  if (ctx.mode === 'demo') {
    for (const c of plan.changes) {
      const fields = {};
      for (const [k, v] of Object.entries(c.fields)) {
        if (isAbsent(v)) { fields[k] = undefined; continue; }  // applyDemo deletes undefined
        fields[k] = isServerTs(v) ? new Date().toISOString()
          : (v instanceof Date ? v.toISOString() : v);
      }
      ctx.applyDemo(c.room, c.itemId, fields);
    }
    if (ctx.commitDemo) ctx.commitDemo();
    onProgress(total, total);
    return { written: total, batches: 1, acked: true, pending: false, settle: Promise.resolve(true) };
  }

  // Build EVERY batch first and commit them all before awaiting anything.
  // commit() applies to the local cache immediately and only resolves on
  // server ack — sequential awaits would mean that in a dead zone chunk 2
  // never even applied locally because chunk 1's ack never came.
  const { fs, db, projectId } = ctx;
  const commits = [];
  for (let i = 0; i < entries.length; i += BATCH_CHUNK) {
    const chunk = entries.slice(i, i + BATCH_CHUNK);
    const batch = fs.writeBatch(db);
    for (const [roomNumber, payload] of chunk) {
      const out = {};
      for (const [path, v] of Object.entries(payload)) {
        out[path] = isServerTs(v) ? fs.serverTimestamp() : (isAbsent(v) ? fs.deleteField() : v);
      }
      out.updatedAt = fs.serverTimestamp();
      batch.update(fs.doc(db, 'projects', projectId, 'platform_rooms', roomNumber), out);   // D54: one set of records
    }
    commits.push({ n: chunk.length, p: batch.commit() });
  }

  // Progress reports SERVER ACKS. The local write is already done; the caller
  // decides how long to wait for acks before telling the user "queued".
  let written = 0;
  const acks = commits.map(({ n, p }) => p.then(() => {
    written += n;
    onProgress(written, total);
  }));
  const settle = Promise.all(acks).then(() => true, () => false);
  const timeoutMs = ctx.ackTimeoutMs ?? 8000;
  const acked = await Promise.race([
    settle,
    new Promise(res => setTimeout(() => res('pending'), timeoutMs)),
  ]);
  return {
    written: total, batches: commits.length,
    acked: acked === true,             // false = rejected; 'pending' handled below
    pending: acked === 'pending',      // queued locally, no server ack yet
    settle,                            // caller may keep listening
  };
}

// One audit entry per BULK OPERATION in the hourly shard (500 per-item
// entries would push it toward Firestore's 1 MiB ceiling) PLUS a full
// per-item recovery doc under its own id — activity/{day} matches any doc id
// — so a destructive bulk can be reconstructed and hand-reversed even after
// the tab (and its in-memory undo stack) is gone. 150 items ≈ 20 KB.
export async function auditBulk(plan, ctx, bulkId) {
  if (ctx.mode !== 'live' || !ctx.fs || !ctx.db) return;
  const { fs, db, projectId } = ctx;
  const now = new Date().toISOString();
  const shard = now.slice(0, 10).replace(/-/g, '') + '-' + now.slice(11, 13);
  const entryId = 'bulk_' + bulkId;
  const codes = [...new Set(plan.changes.map(c => c.code).filter(Boolean))];
  const summary = {
    t: fs.serverTimestamp(),
    uid: ctx.uid || '',
    name: (ctx.user && ctx.user.name) || '',
    action: 'bulk:' + plan.action,
    room: '',
    itemId: '',
    bulkId,
    n: plan.changes.length,
    codes: codes.slice(0, 40),
    rooms: plan.roomList.slice(0, 60),
    roomsTotal: plan.roomList.length,
    text: plan.text || '',
  };
  const scrub = (v) => (isServerTs(v) ? '(server time)' : isAbsent(v) ? '(absent)' : v === undefined ? null : v);

  // The recovery doc is the whole point of the audit — it is what someone
  // reconstructs a bad bulk from after this tab is gone. Firestore caps a
  // document at 1 MiB, and a building-wide un-check (thousands of items at
  // ~300 B each) sails past that, so it is precisely the largest and most
  // dangerous operation whose record would silently fail to write. Shard it.
  const pages = [];
  let page = {}, pageItems = 0;
  for (const c of plan.changes) {
    const entry = { code: c.code || '', before: {}, after: {} };
    for (const [k, v] of Object.entries(c.before)) entry.before[k] = scrub(v);
    for (const [k, v] of Object.entries(c.fields)) entry.after[k] = scrub(v);
    (page[c.room] = page[c.room] || {})[c.itemId] = entry;
    if (++pageItems >= RECOVERY_PAGE_ITEMS) { pages.push(page); page = {}; pageItems = 0; }
  }
  if (pageItems || !pages.length) pages.push(page);

  const writes = [
    fs.setDoc(fs.doc(db, 'projects', projectId, 'activity', shard),
      { entries: { [entryId]: summary } }, { merge: true }),
    ...pages.map((changes, i) => fs.setDoc(
      fs.doc(db, 'projects', projectId, 'activity', 'bulk_' + bulkId + (i ? '_p' + i : '')),
      { ...summary, kind: 'bulk-recovery', page: i, pages: pages.length, changes },
      { merge: true })),
  ];
  const results = await Promise.allSettled(writes);
  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length) {
    // An audit failure must never lose the user's work — the edit already
    // landed. But it must not be invisible either: the operator is entitled to
    // know the safety net under the change they just made has a hole in it.
    console.warn('bulk audit append failed', failed.map(f => f.reason));
    toast('⚠ The edit saved, but its recovery record did not. Note what you just changed before leaving this page.');
  }
}

// A short human-readable summary used by the confirm dialog, the toast and the
// audit entry, so all three describe the operation the same way.
export function describePlan(plan) {
  const a = ACTIONS[plan.action] || { verb: plan.action };
  const n = plan.counts.changing;
  const codes = [...new Set(plan.changes.map(c => c.code).filter(Boolean))];
  let what;
  if (codes.length === 0) what = '';
  else if (codes.length <= 3) what = ` (${codes.join(', ')})`;
  else what = ` (${codes.length} codes)`;
  return `${n} item${n === 1 ? '' : 's'}${what} ${a.verb} across ${plan.counts.rooms} room${plan.counts.rooms === 1 ? '' : 's'}`;
}
