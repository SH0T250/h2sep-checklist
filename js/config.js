// Firebase web config. This object is PUBLIC BY DESIGN — security lives in
// Firestore rules, not in hiding these values.
//
// While this is null the app runs in DEMO MODE: fully working UI backed by
// this device's local storage only (no cross-phone sync). After the Firebase
// project is created, paste the config object here and redeploy.
export const firebaseConfig = {
  apiKey: "AIzaSyAMRImRm7n7DsDACwH_71gChJTKRkaciT8",
  authDomain: "h2sep-checklist.firebaseapp.com",
  projectId: "h2sep-checklist",
  storageBucket: "h2sep-checklist.firebasestorage.app",
  messagingSenderId: "820802916628",
  appId: "1:820802916628:web:bb68175f726f1119f4b201",
  measurementId: "G-3GQLPJ1VXS"
};

export const PROJECT_ID = 'h2sep';
// Must match sw.js VERSION ('h2sep-v' + this) — the service worker verifies
// the pair at install time and refuses mismatched (mid-deploy) builds.
export const APP_VERSION = '1.18.3';

// Rooms that offer the 3D exhibit. Geometry is per-room off A555 (width,
// depth, handedness and whether there is a GR-3 connecting door), so a room
// only appears here once its own dimensions are in ROOM_GEOM — never because a
// sibling looked close enough.
//
//   QQ Studio Connector  101 103 · 215 236 · 336 · 401 403 436
//   QQ Studio            105 107 109 111 113 115
//   QQ Wide              201 301
//   QQ Extended          230 232 · 330 332 · 430 432
//
// The King family (King Studio / Connector / Acc Mod) is NOT here: A550 gives
// it a 29'-0" clear depth against the QQ's 36'-5" and a single king bed, so it
// needs its own model rather than a relabelled QQ shell.
export const MODEL_ROOMS = [
  '101', '103', '105', '107', '109', '111', '113', '115',
  '201', '203', '205', '207', '209', '211', '213', '215',
  '228', '230', '232', '234', '236', '301', '303', '305',
  '307', '309', '311', '313', '315', '328', '330', '332',
  '334', '336', '401', '403', '405', '407', '409', '411',
  '413', '415', '428', '430', '432', '434', '436',
];

export const DEMO_PIN = '6621';
