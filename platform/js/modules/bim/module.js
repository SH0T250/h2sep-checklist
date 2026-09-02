// 3D BIM module (module two in the registry, per ruling D7): its own entry in the
// left section menu; every room opens its CORRECT per-room geometry, exactly the
// first build's exhibit (A555 dims, mirroring by reflection, connecting-door logic).
// Rooms without their own model keep the honest hard-stop; never a relabeled shell.

import { ic, el, esc } from '../../core/ui.js';

function viewerFrame(no) {
  // Hosted: room3d.html reads ?room=. Artifact bundle: the srcdoc viewer reads the
  // iframe name ("h2sep-room-<no>") because srcdoc frames have no query string.
  const src = window.__H2SEP_VIEWER_SRCDOC
    ? '' : `room3d.html?room=${encodeURIComponent(no)}&view=iso`;
  const f = el(`<iframe title="Room ${esc(no)} 3D model" name="h2sep-room-${esc(no)}" loading="lazy"></iframe>`);
  if (window.__H2SEP_VIEWER_SRCDOC) f.srcdoc = window.__H2SEP_VIEWER_SRCDOC;
  else f.src = src;
  return f;
}

function renderHub(ctx) {
  const { store, modelRooms } = ctx;
  // Floor 1 only, per Austin 2026-09-02: "Only show 3d bim for 1st floor as
  // its already completed." Floors 2 to 4 have no models yet and are not listed.
  const floorOneRooms = store.guestRooms().filter(r => Number(r.floor) === 1).map(r => r.number);
  const upperRooms = store.guestRooms().filter(r => Number(r.floor) > 1).length;
  const root = el(`<div>
    <div class="pagehead"><h1 class="h1">3D BIM</h1>
      <span class="sub">floor 1 · per-room geometry from the architect's dimensions · locations stylized, not shop drawings</span></div>
    <section class="card bimlist">
      <div class="card-head"><h2>Floor 1 room models</h2><span class="card-cap">each room renders its own geometry, never a shared shell</span></div>
      <div class="rows"></div>
    </section>
    <section class="card" style="margin-top:14px"><div class="card-head"><h2>Not modeled yet</h2><span class="card-cap">honest hard-stop, per standing ruling</span></div>
      <div class="coming" style="padding:20px">${ic('cube')}<b>King family, One Bedroom, and QQ Acc have no model</b>
      <span>A550 gives the King Studio its own 29 ft clear depth and working wall, so it gets its own geometry in the Blender pipeline, never a relabeled QQ shell. Until then those rooms show this stop instead of wrong geometry.</span></div>
    </section>
    ${upperRooms ? `<p class="card-cap" style="margin-top:14px">Floors 2 to 4 (${upperRooms} rooms) are live on the checklists and have no 3D models yet; they are not listed here.</p>` : ''}
  </div>`);
  const rows = root.querySelector('.rows');
  for (const no of floorOneRooms) {
    const has = ctx.modelRooms.includes(no);
    const doc = store.getDoc(no);
    rows.append(el(`<div class="mrow">
      <span class="cube">${ic('cube')}</span>
      <span style="flex:1"><b class="mono" style="font-size:15px">${esc(no)}</b>
        <span style="color:var(--muted);font-size:12.5px;margin-left:8px">${esc(doc.typeLabel || '')}</span></span>
      ${has
        ? `<a class="btn" href="#/bim/${esc(no)}">${ic('cube')}Open model</a>`
        : `<span class="chip ns sm">NO MODEL YET</span>`}
    </div>`));
  }
  return root;
}

function renderRoomModel(ctx, { no }) {
  const { store, modelRooms } = ctx;
  const doc = store.getDoc(no);
  const root = el(`<div>
    <div class="pagehead">
      <button class="icon-btn" data-back aria-label="Back">${ic('back')}</button>
      <div><h1 class="h1">Room ${esc(no)} · 3D</h1>
      <div class="sub">${esc(doc?.typeLabel || '')} · tap an object for its info card · TAGS chip toggles labels</div></div>
      <span class="spacer"></span>
      ${doc ? `<a class="btn" href="#/room/${esc(no)}">${ic('door')}Checklist</a>` : ''}
    </div>
    <div class="viewer-wrap"></div>
  </div>`);
  root.querySelector('[data-back]').addEventListener('click', () => { history.length > 1 ? history.back() : location.hash = '#/bim'; });
  const wrap = root.querySelector('.viewer-wrap');
  if (!modelRooms.includes(no)) {
    wrap.replaceWith(el(`<section class="card"><div class="coming">${ic('cube')}<b>NO 3D MODEL FOR ROOM ${esc(no)} YET</b>
      <span>This room type needs its own geometry before it renders here. Standing ruling: never another room's shell.</span></div></section>`));
  } else {
    wrap.append(viewerFrame(no));
  }
  return root;
}

export function bimModule() {
  return {
    id: 'bim',
    name: '3D BIM',
    nav: [{ path: '#/bim', label: '3D BIM', icon: 'cube', section: 'Model' }],
    routes: [
      { match: /^#\/bim$/, render: renderHub },
      { match: /^#\/bim\/(?<no>[^?]+)/, render: renderRoomModel },
    ],
  };
}
