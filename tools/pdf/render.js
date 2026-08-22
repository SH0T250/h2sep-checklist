// Render the signage book to PDF.
//
// Two passes on purpose: the cover prints full-bleed with no running header or
// footer, the body prints with both. Chromium can't suppress a footer on a
// single page, so the two are printed separately and merged. Page numbers in
// the footer are therefore body-relative, and the cover is unnumbered - which
// is also what the contents page reports.
const fs = require('fs');
const path = require('path');
const MOD = '/opt/node22/lib/node_modules';
const { chromium } = require(path.join(MOD, 'playwright'));
const { PDFDocument } = require(process.env.PDFLIB);

const [, , htmlPath, outPath] = process.argv;

const FOOT = `
<div style="width:100%;font:7.5pt 'Liberation Sans',Arial,sans-serif;color:#5d6b76;
            padding:0 14mm;display:flex;justify-content:space-between;align-items:center;
            border-top:.5px solid #d3dae0;padding-top:2.5mm;margin-top:4mm;">
  <span style="letter-spacing:.06em;">H2SEP &middot; Required Signage Report &middot; Eagle Pass, TX</span>
  <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
</div>`;
const HEAD = `
<div style="width:100%;font:7pt 'Liberation Sans',Arial,sans-serif;color:#8d99a3;
            padding:0 14mm;text-align:right;letter-spacing:.14em;text-transform:uppercase;">
  Triun Construction &amp; Engineering &middot; 20 Aug 2026
</div>`;

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(htmlPath), { waitUntil: 'networkidle' });

  // Pass 1 - cover only, full bleed.
  await page.evaluate(() => {
    document.querySelectorAll('body > *:not(.cover)')
      .forEach((el) => { el.style.display = 'none'; });
  });
  const cover = await page.pdf({
    format: 'Letter', printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  // Pass 2 - everything but the cover, with running header and footer.
  await page.evaluate(() => {
    document.querySelectorAll('body > *').forEach((el) => { el.style.display = ''; });
    document.querySelector('.cover').style.display = 'none';
    // The first body page is the contents; it must not inherit a page break.
    const toc = document.querySelector('.toc');
    if (toc) toc.style.pageBreakBefore = 'avoid';
  });
  const body = await page.pdf({
    format: 'Letter', printBackground: true,
    displayHeaderFooter: true, headerTemplate: HEAD, footerTemplate: FOOT,
    margin: { top: '15mm', right: '14mm', bottom: '17mm', left: '14mm' },
  });
  await browser.close();

  const out = await PDFDocument.create();
  for (const buf of [cover, body]) {
    const src = await PDFDocument.load(buf);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  out.setTitle('H2SEP Required Signage Report - Home2 Suites by Hilton, Eagle Pass, Texas');
  out.setSubject('Fire marshal, ADA/TAS, pool, municipal and Texas statutory signage requirements');
  out.setAuthor('Triun Construction & Engineering');
  out.setKeywords(['signage', 'code compliance', 'Home2 Suites', 'Eagle Pass', 'TAS', 'IFC']);
  out.setCreationDate(new Date('2026-08-20T12:00:00Z'));
  out.setModificationDate(new Date('2026-08-20T12:00:00Z'));
  fs.writeFileSync(outPath, await out.save());

  const coverDoc = await PDFDocument.load(cover);
  const bodyDoc = await PDFDocument.load(body);
  console.log(JSON.stringify({
    cover: coverDoc.getPageCount(),
    body: bodyDoc.getPageCount(),
    total: coverDoc.getPageCount() + bodyDoc.getPageCount(),
  }));
})();
