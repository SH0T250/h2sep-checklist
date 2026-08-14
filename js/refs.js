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
//
// MEP PUNCH lists get their OWN index, ./refs/refs-mep.json, and their own
// join key. The FF&E index joins on the printed tag (GR-318, kn 11) because
// FF&E lines all carry one. Punch lines mostly do not: 439 of the 762 lines on
// floor 1 print their code as an em dash, and the ones that do print a mark
// print composites the drawings never print as a single string
// ("PTAC-2 / PTAC-1", "L-2 / L-3 (P401, P402) · L-3 / L-4 (P104)"). Joining
// those on `code` would hang one document off 439 unrelated devices.
//
// So the punch index joins on the ITEM ID — md5(category|mark|label|where),
// built by tools/build_mep.mjs deliberately WITHOUT the room number, so the
// same physical device carries the same id in all 115 rooms. One entry covers
// the whole hotel; a code map rides alongside it as a fallback for the marks
// that really are unique (PTAC-1, EAG-50, WAP).

const INDEX_URL = './refs/refs-101.json';
const MEP_INDEX_URL = './refs/refs-mep.json';

const byRoomCode = new Map(); // 'room/code' -> refs[]
const byCode = new Map();     // 'code' -> refs[] (index not room-scoped)
const mepByItemId = new Map(); // '<12-hex item id>' -> refs[]
const mepByCode = new Map();   // 'code' -> refs[] (fallback for unique marks)
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

// The punch index is its own file with its own explicit shape — it is NOT run
// through ingest(). ingest() guesses (an object of arrays means "room -> code
// map"), and guessing on this envelope would file every device under a room
// literally called "byItemId". Shape:
//
//   { schema: 'h2sep-mep-refs/1', generated, byItemId: {...}, byCode: {...} }
//
// Unknown top-level keys are ignored, so the builder can add provenance fields
// later without a client change.
function ingestMep(idx) {
  if (!idx || typeof idx !== 'object') return;
  for (const [id, refs] of Object.entries(idx.byItemId || {})) {
    const list = cleanList(Array.isArray(refs) ? refs : (refs && refs.refs));
    if (list.length) mepByItemId.set(String(id), list);
  }
  for (const [code, refs] of Object.entries(idx.byCode || {})) {
    const list = cleanList(Array.isArray(refs) ? refs : (refs && refs.refs));
    if (list.length) mepByCode.set(String(code), list);
  }
}

export async function initRefs() {
  if (loadStarted) return;
  loadStarted = true;
  // Two independent fetches, each swallowing its own failure. One index being
  // absent (or a phone still on a service worker that never cached it) must
  // never cost the other its refs.
  await Promise.all([
    (async () => {
      try {
        const r = await fetch(INDEX_URL);
        if (r.ok) ingest(await r.json());
      } catch (_) { /* offline & uncached, or not generated yet — no refs shown */ }
    })(),
    (async () => {
      try {
        const r = await fetch(MEP_INDEX_URL);
        if (r.ok) ingestMep(await r.json());
      } catch (_) { /* same tolerance for the punch index */ }
    })(),
  ]);
}

// "101-MEP" -> true. Kept local rather than imported from util.js so this
// module stays dependency-free; the doc-id convention is asserted by
// tests/mep-content-check.mjs on both sides.
function isMepRoomId(roomNumber) {
  return /^\d+-MEP$/.test(String(roomNumber || ''));
}

// Refs for one item. item.refs (seeded on the doc) wins over the bundled index.
// itemId is the optional Firestore map key — it lets UNTAGGED items (code '')
// join the index by their stable id (e.g. the disposer, u_ce20ab6281).

// The enlarged guest-room plan that GOVERNS each room type, taken from the
// database (the sheet the type's own item rows overwhelmingly cite), not guessed.
// The bundled index was generated for room 101, so its "no callout found — see
// A555" placeholders name the QQ family's sheet on EVERY room. A King Studio's
// television line was telling the crew to look on A555; the King rooms are drawn
// on A550. The placeholder carries no image, so nothing wrong was ever displayed
// — but it sent people to the wrong sheet to hunt for a callout that was never
// there.
const PLAN_SHEET = {
  'QQ Studio': 'A555', 'QQ Studio Connector': 'A555', 'QQ Extended': 'A555',
  'QQ ACC': 'A556',
  'King Studio': 'A550', 'King Studio Connector': 'A550',
  'King Studio Acc': 'A551', 'King Studio Acc Mod': 'A551',
  'King One Bedroom': 'A553', 'King One Bedroom ACC': 'A554',
};

// Rewrite a snippet-less "see <SHEET>" plan placeholder to name the room's own
// governing plan. Anything carrying an actual image is left alone: those crops
// come from the interior-design sheets (ID-5.8 / ID-5.10), which show the
// PRODUCT and are the same whatever room it lands in.
function localizePlan(refs, typeLabel) {
  const want = PLAN_SHEET[typeLabel];
  if (!want) return refs;
  return refs.map((r) => {
    if (r.kind !== 'plan' || r.snippet) return r;
    const m = /^(A5\d\d(?:\.\d)?)$/.exec(r.sheetId || '');
    if (!m || r.sheetId === want) return r;
    return { ...r, sheetId: want,
             title: String(r.title || '').split(r.sheetId).join(want) };
  });
}

export function refsFor(roomNumber, item, itemId = '', typeLabel = '') {
  const own = cleanList(item && item.refs);
  if (own.length) return isMepRoomId(roomNumber) ? own : localizePlan(own, typeLabel);
  if (!item) return [];

  // PUNCH LINES take the punch index, and only the punch index. Falling
  // through to the FF&E maps would let a bare mark collide across families —
  // "H" is a fire-alarm horn on the punch list and nothing at all on the FF&E
  // side today, but the next tag added to refs-101.json could change that
  // silently. localizePlan() is skipped too: it rewrites A5xx architectural
  // sheet ids per room type, which has no meaning for an M401 or a P402.
  if (isMepRoomId(roomNumber)) {
    const mcode = (item.code || '').trim();
    return (itemId ? mepByItemId.get(String(itemId)) : null)
      || (mcode ? mepByCode.get(mcode) : null)
      || [];
  }
  // Exact code first; then the base code with a trailing orientation 'R'
  // stripped (GR-308R is the reversed variant of GR-308 — same product,
  // same submittal and plan refs); finally the item id for code-less lines.
  const code = item.code || '', base = code.replace(/R$/, '');
  const hit = (code ? (byRoomCode.get(String(roomNumber) + '/' + code) || byCode.get(code)) : null)
    || (code && base !== code ? (byRoomCode.get(String(roomNumber) + '/' + base) || byCode.get(base)) : null)
    || (itemId ? (byRoomCode.get(String(roomNumber) + '/' + itemId) || byCode.get(itemId)) : null)
    || [];
  return localizePlan(hit, typeLabel);
}
