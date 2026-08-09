# Firebase setup — H2SEP Room Checklists (one time, ~7 minutes, phone OK)

Everything happens at **console.firebase.google.com**, signed in with your regular
Google account. When you're done, paste one code block back to Claude and the app
goes live for the whole crew.

## The steps

1. Open **console.firebase.google.com** and sign in with your Google account.

2. Tap **Create a project** (may say "Get started"). Name it **H2SEP Checklist**.
   Accept the terms → **Continue**.

3. On the **Google Analytics** screen, turn the toggle **OFF** → **Create project**.
   Wait ~30 seconds → **Continue**.

4. Open the left menu (☰) → **Build → Firestore Database** → **Create database**.
   - Location: pick **nam5 (United States)** — or the first US option shown.
     *(This choice is permanent; any US option is fine.)*
   - Choose **Start in production mode** → **Create**.

5. Still in Firestore, open the **Rules** tab.
   **Ask Claude for your security rules text** — Claude will send it in chat with
   your admin PIN already baked in (scrambled, never stored as plain text).
   Select ALL the existing text, delete it, paste Claude's rules → **Publish**.

6. Left menu (☰) → **Build → Authentication** → **Get started** →
   **Sign-in method** tab → tap **Anonymous** → flip **Enable** → **Save**.
   - If you see a setting about **automatically deleting anonymous accounts** —
     leave it **OFF**.

7. Tap the **gear** next to "Project Overview" → **Project settings** → scroll to
   **Your apps** → tap the **`</>`** (web) icon.
   - Nickname: **H2SEP**
   - Do **NOT** check the "Firebase Hosting" box → **Register app**.

8. You'll see a code block that starts with `const firebaseConfig = {`.
   **Copy the whole block and paste it to Claude in chat.** Done.

Claude then wires the config into the app, loads Room 101 and the room templates,
does a test write/read against your database, and redeploys. The yellow
"Demo mode" strip disappears and every phone that opens the app is live-synced.

## Also decide (tell Claude in the same message)

- **Your admin PIN** — 4 to 6 digits. Needed before step 5 so the rules include it.
  This is what leads type to add rooms/floors/items in the app.

## Plain-English security note

The config block you paste is *public by design* — Google intends it to ship
inside web apps; it is not a password. Access control lives in the security
rules you published in step 5: every reader/writer must be signed in (the app
does this invisibly via Anonymous sign-in), room data must match the expected
shape, rooms can never be hard-deleted, and admin-area changes require the PIN.
For furniture checklists this is the right $0 posture; if it ever matters, the
upgrade paths are Firebase App Check or real email sign-in — both cheap, neither
needed today.

## What this costs

Nothing. The free (Spark) tier includes 50,000 reads + 20,000 writes per day and
1 GiB of storage. The whole hotel's checklists are ~2 MB, and a 10-person crew's
busy day uses well under half the daily quota. There is no card on file and
nothing that can silently start billing.
