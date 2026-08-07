# H2SEP Room Reference App — Handoff

Self-contained brief for building the app. Everything here is settled; nothing needs re-deriving.

**Project:** Home2 Suites by Hilton, Eagle Pass TX. 115 keys, 4 stories. Triun job 24030 / MWT 22-014.
**PM:** Austin Jones, Triun Construction & Engineering. Job is in interior finish-out toward TCO.
**Data root:** `C:\Users\Austin\Downloads\H2SEP_AI_Context\`

---

## 1. What the app does

Answers **"what is in room 214?"** across 21 categories — finishes, FF&E, MEP, doors, fire, appliances — for every guestroom and public space.

The target output is a one-page per-room sheet. Austin's existing hand-built version, room 101, is the format of record:

```
ROOM #101
QQ STUDIO Connector

GR-400  Window Treatment                    [CC]
GR-202  Nightstand Sconce - NEED INSTALL    [ ]
GR-319  Nightstand @ R                      [CC]
GR-300  Queen Headboard                     [CC]     <-- appears TWICE: two queen beds
GR-600  Q Mattress - NEED PROPER PLACE      [ ]
...
* CONNECTING DOOR LOCK - NOT LOCKING
```

**Quantity is expressed as repeated rows, not a qty column.** A QQ room lists `GR-300` twice with `instance_note` distinguishing them ("bed 1 of 2"). Do not collapse.

This build is the **static reference layer** — what *should* be in each room. Status / Date Completed / Verified By columns exist in the schema but stay empty. Live tracking is a later phase.

---

## 2. The data model — the one insight that makes this small

**The MEP sets are drawn as TYPICALS, not per-room.** Plumbing draws 7 unit types. Mechanical draws 7. Electrical draws 6 templates. FF&E draws 11 room types. Nobody drew room 214 individually.

So the spine is:

```
room number → room type → typical package per discipline → explode to 115 rooms
```

You do not index 115 rooms. You index ~11 room types plus the genuinely unique public spaces, then explode across the room map. That is what `room_items` is.

---

## 3. Schema

```sql
rooms(room_no PK, floor, room_type, display_label, accessible, connecting,
      source_sheet, reliability)
spaces(space_no PK, floor, name, source_sheet)
room_types(type_name PK, key_count, room_sheet, bath_sheet)
items(item_id PK, applies_to, applies_to_kind, category, tag, description,
      instance_note, trade_responsible, count, source_sheet, reliability, supersedes)
room_items(room_no, display_label, room_type, item_id, category, tag, description,
           instance_note, trade_responsible, source_sheet, reliability, derived)
overrides(override_id, scope, original_value, new_value, reversible, rationale)
conflicts(conflict_id, topic, positions, status, source)
placeholders(topic, what_is_missing, why, suggested_sheet)
sheets(sheet_id, title, discipline, rev, sheet_date)
```

Primary query:

```sql
SELECT * FROM room_items WHERE room_no = '214' ORDER BY category;
```

**Expect ~35–50 rows per room. 4,841 item rows total across 115 keys.**

---

## 4. THREE RULES THE UI MUST GET RIGHT

### 4.1 Join on `room_type`, never `display_label`

Four rooms differ:

| room_no | display_label | room_type |
|---|---|---|
| 101 | QQ Studio Connector | `QQ Wide Connecting` |
| 201 | QQ Studio | `QQ Wide` |
| 301 | QQ Studio | `QQ Wide` |
| 401 | QQ Studio Connector | `QQ Wide Connecting` |

This is override **OV-001**, narrowed to label-only. Austin wants the QQ Studio naming; the rooms are physically **14 inches wider** (A555: one plan, alternate dimension strings — `13'-10" @QQ WIDE` vs `12'-8"`; G001: 535 sqft vs 480).

Item counts are identical to a standard QQ — drawn once. **Area-scaled quantities are not.** Join on `display_label` and four rooms price 55 sqft short on carpet, paint, wallcovering and base.

⚠ **Room 401 special case:** `room_map.md:166` prints `QQ Wide` in its Type column, but 401 **is** a connecting unit (Austin's ruling — it has a connecting door; A103 omits the word CONNECTOR from its label, a known drawing defect). Resolve 401 to `QQ Wide Connecting`. Otherwise it loses its GR-3 connecting door leaf and takes standard-QQ finishes.

### 4.2 `reliability` must be visible

Four values: `HIGH` (vector text / schedule) · `MEDIUM` (vision or single source) · `LOW` (scaled / inferred) · `FLAGGED`.

**`FLAGGED` means two sources disagree and nobody has ruled.** Those rows need to look different.

The seven accessible keys (118, 217, 238, 317, 338, 417, 438) each carry **two bathing-fixture rows** — a tub position and a roll-in shower position. **That is correct. Do not dedupe.** The code tables (G100.2, A100, G001) say 5 tubs + 2 roll-ins; the four enlarged accessible plans draw roll-ins on all seven; and the two matrices disagree with each other on 238, 338 and 438. `conflicts.md` A11 says verbatim: *"Do not order the 438 bath package off either matrix."*

Design a two-position display for FLAGGED rows. This pattern recurs.

### 4.3 `derived=1` must be distinguishable

Every room-level FF&E row is **inherited from a room-type package**, not observed in that specific room. The FF&E Installation List — the only real per-room source — was excluded as stale (override OV-002). Users should see that before they order.

---

## 5. Where the data is

| File | What |
|---|---|
| `db/project.sqlite` | the database (see §8 for status) |
| `db/SCHEMA.md` | tables + worked queries |
| `room_map.md` | **authoritative** room→type spine, 115 keys + 64 spaces |
| `packages/ROOM_TYPE_CANONICAL.md` | the join contract, 11 canonical type names, 52 registered aliases |
| `packages/room_type_packages.md` | the master item table |
| `packages/*.md` | per-discipline packages |
| `conflicts.md` | open conflicts — what FLAGGED rows point at |
| `OVERRIDES.md` | Austin's rulings, each reversible, original values preserved |
| `drawings/` | 238 per-sheet analyses |
| `drawings_split/` | single-sheet PDFs + 2576px renders + vector JSON |
| `RFI_register.md` | 12 draft RFIs |
| `VERIFICATION.md`, `VERIFICATION_REBUILD.md` | what was checked and what was found |

**Build fixtures from `room_map.md` + `packages/room_type_packages.md` today.** Put them behind one data adapter; swap to sqlite when it lands and nothing else changes.

---

## 6. The 21 categories

Drywall · Paint · Wall Covering · Flooring · Stone / Surround · Doors · Electrical · Mechanical · Plumbing · Bath Accessory · Appliance · Fire Sprinkler · Fire Alarm · Low Voltage · FF&E - Lighting · FF&E - Seating · FF&E - Casegoods · FF&E - Bedding · FF&E - Window · FF&E - Art / Mirror · FF&E - Misc.

## 7. The 11 room types (total 115)

`King Studio` 57 · `King Studio Connecting` 1 · `King Studio Acc.` 2 · `King One Bedroom` 3 · `King One Bedroom Acc.` 3 · `Queen-Queen` 31 · `QQ Connecting` 6 · `QQ Extended` 6 · `QQ Wide` 2 · `QQ Wide Connecting` 2 · `QQ Acc.` 2

Floors: 16 / 33 / 33 / 33. Seven accessible keys. Bathroom types: standard (ID-5.10), King 1BR (ID-5.11), accessible (ID-5.12), King 1BR accessible (ID-5.13).

**Room 118** is King Studio Accessible **MOD** Connector; **438** is King Studio Accessible, **no Mod**. Both share `room_type = King Studio Acc.` with mod/connecting as per-room booleans. Eight different spellings of 118 were found and collapsed.

---

## 8. Status when this was written

- ✅ 238 of 238 sheets analysed · room map built and independently re-derived · 4,841 item rows · 53/53 door marks · join keys normalised (52 aliases) · four verification rounds
- ⏳ `db/project.sqlite` was still building. **Check whether it exists before assuming.** If absent, build fixtures from the markdown per §5.

---

## 9. Things that are legitimately empty — not bugs

- **Room 118 has no plumbing unit plan.** The one accessible unit whose rough-in differs, and plumbing never drew it (`coordination_issues.md` C-02). 118 still gets common-core rows.
- **Sprinkler coverage is presence-only on 27 keys** — no head count.
- **No Structural (52 sheets), Fire Protection (7), Civil or Landscape** — not in the six source PDFs.
- **No quantities anywhere.** This is not a takeoff. Counts of fixtures, linear feet and square footage need a separate takeoff run.
- **Most FF&E tags have no manufacturer or model.** Those live in the Hilton spec books, not the drawings.
- **GR-325, GR-326, GR-905, GR-308R** have no resolution path in the current source set.

---

## 10. Traps that will bite an importer

1. **Hidden duplicate room tags.** Sheets A101, A102, A103 each carry two text objects at identical coordinates — the visible number (222/322/422) and an **invisible** one (213/313/413) masked behind a wipeout. Coordinates `x=588.2, y=1247.8`. Anything reading the PDF text layer without a visibility check emits those twice per floor and can type a Queen Queen as a King Studio. **Use `room_map.md`. Never re-scrape the plans.**
2. **A100 carries 20 door tags whose numbers collide with room numbers.** Naive extraction counts them as rooms. Also `241/341/441` is Stair 2, not the ice machine (`239/339/439` is).
3. **Type strings vary by floor.** `QUEEN QUEEN EXT.` with a period on A101, without on A102/A103. `HOUSEKEEPING` one word on A100, `HOUSE KEEPING` two words on upper floors. Use the canonical vocabulary, not the printed strings.

---

---

## 11. Open questions

Several values are contested between drawings and are carried as `FLAGGED` rows in the database
(`conflicts` table, 45 entries). The app must display both positions and must not resolve them.

Commercial and contract-administration items — contractor of record, team directory, owner details —
are deliberately **not** in this repository. They live in the project context set outside version
control. Ask Austin.
