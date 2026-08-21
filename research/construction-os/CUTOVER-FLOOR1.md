# Floor 1 cutover: what happens when Austin says go

Nothing in here has been run. The rollout is staged and waiting on approval.
Everything below has been dry-run against the live database and the numbers are real.

## What is being rolled out

| | |
|---|---|
| Guest rooms | 16, every key on floor 1 |
| Common areas | 31 spaces, from the Vestibule to the Pool Deck |
| Documents | 81 |
| Checklist lines | about 1,500 |
| The crew's existing work | 382 check-offs, 289 open issues, 5 notes, carried in |

## Where it goes, and what it cannot touch

The platform writes to `projects/h2sep/platform_rooms`. That is a different collection from the one
the crew app reads, which is `projects/h2sep/rooms`. **The crew app cannot be affected by this
rollout.** The rollout tool reads the crew collection and never writes a byte to it, and it prints
the crew documents' timestamps before and after so that claim is checkable rather than promised.

## The order of operations

1. **Backup.** The whole live platform collection is written to
   `tools/out/backups/platform-before-floor1-rollout-<timestamp>.json` before anything else happens.
   `--apply` refuses to proceed if the backup fails.
2. **Dry run.** `node platform/tools/rollout_floor1.mjs` writes nothing and prints exactly what would
   change: which documents are created, which are updated, which are left alone, and every conflict.
3. **Read the conflicts.** See below. This is the part that deserves a human's eyes.
4. **Apply.** `node platform/tools/rollout_floor1.mjs --apply`
5. **Verify.** The tool reads every document back and checks the line counts, then prints the crew
   collection's timestamps to show they did not move.

## The merge rule, and why it is not a copy

Three places hold real work: the staged build, the live platform documents, and the crew app. A
straight overwrite would destroy the second one, and it is not hypothetical that it holds work.

**A rollout never destroys a completed human action.**

- checked true beats checked false
- a resolved issue is never reopened
- an issue raised in the live app is never dropped
- a line that exists live but not in the build is archived, never deleted
- every disagreement is printed, never settled quietly

Nothing is invented by this rule. Every value written was set by a person in one app or the other.

## The conflicts, as of the last dry run

**One**, and it is a good example of why the rule exists:

> `101/hd08_a` (HD-08): the issue "MISSING" is **resolved in the platform app** and **open in the
> build**. The live state is kept, so the rollout does not reopen something somebody closed.

That resolution exists only in the platform app. A copy-based rollout would have silently undone it,
and nobody would have noticed until the crew walked room 101 again.

## What the rollout deliberately leaves alone

- `_dir` and `_asg`, the contact list and the sub assignments. They are not part of the floor-1 build
  and are not touched.
- Every guest room above floor 1. Floors 2 to 4 are not in this rollout.
- The crew app, its files, and its data.

## Rollback

The backup written in step 1 is a complete copy of the collection as it stood. Restoring it puts
every document back exactly as it was. Deletes are blocked by the published rules, so the documents
the rollout creates would remain; they are additive and invisible to anyone not looking for them,
and they can be archived rather than destroyed.

## What is still open, and is NOT resolved by rolling out

These ride along as flagged lines and notes. They are questions for people, not for the tool.

1. **GR-305 handedness.** The FF&E workbook splits the six plain Queen-Queen working walls into 2
   left and 4 right, and no drawing says which room takes which hand. Needs RK Design before that
   casework is released.
2. **Room 118's tub marks.** Austin ruled the room is a roll-in shower (D19). A100 and G001 still
   mark it "T" for tub, and conflicts A11 and B4.4 are formally open. That is the architect's to
   close; the ruling governs construction in the meantime.
3. **Room 118 flags.** Seven FF&E lines and four MEP lines stay flagged for reasons other than the
   bathing configuration, including a probable tag error on GR-503 and three accessory lines that
   need an RFI.
4. **The connecting door, GR-3.** Category "Doors" sits outside the approved checklist gate, so it
   carries no checkable line on 116 or 118 by design. It is recorded as a room note rather than
   invented as a line no other room has.

## The commands

```
node platform/tools/rollout_floor1.mjs            # dry run, writes nothing
node platform/tools/rollout_floor1.mjs --apply    # backs up, writes, verifies
node tests/floor1-audit.mjs                       # 41 data checks
node tests/floor1-ui.mjs                          # 26 checks in a real browser
```
