// Build platform/floor3d.html from platform/tools/floor3d.src.html.
//
//   node platform/tools/build_floor3d.mjs
//
// The output is GENERATED. Hand-edit the source, never the output - the header
// this script writes into floor3d.html says the same thing to anyone who opens
// it by mistake.
//
// Three things get inlined:
//   @@THREE@@  the three.js r128 library line, copied verbatim out of
//              platform/room3d.html. There is no network fetch anywhere in this
//              toolchain and no second copy of the library in the repo: the
//              floor scene runs the exact build the room viewer runs, so the
//              two exhibits can never drift onto different three.js versions.
//   @@ORBIT@@  the OrbitControls block, from the same file, same reason.
//   @@LOGO@@   platform/img/triun-logo.png as a data URI, so the title block
//              carries the mark with no request and the packaged single-file
//              artifact keeps it.
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8');

// Pull the body of the <script> block that contains `needle`. Matching on the
// content rather than on a line number means a change to room3d.html's markup
// above these blocks cannot silently shift what gets copied.
function scriptBody(html, needle, label) {
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[1].indexOf(needle) !== -1) return m[1].trim();
  }
  throw new Error(`build_floor3d: could not find the ${label} script block in room3d.html (needle: ${needle})`);
}

const viewer = read('room3d.html');
const three = scriptBody(viewer, 'Three.js Authors', 'three.js library');
const orbit = scriptBody(viewer, 'OrbitControls', 'OrbitControls');

if (three.length < 400000) throw new Error(`build_floor3d: three.js block looks truncated (${three.length} bytes)`);
if (orbit.indexOf('THREE.OrbitControls') === -1) throw new Error('build_floor3d: OrbitControls block does not export THREE.OrbitControls');

const logo = readFileSync(resolve(root, 'img/triun-logo.png')).toString('base64');

let src = read('tools/floor3d.src.html');
for (const [token, value, name] of [
  ['@@THREE@@', three, 'three.js'],
  ['@@ORBIT@@', orbit, 'OrbitControls'],
  ['@@LOGO@@', `data:image/png;base64,${logo}`, 'logo'],
]) {
  if (src.indexOf(token) === -1) throw new Error(`build_floor3d: token ${token} (${name}) is missing from floor3d.src.html`);
  src = src.split(token).join(value);
}

const header = `<!-- GENERATED FILE - do not hand edit.
     Built by platform/tools/build_floor3d.mjs from platform/tools/floor3d.src.html.
     three.js r128 and OrbitControls are inlined verbatim from platform/room3d.html,
     so both exhibits run the same library and neither fetches anything.
     Edit the source and rebuild:  node platform/tools/build_floor3d.mjs
-->
`;
writeFileSync(resolve(root, 'floor3d.html'), header + src);
console.log('wrote platform/floor3d.html',
  (header.length + src.length), 'bytes',
  `(three.js ${three.length}, OrbitControls ${orbit.length}, logo ${logo.length} b64)`);
