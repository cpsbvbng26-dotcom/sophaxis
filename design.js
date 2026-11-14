/* The design of Sophaxis (2026-11-14): the shelf.
 *
 * Every number of the design is here. The logo, the field glyphs, the band over each page, the construction drawing and the
 * spines of the shelf are drawn from these numbers by build.js, and verification/check.js (133) draws them again and compares
 * them with what the site serves, character for character.
 *
 * Rules
 * - Shapes are rectangles, polygons, circles and lines, as in the logo. No typeface is embedded or loaded: the text on the
 *   pages and in the drawings uses the reader's own system fonts. No icon, image, texture or photograph of anyone else.
 * - The field codes are Sophaxis's own (site.json "fields"). They are not taken from any existing classification scheme.
 * - The shelf is a metaphor (mission.md, Article 1). Sophaxis is not a library, and a shelf mark is a label, not an
 *   identifier: a record is cited by its Sophaxis id and the DOI of the deposited work.
 * - Decoration is hidden from screen readers (aria-hidden); every drawing still has a title. Without CSS the pages read as
 *   plain lists and tables.
 */
'use strict';

/* The logo, as assets/favicon.svg has it. favicon.svg was drawn by hand and is copied as it is; the check draws it again from
 * these numbers and fails if the two differ. The S is five bars of one thickness (`unit`) on a grid of that unit. */
const LOGO = {
  size: 48, radius: 9, ink: '#14171f', light: '#9fb6e0',
  frame: { inset: 7, stroke: 3, radius: 2 },
  unit: 4,
  bars: [[17, 13, 18, 4], [13, 13, 4, 13], [13, 22, 22, 4], [31, 22, 4, 13], [13, 31, 18, 4]],
  title: 'Sophaxis',
};

function logoSvg() {
  const s = LOGO.size, f = LOGO.frame, inner = s - 2 * f.inset;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}"><title>${LOGO.title}</title>`
    + `<rect width="${s}" height="${s}" rx="${LOGO.radius}" fill="${LOGO.ink}"/>`
    + `<rect x="${f.inset}" y="${f.inset}" width="${inner}" height="${inner}" rx="${f.radius}" fill="none" stroke="${LOGO.light}" stroke-width="${f.stroke}"/>`
    + LOGO.bars.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${LOGO.light}"/>`).join('')
    + '</svg>';
}

/* Measurements of the logo, derived from the numbers above, for the construction page. */
function logoMeasures() {
  const xs = LOGO.bars.flatMap(([x, , w]) => [x, x + w]), ys = LOGO.bars.flatMap(([, y, , h]) => [y, y + h]);
  const S = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  return {
    size: LOGO.size, radius: LOGO.radius, inset: LOGO.frame.inset, stroke: LOGO.frame.stroke, frameRadius: LOGO.frame.radius,
    inner: LOGO.size - 2 * LOGO.frame.inset, unit: LOGO.unit, bars: LOGO.bars.length, s: S,
    margin: S.x - LOGO.frame.inset, lengths: LOGO.bars.map(([, , w, h]) => Math.max(w, h)),
  };
}

/* The field glyphs: one shape per field code, on a box of 12, drawn with the stroke of the logo's frame scaled to the box.
 * They take the colour of the text beside them (currentColor), so they need no colour of their own. */
const GLYPH = { box: 12, stroke: 1.5 };
const GLYPHS = {
  PHI: [['circle', { cx: 6, cy: 6, r: 4.5 }]],
  MAT: [['rect', { x: 1.5, y: 1.5, width: 9, height: 9 }]],
  PHM: [['rect', { x: 1.5, y: 1.5, width: 9, height: 9 }], ['circle', { cx: 6, cy: 6, r: 2, class: 'dot' }]],
  PHS: [['polygon', { points: '6,1 11,6 6,11 1,6' }]],
  LOG: [['polygon', { points: '6,1.5 10.5,10.5 1.5,10.5' }]],
};
const GLYPH_SHAPES = { PHI: 'a ring', MAT: 'a square', PHM: 'a square around a dot', PHS: 'a square stood on its corner', LOG: 'a triangle' };
const GLYPH_SHAPES_JA = { PHI: '輪', MAT: '正方形', PHM: '点を囲む正方形', PHS: '角で立てた正方形', LOG: '三角形' };

const attrs = (o) => Object.entries(o).map(([k, v]) => ` ${k}="${v}"`).join('');
function glyphSvg(code) {
  const b = GLYPH.box;
  return `<svg class="glyph" viewBox="0 0 ${b} ${b}" width="${b}" height="${b}" aria-hidden="true" focusable="false"><title>${code}</title>`
    + GLYPHS[code].map(([tag, a]) => `<${tag}${attrs(a)}/>`).join('') + '</svg>';
}

/* The band over every page: the five bars of the S stood on end, side by side, as five spines on a shelf, repeated across
 * the width. Heights are the bars' lengths in the logo, scaled; widths are the logo's unit. Each spine has a field's colour. */
const BAND = { scale: 0.5, gap: 2, board: 1.5, order: ['PHI', 'MAT', 'PHM', 'PHS', 'LOG'] };
function bandSvg() {
  const m = logoMeasures(), u = LOGO.unit, g = BAND.gap;
  const top = Math.max(...m.lengths) * BAND.scale, h = top + BAND.board, step = (u + g) * m.lengths.length;
  const spines = m.lengths.map((len, i) => {
    const sh = len * BAND.scale;
    return `<rect x="${i * (u + g) + g / 2}" y="${top - sh}" width="${u}" height="${sh}" class="f-${BAND.order[i].toLowerCase()}"/>`;
  }).join('');
  return `<svg class="band" height="${h}" aria-hidden="true"><title>Five spines</title>`
    + `<pattern id="band" width="${step}" height="${h}" patternUnits="userSpaceOnUse">${spines}</pattern>`
    + `<rect width="100%" height="${top}" fill="url(#band)"/>`
    + `<rect y="${top}" width="100%" height="${BAND.board}" class="board"/>`
    + '</svg>';
}

/* The construction drawing: the logo at `scale`, on its grid of one unit, with the measurements drawn as lines and numbers. */
const CONSTRUCTION = { scale: 6, pad: 40 };
function constructionSvg(ja = false) {
  const k = CONSTRUCTION.scale, p = CONSTRUCTION.pad, m = logoMeasures(), s = LOGO.size * k, W = s + 2 * p;
  const at = (v) => p + v * k;
  const grid = [];
  for (let v = 0; v <= LOGO.size; v += LOGO.unit) {
    grid.push(`<line x1="${at(v)}" y1="${at(0)}" x2="${at(v)}" y2="${at(LOGO.size)}"/>`, `<line x1="${at(0)}" y1="${at(v)}" x2="${at(LOGO.size)}" y2="${at(v)}"/>`);
  }
  const f = LOGO.frame;
  const shape = `<rect x="${at(0)}" y="${at(0)}" width="${s}" height="${s}" rx="${LOGO.radius * k}" fill="${LOGO.ink}" class="c-ink"/>`
    + `<rect x="${at(f.inset)}" y="${at(f.inset)}" width="${m.inner * k}" height="${m.inner * k}" rx="${f.radius * k}" fill="none" stroke="${LOGO.light}" stroke-width="${f.stroke * k}"/>`
    + LOGO.bars.map(([x, y, w, h]) => `<rect x="${at(x)}" y="${at(y)}" width="${w * k}" height="${h * k}" fill="${LOGO.light}"/>`).join('');
  /* A measurement: a line with ticks at both ends and its number beside it. */
  const dimH = (x1, x2, y, label) => `<line x1="${at(x1)}" y1="${y}" x2="${at(x2)}" y2="${y}" class="c-dim"/>`
    + `<line x1="${at(x1)}" y1="${y - 4}" x2="${at(x1)}" y2="${y + 4}" class="c-dim"/><line x1="${at(x2)}" y1="${y - 4}" x2="${at(x2)}" y2="${y + 4}" class="c-dim"/>`
    + `<text x="${(at(x1) + at(x2)) / 2}" y="${y - 6}" text-anchor="middle" class="c-num">${label}</text>`;
  const dimV = (y1, y2, x, label) => `<line x1="${x}" y1="${at(y1)}" x2="${x}" y2="${at(y2)}" class="c-dim"/>`
    + `<line x1="${x - 4}" y1="${at(y1)}" x2="${x + 4}" y2="${at(y1)}" class="c-dim"/><line x1="${x - 4}" y1="${at(y2)}" x2="${x + 4}" y2="${at(y2)}" class="c-dim"/>`
    + `<text x="${x - 6}" y="${(at(y1) + at(y2)) / 2 + 4}" text-anchor="end" class="c-num">${label}</text>`;
  const dims = dimH(0, LOGO.size, p - 16, String(m.size))
    + dimH(m.s.x, m.s.x + m.s.w, at(LOGO.size) + 24, String(m.s.w))
    + dimH(0, f.inset, at(LOGO.size) + 24, String(m.inset))
    + dimV(m.s.y, m.s.y + m.s.h, p - 8, String(m.s.h))
    + dimV(m.s.y, m.s.y + LOGO.unit, at(LOGO.size) + 30, String(m.unit));
  const title = ja ? 'ロゴの作図：48 の正方形、4 の格子、太さ 4 の棒五本' : 'Construction of the logo: a square of 48, a grid of 4, five bars 4 thick';
  return `<svg class="construction" viewBox="0 0 ${W} ${W}" width="${W}" height="${W}" role="img" aria-labelledby="construction-title"><title id="construction-title">${title}</title>`
    + `${shape}<g class="c-grid">${grid.join('')}</g>${dims}</svg>`;
}

/* Colours. The base is the brand's own (brand.md): background, text and accent in the light and the dark scheme. Each field
 * has one pair of its own in site.json "fields"; it is used as text on the page and on cards, and as the fill of a spine
 * whose text is the page's background colour, so every pair is measured both ways in both schemes. */
const BASE = { light: { bg: '#f7f5f0', card: '#fffdf8', fg: '#1d2330' }, dark: { bg: '#14171f', card: '#1a1e28', fg: '#e6e2d8' } };
const lum = (h) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
/* The lowest ratio of a field colour in one scheme: as text on the background and on a card, and under text of the
 * background colour (a spine). The last is the first again, but it is measured so that the table says so. */
const fieldRatio = (hex, scheme) => Math.min(ratio(hex, BASE[scheme].bg), ratio(hex, BASE[scheme].card));
const r2 = (x) => (Math.floor(x * 100) / 100).toFixed(2);

/* The type scale, the spacing and the fonts. Sizes are in rem, so a reader's larger text enlarges every one of them.
 * The names are short because the style is in every page, and every page must stay under 100,000 bytes. */
const TYPE = { '--t1': '.78rem', '--t2': '.88rem', '--t3': '1rem', '--t4': '1.18rem', '--t5': '1.75rem' };
const SPACE = { '--s1': '.25rem', '--s2': '.5rem', '--s3': '.75rem', '--s4': '1rem', '--s5': '1.5rem', '--s6': '2rem' };
const FONTS = {
  '--serif': 'Georgia,"Times New Roman","Hiragino Mincho ProN","Yu Mincho",serif',
  '--sans': 'system-ui,-apple-system,"Segoe UI","Hiragino Sans","Yu Gothic UI",Meiryo,sans-serif',
  '--mono': 'ui-monospace,Menlo,Consolas,monospace',
};

/* The CSS of the design, added after the site's own, without spaces it does not need. The core goes on every page; the
 * shelf part (part 'shelf') only on the pages that use it, each page's CSP naming the hash of the style it carries. Field colours are variables named
 * --f-<code>, set for both schemes; an element of a field (class f-<code>) takes its colour as --f-c. --ink is the text on a
 * spine, the page's background colour. */
function css(fields, part = 'core') {
  const F = Object.values(fields);
  const vars = (scheme) => F.map((f) => `.f-${f.code.toLowerCase()}{--f-c:${f[scheme]}}`).join('');
  const tokens = Object.entries(Object.assign({}, TYPE, SPACE, FONTS)).map(([k, v]) => `${k}:${v};`).join('');
  if (part === 'core') return [
    '/* design.js */',
    `:root{${tokens}--ink:${BASE.light.bg}}${vars('light')}`,
    `@media (prefers-color-scheme:dark){:root{--ink:${BASE.dark.bg}}${vars('dark')}}`,
    'h1{font-size:var(--t5)}h2{font-size:var(--t4)}',
    'nav,.meta,.crumbs,.flag,.fields,.toc,footer,.search,.mark,.shelf,.card dt,.lang{font-family:var(--sans)}.mark .code,.sm,.no{font-family:var(--mono)}',
    '.band{display:block;width:100%}.band .board{fill:var(--rule)}.band [class^=f-]{fill:var(--f-c)}',
    '.mark{display:inline-flex;align-items:center;gap:.3rem;border:1px solid var(--f-c,var(--rule));color:var(--f-c,var(--fg));padding:0 .45rem;margin-left:.4rem;font-size:var(--t1);white-space:nowrap}',
    '.glyph{width:.85em;height:.85em;fill:none;stroke:currentColor;stroke-width:1.5;flex:none}.glyph .dot{fill:currentColor;stroke:none}',
    '.glyphs{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:var(--s2) var(--s4)}@media print{.band{display:none}}',
  ].join('\n') + '\n';
  /* The rest is needed only by the pages that show a shelf, a catalogue card, the register or the construction drawing. */
  return [
    '/* design.js: shelf */',
    '.shelf{list-style:none;padding:0;margin:var(--s4) 0 var(--s5);display:flex;flex-wrap:wrap;align-items:flex-end}',
    '.shelf li{padding:var(--s2) .15rem 0;border-bottom:.45rem solid var(--muted)}',
    '.shelf a{display:flex;flex-direction:column;align-items:center;gap:var(--s2);width:2.6rem;height:17rem;padding:var(--s2) 0;background:var(--f-c);color:var(--ink);text-decoration:none;overflow:hidden;border-radius:2px 2px 0 0}',
    '.w2 a{width:3.1rem}.w3 a{width:3.7rem}.h2 a{height:18.5rem}.h3 a{height:16rem}.sm{display:contents}',
    '.shelf .code{order:1;font-size:var(--t1);font-weight:bold}.shelf .dot{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}',
    '.shelf .t,.sid,.wd{writing-mode:vertical-rl;white-space:nowrap}.shelf .t{order:2;flex:1 1 auto;min-height:0;overflow:hidden;text-overflow:ellipsis;font-family:var(--serif);font-size:var(--t2);line-height:1.2}',
    '.sid,.wd{order:3;font-size:var(--t1)}.wd{order:4;text-transform:uppercase;letter-spacing:.08em}',
    '.shelf .withdrawn a{background:var(--card);color:var(--muted);border:2px dashed var(--f-c)}',
    '.card{position:relative;background:var(--card);border:1px solid var(--rule);border-top:4px solid var(--f-c,var(--accent));padding:var(--s4) var(--s5) var(--s6);margin:var(--s5) 0}',
    '.card h2{border:0;margin-top:0;font:bold var(--t3) var(--sans);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}',
    '.card dl{display:grid;grid-template-columns:minmax(6rem,max-content) minmax(0,1fr);gap:var(--s1) var(--s4);margin:0}.card dt{color:var(--muted);font-size:var(--t2)}.card dd{margin:0;overflow-wrap:anywhere;border-bottom:1px dotted var(--rule)}',
    '.hole{position:absolute;left:50%;bottom:var(--s2);width:.9rem;height:.9rem;margin-left:-.45rem;border:1px solid var(--rule);border-radius:50%;background:var(--bg)}',
    '.register th,.register td:not(:nth-child(4)){white-space:nowrap}',
    '.construction{display:block;width:100%;max-width:24rem;height:auto;margin:var(--s4) 0}.c-grid{stroke:var(--muted);stroke-width:.75;stroke-opacity:.5}.c-ink{stroke:var(--rule)}.c-dim{stroke:var(--fg)}.c-num{fill:var(--fg);font:13px var(--mono)}',
    '@media (max-width:40rem){.card{padding:var(--s3) var(--s4) var(--s6)}.card dl{grid-template-columns:minmax(0,1fr)}}',
    '@media print{.shelf{display:none}.card{background:none;border:1px solid #000;border-top:3px solid #000;break-inside:avoid}}',
  ].join('\n') + '\n';
}

module.exports = { LOGO, logoSvg, logoMeasures, GLYPH, GLYPHS, GLYPH_SHAPES, GLYPH_SHAPES_JA, glyphSvg, BAND, bandSvg, CONSTRUCTION, constructionSvg, BASE, lum, ratio, fieldRatio, r2, TYPE, SPACE, FONTS, css };
