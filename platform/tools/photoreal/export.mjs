// Export the King Studio exhibit (platform/king-studio.html) to files that
// Blender can build a Cycles scene from.
//
// Writes into platform/tools/photoreal/export/ (derived, gitignored):
//   mesh.obj        one "o <zone>.<materialKey>.<n>" per mesh, world-space
//                   vertices converted from the exhibit's feet, Y up, to
//                   Blender metres, Z up:  (x, y, z) three.js -> (x, -z, y) * 0.3048
//                   Normals and UVs are written; triangle winding is flipped
//                   where the mesh's matrixWorld has a negative determinant
//                   (the whole finished model sits in a group with scale.z = -1).
//                   Each mesh gets "usemtl <materialKey>".  Texture repeat and
//                   offset are baked into the UVs, so one material key serves
//                   every clone that tiled() made of it.
//   scene.json      materials, lights, cameras, mirrors, shell constants, meshes
//   textures/*.png  every distinct canvas texture, at its native size
//
// The exhibit keeps M (materials), TEX (textures), MIRRORS, CANS and the shell
// constants inside its closure.  This script does not edit the committed page;
// it intercepts the HTTP response with a playwright route and appends those
// names to window.KS on the fly.
//
// Usage:
//   PW=/opt/node22/lib/node_modules/playwright/node_modules/playwright-core/index.mjs \
//   CHROME=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell \
//   node platform/tools/photoreal/export.mjs [--base=http://localhost:8343] [--out=<dir>]
//
// The page takes about 90 s to boot on SwiftShader.  The export itself is a few
// seconds; the JSON is paged mesh by mesh so no single evaluate call is huge.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2)
  .filter(a => a.startsWith('--'))
  .map(a => { const [k, v = 'true'] = a.slice(2).split('='); return [k, v]; }));

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PW = process.env.PW || '/opt/node22/lib/node_modules/playwright/node_modules/playwright-core/index.mjs';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const base = args.base || 'http://localhost:8343';
const pagePath = 'platform/king-studio.html';
const OUT = path.resolve(args.out || path.join(HERE, 'export'));
const TEXDIR = path.join(OUT, 'textures');
fs.mkdirSync(TEXDIR, { recursive: true });

const t0 = Date.now();
const { chromium } = await import(PW);
const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e).slice(0, 300)));

// Expose the closure's names on window.KS.  The replacement is anchored on the
// one line that builds window.KS, so if the page changes shape this fails loudly.
const INJECT = 'window.KS = {\n' +
  '  M: M, TEX: TEX, MIRRORS: MIRRORS, CANS: CANS, HFOV: HFOV, EYE: EYE,\n' +
  '  SHELL: { W: W, D: D, H: H, HL: HL, BX: BX, PT: PT, BIX: BIX, BZ: BZ, BIZ: BIZ,\n' +
  '           WIN_X0: WIN_X0, WIN_X1: WIN_X1, WIN_SILL: WIN_SILL, WIN_HEAD: WIN_HEAD,\n' +
  '           STOOL_Y: STOOL_Y, SHADE_TOP: SHADE_TOP, REVEAL: REVEAL,\n' +
  '           BED_CZ: BED_CZ, NS_A_Z: NS_A_Z, NS_B_Z: NS_B_Z,\n' +
  '           SOF_Z0: SOF_Z0, SOF_Z1: SOF_Z1, SOF_LEN: SOF_LEN,\n' +
  '           DOOR_CX: DOOR_CX, DOOR_LEAF: DOOR_LEAF, DESK_Y: DESK_Y,\n' +
  '           SOFA_Z0: SOFA_Z0, SOFA_Z1: SOFA_Z1 },\n';
let injected = false;
await page.route(`**/${pagePath}*`, async route => {
  const res = await route.fetch();
  let body = await res.text();
  if (!body.includes('window.KS = {')) throw new Error('window.KS = { not found in the page; the exhibit changed shape');
  body = body.replace('window.KS = {', INJECT);
  injected = true;
  await route.fulfill({ response: res, body, headers: { ...res.headers(), 'content-type': 'text/html; charset=utf-8' } });
});

await page.goto(`${base}/${pagePath}?view=bed`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 240000 });
if (!injected) throw new Error('route did not run');
const tBoot = Date.now();
console.log(`page ready in ${((tBoot - t0) / 1000).toFixed(1)} s`);

// ---- phase 1: catalogue the scene in the page --------------------------------
const catalogue = await page.evaluate(() => {
  const KS = window.KS, T = THREE, S = KS.SHELL, M = KS.M, TEX = KS.TEX;
  KS.scene.updateMatrixWorld(true);

  // textures: every distinct image used by any material channel
  const texByImage = new Map();   // image -> { name, srgb, w, h }
  const texNames = new Set();
  function texName(base) {
    let n = base, i = 2;
    while (texNames.has(n)) n = base + '-' + (i++);
    texNames.add(n);
    return n;
  }
  const texKeyOfImage = new Map();
  for (const k of Object.keys(TEX)) if (TEX[k] && TEX[k].image) texKeyOfImage.set(TEX[k].image, k);
  function regTex(t) {
    if (!t || !t.image) return null;
    const img = t.image;
    if (!texByImage.has(img)) {
      const w = img.width || (img.data && img.width) || 0, h = img.height || 0;
      const keyName = texKeyOfImage.get(img);
      texByImage.set(img, { name: texName(keyName || 'texture'), srgb: t.encoding === T.sRGBEncoding, w, h, fromTEX: keyName || null });
    }
    return texByImage.get(img).name;
  }

  // material keys.  Identity first, then a fingerprint for the clones tiled() made.
  const mirrorMeshes = new Set(KS.MIRRORS.map(m => m.mesh));
  const canLens = new Set(KS.CANS);
  const mKeys = Object.keys(M);
  const identity = new Map(mKeys.map(k => [M[k], k]));
  function chan(m, c) { return m[c] ? m[c].image : null; }
  function fingerprintEqual(a, b) {
    if (a.type !== b.type) return false;
    if ((a.color ? a.color.getHex() : -1) !== (b.color ? b.color.getHex() : -1)) return false;
    if ((a.roughness ?? -1) !== (b.roughness ?? -1)) return false;
    if ((a.metalness ?? -1) !== (b.metalness ?? -1)) return false;
    if (!!a.transparent !== !!b.transparent) return false;
    if ((a.opacity ?? 1) !== (b.opacity ?? 1)) return false;
    if ((a.side ?? 0) !== (b.side ?? 0)) return false;
    if ((a.emissive ? a.emissive.getHex() : -1) !== (b.emissive ? b.emissive.getHex() : -1)) return false;
    for (const c of ['map', 'bumpMap', 'roughnessMap', 'emissiveMap', 'alphaMap']) if (chan(a, c) !== chan(b, c)) return false;
    return true;
  }
  // Inline materials (built with std() inside the furniture code, never put in
  // M) get a stable descriptive key from their own properties, so identical
  // ones merge and a later agent can override them by name in materials.py.
  const inlineKeys = new Map();
  function inlineKey(m) {
    for (const [im, k] of inlineKeys) if (fingerprintEqual(m, im)) return k;
    let k = 'inl-' + (m.color ? m.color.getHexString() : 'nocolor');
    if (m.isMeshStandardMaterial) k += '-r' + Math.round((m.roughness ?? 1) * 100) + '-m' + Math.round((m.metalness ?? 0) * 100);
    else k += '-' + m.type.replace('Mesh', '').replace('Material', '').toLowerCase();
    if (m.emissive && m.emissive.getHex() !== 0) k += '-e' + m.emissive.getHexString();
    if (m.transparent) k += '-t' + Math.round((m.opacity ?? 1) * 100);
    if (m.side === T.DoubleSide) k += '-ds';
    if (m.map) k += '-' + regTex(m.map);
    let n = k, i = 2;
    while ([...inlineKeys.values()].includes(n)) n = k + '-' + (i++);
    inlineKeys.set(m, n);
    return n;
  }
  function keyOf(mesh) {
    const m = mesh.material;
    if (mirrorMeshes.has(mesh)) return 'mirror';
    if (identity.has(m)) return identity.get(m);
    // the AO decals are cloned with a different opacity per placement: one key each
    for (const dk of ['edge', 'contact', 'halo']) if (m.map && TEX[dk] && m.map.image === TEX[dk].image) return dk === 'halo' ? 'canHalo' : dk;
    for (const k of mKeys) if (fingerprintEqual(m, M[k])) return k;
    if (canLens.has(mesh)) return 'canLens';
    if (m.isMeshBasicMaterial && m.map && m.toneMapped === false) return 'sky';
    return inlineKey(m);
  }

  const mats = {};    // key -> material record (first material seen for the key)
  function texChan(m, c) {
    const t = m[c];
    if (!t) return null;
    return { file: regTex(t) + '.png', repeat: [t.repeat.x, t.repeat.y], offset: [t.offset.x, t.offset.y],
             wrapS: t.wrapS === T.RepeatWrapping ? 'repeat' : t.wrapS === T.MirroredRepeatWrapping ? 'mirror' : 'clamp',
             wrapT: t.wrapT === T.RepeatWrapping ? 'repeat' : t.wrapT === T.MirroredRepeatWrapping ? 'mirror' : 'clamp',
             srgb: t.encoding === T.sRGBEncoding, flipY: !!t.flipY };
  }
  function matRecord(key, m, mesh) {
    const r = {
      key, type: m.type,
      color: m.color ? '#' + m.color.getHexString() : null,
      roughness: m.roughness ?? null, metalness: m.metalness ?? null,
      emissive: m.emissive ? '#' + m.emissive.getHexString() : null,
      emissiveIntensity: m.emissiveIntensity ?? null,
      opacity: m.opacity ?? 1, transparent: !!m.transparent,
      transmission: m.transmission ?? null, ior: m.ior ?? null,
      side: m.side === T.DoubleSide ? 'double' : m.side === T.BackSide ? 'back' : 'front',
      toneMapped: m.toneMapped !== false, depthWrite: m.depthWrite !== false,
      blending: m.blending === T.AdditiveBlending ? 'additive' : 'normal',
      bumpScale: m.bumpScale ?? null, envMapIntensity: m.envMapIntensity ?? null,
      map: texChan(m, 'map'), bumpMap: texChan(m, 'bumpMap'), roughnessMap: texChan(m, 'roughnessMap'),
      emissiveMap: texChan(m, 'emissiveMap'), alphaMap: texChan(m, 'alphaMap'),
      isMirror: key === 'mirror',
      mirrorGlass: key === 'mirror' ? !!(m.defines && 'GLASS' in m.defines) : false,
      mirrorTint: key === 'mirror' && m.uniforms && m.uniforms.tint ? '#' + m.uniforms.tint.value.getHexString() : null
    };
    return r;
  }

  // zones from the world-space bounding box centre, in authoring coordinates
  // (x is shared, authoring z = D - world z because the model is flipped through z = D/2)
  const box = new T.Box3(), c = new T.Vector3(), sz = new T.Vector3();
  const shellMats = new Set(['paintWhite', 'paintBlue', 'ceiling', 'accentWall', 'carpet', 'tile', 'tileBath', 'bathPaper', 'showerTile']);
  function zoneOf(mesh, key) {
    box.setFromObject(mesh); box.getCenter(c); box.getSize(sz);
    const x = c.x, y = c.y, za = S.D - c.z;
    const g = mesh.geometry;
    const area = Math.max(sz.x * sz.y, sz.y * sz.z, sz.x * sz.z);
    if (g && g.type === 'PlaneGeometry' && shellMats.has(key) && area > 20) return 'shell';
    if (x <= S.BIX + 0.06 && za <= S.BIZ + 0.06 && y <= S.HL + 0.06) return 'bath';
    if (za < S.BZ) return (x > S.W - 2.6) ? 'kitchen' : 'entry';
    if (x > S.W - 2.5) return 'working';
    if (za < S.SOF_Z1) return 'lounge';
    return 'bed';
  }

  const meshes = [];
  const counters = {};
  KS.scene.traverse(o => {
    if (!o.isMesh || !o.geometry) return;
    const key = keyOf(o);
    if (!mats[key]) mats[key] = matRecord(key, o.material, o);
    const zone = zoneOf(o, key);
    const cn = zone + '.' + key;
    counters[cn] = (counters[cn] || 0) + 1;
    const name = cn + '.' + counters[cn];
    o.userData.__exportName = name;
    const g = o.geometry;
    const pos = g.getAttribute('position');
    const tris = g.index ? g.index.count / 3 : pos.count / 3;
    const m = o.material;
    meshes.push({
      name, zone, material: key, geometry: g.type,
      vertices: pos.count, triangles: tris,
      visible: o.visible, castShadow: !!o.castShadow, receiveShadow: !!o.receiveShadow,
      renderOrder: o.renderOrder || 0, determinant: o.matrixWorld.determinant(),
      bbox: { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] },
      uvRepeat: m.map ? [m.map.repeat.x, m.map.repeat.y] : (m.bumpMap ? [m.bumpMap.repeat.x, m.bumpMap.repeat.y] : [1, 1]),
      uvOffset: m.map ? [m.map.offset.x, m.map.offset.y] : (m.bumpMap ? [m.bumpMap.offset.x, m.bumpMap.offset.y] : [0, 0])
    });
  });

  // lights
  const lights = [];
  const wp = new T.Vector3(), wt = new T.Vector3();
  KS.scene.traverse(o => {
    if (!o.isLight) return;
    o.getWorldPosition(wp);
    const L = {
      type: o.type, color: '#' + o.color.getHexString(), intensity: o.intensity,
      position: [wp.x, wp.y, wp.z], castShadow: !!o.castShadow
    };
    if (o.isPointLight || o.isSpotLight) { L.decay = o.decay; L.distance = o.distance; }
    if (o.isSpotLight) { L.angle = o.angle; L.penumbra = o.penumbra; }
    if (o.isSpotLight || o.isDirectionalLight) {
      o.target.getWorldPosition(wt);
      L.target = [wt.x, wt.y, wt.z];
      const d = wt.clone().sub(wp).normalize();
      L.direction = [d.x, d.y, d.z];
    }
    if (o.isHemisphereLight) L.groundColor = '#' + o.groundColor.getHexString();
    lights.push(L);
  });

  const cameras = {};
  for (const k of Object.keys(KS.views)) cameras[k] = { p: KS.views[k].p.slice(), t: KS.views[k].t.slice() };

  window.__exportImages = [...texByImage.keys()];   // phase 2 reads them back by index
  return {
    shell: S, hfov: KS.HFOV, eye: KS.EYE,
    textures: [...texByImage.values()],
    materials: mats, meshes, lights, cameras,
    mirrors: [...mirrorMeshes].map(m => m.userData.__exportName),
    canLenses: [...canLens].map(m => m.userData.__exportName).filter(Boolean)
  };
});

// ---- phase 2: textures --------------------------------------------------------
const texFiles = [];
for (let ti = 0; ti < catalogue.textures.length; ti++) {
  const t = catalogue.textures[ti];
  const dataUrl = await page.evaluate((idx) => {
    const img = window.__exportImages[idx];
    if (!img) return null;
    let canvas;
    if (typeof HTMLCanvasElement !== 'undefined' && img instanceof HTMLCanvasElement) canvas = img;
    else {
      canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const g = canvas.getContext('2d');
      if (img.data) {                       // ImageData-backed DataTexture
        const id = g.createImageData(img.width, img.height);
        id.data.set(img.data);
        g.putImageData(id, 0, 0);
      } else g.drawImage(img, 0, 0);        // HTMLImageElement / ImageBitmap
    }
    return canvas.toDataURL('image/png');
  }, ti);
  if (!dataUrl) { errors.push('texture not re-found: ' + t.name); continue; }
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  fs.writeFileSync(path.join(TEXDIR, t.name + '.png'), buf);
  texFiles.push({ ...t, file: t.name + '.png', bytes: buf.length });
}

// ---- phase 3: geometry, paged mesh by mesh ------------------------------------
const objPath = path.join(OUT, 'mesh.obj');
const objFd = fs.openSync(objPath, 'w');
fs.writeSync(objFd, '# King Studio (Room 110) exported from platform/king-studio.html\n' +
  '# units: metres, Blender axes (x right, y into the room toward the window, z up)\n' +
  '# three.js (x, y, z) feet -> (x, -z, y) * 0.3048\n');
let vBase = 1, vtBase = 1, vnBase = 1;
let totalTris = 0, totalVerts = 0, written = 0, flipped = 0;
const names = catalogue.meshes.map(m => m.name);
const BATCH = 40;
for (let i = 0; i < names.length; i += BATCH) {
  const chunk = names.slice(i, i + BATCH);
  const parts = await page.evaluate((chunk) => {
    const KS = window.KS, T = THREE;
    const byName = new Map();
    KS.scene.traverse(o => { if (o.isMesh && o.userData.__exportName) byName.set(o.userData.__exportName, o); });
    const FT = 0.3048;
    const out = [];
    const v = new T.Vector3(), n = new T.Vector3();
    const nm = new T.Matrix3();
    for (const name of chunk) {
      const o = byName.get(name);
      const g = o.geometry, mw = o.matrixWorld;
      const flip = mw.determinant() < 0;
      nm.getNormalMatrix(mw);
      const pos = g.getAttribute('position'), nor = g.getAttribute('normal'), uv = g.getAttribute('uv');
      const m = o.material;
      const rep = m.map ? m.map.repeat : (m.bumpMap ? m.bumpMap.repeat : null);
      const off = m.map ? m.map.offset : (m.bumpMap ? m.bumpMap.offset : null);
      const V = new Float32Array(pos.count * 3), N = nor ? new Float32Array(pos.count * 3) : null, U = uv ? new Float32Array(pos.count * 2) : null;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(mw);
        V[i * 3] = v.x * FT; V[i * 3 + 1] = -v.z * FT; V[i * 3 + 2] = v.y * FT;
        if (N) { n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); N[i * 3] = n.x; N[i * 3 + 1] = -n.z; N[i * 3 + 2] = n.y; }
        if (U) {
          let s = uv.getX(i), t = uv.getY(i);
          if (rep) { s = s * rep.x + off.x; t = t * rep.y + off.y; }
          U[i * 2] = s; U[i * 2 + 1] = t;
        }
      }
      let I;
      if (g.index) I = Array.from(g.index.array);
      else { I = new Array(pos.count); for (let i = 0; i < pos.count; i++) I[i] = i; }
      out.push({ name, flip, count: pos.count, V: Array.from(V), N: N ? Array.from(N) : null, U: U ? Array.from(U) : null, I, material: o.userData.__exportName });
    }
    return out;
  }, chunk);
  for (const p of parts) {
    const rec = catalogue.meshes.find(m => m.name === p.name);
    const lines = [`o ${p.name}`, `usemtl ${rec.material}`];
    const V = p.V, N = p.N, U = p.U;
    for (let i = 0; i < p.count; i++) lines.push(`v ${V[i * 3].toFixed(5)} ${V[i * 3 + 1].toFixed(5)} ${V[i * 3 + 2].toFixed(5)}`);
    if (U) for (let i = 0; i < p.count; i++) lines.push(`vt ${U[i * 2].toFixed(5)} ${U[i * 2 + 1].toFixed(5)}`);
    if (N) for (let i = 0; i < p.count; i++) lines.push(`vn ${N[i * 3].toFixed(4)} ${N[i * 3 + 1].toFixed(4)} ${N[i * 3 + 2].toFixed(4)}`);
    const I = p.I;
    const ref = (k) => {
      const vi = vBase + k;
      return U && N ? `${vi}/${vtBase + k}/${vnBase + k}` : N ? `${vi}//${vnBase + k}` : U ? `${vi}/${vtBase + k}` : `${vi}`;
    };
    let tris = 0;
    for (let i = 0; i + 2 < I.length; i += 3) {
      const a = I[i], b = I[i + 1], c = I[i + 2];
      if (a === b || b === c || a === c) continue;   // degenerate (rbox bevel seams)
      lines.push(p.flip ? `f ${ref(a)} ${ref(c)} ${ref(b)}` : `f ${ref(a)} ${ref(b)} ${ref(c)}`);
      tris++;
    }
    fs.writeSync(objFd, lines.join('\n') + '\n');
    vBase += p.count; if (U) vtBase += p.count; if (N) vnBase += p.count;
    totalTris += tris; totalVerts += p.count; written++;
    if (p.flip) flipped++;
    rec.trianglesWritten = tris;
  }
}
fs.closeSync(objFd);

// ---- scene.json ---------------------------------------------------------------
const FT = 0.3048;
const toB = (p) => [p[0] * FT, -p[2] * FT, p[1] * FT];
const lights = catalogue.lights.map(L => ({
  ...L,
  positionBlender: toB(L.position),
  targetBlender: L.target ? toB(L.target) : null,
  directionBlender: L.direction ? [L.direction[0], -L.direction[2], L.direction[1]] : null
}));
const cameras = {};
for (const [k, v] of Object.entries(catalogue.cameras)) {
  cameras[k] = { p: v.p, t: v.t, pBlender: toB(v.p), tBlender: toB(v.t) };
}
const sceneJson = {
  source: pagePath,
  exportedAt: new Date().toISOString(),
  units: { exhibit: 'feet, Y up, world space (finished model flipped through z = D/2)', blender: 'metres, Z up' },
  blenderFromThree: '(x, y, z) -> (x, -z, y) * 0.3048; the window wall is at Blender Y = 0 and the corridor wall at Y = -D * 0.3048',
  hfov: catalogue.hfov, eye: catalogue.eye,
  shell: catalogue.shell,
  shellBlender: {
    xMin: 0, xMax: catalogue.shell.W * FT,
    yWindow: 0, yCorridor: -catalogue.shell.D * FT,
    zCeilingMain: catalogue.shell.H * FT, zCeilingLeg: catalogue.shell.HL * FT,
    bathXMax: catalogue.shell.BIX * FT, bathYMin: -catalogue.shell.D * FT, bathYMax: -(catalogue.shell.D - catalogue.shell.BIZ) * FT,
    entryPartitionY: -(catalogue.shell.D - catalogue.shell.BZ) * FT,
    window: { x0: catalogue.shell.WIN_X0 * FT, x1: catalogue.shell.WIN_X1 * FT, sill: catalogue.shell.WIN_SILL * FT, head: catalogue.shell.WIN_HEAD * FT },
    door: { cx: catalogue.shell.DOOR_CX * FT, leaf: catalogue.shell.DOOR_LEAF * FT }
  },
  textures: texFiles,
  materials: catalogue.materials,
  mirrors: catalogue.mirrors,
  canLenses: catalogue.canLenses,
  lights,
  cameras,
  meshes: catalogue.meshes,
  counts: { meshes: written, triangles: totalTris, vertices: totalVerts, textures: texFiles.length, lights: lights.length, flippedWinding: flipped },
  errors
};
fs.writeFileSync(path.join(OUT, 'scene.json'), JSON.stringify(sceneJson, null, 1));

const tEnd = Date.now();
console.log(JSON.stringify({
  out: OUT, meshes: written, triangles: totalTris, vertices: totalVerts, textures: texFiles.length,
  lights: lights.length, materials: Object.keys(catalogue.materials).length, flippedWinding: flipped,
  objBytes: fs.statSync(objPath).size,
  bootSeconds: +((tBoot - t0) / 1000).toFixed(1), exportSeconds: +((tEnd - tBoot) / 1000).toFixed(1),
  errors: errors.length ? errors : 'none'
}));
await browser.close();
