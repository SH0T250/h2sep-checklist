# Home2 Suites — QC Deficiency Tracker → Live Google Sheet

**What this is:** A ready-to-use prompt that turns the Excel file
`TRIUN_Hotel_QC_Deficiency_Tracker_UPDATED_*.xlsx` into a **live, shared,
mobile-friendly Google Sheet** that mirrors the original almost exactly.

**How to use it:**
1. Open an AI assistant that can build Google Sheets (e.g. Claude or ChatGPT
   with Google Sheets / Apps Script ability, or Gemini in Google Workspace).
2. **Attach the Excel file** referenced above so the model can copy the real
   rows. (The prompt is also fully self-contained — it works even without the
   file, but attaching it preserves your existing ~970 line items.)
3. Paste everything inside the `PROMPT` block below.
4. Fill in the three bracketed blanks at the top (`[...]`) before sending.

> Tip: If your assistant can run **Google Apps Script**, ask it to deliver the
> tracker as a script you paste into *Extensions → Apps Script → Run*. That
> rebuilds the entire workbook — tabs, colors, dropdowns, formulas, and the
> mobile "Add Deficiency" form — in about 30 seconds with zero manual setup.

---

## ✅ COPY EVERYTHING BELOW THIS LINE — THE PROMPT

```text
ROLE
You are a Quality Control Manager with 20+ years in commercial construction —
hotels, multifamily, and hospitality fit-outs — who is fluent in building
punch/deficiency tracking AND in Google Sheets (including Apps Script, data
validation, conditional formatting, filter views, and linked Google Forms).
You build trackers that a superintendent can actually run a job from on their
phone while walking the building.

OBJECTIVE
Recreate the attached Excel workbook "HOME 2 SUITES QUALITY CONTROL DEFICIENCY
TRACKER" as a LIVE Google Sheet that my whole team can open and edit at the
same time. It must look and behave almost identically to the Excel file, but be
optimized so I can check items off and add new items from my mobile phone in the
field. Preserve all existing line items from the attached file. If no file is
attached, build the full structure and seed it with realistic Home2 Suites data
per the SCOPE section below.

PROJECT DETAILS (fill these in)
- Hotel / Project name:  [e.g., Home2 Suites by Hilton — <City, State>]
- Project # / Job #:      [optional]
- QC Manager (owner):     [your name + email]
- Team members to share:  [names + emails, editor access]

DELIVERABLE
Prefer a single Google Apps Script I can paste into Extensions → Apps Script and
run once to build the whole workbook (all tabs, formatting, colors, dropdowns,
conditional formatting, formulas, frozen headers, filter views, banded rows, and
the "Add Deficiency" Google Form). If you cannot produce a script, instead give
me precise click-by-click setup steps. Either way, end with a SHARE step and a
short "How my team uses this on a phone" guide.

============================================================
1) WORKBOOK STRUCTURE — 8 TABS (keep these exact names + order)
============================================================
1. Open Deficiencies   → MASTER data tab. Single source of truth. All other
                          floor tabs read FROM this tab. New items are added
                          here (or via the form, which appends here).
2. Level 1             → Live filtered view of Open Deficiencies where
                          "Area / Floor" = "Level 1".
3. Level 2             → Same, "Level 2".
4. Level 3             → Same, "Level 3".
5. Level 4             → Same, "Level 4".
6. Misc                → Filtered view for Exterior, Stairwell - West,
                          Stairwell - East, and Project-wide items.
7. Closed Deficiencies → Archive of completed/verified items (same columns).
8. Trade Summary       → Auto-calculating dashboard (counts per trade).

For the floor/Misc tabs use a live formula so they always stay in sync, e.g.:
  =QUERY('Open Deficiencies'!A6:P, "select * where C = 'Level 1'", 1)
(or the equivalent FILTER formula). These tabs are READ-ONLY mirrors — protect
them so people don't type into a formula result; all edits happen on the master
tab or through the form.

============================================================
2) COLUMNS — 16 COLUMNS A–P (exact headers, this order)
============================================================
A  Item No.                     (auto-number; never reused)
B  Date Identified              (date, format mm-dd-yy)
C  Area / Floor                 (dropdown — see list below)
D  Room No. / Location          (e.g., "Queen Queen - 201")
E  Deficiency Description        (free text — widest column, wrap on)
F  Trade Responsible            (dropdown — trades list below)
G  Priority                     (dropdown: Low, Medium, High)
H  Assigned To                  (free text or dropdown of trades/people)
I  Date Assigned                (date, mm-dd-yy)
J  Corrective Action Required   (free text, wrap on)
K  Target Completion Date       (date, mm-dd-yy)
L  Date Corrected               (date, mm-dd-yy)
M  QC Verified By               (free text — initials/name)
N  Verification Date            (date, mm-dd-yy)
O  Status                       (dropdown: Open, In Progress, Closed)
P  Owner / Architect Comments   (free text, wrap on)

ALSO ADD (mobile convenience — see Section 6):
- A leading checkbox column "✔ Done" to the LEFT of the table that, when
  ticked, sets Status = Closed and stamps Date Corrected with today's date.
  Keep the A–P layout intact so it still matches the Excel; the checkbox is an
  extra helper column, clearly labeled.

============================================================
3) LAYOUT, TITLE & READABILITY (match the Excel)
============================================================
- Title in row 1: "HOME 2 SUITES — QUALITY CONTROL DEFICIENCY TRACKER",
  merged across the table, ~18pt, bold, centered. Put the hotel/city on a
  second line in a slightly smaller subtitle.
- Header row (the A–P labels) on its own row, then FREEZE that header row + the
  Item No. column so they stay visible while scrolling on phone and desktop.
- Header style: fill DARK BLUE #1F4E78, text WHITE, bold, centered, wrap on.
- Body font Calibri/Arial 11; vertical-align top; wrap text on columns
  E (Description), J (Corrective Action), P (Comments).
- Turn ON an AutoFilter / filter on the header row of every data tab.
- Approximate column widths (px): A 70, B 95, C 120, D 210, E 380 (widest),
  F 150, G 100, H 150, I 110, J 260, K 150, L 130, M 120, N 110, O 110, P 220.
- Light gray banded rows (alternating) for readability; zoom ~90%; gridlines on.

============================================================
4) COLORS & CONDITIONAL FORMATTING (this is the "easy to read" part)
============================================================
STATUS column (O) — color the whole cell by value:
  - "Open"        → red fill   #FFC7CE, text #9C0006
  - "In Progress" → amber fill #FFEB9C, text #9C6500
  - "Closed"      → green fill #C6EFCE, text #006100
(These are the same red/amber/green from the Excel.)

PRIORITY column (G) — color by value for fast triage:
  - "High"   → red    #FFC7CE
  - "Medium" → amber  #FFEB9C
  - "Low"    → green  #C6EFCE

OVERDUE highlight (helps in the field): if Status ≠ "Closed" AND Target
Completion Date (K) < today, highlight K (or the row) with a bold red/orange so
late items jump out on the phone.

Optional whole-row tint by Status (subtle, so text stays readable) is welcome,
but keep STATUS and PRIORITY cell coloring as the primary signal.

============================================================
5) DROPDOWNS / DATA VALIDATION (so phone entry is tap-not-type)
============================================================
Build these as data-validation dropdowns (chips), rejecting invalid entries:

Area / Floor (C):
  Level 1, Level 2, Level 3, Level 4, Stairwell - West, Stairwell - East,
  Exterior, Project-wide

Priority (G):  Low, Medium, High
Status (O):    Open, In Progress, Closed

Trade Responsible (F) and Assigned To (H) — dropdown from this trade list
(store it on a hidden "Lists" tab so it's easy to maintain):
  United Electric, RK Hospitality, Keeper's, Iceberg, Alex, Painters, AMI,
  Larry's Plumbing, Texas Fire Services, Access Online, Wallpaper installer,
  Security Integrated, LH Welding, TK Elevators, EO3, Internal Team,
  Sheetrock, Spectrum, Rene, APM Services
(Allow adding new trades easily — the dropdown should read a named range.)

============================================================
6) MOBILE-FIRST USABILITY (the reason this is in Google Sheets)
============================================================
This will be used on phones in the Google Sheets app while walking units:
- Keep the header row + Item No. frozen so context never scrolls away.
- "✔ Done" checkbox column: tapping it sets Status=Closed + Date Corrected=today
  (via an onEdit Apps Script trigger). One tap to clear a punch item.
- Create a linked Google Form titled "Add Deficiency — Home2 Suites" whose
  responses append straight to the Open Deficiencies tab. Fields = Date
  Identified, Area/Floor (dropdown), Room No./Location, Deficiency Description,
  Trade Responsible (dropdown), Priority (dropdown), Corrective Action, Target
  Completion Date. Status defaults to "Open" and Item No. auto-assigns. Give me
  the form link + a QR code note so the super can add items in 10 seconds from
  the field — including a photo-upload question for each deficiency.
- Build saved FILTER VIEWS (not just filters) so each person can quickly view:
  "My open items" (by Assigned To), "High priority open", "Overdue",
  and one per floor — without disturbing anyone else's view.
- Keep editing on the master tab + form only; protect the mirror tabs and the
  header/Item No. so nothing critical gets fat-fingered on a phone.

============================================================
7) TRADE SUMMARY DASHBOARD (auto-calculated)
============================================================
On the "Trade Summary" tab, build a table that updates automatically from the
master tab. Columns: Trade | Open | In Progress | Total, one row per trade in
the list above, plus a TOTAL row. Use COUNTIFS against Open Deficiencies, e.g.:
  Open        =COUNTIFS('Open Deficiencies'!$F:$F, A5, 'Open Deficiencies'!$O:$O, "Open")
  In Progress =COUNTIFS('Open Deficiencies'!$F:$F, A5, 'Open Deficiencies'!$O:$O, "In Progress")
  Total       =COUNTIF('Open Deficiencies'!$F:$F, A5)
Add small summary cards at the top: TOTAL OPEN, TOTAL IN PROGRESS, TOTAL CLOSED,
% COMPLETE, and OVERDUE count. Add a tiny bar chart of open items by trade and
one of open items by floor. Style the dashboard header in the same #1F4E78 blue.

============================================================
8) SCOPE — HOME2 SUITES CONTENT TO REPRESENT (lots of everything)
============================================================
This is an all-suite, extended-stay hotel, FOUR guest floors, currently in
finishes/trim-out/FF&E phase. Make sure the tracker comfortably handles
HUNDREDS of line items. If seeding data (no file attached), generate a realistic
load across all four floors and back-of-house.

Room numbering: Level 1 = 1xx, Level 2 = 2xx, Level 3 = 3xx, Level 4 = 4xx
(guest rooms generally odd/even down each corridor). Location format =
"<Room Type> - <Number>", e.g. "Queen Queen - 201", "King Studio - 104".

Guest-room / suite types to use:
  Queen Queen, Queen Queen Wide, Queen Queen Connector, King Studio,
  King Studio Connector, King One Bedroom, QQ Studio, plus ADA/Accessible
  variants (e.g., "K Studio Acc Connector").

Back-of-house / public areas to include (examples):
  Lobby, Reception Area, Market Area, Breakfast/Server Area, Food Prep,
  Fitness Room, Meeting Room, Guest Laundry, Manager's Office, Sales Room,
  Engineer's Room, Housekeeping, Electric Room, Mechanical Room, PBX, Elevator
  & Elevator Lobby, Guest Corridor, Men's/Women's Restroom, Ice Machine Room,
  Stairwells (East/West), Exterior.

Deficiency categories to cover heavily (these are the "lots of items"):
  • FF&E install — headboards, mirrors, casegoods, lighting, soft goods,
    artwork, closet shelving (lots of FF&E across every room).
  • Trim-outs — plumbing trim (toilets, vanities/sinks, tub/shower fixtures),
    electrical trim (receptacles + cover plates, switches, light fixtures,
    sconces, panel labeling), fire-sprinkler trim-out + escutcheons,
    HVAC grilles/registers + thermostats, low-voltage/data covers.
  • Wallpaper — installation, seams, and touch-ups (lots of wallpaper).
  • Paint & drywall — tape/float/paint to Level 4 (smooth) finish, ceilings
    and walls, second coats, door frames, touch-ups.
  • Flooring — carpet + base, tile + tile base, quarry tile repair, thresholds.
  • Doors & hardware — door/frame install, hardware, closers, signage.
  • Caulking/sealant, water-intrusion cleanup, exterior items, elevator finishes.

Priority guidance: life-safety, water, and access-blocking items = High;
finish/cosmetic = Medium/Low. Default new items to Status "Open".

============================================================
9) SHARE & HANDOFF
============================================================
- Share the Sheet with my listed team as Editors (link: anyone in org can edit,
  or restricted to listed emails — ask me if unsure).
- Give me: the Sheet link, the Google Form link (+ note to make a QR code),
  and a 5-line "How to use this on your phone" cheat-sheet for the crew.

============================================================
10) ACCEPTANCE CHECKLIST (confirm each before finishing)
============================================================
[ ] 8 tabs present, named and ordered exactly as Section 1.
[ ] Columns A–P with exact headers + the "✔ Done" helper checkbox.
[ ] Title row merged/bold/centered; header row + Item No. frozen.
[ ] Header fill #1F4E78 white bold; banded rows; widths/wrap per Section 3.
[ ] Status & Priority conditional colors exactly as Section 4; overdue highlight.
[ ] Dropdowns for Area, Trade, Assigned To, Priority, Status (Section 5).
[ ] Floor/Misc tabs are live QUERY/FILTER mirrors and are protected.
[ ] "Add Deficiency" Google Form appends to master; Item No. auto-assigns.
[ ] Done-checkbox sets Status=Closed + Date Corrected=today.
[ ] Trade Summary auto-counts (Open/In Progress/Total) + summary cards + charts.
[ ] Existing rows from the attached Excel preserved (or realistic seed data).
[ ] Shared with my team; Sheet + Form links returned with a phone cheat-sheet.
```

## ⬆️ END OF PROMPT — COPY EVERYTHING ABOVE THIS LINE

---

## Appendix — exact reference data pulled from your Excel
*(Already embedded in the prompt above; kept here for quick editing.)*

| Element | Value(s) from the file |
|---|---|
| Workbook title | HOME 2 SUITES QUALITY CONTROL DEFICIENCY TRACKER |
| Tabs | Open Deficiencies · Level 1 · Level 2 · Level 3 · Level 4 · Misc · Closed Deficiencies · Trade Summary |
| Columns (A–P) | Item No. · Date Identified · Area / Floor · Room No. / Location · Deficiency Description · Trade Responsible · Priority · Assigned To · Date Assigned · Corrective Action Required · Target Completion Date · Date Corrected · QC Verified By · Verification Date · Status · Owner / Architect Comments |
| Header color | `#1F4E78` fill, white bold text |
| Status colors | Open `#FFC7CE` · In Progress `#FFEB9C` · Closed `#C6EFCE` |
| Priority list | Low, Medium, High |
| Status list | Open, In Progress, Closed |
| Area / Floor list | Level 1–4, Stairwell - West, Stairwell - East, Exterior, Project-wide |
| Date format | mm-dd-yy |
| Floor tabs | Live `FILTER`/`QUERY` of the master tab by Area/Floor |
| Trade Summary | `COUNTIFS` per trade → Open / In Progress / Total |
| Trades | United Electric, RK Hospitality, Keeper's, Iceberg, Alex, Painters, AMI, Larry's Plumbing, Texas Fire Services, Access Online, Wallpaper installer, Security Integrated, LH Welding, TK Elevators, EO3, Internal Team, Sheetrock, Spectrum, Rene, APM Services |
| Suite types | Queen Queen, Queen Queen Wide, Queen Queen Connector, King Studio, King Studio Connector, King One Bedroom, QQ Studio (+ Accessible variants) |
| Scale in file | ~970 line items, ~180 distinct rooms/locations across 4 floors |
