// Patch rendering only. The platform viewer has additional King geometry;
// never regenerate it from the narrower crew viewer to apply this repair.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const start = '/* H2SEP renderer compatibility start */';
const end = '/* H2SEP renderer compatibility end */';
export function patchRoomRenderer(html) {
  html = html.replace(/\r\n/g, '\n');
  const source = ['js/vendor/Projector.r128.js', 'js/vendor/SVGRenderer.r128.js', 'js/room-renderer.js']
    .map(path => readFileSync(resolve(root, path), 'utf8').replace(/\r\n/g, '\n')).join('\n');
  const license = readFileSync(resolve(root, 'js/vendor/LICENSE-three.txt'), 'utf8').replace(/\r\n/g, '\n');
  const block = `${start}\n/* Three.js Projector/SVGRenderer r128\n${license}*/\n${source}\nvar renderer = createRoomRenderer(MOBILE);\n${end}`;
  const previous = /\/\* H2SEP renderer compatibility start \*\/[\s\S]*?\/\* H2SEP renderer compatibility end \*\//g;
  const original = "var renderer = new THREE.WebGLRenderer({antialias: !MOBILE, powerPreference: 'high-performance'});";
  const matches = html.includes(start) ? [...html.matchAll(previous)].length : html.split(original).length - 1;
  if (matches !== 1) throw new Error('Expected one room renderer, got ' + matches);
  html = html.includes(start) ? html.replace(previous, () => block) : html.replace(original, () => block);
  // The normal loop renders continuously; the software renderer draws on change.
  const invalidate = 'function requestRenderIfFrozen(){\n  renderer.invalidate();';
  if (!html.includes(invalidate)) html = html.replace('function requestRenderIfFrozen(){', invalidate);
  return html;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  for (const path of ['room-3d.html', 'platform/room3d.html']) {
    const file = resolve(root, path);
    writeFileSync(file, patchRoomRenderer(readFileSync(file, 'utf8')));
    console.log('Updated renderer in ' + path);
  }
}
