#!/usr/bin/env python3
"""build_room_type.py — emit seedable room docs for every room of one type.

The rooms Austin calls a "QQ Studio Connector" (and every other type after it)
all carry the SAME item package. Room 101 was built first, hand-checked, and
had Austin's rulings applied to it (the GR-302L discrepancy note, the FLAGGED
dishwasher/disposer with no submittal link). Those rulings belong to the room
TYPE, not to room 101 — so sibling rooms must inherit them rather than being
regenerated raw from the database.

This script does both, and refuses to guess:

  1. Regenerates each room straight from data/project.sqlite (gen_rooms.build_room,
     scoped to Austin's scope: FF&E families + Appliance + Bath Accessory).
  2. PROVES that regeneration matches the approved template item-for-item —
     same ids, codes, labels, categories, qty, reliability. Any drift is a hard
     failure naming the room and the field, never a silent overwrite.
  3. Emits the template's item CONTENT under the room's own number/floor, so
     the ruled notes and flags ride along.

Usage:
    python3 tools/build_room_type.py --label "QQ Studio Connector" \
        --template tools/out/template-101-final.json [--skip 101] [--out-dir tools/out]
    python3 tools/build_room_type.py --rooms 103,215,236 --template ...

Writes tools/out/room-<no>.build.json — seed with tools/seed_rooms.mjs.
Deterministic: no timestamps (the seeder stamps those), sorted keys.
"""

import argparse
import json
import os
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gen_rooms  # noqa: E402  (same directory, deliberate)

DB_PATH = os.path.join(HERE, os.pardir, "data", "project.sqlite")

# Austin's current scope, ruling 9. MEP lands later via --merge-missing, which
# appends by id and never clobbers a check-off.
SCOPE_CATEGORIES = (
    "FF&E - Casegoods", "FF&E - Bedding", "FF&E - Seating", "FF&E - Lighting",
    "FF&E - Window", "FF&E - Art / Mirror", "FF&E - Misc",
    "Appliance", "Bath Accessory",
)

# Fields compared per package line. Deliberately excludes the ruling-bearing
# fields (instanceNote, issue, reliability overrides) — carrying those forward
# is the template's whole point — and `sort`, which dedupe legitimately
# renumbers.
COMPARE_FIELDS = ("label", "category")


def die(msg):
    sys.stderr.write("build_room_type: %s\n" % msg)
    sys.exit(1)


def scoped_items(cx, room_no):
    """Room doc from the DB, filtered to Austin's scope."""
    doc = gen_rooms.build_room(cx, room_no)
    doc["items"] = {i: it for i, it in doc["items"].items()
                    if it.get("category") in SCOPE_CATEGORIES}
    return doc


def package(items, qty_field=False):
    """Collapse a room's item map to one line per tag, the way ruling 2 does.

    The database stores one ROW per physical instance (two headboards = two
    rows, ids gr300_a / gr300_b). The approved template stores one LINE per tag
    carrying a ×qty badge. Comparing raw item maps would therefore always
    "differ" — the real question is whether the packages describe the same
    room, so both sides are reduced to {tag: (count, label, category)} first.
    Untagged lines have no tag to collapse on and key off their id, which is a
    hash of category|description|note|ordinal and so is already stable.
    """
    out = {}
    for iid, it in items.items():
        key = it.get("code") or ("#" + iid)
        n = int(it.get("qty") or 1) if qty_field else 1
        if key in out:
            out[key]["count"] += n
        else:
            out[key] = {"count": n,
                        "label": it.get("label"), "category": it.get("category")}
    return out


def verify(room_no, generated, template):
    """Hard-fail unless the DB package agrees with the approved template."""
    g = package(generated["items"])                  # DB: one row per instance
    t = package(template["items"], qty_field=True)   # template: deduped + qty
    problems = []
    for key in sorted(set(g) - set(t)):
        problems.append("in the DB but not the template: %s (×%d)" % (key, g[key]["count"]))
    for key in sorted(set(t) - set(g)):
        problems.append("in the template but not the DB: %s (×%d)" % (key, t[key]["count"]))
    for key in sorted(set(g) & set(t)):
        if g[key]["count"] != t[key]["count"]:
            problems.append("%s quantity: DB has %d, template says %d"
                            % (key, g[key]["count"], t[key]["count"]))
        for f in COMPARE_FIELDS:
            if g[key][f] != t[key][f]:
                problems.append("%s.%s: DB %r != template %r" % (key, f, g[key][f], t[key][f]))
    if problems:
        die("room %s does NOT match the template — refusing to build.\n  - %s\n"
            "This room's package differs from the approved one; build it from its\n"
            "own reviewed template instead of inheriting this one."
            % (room_no, "\n  - ".join(problems)))


def build(room_no, cx, template):
    generated = scoped_items(cx, room_no)
    verify(room_no, generated, template)
    doc = {
        "number": str(room_no),
        "floor": generated["floor"],
        "type": template["type"],
        "typeLabel": template["typeLabel"],
        # Template item content, verified equal to this room's DB rows above,
        # so Austin's rulings ride along to every sibling room.
        "items": json.loads(json.dumps(template["items"])),
        "notes": {},          # per-room notes are earned in the field, never seeded
        "deleted": False,
        "schemaV": template.get("schemaV", 3),
    }
    return doc


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--label", help='display label, e.g. "QQ Studio Connector"')
    g.add_argument("--rooms", help="comma-separated room numbers")
    ap.add_argument("--template", required=True, help="approved template JSON")
    ap.add_argument("--skip", default="", help="comma-separated rooms to leave alone")
    ap.add_argument("--out-dir", default=os.path.join(HERE, "out"))
    a = ap.parse_args()

    if not os.path.exists(DB_PATH):
        die("database not found at %s" % DB_PATH)
    with open(a.template, encoding="utf-8") as f:
        template = json.load(f)

    cx = sqlite3.connect(DB_PATH)
    cx.row_factory = sqlite3.Row

    if a.rooms:
        rooms = [r.strip() for r in a.rooms.split(",") if r.strip()]
    else:
        # display_label is what the app shows and what Austin names rooms by;
        # the canonical contract maps several room_type values onto one label,
        # so select on the label and print the types for the record.
        rooms = [r[0] for r in cx.execute(
            "SELECT room_no FROM rooms WHERE display_label = ?"
            " ORDER BY CAST(room_no AS INTEGER), room_no", (a.label,))]
        if not rooms:
            die('no rooms carry display_label %r — check '
                'data/ROOM_TYPE_CANONICAL.md for the exact string' % a.label)

    skip = {s.strip() for s in a.skip.split(",") if s.strip()}
    os.makedirs(a.out_dir, exist_ok=True)

    print("template: %s (%d items)" % (a.template, len(template["items"])))
    built = []
    for room_no in rooms:
        if room_no in skip:
            print("  %s: SKIPPED (already built)" % room_no)
            continue
        row = cx.execute("SELECT floor, room_type, display_label, accessible, connecting"
                         " FROM rooms WHERE room_no = ?", (room_no,)).fetchone()
        if row is None:
            die("room %r is not in the rooms table" % room_no)
        doc = build(room_no, cx, template)
        out = os.path.join(a.out_dir, "room-%s.build.json" % room_no)
        with open(out, "w", encoding="utf-8", newline="\n") as f:
            f.write(json.dumps(doc, indent=2, sort_keys=True, ensure_ascii=True) + "\n")
        built.append(room_no)
        print("  %s: floor %s · %-20s · acc=%s conn=%s · %d items -> %s"
              % (room_no, row["floor"], row["room_type"], row["accessible"],
                 row["connecting"], len(doc["items"]), os.path.relpath(out)))

    print("\n%d room doc(s) built, all verified against the database." % len(built))
    if built:
        print("Seed with:\n  node tools/seed_rooms.mjs %s"
              % " ".join(os.path.join("tools", "out", "room-%s.build.json" % r) for r in built))


if __name__ == "__main__":
    main()
