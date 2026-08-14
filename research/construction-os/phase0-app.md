# Phase 0 — Full Inventory of the Existing H2SEP Checklist App

Repo: `/home/user/h2sep-checklist` (GitHub `SH0T250/h2sep-checklist`, public).
Live app: https://sh0t250.github.io/h2sep-checklist/ · Dashboard: `/dashboard.html` · Deploys = push to `main` AND `main:gh-pages` (Pages serves `gh-pages`).
Current version: **APP_VERSION `1.18.3`** (`js/config.js:20`) = `sw.js` `VERSION 'h2sep-v1.18.3'`; `MODEL_CACHE 'h2sep-model-7'`.
Report date: 2026-08-14. Latest commit `1f297c8` ("Remove subcontractor meeting-minutes data from the public repo"); 75 commits total.

---

## 1. What the app is

A phone-first, offline-capable, **zero-cost** ($0/mo, all Austin-owned) room-checklist PWA for hotel FF&E install / punch work at the Home2 Suites by Hilton, Eagle Pass TX (115 keys, 4 stories; Triun job 24030 / MWT 22-014). Tap a line to stamp your initials (like initialing a paper sheet); long-press for the issue sheet (quick-picks: NEED INSTALL / NEED PROPER PLACE / IN BOX / DAMAGED / MISSING / WRONG ITEM); ★ room-level notes; printable door sheets generated from live data; a wall dashboard with (since v1.18) full editing parity + PIN-gated bulk edits; a 3D room exhibit for the QQ family. Built and maintained by prior Claude sessions for Triun Construction & Engineering.

**Stack (exact):**
- Vanilla-JS ES-module SPA. **No build step, no bundler, no framework, no npm deps at runtime.** Hash routing (`js/app.js` route()).
- Firebase **Cloud Firestore** (project `h2sep-checklist`, data under `projects/h2sep/…`), SDK **vendored** in `firebase/` (firebase-app.js 2850 lines; auth/firestore are 3-line re-export stubs) so the app cold-boots with zero network.
- **Anonymous auth** + Firestore security rules + a shared **admin PIN** (sha256(salt+pin) UI gate; server-side `roles/{uid}` allowlist written on PIN entry).
- Installable **PWA**: `manifest.webmanifest` (standalone, portrait) + hand-written `sw.js` (224 lines, versioned precache of a 44-entry SHELL array + 3 permanent caches).
- Hosting: GitHub Pages, deploy-from-branch. `?demo=1` or a null config = **demo mode** (localStorage backend `h2sep-demo-db-v2`; demo PIN `6621`, public by design — its sha256 is stated to match the deployed rules hash [UNVERIFIED here — the design-doc rules file carries hash `868447a1…21e1`, could not be recomputed in this sandbox]).

**Key files:** `index.html` (32 ln) · `dashboard.html` (98) · `print.html` · `refs.html` · `room-3d.html` (733 KB, BUILT by `tests/build-room3d.mjs`, never hand-edited) · `sw.js` (224) · js/: app.js 160, store.js 632, screens.js 966, sheets.js 395, dash.js 427, dash-edit.js 1254, bulk.js 560, print.js 358, refs.js 117, refs-page.js 123, seed.js 164, seed-spaces.js 705 (auto-gen), space-meta.js 401 (auto-gen), theme.js 29, util.js 153, config.js 44 · css/: app.css, dash.css, print.css, refs-page.css · tests/: 21 suites.

---

## 2. `data/project.sqlite` — the reference DB (exact numbers, queried 2026-08-14)

10 tables (all columns TEXT except `derived INTEGER` in the two exploded tables):

| Table | Rows | Purpose / key columns |
|---|---|---|
| `rooms` | **115** | room_no PK-ish, floor, room_type (JOIN KEY), display_label (display ONLY), accessible, connecting, source_sheet, primary_sheet, reliability, note |
| `spaces` | **66** | space_no, floor, name, note, primary_sheet, source_sheet |
| `room_types` | **11** | type_name, key_count, room_sheet, bath_sheet, inherits_items_from, notes |
| `items` | **1,606** | item_id, applies_to, applies_to_kind (`all` 100 / `room` 11 / `room_type` 620 / `space` 875), category, tag, description, instance_note, trade_responsible, count, source_sheet, primary_sheet, reliability, supersedes, note |
| `room_items` | **17,635** | the explosion: room_no, display_label, room_type, item_id, category, tag, description, instance_note, trade_responsible, source_sheet, primary_sheet, reliability, **derived**, applies_to_kind, note |
| `space_items` | **875** | same shape keyed by space_no/space_name/floor |
| `sheets` | **238** | sheet_id, title, discipline, rev, sheet_date |
| `conflicts` | **45** | conflict_id, topic, positions, status, source (e.g. A11 dual unit matrices — OPEN) |
| `overrides` | **3** | OV-001 (QQ Wide display naming, LABEL-ONLY, Austin 2026-08-07), OV-002 (FF&E Installation List excluded as stale → everything derived), OV-003 (114/115 ID-1.1 defect) |
| `placeholders` | **51** | known-missing topics |

**Rooms by floor:** 1→16, 2→33, 3→33, 4→33 (=115). **Rooms by room_type:** King Studio 57 · Queen-Queen 31 · QQ Extended 6 · QQ Connecting 6 · King One Bedroom 3 · King One Bedroom Acc. 3 · QQ Wide 2 (201,301) · QQ Wide Connecting 2 (101,401) · QQ Acc. 2 (238,338) · King Studio Acc. 2 (118,438) · King Studio Connecting 1 (116). **Spaces by floor:** 1→39 (incl. ZONE-A Porte-Cochere, ZONE-B Pool Deck; room_map.md lists 64 numbered + these zone/pool additions = 66), 2/3/4→9 each.

**room_items by category (21 distinct):** Electrical 2,918 · Plumbing 2,552 · Mechanical 2,306 · Paint 1,125 · Flooring 977 · Bath Accessory 962 · FF&E - Casegoods 871 · FF&E - Lighting 847 · Appliance 814 · Drywall 804 · Low Voltage 696 · FF&E - Bedding 488 · FF&E - Window 452 · FF&E - Seating 355 · FF&E - Art / Mirror 350 · Fire Sprinkler 264 · Doors 256 · Wall Covering 238 · Stone / Surround 236 · Fire Alarm 121 · FF&E - Misc 3.

**space_items by category (19):** FF&E - Seating 142 · Flooring 118 · FF&E - Casegoods 86 · FF&E - Misc 73 · Doors 65 · Paint 59 · Appliance 56 · Drywall 52 · Wall Covering 48 · Electrical 39 · Bath Accessory 35 · Plumbing 31 · FF&E - Lighting 22 · FF&E - Art / Mirror 15 · Stone / Surround 13 · Low Voltage 10 · FF&E - Window 8 · Fire Sprinkler 2 · Mechanical 1.

**Tags:** 131 distinct non-null tags in room_items (6,425 rows have NULL/empty tag — mostly MEP/finish lines); 400 distinct tags in `items`. **Quantity = repeated rows, not a qty column** (HD-12 ×2, GR-300 ×2), distinguished by `instance_note` ("hook 1 of 2").

**Provenance/reliability model:** every row carries `source_sheet` + `primary_sheet` (title-block sheet IDs — "page numbers" are banned project-wide), `reliability` ∈ HIGH / MEDIUM / FLAGGED (LOW defined but 0 rows present), `derived` (1 = exploded from a room-type package, 0 = room-specific observation — only 11 rows are derived=0, all rooms 118/438), and free-text `note` (the evidence trail). room_items reliability: **HIGH 14,298 · FLAGGED 1,946 · MEDIUM 1,391**. items: HIGH 1,007 · FLAGGED 394 · MEDIUM 205.

**How items join to rooms:** `items.applies_to` + `applies_to_kind`: kind `room_type` joins on `rooms.room_type` (NEVER display_label), kind `all` = every guestroom, kind `room` = room-number-specific (118/438 extras), kind `space` = space name+number strings. `room_items`/`space_items` are the pre-computed explosions (room number → room type → typical package → 115 rooms); rows/room range **149–183, avg 153.3**. Room 118 has no plumbing unit plan (legitimately empty, not a bug).

**Data-drift note:** `SELECT … WHERE display_label <> room_type` now returns **5 rows, not the 4** the APP_HANDOFF check pins — room 438 was updated to display_label `King Studio Accessible Connector` by commit `4ec917f` "Room 438 is a King Studio Accessible Connector (PM ruling)". Deliberate (Austin's ruling 11 / CB 7/31 direction), but any rebuild importing the "must return exactly 4 rows" sanity check will fail on it.

**Three UI-must-honour rules (data/APP_HANDOFF.md §3):** (1) join on `room_type`; (2) **FLAGGED = two sources disagree, render BOTH positions, never pick** (canonical case: tub-vs-roll-in on all 7 accessible keys 118/217/238/317/338/417/438, conflicts A11/B4.4 — "Do not order the 438 bath package off either matrix"); (3) `derived=1` = inherited from a package, not observed in that room.

---

## 3. Firestore data model (live)

**Paths:** `projects/h2sep` root · `config/app` (floors map, pinSalt, pinHash, schemaV) · `rooms/{docId}` · `templates/{slug}` · `roles/{uid}` (admin allowlist) · `members/{uid}` (optional roster) · `activity/{yyyymmdd-HH}` (audit shards + `bulk_<id>[_pN]` recovery docs).

**One collection, three doc kinds, discriminated by `type` slug** (`js/util.js`):
- Guest room: doc id = room number ("105"), `type` = template slug (e.g. `queen-queen`).
- Common-area space: doc id = space number ("003", "ZONE-B"), `type` starts with `space-` (`isSpaceDoc()` — THE shared filter).
- MEP punch (v1.18.0): doc id `"<room>-MEP"` ("105-MEP"), `type` = `mep-punch` (`isMepDoc()`/`mepParent()`); kept fully separate from FF&E progress in every count.

**Room doc shape (schemaV 3):** `{ number (== doc id), floor:int, type, typeLabel, items: map<itemId, Item>, notes: map<noteId, Note>, deleted:bool, schemaV:3, createdAt, updatedAt }`. **Item:** `{ code, label, sort, category, qty, reliability, instanceNote, src (sheet id), trade, derived, checked:bool, initials, checkedByName, checkedByUid, checkedAt (serverTimestamp), checkedAtLocal (device clock), issue:'', issueResolved:bool, deleted:bool }`. (The design doc's original `status`/`note` fields were superseded by checked/issue/issueResolved.) **Note:** `{ text, flag:'issue'|'info', resolved, createdBy, createdByUid, createdAt }`. Item ids: deterministic `codeSlug + _a/_b…` for template items (two phones creating the same room converge), `x_<ts36><rand>` for ad-hoc; MEP ids = md5(category|mark|label) — room-independent so floor rollups can total marks. Templates: `{ name, items (clean state), updatedAt }`.

**LIVE STATE — verified via REST 2026-08-14 (read-only anonymous sign-in):** rooms collection holds **296 docs = 115 guest rooms + 66 spaces + 115 MEP punch docs, 0 soft-deleted**. **12 templates** live: `king-one-bedroom, king-one-bedroom-acc, king-studio, king-studio-acc, king-studio-acc-mod, king-studio-connecting, qq-acc, qq-connecting, qq-extended, qq-wide, qq-wide-connecting, queen-queen` (the legacy `qq-studio-connector` slug is gone). The four elevator spaces (140/240/340/440) deliberately carry 0-line checklists (OTIS Div 14).

**Security rules** (`design/firestore-rules-final.txt` = design-time full version; SESSION_HANDOFF §7 says the DEPLOYED update rules are narrower — whitelist dotted `items.<id>.*` paths + `updatedAt` only [UNVERIFIED — deployed rules text is not in the repo]): all access requires anonymous sign-in; room docs shape-validated (keys hasOnly [number,floor,type,typeLabel,items,notes,deleted,schemaV,createdAt,updatedAt], number==docId, floor 0–30, items ≤200 — note item map VALUES are not validated); `allow delete: if false` on rooms (soft delete only); `roles/{uid}` create requires `pinOk()` = sha256(pin) == hard-coded hex, list denied to all; templates/config writes admin-only; `activity/{day}` accepts any doc id from any signed-in user (this is what lets bulk recovery docs land). The web `firebaseConfig` is public by design.

**Offline approach:** Firestore `persistentLocalCache` + `persistentMultipleTabManager` + `CACHE_SIZE_UNLIMITED`; anonymous sign-in with exponential-backoff retry; **listeners attach only after first sign-in** (per-floor `where('floor'==N)` queries, includeMetadataChanges to drive the fromCache/RECONNECTING pill); writes blocked until uid exists (`isWriteReady`); pendingWrites tracked per room for the ⇅ Syncing pill; `onRemoteSurprise` toasts when a remote uncheck/re-initial lands; `navigator.storage.persist()` requested; iOS requires Home-Screen install before writing (durable storage). SW: versioned SHELL precache with **install-time version-stamp verification** (aborts on mixed-CDN builds), permanent `h2sep-sheets`/`h2sep-refs`/`h2sep-model-7` caches, update banner → SKIP_WAITING, offline-navigation fallback that refuses to serve the shell for standalone pages.

---

## 4. Live inventory & tools

**Live now:** all 115 guest rooms (floors 16/33/33/33) under Austin's names, 66 common-area spaces, 115 MEP punch docs, 12 templates. Room 101 carries the only field work (14 checks / 6 issues / 1 note, protected by `tests/live-invariants.mjs`). Hero read 14/4,688 items at the 66-space seed (2026-08-10).

**Room-type display mapping (Austin's names, ruling 12):** Queen-Queen & QQ Wide → "QQ Studio" · QQ Connecting & QQ Wide Connecting → "QQ Studio Connector" · King Studio → "King Studio" · King Studio Connecting → "King Studio Connector" · King Studio Acc. → 118 "King Studio Acc Mod" / 438 "King Studio Acc" (438 since re-ruled → "King Studio Accessible Connector", commit 4ec917f) · QQ Extended → "QQ Extended" · King One Bedroom / One Bedroom Acc. / QQ Acc. per DB.

**tools/out/:** 11 approved template JSONs (`template-<slug>.json` with `.draft.json` raw generations kept alongside so every ruling is a visible diff) + `template-101-final.json` (+CHANGES.md); per-room build JSONs (`room-NNN.build.json` root/f2 28/f34 57/fix 22); `spaces/` 66 space drafts; `space-enrich/` 61 sheet-cited enrichment files; `mep/` 115 `<room>-MEP.json` + 115 `_lines-<room>.json` reviewed line sets + `_raw-*` + `_trade-truth.json`; `carry-report-101.md`; `shots/`.

**tools/ scripts (17):**
- `make_template.py` — draft a type template from sqlite (FF&E+Appliance+Bath Accessory scope, dedupe to ×qty lines, clean state, Austin's labels).
- `apply_rulings.py` — one auditable RULINGS table → approved templates; a ruling targeting a missing line is a HARD FAILURE; `--check` mode.
- `build_room_type.py` — regenerate each room from the DB, PROVE it matches the approved template item-for-item (ids/codes/labels/categories/qty/reliability — labels too, which caught room 105's GR-308 label diff), emit seedable docs.
- `gen_rooms.py` — canonical deterministic room JSON from the DB (byte-identical reruns).
- `gen_spaces.py` — 66 unique space drafts straight from `space_items` (no template layer), collapse one line per (tag,description,reliability) with provenance UNION, merge space-enrich, emit `js/space-meta.js`.
- `seed_rooms.mjs` — REST seeder; **default CREATE-ONLY** (`currentDocument.exists=false`), `--merge-missing` patches only absent item ids via updateMask — never clobbers check-offs.
- `backup_all.mjs` — read-only full backup (config/rooms/templates/activity; roles is rules-denied by design) → `tools/out/backup-*.json` (gitignored); non-zero exit on unexpected skips. **Run before ANY destructive change.**
- `publish_templates.mjs` — push approved templates to Firestore (dry-run/execute) so in-app "Add room" builds correct rooms.
- `migrate_101_103.mjs` (+ fixture test) — the 101/103 cutover: carry check-offs onto new lines, `currentDocument.updateTime` preconditions, dry-run default.
- `patch_item_notes.mjs` — set ONE field on ONE item via exact updateMask.
- `set_room_label.mjs` — rename display label only, `--why` recorded into the note trail.
- MEP chain: `expand_mep.py` (carry a verified MEP package to siblings; 7 distinct packages cover 115 keys; PTAC-1/PTAC-2 split is QQ-vs-King mark convention, settled on the walk by nameplate) → `normalize_mep_labels.py` (richest-label-wins) → `build_mep.mjs` (drafts → `<room>-MEP.json`, type `mep-punch`) → `mep_rollup.mjs` ("how many grilles" — counts units from LIVE data for POs).
- `tools/minutes/` — meeting-minutes PDF toolchain (build81.py, layout.py, extract.py etc.; data removed from public repo in 1f297c8).

**Refs system:** `refs/refs-101.json` (33 snippet PNGs in `refs/`, joined by exact code → R-suffix-stripped base code → item id; `title:null` placeholders filtered; tolerant of 4 index shapes) + `refs.html` per-room reference page grouped by document. `refs/MEP-PARKED.md` records the four sink/faucet cutsheets parked for the MEP pass + the rule: **match submittals on file content/model number, NEVER folder name**.

**Tests (21 files, Playwright at /opt/pw-browsers/chromium, shared server :8322):** smoke, lifecycle-test (own server :8329), geom-check (12/12), floor1-verify, live-invariants (pins live prod state incl. room 101 field work, slug↔template agreement, whitelist), bulk-unit, bulk-edit (26 asserts, demo-only), mep-content-check, mep-ui, refs-page-check, build-room3d, various shot generators.

---

## 5. Tech-stack verdict

**What holds up well:**
1. **The offline-first store** (`js/store.js`) — one interface, two backends (Firestore/localStorage demo); auth-before-listen queueing; pending-floor flush; fromCache detection; remote-surprise detection. Genuinely field-proven design.
2. **Write invariants** — atomic complete check-field groups (never Alice's initials on Bob's status); field-path updates so different items never clobber; soft deletes only; never signOut(); create-only seeding + `--merge-missing`; updateTime preconditions on destructive tools; the bulk engine's re-plan-at-commit + identity-based drift detection + derived (non-blind) undo + `ABSENT`→deleteField restore + sharded recovery docs.
3. **The refs system** (code→basecode→itemId join, permanent offline caches) and **print sheets** (live-data door sheets, approved paper typography, per-trade MEP punch sheets, auto-pagination for spaces).
4. **The data pipeline** — sqlite as single source of truth, deterministic generation, hard-failure ruling application, prove-then-seed, backup discipline, adversarially-reviewed provenance (HIGH/MEDIUM/FLAGGED with both-positions rendering).
5. **Update machinery** — version-stamp-verified SW installs, permanent vs versioned caches, honest offline fallbacks.

**What is weak:**
1. **No real accounts.** Anonymous auth + self-declared name/initials in localStorage + ONE shared admin PIN (whose demo value 6621 is public, and whose production hash gates everything admin). No per-user identity beyond a device uid; anyone with the URL can sign in anonymously and write any valid-shaped room doc; initials are trust-based. No App Check.
2. **No per-user permissions** — admin is binary (PIN), roles collection is an allowlist keyed to the PIN, no read restrictions at all beyond "signed in".
3. **Item map values are NOT validated by rules** — any signed-in client can write arbitrary fields inside `items.<id>`.
4. **Vanilla JS at growing scale** — screens.js (966 ln) + dash-edit.js (1254 ln) of hand-wired DOM; no types; invariants live in comments/handoffs and tests, not the compiler; three doc kinds multiplexed through one collection by string-prefix convention (`space-`, `-MEP`); knowledge is concentrated in SESSION_HANDOFF.md (the no-bundler choice is explicit and deliberate — HANDOFF-dashboard-editing.md §1: "do not introduce a bundler, TypeScript, React… without asking").
5. Single Firebase project, single PIN hash hard-coded in deployed rules; rules text itself is not version-controlled in deployed form (design copy only). Demo/live divergence risk in the dual-backend store.
6. Repo carries heavy non-app freight (research/, preview101/, room-3d.html 733 KB, docs/, minutes toolchain) in the public app repo.

**What a rebuild MUST preserve:**
1. **Austin's 14 standing rulings — SESSION_HANDOFF §3, LAW, do not relitigate**: DB is source of truth for item lists; dedupe to one line per tag with ×qty; GR-302L discrepancy note stays; dishwasher 902 flagged no-submittal; never chase missing submittals; sheet-ID-only identification; per-room 3D geometry never a shared shell (A555 dims; mirror by position, never negative scale); build-out one room type at a time, only on his named go; FF&E scope now / MEP appended via merge-missing; **editing parity is sacred** (tap-check w/ initials, issue quick-picks + custom notes, ★ room notes, admin add-items); RM 438 connector ruling; Austin's room names never DB labels; a type is not a package until the DB says so; don't show him line lists — seed and flag in-app (flags must say what is unknown and what settles it).
2. **Write invariants** (complete atomic check groups, soft deletes only, never overwrite another person's initials, create-merge, listeners-after-sign-in, re-derived bulk plans + identity drift detection + derived undo, recovery records).
3. **Initials stamping** as the core interaction (the paper-sheet metaphor), incl. checkedAt vs checkedAtLocal honesty.
4. **FLAGGED = render both positions, never pick**; derived-vs-observed distinction; provenance (src sheet, reliability, instanceNote) on every line.
5. Offline-first (dead-zone check-offs that sync later), the FF&E/MEP/space separation, floor 16/33/33/33 + 66 spaces structure, the 12 templates, print sheets, refs joins, and the $0 cost posture unless Austin rules otherwise.
6. Live field data: room 101's 14 checks / 6 issues / 1 note (and any accrued since) must survive any migration — `backup_all.mjs` first, always; redact checkedByName/checkedByUid before committing any dump (public repo).

**Open/UNVERIFIED items:** deployed Firestore rules text (narrower items.* whitelist per handoff) not in repo; PR #4 state (merged as 540e011 per git log — the "held" deploy has since shipped: main is at 1.18.3 with dashboard editing live [rules/hosting state on gh-pages not verified from this sandbox]); dashboard editing round-3 critic review never run; sha256(6621)==deployed-hash not recomputed here; whether phones have all updated past v1.16 (space docs render as guest cards on old SW); the 4-vs-5 display_label drift check; hearing-impaired room count (12 vs 10, floors 1&4 unscanned); tub-vs-roll-in on 7 accessible keys (A11 — Austin's RFI); 438 connecting flag (B4.4); 401 label RFI (D1).
