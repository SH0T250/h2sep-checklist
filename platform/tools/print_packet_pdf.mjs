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
// FFE_ONLY: the FF&E checklist alone, no MEP punch (Austin, 2026-09-03).
// The header's counts are recomputed from the lines that remain, so the sheet
// never claims progress for a punch list it no longer prints.
if (process.env.FFE_ONLY) {
  await p.evaluate(() => {
    for (const sheet of document.querySelectorAll('.paper')) {
      for (const sect of sheet.querySelectorAll('.p-sect')) {
        const h = (sect.querySelector('.p-sect-h') || {}).textContent || '';
        if (/MEP/i.test(h)) sect.remove();
      }
      sheet.querySelectorAll('.p-break, .p-sign').forEach(x => x.remove());
      const rows = [...sheet.querySelectorAll('.p-row')];
      const done = rows.filter(r => ((r.querySelector('.p-box') || {}).textContent || '').trim()).length;
      const open = sheet.querySelectorAll('.p-issue').length;
      const sub = sheet.querySelector('.p-title span');
      if (sub) {
        const parts = sub.textContent.split(' · ');
        const type = parts[0], floor = parts[1] || '';   // room type, then "Floor N"
        // The room type is what a walker reads off the sheet next to the room
        // number, so it gets its own size instead of riding in the small line.
        sub.innerHTML = `<b class="p-type"></b><span class="p-subrest"></span>`;
        sub.querySelector('.p-type').textContent = type;
        sub.querySelector('.p-subrest').textContent = `${floor} · FF&E only · ${done} of ${rows.length} checked · ${open} open`;
      }
    }
  });
}
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
  // With the punch list gone a room's FF&E fits one page, so the type can be
  // bigger than the all-in-one packet allowed.
  const big = !!process.env.FFE_ONLY;
  await p.addStyleTag({ content: `
    .paper { font-size: ${big ? 11 : 10}px !important; }
    .p-head { padding-bottom: 7px; margin-bottom: 7px; border-bottom-width: 1.5px; }
    .p-head img { height: ${big ? 30 : 26}px; }
    .p-title > b { font-size: ${big ? 27 : 15}px; line-height: 1.1; }
    .p-title span { font-size: ${big ? 10 : 9}px; }
    .p-type { font-size: ${big ? 16 : 9}px; color: #10181D; font-weight: 700; }
    .p-type { display: ${big ? 'block' : 'inline'}; }
    .p-subrest { font-size: ${big ? 11 : 9}px; }
    .p-tb { font-size: ${big ? 9 : 8.5}px; }
    .p-sect { column-count: 2; column-gap: 20px; }
    .p-sect-h { column-span: all; }
    .p-cat { padding: ${big ? 5 : 5}px 0 2px; break-after: avoid; }
    .p-row { padding: ${big ? 2.1 : 1.6}px 0; gap: ${big ? 8 : 6}px; }
    .p-box { width: ${big ? 19 : 17}px; height: ${big ? 19 : 17}px; border-width: 1.4px; border-radius: 3px; font-size: ${big ? 9 : 8}px; }
    .p-notes, .p-foot, .p-signers { font-size: ${big ? 9.5 : 8.5}px; }
  ` });
}
// The app runs on a dark color-scheme. Chromium paints the page canvas from
// the scheme, not from any element, so printBackground put a black frame
// around every white sheet. Switching the document to the light scheme for
// the print removes it; the sheet itself was already white.
await p.addStyleTag({ content: 'html{color-scheme:light !important}html,body,.main,.paper-wrap,.paper{background:#FFFFFF !important}' });
  await p.emulateMedia({ media: 'print' });
await p.pdf({ path: OUT, format: 'Letter', printBackground: true, margin: { top: '0.4in', bottom: '0.45in', left: '0.4in', right: '0.4in' } });
await b.close();
console.log('written', OUT);
