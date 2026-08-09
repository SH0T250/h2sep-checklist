#!/usr/bin/env node
// backup_all.mjs — READ-ONLY full backup of the live Firestore tree under
// projects/h2sep, taken before any destructive operation.
//
// Usage:
//   node tools/backup_all.mjs [--out <path>]
//
// Default output: tools/out/backup-<ISO-stamp>.json
//
// Exports the collections config, rooms, templates, roles, activity as RAW
// REST document payloads — { name, fields, createTime, updateTime } exactly as
// the Firestore REST API returns them — grouped by collection, plus a meta
// block with exportedAt / project / per-collection counts / skipped
// collections.
// ALL docs are included (rooms with deleted:true too — 'deleted' is just a
// field, list returns them like any other doc).
//
// Auth is a plain anonymous sign-up. NO admin role is claimed: the security
// rules allow read on config/rooms/templates/activity for any signed-in user,
// and roles has `allow list: if false` for everyone — a rules-denied
// collection is recorded in meta.skipped with its reason instead of failing
// the run. Any OTHER skip reason (429/5xx after retries, expired token) still
// writes the file but exits non-zero: the backup is incomplete.
//
// RESTORE NOTE: the saved docs are raw REST payloads. To restore, take each
// doc's `fields` and commit an update write (documents:commit with
// { update: { name, fields } }, or PATCH the doc URL) as an authed admin —
// a manual, deliberate step; this script itself NEVER writes to Firestore.
//
// Reads Firebase web config VALUES from ../js/config.js in this repo checkout
// (parsed from the file text — not hardcoded here). Node >= 18 (built-in
// fetch), no npm deps.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

// ---- parse config VALUES out of ../js/config.js ----
const cfgText = await readFile(join(HERE, '..', 'js', 'config.js'), 'utf8');
function cfgValue(name) {
  const m = cfgText.match(new RegExp(name + String.raw`\s*:\s*["']([^"']+)["']`));
  return m ? m[1] : null;
}
function cfgConst(name) {
  const m = cfgText.match(new RegExp(String.raw`export\s+const\s+` + name + String.raw`\s*=\s*["']([^"']+)["']`));
  return m ? m[1] : null;
}
const API_KEY = cfgValue('apiKey');
const FB_PROJECT = cfgValue('projectId');       // Firebase project (h2sep-checklist)
const APP_PROJECT = cfgConst('PROJECT_ID') || 'h2sep'; // Firestore doc tree root
if (!API_KEY || !FB_PROJECT) {
  console.error('backup_all: could not parse apiKey/projectId from js/config.js');
  process.exit(1);
}

const BASE = `https://firestore.googleapis.com/v1/projects/${FB_PROJECT}/databases/(default)/documents`;

// ---- CLI ----
const args = process.argv.slice(2);
let outPath = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out') { outPath = args[++i]; continue; }
  console.error('usage: node tools/backup_all.mjs [--out <path>]');
  process.exit(1);
}
if (outPath === undefined || outPath === '') {
  console.error('backup_all: --out needs a path argument');
  process.exit(1);
}
const stamp = new Date().toISOString();
// Filesystem-safe stamp for the default filename (':' is not portable).
const OUT = outPath
  ? resolve(outPath)
  : join(HERE, 'out', `backup-${stamp.replace(/:/g, '-').replace(/\.\d+Z$/, 'Z')}.json`);

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

// ---- 1) anonymous sign-up (read-only — no role claim, none needed) ----
const su = await req('POST',
  `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
  { returnSecureToken: true });
if (su.status !== 200) {
  console.error('signUp FAILED', su.status, JSON.stringify(su.body).slice(0, 300));
  process.exit(1);
}
const { idToken, localId } = su.body;
console.log('anon uid:', localId);

// ---- 2) list every doc of one collection, following pageToken ----
// Returns { docs } on success or { skippedReason } when the rules deny the
// read (e.g. roles has `allow list: if false`) or anything else goes wrong.
async function listAll(coll) {
  const docs = [];
  let pageToken = null;
  do {
    const qs = `pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    // Transient failures (429 / 5xx) get a few retries before we give up —
    // a single flaky 503 must not demote a whole collection to "skipped".
    let res;
    for (let attempt = 0; ; attempt++) {
      res = await req('GET', `${BASE}/projects/${APP_PROJECT}/${coll}?${qs}`, null, idToken);
      if ((res.status !== 429 && res.status < 500) || attempt >= 3) break;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
    if (res.status !== 200) {
      const err = res.body && res.body.error;
      const why = err ? `${err.status || res.status}: ${(err.message || '').slice(0, 120)}` : `HTTP ${res.status}`;
      return { skippedReason: why };
    }
    docs.push(...(res.body.documents || []));
    pageToken = res.body.nextPageToken || null;
  } while (pageToken);
  return { docs };
}

// ---- 3) export each collection; a denied one is skipped, not fatal ----
// listCollectionIds needs admin credentials, so this list is hardcoded — it
// MUST mirror every collection js/store.js writes (rooms, config, roles,
// activity) plus templates, or a collection silently vanishes from the backup.
const COLLECTIONS = ['config', 'rooms', 'templates', 'roles', 'activity'];
const collections = {};
const counts = {};
const skipped = [];
for (const coll of COLLECTIONS) {
  const res = await listAll(coll);
  if (res.skippedReason) {
    skipped.push({ collection: coll, reason: res.skippedReason });
    console.log(`${coll}: SKIPPED (${res.skippedReason})`);
    continue;
  }
  collections[coll] = res.docs;   // raw REST payloads: name/fields/createTime/updateTime
  counts[coll] = res.docs.length;
  console.log(`${coll}: ${res.docs.length} doc(s)`);
}

// ---- 4) single lossless JSON file ----
const backup = {
  meta: {
    exportedAt: stamp,
    project: `${FB_PROJECT} (tree root projects/${APP_PROJECT})`,
    counts,
    skipped,
  },
  collections,
};
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(backup, null, 2) + '\n', 'utf8');
console.log('wrote', OUT);

// ---- 5) only a rules denial is an acceptable skip ----
// roles (`allow list: if false`) is expected to land here as PERMISSION_DENIED.
// Anything else — 429/5xx that survived the retries, an expired idToken — means
// data is MISSING from the file: keep the file, but exit non-zero so a
// `backup && <destructive step>` pipeline stops instead of destroying the only
// copy of an un-backed-up collection.
const unexpected = skipped.filter(s => !s.reason.startsWith('PERMISSION_DENIED'));
if (unexpected.length) {
  console.error('backup_all: BACKUP INCOMPLETE — unexpected skip(s):',
    unexpected.map(s => `${s.collection} (${s.reason})`).join('; '));
  process.exitCode = 1;
}
