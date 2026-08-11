// Unit tests for js/bulk.js — the dashboard bulk-edit engine. Pure node, no
// browser: the engine never touches the DOM, so its planning logic is
// testable at this level, and MUST be — a wrong plan is a wrong write into
// 181 live documents.
//
// Run: node tests/bulk-unit.mjs   (exit 0 = all pass)
import {
  buildInventory, inventoryKey, emptyScope, resolveTargets, planAction,
  invertPlan, deriveUndoPlan, payloadsFor, executePlan, describePlan,
  BATCH_CHUNK, SERVER_TS, CHECK_FIELDS, CANONICAL_ISSUES,
} from '../js/bulk.js';

let failures = 0;
const ok = (cond, name) => {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name);
  if (!cond) failures++;
};

// ---------- fixture builders ----------

function item(over = {}) {
  return {
    code: 'GR-402.1', label: 'Divider Drapery Hardware', sort: 10, category: 'FF&E - Window',
    qty: 1, reliability: 'HIGH', derived: 1, src: 'A555', instanceNote: '',
    checked: false, initials: '', checkedByName: '', checkedByUid: '',
    checkedAt: null, checkedAtLocal: null,
    issue: '', issueResolved: false, deleted: false, ...over,
  };
}

function room(number, floor, items, over = {}) {
  return {
    number: String(number), floor, type: 'qq-studio', typeLabel: 'QQ Studio',
    items, notes: {}, deleted: false, schemaV: 3, ...over,
  };
}

const user = { name: 'Austin Jones', initials: 'AJ' };

function building() {
  // 3 guest rooms + 1 space; GR-402.1 missing everywhere, GR-403 mixed states.
  return [
    room(101, 1, {
      gr4021_a: item({ issue: 'MISSING' }),
      gr403_a: item({ code: 'GR-403', label: 'Closet Drapery', issue: 'MISSING' }),
      gr600_a: item({ code: 'GR-600', label: 'Queen Mattress Set', checked: true, initials: 'CC', checkedByName: 'C C' }),
    }),
    room(215, 2, {
      gr4021_a: item({ issue: 'MISSING' }),
      gr403_a: item({ code: 'GR-403', label: 'Closet Drapery', checked: true, initials: 'MD' }),
    }),
    room(301, 3, {
      gr4021_a: item({ issue: 'IN BOX' }),
      dead_a: item({ code: 'GR-999', deleted: true, issue: 'MISSING' }),
    }),
    room('003', 1, {
      hd01_a: item({ code: 'HD-01', label: 'TP Holder', category: 'Bath Accessory', issue: 'MISSING' }),
    }, { type: 'space-lobby', typeLabel: 'Lobby' }),
    room(999, 4, { gone_a: item({ code: 'GR-402.1' }) }, { deleted: true }),
  ];
}

// ---------- inventory ----------
{
  const inv = buildInventory(building());
  const row = inv.find(r => r.code === 'GR-402.1');
  ok(!!row, 'inventory has GR-402.1');
  ok(row.total === 3, `GR-402.1 total=3 excludes deleted room+item (got ${row.total})`);
  ok(row.openIssues === 3, 'GR-402.1 openIssues=3');
  ok(row.issueCounts.get('MISSING') === 2 && row.issueCounts.get('IN BOX') === 1,
    'issue strings counted exactly');
  ok(!inv.some(r => r.code === 'GR-999'), 'deleted items never inventoried');
  const hd = inv.find(r => r.code === 'HD-01');
  ok(hd && hd.spaces === 1 && hd.guest === 0, 'space docs counted as spaces');
  const g403 = inv.find(r => r.code === 'GR-403');
  ok(g403.checked === 1 && g403.total === 2, 'GR-403 1/2 checked');
}

// ---------- scope resolution ----------
{
  const docs = building();
  const s1 = emptyScope();
  s1.keys.add('c:GR-402.1');
  ok(resolveTargets(docs, s1).length === 3, 'scope by code: 3 instances');

  const s2 = emptyScope();
  s2.keys.add('c:GR-402.1');
  s2.floors.add('2');
  ok(resolveTargets(docs, s2).length === 1, 'floor filter narrows to 1');

  const s3 = emptyScope();
  s3.state = 'issue'; s3.issueText = 'MISSING';
  ok(resolveTargets(docs, s3).length === 4, 'state=issue MISSING finds 4 (incl space)');

  const s4 = emptyScope();
  s4.includeSpaces = false; s4.state = 'issue'; s4.issueText = 'MISSING';
  ok(resolveTargets(docs, s4).length === 3, 'excluding spaces drops the lobby');

  const s5 = emptyScope();
  s5.state = 'checked';
  ok(resolveTargets(docs, s5).length === 2, 'state=checked finds 2');
}

// ---------- planAction: check ----------
{
  const docs = building();
  const scope = emptyScope();
  scope.keys.add('c:GR-403');
  const plan = planAction(docs, scope, 'check', { user, uid: 'u1' });
  ok(plan.counts.changing === 1, 'check: only the unchecked instance changes');
  ok(plan.skipped.length === 1 && plan.skipped[0].why === 'checked by someone else',
    'check: MD\'s check-off is skipped, not overwritten');
  const c = plan.changes[0];
  ok(CHECK_FIELDS.every(f => f in c.fields), 'check writes the COMPLETE field group');
  ok(c.fields.initials === 'AJ' && c.fields.checkedByUid === 'u1', 'check stamps user + uid');
  ok(c.fields.checkedAt === SERVER_TS, 'checkedAt is the server-timestamp marker');
  ok(c.before.checked === false && c.before.initials === '', 'before captured for undo');
}

// ---------- planAction: overwriteChecked still never claims own+skips mine ----------
{
  const docs = building();
  const scope = emptyScope();
  scope.keys.add('c:GR-600');
  const p1 = planAction(docs, scope, 'check', { user: { name: 'C C', initials: 'CC' }, uid: 'u2' });
  ok(p1.counts.changing === 0 && p1.skipped[0].why === 'already checked off',
    'my own check-off is never restamped');
  const p2 = planAction(docs, scope, 'check', { user, uid: 'u1', overwriteChecked: true });
  ok(p2.counts.changing === 1, 'overwriteChecked restamps someone else\'s');
}

// ---------- planAction: resolveAndCheck ----------
{
  const docs = building();
  const scope = emptyScope();
  scope.state = 'issue'; scope.issueText = 'MISSING';
  const plan = planAction(docs, scope, 'resolveAndCheck', { user, uid: 'u1' });
  ok(plan.counts.changing === 4, 'resolveAndCheck hits all 4 MISSING');
  ok(plan.changes.every(c => c.fields.issueResolved === true && c.fields.checked === true),
    'resolves AND checks in one atomic patch');
  ok(plan.counts.rooms === 3 && plan.roomList.join(',') === '003,101,215',
    `rooms sorted (got ${plan.roomList.join(',')})`);
}

// ---------- planAction: renameIssue is surgical ----------
{
  const docs = building();
  const scope = emptyScope();
  const plan = planAction(docs, scope, 'renameIssue',
    { user, text: 'MISSING', renameFrom: new Set(['IN BOX']) });
  ok(plan.counts.changing === 1, 'rename only touches the selected wording');
  ok(plan.changes[0].room === '301' && plan.changes[0].fields.issue === 'MISSING',
    'rename rewrites the exact string');
  ok(!('issueResolved' in plan.changes[0].fields), 'rename never flips resolved state');
}

// ---------- planAction: setIssue / clearIssue / uncheck ----------
{
  const docs = building();
  const scope = emptyScope();
  scope.keys.add('c:GR-402.1');
  const pset = planAction(docs, scope, 'setIssue', { user, text: 'DAMAGED' });
  ok(pset.counts.changing === 3, 'setIssue re-flags even already-flagged (different text)');
  const pclear = planAction(docs, scope, 'clearIssue', { user });
  ok(pclear.counts.changing === 3 &&
     pclear.changes.every(c => c.fields.issue === '' && c.fields.issueResolved === false),
    'clearIssue empties text and resolved together');
  const punch = planAction(docs, scope, 'uncheck', { user });
  ok(punch.counts.changing === 0 && punch.counts.skipped === 3, 'uncheck skips unchecked');
}

// ---------- invertPlan is an exact reverse ----------
{
  const docs = building();
  const scope = emptyScope();
  scope.state = 'issue';
  const plan = planAction(docs, scope, 'resolveAndCheck', { user, uid: 'u1' });
  const inv = invertPlan(plan);
  ok(inv.changes.length === plan.changes.length, 'inverse covers every change');
  const a = plan.changes[0], b = inv.changes[0];
  ok(b.fields === a.before && b.before === a.fields, 'inverse swaps fields/before');
  ok(b.fields.checked === false && b.fields.issueResolved === false,
    'inverse restores unchecked + open issue');
}

// ---------- payloads: rules-whitelist compliance ----------
{
  const docs = building();
  const scope = emptyScope();
  scope.state = 'issue';
  const plan = planAction(docs, scope, 'resolveAndCheck', { user, uid: 'u1' });
  const payloads = payloadsFor(plan);
  ok(payloads.size === plan.counts.rooms, 'one payload per room doc');
  for (const [, p] of payloads) {
    ok(Object.keys(p).every(k => k.startsWith('items.')),
      'payload paths all under items.* (updatedAt added at write time)');
    break;
  }
}

// ---------- executePlan demo path round trip ----------
{
  const docs = building();
  const scope = emptyScope();
  scope.state = 'issue'; scope.issueText = 'MISSING';
  const plan = planAction(docs, scope, 'resolveAndCheck', { user, uid: 'demo' });
  // demo ctx applying onto the same objects
  const byNum = new Map(docs.map(d => [d.number, d]));
  let commits = 0;
  const ctx = {
    mode: 'demo',
    applyDemo(n, id, fields) { Object.assign(byNum.get(n).items[id], fields); },
    commitDemo() { commits++; },
  };
  const res = await executePlan(plan, ctx, () => {});
  ok(res.written === 3 && res.acked === true && commits === 1,
    'demo apply: all writes, ONE commit');
  ok(byNum.get('101').items.gr4021_a.checked === true &&
     byNum.get('101').items.gr4021_a.issueResolved === true, 'demo state updated');
  ok(typeof byNum.get('101').items.gr4021_a.checkedAt === 'string',
    'SERVER_TS became an ISO string in demo');
  // and the undo round-trips
  const undo = invertPlan(plan);
  await executePlan(undo, ctx, () => {});
  const back = byNum.get('101').items.gr4021_a;
  ok(back.checked === false && back.issue === 'MISSING' && back.issueResolved === false,
    'undo restores the exact before-state');
  ok(back.initials === '' && back.checkedAt === null, 'undo clears the whole check group');
}

// ---------- chunking ----------
{
  // 950 rooms of one item each → 3 batches at BATCH_CHUNK=400
  const docs = [];
  for (let i = 0; i < 950; i++) docs.push(room('R' + i, 1, { x_a: item({ code: 'X' }) }));
  const scope = emptyScope();
  const plan = planAction(docs, scope, 'check', { user, uid: 'u1' });
  ok(plan.counts.docWrites === 950 && plan.counts.batches === Math.ceil(950 / BATCH_CHUNK),
    `chunk math: ${plan.counts.batches} batches for 950 docs`);
}

// ---------- misc ----------
{
  ok(inventoryKey({ code: '', label: 'Garbage disposer' }) === 'l:garbage disposer',
    'code-less items key on label');
  ok(CANONICAL_ISSUES.join('|') === 'NEED INSTALL|NEED PROPER PLACE|IN BOX|DAMAGED|MISSING|WRONG ITEM',
    'issue vocabulary matches the app\'s QUICK_PICKS exactly');
  const docs = building();
  const scope = emptyScope();
  scope.state = 'issue';
  const plan = planAction(docs, scope, 'resolveIssue', { user });
  ok(describePlan(plan) === '5 items (HD-01, GR-402.1, GR-403) resolved across 4 rooms',
    `describePlan reads naturally (got "${describePlan(plan)}")`);
}

// ---------- deriveUndoPlan: undo is never a blind write ----------
{
  const docs = building();
  const scope = emptyScope();
  scope.state = 'issue'; scope.issueText = 'MISSING';
  const plan = planAction(docs, scope, 'resolveAndCheck', { user, uid: 'u1' });
  // apply it in-memory (demo path)
  const byNum = new Map(docs.map(d => [d.number, d]));
  const ctx = { mode: 'demo', applyDemo(n, id, f) {
    const out = {};
    for (const [k, v] of Object.entries(f)) out[k] = (v && v.__serverTimestamp) ? 'ts' : v;
    Object.assign(byNum.get(n).items[id], out);
  } };
  await executePlan(plan, ctx, () => {});
  const inverse = invertPlan(plan);

  // untouched world: everything undoable
  const d1 = deriveUndoPlan(inverse, docs);
  ok(d1.counts.changing === plan.counts.changing && d1.counts.skipped === 0,
    'derived undo covers everything when nothing changed since');

  // crew member re-stamps one item under their own initials after the bulk
  const it = byNum.get('215').items.gr4021_a;
  it.initials = 'CC'; it.checkedByName = 'C C'; it.checkedByUid = 'u9';
  const d2 = deriveUndoPlan(inverse, docs);
  ok(d2.counts.changing === plan.counts.changing - 1 && d2.counts.skipped === 1,
    'derived undo SKIPS the item someone re-stamped since the bulk');
  ok(d2.skipped[0].why === 'changed since the bulk edit', 'skip reason is honest');

  // item soft-deleted since the bulk
  byNum.get('101').items.gr4021_a.deleted = true;
  const d3 = deriveUndoPlan(inverse, docs);
  ok(d3.skipped.some(x => x.why === 'item no longer exists'),
    'derived undo skips items that no longer exist');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
