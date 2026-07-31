// Service worker: precache the full app shell (incl. vendored Firebase) so the
// app cold-boots with zero network. Data offline-ness is Firestore's job.
// Bump VERSION on every deploy — it busts the old cache and triggers the
// in-app "Update available" banner.
const VERSION = 'h2sep-v1.4.0';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/config.js',
  './js/screens.js',
  './js/seed.js',
  './js/sheets.js',
  './js/store.js',
  './js/util.js',
  './firebase/firebase-app.js',
  './firebase/firebase-auth.js',
  './firebase/firebase-firestore.js',
  './img/tmark.png',
  './img/logo-full-light.png',
  './img/logo-full-white.png',
  './img/logo-full-dark.png',
  './icons/favicon-48.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Cache-first for same-origin shell files; network for everything else
// (Firestore/auth traffic never touches the SW cache).
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cached = await caches.match(e.request, { ignoreSearch: url.pathname.endsWith('/') });
    if (cached) return cached;
    try {
      const resp = await fetch(e.request);
      // Runtime-cache paper-sheet photos so viewed sheets work offline.
      if (resp.ok && url.pathname.includes('/sheets/')) {
        const c = await caches.open(VERSION);
        c.put(e.request, resp.clone());
      }
      return resp;
    } catch (err) {
      // Offline navigation to an uncached URL -> serve the app shell.
      if (e.request.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      throw err;
    }
  })());
});
