# H2SEP Room Checklists

A phone-first, offline-capable room checklist PWA for hotel FF&E install / punch
work. One checklist per room; tapping an item's box stamps it with your initials
(like initialing a paper sheet); issues get red flags with quick-pick notes; a
starred note line covers room-level problems. Works with no signal — changes
queue on the phone and sync live to every other phone when coverage returns.

Built and maintained by Claude for Triun Construction & Engineering.

## Stack

- Vanilla JS single-page app, no build step; hash routing.
- Firebase Cloud Firestore (offline persistence + realtime listeners), SDK
  vendored under `firebase/` so the app cold-boots with zero network.
- Installable PWA (`manifest.webmanifest` + `sw.js` versioned precache).
  On iPhone, installing to the Home Screen is required before checking items —
  installed web apps get durable storage that Safari tabs don't.
- Until `js/config.js` has a Firebase config, the app runs in demo mode
  (device-local data) so the UI can be previewed end to end.

## Data & security

No checklist data lives in this repository. Data sits in Firestore behind
security rules: all access requires (anonymous) sign-in, writes are
shape-validated, room documents can't be hard-deleted, and admin operations
require a PIN verified server-side. The `firebaseConfig` in `js/config.js` is
public by design — Google's web config is not a secret; the rules are the
boundary.

## Deploys

Static hosting (GitHub Pages, deploy-from-branch `main`). Every push to `main`
redeploys in about a minute; the service worker shows an "Update available"
banner on crew phones the next time they open the app with signal.
