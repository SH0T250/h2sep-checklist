// Derive platform/room3d.html from the crew app's built room-3d.html.
// Never hand-edit either file. Anchors are exact strings that must appear
// exactly once; any drift is a hard failure (same discipline as build-room3d.mjs).
//
// Patch set (3):
// 1+2. Accept the room number from the iframe name "h2sep-room-<no>" when there is
//      no ?room= query (srcdoc frames inside the bundled artifact have no URL).
// 3.   Hide the crew-app back bar when framed inside the platform.
//      NOTE: the document has no literal </body>; the only "</body>" in the file
//      lives INSIDE the hard-stop template string, so the script is appended at
//      end-of-file, never anchored on </body> or </head>.
//
// Usage: node platform/tools/derive-room3d.mjs
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const platformRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(platformRoot, '..');
let h = readFileSync(resolve(repoRoot, 'room-3d.html'), 'utf8');

function subOnce(from, to) {
  const n = h.split(from).length - 1;
  if (n !== 1) throw new Error(`anchor not unique (${n} hits): ${from.slice(0, 60)}`);
  h = h.replace(from, to);
}

const helper = `(function(){try{var m=(window.name||'').match(/^h2sep-room-([A-Za-z0-9-]+)$/);if(m&&!new URLSearchParams(location.search).get('room')){window.__H2SEP_NAME_ROOM=m[1];}}catch(e){}})();`;

subOnce(
  `var ROOM_NO = (new URLSearchParams(location.search).get('room') || '101').trim();`,
  helper + `\nvar ROOM_NO = (new URLSearchParams(location.search).get('room') || window.__H2SEP_NAME_ROOM || '101').trim();`
);
subOnce(
  `var qsRoom = (new URLSearchParams(location.search).get('room') || '101').trim();`,
  `var qsRoom = (new URLSearchParams(location.search).get('room') || window.__H2SEP_NAME_ROOM || '101').trim();`
);

h = h.trimEnd() + '\n<script>/* platform-embed: hide crew-app back bar when framed */\n'
  + '(function(){function hide(){try{if(window.self!==window.top){var b=document.getElementById("backbar");if(b)b.style.display="none";}}catch(e){}}\n'
  + 'if(document.readyState==="loading")addEventListener("DOMContentLoaded",hide);else hide();})();\n</scr' + 'ipt>\n';

writeFileSync(resolve(platformRoot, 'room3d.html'), h);
console.log('wrote platform/room3d.html', h.length, 'bytes');
