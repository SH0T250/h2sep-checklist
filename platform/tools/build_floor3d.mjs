// Build platform/floor3d.html from platform/tools/floor3d.src.html.
//
// The only thing this does is splice in the three.js runtime. There is no CDN
// on a jobsite and no network inside the packaged artifact, so the library is
// taken from the copy already inlined in platform/room3d.html - the exact same
// r128 build the room viewer is proven against, byte for byte, never fetched.
// Two script blocks are lifted: the r128 core and the OrbitControls add-on that
// sits right after it.
//
//   node platform/tools/build_floor3d.mjs
//
// platform/room3d.html is READ ONLY here and is never written.
// platform/floor3d.html is GENERATED - edit floor3d.src.html, never the output.
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(root, 'tools/floor3d.src.html');
const VIEWER = resolve(root, 'room3d.html');
const OUT = resolve(root, 'floor3d.html');

const viewer = readFileSync(VIEWER, 'utf8');

// The core: the <script> block that opens with the three.js licence header.
const LIC = '/**\n * @license\n * Copyright 2010-2021 Three.js Authors';
const licAt = viewer.indexOf(LIC);
if (licAt < 0) throw new Error('three.js licence header not found in room3d.html');
const coreOpen = viewer.lastIndexOf('<script>', licAt);
const coreClose = viewer.indexOf('</script>', licAt);
if (coreOpen < 0 || coreClose < 0) throw new Error('could not bound the three.js core block');
const core = viewer.slice(coreOpen, coreClose + '</script>'.length);
if (!/THREE=\{\}/.test(core) || core.length < 200000)
  throw new Error(`three.js core block looks wrong (${core.length} bytes)`);

// OrbitControls: the block that ends by assigning THREE.OrbitControls.
const ocAt = viewer.indexOf('THREE.OrbitControls = OrbitControls;', coreClose);
if (ocAt < 0) throw new Error('OrbitControls block not found in room3d.html');
const ocOpen = viewer.lastIndexOf('<script>', ocAt);
const ocClose = viewer.indexOf('</script>', ocAt);
const orbit = viewer.slice(ocOpen, ocClose + '</script>'.length);
if (orbit.length > 200000) throw new Error('OrbitControls block bounded wrong');

const src = readFileSync(SRC, 'utf8');
if (!src.includes('<!--THREEJS-->')) throw new Error('floor3d.src.html has no <!--THREEJS--> marker');
if (!src.includes('/*__H2SEP_FLOOR_DATA__*/'))
  throw new Error('floor3d.src.html has no /*__H2SEP_FLOOR_DATA__*/ marker for the packaged artifact');

const banner = `<!-- GENERATED FILE - do not hand edit.
     Source: platform/tools/floor3d.src.html
     Build:  node platform/tools/build_floor3d.mjs
     three.js r128 + OrbitControls are lifted verbatim from platform/room3d.html
     (${core.length} + ${orbit.length} bytes), so this page loads nothing from a network. -->\n`;

const html = banner + src.replace('<!--THREEJS-->', core + '\n' + orbit);
writeFileSync(OUT, html);
console.log(`wrote platform/floor3d.html  ${html.length} bytes  (three.js ${core.length}, OrbitControls ${orbit.length})`);
