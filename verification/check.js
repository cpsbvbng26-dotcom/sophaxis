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
const { build, validate, orcidOk, loadPapers, pdfLimits, ris, cslJson, related, pausedNotice, termsNotice, recordDoi, dataciteRecord } = require('../build.js');

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
  ok('a record page with no published version says it has not been peer-reviewed', read(path.join(FIX, 'abs', '2026.0002.html')).includes('It has not been peer-reviewed.'));
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
    'Each week, Sophaxis asks the Internet Archive to save its pages and the PDF copies, where every author of the work consents to it, so that they stay readable even if this site goes away.',
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
    'The operator is liable, as Japanese law provides, for loss that the operator causes by intent or negligence.',
    'The operator is not liable for loss caused only by the content of a listed work, which its authors write, or only by GitHub, Vercel or a repository, unless the law makes the operator liable for it.',
    'For anyone else, the court that the law sets has jurisdiction.',
    'Except where serious harm requires it at once, the operator removes material on a request only after asking the authors whether they agree; if they do not object within 7 days, the operator may remove it.',
    'Until then, the operator lists a work by an author other than the operator only after every author has given this consent in the submission issue.',
    'If Sophaxis closes, the operator will keep the repository with every record public, so that the records stay readable.',
    'A request that cannot be made in public goes by email to the address on the operator\'s [ORCID record](https://orcid.org/0009-0000-1406-0547).',
    'For personal data and other serious harm, the record page (its title, authors, abstract and PDF copy) is taken offline at once, before the decision, while GitHub Actions runs for Sophaxis, and OAI-PMH reports the record as deleted until it is put back.',
    'The address keeps working, so that citations lead to the notice instead of to nothing.',
    'Vercel processes each request, including the IP address, in order to serve the page, under its own privacy policy.',
    'The operator\'s address is not published; it is given on request, without delay.',
    'A person can ask for access to, correction of, suspension of the use of, or deletion of their personal data held by Sophaxis, through a removal issue that names only the Sophaxis id and the kind of request, or by email to the address on the operator\'s [ORCID record](https://orcid.org/0009-0000-1406-0547).',
    'Sophaxis keeps an unmodified copy of the PDF of each listed version, so that search engines can index the full text.',
    'Authors can ask for the copy to be removed; the record then links to the repository only.',
    'For any other repository, the authors can attach the deposited PDF to their submission issue.',
    'Sophaxis then keeps that file unmodified, and the record says that the authors provided it.',
    'When a deposit holds more than one PDF, Sophaxis does not guess which one is the paper, and makes no copy.',
    'Sophaxis does not control whether or when a search engine indexes a page.',
    'Sophaxis does not guarantee the quality of any listed work.',
    'Only an author of a work can submit it.',
    'A submission that does not pass both is not listed.',
    'It is not an official identity check.',
    'It does not ask for the person section as a whole, so public email addresses and the country are never received.',
    'The check uses only the name, the websites and the works, and keeps or writes nothing else from the ORCID record.',
    'Records are kept to preserve the scholarly record, for freedom of expression and information (Article 17(3)(a)).',
    'The OAI-PMH interface gives the same email address as the operator\'s ORCID record, because the protocol requires one.',
    'Material that was taken offline while the request was reviewed is put back.',
    'A request to disclose who submitted material is handled as Japanese law provides.',
    'Even then, the change is announced before it takes effect.',
    'Sophaxis applies Japan\'s Act on the Protection of Personal Information in full, as if its operator were a business operator under that Act.',
    'Sophaxis treats the personal data in records that reaches GitHub, Vercel, ORCID and the Internet Archive, and the public parts of a submission that reach Anthropic, OpenAI and xAI while it is reviewed, as provided to a third party in a foreign country, under Article 28 of Japan\'s Act on the Protection of Personal Information.',
    'If personal data leaks in a way that the law requires to be reported, the operator reports it to Japan\'s Personal Information Protection Commission and tells the people concerned.',
    'Sophaxis has not appointed a representative in the European Union or the United Kingdom (Article 27).',
    'The operator has decided not to appoint one.',
    'The operator answers them, and the data protection authorities, directly, in place of a representative.',
    'Sophaxis applies Japan\'s Consumer Contract Act to readers and authors as if its operator were a business operator under it.',
    'From 2026-11-21, a work with more than one author is listed only after every other author confirms their own agreement.',
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
  ok('the decision not to appoint an EU or UK representative, and its reason, are stated in both languages and under the Digital Services Act; no text says one will be appointed',
    read(path.join(ROOT, 'policies', 'privacy.ja.md')).includes('置かないと決めています。') && read(path.join(ROOT, 'policies', 'privacy.ja.md')).includes('代理人に代わって自ら応えます。')
    && read(path.join(ROOT, 'policies', 'privacy.md')).includes('and Sophaxis is run unpaid within free services.')
    && read(path.join(ROOT, 'policies', 'takedown.md')).includes('Sophaxis has no legal representative in the European Union (Article 13), and the operator has decided not to appoint one')
    && read(path.join(ROOT, 'docs', 'records-of-processing.md')).includes('The operator has decided not to appoint one')
    && !/Until one is appointed|置くまでのあいだ/.test(['privacy.md', 'privacy.ja.md', 'takedown.md'].map((f) => read(path.join(ROOT, 'policies', f))).join('\n')));
  ok('the record of processing is in the repository, names the controller, every purpose and that no EU or UK representative is appointed',
    fs.existsSync(path.join(ROOT, 'docs', 'records-of-processing.md'))
    && ['## Controller', '## Processing', '## Lawful basis', 'No representative in the European Union or the United Kingdom has been appointed.', 'Vercel (United States)', 'The Internet Archive (United States)']
      .every((x) => read(path.join(ROOT, 'docs', 'records-of-processing.md')).includes(x)));
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
console.log('\n5. Every page: no requests to other servers, valid CSP, links that resolve, to their sections too');
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
      /* A link to a section, on the same page or another, leads to an element with that id. */
      [...h.matchAll(/href="((?:\.{1,2}\/[^"#]*\.html)?)#([^"]+)"/g)].forEach((m) => {
        const target = m[1] ? path.resolve(path.dirname(path.join(dir, f)), m[1]) : path.join(dir, f);
        const id = m[2].replace(/&amp;/g, '&');
        if (fs.existsSync(target) && !read(target).includes(' id="' + id + '"')) bad.push(f + ': no section ' + m[1] + '#' + id);
      });
      /* A link to a Markdown source is mapped to its page by build.js; only the templates are served as Markdown. */
      [...h.matchAll(/href="([^"]*\.md)(?:#[^"]*)?"/g)].forEach((m) => { if (!/^(\.\/|\.\.\/)*templates\/|^https:\/\/github\.com\//.test(m[1])) bad.push(f + ': link to a Markdown file ' + m[1]); });
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
      /* A record page, in English or in Japanese, has the card of its record. */
      || !h.includes('<meta property="og:image" content="https://sophaxis.vercel.app/' + (/^abs\/(\d{4}\.\d{4})(\.ja)?\.html$/.test(f.replace(/\\/g, '/')) && !h.includes('<meta name="robots" content="noindex">') ? 'card/' + f.replace(/\\/g, '/').slice(4, 13) + '.png' : 'og.png') + '">');
  });
  ok('every page links the logo, and as its share image the card of its record or else the logo', pages.length > 0 && missing.length === 0, missing.join(', '));
}

/* ------------------------------------------------------------ 7 */
console.log('\n7. Search engines see the site as Sophaxis');
{
  const i = read(path.join(ROOT, 'site', 'index.html'));
  ok('the top page carries the Google Search Console verification tag, and no other page does', i.includes('<meta name="google-site-verification" content="UEPpX5mfnLlhOBTBTETu-PmRO_Y4L2SmjEiaq_U1Zf8">')
    && !read(path.join(ROOT, 'site', 'submit.html')).includes('google-site-verification'));
  ok('the top page is titled Sophaxis', i.includes('<title>Sophaxis</title>') && i.includes('<meta property="og:title" content="Sophaxis">'));
  ok('the top page names the site in WebSite microdata', /itemscope itemtype="https:\/\/schema\.org\/WebSite"><meta itemprop="name" content="Sophaxis">(<link itemprop="sameAs" href="https:\/\/[^"]+">)*\s*<a class="brand" href="\.\/" itemprop="url">/.test(i));
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
  /* A fixed day before SITE.llmExtentFrom, so that these checks do not change meaning on that day; section 55 checks the day after. */
  const base = { form, login: 'jcarberry', meta: dc, person, works, today: '2026-11-10' };
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
    && ['10.31219/osf.io/3sj5u', '10.20944/preprints201605.0001.v1', '10.6084/m9.figshare.34419198.v2', '10.21203/rs.3.rs-39251/v1'].every((x) => I.pdfNote(x).includes('attach the deposited PDF'))
    && I.pdfNote('10.5281/zenodo.1234567') === '' && I.pdfNote('10.48550/arXiv.2508.15126') === ''
    && c.includes('attach the deposited PDF')
    && !I.comment(r, { record: Object.assign({}, d.record, { versions: [{ version: 1, doi: '10.5281/zenodo.1234567', date: '2026-10-01' }] }), problems: [] }).includes('attach the deposited PDF'));

  const wf = read(path.join(ROOT, '.github', 'workflows', 'intake.yml'));
  const runs = [...wf.matchAll(/^\s*- run: (.*)$/gm)].map((m) => m[1]);
  ok('the workflow passes the issue text through the environment, never into the shell', runs.join() === "sudo apt-get install -y -qq --no-install-recommends poppler-utils || echo 'poppler-utils could not be installed',node tools/intake.js,node tools/withdraw.js,node tools/published.js"
    && (wf.match(/ISSUE_BODY: \$\{\{ github\.event\.issue\.body \}\}/g) || []).length === 3);
  ok('the workflow may only read the code and write to issues', /permissions:\n  contents: read\n  issues: write\n(?!  \w)/.test(wf));
  ok('each job of the workflow runs only on its own kind of issue: submission, withdrawal or published version', (wf.match(/^    if: /gm) || []).length === 3
    && wf.includes("if: >-\n      contains(github.event.issue.labels.*.name, 'submission')") && wf.includes("if: github.event_name == 'issues' && contains(github.event.issue.labels.*.name, 'withdrawal')")
    && wf.includes("if: github.event_name == 'issues' && contains(github.event.issue.labels.*.name, 'published')"));
  ok('a comment runs the submission check again only when it carries the words of a confirmation, never a bot\'s comment or one on a pull request',
    /issue_comment:\n\s+types: \[created, edited, deleted\]/.test(wf) && wf.includes("!github.event.issue.pull_request && github.event.comment.user.type != 'Bot'")
    && wf.includes("contains(github.event.comment.body, 'I agree to the listing of this work on Sophaxis')") && wf.includes("contains(github.event.comment.body, 'Confirmed by email through the ORCID record')"));
  const src = read(path.join(ROOT, 'tools', 'intake.js'));
  const orcidSrc = ['intake.js', 'published.js', 'withdraw.js'].map((f) => read(path.join(ROOT, 'tools', f)).replace(/\/\*[\s\S]*?\*\//g, '')).join('\n');
  ok('the intake reads only the public name, links and works of an ORCID record, never the person section that holds emails and the country',
    !/\/(email|emails|address|addresses|record|person)'/.test(orcidSrc) && src.includes("'/personal-details'") && src.includes("'/researcher-urls'") && src.includes("'/works'"));
}

/* ------------------------------------------------------------ 10 */
console.log('\n10. PDF copies and the tags Google Scholar reads');
{
  const a = read(path.join(FIX, 'abs', '2026.0001.html'));
  const tag = (n) => [...a.matchAll(new RegExp('<meta name="' + n + '" content="([^"]*)">', 'g'))].map((m) => m[1]);
  ok('the record page carries citation_title, one citation_author per author and the dates: the first version as publication, the day listed as online',
    tag('citation_title')[0] === 'A Fixture Record for Testing the Build'
    && tag('citation_author').join('|') === 'Jane Doe|Taro Yamada' && tag('citation_publication_date')[0] === '2026/11/01' && tag('citation_online_date')[0] === '2026/11/02');
  ok('the record page gives the DOI of the latest version and its own address', tag('citation_doi')[0] === '10.5281/zenodo.1234999'
    && tag('citation_abstract_html_url')[0] === 'https://sophaxis.vercel.app/abs/2026.0001.html');
  ok('citation_pdf_url points to the copy by absolute address, in the directory of the abstract page as Scholar requires', tag('citation_pdf_url')[0] === 'https://sophaxis.vercel.app/abs/2026.0001v2.pdf'
    && tag('citation_pdf_url').length === 1 && tag('citation_pdf_url')[0].replace(/[^/]*$/, '') === tag('citation_abstract_html_url')[0].replace(/[^/]*$/, ''));
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
  /* 2026-11-12 (the fifth pass): Figshare's and Research Square's terms forbid scripts; no copy is attempted from them (check 119). */
  ok('Figshare: no copy is attempted, since its terms forbid scripts', F.sourceFor('10.6084/m9.figshare.34419198.v2', 2) === null);
  ok('Zenodo: the DOI leads to its record in the API', F.sourceFor('10.5281/zenodo.1234567', 1).api === 'https://zenodo.org/api/records/1234567');
  ok('arXiv: one DOI, the version number picks the file', F.sourceFor('10.48550/arXiv.2508.15126', 2).url === 'https://export.arxiv.org/pdf/2508.15126v2');
  ok('Research Square: no copy is attempted, since its terms forbid robots', F.sourceFor('10.21203/rs.3.rs-39251/v1', 1) === null);
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
  ok('a PDF is asked for with */* as well, since Zenodo answers 406 to application/pdf alone', /^application\/pdf, \*\/\*;q=0\.\d$/.test(F.PDF_ACCEPT)
    && read(path.join(ROOT, 'tools', 'fetch_pdf.js')).includes('await get(url, PDF_ACCEPT)'));
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
  ok('an author without an ORCID iD gets no page: a name alone can belong to several people', !a.includes('../author/Taro')
    && fs.readdirSync(path.join(FIX, 'author')).filter((f) => f.endsWith('.html')).length === 1 && fs.readdirSync(path.join(FIX, 'author')).join() === '0000-0002-1825-0097.bib,0000-0002-1825-0097.html');
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
    && ['取り扱う者', '取り扱う個人情報', '利用目的', '公開と第三者への提供', '外国にある事業者の利用', '安全のための措置', '保存の期間', '開示・訂正・利用停止・削除の求め'].every((h) => new RegExp('<h2 id="[^"]+">' + h + '</h2>').test(ja)));
  ok('the Japanese page names every foreign service the English policy names, and links back to it', ['GitHub（米国）', 'Vercel（米国）', 'DataCite（ドイツ）', 'Crossref（米国）', 'ORCID（米国）', 'Internet Archive（米国）'].every((s) => ja.includes(s))
    && ja.includes('href="./privacy.html"') && read(path.join(ROOT, 'policies', 'privacy.md')).includes('GitHub (United States)') && read(path.join(ROOT, 'site', 'sitemap.xml')).includes('policies/privacy.ja.html</loc><lastmod>' + /最終更新：(\d{4}-\d{2}-\d{2})。/.exec(read(path.join(ROOT, 'policies', 'privacy.ja.md')))[1]));
  ok('Japanese lines join without a space, English lines with one', ja.includes('どこにも書き写しません。サイトは、閲覧者の個人情報を集めません。') && read(path.join(ROOT, 'site', 'policy.html')).includes('It lists preprints that authors have already deposited in an open repository, and it gives'));
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
    .every((f) => /<footer>[\s\S]*Operated by Takuya Nemoto\. [^<]*Hosted on Vercel\.[\s\S]*href="(\.\/|\.\.\/|\/)policies\/privacy\.html">Privacy<\/a>[\s\S]*<\/footer>/.test(read(path.join(ROOT, 'site', f))))
    && read(path.join(ROOT, 'policies', 'privacy.md')).includes('The site is hosted on Vercel.'));
  ok('every page links the Terms of Use, the Privacy Policy and the Takedown Policy', fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html'))
    .every((f) => ['terms', 'privacy', 'takedown'].every((s) => new RegExp('href="(\\./|\\.\\./|/)policies/' + s + '\\.html"').test(read(path.join(ROOT, 'site', f))))));
  const form = read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'submission.yml'));
  ok('the submission form requires consent of every author and the right to share the version', /- label: "I confirm that every author of this work agrees to this submission and to its listing on Sophaxis\."\n\s+required: true/.test(form)
    && /- label: "I confirm that the authors have the right to share this version under that licence, and that, if a journal has published the work, the publisher allows it\."\n\s+required: true/.test(form));
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
  const main = r.slice(r.indexOf('<main'), r.indexOf('</main>'));
  ok('a removed record keeps its address with a notice that says only that the record with that id was removed: no reason, no date, nothing else',
    r.includes('<h1>Record removed</h1>') && main.includes('This record (Sophaxis:2026.0003) has been removed.')
    && !/because|reason|copyright|personal data|2026-12-10|Takedown/i.test(main) && (main.match(/<(p|div|h1)\b/g) || []).length === 3
    && r.includes('<meta name="robots" content="noindex">') && !r.includes('citation_') && !r.includes('../pdf/'));
  const everywhere = ['index.html', 'feed.xml', 'papers.json', 'sitemap.xml', 'search.html', 'list/logic.html', 'list/mathematics.html'].map((f) => read(path.join(FIX, f))).join('\n');
  ok('a removed record is left out of the listing, the fields, the feed, the JSON and the sitemap', !everywhere.includes('2026.0003') && read(path.join(FIX, 'index.html')).includes('All fields (2)<'));
  const removed = JSON.parse(read(path.join(__dirname, 'fixtures', 'papers', '2026.0003.json')));
  [
    ['a removed record that keeps its title', (p) => { p.title = 'x'; }],
    ['a removed record that keeps a PDF copy', (p) => { p.pdfs = []; }],
    ['a removed record without a date', (p) => { delete p.removal_date; }],
    ['a removed record that keeps a reason', (p) => { p.removal_reason = 'personal-data'; }],
    ['a removed record that keeps a reason and its issue', (p) => { p.removal_reason = 'copyright'; p.issue = 3; }],
    ['a removed record that keeps its submission issue', (p) => { p.issue = 3; }],
    ['a record under review without its submission issue', (p) => { p.removal_reason = 'under-review'; }],
  ].forEach(([label, spoil]) => {
    const p = JSON.parse(JSON.stringify(removed));
    spoil(p);
    ok('refuses ' + label, validate(p, '2026.0003.json').length > 0);
  });

  const I = require('../tools/intake.js');
  const P0 = require('../tools/published.js');
  const f = I.parseIssue(read(path.join(__dirname, 'fixtures', 'intake', 'issue.md')));
  const pubDesc = P0.describe(JSON.parse(read(path.join(__dirname, 'fixtures', 'published', 'crossref-article.json'))));
  const d0 = I.draft({ form: f, login: 'jcarberry', issue: 9, meta: I.fromDataCite(JSON.parse(read(path.join(__dirname, 'fixtures', 'intake', 'datacite.json')))),
    versions: [{ doi: '10.6084/m9.figshare.1234567.v1', date: '2026-11-03' }], result: { licence: 'CC-BY-4.0' }, paperDir: fs.mkdtempSync(path.join(os.tmpdir(), 'sophaxis-')), today: '2026-11-10', pub: pubDesc });
  ok('the intake reads the published version at submission, and the draft records it with its metadata, as reported by the authors',
    f.published === '10.1000/fixture.journal.1' && d0.problems.length === 0 && d0.record.published.doi === '10.1000/fixture.journal.1'
    && d0.record.published.venue === 'Journal of Fixture Studies' && d0.record.published.evidence === 'authors' && d0.record.published.peer_reviewed === null
    && d0.record.published.reported === '2026-11-10' && d0.record.published.issue === 9 && !('published_doi' in d0.record));
  const good = JSON.parse(read(path.join(__dirname, 'fixtures', 'papers', '2026.0001.json')));
  ok('refuses the old published_doi field', validate(Object.assign({}, good, { published_doi: '10.1000/x' }), '2026.0001.json').some((x) => x.includes('published_doi was replaced')));
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
  ok('the sitemap gives each address the date it last changed', sm.includes('<loc>https://sophaxis.vercel.app/abs/2026.0001.html</loc><lastmod>2027-03-20</lastmod>')
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
  ok('a changed licence is reported', Wt.compare(p, { '10.5281/zenodo.1234567': { licences: ['CC-BY-NC-4.0'] } }).join().includes('no longer carries only CC BY 4.0'));
  ok('a licence that now sits beside another is reported', Wt.compare(p, { '10.5281/zenodo.1234567': { licences: ['CC-BY-4.0', 'CC-BY-NC-4.0'] } }).join().includes('no longer carries only CC BY 4.0'));
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
  /* The fields of the fixtures and of the live records, in the order the build writes them, so that a field that only
   * the live records carry (collections, llm_extent) is documented too. */
  const writer = (/function papersJson\([\s\S]*?\n}\n/.exec(read(path.join(ROOT, 'build.js'))) || [''])[0];
  const place = (k) => { const m = new RegExp('[{ ]' + k + ':').exec(writer); return m ? m.index : writer.indexOf('STATEMENT_KEYS'); };
  const emitted = [...new Set(JSON.parse(read(path.join(FIX, 'papers.json'))).concat(JSON.parse(read(path.join(ROOT, 'site', 'papers.json')))).flatMap((x) => Object.keys(x)))]
    .sort((a, b) => place(a) - place(b));
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
  const rb = body.replace('### Reason, shown on the record page', '### What should happen to the record\n\nRemove: only the Sophaxis id stays\n\n### Reason, shown on the record page');
  const rf = W.parse(rb);
  ok('the withdrawal form offers withdrawal or removal; an issue without the choice asks for withdrawal', rf.mode === 'remove' && form.mode === 'withdraw'
    && Object.keys(W.MODES).every((m) => t.includes('- "' + m + '"')) && /label: What should happen to the record\n\s+options:[\s\S]*?required: true/.test(t));
  const rp = W.check({ form: Object.assign({}, rf, { reason: '' }), login: 'janedoe', record: rec, person, works: new Set() });
  ok('removal needs no reason, can follow a withdrawal, and is never asked of a removed record',
    rp.ok && W.check({ form: rf, login: 'janedoe', record: Object.assign({}, rec, { status: 'withdrawn' }), person, works: new Set() }).ok
    && !W.check({ form: rf, login: 'janedoe', record: { id: '2026.0001', status: 'removed', removal_date: '2026-11-07' }, person, works: new Set() }).ok
    && !W.check({ form: Object.assign({}, form, { reason: '' }), login: 'janedoe', record: rec, person, works: new Set() }).ok);
  const rc = W.comment(rp, null, rf);
  ok('a verified request for removal says that the operator removes it by the label "upheld", that only the id stays, and posts no record',
    rc.includes('labelling this issue `upheld`') && rc.includes('Only the Sophaxis id then stays') && !rc.includes('~~~~json'));
  const rsrc = read(path.join(ROOT, 'tools', 'removal.js'));
  const rwf = read(path.join(ROOT, '.github', 'workflows', 'removal.yml'));
  ok('the owner\'s label "upheld" on a verified withdrawal issue that asks for removal removes the record, and only then',
    rwf.includes("(contains(github.event.issue.labels.*.name, 'removal') || contains(github.event.issue.labels.*.name, 'withdrawal'))")
    && rsrc.includes("if (labels.includes('withdrawal')) return decideWithdrawal(n, labels, decision);")
    && rsrc.includes("if (form.mode !== 'remove') return say(") && rsrc.includes("if (!labels.includes('verified')) return say("));
  ok('the Withdrawal Policy lets an author have the record removed, and points to what removal leaves',
    ['## Removal at an author\'s request', 'An author can ask, in the same issue, for the record to be removed instead of withdrawn.', 'A record that is already withdrawn can still be removed.',
      'Only the Sophaxis id then stays, as the section "What a removed record leaves" in the [Takedown Policy](./takedown.md) sets out.'].every((x) => pol.includes(x)));
  const tk = read(path.join(ROOT, 'policies', 'takedown.md'));
  ok('the Takedown Policy sets out exactly what a removed record leaves, for every reason, on the site, in the records, in the issues and outside',
    ['A record is removed in three cases.', 'The third is when an author of the work asks for it in a withdrawal issue', '## What a removed record leaves', 'This section applies to every removed record, whatever the reason.',
      'The record keeps only its Sophaxis id, the word "removed" and the day of removal.', 'Deleting an issue also deletes its edit history.',
      'Until GitHub does so, earlier versions of the record stay in the history of the public repository.', 'The Sophaxis id of a removed record is never given to another work.'].every((x) => tk.includes(x))
    && tk.indexOf('## What a removed record leaves') > tk.indexOf('## What happens'));
  ok('the Privacy Policy, in both languages, and the Submission Policy say that an author can have a record removed and what it keeps',
    read(path.join(ROOT, 'policies', 'privacy.md')).includes('A removed record keeps only its Sophaxis id and the day of removal')
    && read(path.join(ROOT, 'policies', 'privacy.ja.md')).includes('削除した記録に残るのは、Sophaxis の番号と削除の日だけです。')
    && read(path.join(ROOT, 'policies', 'submission.md')).includes('An author can instead have the record removed, so that only its Sophaxis id stays.'));
  ok('the Withdrawal Policy says who may withdraw, that the record stays, that the PDF copies go, and how it differs from removal',
    ['Any one author of a listed work can withdraw it.', 'An automatic check confirms both and posts the result in the issue.', 'The PDF copies are taken off the site, and the record links to the repository only.',
      'A withdrawn record takes no new versions.', 'Withdrawal on Sophaxis does not touch the deposit.', 'It follows the [Takedown Policy](./takedown.md).'].every((x) => pol.includes(x))
    && read(path.join(ROOT, 'policies', 'submission.md')).includes('[Withdrawal Policy](./withdrawal.md)'));
}

/* ------------------------------------------------------------ 19 */
console.log('\n19. The authors bear full responsibility');
{
  const terms = read(path.join(ROOT, 'policies', 'terms.md'));
  ok('the Terms of Use put the content, the rights, material from others, personal data, the disclosure and the confirmations on the authors',
    terms.includes('The authors bear full responsibility for their work and for its listing on Sophaxis.')
    && ['the content of the work', 'the right to share the version', 'material from others', 'personal data of third parties', 'the statement on generative models', 'the truth of everything the submitter confirms']
      .every((x) => terms.includes('- ' + x)));
  ok('moderation moves none of it to the operator; a claim from a third party is the authors\u2019, as the law provides; takedown still applies',
    terms.includes('Moderation does not move any of this to the operator.')
    && terms.includes('the authors are responsible for it, as the law provides.') && terms.includes('Nothing in them limits a right that the law does not allow to be limited.')
    && terms.includes('The operator still acts on requests under the [Takedown Policy](./takedown.md).'));
  const form = read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'submission.yml'));
  ok('the submitter confirms it in the form and in the Submission Policy',
    form.includes('- label: "I agree that the authors bear full responsibility for the work and its listing, as the [Terms of Use](https://sophaxis.vercel.app/policies/terms.html#the-authors-bear-full-responsibility) set out."\n          required: true')
    && read(path.join(ROOT, 'policies', 'submission.md')).includes('- I agree that the authors bear full responsibility for the work and its listing, as the [Terms of Use](./terms.md#the-authors-bear-full-responsibility) set out.'));
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
    forms.length === 6 && forms.every((f) => c.includes('issues/new?template=' + f + '"'))
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
  const time = (/^(As a guide, a decision can come [^\n]+)$/m.exec(read(path.join(ROOT, 'policies', 'moderation.md'))) || [, '(none)'])[1];
  ok('the FAQ gives the moderation time and the PDF limit that the policy and site.json set',
    faq.includes(time) && faq.includes('at most ' + site.pdfLimits.fileMB + ' MB.'));
  const links = [...faq.matchAll(/\]\((\.\/[^)#]+)[^)]*\)/g)].map((m) => require('../build.js').sitePath(m[1], 'faq.md', 'faq.html') || m[1]);
  ok('every link in the FAQ leads to a page of the site', links.length >= 8 && links.every((l) => fs.existsSync(path.join(ROOT, 'site', l))), links.filter((l) => !fs.existsSync(path.join(ROOT, 'site', l))).join(', '));
  const qs = [...faq.matchAll(/^## (.*)$/gm)].map((m) => m[1]);
  ok('every heading of the FAQ is a question, and the page says that the policies apply where they differ',
    qs.length >= 10 && qs.every((q) => q.endsWith('?')) && faq.includes('Where they differ, the policy applies.'));
  ok('every page links the FAQ from its navigation, and the sitemap lists it',
    fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html'))
      .every((f) => /<nav(?: lang="en")?>[^\n]*href="(\.\/|\.\.\/|\/)faq\.html">FAQ<\/a><\/nav>/.test(read(path.join(ROOT, 'site', f))))
    && read(path.join(ROOT, 'site', 'sitemap.xml')).includes('<loc>https://sophaxis.vercel.app/faq.html</loc>'));
}

/* ------------------------------------------------------------ 22 */
console.log('\n22. From submission to listing: the page agrees with the form, the check and the policies');
{
  const pr = read(path.join(ROOT, 'process.md'));
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const list = (xs, conj) => xs.slice(0, -1).join(', ') + ' ' + conj + ' ' + xs[xs.length - 1];
  const time = (/^(As a guide, a decision can come [^\n]+)$/m.exec(read(path.join(ROOT, 'policies', 'moderation.md'))) || [, '(none)'])[1];
  ok('the page names the repositories and licences of site.json, the moderation time and the PDF limit',
    pr.includes(list(Object.values(site.repositories), 'or') + ', with a DOI.') && pr.includes(list(Object.values(site.licenses), 'or') + ' on the deposit')
    && pr.includes(time) && pr.includes('at most ' + site.pdfLimits.fileMB + ' MB.'));
  ok('the moderation time is a guide from the same day to a few months, with no fixed number of days',
    time === 'As a guide, a decision can come on the day of submission, but it can also take several weeks or a few months.'
    && !/within \d+ days/.test(read(path.join(ROOT, 'policies', 'moderation.md'))));
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
    pr.includes('where this page differs, they apply.') && [...pr.matchAll(/\]\((\.\/[^)#]+)[^)]*\)/g)].every((m) => fs.existsSync(path.join(ROOT, 'site', require('../build.js').sitePath(m[1], 'process.md', 'process.html') || m[1]))));
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

/* ------------------------------------------------------------ 24 */
console.log('\n24. Disclaimer, the page for repositories, and GitHub');
{
  const dis = read(path.join(ROOT, 'disclaimer.md'));
  const rep = read(path.join(ROOT, 'site', 'repositories.html'));
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  ok('the disclaimer covers peer review, metadata, the identity check, affiliation, GitHub, links, availability, advice and liability, and defers to the Terms',
    ['## Listed work', '## Metadata', '## The identity check', '## No affiliation', '## GitHub and other services', '## Links', '## Availability', '## Not advice', '## Liability'].every((h) => dis.includes(h))
    && dis.includes('The [Terms of Use](./policies/terms.md) are binding; where this page differs, they apply.')
    && dis.includes('It is not affiliated with, endorsed by or a partner of any repository it lists, nor of DataCite, Crossref, JaLC, OpenAlex, ORCID, GitHub, Vercel or the Internet Archive.')
    && dis.includes('Sophaxis does not use GitHub or ORCID sign-in')
    && dis.includes('through the public APIs of DataCite, Crossref, JaLC, OpenAlex, ORCID and the repositories.'));
  ok('who runs Sophaxis and why: an unpaid volunteer who is the only moderator, served within free services, Claude Code paid by the operator, duties unchanged, a reason that judges no other archive',
    ['The operator, who is at present also the only moderator, runs Sophaxis as an unpaid volunteer.', 'No one is paid for work on Sophaxis, and no one pays to submit or to read.',
      'Sophaxis is served only within the free services of GitHub and Vercel, at the address sophaxis.vercel.app, and has no domain or hosting to pay for.',
      'The operator pays personally for Claude Code, the tool with which the site and its code are written (see How Sophaxis was made below).', 'Sophaxis takes no money from anyone to cover it.',
      'Serving unpaid does not lessen what the operator owes readers and authors under the [Terms of Use](./policies/terms.md) and the [Privacy Policy](./policies/privacy.md).',
      'This is the operator\'s reason, not a judgement on other archives.', 'Sophaxis does not replace them, and a work listed here stays in its own repository.'].every((x) => dis.includes(x))
    && dis.indexOf('## Who runs Sophaxis, and why') < dis.indexOf('## The operator\'s own use')
    && read(path.join(ROOT, 'policies', 'moderation.md')).includes('moderates under this policy without pay')
    && read(path.join(ROOT, 'contact.md')).includes('The operator runs it as an unpaid volunteer, and is at present the only moderator. It is served only within free services; the operator pays personally for Claude Code, with which it is written.')
    && read(path.join(ROOT, 'README.md')).includes('runs Sophaxis as an unpaid volunteer. It is served only within the free services of GitHub and Vercel; the operator pays personally for Claude Code, with which it is written.')
    && read(path.join(ROOT, 'README.md')).includes('無報酬のボランティアとして運営しています。配信は GitHub と Vercel の無料の範囲だけで行っています。サイトとコードを書く Claude Code の利用料は、運営者が個人で払っています。')
    && !read(path.join(ROOT, 'README.md')).includes('費用も広告もありません'));
  ok('the operator\'s own use is stated: a hobby reading shelf that changes nothing in the listing, authors only, no business, no publishing, licence-bound copies, no rights taken, takedown, and no claim of no legal risk',
    dis.includes('## The operator\'s own use') && dis.includes('The operator keeps Sophaxis as a hobby, as an extension of a personal reading shelf')
    && dis.includes('This use does not change what is listed or how.')
    && dis.includes('Only an author of a work can submit it. The operator does not list a work by someone else because the operator has read it or wants to keep it')
    && dis.includes('Sophaxis is not run for profit. It charges no one, sells nothing, shows no advertising and earns nothing.')
    && dis.includes('Sophaxis does not publish works.') && dis.includes('Sophaxis takes no copyright and no exclusive licence in any work.')
    && dis.includes('(./policies/takedown.md)') && dis.includes('They are not legal advice, and they do not claim that no legal question can arise.')
    && !/(no|free of|without) legal risk|legally safe|risk-free/i.test(dis)
    && read(path.join(ROOT, 'contact.md')).includes('The operator keeps it as a hobby, as an extension of a personal reading shelf')
    && read(path.join(ROOT, 'README.md')).includes('The operator keeps Sophaxis as a hobby, as an extension of a personal reading shelf.')
    && read(path.join(ROOT, 'README.md')).includes('運営者は、趣味の読書棚の延長として Sophaxis を使っています。')
    && read(path.join(ROOT, 'policies', 'privacy.md')).includes('runs no analytics'));
  ok('the page for repositories lists every repository of site.json with its DOI prefix', Object.entries(site.repositories).every(([p, n]) => rep.includes('<li>' + n.replace(/&/g, '&amp;') + ': DOIs beginning <code>' + p + '</code></li>')));
  const ua = 'Sophaxis (' + site.repo + ')';
  /* 2026-11-12 (the fifth pass): the check read three tools only, and six others sent their own User-Agents. Every file under
   * tools/ is now read: tools/ua.js holds the only fetch(), the only curl and the only User-Agent, and every other file sends
   * through it. Comments are dropped before the reading; a string that names a User-Agent, curl or wget fails, as does a
   * module that makes requests of its own (http, https, http2, net, tls, dgram, undici). */
  const uaFiles = () => Object.fromEntries(fs.readdirSync(path.join(ROOT, 'tools')).filter((f) => f.endsWith('.js')).sort().map((f) => [f, read(path.join(ROOT, 'tools', f))]));
  const uaProblems = (files, agent) => {
    const bad = [];
    const code = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    const u = code(files['ua.js'] || '');
    if (!u.includes("const UA = 'Sophaxis (' + SITE.repo + ')';") || agent !== ua) bad.push('ua.js: the User-Agent');
    if ((u.match(/(^|[^.\w])fetch\s*\(/g) || []).length !== 1 || !u.includes("headers['User-Agent'] = UA;\n  return fetch(url, { ...opts, headers });")) bad.push('ua.js: request()');
    if ((u.match(/'curl'/g) || []).length !== 1 || !u.includes("return execFileSync('curl', ['-A', UA].concat(args), opts);")) bad.push('ua.js: curl()');
    for (const [f, t] of Object.entries(files)) {
      if (f === 'ua.js') continue;
      const c = code(t);
      if (/(^|[^.\w])fetch\s*\(/.test(c)) bad.push(f + ': fetch()');
      if (/user-agent/i.test(c)) bad.push(f + ': a User-Agent of its own');
      if (/['"`](curl|wget)['"`]/.test(c)) bad.push(f + ': curl or wget');
      if (/require\(\s*['"`](node:)?(https?|http2|net|tls|dgram|undici)['"`]\s*\)|\bXMLHttpRequest\b|\bWebSocket\b/.test(c)) bad.push(f + ': a module that sends requests');
      if (/(^|[^.\w])request\s*\(|\bua\.request\s*\(|curlUA\s*\(/.test(c) && !/require\('\.\/ua\.js'\)/.test(c)) bad.push(f + ': request() not from ua.js');
    }
    return bad;
  };
  const uaAgent = JSON.parse(read(path.join(ROOT, 'verification', 'statutes.json'))).agent;
  const up = uaProblems(uaFiles(), uaAgent);
  ok('every request Sophaxis makes names itself with the User-Agent the page for repositories gives: each of the ' + Object.keys(uaFiles()).length + ' files under tools/ sends only through tools/ua.js, which sets it',
    rep.includes('<code>' + ua + '</code>') && up.length === 0, up.join(', '));
  const uaF = uaFiles();
  ok('the check fails on a fetch(), a User-Agent, a curl or an https request in any file under tools/, on a new file that does any of these, and on another User-Agent in tools/ua.js',
    uaProblems({ ...uaF, 'live.js': uaF['live.js'].replace("await request(x.url, { redirect: 'manual'", "await fetch(x.url, { redirect: 'manual'") }, uaAgent).length > 0
    && uaProblems({ ...uaF, 'record.js': uaF['record.js'].replace("Accept: 'application/vnd.github+json', 'Content-Type'", "Accept: 'application/vnd.github+json', 'User-Agent': 'record', 'Content-Type'") }, uaAgent).length > 0
    && uaProblems({ ...uaF, 'sources.js': uaF['sources.js'].replace("try { out = curlUA(args, { encoding: 'utf8' }); }", "try { out = execFileSync('curl', args, { encoding: 'utf8' }); }") }, uaAgent).length > 0
    && uaProblems({ ...uaF, 'new.js': "'use strict';\nconst https = require('https');\nhttps.get('https://example.org/');\n" }, uaAgent).length > 0
    && uaProblems({ ...uaF, 'new.js': "'use strict';\nmodule.exports = () => fetch('https://example.org/');\n" }, uaAgent).length > 0
    && uaProblems({ ...uaF, 'ua.js': uaF['ua.js'].replace("const UA = 'Sophaxis (' + SITE.repo + ')';", "const UA = 'Mozilla/5.0';") }, uaAgent).length > 0
    && uaProblems({ ...uaF, 'ua.js': uaF['ua.js'].replace("headers['User-Agent'] = UA;\n", '') }, uaAgent).length > 0
    && uaProblems(uaF, 'Mozilla/5.0').length > 0
    && uaProblems({ ...uaF, 'watch.js': uaF['watch.js'].replace("const { request } = require('./ua.js');\n", '') }, uaAgent).length > 0);
  ok('the GitHub connection is stated in the FAQ and on the contact page', read(path.join(ROOT, 'faq.md')).includes('## Is Sophaxis connected to GitHub and ORCID?')
    && read(path.join(ROOT, 'contact.md')).includes('the automatic checks run as GitHub Actions there.'));
  ok('every page links the disclaimer and the page for repositories from its footer, and the sitemap lists both',
    fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html'))
      .every((f) => /<footer>[\s\S]*href="(\.\/|\.\.\/|\/)disclaimer\.html">Disclaimer<\/a> · <a href="(\.\/|\.\.\/|\/)repositories\.html">For repositories<\/a>[\s\S]*<\/footer>/.test(read(path.join(ROOT, 'site', f))))
    && ['disclaimer.html', 'repositories.html'].every((f) => read(path.join(ROOT, 'site', 'sitemap.xml')).includes('<loc>https://sophaxis.vercel.app/' + f + '</loc>')));
}

/* ------------------------------------------------------------ 25 */
console.log('\n25. More repositories: SocArXiv, MetaArXiv, SciELO Preprints, Qeios, ScienceOpen Preprints, Advance, KC Works, Jxiv');
{
  const I = require('../tools/intake.js');
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const names = Object.values(site.repositories);
  ok('every accepted repository has an https home page, and no home page is left over',
    names.every((n) => /^https:\/\/[a-z0-9.-]+(\/[a-z0-9\/-]*)?$/.test(site.repositoryHomes[n] || '')) && Object.keys(site.repositoryHomes).sort().join() === names.slice().sort().join());
  const m = I.fromJaLC(JSON.parse(read(path.join(__dirname, 'fixtures', 'intake', 'jalc.json'))));
  ok('a JaLC record (Jxiv) is read in English: title with subtitle, names, ORCID iD, licence, date, abstract, keywords',
    m.agency === 'JaLC' && m.doi === '10.51094/jxiv.99999' && m.title === 'A Fixture Record from JaLC: For Testing the Intake'
    && m.authors[0].name === 'Hanako Yamada' && m.authors[0].family === 'Yamada' && m.authors[0].orcid === '0000-0002-1825-0097' && m.authors[1].orcid === null
    && m.licences.join() === 'CC-BY-4.0' && m.date === '2026-03-07' && m.abstract === 'An English abstract with tags & an entity.'
    && m.keywords.join('|') === 'modal logic|structuralism', JSON.stringify(m).slice(0, 300));
  const cr = JSON.parse(read(path.join(__dirname, 'fixtures', 'intake', 'crossref.json')));
  const review = I.fromCrossref(Object.assign({}, cr, { message: Object.assign({}, cr.message, { type: 'peer-review' }) }));
  const failsOn = (meta) => I.check({ form: { doi: meta.doi, orcid: '0000-0002-1825-0097', category: 'logic', llm: 'No generative model was used in any way.' }, login: 'x', meta, person: null, works: null, listed: new Map(), today: '2026-11-10' })
    .checks.filter((c) => !c[1]).map((c) => c[0]);
  ok('a Crossref DOI for a peer review (as Qeios and ScienceOpen register) is refused; a preprint is not', failsOn(review).includes('The DOI is for a work, not for a review of one')
    && !failsOn(I.fromCrossref(cr)).includes('The DOI is for a work, not for a review of one'));
  ok('the DOI prefixes of the new repositories are recognised, and a SciELO journal outside SciELO Preprints is not',
    ['10.31235/osf.io/q4fp7_v3', '10.31222/osf.io/zjkd2_v2', '10.1590/scielopreprints.18633', '10.32388/tb0ffk', '10.14293/pr2199.004729.v1', '10.31124/advance.19380077', '10.17613/5kv23-39x46', '10.51094/jxiv.161']
      .every((d) => require('../build.js').repoPrefix(d)) && !require('../build.js').repoPrefix('10.1590/s0100-512x2026000100001'));
}

/* ------------------------------------------------------------ 26 */
console.log('\n26. One operator: decisions, continuity, dependencies and statistics');
{
  const mod = read(path.join(ROOT, 'policies', 'moderation.md'));
  const reasons = (/A moderator who declines a submission names one or more of these reasons[^\n]*\n\n((?:- [^\n]+\n)+)/.exec(mod) || [, ''])[1].trim().split('\n');
  ok('every decision is labelled and stays public, and a decline names one of nine fixed reasons',
    mod.includes('labels the issue `accepted` or `declined`.') && mod.includes('Every decision stays public in its issue.') && reasons.length === 9
    && ['Out of scope', 'Not in the form of a scholarly paper', 'Licence', 'Authorship', 'Disclosure', 'Rights or personal data', 'Plagiarism', 'Where the authors live', 'Spam or abuse'].every((r, i) => reasons[i].startsWith('- ' + r)));
  ok('the policy says the operator is the only moderator for now, how others are named, and who may not decide on what',
    mod.includes('The operator is at present the only moderator.') && mod.includes('Each is named, with an ORCID iD, on the [Operator and contact](../contact.md) page before taking any decision')
    && mod.includes('While the operator is the only moderator, the operator also decides on their own submissions') && mod.includes('no moderator decides on their own submission or on one by a close collaborator.'));
  const terms = read(path.join(ROOT, 'policies', 'terms.md'));
  const lic = read(path.join(ROOT, 'policies', 'licences.md'));
  ok('Continuity: a pause after 30 days, the records kept public, a hand-over announced first, anyone may continue under the licences the Licence Policy names',
    terms.includes('## Continuity') && terms.includes('If that lasts for more than 30 days, the top page says that new submissions are paused.')
    && terms.includes('A slow decision is not a pause: moderation can take several weeks or a few months.')
    && read(path.join(ROOT, 'faq.md')).includes('A slow decision does not mean that submissions are paused; when they are, the top page says so.')
    && terms.includes('A hand-over is announced on the site first') && terms.includes('CC BY 4.0 for the text and MIT for the code.')
    && lic.includes('The text of this site is licensed under CC BY 4.0.') && lic.includes('The code is licensed under MIT.'));
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  ok('the pause is one switch in site.json; the top page and the submit page show the notice exactly when it is on',
    typeof site.submissionsPaused === 'boolean' && pausedNotice(true).includes('New submissions are paused.') && pausedNotice(false) === ''
    && ['index.html', 'submit.html'].every((f) => read(path.join(ROOT, 'site', f)).includes('New submissions are paused.') === site.submissionsPaused));
  const dis = read(path.join(ROOT, 'disclaimer.md'));
  ok('the disclaimer says what stops if Vercel, GitHub, the registration agencies or a repository stop',
    ['If Vercel stops', 'If GitHub stops', 'If DataCite, Crossref or JaLC cannot be reached', 'If a repository removes a deposit'].every((x) => dis.includes('- ' + x)));
  ok('the contact page sends complaints, legal matters and personal data to email first',
    read(path.join(ROOT, 'contact.md')).includes('Complaints, legal matters and anything about personal data go by email, not to a public issue'));
  const recs = fs.readdirSync(path.join(ROOT, 'data', 'papers')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(read(path.join(ROOT, 'data', 'papers', f))));
  const st = read(path.join(ROOT, 'site', 'stats.html'));
  const cell = (k) => (new RegExp('<tr><td>' + k + '</td><td>(\\d+)</td></tr>').exec(st) || [, '-'])[1];
  ok('the statistics page counts the records as data/papers holds them',
    cell('Listed') === String(recs.filter((p) => p.status === 'listed').length) && cell('Withdrawn') === String(recs.filter((p) => p.status === 'withdrawn').length)
    && cell('Removed') === String(recs.filter((p) => p.status === 'removed').length) && cell('All') === String(recs.length)
    && Object.entries(site.categories).every(([slug, name]) => cell(name) === String(recs.filter((p) => p.status !== 'removed' && [p.category].concat(p.categories || []).includes(slug)).length)));
  ok('the statistics page links the public decisions by the labels the policies use, and every footer and the sitemap lead to it',
    ['accepted', 'declined', 'withdrawal', 'correction', 'removal'].every((l) => st.includes('issues?q=label%3A' + l + '"'))
    && fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html')).every((f) => /<footer>[\s\S]*href="(\.\/|\.\.\/|\/)stats\.html">Statistics<\/a>/.test(read(path.join(ROOT, 'site', f))))
    && read(path.join(ROOT, 'site', 'sitemap.xml')).includes('<loc>https://sophaxis.vercel.app/stats.html</loc>'));
}

/* ------------------------------------------------------------ 27 */
console.log('\n27. Examples of what is not accepted');
{
  const I = require('../tools/intake.js');
  const { repoPrefix } = require('../build.js');
  const sub = read(path.join(ROOT, 'policies', 'submission.md'));
  const mod = read(path.join(ROOT, 'policies', 'moderation.md'));
  const ex = (/## Examples of what is not accepted\n([\s\S]*?)\n## /.exec(sub) || [, ''])[1];
  const groups = [...ex.matchAll(/^([A-Z][^\n:.]*)[:.]( [^\n]*)?$/gm)].map((m) => m[1]).filter((g) => !/^These|^Each/.test(g));
  const reasons = ['Out of scope', 'Not in the form of a scholarly paper', 'Licence', 'Authorship', 'Disclosure', 'Rights or personal data', 'Spam or abuse'];
  ok('the examples come in groups, and every reason for declining in the Moderation Policy has a group of its own',
    ['Authorship', 'Licence', 'Scope', 'Form', 'Disclosure', 'Rights or personal data', 'Spam or abuse'].every((g) => groups.includes(g)) && reasons.every((r) => mod.includes('- ' + r + ':') || mod.includes('- ' + r + '.'))
    && (ex.match(/^- /gm) || []).length >= 40, groups.join(' | ') + ' / ' + (ex.match(/^- /gm) || []).length + ' examples');
  ok('the licences the examples refuse are the ones the automatic check refuses',
    ['https://creativecommons.org/licenses/by-nc/4.0/', 'https://creativecommons.org/licenses/by-nd/4.0/', 'https://creativecommons.org/licenses/by-nc-sa/4.0/', 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
      'https://creativecommons.org/licenses/by/3.0/', 'https://creativecommons.org/licenses/by/2.0/', 'http://arxiv.org/licenses/nonexclusive-distrib/1.0/', 'cc-by-nc-4.0', 'cc-by-3.0']
      .every((l) => I.licenceOf(l) === null) && I.licenceOf('https://creativecommons.org/licenses/by/4.0/') === 'CC-BY-4.0');
  ok('the DOIs the examples refuse are refused by the check: a SciELO journal, and repositories that give no DOI or are not accepted',
    !repoPrefix('10.1590/s0100-512x2026000100001') && !repoPrefix('10.13140/rg.2.2.34728.33286') && ex.includes('ResearchGate') && ex.includes('The DOI of a peer review report'));
  const cp = read(path.join(ROOT, 'policies', 'copyright.md'));
  ok('the Copyright Policy gives examples of the version shared, material from others and requests',
    /## Examples of what is not allowed\n[\s\S]*The version that is shared:[\s\S]*Material from others:[\s\S]*Requests:/.test(cp) && (cp.match(/^- /gm) || []).length >= 13);
}

/* ------------------------------------------------------------ 28 */
console.log('\n28. Sophaxis ids are never reused, and DOIs of its own are ready');
{
  const { execFileSync } = require('child_process');
  const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' });
  let shallow = 'true';
  try { shallow = git('rev-parse', '--is-shallow-repository').trim(); } catch (e) { shallow = 'no git'; }
  const changed = [];
  if (shallow === 'false') {
    /* Every record file ever added, at the commit that added it. */
    const log = git('log', '--diff-filter=A', '--name-only', '--format=@%H', '--', 'data/papers').split('\n');
    let commit = '';
    for (const line of log) {
      if (line.startsWith('@')) { commit = line.slice(1); continue; }
      const m = /^data\/papers\/(\d{4}\.\d{4})\.json$/.exec(line.trim());
      if (!m) continue;
      const then = JSON.parse(git('show', commit + ':' + line.trim()));
      const file = path.join(ROOT, 'data', 'papers', m[1] + '.json');
      if (!fs.existsSync(file)) { changed.push(m[1] + ' has disappeared'); continue; }
      const now = JSON.parse(read(file));
      const first = (r) => String(((r.versions || [])[0] || {}).doi || '').toLowerCase();
      if (now.status !== 'removed' && first(now) !== first(then)) changed.push(m[1] + ' was ' + first(then) + ' and is now ' + first(now));
    }
  }
  ok('every id ever given in the git history still names the same work (the DOI of its first version), or its removal notice',
    shallow === 'false' && changed.length === 0, shallow !== 'false' ? 'the history is not available (' + shallow + ')' : changed.join('; '));
  const runsCheck = fs.readdirSync(path.join(ROOT, '.github', 'workflows')).filter((f) => read(path.join(ROOT, '.github', 'workflows', f)).includes('node verification/check.js'));
  ok('every workflow that runs the checks reads the whole history (check and pdf)', runsCheck.includes('check.yml') && runsCheck.includes('pdf.yml')
    && runsCheck.every((f) => /actions\/checkout@[0-9a-f]{40} # v\d[\d.]*\n\s+with:\n\s+fetch-depth: 0/.test(read(path.join(ROOT, '.github', 'workflows', f)))), runsCheck.join(', '));
  ok('the draft says that its id is provisional', read(path.join(ROOT, 'tools', 'intake.js')).includes('The id is provisional: if another record takes it first, the record is listed under the next free id.'));

  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const conf = { prefix: '10.99999', suffix: site.doi.suffix };
  const recs = fs.readdirSync(path.join(__dirname, 'fixtures', 'papers')).map((f) => JSON.parse(read(path.join(__dirname, 'fixtures', 'papers', f))));
  const dois = recs.map((p) => recordDoi(p, conf));
  ok('with a prefix, every record gets one DOI made from its id, and no two records share one; without, none',
    site.doi && 'prefix' in site.doi && site.doi.suffix === 'sophaxis.{id}' && dois[0] === '10.99999/sophaxis.2026.0001' && new Set(dois).size === recs.length
    && recordDoi(recs[0], { prefix: null, suffix: 'sophaxis.{id}' }) === null);
  const [listed, withdrawn, removed] = ['2026.0001', '2026.0002', '2026.0003'].map((id) => dataciteRecord(recs.find((p) => p.id === id), conf).data.attributes);
  ok('the DataCite metadata names the authors with ORCID iDs, the licence, the Preprint type and each version DOI; a withdrawal is noted; a removed record is hidden, not deleted',
    listed.event === 'publish' && listed.url === 'https://sophaxis.vercel.app/abs/2026.0001.html' && listed.types.resourceTypeGeneral === 'Preprint'
    && listed.creators[0].nameIdentifiers[0].nameIdentifier === 'https://orcid.org/0000-0002-1825-0097' && listed.rightsList[0].rightsIdentifier === 'cc-by-4.0'
    && listed.relatedIdentifiers.map((r) => r.relatedIdentifier + ' ' + r.relationType).join() === '10.5281/zenodo.1234567 IsVersionOf,10.5281/zenodo.1234999 IsVersionOf,10.1000/fixture.journal.1 IsPreviousVersionOf'
    && withdrawn.descriptions.some((d) => d.descriptionType === 'Other' && d.description.startsWith('Withdrawn on 2026-11-20.'))
    && removed.event === 'hide' && Object.keys(removed).join() === 'doi,event,url');
  const says = ['policy.md:It does not assign DOIs.', 'repositories.md:Sophaxis gives no DOIs of its own.', 'faq.md:## Does Sophaxis give my work a DOI?\n\nNo.'];
  const sayNone = says.every((x) => { const i = x.indexOf(':'); return read(path.join(ROOT, x.slice(0, i))).includes(x.slice(i + 1)); });
  ok('the pages say that Sophaxis assigns no DOIs exactly while site.json gives no prefix, and no record page shows a record DOI before then',
    sayNone === !site.doi.prefix && (site.doi.prefix || !fs.readdirSync(path.join(ROOT, 'site', 'abs')).some((f) => read(path.join(ROOT, 'site', 'abs', f)).includes('Record DOI'))));
}

/* ------------------------------------------------------------ 29 */
console.log('\n29. Lawful use: licences, liability, takedown, and the services Sophaxis relies on');
{
  const cp = read(path.join(ROOT, 'policies', 'copyright.md'));
  ok('the Copyright Policy says how Sophaxis meets the licences: credit, no changes, no added terms, no endorsement',
    ['- Credit:', '- No changes:', '- No added terms:', '- No endorsement:'].every((x) => cp.includes(x)) && cp.includes('The abstract is shown as plain text, with formatting tags removed and its words unchanged.'));
  const a = read(path.join(FIX, 'abs', '2026.0001.html'));
  ok('every record page credits the abstract to its authors under the licence, with a link to it',
    a.includes('<p class="meta">Abstract by Jane Doe, Taro Yamada, given by the authors in the submission issue, because the DOI metadata has none, shown as plain text without other changes, under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.</p>'));
  const terms = read(path.join(ROOT, 'policies', 'terms.md'));
  const dis = read(path.join(ROOT, 'disclaimer.md'));
  ok('no limit of liability reaches intent, gross negligence, or what the Consumer Contract Act or another law forbids to limit',
    terms.includes("nothing in them excludes or limits liability for intent or gross negligence, or any liability that Japan's Consumer Contract Act or another law does not allow to be excluded or limited.")
    && dis.includes('This does not exclude or limit liability for intent or gross negligence'));
  ok('the takedown procedure lets the person concerned answer before a decision, except for serious harm',
    read(path.join(ROOT, 'policies', 'takedown.md')).includes('the person whose material is concerned hears of the request and can answer before a decision, except where serious harm requires the material to be taken offline at once.'));
  const rp = read(path.join(ROOT, 'repositories.md'));
  const page = read(path.join(ROOT, 'site', 'repositories.html'));
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  ok('the page for repositories disclaims for them: not responsible for Sophaxis, its records or its errors; no logos; their terms prevail',
    rp.includes('They are not responsible for Sophaxis, for its records, for its moderation, or for any error that Sophaxis introduces when it shows their metadata.')
    && rp.includes('Sophaxis shows none of their logos') && rp.includes('where a service says otherwise, Sophaxis follows the service.')
    && dis.includes('They are not responsible for Sophaxis, for its records, or for any error that Sophaxis introduces'));
  ok('the acknowledgements thank every repository of site.json and every agency and service Sophaxis uses, with the thanks arXiv asks for',
    Object.values(site.repositories).every((n) => page.includes('>' + n + '</a>, for keeping the deposits and their DOIs</li>'))
    && ['DataCite', 'Crossref', 'Japan Link Center (JaLC)', 'ORCID', 'the Internet Archive', 'GitHub', 'Vercel'].every((n) => page.includes('>' + n + '</a>, for '))
    && page.includes('Thank you to arXiv for use of its open access interoperability.'));
  ok('scripts fetch arXiv files from export.arxiv.org, as arXiv asks', read(path.join(ROOT, 'tools', 'fetch_pdf.js')).includes('https://export.arxiv.org/pdf/') && !read(path.join(ROOT, 'tools', 'fetch_pdf.js')).includes("'https://arxiv.org/pdf/"));
}

/* ------------------------------------------------------------ 30 */
console.log('\n30. Sophaxis says that it was built with Claude Code');
{
  const pages = fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html'));
  const missing = pages.filter((f) => !/<footer>[\s\S]*Written with Claude Code \(Anthropic\), named as a disclosure, not an endorsement; the operator is responsible for the site, and Claude is not an author\.[\s\S]*<\/footer>/.test(read(path.join(ROOT, 'site', f))));
  ok('every page says in its footer that the site was written with Claude Code, named as a disclosure and not an endorsement, that the operator is responsible and that Claude is not an author', pages.length > 0 && missing.length === 0, missing.join(', '));
  /* Naming the tool is a disclosure. The site never links to the maker's products, so that the disclosure does not become an advertisement. */
  const linked = fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => /\.(html|xml|json|txt)$/.test(f))
    .filter((f) => /href="https?:\/\/([a-z0-9-]+\.)*(anthropic\.com|claude\.ai|claude\.com)/i.test(read(path.join(ROOT, 'site', f))));
  ok('no page links to Anthropic or to Claude', linked.length === 0, linked.join(', '));
  ok('the Disclaimer says the name is a disclosure, not an advertisement, by an ordinary paying user with no arrangement, nothing received and no link',
    ['Claude Code is named as a disclosure of how the site was made, not as an endorsement or an advertisement.', 'The operator is an ordinary paying user of it.',
      'Sophaxis has no arrangement with Anthropic, receives nothing from it, and does not link to its products.'].every((x) => read(path.join(ROOT, 'disclaimer.md')).includes(x)));
  const dis = read(path.join(ROOT, 'disclaimer.md'));
  ok('the disclaimer, the FAQ, the contact page and the policy index say so too, and that no language model decides on a submission',
    dis.includes('## How Sophaxis was made') && dis.includes('No language model decides on a submission') && dis.includes('Sophaxis is not affiliated with or endorsed by Anthropic.')
    && read(path.join(ROOT, 'faq.md')).includes('## Was Sophaxis made with a language model?') && read(path.join(ROOT, 'contact.md')).includes('built with Claude Code (Anthropic)')
    && read(path.join(ROOT, 'policy.md')).includes('This site and its code were built with Claude Code (Anthropic).') && read(path.join(ROOT, 'README.md')).includes('Claude is not an author.'));
  ok('the automatic check calls no language model', !/anthropic|openai|api\.claude|generativelanguage/i.test(['intake.js', 'withdraw.js', 'watch.js', 'fetch_pdf.js'].map((f) => read(path.join(ROOT, 'tools', f))).join('\n')));
}

/* ------------------------------------------------------------ 31 */
console.log('\n31. Disputes: agreement first, then the court named in the Terms');
{
  const terms = read(path.join(ROOT, 'policies', 'terms.md'));
  const d = (/## Disputes\n([\s\S]*?)\n## /.exec(terms) || [, ''])[1];
  ok('a dispute goes first to the operator, then to good-faith talks, then to mediation, and only then to court',
    d.includes('settled by agreement wherever possible') && /1\. Write to the operator first/.test(d) && /2\. Both sides then try, in good faith, to reach an agreement by talking\./.test(d)
    && /3\. If talking does not settle it within 60 days, either side may propose mediation/.test(d) && d.indexOf('mediation') < d.indexOf('Utsunomiya District Court'));
  /* The court is named from a day at least 14 days after the change, as "Changes and closure" asks of a change that may narrow a right,
   * and the top-page notice says so. Until that day, the court of the operator's place of residence stays the agreed court. */
  const courtFrom = (/^From (\d{4}-\d{2}-\d{2}), if a dispute is not settled in these ways, it goes to the Utsunomiya District Court or the Utsunomiya Summary Court, /m.exec(d) || [])[1] || '';
  /* The day of the change is the day the sentence naming the court from that day first entered the Terms, read from the history.
   * The "Last updated" date moves with any later change to the Terms, which does not move the court's day. */
  let changed = '';
  try {
    changed = require('child_process').execFileSync('git', ['log', '--reverse', '--format=%cs', '-S', 'From ' + courtFrom + ', if a dispute is not settled in these ways', '--', 'policies/terms.md'], { cwd: ROOT, encoding: 'utf8' }).split('\n')[0] || '';
  } catch (e) { changed = ''; }
  const tj = read(path.join(ROOT, 'policies', 'terms.ja.md'));
  const dj = (/## 紛争\n([\s\S]*?)\n## /.exec(tj) || [, ''])[1];
  const notice = JSON.parse(read(path.join(ROOT, 'site.json'))).termsNotice || {};
  ok('the court of first instance is, from ' + (courtFrom || '(no day)') + ', the Utsunomiya District Court or the Utsunomiya Summary Court, by a non-exclusive agreement made in a form, without taking away the rights of consumers or of people outside Japan, in both languages',
    d.includes('From ' + courtFrom + ", if a dispute is not settled in these ways, it goes to the Utsunomiya District Court or the Utsunomiya Summary Court, as the court of first instance by agreement, for a person who has agreed to these terms in a form; this agreement is not exclusive.")
    && dj.includes(courtFrom + ' から、これらの方法で解決しない紛争は、様式でこの規約に同意した人との間では、宇都宮地方裁判所または宇都宮簡易裁判所を、第一審の合意管轄裁判所とします。この合意は専属的なものではありません。')
    && d.includes('This does not take away a right that the law gives a consumer, or a person outside Japan, to bring or defend a case in another court.')
    && d.includes('urgent relief') && terms.includes('These terms are governed by the laws of Japan.'));
  ok('the court is named at least 14 days after the change, the court of the operator\'s place of residence stays until then, and the top page announces it',
    /^\d{4}-\d{2}-\d{2}$/.test(courtFrom) && /^\d{4}-\d{2}-\d{2}$/.test(changed) && (Date.parse(courtFrom) - Date.parse(changed)) / 86400000 >= 14
    && d.includes("Until then, the court of first instance by agreement is, on the same terms, the district court or the summary court that has jurisdiction over the operator's place of residence.")
    && dj.includes('それまでは、同じ条件で、運営者の住所地を管轄する地方裁判所または簡易裁判所を、第一審の合意管轄裁判所とします。')
    && String(notice.text || '').includes('From ' + courtFrom + ', the court of first instance agreed in a form, for a dispute not settled by talks or mediation, is the Utsunomiya District Court or the Utsunomiya Summary Court'),
    courtFrom + ' / ' + changed);
  /* 2026-11-12: the reply time was a promise without regard to a pause; from 2026-11-26 (14 days' notice) it is the aim that
   * the contact page gives, and a pause under "Continuity" holds the answer. Until then the promise stands, in both languages. */
  ok('the reply time in a dispute is the 7 days the contact page aims at: a promise until 2026-11-25, an aim from 2026-11-26 that waits during a pause under "Continuity", in both languages', d.includes('Until 2026-11-25, the operator answers within 7 days and does not leave a dispute without reply. From 2026-11-26, the operator aims to answer within 7 days and does not leave a dispute without reply; during a pause described under "Continuity" above, the answer waits until the pause ends.')
    && dj.includes('2026-11-25 までは、運営者は 7 日以内に答え、紛争を返事のないまま放置しません。2026-11-26 からは、運営者は 7 日以内に答えることを目指し、紛争を返事のないまま放置しません。上の「続けるための備え」の休止のあいだは、答えは休止が終わるまで待ちます。')
    && read(path.join(ROOT, 'contact.md')).includes('The operator aims to answer within 7 days.')
    && read(path.join(ROOT, 'disclaimer.md')).includes('Disputes are settled by agreement first'));
}

/* ------------------------------------------------------------ 32 */
console.log('\n32. People outside Japan');
{
  const terms = read(path.join(ROOT, 'policies', 'terms.md'));
  const o = (/## People outside Japan\n([\s\S]*?)\n## /.exec(terms) || [, ''])[1];
  ok('people outside Japan: the same steps, in writing or online, in English or Japanese; Japanese law, without taking away protection their own law will not let them give up',
    o.includes('Talks and mediation can be held in writing or online, in English or Japanese, so that no one has to travel to Japan to settle a dispute.')
    && o.includes('Where the law of a person\'s own country gives them protection that cannot be set aside by agreement, such as the protection of consumers, that protection still applies.')
    && o.includes('keeps that right; the agreement on the court above does not take it away.') && o.includes('Where the translation differs from the English text, the English text applies.'));
  ok('takedown requests may come from any country and rest on its law; personal-data rights are open to everyone, with more where their own law gives more',
    read(path.join(ROOT, 'policies', 'takedown.md')).includes('Requests are welcome from any country, in English or Japanese.')
    && read(path.join(ROOT, 'policies', 'takedown.md')).includes('takes the material offline when either requires it.')
    && read(path.join(ROOT, 'policies', 'privacy.md')).includes('These rights are open to everyone, wherever they live.')
    && read(path.join(ROOT, 'policies', 'privacy.md')).includes('the operator honours those rights as far as they apply to Sophaxis.'));
}

/* ------------------------------------------------------------ 33 */
console.log('\n33. GitHub and Vercel: their terms apply alongside, and these terms do not bind them');
{
  const terms = read(path.join(ROOT, 'policies', 'terms.md'));
  const g = (/## GitHub and Vercel\n([\s\S]*?)\n## /.exec(terms) || [, ''])[1];
  ok('the Terms say that GitHub and Vercel are in the United States and that their own terms govern submitting and reading',
    g.includes('Sophaxis runs on two services based in the United States') && g.includes("governed by GitHub's Terms of Service and Privacy Statement, between the user and GitHub.")
    && g.includes('possibly in countries other than Japan or the reader\'s own.'));
  ok('the Terms do not bind GitHub or Vercel, a dispute with them follows their terms, and their removals may not be undone',
    g.includes('They do not bind GitHub or Vercel, and they give no one a claim against GitHub or Vercel') && g.includes('A dispute with GitHub or Vercel themselves follows their terms, including their own choice of law and court.')
    && g.includes('Sophaxis may not be able to restore it.'));
  const td = read(path.join(ROOT, 'policies', 'takedown.md'));
  const pv = read(path.join(ROOT, 'policies', 'privacy.md'));
  ok('a takedown request may also go to GitHub or Vercel, and the operator decides on Sophaxis whatever they decide; their own users\' data is theirs',
    td.includes('A request can also go to GitHub, for example as a copyright notice under its own process, or to Vercel.') && td.includes('the operator decides on Sophaxis under this policy, whatever they decide.')
    && pv.includes('Personal data that GitHub or Vercel hold about their own users') && pv.includes('Vercel (United States)') && pv.includes('GitHub (United States)'));
}

/* ------------------------------------------------------------ 34 */
console.log('\n34. Accessibility of every page, and the security contact');
{
  const pages = fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html'));
  const bad = (test) => pages.filter((f) => !test(read(path.join(ROOT, 'site', f))));
  const noSkip = bad((h) => /<body>\n<a class="skip" href="#main"(?: lang="en")?>Skip to content<\/a>/.test(h) && h.includes('<main class="wrap" id="main">'));
  ok('every page starts with a link that skips to the content, which it reaches', pages.length > 0 && noSkip.length === 0, noSkip.join(', '));
  const lang = bad((h) => /^<!doctype html>\n<html lang="(en|ja)">/.test(h));
  ok('every page names its language', lang.length === 0, lang.join(', '));
  const h1 = bad((h) => (h.match(/<h1[ >]/g) || []).length === 1);
  ok('every page has exactly one main heading', h1.length === 0, h1.join(', '));
  const tables = bad((h) => (h.match(/<table>/g) || []).length === (h.match(/<table><tr><th scope="col">/g) || []).length);
  ok('every table begins with column headers', tables.length === 0, tables.join(', '));
  const empty = bad((h) => !/<a [^>]*>\s*<\/a>/.test(h) && !/<img(?![^>]*\balt=)[^>]*>/.test(h));
  ok('no link is empty and no image lacks a text alternative', empty.length === 0, empty.join(', '));
  const css = (/<style>([\s\S]*?)<\/style>/.exec(read(path.join(ROOT, 'site', 'index.html'))) || [, ''])[1];
  ok('keyboard focus is visible, and the skip link appears when it has focus', /a:focus-visible[^{]*\{ outline: 3px solid var\(--accent\)/.test(css) && /\.skip:focus \{ left: /.test(css));
  ok('the contact page states the accessibility aim and how to report a barrier', read(path.join(ROOT, 'contact.md')).includes('Sophaxis aims to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA.')
    && read(path.join(ROOT, 'contact.md')).includes('label `accessibility`'));
  const sec = read(path.join(ROOT, 'site', '.well-known', 'security.txt'));
  const exp = new Date((/^Expires: (.+)$/m.exec(sec) || [, ''])[1]);
  const days = (exp - Date.now()) / 864e5;
  ok('security.txt gives a contact, a policy and an expiry in the coming year (renew it before it lapses)',
    /^Contact: https:\/\/sophaxis\.vercel\.app\/contact\.html$/m.test(sec) && /^Policy: /m.test(sec) && /^Canonical: https:\/\/sophaxis\.vercel\.app\/\.well-known\/security\.txt$/m.test(sec)
    && days > 0 && days <= 366, 'expires in ' + Math.floor(days) + ' days');
  ok('the contact page sends security problems to email, not to a public issue', read(path.join(ROOT, 'contact.md')).includes('A security problem goes by email, not to a public issue'));
}

/* ------------------------------------------------------------ 35 */
console.log('\n35. General terms: notice of changes, precedence, severability, waiver, minors');
{
  const terms = read(path.join(ROOT, 'policies', 'terms.md'));
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  ok('a change against authors or readers is announced on the top page at least 14 days ahead, with what changes and from when; others take effect on the date shown, never before publication; changes follow Civil Code Article 548-4, and silence or continued use is not agreement',
    terms.includes('is announced on the top page before it takes effect, with what changes and from which date.') && terms.includes('The announcement comes at least 14 days ahead')
    && terms.includes('Other changes, such as clearer wording or new examples, take effect on the date the page shows, which is never before the day they are published.')
    && terms.includes('A change is made only as Article 548-4 of Japan\'s Civil Code allows') && terms.includes('Silence, or continuing to use Sophaxis, is not taken as agreement to a change.')
    && !/means accepting it/.test(terms) && terms.includes('A person who does not accept a change can stop using Sophaxis'));
  ok('the announcement is one setting in site.json, and the top page shows it exactly when it is set',
    'termsNotice' in site && termsNotice({ text: 'Fees stay at zero.', from: '2027-01-15' }).includes('<b>Change to the policies from 2027-01-15.</b> Fees stay at zero.')
    && termsNotice(null) === '' && read(path.join(ROOT, 'site', 'index.html')).includes('Change to the policies from') === !!(site.termsNotice && site.termsNotice.text));
  const g = (/## General\n([\s\S]*?)\n## /.exec(terms) || [, ''])[1];
  ok('General: which text prevails, severability, no waiver, minors, how notices are given',
    g.includes('Where a policy deals with a subject in more detail, it applies to that subject; otherwise, where they differ, these terms apply.')
    && g.includes('The FAQ, the step-by-step page and the Disclaimer explain these terms and do not change them.')
    && g.includes('If a part of these terms is held invalid or unenforceable, the rest stays in force') && g.includes('that does not waive it.')
    && g.includes('A person under 18 may submit only with the consent of a parent or guardian.')
    && read(path.join(ROOT, 'policies', 'submission.md')).includes('A submitter under 18 needs the consent of a parent or guardian.'));
  ok('the pause notice uses the words of the Terms: the operator cannot work on Sophaxis', pausedNotice(true).includes('The operator cannot work on Sophaxis for now.') && terms.includes('cannot work on Sophaxis at all'));
}

/* ------------------------------------------------------------ 36 */
console.log('\n36. Sophaxis elsewhere: the OSF project');
{
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const c = read(path.join(ROOT, 'contact.md'));
  ok('the OSF project and its DOI are in site.json, on the contact page and in the README, and the DOI is said to name the project, not a listed work',
    site.osf && site.osf.url === 'https://osf.io/mq7za/' && site.osf.doi === '10.17605/OSF.IO/MQ7ZA'
    && c.includes('(https://osf.io/mq7za/)') && c.includes('[10.17605/OSF.IO/MQ7ZA](https://doi.org/10.17605/OSF.IO/MQ7ZA)') && c.includes('The DOI names the project, not a listed work.')
    && read(path.join(ROOT, 'README.md')).includes('DOI [10.17605/OSF.IO/MQ7ZA](https://doi.org/10.17605/OSF.IO/MQ7ZA)'));
  ok('the top page links the OSF project and its DOI as sameAs of the site', read(path.join(ROOT, 'site', 'index.html')).includes('<link itemprop="sameAs" href="https://osf.io/mq7za/"><link itemprop="sameAs" href="https://doi.org/10.17605/OSF.IO/MQ7ZA">'));
  {
    const rd = read(path.join(ROOT, 'README.md'));
    /* FAIRsharing was dropped on 2026-11-06 as not worth keeping: it is named nowhere in the README or on the site. */
    ok('the OAI-PMH validation is recorded as a validation, not a listing, in both languages, and FAIRsharing is named nowhere',
      rd.includes('On 2026-11-03 (Japan time) the OAI-PMH base URL, <https://sophaxis.vercel.app/oai>, passed the initial tests')
      && rd.includes('so this is a validation, not a listing.') && rd.includes('2026-11-03（日本時間）に、OAI-PMH の入口') && rd.includes('これは検証であって、一覧への掲載ではありません。')
      && !/FAIRsharing|fairsharing\.org/i.test(rd) && !/registered (with|in) the Open Archives/i.test(rd)
      && !fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html')).some((f) => /FAIRsharing|openarchives\.org\/Register/i.test(read(path.join(ROOT, 'site', f)))));
  }
  /* The Open Access Directory entry, which the operator added, is shown on both top pages with its page, its sections and the day
   * it was last confirmed, said to be no review, and kept out of listedIn (which means a listing that the registry put up after the operator submitted a record). */
  {
    const de = JSON.parse(read(path.join(ROOT, 'site.json'))).directoryEntries || [];
    const oad = de.find((x) => x.name === 'Open Access Directory');
    const en = read(path.join(ROOT, 'site', 'index.html')), jaTop = read(path.join(ROOT, 'site', 'index.ja.html'));
    const url = 'https://oad.simmons.edu/oadwiki/Disciplinary_repositories';
    ok('the Open Access Directory entry is shown on the English and Japanese top pages with its page link, Philosophy and Mathematics, the day it was last confirmed, and that it is no review, and it is not counted among the reviewed listings',
      oad !== undefined && oad.url === url && JSON.stringify(oad.sections) === JSON.stringify(['Philosophy', 'Mathematics']) && oad.since === '2026-11-09' && /^\d{4}-\d{2}-\d{2}$/.test(oad.asOf) && oad.asOf >= oad.since
      && en.includes('<p class="meta">Listed on the <a href="' + url + '">Disciplinary repositories</a> page of the Open Access Directory, under Philosophy and Mathematics, as of ' + oad.asOf + ' (Japan time). The operator added the entry; it is not a review of Sophaxis.</p>')
      && jaTop.includes('<p class="meta">Open Access Directory の <a href="' + url + '">Disciplinary repositories</a> の頁に、Philosophy と Mathematics の欄で掲載されています（' + oad.asOf + ' 現在）。項目は運営者が書き足したもので、Sophaxis の審査ではありません。</p>')
      && !(JSON.parse(read(path.join(ROOT, 'site.json'))).listedIn || []).some((x) => /Open Access Directory/.test(x.name + x.description)),
      oad ? oad.asOf : 'no entry');
  }
  ok('the DOAPR application is recorded as an application, not as a listing', read(path.join(ROOT, 'README.md')).includes('applied for Sophaxis to be listed in DOAPR') && read(path.join(ROOT, 'README.md')).includes("Whether it is listed is DOAPR's decision.")
    && !fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html')).some((f) => /listed in DOAPR|DOAPR-listed/i.test(read(path.join(ROOT, 'site', f)))));
  {
    /* Near the top of the README: the OSF DOI of Sophaxis, where it is listed, and every registration still under review, in both languages. */
    const rd = read(path.join(ROOT, 'README.md'));
    const rows = (head) => { const i = rd.indexOf(head); return i < 0 ? [] : rd.slice(i).split('\n\n').find((b) => b.startsWith('| ')).split('\n').slice(2); };
    const en = rows('## Sophaxis itself: DOI, listings and registrations under review');
    const ja = rows('### Sophaxis 自体の DOI、掲載先と、審査中の登録');
    const names = ['DOAPR', 'OpenDOAR', 'ASAPbio', 'CORE'];
    ok('the README opens with the OSF DOI of Sophaxis, its listing in ROAR with the record, and a table of the registrations under review, the same ' + names.length + ' in both languages, none of them shown as listed',
      rd.indexOf('## Sophaxis itself: DOI, listings and registrations under review') < rd.indexOf('## Submitting') && rd.indexOf('### Sophaxis 自体の DOI、掲載先と、審査中の登録') < rd.indexOf('貢献の窓口')
      && rd.includes('Sophaxis has been listed in ROAR, the Registry of Open Access Repositories at the University of Southampton, since 2026-11-06 (Japan time): <https://roar.eprints.org/27422/>.')
      && rd.includes('サウサンプトン大学の Registry of Open Access Repositories（ROAR）に、2026-11-06（日本時間）から載っています（<https://roar.eprints.org/27422/>）。')
      && rd.includes('The DOI names Sophaxis as a project, not a listed work.') && rd.includes('この DOI が指すのは、プロジェクトとしての Sophaxis です。載っている稿ではありません。')
      && (rd.match(/\[10\.17605\/OSF\.IO\/MQ7ZA\]\(https:\/\/doi\.org\/10\.17605\/OSF\.IO\/MQ7ZA\)/g) || []).length >= 3
      && en.length === names.length && ja.length === names.length
      && names.every((n, i) => en[i].startsWith('| ' + n) && ja[i].startsWith('| ' + n))
      && en.every((r) => /\| 2026-\d\d-\d\d \| (Under review|Under editorial review|Requested|Requested by email|Account requested|Asked; likely eligible, but new submissions are paused)/.test(r) && !/\bListed\b|Approved|Accepted/.test(r))
      && ja.every((r) => /\| 2026-\d\d-\d\d \| (審査中|編集の審査中|依頼済み|アカウントを申請中|問い合わせ済み。基準を満たす見込みだが)/.test(r) && !/掲載済み|承認済み|載った/.test(r))
      && rd.includes('only accounts approved by its editor can edit it.') && rd.includes('describes no review of each entry before it appears, so the listing is not a review of Sophaxis.')
      && rd.includes('編集できるのは、編集者が承認したアカウントだけです。') && rd.includes('この掲載は Sophaxis の審査ではありません。')
      && !en.concat(ja).some((r) => r.includes('Open Access Directory'))
      && rd.includes('None of them has listed it yet, and each decides for itself.') && rd.includes('こちらはまだ載っていません。載せるかどうかは、それぞれが決めます。'));
  }
  /* 2026-11-12 (second pass): ROAR's own pages (fetched as roar-help and roar-information) say that a deposit is put in an
   * "editorial buffer" until "approved by an editor", and do not say what is checked; so the listing is stated with its day,
   * and no review by ROAR is claimed anywhere (README, contact pages, news, the built site). */
  const roarReview = /(passed|after) (its |the )?editorial review[^.]*ROAR|ROAR[^.\n]*(passed|after) (its |the )?editorial review|passed editorial review|after its editorial review|編集の審査を通/;
  const roarFiles = ['README.md', 'contact.md', 'contact.ja.md', 'data/news.json', 'build.js'].map((f) => [f, read(path.join(ROOT, f))])
    .concat(fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => /\.(html|xml|json)$/.test(f)).map((f) => ['site/' + f, read(path.join(ROOT, 'site', f))]));
  const roarClaims = (files) => files.filter(([, t]) => roarReview.test(t)).map(([f]) => f);
  ok('the ROAR record is recorded as submitted on 2026-11-03 and listed since 2026-11-06, with its record, in both languages, and on the top page, the contact page, the press page and the news of the site, and on the history page only as the title of its news item, and nowhere else on it; no page says that it passed an editorial review',
    read(path.join(ROOT, 'README.md')).includes('the operator submitted a record of Sophaxis to ROAR') && read(path.join(ROOT, 'README.md')).includes('University of Southampton. Sophaxis has been listed there since 2026-11-06 (Japan time): <https://roar.eprints.org/27422/>.')
    && read(path.join(ROOT, 'README.md')).includes('Sophaxis の記録を出しました。2026-11-06（日本時間）から載っています（<https://roar.eprints.org/27422/>）。')
    && roarClaims(roarFiles).length === 0 && roarClaims([['x', 'Sophaxis passed editorial review and is listed in ROAR.']]).length === 1 && roarClaims([['x', '編集の審査を通り、載っています']]).length === 1
    && !read(path.join(ROOT, 'README.md')).includes("whether it is listed is ROAR's decision.")
    && read(path.join(ROOT, 'contact.md')).includes('- ROAR: Sophaxis has been listed in the Registry of Open Access Repositories at the University of Southampton since 2026-11-06 (Japan time): [record 27422](https://roar.eprints.org/27422/).')
    && read(path.join(ROOT, 'contact.ja.md')).includes('- ROAR：Sophaxis は、2026-11-06（日本時間）から、サウサンプトン大学の Registry of Open Access Repositories に載っています。[記録 27422](https://roar.eprints.org/27422/) です。')
    && read(path.join(ROOT, 'site', 'contact.html')).includes('<a href="https://roar.eprints.org/27422/">record 27422</a>')
    && read(path.join(ROOT, 'site', 'contact.ja.html')).includes('<a href="https://roar.eprints.org/27422/">記録 27422</a>')
    && JSON.stringify(JSON.parse(read(path.join(ROOT, 'site.json'))).listedIn) === JSON.stringify([{ name: 'ROAR', description: 'the Registry of Open Access Repositories at the University of Southampton', url: 'https://roar.eprints.org/27422/', since: '2026-11-06' }])
    && read(path.join(ROOT, 'site', 'index.html')).includes('<p class="meta">Listed in <a href="https://roar.eprints.org/27422/">ROAR</a>, the Registry of Open Access Repositories at the University of Southampton, since 2026-11-06 (Japan time).</p>')
    && read(path.join(ROOT, 'site', 'press.html')).includes('<tr><th scope="row">Listed in</th><td><a href="https://roar.eprints.org/27422/">ROAR</a> (since 2026-11-06)</td></tr>')
    && read(path.join(ROOT, 'site', 'press.ja.html')).includes('<tr><th scope="row">掲載先</th><td><a href="https://roar.eprints.org/27422/">ROAR</a>（2026-11-06 から）</td></tr>')
    && read(path.join(ROOT, 'site', 'news.html')).includes('Sophaxis is listed in ROAR, the Registry of Open Access Repositories at the University of Southampton. <a href="https://roar.eprints.org/27422/">More</a>')
    && fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html') && !['contact.html', 'contact.ja.html', 'index.html', 'press.html', 'press.ja.html', 'news.html', 'history.html', 'history.ja.html'].includes(f)).every((f) => !/\bROAR\b|roar\.eprints/.test(read(path.join(ROOT, 'site', f))))
    /* The history page names ROAR only as the title of its news item, with no link of its own. */
    && ['history.html', 'history.ja.html'].every((f) => (read(path.join(ROOT, 'site', f)).match(/\bROAR\b/g) || []).length === 1 && read(path.join(ROOT, 'site', f)).includes('<li>2026-11-06: Listed in ROAR</li>') && !read(path.join(ROOT, 'site', f)).includes('roar.eprints')));
  ok('the PhilPapers request is recorded with its answer, not as an addition, in both languages, and the site names PhilPapers only on the page that tells authors how to use it themselves',
    read(path.join(ROOT, 'README.md')).includes('the operator asked PhilPapers to add Sophaxis to its Open Access Gateway') && read(path.join(ROOT, 'README.md')).includes('it recommends depositing them in PhilArchive rather than adding Sophaxis to the Gateway. Sophaxis is not in the Open Access Gateway.')
    && read(path.join(ROOT, 'README.md')).includes('Open Access Gateway へ Sophaxis を加えるよう依頼しました。') && read(path.join(ROOT, 'README.md')).includes('Sophaxis は Open Access Gateway に入っていません。') && !read(path.join(ROOT, 'README.md')).includes("whether it is added is PhilPapers' decision.")
    && !/(indexed|listed|harvested) (by|in|on) PhilPapers|added to (the )?(PhilPapers|Open Access Gateway)/i.test(read(path.join(ROOT, 'README.md')))
    && !fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html') && !['findable.html', 'findable.ja.html'].includes(f)).some((f) => /PhilPapers/i.test(read(path.join(ROOT, 'site', f))))
    && read(path.join(ROOT, 'site', 'findable.html')).includes('Sophaxis has no connection with these services; their names are given only so that authors can find them.')
    && read(path.join(ROOT, 'site', 'findable.ja.html')).includes('Sophaxis は、これらのサービスとつながりを持ちません。')
    && !/(indexed|listed|harvested) (by|in|on) PhilPapers|Sophaxis (is|was) (in|on) PhilPapers/i.test(read(path.join(ROOT, 'site', 'findable.html'))));
}

/* ------------------------------------------------------------ 37 */
console.log('\n37. Short addresses and the Access line, as arXiv has them');
{
  const { vercelConfig } = require('../build.js');
  const { papers } = loadPapers(path.join(ROOT, 'data', 'papers'));
  const shown = papers.filter((p) => p.status !== 'removed');
  const vj = read(path.join(ROOT, 'site', 'vercel.json'));
  ok('vercel.json is what the build makes from the records, not edited by hand', vj === vercelConfig(papers));
  const cfg = JSON.parse(vj);
  const has = (s, d) => cfg.redirects.some((r) => r.source === s && r.destination === d);
  ok('vercel.json is in site/, the root directory of the Vercel project, and nowhere else, and only main is deployed', !fs.existsSync(path.join(ROOT, 'vercel.json')) && Object.keys(cfg).join() === 'headers,redirects,rewrites,git'
    && JSON.stringify(cfg.git) === JSON.stringify({ deploymentEnabled: { '**': false, main: true } })
    && JSON.stringify(cfg.rewrites[0]) === JSON.stringify({ source: '/oai', destination: '/api/oai' }));
  ok('every PDF copy of a listed record is also served at /abs/<file>, and nothing else is rewritten',
    JSON.stringify(cfg.rewrites.slice(1)) === JSON.stringify(shown.flatMap((p) => (p.pdfs || []).map((x) => ({ source: '/abs/' + x.file, destination: '/pdf/' + x.file }))))
    && cfg.rewrites.slice(1).every((r) => fs.existsSync(path.join(ROOT, 'site', r.destination)) && !fs.existsSync(path.join(ROOT, 'site', r.source))));
  ok('the citation_pdf_url of every listed record with a copy is served by a rewrite', shown.filter((p) => (p.pdfs || []).length).every((p) => {
    const m = /<meta name="citation_pdf_url" content="https:\/\/sophaxis\.vercel\.app(\/abs\/[^"]+)">/.exec(read(path.join(ROOT, 'site', 'abs', p.id + '.html')));
    return m && cfg.rewrites.some((r) => r.source === m[1]);
  }));
  ok('every listed record has /abs/<id>, and every PDF copy has /pdf/<id> for the latest and /pdf/<id>v<n> for each version',
    shown.every((p) => has('/abs/' + p.id, '/abs/' + p.id + '.html')
      && (!(p.pdfs || []).length || has('/pdf/' + p.id, '/pdf/' + p.pdfs[p.pdfs.length - 1].file))
      && (p.pdfs || []).every((x) => has('/pdf/' + p.id + 'v' + x.version, '/pdf/' + x.file))));
  ok('every redirect leads to a file the build wrote', cfg.redirects.every((r) => fs.existsSync(path.join(ROOT, 'site', r.destination))));
  ok('the short address of the latest PDF is temporary, because a new version moves it; the others are permanent',
    cfg.redirects.every((r) => r.permanent === !/^\/pdf\/[0-9.]+$/.test(r.source)));
  const fixCfg = JSON.parse(vercelConfig(loadPapers(path.join(__dirname, 'fixtures', 'papers')).papers));
  ok('a removed record gets no short address and no rewrite', loadPapers(path.join(__dirname, 'fixtures', 'papers')).papers.filter((p) => p.status === 'removed')
    .every((p) => !fixCfg.redirects.concat(fixCfg.rewrites).some((r) => r.source.includes(p.id))));
  ok('each listed record page shows the Access line under the authors, with the latest PDF copy first',
    shown.filter((p) => p.status !== 'withdrawn').every((p) => {
      const h = read(path.join(ROOT, 'site', 'abs', p.id + '.html'));
      const last = (p.pdfs || []).slice(-1)[0];
      const a = (/<p class="access">([\s\S]*?)<\/p>/.exec(h) || [, ''])[1];
      return a.startsWith('<b>Access:</b> ') && a.includes('<a href="../cite/' + p.id + '.bib">BibTeX</a>')
        && (!last || a.startsWith('<b>Access:</b> <a href="../pdf/' + last.file + '" type="application/pdf">PDF (v' + last.version + ', ' + last.pages + ' pages)</a>'))
        && h.indexOf('<p class="access">') >= 0 && h.indexOf('<p class="access">') < h.indexOf('<h2 id="abstract">Abstract</h2>');
    }));
  ok('a withdrawn record page has no Access line', loadPapers(path.join(__dirname, 'fixtures', 'papers')).papers.filter((p) => p.status === 'withdrawn')
    .every((p) => !read(path.join(FIX, 'abs', p.id + '.html')).includes('<p class="access">'))
    && loadPapers(path.join(__dirname, 'fixtures', 'papers')).papers.some((p) => p.status === 'withdrawn'));
  ok('the README says that site/vercel.json is generated', read(path.join(ROOT, 'README.md')).includes('`site/vercel.json` is generated with the rest of `site/`'));
}

/* ------------------------------------------------------------ 38 */
console.log('\n38. The JOSS plan');
{
  const readme = read(path.join(ROOT, 'README.md'));
  /* Six months and one day from the first commit, as the JOSS gate is "more than six months". */
  let first = '';
  try { first = require('child_process').execFileSync('git', ['log', '--reverse', '--format=%as'], { cwd: ROOT, encoding: 'utf8' }).split('\n')[0].trim(); } catch (e) { first = ''; }
  const d = new Date(first + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + 6); d.setUTCDate(d.getUTCDate() + 1);
  const earliest = first ? d.toISOString().slice(0, 10) : '';
  ok('the README says, in English and Japanese, that a JOSS submission is planned and nothing has been submitted',
    readme.includes('Submission of the Sophaxis code to the Journal of Open Source Software (JOSS) is planned.') && readme.includes('Nothing has been submitted yet.')
    && readme.includes('投稿することを計画しています。') && readme.includes('まだ投稿していません。'));
  ok('the first commit and the earliest submission date in the README match git (' + first + ', ' + earliest + ')',
    first !== '' && readme.includes('The first commit here is from ' + first + ', so the earliest possible submission is ' + earliest + '.')
    && readme.includes('ここの最初のコミットは ' + first + ' なので、最短で ' + earliest + ' です。'));
  ok('the scope is left to JOSS, and the plan stays in the README: no site page mentions JOSS', readme.includes('Whether a preprint server is within the scope of JOSS is for JOSS to decide.')
    && !fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html')).some((f) => /JOSS|Journal of Open Source Software/.test(read(path.join(ROOT, 'site', f)))));
}

/* ------------------------------------------------------------ 39 */
console.log('\n39. Metadata for a release DOI (Zenodo and CITATION.cff)');
{
  const z = JSON.parse(read(path.join(ROOT, '.zenodo.json')));
  const cff = read(path.join(ROOT, 'CITATION.cff'));
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  ok('.zenodo.json and CITATION.cff give the same title, the operator as the only creator with the ORCID iD, and the MIT licence of LICENSE',
    cff.includes('title: "' + z.title + '"') && z.creators.length === 1 && z.creators[0].orcid === '0009-0000-1406-0547'
    && cff.includes('orcid: "https://orcid.org/0009-0000-1406-0547"') && z.license === 'mit' && cff.includes('license: MIT')
    && /^MIT License/.test(read(path.join(ROOT, 'LICENSE'))));
  /* 2026-11-12 (second pass): the licence field of the release is MIT, so its notes say that it covers the code only, that
   * each listed work with its PDF copy and abstract keeps its own licence, and that texts by others are not licensed here. */
  const ZLIC = ['The licence field of this record covers the code only.', 'Each listed work, with its PDF copy and its abstract, keeps its own licence.',
    'Texts by others that this repository quotes, or keeps to verify its quotations, are not licensed under CC BY 4.0 and remain their owners\'.'];
  ok('the notes of .zenodo.json say that its licence field (MIT) covers the code only, that each listed work with its PDF copy and abstract keeps its own licence, and that texts by others are not licensed under CC BY 4.0; the README says the same of the field and the works',
    ZLIC.every((x) => String(z.notes || '').includes(x))
    && read(path.join(ROOT, 'README.md')).includes('Each listed work, with its PDF copy and its abstract, keeps its own licence. The licence field of `.zenodo.json` (MIT) covers the code only.'));
  /* The DOIs that Zenodo gave on release (DataCite: 24033372 is v1.0.0 and IsVersionOf 24033371). */
  const rd = read(path.join(ROOT, 'README.md'));
  ok('CITATION.cff, the README in both languages and the contact page give the Zenodo DOI of version 1.0.0 and the DOI of every version',
    ['10.5281/zenodo.24033372', '10.5281/zenodo.24033371'].every((d) => cff.includes('value: "' + d + '"') && (rd.split('(https://doi.org/' + d + ')').length - 1) === 2
      && read(path.join(ROOT, 'contact.md')).includes('(https://doi.org/' + d + ')'))
    && cff.includes('doi: "10.5281/zenodo.24033371"') && cff.includes('version: "1.1.0"') && cff.includes('date-released: "2026-11-12"') && read(path.join(ROOT, 'CHANGELOG.md')).includes('Version 1.0.0 was released on 2026-11-07')
    && read(path.join(ROOT, 'CHANGELOG.md')).includes('Version 1.1.0 is dated 2026-11-12'));
  /* Item 418: the release in preparation has one version and one date, in CITATION.cff, in .zenodo.json and in the changelog. */
  const cffVersion = (/^version: "([^"]+)"$/m.exec(cff) || [])[1], cffDate = (/^date-released: "([^"]+)"$/m.exec(cff) || [])[1];
  ok('the release in preparation (' + cffVersion + ', ' + cffDate + ') has the same version and date in CITATION.cff, .zenodo.json and CHANGELOG.md, and the changelog says that its release was stopped and that no release of it exists',
    cffVersion && cffDate && z.version === cffVersion && z.publication_date === cffDate
    && read(path.join(ROOT, 'CHANGELOG.md')).includes('Version ' + cffVersion + ' is dated ' + cffDate + ' and gathers every change merged since')
    && read(path.join(ROOT, 'CHANGELOG.md')).includes('The operator stopped its release on ' + cffDate + ': no GitHub Release and no Zenodo version of ' + cffVersion + ' exist'), z.version + ' ' + z.publication_date);
  ok('the code is tied to the OSF project, with the DOI from site.json, and that DOI is said to name the project',
    z.related_identifiers.some((r) => r.identifier === site.osf.doi && r.relation === 'isPartOf')
    && cff.includes('value: ' + site.osf.doi) && cff.includes('the project, not this code release'));
  ok('the language-model disclosure is in both, and Claude is not an author',
    z.notes.includes('Built with Claude Code (Anthropic)') && z.notes.includes('Claude is not an author.') && cff.includes('Claude is not an author.')
    && !/Claude/.test(JSON.stringify(z.creators)) && !/name: Claude|family-names: Claude/.test(cff));
  ok('a listed work is cited by its own DOI, not by Sophaxis', cff.includes('To cite a listed work, use the DOI of that work, not Sophaxis.'));
}

/* ------------------------------------------------------------ 40 */
console.log('\n40. CONTRIBUTING.md and CHANGELOG.md (the JOSS gate on open development)');
{
  const contrib = read(path.join(ROOT, 'CONTRIBUTING.md'));
  const log = read(path.join(ROOT, 'CHANGELOG.md'));
  const readme = read(path.join(ROOT, 'README.md'));
  ok('CONTRIBUTING.md says where each kind of contribution goes, how to build and check, the licences, the disclosure, conduct and support',
    ['## Which way to go', '## Changing the code or the pages', 'node build.js', 'node verification/check.js', '## Language models and other generative models',
      'A generative model is never listed as an author or a contributor.', '## Licence', '## Conduct', '## Support'].every((x) => contrib.includes(x))
    && ['submission.yml', 'correction.yml', 'withdrawal.yml', 'removal.yml'].every((t) => contrib.includes('template=' + t) && fs.existsSync(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', t))));
  ok('CONTRIBUTING.md gives the same reply time as the contact page', contrib.includes('aims to answer within 7 days') && read(path.join(ROOT, 'contact.md')).includes('aims to answer within 7 days'));
  /* The pull requests are read from the merge commits on the first-parent line, as GitHub writes them: "Title (#N)". */
  let merged = [];
  try {
    merged = require('child_process').execFileSync('git', ['log', '--first-parent', '--format=%as %s', 'HEAD'], { cwd: ROOT, encoding: 'utf8' })
      .split('\n').map((l) => /^(\d{4}-\d{2}-\d{2}) .*\(#(\d+)\)$/.exec(l)).filter(Boolean).map((m) => ({ date: m[1], n: m[2] }));
  } catch (e) { merged = []; }
  const cited = new Set([...log.matchAll(/\(#(\d+)(?:, #(\d+))?\)/g)].flatMap((m) => [m[1], m[2]]).filter(Boolean));
  const dates = [...log.matchAll(/^## (\d{4}-\d{2}-\d{2})$/gm)].map((m) => m[1]);
  const newest = dates[0] || '';
  const unknown = [...cited].filter((n) => !merged.some((m) => m.n === n));
  const missing = merged.filter((m) => m.date < newest && !cited.has(m.n)).map((m) => '#' + m.n);
  ok('every pull request the changelog cites was merged, and every one merged before its newest date is cited (' + merged.length + ' merged, ' + cited.size + ' cited)',
    merged.length > 0 && unknown.length === 0 && missing.length === 0 && dates.join() === [...dates].sort().reverse().join(),
    (unknown.length ? 'not merged: #' + unknown.join(', #') + ' ' : '') + (missing.length ? 'not cited: ' + missing.join(', ') : ''));
  ok('the README points to CONTRIBUTING.md and CHANGELOG.md', readme.includes('(CONTRIBUTING.md)') && readme.includes('(CHANGELOG.md)'));
}

/* ------------------------------------------------------------ 41 */
console.log('\n41. The draft JOSS paper');
{
  const md = read(path.join(ROOT, 'paper', 'paper.md'));
  const bib = read(path.join(ROOT, 'paper', 'paper.bib'));
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const body = md.replace(/^---[\s\S]*?\n---\n/, '').replace(/<!--[\s\S]*?-->/g, '');
  const words = (body.match(/[A-Za-z0-9][A-Za-z0-9'’.-]*/g) || []).length;
  ok('the body is within the JOSS length of 250 to 1000 words (' + words + ')', words >= 250 && words <= 1000);
  ok('the sections JOSS asks for are there, with the AI usage disclosure, and Claude is not an author',
    ['# Summary', '# Statement of need', '# State of the field', '# Software design', '# Research impact statement', '# AI usage disclosure', '# References'].every((h) => body.includes('\n' + h + '\n'))
    && body.includes('Claude is not an author.') && !/name: .*Claude/.test(md));
  ok('the one author is the operator, with the ORCID iD', /authors:\n  - name: Takuya Nemoto\n    orcid: 0009-0000-1406-0547\n/.test(md) && (md.match(/^  - name:/gm) || []).length === 2);
  const keys = [...bib.matchAll(/^@\w+\{([^,]+),/gm)].map((m) => m[1]);
  const cited = [...new Set([...body.matchAll(/@([a-z]+)/g)].map((m) => m[1]))];
  ok('every citation is in paper.bib, and every entry is cited', cited.length > 0 && cited.every((k) => keys.includes(k)) && keys.every((k) => cited.includes(k)),
    'cited ' + cited.join(',') + ' / bib ' + keys.join(','));
  const n = Object.keys(site.repositories).length;
  const words10 = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  ok('the number of repositories in the paper is the number in site.json (' + n + ')', body.includes('in any of ' + words10[n] + ' repositories'));
  ok('no DOI in paper.bib until one is checked at its source', !/\bdoi\s*=/i.test(bib));
  ok('the paper says the research impact as it is: no use by other authors yet', body.includes('There is no record yet of use by other authors.'));
}

/* ------------------------------------------------------------ 42 */
console.log('\n42. The weekly watch says why a save failed, and whether a copy exists');
{
  const { describe } = require('../tools/watch.js');
  const e = new TypeError('fetch failed');
  e.cause = Object.assign(new Error('Connect Timeout Error'), { code: 'UND_ERR_CONNECT_TIMEOUT' });
  ok('a failed fetch is logged with the code and the message of its cause', describe(e) === 'fetch failed (UND_ERR_CONNECT_TIMEOUT: Connect Timeout Error)' && describe(new Error('plain')) === 'plain');
  const w = read(path.join(ROOT, 'tools', 'watch.js'));
  const Wsp = require('../tools/watch.js');
  ok('saves to the Internet Archive are a minute apart, and a refused save is tried twice more, after longer waits',
    Wsp.SAVE_GAP_MS >= 60000 && Wsp.RETRY_WAITS_MS.length === 2 && Wsp.RETRY_WAITS_MS[0] >= 120000 && Wsp.RETRY_WAITS_MS[1] > Wsp.RETRY_WAITS_MS[0]
    && read(path.join(ROOT, 'tools', 'watch.js')).includes('await pause(SAVE_GAP_MS);'));
  ok('a save is tried again on any answer other than success, not only on 429 (the archive once answered 404 for a served PDF)',
    w.includes('if (r.ok) break;') && !w.includes('if (r.status !== 429) break;'));
  ok('lookups of a published version are spaced, and one refused with 429 is tried twice more, after longer waits, without adding anything twice',
    Wsp.LOOKUP_GAP_MS >= 1000 && Wsp.LOOKUP_RETRY_WAITS_MS.length === 2 && Wsp.LOOKUP_RETRY_WAITS_MS[0] >= 30000 && Wsp.LOOKUP_RETRY_WAITS_MS[1] > Wsp.LOOKUP_RETRY_WAITS_MS[0]
    && w.includes('await pause(LOOKUP_GAP_MS);') && w.includes('pubs.push(...found);') && /HTTP 429\/\.test\(e\.message\) && attempt < LOOKUP_RETRY_WAITS_MS\.length/.test(w));
  const oa = Wsp.fromOpenAlex({ id: 'https://openalex.org/W1', abstract_inverted_index: { a: [0] }, cited_by_count: 2, locations: [{ landing_page_url: 'https://zenodo.org/records/1' }, { landing_page_url: 'https://sophaxis.vercel.app/abs/2026.0001.html' }] });
  ok('OpenAlex: whether it holds the work, its abstract, its locations, a Sophaxis page among them, and the citations',
    oa.id === 'https://openalex.org/W1' && oa.abstract && oa.locations === 2 && oa.sophaxis && oa.cited === 2 && Wsp.fromOpenAlex(null) === null
    && !Wsp.fromOpenAlex({ id: 'x', locations: [{ landing_page_url: 'https://zenodo.org/records/1' }] }).sophaxis);
  const tbl = Wsp.indexTable([{ id: '2026.0001', doi: '10.1/a', oa }, { id: '2026.0002', doi: '10.1/b', oa: null }, { id: '2026.0003', doi: '10.1/c', oa: 'error' }]);
  ok('the table has a row for each work: held, not held, or not read', tbl.includes('| 2026.0001 | 10.1/a | W1 | yes | 2 | yes | 2 |') && tbl.includes('| 2026.0002 | 10.1/b | not held |')
    && tbl.includes('| 2026.0003 | 10.1/c | could not be read |'));
  ok('the OpenAlex table is for information: it goes to the job summary and into the report, and does not open an issue by itself',
    w.includes("if (problems.length || news.length || pubs.length) {") && w.includes('report(problems, when, news, pubs, index)') && w.includes('process.env.GITHUB_STEP_SUMMARY')
    && Wsp.report([], '2026-11-10', [], [], tbl).includes('For information, how OpenAlex holds the works shown:') && !Wsp.report([], 'd').includes('OpenAlex'));
  ok('after the saves, the watch looks up the latest copy of each address at the Internet Archive', w.includes("'https://archive.org/wayback/available?url=' + encodeURIComponent(u)") && w.includes("'latest copy '"));
}

/* ------------------------------------------------------------ 43 */
console.log('\n43. The published version of a listed preprint');
{
  const P = require('../tools/published.js');
  const Wt = require('../tools/watch.js');
  const B = require('../build.js');
  const fx = (n) => JSON.parse(read(path.join(__dirname, 'fixtures', 'published', n)));
  const rec = JSON.parse(read(path.join(__dirname, 'fixtures', 'papers', '2026.0001.json')));
  const bare = JSON.parse(JSON.stringify(rec)); delete bare.published;

  /* Metadata */
  const art = P.describe(fx('crossref-article.json'));
  ok('Crossref: a journal article is read with its title, journal, full date, authors and the preprint it links',
    art.kind === 'journal article' && art.title === 'A Fixture Record, Revised' && art.venue === 'Journal of Fixture Studies' && art.date === '2027-03-15'
    && art.authors[0].orcid === '0000-0002-1825-0097' && art.back.join() === '10.5281/zenodo.1234999' && art.updates.length === 0);
  const dc = P.describe(fx('datacite-article.json'));
  ok('DataCite: a journal article is read with its container, year and a relation back to the preprint (DataCite has no preprint relation)',
    dc.kind === 'journal article' && dc.venue === 'DataCite Journal of Fixtures' && dc.date === '2027' && dc.back.join() === '10.5281/zenodo.1234567');
  ok('a preprint is not a published version: posted content has no kind', P.describe(fx('crossref-posted.json')).kind === null);
  const ret = P.describe(fx('crossref-retracted.json'));
  ok('a retraction notice of the publisher is read with its DOI and date', ret.updates.length === 1 && ret.updates[0].type === 'retraction'
    && ret.updates[0].doi === '10.1000/fixture.journal.retraction' && ret.updates[0].date === '2027-06-01');
  ok('the preprint\'s own metadata names its published version: Crossref is-preprint-of, DataCite IsPreviousVersionOf and IsPublishedIn, but never a version in a preprint repository',
    P.forward(fx('crossref-preprint.json')).join() === '10.1000/fixture.journal.1'
    && P.forward(fx('datacite-preprint.json')).join() === '10.1000/fixture.journal.2,10.1000/fixture.journal.4');
  ok('a Crossref search by relation.object keeps only the works that have this preprint', P.backFromSearch(fx('crossref-search.json'), ['10.5281/zenodo.1234999']).join() === '10.1000/fixture.journal.1');

  /* The checks on a report */
  const form = P.parse(read(path.join(__dirname, 'fixtures', 'published', 'report-issue.md')));
  ok('the report form is read: id, DOI without the resolver, peer review as stated, ORCID iD',
    form.id === '2026.0001' && form.doi === '10.1000/fixture.journal.1' && form.peer === true && form.orcid === '0000-0002-1825-0097');
  const person = { given: 'Jane', family: 'Doe', urls: ['https://github.com/jdoe'] };
  const works = new Set(['10.5281/zenodo.1234567']);
  const run = (over) => P.check(Object.assign({ form, login: 'jdoe', record: bare, person, works, desc: art }, over));
  const okRun = run({});
  ok('an author reporting a linked journal article passes, and the moderator sees both titles and the publisher\'s link', okRun.ok
    && okRun.info.some(([k, v]) => k === 'The publisher’s metadata links this preprint' && v === 'yes') && okRun.info.some(([k]) => k === 'Title of the record'));
  const fails = (label, over) => ok('a report fails when ' + label, !run(over).ok);
  fails('the account is not linked from the ORCID record', { login: 'someone-else' });
  fails('the ORCID iD is not an author of the record', { form: Object.assign({}, form, { orcid: '0000-0001-5109-3700' }), works: new Set() });
  fails('the DOI is one of the listed versions', { form: Object.assign({}, form, { doi: '10.5281/zenodo.1234999' }), desc: P.describe(fx('crossref-posted.json')) });
  fails('the DOI is in a preprint repository', { form: Object.assign({}, form, { doi: '10.31219/osf.io/zzzzz' }), desc: P.describe(fx('crossref-posted.json')) });
  fails('the published version shares no author with the record', { form: Object.assign({}, form, { doi: '10.1000/fixture.journal.9' }), desc: P.describe(fx('crossref-stranger.json')) });
  fails('the metadata cannot be read', { desc: null });
  fails('the record already has a published version', { record: rec });
  fails('the record is withdrawn', { record: Object.assign({}, bare, { status: 'withdrawn', withdrawal_date: '2027-01-01', withdrawal_note: 'Withdrawn for a test.' }) });
  ok('a published version that shares only a family name, and that the publisher does not link, passes as reported by the authors',
    P.check({ form: Object.assign({}, form, { doi: '10.1000/fixture.journal.3' }), login: 'jdoe', record: bare, person, works, desc: P.describe(fx('crossref-unlinked.json')) }).ok
    && P.toPublished(bare, P.describe(fx('crossref-unlinked.json')), { peer: null, today: '2027-04-01' }).evidence === 'authors');

  /* The draft and the record */
  const dr = P.draft(bare, form, art, 12, '2027-03-20');
  ok('the draft adds the published version and changes nothing else; it validates', dr.problems.length === 0 && dr.record.status === 'listed'
    && JSON.stringify(Object.assign({}, dr.record, { published: undefined })) === JSON.stringify(Object.assign({}, bare, { published: undefined }))
    && dr.record.published.evidence === 'publisher' && dr.record.published.peer_reviewed === true && dr.record.published.issue === 12);
  const bad = (label, change) => ok('refuses a published version ' + label, validate(Object.assign({}, rec, { published: Object.assign({}, rec.published, change) }), '2026.0001.json').length > 0);
  bad('that is one of the listed versions', { doi: '10.5281/zenodo.1234999' });
  bad('in a preprint repository', { doi: '10.31219/osf.io/zzzzz' });
  bad('of another kind', { type: 'preprint' });
  bad('without a venue', { venue: '' });
  bad('with a date in another form', { date: '15 March 2027' });
  bad('with peer review given as text', { peer_reviewed: 'yes' });
  bad('with other evidence', { evidence: 'moderator' });
  bad('with an update that has no DOI', { updates: [{ type: 'retraction', date: '2027-06-01' }] });
  ok('the comment shows the checks, the information for the moderator, and the record to commit', P.comment(okRun, dr).startsWith(P.MARK)
    && P.comment(okRun, dr).includes('the preprint stays listed') && P.comment(okRun, dr).includes('"venue": "Journal of Fixture Studies"'));

  /* The site */
  const page = read(path.join(FIX, 'abs', '2026.0001.html'));
  ok('the record page says at the top that a later version was published, where and when, with peer review as the authors state and the publisher\'s link, and asks to cite it',
    page.includes('<b>Published.</b> A later version of this work appeared as a journal article in <i>Journal of Fixture Studies</i> (2027): <a href="https://doi.org/10.1000/fixture.journal.1">10.1000/fixture.journal.1</a>. The authors state that it was peer-reviewed. The publisher’s metadata links it to this preprint. Cite the published version.')
    && page.indexOf('<b>Published.</b>') < page.indexOf('<h1'));
  ok('the Access line leads with the published version, and the lower notice names the listed version as the preprint',
    page.includes('<b>Access:</b> <a href="https://doi.org/10.1000/fixture.journal.1">Published version (Journal of Fixture Studies)</a> · ')
    && page.includes('This page lists the preprint, the version before publication. Sophaxis did not review it, and the published version is the version of record.')
    && !page.includes('This is a preprint. It has not been peer-reviewed.'));
  ok('the Cite section gives the published version first', page.includes('<p class="meta">Published version</p>\n<p class="cite">Doe, J., &amp; Yamada, T. (2027). A Fixture Record, Revised. Journal of Fixture Studies. https://doi.org/10.1000/fixture.journal.1</p>\n<p class="meta">This preprint, APA</p>'));
  const other = read(path.join(FIX, 'abs', '2026.0002.html'));
  ok('a record without a published version keeps the plain preprint notice', other.includes('This is a preprint. It has not been peer-reviewed.') && !other.includes('<b>Published.</b>'));
  ok('the citation files name the published version', B.bibtex(rec).includes('Published version: https://doi.org/10.1000/fixture.journal.1}')
    && B.ris(rec).includes('N1  - Preprint, not peer-reviewed. Listed on Sophaxis as 2026.0001. Published version: https://doi.org/10.1000/fixture.journal.1')
    && JSON.parse(B.cslJson(rec))[0].note.endsWith('Published version: https://doi.org/10.1000/fixture.journal.1'));
  const pj = JSON.parse(read(path.join(FIX, 'papers.json'))).find((x) => x.id === '2026.0001');
  ok('papers.json carries the published object, and the lists and search flag it', pj.published && pj.published.venue === 'Journal of Fixture Studies'
    && read(path.join(FIX, 'index.html')).includes('<span class="flag">published</span>') && read(path.join(FIX, 'search.js')).includes("(p.published ? ' · published' : '')"));
  const feed = read(path.join(FIX, 'feed.xml'));
  const entry = (/<entry>\s*<id>[^<]*2026\.0001\.html<\/id>[\s\S]*?<\/entry>/.exec(feed) || [''])[0];
  ok('the feed links the published version, and a report is an update of the entry', entry.includes('<link rel="related" href="https://doi.org/10.1000/fixture.journal.1" title="Published version: Journal of Fixture Studies"/>')
    && entry.includes('<updated>2027-03-20T00:00:00Z</updated>'));
  const sm = read(path.join(FIX, 'sitemap.xml'));
  ok('the sitemap and the feed date a record by its last change: a version, a note, a withdrawal or a reported published version',
    sm.includes('abs/2026.0001.html</loc><lastmod>2027-03-20</lastmod>') && feed.includes('  <updated>2027-03-20T00:00:00Z</updated>\n<entry>') === false
    && /<link href="[^"]+"\/>\n  <updated>2027-03-20T00:00:00Z<\/updated>/.test(feed)
    && sm.includes('abs/2026.0002.html</loc><lastmod>' + [JSON.parse(read(path.join(__dirname, 'fixtures', 'papers', '2026.0002.json')))].map((p) => [p.versions[p.versions.length - 1].date, p.withdrawal_date].concat((p.notes || []).map((n) => n.date)).filter(Boolean).sort().pop())[0] + '</lastmod>'));
  ok('the statistics count published versions, those the authors state were peer-reviewed, and those the publisher links',
    /<tr><td>Published<\/td><td>1<\/td><\/tr><tr><td>Peer-reviewed, as the authors state<\/td><td>1<\/td><\/tr><tr><td>Linked by the publisher’s metadata<\/td><td>1<\/td><\/tr>/.test(read(path.join(FIX, 'stats.html'))));
  const dcr = B.dataciteRecord(rec, { prefix: '10.99999', suffix: 'sophaxis.{id}' });
  ok('a Sophaxis DOI would point to the published version as a later version (IsPreviousVersionOf)', dcr.data.attributes.relatedIdentifiers.some((r) => r.relatedIdentifier === '10.1000/fixture.journal.1' && r.relationType === 'IsPreviousVersionOf'));
  const withUpd = Object.assign({}, rec, { published: Object.assign({}, rec.published, { updates: [{ type: 'retraction', doi: '10.1000/fixture.journal.retraction', date: '2027-06-01' }] }) });
  ok('a notice of the publisher, such as a retraction, is shown with the published version', B.publishedNotice(withUpd).includes('It has a retraction notice of 2027-06-01: <a href="https://doi.org/10.1000/fixture.journal.retraction">'));

  /* The weekly watch */
  ok('the watch proposes a candidate only when it is a published kind with a venue and a shared author',
    Wt.candidateNote(bare, art).length === 1 && Wt.candidateNote(bare, P.describe(fx('crossref-stranger.json'))).length === 0
    && Wt.candidateNote(bare, P.describe(fx('crossref-posted.json'))).length === 0 && Wt.candidateNote(bare, null).length === 0);
  ok('the watch reports a recorded published version that no longer resolves, and a new retraction notice once',
    Wt.publishedProblems(rec, null).length === 1 && Wt.publishedProblems(rec, ret).some((x) => x.includes('new retraction notice of 2027-06-01'))
    && Wt.publishedProblems(withUpd, ret).length === 0 && Wt.publishedProblems(bare, ret).length === 0);
  ok('the weekly report lists candidates apart from problems, and says that Sophaxis records nothing by itself',
    Wt.report([], '2027-04-01', [], ['2026.0001: a possible published version']).includes('Possible published versions:')
    && Wt.report([], '2027-04-01', [], ['x']).includes('Sophaxis does not record a published version by itself'));

  /* The forms, the workflow and the policies */
  const form1 = read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'published.yml'));
  ok('the report form asks for the four fields the tool reads, with the peer-review answers it knows, and labels the issue',
    Object.keys(P.FIELDS).every((label) => form1.includes('label: ' + label)) && Object.keys(P.PEER).every((x) => form1.includes('- ' + x)) && form1.includes('labels: ["published"]'));
  ok('the submission form offers the same peer-review answers', Object.keys(P.PEER).every((x) => read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'submission.yml')).includes('- ' + x)));
  const wf = read(path.join(ROOT, '.github', 'workflows', 'intake.yml'));
  ok('a labelled report runs tools/published.js, with the issue text only in the environment', wf.includes("contains(github.event.issue.labels.*.name, 'published')") && wf.includes('- run: node tools/published.js'));
  const pol = read(path.join(ROOT, 'policies', 'submission.md'));
  ok('the Submission Policy says the preprint stays listed, who reports and how it is checked, that Sophaxis does not judge peer review, and what the weekly check does',
    ['A listed preprint stays listed when a later version is published', 'Any one author reports the published version', 'Sophaxis does not judge the peer review of a journal.',
      'It records nothing by itself: it asks the authors to report it.', 'When the publisher adds a retraction, a correction or another notice to the published version, the record page shows it.']
      .every((x) => pol.includes(x)));
  ok('the README tells the moderator how to record a published version and its later notices, and says what the weekly check looks for',
    read(path.join(ROOT, 'README.md')).includes('### Recording a published version') && read(path.join(ROOT, 'README.md')).includes('A published-version issue runs `tools/published.js`')
    && read(path.join(ROOT, 'README.md')).includes('add it to `published.updates`') && read(path.join(ROOT, 'README.md')).includes('it records nothing by itself'));
  ok('the FAQ, the steps, the contact page, CONTRIBUTING and the Withdrawal Policy point to the published-version form',
    ['faq.md', 'process.md', 'contact.md', 'CONTRIBUTING.md'].every((f) => read(path.join(ROOT, f)).includes('issues/new?template=published.yml'))
    && read(path.join(ROOT, 'policies', 'withdrawal.md')).includes('## Withdrawal on publication'));
}

/* ------------------------------------------------------------ 44 */
console.log('\n44. Where the abstract comes from');
{
  const I = require('../tools/intake.js');
  const rec = JSON.parse(read(path.join(__dirname, 'fixtures', 'papers', '2026.0001.json')));
  const meta = I.fromDataCite(JSON.parse(read(path.join(__dirname, 'fixtures', 'intake', 'datacite.json'))));
  const form = Object.assign(I.parseIssue(read(path.join(__dirname, 'fixtures', 'intake', 'issue.md'))), { published: '', abstract: 'An abstract that the authors give in the issue, because the metadata has none.' });
  const base = { form, login: 'jcarberry', issue: 9, versions: [{ doi: '10.6084/m9.figshare.1234567.v1', date: '2026-11-03' }], result: { licence: 'CC-BY-4.0' }, paperDir: fs.mkdtempSync(path.join(os.tmpdir(), 'sophaxis-')), today: '2026-11-10' };
  const without = I.draft(Object.assign({}, base, { meta: Object.assign({}, meta, { abstract: '' }) })).record;
  const withAbs = I.draft(Object.assign({}, base, { meta })).record;
  ok('an abstract given in the issue is marked as given by the authors; one from the metadata is not marked',
    without.abstract_source === 'authors' && without.abstract === form.abstract && !('abstract_source' in withAbs));
  ok('the record page says where its abstract came from', read(path.join(FIX, 'abs', '2026.0001.html')).includes('given by the authors in the submission issue, because the DOI metadata has none')
    && read(path.join(FIX, 'abs', '2026.0002.html')).includes(', from the DOI metadata, shown as plain text')
    && JSON.parse(read(path.join(FIX, 'papers.json'))).find((x) => x.id === '2026.0001').abstract_source === 'authors');
  ok('abstract_source takes no other value', validate(Object.assign({}, rec, { abstract_source: 'moderator' }), '2026.0001.json').length > 0);
}

/* ------------------------------------------------------------ 45 */
console.log('\n45. Telling search engines what changed (IndexNow)');
{
  const I = require('../tools/indexnow.js');
  const S = JSON.parse(read(path.join(ROOT, 'site.json')));
  const B = 'https://sophaxis.vercel.app/';
  ok('the key has the IndexNow form, and the site serves it at the root as <key>.txt, with the key alone',
    I.KEY_FORM.test(S.indexNowKey) && read(path.join(ROOT, 'site', S.indexNowKey + '.txt')) === S.indexNowKey);
  const before = '<urlset>\n  <url><loc>' + B + '</loc><lastmod>2026-11-01</lastmod></url>\n  <url><loc>' + B + 'abs/2026.0001.html</loc><lastmod>2026-11-01</lastmod></url>\n'
    + '  <url><loc>' + B + 'abs/2026.0002.html</loc><lastmod>2026-11-01</lastmod></url>\n  <url><loc>' + B + 'faq.html</loc><lastmod>2026-11-01</lastmod></url>\n</urlset>\n';
  const after = before.replace(B + 'abs/2026.0002.html</loc><lastmod>2026-11-01', B + 'abs/2026.0002.html</loc><lastmod>2026-11-02')
    .replace(B + '</loc><lastmod>2026-11-01', B + '</loc><lastmod>2026-11-02').replace(B + 'faq.html</loc><lastmod>2026-11-01', B + 'faq.html</loc><lastmod>2026-11-02')
    .replace('</urlset>', '  <url><loc>' + B + 'abs/2026.0003.html</loc><lastmod>2026-11-02</lastmod></url>\n  <url><loc>' + B + 'pdf/2026.0003v1.pdf</loc><lastmod>2026-11-02</lastmod></url>\n'
      + '  <url><loc>' + B + 'author/0009-0000-1406-0547.html</loc><lastmod>2026-11-02</lastmod></url>\n</urlset>');
  ok('only new or re-dated record pages, PDF copies and the home page are sent; an unchanged record, other pages and author pages are not',
    I.changed(before, after, B).join(' ') === [B, B + 'abs/2026.0002.html', B + 'abs/2026.0003.html', B + 'pdf/2026.0003v1.pdf'].join(' '),
    I.changed(before, after, B).join(' '));
  ok('sending everything sends every record page and PDF copy of the real sitemap, and no author page',
    (() => { const { papers } = loadPapers(path.join(ROOT, 'data', 'papers')); const e = I.every(read(path.join(ROOT, 'site', 'sitemap.xml'))); return e.length === 1 + papers.filter((p) => p.status !== 'removed').length + papers.reduce((n, p) => n + (p.pdfs || []).length, 0) && !e.some((u) => u.includes('/author/')); })());
  const removedAfter = after.replace('  <url><loc>' + B + 'abs/2026.0001.html</loc><lastmod>2026-11-01</lastmod></url>\n', '').replace('  <url><loc>' + B + 'pdf/2026.0003v1.pdf</loc><lastmod>2026-11-02</lastmod></url>\n', '');
  ok('a record page or PDF copy that left the sitemap is sent as gone; other pages that left are not, and nothing new is gone',
    I.gone(after, removedAfter, B).join(' ') === [B + 'abs/2026.0001.html', B + 'pdf/2026.0003v1.pdf'].join(' ')
    && I.gone(before, after, B).length === 0 && I.gone(after, after.replace(/  <url><loc>[^<]*faq\.html<\/loc>[^\n]*\n/, ''), B).length === 0);
  const isrc = read(path.join(ROOT, 'tools', 'indexnow.js'));
  ok('the gone pages are sent with the new and changed ones; after IndexNow takes them, the new and changed pages are saved to the Internet Archive, and a gone page never is',
    isrc.includes('const urls = fresh.concat(left);') && isrc.includes("if (!all) await require('./watch.js').saveToArchive(fresh);") && !/saveToArchive\((urls|left)/.test(isrc)
    && isrc.indexOf('saveToArchive(fresh)') > isrc.indexOf("throw new Error('IndexNow refused the request"));
  const rwf = read(path.join(ROOT, '.github', 'workflows', 'removal.yml'));
  ok('every job of the removal workflow that can push tells IndexNow afterwards, against the head it started from',
    (rwf.match(/- run: node tools\/indexnow\.js\n\s+env:\n\s+BEFORE: \$\{\{ github\.sha \}\}/g) || []).length === 3
    && ['intake', 'decide', 'manual'].every((j) => { const b = rwf.split('\n  ' + j + ':\n')[1].split(/\n  [a-z]+:\n/)[0]; return b.indexOf('node tools/removal.js') < b.indexOf('node tools/indexnow.js') && /fetch-depth: 0/.test(b); }));
  const body = I.request([B + 'abs/2026.0001.html'], S);
  ok('the request names the host, the key and where the key file is', body.host === 'sophaxis.vercel.app' && body.key === S.indexNowKey
    && body.keyLocation === S.baseUrl + S.indexNowKey + '.txt' && body.urlList.length === 1 && I.ENDPOINT === 'https://api.indexnow.org/indexnow');
  ok('200 and 202 are taken as received, anything else as refused', /^received/.test(I.meaning(200)) && /^received/.test(I.meaning(202)) && /^refused/.test(I.meaning(403)) && /^refused/.test(I.meaning(422)));
  const src = read(path.join(ROOT, 'tools', 'indexnow.js'));
  ok('nothing is sent until the live sitemap is the one in the commit, and the key file is served', /live = \(await text\(SITE\.baseUrl \+ 'sitemap\.xml'\)\) === now/.test(src)
    && src.indexOf("!== SITE.indexNowKey") < src.indexOf('await ua.request(ENDPOINT') && src.indexOf('await ua.request(ENDPOINT') > 0);
  const wf = read(path.join(ROOT, '.github', 'workflows', 'indexnow.yml'));
  ok('the workflow runs when a push to main changes the sitemap, or by hand, reads only, and passes its inputs through the environment',
    /on:\n  push:\n    branches: \[main\]\n    paths: \[site\/sitemap\.xml\]\n  workflow_dispatch:/.test(wf) && /permissions:\n  contents: read\n(?!  \w)/.test(wf)
    && ![...wf.matchAll(/^\s*(- )?run: (.*)$/gm)].some((m) => m[2].includes('${{')) && /fetch-depth: 0/.test(wf));
  const readme = read(path.join(ROOT, 'README.md'));
  ok('the README and the FAQ say what is sent, that author pages are not, and that Google reads the sitemap instead',
    readme.includes('Author pages, whose address carries an ORCID iD, are not.') && readme.includes('Google does not take IndexNow.')
    && readme.includes('ORCID iD を含む著者の頁の URL は送りません。') && read(path.join(ROOT, 'faq.md')).includes('Google reads the sitemap instead.'));
}

/* ------------------------------------------------------------ 46 */
console.log('\n46. Advice on the DOI metadata (deposit-check)');
{
  const I = require('../tools/intake.js');
  const report = { findings: [
    { rule: 'abstract-missing', severity: 'error', doi: '10.5281/zenodo.1', detail: 'no description of the type Abstract' },
    { rule: 'keywords-missing', severity: 'warning', doi: '10.5281/zenodo.1', detail: 'no subjects' },
    { rule: 'language-missing', severity: 'info', doi: '10.5281/zenodo.1', detail: 'no language' },
    { rule: 'not-on-orcid', severity: 'warning', doi: '10.5281/zenodo.1', detail: 'x' },
  ] };
  ok('the advice keeps errors and warnings about this work, and leaves out notes and rules about the ORCID record',
    I.adviceFrom(report).map((f) => f.rule).join() === 'abstract-missing,keywords-missing' && I.adviceFrom(null).length === 0);
  const result = { ok: true, checks: [['the DOI resolves', true, '10.5281/zenodo.1']] };
  const d = { record: { id: '2026.0099', versions: [{ doi: '10.5281/zenodo.1' }] }, problems: [] };
  const withAdvice = I.comment(result, d, I.adviceFrom(report).map((f) => Object.assign({ title: 'T ' + f.rule }, f)));
  ok('a verified submission is given the advice after the draft record, and told that it does not decide the listing',
    withAdvice.indexOf('**Advice on the metadata at the repository.** This does not decide the listing.') > withAdvice.indexOf('~~~~json')
    && withAdvice.includes('- T abstract-missing (`abstract-missing`): no description of the type Abstract'));
  ok('without advice the comment is as before; a submission that is not verified gets none',
    I.comment(result, d) === I.comment(result, d, []) && !I.comment({ ok: false, checks: result.checks }, null, I.adviceFrom(report)).includes('Advice on the metadata'));
  const fake = fs.mkdtempSync(path.join(os.tmpdir(), 'deposit-check-'));
  fs.mkdirSync(path.join(fake, 'bin')); fs.mkdirSync(path.join(fake, 'src'));
  fs.writeFileSync(path.join(fake, 'bin', 'deposit-check.js'), 'process.stdout.write(JSON.stringify(' + JSON.stringify(report) + '));');
  fs.writeFileSync(path.join(fake, 'src', 'rules.js'), "module.exports = { byId: (id) => ({ title: 'Title of ' + id }) };");
  const got = I.metadataAdvice('10.5281/zenodo.1', fake);
  ok('deposit-check is run on the DOI, and its titles are given with the findings', got.map((f) => f.title).join() === 'Title of abstract-missing,Title of keywords-missing');
  ok('no deposit-check beside the site, or not a DOI: no advice, and no error', I.metadataAdvice('10.5281/zenodo.1', path.join(fake, 'none')).length === 0 && I.metadataAdvice('not a doi', fake).length === 0);
  fs.writeFileSync(path.join(fake, 'bin', 'deposit-check.js'), 'process.exit(2);');
  ok('deposit-check failing gives no advice, and does not stop the intake', I.metadataAdvice('10.5281/zenodo.1', fake).length === 0);
  fs.rmSync(fake, { recursive: true, force: true });
  const wf = read(path.join(ROOT, '.github', 'workflows', 'intake.yml'));
  ok('the intake checks out deposit-check at a pinned commit, beside the site, before it runs',
    /- uses: actions\/checkout@[0-9a-f]{40} # v\d[\d.]*\n        with:\n          repository: cpsbvbng26-dotcom\/deposit-check\n          ref: [0-9a-f]{40}\n          path: deposit-check\n/.test(wf)
    && wf.indexOf('repository: cpsbvbng26-dotcom/deposit-check') < wf.indexOf('node tools/intake.js'));
  ok('the README and the steps say that the advice does not decide the listing', read(path.join(ROOT, 'README.md')).includes('The advice does not decide the listing.')
    && read(path.join(ROOT, 'process.md')).includes('It does not decide the listing.'));
}

/* ------------------------------------------------------------ 47 */
console.log('\n47. OAI-PMH');
{
  const O = require('../tools/oai.js');
  const B = require('../build.js');
  const S = JSON.parse(read(path.join(ROOT, 'site.json')));
  const fixPapers = B.loadPapers(path.join(__dirname, 'fixtures', 'papers')).papers;
  const data = B.oaiData(fixPapers);
  const now = new Date('2026-12-31T12:00:00.000Z');
  const ask = (q) => O.handle(O.argsOf(q), data, now);
  /* Well-formed: every tag closed in order (a small check; the schema is not read here). */
  const balanced = (xml) => {
    const stack = [];
    for (const m of xml.replace(/<\?xml[^>]*\?>/, '').matchAll(/<(\/?)([A-Za-z_][\w:.-]*)[^>]*?(\/?)>/g)) {
      if (m[3]) continue;
      if (!m[1]) stack.push(m[2]); else if (stack.pop() !== m[2]) return false;
    }
    return stack.length === 0;
  };
  const id1 = 'oai:sophaxis.vercel.app:2026.0001';
  const answers = ['verb=Identify', 'verb=ListMetadataFormats', 'verb=ListSets', 'verb=ListIdentifiers&metadataPrefix=oai_dc', 'verb=ListRecords&metadataPrefix=oai_dc',
    'verb=GetRecord&identifier=' + id1 + '&metadataPrefix=oai_dc', 'verb=Nope', 'verb=ListRecords'].map(ask);
  ok('every answer is well-formed XML in the OAI-PMH namespace, with the time of the answer', answers.every((a) => balanced(a) && a.includes('<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"')
    && a.includes('<responseDate>2026-12-31T12:00:00Z</responseDate>')), answers.filter((a) => !balanced(a)).length + ' not balanced');
  const idf = ask('verb=Identify');
  ok('Identify: the name, the base URL at /oai, protocol 2.0, the earliest datestamp, deleted records kept, days as granularity, the identifier scheme',
    ['<repositoryName>Sophaxis</repositoryName>', '<baseURL>https://sophaxis.vercel.app/oai</baseURL>', '<protocolVersion>2.0</protocolVersion>',
      '<earliestDatestamp>' + data.records.map((r) => r.datestamp).sort()[0] + '</earliestDatestamp>', '<deletedRecord>persistent</deletedRecord>',
      '<granularity>YYYY-MM-DD</granularity>', '<repositoryIdentifier>sophaxis.vercel.app</repositoryIdentifier>', '<sampleIdentifier>' + id1 + '</sampleIdentifier>'].every((t) => idf.includes(t)));
  ok('the errors of the protocol: bad verb (with no attributes echoed), repeated or unknown argument, missing prefix, unknown format and id, a resumption token',
    ask('verb=Nope').includes('<request>https://sophaxis.vercel.app/oai</request>') && ask('verb=Nope').includes('code="badVerb"')
    && ask('verb=Identify&verb=Identify').includes('code="badVerb"') && ask('verb=ListSets&x=1').includes('code="badArgument"')
    && ask('verb=ListRecords&metadataPrefix=oai_dc&set=logic&set=logic').includes('code="badArgument"') && ask('verb=ListRecords').includes('code="badArgument"')
    && ask('verb=ListRecords&metadataPrefix=marc21').includes('code="cannotDisseminateFormat"') && ask('verb=GetRecord&identifier=oai:x:1&metadataPrefix=oai_dc').includes('code="idDoesNotExist"')
    && ask('verb=ListMetadataFormats&identifier=oai:x:1').includes('code="idDoesNotExist"') && ask('verb=ListRecords&resumptionToken=abc').includes('code="badResumptionToken"')
    && ask('verb=ListRecords&resumptionToken=abc&metadataPrefix=oai_dc').includes('code="badArgument"'));
  const ids = (q) => [...ask(q).matchAll(/<identifier>([^<]+)<\/identifier>/g)].map((m) => m[1]).join();
  ok('from and until select by datestamp, both days included; a finer date or from after until is refused; nothing in range is noRecordsMatch',
    ids('verb=ListIdentifiers&metadataPrefix=oai_dc&from=2027-03-20') === id1 && ids('verb=ListIdentifiers&metadataPrefix=oai_dc&until=2027-03-20').split(',').length === data.records.length
    && !ids('verb=ListIdentifiers&metadataPrefix=oai_dc&until=2027-03-19').includes(id1)
    && ask('verb=ListIdentifiers&metadataPrefix=oai_dc&from=2026-12-02T00:00:00Z').includes('code="badArgument"')
    && ask('verb=ListIdentifiers&metadataPrefix=oai_dc&from=2026-12-03&until=2026-12-02').includes('code="badArgument"')
    && ask('verb=ListIdentifiers&metadataPrefix=oai_dc&from=2027-03-21').includes('code="noRecordsMatch"'));
  const specs = [...ask('verb=ListSets').matchAll(/<setSpec>([^<]+)<\/setSpec>/g)].map((m) => m[1]);
  ok('the sets are the fields and openaire, and a set selects its records', specs.join() === Object.keys(S.categories).concat(['openaire']).join()
    && ids('verb=ListIdentifiers&metadataPrefix=oai_dc&set=logic') === data.records.filter((r) => r.sets.includes('logic')).map((r) => r.identifier).join());
  ok('the openaire set holds every record shown, and no deleted one (OpenAIRE guidelines v3)',
    ids('verb=ListIdentifiers&metadataPrefix=oai_dc&set=openaire') === data.records.filter((r) => !r.deleted).map((r) => r.identifier).join()
    && data.records.filter((r) => r.deleted).every((r) => !r.sets.includes('openaire')));
  ok('the language of a work is given as ISO 639-3 in dc:language, and a record may have only that form',
    ask('verb=GetRecord&identifier=' + id1 + '&metadataPrefix=oai_dc').includes('<dc:language>eng</dc:language>')
    && B.validate(Object.assign({}, JSON.parse(read(path.join(__dirname, 'fixtures', 'papers', '2026.0001.json'))), { language: 'en' }), '2026.0001.json').some((e) => e.includes('ISO 639-3')));
  const r1 = data.records.find((r) => r.identifier === id1);
  const stamp = (patch) => B.oaiData(fixPapers.map((p) => (p.id === '2026.0001' ? Object.assign({}, p, patch) : p))).records.find((r) => r.identifier === id1).datestamp;
  ok('the datestamp is the latest of the last change (here a reported published version), the day of listing and the day of update',
    r1.datestamp === '2027-03-20' && stamp({ updated: '2027-04-01' }) === '2027-04-01' && stamp({ listed: '2027-05-01', updated: undefined }) === '2027-05-01');
  const rec = ask('verb=GetRecord&identifier=' + id1 + '&metadataPrefix=oai_dc');
  const p1 = fixPapers.find((p) => p.id === '2026.0001');
  ok('a record in Dublin Core: title, creators as “Family, Given”, abstract, the record page, the DOI, the PDF copy, the licence, open access, a preprint',
    rec.includes('<dc:title>' + O.x(p1.title) + '</dc:title>') && rec.includes('<dc:creator>Doe, Jane</dc:creator>') && rec.includes('<dc:description>' + O.x(p1.abstract) + '</dc:description>')
    && rec.includes('<dc:identifier>https://sophaxis.vercel.app/abs/2026.0001.html</dc:identifier>') && rec.includes('<dc:identifier>https://doi.org/' + p1.versions[p1.versions.length - 1].doi + '</dc:identifier>')
    && rec.includes('<dc:identifier>https://sophaxis.vercel.app/pdf/' + p1.pdfs[p1.pdfs.length - 1].file + '</dc:identifier>')
    && rec.includes('<dc:rights>https://creativecommons.org/licenses/by/4.0/</dc:rights>') && rec.includes('<dc:rights>info:eu-repo/semantics/openAccess</dc:rights>')
    && rec.includes('<dc:type>info:eu-repo/semantics/preprint</dc:type>'), rec.slice(0, 200));
  const removed = fixPapers.find((p) => p.status === 'removed');
  const del = ask('verb=GetRecord&identifier=oai:sophaxis.vercel.app:' + removed.id + '&metadataPrefix=oai_dc');
  ok('a removed record stays, marked deleted, with the day of removal and no metadata', del.includes('<header status="deleted">') && del.includes('<datestamp>' + removed.removal_date + '</datestamp>') && !del.includes('<metadata>'));
  ok('text is escaped, and characters XML forbids are left out', O.x('a & b < c "d" \u0001e') === 'a &amp; b &lt; c &quot;d&quot; e');
  const fn = read(path.join(ROOT, 'site', 'api', 'oai.js'));
  ok('site/api/oai.js is tools/oai.js with the records, and asks no other server', fn.includes(read(path.join(ROOT, 'tools', 'oai.js')))
    && /\nmodule\.exports = handler\(\{.*\}\);\n$/.test(fn) && !/\bfetch\(|require\('https?'\)|require\('net'\)/.test(fn));
  /* For GET, and for POST with the body already read, the function answers before it returns. */
  const call = (method, url, body) => { let out = null; const res = { h: {}, setHeader(k, v) { this.h[k] = v; }, end(t) { out = { h: this.h, t }; } }; require(path.join(ROOT, 'site', 'api', 'oai.js'))({ method, url, body }, res); return out || { h: {}, t: '' }; };
  const g = call('GET', '/oai?verb=Identify');
  const po = call('POST', '/oai', 'verb=ListSets');
  ok('the function answers GET and POST, as text/xml', g.h['Content-Type'] === 'text/xml; charset=utf-8' && g.t.includes('<Identify>') && po.t.includes('<ListSets>'));
  /* The fixture, not a live record: a live record may be removed, and then has no dates to test. */
  const base = JSON.parse(read(path.join(__dirname, 'fixtures', 'papers', '2026.0001.json')));
  const v = (patch) => B.validate(Object.assign({}, base, patch), '2026.0001.json').join(' ');
  ok('a record needs listed, not earlier than its first version; updated, if given, is not earlier than listed',
    v({}) === '' && v({ listed: undefined }).includes('listed is missing') && v({ listed: '2020-01-01' }).includes('listed is earlier than the first version')
    && v({ updated: '2026-10-01' }).includes('updated must be a date') && v({ updated: '2026-12-01' }) === '');
  /* A record cannot say it was listed before the commit that added it. */
  const late = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'data', 'papers')).filter((x) => x.endsWith('.json'))) {
    const rec = JSON.parse(read(path.join(ROOT, 'data', 'papers', f)));
    if (rec.status === 'removed') continue;
    let added = '';
    try { added = require('child_process').execFileSync('git', ['log', '--diff-filter=A', '--format=%as', '--', 'data/papers/' + f], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').pop(); } catch (e) { added = ''; }
    if (added && rec.listed < added) late.push(f + ' listed ' + rec.listed + ', added ' + added);
  }
  ok('no record is listed before the commit that added it', late.length === 0, late.join('; '));
  const drafted = require('../tools/intake.js').draft({ form: { doi: '10.5281/zenodo.1', orcid: S.operator.orcid, category: 'philosophy', llm: 'No generative model was used in this work at all.' },
    login: 'someone', issue: 1, meta: { title: 'T', authors: [{ name: 'A B' }], abstract: 'An abstract.', date: '2026-11-01', keywords: [] }, versions: [{ doi: '10.5281/zenodo.1', date: '2026-11-01' }],
    result: { licence: 'CC-BY-4.0' }, paperDir: path.join(__dirname, 'fixtures', 'papers'), today: '2026-11-05' }).record;
  ok('a draft is listed on the day of the draft, for the moderator to change to the day of merging', drafted.listed === '2026-11-05');
  const Iy = require('../tools/intake.js');
  ok('the language from DOI metadata becomes ISO 639-3 (en, en-US and eng alike); an unknown code is left out',
    Iy.iso3('en') === 'eng' && Iy.iso3('en-US') === 'eng' && Iy.iso3('eng') === 'eng' && Iy.iso3('ja') === 'jpn' && Iy.iso3('xx') === null && Iy.iso3(undefined) === null
    && Iy.fromDataCite({ data: { attributes: { doi: '10.5281/zenodo.1', titles: [{ title: 'T' }], creators: [], language: 'en' } } }).language === 'eng'
    && Iy.fromCrossref({ message: { DOI: '10.1/x', title: ['T'], language: 'de' } }).language === 'deu');
  const withLang = Iy.draft({ form: { doi: '10.5281/zenodo.1', orcid: S.operator.orcid, category: 'philosophy', llm: 'No generative model was used in this work at all.' },
    login: 'someone', issue: 1, meta: { title: 'T', authors: [{ name: 'A B' }], abstract: 'An abstract.', date: '2026-11-01', keywords: [], language: 'jpn' }, versions: [{ doi: '10.5281/zenodo.1', date: '2026-11-01' }],
    result: { licence: 'CC-BY-4.0' }, paperDir: path.join(__dirname, 'fixtures', 'papers'), today: '2026-11-05' });
  ok('a draft carries the language when the metadata gives one, and none otherwise', withLang.record.language === 'jpn' && withLang.problems.length === 0 && drafted.language === undefined);
  const readme = read(path.join(ROOT, 'README.md'));
  ok('the README gives the base URL, and says whether Identify gives an address yet', readme.includes('https://sophaxis.vercel.app/oai?verb=Identify')
    && ((S.oai.adminEmails.length === 0) === readme.includes('Identify gives no `adminEmail` yet'))
    && (S.oai.adminEmails.length === 0 || readme.includes('Identify gives an `adminEmail`, set in `site.json`')));
  ok('each address in Identify is an e-mail address, given in Identify, and written nowhere else in the README',
    S.oai.adminEmails.every((e) => /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(e) && O.handle(O.argsOf('verb=Identify'), B.oaiData(fixPapers), now).includes('<adminEmail>' + e + '</adminEmail>') && !readme.includes(e)));
}

/* ------------------------------------------------------------ 48 */
console.log('\n48. The last update and the ISSN, as the ISSN Japan Centre asks of a database');
{
  const B = require('../build.js');
  const S = JSON.parse(read(path.join(ROOT, 'site.json')));
  const recs = fs.readdirSync(path.join(ROOT, 'data', 'papers')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(read(path.join(ROOT, 'data', 'papers', f))));
  const dates = recs.flatMap((p) => (p.status === 'removed' ? [p.removal_date] : (p.versions || []).map((v) => v.date)
    .concat([p.listed, p.updated, p.withdrawal_date, p.published && p.published.reported], (p.notes || []).map((n) => n.date))).filter(Boolean));
  const last = dates.sort().pop();
  const idx = read(path.join(ROOT, 'site', 'index.html'));
  ok('the top page shows the day the records last changed (' + last + '), and how often they are updated',
    idx.includes('Last updated: <time datetime="' + last + '">' + last + '</time>. Records are added as they are accepted, and every record is checked once a week.'));
  const rec = (patch) => Object.assign({ id: '2026.0001', status: 'listed', listed: '2026-10-31', versions: [{ version: 1, doi: '10.5281/zenodo.1', date: '2026-10-01' }] }, patch);
  ok('the last update is the latest of every change: a new version, an update, a note, a withdrawal, a removal, not only the day of listing',
    B.lastUpdated([rec({})]) === '2026-10-31' && B.lastUpdated([rec({ versions: [{ version: 1, doi: 'x', date: '2026-10-01' }, { version: 2, doi: 'y', date: '2026-11-05' }] })]) === '2026-11-05'
    && B.lastUpdated([rec({ updated: '2026-11-07' })]) === '2026-11-07' && B.lastUpdated([rec({ notes: [{ date: '2026-11-08', text: 'n' }] })]) === '2026-11-08'
    && B.lastUpdated([rec({}), { id: '2026.0002', status: 'removed', removal_date: '2026-11-09' }]) === '2026-11-09');
  ok('the weekly check that the top page names runs on a schedule', /schedule:\n\s+- cron: '[^']+'/.test(read(path.join(ROOT, '.github', 'workflows', 'watch.yml'))));
  ok('an ISSN is valid only with its check digit (ISO 3297)', B.issnOk('0317-8471') && !B.issnOk('0317-8472') && !B.issnOk('03178471') && !B.issnOk('0317-847'));
  ok('the ISSN is shown on the top page exactly when site.json has one, and only one given there',
    S.issn === null ? !/ISSN \d{4}-\d{3}[\dX]/.test(idx) : (B.issnOk(S.issn) && idx.includes('ISSN ' + S.issn + ' (online).')));
}

/* ------------------------------------------------------------ 49 */
console.log('\n49. Removal requests, handled at once and decided by the operator (tools/removal.js)');
{
  const R = require('../tools/removal.js');
  const B = require('../build.js');
  const form = read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'removal.yml'));
  const kinds = (form.match(/id: reason[\s\S]*?options:\n((?:\s+- .*\n)+)/) || ['', ''])[1].split('\n').map((l) => l.replace(/^\s+- /, '').trim()).filter(Boolean);
  ok('every kind of problem in the removal form is known to the script, and no other', kinds.length === 7 && kinds.every((k) => R.KINDS[k]) && Object.keys(R.KINDS).length === kinds.length);
  ok('only a report of exposed personal data takes material offline before the decision, as the Takedown Policy says',
    Object.entries(R.KINDS).filter(([, k]) => k.hold).map(([l]) => l).join() === 'Exposure of personal data'
    && read(path.join(ROOT, 'policies', 'takedown.md')).includes('For personal data and other serious harm, the record page (its title, authors, abstract and PDF copy) is taken offline at once, before the decision'));
  const body = '### Sophaxis id\n\n2026.0001\n\n### Kind of problem\n\nExposure of personal data\n\n### How you are concerned\n\nMy personal data appears in the record\n\n### Where the problem is\n\nThe abstract.';
  const f = R.parse(body);
  ok('the removal issue is read: the id, the kind and how the requester is concerned', f.id === '2026.0001' && f.kind.slug === 'personal-data' && f.relation === 'My personal data appears in the record');
  const listed = JSON.parse(read(path.join(__dirname, 'fixtures', 'papers', '2026.0001.json')));
  const h = R.plan('hold', listed, '2026-11-08');
  ok('a hold turns the record into a notice under review that keeps only the id, the date, the reason and the issue, and drops its PDF copies',
    h.problems.length === 0 && JSON.stringify(h.record) === JSON.stringify({ id: '2026.0001', status: 'removed', removal_date: '2026-11-08', removal_reason: 'under-review', issue: listed.issue })
    && h.files.join() === '2026.0001v2.pdf' && R.isHeld(h.record));
  ok('a record already offline or removed is not held again', !!R.plan('hold', h.record, '2026-11-09').skip
    && !!R.plan('hold', JSON.parse(read(path.join(__dirname, 'fixtures', 'papers', '2026.0003.json'))), '2026-11-09').skip && !!R.plan('hold', null, '2026-11-09').skip);
  const up = R.plan('remove', h.record, '2026-11-12');
  const up2 = R.plan('remove', listed, '2026-11-12');
  ok('an upheld request leaves only the id, the fact and the day of the decision: no reason, no issue, no PDF',
    up.problems.length === 0 && JSON.stringify(up.record) === JSON.stringify({ id: '2026.0001', status: 'removed', removal_date: '2026-11-12' }) && up.files.length === 0
    && up2.problems.length === 0 && JSON.stringify(up2.record) === JSON.stringify(up.record) && up2.files.join() === '2026.0001v2.pdf'
    && !!R.plan('remove', up.record, '2026-11-13').skip
    && Object.values(R.KINDS).every((k) => !('reason' in k)) && !read(path.join(ROOT, 'tools', 'removal.js')).includes('removal_reason: reason'));
  const np = R.plan('remove-pdf', listed, '2026-11-12');
  ok('an author\'s request for the PDF copy to be removed drops only the copies', np.problems.length === 0 && !('pdfs' in np.record) && np.files.join() === '2026.0001v2.pdf'
    && (() => { const a = JSON.parse(JSON.stringify(listed)); delete a.pdfs; return JSON.stringify(a) === JSON.stringify(np.record); })());
  ok('the answer is due 7 days after the request, counted in Japan time', R.DAYS === 7 && R.dueDay('2026-11-07T20:00:00Z') === '2026-11-15' && R.dueDay('2026-11-07T10:00:00Z') === '2026-11-14');
  const issue = (n, labels, created, comments) => ({ number: n, state: 'open', labels: labels.map((name) => ({ name })), created_at: created, comments_list: comments });
  const owner = { user: { login: 'cpsbvbng26-dotcom' }, body: 'Looking at it.' };
  const due = R.dueReminders([
    issue(1, ['removal'], '2026-11-01T01:00:00Z', []),
    issue(2, ['removal'], '2026-11-06T01:00:00Z', []),
    issue(3, ['removal'], '2026-11-01T01:00:00Z', [owner]),
    issue(4, ['removal'], '2026-11-01T01:00:00Z', [{ user: { login: 'github-actions[bot]' }, body: R.reminder('2026-11-08') }]),
    issue(5, ['withdrawal', 'verified'], '2026-11-01T01:00:00Z', []),
    issue(6, ['withdrawal', 'unverified'], '2026-11-01T01:00:00Z', []),
    issue(7, ['submission'], '2026-11-01T01:00:00Z', []),
  ], 'cpsbvbng26-dotcom', '2026-11-07');
  ok('a reminder goes once, from two days before the answer is due, to removal requests and verified withdrawals the operator has not answered',
    due.map((r) => r.number).join() === '1,5' && due[0].due === '2026-11-08');
  const rec = { id: '2026.0001', issue: 1 };
  const said = [R.ack({ form: f, record: listed, held: true, due: '2026-11-15' }), R.ack({ form: f, record: listed, failed: true, due: '2026-11-15' }),
    R.ack({ form: R.parse(body.replace('Exposure of personal data', 'Copyright infringement')), record: listed, due: '2026-11-15' }),
    R.authorNotice({ id: '2026.0001', kind: f.kind, issue: 9, held: true }), R.decisionNote({ id: '2026.0001', decision: 'upheld', kind: f.kind, today: '2026-11-12', done: true, emptied: [3, 12] }),
    R.decisionNote({ id: '2026.0001', decision: 'not-upheld', kind: f.kind, today: '2026-11-12', restored: true }), R.EMPTIED];
  ok('the acknowledgement gives the day the answer is due, says whether material went offline, and that it decides nothing',
    said[0].startsWith(R.MARK) && said[0].includes('aims to answer by 2026-11-15 (Japan time)') && said[0].includes('taken offline at once, before the decision. This is not a decision on the request.')
    && said[1].includes('the operator does it by hand') && said[2].includes('stays online while the request is reviewed') && said.slice(0, 3).every((t) => t.includes('It decides nothing; the operator decides.')));
  ok('the authors are told and can respond; the operator\'s decision lists what is done and what is left by hand; a request not upheld puts material back',
    said[3].includes('in #9') && said[3].includes('If the request is not upheld, it is put back.') && said[3].includes('The record page (its title, authors, abstract and PDF copy) is offline while it is reviewed.') && said[3].includes('can respond')
    && said[4].includes('- [ ] ask the Internet Archive to exclude its earlier copies (by hand)') && said[4].includes('- [x] every automatic comment about the record is deleted')
    && said[4].includes('- [x] the issues that name it are emptied, closed and locked: #3, #12') && said[4].includes('- [ ] delete those issues, so that their edit history goes too')
    && said[5].includes('put back') && said[6] === 'Removed.'
    && R.emptiedTitle('[Submission] A Title Naming the Work') === '[Submission] removed' && R.emptiedTitle('[Withdrawal] 2026.0001') === '[Withdrawal] removed' && R.emptiedTitle('Some title') === '[Removed] removed'
    && R.decisionNote({ id: '2026.0001', decision: 'upheld', kind: R.KINDS['A request about my personal data (access, correction, restriction, objection, deletion, stopping its provision to others, a copy)'], today: '2026-11-12', done: false }).includes('The operator carries it out by hand.'));
  const dr = R.parse(body.replace('Exposure of personal data', 'A request about my personal data (access, correction, restriction, objection, deletion, stopping its provision to others, a copy)'));
  const drAck = R.ack({ form: dr, record: listed, due: '2026-11-15' });
  ok('a request about the requester\'s own data is free, confirms who asks before acting, and is not told to the authors',
    !R.tellsAuthors(dr.kind) && drAck.includes('Requests cost nothing.') && drAck.includes('the operator confirms who is asking') && !drAck.includes('The authors are told'));
  ok('no automatic text names an email address or repeats the record', said.concat(drAck).every((t) => !/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]/.test(t) && !t.includes(listed.title) && !t.includes(listed.abstract)));
  const page = B.removedPage(h.record);
  ok('a record under review says so, and that it comes back if the request is not upheld; it is not called removed',
    page.includes('<h1>Record under review</h1>') && page.includes('If it is not upheld, they are put back.') && !page.includes('Record removed') && page.includes('<meta name="robots" content="noindex">'));
  const wf = read(path.join(ROOT, '.github', 'workflows', 'removal.yml'));
  const src = read(path.join(ROOT, 'tools', 'removal.js'));
  ok('only the repository owner\'s labels "upheld" and "not-upheld" act on a decision; the issue text reaches the script only through the environment',
    wf.includes("&& github.event.sender.login == github.repository_owner") && wf.includes("(github.event.label.name == 'upheld' || github.event.label.name == 'not-upheld')")
    && wf.includes("github.event.action != 'labeled'") && [...wf.matchAll(/^\s*- run: (.*)$/gm)].every((m) => m[1] === 'node tools/removal.js' || m[1] === 'node tools/indexnow.js')
    && !/\$\{\{ github\.event\.issue\.body \}\}[^\n]*\n\s+run:/.test(wf));
  ok('changes to main go one at a time, and only after the site is built and every check passes',
    /concurrency:\n  group: removal\n  cancel-in-progress: false/.test(wf)
    && /\n  execFileSync\('node', \['build\.js'\], [^\n]*\);\n  execFileSync\('node', \['verification\/check\.js'\], [^\n]*\);\n[\s\S]*\n  git\('push', 'origin', 'HEAD:main'\);\n\}/.test(src));
  ok('an upheld removal deletes every comment of the bot in the issues that name the record, and empties, closes and locks them; removal requests are left',
    src.includes("if (c.user.type === 'Bot') await I.github('DELETE', '/issues/comments/' + c.id)") && src.includes("body: EMPTIED, state: 'closed'")
    && src.includes("'/issues/' + n + '/lock'") && src.includes("!(i.labels || []).some((l) => l.name === 'removal')"));
  ok('the Takedown Policy says the notice gives no reason, that every trace in the issues goes, and that earlier versions on Vercel are not public',
    ['When a record is removed, its page is replaced by a notice that says only that the record with that Sophaxis id was removed.', 'The notice gives no reason and no other detail.',
      'Every automatic comment about the record is deleted, and the issues that name it are emptied, closed and locked; the operator then deletes them.',
      'The operator also asks GitHub to remove the material from the repository history.', 'Earlier versions of the site that Vercel keeps are not open to the public.']
      .every((x) => read(path.join(ROOT, 'policies', 'takedown.md')).includes(x)));
  ok('a hold is recorded in its commit, and putting back restores the record and its copies from just before that commit',
    src.includes("'Sophaxis-Action: ' + action + ' ' + id") && src.includes("'--grep=^Sophaxis-Action: hold '") && src.includes("'--', 'data/papers/' + id + '.json')") && src.includes("sha + '^:data/papers/' + id + '.json'"));
  ok('the Takedown Policy and the README say what runs by itself and what the operator decides',
    read(path.join(ROOT, 'policies', 'takedown.md')).includes('A removal issue is acknowledged automatically, with the day by which the operator aims to answer.')
    && read(path.join(ROOT, 'policies', 'takedown.md')).includes('When a removal issue reports exposure of personal data, the record page (its title, authors, abstract and PDF copy) is taken offline automatically, before the operator reads it.')
    && read(path.join(ROOT, 'policies', 'takedown.md')).includes('The automatic steps decide nothing; the operator decides every request.')
    && read(path.join(ROOT, 'README.md')).includes('label the issue `upheld` or `not-upheld`'));
}

/* ------------------------------------------------------------ 50 */
console.log('\n50. The other authors confirm their own agreement (Submission Policy)');
{
  const I = require('../tools/intake.js');
  const meta = I.fromDataCite(JSON.parse(read(path.join(__dirname, 'fixtures', 'intake', 'datacite.json'))));
  const [carberry, roe] = meta.authors;
  const sub = read(path.join(ROOT, 'policies', 'submission.md'));
  ok('the check applies from the day the Submission Policy gives (' + I.COAUTHORS_FROM + ')', sub.includes('From ' + I.COAUTHORS_FROM + ', a work with more than one author is listed only after every other author confirms their own agreement.'));
  ok('before that day there is no such check; from it, a work with one author passes',
    I.coauthorCheck(meta.authors, carberry, [], '2026-11-20T23:59:00Z') === null && I.coauthorCheck([carberry], carberry, [], '2026-11-21')[1] === true);
  const waiting = I.coauthorCheck(meta.authors, carberry, [], '2026-11-21');
  ok('until every other author confirms, the check fails and names who is awaited; then it passes',
    waiting[1] === false && waiting[2] === '1 of 2 authors; waiting for Jane Roe' && I.coauthorCheck(meta.authors, carberry, [roe], '2026-11-21')[1] === true
    && I.coauthorCheck(meta.authors, carberry, [carberry], '2026-11-21')[1] === false);
  const c = (login, body, type) => ({ user: { login, type: type || 'User' }, body });
  const found = I.confirmationsIn([
    c('jroe', 'I agree to the listing of this work on Sophaxis.\nORCID: 0000-0002-1694-233X'),
    c('jroe', 'Looks good to me. 0000-0002-1694-233X'),
    c('github-actions[bot]', 'I agree to the listing of this work on Sophaxis. ORCID: 0000-0002-1694-233X', 'Bot'),
    c('someone', 'Confirmed by email through the ORCID record: 0000-0002-1694-233X'),
    c('cpsbvbng26-dotcom', 'Confirmed by email through the ORCID record: 0000-0002-1694-233X'),
  ], 'cpsbvbng26-dotcom');
  ok('a confirmation needs the words and an ORCID iD; a bot\'s comment never counts, and only the operator records a confirmation by email',
    found.length === 2 && found[0].login === 'jroe' && !found[0].byOperator && found[1].byOperator && found[1].orcid === '0000-0002-1694-233X');
  const roeRecord = { given: 'Jane', family: 'Roe', urls: ['https://github.com/jroe'] };
  const roeWorks = new Set(['10.6084/m9.figshare.1234567.v1']);
  ok('a confirmation counts only from a GitHub account that the ORCID record links, for an ORCID record that is an author of the work',
    I.confirmedAuthor(meta, meta.doi, found[0], roeRecord, roeWorks) === roe
    && I.confirmedAuthor(meta, meta.doi, { login: 'mallory', orcid: found[0].orcid }, roeRecord, roeWorks) === null
    && I.confirmedAuthor(meta, meta.doi, found[0], roeRecord, new Set()) === null
    && I.confirmedAuthor(meta, meta.doi, found[1], { given: 'Jane', family: 'Roe', urls: [] }, roeWorks) === roe
    && I.confirmedAuthor(meta, meta.doi, found[0], null, roeWorks) === null);
  const result = { ok: false, checks: [['The DOI is in an accepted repository', true, ''], waiting] };
  const said = I.comment(result, null);
  ok('while only the other authors are awaited, the comment says how each confirms, in a comment or by email, and shows no draft',
    said.includes(I.AGREE + ' ORCID: 0000-0000-0000-0000') && said.includes('from a GitHub account that their ORCID record links') && said.includes('writes by email to the address on the operator\'s ORCID record')
    && !said.includes('Draft record') && !said.includes('Not verified.') && !/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]/.test(said));
  ok('the Submission Policy gives the words of a confirmation', sub.includes('The comment says "' + I.AGREE + '" and gives their ORCID iD.'));
}

/* ------------------------------------------------------------ 51 */
console.log('\n51. What runs by itself, said on the site and in the README');
{
  const auto = read(path.join(ROOT, 'automation.md'));
  const page = read(path.join(ROOT, 'site', 'automation.html'));
  ok('the site has the page, every page links it from the footer, and the sitemap lists it',
    page.includes('<h1>What runs by itself</h1>') && read(path.join(ROOT, 'site', 'sitemap.xml')).includes('<loc>https://sophaxis.vercel.app/automation.html</loc>')
    && fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html')).every((f) => /<footer>[\s\S]*automation\.html">What runs by itself<\/a>[\s\S]*<\/footer>/.test(read(path.join(ROOT, 'site', f)))));
  /* Every workflow on main and every script a workflow runs is named on the page, so that nothing runs unsaid. */
  const wfs = fs.readdirSync(path.join(ROOT, '.github', 'workflows')).filter((f) => f.endsWith('.yml'));
  const scripts = [...new Set(wfs.flatMap((f) => [...read(path.join(ROOT, '.github', 'workflows', f)).matchAll(/node (tools\/[a-z_]+\.js|verification\/check\.js)/g)].map((m) => m[1])))];
  const unsaid = scripts.filter((x) => !auto.includes('(https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/' + x + ')'));
  ok('the page links every script that a workflow runs (' + scripts.length + ')', scripts.length >= 7 && unsaid.length === 0, unsaid.join(', '));
  const named = { 'watch.yml': 'watch.yml', 'intake.yml': 'intake.yml', 'removal.yml': 'removal.yml', 'indexnow.yml': 'indexnow.yml', 'statutes.yml': 'statutes.yml', 'live.yml': 'live.yml', 'record.yml': 'record.yml', 'report.yml': 'report.yml', 'monthly.yml': 'monthly.yml', 'audit.yml': 'audit.yml' };
  ok('the page names each workflow that runs on an event of its own', Object.keys(named).every((f) => wfs.includes(f) && auto.includes('/.github/workflows/' + f + ')'))
    && wfs.every((f) => ['check.yml', 'intake.yml', 'removal.yml', 'indexnow.yml', 'watch.yml', 'pdf.yml', 'sources.yml', 'statutes.yml', 'live.yml', 'record.yml', 'report.yml', 'monthly.yml', 'audit.yml'].includes(f)), wfs.join(', '));
  /* The times on the page are the schedules of the workflows, in Japan time. */
  const jst = (cron) => { const [m, h] = cron.split(' ').map(Number); return String((h + 9) % 24).padStart(2, '0') + ':' + String(m).padStart(2, '0'); };
  const cronOf = (f) => (/cron: '([^']+)'/.exec(read(path.join(ROOT, '.github', 'workflows', f))) || [])[1];
  ok('the daily and weekly times on the page are those of the schedules (' + jst(cronOf('removal.yml')) + ', Monday ' + jst(cronOf('watch.yml')) + ' Japan time)',
    auto.includes('## Once a day, at ' + jst(cronOf('removal.yml')) + ' Japan time') && auto.includes('## Once a week, on Monday at ' + jst(cronOf('watch.yml')) + ' Japan time')
    && auto.includes('and once a day at ' + jst(cronOf('live.yml')) + ' Japan time, every file in `site/` is fetched from the live site') && cronOf('live.yml').endsWith(' * * *')
    && cronOf('watch.yml').endsWith(' * * 1') && cronOf('monthly.yml').endsWith(' 1 * *') && auto.includes('## Once a month, on the 1st at ' + jst(cronOf('monthly.yml')) + ' Japan time') && cronOf('statutes.yml') === cronOf('watch.yml') && cronOf('removal.yml').endsWith(' * * *') && (Number(cronOf('watch.yml').split(' ')[1]) + 9) < 24);
  ok('the page says that no step decides, uses a language model or holds another key, and names the one step that acts before a decision',
    ['No automatic step decides on a submission, a withdrawal, a correction or a removal request. The operator decides every one.', 'No step uses a language model. The steps are ordinary code.',
      'No step signs in to any account.', 'One step acts before the operator decides: when a removal issue reports exposure of personal data'].every((x) => auto.includes(x)));
  const readme = read(path.join(ROOT, 'README.md'));
  ok('the README, in both languages, points to the page', readme.includes('### What runs by itself') && readme.includes('(https://sophaxis.vercel.app/automation.html) (`automation.md`)')
    && readme.includes('[自動で動く手順](https://sophaxis.vercel.app/automation.ja.html)の頁にすべて挙げています。'));
  const pv = read(path.join(ROOT, 'policies', 'privacy.md'));
  const pj = read(path.join(ROOT, 'policies', 'privacy.ja.md'));
  ok('the Privacy Policy, in both languages, says that no significant decision is made solely by automated means, names the mailbox at Apple, and gives the measures under the Commission\'s headings',
    pv.includes('## Automated processing') && pv.includes('No decision with legal or similarly significant effects on a person is made solely by automated means.')
    && pv.includes('Apple (iCloud Mail, United States)') && ['- Organisation:', '- People:', '- Physical:', '- Technical:', '- The countries where data is kept:'].every((x) => pv.includes(x))
    && pj.includes('## 自動の処理') && pj.includes('自動の処理だけで下すことはありません。') && pj.includes('iCloud メール、米国')
    && ['- 組織的な措置：', '- 人的な措置：', '- 物理的な措置：', '- 技術的な措置：', '- 外的環境の把握：'].every((x) => pj.includes(x))
    && read(path.join(ROOT, 'docs', 'records-of-processing.md')).includes('Apple (iCloud Mail, United States), for email'));
  const tk = read(path.join(ROOT, 'policies', 'takedown.md'));
  ok('the Takedown Policy follows the Digital Services Act: a point of contact, notices, reasons, a free challenge within six months, courts and certified bodies, and the terms',
    ['## For the European Union: the Digital Services Act', '(Articles 11 and 12)', 'Notices of illegal content (Article 16)', 'Reasons for a decision (Article 17)',
      'Challenging a decision (Article 20)', 'within six months', 'the review is never left to an automatic step', 'certified under Article 21', '(Article 14)'].every((x) => tk.includes(x))
    && read(path.join(ROOT, 'contact.md')).includes('single point of contact under the Digital Services Act of the European Union (Articles 11 and 12)'));
  const R = require('../tools/removal.js');
  const k = R.KINDS['Exposure of personal data'];
  ok('every decision note gives the grounds and says how to challenge it',
    [R.decisionNote({ id: '2026.0001', decision: 'upheld', kind: k, today: '2026-11-12', done: true }), R.decisionNote({ id: '2026.0001', decision: 'not-upheld', kind: k, today: '2026-11-12' })]
      .every((t) => t.includes(R.CHALLENGE) && /grounds|reasons/.test(t)) && R.CHALLENGE.includes('within six months, free of charge'));
}

/* ------------------------------------------------------------ 52 */
console.log('\n52. No commitment is dropped silently');
{
  const lines = (t) => String(t || '').split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim() && !l.startsWith('#'));
  const now = lines(read(path.join(__dirname, 'commitments.txt')));
  const superseded = new Map(lines(read(path.join(__dirname, 'superseded.txt'))).map((l) => l.split('\t')));
  const corpus = [read(path.join(ROOT, 'policy.md'))].concat(fs.readdirSync(path.join(ROOT, 'policies')).sort().map((f) => read(path.join(ROOT, 'policies', f))),
    ['disclaimer.md', 'automation.md', 'contact.md', 'faq.md', path.join('docs', 'records-of-processing.md')].map((f) => read(path.join(ROOT, f)))).join('\n');
  const absent = now.filter((l) => !corpus.includes(l));
  ok('every commitment in the list is in the policies word for word (' + now.length + ')', now.length >= 80 && absent.length === 0, absent.map((l) => l.slice(0, 60)).join(' | '));
  ok('no commitment is listed twice, and every replacement named is itself in the list', new Set(now).size === now.length && [...superseded.values()].every((n) => now.includes(n)));
  /* Every line the list ever held, in any commit, is still there or has a named replacement. */
  let history = [];
  try {
    const commits = require('child_process').execFileSync('git', ['log', '--format=%H', '--', 'verification/commitments.txt'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
    for (const c of commits) history.push(...lines(require('child_process').execFileSync('git', ['show', c + ':verification/commitments.txt'], { cwd: ROOT, encoding: 'utf8' })));
  } catch (e) { history = null; }
  const dropped = history === null ? ['the git history could not be read'] : [...new Set(history)].filter((l) => !now.includes(l) && !superseded.has(l));
  ok('no line that the list ever held is gone without its replacement being named', dropped.length === 0, dropped.map((l) => l.slice(0, 60)).join(' | '));
  const pol = read(path.join(ROOT, 'policy.md'));
  ok('the policy index says so, and names both files', pol.includes('## Commitments are never dropped silently') && pol.includes('`verification/commitments.txt`') && pol.includes('`verification/superseded.txt`'));
  /* The pages send nothing about a reader anywhere: no script, style, image, frame or form from another host.
   * A <link> that the browser does not fetch (canonical, alternate, microdata) is not a request. */
  const ext = fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html'))
    .filter((f) => /<(script|img|iframe|link|form|audio|video|source)\b[^>]*\b(src|href|action)="(https?:)?\/\//i.test(read(path.join(ROOT, 'site', f)).replace(/<link\b(?![^>]*\brel="(stylesheet|preload|prefetch|preconnect|dns-prefetch|modulepreload|icon|apple-touch-icon|manifest)")[^>]*>/gi, '')));
  ok('no page loads or sends anything from or to another host', ext.length === 0, ext.join(', '));
}

/* ------------------------------------------------------------ 53 */
console.log('\n53. robots.txt keeps the Internet Archive away from removed records');
{
  const B = require('../build.js');
  const fx = loadPapers(path.join(__dirname, 'fixtures', 'papers')).papers;
  const r = B.robots(fx);
  ok('every crawler may read everything; the Internet Archive\'s crawlers are kept from the page and the PDF copies of a removed record, and of no other',
    r.startsWith('User-agent: *\nAllow: /\n') && r.includes('User-agent: ia_archiver\nUser-agent: archive.org_bot\nDisallow: /abs/2026.0003\nDisallow: /pdf/2026.0003\nAllow: /\n')
    && !/Disallow: \/(abs|pdf)\/2026\.000[12]/.test(r) && r.endsWith('Sitemap: https://sophaxis.vercel.app/sitemap.xml\n'));
  const { papers } = loadPapers(path.join(ROOT, 'data', 'papers'));
  const live = read(path.join(ROOT, 'site', 'robots.txt'));
  ok('the site\'s robots.txt names every removed record, and only those', live === B.robots(papers)
    && papers.every((p) => (p.status === 'removed') === live.includes('Disallow: /abs/' + p.id + '\n')));
  ok('without a removed record, robots.txt is the plain one', B.robots(fx.filter((p) => p.status !== 'removed')) === 'User-agent: *\nAllow: /\n\nSitemap: https://sophaxis.vercel.app/sitemap.xml\n');
}

/* ------------------------------------------------------------ 54 */
console.log('\n54. The Zenodo community is named as what it is, not as a partnership');
{
  const URL = 'https://zenodo.org/communities/sophaxis';
  const readme = read(path.join(ROOT, 'README.md'));
  const forRepos = read(path.join(ROOT, 'repositories.md'));
  ok('the README, in both languages, and the page for repositories give the community and say it is not an affiliation',
    (readme.match(/<https:\/\/zenodo\.org\/communities\/sophaxis>/g) || []).length === 2 && forRepos.includes('<' + URL + '>')
    && readme.includes('it is not an affiliation with Zenodo, and Zenodo does not endorse Sophaxis.') && readme.includes('Zenodo との提携ではありません。')
    && forRepos.includes('it does not make Sophaxis part of Zenodo.'));
  ok('the community takes only works listed on Sophaxis, and says so in both languages',
    readme.includes('A record is added only when the same version is listed on Sophaxis, and every addition is reviewed.')
    && readme.includes('入れるのは、同じ版が Sophaxis に載っているものだけです。'));
  /* No page, record or policy claims a partnership, an endorsement or an affiliation with a repository; only the denials may name them. */
  const files = ['README.md', 'policy.md', 'disclaimer.md', 'repositories.md', 'faq.md', 'contact.md', 'process.md', 'automation.md']
    .concat(fs.readdirSync(path.join(ROOT, 'policies')).map((f) => path.join('policies', f)));
  const claims = [];
  for (const f of files) {
    const t = read(path.join(ROOT, f));
    for (const line of t.split('\n')) {
      if (/partner|endorse|affiliat|提携|公認|推薦/i.test(line) && !/\bnot\b|\bno\b|\bnor\b|ではありません|ません/i.test(line)) claims.push(f + ': ' + line.slice(0, 80));
    }
  }
  ok('no page claims a partnership, an endorsement or an affiliation; such words appear only in denials', claims.length === 0, claims.join(' / '));
}

/* ------------------------------------------------------------ 55 */
console.log('\n55. The extent of use of generative models, at one of the levels in site.json');
{
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const L = site.llmExtents;
  const keys = Object.keys(L);
  const W = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];
  const form = read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'submission.yml'));
  const sub = read(path.join(ROOT, 'policies', 'submission.md'));
  ok('the form offers exactly the levels of site.json, in order, and does not require one before ' + site.llmExtentFrom,
    keys.join() === 'none,editing,assistance,drafting'
    && form.includes('id: llm_extent') && form.includes('Required from ' + site.llmExtentFrom + '.')
    && /id: llm_extent[\s\S]*?options:\n((?:        - "[^"\n]+"\n)+)    validations:\n      required: false\n/.test(form)
    && /id: llm_extent[\s\S]*?options:\n((?:        - "[^"\n]+"\n)+)/.exec(form)[1].split('\n').filter(Boolean).map((l) => l.replace(/^        - "|"$/g, '')).join('|') === Object.values(L).join('|'));
  ok('the Submission Policy and the notice name the same levels and their number, from the same day',
    sub.includes('From ' + site.llmExtentFrom + ', the form also asks for the extent of use, at one of ' + W[keys.length] + ' levels.')
    && Object.values(L).every((v) => sub.includes('- ' + v + '.\n'))
    && site.termsNotice.from === site.llmExtentFrom && site.termsNotice.text.includes('at one of ' + W[keys.length] + ' levels: ' + keys.join(', ').replace(/, (\w+)$/, ' or $1') + '.'));
  const I = require('../tools/intake.js');
  ok('the form label maps to its key, and nothing else does', keys.every((k) => I.extentKey(L[k]) === k) && I.extentKey('drafting') === null && I.extentKey('') === null);
  const ix = I.parseIssue(read(path.join(__dirname, 'fixtures', 'intake', 'issue.md')));
  const dc = I.fromDataCite(JSON.parse(read(path.join(__dirname, 'fixtures', 'intake', 'datacite.json'))));
  const person = I.orcidPerson(JSON.parse(read(path.join(__dirname, 'fixtures', 'intake', 'orcid-person.json'))));
  const works = I.orcidDois(JSON.parse(read(path.join(__dirname, 'fixtures', 'intake', 'orcid-works.json'))));
  const run = (form, today) => I.check({ form: Object.assign({ consent: I.allTicked('consent') }, form), login: 'jcarberry', meta: dc, person, works, today });
  ok('before the day the level may be left out; from the day it is required', run(ix, '2026-11-20').ok && !run(ix, '2026-11-21').ok
    && run(Object.assign({}, ix, { llm_extent: L.drafting }), '2026-11-21').ok);
  ok('"None" beside a statement that names a model is refused; beside a statement of no use it passes',
    !run(Object.assign({}, ix, { llm_extent: L.none, llm: 'Claude (Anthropic) edited the English of the introduction.' }), '2026-11-21').ok
    && run(Object.assign({}, ix, { llm_extent: L.none, llm: 'No generative model was used for any part of this work.' }), '2026-11-21').ok);
  const B = require('../build.js');
  const good = JSON.parse(read(path.join(__dirname, 'fixtures', 'papers', '2026.0001.json')));
  ok('a record with an unknown level is refused; a record listed from the day without a level is refused',
    B.validate(Object.assign({}, good, { llm_extent: 'heavy' }), '2026.0001.json').some((x) => x.includes('llm_extent must be one of'))
    && B.validate(Object.assign({}, good, { listed: site.llmExtentFrom, llm_extent: undefined }), '2026.0001.json').some((x) => x.includes('llm_extent is required'))
    && B.validate(Object.assign({}, good, { llm_extent: 'editing' }), '2026.0001.json').length === 0);
  const page = read(path.join(ROOT, 'site', 'abs', '2026.0001.html'));
  const stats = read(path.join(ROOT, 'site', 'stats.html'));
  const pj = JSON.parse(read(path.join(ROOT, 'site', 'papers.json')));
  ok('the record page shows the level above the statement, and papers.json and the statistics carry it',
    page.includes('<p class="meta">Extent, as the authors state it: ' + L.drafting.replace(/'/g, '&#39;') + '</p>')
    && page.indexOf('Extent, as the authors state it') < page.indexOf('The author used Claude Code')
    && pj.find((x) => x.id === '2026.0001').llm_extent === 'drafting'
    && stats.includes('<h2>Use of generative models</h2>') && Object.values(L).every((v) => stats.includes(v.replace(/'/g, '&#39;'))));
}

/* ------------------------------------------------------------ 56 */
console.log('\n56. The Zenodo DOI of Sophaxis stands beside its OSF project DOI');
{
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const cff = read(path.join(ROOT, 'CITATION.cff'));
  const home = read(path.join(ROOT, 'site', 'index.html'));
  const contact = read(path.join(ROOT, 'contact.md'));
  ok('the Zenodo DOIs in site.json are those of CITATION.cff, and the community is the one the README names',
    cff.includes('value: "' + site.zenodo.doi + '"') && cff.includes('value: "' + site.zenodo.version + '"') && cff.includes('doi: "' + site.zenodo.doi + '"')
    && read(path.join(ROOT, 'README.md')).includes('<' + site.zenodo.community + '>'));
  const line = (/<p class="meta">Sophaxis itself: [^\n]*<\/p>/.exec(home) || [''])[0];
  ok('the top page shows the OSF project DOI and the Zenodo DOI in one line, each as a link, and says neither names a listed work',
    line.includes('OSF project DOI <a href="https://doi.org/' + site.osf.doi + '">' + site.osf.doi + '</a>')
    && line.includes('Zenodo DOI <a href="https://doi.org/' + site.zenodo.doi + '">' + site.zenodo.doi + '</a>')
    && line.indexOf('OSF project DOI') < line.indexOf('Zenodo DOI') && line.includes('Neither names a listed work'));
  ok('the top page names both DOIs as sameAs for the site', home.includes('<link itemprop="sameAs" href="https://doi.org/' + site.osf.doi + '">')
    && home.includes('<link itemprop="sameAs" href="https://doi.org/' + site.zenodo.doi + '">'));
  const items = contact.split('\n').filter((l) => l.startsWith('- '));
  const osfAt = items.findIndex((l) => l.startsWith('- OSF:'));
  ok('on the contact page the Zenodo line comes right after the OSF line, with both DOIs and the community',
    osfAt >= 0 && items[osfAt + 1].startsWith('- Zenodo:') && items[osfAt + 1].includes(site.zenodo.doi) && items[osfAt + 1].includes(site.zenodo.version)
    && items[osfAt + 1].includes(site.zenodo.community) && items[osfAt + 1].includes('it is not an affiliation with Zenodo.'));
}

/* ------------------------------------------------------------ 57 */
/* Numbers that English writes in words: a small number before a unit of time, and a month named beside a day or a year. */
const NUM_WORDS = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fourteen: 14, thirty: 30, sixty: 60, ninety: 90 };
const NUM_WORD_UNIT = new RegExp('\\b(' + Object.keys(NUM_WORDS).join('|') + ')[ -](days?|weeks?|months?|years?|hours?|minutes?)\\b', 'gi');
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_DATE = new RegExp('\\b(\\d{1,2}) (' + MONTH_NAMES.join('|') + ')\\b|\\b(' + MONTH_NAMES.join('|') + ') (?:\\d{1,2}|\\d{4})\\b', 'g');
console.log('\n57. The Japanese translations of the policies and the Disclaimer keep step with the English');
{
  const sitemap = read(path.join(ROOT, 'site', 'sitemap.xml'));
  const pages = ['terms', 'submission', 'moderation', 'copyright', 'licences', 'takedown', 'withdrawal'].map((slug) => ({ slug, dir: 'policies/' }))
    .concat([{ slug: 'disclaimer', dir: '' }], ['process', 'faq', 'automation', 'contact', 'repositories', 'policy', 'transparency', 'advisory', 'brand', 'press', 'call', 'findable', 'accessibility', 'compare', 'glossary'].map((slug) => ({ slug, dir: '' })));
  for (const { slug, dir } of pages) {
    const en = read(path.join(ROOT, dir, slug + '.md'));
    const ja = read(path.join(ROOT, dir, slug + '.ja.md'));
    const enDate = (/Last updated: (\d{4}-\d{2}-\d{2})\./.exec(en) || [])[1];
    const jaDate = (/最終更新：(\d{4}-\d{2}-\d{2})。/.exec(ja) || [])[1];
    const body = (t) => t.split('\n').filter((l) => !/^(Last updated:|最終更新：|Japanese: |これは英語の )/.test(l)).join('\n');
    /* Item 473: the Japanese writes counts, durations and dates in Arabic digits ("6 か月", "10 月 30 日"), where the English
     * spells a small number before its unit ("six months") and names the month ("30 October"). Those are numbers too, and are
     * compared as such, so that each language must give the same ones. "One" is left out: in English it is mostly not a count. */
    const nums = (t, en = false) => {
      const b = body(t), set = new Set(b.match(/\d+/g) || []);
      if (en) {
        for (const m of b.matchAll(NUM_WORD_UNIT)) set.add(String(NUM_WORDS[m[1].toLowerCase()]));
        for (const m of b.matchAll(MONTH_DATE)) set.add(String(MONTH_NAMES.indexOf(m[2] || m[3]) + 1));
      }
      return set;
    };
    const urls = (t) => new Set((t.match(/https:\/\/[^\s)>\]]+/g) || []));
    const codes = (t) => new Set((t.match(/`[^`]+`/g) || []));
    const heads = (t) => (t.match(/^## /gm) || []).length;
    const same = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
    const miss = (a, b) => [...a].filter((x) => !b.has(x));
    const name = dir + slug + '.ja.md';
    ok(name + ': a translation that says the English applies, of the same day, with as many sections',
      /^# .+（日本語訳）\n/.test(ja) && ja.includes('これは英語の [') && ja.includes('](./' + slug + '.md) の訳です。') && ja.includes('英語の文が適用されます。')
      && enDate && enDate === jaDate && heads(en) === heads(ja),
      'dates ' + enDate + ' / ' + jaDate + ', sections ' + heads(en) + ' / ' + heads(ja));
    ok(name + ': the same numbers, addresses and code names as the English',
      same(nums(en, true), nums(ja)) && same(urls(en), urls(ja)) && same(codes(en), codes(ja)),
      'numbers missing ' + miss(nums(en, true), nums(ja)).join(',') + ' extra ' + miss(nums(ja), nums(en, true)).join(',')
      + ' / urls ' + miss(urls(en), urls(ja)).concat(miss(urls(ja), urls(en))).join(',') + ' / code ' + miss(codes(en), codes(ja)).concat(miss(codes(ja), codes(en))).join(','));
    const enHtml = read(path.join(ROOT, 'site', dir, slug + '.html'));
    const jaHtml = read(path.join(ROOT, 'site', dir, slug + '.ja.html'));
    const pair = '<link rel="alternate" hreflang="en" href="https://sophaxis.vercel.app/' + dir + slug + '.html">\n<link rel="alternate" hreflang="ja" href="https://sophaxis.vercel.app/' + dir + slug + '.ja.html">';
    ok(dir + slug + ': the English page links the translation, both pages name each other, and the sitemap has the translation with its day',
      en.includes('Japanese: [') && en.includes('](./' + slug + '.ja.md). It is a translation; where the two differ, the English text applies.')
      && enHtml.includes(pair) && jaHtml.includes(pair) && /<html lang="ja"/.test(jaHtml)
      && sitemap.includes(dir + slug + '.ja.html</loc><lastmod>' + jaDate + '</lastmod>'));
  }
  ok('the Terms say that the English text applies where a translation differs', read(path.join(ROOT, 'policies', 'terms.md')).includes('These terms are written in English, and a Japanese translation is published. Where the translation differs from the English text, the English text applies.'));
}

/* ------------------------------------------------------------ 58 */
console.log('\n58. Security headers that a <meta> element cannot give');
{
  const cfg = JSON.parse(read(path.join(ROOT, 'site', 'vercel.json')));
  const all = (cfg.headers || []).find((h) => h.source === '/(.*)');
  const get = (k) => ((all && all.headers) || []).filter((h) => h.key === k).map((h) => h.value);
  ok('every path refuses framing, both ways: frame-ancestors none and X-Frame-Options DENY',
    get('Content-Security-Policy').join() === "frame-ancestors 'none'" && get('X-Frame-Options').join() === 'DENY');
  ok('the header policy names frame-ancestors only, so the policy in each page stays the one that limits loading',
    get('Content-Security-Policy').every((v) => v.split(';').map((x) => x.trim()).filter(Boolean).every((d) => d.startsWith('frame-ancestors'))));
  ok('no MIME sniffing, no referrer, no browser features, an isolated window, and HTTPS remembered',
    get('X-Content-Type-Options').join() === 'nosniff' && get('Referrer-Policy').join() === 'no-referrer'
    && /camera=\(\)/.test(get('Permissions-Policy').join()) && /geolocation=\(\)/.test(get('Permissions-Policy').join()) && /microphone=\(\)/.test(get('Permissions-Policy').join())
    && get('Cross-Origin-Opener-Policy').join() === 'same-origin' && /^max-age=\d{8,}/.test(get('Strict-Transport-Security').join()));
  const page = read(path.join(ROOT, 'site', 'index.html'));
  ok('each page still carries its own policy, with default-src none', /<meta http-equiv="Content-Security-Policy" content="default-src 'none'/.test(page));
}

console.log('\n59. Consent to publication and to services outside Japan, agreement to the policies, and age, asked in the form');
{
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const I = require('../tools/intake.js');
  const form = read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'submission.yml'));
  const part = (/id: consent[\s\S]*?options:\n([\s\S]*?)(?:\n  - type:|$)/.exec(form) || [])[1] || '';
  const opts = [...part.matchAll(/^        - label: "?(.+?)"?$/gm)].map((m) => m[1]);
  ok('the form has ' + I.CONSENTS + ' boxes under "Consent and agreement", not required by the form itself before ' + site.consentFrom,
    form.includes('label: Consent and agreement') && form.includes('Required from ' + site.consentFrom + '.') && opts.length === I.CONSENTS
    && (part.match(/required: false/g) || []).length === I.CONSENTS);
  const policyOf = (s) => opts.some((o) => o.includes('I agree to the [' + policyTitleOf(s) + '](' + site.baseUrl + 'policies/' + s + '.html)'));
  const policyTitleOf = (s) => read(path.join(ROOT, 'policies', s + '.md')).split('\n')[0].replace(/^# /, '');
  ok('the boxes name the services in the United States, each of the eight policies and the version of the Terms, the court, the warranty, and the age in the words of the Terms',
    opts.some((o) => /consents to the record being provided to GitHub, Vercel and ORCID in the United States/.test(o)) && opts.some((o) => /to Anthropic, OpenAI and xAI in the United States/.test(o)) && !/Internet Archive/.test(part)
    && /agree to the \[Terms of Use\]\([^)]+\), in their version on the day of submission/.test(opts.join('\n')) && ['privacy', 'submission', 'moderation', 'takedown', 'copyright', 'licences', 'withdrawal'].every(policyOf)
    && opts.some((o) => o.includes('#disputes) in the Terms of Use') && o.includes('court')) && opts.some((o) => o.includes('#no-warranty)'))
    && read(path.join(ROOT, 'policies', 'terms.md')).includes('- From 2026-11-21, a person under 13 cannot submit.') && opts.some((o) => o.startsWith('I confirm that I am 13 or older, as from 2026-11-21 a person under 13 cannot submit'))
    && read(path.join(ROOT, 'policies', 'terms.md')).includes('- A person under 18 may submit only with the consent of a parent or guardian.') && opts.includes('I confirm that, if I am under 18, I submit only with the consent of a parent or guardian.'));
  ok('the day is the day of the notice of the change', site.consentFrom === site.termsNotice.from);
  const ix = I.parseIssue(read(path.join(__dirname, 'fixtures', 'intake', 'issue.md')));
  const dc = I.fromDataCite(JSON.parse(read(path.join(__dirname, 'fixtures', 'intake', 'datacite.json'))));
  const person = I.orcidPerson(JSON.parse(read(path.join(__dirname, 'fixtures', 'intake', 'orcid-person.json'))));
  const works = I.orcidDois(JSON.parse(read(path.join(__dirname, 'fixtures', 'intake', 'orcid-works.json'))));
  const ext = { llm_extent: site.llmExtents.assistance };
  const run = (consent, today) => I.check({ form: Object.assign({}, ix, ext, consent === null ? {} : { consent }), login: 'jcarberry', meta: dc, person, works, today });
  const row = (r) => r.checks.find((c) => c[0] === 'Consent, agreement to the policies and age are confirmed');
  const all = I.allTicked('consent'), allJa = I.allTicked('consent', 1);
  ok('before the day the boxes may be left empty; from the day all of them are needed, in either language',
    run(null, '2026-11-20').ok && !row(run(null, '2026-11-20')) && !run(null, '2026-11-21').ok && !run(all.replace('- [X] ', '- [ ] '), '2026-11-21').ok
    && run(all, '2026-11-21').ok && run(allJa, '2026-11-21').ok && !run(all.split('\n')[0], '2026-11-20').ok);
  ok('the form label is read into the consent field', I.parseIssue('### Consent and agreement\n\n' + all + '\n').consent === all);
  const lic = (licences) => I.check({ form: Object.assign({}, ix, ext, { consent: all }), login: 'jcarberry', meta: Object.assign({}, dc, { licences }), person, works, today: '2026-11-21' })
    .checks.find((c) => c[0] === 'The work carries an accepted licence');
  const Rm = require('../tools/removal.js');
  ok('a record put back after a hold takes today as its update, so that harvesters pick it up again',
    Rm.restored({ id: 'x', listed: '2026-11-01' }, '2026-11-30').updated === '2026-11-30' && Rm.restored({ id: 'x', listed: '2026-11-01', updated: '2026-12-05' }, '2026-11-30').updated === '2026-12-05');
  ok('a licence is accepted only when every entry in the metadata is the same accepted licence; mixed entries go to the operator',
    lic(['CC-BY-4.0'])[1] && lic(['CC-BY-4.0', 'CC-BY-4.0'])[1] && !lic(['CC-BY-4.0', 'CC-BY-NC-4.0'])[1] && lic(['CC-BY-4.0', 'CC-BY-NC-4.0'])[2].includes('the operator decides') && !lic([])[1]);
}

console.log('\n60. The decision on an EU or UK representative is reviewed when a work by another author is first listed');
{
  const recs = fs.readdirSync(path.join(ROOT, 'data', 'papers')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(read(path.join(ROOT, 'data', 'papers', f))));
  const others = recs.filter((p) => p.status !== 'removed' && p.operator_own !== true).map((p) => p.id).sort();
  const file = path.join(ROOT, 'docs', 'representative-reviews.md');
  const reviews = fs.existsSync(file) ? read(file) : '';
  ok('every listed work by an author other than the operator (' + others.length + ' now) has a recorded review of the decision, as the Privacy Policy promises',
    others.length === 0 || (others[0] && reviews.includes(others[0])), others.join(', '));
  const auto = ['.github/workflows/pdf.yml', 'tools/removal.js'].map((x) => read(path.join(ROOT, x))).join('\n');
  ok('commits made by the workflows name no model as co-author, and keep the Sophaxis-Action line', !/Co-Authored-By|Claude-Session/.test(auto) && auto.includes('Sophaxis-Action: pdf $ID'));
  ok('the Privacy Policy still makes that promise', read(path.join(ROOT, 'policies', 'privacy.md')).includes('The operator reviews this decision when Sophaxis first lists a work by an author other than the operator'));
}

console.log('\n61. OAI-PMH also gives oai_openaire, the profile of the OpenAIRE Guidelines for Literature Repositories v4');
{
  const O = require('../tools/oai.js');
  const src = read(path.join(ROOT, 'site', 'api', 'oai.js'));
  const data = JSON.parse(src.match(/module\.exports = handler\((.*)\);\n$/s)[1]);
  const ask = (args) => O.handle(args, data, new Date('2026-11-08T00:00:00Z'));
  const formats = ask([['verb', 'ListMetadataFormats']]);
  ok('ListMetadataFormats gives oai_dc and oai_openaire, with the schema and namespace of the guidelines (4.0)',
    formats.includes('<metadataPrefix>oai_dc</metadataPrefix>') && formats.includes('<metadataPrefix>oai_openaire</metadataPrefix><schema>https://www.openaire.eu/schema/repo-lit/4.0/openaire.xsd</schema><metadataNamespace>http://namespace.openaire.eu/schema/oaire/</metadataNamespace>'));
  const shown = data.records.filter((r) => !r.deleted);
  const bad = shown.filter((r) => {
    const g = ask([['verb', 'GetRecord'], ['identifier', r.identifier], ['metadataPrefix', 'oai_openaire']]);
    const id = r.identifier.split(':').pop();
    return !(g.includes('<oaire:resource ') && /<datacite:title>[^<]+<\/datacite:title>/.test(g) && /<datacite:creatorName>[^<]+<\/datacite:creatorName>/.test(g)
      && g.includes('<datacite:identifier identifierType="URL">' + SITE_BASE() + 'abs/' + id + '.html</datacite:identifier>')
      && g.includes('<datacite:rights rightsURI="http://purl.org/coar/access_right/c_abf2">open access</datacite:rights>')
      && g.includes('<oaire:resourceType resourceTypeGeneral="literature" uri="http://purl.org/coar/resource_type/c_816b">preprint</oaire:resourceType>')
      && /<datacite:date dateType="Issued">\d{4}-\d{2}-\d{2}<\/datacite:date>/.test(g)
      && /<datacite:relatedIdentifier relatedIdentifierType="DOI" relationType="IsIdenticalTo">10\.[^<]+<\/datacite:relatedIdentifier>/.test(g)
      && /<dc:publisher>[^<]+<\/dc:publisher>/.test(g)
      && (!/<oaire:file /.test(g) || new RegExp('objectType="fulltext">' + SITE_BASE().replace(/[.]/g, '\\.') + 'pdf/' + id.replace('.', '\\.') + 'v\\d+\\.pdf</oaire:file>').test(g)));
  }).map((r) => r.identifier);
  ok('every shown record (' + shown.length + ') carries the mandatory fields: title, creator, the record page as identifier, open access, preprint, the issued date, the deposited DOI and its repository; a full text only on this site',
    shown.length > 0 && bad.length === 0, bad.join(', '));
  ok('an author with an ORCID iD is given it as a name identifier', ask([['verb', 'GetRecord'], ['identifier', 'oai:sophaxis.vercel.app:2026.0001'], ['metadataPrefix', 'oai_openaire']])
    .includes('<datacite:nameIdentifier nameIdentifierScheme="ORCID" schemeURI="http://orcid.org">0009-0000-1406-0547</datacite:nameIdentifier>'));
  const del = data.records.find((r) => r.deleted);
  ok('a removed record is a header marked deleted, with no metadata, in oai_openaire too', !del
    || /<record><header status="deleted">[\s\S]*?<\/header><\/record>/.test(ask([['verb', 'GetRecord'], ['identifier', del.identifier], ['metadataPrefix', 'oai_openaire']])));
  ok('another format is refused with cannotDisseminateFormat', ask([['verb', 'ListRecords'], ['metadataPrefix', 'marc']]).includes('<error code="cannotDisseminateFormat">Only oai_dc and oai_openaire are given.</error>'));
  ok('the README says what the format carries and that the records validate against the schema', read(path.join(ROOT, 'README.md')).includes('- Metadata: `oai_openaire`, the application profile of the OpenAIRE Guidelines for Literature Repositories v4.'));
  function SITE_BASE() { return JSON.parse(read(path.join(ROOT, 'site.json'))).baseUrl; }
}

console.log('\n62. The workflows use actions that run on Node.js 24, and Dependabot watches their versions');
{
  const dir = path.join(ROOT, '.github', 'workflows');
  /* Each action is pinned to a full commit, with its version in a comment, which Dependabot keeps up to date together. */
  const uses = fs.readdirSync(dir).flatMap((f) => [...read(path.join(dir, f)).matchAll(/uses: (actions\/(?:checkout|setup-node))@[0-9a-f]{40} # v(\d+)[\d.]*$/gm)].map((m) => ({ f, a: m[1], v: Number(m[2]) })));
  const old = uses.filter((u) => u.v < 5).map((u) => u.f + ': ' + u.a + '@v' + u.v);
  ok('every checkout and setup-node (' + uses.length + ') is v5 or later, which runs on Node.js 24', uses.length > 0 && old.length === 0, old.join(', '));
  ok('Dependabot watches the versions of the GitHub Actions, monthly', /package-ecosystem: github-actions[\s\S]*interval: monthly/.test(read(path.join(ROOT, '.github', 'dependabot.yml'))));
}

console.log('\n63. The legal review as logic: every element denied or duty met, every pair of actor and act covered, the risks ranked');
{
  const at = (f) => path.join(ROOT, f);
  const M = JSON.parse(read(at('verification/legal-matrix.json')));
  const rev = read(at('docs/legal-review.md'));
  // The laws are the ### headings of the "Laws" section, one for one with the matrix.
  const part = rev.split('\n## Laws\n')[1].split('\n## ')[0];
  const heads = [...part.matchAll(/^### (.+)$/gm)].map((m) => m[1]);
  const keys = Object.keys(M.laws);
  ok('the matrix and the laws of docs/legal-review.md match one for one (' + heads.length + ' laws)',
    heads.length > 0 && heads.length === keys.length && heads.every((h) => keys.includes(h)),
    heads.filter((h) => !keys.includes(h)).concat(keys.filter((k) => !heads.includes(k))).join(' / '));
  // In every conjunction one element is denied by a sentence that exists word for word; every duty is met by one.
  const bad = [];
  let forms = 0, duties = 0;
  for (const [law, d] of Object.entries(M.laws)) {
    if (!(d.forms || []).length && !(d.duties || []).length) bad.push(law + ': no elements and no duties');
    for (const f of d.forms || []) {
      forms++;
      if (!f.elements.includes(f.denied)) bad.push(law + ': the denied element is not one of its elements (' + f.denied + ')');
      if (!(f.by || []).length) bad.push(law + ': nothing denies ' + f.denied);
      for (const b of f.by || []) if (!read(at(b.file)).includes(b.text)) bad.push(law + ': not in ' + b.file + ': ' + b.text);
    }
    for (const u of d.duties || []) {
      duties++;
      if (!(u.by || []).length) bad.push(law + ': nothing meets ' + u.duty);
      for (const b of u.by || []) if (!read(at(b.file)).includes(b.text)) bad.push(law + ': not in ' + b.file + ': ' + b.text);
    }
  }
  ok('in every conjunction an element is denied, and every duty is met, by a sentence in the policies (' + forms + ' conjunctions, ' + duties + ' duties)', bad.length === 0, bad.join(' / '));
  // Coverage: every pair of actor and act has a law, or a reason why it cannot occur.
  const holes = [];
  for (const a of M.actors) for (const v of M.acts) {
    const c = (M.coverage[a] || {})[v];
    if (Array.isArray(c)) { if (!c.length || c.some((h) => !keys.includes(h))) holes.push(a + ' × ' + v); }
    else if (!(c && typeof c['does not occur'] === 'string' && c['does not occur'].length)) holes.push(a + ' × ' + v);
  }
  const n = M.actors.length * M.acts.length;
  ok('every one of the ' + n + ' pairs of actor and act is covered, or cannot occur with a reason', holes.length === 0, holes.join(' / '));
  ok('docs/legal-review.md states the number of pairs', rev.includes('Every one of the ' + n + ' pairs'));
  // The risks: numbered from 1, likelihood and severity 1 to 3, product as multiplied, highest first.
  const rows = [...rev.split('\n## Risks that remain\n')[1].split('\n## ')[0].matchAll(/^\| (\d+) \| [^|]+ \| (\d) \| (\d) \| (\d) \|/gm)].map((m) => m.slice(1, 5).map(Number));
  ok('the table of risks has rows (' + rows.length + ')', rows.length >= 5);
  ok('the risks are numbered from 1, each likelihood and severity is 1 to 3, and each product is their product',
    rows.every(([k, l, v, x], i) => k === i + 1 && l >= 1 && l <= 3 && v >= 1 && v <= 3 && x === l * v),
    rows.filter(([k, l, v, x], i) => !(k === i + 1 && x === l * v)).map((r) => r.join(',')).join(' / '));
  ok('the risks are ranked by product, highest first', rows.every((r, i) => i === 0 || rows[i - 1][3] >= r[3]));
  ok('docs/legal-review.md says it is not legal advice and has not been reviewed by a lawyer',
    rev.includes('it is neither legal advice nor a guarantee, and it has not been reviewed by a lawyer.'));
}

console.log('\n64. The statutes and GitHub terms the legal review relies on are watched each week');
{
  const at = (f) => path.join(ROOT, f);
  const S = JSON.parse(read(at('verification/statutes.json')));
  const M = JSON.parse(read(at('verification/legal-matrix.json')));
  // Every Japanese law of the review is watched, and every article its heading names.
  const foreign = /GDPR|Digital Services Act|licences|services used/;
  const gaps = [];
  for (const h of Object.keys(M.laws).filter((k) => !foreign.test(k))) {
    const mine = S.statutes.filter((e) => e.law === h);
    if (!mine.length) { gaps.push(h + ': not watched'); continue; }
    const nums = [];
    for (const seg of h.matchAll(/Articles? ([^;)]+)/g)) {
      const r = /(\d+)-(\d+) to \1-(\d+)/.exec(seg[1]);
      if (r) for (let k = Number(r[2]); k <= Number(r[3]); k++) nums.push(r[1] + '_' + k);
      else for (const n of seg[1].matchAll(/\d+(?:-\d+)?/g)) nums.push(n[0].replace('-', '_'));
    }
    for (const n of nums) if (!mine.some((e) => e.article === n)) gaps.push(h + ': Article ' + n.replace('_', '-') + ' not watched');
  }
  ok('every Japanese law of docs/legal-review.md, and every article its heading names, is watched (' + S.statutes.length + ' articles)', gaps.length === 0, gaps.join(' / '));
  // An article that no law of the review names, but a section of a policy cites, names that section as "<file>: <heading>";
  // the section's line <!-- text: ... --> must quote that very article.
  const REG = JSON.parse(read(at('verification/citations.json')));
  const inSection = (e) => {
    const m = /^(policies\/[a-z]+\.md): (.+)$/.exec(e.law || '');
    if (!m || !fs.existsSync(at(m[1]))) return false;
    const md = read(at(m[1]));
    const i = md.indexOf('\n## ' + m[2] + '\n');
    if (i < 0) return false;
    const j = md.indexOf('\n## ', i + 4);
    const line = (/<!-- text: ([^>]*) -->/.exec(md.slice(i, j < 0 ? md.length : j)) || [])[1] || '';
    const L = Object.entries(REG.laws).find(([, v]) => v.egov === e.law_id);
    return !!L && line.split('; ').includes(L[0] + ' ' + e.article.replace(/_/g, '-'));
  };
  // e-Gov ids: an Act (AC), a Cabinet Order (CO) or a ministerial or commission rule (M).
  const unrec = S.statutes.filter((e) => !/^[0-9a-f]{64}$/.test(e.sha256 || '') || !e.title || !/^\d{3}(?:AC\d{10}|CO\d{10}|M\d{11})$/.test(e.law_id) || !(e.law in M.laws || inSection(e))).map((e) => e.name + ' ' + e.label);
  ok('every watched article has its e-Gov law id, its law title, the SHA-256 of its text, and a law of the review or the section of a policy that quotes it', unrec.length === 0, unrec.join(' / '));
  ok('the privacy statements of Vercel and Apple, which handle data for Sophaxis, are watched by the date of their last update',
    ['Vercel Privacy Notice', 'Apple Privacy Policy'].every((n) => (S.pages || []).some((p) => p.name === n)) && S.pages.every((p) => /^https:\/\//.test(p.url) && new RegExp(p.pattern).source.split('(').length === 2 && /^[A-Z][a-z]+ \d{1,2}, \d{4}$/.test(p.value || ''))
    && read(at('tools/statutes.js')).includes('for (const [i, e] of (CONF.pages || []).entries())'));
  ok('every watched GitHub term has its latest commit', S.policies.length >= 2 && S.policies.every((p) => /^[0-9a-f]{40}$/.test(p.commit || '')));
  const wf = read(at('.github/workflows/statutes.yml'));
  ok('the watch runs weekly, may open an issue, and also runs on a pull request', /cron: '\d+ \d+ \* \* \d'/.test(wf) && wf.includes('issues: write') && wf.includes('pull_request:') && wf.includes('node tools/statutes.js'));
}

console.log('\n65. The separate consent to the Internet Archive, the residence of the authors, the right to object and the clause-level duties');
{
  const I = require('../tools/intake.js');
  const W = require('../tools/watch.js');
  const B = require('../build.js');
  const R = require('../tools/removal.js');
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const form = read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'submission.yml'));
  const group = (id) => (new RegExp('id: ' + id + '\\n[\\s\\S]*?(?=\\n  - type:|$)').exec(form) || [''])[0];
  const arc = group('archive'), res = group('residence');
  ok('the Internet Archive has a box of its own, which the form does not require and the check does not count',
    arc.includes('label: Saving to the Internet Archive (optional)') && /required: false/.test(arc) && !/required: true/.test(arc) && arc.includes('may be left empty')
    && arc.includes('withdraw it at any time') && !('archive' in I.BOXES) && Object.values(I.BOXES).every((g) => g.every((b) => !/Internet Archive/.test(b[0]))));
  const listed = JSON.parse(read(path.join(__dirname, 'fixtures', 'papers', '2026.0001.json')));
  const off = Object.assign({}, listed, { archive: false });
  ok('a record without that consent is not saved, and robots.txt asks the Internet Archive not to collect it',
    W.savable([site.baseUrl + 'abs/' + listed.id + '.html', site.baseUrl + 'pdf/' + listed.id + 'v2.pdf', site.baseUrl + 'index.html'], [off]).join() === site.baseUrl + 'index.html'
    && W.savable([site.baseUrl + 'abs/' + listed.id + '.html'], [listed]).length === 1
    && B.robots([off]).includes('Disallow: /abs/' + listed.id + '\n') && !B.robots([listed]).includes('Disallow: /abs/' + listed.id + '\n')
    && B.validate(Object.assign({}, listed, { archive: true }), listed.id + '.json').some((e) => e.includes('archive')) && B.validate(off, listed.id + '.json').length === 0);
  ok('the draft record keeps the record out of the saves when the box is left empty, and only then',
    /'archive' in form && !\/\^- \\\[\[xX\]\\\] \/m\.test/.test(read(path.join(ROOT, 'tools', 'intake.js'))));
  ok('from ' + site.residenceFrom + ' the form names every place where Sophaxis is not offered, asks that no author lives in one, and the check needs the box',
    res.includes('label: Where the authors live') && res.includes('Required from ' + site.residenceFrom + '.') && res.includes('I confirm that no author of this work lives in any of the places listed above, or stays in one between the submission and the listing, even briefly (such as for travel, work or study).') && res.includes('I confirm that no author under 18 lives or stays in India.') && site.notOffered.length >= 23 && res.includes('who lives in any of these places, or who stays in one between the submission and the listing, even briefly (' + B.notOfferedPlaces() + ').')
    && site.residenceFrom === '2026-11-22' && read(path.join(ROOT, 'policies', 'submission.md')).includes('From ' + site.residenceFrom + ', Sophaxis does not list work by an author who lives in any of the ' + site.notOffered.length + ' places in the table below')
    && read(path.join(ROOT, 'policies', 'privacy.md')).includes('From ' + site.residenceFrom + ', Sophaxis does not offer its service to people in the European Union'));
  const ix = I.parseIssue(read(path.join(__dirname, 'fixtures', 'intake', 'issue.md')));
  const dc = I.fromDataCite(JSON.parse(read(path.join(__dirname, 'fixtures', 'intake', 'datacite.json'))));
  const person = I.orcidPerson(JSON.parse(read(path.join(__dirname, 'fixtures', 'intake', 'orcid-person.json'))));
  const works = I.orcidDois(JSON.parse(read(path.join(__dirname, 'fixtures', 'intake', 'orcid-works.json'))));
  const runR = (residence, today) => I.check({ form: Object.assign({}, ix, { llm_extent: site.llmExtents.assistance, consent: I.allTicked('consent') }, residence === null ? {} : { residence }), login: 'jcarberry', meta: dc, person, works, today });
  const rowR = (r) => r.checks.find((c) => c[0] === 'No author lives in a place where Sophaxis is not offered');
  ok('the residence box may be empty before the day and is needed from it',
    !rowR(runR(null, '2026-11-21')) && runR(null, '2026-11-21').ok && rowR(runR(null, '2026-11-22')) && !runR(null, '2026-11-22').ok && runR(I.allTicked('residence'), '2026-11-22').ok && !runR(I.allTicked('residence').replace('- [X] ', '- [ ] '), '2026-11-22').ok && !runR(I.allTicked('residence').split('\n')[0], '2026-11-22').ok);
  /* The right to object, presented separately (GDPR Article 21(4)), and the purposes, in every form a person fills in. */
  const OBJ = 'Anyone can object, at any time, to the use of their personal data on Sophaxis, on grounds of their own situation';
  const forms = ['submission', 'removal', 'withdrawal', 'published', 'correction'].map((f) => read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', f + '.yml')));
  ok('every form states the right to object and links the Privacy Policy, and the Privacy Policy gives the right a section of its own',
    forms.every((t) => t.includes(OBJ) && t.includes(site.baseUrl + 'policies/privacy.html')) && read(path.join(ROOT, 'policies', 'privacy.md')).includes('## The right to object\n\n' + OBJ + '.')
    && read(path.join(ROOT, 'policies', 'privacy.ja.md')).includes('## 異議を述べる権利') && I.coauthorNote().includes(OBJ));
  ok('the reasons for a notice are required in the removal form (DSA Article 16(2)(a))', /label: Where the problem is[\s\S]*?required: true/.test(forms[1]));
  /* Withdrawing consent to the Internet Archive: a kind of its own, not told to the authors, and carried out on the record. */
  const ac = R.KINDS['An author withdraws consent to saving in the Internet Archive'];
  const na = R.plan('no-archive', listed, '2026-11-12');
  ok('an author who withdraws consent to the Internet Archive stops the saves, with no review of reasons and without telling the other authors',
    ac && ac.slug === 'archive-consent' && !ac.removes && !ac.hold && !R.tellsAuthors(ac) && na.problems.length === 0 && na.record.archive === false && na.files.length === 0
    && !!R.plan('no-archive', na.record, '2026-11-12').skip && R.ack({ form: { id: listed.id, kind: ac }, record: listed, due: '2026-11-15' }).includes('needs no reasons and is not weighed')
    && R.decisionNote({ id: listed.id, decision: 'upheld', kind: ac, today: '2026-11-12', done: true }).includes('is no longer saved to the Internet Archive')
    && read(path.join(ROOT, '.github', 'workflows', 'removal.yml')).includes('options: [hold, release, remove, remove-pdf, no-archive]'));
  const dk = R.KINDS['A request about my personal data (access, correction, restriction, objection, deletion, stopping its provision to others, a copy)'];
  const notes = [R.decisionNote({ id: listed.id, decision: 'upheld', kind: R.KINDS['Exposure of personal data'], today: '2026-11-12', done: true }),
    R.decisionNote({ id: listed.id, decision: 'not-upheld', kind: dk, today: '2026-11-12' }), R.decisionNote({ id: listed.id, decision: 'upheld', kind: R.KINDS['Copyright infringement'], today: '2026-11-12', done: true })];
  ok('every decision says whether an automatic step took part, names the law relied on where one is named, and names courts and certified bodies (DSA Articles 16(5), 16(6), 17(3))',
    notes[0].includes('An automatic step took the record page offline') && notes[1].includes('No automatic step took part') && notes[2].includes('No automatic step took part')
    && notes.every((t) => t.includes('the grounds name the law relied on') && t.includes('certified under Article 21 of the Digital Services Act'))
    && notes[2].includes('The removal applies wherever the site is read, and it is permanent.'));
  ok('a decision on a request about personal data names the authorities and the courts, and its acknowledgement the one-month limit (GDPR Article 12)',
    notes[1].includes(R.DATA_REMEDY) && !notes[2].includes(R.DATA_REMEDY) && R.ack({ form: { id: listed.id, kind: dk }, record: listed, due: '2026-11-15' }).includes('within one month at the latest'));
  const src = read(path.join(ROOT, 'tools', 'removal.js'));
  const dec = src.slice(src.indexOf('async function decide()'), src.indexOf('async function manual()'));
  ok('a request not upheld is answered before the material goes back (GDPR Article 18(3))', dec.indexOf('decisionNote({ id: form.id, decision, kind: form.kind, today: day, restored: willRestore })') > 0
    && dec.indexOf('decisionNote({ id: form.id, decision, kind: form.kind, today: day, restored: willRestore })') < dec.indexOf('restore(form.id)'));
  const ed = R.emailDecision({ id: listed.id, action: 'remove', grounds: 'The grounds.', today: '2026-11-12' });
  const man = src.slice(src.indexOf('async function manual()'), src.indexOf('async function remind()'));
  ok('a decision on a request sent by email cannot be run without its grounds, which reach the authors in their submission issue before it is emptied (DSA Article 17(4))',
    ed.startsWith(R.NOTICE) && ed.includes('Grounds: The grounds.') && ed.includes(R.CHALLENGE_EMAIL) && ed.includes('No automatic step took part')
    && man.includes("throw new Error('give the grounds of the decision, without personal data')") && man.indexOf('emailDecision(') > 0 && man.indexOf('emailDecision(') < man.indexOf('write(change)') && man.indexOf('write(change)') < man.indexOf('erase(record)')
    && read(path.join(ROOT, '.github', 'workflows', 'removal.yml')).includes('GROUNDS: ${{ inputs.grounds }}'));
  const tk = read(path.join(ROOT, 'policies', 'takedown.md'));
  ok('the Takedown Policy reports suspicions of serious crime, acknowledges email notices, asks good faith by email, and states the position on Article 13',
    tk.includes('Suspicions of serious crime (Article 18)') && tk.includes('the operator tells Europol.') && tk.includes('a notice by email is acknowledged by the operator by email, without undue delay.')
    && tk.includes('believes in good faith that what it says is accurate and complete') && tk.includes('Sophaxis does not meet Article 13'));
  const pv = read(path.join(ROOT, 'policies', 'privacy.md'));
  ok('the Privacy Policy no longer relies on the exception for occasional processing, and says what follows if its view is wrong',
    !pv.includes('Article 27(2)(a) applies') && pv.includes('Sophaxis does not meet Article 27') && !read(path.join(ROOT, 'docs', 'records-of-processing.md')).includes('Article 27(2)(a) applies')
    && !read(path.join(ROOT, 'policies', 'privacy.ja.md')).includes('第 27 条第 2 項 a の例外にも当たる'));
}

console.log('\n66. Every duty of the cited articles, clause by clause, is met by a sentence, open and listed, or shown not to apply');
{
  const T = JSON.parse(read(path.join(__dirname, 'duties.json'))).duties;
  const bad = [];
  for (const u of T) {
    const name = u.law + ' ' + u.article;
    if (!u.duty) bad.push(name + ': no duty');
    if (u.applies === false) { if (!u.reason) bad.push(name + ': no reason why it does not apply'); continue; }
    if (u.status === 'open') { if (!u.open) bad.push(name + ': open without saying what is missing'); continue; }
    if (u.status !== 'met' || !(u.by || []).length) { bad.push(name + ': neither met, open nor not applying'); continue; }
    for (const b of u.by) if (!read(path.join(ROOT, b.file)).includes(b.text)) bad.push(name + ': not in ' + b.file + ': ' + b.text.slice(0, 60));
  }
  const met = T.filter((u) => u.status === 'met').length, open = T.filter((u) => u.status === 'open'), na = T.filter((u) => u.applies === false).length;
  ok('every duty in verification/duties.json (' + T.length + ') is met word for word, open with what is missing, or not applying with its reason', T.length >= 150 && bad.length === 0, bad.join(' / '));
  const rv = read(path.join(ROOT, 'docs', 'legal-review.md'));
  ok('the legal review gives the counts (' + T.length + ' duties: ' + met + ' met, ' + na + ' not applying, ' + open.length + ' open) and lists every open duty',
    rv.includes(T.length + ' duties: ' + met + ' met, ' + na + ' that do not apply, and ' + open.length + ' open.') && open.every((u) => rv.includes('- ' + u.law + ' ' + u.article + ': ' + u.open)));
  ok('the three laws read clause by clause are the GDPR, the Digital Services Act and the APPI with its Order and Rules', ['GDPR', 'DSA', 'APPI'].every((l) => T.some((u) => u.law === l)) && T.every((u) => ['GDPR', 'DSA', 'APPI'].includes(u.law)));
}

console.log('\n67. The watch proposes a pull request; the label `record` merges it after the checks; the live site is compared; removals are followed up');
{
  const St = require('../tools/statutes.js');
  const Rc = require('../tools/record.js');
  const Lv = require('../tools/live.js');
  const R = require('../tools/removal.js');
  const S = JSON.parse(read(path.join(__dirname, 'statutes.json')));
  ok('a changed article is shown as a difference of its sentences', St.diff('第一条 A。第二条 B。', '第一条 A。第二条 C。第三条 D。') === '  第一条 A。\n- 第二条 B。\n+ 第二条 C。\n+ 第三条 D。');
  const res = [{ kind: 'statute', i: 0, label: 'X 1', state: 'changed', value: 'h2', title: 'T', text: '甲。乙。' }, { kind: 'statute', i: 1, label: 'X 2', state: 'same', text: '丙。' },
    { kind: 'policy', i: 0, label: 'P', state: 'changed', value: 'c2', note: 'https://github.com/o/r/compare/c1...c2' }, { kind: 'page', i: 0, label: 'G', state: 'same' }];
  const conf = { statutes: [{ sha256: 'h1', title: 'T' }, { sha256: 'h', title: 'T' }], policies: [{ commit: 'c1' }], pages: [{ value: 'June 1, 2026' }], recorded: '2026-11-08' };
  const pr = St.proposal(res, conf, { 'X 1': '甲。', 'X 2': '丙。' }, '2026-11-20');
  ok('the proposal records the new values and texts, dates them, and shows each change; nothing new proposes nothing',
    pr.changed === 2 && pr.conf.statutes[0].sha256 === 'h2' && pr.conf.policies[0].commit === 'c2' && pr.conf.recorded === '2026-11-20' && pr.texts['X 1'] === '甲。乙。'
    && pr.body.includes('```diff\n  甲。\n+ 乙。\n```') && pr.body.includes('compare/c1...c2') && pr.body.includes('add the label `record`') && conf.statutes[0].sha256 === 'h1'
    && St.proposal(res.map((r) => Object.assign({}, r, { state: 'same' })), conf, { 'X 1': '甲。乙。', 'X 2': '丙。' }, '2026-11-20') === null);
  const seed = St.proposal([res[1]], conf, {}, '2026-11-20');
  ok('texts that match but are not stored yet are stored without changing any value', seed && seed.changed === 0 && seed.texts['X 2'] === '丙。' && seed.conf.recorded === '2026-11-08');
  ok('the changelog line goes under today, as a new date when needed, with (#PR) for the number',
    St.withChangelog('# C\n\n## 2026-11-08\n\n- a\n', '2026-11-08', '- b (#PR).') === '# C\n\n## 2026-11-08\n\n- b (#PR).\n- a\n'
    && St.withChangelog('# C\n\n## 2026-11-08\n\n- a\n', '2026-11-20', '- b (#PR).') === '# C\n\n## 2026-11-20\n\n- b (#PR).\n\n## 2026-11-08\n\n- a\n'
    && S.changelog.line.endsWith('(#PR).') && S.changelog.seedLine.endsWith('(#PR).') && Rc.fillNumber(S.changelog.line, 150).endsWith('(#150).')
    && read(path.join(ROOT, 'tools', 'statutes.js')).includes('p.changed ? CONF.changelog.line : CONF.changelog.seedLine'));
  ok('the label `record` merges only the watch\'s branch and only the files it writes, titles the merge as GitHub does here, and names the workflow as co-author',
    Rc.allowed('statutes/record', ['verification/statutes.json', 'verification/statutes-texts.json', 'CHANGELOG.md']) && !Rc.allowed('statutes/record', ['verification/statutes.json', 'tools/statutes.js'])
    && !Rc.allowed('other', ['verification/statutes.json']) && !Rc.allowed('statutes/record', []) && Rc.mergeTitle(150, 'Record') === 'Record (#150)'
    && read(path.join(ROOT, 'tools', 'record.js')).includes("Co-authored-by: ' + BOT") && read(path.join(ROOT, 'tools', 'record.js')).indexOf("['node', 'verification/check.js']") < read(path.join(ROOT, 'tools', 'record.js')).indexOf("git('push', '-q', 'origin', 'HEAD:main')"));
  const sj = read(path.join(ROOT, 'tools', 'statutes.js'));
  ok('where workflows may not open pull requests, the proposal is an issue with a link that opens it, and recording closes that issue',
    sj.includes("if (!/HTTP 403/.test(e.message)) throw e;") && sj.includes("'/compare/main...' + BRANCH + '?expand=1'") && S.text.openPr.includes('{link}') && S.text.openPr.includes('add the label `record`')
    && St.PROPOSAL === '<!-- statutes-proposal -->' && read(path.join(ROOT, 'tools', 'record.js')).includes("startsWith('<!-- statutes-proposal -->')"));
  const rw = read(path.join(ROOT, '.github', 'workflows', 'record.yml'));
  ok('the record workflow acts only on the owner\'s label on the watch\'s own branch, one change to main at a time',
    rw.includes("github.event.label.name == 'record'") && rw.includes('github.event.sender.login == github.repository_owner') && rw.includes("github.event.pull_request.head.ref == 'statutes/record'")
    && rw.includes('github.event.pull_request.head.repo.full_name == github.repository') && rw.includes('group: removal') && read(path.join(ROOT, '.github', 'workflows', 'statutes.yml')).includes('pull-requests: write'));
  const files = Lv.served(fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => fs.statSync(path.join(ROOT, 'site', f)).isFile()).map((f) => f.split(path.sep).join('/')));
  ok('the live check fetches every file of site/ but the Vercel configuration and the functions (' + files.length + ' files)',
    files.length > 50 && files.every((x) => x.url.startsWith('https://sophaxis.vercel.app/')) && !files.some((x) => x.file === 'vercel.json' || x.file.startsWith('api/'))
    && files.find((x) => x.file === 'index.html').url === 'https://sophaxis.vercel.app/' && read(path.join(ROOT, '.github', 'workflows', 'live.yml')).includes("WAIT: ${{ github.event_name == 'push' && '600' || '0' }}"));
  const fb = R.followUpBody({ id: '2026.0009', issues: [3, 12], today: '2026-11-20' });
  const st = R.followUpState(fb);
  ok('a removal opens a follow-up that carries its state, the three things left by hand, and the request to the Internet Archive',
    st.id === '2026.0009' && st.issues.join() === '3,12' && fb.includes('info@archive.org') && fb.includes('https://sophaxis.vercel.app/abs/2026.0009.html') && fb.includes('pdf/2026.0009v')
    && fb.includes('"Delete issue"') && fb.includes('GitHub Support helps only with sensitive data') && R.followUpState('no') === null);
  ok('a box ticked by hand counts, the ticks are written back, and the Wayback Machine is asked for the page and every PDF copy',
    R.tickedByHand(fb.replace('- [ ] GitHub has been asked', '- [x] GitHub has been asked')).github && !R.tickedByHand(fb).github
    && R.followUpBody({ id: '2026.0009', issues: [3], today: '2026-11-20', done: { issues: true, archive: true } }).includes('- [x] The emptied issues are deleted')
    && R.archived('2026.0009').map(R.cdxUrl).join() === 'https://web.archive.org/cdx/search/cdx?output=json&limit=1&url=sophaxis.vercel.app%2Fabs%2F2026.0009.html,https://web.archive.org/cdx/search/cdx?output=json&limit=1&url=sophaxis.vercel.app%2Fpdf%2F2026.0009v&matchType=prefix');
  const rm = read(path.join(ROOT, 'tools', 'removal.js'));
  ok('every way of removing a record opens the follow-up, and the daily step works through them',
    (rm.match(/await openFollowUp\(/g) || []).length === 3 && rm.includes('  await followUps();'));
}

console.log('\n68. Who Sophaxis is not offered to, and why, at the top: by residence, not nationality or race, because of the representative');
{
  const B = require('../build.js');
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const N = 'This depends only on where an author lives or stays, not on nationality, race, ethnic origin or any other personal characteristic';
  const notice = B.scopeNotice();
  const idx = read(path.join(ROOT, 'site', 'index.html')), sub = read(path.join(ROOT, 'site', 'submit.html'));
  ok('the notice says who is not served, that it is by residence and not nationality or race, and that the reason is the representative (GDPR Article 27, DSA Article 13)',
    notice.includes('<b>Not offered in ' + site.notOffered.length + ' places.</b>') && notice.includes('The places are ' + B.notOfferedPlaces() + '.') && site.notOffered.every((p) => notice.includes(p.place))
    && site.scopeNotice.includes('Article 53 of China\'s Personal Information Protection Law') && site.scopeNotice.includes('section 37(5) of Thailand\'s Personal Data Protection Act') && site.scopeNotice.includes('Article 18(5) of Russia\'s Federal Law No. 152-FZ') && site.scopeNotice.includes(N) && site.scopeNotice.includes('an author of any nationality who lives elsewhere and does not stay there can submit') && site.scopeNotice.includes('or who stays in one between the submission and the listing, even briefly')
    && site.scopeNotice.includes('Article 27 of the GDPR and of the UK GDPR') && site.scopeNotice.includes('Article 13 of the EU Digital Services Act'));
  ok('the notice stands first on the top page and the submit page, before any other notice',
    idx.indexOf(notice) > 0 && idx.indexOf(notice) < idx.indexOf('Change to the policies from') && idx.indexOf('<h1>') < idx.indexOf(notice) && sub.indexOf(notice) > sub.indexOf('<h1>Submit a preprint</h1>'));
  const sp = read(path.join(ROOT, 'policies', 'submission.md')), sj = read(path.join(ROOT, 'policies', 'submission.ja.md'));
  ok('the Submission Policy, both languages, the README and the form say the same, and that the confirmation is relied on and an untrue one leads to removal',
    sp.includes('This rule depends only on where an author lives or stays, not on nationality, race, ethnic origin or any other personal characteristic.') && sp.includes('Sophaxis relies on the submitter\'s confirmation and does not check where authors live or stay.')
    && sp.includes('A stay counts even if it is short, such as for travel, work or study.') && sj.includes('滞在には、旅行・出張・留学のような短いものも含みます。')
    && sp.includes('Article 3(2) of the GDPR, for example, speaks of data subjects who are in the Union.') && sp.includes('the record is removed under the [Takedown Policy]')
    && sj.includes('国籍・人種・民族その他の個人の属性によるものではありません。') && sj.includes('Sophaxis は投稿者の確認に拠り、著者がどこに住んでいるか、どこに滞在しているかは調べません。')
    && read(path.join(ROOT, 'README.md')).includes('not on nationality, race or ethnic origin') && read(path.join(ROOT, 'README.md')).includes('国籍・人種・民族によるものではありません')
    && read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'submission.yml')).includes('not on nationality or race'));
}

console.log('\n69. The laws of other countries, read at their sources; the rule on representatives');
{
  const rv = read(path.join(ROOT, 'docs', 'legal-review.md'));
  const sec = rv.slice(rv.indexOf('## Laws of other countries'), rv.indexOf('## Consistency'));
  ok('the legal review names each foreign law read and what decides whether it applies, the four left open in #153 among them, and how India\'s duty is met',
    ['16 CFR 312', 'California Consumer Privacy Act', '17 U.S.C. 512(c)', 'Online Safety Act 2023', 'Directive 2019/790', 'Federal Act on Data Protection', 'CD/ANPD No. 2', 'Law No. 13.709, Articles 3, 4 and 41', 'Articles 3 and 53', 'Law No. 6698'].every((x) => sec.includes(x))
    && ['sections 5, 37(5) and 38', 'Implementing Regulation (SDAIA)', 'G.S.R. 846(E)', 'Article 31-2(1)', 'Article 32-3 (Presidential Decree No. 36671'].every((x) => sec.includes(x))
    && sec.includes('The four laws that #153 left open were read at their sources on 2026-11-08') && !sec.includes('could not be fetched from planalto.gov.br') && !sec.includes('Each is open until it is read.')
    && sec.includes('One duty found in them is met by not offering. From 2027-05-13, Rule 10 of India\'s Digital Personal Data Protection Rules')
    && sec.includes('so from 2026-11-22 it does not list work by an author under 18 who lives in India.') && rv.includes('the rule on India follows.')
    && read(path.join(ROOT, 'policies', 'submission.md')).includes('From 2026-11-22, Sophaxis does not list work by an author under 18 who lives or stays in India.')
    && read(path.join(ROOT, 'policies', 'submission.ja.md')).includes('2026-11-22 から、著者のだれかがインドに住むか滞在している 18 歳未満の人である作品は載せません。'));
  const sp = read(path.join(ROOT, 'policies', 'submission.md'));
  ok('the rule is stated, a place is added on a reported duty and taken off only after its law is read, and each change is announced',
    sp.includes('The rule is that Sophaxis is not offered where a law requires, or is reported to require, a service offered to people there to have a representative there, to keep personal data there, to register there, or to meet conditions before personal data leaves the place that Sophaxis cannot meet.') && sp.includes('Article 53 of China\'s Personal Information Protection Law')
    && sp.includes('A place is added to the list as soon as such a duty is reported, before its law has been read at its source, and it is taken off only after that law has been read at its source and found not to reach Sophaxis.')
    && sp.includes('Each change to the list is announced on the top page before it takes effect') && read(path.join(ROOT, 'policies', 'privacy.md')).includes('## People in China')
    && read(path.join(ROOT, 'policies', 'privacy.ja.md')).includes('## 中国の人へ') && sp.includes('section 37(5) of Thailand\'s Personal Data Protection Act')
    && read(path.join(ROOT, 'policies', 'privacy.md')).includes('## People in Thailand') && read(path.join(ROOT, 'policies', 'privacy.ja.md')).includes('## タイの人へ')
    && read(path.join(ROOT, 'policies', 'privacy.md')).includes('## People in the other places') && read(path.join(ROOT, 'policies', 'privacy.ja.md')).includes('## ほかの国と地域の人へ'));
  /* The list of places is kept once, in site.json; the policies, the README and the legal review must agree with it, counts included. */
  const L = JSON.parse(read(path.join(ROOT, 'site.json'))).notOffered;
  const cap = (t) => t[0].toUpperCase() + t.slice(1);
  const readEn = (r) => r === true ? 'Yes' : r === 'in part' ? 'In part' : r === 'not fetched' ? 'No, not fetched' : 'No, as reported', readJa = (r) => r === true ? '読んだ' : r === 'in part' ? '一部' : r === 'not fetched' ? '取り寄せられない' : 'まだ（報告による）';
  const fromOf = (p) => p.from || '2026-11-22';
  const sj = read(path.join(ROOT, 'policies', 'submission.ja.md')), readme = read(path.join(ROOT, 'README.md'));
  const rowsEn = sp.split('\n').filter((l) => /^\| (?!Place |---)/.test(l)), rowsJa = sj.split('\n').filter((l) => /^\| (?!国と地域 |---)/.test(l));
  ok('the Submission Policy, in both languages, has one row for each of the ' + L.length + ' places in site.json, with its law and whether it was read, and gives the count',
    rowsEn.length === L.length && rowsJa.length === L.length && L.every((p, i) => rowsEn[i].startsWith('| ' + cap(p.place) + ' | ') && rowsEn[i].endsWith(' | ' + p.law + ' | ' + readEn(p.read) + ' | ' + fromOf(p) + ' |')
      && rowsJa[i].startsWith('| ' + p.ja + ' | ') && rowsJa[i].endsWith(' | ' + p.lawJa + ' | ' + readJa(p.read) + ' | ' + fromOf(p) + ' |'))
    && sp.includes('who lives in any of the ' + L.length + ' places in the table below, or who stays in one between the submission and the listing') && sj.includes('2026-11-22 から、著者のだれかが下の表の ' + L.length + ' の国と地域に住んでいるか、投稿から掲載までのあいだにそこに滞在している作品は載せません。')
    && readme.includes('**Not offered in ' + L.length + ' places**') && readme.includes('- 2026-11-22 から、著者のだれかが、Sophaxis を提供しない ' + L.length + ' の国と地域に住んでいるか、投稿から掲載までのあいだにそこに滞在している作品は載せません。旅行・出張・留学のような短い滞在も含みます。'));
  const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'];
  // The places of 2026-11-26, from the survey of the laws of 195 countries, are held by check 115.
  const reported = L.filter((p) => p.read !== true && !p.from);
  const rsec = rv.slice(rv.indexOf('### Places not offered on a reported duty'), rv.indexOf('### Read at their sources after the screening'));
  const rrows = rsec.split('\n').filter((l) => /^\| (?!Place |---)/.test(l));
  /* Places of the screening read at their sources since: they leave the table above, stay on the list, and still count among the places added. */
  const asec = rv.slice(rv.indexOf('### Read at their sources after the screening'), rv.indexOf('## Consistency'));
  const arows = asec.split('\n').filter((l) => /^\| (?!Place |---)/.test(l));
  const readAfter = arows.map((r) => L.find((p) => r.startsWith('| ' + cap(p.place) + ' | ')));
  ok('the legal review lists each of the ' + reported.length + ' places not read at its source and the ' + arows.length + ' read since, says how many were added in each step, and that every country has been screened',
    rrows.length === reported.length && reported.every((p, i) => rrows[i].startsWith('| ' + cap(p.place) + ' | ')) && rv.includes(WORDS[18] + ' places were added, from 2026-11-22.') && rv.includes(WORDS[4] + ' more places were added, from 2026-11-22.') && rv.includes(WORDS[1] + ' more place was added on it, from 2026-11-22: Quebec.') && 18 + 4 + 1 === reported.length + arows.length
    && arows.length > 0 && readAfter.every((p) => p && p.read === true) && rsec.indexOf('### ') === 0 && rsec.lastIndexOf('### ') === 0
    && asec.includes('No law read was found not to reach Sophaxis, so no place is taken off the list.')
    && rsec.includes('Every country has now been screened, in commentaries if not at the source of its law.') && !rsec.includes('Each is open until it is screened.') && rv.includes('Commentators report that a controller abroad must register in the Data Controllers\' Registry through a representative in Türkiye'));
  ok('the Takedown Policy says that Sophaxis does not rely on 17 U.S.C. 512, and the Privacy Policy names the Swiss Commissioner',
    read(path.join(ROOT, 'policies', 'takedown.md')).includes('so it does not rely on the limitation of liability in 17 U.S.C. 512') && read(path.join(ROOT, 'policies', 'privacy.md')).includes('Federal Data Protection and Information Commissioner'));
}

console.log('\n70. A possible domain and NGO at 1,000 listed works: a possibility only, with no money asked and nothing decided');
{
  const rd = read(path.join(ROOT, 'README.md'));
  const n = loadPapers(path.join(ROOT, 'data', 'papers')).papers.filter((p) => p.status !== 'removed').length;
  ok('the README says, in both languages, that a domain and an international NGO may be considered at 1,000 listed works, after preparation',
    rd.includes('If the number of listed works reaches 1,000, the operator may, after preparation, consider giving Sophaxis a domain of its own and running it through an international non-governmental organisation (NGO).')
    && rd.includes('収録が 1,000 件に達したら、運営者は、準備を経て、Sophaxis に独自のドメインを取ることと、国際的な非政府組織（NGO）として運営することを検討する可能性があります。'));
  ok('it says it is not a plan or a promise, that no such organisation exists, and that no money, donations or members are asked for',
    rd.includes('This is a possibility, not a plan or a promise: nothing has been decided, no such organisation exists, and Sophaxis does not ask for or accept money, donations or members for it.')
    && rd.includes('これは可能性であり、計画でも約束でもありません。まだ何も決まっておらず、そのための団体もありません。') && rd.includes('Sophaxis は、そのための資金・寄付・会員を求めず、受け取りません。'));
  ok('any step is taken only within the law and announced before it takes effect', rd.includes('Any such step would be taken only within the law and announced on the top page before it takes effect.')
    && rd.includes('こうした変更は法令の範囲でだけ行い、効力が始まる前にトップの頁で告知します。'));
  ok('the number of listed works (' + n + ') is below 1,000, so the statement is still a condition, not a fact', n < 1000);
  ok('nothing in the README or the site says that a domain is planned or names one', !/sophaxis\.org|domain[^.\n]*\bplanned\b|ドメイン[^。\n]*予定/.test(rd)
    && rd.includes('Sophaxis has no domain of its own; when one might be considered is said under [Operator and contact](#operator-and-contact).')
    && !fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => /\.(html|txt)$/.test(f)).some((f) => /sophaxis\.org/.test(read(path.join(ROOT, 'site', f)))));
}

console.log('\n71. Provisional registration before a decision; language models assist the review, and a person decides');
{
  const me = read(path.join(ROOT, 'policies', 'moderation.md')), mj = read(path.join(ROOT, 'policies', 'moderation.ja.md'));
  const pe = read(path.join(ROOT, 'policies', 'privacy.md')), pj = read(path.join(ROOT, 'policies', 'privacy.ja.md'));
  const form = read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'submission.yml'));
  ok('the Moderation Policy, in both languages, has provisional registration: labelled verified, not on the site, not acceptance',
    me.includes('## Provisional registration') && me.includes('A provisionally registered work is not on the site.') && me.includes('Provisional registration is not acceptance.')
    && mj.includes('## 仮登録') && mj.includes('仮登録の作品は、サイトに載りません。') && mj.includes('仮登録は受理ではありません。')
    && read(path.join(ROOT, 'site', 'policies', 'moderation.html')).includes('Provisional registration'));
  ok('it names the three language models, says the operator gives them only public parts by hand, and that a person decides',
    ['Claude (Anthropic)', 'ChatGPT (OpenAI)', 'Grok (xAI)'].every((m) => me.includes(m)) && ['Claude（Anthropic）', 'ChatGPT（OpenAI）', 'Grok（xAI）'].every((m) => mj.includes(m))
    && me.includes('No model accepts or declines a submission; every decision is taken by the operator, or by a moderator, who reads the submission.')
    && mj.includes('言語モデルが投稿を受理したり断ったりすることはなく、判断はすべて、投稿を読んだ運営者かモデレーターが下します。')
    && me.includes('no submission is sent to them automatically, and they are given nothing that is not already public.') && mj.includes('投稿を自動で送ることはなく、公開されていないものは渡しません。'));
  ok('the Privacy Policy, in both languages, lists Anthropic, OpenAI and xAI among the services outside Japan, and the form asks consent to it',
    pe.includes('Anthropic, OpenAI and xAI (all United States) receive, while a submission is reviewed, its public parts') && pj.includes('- Anthropic・OpenAI・xAI（いずれも米国）：審査を助けるため。')
    && pj.includes('審査のあいだ投稿の公開されている部分が Anthropic・OpenAI・xAI に渡ることを') && pe.includes('The language models that help the review make no decision;')
    && form.includes('to the public parts of this submission being given, for help with the review, to Anthropic, OpenAI and xAI in the United States'));
  ok('the comment on a verified submission says it is provisionally registered and not on the site until a moderator accepts it',
    read(path.join(ROOT, 'tools', 'intake.js')).includes('The submission is now provisionally registered: it is not on the site until a moderator accepts it.'));
}

console.log('\n72. An untrue confirmation: not allowed, the record removed, relied on in good faith, and no penalty');
{
  const te = read(path.join(ROOT, 'policies', 'terms.md')), tj = read(path.join(ROOT, 'policies', 'terms.ja.md'));
  ok('the Terms, in both languages, forbid an untrue confirmation and say what follows',
    te.includes('- Confirming in a form something that is not true, such as where the authors live') && tj.includes('- 様式で、事実でないことを確かめること。')
    && te.includes('If a confirmation turns out to be untrue, the operator removes the record under the [Takedown Policy](./takedown.md) as soon as the operator learns of it.')
    && tj.includes('確認が事実でないと分かったときは、運営者は、知った時点で[削除の規程](./takedown.ja.md)に沿って記録を削除します。')
    && te.includes('From 2026-11-22, the operator may also decline further submissions from the same GitHub account or ORCID iD.') && tj.includes('2026-11-22 からは、同じ GitHub アカウントや ORCID iD からのその後の投稿を断ることもあります。'));
  ok('the operator relies on the confirmations in good faith, keeps them public, and asks no penalty (Consumer Contract Act Articles 9 and 10)',
    te.includes('The operator relies on the confirmations in good faith and does not check them.') && tj.includes('運営者は、確認を信頼して受け、確かめません。')
    && te.includes('The confirmations stay in the public issue') && tj.includes('確認は公開の issue に残るので')
    && te.includes('Nothing here asks a submitter for a penalty, or for damages beyond what the law provides.') && tj.includes('投稿者に、違約金や、法令が定める以上の損害の賠償を求めることはありません。'));
  ok('the change is announced on the top page before it takes effect', JSON.parse(read(path.join(ROOT, 'site.json'))).termsNotice.text.includes('Confirming something untrue in a form is not allowed'));
}

console.log('\n73. Moderation looks for what would make an untrue confirmation knowable: an address in a place not served, and a notice of rights against the licence');
{
  const me = read(path.join(ROOT, 'policies', 'moderation.md')), mj = read(path.join(ROOT, 'policies', 'moderation.ja.md'));
  ok('the Moderation Policy, in both languages, checks for an affiliation or address in a place where Sophaxis is not offered, and asks before deciding',
    me.includes('- The work shows no affiliation or address of an author in a place where Sophaxis is not offered') && me.includes('the moderator asks the submitter where that author lives and whether they have stayed there since the submission, and declines the submission unless the author lives elsewhere and has not stayed there.')
    && mj.includes('Sophaxis を提供しない国と地域の、著者の所属や住所が書かれていない。') && mj.includes('ほかの場所に住み、そこに滞在していないのでなければ断る。'));
  ok('it declines a PDF with a notice of rights that contradicts its licence, and names both as reasons for declining',
    me.includes('- The PDF carries no notice of rights that contradicts the licence in the DOI metadata') && mj.includes('- PDF に、DOI の登録情報のライセンスと食い違う権利の表示')
    && me.includes('- Where the authors live or stay: an author lives in a place where Sophaxis is not offered, or stayed in one between the submission and the listing.') && mj.includes('- 住んでいる場所と滞在した場所：著者のだれかが、Sophaxis を提供しない国と地域に住んでいるか、投稿から掲載までのあいだにそこに滞在した。'));
}

console.log('\n74. llms.txt and llms-full.txt: the facts and every policy, for language models');
{
  const B = require('../build.js');
  const SITEJ = JSON.parse(read(path.join(ROOT, 'site.json')));
  const lt = read(path.join(ROOT, 'site', 'llms.txt')), lf = read(path.join(ROOT, 'site', 'llms-full.txt'));
  const shown = loadPapers(path.join(ROOT, 'data', 'papers')).papers.filter((p) => p.status !== 'removed').length;
  const links = [...lt.matchAll(/\]\((https:\/\/sophaxis\.vercel\.app\/[^)?]*)/g)].map((m) => m[1].replace(SITEJ.baseUrl, ''));
  const missing = links.filter((u) => u !== 'oai' && !fs.existsSync(path.join(ROOT, 'site', u)));
  ok('llms.txt is in the llms.txt form: a title, a summary, and sections of links, and says that the policies apply where it differs',
    lt.startsWith('# ' + SITEJ.name + '\n\n> ') && lt.includes('Acceptance is moderation, not peer review.') && lt.includes('Sophaxis charges nothing, to authors or to readers.')
    && lt.includes('Where this file and a policy differ, the policy applies.') && ['## Facts', '## Policies', '## Other pages', '## Japanese', '## Data'].every((h) => lt.includes('\n' + h + '\n')));
  ok('every page and policy it links is built, and it links every policy, every Japanese page and llms-full.txt', missing.length === 0 && links.length >= 20
    && B.llmsSources().every(([, url]) => links.includes(url)) && links.includes('llms-full.txt'), missing.join(', '));
  ok('its counts are the counts of the records and of site.json (' + shown + ' shown, ' + SITEJ.notOffered.length + ' places, ' + new Set(Object.values(SITEJ.repositories)).size + ' repositories)',
    lt.includes('- Records shown: ' + shown + ' ') && lt.includes('- Not offered in ' + SITEJ.notOffered.length + ' places: ') && lt.includes('- Accepted repositories (' + new Set(Object.values(SITEJ.repositories)).size + '): ')
    && lt.includes('or stays in one between the submission and the listing, even briefly') && (!SITEJ.termsNotice || lt.includes(SITEJ.termsNotice.text)));
  ok('it gives no email address: requests go through the ORCID record', !/[\w.+-]+@[\w-]+\.[\w.]+/.test(lt) && !/[\w.+-]+@[\w-]+\.[\w.]+/.test(lf.replace(/noreply@[\w.]+/g, '')) && lt.includes('the address on that ORCID record'));
  ok('llms-full.txt holds each policy and page word for word, with the address it is built into (' + B.llmsSources().length + ' parts)',
    B.llmsSources().every(([src, url]) => lf.includes('Source: ' + SITEJ.baseUrl + url + '\n\n' + B.absoluteLinks(read(path.join(ROOT, src)).trim(), src, url) + '\n')) && (lf.match(/^Source: /gm) || []).length === B.llmsSources().length);
  ok('in llms-full.txt every link of a source leads to the site or to GitHub by its full address, none to a Markdown file',
    !/\]\(\.{1,2}\//.test(lf.replace(/\]\(\.\/templates\/paper\.(md|tex)\)/g, '')) && lf.includes('](' + SITEJ.baseUrl + 'policies/terms.html#disputes)'));
  const vj = JSON.parse(read(path.join(ROOT, 'site', 'vercel.json')));
  ok('both are served as UTF-8 text, and robots.txt lets every crawler read them', vj.headers.some((h) => h.source === '/(llms|llms-full)\\.txt' && h.headers.some((x) => x.key === 'Content-Type' && x.value === 'text/plain; charset=utf-8'))
    && read(path.join(ROOT, 'site', 'robots.txt')).startsWith('User-agent: *\nAllow: /\n'));
  ok('the README says, in both languages, what the two files are', read(path.join(ROOT, 'README.md')).includes('`llms.txt`') && read(path.join(ROOT, 'README.md')).includes('言語モデル'));
}

console.log('\n75. GitHub and Vercel: what their own terms provide, read at their sources, with dates and sections');
{
  const te = read(path.join(ROOT, 'policies', 'terms.md')), tj = read(path.join(ROOT, 'policies', 'terms.ja.md'));
  const pe = read(path.join(ROOT, 'policies', 'privacy.md')), pj = read(path.join(ROOT, 'policies', 'privacy.ja.md'));
  const links = ['https://docs.github.com/en/site-policy/github-terms/github-terms-of-service', 'https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies',
    'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement', 'https://vercel.com/legal/terms', 'https://vercel.com/legal/acceptable-use-policy', 'https://vercel.com/legal/privacy-notice'];
  ok('the Terms, in both languages, name the six documents with links, the day they were read and the date of each', [te, tj].every((t) => links.every((u) => t.includes('(' + u + ')')) && t.includes('2026-11-09')
    && ['2026-04-27', '2026-10-19', '2026-04-21', '2026-06-01'].every((d) => t.includes(d))));
  const facts = [['(GitHub Terms, B.3)', '（GitHub の利用規約 B.3）'], ['(GitHub Terms, C)', '（GitHub の利用規約 C）'], ['(GitHub Terms, D.2 and M.3)', '（GitHub の利用規約 D.2・M.3）'],
    ['(GitHub Terms, D.4)', '（GitHub の利用規約 D.4）'], ['(GitHub Terms, J.3)', '（GitHub の利用規約 J.3）'], ['(Vercel Terms, section 4)', '（Vercel の利用規約 第 4 条）'],
    ['(Vercel Terms, section 3)', '（Vercel の利用規約 第 3 条）'], ['(Vercel Terms, sections 3 and 8)', '（Vercel の利用規約 第 3 条・第 8 条）'],
    ['(GitHub Terms, O and P; Vercel Terms, sections 20 and 21)', '（GitHub の利用規約 O・P、Vercel の利用規約 第 20 条・第 21 条）'], ['(GitHub Terms, S.1; Vercel Terms, section 23)', '（GitHub の利用規約 S.1、Vercel の利用規約 第 23 条）']];
  const miss = facts.filter(([e, j]) => !te.includes(e) || !tj.includes(j)).map(([e]) => e);
  ok('they give, with the section of each, the age, the content rules, removal, public content and AI training, the Hobby plan, model training, the acceptable use, "as is" and the law (' + facts.length + ' sections, both languages)', miss.length === 0, miss.join(' / '));
  ok('they say that Sophaxis is non-commercial, that the site can go offline without warning, and that model training is on unless the team turns it off',
    te.includes('Sophaxis is non-commercial.') && te.includes('so the site can go offline without warning') && te.includes('unless the account turns this off in its team settings')
    && tj.includes('Sophaxis は非商用です。') && tj.includes('サイトが予告なく見られなくなることがあります。') && tj.includes('アカウントのチームの設定でこれを止めたときは別です'));
  ok('the Privacy Policy, in both languages, states before consent the two uses of the records by GitHub and Vercel under their terms',
    pe.includes('to train AI features and the models of its affiliates (section D.4)') && pe.includes('unless the account turns this off in its team settings (section 3)')
    && pj.includes('AI の機能と関連会社のモデルの学習に使うことを認めています（D.4）') && pj.includes('アカウントのチームの設定でこれを止めたときは別です（第 3 条）')
    && pe.indexOf('section D.4') < pe.indexOf('## Security'));
  ok('no policy says that the operator has turned Vercel\'s model training off, until the operator confirms it and the review records it',
    ![te, tj, pe, pj].some((t) => /has turned (this|it) off|opted out|止めています|止めました/.test(t)) || read(path.join(ROOT, 'docs', 'legal-review.md')).includes('The operator turned Vercel\'s model training off on'));
  ok('the Terms and the Privacy Policy, in both languages, say that the operator has not confirmed the setting turned off for the Sophaxis account',
    [te, pe].every((t) => t.includes('The operator has not confirmed that this setting is turned off for the Sophaxis account.'))
    && [tj, pj].every((t) => t.includes('Sophaxis のアカウントで、この設定を切ったことは確かめていません。'))
    || read(path.join(ROOT, 'docs', 'legal-review.md')).includes('The operator turned Vercel\'s model training off on'));
  ok('the Submission Policy and the Privacy Policy, in both languages, tell a person worried by these uses not to submit, and how a listed author withdraws',
    read(path.join(ROOT, 'policies', 'submission.md')).includes('to train AI models, do not submit.') && read(path.join(ROOT, 'policies', 'submission.ja.md')).includes('個人情報が心配な方は、投稿しないでください。')
    && pe.includes('If these uses make you worry about your personal data, do not submit, and do not agree to be listed as an author') && pj.includes('これらの利用で個人情報が心配な方は、投稿しないでください。著者として載ることにも同意しないでください。'));
  ok('the Disclaimer, in both languages, says that both provide their services as is and points to the Terms', read(path.join(ROOT, 'disclaimer.md')).includes('GitHub and Vercel each provide their services "as is"')
    && read(path.join(ROOT, 'disclaimer.ja.md')).includes('サービスを「現状のまま」保証なしに提供し'));
}

console.log('\n76. The age of the DOI: six months since the first DOI of a new work was registered (Submission Policy)');
{
  const I = require('../tools/intake.js');
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const sub = read(path.join(ROOT, 'policies', 'submission.md')), subJa = read(path.join(ROOT, 'policies', 'submission.ja.md'));
  const days = (a, b) => (Date.parse(a) - Date.parse(b)) / 86400000;
  const changelog = read(path.join(ROOT, 'CHANGELOG.md'));
  const announced = '2026-11-09';
  ok('the rule starts on ' + site.doiAgeFrom + ', at least 14 days after the top page announces it on ' + announced + ', and counts ' + site.doiAgeMonths + ' months',
    site.doiAgeFrom === '2026-11-23' && site.doiAgeMonths === 6 && days(site.doiAgeFrom, announced) >= 14
    && site.termsNotice.text.includes('From ' + site.doiAgeFrom + ', a new work is listed only if, on the day its submission issue is opened, at least six months have passed since the first DOI of the work was registered; a new version of a listed work is not counted again.')
    && read(path.join(ROOT, 'site', 'index.html')).includes('at least six months have passed since the first DOI of the work was registered')
    && changelog.split('\n## ').some((sec) => sec.startsWith(announced + '\n') && sec.includes('six months')));
  ok('the Submission Policy, in both languages, gives the rule, how the six months and the first DOI are counted, and what it does not apply to',
    ['From ' + site.doiAgeFrom + ', a new work is listed only if at least six months have passed since its first DOI was registered.',
      'The six months are counted to the day the submission issue is opened, in Japan time.',
      'They end on the same day of the month, or on the last day of a shorter month.',
      'The first DOI is the DOI registered earliest among the DOI given and the DOIs that its metadata names as earlier versions of the work, or as the DOI of all its versions.',
      'Where the metadata gives no such day, as for Jxiv, the operator checks it by hand.',
      'This does not apply to a new version of a work that Sophaxis already lists, or to a submission opened before ' + site.doiAgeFrom + '.'].every((t) => sub.includes(t))
    && [site.doiAgeFrom + ' から、新しい作品は、その最初の DOI が登録されてから ' + site.doiAgeMonths + ' か月以上たっているときに限り載せます。',
      site.doiAgeMonths + ' か月は、投稿の issue を開いた日まで、日本時間で数えます。', '月の同じ日に満了し、短い月ではその月の末日に満了します。',
      'メタデータにその日がないとき（Jxiv など）は、運営者が手で確かめます。',
      'すでに Sophaxis に載っている作品の新しい版と、' + site.doiAgeFrom + ' より前に開かれた投稿には掛かりません。'].every((t) => subJa.includes(t)));
  ok('the form, the steps, the automation page and llms.txt say so',
    read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'submission.yml')).includes('From ' + site.doiAgeFrom + ', at least six months must have passed since the first DOI of the work was registered.')
    && read(path.join(ROOT, 'process.md')).includes('From ' + site.doiAgeFrom + ', at least six months must have passed since the first DOI of the work was registered')
    && read(path.join(ROOT, 'automation.md')).includes('- From ' + site.doiAgeFrom + ', it also checks that six months have passed since the first DOI of the work was registered, counted to the day the issue was opened')
    && read(path.join(ROOT, 'site', 'llms.txt')).includes('- Age of the DOI: from ' + site.doiAgeFrom + ', a new work is listed only if at least 6 months have passed since its first DOI was registered'));
  ok('six months end on the same day of the month, or on the last day of a shorter month, leap years included',
    I.addMonths('2026-06-02', 6) === '2026-12-02' && I.addMonths('2026-05-31', 6) === '2026-11-30' && I.addMonths('2026-08-31', 6) === '2027-02-28'
    && I.addMonths('2027-08-29', 6) === '2028-02-29' && I.addMonths('2026-12-15', 6) === '2027-06-15');
  ok('the day of registration is DataCite\'s "registered" or Crossref\'s "created", in Japan time; JaLC gives none',
    I.registeredOf({ data: { attributes: { registered: '2026-06-01T20:00:00Z', created: '2026-05-01T00:00:00Z' } } }) === '2026-06-02'
    && I.registeredOf({ data: { attributes: { registered: null, created: '2026-05-01T00:00:00Z' } } }) === null
    && I.registeredOf({ message: { created: { 'date-time': '2026-09-30T03:00:00Z' }, posted: { 'date-parts': [[2026, 1, 1]] } } }) === '2026-09-30'
    && I.registeredOf(JSON.parse(read(path.join(__dirname, 'fixtures', 'intake', 'jalc.json')))) === null && I.registeredOf(null) === null);
  ok('the earlier DOIs are the ones named as the DOI of all versions or as an earlier version, and nothing else',
    JSON.stringify(I.earlierDois({ data: { attributes: { relatedIdentifiers: [
      { relationType: 'IsVersionOf', relatedIdentifierType: 'DOI', relatedIdentifier: 'https://doi.org/10.5281/ZENODO.1' },
      { relationType: 'IsNewVersionOf', relatedIdentifierType: 'DOI', relatedIdentifier: '10.5281/zenodo.2' },
      { relationType: 'HasVersion', relatedIdentifierType: 'DOI', relatedIdentifier: '10.5281/zenodo.3' },
      { relationType: 'IsVersionOf', relatedIdentifierType: 'URL', relatedIdentifier: 'https://example.org/4' },
      { relationType: 'IsSupplementTo', relatedIdentifierType: 'DOI', relatedIdentifier: '10.5281/zenodo.5' }] } } })) === '["10.5281/zenodo.1","10.5281/zenodo.2"]'
    && JSON.stringify(I.earlierDois({ message: { relation: { 'is-version-of': [{ 'id-type': 'doi', id: '10.2139/SSRN.1' }], 'has-version': [{ 'id-type': 'doi', id: '10.2139/ssrn.2' }], replaces: [{ 'id-type': 'uri', id: 'x' }] } } })) === '["10.2139/ssrn.1"]');
  const row = (first, opened) => I.doiAgeCheck(first, opened);
  const f0 = { doi: '10.5281/zenodo.1', day: '2026-06-02' };
  ok('the check passes from the day the six months end, fails the day before, and fails when no day can be read, leaving it to the operator',
    row(f0, '2026-12-01')[1] === false && row(f0, '2026-12-02')[1] === true && row(f0, '2027-01-01')[1] === true
    && row(f0, '2026-12-01')[2] === '10.5281/zenodo.1 was registered on 2026-06-02; a submission can be opened from 2026-12-02, as a new issue'
    && row(null, '2027-01-01')[1] === false && row(null, '2027-01-01')[2].includes('the operator checks it by hand') && row(f0, '2026-12-02')[0] === I.DOI_AGE_LABEL
    && JSON.stringify(I.earliestOf(new Map([['a', '2026-08-22'], ['b', null], ['c', '2026-06-02']]))) === '{"doi":"c","day":"2026-06-02"}' && I.earliestOf(new Map([['a', null]])) === null);
  const meta = I.fromDataCite(JSON.parse(read(path.join(__dirname, 'fixtures', 'intake', 'datacite.json'))));
  const form = Object.assign(I.parseIssue(read(path.join(__dirname, 'fixtures', 'intake', 'issue.md'))), { update: '' });
  const rows = (f, age) => I.check({ form: f, login: 'x', meta, person: null, works: null, listed: new Map(), today: '2026-11-23', age }).checks.filter((c) => c[0] === I.DOI_AGE_LABEL);
  ok('the intake applies it to a submission opened from ' + site.doiAgeFrom + ', not to one opened before, nor to a new version of a listed work',
    rows(form, { opened: '2026-11-22', first: f0 }).length === 0 && rows(form, { opened: '2026-11-23', first: f0 }).length === 1 && rows(form, { opened: '2026-11-23', first: f0 })[0][1] === false
    && I.check({ form, login: 'x', meta, person: null, works: null, listed: new Map(), today: '2026-11-23', age: { opened: '2026-11-23', first: f0 } }).ok === false
    && rows(Object.assign({}, form, { update: '2026.0001' }), { opened: '2026-11-23', first: f0 }).length === 0
    && rows(form, { opened: '2027-01-01', first: f0 })[0][1] === true);
  const walk = require('child_process').execFileSync(process.execPath, ['-e', `
    const I = require(${JSON.stringify(path.join(ROOT, 'tools', 'intake.js'))});
    const dc = (registered, rel) => ({ raw: { data: { attributes: { registered, relatedIdentifiers: (rel || []).map(([t, d]) => ({ relationType: t, relatedIdentifierType: 'DOI', relatedIdentifier: d })) } } } });
    const graph = {
      '10.5281/zenodo.9': dc('2026-06-01T20:00:00Z', [['HasVersion', '10.5281/zenodo.10']]),
      '10.5281/zenodo.11': dc('2026-08-22T01:00:00Z', [['IsVersionOf', '10.5281/zenodo.9'], ['IsNewVersionOf', '10.5281/zenodo.10']]),
      '10.5281/zenodo.10': dc('2026-06-02T01:00:00Z', [['IsVersionOf', '10.5281/zenodo.9'], ['IsNewVersionOf', '10.5281/zenodo.11']]),
      '10.6084/m9.figshare.7.v1': dc('2026-10-13T00:00:00Z'),
      '10.6084/m9.figshare.7.v2': dc('2026-10-15T00:00:00Z'),
    };
    const look = async (d) => graph[d] || { meta: null };
    let loop = 0; const chain = async (d) => { loop++; const n = Number(d.split('.').pop()); return dc('2027-01-01T00:00:00Z', [['IsNewVersionOf', '10.1/c.' + (n + 1)]]); };
    (async () => {
      const out = [];
      out.push(await I.firstDoi('10.5281/zenodo.11', graph['10.5281/zenodo.11'].raw, look));
      out.push(await I.firstDoi('10.6084/m9.figshare.7.v2', graph['10.6084/m9.figshare.7.v2'].raw, look));
      out.push(await I.firstDoi('10.5281/zenodo.12', null, look));
      out.push(await I.firstDoi('10.1/c.0', null, chain), loop);
      console.log(JSON.stringify(out));
    })();`], { encoding: 'utf8' }).trim();
  ok('the first DOI is found by following the DOI of all versions and earlier versions, the first version of Figshare, through loops, and at most ten DOIs',
    walk === '[{"doi":"10.5281/zenodo.9","day":"2026-06-02"},{"doi":"10.6084/m9.figshare.7.v1","day":"2026-10-13"},null,{"doi":"10.1/c.0","day":"2027-01-01"},10]', walk);
  const src = read(path.join(ROOT, 'tools', 'intake.js'));
  ok('the workflow counts to the day the issue was opened, not the day it was edited, and looks the first DOI up only when the rule applies',
    src.includes("const issue = await github('GET', '/issues/' + n);") && src.includes('jstDay(issue && issue.created_at ? issue.created_at')
    && src.includes('if (meta && !form.update && opened >= SITE.doiAgeFrom) age.first = await firstDoi(form.doi, raw);'));
}

console.log('\n77. Conflicts of interest: no priority for the operator, a public week before listing, and the share said (Moderation Policy)');
{
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const mod = read(path.join(ROOT, 'policies', 'moderation.md')), modJa = read(path.join(ROOT, 'policies', 'moderation.ja.md'));
  ok('the Moderation Policy, in both languages, gives no priority to the operator, waits seven days from ' + site.ownWaitFrom + ', and says where the share is shown',
    site.ownWaitFrom === '2026-11-09' && site.ownWaitDays === 7
    && mod.includes("The operator's own submissions get no priority: they are moderated in the order they come, and their records have no other place on the site than any other record.")
    && mod.includes('From ' + site.ownWaitFrom + ', a submission by the operator is listed no sooner than seven days after its submission issue is opened, so that anyone can object in the issue first.')
    && mod.includes('The record keeps the day the issue was opened, and the build of the site refuses a record listed sooner.')
    && modJa.includes('運営者の投稿は優先しません。') && modJa.includes(site.ownWaitFrom + ' から、運営者の投稿は、投稿の issue を開いてから ' + site.ownWaitDays + ' 日がたつまで載せません。')
    && modJa.includes('それより早く載せようとすると、サイトの生成が止まります。'));
  const base = { id: '2026.0099', title: 'T', authors: [{ name: 'A B' }], abstract: 'An abstract.', category: 'philosophy', license: 'CC-BY-4.0',
    versions: [{ version: 1, doi: '10.5281/zenodo.1', date: '2026-11-01' }], llm_disclosure: 'No generative model was used at all in this work.', issue: 9, status: 'listed' };
  const v = (extra) => validate(Object.assign({}, base, extra), '2026.0099.json');
  ok('the build refuses the operator’s own record listed before seven days, or without the day of its issue; others and earlier records are not touched',
    v({ operator_own: true, listed: '2026-11-15', submitted: '2026-11-09' }).some((e) => e.includes('7 days after its submission issue was opened at the earliest'))
    && v({ operator_own: true, listed: '2026-11-16', submitted: '2026-11-09' }).length === 0
    && v({ operator_own: true, listed: '2026-11-16' }).some((e) => e.includes('keeps the day its submission issue was opened'))
    && v({ operator_own: true, listed: '2026-11-02' }).length === 0 && v({ listed: '2026-11-10' }).length === 0);
  const I = require('../tools/intake.js');
  const meta = I.fromDataCite(JSON.parse(read(path.join(__dirname, 'fixtures', 'intake', 'datacite.json'))));
  const form = Object.assign(I.parseIssue(read(path.join(__dirname, 'fixtures', 'intake', 'issue.md'))), { update: '' });
  const dr = (login) => I.draft({ form, login, issue: 9, meta, versions: [{ doi: meta.doi, date: meta.date }], result: { licence: 'CC-BY-4.0' }, today: '2026-11-20', opened: '2026-11-12' }).record;
  ok('the draft of the operator’s own submission keeps the day its issue was opened; another submitter’s draft has no such day',
    dr(site.operator.github).submitted === '2026-11-12' && dr(site.operator.github).operator_own === true && !('submitted' in dr('jcarberry')) && !('operator_own' in dr('jcarberry'))
    && read(path.join(ROOT, 'tools', 'intake.js')).includes('draft({ form, login, issue: n, meta, versions, result, pub, opened })'));
  const papers = fs.readdirSync(path.join(ROOT, 'data', 'papers')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(read(path.join(ROOT, 'data', 'papers', f)))).filter((p) => p.status !== 'removed');
  const own = papers.filter((p) => p.operator_own === true).length;
  const share = own + ' of the ' + papers.length + ' records shown ' + (own === 1 ? 'is' : 'are') + ' the operator’s own submissions.';
  ok('the Statistics page and llms.txt say how many of the records shown are the operator’s own (' + own + ' of ' + papers.length + '), counted from the records',
    read(path.join(ROOT, 'site', 'stats.html')).includes('<h2>The operator’s own submissions</h2>\n<p>' + share) && read(path.join(ROOT, 'site', 'llms.txt')).includes(share), share);
}

console.log('\n78. Retractions, withdrawals and other notices that Crossref records (Submission and Moderation Policies)');
{
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const N = require('../tools/notices.js');
  const I = require('../tools/intake.js');
  const B = require('../build.js');
  const u = (doi, type, d, source) => ({ DOI: doi, type, source, updated: { 'date-parts': d } });
  const answer = { message: { items: [
    { DOI: '10.1/R', 'update-to': [u('10.5/X', 'retraction', [[2026, 3, 4]], 'retraction-watch')] },
    { DOI: '10.1/Z', 'update-to': [u('10.5/Y', 'withdrawal', [[2026, 1, 1]])] },
    { DOI: '10.1/C', 'update-to': [u('10.5/x', 'correction', [[2025, 1, 2]])] },
    { DOI: '10.1/C', 'update-to': [u('10.5/x', 'correction', [[2025, 1, 2]])] },
    { DOI: '10.1/N', 'update-to': [u('10.5/x', 'expression of concern', [[2025]])] }] } };
  ok('the notices of a DOI are read from the Crossref answer: that DOI only, each once, oldest first, with a full date',
    JSON.stringify(N.noticesFrom(answer, 'https://doi.org/10.5/X')) === '[{"type":"correction","doi":"10.1/c","date":"2025-01-02","source":"publisher"},{"type":"retraction","doi":"10.1/r","date":"2026-03-04","source":"retraction-watch"}]'
    && N.noticesFrom({}, '10.5/X').length === 0);
  const c = (list) => N.noticeCheck(list);
  const n = (type) => ({ type, doi: '10.1/n', date: '2026-01-01' });
  ok('a retraction, a partial retraction, a withdrawal or a removal fails the check, an expression of concern goes to the operator, a correction passes, and an unread Crossref fails',
    ['retraction', 'partial_retraction', 'withdrawal', 'removal'].every((t) => c([n(t)])[1] === false && c([n(t)])[2].endsWith('such a work is not listed'))
    && c([n('expression_of_concern')])[1] === false && c([n('expression_of_concern')])[2].endsWith('the operator decides')
    && c([n('correction')])[1] === true && c([n('correction')])[2].startsWith('recorded: correction of 2026-01-01') && c([])[1] === true
    && c(undefined)[1] === false && c(undefined)[2].includes('the operator checks it by hand'));
  const meta = I.fromDataCite(JSON.parse(read(path.join(__dirname, 'fixtures', 'intake', 'datacite.json'))));
  const form = Object.assign(I.parseIssue(read(path.join(__dirname, 'fixtures', 'intake', 'issue.md'))), { update: '' });
  const rows = (opened, notices) => I.check({ form, login: 'x', meta, person: null, works: null, listed: new Map(), today: opened, age: { opened, first: { doi: '10.1/a', day: '2020-01-01' } }, notices }).checks.filter((r) => r[0] === N.NOTICE_LABEL);
  ok('the intake applies it to a submission opened from ' + site.noticesFrom + ', the day the top page announces, and not before',
    site.noticesFrom === '2026-11-23' && rows('2026-11-22', [n('retraction')]).length === 0 && rows('2026-11-23', [n('retraction')])[0][1] === false && rows('2026-11-23', [])[0][1] === true
    && site.termsNotice.text.includes('From the same day, a work for which Crossref records a retraction, a withdrawal or a removal is not listed, and one with an expression of concern goes to the operator first.')
    && read(path.join(ROOT, 'tools', 'intake.js')).includes("if (meta && opened >= SITE.noticesFrom) notices = await require('./notices.js').lookUpNotices(form.doi);"));
  const rec = { id: '2026.0099', status: 'listed', versions: [{ doi: '10.5/X' }, { doi: '10.5/x' }], notices: [{ type: 'correction', doi: '10.1/C', date: '2025-01-02' }] };
  const found = { '10.5/x': N.noticesFrom(answer, '10.5/X') };
  const news = N.newNotices(rec, found);
  ok('each week, a notice that the record does not hold yet is reported once, for the operator to add; a removed record is not looked at',
    news.length === 1 && news[0] === '2026.0099: Crossref records a retraction of 2026-03-04 for 10.5/x, https://doi.org/10.1/r; the operator adds it to the record and reviews the listing under the Moderation Policy'
    && N.newNotices(Object.assign({}, rec, { status: 'removed' }), found).length === 0
    && /const N = require\('\.\/notices\.js'\);[\s\S]*notices\[d\] = await N\.lookUpNotices\(v\.doi\);[\s\S]*problems\.push\(\.\.\.list\.flatMap\(\(p\) => N\.newNotices\(p, notices\)\)\);/.test(read(path.join(ROOT, 'tools', 'watch.js'))));
  const base = { id: '2026.0099', title: 'T', authors: [{ name: 'A B' }], abstract: 'An abstract.', category: 'philosophy', license: 'CC-BY-4.0',
    versions: [{ version: 1, doi: '10.5281/zenodo.1', date: '2026-11-01' }], llm_disclosure: 'No generative model was used at all in this work.', issue: 9, listed: '2026-11-02', status: 'listed' };
  const withN = Object.assign({}, base, { notices: [{ type: 'retraction', doi: '10.1016/r.2026.1', date: '2026-03-04' }] });
  ok('a record holds its notices with a type, the DOI of the notice and a date; the record page shows each with a link, and papers.json carries them',
    validate(withN, '2026.0099.json').length === 0 && validate(Object.assign({}, base, { notices: [{ type: 'Retraction!', doi: 'x', date: '2026' }] }), '2026.0099.json').some((e) => e.includes('notice 1 needs a type'))
    && B.crossrefNotices(withN) === '<div class="notice"><b>Notices.</b> Crossref records a retraction of 2026-03-04: <a href="https://doi.org/10.1016/r.2026.1">10.1016/r.2026.1</a>. Read the notice before citing this work.</div>'
    && B.crossrefNotices(base) === '' && read(path.join(ROOT, 'build.js')).includes('${publishedNotice(p)}\n${crossrefNotices(p)}\n')
    && read(path.join(ROOT, 'build.js')).includes("...(p.notices && p.notices.length ? { notices: p.notices } : {}),"));
  const sub = read(path.join(ROOT, 'policies', 'submission.md')), subJa = read(path.join(ROOT, 'policies', 'submission.ja.md'));
  const mod = read(path.join(ROOT, 'policies', 'moderation.md')), modJa = read(path.join(ROOT, 'policies', 'moderation.ja.md')), auto = read(path.join(ROOT, 'automation.md'));
  ok('the policies, in both languages, and the automation page say what is read, what follows, and what the check cannot see',
    sub.includes('From ' + site.noticesFrom + ', a work for which Crossref records a retraction, a partial retraction, a withdrawal or a removal is not listed.')
    && sub.includes('A notice that a repository shows only on its own page, and not to Crossref, is not seen by the check.')
    && subJa.includes(site.noticesFrom + ' から、Crossref が撤回・一部撤回・取り下げ・削除を記録している作品は載せません。') && subJa.includes('Crossref に届けていない通知は、この確認では見えません。')
    && mod.includes('The operator adds a new notice to the record, where its page shows it with a link, and reviews the listing.') && modJa.includes('運営者は、新しい通知を記録に加えます。')
    && auto.includes('- From ' + site.noticesFrom + ', it also checks that Crossref records no retraction, withdrawal or removal for the DOI, and sends an expression of concern to the operator.')
    && auto.includes('Crossref records a notice that the record does not hold'));
}

console.log('\n79. The shape of the PDF, read by machine for the moderator (Moderation Policy)');
{
  const S = require('../tools/pdf_shape.js');
  const I = require('../tools/intake.js');
  const page1 = 'Repeated Games through a Cyclic Operator: A Golden-Ratio Threshold\nTakuya Nemoto\nAbstract\nIn a discounted repeated game ' + 'x'.repeat(900);
  const good = { pages: 10, text: page1 + '\f' + 'body '.repeat(200) + '\fReferences\n[1] A. Author.\f', title: 'Repeated Games through a Cyclic Operator: A Golden-Ratio Threshold' };
  const pass = (shape) => shape.map((r) => r[1]);
  ok('a paper with its title, an abstract, references and readable text on enough pages passes every row, and the count of pages ignores the last empty one',
    JSON.stringify(pass(S.shapeOf(good))) === '[true,true,true,true,true]' && S.shapeOf(good)[1][2].endsWith('in the first 3 pages') && S.MIN_PAGES === 4 && S.SHAPE_PAGES === 60);
  ok('each row fails on its own: too few pages, images only, the title missing from the first page, no abstract on the first two pages, references only on the first page',
    pass(S.shapeOf(Object.assign({}, good, { pages: 3 })))[0] === false && pass(S.shapeOf(Object.assign({}, good, { pages: null })))[0] === false
    && pass(S.shapeOf(Object.assign({}, good, { text: '\f\f\f' })))[1] === false
    && pass(S.shapeOf(Object.assign({}, good, { title: 'Quite Another Title About Something Else' })))[2] === false
    && pass(S.shapeOf(Object.assign({}, good, { text: good.text.replace('Abstract', 'Opening') })))[3] === false
    && pass(S.shapeOf(Object.assign({}, good, { text: good.text.replace('Abstract', 'Opening').replace('References', 'Abstract and References') })))[3] === false
    && pass(S.shapeOf(Object.assign({}, good, { title: 'Repeated Measures in Another Field of Medicine' })))[2] === false
    && pass(S.shapeOf(Object.assign({}, good, { text: 'References ' + page1 + '\f' + 'body '.repeat(200) })))[4] === false
    && pass(S.shapeOf(Object.assign({}, good, { text: page1.replace('Abstract', '要旨') + '\f本文\f参考文献\n' })))[3] === true);
  ok('the title is compared by its words of four letters or more, folded, and by every word in other scripts',
    JSON.stringify(S.titleWords('Über die Möglichkeit: a Note on GÖDEL')) === '["uber","moglichkeit","note","godel"]' && S.titleWords('自己実験としての名乗り').length === 1);
  const note = S.shapeNote({ rows: S.shapeOf(Object.assign({}, good, { pages: 2 })) });
  ok('the issue shows the shape as decided by nothing, a "no" marked, and says when it could not be read',
    note.includes('**The shape of the PDF**, read by machine for the moderator. It decides nothing, and a "no" is not a reason for declining by itself.') && note.includes('| **no** | The PDF has at least 4 pages | 2 pages |')
    && S.shapeNote({ error: 'poppler-utils is not installed' }).includes('could not be read: poppler-utils is not installed. The moderator reads the PDF.') && S.shapeNote(null) === ''
    && I.comment({ ok: false, checks: [] }, null, [], { error: 'x' }).includes('could not be read: x'));
  const src = read(path.join(ROOT, 'tools', 'intake.js'));
  const none = require('child_process').execFileSync(process.execPath, ['-e', `require(${JSON.stringify(path.join(ROOT, 'tools', 'intake.js'))}).pdfShape([{ doi: '10.2139/ssrn.1', date: '2026-01-01' }], 'T').then((r) => console.log(JSON.stringify(r)))`], { encoding: 'utf8' }).trim();
  ok('the PDF is read only where the repository lets a script fetch it, only for a new work, kept in a temporary file and deleted after',
    none === 'null' && src.includes("const shape = meta && !form.update ? await pdfShape(versions, meta.title) : null;") && src.includes("fs.rmSync(file, { force: true });")
    && src.includes('const problems = accept(bytes, md5);') && src.includes("const src = last && sourceFor(last.doi, versions.length);"));
  const wf = read(path.join(ROOT, '.github', 'workflows', 'intake.yml'));
  const mod = read(path.join(ROOT, 'policies', 'moderation.md')), modJa = read(path.join(ROOT, 'policies', 'moderation.ja.md'));
  ok('the workflow installs poppler-utils before the intake and goes on without it; the Moderation Policy, in both languages, and the automation page say what is read',
    wf.indexOf('poppler-utils') > 0 && wf.indexOf('poppler-utils') < wf.indexOf('node tools/intake.js') && wf.includes("|| echo 'poppler-utils could not be installed'")
    && mod.includes('The shape decides nothing; the moderator reads the PDF.') && modJa.includes('形は何も決めません。モデレーターが PDF を読みます。')
    && read(path.join(ROOT, 'automation.md')).includes('only to read its shape for the moderator, deleted after the reading'));
}

console.log('\n80. A researcher vouches for a first submission (Submission Policy)');
{
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const I = require('../tools/intake.js');
  const fx = (f) => JSON.parse(read(path.join(__dirname, 'fixtures', 'intake', f)));
  const meta = I.fromDataCite(fx('datacite.json'));
  const c = (login, body, type) => ({ user: { login, type: type || 'User' }, body });
  const words = I.VOUCH + ' ORCID: 0000-0002-1825-0097';
  const found = I.vouchesIn([c('jcarberry', words), c('bot', words, 'Bot'), c('x', 'I vouch for this submission to Sophaxis. ORCID: 0000-0002-1825-0097'), c('y', I.VOUCH)]);
  ok('a vouching comment gives the full words and an ORCID iD; a bot, the words cut short, or no iD do not count',
    JSON.stringify(found) === '[{"login":"jcarberry","orcid":"0000-0002-1825-0097"}]'
    && I.VOUCH === 'I vouch for this submission to Sophaxis. I am not an author of this work, and I do not live in, or stay in, a place where Sophaxis is not offered.');
  const peer = I.peerWorks(fx('orcid-works-journal.json'));
  ok('the journal articles, book chapters and books with a DOI are read from a real ORCID record; other works do not count',
    peer.size === 6 && peer.has('10.5555/12345680') && I.peerWorks(fx('orcid-works.json')).size === 0
    && I.peerWorks({ group: [{ 'work-summary': [{ type: 'preprint' }], 'external-ids': { 'external-id': [{ 'external-id-type': 'doi', 'external-id-value': '10.1/p', 'external-id-relationship': 'self' }] } }] }).size === 0
    && I.peerWorks({ group: [{ 'work-summary': [{ type: 'book-chapter' }], 'external-ids': { 'external-id': [{ 'external-id-type': 'doi', 'external-id-value': '10.1/B', 'external-id-relationship': 'self' }] } }] }).has('10.1/b'));
  const person = { name: 'Someone Else', given: 'Someone', family: 'Else', urls: ['https://github.com/vouchr'] };
  const e = { login: 'vouchr', orcid: '0000-0001-0000-0002' };
  const prob = (over) => I.vouchProblem(Object.assign({ e, person, peer, meta, submitter: '0000-0002-1825-0097' }, over));
  ok('it counts only from a researcher whose ORCID record links the account and lists such a work, who is neither an author, the submitter nor the operator',
    prob({}) === null && prob({ person: null }) === 'the ORCID record could not be read' && prob({ person: Object.assign({}, person, { urls: [] }) }) === 'the ORCID record does not link this GitHub account'
    && prob({ peer: new Set() }) === 'the ORCID record lists no journal article, book chapter or book with a DOI'
    && prob({ e: { login: 'vouchr', orcid: meta.authors[1].orcid || '0000-0001-0000-0002' }, person: Object.assign({}, person, { given: meta.authors[1].given, family: meta.authors[1].family, name: meta.authors[1].name }) }) === 'an author of the work cannot vouch'
    && prob({ submitter: e.orcid }) === 'the submitter cannot vouch'
    && prob({ e: { login: site.operator.github, orcid: e.orcid } }) === 'the operator cannot vouch' && prob({ e: { login: 'vouchr', orcid: site.operator.orcid } }) === 'the operator cannot vouch');
  const recs = [{ status: 'listed', authors: [{ orcid: site.operator.orcid }] }, { status: 'withdrawn', authors: [{ orcid: '0000-0001-1111-1111' }] }];
  ok('an author of a listed work needs no one to vouch; a withdrawn work does not make one an author; otherwise the check waits, names why a comment does not count, and passes on one that does',
    I.listedAuthor(site.operator.orcid, recs) === true && I.listedAuthor('0000-0001-1111-1111', recs) === false && I.listedAuthor('', recs) === false
    && I.vouchCheck([], true)[1] === true && I.vouchCheck([], false)[2] === 'waiting for a researcher to vouch for it' && I.vouchCheck([], false)[1] === false
    && I.vouchCheck([{ e, problem: 'the operator cannot vouch' }], false)[2] === 'ORCID 0000-0001-0000-0002: the operator cannot vouch'
    && I.vouchCheck([{ e, problem: 'x' }, { e, problem: null }], false)[1] === true);
  const note = I.comment({ ok: false, checks: [['The DOI metadata could be read', true, ''], [I.VOUCH_LABEL, false, 'waiting for a researcher to vouch for it']] }, null);
  const src = read(path.join(ROOT, 'tools', 'intake.js'));
  ok('while only the vouching is awaited, the comment says who can vouch and how, that it is not a review, and what becomes public; the check applies from ' + site.vouchFrom + ' to a new work',
    note.includes('This is a first submission, and it needs one researcher to vouch for it') && note.includes(I.VOUCH + ' ORCID: 0000-0000-0000-0000') && note.includes('it is not a review, and the moderator still decides')
    && note.includes('The GitHub username, ORCID iD and comment of the researcher are public') && !note.includes('Not verified. Fix what failed')
    && site.vouchFrom === '2026-11-23' && src.includes('if (meta && result.author && !form.update && opened >= SITE.vouchFrom) {')
    && read(path.join(ROOT, '.github', 'workflows', 'intake.yml')).includes("contains(github.event.comment.body, 'I vouch for this submission to Sophaxis')"));
  const sub = read(path.join(ROOT, 'policies', 'submission.md')), subJa = read(path.join(ROOT, 'policies', 'submission.ja.md'));
  const pri = read(path.join(ROOT, 'policies', 'privacy.md')), priJa = read(path.join(ROOT, 'policies', 'privacy.ja.md'));
  ok('the Submission Policy and the Privacy Policy, in both languages, the Moderation Policy, the form, the steps, the automation page and the top-page notice say so',
    sub.includes('## A researcher who vouches for a first submission') && sub.includes('From ' + site.vouchFrom + ', a submitter who is not yet an author of a work that Sophaxis lists needs one researcher to vouch for it.')
    && sub.includes('"' + I.VOUCH + '"') && sub.includes('It is not a review, and the moderator still decides.') && sub.includes('Like an author, the researcher must not live in, or stay in, a place where Sophaxis is not offered.')
    && subJa.includes('## 初めての投稿の紹介') && subJa.includes('「' + I.VOUCH + '」') && subJa.includes('査読ではなく、判断するのはモデレーターです。')
    && pri.includes('a researcher who vouches for a first submission in a comment gives their ORCID iD there') && priJa.includes('初めての投稿を紹介する研究者がコメントに書く GitHub のユーザー名と ORCID iD')
    && read(path.join(ROOT, 'policies', 'moderation.md')).includes('- From ' + site.vouchFrom + ', a researcher has vouched for a first submission')
    && read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'submission.yml')).includes('From the same day, a first submission needs a researcher to vouch for it (see the Submission Policy).')
    && read(path.join(ROOT, 'process.md')).includes('a first submission also needs a researcher to vouch for it') && read(path.join(ROOT, 'automation.md')).includes('it also counts a researcher who vouches for the work')
    && site.termsNotice.text.includes('needs a researcher whose ORCID record lists a journal article, a book chapter or a book to vouch for it.'));
}

console.log('\n81. Decisions by year, counted from the public issues and the records (Moderation Policy)');
{
  const R = require('../tools/report.js');
  const B = require('../build.js');
  const mod = read(path.join(ROOT, 'policies', 'moderation.md'));
  ok('the reasons counted are the ' + R.REASONS.length + ' that the Moderation Policy names, word for word', R.REASONS.length === 9 && R.REASONS.every((r) => mod.includes('\n- ' + r + ':') || mod.includes('\n- ' + r + '.')));
  const L = (...names) => names.map((name) => ({ name }));
  const op = { login: 'owner' }, other = { login: 'someone' };
  const issues = [
    { labels: L('submission', 'accepted'), user: op, created_at: '2026-03-01T01:00:00Z', closed_at: '2026-03-01T02:00:00Z' },
    { labels: L('submission', 'declined'), user: other, created_at: '2026-04-01T01:00:00Z', closed_at: '2026-04-11T01:00:00Z',
      comments: [{ user: op, body: 'Declined. Reasons: out of scope; Licence.' }, { user: other, body: 'Spam or abuse?' }] },
    { labels: L('submission'), user: other, created_at: '2026-12-31T16:00:00Z', closed_at: null },
    { labels: L('submission', 'accepted'), user: other, created_at: '2026-12-31T14:00:00Z', closed_at: '2027-01-02T00:00:00Z' },
    { labels: L('removal', 'upheld'), user: other, created_at: '2026-05-01T00:00:00Z' },
    { labels: L('withdrawal'), user: other, created_at: '2026-06-01T00:00:00Z' }];
  const records = [{ status: 'removed', removal_date: '2026-11-07' }, { status: 'withdrawn', withdrawal_date: '2025-12-01' }, { status: 'listed' }];
  const t = R.tally({ issues, records, year: 2026, asOf: '2027-01-02', owner: 'Owner' });
  ok('a year is counted in Japan time: an issue opened at 01:00 on 1 January in Japan belongs to the new year; the median and longest days, the undecided and those by the operator are counted',
    t.submissions.opened === 3 && t.submissions.accepted === 2 && t.submissions.declined === 1 && t.submissions.undecided === 0 && t.submissions.byOperator === 1
    && t.daysToDecision.median === 2 && t.daysToDecision.longest === 10 && t.complete === true
    && R.tally({ issues, records, year: 2027, asOf: '2027-01-02', owner: 'owner' }).submissions.undecided === 1);
  ok('a reason counts only when the repository owner names it in a declined submission; requests and records are counted by their own day',
    t.declineReasons['Out of scope'] === 1 && t.declineReasons.Licence === 1 && t.declineReasons['Spam or abuse'] === 0
    && t.removalRequests.opened === 1 && t.removalRequests.upheld === 1 && t.withdrawalRequests === 1 && t.records.removed === 1 && t.records.withdrawn === 0
    && R.median([5, 1, 3]) === 3 && R.median([1, 2, 3, 4]) === 2.5 && R.median([]) === null);
  const recorded = B.loadReports();
  ok('every recorded year adds up and is named by its file; a year that does not add up is refused by the build',
    recorded.length >= 1 && recorded.every((r) => B.reportProblems(r, r.year + '.json').length === 0)
    && B.reportProblems(Object.assign({}, t, { submissions: Object.assign({}, t.submissions, { accepted: 9 }) }), '2026.json').some((e) => e.includes('do not add up'))
    && read(path.join(ROOT, 'build.js')).includes("for (const r of loadReports()) problems.push(...reportProblems(r, r.year + '.json'));")
    && B.reportProblems(t, '2025.json').some((e) => e.includes('the name of the file')) && B.reportProblems(Object.assign({}, t, { complete: false }), '2026.json').some((e) => e.includes('complete says')),
    recorded.map((r) => r.year + ' as of ' + r.asOf).join(', '));
  const page = read(path.join(ROOT, 'site', 'decisions.html'));
  const r0 = recorded[0];
  ok('the Decisions by year page shows each recorded year, marked when the year was not over, and the Statistics page links it',
    page.includes('<h2 id="y' + r0.year + '">' + r0.year + (r0.complete ? '' : ', counted up to ' + r0.asOf) + '</h2>') && page.includes('<tr><td>Accepted</td><td>' + r0.submissions.accepted + '</td></tr>')
    && page.includes('Removal requests sent by email are not public and are not counted.') && read(path.join(ROOT, 'site', 'stats.html')).includes('<a href="./decisions.html">Decisions by year</a>')
    && read(path.join(ROOT, 'site', 'sitemap.xml')).includes(JSON.parse(read(path.join(ROOT, 'site.json'))).baseUrl + 'decisions.html'));
  const wf = read(path.join(ROOT, '.github', 'workflows', 'report.yml')), ri = read(path.join(ROOT, 'tools', 'report_issue.js'));
  ok('each 2 January at 12:23 Japan time a workflow counts the year before and posts the counts in an issue; it may only read the code and write issues; the operator records them',
    /cron: '23 3 2 1 \*'/.test(wf) && /permissions:\n  contents: read\n  issues: write\n(?!  \w)/.test(wf) && wf.includes('YEAR: ${{ inputs.year }}') && ri.includes("if (!/^\\d{4}$/.test(year))")
    && read(path.join(ROOT, 'automation.md')).includes('## Once a year, on 2 January at 12:23 Japan time') && read(path.join(ROOT, 'automation.md')).includes('- Leaves to the operator: recording the counts in `data/reports/`'));
  ok('the Moderation Policy, in both languages, says so', mod.includes('Each January, the decisions of the year before are counted from the public issues and the records')
    && read(path.join(ROOT, 'policies', 'moderation.ja.md')).includes('毎年 1 月に、前の年の判断を、公開の issue と記録から数えます。'));
}

console.log('\n82. Transparency: the self-assessment against the Principles of Transparency and Best Practice');
{
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const t = read(path.join(ROOT, 'transparency.md'));
  const HEADINGS = ['Name', 'Website', 'Publishing schedule and timeline', 'Preservation', 'Copyright', 'Licensing', 'Publication ethics and related editorial policies', 'Editorial assessment',
    'Peer review', 'Access', 'Ownership and management', 'Editorial board or advisory body', 'Editorial team and contact information', 'Author fees', 'Other revenue', 'Advertising', 'Direct marketing'];
  const MARKS = ['Met', 'In part', 'Not met', 'Does not apply'];
  const table = Object.fromEntries([...t.matchAll(/^\| ([^|]+) \| (Met|In part|Not met|Does not apply) \|$/gm)].map((m) => [m[1].trim(), m[2]]));
  const body = Object.fromEntries(HEADINGS.map((h) => [h, (new RegExp('^### ' + h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\n\n([^.\n]+)\\.', 'm').exec(t) || [])[1]]));
  ok('the page holds Sophaxis against the ' + HEADINGS.length + ' headings of version 5.0, read at DOAJ, says that it is the operator\'s own assessment, and that a principle that cannot apply is not counted as met',
    t.includes('(https://doaj.org/apply/transparency/)') && t.includes('version 5.0 of October 2026, read at DOAJ on 2026-11-09')
    && t.includes("It is the operator's own assessment, not one made or endorsed by any of the four organisations, and Sophaxis is not a member of any of them.")
    && t.includes('Where a principle cannot apply to a preprint server, this page says so, and does not count it as met.'));
  const mismatch = HEADINGS.filter((h) => !MARKS.includes(table[h]) || table[h] !== body[h]);
  ok('every heading has one of the four marks, and the summary gives the same mark as the section (' + MARKS.map((m) => Object.values(table).filter((x) => x === m).length + ' ' + m.toLowerCase()).join(', ') + ')',
    mismatch.length === 0 && Object.keys(table).length === HEADINGS.length, mismatch.join(', '));
  ok('what it states agrees with the site: no ISSN, the archived version, the week in public, no fees, the moderators, no board, and no review',
    site.issn === null && t.includes('Sophaxis has no ISSN, so none is listed.') && t.includes('version 1.0.0 is archived at Zenodo (' + site.zenodo.version + ')')
    && t.includes('wait seven days in public before listing') && site.ownWaitDays === 7
    && read(path.join(ROOT, 'policies', 'terms.md')).includes('No change will introduce fees.') && t.includes('the Terms of Use say that no change will introduce fees')
    && read(path.join(ROOT, 'policies', 'moderation.md')).includes('The operator is at present the only moderator.') && table['Editorial board or advisory body'] === 'Not met'
    && read(path.join(ROOT, 'policy.md')).includes('Sophaxis is not a journal.') && table['Peer review'] === 'Does not apply'
    && read(path.join(ROOT, 'policies', 'moderation.md')).includes('It does not run plagiarism checks.') && read(path.join(ROOT, 'policies', 'moderation.md')).includes('## Research integrity\n\nPlagiarism is presenting')
    && t.includes("- Plagiarism: the Moderation Policy defines plagiarism, including the reuse of the authors' own work as new, and a submission found to plagiarise is declined; Sophaxis runs no software check. Met."));
  ok('the page is built, in the sitemap, in the footer of every page and in llms-full.txt',
    read(path.join(ROOT, 'site', 'transparency.html')).includes('<h1>Transparency: a self-assessment</h1>') && read(path.join(ROOT, 'site', 'sitemap.xml')).includes(site.baseUrl + 'transparency.html')
    && read(path.join(ROOT, 'site', 'index.html')).includes('<a href="./transparency.html">Transparency</a>') && read(path.join(ROOT, 'site', 'llms-full.txt')).includes('Transparency: a self-assessment'));
}

console.log('\n83. Collections by topic, beside the fields (Moderation Policy)');
{
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const B = require('../build.js');
  const C = site.collections;
  const slugs = C.map((c) => c.slug);
  ok('the ' + C.length + ' collections have a slug, an English and a Japanese name and a description, each slug once',
    C.length === 4 && JSON.stringify(slugs) === '["game-theory","individual-autonomy","research-method-ethics","existential-philosophy"]'
    && C.every((c) => /^[a-z]+(-[a-z]+)*$/.test(c.slug) && c.name && c.ja && c.description && c.description.endsWith('.')) && new Set(slugs).size === slugs.length
    && JSON.stringify(C.map((c) => c.ja)) === '["ゲーム理論","個と自律","研究の方法と倫理","実存哲学"]');
  const base = { id: '2026.0099', title: 'T', authors: [{ name: 'A B' }], abstract: 'An abstract.', category: 'philosophy', license: 'CC-BY-4.0',
    versions: [{ version: 1, doi: '10.5281/zenodo.1', date: '2026-11-01' }], llm_disclosure: 'No generative model was used at all in this work.', issue: 9, listed: '2026-11-02', status: 'listed' };
  const v = (c) => validate(Object.assign({}, base, { collections: c }), '2026.0099.json');
  ok('a record names only collections of site.json, each once, in a list that is not empty',
    v(['game-theory']).length === 0 && v(['game-theory', 'existential-philosophy']).length === 0 && v(['nope']).length === 1 && v([]).length === 1 && v(['game-theory', 'game-theory']).length === 1 && v('game-theory').length === 1
    && validate(base, '2026.0099.json').length === 0);
  const papers = fs.readdirSync(path.join(ROOT, 'data', 'papers')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(read(path.join(ROOT, 'data', 'papers', f)))).filter((p) => p.status !== 'removed');
  const counts = Object.fromEntries(slugs.map((s) => [s, papers.filter((p) => (p.collections || []).includes(s)).length]));
  const idx = read(path.join(ROOT, 'site', 'collections.html'));
  ok('each collection has its page and Atom feed with its own records, the index counts them (' + slugs.map((s) => s + ' ' + counts[s]).join(', ') + '), and an empty one says so',
    slugs.every((s) => {
      const pg = read(path.join(ROOT, 'site', 'collection', s + '.html')), fd = read(path.join(ROOT, 'site', 'collection', s + '.xml'));
      const mine = papers.filter((p) => (p.collections || []).includes(s));
      return idx.includes('<a href="./collection/' + s + '.html"><b>' + C.find((c) => c.slug === s).name + '</b></a> (' + counts[s] + ')')
        && (mine.length ? mine.every((p) => pg.includes('href="../abs/' + p.id + '.html"') && fd.includes('<id>' + site.baseUrl + 'abs/' + p.id + '.html</id>')) : pg.includes('No preprint is in this collection yet.'))
        && (fd.match(/<entry>/g) || []).length === mine.length && fd.includes('<link rel="self" href="' + site.baseUrl + 'collection/' + s + '.xml"/>');
    }) && counts['existential-philosophy'] === 0);
  ok('a record page links its collections, the top page links the index, papers.json and the sitemap carry them, and a collection says nothing of quality',
    papers.filter((p) => p.collections).every((p) => p.collections.every((s) => read(path.join(ROOT, 'site', 'abs', p.id + '.html')).includes('<a href="../collection/' + s + '.html">')))
    && read(path.join(ROOT, 'site', 'index.html')).includes('By topic: <a href="./collections.html">Collections</a>.')
    && JSON.parse(read(path.join(ROOT, 'site', 'papers.json'))).filter((p) => p.collections).length === papers.filter((p) => p.collections).length
    && slugs.every((s) => read(path.join(ROOT, 'site', 'sitemap.xml')).includes(site.baseUrl + 'collection/' + s + '.html'))
    && idx.includes('A collection says nothing of the quality of a work.') && read(path.join(ROOT, 'policies', 'moderation.md')).includes('A collection says nothing of the quality of a work')
    && read(path.join(ROOT, 'policies', 'moderation.ja.md')).includes('集めは作品の質について何も言いません。'));
}

console.log('\n84. The site in Japanese: the top page and every prose page');
{
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const ja = read(path.join(ROOT, 'site', 'index.ja.html')), en = read(path.join(ROOT, 'site', 'index.html'));
  const pair = '<link rel="alternate" hreflang="en" href="' + site.baseUrl + '">\n<link rel="alternate" hreflang="ja" href="' + site.baseUrl + 'index.ja.html">';
  ok('the Japanese top page is in Japanese, names the English one and is named by it, and the English one links it', /<html lang="ja"/.test(ja) && ja.includes(pair) && en.includes(pair)
    && en.includes('<a href="./index.ja.html" hreflang="ja" lang="ja">日本語</a>') && read(path.join(ROOT, 'site', 'sitemap.xml')).includes(site.baseUrl + 'index.ja.html</loc>'));
  ok('it says that acceptance is moderation, not peer review, that nothing is charged, and where Sophaxis is not offered, with all ' + site.notOffered.length + ' places by their Japanese names',
    ja.includes('掲載はモデレーションであり、査読ではありません。') && ja.includes('著者からも読者からも料金を取りません。')
    && ja.includes('Sophaxis は、' + site.notOffered.length + ' の国と地域（' + require('../build.js').notOfferedPlacesJa() + '）に住んでいる著者') && site.notOffered.every((p) => ja.includes(p.ja)) && ja.includes('国籍や人種ではなく'));
  const jaPages = ['process', 'faq', 'automation', 'contact', 'repositories', 'policy', 'transparency', 'advisory', 'brand', 'press', 'call', 'findable', 'accessibility', 'compare', 'glossary'];
  const jaPolicies = ['privacy', 'terms', 'submission', 'moderation', 'copyright', 'licences', 'takedown', 'withdrawal'];
  ok('it links every Japanese page, every policy in Japanese and the Disclaimer, each field and collection by its Japanese name, and says that the lists stay in English and the records have Japanese pages',
    jaPages.every((s) => ja.includes('href="./' + s + '.ja.html"')) && jaPolicies.every((s) => ja.includes('href="./policies/' + s + '.ja.html"')) && ja.includes('href="./disclaimer.ja.html"')
    && Object.keys(site.categories).every((s) => ja.includes('href="./list/' + s + '.html">' + site.categoriesJa[s] + '（')) && site.collections.every((c) => ja.includes('href="./collection/' + c.slug + '.html">' + c.ja + '（'))
    && ja.includes('一覧と統計は英語です。記録の頁には日本語の頁もあり、下の一覧からつないでいます。'));
  ok('the Japanese index of the policies lists every policy in Japanese, and llms.txt links every Japanese page',
    jaPolicies.every((s) => read(path.join(ROOT, 'site', 'policy.ja.html')).includes('<a href="./policies/' + s + '.ja.html">'))
    && jaPages.every((s) => read(path.join(ROOT, 'site', 'llms.txt')).includes(site.baseUrl + s + '.ja.html)')) && read(path.join(ROOT, 'site', 'llms.txt')).includes(site.baseUrl + 'index.ja.html)'));
  const jaFiles = jaPages.map((s) => read(path.join(ROOT, s + '.ja.md'))).join('\n');
  ok('the Japanese pages claim no partnership, endorsement or affiliation, and link the translations, not the English policies',
    !/推薦|提携|公認|partner|endorse/i.test(jaFiles) && !/\]\(\.\/policies\/[a-z]+\.html\)/.test(jaFiles) && !/\]\(\.\/disclaimer\.html\)/.test(jaFiles));
}

console.log('\n85. Funding, competing interests, research ethics and data; plagiarism and misconduct (Submission and Moderation Policies)');
{
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const I = require('../tools/intake.js');
  const B = require('../build.js');
  const form = read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'submission.yml'));
  const LABELS = { funding: 'Funding', competing_interests: 'Competing interests', ethics: 'Human participants and research ethics', data: 'Data and code (optional)' };
  const part = (id) => (new RegExp('    id: ' + id + '\\n[\\s\\S]*?(?=\\n  - type:|$)').exec(form) || [''])[0];
  ok('the form asks the three statements, not required by the form itself, required from ' + site.statementsFrom + ', and data and code as an option; the intake reads each field',
    site.statementsFrom === '2026-11-24' && I.STATEMENTS.map((x) => x[0]).join() === 'funding,competing_interests,ethics'
    && I.STATEMENTS.every(([k]) => part(k).includes('label: ' + LABELS[k] + '\n') && part(k).includes('Required from ' + site.statementsFrom + '.') && part(k).includes('required: false'))
    && part('data').includes('label: ' + LABELS.data + '\n') && !part('data').includes('Required from')
    && Object.keys(LABELS).every((k) => I.parseIssue('### ' + LABELS[k] + '\n\nThe work had no funding.\n')[k] === 'The work had no funding.'));
  const rows = (f, opened) => I.check({ form: Object.assign({ doi: '10.5281/zenodo.1', orcid: '0000-0002-1825-0097', category: 'philosophy', llm: 'No generative model was used in this work.' }, f), login: 'x', meta: null, age: { opened } })
    .checks.filter((c) => I.STATEMENTS.some((x) => x[1] === c[0]));
  const all = { funding: 'None.', competing_interests: 'None.', ethics: 'The work involves no human participants.' };
  ok('the check asks each statement for an issue opened from ' + site.statementsFrom + ', and passes only when each is given; before that day it asks only what is given',
    rows({}, site.statementsFrom).length === 3 && rows({}, site.statementsFrom).every((c) => c[1] === false && c[2] === 'the field is empty')
    && rows(all, site.statementsFrom).length === 3 && rows(all, site.statementsFrom).every((c) => c[1] === true)
    && rows(Object.assign({}, all, { funding: 'no' }), site.statementsFrom).filter((c) => !c[1]).length === 1
    && rows({}, '2026-11-23').length === 0 && rows({ funding: 'None.' }, '2026-11-23').length === 1 && I.STATEMENT_MIN === 4);
  const dc = I.fromDataCite(JSON.parse(read(path.join(__dirname, 'fixtures', 'intake', 'datacite.json'))));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sophaxis-papers-'));
  const f0 = { doi: dc.doi, orcid: '0000-0002-1825-0097', category: 'philosophy', llm: 'No generative model was used in this work.', llm_extent: site.llmExtents.none };
  const d = I.draft({ form: Object.assign({}, f0, all, { data: 'The code is at <b>Zenodo</b>.' }), login: 'x', issue: 9, meta: dc, versions: [{ doi: dc.doi, date: dc.date }], result: { licence: 'CC-BY-4.0' }, paperDir: dir, today: '2026-11-25' });
  const d0 = I.draft({ form: f0, login: 'x', issue: 9, meta: dc, versions: [{ doi: dc.doi, date: dc.date }], result: { licence: 'CC-BY-4.0' }, paperDir: dir, today: '2026-11-25' });
  ok('the draft keeps each statement given, as plain text, and no key for one not given; the record is valid',
    d.problems.length === 0 && d.record.funding === 'None.' && d.record.ethics === 'The work involves no human participants.' && d.record.data === 'The code is at Zenodo.'
    && !('funding' in d0.record) && !('data' in d0.record), d.problems.join('; '));
  const base = { id: '2026.0099', title: 'T', authors: [{ name: 'A B' }], abstract: 'An abstract.', category: 'philosophy', license: 'CC-BY-4.0',
    versions: [{ version: 1, doi: '10.5281/zenodo.1', date: '2026-11-01' }], llm_disclosure: 'No generative model was used at all in this work.', issue: 9, listed: '2026-11-02', status: 'listed' };
  const v = (o) => validate(Object.assign({}, base, o), '2026.0099.json').length;
  ok('a record keeps each statement as a text of 4 to 2000 characters; an empty, short, long or non-text statement is refused',
    v(all) === 0 && v({ data: 'At Zenodo.' }) === 0 && v({ funding: '' }) === 1 && v({ competing_interests: 'no' }) === 1 && v({ ethics: 'x'.repeat(2001) }) === 1 && v({ data: 5 }) === 1
    && B.STATEMENT_KEYS.map((x) => x[0]).join() === 'funding,competing_interests,ethics,data');
  const html = B.statements(Object.assign({}, base, all, { data: 'At <Zenodo>.' }));
  ok('the record page shows the statements under their headings, escaped, says that Sophaxis does not check them, and shows nothing when none is given',
    html.startsWith('<h2>Statements by the authors</h2>') && html.includes('<p class="meta">Competing interests</p>\n<p>None.</p>') && html.includes('<p>At &lt;Zenodo&gt;.</p>')
    && html.includes('As the authors state them in the submission issue. Sophaxis does not check them.') && B.statements(base) === ''
    && read(path.join(ROOT, 'build.js')).includes('${statements(p)}${notes ?') && read(path.join(ROOT, 'build.js')).includes('...Object.fromEntries(STATEMENT_KEYS.filter(([k]) => p[k]).map(([k]) => [k, p[k]])),'));
  const sub = read(path.join(ROOT, 'policies', 'submission.md')), subJa = read(path.join(ROOT, 'policies', 'submission.ja.md'));
  ok('the Submission Policy, in both languages, sets out the three statements from ' + site.statementsFrom + ', ethics approval and consent, data and code encouraged but not required, and no check of what they say',
    sub.includes('## Funding, competing interests, research ethics, and data\n\nFrom ' + site.statementsFrom + ', the form asks three statements, and a work is listed only if each is given.')
    && sub.includes('Work that involves human participants must name the ethics committee that approved it, or say why no approval was needed under the rules that applied where the research was done.')
    && sub.includes('Every participant who can be identified must have consented, and the statement says so.') && sub.includes('Sophaxis encourages authors to make them available, but does not require it and does not check them.')
    && sub.includes('This does not apply to a submission opened before ' + site.statementsFrom + '.')
    && subJa.includes('## 研究資金、利益相反、研究倫理、データ\n\n' + site.statementsFrom + ' から、様式は三つの申告を求めます。') && subJa.includes('Sophaxis は著者にそれらを公開するよう勧めますが、求めはせず、確かめもしません。'));
  const mod = read(path.join(ROOT, 'policies', 'moderation.md')), modJa = read(path.join(ROOT, 'policies', 'moderation.ja.md'));
  const ri = (mod.split('## Research integrity\n')[1] || '').split('\n## ')[0];
  ok('the Moderation Policy, in both languages, defines plagiarism, declines it as a named reason, and runs no software',
    ri.startsWith("\nPlagiarism is presenting the words, ideas, proofs or results of others as one's own, without saying where they come from.")
    && ri.includes('and so is submitting one work to Sophaxis twice under different DOIs.') && ri.includes('Sophaxis runs no software to detect plagiarism.')
    && mod.includes('\n- Plagiarism: ') && require('../tools/report.js').REASONS.includes('Plagiarism') && modJa.includes('## 研究の公正\n\n剽窃とは、') && modJa.includes('\n- 剽窃：'));
  ok('it says how a concern of misconduct is raised and answered: in public or by email, 14 days for the authors, no investigation, a note only for what is established, the person who wrote not named, and the operator\'s own work alike',
    ri.includes('Anyone can raise a concern about a listed record, in public through the correction issue linked on its page.')
    && ri.includes('goes by email to the address on the operator\'s [ORCID record](https://orcid.org/' + site.operator.orcid + ').')
    && ri.includes('gives the authors 14 days to answer it.') && ri.includes('- Sophaxis does not investigate misconduct.') && ri.includes('the operator tells the person who raised the concern that the institution or the journal is the body that investigates')
    && ri.includes('- A note is added to the record only for what is established:') && ri.includes('it does not repeat an allegation.')
    && ri.includes('is not named to the authors or to anyone else without their consent, unless the law requires it.') && ri.includes('- A concern about a work by the operator follows the same steps')
    && ri.includes('Sophaxis is not a member of COPE.') && modJa.includes('Sophaxis は不正を調査しません。') && modJa.includes('Sophaxis は COPE の会員ではありません。'));
  const t = read(path.join(ROOT, 'transparency.md'));
  ok('the change is announced on the top page 14 days ahead, and the steps, the automation page and the transparency page say so',
    (Date.parse(site.statementsFrom) - Date.parse('2026-11-10')) / 86400000 >= 14
    && site.termsNotice.text.includes('From ' + site.statementsFrom + ', the form asks three more statements, on funding, on competing interests, and on human participants and research ethics, and a work is listed only if each is given; it also asks, optionally, where the data and code are.')
    && read(path.join(ROOT, 'process.md')).includes('From ' + site.statementsFrom + ', the form also asks for statements on funding') && read(path.join(ROOT, 'automation.md')).includes('- From ' + site.statementsFrom + ', it also checks that the statements on funding')
    && t.includes('| Publication ethics and related editorial policies | Met |') && !/^- [^\n]*\. (Not met|In part)\.$/m.test(t.split('### Publication ethics and related editorial policies')[1].split('\n### ')[0]));
}

console.log('\n86. The Markdown of the prose pages is rendered, not shown: tables, third-level headings and bold');
{
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const B = require('../build.js');
  ok('a table becomes a table with a header row, ### a heading, **bold** bold; a table without its row of dashes stops the build',
    B.markdown('| A | B |\n| --- | --- |\n| 1 | **x** |') === '<div class="table"><table><tr><th scope="col">A</th><th scope="col">B</th></tr><tr><td>1</td><td><b>x</b></td></tr></table></div>'
    && B.markdown('### Name\n\nMet.') === '<h3>Name</h3>\n<p>Met.</p>' && B.markdown('- **Met**: yes') === '<ul><li><b>Met</b>: yes</li></ul>'
    && (() => { try { B.markdown('| A | B |\n| 1 | 2 |'); return false; } catch (e) { return true; } })());
  const html = [];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') && html.push(path.join(d, e.name))));
  walk(path.join(ROOT, 'site'));
  const raw = html.filter((f) => { const t = read(f).replace(/<(pre|code)>[\s\S]*?<\/\1>/g, ''); return /\*\*|<p>\|\s|<p>#{1,6} |<li>#{1,6} /.test(t); });
  ok('no page of the ' + html.length + ' shows Markdown as text: no **, no table row and no heading inside a paragraph', raw.length === 0, raw.map((f) => path.relative(ROOT, f)).join(', '));
  const t = read(path.join(ROOT, 'site', 'transparency.html')), tj = read(path.join(ROOT, 'site', 'transparency.ja.html'));
  const sub = read(path.join(ROOT, 'site', 'policies', 'submission.html'));
  ok('the transparency page shows its summary as a table and its 17 headings as headings, in both languages, and the Submission Policy its ' + site.notOffered.length + ' places as a table',
    t.includes('<tr><td>Publication ethics and related editorial policies</td><td>Met</td></tr>') && (t.match(/<h3 id="[^"]+">/g) || []).length === 17 && (tj.match(/<h3 id="[^"]+">/g) || []).length === 17 && tj.includes('<table>')
    && sub.includes('<th scope="col">Place</th>') && (sub.split('<th scope="col">Place</th>')[1].split('</table>')[0].match(/<tr>/g) || []).length === site.notOffered.length);
}

console.log('\n87. Brand: the call for an advisory board, the name and logo, the badge, the page for anyone introducing Sophaxis, and the news');
{
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const B = require('../build.js');
  const adv = read(path.join(ROOT, 'advisory.md')), t = read(path.join(ROOT, 'transparency.md'));
  ok('the call says what an adviser does and does not do, who can join, that it is unpaid and named only after agreeing; until then there is no board, and the self-assessment stays "Not met"',
    adv.includes('Until someone agrees and is named on the [Operator and contact](./contact.md) page, there is no board.') && adv.includes('- Gives no decision on any submission.')
    && adv.includes('Advising Sophaxis says nothing about the quality of any listed work, and does not involve the adviser\'s institution.') && adv.includes('An adviser is not paid and pays nothing.')
    && adv.includes('Each adviser is named, with an ORCID iD, on the contact page, only after they agree to it.') && adv.includes('An adviser who submits a work goes through the same moderation as anyone else, with no priority.')
    && /\| Editorial board or advisory body \| Not met \|/.test(t) && t.includes('Since 2026-11-10 a call for an advisory board has been open ([Advisory board: a call](./advisory.md)); no adviser has joined yet.')
    && read(path.join(ROOT, 'policies', 'moderation.md')).includes('which advises on the policies and decides no submission; the call is on [Advisory board: a call](../advisory.md).')
    && read(path.join(ROOT, 'contact.md')).includes('There is no advisory board yet;'));
  const css = read(path.join(ROOT, 'build.js'));
  const tok = (dark, k) => ((dark ? /@media \(prefers-color-scheme: dark\) \{ :root \{([^}]*)\}/ : /\n:root \{([^}]*)\}/).exec(css) || [])[1].match(new RegExp('--' + k + ': (#[0-9a-f]{6})'))[1];
  const brand = read(path.join(ROOT, 'brand.md'));
  ok('the colours on the brand page are those of the site, in both themes', ['bg', 'fg', 'accent'].every((k) => brand.includes('`' + tok(false, k) + '` | `' + tok(true, k) + '`')));
  const badge = read(path.join(ROOT, 'site', 'badge.svg'));
  const listed = fs.readdirSync(path.join(ROOT, 'data', 'papers')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(read(path.join(ROOT, 'data', 'papers', f))));
  ok('the badge is an SVG with a title and the accent colour, and each listed record, and no other, offers it with a link to itself',
    badge.startsWith('<svg xmlns="http://www.w3.org/2000/svg"') && badge.includes('<title>Sophaxis: listed</title>') && badge.includes('fill="' + tok(false, 'accent') + '"') && !/<script|href=/.test(badge)
    && listed.every((p) => read(path.join(ROOT, 'site', 'abs', p.id + '.html')).includes('(' + site.baseUrl + 'abs/' + p.id + '.html)</code></pre>') === (p.status === 'listed'))
    && B.badgeSnippet({ id: '2026.0099', status: 'withdrawn' }) === '' && brand.includes('- Remove it if the work is withdrawn or its record is removed.'));
  const shown = listed.filter((p) => p.status !== 'removed').length;
  const press = read(path.join(ROOT, 'site', 'press.html')), pressJa = read(path.join(ROOT, 'site', 'press.ja.html'));
  ok('the page for anyone introducing Sophaxis takes its facts from site.json and the records (' + shown + ' shown), in both languages, and says what Sophaxis is not',
    press.includes('<tr><th scope="row">Records shown</th><td>' + shown + '</td></tr>') && pressJa.includes('<tr><th scope="row">載っている記録</th><td>' + shown + '</td></tr>')
    && press.includes('<tr><th scope="row">Started</th><td>' + site.since + '</td></tr>') && !/&lt;!-- facts --&gt;/.test(press + pressJa)
    && read(path.join(ROOT, 'press.md')).includes('- It does not peer review: acceptance is moderation.') && read(path.join(ROOT, 'press.md')).includes('- It issues no DOIs: the DOIs are those of the repositories.')
    && (() => { try { B.pressFacts('<p>no place</p>'); return false; } catch (e) { return true; } })());
  const news = B.loadNews(), nh = read(path.join(ROOT, 'site', 'news.html')), nx = read(path.join(ROOT, 'site', 'news.xml'));
  ok('the news (' + news.length + ' notices) is newest first, each with a date, a title and a text, as a page and an Atom feed with one entry each; a notice out of order or with a bad link is refused',
    B.newsProblems(news).length === 0 && (nx.match(/<entry>/g) || []).length === news.length && news.every((n) => nh.includes('<b>' + n.title.replace(/&/g, '&amp;') + '</b>'))
    && nx.includes('<link rel="self" href="' + site.baseUrl + 'news.xml"/>') && B.newsProblems([{ date: '2026-01-01', title: 'a', text: 'b' }, { date: '2026-02-01', title: 'a', text: 'b' }]).length === 1
    && B.newsProblems([{ date: '2026-01-01', title: 'a', text: 'b', url: 'javascript:x' }]).length === 1);
  const pages = fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html') && f !== '404.html');
  ok('every page links the news and the press page in its footer, and the sitemap and llms.txt name the new pages',
    pages.every((f) => /<footer>[\s\S]*href="(\.\.\/|\.\/)news\.html">News<\/a> · <a href="(\.\.\/|\.\/)press\.html">Press<\/a>[\s\S]*<\/footer>/.test(read(path.join(ROOT, 'site', f))))
    && ['advisory', 'brand', 'press', 'news'].every((s) => read(path.join(ROOT, 'site', 'sitemap.xml')).includes(site.baseUrl + s + '.html'))
    && ['advisory', 'brand', 'press'].every((s) => read(path.join(ROOT, 'site', 'llms.txt')).includes(site.baseUrl + s + '.html')));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sophaxis-review-'));
  ok('the year in review is shown beside the counts when data/reports/<year>.md exists, and the January issue gives its headings',
    B.yearInReview(1999) === '' && read(path.join(ROOT, 'tools', 'report_issue.js')).includes('The year in review goes beside the counts') && read(path.join(ROOT, 'tools', 'report_issue.js')).includes('## Next year')
    && read(path.join(ROOT, 'build.js')).includes("const f = path.join(ROOT, 'data', 'reports', year + '.md');") && fs.rmSync(dir, { recursive: true }) === undefined);
}

console.log('\n88. Share cards: one image per record shown, drawn by tools/cards.js, matching its record');
{
  const C = require('../tools/cards.js');
  const B = require('../build.js');
  const shown = fs.readdirSync(path.join(ROOT, 'data', 'papers')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(read(path.join(ROOT, 'data', 'papers', f)))).filter((p) => p.status !== 'removed');
  const manifest = JSON.parse(read(path.join(ROOT, 'assets', 'cards', 'cards.json')));
  const png = (f) => { const b = fs.readFileSync(f); return b.readUInt32BE(0) === 0x89504e47 && b.readUInt32BE(16) === 1200 && b.readUInt32BE(20) === 630; };
  const stale = shown.filter((p) => manifest[p.id] !== C.cardHash(p) || !fs.existsSync(path.join(ROOT, 'assets', 'cards', p.id + '.png')) || !png(path.join(ROOT, 'assets', 'cards', p.id + '.png')));
  ok('each of the ' + shown.length + ' records shown has a card of 1200 x 630 that matches its title, authors, fields and status, and no card is kept for a record not shown',
    stale.length === 0 && Object.keys(manifest).length === shown.length, stale.map((p) => p.id + ': run node tools/cards.js').join(', '));
  ok('the card is served beside the record, and its page names it as a large image; a changed record falls back to the logo until it is drawn again',
    shown.every((p) => fs.existsSync(path.join(ROOT, 'site', 'card', p.id + '.png')) && read(path.join(ROOT, 'site', 'abs', p.id + '.html')).includes('<meta name="twitter:card" content="summary_large_image">'))
    && B.hasCard(Object.assign({}, shown[0], { title: shown[0].title + ' (changed)' })) === false
    && C.cardText(shown[0]).startsWith(shown[0].id + '\n' + shown[0].title + '\n'));
  const html = C.cardHtml({ id: '2026.0099', title: '<b>T</b> & co', authors: [{ name: 'A <B>' }], category: 'logic' }, '<svg></svg>');
  ok('the card escapes what it shows and fetches nothing', html.includes('&lt;b&gt;T&lt;/b&gt; &amp; co') && html.includes('A &lt;B&gt;') && !/https?:\/\//.test(html)
    && read(path.join(ROOT, 'tools', 'cards.js')).includes("await page.route('**/*', (r) => r.abort());"));
}

console.log('\n89. The official account on X');
{
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const pages = fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html'));
  const handles = new Set(pages.flatMap((f) => [...read(path.join(ROOT, 'site', f)).matchAll(/https:\/\/(?:x|twitter)\.com\/(?!intent\/)([A-Za-z0-9_]+)/g)].map((m) => m[1])));
  ok('the account is @SophaxisX, named on the contact page, the press page and the news, with why the name ends in X; no page links any other account, and every page names it for share cards',
    site.x === 'SophaxisX' && [...handles].join() === 'SophaxisX'
    && read(path.join(ROOT, 'contact.md')).includes('- X: the official account [@SophaxisX](https://x.com/SophaxisX), with new records and news. The handle ends in X because @Sophaxis was already taken; that account is not Sophaxis.')
    && read(path.join(ROOT, 'contact.ja.md')).includes('@Sophaxis のアカウントは Sophaxis ではありません。') && read(path.join(ROOT, 'site', 'press.html')).includes('href="https://x.com/SophaxisX"')
    && pages.every((f) => read(path.join(ROOT, 'site', f)).includes('<meta name="twitter:site" content="@SophaxisX">')), [...handles].join(', '));
}

console.log('\n90. Outreach: the call to researchers, finding a listed work, accessibility, new by month, and the monthly summary');
{
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const B = require('../build.js'), M = require('../tools/monthly.js');
  const recs = fs.readdirSync(path.join(ROOT, 'data', 'papers')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(read(path.join(ROOT, 'data', 'papers', f))));
  const shown = recs.filter((p) => p.status !== 'removed');
  const call = read(path.join(ROOT, 'call.md'));
  ok('the call says that every work listed so far is the operator\'s only while that is true, names the days of the rules from site.json, and says what Sophaxis is not',
    (call.includes('Every work listed so far is by the operator') === shown.every((p) => p.operator_own === true))
    && call.includes('- From ' + site.doiAgeFrom + ', six months since the first DOI') && site.vouchFrom === site.doiAgeFrom && call.includes('- From ' + site.statementsFrom + ', statements on funding')
    && call.includes('Acceptance is moderation, not peer review.') && call.includes('Nothing is charged, to authors or to readers.')
    && read(path.join(ROOT, 'site', 'index.html')).includes('Researchers: <a href="./call.html">a call to submit</a>.'));
  const kb = read(path.join(__dirname, 'check_keyboard.js'));
  const widths = JSON.parse((/const WIDTHS = (\[[^\]]+\]);/.exec(kb) || [])[1]);
  const acc = read(path.join(ROOT, 'accessibility.md'));
  ok('the accessibility statement names the widths that the browser check uses (' + Math.max(...widths) + ' to ' + Math.min(...widths) + '), says it is not audited, and the contact page and every footer point to it',
    acc.includes('at widths from ' + Math.max(...widths) + ' down to ' + Math.min(...widths) + ' pixels') && acc.includes('no one else has audited the site.')
    && acc.includes('Sophaxis aims to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA.') && read(path.join(ROOT, 'contact.md')).includes('Sophaxis aims to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA.')
    && read(path.join(ROOT, 'contact.md')).includes('is on [Accessibility](./accessibility.md).')
    && fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html') && f !== '404.html').every((f) => /<footer>[\s\S]*accessibility\.html">Accessibility<\/a>[\s\S]*<\/footer>/.test(read(path.join(ROOT, 'site', f)))));
  ok('the page on finding a listed work promises no index, and says that Sophaxis has no connection with the services it names',
    read(path.join(ROOT, 'findable.md')).includes('None of these is a promise that any index picks the work up; each decides for itself.') && read(path.join(ROOT, 'findable.md')).includes('Sophaxis has no connection with these services'));
  const months = read(path.join(ROOT, 'site', 'months.html'));
  const groups = [...new Set(shown.map((p) => p.listed.slice(0, 7)))];
  ok('New by month lists each of the ' + shown.length + ' records shown once, under the month it was listed, with the count of each month',
    shown.every((p) => (months.match(new RegExp('href="\\./abs/' + p.id.replace('.', '\\.') + '\\.html"', 'g')) || []).length === 1)
    && groups.every((m) => months.includes('<h2 id="m' + m + '">') && months.includes('(' + shown.filter((p) => p.listed.startsWith(m)).length + ')</h2>'))
    && !recs.filter((p) => p.status === 'removed').some((p) => months.includes(p.id)));
  const many = Array.from({ length: 12 }, (_, i) => ({ id: '2027.00' + String(i + 10), status: 'listed', listed: '2027-01-0' + (1 + (i % 9)), title: 'A rather long title for testing number ' + i + ' of the monthly summary' }));
  const p1 = M.posts('2027-01', many, [{ date: '2027-01-02', title: 'News' }]);
  ok('the monthly summary counts as X does (a URL 23, a light character 1, any other 2), keeps each post within 280, names the month before, and skips a month with nothing',
    M.weighted('abc') === 3 && M.weighted('日本') === 4 && M.weighted('see https://example.org/x') === 27 && M.monthBefore('2027-01-01') === '2026-12' && M.monthBefore('2026-11-01') === '2026-10'
    && M.weighted(p1.en) <= M.LIMIT && M.weighted(p1.ja) <= M.LIMIT && p1.en.startsWith('Sophaxis in January 2027: 12 new preprints') && M.posts('2027-02', many, []) === null
    && /cron: '17 0 1 \* \*'/.test(read(path.join(ROOT, '.github', 'workflows', 'monthly.yml'))) && /permissions:\n  contents: read\n  issues: write\n(?!  \w)/.test(read(path.join(ROOT, '.github', 'workflows', 'monthly.yml'))));
}

console.log('\n91. Positioning: how Sophaxis differs, the glossary, citing Sophaxis itself, and a feed for each field');
{
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const cmp = read(path.join(ROOT, 'compare.md'));
  const row = (name) => (cmp.match(new RegExp('^\\| ' + name + ' \\|.*$', 'm')) || [''])[0];
  ok('the comparison says that Sophaxis keeps no file and gives no DOI, that it replaces none of the others, that the summaries are dated and the services\' own pages count, and claims no connection',
    row('Sophaxis').includes('| No; the repository keeps it, and Sophaxis keeps an unmodified PDF copy and links the repository | No; it uses the DOI of the repository |') && row('PhilArchive').includes('| Yes | No |')
    && ['arXiv', 'PhilArchive', 'SSRN', 'Zenodo'].every((n) => row(n).endsWith('| None |')) && cmp.includes('It replaces none of the places below')
    && cmp.includes('These are short summaries as of 2026-11-10; the pages of each service are what count.') && cmp.includes('Sophaxis has no connection with any of them')
    && cmp.includes('Acceptance is moderation, not peer review.') && !/\bbetter\b|\bworse\b|\bbest\b/i.test(cmp));
  const g = read(path.join(ROOT, 'glossary.md'));
  const n = Object.keys(site.categories).length;
  const W = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  ok('the glossary\'s numbers and days are those of site.json: ' + n + ' fields, ' + site.ownWaitDays + ' days, six months, and the days of vouching and the statements',
    g.includes('one of the ' + W[n] + ' areas') && g.includes('waits ' + W[site.ownWaitDays] + ' days in public') && site.doiAgeMonths === 6 && g.includes('From ' + site.doiAgeFrom + ', a new work is listed only if six months have passed since it was registered.')
    && read(path.join(ROOT, 'glossary.ja.md')).includes(site.doiAgeFrom + ' から、新しい作品は、これが登録されてから ' + site.doiAgeMonths + ' か月たっているときに限り載せます。')
    && g.includes('- Vouching: from ' + site.vouchFrom + ',') && g.includes('from ' + site.statementsFrom + ', on funding') && g.includes('It is not peer review')
    && read(path.join(ROOT, 'glossary.ja.md')).includes(['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'][n] + 'つの領域') && read(path.join(ROOT, 'glossary.ja.md')).includes(site.ownWaitDays + ' 日のあいだ公開で待ちます'));
  const press = read(path.join(ROOT, 'press.md'));
  ok('the press page says to cite a listed work by its own DOI, and Sophaxis itself by the DOI of every version of its code, from site.json',
    press.includes('To cite a listed work, cite the DOI of that work, not Sophaxis.') && press.includes('https://doi.org/' + site.zenodo.doi + '`')
    && press.includes('[' + site.osf.doi + '](https://doi.org/' + site.osf.doi + ')'));
  const shown = fs.readdirSync(path.join(ROOT, 'data', 'papers')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(read(path.join(ROOT, 'data', 'papers', f)))).filter((p) => p.status !== 'removed');
  ok('each of the ' + n + ' fields has an Atom feed with its own records only, which its page links',
    Object.keys(site.categories).every((s) => {
      const fd = read(path.join(ROOT, 'site', 'list', s + '.xml')), pg = read(path.join(ROOT, 'site', 'list', s + '.html'));
      const mine = shown.filter((p) => [p.category].concat(p.categories || []).includes(s));
      return (fd.match(/<entry>/g) || []).length === mine.length && mine.every((p) => fd.includes('<id>' + site.baseUrl + 'abs/' + p.id + '.html</id>'))
        && fd.includes('<link rel="self" href="' + site.baseUrl + 'list/' + s + '.xml"/>') && pg.includes('<a href="./' + s + '.xml">Atom feed</a>') && pg.includes('href="./' + s + '.xml">');
    }));
}

console.log('\n92. Before submitting, the history and the name, plain words, the record pages, more contrast, and the yearly audit');
{
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const B = require('../build.js'), I = require('../tools/intake.js'), A = require('../tools/audit.js');
  const ck = read(path.join(ROOT, 'checklist.md'));
  const items = ck.split('\n').filter((l) => /^\d+\. /.test(l));
  ok('the checklist adds no rule, numbers its ' + items.length + ' items from 1 without a gap across its sections, names the accepted licences of site.json, and the Japanese has as many',
    ck.includes('This list adds no rule.') && ck.includes('Where this list and the policies differ, the policies apply.') && items.every((l, i) => l.startsWith((i + 1) + '. '))
    && Object.values(site.licenses).every((l) => ck.includes(l)) && read(path.join(ROOT, 'checklist.ja.md')).split('\n').filter((l) => /^\d+\. /.test(l)).length === items.length
    && read(path.join(ROOT, 'site', 'checklist.html')).includes('<ol start="5">'));
  ok('the two templates are served as they are, as text, each dedicated to the public domain under CC0 1.0 and asking for every statement',
    B.TEMPLATES.every((f) => fs.readFileSync(path.join(ROOT, 'site', 'templates', f)).equals(fs.readFileSync(path.join(ROOT, 'templates', f))) && read(path.join(ROOT, 'templates', f)).includes('under CC0 1.0 (public domain dedication)')
      && ['Generative models', 'Funding', 'Competing interests', 'Human participants and research ethics'].every((x) => read(path.join(ROOT, 'templates', f)).includes(x)))
    && JSON.parse(read(path.join(ROOT, 'site', 'vercel.json'))).headers.some((h) => h.source === '/templates/(.*)' && h.headers[0].value === 'text/plain; charset=utf-8'));
  const news = JSON.parse(read(path.join(ROOT, 'data', 'news.json')));
  const hist = read(path.join(ROOT, 'site', 'history.html'));
  ok('the history names the day of site.json and the oldest news item, lists every news item once, oldest first, and gives the origin of the name, as the brand page does, in both languages',
    news[news.length - 1].date === site.since && news[news.length - 1].title === 'Sophaxis opens' && read(path.join(ROOT, 'history.md')).includes('On ' + site.since + ', the operator')
    && (hist.match(/<li>\d{4}-\d{2}-\d{2}: /g) || []).length === news.length && hist.indexOf('<li>' + site.since + ': Sophaxis opens</li>') < hist.indexOf('<li>' + news[0].date + ': ' + news[0].title.replace(/&/g, '&amp;') + '</li>')
    && read(path.join(ROOT, 'history.md')).includes('joins the Greek sophia (σοφία), wisdom, and the Latin axis') && read(path.join(ROOT, 'brand.md')).includes('It joins the Greek sophia (σοφία), wisdom, and the Latin axis')
    && read(path.join(ROOT, 'history.ja.md')).includes('ギリシア語の sophia（σοφία、知恵）と、ラテン語の axis（軸）') && read(path.join(ROOT, 'brand.ja.md')).includes('ギリシア語の sophia（σοφία、知恵）と、ラテン語の axis（軸）'));
  const sentences = (t) => t.split('\n').filter((l) => l && !/^(#|Last updated|Japanese:|最終更新|これは英語の|\d+\. |- )/.test(l)).flatMap((l) => l.split(/(?<=[.。])\s*/)).filter((x) => x.trim());
  const longEn = sentences(read(path.join(ROOT, 'easy.md'))).filter((x) => x.split(/\s+/).length > 25);
  const longJa = sentences(read(path.join(ROOT, 'easy.ja.md'))).filter((x) => x.length > 60);
  ok('the page in plain words keeps every sentence short (at most 25 words in English, 60 characters in Japanese)', longEn.length === 0 && longJa.length === 0, longEn.concat(longJa).slice(0, 3).join(' / '));
  const recs = fs.readdirSync(path.join(ROOT, 'data', 'papers')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(read(path.join(ROOT, 'data', 'papers', f)))).filter((p) => p.status !== 'removed');
  ok('every record page shows its breadcrumb, with its main field, as schema.org microdata', recs.every((p) => {
    const h = read(path.join(ROOT, 'site', 'abs', p.id + '.html'));
    return h.includes('<nav class="crumbs" aria-label="Breadcrumb"><span itemscope itemtype="https://schema.org/BreadcrumbList">') && h.includes('href="../list/' + p.category + '.html"><span itemprop="name">' + site.categories[p.category] + '</span>')
      && (h.match(/itemtype="https:\/\/schema.org\/ListItem"/g) || []).length === 3 && h.includes('<span itemprop="name" aria-current="page">' + p.id + '</span>');
  }));
  const good = { id: '2026.0001', title: 'T', authors: [{ name: 'A' }], abstract: 'x', category: Object.keys(site.categories)[0], license: Object.keys(site.licenses)[0], versions: [{ version: 1, doi: '10.5281/zenodo.1', date: '2026-11-01' }], llm_disclosure: 'none', issue: 1, listed: '2026-11-01', status: 'listed' };
  const err = (o) => B.validate(Object.assign({}, good, { abstract_other: o }), '2026.0001.json').filter((e) => /abstract_other/.test(e)).length;
  ok('a second abstract is taken from the form only with a language code and a text, and a record holds it only as { lang, text }',
    JSON.stringify(I.otherAbstract({ abstract_other_lang: ' JA ', abstract_other: ' 要旨 ' })) === '{"lang":"ja","text":"要旨"}' && I.otherAbstract({ abstract_other_lang: 'japanese', abstract_other: 'x' }) === null
    && I.otherAbstract({ abstract_other_lang: 'ja', abstract_other: '' }) === null && err({ lang: 'ja', text: '要旨' }) === 0 && err({ lang: 'Japanese', text: 'x' }) === 1 && err({ lang: 'ja', text: '' }) === 1
    && err({ lang: 'ja', text: 'x', by: 'me' }) === 1 && read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'submission.yml')).includes('label: Abstract in a second language (optional)')
    && I.parseIssue('### Language of the second abstract (optional)\n\nde\n\n### Abstract in a second language (optional)\n\nZ').abstract_other_lang === 'de');
  const authors = [...new Set(recs.flatMap((p) => p.authors.filter((a) => a.orcid).map((a) => a.orcid)))];
  ok('each author page (' + authors.length + ') offers one BibTeX file with each of the author\'s records once', authors.length > 0 && authors.every((o) => {
    const bib = read(path.join(ROOT, 'site', 'author', o + '.bib')), mine = recs.filter((p) => p.authors.some((a) => a.orcid === o));
    return (bib.match(/^@misc\{/gm) || []).length === mine.length && mine.every((p) => bib.includes('Listed on Sophaxis as ' + p.id + '}')) && read(path.join(ROOT, 'site', 'author', o + '.html')).includes('href="./' + o + '.bib"');
  }));
  const css = (/<style>([\s\S]*?)<\/style>/.exec(read(path.join(ROOT, 'site', 'index.html'))) || [, ''])[1];
  const pal = (re) => Object.fromEntries([...((re.exec(css) || [])[1] || '').matchAll(/--([a-z]+): (#[0-9a-f]{6})/g)].map((m) => [m[1], m[2]]));
  const light = Object.assign(pal(/\n:root \{([^}]*)\}/), pal(/@media \(prefers-contrast: more\) \{ :root \{([^}]*)\}/));
  const dark = Object.assign(pal(/@media \(prefers-color-scheme: dark\) \{ :root \{([^}]*)\}/), pal(/@media \(prefers-contrast: more\) and \(prefers-color-scheme: dark\) \{ :root \{([^}]*)\}/));
  const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const low = [['light', light], ['dark', dark]].flatMap(([n, t]) => ['fg', 'muted', 'accent'].flatMap((f) => ['bg', 'card'].filter((b) => !(t[f] && t[b] && ratio(t[f], t[b]) >= 7)).map((b) => n + ' ' + f + '/' + b)));
  ok('when more contrast is asked, every text colour stands at 7:1 or more on every background, in both schemes, and forced colours take the system\'s focus colour',
    Object.keys(pal(/@media \(prefers-contrast: more\) \{ :root \{([^}]*)\}/)).length >= 2 && low.length === 0 && css.includes('@media (forced-colors: active)') && css.includes('outline-color: Highlight;'), low.join(', '));
  const sec = read(path.join(ROOT, 'docs', 'operations.md'));
  const bullets = sec.slice(sec.indexOf('\n## Yearly audit\n')).split('\n').filter((l) => l.startsWith('- [ ] '));
  const cron = (/cron: '([^']+)'/.exec(read(path.join(ROOT, '.github', 'workflows', 'audit.yml'))) || [])[1] || '';
  ok('the yearly audit opens on the day Sophaxis began, at 09:17 Japan time, with every item of the routine (' + bullets.length + '), and only once a year',
    cron === '17 0 ' + Number(site.since.slice(8, 10)) + ' ' + Number(site.since.slice(5, 7)) + ' *' && bullets.length >= 5 && JSON.stringify(A.items()) === JSON.stringify(bullets)
    && A.body('2027').includes(bullets.join('\n')) && A.title('2027') === 'Yearly audit, 2027' && read(path.join(ROOT, 'tools', 'audit.js')).includes('x.title === title(year)')
    && /permissions:\n  contents: read\n  issues: write\n(?!  \w)/.test(read(path.join(ROOT, '.github', 'workflows', 'audit.yml'))));
  const pol = read(path.join(ROOT, 'policy.md')), polJa = read(path.join(ROOT, 'policy.ja.md'));
  ok('the Policies take no donations and keep decisions independent, in both languages, and every page says in its footer that there are no cookies and no analytics',
    pol.includes('It takes no donations, sponsorship or advertising.') && polJa.includes('寄付・協賛・広告も受けません。') && pol.includes('No repository, funder, institution, author or service can direct a decision.') && polJa.includes('預け先・資金提供者・機関・著者・サービスのどれも、判断を指図できません。')
    && fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html') && f !== '404.html').every((f) => read(path.join(ROOT, 'site', f)).includes('No cookies, no analytics and nothing loaded from other servers (<a href="'))
    && read(path.join(ROOT, 'policies', 'privacy.md')).includes('The Sophaxis site sets no cookies, runs no analytics and loads nothing from other servers.'));
  ok('the search for the name is recorded with its day and its two databases, as a search and not legal advice, with no registration applied for, in both languages',
    read(path.join(ROOT, 'brand.md')).includes('On 2026-11-11 (Japan time), the operator searched J-PlatPat, the database of the Japan Patent Office, and the WIPO Global Brand Database for the name Sophaxis, and found no trade mark of that name.')
    && read(path.join(ROOT, 'brand.md')).includes('it is not legal advice. The operator has not applied to register the name.')
    && read(path.join(ROOT, 'brand.ja.md')).includes('J-PlatPat と、WIPO Global Brand Database で Sophaxis の名を調べ、その名の商標は見つかりませんでした。') && read(path.join(ROOT, 'brand.ja.md')).includes('法的な助言ではありません。'));
}

console.log('\n93. A first preprint, libraries, the policies in brief, advisers\' declarations, moderators, help to check, the risks to data, and a fallback host');
{
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const first = read(path.join(ROOT, 'site', 'first.html'));
  ok('the page on a first preprint lists every accepted repository of site.json (' + Object.keys(site.repositories).length + '), linked to its own page, and compares none of them, in both languages',
    Object.values(site.repositories).every((n) => first.includes(`<li><a href="${site.repositoryHomes[n]}">${n}</a></li>`) && read(path.join(ROOT, 'site', 'first.ja.html')).includes(`<a href="${site.repositoryHomes[n]}">${n}</a>`))
    && read(path.join(ROOT, 'first.md')).includes('Sophaxis does not compare them, and their pages are what count.') && read(path.join(ROOT, 'first.md')).includes('From ' + site.doiAgeFrom + ', Sophaxis lists a work only when six months have passed since its first DOI'));
  const lib = read(path.join(ROOT, 'libraries.md'));
  ok('the page for libraries gives the OAI-PMH address of the site and the formats the interface serves, and the reuse of record data as the Licence Policy words it',
    lib.includes('`' + site.baseUrl + 'oai`') && ['oai_dc', 'oai_openaire'].every((f) => lib.includes('`' + f + '`') && read(path.join(ROOT, 'tools', 'oai.js')).includes(f))
    && read(path.join(ROOT, 'policies', 'licences.md')).includes('The record data in `feed.xml`, `papers.json` and the OAI-PMH interface may be reused freely.') && lib.includes('The record data in `feed.xml`, `papers.json` and the OAI-PMH interface may be reused freely.'));
  const pols = fs.readdirSync(path.join(ROOT, 'policies')).filter((f) => /^[a-z]+\.md$/.test(f)).map((f) => f.replace('.md', ''));
  ok('the policies in brief links every policy (' + pols.length + '), in both languages, and says that it binds no one',
    pols.every((x) => read(path.join(ROOT, 'rules.md')).includes('(./policies/' + x + '.md)') && read(path.join(ROOT, 'rules.ja.md')).includes('(./policies/' + x + '.ja.md)'))
    && read(path.join(ROOT, 'rules.md')).includes('It is a summary and binds no one; each policy, linked below, is what counts.') && read(path.join(ROOT, 'policy.md')).includes('(./rules.md)'));
  const adv = read(path.join(ROOT, 'advisory.md')), advJa = read(path.join(ROOT, 'advisory.ja.md'));
  const items = (t, head) => t.slice(t.indexOf(head)).split('\n').filter((l) => l.startsWith('- ')).length;
  ok('an adviser declares four things before being named, in both languages, and is not named without the declaration',
    adv.includes('Before being named, an adviser declares the following') && adv.includes('An adviser who declares nothing is not named.') && advJa.includes('申告をしない委員は、名を挙げません。')
    && items(adv, 'Before being named') === 4 && items(advJa, '委員は、名を挙げる前に') === 4);
  const mod = read(path.join(ROOT, 'policies', 'moderation.md')), modJa = read(path.join(ROOT, 'policies', 'moderation.ja.md'));
  const conds = (t, head, stop) => { const i = t.indexOf(head); return t.slice(i, t.indexOf(stop, i)).split('\n').filter((l) => l.startsWith('- ')).length; };
  ok('a second moderator is invited only under four conditions, never decides on their own work, and a disagreement is the operator\'s to settle, in both languages',
    conds(mod, 'A second moderator is invited only when all of these hold:', 'A moderator does not decide') === 4 && conds(modJa, '二人目のモデレーターは、次のすべてに当たるときだけ招きます。', 'モデレーターは、自分の作品や') === 4
    && mod.includes('When two moderators disagree, the operator decides, and says so in the issue.') && modJa.includes('二人のモデレーターの意見が分かれたときは、運営者が決め、issue にそう書きます。')
    && mod.includes('under "Research integrity" below') && mod.indexOf('## Research integrity') > mod.indexOf('A second moderator'));
  ok('the accessibility statement asks for help to check, pays nothing, asks nothing beyond the report, and names no reporter who does not ask it, in both languages',
    read(path.join(ROOT, 'accessibility.md')).includes('## Help to check') && read(path.join(ROOT, 'accessibility.md')).includes('Nothing is paid and nothing is asked beyond the report itself.')
    && read(path.join(ROOT, 'accessibility.md')).includes("without the reporter's name unless they ask for it.") && read(path.join(ROOT, 'accessibility.ja.md')).includes('## 確かめる手伝い'));
  const dpia = read(path.join(ROOT, 'docs', 'impact-assessment.md'));
  const risk = dpia.split('\n').filter((l) => /^\| \d+ \|/.test(l)).map((l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  ok('the assessment of the risks to data numbers its ' + risk.length + ' risks from 1, scores each from 1 to 3, multiplies them right, sorts them by the product, and states a measure for each',
    risk.length >= 8 && risk.every((r, i) => r[0] === String(i + 1) && [r[2], r[3]].every((x) => /^[123]$/.test(x)) && Number(r[4]) === Number(r[2]) * Number(r[3]) && r[5].length > 20)
    && risk.every((r, i) => i === 0 || Number(risk[i - 1][4]) >= Number(r[4])) && dpia.includes('it is not legal advice') && read(path.join(ROOT, 'docs', 'operations.md')).includes('(`docs/impact-assessment.md`)'));
  const htmls = fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html') && f !== '404.html');
  const rooted = htmls.filter((f) => /(?:href|src)="\/(?!\/)/.test(read(path.join(ROOT, 'site', f))));
  ok('every page but the one for an address not found links relatively, so that the site can be served from another host under a path (' + htmls.length + ' pages), and the routine says what such a move loses',
    rooted.length === 0 && read(path.join(ROOT, 'docs', 'operations.md')).includes('## If Vercel cannot serve the site') && read(path.join(ROOT, 'docs', 'operations.md')).includes('The OAI-PMH interface at `/oai`'), rooted.slice(0, 5).join(', '));
  const joss = read(path.join(ROOT, 'paper', 'paper.md'));
  ok('the JOSS draft is marked not submitted, names the day its criteria were read, the earliest day, the need for use by others, and the AI usage disclosure it carries',
    joss.includes('Draft. Not submitted.') && joss.includes('read on 2026-11-11') && joss.includes('2027-05-01 at the earliest') && joss.includes('Aspirational statements do not count.') && joss.includes('# AI usage disclosure') && joss.includes('Claude is not an author.'));
}

console.log('\n94. The form in Japanese, subfields, a summary in plain words, and the reading time');
{
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const B = require('../build.js'), I = require('../tools/intake.js');
  const yaml = (f) => read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', f));
  const fields = (t) => [...t.matchAll(/^  - type: (\w+)\n(?:    id: (\w+)\n)?/gm)].map((m) => m[1] + ':' + (m[2] || ''));
  const block = (t, id) => { const i = t.indexOf('    id: ' + id + '\n'); const j = t.indexOf('\n  - type:', i); return t.slice(i, j < 0 ? undefined : j); };
  const opts = (b) => [...b.matchAll(/^        - (?:label: )?"?(.+?)"?$/gm)].map((m) => m[1]);
  const req = (b) => (b.match(/required: (true|false)/g) || []).join();
  const en = yaml('submission.yml'), ja = yaml('submission-ja.yml');
  const ids = fields(en).filter((x) => !x.endsWith(':')).map((x) => x.split(':')[1]);
  const label = (t, id) => (/      label: (.+)/.exec(block(t, id)) || [])[1];
  ok('the Japanese form has the same ' + ids.length + ' fields in the same order and kind, the same required marks, the same English options for every dropdown, and as many boxes in every group',
    JSON.stringify(fields(en)) === JSON.stringify(fields(ja)) && /labels: \["submission"\]/.test(ja) && ja.includes('title: "[Submission] "')
    && ids.every((id) => req(block(en, id)) === req(block(ja, id)) && opts(block(en, id)).length === opts(block(ja, id)).length)
    && ids.filter((id) => /type: dropdown/.test(en.slice(Math.max(0, en.indexOf('    id: ' + id) - 30), en.indexOf('    id: ' + id)))).every((id) => JSON.stringify(opts(block(en, id))) === JSON.stringify(opts(block(ja, id)))));
  ok('the intake reads every field of both forms by its label to the same key, so that the Japanese form is checked exactly as the English one',
    ids.filter((id) => id !== 'confirm').every((id) => { const e = I.parseIssue('### ' + label(en, id) + '\n\nx\n'), j = I.parseIssue('### ' + label(ja, id) + '\n\nx\n'); return Object.keys(e).includes(id) && Object.keys(j).includes(id); })
    && ja.includes('規程や様式の英語の文と食い違うときは、英語の文が適用されます。'));
  ok('the Japanese form names all ' + site.notOffered.length + ' places where Sophaxis is not offered, by their Japanese names, and India for authors under 18',
    block(ja, 'residence').includes('（' + require('../build.js').notOfferedPlacesJa() + '）') && site.notOffered.every((p) => block(ja, 'residence').includes(p.ja)) && block(ja, 'residence').includes('インドに住んでいるか滞在している 18 歳未満の著者の作品も載せません。'));
  const subs = Object.entries(site.subfields).flatMap(([c, d]) => Object.values(d).map((l) => site.categories[c] + ': ' + l));
  ok('both forms offer exactly the ' + subs.length + ' subfields of site.json, each under a category of site.json, and the intake takes one only within the chosen category',
    Object.keys(site.subfields).every((c) => site.categories[c]) && JSON.stringify(opts(block(en, 'subfield'))) === JSON.stringify(subs) && JSON.stringify(opts(block(ja, 'subfield'))) === JSON.stringify(subs)
    && I.subfieldOf({ category: 'mathematics', subfield: 'Mathematics: Game theory' }) === 'game-theory' && I.subfieldOf({ category: 'logic', subfield: 'Mathematics: Game theory' }) === false
    && I.subfieldOf({ category: 'philosophy', subfield: 'Philosophy: Nothing' }) === false && I.subfieldOf({ category: 'philosophy' }) === null);
  const good = { id: '2026.0001', title: 'T', authors: [{ name: 'A' }], abstract: 'x', category: 'mathematics', license: Object.keys(site.licenses)[0], versions: [{ version: 1, doi: '10.5281/zenodo.1', date: '2026-11-01' }], llm_disclosure: 'No generative model was used in writing or developing this work.', issue: 1, listed: '2026-11-01', status: 'listed' };
  const errs = (o) => B.validate(Object.assign({}, good, o), '2026.0001.json').length;
  ok('a record holds a subfield only of its own category, and a summary in plain words only up to ' + I.LAY_MAX + ' characters, and its page shows both',
    errs({ subfield: 'game-theory' }) === 0 && errs({ subfield: 'ethics' }) === 1 && errs({ lay_summary: 'Short.' }) === 0 && errs({ lay_summary: 'x'.repeat(601) }) === 1 && errs({ lay_summary: '' }) === 1 && I.LAY_MAX === 600
    && B.recordPage(Object.assign({}, good, { subfield: 'game-theory', lay_summary: 'Plain & short.' })).includes('<h2>In plain words</h2>\n<p>Plain &amp; short.</p>')
    && B.recordPage(Object.assign({}, good, { subfield: 'game-theory' })).includes('Mathematics</a> · Game theory'));
  const recs = fs.readdirSync(path.join(ROOT, 'data', 'papers')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(read(path.join(ROOT, 'data', 'papers', f))));
  let stats = '';
  try { stats = require('child_process').execFileSync('node', [path.join(ROOT, 'tools', 'pdf_stats.js'), '--check'], { encoding: 'utf8' }); } catch (e) { stats = String(e.stdout || e.message); }
  ok('every PDF copy records its pages and words, the same as pdfinfo and pdftotext count in the file, and the record page shows the reading time from them',
    stats.includes('every recorded count matches its PDF') && recs.filter((p) => p.status !== 'removed' && p.status !== 'withdrawn' && (p.pdfs || []).length).every((p) => {
      const x = p.pdfs[p.pdfs.length - 1];
      return read(path.join(ROOT, 'site', 'abs', p.id + '.html')).includes('<p class="meta">' + B.readingTime(x) + '</p>');
    }) && B.readingTime({ pages: 10, words: 4818 }).includes('roughly 25 minutes at 200 words a minute') && B.readingTime({ pages: 1, words: 100 }).includes('roughly 5 minutes'), stats.trim().split('\n').slice(0, 2).join(' / '));
  const Lm = require('../tools/limits.js');
  const lr = Lm.rows({ busiestDay: 80, pdfTotal: 0, pdfLargest: 0, repoBytes: null });
  ok('the monthly run measures the free limits, warns at 80 percent and only then opens an issue, and the automation page says what it cannot measure, in both languages',
    lr.length === 3 && lr[0][4] === true && lr[1][4] === false && Lm.rows({ busiestDay: 79 })[0][4] === false && Lm.DEPLOYS_PER_DAY === 100 && Lm.WARN === 0.8
    && Lm.busiest(['2026-11-10T14:00:00Z', '2026-11-10T16:00:00Z', '2026-11-11T01:00:00Z']) === 2
    && read(path.join(ROOT, '.github', 'workflows', 'monthly.yml')).includes('node tools/limits.js') && read(path.join(ROOT, 'automation.md')).includes("Vercel's bandwidth and function use are not measured")
    && read(path.join(ROOT, 'automation.ja.md')).includes('Vercel の転送量と関数の使用は測りません。'));
}

console.log('\n95. Every citation of a law in the legal pages is to an article in a text that was fetched, and the pages quote what they cite');
{
  const J = (f) => JSON.parse(read(path.join(ROOT, f)));
  const Cit = require('../tools/citations.js');
  const REG = J('verification/citations.json'), ST = J('verification/statutes.json'), TX = J('verification/statutes-texts.json');
  const RAW = J('verification/sources-raw.json'), PRIM = J('verification/sources.json');
  const sha = (x) => crypto.createHash('sha256').update(x, 'utf8').digest('hex');
  // The weekly watch keeps the texts it records; tools/sources.js fetched the same articles again, and both must agree.
  const badSha = ST.statutes.filter((e) => !TX[e.name + ' ' + e.label] || sha(TX[e.name + ' ' + e.label]) !== e.sha256).map((e) => e.name + ' ' + e.label);
  const disagree = ST.statutes.filter((e) => !e.items).filter((e) => { const r = RAW.sources['egov:' + e.law_id]; const a = e.article.replace(/_/g, '-'); return r && r.sha256 && r.sha256[a] && r.sha256[a] !== e.sha256; }).map((e) => e.name + ' ' + e.label);
  const titles = Object.entries(RAW.sources).filter(([k]) => k.startsWith('egov:')).filter(([k, r]) => { const st = ST.statutes.find((e) => 'egov:' + e.law_id === k); return r.status !== 200 || !r.title || (st && st.title !== r.title); }).map(([k]) => k);
  ok('the texts of the weekly watch (' + ST.statutes.length + ') have the SHA-256 recorded, the same articles fetched by tools/sources.js are the same texts, and every Japanese law fetched has its title',
    badSha.length === 0 && disagree.length === 0 && titles.length === 0, badSha.concat(disagree, titles).join(' / '));
  const C = Cit.compile(REG);
  const all = Cit.all(ROOT, REG, C);
  ok('every numbered citation of a law or of a service\'s terms in the legal pages (' + all.found.length + ') names its law, in the same sentence, paragraph, row or heading',
    all.unattributed.length === 0 && all.found.length >= 600, all.unattributed.map((u) => u.where + ' ' + u.text).join(' / '));
  const T = Cit.trace(all.found, REG, ST, TX, RAW);
  const pairs = (xs) => [...new Set(xs.map((c) => c.law + ' ' + c.article))];
  ok('every citation is to an article in a fetched text (' + T.covered.length + '), and every paragraph, point and item it names is in that article; none is missing',
    T.missing.length === 0 && T.badSub.length === 0, T.missing.concat(T.badSub).map((c) => c.where + ' ' + c.law + ' ' + c.article + (c.sub.length ? '(' + c.sub.join(')(') + ')' : '')).join(' / '));
  // The untraced: each says why, each attempt is in sources-raw.json, none is stale, and the list does not grow.
  const U = REG.untraced || {};
  const cited = new Set(pairs(T.untraced));
  const stale = Object.entries(U).flatMap(([law, u]) => u.articles.filter((a) => !cited.has(law + ' ' + a)).map((a) => law + ' ' + a));
  const unexplained = Object.entries(U).filter(([law, u]) => !u.why || !u.why_ja || (REG.laws[law].source && (() => { const r = RAW.sources[REG.laws[law].source]; return !r || (r.status === 200 && u.articles.some((a) => r.articles && r.articles[a])); })())).map(([law]) => law);
  ok('the citations whose source could not be fetched (' + T.untraced.length + ', of ' + cited.size + ' articles) are each listed with why, and a tried source shows its failure in sources-raw.json; none is stale, and there are no more than 27',
    stale.length === 0 && unexplained.length === 0 && cited.size <= 27, stale.concat(unexplained).join(' / '));
  const named = Object.entries(REG.laws).filter(([, l]) => l.named);
  const texts = REG.files.en.concat(REG.files.ja, REG.files.json).map((f) => read(path.join(ROOT, f))).join('\n');
  const unnamed = named.filter(([, l]) => ![].concat(l.en || [], l.ja || []).some((n) => texts.includes(n))).map(([k]) => k);
  ok('the laws referred to by name only (' + named.length + ', the allow-list) are never cited with an article, have no source, and are each still named',
    T.named.length === 0 && named.every(([, l]) => !l.source && !l.egov) && unnamed.length === 0, T.named.map((c) => c.where + ' ' + c.law).concat(unnamed).join(' / '));
  // The quotations: cut from the fetched article, with only the space before ).,; removed.
  const squeeze = (x) => x.replace(/ ([).,;])/g, '$1');
  const badQuote = Object.entries(PRIM.quotes).filter(([k, q]) => { const t = Cit.textOf(q.law, q.article, REG, ST, TX, RAW); return k !== q.law + ' ' + q.article || !t || !squeeze(t.text).includes(q.quote) || q.quote.length < 40; }).map(([k]) => k);
  ok('the quotations of foreign texts, licences and terms (' + Object.keys(PRIM.quotes).length + ') each occur word for word in the fetched article they name, fetched on ' + RAW.fetched,
    badQuote.length === 0 && PRIM.fetched === RAW.fetched, badQuote.join(' / '));
  // The words that verification/duties.json puts in quotation marks are in the article or recital it names.
  const D = J('verification/duties.json').duties;
  const norm = (x) => x.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ');
  const pool = (u) => {
    if (u.law === 'GDPR' || u.law === 'DSA') { const r = RAW.sources[u.law.toLowerCase()]; return norm(Object.values(r.articles).concat(Object.values(r.recitals || {})).join(' ')); }
    return ['415AC0000000057', '428M60020000003', '415CO0000000507'].map((id) => Object.values(RAW.sources['egov:' + id].articles).join(' ')).join(' ').replace(/\s+/g, '');
  };
  let frags = 0;
  const misquoted = [];
  for (const u of D) {
    const ja = u.law === 'APPI', p = pool(u);
    for (const f of ja ? [...u.duty.matchAll(/「([^」]+)」/g)].map((m) => m[1]) : [...u.duty.matchAll(/"([^"]+)"/g)].map((m) => m[1])) {
      for (const piece of f.split(/…|\.\.\./).map((x) => x.trim()).filter((x) => x.length > 3)) {
        frags++;
        if (!(ja ? p.includes(piece.replace(/\s+/g, '')) : p.includes(norm(piece)))) misquoted.push(u.law + ' ' + u.article + ': ' + piece);
      }
    }
  }
  ok('every quoted fragment in verification/duties.json (' + frags + ') is word for word in the fetched article or recital it names', frags >= 130 && misquoted.length === 0, misquoted.join(' / '));
  // The pages: every section that cites a law ends with a line that names each cited article, and twins name the same.
  const PAGES = [['policies/privacy.md', 'policies/privacy.ja.md', false], ['policies/submission.md', 'policies/submission.ja.md', true], ['policies/takedown.md', 'policies/takedown.ja.md', true],
    ['policies/terms.md', 'policies/terms.ja.md', true], ['policies/moderation.md', 'policies/moderation.ja.md', true], ['contact.md', 'contact.ja.md', true], ['policies/copyright.md', 'policies/copyright.ja.md', true]];
  const marksOf = (t) => [...t.matchAll(/^<!-- text: (.+) -->$/gm)].map((m) => m[1]);
  const valid = (k) => { const m = /^(.+) (\S+)$/.exec(k); if (!m || !REG.laws[m[1]]) return false; if ((U[m[1]] || { articles: [] }).articles.includes(m[2])) return true; return REG.laws[m[1]].egov ? !!Cit.textOf(m[1], m[2], REG, ST, TX, RAW) : !!PRIM.quotes[k]; };
  const unquoted = [], twins = [], invalid = [];
  const RENDERED = REG.files.en.concat(REG.files.ja).filter((f) => !f.startsWith('docs/') && f !== 'README.md');
  for (const f of RENDERED) {
    const t = read(path.join(ROOT, f));
    for (const sec of t.split(/\n(?=## )/)) {
      const keys = marksOf(sec).join('; ').split(';').map((k) => k.trim()).filter(Boolean);
      for (const k of keys) if (!valid(k)) invalid.push(f + ': ' + k);
      const r = Cit.cites(sec, f.endsWith('.ja.md') ? 'ja' : 'en', C, f);
      for (const c of r.found) if (!keys.includes(c.law + ' ' + c.article)) unquoted.push(f + ' (' + sec.split('\n')[0].slice(0, 40) + '): ' + c.law + ' ' + c.article);
    }
  }
  for (const [en, ja, twin] of PAGES) if (twin && marksOf(read(path.join(ROOT, en))).join('|') !== marksOf(read(path.join(ROOT, ja))).join('|')) twins.push(en);
  ok('every section of the rendered legal pages that cites a law names each article it cites in its line of texts, every name has a text or is untraced, and the English and Japanese twins name the same',
    unquoted.length === 0 && invalid.length === 0 && twins.length === 0 && PAGES.every(([en, ja]) => marksOf(read(path.join(ROOT, en))).length > 0 && marksOf(read(path.join(ROOT, ja))).length > 0), unquoted.concat(invalid, twins).join(' / '));
  // The generated pages quote the recorded texts, and nothing else.
  const unhtml = (x) => x.replace(/<br>\n?/g, ' ').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const jpTexts = new Set(Object.values(TX).concat(Object.values(RAW.sources).filter((r) => r.articles && r.shape).flatMap((r) => Object.values(r.articles))));
  const quotes = new Set(Object.values(PRIM.quotes).map((q) => q.quote));
  const badPage = [];
  let nBlocks = 0, nKeys = 0;
  for (const f of RENDERED) {
    const html = read(path.join(ROOT, 'site', f.replace(/\.md$/, '.html')));
    const keys = marksOf(read(path.join(ROOT, f))).flatMap((m) => m.split(';').map((k) => k.trim()));
    const quoted = keys.filter((k) => !(U[/^(.+) (\S+)$/.exec(k)[1]] || { articles: [] }).articles.includes(/ (\S+)$/.exec(k)[1]));
    const ja = [...html.matchAll(/<blockquote lang="ja"><p>([\s\S]*?)<\/p><\/blockquote>/g)].map((m) => unhtml(m[1]));
    // The other quotations, in the language of their source (English, or Russian for kremlin.ru).
    const en = [...html.matchAll(/<blockquote lang="(?!ja")[a-z]{2}"><p>([\s\S]*?)<\/p><\/blockquote>/g)].map((m) => unhtml(m[1]));
    nBlocks += ja.length + en.length; nKeys += quoted.length;
    if (ja.length + en.length !== quoted.length || !ja.every((x) => jpTexts.has(x)) || !en.every((x) => quotes.has(x))) badPage.push(f);
    if (keys.length && !html.includes('fetched on ' + RAW.fetched) && !html.includes(RAW.fetched + ' に取り寄せた')) badPage.push(f + ' (date)');
  }
  ok('the generated pages quote each named text (' + nBlocks + ' quotations for ' + nKeys + ' names) exactly as recorded, with the day it was fetched', badPage.length === 0 && nBlocks === nKeys && nBlocks > 50, badPage.join(' / '));
  ok('each page that quotes says near its top where the quotations come from, in both languages',
    PAGES.every(([en, ja]) => read(path.join(ROOT, en)).split('\n## ')[0].includes('Japanese statutes are quoted in full, as the e-Gov law API gives them. The other texts are quoted word for word from their official sources, as fetched on ' + RAW.fetched + ', and are not translated.')
      && read(path.join(ROOT, ja)).split('\n## ')[0].includes('ほかの文は、公式の出どころから ' + RAW.fetched + ' に取り寄せた文を、語のまま引いています。')));
  // Acts outside the rules: the same rows in both languages, the caution that the list is neither complete nor a finding, and the responsibility.
  const te = read(path.join(ROOT, 'policies', 'terms.md')), tj = read(path.join(ROOT, 'policies', 'terms.ja.md'));
  const rowsIn = (t, h) => { const i = t.indexOf('\n## ' + h + '\n'); const j = t.indexOf('\n## ', i + 5); return i < 0 ? -1 : t.slice(i, j).split('\n').filter((l) => /^\| [^-]/.test(l)).length - 1; };
  const nEn = rowsIn(te, 'Acts outside these rules that may come near a law'), nJa = rowsIn(tj, '規約の外で、法令の要件に近づく行い');
  ok('the Terms list acts outside them that may come near a law (' + nEn + ' rows) in both languages, say that the list is neither complete nor a finding, and that the person who did it is responsible, except where the law makes the operator so',
    nEn >= 8 && nEn === nJa
    && te.includes('The table lists possible paths only. It is not complete. It does not say that a listed act is unlawful, or that an act not listed is lawful.')
    && tj.includes('表は起こりうる道を挙げたものです。すべてを挙げてはいません。挙げた行いが違法であると言うものでも、挙げていない行いが適法であると言うものでもありません。')
    && te.includes('The responsibility for an act done against these terms, or outside them, lies with the person who did it.') && te.includes('Except where the law makes the operator responsible, the operator is not responsible for such acts.')
    && tj.includes('この規約に反して、または規約の外で行われた行いの責任は、行った本人にあります。') && tj.includes('法令が運営者に責任を負わせる場合を除き、運営者は、そうした行いについて責任を負いません。')
    && te.includes('This does not exclude or limit the operator\'s liability for loss that the operator causes by intent or negligence')
    && read(path.join(ROOT, 'disclaimer.md')).includes('Except where the law makes the operator responsible, the operator is not responsible for such acts.')
    && read(path.join(ROOT, 'disclaimer.ja.md')).includes('法令が運営者に責任を負わせる場合を除き、運営者は、そうした行いについて責任を負いません。'));
  const wf = read(path.join(ROOT, '.github', 'workflows', 'sources.yml'));
  ok('the texts are fetched only when the operator runs it, onto a new branch sources/<date>, never main',
    /on:\n  workflow_dispatch:\n(?!\s+push)/.test(wf) && !/\n  push:|\n  schedule:|\n  pull_request:/.test(wf) && wf.includes('git push origin "HEAD:refs/heads/sources/$(date -u +%Y%m%d-%H%M)"') && !/push origin (?:main|HEAD:main)/.test(wf));
}

console.log('\n96. Links that work on GitHub and on the site, sections linked near the top, and every box of the forms enforced and listed');
{
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const B = require('../build.js'), I = require('../tools/intake.js'), M = require('../tools/mdlinks.js');
  // D. Every relative link in every Markdown file of the repository leads to a file that is there, and to a heading GitHub gives that id.
  const scan = M.scan(ROOT);
  ok('every relative link in the ' + scan.files + ' Markdown files (' + scan.links + ' links) leads to a file of the repository, and every link to a section to a heading of that file',
    scan.files >= 70 && scan.links >= 400 && scan.bad.length === 0, scan.bad.slice(0, 6).map((b) => b[0] + ':' + b[1] + ' ' + b[2] + ' (' + b[3] + ')').join(' / '));
  // A source links a built page by its address on the site only when no Markdown source is built into it; then build.js maps it back to a relative link.
  const pagesBuilt = [...B.SOURCE_PAGES.values()];
  const toSite = [];
  M.markdownFiles(ROOT).forEach((f) => M.links(read(path.join(ROOT, f))).forEach(([n, t]) => {
    if (B.SOURCE_PAGES.has(f) && t.startsWith(site.baseUrl) && pagesBuilt.includes(t.slice(site.baseUrl.length).split('#')[0])) toSite.push(f + ':' + n + ' ' + t);
    if (/^\.{1,2}\/.*\.html(#|$)/.test(t)) toSite.push(f + ':' + n + ' ' + t);
  }));
  ok('no Markdown file links a built page as .html, and no source of a page links by its address a page that has a Markdown source (' + pagesBuilt.length + ' pages built from sources)',
    toSite.length === 0 && pagesBuilt.every((p) => fs.existsSync(path.join(ROOT, 'site', p))), toSite.slice(0, 5).join(' / '));
  ok('build.js maps a source to its page, keeps the section, sends the site relatively and a source that is not built to GitHub',
    B.sitePath('./terms.md#disputes', 'policies/submission.md', 'policies/submission.html') === './terms.html#disputes'
    && B.sitePath('../contact.ja.md', 'policies/terms.ja.md', 'policies/terms.ja.html') === '../contact.ja.html'
    && B.sitePath('./policies/terms.md', 'faq.md', 'faq.html') === './policies/terms.html'
    && B.sitePath(site.baseUrl + 'stats.html', 'policies/moderation.md', 'policies/moderation.html') === '../stats.html'
    && B.sitePath(site.baseUrl, 'faq.md', 'faq.html') === './index.html'
    && B.sitePath('../docs/operations.md#yearly-audit', 'policies/moderation.md', 'policies/moderation.html') === site.repo + '/blob/main/docs/operations.md#yearly-audit'
    && B.sitePath('./templates/paper.md', 'checklist.md', 'checklist.html') === null && B.sitePath('https://doi.org/10.1/x', 'faq.md', 'faq.html') === null);
  // B. Every page built from a Markdown source with two sections or more lists them near its top, in its language, with the ids GitHub gives them.
  const missing = [];
  for (const [src, html] of B.SOURCE_PAGES) {
    const h = read(path.join(ROOT, 'site', html));
    const ids = [...h.matchAll(/<h2 id="([^"]+)">/g)].map((m) => m[1]);
    const toc = (/<nav class="toc" aria-label="([^"]+)"><p>\1<\/p><ul>([\s\S]*?)<\/ul><\/nav>\n<h2 /.exec(h) || []);
    const listed = [...String(toc[2] || '').matchAll(/<li><a href="#([^"]+)">/g)].map((m) => m[1]);
    const gh = M.anchors(read(path.join(ROOT, src)));
    const ja = /\.ja\.md$/.test(src) || src === 'policies/privacy.ja.md';
    if (ids.length !== (h.match(/<h2[ >]/g) || []).length) missing.push(html + ': a section without an id');
    if (ids.length >= 2 && (JSON.stringify(listed) !== JSON.stringify(ids) || toc[1] !== (ja ? 'この頁の節' : 'On this page') || h.indexOf('<nav class="toc"') > h.indexOf('<h2 '))) missing.push(html + ': no list of its sections before the first');
    if (ids.length < 2 && h.includes('class="toc"')) missing.push(html + ': a list of one section');
    const fromSource = (read(path.join(ROOT, src)).match(/^## /gm) || []).length;
    if (ids.slice(0, fromSource).some((id) => !gh.has(id)) && !['policy.md', 'policy.ja.md'].includes(src)) missing.push(html + ': an id that GitHub does not give: ' + ids.filter((id) => !gh.has(id)).join(','));
  }
  const withToc = [...B.SOURCE_PAGES.values()].filter((p) => read(path.join(ROOT, 'site', p)).includes('<nav class="toc"'));
  ok('every page built from a source (' + B.SOURCE_PAGES.size + '), English and Japanese, gives each section the id GitHub gives it, and the ' + withToc.length + ' with two sections or more list them before the first',
    missing.length === 0 && withToc.length >= 60 && withToc.filter((p) => !/\.ja\.html$/.test(p)).length >= 30, missing.slice(0, 5).join(' / '));
  ok('the list of sections is hidden on paper, so that the leaflet still fits one sheet', /@media print \{[^}]*\.toc[^}]*\{ display: none; \}/.test(read(path.join(ROOT, 'site', 'leaflet.html'))));
  // C. Both forms have the same required boxes in the same order; each starts "I agree" or "I confirm", or ends 「に同意します」 or 「を確かめました」.
  const yml = (f) => read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', f));
  const [en, ja] = I.FORMS.map((f) => I.formBoxes(yml(f)));
  const groups = Object.keys(I.BOXES_FROM);
  const total = groups.reduce((a, g) => a + (en[g] || []).length, 0);
  const strip = (l) => l.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  ok('both forms have the same ' + total + ' required boxes in the same groups and order (' + groups.map((g) => g + ' ' + (en[g] || []).length).join(', ') + '), and the box on the Internet Archive in neither',
    JSON.stringify(Object.keys(en)) === JSON.stringify(Object.keys(ja)) && groups.every((g) => (en[g] || []).length > 0 && (en[g] || []).length === (ja[g] || []).length)
    && (en.archive || []).length === 1 && (ja.archive || []).length === 1 && Object.keys(en).filter((g) => !groups.includes(g)).join() === 'archive' && total >= 25);
  const badWords = groups.flatMap((g) => en[g].filter((l) => !/^I (agree|confirm) /.test(l)).concat(ja[g].filter((l) => !/(に同意します|を確かめました)。$/.test(strip(l).replace(/（[^）]*）。$/, '。')))))
    .concat(en.archive.filter((l) => !/^I confirm /.test(l)), ja.archive.filter((l) => !/を確かめました。$/.test(l)));
  ok('each box is one sentence that starts "I agree" or "I confirm", or ends 「に同意します」 or 「を確かめました」, and links to its section on the site',
    badWords.length === 0 && groups.every((g) => en[g].concat(ja[g]).every((l) => (strip(l).match(/[.。](?=.)/g) || []).filter((x) => x === '。').length === 0 && [...l.matchAll(/\]\(([^)]+)\)/g)].every((m) => m[1].startsWith(site.baseUrl)))),
    badWords.slice(0, 3).join(' / '));
  // Every link of a box leads to a page and section that the site has.
  const deadBox = groups.flatMap((g) => en[g].concat(ja[g])).flatMap((l) => [...l.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1].slice(site.baseUrl.length)))
    .filter((u) => { const [p, id] = u.split('#'); return !fs.existsSync(path.join(ROOT, 'site', p)) || (id && !read(path.join(ROOT, 'site', p)).includes(' id="' + id + '"')); });
  ok('every link in a box leads to a page of the site, and to a section that it has', deadBox.length === 0, deadBox.join(', '));
  // Each required box is enforced by the intake: with every box of its group ticked but that one, the check fails; with all ticked, it passes.
  const fx = I.parseIssue(read(path.join(__dirname, 'fixtures', 'intake', 'issue.md')));
  const dcx = I.fromDataCite(JSON.parse(read(path.join(__dirname, 'fixtures', 'intake', 'datacite.json'))));
  const personx = I.orcidPerson(JSON.parse(read(path.join(__dirname, 'fixtures', 'intake', 'orcid-person.json'))));
  const worksx = I.orcidDois(JSON.parse(read(path.join(__dirname, 'fixtures', 'intake', 'orcid-works.json'))));
  const day = [site.consentFrom, site.residenceFrom, site.llmExtentFrom].sort().pop();
  const full = (lang) => Object.assign({}, fx, { llm_extent: site.llmExtents.assistance }, ...groups.map((g) => ({ [g]: I.allTicked(g, lang) })));
  const runB = (form) => I.check({ form, login: 'jcarberry', meta: dcx, person: personx, works: worksx, today: day });
  const unenforced = [];
  for (const lang of [0, 1]) {
    groups.forEach((g) => (lang ? ja : en)[g].forEach((label, i) => {
      const f = full(lang);
      f[g] = f[g].split('\n').map((l, j) => (j === i ? l.replace('- [X] ', '- [ ] ') : l)).join('\n');
      const r = runB(f);
      if (r.ok || !r.checks.some((c) => c[0] === I.BOX_LABELS[g] && !c[1] && c[2].includes('not ticked: ' + (i + 1)))) unenforced.push((lang ? 'ja ' : 'en ') + g + ' ' + (i + 1));
      const gone = Object.assign({}, full(lang), { [g]: f[g].split('\n').filter((l, j) => j !== i).join('\n') });
      if (runB(gone).ok) unenforced.push((lang ? 'ja ' : 'en ') + g + ' ' + (i + 1) + ' removed');
    }));
  }
  const noGroup = groups.filter((g) => runB(Object.assign({}, full(0), { [g]: '' })).ok);
  ok('the intake refuses a submission unless every one of the ' + total + ' required boxes is ticked, in either form, and passes it when all are; the box on the Internet Archive is never required',
    runB(full(0)).ok && runB(full(1)).ok && unenforced.length === 0 && noGroup.length === 0
    && runB(Object.assign({}, full(0), { archive: '- [ ] ' + en.archive[0] })).ok && !('archive' in I.BOXES), unenforced.concat(noGroup).slice(0, 6).join(', '));
  // The Submission Policy lists the same boxes, in the same words (links aside) and order, in both languages, and states their number.
  const listOf = (t, head) => { const i = t.indexOf('\n## ' + head + '\n'); const j = t.indexOf('\n## ', i + 4); return t.slice(i, j).split('\n').filter((l) => l.startsWith('- ')).map((l) => strip(l.slice(2))); };
  const se = read(path.join(ROOT, 'policies', 'submission.md')), sj = read(path.join(ROOT, 'policies', 'submission.ja.md'));
  const want = (lang) => groups.flatMap((g) => (lang ? ja : en)[g]).map(strip);
  ok('the Submission Policy, under "What the submitter confirms", lists the ' + total + ' boxes of the forms in their words and order, in both languages, and says how many there are',
    JSON.stringify(listOf(se, 'What the submitter confirms')) === JSON.stringify(want(0)) && JSON.stringify(listOf(sj, '投稿者が確認すること')) === JSON.stringify(want(1))
    && se.includes('which has the same ' + total + ' boxes, in the same words and order.') && sj.includes('様式には、同じ ' + total + ' のボックスが、同じ言葉と順で並んでいます。')
    && se.includes('the consent and agreement from ' + site.consentFrom + ', and where the authors live from ' + site.residenceFrom + '.'));
}

console.log('\n97. The type and status of Sophaxis, the links of its archive, the counts and the operator\'s own work on the top page, a first submission, the OpenDOAR draft, and the quoted statutes watched');
{
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const B = require('../build.js');
  const readme = read(path.join(ROOT, 'README.md'));
  const firstLineAfter = (t, head) => { const i = t.indexOf(head + '\n'); return i < 0 ? null : (t.slice(i + head.length + 1).split('\n').find((l) => l.trim()) || null); };
  // The label under each title, in both languages, and the type of the citation files.
  const z = JSON.parse(read(path.join(ROOT, '.zenodo.json')));
  ok('the README says "Type: Project · Status: Running" under its title and "種類：プロジェクト　状態：運営中" under "## 日本語"; CITATION.cff and .zenodo.json give the type software',
    readme.startsWith('# Sophaxis\n') && firstLineAfter(readme, '# Sophaxis') === 'Type: Project · Status: Running' && firstLineAfter(readme, '\n## 日本語') === '種類：プロジェクト　状態：運営中'
    && /^type: software$/m.test(read(path.join(ROOT, 'CITATION.cff'))) && z.upload_type === 'software');
  // The archive names the DOI of every version of each work shown as a source it is derived from, with the relations kept to three.
  const recs = fs.readdirSync(path.join(ROOT, 'data', 'papers')).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(read(path.join(ROOT, 'data', 'papers', f))));
  const shown = recs.filter((p) => p.status !== 'removed');
  const rel = z.related_identifiers || [];
  const derived = rel.filter((r) => r.relation === 'isDerivedFrom').map((r) => r.identifier);
  const wantDois = shown.flatMap((p) => p.versions.map((v) => v.doi));
  const lacking = wantDois.filter((d) => !derived.includes(d));
  ok('.zenodo.json names, as isDerivedFrom, the DOI of every version of each record shown (' + wantDois.length + '), each a DOI once, and uses no relation but isPartOf, isSupplementTo and isDerivedFrom',
    lacking.length === 0 && rel.every((r) => ['isPartOf', 'isSupplementTo', 'isDerivedFrom'].includes(r.relation))
    && rel.filter((r) => r.relation === 'isDerivedFrom').every((r) => r.scheme === 'doi' && /^10\.\d{4,9}\/\S+$/.test(r.identifier)) && new Set(derived).size === derived.length,
    lacking.length ? 'add to .zenodo.json: ' + lacking.join(', ') : '');
  ok('the README, in both languages, and the routine say that the archive is derived from the listed works from the next release, and how the list is kept',
    readme.includes('(`isDerivedFrom` in `.zenodo.json`)') && readme.includes('（`.zenodo.json` の `isDerivedFrom`）')
    && read(path.join(ROOT, 'docs', 'operations.md')).includes('add the DOI of each of its versions to `related_identifiers` in `.zenodo.json` with the relation `isDerivedFrom`')
    && read(path.join(ROOT, 'docs', 'operations.md')).includes('A removal does not change the file, so that nothing delays it.'));
  // The operating counts on the top page, counted again here from data/reports and the records.
  const reps = fs.readdirSync(path.join(ROOT, 'data', 'reports')).filter((f) => /^\d{4}\.json$/.test(f)).sort().map((f) => JSON.parse(read(path.join(ROOT, 'data', 'reports', f))));
  const last = reps[reps.length - 1];
  const listedN = recs.filter((p) => p.status === 'listed').length, removedN = recs.filter((p) => p.status === 'removed').length;
  const idx = read(path.join(ROOT, 'site', 'index.html')), idxJa = read(path.join(ROOT, 'site', 'index.ja.html'));
  const med = last.daysToDecision.median;
  const en = 'in ' + last.year + (last.complete ? '' : ' (counted up to ' + last.asOf + ')') + ', ' + last.submissions.opened + ' submission' + (last.submissions.opened === 1 ? '' : 's') + ' received and ' + last.submissions.accepted + ' accepted; median days from submission to a decision: ' + (med === null ? '–' : med) + '. Listed now: ' + listedN + '.' + (removedN ? ' Removed: ' + removedN + '.' : '');
  const ja = last.year + ' 年' + (last.complete ? '' : '（' + last.asOf + ' までの数）') + 'の受付 ' + last.submissions.opened + ' 件、受理 ' + last.submissions.accepted + ' 件、投稿から判断までの日数の中央値 ' + (med === null ? '–' : med + ' 日') + '。いま載っている作品 ' + listedN + ' 件' + (removedN ? '、削除した記録 ' + removedN + ' 件' : '') + '。';
  ok('the top page, in both languages, gives the submissions received and accepted and the median days to a decision of the latest year recorded, and the records listed now, as counted from data/reports and the records',
    idx.includes('Operating counts, from the records: ' + en) && idxJa.includes('運営の数（記録から作っています）：' + ja), en);
  const oc = B.operatingCounts([{ status: 'listed' }], [{ year: 2030, complete: true, asOf: '2031-01-02', submissions: { opened: 1, accepted: 0 }, daysToDecision: { median: null } }]);
  ok('the counts read one submission in the singular, a year with no decision as “–”, and no year as none counted',
    oc.includes('in 2030, 1 submission received and 0 accepted; median days from submission to a decision: –. Listed now: 1.') && B.operatingCounts([], []).includes('No year has been counted yet.'));
  // The operator's own work: said on the top page from the records, and marked in the listing.
  const own = shown.filter((p) => p.operator_own === true).length;
  const every = own > 0 && own === shown.length;
  const flags = (idx.split('<ol class="list">')[1] || '').split('operator’s own submission</span>').length - 1;
  ok('the top page says, from the records, how many of the works shown are the operator’s own (' + own + ' of ' + shown.length + '), that Sophaxis is not a shelf for them, and marks each in the listing',
    idx.includes(every ? 'Every work listed so far is by the operator (' + own + ' of the ' + shown.length + ' records shown).' : own + ' of the ' + shown.length + ' records shown')
    && idx.includes('is not a shelf for the operator’s own work: it lists work by any researcher in its fields.')
    && idxJa.includes(every ? 'これまでに載った作品は、すべて運営者のものです（示している記録 ' + shown.length + ' 件のうち ' + own + ' 件）。' : '示している記録 ' + shown.length + ' 件のうち ' + own + ' 件は、運営者の作品です。')
    && idxJa.includes('Sophaxis は運営者の作品を並べるための場ではありません。') && flags === own, flags + ' flags');
  const mixed = [{ status: 'listed', operator_own: true }, { status: 'listed' }, { status: 'removed', operator_own: true }];
  ok('when another researcher’s work is shown, the notice gives the share and no longer says “every”; with none of the operator’s, it is not shown',
    B.ownNotice(mixed).includes('1 of the 2 records shown is the operator’s own submissions.') && !B.ownNotice(mixed).includes('Every work') && !B.ownNotice(mixed, true).includes('すべて')
    && B.ownNotice([{ status: 'listed' }]) === '' && B.ownNotice([{ status: 'listed' }], true) === '');
  ok('the call in Japanese says that every work listed so far is the operator’s only while that is true',
    read(path.join(ROOT, 'call.ja.md')).includes('これまでに載った作品は、すべて運営者のものです。') === shown.every((p) => p.operator_own === true));
  // The page for a first submission from another researcher: the call, in both languages, pointing to the first-preprint page and back.
  const call = read(path.join(ROOT, 'call.md')), callJa = read(path.join(ROOT, 'call.ja.md'));
  ok('the call, in both languages, has a section for a first submission from another researcher that sends to the first-preprint page, the checklist and the steps, with the day of vouching from site.json; the first-preprint page links back',
    call.includes('## A first submission from another researcher') && ['(./first.md)', '(./checklist.md)', '(./process.md)'].every((l) => call.split('## A first submission from another researcher')[1].split('\n## ')[0].includes(l))
    && call.includes('- From ' + site.vouchFrom + ', a first submission needs a researcher to vouch for it.')
    && callJa.includes('## ほかの研究者からの最初の投稿') && ['(./first.ja.md)', '(./checklist.ja.md)', '(./process.ja.md)'].every((l) => callJa.split('## ほかの研究者からの最初の投稿')[1].split('\n## ')[0].includes(l))
    && callJa.includes('- ' + site.vouchFrom + ' から、初めての投稿には、作品を紹介する研究者一人が要ります。')
    && read(path.join(ROOT, 'first.md')).includes('[A call to researchers](./call.md)') && read(path.join(ROOT, 'first.ja.md')).includes('[研究者の方へ](./call.ja.md)'));
  // The OpenDOAR draft: marked a draft, its facts those of site.json and the code, and no address written in it.
  const od = read(path.join(ROOT, 'docs', 'opendoar.md'));
  const line = (k) => ((new RegExp('^- ' + k + ': (.+)$', 'm').exec(od)) || [])[1] || '';
  const subjects = line('Subjects').split(', ');
  const oai = read(path.join(ROOT, 'tools', 'oai.js'));
  const pol = [...od.matchAll(/\(https:\/\/sophaxis\.vercel\.app\/policies\/([a-z]+)\.html\)/g)].map((m) => m[1]);
  ok('docs/opendoar.md is marked as a draft not sent, and its address, OAI-PMH base URL, formats, subjects, start, operator, identifiers and policy links agree with site.json and the code; it writes no email address',
    od.startsWith('# Draft: the application to OpenDOAR\n\nDraft, not sent.') && line('Address') === site.baseUrl && line('OAI-PMH base URL') === site.baseUrl + 'oai'
    && line('Metadata formats') === '`oai_dc` and `oai_openaire`' && oai.includes('oai_dc') && oai.includes('oai_openaire')
    && subjects.length === Object.keys(site.categories).length && Object.values(site.categories).every((c) => subjects.includes(c))
    && line('Began') === site.since && line('Organisation').includes('(ORCID ' + site.operator.orcid + ')') && line('Identifiers of Sophaxis itself').includes('DOI ' + site.osf.doi + ';') && line('Identifiers of Sophaxis itself').includes('DOI ' + site.zenodo.doi + ' (every version)')
    && pol.length >= 7 && pol.every((p) => fs.existsSync(path.join(ROOT, 'policies', p + '.md'))) && !/@/.test(od)
    && readme.includes('The application is drafted in [docs/opendoar.md](docs/opendoar.md).') && readme.includes('申請の文は [docs/opendoar.md](docs/opendoar.md) に下書きしてあります。')
    && read(path.join(ROOT, 'docs', 'operations.md')).includes('The application to OpenDOAR is drafted in [opendoar.md](./opendoar.md)'), pol.join(', '));
  // Every Japanese article that a page quotes is one the weekly watch confirms.
  const REG = JSON.parse(read(path.join(ROOT, 'verification', 'citations.json'))), ST = JSON.parse(read(path.join(ROOT, 'verification', 'statutes.json')));
  const mdFiles = ['contact.md', 'contact.ja.md'].concat(fs.readdirSync(path.join(ROOT, 'policies')).map((f) => 'policies/' + f));
  const unwatched = [];
  for (const f of mdFiles) for (const m of read(path.join(ROOT, f)).matchAll(/<!-- text: ([^>]*) -->/g)) for (const k of m[1].split('; ')) {
    const mm = /^(.+) (\S+)$/.exec(k); const L = mm && REG.laws[mm[1]];
    if (L && L.egov && !ST.statutes.some((e) => e.law_id === L.egov && e.article === mm[2].replace(/-/g, '_'))) unwatched.push(f + ': ' + k);
  }
  const pages = fs.readdirSync(path.join(ROOT, 'site', 'policies')).map((f) => 'policies/' + f).concat(['contact.html', 'contact.ja.html']);
  ok('every Japanese article that a policy or the contact page quotes is one the weekly watch confirms, and no page says one is not yet among them',
    unwatched.length === 0 && pages.every((f) => !read(path.join(ROOT, 'site', f)).includes('It is not yet among the texts the weekly watch confirms.') && !read(path.join(ROOT, 'site', f)).includes('まだ週に一度の見張りには入っていません。')), unwatched.join(' / '));
}

/* ------------------------------------------------------------ 98 */
console.log('\n98. No dependencies, workflows with the least they need, pinned actions, and a scan for keys and addresses');
{
  const cp = require('child_process');
  const tracked = cp.execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean);
  /* No package to install: no lockfile and no node_modules, a package.json (if one is added) with no dependencies,
   * and every module required by name is one of Node.js. playwright, for the browser, is the one exception, in the two tools that draw or drive a page. */
  const locks = tracked.filter((f) => /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|node_modules\/)/.test(f));
  const pkg = tracked.includes('package.json') ? JSON.parse(read(path.join(ROOT, 'package.json'))) : {};
  const deps = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'].filter((k) => pkg[k] && Object.keys(pkg[k]).length);
  const builtins = new Set(require('module').builtinModules);
  const BROWSER = ['verification/check_keyboard.js', 'tools/cards.js'];
  const foreign = tracked.filter((f) => f.endsWith('.js')).flatMap((f) => [...read(path.join(ROOT, f)).matchAll(/\brequire\(\s*'([^']+)'\s*\)/g)].map((m) => [f, m[1]]))
    .filter(([f, m]) => !m.startsWith('.') && !builtins.has(m.replace(/^node:/, '')) && !(m === 'playwright' && BROWSER.includes(f))).map(([f, m]) => f + ': ' + m);
  ok('nothing is installed from a package registry: no lockfile or node_modules, no dependencies, and every module required by name is part of Node.js (playwright only in ' + BROWSER.join(' and ') + ')',
    locks.length === 0 && deps.length === 0 && foreign.length === 0, locks.concat(deps, foreign).join(', '));
  const wfDir = path.join(ROOT, '.github', 'workflows');
  const wfs = fs.readdirSync(wfDir).filter((f) => /\.ya?ml$/.test(f)).map((f) => ({ f, t: read(path.join(wfDir, f)) }));
  const installs = wfs.flatMap(({ f, t }) => [...t.matchAll(/npm (?:install|i|ci)\b([^\n]*)/g)].map((m) => f + ':' + m[1].trim()));
  ok('the only package a workflow installs is playwright, at an exact version, for the browser check (' + installs.join(', ') + ')',
    installs.length === 1 && /^check\.yml:-g playwright@\d+\.\d+\.\d+$/.test(installs[0]), installs.join(', '));
  /* Least privilege: every workflow says what its token may do, at the top, and asks for writing only where it writes. */
  const perms = (t) => { const m = /^permissions:\n((?:  [a-z-]+: (?:read|write)\n)+)/m.exec(t); return m ? Object.fromEntries([...m[1].matchAll(/  ([a-z-]+): (read|write)/g)].map((x) => [x[1], x[2]])) : null; };
  const noPerm = wfs.filter(({ t }) => !perms(t)).map(({ f }) => f);
  const broad = wfs.filter(({ t }) => /write-all|read-all|^\s+permissions: (?:write|read)/m.test(t) || /^ {4}permissions:/m.test(t)).map(({ f }) => f);
  const pushes = (t) => /git push/.test(t) || [...t.matchAll(/node (tools\/\w+\.js)/g)].some((m) => /'push'|git push|\['push'/.test(read(path.join(ROOT, m[1]))));
  const writesUnused = wfs.filter(({ t }) => { const p = perms(t) || {}; return (p.contents === 'write' && !pushes(t)) || (p['pull-requests'] === 'write' && !/pull/.test(t.replace(/^permissions:[\s\S]*?\n(?! )/m, '') + [...t.matchAll(/node (tools\/\w+\.js)/g)].map((m) => read(path.join(ROOT, m[1]))).join(''))); }).map(({ f }) => f);
  ok('every workflow (' + wfs.length + ') declares the permissions of its token at the top, none per job or in bulk, and the checks only read',
    noPerm.length === 0 && broad.length === 0 && JSON.stringify(perms(read(path.join(wfDir, 'check.yml')))) === '{"contents":"read"}', noPerm.concat(broad).join(', '));
  ok('a workflow may write the repository only if it pushes, and open pull requests only if it makes them', writesUnused.length === 0, writesUnused.join(', '));
  /* Every action is pinned to the full commit, with its tag in a comment; Dependabot updates both together. */
  const uses = wfs.flatMap(({ f, t }) => [...t.matchAll(/^\s*-?\s*uses: (\S+)(.*)$/gm)].map((m) => ({ f, ref: m[1], rest: m[2] })));
  const loose = uses.filter((u) => !u.ref.startsWith('./') && !(/@[0-9a-f]{40}$/.test(u.ref) && /^ # v\d[\w.]*$/.test(u.rest))).map((u) => u.f + ': ' + u.ref + u.rest);
  const sha = {}; uses.forEach((u) => { const [a, s] = u.ref.split('@'); (sha[a] = sha[a] || new Set()).add(s + u.rest); });
  ok('every action (' + uses.length + ' uses) is pinned to a full commit with its tag in a comment, and each action to one commit everywhere',
    uses.length > 0 && loose.length === 0 && Object.values(sha).every((s) => s.size === 1), loose.join(', '));
  /* The scan for keys, tokens and addresses: every file in the repository that is text, the built site included. */
  const KEYS = [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, /\bgh[pousr]_[A-Za-z0-9]{36}\b/, /\bgithub_pat_[A-Za-z0-9_]{60,}/, /\bAKIA[0-9A-Z]{16}\b/, /\bxox[abprs]-[A-Za-z0-9-]{10,}/, /\bAIza[0-9A-Za-z_-]{35}\b/, /\bsk-(?:ant-)?[A-Za-z0-9_-]{32,}/];
  const MAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
  /* The address given in OAI-PMH Identify (site.json oai.adminEmails, the same as on the operator's ORCID record), the Internet Archive's and
   * Creative Commons' published addresses, quoted where their process or text is quoted, and the address of the commit trailers. */
  const site98 = JSON.parse(read(path.join(ROOT, 'site.json')));
  /* The example address that the Personal Information Protection Commission's Guidelines print in their own text (example.com is
   * reserved for examples), kept where tools/sources.js keeps the Guidelines. */
  const ALLOWED = [...site98.oai.adminEmails, 'info@archive.org', 'info@creativecommons.org', 'noreply@anthropic.com', 'kojin_ichiro@example.com'];
  const PHONE = /(?:\+81[ -]?|\b0)[789]0[ -]?\d{4}[ -]?\d{4}\b/;
  const scan = (files, at) => {
    const hits = [];
    for (const f of files) {
      const buf = fs.readFileSync(path.join(at, f));
      if (buf.includes(0) || /\.(pdf|png|ico|jpe?g|gif|webp)$/i.test(f)) continue;
      const t = buf.toString('utf8');
      KEYS.forEach((re) => { if (re.test(t)) hits.push(f + ': ' + re.source.slice(0, 18)); });
      (t.match(MAIL) || []).filter((m) => !ALLOWED.includes(m) && !m.endsWith('@users.noreply.github.com')).forEach((m) => hits.push(f + ': ' + m));
      if (PHONE.test(t)) hits.push(f + ': a telephone number');
    }
    return hits;
  };
  const hits = scan(tracked, ROOT);
  ok('no file of the repository (' + tracked.length + ') holds a private key, a token, a telephone number or an email address other than the ' + ALLOWED.length + ' allowed',
    site98.oai.adminEmails.length === 1 && hits.length === 0, hits.slice(0, 8).join(', '));
  /* The scan must catch what it looks for: a key, a token and an address, written into a scratch copy. */
  const probe = tmp();
  fs.writeFileSync(path.join(probe, 'a.md'), 'x ' + 'ghp_' + 'A'.repeat(36) + '\n');
  fs.writeFileSync(path.join(probe, 'b.json'), '"someone' + '@' + 'example.org"\n');
  fs.writeFileSync(path.join(probe, 'c.txt'), '-----BEGIN ' + 'RSA PRIVATE KEY-----\n');
  fs.writeFileSync(path.join(probe, 'd.md'), 'call 090-' + '1234-5678\n');
  ok('the scan finds a planted token, address, private key and telephone number', scan(['a.md', 'b.json', 'c.txt', 'd.md'], probe).length === 4);
  const autoEn = read(path.join(ROOT, 'automation.md')), autoJa = read(path.join(ROOT, 'automation.ja.md'));
  const cron98 = (/schedule:\n(?:\s*#.*\n)*\s*- cron: '(\d+) (\d+) \* \* (\d)'/.exec(read(path.join(wfDir, 'check.yml'))) || []).slice(1).map(Number);
  const jst = cron98.length ? String((cron98[1] + 9) % 24).padStart(2, '0') + ':' + String(cron98[0]).padStart(2, '0') : '';
  ok('the checks also run once a week on Monday, at the time the automation page gives in both languages (' + jst + ' Japan time), and the page names the scan',
    cron98[2] === 1 && cron98[1] + 9 < 24 && autoEn.includes('once a week, on Monday at ' + jst + ' Japan time') && autoJa.includes('月曜日の日本時間 ' + jst + ' にも')
    && autoEn.includes('a scan of every file in the repository for keys, tokens and email addresses') && autoJa.includes('鍵・トークンと、検査が認めた少数のほかのメールアドレスを探す走査'));
  const sec = fs.existsSync(path.join(ROOT, 'SECURITY.md')) ? read(path.join(ROOT, 'SECURITY.md')) : '';
  ok('SECURITY.md, in Japanese and English, sends a security problem by email to the address on the ORCID record, not to a public issue, with the 7 days and no bounty of the contact page',
    ['## 日本語', '## English', 'https://orcid.org/0009-0000-1406-0547', 'security.txt', '7 日以内', 'within 7 days', 'There is no bounty.', '報奨金はありません。'].every((x) => sec.includes(x))
    && read(path.join(ROOT, 'contact.md')).includes('A security problem goes by email, not to a public issue') && read(path.join(ROOT, 'contact.md')).includes('Sophaxis offers no reward'));
}

/* ------------------------------------------------------------ 99 */
console.log('\n99. Every page: the language switch, the footer, the canonical address and the sitemap, its weight, alt texts and the dark scheme');
{
  const S = path.join(ROOT, 'site');
  const site99 = JSON.parse(read(path.join(ROOT, 'site.json')));
  const html = fs.readdirSync(S, { recursive: true }).map((f) => f.split(path.sep).join('/')).filter((f) => f.endsWith('.html')).sort();
  const H = Object.fromEntries(html.map((f) => [f, read(path.join(S, f))]));
  /* The other language: linked at the end of the header, in the same place on every page that has a twin, and back again. */
  const sw = [];
  for (const f of html) {
    const h = H[f];
    const lang = /^<!doctype html>\n<html lang="(en|ja)">/.exec(h)[1];
    const alts = [...h.matchAll(/<link rel="alternate" hreflang="(en|ja)" href="([^"]+)">/g)].map((m) => ({ lang: m[1], url: m[2] }));
    const other = alts.find((a) => a.lang !== lang);
    const head = (/<header class="top">[\s\S]*?<\/header>/.exec(h) || [''])[0];
    const links = [...h.matchAll(/<p class="lang">/g)].length;
    if (!other) { if (links) sw.push(f + ': a switch without a twin'); continue; }
    const twin = path.posix.join(path.posix.dirname(f), other.url.split('/').pop() || 'index.html');
    const want = '</nav>\n<p class="lang"><a href="./' + path.posix.basename(twin) + '" hreflang="' + other.lang + '" lang="' + other.lang + '">' + (other.lang === 'ja' ? '日本語' : 'English') + '</a></p>\n</div></header>';
    if (links !== 1 || !head.endsWith(want)) sw.push(f + ': no switch at the end of the header');
    else if (!H[twin] || !H[twin].includes('hreflang="' + lang + '" lang="' + lang + '">')) sw.push(f + ': ' + twin + ' does not link back');
  }
  const pairs = html.filter((f) => H[f].includes('<p class="lang">')).length;
  ok('every page with a version in the other language links it at the end of its header, and that version links back (' + pairs + ' pages); no other page has a switch', pairs >= 60 && sw.length === 0, sw.slice(0, 6).join(', '));
  const enParts = html.filter((f) => H[f].startsWith('<!doctype html>\n<html lang="ja">'))
    .filter((f) => !(H[f].includes('<a class="skip" href="#main" lang="en">') && /<nav lang="en">/.test(H[f]) && H[f].includes('<footer><div class="wrap" lang="en">')));
  ok('on a Japanese page, the skip link, the navigation and the footer, which are in English, are marked as English', enParts.length === 0, enParts.join(', '));
  /* The footer: the same fields on every page, and nothing that links Nusquama, here or anywhere in the repository. */
  const foot = (h) => (/<footer>[\s\S]*<\/footer>/.exec(h) || [''])[0];
  const FIELDS = ['Operated by ' + site99.operator.name + '.', 'contact.html">Contact</a>', 'disclaimer.html">Disclaimer</a>', 'policies/privacy.html">Privacy</a>', 'policies/terms.html">Terms of Use</a>', 'href="' + site99.repo + '">Source</a>', 'Claude is not an author.'];
  const lacking = html.filter((f) => !FIELDS.every((x) => foot(H[f]).includes(x)));
  ok('every footer names the operator and links the contact page, the Disclaimer, the Privacy Policy, the Terms of Use and the source, with the disclosure (' + FIELDS.length + ' fields)', lacking.length === 0, lacking.join(', '));
  const tracked = require('child_process').execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter((f) => f && !/\.(pdf|png|ico)$/.test(f));
  /* Sophaxis and Nusquama share tools/live.js, whose comment names it; nothing links it, and no page names it. */
  const nus = tracked.filter((f) => f !== 'verification/check.js' && (/nusquama\.vercel\.app|cpsbvbng26-dotcom\/nusquama/i.test(read(path.join(ROOT, f))) || (f.startsWith('site/') && /nusquama/i.test(read(path.join(ROOT, f))))));
  ok('no file of the repository links Nusquama, and no page of the site names it', nus.length === 0, nus.join(', '));
  /* Canonical addresses and the sitemap: each page names itself, and every page that may be indexed is in the sitemap, which lists only what exists. */
  const sm = read(path.join(S, 'sitemap.xml'));
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const own = (f) => site99.baseUrl + (f === 'index.html' ? '' : f);
  const canon = html.filter((f) => f !== '404.html' && ((/<link rel="canonical" href="([^"]+)">/.exec(H[f]) || [])[1] !== own(f))).map((f) => f);
  const unlisted = html.filter((f) => !H[f].includes('<meta name="robots" content="noindex">') && !locs.includes(own(f)));
  const ghost = locs.filter((u) => !u.startsWith(site99.baseUrl) || !fs.existsSync(path.join(S, u.slice(site99.baseUrl.length) || 'index.html')));
  ok('every page but the one for an address not found names itself as canonical (' + (html.length - 1) + ')', canon.length === 0, canon.join(', '));
  ok('every page that may be indexed is in the sitemap, the sitemap lists only files that exist (' + locs.length + '), and robots.txt names it',
    unlisted.length === 0 && ghost.length === 0 && read(path.join(S, 'robots.txt')).endsWith('Sitemap: ' + site99.baseUrl + 'sitemap.xml\n'), unlisted.concat(ghost).join(', '));
  /* The weight of a page: its HTML with every image, icon and script it loads from the site. */
  const LIMIT = 100000;
  const weigh = (f) => {
    const h = H[f];
    const refs = [...h.matchAll(/<(?:img|script)[^>]* src="([^"]+)"|<link rel="(?:icon|apple-touch-icon)" href="([^"]+)"/g)].map((m) => m[1] || m[2]).filter((u) => !/^https?:/.test(u));
    const at = (u) => path.join(S, u.startsWith('/') ? u.slice(1) : path.posix.join(path.posix.dirname(f), u));
    return Buffer.byteLength(h) + [...new Set(refs)].reduce((n, u) => n + (fs.existsSync(at(u)) ? fs.statSync(at(u)).size : 0), 0);
  };
  const weights = html.map((f) => [f, weigh(f)]).sort((a, b) => b[1] - a[1]);
  const acc = read(path.join(ROOT, 'accessibility.md')), accJa = read(path.join(ROOT, 'accessibility.ja.md'));
  const fmt = LIMIT.toLocaleString('en-US');
  ok('every page, with what it loads from the site, weighs at most ' + fmt + ' bytes (the heaviest: ' + weights[0][0] + ', ' + weights[0][1] + '), as the accessibility statement says in both languages',
    weights[0][1] <= LIMIT && acc.includes('weighs at most ' + fmt + ' bytes') && accJa.includes(fmt + ' バイトまで'), weights.filter((w) => w[1] > LIMIT).map((w) => w.join(' ')).join(', '));
  /* Alt texts: what the image says, never a file name or "image of"; empty only for decoration. */
  const imgs = html.flatMap((f) => [...H[f].matchAll(/<img\b[^>]*>/g)].map((m) => [f, m[0]]));
  const badAlt = imgs.filter(([, t]) => { const a = /\balt="([^"]*)"/.exec(t); return !a || /^(image|picture|photo|logo|icon|画像|写真)\b/i.test(a[1]) || /\.(png|svg|jpe?g|gif|webp|ico)$/i.test(a[1]); });
  ok('every image (' + imgs.length + ') has an alt text that is not a file name and does not begin "image of", as the accessibility statement says', imgs.length > 0 && badAlt.length === 0
    && acc.includes('The alt text does not begin with words such as "image of", and it is never a file name.') && accJa.includes('代替テキストを「画像：」のような語で始めず、ファイル名にもしません。'), badAlt.map((x) => x.join(' ')).join(', '));
  /* The dark scheme follows the system; there is no switch, because no page but the search page runs a script. */
  const cssDark = /@media \(prefers-color-scheme: dark\) \{ :root \{ --bg: #[0-9a-f]{6}; --fg: #[0-9a-f]{6};/.test(read(path.join(ROOT, 'build.js')));
  const scripted = html.filter((f) => /<script\b/.test(H[f])).join();
  ok('the colours follow the system, light or dark, with no switch, and only the search page runs a script, as the accessibility statement says in both languages',
    cssDark && scripted === 'search.html' && acc.includes('There is no switch on the page, because no page but the search page runs a script.') && accJa.includes('頁に切り替えのボタンはありません。'), scripted);
  /* The text alone at 200 %: the browser check does it at the width that the statement names. */
  const kb = read(path.join(__dirname, 'check_keyboard.js'));
  const tz = (/const TEXT_ZOOM_WIDTH = (\d+);/.exec(kb) || [])[1];
  ok('the browser check doubles the text alone at ' + tz + ' px, and the accessibility statement names that width in both languages, with the language switch',
    tz && kb.includes("html { font-size: 200% !important; } body { font-size: 34px !important; }") && /font: 17px\/1\.65 /.test(read(path.join(ROOT, 'build.js')))
    && acc.includes('doubles the size of the text alone, in a window ' + tz + ' pixels wide') && accJa.includes('幅 ' + tz + ' ピクセルの窓で文字だけを二倍に')
    && acc.includes('links it at the end of its header') && accJa.includes('見出しの帯の終わり'));
}

/* ------------------------------------------------------------ 100 */
console.log('\n100. Closing, questions actually asked, the criteria for listing, a feed of policy changes, no counts of views, the JOSS checklist and the disclosure table');
{
  const cp = require('child_process');
  const site100 = JSON.parse(read(path.join(ROOT, 'site.json')));
  const B = require('../build.js');
  const ops = read(path.join(ROOT, 'docs', 'operations.md'));
  const terms = read(path.join(ROOT, 'policies', 'terms.md')), termsJa = read(path.join(ROOT, 'policies', 'terms.ja.md'));
  /* 365: closing, step by step, and where the records go. */
  const close = (ops.split('\n## Closing Sophaxis\n')[1] || '').split('\n## ')[0];
  const steps = [...close.matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1]));
  const ahead = (/a closure is announced on the top page at least (\d+) days ahead/.exec(terms) || [])[1];
  ok('the routine says how to close Sophaxis in numbered steps (' + steps.length + '): the notice as many days ahead as the Terms (' + ahead + '), and where the records, the PDF copies and the record pages go',
    steps.length >= 5 && steps.every((n, i) => n === i + 1) && ahead && close.includes('at least ' + ahead + ' days ahead') && termsJa.includes('閉鎖は少なくとも ' + ahead + ' 日前に')
    && ['`data/papers/` (the records)', '`data/pdf/` (the PDF copies', '`site/` (every record page', 'Do not archive it on GitHub', 'except `removal.yml`', '`"submissionsPaused": true`', '`listedIn`'].every((x) => close.includes(x))
    && fs.existsSync(path.join(ROOT, '.github', 'workflows', 'removal.yml')) && Array.isArray(site100.listedIn));
  /* 366: a question is added to the FAQ only when it was asked; the questions of 2026-11-11 are those at the commit below. */
  const BASE = '52bf5512cb1c827014f51fe0077eb2ec5c3a4442';
  let before = null;
  try { before = { en: cp.execFileSync('git', ['show', BASE + ':faq.md'], { cwd: ROOT, encoding: 'utf8' }), ja: cp.execFileSync('git', ['show', BASE + ':faq.ja.md'], { cwd: ROOT, encoding: 'utf8' }) }; } catch (e) { before = null; }
  const faqCheck = (en, ja, old) => {
    const qs = (t) => t.split(/^## /m).slice(1).map((s) => ({ q: s.split('\n')[0], first: (s.split('\n').slice(1).find((l) => l.trim()) || '') }));
    const known = (t) => new Set(qs(t).map((x) => x.q));
    const oldEn = known(old.en), oldJa = known(old.ja);
    const newEn = qs(en).filter((x) => !oldEn.has(x.q)), newJa = qs(ja).filter((x) => !oldJa.has(x.q));
    return newEn.length === newJa.length
      && newEn.every((x) => /^Asked on \d{4}-\d{2}-\d{2}, (in issue #\d+|by email)\.$/.test(x.first))
      && newJa.every((x) => /^\d{4}-\d{2}-\d{2} に(issue #\d+ で|メールで)問われました。$/.test(x.first));
  };
  const faqEn = read(path.join(ROOT, 'faq.md')), faqJa = read(path.join(ROOT, 'faq.ja.md'));
  ok('every question added to the FAQ since 2026-11-11 begins with when and where it was asked, in both languages, and the FAQ says so',
    before !== null && faqCheck(faqEn, faqJa, before) && faqEn.includes('A question is added here only when someone has actually asked it, in an issue or by email.')
    && faqJa.includes('ここに問いを足すのは、だれかが issue かメールで実際に問うたときだけです。'), before === null ? 'the history is not available' : '');
  ok('a question added without that line fails the check, and one with it passes',
    before !== null && !faqCheck(faqEn + '\n## Is it new?\n\nYes.\n', faqJa + '\n## 新しいですか？\n\nはい。\n', before)
    && faqCheck(faqEn + '\n## Is it new?\n\nAsked on 2026-12-01, by email.\nYes.\n', faqJa + '\n## 新しいですか？\n\n2026-12-01 にメールで問われました。\nはい。\n', before));
  /* 368: the criteria change under the same rules as every policy, with the same 14 days, reviewed in the yearly audit. */
  const mod = read(path.join(ROOT, 'policies', 'moderation.md')), modJa = read(path.join(ROOT, 'policies', 'moderation.ja.md'));
  const days = (/The announcement comes at least (\d+) days ahead/.exec(terms) || [])[1];
  const since = new Date(site100.since + 'T00:00:00Z');
  const dayName = since.getUTCDate() + ' ' + since.toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' });
  ok('the Moderation Policy, in both languages, says how the criteria for listing are reviewed (yearly, on ' + dayName + ') and changed, with the ' + days + ' days of the Terms, and the yearly audit asks it',
    mod.includes('\n## Changes to the criteria\n') && modJa.includes('\n## 基準の変更\n') && days && mod.includes('at least ' + days + ' days before it takes effect') && modJa.includes('少なくとも ' + days + ' 日前に')
    && mod.includes('in the yearly audit on ' + dayName + ', the day Sophaxis began') && modJa.includes((since.getUTCMonth() + 1) + ' 月 ' + since.getUTCDate() + ' 日の年ごとの点検') && since.getUTCMonth() === 9
    && ops.includes('- [ ] The criteria for listing still serve their purpose. A change follows "Changes to the criteria" in the Moderation Policy.'));
  /* 369: the feed of policy changes. Each policy's last change has an entry of that day; an announced change has one with its date. */
  const changes = B.loadPolicyChanges();
  const slugs = ['terms', 'submission', 'moderation', 'copyright', 'licences', 'privacy', 'withdrawal', 'takedown'];
  const stale = slugs.filter((s) => { const d = (/Last updated: (\d{4}-\d{2}-\d{2})\./.exec(read(path.join(ROOT, 'policies', s + '.md'))) || [])[1]; const e = changes.find((c) => c.policies.includes(s)); return !e || e.date !== d; });
  ok('the newest entry of the feed for each of the ' + slugs.length + ' policies is dated its "Last updated" day, and an announced change has an entry from its first day',
    B.policyChangeProblems(changes).length === 0 && stale.length === 0 && (!site100.termsNotice || changes.some((c) => c.from === site100.termsNotice.from)), stale.join(', ') + B.policyChangeProblems(changes).join(' / '));
  ok('the data refuses an entry that names no policy, one out of order, and a day of effect that is not later',
    B.policyChangeProblems([{ date: '2026-11-12', title: 't', text: 'x', policies: [] }]).length > 0 && B.policyChangeProblems([{ date: '2026-11-10', title: 't', text: 'x', policies: ['terms'] }, { date: '2026-11-11', title: 't', text: 'x', policies: ['terms'] }]).length > 0
    && B.policyChangeProblems([{ date: '2026-11-12', from: '2026-11-12', title: 't', text: 'x', policies: ['terms'] }]).length > 0 && B.policyChangeProblems([{ date: '2026-11-12', title: 't', text: 'x', policies: ['terms'] }]).length === 0);
  const feed = read(path.join(ROOT, 'site', 'policies', 'changes.xml'));
  const entries = (feed.match(/<entry>/g) || []).length;
  const heads = html100();
  function html100() { return ['policy.html', 'policy.ja.html'].concat(slugs.flatMap((s) => ['policies/' + s + '.html', 'policies/' + s + '.ja.html'])).filter((f) => !read(path.join(ROOT, 'site', f)).includes('<link rel="alternate" type="application/atom+xml" title="Sophaxis: changes to the policies" href="' + (f.startsWith('policies/') ? '../' : './') + 'policies/changes.xml">')); }
  ok('policies/changes.xml carries one entry per change (' + entries + '), each with the policies it touches, and every policy page and the Policies page announce it',
    entries === changes.length && entries > 0 && !/news\.html#/.test(feed) && heads.length === 0 && (feed.match(/<link href="https:\/\/sophaxis\.vercel\.app\/policies\/[a-z]+\.html" title="/g) || []).length === changes.reduce((n, c) => n + c.policies.length, 0), heads.join(', '));
  ok('the Terms, the Policies page and the Moderation Policy, in both languages, say that each change goes into the feed, which carries nothing else, and the README and the routine say how to add one',
    [terms, termsJa, read(path.join(ROOT, 'policy.md')), read(path.join(ROOT, 'policy.ja.md')), mod, modJa].every((t) => t.includes('(https://sophaxis.vercel.app/policies/changes.xml)'))
    && terms.includes('which carries nothing else.') && termsJa.includes('この配信には、ほかのものを載せません。')
    && read(path.join(ROOT, 'README.md')).includes('`data/policy-changes.json`') && ops.includes('## On a change to a policy'));
  ok('the first entries say that the eight policies were last changed on their day, and the words "eight policies" match the count (' + slugs.length + ')',
    slugs.length === 8 && B.loadPolicyChanges().some((c) => c.text.includes('Each of the eight policies was last changed on ' + c.date + '.') && c.policies.length === slugs.length));
  /* 370: no counts of views or downloads, anywhere, and no analytics. */
  const priv = read(path.join(ROOT, 'policies', 'privacy.md')), privJa = read(path.join(ROOT, 'policies', 'privacy.ja.md'));
  const counted = fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html')).filter((f) => /\b\d[\d,]*\s*(views|downloads|閲覧|ダウンロード)|(閲覧|ダウンロード)(数|回数)[：:]\s*\d|view count|download count/i.test(read(path.join(ROOT, 'site', f))));
  ok('no page shows a count of views or downloads, and the Privacy Policy, in both languages, and the FAQ say that none is shown or kept',
    counted.length === 0 && priv.includes('No page, a record page included, shows a count of views or downloads, and Sophaxis keeps no such count') && privJa.includes('どの頁も、閲覧やダウンロードの数を示しません。Sophaxis はその数を持ちません。')
    && read(path.join(ROOT, 'faq.md')).includes('It shows no counts of views or downloads.') && read(path.join(ROOT, 'verification', 'commitments.txt')).includes('shows a count of views or downloads'), counted.join(', '));
  /* 352 and 351: the JOSS checklist, beside the README, and errata-check with it. */
  const joss = read(path.join(ROOT, 'docs', 'joss.md'));
  const readme = read(path.join(ROOT, 'README.md'));
  let first = '';
  try { first = cp.execFileSync('git', ['log', '--reverse', '--format=%as'], { cwd: ROOT, encoding: 'utf8' }).split('\n')[0].trim(); } catch (e) { first = ''; }
  const d = new Date(first + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + 6); d.setUTCDate(d.getUTCDate() + 1);
  const earliest = first ? d.toISOString().slice(0, 10) : '';
  const rows = joss.split('\n').filter((l) => /^\| /.test(l) && !/^\| (Criterion|---)/.test(l)).map((l) => l.split('|').map((c) => c.trim()));
  const STATES = ['met', 'partly met', 'not yet', 'at submission', 'for JOSS'];
  const named = [...joss.matchAll(/Check (\d+)/g)].map((m) => Number(m[1]));
  const TOPIC = { 38: 'The JOSS plan', 39: 'Metadata for a release DOI', 40: 'CONTRIBUTING.md and CHANGELOG.md', 41: 'The draft JOSS paper' };
  const src = read(__filename);
  ok('docs/joss.md is marked not submitted, gives the first commit and the earliest day from git (' + earliest + '), and a state from the list for every row (' + rows.length + ')',
    joss.startsWith('# Readiness for the Journal of Open Source Software (JOSS)\n\nNot submitted.') && first !== '' && joss.includes('The first commit here is from ' + first + ', so the earliest possible submission is ' + earliest + '.')
    && rows.length >= 10 && rows.every((r) => STATES.includes(r[2])), rows.filter((r) => !STATES.includes(r[2])).map((r) => r[1]).join(', '));
  ok('every check that docs/joss.md names is the check of that topic (' + [...new Set(named)].join(', ') + ')',
    named.length > 0 && named.every((n) => TOPIC[n] && src.includes("console.log('\\n" + n + '. ' + TOPIC[n])));
  ok('errata-check goes to JOSS together with the Sophaxis code, in May 2027 or later, in docs/joss.md and the README in both languages, which link the checklist',
    joss.includes('is to be submitted to JOSS together with it, in May 2027 or later.') && earliest.startsWith('2027-05')
    && readme.includes("The code of [errata-check](https://github.com/cpsbvbng26-dotcom/errata-check), the operator's checker of errata, is to be submitted to JOSS together with it, in May 2027 or later.")
    && readme.includes('これと一緒に、2027 年 5 月以降に JOSS へ投稿します。') && (readme.match(/\(docs\/joss\.md\)/g) || []).length === 2
    && joss.includes('JOSS charges no fees for submitting or publishing'));
  /* 348: the disclosure as a table, of one shape in both languages, naming every model that the Moderation Policy names. */
  const table = (head) => { const i = readme.indexOf(head); if (i < 0) return []; return readme.slice(i).split('\n').slice(2).filter((l, k, a) => a.slice(0, k + 1).every((x) => x.startsWith('| '))); };
  const en = table('| Tool | Used for | Checked by |\n| --- | --- | --- |'), ja = table('| 道具 | 使ったところ | 確かめた人 |\n| --- | --- | --- |');
  const models = ['Claude Code', 'Claude', 'ChatGPT', 'Grok'];
  ok('the README discloses the use of language models in a table of the same shape in both languages (' + en.length + ' rows), naming every model the Moderation Policy names, and no model as an author',
    en.length > 0 && en.length === ja.length && models.every((m) => en.join('').includes(m) && ja.join('').includes(m) && mod.includes(m.split(' ')[0]))
    && en.every((r) => r.split('|').length === 5 && /The operator/.test(r)) && ja.every((r) => r.split('|').length === 5 && /運営者/.test(r)) && readme.includes('Claude is not an author.') && readme.includes('Claude は著者ではありません。'));
}

/* ------------------------------------------------------------ 101 */
console.log('\n101. Counts in the prose that no other check held, and the abstract and the keywords kept in step');
{
  const site101 = JSON.parse(read(path.join(ROOT, 'site.json')));
  const W = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const K = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  const readme = read(path.join(ROOT, 'README.md'));
  const n = site101.notOffered.length;
  ok('the README gives the number of places where Sophaxis is not offered, in both languages, from site.json (' + n + ')',
    readme.includes('- **Not offered in ' + n + ' places**') && readme.includes('Sophaxis を提供しない ' + n + ' の国と地域'));
  const lic = Object.keys(site101.licenses).length;
  ok('the Copyright Policy counts the accepted licences of site.json (' + lic + '), in both languages',
    read(path.join(ROOT, 'policies', 'copyright.md')).includes('The ' + W[lic] + ' accepted licences permit') && read(path.join(ROOT, 'policies', 'copyright.ja.md')).includes('受け付ける' + K[lic] + 'つのライセンスは'));
  const cats = Object.keys(site101.categories).length;
  ok('the glossary counts the fields of site.json (' + cats + '), in both languages',
    read(path.join(ROOT, 'glossary.md')).includes('a field is one of the ' + W[cats] + ' areas') && read(path.join(ROOT, 'glossary.ja.md')).includes('作品を載せる' + K[cats] + 'つの領域'));
  const tk = read(path.join(ROOT, 'policies', 'takedown.md')), tkJa = read(path.join(ROOT, 'policies', 'takedown.ja.md'));
  const ORD = ['The first is', 'The second is', 'The third is', 'The fourth is'], ORDJ = ['一つ目は', '二つ目は', '三つ目は', '四つ目は'];
  const cases = ORD.filter((o) => tk.includes('\n' + o + ' ')).length, casesJa = ORDJ.filter((o) => tkJa.includes('\n' + o)).length;
  ok('the Takedown Policy says in how many cases a record is removed, and lists as many, in both languages (' + cases + ')',
    cases > 0 && cases === casesJa && tk.includes('A record is removed in ' + W[cases] + ' cases.') && tkJa.includes('記録を削除するのは、' + K[cases] + 'つの場合です。'));
  /* The abstract of Sophaxis itself: the same fields wherever it is told, in English and in Japanese. */
  const FIELDS = 'philosophy, mathematics, logic, the philosophy of mathematics and the philosophy of science';
  const z = JSON.parse(read(path.join(ROOT, '.zenodo.json'))), cff = read(path.join(ROOT, 'CITATION.cff'));
  const paper = read(path.join(ROOT, 'paper', 'paper.md'));
  const flat = (t) => t.replace(/\s+/g, ' ');
  ok('the abstract names the same five fields in the README in both languages, .zenodo.json, CITATION.cff, the JOSS draft and the top pages, and says that acceptance is moderation',
    Object.keys(site101.categories).length === 5 && readme.includes('Sophaxis is an overlay preprint server for ' + FIELDS + '.') && z.description.includes(FIELDS) && flat(cff).includes(FIELDS) && paper.includes(FIELDS)
    && readme.includes('哲学・数学・論理学・数理哲学・科学哲学のための') && read(path.join(ROOT, 'site', 'index.ja.html')).includes('哲学・数学・論理学・数理哲学・科学哲学のプレプリント')
    && read(path.join(ROOT, 'site', 'index.html')).includes('lists preprints in ' + FIELDS + '.')
    && [readme, z.description, flat(cff)].every((t) => t.includes('Acceptance is moderation, not peer review.')) && readme.includes('受理はモデレーションであり、査読ではありません。'));
  const reps = [...new Set(Object.values(site101.repositories))];
  ok('the README names the same repositories as site.json, in the same order, in both languages (' + reps.length + ')',
    typeof reps[0] === 'string' && readme.includes('Authors deposit their preprint in ' + reps.slice(0, -1).join(', ') + ' or ' + reps[reps.length - 1] + ';') && readme.includes('著者が ' + reps.join('・') + ' のどれかに置いた稿'));
  /* The keywords: one list in .zenodo.json, CITATION.cff and the tags of the JOSS draft, and never "journal", which Sophaxis is not. */
  const cffKw = [...(/keywords:\n((?:  - .*\n)+)/.exec(cff) || ['', ''])[1].matchAll(/  - (.*)/g)].map((m) => m[1]);
  const tags = [...(/tags:\n((?:  - .*\n)+)/.exec(paper) || ['', ''])[1].matchAll(/  - (.*)/g)].map((m) => m[1]);
  ok('.zenodo.json, CITATION.cff and the JOSS draft have the same keywords, in the same order (' + z.keywords.length + '), and none says journal',
    z.keywords.length > 0 && JSON.stringify(z.keywords) === JSON.stringify(cffKw) && JSON.stringify(cffKw) === JSON.stringify(tags) && !z.keywords.some((k) => /journal/i.test(k)), z.keywords.join(', ') + ' / ' + cffKw.join(', ') + ' / ' + tags.join(', '));
}

/* ------------------------------------------------------------ 102 */
console.log('\n102. Every record page keeps three things apart: where the work is deposited, its listing on Sophaxis, and any peer review or publication');
{
  const B102 = require('../build.js');
  const SITE102 = JSON.parse(read(path.join(ROOT, 'site.json')));
  /* The rows of the status table, as the page shows them, read back from the HTML. */
  const statusRows = (html) => {
    const m = /<div class="table" id="status"><table><tr><th scope="col">Status<\/th><th scope="col">For this record<\/th><\/tr>([\s\S]*?)<\/table><\/div>/.exec(html);
    return m ? [...m[1].matchAll(/<tr><th scope="row">([^<]*)<\/th><td>([\s\S]*?)<\/td><\/tr>/g)].map((r) => [r[1], r[2]]) : null;
  };
  const link = (doi) => '<a href="https://doi.org/' + doi + '">' + doi + '</a>';
  /* What each row must say for a record, from the record alone. */
  const problems = (p, html) => {
    const rows = statusRows(html), e = [];
    if (!rows) return ['no status table'];
    if (html.split('<th scope="col">Status</th>').length !== 2) e.push('more than one status table');
    if (JSON.stringify(rows.map((r) => r[0])) !== JSON.stringify(['Deposit', 'Listing on Sophaxis', 'Peer review or publication'])) return e.concat('rows are ' + rows.map((r) => r[0]).join(' / '));
    /* Item 450: on a phone the title, the ways to read and the abstract come first; the table follows the abstract, before Read. */
    const at = html.indexOf('<th scope="col">Status</th>');
    if (!(html.indexOf('<h2 id="abstract">Abstract</h2>') >= 0 && html.indexOf('</article>') >= 0 && at > html.indexOf('</article>') && html.indexOf('</article>') > html.indexOf('<h2 id="abstract">Abstract</h2>')
      && at < html.indexOf('<h2 id="read">Read</h2>'))) e.push('not between the end of the article, after the abstract, and Read');
    const [dep, lst, rev] = rows.map((r) => r[1]);
    const v = p.versions[p.versions.length - 1], first = p.versions[0];
    const dois = (t) => [...t.matchAll(/href="https:\/\/doi\.org\/([^"]+)"/g)].map((m) => m[1]);
    if (!dep.startsWith(B102.repoName(v.doi) + '. Latest version: v' + v.version + ', ' + link(v.doi) + '. First version (v1): ' + (first.date || 'not recorded'))) e.push('deposit: ' + dep);
    if (JSON.stringify(dois(dep)) !== JSON.stringify([v.doi])) e.push('deposit names another DOI: ' + dois(dep).join(', '));
    if (!lst.startsWith('Passed <a href="../policies/moderation.html">moderation</a>, which is not peer review. Listed: ' + (p.listed || 'not recorded') + '. Submission: <a href="' + SITE102.repo + '/issues/' + p.issue + '">issue #' + p.issue + '</a>.')) e.push('listing: ' + lst);
    if ((p.status === 'withdrawn') !== lst.includes(' Withdrawn: ' + (p.withdrawal_date || 'not recorded') + '; the record stays.') || (p.status !== 'withdrawn' && /withdrawn/i.test(lst))) e.push('listing, withdrawal: ' + lst);
    if (dois(lst).length) e.push('listing names a DOI');
    if (p.published) {
      const q = p.published;
      const peer = q.peer_reviewed === true ? 'The authors state that it was peer-reviewed.' : q.peer_reviewed === false ? 'The authors state that it was not peer-reviewed.' : 'Whether it was peer-reviewed is not stated.';
      if (!(rev.startsWith('A later version of this work appeared as a ' + q.type + ' in <i>') && JSON.stringify(dois(rev)) === JSON.stringify([q.doi]) && rev.includes(peer)
        && rev.includes(q.evidence === 'publisher' ? 'The publisher’s metadata links it to this preprint.' : 'An author reported it; the publisher’s metadata does not link it to this preprint.')
        && html.includes('<b>Published.</b> ' + rev))) e.push('peer review: ' + rev);
    } else if (rev !== 'None reported. This is a preprint.') e.push('peer review: ' + rev);
    return e;
  };
  const shown = loadPapers(path.join(ROOT, 'data', 'papers')).papers.filter((p) => p.status !== 'removed');
  const live = shown.map((p) => [p.id, problems(p, read(path.join(ROOT, 'site', 'abs', p.id + '.html')))]).filter(([, e]) => e.length);
  ok('every record page shown has the three rows, Deposit, Listing on Sophaxis, and Peer review or publication, each saying what its record holds (' + shown.length + ' pages)',
    shown.length > 0 && live.length === 0, live.map(([id, e]) => id + ': ' + e.join('; ')).join(' / '));
  const fx = ['2026.0001', '2026.0002'].map((id) => JSON.parse(read(path.join(__dirname, 'fixtures', 'papers', id + '.json'))));
  const fxBad = fx.map((p) => [p.id, problems(p, read(path.join(FIX, 'abs', p.id + '.html')))]).filter(([, e]) => e.length);
  ok('so do the fixtures: a published version as the authors state it, and a withdrawal with its date',
    fx[0].published && fx[1].status === 'withdrawn' && fxBad.length === 0, fxBad.map(([id, e]) => id + ': ' + e.join('; ')).join(' / '));
  const noDate = Object.assign(JSON.parse(JSON.stringify(fx[1])), { listed: undefined, withdrawal_date: undefined });
  ok('a date the record does not hold is said to be not recorded, never filled in',
    B102.statusTable(noDate).includes('Listed: not recorded.') && B102.statusTable(noDate).includes('Withdrawn: not recorded;'));
  const removed = loadPapers(path.join(ROOT, 'data', 'papers')).papers.filter((p) => p.status === 'removed');
  ok('a removed record shows no status table', removed.every((p) => !read(path.join(ROOT, 'site', 'abs', p.id + '.html')).includes('<th scope="col">Status</th>')));
}

/* ------------------------------------------------------------ 103 */
console.log('\n103. Every record has a page in Japanese: the status table in Japanese, the title and the abstract in the authors\' words (items 445 and 446)');
{
  const B103 = require('../build.js');
  const S103 = JSON.parse(read(path.join(ROOT, 'site.json')));
  const all = loadPapers(path.join(ROOT, 'data', 'papers')).papers;
  const shown = all.filter((p) => p.status !== 'removed');
  const e103 = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const rowsJa = (html) => {
    const m = /<div class="table" id="status"><table><tr><th scope="col">状態<\/th><th scope="col">この記録<\/th><\/tr>([\s\S]*?)<\/table><\/div>/.exec(html);
    return m ? [...m[1].matchAll(/<tr><th scope="row">([^<]*)<\/th><td>([\s\S]*?)<\/td><\/tr>/g)].map((r) => [r[1], r[2]]) : null;
  };
  /* What a Japanese record page must hold, from the record alone. */
  const jaProblems = (p, ja, en) => {
    const e = [], rows = rowsJa(ja);
    const v = p.versions[p.versions.length - 1], first = p.versions[0];
    const pair = '<link rel="alternate" hreflang="en" href="' + S103.baseUrl + 'abs/' + p.id + '.html">\n<link rel="alternate" hreflang="ja" href="' + S103.baseUrl + 'abs/' + p.id + '.ja.html">';
    if (!/^<!doctype html>\n<html lang="ja">/.test(ja) || !ja.includes(pair) || !en.includes(pair)) e.push('not a Japanese page named by the English one');
    if (!rows) return e.concat('no status table in Japanese');
    if (JSON.stringify(rows.map((r) => r[0])) !== JSON.stringify(['預け先', S103.name + ' への掲載', '査読・出版'])) return e.concat('rows ' + rows.map((r) => r[0]).join(' / '));
    const [dep, lst, rev] = rows.map((r) => r[1]);
    const dois = (t) => [...t.matchAll(/href="https:\/\/doi\.org\/([^"]+)"/g)].map((m) => m[1]);
    if (!dep.startsWith(B103.repoName(v.doi) + '。最新の版：v' + v.version + '、<a href="https://doi.org/' + v.doi + '">' + v.doi + '</a>。最初の版（v1）：' + (first.date || '記録なし')) || JSON.stringify(dois(dep)) !== JSON.stringify([v.doi])) e.push('deposit: ' + dep);
    if (!lst.startsWith('<a href="../policies/moderation.ja.html">モデレーション</a>を通りました。モデレーションは査読ではありません。掲載：' + (p.listed || '記録なし') + '。投稿：<a href="' + S103.repo + '/issues/' + p.issue + '">issue #' + p.issue + '</a>。')) e.push('listing: ' + lst);
    if ((p.status === 'withdrawn') !== lst.includes('撤回：' + (p.withdrawal_date || '記録なし') + '。記録は残します。')) e.push('listing, withdrawal: ' + lst);
    if (p.published ? rev !== B103.publishedSaidJa(p.published) || JSON.stringify(dois(rev)) !== JSON.stringify([p.published.doi]) : rev !== '報告はありません。これはプレプリントです。') e.push('peer review: ' + rev);
    if (!ja.includes('>' + e103(p.title) + '</h1>') || !ja.includes('<div class="abstract"') || !ja.includes('<p>' + e103(p.abstract) + '</p></div>')) e.push('the title or the abstract is not the authors\' own');
    if (/<meta name="citation_|itemtype="https:\/\/schema\.org\/ScholarlyArticle"/.test(ja) || !en.includes('<meta name="citation_title"')) e.push('the tags for search engines are not on the English page alone');
    return e;
  };
  const live = shown.map((p) => [p.id, fs.existsSync(path.join(ROOT, 'site', 'abs', p.id + '.ja.html'))
    ? jaProblems(p, read(path.join(ROOT, 'site', 'abs', p.id + '.ja.html')), read(path.join(ROOT, 'site', 'abs', p.id + '.html'))) : ['missing']]).filter(([, e]) => e.length);
  ok('every record shown has a page in Japanese, named by its English page and naming it, with the status table in Japanese, row by row, and the title and the abstract as the authors gave them (' + shown.length + ' pages)',
    shown.length > 0 && live.length === 0, live.map(([id, e]) => id + ': ' + e.join('; ')).join(' / '));
  const fx = ['2026.0001', '2026.0002'].map((id) => JSON.parse(read(path.join(__dirname, 'fixtures', 'papers', id + '.json'))));
  const fxBad = fx.map((p) => [p.id, jaProblems(p, read(path.join(FIX, 'abs', p.id + '.ja.html')), read(path.join(FIX, 'abs', p.id + '.html')))]).filter(([, e]) => e.length);
  ok('so do the fixtures: a published version, and a withdrawal with its date', fx[0].published && fx[1].status === 'withdrawn' && fxBad.length === 0, fxBad.map(([id, e]) => id + ': ' + e.join('; ')).join(' / '));
  const noDate = Object.assign(JSON.parse(JSON.stringify(fx[1])), { listed: undefined, withdrawal_date: undefined });
  ok('in Japanese too, a date the record does not hold is said to be not recorded', B103.statusTableJa(noDate).includes('掲載：記録なし。') && B103.statusTableJa(noDate).includes('撤回：記録なし。'));
  const removed = all.filter((p) => p.status === 'removed');
  ok('a removed record keeps a Japanese notice that is not indexed and shows nothing of the work (' + removed.length + ')', removed.every((p) => {
    const h = read(path.join(ROOT, 'site', 'abs', p.id + '.ja.html'));
    return h.includes('<meta name="robots" content="noindex">') && !h.includes('<article') && !h.includes('id="status"');
  }));
  const sm = read(path.join(ROOT, 'site', 'sitemap.xml')), idxJa = read(path.join(ROOT, 'site', 'index.ja.html'));
  ok('the sitemap lists each Japanese record page with the day of its English page, and the Japanese top page links each of them',
    shown.every((p) => { const d = (new RegExp(S103.baseUrl.replace(/\./g, '\\.') + 'abs/' + p.id.replace('.', '\\.') + '\\.html</loc><lastmod>(\\d{4}-\\d{2}-\\d{2})<').exec(sm) || [])[1]; return d && sm.includes(S103.baseUrl + 'abs/' + p.id + '.ja.html</loc><lastmod>' + d + '<') && idxJa.includes('href="./abs/' + p.id + '.ja.html"'); }));
  const subJa = read(path.join(ROOT, 'policies', 'submission.ja.md'));
  ok('the Japanese words for the extent of use of generative models are those the Submission Policy gives each level, and every level has them',
    Object.keys(S103.llmExtents).every((k) => B103.LLM_EXTENTS_JA[k] && subJa.includes(S103.llmExtents[k] + '.（' + B103.LLM_EXTENTS_JA[k] + '）')));
}

/* ------------------------------------------------------------ 104 */
console.log('\n104. The operator\'s own work is marked plainly: a notice above the title and a strong flag in every listing (item 447)');
{
  const B104 = require('../build.js');
  const shown = loadPapers(path.join(ROOT, 'data', 'papers')).papers.filter((p) => p.status !== 'removed');
  const own = shown.filter((p) => p.operator_own === true);
  const bad = own.flatMap((p) => ['', '.ja'].map((l) => {
    const h = read(path.join(ROOT, 'site', 'abs', p.id + l + '.html'));
    const at = h.indexOf('<div class="notice own">');
    const ok1 = at > h.indexOf('<p class="meta"><span class="id">') && at < h.indexOf('<article') && (h.match(/<div class="notice own">/g) || []).length === 1
      && h.includes(l ? '<span class="flag own">運営者自身の投稿</span>' : '<span class="flag own">operator’s own submission</span>')
      && h.includes(l ? 'href="../policies/moderation.ja.html#利益相反"' : 'href="../policies/moderation.html#conflicts-of-interest"');
    return ok1 ? null : p.id + l;
  })).filter(Boolean);
  const others = shown.filter((p) => p.operator_own !== true).filter((p) => read(path.join(ROOT, 'site', 'abs', p.id + '.html')).includes('notice own'));
  ok('each record page of the operator’s own work, in English and in Japanese, has one notice of it above the title, linking the rule on conflicts of interest, and the strong flag (' + own.length + ' records); no other record has the notice',
    bad.length === 0 && others.length === 0, bad.concat(others.map((p) => p.id)).join(', '));
  const waited = B104.ownWorkNotice({ operator_own: true, submitted: '2026-11-09', listed: '2026-11-16' });
  ok('where the record keeps the day its issue was opened, the notice gives the days it waited in public, counted from the record, in both languages; a record not the operator’s has no notice',
    waited.includes('was open in public for 7 days, from 2026-11-09 to 2026-11-16') && B104.ownWorkNotice({ operator_own: true, submitted: '2026-11-09', listed: '2026-11-16' }, true).includes('2026-11-09 から 2026-11-16 まで 7 日のあいだ')
    && !B104.ownWorkNotice({ operator_own: true, listed: '2026-11-16' }).includes('days') && B104.ownWorkNotice({ listed: '2026-11-16' }) === '');
  /* Every listing: the top pages, the field pages, the collections and the author pages. */
  const listings = ['index.html', 'index.ja.html'].concat(fs.readdirSync(path.join(ROOT, 'site', 'list')).filter((f) => f.endsWith('.html')).map((f) => 'list/' + f),
    fs.readdirSync(path.join(ROOT, 'site', 'collection')).filter((f) => f.endsWith('.html')).map((f) => 'collection/' + f), fs.readdirSync(path.join(ROOT, 'site', 'author')).filter((f) => f.endsWith('.html')).map((f) => 'author/' + f));
  const wrong = listings.filter((f) => {
    const list = (read(path.join(ROOT, 'site', f)).split('<ol class="list">')[1] || '').split('</ol>')[0];
    const items = list.split('<li>').slice(1);
    return items.some((it) => { const id = (/<span class="id">([^<]+)<\/span>/.exec(it) || [])[1]; const p = shown.find((x) => x.id === id); return !p || /class="flag own"/.test(it) !== (p.operator_own === true); });
  });
  ok('every listing (' + listings.length + ' pages) gives each of the operator’s works the strong flag, and no other work', wrong.length === 0, wrong.join(', '));
  ok('the strong flag has a border in the main colour and bold text, beside the plain flags', /\.flag\.own \{ border: 2px solid var\(--accent\); color: var\(--fg\); font-weight: bold; \}/.test(read(path.join(ROOT, 'build.js'))));
}

/* ------------------------------------------------------------ 105 */
console.log('\n105. Each field page gives its number of records and the day the newest was listed (item 448)');
{
  const B105 = require('../build.js');
  const S105 = JSON.parse(read(path.join(ROOT, 'site.json')));
  const shown = loadPapers(path.join(ROOT, 'data', 'papers')).papers.filter((p) => p.status !== 'removed');
  const bad = Object.keys(S105.categories).filter((slug) => {
    const h = read(path.join(ROOT, 'site', 'list', slug + '.html'));
    const mine = shown.filter((p) => [p.category].concat(p.categories || []).includes(slug));
    if (!mine.length) return h.includes('Records in this field:') || !h.includes('No preprints are listed in this field yet.');
    const newest = mine.map((p) => p.listed).sort().pop();
    return !h.includes('<p class="meta">Records in this field: ' + mine.length + (mine.some((p) => p.status === 'withdrawn') ? ', withdrawn ones included' : '') + '. Latest listed: <time datetime="' + newest + '">' + newest + '</time>.</p>');
  });
  ok('each of the ' + Object.keys(S105.categories).length + ' field pages gives the count and the newest listing day of its own records, counted from them, and an empty field says so instead', bad.length === 0, bad.join(', '));
  ok('the count names withdrawn records when there are some, and an empty list gives no line',
    B105.fieldFacts([{ listed: '2026-11-01', status: 'listed' }, { listed: '2026-11-03', status: 'withdrawn' }]).includes('Records in this field: 2, withdrawn ones included. Latest listed: <time datetime="2026-11-03">') && B105.fieldFacts([]) === '');
}

/* ------------------------------------------------------------ 106 */
console.log('\n106. On a phone, a record page reads in order: the title, the ways to read, the abstract, the status, then how to cite (item 450)');
{
  const shown = loadPapers(path.join(ROOT, 'data', 'papers')).papers.filter((p) => p.status !== 'removed');
  const ORDER = { '': ['<h1 itemprop="headline">', '<p class="access">', '<p class="meta jump"><a href="#abstract">Abstract</a> · <a href="#status">Status</a> · <a href="#cite">Cite</a></p>', '<h2 id="abstract">Abstract</h2>', 'id="status"', '<h2 id="read">Read</h2>', '<h2 id="cite">Cite</h2>', '<h2>Versions</h2>'],
    '.ja': ['<h1', '<p class="access">', '<p class="meta jump"><a href="#abstract">要旨</a> · <a href="#status">状態</a> · <a href="#cite">引用</a></p>', '<h2 id="abstract">要旨</h2>', 'id="status"', '<h2 id="read">読む</h2>', '<h2 id="cite">引用</h2>', '<h2>版</h2>'] };
  const inOrder = (h, marks) => marks.every((m, i) => h.split(m).length === 2 && (i === 0 || h.indexOf(marks[i - 1]) < h.indexOf(m)));
  const bad = shown.filter((p) => p.status === 'listed').flatMap((p) => ['', '.ja'].filter((l) => !inOrder(read(path.join(ROOT, 'site', 'abs', p.id + l + '.html')), ORDER[l])).map((l) => p.id + l));
  ok('every listed record page, in both languages, has the title, the Access line, the links to the abstract, the status and the citation, then the abstract, the status, Read, Cite and the versions, in this order, each once',
    bad.length === 0, bad.join(', '));
  const cut = read(path.join(ROOT, 'site', 'abs', shown[0].id + '.html')).replace('<h2 id="cite">Cite</h2>', '').replace('<h2>Versions</h2>', '<h2>Versions</h2><h2 id="cite">Cite</h2>');
  ok('the order is read from the page: Cite moved after the versions is refused', !inOrder(cut, ORDER['']));
}

/* ------------------------------------------------------------ 107 */
console.log('\n107. The search page on a phone, with the one script (item 453)');
{
  const css = read(path.join(ROOT, 'build.js'));
  const s = read(path.join(ROOT, 'site', 'search.html'));
  ok('below 40rem the words take the whole width, the field and the year share a line, and the controls and the button are at least 2.75rem high',
    css.includes('@media (max-width: 40rem) { .search label:first-child { flex: 1 1 100%; } .search input[type=search] { width: 100%; } .search label { flex: 1 1 8rem; } .search select, .search input { min-height: 2.75rem; width: 100%; } .search button { flex: 1 1 100%; min-height: 2.75rem; } }'));
  ok('the search page still runs only search.js from this site, and no other page runs a script',
    (s.match(/<script\b/g) || []).length === 1 && s.includes('<script src="./search.js" defer></script>')
    && fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html') && f !== 'search.html').every((f) => !/<script\b/.test(read(path.join(ROOT, 'site', f)))));
}

/* ------------------------------------------------------------ 108 */
console.log('\n108. Numbers in the Japanese pages: counts, durations and dates in Arabic digits (item 473)');
{
  /* A month in kanji, and a duration in kanji. Set phrases such as 一つ, 一人, 一度 and 一日に一度 are not durations. */
  const D = '〇一二三四五六七八九十百';
  const KANJI_MONTH = new RegExp('[' + D + ']{1,3} ?月 ?[\\d' + D + ']');
  const KANJI_DURATION = new RegExp('[' + D + ']+ ?(?:か月|ヶ月|カ月|年間|週間|日間|時間|分間|日前|日後|日以内)|[二三四五六七八九十百]+ ?日(?:が|の|を|まで|以|前|後|間)');
  const offending = (text) => text.split('\n').filter((l) => !/^\s*>/.test(l)).filter((l) => KANJI_MONTH.test(l) || KANJI_DURATION.test(l));
  const jaFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith('.ja.md')).concat(fs.readdirSync(path.join(ROOT, 'policies')).filter((f) => f.endsWith('.ja.md')).map((f) => 'policies/' + f));
  const readmeJa = read(path.join(ROOT, 'README.md')).split('\n').filter((l) => /[\u3040-\u30ff]/.test(l)).join('\n');
  const found = jaFiles.flatMap((f) => offending(read(path.join(ROOT, f))).map((l) => f + ': ' + l.slice(0, 40))).concat(offending(readmeJa).map((l) => 'README.md: ' + l.slice(0, 40)));
  ok('no Japanese page (' + jaFiles.length + ' files) and no Japanese line of the README writes a month or a duration in kanji', found.length === 0, found.slice(0, 5).join(' / '));
  ok('the rule finds 「十月 30 日」, 「六か月」 and 「七日のあいだ」, and passes 「10 月 30 日」, 「6 か月」, 「一日に一度」 and 「一つ」',
    offending('十月 30 日').length === 1 && offending('六か月以上').length === 1 && offending('七日のあいだ公開で').length === 1 && offending('三年間').length === 1
    && offending('10 月 30 日に、6 か月、7 日のあいだ、一日に一度、一つ、一人、二通り、十分に').length === 0);
  const contrib = read(path.join(ROOT, 'CONTRIBUTING.md'));
  ok('CONTRIBUTING.md states the rule and its exceptions', contrib.includes('## Numbers in the Japanese pages') && contrib.includes('The Japanese pages write counts, durations and dates in Arabic digits')
    && contrib.includes('Set phrases keep their kanji') && contrib.includes('Quotations and the texts of laws are left as they are.'));
  /* The comparison of the translations reads "six months" as 6 and "30 October" as 10 and 30, so the digits must match. */
  ok('the comparison of the translations reads a number spelled before its unit, and a named month, as numbers',
    [...'six months; 30 October; October 2026; seven-day; one day'.matchAll(NUM_WORD_UNIT)].map((m) => NUM_WORDS[m[1].toLowerCase()]).join() === '6,7'
    && [...'on 30 October, in October 2026, May I'.matchAll(MONTH_DATE)].map((m) => MONTH_NAMES.indexOf(m[2] || m[3]) + 1).join() === '10,10');
}

/* ------------------------------------------------------------ 109 */
console.log('\n109. If the operator cannot work: the steps, in the Terms of Use in both languages and in the operator\'s routine (item 457)');
{
  const te = read(path.join(ROOT, 'policies', 'terms.md')), tj = read(path.join(ROOT, 'policies', 'terms.ja.md'));
  const part = (t, h) => (new RegExp('\\n### ' + h + '\\n([\\s\\S]*?)\\n## ').exec(t) || [, ''])[1];
  const en = part(te, 'If the operator cannot work'), ja = part(tj, '運営者が作業できないとき');
  const steps = (t) => [...t.matchAll(/^(\d+)\. ([^：:]+)[：:]?/gm)].map((m) => m[2]);
  ok('the Terms of Use, under Continuity, give the steps in order, in both languages: who is told, what is paused, what stays online, what works without the operator, who could take over, and the return',
    te.indexOf('### If the operator cannot work') > te.indexOf('## Continuity') && tj.indexOf('### 運営者が作業できないとき') > tj.indexOf('## 続けるための備え')
    && JSON.stringify(steps(en).slice(0, 5)) === JSON.stringify(['Who is told', 'What is paused', 'What stays online', 'What still works without the operator', 'Who could take over']) && /^6\. When the operator returns/m.test(en)
    && JSON.stringify(steps(ja).slice(0, 5)) === JSON.stringify(['知らせる先', '止まるもの', '公開のまま残るもの', '運営者がいなくても働くもの', '引き継げる人']) && /^6\. 運営者が戻ったら/m.test(ja));
  ok('what the Terms say works without the operator is what tools/removal.js does at once',
    en.includes("still takes the record's title, authors, abstract and PDF copy offline at once, as the Takedown Policy says") && read(path.join(ROOT, 'tools', 'removal.js')).includes('the record page (title, authors, abstract, PDF copy) is taken offline at once'));
  const ops = read(path.join(ROOT, 'docs', 'operations.md'));
  const opsPart = (/\n## If the operator cannot work\n([\s\S]*?)\n## /.exec(ops) || [, ''])[1];
  ok('the operator’s routine expands it: before, when a pause begins, what runs and what waits, how a successor or a custodian takes over, and when it ends, with the switch in site.json',
    ['### Before it happens', '### When a pause begins', '### What runs during a pause, and what waits', '### How a successor or a custodian takes over', '### When the pause ends'].every((h, i, a) => opsPart.includes(h) && (i === 0 || opsPart.indexOf(a[i - 1]) < opsPart.indexOf(h)))
    && opsPart.includes('`"submissionsPaused": true`') && opsPart.includes('`"submissionsPaused": false`') && opsPart.includes('Successor settings'));
}

/* ------------------------------------------------------------ 110 */
console.log('\n110. Outside assessments and the proposal for the advisory board (items 463 and 454)');
{
  const oa = read(path.join(ROOT, 'docs', 'outside-assessments.md'));
  const sec = (/\n## An assessment by ChatGPT, 2026-11-12\n([\s\S]*?)\n## /.exec(oa) || [, ''])[1];
  const rows = sec.split('\n').filter((l) => /^\| /.test(l) && !/^\| (Point|---)/.test(l)).map((l) => l.split(' | '));
  const POINTS = ['Everything depends on one person', 'No independent authors yet', 'Moderation is not quality control', 'Recognition is limited', 'Preservation', 'Integrations', 'Operational statistics'];
  ok('the record of outside assessments names the assessment of 2026-11-12 as an outside evaluation by a language model, not an endorsement, and gives each of its ' + POINTS.length + ' points with what was done and its state',
    oa.includes('An assessment listed here is an outside evaluation, not an endorsement.') && sec.includes('It is an outside evaluation made by a language model, not a review by a person, and not an endorsement.')
    && rows.length === POINTS.length && POINTS.every((p, i) => rows[i][0].startsWith('| ' + p)) && rows.every((r) => r.length === 3 && r[1].trim() && r[2].replace(/\|\s*$/, '').trim())
    && read(path.join(ROOT, 'README.md')).includes('(docs/outside-assessments.md)'));
  let merged = new Set();
  try { merged = new Set(require('child_process').execFileSync('git', ['log', '--first-parent', '--format=%s', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).split('\n').map((l) => (/^Merge pull request #(\d+)|\(#(\d+)\)$/.exec(l) || []).slice(1).find(Boolean)).filter(Boolean)); } catch (e) { merged = new Set(); }
  const cited = [...oa.matchAll(/pull request #(\d+)/g)].map((m) => m[1]);
  ok('it cites only pull requests that were merged (' + cited.join(', ') + ')', cited.length > 0 && cited.every((n) => merged.has(n)), cited.filter((n) => !merged.has(n)).join(', '));
  const prop = read(path.join(ROOT, 'docs', 'advisory-proposal.md'));
  const S110 = JSON.parse(read(path.join(ROOT, 'site.json')));
  const n = Object.keys(S110.categories).length;
  const W = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  const fieldsLine = (/^- One seat each for (.+)\.$/m.exec(prop) || [, ''])[1];
  ok('the proposal for the advisory board says that Claude adopted it as the plan on 2026-11-12, with the call unchanged and no adviser yet, in both languages, and its count is the number of fields in site.json (' + n + '), each field named',
    prop.includes('Adopted as the plan by Claude on 2026-11-12. The [call for an advisory board](../advisory.md) stays as it is, and there is no adviser yet.')
    && prop.includes('この案は、2026-11-12 に Claude が計画として採りました。サイトの募集の頁はそのままで、委員はまだいません。')
    && prop.includes('\n## What was decided\n\nDecided by Claude on 2026-11-12:\n') && !/Decided on 2026-11-12|Adopted as the plan on/.test(prop) && !/案（|Draft, not decided/.test(prop) && prop.includes('One adviser for each field that Sophaxis lists, ' + W[n] + ' in all while `site.json` names ' + W[n] + ' fields.')
    && prop.includes('`site.json` が ' + n + ' 分野を挙げているあいだは、合わせて ' + n + ' 人です。')
    && Object.values(S110.categories).every((c) => fieldsLine.toLowerCase().includes(c.toLowerCase())) && fieldsLine.split(/, | and /).length === n);
  const adv = read(path.join(ROOT, 'advisory.md'));
  ok('its declaration asks what the call asks: positions, payments in the period the call names, listed works, and anything else',
    ['Any position held now at a repository, publisher, journal, preprint server or index.', 'Any payment received in the last three years from one of them.', 'Any listed work of their own, or of a close collaborator, on Sophaxis.'].every((x) => adv.includes(x))
    && ['1. Positions held now at a repository, publisher, journal, preprint server or index:', '2. Payments received, in the period the call names, from one of them:', '3. Works of my own, or of a close collaborator, listed on Sophaxis:', '4. Anything else that a reader might reasonably see as a conflict, or "none":'].every((x) => prop.includes(x)));
  const ops = read(path.join(ROOT, 'docs', 'operations.md'));
  ok('the operator’s routine says that the state of the PhilPapers request cannot be read from here, since PhilPapers refuses automated requests, and that no new request has been made (item 462)',
    ops.includes('PhilPapers answers automated requests with 403, so the state of the request to its Open Access Gateway, asked on 2026-11-03, cannot be read from here.')
    && ops.includes('No new request has been made, and none is made before a work by another researcher is listed.') && !ops.includes('is checked by hand') && read(path.join(ROOT, 'README.md')).includes('On the same day the operator asked PhilPapers to add Sophaxis to its Open Access Gateway'));
}

/* ------------------------------------------------------------ 111 */
console.log('\n111. Each page opens with a sentence that says what it is (item 472)');
{
  const firstLine = (t) => t.split('\n').find((l, i) => i > 0 && l.trim() && !/^(Last updated:|最終更新：|Japanese: |これは英語の )/.test(l)) || '';
  const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.md') && !['README.md', 'CHANGELOG.md', 'CLAUDE.md', 'CONTRIBUTING.md', 'SECURITY.md'].includes(f))
    .concat(fs.readdirSync(path.join(ROOT, 'policies')).filter((f) => f.endsWith('.md')).map((f) => 'policies/' + f));
  const OPENS = /^(This page |These Terms of Use |The [A-Z][a-z]+ Policy |Sophaxis (is|runs) |この頁は、|この利用規約は、|[^、。]{1,12}の規程は、|Sophaxis (は、|には、|の個人情報))/;
  const bad = pages.filter((f) => { const l = firstLine(read(path.join(ROOT, f))); return /^#/.test(l) || /^(The laws, licences and terms that this page cites|この頁が引く法令)/.test(l) || !OPENS.test(l); });
  ok('every page and policy built from Markdown (' + pages.length + ' files) opens with a sentence that says what it is, not with a heading or a note on its quotations', bad.length === 0, bad.join(', '));
  ok('a page that opens with a heading or with the note on quotations is refused',
    !OPENS.test(firstLine('# T\n\nLast updated: 2026-11-12.\n\n## The aim\n')) && /^(The laws, licences and terms that this page cites)/.test(firstLine('# T\n\nThe laws, licences and terms that this page cites are quoted.\n')));
}

console.log('\n112. The legal audit of 2026-11-12: its table, its counts, its quotations of official guidance, and what it changed');
{
  const RAW = JSON.parse(read(path.join(ROOT, 'verification', 'sources-raw.json')));
  const GUIDES = ['mic-entry-manual', 'mic-entry-procedures', 'ppc-guidelines', 'ppc-qa'];
  // The guidance is kept in the parts that are quoted (tools/sources.js), read as those parts.
  const kept = require('../tools/citations.js').kept;
  const pool = GUIDES.map((k) => kept(((RAW.sources[k] || {}).articles || {}).all)).join('').replace(/\s+/g, '');
  const JUDGE = ['誤り', '根拠不足', '漏れ', '表現', '問題なし'];
  // The quotations in 「」 of a line, nested brackets kept inside.
  const quotes = (line) => { const out = []; let depth = 0, cur = ''; for (const ch of line) { if (ch === '「') { if (depth++ > 0) cur += ch; } else if (ch === '」') { if (--depth > 0) cur += ch; else { out.push(cur); cur = ''; } } else if (depth > 0) cur += ch; } return out; };
  const inPool = (q) => q.split('…').map((x) => x.replace(/\s+/g, '')).filter(Boolean).every((x) => pool.includes(x));
  /* Pure: what is wrong with an audit text; [] when nothing is. */
  const problems = (t) => {
    const bad = [];
    const sec = (h) => (t.split('\n## ' + h + '\n')[1] || '').split('\n## ')[0];
    const table = sec('点検の表');
    if (!table.includes('| 箇所 | 法令と条 | 要件 | 事実 | 判定 | 対応 |')) bad.push('the columns');
    const rows = table.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| ---') && !l.startsWith('| 箇所 |'));
    const cells = rows.map((l) => l.split(' | '));
    cells.forEach((c, i) => { if (c.length !== 6 || !JUDGE.includes(c[4])) bad.push('row ' + (i + 1)); });
    for (const j of JUDGE) {
      const n = cells.filter((c) => c[4] === j).length;
      if (!sec('判定の数').includes('- ' + j + '：' + n + '\n')) bad.push('the count of ' + j);
    }
    for (const law of ['電気通信事業法', '個人情報保護法', '消費者契約法']) if (!rows.some((l) => l.startsWith('| 運営者が個人事業主の場合と、そうでない場合（' + law + '） |'))) bad.push('both cases for ' + law);
    const qs = sec('公式の手引きから引いた文').split('\n').filter((l) => l.startsWith('- '));
    if (qs.length < 5) bad.push('too few quotations');
    for (const l of qs) for (const q of quotes(l)) if (!inPool(q)) bad.push('not in the fetched guidance: ' + q.slice(0, 30));
    if (!sec('点検した法令').includes('電気通信事業法、情報流通プラットフォーム対処法')) bad.push('the laws checked');
    if (!sec('取り寄せられなかった文').includes('確かめていないものとして扱います。')) bad.push('the texts not fetched');
    if (!sec('決めたこと').split('\n').filter((l) => l.startsWith('- ')).every((l) => l.includes('2026-11-12 に Claude が決めました。'))) bad.push('a decision without its maker');
    if (!sec('この記録について').includes('この点検は Claude が行ったもので、弁護士の点検ではありません。弁護士はこの記録を確かめていません。')) bad.push('the statement that no lawyer reviewed it');
    if (/弁護士が(確かめ|点検|確認)しました|reviewed by a lawyer\./.test(t)) bad.push('a claim of a lawyer');
    return bad;
  };
  const audit = read(path.join(ROOT, 'docs', 'legal-audit-2026-11-12.md'));
  const found = problems(audit);
  const nRows = (audit.split('\n## 点検の表\n')[1] || '').split('\n## ')[0].split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| ---') && !l.startsWith('| 箇所 |')).length;
  ok('the audit of 2026-11-12 is a table of ' + nRows + ' rows with the six columns, each judged one of the five ways, counted correctly, with both cases of a sole proprietor for three laws, its laws, the texts not fetched, Claude\'s decisions, and the statement that no lawyer reviewed it',
    nRows >= 40 && found.length === 0, found.join(' / '));
  // Its quotations of the Entry Manual and the Commission's Guidelines, and those of the legal review, are in the fetched texts.
  const rv = read(path.join(ROOT, 'docs', 'legal-review.md'));
  const rvq = rv.split('\n').filter((l) => /Entry Manual|General Guidelines/.test(l)).flatMap(quotes);
  ok('every quotation of the official guidance in the audit and the legal review (' + rvq.length + ' in the review) is in the guidance fetched on ' + RAW.fetched,
    GUIDES.every((k) => RAW.sources[k] && RAW.sources[k].status === 200) && rvq.length >= 5 && rvq.every(inPool), rvq.filter((q) => !inPool(q)).join(' / '));
  // Breaking on purpose: a wrong judgement, a wrong count, an altered quotation, a lost statement each fail.
  const broken = [
    audit.replace('| 誤り | 審査の文を', '| 軽微 | 審査の文を'),
    audit.replace(/- 漏れ：(\d+)/, (m, n) => '- 漏れ：' + (Number(n) + 1)),
    audit.replace('すなわち収益事業を行うことを意味する', 'すなわち営利事業を行うことを意味する'),
    audit.replace('弁護士はこの記録を確かめていません。', ''),
    audit.replace('| 運営者が個人事業主の場合と、そうでない場合（消費者契約法） |', '| 消費者契約法の適用 |'),
  ];
  ok('the check fails on a wrong judgement, a wrong count, an altered quotation, a lost statement on lawyers, and a missing case of a sole proprietor', broken.every((b) => b !== audit && problems(b).length > 0));
  // What the audit changed stays: the conclusions on registration and on the sender, the open duties, and the corrected limits.
  const tk = read(path.join(ROOT, 'policies', 'takedown.md')), tkj = read(path.join(ROOT, 'policies', 'takedown.ja.md'));
  const pv = read(path.join(ROOT, 'policies', 'privacy.md')), pvj = read(path.join(ROOT, 'policies', 'privacy.ja.md'));
  ok('the review concludes that no registration or notification is needed, and that Sophaxis is the sender of its record pages and copies; the Takedown and Privacy Policies say so in both languages; the review no longer claims that no law was left out',
    rv.includes('Conclusion: under the Telecommunications Business Act, Sophaxis needs neither registration under Article 9 nor notification under Article 16.')
    && rv.includes('The operator writes every record page and places every PDF copy on Vercel, so for the record pages and the copies the operator is the sender.')
    && tk.includes('Sophaxis does not rely on the limitation of the liability of providers in that Act, which does not apply to a provider that is the sender, and the operator is liable for the record pages and the copies as Japanese law provides, including Article 709 of the Civil Code.')
    && tkj.includes('Sophaxis は、同法が定める提供者の責任の制限には拠りません。この制限は、発信者である提供者には掛からないためです。')
    && pv.includes('so the operator considers that it runs no telecommunications business and that Article 27-12 does not apply to it.')
    && pvj.includes('そのため運営者は、電気通信事業を営んでいないと考えており、第 27 条の 12 は Sophaxis に掛からないと考えています。')
    && !rv.includes('no law above was left out') && rv.includes('It does not show that no law was left out'));
}

console.log('\n113. The duties the audit left open: the mailbox, the request logs, the information of Rules Article 17, and the records of provision');
{
  const RAW = JSON.parse(read(path.join(ROOT, 'verification', 'sources-raw.json')));
  const P = RAW.pages || {};
  const flat = (x) => String(x || '').replace(/\s+/g, '');
  const sp = (x) => String(x || '').replace(/\s+/g, ' ');
  // A page is kept in the parts that the repository quotes or relies on (tools/sources.js), read as those parts.
  const kept = require('../tools/citations.js').kept;
  const pageText = (k) => (P[k] && P[k].status === 200 && kept(P[k].spans)) || '';
  const quotes = (line) => { const out = []; let depth = 0, cur = ''; for (const ch of line) { if (ch === '「') { if (depth++ > 0) cur += ch; } else if (ch === '」') { if (--depth > 0) cur += ch; else { out.push(cur); cur = ''; } } else if (depth > 0) cur += ch; } return out; };
  // Every service that the Privacy Policy names under "Services outside Japan", and every service read from, has a row.
  const SERVICES = ['GitHub', 'Vercel', 'ORCID', 'Internet Archive', 'Anthropic', 'OpenAI', 'xAI', 'Apple (the mailbox)', 'OpenAlex', 'DataCite', 'Crossref', 'Japan Link Center'];
  /* Pure: what is wrong with docs/records-of-provision.md; [] when nothing is. */
  const recProblems = (t) => {
    const bad = [];
    const sec = (h) => (t.split('\n## ' + h + '\n')[1] || '').split('\n## ')[0];
    const rows = (h) => sec(h).split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| ---')).slice(1).map((l) => l.slice(2, -2).split(' | '));
    const recips = rows('Recipients').concat(rows('Services that give Sophaxis personal data'));
    for (const name of SERVICES) if (!recips.some((c) => c[0] === name)) bad.push('no row for ' + name);
    for (const c of recips) {
      if (c.length !== 7) { bad.push('the cells of ' + c[0]); continue; }
      const [who, nm, addr, rep, , page, record] = c;
      const text = sp(page === 'none' ? '' : pageText(page));
      if (page !== 'none' && !P[page]) bad.push('no fetched page ' + page);
      for (const [what, v] of [['name', nm], ['address', addr], ['representative', rep]]) if (!/^Not /.test(v) && !text.includes(v)) bad.push('the ' + what + ' of ' + who + ' is not on its page');
      if ((/^Not /.test(nm) || /^Not /.test(addr)) && !/^Not required/.test(record)) bad.push(who + ' lacks a name or an address where a record is required');
      if (/^Not fetched/.test(addr) && page !== 'none' && P[page] && P[page].status === 200 && (P[page].length || 0) > 300) bad.push(who + ' is said not fetched, but was');
    }
    const g = flat(pageText('ppc-guidelines-records'));
    const qs = sec('What the law asks').split('\n').filter((l) => l.startsWith('- ')).flatMap(quotes);
    if (qs.length < 5) bad.push('too few quotations of the guidelines');
    for (const q of qs) if (!g.includes(flat(q))) bad.push('not in the fetched guidelines: ' + q.slice(0, 20));
    for (const c of rows('Records')) if (c.length !== 5 || c.some((x) => !x.trim())) bad.push('a record with an empty item');
    for (const x of ['## How a new record is added', 'the pull request that publishes it also adds a row under "Records"', '## How long records are kept', 'longer than the three years that Article 21 of the APPI Enforcement Rules asks', 'Nothing here is written from memory']) if (!t.includes(x)) bad.push('missing: ' + x.slice(0, 40));
    return bad;
  };
  const rec = read(path.join(ROOT, 'docs', 'records-of-provision.md'));
  const found = recProblems(rec);
  ok('docs/records-of-provision.md has a row for each of the ' + SERVICES.length + ' services, each name, address and representative is on the recipient\'s own page fetched on ' + RAW.fetched + ', a row without one needs no record, its quotations of the guidelines are in the fetched text, and it says how records are added and kept',
    found.length === 0, found.join(' / '));
  /* Pure: what is wrong with the two Privacy Policies. */
  const us = flat(pageText('ppc-report-us'));
  const polProblems = (en, ja) => {
    const bad = [];
    const need = [[en, 'iTunes K.K., located at Roppongi Hills, 6-10-1 Roppongi, Minato-ku, Tokyo 106-6140', 'icloud-terms'], [ja, '106-6140東京都港区六本木6丁目10番1号 六本木ヒルズに所在するiTunes株式会社', 'icloud-terms-jp'],
      [en, 'appropriate technical and organizational security measures designed to protect personal data from loss, misuse, and unauthorized access, disclosure, alteration, or destruction', 'anthropic-privacy']];
    for (const [t, x, k] of need) if (!t.includes(x) || !sp(pageText(k)).includes(x)) bad.push('not on the page and in the policy: ' + x.slice(0, 30));
    for (const x of ['no consent is asked of the people who write', 'The request logs are therefore not personal information for Sophaxis', 'https://www.ppc.go.jp/enforcement/infoprovision/laws/offshore_report_america/', 'It has taken part in the APEC Cross-Border Privacy Rules (CBPR) System since 2012-07-25', 'the United States has no comprehensive federal law on personal information',
      '- GitHub:', '- Vercel:', '- ORCID:', '- The Internet Archive:', '- Anthropic:', '- OpenAI:', '- xAI:', 'GitHub (United States)', 'Vercel (United States)', 'ORCID (United States)', 'the Internet Archive (United States)', 'Anthropic, OpenAI and xAI (all United States)']) if (!en.includes(x)) bad.push('English: ' + x.slice(0, 40));
    for (const x of ['メールを書く人に同意は求めません。', 'そのため閲覧の要求の記録は、Sophaxis にとって個人情報ではありません。', 'https://www.ppc.go.jp/enforcement/infoprovision/laws/offshore_report_america/', 'APEC の CBPR システムには、2012 年 7 月 25 日から参加しています。',
      '- GitHub：', '- Vercel：', '- ORCID：', '- Internet Archive：', '- Anthropic：', '- OpenAI：', '- xAI：', 'GitHub（米国）', 'Vercel（米国）', 'ORCID（米国）', 'Internet Archive（米国）', 'Anthropic・OpenAI・xAI（いずれも米国）']) if (!ja.includes(x)) bad.push('Japanese: ' + x.slice(0, 30));
    const usPart = ja.split('米国の制度については、')[1] || '';
    const jq = quotes(usPart.split('\n\n')[0]);
    if (jq.length < 2) bad.push('the Commission\'s words on the United States are not quoted');
    for (const q of jq) if (!us.includes(flat(q))) bad.push('not in the Commission\'s information: ' + q.slice(0, 20));
    if (!us.includes(flat('2012 年 7 月 25 日参加'))) bad.push('the day of joining the CBPR System is not the Commission\'s');
    if (/The United States has no general federal law|handle personal data for Sophaxis, and neither is bound by contract/.test(en)) bad.push('an old sentence');
    if (!/^- OpenAI: Sophaxis cannot give information/m.test(en) || (P['openai-privacy'] || {}).status === 200) bad.push('OpenAI\'s measures');
    return bad;
  };
  const en = read(path.join(ROOT, 'policies', 'privacy.md')), ja = read(path.join(ROOT, 'policies', 'privacy.ja.md'));
  const pf = polProblems(en, ja);
  ok('the Privacy Policy, in both languages, names iTunes K.K. as its own terms give it, asks no consent of those who write, says why the request logs are not personal information, gives the Commission\'s information on the United States in its words, and gives or explains the measures of every recipient abroad (Rules Article 17)',
    pf.length === 0, pf.join(' / '));
  // The quotations in the review and in the follow-up of the audit are in the fetched texts.
  const pool = flat(Object.values(P).map((x) => kept(x.spans)).join('') + ['ppc-qa', 'ppc-guidelines'].map((k) => kept(((RAW.sources[k] || {}).articles || {}).all)).join('')
    + Object.values(RAW.sources['egov:415AC0000000057'].articles).join(''));
  const rv = read(path.join(ROOT, 'docs', 'legal-review.md'));
  const rvSec = (rv.split('### Personal information: whether the operator is a business operator, and the records of provision\n')[1] || '').split('\n### ')[0];
  const au = read(path.join(ROOT, 'docs', 'legal-audit-2026-11-12.md'));
  const auSec = (au.split('\n## その後の対応\n')[1] || '').split('\n## ')[0];
  const qq = rvSec.split('\n').flatMap(quotes).concat(auSec.split('\n').filter((l) => l.startsWith('| ')).flatMap(quotes));
  const missing = qq.filter((q) => !pool.includes(flat(q)));
  ok('every quotation in the review\'s section on the records of provision and in the audit\'s follow-up (' + qq.length + ') is in a text fetched on ' + RAW.fetched, qq.length >= 8 && missing.length === 0, missing.map((q) => q.slice(0, 20)).join(' / '));
  // The duties: none of the Act is open, the two rows are settled, and the audit says what followed.
  const D = JSON.parse(read(path.join(ROOT, 'verification', 'duties.json'))).duties;
  const row = (a) => D.find((u) => u.law === 'APPI' && u.article === a) || {};
  ok('no duty of the Act on the Protection of Personal Information is open; Article 28(1) does not reach the mailbox or the logs, with the reason, Article 29 is met by the records file, and the audit keeps its findings and lists what followed',
    !D.some((u) => u.law === 'APPI' && u.status === 'open') && row('第28条第1項（Apple の受信箱と Vercel の記録）').applies === false && /iTunes 株式会社/.test(row('第28条第1項（Apple の受信箱と Vercel の記録）').reason || '')
    && row('第29条第1項・規則第20条第1項第二号（受け手の住所）').status === 'met' && (row('第29条第1項・規則第20条第1項第二号（受け手の住所）').by || []).some((b) => b.file === 'docs/records-of-provision.md')
    && row('第29条第2項・規則第21条').status === 'met' && row('第30条第1項・第3項（DataCite・Crossref・JaLC・ORCID から読むとき）').applies === false
    && auSec.includes('点検の表と判定の数は、点検したときのまま残しています。') && (auSec.match(/^\| 個人情報保護法第 (28|29|30) 条/gm) || []).length === 4 && rv.includes('## Duties still open\n\nNone.')
    && read(path.join(ROOT, 'contact.md')).includes('iTunes K.K., a company in Japan') && read(path.join(ROOT, 'contact.ja.md')).includes('日本の会社 iTunes 株式会社'));
  // Breaking on purpose.
  const brokenRec = [rec.replace('88 Colin P. Kelly Jr. St.', '1 Main St.'), rec.replace(/^\| OpenAI \|.*\n/m, ''), rec.replace('単に閲覧する行為', '単に閲覧したとき'),
    rec.replace('| Day | Person | Items | Consent | Recipient |\n| --- | --- | --- | --- | --- |\n', '| Day | Person | Items | Consent | Recipient |\n| --- | --- | --- | --- | --- |\n| 2026-11-12 | 0000-0002-1825-0097 |  | issue #1 | many unspecified people |\n'),
    rec.replace('| United States | ia-terms | Not required: public information |', '| United States | ia-terms | Required |'), rec.replace('| Matthew Buys, Executive Director |', '| Jane Doe |')];
  const brokenPol = [[en, ja.replace('106-6140東京都港区六本木6丁目10番1号 六本木ヒルズに所在するiTunes株式会社', 'iTunes株式会社')], [en, ja.replace('「包括的な法令は存在しない。」', '「包括的な法令が存在する。」')],
    [en.replace(/^- OpenAI: .*\n/m, ''), ja], [en.replace('no consent is asked of the people who write', 'consent is asked of the people who write'), ja], [en + '\nThe United States has no general federal law on personal data.\n', ja]];
  ok('the checks fail on a wrong address, a missing recipient, an altered quotation, an empty item of a record, a missing address where a record is required, a wrong representative, a lost address of iTunes K.K., an altered word of the Commission, a lost recipient\'s measures, a consent asked, and the old words on the United States',
    brokenRec.every((b) => b !== rec && recProblems(b).length > 0) && brokenPol.every(([a, b]) => (a !== en || b !== ja) && polProblems(a, b).length > 0));
}

console.log('\n114. The continuation of the audit: the texts fetched to close its gaps, each hashed, its quotations, what is still not fetched, and the safer wording');
{
  const RAW = JSON.parse(read(path.join(ROOT, 'verification', 'sources-raw.json')));
  const S = require('../tools/sources.js');
  const sha = (x) => crypto.createHash('sha256').update(x, 'utf8').digest('hex');
  const flat = (x) => String(x || '').replace(/\s+/g, '');
  /* Pure: what is wrong with the hashes of the texts fetched one by one. From 2026-11-12, every page and every text that is
   * not a law is kept only in parts, with the SHA-256 of its whole text (tools/sources.js keptProblems); given the whole texts
   * of a run (`full`), a text fetched again that has another SHA-256, or a part that is not in it at its place, is caught.
   * Every whole law carries the SHA-256 of each article, and every key is named in tools/sources.js. */
  const hashProblems = (raw, full = null) => {
    const bad = S.keptProblems(raw, full);
    for (const k of Object.keys(raw.pages || {})) if (!S.PAGES[k.split('>')[0]]) bad.push('page not in tools/sources.js: ' + k);
    for (const [k, L] of Object.entries(raw.laws || {})) {
      if (!S.LAWS[k]) bad.push('law not in tools/sources.js: ' + k);
      if (L.status === 200 && L.title !== L.wanted) bad.push('law ' + k + ' is not the one wanted');
      if (L.status !== 200 && !L.error && L.status === undefined) bad.push('law ' + k + ' without a status or an error');
      for (const [a, t] of Object.entries(L.articles || {})) if ((L.sha256 || {})[a] !== sha(t)) bad.push('law ' + k + ' ' + a);
      for (const [i, x] of (L.suppl || []).entries()) if (x.sha256 !== sha(x.text)) bad.push('law ' + k + ' supplementary ' + i);
    }
    return bad;
  };
  // The whole texts of a run, where they are at hand (verification/sources-full.json, the artifact of the run); never committed.
  const FULL = fs.existsSync(S.FULL) ? JSON.parse(read(S.FULL)) : null;
  const hp = hashProblems(RAW, FULL);
  const pagesHashed = Object.values(RAW.pages || {}).filter((o) => /^[0-9a-f]{64}$/.test(o.sha256 || '') && Array.isArray(o.spans)).length;
  const lawsHashed = Object.values(RAW.laws || {}).reduce((n, L) => n + Object.keys(L.articles || {}).length + (L.suppl || []).length, 0);
  ok('every page fetched (' + pagesHashed + ') is kept in parts with the SHA-256 of its whole text, every article and supplementary provision of the whole laws (' + lawsHashed + ') carries the SHA-256 of its text, and each is named in tools/sources.js' + (FULL ? '; the parts and hashes agree with the whole texts at hand' : ''),
    hp.length === 0 && pagesHashed >= 60 && lawsHashed >= 200, hp.join(' / '));
  // The texts the continuation relies on, and those fetched for the other repositories, are in the file as fetched.
  const NEED = ['mic-et-guidelines>1', 'mic-et-faq', 'mic-ihoyugai>3', 'caa-cca-annotations>1', 'caa-cca-annotations>2', 'bunka-seidokaisetsu>1', 'vercel-fair-use', 'zenodo-terms', 'osf-terms', 'github-site-policy-license', 'openai-privacy-archived', 'xai-terms',
    'ssrn-terms', 'philpapers-terms', 'philarchive-about', 'orcid-terms', 'orcid-public-api-terms', 'edx-terms', 'joss-about', 'joss-sidebar-src', 'datacite-terms', 'datacite-api-docs', 'crossref-rest-api', 'openalex-license-src', 'conatus-about', 'conatus-submissions'];
  const LAWS_NEED = ['telecom-rules', 'ipa-rules', 'appi-order', 'copyright-act-suppl', 'swords-act', 'swords-order', 'swords-rules'];
  const missingNeed = NEED.filter((k) => !RAW.pages[k] || RAW.pages[k].status !== 200 || !RAW.pages[k].sha256).concat(LAWS_NEED.filter((k) => !RAW.laws || !RAW.laws[k] || RAW.laws[k].status !== 200));
  ok('the ' + NEED.length + ' pages and ' + LAWS_NEED.length + ' whole laws that the continuation and the other repositories rely on were fetched with status 200 and hashed', missingNeed.length === 0, missingNeed.join(', '));
  // The pool of every fetched text, without white space.
  const kept = require('../tools/citations.js').kept;
  const pool = flat(Object.values(RAW.pages || {}).map((o) => kept(o.spans)).join('')
    + Object.values(RAW.laws || {}).map((L) => Object.values(L.articles || {}).join('') + (L.suppl || []).map((x) => x.text).join('')).join('')
    + Object.values(RAW.sources).map((r) => Object.values(r.articles || {}).map(kept).join('')).join(''));
  const quotes = (line) => { const out = []; let depth = 0, cur = ''; for (const ch of line) { if (ch === '「') { if (depth++ > 0) cur += ch; } else if (ch === '」') { if (--depth > 0) cur += ch; else { out.push(cur); cur = ''; } } else if (depth > 0) cur += ch; } return out; };
  const JUDGE = ['誤り', '根拠不足', '漏れ', '表現', '問題なし'];
  const FETCHED_NOW = ['電気通信事業法施行規則', 'Vercel の言う商用', 'Zenodo と OSF', 'OpenAI', 'xAI', '第 18 条', '施行規則第 16 条'];
  /* Pure: what is wrong with the audit's continuation and its list of texts not fetched; [] when nothing is. */
  const contProblems = (t, poolFlat) => {
    const bad = [];
    const sec = (h) => (t.split('\n## ' + h + '\n')[1] || '').split('\n## ')[0];
    const c = sec('2026-11-12 の続き：取り寄せた周辺の文');
    if (!c.includes('| 箇所 | 法令と条 | 要件 | 事実 | 判定 | 対応 |')) bad.push('the columns');
    const rows = c.split('\n').filter((l) => l.startsWith('| ') && !l.startsWith('| ---') && !l.startsWith('| 箇所 |')).map((l) => l.split(' | '));
    if (rows.length < 10) bad.push('too few rows');
    rows.forEach((r, i) => { if (r.length !== 6 || !JUDGE.includes(r[4])) bad.push('row ' + (i + 1)); });
    const count = JUDGE.filter((j) => rows.some((r) => r[4] === j)).map((j) => j + ' ' + rows.filter((r) => r[4] === j).length).join('、');
    if (!c.includes('この表の判定は、' + count + ' です。')) bad.push('the count');
    const qs = c.split('\n').filter((l) => l.startsWith('| ')).flatMap(quotes);
    if (qs.length < 15) bad.push('too few quotations');
    for (const q of qs) if (!poolFlat.includes(flat(q))) bad.push('not in a fetched text: ' + q.slice(0, 30));
    for (const r of rows.filter((x) => x[4] === '根拠不足')) if (!r[5].includes('2026-11-12 に Claude が決めました。')) bad.push('a safer choice without its maker: ' + r[0]);
    if (!c.includes('点検の表は、点検したときのまま残しています。')) bad.push('the original rows are not kept');
    const nf = sec('取り寄せられなかった文');
    const items = nf.split('\n').filter((l) => l.startsWith('- '));
    if (items.length < 5 || !nf.includes('確かめていないものとして扱います。')) bad.push('the list of texts not fetched');
    for (const l of items) if (!/。.+。$/.test(l)) bad.push('an item without its reason: ' + l.slice(2, 20));
    for (const x of FETCHED_NOW) if (items.some((l) => l.startsWith('- ' + x) || l.includes(x + 'の'))) bad.push('listed as not fetched, but fetched: ' + x);
    return bad;
  };
  const audit = read(path.join(ROOT, 'docs', 'legal-audit-2026-11-12.md'));
  const cp = contProblems(audit, pool);
  const nCont = ((audit.split('\n## 2026-11-12 の続き：取り寄せた周辺の文\n')[1] || '').split('\n## ')[0].match(/^\| (?!---|箇所 \|)/gm) || []).length;
  ok('the continuation of the audit is a table of ' + nCont + ' rows with the six columns, each judged one of the five ways and counted, every quotation in it is word for word in a fetched text, every safer choice names its maker, and the list of texts not fetched holds only what is still not fetched, each with its reason',
    cp.length === 0, cp.join(' / '));
  // The safer wording: the rules on sending users' information met as if they applied; the agreed court narrowed from a day 14 days after its change.
  const pv = read(path.join(ROOT, 'policies', 'privacy.md')), pvj = read(path.join(ROOT, 'policies', 'privacy.ja.md'));
  const PV = ['Sophaxis therefore meets these rules as if they applied, and gives here, for each request that its pages make a reader\'s browser send, the three things that the Ordinance asks to be made known.', 'What is sent: ', 'Who handles it: ', 'What for: '];
  const PVJ = ['そこで Sophaxis は、この規律が掛かるものとして務めを果たします。', '送られる情報は、', '取り扱うのは、', '利用目的は、'];
  const tm = read(path.join(ROOT, 'policies', 'terms.md')), tmj = read(path.join(ROOT, 'policies', 'terms.ja.md'));
  const COURT = "From 2026-11-26, this agreement on the court covers only suits based on these terms, or on the submission, listing, correction, withdrawal or removal of that person's own works under them; for any other dispute, the court that the law sets has jurisdiction.";
  const COURT_JA = '2026-11-26 から、この裁判所の合意の対象は、この規約に基づく訴えと、この規約のもとでのその人自身の作品の投稿・掲載・訂正・撤回・削除に基づく訴えに限ります。それ以外の紛争は、法令の定める裁判所が管轄します。';
  const site = JSON.parse(read(path.join(ROOT, 'site.json')));
  const changes = JSON.parse(read(path.join(ROOT, 'data', 'policy-changes.json')));
  /* Pure: what is wrong with the safer wording; [] when nothing is. */
  const saferProblems = (en, ja, t, tj, notice, ch, changed) => {
    const bad = [];
    for (const x of PV) if (!en.includes(x)) bad.push('Privacy Policy: ' + x.slice(0, 30));
    for (const x of PVJ) if (!ja.includes(x)) bad.push('個人情報の取り扱い: ' + x.slice(0, 15));
    if (/The Ministry's Ordinance was not fetched|総務省令は取り寄せていません/.test(en + ja)) bad.push('the old sentence on the Ordinance');
    if (!t.includes(COURT) || !tj.includes(COURT_JA)) bad.push('the narrowed agreement on the court');
    if (!String(notice.text || '').includes('From 2026-11-26, that agreement on the court covers only suits based on the Terms of Use')) bad.push('the notice on the top page');
    const e = ch.find((c) => c.from === '2026-11-26' && c.policies.includes('terms'));
    if (!e || !/^\d{4}-\d{2}-\d{2}$/.test(changed) || (Date.parse(e.from) - Date.parse(changed)) / 86400000 < 14 || (Date.parse(e.from) - Date.parse(e.date)) / 86400000 < 14) bad.push('the change is not announced 14 days ahead');
    return bad;
  };
  let changed = '';
  try { changed = require('child_process').execFileSync('git', ['log', '--reverse', '--format=%cs', '-S', 'From 2026-11-26, this agreement on the court covers only', '--', 'policies/terms.md'], { cwd: ROOT, encoding: 'utf8' }).split('\n')[0] || ''; } catch (e) { changed = ''; }
  // A working tree whose change is not committed yet counts from today.
  if (!changed && tm.includes(COURT)) changed = new Date().toISOString().slice(0, 10);
  const sp = saferProblems(pv, pvj, tm, tmj, site.termsNotice || {}, changes, changed);
  ok('the Privacy Policy meets the rules on sending users\' information as if they applied, giving what is sent, who handles it and for what, in both languages; the agreed court covers only suits based on the Terms from 2026-11-26, announced on the top page and in the feed at least 14 days ahead',
    sp.length === 0, sp.join(' / ') + ' ' + changed);
  // The review: the Consumer Contract Act read again, and the definition of commercial use; the records: OpenAI and xAI.
  const rv = read(path.join(ROOT, 'docs', 'legal-review.md')), rec = read(path.join(ROOT, 'docs', 'records-of-provision.md'));
  ok('the review corrects its reading of the Consumer Contract Act from the Agency\'s commentary, quotes Vercel\'s definition of commercial use, and the records give OpenAI\'s and xAI\'s addresses from their pages; Russia\'s Article 18(5) is read and quoted',
    rv.includes('That was wrong. The Consumer Affairs Agency\'s commentary on Article 2, fetched on 2026-11-12') && !rv.includes('If it is not, the Act does not apply by its own terms.')
    && rv.includes('"Commercial usage is defined as any Deployment that is used for the purpose of financial gain of anyone involved in any part of the production of the project"') && !rv.includes("Vercel's own definition of commercial use was not fetched")
    && /^\| OpenAI \| OpenAI OpCo, LLC \| 1455 Third Street, San Francisco, California 94158, United States \|.*\| openai-privacy-archived \|/m.test(rec) && /^\| xAI \| SpaceX Super Intelligence LLC \| 800 W Cesar Chavez St\., Austin, TX 78701, USA \|.*\| xai-terms \|/m.test(rec)
    && /баз данных, находящихся за пределами территории Российской Федерации, не допускаются/.test(((RAW.sources['ru-152'] || {}).articles || {})['18'] || '') && read(path.join(ROOT, 'policies', 'submission.md')).includes('| Russia | Storage of personal data there | Federal Law No. 152-FZ, Article 1(1.1) and Article 18(5) | Yes |'));
  // Breaking on purpose.
  /* A page of a made-up run: its whole text, and the part kept of it. The real whole texts are not committed, so the checks
   * are broken on this one: a text fetched again with another SHA-256, a part not at its place, a whole text committed. */
  const T0 = 'The whole text of a page as it was fetched, with a part that the repository quotes.';
  const part0 = 'a part that the repository quotes';
  const page0 = { url: S.PAGES['ssrn-terms'].url, status: 200, fetched: '2026-11-12', length: T0.length, sha256: sha(T0), spans: [{ at: T0.indexOf(part0), text: part0 }] };
  const raw0 = { pages: { 'ssrn-terms': page0 }, sources: {}, laws: {} }, full0 = { pages: { 'ssrn-terms': { text: T0 } } };
  const rawBad1 = [[raw0, { pages: { 'ssrn-terms': { text: T0.replace('as it was fetched', 'as it is fetched again') } } }],
    [{ ...raw0, pages: { 'ssrn-terms': { ...page0, spans: [{ at: page0.spans[0].at, text: 'a part that the repository does not quote' }] } } }, full0],
    [{ ...raw0, pages: { 'ssrn-terms': { ...page0, text: T0 } } }, null],
    [{ ...raw0, sources: { 'cc-by': { status: 200, articles: { 3: 'Section 3 – License Conditions, kept whole.' } } } }, null]];
  const lawBad = JSON.parse(JSON.stringify(RAW.laws)); const lk = Object.keys(lawBad).find((k) => Object.keys(lawBad[k].articles || {}).length); const ak = Object.keys(lawBad[lk].articles)[0]; lawBad[lk].articles[ak] += '。';
  const rawBad2 = { ...RAW, laws: lawBad };
  const rawBad3 = { ...RAW, pages: { ...RAW.pages, 'not-a-source': { fetched: '2026-11-12', sha256: sha('x'), spans: [] } } };
  const brokenAudit = [audit.replace('営利の要素は必要でなく', '営利の要素は要らず'), audit.replace('この表の判定は、誤り 1、', 'この表の判定は、誤り 2、'), audit.replace('| 誤り | 審査を直しました。運営者は', '| 軽微 | 審査を直しました。運営者は'),
    audit.replace('- ジャパンリンクセンターの住所。', '- Vercel の言う商用の定義。取り寄せていません。\n- ジャパンリンクセンターの住所。'), audit.replace('| 根拠不足 | 2026-11-12 に Claude が決めました。この規律が', '| 根拠不足 | この規律が'),
    audit.replace('- カザフスタンの個人データ法。adilet.zan.kz も、Internet Archive の写しも、スクリプトを求める頁だけを返しました。', '- カザフスタンの個人データ法')];
  const brokenSafer = [[pv.replace('Sophaxis therefore meets these rules as if they applied', 'Sophaxis does not meet these rules'), pvj, tm, tmj, site.termsNotice, changes, changed],
    [pv, pvj.replace('取り扱うのは、', '扱うのは、'), tm, tmj, site.termsNotice, changes, changed], [pv, pvj, tm.replace(COURT, ''), tmj, site.termsNotice, changes, changed],
    [pv, pvj, tm, tmj, { text: '' }, changes, changed], [pv, pvj, tm, tmj, site.termsNotice, changes, '2026-11-20'], [pv + "\nThe Ministry's Ordinance was not fetched.", pvj, tm, tmj, site.termsNotice, changes, changed]];
  ok('the checks fail on a changed text whose hash is not changed, an altered article of a whole law, a page that tools/sources.js does not name, an altered quotation, a wrong count, a wrong judgement, a fetched text listed as not fetched, a safer choice without its maker, an item without its reason, a lost safer wording, a lost notice, and a change announced less than 14 days ahead',
    hashProblems(raw0, full0).length === 0 && rawBad1.every(([r, f]) => hashProblems(r, f).length > 0) && hashProblems(rawBad2).length > 0 && hashProblems(rawBad3).length > 0 && hashProblems(RAW).length === 0
    && brokenAudit.every((b) => b !== audit && contProblems(b, pool).length > 0) && brokenSafer.every((a) => saferProblems(...a).length > 0));
}

/* ------------------------------------------------------------ 115 */
console.log('\n115. The laws of 195 countries applied: fifteen more places from 2026-11-26, read at their sources or marked as not fetched, announced 14 days ahead, and the wording for New Zealand and Switzerland');
{
  const J = (f) => JSON.parse(read(path.join(ROOT, f)));
  const PLACES = { Argentina: 'ar-25326', Colombia: 'co-1581', Ghana: 'gh-dpa', Korea: 'korea-pipa', Mexico: 'mx-lfpdppp', 'the Philippines': 'ph-dpa', 'Saudi Arabia': 'saudi-pdpl', Uruguay: 'uy-18331',
    Zimbabwe: 'zw-dpa', Kenya: 'ke-dpa', Tanzania: null, 'South Africa': 'za-popia', Singapore: 'sg-pdpa', 'the United Arab Emirates': 'ae-pdpl', Qatar: 'qa-pdpl' };
  const W = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  const listedNow = loadPapers(path.join(ROOT, 'data', 'papers')).papers.filter((p) => p.status === 'listed');
  const problems = (c) => {
    const bad = [];
    const later = c.site.notOffered.filter((p) => p.from);
    const n = later.length;
    if (n !== Object.keys(PLACES).length || !Object.keys(PLACES).every((k) => later.some((p) => p.place === k && p.from === '2026-11-26'))) bad.push('the fifteen places of 2026-11-26 in site.json');
    if (!later.every((p) => [true, 'in part', false, 'not fetched'].includes(p.read))) bad.push('a place with no state of reading');
    // A place read at its source has its text fetched with status 200 and the articles its row cites; one not fetched has none.
    for (const p of later) {
      const key = PLACES[p.place], r = key && c.RAW.sources[key];
      const arts = r ? Object.keys(r.articles || {}).filter((a) => a !== 'all') : [];
      if ((p.read === true || p.read === 'in part') && (!r || r.status !== 200 || !arts.length)) bad.push(p.place + ' is said to be read, but its text was not fetched');
      if (p.read === 'not fetched' && arts.length) bad.push(p.place + ' is said not to be fetched, but its articles were');
      if (p.read === 'not fetched' && !/^not known/.test(p.requires)) bad.push(p.place + ': what its law requires is not known');
    }
    const e = c.changes.find((x) => x.from === '2026-11-26' && x.policies.includes('submission'));
    if (!e || (Date.parse(e.from) - Date.parse(e.date)) / 86400000 < 14 || !later.every((p) => e.text.includes(p.place)) || !e.text.includes('in ' + n + ' more places')) bad.push('the change in the feed of policy changes, 14 days ahead');
    if (!c.site.termsNotice.text.includes('From 2026-11-26, Sophaxis is also not offered in ' + n + ' more places') || !later.every((p) => c.site.termsNotice.text.includes(p.place))) bad.push('the notice on the top page');
    if (!c.news.some((x) => x.date === e?.date && later.every((p) => x.text.includes(p.place)))) bad.push('the news');
    const RULE = ['From 2026-11-26, the rule also covers two more kinds of duty that Sophaxis cannot meet.',
      'One is a duty to give people there, before their personal data is collected, a postal address or a telephone number of the operator, which Sophaxis does not publish.',
      'The other is a duty to process the personal data of a minor there only with a parent\'s consent that the service confirms, or not at all.',
      'could not be read at its source, through its official address and one other route; the table gives such a place as "No, not fetched".',
      'For the ' + n + ' places for which the table gives 2026-11-26, this applies from 2026-11-26.'];
    if (!RULE.every((s) => c.sub.includes(s))) bad.push('the rule in the Submission Policy');
    if (!c.subj.includes('表で 2026-11-26 とした ' + n + ' の国と地域については、2026-11-26 からです。') || !c.subj.includes('2026-11-26 から、決まりは、Sophaxis が満たせない務めをもう二つ含みます。') || !c.subj.includes('表では、そうした国と地域を「取り寄せられない」としています。')) bad.push('the rule in the Japanese Submission Policy');
    const NZ = 'Section 22 of New Zealand\'s Privacy Act 2020, in its information privacy principle 12, lets personal information be disclosed abroad on the person\'s authorisation after the person is told this expressly';
    const NZJ = 'ニュージーランドの 2020 年プライバシー法第 22 条の情報プライバシー原則 12 は、このことをはっきり告げたうえで本人が認めれば、国外への開示を許します。';
    if (!c.pv.includes(NZ) || !c.pvj.includes(NZJ) || !c.pv.includes('which Article 17 of Switzerland\'s Federal Act on Data Protection allows.') || !c.pvj.includes('スイスの連邦データ保護法第 17 条がこれを認めています。')) bad.push('the wording for New Zealand and Switzerland in the Privacy Policy');
    if (!c.form.includes('may not be required to protect personal data in a way that, overall, provides safeguards comparable to those of the law of the place where an author lives, such as New Zealand\'s Privacy Act 2020.') || !c.formj.includes('全体として同等の保護で個人データを守るよう求められていないことがあります。')) bad.push('the wording next to the consent in the forms');
    // The legal review: one row for each place added, and the count in words.
    const rsec = (c.rv.split('\n## The laws of 195 countries (2026-11-12)\n')[1] || '').split('\n## ')[0];
    const rrows = rsec.split('\n').filter((l) => /^\| (?!Place |---)/.test(l));
    const cap = (x) => x[0].toUpperCase() + x.slice(1);
    if (!later.every((p) => rrows.some((r) => r.startsWith('| ' + cap(p.place) + ' | ') && r.includes('Added from 2026-11-26'))) || rrows.filter((r) => r.includes('Added from 2026-11-26')).length !== n || !rsec.includes('The ' + W[n] + ' places added are not offered from 2026-11-26')) bad.push('the rows of the legal review');
    const HABEAS = ['Angola', 'Bolivia', 'Brazil', 'Colombia', 'Cape Verde', 'Cuba', 'Ecuador', 'Honduras', 'Mozambique', 'Nicaragua', 'Panama', 'Peru', 'Sweden', 'Venezuela'];
    if (!rsec.includes('The survey also found 30 articles of constitutions') || !HABEAS.every((x) => rsec.includes(x))) bad.push('the constitutions on habeas data');
    // The audit: six columns, five judgements counted, every place named, every narrowing decided and dated, every text not fetched listed.
    const asec = (c.audit.split('\n## 2026-11-12 の続き：各国の法令の当てはめ\n')[1] || '').split('\n## ')[0];
    const arows = asec.split('\n').filter((l) => /^\| (?!箇所 |---)/.test(l));
    const JUD = ['誤り', '根拠不足', '漏れ', '表現', '問題なし'];
    const judged = arows.map((r) => r.split(' | ')[4]);
    const count = (k) => judged.filter((x) => x === k).length;
    const tally = 'この表の判定は、' + JUD.filter((k) => count(k)).map((k) => k + ' ' + count(k)).join('、') + ' です。';
    if (!arows.length || !arows.every((r) => r.split(' | ').length === 6 && JUD.includes(r.split(' | ')[4])) || !asec.includes(tally)) bad.push('the table of the audit and its tally');
    if (!later.every((p) => asec.includes(p.ja))) bad.push('a place missing from the audit');
    if (!arows.filter((r) => r.includes('提供しない国に足しました')).every((r) => r.includes('2026-11-12 に Claude が決めました。'))) bad.push('a narrowing without its maker');
    const nf = asec.split('\n### 取り寄せられなかった文\n')[1] || '';
    if (!later.filter((p) => p.read === 'not fetched' || (p.read === false && p.place !== 'Tanzania' && p.place !== 'Kenya') || p.place === 'Kenya' || p.place === 'Tanzania').every((p) => nf.split('\n### ')[0].includes(p.ja))) bad.push('a text not fetched that is not listed');
    if (!asec.includes('いま載っている ' + c.listed.length + ' 件の記録は、どれも日本に住む運営者だけが著者で') || !c.listed.every((p) => (p.authors || []).every((a) => a.orcid === c.site.operator.orcid))) bad.push('the listed records');
    if (!asec.includes('選び方は、2026-11-12 に Claude が決めました。') || !asec.includes('### 下げられずに残る危険')) bad.push('the rule of choice, or the risks that remain');
    return bad;
  };
  const ctx = { site: J('site.json'), changes: J('data/policy-changes.json'), news: J('data/news.json'), sub: read(path.join(ROOT, 'policies', 'submission.md')), subj: read(path.join(ROOT, 'policies', 'submission.ja.md')),
    pv: read(path.join(ROOT, 'policies', 'privacy.md')), pvj: read(path.join(ROOT, 'policies', 'privacy.ja.md')), form: read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'submission.yml')),
    formj: read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'submission-ja.yml')), rv: read(path.join(ROOT, 'docs', 'legal-review.md')), audit: read(path.join(ROOT, 'docs', 'legal-audit-2026-11-12.md')),
    RAW: J('verification/sources-raw.json'), listed: listedNow };
  const pr = problems(ctx);
  ok('the ' + ctx.site.notOffered.filter((p) => p.from).length + ' places of 2026-11-26 are in site.json, the Submission Policy, the legal review and the audit, each read at its source or marked as not fetched as the fetched texts show, and announced on the top page, in the feed and in the news 14 days ahead',
    pr.length === 0, pr.join(' / '));
  // Breaking on purpose.
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const with_ = (k, v) => ({ ...ctx, [k]: v });
  const s1 = clone(ctx.site); s1.notOffered = s1.notOffered.filter((p) => p.place !== 'Korea');
  const s2 = clone(ctx.site); s2.notOffered.find((p) => p.place === 'Singapore').read = true;
  const s3 = clone(ctx.site); s3.notOffered.find((p) => p.place === 'Argentina').read = 'not fetched';
  const s4 = clone(ctx.site); s4.termsNotice.text = s4.termsNotice.text.replace('Saudi Arabia, ', '');
  const c1 = clone(ctx.changes); c1.find((x) => x.from === '2026-11-26' && x.policies.includes('submission')).from = '2026-11-20';
  const broken = [with_('site', s1), with_('site', s2), with_('site', s3), with_('site', s4), with_('changes', c1),
    with_('sub', ctx.sub.replace('or a telephone number of the operator', 'of the operator')), with_('subj', ctx.subj.replace('表で 2026-11-26 とした 15 の', '表で 2026-11-26 とした 14 の')),
    with_('pv', ctx.pv.replace('after the person is told this expressly', 'after the person agrees')), with_('formj', ctx.formj.replace('全体として同等の保護で', '同等の保護で')),
    with_('rv', ctx.rv.replace('The fifteen places added', 'The fourteen places added')), with_('audit', ctx.audit.replace('この表の判定は、根拠不足 1、漏れ 12、', 'この表の判定は、根拠不足 1、漏れ 11、')),
    with_('audit', ctx.audit.replace('| 根拠不足 | 2026-11-12 に Claude が決めました。読めない法令', '| 表現 | 読めない法令')), with_('audit', ctx.audit.replace('カタールの 2016 年法律第 13 号は、Al Meezan', 'Al Meezan')),
    with_('listed', ctx.listed.concat([{ authors: [{ orcid: '0000-0002-1825-0097' }] }]))];
  ok('the check fails on a place dropped, a text said to be read that was not, a text fetched said not to be, a place left out of the notice, a change announced less than 14 days ahead, a lost duty, a wrong count, a lost word for New Zealand, a wrong count in the review or the audit, a narrowing without its maker, a text not fetched left unlisted, and a listed record by another author',
    broken.every((b) => problems(b).length > 0));
}

/* ------------------------------------------------------------ 116 */
/* The pages that the third pass of 2026-11-12 added to tools/sources.js (check 117). */
const SECOND_PASS_PAGES = ['philarchive-codeofconduct', 'philarchive-submit', 'ssrn-classification-distribution', 'ssrn-nonscholarly', 'ssrn-review-process', 'ssrn-submission-guidelines', 'ssrn-research-integrity', 'roar-information', 'roar-help', 'roar-record'];
/* The page that the fourth pass fetched (check 118). Like the pages of the third pass, it is not among the pages counted on the day of the second. */
const THIRD_PASS_PAGES = ['joss-paper-src'];
/* The pages that the fifth pass fetched (check 119): the terms of the repositories from which PDFs were copied. */
const FIFTH_PASS_PAGES = ['zenodo-developers', 'arxiv-api-tou', 'arxiv-bulk-data', 'arxiv-export-robots', 'figshare-terms', 'figshare-api-docs', 'researchsquare-terms', 'researchsquare-robots'];
/* The page fetched by the eighth pass (check 123): the GitHub Terms for Additional Products and Features. */
const EIGHTH_PASS_PAGES = ['github-additional-terms'];
const LATER_PAGES = SECOND_PASS_PAGES.concat(THIRD_PASS_PAGES, FIFTH_PASS_PAGES, EIGHTH_PASS_PAGES);
console.log('\n116. What a second, read-only pass of 2026-11-12 found: no direct requests where terms forbid them, texts by others kept only in parts, and the reply time an aim from 2026-11-26');
{
  const S = require('../tools/sources.js');
  const kept = require('../tools/citations.js').kept;
  const J = (f) => JSON.parse(read(path.join(ROOT, f)));
  const RAW = J('verification/sources-raw.json');
  const flat = (x) => String(x || '').replace(/\s+/g, '');
  /* Pure: every address that tools/sources.js would fetch directly from a host whose terms forbid automated requests. */
  const addresses = (src, pages) => Object.entries(src).flatMap(([k, s]) => [].concat(s.url || [], s.each || [], s.pages || [], s.alt || [], s.altPrefix ? (s.pages || []).map((u) => s.altPrefix + u) : []).map((u) => [k, u]))
    .concat(Object.entries(pages).flatMap(([k, p]) => [].concat(p.url || [], p.alt || []).map((u) => [k, u])));
  const directProblems = (src, pages) => addresses(src, pages).filter(([, u]) => S.direct(u)).map(([k, u]) => k + ': ' + u);
  const NAMED = ['ssrn-terms', 'philpapers-terms', 'philarchive-home', 'philarchive-about', 'philarchive-faq', 'edx-terms', 'datacite-privacy', 'datacite-imprint', 'datacite-terms', 'datacite-api-docs'];
  const namedProblems = (pages, raw) => NAMED.filter((k) => !pages[k] || !pages[k].url.startsWith('https://web.archive.org/web/2026id_/') || pages[k].alt
    || !raw.pages[k] || raw.pages[k].url !== pages[k].url || (raw.pages[k].tried && S.direct(raw.pages[k].tried.url)));
  const dp = directProblems(S.SOURCES, S.PAGES), np = namedProblems(S.PAGES, RAW);
  const hostsOk = ['https://www.ssrn.com/', 'https://papers.ssrn.com/sol3/papers.cfm', 'https://philpapers.org/help/terms.html', 'https://philarchive.org/', 'https://www.edx.org/', 'https://datacite.org/imprint/', 'https://support.datacite.org/docs/api'].every(S.direct)
    && !['https://api.datacite.org/dois/10.5281/zenodo.1', 'https://api.test.datacite.org/dois', 'https://web.archive.org/web/2026id_/https://www.ssrn.com/', 'https://notdatacite.org/', 'https://www.ssrn.com.example/'].some(S.direct);
  ok('tools/sources.js fetches nothing directly from SSRN, PhilPapers, PhilArchive, edX or DataCite\'s website, whose terms forbid automated requests or collection: the ' + NAMED.length + ' pages on them are read from the Internet Archive\'s copies, as recorded, and api.datacite.org stays open',
    dp.length === 0 && np.length === 0 && hostsOk, dp.concat(np).join(', '));
  /* The workflow: the whole texts go to an artifact of the run after the kept parts are verified against them, and only
   * sources-raw.json is committed; sources-full.json is ignored by git and not tracked. */
  const wf = read(path.join(ROOT, '.github', 'workflows', 'sources.yml'));
  const tracked = require('child_process').execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n');
  const wfProblems = (y, ignore, files) => {
    const bad = [];
    const at = (x) => y.indexOf(x);
    if (!(at('node tools/sources.js\n') >= 0 && at('node tools/sources.js verify') > at('node tools/sources.js\n') && at('actions/upload-artifact@') > at('node tools/sources.js verify') && at('git add') > at('actions/upload-artifact@'))) bad.push('the order: fetch, verify, artifact, commit');
    if (!/name: sources-full\n\s+path: verification\/sources-full\.json\n\s+retention-days: 90\n\s+if-no-files-found: error/.test(y)) bad.push('the artifact');
    if (!/git add verification\/sources-raw\.json\n/.test(y) || /git add (?!verification\/sources-raw\.json\n)/.test(y)) bad.push('what is committed');
    if (!ignore.split('\n').includes('verification/sources-full.json') || files.includes('verification/sources-full.json')) bad.push('sources-full.json in git');
    return bad;
  };
  const wp = wfProblems(wf, read(path.join(ROOT, '.gitignore')), tracked);
  /* What is kept: laws whole, every other text in parts with its SHA-256, and no whole text, links or forms of a page. */
  const PARTS = ['cc-by', 'cc-by-sa', 'cc0', 'github-terms', 'vercel-terms', 'mic-entry-manual', 'mic-entry-procedures', 'ppc-guidelines', 'ppc-qa', 'korea-pipa', 'korea-decree', 'usc17'];
  const nonLaw = Object.keys(RAW.sources).filter((k) => !S.wholeSource(k)).sort();
  const kp = S.keptProblems(RAW);
  const pages = Object.keys(RAW.pages).filter((k) => RAW.pages[k].sha256 && !LATER_PAGES.includes(k)).length;
  ok('only laws are kept whole; every page (' + pages + ') and every other text (' + nonLaw.length + ': licences, terms, guidance and translations not made by a state) is kept as its address, day, SHA-256 and the parts quoted or relied on; the whole texts of a run go to its artifact for 90 days after the parts are verified against them, and are not in git',
    kp.length === 0 && JSON.stringify(nonLaw) === JSON.stringify(PARTS.slice().sort()) && Object.keys(RAW.sources).every((k) => S.wholeSource(k) || PARTS.includes(k)) && wp.length === 0, kp.concat(wp).slice(0, 6).join(', '));
  /* The licence statements say, in both languages, that texts by others are not under CC BY 4.0. */
  const LIC = 'Texts by others that this repository quotes, or keeps to verify its quotations, are not licensed under CC BY 4.0 and remain their owners\'.';
  const LIC_JA = 'このリポジトリが引き、または引用を確かめるために置いている他人の文は、CC BY 4.0 で許諾しておらず、それぞれの権利者のものです。';
  const licFiles = { 'README.md': LIC, 'policies/licences.md': LIC, 'policies/terms.md': LIC, 'policies/licences.ja.md': LIC_JA, 'policies/terms.ja.md': LIC_JA };
  const licProblems = (get) => Object.entries(licFiles).filter(([f, x]) => !get(f).includes(x)).map(([f]) => f);
  const lp = licProblems((f) => read(path.join(ROOT, f)));
  ok('the README, the Licence Policy and the Terms, in both languages, say that texts by others quoted or kept to verify quotations are not under CC BY 4.0 and remain their owners\'', lp.length === 0, lp.join(', '));
  /* The reply time: a promise until 2026-11-25, an aim from 2026-11-26 that waits during a pause, announced 14 days ahead. */
  const DAY = '2026-11-26';
  const REPLY = {
    'policies/terms.md': ['Until 2026-11-25, the operator answers within 7 days and does not leave a dispute without reply. From 2026-11-26, the operator aims to answer within 7 days and does not leave a dispute without reply; during a pause described under "Continuity" above, the answer waits until the pause ends.'],
    'policies/terms.ja.md': ['2026-11-25 までは、運営者は 7 日以内に答え、紛争を返事のないまま放置しません。2026-11-26 からは、運営者は 7 日以内に答えることを目指し、紛争を返事のないまま放置しません。上の「続けるための備え」の休止のあいだは、答えは休止が終わるまで待ちます。'],
    'rules.md': ['Until 2026-11-25, the operator answers within 7 days; from 2026-11-26, the operator aims to answer within 7 days, and during a pause under "Continuity" the answer waits until the pause ends.'],
    'rules.ja.md': ['2026-11-25 までは、運営者は 7 日以内に答えます。2026-11-26 からは、7 日以内に答えることを目指し、「続けるための備え」の休止のあいだは、答えは休止が終わるまで待ちます。'],
    'advisory.md': ['Until 2026-11-25, the operator answers every message. From 2026-11-26, the operator aims to answer every message within 7 days; during a pause under "Continuity" in the [Terms of Use](./policies/terms.md), the answer waits until the pause ends.'],
    'advisory.ja.md': ['2026-11-25 までは、運営者はすべてのメールに返事をします。2026-11-26 からは、すべてのメールに 7 日以内に返事をすることを目指し、[利用規約](./policies/terms.ja.md)の「続けるための備え」の休止のあいだは、返事は休止が終わるまで待ちます。'],
  };
  const NOTICE = 'From 2026-11-26, in a dispute the operator aims to answer within 7 days rather than promising to, and during a pause described under "Continuity" in the Terms of Use the answer waits until the pause ends; the call for advisers says the same of its messages.';
  const replyProblems = (get, notice, changes, changed) => {
    const bad = Object.entries(REPLY).filter(([f, xs]) => !xs.every((x) => get(f).includes(x))).map(([f]) => f);
    if (/(^|\n|\. |\d\. )The operator answers within 7 days|and answers every message\.|すべてのメールに返事をします。\n/.test(get('policies/terms.md') + '\n' + get('advisory.md') + '\n' + get('advisory.ja.md'))) bad.push('an old promise without its last day');
    if (!String(notice.text || '').includes(NOTICE)) bad.push('the notice on the top page');
    const e = changes.find((c) => c.from === DAY && c.policies.includes('terms') && /aims to answer within 7 days/.test(c.text));
    if (!e || (Date.parse(DAY) - Date.parse(e.date)) / 86400000 < 14 || !/^\d{4}-\d{2}-\d{2}$/.test(changed) || (Date.parse(DAY) - Date.parse(changed)) / 86400000 < 14) bad.push('not announced 14 days ahead');
    return bad;
  };
  const site = J('site.json'), changes = J('data/policy-changes.json');
  let changed = '';
  try { changed = require('child_process').execFileSync('git', ['log', '--reverse', '--format=%cs', '-S', 'From 2026-11-26, the operator aims to answer within 7 days', '--', 'policies/terms.md'], { cwd: ROOT, encoding: 'utf8' }).split('\n')[0] || ''; } catch (e) { changed = ''; }
  if (!changed) changed = new Date().toISOString().slice(0, 10);
  const get = (f) => read(path.join(ROOT, f));
  const rp = replyProblems(get, site.termsNotice || {}, changes, changed);
  ok('the reply time is a promise until 2026-11-25 and an aim from 2026-11-26 that waits during a pause under "Continuity", in the Terms, the policies in brief and the call for advisers, in both languages, announced on the top page and in the feed 14 days ahead',
    rp.length === 0, rp.join(', ') + ' ' + changed);
  /* The record: a table of six columns, each judged one of the five ways and counted, every narrowing decided by Claude,
   * every quotation of a fetched text (in the column of facts) in the parts kept, and the counts of what was kept whole. */
  const JUDGE = ['誤り', '根拠不足', '漏れ', '表現', '問題なし'];
  const TX = J('verification/statutes-texts.json');
  const pool = flat(Object.values(RAW.pages).map((o) => kept(o.spans)).join('') + Object.values(RAW.sources).map((r) => Object.values(r.articles || {}).map(kept).join('')).join('') + Object.values(TX).join(''));
  const auditProblems = (t, poolFlat, raw) => {
    const bad = [];
    const sec = (t.split('\n## 2026-11-12 の続き：見落としていたもの\n')[1] || '').split('\n## ')[0];
    if (!sec.includes('| 箇所 | 法令と条 | 要件 | 事実 | 判定 | 対応 |')) bad.push('the columns');
    const rows = sec.split('\n').filter((l) => /^\| (?!---|箇所 \|)/.test(l)).map((l) => l.slice(2, -2).split(' | '));
    if (rows.length < 8) bad.push('too few rows');
    rows.forEach((r, i) => { if (r.length !== 6 || !JUDGE.includes(r[4])) bad.push('row ' + (i + 1)); });
    const tally = 'この表の判定は、' + JUDGE.filter((j) => rows.some((r) => r[4] === j)).map((j) => j + ' ' + rows.filter((r) => r[4] === j).length).join('、') + ' です。';
    if (!sec.includes(tally)) bad.push('the count');
    for (const r of rows.filter((x) => x[4] === '漏れ' || x[4] === '根拠不足')) if (!r[5].includes('2026-11-12 に Claude が決めました。')) bad.push('a decision without its maker: ' + r[0]);
    const qs = rows.flatMap((r) => [...(r[3] || '').matchAll(/「([^「」]+)」/g)].map((m) => m[1]));
    if (qs.length < 10) bad.push('too few quotations');
    for (const q of qs) if (!poolFlat.includes(flat(q))) bad.push('not in a kept text: ' + q.slice(0, 30));
    /* The count is of the pages kept on that day; the pages fetched by the later passes (checks 117 and 118) are not among them. */
    const nPages = Object.keys(raw.pages).filter((k) => raw.pages[k].sha256 && !LATER_PAGES.includes(k)).length, nParts = Object.keys(raw.sources).filter((k) => !S.wholeSource(k)).length;
    if (!sec.includes('ファイルは、' + nPages + ' の頁と、ライセンス・規約・手引き・私人の英訳など ' + nParts + ' の文を、全文で置いていました')) bad.push('the counts of the texts');
    for (const x of ['公開した履歴は書き換えません。2026-11-12 に Claude が決めました。', '最後に全体を置いていたのは、main のコミット 8fcaef4 です。', 'その実行の成果物 `sources-full` として 90 日のあいだ残り', '点検の表の「規約や外国の法令の訳の引用」の行は、頁に置く短い一節だけを見て問題なしとしました。', '### 下げられずに残る危険']) if (!sec.includes(x)) bad.push('missing: ' + x.slice(0, 20));
    return bad;
  };
  const audit = read(path.join(ROOT, 'docs', 'legal-audit-2026-11-12.md'));
  const ap = auditProblems(audit, pool, RAW);
  const nRows = ((audit.split('\n## 2026-11-12 の続き：見落としていたもの\n')[1] || '').split('\n## ')[0].match(/^\| (?!---|箇所 \|)/gm) || []).length;
  ok('the audit records what the second pass found in a table of ' + nRows + ' rows with the six columns, judged and counted, each omission decided by Claude, every quotation in the column of facts in a kept text, the counts of what was kept whole, the history left as it is, and the risks that remain',
    ap.length === 0, ap.join(' / '));
  // Breaking on purpose.
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const rawWhole = clone(RAW); rawWhole.pages['edx-terms'].text = 'the whole text';
  const rawSrc = clone(RAW); rawSrc.sources['cc-by'].articles['3'] = 'Section 3 – License Conditions.';
  const rawLinks = clone(RAW); rawLinks.pages['datacite-terms'].links = [['Terms', 'https://datacite.org/terms-and-conditions/']];
  const rawDirect = clone(RAW); rawDirect.pages['edx-terms'].url = 'https://www.edx.org/edx-terms-service';
  const rawTried = clone(RAW); rawTried.pages['ssrn-terms'].tried = { url: 'https://www.ssrn.com/index.cfm/en/terms-of-use/', status: 403 };
  const notice2 = { text: String((site.termsNotice || {}).text || '').replace(NOTICE, '') };
  const ch2 = clone(changes); const e2 = ch2.find((c) => c.from === DAY && /aims to answer within 7 days/.test(c.text)); if (e2) e2.from = '2026-11-20';
  ok('the checks fail on a direct address for edX, for SSRN as an alternative, or for a source fetched page by page; on a host that slips through; on a recorded page fetched directly; on a whole text, links or a whole source kept; on a workflow that commits the whole texts, skips the verification or keeps no artifact; on a lost licence sentence; on a reply promised again, a lost notice, an entry announced late or a change made late; and on a wrong count, a wrong judgement, a decision without its maker, an altered quotation, a lost history sentence and a wrong count of texts',
    directProblems(S.SOURCES, { ...S.PAGES, 'edx-terms': { url: 'https://www.edx.org/edx-terms-service' } }).length > 0
    && directProblems(S.SOURCES, { ...S.PAGES, 'ssrn-terms': { url: S.PAGES['ssrn-terms'].url, alt: 'https://www.ssrn.com/index.cfm/en/terms-of-use/' } }).length > 0
    && directProblems({ x: { pages: ['https://philarchive.org/help/faq.html'] } }, {}).length > 0 && directProblems({ x: { each: 'https://datacite.org/a/{n}' } }, {}).length > 0
    && !S.direct('https://www.ssrn.com.example/') && S.direct('https://SSRN.com/x')
    && namedProblems(S.PAGES, rawDirect).length > 0 && namedProblems(S.PAGES, rawTried).length > 0 && namedProblems({ ...S.PAGES, 'edx-terms': { url: 'https://www.edx.org/edx-terms-service' } }, RAW).length > 0
    && S.keptProblems(rawWhole).length > 0 && S.keptProblems(rawSrc).length > 0 && S.keptProblems(rawLinks).length > 0
    && wfProblems(wf.replace('git add verification/sources-raw.json\n', 'git add verification/sources-raw.json verification/sources-full.json\n'), read(path.join(ROOT, '.gitignore')), tracked).length > 0
    && wfProblems(wf.replace('      - run: node tools/sources.js verify\n', ''), read(path.join(ROOT, '.gitignore')), tracked).length > 0
    && wfProblems(wf.replace('retention-days: 90', 'retention-days: 1'), read(path.join(ROOT, '.gitignore')), tracked).length > 0
    && wfProblems(wf, '', tracked).length > 0 && wfProblems(wf, read(path.join(ROOT, '.gitignore')), tracked.concat(['verification/sources-full.json'])).length > 0
    && licProblems((f) => f === 'policies/licences.ja.md' ? '' : read(path.join(ROOT, f))).length > 0
    && replyProblems((f) => f === 'advisory.md' ? get(f).replace(REPLY['advisory.md'][0], 'The operator answers every message.') : get(f), site.termsNotice || {}, changes, changed).length > 0
    && replyProblems((f) => f === 'policies/terms.md' ? get(f) + '\nThe operator answers within 7 days and does not leave a dispute without reply.\n' : get(f), site.termsNotice || {}, changes, changed).length > 0
    && replyProblems(get, notice2, changes, changed).length > 0 && replyProblems(get, site.termsNotice || {}, ch2, changed).length > 0 && replyProblems(get, site.termsNotice || {}, changes, '2026-11-20').length > 0
    && [audit.replace('この表の判定は、根拠不足 1、漏れ 5、表現 2 です。', 'この表の判定は、根拠不足 1、漏れ 4、表現 2 です。'),
      audit.replace('| 漏れ | 2026-11-12 に Claude が決めました。直の所在を外し、Internet Archive の写しだけを読みます |', '| 軽微 | 2026-11-12 に Claude が決めました。直の所在を外し、Internet Archive の写しだけを読みます |'),
      audit.replace('| 漏れ | 2026-11-12 に Claude が決めました。直の所在を外し、Internet Archive の写しだけを読みます |', '| 漏れ | 直の所在を外し、Internet Archive の写しだけを読みます |'),
      audit.replace('or otherwise send automated queries of any sort to SSRN.」', 'or otherwise send any automated queries to SSRN.」'),
      audit.replace('公開した履歴は書き換えません。', '公開した履歴を書き換えました。'),
      audit.replace('ファイルは、' + pages + ' の頁と', 'ファイルは、' + (pages + 1) + ' の頁と')].every((b) => b !== audit && auditProblems(b, pool, RAW).length > 0));
}

/* ------------------------------------------------------------ 117 */
console.log('\n117. What a third, read-only pass of 2026-11-12 found: the licence notes of the release, no editorial review of ROAR claimed, and the pages where PhilArchive and SSRN say what they accept, fetched from the Internet Archive');
{
  const S = require('../tools/sources.js');
  const kept = require('../tools/citations.js').kept;
  const J = (f) => JSON.parse(read(path.join(ROOT, f)));
  const RAW = J('verification/sources-raw.json'), TX = J('verification/statutes-texts.json');
  const flat = (x) => String(x || '').replace(/\s+/g, '');
  const HEAD = '\n## 2026-11-12 の続き：二度目の見落とし\n';
  const JUDGE = ['誤り', '根拠不足', '漏れ', '表現', '問題なし'];
  /* The pages, each from the Internet Archive's copy where the venue's terms forbid automated requests, kept in parts with
   * its SHA-256, and each holding the words the record quotes from it. */
  const WANT = {
    'philarchive-codeofconduct': ['All books and papers submitted should be of professional quality.'],
    'philarchive-faq': ['We accept works of all types (articles, books, dissertations) in all areas of academic philosophy, so long as they are of professional quality'],
    'ssrn-nonscholarly': ['SSRN must determine if a paper meets the criteria of scholarly content.', 'Non-scholarly content does not meet our submission requirements.'],
    'ssrn-submission-guidelines': ['SSRN accepts studies with rigorous methodology and original findings, meeting our posting standards.'],
    'ssrn-classification-distribution': ['The paper must be part of the worldwide scholarly discourse in the field covered by the topic of the email alert and written within one year.'],
    'ssrn-research-integrity': ['SSRN does not peer review preprints'],
    'roar-help': ['It will then be put in the editorial buffer.'],
  };
  const pageProblems = (pages, raw) => {
    const bad = [];
    for (const k of SECOND_PASS_PAGES) {
      const p = pages[k], r = raw.pages[k];
      if (!p) { bad.push('not fetched: ' + k); continue; }
      if (/^(philarchive|ssrn)-/.test(k) && !p.url.startsWith('https://web.archive.org/web/2026id_/')) bad.push('not from the Internet Archive: ' + k);
      if (S.direct(p.url)) bad.push('direct: ' + k);
      if (!r || r.url !== p.url || r.status !== 200 || !/^[0-9a-f]{64}$/.test(r.sha256 || '') || !Array.isArray(r.spans) || 'text' in r) bad.push('not kept in parts: ' + k);
    }
    for (const [k, ws] of Object.entries(WANT)) for (const w of ws) if (!flat(kept((raw.pages[k] || {}).spans)).includes(flat(w))) bad.push('not in ' + k + ': ' + w.slice(0, 30));
    return bad;
  };
  const pool = flat(Object.values(RAW.pages).map((o) => kept(o.spans)).join('') + Object.values(RAW.sources).map((r) => Object.values(r.articles || {}).map(kept).join('')).join('') + Object.values(TX).join(''));
  const auditProblems = (t, poolFlat) => {
    const bad = [];
    const sec = (t.split(HEAD)[1] || '').split('\n## ')[0];
    if (!sec.includes('| 箇所 | 法令と条 | 要件 | 事実 | 判定 | 対応 |')) bad.push('the columns');
    const rows = sec.split('\n').filter((l) => /^\| (?!---|箇所 \|)/.test(l)).map((l) => l.slice(2, -2).split(' | '));
    if (rows.length < 6) bad.push('too few rows');
    rows.forEach((r, i) => { if (r.length !== 6 || !JUDGE.includes(r[4])) bad.push('row ' + (i + 1)); });
    const tally = 'この表の判定は、' + JUDGE.filter((j) => rows.some((r) => r[4] === j)).map((j) => j + ' ' + rows.filter((r) => r[4] === j).length).join('、') + ' です。';
    if (!sec.includes(tally)) bad.push('the count');
    for (const r of rows.filter((x) => x[4] !== '問題なし')) if (!r[5].includes('2026-11-12 に Claude が決めました。') && r[4] !== '表現') bad.push('a decision without its maker: ' + r[0]);
    const qs = rows.flatMap((r) => [...(r[3] || '').matchAll(/「([^「」]+)」/g)].map((m) => m[1]));
    if (qs.length < 12) bad.push('too few quotations');
    for (const q of qs) if (!poolFlat.includes(flat(q))) bad.push('not in a kept text: ' + q.slice(0, 30));
    for (const x of ['読み終えた同じ日に、三つの実行の記録を消しました。', '取り寄せたどの頁にもありません', '### 下げられずに残る危険', 'ROAR 自身の文は、編集者の承認までしか述べておらず、何かを審査するとは述べていないためです。'])
      if (!sec.includes(x)) bad.push('missing: ' + x.slice(0, 20));
    if (!/取り寄せの実行は \d{8,} で、結果は枝 `sources\/\d{8}-\d{4}` にあります。/.test(sec)) bad.push('the run of the fetch');
    return bad;
  };
  const audit = read(path.join(ROOT, 'docs', 'legal-audit-2026-11-12.md'));
  const pp = pageProblems(S.PAGES, RAW), ap = auditProblems(audit, pool);
  ok('the ' + SECOND_PASS_PAGES.length + ' pages that the third pass fetched are listed in tools/sources.js, PhilArchive\'s and SSRN\'s from the Internet Archive\'s copies, each kept in parts with its SHA-256 and holding the words the record quotes',
    pp.length === 0, pp.join(', '));
  ok('the audit records what the third pass found in a table of six columns, judged and counted, each decision by Claude, every quotation in the column of facts in a kept text, the run of the fetch, the logs deleted, and the risks that remain',
    ap.length === 0, ap.join(' / '));
  // Breaking on purpose.
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const r1 = clone(RAW); r1.pages['ssrn-nonscholarly'].spans = [];
  const r2 = clone(RAW); r2.pages['philarchive-codeofconduct'].text = 'the whole text';
  const p1 = { ...S.PAGES, 'ssrn-nonscholarly': { url: 'https://www.elsevier.support/ssrn/answer/nonscholarly' } };
  const p2 = { ...S.PAGES }; delete p2['roar-help'];
  ok('the check fails on a page fetched directly, a page dropped, a quoted part lost, a whole text kept, a wrong count, a quotation altered, a decision without its maker, and the deletion of the logs left out',
    pageProblems(p1, RAW).length > 0 && pageProblems(p2, RAW).length > 0 && pageProblems(S.PAGES, r1).length > 0 && pageProblems(S.PAGES, r2).length > 0
    && [audit.replace('この表の判定は、根拠不足 3、漏れ 1、表現 2 です。', 'この表の判定は、根拠不足 2、漏れ 1、表現 2 です。'),
      audit.replace('「SSRN does not peer review preprints」', '「SSRN does not review preprints」'),
      audit.replace('| 漏れ | 2026-11-12 に Claude が決めました。読み終えた', '| 漏れ | 読み終えた'),
      audit.replace('読み終えた同じ日に、三つの実行の記録を消しました。', '三つの実行の記録は残しました。')].every((b) => b !== audit && auditProblems(b, pool).length > 0));
}

/* ------------------------------------------------------------ 118 */
console.log('\n118. What a fourth, read-only pass of 2026-11-12 found: CITATION.cff says that its MIT licence covers the code only, and the JOSS draft says that Sophaxis is not a project of the university it names as the affiliation');
{
  const S = require('../tools/sources.js');
  const kept = require('../tools/citations.js').kept;
  const J = (f) => JSON.parse(read(path.join(ROOT, f)));
  const RAW = J('verification/sources-raw.json'), TX = J('verification/statutes-texts.json');
  const flat = (x) => String(x || '').replace(/\s+/g, '');
  const sp = (x) => String(x || '').replace(/\s+/g, ' ');
  /* CITATION.cff: the message says what .zenodo.json's notes say of the licence field, the works and the texts by others. */
  const CFF_LIC = ['The text of the site is CC BY 4.0; the code is MIT.', 'The licence field of this record covers the code only.',
    'Each listed work, with its PDF copy and its abstract, keeps its own licence.',
    'Texts by others that this repository quotes, or keeps to verify its quotations, are not licensed under CC BY 4.0 and remain their owners\'.'];
  const cffProblems = (cff, notes) => {
    const bad = [];
    const msg = sp((/^message: >-\n((?:  .*\n)+)/m.exec(cff) || ['', ''])[1]);
    if (!/^license: MIT$/m.test(cff)) bad.push('the licence field');
    for (const x of CFF_LIC) { if (!msg.includes(x)) bad.push('not in the message: ' + x.slice(0, 30)); if (!String(notes || '').includes(x)) bad.push('not in .zenodo.json: ' + x.slice(0, 30)); }
    return bad;
  };
  /* The JOSS draft: one affiliation, the university where the author is enrolled, with no title; the body says in one sentence
   * that Sophaxis is not a project of the university and that the university does not endorse it. */
  const AFFIL = 'affiliations:\n  - name: ZEN University, Japan\n    index: 1\n';
  const NOT_UNIV = 'Sophaxis is not a project of ZEN University, and the university does not endorse it.';
  const paperProblems = (t) => {
    const bad = [];
    const head = /^---\n([\s\S]*?)\n---\n/.exec(t);
    if (!head) return ['no front matter'];
    const body = t.slice(head[0].length).replace(/<!--[\s\S]*?-->/g, '');
    if (!t.includes(AFFIL)) bad.push('the affiliation');
    if ((head[1].match(/^  - name:/gm) || []).length !== 2) bad.push('more than the one author and the one affiliation');
    const ack = (body.split('\n# Acknowledgements\n')[1] || '').split('\n# ')[0];
    if (!sp(ack).includes(NOT_UNIV)) bad.push('the sentence on the university, under Acknowledgements');
    return bad;
  };
  /* JOSS's guide to the paper, fetched from GitHub at a fixed commit, kept in parts with its SHA-256, holding the words quoted. */
  const JOSS_WANT = 'A list of the authors of the software and their affiliations, using the correct format';
  const pageProblems = (pages, raw) => {
    const bad = [];
    for (const k of THIRD_PASS_PAGES) {
      const p = pages[k], r = raw.pages[k];
      if (!p) { bad.push('not listed: ' + k); continue; }
      if (!/^https:\/\/raw\.githubusercontent\.com\/openjournals\/joss\/[0-9a-f]{40}\/docs\/paper\.md$/.test(p.url)) bad.push('not at a fixed commit: ' + k);
      if (!r || r.url !== p.url || r.status !== 200 || !/^[0-9a-f]{64}$/.test(r.sha256 || '') || !Array.isArray(r.spans) || 'text' in r) bad.push('not kept in parts: ' + k);
    }
    if (!flat(kept(((raw.pages['joss-paper-src'] || {}).spans))).includes(flat(JOSS_WANT))) bad.push('the quoted words are not kept');
    return bad;
  };
  const pool = flat(Object.values(RAW.pages).map((o) => kept(o.spans)).join('') + Object.values(RAW.sources).map((r) => Object.values(r.articles || {}).map(kept).join('')).join('') + Object.values(TX).join(''));
  const HEAD = '\n## 2026-11-12 の続き：三度目の見落とし\n';
  const JUDGE = ['誤り', '根拠不足', '漏れ', '表現', '問題なし'];
  const auditProblems = (t, poolFlat) => {
    const bad = [];
    const sec = (t.split(HEAD)[1] || '').split('\n## ')[0];
    if (!sec) return ['no section'];
    if (!sec.includes('| 箇所 | 法令と条 | 要件 | 事実 | 判定 | 対応 |')) bad.push('the columns');
    const rows = sec.split('\n').filter((l) => /^\| (?!---|箇所 \|)/.test(l)).map((l) => l.slice(2, -2).split(' | '));
    if (rows.length < 2) bad.push('too few rows');
    rows.forEach((r, i) => { if (r.length !== 6 || !JUDGE.includes(r[4])) bad.push('row ' + (i + 1)); });
    const tally = 'この表の判定は、' + JUDGE.filter((j) => rows.some((r) => r[4] === j)).map((j) => j + ' ' + rows.filter((r) => r[4] === j).length).join('、') + ' です。';
    if (!sec.includes(tally)) bad.push('the count');
    for (const r of rows.filter((x) => x[4] !== '問題なし')) if (!r[5].includes('2026-11-12 に Claude が決めました。')) bad.push('a decision without its maker: ' + r[0]);
    const qs = rows.flatMap((r) => [...(r[3] || '').matchAll(/「([^「」]+)」/g)].map((m) => m[1]));
    if (qs.length < 3) bad.push('too few quotations');
    for (const q of qs) if (!poolFlat.includes(flat(q))) bad.push('not in a kept text: ' + q.slice(0, 30));
    for (const x of ['`CITATION.cff` を見ておらず、その行はこの点を見落としていました', '所属を消すと、手引きが求める所属の一覧を欠くためです。', '肩書きは書きません。', '### 下げられずに残る危険'])
      if (!sec.includes(x)) bad.push('missing: ' + x.slice(0, 20));
    if (!/取り寄せの実行は \d{8,} で、結果は枝 `sources\/\d{8}-\d{4}` にあります。/.test(sec)) bad.push('the run of the fetch');
    return bad;
  };
  const cff = read(path.join(ROOT, 'CITATION.cff')), notes = J('.zenodo.json').notes;
  const paper = read(path.join(ROOT, 'paper', 'paper.md'));
  const audit = read(path.join(ROOT, 'docs', 'legal-audit-2026-11-12.md'));
  const cp = cffProblems(cff, notes), pp = paperProblems(paper), gp = pageProblems(S.PAGES, RAW), ap = auditProblems(audit, pool);
  ok('the message of CITATION.cff says, as the notes of .zenodo.json do, that the text is CC BY 4.0 and the code MIT, that its licence field covers the code only, that each listed work keeps its own licence, and that texts by others are not licensed under CC BY 4.0',
    cp.length === 0, cp.join(', '));
  ok('the JOSS draft names one affiliation, ZEN University, Japan, and no title, and says under Acknowledgements that Sophaxis is not a project of the university and is not endorsed by it',
    pp.length === 0, pp.join(', '));
  ok('JOSS\'s guide to the paper is listed in tools/sources.js at a fixed commit, kept in parts with its SHA-256, and holds the words the record quotes on affiliations',
    gp.length === 0, gp.join(', '));
  ok('the audit records what the fourth pass found in a table of six columns, judged and counted, each decision by Claude, every quotation in the column of facts in a kept text, the earlier row that missed CITATION.cff, the run of the fetch, and the risks that remain',
    ap.length === 0, ap.join(' / '));
  // Breaking on purpose.
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const r1 = clone(RAW); if (r1.pages['joss-paper-src']) r1.pages['joss-paper-src'].spans = [];
  const r2 = clone(RAW); if (r2.pages['joss-paper-src']) r2.pages['joss-paper-src'].text = 'the whole text';
  ok('the check fails on a lost licence sentence in CITATION.cff or .zenodo.json, another licence field, a missing or second affiliation, a title, the sentence on the university lost or turned, a page at a moving branch, a quoted part lost, a whole text kept, a wrong count, an altered quotation, a decision without its maker and the earlier row left uncorrected',
    cffProblems(cff.replace('  The licence field of this record covers the code only.\n', ''), notes).length > 0
    && cffProblems(cff, String(notes).replace('The licence field of this record covers the code only.', '')).length > 0
    && cffProblems(cff.replace('license: MIT', 'license: CC-BY-4.0'), notes).length > 0
    && paperProblems(paper.replace(AFFIL, '')).length > 0
    && paperProblems(paper.replace(AFFIL, AFFIL + '  - name: Independent Researcher\n    index: 2\n')).length > 0
    && paperProblems(paper.replace('Sophaxis is not a project of ZEN University', 'Sophaxis is a project of ZEN University')).length > 0
    && paperProblems(paper.replace('and the university does not endorse it.', 'and the university endorses it.')).length > 0
    && paperProblems(paper.replace('\n' + NOT_UNIV + '\n', '\n').replace('# Summary\n', '# Summary\n\n' + NOT_UNIV + '\n')).length > 0
    && pageProblems({ ...S.PAGES, 'joss-paper-src': { url: 'https://raw.githubusercontent.com/openjournals/joss/main/docs/paper.md' } }, RAW).length > 0
    && pageProblems(S.PAGES, r1).length > 0 && pageProblems(S.PAGES, r2).length > 0
    && [audit.replace('この表の判定は、表現 2 です。', 'この表の判定は、表現 1 です。'),
      audit.replace('「A list of the authors of the software and their affiliations, using the correct format」', '「A list of the authors and their affiliations」'),
      audit.replace('| 表現 | 2026-11-12 に Claude が決めました。所属はそのまま残し', '| 表現 | 所属はそのまま残し'),
      audit.replace('`CITATION.cff` を見ておらず、その行はこの点を見落としていました', '`CITATION.cff` も見ていました')].every((b) => b !== audit && auditProblems(b, pool).length > 0));
}

/* ------------------------------------------------------------ 119 */
console.log('\n119. What a fifth, read-only pass of 2026-11-12 found: PDFs copied by script only where the repository\'s own terms allow it, PhilArchive and SSRN not credited with a check their pages do not describe, and one User-Agent');
{
  const S = require('../tools/sources.js');
  const F = require('../tools/fetch_pdf.js');
  const kept = require('../tools/citations.js').kept;
  const J = (f) => JSON.parse(read(path.join(ROOT, f)));
  const RAW = J('verification/sources-raw.json'), TX = J('verification/statutes-texts.json');
  const flat = (x) => String(x || '').replace(/\s+/g, '');
  /* The repositories: Zenodo and arXiv are copied from, Figshare and Research Square are not, and neither host is asked
   * directly by tools/sources.js. */
  const DOIS = { zenodo: '10.5281/zenodo.1234567', arxiv: '10.48550/arXiv.2508.15126', figshare: '10.6084/m9.figshare.34419198.v2', rs: '10.21203/rs.3.rs-39251/v1' };
  const routeProblems = (sourceFor, src, direct) => {
    const bad = [];
    if (!sourceFor(DOIS.zenodo, 1) || !sourceFor(DOIS.arxiv, 1) || !/^https:\/\/export\.arxiv\.org\//.test(sourceFor(DOIS.arxiv, 1).url)) bad.push('Zenodo or arXiv');
    if (sourceFor(DOIS.figshare, 2) !== null || sourceFor(DOIS.rs, 1) !== null) bad.push('a copy from Figshare or Research Square');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    if (/figshare\.com|researchsquare\.com|kind === 'figshare'/.test(code)) bad.push('an address of Figshare or Research Square in fetch_pdf.js');
    if (!['https://figshare.com/terms', 'https://api.figshare.com/v2/articles/1', 'https://ndownloader.figshare.com/files/1', 'https://docs.figshare.com/', 'https://www.researchsquare.com/article/rs-1/v1.pdf'].every(direct)) bad.push('NO_DIRECT');
    return bad;
  };
  /* The pages read: Zenodo's and arXiv's directly, Figshare's and Research Square's from the Internet Archive's copies;
   * each kept in parts with its SHA-256, holding the words that the pages and the record quote. */
  const WANT = {
    'zenodo-terms': ['Use of Zenodo, both the uploading and downloading of data, denotes agreement with the following terms', 'Users of content (“Users”) shall respect applicable license conditions.'],
    'zenodo-policies': ['Access to metadata and data files is provided over standard protocols such as HTTP and OAI-PMH.'],
    'zenodo-developers': ['Files — download/upload of files.', 'Note we’re already sending a User-Agent header identifying our client, which we recommend doing on every request'],
    'arxiv-bulk-data': ['We ask that users intent on harvesting use the dedicated site export.arxiv.org for these purposes, which contains an up-to-date copy of the corpus and is specifically set aside for programmatic access.'],
    'arxiv-api-tou': ['unless you have the permission of the copyright holder or are permitted to do so by the license with which the e-print was submitted', 'Direct users to arXiv.org to retrieve e-print content (PDF, source files, etc).'],
    'arxiv-export-robots': ['User-agent: * Disallow: /'],
    'figshare-terms': ['Reference to the "Service" in these Terms includes associated documentation and APIs', 'use any manual or automated means, including robots, scripts, or spiders to access, monitor, crawl, scrape, spider or mine', 'expressly authorized for you by Figshare in advance in writing'],
    'figshare-api-docs': ['We recommend that clients use the API responsibly and do not make more than one request per second.'],
    'researchsquare-terms': ['You also agree that you will not use any robot, spider, other automated device, or manual process to monitor or copy any content from the Web Sites'],
  };
  const pageProblems = (pages, raw) => {
    const bad = [];
    for (const k of FIFTH_PASS_PAGES) {
      const p = pages[k], r = raw.pages[k];
      if (!p) { bad.push('not listed: ' + k); continue; }
      const ia = p.url.startsWith('https://web.archive.org/web/2026id_/');
      if (/^(figshare|researchsquare)-/.test(k) ? !ia : ia) bad.push('read from the wrong place: ' + k);
      if (S.direct(p.url) || p.alt) bad.push('direct: ' + k);
      if (!r || r.url !== p.url || r.status !== 200 || !/^[0-9a-f]{64}$/.test(r.sha256 || '') || !Array.isArray(r.spans) || 'text' in r || (r.tried && S.direct(r.tried.url))) bad.push('not kept in parts: ' + k);
    }
    for (const [k, ws] of Object.entries(WANT)) for (const w of ws) if (!flat(kept((raw.pages[k] || {}).spans)).includes(flat(w))) bad.push('not in ' + k + ': ' + w.slice(0, 30));
    return bad;
  };
  /* The policy and the page for repositories, in both languages: the two repositories named with the words of their pages,
   * the end of the copies from Figshare and Research Square on 2026-11-13 with the words of their terms; no page names the
   * four as repositories that let a script fetch; the change announced on the top page and in the feed, ahead of its day. */
  const SAY = {
    'policies/copyright.md': ['It copies the file by script only from a repository whose own pages let a script fetch it: Zenodo and arXiv.', 'Until this change was published on 2026-11-13, Sophaxis also copied files from Figshare and Research Square by script. Since then, it does not, because their terms forbid it.', 'Since the change was published on 2026-11-13, this includes Figshare and Research Square.'],
    'policies/copyright.ja.md': ['スクリプトで写すのは、スクリプトでファイルを取ることを自らの頁で認めている預け先からだけです。Zenodo と arXiv です。', 'この変更を公開した 2026-11-13 までは、Figshare と Research Square からもスクリプトで写していました。公開してからは写しません。'],
    'repositories.md': ['the repository\'s own pages let a script fetch it (Zenodo and arXiv)', 'Until this change was published on 2026-11-13, Sophaxis also fetched PDFs from Figshare and Research Square; since then, it does not, because their terms forbid robots and scripts'],
    'repositories.ja.md': ['預け先が自らの頁でスクリプトによる取得を認めている場合だけです（Zenodo と arXiv）', 'この変更を公開した 2026-11-13 までは、Figshare と Research Square からも取っていました。公開してからは取りません。どちらの規約もロボットとスクリプトを禁じており'],
  };
  const OLD = /Zenodo, Figshare, arXiv and Research Square|Zenodo、Figshare、arXiv、Research Square|offers it to scripts/;
  const NOTICE = 'Since its publication on 2026-11-13, ahead of the changes below because going on would act against the terms of the two repositories, Sophaxis no longer copies PDFs by script from Figshare or Research Square, whose terms forbid robots and scripts; the authors of a work there can attach the deposited PDF to the submission issue instead.';
  const shown = () => {
    const out = {};
    const walk = (d, rel = '') => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (['.git', 'node_modules', 'docs', 'pdf', 'cards', 'fixtures', 'papers', 'verification', 'tools', 'templates', 'paper'].includes(e.name)) continue;
      const f = path.join(d, e.name), r = rel + e.name;
      if (e.isDirectory()) walk(f, r + '/'); else if (/\.(md|html|txt|json)$/.test(e.name) && !/^(CHANGELOG\.md|package(-lock)?\.json)$/.test(e.name) && !/(^|\/)abs\//.test(r)) out[r] = read(f);
    } };
    walk(ROOT);
    return out;
  };
  const SHOWN = shown();
  const policyProblems = (files, quotePool, notice, changes) => {
    const bad = [];
    for (const [f, xs] of Object.entries(SAY)) for (const x of xs) if (!String(files[f] || '').includes(x)) bad.push(f + ': ' + x.slice(0, 30));
    for (const [f, t] of Object.entries(files)) if (OLD.test(t)) bad.push('the four named as letting a script fetch: ' + f);
    /* Every quotation in the two paragraphs of the policy is a part kept from the pages read. */
    for (const f of ['policies/copyright.md', 'policies/copyright.ja.md']) {
      const par = (String(files[f] || '').split('\n\n').find((x) => x.includes('Zenodo') && x.includes('Research Square')) || '');
      const qs = [...par.matchAll(/"([^"\n]{6,})"|「([^「」\n]{6,})」/g)].map((m) => m[1] || m[2]);
      if (qs.length < 6) bad.push(f + ': too few quotations');
      for (const q of qs) if (!quotePool.includes(flat(q))) bad.push(f + ': not in a kept page: ' + q.slice(0, 30));
    }
    if (!String(notice.text || '').includes(NOTICE)) bad.push('the notice on the top page');
    /* Announced and in effect on publication, 2026-11-13 (Japan time), as the Terms allow for a legal risk; no earlier day. */
    const e = changes.find((c) => c.policies.includes('copyright') && /Figshare and Research Square/.test(c.text));
    if (!e || e.date !== '2026-11-13' || e.from || !e.text.startsWith('Effective on publication, 2026-11-13: ') || !e.text.includes('and not earlier')) bad.push('the entry in the feed');
    return bad;
  };
  /* Rule 5 of the record's wording: no sentence or table row on the site credits PhilArchive or SSRN with an editor, staff,
   * moderation, a review or a check within 50 characters after the name, outside the words quoted from them, unless it says
   * that their pages do not say who checks. Pages, data and the generated site and llms*.txt are read; the history is not. */
  const units = (t, html) => {
    if (html) t = t.replace(/<tr\b[^>]*>/g, '\n| ').replace(/<\/(p|li|h\d|div|td|th)>/g, '$& ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    return t.split('\n').flatMap((l) => (l.trim().startsWith('|') ? [l] : l.split(/(?<=[.。!?])\s+|(?<=。)/)));
  };
  const WORD = /\b(?:editors?|editorial|staff|moderat\w*|screen(?:s|ed|ing)?|vett\w*|checks?|checked|review(?:s|ed|ing)?)\b|編集者|担当者|モデレーション|審査|確認/i;
  const SAYS_NOT = /do(?:es)? not say|書かれていない|書かれていません|書いていません/;
  const venueProblems = (files) => {
    const bad = [];
    for (const [f, t] of Object.entries(files)) for (const u of units(t, /\.html$/.test(f))) {
      const q = u.replace(/"[^"\n]*"|“[^”\n]*”|「[^」\n]*」/g, '""');
      for (const m of q.matchAll(/PhilArchive|SSRN/g)) {
        const rest = q.slice(m.index + m[0].length), cut = rest.search(/Sophaxis/);
        if (WORD.test((cut < 0 ? rest : rest.slice(0, cut)).slice(0, 50)) && !SAYS_NOT.test(q)) { bad.push(f + ': ' + u.trim().slice(0, 60)); break; }
      }
    }
    return bad;
  };
  const VENUE = {
    'compare.md': ['Its content policy says "All books and papers submitted should be of professional quality." Its pages do not say who checks a work, or when', 'Its help pages say "SSRN must determine if a paper meets the criteria of scholarly content." They do not say who checks a work'],
    'compare.ja.md': ['内容の方針は「All books and papers submitted should be of professional quality.」と書く。誰がいつ確かめるかは、その頁に書かれていない', '案内の頁は「SSRN must determine if a paper meets the criteria of scholarly content.」と書く。誰が確かめるかは、その頁に書かれていない'],
    'findable.md': ['PhilArchive\'s content policy says "All books and papers submitted should be of professional quality." Its pages do not say who checks a work.'],
    'findable.ja.md': ['PhilArchive の内容の方針は「All books and papers submitted should be of professional quality.」と書きます。誰が作品を確かめるかは、その頁に書かれていません。'],
  };
  const pool = flat(Object.values(RAW.pages).map((o) => kept(o.spans)).join('') + Object.values(RAW.sources).map((r) => Object.values(r.articles || {}).map(kept).join('')).join('') + Object.values(TX).join(''));
  const venueSay = (files) => Object.entries(VENUE).flatMap(([f, xs]) => xs.filter((x) => !String(files[f] || '').includes(x)).map((x) => f + ': ' + x.slice(0, 30)))
    .concat(['All books and papers submitted should be of professional quality.', 'SSRN must determine if a paper meets the criteria of scholarly content.'].filter((x) => !pool.includes(flat(x))).map((x) => 'not kept: ' + x));
  /* The record. */
  const HEAD = '\n## 2026-11-12 の続き：四度目の見落とし\n';
  const JUDGE = ['誤り', '根拠不足', '漏れ', '表現', '問題なし'];
  const auditProblems = (t, poolFlat) => {
    const bad = [];
    const sec = (t.split(HEAD)[1] || '').split('\n## ')[0];
    if (!sec) return ['no section'];
    if (!sec.includes('| 箇所 | 法令と条 | 要件 | 事実 | 判定 | 対応 |')) bad.push('the columns');
    const rows = sec.split('\n').filter((l) => /^\| (?!---|箇所 \|)/.test(l)).map((l) => l.slice(2, -2).split(' | '));
    if (rows.length < 8) bad.push('too few rows');
    rows.forEach((r, i) => { if (r.length !== 6 || !JUDGE.includes(r[4])) bad.push('row ' + (i + 1)); });
    const tally = 'この表の判定は、' + JUDGE.filter((j) => rows.some((r) => r[4] === j)).map((j) => j + ' ' + rows.filter((r) => r[4] === j).length).join('、') + ' です。';
    if (!sec.includes(tally)) bad.push('the count');
    for (const r of rows.filter((x) => x[4] !== '問題なし')) if (!r[5].includes('2026-11-12 に Claude が決めました。')) bad.push('a decision without its maker: ' + r[0]);
    const qs = rows.flatMap((r) => [...(r[3] || '').matchAll(/「([^「」]+)」/g)].map((m) => m[1]));
    if (qs.length < 15) bad.push('too few quotations');
    for (const q of qs) if (!poolFlat.includes(flat(q))) bad.push('not in a kept text: ' + q.slice(0, 30));
    for (const x of ['読み終えた同じ日に、実行の記録を消しました。', 'このリポジトリの比較の頁を見落としていました', '検査は三つのファイルしか読んでいませんでした', '14 日を待たず、告知の翌日からとしました。', '### 下げられずに残る危険', 'export.arxiv.org の robots.txt は、すべてのロボットにすべてを閉じています。'])
      if (!sec.includes(x)) bad.push('missing: ' + x.slice(0, 20));
    if (!/取り寄せの実行は \d{8,} で、結果は枝 `sources\/\d{8}-\d{4}` にあります。/.test(sec)) bad.push('the run of the fetch');
    return bad;
  };
  const src = read(path.join(ROOT, 'tools', 'fetch_pdf.js'));
  const site = J('site.json'), changes = J('data/policy-changes.json');
  const audit = read(path.join(ROOT, 'docs', 'legal-audit-2026-11-12.md'));
  const rp = routeProblems(F.sourceFor, src, S.direct), gp = pageProblems(S.PAGES, RAW), pp = policyProblems(SHOWN, pool, site.termsNotice || {}, changes);
  const vp = venueProblems(SHOWN).concat(venueSay(SHOWN)), ap = auditProblems(audit, pool);
  ok('PDFs are copied by script only from Zenodo and arXiv; none is attempted from Figshare or Research Square, whose terms forbid it, and tools/sources.js asks neither host directly',
    rp.length === 0, rp.join(', '));
  ok('the ' + FIFTH_PASS_PAGES.length + ' pages read for this are listed in tools/sources.js, Figshare\'s and Research Square\'s from the Internet Archive\'s copies, each kept in parts with its SHA-256 and holding the words quoted',
    gp.length === 0, gp.join(', '));
  ok('the Copyright Policy and the page for repositories, in both languages, name Zenodo and arXiv with their own words, end the copies from Figshare and Research Square on 2026-11-13 with the words of their terms, no page of the ' + Object.keys(SHOWN).length + ' read names the four as letting a script fetch, and the change is on the top page and in the feed ahead of its day',
    pp.length === 0, pp.join(' / '));
  ok('no sentence or table row in the pages, the data or the built site credits PhilArchive or SSRN with an editor, staff, moderation, a review or a check; the comparison and the guide quote their pages, in both languages',
    vp.length === 0, vp.join(' / '));
  ok('the audit records what the fifth pass found in a table of six columns, judged and counted, each decision by Claude, every quotation in the column of facts in a kept text, the run of the fetch, the logs deleted, and the risks that remain',
    ap.length === 0, ap.join(' / '));
  // Breaking on purpose.
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const r1 = clone(RAW); r1.pages['figshare-terms'].spans = [];
  const r2 = clone(RAW); r2.pages['researchsquare-terms'].text = 'the whole text';
  const r3 = clone(RAW); r3.pages['figshare-terms'].tried = { url: 'https://figshare.com/terms', status: 200 };
  const oldSource = (doi, n) => (/figshare/.test(doi) ? { kind: 'figshare', api: 'https://api.figshare.com/v2/articles/1/versions/1' } : F.sourceFor(doi, n));
  const sh = (f, a, b) => ({ ...SHOWN, [f]: SHOWN[f].replace(a, b) });
  ok('the check fails on a copy from Figshare, an address of Research Square in the tool, a host taken out of NO_DIRECT, a page read directly or dropped, a quoted part lost, a whole text kept, the four named again, a lost quotation or one altered, a lost notice, the old cells of the comparison in either language or in the built site, a staff check claimed in a new page, a wrong count, an altered quotation in the record, a decision without its maker, and the deletion of the logs left out',
    routeProblems(oldSource, src, S.direct).length > 0
    && routeProblems(F.sourceFor, src + "\nconst RS = 'https://www.researchsquare.com/article/';\n", S.direct).length > 0
    && routeProblems(F.sourceFor, src, (u) => !/figshare/.test(u) && S.direct(u)).length > 0
    && pageProblems({ ...S.PAGES, 'figshare-terms': { url: 'https://figshare.com/terms' } }, RAW).length > 0
    && pageProblems((() => { const p = { ...S.PAGES }; delete p['arxiv-bulk-data']; return p; })(), RAW).length > 0
    && pageProblems(S.PAGES, r1).length > 0 && pageProblems(S.PAGES, r2).length > 0 && pageProblems(S.PAGES, r3).length > 0
    && policyProblems(sh('process.md', 'every repository except Zenodo and arXiv', 'every repository except Zenodo, Figshare, arXiv and Research Square'), pool, site.termsNotice || {}, changes).length > 0
    && policyProblems(sh('policies/copyright.md', 'Since then, it does not, because their terms forbid it.', ''), pool, site.termsNotice || {}, changes).length > 0
    && policyProblems(sh('policies/copyright.ja.md', 'or manual process to monitor or copy any content', 'or manual process to copy any content'), pool, site.termsNotice || {}, changes).length > 0
    && policyProblems(SHOWN, pool, { text: '' }, changes).length > 0
    && policyProblems(SHOWN, pool, site.termsNotice || {}, changes.map((c) => (/Figshare and Research Square/.test(c.text) ? { ...c, date: '2026-11-12' } : c))).length > 0
    && venueProblems({ 'compare.md': '| PhilArchive | Yes | No | A check by its editors | Philosophy | None |\n' }).length > 0
    && venueProblems({ 'compare.ja.md': '| SSRN | 保つ | 与える | 担当者による確認 | 主に社会科学と人文学 | なし |\n' }).length > 0
    && venueProblems({ 'site/compare.html': '<tr><td>SSRN</td><td>Yes</td><td>A check by its staff</td></tr>' }).length > 0
    && venueProblems({ 'faq.md': 'SSRN\'s staff review each paper before it appears.\n' }).length > 0
    && venueProblems({ 'findable.ja.md': 'PhilArchive には独自のモデレーションがあります。\n' }).length > 0
    && venueProblems({ 'README.md': 'Authors deposit in arXiv, SSRN, Research Square, SciELO Preprints, Qeios, ScienceOpen Preprints or KC Works; Sophaxis moderates the submission.\n' }).length === 0
    && venueSay(sh('compare.md', 'Its pages do not say who checks a work, or when', 'A check by its editors')).length > 0
    && [audit.replace('この表の判定は、誤り 3、根拠不足 2、漏れ 1、表現 1、問題なし 1 です。', 'この表の判定は、誤り 2、根拠不足 2、漏れ 1、表現 1、問題なし 1 です。'),
      audit.replace('「You also agree that you will not use any robot, spider, other automated device, or manual process to monitor or copy any content from the Web Sites」と書きます。Research Square から', '「You also agree that you will not use any robot to copy any content from the Web Sites」と書きます。Research Square から'),
      audit.replace('| 誤り | 2026-11-12 に Claude が決めました。Figshare と同じく', '| 誤り | Figshare と同じく'),
      audit.replace('読み終えた同じ日に、実行の記録を消しました。', '実行の記録は残しました。')].every((b) => b !== audit && auditProblems(b, pool).length > 0));
}

console.log('\n120. What a sixth, read-only pass of 2026-11-12 found: no page gives one day for the whole list of places where Sophaxis is not offered');
{
  /* 15 of the 43 places are not offered from 2026-11-26, the rest from 2026-11-22 (site.json "notOffered", "from").
   * The README, the Privacy Policy and the notice on the top page gave 2026-11-22 for the whole list. Every page, the llms
   * files, the README, the policies, the forms, site.json, the news and the feed of policy changes are read. A sentence that
   * names the whole list and gives a day: the day is one of the per-place days; a per-place day it leaves out is given in
   * the same paragraph with its places or their number; a number given with a later day is the number of places from it.
   * CHANGELOG.md and docs/ are records of what was true when written, and stay outside. */
  const J = (f) => JSON.parse(read(path.join(ROOT, f)));
  const WORD = { one: 1, two: 2, three: 3, four: 4, five: 5, ten: 10, fifteen: 15, sixteen: 16, eighteen: 18, twenty: 20 };
  const WHOLE = [/places? where Sophaxis is not offered/i, /places that (?:the )?(?:\[)?Submission Policy(?:\]\([^)]*\))? lists/i, /places that it lists/i, /any of the \d+ places/i, /any of these places/i,
    /Sophaxis を提供しない(?: ?\d+ ?の)?国と地域/, /表にあるほかの国と地域/, /表の ?\d+ ?の国と地域/];
  const SUBSET = /\b(\d+|[A-Za-z]+) more places\b/;
  const COUNT = [/\bfor (\d+) of them\b/, /\bfor (\d+) of the places\b/, /\bFor the (\d+) places for which the table gives\b/, /\b(\d+|[A-Za-z]+) more places\b/, /そのうち ?(\d+) ?の国と地域/, /(\d+) の国と地域については/];
  /* Pure: what is wrong; [] when nothing is. texts: { name: text }, L: site.json notOffered, first: the first day. */
  const placeDayProblems = (texts, L, first) => {
    const bad = [];
    const fromOf = (p) => p.from || first;
    const FROM = [...new Set(L.map(fromOf))].sort();
    const n = (d) => L.filter((p) => fromOf(p) === d).length;
    const num = (x) => (/^\d+$/.test(x) ? Number(x) : WORD[String(x).toLowerCase()]);
    const days = (s) => [...s.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)].map((m) => m[1]).filter((d) => d >= FROM[0]);
    for (const [f, txt] of Object.entries(texts)) {
      for (const para of String(txt).split(/\n\s*\n/)) {
        const sents = para.split(/(?<=[.!?。])\s+|\n+|(?<=。)/).filter((s) => s.trim());
        for (const [k, s] of sents.entries()) {
          /* A sentence on the whole list with no day takes the day of a form's "Required from <day>." just before it. */
          const lead = k > 0 && /^\s*(?:Required from \d{4}-\d{2}-\d{2}\.|\d{4}-\d{2}-\d{2} から必須です。)\s*$/.test(sents[k - 1].replace(/^\s*description:\s*/, ''));
          const whole = WHOLE.some((r) => r.test(s)), ds = days(s).length || !whole || !lead ? days(s) : days(sents[k - 1]);
          if (whole) for (const d of ds) if (!FROM.includes(d)) bad.push(f + ': a day that no place has, ' + d + ': ' + s.slice(0, 60));
          for (const r of COUNT) {
            const m = r.exec(s), later = days(s).filter((d) => d !== FROM[0]);
            if (m && later.length && !later.some((d) => n(d) === num(m[1]))) bad.push(f + ': the number ' + m[1] + ' for ' + later.join(', ') + ': ' + s.slice(0, 60));
          }
          if (!ds.length || !whole || SUBSET.test(s)) continue;
          for (const d of FROM.filter((x) => !ds.includes(x))) {
            /* Its places named after the day, in one sentence ("; and, from <day>, Argentina, ..."). */
            const named = sents.concat(lead ? [sents[k - 1] + ' ' + s] : []).some((z) => z.includes(d) && L.filter((p) => fromOf(p) === d).every((p) => z.indexOf(p.place, z.indexOf(d)) > 0 || (p.ja && z.indexOf(p.ja, z.indexOf(d)) > 0)));
            const counted = sents.some((z) => z.includes(d) && COUNT.some((r) => { const m = r.exec(z); return m && num(m[1]) === n(d); }));
            if (!(para.includes(d) && (named || counted))) bad.push(f + ': one day for the whole list, without ' + d + ': ' + s.slice(0, 60));
          }
        }
      }
    }
    return bad;
  };
  const walk120 = (d, r = '') => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk120(path.join(d, e.name), r + e.name + '/') : [r + e.name]));
  const strip = (x) => x.replace(/<\/(p|li|div|h\d|td|th|tr|blockquote|summary|dd|dt)>|<br\s*\/?>/g, '\n\n').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const strings = (v) => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []);
  const texts = {};
  for (const f of walk120(path.join(ROOT, 'site')).filter((x) => /\.(html|txt|xml)$/.test(x))) { const x = read(path.join(ROOT, 'site', f)); texts['site/' + f] = f.endsWith('.txt') ? x : strip(x); }
  for (const f of [...fs.readdirSync(ROOT).filter((x) => x.endsWith('.md') && x !== 'CHANGELOG.md'), ...fs.readdirSync(path.join(ROOT, 'policies')).map((x) => 'policies/' + x), ...fs.readdirSync(path.join(ROOT, '.github', 'ISSUE_TEMPLATE')).map((x) => '.github/ISSUE_TEMPLATE/' + x)]) texts[f] = read(path.join(ROOT, f));
  for (const f of ['site.json', 'data/news.json', 'data/policy-changes.json']) texts[f] = strings(J(f)).join('\n\n');
  const site = J('site.json'), L = site.notOffered, first = site.residenceFrom;
  const later = L.filter((p) => p.from && p.from > first);
  const pd = placeDayProblems(texts, L, first);
  const EN_D = 'from the date the Submission Policy gives for each place (' + first + ', or ' + later[0].from + ' for ' + later.length + ' of them)';
  const JA_D = '投稿の規程が国と地域ごとに示す日（' + first + '、そのうち ' + later.length + ' の国と地域は ' + later[0].from + '）から';
  const said = [['README.md', 'is declined ' + EN_D + ', because'], ['README.md', JA_D + '、著者のだれかが Sophaxis を提供しない国と地域'], ['policies/privacy.md', 'is declined ' + EN_D + ', because'],
    ['policies/privacy.md', 'From the date the [Submission Policy](./submission.md) gives for each place (' + first + ', or ' + later[0].from + ' for ' + later.length + ' of them), Sophaxis does not offer its service to people in the other places that it lists either.'],
    ['policies/privacy.ja.md', JA_D + '、著者のだれかが Sophaxis を提供しない国と地域'], ['policies/privacy.ja.md', '[投稿の規程](./submission.ja.md)が国と地域ごとに示す日（' + first + '、そのうち ' + later.length + ' の国と地域は ' + later[0].from + '）から、Sophaxis は、その表にあるほかの国と地域の人にもサービスを提供しません。'],
    ['site.json', 'F' + EN_D.slice(1) + ', Sophaxis does not list work by an author who lives in any of these places']].filter(([f, x]) => !String(texts[f]).includes(x)).map(([f, x]) => f + ': ' + x.slice(0, 40));
  /* The record. */
  const HEAD = '\n## 2026-11-12 の続き：五度目の見落とし\n';
  const JUDGE = ['誤り', '根拠不足', '漏れ', '表現', '問題なし'];
  const auditProblems = (a) => {
    const bad = [];
    const sec = (a.split(HEAD)[1] || '').split('\n## ')[0];
    if (!sec) return ['no section'];
    if (!sec.includes('| 箇所 | 法令と条 | 要件 | 事実 | 判定 | 対応 |')) bad.push('the columns');
    const rows = sec.split('\n').filter((l) => /^\| (?!---|箇所 \|)/.test(l)).map((l) => l.slice(2, -2).split(' | '));
    if (rows.length < 7) bad.push('too few rows');
    rows.forEach((r, i) => { if (r.length !== 6 || !JUDGE.includes(r[4])) bad.push('row ' + (i + 1)); });
    const tally = 'この表の判定は、' + JUDGE.filter((j) => rows.some((r) => r[4] === j)).map((j) => j + ' ' + rows.filter((r) => r[4] === j).length).join('、') + ' です。';
    if (!sec.includes(tally)) bad.push('the count');
    for (const r of rows.filter((x) => x[4] !== '問題なし')) if (!/2026-11-12 に Claude が決めました。[^|]*ためです$/.test(r[5])) bad.push('a decision without its maker or reason: ' + r[0]);
    if (!sec.includes('43 の国と地域のうち ' + (L.length - later.length) + ' が ' + first + ' から、' + later.length + ' が ' + later[0].from + ' からです。')) bad.push('the numbers of places');
    if (!rows.some((r) => r[0].startsWith('検査') && r[4] === '漏れ')) bad.push('the check as a gap');
    if (!sec.includes('### 下げられずに残る危険')) bad.push('the remaining risk');
    return bad;
  };
  const audit = read(path.join(ROOT, 'docs', 'legal-audit-2026-11-12.md'));
  const ap = auditProblems(audit);
  /* The policy change is in the feed, and the commitment moved with its old line kept. */
  const changes = J('data/policy-changes.json'), com = read(path.join(__dirname, 'commitments.txt')), sup = read(path.join(__dirname, 'superseded.txt'));
  const feed = changes.some((c) => c.date === '2026-11-13' && c.policies.includes('privacy') && !c.from && c.text.includes('2026-11-22, or 2026-11-26 for 15 of them') && c.text.includes('no right is narrowed'));
  const OLDC = 'or who stayed in one between the submission and the listing, is declined from 2026-11-22, because such a work';
  const moved = !com.includes(OLDC) && com.includes('is declined from the date the Submission Policy gives for each place (2026-11-22, or 2026-11-26 for 15 of them), because such a work') && sup.split('\n').some((l) => l.startsWith('A request to add the record') && l.split('\t')[0].includes(OLDC));
  ok('no page, llms file, policy, form, notice, news item or feed entry gives one day for the whole list of places where Sophaxis is not offered (' + Object.keys(texts).length + ' texts; ' + (L.length - later.length) + ' places from ' + first + ', ' + later.length + ' from ' + (later[0] || {}).from + '), the README, the Privacy Policy and the notice say "' + EN_D + '", the change is in the feed, and the record of the sixth pass is complete',
    pd.length === 0 && said.length === 0 && ap.length === 0 && feed && moved, pd.concat(said, ap).join(' / ') + (feed ? '' : ' / the feed') + (moved ? '' : ' / the commitment'));
  /* Break on purpose. */
  const with1 = (f, a, b) => Object.assign({}, texts, { [f]: String(texts[f]).replace(a, b) });
  const moveOne = L.map((p) => (p.place === 'Quebec' ? Object.assign({}, p, { from: later[0].from }) : p));
  const breaks = [
    ['the README in English with one day', with1('README.md', 'is declined ' + EN_D + ', because', 'is declined from 2026-11-22, because'), L],
    ['the README in Japanese with one day', with1('README.md', JA_D + '、著者のだれかが Sophaxis を提供しない国と地域', '2026-11-22 から、著者のだれかが Sophaxis を提供しない国と地域'), L],
    ['the Privacy Policy on the other places with one day', with1('policies/privacy.md', 'From the date the [Submission Policy](./submission.md) gives for each place (2026-11-22, or 2026-11-26 for 15 of them), Sophaxis does not offer its service to people in the other places that it lists either.', 'From 2026-11-22, Sophaxis does not offer its service to people in the other places that the [Submission Policy](./submission.md) lists either.'), L],
    ['the Japanese Privacy Policy with one day', with1('policies/privacy.ja.md', '[投稿の規程](./submission.ja.md)が国と地域ごとに示す日（2026-11-22、そのうち 15 の国と地域は 2026-11-26）から、Sophaxis は、その表にある', '2026-11-22 から、Sophaxis は、[投稿の規程](./submission.ja.md)の表にある'), L],
    ['the notice in site.json with one day', with1('site.json', 'F' + EN_D.slice(1) + ', Sophaxis does not list', 'From 2026-11-22 Sophaxis does not list'), L],
    ['a generated page with one day', with1('site/policies/privacy.html', 'is declined ' + EN_D + ', because', 'is declined from 2026-11-22, because'), L],
    ['llms-full.txt with one day', with1('site/llms-full.txt', 'is declined ' + EN_D + ', because', 'is declined from 2026-11-22, because'), L],
    ['a wrong number with the later day', with1('README.md', 'or 2026-11-26 for 15 of them', 'or 2026-11-26 for 14 of them'), L],
    ['a day that no place has', with1('policies/privacy.md', '(2026-11-22, or 2026-11-26 for 15 of them), Sophaxis does not offer', '(2026-11-22, or 2026-11-27 for 15 of them), Sophaxis does not offer'), L],
    ['a wrong number in the news', with1('data/news.json', 'Fifteen more places where Sophaxis is not offered', 'Fourteen more places where Sophaxis is not offered'), L],
    ['the Submission Policy without its second day', with1('policies/submission.md', 'For the 15 places for which the table gives 2026-11-26, this applies from 2026-11-26.', ''), L],
    ['the form without the later places', with1('.github/ISSUE_TEMPLATE/submission.yml', '; and, from 2026-11-26, Argentina,', '; and Argentina,'), L],
    ['one more place moved to the later day in site.json', texts, moveOne],
  ];
  const caught = breaks.filter(([, x, l]) => placeDayProblems(x, l, first).length > 0).map(([k]) => k);
  const abreaks = [['the count', audit.replace('この表の判定は、漏れ 1、表現 4、問題なし 2 です。', 'この表の判定は、漏れ 1、表現 3、問題なし 2 です。')],
    ['a decision without its reason', audit.replace('誰の権利も狭めないためです |', '誰の権利も狭めません |')],
    ['the numbers of places', audit.replace('43 の国と地域のうち 28 が', '43 の国と地域のうち 27 が')],
    ['the check as no gap', audit.replace('ほかの頁の文に書いた日は見ていませんでした | 漏れ |', 'ほかの頁の文に書いた日は見ていませんでした | 問題なし |')],
    ['no section', audit.replace(HEAD, '\n## 2026-11-12 の続き\n')]];
  const acaught = abreaks.filter(([, a]) => a !== audit && auditProblems(a).length > 0).map(([k]) => k);
  ok('break on purpose: one day in the README (both languages), the Privacy Policy (both), site.json, a generated page, llms-full.txt, a wrong number, a day no place has, the news, the Submission Policy, the form, a place moved in site.json, and the record\'s count, reason, numbers, gap and section all fail (' + (caught.length + acaught.length) + ' / ' + (breaks.length + abreaks.length) + ')',
    caught.length === breaks.length && acaught.length === abreaks.length, breaks.filter(([k]) => !caught.includes(k)).concat(abreaks.filter(([k]) => !acaught.includes(k))).map(([k]) => k).join(' / '));
}

/* ------------------------------------------------------------ 121 */
console.log('\n121. Dates are Japan time, and never earlier than the day the change was published');
{
  /* Four changes reached main on 2026-11-13, Japan time (#221 to #224). Two entries of the feed of policy changes and the
   * "Last updated" of the pages they changed gave 2026-11-12, the date by the clock of the work (UTC), and the end of the
   * copies from Figshare and Research Square was given a day of effect, 2026-11-13, earlier than its publication at 03:06.
   * The history is read with dates in Japan time: a page's "Last updated" is not earlier than the last commit that changed
   * it, an entry of the feed is not dated earlier than the first commit that held it, and no day of effect in an entry is
   * earlier than the entry. A shallow history cannot be compared, and fails. */
  const { execFileSync } = require('child_process');
  const Bd = require('../build.js');
  const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', env: Object.assign({}, process.env, { TZ: 'Asia/Tokyo' }), stdio: ['ignore', 'pipe', 'ignore'] });
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  let shallow = true;
  try { shallow = git(['rev-parse', '--is-shallow-repository']).trim() !== 'false'; } catch (e) { shallow = true; }
  const lines = (args) => { try { return git(args).split('\n').filter(Boolean); } catch (e) { return []; } };
  const firstDay = (f, s) => lines(['log', '--reverse', '--format=%cd', '--date=format-local:%Y-%m-%d', '-S', s, '--', f])[0] || today;
  const UPD = /^(?:Last updated: (\d{4}-\d{2}-\d{2})\.|最終更新：(\d{4}-\d{2}-\d{2})。)$/m;
  const rel = (d) => fs.readdirSync(path.join(ROOT, d)).filter((x) => x.endsWith('.md')).map((x) => (d === '.' ? x : d + '/' + x));
  const pages = rel('.').concat(rel('policies')).filter((f) => f !== 'CHANGELOG.md' && UPD.test(read(path.join(ROOT, f)))).sort();
  /* The day of the last change to a page's text: the newest commit whose version differs from the one before it, other than
   * in the "Last updated" line itself (a commit that only corrects that date is not a change of the text). A page whose text
   * differs from the last commit is taken as changed today (Japan time); so is an entry not yet in any commit. The versions
   * are read in one call of git cat-file. */
  const body = (s) => String(s || '').replace(/^(?:Last updated: \d{4}-\d{2}-\d{2}\.|最終更新：\d{4}-\d{2}-\d{2}。)$/gm, '');
  const lastTextDays = (fs_) => {
    const logs = Object.fromEntries(fs_.map((f) => [f, lines(['log', '--format=%H %cd', '--date=format-local:%Y-%m-%d', '--', f]).map((l) => l.split(' '))]));
    const want = fs_.flatMap((f) => logs[f].map(([h]) => h + ':' + f));
    let buf = Buffer.alloc(0);
    try { buf = execFileSync('git', ['cat-file', '--batch'], { cwd: ROOT, input: want.join('\n') + '\n', maxBuffer: 1 << 30, stdio: ['pipe', 'pipe', 'ignore'] }); } catch (e) { buf = Buffer.alloc(0); }
    const blobs = [];
    for (let p = 0; p < buf.length;) {
      const nl = buf.indexOf(10, p), head = buf.slice(p, nl).toString('utf8'), m = / blob (\d+)$/.exec(head);
      if (!m) { blobs.push(null); p = nl + 1; continue; }
      const size = Number(m[1]); blobs.push(buf.slice(nl + 1, nl + 1 + size).toString('utf8')); p = nl + 1 + size + 1;
    }
    const out = {};
    let k = 0;
    for (const f of fs_) {
      const l = logs[f], v = l.map(() => blobs[k++]);
      if (!l.length || body(read(path.join(ROOT, f))) !== body(v[0])) { out[f] = today; continue; }
      const i = v.findIndex((x, j) => j + 1 >= v.length || body(x) !== body(v[j + 1]));
      out[f] = (l[i] || [])[1] || today;
    }
    return out;
  };
  const WF = ['.github/workflows/check.yml', '.github/workflows/pdf.yml'];
  const JST_EN = ['The dates on the pages, in the feed of policy changes, in the notices and in the news are dates in Japan time.', 'The day a text was fetched is the day in UTC that the record of the fetch keeps.'];
  const JST_JA = ['頁と、規程の変更の配信と、告知と、お知らせの日付は、日本時間の日付です。', '文を取り寄せた日は、取り寄せの記録に残った協定世界時の日付です。'];
  const CH = 'data/policy-changes.json', AUD = 'docs/legal-audit-2026-11-12.md', HEAD = '\n## 2026-11-12 の続き：六度目の見落とし\n';
  const files = pages.concat(WF, [CH, AUD, 'site.json']);
  const real = Object.fromEntries(files.map((f) => [f, read(path.join(ROOT, f))]));
  const titleKey = (c) => '"title": ' + JSON.stringify(c.title);
  const facts = { shallow, last: lastTextDays(pages), first: Object.fromEntries(JSON.parse(real[CH]).map((c) => [c.title, firstDay(CH, titleKey(c))])) };
  const section = (txt, head) => { const i = txt.indexOf('\n## ' + head + '\n'); if (i < 0) return ''; const j = txt.indexOf('\n## ', i + 5); return txt.slice(i, j < 0 ? undefined : j); };
  const JUDGE = ['誤り', '根拠不足', '漏れ', '表現', '問題なし'];
  const dateProblems = (x, h) => {
    const bad = [];
    if (h.shallow) bad.push('the history is shallow or git cannot be read, so the dates cannot be compared');
    for (const f of pages) { const m = UPD.exec(x[f] || ''); const d = m && (m[1] || m[2]); if (!d || d < h.last[f]) bad.push(f + ': last updated ' + d + ', changed ' + h.last[f]); }
    let changes = [];
    try { changes = JSON.parse(x[CH]); } catch (e) { bad.push('the feed cannot be read'); }
    for (const c of changes) {
      const w = h.first[c.title] || today;
      if (c.date < w) bad.push('the entry "' + c.title.slice(0, 40) + '" is dated ' + c.date + ', first published ' + w);
      for (const m of String(c.text).matchAll(/\b[Ff]rom (\d{4}-\d{2}-\d{2})|\b[Ee]ffective on publication, (\d{4}-\d{2}-\d{2})/g)) if ((m[1] || m[2]) < c.date) bad.push('the entry "' + c.title.slice(0, 40) + '" gives a day of effect, ' + (m[1] || m[2]) + ', earlier than ' + c.date);
      if (c.from && !(c.from > c.date)) bad.push('the entry "' + c.title.slice(0, 40) + '" takes effect on or before its day');
    }
    /* The notice on the top page does not give a change in effect on publication a day of effect from midnight. */
    let site = {};
    try { site = JSON.parse(x['site.json']); } catch (e) { bad.push('site.json cannot be read'); }
    if (/From 2026-11-13,/.test(String((site.termsNotice || {}).text))) bad.push('the notice gives the day of publication as a day of effect from midnight');
    const ce = section(x['policies/terms.md'], 'Changes and closure'), cj = section(x['policies/terms.ja.md'], '変更と終了');
    if (!JST_EN.every((s) => ce.includes('\n' + s + '\n'))) bad.push('the Terms do not say in which time the dates are');
    if (!JST_JA.every((s) => cj.includes('\n' + s + '\n'))) bad.push('the Japanese Terms do not say in which time the dates are');
    for (const w of WF) if (!/uses: actions\/checkout@[0-9a-f]{40} # v[\d.]+\n {8}with:\n(?: {10}[^\n]+\n)*? {10}fetch-depth: 0\n/.test(x[w])) bad.push(w + ' does not fetch the whole history');
    /* The record. */
    const sec = (x[AUD].split(HEAD)[1] || '').split('\n## ')[0];
    if (!sec) bad.push('the record has no section');
    const rows = sec.split('\n').filter((l) => /^\| (?!---|箇所 \|)/.test(l)).map((l) => l.slice(2, -2).split(' | '));
    if (!sec.includes('| 箇所 | 法令と条 | 要件 | 事実 | 判定 | 対応 |') || rows.length < 10 || !rows.every((r) => r.length === 6 && JUDGE.includes(r[4]))) bad.push('the record\'s table');
    const tally = 'この表の判定は、' + JUDGE.filter((j) => rows.some((r) => r[4] === j)).map((j) => j + ' ' + rows.filter((r) => r[4] === j).length).join('、') + ' です。';
    if (!sec.includes(tally)) bad.push('the record\'s count');
    for (const r of rows.filter((y) => y[4] !== '問題なし')) if (!/^2026-11-13 に Claude が決めました。[^|]*ためです$/.test(r[5])) bad.push('a decision without its maker or reason: ' + r[0].slice(0, 30));
    if (!sec.includes('### 下げられずに残る危険') || !sec.includes('この節も、弁護士の確認は受けていません。')) bad.push('the record\'s remaining risk or the sentence on lawyers');
    return bad;
  };
  const bad = dateProblems(real, facts);
  ok('the "Last updated" of the ' + pages.length + ' pages is not earlier than the last commit that changed the text of each, no entry of the feed of policy changes is dated earlier than the first commit that held it or gives a day of effect earlier than itself, the notice does not, the Terms say the dates are Japan time, the checks fetch the whole history, and the record is complete (dates in Japan time)',
    bad.length === 0, bad.join(' / '));
  const mut = (f, a, b) => Object.assign({}, real, { [f]: real[f].replace(a, b) });
  const feedWith = (fn) => Object.assign({}, real, { [CH]: JSON.stringify(fn(JSON.parse(real[CH]))) });
  const breaks = [
    ['the Copyright Policy dated back to the clock of the work', mut('policies/copyright.md', 'Last updated: 2026-11-13.', 'Last updated: 2026-11-12.'), facts],
    ['its translation dated back', mut('policies/copyright.ja.md', '最終更新：2026-11-13。', '最終更新：2026-11-12。'), facts],
    ['the page for repositories dated back', mut('repositories.md', 'Last updated: 2026-11-13.', 'Last updated: 2026-11-12.'), facts],
    ['the translation of the page in plain words dated back', mut('easy.ja.md', '最終更新：2026-11-12。', '最終更新：2026-11-11。'), facts],
    ['the page of policies dated back to the day of its English text', mut('policy.ja.md', '最終更新：2026-11-12。', '最終更新：2026-11-11。'), facts],
    ['the entry on Figshare dated back', feedWith((d) => d.map((c) => (/Figshare and Research Square/.test(c.text) ? Object.assign({}, c, { date: '2026-11-12' }) : c))), facts],
    ['the entry on the places dated back', feedWith((d) => d.map((c) => (c.title.startsWith('The day from which each place') ? Object.assign({}, c, { date: '2026-11-12' }) : c))), facts],
    ['a day of effect before the entry', feedWith((d) => d.map((c) => (/Figshare and Research Square/.test(c.text) ? Object.assign({}, c, { text: c.text.replace('Effective on publication, 2026-11-13', 'Effective on publication, 2026-11-12') }) : c))), facts],
    ['a "from" on the day of the entry', feedWith((d) => d.map((c) => (/Figshare and Research Square/.test(c.text) ? Object.assign({}, c, { from: '2026-11-13' }) : c))), facts],
    ['a new entry dated before today', feedWith((d) => [{ date: '2026-11-01', policies: ['terms'], title: 'A trial entry', text: 'x' }].concat(d)), facts],
    ['the notice from midnight', mut('site.json', '"text": "Since its publication on 2026-11-13, ahead of', '"text": "From 2026-11-13, ahead of'), facts],
    ['the Terms without Japan time', mut('policies/terms.md', JST_EN[0] + '\n', ''), facts],
    ['the Japanese Terms without the day of fetching', mut('policies/terms.ja.md', JST_JA[1] + '\n', ''), facts],
    ['a shallow history', real, Object.assign({}, facts, { shallow: true })],
    ['a page changed today without a new date', real, Object.assign({}, facts, { last: Object.assign({}, facts.last, { 'policies/licences.md': '2026-12-01' }) })],
    ['the check without the whole history', mut('.github/workflows/check.yml', '          fetch-depth: 0\n', ''), facts],
    ['the PDF workflow without the whole history', mut('.github/workflows/pdf.yml', '          fetch-depth: 0\n', ''), facts],
    ['the record\'s count', mut(AUD, 'この表の判定は、誤り 5、根拠不足 1、漏れ 2、表現 2、問題なし 2 です。', 'この表の判定は、誤り 4、根拠不足 1、漏れ 2、表現 2、問題なし 2 です。'), facts],
    ['a decision without its reason', mut(AUD, '作業の時計の日付ではないためです |', '作業の時計の日付ではありません |'), facts],
    ['the record without the sentence on lawyers', mut(AUD, '\n\nこの節も、弁護士の確認は受けていません。\n\n## 2026-11-12 の続き：七度目の見落とし', '\n\n## 2026-11-12 の続き：七度目の見落とし'), facts],
  ];
  const caught = breaks.filter(([, x, h]) => dateProblems(x, h).length > 0).map(([k]) => k);
  ok('break on purpose: a page or its translation dated back, an entry dated back, a day of effect before its entry, a "from" on its day, a new entry dated before today, the notice from midnight, the Terms in both languages, a shallow history, a page changed today, either workflow without the whole history, and the record\'s count, reason and lawyers all fail (' + caught.length + ' / ' + breaks.length + ')',
    caught.length === breaks.length, breaks.filter(([k]) => !caught.includes(k)).map(([k]) => k).join(' / '));
}

/* ------------------------------------------------------------ 122 */
console.log('\n122. What a seventh, read-only pass found: ROAR\'s description of Sophaxis is out of date, no page quotes or relies on it, and the record says only that Claude cannot reach it');
{
  /* ROAR's record of Sophaxis (https://roar.eprints.org/27422/) describes it as "run by an independent researcher", lists
   * "(Zenodo, Figshare or OSF)" and says that each record has an unmodified PDF copy. The record sits in the operator's ROAR
   * account, which Claude cannot reach (rule 13): the audit records that fact as a remaining risk and gives it to no one.
   * The fetched record keeps the three sentences as parts with the SHA-256 of the whole text, and no page of Sophaxis, in
   * its sources or as built, quotes the description or repeats the operator's description or the list of three. */
  const RAW = JSON.parse(read(path.join(ROOT, 'verification', 'sources-raw.json')));
  const AUD = read(path.join(ROOT, 'docs', 'legal-audit-2026-11-12.md'));
  const HEAD7 = '\n## 2026-11-12 の続き：七度目の見落とし\n';
  const DESC = ['Sophaxis is an overlay preprint server for philosophy and mathematics, run by an independent researcher.',
    'Each record points to a deposit with a DOI (Zenodo, Figshare or OSF) and is listed after moderation, not peer review.',
    'Each record has an unmodified PDF copy of the deposited file'];
  const SHA = '448ca060c9d1318a85874297d7fac268cc9f7335886a757478ac2ea199dafec2';
  const JUDGE = ['誤り', '根拠不足', '漏れ', '表現', '問題なし'];
  /* What a page must not say: the operator as an independent researcher, the list of three, or the description itself. */
  const SAYS = [/run by an independent researcher/i, /Sophaxis[^.\n<]{0,80}independent researcher/i, /\bZenodo, Figshare,? (?:or|and) OSF\b(?! Preprints)/, /ROAR[^.\n]{0,120}(?:describes|says|calls)[^.\n]{0,40}Sophaxis/i];
  const SKIP = new Set(['docs/legal-audit-2026-11-12.md', 'verification/sources-raw.json', 'verification/check.js']);
  const { execFileSync } = require('child_process');
  let tracked = [];
  try { tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }).split('\n').filter(Boolean); } catch (e) { tracked = []; }
  const files = tracked.filter((f) => /\.(?:md|json|html|xml|txt|js|yml|cff)$/.test(f) && !SKIP.has(f) && !f.startsWith('data/pdf/'));
  const texts = Object.fromEntries(files.map((f) => [f, (() => { try { return read(path.join(ROOT, f)); } catch (e) { return ''; } })()]));
  const flat = (x) => String(x || '').replace(/\s+/g, '');
  function problems(raw, aud, tx) {
    const bad = [];
    const r = (raw.pages || {})['roar-record'] || {};
    if (r.url !== 'https://roar.eprints.org/27422/' || r.status !== 200 || r.sha256 !== SHA || !Array.isArray(r.spans) || 'text' in r) bad.push('the ROAR record not kept in parts with its SHA-256');
    const kept = flat((r.spans || []).map((x) => x.text).join(''));
    for (const d of DESC) if (!kept.includes(flat(d))) bad.push('not kept: ' + d.slice(0, 30));
    for (const [f, t] of Object.entries(tx)) for (const re of SAYS) if (re.test(t)) bad.push(f + ' says ' + re.source.slice(0, 30));
    for (const [f, t] of Object.entries(tx)) for (const d of DESC) if (t.includes(d)) bad.push(f + ' quotes ROAR');
    const sec = (aud.split(HEAD7)[1] || '').split('\n## ')[0];
    if (!sec) { bad.push('no section'); return bad; }
    const rows = sec.split('\n').filter((l) => /^\| (?!---|箇所 \|)/.test(l)).map((l) => l.slice(2, -2).split(' | '));
    if (rows.length < 6 || !rows.every((x) => x.length === 6 && JUDGE.includes(x[4]))) bad.push('the table');
    const tally = 'この表の判定は、' + JUDGE.filter((j) => rows.some((x) => x[4] === j)).map((j) => j + ' ' + rows.filter((x) => x[4] === j).length).join('、') + ' です。';
    if (!sec.includes(tally)) bad.push('the count');
    const decided = sec.split('2026-11-13 に Claude が決めました。').slice(1);
    if (decided.length < 3 || !decided.every((z) => /ためです/.test(z.split(/\n| \|/)[0]))) bad.push('a decision without its reason');
    for (const q of [...sec.matchAll(/「([^「」]+)」/g)].map((m) => m[1]).filter((q) => /^[A-Z][a-z]/.test(q) && q.length > 30)) if (!kept.includes(flat(q))) bad.push('a quotation not in the kept record: ' + q.slice(0, 30));
    const risk = (sec.split('\n### 下げられずに残る危険\n')[1] || '').split('\n### ')[0];
    if (!risk.includes('ROAR の Sophaxis の記録は、運営者の ROAR のアカウントにあります。Claude はそのアカウントに触れられません。') || !DESC.every((d) => risk.includes('「' + d + '」'))) bad.push('the remaining risk');
    /* Rule 13: the risk is given to no one. */
    if (/てください|運営者が|利用者が|の手作業|needs the owner|予定です/.test(risk)) bad.push('a task given to someone');
    if (!/取り寄せの実行は \d{8,} で、結果は枝 `sources\/\d{8}-\d{4}` にあります。/.test(sec)) bad.push('the run of the fetch');
    if (!sec.includes('この節も、弁護士の確認は受けていません。')) bad.push('the sentence on lawyers');
    return bad;
  }
  const bad = problems(RAW, AUD, texts);
  ok('ROAR\'s record of Sophaxis is kept in parts with its SHA-256 and holds the three out-of-date sentences; none of ' + files.length + ' tracked files quotes it or calls the operator an independent researcher or lists only Zenodo, Figshare and OSF; the record holds the fact that Claude cannot reach the account, given to no one',
    bad.length === 0, bad.slice(0, 6).join(' / '));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const r1 = clone(RAW); r1.pages['roar-record'].spans = r1.pages['roar-record'].spans.filter((x) => !/independent researcher/.test(x.text));
  const r2 = clone(RAW); r2.pages['roar-record'].sha256 = '0'.repeat(64);
  const r3 = clone(RAW); r3.pages['roar-record'].text = 'the whole text';
  const tw = (f, add) => Object.assign({}, texts, { [f]: (texts[f] || '') + add });
  const breaks = [
    ['a description part lost', problems(r1, AUD, texts)],
    ['another SHA-256', problems(r2, AUD, texts)],
    ['the whole text kept', problems(r3, AUD, texts)],
    ['the contact page calls the operator an independent researcher', problems(RAW, AUD, tw('contact.md', '\nSophaxis is run by an independent researcher.\n'))],
    ['the built top page lists three repositories', problems(RAW, AUD, tw('site/index.html', '<p>Deposits in Zenodo, Figshare or OSF.</p>'))],
    ['the README quotes ROAR', problems(RAW, AUD, tw('README.md', '\n' + DESC[2] + '.\n'))],
    ['the news says what ROAR says of Sophaxis', problems(RAW, AUD, tw('data/news.json', ' ROAR describes Sophaxis as a server.'))],
    ['the record\'s count', problems(RAW, AUD.replace('この表の判定は、漏れ 5、問題なし 2 です。', 'この表の判定は、漏れ 4、問題なし 2 です。'), texts)],
    ['the remaining risk given to the operator', problems(RAW, AUD.replace('Claude はそのアカウントに触れられません。日本時間の', 'Claude はそのアカウントに触れられません。運営者が記録を直します。日本時間の'), texts)],
    ['the remaining risk without the fact', problems(RAW, AUD.replace('Claude はそのアカウントに触れられません。日本時間の', '日本時間の'), texts)],
    ['a quotation altered', problems(RAW, AUD.replace('記録は「' + DESC[1], '記録は「' + DESC[1].replace('Figshare or OSF', 'Figshare, OSF')), texts)],
    ['a decision without its reason', problems(RAW, AUD.replace('同じ見落としを機械で止めるためです', '同じ見落としを機械で止めます'), texts)],
    ['the record without the sentence on lawyers', problems(RAW, AUD.replace('\n\nこの節も、弁護士の確認は受けていません。\n\n## 2026-11-12 の続き：八度目の見落とし', '\n\n## 2026-11-12 の続き：八度目の見落とし'), texts)],
  ];
  const missed = breaks.filter(([, b]) => b.length === 0).map(([k]) => k);
  ok('break on purpose: a part lost, another SHA-256, a whole text kept, a page calling the operator an independent researcher, a built page listing three repositories, the README quoting ROAR, the news saying what ROAR says, the count, the risk given to someone or without its fact, a quotation altered, a decision without its reason, the sentence on lawyers (' + (breaks.length - missed.length) + ' / ' + breaks.length + ')',
    missed.length === 0, missed.join(' / '));
}


console.log('\n123. What an eighth, read-only pass found: GitHub\'s terms for Actions were never read; every workflow is judged against them, and no page promises "at once" without the condition that Actions runs');
{
  /* GitHub's Terms of Service (section I) incorporate the GitHub Terms for Additional Products and Features, whose section on
   * Actions forbids, on GitHub-hosted runners, any activity unrelated to the production, testing, deployment or publication of
   * the software project, and a burden disproportionate to the benefit. The terms are watched (verification/statutes.json)
   * and fetched (tools/sources.js) at one commit, kept in parts with the SHA-256 of the text. Every file in .github/workflows
   * has a row in the eighth section of the audit, so that a new workflow cannot be added without being judged. The pages
   * that promised to take a record page offline "at once" say that this holds while GitHub Actions runs, and that the
   * operator does it by hand when Actions does not. The monthly run no longer writes the posts for X. */
  const S = require('../tools/sources.js');
  const J = (f) => JSON.parse(read(path.join(ROOT, f)));
  const RAW = J('verification/sources-raw.json'), TX = J('verification/statutes-texts.json'), STAT = J('verification/statutes.json');
  const AUD = read(path.join(ROOT, 'docs', 'legal-audit-2026-11-12.md'));
  const HEAD8 = '\n## 2026-11-12 の続き：八度目の見落とし\n';
  const NAME = 'GitHub Terms for Additional Products and Features', FILE = 'Policies/github-terms/github-terms-for-additional-products-and-features.md';
  const SHA = '32ee90cb762f90bbabbe66452a3b2716caee1c7819f0741325891f77378dfeb1';
  const QUOTE = ['Additionally, regardless of whether an Action is using self-hosted runners, Actions should not be used for:',
    'Any activity that places a burden on our servers, where that burden is disproportionate to the benefits provided to users (for example, don\'t use Actions as a content delivery network or as part of a serverless application, but a low benefit Action could be ok if it’s also low burden); or',
    'If using GitHub-hosted runners, any other activity unrelated to the production, testing, deployment, or publication of the software project associated with the repository where GitHub Actions are used.',
    'Misuse of GitHub Actions may result in termination of jobs, restrictions in your ability to use GitHub Actions, disabling of repositories created to run Actions in a way that violates these Terms, or in some cases, suspension or termination of your GitHub account.'];
  const OPENALEX = { 'openalex-license-src': ['That means it\'s in the public domain, and free to use in any way you like.'],
    'openalex-limits-src': ['The OpenAlex API doesn\'t require authentication.', '100,000 singleton requests (like `/works/W123`)', 'If you exceed your daily credits or make more than 100 requests per second, you\'ll get `429` errors instead of useful data.'] };
  const JUDGE = ['誤り', '根拠不足', '漏れ', '表現', '問題なし'];
  const flat = (x) => String(x || '').replace(/\s+/g, '');
  const keptOf = (r) => flat(((r || {}).spans || []).map((x) => x.text).join(''));
  const WF = fs.readdirSync(path.join(ROOT, '.github', 'workflows')).filter((f) => /\.ya?ml$/.test(f)).sort();
  const wfText = Object.fromEntries(WF.map((f) => [f, read(path.join(ROOT, '.github', 'workflows', f))]));
  const PAGES_ = ['policies/takedown.md', 'policies/takedown.ja.md', 'policies/terms.md', 'policies/terms.ja.md', 'automation.md', 'automation.ja.md', 'disclaimer.md', 'disclaimer.ja.md', 'SECURITY.md', 'README.md'];
  const pages = Object.fromEntries(PAGES_.map((f) => [f, read(path.join(ROOT, f))]));
  /* The sentences that say what happens when Actions does not run, in both languages. */
  const SAY = {
    'policies/takedown.md': ['while GitHub Actions runs for Sophaxis, and OAI-PMH reports the record as deleted', 'While they do not run, the operator takes these steps by hand, as soon as the operator learns of the request, and the record page is then not taken offline at once.'],
    'policies/takedown.ja.md': ['Sophaxis の GitHub Actions が動いている限り、判断の前に', '動かないあいだは、運営者が求めを知りしだい、これらの手順を手で行います。そのときは、記録の頁はただちには外れません。'],
    'policies/terms.md': ['If GitHub restricts or stops Actions, this step also waits for the operator.'],
    'policies/terms.ja.md': ['GitHub が Actions を制限するか止めたときは、この手順も運営者を待ちます。'],
    'automation.md': ['While they do not run, no such step runs by itself: the operator takes the steps by hand, as soon as the operator can, and none of them happens at once.'],
    'automation.ja.md': ['動かないあいだは、どの手順もひとりでには動きません。運営者ができしだい手で行い、どれもすぐには行われません。'],
    'disclaimer.md': ['a record page reported for exposed personal data is then taken offline by the operator, not at once.'],
    'disclaimer.ja.md': ['個人データの露出が報告された記録の頁も、運営者が手で外し、すぐには外れません。'],
  };
  /* A promise to take something offline at once: in the same sentence, the condition that Actions runs, or a negation.
   * The words on what serious harm requires describe the need, not a step, and are let through. */
  const PROMISE = /offline at once|at once, before anything|ただちに(?:公開から外|非公開|外し|外します)|すぐに下げ/;
  const COND = /GitHub Actions|Actions が動|not taken offline at once|not at once|ただちには|すぐには/;
  const NEED = /Except where serious harm requires it at once|requires the material to be taken offline at once|重大な害のためにただちに外す場合|ただちに公開から外す必要がある場合|働くのは露出した個人データをただちに公開から外す処理だけ|only the step that takes exposed personal data offline at once ever does/;
  const sentences = (x) => String(x).split(/\n|(?<=[.。])\s+|(?<=。)/);
  function problems(c) {
    const bad = [];
    const pol = (c.stat.policies || []).find((x) => x.name === NAME);
    if (!pol || pol.repo !== 'github/site-policy' || pol.path !== FILE || !/^[0-9a-f]{40}$/.test(pol.commit || '')) bad.push('the terms are not watched');
    const want = pol ? 'https://raw.githubusercontent.com/github/site-policy/' + pol.commit + '/' + FILE : '';
    if (!c.pages['github-additional-terms'] || c.pages['github-additional-terms'].url !== want) bad.push('the terms are not fetched at the watched commit');
    const r = (c.raw.pages || {})['github-additional-terms'] || {};
    if (r.url !== want || r.status !== 200 || r.sha256 !== SHA || !Array.isArray(r.spans) || 'text' in r) bad.push('the terms are not kept in parts with their SHA-256');
    for (const q of QUOTE) if (!keptOf(r).includes(flat(q))) bad.push('not kept: ' + q.slice(0, 30));
    for (const [k, qs] of Object.entries(OPENALEX)) for (const q of qs) if (!keptOf((c.raw.pages || {})[k]).includes(flat(q))) bad.push('not kept in ' + k + ': ' + q.slice(0, 30));
    const sec = (c.aud.split(HEAD8)[1] || '').split('\n## ')[0];
    if (!sec) return bad.concat(['no section']);
    if (!sec.includes('| 箇所 | 法令と条 | 要件 | 事実 | 判定 | 対応 |')) bad.push('the columns');
    const rows = sec.split('\n').filter((l) => /^\| (?!---|箇所 \|)/.test(l)).map((l) => l.slice(2, -2).split(' | '));
    rows.forEach((x, i) => { if (x.length !== 6 || !JUDGE.includes(x[4])) bad.push('row ' + (i + 1)); });
    const tally = 'この表の判定は、' + JUDGE.filter((j) => rows.some((x) => x[4] === j)).map((j) => j + ' ' + rows.filter((x) => x[4] === j).length).join('、') + ' です。';
    if (!sec.includes(tally)) bad.push('the count');
    for (const x of rows.filter((y) => y[4] !== '問題なし')) if (!x[5].includes('2026-11-13 に Claude が決めました。')) bad.push('a decision without its maker: ' + x[0].slice(0, 30));
    /* Every workflow has a row of its own, and every row names a workflow that is there. */
    const named = rows.map((x) => (/^`\.github\/workflows\/([^`]+)`/.exec(x[0]) || [])[1]).filter(Boolean);
    for (const f of c.wf) if (!named.includes(f)) bad.push('no row for the workflow ' + f);
    for (const f of named) if (!c.wf.includes(f)) bad.push('a row for a workflow that is not there: ' + f);
    const qs = [...sec.matchAll(/「([^「」]+)」/g)].map((m) => m[1]);
    if (qs.length < 8) bad.push('too few quotations');
    for (const q of qs) if (!c.pool.includes(flat(q))) bad.push('not in a kept text: ' + q.slice(0, 30));
    if (!/取り寄せの実行は \d{8,} で、結果は枝 `sources\/\d{8}-\d{4}` にあります。/.test(sec)) bad.push('the run of the fetch');
    if (!sec.includes('`c39b5a7fc1953ebd37428db18101726acefb55420f766bcd7d912e1b71ee2ffc`') || !sec.includes('`' + SHA + '`')) bad.push('the SHA-256 of the terms');
    if (!sec.includes('この節も、弁護士の確認は受けていません。')) bad.push('the sentence on lawyers');
    /* The monthly run writes no posts for X. */
    if (/node tools\/monthly\.js/.test(c.wfText['monthly.yml'] || '')) bad.push('the monthly run still writes the posts for X');
    for (const [f, xs] of Object.entries(SAY)) for (const x of xs) if (!String(c.texts[f] || '').includes(x)) bad.push(f + ': ' + x.slice(0, 30));
    for (const [f, x] of Object.entries(c.texts)) for (const s of sentences(x)) if (PROMISE.test(s) && !COND.test(s) && !NEED.test(s)) bad.push(f + ' promises at once: ' + s.trim().slice(0, 50));
    return bad;
  }
  const pool = flat(Object.values(RAW.pages).map((o) => (o.spans || []).map((x) => x.text).join('')).join('')
    + Object.values(RAW.sources).map((r) => Object.values(r.articles || {}).map((a) => (Array.isArray(a) ? a.map((x) => x.text).join('') : String(a))).join('')).join('') + Object.values(TX).join(''));
  const real = { stat: STAT, pages: S.PAGES, raw: RAW, aud: AUD, wf: WF, wfText, texts: pages, pool };
  const now = problems(real);
  const rows = ((AUD.split(HEAD8)[1] || '').split('\n## ')[0].match(/^\| `\.github\/workflows\//gm) || []).length;
  ok('the GitHub Terms for Additional Products and Features are watched and kept in parts with their SHA-256, each of the ' + WF.length + ' workflows has its row in the eighth section of the audit (' + rows + ' rows), judged against the section on Actions, and no page of ' + PAGES_.length + ' promises "at once" without the condition that Actions runs',
    now.length === 0, now.slice(0, 6).join(' / '));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const w = (o) => Object.assign({}, real, o);
  const r1 = clone(RAW); r1.pages['github-additional-terms'].spans = r1.pages['github-additional-terms'].spans.filter((x) => !/GitHub-hosted runners/.test(x.text));
  const r2 = clone(RAW); r2.pages['github-additional-terms'].sha256 = '0'.repeat(64);
  const r3 = clone(RAW); r3.pages['github-additional-terms'].text = 'the whole text';
  const s1 = clone(STAT); s1.policies = s1.policies.filter((x) => x.name !== NAME);
  const tx = (f, a, b) => w({ texts: Object.assign({}, pages, { [f]: pages[f].replace(a, b) }) });
  const breaks = [
    ['the terms not watched', problems(w({ stat: s1 }))],
    ['the terms not fetched', problems(w({ pages: Object.assign({}, S.PAGES, { 'github-additional-terms': undefined }) }))],
    ['a quoted part lost', problems(w({ raw: r1 }))],
    ['another SHA-256', problems(w({ raw: r2 }))],
    ['the whole text kept', problems(w({ raw: r3 }))],
    ['a new workflow without a row', problems(w({ wf: WF.concat(['newsletter.yml']) }))],
    ['a row for a workflow taken away', problems(w({ wf: WF.filter((f) => f !== 'audit.yml') }))],
    ['a row dropped', problems(w({ aud: AUD.replace(/\n\| `\.github\/workflows\/pdf\.yml`[^\n]*/, '') }))],
    ['the count', problems(w({ aud: AUD.replace('この表の判定は、漏れ 4、表現 1、問題なし 13 です。', 'この表の判定は、漏れ 3、表現 1、問題なし 13 です。') }))],
    ['a decision without its maker', problems(w({ aud: AUD.replace('ワークフローから呼ばれなくなりました。2026-11-13 に Claude が決めました。', 'ワークフローから呼ばれなくなりました。') }))],
    ['a quotation altered', problems(w({ aud: AUD.replace('or publication of the software project associated', 'or promotion of the software project associated') }))],
    ['the posts for X written again', problems(w({ wfText: Object.assign({}, wfText, { 'monthly.yml': wfText['monthly.yml'] + '\n      - run: node tools/monthly.js\n' }) }))],
    ['the condition taken out of the Takedown Policy', problems(tx('policies/takedown.md', ', while GitHub Actions runs for Sophaxis, and OAI-PMH', ', and OAI-PMH'))],
    ['the condition taken out of the Japanese Terms', problems(tx('policies/terms.ja.md', 'Sophaxis の GitHub Actions が動いている限り、記録の頁をただちに非公開にします。', '記録の頁をただちに非公開にします。'))],
    ['a new promise of "at once" in SECURITY.md', problems(tx('SECURITY.md', 'There is no bounty.', 'Any exposed secret is taken offline at once, before anything is decided. There is no bounty.'))],
    ['the Disclaimer without the hand steps', problems(tx('disclaimer.ja.md', '個人データの露出が報告された記録の頁も、運営者が手で外し、すぐには外れません。', ''))],
  ];
  const missed = breaks.filter(([, b]) => b.length === 0).map(([k]) => k);
  ok('break on purpose: the terms not watched or not fetched, a quoted part lost, another SHA-256, a whole text kept, a new workflow without a row, a row for a workflow taken away, a row dropped, the count, a decision without its maker, a quotation altered, the posts for X written again, the condition taken out of a policy in either language, a new unconditioned "at once", the Disclaimer without the hand steps (' + (breaks.length - missed.length) + ' / ' + breaks.length + ')',
    missed.length === 0, missed.join(' / '));
}
/* ------------------------------------------------------------ 124 */
console.log('\n124. What a ninth, read-only pass found: the OAI-PMH interface gives the same address as the operator\'s ORCID record, and no page calls it a separate address');
{
  /* The contact page, the Privacy Policy, the Takedown Policy (both languages) and the README said that the OAI-PMH
   * interface gives a separate address made for harvesters, and that the address for requests is not on this site.
   * Identify gives the address in site.json (oai.adminEmails), which is the public address of the operator's ORCID
   * record, where requests go. Two things are pinned: no page calls the address of the interface separate from, or
   * other than, the address for requests; and the address is written in no file but the two that the ninth section of
   * the audit names. A failure names files only, never the address. The record of the audit, the changelog (whose
   * entry for #91 and #92 stays as the record of that release) and the checks keep the old wording as history; the
   * entries of the feed of policy changes that correct it are read without their own text. */
  const J = (f) => JSON.parse(read(path.join(ROOT, f)));
  const AUD = read(path.join(ROOT, 'docs', 'legal-audit-2026-11-12.md'));
  const HEAD9 = '\n## 2026-11-12 の続き：九度目の見落とし\n';
  const JUDGE = ['誤り', '根拠不足', '漏れ', '表現', '問題なし'];
  const listed = require('child_process').execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean);
  const walk = (d) => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name]));
  const files = [...new Set(listed.concat(walk('site')))].filter((f) => fs.existsSync(path.join(ROOT, f)) && !/\.(pdf|png|ico|jpe?g|gif|webp|woff2?)$/i.test(f));
  const texts = Object.fromEntries(files.map((f) => [f, read(path.join(ROOT, f))]));
  const HISTORY = /^(?:docs\/legal-audit-2026-11-12\.md|CHANGELOG\.md|verification\/)/;
  const unesc = (x) => x.replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  /* A sentence about the address that calls it separate, other, made for harvesters, or not on this site. */
  const ABOUT = /OAI|adminEmail|address|アドレス|宛先/;
  const APART = /separate (?:e-?mail )?address|different (?:e-?mail )?address|another (?:e-?mail )?address|made for (?:harvesters|this use)|address the operator made|(?:is|are) for harvesters|not the one for harvesters|for the administrators of harvesters|not on this site|収集者のため|別のアドレス|別の宛先|異なるアドレス|異なる宛先|このサイトではなく|このサイトには(?:無|な)い/i;
  const sentences = (x) => String(x).split(/\n|(?<=[.。])\s+|(?<=。)/);
  function problems(c) {
    const bad = [];
    const fixes = (c.changes || []).filter((e) => /correction of an untrue statement/.test(e.text || '')).map((e) => e.text);
    for (const [f, x0] of Object.entries(c.texts)) {
      if (HISTORY.test(f)) continue;
      let x = unesc(x0);
      for (const t of fixes) x = x.split(t).join('');
      if (sentences(x).some((s) => ABOUT.test(s) && APART.test(s))) bad.push(f + ' calls the address of the interface separate');
    }
    /* The places named in the record, and the address nowhere else. */
    const sec = (c.aud.split(HEAD9)[1] || '').split('\n## ')[0];
    if (!sec) return bad.concat(['no ninth section']);
    const m = /アドレスを書くのは、(.+?)だけです。/.exec(sec);
    const places = m ? [...m[1].matchAll(/`([^`]+)`/g)].map((y) => y[1]) : [];
    if (places.length === 0) bad.push('the record names no place for the address');
    const mails = (c.site.oai || {}).adminEmails || [];
    if (mails.length !== 1) bad.push('site.json gives ' + mails.length + ' addresses for Identify');
    for (const [f, x] of Object.entries(c.texts)) if (mails.some((e) => x.includes(e)) && !places.includes(f)) bad.push(f + ' holds the address of the interface');
    for (const p of places) if (!mails.every((e) => String(c.texts[p] || '').includes(e))) bad.push(p + ' does not hold the address');
    if (/[^\s@<>"`]+@[^\s@<>"`]+\.[a-z]{2,}/i.test(sec)) bad.push('the record writes an address');
    /* The record: the table, its count, the decisions, and the sentence on lawyers. */
    if (!sec.includes('| 箇所 | 法令と条 | 要件 | 事実 | 判定 | 対応 |')) bad.push('the columns');
    const rows = sec.split('\n').filter((l) => /^\| (?!---|箇所 \|)/.test(l)).map((l) => l.slice(2, -2).split(' | '));
    rows.forEach((x, i) => { if (x.length !== 6 || !JUDGE.includes(x[4])) bad.push('row ' + (i + 1)); });
    const tally = 'この表の判定は、' + JUDGE.filter((j) => rows.some((x) => x[4] === j)).map((j) => j + ' ' + rows.filter((x) => x[4] === j).length).join('、') + ' です。';
    if (!sec.includes(tally)) bad.push('the count');
    for (const x of rows.filter((y) => y[4] !== '問題なし')) if (!/2026-11-13 に Claude が決めました。[^|]*ためです$/.test(x[5])) bad.push('a decision without its maker or reason: ' + x[0].slice(0, 30));
    if (!rows.some((x) => x[0].startsWith('検査') && x[4] === '漏れ')) bad.push('the check as a gap');
    if (!sec.includes('この変更は、事実と違う文の訂正です。誰の権利も狭めず、利用者の務めも足しません。')) bad.push('which kind of change');
    if (!sec.includes('この節も、弁護士の確認は受けていません。')) bad.push('the sentence on lawyers');
    /* The policy change: in the feed as a correction, and the commitment moved with its old line kept. */
    const OLD = 'The OAI-PMH interface gives an email address made for harvesters, because the protocol requires one.';
    const NEW = 'The OAI-PMH interface gives the same email address as the operator\'s ORCID record, because the protocol requires one.';
    if (!(c.changes || []).some((e) => e.date === '2026-11-13' && !e.from && ['privacy', 'takedown'].every((p) => e.policies.includes(p)) && /correction of an untrue statement, effective on publication, 2026-11-13/.test(e.text) && /no right is narrowed/.test(e.text))) bad.push('the feed');
    if (c.com.includes(OLD) || !c.com.includes(NEW) || !c.sup.split('\n').includes(OLD + '\t' + NEW)) bad.push('the commitment');
    for (const f of ['policies/privacy.md', 'policies/privacy.ja.md', 'policies/takedown.md', 'policies/takedown.ja.md', 'contact.md', 'contact.ja.md']) if (!/^(?:Last updated: |最終更新：)2026-11-1[3-9]|^(?:Last updated: |最終更新：)2026-1[12]-[23]\d/m.test(String(c.texts[f] || ''))) bad.push(f + ': the last update');
    return bad;
  }
  const real = { texts, aud: AUD, site: J('site.json'), changes: J('data/policy-changes.json'), com: read(path.join(__dirname, 'commitments.txt')), sup: read(path.join(__dirname, 'superseded.txt')) };
  const now = problems(real);
  const mail = (real.site.oai || {}).adminEmails || [];
  ok('no page of ' + files.filter((f) => !HISTORY.test(f)).length + ' calls the address of the OAI-PMH interface separate from the address for requests, the address in site.json is written only where the ninth section of the audit says, the change is in the feed as a correction, and the record is complete',
    now.length === 0 && mail.length === 1, now.slice(0, 6).join(' / '));
  const tx = (f, a, b) => Object.assign({}, real, { texts: Object.assign({}, texts, { [f]: String(texts[f]).replace(a, b) }) });
  const other = 'docs/operations.md';
  const breaks = [
    ['the separate address back on the contact page', tx('contact.md', 'The OAI-PMH interface at `/oai` gives the same address, because', 'The OAI-PMH interface at `/oai` gives a separate address made for harvesters, because')],
    ['the separate address back in Japanese', tx('contact.ja.md', '`/oai` の OAI-PMH の口も、同じアドレスを示します。', '`/oai` の OAI-PMH の口には、収集者のための別のアドレスがあります。')],
    ['"not on this site" back', tx('contact.md', 'The email address for requests is the one on the operator\'s ORCID record.', 'The email address for requests is kept on the ORCID record, not on this site.')],
    ['the Privacy Policy as before', tx('policies/privacy.md', 'gives the same email address as the operator\'s ORCID record, because', 'gives an email address made for harvesters, because')],
    ['the Japanese Takedown Policy as before', tx('policies/takedown.ja.md', 'OAI-PMH の口も、この規格が宛先を求めるため、同じ宛先を示します。', 'OAI-PMH の口にある宛先は、収集者のためのものです。')],
    ['a built page as before', tx('site/policies/privacy.html', 'gives the same email address as the operator\'s ORCID record', 'gives an email address made for harvesters')],
    ['llms-full.txt as before', tx('site/llms-full.txt', 'gives the same email address as the operator\'s ORCID record', 'gives a different address')],
    ['the README as before', tx('README.md', 'It is the same address as the one on the operator\'s ORCID record', 'It is an address the operator made for this use')],
    ['the address written into another file', tx(other, /$/, '\n' + (mail[0] || 'x') + '\n')],
    ['the places taken out of the record', Object.assign({}, real, { aud: AUD.replace('アドレスを書くのは、`site.json` と、そこから作る `site/api/oai.js` だけです。', '') })],
    ['a place dropped from the record', Object.assign({}, real, { aud: AUD.replace('アドレスを書くのは、`site.json` と、そこから作る `site/api/oai.js` だけです。', 'アドレスを書くのは、`site.json` だけです。') })],
    ['the count', Object.assign({}, real, { aud: AUD.replace('この表の判定は、誤り 3、漏れ 1、表現 1 です。', 'この表の判定は、誤り 2、漏れ 1、表現 1 です。') })],
    ['a decision without its reason', Object.assign({}, real, { aud: AUD.replace('説明の頁でも同じに書くためです |\n| 変更履歴', '説明の頁でも同じに書きます |\n| 変更履歴') })],
    ['the kind of change not said', Object.assign({}, real, { aud: AUD.replace('この変更は、事実と違う文の訂正です。誰の権利も狭めず、利用者の務めも足しません。', '') })],
    ['the feed without the change', Object.assign({}, real, { changes: real.changes.filter((e) => !/the same address as the operator's ORCID record/.test(e.text)) })],
    ['the old commitment back', Object.assign({}, real, { com: real.com.replace('gives the same email address as the operator\'s ORCID record, because', 'gives an email address made for harvesters, because') })],
  ];
  const missed = breaks.filter(([, b]) => problems(b).length === 0).map(([k]) => k);
  /* The message of a failure names files, not the address. */
  const leak = breaks.some(([, b]) => mail.some((e) => problems(b).join(' ').includes(e)));
  ok('break on purpose: the separate address back on the contact page (both languages), "not on this site", the Privacy Policy, the Japanese Takedown Policy, a built page, llms-full.txt and the README as before, the address written into another file, the places taken out of or dropped from the record, the count, a decision without its reason, the kind of change, the feed and the old commitment all fail, and no failure prints the address (' + (breaks.length - missed.length) + ' / ' + breaks.length + ')',
    missed.length === 0 && !leak, missed.join(' / ') + (leak ? ' / the address printed' : ''));
}
console.log('\n' + '-'.repeat(60));
if (fails.length) {
  console.log(pass + ' passed, ' + fails.length + ' failed.');
  fails.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log(pass + ' checks passed.');
