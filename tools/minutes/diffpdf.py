"""Compare two minutes PDFs span-by-span and report positional drift.

    python3 diffpdf.py reference.pdf candidate.pdf [--max N]

Used to verify that a regenerated set of minutes lands on the same geometry as
the Procore export it is modelled on.
"""

from __future__ import annotations

import sys

import pymupdf

NBSP = " "


def spans(path: str):
    doc = pymupdf.open(path)
    out = []
    for pno, page in enumerate(doc):
        rows = []
        for block in page.get_text("dict")["blocks"]:
            if block["type"] != 0:
                continue
            for line in block["lines"]:
                for s in line["spans"]:
                    t = s["text"].replace(NBSP, " ").strip()
                    if not t:
                        continue
                    rows.append(
                        (pno, round(s["origin"][0], 2), round(s["origin"][1], 2),
                         round(s["size"], 2), t)
                    )
        rows.sort(key=lambda r: (r[2], r[1]))
        out.extend(rows)
    return out


def main() -> None:
    ref, cand = sys.argv[1], sys.argv[2]
    limit = 60
    if "--max" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--max") + 1])

    a, b = spans(ref), spans(cand)
    ai = {}
    for r in a:
        ai.setdefault((r[0], r[4]), []).append(r)
    bi = {}
    for r in b:
        bi.setdefault((r[0], r[4]), []).append(r)

    missing = [k for k in ai if k not in bi]
    extra = [k for k in bi if k not in ai]
    dx_max = dy_max = 0.0
    off = []
    for k, rows in ai.items():
        if k not in bi:
            continue
        for ra, rb in zip(rows, bi[k]):
            dx, dy = rb[1] - ra[1], rb[2] - ra[2]
            dx_max = max(dx_max, abs(dx))
            dy_max = max(dy_max, abs(dy))
            if abs(dx) > 0.05 or abs(dy) > 0.05:
                off.append((abs(dy), abs(dx), ra, dx, dy))

    print(f"reference spans : {len(a)}")
    print(f"candidate spans : {len(b)}")
    print(f"missing in cand : {len(missing)}")
    print(f"extra in cand   : {len(extra)}")
    print(f"misplaced       : {len(off)}   max |dx|={dx_max:.2f}  max |dy|={dy_max:.2f}")
    print()
    off.sort(reverse=True)
    for _, _, ra, dx, dy in off[:limit]:
        print(f"  p{ra[0]+1} y={ra[2]:7.2f} dx={dx:+7.2f} dy={dy:+8.2f} | {ra[4][:66]}")
    if missing:
        print("\nMISSING (first 25):")
        for k in missing[:25]:
            print(f"  p{k[0]+1} | {k[1][:80]}")
    if extra:
        print("\nEXTRA (first 25):")
        for k in extra[:25]:
            print(f"  p{k[0]+1} | {k[1][:80]}")


if __name__ == "__main__":
    main()
