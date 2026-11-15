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
  /* The entrance of the two top pages. It names only the site's tokens and the field colours: no colour of its own. */
  if (part === 'entrance') return [
    '/* design.js: entrance */',
    /* The header of the top pages: the logo beside the name, on the colour of a card, over a board. */
    'header.top{background:var(--card);border-bottom:4px solid var(--rule)}.brand{display:inline-flex;align-items:center;gap:var(--s3)}.brand .logo{width:2.6rem;height:2.6rem;flex:none}',
    '.entrance{margin:0 0 var(--s6)}.entrance h1{font-size:clamp(2.4rem,10vw,3.2rem);font-weight:normal;line-height:1.1;letter-spacing:.03em;margin:0 0 var(--s3)}',
    '.rule{display:block;margin:0 0 var(--s4)}.rule [class^=f-]{fill:var(--f-c)}.rule .line{fill:var(--muted)}',
    '.statement{font-size:var(--t4);line-height:1.5;margin:0 0 var(--s5);max-width:34rem}',
    '.emblems{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));max-width:36rem;margin:0;padding:0}.emblems figure{margin:0;min-width:0}',
    '.em{display:block;width:100%;height:auto;border-bottom:.45rem solid var(--muted);padding:0 4%}',
    '.em [class^=f-]{fill:var(--f-c);stroke:var(--f-c)}.em rect[class^=f-]{stroke:none}.em .wd{fill:none;stroke-width:1;stroke-dasharray:2 1.5}.em .end{fill:var(--muted)}',
    '.em .gl{fill:none;stroke-width:2}.em .dot{fill:var(--f-c);stroke:none}.em text{font:10px var(--mono);stroke:none}',
    '.em .cd{fill:var(--card);stroke:var(--muted)}.em .tb{fill:var(--accent)}.em .ln{fill:var(--rule)}.em .n{font:bold 20px var(--mono);fill:var(--fg)}.em .hl{fill:var(--bg);stroke:var(--muted)}',
    '.emblems figcaption{font:var(--t1)/1.45 var(--sans);color:var(--muted);padding:var(--s2) var(--s3) 0 0;overflow-wrap:anywhere}.emblems figcaption b{display:block;color:var(--fg)}',
    '.about h2 a{color:inherit}.about dd p{margin:0 0 var(--s1)}.about dd p:last-child{margin:0}.about .notes a{display:block}',
    'main>h2{border-bottom:1px solid var(--rule);padding-bottom:var(--s1)}.jalinks{columns:2 15rem;column-gap:var(--s6);padding-left:1.2rem}',
    '@media (min-width:40rem){.emblems figcaption{font-size:var(--t2)}}@media print{.em{border-bottom-color:#000}}',
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

/* The entrance of the two top pages (2026-11-15): under the name, a rule; then three emblems standing on one board, each
 * with a caption that says what it is. Everything is drawn here from numbers and from the records, as the rest of the design.
 * - The rule: the five spines of the band, once, and a board running on from them.
 * - The shelf: one spine per record shown, in the colour of its field, a withdrawn one outlined, between two bookends. The
 *   width of a spine follows the pages of its last PDF copy and its height the length of its title, as on the shelf of the
 *   page; neither says anything of the work. With many records the spines narrow so that all of them stay on the board.
 * - The fields: the five glyphs set round a centre, each with its code.
 * - The card: a catalogue card with the number of entries in the accession register.
 * The three stand on one board, the lower edge of the row (CSS). A shape drawn in outline says so in its own attributes, so that
 * it stays an outline without CSS. Each emblem is decoration beside its caption (aria-hidden), and still has a title. The
 * entrance uses the site's colour tokens and the field colours only: it adds no colour of its own. */
const ENTRANCE = {
  view: { w: 120, h: 84 },
  rule: { length: 168 },
  shelf: { left: 6, right: 114, board: 84, gap: 2.5, end: { w: 7, h: 26 }, width: { w1: 9, w2: 11, w3: 13 }, height: { h1: 60, h2: 68, h3: 52 } },
  fields: { cx: 60, cy: 39, r: 28, glyph: 18, text: 10 },
  card: { x: 14, y: 22, w: 92, h: 62, band: 4, lines: [44, 56, 68], hole: 3 },
};
const fix = (v) => String(Math.round(v * 100) / 100);
/* The size of a spine from the record: pages of the last PDF copy, and the length of the title. */
const spineSize = (pages, titleLength) => [pages >= 40 ? 'w3' : pages >= 15 ? 'w2' : 'w1', titleLength < 60 ? 'h3' : titleLength < 110 ? 'h1' : 'h2'];

function ruleSvg() {
  const m = logoMeasures(), u = LOGO.unit, g = BAND.gap, top = Math.max(...m.lengths) * BAND.scale, L = ENTRANCE.rule.length;
  const spines = m.lengths.map((len, i) => `<rect x="${i * (u + g)}" y="${fix(top - len * BAND.scale)}" width="${u}" height="${fix(len * BAND.scale)}" class="f-${BAND.order[i].toLowerCase()}"/>`).join('');
  const x = m.lengths.length * (u + g);
  return `<svg class="rule" width="${L}" height="${fix(top + BAND.board)}" aria-hidden="true" focusable="false"><title>Five spines and a board</title>${spines}`
    + `<rect x="${x}" y="${fix(top)}" width="${L - x}" height="${BAND.board}" class="line"/></svg>`;
}

/* items: the records shown, in the order of the shelf, as { code, pages, titleLength, withdrawn }. */
function shelfEmblem(items) {
  const V = ENTRANCE.view, S = ENTRANCE.shelf, E = S.end;
  const sizes = items.map((p) => spineSize(p.pages || 0, p.titleLength || 0));
  const raw = sizes.reduce((t, [w]) => t + S.width[w], 0) + S.gap * Math.max(0, items.length - 1);
  const room = S.right - S.left - 2 * (E.w + S.gap);
  const k = raw > room ? room / raw : 1;
  const total = raw * k;
  let x = (V.w - total) / 2;
  const spines = items.map((p, i) => {
    const w = S.width[sizes[i][0]] * k, h = S.height[sizes[i][1]], y = S.board - h;
    const r = p.withdrawn
      ? `<rect x="${fix(x + 0.5)}" y="${fix(y + 0.5)}" width="${fix(Math.max(w - 1, 0.5))}" height="${fix(h - 1)}" fill="none" stroke="currentColor" class="f-${p.code.toLowerCase()} wd"/>`
      : `<rect x="${fix(x)}" y="${y}" width="${fix(w)}" height="${h}" class="f-${p.code.toLowerCase()}"/>`;
    x += w + S.gap * k;
    return r;
  }).join('');
  const a = (V.w - total) / 2 - S.gap - E.w, b = (V.w + total) / 2 + S.gap;
  const ends = `<polygon points="${fix(a + E.w)},${S.board} ${fix(a + E.w)},${S.board - E.h} ${fix(a)},${S.board}" class="end"/>`
    + `<polygon points="${fix(b)},${S.board} ${fix(b)},${S.board - E.h} ${fix(b + E.w)},${S.board}" class="end"/>`;
  return `<svg class="em" viewBox="0 0 ${V.w} ${V.h}" width="${V.w}" height="${V.h}" aria-hidden="true" focusable="false"><title>The shelf: ${items.length} ${items.length === 1 ? 'spine' : 'spines'}</title>`
    + spines + ends + '</svg>';
}

/* codes: the field codes in the order of site.json. */
function fieldsEmblem(codes) {
  const V = ENTRANCE.view, F = ENTRANCE.fields, n = codes.length, s = F.glyph / GLYPH.box;
  const marks = codes.map((c, i) => {
    const t = (-90 + (360 / n) * i) * Math.PI / 180, x = F.cx + F.r * Math.cos(t), y = F.cy + F.r * Math.sin(t);
    /* The glyph of design.js, moved and scaled into place: each coordinate is computed, so the shapes need no transform. */
    const X = (v) => fix(x - F.glyph / 2 + v * s), Y = (v) => fix(y - F.glyph / 2 + v * s);
    const place = (tag, a) => {
      const b = {};
      for (const [k, v] of Object.entries(a)) {
        b[k] = k === 'points' ? v.split(' ').map((pt) => { const [px, py] = pt.split(',').map(Number); return X(px) + ',' + Y(py); }).join(' ')
          : ['x', 'cx'].includes(k) ? X(v) : ['y', 'cy'].includes(k) ? Y(v) : ['r', 'width', 'height'].includes(k) ? fix(v * s) : v;
      }
      return `<${tag}${attrs(b)}/>`;
    };
    return `<g class="f-${c.toLowerCase()}">` + GLYPHS[c].map(([tag, a]) => place(tag, Object.assign({ class: 'gl' }, a, a.class === 'dot' ? { fill: 'currentColor' } : { fill: 'none', stroke: 'currentColor' }))).join('')
      + `<text x="${fix(x)}" y="${fix(y + F.glyph / 2 + F.text)}" text-anchor="middle">${c}</text></g>`;
  }).join('');
  return `<svg class="em" viewBox="0 0 ${V.w} ${V.h}" width="${V.w}" height="${V.h}" aria-hidden="true" focusable="false"><title>The fields: ${codes.join(', ')}</title>${marks}</svg>`;
}

/* entries: the number of entries in the accession register. */
function cardEmblem(entries) {
  const V = ENTRANCE.view, C = ENTRANCE.card;
  const lines = C.lines.map((y) => `<rect x="${C.x + 8}" y="${y}" width="${C.w - 16}" height="1" class="ln"/>`).join('');
  return `<svg class="em" viewBox="0 0 ${V.w} ${V.h}" width="${V.w}" height="${V.h}" aria-hidden="true" focusable="false"><title>The register: ${entries} ${entries === 1 ? 'entry' : 'entries'}</title>`
    + `<rect x="${C.x + 0.5}" y="${C.y + 0.5}" width="${C.w - 1}" height="${C.h - 1}" rx="2" fill="none" stroke="currentColor" class="cd"/><rect x="${C.x}" y="${C.y}" width="${C.w}" height="${C.band}" class="tb"/>${lines}`
    + `<text x="${C.x + 8}" y="${C.y + 22}" class="n">${entries}</text>`
    + `<circle cx="${C.x + C.w / 2}" cy="${C.y + C.h - 2 * C.hole}" r="${C.hole}" fill="none" stroke="currentColor" class="hl"/></svg>`;
}

module.exports = { ENTRANCE, spineSize, ruleSvg, shelfEmblem, fieldsEmblem, cardEmblem, LOGO, logoSvg, logoMeasures, GLYPH, GLYPHS, GLYPH_SHAPES, GLYPH_SHAPES_JA, glyphSvg, BAND, bandSvg, CONSTRUCTION, constructionSvg, BASE, lum, ratio, fieldRatio, r2, TYPE, SPACE, FONTS, css };
