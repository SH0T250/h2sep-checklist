// Headless screenshot of a room's 3D scene, at a named camera preset.
//
// This is the capture half of the review loop: the same room, the same camera,
// every round, so a critic can compare like with like. WebGL runs on Chromium's
// software renderer here (SwiftShader), so no GPU is needed.
//
// Usage:
//   node platform/tools/shoot-room.mjs --room=104 --view=beds --out=/tmp/104-beds.png
// Options:
//   --room=<no>     room number (default 101)
//   --view=<name>   camera preset button text: iso, top, beds, bath, kitch (default iso)
//   --tags=on|off   item tag labels (default off, so the scene reads as a room)
//   --chrome=on|off keep the sidebar and bars (default off: canvas only)
//   --w --h         viewport (default 1600x1100)
//   --scale         device pixel ratio (default 1.5; SwiftShader gets slow above 2)
//   --base=<url>    server root (default http://localhost:8343)
//   --page=<file>   viewer page (default room-3d.html)
//   --settle=<ms>   wait after the camera move (default 2200)
//   --setview=<name>  drive a page that exposes window.setView(name) instead of
//                     clicking preset buttons.  Used by platform/king-studio.html,
//                     which has a scripting API and waits on window.__ready.
// Env:
//   PW=<path to playwright-core>  CHROME=<path to headless shell>
const args = Object.fromEntries(process.argv.slice(2)
  .filter(a => a.startsWith('--'))
  .map(a => { const [k, v = 'true'] = a.slice(2).split('='); return [k, v]; }));

const PW = process.env.PW || '/tmp/claude-0/-home-user-h2sep-checklist/18be7c92-db26-548f-a957-ab5e606c8fa1/scratchpad/node_modules/playwright-core/index.mjs';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const { chromium } = await import(PW);

const room = args.room || '101';
const view = (args.view || 'iso').toUpperCase();
const out = args.out || `/tmp/room-${room}-${view.toLowerCase()}.png`;
const base = args.base || 'http://localhost:8343';
const page = args.page || 'room-3d.html';
const wantTags = args.tags === 'on';
const wantChrome = args.chrome === 'on';
const settle = Number(args.settle || 2200);

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({
  viewport: { width: Number(args.w || 1600), height: Number(args.h || 1100) },
  deviceScaleFactor: Number(args.scale || 1.5),
});
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(String(e).slice(0, 300)));

const setview = args.setview || null;
const url = setview
  ? `${base}/${page}?view=${encodeURIComponent(setview)}`
  : `${base}/${page}?room=${encodeURIComponent(room)}&view=iso`;
// king-studio.html draws every texture in the room, generates a PMREM and bakes
// two cube reflections before it paints, so first paint is tens of seconds on
// SwiftShader. Both waits are generous enough for that.
await p.goto(url, { waitUntil: 'load', timeout: 180000 });
await p.waitForFunction(() => {
  const c = document.querySelector('canvas');
  return !!c && c.width > 100;
}, null, { timeout: 180000 });
await p.waitForTimeout(600);

// Pages that expose a scripting API (king-studio.html) are driven directly:
// wait for window.__ready, then call window.setView(name).
if (setview) {
  await p.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
  const ok = await p.evaluate((v) => typeof window.setView === 'function' && window.setView(v), setview);
  if (!ok) {
    console.error(`window.setView("${setview}") returned false or is missing`);
    await browser.close();
    process.exit(2);
  }
  await p.waitForTimeout(settle);
  if (!wantChrome) {
    await p.evaluate(() => {
      const canvas = document.querySelector('canvas');
      let node = canvas;
      while (node.parentElement && node.parentElement !== document.body) node = node.parentElement;
      for (const el of document.body.children) if (el !== node) el.style.display = 'none';
      Object.assign(node.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', margin: '0' });
      document.body.style.margin = '0';
      window.dispatchEvent(new Event('resize'));
    });
    await p.waitForTimeout(1200);
  }
  await p.screenshot({ path: out, animations: 'disabled', timeout: 180000 });
  const b = (await import('fs')).statSync(out).size;
  console.log(JSON.stringify({ page, view: setview, out, bytes: b, errors: errors.length ? errors : 'none' }));
  await browser.close();
  process.exit(0);
}

await p.waitForTimeout(1200);

// The viewer has no scripting API, so drive it the way a person does: the
// preset buttons in the top bar, matched on their exact label.
async function pressBar(label) {
  const hit = await p.evaluate((want) => {
    const b = [...document.querySelectorAll('button')]
      .find(x => x.textContent.trim().toUpperCase() === want && !x.className.includes('row'));
    if (!b) return false;
    b.click();
    return true;
  }, label);
  return hit;
}

const tagsOn = await p.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().toUpperCase() === 'TAGS');
  return b ? /\bon\b|active|is-on/i.test(b.className) || b.getAttribute('aria-pressed') === 'true' : null;
});
if (tagsOn !== null && tagsOn !== wantTags) await pressBar('TAGS');

const moved = view === 'ISO' ? await pressBar('ISO') : await pressBar(view);
if (!moved) {
  console.error(`camera preset "${view}" not found on this page`);
  await browser.close();
  process.exit(2);
}
await p.waitForTimeout(settle);

if (!wantChrome) {
  // Hide everything that is not the 3D canvas, so the frame is the room itself.
  await p.evaluate(() => {
    const canvas = document.querySelector('canvas');
    let node = canvas;
    while (node.parentElement && node.parentElement !== document.body) node = node.parentElement;
    for (const el of document.body.children) if (el !== node) el.style.display = 'none';
    Object.assign(node.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', margin: '0' });
    document.body.style.margin = '0';
    window.dispatchEvent(new Event('resize'));
  });
  await p.waitForTimeout(900);
}

await p.screenshot({ path: out, animations: 'disabled', timeout: 120000 });
const bytes = (await import('fs')).statSync(out).size;
console.log(JSON.stringify({ room, view, out, bytes, errors: errors.length ? errors : 'none' }));
await browser.close();
