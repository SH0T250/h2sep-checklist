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

// Floor 1 assembled, platform/floor3d.html: every space A100 gives, in its
// measured place, painted live from data/floor1-staged.json. Fifty are drawn -
// the 16 guest rooms, the corridor and every common area, back of house
// included - and the pool deck is an honest hard stop because it is not on A100
// at all.
//
// Two ways it can run, and NEITHER of them is a blank frame:
//   hosted     - the file is beside index.html, so a relative src works and the
//                scene fetches its own status data.
//   packaged   - the single-file artifact has no relative URLs to fetch, so the
//                bundler must inline BOTH the page (window.__H2SEP_FLOOR_SRCDOC)
//                and the checklist state the page would otherwise fetch
//                (window.__H2SEP_FLOOR_DATA, which floor3d.html prefers over its
//                own fetch). Until platform/tools/build-artifact.mjs inlines
//                them, the bundle shows the hard stop below and says exactly
//                what is missing. A silent empty iframe is the one outcome that
//                is not allowed here.
function floorFrame() {
  const f = el(`<iframe title="Floor 1 assembled 3D model" name="h2sep-floor-1" loading="lazy"></iframe>`);
  if (window.__H2SEP_FLOOR_SRCDOC) {
    if (window.__H2SEP_FLOOR_DATA) {
      // Hand the injected checklist state through to the framed page, which
      // reads it in preference to fetching.
      f.srcdoc = window.__H2SEP_FLOOR_SRCDOC.replace(
        '<script>',
        `<script>window.__H2SEP_FLOOR_DATA=${JSON.stringify(window.__H2SEP_FLOOR_DATA)};</script><script>`);
    } else {
      f.srcdoc = window.__H2SEP_FLOOR_SRCDOC;
    }
  } else if (window.__H2SEP_VIEWER_SRCDOC) {
    return null;   // packaged, but the floor scene was not inlined - hard stop
  } else {
    f.src = 'floor3d.html';
  }
  return f;
}

function renderFloor(ctx) {
  const root = el(`<div>
    <div class="pagehead">
      <div><h1 class="h1">Floor 1 &middot; assembled</h1>
      <div class="sub">every space in its measured A100 place &middot; floor tint is checklist progress &middot; red pin is open issues &middot; tap a space to open its checklist</div></div>
      <span class="spacer"></span>
      <a class="btn" href="#/bim">${ic('cube')}Room models</a>
    </div>
    <div class="viewer-wrap"></div>
  </div>`);
  const wrap = root.querySelector('.viewer-wrap');
  const frame = floorFrame();
  if (!frame) {
    wrap.replaceWith(el(`<section class="card"><div class="coming">${ic('cube')}<b>FLOOR 1 MODEL IS NOT IN THIS BUNDLE</b>
      <span>This packaged copy did not inline floor3d.html or the checklist state it paints with, so there is nothing to show. Open the hosted platform for the assembled floor, or rebuild the bundle with the floor scene inlined. Showing an empty frame instead would be worse than saying so.</span></div></section>`));
  } else {
    wrap.append(frame);
  }
  return root;
}

function renderHub(ctx) {
  const { store, modelRooms } = ctx;
  const sliceRooms = store.guestRooms().map(r => r.number);
  const root = el(`<div>
    <div class="pagehead"><h1 class="h1">3D BIM</h1>
      <span class="sub">per-room geometry from the architect's A555 dimensions · locations stylized, not shop drawings</span></div>
    <section class="card bimlist">
      <div class="card-head"><h2>Room models</h2><span class="card-cap">each room renders its own geometry, never a shared shell</span></div>
      <div class="rows"></div>
    </section>
    <section class="card" style="margin-top:14px"><div class="card-head"><h2>Not modeled yet</h2><span class="card-cap">honest hard-stop, per standing ruling</span></div>
      <div class="coming" style="padding:20px">${ic('cube')}<b>King family, One Bedroom, and QQ Acc have no model</b>
      <span>A550 gives the King Studio its own 29 ft clear depth and working wall, so it gets its own geometry in the Blender pipeline, never a relabeled QQ shell. Until then those rooms show this stop instead of wrong geometry.</span></div>
    </section>
  </div>`);
  const rows = root.querySelector('.rows');
  for (const no of sliceRooms) {
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
    nav: [
      { path: '#/floor', label: 'Floor 1', icon: 'cube', section: 'Model' },
      { path: '#/bim', label: '3D BIM', icon: 'cube', section: 'Model' },
    ],
    routes: [
      { match: /^#\/floor$/, render: renderFloor },
      { match: /^#\/bim$/, render: renderHub },
      { match: /^#\/bim\/(?<no>[^?]+)/, render: renderRoomModel },
    ],
  };
}
