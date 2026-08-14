"""Pull the typefaces out of a reference minutes PDF so output matches exactly.

The Procore export embeds Arial, Arial Bold, Times New Roman and Courier New.
Rendering with those same faces — rather than with metric-compatible clones —
makes a regenerated document glyph-for-glyph identical to the original.

The faces are licensed and are NOT committed to this repository; run this
against a minutes PDF you already hold to populate tools/minutes/fonts/.
Without them the renderer falls back to the Liberation clones, which match on
metrics and line breaking but differ slightly in letterform.

    python3 extract_fonts.py /path/to/Meeting80.pdf
"""

from __future__ import annotations

import io
import pathlib
import sys

import pymupdf
from fontTools.ttLib import TTFont, newTable

def clean(raw: bytes, family: str, postscript: str) -> bytes:
    """Drop alias codepoints so each glyph reverse-maps to its canonical one.

    The embedded subsets map some glyphs from two codepoints -- `hyphen` from
    both U+002D and U+00AD, `space` from both U+0020 and U+00A0.  A renderer
    building a ToUnicode table from that cmap can pick the alias, which leaves
    soft hyphens and non-breaking spaces in the text layer and breaks copy and
    search.  Keeping only the lowest codepoint for each glyph fixes the reverse
    mapping without changing a single rendered outline.
    """
    font = TTFont(io.BytesIO(raw))
    rename(font, family, postscript)
    # Only the Unicode subtables matter here.  A legacy Mac Roman subtable maps
    # the same glyphs from single-byte codes, and folding those in would make
    # e.g. the bullet's canonical codepoint 0xA5 and strip its real U+2022 entry.
    unicode_tables = [t for t in font["cmap"].tables if t.isUnicode()]
    canonical: dict[str, int] = {}
    for table in unicode_tables:
        for cp, glyph in table.cmap.items():
            if glyph not in canonical or cp < canonical[glyph]:
                canonical[glyph] = cp
    for table in unicode_tables:
        table.cmap = {
            cp: g
            for cp, g in table.cmap.items()
            if canonical[g] >= 0x2000 or cp == canonical[g]
        }
    buf = io.BytesIO()
    font.save(buf)
    return buf.getvalue()


WANTED = {
    "Arial": ("sans.ttf", "Arial", "ArialMT"),
    "Arial,Bold": ("sans-bold.ttf", "Arial", "Arial-BoldMT"),
    "Times New Roman": ("serif.ttf", "Times New Roman", "TimesNewRomanPSMT"),
    "Courier New": ("mono.ttf", "Courier New", "CourierNewPSMT"),
}


def rename(font: TTFont, family: str, postscript: str) -> None:
    """Give the face a valid name table.

    The embedded subsets carry no `name` table at all -- the PDF supplies the
    name through its own font dictionary -- so a renderer that reads the name
    from the file emits a font resource with no BaseFont.  Writing a minimal,
    valid table restores proper font identity in the output.
    """
    subfamily = "Bold" if "Bold" in postscript else "Regular"
    full = family if subfamily == "Regular" else f"{family} {subfamily}"
    name = font["name"] = newTable("name")
    name.names = []
    for name_id, value in (
        (1, family), (2, subfamily), (3, postscript),
        (4, full), (6, postscript),
    ):
        name.setName(value, name_id, 3, 1, 0x409)   # Windows, Unicode BMP, en-US
        name.setName(value, name_id, 1, 0, 0)       # Macintosh, Roman, English


def main() -> None:
    src = sys.argv[1]
    dest = pathlib.Path(__file__).parent / "fonts"
    dest.mkdir(exist_ok=True)
    doc = pymupdf.open(src)
    found = {}
    for pno in range(doc.page_count):
        for info in doc[pno].get_fonts(full=True):
            xref = info[0]
            name, ext, _, buf = doc.extract_font(xref)
            base = name.split("+")[-1]
            if base in WANTED and base not in found and buf:
                target, family, postscript = WANTED[base]
                data = clean(buf, family, postscript)
                (dest / target).write_bytes(data)
                found[base] = len(data)
    for base, (target, _, _) in WANTED.items():
        size = found.get(base)
        state = f"{size:,} bytes" if size else "NOT FOUND (will fall back)"
        print(f"  {base:18s} -> fonts/{target:14s} {state}")


if __name__ == "__main__":
    main()
