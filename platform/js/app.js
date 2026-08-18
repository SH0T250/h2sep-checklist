// H2SEP Platform boot: small stable core reads the module registry (ERP idea,
// our code). Modules: tracking (module one), bim (module two). Zero core edits
// when a module is added; that is the upgrade-safe contract to prove later.

import { loadStore } from './core/store.js';
import { Registry, startRouter } from './core/registry.js';
import { ic, el, esc } from './core/ui.js';
import { trackingModule, identityGate } from './modules/tracking/module.js';
import { bimModule } from './modules/bim/module.js';

const MODEL_ROOMS = ['101', '103', '105']; // slice rooms with their own geometry (all QQ family)

const store = await loadStore();
const registry = new Registry();
registry.register(trackingModule());
registry.register(bimModule());

const ctx = { store, registry, modelRooms: MODEL_ROOMS };

const app = document.getElementById('app');

function navLink(n, hash, mobile) {
  const active = n.path === '#/' ? (hash === '#/' || hash === '') : hash.startsWith(n.path);
  return `<a href="${n.path}" class="${active ? 'active' : ''}">${ic(n.icon)}<span>${esc(n.label)}</span>${!mobile && n.count ? `<span class="ct">${n.count}</span>` : ''}</a>`;
}

function renderShell(hash, renderScreen) {
  const u = store.user;
  const entries = registry.navEntries();
  const main = entries.filter(n => !n.section);
  const modelSect = entries.filter(n => n.section === 'Model');
  const mobilePicks = ['#/', '#/rooms', '#/bim', '#/activity'];

  app.innerHTML = '';
  app.append(el(`<div class="shell">
    <aside class="side">
      <div class="brand"><img src="${window.__H2SEP_LOGO || 'img/triun-logo.png'}" alt="Triun Construction and Engineering"/></div>
      <div class="proj"><div class="pcode">H2SEP · SLICE BUILD</div><div class="pname">Home2 Suites · Eagle Pass</div></div>
      <nav class="nav">
        ${main.map(n => navLink(n, hash)).join('')}
        <div class="sect">Model</div>
        ${modelSect.map(n => navLink(n, hash)).join('')}
      </nav>
      <div class="me">
        <span class="av">${esc(u?.initials || '?')}</span>
        <span><span class="mn">${esc(u?.name || 'Set your initials')}</span><br/><span class="mr">${u ? 'Initials on every check' : 'Required to check items'}</span></span>
        <button class="sw" data-id-switch>${u ? 'switch' : 'set up'}</button>
      </div>
    </aside>
    <main class="main"></main>
    <nav class="navmob">${entries.filter(n => mobilePicks.includes(n.path)).map(n => navLink(n, hash, true)).join('')}</nav>
  </div>`));

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
