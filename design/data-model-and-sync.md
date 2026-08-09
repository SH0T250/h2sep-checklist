# H2SEP Room Checklist — Firestore Data Model & Offline Sync Architecture

Design doc for the PWA punch/FF&E checklist app (GitHub Pages + Firebase Spark). All names below are exact and intended to be used verbatim in code.

---

## 1. Data Model

### 1.1 Principles

- **One document per room.** ~180 room docs instead of ~5,400 item docs. A full fresh sync is ~190 reads, and a room's ~30 items arrive in one read. Items live in a **map keyed by stable instance ids** (not item codes — rooms legitimately contain the same code twice).
- **Field-path updates only** for item edits: `updateDoc(roomRef, { "items.gr600_a.status": ... })`. Two people editing *different* items in the same room can never clobber each other, because Firestore queued mutations record the touched field paths, not the whole document.
- **Soft deletes everywhere.** Hard deletes race badly with offline queues (see §2.6). Rules forbid document deletion of rooms.
- **No stored aggregates.** Room progress (12/30 done, 2 issues) is computed client-side from the items map — listeners deliver whole docs anyway, and stored counters would be a write-conflict magnet.
- **Project-scoped paths** (`projects/h2sep/...`) so a second Triun project later is a new subtree, not a schema migration.

### 1.2 Collection layout

```
projects/h2sep                          (project root doc)
projects/h2sep/config/app               (singleton config doc)
projects/h2sep/rooms/{roomNumber}       (~180 docs, doc id = room number, e.g. "101")
projects/h2sep/templates/{templateSlug} (~8-10 docs, e.g. "qq-studio-connector")
projects/h2sep/roles/{uid}              (admin allowlist, see §4)
projects/h2sep/members/{uid}            (optional roster, see §1.7)
projects/h2sep/activity/{yyyymmdd}      (optional v1.1, see §1.8)
```

### 1.3 Room document — `projects/h2sep/rooms/{roomNumber}`

Doc id = the room number string (`"101"`). This is a deliberate natural key: two offline phones creating "Room 101" simultaneously converge on the same document (§2.5).

| Field | Type | Example / notes |
|---|---|---|
| `number` | string | `"101"` — must equal doc id (enforced in rules) |
| `floor` | int | `1` |
| `type` | string | `"qq-studio-connector"` — template slug, free text allowed |
| `typeLabel` | string | `"QQ STUDIO Connector"` |
| `items` | map\<itemId, Item\> | see 1.4 |
| `notes` | map\<noteId, Note\> | room-level notes ("★ CONNECTING DOOR LOCK – NOT LOCKING") |
| `deleted` | bool | soft delete; UI hides, admin purges later |
| `schemaV` | int | `1` |
| `createdAt` | timestamp | `serverTimestamp()` at creation |
| `updatedAt` | timestamp | `serverTimestamp()` on **every** write to the doc |

**Note shape** (map value): `{ text: string, flag: "issue"|"info", resolved: bool, createdBy: string, createdByUid: string, createdAt: timestamp }`. Map, not array — concurrent note additions from two phones union instead of colliding (arrays under `set(merge)` replace wholesale; `arrayUnion` can't edit/resolve entries).

Size check: 30 items × ~200 B + overhead ≈ 7 KB/doc, against Firestore's 1 MiB/doc limit. Even a 200-item room is ~45 KB. Rules cap `items` at 200 entries.

### 1.4 Item shape (map value under `items`)

| Field | Type | Notes |
|---|---|---|
| `code` | string | `"GR-600"` |
| `label` | string | `"Q Mattress"` |
| `sort` | int | paper order × 10 (gaps allow insertion without renumbering) |
| `status` | string | `"pending"` \| `"complete"` \| `"issue"` |
| `note` | string | issue text (the red ink: "NEED PROPER PLACE"); `""` when none |
| `initials` | string | `"CC"` — shown in the checkbox |
| `checkedByName` | string | `"Carlos Cantu"` |
| `checkedByUid` | string | anonymous auth uid of the device that wrote it |
| `checkedAt` | timestamp \| null | `serverTimestamp()` — authoritative when-it-synced time |
| `checkedAtLocal` | timestamp \| null | device clock at tap time — display only ("checked 9:14 AM, synced 3:40 PM") |
| `deleted` | bool | soft delete |

**Item instance id scheme** (map keys — this is what makes duplicate codes work):

- Template-defined items: deterministic, human-readable — `gr600_a`, `gr600_b` (code lowercased, dash stripped, `_a`/`_b`… suffix for duplicates within the room type). Because these ids come from the template, two phones instantiating the same room produce **identical keys**, so concurrent creation merges idempotently (§2.5).
- Ad-hoc items added in the app or by Claude ingest for a one-off: `x_` + Date.now().toString(36) + 3 random base36 chars, e.g. `x_lyq3k9d7fa`.
- All ids match `^[a-z0-9_]{1,40}$` — no characters that require backtick-quoting in Firestore field paths, which keeps both SDK `updateDoc` paths and REST `updateMask.fieldPaths` simple.
- Ids are **immutable** once created. Never renumber, never reuse.

### 1.5 Config doc — `projects/h2sep/config/app`

| Field | Type | Notes |
|---|---|---|
| `projectName` | string | `"H2SEP — Home2 Suites, Eagle Pass TX"` |
| `floors` | map | `{ "1": {label: "Level 1", sort: 1}, ... "4": {...} }` — map so two admins adding floors concurrently union |
| `pinSalt` | string | random 16 hex chars |
| `pinHash` | string | lowercase hex `sha256(pinSalt + pin)` — **UI gate only** (§4.3) |
| `schemaV` | int | `1` |

The project root doc `projects/h2sep` holds only `{ name, createdAt }` (a parent doc so the subtree shows in console; not otherwise read).

### 1.6 Template docs — `projects/h2sep/templates/{slug}`

Slugs: `queen-queen`, `queen-queen-wide`, `queen-queen-connector`, `king-studio`, `king-studio-connector`, `king-one-bedroom`, `qq-studio`, plus `-ada` variants as needed.

| Field | Type | Notes |
|---|---|---|
| `name` | string | `"QQ Studio Connector"` |
| `items` | map\<itemId, {code, label, sort}\> | same id scheme as 1.4, **no** status/initials fields |
| `updatedAt` | timestamp | |

"Duplicate a room type" in-app = read template, copy `items` adding `status:"pending", note:"", initials:"", checkedByName:"", checkedByUid:"", checkedAt:null, checkedAtLocal:null, deleted:false` to each entry, `setDoc(roomRef, ..., {merge:true})`.

### 1.7 Members (optional, cheap, recommended) — `projects/h2sep/members/{uid}`

`{ name: string, initials: string, lastSeenAt: timestamp }`. Written by each device on launch (throttled to once/hour). Gives the admin screen a "who's using the app" roster and maps uids in `checkedByUid` back to people if someone fat-fingers their name. ~10 writes/day. Skippable without consequence.

### 1.8 Activity log — **skip in v1**, schema reserved for v1.1

Justification for skipping: the accountability requirement ("who + when per line item") is already satisfied *on the item itself* (`initials`, `checkedByName`, `checkedByUid`, `checkedAt`). A separate log would double the write count of every tap, add a second code path to every mutation, and its main payoff (a chronological feed / undo trail) wasn't requested. Ship without it.

If Austin later wants a feed, add **one doc per day**: `projects/h2sep/activity/{yyyymmdd}` with `entries: map<entryId, { t: timestamp, uid, name, room, itemId, code, action: "check"|"uncheck"|"issue"|"note"|"add_room"|"add_item", to: string }>`, entryId = last-6-of-uid + `_` + Date.now().toString(36). Appends are field-path updates (concurrent-safe), the "today" listener costs 1 read + changes, and capping = admin "purge > 14 days" button deleting old day docs (well under the 20K deletes/day quota).

---

## 2. Conflict Resolution

The load-bearing Firestore behaviors, and which scenario each one handles:

| # | Scenario | What happens | Firestore behavior relied on | Client-side guard needed |
|---|---|---|---|---|
| 2.1 | Two offline phones edit **different items in the same room** | Both edits survive. Phone A's queued mutation touches `items.gr103_a.*`, phone B's touches `items.gr400_a.*`; on reconnect each replays only its recorded field paths against the server doc | Offline queue stores **mutations with field-path granularity**, not doc snapshots; `updateDoc` with dotted paths merges | None |
| 2.2 | Two phones edit the **same item** | Per-field last-write-wins, ordered by **server commit time** (arrival order, not tap order — a 9 AM tap that syncs at 4 PM beats a 10 AM tap that synced at noon) | LWW per field at commit | **Atomic full-status writes**: every status change writes the complete status field set (`status`, `note`, `initials`, `checkedByName`, `checkedByUid`, `checkedAt`, `checkedAtLocal`) in **one** `updateDoc` call. All fields of one mutation commit atomically, so the item always ends as one coherent editor's version — never Alice's initials on Bob's status. Accept the LWW outcome; a checklist tap is idempotent-ish and the live UI makes double-work rare once online |
| 2.3 | Phone A completes an item, phone B flags it `issue` | LWW as above; later commit wins wholesale (including its `note`) | Same | UX-only softener: when a device is *online* and the current status is `issue`, the app shows the note and asks "override issue?" before writing. Cannot be enforced offline — stated honestly |
| 2.4 | Item check races a room-level edit (rename, note added) | No conflict — disjoint field paths | Field-path merge | None |
| 2.5 | Two phones **add the same room** (both create "205" offline) | Both run `setDoc(doc(db,'projects/h2sep/rooms/205'), data, {merge:true})`. Same doc id (number = id), and template-derived item ids are identical, so the maps union into **one clean room**. If they chose different room *types*, the later commit's `type`/`typeLabel` win and the items maps union — an admin tidies the rare mess | Natural-key doc ids + `set(...,{merge:true})` recursive map union + deterministic template item ids | Room-create must always use `merge:true`, never plain `set` |
| 2.6 | Add rooms with **different** numbers simultaneously | Different docs. Trivially fine | — | None |
| 2.7 | One phone **deletes** an item while another edits it | **This is why deletes are soft.** A hard `deleteField()` racing a queued `items.X.status` update would resurrect a ghost object `{status:"complete"}` with no code/label (nested-path writes create intermediate maps). Instead deletion writes `items.X.deleted = true`; a racing status edit merges harmlessly into a hidden item | Field-path merge semantics | Soft-delete flag; hard purge (`deleteField()`) only from the admin screen, ideally after everyone has synced |
| 2.8 | Same anonymous uid, two tabs (installed PWA + Safari tab) | Shared IndexedDB, coordinated | `persistentMultipleTabManager()` leader election | None |

Additional invariants the client must maintain:
- Every write sets `updatedAt: serverTimestamp()` (debugging, and the future delta-sync lever in §3.4).
- `serverTimestamp()` for `checkedAt` always; `checkedAtLocal` from `new Date()` for honest display of tap time.
- Never call `signOut()` — it would strand the mutation queue's identity.

---

## 3. Spark Free-Tier Quota Math

**Verified current Spark/free limits:** 50,000 document reads/day, 20,000 writes/day, 20,000 deletes/day, 1 GiB storage, 10 GiB/month egress; quotas reset around midnight Pacific; one free database per project. Also verified: with offline persistence enabled, a realtime listener disconnected **> 30 minutes** is billed on reconnect **as if it were a brand-new query** (full result-set re-read), then per-change thereafter.

Dataset size: 180 rooms × ~7 KB ≈ **1.3 MB** total (~0.15% of 1 GiB). Egress ~10 MB/day (~3% of monthly cap). Storage and egress are non-issues; the budget is reads.

### 3.1 Fresh-device initial sync

180 rooms + 1 config + ~9 templates ≈ **190 reads**. All 10 crew onboarding the same day ≈ 1,900 reads (3.8% of daily budget).

### 3.2 A working day — 10 crew, ~300 item checks

- **Writes:** 300 checks (1 write each — one `updateDoc` per tap regardless of field count) + ~40 note/room edits + 10 member pings ≈ **350 writes = 1.8%** of 20K.
- **Reads:**
  - Listener re-attachment: assume worst case — every app-open is a >30-min gap, so the `rooms` collection listener re-reads everything. 10 devices × 3 opens/day × 190 docs ≈ **5,700 reads**.
  - Realtime fan-out: each committed write costs 1 read on each *other* listening device: 350 × 9 ≈ **3,150 reads**.
  - Total ≈ **9,000–10,000 reads/day ≈ 20%** of 50K.

### 3.3 Where the ceiling is

Reads dominate: `opens × devices × docCount + writes × (devices − 1) ≤ 50,000`.

- 10 devices: safe by 5× even with heavy use.
- ~**25–30 devices** at 4–5 opens/day (~190 docs each) approaches 40–50K — that's the practical Spark ceiling for this design.
- Writes are unreachable: 20K taps/day means touching all ~5,400 item instances 3.7 times in one day.

**Levers before paying** (in order): (1) floor-scoped listeners — `query(rooms, where('floor','==',n))` for the floor being worked cuts re-attach cost ~4×; (2) delta listener — `where('updatedAt','>', lastSyncedAt)` with cache-first reads for the rest; (3) Blaze with budget alerts (pay-as-you-go past free allowance — this app would cost cents). One rules caveat baked into §4: `exists()`/`get()` calls in security rules bill as reads, so the **room-write path must not contain any** — only admin-area writes pay the +1 `exists()` read.

---

## 4. Security Model

### 4.1 Honest framing (say this to Austin)

Anonymous auth means the server cannot know *who* a person is — only that they hold a token minted from our (intentionally public) web API key. Therefore:

- **Real enforcement possible:** all access requires sign-in; room writes are shape-validated; the admin area (templates, config, purges) is enforced server-side via a rules-checked PIN → uid allowlist (below). Someone who has the app but not the PIN genuinely cannot modify templates/config, even with hand-crafted API calls.
- **Not possible on this tier:** stopping a determined attacker who extracts the API key from the (public) GitHub Pages source *and* learns the PIN, or per-person identity guarantees (initials are self-reported). The crew-facing data — checkbox states on furniture — is not sensitive; this posture is deterrence against accidents and drive-by abuse, which is the right trade for $0. Upgrade paths if ever needed, still free: email-link auth + uid allowlist in rules; Firebase App Check (reCAPTCHA v3) to reject non-app clients.
- The `firebaseConfig` object (apiKey etc.) committed to the repo is **public by design**; security rules, not key secrecy, are the boundary.

### 4.2 The admin scheme (two layers)

1. **UI gate (UX only):** admin screens unlock when `sha256(config.pinSalt + enteredPin) === config.pinHash`. Keeps honest people out of screens they shouldn't be in; not security.
2. **Rules enforcement (real):** a device becomes admin by creating `projects/h2sep/roles/{itsOwnUid}` including the PIN in the write; the rule verifies `hashing.sha256(pin)` against a hash **hardcoded in the rules text** (`hashing.sha256` is available in the Firestore rules language). Admin-area writes then require `exists(roles/{uid})`. The PIN necessarily lands in the roles doc, so roles docs are readable only by their own uid and never listable. Rotating the PIN = edit one constant in rules + republish (console, 30 seconds).

### 4.3 Security rules (complete text)

Replace `ADMIN_PIN_SHA256_HEX` with lowercase hex `sha256` of the raw PIN string (e.g. `printf '4820' | sha256sum`).

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() {
      return request.auth != null;
    }

    function isAdmin(projectId) {
      // Billed as 1 read; only on admin-area writes, never on room writes.
      return exists(/databases/$(database)/documents/projects/$(projectId)/roles/$(request.auth.uid));
    }

    function pinOk() {
      return request.resource.data.pin is string
        && hashing.sha256(request.resource.data.pin).toHexString().lower()
           == 'ADMIN_PIN_SHA256_HEX';
    }

    match /projects/{projectId} {
      allow get: if signedIn();
      allow write: if signedIn() && isAdmin(projectId);

      match /rooms/{roomNo} {
        function validRoom() {
          let d = request.resource.data;
          return d.keys().hasOnly(['number','floor','type','typeLabel','items',
                                   'notes','deleted','schemaV','createdAt','updatedAt'])
            && d.number is string && d.number == roomNo && d.number.size() <= 8
            && d.floor is int && d.floor >= 0 && d.floor <= 30
            && d.items is map && d.items.size() <= 200
            && (!('notes' in d) || d.notes is map)
            && (!('deleted' in d) || d.deleted is bool)
            && (!('type' in d) || (d.type is string && d.type.size() <= 60))
            && (!('typeLabel' in d) || (d.typeLabel is string && d.typeLabel.size() <= 120));
        }
        allow read: if signedIn();
        allow create, update: if signedIn() && validRoom();
        allow delete: if false;   // soft-delete only; prevents offline resurrection races
      }

      match /templates/{templateId} {
        allow read: if signedIn();
        allow write: if signedIn() && isAdmin(projectId);
      }

      match /config/{docId} {
        allow read: if signedIn();
        allow write: if signedIn() && isAdmin(projectId);
      }

      match /roles/{uid} {
        allow get: if signedIn() && request.auth.uid == uid;
        allow list: if false;                    // PIN lives in these docs — never enumerable
        allow create: if signedIn() && request.auth.uid == uid && pinOk();
        allow update: if false;
        allow delete: if signedIn()
          && (request.auth.uid == uid || isAdmin(projectId));
      }

      match /members/{uid} {
        allow read: if signedIn();
        allow write: if signedIn() && request.auth.uid == uid;
      }

      match /activity/{day} {                    // reserved for v1.1; harmless now
        allow read, create, update: if signedIn();
        allow delete: if signedIn() && isAdmin(projectId);
      }
    }

    match /{document=**} {
      allow read, write: if false;               // default deny
    }
  }
}
```

Validation notes: on `update`, `request.resource.data` is the **post-write** document, so field-path item updates are still validated against the full resulting shape (`hasOnly` catches junk top-level fields; existing `number`/`floor` satisfy the type checks). Per-entry validation *inside* the `items` map is not expressible in rules (no iteration over unknown map keys) — stated honestly; the map-type + size cap + top-level whitelist is the enforceable maximum. No `get()`/`exists()` on the room-write path keeps hot-path writes free of billed rule reads. Firebase Anonymous sign-in must be enabled in the console (Authentication → Sign-in method → Anonymous).

---

## 5. Offline Persistence — Exact Setup and iOS Story

### 5.1 SDK initialization (modular v10+ / v11 / v12; `enableIndexedDbPersistence()` is deprecated)

```js
import { initializeApp } from './vendor/firebase-app.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  CACHE_SIZE_UNLIMITED
} from './vendor/firebase-firestore.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from './vendor/firebase-auth.js';

const app = initializeApp(firebaseConfig);          // public config, committed to repo

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),      // installed PWA + Safari tab share one cache
    cacheSizeBytes: CACHE_SIZE_UNLIMITED             // dataset ~1.3 MB; never let LRU GC evict rooms
  })
});

const auth = getAuth(app);
onAuthStateChanged(auth, (user) => { if (!user) signInAnonymously(auth); });
```

What this buys, concretely: the IndexedDB cache holds both **document data** and the **mutation queue**; queued writes survive app kill, phone reboot, and days offline, then replay **in order** on reconnect. Listeners fire instantly from cache (`snapshot.metadata.fromCache === true`) with latency-compensated local edits (`hasPendingWrites`). Auth state persists locally too, so a previously-signed-in device works fully offline from cold start. **First-ever launch requires connectivity** (to load the page, cache it via the service worker, and mint the anonymous user) — tell crews to install in the site office, not in a dead zone.

UI plumbing: "synced / N pending" badge driven by counting issued writes minus resolved write promises (an `updateDoc` promise resolves only on server commit) plus `navigator.onLine`; call `navigator.storage.persist()` at startup (helps Chrome/Android; ignored by iOS; harmless).

### 5.2 iOS eviction reality

- Safari's ITP deletes script-writable storage (IndexedDB included) for sites after **7 days of Safari use without visiting the site** — but **Home Screen web apps are exempt** from that cap and, since iOS ~16.4, run in their **own storage container** separate from Safari. So: installing to Home Screen is not cosmetic, it is the data-durability mechanism. Make Add-to-Home-Screen a hard step in onboarding.
- iOS can still evict under storage pressure, and deleting the icon deletes the container.
- **If eviction happens:** (a) cached data gone → next online open silently re-downloads (~190 reads, ~1.3 MB, seconds); (b) a **new anonymous uid** is minted → harmless, identity travels in each write's `initials`/`checkedByName`; (c) **queued unsynced writes are gone** — the only real loss. There is no free technical fix for (c) (any same-container journal dies with the container), so the mitigation is procedural and product: a loud persistent "N unsynced changes" badge, and the crew habit of getting one bar (parking lot / site office) at end of shift. In practice a phone that's used daily and synced daily has a near-zero eviction-loss window.

### 5.3 Re-sync contract

**Server is the source of truth.** On reconnect the SDK (1) replays the mutation queue in order (each mutation merging at its recorded field paths, LWW per field at commit), then (2) listener snapshots reconcile the local cache to server state — local cache never overrides the server, it is overwritten by it, with surviving local pending writes layered on top until acknowledged. No app-level merge code exists or is needed; the app's only jobs are the invariants in §2 (atomic full-status writes, `merge:true` creates, soft deletes).

---

## 6. Claude Ingestion via REST (cloud session → Firestore)

Austin photographs a paper page → Claude parses it in chat → writes the room doc directly. Rules apply to REST identically to the SDK; room writes need no admin role.

**Step 1 — mint an anonymous user** (Identity Toolkit; `WEB_API_KEY` is the public apiKey from `firebaseConfig`):

```
POST https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={WEB_API_KEY}
Content-Type: application/json

{"returnSecureToken": true}
```
→ `{ "idToken": "...", "refreshToken": "...", "localId": "<uid>", "expiresIn": "3600" }`

Refresh in long sessions:
```
POST https://securetoken.googleapis.com/v1/token?key={WEB_API_KEY}
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token={refreshToken}
```

**Step 2 — only if the session must touch templates/config:** claim admin by creating the roles doc (Austin supplies the PIN in chat):

```
PATCH https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/projects/h2sep/roles/{localId}
Authorization: Bearer {idToken}

{"fields": {"name": {"stringValue": "Claude ingest 2026-07-31"},
            "pin": {"stringValue": "<PIN>"},
            "grantedAt": {"timestampValue": "2026-07-31T18:00:00Z"}}}
```

**Step 3 — create a room** (PATCH creates-or-replaces; guard first ingest with a precondition so an already-live room isn't clobbered):

```
PATCH https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/projects/h2sep/rooms/101?currentDocument.exists=false
Authorization: Bearer {idToken}
Content-Type: application/json

{"fields": {
  "number":    {"stringValue": "101"},
  "floor":     {"integerValue": "1"},
  "type":      {"stringValue": "qq-studio-connector"},
  "typeLabel": {"stringValue": "QQ STUDIO Connector"},
  "deleted":   {"booleanValue": false},
  "schemaV":   {"integerValue": "1"},
  "createdAt": {"timestampValue": "2026-07-31T18:05:00Z"},
  "updatedAt": {"timestampValue": "2026-07-31T18:05:00Z"},
  "notes": {"mapValue": {"fields": {
    "x_lyq100aaa": {"mapValue": {"fields": {
      "text": {"stringValue": "CONNECTING DOOR LOCK - NOT LOCKING"},
      "flag": {"stringValue": "issue"}, "resolved": {"booleanValue": false},
      "createdBy": {"stringValue": "paper import"}, "createdByUid": {"stringValue": ""},
      "createdAt": {"timestampValue": "2026-07-31T18:05:00Z"}}}}}}},
  "items": {"mapValue": {"fields": {
    "gr600_a": {"mapValue": {"fields": {
      "code": {"stringValue": "GR-600"}, "label": {"stringValue": "Q Mattress"},
      "sort": {"integerValue": "230"}, "status": {"stringValue": "issue"},
      "note": {"stringValue": "NEED PROPER PLACE"},
      "initials": {"stringValue": ""}, "checkedByName": {"stringValue": ""},
      "checkedByUid": {"stringValue": ""},
      "checkedAt": {"nullValue": null}, "checkedAtLocal": {"nullValue": null},
      "deleted": {"booleanValue": false}}}},
    "gr600_b": { ... second mattress, same shape ... }
  }}}
}}
```

A `409` on `currentDocument.exists=false` means the room already exists → switch to **per-item merge** so live check-offs are preserved (repeat `updateMask.fieldPaths` per path; ids are `[a-z0-9_]` so no backtick escaping needed):

```
PATCH .../documents/projects/h2sep/rooms/101?updateMask.fieldPaths=items.gr600_a&updateMask.fieldPaths=items.gr600_b&updateMask.fieldPaths=updatedAt
```

**Batch a whole floor** (≤500 writes per call — one call ingests all 4 floors if desired):

```
POST https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents:commit
Authorization: Bearer {idToken}

{"writes": [
  {"update": {"name": "projects/{PROJECT_ID}/databases/(default)/documents/projects/h2sep/rooms/101",
              "fields": { ... }},
   "currentDocument": {"exists": false}},
  {"update": {"name": ".../rooms/102", "fields": { ... }},
   "currentDocument": {"exists": false}}
]}
```

Practical notes: use literal RFC3339 `timestampValue`s from the session clock for ingestion (skipping the `transform`/`REQUEST_TIME` machinery is fine here — `checkedAt` semantics matter only for in-app taps, which go through the SDK); spot-check with `GET` on the same document URL or `POST .../documents:runQuery`; from the cloud session plain `curl` through the configured HTTPS proxy with the system CA bundle works. Quota impact of a full 180-room ingest: 180 writes + a handful of reads — noise.

**Composite indexes:** none required. The only queries are whole-collection and `where('floor','==',n)` (auto single-field index); ordering by room number happens client-side.

---

### Sources

- [Firestore usage and limits (Spark free tier)](https://firebase.google.com/docs/firestore/quotas)
- [Understand Cloud Firestore billing (listener reconnect >30 min billed as new query; rules get/exists billed)](https://firebase.google.com/docs/firestore/pricing)
- [Firebase Security Rules reference — hashing namespace (sha256)](https://firebase.google.com/docs/reference/rules)
- [Cloud Firestore pricing](https://cloud.google.com/firestore/pricing)