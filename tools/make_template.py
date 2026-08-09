#!/usr/bin/env python3
"""make_template.py — draft a seed template for a room TYPE from the database.

`build_room_type.py` needs an approved template per type: a clean room doc whose
items are deduped the way ruling 2 renders them (one line per tag carrying a
x-qty badge) and which carries Austin's standing rulings for that type.

Room 101's template was hand-built. This script does the mechanical half for
every type after it, so the only manual work left is the rulings:

  1. Generate the room straight from data/project.sqlite, scoped to Austin's
     categories (FF&E families + Appliance + Bath Accessory).
  2. Collapse duplicate instance rows (gr300_a + gr300_b) onto ONE line with
     qty = the row count, keeping the first id in sorted order so the id stays
     deterministic and matches how template-101-final.json was built.
  3. Force clean state on every item -- a template must never seed a check-off.
  4. Stamp Austin's display label (his folder names), never the DB's.

The output is a DRAFT. Rulings are applied afterwards by rulings.py so that
every deviation from raw database content is written down in one place.

Usage:
    python3 tools/make_template.py --room 104 \
        --type king-studio --label "King Studio" \
        --out tools/out/template-king-studio.json
"""

import argparse
import json
import os
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gen_rooms  # noqa: E402  (same directory, deliberate)
from build_room_type import SCOPE_CATEGORIES, DB_PATH  # noqa: E402

# Every field a template item carries, in the order template-101-final.json
# uses. Kept explicit so a stray key from gen_rooms can never ride into a seed.
ITEM_FIELDS = (
    "category", "checked", "checkedAt", "checkedAtLocal", "checkedByName",
    "checkedByUid", "code", "deleted", "derived", "initials", "instanceNote",
    "issue", "issueResolved", "label", "qty", "reliability", "sort", "src",
    "trade",
)

CLEAN = {
    "checked": False, "checkedAt": None, "checkedAtLocal": None,
    "checkedByName": "", "checkedByUid": "", "initials": "",
    "issue": "", "issueResolved": False, "deleted": False,
}


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--room", required=True, help="basis room number for the type")
    ap.add_argument("--type", required=True, help="machine slug, e.g. king-studio")
    ap.add_argument("--label", required=True, help="Austin's display label")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    cx = sqlite3.connect(DB_PATH)
    cx.row_factory = sqlite3.Row
    raw = gen_rooms.build_room(cx, a.room)

    scoped = {i: it for i, it in raw["items"].items()
              if it.get("category") in SCOPE_CATEGORIES}

    # Collapse instance rows onto one line per code. Untagged rows key off their
    # id, which already hashes category|description|note|ordinal, so they are
    # unique by construction and never collapse with anything else.
    groups = {}
    for iid in sorted(scoped):
        it = scoped[iid]
        key = it.get("code") or ("#" + iid)
        groups.setdefault(key, []).append(iid)

    items = {}
    for key, ids in groups.items():
        keep = ids[0]                       # first sorted id wins, deterministically
        it = dict(scoped[keep])
        it["qty"] = len(ids)
        it.update(CLEAN)
        it.setdefault("instanceNote", "")
        # gen_rooms disambiguates sibling rows with per-INSTANCE notes ("bed 1
        # of 2", "hook 1 of 2"). Once the rows collapse onto one line the x-qty
        # badge carries the count, and keeping the first row's note would make
        # a line reading "x2" also claim to be "1 of 2". Drop it -- this is
        # exactly what template-101-final.json does.
        if it["qty"] > 1:
            it["instanceNote"] = ""
        items[keep] = {f: it.get(f) for f in ITEM_FIELDS}

    # Carry the DATABASE'S OWN REASON for a downgraded reliability. gen_rooms
    # selects `instance_note` (the per-instance disambiguator) but not `note`,
    # which is where the evidence lives -- so a line arrived graded FLAGGED or
    # MEDIUM with nothing on screen explaining why. A crew member seeing
    # "VERIFY - sources disagree" with no text cannot act on it, which is worse
    # than no flag at all. The reason is already recorded; surface it.
    reasons, sheets = {}, {}
    for tag, desc, note, rel, sheet in cx.execute(
            "SELECT tag, description, note, reliability, source_sheet FROM room_items"
            " WHERE room_no = ?", (a.room,)):
        if rel not in ("FLAGGED", "MEDIUM"):
            continue
        key = tag or ("#" + (desc or ""))
        if note and note.strip():
            reasons.setdefault(key, note.strip())
        if sheet:
            sheets.setdefault(key, sheet)

    for it in items.values():
        if it["reliability"] not in ("FLAGGED", "MEDIUM"):
            continue
        key = it.get("code") or ("#" + (it.get("label") or ""))
        why = reasons.get(key) or reasons.get("#" + (it.get("label") or ""))
        if why:
            why = "⚑ " + why
        else:
            # No reason is recorded for this line. Say THAT, and name where the
            # line came from — never invent a cause, and never leave a bare
            # "⚠ VERIFY" the crew cannot act on.
            src = sheets.get(key) or sheets.get("#" + (it.get("label") or "")) or it.get("src")
            why = ("⚑ graded %s in the reference set%s — no reason recorded; "
                   "verify against the sheet before ordering."
                   % (it["reliability"], " (source: %s)" % src if src else ""))
        it["instanceNote"] = (it["instanceNote"] + " — " + why).strip(" — ") \
            if it["instanceNote"] else why

    doc = {
        "accessible": bool(int(raw.get("accessible") or 0)) if not isinstance(
            raw.get("accessible"), bool) else raw["accessible"],
        "connecting": bool(int(raw.get("connecting") or 0)) if not isinstance(
            raw.get("connecting"), bool) else raw["connecting"],
        "deleted": False,
        "floor": raw["floor"],
        "items": items,
        "notes": {},                        # never seed a note
        "number": str(a.room),
        "schemaV": 3,
        "type": a.type,
        "typeLabel": a.label,               # Austin's name, not the DB's
    }

    with open(a.out, "w", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps(doc, indent=2, sort_keys=True, ensure_ascii=True) + "\n")

    dupes = {k: len(v) for k, v in groups.items() if len(v) > 1}
    print("%s: %d DB rows -> %d template lines (%s)"
          % (a.label, len(scoped), len(items),
             ", ".join("%s x%d" % kv for kv in sorted(dupes.items())) or "no dupes"))
    print("  wrote %s" % os.path.relpath(a.out))


if __name__ == "__main__":
    main()
