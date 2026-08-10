#!/usr/bin/env python3
"""gen_spaces.py — draft checklist docs for every COMMON-AREA space from the DB.

Guest rooms come from templates because 115 rooms share 12 packages. Spaces are
the opposite: 66 spaces, every one unique — so each space gets its own doc
generated straight from `space_items`, no template layer at all.

Scope (Austin's ruling 2026-08-10): the guest-room families PLUS finishes —
  FF&E - * / Appliance / Bath Accessory / Flooring / Paint / Wall Covering /
  Stone / Surround / Ceiling ("Ceiling" rows only exist via enrichment files;
  the extraction DB predates them).

Rules carried over from the guest-room pipeline:
  * one LINE per (tag, description, reliability) carrying a ×qty badge; rows
    that differ in reliability do NOT collapse — a FLAGGED instance keeps its
    own line and its own note instead of hiding inside a clean count.
  * FLAGGED/MEDIUM lines must explain themselves: carry the DB's own `note`
    (the evidence), else say plainly that no reason is recorded.
  * force clean state — a seed must never invent a check-off.
  * deterministic ids: tag slug (`pa300_a`) or md5(category|description|note)
    for untagged rows. Never derived from the space number.

Enrichment: tools/out/space-enrich/<space_no>.json, when present, contributes
extra lines (typically Ceiling / finish lines read from finishes.md and the
per-sheet extractions). Each enriched line must carry its own src citation and
reliability; this script refuses files whose lines lack either.

Usage:
    python3 tools/gen_spaces.py                # all spaces -> tools/out/spaces/
    python3 tools/gen_spaces.py --space 003    # one space, prints a summary
"""

import argparse
import hashlib
import json
import os
import re
import sqlite3
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(HERE, "..", "data", "project.sqlite")
OUT_DIR = os.path.join(HERE, "out", "spaces")
ENRICH_DIR = os.path.join(HERE, "out", "space-enrich")

SCOPE_CATEGORIES = (
    "FF&E - Casegoods", "FF&E - Bedding", "FF&E - Seating", "FF&E - Lighting",
    "FF&E - Window", "FF&E - Art / Mirror", "FF&E - Misc",
    "Appliance", "Bath Accessory",
    "Flooring", "Paint", "Wall Covering", "Stone / Surround", "Ceiling",
)

# Crew walk order: ceiling down the walls to the floor, then doors, then FF&E.
# Must stay in step with CATEGORY_ORDER in js/util.js.
CAT_SORT = (
    "Drywall", "Paint", "Wall Covering", "Ceiling", "Flooring",
    "Stone / Surround", "Doors", "Electrical", "Mechanical", "Plumbing",
    "Fire Sprinkler", "Fire Alarm", "Low Voltage", "Bath Accessory",
    "Appliance", "FF&E - Casegoods", "FF&E - Bedding", "FF&E - Seating",
    "FF&E - Lighting", "FF&E - Window", "FF&E - Art / Mirror", "FF&E - Misc",
)

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

RANK = {"FLAGGED": 0, "MEDIUM": 1, "HIGH": 2}


def slug(s):
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", s.lower())).strip("-")


def stable_id(category, description, note):
    h = hashlib.md5(("%s|%s|%s" % (category, description or "", note or ""))
                    .encode("utf-8")).hexdigest()[:10]
    return "x_" + h


def build_space(cx, sp):
    rows = cx.execute(
        "SELECT tag, category, description, instance_note, trade_responsible,"
        "       source_sheet, reliability, note"
        " FROM space_items WHERE space_no = ? ORDER BY rowid", (sp["space_no"],)
    ).fetchall()
    rows = [r for r in rows if r["category"] in SCOPE_CATEGORIES]

    # ---- collapse onto lines: (tag, description, reliability) ----
    groups = {}
    order = []
    for r in rows:
        key = (r["tag"] or "", r["description"] or "", r["reliability"] or "")
        if key not in groups:
            groups[key] = []
            order.append(key)
        groups[key].append(r)

    items = {}
    used_ids = {}
    for key in order:
        rws = groups[key]
        r0 = rws[0]
        qty = len(rws)
        # id: tag slug with instance letter, or content hash for untagged
        if r0["tag"]:
            base = slug(r0["tag"]).replace("-", "")
            n = used_ids.get(base, 0)
            used_ids[base] = n + 1
            iid = "%s_%s" % (base, chr(97 + n))
        else:
            iid = stable_id(r0["category"], r0["description"], r0["note"])
            if iid in items:            # same cat+desc+note, different rel — rare
                iid = iid + "b"
        # per-instance disambiguators ("2 of 6") die on collapse, exactly like
        # make_template.py: the ×qty badge carries the count.
        inote = "" if qty > 1 else (r0["instance_note"] or "").strip()

        # A collapse group can span rows with DIFFERENT provenance — Lobby
        # PA-106 is 24 rows per ID-1.7 plus 2 carried delta rows per A510.3,
        # and keeping only row 0's src would silently launder the split the
        # extraction deliberately preserved. Union src and notes instead.
        srcs, notes = [], []
        for r in rws:
            s = (r["source_sheet"] or "").strip()
            n = (r["note"] or "").strip()
            if s and s not in srcs:
                srcs.append(s)
            if n and n not in notes:
                notes.append(n)

        it = {
            "category": r0["category"],
            "code": r0["tag"] or "",
            "label": (r0["description"] or "").strip(),
            "qty": qty,
            "reliability": r0["reliability"] or "HIGH",
            "src": " + ".join(srcs),
            "trade": r0["trade_responsible"] or "",
            "derived": True,
            "instanceNote": inote,
        }
        it.update(CLEAN)

        # FLAGGED/MEDIUM must explain themselves (same contract as rooms).
        if it["reliability"] in ("FLAGGED", "MEDIUM"):
            why = " · ".join(notes)
            if why:
                why = "⚑ " + why
            else:
                why = ("⚑ graded %s in the reference set%s — no reason "
                       "recorded; verify against the sheet before ordering."
                       % (it["reliability"],
                          " (source: %s)" % it["src"] if it["src"] else ""))
            it["instanceNote"] = (it["instanceNote"] + " — " + why).strip(" —") \
                if it["instanceNote"] else why

        items[iid] = it

    # ---- enrichment lines (Ceiling etc. from the drawing MDs) ----
    epath = os.path.join(ENRICH_DIR, "%s.json" % sp["space_no"])
    enriched = 0
    if os.path.exists(epath):
        with open(epath, encoding="utf-8") as f:
            extra = json.load(f)
        for e in extra.get("items", []):
            for req in ("category", "label", "src", "reliability"):
                if not e.get(req):
                    sys.exit("enrich %s: line %r lacks required %r — every "
                             "added line must cite its sheet and carry a grade"
                             % (sp["space_no"], e.get("label"), req))
            if e["category"] not in SCOPE_CATEGORIES:
                sys.exit("enrich %s: category %r outside scope"
                         % (sp["space_no"], e["category"]))
            iid = e.get("id") or stable_id(e["category"], e["label"],
                                           e.get("instanceNote", ""))
            if iid in items:
                sys.exit("enrich %s: id %s collides with a DB line"
                         % (sp["space_no"], iid))
            it = {
                "category": e["category"], "code": e.get("code", ""),
                "label": e["label"].strip(), "qty": int(e.get("qty", 1)),
                "reliability": e["reliability"], "src": e["src"],
                "trade": e.get("trade", ""), "derived": True,
                "instanceNote": (e.get("instanceNote") or "").strip(),
            }
            if it["reliability"] in ("FLAGGED", "MEDIUM") and not it["instanceNote"]:
                sys.exit("enrich %s: %s graded %s but carries no explanation"
                         % (sp["space_no"], it["label"][:40], it["reliability"]))
            it.update(CLEAN)
            items[iid] = it
            enriched += 1

    # ---- sort: crew walk order, then tag/label within category ----
    def sort_key(kv):
        it = kv[1]
        ci = CAT_SORT.index(it["category"]) if it["category"] in CAT_SORT else 99
        return (ci, it["code"] or "￿", it["label"])
    for i, (iid, it) in enumerate(sorted(items.items(), key=sort_key)):
        it["sort"] = (i + 1) * 10

    items = {iid: {f: it.get(f) for f in ITEM_FIELDS} for iid, it in items.items()}

    doc = {
        "number": sp["space_no"],
        "floor": int(sp["floor"]),
        "type": "space-" + slug(sp["name"]),
        "typeLabel": sp["name"],
        "items": items,
        "notes": {},                    # never seed a note
        "deleted": False,
        "schemaV": 3,
    }
    return doc, len(rows), enriched


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--space", help="only this space_no")
    a = ap.parse_args()

    cx = sqlite3.connect(DB_PATH)
    cx.row_factory = sqlite3.Row
    os.makedirs(OUT_DIR, exist_ok=True)

    spaces = cx.execute("SELECT space_no, name, floor, note, primary_sheet"
                        " FROM spaces ORDER BY floor, space_no").fetchall()
    if a.space:
        spaces = [s for s in spaces if s["space_no"] == a.space]
        if not spaces:
            sys.exit("no space %r" % a.space)

    meta = {}
    total_lines = 0
    for sp in spaces:
        doc, dbrows, enriched = build_space(cx, sp)
        out = os.path.join(OUT_DIR, "space-%s.json" % sp["space_no"])
        with open(out, "w", encoding="utf-8", newline="\n") as f:
            f.write(json.dumps(doc, indent=2, sort_keys=True, ensure_ascii=True) + "\n")
        n = len(doc["items"])
        total_lines += n
        flags = sum(1 for i in doc["items"].values() if i["reliability"] == "FLAGGED")
        print("%-7s %-38s f%s  %3d rows -> %3d lines (%d enriched, %d flagged)"
              % (sp["space_no"], sp["name"], sp["floor"], dbrows, n, enriched, flags))
        meta[sp["space_no"]] = {
            "name": sp["name"], "floor": int(sp["floor"]),
            "note": (sp["note"] or "").strip(),
            "sheet": sp["primary_sheet"] or "",
        }

    if not a.space:
        # Static display metadata for the app (names/plan notes are drawing
        # facts, not field state — they version with the code, not Firestore).
        mpath = os.path.join(HERE, "..", "js", "space-meta.js")
        with open(mpath, "w", encoding="utf-8", newline="\n") as f:
            f.write("// AUTO-GENERATED by tools/gen_spaces.py — do not edit by hand.\n"
                    "// Display metadata for common-area spaces: the sheet's own name,\n"
                    "// the governing plan and its context note, keyed by space number.\n"
                    "export const SPACE_META = "
                    + json.dumps(meta, indent=2, sort_keys=True, ensure_ascii=True)
                    + ";\n")
        print("\n%d spaces, %d total lines; wrote js/space-meta.js" % (len(spaces), total_lines))


if __name__ == "__main__":
    main()
