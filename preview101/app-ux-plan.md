# H2SEP App — Implementation Plan
## WBS floor navigation + clickable reference popups

Prototype mocks: `wbs-mock.html` (floor screen as collapsible WBS) and
`popup-mock.html` (room 101 FF&E template + Drive reference popups) in this
folder. Both reuse the live app's CSS tokens verbatim (`css/app.css` `:root`
block) so what you see is what ships.

---

## 1. WBS floor navigation (Guestrooms + Common Areas)

Mirrors the project schedule WBS: `Level N > Guestrooms > room cards` and
`Level N > Common Areas > named spaces` (Corridor 121, Lobby 003, …, real
numbers from the sqlite `spaces` table — 39 floor-1 spaces total: 37
numbered + Zones A/B).

### Files touched
| File | Change |
|---|---|
| `js/screens.js` | `renderFloor()` — wrap the existing `.room-grid` in a collapsible **Guestrooms** group; add a **Common Areas** group rendering space cards. Reuse `roomStats()` for aggregate %. New `renderSpace()` screen (S3b) for a space checklist — it is `renderRoom()` with a different store key and no prev/next arrows (or corridor-ordered siblings). |
| `js/store.js` | New `spaces` accessors: `getSpaces(floor)`, `getSpace(id)`, subscribe alongside rooms. Same latency-compensation path as rooms. |
| `js/app.js` | Route `#/space/<floor>/<space_no>` → `renderSpace`. |
| `css/app.css` | Add `.wbs-group / .wbs-head / .wbs-chev / .wbs-body`, `.space-card` family, `.sub-head`, `.qty` (see mock CSS — copy the "NEW" blocks). |
| `tools/gen_rooms.py` | New `gen_spaces` mode reading `space_items` (875 rows) → `tools/out/space-<no>.json`, same item shape as `room-<no>.json`. |
| `tools/seed_rooms.mjs` | Seed variant writing to the new collection. |

### Data model (Firestore)
- New top-level collection **`spaces/`**, doc id = `f<floor>-<space_no>`
  (space numbers repeat per floor: `121` exists on floors 1–4; rooms never
  collide, spaces do — the floor prefix is mandatory).
- Doc shape identical to `rooms/` docs (`items{}`, `notes{}`, `floor`,
  `deleted`, plus `name`, `spaceNo`) so `roomStats()`, the item row renderer,
  check/flag/issue sheets, and offline queueing work unchanged.
- Zones A/B are ordinary space docs (`f1-ZONE-A`), listed under Common Areas
  → Public.

### UI rules
- Both groups **default open**; collapse state is per-visit (sessionStorage),
  matching the existing filter-chip behavior.
- Group header: name, count, aggregate progress bar, % and open-issue badge —
  same anatomy as the home screen's floor cards, so it reads instantly.
- Common Areas is subdivided **Public** / **Back of house** (front-desk crew
  never scrolls past Food Prep to reach the Corridor). **Classification
  rule: Public = any space a guest can stand in** — Vestibule 001, Lobby
  003, Reception 004, Market 005, Breakfast 006, Meeting 018, public RRs
  019/020/027, Fitness 023, Guest Laundry 024, Corridor 121, Elev. Lobby
  137, Ice 139, Zones A/B. **BOH = staff-only**: Food Prep 007, Servery 009
  (open to Breakfast but the staff side of the counter — deliberate BOH),
  offices 010/011/021/022, laundry/storage/mech/elec, stairs, elevator.
  Public list is hand-ordered (Lobby, Corridor, Reception…); BOH
  alphabetical. Group headers (%, issue badge) are computed from the child
  cards, never hand-typed.
- Spaces without seeded checklists render greyed with a `COMING SOON` chip —
  navigation ships before all 875 space_items are QC'd, no dead taps.
- Room cards themselves are **unchanged** (same `.room-card` markup), so
  muscle memory and the filter chips (All / In progress / Issues / Done)
  keep working; filter chips apply to both groups.

### Migration
1. Ship CSS + collapsed-group rendering with spaces list **greyed only**
   (zero data risk, pure UI).
2. Run `gen_rooms.py --spaces --floor 1` → review JSON → seed `spaces/` for
   floor 1 public spaces only.
3. Enable live space cards behind the existing admin gate; verify offline
   check-offs sync on a phone; then seed remaining floors/BOH.
- No change to existing `rooms/` docs — **zero migration on live data**.
- `sw.js`: bump cache version; no new precache entries needed.

---

## 2. Clickable reference popups (submittals / details from Drive)

Item detail sheet gains a **References** section; tapping a reference opens
an in-app popup with the Drive preview iframe and an "Open in Drive" fallback.

### Data flow
```
Drive (source of truth, file ids)
  └─ tools/gen_links.py  → tools/out/links-101.json      (per-room refs)
       └─ merged by seed script into room docs:
          rooms/101.items.GR-302_a.refs = [
            { name: "Submittal — Moen Bathroom Vanity Faucet",
              driveId: "1cJVzmAEPWJPpKAN9Gm9GemcC1ktzPhdE",
              kind: "submittal",            // submittal | shop | cutsheet | detail
              path: "Submittals/Bathroom Vanity & Kitchenette Sink & Faucet",
              mime: "application/pdf", size: 783105 }
          ]
```
- `refs[]` lives **on the item** (denormalized, like every other item field)
  — offline-first store stays a single doc read per room. A shared
  `refs/` collection is not worth the join; the same driveId repeated across
  115 rooms costs ~200 bytes/room.
- `links-101.json` maps `tag → refs[]` at the **tag** level (GR-302, not
  per-instance): the seeder fans it out to every item with that code, across
  every room whose room_type carries the tag. One JSON per package type
  later (`links-qq-wide.json` etc.), 101 is the pilot.
- **The mock mirrors `links-101.json` 1:1 — no subsetting.** Every mapped
  submittal renders as a ref row (Danby-branded duplicate cutsheets included:
  Austin sees those browsing either Drive folder, and 902's three dishwasher
  cutsheets ARE the point of its FLAGGED row), and every tag with
  `submittals: []` (GR-501 Vanity Mirror, lighting, bedding, HD package…)
  renders "No submittal or detail linked to this item yet" — a genuine gap
  must look like a gap, never borrow a neighboring file. The untagged
  garbage disposer maps via its item id (ITM-0083 → Moen MGXP33C candidate
  cutsheet). GR-302 carries the Moen vanity-faucet submittal **in
  `links-101.json` itself** (regenerated 2026-08-07; it sets the sink
  cutout the RK drawings ask to coordinate), so the seeder ships exactly
  what the mock demos.
- Real ids verified in Austin's Drive today (all under
  `Submittals/`): Moen faucet `1cJVzmAEPWJPpKAN9Gm9GemcC1ktzPhdE`, RK
  Hospitality Guest Room FF&E shop drawings `1yWG61b5tTRk9a37npjB8gil0JH-0-k-J`,
  Danby fridge cutsheet `1tnaLKRKzoqaigwVWmbbmWCV6UwiXOYs9`, Kalisher art
  `1nat4040zyhiVEI1ZIlB4f-5iUrzGj95D`, RK room divider
  `1qSz_8IPYyxxsiIwHorKKVRHcUYfrbWFE`, ID-5.4 (text extract only — the
  plotted ID sheets are not in Drive yet; upload the PDFs before wiring
  "detail" refs, a .txt preview looks broken to a foreman). The mock renders
  ID-5.4 accordingly: a greyed, non-tappable `.ref-link.disabled` row with an
  "EXTRACT ONLY" chip, excluded from the row's `📎 n refs` count — that is
  the shipping treatment for any ref whose plotted source isn't in Drive yet.

### Files touched
| File | Change |
|---|---|
| `js/sheets.js` | `checkedItemSheet` / `issueItemSheet` / new `itemDetailSheet`: append References list (`.ref-link` rows). New `drivePopup(ref)` overlay — reuses `.paper-view` chrome (black bar, ✕), iframe `https://drive.google.com/file/d/<id>/preview`, footer `Open in Drive ↗` (`/view`, `target=_blank rel=noopener`). |
| `js/screens.js` | Row renderer: `📎 n refs` chip when `it.refs?.length`; tapping an **unchecked** row with refs opens the detail sheet instead of instantly checking? **No** — checking stays one tap (field speed wins); refs open from the 📎 chip tap or long-press menu. |
| `css/app.css` | `.ref-count`, `.ref-link` family, `.pop-frame`, `.pop-foot` (copy from mock). |
| `tools/gen_links.py` | New: emits `links-101.json`; validates each driveId with a metadata call before emit. |
| `sw.js` | Nothing cached for Drive (see offline). Bump version. |

### Offline behavior — honest constraints
- **Drive preview iframes need signal.** The `/preview` endpoint requires a
  live authenticated session; it is not cacheable by our service worker
  (cross-origin, cookie-auth, CSP). No pretending otherwise.
- Popup ships with a **cached-metadata fallback**: ref name, kind, folder
  path, file size and mime are in the room doc (already offline). When
  `navigator.onLine` is false — or the iframe fails to paint (load timeout
  ~6 s) — show the metadata card + "You're offline — this opens when you
  have signal" instead of an infinite white frame. The "Open in Drive" link
  stays visible (Drive app may hold its own offline copy of starred files).
  **Implemented in `popup-mock.html`** (this is the state the mock renders
  anywhere without Drive access, so the demo shows the graceful card, not
  blank grey). Detection detail learned building it: the iframe's `load`
  event is useless — Chromium fires it even when the navigation fails and
  an error page commits (verified headlessly). The shipping detection is
  `navigator.onLine === false` → immediate card; otherwise a `no-cors`
  reachability probe of the same `/preview` URL (rejects on network
  failure → card) with the ~6 s timeout as the ceiling for slow networks.
- **Auth caveat:** previews render only for Google accounts with access to
  the file. Crew phones not on the shared Drive will see Drive's request-
  access screen inside the popup — either share the `Submittals/` folder
  "anyone with link – viewer" (simplest; these are manufacturer cutsheets,
  low sensitivity) or add crew accounts. Decide before rollout; the
  fallback link makes the failure legible either way.
- True offline viewing (pre-synced PDFs in Cache Storage/IndexedDB via a
  Drive API download + token) is a deliberate **later** phase — meaningful
  build (OAuth on device, quota, 35 MB shop-drawing sets) and the iframe +
  fallback covers the 90% case now.

### Dedupe rule (template views — Austin's direction)
Applies to the printable/room "template" list, prototyped in
`popup-mock.html`: **one line per tag with a qty badge** (`GR-300 Queen
Headboard ×2`). Instances merge only when tag+description are identical and
instance notes are pure ordinals ("bed 1 of 2"); distinct meanings (e.g.
GR-322 "tagged once on A555", GR-308's one-continuous-run note) keep their
own line. FLAGGED rows keep the amber VERIFY chip; red uppercase issue notes
and red-initial ink boxes carry over from the paper sheet unchanged — with
one deliberate exception: GR-308 shows UNCHECKED in the app even though both
GR-308R boxes are CC-checked on the paper sheet, because the row is FLAGGED
(the sheet's "×2" contradicts one-working-wall-per-key) and a flagged check
is reset until verified; the row carries an italic "Paper sheet: …" note
saying exactly that.
Untagged rows (garbage disposer) can't dedupe — they keep their line.
The live checking store still holds one record per physical instance
(APP_HANDOFF: "quantity is repeated rows — never collapse"); the ×2 line
checks off both instances together in template mode, and the existing
per-instance rows remain available under the full-trade view.

### Rollout order
1. CSS + refs rendering (empty refs everywhere → app identical to today).
2. `gen_links.py` + seed room 101 refs → field-test popups on Austin's phone
   (owner account, previews guaranteed to render).
3. Decide the Drive sharing model, then fan out links to all QQ-family
   rooms, then remaining packages; spaces get refs the same way via
   `space_items` tags (HD-x in public restrooms already match).
