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
export const APP_VERSION = '1.9.0';

// Rooms that have a built 3D exhibit (room-3d.html). Room 101 only, by
// standing ruling — the 🧊 button stays hidden everywhere else.
export const MODEL_ROOMS = ['101'];

// Demo-mode admin PIN (live mode verifies against Firestore config doc).
export const DEMO_PIN = '6621';
