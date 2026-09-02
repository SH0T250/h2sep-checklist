// Austin's floor-4 field walk, 2026-09-02: flag lines MISSING per room.
// Dry run by default; --apply writes with field masks (issue, issueResolved, updatedAt).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const SP = process.argv[2] || process.env.H2SEP_SCRATCH || '.';   // where the backup and plan land (never the repo)
const APPLY = process.argv.includes('--apply');
const API_KEY = 'AIzaSyAMRImRm7n7DsDACwH_71gChJTKRkaciT8';
const BASE = 'https://firestore.googleapis.com/v1/projects/h2sep-checklist/databases/(default)/documents';
const COL = 'projects/h2sep/platform_rooms';
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  const f = {}; for (const [k, x] of Object.entries(v)) f[k] = enc(x); return { mapValue: { fields: f } };
}
function dec(v) {
  if (!v || typeof v !== 'object') return v;
  if ('stringValue' in v) return v.stringValue; if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue); if ('doubleValue' in v) return v.doubleValue;
  if ('timestampValue' in v) return v.timestampValue; if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
  if ('mapValue' in v) { const o = {}; for (const [k, x] of Object.entries(v.mapValue.fields || {})) o[k] = dec(x); return o; }
  return v;
}
const auth = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"returnSecureToken":true}' })).json();
const H = { authorization: 'Bearer ' + auth.idToken, 'content-type': 'application/json' };
async function getDoc(id) { const j = await (await fetch(`${BASE}/${COL}/${encodeURIComponent(id)}`, { headers: H })).json(); if (j.error) throw new Error(id + ' ' + JSON.stringify(j.error)); return dec({ mapValue: { fields: j.fields } }); }

// ---- the walk, as dictated ----
const WALK = {
  405: ['nightstands', 'sconces', 'shelves'],
  404: ['nightstands', 'sconces', 'shelves', 'rr mirror'],
  406: ['nightstands', 'sconces', 'shelves'],
  407: ['nightstands', 'desk lamp'],
  408: ['nightstands', 'desk lamp'],
  409: ['nightstands', 'desk lamp'],
  410: ['nightstands', 'closet lamp', 'desk lamp'],
  411: ['nightstands', 'rr vanity', 'desk lamp', 'working wall'],
  412: ['nightstands', 'closet lamp', 'floor lamp base'],
  413: ['nightstands', 'closet lamp', 'floor lamp base'],
  414: ['nightstands', 'closet lamp', 'couch lamp shade'],
  415: ['nightstands', 'closet lamp', 'couch lamp shade', ['working wall', 'MISSING: PIECES GR-305-1, GR-305-2, GR-305-6']],
  418: ['nightstands', ['note', 'Boxes are opened']],
  422: ['nightstands', 'couch lamp shade'],
  423: ['nightstands', ['working wall', 'MISSING: PIECE GR-304L-5'], 'couch lamp shade'],
  424: ['nightstands', 'microwave', 'desk lamp', 'rr mirror'],
  425: ['nightstands'],
  426: ['nightstands', ['working wall', 'MISSING: PIECE GR-304L-5']],
  427: ['nightstands', ['working wall', 'MISSING: PIECE GR-304L-5']],
  428: ['nightstands'],
  429: ['nightstands', ['working wall', 'MISSING: PIECE GR-304HR-5'], 'couch lamp shade', 'rr vanity'],
  430: ['nightstands', ['working wall', 'MISSING: PIECE GR-305L1-4']],
  431: ['nightstands', 'lamp base and shade'],
  432: ['lamp base and shade', 'microwave', 'rr vanity'],
  433: ['nightstands', ['working wall', 'MISSING: PIECES GR-304-4 AND GR-304-2'], 'microwave', 'rr vanity', 'lamp base and shade'],
};
// phrase -> tags by room kind (king = King Studio; qq = Queen-Queen / QQ Extended), and the flag text
const MAP = {
  'nightstands':        { king: ['GR-319', 'GR-323'], qq: ['GR-322'], text: 'MISSING' },
  'sconces':            { king: ['GR-202'], qq: ['GR-207', 'GR-208'], text: 'MISSING' },
  'shelves':            { king: ['GR-320'], qq: ['GR-321'], text: 'MISSING' },
  'rr mirror':          { king: ['GR-501'], qq: ['GR-501'], text: 'MISSING' },
  'desk lamp':          { king: ['GR-201'], qq: ['GR-201'], text: 'MISSING' },
  'closet lamp':        { king: ['GR-204'], qq: ['GR-204'], text: 'MISSING' },            // Austin: GR-204 Sconce at Wall Hook
  'floor lamp base':    { king: ['GR-205'], qq: ['GR-205'], text: 'MISSING: BASE' },
  'couch lamp shade':   { king: ['GR-200'], qq: ['GR-200'], text: 'MISSING: SHADE' },      // Austin: GR-200 Side Table Lamp at the sofa
  'lamp base and shade':{ king: ['GR-200'], qq: ['GR-200'], text: 'MISSING: BASE AND SHADE' },
  'working wall':       { king: ['GR-304'], qq: ['GR-305'], text: 'MISSING' },
  'rr vanity':          { king: ['GR-302'], qq: ['GR-302'], text: 'MISSING' },
  'microwave':          { king: ['kn 11'], qq: ['kn 11'], text: 'MISSING' },
};
const plan = []; const skipped = []; const notes = []; const backup = {};
for (const [room, phrases] of Object.entries(WALK)) {
  const doc = await getDoc(room); backup[room] = doc;
  const kind = /Queen|QQ/.test(doc.typeLabel || '') ? 'qq' : 'king';
  const byTag = {};
  for (const [k, it] of Object.entries(doc.items || {})) if (it && !it.deleted) (byTag[it.code || ''] = byTag[it.code || ''] || []).push([k, it]);
  for (const ph of phrases) {
    const [phrase, override] = Array.isArray(ph) ? ph : [ph, null];
    if (phrase === 'note') { notes.push({ room, text: override }); continue; }
    const m = MAP[phrase]; if (!m) throw new Error('unmapped phrase ' + phrase);
    const text = override || m.text;
    for (const tg of m[kind]) {
      const hits = byTag[tg] || [];
      if (!hits.length) { skipped.push({ room, tag: tg, why: 'no such line in this room (' + doc.typeLabel + ')' }); continue; }
      for (const [k, it] of hits) {
        const open = it.issue && !it.issueResolved ? it.issue : '';
        if (open === text) { skipped.push({ room, tag: tg, why: 'already flagged ' + text }); continue; }
        plan.push({ room, key: k, tag: tg, label: it.label, from: open || (it.issue ? 'resolved: ' + it.issue : ''), to: text, checked: !!it.checked, initials: it.initials || '' });
      }
    }
  }
}
mkdirSync(SP + '/backups', { recursive: true });
writeFileSync(SP + '/backups/floor4-walk-before-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json', JSON.stringify(backup));
console.log('PLAN', plan.length, 'lines;', skipped.length, 'skipped;', notes.length, 'notes');
for (const p of plan) console.log(`  ${p.room} ${p.tag.padEnd(7)} ${p.label.slice(0, 34).padEnd(34)} ${(p.from || '(none)').padEnd(22)} -> ${p.to}${p.checked ? '   [checked off by ' + p.initials + ']' : ''}`);
for (const s of skipped) console.log('  skip', s.room, s.tag, s.why);
for (const n of notes) console.log('  note', n.room, n.text);
writeFileSync(SP + '/floor4-walk-plan.json', JSON.stringify({ plan, skipped, notes }, null, 1));
if (!APPLY) { console.log('dry run only'); process.exit(0); }
// ---- apply: one PATCH per room, field masks only ----
const byRoom = {};
for (const p of plan) { const e = byRoom[p.room] = byRoom[p.room] || {}; e[`items.${p.key}.issue`] = p.to; e[`items.${p.key}.issueResolved`] = false; }
for (const n of notes) { const e = byRoom[n.room] = byRoom[n.room] || {}; const id = 'n_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); e[`notes.${id}`] = { text: n.text, flag: false, resolved: false, createdAt: new Date().toISOString(), by: 'AJ' }; }
let fail = 0;
for (const [room, patch] of Object.entries(byRoom)) {
  const withStamp = { ...patch, updatedAt: new Date().toISOString() };
  const mask = Object.keys(withStamp).map(k => 'updateMask.fieldPaths=' + encodeURIComponent(k.split('.').map(s => /^[A-Za-z_][A-Za-z0-9_]*$/.test(s) ? s : '`' + s + '`').join('.'))).join('&');
  const body = { fields: {} };
  for (const [path, value] of Object.entries(withStamp)) {
    const segs = path.split('.'); let c = body.fields;
    for (let i = 0; i < segs.length - 1; i++) { c[segs[i]] = c[segs[i]] || { mapValue: { fields: {} } }; c = c[segs[i]].mapValue.fields; }
    c[segs[segs.length - 1]] = enc(value);
  }
  const r = await fetch(`${BASE}/${COL}/${encodeURIComponent(room)}?${mask}`, { method: 'PATCH', headers: H, body: JSON.stringify(body) });
  if (!r.ok) { fail++; console.log(room, 'FAIL', r.status, (await r.text()).slice(0, 200)); } else console.log(room, 'written', Object.keys(patch).length, 'fields');
}
// ---- read back ----
let bad = 0;
for (const p of plan) { const d = await getDoc(p.room); const it = d.items[p.key]; if (it.issue !== p.to || it.issueResolved) { bad++; console.log('READBACK MISMATCH', p.room, p.tag, it.issue); } }
console.log('readback:', plan.length - bad, 'of', plan.length, 'lines match;', fail, 'failed writes');
process.exit(fail || bad ? 1 : 0);
