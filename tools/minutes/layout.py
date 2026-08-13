"""Layout engine for H2SEP PII Subcontractor Weekly Meeting Minutes.

Reproduces the geometry of the Procore "Publishing Engine" PDF export that the
project has used for every prior meeting, so a regenerated set of minutes is
visually indistinguishable from the ones already in circulation.

Every constant below was measured off the Meeting #80 export (see
tools/minutes/SPEC.md).  Units are PDF points; the origin is the top-left of
the page.
"""

from __future__ import annotations

import datetime as _dt
import pathlib as _pathlib
from dataclasses import dataclass, field

import pymupdf

# --------------------------------------------------------------------------
# Page frame
# --------------------------------------------------------------------------

PAGE_W = 612.0
PAGE_H = 792.0
LEFT = 36.0
RIGHT = 576.0

# --------------------------------------------------------------------------
# Type
# --------------------------------------------------------------------------

# The source export embeds Arial, Arial Bold, Times New Roman and Courier New.
# Those faces are licensed and are not kept in the repository; extract_fonts.py
# lifts them out of a minutes PDF into ./fonts.  Failing that, the Liberation
# clones match on metrics and line breaking and differ only in letterform.
_VENDORED = _pathlib.Path(__file__).parent / "fonts"
_FALLBACK_DIR = _pathlib.Path("/usr/share/fonts/truetype/liberation")
_FALLBACK = {
    "sans": "LiberationSans-Regular.ttf",
    "sans-bold": "LiberationSans-Bold.ttf",
    "serif": "LiberationSerif-Regular.ttf",
    "mono": "LiberationMono-Regular.ttf",
}


def _fallback(role: str) -> str:
    return str(_FALLBACK_DIR / _FALLBACK[role])


def _vendored(role: str) -> str | None:
    path = _VENDORED / f"{role}.ttf"
    return str(path) if path.exists() else None


def _outlined(path: str) -> frozenset[int]:
    """Codepoints the face can actually draw.

    The faces embedded in the source PDF are true subsets: they carry a full
    cmap but an outline only for the characters that document happened to use.
    A glyph with no contours renders as nothing at all, so coverage has to be
    judged on the outlines, not on the cmap.
    """
    try:
        from fontTools.ttLib import TTFont
    except ImportError:
        return frozenset()
    font = TTFont(path)
    glyf = font.get("glyf")
    if glyf is None:
        return frozenset(font.getBestCmap())
    return frozenset(
        cp
        for cp, name in font.getBestCmap().items()
        if cp == 0x20 or glyf[name].numberOfContours != 0
    )


FONTS = {role: _fallback(role) for role in _FALLBACK}

BODY = 8.0
TITLE = 14.0
HEADING = 10.0

# Distance from the top of a span's bbox down to its baseline, as a fraction
# of the point size.  Measured: 6.21 / 8.0.
BASELINE_RATIO = 0.77625

# --------------------------------------------------------------------------
# Colour
# --------------------------------------------------------------------------

BLACK = (0.0, 0.0, 0.0)
LINK = (0.0, 0.0, 1.0)
RULE = (0.8469, 0.8470, 0.8469)  # #D8D8D8 table borders / separators
FILL = (0.9489, 0.9490, 0.9489)  # #F2F2F2 table header shading
RULE_W = 0.99975
LINK_W = 0.195

# --------------------------------------------------------------------------
# Tables
# --------------------------------------------------------------------------

ROW_H = 20.2612  # a single-line table row
BASE_IN_ROW = 12.2009  # row top -> baseline

# Two line-box heights are in play.  A paragraph whose bullet marker is set in
# 8pt Times (levels 1, 3 and 4) is fractionally taller than one led by the
# 5.36pt Courier "o" of level 2 or by no marker at all.  Which of the two
# applies to a given advance depends on the level being left and the level being
# entered -- measured exhaustively off the Meeting #80 export.
LINE_H = 11.2615        # plain text / level-2 / opening a deeper level
LINE_H_BULLET = 11.3047 # staying at, or closing back to, an 8pt-marker level

# Scheduled Attendees: cell boundaries and text origins
ATT_EDGES = (36.0, 132.75, 256.37, 353.12, 489.60, 576.0)
ATT_HEAD_X = (40.50, 137.25, 260.87, 357.62, 494.10)
ATT_BODY_X = (40.50, 136.75, 260.37, 357.12, 493.60)
ATT_PAD_R = 4.0

# Item tables (SAFETY / Action Items / ...): cell boundaries and text origins
ITEM_EDGES = (36.0, 64.80, 117.64, 264.34, 437.44, 495.04, 532.80, 576.0)
ITEM_HEAD_X = (40.50, 69.30, 122.14, 268.84, 441.94, 499.54, 537.30)
ITEM_BODY_X = (40.50, 69.30, 121.64, 268.34, 441.44, 499.04, 536.80)
ITEM_HEADS = ("No.", " Mtg Origin", "Title", "Assignment", "Due Date", "Priority", "Status")

# The description cell hangs below each item row, indented past the "No." rule.
DESC_X = 69.30
WRAP_R = 571.5  # right-hand wrap boundary for flowed text

# Bullet geometry: marker x, marker font, size, glyph, text x, baseline offset.
# The markers are set from a common bbox top, so the 5.36pt Courier "o" of
# level 2 ends up 2pt above the text baseline while the 8pt Times bullets of
# levels 1, 3 and 4 sit on it.
BULLETS = {
    1: (84.50, "serif", 8.0, "\u2022", 93.30, 0.0),
    2: (108.08, "mono", 5.36, "o", 117.30, -2.00),
    3: (132.46, "serif", 8.0, "\u25aa", 141.30, 0.0),
    4: (156.42, "serif", 8.0, "\u25aa", 165.30, 0.0),
}

# Vertical rhythm between successive body lines, as a function of the list
# level each line sits at.  Derived from the #80 export: a plain line advance
# is LINE_H; opening or closing a list level adds 8pt apiece, and any line that
# lands back at level 1 gets one further 8pt of air.
LEVEL_GAP = 8.0


def base_height(cur_level: int, next_level: int) -> float:
    """Line-box height governing the advance out of `cur_level`."""
    if cur_level in (1, 3, 4) and next_level <= cur_level:
        return LINE_H_BULLET
    return LINE_H


def advance(cur_level: int, next_level: int) -> float:
    """Baseline-to-baseline distance between two description paragraphs.

    Opening or closing a list level costs LEVEL_GAP apiece.
    """
    return base_height(cur_level, next_level) + LEVEL_GAP * abs(next_level - cur_level)


# --------------------------------------------------------------------------
# Page-1 masthead / info grid
# --------------------------------------------------------------------------

LOGO_RECT = (38.0, 40.56, 117.5, 92.98)
MASTHEAD_Y = (41.30, 52.56, 63.82)  # project line, address 1, address 2
MASTHEAD_R = 573.99
RULE_ABOVE_TITLE = 107.0
TITLE_Y = 112.65
RULE_BELOW_TITLE = 132.78
INFO_Y0 = 143.65
INFO_ROW_ADV = 21.01  # last line of a row -> first line of the next
INFO_LINE_ADV = 9.01  # wrapped line inside an info row
INFO_LABEL_X = 38.0
INFO_VALUE_X = 119.0
INFO_LABEL2_X = 308.0
INFO_VALUE2_X = 389.0
INFO_VALUE_WRAP = 571.5
INFO_LABEL_WRAP = 118.0

# Continuation pages
CONT_HEADER_Y = 29.75
CONT_RULE_Y = 40.89
CONT_TABLE_TOP = 50.40
FOOTER_Y = 754.27
FOOTER_CENTER = 306.0
BODY_BOTTOM = 738.66  # deepest a table rule may reach before breaking


# --------------------------------------------------------------------------
# Content model
# --------------------------------------------------------------------------


@dataclass
class Line:
    """One flowed line inside an item's Description cell.

    level 0 renders flush at DESC_X with no marker; levels 1-4 render as
    bullets.  `bold` is used for the "Description" and "Official Documented
    Meeting Minutes" sub-headings.
    """

    text: str
    level: int = 0
    bold: bool = False
    spacer: bool = False
    extra: float = 0.0  # authored space above this paragraph, beyond the model


@dataclass
class Item:
    no: str
    origin: str
    title: str
    status: str = "Open"
    assignment: str = ""
    due: str = ""
    priority: str = ""
    description: list[Line] = field(default_factory=list)


@dataclass
class Section:
    heading: str
    items: list[Item] = field(default_factory=list)


@dataclass
class Attendee:
    name: str
    company: str = ""
    phone: str = ""
    email: str = ""
    attendance: str = ""


@dataclass
class Minutes:
    meeting_no: int
    meeting_date: str
    meeting_time: str
    meeting_location: str
    overview: str
    attachments: list[str]
    attendees: list[Attendee]
    sections: list[Section]
    project_line: str = "Project: 24030 Home2Suites EP Phase II"
    address: tuple[str, str] = ("3386 E. Main Street", "Eagle Pass, Texas 78852")
    video_link: str = "Join Meeting"
    notes: str = ""
    printed_on: str | None = None
    logo: str | None = None

    @property
    def title(self) -> str:
        return (
            "H2SEP PII Subcontractor Weekly Meeting Minutes: "
            f"Meeting #{self.meeting_no}"
        )

    @property
    def running_head(self) -> str:
        return f"Meeting #{self.meeting_no} - H2SEP PII Subcontractor Weekly Meeting"


# --------------------------------------------------------------------------
# Renderer
# --------------------------------------------------------------------------


class Renderer:
    def __init__(self, minutes: Minutes):
        self.m = minutes
        self.doc = pymupdf.open()
        self.page: pymupdf.Page | None = None
        self.pages: list[int] = []
        # Prefer the document's own typefaces where they are available, but
        # only for strings they can actually draw; the Liberation clones are
        # metric-compatible, so falling back mid-document shifts nothing.
        self._paths: dict[str, str] = dict(FONTS)
        self._coverage: dict[str, frozenset[int]] = {}
        self.substituted: dict[str, set[str]] = {}
        for role in FONTS:
            path = _vendored(role)
            if path:
                self._paths[role] = path
                self._coverage[role] = _outlined(path)
        self._fonts: dict[str, pymupdf.Font] = {}
        for role, path in self._paths.items():
            self._fonts[role] = pymupdf.Font(fontfile=path)
            if role in self._coverage:
                self._fonts[role + "~fb"] = pymupdf.Font(fontfile=_fallback(role))
        # Header row to repeat at the top of every continuation page.  Switches
        # between the attendee table and the item table as the flow proceeds.
        self._cont: str = "attendees"

    # -- primitives --------------------------------------------------------

    def resolve(self, role: str, text: str) -> tuple[str, str]:
        """Pick the face for one string: (font key, font file path)."""
        cover = self._coverage.get(role)
        if cover is not None and not all(ord(c) in cover for c in text):
            missing = {c for c in text if ord(c) not in cover}
            self.substituted.setdefault(role, set()).update(missing)
            return role + "~fb", _fallback(role)
        return role, self._paths[role]

    def font(self, name: str) -> pymupdf.Font:
        return self._fonts[name]

    def width(self, text: str, name: str = "sans", size: float = BODY) -> float:
        key, _ = self.resolve(name, text)
        return self.font(key).text_length(text, size)

    def text(
        self,
        x: float,
        y_top: float,
        s: str,
        *,
        name: str = "sans",
        size: float = BODY,
        color=BLACK,
        align: str = "left",
    ) -> None:
        """Draw `s` with its bbox top at `y_top` (matching the source export)."""
        if not s:
            return
        if align == "right":
            x -= self.width(s, name, size)
        elif align == "center":
            x -= self.width(s, name, size) / 2.0
        key, path = self.resolve(name, s)
        self.page.insert_text(
            (x, y_top + size * BASELINE_RATIO),
            s,
            fontname=key,
            fontfile=path,
            fontsize=size,
            color=color,
        )

    def hline(self, x0: float, y: float, x1: float) -> None:
        self.page.draw_line((x0, y), (x1, y), color=RULE, width=RULE_W)

    def vline(self, x: float, y0: float, y1: float) -> None:
        self.page.draw_line((x, y0), (x, y1), color=RULE, width=RULE_W)

    def shade(self, y0: float, y1: float) -> None:
        self.page.draw_rect(
            pymupdf.Rect(LEFT, y0, RIGHT, y1), color=None, fill=FILL, width=0
        )

    def wrap(self, s: str, avail: float, name: str = "sans", size: float = BODY):
        """Greedy word wrap, matching the source export's line breaking."""
        if not s:
            return [""]
        out, cur = [], ""
        for word in s.split(" "):
            trial = word if not cur else f"{cur} {word}"
            if self.width(trial, name, size) <= avail or not cur:
                cur = trial
            else:
                out.append(cur)
                cur = word
        out.append(cur)
        return out

    # -- page management ---------------------------------------------------

    def new_page(self) -> float:
        """Start a page; returns the y at which flowed content may begin."""
        self.page = self.doc.new_page(width=PAGE_W, height=PAGE_H)
        self.pages.append(self.page.number)
        if self.doc.page_count == 1:
            return self.first_page_masthead()
        self.text(
            LEFT + 2.0, CONT_HEADER_Y, self.m.running_head, name="sans-bold"
        )
        self.text(
            MASTHEAD_R, CONT_HEADER_Y, self.m.project_line, name="sans-bold", align="right"
        )
        self.hline(LEFT, CONT_RULE_Y, RIGHT)
        return CONT_TABLE_TOP

    def first_page_masthead(self) -> float:
        if self.m.logo:
            self.page.insert_image(pymupdf.Rect(*LOGO_RECT), filename=self.m.logo)
        self.text(MASTHEAD_R, MASTHEAD_Y[0], self.m.project_line, name="sans-bold", align="right")
        self.text(MASTHEAD_R, MASTHEAD_Y[1], self.m.address[0], align="right")
        self.text(MASTHEAD_R, MASTHEAD_Y[2], self.m.address[1], align="right")
        self.hline(LEFT, RULE_ABOVE_TITLE, RIGHT)
        self.text(FOOTER_CENTER, TITLE_Y, self.m.title, name="sans-bold", size=TITLE, align="center")
        self.hline(LEFT, RULE_BELOW_TITLE, RIGHT)
        y = self.info_grid()
        self.hline(LEFT, y, RIGHT)
        self.text(LEFT, y + 9.97, "Scheduled Attendees", name="sans-bold", size=HEADING)
        return y + 24.78

    def _hyperlink(self, x: float, y_top: float, s: str) -> None:
        """Blue label with the thin underline the source export draws."""
        self.text(x, y_top, s, color=LINK)
        yy = y_top + BODY * BASELINE_RATIO + 1.03
        self.page.draw_line(
            (x, yy), (x + self.width(s), yy), color=LINK, width=LINK_W
        )

    def info_grid(self) -> float:
        """The Meeting Date / Location / Overview / Notes / Attachments block.

        Each row is a pair of label+value columns; the row advances by the
        number of lines its tallest cell needed.
        """
        rows = [
            (["Meeting Date"], [self.m.meeting_date], ["Meeting Time"], [self.m.meeting_time], None),
            (["Meeting Location"], [self.m.meeting_location],
             ["Video Conferencing", "Link"], [self.m.video_link], "link2"),
            (["Overview"], self.wrap(self.m.overview, INFO_VALUE_WRAP - INFO_VALUE_X), [], [], None),
            (["Notes"], [self.m.notes] if self.m.notes else [], [], [], None),
            (["Attachments"], list(self.m.attachments), [], [], "link1"),
        ]
        y = INFO_Y0
        for label, value, label2, value2, link in rows:
            lines = max(len(label), len(value), len(label2), len(value2), 1)
            for i, part in enumerate(label):
                self.text(INFO_LABEL_X, y + i * INFO_LINE_ADV, part, name="sans-bold")
            for i, part in enumerate(value):
                if link == "link1":
                    self._hyperlink(INFO_VALUE_X, y + i * INFO_LINE_ADV, part)
                else:
                    self.text(INFO_VALUE_X, y + i * INFO_LINE_ADV, part)
            for i, part in enumerate(label2):
                self.text(INFO_LABEL2_X, y + i * INFO_LINE_ADV, part, name="sans-bold")
            for i, part in enumerate(value2):
                if link == "link2":
                    self._hyperlink(INFO_VALUE2_X, y + i * INFO_LINE_ADV, part)
                else:
                    self.text(INFO_VALUE2_X, y + i * INFO_LINE_ADV, part)
            y += (lines - 1) * INFO_LINE_ADV + INFO_ROW_ADV
        # back off the trailing row advance and apply the block's own bottom pad
        return y - INFO_ROW_ADV + 20.15

    # -- Scheduled Attendees table ----------------------------------------

    def attendee_header(self, y: float) -> float:
        self.shade(y, y + ROW_H)
        for i, head in enumerate(("Name", "Company", "Phone Number", "Email", "Attendance")):
            self.text(ATT_HEAD_X[i], y + BASE_IN_ROW - BODY * BASELINE_RATIO, head, name="sans-bold")
        self._attendee_rules(y, y + ROW_H, outer=True)
        return y + ROW_H

    def _attendee_rules(self, y0: float, y1: float, outer: bool = False) -> None:
        self.hline(LEFT, y0, RIGHT)
        self.hline(LEFT, y1, RIGHT)
        edges = ATT_EDGES if outer else (ATT_EDGES[0], ATT_EDGES[-1])
        for x in edges:
            self.vline(x, y0, y1)

    def _attendee_cells(self, a: Attendee):
        return [
            self.wrap(a.name, ATT_EDGES[1] - ATT_BODY_X[0] - ATT_PAD_R),
            self.wrap(a.company, ATT_EDGES[2] - ATT_BODY_X[1] - ATT_PAD_R),
            self.wrap(a.phone, ATT_EDGES[3] - ATT_BODY_X[2] - ATT_PAD_R),
            self.wrap(a.email, ATT_EDGES[4] - ATT_BODY_X[3] - ATT_PAD_R),
            self.wrap(a.attendance, ATT_EDGES[5] - ATT_BODY_X[4] - ATT_PAD_R),
        ]

    def attendee_height(self, a: Attendee) -> float:
        cells = self._attendee_cells(a)
        n = max(len([p for p in c if p]) for c in cells) or 1
        return ROW_H + (n - 1) * LINE_H

    def attendee_row(self, y: float, a: Attendee) -> float:
        cells = self._attendee_cells(a)
        h = self.attendee_height(a)
        for ci, parts in enumerate(cells):
            for li, part in enumerate(parts):
                if not part:
                    continue
                self.text(
                    ATT_BODY_X[ci],
                    y + BASE_IN_ROW - BODY * BASELINE_RATIO + li * LINE_H,
                    part,
                )
        self._attendee_rules(y, y + h)
        return y + h

    # -- item tables -------------------------------------------------------

    def item_header(self, y: float) -> float:
        self.shade(y, y + ROW_H)
        for i, head in enumerate(ITEM_HEADS):
            self.text(ITEM_HEAD_X[i], y + BASE_IN_ROW - BODY * BASELINE_RATIO, head, name="sans-bold")
        self.hline(LEFT, y, RIGHT)
        self.hline(LEFT, y + ROW_H, RIGHT)
        for x in ITEM_EDGES:
            self.vline(x, y, y + ROW_H)
        return y + ROW_H

    def item_row(self, y: float, it: Item, has_desc: bool = True) -> float:
        vals = (it.no, f" {it.origin}", it.title, it.assignment, it.due, it.priority, it.status)
        for i, v in enumerate(vals):
            if v.strip():
                self.text(ITEM_BODY_X[i], y + BASE_IN_ROW - BODY * BASELINE_RATIO, v)
        # the row is fractionally shorter when a Description cell hangs below it
        h = 19.762 if has_desc else ROW_H
        self.hline(LEFT, y + h, RIGHT)
        for x in (ITEM_EDGES[0], ITEM_EDGES[1], ITEM_EDGES[-1]):
            self.vline(x, y, y + h)
        return y + h

    # -- footers -----------------------------------------------------------

    DISCLAIMER = (
        "These meeting minutes are believed to be an accurate reflection of those "
        "items discussed and the conclusions that were reached during the referenced meeting.",
        "Please contact if there are any discrepancies or questions with the content "
        "of these minutes.",
    )
    DISCLAIMER_Y = 729.139
    DISCLAIMER_ADV = 9.854
    DISCLAIMER_SIZE = 7.0

    def stamp_disclaimer(self) -> None:
        """Centred closing note, anchored to the foot of the final page."""
        self.page = self.doc[self.doc.page_count - 1]
        for i, line in enumerate(self.DISCLAIMER):
            y = self.DISCLAIMER_Y + i * self.DISCLAIMER_ADV
            self.text(
                FOOTER_CENTER,
                y - self.DISCLAIMER_SIZE * BASELINE_RATIO,
                line,
                size=self.DISCLAIMER_SIZE,
                align="center",
            )

    def stamp_footers(self) -> None:
        printed = self.m.printed_on or _dt.datetime.now().strftime(
            "%b %d, %Y %I:%M %p CDT"
        )
        total = self.doc.page_count
        for i in range(1, total + 1):
            self.page = self.doc[i - 1]
            self.text(FOOTER_CENTER, FOOTER_Y, f"Page {i} of {total}", align="center")
            self.text(MASTHEAD_R, FOOTER_Y, f"Printed On: {printed}", align="right")

    def save(self, path: str) -> None:
        self.stamp_disclaimer()
        self.stamp_footers()
        self.doc.save(path, deflate=True)

    def font_report(self) -> str:
        used = [r for r in FONTS if r in self._coverage]
        if not used:
            return "typefaces: Liberation throughout (no vendored faces found)"
        lines = [f"typefaces: document's own faces for {', '.join(sorted(used))}"]
        for role, chars in sorted(self.substituted.items()):
            glyphs = " ".join(sorted(chars))
            lines.append(
                f"  {role}: fell back to Liberation for strings containing {glyphs}"
                " (absent from the embedded subset)"
            )
        return "\n".join(lines)

    # -- description cell --------------------------------------------------

    DESC_TOP_PAD = BASE_IN_ROW          # cell top -> first baseline
    DESC_BOTTOM_PAD = 8.060             # last baseline -> cell bottom rule at level 0
    HEADING_AIR = 9.0                   # extra air above a bold sub-heading

    def _bottom_pad(self, level: int) -> float:
        """Space below the last line of a cell: the base pad, one gap for each
        open list level, and the taller line box of an 8pt-marker level."""
        pad = self.DESC_BOTTOM_PAD + LEVEL_GAP * level
        if level in (1, 3, 4):
            pad += LINE_H_BULLET - LINE_H
        return pad

    def _desc_lines(self, item: Item):
        """Expand an item's description into concrete, positioned output lines.

        Yields dicts with the x origin, the text, whether a bullet marker is
        drawn on that line (wrapped continuations do not repeat the marker),
        and the list level the line sits at.
        """
        out = [
            {"x": DESC_X, "text": "Description", "bold": True, "marker": None,
             "level": 0, "first": True, "empty": False}
        ]
        for ln in item.description:
            if ln.spacer:
                out.append({"x": DESC_X, "text": "", "bold": False, "marker": None,
                            "level": ln.level, "first": True, "empty": False})
                continue
            if ln.level == 0:
                x = DESC_X
            else:
                x = BULLETS[ln.level][4]
            parts = self.wrap(ln.text, WRAP_R - x, "sans-bold" if ln.bold else "sans")
            if ln.level > 0 and not ln.text:
                parts = [""]
            for i, part in enumerate(parts):
                out.append(
                    {
                        "x": x,
                        "text": part,
                        "bold": ln.bold,
                        "marker": ln.level if (i == 0 and ln.level > 0) else None,
                        "level": ln.level,
                        "first": i == 0,
                        "empty": ln.level > 0 and not ln.text,
                        "extra": ln.extra if i == 0 else 0.0,
                    }
                )
        return out

    def _advance(self, prev, cur) -> float:
        """Baseline-to-baseline distance between two rendered description lines."""
        return self._model_advance(prev, cur) + cur.get("extra", 0.0)

    def _model_advance(self, prev, cur) -> float:
        if prev.get("empty"):
            # an empty list item contributes no line box, only the level change
            return LEVEL_GAP * max(cur["level"] - prev["level"], 1)
        if cur.get("empty"):
            return LINE_H + LEVEL_GAP
        if cur["bold"] and not prev["bold"]:
            return LINE_H + LEVEL_GAP * max(prev["level"], 0) + self.HEADING_AIR
        if not cur["first"]:
            return LINE_H            # wrapped continuation of the line above
        return advance(prev["level"], cur["level"])

    def flow_description(self, y: float, item: Item) -> float:
        """Render the Description cell, breaking across pages as needed."""
        lines = self._desc_lines(item)
        cell_top = y
        baseline = y + self.DESC_TOP_PAD
        last_drawn = baseline
        prev_level = 0
        prev = None
        for cur in lines:
            if prev is not None:
                baseline += self._advance(prev, cur)
            if baseline + self._bottom_pad(cur["level"]) > BODY_BOTTOM:
                self._desc_rules(cell_top, last_drawn + self._bottom_pad(prev_level),
                                 closed=True)
                y = self.new_page()
                y = self.item_header(y)
                cell_top = y
                baseline = y + self.DESC_TOP_PAD
            top = baseline - BODY * BASELINE_RATIO
            if cur["marker"]:
                mx, mfont, msize, glyph, _, dy = BULLETS[cur["marker"]]
                self.text(mx, baseline + dy - msize * BASELINE_RATIO, glyph,
                          name=mfont, size=msize)
            if cur["text"]:
                self.text(cur["x"], top, cur["text"],
                          name="sans-bold" if cur["bold"] else "sans")
            prev = cur
            last_drawn = baseline
            prev_level = cur["level"]
        bottom = baseline + self._bottom_pad(prev_level)
        self._desc_rules(cell_top, bottom, closed=True)
        return bottom

    def _desc_rules(self, y0: float, y1: float, closed: bool) -> None:
        if y1 <= y0:
            return
        for x in (ITEM_EDGES[0], ITEM_EDGES[1], ITEM_EDGES[-1]):
            self.vline(x, y0, y1)
        if closed:
            self.hline(LEFT, y1, RIGHT)

    # -- document driver ---------------------------------------------------

    SECTION_AIR_ABOVE = 13.38   # closing rule -> section heading bbox top
    SECTION_AIR_BELOW = 14.22   # section heading bbox top -> table top
    ITEM_GAP = 11.76            # closing rule -> next item's header row

    def render(self) -> None:
        y = self.new_page()
        y = self.attendee_header(y)
        for a in self.m.attendees:
            if y + self.attendee_height(a) > BODY_BOTTOM:
                y = self.new_page()
                y = self.attendee_header(y)
            y = self.attendee_row(y, a)

        y += self.ITEM_GAP
        self.hline(LEFT, y, RIGHT)

        for sec in self.m.sections:
            y = self._section(y, sec)

    def _section(self, y: float, sec: Section) -> float:
        # A section heading may stand alone at the foot of a page with its table
        # starting overleaf, which is what the source export does.
        heading_y = y + self.SECTION_AIR_ABOVE
        if heading_y + HEADING > BODY_BOTTOM:
            heading_y = self.new_page()
        self.text(LEFT, heading_y, sec.heading, name="sans-bold", size=HEADING)
        y = heading_y + self.SECTION_AIR_BELOW
        for idx, item in enumerate(sec.items):
            if y + ROW_H * 2 > BODY_BOTTOM:
                y = self.new_page()
            y = self.item_header(y)
            y = self.item_row(y, item, has_desc=bool(item.description))
            if item.description:
                y = self.flow_description(y, item)
            if idx + 1 < len(sec.items):
                y += self.ITEM_GAP
        return y
