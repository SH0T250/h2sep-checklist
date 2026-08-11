#!/usr/bin/env python3
"""normalize_mep_labels.py — one device, one name, across every room.

Four agents wrote four rooms independently and produced four correct but
differently-phrased labels for the same device: the bath downlight is
"Surface-mount ceiling downlight, guest bathroom" in one room and "Bath ceiling
surface-mount downlight" in another. Nothing is wrong; it just reads as sloppy
the moment two sheets sit side by side on a table, which is exactly when Austin
is standing next to the client.

The rule is RICHEST WINS: for each (category, mark) the longest label becomes
canonical, because length here tracks information — the verbatim schedule row,
the "or architect-approved equal", the model number.

Two exceptions, both about not destroying real content:

  * ROOM-SPECIFIC labels are left alone. A label naming its own room ("118 is
    NOT a communication-features room") or carrying an instance ordinal
    ("head 3 of 3") is saying something true of that room only. Overwriting it
    with a sibling's wording would be a lie.
  * The PTAC line is left alone. Its wording legitimately differs by room —
    see expand_mep.py.

Run with --check first and read the diff. Nothing is written without --write.
"""

import argparse
import glob
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out", "mep")

# A label is room-specific if it names a guest room number or an ordinal.
# A room number, NOT a fragment of a product code. "215CA.104" and
# "5257A.65C.020" contain three-digit runs that a naive \b[1-4][0-9]{2}\b
# happily reads as rooms 104 and 020 — which made the richest water-closet
# label look room-specific and got it thrown away. A room number stands alone.
ROOM_RE = re.compile(r"(?<![\w.])[1-4][0-9]{2}(?![\w.])")
ORDINAL_RE = re.compile(r"\b\d+\s+of\s+\d+\b", re.I)

# A label can be room-specific WITHOUT naming a room number, by asserting a
# room-TYPE attribute. Room 438's lavatory label is the richest in the set and
# ends "set in the ACCESSIBLE vanity top" — true of 438, false of the 100-odd
# standard keys, and "richest wins" would have printed it on every one of them.
#
# But an accessibility WORD is not an accessibility CLAIM. Most occurrences in
# this set are verbatim drawing text that is true everywhere: A530 keynote 20
# reads "MAINTAIN ACCESSIBLE COMPLIANT SLOPES", the scheduled water closet is
# named "Champion Pro 211AA.104 ('Guestroom, Floor Outlet, ADA')", and the
# doorbell keynote says "COMMUNICATION FEATURES ROOMS ONLY" — a condition, not
# an assertion about the room holding the sheet. Treating the word as the claim
# blocked 92 legitimate floor-drain normalisations to prevent one real defect.
#
# So the rule is about what normalising CHANGES, not about vocabulary:
# a canonical label may never INTRODUCE an attribute the room's own label did
# not already carry. 438 keeps its accessible vanity because 101's lavatory
# label never mentions ACCESSIBLE; the floor drains normalise freely because
# both labels already quote the same keynote.
ATTRIBUTE_RE = re.compile(
    r"\b(ACCESSIBLE|ADA|roll-in|rollin|communication[- ]features|hearing[- ]"
    r"(?:impaired|accessible)|mobility[- ]accessible|wheelchair|ambulatory|"
    r"CONFIGURATION [AB])\b", re.I)


def attrs(label):
    """The set of room-type attributes a label asserts, normalised for compare."""
    return frozenset(re.sub(r"[\s-]+", " ", m.group(0)).lower()
                     for m in ATTRIBUTE_RE.finditer(label or ""))


def adds_attribute(canonical, current):
    """True when adopting `canonical` would make a claim `current` does not."""
    return not (attrs(canonical) <= attrs(current))

# THE PLACEHOLDER TRAP. The agents wrote an em-dash for "this device has no
# schedule mark", not an empty string. Treating that as a real mark makes every
# untagged device in a room look like the same device — the first dry run of
# this script proposed renaming all twelve untagged electrical lines in room
# 101 to "Refrigerator receptacle", which would have destroyed the room. A mark
# is only a join key when it actually identifies something.
NO_MARK = {"", "-", "--", "—", "–", "n/a", "na", "none", "no mark", "?"}


def has_mark(mark):
    return str(mark or "").strip().lower() not in NO_MARK


# Even with a real mark, only normalise labels that are plainly the SAME
# device said at different lengths. If the two labels share almost no
# vocabulary, the mark is being reused for different things and rewriting one
# to the other would be a fabrication.
STOP = {"the", "a", "an", "and", "or", "at", "in", "on", "of", "for", "to", "with",
        "per", "by", "is", "not", "no", "—", "-", "/"}


def word_set(label):
    return {w for w in re.findall(r"[a-z0-9.\-]+", label.lower()) if w not in STOP and len(w) > 2}


def _covers(token, vocab):
    """A token is present if it appears, or elaborates/abbreviates one that does.

    One room cites "P301" and another "P301-series"; one says "kn20", another
    "kn20-verbatim". Exact set intersection scores those as disagreement and
    refused all eight floor-drain labels — plainly the same 2" guestroom drain
    quoting the same keynote — over a suffix.
    """
    if token in vocab:
        return True
    return any(t.startswith(token) or token.startswith(t) for t in vocab)


def same_device(a, b):
    """True when the shorter label's vocabulary is largely inside the longer."""
    wa, wb = word_set(a), word_set(b)
    if not wa or not wb:
        return False
    short, long_ = (wa, wb) if len(wa) <= len(wb) else (wb, wa)
    hits = sum(1 for t in short if _covers(t, long_))
    return hits / len(short) >= 0.6


def is_room_specific(label, room):
    if ORDINAL_RE.search(label):
        return True
    for m in ROOM_RE.findall(label):
        if m == room:                 # names its own room
            return True
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true", help="apply (default is a dry run)")
    a = ap.parse_args()

    files = sorted(glob.glob(os.path.join(OUT, "_lines-*.json")))
    docs = {}
    for f in files:
        room = os.path.basename(f)[len("_lines-"):-len(".json")]
        docs[room] = json.load(open(f, encoding="utf-8"))

    # Collect every label used per (category, mark).
    variants = {}
    for room, doc in docs.items():
        for line in doc.get("lines", []):
            mark = line.get("mark") or ""
            if not has_mark(mark):
                continue
            if "ackaged terminal" in line.get("label", ""):
                continue              # PTAC — legitimately per-room
            variants.setdefault((line["category"], mark.strip()), []).append((room, line["label"]))

    changes, kept, mismatched = [], [], []
    canon = {}
    for key, vs in variants.items():
        labels = {l for _, l in vs}
        if len(labels) < 2:
            continue
        # A canonical label must be true in EVERY room that adopts it, so it
        # may not name a specific guest room. Guarding only the source label
        # (below) is not enough: the first run pushed room 104's fire-horn
        # wording into 202 and 202's water-closet wording into 104, each
        # carrying the other room's number. Prefer the richest label that
        # names no room at all; if every variant names one, refuse the group.
        roomless = [l for l in labels if not ROOM_RE.search(l)]
        if not roomless:
            mismatched.append((key, sorted(labels, key=len)))
            continue
        best = max(roomless, key=len)
        # Refuse to normalise a group whose labels are not plainly the same
        # device — a reused mark is not a join key.
        if not all(same_device(l, best) for l in labels):
            mismatched.append((key, sorted(labels, key=len)))
            continue
        canon[key] = best
        for room, label in vs:
            if label == best:
                continue
            if is_room_specific(label, room):
                kept.append((room, key, label))
            elif adds_attribute(best, label):
                kept.append((room, key, label))
            else:
                changes.append((room, key, label, best))

    print("%d device(s) drift across rooms" % len(canon))
    print("%d label(s) to normalise · %d left alone as room-specific\n" % (len(changes), len(kept)))
    for room, key, old, new in sorted(changes):
        print("  %s  %s | %s" % (room, key[0], key[1]))
        print("     -  %s" % old[:118])
        print("     +  %s" % new[:118])
    for room, key, label in sorted(kept):
        print("  %s  %s | %s  KEPT (room-specific): %s" % (room, key[0], key[1], label[:78]))
    if mismatched:
        print("\nREFUSED — mark reused for different devices, not normalised:")
        for key, labels in mismatched:
            print("  %s | %s" % key)
            for l in labels[:3]:
                print("     · %s" % l[:100])

    if not a.write:
        print("\ndry run — nothing written. Re-run with --write to apply.")
        return 0

    applied = 0
    for room, doc in docs.items():
        touched = False
        for line in doc.get("lines", []):
            mark = line.get("mark") or ""
            if "ackaged terminal" in line.get("label", ""):
                continue
            if not has_mark(mark):
                continue
            key = (line["category"], mark.strip())
            best = canon.get(key)
            if (best and line["label"] != best
                    and not is_room_specific(line["label"], room)
                    and not adds_attribute(best, line["label"])):
                line["label"] = best
                touched = True
                applied += 1
        if touched:
            with open(os.path.join(OUT, "_lines-%s.json" % room), "w",
                      encoding="utf-8", newline="\n") as f:
                f.write(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
    print("\napplied %d label normalisation(s)" % applied)
    return 0


if __name__ == "__main__":
    sys.exit(main())
