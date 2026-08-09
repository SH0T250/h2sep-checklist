// Reference index — joins items to their submittal / plan references.
//
// Source of truth at runtime is either:
//   a) refs[] already on the item (seeded into the room doc), or
//   b) the bundled ./refs/refs-101.json emitted by the refs pipeline,
//      joined here by room number + item code.
//
// A single ref is:
//   { kind: 'submittal'|'plan', title, sheetId?, driveId?, snippet? }
//   - submittal: driveId -> in-app Drive preview popup (needs signal)
//   - plan:      snippet -> local image under ./refs/ (works offline; the
//                service worker keeps ./refs/ images in a permanent cache)
//
// The index file may be missing entirely (pipeline not run yet) or list
// snippet files that aren't deployed — every consumer tolerates both.

const INDEX_URL = './refs/refs-101.json';

const byRoomCode = new Map(); // 'room/code' -> refs[]
const byCode = new Map();     // 'code' -> refs[] (index not room-scoped)
let loadStarted = false;

function validRef(r) {
  return r && typeof r === 'object'
    && (r.kind === 'submittal' || r.kind === 'plan')
    && typeof r.title === 'string' && r.title;
}

function cleanList(refs) {
  return Array.isArray(refs) ? refs.filter(validRef) : [];
}

function ingestCodeMap(map, room = null) {
  for (const [code, refs] of Object.entries(map || {})) {
    const list = cleanList(Array.isArray(refs) ? refs : (refs && refs.refs));
    if (!list.length) continue;
    if (room !== null) byRoomCode.set(room + '/' + code, list);
    else byCode.set(code, list);
  }
}

// Tolerated index shapes (the pipeline owns the file; don't be brittle):
//   { "<code>": [refs] }                      flat code map
//   { "<code>": { refs: [refs] } }            wrapped code map
//   { "<room>": { "<code>": [refs] } }        room -> code map
//   { rooms|items: <any of the above> }       envelope
function ingest(idx) {
  if (!idx || typeof idx !== 'object') return;
  const root = idx.rooms || idx.items || idx;
  for (const [key, val] of Object.entries(root)) {
    if (Array.isArray(val)) { ingestCodeMap({ [key]: val }); continue; }
    if (!val || typeof val !== 'object') continue;
    if (Array.isArray(val.refs)) { ingestCodeMap({ [key]: val.refs }); continue; }
    // object of arrays -> treat key as a room number, val as its code map
    ingestCodeMap(val, key);
  }
}

export async function initRefs() {
  if (loadStarted) return;
  loadStarted = true;
  try {
    const r = await fetch(INDEX_URL);
    if (r.ok) ingest(await r.json());
  } catch (_) { /* offline & uncached, or not generated yet — no refs shown */ }
}

// Refs for one item. item.refs (seeded on the doc) wins over the bundled index.
export function refsFor(roomNumber, item) {
  const own = cleanList(item && item.refs);
  if (own.length) return own;
  if (!item || !item.code) return [];
  // Exact code first; then the base code with a trailing orientation 'R'
  // stripped (GR-308R is the reversed variant of GR-308 — same product,
  // same submittal and plan refs).
  const code = item.code, base = code.replace(/R$/, '');
  return byRoomCode.get(String(roomNumber) + '/' + code)
    || byCode.get(code)
    || (base !== code ? (byRoomCode.get(String(roomNumber) + '/' + base) || byCode.get(base)) : null)
    || [];
}
