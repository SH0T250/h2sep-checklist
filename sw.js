// Service worker: precache the full app shell (incl. vendored Firebase) so the
// app cold-boots with zero network. Data offline-ness is Firestore's job.
// Bump VERSION on every deploy — it busts the old cache and triggers the
// in-app "Update available" banner. VERSION must equal 'h2sep-v' + APP_VERSION
// in js/config.js — install verifies this to defeat CDN mixed-version races.
const VERSION = 'h2sep-v1.8.0';
// Paper-sheet photos live in their own PERMANENT cache — never wiped by app
// updates. Only room JPGs under /sheets/ may enter it (index.json stays in the
// versioned shell cache so it can never be shadowed by a stale copy).
const SHEETS_CACHE = 'h2sep-sheets';
// Plan-snippet reference images (./refs/*.png) get the same permanent-cache
// treatment — they must survive app updates so refs work in dead zones.
// refs-101.json itself stays in the versioned shell cache (never shadowed).
const REFS_CACHE = 'h2sep-refs';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/config.js',
  './js/refs.js',
  './js/screens.js',
  './js/seed.js',
  './js/sheets.js',
  './js/store.js',
  './js/theme.js',
  './js/util.js',
  './refs/refs-101.json',
  './firebase/firebase-app.js',
  './firebase/firebase-auth.js',
  './firebase/firebase-firestore.js',
  './img/tmark.png',
  './img/logo-full-light.png',
  './img/logo-full-white.png',
  './img/logo-full-dark.png',
  './sheets/index.json',
  './icons/favicon-48.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    // cache:'no-cache' revalidates at the CDN so a phone's HTTP cache can't
    // assemble a mixed-version shell (old JS under a new version name).
    await c.addAll(SHELL.map((u) => new Request(u, { cache: 'no-cache' })));
    // Version-stamp check: if the CDN is mid-deploy and served an old
    // js/config.js, abort install — the browser retries later and gets a
    // consistent build. Never ship a Frankenstein cache.
    const cfg = await (await c.match('./js/config.js')).text();
    const want = "APP_VERSION = '" + VERSION.replace('h2sep-v', '') + "'";
    if (!cfg.includes(want)) {
      await caches.delete(VERSION);
      throw new Error('mixed-version deploy detected — install retried later');
    }
  })());
});

self.addEventListener('activate', (e) => {
  // Keep activation INSTANT — never block navigations behind downloads.
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION && k !== SHEETS_CACHE && k !== REFS_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Best-effort download of all known paper sheets into the permanent cache.
// Triggered by the page (on load and on regaining signal) — NOT by activate.
async function prefetchSheets() {
  const shell = await caches.open(VERSION);
  const idxResp = (await shell.match('./sheets/index.json')) || (await fetch('./sheets/index.json').catch(() => null));
  if (!idxResp) return;
  let idx;
  try { idx = await idxResp.clone().json(); } catch { return; }
  const c = await caches.open(SHEETS_CACHE);
  for (const room of idx) {
    const req = new Request('./sheets/' + room + '.jpg');
    if (await c.match(req)) continue;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10_000); // weak signal: give up fast
      const resp = await fetch(req, { signal: ctrl.signal });
      clearTimeout(timer);
      if (resp.ok && resp.status === 200) await c.put(req, resp);
    } catch (_) { /* no/weak signal — page retriggers when back online */ }
  }
}

// Best-effort download of every plan-snippet image named in refs-101.json
// into the permanent refs cache. Same trigger discipline as sheets.
async function prefetchRefs() {
  const shell = await caches.open(VERSION);
  const idxResp = (await shell.match('./refs/refs-101.json')) || (await fetch('./refs/refs-101.json').catch(() => null));
  if (!idxResp) return;
  let idx;
  try { idx = await idxResp.clone().json(); } catch { return; }
  // Walk the whole index for `snippet` file names — resilient to the exact
  // nesting the refs pipeline emits (room->code->refs[] or flat code map).
  const files = new Set();
  (function walk(v) {
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (!v || typeof v !== 'object') return;
    if (typeof v.snippet === 'string' && v.snippet) files.add(v.snippet.replace(/^(\.\/)?(refs\/)?/, ''));
    Object.values(v).forEach(walk);
  })(idx);
  const c = await caches.open(REFS_CACHE);
  for (const f of files) {
    const req = new Request('./refs/' + f);
    if (await c.match(req)) continue;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10_000); // weak signal: give up fast
      const resp = await fetch(req, { signal: ctrl.signal });
      clearTimeout(timer);
      if (resp.ok && resp.status === 200) await c.put(req, resp);
    } catch (_) { /* no/weak signal — page retriggers when back online */ }
  }
}

self.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data.type === 'PREFETCH_SHEETS') {
    e.waitUntil(prefetchSheets().catch(() => {}));
    e.waitUntil(prefetchRefs().catch(() => {}));
  }
});

// Fetch: shell files from THIS version's cache; sheet JPGs from the permanent
// cache; everything else network (Firestore/auth traffic never touches us).
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const isSheetJpg = /\/sheets\/[^/]+\.jpg$/.test(url.pathname);
  // Snippet images only — ./refs/refs-101.json stays in the versioned shell.
  const isRefImg = /\/refs\/[^/]+\.(png|jpe?g|webp)$/.test(url.pathname);
  const isPermanent = isSheetJpg || isRefImg;
  e.respondWith((async () => {
    const cacheName = isSheetJpg ? SHEETS_CACHE : (isRefImg ? REFS_CACHE : VERSION);
    const c = await caches.open(cacheName);
    const cached = await c.match(e.request, { ignoreSearch: !isPermanent });
    if (cached) return cached;
    try {
      const resp = await fetch(e.request);
      if (isPermanent && resp.ok && resp.status === 200) {
        try { await c.put(e.request, resp.clone()); } catch (_) { /* quota — still serve */ }
      }
      return resp;
    } catch (err) {
      // Offline navigation to an uncached URL -> serve the app shell.
      if (e.request.mode === 'navigate') {
        const shell = await c.match('./index.html');
        if (shell) return shell;
      }
      throw err;
    }
  })());
});
