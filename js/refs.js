// Reference index — joins items to their submittal / plan references.
//
// Source of truth at runtime is either:
//   a) refs[] already on the item (seeded into the room doc), or
//   b) the bundled index files emitted by the refs pipeline —
//      refs-101.json (guest-room codes, flat) and refs-spaces.json
//      (common-area spaces, room-scoped: the kitchen-equipment numbering
//      reuses codes like "01" for DIFFERENT products in different spaces,
//      so space refs always join on room number + item code).
//
// A single ref is:
//   { kind: 'submittal'|'plan', title, sheetId?, driveId?, snippet? }
//   - submittal: driveId -> in-app Drive preview popup (needs signal)
//   - plan:      snippet -> local image under ./refs/ (works offline; the
//                service worker keeps ./refs/ images in a permanent cache)
//
// The index file may be missing entirely (pipeline not run yet) or list
// snippet files that aren't deployed — every consumer tolerates both.

const INDEX_URLS = ['./refs/refs-101.json', './refs/refs-spaces.json'];

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
  // Each index is independent — a missing or unparseable one (offline &
  // uncached, or not generated yet) must never block the others.
  await Promise.all(INDEX_URLS.map(async (url) => {
    try {
      const r = await fetch(url);
      if (r.ok) ingest(await r.json());
    } catch (_) { /* no refs from this index */ }
  }));
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
  if (own.length) return localizePlan(own, typeLabel);
  if (!item) return [];
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

// Does this room resolve ANY reference? Used to gate the 📄 entry points, so
// a crew member is never offered a references page that can only come up
// empty. Data-driven on purpose: the guest-room index is a flat code map that
// covers every room, while refs-spaces.json is room-scoped and currently holds
// floor 1 only — as later floors are published their buttons light up on their
// own, with no floor list here to forget to update.
export function roomHasRefs(room) {
  if (!room || !room.items) return false;
  for (const [itemId, item] of Object.entries(room.items)) {
    if (!item || item.deleted) continue;
    if (refsFor(room.number, item, itemId, room.typeLabel || '').length) return true;
  }
  return false;
}
