# H2SEP Room Checklist PWA — UI/UX Specification

**Product name (working):** "Triun Rooms" — app-bar title `H2SEP · Room Checklists`
**Platform:** phone-first PWA (vanilla JS SPA, hash routing), installable, offline-first (Firestore persistence).
**This document is the complete build spec: layouts, measurements, states, gestures, tokens, and copy. No mockups needed.**

---

## 1. Design Principles

1. **Paper fidelity first.** Room screen must read like Austin's paper sheet: flat list, bold item codes, a box that fills with red handwritten-style initials, red uppercase issue notes inline. Trust comes from recognition, not novelty.
2. **Gloves-and-sunlight.** Every interactive target ≥ 48×48 px, high-contrast text (≥ 7:1 for body on both themes), no hover-dependent UI, no tiny swipe gestures as the only path to anything.
3. **One thumb.** Primary actions live in the bottom 60% of the screen; app bar holds only navigation and status. Prev/Next room arrows let a checker walk a corridor without ever leaving the room screen.
4. **Offline is normal, not an error.** Offline UI is a calm status pill, never a red warning. Everything is tappable offline; nothing is disabled.
5. **No dead ends.** Every screen has a back chevron; browser/Android back always works (hash routes: `#/`, `#/floor/2`, `#/room/204`, `#/room/204/edit`, `#/templates`, `#/settings`, `#/room/204/print`).

---

## 2. Screen Inventory & Navigation Map

```
S0 Onboarding (first run only, then reachable from Settings)
S1 Home / Dashboard        #/
 ├─ S2 Floor view          #/floor/{n}
 │   └─ S3 Room checklist  #/room/{num}        ← THE core screen
 │       ├─ S3a Issue sheet (bottom sheet, no route)
 │       ├─ S3b Room-note sheet (bottom sheet)
 │       ├─ S6 Edit items  #/room/{num}/edit   (admin)
 │       └─ S9 Print view  #/room/{num}/print  (pro)
 ├─ S4 Add/Edit room       #/room/new, #/room/{num}/settings (admin)
 ├─ S5 Templates           #/templates, #/templates/{typeId} (admin)
 └─ S7 Settings            #/settings
S8 Install-hint screen     #/install (also auto-banner until installed)
```

- **No bottom tab bar** — the hierarchy is only 3 levels deep; a tab bar wastes 56 px of checklist space. Navigation = app-bar back chevron + two persistent shortcuts (see 3.1).
- **Go-to-room jump:** magnifier icon in the app bar on S1/S2 opens a numeric keypad overlay; typing `204↵` routes straight to `#/room/204`. Fastest path from anywhere to any room in ≤ 4 taps.

### App shell (all screens)

- **App bar:** 56 px tall, sticky. Left: back chevron (44×56 hit area) or Triun mark on Home. Center/left-aligned: screen title, single line, truncating. Right: contextual icons (max 2) + **offline pill** (see 5.6).
- **Content:** scrollable, `max-width: 640px` centered (so it also looks sane on a tablet/desktop), 16 px side padding.
- **Toasts:** bottom, above safe-area inset, auto-dismiss 3 s, one at a time.

---

## 3. Screen Specs

### S1 — Home / Dashboard (`#/`)

Purpose: 5-second answer to "how done are we?" and a launchpad to floors.

Layout, top to bottom:

1. **Hero card** (full width, 140 px): left — SVG **progress ring** 96 px, 8 px stroke, showing overall % complete (checked items ÷ total items, all rooms), % as 28 px bold in the center. Right — three stat lines, 15 px:
   - `4,912 / 5,430 items checked`
   - `128 / 181 rooms complete` (room complete = 100% checked AND 0 open issues)
   - `47 open issues` — rendered in issue-red, tappable → opens S2-style filtered list of all rooms with issues ("Issues" pseudo-floor view).
2. **Floor cards**, one per floor, 72 px tall, in a vertical stack:
   - Left: `Level 1` (17 px semibold) + `45 rooms` (13 px secondary).
   - Middle: horizontal **progress bar** 8 px tall, rounded, fill = complete-green; a thin red tick segment at the right end proportional to rooms-with-issues.
   - Right: `82%` (17 px) + issue badge: red circle ≥ 20 px with white count (`6`), hidden when 0.
   - Whole card taps → S2.
3. **`+ Add floor`** ghost button (dashed 1 px border, 48 px tall). Visible only in admin mode; tapping outside admin prompts PIN.

Empty state (fresh install, DB empty): hero shows `— %`, copy: *"No rooms yet. Add a floor to get started, or ask Claude to load your paper sheets."* + primary button `Add floor`.

App bar right icons: search (go-to-room), gear (Settings).

### S2 — Floor view (`#/floor/{n}`)

Title: `Level 2`. Right icons: search, `+` (add room, admin).

1. **Filter chips row** (horizontally scrollable, 36 px tall chips): `All` `In progress` `Issues` `Done` `Not started`. Active chip = filled accent; counts inside chips (`Issues · 6`). Persist selection per session.
2. **Floor switcher:** segmented control `1 | 2 | 3 | 4` directly under the app bar, 40 px tall — hop floors without going Home.
3. **Room grid:** 3 columns (`repeat(auto-fill, minmax(104px, 1fr))`, 8 px gap). Each **room card** (~104×96 px):
   - Room number: 22 px bold, top-left (`204`).
   - Type abbreviation: 11 px uppercase secondary (`QQ CONN`, `K STUDIO`, `QQ ADA`); ADA gets a small outlined `ADA` chip.
   - Bottom: 6 px progress bar full-card width.
   - **Status skin:** not started = plain card; in progress = plain + partial bar; complete = complete-green tinted background + small check glyph top-right; has issues = 3 px issue-red left border + red count badge top-right (badge wins over check).
   - Tap → S3. Long-press → context sheet: `Open` / `Room settings` / `Print` (pro) / `Duplicate as…` (admin).
4. `+ Add room` dashed card at grid end (admin).

Type abbreviations (fixed map, shown in room cards and S3 header): `QQ`, `QQ WIDE`, `QQ CONN`, `QQ STUDIO`, `K STUDIO`, `K STU CONN`, `K 1BR`, suffix ` ADA` where applicable.

### S3 — Room checklist (`#/room/{num}`) — THE CORE SCREEN

Must feel like the paper page. Flat list, paper order by default.

**Room header block** (sticky under app bar, collapses to a slim 40 px bar on scroll):

```
Room 101                      QQ STUDIO CONNECTOR
[███████████░░░]  23/30 checked · 76%   ⚠ 3 issues
★ CONNECTING DOOR LOCK – NOT LOCKING          (red)
★ Touch-up paint N wall complete              (neutral)
[+ ★ Add room note]
```

- Room number 24 px bold; type 12 px uppercase tracking +0.5, secondary color (Pro theme: white on navy band).
- Progress bar 10 px; count line 14 px; `⚠ n issues` in issue-red, tap → scrolls to first open-issue row.
- **★ room-note rows:** 44 px min height, star glyph in accent, note text 15 px. Notes flagged as issues render **uppercase, bold, issue-red** — exactly like the paper's starred red note. Tap a note → sheet: `Edit` / `Mark resolved` / `Delete`. Resolved notes collapse into a `Resolved (2)` disclosure line.
- Collapsed sticky state shows only: `101 · 76% · ⚠3`.

**Item list.** Default order = stored sheet order (paper order). App-bar overflow menu offers `Group by category` toggle (groups by code prefix: Seating/Furniture GR-1xx, Lighting GR-2xx, Casegoods GR-3xx, Drapery GR-4xx, Art & Mirrors GR-5xx, Bedding GR-6xx; slim 28 px gray section headers). Toggle is remembered per user; default OFF for paper fidelity.

**Item row anatomy** (min height 56 px, 12 px vertical padding, hairline divider):

```
┌──────┐  GR-202  Nightstand Sconce            ⚑
│  CC  │  — NEED INSTALL                    (1 of 2)
└──────┘
```

- **Check box:** 44×44 px, 2 px border, 6 px radius, left-aligned. States drawn inside (see 4.1). This is the row's primary tap target; the rest of the row is also tappable and does the same thing (whole-row tap = box tap), EXCEPT the flag icon.
- **Item code** `GR-202`: 15 px **bold**, tabular; **label**: 15 px regular, same line, wraps to 2 lines max.
- **Inline issue note:** second line, 13 px, **UPPERCASE, bold, issue-red**, always prefixed with an em-dash and space: `— NEED INSTALL` — verbatim the paper convention.
- **Duplicate disambiguation:** when a code appears N > 1 times, each instance renders a right-aligned 11 px gray chip `1 of 2`, `2 of 2` (stored per instance; templates define `qty`). Optionally labeled instances show `Bed 1` / `Bed 2` instead when the template names them.
- **Flag icon** `⚑`: 44×44 hit area at row end, 20 px glyph, gray when no issue, issue-red filled when open issue. This is the discoverable alternative to long-press.
- **Pending-sync dot:** 6 px gray clock-dot at the box's top-right corner while the write is unacked (see 4.5).

**Footer bar** (fixed bottom, 56 px + safe area, background = surface, top hairline):
`◀ 100` | `Room 101 — 23/30` | `102 ▶` — prev/next room on the same floor in numeric order. Center text taps → scroll to top. This is the corridor-walking control; arrows are 56 px wide hit areas.

Overflow menu (app bar `⋮`): `Group by category`, `Edit items` (admin → S6), `Room settings` (admin → S4-edit), `Print / PDF` (pro → S9), `Reset room…` (admin, double-confirm).

### S4 — Add / Edit Room (admin)

Form screen, fields top-to-bottom, 48 px inputs:

1. **Room number** (numeric pad, required, unique — inline error `Room 204 already exists`). Floor auto-derives from the hundreds digit and shows as read-only helper text (`Level 2`), overridable via a dropdown for odd numbering.
2. **Room type** — dropdown of templates; picking one shows helper `Will pre-load 31 items from QQ Studio Connector template`.
3. Toggles: `ADA / Accessible`, `Connector`.
4. Primary button `Create room` (full width, 52 px). Secondary link `Start empty (no template)`.
5. **Bulk add** disclosure: `Add a range…` → fields `From 201` `To 215` + checkboxes `odd only / even only / all` + one template → creates the batch, confirmation toast `Created 8 rooms on Level 2`.

Edit mode adds: `Change type…` (warns: *"Replaces unchecked items with the new template; checked items and issues are kept"*) and a danger-zone `Delete room` (type the room number to confirm).

### S5 — Templates (admin)

- List of room-type templates: name, item count, `used by 34 rooms`.
- Template detail = same editor as S6 (below) operating on the template.
- **`Duplicate to rooms…`** action: opens room multi-picker (floor-sectioned checkbox list + `Select range` helper). Confirmation states the write plainly: *"Add these 31 items to 6 rooms? Existing check marks are not touched; items are appended if missing."*
- `+ New template` and `Duplicate template` (copy an existing type, e.g. make the ADA variant).

### S6 — Edit item list (admin; per-room or per-template)

- Rows: drag handle (≡, 44 px) · code · label · qty stepper (1–4) · overflow (`Edit` / `Delete`).
- Reorder via drag handle (long-press-drag on touch); order = paper order.
- `+ Add item` row pinned at bottom → inline form: `Code` (uppercase-forced, pattern hint `GR-###`), `Label`, `Qty`. Qty 2 creates two instances (`1 of 2`, `2 of 2`).
- When editing a **room's** list where the room came from a template, saving asks once: `Also update the "QQ Studio Connector" template?` `[Just this room] [Room + template]`.
- Deleting an item that is already checked requires confirm: *"GR-103 is checked by CC. Delete anyway?"*

### S7 — Settings (`#/settings`)

Sections:

1. **You** — `Full name` text field; `Initials` field (auto-derived, editable, 2–3 chars, uppercase-forced) with a **live preview box**: a 44 px checkbox rendered filled with the initials exactly as they'll appear ("This is how your check mark will look"). Stored locally + on the device's anonymous-auth profile doc.
2. **Admin** — `Enter admin PIN` (4–6 digits, numeric pad). While unlocked: green `Admin mode on` row with `Lock` button; auto-locks after 30 min. Admin gates: add/delete floors/rooms/items/templates, un-checking someone else's mark, reset room, changing the PIN.
3. **Appearance** — theme radio: `Clean (free)` / `Triun Pro` (Pro row shows a lock glyph + `Pro` chip in the free build).
4. **Sync & storage** — status line (`Online — all changes synced` / `Offline — 12 changes queued`), device ID (short), `Re-show install instructions` → S8, app version + `Check for update` (reloads SW).

### S8 — Onboarding & Install hint

First run (3 steps, full-screen cards, `Skip` top-right):

1. **Who are you?** Name + initials (same control as Settings). Cannot skip initials — checking requires them.
2. **How it works** — one card, three illustrated lines: *"Tap the box — your initials go in, just like the paper." / "Long-press or tap ⚑ to flag a problem." / "Works with no signal. Syncs when you're back in coverage."*
3. **Install it** — platform-detected:
   - **iOS Safari:** numbered visual steps: `1. Tap the Share button (square with arrow, bottom of Safari) 2. Scroll — tap "Add to Home Screen" 3. Tap "Add"`, each step with a large inline glyph of the actual iOS icon. Warning line: *"Must be done in Safari, not from a link inside another app."* (If opened in an in-app browser, detect and show *"Open in Safari first"* with the copy-link button.)
   - **Android/Chrome:** big `Install app` button wired to the captured `beforeinstallprompt`; fallback text instructions (⋮ → Add to Home screen).
   - **Already installed** (`display-mode: standalone` matches): step 3 is replaced by "You're all set."

Until installed, S1 shows a dismissible slim banner: `Install this app for offline use → How`. Dismissal persists 7 days.

---

## 4. Core Interaction Spec

### 4.1 Item state machine

Two orthogonal fields per item instance: `check` (null | {initials, name, uid, ts}) and `issue` (null | {note, openedBy, ts, resolved?}).

| Visual state | Box rendering | Row rendering |
|---|---|---|
| **Unchecked** | empty box, 2 px neutral border | normal text |
| **Checked** | box border turns complete-green; **initials centered, 16 px, bold, issue-red ink `#C00000`, rotated −3°** (pen-on-paper feel) | row background: 4% complete-green tint |
| **Open issue, unchecked** | box empty; border issue-red; small red `⚑` in corner | red note line; flag icon filled red |
| **Open issue, checked** | initials as above + red corner `⚑` | green tint + red note (i.e., "installed but damaged") |
| **Resolved issue** | as checked | note line struck-through, gray, collapses under a `resolved` disclosure after 24 h |

### 4.2 Gestures & taps

- **Tap (box or row), unchecked item →** instantly checked with the current user's initials. 120 ms scale-pop animation of the initials; `navigator.vibrate(10)` where supported. No confirm — speed is the point.
- **Tap a checked item →** bottom action sheet: header `Checked by Chris Cortez (CC) · Jul 30, 2:14 PM`, actions: `Un-check` / `Flag issue…` / `Cancel`. **Un-check rules:** your own mark — immediate, with a 5 s `Undo` toast. Someone else's mark — confirm dialog *"Remove CC's check?"*; allowed for everyone by default but written to the audit trail (`uncheckedBy`); admin PIN can optionally be required (Settings toggle `Only admin can un-check others`).
- **Long-press any row (500 ms) OR tap ⚑ →** Issue sheet (4.3).
- **Tap an open-issue row's box →** action sheet: `Resolve & check` (one tap = the common "fixed it, checking it off" flow: sets check + resolves issue) / `Resolve only` / `Edit note` / `Clear issue (mistake)` / `Cancel`.
- No swipe actions. (Swipes conflict with scroll on dusty screens; everything has a visible control.)

### 4.3 Issue sheet (bottom sheet, ~60% height)

- Title: `GR-600 · Q Mattress — flag issue`.
- **Quick-pick chips**, 2-column grid, 48 px tall, uppercase: `NEED INSTALL` `NEED PROPER PLACE` `IN BOX` `DAMAGED` `MISSING` `WRONG ITEM`. One tap on a chip = saves immediately and closes (fast path).
- `Custom…` chip → inline text field (auto-uppercased on save) + `Save`.
- Optional `Also add photo` button (pro tier; hidden in free).
- A second flag on the same item replaces the note (single note per instance; the previous note is kept in the audit trail).

### 4.4 Duplicates of the same code

- Each physical instance is its own row and its own record (`GR-620#1`, `GR-620#2`).
- Rendered identically except the right-aligned `1 of 2` chip (or template-provided label `Bed 1`).
- Rows for the same code are always adjacent in paper order.
- Checking one never affects the other; the room counts each instance as one line, matching the paper's duplicated lines.

### 4.5 Offline & sync cues

- **Offline pill** (app bar, right of title, all screens): online = hidden. Offline = pill `⇅ Offline`, neutral gray, 12 px text; when queued writes exist: `⇅ Offline · 12`. Tap → mini sheet: *"No connection. Everything still works — 12 changes are saved on this phone and will sync automatically."*
- **Per-write pending dot:** any row whose latest write is local-only (Firestore `hasPendingWrites`) shows the 6 px gray clock-dot on the box corner; it fades out on server ack. This is deliberately subtle — pending is normal.
- **Reconnect moment:** pill flips to green `⇅ Syncing…` then disappears after the queue drains; toast `All changes synced` only if the queue was > 0.
- **Live remote updates:** when a realtime update changes something currently on screen, the affected row/ card flashes a 400 ms accent-tint highlight; if it's a check by someone else, a passive toast `JT checked GR-400 · Rm 101` (max 1 per 5 s, coalesced: `JT checked 6 items · Rm 101`). No pull-to-refresh anywhere; a manual `Sync now` lives in Settings for peace of mind only.
- **Conflicts:** field-level last-write-wins (Firestore merge). The only visible case: you and a teammate check the same box offline → both wrote a check; last writer's initials stand; no error shown (both agree it's done). Un-check racing a check resolves to whichever synced last — acceptable at this stakes level; audit trail keeps both events.

---

## 5. Visual Design System — one layout, two themes

Implementation: CSS custom properties on `:root[data-theme="clean"|"pro"]`. Identical DOM, spacing, and type in both themes.

### 5.1 Color tokens

| Token | Clean (free) | Triun Pro |
|---|---|---|
| `--app-bar-bg` | `#FFFFFF` (hairline bottom border) | **`#1F4E78`** navy |
| `--app-bar-fg` | `#111827` | `#FFFFFF`, **bold** titles |
| `--bg` | `#F4F5F7` | `#EFF3F8` (faint cool tint) |
| `--surface` (cards/rows) | `#FFFFFF` | `#FFFFFF` |
| `--text` | `#111827` | `#15304B` |
| `--text-2` (secondary) | `#6B7280` | `#5B7290` |
| `--accent` (chips, links, ★, progress track fill on bars) | `#2563EB` | `#1F4E78` |
| `--done` / `--done-tint` | `#1E8E3E` / `#C6EFCE` | `#1E7A34` / `#C6EFCE` |
| `--issue` / `--issue-tint` | `#C00000` / `#FFC7CE` | `#C00000` / `#FFC7CE` |
| `--warn` / `--warn-tint` (pending-issue/amber) | `#9C6500` / `#FFEB9C` | `#9C6500` / `#FFEB9C` |
| `--ink-initials` | `#C00000` both themes — red pen, always | same |
| `--hairline` | `#E5E7EB` | `#D7E0EA` |

Status trio intentionally matches Austin's Excel conditional-formatting palette (`#FFC7CE / #FFEB9C / #C6EFCE` fills with dark red/amber/green text) so the app reads as the same system as his QC tracker.

Pro theme extras: section headers and the room-header band render as navy bars with white bold uppercase text (mirrors the QC tracker's header rows); floor cards get a 3 px navy top border.

### 5.2 Typography

System stack only: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. Numerals: `font-variant-numeric: tabular-nums` on codes, counts, room numbers.

| Role | Size / weight |
|---|---|
| Room number (S3 header) | 24 px / 700 |
| Screen titles, hero % | 20–28 px / 700 |
| Card room number | 22 px / 700 |
| Item code | 15 px / 700 |
| Item label, notes body | 15 px / 400 |
| Issue note line | 13 px / 700, uppercase, letter-spacing 0.3 px |
| Secondary/meta/chips | 11–13 px / 400–600 |
| Box initials | 16 px / 700, uppercase, −3° rotation |

### 5.3 Spacing, shape, elevation

- 4 px base grid; screen gutter 16 px; card padding 12–16 px; list row vertical padding 12 px.
- Radii: cards 12 px, chips/pills 999 px, checkbox 6 px, sheets 16 px top corners.
- Elevation: cards `0 1px 2px rgba(0,0,0,.06)`; bottom sheets `0 -4px 24px rgba(0,0,0,.18)` + scrim `rgba(0,0,0,.4)`.
- Touch targets: min 44 px, standard 48 px; footer arrows 56 px.

### 5.4 Components (canonical list)

App bar · offline pill · progress ring (SVG, 8 px stroke, track `--hairline`, fill `--done`) · progress bar (8–10 px, rounded) · floor card · room card · filter chip · item row · checkbox · flag button · bottom action sheet · issue sheet · ★ note row · text/number inputs (48 px, 1 px border, accent focus ring 2 px) · primary button (52 px, filled accent, white bold text) · ghost/dashed add-button · toast · confirm dialog · segmented control · numeric PIN pad.

### 5.5 Motion

Fast and few: sheet slide-up 200 ms ease-out; initials pop 120 ms; remote-change flash 400 ms; progress bars animate width 300 ms. `prefers-reduced-motion` disables all.

---

## 6. Paper-Fidelity Checklist (the trust details)

1. Default item order = the paper sheet's order, never auto-sorted.
2. Codes **bold**, exactly as written (`GR-400`), label follows on the same line — one line, like the paper row.
3. Issue notes inline on the item, `— NEED INSTALL` em-dash prefix, uppercase, red — identical phrasing to the sheet, quick-picks use his exact vocabulary.
4. Check = **initials in red ink inside the box**, not a generic checkmark. Slight rotation sells it.
5. ★ room-level note rows with a real star glyph, red when unresolved.
6. Duplicated lines appear twice, adjacent, like the paper.
7. Room header = room number + type in uppercase, plus `% done · open issues` — the at-a-glance line a super writes at the top of the page.
8. Print view (S9) reproduces the form so a paper copy can still go in the closeout binder.

---

## 7. PWA Install & Offline UX

### 7.1 Manifest

```json
{
  "name": "H2SEP Room Checklists",
  "short_name": "H2SEP Rooms",
  "start_url": "./index.html#/",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#1F4E78",
  "theme_color": "#1F4E78",
  "icons": [
    {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
    {"src": "icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
  ]
}
```

- Icon: navy `#1F4E78` rounded square, white bold `H2` mark (generated PNGs, no external assets). iOS additionally needs `<link rel="apple-touch-icon" href="icons/icon-180.png">` and `<meta name="apple-mobile-web-app-capable" content="yes">` + `apple-mobile-web-app-status-bar-style: default`.
- Service worker precaches the full app shell (HTML/CSS/JS + **vendored** Firebase SDK files) — the app must cold-boot with zero network. Data offline-ness comes from Firestore IndexedDB persistence, not the SW.
- iOS note surfaced in S8 fine print: *"Open the app from its home-screen icon (not Safari) so your offline data is protected."* (Home-screen installed apps get their own persistent storage bucket; plain Safari tabs are subject to eviction.)

### 7.2 Offline experience summary

Everything in section 4.5, plus: launching cold with no signal shows cached data instantly with the offline pill; screens never block on network; there are no spinners for reads (local-first render, remote patches in silently).

---

## 8. Print / Export View — Pro tier (S9, `#/room/{num}/print`)

- Reached from S3 overflow `Print / PDF`. Renders a clean sheet, then `window.print()`; on iOS the share sheet's "Save to Files/Print" produces the PDF.
- Layout (Letter, portrait, print stylesheet `@media print`, on-screen preview identical):
  - **Header band** (navy in Pro, prints acceptably in grayscale): `TRIUN CONSTRUCTION & ENGINEERING — H2SEP · Home2 Suites, Eagle Pass TX`; below: `ROOM 101 — QQ STUDIO CONNECTOR`, `76% complete · 3 open issues · printed Jul 31, 2026`.
  - ★ room notes block, red text for open ones.
  - **Item table:** columns `☐ | Code | Item | Notes | By / Date`. Checked rows print the initials inside the box cell in red and the date in the last column; open issues print the red uppercase note in Notes.
  - Footer: `Inspected by ______  Date ____` and `Verified by ______  Date ____` signature rules + page `1 of n`.
- Free tier: menu item visible but locked with a `Pro` chip → one-line upsell sheet.

---

## 9. Accessibility & Field Notes

- Checkbox rows: `role="checkbox"` + `aria-checked`, label = `code + name + status ("checked by CC")`; sheets use `role="dialog"` with focus trap.
- All status conveyed by color is doubled with a glyph or text (⚑, `1 of 2`, note text) — no color-only meaning.
- Contrast: body text ≥ 7:1; red-on-white `#C00000` ≥ 5.9:1; never red text on the pink tint (tints are row backgrounds behind dark text only).
- Font sizes respect user OS text scaling (`rem`-based); layout tolerates 1.3× without truncating item labels (they wrap).
- Sunlight: no gray-on-gray below 4.5:1 anywhere; progress bars have 1 px borders so they read on washed-out screens.

## 10. Free vs Pro — UI-visible differences

| Area | Free / Clean | Triun Pro |
|---|---|---|
| Theme | Clean light | Navy-branded (5.1) |
| Print/PDF room sheet | locked | included |
| Photo on issues | hidden | `Also add photo` in issue sheet |
| Domain / app icon label | github.io URL | custom domain; same PWA, optional Capacitor store builds (zero UI change) |
| Everything else (offline, sync, checking, admin, templates) | identical | identical |