#!/usr/bin/env node
/* Build the Sophaxis site from site.json, policy.md and data/papers/*.json.
 *
 *   node build.js            # writes site/
 *   node build.js <outdir>   # writes elsewhere (used by the check)
 *
 * No dependencies. No scripts in the output, and nothing is loaded from other servers.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'site'));
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const PAPER_DIR = path.join(ROOT, 'data', 'papers');

/* ------------------------------------------------------------ records */

const ID = /^\d{4}\.\d{4}$/;
const DOI = /^10\.\d{4,9}\/\S+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function orcidOk(o) {
  if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(o)) return false;
  const d = o.replace(/-/g, '');
  let total = 0;
  for (let i = 0; i < 15; i++) total = (total + Number(d[i])) * 2;
  const r = (12 - (total % 11)) % 11;
  return d[15] === (r === 10 ? 'X' : String(r));
}

/* Returns a list of problems. An empty list means the record is valid. */
function validate(p, file) {
  const e = [];
  const need = (k) => { if (p[k] === undefined || p[k] === '') e.push(file + ': ' + k + ' is missing'); };
  ['id', 'title', 'authors', 'abstract', 'category', 'license', 'versions', 'llm_disclosure', 'issue', 'status'].forEach(need);
  if (p.id && !ID.test(p.id)) e.push(file + ': id must look like 2026.0001');
  if (p.id && path.basename(file, '.json') !== p.id) e.push(file + ': file name must be the id');
  if (p.category && !SITE.categories[p.category]) e.push(file + ': unknown category ' + p.category);
  if (p.license && !SITE.licenses[p.license]) e.push(file + ': licence not accepted: ' + p.license);
  if (!Array.isArray(p.authors) || p.authors.length === 0) e.push(file + ': authors must be a non-empty list');
  (p.authors || []).forEach((a, i) => {
    if (!a.name) e.push(file + ': author ' + (i + 1) + ' has no name');
    if (a.orcid && !orcidOk(a.orcid)) e.push(file + ': author ' + (i + 1) + ' has an invalid ORCID');
    if (/\b(claude|chatgpt|gpt-\d|gemini|llama|copilot|midjourney|dall-e|stable diffusion|firefly|language model|generative model)\b/i.test(a.name || '')) {
      e.push(file + ': a language model or other generative model cannot be an author');
    }
  });
  if (!Array.isArray(p.versions) || p.versions.length === 0) e.push(file + ': versions must be a non-empty list');
  (p.versions || []).forEach((v, i) => {
    if (v.version !== i + 1) e.push(file + ': versions must be numbered 1, 2, 3 …');
    if (!DOI.test(v.doi || '')) e.push(file + ': version ' + (i + 1) + ' has an invalid DOI');
    if (!Object.keys(SITE.repositories).some((pre) => (v.doi || '').startsWith(pre))) {
      e.push(file + ': version ' + (i + 1) + ' is not in an accepted repository');
    }
    if (!DATE.test(v.date || '')) e.push(file + ': version ' + (i + 1) + ' has an invalid date');
    if (i > 0 && v.date < p.versions[i - 1].date) e.push(file + ': versions must be in date order');
  });
  if (typeof p.llm_disclosure === 'string' && p.llm_disclosure.trim().length < 20) {
    e.push(file + ': the language-model statement is too short');
  }
  if (!['listed', 'withdrawn'].includes(p.status)) e.push(file + ': status must be listed or withdrawn');
  if (p.status === 'withdrawn' && !p.withdrawal_note) e.push(file + ': a withdrawn record needs a note');
  (p.notes || []).forEach((n, i) => {
    if (!DATE.test(n.date || '') || !n.text) e.push(file + ': note ' + (i + 1) + ' needs a date and text');
  });
  if (!Number.isInteger(p.issue) || p.issue < 1) e.push(file + ': issue must be the submission issue number');
  return e;
}

function loadPapers(dir) {
  if (!fs.existsSync(dir)) return { papers: [], problems: [] };
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  const papers = [];
  const problems = [];
  for (const f of files) {
    let p;
    try { p = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); }
    catch (err) { problems.push(f + ': not valid JSON'); continue; }
    problems.push(...validate(p, f));
    papers.push(p);
  }
  const ids = papers.map((p) => p.id);
  if (new Set(ids).size !== ids.length) problems.push('ids are not unique');
  return { papers, problems };
}

/* ------------------------------------------------------------ html */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CSS = `
:root { --bg: #f7f5f0; --fg: #1d2330; --muted: #5a6170; --rule: #d9d4c7; --accent: #2f4a7a; --card: #fffdf8; color-scheme: light; }
@media (prefers-color-scheme: dark) { :root { --bg: #14171f; --fg: #e6e2d8; --muted: #a3a8b4; --rule: #2e3442; --accent: #9fb6e0; --card: #1a1e28; color-scheme: dark; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 17px/1.65 Georgia, "Times New Roman", "Hiragino Mincho ProN", "Yu Mincho", serif; }
a { color: var(--accent); }
.wrap { max-width: 46rem; margin: 0 auto; padding: 0 max(16px, env(safe-area-inset-left, 0px)) 4rem max(16px, env(safe-area-inset-right, 0px)); }
header.top { border-bottom: 1px solid var(--rule); margin-bottom: 2rem; }
header.top .wrap { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: .5rem 1.5rem; padding-top: 1.25rem; padding-bottom: 1rem; }
.brand { font-size: 1.6rem; letter-spacing: .04em; text-decoration: none; color: var(--fg); }
.brand small { display: block; font-size: .8rem; letter-spacing: .08em; color: var(--muted); text-transform: uppercase; }
nav a { margin-left: 1rem; font-size: .95rem; }
nav a:first-child { margin-left: 0; }
.notice { border-left: 3px solid var(--accent); background: var(--card); padding: .75rem 1rem; margin: 1.5rem 0; font-size: .95rem; }
h1 { font-size: 1.7rem; line-height: 1.3; margin: .5rem 0 1rem; }
h2 { font-size: 1.2rem; margin: 2rem 0 .5rem; }
ol.list { list-style: none; padding: 0; margin: 0; }
ol.list li { border-top: 1px solid var(--rule); padding: 1rem 0; }
.meta { color: var(--muted); font-size: .9rem; }
.id { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: .9rem; }
.abstract { background: var(--card); border: 1px solid var(--rule); padding: 1rem 1.25rem; }
pre { background: var(--card); border: 1px solid var(--rule); padding: 1rem; overflow-x: auto; font-size: .85rem; line-height: 1.5; }
table { border-collapse: collapse; width: 100%; font-size: .95rem; }
td, th { border-top: 1px solid var(--rule); padding: .4rem .5rem .4rem 0; text-align: left; vertical-align: top; }
.flag { display: inline-block; font-size: .8rem; border: 1px solid var(--rule); padding: 0 .4rem; margin-left: .4rem; color: var(--muted); }
.fields { list-style: none; padding: 0; margin: 0 0 1rem; display: flex; flex-wrap: wrap; gap: .5rem; font-size: .95rem; }
.fields a { display: inline-block; border: 1px solid var(--rule); padding: .15rem .7rem; text-decoration: none; }
.fields a[aria-current] { background: var(--accent); border-color: var(--accent); color: var(--bg); }
footer { border-top: 1px solid var(--rule); margin-top: 3rem; padding-top: 1rem; color: var(--muted); font-size: .85rem; }
`;

const STYLE_HASH = "'sha256-" + crypto.createHash('sha256').update(CSS).digest('base64') + "'";

function page({ title, description, rel, canonical, body }) {
  const up = rel ? '../' : './';
  /* The top page names the site for search engines: WebSite microdata, without a script. */
  const home = canonical === '';
  const site = home ? ` itemscope itemtype="https://schema.org/WebSite"><meta itemprop="name" content="${esc(SITE.name)}">` : '>';
  const brand = home ? 'href="./" itemprop="url"' : `href="${up}index.html"`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${STYLE_HASH}; img-src 'self'; base-uri 'none'; form-action 'none'">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(SITE.baseUrl + canonical)}">
<link rel="icon" href="${up}favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(SITE.baseUrl + canonical)}">
<meta property="og:image" content="${esc(SITE.baseUrl)}og.png">
<meta name="twitter:card" content="summary">
<style>${CSS}</style>
</head>
<body>
<header class="top"><div class="wrap"${site}
<a class="brand" ${brand}>${esc(SITE.name)}<small>${esc(SITE.tagline)}</small></a>
<nav><a href="${up}index.html">Listing</a><a href="${up}submit.html">Submit</a><a href="${up}policy.html">Policy</a></nav>
</div></header>
<main class="wrap">
${body}
</main>
<footer><div class="wrap">
<p>${esc(SITE.name)} is a diamond open access overlay preprint server. It charges nothing, to authors or to readers. Acceptance is moderation, not peer review.</p>
<p>Operated by ${esc(SITE.operator.name)}. Text CC BY 4.0, code MIT. <a href="${esc(SITE.repo)}">Source</a>.</p>
</div></footer>
</body>
</html>
`;
}

/* A small Markdown subset: #, ##, paragraphs, ordered and unordered lists. */
function markdown(src) {
  const out = [];
  let para = [];
  let list = null;
  const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
  const flushPara = () => { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } };
  const flushList = () => { if (list) { out.push('<' + list.tag + '>' + list.items.map((i) => '<li>' + inline(i) + '</li>').join('') + '</' + list.tag + '>'); list = null; } };
  for (const line of src.split('\n')) {
    let m;
    if (/^\s*$/.test(line)) { flushPara(); flushList(); continue; }
    if ((m = /^(#{1,2}) (.*)$/.exec(line))) { flushPara(); flushList(); out.push('<h' + m[1].length + '>' + inline(m[2]) + '</h' + m[1].length + '>'); continue; }
    if ((m = /^\d+\. (.*)$/.exec(line))) { flushPara(); if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; } list.items.push(m[1]); continue; }
    if ((m = /^- (.*)$/.exec(line))) { flushPara(); if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; } list.items.push(m[1]); continue; }
    if (list) { list.items[list.items.length - 1] += ' ' + line.trim(); continue; }
    para.push(line.trim());
  }
  flushPara(); flushList();
  return out.join('\n');
}

const authorsText = (p) => p.authors.map((a) => a.name).join(', ');
const latest = (p) => p.versions[p.versions.length - 1];
const repoName = (doi) => SITE.repositories[Object.keys(SITE.repositories).find((pre) => doi.startsWith(pre))];

function bibtex(p) {
  const v = latest(p);
  const key = p.authors[0].name.split(/\s+/).pop().toLowerCase().replace(/[^a-z]/g, '') + v.date.slice(0, 4) + 'sophaxis' + p.id.replace('.', '');
  return `@misc{${key},
  author       = {${p.authors.map((a) => a.name).join(' and ')}},
  title        = {${p.title}},
  year         = {${v.date.slice(0, 4)}},
  howpublished = {${repoName(v.doi)}},
  doi          = {${v.doi}},
  note         = {Preprint, not peer-reviewed. Listed on ${SITE.name} as ${p.id}}
}`;
}

function recordPage(p) {
  const v = latest(p);
  const authors = p.authors.map((a) => esc(a.name)
    + (a.orcid ? ` <a class="id" href="https://orcid.org/${esc(a.orcid)}">ORCID ${esc(a.orcid)}</a>` : '')).join('<br>');
  const versions = p.versions.map((x) => `<tr><td>v${x.version}</td><td>${esc(x.date)}</td><td><a href="https://doi.org/${esc(x.doi)}">${esc(x.doi)}</a></td><td>${esc(repoName(x.doi))}</td></tr>`).join('');
  const notes = (p.notes || []).map((n) => `<li><span class="meta">${esc(n.date)}</span> ${esc(n.text)}</li>`).join('');
  const withdrawn = p.status === 'withdrawn'
    ? `<div class="notice"><b>Withdrawn.</b> ${esc(p.withdrawal_note)} The record stays so that citations do not break.</div>` : '';
  const body = `
<p class="meta"><span class="id">${esc(SITE.name)}:${esc(p.id)}</span> · <a href="../list/${esc(p.category)}.html">${esc(SITE.categories[p.category])}</a>${p.operator_own ? '<span class="flag">operator’s own submission</span>' : ''}</p>
${withdrawn}
<h1>${esc(p.title)}</h1>
<p>${authors}</p>
<h2>Abstract</h2>
<div class="abstract"><p>${esc(p.abstract)}</p></div>
<div class="notice">This is a preprint. It has not been peer-reviewed. Listing on ${esc(SITE.name)} means it passed moderation, not that it is correct.</div>
<h2>Read</h2>
<p><a href="https://doi.org/${esc(v.doi)}">Latest version (v${v.version}) at ${esc(repoName(v.doi))}</a> · licence ${esc(SITE.licenses[p.license])}</p>
<h2>Versions</h2>
<table><tr><th>Version</th><th>Date</th><th>DOI</th><th>Repository</th></tr>${versions}</table>
<h2>Use of language models and other generative models</h2>
<p>${esc(p.llm_disclosure)}</p>
${notes ? `<h2>Notes and corrections</h2><ul>${notes}</ul>` : ''}
<h2>Cite</h2>
<pre>${esc(bibtex(p))}</pre>
<p class="meta">Submission: <a href="${esc(SITE.repo)}/issues/${p.issue}">issue #${p.issue}</a></p>
`;
  return page({
    title: p.title + ' | ' + SITE.name,
    description: p.abstract.slice(0, 200),
    rel: true,
    canonical: 'abs/' + p.id + '.html',
    body,
  });
}

function sortListing(papers) {
  return papers.slice().sort((a, b) => (latest(b).date + b.id).localeCompare(latest(a).date + a.id));
}

function listing(papers, up, empty) {
  if (!papers.length) return `<p class="meta">${empty}</p>`;
  const items = sortListing(papers).map((p) => `<li>
<p class="meta"><span class="id">${esc(p.id)}</span> · ${esc(SITE.categories[p.category])} · ${esc(p.versions[0].date)}${p.status === 'withdrawn' ? '<span class="flag">withdrawn</span>' : ''}</p>
<a href="${up}abs/${esc(p.id)}.html"><b>${esc(p.title)}</b></a>
<p class="meta">${esc(authorsText(p))}</p>
</li>`).join('\n');
  return `<ol class="list">${items}</ol>`;
}

/* The field selector: plain links to one static page per field, no script. */
function fields(papers, current, up) {
  const link = (href, label, n, here) => `<li><a href="${href}"${here ? ' aria-current="page"' : ''}>${esc(label)} (${n})</a></li>`;
  const all = link(up + 'index.html', 'All fields', papers.length, current === '');
  const each = Object.entries(SITE.categories).map(([slug, label]) =>
    link(up + 'list/' + slug + '.html', label, papers.filter((p) => p.category === slug).length, current === slug));
  return `<ul class="fields" aria-label="Fields">${[all].concat(each).join('')}</ul>`;
}

function indexPage(papers) {
  const body = `
<h1>${esc(SITE.tagline)}</h1>
<p>${esc(SITE.name)} lists preprints in philosophy, mathematics, logic and the philosophy of mathematics. Authors deposit their work in an open repository; ${esc(SITE.name)} moderates the submission and gives it a stable record page.</p>
<div class="notice">Acceptance is moderation, not peer review. Work made with language models or other generative models is accepted when the use is disclosed. ${esc(SITE.name)} charges nothing, to authors or to readers.</div>
<h2>Listing</h2>
${fields(papers, '', './')}
${listing(papers, './', 'No preprints are listed yet.')}
`;
  return page({
    title: SITE.name,
    description: SITE.name + ' is a diamond open access overlay preprint server for philosophy and mathematics.',
    rel: false,
    canonical: '',
    body,
  });
}

function fieldPage(papers, slug) {
  const label = SITE.categories[slug];
  const mine = papers.filter((p) => p.category === slug);
  const body = `
<h1>${esc(label)}</h1>
${fields(papers, slug, '../')}
${listing(mine, '../', 'No preprints are listed in this field yet.')}
`;
  return page({
    title: label + ' | ' + SITE.name,
    description: 'Preprints in ' + label + ' listed on ' + SITE.name + '.',
    rel: true,
    canonical: 'list/' + slug + '.html',
    body,
  });
}

function submitPage() {
  const body = `
<h1>Submit a preprint</h1>
<ol>
<li>Deposit your preprint in <a href="https://zenodo.org">Zenodo</a>, <a href="https://figshare.com">figshare</a>, <a href="https://osf.io/preprints/osf">OSF Preprints</a>, <a href="https://arxiv.org">arXiv</a>, <a href="https://www.preprints.org">Preprints.org</a> or <a href="https://www.ssrn.com">SSRN</a> under CC BY 4.0, CC BY-SA 4.0 or CC0 1.0, and note its DOI.</li>
<li>Open a <a href="${esc(SITE.repo)}/issues/new?template=submission.yml">submission issue</a> and fill in the form. You need a GitHub account.</li>
<li>A moderator checks the submission against the <a href="./policy.html">policy</a>. If it passes, a record page is published here.</li>
</ol>
<div class="notice">The submission issue is public. Your GitHub username and everything in the form will be visible to anyone. Do not include personal data you do not want published.</div>
<p>To update a listed preprint with a new version, open a submission issue and give the existing ${esc(SITE.name)} id. To request removal for legal reasons, open a <a href="${esc(SITE.repo)}/issues/new?template=removal.yml">removal issue</a>.</p>
`;
  return page({ title: 'Submit | ' + SITE.name, description: 'How to submit a preprint to ' + SITE.name + '.', rel: false, canonical: 'submit.html', body });
}

function policyPage() {
  const md = fs.readFileSync(path.join(ROOT, 'policy.md'), 'utf8');
  return page({ title: 'Policy | ' + SITE.name, description: 'Scope, moderation, generative models, versions and privacy at ' + SITE.name + '.', rel: false, canonical: 'policy.html', body: markdown(md) });
}

function sitemap(papers) {
  const urls = ['', 'submit.html', 'policy.html']
    .concat(Object.keys(SITE.categories).map((slug) => 'list/' + slug + '.html'))
    .concat(papers.map((p) => 'abs/' + p.id + '.html'));
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + urls.map((u) => '  <url><loc>' + SITE.baseUrl + u + '</loc></url>').join('\n') + '\n</urlset>\n';
}

/* ------------------------------------------------------------ write */

function build(out, paperDir) {
  const { papers, problems } = loadPapers(paperDir);
  if (problems.length) return { problems };
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, 'abs'), { recursive: true });
  fs.mkdirSync(path.join(out, 'list'), { recursive: true });
  const files = {
    'index.html': indexPage(papers),
    'submit.html': submitPage(),
    'policy.html': policyPage(),
    'sitemap.xml': sitemap(papers),
    'robots.txt': 'User-agent: *\nAllow: /\nSitemap: ' + SITE.baseUrl + 'sitemap.xml\n',
  };
  Object.keys(SITE.categories).forEach((slug) => { files['list/' + slug + '.html'] = fieldPage(papers, slug); });
  papers.forEach((p) => { files['abs/' + p.id + '.html'] = recordPage(p); });
  /* The logo is drawn by hand from rectangles only, and copied as it is. */
  for (const f of ['favicon.svg', 'og.png']) files[f] = fs.readFileSync(path.join(__dirname, 'assets', f));
  for (const [f, s] of Object.entries(files)) fs.writeFileSync(path.join(out, f), s);
  return { problems: [], files: Object.keys(files), papers };
}

module.exports = { build, validate, orcidOk, loadPapers, STYLE_HASH };

if (require.main === module) {
  const r = build(OUT, PAPER_DIR);
  if (r.problems.length) {
    console.error(r.problems.join('\n'));
    process.exit(1);
  }
  console.log('wrote ' + r.files.length + ' files to ' + path.relative(process.cwd(), OUT) + ' (' + r.papers.length + ' preprints)');
}
