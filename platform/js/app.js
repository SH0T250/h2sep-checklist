// H2SEP Platform boot: small stable core reads the module registry (ERP idea,
// our code). Modules: tracking (module one), bim (module two). Zero core edits
// when a module is added; that is the upgrade-safe contract to prove later.

import { loadStore } from './core/store.js';
import { Registry, startRouter } from './core/registry.js';
import { ic, el, esc } from './core/ui.js';
import { trackingModule, identityGate } from './modules/tracking/module.js';
import { bimModule } from './modules/bim/module.js';
import { directoryModule } from './modules/directory/module.js';
import { firebaseConfig } from './config.js';

// Rooms with their own CORRECT geometry in the viewer (D7). The whole QQ family
// is drawn from A555; the King family keeps the honest hard-stop until its own
// geometry ships. king-studio.html exists but is a photo exhibit, not the tagged viewer.
const MODEL_ROOMS = ['101', '103', '105', '107', '109', '111', '113', '115'];

const store = await loadStore();

// Attach Firebase when configured. The bundled artifact preview cannot reach
// external hosts (its page blocks them), so it stays in local mode by flag.
if (firebaseConfig && !window.__H2SEP_NO_BACKEND) {
  import('./core/firebase-backend.js')
    .then(({ FirebaseBackend }) => store.attachBackend(new FirebaseBackend(firebaseConfig)))
    .catch(err => { store.status.message = 'Backend unavailable: ' + (err.message || err); store._emit(); });
}

const registry = new Registry();
registry.register(trackingModule(store));
registry.register(directoryModule());   // module three: contacts + sub assignments
registry.register(bimModule());

const ctx = { store, registry, modelRooms: MODEL_ROOMS };

const app = document.getElementById('app');

function connPill(st) {
  if (st.mode === 'local') return '<span class="offline-pill">LOCAL · SYNC WAITING ON RULES</span>';
  if (st.message) return `<span class="offline-pill">${esc(st.message)}</span>`;
  if (!st.ready) return '<span class="offline-pill">SIGNING IN…</span>';
  if (st.pending > 0) return `<span class="offline-pill">SYNCING · ${st.pending} QUEUED</span>`;
  if (st.fromCache) return '<span class="offline-pill">OFFLINE · CACHED</span>';
  return '<span class="live-pill"><i class="dot"></i>LIVE · SYNCED</span>';
}

function navLink(n, hash, mobile) {
  const active = n.path === '#/' ? (hash === '#/' || hash === '') : hash.startsWith(n.path);
  return `<a href="${n.path}" class="${active ? 'active' : ''}">${ic(n.icon)}<span>${esc(n.label)}</span>${!mobile && n.count ? `<span class="ct">${n.count}</span>` : ''}</a>`;
}

function renderShell(hash, renderScreen) {
  const u = store.user;
  const entries = registry.navEntries();
  const main = entries.filter(n => !n.section);
  const modelSect = entries.filter(n => n.section === 'Model');
  const mobilePicks = ['#/', '#/rooms', '#/contacts', '#/bim', '#/activity'];

  app.innerHTML = '';
  app.append(el(`<div class="shell">
    <aside class="side">
      <div class="brand"><img src="${window.__H2SEP_LOGO || 'img/triun-logo.png'}" alt="Triun Construction and Engineering"/></div>
      <div class="proj"><div class="pcode">H2SEP · FLOOR 1 LIVE</div><div class="pname">Home2 Suites · Eagle Pass</div><div class="conn">${connPill(store.status)}</div></div>
      <nav class="nav">
        ${main.map(n => navLink(n, hash)).join('')}
        <div class="sect">Model</div>
        ${modelSect.map(n => navLink(n, hash)).join('')}
      </nav>
      <div class="me">
        <span class="av">${esc(u?.initials || '?')}</span>
        <span><span class="mn">${esc(u?.name || 'Set your initials')}</span><br/><span class="mr">${u ? esc(u.company || 'Initials on every check') : 'Required to check items'}</span></span>
        <button class="sw" data-id-switch>${u ? 'switch' : 'set up'}</button>
      </div>
    </aside>
    <main class="main"></main>
    <nav class="navmob">${entries.filter(n => mobilePicks.includes(n.path)).map(n => navLink(n, hash, true)).join('')}</nav>
  </div>`));

  const mobPill = el(`<div class="connmob">${connPill(store.status)}</div>`);
  app.append(mobPill);
  app.querySelectorAll('[data-id-switch]').forEach(b => b.addEventListener('click', () => identityGate(ctx)));
  const mainEl = app.querySelector('.main');
  if (renderScreen) mainEl.append(renderScreen());
  else mainEl.append(el(`<div class="coming"><b>Not found</b><span>That screen does not exist. Use the menu.</span></div>`));
  if (!store.user && !sessionStorage.getItem('h2sep-id-prompted')) {
    sessionStorage.setItem('h2sep-id-prompted', '1');
    identityGate(ctx);
  }
}

startRouter(registry, ctx, renderShell);
