# Handoff — Dashboard Editing (H2SEP)

**Audience:** an AI coding assistant (any model) picking this work up cold, plus the human
reviewing it. Written 2026-08-11 at a deliberate pause point. Everything described here is
committed and pushed; the working tree was clean when this was written.

**Read this whole file before changing code.** The section "Invariants you must not break"
is the part that matters most — several of them exist because breaking them already caused
a real bug in this project.

---

## 1. What this software is

Home2 Suites Eagle Pass ("H2SEP") is a hotel under construction. Crews install FF&E
(furniture, fixtures, equipment) room by room and check items off a checklist on their
phones. The system is a static, zero-cost stack owned by one person (Austin):

| Piece | What it is |
|---|---|
| Crew app | `index.html` + `js/app.js` — installable PWA, offline-first, used on phones in the field |
| Wall dashboard | `dashboard.html` + `js/dash.js` — a live board, historically **read-only** |
| Data | Firebase Firestore, anonymous auth, one project |
| Hosting | GitHub Pages off the `gh-pages` branch |

There is **no build step and no framework.** Plain ES modules loaded directly by the
browser, plain CSS, a hand-written service worker. Do not introduce a bundler, TypeScript,
React, or a package manager dependency without asking — the whole point of this stack is
that it costs nothing and cannot rot.

**Repo:** `github.com/SH0T250/h2sep-checklist`
**Branch with this work:** `claude/dashboard-editing-inventory-f69y7b`
**Pull request:** #4, open and ready for review
**Deployment status:** NOT deployed. `gh-pages` is untouched. Austin explicitly chose
"branch + PR, I hold the deploy." **Do not deploy without him saying so.**

---

## 2. What this branch adds

The dashboard was read-only. When a whole product line arrives — every divider in the
building, its hardware, the closet hardware — clearing the resulting `MISSING` flags meant
opening 181 room documents on a phone and repeating the same tap 181 times. This branch
makes the dashboard editable.

**Per-item editing, matching the crew app exactly.** Browse floor → room → item, tap to
check with your initials, and get the app's four-option issue flow (resolve & check /
resolve only / edit wording / clear), its issue vocabulary, per-row flagging without
checking, room notes, duplicate-instance ordinals, and reference cutsheets and plan
snippets in every item sheet.

**Bulk editing.** Choose a scope (item codes, floors, guest rooms vs common areas, current
state) → see the exact count that will change with honest reasons for everything skipped →
unlock with a PIN → confirm → apply in chunked batches → undo.

**A new INVENTORY panel** listing every item code in the building with live counts, each
row carrying a BULK EDIT button that opens the drawer pre-scoped to that code's open issues.

### Files

| File | Lines | Role |
|---|---|---|
| `js/bulk.js` | 560 | **The engine. Pure logic** — no DOM, no Firebase imports. Unit-tested directly in node. |
| `js/dash-edit.js` | 1213 | The edit layer: sheets, the bulk drawer, identity, PIN, confirm, undo. |
| `js/dash.js` | 390 | Rewritten to ride `store.js`. Renders the board; owns focus restoration across re-renders. |
| `js/store.js` | 618 | Pre-existing. Gained `getBulkContext()`, `getAllDocs()`, `canVerifyPin()`, `isFromCache()`. |
| `css/dash.css` | 477 | Pre-existing. Gained the edit-mode, sheet, and drawer styles. |
| `tests/bulk-unit.mjs` | 293 | Engine unit tests (node, no browser). |
| `tests/bulk-edit.mjs` | 224 | End-to-end Playwright suite, demo mode only. |

`js/util.js`, `dashboard.html`, `sw.js`, `js/config.js` have smaller changes. Version is
**1.18.1** — `sw.js`'s `VERSION` must always equal `'h2sep-v' + APP_VERSION` from
`js/config.js`, and every new file must appear in the `SHELL` array in `sw.js` or it will
not be cached and will 404 offline.

### The engine's shape (`js/bulk.js`)

Read this file first; everything else is presentation over it.

- `buildInventory(rooms)` — every distinct item code across the building with live counts.
- `resolveTargets(rooms, scope)` — a scope object to the concrete list of items it means.
- `planAction(rooms, scope, action, opts)` → a **plan**: `{ action, changes[], skipped[],
  counts, roomList, skipReasons }`. Each change is `{ room, itemId, code, label, fields,
  before }`. Nothing is written here — a plan is inert and inspectable, which is what makes
  preview, confirm, and undo honest.
- `invertPlan(plan)` / `deriveUndoPlan(inverse, rooms)` — undo. See invariants.
- `payloadsFor(plan)` / `executePlan(plan, ctx, onProgress)` — the only code that writes.
- `auditBulk(plan, ctx, bulkId)` — the audit + recovery record.
- `describePlan(plan)` — one human sentence, used by the confirm dialog, the toast, and the
  audit entry, so all three describe the same operation the same way.

The seven actions, and which are destructive (`ACTIONS` in `bulk.js`):

| Action | Destructive |
|---|---|
| `check`, `resolveAndCheck`, `resolveIssue`, `setIssue`, `renameIssue` | no |
| `uncheck`, `clearIssue` | **yes** — these remove field data |

---

## 3. Invariants you must not break

These are load-bearing. Each one is here because of a specific failure, most of them found
by adversarial review of this exact code.

1. **The plan that executes must be re-derived at the moment of commitment.** A confirm
   dialog is a human-paced pause; a crew member checking something off during it must not
   be clobbered. `dash-edit.js` re-plans after the PIN *and* again after the confirm, and
   executes that fresh plan. If the change set moved, it aborts and tells the operator.
2. **Drift is detected by identity, not by count.** `changeSetKey()` compares sorted
   `room + itemId` keys. Equal counts can hide swapped membership — one item leaving scope
   while another enters would otherwise execute against something never previewed.
3. **Undo is not a blind inverse.** `deriveUndoPlan` re-derives against current state and
   skips anything touched since the bulk, with a partial-undo confirm stating how many.
   A blind inverse would silently erase work done in between.
4. **Absent fields restore to absent.** `bulk.ABSENT` is a marker meaning "this field did
   not exist before." Restoring it must call `deleteField()`, never write `null` — legacy
   item records lack some fields, and writing `null` onto them is not the inverse of the
   change and corrupts comparisons later.
5. **Never overwrite another person's initials.** Check-field groups
   (`checked`, `initials`, `checkedByName`, `checkedByUid`, `checkedAt`, `checkedAtLocal`)
   are written as a complete atomic group or not at all. A half-written group produces an
   item that is checked by nobody.
6. **Soft deletes only.** Set `deleted: true`; never remove a key.
7. **`dataTrust()` in `dash-edit.js` is the single gate both apply and undo read** — do not
   let them drift apart again. It is deliberately graded:
   - `'offline'` — `navigator.onLine` is false. Unambiguous, so destructive actions are
     refused outright.
   - `'cache'` — the browser claims to be online but every listener is serving cache. This
     is how site wifi that filters Firebase presents, and the board already has a
     RECONNECTING light for it. But it can *also* be briefly true around normal write
     latency, so this grade warns in the strongest terms rather than hard-blocking. **A
     false positive must never strand an operator behind a refusal they cannot get past.**
8. **Batches chunk by document, not by field.** Firestore caps a batch at 500 writes;
   `BATCH_CHUNK = 400` counts documents.
9. **Every bulk writes a recovery record**, sharded at `RECOVERY_PAGE_ITEMS = 800` across
   `activity/bulk_<id>[_pN]`, so the largest and most dangerous operations cannot silently
   exceed Firestore's 1 MiB document cap. Audit failures toast; they never throw. The
   user's edit already landed — losing the audit must not look like losing the work.
10. **Firestore rules are narrow.** Room writes accept only dotted `items.<id>.<field>`
    paths plus `updatedAt`. `activity/{day}` accepts any document id, which is what lets
    the recovery documents land. If you add a field, the rules must change first or every
    write silently fails.
11. **Never call `signOut`**, and attach listeners only after the first sign-in.
12. **Sheets must be dismissed through `closeSheet()`, never `element.remove()`.**
    `closeSheet` is what clears the `inert` attribute from the page behind the dialog.
    Bypassing it leaves the whole dashboard swallowing clicks — and a touch-only wall
    screen has no keypress to trip the self-heal, so the board is dead until reload. This
    exact bug shipped into review once; there is now a regression test for it.

---

## 4. How to run it

**Environment:** Node 22 (`v22.22.2` here), Playwright with Chromium at
`/opt/pw-browsers/chromium`. `tests/node_modules` is a gitignored symlink to the global
install — if tests cannot resolve `playwright`, recreate that symlink rather than running
`npm install` into the repo.

```bash
# Serve the repo root over HTTP on port 8322 (any static server works).
# In the original session a shared server was already running on that port —
# if one is running, use it; do NOT kill or rebind it.
python3 -m http.server 8322

# Engine unit tests — no browser, fast, run these first.
node tests/bulk-unit.mjs

# End-to-end, demo mode only.
node tests/bulk-edit.mjs

# Pre-existing suites that must stay green.
node tests/smoke.mjs
node tests/lifecycle-test.mjs
node tests/geom-check.mjs        # expect 12/12
```

Open `http://localhost:8322/dashboard.html?demo=1` to drive it by hand. Demo mode uses a
seeded local database in `localStorage` under `h2sep-demo-db-v2` and never touches
Firestore. **The admin PIN in demo is `6621`** — it is public by design; its sha256 matches
the deployed rules hash.

`tests/bulk-edit.mjs` is demo-mode only on purpose: bulk writes and live data must never
mix in a test run. `tests/live-invariants.mjs` pins real production state (room 101's exact
field work) and will fail loudly if live data is disturbed.

All suites were green at the pause point.

---

## 5. Traps that already bit us

Things that cost real debugging time here. Skim before you start.

- **Promises settle once.** Routing a dialog's dismissal through `closeSheet` fires its
  `onClose`, which resolves `false` — if that runs before the success path resolves `true`,
  every confirm silently returns false and edit mode never turns on. **Resolve before you
  close.**
- **`display: inline` ignores width and height.** The dashboard's magnitude bars were
  inline `<span>`s, so their fills never painted at any value. This was a *pre-existing
  production bug*, fixed on this branch (`display: block`).
- **Grid items default to `min-width: auto`,** so a `1fr` track floors at its content's
  min-content width. Long item labels stretched the bulk drawer's first column to 1370px
  inside a 1060px panel and pushed the action column and the Apply button off-screen. Fixed
  with `.bd-col { min-width: 0 }`. The same class of bug caused a mobile zoom-out via the
  inventory table.
- **Tests that set up state can hide the bug.** Every existing test typed into the drawer's
  filter box before interacting, which shrank the column — so the blowout above passed
  review twice. When you add a test, ask what the *unconfigured first render* looks like.
- **`refsFor()` returns nothing until `initRefs()` has fetched the index.** It was wired
  into `app.js` but not `dash.js`, so the References panel rendered empty on a board that
  had the data on disk. Wiring alone is not proof; assert that rows actually render.
- **`CSS.escape` operator-entered values** before interpolating them into selectors. Room
  ids are free text; one quote character throws inside `render()` and takes down the whole
  board paint.
- **Style convention:** this codebase writes curly apostrophes as `’` escapes inside
  JS string literals but uses literal em-dashes. A find-and-replace on a literal `'` will
  not match. Comments explain *why*, never *what* — match that.

---

## 6. Where the work stands, and what is left

**Done and pushed.** Three adversarial review rounds, each finding verified against the
code before being fixed:

- **Round 1** (5 reviewers): scored 6 / 7.5 / 7.5 / 6.5 / 4. 27 confirmed defects plus 20
  minor ones, all fixed — the stale-plan race, blind undo, a thin audit trail, applying
  while offline, no focus trapping, sub-44px phone targets, headline tiles that disagreed
  with the panels beneath them, and the inline-span bar bug.
- **Round 2** (3 reviewers; two died on a rate limit before running): 7 / 6.5 / 8.3. Two
  blockers, both in the drawer's chrome rather than its write engine, both found only by
  driving a real browser: the Close button leaving the page inert, and the drawer grid
  blowout. Plus References being dead on arrival, and the connection gate trusting
  `navigator.onLine` alone. **All fixed**, with three new regression tests.
- **Round 3** was launched and then stopped at the user's request before any reviewer
  returned. **No results exist.**

**What is left:**

1. **Re-run a review round.** Five reviewers, one per concern: data safety, code
   correctness, field usability (a site superintendent's eyes — phone, gloves, sunlight),
   visual design, and accessibility. Visual design and accessibility have had only *one*
   pass, so they are reviewing two rounds of changes at once and are the likeliest to find
   something. Give each reviewer the code, the fix list from this document, and a running
   demo, and require it to verify claims against the code rather than trusting the list.
   Findings should be adversarially refuted before being accepted — default to "not real
   unless the code proves it."
2. **The acceptance bar, in the owner's words: "Don't stop until each critic is utterly
   wowed."** That means 9+ out of 10 from all five. The best score so far is 8.3.
3. **Deployment stays held** until Austin says otherwise.

Known-open minor items nobody has fixed yet, carried from round 2 (all low severity):
the aria-live preview region may be chatty during live refresh; the room sheet repaints
while open, so focus lands on a replaced element in some paths; and activating a `.drow`
does two different things depending on the row's state (an unchecked clean row checks
instantly; a checked or flagged row opens a sheet), which is correct app parity but is not
obviously announced to a screen reader.

---

## 7. Working agreements

- Austin is the owner and reviewer. He asked for edits on the dashboard "just like the
  app" — **parity with the crew app is the design brief**, not an inspiration. When
  something is ambiguous, go read `js/app.js` and `js/screens.js` and copy what they do.
- Do not deploy. Do not push to `gh-pages`. Push to
  `claude/dashboard-editing-inventory-f69y7b`; PR #4 is live, so pushes flow straight into
  the review.
- Do not touch live production data from a test. `live-invariants.mjs` exists to catch it.
- When you fix a review finding, add the regression test with it. Two blockers on this
  branch survived a full review round purely because no test looked at an unconfigured
  first render.
