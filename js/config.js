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
export const APP_VERSION = '1.11.0';

// Rooms that offer the 3D exhibit. The geometry is Room 101's (QQ Wide
// Connecting) and every QQ Studio Connector shares the same 40-line package,
// so it serves as the typical for its siblings — the exhibit says so on any
// room other than 101. Other room types get the button when their own model
// is built.
export const MODEL_ROOMS = ['101', '103', '215', '236', '336', '401', '403', '436'];

// Demo-mode admin PIN (live mode verifies against Firestore config doc).
export const DEMO_PIN = '6621';
