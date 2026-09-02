// READ ONLY: pull live platform_rooms and list open issues.
import { writeFileSync } from 'node:fs';
const API_KEY = 'AIzaSyAMRImRm7n7DsDACwH_71gChJTKRkaciT8';
const BASE = 'https://firestore.googleapis.com/v1/projects/h2sep-checklist/databases/(default)/documents';
const COL = 'projects/h2sep/platform_rooms';
function dec(v) {
  if (!v || typeof v !== 'object') return v;
  if ('stringValue' in v) return v.stringValue; if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue); if ('doubleValue' in v) return v.doubleValue;
  if ('timestampValue' in v) return v.timestampValue; if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
  if ('mapValue' in v) { const o = {}; for (const [k, x] of Object.entries(v.mapValue.fields || {})) o[k] = dec(x); return o; }
  return v;
}
const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"returnSecureToken":true}' });
const tok = (await r.json()).idToken; const H = { authorization: 'Bearer ' + tok };
const docs = {}; let pageToken = '';
do {
  const j = await (await fetch(`${BASE}/${COL}?pageSize=300${pageToken ? '&pageToken=' + pageToken : ''}`, { headers: H })).json();
  if (j.error) throw new Error(JSON.stringify(j.error));
  for (const d of j.documents || []) docs[d.name.split('/').pop()] = dec({ mapValue: { fields: d.fields } });
  pageToken = j.nextPageToken || '';
} while (pageToken);
const SP = process.argv[2];
writeFileSync(SP + '/live-platform-rooms.json', JSON.stringify(docs));
const rows = [];
for (const [id, d] of Object.entries(docs)) {
  if (d.deleted || id.startsWith('_')) continue;
  for (const [k, it] of Object.entries(d.items || {})) {
    if (!it || it.deleted) continue;
    if (it.issue && !it.issueResolved) rows.push({ docId: id, floor: d.floor, type: d.type, typeLabel: d.typeLabel, key: k, code: it.code || '', label: it.label, qty: it.qty || 1, category: it.category, issue: String(it.issue).trim().toUpperCase(), checked: !!it.checked, initials: it.initials || '', note: it.instanceNote || '' });
  }
}
writeFileSync(SP + '/open-issues.json', JSON.stringify(rows, null, 1));
const by = (arr, f) => { const m = {}; for (const x of arr) { const k = f(x); m[k] = (m[k] || 0) + 1; } return m; };
console.log('docs', Object.keys(docs).length, 'open issues', rows.length);
console.log('by issue', by(rows, x => x.issue));
const miss = rows.filter(x => x.issue === 'MISSING');
console.log('MISSING by floor', by(miss, x => x.floor));
console.log('MISSING by type', by(miss, x => x.typeLabel || x.type));
console.log('MISSING by item', Object.entries(by(miss, x => (x.code ? x.code + ' ' : '') + x.label)).sort((a, b) => b[1] - a[1]).map(e => e.join(' x')).join('\n'));
