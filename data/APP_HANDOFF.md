# H2SEP Room Reference — Handoff

**Status: the database is built, verified, and pushed.** Everything below is settled; nothing needs re-deriving.

- **Repo:** `SH0T250/h2sep-checklist` · branch `claude/hotel-checklist-app-gqtitq` · **[PR #1](https://github.com/SH0T250/h2sep-checklist/pull/1)**
- **Database:** `data/project.sqlite` (5.2 MB)
- **Full context set (not in git):** `C:\Users\Austin\Downloads\H2SEP_AI_Context\`
- **Project:** Home2 Suites by Hilton, Eagle Pass TX · 115 keys · 4 stories · Triun job 24030 / MWT 22-014

---

## 1. Start here

```sql
SELECT * FROM room_items WHERE room_no = '214' ORDER BY category;
```

That is the whole app in one query. Verified output:

| Room | Displays as | Joins as | Rows |
|---|---|---|---|
| 214 | King Studio | `King Studio` | **151** |
| 438 | King Studio Acc. | `King Studio Acc.` | **156** |
| 101 | QQ Studio Connector | `QQ Wide Connecting` | **152** |

**17,635 room_items rows** across 115 rooms. Roughly 35–50 per room.

Sample of what room 214 actually returns:

```
-- Appliance
   901     Refrigerator - Danby DFF101B1BSSDB, 10.1 cu ft          HIGH
   903     Television                                              HIGH
   kn 11   Over-the-range microwave - Danby DOM16A2SSDB            HIGH

-- Bath Accessory
   HD-12   Robe / Coat Hook                    HIGH   · hook 1 of 2
   HD-12   Robe / Coat Hook                    HIGH   · hook 2 of 2
   HD-22   Towel Bar 24"                       HIGH

-- Doors
   GR-1    Guestroom entry door - D2, SGL, 3'-0" x 6'-8" x 1-3/4"  HIGH
```

Note `HD-12` appearing twice. **Quantity is repeated rows, not a qty column.** A QQ room lists `GR-300` twice because it has two queen beds. `instance_note` distinguishes them. Never collapse.

### Room sheets run as long as they need to — do not force one page

A King Studio returns **151 rows**, an accessible key **156**. Austin's original hand-built room 101 sheet fit on one page because it covered **FF&E only**. This dataset covers **all 21 categories** — drywall, paint, wallcovering, flooring, stone, doors, electrical, mechanical, plumbing, bath accessories, appliances, fire sprinkler, fire alarm, low voltage, and six FF&E families.

**Design for multi-page / continuous scroll.** Concretely:

- **Screen:** one continuous scroll, grouped by category, with sticky category headers. Crew work one trade at a time — a category filter or jump-nav matters more than pagination.
- **Print / PDF:** let it flow across pages. Repeat the room header (`ROOM #214 · King Studio · Floor 2`) and the category header on each page break. Expect **3–5 pages** for a typical guestroom.
- **Do not truncate, paginate to a fixed count, or hide categories behind "show more"** as a default. A missing line on a punch sheet is an item nobody checks.
- A per-trade view (`WHERE category = 'Plumbing'`) is the right way to make it short — filter the scope, never the rows inside it.

Row counts to design against:

| Room type | Approx rows |
|---|---|
| King Studio (214) | 151 |
| King Studio Acc. (438) | 156 |
| QQ Studio Connector (101) | 152 |
| Range across all 115 | ~35 minimum, ~156 maximum |

---

## 2. Schema

```sql
rooms(room_no PK, floor, room_type, display_label, accessible, connecting,
      source_sheet, primary_sheet, reliability, note)          -- 115
spaces(space_no PK, floor, name, source_sheet)                 --  66
room_types(type_name PK, key_count, room_sheet, bath_sheet)    --  11
items(item_id PK, applies_to, applies_to_kind, category, tag,
      description, instance_note, trade_responsible, count,
      source_sheet, reliability, supersedes, note)             -- 1,606
room_items(room_no, display_label, room_type, item_id, category,
           tag, description, instance_note, trade_responsible,
           source_sheet, reliability, derived)                 -- 17,635
space_items(...)                                               --   875
sheets(sheet_id, title, discipline, rev, sheet_date)           --   238
conflicts(conflict_id, topic, positions, status, source)       --    45
overrides(override_id, scope, original_value, new_value, ...)  --     3
placeholders(topic, what_is_missing, why, suggested_sheet)     --    51
```

### Row counts by category (all 115 rooms)

```
Electrical 2,918 · Plumbing 2,552 · Mechanical 2,306 · Paint 1,125
Flooring 977 · Bath Accessory 962 · FF&E-Casegoods 871 · FF&E-Lighting 847
Appliance 814 · Drywall 804 · Low Voltage 696 · FF&E-Bedding 488
FF&E-Window 452 · FF&E-Seating 355 · FF&E-Art/Mirror 350 · Fire Sprinkler 264
Doors 256 · Wall Covering 238 · Stone/Surround 236 · Fire Alarm 121 · FF&E-Misc 3
```

### Reliability distribution

```
HIGH 14,298  ·  FLAGGED 1,946  ·  MEDIUM 1,391
```

---

## 3. THREE RULES THE UI MUST HONOUR

### 3.1 Join on `room_type`, never `display_label`

```sql
-- RIGHT
JOIN items ON items.applies_to = rooms.room_type
-- WRONG — four rooms silently price 55 sqft short
JOIN items ON items.applies_to = rooms.display_label
```

| room_no | display_label | room_type |
|---|---|---|
| 101 | QQ Studio Connector | `QQ Wide Connecting` |
| 201 | QQ Studio | `QQ Wide` |
| 301 | QQ Studio | `QQ Wide` |
| 401 | QQ Studio Connector | `QQ Wide Connecting` |

Austin wants the *QQ Studio* naming (override **OV-001**, label-only). The rooms are physically **14 inches wider** — A555 draws one plan with alternate dimension strings (`13'-10" @QQ WIDE` vs `12'-8"`), and G001 prints **535 sqft vs 480**.

Item counts are identical to a standard QQ — drawn once. Area-scaled quantities are not. Verify with:

```sql
SELECT room_no, display_label, room_type FROM rooms WHERE display_label <> room_type;
-- must return exactly 4 rows
```

### 3.2 `FLAGGED` is not an error state — render both positions

Four values: `HIGH` (vector text / schedule) · `MEDIUM` (vision or single source) · `LOW` (scaled) · `FLAGGED`.

**`FLAGGED` means two sources disagree and nobody has ruled.**

The clearest case: all **7 accessible keys** (118, 217, 238, 317, 338, 417, 438) carry two mutually exclusive bathing configurations, labelled in the description itself:

```
BT-1        CONFIGURATION A (TUB) - Bathtub, guestroom ADA        FLAGGED
HD-05       CONFIGURATION A (TUB) - Shower rod, BOWED             FLAGGED
SH-1 / SH-3 CONFIGURATION B (ROLL-IN SHOWER) - Roll-in shower     FLAGGED
HD-14       CONFIGURATION B (ROLL-IN SHOWER) - Folding seat       FLAGGED
SS-01       Surround - SHOWER *or* TUB, NOT DETERMINED            FLAGGED
```

Why it is open: the code tables (G100.2, A100, G001) provide **5 tubs + 2 roll-ins**, but the four enlarged accessible plans draw roll-ins covering **all seven** keys — and **the two matrices contradict each other in opposite directions** on 238, 338 and 438. A100 says 438 = tub; G001 says 438 = shower. `conflicts.md` A11 states verbatim: *"Do not order the 438 bath package off either matrix."*

**Design a two-position display for these. Do not dedupe, do not pick a winner.** Join `conflicts` on the cited id to explain why.

### 3.3 `derived=1` means inherited, not observed

Every room-level FF&E row comes from a room-type package, not from that specific room. The FF&E Installation List — the only real per-room source — was excluded as stale (override **OV-002**). Show the distinction before anyone orders.

---

## 4. The data model, in one line

**The MEP sets are drawn as typicals, not per-room.** Plumbing draws 7 unit types, mechanical 7, electrical 6 templates, FF&E 11 room types. Nobody drew room 214 individually.

```
room number → room type → typical package → explode to 115 rooms
```

`room_items` is that explosion. It is why the whole project is ~1,600 items rather than 17,635 hand-entered ones.

---

## 5. Room types (115 total)

`King Studio` 57 · `King Studio Connecting` 1 · `King Studio Acc.` 2 · `King One Bedroom` 3 · `King One Bedroom Acc.` 3 · `Queen-Queen` 31 · `QQ Connecting` 6 · `QQ Extended` 6 · `QQ Wide` 2 · `QQ Wide Connecting` 2 · `QQ Acc.` 2

Floors 16 / 33 / 33 / 33. Seven accessible keys.

**Room 118** is King Studio Accessible **MOD** Connector; **438** is King Studio Accessible, **no Mod**. Both share `room_type = King Studio Acc.`, with mod/connecting as per-room booleans. Eight spellings of 118 were found across the packages and collapsed to one.

---

## 6. Legitimately empty — not bugs to chase

- **Room 118 has no plumbing unit plan.** The one accessible unit whose rough-in differs, and plumbing never drew it. 118 still receives common-core rows.
- **Sprinkler coverage is presence-only on 27 keys** — no head count.
- **No Structural (52 sheets), Fire Protection (7), Civil or Landscape** — not in the six source PDFs.
- **No quantities.** This is not a takeoff. Fixture counts, linear feet and square footage need a separate run.
- **Most FF&E tags have no manufacturer or model** — those live in the Hilton spec books.
- **`GR-325`, `GR-326`, `GR-905`, `GR-308R`** have no resolution path in the current source set.

---

## 7. Traps that will bite an importer

1. **Hidden duplicate room tags.** Sheets A101, A102, A103 each carry two text objects at identical coordinates — the visible number (222/322/422) and an **invisible** one (213/313/413) masked behind a wipeout, at `x=588.2, y=1247.8`. Anything reading the PDF text layer without a visibility check emits those twice per floor and can type a Queen-Queen as a King Studio. **Use the `rooms` table. Never re-scrape the plans.**
2. **A100 carries 20 door tags whose numbers collide with room numbers.** Naive extraction counts them as rooms. `241/341/441` is Stair 2, not the ice machine (`239/339/439` is).
3. **Printed type strings vary by floor.** `QUEEN QUEEN EXT.` with a period on A101, without on A102/A103. `HOUSEKEEPING` one word on A100, `HOUSE KEEPING` on upper floors. Use `room_types.type_name`, never the printed string.

---

## 8. How this was built, and how far to trust it

238 per-sheet analyses → 7 per-discipline room-type packages → explosion across the room map.

**Four adversarial verification rounds.** Round 1 caught 115 missing vanity sconces, bathtubs specified where the plans draw roll-in showers, and carpet in a commercial laundry. Round 2 found ~108 phantom electrical outlets and 43 of 53 missing door marks. Round 3 fixed those and normalised 52 room-type aliases. Round 4 closed the last conflict-closure and struck a fabricated corroboration.

The room map was **independently re-derived by a second pass that was not allowed to see the first**. Both agreed: 115 keys, 16/33/33/33.

Build-time sanity checks, all passing: 115 rooms · floors 16/33/33/33 · 7 accessible · exactly 4 rooms where label ≠ type · zero orphan joins.

**What this does not mean:** 100% coverage is not 100% correctness. Verification found and fixed genuine fabrications. `FLAGGED` rows are exactly the places where the source documents disagree and nobody has adjudicated. Treat them as questions, not answers.

---

## 9. Not in the repo, deliberately

Commercial and contract-administration material stays out, consistent with the README's *"no checklist data lives in this repository"* posture:

- Contractor of record (two documents name a different GC than the firm working the job)
- Team directory, phone numbers, owner email and address
- Owner name spelling discrepancy on franchise and loan paperwork
- Drawing defects attributed to named firms
- Parking count, building height, accessibility code basis

6 conflict rows carrying personal data were stripped from the pushed database; **45 app-relevant conflicts remain, verified 0 PII rows across all tables.**

Full record lives at `C:\Users\Austin\Downloads\H2SEP_AI_Context\` — `conflicts.md`, `OVERRIDES.md`, `RFI_register.md`, `VERIFICATION*.md`. Sync it to Drive; do not commit it.

---

## 10. Open items only Austin can close

Several values are contested between drawings and are carried as `FLAGGED` rows (`conflicts`
table, 45 entries). The app must display both positions and must not resolve them. The largest is
tub-vs-roll-in on the 7 accessible keys.

Commercial and contract-administration items are deliberately **not** in this repository — see §9.
Ask Austin.

---

## 11. If you need to rebuild

```
db/parts/*.json          intermediate extractions
db/structured.json       the merged source of truth
db/SCHEMA.md             table and column reference
packages/*.md            per-discipline item data
room_map.md              the spine — regenerate nothing without it
```

`ROOM_TYPE_CANONICAL.md` is the contract between the packages and the database. If a package renames a type, update that file first or the join silently returns nothing.
