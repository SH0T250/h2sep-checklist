# H2SEP — CANONICAL ROOM TYPE CONTRACT

_Written 2026-08-07. **This file is the controlled vocabulary the database build reads.**_
_Job 24030 / project 22-014 · Home2 Suites by Hilton, Eagle Pass TX · 115 keys._

**Authority:** `room_map.md` — its "Type reconciliation" matrix (lines 30–43) and its per-floor `Type`
columns (lines 69–198). Every `room_type` string below is that file's string, character for character —
**with exactly one documented exception, room 401. See §1.2 and §4 F-2.** Nothing here was invented,
abbreviated, expanded or tidied.

**What this fixes:** `VERIFICATION_REBUILD.md` §5.2 — *"Room-type names — will the database join? **No. Not
on strings. This will break.**"* Six packages used up to eight different spellings of room 118's type, and
the whole QQ family was keyed on OV-001 **display labels** rather than `room_map` names, which returns
**zero rows for 47 QQ-family keys**.

---

## 0. THE RULE

```
room number ──► room_map.md ──► room_type  (the JOIN KEY, from §1 below)
                             └► display_label (what the app shows — NEVER a join key)
```

1. **Join on `room_type`. Never on `display_label`. Never on a section heading.**
2. **If a string is not in §1 or §2 of this file, the build must FAIL LOUDLY.** A silent zero-row join is
   the exact failure this contract exists to stop.
3. **Attributes are not type strings.** `accessible`, `connecting`, `mod`, `hearing_impaired` are per-room
   booleans. Do not concatenate them into the join key. This is the whole of the room-118 problem.
4. **Where a package section is titled by a display label** (for readability — `QQ Studio`,
   `King Studio Accessible MOD Connector`), the heading now also prints its `room_type`. Read the
   `room_type`.

---

## 1. THE 11 CANONICAL `room_type` VALUES

Counts and rooms are `room_map.md`'s, not this file's.

| # | `room_type` — **the join key** | Keys | Rooms | `display_label` shown by the app | `room_map.md` |
|---|---|---|---|---|---|
| 1 | `King Studio` | 57 | per room_map | King Studio | matrix row 1 |
| 2 | `King Studio Connecting` | 1 | 116 | King Studio Connector | matrix row 2 |
| 3 | `King Studio Acc.` | 2 | **118, 438** | King Studio Accessible *(438)* · King Studio Accessible MOD Connector *(118)* | matrix row 3 |
| 4 | `King One Bedroom` | 3 | 202, 302, 402 | King One Bedroom | matrix row 4 |
| 5 | `King One Bedroom Acc.` | 3 | 217, 317, 417 | King One Bedroom Accessible | matrix row 5 |
| 6 | `Queen-Queen` | 31 | per room_map | QQ Studio | matrix row 6 |
| 7 | `QQ Connecting` | 6 | 103, 215, 236, 336, 403, 436 | QQ Studio Connector | matrix row 7 |
| 8 | `QQ Extended` | 6 | 230, 232, 330, 332, 430, 432 | QQ Extended | matrix row 8 |
| 9 | `QQ Wide` | 2 | **201, 301** | QQ Studio *(OV-001 label)* | matrix row 9 |
| 10 | `QQ Wide Connecting` | 2 | **101, 401** | QQ Studio Connector *(OV-001 label)* | matrix row 10 · 🚩 **401 deviates — see §1.2 / §4 F-2** |
| 11 | `QQ Acc.` | 2 | 238, 338 | QQ Accessible | matrix row 11 |

**57 + 1 + 2 + 3 + 3 + 31 + 6 + 6 + 2 + 2 + 2 = 115.** ✅ The **counts** reconcile to `room_map.md` row for
row. The **strings** reconcile for 114 of 115 rooms; **room 401 is the one exception — §1.2.**

### 1.2 🚩 THE ONE EXCEPTION — room 401 does NOT match `room_map.md`'s Type column

*(Added 2026-08-07. §1 previously claimed every string matched room_map "character for character" and
"reconciles row for row". For 401 that was an overclaim. The deviation is legitimate; the claim of no
deviation was not.)*

| | String |
|---|---|
| `room_map.md:166`, 401's `Type` column | **`QQ Wide`** — with room_map's own instruction at `room_map.md:55`: *"**Do not rename 401 in this file.**"* |
| This contract, row 10, and every package | **`QQ Wide Connecting`** |

**The deviation is correct and deliberate.** It rests on the unit matrix (QQ Wide 0 / QQ Wide Connecting 1
on floor 4), on A103's own text stating 401 adjoins 403 (QQ Connector), on `room_map.md`'s own `Conn`
column carrying **Y** for 401, and above all on **`OVERRIDES.md` OV-001** — Austin, 2026-08-07: *"401
should be QQ Studio Connector, it has a connecting door"* — a user override, which outranks document
precedence. Reliability **MEDIUM**; the underlying drawing defect (A103's 401 tag is short the word
`CONNECTOR`) is still open, RFI per `OPEN_ITEMS.md` D1.

**⚙ INSTRUCTION TO THE BUILD.** Do **not** read `room_map.md`'s `Type` column literally for 401. Resolve
401 through the OV-001 mapping at resolution time:

```
room 401 : room_map Type = "QQ Wide"  ──[OV-001]──►  room_type = "QQ Wide Connecting"
                                                     display_label = "QQ Studio Connector"
```

Rooms 101 / 201 / 301 need no such step — their room_map `Type` strings already match this contract, and
OV-001 touches only their `display_label` (OV-001 is **LABEL-ONLY**). 401 is the sole room where the join
key itself differs from room_map's Type column.

🚩 **If OV-001 is ever reversed or narrowed, 401's join key reverts to `QQ Wide` and row 10 becomes a
1-key row.** Only Austin changes this. See §4 **F-2**.

### 1.1 Room 118 and room 438 — settled, and settled ONE way

**Both are `King Studio Acc.`** — `room_map.md:84` (118) and `room_map.md:198` (438) put the identical
string in the `Type` column. Checked against the task premise ("both are the same room_type for package
purposes **unless room_map.md says otherwise — check it, do not assume**"): **room_map does not say
otherwise.** They share one type.

What separates them is **attributes**, and `room_map.md` unresolved item 3 is explicit that the app must
carry them separately, because *"there is no `KS Acc Connecting` row in the matrix"*:

| Room | `room_type` | `accessible` | `mod` | `connecting` | Governing sheet | Printed label (A100 / A103, verbatim) |
|---|---|---|---|---|---|---|
| **118** | `King Studio Acc.` | `true` | `true` | `true` | A552 | `KING STUDIO ACCESSIBLE MOD CONNECTOR` |
| **438** | `King Studio Acc.` | `true` | `false` | 🚩 **FLAGGED — OPEN** | A551 | `KING STUDIO ACCESSIBLE` |

🚩 **438's `connecting` value is an OPEN conflict — `conflicts.md` B4.4 and A11. Do not set it.**
Positions on the record, both carried, neither adopted:

| Position | Source |
|---|---|
| **connector** | Drive *Special Changes* correction `RM 438 Changed to King Studio Accessible Connector.jpg`; **A100's Guestroom Matrix** `King Studio ACC, HA, CD` on floor 4 (CD = Connecting Door); A103 records 436 (QQ Connector) as adjoining 438; E400 detail 02 titled *"King Studio Acc. Conn."*; A551 tags door GR-3 with keynote 9 |
| **no connector** | **A103 prints `KING STUDIO ACCESSIBLE` and nothing else** — the same architect prints the full `KING STUDIO ACCESSIBLE MOD CONNECTOR` on 118, so he knows how to say it when he means it; **G001's matrix prints `King ACC, HA` on floor 4 with no CD** |

**"King Studio Accessible Connector" is NOT a `room_type`.** No such row exists in either unit matrix. It
was used as a type key in `room_type_packages.md` §2.3 and §2.9 and is rewritten to `King Studio Acc.`;
the connector claim it carried is now emitted as a FLAGGED attribute with both positions. **Only Austin
closes B4.4.**

---

## 2. THE 4 `bathroom_type` VALUES — 🚩 **FLAGGED: NOT SOURCED TO `room_map.md`**

⚠ **`room_map.md` names no bathroom types at all.** It is a room-number and room-type spine; it carries
zero bath configuration (its own closing section says so: *"they carry zero finishes… zero MEP"*). The
task brief asked for "the 4 bathroom types" from that file. **They are not in it, and they were not
invented here.**

What follows is therefore taken from the **next-best consistent source: `room_type_packages.md` §4**, the
master the app loads, whose four bathroom blocks are keyed by **sheet** — a stable, drawing-anchored key.
All eight packages agree on this grouping. **Reliability: MEDIUM. It has no `room_map.md` warrant.**

| `bathroom_type` — the join key | Sheet(s) | `room_type` values served | Keys |
|---|---|---|---|
| `Standard Bathroom` | **A530** / ID-5.10 | `King Studio` · `King Studio Connecting` · `Queen-Queen` · `QQ Wide` · `QQ Connecting` · `QQ Wide Connecting` · `QQ Extended` | 105 |
| `King One Bedroom Bathroom` | **A531** / ID-5.11 | `King One Bedroom` | 3 |
| `Accessible Bathroom` | **A532 + A532.1** / ID-5.12 | `King Studio Acc.` · `QQ Acc.` | 4 |
| `King One Bedroom Accessible Bathroom` | **A533** / ID-5.13 | `King One Bedroom Acc.` | 3 |

**105 + 3 + 4 + 3 = 115.** ✅

Corroboration for the `Standard Bathroom` membership list is A530's own **title block, verbatim**:
*"King Std., Std. Conn., QQ Std., Std. Conn., **QQ Wide** & QQ Ext."* — note the sheet itself names
**QQ Wide**, which is independent evidence that the Wide rooms were never meant to be dropped.

🚩 **The `Accessible Bathroom` type does not determine the fixture.** A532 draws `01 PLAN-TUB` **and**
A532.1 draws `01.1 PLAN-ROLL IN SHOWER`, and **no sheet assigns a room number to either.** Tub-vs-roll-in
on all 7 accessible keys is `conflicts.md` **A11** / **B4.4** and `coordination_issues.md` **C-01**, all
OPEN. **A `bathroom_type` join returns the accessory set for BOTH configurations. It is not a bill.**

---

## 3. ALIAS REGISTER — every non-canonical string found, and what it became

Scope, per the brief: strings used as a **section heading**, a **table key**, or an **applies_to value**.
Running prose was not rewritten, and neither was any **verbatim quotation of a drawing** (sheet titles,
detail titles, keynote text, matrix row labels) — per the standing rule, a printed string is never
normalised. Those are marked **KEPT VERBATIM** below.

**52 distinct aliases found.** All 52 are listed.

### 3.1 → `Queen-Queen`

| # | Alias found | Where it appeared (file · section) |
|---|---|---|
| 1 | `QQ Studio` | `ffe-guestroom.md` §1 table + §2.7 heading + §0 self-check · `finishes.md` §3 table · `plumbing.md` §5 table + §6B heading + §6E bath table · `mechanical.md` §1 table + §2 PTAC table + §7 ruling list · `doors-drywall.md` §1.2 + §2.3 · `electrical.md` §1 table · `room_type_packages.md` top table + §2.6 |
| 2 | `QUEEN-QUEEN (QQ STUDIO)` | `finishes.md` §4.6 heading |
| 3 | `Queen-Queen (QQ Studio)` | `finishes.md` §3 table · `room_type_packages.md` top table |
| 4 | `QUEEN-QUEEN (QQ STUDIO)` *(caps)* | `room_type_packages.md` §2.6 heading |
| 5 | `QQ` *(bare, as a table key)* | `plumbing.md` §5 · `mechanical.md` §7 |
| 6 | `QQ Std.` | **KEPT VERBATIM** — A530 / A555 title-block text quoted in `plumbing.md` §1, `finishes.md` §3 |

### 3.2 → `QQ Connecting`

| # | Alias found | Where it appeared |
|---|---|---|
| 7 | `QQ Studio Connector` | `ffe-guestroom.md` §1 + §2.8 + §0 · `finishes.md` §3 · `plumbing.md` §5 + §6B + §6E · `mechanical.md` §1 + §7 · `doors-drywall.md` §1.2 + §2.3 · `electrical.md` §1 · `room_type_packages.md` top + §2.7 |
| 8 | `QQ CONNECTING (QQ STUDIO CONNECTOR)` | `finishes.md` §4.7 heading |
| 9 | `QQ Connecting (QQ Studio Connector)` | `finishes.md` §3 table · `room_type_packages.md` top table |
| 10 | `QQ Studio Conn` | `plumbing.md` §6E bath table |
| 11 | `QQ Connector` | `mechanical.md` §7 · `room_type_packages.md` §2.7 |
| 12 | `QQ Std. Conn.` | **KEPT VERBATIM** — A555 title-block text |

### 3.3 → `QQ Wide` and `QQ Wide Connecting` — **the deletions, not renames**

These two were not misspelled. **They were removed from six packages entirely**, on the strength of the
**superseded** first version of OV-001 ("the Wide types are retired, zero rooms"). `OVERRIDES.md` narrowed
OV-001 to **LABEL-ONLY** on 2026-08-07. **Both types are live join keys and are restored.**

| # | What was found | Where | What it became |
|---|---|---|---|
| 13 | a struck-through `QQ Wide / QQ Wide Connecting` row, keys **0**, annotated *"RETIRED by OV-001. Zero rooms."* | `plumbing.md` §5 mapping table | two live rows, 2 + 2 keys, carried off `Queen-Queen` / `QQ Connecting` at ASSUMPTION (~90%) per `A555.md:39–47` |
| 14 | *(type omitted from the list; "10 types, not 11")* | `mechanical.md` §1 type table + §0 defect 4 | two live rows added; **11 types** |
| 15 | `QQ Wide / QQ Wide Connecting: ZERO rooms. Type retired by OV-001. No package emitted.` | `finishes.md` §3 | two live rows; area-scaled warning added (535 vs 480 sqft) |
| 16 | `Live room types after OV-001 — 9, not 11` | `room_type_packages.md` top table — **the master the app loads** | **11 live types**, both Wide rows restored with their rooms |
| 17 | `QQ Wide and QQ Wide Connecting are retired … 9 live room types, not 11` | `README.md` §3 overrides table — **the file that defines the join** | OV-001 rewritten as label-only; `room_type` unchanged from the drawings |
| 18 | `OV-001 (QQ Wide retired)` | `ffe-public.md` §0 | OV-001 restated as label-only |
| 19 | `Under OV-001 no room is typed QQ Wide, so this no longer blocks a room` | `OPEN_ITEMS.md` C3 | ⛔ reversed — **E103 rows 14/15 describe four real rooms and this DOES block 101 and 401** |
| 20 | `OV-001 retires the Wide types and re-packages these four as standard-width` | `OPEN_ITEMS.md` Q1 | answered in part — the four rooms **keep** the Wide geometry |
| 21 | `the Wide types are retired by OV-001` | `room_type_packages.md` §4.1 bath block | struck — **A530's own title block names QQ Wide** |
| 22 | `QQ Wide Connector 101/103` · `QQ Wide Connector 215` | `plumbing.md` §0 defect 5 | **KEPT VERBATIM** — these are `P301.md` / `P302.md`'s own defective room lists, quoted as the error they are. A100 says 101 = `QUEEN QUEEN WIDE CONNECTOR`, 103 = `QUEEN QUEEN CONNECTOR`, 215 = `QUEEN QUEEN CONNECTOR`. **Never join P301/P302's room list** |

### 3.4 → `QQ Extended`

| # | Alias found | Where it appeared |
|---|---|---|
| 23 | `QQ EXTENDED` *(caps)* | `finishes.md` §4.8 heading · `room_type_packages.md` §2.8 heading |
| 24 | `QQ Ext` / `QQ Ext.` *(as a table key)* | `plumbing.md` §6E bath table · `finishes.md` §3 |
| 25 | `QQ, QQ Ext.` | **KEPT VERBATIM** — P401/P402 plan titles 01 and 05 |

### 3.5 → `QQ Acc.`

| # | Alias found | Where it appeared |
|---|---|---|
| 26 | `QQ Accessible` | `ffe-guestroom.md` §2.10 heading · `mechanical.md` §1 + §2 + §7 |
| 27 | `QQ ACC.` *(caps)* | `finishes.md` §4.9 heading · `room_type_packages.md` §2.9 heading |
| 28 | `QQ Studio Acc.` | `electrical.md` §1 *(E400 detail title — **KEPT VERBATIM** in the detail column, removed from the key column)* · `fire-appliance.md` §2.4 prose |
| 29 | `Queen-Queen Acc.` | **KEPT VERBATIM** — P401/P402 plan title 02 |
| 30 | `Queen Queen ACC, CD` | **KEPT VERBATIM** — A100 / G001 matrix row label |

### 3.6 → `King Studio`

| # | Alias found | Where it appeared |
|---|---|---|
| 31 | `KING STUDIO` *(caps)* | `finishes.md` §4.1 heading · `room_type_packages.md` §2.1 heading |
| 32 | `King Std.` | **KEPT VERBATIM** — M401 detail 03 / A530 title-block text |

### 3.7 → `King Studio Connecting`

| # | Alias found | Where it appeared |
|---|---|---|
| 33 | `King Studio Connector` | `ffe-guestroom.md` §1 + §0 · `doors-drywall.md` §1.2 + §2.3 · `electrical.md` §1 · `mechanical.md` §1 + §2 + §7 · `room_type_packages.md` §2.2 |
| 34 | `KING STUDIO CONNECTING` *(caps)* | `finishes.md` §4.2 heading |
| 35 | `KS Connecting` | `plumbing.md` §6B heading |
| 36 | `KS Conn` | `plumbing.md` §6E bath table |
| 37 | `King Std. Conn.` | **KEPT VERBATIM** — M401 detail 03 title |

### 3.8 → `King Studio Acc.` — **room 118. Eight spellings found; the audit reported five.**

| # | Alias found | Where it appeared |
|---|---|---|
| 38 | `King Studio Accessible MOD Connector` | `ffe-guestroom.md` §2.4 heading · `mechanical.md` §1 table |
| 39 | `King Studio Acc. MOD Connector` | `doors-drywall.md` §2.3 wall table · `plumbing.md` §1 sources table |
| 40 | `King Studio Acc. MOD Conn.` | `mechanical.md` §2 PTAC table + §7 ruling list · `ffe-guestroom.md` §0 self-check |
| 41 | `King Studio Acc. **MOD** Connecting` | `doors-drywall.md` §1.2 door-tag table |
| 42 | `King Studio Acc. MOD Connecting` | `doors-drywall.md` §1.3 GR-3 room table |
| 43 | `King Studio Acc. **Mod** Connector` | `electrical.md` §1 row 3 |
| 44 | `King Studio Acc. MOD (118)` | `plumbing.md` §5 mapping table |
| 45 | `King Studio Acc. Mod.` | `plumbing.md` §3 · `room_type_packages.md` §2.3 |
| 46 | `King Studio ACC MOD, CD` | **KEPT VERBATIM** — A100 / G001 matrix row label, and E103 row 8 |
| 47 | `King Std. Acc. Mod` | **KEPT VERBATIM** — M401 detail 05 title |

### 3.9 → `King Studio Acc.` — room 438

| # | Alias found | Where it appeared |
|---|---|---|
| 48 | `King Studio Accessible` | `ffe-guestroom.md` §2.3 heading · `mechanical.md` §1 + §2 |
| 49 | `KING STUDIO ACC.` *(caps)* | `finishes.md` §4.3 heading · `room_type_packages.md` §2.3 heading |
| 50 | `King Studio Acc. (438)` | `plumbing.md` §5 · `doors-drywall.md` §2.3 · `ffe-guestroom.md` §0 |
| 51 | 🚩 `King Studio Accessible Connector` | `room_type_packages.md` §2.3 note + §2.9 note · `OPEN_ITEMS.md` D2. **Invented type — in no unit matrix. It also CLOSED `conflicts.md` B4.4.** Rewritten to `King Studio Acc.`; the connector claim re-emitted as a FLAGGED attribute carrying both positions |
| 52 | `King ACC, HA` · `King Std Acc` · `King Std. Acc.` | **KEPT VERBATIM** — G001 matrix row / P401 plan title 04 / M401 detail 04 |

### 3.10 → `King One Bedroom` and `King One Bedroom Acc.`

| Alias found | Where it appeared | → |
|---|---|---|
| `KING ONE BEDROOM` *(caps)* | `finishes.md` §4.4 · `room_type_packages.md` §2.4 | `King One Bedroom` |
| `King One Bedroom Accessible` | `ffe-guestroom.md` §2.6 · `mechanical.md` §1 + §7 | `King One Bedroom Acc.` |
| `KING ONE BEDROOM ACC.` *(caps)* | `finishes.md` §4.5 · `room_type_packages.md` §2.5 | `King One Bedroom Acc.` |
| `King One Bdr` · `King One Bdr Acc.` | **KEPT VERBATIM** — P401 plan titles 06/07, M401 details 06/07 | — |

*(These four are folded into the 52 above; they are broken out here because they are the only family with
no join-breaking variant beyond case and abbreviation.)*

---

## 4. 🚩 WHAT COULD NOT BE MAPPED WITH CONFIDENCE — flagged, not guessed

### F-1 — The four `bathroom_type` values have no `room_map.md` warrant

Covered in §2. `room_map.md` contains **zero** bathroom types. The four names in §2 come from
`room_type_packages.md` §4 and are anchored to sheets A530 / A531 / A532+A532.1 / A533. **Reliability
MEDIUM.** All eight packages agree, and A530's title block corroborates its own membership list — but the
authoritative file does not carry the vocabulary. **If Austin wants `bathroom_type` in the DB as a first-
class key, it needs a ruling, not an extraction.**

### F-2 — Room 401's `room_type` rests on OV-001, not on `room_map.md`'s Type column

`room_map.md:166` puts **`QQ Wide`** in 401's `Type` column — the sheet string — and records the delta in
its own unresolved item 1: *"Room 401 type string. Architect confirmation needed. Count-neutral,
**join-breaking**."* It says in as many words: **"Do not rename 401 in this file."**

Every package (and this contract) uses **`QQ Wide Connecting`** for 401. That is legitimate but it is
**not** sourced to room_map's Type column. It rests on:

- the **unit matrix**, which puts QQ Wide 0 / QQ Wide Connecting 1 on floor 4;
- **A103's own text**, which states 401 adjoins 403 (QQ Connector), so a connecting pair *is* drawn;
- **`OVERRIDES.md` OV-001's** resolution table, which is a **user override** — Austin, 2026-08-07:
  *"401 should be QQ Studio Connector, it has a connecting door"* — and a user override sits above all
  document precedence;
- `room_map.md`'s own `Conn` column, which carries **Y** for 401.

**Reliability: MEDIUM, and the underlying drawing defect is still open.** A103 room 401 should read
`QUEEN QUEEN WIDE CONNECTOR` and does not. **Architect confirmation still owed** — RFI, per
`OPEN_ITEMS.md` D1. If OV-001 is ever reversed, 401's join key reverts to `QQ Wide` and this row moves.

### F-3 — Room 438's `connecting` attribute: unmappable, and deliberately left unset

Covered in §1.1. The `room_type` is settled (`King Studio Acc.`, three independent sources). The
`connecting` boolean is **not**, and `conflicts.md` B4.4 / A11 are OPEN. **Left null and FLAGGED. Two
packages had closed it; both closures are now reversed.**

### F-4 — `hearing_impaired` is not derivable from any type string

Not a naming defect, but it breaks a type-based join the same way and belongs on this list.
`room_map.md` unresolved item 6: the printed type strings for the 12 hearing-accessible rooms are plain
`QUEEN QUEEN` / `KING STUDIO`, so **a room record built from the type string alone loses the HI flag
entirely.** 8 of 12 identified (209, 213, 216, 218, 309, 313, 316, 318); **floors 1 and 4 not yet
scanned**; and the two matrices disagree on the count, 12 vs 10 (`conflicts.md` **A11**).
**Carry `hearing_impaired` as a per-room boolean. Do not order 12 kits.**

---

## 5. THE BUILD CHECK

The cheapest way to prove the join is not silently dropping rows:

```
SELECT room_type, COUNT(*) FROM rooms GROUP BY room_type;
```

Must return **exactly 11 rows** summing to **115**, with the counts in §1. Any 12th value, any string not
in §1, or any total below 115 means an alias survived somewhere and the join is dropping keys.

Second check — the one that catches the OV-001 failure specifically:

```
SELECT room_no, room_type FROM rooms WHERE room_no IN (101, 201, 301, 401);
```

Must return `QQ Wide Connecting`, `QQ Wide`, `QQ Wide`, `QQ Wide Connecting`. **If it returns
`Queen-Queen` or `QQ Connecting`, the build joined on `display_label`** and those four rooms are being
priced **55 sqft short** on every area-scaled quantity (G001: 535 vs 480 sqft).

---

## 6. FILES REPAIRED 2026-08-07

| File | What changed |
|---|---|
| `room_type_packages.md` | **the master the app loads** — top type table rewritten to 11 canonical keys + display labels; all 9 §2 headings and all 4 §4 bath headings re-keyed; the §2.3 and §2.9 claims that closed `conflicts.md` B4.4 reversed to FLAGGED-both-ways |
| `README.md` | the join diagram, the "9 live matrix names" rule and the OV-001 row rewritten; pointer to this contract added |
| `finishes.md` | §3 sheet map rewritten to 11 keys; all 9 §4 headings re-keyed; the deferred "OV-001 sweep" note closed; Wide-geometry consequence corrected from *"packaged standard-width"* to *"keeps the Wide footprint"* |
| `plumbing.md` | §5 mapping table rewritten (Wide types restored as live rows); §6B heading; §6E bath-group table re-keyed by sheet; OV-001 source row and open item 7 corrected |
| `mechanical.md` | §1 type table rewritten 10 → 11 types with both Wide rows; §2 PTAC/stool table re-keyed; §7 PTAC-1/PTAC-2 ruling lists re-keyed; §0 defect 4 reversed |
| `electrical.md` | §1 mapping table given explicit `room_type` / `display_label` columns; §5.3 / §5.4 headings re-keyed; type counts corrected |
| `doors-drywall.md` | §1.2 and §1.3 room-118 keys collapsed to `King Studio Acc.` + attributes; §2.3 wall-type table re-keyed |
| `ffe-guestroom.md` | §0 row-count self-check re-keyed; §2.1 / §2.3 / §2.5 / §2.6 headings given their `room_type` |
| `ffe-public.md` | OV-001 wording corrected to label-only |
| `OPEN_ITEMS.md` | Q1, B3, C3, D1, D2 corrected — C3 in particular was reversed from "no longer blocks a room" to "blocks 101 and 401" |
| `fire-appliance.md` | **no edits needed** — its type tables were already 11-for-11 canonical, including both Wide types |
| `SAMPLE_room_sheet.md` | **no edits needed** — already uses `King Studio` and `Standard Bathroom` |

**No conflict was closed by this repair.** Two that had been wrongly closed (`conflicts.md` B4.4 on 438's
connector status, in two files) were **re-opened** and both positions restored.
