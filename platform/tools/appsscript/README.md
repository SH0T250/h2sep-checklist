# Keep the app's contact list in step with the Google Sheet

The contact list spreadsheet stays the source of truth. This script lives inside
that spreadsheet and pushes it into the app, so the phones and the office screens
show what the sheet says, without anyone exporting or uploading anything.

## What it does

- Reads the first sheet, finding the header row by name, so the column order can change.
- Writes only what actually changed, into `projects/h2sep/platform_rooms/_dir`.
- A row deleted from the sheet is **archived** in the app, never destroyed.
- A contact edited **inside the app** since the last sync is **left alone** and
  reported, so the two versions never silently fight. Austin picks the winner.
- Signs in the same anonymous way the crew app does. No service account, no key
  file, no admin rights, nothing to install on a work computer.

## Setup, one time, about two minutes

1. Open the contact list spreadsheet.
2. **Extensions > Apps Script**. A code editor opens in a new tab.
3. Delete whatever is in `Code.gs`, paste in all of `SyncContacts.gs`, and save
   (the disk icon).
4. Pick `syncContacts` in the function dropdown and press **Run**. Google asks
   for permission the first time: choose the account that owns the sheet,
   click **Advanced**, then **Go to (project name)**, then **Allow**. It is
   asking to read this sheet and to reach the app's database, nothing else.
5. Go back to the spreadsheet and reload the tab. A new **H2SEP App** menu
   appears next to Help.
6. **H2SEP App > Turn on hourly sync.**

## Using it

- Edit the sheet as you always do.
- It syncs on its own every hour.
- To push a change right now: **H2SEP App > Sync contacts to the app now**.
  A message at the bottom of the sheet says what it did, for example
  "Synced. 2 added, 1 updated, 0 archived."

## If it says a contact was left alone

That contact was edited in the app after the last sync, and the sheet now
disagrees. Nothing was lost. Either fix the sheet to match, or say the word and
the app copy gets overwritten from the sheet.

## The manual path

`platform/tools/sync_directory.mjs` does the same job from a command line, with
a dry run option, for audits and for restoring after a mistake. Both paths build
the same contact ids from the same columns, so they agree.
