"""Parse a Procore-exported minutes PDF back into the JSON content model.

The export encodes list depth purely in x-position, so levels are recovered
from the marker/text origins rather than from any structural markup.  Running
this over Meeting #80 and re-rendering the result is the regression test for
tools/minutes/layout.py.
"""

from __future__ import annotations

import json
import sys

import pymupdf

from layout import ATT_BODY_X, BULLETS, DESC_X, ITEM_BODY_X

NBSP = " "
TOL = 1.2

TEXT_X = {lvl: spec[4] for lvl, spec in BULLETS.items()}
MARKER_X = {lvl: spec[0] for lvl, spec in BULLETS.items()}
# Repeated at the top of every continuation page; the "Mtg Origin" cell shares
# an x origin with the description column and must not be read as body text.
TABLE_HEADS = {
    "No.", "Mtg Origin", "Title", "Assignment", "Due Date", "Priority", "Status",
    "Name", "Company", "Phone Number", "Email", "Attendance",
}
SECTION_HEADINGS = {
    "SAFETY",
    "Action Items",
    "CONSTRUCTION PROGRESS",
    "RFI/ SUBMITTALS/ PAY APPS",
    "SCHEDULE & COORDINATION",
    "DELAY/ IMPACTS",
    "QUESTIONS/ COMMENTS",
    "NEXT MEETING",
}


def near(a: float, b: float, tol: float = TOL) -> bool:
    return abs(a - b) <= tol


def spans(doc):
    """Every non-empty span in reading order, tagged with its page."""
    for pno, page in enumerate(doc):
        rows = []
        for block in page.get_text("dict")["blocks"]:
            if block["type"] != 0:
                continue
            for line in block["lines"]:
                for s in line["spans"]:
                    text = s["text"].replace(NBSP, " ")
                    # a leading nbsp shifts the origin right of the real text column;
                    # for an all-blank span there is no text to shift toward
                    lead = 0 if not text.strip() else len(text) - len(text.lstrip(" "))
                    rows.append(
                        {
                            "page": pno,
                            "x": round(s["origin"][0] - lead * 2.224, 2),
                            "raw_x": round(s["origin"][0], 2),
                            "blank": not text.strip(),
                            "y": round(s["origin"][1], 2),
                            "size": round(s["size"], 2),
                            "font": s["font"],
                            "bold": "Bold" in s["font"],
                            "text": text,
                        }
                    )
        rows.sort(key=lambda r: (r["y"], r["x"]))
        yield from rows


def level_of(x: float) -> int | None:
    for lvl, tx in TEXT_X.items():
        if near(x, tx):
            return lvl
    if near(x, DESC_X):
        return 0
    return None


def span_level(r) -> int | None:
    """List level of a text span.

    A leading non-breaking space sometimes pushes the recorded origin one space
    right of the column, and sometimes is itself set at the column, so try the
    literal origin first and the space-corrected one second.
    """
    lvl = level_of(r["raw_x"])
    if lvl is None:
        lvl = level_of(r["x"])
    return lvl


def is_marker(s) -> int | None:
    for lvl, mx in MARKER_X.items():
        if near(s["x"], mx) and s["text"].strip() in {"•", "o", "▪"}:
            return lvl
    return None


def extract(path: str) -> dict:
    doc = pymupdf.open(path)
    rows = list(spans(doc))

    out = {
        "meeting_no": None,
        "meeting_date": "",
        "meeting_time": "",
        "meeting_location": "",
        "video_link": "Join Meeting",
        "overview": "",
        "notes": "",
        "attachments": [],
        "attendees": [],
        "sections": [],
    }

    # --- masthead / info grid (page 1 only) ------------------------------
    p1 = [r for r in rows if r["page"] == 0]
    for r in p1:
        if r["blank"]:
            continue
        if r["size"] == 14.0:
            out["meeting_no"] = int(r["text"].rsplit("#", 1)[1])
    labels = {
        "Meeting Date": "meeting_date",
        "Meeting Time": "meeting_time",
        "Meeting Location": "meeting_location",
    }
    for r in p1:
        if r["blank"]:
            continue
        if r["text"].strip() in labels and r["bold"]:
            key = labels[r["text"].strip()]
            vx = 119.0 if r["x"] < 100 else 389.0
            same = [q for q in p1 if near(q["y"], r["y"]) and near(q["x"], vx)]
            if same:
                out[key] = same[0]["text"].strip()
    ov = [
        r
        for r in p1
        if near(r["x"], 119.0) and not r["bold"] and not r["blank"] and 190 < r["y"] < 224
    ]
    out["overview"] = " ".join(x["text"].strip() for x in ov).strip()
    att = [r for r in p1 if near(r["x"], 119.0) and not r["blank"] and r["y"] > 244 and r["y"] < 262]
    out["attachments"] = [a["text"].strip() for a in att]

    # --- Scheduled Attendees ---------------------------------------------
    att_rows: dict[float, dict] = {}
    for r in rows:
        col = None
        for i, cx in enumerate(ATT_BODY_X):
            if near(r["x"], cx):
                col = i
                break
        if col is None or r["bold"] or r["blank"]:
            continue
        if r["page"] == 0 and r["y"] < 300:
            continue
        if r["page"] > 1:
            continue
        if r["page"] == 1 and r["y"] > 150:
            continue
        key = (r["page"], round(r["y"], 1))
        # attach wrapped continuation lines to the row that opened above them
        owner = None
        for k in sorted(att_rows):
            if k[0] == key[0] and 0 < key[1] - k[1] < 12.5:
                owner = k
        if owner is None:
            att_rows.setdefault(key, {})
            owner = key
        cell = att_rows[owner]
        cell[col] = (cell.get(col, "") + " " + r["text"].strip()).strip()
    for k in sorted(att_rows):
        c = att_rows[k]
        out["attendees"].append(
            {
                "name": c.get(0, ""),
                "company": c.get(1, ""),
                "phone": c.get(2, ""),
                "email": c.get(3, ""),
                "attendance": c.get(4, ""),
            }
        )

    # --- sections and items ----------------------------------------------
    # A blank span only means a spacer line when nothing else is set on that
    # baseline; blanks that share a baseline with text are just leading padding
    # between a bullet marker and its words.
    occupied = {
        (r["page"], r["y"])
        for r in rows
        if not r["blank"] and span_level(r) is not None
    }

    section = None
    item = None
    item_y = -1.0
    pending_marker: int | None = None
    prev_line = None

    for r in rows:
        t = r["text"].strip()
        if r["blank"]:
            if (r["page"], r["y"]) in occupied:
                continue
            lvl = level_of(r["x"])
            if item is not None and lvl is not None and item["description"]:
                item["description"].append({"text": "", "level": lvl, "spacer": True})
                prev_line = None
            continue
        if r["bold"] and t in TABLE_HEADS:
            continue
        if r["size"] == 10.0 and r["bold"] and t in SECTION_HEADINGS:
            section = {"heading": t, "items": []}
            out["sections"].append(section)
            item = None
            continue
        if section is None:
            continue
        if near(r["x"], ITEM_BODY_X[0]) and not r["bold"] and "." in t and t[0].isdigit():
            item = {
                "no": t,
                "origin": "",
                "title": "",
                "assignment": "",
                "due": "",
                "priority": "",
                "status": "",
                "description": [],
            }
            section["items"].append(item)
            item_y = r["y"]
            prev_line = None
            continue
        if item is None:
            continue
        on_item_row = near(r["y"], item_y, 0.6)
        if on_item_row and near(r["raw_x"], ITEM_BODY_X[1], 0.4) and not r["bold"] and not item["origin"]:
            item["origin"] = t
            continue
        if on_item_row and near(r["x"], ITEM_BODY_X[2]) and not item["title"]:
            item["title"] = t
            continue
        if on_item_row and near(r["x"], ITEM_BODY_X[6]) and not item["status"]:
            item["status"] = t
            continue

        lvl = is_marker(r)
        if lvl is not None:
            if pending_marker is not None:
                # the previous marker never got text: an empty list item
                item["description"].append(
                    {"text": "", "level": pending_marker, "bold": False}
                )
                prev_line = None
            pending_marker = lvl
            continue

        lvl = span_level(r)
        if lvl is None:
            continue
        if t == "Description" and r["bold"]:
            continue  # the renderer emits this label itself
        if pending_marker is not None or prev_line is None or lvl != prev_line["level"]:
            entry = {"text": t, "level": lvl, "bold": r["bold"],
                     "_y0": r["y"], "_y1": r["y"], "_page": r["page"]}
            item["description"].append(entry)
            prev_line = entry
        else:
            # wrapped continuation of the line above
            prev_line["text"] = f"{prev_line['text']} {t}"
            prev_line["_y1"] = r["y"]
            prev_line["_page"] = r["page"]
        pending_marker = None

    _record_extra_gaps(out)
    for sec in out["sections"]:
        for it in sec["items"]:
            for ln in it["description"]:
                for k in ("_y0", "_y1", "_page"):
                    ln.pop(k, None)
    return out


def _record_extra_gaps(out: dict) -> None:
    """Note any vertical space the layout model does not predict.

    The source document was authored by hand, and some blocks carry an extra
    paragraph break that no geometric rule accounts for.  Measuring the residual
    here lets a regenerated document reproduce the original spacing exactly and
    lets an edited document inherit each block's spacing.
    """
    from layout import LINE_H, advance

    for sec in out["sections"]:
        for it in sec["items"]:
            desc = it["description"]
            for i in range(1, len(desc)):
                prev, cur = desc[i - 1], desc[i]
                if "_y1" not in prev or "_y0" not in cur:
                    continue
                if prev.get("_page") != cur.get("_page"):
                    continue
                observed = cur["_y0"] - prev["_y1"]
                if cur.get("bold") and not prev.get("bold"):
                    predicted = LINE_H + 8.0 * max(prev["level"], 0) + 9.0
                else:
                    predicted = advance(prev["level"], cur["level"])
                delta = observed - predicted
                if abs(delta) > 0.05:
                    cur["extra"] = round(delta, 4)


if __name__ == "__main__":
    print(json.dumps(extract(sys.argv[1]), indent=2, ensure_ascii=False))
