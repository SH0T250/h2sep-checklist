// patch_item_notes.mjs — set ONE field on ONE item, on named rooms, and nothing else.
//
// Some lines arrive from the database already graded FLAGGED or MEDIUM but with
// no explanatory note, so the app shows "⚠ VERIFY — sources disagree" with
// nothing a crew member can act on. make_template.py now carries the database's
// own reason forward, but rooms seeded BEFORE that fix are already live and some
// of them carry real field work, so they cannot be re-seeded.
//
// This writes a targeted Firestore PATCH with an updateMask naming exactly the
// item fields being set. Everything else in the document — check-offs, initials,
// issues, room notes, timestamps — is outside the mask and is not sent, so it
// cannot be clobbered even by accident.
//
//   node tools/patch_item_notes.mjs --dry-run
//   node tools/patch_item_notes.mjs --execute
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const cfgText = await readFile(join(HERE, '..', 'js', 'config.js'), 'utf8');
const cfgValue = (n) => (cfgText.match(new RegExp(n + String.raw`\s*:\s*["']([^"']+)["']`)) || [])[1];
const cfgConst = (n) => (cfgText.match(new RegExp(String.raw`export\s+const\s+` + n + String.raw`\s*=\s*["']([^"']+)["']`)) || [])[1];

const API_KEY = cfgValue('apiKey');
const FB_PROJECT = cfgValue('projectId');
const APP_PROJECT = cfgConst('PROJECT_ID') || 'h2sep';
const BASE = `https://firestore.googleapis.com/v1/projects/${FB_PROJECT}/databases/(default)/documents`;

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
if (!EXECUTE && !args.includes('--dry-run')) {
  console.error('pass --dry-run or --execute');
  process.exit(2);
}

// The eight QQ Studio Connector rooms were seeded from the hand-built
// template-101-final.json, which predates the reason-carrying fix. Reasons below
// are the DATABASE'S OWN `note` column for room 101 — not invented here.
const ROOMS = ['101', '103', '215', '236', '336', '401', '403', '436'];
const PATCHES = {
  hd03_a: '⚑ elevation-sourced — A530 warns ‘do not treat that as a takeoff’',
  hd08_a: '⚑ elevation-sourced — not a takeoff',
};

const su = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"returnSecureToken":true}' })).json();
const AUTH = { Authorization: 'Bearer ' + su.idToken };
console.log('anon uid:', su.localId);

let changed = 0, skipped = 0, failed = 0;
for (const room of ROOMS) {
  const url = `${BASE}/projects/${APP_PROJECT}/rooms/${room}`;
  const doc = await (await fetch(url, { headers: AUTH })).json();
  if (!doc.fields) { console.error(`room ${room}: NOT FOUND`); failed++; continue; }

  const items = doc.fields.items?.mapValue?.fields || {};
  const checked = Object.values(items).filter((i) => i.mapValue.fields.checked?.booleanValue).length;

  const mask = [];
  const patchItems = {};
  for (const [iid, note] of Object.entries(PATCHES)) {
    const it = items[iid];
    if (!it) { console.log(`  room ${room}: ${iid} not present — skipped`); continue; }
    const cur = it.mapValue.fields.instanceNote?.stringValue || '';
    if (cur.trim()) { skipped++; continue; }          // never overwrite an existing note
    patchItems[iid] = { mapValue: { fields: { instanceNote: { stringValue: note } } } };
    mask.push(`items.${iid}.instanceNote`);
  }
  if (!mask.length) { console.log(`  room ${room}: nothing to do`); continue; }

  console.log(`  room ${room}: set ${mask.length} note(s) [${mask.join(', ')}] · ${checked} check-offs untouched`);
  if (!EXECUTE) continue;

  const q = mask.map((m) => `updateMask.fieldPaths=${encodeURIComponent(m)}`).join('&');
  const resp = await fetch(`${url}?${q}`, {
    method: 'PATCH',
    headers: { ...AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { items: { mapValue: { fields: patchItems } } } }),
  });
  if (!resp.ok) { console.error(`  room ${room}: FAILED ${resp.status} ${await resp.text()}`); failed++; continue; }

  // Read back and prove the check-offs survived and the note landed.
  const after = await (await fetch(url, { headers: AUTH })).json();
  const aItems = after.fields.items.mapValue.fields;
  const aChecked = Object.values(aItems).filter((i) => i.mapValue.fields.checked?.booleanValue).length;
  const ok = mask.every((m) => {
    const iid = m.split('.')[1];
    return (aItems[iid].mapValue.fields.instanceNote?.stringValue || '').length > 0;
  });
  if (!ok || aChecked !== checked) {
    console.error(`  room ${room}: VERIFY FAILED (notes ok=${ok}, checked ${checked}->${aChecked})`);
    failed++;
  } else {
    console.log(`  room ${room}: VERIFY OK — notes set, ${aChecked} check-offs intact`);
    changed++;
  }
}
console.log(`\n${EXECUTE ? 'patched' : 'would patch'} ${changed} room(s); ${skipped} note(s) already present; ${failed} failure(s)`);
process.exit(failed ? 1 : 0);
