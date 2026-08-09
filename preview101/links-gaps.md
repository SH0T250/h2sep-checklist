# H2SEP — Room 101 (QQ Studio Connector) — Submittal Gap List
_Compiled 2026-08-07 from Google Drive. Scope: FF&E + Appliance + Bath Accessory template tags for Room 101 (40 template lines after ×-qty dedupe)._

**Score: 13 of 40 lines fully covered + 2 partial (GR-402, disposer) + 25 open gaps.**
_(Arithmetic note: GR-402 counts once, as a partial — its hardware sub-tag GR-402.1 is a separate template line and is counted in the 13 full. 13 + 2 + 25 = 40.)_

## How coverage was verified (re-audited this revision)
The Submittals tree, FF&E Floor Plans, and Home2Suites Specs folders were re-listed **file by file** (complete inventories below), not just title-searched. `1. Plans & Specs` (the architectural / electrical drawing sets) was searched by title and full text. The prior revision's blanket "searched all folders for every tag" claim was overstated — the first pass missed two files in the Food Service subfolder (the Moen disposer cutsheet and a second countertop microwave). Both are now mapped; the lighting / bedding / bath-accessory / mirror / task-chair / window-fabric gaps below were re-confirmed against the full inventories and are genuine.

**Complete inventory — Submittals root `1fLJO0537clxG-wmQ8FGf14giaD-LdF6O`:**
- Root PDFs (6): RK FF&E Guest Room pkg · RK Tables/Reception Desk/Breakfast/Public RR Vanities · RK Room Divider spec (WingIts) · Kalisher art submittal · Fire Alarm shop dwgs · Fire Sprinkler shop dwgs
- `Guestroom Appliance PD & Cutsheets` (5): Refridgerator.pdf · 18 In Dishwasher.pdf · 24 In Dishwasher.pdf · Over the Range Microwave.pdf · Countertop Microwave.pdf (= Danby DBMW1126BBS)
- `Bathroom Vanity & Kitchenette Sink & Facuet` (4): Moen Bathroom Vanity Faucet · American Standard Bathroom Vanity Sink · Moen Kitchenette Faucet · American Standard Kitchenette Sink
- `Food Service Kitchen Appliance PD & Cutsheet` (6): Clevenger kitchen equipment pkg · **Moen Garbage Disposal MGXP33C** · Danby Refrigerator DFF101B1BSSDB · Danby Dishwasher DDW2404EBSS · Danby Microwave OTR DOM16A2SSDB · Danby Microwave DDMW1125BBS (a **second** countertop model)

**Complete inventory — other FF&E folders:**
- `FF&E Floor Plans` (3): RK Locations Floor Plans (ID set) · 2× Clevenger FS equipment plans
- `Home2Suites Specs` (3): Home2-Dynamic Finish Specs (Public + Guest) · FF&E Specs Public Areas · FF&E Specs Guest Suites

→ Nothing anywhere in these folders covers guestroom lighting, bedding, bath accessories (HD), mirrors, the task chair, or window-treatment fabric.

---

## Covered in full (no action) — 13 lines
| Tag | Item | Submittal |
|---|---|---|
| GR-100 | Ottoman | RK Guest Room pkg p.62 |
| GR-101 | Sleeper Sofa | RK Guest Room pkg p.63 — **verify**: untitled page, dims/fabric match |
| GR-300 | Queen Headboard ×2 | RK Guest Room pkg p.1 (62" queen) |
| GR-302 | Vanity @ Guest Bath | RK Guest Room pkg pp.3–5 **+ Moen Bathroom Vanity Faucet submittal** (Bathroom Vanity & Kitchenette Sink & Facuet folder — the faucet trim that sets the sink cutout; both mapped in links-101.json) |
| GR-308 | Working Wall @ QQ Conn | RK Guest Room pkg pp.30–35 ("NEED 5 LEFT SIDE" note printed) |
| GR-318 | Sofa Table @ Sofa | RK Guest Room pkg p.55 (titled "Side Table @ Sofa") |
| GR-321 | Wall Shelf @ Bathroom | RK Guest Room pkg p.60 |
| GR-322 | Nightstand @ QQ | RK Guest Room pkg p.58 — **COUNT DISCREPANCY (line is FLAGGED on the template): Austin's paper sheet checked 3 nightstands (GR-319 @ R / GR-322 / GR-323 @ L); the DB/A555 carries only GR-322 ×1. Confirm the real count on A555 before ordering/turnover.** |
| GR-402.1 | Divider Drapery Hardware | WingIts rod spec sheet — direct match (the parent GR-402 fabric panel is only partial, see below) |
| GR-500 | Art Above Sofa | Kalisher Hilton Submittal #3 (names GR-500 explicitly) |
| 901 | Refrigerator (Danby DFF101B1BSSDB) | Refridgerator.pdf + Danby-branded duplicate in Food Service subfolder |
| 902 | Dishwasher | 18 In + 24 In Dishwasher.pdf — **FLAGGED: both models carried, don't pick one** (Food Service subfolder duplicates the 24" only — not a selection signal) |
| kn 11 | OTR Microwave (Danby DOM16A2SSDB) | Over the Range Microwave.pdf + Danby-branded duplicate in Food Service subfolder |

## Partially covered — 2 lines
- **GR-402** Divider Drapery — the WingIts rod/ceiling-mount **hardware** is submitted (see GR-402.1); the drapery **FABRIC PANEL itself is not**. Chase the panel submittal.
- **(untagged, FLAGGED) Garbage disposer (ITM-0083)** — a candidate cutsheet **IS already on Drive**: Moen GX PRO GXP33c, 1/3 HP, 115 V / 4.5 A (Food Service subfolder) — consistent with the dedicated 480 VA "Disposer" circuit on E400 Panel A/B (E103). Do **not** chase paper; the open item is **whether Room 101 actually gets one** — no disposer in P104 or on any ID/arch sheet. Resolve existence before ordering. *(Prior revision wrongly said no cutsheet existed anywhere — corrected.)*

---

## GAPS — chase these — 25 lines

### Lighting — nothing submitted (7 tags)
No guestroom lighting submittal anywhere on Drive.
- **GR-200** Side Table Lamp
- **GR-201** Desk Lamp
- **GR-203** Vanity Sconce (legend prints "VANITY SCONE" sic; possibly = electrical WS03 — unconfirmed)
- **GR-204** Sconce @ Wall Hook
- **GR-205** Floor Lamp
- **GR-207** Nightstand Sconce @ QQ Center
- **GR-208** Nightstand Sconce @ QQ Side ×2 — *also the only 101 tag not found in the ID-set text layer; confirm on ID-5.8*

### Bedding — nothing submitted (3 tags)
- **GR-600** Queen Mattress Set ×2
- **GR-600.1** Queen Box Spring Cover ×2
- **GR-602** Queen Bed Base ×2

### Window treatments (2 tags; GR-402 fabric panel tracked as a partial above)
- **GR-400** Blackout & Sheer Roller Shade (manual)
- **GR-403** Closet Drapery @ Guest Suite

### Seating (1 tag)
- **GR-103** Ergonomic Task Chair

### Mirrors (2 tags)
- **GR-501** Vanity Mirror
- **GR-502** Full Length Mirror — *may ship integrated with the working wall (RK pages carry "MIRROR STAINLESS STEEL" + hanger callouts) — confirm with RK before chasing separately*

### Bath accessories — entire HD package missing (7 tags)
No bath-accessory hardware submittal exists on Drive at all. All seven are drawn on ID-5.10 / A530 elevations only.
- **HD-03** Toilet Tissue Dispenser *(elevation-sourced, MEDIUM reliability)*
- **HD-08** Grab Bar ADA 24" vertical *(elevation-sourced, MEDIUM reliability)*
- **HD-12** Robe / Coat Hook ×2
- **HD-16** Shower Soap Dispenser
- **HD-18** Shower Footrest
- **HD-21** Soap Dish
- **HD-22** Towel Bar 24"

### OS&E / unresolved (3 lines)
- **903** Television — likely OS&E; no cutsheet
- **904** Clock / radio — likely OS&E; no cutsheet
- **905** Telephone — likely OS&E; no cutsheet

---

### Notes for the chase
- **Nightstand count (GR-322):** the paper sheet counted and initialed **three** nightstands
  (GR-319 @ R, GR-322, GR-323 @ L) but the DB/A555 tag set carries only **GR-322 ×1** — GR-319
  and GR-323 have no DB counterpart. The template line is FLAGGED with this note so the field
  crew can't undercount; resolve against A555 (and the RK p.58 submittal qty) before ordering.
- Interim spec cover for every GR gap: *Home2-Dynamic FF&E Specifications Guest Suites* (Home2Suites Specs folder) lists all GR-100→GR-603.1 tags — brand spec, **not** an approved submittal.
- **"kn 11" microwave — three cutsheets exist, verified by reading each:** OTR **DOM16A2SSDB** (Guestroom Appliance folder + Danby-branded duplicate in the Food Service subfolder), plus **TWO different countertop models**: `Countertop Microwave.pdf` = **DBMW1126BBS** (900 W, black + stainless) and `Danby Microwave DDMW1125BBS.pdf` = Designer **DDMW1125BBS** (1000 W, stainless, Food Service subfolder). Confirm countertop-vs-OTR by room condition, and if countertop, **which** of the two models.
- Clickable Drive URLs for everything above are in `links-101.json` alongside this file.
