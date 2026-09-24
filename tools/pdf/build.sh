#!/usr/bin/env bash
# Build research/signage/*.md into a single sourced PDF.
#
# Two render passes: the first lays the book out, then the real page numbers are
# read back out of that PDF with pdftotext and baked into the contents page for
# the second pass. Each chapter is located by the source-file line in its header,
# which is unique to the chapter and absent from the contents page.
#
# Requires: playwright + chromium (preinstalled), pdf-lib, poppler's pdftotext.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
OUT=${1:-docs/H2SEP-Signage-Compliance-Report.pdf}
mkdir -p build

for c in "$PWD/node_modules/pdf-lib" \
         "${TMPDIR:-/tmp}/pdf-lib/node_modules/pdf-lib" \
         /tmp/claude-0/*/*/scratchpad/node_modules/pdf-lib; do
  [ -d "$c" ] && { export PDFLIB="$c"; break; }
done
[ -n "${PDFLIB:-}" ] || { echo "pdf-lib not found - run: npm install pdf-lib" >&2; exit 1; }

echo "{}" > build/pages.json
echo "pass 1: laying out"
python3 tools/pdf/md2html.py build/pages.json build/signage.html
node tools/pdf/render.js build/signage.html "$OUT" > build/render1.json

echo "pass 2: resolving contents page numbers"
python3 - "$OUT" <<'PY'
import json, re, subprocess, sys
from pathlib import Path

SECTIONS = [(f"sec{i}", f) for i, f in enumerate([
    "PROJECT-FINDINGS.md", "FIRE-MARSHAL-SIGNAGE.md", "ADA-TAS-REQUIREMENTS.md",
    "CBC-vs-TAS-DELTA.md", "POOL-SIGNAGE.md", "TEXAS-STATUTORY-NOTICES.md",
    "CITY-OF-EAGLE-PASS.md", "BRAND-AND-PROJECT-RECORD.md", "sign-schedule.md",
], 1)]

text = subprocess.run(["pdftotext", "-layout", sys.argv[1], "-"],
                      capture_output=True, text=True, check=True).stdout
pages = text.split("\f")
# Page 1 is the unnumbered cover; printed footers count from the page after it,
# so a hit on pages[i] prints as page i.
found, missing = {}, []
for slug, fname in SECTIONS:
    needle = f"research/signage/{fname}"
    for i, pg in enumerate(pages):
        if needle in pg.replace("\n", "").replace(" ", ""):
            found[slug] = i
            break
    else:
        missing.append(fname)
for i, pg in enumerate(pages):
    if "Every source cited in this report" in " ".join(pg.split()):
        found["refs"] = i
        break
else:
    missing.append("references appendix")

if missing:
    print("  WARNING - could not locate:", ", ".join(missing))
Path("build/pages.json").write_text(json.dumps(found))
print(f"  located {len(found)}/{len(SECTIONS) + 1} sections")
PY

python3 tools/pdf/md2html.py build/pages.json build/signage.html
node tools/pdf/render.js build/signage.html "$OUT" > build/render2.json

python3 - "$OUT" <<'PY'
import json, subprocess, sys
from pathlib import Path
a = json.loads(Path("build/render1.json").read_text())
b = json.loads(Path("build/render2.json").read_text())
if a["total"] != b["total"]:
    print(f"  NOTE: pagination shifted {a['total']} -> {b['total']} pages between "
          f"passes; contents may be off by one. Re-run to converge.")
size = Path(sys.argv[1]).stat().st_size
print(f"\n{sys.argv[1]}\n  {b['total']} pages  ({size/1024/1024:.1f} MB)")
PY
