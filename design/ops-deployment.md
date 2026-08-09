# H2SEP Room Checklist — Ops Plan: Deployment, Ingestion Pipeline, Free vs Pro Packaging

## 0. Verified facts that change the tentative plan (read first)

I checked the real repo and current vendor docs. Three assumptions in the brief need correcting:

| # | Assumption in brief | Verified reality | Impact |
|---|---|---|---|
| 1 | Host Pages from existing repo `sh0t250/claude` | **`SH0T250/Claude` is PRIVATE** (`visibility: private`, `has_pages: false`, checked via GitHub API). GitHub Pages on the Free plan works **only on public repos**; private-repo Pages needs GitHub Pro ($4/mo). Also its default branch is `claude/cool-curie-idil5`, not main/master, and the repo is full of Triun business documents (bids, proposals) that must not become public. | **Deploy from a new, dedicated public repo instead** (recommended below). $0 stays $0. |
| 2 | Zero-click Pages enablement via `actions/configure-pages@v5` with `enablement: true` | **Does not work with the default `GITHUB_TOKEN`.** The action's own `action.yml` says enablement "requires a token other than `GITHUB_TOKEN`" — a PAT with `repo` scope or a GitHub App with `administration:write` + `pages:write`. The `permissions: pages: write, id-token: write` block is required for *deploying*, but not sufficient for *enabling* the site. | True zero-click isn't possible with the stock token. Austin does **one ~20-second visit to Settings → Pages** (exact taps below). Everything after that is fully automatic forever. |
| 3 | Photos later "maybe on Spark" | **Cloud Storage for Firebase now requires Blaze for all new projects** (change effective Oct 30, 2024; Spark projects get 402/403 on any bucket call). Blaze still has an always-free tier (5 GB in US regions). | Photo attachments are firmly a **Pro/Blaze** feature. Confirmed, priced below (~$0–1/mo). |

Spark Firestore quotas confirmed current: **50,000 reads / 20,000 writes / 20,000 deletes per day, 1 GiB stored**, reset at midnight Pacific. Play Console: **$25 one-time**, but personal accounts must pass a **14-day closed test with 12 testers** before public release. Apple: **$99/yr**. (Sources at end.)

---

## 1. GitHub Pages deployment plan

### 1.1 Recommended: dedicated public repo, deploy-from-branch (simplest reliable option)

Create **`SH0T250/h2sep-checklist`** (public). Rationale:

- The existing `Claude` repo is private (Pages blocked on free plan) and contains confidential bid/proposal material — making it public is not an option.
- The app code contains **no secrets by design** (the Firebase web config is public-by-design; security lives in Firestore rules), so a public repo is safe.
- Fresh repo gets a sane `main` default branch (the existing repo's default is a stale `claude/*` branch).
- Clean URL: **`https://sh0t250.github.io/h2sep-checklist/`**

**Repo layout — app at repo ROOT, not `/app` or `/docs`:** the repo exists solely for this app, so `index.html`, `manifest.webmanifest`, `sw.js`, `app.js`, `firebase/` (vendored SDK), `icons/` sit at root. The `/app` vs `/docs` question only matters when sharing a repo with other content; a dedicated repo dissolves it. Add an empty **`.nojekyll`** file at root to skip Jekyll processing.

**Deployment mechanism — "Deploy from a branch" (`main` / root), NOT a custom Actions workflow:**

- Zero YAML to maintain. GitHub's built-in `pages-build-deployment` runs on every push to `main` and publishes in ~30–60 s.
- Avoids the known failure mode of the Actions route: the auto-created `github-pages` environment carries a deployment branch policy that blocks deploys from non-default branches ("Branch X is not allowed to deploy to github-pages due to environment protection rules") — irrelevant if we never use the Actions route.
- A static no-build vanilla app gains nothing from `configure-pages`/`upload-pages-artifact`/`deploy-pages`. If a build step ever appears (it shouldn't), we can switch to the Actions route then, with the workflow on `main` and `permissions: { contents: read, pages: write, id-token: write }`.

**Austin's total clicks (one time, ~60 seconds, phone-friendly):**

1. Repo creation: **zero clicks if** Claude's GitHub integration can create it (`create_repository` is available in-session; the GitHub App must cover "all repositories"). Fallback: Austin opens `github.com/new`, name `h2sep-checklist`, **Public**, Create — ~30 s.
2. After Claude pushes the code: repo → **Settings → Pages → Source: "Deploy from a branch" → Branch: `main`, folder `/ (root)` → Save**. That's the one unavoidable click (see §0 fact 2). (Optional zero-click gamble: pushing a branch literally named `gh-pages` has historically auto-enabled Pages; behavior is not reliably documented today — Claude can try it first and fall back to the one click.)

**Branch strategy / PR flow:**

- Claude develops on `claude/*` feature branches in `h2sep-checklist` → opens PR into `main` → Austin taps **Merge** (or tells Claude "merge it" and Claude merges via the GitHub tools) → push to `main` → Pages auto-deploys. Merging a PR *is* the deploy trigger; nothing else to do.
- Rollback = revert commit on `main` → auto-redeploys previous version.
- The current work in `SH0T250/Claude` branch `claude/hotel-checklist-app-gqtitq` is where the app gets *built*; at ship time Claude pushes the finished `app/` contents to the new repo's `main`. The private repo remains the planning/records home; the public repo holds only app code.

**PWA specifics tied to the URL:** project-site base path means `manifest.webmanifest` needs `"start_url": "/h2sep-checklist/"`, `"scope": "/h2sep-checklist/"`, and the service worker registered at `/h2sep-checklist/sw.js` (scope = its directory). Service worker precaches the app shell + vendored Firebase SDK with a versioned cache name bumped on each deploy; the app shows an "Update available — tap to refresh" banner when a new SW is waiting. iOS install = Safari → Share → Add to Home Screen (installed PWAs are exempt from Safari's 7-day storage eviction, so offline data survives idle weeks).

### 1.2 Fallback if Austin insists on the existing repo

| Path | What it takes | Verdict |
|---|---|---|
| Make `SH0T250/Claude` public | Exposes bids/proposals/personnel docs | **Rejected** |
| GitHub Pro | $4/mo; Pages site is still public to the internet anyway; app in `/docs`, Pages source = branch `claude/hotel-checklist-app-gqtitq` + `/docs` (branch-mode only offers `/` or `/docs` — this is why `/docs` would win over `/app`) | Works but costs money to keep private things private while publishing a public site — pointless vs a dedicated repo |

---

## 2. Austin's one-time Firebase setup (~7 minutes, phone OK)

Everything below happens at **console.firebase.google.com**, signed in with his Gmail. Claude provides the rules text in chat at go-time; Austin only copies and pastes.

1. Open **console.firebase.google.com** → sign in with your Google account.
2. Tap **Create a project**. Name it **H2SEP Checklist**. Check the terms box → **Continue**.
3. On the Google Analytics screen, turn the toggle **OFF** → **Create project**. Wait ~30 s → **Continue**.
4. On the project home, open the menu (☰) → **Build → Firestore Database** → **Create database**.
   - Location: pick **nam5 (United States)** (or `us-central1` — first US option shown). *This choice is permanent — just pick the US one.*
   - Choose **Start in production mode** → **Create**.
5. Still in Firestore, tap the **Rules** tab. Select ALL the text, delete it, and paste exactly this, then tap **Publish**:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{doc=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
6. Menu (☰) → **Build → Authentication** → **Get started** → **Sign-in method** tab → tap **Anonymous** → flip **Enable** → **Save**.
7. Tap the **gear** next to "Project Overview" → **Project settings** → scroll to **Your apps** → tap the **`</>`** (web) icon. Nickname: **H2SEP**. Do **not** check the Firebase Hosting box → **Register app**.
8. You'll see a code block starting `const firebaseConfig = {`. **Copy the whole block and paste it into Claude chat.** Done — Claude wires it into the app, does a test write, and confirms the round trip.

Honest security note (one-liner for Austin): "signed-in" here means any device that opens the app — anonymous sign-in is automatic. Someone would have to find the config and deliberately connect to read/write checklist data. For a room-furniture punch list that's an acceptable risk at $0; if it ever matters, add Firebase App Check or a shared crew PIN later.

---

## 3. Photo → database ingestion loop

### 3.1 Canonical JSON shape (one object per paper page/room)

```json
{
  "schema": 1,
  "room": "101",
  "floor": 1,
  "type": "QQ Studio Connector",
  "notes": [
    { "text": "CONNECTING DOOR LOCK - NOT LOCKING", "severity": "red" }
  ],
  "items": [
    { "key": "gr400",   "code": "GR-400", "label": "Window Treatment",  "instance": 1,
      "status": "done", "issue": null,               "checkedBy": "CC", "checkedAt": "2026-07-28", "source": "paper" },
    { "key": "gr202",   "code": "GR-202", "label": "Nightstand Sconce", "instance": 1,
      "status": "issue","issue": "NEED INSTALL",     "checkedBy": null, "checkedAt": null, "source": "paper" },
    { "key": "gr600_2", "code": "GR-600", "label": "Q Mattress",        "instance": 2,
      "status": "issue","issue": "NEED PROPER PLACE","checkedBy": null, "checkedAt": null, "source": "paper" }
  ]
}
```

Conventions:
- `key`: lowercase alphanumeric+underscore, unique per room; duplicates (two queen beds) get `_2` suffix (`gr600`, `gr600_2`). Chosen so it's a plain identifier in Firestore field paths and REST `updateMask` — no backtick-escaping anywhere.
- `status` enum: `"open"` (unchecked) | `"done"` (checked, has `checkedBy` initials + `checkedAt`) | `"issue"` (red/outstanding — "NEED INSTALL", "IN BOX", etc., text in `issue`).
- Paper "CC in the box" → `status: "done", checkedBy: "CC", source: "paper"`. In-app taps write `source: "app"` with full who+when stamps.
- Import of an array of these objects = multi-room import; same shape everywhere (Claude's REST writes, the in-app paste screen, exports).

Firestore mapping (quota-friendly): one doc per room at `rooms/{room}`, with `items` as a **map keyed by `key`** plus an `itemOrder` array — the whole hotel is ~180 docs (~5 KB each), so a full device sync costs ~180 reads, and one check-off is one field-path write (`items.gr600_2.status`), which merges cleanly with offline queues from other phones. Room-type templates live at `roomTypes/{type}` for the in-app "duplicate room" feature.

### 3.2 The loop (any future Claude session)

1. Austin photographs a paper page (or several) and uploads to Claude in chat.
2. Claude vision-reads it → produces the canonical JSON → echoes a one-line sanity summary per room ("Room 101, QQ Studio Connector, 31 items, 3 red, 1 room note — write it?").
3. On confirm, Claude writes via REST — no server, no secrets:
   - `POST https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=<WEB_API_KEY>` with `{"returnSecureToken":true}` → anonymous `idToken` (works because Anonymous auth is enabled; the API key is read from the app repo, where it lives publicly by design).
   - `POST https://firestore.googleapis.com/v1/projects/<PROJECT_ID>/databases/(default)/documents:batchWrite` with `Authorization: Bearer <idToken>` and Firestore typed values (Claude generates these mechanically from the JSON).
   - `GET …/documents/rooms/101` read-back to confirm.
4. The room appears on every crew phone within seconds (realtime listeners); offline phones get it on reconnect.

**Merge rule (important):** default import is *non-destructive* — per item, if the app already shows `done` and paper says open, the app value wins; paper `CC` stamps only fill items still `open` in the app. A full overwrite requires Austin explicitly saying "replace room 101". Re-importing the same page is idempotent (doc ID = room number).

### 3.3 Fallbacks (no REST dependency)

- **In-app Admin → "Import JSON"**: textarea accepting the exact same JSON (single room or array), client-side validation with a preview diff, then written via the Firebase SDK — works even offline (queued). This is the escape hatch if a session can't reach `googleapis.com`.
- **In-app manual editing**: add/edit room, add/remove/rename items, "New room from template" (picks a `roomTypes` template, e.g. all of Floor 3's King Studios in a minute), add floors. Covers requirement 3 without any Claude involvement.

---

## 4. FREE vs PRO packaging

### FREE tier — launch now, $0 total

GitHub Pages (public repo) + Firebase Spark + installable PWA + Triun navy theme & light theme + tap-to-initial check-offs + offline sync + Claude photo import + JSON paste import + room templates + print-friendly room sheet (browser print → PDF is free).

**The real limits, honestly:**

| Limit | Reality at H2SEP scale |
|---|---|
| Firestore Spark: 50K reads / 20K writes / 20K deletes/day, 1 GiB | ~180 room docs; full sync ≈ 180 reads/device; 8 crew ≈ 1.4K reads + a few hundred writes/day peak ≈ **<10% of quota**. Storage <2 MB. Not a real constraint. |
| No photo attachments | Cloud Storage requires Blaze for new projects — hard blocker on Spark (see §0). |
| `sh0t250.github.io/h2sep-checklist/` URL | Cosmetic only. QR code posted at the jobsite trailer solves distribution. |
| Not in app stores | Install = Add to Home Screen (Claude ships an in-app 3-step install walkthrough for iPhone/Android). Icon, full-screen, offline — indistinguishable from an app for this crew. |
| App code is public on GitHub | Contains zero secrets by design. Checklist *data* is not in the repo — it's in Firestore behind auth+rules (see §2 security note). |
| GitHub Pages soft limits (1 GB site, 100 GB/mo bandwidth) | The app is <2 MB. Irrelevant. |

### PRO add-ons — each optional, priced, with an honest verdict

| Add-on | Real cost | Friction | Verdict for a 4-month punch phase |
|---|---|---|---|
| **Custom domain** (e.g. `punch.triunce.com`) | **$0/yr if Triun already owns a domain** (just a DNS CNAME → `sh0t250.github.io` + one Pages setting; HTTPS auto via Let's Encrypt). New domain: ~$12/yr Namecheap (GoDaddy renewals run $20+). | 10 min. Note: changing the URL after launch means everyone re-adds the home-screen icon. | **Do it only if Triun owns a domain and cares about branding — then it's free. Otherwise skip.** |
| **Firebase Blaze + photo attachments** on deficient items | Card on file required. Realistic bill: **$0.00–$1.00/mo** — a US-region bucket gets 5 GB always-free; 1,000 punch photos compressed to ~250 KB = 0.25 GB. Claude sets a $5 budget alert during setup. | 5 min console upgrade; Claude ships the camera/attach UI. | **The one upgrade genuinely worth it** — photo evidence on red items is real value for punch/closeout. Flip it on when he asks for photos. |
| **Capacitor → Google Play** | $25 one-time, but **personal dev accounts must run a 14-day closed test with 12 testers before public release** — his crew may not even have 12 people. Plus Android Studio builds. | High | **Skip.** The PWA already puts an icon on every Android phone in 20 seconds. |
| **Capacitor → Apple App Store** | $99/yr + a Mac with Xcode or a cloud build service + App Review (utility apps for tiny private audiences get extra scrutiny) | Highest | **Skip.** iOS PWA install covers it. Revisit only if Triun wants a company-wide tool beyond H2SEP. |
| **Richer branded PDF exports** (per-floor punch report, signature blocks) | **Actually $0** — vendored jsPDF or print CSS, no service needed. It's Claude dev time, not money. | Low | Honest reclassification: this belongs on the **free roadmap**, not behind a price. |

**Bottom line recommendation:** launch the Free tier this week; add **Blaze photos** the day Austin asks for deficiency pictures (~$0–1/mo); use a **Triun subdomain if the company domain exists** (free); **no app stores** for a 4-month phase — the math and the 12-tester rule both kill it.

---

## 5. Why this beats Blink.ai / vibe-coding builders (fair take)

- **Cost over the phase:** builders run $20–50/mo subscriptions, and per-seat tools (Glide/AppSheet ≈ $5–10/user/mo; dedicated construction punch apps like Fieldwire/PlanGrid ≈ $29–54/user/mo) would cost a crew of 8 roughly **$160–$1,700 over four months**. This stack is $0.
- **Offline is the hard requirement**, and it's the thing builder platforms do worst — most web-app builders have no offline story at all; a hotel under construction is a dead zone daily, not occasionally. Firestore's IndexedDB persistence + queued writes is a first-class, battle-tested implementation.
- **Ownership:** the code lives in Austin's GitHub, the data in his Google account, exportable any time. When the hotel opens, archive the repo — nothing expires, no subscription to cancel, no export ransom.
- **Maintenance is conversational:** Claude already holds the H2SEP context (room types, item codes, Triun branding, the QC tracker conventions) and edits the actual code on request — a builder's AI works from zero context inside its own walled garden.
- **Fair credit to the builders:** they'd get a first prototype up faster, include polished user management, and offer human support. If this were a multi-project, long-lived product with non-technical admins and no Claude in the loop, a builder or Fieldwire would be a defensible buy. For one fixed-scope 4-month punch effort, it isn't.

---

## 6. Maintenance story — two lanes

**Data lane (no deploy, live in seconds):** "add the floor-4 rooms", "add GR-700 luggage rack to all King Studios", "mark 212's connecting door resolved" → Austin messages Claude (or uses the in-app admin) → Claude writes Firestore via REST → every phone updates via realtime listeners; offline phones catch up on reconnect. No code change, no PR, no click from Austin.

**Code lane (UI/features, ~2 minutes to live):** Austin messages Claude ("make the initials bigger", "add a floor progress bar") → session attaches `SH0T250/h2sep-checklist` (`add_repo`) → Claude branches, edits, opens a PR with before/after notes → Austin taps **Merge** (or says "merge it") → Pages auto-builds `main` in ~30–60 s → crew phones show the "Update available — tap to refresh" banner next time they open the app with signal. Rollback is a one-message revert. Room *data* is untouched by deploys — the two lanes never collide.

---

### Sources (verified 2026-07-31)
- Repo privacy/default branch: GitHub API for `SH0T250/Claude` (`"visibility":"private"`, `"default_branch":"claude/cool-curie-idil5"`, `"has_pages":false`)
- `enablement` token requirement: [actions/configure-pages action.yml](https://github.com/actions/configure-pages/blob/main/action.yml), [issue #40 "Resource not accessible by integration"](https://github.com/actions/configure-pages/issues/40), [GITHUB_TOKEN permissions docs](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/controlling-permissions-for-github_token)
- Spark Firestore quotas: [Firebase pricing](https://firebase.google.com/pricing), [Firestore usage & limits](https://firebase.google.com/docs/firestore/quotas)
- Storage requires Blaze (Oct 2024 change): [Firebase Storage changes FAQ](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)
- Play $25 + 12-tester/14-day closed test; Apple $99/yr: [Play Console help](https://support.google.com/googleplay/android-developer/answer/6112435), [personal account requirements](https://appswap.co/blog/google-play-personal-developer-account-requirements), [Choicely 2026 guide](https://www.choicely.com/tutorials/how-to-create-a-google-play-developer-account-for-your-organization)
- gh-pages auto-enable (unreliable, treated as bonus only): [community discussion](https://github.com/orgs/community/discussions/51268), [frankel.ch Pages refresher](https://blog.frankel.ch/refresher-github-pages/)