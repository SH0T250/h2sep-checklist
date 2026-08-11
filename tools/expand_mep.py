#!/usr/bin/env python3
"""expand_mep.py — carry a VERIFIED MEP punch package to its sibling rooms.

The hotel's 115 guest rooms carry only SEVEN distinct MEP packages, so a small
set of rooms verified line-by-line against the E/M/P sheets covers every key.
What makes sibling packages look distinct in the database is the PTAC line.

CORRECTED 2026-08-11 by the mechanical sheet extraction. An earlier version of
this file said the PTAC line tracks the CORRIDOR SIDE. It does not — that was
an inference from floor 1's odd/even numbering, and it is wrong. What the line
actually tracks is WHICH SHEET YOU BELIEVE, split along the ROOM FAMILY:

    M301            says PTAC-1 at all 16 first-floor guest rooms
    M401 detail 01  says PTAC-2, and detail 01 covers the QQ family
                    (Queen-Queen, QQ Ext., QQ Conn.)

The two are mutually exclusive, and the King family reads PTAC-1 on BOTH
sheets. So the database's 8/8 split on floor 1 is a split of MARK CONVENTION
along QQ-vs-King — not of hardware — and it lines up with odd/even numbering
only by coincidence of how floor 1 happens to be laid out. The composite
string `PTAC-2 / PTAC-1` is printed on NO drawing; it is the carry-both
convention from packages/mechanical.md flag F4. The location wording differs
with it ("under the window" appears on the King rows).

Settled on the walk, not in the office — read the nameplate:
    AZ65H12DAB = PTAC-1        AZ65H15DAB = PTAC-2

VERIFIED SOURCE ROOMS

    101  connector / extended / wide      (QQ family mark)
    104  standard guest room              (King family mark)
    105  standard guest room              (QQ family mark)
    118  King Studio Acc.                 (dual bath configuration)
    202  King One Bedroom                 (TWO PTAC units, no mark in the set)
    217  King One Bedroom Acc.            (TWO PTAC units, no mark in the set)
    238  QQ Acc.
    438  King Studio Acc. — a DIFFERENT package from 118: it carries a power
         wheelchair outlet and a closet light switch 118 does not, and lacks
         118's glass shower enclosure.

Every other room carries one of those packages with its OWN PTAC line, rebuilt
from its own schedule row rather than inherited. Room 116 is the case that
proves the line must not be carried: a King Studio connector, it takes 101's
connector package but the King family's PTAC mark.

The carry happens ONLY after proving it is legitimate: for every target room
the script re-derives the room's MEP signature from the database and diffs it
against the source room's. Every non-PTAC line must match exactly. If anything
else differs, the room is REFUSED rather than shipped with a package nobody
verified for it — the same class of defect as room 118 carrying room 438's
slug on the FF&E side, which no screen test saw.

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

# The rooms whose packages are verified line-by-line against the E/M/P sheets.
# Every other room in the hotel must map onto one of these by having an
# IDENTICAL database signature (PTAC line excluded — see below). The mapping is
# DERIVED, not hand-written: a hand-written list of 115 rooms is a place for a
# typo to hide, and the derivation is itself the proof that the carry is sound.
#
#   101  connector / extended / wide package
#   104  standard guest room (King family mark)
#   105  standard guest room (QQ family mark)
#   118  King Studio Acc.
#   202  King One Bedroom            (2 PTAC units per key, no schedule mark)
#   217  King One Bedroom Acc.       (2 PTAC units per key, no schedule mark)
#   238  QQ Acc.
#   438  King Studio Acc. — a DIFFERENT package from 118: it carries a power
#        wheelchair outlet and a closet light switch that 118 does not, and
#        lacks 118's glass shower enclosure.
VERIFIED_SOURCES = ["101", "104", "105", "118", "202", "217", "238", "438"]

# The PTAC line is NEVER carried — see the module docstring. Its mark and its
# wording both vary between siblings (QQ family vs King family, per whichever
# of M301 / M401 det.01 governs), so it is rebuilt from the target room's own
# database row. Every OTHER line must match the source exactly.
def is_ptac(desc):
    return desc.startswith("Packaged terminal")


def mep_rows(cx, room):
    q = ("SELECT category, tag, description FROM room_items WHERE room_no = ? "
         "AND category IN (%s)" % ",".join("?" * len(MEP_CATEGORIES)))
    return {(r[0], r[1] or "", r[2] or "") for r in cx.execute(q, [room] + list(MEP_CATEGORIES))}


def ptac_rows(cx, room):
    """Every PTAC unit row for this room. The One Bedroom types carry TWO."""
    q = ("SELECT tag, description FROM room_items WHERE room_no = ? AND category = 'Mechanical' "
         "AND description LIKE 'Packaged terminal%' ORDER BY tag, description")
    return [(r[0] or "", r[1] or "") for r in cx.execute(q, (room,))]


def ptac_row(cx, room):
    """The room's PTAC identity for carry purposes.

    Returns (mark, description, count). Count matters: the King One Bedroom
    types get two units per key, and a punch list that says "1 PTAC" for a
    two-unit suite sends the crew home having tested half the heating.
    """
    rows = ptac_rows(cx, room)
    if not rows:
        return None
    distinct = set(rows)
    if len(distinct) > 1:
        return None            # two DIFFERENT units — carry cannot represent it
    return (rows[0][0], rows[0][1], len(rows))


def build_carry_map(cx):
    """room -> verified source room with an identical non-PTAC signature.

    Refuses to invent a mapping: a room whose signature matches no verified
    source is reported as uncovered rather than attached to the closest thing.
    """
    src_sig = {}
    for s in VERIFIED_SOURCES:
        src_sig[s] = frozenset(x for x in mep_rows(cx, s) if not is_ptac(x[2]))
    carry, uncovered = {}, []
    for (room,) in cx.execute("SELECT room_no FROM rooms ORDER BY CAST(room_no AS INTEGER)"):
        if room in VERIFIED_SOURCES:
            continue
        sig = frozenset(x for x in mep_rows(cx, room) if not is_ptac(x[2]))
        match = next((s for s in VERIFIED_SOURCES if src_sig[s] == sig), None)
        if match:
            carry[room] = match
        else:
            uncovered.append(room)
    return carry, uncovered


def compare(cx, target, source):
    """Return (ok, messages). ok only when the sole difference is the PTAC line."""
    t, s = mep_rows(cx, target), mep_rows(cx, source)
    only_t = sorted(x for x in (t - s) if not is_ptac(x[2]))
    only_s = sorted(x for x in (s - t) if not is_ptac(x[2]))
    msgs = []

    tp, sp = ptac_row(cx, target), ptac_row(cx, source)
    if tp is None:
        msgs.append("UNEXPLAINED — %s has no single PTAC identity in the database "
                    "(none, or two different units)" % target)
    elif sp and tp != sp:
        msgs.append("PTAC line rebuilt from %s's own row: [%s] x%d %s"
                    % (target, tp[0] or "no mark", tp[2], tp[1][:52]))
    else:
        msgs.append("identical PTAC line (x%d)" % tp[2])

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
    CARRY, uncovered = build_carry_map(cx)
    print("carry map: %d room(s) map onto %d verified package(s)"
          % (len(CARRY), len(VERIFIED_SOURCES)))
    if uncovered:
        print("UNCOVERED — no verified package matches these rooms, they will NOT be built:")
        for r in uncovered:
            print("      %s" % r)
        refused += len(uncovered)

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
