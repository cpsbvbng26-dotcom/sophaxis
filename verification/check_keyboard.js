/* Can every page of the built site be used with the keyboard alone, and read at any width?
 *
 *   node verification/check_keyboard.js
 *
 * The other checks read the HTML as text. This one starts a browser, because where the focus lands,
 * and whether it can be seen there, does not show in the text.
 *
 * Needs playwright and Chromium. Without them it stops with 1: a check that did not run has not passed.
 *   PLAYWRIGHT_CHROMIUM=/path/to/chrome   points at the executable (optional)
 *
 * It is a separate job in CI, so that a failure of the browser is not mistaken for a fault of the site.
 */
'use strict';

const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const SITE = path.resolve(__dirname, '..', 'site');
/* Wide and narrow: a page can overflow at 360 px and not at 390 px. 640 px is a window 1280 px wide zoomed to 200 %. */
const WIDTHS = [1440, 1200, 900, 640, 390, 360];
/* The text alone doubled, in a window of the width that accessibility.md names. */
const TEXT_ZOOM_WIDTH = 1280;

function pages(dir = SITE, rel = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) return ['pdf', 'cite', 'api', 'datacite'].includes(e.name) ? [] : pages(path.join(dir, e.name), r);
    return e.name.endsWith('.html') ? [r] : [];
  }).sort();
}

let pass = 0;
const failures = [];
function ok(label, cond, detail) {
  if (cond) { pass++; return; }
  console.log('  FAIL ' + label + (detail ? ' — ' + detail : ''));
  failures.push(label + (detail ? ' — ' + detail : ''));
}

function loadPlaywright() {
  try { return require('playwright'); } catch (e) { /* try the global ones */ }
  for (const dir of ['/opt/node22/lib/node_modules', '/usr/lib/node_modules', '/usr/local/lib/node_modules']) {
    try { return require(path.join(dir, 'playwright')); } catch (e) { /* next */ }
  }
  return null;
}

function findChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM) return process.env.PLAYWRIGHT_CHROMIUM;
  for (const base of [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers', path.join(os.homedir(), '.cache', 'ms-playwright')].filter(Boolean)) {
    if (!fs.existsSync(base)) continue;
    for (const d of fs.readdirSync(base).filter((x) => /^chromium-/.test(x)).sort().reverse()) {
      const exe = path.join(base, d, 'chrome-linux', 'chrome');
      if (fs.existsSync(exe)) return exe;
    }
  }
  return null;
}

async function launch(pw, exe) {
  const args = ['--no-sandbox'];
  if (exe) {
    try { return await pw.chromium.launch({ executablePath: exe, args }); } catch (e) { /* try playwright's own */ }
  }
  return pw.chromium.launch({ args });
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.xml': 'application/xml', '.png': 'image/png', '.ico': 'image/x-icon', '.txt': 'text/plain', '.pdf': 'application/pdf' };

function serve() {
  return new Promise((res) => {
    const s = http.createServer((req, rep) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(SITE, p);
      if (!f.startsWith(SITE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rep.writeHead(404); return rep.end('not found'); }
      rep.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      rep.end(fs.readFileSync(f));
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}

/* The focused element: is its focus ring drawn, how large is it, and where does it stand in the document. */
const PROBE = () => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return {
    tag: el.tagName,
    text: (el.getAttribute('aria-label') || el.textContent || el.getAttribute('href') || '').trim().slice(0, 40),
    ring: (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none',
    w: Math.round(r.width), h: Math.round(r.height),
    order: [...document.querySelectorAll('*')].indexOf(el),
  };
};

async function walk(pg) {
  const seen = [];
  let trap = null;
  await pg.keyboard.press('Tab');
  for (let i = 0; i < 400; i++) {
    const info = await pg.evaluate(PROBE);
    if (!info) break;
    const key = info.tag + '|' + info.text + '|' + info.order;
    if (seen.some((x) => x.key === key)) { if (seen[0].key !== key) trap = key; break; }
    seen.push(Object.assign({ key }, info));
    await pg.keyboard.press('Tab');
  }
  return { seen, trap };
}

(async () => {
  const pw = loadPlaywright();
  if (!pw) { console.error('playwright is missing, so this check did not run. A check that did not run has not passed.'); process.exit(1); }
  let browser;
  try { browser = await launch(pw, findChromium()); } catch (e) {
    console.error('Chromium could not start, so this check did not run. Set PLAYWRIGHT_CHROMIUM or run playwright install chromium.');
    console.error(String(e.message || e).split('\n')[0]);
    process.exit(1);
  }
  const server = await serve();
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const list = pages();
  console.log('Keyboard and layout: ' + list.length + ' pages, Tab through each, ' + WIDTHS.join(' / ') + ' px wide, and the text alone at 200 % at ' + TEXT_ZOOM_WIDTH + ' px');

  for (const page of list) {
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
    const pg = await ctx.newPage();
    const errors = [];
    pg.on('pageerror', (e) => errors.push(e.message));
    await pg.goto(base + page, { waitUntil: 'load' });
    const { seen, trap } = await walk(pg);
    ok(page + ': the focus moves on and does not get stuck', trap === null, trap || '');
    ok(page + ': there is something to reach with Tab', seen.length > 0);
    const blind = seen.filter((x) => !x.ring);
    ok(page + ': every focused element shows a focus ring', blind.length === 0, blind.slice(0, 4).map((x) => x.tag + ' ' + x.text).join(' / '));
    const flat = seen.filter((x) => x.w === 0 || x.h === 0);
    ok(page + ': the focus never lands on an element without size', flat.length === 0, flat.map((x) => x.tag + ' ' + x.text).join(' / '));
    const jumps = seen.filter((x, i) => i > 0 && x.order < seen[i - 1].order);
    ok(page + ': the Tab order is the reading order', jumps.length === 0, jumps.map((x) => x.tag + ' ' + x.text).join(' / '));
    const doc = await pg.evaluate(() => ({
      lang: document.documentElement.getAttribute('lang') || '',
      h1: document.querySelectorAll('h1').length,
      noAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).map((i) => i.getAttribute('src')),
      unlabelled: [...document.querySelectorAll('input:not([type=hidden]), select, textarea')].filter((el) =>
        !(el.labels && el.labels.length) && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')).map((el) => el.name || el.id || el.type),
    }));
    ok(page + ': the page names its language, has one h1, gives every image an alt text and labels every field',
      /^(en|ja)$/.test(doc.lang) && doc.h1 === 1 && doc.noAlt.length === 0 && doc.unlabelled.length === 0,
      'lang ' + doc.lang + ', h1 ' + doc.h1 + ', no alt ' + doc.noAlt.join(',') + ', unlabelled ' + doc.unlabelled.join(','));
    ok(page + ': no script error while loading', errors.length === 0, errors.join(' / '));
    await ctx.close();

    for (const w of WIDTHS) {
      const c2 = await browser.newContext({ viewport: { width: w, height: 900 } });
      const p2 = await c2.newPage();
      await p2.goto(base + page, { waitUntil: 'load' });
      const over = await p2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(page + ': does not scroll sideways at ' + w + ' px', over <= 1, over + ' px too wide');
      if (w <= 390) {
        const g = await p2.evaluate(() => {
          const W = document.documentElement.clientWidth; let L = Infinity, R = Infinity;
          for (const el of document.querySelectorAll('main p, main li, main h1, main h2, main h3, main dt, main dd')) {
            const b = el.getBoundingClientRect(); if (!b.width || !b.height) continue;
            L = Math.min(L, b.left); R = Math.min(R, W - b.right);
          }
          return { L: Math.round(L), R: Math.round(R) };
        });
        ok(page + ': at ' + w + ' px the text keeps at least 12 px from both edges', g.L >= 12 && g.R >= 12, 'left ' + g.L + ' / right ' + g.R);
      }
      await c2.close();
    }
    /* The text alone at 200 %, as a browser's text zoom or a larger default font gives it (WCAG 1.4.4): every size on the site
     * is in rem or em from the 17 px of the body, so doubling the root and the body doubles every text and nothing else. */
    {
      const c4 = await browser.newContext({ viewport: { width: TEXT_ZOOM_WIDTH, height: 900 }, bypassCSP: true });
      const p4 = await c4.newPage();
      await p4.goto(base + page, { waitUntil: 'load' });
      await p4.addStyleTag({ content: 'html { font-size: 200% !important; } body { font-size: 34px !important; }' });
      const over = await p4.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(page + ': with the text alone at 200 % in a window ' + TEXT_ZOOM_WIDTH + ' px wide, it does not scroll sideways', over <= 1, over + ' px too wide');
      await c4.close();
    }
  }
  /* The leaflet says that it fits one sheet: print it to A4 and count the pages. */
  {
    const c3 = await browser.newContext();
    const p3 = await c3.newPage();
    await p3.goto(base + 'leaflet.html', { waitUntil: 'load' });
    const pdf = await p3.pdf({ format: 'A4', printBackground: false });
    const sheets = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    ok('leaflet.html: printed on A4, it fits one sheet', sheets === 1, sheets + ' pages');
    await c3.close();
  }
  await browser.close();
  server.close();

  console.log('\n' + '-'.repeat(60));
  if (failures.length) { console.log(pass + ' passed, ' + failures.length + ' failed.'); process.exit(1); }
  console.log(pass + ' checks passed.');
})().catch((e) => { console.error(e); process.exit(1); });
