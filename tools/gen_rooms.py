#!/usr/bin/env python3
"""gen_rooms.py — emit canonical room checklist JSON from the H2SEP reference DB.

Usage:
    python3 tools/gen_rooms.py 103 [104 ...]
    python3 tools/gen_rooms.py --all

Reads  ../data/project.sqlite  (relative to this script).
Writes ./out/room-<no>.json    (relative to this script).

Deterministic by construction: no timestamps, sorted JSON keys, ids derived
only from row content + rowid order. Running twice yields byte-identical files.

Contract decisions made explicit here (the load-bearing ambiguities):
  * type slug: lowercase room_type, runs of non-alphanumerics collapse to a
    single '-', leading/trailing '-' stripped ("King Studio Acc." ->
    "king-studio-acc", matching the app's existing 'qq-studio-connector' style).
  * tag-instance suffix: 'a','b',... per occurrence of the RAW tag string
    within the room, in rowid order (matches js/seed.js expandTemplateItems).
  * untagged id hash ordinal: occurrenceOrdinalAmongIdenticalTuples is 1-BASED
    (first occurrence = 1), mirroring 'a' = first for tagged rows. The ordinal
    is always part of the hashed string, even for a lone occurrence.
  * sort: (categoryIndex+1)*1000 + withinCategoryOrdinal*10 with a 0-BASED
    within-category ordinal (first item in a category sorts at (ci+1)*1000).
"""

import hashlib
import json
import os
import re
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(HERE, os.pardir, "data", "project.sqlite")
OUT_DIR = os.path.join(HERE, "out")

ID_RE = re.compile(r"^[a-z0-9_]{1,40}$")

RELIABILITY_VALUES = {"HIGH", "MEDIUM", "LOW", "FLAGGED"}

# Crew work top of wall down, trades, then FF&E. Exact string match.
CATEGORY_ORDER = [
    "Drywall", "Paint", "Wall Covering", "Flooring", "Stone / Surround",
    "Doors", "Electrical", "Mechanical", "Plumbing", "Fire Sprinkler",
    "Fire Alarm", "Low Voltage", "Bath Accessory", "Appliance",
    "FF&E - Casegoods", "FF&E - Bedding", "FF&E - Seating", "FF&E - Lighting",
    "FF&E - Window", "FF&E - Art / Mirror", "FF&E - Misc",
]
CATEGORY_INDEX = {c: i for i, c in enumerate(CATEGORY_ORDER)}


def die(msg):
    sys.stderr.write("gen_rooms: FATAL: %s\n" % msg)
    sys.exit(1)


def type_slug(room_type):
    s = re.sub(r"[^a-z0-9]+", "-", room_type.lower()).strip("-")
    if not s:
        die("room_type %r slugs to empty string" % room_type)
    return s


def tag_slug(tag):
    return re.sub(r"[^a-z0-9]", "", tag.lower())


def occ_suffix(n):
    """1 -> 'a', 2 -> 'b', ... 26 -> 'z', 27 -> 'aa' (deterministic, unbounded)."""
    s = ""
    while n > 0:
        n, r = divmod(n - 1, 26)
        s = chr(ord("a") + r) + s
    return s


def build_room(cx, room_no, category_like=None):
    room = cx.execute(
        "SELECT room_no, floor, room_type, display_label, accessible, connecting"
        " FROM rooms WHERE room_no = ?", (room_no,)
    ).fetchone()
    if room is None:
        die("room %r does not exist in rooms table" % room_no)

    sql = ("SELECT rowid, room_type, category, tag, description, instance_note,"
           "       trade_responsible, source_sheet, primary_sheet, reliability, derived"
           " FROM room_items WHERE room_no = ?")
    args = [room_no]
    if category_like:
        sql += " AND category LIKE ?"
        args.append(category_like)
    rows = cx.execute(sql + " ORDER BY rowid", args).fetchall()
    if not rows:
        die("room %r has no rows in room_items" % room_no)

    # Sanity: the exploded table must agree with rooms.room_type (hard rule 1 —
    # the join key is room_type, never display_label).
    for r in rows:
        if r["room_type"] != room["room_type"]:
            die("room %s: room_items.room_type %r != rooms.room_type %r (rowid %d)"
                % (room_no, r["room_type"], room["room_type"], r["rowid"]))

    # ---- assign deterministic ids in rowid order ----
    tag_seen = {}      # raw tag -> occurrence count so far
    tuple_seen = {}    # (category, description, note) -> occurrence count so far
    assigned = []      # (id, row)
    for r in rows:
        tag = r["tag"] or ""
        if tag:
            tag_seen[tag] = tag_seen.get(tag, 0) + 1
            item_id = tag_slug(tag) + "_" + occ_suffix(tag_seen[tag])
        else:
            key = (r["category"], r["description"], r["instance_note"] or "")
            tuple_seen[key] = tuple_seen.get(key, 0) + 1
            basis = "%s|%s|%s|%d" % (key[0], key[1], key[2], tuple_seen[key])
            item_id = "u_" + hashlib.md5(basis.encode("utf-8")).hexdigest()[:10]
        assigned.append((item_id, r))

    # ---- validate ids ----
    seen_ids = set()
    for item_id, r in assigned:
        if not ID_RE.match(item_id):
            die("room %s: id %r (rowid %d, tag %r) violates ^[a-z0-9_]{1,40}$"
                % (room_no, item_id, r["rowid"], r["tag"]))
        if item_id in seen_ids:
            die("room %s: id collision %r (rowid %d, tag %r)"
                % (room_no, item_id, r["rowid"], r["tag"]))
        seen_ids.add(item_id)

    # ---- category order: canonical list, then unknown categories appended
    #      alphabetically at the end ----
    unknown = sorted({r["category"] for _, r in assigned
                      if r["category"] not in CATEGORY_INDEX})
    cat_index = dict(CATEGORY_INDEX)
    for i, c in enumerate(unknown):
        cat_index[c] = len(CATEGORY_ORDER) + i

    # ---- sort: category index, then tag (empty last), description, rowid ----
    def sort_key(pair):
        _id, r = pair
        tag = r["tag"] or ""
        return (cat_index[r["category"]], (1, "") if tag == "" else (0, tag),
                r["description"], r["rowid"])

    ordered = sorted(assigned, key=sort_key)

    # within-category ordinal (0-based), reset per category in sorted order
    items = {}
    prev_cat = None
    ordinal = 0
    for item_id, r in ordered:
        cat = r["category"]
        if cat != prev_cat:
            ordinal = 0
            prev_cat = cat
        else:
            ordinal += 1
        rel = r["reliability"]
        if rel not in RELIABILITY_VALUES:
            die("room %s: rowid %d has unexpected reliability %r"
                % (room_no, r["rowid"], rel))
        if r["derived"] not in (0, 1):
            die("room %s: rowid %d has unexpected derived %r"
                % (room_no, r["rowid"], r["derived"]))
        items[item_id] = {
            "code": r["tag"] or "",
            "label": r["description"],
            "sort": (cat_index[cat] + 1) * 1000 + ordinal * 10,
            "category": cat,
            "reliability": rel,
            "instanceNote": r["instance_note"] or "",
            "trade": r["trade_responsible"] or "",
            "src": r["primary_sheet"] or r["source_sheet"] or "",
            "derived": r["derived"],
            "checked": False, "initials": "", "checkedByName": "",
            "checkedByUid": "", "checkedAt": None, "checkedAtLocal": None,
            "issue": "", "issueResolved": False, "deleted": False,
        }

    if len(items) != len(rows):
        die("room %s: emitted %d items but sqlite has %d rows — rows were lost"
            % (room_no, len(items), len(rows)))

    if room["accessible"] not in ("0", "1") or room["connecting"] not in ("0", "1"):
        die("room %s: unexpected accessible/connecting values %r/%r"
            % (room_no, room["accessible"], room["connecting"]))

    return {
        "number": room["room_no"],
        "floor": int(room["floor"]),
        "type": type_slug(room["room_type"]),
        "typeLabel": room["display_label"],
        "accessible": room["accessible"] == "1",
        "connecting": room["connecting"] == "1",
        "items": items,
        "notes": {},
        "deleted": False,
        "schemaV": 2,
    }


def main(argv):
    if len(argv) < 2:
        die("usage: gen_rooms.py [--ffe] <room_no> [<room_no> ...] | [--ffe] --all")
    # --ffe: FF&E scope only (Austin's paper-sheet scope). Output gets a .ffe
    # suffix so full-trade and FF&E-only artifacts can't be confused; the same
    # ids are generated either way, so a later full-trade --merge-missing seed
    # simply appends the other trades to the very same room docs.
    category_like = None
    suffix = ""
    if "--ffe" in argv:
        argv = [a for a in argv if a != "--ffe"]
        category_like = "FF&E%"
        suffix = ".ffe"
    if len(argv) < 2:
        die("usage: gen_rooms.py [--ffe] <room_no> [<room_no> ...] | [--ffe] --all")
    if not os.path.exists(DB_PATH):
        die("database not found at %s" % DB_PATH)

    cx = sqlite3.connect(DB_PATH)
    cx.row_factory = sqlite3.Row

    if argv[1] == "--all":
        if len(argv) > 2:
            die("--all takes no additional room numbers")
        room_nos = [r[0] for r in cx.execute(
            "SELECT room_no FROM rooms ORDER BY CAST(room_no AS INTEGER), room_no")]
    else:
        room_nos = argv[1:]
        dupes = {n for n in room_nos if room_nos.count(n) > 1}
        if dupes:
            die("room number(s) given more than once: %s" % ", ".join(sorted(dupes)))

    os.makedirs(OUT_DIR, exist_ok=True)
    for room_no in room_nos:
        doc = build_room(cx, room_no, category_like)
        out_path = os.path.join(OUT_DIR, "room-%s%s.json" % (room_no, suffix))
        blob = json.dumps(doc, indent=2, sort_keys=True, ensure_ascii=True) + "\n"
        with open(out_path, "w", encoding="utf-8", newline="\n") as f:
            f.write(blob)
        print("wrote %s (%d items)" % (os.path.relpath(out_path), len(doc["items"])))


if __name__ == "__main__":
    main(sys.argv)
