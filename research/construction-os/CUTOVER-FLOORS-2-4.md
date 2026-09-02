# Floors 2, 3 and 4 cutover: what was run, in the order it ran

Austin, 2026-09-02: "approve floors 2, 3 and 4 and push them live for the app and dashoard."
Recorded as ruling D40. Everything below has been run. The numbers are from the tool logs in
`research/rollout/`.

## What went live

| | Floor 2 | Floor 3 | Floor 4 |
|---|---|---|---|
| Guest rooms | 33 | 33 | 33 |
| Common-area spaces | 3 (S221, S237, S239) | 3 (S321, S337, S339) | 3 (S421, S437, S439) |
| Documents (FF&E, MEP, spaces) | 70 | 70 | 70 |
| The crew's existing work, carried in | 579 check-offs, 696 open issues, 28 notes | 412 check-offs, 701 open issues, 10 notes | 3 check-offs, 442 open issues, 1 note |
| Audit before rollout | 54 checks pass | 56 checks pass | 56 checks pass |

The platform collection `projects/h2sep/platform_rooms` went from 83 documents to 293. Floor 1's
83 documents, the contact list `_dir` and the sub assignments `_asg` were not written.

## Where it went, and what it cannot touch

The platform writes to `projects/h2sep/platform_rooms`. The crew app reads `projects/h2sep/rooms`.
The rollout tool reads the crew collection before and after each run and compares every document's
updateTime: 296 documents, identical on every run. The crew app's own files at the repository root
were compared by md5 before and after the deploy: 6 files, byte-identical. The crew app is not
affected by this cutover.

## The order of operations, as run

1. **Rebuild, carry, audit** every floor after the floor-4 verifier fixes (D39). Determinism
   proved on each build; carry reconciliation exact on each floor.
2. **Dry run** `node platform/tools/rollout_floor.mjs --floor=N` for N = 2, 3, 4. Each reported
   70 documents to create, 0 to update, every other live document untouched, zero-loss check OK.
3. **Backup** before each apply, written to `tools/out/backups/platform-before-floorN-rollout-<stamp>.json`
   (83 docs before floor 2, 153 before floor 3, 223 before floor 4). Each backup is re-read and
   its document count checked before the tool proceeds.
4. **Apply** `--apply` for each floor. Every document read back from the cloud and its line count,
   check count and note count compared to what was sent. Every other document's updateTime compared
   to the backup: none moved.
5. **App and dashboard.** The seed loader now fetches all four staged files and merges them; the
   sidebar reads FLOORS 1-4 LIVE; the dashboard, rooms and common-areas screens read the floor
   range from the documents they hold and group their lists by floor. 26 of 27 floor-1 UI checks
   pass and 12 of 12 four-floor UI checks pass (the one failure is a stale check that reads the
   local patch log, which the app does not write once Firebase is attached; it fails the same way
   on the previous deploy).
6. **Deploy.** Targeted copies into `main`, then `main` pushed to `gh-pages`. Verified live with
   cache-busted fetches: the three seed files are byte-identical to the repository, the label and
   loader are present, the crew app's index.html md5 matches the repository.
7. **Refresh.** The build-authored room type note on every floor 2 to 4 room had read "STAGED FOR
   APPROVAL - NOT LIVE". The generator now records the approval (D40) in that note and in the
   file's meta; all three floors were rebuilt, carried, audited and rolled again as UPDATE runs
   with no field-state change, and the refreshed seeds deployed.

## The merge rule

The rollout tool is `platform/tools/rollout_floor1.mjs` made floor-parametric. It refuses
`--floor=1` so the floor-1 record cannot be re-run by accident, and it refuses a staged file whose
meta.floor or any document's floor disagrees with the flag.

**A rollout never destroys a completed human action.**

- checked true beats checked false
- a resolved issue is never reopened
- an issue raised in the live app is never dropped
- a note the live app holds and the build does not is kept
- a line that exists live but not in the build is archived, never deleted
- every disagreement is printed, never settled quietly
- only the documents in the staged file are written; every other document must not move, and the
  tool fails verification if one does

On this cutover there were no conflicts: none of the 210 documents existed live before, and the
refresh runs changed text only.

## Rollback

Each backup is a complete copy of the collection as it stood before that floor. Restoring one puts
every pre-existing document back exactly. Deletes are blocked by the published rules, so the 210
documents this cutover created would remain; they can be archived (`deleted: true`) rather than
destroyed.

## What is still open, and is NOT resolved by going live

These ride on the live lines and notes as flagged items. They are questions for people.

1. **Working-wall hand per room (D26).** GR-305 on every non-connecting two-queen key and GR-309 on
   238 and 338 ship at MEDIUM with the LEFT / RIGHT hand open. The workbook tabs give a split
   (5 left / 6 right) but no drawing says which room takes which. Needs RK Design.
2. **Bathing configuration on the accessible keys** 217, 238, 317, 338, 417, 438. Both the tub and
   the roll-in configurations are on each checklist, FLAGGED and mutually exclusive. Only one gets
   built. Conflicts A11, B4.4 and C-01 are open; ruling D19 reaches room 118 only.
3. **Conflict A11 on room 338.** G001 prints no third-floor QQ accessible key; the purchase record
   and A100 do. Carried on the room, not resolved.
4. **Common-area finish rows** outside the checklist gate (paint, drywall, flooring, doors, stone,
   wall covering, FF&E misc) are recorded on each room's gate-gap note, not as lines. Widening the
   gate is Austin's call.
5. **Room 438's crew note** names the PM by full name. Crew note text is never altered by the carry
   (D24), so it ships as written. If Austin wants it reduced to initials, that is an edit in the
   app, not in the tool.

## The commands

```
node platform/tools/build_floor2.mjs --floor=N --selftest --verify-determinism
node platform/tools/carry_floor2.mjs --floor=N
node tests/floorN-audit.mjs
node platform/tools/rollout_floor.mjs --floor=N            # dry run, writes nothing
node platform/tools/rollout_floor.mjs --floor=N --apply    # backs up, writes, verifies
node tests/floor1-ui.mjs                                   # 27 checks in a real browser
node tests/four-floor-ui.mjs                               # 12 four-floor checks, local mode
```
