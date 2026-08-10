# H2SEP Room Checklists — Session Handoff

**How to use:** In a fresh chat, say "read SESSION_HANDOFF.md in my Claude repo and continue."
The session should attach `SH0T250/Claude` (this repo) and `SH0T250/h2sep-checklist`, read this
file top to bottom, and verify live state before acting. Everything below was true when written;
trust the live systems over this prose where they differ.

---

## 1. The live system ($0/mo, all Austin-owned)

| Thing | Where |
|---|---|
| **Crew app (PWA)** | https://sh0t250.github.io/h2sep-checklist/ — installable, offline-first |
| **Live dashboard** | https://sh0t250.github.io/h2sep-checklist/dashboard.html |
| **Preview package** | https://sh0t250.github.io/h2sep-checklist/preview101/ (marked SHIPPED, kept for reference) |
| **App repo (public)** | `SH0T250/h2sep-checklist` — app at root; **deploys = push to `main` AND `main:gh-pages`** (Pages serves gh-pages) |
| **Private archive** | `SH0T250/Claude` — ONLY the Firestore backups + the completion-schedule PDF. Everything else moved here in v1.14.0; there is no app mirror and no tools copy any more. |
| **Database** | Firebase project `h2sep-checklist`, Firestore under `projects/h2sep/…`, anonymous auth, rules enforce shape + PIN-gated admin |
| **Admin PIN** | not recorded in this repo — ask Austin. (It is also `DEMO_PIN` in `js/config.js`, which is public; see the security note in §Deploy.) |
| **Reference dataset** | `data/project.sqlite` in the app repo — 115 rooms, 17,635 item rows, 21 categories. THE source of truth for item lists. |

**Versions: v1.16.0 — ALL 115 ROOMS LIVE, floors 1-4 complete.** 16/33/33/33.
Room names are Austin's; 47 QQ-family rooms carry the 3D exhibit; 12 room-type
templates published so "Add room" builds a correct room for every type.
Fixes from the 108-agent full-hotel audit: geom-check's coverage gate printed FAIL
but exited 0 (it was advisory for three versions — now mutation-tested); room 118
carried room 438's slug, so one Save on its settings screen would have renamed it
and injected a GR-502 mirror that is not in it; the legacy 30-line template was
still live under a third identical "QQ Studio Connector" name in the Add-room
picker; the GR-503 ruling asserted the tag was "not a product" when the A530
legend defines it as ART ABOVE DINING TABLE and it ships at HIGH reliability in
six One Bedroom rooms; plan placeholders sent every room to room 101's enlarged
plan; the caveat strip — the only disclosure of unconfirmed handedness — was
display:none on phones; `node tests/smoke.mjs` crashed on the documented command.
NEW: tests/live-invariants.mjs asserts what the UI suites cannot see (slug↔template
agreement, duplicate template names, room 101's field work, bare flags, whitelist).
`js/config.js APP_VERSION` must equal `sw.js VERSION` minus the `h2sep-v` prefix;
the service worker REFUSES mismatched builds.

**Deploy runbook:** edit the app IN THIS REPO (there is no mirror to copy from any more) → run
the suites: `node tests/smoke.mjs`, `tests/geom-check.mjs`, `tests/floor1-verify.mjs`,
`tests/lifecycle-test.mjs` (Playwright chromium at `/opt/pw-browsers/chromium` — executablePath is
that path itself; smoke/geom/floor1 expect the app served at localhost:8322, lifecycle spins up its
OWN server on 8329 so it can never kill the shared one) → commit →
`git push origin main && git push origin main:gh-pages` → wait ~30s → curl the live
`sw.js` + `js/config.js` to confirm version; HEAD-check every shell file incl. `refs/` (64 URLs;
an occasional 503 from Pages is transient — re-curl before believing it), then sha256-compare the
live bytes against the tested tree.
**Two sessions have now worked this repo at once.** ALWAYS `git fetch` + merge before pushing;
v1.8.1 landed mid-flight and had to be merged by hand. `room-3d.html` is BUILT, never hand-edited:
`node tests/build-room3d.mjs preview101/room101-3d.html room-3d.html` (run from the APP repo)
re-applies the 18-patch in-app set to whatever the preview package holds, and fails loudly if an
anchor moved. Patch order matters — patches anchored on text an earlier patch CREATES must come
after it. **Whenever room-3d.html changes, bump `MODEL_CACHE` in sw.js** (`h2sep-model-4` in v1.13.0):
it is a permanent cache, so phones that already opened the exhibit would otherwise keep the old
build forever.
NOTE: this session's harness required Austin's explicit in-chat approval before any public-repo
push or Firestore `--execute`; assume the same next time (simple single-purpose commands passed
review; compound one-liners with heredocs got blocked).

## 2. Data state (Firestore, as of 2026-08-09)

- **ALL 8 QQ STUDIO CONNECTOR ROOMS BUILT** (Austin approved this type only,
  2026-08-09): **101, 103** (F1) · **215, 236** (F2) · **336** (F3) ·
  **401, 403, 436** (F4). 40 lines each = 320 lines; only 101 carries check-offs
  (14). All verified against the DB before seeding, all carry the ruled notes.
  103 was rebuilt from soft-deleted via `--replace-if-empty` (createdAt kept).
  Backup taken first: `backups/firestore-pre-qq-buildout-2026-08-09.json`
  (name/uid redacted — the activity log carries them too, not just items).
- **Room 101: CUTOVER DONE.** 40 lines (FF&E + Appliances + Bath Accessories), schemaV 3,
  14 carried check-offs (13 CC + GR-402 AJ), 6 open issues carried, createdAt preserved
  (2026-07-31). GR-319/GR-323 folded onto gr322_a's instanceNote per ruling. Carry report:
  `tools-cutover/out/carry-report-101.md` (this repo) / `tools/out/` in app repo checkout.
- **Room 103: soft-deleted** (deleted:true, doc + 31 items left in place). Rebuild at mass build.
- Templates: `qq-studio-connector` (legacy, 30 items — predates cutover; refresh at mass build).
- **Pre-cutover backup**: `backups/firestore-pre-cutover-2026-08-09.json` in this repo's working
  tree — ALSO delivered to Austin in-chat 8/9 (couldn't be committed: raw dump carries a real
  name/uid and the harness refused it; the working-tree copy dies with the container, so Austin's
  copy is the durable one). Redact checkedByName/checkedByUid before committing any future dump.
- **Paper-sheet photos**: `sheets/<room>.jpg` + `sheets/index.json`; 101 exists (102/103 were in
  the lifecycle-test scratch only, not the app repo).
- **Backups discipline**: `tools/backup_all.mjs` before ANY destructive change (exports config,
  rooms, templates, activity; roles is rules-denied by design; non-zero exit on unexpected skips).

## 3. Austin's standing rulings (LAW — do not relitigate)

1. **Database is source of truth** for item lists (GR-322 is the only nightstand; sconces are GR-207/GR-208 DB naming).
2. **Dedupe**: one line per tag with ×qty badge (e.g. GR-300 ×2). CC initials/red notes preserved. ✅ SHIPPED
3. **GR-302L stays**, flagged note documenting the L-vs-DB discrepancy. ✅ in live 101 (gr302_a instanceNote)
4. Dishwasher (902) + disposer: **⚑ FLAGGED, no submittal link** — Austin resolving. ✅ flagged in live 101
5. **Never chase missing submittals** (lighting pkg, bedding, restroom accessories — Austin will supply). Gaps shown honestly, not blockers.
6. GR-305/320/325: add ONLY if identified with real **title-block sheet IDs** — "page numbers" are banned project-wide.
7. **3D exhibit — per-room geometry, never a shared shell.** Austin (8/9): "it needs
   to be as per the floor plan... if it's a mirrored floor plan then it needs to be
   the other way around." Dimensions come from **A555**, which dimensions the QQ
   family once and tags variants inside the dimension strings:
   **QQ standard 12'-8" bay / 12'-0" clear · QQ Wide 13'-10" bay / 12'-11 3/8" clear ·
   depth 37'-6 1/2" / 36'-5" clear · QQ Ext 39'-10 1/4" / 38'-9" clear.**
   `ROOM_GEOM` in the built `room-3d.html` (authored in `tests/build-room3d.mjs`)
   holds w/mirror/variant/basis per room. Mirroring reflects positions inside
   `box()`/`cyl()` + the world-space group placements — NEVER a negative group
   scale (inverts winding, wrecks lighting). **Bump `MODEL_CACHE` in sw.js on every
   geometry change** (`h2sep-model-3` today).
   v1.13.0 extends this to the WHOLE QQ family: `d` (depth) and `conn` (does the room
   have a GR-3 door) joined `w`/`mirror` in `ROOM_GEOM`. **QQ Extended is 38'-9" clear
   deep vs the standard 36'-5"**, and a non-connecting room now gets a solid demising
   wall instead of a connecting door drawn into it. Headings show Austin's crew name,
   the TYPE row + caveat keep the architect's variant — room 201 reads "QQ STUDIO" up
   top and "QQ WIDE · 12'-11⅜" CLEAR" in the caveat; both are correct in their place.
   A555 states outright that where the extra width/depth is absorbed "is not separately
   drawn", so the caveat says EXTRA DEPTH NOT LOCATED ON A555 rather than implying
   precision the sheet does not have.
   `tests/geom-check.mjs` (10 cases) asserts W/D/mirror/conn, that GR-3 is absent from
   both the scene AND the sidebar in a non-connecting room, and that no heading names
   the wrong type.
   OPEN: even-side handedness (236/336/436, and now 230/232/330/332/430/432) is inferred
   from corridor side and is marked CONFIRM ON PLAN; 215's connecting partner is not
   named on A101.
   **A555 flag 3: the set never dimensions QQ Wide *Connecting* — 101/401 are a
   derived condition. Worth an RFI.**
   **The King family has NO model yet.** A550 gives King Studio 12'-0" clear x **29'-0"
   clear** (vs QQ's 36'-5") with one king bed, its own working wall (GR-304 std /
   GR-306 connector / GR-307 accessible) and GR-319+GR-323 nightstands. It needs its own
   geometry — never a relabelled QQ shell. Enlarged plans, all present in Drive as
   markdown extracts: A550 King Std + Conn · A551/A552 King Acc + Acc Mod ·
   A553/A554 One Bedroom · A555 QQ family · A556 QQ Acc · A530 the shared bathroom.
8. **Austin approves build-out ONE ROOM TYPE AT A TIME.** He approved the QQ
   Studio Connector type on 8/9 (all 8 rooms, floors 1-4) and said the other
   types follow "the same template exactly" — but each still needs his go.
   Never build a type or floor he has not named.
9. Scope of current lists: FF&E families + Appliances + Bath Accessories (MEP later via `--merge-missing` append; never clobbers check-offs).
10. Editing parity is sacred: tap-check w/ initials, issue quick-picks + custom notes, ★ room notes, admin add-items — must work in every rebuild.
11. RM 438 is **King Studio Accessible CONNECTOR** per CB's 7/31 direction (db says connecting=0 — override at mass build).
12. **Rooms carry AUSTIN'S names, never the database's `display_label`.** He gave the
    controlled list as folder names on 8/9. The mapping (DB `room_type` -> what the app shows):

    | DB `room_type` | App shows |
    |---|---|
    | `Queen-Queen`, `QQ Wide` | **QQ Studio** |
    | `QQ Connecting`, `QQ Wide Connecting` | **QQ Studio Connector** |
    | `King Studio` | **King Studio** |
    | `King Studio Connecting` | **King Studio Connector** |
    | `King Studio Acc.` (rm 118) | **King Studio Acc Mod** |
    | `King Studio Acc.` (rm 438) | **King Studio Acc** |
    | `QQ Extended` | **QQ Extended** |

    Note `QQ Wide` already carries `display_label = 'QQ Studio'` in the DB — it is a wider
    bay, not a different name. Types not yet named by Austin: `King One Bedroom`,
    `King One Bedroom Acc.`, `QQ Acc.` (his folders list them; no rooms built yet).
13. **A room type is NOT a package until the DB says so.** King Studio carries 41 lines,
    QQ 40, King Studio Acc Mod 43 — never clone one type's template onto another.
    `build_room_type.py` compares LABELS as well as tags, which is what caught that room
    105's GR-308 label records a spec-vs-plan discrepancy room 101's does not: identical
    tag sets, different templates. Trust the tool's hard failure over an eyeball diff.
14. **Austin's review preference (8/9): don't show him line lists before seeding.** Generate,
    seed, and flag anything questionable IN THE APP for him to resolve on his phone. That
    raises the bar on flag quality — a FLAGGED line must say what is unknown and what would
    settle it.

## 4. Session of 2026-08-09 (this one) — what happened

The prior in-flight workflow's app work had landed in WIP commits, but its seed-prep /
bath-research / 3D-final deliverables died with that container. This session:

1. Rebuilt the lost tools via a critic-looped workflow (backup_all, migrate_101_103 + fixture
   test 13/13, template-101-final.json — zero critic defects, validated vs sqlite + refs).
2. Applied confirmed app-review fixes: ×qty badge rendering (was missing entirely), theme.js
   DOM-first getTheme (private-mode lock-in), refs.js R-suffix fallback (GR-308R→GR-308 refs),
   demo qty fixture idempotency. Smoke 66/66, lifecycle 31/31.
3. Ran backup → **executed the 101/103 cutover** (dry-run reviewed first; Austin approved in-chat)
   → REST-verified → **deployed v1.8.0** → hash-verified live bytes → Playwright mobile shots of
   the real migrated room sent to Austin.
4. **STOPPED at the phone gate.**

**Tool homes:** canonical in app repo `tools/` (committed to `main` with the deploy);
mirror + carry report in this repo `tools-cutover/`. Fixture has name/uid REDACTED.

## 5. NEXT STEP: the remaining room types, one at a time

**FLOOR 1 IS COMPLETE (16/16) and 30 rooms are live.** Use the
`h2sep-room-buildout` skill (also mirrored at `skills/h2sep-room-buildout/`) —
it carries the whole pipeline. Short version: scope the type from the DB → prove
the package matches → `tools/make_template.py` → `tools/apply_rulings.py` →
`tools/build_room_type.py` → `tools/seed_rooms.mjs` → REST verify.

Live now (30 rooms): QQ Studio Connector 8 (101 103 · 215 236 · 336 · 401 403 436) ·
King Studio 6 (104-114 even) · QQ Studio 6 (105-115 odd) · King Studio Connector 1 (116) ·
King Studio Acc Mod 1 (118) · QQ Extended 6 (230 232 · 330 332 · 430 432) ·
QQ Wide 2 (201 301, shown as "QQ Studio").

Approved templates live in `tools/out/template-<slug>.json` (qq-studio, qq-wide,
qq-extended, king-studio, king-studio-connector, king-studio-acc-mod) with their
raw generations kept alongside as `.draft.json` so every ruling is a visible diff.

Remaining (115 keys total): `King Studio` 51 more · `Queen-Queen` 25 more ·
`King One Bedroom` 3 · `King One Bedroom Acc.` 3 · `QQ Acc.` 2 ·
`King Studio Acc.` 1 more (438). **Each floor/type still needs Austin's go.**
RM 438 typeLabel override per ruling 11 → **King Studio Acc** (ruling 12).
The three unbuilt types have no template yet; One Bedroom is A553/A554, QQ Acc is A556. Refresh the `qq-studio-connector`
template DOC in Firestore (still the 30-item legacy shape — the app's admin
"add room" flow uses it). Backup first, always.

## 5b. Session 4 of 2026-08-09 — v1.13.0 (floor 1 build-out)

Austin confirmed four things before the build: 118 is **King Studio Acc Mod**; **do not**
show him line lists first (flag questionable items in-app instead); and add QQ Extended +
QQ Wide with printouts and 3D "as per what you know to do".

What shipped:
1. **14 new floor-1 rooms + 8 more on floors 2-4**, all under his names. Backup taken first;
   create-only seeding, so 101's field work (14 checks / 6 issues / 1 note) was untouchable.
2. **Six per-type templates**, each generated from the DB and proved line-for-line. Two new
   tools: `make_template.py` (dedupe to ×qty lines) and `apply_rulings.py` (one auditable
   ruling table; a ruling targeting a missing line is a HARD FAILURE, never a silent skip).
3. **QQ-family 3D** — see ruling 7. The King family deliberately gets no model.
4. `tests/geom-check.mjs` (10 cases) and `tests/floor1-verify.mjs` (live REST → injected
   into the demo backend → asserts names, room count, and 3D-button gating per room).

Defects caught and fixed during the work, worth remembering:
- `make_template.py` first kept the first instance row's `instanceNote` when collapsing, so a
  line rendering "×2" also read "bed 1 of 2". Cleared on collapse.
- The GR-3 glow keeper (`pDoor.mats.forEach`) sits at module level OUTSIDE the door's own
  block — in a non-connecting room that was a TypeError that killed the entire scene. The
  geometry test caught it; a screenshot would not have.
- The exhibit's headings hard-code "QQ STUDIO CONNECTOR", so room 230 announced itself as a
  connector. Now rewritten per room, and asserted in the test.
- `floor1-verify.mjs` initially "passed" room 104's name by matching the item label
  "Working Wall @ King Studio Suite" in body text. Now reads the `.rh-type` element.

**New flags raised for Austin (visible in-app, awaiting his ruling):**
- **Room 118 is drawn BOTH ways** — HD-05 Config A (tub) and HD-14 + HD-5.1 Config B
  (roll-in shower) are mutually exclusive. Both are flagged; the room is built to ONE.
  This is the highest-consequence open item on the floor.
- **GR-208** in room 118 reads "@ QUEEN QUEEN SIDE" on a King suite (carried off A552).
- **GR-503** in room 118 reads as a drafting annotation, not a product.
- **GR-308** on the base QQ rooms: A555 prints "@ Queen Queen Studio Suite Connector" but
  tags it on the BASE QQ plan — the sheet's own flag 2. Confirm the correct working wall.
- **GR-322** nightstand count: DB tags 1, the 101 paper sheet counted 3, and the King rooms
  do carry two separate nightstands (GR-319 + GR-323). Count on site before ordering.

## 6. Austin owes (open inputs)

- Lighting package submittals · bedding submittals · restroom accessory submittals (upload to Drive → then link items).
- Confirm restroom accessory manufacturer (Bobrick?).
- Identity of GR-305/320/325 (only with title-block sheet IDs) — largely ANSWERED below;
  GR-320 needs Austin's yes/no, GR-325 needs an RFI to RK.
- Dishwasher/disposer model ruling (902 line offers DDW18D1ESS 18" vs DDW2404EBSS 24").
- **NEW 8/9:** the four bathroom/kitchenette sink + faucet cutsheets are plumbing, not FF&E —
  they get attached when MEP lines are appended, not to GR- tags (`refs/MEP-PARKED.md`).

**UPDATE 2026-08-09 (original session, reconciled):** the "lost" deliverables were NOT lost —
the original session's workflow completed them (all critic-stamped WOWED 9.2-9.3) and they now
live in this repo under `research/`: `bath-research.md` + `bath-fixtures.json` (Drive-verified:
**Bobrick NOT CONFIRMED — zero Bobrick files on Drive; G402 defers to the standards manual; all
HD-* models = awaiting Austin.** Spec-of-record P104 diverges from Drive cutsheets — WC-3/WC-4 =
AmStd Champion Pro 211AA.104 / Cadet Pro 215CA.104 per P104), `room101-3d.html` (final
mobile+light revision), `proposed-additions.md` (**GR-320 = Decorative Shelves above Desk,
ID-5.8, proposed FLAGGED — awaiting Austin's word; GR-305 = alternate tag of the GR-308 working
wall, do NOT add; GR-325 = tagged on ID-5.8 but NO description exists in the source set — RFI to
RK**), `refs-coverage.md`, evidence crops. That session also shipped **v1.8.1**: refs data fixes
(appliance plan-pointers surface, disposer joinable via new item-id fallback in refsFor,
ID-5.10 title-block fidelity), snippet centering, toast dismissal on route change.

## 6b. Session 2 of 2026-08-09 — v1.9.0 (Austin's revision pass)

Austin reviewed Room 101 on his phone and asked for a rework of THIS ROOM ONLY
(he re-stated: **do not build out the floor until he approves**). Delivered:

1. **GR-302 submittal was wrong — caught by Austin, verified, removed.** The
   "Moen Bathroom Vanity Faucet.pdf" attached to GR-302 (Vanity @ Guest Bath, a
   casegood) is a M·Dura single-handle **lavatory faucet** cutsheet (9417F12 /
   9419F12) — plumbing trim. Root cause: its Drive folder is named *"Bathroom
   Vanity & Kitchenette Sink & Facuet - PD & Cutsheets"* and the pipeline matched
   the FOLDER name. All four files in that folder are sinks/faucets. Removed from
   GR-302; `refs/MEP-PARKED.md` records them for the MEP pass **and the rule:
   match submittals on file content / model number, NEVER on the folder name.**
   Every other submittal ref was re-verified against Drive and is correct
   (Kalisher literally names "GR-500 - ART ABOVE SOFA"; Danby model numbers match
   901 / kn 11 exactly; WingIts = the divider hardware).
2. **Collapsible categories** — every category header is a ▼ toggle, collapsed
   state remembered per room per device. Jump-to-issue and the trade chips
   auto-expand a collapsed group so a row can never be hidden from a jump.
3. **Hint line** in the room head: "Tap a line to initial & complete · long-hold
   for options". (Long-press → issue sheet is real: 500 ms, `screens.js`.)
4. **Printable door sheet, generated from LIVE data** — `print.html` + `js/print.js`
   reuse the approved paper typography (extracted verbatim to `css/print.css`),
   two pages, ×qty badges, initials in boxes, room note, print stamp. Reflows to
   one column on a phone SCREEN; print output is unchanged. The app hands the room
   over in `sessionStorage` on tap, so it prints in a dead zone instead of spinning
   (Firestore retries forever rather than rejecting — there is a 10 s cap).
   This REPLACES the paper photo as the primary sheet; the original scan moved to
   the ⋮ menu and only appears for rooms that have one.
5. **3D exhibit in the app** — `room-3d.html`, Room 101 only (ruling 7). Built by
   `tests/build-room3d.mjs` from the preview exhibit; the phone pass adds portrait
   framing (steeper ISO + aspect-driven FOV/dolly), tags OFF by default with a
   TAGS chip (30+ leader labels cannot be legible at 412 px), a mobile render
   budget, and the ‹ ROOM 101 / 🖨 SHEET bar. Served from a permanent
   `h2sep-model` cache so the ~590 KB three.js payload downloads once, not on
   every version bump. **Beware:** the exhibit writes `style.display` on labels
   every frame, so hiding them needs the update loop gated, not just CSS; and the
   exhibit's own phone rules sit late in its stylesheet, so the in-app block is
   appended LAST to win the cascade.
6. **Demo fixture rebuilt from the shipped template** (40 categorized lines, real
   qty, the 14 carried check-offs) — demo mode had still been showing the retired
   30-line paper shape, which made demo screenshots misleading. `demoLoad()` now
   re-seeds any demo DB whose room 101 is not schemaV 3.

Tests: smoke 86 / lifecycle 31, all green.

## 7. Key operational knowledge (learned the hard way)

- **Firestore writes**: rules whitelist room top-level keys `[number, floor, type, typeLabel, items, notes, deleted, schemaV, createdAt, updatedAt]` — tools strip everything else. Items map values are NOT validated (category/refs/qty ride along fine). Room create/update needs only anonymous sign-in + valid shape; PIN/role is for templates/config only.
- **Write invariants**: atomic full check-group updates; `setDoc(..,{merge:true})` creates; soft deletes only; never `signOut()`; listeners attach AFTER first anonymous sign-in. Destructive writes: use `currentDocument.updateTime` preconditions (migrate tool shows the pattern) — abort on 409, never overwrite a concurrent crew write.
- **Update machinery**: versioned SW cache + permanent `h2sep-sheets`/`h2sep-refs` caches; install verifies version stamp (refuses mixed-CDN builds); update banner → SKIP_WAITING; ignored updates self-activate on relaunch. iOS requires Home-Screen install before writing.
- **Refs**: bundled `refs/refs-101.json` joins by exact item code, then the base code with a
  trailing orientation `R` stripped (GR-308R→GR-308), then the item id (code-less lines like the
  disposer). Refs with `title:null` are placeholders and filtered at runtime; snippet PNGs live in
  `refs/` and precache into `h2sep-refs`. Coverage is currently 40/40 lines — the smoke suite pins
  that, so a dropped ref shows up as a missing 📎 chip.
- **Submittal matching**: match on file CONTENT / model number, never on the enclosing Drive
  folder name. A folder can group by room area ("Bathroom Vanity…") while its contents are a
  different trade entirely — that is exactly how a faucet cutsheet ended up on a casegood.
- **Cloud-container testing**: browser can't reach Google even via the agent proxy (CONNECT relay refused) — REST verifies live data (node fetch works); for "live" screenshots, fetch the doc via REST and inject into the demo backend's localStorage (`h2sep-demo-db-v1`), pass the crew-name gate, and force real reloads via about:blank (hash-only goto does NOT reboot the app).
- **Room ingestion loop**: paper photo → parse → REST seed (create-only + `--merge-missing`); photo also goes to `sheets/<room>.jpg` + index + SW version bump.
- **Drive folder IDs**: Phase II root `13fesQmzBhfzeBo08bIDtnCYznJuFFxMA`; Submittals `1fLJO0537clxG-wmQ8FGf14giaD-LdF6O`; FF&E Floor Plans `1Yui3zNCQVYAsiUQHJNBMa08HWWeRjJcJ`; Plans & Specs `12k6I2u_4t2lpb61OH0HdCBY4LCpCpNPm`; Specs `1rGOOzJwswUOgXBwRMamXSI_XAcqeOfxY`; AI Context `1DatZs0mnFuQCFrEyjp1z1Fl46lKmwWuw`.
- **Dataset traps** (data/APP_HANDOFF.md in app repo — read it too): join on `room_type` never `display_label` (4 rooms differ); FLAGGED = two sources disagree, render both, never pick; `derived=1` = from room-type package; never re-scrape plans (hidden duplicate tags); 7 accessible keys carry the unresolved tub-vs-roll-in conflict — Austin's RFI to MWT.
- **Reference files** (this repo, `reference/`): Austin's authoritative Room101 3-page PDF (page 1 = typography law; page 2 = QQ plan w/ tag positions; page 3 = Room 336 bathroom detail), the Aug completion schedule (WBS: Level > Guestrooms / Common Areas > Corridor 121…), the Fort Stockton 3D style reference.

## 8. Communication style that works with Austin

Straight answers, lead with the outcome, honest about limits and costs ($0 so far — keep it
that way). He responds to previews he can tap/print. Deliverables > promises. When he says
"go," go; when ambiguity is real, one tight round of options with a recommendation. He
dictates on the move — read through typos to intent, confirm big destructive steps.
