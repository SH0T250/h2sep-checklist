#!/usr/bin/env python3
"""expand_mep.py — carry a VERIFIED MEP punch package to its sibling rooms.

Floor 1 has 16 guest rooms but only THREE substantive MEP packages. What makes
sibling packages look distinct in the database is the PTAC line, which tracks
the CORRIDOR SIDE, not the room type: rooms on the odd side take
`PTAC-2 / PTAC-1` "@ exterior window wall", rooms on the even side take
`PTAC-1` "@ exterior window wall, under the window". Both the mark AND the
wording differ. So four rooms were verified line-by-line against the E/M/P
sheets --

    101  connector package        (odd side)
    105  standard guest room      (odd side)
    104  standard guest room      (even side)
    118  accessible room          (even side, dual bath configuration)

-- and the remaining twelve carry those packages with their OWN PTAC line,
rebuilt from their own schedule row rather than inherited. Carrying that line
would hang the wrong unit on half the floor; room 116 (a King Studio connector
on the even side) is exactly the case that proves it, since it takes 101's
connector package but 104's PTAC line.

The carry happens ONLY after proving it is legitimate: for every target room
the script re-derives the room's MEP signature from the database and diffs it
against the source room's. Every non-PTAC line must match exactly. If anything
else differs, it REFUSES that room rather than shipping a package that was
never verified for it.

That refusal is the whole point. The failure this prevents is a room quietly
inheriting a package that does not describe it -- the same class of defect as
room 118 carrying room 438's slug on the FF&E side, which no screen test saw.

    python3 tools/expand_mep.py            # verify + write
    python3 tools/expand_mep.py --check    # verify only, write nothing
"""

import argparse
import json
import os
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out", "mep")
DB = os.environ.get("H2SEP_DB") or os.path.join(HERE, "..", "data", "project.sqlite")

MEP_CATEGORIES = ("Electrical", "Plumbing", "Mechanical",
                  "Low Voltage", "Fire Sprinkler", "Fire Alarm")

# target room -> source room whose VERIFIED package it inherits.
CARRY = {
    "103": "101",                                   # QQ connector
    "106": "104", "108": "104", "110": "104",       # King Studio
    "112": "104", "114": "104",
    "107": "105", "109": "105", "111": "105",       # Queen-Queen
    "113": "105", "115": "105",
    "116": "101",                                   # King Studio connector
}

# The PTAC line is NEVER carried. It tracks the corridor side — rooms on the
# odd side take "PTAC-2 / PTAC-1" at the exterior window wall, rooms on the
# even side take "PTAC-1" under the window — so both its mark AND its wording
# differ between siblings. Rebuilding it from the target room's own database
# row is the only correct move; carrying it would hang the wrong unit on half
# the floor. Every OTHER line must match the source exactly.
def is_ptac(desc):
    return desc.startswith("Packaged terminal")


def mep_rows(cx, room):
    q = ("SELECT category, tag, description FROM room_items WHERE room_no = ? "
         "AND category IN (%s)" % ",".join("?" * len(MEP_CATEGORIES)))
    return {(r[0], r[1] or "", r[2] or "") for r in cx.execute(q, [room] + list(MEP_CATEGORIES))}


def ptac_row(cx, room):
    """(mark, description) for this room's own PTAC unit, or None."""
    q = ("SELECT tag, description FROM room_items WHERE room_no = ? AND category = 'Mechanical' "
         "AND description LIKE 'Packaged terminal%'")
    rows = list(cx.execute(q, (room,)))
    return (rows[0][0] or "", rows[0][1] or "") if rows else None


def compare(cx, target, source):
    """Return (ok, messages). ok only when the sole difference is the PTAC line."""
    t, s = mep_rows(cx, target), mep_rows(cx, source)
    only_t = sorted(x for x in (t - s) if not is_ptac(x[2]))
    only_s = sorted(x for x in (s - t) if not is_ptac(x[2]))
    msgs = []

    tp, sp = ptac_row(cx, target), ptac_row(cx, source)
    if tp and sp and tp != sp:
        msgs.append("PTAC line rebuilt from %s's own row: [%s] %s" % (target, tp[0], tp[1][:60]))
    elif tp == sp:
        msgs.append("identical PTAC line")
    if not tp:
        msgs.append("UNEXPLAINED — %s has no PTAC row in the database" % target)

    if not only_t and not only_s:
        msgs.insert(0, "every non-PTAC line matches %s exactly" % source)
    for cat, tag, desc in only_t:
        msgs.append("UNEXPLAINED — %s has [%s] %s and %s does not" % (target, tag or "-", desc[:70], source))
    for cat, tag, desc in only_s:
        msgs.append("UNEXPLAINED — %s has [%s] %s and %s does not" % (source, tag or "-", desc[:70], target))
    ok = not only_t and not only_s and bool(tp)
    return ok, msgs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="verify only, write nothing")
    a = ap.parse_args()

    cx = sqlite3.connect(DB)
    written = refused = 0

    for target in sorted(CARRY, key=lambda x: int(x)):
        source = CARRY[target]
        src_path = os.path.join(OUT, "_lines-%s.json" % source)
        if not os.path.exists(src_path):
            print("%s <- %s: SKIP (source package not verified yet)" % (target, source))
            continue

        ok, msgs = compare(cx, target, source)
        if not ok:
            print("%s <- %s: REFUSED" % (target, source))
            for m in msgs:
                if m.startswith("UNEXPLAINED"):
                    print("      " + m)
            refused += 1
            continue

        doc = json.load(open(src_path, encoding="utf-8"))
        want = ptac_row(cx, target)
        swapped = 0
        for line in doc.get("lines", []):
            # Rebuild the PTAC line from THIS room's own row — mark and the
            # location wording both, since they differ by corridor side.
            if line.get("category") == "Mechanical" and "ackaged terminal" in line.get("label", ""):
                if want and (line.get("mark") != want[0] or want[1] not in line.get("label", "")):
                    line["mark"] = want[0]
                    line["label"] = want[1]
                    line["instanceNote"] = ((line.get("instanceNote", "") + " · ").lstrip(" ·")
                        + "PTAC mark and location taken from room %s's own schedule row, not carried." % target).strip(" ·")
                    swapped += 1
        doc["room"] = target
        doc["carriedFrom"] = source
        doc["carryEvidence"] = msgs

        if a.check:
            print("%s <- %s: OK (%s)" % (target, source, "; ".join(msgs)))
            continue
        with open(os.path.join(OUT, "_lines-%s.json" % target), "w", encoding="utf-8", newline="\n") as f:
            f.write(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
        print("%s <- %s: %d lines%s" % (target, source, len(doc.get("lines", [])),
                                        " · PTAC line from its own row" if swapped else ""))
        written += 1

    print("\n%s %d room(s); %d refused" % ("would write" if a.check else "wrote", written, refused))
    sys.exit(1 if refused else 0)


if __name__ == "__main__":
    main()
