#!/usr/bin/env python3
"""apply_rulings.py — turn draft templates into approved ones, auditably.

`make_template.py` emits raw database content. A seed template additionally
carries Austin's standing rulings and an honest flag on anything unresolved.
Every such deviation lives in the RULINGS table below and nowhere else, so the
diff between "what the drawings say" and "what the crew sees" is always one
readable list.

Two hard rules, enforced by the code and not by care:

  * A ruling that targets a code the template does not carry is a FAILURE, not
    a no-op. A typo must never silently skip a flag.
  * Nothing here invents a fact. Where the answer is unknown the item gets
    reliability FLAGGED and a note saying exactly what is unknown and what
    would settle it -- never a guess dressed up as data.

Usage:
    python3 tools/apply_rulings.py           # writes tools/out/template-<slug>.json
    python3 tools/apply_rulings.py --check   # verify only, no writes
"""

import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")

# Austin's rulings that are true everywhere the item appears. Carried forward
# from template-101-final.json, which he approved for the QQ Studio Connector.
DISHWASHER = ('⚑ no submittal link — model (DDW18D1ESS 18" vs '
              'DDW2404EBSS 24") pending Austin ruling')
DISPOSER = ('⚑ no submittal link — only the E400 disposer circuit + '
            'E103 480 VA load evidence it; existence unresolved, resolve '
            'before ordering')
GR302L = ('⚑ GR-302 vs GR-302L: the ROOM-101 field sheet tags GR-302L while '
          'the DB and the legend carry GR-302. Austin ruled the L designation '
          'stands project-wide; the room-101 sheet is the evidence for that '
          'ruling, NOT for this room — confirm the vanity tag on this room\'s '
          'own elevation before ordering')

PROJECT_WIDE = {
    "902": {"instanceNote": DISHWASHER},
    "@Garbage disposer": {"instanceNote": DISPOSER},
}

# The QQ family -- base QQ Studio, the wider QQ Wide (which the drawings label
# "QQ Studio" too, at 12'-11 3/8" clear instead of 12'-0"), and QQ Extended --
# carry a provably identical package down to the GR-308 label, so they share one
# ruleset. build_room_type.py re-proves that against the database per room, so
# if a type ever drifts the build fails instead of inheriting a wrong ruling.
QQ_FAMILY = {
        **PROJECT_WIDE,
        "GR-302": {"instanceNote": GR302L},
        # The King rooms carry GR-319 @ Right AND GR-323 @ Left as separate
        # nightstands. That corroborates the 101 paper sheet, which counted
        # three where the DB tags one -- so this stays flagged for a field count.
        "GR-322": {
            "reliability": "FLAGGED",
            "instanceNote": (
                "⚑ tagged once on A555, but the 101 paper sheet counted 3 "
                "(GR-319 @ R / GR-322 / GR-323 @ L) and the King rooms do carry "
                "two separate nightstands — count on site before ordering"),
        },
        # The DB label itself records that the spec text and the plan tag
        # disagree; keep the drafting note and say what would settle it.
        "GR-308": {
            "instanceNote": (
                "one continuous run — ⚑ spec prints '@ Queen Queen "
                "Studio Suite Connector' but it is tagged on the BASE QQ plan; "
                "confirm the correct working wall for a non-connecting QQ Studio"),
        },
}

CONFIG_A = ("⚑ CONFIGURATION A (TUB) — mutually exclusive with HD-14 + HD-5.1 "
            "(Config B roll-in). Verify which configuration this room is built "
            "to; leave the other configuration's lines unchecked and raise an "
            "issue on them so the sheet records which one is real")
CONFIG_B = ("⚑ CONFIGURATION B (ROLL-IN SHOWER) — mutually exclusive with HD-05 "
            "(Config A tub). Verify which configuration this room is built to; "
            "leave the other configuration's lines unchecked and raise an issue "
            "on them so the sheet records which one is real")
ACCESSIBLE_BATH = {
    "HD-05": {"instanceNote": CONFIG_A},
    "HD-14": {"instanceNote": CONFIG_B},
    "HD-5.1": {"instanceNote": CONFIG_B},
}

RULINGS = {
    "qq-studio": QQ_FAMILY,
    "qq-extended": QQ_FAMILY,
    "qq-wide": QQ_FAMILY,
    "king-studio": {
        **PROJECT_WIDE,
        "GR-302": {"instanceNote": GR302L},
    },
    "king-studio-connector": {
        **PROJECT_WIDE,
        "GR-302": {"instanceNote": GR302L},
        # Sourced off an interior-design sheet rather than the architectural
        # set, which is why the DB already grades it FLAGGED.
        "GR-306": {
            "instanceNote": (
                "one continuous run — ⚑ tagged on ID-5.1 (interior "
                "design), not the A550 architectural set; confirm against A550 "
                "before fabrication"),
        },
    },
    "king-studio-acc-mod": {
        **PROJECT_WIDE,
        # The accessible bath is drawn two ways and the room is built ONE of
        # them. Shipping both to a phone without saying so invites a tub rod
        # going into a roll-in shower.
        "HD-05": {
            "instanceNote": (
                "⚑ CONFIGURATION A (TUB) — mutually exclusive with "
                "HD-14 + HD-5.1 (Config B roll-in). Verify which configuration "
                "this room is built to and mark the other N/A"),
        },
        "HD-14": {
            "instanceNote": (
                "⚑ CONFIGURATION B (ROLL-IN SHOWER) — mutually "
                "exclusive with HD-05 (Config A tub). Verify which "
                "configuration this room is built to and mark the other N/A"),
        },
        "HD-5.1": {
            "instanceNote": (
                "⚑ CONFIGURATION B (ROLL-IN SHOWER) — mutually "
                "exclusive with HD-05 (Config A tub). Verify which "
                "configuration this room is built to and mark the other N/A"),
        },
        # A queen-queen sconce tag on a King suite, carried off A552.
        "GR-208": {
            "instanceNote": (
                "⚑ label reads '@ QUEEN QUEEN SIDE' but this is a King "
                "suite — tag carried off A552; confirm the correct sconce "
                "before ordering"),
        },
        # Reads like a drafting annotation that was captured as a line item.
        "GR-503": {
            "instanceNote": (
                "⚑ the A532 entry reads as a drafting annotation, not a "
                "product — confirm what GR-503 actually is at the "
                "accessible-bath vanity mirror"),
        },
    },
    # ---- floor 2 introduces three more types -------------------------------
    "king-one-bedroom": {
        **PROJECT_WIDE,
        "GR-302": {"instanceNote": GR302L},
        # A tag with no description anywhere in the legend or the spec. Recorded
        # as printed rather than merged into 905 TELEPHONE, which is a guess.
        "GR-905": {
            "reliability": "FLAGGED",
            "instanceNote": (
                "⚑ no description in any legend or spec — recorded exactly as "
                "printed and NOT merged with the 905 TELEPHONE tag. Ask the "
                "architect what GR-905 is before ordering"),
        },
    },
    "king-one-bedroom-acc": {
        **PROJECT_WIDE,
        **ACCESSIBLE_BATH,
        # No GR-302 ruling here: the accessible One Bedroom carries GR-303
        # ("ACCESSIBLE Vanity @ Guest Bath"), a different line entirely, so the
        # GR-302/GR-302L designation question does not arise. apply_rulings
        # hard-failed when this was assumed — which is the point of the check.
    },
    "qq-acc": {
        **PROJECT_WIDE,
        **ACCESSIBLE_BATH,
        # A556 tags BOTH drapery types on one drawing. They are alternates, not
        # a pair — buying both is buying one too many on every accessible key.
        "GR-403": {
            "instanceNote": (
                "⚑ ALTERNATE to GR-404, not a pair — A556 tags both on the same "
                "drawing. Confirm which drapery this room takes; DO NOT order "
                "both"),
        },
        "GR-404": {
            "instanceNote": (
                "⚑ ALTERNATE to GR-403, not a pair — A556 tags both on the same "
                "drawing. Confirm which drapery this room takes; DO NOT order "
                "both"),
        },
    },
}


def key_of(it, iid):
    """Rulings address a line by code, or by '@'+label when it has no code."""
    return it.get("code") or ("@" + (it.get("label") or "").strip())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="verify, write nothing")
    a = ap.parse_args()

    failures, total = [], 0
    for slug, rules in RULINGS.items():
        src = os.path.join(OUT, "template-%s.draft.json" % slug)
        if not os.path.exists(src):
            failures.append("%s: draft missing (%s)" % (slug, src))
            continue
        with open(src, encoding="utf-8") as f:
            doc = json.load(f)

        by_key = {}
        for iid, it in doc["items"].items():
            by_key.setdefault(key_of(it, iid), []).append(iid)

        applied = []
        for key, fields in rules.items():
            ids = by_key.get(key)
            if not ids:
                failures.append("%s: ruling targets %r but no such line exists"
                                % (slug, key))
                continue
            if len(ids) > 1:
                failures.append("%s: ruling target %r is ambiguous (%s)"
                                % (slug, key, ", ".join(ids)))
                continue
            doc["items"][ids[0]].update(fields)
            applied.append(key)

        # A template must never seed field state.
        for iid, it in doc["items"].items():
            if it.get("checked") or it.get("initials") or it.get("issue"):
                failures.append("%s: item %s carries field state" % (slug, iid))
        if doc.get("notes"):
            failures.append("%s: template carries a room note" % slug)

        total += len(applied)
        print("%-24s %2d rulings applied: %s"
              % (slug, len(applied), ", ".join(sorted(applied))))

        if not a.check:
            dst = os.path.join(OUT, "template-%s.json" % slug)
            with open(dst, "w", encoding="utf-8", newline="\n") as f:
                f.write(json.dumps(doc, indent=2, sort_keys=True,
                                   ensure_ascii=True) + "\n")

    if failures:
        sys.stderr.write("\napply_rulings FAILED:\n  - %s\n"
                         % "\n  - ".join(failures))
        sys.exit(1)
    print("\n%d rulings applied across %d templates, no failures."
          % (total, len(RULINGS)))


if __name__ == "__main__":
    main()
