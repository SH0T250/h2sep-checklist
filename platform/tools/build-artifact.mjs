// Bundle the platform into one self-contained HTML file for artifact preview.
// No bundler dependency: modules are concatenated in dependency order with
// import/export lines stripped (names are unique across modules by convention).
// Usage: node platform/tools/build-artifact.mjs
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8');

const ORDER = [
  'js/config.js',
  'js/core/ui.js',
  'js/core/store.js',
  'js/core/registry.js',
  'js/modules/tracking/module.js',
  'js/modules/directory/module.js',
  'js/modules/bim/module.js',
  'js/app.js',
];

function stripModuleSyntax(src) {
  return src
    .replace(/^import\s[^;]*;\s*$/gm, '')
    .replace(/^export\s+(async\s+)?function/gm, '$1function')
    .replace(/^export\s+class/gm, 'class')
    .replace(/^export\s+const/gm, 'const')
    .replace(/^export\s*\{[^}]*\};\s*$/gm, '');
}

const css = read('css/app.css');
const seed = read('data/slice-f1.json');
const logoB64 = readFileSync(resolve(root, 'img/triun-logo.png')).toString('base64');
const viewer = read('room3d.html');

const js = ORDER.map(p => `/* ---- ${p} ---- */\n` + stripModuleSyntax(read(p))).join('\n');
const guard = s => s.replace(/<\/script/gi, '<\\/script');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<meta name="color-scheme" content="light dark"/>
<title>H2SEP Platform Slice</title>
<style>${css}</style>
</head>
<body>
<div id="app" aria-live="polite"></div>
<script>
window.__H2SEP_NO_BACKEND = 1; // artifact pages cannot reach external hosts; local mode
window.__H2SEP_SEED = ${guard(seed)};
window.__H2SEP_LOGO = "data:image/png;base64,${logoB64}";
window.__H2SEP_VIEWER_SRCDOC = ${guard(JSON.stringify(viewer))};
</script>
<script type="module">
${guard(js)}
</script>
</body>
</html>`;

writeFileSync(resolve(root, 'dist/h2sep-slice.html'), html);
console.log('wrote platform/dist/h2sep-slice.html', html.length, 'bytes');
