#!/usr/bin/env node
/* Check the records, the generated site and the promises the policy makes.
 *
 *   node verification/check.js
 *
 * No dependencies. Exits non-zero if anything fails.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { build, validate, orcidOk, loadPapers, pdfLimits, ris, cslJson, related } = require('../build.js');

const ROOT = path.join(__dirname, '..');
let pass = 0;
const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  OK    ' + label + (detail ? '  ' + detail : '')); }
  else { fails.push(label); console.log('  FAIL  ' + label + (detail ? '  — ' + detail : '')); }
}
const read = (f) => fs.readFileSync(f, 'utf8');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'sophaxis-'));

/* ------------------------------------------------------------ 1 */
console.log('\n1. The published records and the site');
{
  const out = tmp();
  const r = build(out, path.join(ROOT, 'data', 'papers'));
  ok('every record in data/papers is valid', r.problems.length === 0, r.problems.join(' / '));
  if (r.problems.length === 0) {
    const site = path.join(ROOT, 'site');
    const differ = r.files.filter((f) => !fs.existsSync(path.join(site, f)) || !fs.readFileSync(path.join(site, f)).equals(fs.readFileSync(path.join(out, f))));
    ok('site/ is exactly what build.js produces (run node build.js)', differ.length === 0, differ.join(', '));
    const listed = (dir) => fs.readdirSync(dir, { recursive: true }).filter((f) => fs.statSync(path.join(dir, f)).isFile()).sort();
    const extra = listed(site).filter((f) => !r.files.includes(f.split(path.sep).join('/')));
    ok('site/ has no files that build.js does not produce', extra.length === 0, extra.join(', '));
  }
}

/* ------------------------------------------------------------ 2 */
console.log('\n2. A record page, built from the fixtures');
const FIX = tmp();
{
  const r = build(FIX, path.join(__dirname, 'fixtures', 'papers'));
  ok('the fixtures are valid', r.problems.length === 0, r.problems.join(' / '));
  const a = read(path.join(FIX, 'abs', '2026.0001.html'));
  ok('the record page says it has not been peer-reviewed', a.includes('It has not been peer-reviewed.'));
  ok('the record page says its quality is not guaranteed', a.includes('does not guarantee its quality.'));
  ok('the record page links the latest version by DOI', a.includes('href="https://doi.org/10.5281/zenodo.1234999"'));
  ok('the record page lists every version', a.includes('>v1<') && a.includes('>v2<'));
  ok('the versions table has column headers and its own scroll box, so a long DOI never widens the page', a.includes('<div class="table"><table><tr><th scope="col">Version</th>') && !/<th>/.test(a));
  ok('the record page shows the language-model statement', a.includes('Use of language models and other generative models') && a.includes('the authors checked every claim'));
  ok('the record page gives a BibTeX entry with the DOI', /@misc\{doe2026sophaxis20260001,[\s\S]*doi\s+= \{10\.5281\/zenodo\.1234999\}/.test(a));
  ok('the operator’s own submission is marked', a.includes('operator’s own submission'));
  ok('notes and corrections are shown with their date', a.includes('2026-12-02') && a.includes('Notes and corrections'));
  ok('the ORCID iD links to orcid.org', a.includes('href="https://orcid.org/0000-0002-1825-0097"'));
  const w = read(path.join(FIX, 'abs', '2026.0002.html'));
  ok('a withdrawn record keeps its page with a notice that gives the date, the reason and the Withdrawal Policy', w.includes('<b>Withdrawn on 2026-11-20.</b> The author found an error in the main proof.')
    && w.includes('citations do not break') && w.includes('href="../policies/withdrawal.html"'));
  const i = read(path.join(FIX, 'index.html'));
  ok('the listing shows the most recently updated first', i.indexOf('2026.0001') >= 0 && i.indexOf('2026.0001') < i.indexOf('2026.0002'));
  ok('the listing marks the withdrawn record', i.includes('>withdrawn<'));
  ok('the listing and every footer say that quality is not guaranteed', i.includes('The quality of listed work is not guaranteed.') && i.includes('the quality of listed work is not guaranteed.</p>') && a.includes('the quality of listed work is not guaranteed.</p>'));
}

/* ------------------------------------------------------------ 3 */
console.log('\n3. Validation refuses broken records');
{
  const good = JSON.parse(read(path.join(__dirname, 'fixtures', 'papers', '2026.0001.json')));
  const cases = [
    ['an invalid DOI', (p) => { p.versions[0].doi = 'zenodo.1234567'; }],
    ['a DOI outside the accepted repositories', (p) => { p.versions[0].doi = '10.1234/example'; }],
    ['a language model as an author', (p) => { p.authors.push({ name: 'Claude' }); }],
    ['an image generator as an author', (p) => { p.authors.push({ name: 'Midjourney' }); }],
    ['a missing language-model statement', (p) => { p.llm_disclosure = ''; }],
    ['a token language-model statement', (p) => { p.llm_disclosure = 'None.'; }],
    ['a licence that is not accepted', (p) => { p.license = 'CC-BY-NC-4.0'; }],
    ['an unknown category', (p) => { p.category = 'physics'; }],
    ['an invalid ORCID iD', (p) => { p.authors[0].orcid = '0000-0002-1825-0098'; }],
    ['versions out of order', (p) => { p.versions[1].date = '2026-10-01'; }],
    ['versions misnumbered', (p) => { p.versions[1].version = 3; }],
    ['a withdrawal without a note', (p) => { p.status = 'withdrawn'; delete p.withdrawal_note; }],
    ['a file name that is not the id', (p) => { p.id = '2026.0009'; }],
    ['a missing submission issue', (p) => { delete p.issue; }],
  ];
  cases.forEach(([label, spoil]) => {
    const p = JSON.parse(JSON.stringify(good));
    spoil(p);
    ok('refuses ' + label, validate(p, '2026.0001.json').length > 0);
  });
  [
    ['OSF Preprints', '10.31219/osf.io/3sj5u'],
    ['arXiv', '10.48550/arXiv.2202.01037'],
    ['Preprints.org', '10.20944/preprints201605.0001.v1'],
    ['SSRN', '10.2139/ssrn.7537983'],
    ['Research Square', '10.21203/rs.3.rs-39251/v1'],
  ].forEach(([name, doi]) => {
    const p = JSON.parse(JSON.stringify(good));
    p.versions[1].doi = doi;
    ok('accepts a DOI from ' + name, validate(p, '2026.0001.json').length === 0);
  });
  const bio = JSON.parse(JSON.stringify(good));
  bio.versions[1].doi = '10.1101/2020.03.01.123456';
  ok('refuses a bioRxiv or medRxiv DOI (out of scope)', validate(bio, '2026.0001.json').length > 0);
  const psy = JSON.parse(JSON.stringify(good));
  psy.versions[1].doi = '10.31234/osf.io/3sj5u';
  ok('refuses a DOI from another service hosted on OSF', validate(psy, '2026.0001.json').length > 0);
  ok('the ORCID checksum accepts a valid iD', orcidOk('0000-0002-1825-0097'));
  const twice = fs.mkdtempSync(path.join(os.tmpdir(), 'sophaxis-twice-'));
  fs.mkdirSync(path.join(twice, 'papers'));
  const copy = JSON.parse(JSON.stringify(good));
  fs.writeFileSync(path.join(twice, 'papers', '2026.0001.json'), JSON.stringify(Object.assign({}, copy, { pdfs: undefined })));
  fs.writeFileSync(path.join(twice, 'papers', '2026.0002.json'), JSON.stringify(Object.assign({}, copy, { id: '2026.0002', pdfs: undefined })));
  ok('refuses the same DOI in two records', build(fs.mkdtempSync(path.join(os.tmpdir(), 'sophaxis-')), path.join(twice, 'papers')).problems.some((x) => x.includes('is in both 2026.0001 and 2026.0002')));
  ok('the ORCID checksum accepts an iD ending in X', orcidOk('0000-0002-9079-593X'));
}

/* ------------------------------------------------------------ 4 */
console.log('\n4. The policy keeps its promises in writing');
{
  /* The promises are checked across the policy index and the eight policies, wherever each one lives. */
  const policy = [read(path.join(ROOT, 'policy.md'))].concat(fs.readdirSync(path.join(ROOT, 'policies')).sort().map((f) => read(path.join(ROOT, 'policies', f)))).join('\n');
  [
    'Acceptance is moderation, not peer review.',
    'Sophaxis charges nothing, to authors or to readers.',
    'It will not start charging.',
    'Work written or developed with language models is accepted, on one condition: the use is disclosed.',
    'A language model cannot be listed as an author.',
    'The same condition applies to every other generative model, including models that produce images, figures, audio or code.',
    'No other generative model can be listed as an author either.',
    'If no generative model was used, the statement says so.',
    'Records are not deleted.',
    'Each week, Sophaxis asks the Internet Archive to save its pages and the PDF copies, so that they stay readable even if this site goes away.',
    'Each week, an automatic check confirms that every listed DOI still resolves and still carries the licence in the record.',
    'The operator also asks the Internet Archive to exclude its earlier copies of the record.',
    'A work is listed once, under one Sophaxis id.',
    'That id is never given to another work, even after a record is withdrawn or removed.',
    'Every author of the work agrees to its listing on Sophaxis.',
    'The authors have the right to share this version under its licence; if a journal has published the work, the publisher allows it.',
    'Work that a journal has already published may be submitted only in a version that the authors may share under such a licence.',
    'Sophaxis asks for no transfer of copyright and no exclusive licence.',
    'It does not run plagiarism checks.',
    'The operator then looks at the submission once more, and that decision is final.',
    'These terms are governed by the laws of Japan.',
    'To the extent the law allows, the operator is not liable for loss that arises from using the site or relying on listed work.',
    'If Sophaxis closes, the operator will keep the repository with every record public, so that the records stay readable.',
    'A request that cannot be made in public goes by email to the address on the operator\'s [ORCID record](https://orcid.org/0009-0000-1406-0547).',
    'For personal data and other serious harm, the abstract and the PDF copy are taken offline at once, before the decision.',
    'The address keeps working, so that citations lead to the notice instead of to nothing.',
    'Vercel processes each request, including the IP address, in order to serve the page, under its own privacy policy.',
    'The operator\'s address is not published; it is given on request, without delay.',
    'A person can ask for access to, correction of, suspension of the use of, or deletion of their personal data held by Sophaxis, through a removal issue that names only the Sophaxis id and the kind of request, or by email to the address on the operator\'s [ORCID record](https://orcid.org/0009-0000-1406-0547).',
    'Sophaxis keeps an unmodified copy of the PDF of each listed version, so that search engines can index the full text.',
    'Authors can ask for the copy to be removed; the record then links to the repository only.',
    'For OSF Preprints, Preprints.org and SSRN, the authors can attach the deposited PDF to their submission issue.',
    'Sophaxis then keeps that file unmodified, and the record says that the authors provided it.',
    'When a deposit holds more than one PDF, Sophaxis does not guess which one is the paper, and makes no copy.',
    'Sophaxis does not control whether or when a search engine indexes a page.',
    'Sophaxis does not guarantee the quality of any listed work.',
    'Only an author of a work can submit it.',
    'A submission that does not pass both is not listed.',
    'It is not an official identity check.',
    'Email addresses and other details in an ORCID record are not read.',
    'It is shown under the work\'s own licence, with its authors and a link to the work.',
    'On arXiv, choose CC BY 4.0, CC BY-SA 4.0 or CC0 1.0 when you submit; the arXiv non-exclusive licence is not accepted.',
    'Work on SSRN is accepted only if it carries one of the accepted licences.',
    'The Sophaxis site sets no cookies, runs no analytics and loads nothing from other servers.',
    'It reads the list of records from Sophaxis and searches it in your browser, and it sends nothing anywhere.',
    'No other page runs a script.',
    'Authors without one have no such page, because a name alone can belong to several people.',
    'Submissions by the operator are moderated under the same rules',
    'Claude is not an author.',
  ].forEach((s) => ok('policy says: ' + s.slice(0, 60), policy.includes(s)));
  const form = read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'submission.yml'));
  ok('the submission form requires the language-model statement', /id: llm[\s\S]*?required: true/.test(form));
  ok('the submission form asks about every generative model, not only language models', form.includes('label: Use of language models and other generative models') && form.includes('This covers every generative model, not only language models.'));
  ok('the submission form warns that the issue is public', form.includes('This issue is public.'));
  /* Sophaxis charges nothing, but it is run by one person, not by a community: it does not call itself diamond open access. */
  const claims = [policy, read(path.join(ROOT, 'README.md'))].concat(fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html')).map((f) => read(path.join(ROOT, 'site', f))));
  ok('nothing calls Sophaxis diamond open access', claims.every((t) => !/diamond|ダイヤモンド/i.test(t)));
  const repos = Object.entries(JSON.parse(read(path.join(ROOT, 'site.json'))).repositories);
  const submit = read(path.join(ROOT, 'site', 'submit.html'));
  ok('the policy, the form and the submit page name every accepted repository', repos.every(([pre, name]) => policy.includes(name) && form.includes(name) && form.includes(pre) && submit.includes(name)), repos.map(([, n]) => n).join(', '));
  /* The two field lists in the form must match site.json, so that every field can be chosen and nothing else. */
  const cats = Object.values(JSON.parse(read(path.join(ROOT, 'site.json'))).categories);
  const lists = [/id: category[\s\S]*?options:\n((?: {8}- .*\n)+)/, /id: others[\s\S]*?options:\n((?: {8}- .*\n)+)/].map((re) => ((re.exec(form) || [])[1] || '').trim().split('\n').map((l) => l.replace(/^\s*- /, '')));
  ok('both field lists in the submission form match the fields of the site', lists.every((l) => l.join('|') === cats.join('|')), lists.map((l) => l.join(',')).join(' / '));
  ok('the scope in the policy names every field', cats.every((c) => policy.toLowerCase().includes(c.toLowerCase())));
  ok('the submission form names only the accepted licences', ['CC BY 4.0', 'CC BY-SA 4.0', 'CC0 1.0'].every((l) => form.includes(l)) && !form.includes('NC'));
  ok('the submission form asks for the DOI and the ORCID iD, and no longer for the title or the authors', /id: doi[\s\S]*?required: true/.test(form) && /id: orcid[\s\S]*?required: true/.test(form) && !/id: (title|authors|license)\b/.test(form));
}

/* ------------------------------------------------------------ 5 */
console.log('\n5. Every page: no requests to other servers, valid CSP, links that resolve');
{
  for (const [label, dir] of [['site', path.join(ROOT, 'site')], ['fixtures', FIX]]) {
    const pages = fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.html'));
    const bad = [];
    pages.forEach((f) => {
      const h = read(path.join(dir, f));
      const csp = (/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(h) || [])[1] || '';
      if (!csp.startsWith("default-src 'none'")) bad.push(f + ': CSP');
      if (csp.includes("'unsafe-inline'")) bad.push(f + ': unsafe-inline');
      const styles = [...h.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
      styles.forEach((s) => { if (!csp.includes("'sha256-" + crypto.createHash('sha256').update(s).digest('base64') + "'")) bad.push(f + ': style hash'); });
      /* One script on the whole site: search.js, on search.html only, from this site, with a CSP that allows nothing more. */
      const scripts = h.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
      if (f === 'search.html') {
        if (scripts.length !== 1 || scripts[0] !== '<script src="./search.js" defer></script>') bad.push(f + ': only search.js may run');
        if (!/script-src 'self'; connect-src 'self';/.test(csp) || /unsafe-(inline|eval)/.test(csp)) bad.push(f + ': search CSP');
      } else if (scripts.length || /<script/i.test(h) || csp.includes('script-src')) bad.push(f + ': script');
      /* A microdata <link itemprop> only states a value; the browser fetches nothing for it.
       * Nor for a language alternate, which Google wants as a full URL; only Sophaxis's own are let through. */
      if (/<(img|link|iframe)[^>]+(src|href)="https?:/i.test(h.replace(/<link rel="canonical"[^>]*>/, '').replace(/<link itemprop="[a-zA-Z]+" href="[^"]*">/g, '')
        .replace(/<link rel="alternate" hreflang="[a-z]{2}" href="https:\/\/sophaxis\.vercel\.app\/[^"]*">/g, ''))) bad.push(f + ': external load');
      [...h.matchAll(/href="(\/[^"#]*)"/g)].forEach((m) => { if (!fs.existsSync(path.join(dir, m[1]))) bad.push(f + ': broken link ' + m[1]); });
      [...h.matchAll(/href="(\.{1,2}\/[^"#]+)"/g)].forEach((m) => {
        const target = path.resolve(path.dirname(path.join(dir, f)), m[1]);
        if (!fs.existsSync(target)) bad.push(f + ': broken link ' + m[1]);
      });
    });
    ok(label + ': ' + pages.length + ' pages pass', pages.length > 0 && bad.length === 0, bad.join(' / '));
  }
}

/* ------------------------------------------------------------ 6 */
console.log('\n6. The logo and the share card');
{
  const svg = read(path.join(ROOT, 'assets', 'favicon.svg'));
  const tags = [...svg.matchAll(/<([a-z]+)[\s>]/g)].map((m) => m[1]);
  ok('the logo is drawn from rectangles and polygons only, with no text', tags.every((t) => ['svg', 'title', 'rect', 'polygon'].includes(t)), tags.join(' '));
  const png = fs.readFileSync(path.join(ROOT, 'assets', 'og.png'));
  const isPng = png.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  ok('the share card is a square PNG of 600 × 600', isPng && png.readUInt32BE(16) === 600 && png.readUInt32BE(20) === 600);
  const pngSize = (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? b.readUInt32BE(16) + 'x' + b.readUInt32BE(20) : 'not a PNG';
  const ico = fs.readFileSync(path.join(ROOT, 'assets', 'favicon.ico'));
  const icoSizes = ico.readUInt16LE(0) === 0 && ico.readUInt16LE(2) === 1
    ? Array.from({ length: ico.readUInt16LE(4) }, (_, i) => {
      const e = 6 + 16 * i;
      return pngSize(ico.subarray(ico.readUInt32LE(e + 12), ico.readUInt32LE(e + 12) + ico.readUInt32LE(e + 8)));
    }) : [];
  ok('the ICO holds the logo at 16, 32 and 48 px', icoSizes.join(' ') === '16x16 32x32 48x48', icoSizes.join(' '));
  ok('the PNG logos are 192 × 192 and 180 × 180',
    pngSize(fs.readFileSync(path.join(ROOT, 'assets', 'favicon-192.png'))) === '192x192'
    && pngSize(fs.readFileSync(path.join(ROOT, 'assets', 'apple-touch-icon.png'))) === '180x180');
  const pages = fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html'));
  const noPixels = pages.filter((f) => {
    const h = read(path.join(ROOT, 'site', f));
    return !/<link rel="icon" href="(\.\.\/|\.\/|\/)favicon\.ico" sizes="48x48">/.test(h)
      || !/<link rel="icon" href="(\.\.\/|\.\/|\/)favicon-192\.png" sizes="192x192" type="image\/png">/.test(h)
      || !/<link rel="apple-touch-icon" href="(\.\.\/|\.\/|\/)apple-touch-icon\.png">/.test(h);
  });
  ok('every page links the logo as ICO and PNG too, for search results', pages.length > 0 && noPixels.length === 0, noPixels.join(', '));
  ok('the ICO and the PNG logos are served from the root of the site',
    ['favicon.ico', 'favicon-192.png', 'apple-touch-icon.png'].every((f) => fs.existsSync(path.join(ROOT, 'site', f))));
  const missing = pages.filter((f) => {
    const h = read(path.join(ROOT, 'site', f));
    return !/<link rel="icon" href="(\.\.\/|\.\/|\/)favicon\.svg" type="image\/svg\+xml">/.test(h)
      || !h.includes('<meta property="og:image" content="https://sophaxis.vercel.app/og.png">');
  });
  ok('every page links the logo and the share card', pages.length > 0 && missing.length === 0, missing.join(', '));
}

/* ------------------------------------------------------------ 7 */
console.log('\n7. Search engines see the site as Sophaxis');
{
  const i = read(path.join(ROOT, 'site', 'index.html'));
  ok('the top page carries the Google Search Console verification tag, and no other page does', i.includes('<meta name="google-site-verification" content="UEPpX5mfnLlhOBTBTETu-PmRO_Y4L2SmjEiaq_U1Zf8">')
    && !read(path.join(ROOT, 'site', 'submit.html')).includes('google-site-verification'));
  ok('the top page is titled Sophaxis', i.includes('<title>Sophaxis</title>') && i.includes('<meta property="og:title" content="Sophaxis">'));
  ok('the top page names the site in WebSite microdata', /itemscope itemtype="https:\/\/schema\.org\/WebSite"><meta itemprop="name" content="Sophaxis">\s*<a class="brand" href="\.\/" itemprop="url">/.test(i));
  const pages = fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html'));
  const missing = pages.filter((f) => !read(path.join(ROOT, 'site', f)).includes('<meta property="og:site_name" content="Sophaxis">'));
  ok('every page gives Sophaxis as the site name', pages.length > 0 && missing.length === 0, missing.join(', '));
}

/* ------------------------------------------------------------ 8 */
console.log('\n8. Readers can choose a field');
{
  const cats = Object.keys(JSON.parse(read(path.join(ROOT, 'site.json'))).categories);
  const i = read(path.join(FIX, 'index.html'));
  ok('the listing offers every field and all fields', i.includes('href="./index.html" aria-current="page">All fields (2)<') && cats.every((c) => i.includes('href="./list/' + c + '.html"')));
  ok('every field has its own page, in the site and the sitemap', cats.every((c) => fs.existsSync(path.join(ROOT, 'site', 'list', c + '.html')) && read(path.join(ROOT, 'site', 'sitemap.xml')).includes('/list/' + c + '.html<')));
  const pm = read(path.join(FIX, 'list', 'philosophy-of-mathematics.html'));
  ok('a field page lists only its own records', pm.includes('2026.0001') && !pm.includes('2026.0002'));
  ok('a field page marks its own field as current', pm.includes('href="../list/philosophy-of-mathematics.html" aria-current="page">Philosophy of Mathematics (1)<') && (pm.match(/aria-current="page"/g) || []).length === 1);
  const empty = read(path.join(FIX, 'list', 'mathematics.html'));
  ok('an empty field says so', empty.includes('No preprints are listed in this field yet.'));
  const a = read(path.join(FIX, 'abs', '2026.0001.html'));
  ok('a record page links its field', a.includes('<a href="../list/philosophy-of-mathematics.html">Philosophy of Mathematics</a>'));
}

/* ------------------------------------------------------------ 9 */
console.log('\n9. Submission by DOI, and the check that the submitter is an author');
{
  const I = require('../tools/intake.js');
  const fx = (f) => path.join(__dirname, 'fixtures', 'intake', f);
  const json = (f) => JSON.parse(read(fx(f)));
  const form = I.parseIssue(read(fx('issue.md')));
  ok('the issue form is read: DOI, ORCID iD, category and statement', form.doi === '10.6084/m9.figshare.1234567.v1' && form.orcid === '0000-0002-1825-0097'
    && form.category === 'philosophy-of-mathematics' && form.update === '' && form.llm.startsWith('No language model'));
  ok('other categories are read, without the main one', form.others.join() === 'logic,mathematics');

  const dc = I.fromDataCite(json('datacite.json'));
  ok('DataCite metadata: title, authors with ORCID iD, licence and date', dc.title === 'A Fixture on Cyclic Operators' && dc.authors.length === 2
    && dc.authors[0].orcid === '0000-0002-1825-0097' && dc.authors[1].name === 'Jane Roe' && dc.licences[0] === 'CC-BY-4.0' && dc.date === '2026-11-03');
  ok('the abstract keeps "δ < 1/φ" and loses the markup, even when escaped twice', dc.abstract === 'The threshold is δ < 1/φ, and 2 > 1 for this fixture.', dc.abstract);
  const cr = I.fromCrossref(json('crossref.json'));
  ok('Crossref metadata: markup removed, licence from its URL, full date when "posted" has only a year', cr.title === 'Introducing Fixtures: A Note'
    && cr.abstract === 'A fixture abstract about modal logic.' && cr.licences[0] === 'CC-BY-SA-4.0' && cr.date === '2026-11-05' && cr.authors[1].orcid === '0000-0002-1825-0097');
  ok('keywords come from the metadata, without broad classification schemes or repeats', dc.keywords.join('|') === 'Repeated games|Golden ratio' && cr.keywords.join('|') === 'Logic|Philosophy');
  ok('licences outside the three are not mapped', I.licenceOf('https://creativecommons.org/licenses/by-nc/4.0/') === null && I.licenceOf('cc-by-nd-4.0') === null);

  const person = I.orcidPerson(json('orcid-person.json'));
  const works = I.orcidDois(json('orcid-works.json'));
  const base = { form, login: 'jcarberry', meta: dc, person, works };
  const run = (o) => I.check(Object.assign({}, base, o));
  const failed = (r) => r.checks.filter((c) => !c[1]).map((c) => c[0]);
  ok('verified: the DOI metadata lists the ORCID iD, and the ORCID record links the GitHub account', run({}).ok, failed(run({})).join('; '));
  ok('not verified when the issue is opened by another GitHub account', !run({ login: 'someone-else' }).ok);
  ['https://github.com/jcarberry-evil', 'https://evil.example/github.com/jcarberry', 'https://github.com/jcarberry/repo', 'https://github.com.evil.example/jcarberry']
    .forEach((u) => ok('a link that only resembles the account is refused: ' + u, !I.linksGithub([u], 'jcarberry')));
  ok('the GitHub login is compared without regard to case', I.linksGithub(['https://github.com/JCarberry/'], 'jcarberry'));
  const noLink = Object.assign({}, person, { urls: ['https://example.org/carberry'] });
  ok('not verified when the ORCID record does not link GitHub', !run({ person: noLink }).ok);
  const anon = Object.assign({}, dc, { authors: dc.authors.map((a) => Object.assign({}, a, { orcid: null })) });
  ok('not verified when neither the metadata nor the ORCID works connect the iD to the work', !run({ meta: anon }).ok);
  const claimed = new Set([...works, '10.6084/m9.figshare.1234567.v1']);
  ok('verified through the ORCID works when the name matches an author', run({ meta: anon, works: claimed }).ok);
  ok('not verified through the ORCID works when no author has that name', !run({ meta: anon, works: claimed, person: Object.assign({}, person, { family: 'Someone' }) }).ok);
  ok('not verified without an accepted licence', !run({ meta: Object.assign({}, dc, { licences: [] }) }).ok);
  ok('not verified for a DOI outside the accepted repositories', !run({ form: Object.assign({}, form, { doi: '10.1101/2020.01.01.000001' }) }).ok);
  ok('not verified when the metadata cannot be read', !run({ meta: null }).ok && !run({ person: null }).ok);
  const listed = new Map([['10.6084/m9.figshare.1234567.v1', '2026.0005']]);
  ok('not verified when the work is already listed, and the comment names the record', !run({ listed }).ok
    && run({ listed }).checks.some((c) => c[2].includes('already listed as 2026.0005')));
  ok('a concept DOI matches its listed versions', I.listedAs('10.6084/m9.figshare.1234567', listed) === '2026.0005' && I.listedAs('10.6084/m9.figshare.1234568', listed) === null);
  ok('an update is verified only with the id of the record that lists the work', run({ listed, form: Object.assign({}, form, { update: '2026.0005' }) }).ok
    && !run({ listed, form: Object.assign({}, form, { update: '2026.0009' }) }).ok);

  const papers = fs.mkdtempSync(path.join(os.tmpdir(), 'sophaxis-papers-'));
  fs.copyFileSync(path.join(__dirname, 'fixtures', 'papers', '2026.0001.json'), path.join(papers, '2026.0001.json'));
  const r = run({});
  const d = I.draft({ form, login: 'jcarberry', issue: 7, meta: dc, versions: [{ doi: dc.doi, date: dc.date }], result: r, paperDir: papers, today: '2026-11-10' });
  ok('the draft record is valid and takes the next id', d.problems.length === 0 && d.record.id === '2026.0002' && d.record.issue === 7 && d.record.license === 'CC-BY-4.0', d.problems.join('; '));
  ok('the draft keeps given and family names, keywords and other categories', d.record.authors[1].family === 'Roe' && d.record.authors[1].given === 'Jane'
    && d.record.keywords.join('|') === 'Repeated games|Golden ratio' && d.record.categories.join() === 'logic,mathematics');
  ok('the draft is not marked as the operator’s own unless the operator opened the issue', !d.record.operator_own
    && I.draft({ form, login: 'CPSBVBNG26-DOTCOM', issue: 7, meta: dc, versions: [{ doi: dc.doi, date: dc.date }], result: r, paperDir: papers, today: '2026-11-10' }).record.operator_own === true);
  const up = I.draft({ form: Object.assign({}, form, { update: '2026.0001' }), login: 'jcarberry', issue: 8, meta: dc, versions: [{ doi: '10.5281/zenodo.1234999', date: '2026-12-01' }, { doi: '10.5281/zenodo.2000000', date: '2026-12-20' }], result: r, paperDir: papers });
  const gone = fs.mkdtempSync(path.join(os.tmpdir(), 'sophaxis-papers-'));
  fs.copyFileSync(path.join(__dirname, 'fixtures', 'papers', '2026.0002.json'), path.join(gone, '2026.0002.json'));
  ok('a withdrawn record takes no new version', I.draft({ form: Object.assign({}, form, { update: '2026.0002' }), login: 'jcarberry', issue: 9, meta: dc, versions: [{ doi: '10.6084/m9.figshare.7654321', date: '2026-12-01' }], result: r, paperDir: gone })
    .problems.join().includes('2026.0002 is withdrawn and takes no new versions'));
  ok('an update adds only the new version to the existing record', up.problems.length === 0 && up.record.versions.length === 3 && up.record.versions[2].doi === '10.5281/zenodo.2000000');
  const c = I.comment(r, { record: Object.assign({}, d.record, { title: 'x ~~~~ y' }), problems: [] });
  ok('the comment carries the marker and keeps the draft inside its fence', c.startsWith(I.MARK) && (c.match(/~~~~/g) || []).length === 2);
  ok('a failed check posts no draft', !I.comment(run({ login: 'someone-else' }), null).includes('~~~~json'));
  const ssrn = I.comment(r, { record: Object.assign({}, d.record, { versions: [{ version: 1, doi: '10.2139/ssrn.7537983', date: '2026-10-01' }] }), problems: [] });
  ok('where the repository does not let Sophaxis fetch the PDF, the comment asks the authors to attach it, within the limit',
    ssrn.includes('attach the deposited PDF to this issue') && ssrn.includes('at most 20 MB')
    && ['10.31219/osf.io/3sj5u', '10.20944/preprints201605.0001.v1'].every((x) => I.pdfNote(x).includes('attach the deposited PDF'))
    && I.pdfNote('10.6084/m9.figshare.34419198.v2') === '' && !c.includes('attach the deposited PDF'));

  const wf = read(path.join(ROOT, '.github', 'workflows', 'intake.yml'));
  const runs = [...wf.matchAll(/^\s*- run: (.*)$/gm)].map((m) => m[1]);
  ok('the workflow passes the issue text through the environment, never into the shell', runs.join() === 'node tools/intake.js,node tools/withdraw.js'
    && (wf.match(/ISSUE_BODY: \$\{\{ github\.event\.issue\.body \}\}/g) || []).length === 2);
  ok('the workflow may only read the code and write to issues', /permissions:\n  contents: read\n  issues: write\n(?!  \w)/.test(wf));
  ok('each job of the workflow runs only on its own kind of issue: submission or withdrawal', (wf.match(/^    if: /gm) || []).length === 2
    && wf.includes("if: contains(github.event.issue.labels.*.name, 'submission')") && wf.includes("if: contains(github.event.issue.labels.*.name, 'withdrawal')"));
  const src = read(path.join(ROOT, 'tools', 'intake.js'));
  ok('the intake reads only the ORCID person and works, not emails or addresses', !/\/(email|address|addresses|record)\b'?/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')) && src.includes("'/person'") && src.includes("'/works'"));
}

/* ------------------------------------------------------------ 10 */
console.log('\n10. PDF copies and the tags Google Scholar reads');
{
  const a = read(path.join(FIX, 'abs', '2026.0001.html'));
  const tag = (n) => [...a.matchAll(new RegExp('<meta name="' + n + '" content="([^"]*)">', 'g'))].map((m) => m[1]);
  ok('the record page carries citation_title, one citation_author per author and the dates', tag('citation_title')[0] === 'A Fixture Record for Testing the Build'
    && tag('citation_author').join('|') === 'Jane Doe|Taro Yamada' && tag('citation_publication_date')[0] === '2026/11/01' && tag('citation_online_date')[0] === '2026/12/01');
  ok('the record page gives the DOI of the latest version and its own address', tag('citation_doi')[0] === '10.5281/zenodo.1234999'
    && tag('citation_abstract_html_url')[0] === 'https://sophaxis.vercel.app/abs/2026.0001.html');
  ok('citation_pdf_url points to the copy, by absolute address', tag('citation_pdf_url')[0] === 'https://sophaxis.vercel.app/pdf/2026.0001v2.pdf');
  ok('the copy is in the site byte for byte', fs.readFileSync(path.join(FIX, 'pdf', '2026.0001v2.pdf')).equals(fs.readFileSync(path.join(__dirname, 'fixtures', 'pdf', '2026.0001v2.pdf'))));
  ok('the record page links the copy and says it is unmodified, under the licence, with the authors', a.includes('href="../pdf/2026.0001v2.pdf"')
    && a.includes('Unmodified copies') && a.includes('shared under CC BY 4.0, by Jane Doe, Taro Yamada') && a.includes('href="https://creativecommons.org/licenses/by/4.0/"'));
  ok('the sitemap lists the copy', read(path.join(FIX, 'sitemap.xml')).includes('<loc>https://sophaxis.vercel.app/pdf/2026.0001v2.pdf</loc>'));
  const w = read(path.join(FIX, 'abs', '2026.0002.html'));
  ok('a record without a copy has no citation_pdf_url and no PDF link', !w.includes('citation_pdf_url') && !w.includes('../pdf/'));

  const good = JSON.parse(read(path.join(__dirname, 'fixtures', 'papers', '2026.0001.json')));
  [
    ['a copy for a version the record does not have', (p) => { p.pdfs[0].version = 3; p.pdfs[0].file = '2026.0001v3.pdf'; }],
    ['a copy named otherwise than <id>v<version>.pdf', (p) => { p.pdfs[0].file = 'paper.pdf'; }],
    ['a copy without a sha256', (p) => { delete p.pdfs[0].sha256; }],
    ['a copy without the https address it came from', (p) => { p.pdfs[0].source = 'ftp://example.org/x.pdf'; }],
  ].forEach(([label, spoil]) => {
    const p = JSON.parse(JSON.stringify(good));
    spoil(p);
    ok('refuses ' + label, validate(p, '2026.0001.json').length > 0);
  });
  const tampered = fs.mkdtempSync(path.join(os.tmpdir(), 'sophaxis-tamper-'));
  fs.mkdirSync(path.join(tampered, 'papers')); fs.mkdirSync(path.join(tampered, 'pdf'));
  fs.copyFileSync(path.join(__dirname, 'fixtures', 'papers', '2026.0001.json'), path.join(tampered, 'papers', '2026.0001.json'));
  fs.writeFileSync(path.join(tampered, 'pdf', '2026.0001v2.pdf'), '%PDF-1.4\n% changed\n');
  ok('a copy that does not match its sha256 stops the build', build(fs.mkdtempSync(path.join(os.tmpdir(), 'sophaxis-')), path.join(tampered, 'papers')).problems.some((x) => x.includes('does not match its sha256')));
  fs.rmSync(path.join(tampered, 'pdf', '2026.0001v2.pdf'));
  ok('a missing copy stops the build', build(fs.mkdtempSync(path.join(os.tmpdir(), 'sophaxis-')), path.join(tampered, 'papers')).problems.some((x) => x.includes('is missing')));

  const F = require('../tools/fetch_pdf.js');
  ok('Figshare: the version DOI leads to that version in its API', F.sourceFor('10.6084/m9.figshare.34419198.v2', 2).api === 'https://api.figshare.com/v2/articles/34419198/versions/2');
  ok('Zenodo: the DOI leads to its record in the API', F.sourceFor('10.5281/zenodo.1234567', 1).api === 'https://zenodo.org/api/records/1234567');
  ok('arXiv: one DOI, the version number picks the file', F.sourceFor('10.48550/arXiv.2508.15126', 2).url === 'https://arxiv.org/pdf/2508.15126v2');
  ok('Research Square: the version DOI leads to its PDF', F.sourceFor('10.21203/rs.3.rs-39251/v1', 1).url === 'https://www.researchsquare.com/article/rs-39251/v1.pdf');
  ok('no copy is attempted from OSF Preprints, Preprints.org or SSRN, or from a Figshare DOI without a version', ['10.31219/osf.io/3sj5u', '10.20944/preprints201605.0001.v1', '10.2139/ssrn.7537983', '10.6084/m9.figshare.34419198'].every((d) => F.sourceFor(d, 1) === null));
  ok('an author-provided PDF is taken only from an attachment of a GitHub issue', F.attachmentOk('https://github.com/user-attachments/files/12345678/paper.pdf')
    && !F.attachmentOk('https://example.org/paper.pdf') && !F.attachmentOk('https://github.com.evil.example/user-attachments/files/1/p.pdf') && !F.attachmentOk('http://github.com/user-attachments/files/1/p.pdf'));
  const byAuthors = JSON.parse(JSON.stringify(good));
  byAuthors.pdfs[0].provided_by = 'someone';
  ok('refuses a copy said to be provided by anyone but the authors', validate(byAuthors, '2026.0001.json').length > 0);
  const given = fs.mkdtempSync(path.join(os.tmpdir(), 'sophaxis-given-'));
  fs.mkdirSync(path.join(given, 'papers')); fs.mkdirSync(path.join(given, 'pdf'));
  fs.writeFileSync(path.join(given, 'papers', '2026.0001.json'), JSON.stringify(Object.assign({}, good, { pdfs: [Object.assign({}, good.pdfs[0], { provided_by: 'authors', source: 'https://github.com/user-attachments/files/1/p.pdf' })] })));
  fs.copyFileSync(path.join(__dirname, 'fixtures', 'pdf', '2026.0001v2.pdf'), path.join(given, 'pdf', '2026.0001v2.pdf'));
  const givenOut = fs.mkdtempSync(path.join(os.tmpdir(), 'sophaxis-'));
  build(givenOut, path.join(given, 'papers'));
  ok('the record page says when the authors provided the copy', read(path.join(givenOut, 'abs', '2026.0001.html')).includes('Unmodified copies of the PDF that the authors provided in their submission issue, because Zenodo does not let a script fetch its files'));
  const pdf = Buffer.from('%PDF-1.4\nx\n');
  ok('a file is kept only if it is a PDF and matches the repository checksum', F.accept(pdf, null).length === 0
    && F.accept(pdf, crypto.createHash('md5').update(pdf).digest('hex')).length === 0
    && F.accept(pdf, '0'.repeat(32)).length > 0 && F.accept(Buffer.from('<html>'), null).length > 0);
  const lim = JSON.parse(read(path.join(ROOT, 'site.json'))).pdfLimits;
  ok('the PDF limits are 20 MB a file and 1 GB together, the same in site.json, the fetcher and the build',
    lim.fileMB === 20 && lim.totalGB === 1 && F.LIMITS.file === 20 * 1024 * 1024 && F.LIMITS.total === 1024 * 1024 * 1024
    && JSON.stringify(pdfLimits()) === JSON.stringify(F.LIMITS));
  const small = { file: 16, total: 30 };
  ok('a file over the limit is not kept, nor one that would take the copies over the total', F.accept(pdf, null, 0, small).length === 0
    && F.accept(Buffer.concat([pdf, Buffer.alloc(10)]), null, 0, small).length > 0 && F.accept(pdf, null, 20, small).length > 0
    && F.accept(pdf, null, 19, small).length === 0);
  ok('the build refuses copies over the limits', loadPapers(path.join(given, 'papers'), { file: 4, total: 1e9 }).problems.some((x) => x.includes('larger than'))
    && loadPapers(path.join(given, 'papers'), { file: 1e9, total: 4 }).problems.some((x) => x.includes('together are larger than'))
    && loadPapers(path.join(given, 'papers')).problems.length === 0);
  ok('the Copyright Policy states the limits', read(path.join(ROOT, 'policies', 'copyright.md'))
    .includes('A copy is kept only if the file is at most ' + lim.fileMB + ' MB, and only while all the copies together stay within ' + lim.totalGB + ' GB.'));

  const wf = read(path.join(ROOT, '.github', 'workflows', 'pdf.yml'));
  ok('the PDF workflow is started by hand, may only write contents, and passes the id through the environment', /on:\n  workflow_dispatch:/.test(wf)
    && /permissions:\n  contents: write\n(?!  \w)/.test(wf) && ![...wf.matchAll(/^\s*(- )?run: (.*)$/gm)].some((m) => m[2].includes('${{')));
  ok('the PDF workflow pushes only to a branch of its own, never to main', wf.includes('git push origin "claude/pdf-$ID"') && !/git push[^\n]*main/.test(wf));
}

/* ------------------------------------------------------------ 11 */
console.log('\n11. Finding work: search, feed, records as JSON, authors, keywords, citations, several fields');
{
  const a = read(path.join(FIX, 'abs', '2026.0001.html'));
  ok('a record can sit in several fields, and each field page lists it', a.includes('<a href="../list/philosophy-of-mathematics.html">Philosophy of Mathematics</a> · <a href="../list/logic.html">Logic</a>')
    && read(path.join(FIX, 'list', 'logic.html')).includes('2026.0001') && read(path.join(FIX, 'list', 'logic.html')).includes('Logic (2)<'));
  ok('keywords are shown and given to Google Scholar', a.includes('Keywords: structuralism; modal logic') && a.includes('<meta name="citation_keywords" content="structuralism; modal logic">'));
  ok('APA: family name and initials, year, title, [Preprint], repository, DOI', a.includes('Doe, J., &amp; Yamada, T. (2026). A Fixture Record for Testing the Build [Preprint]. Zenodo. https://doi.org/10.5281/zenodo.1234999'));
  ok('Chicago author-date: first author inverted, the others not', a.includes('Doe, Jane, and Taro Yamada. 2026. “A Fixture Record for Testing the Build.” Preprint, Zenodo. https://doi.org/10.5281/zenodo.1234999.'));
  ok('an author with an ORCID iD links to an author page that lists the record', a.includes('<a href="../author/0000-0002-1825-0097.html"><span itemprop="name">Jane Doe</span></a>')
    && read(path.join(FIX, 'author', '0000-0002-1825-0097.html')).includes('href="../abs/2026.0001.html"'));
  ok('an author without an ORCID iD gets no page: a name alone can belong to several people', !a.includes('../author/Taro') && fs.readdirSync(path.join(FIX, 'author')).length === 1);
  const feedXml = read(path.join(FIX, 'feed.xml'));
  ok('the Atom feed lists every record, newest first, with authors, fields and abstract', feedXml.startsWith('<?xml') && feedXml.includes('xmlns="http://www.w3.org/2005/Atom"')
    && feedXml.indexOf('abs/2026.0001.html') < feedXml.indexOf('abs/2026.0002.html') && feedXml.includes('<uri>https://orcid.org/0000-0002-1825-0097</uri>')
    && feedXml.includes('<category term="logic" label="Logic"/>') && (feedXml.match(/<entry>/g) || []).length === 2);
  ok('every page points to the feed', fs.readdirSync(FIX, { recursive: true }).filter((f) => f.endsWith('.html')).every((f) => read(path.join(FIX, f)).includes('<link rel="alternate" type="application/atom+xml"')));
  const pj = JSON.parse(read(path.join(FIX, 'papers.json')));
  ok('papers.json holds the public fields of every record and nothing from the submission process', pj.length === 2 && pj[0].id === '2026.0001'
    && pj[0].categories.join() === 'philosophy-of-mathematics,logic' && pj[0].pdfs[0].url === 'https://sophaxis.vercel.app/pdf/2026.0001v2.pdf'
    && pj.every((p) => !('issue' in p) && !('operator_own' in p) && !('notes' in p)));

  const S = require('../assets/search.js');
  const ids = (q, f, y) => S.match(pj, q, f || '', y || '').map((p) => p.id).join();
  ok('search: every word must occur, in any field of the record, ignoring case and accents', ids('FIXTURE build') === '2026.0001' && ids('fixture') === '2026.0001,2026.0002' && ids('fixtüre') === '2026.0001,2026.0002' && ids('nowhere') === '');
  ok('search: by author, ORCID iD, keyword and DOI', ids('roe') === '2026.0002' && ids('0000-0002-1825-0097') === '2026.0001' && ids('structuralism') === '2026.0001' && ids('10.6084/m9.figshare.7654321') === '2026.0002');
  ok('search: the field and the year narrow the result', ids('', 'logic') === '2026.0001,2026.0002' && ids('', 'philosophy-of-mathematics') === '2026.0001' && ids('', '', '2025') === '');
  const js = read(path.join(ROOT, 'assets', 'search.js')).replace(/\/\*[\s\S]*?\*\//g, '');
  ok('search.js reads only papers.json from this site, and never writes markup', (js.match(/fetch\(/g) || []).length === 1 && js.includes("fetch('./papers.json')")
    && !/https?:|innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function|localStorage|cookie|sendBeacon|XMLHttpRequest/.test(js));
  const sp = read(path.join(FIX, 'search.html'));
  ok('the search page works as a plain form and says what to use without the script', sp.includes('action="./search.html" method="get"') && sp.includes('id="nojs"') && sp.includes('href="./papers.json"'));
  ok('the sitemap lists the search page, the field pages and the author pages', ['search.html', 'list/logic.html', 'author/0000-0002-1825-0097.html'].every((u) => read(path.join(FIX, 'sitemap.xml')).includes(u)));

  const good = JSON.parse(read(path.join(__dirname, 'fixtures', 'papers', '2026.0001.json')));
  [
    ['an unknown second field', (p) => { p.categories = ['physics']; }],
    ['the main field repeated as a second field', (p) => { p.categories = ['philosophy-of-mathematics']; }],
    ['more than twelve keywords', (p) => { p.keywords = Array(13).fill('x'); }],
    ['an empty keyword', (p) => { p.keywords = [' ']; }],
    ['an empty family name', (p) => { p.authors[1].family = ''; }],
  ].forEach(([label, spoil]) => {
    const p = JSON.parse(JSON.stringify(good));
    spoil(p);
    ok('refuses ' + label, validate(p, '2026.0001.json').length > 0);
  });
}

/* ------------------------------------------------------------ 12 */
console.log('\n12. Eight policies, consent and rights, withdrawal, takedown');
{
  const slugs = ['terms', 'submission', 'moderation', 'copyright', 'licences', 'privacy', 'withdrawal', 'takedown'];
  const idx = read(path.join(ROOT, 'site', 'policy.html'));
  ok('the eight policies each have a page, a date of last change, and a link from the index', slugs.every((s) => {
    const f = path.join(ROOT, 'site', 'policies', s + '.html');
    return fs.existsSync(f) && /Last updated: \d{4}-\d{2}-\d{2}\./.test(read(f)) && idx.includes('href="./policies/' + s + '.html"');
  }) && fs.readdirSync(path.join(ROOT, 'policies')).filter((f) => !f.endsWith('.ja.md')).length === slugs.length);
  const ja = read(path.join(ROOT, 'site', 'policies', 'privacy.ja.html'));
  ok('the Japanese page on personal data covers the headings of the Act: handler, data, purposes, provision, foreign services, safety, retention, requests',
    ja.startsWith('<!doctype html>\n<html lang="ja">') && /最終更新：\d{4}-\d{2}-\d{2}。/.test(ja)
    && ['取り扱う者', '取り扱う個人情報', '利用目的', '公開と第三者への提供', '外国にある事業者の利用', '安全のための措置', '保存の期間', '開示・訂正・利用停止・削除の求め'].every((h) => ja.includes('<h2>' + h + '</h2>')));
  ok('the Japanese page names every foreign service the English policy names, and links back to it', ['GitHub（米国）', 'Vercel（米国）', 'DataCite（ドイツ）', 'Crossref（米国）', 'ORCID（米国）', 'Internet Archive（米国）'].every((s) => ja.includes(s))
    && ja.includes('href="./privacy.html"') && read(path.join(ROOT, 'policies', 'privacy.md')).includes('GitHub (United States)') && read(path.join(ROOT, 'site', 'sitemap.xml')).includes('policies/privacy.ja.html</loc><lastmod>' + /最終更新：(\d{4}-\d{2}-\d{2})。/.exec(read(path.join(ROOT, 'policies', 'privacy.ja.md')))[1]));
  ok('Japanese lines join without a space, English lines with one', ja.includes('読みません。サイトは、閲覧者の個人情報を集めません。') && read(path.join(ROOT, 'site', 'policy.html')).includes('It lists preprints that authors have already deposited in an open repository, and it gives'));
  {
    const en = read(path.join(ROOT, 'site', 'policies', 'privacy.html'));
    const pair = '<link rel="alternate" hreflang="en" href="https://sophaxis.vercel.app/policies/privacy.html">\n'
      + '<link rel="alternate" hreflang="ja" href="https://sophaxis.vercel.app/policies/privacy.ja.html">';
    const footers = fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html'))
      .map((f) => [f, (/<footer[\s\S]*?<\/footer>/.exec(read(path.join(ROOT, 'site', f))) || [''])[0]]);
    const japanese = footers.filter(([, t]) => /[\u3040-\u30ff\u4e00-\u9fff]/.test(t)).map(([f]) => f);
    ok('the footer is in English on every page; the Japanese page is reached from the Privacy Policy, and the two name each other with hreflang',
      footers.length > 0 && japanese.length === 0 && en.includes('href="./privacy.ja.html"') && en.includes(pair) && ja.includes(pair),
      japanese.join(', '));
  }
  ok('every page says in its footer that the site is hosted on Vercel, beside the link to the Privacy Policy that names what Vercel processes', fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html'))
    .every((f) => /<footer>[\s\S]*Operated by Takuya Nemoto\. Hosted on Vercel\.[\s\S]*href="(\.\/|\.\.\/|\/)policies\/privacy\.html">Privacy<\/a>[\s\S]*<\/footer>/.test(read(path.join(ROOT, 'site', f))))
    && read(path.join(ROOT, 'policies', 'privacy.md')).includes('The site is hosted on Vercel.'));
  ok('every page links the Terms of Use, the Privacy Policy and the Takedown Policy', fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html'))
    .every((f) => ['terms', 'privacy', 'takedown'].every((s) => new RegExp('href="(\\./|\\.\\./|/)policies/' + s + '\\.html"').test(read(path.join(ROOT, 'site', f))))));
  const form = read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'submission.yml'));
  ok('the submission form requires consent of every author and the right to share the version', /- label: Every author of this work agrees to its listing on Sophaxis\.\n\s+required: true/.test(form)
    && /- label: The authors may share this version under its licence; if a journal has published the work, the publisher allows it\.\n\s+required: true/.test(form));
  const rem = read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'removal.yml'));
  /* The private channel is the email on the operator's ORCID record. The address itself is never copied here. */
  const allPolicies = [read(path.join(ROOT, 'policy.md'))].concat(fs.readdirSync(path.join(ROOT, 'policies')).map((f) => read(path.join(ROOT, 'policies', f)))).join('\n');
  const everything = [allPolicies, rem, read(path.join(ROOT, 'README.md'))].concat(fs.readdirSync(path.join(ROOT, 'site'), { recursive: true })
    .filter((f) => /\.(html|xml|json|txt)$/.test(f)).map((f) => read(path.join(ROOT, 'site', f)))).join('\n');
  ok('no email address appears anywhere on the site or in the policies; private requests point to the ORCID record', !/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z0-9.-]+/.test(everything.replace(/noreply@anthropic\.com/g, ''))
    && read(path.join(ROOT, 'policies', 'privacy.ja.md')).includes('運営者の [ORCID の記録](https://orcid.org/0009-0000-1406-0547)にあるメールアドレスへ'));
  ok('the removal form asks for no personal data, and covers author consent and the PDF copy', /- label: This issue contains no personal data\.\n\s+required: true/.test(rem)
    && rem.includes('An author did not agree to the listing') && rem.includes('An author asks for the PDF copy to be removed') && rem.includes('policies/takedown.html'));

  const r = read(path.join(FIX, 'abs', '2026.0003.html'));
  ok('a removed record keeps its address with a notice, and nothing else', r.includes('Record removed') && r.includes('Removed because it exposed personal data. Date: 2026-12-10.')
    && r.includes('<meta name="robots" content="noindex">') && !r.includes('citation_') && !r.includes('../pdf/'));
  const everywhere = ['index.html', 'feed.xml', 'papers.json', 'sitemap.xml', 'search.html', 'list/logic.html', 'list/mathematics.html'].map((f) => read(path.join(FIX, f))).join('\n');
  ok('a removed record is left out of the listing, the fields, the feed, the JSON and the sitemap', !everywhere.includes('2026.0003') && read(path.join(FIX, 'index.html')).includes('All fields (2)<'));
  const removed = JSON.parse(read(path.join(__dirname, 'fixtures', 'papers', '2026.0003.json')));
  [
    ['a removed record that keeps its title', (p) => { p.title = 'x'; }],
    ['a removed record that keeps a PDF copy', (p) => { p.pdfs = []; }],
    ['a removed record without a date', (p) => { delete p.removal_date; }],
    ['a removed record with an unknown reason', (p) => { p.removal_reason = 'because'; }],
  ].forEach(([label, spoil]) => {
    const p = JSON.parse(JSON.stringify(removed));
    spoil(p);
    ok('refuses ' + label, validate(p, '2026.0003.json').length > 0);
  });

  const a = read(path.join(FIX, 'abs', '2026.0001.html'));
  ok('a record links the published version, outside Sophaxis', a.includes('Published version: <a href="https://doi.org/10.1000/fixture.journal.1">10.1000/fixture.journal.1</a> (not on Sophaxis)')
    && JSON.parse(read(path.join(FIX, 'papers.json')))[0].published_doi === '10.1000/fixture.journal.1');
  const good = JSON.parse(read(path.join(__dirname, 'fixtures', 'papers', '2026.0001.json')));
  ok('refuses a published version that is not a DOI', validate(Object.assign({}, good, { published_doi: 'journal.org/x' }), '2026.0001.json').length > 0);

  const I = require('../tools/intake.js');
  const f = I.parseIssue(read(path.join(__dirname, 'fixtures', 'intake', 'issue.md')));
  ok('the intake reads the published version and puts it in the draft', f.published === '10.1000/fixture.journal.1'
    && I.draft({ form: f, login: 'jcarberry', issue: 9, meta: I.fromDataCite(JSON.parse(read(path.join(__dirname, 'fixtures', 'intake', 'datacite.json')))),
      versions: [{ doi: '10.6084/m9.figshare.1234567.v1', date: '2026-11-03' }], result: { licence: 'CC-BY-4.0' }, paperDir: fs.mkdtempSync(path.join(os.tmpdir(), 'sophaxis-')), today: '2026-11-10' }).record.published_doi === '10.1000/fixture.journal.1');
}

/* ------------------------------------------------------------ 13 */
console.log('\n13. Structured data, share links, sitemap dates and the 404 page');
{
  const a = read(path.join(FIX, 'abs', '2026.0001.html'));
  const art = (/<article itemscope itemtype="https:\/\/schema\.org\/ScholarlyArticle">([\s\S]*?)<\/article>/.exec(a) || [])[1] || '';
  ok('the record page describes the work as a ScholarlyArticle: title, authors, dates, DOI, licence, free to read', art.includes('<h1 itemprop="headline">A Fixture Record for Testing the Build</h1>')
    && (art.match(/itemprop="author" itemscope itemtype="https:\/\/schema\.org\/Person"/g) || []).length === 2
    && art.includes('<meta itemprop="datePublished" content="2026-11-01">') && art.includes('<meta itemprop="dateModified" content="2026-12-01">')
    && art.includes('<link itemprop="sameAs" href="https://doi.org/10.5281/zenodo.1234999">') && art.includes('<link itemprop="license" href="https://creativecommons.org/licenses/by/4.0/">')
    && art.includes('<meta itemprop="isAccessibleForFree" content="true">') && art.includes('<p itemprop="abstract">'));
  ok('the structured data points to the PDF copy and to the ORCID record', art.includes('<link itemprop="contentUrl" href="https://sophaxis.vercel.app/pdf/2026.0001v2.pdf">')
    && art.includes('href="https://orcid.org/0000-0002-1825-0097" itemprop="sameAs"'));
  const share = (/<p class="share">([\s\S]*?)<\/p>/.exec(a) || [])[1] || '';
  ok('share links are plain links to X, Bluesky, Facebook, LinkedIn and email, each carrying the record address', ['https://x.com/intent/post?', 'https://bsky.app/intent/compose?', 'https://www.facebook.com/sharer/sharer.php?u=', 'https://www.linkedin.com/sharing/share-offsite/?url=', 'mailto:?subject=']
    .every((u) => share.includes('href="' + u)) && (share.match(/https%3A%2F%2Fsophaxis\.vercel\.app%2Fabs%2F2026\.0001\.html/g) || []).length === 5 && !/<script|<img|<iframe/.test(share));
  const sm = read(path.join(FIX, 'sitemap.xml'));
  ok('the sitemap gives each address the date it last changed', sm.includes('<loc>https://sophaxis.vercel.app/abs/2026.0001.html</loc><lastmod>2026-12-01</lastmod>')
    && sm.includes('<loc>https://sophaxis.vercel.app/pdf/2026.0001v2.pdf</loc><lastmod>2026-12-01</lastmod>')
    && sm.includes('<loc>https://sophaxis.vercel.app/policies/terms.html</loc><lastmod>') && (sm.match(/<url>/g) || []).length === (sm.match(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g) || []).length);
  const nf = read(path.join(ROOT, 'site', '404.html'));
  ok('the 404 page links from the root, is not indexed and is not in the sitemap', nf.includes('<link rel="icon" href="/favicon.svg"') && nf.includes('href="/index.html"')
    && nf.includes('href="/search.html"') && !/href="\.{1,2}\//.test(nf) && nf.includes('<meta name="robots" content="noindex">') && !read(path.join(ROOT, 'site', 'sitemap.xml')).includes('404'));
  ok('the privacy policy says that share links send nothing until followed', read(path.join(ROOT, 'policies', 'privacy.md')).includes('Nothing is sent anywhere until a reader follows one, and the service then works under its own privacy policy.'));
}

/* ------------------------------------------------------------ 14 */
console.log('\n14. The weekly check and the Internet Archive');
{
  const Wt = require('../tools/watch.js');
  const p = JSON.parse(read(path.join(__dirname, 'fixtures', 'papers', '2026.0001.json')));
  const ok1 = { licences: ['CC-BY-4.0'] };
  ok('no problem when every DOI resolves with its licence', Wt.compare(p, { '10.5281/zenodo.1234567': ok1, '10.5281/zenodo.1234999': ok1 }).length === 0);
  ok('a DOI that no longer resolves is reported', Wt.compare(p, { '10.5281/zenodo.1234567': ok1, '10.5281/zenodo.1234999': null }).join().includes('2026.0001: the DOI 10.5281/zenodo.1234999 no longer resolves'));
  ok('a changed licence is reported', Wt.compare(p, { '10.5281/zenodo.1234567': { licences: ['CC-BY-NC-4.0'] } }).join().includes('no longer carries CC BY 4.0'));
  ok('a DOI that could not be checked this week is not reported as broken', Wt.compare(p, {}).length === 0);
  const fig = { id: '2026.0005', status: 'listed', versions: [{ version: 1, doi: '10.6084/m9.figshare.34419198.v1' }, { version: 2, doi: '10.6084/m9.figshare.34419198.v2' }] };
  const arx = { id: '2026.0006', status: 'listed', versions: [{ version: 1, doi: '10.48550/arXiv.2508.15126' }] };
  ok('new versions are looked for at Figshare and arXiv only, and only for listed records', Wt.followed(fig) === '10.6084/m9.figshare.34419198'
    && Wt.followed(arx) === '10.48550/arXiv.2508.15126' && Wt.followed(p) === null && Wt.followed(Object.assign({}, fig, { status: 'withdrawn' })) === null);
  ok('a version at the repository that the record lacks is reported, and nothing else', Wt.newVersions(fig, 3).join().includes('2026.0005: the repository has 3 versions and the record lists 2')
    && Wt.newVersions(fig, 2).length === 0 && Wt.newVersions(fig, null).length === 0);
  const onlyNews = Wt.report([], '2026-11-02', Wt.newVersions(fig, 3));
  ok('the weekly issue lists new versions apart from problems, and says that the authors submit them', onlyNews.startsWith(Wt.MARK) && onlyNews.includes('New versions at the repository:')
    && onlyNews.includes('the authors submit it') && !onlyNews.includes('Moderation Policy') && Wt.report(['x'], '2026-11-02').includes('Moderation Policy'));
  const removed = JSON.parse(read(path.join(__dirname, 'fixtures', 'papers', '2026.0003.json')));
  const urls = Wt.archiveUrls([p, removed]);
  ok('the archive saves the top page, each record and each PDF copy, and never a removed record', urls.includes('https://sophaxis.vercel.app/') && urls.includes('https://sophaxis.vercel.app/abs/2026.0001.html')
    && urls.includes('https://sophaxis.vercel.app/pdf/2026.0001v2.pdf') && !urls.some((u) => u.includes('2026.0003')));
  const wf = read(path.join(ROOT, '.github', 'workflows', 'watch.yml'));
  ok('the weekly check runs on a schedule, may only read the code and write issues', /schedule:\n\s+- cron: '\d+ \d+ \* \* \d'/.test(wf) && /permissions:\n  contents: read\n  issues: write\n(?!  \w)/.test(wf));
}

/* ------------------------------------------------------------ 15 */
console.log('\n15. Citation files, related records, reporting an error');
{
  const p = JSON.parse(read(path.join(__dirname, 'fixtures', 'papers', '2026.0001.json')));
  const r = ris(p);
  ok('RIS: one line per field, CR LF throughout, every author family-first, the latest DOI, closed by ER',
    r.startsWith('TY  - UNPB\r\n') && r.endsWith('ER  -\r\n') && !/[^\r]\n/.test(r)
    && r.includes('AU  - Doe, Jane\r\nAU  - Yamada, Taro\r\n') && r.includes('DO  - 10.5281/zenodo.1234999\r\n') && r.includes('KW  - modal logic\r\n'));
  const c = JSON.parse(cslJson(p))[0];
  ok('CSL-JSON: names split into family and given, the date of the latest version, the DOI, marked as a preprint',
    c.author[0].family === 'Doe' && c.author[1].given === 'Taro' && c.issued['date-parts'][0].join('-') === '2026-12-1'
    && c.DOI === '10.5281/zenodo.1234999' && c.genre === 'Preprint' && c.note.includes('not peer-reviewed'));
  const a = read(path.join(FIX, 'abs', '2026.0001.html'));
  ok('the record page offers BibTeX, RIS and CSL-JSON files, and the build writes them for shown records only',
    a.includes('<a href="../cite/2026.0001.bib">BibTeX</a> · <a href="../cite/2026.0001.ris">RIS</a> · <a href="../cite/2026.0001.json">CSL-JSON</a>')
    && ['bib', 'ris', 'json'].every((x) => fs.existsSync(path.join(FIX, 'cite', '2026.0001.' + x)) && fs.existsSync(path.join(FIX, 'cite', '2026.0002.' + x)))
    && !fs.readdirSync(path.join(FIX, 'cite')).some((f) => f.startsWith('2026.0003')));
  const rec = (id, orcid, kw, status = 'listed', date = '2026-11-01') => ({ id, status, keywords: kw, authors: [{ name: 'A B', orcid }], versions: [{ version: 1, doi: '10.5281/zenodo.' + id.slice(5), date }] });
  const me = rec('2026.0010', '0000-0002-1825-0097', ['Modal logic']);
  const all = [me, rec('2026.0011', '0000-0002-1825-0097', []), rec('2026.0012', null, ['modal LOGIC']), rec('2026.0013', '0000-0002-1825-0097', [], 'withdrawn'),
    rec('2026.0014', null, ['ethics']), rec('2026.0015', '0000-0002-1825-0097', ['modal logic'], 'listed', '2026-12-01')];
  const rel = related(me, all);
  ok('related records: a shared ORCID iD, then a shared keyword ignoring case; newest first; withdrawn and unrelated records left out',
    rel.byAuthors.map((x) => x.id).join() === '2026.0015,2026.0011' && rel.onTopic.map((x) => x.id).join() === '2026.0012');
  ok('a record with nothing related shows no related section', !read(path.join(FIX, 'abs', '2026.0002.html')).includes('Related records'));
  ok('every record page links a correction issue for its id and its saved copies at the Internet Archive',
    a.includes('href="https://github.com/cpsbvbng26-dotcom/sophaxis/issues/new?template=correction.yml&amp;id=2026.0001">Report an error in this record</a>')
    && a.includes('href="https://web.archive.org/web/https://sophaxis.vercel.app/abs/2026.0001.html">Saved copies at the Internet Archive</a>'));
  const t = read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'correction.yml'));
  ok('the correction form takes the id from the link, asks for no personal data, and the Moderation Policy names it',
    /- type: input\n    id: id\n/.test(t) && t.includes('labels: ["correction"]') && t.includes('- label: This issue contains no personal data.\n          required: true')
    && read(path.join(ROOT, 'policies', 'moderation.md')).includes('Anyone can report an error in a record through the link on its page, which opens a public correction issue.'));
}

/* ------------------------------------------------------------ 16 */
console.log('\n16. Contrast (WCAG 2.2, level AA)');
{
  /* The colours are read from the style the site actually serves, in both schemes. Every rule that sets a text
   * colour is paired with its own background, or, when it sets none, with each background text can sit on. */
  const css = (/<style>([\s\S]*?)<\/style>/.exec(read(path.join(ROOT, 'site', 'index.html'))) || [, ''])[1];
  const palette = (block) => Object.fromEntries([...(block || '').matchAll(/--([a-z]+): (#[0-9a-f]{6})/g)].map((m) => [m[1], m[2]]));
  const light = palette((/^:root \{([^}]*)\}/m.exec(css) || [])[1]);
  const dark = palette((/@media \(prefers-color-scheme: dark\) \{ :root \{([^}]*)\}/.exec(css) || [])[1]);
  const lum = (h) => {
    const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const surfaces = [...new Set([...css.matchAll(/background: var\(--([a-z]+)\)/g)].map((m) => m[1]).filter((t) => t !== 'accent'))];
  const pairs = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const fg = /(?:^|;)\s*color: var\(--([a-z]+)\)/.exec(m[2]);
    if (!fg) continue;
    const bg = /background: var\(--([a-z]+)\)/.exec(m[2]);
    for (const b of bg ? [bg[1]] : surfaces) pairs.push([m[1].trim(), fg[1], b]);
  }
  const low = [];
  for (const [scheme, pal] of [['light', light], ['dark', dark]]) {
    for (const [sel, f, b] of pairs) {
      const r = pal[f] && pal[b] ? ratio(pal[f], pal[b]) : 0;
      if (r < 4.5) low.push(`${scheme} ${sel}: ${f} on ${b} ${r.toFixed(2)}`);
    }
  }
  ok('both colour schemes define the same tokens', Object.keys(light).length >= 6 && Object.keys(light).sort().join() === Object.keys(dark).sort().join());
  ok('every text colour on its background reaches 4.5:1 in both schemes', pairs.length >= 10 && low.length === 0, low.join('; ') || pairs.length + ' pairs');
}

/* ------------------------------------------------------------ 17 */
console.log('\n17. The fields of papers.json, as the README describes them');
{
  const readme = read(path.join(ROOT, 'README.md'));
  const section = (/## Reusing the records\n([\s\S]*?)\n## /.exec(readme) || [, ''])[1];
  const documented = [...section.matchAll(/^\| `([a-z_]+)` \|/gm)].map((m) => m[1]);
  const emitted = [...new Set(JSON.parse(read(path.join(FIX, 'papers.json'))).flatMap((x) => Object.keys(x)))];
  ok('the README documents every field of papers.json, in order, and no other', documented.length > 0 && documented.join() === emitted.join(),
    'README ' + documented.join(',') + ' / papers.json ' + emitted.join(','));
}

/* ------------------------------------------------------------ 18 */
console.log('\n18. Withdrawal: the policy, the form and the check');
{
  const W = require('../tools/withdraw.js');
  const rec = JSON.parse(read(path.join(__dirname, 'fixtures', 'papers', '2026.0001.json')));
  const body = '### Sophaxis id\n\n2026.0001\n\n### Your ORCID iD\n\nhttps://orcid.org/0000-0002-1825-0097\n\n### Reason, shown on the record page\n\nThe authors found an <b>error</b> in the main proof.\n';
  const form = W.parse(body);
  ok('the withdrawal form is read: the id, the ORCID iD from a link, and the reason as plain text',
    form.id === '2026.0001' && form.orcid === '0000-0002-1825-0097' && form.reason === 'The authors found an error in the main proof.');
  const person = { given: 'Jane', family: 'Doe', urls: ['https://github.com/janedoe'] };
  const passes = W.check({ form, login: 'janedoe', record: rec, person, works: new Set() });
  ok('an author whose ORCID record links the account and whose iD the record lists passes', passes.ok);
  ok('another account, an iD the record does not list, or a record already withdrawn does not pass',
    !W.check({ form, login: 'someone-else', record: rec, person, works: new Set() }).ok
    && !W.check({ form: Object.assign({}, form, { orcid: '0000-0001-5109-3700' }), login: 'janedoe', record: rec, person, works: new Set() }).ok
    && !W.check({ form, login: 'janedoe', record: Object.assign({}, rec, { status: 'withdrawn' }), person, works: new Set() }).ok
    && !W.check({ form, login: 'janedoe', record: null, person, works: new Set() }).ok);
  ok('an author without an iD in the record passes when the ORCID record lists the DOI and the name matches',
    W.check({ form: Object.assign({}, form, { orcid: '0000-0001-5109-3700' }), login: 'taro', record: rec, person: { given: 'Taro', family: 'Yamada', urls: ['https://github.com/taro'] }, works: new Set(['10.5281/zenodo.1234567']) }).ok);
  const d = W.draft(rec, form, '2026-12-10');
  ok('the withdrawn record keeps everything but the PDF copies, and validates', d.problems.length === 0 && d.record.status === 'withdrawn'
    && d.record.withdrawal_date === '2026-12-10' && d.record.withdrawal_note === form.reason && !d.record.pdfs && d.files.join() === '2026.0001v2.pdf'
    && d.record.title === rec.title && d.record.versions.length === rec.versions.length && rec.pdfs.length === 1);
  const c = W.comment(passes, d);
  ok('the comment carries its marker, the record after withdrawal, and the copies to delete', c.startsWith(W.MARK) && c.includes('"status": "withdrawn"') && c.includes('`data/pdf/2026.0001v2.pdf` deleted')
    && !W.comment({ ok: false, checks: [['x', false, '']] }, null).includes('~~~~json'));
  ok('the build refuses a withdrawn record without a date or with PDF copies', validate(Object.assign({}, d.record, { withdrawal_date: undefined }), 'x.json').some((e) => e.includes('withdrawal_date'))
    && validate(Object.assign({}, d.record, { pdfs: rec.pdfs }), 'x.json').some((e) => e.includes('keeps no PDF copies')));
  const t = read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'withdrawal.yml'));
  ok('the withdrawal form asks for the fields the check reads, under the label the workflow runs on', Object.keys(W.FIELDS).every((l) => t.includes('label: ' + l)) && t.includes('labels: ["withdrawal"]'));
  const pol = read(path.join(ROOT, 'policies', 'withdrawal.md'));
  ok('the Withdrawal Policy says who may withdraw, that the record stays, that the PDF copies go, and how it differs from removal',
    ['Any one author of a listed work can withdraw it.', 'An automatic check confirms both and posts the result in the issue.', 'The PDF copies are taken off the site, and the record links to the repository only.',
      'A withdrawn record takes no new versions.', 'Withdrawal on Sophaxis does not touch the deposit.', 'It follows the [Takedown Policy](./takedown.html).'].every((x) => pol.includes(x))
    && read(path.join(ROOT, 'policies', 'submission.md')).includes('[Withdrawal Policy](./withdrawal.html)'));
}

/* ------------------------------------------------------------ 19 */
console.log('\n19. The authors bear full responsibility');
{
  const terms = read(path.join(ROOT, 'policies', 'terms.md'));
  ok('the Terms of Use put the content, the rights, material from others, personal data, the disclosure and the confirmations on the authors',
    terms.includes('The authors bear full responsibility for their work and for its listing on Sophaxis.')
    && ['the content of the work', 'the right to share the version', 'material from others', 'personal data of third parties', 'the statement on generative models', 'the truth of everything the submitter confirms']
      .every((x) => terms.includes('- ' + x)));
  ok('moderation moves none of it to the operator; a claim from a third party is the authors\u2019, only as far as the law allows; takedown still applies',
    terms.includes('Moderation does not move any of this to the operator.')
    && terms.includes('the authors are responsible for it, to the extent the law allows.') && terms.includes('Nothing in them limits a right that the law does not allow to be limited.')
    && terms.includes('The operator still acts on requests under the [Takedown Policy](./takedown.html).'));
  const form = read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'submission.yml'));
  ok('the submitter confirms it in the form and in the Submission Policy',
    form.includes('- label: The authors bear full responsibility for the work and its listing, as the Terms of Use set out.\n          required: true')
    && read(path.join(ROOT, 'policies', 'submission.md')).includes('- The authors bear full responsibility for the work and its listing, as the [Terms of Use](./terms.html) set out.'));
  ok('every record page says so beside the notice that it is not peer-reviewed',
    read(path.join(FIX, 'abs', '2026.0001.html')).includes('does not guarantee its quality. The authors bear full responsibility for its content.</div>'));
}

/* ------------------------------------------------------------ 20 */
console.log('\n20. Operator and contact');
{
  const c = read(path.join(ROOT, 'site', 'contact.html'));
  const src = read(path.join(ROOT, 'contact.md'));
  ok('the contact page names the operator with an ORCID iD, says it is one person in Japan, and has a date of last change',
    src.includes('Sophaxis is operated by one person, Takuya Nemoto, in Japan.') && c.includes('href="https://orcid.org/0009-0000-1406-0547"') && /Last updated: \d{4}-\d{2}-\d{2}\./.test(src));
  const forms = fs.readdirSync(path.join(ROOT, '.github', 'ISSUE_TEMPLATE')).filter((f) => f !== 'config.yml');
  ok('the contact page links every issue form there is, and private requests go only to the ORCID record',
    forms.length === 4 && forms.every((f) => c.includes('issues/new?template=' + f + '"'))
    && src.includes("email to the address on the operator's [ORCID record]") && !/@[a-z0-9-]+\.[a-z]/i.test(src));
  ok('the postal address is not published, and is given on request without delay',
    src.includes('The operator\'s postal address is not published.') && src.includes('It is given on request, without delay, as Japan\'s Act on the Protection of Personal Information provides.'));
  ok('the contact page promises the same 7 days as the Takedown and Privacy policies', src.includes('within 7 days')
    && read(path.join(ROOT, 'policies', 'takedown.md')).includes('within 7 days') && read(path.join(ROOT, 'policies', 'privacy.md')).includes('within 7 days'));
  ok('every page links the contact page from its footer, and the sitemap lists it',
    fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html'))
      .every((f) => /<footer>[\s\S]*href="(\.\/|\.\.\/|\/)contact\.html">Contact<\/a>[\s\S]*<\/footer>/.test(read(path.join(ROOT, 'site', f))))
    && read(path.join(ROOT, 'site', 'sitemap.xml')).includes('<loc>https://sophaxis.vercel.app/contact.html</loc>'));
}

/* ------------------------------------------------------------ 21 */
console.log('\n21. The FAQ agrees with the policies');
{
  const faq = read(path.join(ROOT, 'faq.md'));
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const list = (xs, conj) => xs.slice(0, -1).join(', ') + ' ' + conj + ' ' + xs[xs.length - 1];
  ok('the FAQ names the repositories and the licences of site.json, in the same order',
    faq.includes(list(Object.values(site.repositories), 'and') + '.') && faq.includes(list(Object.values(site.licenses), 'and') + ', as given in the DOI metadata.'));
  const scope = /Sophaxis accepts work in ([^.]+)\./.exec(read(path.join(ROOT, 'policies', 'submission.md')))[1];
  ok('the FAQ gives the scope in the words of the Submission Policy', faq.includes('An overlay preprint server for ' + scope + '.'));
  const days = /respond to each submission within (\d+) days/.exec(read(path.join(ROOT, 'policies', 'moderation.md')))[1];
  ok('the FAQ gives the moderation time and the PDF limit that the policy and site.json set',
    faq.includes('within ' + days + ' days.') && faq.includes('at most ' + site.pdfLimits.fileMB + ' MB.'));
  const links = [...faq.matchAll(/\]\(\.\/([^)]+)\)/g)].map((m) => m[1]);
  ok('every link in the FAQ leads to a page of the site', links.length >= 8 && links.every((l) => fs.existsSync(path.join(ROOT, 'site', l))), links.filter((l) => !fs.existsSync(path.join(ROOT, 'site', l))).join(', '));
  const qs = [...faq.matchAll(/^## (.*)$/gm)].map((m) => m[1]);
  ok('every heading of the FAQ is a question, and the page says that the policies apply where they differ',
    qs.length >= 10 && qs.every((q) => q.endsWith('?')) && faq.includes('Where they differ, the policy applies.'));
  ok('every page links the FAQ from its navigation, and the sitemap lists it',
    fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html'))
      .every((f) => /<nav>[^\n]*href="(\.\/|\.\.\/|\/)faq\.html">FAQ<\/a><\/nav>/.test(read(path.join(ROOT, 'site', f))))
    && read(path.join(ROOT, 'site', 'sitemap.xml')).includes('<loc>https://sophaxis.vercel.app/faq.html</loc>'));
}

/* ------------------------------------------------------------ 22 */
console.log('\n22. From submission to listing: the page agrees with the form, the check and the policies');
{
  const pr = read(path.join(ROOT, 'process.md'));
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const list = (xs, conj) => xs.slice(0, -1).join(', ') + ' ' + conj + ' ' + xs[xs.length - 1];
  const days = /respond to each submission within (\d+) days/.exec(read(path.join(ROOT, 'policies', 'moderation.md')))[1];
  ok('the page names the repositories and licences of site.json, the moderation time and the PDF limit',
    pr.includes(list(Object.values(site.repositories), 'or') + ', with a DOI.') && pr.includes(list(Object.values(site.licenses), 'or') + ' on the deposit')
    && pr.includes('within ' + days + ' days.') && pr.includes('at most ' + site.pdfLimits.fileMB + ' MB.'));
  const form = read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'submission.yml'));
  const intake = read(path.join(ROOT, 'tools', 'intake.js'));
  const wf = read(path.join(ROOT, '.github', 'workflows', 'intake.yml'));
  ok('what the page tells the submitter to do and to expect is what the form and the automatic check do',
    ['label: DOI of the deposited preprint', 'label: Your ORCID iD', 'label: Category', 'label: Use of language models and other generative models', 'under "Websites & social links"'].every((x) => form.includes(x))
    && pr.includes('Find the section "Websites & social links"') && pr.includes('Set its visibility to "Everyone"')
    && form.includes('title: "[Submission] "') && pr.includes('After "[Submission]" in the title') && intake.includes('**Automatic checks**')
    && pr.includes('reads only the name, the links and the works in your ORCID record') && intake.includes('the name, the websites and the works of the public ORCID record') && pr.includes('a comment titled "Automatic checks"')
    && intake.includes("verified ? 'verified' : 'unverified'") && pr.includes('the label `verified` or `unverified`')
    && /types: \[[^\]]*edited/.test(wf) && pr.includes('then edit the issue; the check runs again.'));
  ok('the page sends the reader to the policies, which apply where it differs, and every link leads to a page of the site',
    pr.includes('where this page differs, they apply.') && [...pr.matchAll(/\]\(\.\/([^)]+)\)/g)].every((m) => fs.existsSync(path.join(ROOT, 'site', m[1]))));
  ok('the submit page and the FAQ lead to it, and the sitemap lists it', read(path.join(ROOT, 'site', 'submit.html')).includes('<a href="./process.html">From submission to listing</a>')
    && read(path.join(ROOT, 'site', 'faq.html')).includes('href="./process.html"') && read(path.join(ROOT, 'site', 'sitemap.xml')).includes('<loc>https://sophaxis.vercel.app/process.html</loc>'));
}

/* ------------------------------------------------------------ 23 */
console.log('\n23. Names of the repositories');
{
  /* Figshare writes its name with a capital F. DOIs, addresses and code keep the lower case. */
  const lower = /(?<![./\w-])figshare(?![.\w])/;
  const pages = fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => /\.(html|xml|json)$/.test(f));
  const sources = ['README.md', 'faq.md', 'process.md', 'contact.md', 'policy.md', 'site.json', '.github/ISSUE_TEMPLATE/submission.yml']
    .concat(fs.readdirSync(path.join(ROOT, 'policies')).map((f) => 'policies/' + f));
  const bad = pages.map((f) => 'site/' + f).concat(sources).filter((f) => lower.test(read(path.join(ROOT, f))));
  ok('Figshare is written with a capital F in every page, policy and form', bad.length === 0 && JSON.parse(read(path.join(ROOT, 'site.json'))).repositories['10.6084/m9.figshare.'] === 'Figshare', bad.join(', '));
}

console.log('\n' + '-'.repeat(60));
if (fails.length) {
  console.log(pass + ' passed, ' + fails.length + ' failed.');
  fails.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log(pass + ' checks passed.');
