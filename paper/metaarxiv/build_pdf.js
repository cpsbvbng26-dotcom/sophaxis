// Builds the PDF of the MetaArXiv manuscript: pandoc writes HTML with the references, Chromium prints it.
// Usage: node paper/metaarxiv/build_pdf.js <out.pdf>
// The PDF is not kept in the repository; the Markdown is the source.
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const out = process.argv[2];
if (!out) { console.error('usage: node paper/metaarxiv/build_pdf.js <out.pdf>'); process.exit(2); }
const dir = __dirname;
const html = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'metaarxiv-')), 'manuscript.html');
execFileSync('pandoc', ['manuscript.md', '--citeproc', '--template', 'template.html', '-o', html], { cwd: dir, stdio: 'inherit' });

(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + html);
  await page.pdf({ path: path.resolve(out), format: 'A4', printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="font-size:8pt;width:100%;text-align:center;color:#555"><span class="pageNumber"></span> / <span class="totalPages"></span></div>' });
  await browser.close();
  console.log('wrote ' + path.resolve(out));
})();
