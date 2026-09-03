// One PDF of a floor's room sheets, from a LIVE read of the checklist.
// The dashboard's own print packet renders it, seeded with the live snapshot,
// so the PDF is the same sheet the app prints (D63).
//
//   node platform/tools/report_open_issues.mjs <dir>      # writes live-platform-rooms.json
//   (cd platform && python3 -m http.server 8343 &)
//   FLOOR=4 FROM=402 TO=438 OUT=<dir>/packet.pdf [COMPACT=1] node platform/tools/print_packet_pdf.mjs <dir>
//
// COMPACT=1 puts each section in two columns and lets the MEP punch follow the
// FF&E list, so a room takes about two pages instead of five.
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';   // resolved from wherever playwright-core is installed
const EXE = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const SP = process.argv[2] || process.env.H2SEP_SCRATCH || '.';   // holds live-platform-rooms.json; the PDF lands here too
const docs = JSON.parse(readFileSync(SP + '/live-platform-rooms.json', 'utf8'));
const FLOOR = process.env.FLOOR || '4';
const FROM = Number(process.env.FROM || 0), TO = Number(process.env.TO || 9999);
const OUT = process.env.OUT || (SP + `/H2SEP_Floor-${FLOOR}_Room-Sheets.pdf`);
const b = await chromium.launch({ executablePath: EXE });
const p = await (await b.newContext({ viewport: { width: 1100, height: 1400 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.addInitScript((seed) => {
  window.__H2SEP_NO_BACKEND = true;
  window.__H2SEP_SEED = seed;
  localStorage.setItem('h2sep-platform-user', JSON.stringify({ name: 'Austin Jones', initials: 'AJ', company: 'Triun, LLC' }));
  sessionStorage.setItem('h2sep-id-prompted', '1');
}, { docs, meta: { floors: [1, 2, 3, 4] } });
await p.goto(`http://localhost:8343/#/print-floor/${FLOOR}`, { waitUntil: 'networkidle' });
await p.waitForSelector('.paper', { timeout: 30000 });
await p.waitForTimeout(1500);
// Room sheets only, inside the FROM..TO range. The floor's common-area sheets
// and their page break come out, so the packet is exactly the rooms asked for.
const kept = await p.evaluate(({ from, to }) => {
  const titles = [];
  for (const s of [...document.querySelectorAll('.paper')]) {
    const t = ((s.querySelector('.p-title b') || {}).textContent || '').trim();
    const no = t.replace('ROOM ', '');
    if (/^ROOM /.test(t) && Number(no) >= from && Number(no) <= to) { titles.push(no); continue; }
    const prev = s.previousElementSibling;
    if (prev && prev.classList.contains('p-break')) prev.remove();
    s.remove();
  }
  const first = document.querySelector('.paper');
  if (first && first.previousElementSibling && first.previousElementSibling.classList.contains('p-break')) first.previousElementSibling.remove();
  return titles;
}, { from: FROM, to: TO });
console.log('sheets kept:', kept.length);
console.log('rooms:', kept.join(' '));
console.log('page errors:', errs.slice(0, 3));
if (process.env.COMPACT) {
  // Compact packet: two columns per section, tighter rows, and the MEP punch
  // follows the FF&E list instead of starting its own page. Same lines, same
  // order, same box to initial in, about a third of the paper.
  await p.evaluate(() => {
    for (const s of document.querySelectorAll('.paper')) {
      const inner = s.querySelector('.p-break');   // the FF&E / MEP page break inside a sheet
      if (inner) inner.remove();
    }
  });
  await p.addStyleTag({ content: `
    .paper { font-size: 10px !important; }
    .p-head { padding-bottom: 6px; margin-bottom: 6px; border-bottom-width: 1.5px; }
    .p-head img { height: 26px; }
    .p-title b { font-size: 15px; }
    .p-title span { font-size: 9px; }
    .p-tb { font-size: 8.5px; }
    .p-sect { column-count: 2; column-gap: 18px; }
    .p-sect-h { column-span: all; }
    .p-cat { padding: 5px 0 2px; break-after: avoid; }
    .p-row { padding: 1.6px 0; gap: 6px; }
    .p-box { width: 17px; height: 17px; border-width: 1.3px; border-radius: 3px; font-size: 8px; }
    .p-notes, .p-foot, .p-signers { font-size: 8.5px; }
  ` });
}
  await p.emulateMedia({ media: 'print' });
await p.pdf({ path: OUT, format: 'Letter', printBackground: true, margin: { top: '0.4in', bottom: '0.45in', left: '0.4in', right: '0.4in' } });
await b.close();
console.log('written', OUT);
