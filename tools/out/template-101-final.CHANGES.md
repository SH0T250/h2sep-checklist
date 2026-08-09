# template-101-final.json — deltas from draft (preview101/template-101.json)

Draft:  `preview101/template-101.json`  (sha256 954d1179f1de17f78e10243a48496870bada38477d884d3be15ed5d5b5b7d060)
Final:  `tools/out/template-101-final.json` (sha256 d3e159054f03a6128cfb32109f20e245c5e82cffc47ecc6b3d23a7768ac71fe8)

48 field changes across 22 of 40 items; exactly 48 lines differ (862 lines both files),
everything else byte-identical — same item ids (40), same key order, same formatting
(2-space indent, ASCII-escaped, sorted keys). No labels, categories, sort, qty, src,
reliability, derived, code, trade, notes, or top-level fields were touched.

## 1. Ruled instanceNotes (Austin's standing rulings)

| item id | field | old | new |
|---|---|---|---|
| `gr302_a` (GR-302 Vanity @ Guest Bath) | `instanceNote` | `""` | `⚑ paper sheet tags this GR-302L; DB/legend carries GR-302 — L designation stays per ruling, discrepancy documented` |
| `902_a` (902 Dishwasher) | `instanceNote` | `""` | `⚑ no submittal link — model (DDW18D1ESS 18" vs DDW2404EBSS 24") pending Austin ruling` |
| `u_ce20ab6281` (Garbage disposer, uncoded) | `instanceNote` | `""` | `⚑ no submittal link — only the E400 disposer circuit + E103 480 VA load evidence it; existence in Room 101 unresolved, resolve before ordering` |

Ruling notes:
- `gr302_a` keeps `code: "GR-302"` (DB naming + refs-101.json join); the L-vs-DB
  discrepancy lives in the note, per ruling.
- `902_a` and `u_ce20ab6281` keep `reliability: "FLAGGED"` (unchanged from draft).

## 2. Template state cleaned on every item (45 changes)

Live/paper state is carried by the migration tool; the seed template must be clean:
every item verified `checked=false`, `initials=""`, `issue=""`, `issueResolved=false`,
`checkedAt=null`, `checkedAtLocal=null`, `checkedByName=""`, `checkedByUid=""`.
The draft carried paper-import state on 19 items; the following fields were reset
(all other items already clean — `checkedAt`/`checkedAtLocal`/`checkedByName`/
`issueResolved` were already clean on every item and needed no change):

### checked true→false + checkedByUid "paper"→"" + initials "CC"→"" (13 items × 3 fields = 39 changes)
`gr100_a`, `gr101_a`, `gr200_a`, `gr201_a`, `gr204_a`, `gr205_a`, `gr300_a`,
`gr308_a`, `gr318_a`, `gr322_a`, `gr400_a`, `gr500_a`, `gr502_a`

### issue cleared (6 items, 6 changes)
| item id | old `issue` | new |
|---|---|---|
| `gr207_a` | `?` (the stray '?' called out in the ruling) | `""` |
| `gr103_a` | `IN BOX` | `""` |
| `gr208_a` | `NEED INSTALL` | `""` |
| `gr600_a` | `NEED PROPER PLACE` | `""` |
| `gr6001_a` | `NEED PROPER PLACE` | `""` |
| `gr602_a` | `NEED PROPER PLACE` | `""` |

These are field-observed live issues, not template data — they ride with the
migration tool, not the seed.

## 3. Kept byte-identical (deliberately NOT changed)

- `gr308_a.instanceNote` = `one continuous run` (draft note, kept).
- `gr322_a.instanceNote` = paper-counted-3-vs-DB-1 note (draft note, kept), `reliability: FLAGGED` kept.
- `902_a`, `gr308_a`, `gr322_a`, `u_ce20ab6281` keep `reliability: "FLAGGED"`.
- Room note `notes.n_doorlock` (`CONNECTING DOOR LOCK – NOT LOCKING`, flag issue,
  unresolved) kept as-is — the ruling's clean-state clause enumerates item fields only.
- Top-level `accessible: false` / `connecting: true` kept as-is (see validation
  findings: these two keys are not in the firestore-rules room-doc whitelist).

## 4. Validation results (report only, nothing auto-changed)

- **JSON**: parses; 40 items; id set and key order identical to draft.
- **DB (data/project.sqlite, room 101 / QQ Wide Connecting)**: all 39 coded items
  exist in `room_items` for room 101 with row-count matching template qty
  (GR-208, GR-300, GR-600, GR-600.1, GR-602, HD-12 each qty 2 = 2 DB rows; rest qty 1 = 1 row).
  Zero discrepancies. Uncoded `u_ce20ab6281` matches the single untagged
  `Garbage disposer` row (ITM-0083). No DB Appliance/Bath Accessory/FF&E tag for
  room 101 is missing from the template.
- **refs (/home/user/Claude/app/refs/refs-101.json)**: every one of the 39 template
  codes joins a refs key by exact string, including `kn 11` (with the space).
  One refs key has no template code join: `ITM-0083` — expected; it is the uncoded
  disposer `u_ce20ab6281`, referenced by item id in the refs note.
