// set_room_label.mjs — rename a room on the app and the dashboard.
//
// The room's DISPLAY NAME only. It never touches items, check-offs, notes,
// issues or the `type` slug — the slug is the join key to the template that IS
// that room's package (live-invariants check 1), so renaming through it would
// break the join and offer the crew a "restore" into the wrong shape.
//
// A rename is a real decision when the drawings disagree, so it is recorded:
// pass --why to state who ruled and on what, and it is written into the room's
// note trail rather than applied silently.
//
//   node tools/set_room_label.mjs 438 "King Studio Accessible Connector" --why "..."
//   node tools/set_room_label.mjs 438 "..." --check     # show, change nothing
import { readFile } from 'node:fs/promises';

const cfgText = await readFile(new URL('../js/config.js', import.meta.url), 'utf8');
const cfgValue = (n) => (cfgText.match(new RegExp(n + String.raw`\s*:\s*["']([^"']+)["']`)) || [])[1];
const cfgConst = (n) => (cfgText.match(new RegExp(String.raw`export\s+const\s+` + n + String.raw`\s*=\s*["']([^"']+)["']`)) || [])[1];

const API_KEY = cfgValue('apiKey');
const FB_PROJECT = cfgValue('projectId');
const APP_PROJECT = cfgConst('PROJECT_ID') || 'h2sep';
const PIN = cfgConst('DEMO_PIN');
const BASE = `https://firestore.googleapis.com/v1/projects/${FB_PROJECT}/databases/(default)/documents`;

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const whyAt = args.indexOf('--why');
const WHY = whyAt >= 0 ? args[whyAt + 1] : '';
// Guard whyAt >= 0: with no --why, whyAt is -1 and whyAt+1 is 0, which
// silently ate the room number.
const positional = args.filter((a, i) => !a.startsWith('--') && !(whyAt >= 0 && i === whyAt + 1));
const [ROOM, LABEL] = positional;
if (!ROOM || !LABEL) {
  console.error('usage: node tools/set_room_label.mjs <room> "<new label>" [--why "..."] [--check]');
  process.exit(2);
}

async function req(method, url, body, token) {
  const r = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

const su = await req('POST', `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { returnSecureToken: true });
if (su.status !== 200) { console.error('signUp FAILED', su.status); process.exit(1); }
const { idToken, localId } = su.body;
const NOW = new Date().toISOString();
const role = await req('PATCH', `${BASE}/projects/${APP_PROJECT}/roles/${localId}`, {
  fields: {
    name: { stringValue: 'set_room_label.mjs ' + NOW.slice(0, 10) },
    pin: { stringValue: PIN },
    grantedAt: { timestampValue: NOW },
  },
}, idToken);
if (role.status !== 200) { console.error('role claim FAILED', role.status, JSON.stringify(role.body).slice(0, 200)); process.exit(1); }

// The punch doc must keep calling the room exactly what the FF&E doc calls it
// or the two screens disagree on the same room (live-invariants check).
const targets = [ROOM, `${ROOM}-MEP`];
let changed = 0, failed = 0;

for (const id of targets) {
  const url = `${BASE}/projects/${APP_PROJECT}/rooms/${id}`;
  const cur = await req('GET', url, null, idToken);
  if (cur.status !== 200) { console.log(`${id}: not live — skipped`); continue; }
  const f = cur.body.fields || {};
  const was = (f.typeLabel || {}).stringValue || '';
  const items = (f.items || {}).mapValue?.fields || {};
  const checked = Object.values(items).filter((i) => i.mapValue?.fields?.checked?.booleanValue).length;
  console.log(`${id}: "${was}" -> "${LABEL}"  (${Object.keys(items).length} items, ${checked} checked — untouched)`);
  if (CHECK) continue;

  // updateMask keeps this a FIELD write. A whole-document PATCH would drop
  // every item, note and check-off in the doc.
  const mask = 'updateMask.fieldPaths=typeLabel&updateMask.fieldPaths=updatedAt';
  const res = await req('PATCH', `${url}?${mask}`, {
    fields: { typeLabel: { stringValue: LABEL }, updatedAt: { timestampValue: NOW } },
  }, idToken);
  if (res.status !== 200) { console.error(`${id}: FAILED`, res.status, JSON.stringify(res.body).slice(0, 200)); failed++; continue; }

  const back = await req('GET', url, null, idToken);
  const now = (back.body.fields?.typeLabel || {}).stringValue || '';
  const stillItems = Object.keys(back.body.fields?.items?.mapValue?.fields || {}).length;
  const stillChecked = Object.values(back.body.fields?.items?.mapValue?.fields || {})
    .filter((i) => i.mapValue?.fields?.checked?.booleanValue).length;
  if (now !== LABEL) { console.error(`${id}: VERIFY FAILED — reads "${now}"`); failed++; continue; }
  if (stillItems !== Object.keys(items).length || stillChecked !== checked) {
    console.error(`${id}: VERIFY FAILED — items ${Object.keys(items).length}->${stillItems}, checked ${checked}->${stillChecked}`);
    failed++; continue;
  }
  console.log(`${id}: VERIFY OK — renamed, ${stillItems} items and ${stillChecked} check-offs intact`);
  changed++;
}

if (WHY && !CHECK && !failed) {
  const url = `${BASE}/projects/${APP_PROJECT}/rooms/${ROOM}`;
  const cur = await req('GET', url, null, idToken);
  const notes = cur.body.fields?.notes?.mapValue?.fields || {};
  notes[`rename-${NOW.slice(0, 10)}`] = { stringValue: WHY };
  const res = await req('PATCH', `${url}?updateMask.fieldPaths=notes`, {
    fields: { notes: { mapValue: { fields: notes } } },
  }, idToken);
  console.log(res.status === 200 ? 'ruling recorded in the room note trail' : `note FAILED ${res.status}`);
}

console.log(`\n${changed} doc(s) renamed; ${failed} failure(s)`);
process.exit(failed ? 1 : 0);
