---
name: h2sep-room-buildout
description: Build out guestroom checklists by room type for the H2SEP crew app (Home2 Suites by Hilton, Eagle Pass TX — Triun Construction & Engineering). Use whenever Austin asks to build, seed, generate, roll out or add rooms of a room type to the checklist app — "build out all the king studios", "do the QQ extended rooms", "roll this out to floor 2", "add the accessible rooms", "same thing for the one bedrooms" — or to rebuild/refresh an existing room type. Also use when he asks what room types are left, or how many rooms a type covers. Covers the whole pipeline: picking rooms from the reference database, verifying the package, applying his standing rulings, backing up, seeding Firestore, and verifying live.
---

# H2SEP room build-out — one room type at a time

## Your role

You are building the production checklists a hotel crew will actually work from.
Every room you seed shows up on a phone in someone's hand the same day. Wrong or
missing lines cost real installs, so this pipeline is verification-first: the
database proves the package, a template carries Austin's rulings, and nothing is
written until a backup exists.

Talk plainly. Lead with what shipped and what it means. Austin dictates on the
move — read through typos to intent, and confirm before anything destructive.

## Non-negotiables

1. **Back up first.** `node tools/backup_all.mjs --out <path>` before ANY write.
   Commit the backup with `checkedByName`/`checkedByUid` redacted (a raw dump
   carries real crew names and UIDs).
2. **The database is the source of truth for item lists** — `data/project.sqlite`
   in the app repo. Join on `room_type`, **never** on `display_label`
   (`data/ROOM_TYPE_CANONICAL.md` is the controlled vocabulary; several
   `room_type` values map onto one label).
2b. **The app shows AUSTIN'S names, not the DB's `display_label`.** He set the
   controlled list on 8/9 (his Drive folder names). `Queen-Queen` and `QQ Wide`
   both display as **QQ Studio**; `QQ Connecting` and `QQ Wide Connecting` as
   **QQ Studio Connector**; `King Studio Connecting` as **King Studio
   Connector**; room 118 as **King Studio Acc Mod** and room 438 as **King
   Studio Acc**. `King Studio` and `QQ Extended` keep their names. Unnamed so
   far: King One Bedroom, King One Bedroom Acc., QQ Acc.
   Because of this, select rooms with `--rooms`, not `--label`.
3. **Never touch a room that carries field work.** Create-only is the default.
   The only replace path is `--replace-if-empty`, which reads the LIVE doc and
   refuses if there is a single check-off, issue or room note.
4. **Never build a floor or type Austin did not name.** He approves type by type.
5. **Scope** (his ruling 9): FF&E families + Appliance + Bath Accessory. MEP is
   appended later with `--merge-missing`, which never clobbers a check-off.
6. **Dedupe** (his ruling 2): one line per tag with a ×qty badge, not repeated rows.

## The pipeline

Run from the **public app repo** checkout (`h2sep-checklist`) — the tools read
`../js/config.js` and `../data/project.sqlite` relative to `tools/`.

### 1. Scope the type — say the numbers back before building

```bash
python3 - <<'PY'
import sqlite3
c = sqlite3.connect('data/project.sqlite')
for r in c.execute("select room_type, display_label, count(*), group_concat(room_no) "
                   "from rooms group by room_type, display_label order by room_type"):
    print(f'{r[0]:24} | label {r[1]:22} | n={r[2]:>3} | {r[3]}')
PY
```

Austin names rooms by what the app SHOWS (the display label). Confirm the room
list and floor spread with him in one line before writing anything — e.g.
"QQ Studio Connector = 8 rooms: 101, 103 (F1), 215, 236 (F2), 336 (F3), 401,
403, 436 (F4)." If a label maps to more than one `room_type`, say so.

### 2. Confirm the package is really identical

A type only shares a template if the tag multisets match. Check before assuming:

```bash
python3 - <<'PY'
import sqlite3
c = sqlite3.connect('data/project.sqlite')
CATS = ('FF&E - Casegoods','FF&E - Bedding','FF&E - Seating','FF&E - Lighting',
        'FF&E - Window','FF&E - Art / Mirror','FF&E - Misc','Appliance','Bath Accessory')
q = ('select tag, count(*) from room_items where room_no=? and category in (%s) '
     'group by tag order by tag' % ','.join('?'*len(CATS)))
ROOMS = ['101','103','215']            # <- the type's rooms
base = dict(c.execute(q, (ROOMS[0],)+CATS))
for rm in ROOMS[1:]:
    s = dict(c.execute(q, (rm,)+CATS))
    print(rm, 'IDENTICAL' if s == base else f'DIFFERS {set(base)^set(s)}')
PY
```

If a room differs, it needs its own reviewed template — do not inherit.

**Matching tag sets are NOT enough.** `build_room_type.py` also compares LABELS,
and that is what caught QQ Studio vs QQ Studio Connector: identical tags, but
room 105's GR-308 label records a spec-vs-plan discrepancy that room 101's does
not. Trust the tool's hard failure over an eyeball diff — generate each type from
its own basis room and let the builder prove it.

Package sizes seen so far: QQ family **40** lines · King Studio / Connector **41** ·
King Studio Acc Mod **43**. Never clone one type's template onto another.

### 2b. Generate the type's template, then apply the rulings

```bash
python3 tools/make_template.py --room 104 --type king-studio \
  --label "King Studio" --out tools/out/template-king-studio.draft.json
# add the type to the RULINGS table in tools/apply_rulings.py, then:
python3 tools/apply_rulings.py            # writes tools/out/template-<slug>.json
```

`make_template.py` collapses the DB's per-instance rows onto one line carrying a
×qty badge (ruling 2) and forces clean state. `apply_rulings.py` is the ONLY
place a template deviates from raw database content, so the delta is always one
readable table — and a ruling that targets a line the template does not carry is
a hard failure, never a silent no-op. Keep the `.draft.json` next to the final so
every ruling stays a visible diff.

### 3. Get an approved template for the type

The template is a room doc whose items are clean (nothing checked) and which
carries Austin's rulings for that type. `tools/out/template-101-final.json` is
the QQ Studio Connector one; it documents the pattern:

- ruled discrepancies recorded in `instanceNote` (e.g. the GR-302L note)
- unresolved items `reliability: "FLAGGED"` with an honest note, never a guess
- every item clean: `checked:false`, `initials:''`, `issue:''`, timestamps null

For a NEW type, generate a draft, apply whatever rulings Austin has given for
it, and **show him the line list before seeding**. `tools/out/template-101-final.CHANGES.md`
is the model for documenting every delta from the raw generation.

### 4. Build the room docs (verifies against the DB, fails loudly)

```bash
python3 tools/build_room_type.py --label "QQ Studio Connector" \
  --template tools/out/template-101-final.json --skip 101
# or: --rooms 103,215,236,336,401,403,436
```

It regenerates each room from the database, proves the package matches the
template line for line (tag set, quantities, labels, categories) and only then
emits `tools/out/room-<no>.build.json` carrying the template's ruled content
under that room's own number and floor. Any drift is a hard stop naming the
room and the field.

### 5. Seed

```bash
# brand-new rooms — create-only, physically cannot touch an existing doc
node tools/seed_rooms.mjs tools/out/room-215.build.json tools/out/room-236.build.json ...

# a room that exists but has NO field work (stale package / soft-deleted)
node tools/seed_rooms.mjs --replace-if-empty tools/out/room-103.build.json

# adding a later trade to rooms already in use
node tools/seed_rooms.mjs --merge-missing tools/out/room-215.build.json
```

Each room read-back verifies its own item count before the tool exits non-zero
on any failure.

### 6. Verify live, then report

Read the rooms back over REST and print items / checked / qty2 / flagged /
deleted / typeLabel per room. Confirm previously-built rooms still show their
check-offs — that is the proof nothing was clobbered.

Then check the app: the floor screens should show the new rooms, and the
dashboard should reflect the new totals. No deploy is needed for data-only
work (the app reads Firestore live) — deploy only if app code changed.

## Gotchas that have bitten this project

- **`--ffe` on `gen_rooms.py` is NOT Austin's scope** — it filters `FF&E%` only
  and drops Appliances and Bath Accessories. Use `build_room_type.py`, which
  applies the correct nine categories.
- **Item ids are room-independent.** Tagged ids come from the tag
  (`gr300_a`), untagged ids hash `category|description|note|ordinal` — no room
  number. That is what makes one template safe across sibling rooms, and what
  makes a later `--merge-missing` line up instead of duplicating.
- **The rules whitelist room top-level keys**: `number, floor, type, typeLabel,
  items, notes, deleted, schemaV, createdAt, updatedAt`. `accessible` and
  `connecting` stay in the artifact but are stripped in transport.
- **Room 438 is a King Studio Accessible CONNECTOR** per CB's 7/31 direction
  even though the DB says `connecting=0` — override its typeLabel at build.
- **Submittals match on file CONTENT, never on the Drive folder name.** A folder
  named for a room area can hold another trade's cutsheets entirely — that is
  how a faucet cutsheet once landed on a vanity casegood.
- **Two sessions have worked these repos at once.** `git fetch` and merge before
  pushing.
- **Austin does not want line lists shown before seeding** (his ruling, 8/9).
  Generate, seed, and flag anything questionable IN THE APP. That raises the bar
  on flags: a FLAGGED line must say what is unknown and what would settle it.
- **Firestore backups carry real crew names and UIDs** in the activity log — they
  are gitignored in the app repo. Never commit one unredacted.
- **Mutually exclusive lines are a real hazard.** Room 118 carries both the tub
  (HD-05) and roll-in-shower (HD-14/HD-5.1) configurations; shipping both without
  saying so invites a tub rod going into a roll-in shower. Flag both sides.

## The 3D exhibit

A room only gets the 🧊 button once its OWN geometry exists in `ROOM_GEOM`
(`tests/build-room3d.mjs`, then rebuild `room-3d.html` and bump `MODEL_CACHE` in
`sw.js`). `ROOM_GEOM` carries width, depth, handedness and whether the room has a
GR-3 connecting door — a non-connecting room gets a solid demising wall, never a
door drawn into it.

Built: the whole QQ family (Studio, Studio Connector, Wide, Extended) off **A555**.
**Not built: the King family** — A550 gives King Studio a 29'-0" clear depth against
the QQ's 36'-5", plus one king bed and its own working wall, so it needs its own
geometry rather than a relabelled QQ shell. The enlarged plans are all in Drive as
markdown extracts (A550 King · A551/A552 King Acc · A553/A554 One Bedroom ·
A555 QQ · A556 QQ Acc · A530 shared bathroom) — read the real dimensions, never
estimate them. Run `tests/geom-check.mjs` after any geometry change.

## Room types still to build

Check live before quoting these — 115 keys total; **30 rooms are live and floor 1
is complete**. Remaining: `King Studio` (51 more) · `Queen-Queen` (25 more) ·
`King One Bedroom` (3) · `King One Bedroom Acc.` (3) · `QQ Acc.` (2) ·
`King Studio Acc.` (1 more — room 438). Built: QQ Studio Connector 8 · King Studio 6 ·
QQ Studio 6 · QQ Extended 6 · QQ Wide 2 · King Studio Connector 1 · King Studio Acc Mod 1.
