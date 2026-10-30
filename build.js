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

/* The accepted repository a DOI belongs to, or undefined. DOIs are not case-sensitive. */
const repoPrefix = (doi) => Object.keys(SITE.repositories).find((pre) => String(doi).toLowerCase().startsWith(pre.toLowerCase()));

/* Returns a list of problems. An empty list means the record is valid. */
const REMOVED_KEEP = ['id', 'status', 'removal_date', 'removal_reason', 'issue'];
const REMOVAL_REASONS = {
  'copyright': 'Removed because of a copyright claim.',
  'personal-data': 'Removed because it exposed personal data.',
  'author-consent': 'Removed because an author had not agreed to the listing.',
  'legal': 'Removed for another legal reason.',
  'under-review': 'The abstract and the PDF copy are offline while a removal request is reviewed.',
};

function validate(p, file) {
  const e = [];
  /* A removed record keeps only its id, the date and the kind of reason (Takedown Policy). */
  if (p.status === 'removed') {
    if (!p.id || !ID.test(p.id)) e.push(file + ': id must look like 2026.0001');
    if (p.id && path.basename(file, '.json') !== p.id) e.push(file + ': file name must be the id');
    if (!DATE.test(p.removal_date || '')) e.push(file + ': a removed record needs removal_date');
    if (!REMOVAL_REASONS[p.removal_reason]) e.push(file + ': removal_reason must be one of ' + Object.keys(REMOVAL_REASONS).join(', '));
    if (!Number.isInteger(p.issue) || p.issue < 1) e.push(file + ': issue must be the submission issue number');
    const extra = Object.keys(p).filter((k) => !REMOVED_KEEP.includes(k));
    if (extra.length) e.push(file + ': a removed record keeps nothing else: ' + extra.join(', '));
    return e;
  }
  const need = (k) => { if (p[k] === undefined || p[k] === '') e.push(file + ': ' + k + ' is missing'); };
  ['id', 'title', 'authors', 'abstract', 'category', 'license', 'versions', 'llm_disclosure', 'issue', 'status'].forEach(need);
  if (p.id && !ID.test(p.id)) e.push(file + ': id must look like 2026.0001');
  if (p.id && path.basename(file, '.json') !== p.id) e.push(file + ': file name must be the id');
  if (p.category && !SITE.categories[p.category]) e.push(file + ': unknown category ' + p.category);
  if (p.license && !SITE.licenses[p.license]) e.push(file + ': licence not accepted: ' + p.license);
  if (p.categories !== undefined) {
    if (!Array.isArray(p.categories)) e.push(file + ': categories must be a list');
    else {
      p.categories.forEach((c) => { if (!SITE.categories[c]) e.push(file + ': unknown category ' + c); });
      if (p.categories.includes(p.category) || new Set(p.categories).size !== p.categories.length) e.push(file + ': other categories must differ from the main one and from each other');
    }
  }
  if (p.keywords !== undefined && (!Array.isArray(p.keywords) || p.keywords.length > 12 || p.keywords.some((k) => typeof k !== 'string' || !k.trim() || k.length > 80))) {
    e.push(file + ': keywords must be a list of at most 12 short phrases');
  }
  if (!Array.isArray(p.authors) || p.authors.length === 0) e.push(file + ': authors must be a non-empty list');
  (p.authors || []).forEach((a, i) => {
    if (!a.name) e.push(file + ': author ' + (i + 1) + ' has no name');
    if ((a.given !== undefined && typeof a.given !== 'string') || (a.family !== undefined && (typeof a.family !== 'string' || !a.family))) e.push(file + ': author ' + (i + 1) + ' has a malformed given or family name');
    if (a.orcid && !orcidOk(a.orcid)) e.push(file + ': author ' + (i + 1) + ' has an invalid ORCID');
    if (/\b(claude|chatgpt|gpt-\d|gemini|llama|copilot|midjourney|dall-e|stable diffusion|firefly|language model|generative model)\b/i.test(a.name || '')) {
      e.push(file + ': a language model or other generative model cannot be an author');
    }
  });
  if (!Array.isArray(p.versions) || p.versions.length === 0) e.push(file + ': versions must be a non-empty list');
  (p.versions || []).forEach((v, i) => {
    if (v.version !== i + 1) e.push(file + ': versions must be numbered 1, 2, 3 …');
    if (!DOI.test(v.doi || '')) e.push(file + ': version ' + (i + 1) + ' has an invalid DOI');
    if (!repoPrefix(v.doi || '')) {
      e.push(file + ': version ' + (i + 1) + ' is not in an accepted repository');
    }
    if (!DATE.test(v.date || '')) e.push(file + ': version ' + (i + 1) + ' has an invalid date');
    if (i > 0 && v.date < p.versions[i - 1].date) e.push(file + ': versions must be in date order');
  });
  if (typeof p.llm_disclosure === 'string' && p.llm_disclosure.trim().length < 20) {
    e.push(file + ': the language-model statement is too short');
  }
  if (!['listed', 'withdrawn'].includes(p.status)) e.push(file + ': status must be listed, withdrawn or removed');
  if (p.published_doi !== undefined && !DOI.test(p.published_doi)) e.push(file + ': published_doi is not a DOI');
  if (p.status === 'withdrawn' && !p.withdrawal_note) e.push(file + ': a withdrawn record needs a note');
  (p.notes || []).forEach((n, i) => {
    if (!DATE.test(n.date || '') || !n.text) e.push(file + ': note ' + (i + 1) + ' needs a date and text');
  });
  if (!Number.isInteger(p.issue) || p.issue < 1) e.push(file + ': issue must be the submission issue number');
  (p.pdfs || []).forEach((x, i) => {
    const where = file + ': pdf ' + (i + 1);
    if (!(p.versions || []).some((v) => v.version === x.version)) e.push(where + ' is for a version the record does not have');
    if (x.file !== p.id + 'v' + x.version + '.pdf') e.push(where + ' must be named <id>v<version>.pdf');
    if (!/^[0-9a-f]{64}$/.test(x.sha256 || '')) e.push(where + ' needs a sha256');
    if (!/^https:\/\//.test(x.source || '')) e.push(where + ' needs the https address it was copied from');
  });
  return e;
}

/* The PDF copies sit beside the records: data/papers → data/pdf. */
const pdfDir = (paperDir) => path.join(paperDir, '..', 'pdf');

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
    (p.pdfs || []).forEach((x) => {
      const at = path.join(pdfDir(dir), String(x.file));
      if (!fs.existsSync(at)) problems.push(f + ': the copy ' + x.file + ' is missing');
      else if (crypto.createHash('sha256').update(fs.readFileSync(at)).digest('hex') !== x.sha256) problems.push(f + ': the copy ' + x.file + ' does not match its sha256');
    });
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
.cite { padding-left: 1.5rem; text-indent: -1.5rem; overflow-wrap: anywhere; }
.search { display: flex; flex-wrap: wrap; gap: .5rem; align-items: end; margin-bottom: 1rem; }
.search label { display: flex; flex-direction: column; font-size: .85rem; color: var(--muted); gap: .2rem; }
.search input, .search select, .search button { font: inherit; font-size: 1rem; padding: .3rem .5rem; border: 1px solid var(--rule); background: var(--card); color: var(--fg); }
.search input[type=search] { width: min(24rem, 80vw); }
.search button { background: var(--accent); color: var(--bg); border-color: var(--accent); cursor: pointer; }
footer { border-top: 1px solid var(--rule); margin-top: 3rem; padding-top: 1rem; color: var(--muted); font-size: .85rem; }
`;

const STYLE_HASH = "'sha256-" + crypto.createHash('sha256').update(CSS).digest('base64') + "'";

/* Every page forbids scripts. The search page alone may run search.js from this site and read papers.json. */
const CSP = `default-src 'none'; style-src ${STYLE_HASH}; img-src 'self'; base-uri 'none'; form-action 'none'`;
const SEARCH_CSP = `default-src 'none'; style-src ${STYLE_HASH}; img-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'`;

function page({ title, description, rel, canonical, body, head, csp }) {
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
<meta http-equiv="Content-Security-Policy" content="${csp || CSP}">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(SITE.baseUrl + canonical)}">
<link rel="icon" href="${up}favicon.svg" type="image/svg+xml">
<link rel="alternate" type="application/atom+xml" title="${esc(SITE.name)}: new preprints" href="${up}feed.xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(SITE.baseUrl + canonical)}">
<meta property="og:image" content="${esc(SITE.baseUrl)}og.png">
${head || ''}<meta name="twitter:card" content="summary">
<style>${CSS}</style>
</head>
<body>
<header class="top"><div class="wrap"${site}
<a class="brand" ${brand}>${esc(SITE.name)}<small>${esc(SITE.tagline)}</small></a>
<nav><a href="${up}index.html">Listing</a><a href="${up}search.html">Search</a><a href="${up}submit.html">Submit</a><a href="${up}policy.html">Policies</a></nav>
</div></header>
<main class="wrap">
${body}
</main>
<footer><div class="wrap">
<p>${esc(SITE.name)} is an overlay preprint server. It charges nothing, to authors or to readers. Acceptance is moderation, not peer review, and the quality of listed work is not guaranteed.</p>
<p>Operated by ${esc(SITE.operator.name)}. Text CC BY 4.0, code MIT. <a href="${esc(SITE.repo)}">Source</a>.</p>
<p><a href="${up}policies/terms.html">Terms of Use</a> · <a href="${up}policies/privacy.html">Privacy</a> · <a href="${up}policies/takedown.html">Takedown</a></p>
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
  const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(((?:\.\.?\/|https:\/\/)[^)\s]+)\)/g, '<a href="$2">$1</a>');
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
const cats = (p) => [p.category].concat(p.categories || []);
/* Family and given names: from the DOI metadata when the record has them, otherwise the last word is the family name. */
const familyOf = (a) => a.family || a.name.trim().split(/\s+/).pop();
const givenOf = (a) => (a.family ? a.given || '' : a.name.trim().split(/\s+/).slice(0, -1).join(' '));
const initials = (g) => g.split(/[\s-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + '.').join(' ');
/* Both styles put a comma before the last "&" or "and", even with two authors. */
const andList = (xs, conj) => (xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ', ' + conj + ' ' + xs[xs.length - 1]);
const latest = (p) => p.versions[p.versions.length - 1];
const repoName = (doi) => SITE.repositories[repoPrefix(doi)];

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

/* APA 7, for a preprint. */
function apa(p) {
  const v = latest(p);
  const names = p.authors.map((a) => (givenOf(a) ? familyOf(a) + ', ' + initials(givenOf(a)) : familyOf(a)));
  return `${andList(names, '&')} (${v.date.slice(0, 4)}). ${p.title} [Preprint]. ${repoName(v.doi)}. https://doi.org/${v.doi}`;
}

/* Chicago, author-date. */
function chicago(p) {
  const v = latest(p);
  const names = p.authors.map((a, i) => (!givenOf(a) ? familyOf(a) : i === 0 ? familyOf(a) + ', ' + givenOf(a) : givenOf(a) + ' ' + familyOf(a)));
  return `${andList(names, 'and')}. ${v.date.slice(0, 4)}. “${p.title}.” Preprint, ${repoName(v.doi)}. https://doi.org/${v.doi}.`;
}

const LICENCE_URL = {
  'CC-BY-4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'CC-BY-SA-4.0': 'https://creativecommons.org/licenses/by-sa/4.0/',
  'CC0-1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
};

/* Highwire Press tags, which Google Scholar reads from an abstract page. */
function scholarTags(p) {
  const v = latest(p);
  const copy = (p.pdfs || []).slice(-1)[0];
  const tag = (name, content) => `<meta name="${name}" content="${esc(content)}">`;
  return [
    tag('citation_title', p.title),
    ...p.authors.map((a) => tag('citation_author', a.name)),
    tag('citation_publication_date', p.versions[0].date.replace(/-/g, '/')),
    tag('citation_online_date', v.date.replace(/-/g, '/')),
    tag('citation_doi', v.doi),
    tag('citation_abstract_html_url', SITE.baseUrl + 'abs/' + p.id + '.html'),
    ...((p.keywords || []).length ? [tag('citation_keywords', p.keywords.join('; '))] : []),
    ...(copy ? [tag('citation_pdf_url', SITE.baseUrl + 'pdf/' + copy.file)] : []),
  ].join('\n') + '\n';
}

function removedPage(p) {
  const body = `
<p class="meta"><span class="id">${esc(SITE.name)}:${esc(p.id)}</span></p>
<h1>Record removed</h1>
<div class="notice">${esc(REMOVAL_REASONS[p.removal_reason])} Date: ${esc(p.removal_date)}.</div>
<p>This address is kept so that citations lead here. The title, the authors, the abstract and the PDF copy are no longer shown. See the <a href="../policies/takedown.html">Takedown Policy</a>.</p>
`;
  return page({ title: SITE.name + ':' + p.id + ' | ' + SITE.name, description: 'A record removed under the Takedown Policy.', rel: true, canonical: 'abs/' + p.id + '.html', body, head: '<meta name="robots" content="noindex">\n' });
}

function recordPage(p) {
  if (p.status === 'removed') return removedPage(p);
  const v = latest(p);
  const authors = p.authors.map((a) => (a.orcid ? `<a href="../author/${esc(a.orcid)}.html">${esc(a.name)}</a>` : esc(a.name))
    + (a.orcid ? ` <a class="id" href="https://orcid.org/${esc(a.orcid)}">ORCID ${esc(a.orcid)}</a>` : '')).join('<br>');
  const keywords = (p.keywords || []).length ? `<p class="meta">Keywords: ${p.keywords.map(esc).join('; ')}</p>` : '';
  const versions = p.versions.map((x) => `<tr><td>v${x.version}</td><td>${esc(x.date)}</td><td><a href="https://doi.org/${esc(x.doi)}">${esc(x.doi)}</a></td><td>${esc(repoName(x.doi))}</td></tr>`).join('');
  const notes = (p.notes || []).map((n) => `<li><span class="meta">${esc(n.date)}</span> ${esc(n.text)}</li>`).join('');
  const pdfs = p.pdfs || [];
  const copies = pdfs.length ? `<p>PDF on ${esc(SITE.name)}: ${pdfs.map((x) => `<a href="../pdf/${esc(x.file)}">v${x.version}</a>`).join(' · ')}</p>
<p class="meta">Unmodified copies of the files the authors deposited at ${esc(repoName(v.doi))}, kept so that search engines can index the full text. They are shared under ${esc(SITE.licenses[p.license])}, by ${esc(authorsText(p))}. Cite the DOI.</p>` : '';
  const withdrawn = p.status === 'withdrawn'
    ? `<div class="notice"><b>Withdrawn.</b> ${esc(p.withdrawal_note)} The record stays so that citations do not break.</div>` : '';
  const body = `
<p class="meta"><span class="id">${esc(SITE.name)}:${esc(p.id)}</span> · ${cats(p).map((c) => `<a href="../list/${esc(c)}.html">${esc(SITE.categories[c])}</a>`).join(' · ')}${p.operator_own ? '<span class="flag">operator’s own submission</span>' : ''}</p>
${withdrawn}
<h1>${esc(p.title)}</h1>
<p>${authors}</p>
<h2>Abstract</h2>
<div class="abstract"><p>${esc(p.abstract)}</p></div>
${keywords}
<div class="notice">This is a preprint. It has not been peer-reviewed. Listing on ${esc(SITE.name)} means it passed moderation, not that it is correct. ${esc(SITE.name)} does not guarantee its quality.</div>
<h2>Read</h2>
<p><a href="https://doi.org/${esc(v.doi)}">Latest version (v${v.version}) at ${esc(repoName(v.doi))}</a> · licence <a href="${LICENCE_URL[p.license]}">${esc(SITE.licenses[p.license])}</a></p>
${copies}
${p.published_doi ? `<p>Published version: <a href="https://doi.org/${esc(p.published_doi)}">${esc(p.published_doi)}</a> (not on ${esc(SITE.name)})</p>` : ''}
<h2>Versions</h2>
<table><tr><th>Version</th><th>Date</th><th>DOI</th><th>Repository</th></tr>${versions}</table>
<h2>Use of language models and other generative models</h2>
<p>${esc(p.llm_disclosure)}</p>
${notes ? `<h2>Notes and corrections</h2><ul>${notes}</ul>` : ''}
<h2>Cite</h2>
<p class="meta">APA</p>
<p class="cite">${esc(apa(p))}</p>
<p class="meta">Chicago (author-date)</p>
<p class="cite">${esc(chicago(p))}</p>
<p class="meta">BibTeX</p>
<pre>${esc(bibtex(p))}</pre>
<p class="meta">Submission: <a href="${esc(SITE.repo)}/issues/${p.issue}">issue #${p.issue}</a></p>
`;
  return page({
    title: p.title + ' | ' + SITE.name,
    description: p.abstract.slice(0, 200),
    rel: true,
    canonical: 'abs/' + p.id + '.html',
    body,
    head: scholarTags(p),
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
    link(up + 'list/' + slug + '.html', label, papers.filter((p) => cats(p).includes(slug)).length, current === slug));
  return `<ul class="fields" aria-label="Fields">${[all].concat(each).join('')}</ul>`;
}

function indexPage(papers) {
  const body = `
<h1>${esc(SITE.tagline)}</h1>
<p>${esc(SITE.name)} lists preprints in philosophy, mathematics, logic, the philosophy of mathematics and the philosophy of science. Authors deposit their work in an open repository; ${esc(SITE.name)} moderates the submission and gives it a stable record page.</p>
<div class="notice">Acceptance is moderation, not peer review. The quality of listed work is not guaranteed. Work made with language models or other generative models is accepted when the use is disclosed. ${esc(SITE.name)} charges nothing, to authors or to readers.</div>
<h2>Listing</h2>
${fields(papers, '', './')}
${listing(papers, './', 'No preprints are listed yet.')}
`;
  return page({
    title: SITE.name,
    description: SITE.name + ' is an overlay preprint server for philosophy and mathematics. It charges nothing, to authors or to readers.',
    rel: false,
    canonical: '',
    body,
  });
}

function fieldPage(papers, slug) {
  const label = SITE.categories[slug];
  const mine = papers.filter((p) => cats(p).includes(slug));
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
<li>Deposit your preprint in <a href="https://zenodo.org">Zenodo</a>, <a href="https://figshare.com">figshare</a>, <a href="https://osf.io/preprints/osf">OSF Preprints</a>, <a href="https://arxiv.org">arXiv</a>, <a href="https://www.preprints.org">Preprints.org</a>, <a href="https://www.ssrn.com">SSRN</a> or <a href="https://www.researchsquare.com">Research Square</a> under CC BY 4.0, CC BY-SA 4.0 or CC0 1.0, and note its DOI.</li>
<li>Add <code>https://github.com/&lt;your username&gt;</code> under “Websites &amp; social links” in your <a href="https://orcid.org">ORCID</a> record. This is how ${esc(SITE.name)} confirms that you are an author.</li>
<li>Open a <a href="${esc(SITE.repo)}/issues/new?template=submission.yml">submission issue</a> and give the DOI, your ORCID iD, the category and the statement on generative models. You need a GitHub account. The title, the authors, the abstract and the licence are taken from the DOI metadata.</li>
<li>An automatic check posts its result in the issue. A moderator checks the submission under the <a href="./policies/moderation.html">Moderation Policy</a>. If it passes, a record page is published here.</li>
</ol>
<p>In the form, you confirm that every author agrees to the listing and that the authors may share this version under its licence. See the <a href="./policies/submission.html">Submission Policy</a> and the <a href="./policies/copyright.html">Copyright Policy</a>.</p>
<div class="notice">The submission issue is public. Your GitHub username and everything in the form will be visible to anyone. Do not include personal data you do not want published.</div>
<p>To update a listed preprint with a new version, open a submission issue and give the existing ${esc(SITE.name)} id. To request removal for legal reasons, follow the <a href="./policies/takedown.html">Takedown Policy</a> and open a <a href="${esc(SITE.repo)}/issues/new?template=removal.yml">removal issue</a>.</p>
`;
  return page({ title: 'Submit | ' + SITE.name, description: 'How to submit a preprint to ' + SITE.name + '.', rel: false, canonical: 'submit.html', body });
}

/* The policies, in the order a reader meets them. Each is policies/<slug>.md. */
const POLICIES = [
  ['terms', 'The rules for everyone who reads or submits.'],
  ['submission', 'Who can submit what, and what the submitter confirms.'],
  ['moderation', 'What moderation checks, and what it does not.'],
  ['copyright', 'Authors keep their copyright; what Sophaxis copies and why.'],
  ['licences', 'The accepted licences, and the licences of this site.'],
  ['privacy', 'What the site and the checks read, and what becomes public.'],
  ['takedown', 'How to ask for removal, and what happens then.'],
];
const policySource = (slug) => fs.readFileSync(path.join(ROOT, 'policies', slug + '.md'), 'utf8');
const policyTitle = (slug) => policySource(slug).split('\n')[0].replace(/^# /, '');

function policyPage() {
  const md = fs.readFileSync(path.join(ROOT, 'policy.md'), 'utf8');
  const list = `<h2>The policies</h2>
<ul>${POLICIES.map(([slug, what]) => `<li><a href="./policies/${slug}.html">${esc(policyTitle(slug))}</a>: ${esc(what)}</li>`).join('')}</ul>`;
  const html = markdown(md).replace('<h2>What Sophaxis is not</h2>', list + '\n<h2>What Sophaxis is not</h2>');
  return page({ title: 'Policies | ' + SITE.name, description: 'Terms, submission, moderation, copyright, licences, privacy and takedown at ' + SITE.name + '.', rel: false, canonical: 'policy.html', body: html });
}

function onePolicyPage(slug) {
  return page({ title: policyTitle(slug) + ' | ' + SITE.name, description: policyTitle(slug) + ' of ' + SITE.name + '.', rel: true, canonical: 'policies/' + slug + '.html',
    body: markdown(policySource(slug)) + '\n<p class="meta"><a href="../policy.html">All policies</a></p>' });
}

/* One page per ORCID iD. Authors without one get no page: a name alone can belong to several people. */
function authorIds(papers) {
  return [...new Set(papers.flatMap((p) => p.authors.filter((a) => a.orcid).map((a) => a.orcid)))].sort();
}

function authorPage(papers, orcid) {
  const mine = sortListing(papers.filter((p) => p.authors.some((a) => a.orcid === orcid)));
  const name = mine[0].authors.find((a) => a.orcid === orcid).name;
  const body = `
<h1>${esc(name)}</h1>
<p><a class="id" href="https://orcid.org/${esc(orcid)}">ORCID ${esc(orcid)}</a></p>
<p class="meta">Preprints listed on ${esc(SITE.name)} with this ORCID iD among the authors.</p>
${listing(mine, '../', '')}
`;
  return page({ title: name + ' | ' + SITE.name, description: 'Preprints by ' + name + ' listed on ' + SITE.name + '.', rel: true, canonical: 'author/' + orcid + '.html', body });
}

/* Atom feed of the listing, newest first. */
function feed(papers) {
  const sorted = sortListing(papers);
  const stamp = (d) => d + 'T00:00:00Z';
  const updated = sorted.length ? stamp(latest(sorted[0]).date) : stamp(SITE.since);
  const entries = sorted.map((p) => {
    const url = SITE.baseUrl + 'abs/' + p.id + '.html';
    return `  <entry>
    <id>${url}</id>
    <title>${esc(p.title)}</title>
    <link href="${url}"/>
    <published>${stamp(p.versions[0].date)}</published>
    <updated>${stamp(latest(p).date)}</updated>
${p.authors.map((a) => `    <author><name>${esc(a.name)}</name>${a.orcid ? `<uri>https://orcid.org/${esc(a.orcid)}</uri>` : ''}</author>`).join('\n')}
${cats(p).map((c) => `    <category term="${esc(c)}" label="${esc(SITE.categories[c])}"/>`).join('\n')}
    <summary>${esc(p.abstract)}</summary>
  </entry>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${esc(SITE.name)}: new preprints</title>
  <subtitle>${esc(SITE.tagline)}. Moderation, not peer review.</subtitle>
  <id>${SITE.baseUrl}</id>
  <link rel="self" href="${SITE.baseUrl}feed.xml"/>
  <link href="${SITE.baseUrl}"/>
  <updated>${updated}</updated>
${entries}
</feed>
`;
}

/* The public records as JSON, for the search page and for anyone who wants to reuse them. */
function papersJson(papers) {
  return JSON.stringify(sortListing(papers).map((p) => ({
    id: p.id,
    url: SITE.baseUrl + 'abs/' + p.id + '.html',
    title: p.title,
    authors: p.authors.map((a) => (a.orcid ? { name: a.name, orcid: a.orcid } : { name: a.name })),
    abstract: p.abstract,
    keywords: p.keywords || [],
    categories: cats(p),
    license: p.license,
    versions: p.versions.map((v) => ({ version: v.version, doi: v.doi, date: v.date })),
    pdfs: (p.pdfs || []).map((x) => ({ version: x.version, url: SITE.baseUrl + 'pdf/' + x.file })),
    ...(p.published_doi ? { published_doi: p.published_doi } : {}),
    status: p.status,
    llm_disclosure: p.llm_disclosure,
  })), null, 2) + '\n';
}

function searchPage() {
  const options = Object.entries(SITE.categories).map(([slug, label]) => `<option value="${esc(slug)}">${esc(label)}</option>`).join('');
  const body = `
<h1>Search</h1>
<form class="search" id="search" action="./search.html" method="get" role="search">
<label>Words <input type="search" name="q" autocomplete="off" placeholder="title, author, abstract, keyword, DOI"></label>
<label>Field <select name="field"><option value="">All fields</option>${options}</select></label>
<label>Year <input type="text" name="year" inputmode="numeric" pattern="\\d{4}" size="4" placeholder="2026"></label>
<button type="submit">Search</button>
</form>
<p class="meta" id="nojs">Search runs in your browser, with one script from this site. Without it, use the listing, the field pages or the <a href="./papers.json">list of records</a>.</p>
<p class="meta" id="status" aria-live="polite"></p>
<ol class="list" id="results"></ol>
<script src="./search.js" defer></script>
`;
  return page({ title: 'Search | ' + SITE.name, description: 'Search the preprints listed on ' + SITE.name + '.', rel: false, canonical: 'search.html', body, csp: SEARCH_CSP });
}

function sitemap(papers) {
  const urls = ['', 'submit.html', 'policy.html']
    .concat(['search.html'])
    .concat(POLICIES.map(([slug]) => 'policies/' + slug + '.html'))
    .concat(Object.keys(SITE.categories).map((slug) => 'list/' + slug + '.html'))
    .concat(authorIds(papers).map((o) => 'author/' + o + '.html'))
    .concat(papers.map((p) => 'abs/' + p.id + '.html'))
    .concat(papers.flatMap((p) => (p.pdfs || []).map((x) => 'pdf/' + x.file)));
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + urls.map((u) => '  <url><loc>' + SITE.baseUrl + u + '</loc></url>').join('\n') + '\n</urlset>\n';
}

/* ------------------------------------------------------------ write */

function build(out, paperDir) {
  const { papers: all, problems } = loadPapers(paperDir);
  if (problems.length) return { problems };
  /* Removed records keep only their notice page; they are left out of every list, feed and search. */
  const papers = all.filter((p) => p.status !== 'removed');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, 'abs'), { recursive: true });
  fs.mkdirSync(path.join(out, 'list'), { recursive: true });
  fs.mkdirSync(path.join(out, 'pdf'), { recursive: true });
  fs.mkdirSync(path.join(out, 'author'), { recursive: true });
  fs.mkdirSync(path.join(out, 'policies'), { recursive: true });
  const files = {
    'index.html': indexPage(papers),
    'submit.html': submitPage(),
    'policy.html': policyPage(),
    'search.html': searchPage(),
    'feed.xml': feed(papers),
    'papers.json': papersJson(papers),
    'sitemap.xml': sitemap(papers),
    'robots.txt': 'User-agent: *\nAllow: /\nSitemap: ' + SITE.baseUrl + 'sitemap.xml\n',
  };
  Object.keys(SITE.categories).forEach((slug) => { files['list/' + slug + '.html'] = fieldPage(papers, slug); });
  all.forEach((p) => { files['abs/' + p.id + '.html'] = recordPage(p); });
  POLICIES.forEach(([slug]) => { files['policies/' + slug + '.html'] = onePolicyPage(slug); });
  authorIds(papers).forEach((o) => { files['author/' + o + '.html'] = authorPage(papers, o); });
  /* The PDF copies are copied byte for byte; loadPapers has checked their sha256. */
  papers.forEach((p) => (p.pdfs || []).forEach((x) => { files['pdf/' + x.file] = fs.readFileSync(path.join(pdfDir(paperDir), x.file)); }));
  /* The logo is drawn by hand from rectangles only, and copied as it is. */
  for (const f of ['favicon.svg', 'og.png']) files[f] = fs.readFileSync(path.join(__dirname, 'assets', f));
  /* The one script of the site, used only by search.html. */
  files['search.js'] = fs.readFileSync(path.join(__dirname, 'assets', 'search.js'));
  for (const [f, s] of Object.entries(files)) fs.writeFileSync(path.join(out, f), s);
  return { problems: [], files: Object.keys(files), papers };
}

module.exports = { build, validate, orcidOk, repoPrefix, loadPapers, STYLE_HASH };

if (require.main === module) {
  const r = build(OUT, PAPER_DIR);
  if (r.problems.length) {
    console.error(r.problems.join('\n'));
    process.exit(1);
  }
  console.log('wrote ' + r.files.length + ' files to ' + path.relative(process.cwd(), OUT) + ' (' + r.papers.length + ' preprints)');
}
