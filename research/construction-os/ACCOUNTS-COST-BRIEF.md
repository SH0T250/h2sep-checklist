# Accounts and cost brief (nothing gets signed up without Austin's OK)

Prepared 2026-08-17. Every price below was pulled from the vendor's live pricing page on this date.
Sources: https://firebase.google.com/pricing · https://cloudinary.com/pricing · https://aws.amazon.com/s3/pricing/

## Recommendation in one line

One Firebase project on the Blaze (pay as you go) plan, owned by austinjjones210@gmail.com,
with a $25 budget alert. Expected real bill at this project's usage: **$0 to $5 per month.**

## Why Firebase

1. The live crew data is already in Firestore. Same backbone means the migration is a copy,
   not a translation, and the current app keeps running untouched until cutover.
2. Firestore's offline persistence plus real-time listeners is exactly the Section 9 requirement
   (changes on one phone appear on others in seconds; no service still works, syncs later).
3. Auth, Hosting, database, and file storage in one console, one bill, one owner.

## The cost math at H2SEP usage

Firebase Blaze includes free daily allowances before any charge:

| Service | Free allowance (Blaze) | H2SEP expected usage | Expected charge |
|---|---|---|---|
| Firestore reads | 50,000/day | A crew day today peaks well under 20,000 (296 docs, per-floor listeners, ~10 users) | $0 most days |
| Firestore writes | 20,000/day | Busiest recorded day so far is hundreds, not thousands | $0 |
| Firestore storage | 1 GiB | Entire live dataset today is under 25 MB | $0 |
| Authentication | 50,000 monthly active users | Under 50 users total | $0 |
| Hosting | 10 GB stored, 360 MB/day transfer | App bundle a few MB; 10 to 50 users | $0, pennies on heavy days |
| Cloud Storage (photos, later) | 5 GB stored, 100 GB/month download | ~10 GB by closeout (est. 115 rooms x ~20 photos x ~3 MB compressed + common areas) | ~$0.13/month at 10 GB ($0.026/GB past free) |

Worst realistic month with the photo module running hard: still single-digit dollars.
A budget alert at $25 gets set on day one so a surprise is impossible.

## Photo storage comparison (Section 8 decision)

| Option | Price reality | Verdict |
|---|---|---|
| **Firebase Cloud Storage** (recommended) | 5 GB free, then $0.026/GB-month; downloads free to 100 GB/month | Same console, same auth and security rules as the app, offline-friendly SDK, ~$0.13/month at 10 GB |
| Cloudinary | Free: 25 credits (1 credit = 1 GB storage OR 1,000 transformations OR 1 GB bandwidth), 3 users; first paid tier $99/month | Free tier could work early but couples storage to transformation credits, and the paid step is 4x the whole budget cap. No. |
| AWS S3 | $0.023/GB-month + $0.09/GB egress past 100 GB free; requests billed separately | Cheap and solid but adds a second vendor, second console, second bill, and IAM complexity for zero benefit at this scale. No. |

## What Austin will own (when he says go)

1. Google account: austinjjones210@gmail.com (already exists).
2. A new Firebase project (suggested id: `triun-h2sep`) created while signed in as that account,
   so Owner is Austin, nobody else. Billing: his card on the Blaze plan, $25 budget alert.
3. The existing `h2sep-checklist` Firebase project: Austin needs Owner access transferred there
   too (it currently runs the live crew app). Plan: add his account as Owner, keep the app
   running untouched, migrate data only at approved cutover.
4. Optional custom domain (his call, Section 14 item 7): roughly $12 per year at a registrar,
   plus $0 to connect to Firebase Hosting. Not required; the app works on the free
   `<project>.web.app` address from day one.

## Signup walkthrough (for when Austin approves, step by step, no jargon)

1. Open https://console.firebase.google.com signed in as austinjjones210@gmail.com.
2. Add project, name it `triun-h2sep`, decline Analytics (not needed).
3. Project settings > Usage and billing > Modify plan > Blaze. Add card. Set budget alert: $25.
4. Build > Authentication > Get started > enable Email/Password (invites run on this).
5. Build > Firestore Database > Create database > production mode > region `us-central1`
   (or `us-south1` Dallas if offered; closest to Eagle Pass).
6. Build > Storage > Get started (photo-ready from day one, per Section 8).
7. Send me the project id. I take it from there; you approve each next step.

## License note

The new platform is a fresh codebase. OpenConstructionERP contributes ideas and structure only
(module registry, one module template, validation before writes, records linked to locations),
per the build prompt Section 4.4. No AGPL code is copied, so no AGPL obligations attach.
