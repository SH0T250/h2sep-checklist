#!/usr/bin/env python3
"""Render the signage research package to a print-ready HTML book.

Inline markdown links become numbered citations; every unique URL is collected
into a References appendix so the PDF stays citable on paper, where a hyperlink
is invisible. Section page numbers in the contents are filled in on a second
pass by build.sh, which reads them back out of the rendered PDF.
"""
import html
import json
import re
import sys
from pathlib import Path

SRC = Path("research/signage")
# url -> (citation number, label). Numbered in order of first appearance; the
# label is whatever the first link to that URL called it.
REFS: dict[str, tuple[int, str]] = {}


def cite(url: str, label: str = "") -> int:
    if url not in REFS:
        REFS[url] = (len(REFS) + 1, label.strip())
    elif label.strip() and not REFS[url][1]:
        REFS[url] = (REFS[url][0], label.strip())
    return REFS[url][0]


# ---------------------------------------------------------------- inline pass

def inline(text: str) -> str:
    """Escape, then re-introduce the inline markup we actually use."""
    slots: list[str] = []

    def stash(html_fragment: str) -> str:
        slots.append(html_fragment)
        return f"\x00{len(slots) - 1}\x00"

    # Code spans first - their contents must not be parsed as anything else.
    text = re.sub(r"`([^`]+)`",
                  lambda m: stash(f"<code>{html.escape(m.group(1))}</code>"),
                  text)
    # Links become text + a superscript citation number.
    def link(m):
        label, url = m.group(1), m.group(2)
        plain = re.sub(r"[*`_]", "", label)
        return stash(f'<a href="{html.escape(url, quote=True)}">{inline(label)}</a>'
                     f'<sup class="cite">{cite(url, plain)}</sup>')
    text = re.sub(r"\[([^\]]+)\]\((https?://[^)\s]+)\)", link, text)

    text = html.escape(text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<![\w*])\*([^*\n]+)\*(?![\w*])", r"<em>\1</em>", text)
    text = re.sub(r"(?<![\w_])_([^_\n]+)_(?![\w_])", r"<em>\1</em>", text)

    for i, frag in enumerate(slots):
        text = text.replace(f"\x00{i}\x00", frag)
    return text


# ----------------------------------------------------------------- block pass

def split_row(row: str) -> list[str]:
    row = row.strip()
    if row.startswith("|"):
        row = row[1:]
    if row.endswith("|"):
        row = row[:-1]
    # Protect escaped pipes and pipes inside code spans before splitting.
    row = re.sub(r"`[^`]*`", lambda m: m.group(0).replace("|", "\x01"), row)
    return [c.strip().replace("\x01", "|") for c in row.split("|")]


def render(md: str) -> str:
    lines = md.split("\n")
    out: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        # Table: a header row followed by a |---|---| separator.
        if (stripped.startswith("|") and i + 1 < len(lines)
                and re.fullmatch(r"\|[\s:|-]+\|?", lines[i + 1].strip())):
            head = split_row(stripped)
            aligns = ["right" if c.endswith(":") and not c.startswith(":")
                      else "center" if c.startswith(":") and c.endswith(":")
                      else "left"
                      for c in split_row(lines[i + 1])]
            i += 2
            body: list[list[str]] = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                body.append(split_row(lines[i].strip()))
                i += 1
            th = "".join(f'<th style="text-align:{a}">{inline(c)}</th>'
                         for c, a in zip(head, aligns + ["left"] * len(head)))
            rows = []
            for r in body:
                # A row of only dashes/bold text spanning the table is a subhead.
                tds = "".join(
                    f'<td style="text-align:{aligns[j] if j < len(aligns) else "left"}">'
                    f'{inline(c)}</td>' for j, c in enumerate(r))
                rows.append(f"<tr>{tds}</tr>")
            out.append(f'<table><thead><tr>{th}</tr></thead>'
                       f'<tbody>{"".join(rows)}</tbody></table>')
            continue

        # Blockquote - rendered as a callout box.
        if stripped.startswith(">"):
            buf = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                buf.append(re.sub(r"^\s*>\s?", "", lines[i]))
                i += 1
            inner = render("\n".join(buf)) if any(
                b.strip().startswith(("|", "-", "#")) for b in buf) else \
                "".join(f"<p>{inline(p)}</p>"
                        for p in re.split(r"\n\s*\n", "\n".join(buf)) if p.strip())
            out.append(f'<blockquote>{inner}</blockquote>')
            continue

        # Headings.
        if m := re.match(r"^(#{1,4})\s+(.*)$", stripped):
            lvl = len(m.group(1))
            out.append(f"<h{lvl}>{inline(m.group(2))}</h{lvl}>")
            i += 1
            continue

        # Horizontal rule.
        if re.fullmatch(r"(-{3,}|\*{3,}|_{3,})", stripped):
            out.append("<hr>")
            i += 1
            continue

        # Lists.
        if re.match(r"^\s*([-*+]|\d+\.)\s+", line):
            ordered = bool(re.match(r"^\s*\d+\.\s+", line))
            items: list[str] = []
            while i < len(lines) and (re.match(r"^\s*([-*+]|\d+\.)\s+", lines[i])
                                      or (lines[i].startswith(("  ", "\t"))
                                          and lines[i].strip()
                                          and items)):
                if re.match(r"^\s*([-*+]|\d+\.)\s+", lines[i]):
                    items.append(re.sub(r"^\s*([-*+]|\d+\.)\s+", "", lines[i]))
                else:                                   # continuation line
                    items[-1] += " " + lines[i].strip()
                i += 1
            tag = "ol" if ordered else "ul"
            out.append(f"<{tag}>" +
                       "".join(f"<li>{inline(it)}</li>" for it in items) +
                       f"</{tag}>")
            continue

        # Paragraph: gather until a blank line or the start of another block.
        buf = [line]
        i += 1
        while (i < len(lines) and lines[i].strip()
               and not lines[i].strip().startswith(("|", ">", "#", "---"))
               and not re.match(r"^\s*([-*+]|\d+\.)\s+", lines[i])):
            buf.append(lines[i])
            i += 1
        out.append(f"<p>{inline(' '.join(b.strip() for b in buf))}</p>")

    return "\n".join(out)


# ----------------------------------------------------------------- the volume

SECTIONS = [
    ("Project record and findings",       "PROJECT-FINDINGS.md"),
    ("Fire marshal signage",              "FIRE-MARSHAL-SIGNAGE.md"),
    ("ADA and Texas Accessibility Standards", "ADA-TAS-REQUIREMENTS.md"),
    ("G401 delta: California code vs Texas", "CBC-vs-TAS-DELTA.md"),
    ("Pool and spa signage",              "POOL-SIGNAGE.md"),
    ("Texas statutory posted notices",    "TEXAS-STATUTORY-NOTICES.md"),
    ("City of Eagle Pass",                "CITY-OF-EAGLE-PASS.md"),
    ("Brand standards and project record", "BRAND-AND-PROJECT-RECORD.md"),
    ("Sign schedule by space",            "sign-schedule.md"),
]


def main() -> None:
    pages = json.loads(Path(sys.argv[1]).read_text()) if len(sys.argv) > 1 else {}
    body: list[str] = []
    toc: list[tuple[str, str]] = []

    for n, (title, fname) in enumerate(SECTIONS, 1):
        md = (SRC / fname).read_text()
        # Drop the file's own H1 - the section banner replaces it.
        md = re.sub(r"\A\s*#\s+.*?\n", "", md, count=1)
        slug = f"sec{n}"
        toc.append((f"{n}. {title}", slug))
        body.append(
            f'<section id="{slug}" class="chapter">'
            f'<div class="chapter-head"><span class="chapter-num">Section {n}</span>'
            f'<h1>{html.escape(title)}</h1>'
            f'<div class="chapter-src">Source file: research/signage/{fname}</div></div>'
            f'{render(md)}</section>')

    refs = "".join(
        f'<li id="ref{n}"><span class="refnum">{n}</span><div class="refbody">'
        + (f'<div class="reftitle">{html.escape(lbl)}</div>' if lbl else "")
        + f'<a href="{html.escape(u, quote=True)}">{html.escape(u)}</a>'
        '</div></li>'
        for u, (n, lbl) in sorted(REFS.items(), key=lambda kv: kv[1][0]))
    body.append(
        '<section id="refs" class="chapter"><div class="chapter-head">'
        '<span class="chapter-num">Appendix</span><h1>References</h1>'
        '<div class="chapter-src">Every source cited in this report, numbered in '
        'order of first appearance. Superscript numbers in the text point here.'
        '</div></div>'
        f'<ol class="refs">{refs}</ol></section>')

    toc_html = "".join(
        f'<li><a href="#{s}"><span class="toc-t">{html.escape(t)}</span>'
        f'<span class="toc-dots"></span>'
        f'<span class="toc-p">{pages.get(s, "")}</span></a></li>'
        for t, s in toc) + (
        f'<li class="toc-appendix"><a href="#refs">'
        f'<span class="toc-t">Appendix &mdash; References ({len(REFS)} sources)</span>'
        f'<span class="toc-dots"></span>'
        f'<span class="toc-p">{pages.get("refs", "")}</span></a></li>')

    tpl = Path("tools/pdf/book.html").read_text()
    Path(sys.argv[2] if len(sys.argv) > 2 else "build/signage.html").write_text(
        tpl.replace("<!--TOC-->", toc_html).replace("<!--BODY-->", "\n".join(body)))
    print(f"{len(REFS)} unique sources cited")


if __name__ == "__main__":
    main()
