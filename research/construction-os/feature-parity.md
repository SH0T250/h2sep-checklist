# H2SEP Feature Parity Contract

Generated 2026-08-15 from the live code at commit d5a5670 by four independent code-reading agents.
This is the carry-forward contract for the platform rebuild (EPIC BUILD prompt, Section 4.3):
**every feature below ships in the new platform unless Austin gives a written OK to drop it.**

Live-data census at kickoff backup (2026-08-15, backup gitignored):
115 guest rooms + 66 spaces + 115 MEP punch docs (296 docs, 0 soft-deleted) · 12 templates ·
12,823 live item lines · 1,376 check-offs · 2,142 issue flags (2,128 open) · 44 room notes ·
field work present in 114 guest rooms + 3 spaces · guest-room progress by floor:
F1 382/650 · F2 579/1347 · F3 412/1346 · F4 3/1346 checked.


## Crew app (phone PWA)

### Hash router with 8 screens
*Area: crew app / boot & routing* · `js/app.js:19-66`

Routes: #/ (home), #/welcome, #/install, #/common, #/floor/{n}, #/room/{number}, #/room-new/{floor}?edit={number}, #/settings. Unknown routes fall back to home. Re-renders on hashchange and on every store change (coalesced via requestAnimationFrame). Same-screen re-renders preserve scroll position; navigation resets scroll to 0. All open bottom-sheets and any visible toast are dismissed on every route change.

### Onboarding gate
*Area: crew app / boot & routing* · `js/app.js:24-28`

If no user identity exists in localStorage (h2sep-user) and sessionStorage h2sep-viewonly is not set, EVERY route except #/welcome and #/install redirects to the welcome screen.

### Identity capture (name + initials)
*Area: crew app / onboarding (welcome screen)* · `js/screens.js:915-951, js/store.js:56-62`

Welcome screen asks Full name (max 40 chars) + Initials (max 3, uppercased). Initials auto-derive from the first letters of the typed name words until the user manually edits the initials field (dataset.touched flag), after which auto-derive stops. Live preview shows how the initials will look inside a check box (placeholder 'AB'). Start requires non-empty initials (toast 'Initials are required to check items'). Saved to localStorage key h2sep-user as {name, initials(uppercased, trimmed)}.

### iOS install gate
*Area: crew app / onboarding (welcome screen)* · `js/screens.js:883-913, 952-965; js/screens.js:13-20 (canWrite); js/util.js:59-70 (platform detection)`

On iOS Safari (not standalone), the welcome screen shows 'Step 1 — Install the app' with Share → Add to Home Screen steps instead of the identity form; writing is BLOCKED on iOS until the app runs standalone (installed). A 'Skip for now — view only' link sets sessionStorage h2sep-viewonly=1 and enters read-only browsing. In-app browsers (FB/Instagram/Twitter/Line/GSA/DuckDuckGo UAs) get a 'Copy link' button + instruction to open in Safari.

### Android install prompt capture
*Area: crew app / onboarding (welcome screen)* · `js/app.js:14-17, js/screens.js:907-911, 954-960`

beforeinstallprompt is captured at boot into window.__installPrompt; welcome/install screen shows a native 'Install app' button when available, otherwise manual menu instructions. #/install (renderWelcome installOnly) is reachable from Settings any time.

### How-it-works primer
*Area: crew app / onboarding (welcome screen)* · `js/screens.js:925-929`

Welcome shows a 3-line primer: tap the box to put initials in like paper; long-press or tap the flag to mark a problem (NEED INSTALL, IN BOX…); no signal? keep working, everything syncs.

### Project-wide progress hero
*Area: crew app / home screen* · `js/screens.js:58-90, js/util.js:132-142 (roomStats), js/store.js:100-103`

SVG progress ring with overall % of items checked, plus stats: N/M items checked, N/M rooms complete, N open issues. Counts cover GUEST ROOMS ONLY (spaces and MEP docs excluded via isSpaceDoc/isMepDoc filters). A room is 'complete' only when total>0, all items checked AND zero open issues/red notes.

### Floor cards
*Area: crew app / home screen* · `js/screens.js:91-107`

One card per floor (sorted by sort field) linking to #/floor/{n}: floor label, room count, progress bar, %, and an open-issue count badge.

### Common Areas rollup card
*Area: crew app / home screen* · `js/screens.js:108-127`

All common-area spaces roll up into ONE card beside the floors (Austin's ruling: a facilities walk is its own trip) with aggregate progress bar, %, space count, subtitle 'lobby, amenities, BOH', issue badge; links to #/common. Card hidden when no spaces exist.

### Add floor (admin)
*Area: crew app / home screen* · `js/screens.js:133-147, js/store.js:551-560`

'+ Add floor' ghost button requires admin PIN (sheet if locked), then a numeric-input sheet creates floor {label:'Level N', sort:N}. Live mode merges into config/app doc's floors map.

### Empty/loading states
*Area: crew app / home screen* · `js/screens.js:80-82`

Shows 'Loading…' before store ready; 'No rooms yet. Add a floor and rooms, or ask Claude to load your paper sheets.' when ready and empty.

### Floor number segmented switcher
*Area: crew app / floor screen* · `js/screens.js:198-201`

Row of segment buttons, one per floor, linking between floors; current floor highlighted.

### FF&E ⇄ MEP PUNCH floor toggle
*Area: crew app / floor screen* · `js/screens.js:171-176, 202-208, 225, 235-238`

When any MEP punch docs exist on the floor, a two-tab switch shows 'FF&E · count' vs 'MEP PUNCH · count'. Choice persists in sessionStorage h2sep-floorview. The grid shows one family or the other, never mixed. In MEP view the add-room ghost button is hidden.

### Status filter chips
*Area: crew app / floor screen* · `js/screens.js:164, 178-191, 209-212, 227, 231-234`

Chips All / In progress / Issues / Done / Not started, each with a live count. Definitions: In progress = done>0 && !complete; Issues = openIssues>0; Done = complete; Not started = done==0 && total>0. Selection persists in sessionStorage h2sep-filter (shared across floors). Empty-state message names the active filter.

### Room grid cards
*Area: crew app / floor screen* · `js/screens.js:213-224, js/util.js:144-153`

Each card links to #/room/{number} and shows room number, abbreviated type (QQ/K/CONN/STU/1BR/WIDE via typeAbbrev) with a separate ADA chip, a progress bar, and top-right either an open-issue count badge, or a ✓ glyph when complete. MEP cards show the parent room number and 'MEP · {itemCount}' instead of type. Cards get done/issues CSS states.

### Add room (admin)
*Area: crew app / floor screen* · `js/screens.js:239-243`

'+ Add room' card requires admin PIN then navigates to #/room-new/{floor}.

### Spaces list grouped by level
*Area: crew app / common areas screen* · `js/screens.js:250-307`

One screen for all non-guest spaces, grouped under 'Level N · count spaces' headers, sorted by floor then number. Name-forward row cards: number (ZONE-x rendered as 'ZONE x'), space name (typeLabel), progress bar, and right side shows issue badge plus either ✓ (complete) or done/total count. Same 5 filter chips as the floor screen but persisted separately (sessionStorage h2sep-cfilter). Empty state distinguishes 'No common areas yet — they arrive with the next data load' vs 'No {filter} spaces.'

### Go-to-room keypad
*Area: crew app / navigation* · `js/sheets.js:379-395, js/screens.js:52-54`

⌕ button in the app bar of home/floor/common/room opens a numeric keypad sheet; entering a number jumps directly to #/room/{n} (works for spaces and MEP ids too).

### Room header card
*Area: crew app / room screen* · `js/screens.js:460-512, js/config.js:22-42`

Shows 'Room {n}' (or space name · number, or 'MEP {base}'), type label uppercased, progress bar, 'done/total checked · pct%'. Action icons: 📄 refs page (refs.html?room=, guest rooms only — hidden for spaces and MEP), 🖨 printable sheet (print.html?room=, always), 🧊 3D model (room-3d.html?room=) ONLY when room.number is in the hardcoded MODEL_ROOMS list in config.js (47 QQ-family rooms; King family deliberately excluded pending its own model). Spaces additionally show a plan note line from SPACE_META (sheet — note). A how-line teaches: tap a line to initial & complete, long-hold for options.

### Room not found / deep-link fallback
*Area: crew app / room screen* · `js/screens.js:338-348`

Unknown room number shows 'Room not found (yet).' (or Loading…), and heuristically subscribes the floor guessed from the first digit of a 3+ digit number plus all floors, so a deep link resolves once data arrives.

### FF&E ⇄ MEP PUNCH per-room toggle
*Area: crew app / room screen* · `js/screens.js:482-496, js/store.js:112-117`

Two-tab switch between #/room/{base} and #/room/{base}-MEP, drawn ONLY when both counterpart docs actually exist (never a dead tab). Not shown for spaces.

### Category grouping + trade filter chips
*Area: crew app / room screen* · `js/screens.js:316-319, 360-390, 515-541, 623-628, js/util.js:124-130`

If any item has item.category (catMode), items group into collapsible category sections ordered by CATEGORY_ORDER (ceiling-down trade order, 22 categories from Drywall to FF&E - Misc); unknown categories append alphabetically; uncategorized ('Other') last. Trade filter chips ('All · n' + one per category with counts) hide other groups; selection is per-visit only (module-level var reset on hashchange) so every room opens on All; data-driven re-renders keep it; a filter whose category vanished remotely resets to All. Rooms with no categorized items (legacy) render one flat list sorted by item.sort.

### Collapsible category sections with per-device memory
*Area: crew app / room screen* · `js/screens.js:322-335, 526-534, 630-637`

Tapping a category header collapses/expands it IN PLACE (no re-render, scroll preserved). Collapsed state is remembered per (room,category) in localStorage h2sep-collapsed; storage failure degrades to everything-open. Selecting a trade chip force-expands that category. Header shows caret, optional MEP letter chip, 'CATEGORY · done/total'.

### Tap to check with initials
*Area: crew app / room screen — check-off mechanics* · `js/screens.js:311-312, 668-679, 686-687, js/store.js:331-351`

Tapping the checkbox OR the row body of an unchecked, issue-free item checks it instantly: the user's initials render inside the box (like paper), haptic vibrate(10ms). Write is an ATOMIC single update of the full field group: items.{id}.checked=true, initials, checkedByName, checkedByUid, checkedAt=serverTimestamp, checkedAtLocal=new Date(), plus room updatedAt. Fire-and-forget with local latency compensation; failure toasts 'Could not save: …'. If a scroll ended <400ms before the tap (accidental-tap guard), an 8s toast 'Checked {code}' with an Undo action appears.

### Checked-item detail sheet & un-check
*Area: crew app / room screen — check-off mechanics* · `js/sheets.js:218-255, js/store.js:353-375, 310-325`

Tapping an already-checked item opens a sheet: 'Checked by {name} ({initials})' or 'Checked (from paper sheet)' when neither exists, plus 'checked {localTime} · synced {serverTime}' when they differ, provenance line (category · trade · sheet src · 'from room-type package'), references. If writable: Un-check button (if the check is NOT yours by initials, a danger confirm 'Remove {initials} check?' first; your own un-checks without confirm) then an 8s 'Un-checked' toast with Undo (re-checks as you). Un-check writes the full atomic inverse group (checked=false, all who/when fields cleared to ''/null) and appends an 'uncheck' audit entry with the previous initials. Also a 'Flag issue…' shortcut.

### Pending-sync dot
*Area: crew app / room screen — check-off mechanics* · `js/screens.js:415, 424, js/store.js:126-128, 140-142`

Items the local device touched, in a room that still has unacked writes, show a small pending dot on the checkbox (title 'Waiting to sync').

### Duplicate-instance ordinals & instance notes
*Area: crew app / room screen — check-off mechanics* · `js/screens.js:354-357, 405-413, 427, 434-436`

When a code appears on multiple rows, each row shows 'k of n' so siblings never look like missing rows; a db instanceNote rides along ('note · 2 of 2') unless it already contains an 'x of y' pattern. FF&E rows show this in a right-hand rail; MEP rows render it as a full-width paragraph under the item. Qty>1 items show a '×N' chip.

### Reliability/verify chips & flagged jump
*Area: crew app / room screen — check-off mechanics* · `js/screens.js:391-393, 414, 428-429, 499-502, 511, 599-622`

reliability=FLAGGED renders '⚠ VERIFY — sources disagree' chip + row styling; MEDIUM renders 'verify'; LOW renders 'verify — scaled source'. Header shows a jump button '⚠ N flagged — two sources disagree; verify both before ordering' that scrolls to the first flagged row (clearing trade filter and expanding collapsed groups if needed). A parallel '⚠ N issues' jump goes to the first open-issue row. If ≥90% of items are derived, a footnote 'Lines come from the room-type package (typicals), not per-room walk.' shows.

### Flag an issue (long-press / flag button)
*Area: crew app / room screen — issue flow* · `js/sheets.js:6, 182-215, js/screens.js:688-702, js/store.js:377-394`

500ms touch long-press on any row, or tapping the ⚑ flag button on the row, opens the issue sheet (write access required; long-press silently ignored read-only, flag button shows the read-only nudge toast). Sheet offers SIX quick-pick chips with the paper vocabulary — 'NEED INSTALL', 'NEED PROPER PLACE', 'IN BOX', 'DAMAGED', 'MISSING', 'WRONG ITEM' — plus 'CUSTOM…' revealing a free-text input (max 120 chars, uppercased on save). Sets items.{id}.issue and issueResolved=false atomically. If an issue already exists, a 'Clear current flag ("…")' button clears it; replacing an existing issue text logs an 'issue-replace' audit entry. Sheet also shows provenance + references.

### Open-issue item sheet (resolve paths)
*Area: crew app / room screen — issue flow* · `js/sheets.js:258-282, js/store.js:396-426, js/screens.js:430-431`

Row with open issue shows '— ISSUE TEXT' (uppercase) note and ⚑ on the box; tapping the box/row opens a sheet with 4 actions: 'Resolve & check ✓' (one tap: issueResolved=true + full check field group in ONE atomic write; if a teammate already checked it while the sheet sat open, resolve WITHOUT restamping their mark), 'Resolve only' (issueResolved=true, issue text kept for history), 'Edit note…' (back to issue sheet), 'Clear flag (mistake)' (issue='' , issueResolved=false — erases). Resolved issues render struck-through '— ISSUE' under the item.

### Room-level notes with issue/info flag
*Area: crew app / room screen — room notes* · `js/sheets.js:285-316, js/screens.js:455-457, 503-510, 639-642, js/store.js:428-466, js/util.js:137-138`

'+ ★ Add room note' (write access required) opens a form: text (max 200) + 'This is a problem (shows red)' checkbox (default checked). flag='issue' notes are UPPERCASED and render red in the room header and count toward openIssues (so they block room 'complete'); flag='info' keeps case. Stored under room.notes.{n_randomId} with text, flag, resolved, createdBy(name), createdByUid, createdAt(serverTimestamp). Open notes show as ★ rows in the header; resolved notes collapse into a 'Resolved (N)' details element, struck through. Tapping a note opens a sheet showing text + 'added by {name}' and a 'Mark resolved'/'Re-open' toggle that reads CURRENT state, not the sheet's snapshot (two-people race guard).

### Ad-hoc add item
*Area: crew app / room screen* · `js/screens.js:644-645, 712-727, js/store.js:513-531`

'+ Add item' (bottom of list and in ⋮ menu) requires write access AND admin PIN. Form: Code (max 20, uppercased, e.g. GR-700) + Item name (max 80). Id is deterministic-ish: codeSlug + next instance letter _a…_z (falls back to random id past 26); sort = max existing sort + 10 (appends last); item built via blankItem (unchecked, empty category ⇒ lands in 'Other').

### ⋮ More menu
*Area: crew app / room screen* · `js/screens.js:556-597`

Sheet with: Submittals & plan references (guest rooms only), Printable sheet ('for the door'), 3D room model (MODEL_ROOMS only), 'Original paper sheet (photo)' (hidden until ./sheets/index.json confirms a scan exists for this room; offline-tolerant), + Add item, Light/Dark mode toggle, 'Room settings (admin)' (guest rooms only — spaces are excluded because the template picker only offers guest-room packages), 'Delete room/space (admin)'.

### Delete room (admin, soft)
*Area: crew app / room screen* · `js/screens.js:586-596, js/store.js:533-549`

Requires admin PIN, then danger confirm 'Delete {what}? It disappears from every phone (recoverable by admin/Claude).' Sets deleted=true ONLY (soft delete — data and check-offs preserved, recoverable), appends 'room-delete' audit entry, navigates back to floor/common. Items likewise only ever soft-delete (items.{id}.deleted=true, 'item-delete' audit) though no crew-app UI currently exposes per-item delete.

### Prev/next room footer
*Area: crew app / room screen* · `js/screens.js:441-453, 543-547, 647`

Footer shows '‹ prev' and 'next ›' links plus a middle button ('Room {n} — done/total') that scrolls to top. Sibling walk NEVER crosses doc families: a space walks only other spaces (all floors), an MEP doc walks only the floor's other MEP docs, a guest room walks only the floor's guest rooms — sorted numerically.

### Print/refs/3D offline handoff
*Area: crew app / room screen* · `js/screens.js:649-665`

On every room render (not just on link click) the full room object is written to sessionStorage h2sep-print-room, so the cold-loading print.html/refs.html/room-3d.html pages can paint from the phone's known data in a dead zone and only refresh when signal exists. Also re-written on click of any print/refs/3D link.

### 📎 refs chips & reference popups
*Area: crew app / room screen — references* · `js/screens.js:432, 682-685, js/sheets.js:28-146, js/refs.js:59-117`

Rows whose item resolves to references show a '📎 N refs' chip; tapping it opens the refs sheet WITHOUT checking the row (stopPropagation — plain row tap still checks; field speed wins). Refs come from item.refs on the doc (wins) or the bundled ./refs/refs-101.json joined by room+code, code, base code with trailing 'R' stripped (GR-308R→GR-308), or itemId for code-less lines. Snippet-less 'see A555' plan placeholders are rewritten to the room type's own governing sheet via PLAN_SHEET map (King rooms→A550/A551 etc). Ref popup: plan refs show a LOCAL snippet image (./refs/, offline-cached, tap-to-zoom, honest 'not downloaded yet' placeholder on error); submittal refs load a Google Drive preview iframe with an offline check, a no-cors reachability probe, 6s timeout, honest fallback card, and an 'Open in Drive ↗' button.

### Original paper sheet photo viewer
*Area: crew app / room screen* · `js/sheets.js:346-376`

Full-screen overlay showing ./sheets/{room}.jpg with tap-to-zoom. On image error, consults bundled sheets/index.json to distinguish 'on file but not downloaded to this phone yet (downloads automatically next time you have signal)' from 'No paper sheet on file… Send a photo of the page to Claude'.

### Separate MEP punch checklist per room
*Area: crew app / MEP punch separation* · `js/util.js:88-117, js/store.js:104-117, js/screens.js:370-384, 404-434, 447-453, 461-495`

A guest room can carry TWO independent docs in the same rooms collection: FF&E (id '105') and MEP punch (id '105-MEP', type='mep-punch'). They NEVER mix: getRooms/getAllRooms exclude MEP docs so the floor grid, hero counters and room progress never absorb punch check-offs; re-seeding one never touches the other. MEP room screen: title 'MEP Punch · {base}', categories ordered Mechanical→Electrical→Plumbing→Fire Protection→Low Voltage (walker's trade order, NOT the FF&E build order) with single-letter chips M/E/P/FP/LV on the collapsed group headers; each row shows a 'DO {verifyAtPunch}' punch step (the action the walker performs) and full-width paragraph notes. Check-off, issue, and note mechanics are identical to FF&E.

### Shared admin PIN (sha256, session-scoped)
*Area: crew app / admin gate* · `js/store.js:63-85, 296-308, js/sheets.js:319-343, js/config.js:44, js/screens.js:831-837, 868-871`

One shared numeric PIN (max 6 digits). Live mode: verified as sha256Hex(pinSalt + pin) === pinHash, where salt/hash arrive via the config/app Firestore listener (before that snapshot lands, canVerifyPin() is false and any PIN would read wrong). Demo mode: literal compare against DEMO_PIN '6621' in config.js. Success sets sessionStorage h2sep-admin='1' (per-session, clears on browser restart) and, in live mode, fire-and-forget writes a roles/{uid} doc {name, pin, grantedAt} to claim a server-side allowlist role (failure tolerated — UI gate still applies). Settings shows 'Admin mode on' + Lock button (clears the flag). PIN entry sheet shows 'Wrong PIN' inline and re-selects the field on failure.

### What admin unlocks in the crew app
*Area: crew app / admin gate* · `js/screens.js:134, 240-243, 583-585, 588, 714, 732-742`

Admin PIN gates: add floor, add room (and the whole #/room-new screen — deep links get a PIN prompt, cancel bounces back to the floor), room settings/edit, delete room/space, and ad-hoc add item. Everything else (check-off, issues, notes) needs only identity + write-readiness, NOT admin.

### New room / room settings form
*Area: crew app / add-edit room screen* · `js/screens.js:732-804, js/store.js:468-511`

Room number (numeric, max 6, readonly when editing), floor hint auto-derived from first digit of 3+ digit numbers, template picker listing every template with item counts plus '— no template (empty room) —', hint 'Will pre-load N items from …'. Duplicate-number warning inline; creating over an existing room asks 'Merge the template into it?'. Template merge NEVER overwrites existing item entries (check-offs are live data) — items are appended only where the id is missing; creation always uses set with merge (concurrent same-number creation unions cleanly); recreating un-deletes (deleted:false). Editing a SPACE doc via deep link is bounced with a toast ('Spaces have no room template'). Submit is fire-and-forget, navigates straight to the room.

### Settings screen
*Area: crew app / settings* · `js/screens.js:808-878`

Sections: You (name/initials edit with live check-mark preview; initials required); Appearance (Light/Dark segmented toggle, 'Saved on this phone only'); Admin (PIN unlock / Lock); Sync & storage (mode/online/pending status line; 'Open live dashboard ↗' link to dashboard.html in a new tab; 'Install instructions' → #/install; version display from APP_VERSION with a 'check for update' link that calls serviceWorker registration.update() and toasts the result).

### Full offline operation with queued writes
*Area: crew app / offline & sync* · `js/store.js:202-215, 270-285, 618, js/screens.js:591-593, 798-800`

Live mode uses Firestore persistentLocalCache (multi-tab, unlimited size) — every write applies locally at once (latency compensation) and syncs when signal returns; all mutating UI actions are fire-and-forget so nothing blocks in a dead zone. navigator.storage.persist() is requested at init. Rooms with unacked writes are tracked in pendingRooms (per-room, from Firestore hasPendingWrites metadata).

### Sync pills & status toasts
*Area: crew app / offline & sync* · `js/screens.js:22-27, 43-51, js/app.js:92-98`

App bar shows a tappable pill: '⇅ Offline · N' when offline (N = pending rooms), '⇅ Syncing…' when online with pending writes, nothing when clean. Tapping it opens a reassurance sheet ('No connection. Everything still works — N changes are saved on this phone and will sync automatically…' / 'Back online — changes are syncing now.'). When the pending queue drains to 0 while online, a global 'All changes synced' toast fires.

### Write-readiness gate (anonymous auth)
*Area: crew app / offline & sync* · `js/store.js:129-132, 216-256, 596-610, js/screens.js:13-20, 548-552, 704-710`

Live mode requires ONE successful invisible anonymous Firebase sign-in before any check-off counts (isWriteReady = uid exists) — otherwise queued writes would be rejected at sync and vanish. Sign-in retries with exponential backoff (2s→60s cap) and on 'online' events; floor listeners requested pre-auth queue in pendingFloors and flush after first sign-in (rules reject unauthenticated listens). Never signs out. Until ready, the room screen is read-only with strip 'connecting this phone… needs one moment of signal before check-offs count'.

### Read-only strip & nudge
*Area: crew app / offline & sync* · `js/screens.js:548-552, 704-710`

When identity exists but writing is blocked, a persistent bottom strip explains why with three distinct messages: iOS-not-installed ('install the app to check items'), not write-ready ('connecting this phone…'), or no initials ('set your initials in Settings'). Tapping a checkbox/flag while read-only toasts the matching nudge.

### Remote-surprise toasts
*Area: crew app / offline & sync* · `js/app.js:76-90, js/store.js:144-161, 270-281`

When a REMOTE update (not a pending local write) flips a visible checked item to unchecked, or changes its initials, a heads-up toast fires: 'Heads up: {code} in Room {n} was un-checked' / 'is now marked by {initials}', the affected row flashes for 500ms, toasts coalesce to at most one per 5s. Suppressed for items this device touched in the last 5 minutes (an item checked this morning still warns if it flips this afternoon).

### ?demo=1 device-local demo backend
*Area: crew app / demo mode* · `js/store.js:16-28, 164-193, 617-624, js/screens.js:40, js/config.js:1-15, 44, js/seed.js:80-164`

?demo=1 in the URL (or a null firebaseConfig) forces demo mode: identical UI backed ONLY by localStorage (key h2sep-demo-db-v2), no cross-phone sync, never touches live data. A persistent strip under the app bar reads 'Demo mode — saved on this phone only. Firebase hookup pending.' Demo PIN is '6621'. Seed fixture mirrors the real live Room 101 (40 categorized items with qty/reliability/flags, 14 carried paper check-offs stamped checkedByUid='paper' with null timestamps, 6 open issues, 1 red room note 'CONNECTING DOOR LOCK – NOT LOCKING') plus all seeded common-area spaces; a stale schema (room 101 schemaV !== 3) or v1 key forces a re-seed. Demo timestamps are ISO strings; writes save+notify synchronously.

### Light/dark theme per device
*Area: crew app / theme* · `index.html:13-16, js/theme.js:1-29, js/screens.js:567, 580, 824-829, 854-858`

Default light; stored in localStorage h2sep-theme and stamped on <html data-theme> inline in index.html BEFORE first paint (no flash). Toggle lives in Settings (segmented) and the room ⋮ menu. The DOM attribute is the source of truth so private-mode storage failures still allow session-only toggling.

### Service worker update flow
*Area: crew app / PWA shell & updates* · `js/app.js:100-155, js/config.js:18-20, js/screens.js:873-878`

SW registered at boot; APP_VERSION (config.js, currently 1.18.3) must match sw.js VERSION — the SW verifies the pair at install and refuses mismatched mid-deploy builds. When a new SW is waiting, a fixed 'Update available — tap to refresh' banner appears (waiting worker resolved AT CLICK TIME); controllerchange reloads the page — except on first-ever install (would wipe a half-typed onboarding form). A redundant install with a controller and no waiting worker toasts 'Update failed to download — will retry automatically'. reg.update() runs on visibilitychange-to-visible and on 'online' (long-resident standalone apps never navigate). SW is asked to PREFETCH_SHEETS (paper-sheet scans/refs) on boot and on regaining signal. Settings has a manual 'check for update'.

### Toasts, haptics, ARIA
*Area: crew app / feedback & a11y* · `js/util.js:30-57, js/screens.js:153, 419-421, 490, js/sheets.js:157, 201-202`

Single global toast element with role=status (screen-reader announced); default 3s, 8s when carrying an action button (Undo needs time to use); custom ms supported; dismissed on navigation. Haptic vibrate(10ms) on check and on issue quick-pick. Checkboxes are role=checkbox with aria-checked and descriptive labels including who checked; doc-switches are role=tablist; sheets are role=dialog aria-modal; progress ring has aria-label '{pct}% complete'.

**Reader's notes (risks / surprises):** Risky/subtle points for the rebuild: (1) The doc-kind discriminators are load-bearing everywhere — guest rooms, common-area spaces (type starts with 'space-') and MEP punch docs (type === 'mep-punch', id '{room}-MEP') all live in ONE Firestore collection (projects/h2sep/rooms) and are separated only by type-slug filters; every aggregate (home hero, floor grids, prev/next walk) depends on getting those filters right, and re-seeding one family must never touch another. (2) Check/uncheck/resolve writes are ATOMIC full field groups in a single updateDoc (checked+initials+checkedByName+checkedByUid+checkedAt+checkedAtLocal together) — partial writes would corrupt provenance; resolve-and-check re-reads fresh state and refuses to restamp a teammate's mark. (3) Deletes are soft-only (deleted:true) for rooms AND items; room creation uses setDoc merge and template application appends only missing item ids, never overwriting live check-offs. (4) Write legality depends on an anonymous Firebase uid existing BEFORE any queued write (rejected-at-sync writes silently vanish otherwise) — the retry/queue machinery in store.js liveInit and the pendingFloors queue exist solely for this; also PIN verification is impossible until the config snapshot delivers pinSalt/pinHash (canVerifyPin). (5) The admin 'gate' is largely a UI gate: sessionStorage flag + best-effort roles/{uid} claim doc that WRITES THE RAW PIN into Firestore; server rules may or may not enforce it. (6) MODEL_ROOMS is a hand-curated hardcoded list (config.js) gating the 3D button — King-family rooms deliberately excluded until they get their own model; don't derive it from room type. (7) Undocumented-but-relied-on behaviors: 400ms scroll-adjacency Undo toast on check; 5-minute recentLocal suppression window for remote-surprise toasts; sessionStorage h2sep-print-room handoff written on every room render so print/refs/3D pages work in dead zones; per-visit trade filter vs persistent (localStorage) category collapse vs sessionStorage floor filters — three different persistence scopes on one screen. (8) iOS write-gating requires standalone install (protects offline queue from Safari tab eviction); 'view only' skip is sessionStorage-scoped. (9) Audit trail (activity/{YYYYMMDD-HH} sharded docs) records only uncheck, issue-replace, item-delete, room-delete — checks themselves are not audited. (10) Legacy rooms without item.category must keep rendering as a flat sorted list with identical markup. (11) refs-101.json index is global-by-code (generated for room 101); PLAN_SHEET localization rewrites snippet-less plan placeholders per room type — dropping it re-introduces the 'King TV says see A555' bug. Files: /home/user/h2sep-checklist/js/{app,screens,store,sheets,util,config,theme,refs,seed}.js, /home/user/h2sep-checklist/index.html.


## Wall dashboard

### Live status pill with queue count
*Area: wall dashboard / header* · `js/dash.js:56-80 (liveState/setLive), store.pendingCount js/store.js:128`

Always-on connection pill with 6 states: LIVE (online, server-fresh data), DEMO DATA (?demo=1), RECONNECTING… (browser online but every Firestore floor listener serving cache — site wifi filtering Firebase), OFFLINE — CACHED, SIGN-IN BLOCKED — RETRYING (online >15s since boot but anonymous auth never produced a uid), CONNECTING…. Pill also carries the unsynced local write count: ' · N SYNCING' when online-ish, ' · N QUEUED' when offline — deliberately persistent because toasts die after 3s.

### Clock + auto re-render
*Area: wall dashboard / header* · `js/dash.js:421-425`

Live clock updates every 1s; the whole board re-renders every 60s so 'today' boundaries and relative bits roll over, and on every store change (realtime Firestore listeners).

### Overall-complete ring
*Area: wall dashboard / KPI tiles* · `js/dash.js:91-156 (compute), 199-209 (ring), 244-246`

SVG progress ring showing % of FF&E items checked (guest rooms + common-area spaces; MEP punch docs excluded), with side text 'X of Y items' and 'N rooms in progress'. Population rule stated in code: PROGRESS numbers count FF&E turnover only; MEP is a parallel list with its own denominator and must never move this percentage.

### ITEMS CHECKED tile
*Area: wall dashboard / KPI tiles* · `js/dash.js:172-177, 248-249`

Shows checked/total FF&E items (MEP excluded); foot shows '+N today' (items with a check timestamp >= local midnight, MEP excluded to match the tile) or 'none today yet'.

### ROOMS COMPLETE tile
*Area: wall dashboard / KPI tiles* · `js/dash.js:96-103, 150-153, 250-251`

'X / 115' counts GUEST ROOMS ONLY (keys) — common-area spaces and MEP docs are excluded from the denominator on purpose. Foot: 'N in progress · N not started'. Room complete = every non-deleted item checked (roomStats).

### OPEN ISSUES tile
*Area: wall dashboard / KPI tiles* · `js/dash.js:139-144, 252-261`

Counts open issues across ALL THREE populations — guest rooms, spaces, AND MEP punch docs (rule: PROBLEMS count everything even though PROGRESS doesn't). Foot names each population separately: 'across N rooms + N spaces + N MEP punch lists'. Open issue = item.issue set and !item.issueResolved.

### FLOOR PROGRESS rows
*Area: wall dashboard / panels* · `js/dash.js:263-295, 338-340`

One row per floor (sorted by floor sort key) + a synthetic 'Common Areas' row when spaces exist: label, room/space count, % bar, ⚠ open-issue badge, hover tooltip with checked/items/rooms/issues. In edit mode rows become keyboard-operable buttons (role=button, tabindex, Enter/Space) that open the floor's room-browser sheet; header hint text says so.

### OPEN ISSUES BY TYPE bars
*Area: wall dashboard / panels* · `js/dash.js:297-317`

Top 8 exact issue strings by count, red horizontal bars, tooltip per row; empty state 'No open item issues. 🎉'. In edit mode each row is clickable/keyboard-operable and opens the bulk drawer pre-scoped to exactly that issue wording with action preset to resolveAndCheck.

### CHECK-OFFS BY PERSON bars
*Area: wall dashboard / panels* · `js/dash.js:168-182, 319-328`

Top 8 crew members keyed by initials (items imported from paper with no initials group under '—'), cyan bars showing lifetime totals, sub-label '+N today' or full name, tooltip with name/total/today. Includes MEP check-offs (all work counts for people, unlike the items tile).

### INVENTORY — BY ITEM panel
*Area: wall dashboard / panels* · `js/dash-edit.js:663-731 (renderInventory), js/bulk.js:72-137 (buildInventory, inventoryKey)`

Table of every distinct item code in the building (code-less items key on lowercased label), MEP docs excluded. Columns: code, label (most-common label variant wins; variant count recorded) + category + room count, progress bar with checked/total, ⚠ open-issue badge, and a per-row BULK EDIT button. Live search by code/name (input caret position and scroll position preserved across live re-renders) and category filter chips ('All' + each category, 'FF&E - ' prefix trimmed). Panel is always informative; BULK buttons toast 'Tap ✎ EDIT first' outside edit mode. Clicking BULK EDIT opens the drawer pre-scoped to that key — and if the row has open issues, pre-scoped to state='issue' so the preview count matches the badge that invited the click.

### OPEN ISSUE LIST table
*Area: wall dashboard / panels* · `js/dash.js:159-167, 184-188, 346-365`

Every open item issue in the building sorted by room number, showing where ('Rm 214' / 'Lobby 003' / 'MEP 105'), code, label, and the problem text uppercased. Also includes room-level notes flagged as issues (note rows: no code/label, styled differently, never clickable). MEP rows are VISIBLE but not editable from the board. In edit mode, non-note non-MEP rows get tabindex + Enter/Space/click to open the item's sheet — rows stay <tr> (role preserved for screen-reader table nav).

### RECENT CHECK-OFFS feed
*Area: wall dashboard / panels* · `js/dash.js:172-180, 368-376`

Latest 14 check-offs with a timestamp, newest first: initials, code, location, formatted time. Items imported from paper sheets carry no time and never appear — the empty state says so explicitly. Uses checkedAtLocal, falling back to checkedAt.

### ACTIVITY — LAST 14 DAYS chart
*Area: wall dashboard / panels* · `js/dash.js:110-116, 378-392`

14 daily bars of check-off counts, zero-days styled differently with min 2% height, alternate-day x labels (M/D), the peak day labeled with its number, per-bar hover tooltip.

### Hover tooltip layer + footer status
*Area: wall dashboard / chrome* · `js/dash.js:394-418`

Single floating tooltip driven by data-tip attributes, follows the mouse, clamped to viewport, hidden on any click (a click navigates or opens a sheet). Footer shows 'updated <time>' from the last store change, or the demo-mode notice 'showing built-in demo data (?demo=1) — edits stay on this device'.

### Keyboard focus survives re-renders
*Area: wall dashboard / chrome* · `js/dash.js:228-237, 398-401; js/dash-edit.js:673, 704-716`

Before every innerHTML rebuild the focused row/control is captured as a selector (floor rows, issue-type rows, issue-table rows, inventory bulk buttons and category chips) and refocused after; the inventory search input manages its own focus + caret separately.

### Demo mode (?demo=1)
*Area: wall dashboard / modes* · `js/dash.js:26-44; store.js:20,74-75; HANDOFF section 4`

Renders a bundled seeded database from localStorage (h2sep-demo-db-v2), device-local, clearly labeled DEMO everywhere; on boot, demo check-offs get synthetic timestamps spread over the past week so the feed/chart demonstrate themselves. Demo admin PIN is 6621 (public by design). All edit and bulk flows work against the local DB and never touch Firestore.

### EDIT mode toggle + identity sheet
*Area: wall dashboard / editing* · `js/dash-edit.js:33-76, 133-163; js/dash.js:335-343`

✎ EDIT button in header. First activation with no stored user opens the identity sheet: name (max 40) + initials (max 3, uppercased) with initials auto-derived from name until the user edits them manually; stored via store.setUser under the SAME localStorage key the crew app uses (h2sep-user), so identity is shared between app and board. While editing, the button shows '✎ EDITING' + initials, body gets edit-mode class, the hidden ⚡ BULK EDIT button appears, and panel headers grow visible affordance hints (not hover-only).

### Write gating
*Area: wall dashboard / editing* · `js/dash-edit.js:89-97; store.js:132`

Every write path checks canWrite(): a user must be set AND store.isWriteReady() (live mode requires one successful anonymous sign-in / uid, else queued writes would be rejected at sync). Failing writes nudge with a specific toast: 'Set your name & initials first' vs 'Connecting… needs one moment of signal before check-offs count'.

### MEP punch lists are read-only on the board
*Area: wall dashboard / editing* · `js/dash-edit.js:78-97, 357-366; js/dash.js:96-101, 162-166, 334`

MEP punch docs (mep-punch type slug, same Firestore collection) are excluded from the editable population, the inventory panel, and the bulk engine's input; every exported entry point that takes a room number (openItemSheet, openRoomSheet) guards with refuseMep and toasts 'MEP punch lists are edited in the app, not on the dashboard.' Their issues still display in the tile/table/feed, labeled 'MEP <room>'.

### Item sheet — unchecked & clean
*Area: wall dashboard / editing* · `js/dash-edit.js:363-390`

Shows provenance line (category · 'sheet <src>' · 'from room-type package'), a primary '✓ Check off — initials go in' button and '⚑ Flag a problem…'. Check writes via store.checkItem (same function the crew app calls, inheriting the atomic 6-field check group), vibrates, and toasts with an inline Undo action that calls uncheckItem. Deliberately a sheet rather than instant-check because a wall-screen click can be a mis-click.

### Item sheet — already checked
*Area: wall dashboard / editing* · `js/dash-edit.js:392-422`

Shows 'Checked by <name> (<initials>)' or 'Checked (from paper sheet)', local check time plus 'synced <time>' when server time differs. Un-check requires a danger-styled confirm dialog IF the check belongs to someone else's initials (mine = no confirm); un-check toasts with Undo (re-check). Flag-a-problem also available.

### Item sheet — open issue (4-option flow)
*Area: wall dashboard / editing* · `js/dash-edit.js:424-446`

Shows the issue text; offers 'Resolve & check ✓' (store.resolveIssue {check:true}), 'Resolve only', 'Edit note…', 'Clear flag (mistake)' (resolveIssue {clear:true}) — exact parity with the crew app's flow.

### Issue flag/edit sheet with paper vocabulary
*Area: wall dashboard / editing* · `js/dash-edit.js:448-484; js/bulk.js:53-55`

Quick-pick chips for the 6 canonical issue strings (NEED INSTALL, NEED PROPER PLACE, IN BOX, DAMAGED, MISSING, WRONG ITEM — same strings/order as the app's QUICK_PICKS) plus CUSTOM… free text (max 120, forced UPPERCASE), plus a 'Clear current flag' button when one exists. Writes via store.setIssue.

### References in every item sheet
*Area: wall dashboard / editing* · `js/dash-edit.js:320-350; js/dash.js:49-53`

Each sheet lists References joined via refs.js (same join as the app): plan-detail snippets (📐) open inline as a stacked image viewer with a graceful 'not available on this device yet' error state; submittals (📄) open the Google Drive file in a new tab. Refs index is fetched non-blocking at boot (board paints first, refs fill in).

### Floor sheet (room browser)
*Area: wall dashboard / editing* · `js/dash-edit.js:488-508`

Clicking a floor row (edit mode) opens a wide sheet grid of room cards — number (spaces show 'TypeLabel Number'), progress bar, done/total, ⚠ open-issue count, green 'done' styling when 100%. 'common' pseudo-floor lists all common-area spaces. Tapping a card opens the room sheet.

### Room sheet — full app checklist parity
*Area: wall dashboard / editing* · `js/dash-edit.js:510-624`

Items grouped by category in CATEGORY_ORDER (unknown categories alphabetical after, blank category last as OTHER) with per-category done/total headers. Each row: checkbox box showing the checker's INITIALS (paper metaphor), ⚑ overlay when flagged, code, ×qty badge when qty>1, label, duplicate-code ordinal ('2 of 3') when a code repeats in the room, '⚠ VERIFY — sources disagree' badge when reliability==='FLAGGED', uppercased issue text inline. Rows are role=checkbox with aria-checked and descriptive aria-labels. TAP PARITY: an unchecked clean row checks INSTANTLY with initials (vibrate + toast with Undo); a checked or flagged row opens its sheet instead. A separate per-row ⚑ button flags without checking (the app's own split). Empty checklist shows 'No checklist lines (by design for elevators).'

### Room notes (★) on the room sheet
*Area: wall dashboard / editing* · `js/dash-edit.js:566-576, 633-641; js/dash.js:184-188`

Open room notes render as buttons at the top (red when flag==='issue', text uppercased for issues); tapping opens a confirm to 'Mark resolved' or 'Re-open' (two-tap, same as the app) via store.setRoomNoteResolved. Notes flagged 'issue' also appear in the dashboard's OPEN ISSUE LIST. NOTE: notes can only be resolved/re-opened here — creating a new note is not offered on the dashboard.

### Room sheet live refresh + navigation
*Area: wall dashboard / editing* · `js/dash-edit.js:579-599, 643-659`

Sheet repaints in place on every store change while open (own writes echo back; a crew member's remote check appears live) preserving scroll position and updating the title + an aria-live region; unsubscribes when closed. Footer nav: ‹ prev room / next room › within the floor (or within spaces), and a back-to-floor button.

### Remote-surprise notification
*Area: wall dashboard / editing* · `js/dash-edit.js:49-53; store.js:49`

When a REMOTE device un-checks an item this board can see, a toast fires: 'Heads up: <initials> check in <room> was removed from another device' — same courtesy the app gives.

### Modal sheet system (stacking, inert, focus trap)
*Area: wall dashboard / sheets infra* · `js/dash-edit.js:167-246, 820-824; HANDOFF invariant 12`

Sheets can stack (PIN over drawer, confirm over PIN) with escalating z-index; while any sheet is open, header/main/footer get the inert attribute so keyboard/SR users cannot tab underneath. Escape closes only the TOP sheet; Tab is trapped inside it; scrim click and ✕ close; focus moves into the dialog on open (dialog shell on touch devices to avoid popping the keyboard) and returns to the previously-focused element on close. INVARIANT: dismissal must go through closeSheet(), never element.remove() — bypassing it leaves the page inert and a touch-only wall board dead until reload (this exact bug shipped once; regression-tested).

### Bulk drawer — scope builder
*Area: wall dashboard / bulk* · `js/dash-edit.js:735-989`

Three-column drawer (⚡ BULK EDIT header button, issue-type rows, or inventory rows open it, possibly pre-scoped). Column 1 WHICH ITEMS: filterable checkbox list of every inventory code (with label + ⚠N open badge) plus an 'Every item' master checkbox (empty key set = all). Column 2 WHERE & WHAT STATE: floor chips (multi-select, 'All' clears), Guest rooms / Common areas toggles (disabling both auto-re-enables the other — scope can never be empty of doc types), state chips (Any / Not checked / Open issue / Checked), and an issue-wording sub-filter showing the top 12 live issue strings with counts whenever the scope contains flagged items — picking a wording auto-forces state to 'issue' (you can't be flagged MISSING without an open issue). Column 3 DO WHAT: 7 radio actions with plain-language hints; issue-text input (canonical chips + free text, uppercased) shown when the action needs text; for renameIssue, a checkbox list of every existing wording in scope with open/resolved counts to choose which variants to merge.

### Seven bulk actions
*Area: wall dashboard / bulk* · `js/bulk.js:57-65; js/dash-edit.js:735-743`

check (stamp initials everywhere in scope), uncheck (DESTRUCTIVE), resolveAndCheck (the 'it arrived, it's in' one-tap), resolveIssue (issue closes, box stays empty), setIssue (stamp same wording on every match), renameIssue (merge wording variants — only touches items whose issue string is among the selected 'from' set), clearIssue (DESTRUCTIVE — removes flag text entirely). Destructive flag drives red Apply styling, offline hard-block, and confirm wording.

### Arming interlock (no building-wide default)
*Area: wall dashboard / bulk* · `js/dash-edit.js:752-756, 844-853, 1004`

A drawer opened bare from the header sits DISARMED at 'every item in the building' — Apply stays disabled with the message 'Pick items, a floor, or a state first…' until the operator narrows something (or arrived pre-scoped). Subtle rule: un-ticking 'Every item' with nothing else selected is a no-op and does NOT arm — only a tick that actually narrows (or clears an existing narrowing) counts as intent, so a stray phone-scroll tap can't put Apply live building-wide.

### Honest live preview
*Area: wall dashboard / bulk* · `js/dash-edit.js:997-1041, 1163-1181; js/bulk.js:191-200, 306-308`

Preview (aria-live) shows: 'N items will change across M rooms', the first 14 room numbers '+K more', verbatim skip reasons with counts ('12 already checked off · 3 checked by someone else'), and for plain 'check' a warning that N of the targets have an OPEN ISSUE that will stay open (suggesting resolveAndCheck). Validation errors replace the preview (needs text / pick rename wordings / set identity for check actions). Skip reasons enumerated: already checked off, not checked, checked by someone else, no open issue, no issue text to change, already flagged with that text, issue already resolved, nothing would change. Plans drop exact no-ops so the confirmed count is the changed count. Preview and code list recompute on EVERY store change while the drawer is open (crew edits from phones update it live, including new item codes becoming selectable).

### Stale-data interlock (dataTrust)
*Area: wall dashboard / bulk* · `js/dash-edit.js:109-127, 1059-1079, 1198-1208`

Single graded gate read by BOTH apply and undo: 'offline' (navigator.onLine false) → destructive actions (uncheck/clearIssue) are REFUSED outright ('un-check and clear-issue can erase crew work you can't see'), non-destructive get a strong danger confirm; 'cache' (online but every listener serving cache — filtered wifi) → strong danger confirm but never a hard block, because it can be briefly true around normal write latency and a false positive must not strand the operator. Demo mode always 'live'.

### Admin PIN gate (sha256)
*Area: wall dashboard / bulk* · `js/dash-edit.js:261-297, 1080; store.js:63-81`

Every bulk apply requires admin: if not already admin this session, a stacked PIN sheet (numeric, max 6) appears. Live verification = sha256Hex(pinSalt + pin) === pinHash from the Firestore config snapshot; demo = literal '6621'. Before the config snapshot lands the sheet says 'Still connecting — try again in a few seconds' instead of lying 'Wrong PIN'. Success stores h2sep-admin='1' in sessionStorage (admin persists for the tab session, so subsequent bulks skip the PIN) and fire-and-forgets a server-side claimAdminRole. Single-item edits need NO PIN — only name+initials, exactly like the app.

### Re-plan at commit + drift detection by identity
*Area: wall dashboard / bulk* · `js/dash-edit.js:99-106, 1083-1115, 1033-1039`

The plan is recomputed against fresh state AFTER the PIN pause and AGAIN after the final confirm dialog — a crew check-off landing during either human pause must survive. If nothing remains, it aborts ('The building changed while you confirmed — nothing left matching this scope'). Drift is detected by change-set IDENTITY, not count: changeSetKey() compares sorted room+itemId membership, so one item leaving scope while another enters (equal counts) still aborts with 'same count (N), but not the same items — Review and Apply again.' While a plan is executing, store echoes must not re-enable or relabel the Apply button (applying flag).

### Confirm dialog before apply
*Area: wall dashboard / bulk* · `js/dash-edit.js:1086-1091; js/bulk.js:551-560`

After PIN: '<Action> — N items across M rooms?' with 'This removes field data.' appended for destructive actions and 'You can undo from this drawer.' The label comes from describePlan (same sentence used by the toast and audit entry, listing up to 3 codes or 'N codes').

### Chunked batched writes + offline queueing
*Area: wall dashboard / bulk* · `js/bulk.js:26-28, 403-484; js/dash-edit.js:1119-1145`

Per-item changes collapse to ONE dotted-path payload per room doc (items.<id>.<field> + updatedAt=serverTimestamp — the only shapes the Firestore rules whitelist), batched at 400 documents per batch (headroom under Firestore's 500-write cap). ALL batches are built and committed before awaiting any ack, so in a dead zone every chunk still applies to the local cache and queues. Progress shows server acks ('Syncing X/Y…'); an 8s ack timeout flips to 'queued, syncs when online'. Server REJECTION (rules/not-found; SDK rolls back optimistic writes) is told plainly: 'The server rejected some of this bulk edit — nothing to undo for the rejected part.' Queued writes that get rejected later when signal returns also toast via the settle promise.

### Atomic check group + ABSENT/SERVER_TS markers
*Area: wall dashboard / bulk* · `js/bulk.js:36-47, 202-227, 236-254, 456-457`

A check writes all six fields together (checked, initials, checkedByName, checkedByUid, checkedAt=serverTimestamp, checkedAtLocal) — a half-written group (checked with no initials) is the one shape paper never produced. Uncheck writes the full empty group. Fields the item never had are recorded as ABSENT in before-snapshots and restored via deleteField() on undo, never null (null onto legacy items is not the inverse). SERVER_TS marker is swapped for serverTimestamp() (live) or an ISO string (demo) only at write time and must never leak into a before snapshot. The engine never overwrites another person's initials by default: items already checked by someone else are SKIPPED ('checked by someone else'); an overwriteChecked option exists in planAction but the drawer never exposes it.

### Undo (in-memory stack, re-derived, never blind)
*Area: wall dashboard / bulk* · `js/dash-edit.js:26-29, 1043-1054, 1129-1137, 1185-1252; js/bulk.js:345-401`

After a successful apply, the exact inverse plan (before/after swapped) is pushed onto an in-memory stack (max 20 — memory-only because before-snapshots hold live Firestore Timestamp objects that don't survive JSON; the audit is the durable record). The drawer footer shows '↩ Undo: <label>'; the completion toast only offers an Undo action when the drawer is GONE, so two Undos never coexist. performUndo: double-tap guard; same dataTrust confirm as apply (an undo of a bulk check is functionally a bulk un-check); then deriveUndoPlan re-derives against CURRENT state — any item whose stable fields (checked, initials, checkedByName, checkedByUid, issue, issueResolved) no longer match what the bulk wrote was touched by someone since and is SKIPPED, with a partial-undo confirm ('Undo N of M — K items were changed by someone since and will be left alone'). The undo executes through the normal write path and writes its OWN audit ('<id>-undo'). On any failure — server rejection, queued-then-rejected at sync, or thrown error — the entry is pushed BACK on the stack so it stays undoable. Cancelling any confirm also restores the entry.

### Audit + recovery documents
*Area: wall dashboard / bulk* · `js/bulk.js:30-33, 486-547`

Every live bulk (and every undo) writes: (1) one summary entry merged into the hourly activity shard activity/YYYYMMDD-HH under entries.bulk_<id> — timestamp, uid, name, 'bulk:<action>', item count, up to 40 codes, up to 60 room numbers + total, issue text; and (2) full per-item recovery doc(s) activity/bulk_<id>[_pN] with kind:'bulk-recovery' and every item's exact before/after (server-ts and absent markers scrubbed to readable strings), paged at 800 items per doc to stay under Firestore's 1 MiB cap — precisely so a building-wide destructive bulk can be reconstructed and hand-reversed after the tab (and its in-memory undo stack) is gone. Audit failures NEVER throw or lose the edit; they toast '⚠ The edit saved, but its recovery record did not. Note what you just changed before leaving this page.'

### Soft deletes respected everywhere
*Area: wall dashboard / bulk* · `js/bulk.js:87-90, 168-178, 374; js/dash.js:158; js/dash-edit.js:517-518`

Deleted items (deleted:true) and deleted room docs are never counted, never listed, and never bulk targets — filtered in compute(), buildInventory(), resolveTargets(), and the room sheet. Undo of an item that no longer exists skips with 'item no longer exists'.

**Reader's notes (risks / surprises):** Surface files read in full: /home/user/h2sep-checklist/dashboard.html, js/dash.js (428 lines), js/dash-edit.js (1255 lines), js/bulk.js (561 lines), HANDOFF-dashboard-editing.md, plus supporting store.js sections. Surprises/risks for a rebuild: (1) The task brief mentioned 'add items' as a dash-edit capability — NO add-item flow exists on the dashboard; items can only be checked/unchecked/flagged/resolved. Adding items is a crew-app/store concern. Room notes likewise can only be resolved/re-opened here, not created. (2) The three-population split (guest rooms / common-area spaces / MEP punch docs, all in ONE Firestore 'rooms' collection told apart only by type slugs) drives nearly every number: PROGRESS metrics count FF&E only (rooms+spaces), PROBLEM metrics count everything including MEP, rooms-complete counts guest keys only, and the entire editing/bulk surface excludes MEP with explicit refusal guards. Silently merging these in a rebuild would corrupt the headline percentage. (3) Per HANDOFF: this editing work lives on branch claude/dashboard-editing-inventory-f69y7b (PR #4), NOT deployed to gh-pages — Austin holds the deploy. (4) Load-bearing invariants documented from real bugs: closeSheet() (never element.remove()) or the inert page bricks a touch-only wall board; re-plan at commit with identity-based (not count-based) drift detection; undo re-derived, never blind; ABSENT→deleteField, never null; atomic 6-field check group; Firestore rules whitelist only dotted items.<id>.<field> paths + updatedAt (new fields require rules changes first); sw.js SHELL array + VERSION coupling for offline caching. (5) Admin gating is per-tab-session (sessionStorage) after one sha256(salt+pin) verification against a config-doc hash; demo PIN 6621 is intentionally public. (6) Undo stack is deliberately memory-only (Firestore Timestamps don't JSON); the sharded recovery docs in activity/ are the durable safety net. (7) Known-open minor a11y items from review round 2 are listed in the HANDOFF (chatty aria-live preview, focus on replaced room-sheet elements, dual-behavior .drow activation not announced).


## Print sheets, refs, 3D exhibit, PWA machinery

### Guest room door sheet (2-page)
*Area: print sheet* · `js/print.js:23-37,258-315`

print.html?room=N renders a paper checklist from a one-shot room snapshot. Page 1: FF&E families in fixed order (Casegoods, Bedding, Seating, Lighting, Window Treatments, Art/Mirror, Misc); page 2: Appliances + Bath Accessories plus any leftover categories appended sorted so nothing silently fails to print. Canonical 'FF&E - X' names shorten via CAT_LABEL; empty-category group prints as 'ADDED ON SITE'. Header: Triun logo, project line, ROOM #N, type label, floor, done/total 'verified at print time'. Unresolved room notes print starred uppercase on title block and repeat on page-2 continuation header. Footer: line count, unit count (sum qty, min 1), distinct item src sheets, print timestamp, legend 'Initials in box = verified in room / red = open issue'.

### Item row print rules
*Area: print sheet* · `js/print.js:83-116`

Soft-deleted items excluded on all variants; sort by it.sort then code. Row shows bold code tag, label, xN qty badge only when qty>1, red uppercase issue text only while open (issue && !issueResolved), FLAGGED chip when reliability==='FLAGGED', instanceNote line, and a check box printing the checker's initials (fallback check mark) when checked.

### Common-area (space) sheet variant
*Area: print sheet* · `js/print.js:129-182`

isSpaceDoc rooms get one flowing list over N pages (no 2-page split). Categories in CATEGORY_ORDER (crew walk order), unknown categories appended sorted, uncategorized last. Title 'SPACE ZONE-x' formatted as 'Zone x', 'Common Area', level, SPACE_META plan note (sheet + note), open notes. Empty space prints an honest 'No line items drawn for this space' block. Footer legend says 'verified in space'.

### MEP punch sheet (per-trade pages)
*Area: print sheet* · `js/print.js:188-256`

isMepDoc rooms render an MEP punch variant: title 'MEP PUNCH — ROOM #<base>' using mepParent(number), subtitle notes 'installed & verifiable scope (concealed rough-in not listed)'. Categories ordered by MEP_CATEGORY_ORDER; each section headed with trade letter (MEP_LETTER) + name + item count, and EVERY trade after the first starts its own printed page (class brk) so e.g. the plumber signs a plumbing-only page. Each section ends with a Trade/Signed/Date signoff line. Items additionally print the verifyAtPunch action step under the label. Footer adds 'flag = drawings disagree, confirm before sign-off'.

### Data load: handoff, live, demo, timeout
*Area: print sheet* · `js/print.js:43-80,332-358; js/screens.js:649-666`

Room screen writes the room doc to sessionStorage 'h2sep-print-room' as it renders (and again on print/refs/3d link click), so print/refs cold pages paint instantly and work in dead zones. print.js paints the handoff first ('From this phone — checking for newer…'), then races a live Firestore getDoc (anonymous auth first; rules require auth) against a 10s timeout because Firestore retries forever. On timeout with handoff: 'No signal — printing this phone's copy'; without: error card telling the crew to open from the room screen with signal. Demo mode (?demo=1 or null firebaseConfig) reads the demo DB in localStorage 'h2sep-demo-db-v2' first (so demo users' own checks/added items print), falling back to bundled seedRooms/seedSpaces fixtures; status shows 'Demo data — not live check-offs' vs 'Live as of <stamp>'.

### Print toolbar + gated 3D link
*Area: print sheet* · `js/print.js:317-330`

Toolbar has 'Print this sheet' (window.print), back link to index.html#/room/N, and a 3D model link that exists ONLY when the room is in MODEL_ROOMS (otherwise the element is removed — deliberate gate so the exhibit never shows room-101 QQ geometry under another room's number); link carries &demo=1 in demo mode.

### Ref join by code with fallbacks
*Area: refs engine* · `js/refs.js:23-66,104-117`

refsFor(): refs seeded on the item doc (item.refs) win outright; else the bundled ./refs/refs-101.json index is joined by room+code, then bare code, then code with trailing orientation 'R' stripped (GR-308R -> GR-308, same product), then the Firestore item id for code-less lines (e.g. the disposer u_ce20ab6281). Index ingest tolerates 4 shapes (flat code map, wrapped {refs:[]}, room->code map, rooms/items envelope) and filters invalid refs; missing/failed index fetch just means no refs shown. Ref kinds: submittal (driveId -> Drive preview) and plan (snippet -> local image, offline-safe).

### Per-room-type plan-sheet localization
*Area: refs engine* · `js/refs.js:80-102`

Snippet-less 'No callout found — see A5xx' plan placeholders are rewritten to the room type's own governing enlarged-plan sheet via PLAN_SHEET (QQ Studio/Connector/Extended->A555, QQ ACC->A556, King Studio/Connector->A550, King Acc->A551, King One Bedroom->A553/A554), fixing the index having been generated for room 101 (QQ). Refs carrying an actual snippet image are never rewritten (ID-5.8/ID-5.10 crops show the product, same in any room).

### Room references view grouped by document
*Area: refs page* · `js/refs-page.js:24-123; refs.html`

refs.html?room=N lists every ref the room's non-deleted items point at, grouped per distinct document (dedupe key kind|driveId/snippet/title) with the covered item tags riding along ('N items - GR-101, GR-208…'). Two sections with counts: Submittals and Plan sheets, each with an honest empty state. Tap a card -> same refPopup as the in-app paperclip chip. Lead text: 'plan snippets are stored on this phone; submittals open from Drive'. ?from=3d makes Back return to the 3D exhibit (preserving demo flag), else to index.html#/room/N. Same handoff-first + 10s live race + demo fixture behavior as print. Header expand button is hidden (vestigial). Theme applied pre-paint from localStorage 'h2sep-theme' (default light).

### Reference popup: local snippet vs Drive preview
*Area: refs popup (sheets.js)* · `js/sheets.js:60-146`

refPopup(ref): plan refs show the local ./refs/<file>.png snippet (tolerates 'refs/' prefixed or bare paths), tap image to toggle zoom; missing snippet -> 'No snippet published for this sheet yet'; image load error -> 'Snippet image isn't on this phone yet — downloads automatically next time you have signal'. Submittal refs load a Google Drive /preview iframe with an honest failure path: offline or no driveId -> immediate fallback card; otherwise a no-cors reachability probe with a 6s ceiling flips to a fallback card ('no signal, or this network can't reach Drive'). Footer always offers 'Open in Drive' external link when driveId exists. Close via X or scrim tap.

### Entry points and MODEL_ROOMS gating
*Area: 3D exhibit* · `js/config.js:35-42; js/screens.js:475,564; room-3d.html:1590-1609`

The 3D button (cube) appears on the room screen header and its settings section, and on the print toolbar, only for the 47 rooms in config.js MODEL_ROOMS (QQ family: Studio, Studio Connector, Wide, Extended across floors 1-4). King family intentionally absent (different 29ft depth/king bed per A550). Opening room-3d.html?room=X for a room with no ROOM_GEOM entry replaces the page with an explicit 'NO 3D MODEL FOR ROOM X YET' stop screen with a back link — never a relabelled fallback model.

### Per-room parametric geometry
*Area: 3D exhibit* · `room-3d.html:1478-1616,2645`

ROOM_GEOM gives each room architect-sourced width (12'-0" clear vs 12'-11 3/8" QQ Wide), depth (36'-5" vs 38'-9" QQ Extended), mirror (even-corridor-side rooms render opposite-hand; each entry records a 'basis' string, several marked CONFIRM ON PLAN / HANDEDNESS UNCONFIRMED), and conn (GR-3 connecting door vs continuous demising wall). PARTNER_OF maps connecting partners off A100-A103; room 215's partner is deliberately blank (not named on plan). Camera presets and part positions reflect across the centreline for mirrored rooms.

### URL params and motion
*Area: 3D exhibit* · `room-3d.html:1440-1444,2803,2810-2824`

?room= (default 101), ?view= initial camera preset, ?freeze=1 renders on demand only (test/static mode), ?scheme=light starts in light scheme, &demo=1 is propagated through back-bar links. prefers-reduced-motion (or freeze, or explicit ?view) skips the 2s fly-in intro tween.

### Tap-object info cards
*Area: 3D exhibit* · `room-3d.html:1765-2205,2557-2576,2674-2705`

Orbit/zoom/pan via OrbitControls. Desktop hover highlights parts (touch skips raycast-per-frame for perf); a tap/click (with <=6px drag tolerance) selects a part and opens the info card: tag, chip showing QTY n or FLAGGED (the GR-3 door on room 101 shows DEFICIENCY), name, category + qty, description, and a red note block for flagged provenance notes (e.g. connecting-door lock not locking on 101 only; GR-308 qty unresolved 'carried verbatim, never merged'; dishwasher 'BOTH MODELS CARRIED — DO NOT PICK ONE'; untagged disposer inferred from a dedicated circuit; ADA bath accessories 'elevation-sourced, not a takeoff'; 'VANITY SCONE (sic)'). Esc, X or empty-space tap deselects. ~42 hardcoded parts.

### Sidebar item list / mobile drawer
*Area: 3D exhibit* · `room-3d.html:297-345,2722-2740,2886-2895`

Sidebar groups one row per tag by category (Connecting, Casegoods, Seating, Bedding, Lighting, Window, Art/Mirror, Appliances, Bath Accessories) with qty badges, ADA chips and red flag chips; hovering a row locates (highlights) the part in scene, clicking zooms the camera to it and selects. Header block carries project meta (TYPE with clear dimensions, CONNECTS row, BASIS 'A555 + project DB'), a legend (tagged item / flagged / connecting door / out-of-scope shell), and a caveat 'ONE LINE PER TAG - LOCATIONS STYLIZED - NOT SHOP DRAWINGS'. Desktop burger toggles the panel; phones get a bottom drawer with grip bar; the hardcoded '42 ITEMS' count is recomputed from actual rows (41 for non-connecting rooms).

### View presets, TAGS toggle, light/dark
*Area: 3D exhibit* · `room-3d.html:2579-2664,2707-2720,2771-2803`

Chip bar: LIGHT/DARK scheme toggle (swaps full material palette + grid), TAGS toggle, and ISO/TOP/BEDS/BATH/KITCH camera presets (tweened 900ms). Tag labels default OFF on mobile (unreadable at 412px) and ON on desktop; even with tags off, zooming closer than 34ft fades in labels within 14ft of the aim point (zoom-reveal). Portrait phones get a steeper ISO, wider FOV (35-42 deg) and an aspect-driven dolly-back so the long room fits; rotation reframes live. Presets are mirrored for mirrored rooms so BATH/KITCH aim at the right end.

### Room-aware relabelling and honesty caveats
*Area: 3D exhibit* · `room-3d.html:277-284,2836-2963`

At load the page rewrites every 'ROOM 101' occurrence (title, ministrip, drawer, sidebar h1) to the actual room, swaps the crew-facing type label (e.g. 'QQ Studio Connector') separately from the architect's variant name ('QQ Wide Connecting'), rewrites the TYPE/CONNECTS meta rows and in-scene dimension labels per geometry, and renames the connecting partner everywhere ('Room 103' -> actual partner, or 'ADJOINING ROOM (NOT NAMED ON PLAN)' when unknown). Non-connecting rooms hide the connecting-door legend row. The bottom caveat bar states variant, clear dims, 'MIRRORED — HANDEDNESS NOT YET CONFIRMED' where applicable, 'EXTRA DEPTH NOT LOCATED ON A555' for Extended, and always 'ITEM LOCATIONS STYLIZED - EXHIBIT ONLY'. Mobile back bar links: back to that room's checklist, REFS (refs.html?room=N&from=3d), SHEET (print.html?room=N), demo flag preserved.

### Versioned app-shell precache with mixed-deploy guard
*Area: PWA / service worker* · `sw.js:6,28-102`

sw.js precaches the full shell (index/print/refs/dashboard HTML, all CSS/JS incl. vendored Firebase SDK, refs-101.json, sheets/index.json, logos, icons, manifest) into cache 'h2sep-v<APP_VERSION>' using cache:'no-cache' requests so the HTTP cache can't assemble a mixed build. Install then verifies the cached js/config.js contains the matching APP_VERSION string and aborts (deleting the cache) on a mid-deploy CDN mismatch — browser retries later. dashboard.html is explicitly precached because the offline navigate fallback used to silently serve the checklist in its place. activate deletes all caches except current version + the three permanent caches, then clients.claim().

### Permanent caches: sheets, refs, 3D model
*Area: PWA / service worker* · `sw.js:10-26,104-164,177-190`

Three caches survive every app update: 'h2sep-sheets' (paper-sheet room JPGs under /sheets/, prefetched from sheets/index.json), 'h2sep-refs' (plan snippet images, filenames walked out of refs-101.json tolerant of any nesting), and 'h2sep-model-7' (room-3d.html, ~590KB inlined three.js — NOT precached; cached on first open and matched ignoring ?room= so one copy serves every room; the cache NAME must be manually bumped whenever room-3d.html changes or phones serve the old exhibit forever). Prefetch of sheets+refs is best-effort, triggered by the page posting PREFETCH_SHEETS (on load, on 'online', after first SW claim), skips already-cached files, and aborts each fetch after 10s on weak signal. Both index JSONs stay in the versioned shell cache so they can never be shadowed stale.

### Fetch strategy and offline fallbacks
*Area: PWA / service worker* · `sw.js:168-224`

Only same-origin GETs are handled (Firestore/auth traffic passes through). Cache-first from the appropriate bucket, network fill for permanent assets (quota errors tolerated). Offline navigations: app routes get the cached index.html shell (hash-router SPA); the standalone pages print/refs/dashboard/room-3d are deliberately NOT masked by the shell — an unvisited one offline gets a custom 503 page: 'This page isn't downloaded yet… open it once with signal and it will work in dead zones after that', with a back-to-checklist link.

### Update banner and sync toasts
*Area: PWA / update flow* · `js/app.js:93-153`

app.js registers sw.js; when a new worker installs while an old one controls, a persistent 'Update available — tap to refresh' banner appears; tapping posts SKIP_WAITING (resolving reg.waiting at click time) and the resulting controllerchange reloads the page. The very first install never reloads (would wipe a half-typed onboarding form) — it just triggers prefetch. A worker going redundant with no replacement shows 'Update failed to download — will retry automatically'. Separately, when the offline write queue drains to zero while online, a toast 'All changes synced' fires.

### Web app manifest
*Area: PWA / install* · `manifest.webmanifest`

Installable PWA: name 'H2SEP Room Checklists', short_name 'H2SEP Rooms', display standalone, orientation locked portrait, start_url './index.html#/', scope './', dark background/theme color #0B0D10, 192/512 icons plus a maskable 512 icon.

**Reader's notes (risks / surprises):** Surprising/risky for a rebuild: (1) The 3D exhibit's item data is a HARDCODED static snapshot of the room-101 package (dated 08/07/2026 in the sidebar) — it never reads Firestore; only labels/links/geometry are room-aware. Live check state does not appear in 3D. (2) The 3D cache 'h2sep-model-7' is permanent and only busted by manually renaming it in sw.js whenever room-3d.html changes — forget the bump and phones serve the stale exhibit forever. (3) sw.js VERSION and js/config.js APP_VERSION are coupled and verified at SW install; a rebuild must keep an equivalent mixed-deploy guard or CDN races ship Frankenstein caches. (4) refs-101.json was generated for room 101 only but is joined project-wide by item code; correctness for other room types depends on the PLAN_SHEET localization patch in js/refs.js and the trailing-'R' code-strip rule — both easy to drop silently. (5) Print/refs cold pages depend on the room screen pre-writing sessionStorage 'h2sep-print-room' on every room render (not just on link tap — the 3D back bar can route room->3D->sheet); without it, dead-zone printing breaks. (6) Print is a snapshot (single getDoc raced with 10s timeout), never a live subscription, and stamps the print time. (7) MEP sheets derive their room number via mepParent() and force a page break per trade with per-trade signoff lines — an atomic-feeling rule that lives only in print.js. (8) Demo mode reads the mutated demo DB (localStorage h2sep-demo-db-v2) before fixtures so demo users' own work prints. (9) MODEL_ROOMS gating is duplicated in three places (screens.js, print.js, and ROOM_GEOM inside room-3d.html) and must stay in sync; room-3d additionally hard-stops unknown rooms. (10) Several ROOM_GEOM mirror entries are annotated 'CONFIRM ON PLAN' — the exhibit surfaces that uncertainty in its caveat bar; a rebuild should preserve those honesty caveats, not just the geometry.


## Data contract, templates, seeding & admin tooling

### Shared admin PIN, sha256-validated in rules
*Area: admin gating / security rules* · `design/firestore-rules-final.txt:13-17,51-58; tools/seed_rooms.mjs:117-126`

Any signed-in (anonymous) user becomes admin by self-creating roles/{uid} with a pin field; rules sha256-hash the submitted pin and compare to a hardcoded hex digest (pin '6621' = DEMO_PIN in js/config.js:44). roles: create only own-uid with valid pin, get own doc only, list denied for everyone, update never, delete self-or-admin. Every admin tool claims the role this way and names the role doc '<toolname> <date>' with grantedAt - a de-facto audit trail of admin claims. Rebuild must preserve: PIN-gated admin escalation for account-less field crew, non-enumerable role docs.

### Room-doc schema whitelist and no hard delete
*Area: security rules / data contract* · `design/firestore-rules-final.txt:23-49; tools/seed_rooms.mjs:140-145; tools/migrate_101_103.mjs:50`

Rules enforce hasOnly top-level keys [number,floor,type,typeLabel,items,notes,deleted,schemaV,createdAt,updatedAt], number==docId (<=8 chars), floor int 0-30, items map <=200, typeLabel <=120; 'allow delete: if false' - deletion is ONLY the soft-delete field deleted:true. Room create/update open to any signed-in user (crew check-offs need no admin); templates/config writes admin-only. Tools strip non-whitelist keys (accessible/connecting) from payloads; the app derives ADA/connecting from typeLabel instead.

### 12 published room templates keyed by type slug
*Area: template system* · `tools/publish_templates.mjs:42-55`

templates collection holds exactly 12 slugs: qq-wide-connecting, qq-connecting, queen-queen, qq-wide, qq-extended, qq-acc, king-one-bedroom, king-one-bedroom-acc, king-studio-acc, king-studio, king-studio-connecting, king-studio-acc-mod. The SLUG must equal the 'type' field rooms carry or the app reports 'no template' and Room Settings/Add-room break. Two slugs may deliberately share one package AND one display name (qq-wide-connecting and qq-connecting both publish template-101-final.json as 'QQ Studio Connector'; queen-queen and qq-wide both display 'QQ Studio' per Austin's OV-001 naming). Templates are the same reviewed JSON the seeding pipeline uses, so an app-created room and a tool-seeded room are identical.

### Template publish safety (publish_templates.mjs)
*Area: template system* · `tools/publish_templates.mjs:36,59,91-116`

Requires explicit --dry-run or --execute (refuses with neither). Item payload is whitelisted to exactly the fields the app's blankItem() reads: code, label, sort, category, qty, reliability, derived, src, instanceNote - anything else is stripped. REFUSES to publish any template whose items carry field state (checked/initials/issue/checkedAt/checkedByName) rather than laundering a check-off into every new room. After write, reads the doc back and fails if the live line count differs. Exit nonzero on any failure.

### Deterministic room generation from data/project.sqlite (gen_rooms.py)
*Area: template pipeline (offline)* · `tools/gen_rooms.py:1-50`

Emits canonical room JSON: no timestamps, sorted keys, ids derived only from row content + rowid order - running twice yields byte-identical files. Load-bearing contracts pinned in the header: type slug = lowercase room_type with non-alphanumerics collapsed to '-' (King Studio Acc. -> king-studio-acc); per-tag instance suffix a,b,... in rowid order (matches app expandTemplateItems); untagged ids hash a 1-based occurrence ordinal; sort = (categoryIndex+1)*1000 + withinCategoryOrdinal*10 over a fixed 21-category order (Drywall first, FF&E last - crew work top-of-wall down).

### make_template.py - draft templates per room type
*Area: template pipeline (offline)* · `tools/make_template.py:1-55`

Generates a type template from a source room scoped to Austin's categories (FF&E families + Appliance + Bath Accessory); collapses duplicate instance rows (gr300_a+gr300_b) onto ONE line with qty = row count keeping the first sorted id (matches hand-built template-101-final.json); forces clean state on every item (a template must never seed a check-off); stamps Austin's display label (his Drive folder names), never the DB's; explicit ITEM_FIELDS whitelist so stray keys can never ride into a seed. Also carries the database's own note forward so FLAGGED/MEDIUM lines arrive with their reason.

### apply_rulings.py - auditable ruling layer
*Area: template pipeline (offline)* · `tools/apply_rulings.py:1-48`

Turns draft templates into approved ones: every deviation from raw DB content lives in one RULINGS table in this file and nowhere else. Two hard rules enforced in code: a ruling targeting a code the template does not carry is a FAILURE not a no-op (a typo must never silently skip a flag); nothing invents a fact - unknowns get reliability FLAGGED plus a note stating exactly what is unknown and what would settle it. Standing project-wide rulings include the dishwasher model (902), the disposer existence question, and the GR-302 vs GR-302L vanity tag ruling. --check verifies without writing.

### seed_rooms.mjs default: CREATE-ONLY
*Area: seeding* · `tools/seed_rooms.mjs:8-19,140-151,228-241`

Default mode commits with currentDocument.exists=false - an existing room doc is never touched, only reported and skipped. createdAt/updatedAt stamped at seed-run are 'the ONE permitted nondeterminism of the pipeline'. Non-whitelist JSON keys stripped before transport. After every room, a read-back verification compares live item ids/count against the JSON and reports VERIFY OK/MISMATCH; exit 1 if any room failed or is short.

### seed_rooms.mjs --merge-missing: append-only item merge
*Area: seeding* · `tools/seed_rooms.mjs:97-104,198-221`

For an existing room, PATCHes ONLY item ids absent from the live doc, using updateMask paths items.`<id>` (ids starting with a digit are backtick-quoted, e.g. 902_a). Field-level crew state (checked, issues, initials...) on live items can never be overwritten because those paths are outside the mask. This is how MEP/extra scope lands later on rooms already being worked.

### seed_rooms.mjs --replace-if-empty: gated rebuild of untouched rooms
*Area: seeding* · `tools/seed_rooms.mjs:153-193`

Rebuilds an EXISTING room (e.g. seeded from a retired package) only while the LIVE doc carries zero field work - the emptiness test (no checked items, no items with issue text, no room notes) is checked against the live doc, never assumed. Any field work => REFUSING message, room left untouched, counted as failure. On replace: original createdAt preserved ('the doc's history is not ours to reset') and the write is guarded by currentDocument.updateTime read from the live doc, so a concurrent crew write fails the replace instead of being clobbered.

### build_room_type.py - siblings inherit the approved template, provably
*Area: seeding* · `tools/build_room_type.py:1-50`

All rooms of a type carry the SAME package with Austin's rulings riding along. The script regenerates each room raw from sqlite AND proves regeneration matches the approved template item-for-item (ids, codes, labels, categories, qty, reliability); any drift is a hard failure naming the room and field, never a silent overwrite. Emits the template's item CONTENT under the room's own number/floor. LABEL_TO_TYPES maps Austin's controlled vocabulary onto DB room_type values - several types deliberately collapse onto one label (QQ Studio Connector = QQ Wide Connecting + QQ Connecting); the label is never a join key.

### gen_spaces.py - 66 unique common-area docs, no template layer
*Area: seeding / common areas* · `tools/gen_spaces.py:1-32`

Guest rooms come from templates because 115 rooms share 12 packages; the 66 spaces are each unique, so each doc is generated straight from space_items. Rules: one line per (tag, description, reliability) with a xqty badge - rows differing in reliability do NOT collapse (a FLAGGED instance keeps its own line/note rather than hiding in a clean count); FLAGGED/MEDIUM lines must carry the DB's own note or say plainly no reason is recorded; clean state forced; deterministic ids never derived from the space number. Enrichment files (tools/out/space-enrich/) may add lines but are REFUSED if any line lacks its own src citation and reliability.

### build_mep.mjs - punch docs as a third population in the rooms collection
*Area: MEP punch system* · `tools/build_mep.mjs:1-52`

Doc id '<room>-MEP', type slug 'mep-punch' - the slug is the ONLY discriminator telling the app it is a punch list, not a guest room. Item ids are md5(category|mark|label) deliberately EXCLUDING the room number, so the same device carries the same id in every room - this enables the floor rollup to total across rooms without label string-matching and makes the build idempotent. Floor and typeLabel come from the live FF&E doc (via newest local backup), NOT the DB - live wins because that is the name the crew reads; the DB fills gaps and says so.

### expand_mep.py - verified-package carry with per-room PTAC rebuild
*Area: MEP punch system* · `tools/expand_mep.py:1-50`

115 rooms carry only 7 distinct MEP packages; 8 verified source rooms (101,104,105,118,202,217,238,438 - note 438 is a DIFFERENT package from 118) cover every key. Carry happens ONLY after proof: for each target the script re-derives the room's MEP signature from the DB and diffs it against the source; any non-PTAC difference REFUSES the room rather than shipping an unverified package. The PTAC line is never carried - it is rebuilt per room from its own schedule row, because the PTAC-1/PTAC-2 split tracks sheet convention along the QQ-vs-King family (M301 vs M401 detail 01), settled on the walk by nameplate (AZ65H12DAB=PTAC-1, AZ65H15DAB=PTAC-2). Room 116 is the proof case: 101's connector package, King family PTAC mark.

### normalize_mep_labels.py - richest-wins label canonicalization
*Area: MEP punch system* · `tools/normalize_mep_labels.py:1-50`

For each (category, mark) the longest label becomes canonical (length tracks information: schedule row verbatim, model number). Two protective exceptions: ROOM-SPECIFIC labels are left alone (a room number standing alone or an 'N of M' ordinal - regex tuned so product-code fragments like 215CA.104 are not misread as room numbers, and room-TYPE claims like 438's 'ACCESSIBLE vanity top' are not propagated to standard keys); the PTAC line is left alone. --check first; nothing written without --write.

### mep_rollup.mjs - device quantities for purchase orders from LIVE data
*Area: rollup / PO counting* · `tools/mep_rollup.mjs:1-114`

Walks every live doc with type=='mep-punch', not deleted, on the chosen floor (--floor, default 1) and totals each device. Counts UNITS not lines (a line with qty 3 is 3 heads; qty<=0 counts as 1). Tally key is category+mark+label so two devices sharing a bare mark never collapse - the Mechanical 'FD' fire damper vs Plumbing 'FD' floor drain collision is real and would put a wrong number on a PO. Skips items with deleted:true. Tracks per-device room count and checked units. Output: terminal or --md markdown table, sorted by trade group order then units; FLAGGED rows print a flag ('drawings disagree; confirm before ordering'), MEDIUM prints 'verify'. --drafts reads tools/out/mep/*.json instead of live.

### backup_all.mjs - read-only full export before any destructive op
*Area: backup / disaster recovery* · `tools/backup_all.mjs:1-33,127-172`

Exports config, rooms, templates, roles, activity as RAW REST payloads (name/fields/createTime/updateTime) into one lossless JSON with a meta block (exportedAt, per-collection counts, skipped list). ALL docs included - soft-deleted rooms too. Auth is plain anonymous with NO admin claim; roles is expected to skip with PERMISSION_DENIED (list denied by rules) and that is the ONLY acceptable skip - any other skip (429/5xx after 3 retries, expired token) still writes the file but exits nonzero so a 'backup && destructive-step' pipeline stops instead of destroying the only copy. Collection list is hardcoded and must mirror everything the app writes or a collection silently vanishes from backups. Restore is deliberately manual (commit each doc's fields as admin); the script itself never writes.

### set_room_label.mjs - display-name rename with recorded ruling
*Area: admin tooling / audit trail* · `tools/set_room_label.mjs:1-13,63-108`

Changes typeLabel ONLY, via updateMask (typeLabel + updatedAt) - a whole-doc PATCH would drop every item/note/check-off. Never touches the type slug: the slug is the join key to the template that IS the room's package; renaming through it would offer the crew a 'restore' into the wrong shape. Renames BOTH docs, <room> and <room>-MEP, so the punch screen and FF&E screen never disagree on the same room (a live-invariants check). --why writes the ruling text into the room's notes map under key 'rename-<YYYY-MM-DD>' - a label change is a real decision when drawings disagree and is recorded, not applied silently. --check shows and changes nothing. Post-write verify proves label changed AND item count and checked count are intact.

### patch_item_notes.mjs - surgical one-field backfill
*Area: admin tooling* · `tools/patch_item_notes.mjs:1-14,60-97`

Sets exactly one field (instanceNote) on named items in named rooms via an updateMask naming exactly those paths - check-offs, initials, issues, room notes, timestamps are outside the mask and cannot be clobbered even by accident. NEVER overwrites an existing non-empty note (skips it). Exists because rooms seeded before make_template carried reasons forward show 'VERIFY - sources disagree' with nothing actionable, and those rooms carry real field work so cannot be re-seeded. --dry-run/--execute; read-back proves notes landed and checked count unchanged.

### migrate_101_103.mjs - the reference pattern for schema cutover with field-work carry
*Area: admin tooling / migration pattern* · `tools/migrate_101_103.mjs:1-36,52-61,122-258,407-473,499-521`

Soft-deletes room 103 (deleted=true + updatedAt only, nothing else touched) and REPLACES room 101 with the new template while carrying every paper check-off/issue/note. Carry rules: paper-code aliases (GR-202->GR-208, GR-308R->GR-308); FOLD lines with no template line by ruling (GR-319/GR-323 nightstands fold into gr322_a's instanceNote, reported loudly, never dropped - an OPEN issue on a fold line blocks --execute); any other unmatched code is a true orphan and --execute REFUSES if it is checked or has an open issue unless --allow-orphans; instance groups: all-checked -> checked with merged initials and max-checkedAt provenance, some-checked -> UNCHECKED plus loud re-verify flag on instanceNote, issues merged distinct with resolved only if all resolved. An accounting assertion proves mapped+folded+orphan+deleted == total legacy instances. DEFAULT IS DRY-RUN and dry-run is pure reads (does not even claim admin); writes a human-readable carry report to tools/out/carry-report-101.md. Both writes carry currentDocument.updateTime preconditions - a crew write between GET and write ABORTS the migration (HTTP 409/FAILED_PRECONDITION) instead of being silently overwritten by a stale carry. createdAt preserved. Deep read-back verify: exact item-id set, checked count, createdAt round-trip, spot-checks of carried initials/uid/issue/note content, fold codes present in survivor notes, 103 deleted. computeCarry is a pure function with an offline fixture test.

### tests/live-invariants.mjs - contract asserted against LIVE Firestore
*Area: pinned data invariants* · `tests/live-invariants.mjs:52-63,81-323`

Checks pinned (each caught or would catch a real shipped defect): (1) every guest room's type slug names a live template whose item-id set matches the room's derived lines exactly - crew-ADDED lines (derived=false) are expected and exempt; (2) no two templates share a display name unless they carry the identical package; (3) no template carries field state; (4) field work never rots: room 101's paper-carried work is a FLOOR (>=14 checks, >=6 issues, >=1 note), the >=13 cutover check-offs with checkedByUid=='paper' must survive forever (they exist in no other source), and every check-off carries initials + timestamp ('paper' marks exempt from timestamp - the paper sheet recorded WHO not WHEN); (5) every FLAGGED/MEDIUM line in rooms AND spaces carries an instanceNote explanation; (6) no doc has a top-level key outside the rules whitelist; (7) exactly 115 guest rooms, floors 16/33/33/33; (8) every 3D-model room exists live and is QQ-family only; (9) spaces (once seeded) mirror js/space-meta.js exactly (known numbers, plan names, true floors), no space id collides with a room number, space check-offs attributable; MEP: every <n>-MEP doc names a live guest room, sits on its room's floor, carries the identical typeLabel as its FF&E doc, every line in one of 5 trade categories, every line has a non-empty verifyAtPunch step ('a punch line with no action is not a punch line'), no bare FLAGGED/MEDIUM, and (era check, to be loosened when the walk starts) no seeded MEP doc carries field work. Listing always drains nextPageToken - Firestore caps responses by BYTES and a partial page once made correct data 'fail'.

### Canonical room-type vocabulary: 11 join keys, join on room_type never display_label
*Area: data contract* · `data/ROOM_TYPE_CANONICAL.md:18-116,322-342`

Exactly 11 canonical room_type strings summing to 115 keys (King Studio 57, King Studio Connecting 1, King Studio Acc. 2, King One Bedroom 3, King One Bedroom Acc. 3, Queen-Queen 31, QQ Connecting 6, QQ Extended 6, QQ Wide 2, QQ Wide Connecting 2, QQ Acc. 2). display_label is what the app shows and is NEVER a join key - exactly 4 rooms (101/201/301/401) have label != type under OV-001 (label-only override); joining on label prices those rooms 55 sqft short (535 vs 480). Room 401's join key itself rests on user override OV-001 ('QQ Wide' on the sheet -> 'QQ Wide Connecting'), reversible only by Austin. accessible/connecting/mod/hearing_impaired are per-room booleans, never concatenated into the type (the whole room-118 problem); 'King Studio Accessible Connector' is an invented type that must not exist. Room 438's connecting flag is a deliberately OPEN conflict (B4.4) - both positions carried, neither set. Build check: GROUP BY room_type must return exactly 11 rows summing to 115, and an unknown string must FAIL LOUDLY, never zero-row join.

### FLAGGED is a two-position display, not an error; derived means inherited
*Area: data contract / UI rules* · `data/APP_HANDOFF.md:45-56,107-158`

Reliability values HIGH/MEDIUM/LOW/FLAGGED. FLAGGED = two sources disagree and nobody has ruled: the app must render BOTH positions (canonical case: tub CONFIGURATION A vs roll-in-shower CONFIGURATION B on all 7 accessible keys) and must never dedupe or pick a winner - only Austin closes conflicts. Quantity is repeated rows/instances distinguished by instance_note, never collapsed (except the deliberate template x-qty dedupe which preserves qty). derived=1 marks lines inherited from a type package rather than observed in that room - shown before anyone orders. Room sheets run 35-156 lines across 21 categories; never truncate or hide categories - filter by category instead.

**Reader's notes (risks / surprises):** GUARANTEES THE REBUILD MUST RE-PROVIDE AS PRODUCT FEATURES, NOT SCRIPTS: (1) Soft delete everywhere - hard delete is disabled at the rules layer and every tool honors deleted:true; the platform needs first-class archive/restore. (2) Create-only / append-only / replace-if-empty seeding semantics - today three CLI flags; the platform needs 'never clobber field work' as an enforced write policy: field-level merges via masks, emptiness gates checked against live state, createdAt preservation. (3) Optimistic concurrency on admin rewrites - migrate and replace-if-empty guard with updateTime preconditions so a crew check-off mid-operation aborts the operation; a multi-user platform needs this on any bulk edit. (4) Automatic pre-destructive backup with fail-closed semantics (backup incomplete => destructive step blocked). (5) Label-vs-join-key separation - renaming a room must be a display-only operation that can never re-key the package join, must propagate to the paired MEP doc, and must capture a required 'why' into an audit trail (today notes key rename-<date>). (6) Template hygiene as validation: templates can never carry field state, no two same-named templates with different packages, slug<->package identity per room - these are live-invariant scripts today and should be write-time validations. (7) Migration-with-carry as a feature: alias maps, fold rules with loud reporting, blocking on checked/open-issue orphans, and a full accounting proof that every legacy line is mapped/folded/orphaned/deleted. (8) Attributability: every check-off needs initials + timestamp + uid (the 'paper' uid is a permanent legacy exemption for ~13 cutover marks with no timestamps - do not lose or 'fix' them; they exist in no other source). (9) FLAGGED/MEDIUM lines must always carry an explanation note (patch_item_notes exists purely to backfill this). (10) PO rollups must count units (qty), key on category+mark+label (the FD collision is real), read live not drafts, and surface FLAGGED/verify warnings. SURPRISES / MIGRATION RISKS: three populations share ONE rooms collection discriminated only by type-slug convention (guest rooms, 'space-*' spaces, 'mep-punch' docs) - any rebuild query must replicate the split or 115-key counts break; MEP item ids are md5(category|mark|label) WITHOUT room number by design (cross-room rollup identity) while FF&E ids are tag-slug+instance-suffix - two different id schemes; the DB is not the authority on room names, the live FF&E doc is (build_mep reads names from the newest backup, live wins); room 401's type and OV-001 are Austin-only reversible; room 438 connecting and tub-vs-roll-in are deliberately unresolved - a rebuild that 'cleans up' these FLAGGED rows destroys the record; the anonymous-auth + shared-PIN model means uid is per-device-session, not per-person - initials are the human identity; admin PIN '6621' and its sha256 are effectively public in the repo (config.js + rules), a known accepted risk to carry or consciously replace; Firestore list pagination truncates by bytes - every reader must drain nextPageToken; rules cap items at 200 per doc while rooms carry ~40-60 FF&E lines now but the source data has up to 156 rows per room - full 21-category scope in one doc would approach the cap.


---

## Parity rule

Nothing in this document is dropped silently. Any deliberate change of behavior in the rebuild
gets a line in a DEVIATIONS table with Austin's written OK next to it.
