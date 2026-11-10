#!/usr/bin/env node
/* Share cards: one PNG of 1200 x 630 per record shown, for the og:image of its page, so that a link shared on X, Bluesky,
 * LinkedIn or Facebook shows the title and the authors instead of the logo alone.
 *
 *   node tools/cards.js          draw the cards that are missing or out of date
 *   node tools/cards.js --all    draw every card again
 *
 * Drawn with Playwright and the Chromium installed beside it, from HTML with no network access, into assets/cards/<id>.png.
 * assets/cards/cards.json keeps, for each card, the sha256 of what it shows (cardText), so that the check finds a card
 * that no longer matches its record. The cards are drawn by hand like the PDF copies, not by build.js. */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const DIR = path.join(ROOT, 'assets', 'cards');
const MANIFEST = path.join(DIR, 'cards.json');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Pure: what a card shows, as one string. A change to any of it makes the card out of date. */
function cardText(p) {
  const cats = [p.category].concat(p.categories || []).map((c) => SITE.categories[c]);
  return [p.id, p.title, p.authors.map((a) => a.name).join(', '), cats.join(' · '), p.status].join('\n');
}
const cardHash = (p) => crypto.createHash('sha256').update(cardText(p)).digest('hex');

/* Pure: the HTML of a card. The logo is the one in assets/favicon.svg, inlined; no file is fetched. */
function cardHtml(p, logo) {
  const authors = p.authors.map((a) => a.name).join(', ');
  const cats = [p.category].concat(p.categories || []).map((c) => SITE.categories[c]).join(' · ');
  const size = p.title.length > 140 ? 40 : p.title.length > 90 ? 48 : 56;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html, body { margin: 0; }
body { width: 1200px; height: 630px; background: #14171f; color: #e6e2d8; font-family: "DejaVu Serif", Georgia, serif; box-sizing: border-box; padding: 56px 72px; display: flex; flex-direction: column; }
.top { display: flex; align-items: center; gap: 20px; font-family: "DejaVu Sans", sans-serif; font-size: 30px; letter-spacing: .04em; }
.top svg { width: 64px; height: 64px; }
.top small { display: block; font-size: 18px; color: #a3a8b4; letter-spacing: .08em; text-transform: uppercase; }
h1 { font-size: ${size}px; line-height: 1.22; margin: 44px 0 0; font-weight: 700; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.authors { margin-top: 24px; font-size: 30px; color: #9fb6e0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.foot { margin-top: auto; display: flex; justify-content: space-between; font-family: "DejaVu Sans", sans-serif; font-size: 22px; color: #a3a8b4; border-top: 2px solid #2e3442; padding-top: 20px; }
</style></head><body>
<div class="top">${logo}<div>${esc(SITE.name)}<small>${esc(SITE.tagline)}</small></div></div>
<h1>${esc(p.title)}</h1>
<div class="authors">${esc(authors)}</div>
<div class="foot"><span>${esc(SITE.name)}:${esc(p.id)} · ${esc(cats)}</span><span>Moderation, not peer review</span></div>
</body></html>`;
}

async function main() {
  const all = process.argv.includes('--all');
  const dir = path.join(ROOT, 'data', 'papers');
  const records = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))).filter((p) => p.status !== 'removed');
  fs.mkdirSync(DIR, { recursive: true });
  const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
  const todo = records.filter((p) => all || manifest[p.id] !== cardHash(p) || !fs.existsSync(path.join(DIR, p.id + '.png')));
  const logo = fs.readFileSync(path.join(ROOT, 'assets', 'favicon.svg'), 'utf8').replace(/<title>[^<]*<\/title>/, '');
  if (todo.length) {
    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await page.route('**/*', (r) => r.abort());
    for (const p of todo) {
      await page.setContent(cardHtml(p, logo), { waitUntil: 'load' });
      await page.screenshot({ path: path.join(DIR, p.id + '.png'), clip: { x: 0, y: 0, width: 1200, height: 630 } });
      manifest[p.id] = cardHash(p);
      console.log('drew ' + p.id);
    }
    await browser.close();
  }
  /* Cards of records no longer shown are dropped. */
  for (const id of Object.keys(manifest)) if (!records.some((p) => p.id === id)) { delete manifest[id]; fs.rmSync(path.join(DIR, id + '.png'), { force: true }); }
  const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
  fs.writeFileSync(MANIFEST, JSON.stringify(sorted, null, 2) + '\n');
  console.log(todo.length + ' drawn, ' + Object.keys(sorted).length + ' cards');
}

module.exports = { cardText, cardHash, cardHtml };

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
