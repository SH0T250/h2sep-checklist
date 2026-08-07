#!/usr/bin/env node
// seed_rooms.mjs — push generated room JSON docs to production Firestore.
//
// Usage:
//   node tools/seed_rooms.mjs tools/out/room-103.json [tools/out/room-104.json ...]
//   node tools/seed_rooms.mjs --merge-missing tools/out/room-103.json [...]
//
// Default mode is CREATE-ONLY (currentDocument.exists=false): an existing room
// doc is never touched — it is reported and skipped. With --merge-missing, an
// existing room is PATCHed with ONLY the item ids absent from the live doc
// (updateMask on items.`<id>` paths), so field-level state (checked, issues,
// initials...) on live items is never overwritten.
//
// Reads Firebase web config VALUES from ../js/config.js in this repo checkout
// (parsed from the file text — not hardcoded here). Node >= 18 (built-in
// fetch), no npm deps.
//
// The ONE permitted nondeterminism of the pipeline lives here: createdAt /
// updatedAt are stamped with the current time at seed-run.

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
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
const PIN = cfgConst('DEMO_PIN');
if (!API_KEY || !FB_PROJECT) {
  console.error('seed_rooms: could not parse apiKey/projectId from js/config.js');
  process.exit(1);
}

const BASE = `https://firestore.googleapis.com/v1/projects/${FB_PROJECT}/databases/(default)/documents`;
const DOCBASE = `projects/${FB_PROJECT}/databases/(default)/documents`;

// ---- CLI ----
const args = process.argv.slice(2);
const mergeMissing = args.includes('--merge-missing');
const files = args.filter((a) => a !== '--merge-missing');
if (files.length === 0) {
  console.error('usage: node tools/seed_rooms.mjs [--merge-missing] tools/out/room-<no>.json [...]');
  process.exit(1);
}

// ---- JS value -> Firestore typed value ----
function tv(v) {
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
function fields(obj) { return tv(obj).mapValue.fields; }

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

function isAlreadyExists(res) {
  if (res.status === 409) return true;
  const err = res.body && res.body.error;
  return !!(err && (err.status === 'ALREADY_EXISTS' ||
    /already exists/i.test(err.message || '')));
}

// Firestore field-path segment: backtick-quote unless it is a plain
// identifier ([a-zA-Z_][a-zA-Z0-9_]*). Item ids may start with a digit
// (e.g. '902_a'), which REQUIRES quoting inside updateMask paths.
function maskSeg(id) {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(id)) return id;
  if (id.includes('`') || id.includes('\\')) throw new Error('unquotable field path segment: ' + id);
  return '`' + id + '`';
}

// ---- 1) anonymous sign-up ----
const su = await req('POST',
  `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
  { returnSecureToken: true });
if (su.status !== 200) {
  console.error('signUp FAILED', su.status, JSON.stringify(su.body).slice(0, 300));
  process.exit(1);
}
const { idToken, localId } = su.body;
console.log('anon uid:', localId);

// ---- 2) claim admin role (PIN validated inside security rules) ----
const NOW = new Date().toISOString();
const role = await req('PATCH', `${BASE}/projects/${APP_PROJECT}/roles/${localId}`, {
  fields: fields({ name: 'seed_rooms.mjs ' + NOW.slice(0, 10), pin: PIN, grantedAt: { __ts: NOW } }),
}, idToken);
if (role.status !== 200) {
  console.error('role claim FAILED', role.status, JSON.stringify(role.body).slice(0, 300));
  process.exit(1);
}
console.log('role claim: OK');

// ---- 3) per-room seed ----
let failures = 0;
for (const file of files) {
  const room = JSON.parse(await readFile(file, 'utf8'));
  const no = room.number;
  const jsonIds = Object.keys(room.items);
  const docName = `${DOCBASE}/projects/${APP_PROJECT}/rooms/${no}`;
  const docUrl = `${BASE}/projects/${APP_PROJECT}/rooms/${no}`;
  const stamp = new Date().toISOString();

  // ---- create-only commit ----
  const payload = { ...room, createdAt: { __ts: stamp }, updatedAt: { __ts: stamp } };
  const commit = await req('POST', `${BASE.replace('/documents', '')}/documents:commit`, {
    writes: [{ update: { name: docName, fields: fields(payload) }, currentDocument: { exists: false } }],
  }, idToken);

  if (commit.status === 200) {
    // fallthrough to verification below
  } else if (isAlreadyExists(commit)) {
    if (!mergeMissing) {
      console.log(`room ${no}: room exists — skipped (use --merge-missing to append missing items only)`);
      continue;
    }
    // ---- merge-missing: PATCH only item ids absent from the live doc ----
    const live = await req('GET', docUrl, null, idToken);
    if (live.status !== 200) {
      console.error(`room ${no}: exists but read-back failed`, live.status, JSON.stringify(live.body).slice(0, 300));
      failures++; continue;
    }
    const liveItems = live.body.fields?.items?.mapValue?.fields || {};
    const missing = jsonIds.filter((id) => !(id in liveItems));
    if (missing.length === 0) {
      console.log(`room ${no}: exists, no missing items — nothing to merge`);
    } else {
      const patchFields = { updatedAt: tv({ __ts: stamp }) };
      const itemFields = {};
      for (const id of missing) itemFields[id] = tv(room.items[id]);
      patchFields.items = { mapValue: { fields: itemFields } };
      const mask = missing.map((id) => `updateMask.fieldPaths=${encodeURIComponent('items.' + maskSeg(id))}`)
        .concat(['updateMask.fieldPaths=updatedAt', 'currentDocument.exists=true']);
      const patch = await req('PATCH', `${docUrl}?${mask.join('&')}`, { fields: patchFields }, idToken);
      if (patch.status !== 200) {
        console.error(`room ${no}: merge PATCH failed`, patch.status, JSON.stringify(patch.body).slice(0, 300));
        failures++; continue;
      }
      console.log(`room ${no}: merged ${missing.length} missing item(s) into existing doc`);
    }
  } else {
    console.error(`room ${no}: commit failed`, commit.status, JSON.stringify(commit.body).slice(0, 300));
    failures++; continue;
  }

  // ---- 4) read-back verification: live item count must match the JSON ----
  const rb = await req('GET', docUrl, null, idToken);
  if (rb.status !== 200) {
    console.error(`room ${no}: verification read failed`, rb.status);
    failures++; continue;
  }
  const rbItems = rb.body.fields?.items?.mapValue?.fields || {};
  const liveIds = Object.keys(rbItems);
  const absent = jsonIds.filter((id) => !(id in rbItems));
  const ok = absent.length === 0 && liveIds.length === jsonIds.length;
  console.log(`room ${no}: VERIFY ${ok ? 'OK' : 'MISMATCH'} — live items ${liveIds.length} / json ${jsonIds.length}` +
    (absent.length ? ` — missing from live: ${absent.slice(0, 5).join(', ')}${absent.length > 5 ? ' …' : ''}` : ''));
  if (!ok && liveIds.length < jsonIds.length) failures++;
}

process.exit(failures ? 1 : 0);
