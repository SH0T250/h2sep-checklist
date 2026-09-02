# H2SEP Field Tracking Platform: how it works and how to pick it up

Written so a person or an agent with no memory of this work can take it over. It assumes you can
read code and know construction, and it assumes nothing else.

## What this is

Two faces of one system, on one live database:

- an **office command center** for Triun, wide screens, light
- an **installable phone app** for crews and subs, dark, glare-proof, works with no signal

It replaces a checklist app that is already in daily use on this job. That app is still live and
still the source of the crew's work. Nothing here has replaced it yet.

**Project:** Home2 Suites by Hilton, Eagle Pass TX. 115 keys. Project code H2SEP. Triun job 24030.

## The two collections, and why that matters more than anything else

| collection | who writes it | what it holds |
|---|---|---|
| `projects/h2sep/rooms` | the CREW APP, in daily use | the crew's real work, all 115 keys |
| `projects/h2sep/platform_rooms` | the NEW platform | the new build |

**The platform has never written to the crew's collection and must never start.** Every tool that
reads it says so at the top, and the rollout tool prints the crew documents' timestamps before and
after so the claim is checkable. If you change one thing after reading this, do not change that.

## Layout

```
platform/                     the new platform, no build step, plain ES modules
  js/core/       store.js     field-path patches, offline queue, identity
                 registry.js  the module registry: nav + routes, sorted by `order`
                 firebase-backend.js   writes ONLY to platform_rooms
  js/modules/    tracking/    rooms, checklists, common areas, print sheets
                 directory/   contacts and sub assignments
                 bim/         the 3D viewer entries
  data/          slice-f1.json        the APPROVED slice. read only. never written by a tool.
                 floor1-staged.json   the staged floor-1 build, 81 docs. not live.
  tools/         build_floor1.mjs     the generator
                 carry_field_state.mjs  brings the crew's work into the build
                 rollout_floor1.mjs   the cutover, dry run by default
                 sync_directory.mjs   contact list sync
                 appsscript/          the Google Sheet's own hourly sync
tests/           floor1-audit.mjs     41 data checks
                 floor1-ui.mjs        26 checks driving a real browser
research/construction-os/
                 DECISIONS.md         D1 to D31. Austin's rulings. Each one is law until he changes it.
                 HANDOFF-2026-09-02.md   the dated session handoff: current state, next steps
                 CUTOVER-FLOOR1.md    the rollout runbook
                 NEEDS-CLARIFICATION.md   what is still open
research/king-studio/geometry-spec.json   King-family geometry, every field cited, all 8 rooms proven
research/floor1-3d/               A100 layout measurements and the 3D rebuild workflow
data/project.sqlite               the reference database mined from the drawings
```

## The rules that are not negotiable

These came from Austin, from mistakes made on this job, or from both.

1. **Back up before writing to live data.** Every tool that writes does this first.
2. **Never delete. Archive.** Deletes are blocked in the published Firestore rules. A retired line
   gets `deleted: true` and keeps its history, so a check-off recorded against it survives.
3. **Never guess a tag, count, quantity, or dimension.** If no document states it, the line ships
   without it and says why. Reliability MEDIUM with an honest note beats a confident wrong number.
4. **A document conflict is carried, not resolved.** Where two sheets disagree, both are shown and
   flagged. Only Austin closes a conflict, and it is recorded in DECISIONS.md when he does.
5. **No personal data in this repository. It is public.** Initials and timestamps are fine, they are
   what the paper sheet carries. Names, emails, phone numbers and account ids are not. The contact
   list lives in Firestore only. The audit fails if a full name reaches the seed.
6. **Austin approves anything irreversible.** Deploys, cutover, emails, signups, spending.
7. **Plain English. No em dashes. American spelling.**

## How the data is built

`data/project.sqlite` holds the drawings mined into rows: `rooms`, `room_types`, `room_items`,
`spaces`, `space_items`, `conflicts`. The generator turns those rows into checklist documents:

1. a **category gate** keeps FF&E families and routes MEP categories to the punch document
2. tagged rows **fold** by (category, tag); untagged rows stand alone with a content-derived key
3. **rulings** override counts where Austin has ruled (D12 nightstands, D20 sconces, D22 working wall)
4. package content - labels, citations, submittal links, ruling text - comes from an APPROVED room of
   the same type, because sqlite does not carry the closed flags or the Drive links
5. **numbering convention is measured**, not assumed: the generator works out from the approved room
   whether its sort band advances per line or per raw row, and reproduces it

The selftest regenerates rooms 101, 103 and 105 and diffs them against the approved copies. It must
report zero unexplained deltas. Where a ruling deliberately changed an approved room, the difference
is declared and expected, and a declared difference that fails to appear is also a failure.

## Running things

```
node platform/tools/build_floor1.mjs --selftest      # prove the recipe still reproduces approved work
node platform/tools/build_floor1.mjs 107 109         # build rooms into the staged seed
node platform/tools/build_floor1.mjs --regen 105     # rebuild an APPROVED room, tombstoning what it retires
node platform/tools/build_floor1.mjs --spaces all    # the common areas
node platform/tools/carry_field_state.mjs --dry-run  # what the crew's work would bring in
node platform/tools/rollout_floor1.mjs               # cutover dry run, writes nothing
node tests/floor1-audit.mjs                          # 41 checks
node tests/floor1-ui.mjs                             # 26 checks, needs a local server on 8343
```

A rebuild **preserves field state**. It did not always, and that bug would have silently zeroed the
floor after the migration. There is a regression check for it. Do not remove it.

## Traps that have already caught someone

- **A merge write with an empty map wipes the map.** `setDoc(ref, {items:{}}, {merge:true})` writes
  the empty map OVER the live one. It destroyed 46 contacts once. `createIfMissing` now reads first.
- **Two build paths can clobber each other.** The room path and the spaces path both used to restore
  approved documents from the slice, undoing a deliberate regeneration. The staged file is now an
  accumulator and records what has been regenerated.
- **A unanimous symptom is not a diagnosis.** Seven critics agreed the 3D scene had no shadows. The
  shadows were fine. Half the light was coming from an environment map nothing could block.
  Instrument before you believe a diagnosis, including your own.
- **Key order is not data.** A comparison that is order-sensitive will report differences that do
  not exist.

## Where the work stands

Current as of the dated handoff; read `HANDOFF-2026-09-02.md` for the full state and the next steps.

- Floor 1 is LIVE (D24): 16 guest rooms, 31 common areas, the crew's 382 check-offs and 288 open
  issues carried in exactly, crew collection untouched. D26 to D29 rulings patched live after.
- Contacts and sub assignments are live, and the Google Sheet syncs itself hourly.
- The four unapproved room types have full mockups delivered and waiting on Austin (D30).
- The floor-1 3D scene was built and judged once, then destroyed by a container restart before it
  was committed (D31). The King geometry spec, the A100 layout measurements, and the judgement
  survived and are committed; the rebuild workflow is authored and ready to run.
- Floors 2 to 4 are not built. They are gated on the mockup approval, and D24 makes it law that
  every note, markup and check-off from the crew app comes with them.

## Open questions that need a person

See `NEEDS-CLARIFICATION.md` and the last section of `CUTOVER-FLOOR1.md`. The short list: GR-305
handedness for RK Design, room 118's tub marks for the architect, and three room 118 accessory lines
that need an RFI.
