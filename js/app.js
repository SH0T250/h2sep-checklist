// Boot + hash router + service-worker glue.
import * as store from './store.js';
import * as screens from './screens.js';
import { closeSheets } from './sheets.js';
import { toast, platform } from './util.js';

const root = document.getElementById('app');

// Capture Android install prompt before anything else.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__installPrompt = e;
});

function route() {
  const h = location.hash || '#/';
  const parts = h.replace(/^#\//, '').split('?')[0].split('/').filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams((h.split('?')[1] || '')));

  // Onboarding gate: no initials yet -> welcome (except explicit install page).
  const u = store.getUser();
  if (parts[0] !== 'welcome' && parts[0] !== 'install' && !u && !sessionStorage.getItem('h2sep-viewonly')) {
    return { screen: 'welcome' };
  }
  if (parts.length === 0) return { screen: 'home' };
  if (parts[0] === 'welcome') return { screen: 'welcome' };
  if (parts[0] === 'install') return { screen: 'install' };
  if (parts[0] === 'floor') return { screen: 'floor', floor: parts[1] || '1' };
  if (parts[0] === 'room') return { screen: 'room', number: parts[1] };
  if (parts[0] === 'room-new') return { screen: 'room-new', floor: parts[1] || '1', edit: query.edit || null };
  if (parts[0] === 'settings') return { screen: 'settings' };
  return { screen: 'home' };
}

let current = null;

function render() {
  const r = route();
  const sameScreen = current && JSON.stringify(current) === JSON.stringify(r);
  const scrollY = sameScreen ? window.scrollY : 0;
  current = r;
  switch (r.screen) {
    case 'welcome':  screens.renderWelcome(root); break;
    case 'install':  screens.renderWelcome(root, { installOnly: true }); break;
    case 'floor':    screens.renderFloor(root, r.floor); break;
    case 'room':     screens.renderRoom(root, r.number); break;
    case 'room-new': screens.renderRoomNew(root, r.floor, r.edit); break;
    case 'settings': screens.renderSettings(root); break;
    default:         screens.renderHome(root);
  }
  if (sameScreen) window.scrollTo(0, scrollY);
}

window.addEventListener('hashchange', () => { closeSheets(); render(); });

// Re-render on data changes; coalesce bursts.
let renderQueued = false;
store.subscribe(() => {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; render(); });
});

// Post-sync surprise: someone un-checked or restamped an item we can see.
let lastSurprise = 0;
store.onRemoteSurprise(({ room, itemId, kind, before, after }) => {
  const now = Date.now();
  if (now - lastSurprise < 5000) return; // coalesce
  lastSurprise = now;
  const it = before || {};
  if (kind === 'unchecked') {
    toast(`Heads up: ${it.code || 'an item'} in Room ${room} was un-checked`);
  } else {
    toast(`Heads up: ${it.code || 'an item'} in Room ${room} is now marked by ${after.initials}`);
  }
  const rowEl = document.querySelector(`.item-row[data-item="${CSS.escape(itemId)}"]`);
  if (rowEl) { rowEl.classList.add('flash'); setTimeout(() => rowEl.classList.remove('flash'), 500); }
});

// Sync-status toast when a queue drains.
let wasPending = 0;
store.subscribe(() => {
  const p = store.pendingCount();
  if (wasPending > 0 && p === 0 && store.isOnline()) toast('All changes synced');
  wasPending = p;
});

// ---- Service worker: register + update banner ----
async function initSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    // First-ever install has no controller; its claim must NOT reload the page
    // (it would wipe a half-typed onboarding form).
    const hadController = !!navigator.serviceWorker.controller;
    const reg = await navigator.serviceWorker.register('./sw.js');

    function askPrefetch() {
      navigator.serviceWorker.controller?.postMessage({ type: 'PREFETCH_SHEETS' });
    }
    function showUpdateBanner() {
      let b = document.getElementById('update-banner');
      if (b) return;
      b = document.createElement('button');
      b.id = 'update-banner';
      b.textContent = 'Update available — tap to refresh';
      // Resolve the waiting worker AT CLICK TIME (a newer one may have landed).
      b.addEventListener('click', () => reg.waiting?.postMessage({ type: 'SKIP_WAITING' }));
      document.body.appendChild(b);
    }
    if (reg.waiting && navigator.serviceWorker.controller) showUpdateBanner();
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdateBanner();
        // A failed download must not be silent — the fleet would freeze on an
        // old version with everyone believing they're current.
        if (nw.state === 'redundant' && navigator.serviceWorker.controller && !reg.waiting) {
          toast('Update failed to download — will retry automatically');
        }
      });
    });
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) { askPrefetch(); return; }
      reloading = true;
      location.reload();
    });

    // Long-resident standalone apps never navigate — check for updates when
    // the app comes back to the foreground or back into signal.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
    window.addEventListener('online', () => {
      reg.update().catch(() => {});
      askPrefetch();
    });
    // Kick a sheet download pass now (no-op if everything's already cached).
    if (navigator.serviceWorker.controller) askPrefetch();
    else navigator.serviceWorker.ready.then(askPrefetch);
  } catch (e) { console.warn('SW registration failed', e); }
}

store.init().then(() => { render(); initSW(); });
render(); // first paint immediately (loading state)
