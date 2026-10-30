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
const { build, validate, orcidOk } = require('../build.js');

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
  ok('the record page shows the language-model statement', a.includes('Use of language models and other generative models') && a.includes('the authors checked every claim'));
  ok('the record page gives a BibTeX entry with the DOI', /@misc\{doe2026sophaxis20260001,[\s\S]*doi\s+= \{10\.5281\/zenodo\.1234999\}/.test(a));
  ok('the operator’s own submission is marked', a.includes('operator’s own submission'));
  ok('notes and corrections are shown with their date', a.includes('2026-12-02') && a.includes('Notes and corrections'));
  ok('the ORCID iD links to orcid.org', a.includes('href="https://orcid.org/0000-0002-1825-0097"'));
  const w = read(path.join(FIX, 'abs', '2026.0002.html'));
  ok('a withdrawn record keeps its page with a notice', w.includes('Withdrawn.') && w.includes('citations do not break'));
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
  ok('the ORCID checksum accepts an iD ending in X', orcidOk('0000-0002-9079-593X'));
}

/* ------------------------------------------------------------ 4 */
console.log('\n4. The policy keeps its promises in writing');
{
  const policy = read(path.join(ROOT, 'policy.md'));
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
    'Sophaxis does not guarantee the quality of any listed work.',
    'Only an author of a work can submit it.',
    'A submission that does not pass both is not listed.',
    'It is not an official identity check.',
    'Email addresses and other details in an ORCID record are not read.',
    'It is shown under the work\'s own licence, with its authors and a link to the work.',
    'On arXiv, choose CC BY 4.0, CC BY-SA 4.0 or CC0 1.0 when you submit; the arXiv non-exclusive licence is not accepted.',
    'Work on SSRN is accepted only if it carries one of the accepted licences.',
    'The Sophaxis site sets no cookies, runs no analytics and loads nothing from other servers.',
    'Submissions by the operator are moderated under the same rules',
    'Claude is not an author.',
  ].forEach((s) => ok('policy says: ' + s.slice(0, 60), policy.includes(s)));
  const form = read(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'submission.yml'));
  ok('the submission form requires the language-model statement', /id: llm[\s\S]*?required: true/.test(form));
  ok('the submission form asks about every generative model, not only language models', form.includes('label: Use of language models and other generative models') && form.includes('This covers every generative model, not only language models.'));
  ok('the submission form warns that the issue is public', form.includes('This issue is public.'));
  const repos = Object.entries(JSON.parse(read(path.join(ROOT, 'site.json'))).repositories);
  const submit = read(path.join(ROOT, 'site', 'submit.html'));
  ok('the policy, the form and the submit page name every accepted repository', repos.every(([pre, name]) => policy.includes(name) && form.includes(name) && form.includes(pre) && submit.includes(name)), repos.map(([, n]) => n).join(', '));
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
      if (/<script/i.test(h)) bad.push(f + ': script');
      if (/<(img|link|iframe)[^>]+(src|href)="https?:/i.test(h.replace(/<link rel="canonical"[^>]*>/, ''))) bad.push(f + ': external load');
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
  const pages = fs.readdirSync(path.join(ROOT, 'site'), { recursive: true }).filter((f) => f.endsWith('.html'));
  const missing = pages.filter((f) => {
    const h = read(path.join(ROOT, 'site', f));
    return !/<link rel="icon" href="(\.\.\/|\.\/)favicon\.svg" type="image\/svg\+xml">/.test(h)
      || !h.includes('<meta property="og:image" content="https://sophaxis.vercel.app/og.png">');
  });
  ok('every page links the logo and the share card', pages.length > 0 && missing.length === 0, missing.join(', '));
}

/* ------------------------------------------------------------ 7 */
console.log('\n7. Search engines see the site as Sophaxis');
{
  const i = read(path.join(ROOT, 'site', 'index.html'));
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

  const dc = I.fromDataCite(json('datacite.json'));
  ok('DataCite metadata: title, authors with ORCID iD, licence and date', dc.title === 'A Fixture on Cyclic Operators' && dc.authors.length === 2
    && dc.authors[0].orcid === '0000-0002-1825-0097' && dc.authors[1].name === 'Jane Roe' && dc.licences[0] === 'CC-BY-4.0' && dc.date === '2026-11-03');
  ok('the abstract keeps "δ < 1/φ" and loses the markup, even when escaped twice', dc.abstract === 'The threshold is δ < 1/φ, and 2 > 1 for this fixture.', dc.abstract);
  const cr = I.fromCrossref(json('crossref.json'));
  ok('Crossref metadata: markup removed, licence from its URL, full date when "posted" has only a year', cr.title === 'Introducing Fixtures: A Note'
    && cr.abstract === 'A fixture abstract about modal logic.' && cr.licences[0] === 'CC-BY-SA-4.0' && cr.date === '2026-11-05' && cr.authors[1].orcid === '0000-0002-1825-0097');
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

  const papers = fs.mkdtempSync(path.join(os.tmpdir(), 'sophaxis-papers-'));
  fs.copyFileSync(path.join(__dirname, 'fixtures', 'papers', '2026.0001.json'), path.join(papers, '2026.0001.json'));
  const r = run({});
  const d = I.draft({ form, login: 'jcarberry', issue: 7, meta: dc, versions: [{ doi: dc.doi, date: dc.date }], result: r, paperDir: papers, today: '2026-11-10' });
  ok('the draft record is valid and takes the next id', d.problems.length === 0 && d.record.id === '2026.0002' && d.record.issue === 7 && d.record.license === 'CC-BY-4.0', d.problems.join('; '));
  ok('the draft is not marked as the operator’s own unless the operator opened the issue', !d.record.operator_own
    && I.draft({ form, login: 'CPSBVBNG26-DOTCOM', issue: 7, meta: dc, versions: [{ doi: dc.doi, date: dc.date }], result: r, paperDir: papers, today: '2026-11-10' }).record.operator_own === true);
  const up = I.draft({ form: Object.assign({}, form, { update: '2026.0001' }), login: 'jcarberry', issue: 8, meta: dc, versions: [{ doi: '10.5281/zenodo.1234999', date: '2026-12-01' }, { doi: '10.5281/zenodo.2000000', date: '2026-12-20' }], result: r, paperDir: papers });
  ok('an update adds only the new version to the existing record', up.problems.length === 0 && up.record.versions.length === 3 && up.record.versions[2].doi === '10.5281/zenodo.2000000');
  const c = I.comment(r, { record: Object.assign({}, d.record, { title: 'x ~~~~ y' }), problems: [] });
  ok('the comment carries the marker and keeps the draft inside its fence', c.startsWith(I.MARK) && (c.match(/~~~~/g) || []).length === 2);
  ok('a failed check posts no draft', !I.comment(run({ login: 'someone-else' }), null).includes('~~~~json'));

  const wf = read(path.join(ROOT, '.github', 'workflows', 'intake.yml'));
  const runs = [...wf.matchAll(/^\s*- run: (.*)$/gm)].map((m) => m[1]);
  ok('the workflow passes the issue text through the environment, never into the shell', runs.length === 1 && !runs[0].includes('${{') && wf.includes('ISSUE_BODY: ${{ github.event.issue.body }}'));
  ok('the workflow may only read the code and write to issues', /permissions:\n  contents: read\n  issues: write\n(?!  \w)/.test(wf));
  ok('the workflow runs only on submission issues', wf.includes("if: contains(github.event.issue.labels.*.name, 'submission')"));
  const src = read(path.join(ROOT, 'tools', 'intake.js'));
  ok('the intake reads only the ORCID person and works, not emails or addresses', !/\/(email|address|addresses|record)\b'?/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')) && src.includes("'/person'") && src.includes("'/works'"));
}

console.log('\n' + '-'.repeat(60));
if (fails.length) {
  console.log(pass + ' passed, ' + fails.length + ' failed.');
  fails.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log(pass + ' checks passed.');
