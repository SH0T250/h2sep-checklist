#!/usr/bin/env node
// migrate_101_103.mjs — THE room 101/103 cutover tool.
//
// Room 103 was seeded from the wrong unit mix and is superseded; room 101 is
// live with the crew's paper check-offs but on the legacy (schemaV 1) item
// list. This tool:
//   (a) soft-deletes room 103 (deleted=true, nothing else touched), and
//   (b) REPLACES room 101 with the new template, CARRYING OVER every paper
//       check-off / issue / note from the live doc onto the new lines.
//
// Usage:
//   node tools/migrate_101_103.mjs [--template tools/out/template-101-final.json] [--execute] [--allow-orphans]
//
// DEFAULT IS DRY-RUN: fetch the live docs, compute the full carry, write the
// carry report to tools/out/carry-report-101.md, print it, and make NO writes
// (dry-run doesn't even claim the admin role — pure reads). Only --execute
// performs the two writes, then reads both docs back and verifies.
//
// Carry rules (by item code, legacy live doc -> template lines):
//   - alias paper codes to DB codes (GR-202 -> GR-208, GR-308R -> GR-308);
//   - GR-319 / GR-323 (paper nightstands L/R) have no template line by ruling
//     ("GR-322 is the only nightstand") — their state (incl. any issue text)
//     is FOLDED into gr322_a's instanceNote and reported loudly, never
//     dropped silently; an OPEN issue on a fold line blocks --execute;
//   - any other unmatched legacy code is a true orphan: reported loudly, and
//     --execute REFUSES (exit 1) if a true orphan is checked or has an open
//     issue, unless --allow-orphans;
//   - legacy instances grouped by mapped code (two gr300_* -> one GR-300 ×2
//     line): all checked -> checked, some checked -> flagged for re-verify,
//     none checked -> template defaults; issues / notes merged distinct.
// Every legacy instance must be accounted for (mapped / folded / orphan) —
// asserted in code, proven by the report's final accounting line.
//
// Reads Firebase web config VALUES from ../js/config.js like seed_rooms.mjs.
// Node >= 18 (built-in fetch), no npm deps. The carry computation is a pure
// function (computeCarry) so the fixture test can run it offline.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

// ---- migration constants ------------------------------------------------

// Firestore rules whitelist room-doc top-level keys (hasOnly). Anything else
// in the template artifact (accessible/connecting) is stripped from the
// transport payload — the app derives ADA/connecting from typeLabel.
export const RULES_TOP_KEYS = ['number', 'floor', 'type', 'typeLabel', 'items', 'notes', 'deleted', 'schemaV', 'createdAt', 'updatedAt'];

// Paper code -> DB code aliases (the paper sheet predates the code cleanup).
export const ALIAS = { 'GR-202': 'GR-208', 'GR-308R': 'GR-308' };

// Fold-orphans: legacy paper lines with NO template line by ruling
// ("GR-322 is the only nightstand"). Their live state is recorded on the
// surviving template item's instanceNote instead of being dropped.
export const FOLD = {
  'GR-319': { into: 'gr322_a', pos: 'R' },
  'GR-323': { into: 'gr322_a', pos: 'L' },
};

// ---- Firestore REST value <-> plain JS ---------------------------------
// Same {__ts} timestamp marker convention as seed_rooms.mjs tv().

export function tv(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    if (!Number.isInteger(v)) throw new Error('non-integer number in room JSON: ' + v);
    return { integerValue: String(v) };
  }
  if (typeof v === 'string') return { stringValue: v };
  if (v && v.__ts) return { timestampValue: v.__ts };
  if (typeof v === 'object' && !Array.isArray(v)) {
    const fields = {};
    for (const [k, val] of Object.entries(v)) fields[k] = tv(val);
    return { mapValue: { fields } };
  }
  throw new Error('unsupported value type: ' + typeof v);
}
export function fields(obj) { return tv(obj).mapValue.fields; }

export function fromTv(v) {
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return { __ts: v.timestampValue };
  if ('mapValue' in v) {
    const out = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) out[k] = fromTv(val);
    return out;
  }
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromTv);
  throw new Error('unsupported Firestore value: ' + JSON.stringify(v).slice(0, 80));
}
// Raw REST GET response ({name, fields, ...}) -> plain JS doc.
export function decodeDoc(restDoc) {
  const out = {};
  for (const [k, v] of Object.entries(restDoc.fields || {})) out[k] = fromTv(v);
  return out;
}

// ---- carry computation (PURE — no I/O, imported by the fixture test) ----

const tsMillis = (v) => (v && v.__ts ? Date.parse(v.__ts) : -Infinity);
const distinct = (arr) => [...new Set(arr.filter((s) => typeof s === 'string' && s.trim() !== ''))];
const appendNote = (base, extra) => (base && base.trim() ? base + ' · ' + extra : extra);

// computeCarry(liveItems, templateItems) -> {
//   items:        new items map (template ids, carry applied — deep-copied),
//   checkedCount: lines checked after carry,
//   carried:      [{code, ids, initials, from}]        (fully-checked groups)
//   partials:     [{code, checked, total, initials}]   (flagged re-verify)
//   issues:       [{code, issue, resolved}]            (carried open issues)
//   folded:       [{code, pos, into, checked, initials, issue, blocking}]
//   orphans:      [{code, ids, checked, initials, issue, blocking}]
//   accounting:   {total, mapped, folded, orphan, deleted} (asserted total match)
// }
export function computeCarry(liveItems, templateItems) {
  // deep-copy template items — carry mutates the copy, never the template
  const items = JSON.parse(JSON.stringify(templateItems));

  // template lines indexed by code (one line per non-empty code, asserted)
  const byCode = {};
  for (const [id, it] of Object.entries(items)) {
    const code = it.code || '';
    if (!code) continue; // uncoded template extras (e.g. u_*) take no carry
    if (byCode[code]) throw new Error(`template has duplicate lines for code ${code} (${byCode[code]}, ${id})`);
    byCode[code] = id;
  }

  // classify every legacy instance: deleted / folded / mapped / orphan
  const groups = {};   // mapped code -> [{id, it}]
  const folded = [];
  const deleted = []; // crew soft-deleted legacy instances: no carry, own bucket
  const orphans = {};  // legacy code -> [{id, it}]
  let mappedCount = 0;
  for (const [id, it] of Object.entries(liveItems)) {
    const code = it.code || '';
    if (it.deleted === true) { deleted.push({ code, id, it }); continue; }
    if (FOLD[code]) { folded.push({ code, id, it }); continue; }
    const mapped = ALIAS[code] || code;
    if (byCode[mapped]) { (groups[mapped] ||= []).push({ id, it }); mappedCount++; }
    else (orphans[code] ||= []).push({ id, it });
  }

  // ---- mapped groups -> template line state ----
  const carried = [], partials = [], issues = [];
  for (const [code, insts] of Object.entries(groups)) {
    insts.sort((a, b) => a.id.localeCompare(b.id)); // deterministic
    const tgt = items[byCode[code]];
    const checkedInsts = insts.filter((x) => x.it.checked === true);
    const initials = distinct(checkedInsts.map((x) => x.it.initials)).join('+');

    if (checkedInsts.length === insts.length && insts.length > 0 && checkedInsts.length > 0) {
      // all instances checked -> checked, provenance from max-checkedAt instance
      let best = checkedInsts[0];
      for (const x of checkedInsts) if (tsMillis(x.it.checkedAt) > tsMillis(best.it.checkedAt)) best = x;
      tgt.checked = true;
      tgt.initials = initials;
      tgt.checkedAt = checkedInsts.reduce((m, x) => (tsMillis(x.it.checkedAt) > tsMillis(m) ? x.it.checkedAt : m), null);
      tgt.checkedByName = best.it.checkedByName ?? '';
      tgt.checkedByUid = best.it.checkedByUid ?? '';
      tgt.checkedAtLocal = best.it.checkedAtLocal ?? null;
      // from: DISTINCT source codes — equals the mapped code unless aliased,
      // so the report's "[paper code …]" tag only fires for real aliases
      carried.push({ code, ids: insts.map((x) => x.id), initials, from: distinct(insts.map((x) => x.it.code)).join(',') });
    } else if (checkedInsts.length > 0) {
      // SOME but not all -> unchecked + loud re-verify flag
      tgt.checked = false;
      tgt.instanceNote = appendNote(tgt.instanceNote,
        `⚑ carry: ${checkedInsts.length} of ${insts.length} paper instances checked (${initials}) — re-verify`);
      partials.push({ code, checked: checkedInsts.length, total: insts.length, initials });
    }
    // none checked -> template defaults untouched

    // issues: distinct non-empty texts joined '; '; resolved only if every
    // instance THAT HAD an issue was resolved
    const withIssue = insts.filter((x) => typeof x.it.issue === 'string' && x.it.issue.trim() !== '');
    if (withIssue.length > 0) {
      tgt.issue = distinct(withIssue.map((x) => x.it.issue)).join('; ');
      tgt.issueResolved = withIssue.every((x) => x.it.issueResolved === true);
      if (!tgt.issueResolved) issues.push({ code, issue: tgt.issue, resolved: false });
    }
    // legacy instanceNotes: distinct non-empty appended
    for (const note of distinct(insts.map((x) => x.it.instanceNote))) {
      tgt.instanceNote = appendNote(tgt.instanceNote, note);
    }
  }

  // ---- fold-orphans -> record ACTUAL live state on the surviving line ----
  const foldedOut = [];
  const byTarget = {};
  const foldOpenIssue = (f) =>
    typeof f.it.issue === 'string' && f.it.issue.trim() !== '' && f.it.issueResolved !== true;
  for (const f of folded.sort((a, b) => a.code.localeCompare(b.code))) {
    const spec = FOLD[f.code];
    (byTarget[spec.into] ||= []).push(f);
    foldedOut.push({
      code: f.code, pos: spec.pos, into: spec.into,
      checked: f.it.checked === true, initials: f.it.initials || '', issue: f.it.issue || '',
      // an OPEN issue on a folded line blocks --execute like a true orphan
      blocking: foldOpenIssue(f),
    });
  }
  for (const [into, fs] of Object.entries(byTarget)) {
    const tgt = items[into];
    if (!tgt) throw new Error(`fold target ${into} missing from template`);
    const allChecked = fs.every((f) => f.it.checked === true);
    const ini = distinct(fs.map((f) => f.it.initials)).join('+');
    const heads = fs.map((f) => `${f.code} @ ${FOLD[f.code].pos}`).join(' + ');
    let record = allChecked
      ? `paper ${heads} were checked (${ini}) before dedupe`
      : 'paper ' + fs.map((f) =>
          `${f.code} @ ${FOLD[f.code].pos} ${f.it.checked ? `checked (${f.it.initials})` : 'UNCHECKED'}`
        ).join(' + ') + ' before dedupe';
    // issue text on a folded line must land in the DOC, not just the report
    for (const f of fs) {
      if (typeof f.it.issue === 'string' && f.it.issue.trim() !== '') {
        record += `; ${f.code} issue "${f.it.issue}"${f.it.issueResolved === true ? ' (resolved)' : ' (OPEN)'}`;
      }
    }
    tgt.instanceNote = appendNote(tgt.instanceNote, record);
  }

  // ---- true orphans (blocking if checked or open-issue) ----
  const orphansOut = [];
  for (const [code, insts] of Object.entries(orphans)) {
    const checked = insts.some((x) => x.it.checked === true);
    const openIssue = insts.some((x) =>
      typeof x.it.issue === 'string' && x.it.issue.trim() !== '' && x.it.issueResolved !== true);
    orphansOut.push({
      code, ids: insts.map((x) => x.id), checked,
      initials: distinct(insts.map((x) => x.it.initials)).join('+'),
      issue: distinct(insts.map((x) => x.it.issue)).join('; '),
      blocking: checked || openIssue,
    });
  }

  // ---- accounting: every legacy instance mapped / folded / orphan / deleted ----
  const accounting = {
    total: Object.keys(liveItems).length,
    mapped: mappedCount,
    folded: folded.length,
    orphan: orphansOut.reduce((n, o) => n + o.ids.length, 0),
    deleted: deleted.length,
  };
  if (accounting.mapped + accounting.folded + accounting.orphan + accounting.deleted !== accounting.total) {
    throw new Error(`carry accounting FAILED: ${accounting.mapped} mapped + ${accounting.folded} folded + ` +
      `${accounting.orphan} orphan + ${accounting.deleted} deleted != ${accounting.total} legacy instances`);
  }

  const checkedCount = Object.values(items).filter((it) => it.checked === true).length;
  return { items, checkedCount, carried, partials, issues, folded: foldedOut, orphans: orphansOut, accounting };
}

// ---- new room-101 payload (PURE) ----------------------------------------
// Full replacement doc: template top-level whitelist keys, live createdAt
// preserved, updatedAt stamped, carry-applied items, notes merged (live wins
// on same note id). Non-whitelist template keys (accessible/connecting) are
// stripped.
export function buildRoomPayload(template, liveDoc, carryItems, nowTs) {
  const payload = Object.fromEntries(
    Object.entries(template).filter(([k]) => RULES_TOP_KEYS.includes(k)));
  payload.items = carryItems;
  payload.notes = { ...(template.notes || {}), ...(liveDoc.notes || {}) };
  payload.createdAt = liveDoc.createdAt;         // preserve original
  payload.updatedAt = { __ts: nowTs };           // the one nondeterminism
  if (!payload.createdAt || !payload.createdAt.__ts) throw new Error('live doc has no createdAt to preserve');
  return payload;
}

// ---- carry report (PURE) -------------------------------------------------
export function buildReport(carry, { templatePath, liveMeta, mode }) {
  const L = [];
  L.push('# Carry report — room 101 template cutover (+ room 103 soft-delete)');
  L.push('');
  L.push(`- mode: **${mode}**`);
  L.push(`- template: \`${templatePath}\``);
  L.push(`- live 101: ${liveMeta.itemCount} items, ${liveMeta.checkedCount} checked, schemaV ${liveMeta.schemaV}, createdAt ${liveMeta.createdAt}`);
  L.push(`- room 103: will be soft-deleted (deleted=true; doc + check state left in place)`);
  L.push('');
  L.push(`## Carried check-offs (${carry.carried.length} template lines end up checked: ${carry.checkedCount} total incl. template defaults)`);
  L.push('');
  for (const c of [...carry.carried].sort((a, b) => a.code.localeCompare(b.code))) {
    L.push(`- **${c.code}** ✔ (${c.initials}) ← legacy ${c.ids.join(', ')}${c.from !== c.code ? ` [paper code ${c.from}]` : ''}`);
  }
  L.push('');
  L.push(`## Partially-checked groups flagged for re-verify (${carry.partials.length})`);
  L.push('');
  if (carry.partials.length === 0) L.push('- none');
  for (const p of carry.partials) L.push(`- ⚠️ **${p.code}**: ${p.checked} of ${p.total} paper instances checked (${p.initials}) — left UNCHECKED, flagged on instanceNote`);
  L.push('');
  L.push(`## Open issues carried (${carry.issues.length})`);
  L.push('');
  for (const i of [...carry.issues].sort((a, b) => a.code.localeCompare(b.code))) L.push(`- **${i.code}**: "${i.issue}"`);
  L.push('');
  L.push(`## ⚠️ FOLDED ORPHANS (${carry.folded.length}) — paper lines with NO template line, state recorded on the survivor`);
  L.push('');
  for (const f of carry.folded) {
    L.push(`- **${f.code}** @ ${f.pos} → folded into \`${f.into}\` instanceNote — live state: ` +
      `${f.checked ? `CHECKED (${f.initials})` : 'unchecked'}${f.issue ? `, issue "${f.issue}"` : ''}` +
      `${f.blocking ? ' — OPEN issue BLOCKS --execute (use --allow-orphans to override)' : ''}`);
  }
  L.push('');
  L.push(`## ⚠️ TRUE ORPHANS (${carry.orphans.length}) — unmatched legacy codes`);
  L.push('');
  if (carry.orphans.length === 0) L.push('- none');
  for (const o of carry.orphans) {
    L.push(`- **${o.code}** (${o.ids.join(', ')}): ${o.checked ? `CHECKED (${o.initials})` : 'unchecked'}` +
      `${o.issue ? `, issue "${o.issue}"` : ''}${o.blocking ? ' — BLOCKS --execute (use --allow-orphans to override)' : ''}`);
  }
  L.push('');
  const a = carry.accounting;
  L.push('## Accounting');
  L.push('');
  L.push(`ALL ${a.total} legacy instances accounted for: ${a.mapped} mapped + ${a.folded} folded + ${a.orphan} orphan + ${a.deleted} deleted = ${a.mapped + a.folded + a.orphan + a.deleted} of ${a.total}.`);
  L.push('');
  return L.join('\n');
}

// ---- live driver (network) ----------------------------------------------

async function main() {
  // ---- CLI ----
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const allowOrphans = args.includes('--allow-orphans');
  const ti = args.indexOf('--template');
  let templatePath = ti >= 0 ? args[ti + 1] : null;
  if (ti >= 0 && !templatePath) { console.error('--template needs a path'); process.exit(1); }
  if (!templatePath) {
    // default: final template if generated, else the reviewed preview draft
    const final = join(HERE, 'out', 'template-101-final.json');
    templatePath = existsSync(final) ? final : join(HERE, '..', 'preview101', 'template-101.json');
  }

  // ---- parse config VALUES out of ../js/config.js (as seed_rooms.mjs) ----
  const cfgText = await readFile(join(HERE, '..', 'js', 'config.js'), 'utf8');
  const cfgValue = (name) => (cfgText.match(new RegExp(name + String.raw`\s*:\s*["']([^"']+)["']`)) || [])[1] || null;
  const cfgConst = (name) => (cfgText.match(new RegExp(String.raw`export\s+const\s+` + name + String.raw`\s*=\s*["']([^"']+)["']`)) || [])[1] || null;
  const API_KEY = cfgValue('apiKey');
  const FB_PROJECT = cfgValue('projectId');
  const APP_PROJECT = cfgConst('PROJECT_ID') || 'h2sep';
  const PIN = cfgConst('DEMO_PIN');
  if (!API_KEY || !FB_PROJECT) {
    console.error('migrate_101_103: could not parse apiKey/projectId from js/config.js');
    process.exit(1);
  }
  const BASE = `https://firestore.googleapis.com/v1/projects/${FB_PROJECT}/databases/(default)/documents`;
  const DOCBASE = `projects/${FB_PROJECT}/databases/(default)/documents`;
  const url101 = `${BASE}/projects/${APP_PROJECT}/rooms/101`;
  const url103 = `${BASE}/projects/${APP_PROJECT}/rooms/103`;

  async function req(method, url, body, token) {
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await r.text();
    let j; try { j = JSON.parse(text); } catch { j = { raw: text }; }
    return { status: r.status, body: j };
  }

  // ---- 1) anonymous sign-up (needed even for reads) ----
  const su = await req('POST',
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    { returnSecureToken: true });
  if (su.status !== 200) {
    console.error('signUp FAILED', su.status, JSON.stringify(su.body).slice(0, 300));
    process.exit(1);
  }
  const { idToken, localId } = su.body;
  console.log('anon uid:', localId, execute ? '(EXECUTE)' : '(dry-run)');

  // ---- 2) admin role claim — ONLY under --execute; dry-run is pure reads ----
  if (execute) {
    const NOW = new Date().toISOString();
    const role = await req('PATCH', `${BASE}/projects/${APP_PROJECT}/roles/${localId}`, {
      fields: fields({ name: 'migrate_101_103.mjs ' + NOW.slice(0, 10), pin: PIN, grantedAt: { __ts: NOW } }),
    }, idToken);
    if (role.status !== 200) {
      console.error('role claim FAILED', role.status, JSON.stringify(role.body).slice(0, 300));
      process.exit(1);
    }
    console.log('role claim: OK');
  }

  // ---- 3) fetch live docs + template ----
  const [live101res, live103res] = await Promise.all([
    req('GET', url101, null, idToken), req('GET', url103, null, idToken)]);
  for (const [no, r] of [['101', live101res], ['103', live103res]]) {
    if (r.status !== 200) {
      console.error(`room ${no}: live read FAILED`, r.status, JSON.stringify(r.body).slice(0, 300));
      process.exit(1);
    }
  }
  const live101 = decodeDoc(live101res.body);
  const live103 = decodeDoc(live103res.body);
  // server updateTime of each GET — the optimistic-concurrency preconditions
  // for the --execute writes (a crew write in between must fail the write,
  // never be silently overwritten by our stale carry computation)
  const live101UpdateTime = live101res.body.updateTime;
  const live103UpdateTime = live103res.body.updateTime;
  const template = JSON.parse(await readFile(templatePath, 'utf8'));
  console.log(`live 101: ${Object.keys(live101.items).length} items / template: ${Object.keys(template.items).length} items / live 103: ${Object.keys(live103.items).length} items`);

  // ---- 4) compute carry + payload + report ----
  const carry = computeCarry(live101.items, template.items);
  const nowTs = new Date().toISOString();
  const payload = buildRoomPayload(template, live101, carry.items, nowTs);
  const report = buildReport(carry, {
    templatePath,
    mode: execute ? 'EXECUTE' : 'DRY-RUN (no writes)',
    liveMeta: {
      itemCount: Object.keys(live101.items).length,
      checkedCount: Object.values(live101.items).filter((it) => it.checked === true).length,
      schemaV: live101.schemaV,
      createdAt: live101.createdAt?.__ts,
    },
  });
  await mkdir(join(HERE, 'out'), { recursive: true });
  const reportPath = join(HERE, 'out', 'carry-report-101.md');
  await writeFile(reportPath, report);
  console.log('\n' + report);
  console.log('report written:', reportPath);

  // ---- 5) orphan gate (true orphans + folded lines with OPEN issues) ----
  const blocking = [...carry.orphans, ...carry.folded].filter((o) => o.blocking);
  if (blocking.length > 0 && !allowOrphans) {
    console.error(`\n${blocking.length} blocking line(s) — true orphan checked/open-issue or folded open issue: ${blocking.map((o) => o.code).join(', ')}`);
    if (execute) { console.error('REFUSING --execute (pass --allow-orphans to override)'); process.exit(1); }
    console.error('note: --execute would REFUSE this state without --allow-orphans');
  }

  if (!execute) {
    console.log('\nDRY-RUN complete — no writes were made. Re-run with --execute to migrate.');
    return;
  }

  // a FAILED_PRECONDITION (HTTP 409) on either write means the doc changed
  // between our GET and the write — abort, never overwrite the crew's edit
  const stale = (r) => r.status === 409 ||
    (r.body && r.body.error && r.body.error.status === 'FAILED_PRECONDITION');

  // ---- 6) EXECUTE (a): soft-delete room 103 — deleted + updatedAt only,
  //         guarded by the updateTime we read (concurrency precondition) ----
  const stamp = new Date().toISOString();
  const del = await req('PATCH',
    `${url103}?updateMask.fieldPaths=deleted&updateMask.fieldPaths=updatedAt&currentDocument.updateTime=${encodeURIComponent(live103UpdateTime)}`,
    { fields: fields({ deleted: true, updatedAt: { __ts: stamp } }) }, idToken);
  if (del.status !== 200) {
    if (stale(del)) {
      console.error('room 103 soft-delete ABORTED: doc changed since it was read (concurrent write).');
      console.error('Re-run the tool to retry against the fresh doc.');
    } else console.error('room 103 soft-delete FAILED', del.status, JSON.stringify(del.body).slice(0, 300));
    process.exit(1);
  }
  console.log('room 103: soft-deleted');

  // ---- 6) EXECUTE (b): REPLACE room 101 (commit update, updateTime guard —
  //         a crew check-off after our GET fails the commit instead of being
  //         silently destroyed by the stale carry) ----
  const commit = await req('POST', `${BASE.replace('/documents', '')}/documents:commit`, {
    writes: [{
      update: { name: `${DOCBASE}/projects/${APP_PROJECT}/rooms/101`, fields: fields(payload) },
      currentDocument: { updateTime: live101UpdateTime },
    }],
  }, idToken);
  if (commit.status !== 200) {
    if (stale(commit)) {
      console.error('room 101 replace ABORTED: doc changed since it was read (concurrent crew write).');
      console.error('Re-run the tool so the carry is recomputed from the fresh doc.');
    } else console.error('room 101 replace FAILED', commit.status, JSON.stringify(commit.body).slice(0, 300));
    process.exit(1);
  }
  console.log('room 101: replaced from template with carry applied');

  // ---- 7) read-back verification ----
  const [rb101, rb103] = await Promise.all([
    req('GET', url101, null, idToken), req('GET', url103, null, idToken)]);
  let bad = 0;
  if (rb101.status !== 200 || rb103.status !== 200) { console.error('verify read failed'); process.exit(1); }
  const v101 = decodeDoc(rb101.body);
  const v103 = decodeDoc(rb103.body);
  const wantIds = Object.keys(template.items).sort();
  const gotIds = Object.keys(v101.items).sort();
  if (JSON.stringify(wantIds) !== JSON.stringify(gotIds)) {
    console.error(`VERIFY 101 item-id set MISMATCH — live ${gotIds.length} / template ${wantIds.length}`); bad++;
  }
  const gotChecked = Object.values(v101.items).filter((it) => it.checked === true).length;
  if (gotChecked !== carry.checkedCount) {
    console.error(`VERIFY 101 checked-count MISMATCH — live ${gotChecked} / computed ${carry.checkedCount}`); bad++;
  }
  // createdAt must round-trip as the ORIGINAL live value, not a restamp
  if (v101.createdAt?.__ts !== live101.createdAt?.__ts) {
    console.error(`VERIFY 101 createdAt MISMATCH — live ${v101.createdAt?.__ts} / original ${live101.createdAt?.__ts}`); bad++;
  }
  // deep spot-checks: carried provenance/issue/note content must round-trip
  // exactly as computed (catches a tv() encoding bug the counts would miss)
  for (const [id, key] of [
    ['gr402_a', 'initials'], ['gr402_a', 'checkedByUid'],
    ['gr208_a', 'issue'], ['gr322_a', 'instanceNote'],
  ]) {
    const want = (payload.items[id] || {})[key];
    const got = (v101.items[id] || {})[key];
    if (JSON.stringify(got) !== JSON.stringify(want)) {
      console.error(`VERIFY 101 ${id}.${key} MISMATCH — live ${JSON.stringify(got)} / computed ${JSON.stringify(want)}`); bad++;
    }
  }
  // fold record: the survivor's note must actually carry the folded codes
  for (const f of carry.folded) {
    if (!String((v101.items[f.into] || {}).instanceNote || '').includes(f.code)) {
      console.error(`VERIFY 101 ${f.into}.instanceNote missing folded ${f.code}`); bad++;
    }
  }
  if (v103.deleted !== true) { console.error('VERIFY 103 deleted != true'); bad++; }
  console.log(bad ? 'VERIFY: MISMATCH' : `VERIFY OK — 101 ids ${gotIds.length} == template, checked ${gotChecked} == carry, 103 deleted`);
  process.exit(bad ? 1 : 0);
}

// run only as a CLI — the fixture test imports the pure functions above
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
