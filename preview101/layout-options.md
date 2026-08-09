# Room 101 template — layout options (print vs phone)

Data reality this has to serve: the new deduped Room 101 template is **40 lines / 46 physical
units** in the FF&E + Appliance + Bath Accessory scope (down from 46 raw rows). Full-trade rooms
run 150+ rows across 21 categories, so whatever we pick has to scale past one page without lying
about what fits.

## Option A — Paper-mirror two-column print (what `print-101.html` does)

Two CSS columns per Letter page, category subheads, 44×32px landscape initial boxes on the
right rail (wider than tall so 40 lines still fit two pages — the paper's box is squarer), bold
tag + en-dash + label lines, red uppercase issue ink, ×2 qty badges. FF&E fills page 1; a forced
page break puts Appliances + Bath Accessories on page 2 under a repeated slim room header
("ROOM #101 · QQ STUDIO Connector · page 2"), per the APP_HANDOFF rule that the room header
repeats on every printed page.

- **Pros:** Reads exactly like Austin's hand sheet — zero retraining for the crew signing boxes.
  Densest legible format: ~26 lines per page even with wrapped appliance model strings. The qty
  badge kills the duplicate-line noise (GR-300 ×2, GR-600 ×2 …) without hiding count.
- **Cons:** Columns mean reading order snakes (down, then over) — fine on paper, awkward if the
  same HTML is read on a phone. Fixed page break is tuned to this room's line count; a room type
  with 60+ FF&E lines needs the break recomputed (or dropped, letting columns flow).
- **Verdict for print: this is the one.** It is the deliverable rendered here and it survives a
  real Chromium print pass at exactly 2 pages with no orphaned subheads or clipped boxes.

## Option B — App continuous scroll with sticky category families

Single column, one item card per line, category headers `position: sticky` under the app bar,
jump-nav chips (Casegoods / Bedding / … / Bath) across the top. Qty badge and red issue text
inline, tap the initials box (≥44px tap target on screen; 44×32px in print) to stamp initials —
the current PWA's interaction model, fed by this
same JSON (items ordered by `sort`).

- **Pros:** Correct for phones: no column snaking, thumb-reach boxes, sticky context while
  scrolling 40–150 lines. Matches APP_HANDOFF's explicit guidance ("screen: one continuous
  scroll, grouped by category, sticky headers"). Scales to full-trade rooms unchanged; a
  category filter gives the per-trade short view without dropping rows.
- **Cons:** Prints terribly as-is (one skinny column, ~4 pages for this scope); needs its own
  print stylesheet anyway. Loses the at-a-glance whole-room read the paper gives a super
  standing in the doorway.

## Option C — Hybrid: one source, two renderers

Keep `template-101.json` as the single source of truth. The app renders Option B on screen; a
"Print sheet" action renders Option A into a print window (same typography tokens: bold tag,
en-dash, red `#C00000` issue ink, 44×32px boxes). Live check states (initials, issues, ★ room
notes) flow into the printout so a mid-punch sheet prints with today's ink, like the CC boxes do
here.

- **Pros:** Each medium gets its native layout; no compromise artifact. The paper look is
  preserved forever as the print face even as the app UI evolves.
- **Cons:** Two templates to maintain; the print renderer needs a pagination rule (break before
  Appliances when FF&E > ~60% of a page, else flow) instead of Option A's hardcoded break.

## Recommendation

**Print: Option A. Phone: Option B. Ship them as Option C** — the JSON already carries
everything both need (`sort`, `category`, `qty`, `issue`, `initials`), so the hybrid is a
renderer decision, not a data decision. The only genuinely fragile piece is Option A's fixed
page break; generalize it to "break before the first non-FF&E category when the FF&E block
exceeds ~40 lines-worth of column height" and the same print face works for all 10 room-type
packages. Do **not** try to make one layout serve both — the column snaking that makes paper
dense is exactly what makes phones miserable, and one-page-at-all-costs is already ruled out by
the 150-row full-trade rooms.
