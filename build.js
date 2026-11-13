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

/* Headers that a <meta> element cannot give. frame-ancestors keeps the pages out of frames on other sites, which a
 * Content-Security-Policy in <meta> cannot do; the rest of the policy stays in each page. A second policy only narrows
 * the first, so this one names frame-ancestors alone. No referrer leaves the site, and no browser feature is asked for. */
const SECURITY_HEADERS = [{
  source: '/(.*)',
  headers: [
    { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'no-referrer' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
  ],
}];
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
/* A removed record keeps its id, the fact and the day, and no reason (Takedown Policy).
 * While a removal request is reviewed, it also keeps the reason "under-review" and its submission issue, so that it can be put back. */
/* The statements of the Submission Policy, with the heading each has on the record page. */
const STATEMENT_KEYS = [['funding', 'Funding'], ['competing_interests', 'Competing interests'], ['ethics', 'Human participants and research ethics'], ['data', 'Data and code']];
const REMOVED_KEEP = ['id', 'status', 'removal_date'];
const HELD_KEEP = REMOVED_KEEP.concat(['removal_reason', 'issue']);
const UNDER_REVIEW = 'The abstract and the PDF copy are offline while a removal request is reviewed.';

/* What a published version can be, by the words the site shows. tools/published.js maps the Crossref and DataCite types to these. */
const PUBLISHED_KINDS = ['journal article', 'conference paper', 'book chapter', 'book'];
const PUBLISHED_DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;

function validate(p, file) {
  const e = [];
  if (p.status === 'removed') {
    if (!p.id || !ID.test(p.id)) e.push(file + ': id must look like 2026.0001');
    if (p.id && path.basename(file, '.json') !== p.id) e.push(file + ': file name must be the id');
    if (!DATE.test(p.removal_date || '')) e.push(file + ': a removed record needs removal_date');
    const held = 'removal_reason' in p;
    if (held && p.removal_reason !== 'under-review') e.push(file + ': a removed record keeps no reason; removal_reason can only be "under-review", while a request is reviewed');
    if (held && (!Number.isInteger(p.issue) || p.issue < 1)) e.push(file + ': a record under review keeps its submission issue number');
    const extra = Object.keys(p).filter((k) => !(held ? HELD_KEEP : REMOVED_KEEP).includes(k));
    if (extra.length) e.push(file + ': a removed record keeps nothing else: ' + extra.join(', '));
    return e;
  }
  const need = (k) => { if (p[k] === undefined || p[k] === '') e.push(file + ': ' + k + ' is missing'); };
  ['id', 'title', 'authors', 'abstract', 'category', 'license', 'versions', 'llm_disclosure', 'issue', 'listed', 'status'].forEach(need);
  /* The day the record was added, and the day it last changed on Sophaxis. OAI-PMH harvesters ask for what changed
   * since their last visit; a record listed long after its version was deposited would be missed by the version date. */
  if (p.listed !== undefined && !DATE.test(p.listed)) e.push(file + ': listed must be a date (YYYY-MM-DD)');
  if (DATE.test(p.listed || '') && Array.isArray(p.versions) && p.versions[0] && DATE.test(p.versions[0].date || '') && p.listed < p.versions[0].date) {
    e.push(file + ': listed is earlier than the first version');
  }
  /* The language of the work, as ISO 639-3 (eng, jpn, …), which OpenAIRE asks for in dc:language. */
  if (p.language !== undefined && !/^[a-z]{3}$/.test(p.language)) e.push(file + ': language must be an ISO 639-3 code, such as eng');
  /* Conflicts of interest: from SITE.ownWaitFrom, a submission by the operator is listed no sooner than SITE.ownWaitDays days after its issue was opened. */
  if (p.operator_own === true && DATE.test(p.listed || '') && p.listed >= SITE.ownWaitFrom) {
    if (!DATE.test(p.submitted || '')) e.push(file + ': the operator’s own record keeps the day its submission issue was opened (submitted)');
    else if ((Date.parse(p.listed) - Date.parse(p.submitted)) / 86400000 < SITE.ownWaitDays) e.push(file + ': the operator’s own record is listed ' + SITE.ownWaitDays + ' days after its submission issue was opened at the earliest');
  }
  if (p.updated !== undefined && (!DATE.test(p.updated) || (DATE.test(p.listed || '') && p.updated < p.listed))) e.push(file + ': updated must be a date (YYYY-MM-DD), not earlier than listed');
  if (p.id && !ID.test(p.id)) e.push(file + ': id must look like 2026.0001');
  if (p.id && path.basename(file, '.json') !== p.id) e.push(file + ': file name must be the id');
  if (p.category && !SITE.categories[p.category]) e.push(file + ': unknown category ' + p.category);
  /* archive is absent (every author consented to the saves to the Internet Archive) or false (not every author did). */
  if ('archive' in p && p.archive !== false) e.push(file + ': archive is either false or absent');
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
  /* The statements of the Submission Policy (funding, competing interests, human participants and research ethics, data and code),
   * each a short text when present. The intake asks the first three from SITE.statementsFrom. */
  STATEMENT_KEYS.forEach(([k]) => {
    if (p[k] !== undefined && (typeof p[k] !== 'string' || p[k].trim().length < 4 || p[k].length > 2000)) e.push(file + ': ' + k + ' must be a statement of 4 to 2000 characters');
  });
  /* The extent of use, one of the levels in site.json. Required for records listed from SITE.llmExtentFrom. */
  if (p.lay_summary !== undefined && !(typeof p.lay_summary === 'string' && p.lay_summary.trim() && p.lay_summary.length <= 600)) e.push(file + ': lay_summary must be a text of at most 600 characters');
  if (p.subfield !== undefined && !Object.prototype.hasOwnProperty.call((SITE.subfields || {})[p.category] || {}, p.subfield)) e.push(file + ': subfield must be one of site.json subfields of its category');
  if (p.abstract_other !== undefined && !(p.abstract_other && /^[a-z]{2,3}$/.test(p.abstract_other.lang || '') && typeof p.abstract_other.text === 'string' && p.abstract_other.text.trim()
    && Object.keys(p.abstract_other).sort().join() === 'lang,text')) e.push(file + ': abstract_other must be { lang: a two- or three-letter code, text }');
  if (p.llm_extent !== undefined && !Object.prototype.hasOwnProperty.call(SITE.llmExtents, p.llm_extent)) e.push(file + ': llm_extent must be one of ' + Object.keys(SITE.llmExtents).join(', '));
  if (p.llm_extent === undefined && DATE.test(p.listed || '') && p.listed >= SITE.llmExtentFrom) e.push(file + ': llm_extent is required for records listed from ' + SITE.llmExtentFrom);
  if (!['listed', 'withdrawn'].includes(p.status)) e.push(file + ': status must be listed, withdrawn or removed');
  if (p.abstract_source !== undefined && p.abstract_source !== 'authors') e.push(file + ': abstract_source can only be "authors", for an abstract given in the submission issue');
  if (p.published_doi !== undefined) e.push(file + ': published_doi was replaced by published, an object with the DOI, the title, the venue, the date and how it was confirmed');
  if (p.published !== undefined) {
    const q = p.published || {};
    const where = file + ': published';
    if (!DOI.test(q.doi || '')) e.push(where + ' needs the DOI of the published version');
    else {
      if ((p.versions || []).some((v) => (v.doi || '').toLowerCase() === q.doi.toLowerCase())) e.push(where + ' is one of the listed versions, not a published version');
      if (repoPrefix(q.doi)) e.push(where + ' is in a preprint repository, not a journal or a book');
    }
    if (!q.title || typeof q.title !== 'string') e.push(where + ' needs the title of the published version');
    if (!q.venue || typeof q.venue !== 'string') e.push(where + ' needs the journal, the proceedings or the book it appeared in');
    if (!PUBLISHED_DATE.test(q.date || '')) e.push(where + ' needs a date: YYYY, YYYY-MM or YYYY-MM-DD');
    if (!PUBLISHED_KINDS.includes(q.type)) e.push(where + ' must be one of: ' + PUBLISHED_KINDS.join(', '));
    if (![true, false, null].includes(q.peer_reviewed)) e.push(where + ': peer_reviewed is true, false or null (not stated)');
    if (!['publisher', 'authors'].includes(q.evidence)) e.push(where + ': evidence is "publisher" or "authors"');
    if (!DATE.test(q.reported || '')) e.push(where + ' needs the date it was reported');
    if (q.issue !== undefined && (!Number.isInteger(q.issue) || q.issue < 1)) e.push(where + ': issue is the number of the issue that reported it');
    (q.updates || []).forEach((u, i) => {
      if (!/^[a-z_]+$/.test(u.type || '') || !DOI.test(u.doi || '') || !DATE.test(u.date || '')) e.push(where + ': update ' + (i + 1) + ' needs a type, the DOI of the notice and a date');
    });
  }
  if (p.status === 'withdrawn') {
    if (!DATE.test(p.withdrawal_date || '')) e.push(file + ': a withdrawn record needs its withdrawal_date');
    if (!p.withdrawal_note) e.push(file + ': a withdrawn record needs a note');
    if ((p.pdfs || []).length) e.push(file + ': a withdrawn record keeps no PDF copies');
  }
  /* Notices that Crossref records against a DOI of the record, added by the operator (tools/notices.js). */
  (p.notices || []).forEach((n, i) => {
    if (!/^[a-z_]+$/.test(n.type || '') || !DOI.test(n.doi || '') || !DATE.test(n.date || '')) e.push(file + ': notice ' + (i + 1) + ' needs a type, the DOI of the notice and a date');
  });
  /* Collections by topic (site.json "collections"), chosen by the moderator. */
  if (p.collections !== undefined) {
    const known = new Set((SITE.collections || []).map((c) => c.slug));
    if (!Array.isArray(p.collections) || !p.collections.length || new Set(p.collections).size !== p.collections.length || !p.collections.every((c) => known.has(c))) e.push(file + ': collections is a list of the collections in site.json, each once');
  }
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
    if (x.provided_by !== undefined && x.provided_by !== 'authors') e.push(where + ': provided_by can only be "authors"');
    if (!Number.isInteger(x.pages) || x.pages < 1 || !Number.isInteger(x.words) || x.words < 0) e.push(where + ' needs its pages and words (node tools/pdf_stats.js)');
  });
  return e;
}

/* The PDF copies sit beside the records: data/papers → data/pdf. */
const pdfDir = (paperDir) => path.join(paperDir, '..', 'pdf');

/* How large the PDF copies may be, one by one and together. A larger file stays at its repository,
 * and the record links to it; the limits keep the site and its repository small enough to serve for free. */
const MB = 1024 * 1024;
const pdfLimits = (l = SITE.pdfLimits) => ({ file: l.fileMB * MB, total: l.totalGB * 1024 * MB });

function loadPapers(dir, limits = pdfLimits()) {
  if (!fs.existsSync(dir)) return { papers: [], problems: [] };
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  const papers = [];
  const problems = [];
  let total = 0;
  for (const f of files) {
    let p;
    try { p = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); }
    catch (err) { problems.push(f + ': not valid JSON'); continue; }
    problems.push(...validate(p, f));
    (p.pdfs || []).forEach((x) => {
      const at = path.join(pdfDir(dir), String(x.file));
      if (!fs.existsSync(at)) problems.push(f + ': the copy ' + x.file + ' is missing');
      else {
        const bytes = fs.readFileSync(at);
        if (crypto.createHash('sha256').update(bytes).digest('hex') !== x.sha256) problems.push(f + ': the copy ' + x.file + ' does not match its sha256');
        if (bytes.length > limits.file) problems.push(f + ': the copy ' + x.file + ' is larger than ' + limits.file / MB + ' MB');
        total += bytes.length;
      }
    });
    papers.push(p);
  }
  if (total > limits.total) problems.push('the PDF copies together are larger than ' + limits.total / 1024 / MB + ' GB');
  const ids = papers.map((p) => p.id);
  if (new Set(ids).size !== ids.length) problems.push('ids are not unique');
  /* One work, one record: a DOI may appear in only one record (a record may repeat it across versions, as arXiv does). */
  const owner = new Map();
  papers.forEach((p) => new Set((p.versions || []).map((v) => String(v.doi).toLowerCase())).forEach((d) => {
    if (owner.has(d)) problems.push('the DOI ' + d + ' is in both ' + owner.get(d) + ' and ' + p.id);
    else owner.set(d, p.id);
  }));
  return { papers, problems };
}

/* ------------------------------------------------------------ html */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CSS = `
:root { --bg: #f7f5f0; --fg: #1d2330; --muted: #5a6170; --rule: #d9d4c7; --accent: #2f4a7a; --card: #fffdf8; color-scheme: light; }
@media (prefers-color-scheme: dark) { :root { --bg: #14171f; --fg: #e6e2d8; --muted: #a3a8b4; --rule: #2e3442; --accent: #9fb6e0; --card: #1a1e28; color-scheme: dark; } }
/* When the system asks for more contrast: every text colour at 7:1 or more, and stronger rules. */
@media (prefers-contrast: more) { :root { --muted: #3d4350; --accent: #24395f; --rule: #8a8578; } }
@media (prefers-contrast: more) and (prefers-color-scheme: dark) { :root { --muted: #c9ccd4; --accent: #b8cbec; --rule: #6b7386; } }
@media (forced-colors: active) { a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible { outline-color: Highlight; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 17px/1.65 Georgia, "Times New Roman", "Hiragino Mincho ProN", "Yu Mincho", serif; }
a { color: var(--accent); }
/* Keyboard users see where they are, and can jump past the header. */
a:focus-visible, button:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
.skip { position: absolute; left: -9999px; top: 0; padding: .5rem 1rem; background: var(--card); color: var(--fg); }
.skip:focus { left: max(16px, env(safe-area-inset-left, 0px)); z-index: 10; }
.wrap { max-width: 46rem; margin: 0 auto; padding: 0 max(16px, env(safe-area-inset-left, 0px)) 4rem max(16px, env(safe-area-inset-right, 0px)); }
header.top { border-bottom: 1px solid var(--rule); margin-bottom: 2rem; }
header.top .wrap { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: .5rem 1.5rem; padding-top: 1.25rem; padding-bottom: 1rem; }
.brand { font-size: 1.6rem; letter-spacing: .04em; text-decoration: none; color: var(--fg); }
.brand small { display: block; font-size: .8rem; letter-spacing: .08em; color: var(--muted); text-transform: uppercase; }
nav a { margin-left: 1rem; font-size: .95rem; }
nav a:first-child { margin-left: 0; }
header.top .lang { margin: 0; font-size: .95rem; }
.notice { border-left: 3px solid var(--accent); background: var(--card); padding: .75rem 1rem; margin: 1.5rem 0; font-size: .95rem; }
h1 { font-size: 1.7rem; line-height: 1.3; margin: .5rem 0 1rem; }
h2 { font-size: 1.2rem; margin: 2rem 0 .5rem; }
h3 { font-size: 1.05rem; margin: 1.5rem 0 .25rem; }
ol.list { list-style: none; padding: 0; margin: 0; }
ol.list li { border-top: 1px solid var(--rule); padding: 1rem 0; }
.meta { color: var(--muted); font-size: .9rem; }
.id { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: .9rem; }
.abstract { background: var(--card); border: 1px solid var(--rule); padding: 1rem 1.25rem; }
.abstract p { margin: 0; }
pre { background: var(--card); border: 1px solid var(--rule); padding: 1rem; overflow-x: auto; font-size: .85rem; line-height: 1.5; }
table { border-collapse: collapse; width: 100%; font-size: .95rem; }
details.source { margin: .6rem 0 1.4rem; }
details.source summary { cursor: pointer; color: var(--muted); }
details.source blockquote { margin: .6rem 0; padding: .25rem 1rem; border-left: 3px solid var(--rule); }
details.source .from { font-size: .9rem; color: var(--muted); }
.table { overflow-x: auto; }
td a, p code, li code { overflow-wrap: anywhere; }
td, th { border-top: 1px solid var(--rule); padding: .4rem .5rem .4rem 0; text-align: left; vertical-align: top; }
.flag { display: inline-block; font-size: .8rem; border: 1px solid var(--rule); padding: 0 .4rem; margin-left: .4rem; color: var(--muted); }
/* The operator's own work is marked more strongly than the other flags: a border and text in the main colours, in bold. */
.flag.own { border: 2px solid var(--accent); color: var(--fg); font-weight: bold; }
.notice.own { border-left-width: 6px; }
.jump { font-size: .95rem; }
.fields { list-style: none; padding: 0; margin: 0 0 1rem; display: flex; flex-wrap: wrap; gap: .5rem; font-size: .95rem; }
.fields a { display: inline-block; border: 1px solid var(--rule); padding: .15rem .7rem; text-decoration: none; }
.fields a[aria-current] { background: var(--accent); border-color: var(--accent); color: var(--bg); }
.share a { white-space: nowrap; }
.access { background: var(--card); border: 1px solid var(--rule); padding: .5rem .75rem; }
.cite { padding-left: 1.5rem; text-indent: -1.5rem; overflow-wrap: anywhere; }
.search { display: flex; flex-wrap: wrap; gap: .5rem; align-items: end; margin-bottom: 1rem; }
.search label { display: flex; flex-direction: column; font-size: .85rem; color: var(--muted); gap: .2rem; }
.search input, .search select, .search button { font: inherit; font-size: 1rem; padding: .3rem .5rem; border: 1px solid var(--rule); background: var(--card); color: var(--fg); }
.search input[type=search] { width: min(24rem, 80vw); }
.search button { background: var(--accent); color: var(--bg); border-color: var(--accent); cursor: pointer; }
/* On a narrow screen the words take the whole width, the field and the year share a line, and the button is easy to tap. */
@media (max-width: 40rem) { .search label:first-child { flex: 1 1 100%; } .search input[type=search] { width: 100%; } .search label { flex: 1 1 8rem; } .search select, .search input { min-height: 2.75rem; width: 100%; } .search button { flex: 1 1 100%; min-height: 2.75rem; } }
.crumbs { font-size: .85rem; color: var(--muted); margin: .5rem 0; }
/* The sections of a prose or policy page, linked near its top. */
.toc { border-left: 3px solid var(--rule); padding: .1rem 0 .1rem 1rem; margin: 1.5rem 0; font-size: .95rem; }
.toc p { margin: 0 0 .25rem; color: var(--muted); }
.toc ul { margin: 0; padding-left: 1.2rem; }
.toc a { margin-left: 0; overflow-wrap: anywhere; }
/* On paper: no navigation and no footer, and the text a little smaller, so that the one-page leaflet fits one sheet. */
@media print { header.top nav, .toc, footer, .skip { display: none; } body { font-size: 11pt; } .wrap { max-width: none; padding-bottom: 0; } header.top { margin-bottom: 1rem; } }
footer { border-top: 1px solid var(--rule); margin-top: 3rem; padding-top: 1rem; color: var(--muted); font-size: .85rem; }
`;

const STYLE_HASH = "'sha256-" + crypto.createHash('sha256').update(CSS).digest('base64') + "'";

/* The id of a heading, as GitHub gives it to the same heading of the Markdown source, so that a link to a section works on
 * the site and on github.com alike: lower case, every character but letters, marks, numbers, "_", "-" and spaces dropped,
 * spaces made "-"; a repeated id gets "-1", "-2" and so on. */
const unesc = (s) => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
function slugger() {
  const seen = new Set();
  return (text) => {
    const base = String(text).toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '').replace(/ /g, '-');
    let id = base;
    for (let n = 1; seen.has(id); n++) id = base + '-' + n;
    seen.add(id);
    return id;
  };
}
/* Every heading gets its id; where there are two sections or more, a list of them goes before the first, in the page's language. */
function sections(html, ja = false) {
  const slug = slugger();
  const list = [];
  const out = html.replace(/<h([1-3])>([\s\S]*?)<\/h\1>/g, (m, n, inner) => {
    const id = slug(unesc(inner.replace(/<[^>]+>/g, '')));
    if (n === '2') list.push(`<li><a href="#${esc(id)}">${inner.replace(/<\/?a\b[^>]*>/g, '')}</a></li>`);
    /* The title counts for the ids, as on GitHub, but needs none: a link to the page goes to its top. */
    return n === '1' ? m : `<h${n} id="${esc(id)}">${inner}</h${n}>`;
  });
  if (list.length < 2) return out;
  const label = ja ? 'この頁の節' : 'On this page';
  const nav = `<nav class="toc" aria-label="${label}"><p>${label}</p><ul>${list.join('')}</ul></nav>\n`;
  const at = out.indexOf('<h2 ');
  return out.slice(0, at) + nav + out.slice(at);
}

/* The Markdown sources link one another as files (./terms.md, ../policy.md#the-policies), so that the links work on github.com,
 * and link built pages that have no source (the listing, the feeds) by their address on the site. On the site, a link to a
 * source that is built as a page goes to that page, and a link to the site goes there relatively, so that every link stays
 * relative. A link to a source that is not built goes to the file on GitHub; one to a template stays, as build.js copies it. */
const NOT_PAGES = ['README.md', 'CHANGELOG.md', 'CLAUDE.md', 'CONTRIBUTING.md', 'SECURITY.md'];
const SOURCE_PAGES = new Map(fs.readdirSync(ROOT).filter((f) => f.endsWith('.md') && !NOT_PAGES.includes(f)).map((f) => [f, f.replace(/\.md$/, '.html')])
  .concat(fs.readdirSync(path.join(ROOT, 'policies')).filter((f) => f.endsWith('.md')).map((f) => ['policies/' + f, 'policies/' + f.replace(/\.md$/, '.html')])));
/* Pure: where a link in the source `src` leads on the site, from the page `at`; null leaves the link as it is. */
function sitePath(href, src, at) {
  const rel = (to) => { const r = path.posix.relative(path.posix.dirname(at), to); return r.startsWith('.') ? r : './' + r; };
  const m = /^\.{1,2}\/[^#?]*\.md(?=[#?]|$)/.exec(href);
  if (m) {
    const file = path.posix.normalize(path.posix.join(path.posix.dirname(src), m[0]));
    const rest = href.slice(m[0].length);
    if (SOURCE_PAGES.has(file)) return rel(SOURCE_PAGES.get(file)) + rest;
    if (file.startsWith('templates/')) return null;
    return SITE.repo + '/blob/main/' + file + rest;
  }
  if (href.startsWith(SITE.baseUrl)) return rel(href.slice(SITE.baseUrl.length) || 'index.html');
  return null;
}
function sourceLinks(html, src, at) {
  return html.replace(/href="([^"]+)"/g, (m, h) => { const to = sitePath(unesc(h), src, at); return to === null ? m : 'href="' + esc(to) + '"'; });
}

/* Every page forbids scripts. The search page alone may run search.js from this site and read papers.json. */
const CSP = `default-src 'none'; style-src ${STYLE_HASH}; img-src 'self'; base-uri 'none'; form-action 'none'`;
const SEARCH_CSP = `default-src 'none'; style-src ${STYLE_HASH}; img-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'`;

function page({ title, description, rel, root, canonical, body, head, csp, lang, image, src }) {
  /* A page written in Markdown (src) gets its sections linked near the top, and its links to other sources mapped to pages. */
  if (src) body = sourceLinks(sections(body, lang === 'ja'), src, canonical);
  /* The 404 page is served at any address, so it links from the root. */
  const up = root ? '/' : rel ? '../' : './';
  /* The top page names the site for search engines: WebSite microdata, without a script. */
  const home = canonical === '';
  const site = home ? ` itemscope itemtype="https://schema.org/WebSite"><meta itemprop="name" content="${esc(SITE.name)}">${SITE.osf ? `<link itemprop="sameAs" href="${esc(SITE.osf.url)}"><link itemprop="sameAs" href="https://doi.org/${esc(SITE.osf.doi)}">` : ''}${SITE.zenodo ? `<link itemprop="sameAs" href="https://doi.org/${esc(SITE.zenodo.doi)}">` : ''}` : '>';
  const brand = home ? 'href="./" itemprop="url"' : `href="${up}index.html"`;
  /* A page with a version in the other language links it at the end of the header, in the same place on every page.
   * The twin is the alternate that the head names; both versions sit in the same directory. */
  const twin = [...(head || '').matchAll(/<link rel="alternate" hreflang="(en|ja)" href="([^"]+)">/g)]
    .map((m) => ({ lang: m[1], file: m[2].split('/').pop() || 'index.html' })).find((t) => t.lang !== (lang || 'en'));
  const switcher = twin ? `\n<p class="lang"><a href="./${twin.file}" hreflang="${twin.lang}" lang="${twin.lang}">${twin.lang === 'ja' ? '日本語' : 'English'}</a></p>` : '';
  /* On a Japanese page, the header and the footer stay in English, and say so to screen readers. */
  const en = lang === 'ja' ? ' lang="en"' : '';
  return `<!doctype html>
<html lang="${lang || 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="${csp || CSP}">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(SITE.baseUrl + canonical)}">
<link rel="icon" href="${up}favicon.ico" sizes="48x48">
<link rel="icon" href="${up}favicon.svg" type="image/svg+xml">
<link rel="icon" href="${up}favicon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="${up}apple-touch-icon.png">
<link rel="alternate" type="application/atom+xml" title="${esc(SITE.name)}: new preprints" href="${up}feed.xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(SITE.baseUrl + canonical)}">
<meta property="og:image" content="${esc(image || SITE.baseUrl + 'og.png')}">
${head || ''}${/^(policies\/|policy(\.ja)?\.html$)/.test(canonical) ? POLICY_FEED(up) : ''}${home && SITE.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(SITE.googleSiteVerification)}">\n` : ''}<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">${SITE.x ? `\n<meta name="twitter:site" content="@${esc(SITE.x)}">` : ''}
<style>${CSS}</style>
</head>
<body>
<a class="skip" href="#main"${en}>Skip to content</a>
<header class="top"><div class="wrap"${site}
<a class="brand" ${brand}${en}>${esc(SITE.name)}<small>${esc(SITE.tagline)}</small></a>
<nav${en}><a href="${up}index.html">Listing</a><a href="${up}search.html">Search</a><a href="${up}submit.html">Submit</a><a href="${up}policy.html">Policies</a><a href="${up}faq.html">FAQ</a></nav>${switcher}
</div></header>
<main class="wrap" id="main">
${body}
</main>
<footer><div class="wrap"${en}>
<p>${esc(SITE.name)} is an overlay preprint server. It charges nothing, to authors or to readers. Acceptance is moderation, not peer review, and the quality of listed work is not guaranteed.</p>
<p>Operated by ${esc(SITE.operator.name)}. Written with Claude Code (Anthropic), named as a disclosure, not an endorsement; the operator is responsible for the site, and Claude is not an author. Hosted on Vercel. No cookies, no analytics and nothing loaded from other servers (<a href="${up}policies/privacy.html">Privacy</a>). Text CC BY 4.0, code MIT. <a href="${esc(SITE.repo)}">Source</a>.</p>
<p><a href="${up}policies/terms.html">Terms of Use</a> · <a href="${up}policies/privacy.html">Privacy</a> · <a href="${up}policies/takedown.html">Takedown</a> · <a href="${up}disclaimer.html">Disclaimer</a> · <a href="${up}repositories.html">For repositories</a> · <a href="${up}automation.html">What runs by itself</a> · <a href="${up}stats.html">Statistics</a> · <a href="${up}transparency.html">Transparency</a> · <a href="${up}news.html">News</a> · <a href="${up}press.html">Press</a> · <a href="${up}history.html">History</a> · <a href="${up}accessibility.html">Accessibility</a> · <a href="${up}easy.html">In plain words</a> · <a href="${up}contact.html">Contact</a></p>
</div></footer>
</body>
</html>
`;
}

/* The texts that a legal page cites, quoted at the end of the section that cites them: a line <!-- text: GDPR 27; APPI 28 -->
 * names them by the law of verification/citations.json and the article. Nothing here is written by hand.
 * - A Japanese statute is quoted in full, as the e-Gov law API gives it: the text the weekly watch keeps
 *   (verification/statutes-texts.json), or else the one tools/sources.js fetched (verification/sources-raw.json).
 *   It is broken into lines only where a paragraph or an item begins.
 * - A foreign text is the quotation chosen in verification/sources.json, cut word for word from the fetched text.
 * - A citation whose source could not be fetched (`untraced` in verification/citations.json) is named as not quoted, with why.
 * verification/check.js confirms that every citation of a section is named in its line, and that the page shows each text as recorded. */
const CITATIONS = JSON.parse(fs.readFileSync(path.join(ROOT, 'verification', 'citations.json'), 'utf8'));
const STATUTES = JSON.parse(fs.readFileSync(path.join(ROOT, 'verification', 'statutes.json'), 'utf8'));
const STATUTE_TEXTS = JSON.parse(fs.readFileSync(path.join(ROOT, 'verification', 'statutes-texts.json'), 'utf8'));
const PRIMARY = JSON.parse(fs.readFileSync(path.join(ROOT, 'verification', 'sources.json'), 'utf8'));
const RAW = JSON.parse(fs.readFileSync(path.join(ROOT, 'verification', 'sources-raw.json'), 'utf8'));
const statuteLines = (t) => t.split(/ (?=(?:[０-９]+|[一二三四五六七八九十]+|[イロハニホヘトチリヌルヲワカヨタレソツネナラム]) )/);
/* A Japanese article: the watched text (with its label) where the watch keeps it, otherwise the fetched one. */
function statuteText(law, article) {
  const L = CITATIONS.laws[law];
  const st = STATUTES.statutes.find((e) => e.law_id === L.egov && e.article === article.replace(/-/g, '_'));
  if (st && STATUTE_TEXTS[st.name + ' ' + st.label]) return { text: STATUTE_TEXTS[st.name + ' ' + st.label], label: st.label, watched: true, title: st.title, items: st.items };
  const r = RAW.sources['egov:' + L.egov];
  if (r && r.articles && r.articles[article]) return { text: r.articles[article], label: 'Article ' + article, watched: false, title: r.title };
  return null;
}
const jaArticle = (a, items) => { const [n, k] = a.split('-'); return '第' + n + '条' + (k ? 'の' + k : '') + (items ? '第1項' + items.map((x) => '第' + x + '号').join('・') : ''); };
function quoteOne(key, ja) {
  const m = /^(.+) (\S+)$/.exec(key);
  if (!m || !CITATIONS.laws[m[1]]) throw new Error('条文の印 ' + key + ' の法令がない');
  const [, law, article] = m;
  const L = CITATIONS.laws[law];
  if (L.egov) {
    const t = statuteText(law, article);
    if (!t) throw new Error('条文の印 ' + key + ' の文がない');
    const api = 'https://laws.e-gov.go.jp/api/1/lawdata/' + L.egov;
    const when = t.watched ? STATUTES.recorded : RAW.fetched;
    return `<details class="source"><summary>${ja ? '条文　' + esc(t.title) + ' ' + esc(jaArticle(article, t.items)) : 'Text of ' + esc(L.en[0]) + ', ' + esc(t.label) + ' (Japanese original)'}</summary>`
      + `<blockquote lang="ja"><p>${statuteLines(t.text).map(esc).join('<br>\n')}</p></blockquote>`
      + `<p class="from">${ja
        ? `${when} に <a href="${api}">e-Gov 法令 API</a> から取り寄せた現行の条文を、手を入れずに引いています。${t.watched ? '週に一度の見張りが、記した文と同じかを確かめています。' : 'まだ週に一度の見張りには入っていません。'}`
        : `The current text, fetched from the <a href="${api}">e-Gov law API</a> on ${when} and quoted without change. ${t.watched ? 'The weekly watch confirms that it is still the same.' : 'It is not yet among the texts the weekly watch confirms.'} Not translated; the Japanese text is the law.`}</p></details>`;
  }
  const q = PRIMARY.quotes[key];
  if (!q) throw new Error('条文の印 ' + key + ' を引くものがない');
  return `<details class="source"><summary>${ja ? '原文　' + esc(q.name_ja) : 'Text of ' + esc(q.name)}</summary>`
    + `<blockquote lang="${q.lang}"><p>${esc(q.quote)}</p></blockquote>`
    + `<p class="from">${ja
      ? `<a href="${esc(q.url)}">${esc(q.name_ja)}</a>から、${PRIMARY.fetched} に取り寄せた文をそのまま引いています。訳は付けていません。`
      : `Quoted word for word from <a href="${esc(q.url)}">${esc(q.name)}</a>, as fetched on ${PRIMARY.fetched}.`}</p></details>`;
}
/* The citations of a line that could not be quoted, in one note, each with why. */
function notQuoted(keys, ja) {
  const by = new Map();
  for (const key of keys) {
    const [, law, article] = /^(.+) (\S+)$/.exec(key);
    const u = CITATIONS.untraced[law];
    if (!u || !u.articles.includes(article)) throw new Error('条文の印 ' + key + ' を引くものがない');
    if (!by.has(law)) by.set(law, []);
    by.get(law).push(article);
  }
  const items = [...by].map(([law, arts]) => {
    const L = CITATIONS.laws[law], u = CITATIONS.untraced[law];
    return ja ? `<li>${esc((L.ja || L.en)[0])} ${arts.map((a) => '第 ' + a + ' 条').join('・')}：${esc(u.why_ja)}</li>` : `<li>${esc(L.en[0])}, ${arts.length > 1 ? 'Articles or sections' : 'Article or section'} ${esc(arts.join(', '))}: ${esc(u.why)}</li>`;
  });
  return `<details class="source"><summary>${ja ? '引いていない条（原文を取り寄せられなかったもの）' : 'Not quoted: the texts that could not be fetched'}</summary><ul>${items.join('')}</ul></details>`;
}
function quoteBlock(keys, ja) {
  const all = keys.split(';').map((k) => k.trim()).filter(Boolean);
  const quoted = all.filter((k) => { const law = /^(.+) (\S+)$/.exec(k)[1]; return !(CITATIONS.untraced[law] && CITATIONS.untraced[law].articles.includes(/ (\S+)$/.exec(k)[1])); });
  const rest = all.filter((k) => !quoted.includes(k));
  return quoted.map((k) => quoteOne(k, ja)).concat(rest.length ? [notQuoted(rest, ja)] : []).join('\n');
}

/* A small Markdown subset: #, ##, ###, paragraphs, ordered and unordered lists, tables with a header row, and **bold**.
 * A line <!-- text: … --> becomes the quoted texts (above), in the language of the page. */
function markdown(src) {
  const ja = /[\u3040-\u30ff\u4e00-\u9fff]/.test(src.split('\n')[0]);
  const out = [];
  let para = [];
  let list = null;
  let table = null;
  const inline = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\[([^\]]+)\]\(((?:\.\.?\/|https:\/\/)[^)\s]+)\)/g, '<a href="$2">$1</a>');
  /* Lines of a paragraph join with a space, except after Japanese text, which takes none. */
  const join = (lines) => lines.reduce((acc, l) => (acc && /[\u3000-\u30ff\u4e00-\u9fff\uff00-\uffef]$/.test(acc) ? acc + l : (acc ? acc + ' ' + l : l)), '');
  const flushPara = () => { if (para.length) { out.push('<p>' + inline(join(para)) + '</p>'); para = []; } };
  const flushList = () => { if (list) { out.push('<' + list.tag + (list.start > 1 ? ' start="' + list.start + '"' : '') + '>' + list.items.map((i) => '<li>' + inline(i) + '</li>').join('') + '</' + list.tag + '>'); list = null; } };
  /* A table is a header row, a row of dashes, and the body rows; each row starts and ends with "|". */
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const flushTable = () => {
    if (!table) return;
    const [head, rule, ...rows] = table;
    if (!rule || !cells(rule).every((c) => /^:?-{3,}:?$/.test(c))) throw new Error('a table needs a header row and a row of dashes: ' + head);
    out.push('<div class="table"><table><tr>' + cells(head).map((c) => '<th scope="col">' + inline(c) + '</th>').join('') + '</tr>'
      + rows.map((r) => '<tr>' + cells(r).map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</table></div>');
    table = null;
  };
  const flush = () => { flushPara(); flushList(); flushTable(); };
  for (const line of src.split('\n')) {
    let m;
    if (/^\s*$/.test(line)) { flush(); continue; }
    if ((m = /^<!-- text: (.+) -->$/.exec(line))) { flush(); out.push(quoteBlock(m[1], ja)); continue; }
    if (/^\|.*\|\s*$/.test(line)) { flushPara(); flushList(); (table = table || []).push(line); continue; }
    flushTable();
    if ((m = /^(#{1,3}) (.*)$/.exec(line))) { flush(); out.push('<h' + m[1].length + '>' + inline(m[2]) + '</h' + m[1].length + '>'); continue; }
    if ((m = /^(\d+)\. (.*)$/.exec(line))) { flushPara(); if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [], start: Number(m[1]) }; } list.items.push(m[2]); continue; }
    if ((m = /^- (.*)$/.exec(line))) { flushPara(); if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; } list.items.push(m[1]); continue; }
    if (list) { list.items[list.items.length - 1] += ' ' + line.trim(); continue; }
    para.push(line.trim());
  }
  flush();
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
/* The last day a record page changed: a new version, a note, a withdrawal, or a reported published version.
 * The sitemap and the feed use it, so a search engine and a feed reader see each of these changes. */
const changed = (p) => [latest(p).date, p.withdrawal_date, p.published && p.published.reported]
  .concat((p.notes || []).map((n) => n.date)).filter(Boolean).sort().pop();
const repoName = (doi) => SITE.repositories[repoPrefix(doi)];
/* "A, B or C": a list in running text, with no comma before the last word. */
const andOr = (xs, conj) => (xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' ' + conj + ' ' + xs[xs.length - 1]);

function bibtex(p) {
  const v = latest(p);
  const key = p.authors[0].name.split(/\s+/).pop().toLowerCase().replace(/[^a-z]/g, '') + v.date.slice(0, 4) + 'sophaxis' + p.id.replace('.', '');
  return `@misc{${key},
  author       = {${p.authors.map((a) => a.name).join(' and ')}},
  title        = {${p.title}},
  year         = {${v.date.slice(0, 4)}},
  howpublished = {${repoName(v.doi)}},
  doi          = {${v.doi}},
  note         = {Preprint, not peer-reviewed. Listed on ${SITE.name} as ${p.id}${p.published ? '. Published version: https://doi.org/' + p.published.doi : ''}}
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
    /* The day the record entered Sophaxis, as Scholar asks; the publication date is the first version's. */
    tag('citation_online_date', p.listed.replace(/-/g, '/')),
    tag('citation_doi', v.doi),
    tag('citation_abstract_html_url', SITE.baseUrl + 'abs/' + p.id + '.html'),
    ...((p.keywords || []).length ? [tag('citation_keywords', p.keywords.join('; '))] : []),
    /* Scholar takes citation_pdf_url only for a file in the same directory as the abstract page, so the copy is
     * also served under abs/ (a rewrite in vercel.json). */
    ...(copy ? [tag('citation_pdf_url', SITE.baseUrl + 'abs/' + copy.file)] : []),
  ].join('\n') + '\n';
}

function removedPage(p) {
  const body = `
<p class="meta"><span class="id">${esc(SITE.name)}:${esc(p.id)}</span></p>
${p.removal_reason === 'under-review' ? `<h1>Record under review</h1>
<div class="notice">${esc(UNDER_REVIEW)} Since: ${esc(p.removal_date)}.</div>
<p>This address is kept so that citations lead here. The title, the authors, the abstract and the PDF copy are not shown while the request is reviewed. If it is not upheld, they are put back. See the <a href="../policies/takedown.html">Takedown Policy</a>.</p>` : `<h1>Record removed</h1>
<div class="notice">This record (${esc(SITE.name)}:${esc(p.id)}) has been removed.</div>`}
`;
  return page({ title: SITE.name + ':' + p.id + ' | ' + SITE.name, description: 'A removed record.', rel: true, canonical: 'abs/' + p.id + '.html', body, head: '<meta name="robots" content="noindex">\n' + recordAlternates(p) });
}

/* RIS, for reference managers. Lines end in CR LF, as the format asks. */
function ris(p) {
  const v = latest(p);
  const one = (s) => String(s).replace(/\s+/g, ' ').trim();
  return [
    ['TY', 'UNPB'],
    ...p.authors.map((a) => ['AU', givenOf(a) ? familyOf(a) + ', ' + givenOf(a) : familyOf(a)]),
    ['TI', p.title],
    ['PY', v.date.slice(0, 4)],
    ['DA', v.date.replace(/-/g, '/')],
    ['PB', repoName(v.doi)],
    ['DO', v.doi],
    ['UR', 'https://doi.org/' + v.doi],
    ['AB', p.abstract],
    ...(p.keywords || []).map((k) => ['KW', k]),
    ['N1', 'Preprint, not peer-reviewed. Listed on ' + SITE.name + ' as ' + p.id + (p.published ? '. Published version: https://doi.org/' + p.published.doi : '')],
    ['ER', ''],
  ].map(([k, x]) => (k + '  - ' + one(x)).trimEnd()).join('\r\n') + '\r\n';
}

/* CSL-JSON, which Zotero, Pandoc and citeproc read. */
function cslJson(p) {
  const v = latest(p);
  return JSON.stringify([{
    id: 'sophaxis-' + p.id,
    type: 'article',
    genre: 'Preprint',
    title: p.title,
    author: p.authors.map((a) => (givenOf(a) ? { family: familyOf(a), given: givenOf(a) } : { literal: a.name })),
    issued: { 'date-parts': [v.date.split('-').map(Number)] },
    publisher: repoName(v.doi),
    DOI: v.doi,
    URL: 'https://doi.org/' + v.doi,
    abstract: p.abstract,
    ...((p.keywords || []).length ? { keyword: p.keywords.join(', ') } : {}),
    note: 'Preprint, not peer-reviewed. Listed on ' + SITE.name + ' as ' + p.id + (p.published ? '. Published version: https://doi.org/' + p.published.doi : ''),
  }], null, 2) + '\n';
}

/* Other listed records by the same authors (a shared ORCID iD) or on the same topics (a shared keyword).
 * Nothing is judged: the links follow from the records themselves. */
function related(p, all) {
  const others = all.filter((x) => x.id !== p.id && x.status === 'listed')
    .sort((a, b) => latest(b).date.localeCompare(latest(a).date) || b.id.localeCompare(a.id));
  const ids = new Set(p.authors.map((a) => a.orcid).filter(Boolean));
  const words = new Set((p.keywords || []).map((k) => k.toLowerCase()));
  const byAuthors = others.filter((x) => x.authors.some((a) => a.orcid && ids.has(a.orcid))).slice(0, 5);
  const onTopic = others.filter((x) => !byAuthors.includes(x) && (x.keywords || []).some((k) => words.has(k.toLowerCase()))).slice(0, 5);
  return { byAuthors, onTopic };
}

/* A DOI for every record, once Sophaxis registers DOIs of its own. Until site.json gives a prefix, there is none.
 * The suffix comes from the Sophaxis id, so it is as unique as the id and never changes. */
function recordDoi(p, conf = SITE.doi) {
  if (!conf || !conf.prefix) return null;
  return conf.prefix + '/' + conf.suffix.replace('{id}', p.id);
}

/* The DataCite metadata of a record's DOI. The record DOI names the Sophaxis record;
 * each version keeps the DOI of its repository, which is linked as the thing the record describes. */
function dataciteRecord(p, conf = SITE.doi) {
  const doi = recordDoi(p, conf);
  if (!doi) return null;
  const url = SITE.baseUrl + 'abs/' + p.id + '.html';
  if (p.status === 'removed') {
    /* A registered DOI cannot be deleted. A removed record keeps its DOI, pointing to the notice, and is hidden from search. */
    return { data: { type: 'dois', attributes: { doi, event: 'hide', url } } };
  }
  const v = latest(p);
  return {
    data: {
      type: 'dois',
      attributes: {
        doi,
        event: 'publish',
        url,
        creators: p.authors.map((a) => Object.assign(
          { name: givenOf(a) ? familyOf(a) + ', ' + givenOf(a) : a.name, nameType: 'Personal' },
          givenOf(a) ? { givenName: givenOf(a), familyName: familyOf(a) } : {},
          a.orcid ? { nameIdentifiers: [{ nameIdentifier: 'https://orcid.org/' + a.orcid, nameIdentifierScheme: 'ORCID', schemeUri: 'https://orcid.org' }] } : {})),
        titles: [{ title: p.title }],
        publisher: { name: SITE.name },
        publicationYear: Number(p.versions[0].date.slice(0, 4)),
        types: { resourceTypeGeneral: 'Preprint', resourceType: 'Overlay record' },
        subjects: (p.keywords || []).map((k) => ({ subject: k })),
        dates: [{ date: p.versions[0].date, dateType: 'Issued' }, { date: v.date, dateType: 'Updated' }],
        relatedIdentifiers: p.versions.map((x) => ({ relatedIdentifier: x.doi, relatedIdentifierType: 'DOI', relationType: 'IsVersionOf' }))
          /* DataCite has no IsPreprintOf. The published version is a later version of the work. */
          .concat(p.published ? [{ relatedIdentifier: p.published.doi, relatedIdentifierType: 'DOI', relationType: 'IsPreviousVersionOf' }] : []),
        rightsList: [{ rightsIdentifier: p.license.toLowerCase(), rightsIdentifierScheme: 'SPDX', rightsUri: LICENCE_URL[p.license] }],
        descriptions: [{ description: p.abstract, descriptionType: 'Abstract' }].concat(p.status === 'withdrawn' ? [{ description: 'Withdrawn on ' + p.withdrawal_date + '. ' + p.withdrawal_note, descriptionType: 'Other' }] : []),
      },
    },
  };
}

/* The published version of a record, said as the site says it: what it is, where, when, and on whose word.
 * Sophaxis does not judge the peer review of a journal; it repeats what the authors state, and says that it does. */
const publishedYear = (q) => q.date.slice(0, 4);
/* What the authors state of the published version: what it is, where, when, its peer review and how it was confirmed.
 * The notice at the top and the status table say it in the same words. */
function publishedSaid(q) {
  const peer = q.peer_reviewed === true ? 'The authors state that it was peer-reviewed.'
    : q.peer_reviewed === false ? 'The authors state that it was not peer-reviewed.' : 'Whether it was peer-reviewed is not stated.';
  const how = q.evidence === 'publisher' ? 'The publisher’s metadata links it to this preprint.'
    : 'An author reported it; the publisher’s metadata does not link it to this preprint.';
  return `A later version of this work appeared as a ${esc(q.type)} in <i>${esc(q.venue)}</i> (${esc(publishedYear(q))}): <a href="https://doi.org/${esc(q.doi)}">${esc(q.doi)}</a>. ${peer} ${how}`;
}
function publishedNotice(p) {
  const q = p.published;
  if (!q) return '';
  const upd = (q.updates || []).map((u) => `It has a ${esc(u.type.replace(/_/g, ' '))} notice of ${esc(u.date)}: <a href="https://doi.org/${esc(u.doi)}">${esc(u.doi)}</a>.`).join(' ');
  return `<div class="notice"><b>Published.</b> ${publishedSaid(q)}${upd ? ' ' + upd : ''} Cite the published version.</div>`;
}
/* Three things a reader should not confuse, each in its own row: where the work is deposited, that Sophaxis lists it
 * (moderation, not peer review), and any peer review or publication that the authors report. Only what the record holds;
 * a date it does not hold is said to be not recorded. */
const STATUS_ROWS = ['Deposit', 'Listing on ' + SITE.name, 'Peer review or publication'];
const NOT_RECORDED = 'not recorded';
function statusTable(p) {
  const v = latest(p), first = p.versions[0];
  const day = (d) => esc(d || NOT_RECORDED);
  const firstAt = repoName(first.doi) !== repoName(v.doi) ? ', at ' + esc(repoName(first.doi)) : '';
  const deposit = `${esc(repoName(v.doi))}. Latest version: v${v.version}, <a href="https://doi.org/${esc(v.doi)}">${esc(v.doi)}</a>. First version (v${first.version}): ${day(first.date)}${firstAt}.`;
  const listing = `Passed <a href="../policies/moderation.html">moderation</a>, which is not peer review. Listed: ${day(p.listed)}. Submission: <a href="${esc(SITE.repo)}/issues/${p.issue}">issue #${p.issue}</a>.`
    + (p.status === 'withdrawn' ? ` Withdrawn: ${day(p.withdrawal_date)}; the record stays.` : '');
  const review = p.published ? publishedSaid(p.published) : 'None reported. This is a preprint.';
  return `<div class="table" id="status"><table><tr><th scope="col">Status</th><th scope="col">For this record</th></tr>`
    + [deposit, listing, review].map((x, i) => `<tr><th scope="row">${STATUS_ROWS[i]}</th><td>${x}</td></tr>`).join('') + '</table></div>';
}
/* Notices that Crossref records against the preprint: said on the record page, with the notice, as the Moderation Policy says. */
function crossrefNotices(p) {
  if (!(p.notices || []).length) return '';
  const each = p.notices.map((n) => `a ${esc(n.type.replace(/_/g, ' '))} of ${esc(n.date)}: <a href="https://doi.org/${esc(n.doi)}">${esc(n.doi)}</a>`).join('; ');
  return `<div class="notice"><b>Notices.</b> Crossref records ${each}. Read the notice before citing this work.</div>`;
}
/* The statements of the authors on funding, competing interests, research ethics, and data and code, as they gave them. */
function statements(p) {
  const given = STATEMENT_KEYS.filter(([k]) => p[k]);
  if (!given.length) return '';
  return `<h2>Statements by the authors</h2>
${given.map(([k, h]) => `<p class="meta">${h}</p>
<p>${esc(p[k])}</p>`).join('\n')}
<p class="meta">As the authors state them in the submission issue. ${esc(SITE.name)} does not check them.</p>
`;
}
/* APA 7 for the published version: the authors of the record, since the published version shares them, and the venue from its metadata. */
function publishedCite(p) {
  const names = p.authors.map((a) => (givenOf(a) ? familyOf(a) + ', ' + initials(givenOf(a)) : familyOf(a)));
  return `${andList(names, '&')} (${publishedYear(p.published)}). ${p.published.title}. ${p.published.venue}. https://doi.org/${p.published.doi}`;
}

/* The share card of a record, drawn by tools/cards.js into assets/cards/, when it matches the record. */
const CARDS = path.join(__dirname, 'assets', 'cards');
function hasCard(p) {
  const m = path.join(CARDS, 'cards.json');
  if (!fs.existsSync(m) || !fs.existsSync(path.join(CARDS, p.id + '.png'))) return false;
  return JSON.parse(fs.readFileSync(m, 'utf8'))[p.id] === require('./tools/cards.js').cardHash(p);
}
/* A rough guide to the time a PDF takes to read: its pages and words, at 200 words a minute, rounded to five minutes. */
const WORDS_PER_MINUTE = 200;
function readingTime(x) {
  const minutes = Math.max(5, Math.round(x.words / WORDS_PER_MINUTE / 5) * 5);
  return `The PDF has ${x.pages} pages and about ${x.words.toLocaleString('en-US')} words: roughly ${minutes} minutes at ${WORDS_PER_MINUTE} words a minute. Mathematics and dense argument take longer.`;
}
/* The English and the Japanese record page name each other, as the other pages with a translation do. */
const recordAlternates = (p) => `<link rel="alternate" hreflang="en" href="${esc(SITE.baseUrl)}abs/${esc(p.id)}.html">\n<link rel="alternate" hreflang="ja" href="${esc(SITE.baseUrl)}abs/${esc(p.id)}.ja.html">\n`;
/* Conflicts of interest: the operator's own work says so in a notice above the title, not only in the small flag.
 * Where the record keeps the day its issue was opened, the notice gives the days it waited in public. */
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
function ownWorkNotice(p, ja = false) {
  if (p.operator_own !== true) return '';
  const waited = DATE.test(p.submitted || '') && DATE.test(p.listed || '') ? daysBetween(p.submitted, p.listed) : null;
  if (ja) {
    return `<div class="notice own"><b>運営者自身の作品です。</b>この作品は、${esc(SITE.name)} の運営者のものです。モデレーションでは、ほかの作品より先に扱っていません（<a href="../policies/moderation.ja.html#利益相反">モデレーションの規程</a>の「利益相反」）。`
      + (waited === null ? '' : `投稿の issue は、${esc(p.submitted)} から ${esc(p.listed)} まで ${waited} 日のあいだ公開で開いていました。`) + '</div>\n';
  }
  return `<div class="notice own"><b>The operator’s own work.</b> This work is by the operator of ${esc(SITE.name)}. It got no priority in moderation (<a href="../policies/moderation.html#conflicts-of-interest">Moderation Policy</a>, “Conflicts of interest”).`
    + (waited === null ? '' : ` Its submission issue was open in public for ${waited} days, from ${esc(p.submitted)} to ${esc(p.listed)}, before it was listed.`) + '</div>\n';
}
function recordPage(p, all = [p]) {
  if (p.status === 'removed') return removedPage(p);
  const v = latest(p);
  /* schema.org ScholarlyArticle in microdata: Google reads it, and no script is needed. */
  const authors = p.authors.map((a) => '<span itemprop="author" itemscope itemtype="https://schema.org/Person">'
    + (a.orcid ? `<a href="../author/${esc(a.orcid)}.html"><span itemprop="name">${esc(a.name)}</span></a>` : `<span itemprop="name">${esc(a.name)}</span>`)
    + (a.orcid ? ` <a class="id" href="https://orcid.org/${esc(a.orcid)}" itemprop="sameAs">ORCID ${esc(a.orcid)}</a>` : '') + '</span>').join('<br>');
  const url = SITE.baseUrl + 'abs/' + p.id + '.html';
  const lastCopy = (p.pdfs || []).slice(-1)[0];
  const facts = [
    `<meta itemprop="datePublished" content="${esc(p.versions[0].date)}">`,
    `<meta itemprop="dateModified" content="${esc(v.date)}">`,
    `<meta itemprop="identifier" content="doi:${esc(v.doi)}">`,
    `<meta itemprop="isAccessibleForFree" content="true">`,
    `<link itemprop="url" href="${esc(url)}">`,
    `<link itemprop="sameAs" href="https://doi.org/${esc(v.doi)}">`,
    `<link itemprop="license" href="${LICENCE_URL[p.license]}">`,
    ...((p.keywords || []).length ? [`<meta itemprop="keywords" content="${esc(p.keywords.join(', '))}">`] : []),
    ...(lastCopy ? [`<span itemprop="encoding" itemscope itemtype="https://schema.org/MediaObject"><link itemprop="contentUrl" href="${esc(SITE.baseUrl + 'pdf/' + lastCopy.file)}"><meta itemprop="encodingFormat" content="application/pdf"></span>`] : []),
  ].join('\n');
  /* Plain links to each service's own share page. Nothing is sent anywhere until a reader follows one. */
  const q = encodeURIComponent;
  const share = [
    ['X', `https://x.com/intent/post?text=${q(p.title)}&url=${q(url)}`],
    ['Bluesky', `https://bsky.app/intent/compose?text=${q(p.title + ' ' + url)}`],
    ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${q(url)}`],
    ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${q(url)}`],
    ['Email', `mailto:?subject=${q(p.title)}&body=${q(url)}`],
  ].map(([n, h]) => `<a href="${esc(h)}">${n}</a>`).join(' · ');
  const keywords = (p.keywords || []).length ? `<p class="meta">Keywords: ${p.keywords.map(esc).join('; ')}</p>` : '';
  const versions = p.versions.map((x) => `<tr><td>v${x.version}</td><td>${esc(x.date)}</td><td><a href="https://doi.org/${esc(x.doi)}">${esc(x.doi)}</a></td><td>${esc(repoName(x.doi))}</td></tr>`).join('');
  const notes = (p.notes || []).map((n) => `<li><span class="meta">${esc(n.date)}</span> ${esc(n.text)}</li>`).join('');
  const pdfs = p.pdfs || [];
  const copies = pdfs.length ? `<p>PDF on ${esc(SITE.name)}: ${pdfs.map((x) => `<a href="../pdf/${esc(x.file)}">v${x.version}</a>`).join(' · ')}</p>
<p class="meta">${pdfs.some((x) => x.provided_by === 'authors')
    ? `Unmodified copies of the PDF that the authors provided in their submission issue, because ${esc(repoName(v.doi))} does not let a script fetch its files`
    : `Unmodified copies of the files the authors deposited at ${esc(repoName(v.doi))}`}, kept so that search engines can index the full text. They are shared under ${esc(SITE.licenses[p.license])}, by ${esc(authorsText(p))}. Cite the DOI.</p>` : '';
  /* As arXiv does: the ways to read the work, at the top, before the abstract. */
  const lastPdf = pdfs.slice(-1)[0];
  const access = `<p class="access"><b>Access:</b> ${p.published ? `<a href="https://doi.org/${esc(p.published.doi)}">Published version (${esc(p.published.venue)})</a> · ` : ''}${lastPdf ? `<a href="../pdf/${esc(lastPdf.file)}" type="application/pdf">PDF (v${lastPdf.version}, ${lastPdf.pages} pages)</a> · ` : ''}<a href="https://doi.org/${esc(v.doi)}">${esc(repoName(v.doi))} (v${v.version})</a> · <a href="../cite/${esc(p.id)}.bib">BibTeX</a></p>`;
  const rel = related(p, all);
  const relList = (xs) => '<ul>' + xs.map((x) => `<li><a href="./${esc(x.id)}.html">${esc(x.title)}</a> <span class="meta">${esc(authorsText(x))}, ${esc(latest(x).date.slice(0, 4))}</span></li>`).join('') + '</ul>';
  const relatedHtml = rel.byAuthors.length || rel.onTopic.length ? `<h2>Related records</h2>
${rel.byAuthors.length ? '<p class="meta">By the same authors</p>\n' + relList(rel.byAuthors) + '\n' : ''}${rel.onTopic.length ? '<p class="meta">Sharing a keyword</p>\n' + relList(rel.onTopic) + '\n' : ''}` : '';
  const withdrawn = p.status === 'withdrawn'
    ? `<div class="notice"><b>Withdrawn on ${esc(p.withdrawal_date)}.</b> ${esc(p.withdrawal_note)} The record stays so that citations do not break. See the <a href="../policies/withdrawal.html">Withdrawal Policy</a>.</div>` : '';
  /* Where the record sits: the listing, its main field, the record. Microdata for search engines, without a script. */
  const crumb = (pos, inner) => `<span itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">${inner}<meta itemprop="position" content="${pos}"></span>`;
  const crumbs = `<nav class="crumbs" aria-label="Breadcrumb"><span itemscope itemtype="https://schema.org/BreadcrumbList">`
    + crumb(1, `<a itemprop="item" href="../index.html"><span itemprop="name">Listing</span></a>`) + ' › '
    + crumb(2, `<a itemprop="item" href="../list/${esc(p.category)}.html"><span itemprop="name">${esc(SITE.categories[p.category])}</span></a>`) + ' › '
    + crumb(3, `<span itemprop="name" aria-current="page">${esc(p.id)}</span>`) + '</span></nav>';
  /* How to cite, right after the ways to read the work. */
  const cite = `<h2 id="cite">Cite</h2>
${p.published ? `<p class="meta">Published version</p>
<p class="cite">${esc(publishedCite(p))}</p>
<p class="meta">This preprint, APA</p>` : '<p class="meta">APA</p>'}
<p class="cite">${esc(apa(p))}</p>
<p class="meta">Chicago (author-date)</p>
<p class="cite">${esc(chicago(p))}</p>
<p class="meta">BibTeX</p>
<pre>${esc(bibtex(p))}</pre>
<p class="meta">Download: <a href="../cite/${esc(p.id)}.bib">BibTeX</a> · <a href="../cite/${esc(p.id)}.ris">RIS</a> · <a href="../cite/${esc(p.id)}.json">CSL-JSON</a></p>`;
  /* On a phone the page reads from the top: the title, the ways to read the work, the abstract, then what the record is.
   * A line of links leads to the abstract, the status and the citation, which come later on a long page. */
  const jump = `<p class="meta jump"><a href="#abstract">Abstract</a> · <a href="#status">Status</a> · <a href="#cite">Cite</a></p>`;
  const body = `
${crumbs}
<p class="meta"><span class="id">${esc(SITE.name)}:${esc(p.id)}</span> · ${cats(p).map((c) => `<a href="../list/${esc(c)}.html">${esc(SITE.categories[c])}</a>`).join(' · ')}${p.subfield ? ' · ' + esc(SITE.subfields[p.category][p.subfield]) : ''}${p.operator_own ? '<span class="flag own">operator’s own submission</span>' : ''}</p>
${collectionLinks(p)}
${withdrawn}
${publishedNotice(p)}
${crossrefNotices(p)}
${ownWorkNotice(p)}<article itemscope itemtype="https://schema.org/ScholarlyArticle">
${facts}
<h1 itemprop="headline">${esc(p.title)}</h1>
<p>${authors}</p>
${p.status === 'withdrawn' ? '' : access}
${lastPdf && p.status !== 'withdrawn' ? `<p class="meta">${readingTime(lastPdf)}</p>\n` : ''}${jump}
<h2 id="abstract">Abstract</h2>
<div class="abstract"><p itemprop="abstract">${esc(p.abstract)}</p></div>
<p class="meta">Abstract by ${esc(authorsText(p))}, ${p.abstract_source === 'authors' ? 'given by the authors in the submission issue, because the DOI metadata has none' : 'from the DOI metadata'}, shown as plain text without other changes, under <a href="${LICENCE_URL[p.license]}">${esc(SITE.licenses[p.license])}</a>.</p>
${p.lay_summary ? `<h2>In plain words</h2>
<p>${esc(p.lay_summary)}</p>
<p class="meta">A summary for readers outside the field, written by the authors and given in the submission issue. It is not part of the work.</p>` : ''}
${p.abstract_other ? `<h2>Abstract in a second language</h2>
<div class="abstract" lang="${esc(p.abstract_other.lang)}"><p>${esc(p.abstract_other.text)}</p></div>
<p class="meta">Given by the authors in the submission issue (language code ${esc(p.abstract_other.lang)}), shown as given. ${esc(SITE.name)} has not checked the translation.</p>` : ''}
</article>
${statusTable(p)}
${keywords}
<div class="notice">${p.published ? `This page lists the preprint, the version before publication. ${esc(SITE.name)} did not review it, and the published version is the version of record.` : 'This is a preprint. It has not been peer-reviewed.'} Listing on ${esc(SITE.name)} means it passed moderation, not that it is correct. ${esc(SITE.name)} does not guarantee its quality. The authors bear full responsibility for its content.</div>
<h2 id="read">Read</h2>
<p><a href="https://doi.org/${esc(v.doi)}">Latest version (v${v.version}) at ${esc(repoName(v.doi))}</a> · licence <a href="${LICENCE_URL[p.license]}">${esc(SITE.licenses[p.license])}</a></p>
${copies}
${cite}
<h2>Versions</h2>
<div class="table"><table><tr><th scope="col">Version</th><th scope="col">Date</th><th scope="col">DOI</th><th scope="col">Repository</th></tr>${versions}</table></div>
<h2>Use of language models and other generative models</h2>
${p.llm_extent ? `<p class="meta">Extent, as the authors state it: ${esc(SITE.llmExtents[p.llm_extent])}</p>
` : ''}<p>${esc(p.llm_disclosure)}</p>
${statements(p)}${notes ? `<h2>Notes and corrections</h2><ul>${notes}</ul>` : ''}
${badgeSnippet(p)}
${relatedHtml}<h2>Share</h2>
<p class="share">${share}</p>
${recordDoi(p) ? `<p class="meta">Record DOI: <a href="https://doi.org/${esc(recordDoi(p))}">${esc(recordDoi(p))}</a></p>\n` : ''}<p class="meta">Submission: <a href="${esc(SITE.repo)}/issues/${p.issue}">issue #${p.issue}</a> · <a href="${esc(SITE.repo)}/issues/new?template=correction.yml&amp;id=${esc(p.id)}">Report an error in this record</a> · <a href="https://web.archive.org/web/${esc(url)}">Saved copies at the Internet Archive</a></p>
`;
  return page({
    title: p.title + ' | ' + SITE.name,
    description: p.abstract.slice(0, 200),
    rel: true,
    canonical: 'abs/' + p.id + '.html',
    body,
    head: scholarTags(p) + recordAlternates(p),
    image: hasCard(p) ? SITE.baseUrl + 'card/' + p.id + '.png' : null,
  });
}

/* ------------------------------------------------------------ record pages in Japanese */

/* The record page in Japanese: the same record, with the words around it in Japanese (items 445 and 446 of the owner's list).
 * What the authors gave stays in their words and their language: the title, the abstract, the summary in plain words, the
 * keywords, the statements and the statement on generative models. Notes stay as the operator wrote them, in English.
 * The citations are those of the English page. Search engines read the English page: this one has no Highwire tags and no
 * ScholarlyArticle microdata, and names the English page as its twin. */
const LANG_TAG = { eng: 'en', jpn: 'ja', deu: 'de', fra: 'fr', spa: 'es', ita: 'it', por: 'pt', rus: 'ru', zho: 'zh', kor: 'ko', nld: 'nl', lat: 'la', ell: 'el', pol: 'pl' };
/* The language of a text the authors gave: the language of the work where the record names it; otherwise Japanese when the text
 * has kana or kanji, and English when it has none, as the forms are in English and in Japanese. */
const hasJa = (t) => /[぀-ヿ一-鿿]/.test(String(t || ''));
const authorLang = (p, t) => (p.language && LANG_TAG[p.language]) || (hasJa(t) ? 'ja' : 'en');
const langAttr = (code) => (code === 'ja' ? '' : ` lang="${esc(code)}"`);
const STATUS_ROWS_JA = ['預け先', SITE.name + ' への掲載', '査読・出版'];
const NOT_RECORDED_JA = '記録なし';
const PUBLISHED_KINDS_JA = { 'journal article': '学術誌の論文', 'conference paper': '会議録の論文', 'book chapter': '本の章', book: '本' };
const NOTICE_TYPES_JA = { retraction: '撤回', correction: '訂正', expression_of_concern: '懸念の表明', erratum: '正誤', withdrawal: '取り下げ', removal: '削除', addendum: '補遺', clarification: '説明' };
const noticeTypeJa = (t) => NOTICE_TYPES_JA[t] || t.replace(/_/g, ' ');
/* The four levels of use of generative models, with the Japanese words that the Submission Policy gives each in brackets. */
const LLM_EXTENTS_JA = { none: '使っていない', editing: '言葉の手直し・翻訳・校正だけ', assistance: '構成・文献探索・確認の手助け。文は著者が書いた', drafting: '生成モデルが文・証明・コード・図の下書きを作り、著者が手を入れた' };
const STATEMENT_HEADS_JA = { funding: '資金', competing_interests: '利益相反', ethics: '人を対象とする研究と研究倫理', data: 'データとコード' };
function publishedSaidJa(q) {
  const peer = q.peer_reviewed === true ? '著者は、査読を経たと述べています。'
    : q.peer_reviewed === false ? '著者は、査読を経ていないと述べています。' : '査読を経たかどうかは、述べられていません。';
  const how = q.evidence === 'publisher' ? '出版社のメタデータが、このプレプリントとつないでいます。'
    : '著者が報告したものです。出版社のメタデータは、このプレプリントとつないでいません。';
  return `この作品の後の版が、${esc(PUBLISHED_KINDS_JA[q.type] || q.type)}として <i lang="en">${esc(q.venue)}</i>（${esc(publishedYear(q))}）に載りました：<a href="https://doi.org/${esc(q.doi)}">${esc(q.doi)}</a>。${peer}${how}`;
}
function statusTableJa(p) {
  const v = latest(p), first = p.versions[0];
  const day = (d) => esc(d || NOT_RECORDED_JA);
  const firstAt = repoName(first.doi) !== repoName(v.doi) ? '（' + esc(repoName(first.doi)) + '）' : '';
  const deposit = `${esc(repoName(v.doi))}。最新の版：v${v.version}、<a href="https://doi.org/${esc(v.doi)}">${esc(v.doi)}</a>。最初の版（v${first.version}）：${day(first.date)}${firstAt}。`;
  const listing = `<a href="../policies/moderation.ja.html">モデレーション</a>を通りました。モデレーションは査読ではありません。掲載：${day(p.listed)}。投稿：<a href="${esc(SITE.repo)}/issues/${p.issue}">issue #${p.issue}</a>。`
    + (p.status === 'withdrawn' ? `撤回：${day(p.withdrawal_date)}。記録は残します。` : '');
  const review = p.published ? publishedSaidJa(p.published) : '報告はありません。これはプレプリントです。';
  return `<div class="table" id="status"><table><tr><th scope="col">状態</th><th scope="col">この記録</th></tr>`
    + [deposit, listing, review].map((x, i) => `<tr><th scope="row">${STATUS_ROWS_JA[i]}</th><td>${x}</td></tr>`).join('') + '</table></div>';
}
function readingTimeJa(x) {
  const minutes = Math.max(5, Math.round(x.words / WORDS_PER_MINUTE / 5) * 5);
  return `PDF は ${x.pages} 頁、およそ ${x.words.toLocaleString('en-US')} 語です。1 分に ${WORDS_PER_MINUTE} 語で読むと、約 ${minutes} 分かかります。数学や密な議論には、もっと時間がかかります。`;
}
function removedJaPage(p) {
  const body = `
<p class="meta"><span class="id">${esc(SITE.name)}:${esc(p.id)}</span></p>
${p.removal_reason === 'under-review' ? `<h1>審査中の記録</h1>
<div class="notice">削除の申し立てを審査しているあいだ、要旨と PDF の写しを下げています。下げた日：${esc(p.removal_date)}。</div>
<p>引用がここへ届くように、このアドレスは残しています。審査のあいだは、題・著者・要旨・PDF の写しを示しません。申し立てが認められなければ、元に戻します。手続きは<a href="../policies/takedown.ja.html">削除の規程</a>にあります。</p>` : `<h1>削除した記録</h1>
<div class="notice">この記録（${esc(SITE.name)}:${esc(p.id)}）は削除しました。</div>`}
`;
  return page({ title: SITE.name + ':' + p.id + '（日本語） | ' + SITE.name, description: '削除した記録。', rel: true, canonical: 'abs/' + p.id + '.ja.html', lang: 'ja', body, head: '<meta name="robots" content="noindex">\n' + recordAlternates(p) });
}
function recordJaPage(p, all = [p]) {
  if (p.status === 'removed') return removedJaPage(p);
  const v = latest(p);
  const wl = (t) => langAttr(authorLang(p, t));
  const names = authorsText(p);
  const authors = p.authors.map((a) => (a.orcid ? `<a href="../author/${esc(a.orcid)}.html">${esc(a.name)}</a> <a class="id" href="https://orcid.org/${esc(a.orcid)}">ORCID ${esc(a.orcid)}</a>` : esc(a.name))).join('<br>');
  const url = SITE.baseUrl + 'abs/' + p.id + '.ja.html';
  const pdfs = p.pdfs || [];
  const lastPdf = pdfs.slice(-1)[0];
  const lic = `<a href="${LICENCE_URL[p.license]}">${esc(SITE.licenses[p.license])}</a>`;
  const access = `<p class="access"><b>読む：</b>${p.published ? `<a href="https://doi.org/${esc(p.published.doi)}">出版された版（<span lang="en">${esc(p.published.venue)}</span>）</a> · ` : ''}${lastPdf ? `<a href="../pdf/${esc(lastPdf.file)}" type="application/pdf">PDF（v${lastPdf.version}、${lastPdf.pages} 頁）</a> · ` : ''}<a href="https://doi.org/${esc(v.doi)}">${esc(repoName(v.doi))}（v${v.version}）</a> · <a href="../cite/${esc(p.id)}.bib">BibTeX</a></p>`;
  const withdrawn = p.status === 'withdrawn'
    ? `<div class="notice"><b>${esc(p.withdrawal_date)} に撤回されました。</b><span${wl(p.withdrawal_note)}>${esc(p.withdrawal_note)}</span> 引用が切れないように、記録は残します。手続きは<a href="../policies/withdrawal.ja.html">撤回の規程</a>にあります。</div>` : '';
  const q = p.published;
  const published = q ? `<div class="notice"><b>出版されました。</b>${publishedSaidJa(q)}${(q.updates || []).map((u) => `この版には、${esc(u.date)} の${esc(noticeTypeJa(u.type))}の通知があります：<a href="https://doi.org/${esc(u.doi)}">${esc(u.doi)}</a>。`).join('')}引用には、出版された版を使います。</div>` : '';
  const notices = (p.notices || []).length ? `<div class="notice"><b>通知。</b>Crossref は、この作品について、${p.notices.map((n) => `${esc(n.date)} の${esc(noticeTypeJa(n.type))}（<a href="https://doi.org/${esc(n.doi)}">${esc(n.doi)}</a>）`).join('、')}を記録しています。引用の前に、通知を読むよう勧めます。</div>` : '';
  const crumbs = `<nav class="crumbs" aria-label="現在の位置"><a href="../index.ja.html">一覧</a> › <a href="../list/${esc(p.category)}.html">${esc(SITE.categoriesJa[p.category])}</a> › <span aria-current="page">${esc(p.id)}</span></nav>`;
  const coll = (p.collections || []).map(collectionOf).filter(Boolean);
  const versions = p.versions.map((x) => `<tr><td>v${x.version}</td><td>${esc(x.date)}</td><td><a href="https://doi.org/${esc(x.doi)}">${esc(x.doi)}</a></td><td>${esc(repoName(x.doi))}</td></tr>`).join('');
  const copies = pdfs.length ? `<p>${esc(SITE.name)} の PDF：${pdfs.map((x) => `<a href="../pdf/${esc(x.file)}">v${x.version}</a>`).join(' · ')}</p>
<p class="meta">${pdfs.some((x) => x.provided_by === 'authors')
    ? `著者が投稿の issue で示した PDF を、手を加えずに写したものです。${esc(repoName(v.doi))} が、スクリプトによるファイルの取得を許さないためです。`
    : `著者が ${esc(repoName(v.doi))} に預けたファイルを、手を加えずに写したものです。`}検索エンジンが全文を索引できるように置いています。<span lang="en">${esc(names)}</span> が ${esc(SITE.licenses[p.license])} のもとで共有しています。引用には DOI を使います。</p>` : '';
  const given = STATEMENT_KEYS.filter(([k]) => p[k]);
  const statementsJa = given.length ? `<h2>著者の申告</h2>
${given.map(([k]) => `<p class="meta">${STATEMENT_HEADS_JA[k]}</p>
<p${wl(p[k])}>${esc(p[k])}</p>`).join('\n')}
<p class="meta">投稿の issue で著者が述べたとおりです。${esc(SITE.name)} はこれらを確かめていません。</p>
` : '';
  const notes = (p.notes || []).map((n) => `<li><span class="meta">${esc(n.date)}</span> <span lang="en">${esc(n.text)}</span></li>`).join('');
  const rel = related(p, all);
  const relList = (xs) => '<ul>' + xs.map((x) => `<li><a href="./${esc(x.id)}.ja.html"${langAttr(authorLang(x, x.title))}>${esc(x.title)}</a> <span class="meta"><span lang="en">${esc(authorsText(x))}</span>、${esc(latest(x).date.slice(0, 4))}</span></li>`).join('') + '</ul>';
  const relatedHtml = rel.byAuthors.length || rel.onTopic.length ? `<h2>関連する記録</h2>
${rel.byAuthors.length ? '<p class="meta">同じ著者のもの</p>\n' + relList(rel.byAuthors) + '\n' : ''}${rel.onTopic.length ? '<p class="meta">キーワードが重なるもの</p>\n' + relList(rel.onTopic) + '\n' : ''}` : '';
  const qe = encodeURIComponent;
  const share = [
    ['X', `https://x.com/intent/post?text=${qe(p.title)}&url=${qe(url)}`],
    ['Bluesky', `https://bsky.app/intent/compose?text=${qe(p.title + ' ' + url)}`],
    ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${qe(url)}`],
    ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${qe(url)}`],
    ['メール', `mailto:?subject=${qe(p.title)}&body=${qe(url)}`],
  ].map(([n, h]) => `<a href="${esc(h)}">${n}</a>`).join(' · ');
  const body = `
${crumbs}
<p class="meta"><span class="id">${esc(SITE.name)}:${esc(p.id)}</span> · ${cats(p).map((c) => `<a href="../list/${esc(c)}.html">${esc(SITE.categoriesJa[c])}</a>`).join(' · ')}${p.subfield ? ' · <span lang="en">' + esc(SITE.subfields[p.category][p.subfield]) + '</span>' : ''}${p.operator_own ? '<span class="flag own">運営者自身の投稿</span>' : ''}</p>
${coll.length ? `<p class="meta">集め：${coll.map((c) => `<a href="../collection/${esc(c.slug)}.html">${esc(c.ja)}</a>`).join('、')}</p>` : ''}
${withdrawn}
${published}
${notices}
${ownWorkNotice(p, true)}<article>
<h1${wl(p.title)}>${esc(p.title)}</h1>
<p lang="en">${authors}</p>
${p.status === 'withdrawn' ? '' : access}
${lastPdf && p.status !== 'withdrawn' ? `<p class="meta">${readingTimeJa(lastPdf)}</p>\n` : ''}<p class="meta jump"><a href="#abstract">要旨</a> · <a href="#status">状態</a> · <a href="#cite">引用</a></p>
<h2 id="abstract">要旨</h2>
<div class="abstract"${wl(p.abstract)}><p>${esc(p.abstract)}</p></div>
<p class="meta">要旨は <span lang="en">${esc(names)}</span> によるものです。${p.abstract_source === 'authors' ? 'DOI のメタデータに要旨がないため、著者が投稿の issue で示しました' : 'DOI のメタデータから取りました'}。書式のない文にしたほかは手を加えず、${lic} のもとで載せています。著者の言語のままで、訳は付けていません。</p>
${p.lay_summary ? `<h2>やさしい言葉で</h2>
<p${wl(p.lay_summary)}>${esc(p.lay_summary)}</p>
<p class="meta">分野の外の読者のための要約です。著者が書き、投稿の issue で示しました。作品の一部ではありません。</p>` : ''}
${p.abstract_other ? `<h2>二つ目の言語の要旨</h2>
<div class="abstract" lang="${esc(p.abstract_other.lang)}"><p>${esc(p.abstract_other.text)}</p></div>
<p class="meta">著者が投稿の issue で示したものです（言語の符号 ${esc(p.abstract_other.lang)}）。示されたとおりに載せています。${esc(SITE.name)} は訳を確かめていません。</p>` : ''}
</article>
${statusTableJa(p)}
${(p.keywords || []).length ? `<p class="meta">キーワード：<span${wl(p.keywords.join(' '))}>${p.keywords.map(esc).join('; ')}</span></p>` : ''}
<div class="notice">${p.published ? `この頁が載せているのは、出版の前の版であるプレプリントです。${esc(SITE.name)} は査読をしていません。記録の版は、出版された版です。` : 'これはプレプリントです。査読を経ていません。'}${esc(SITE.name)} に載っていることは、モデレーションを通ったことを意味し、内容が正しいことを意味しません。${esc(SITE.name)} は質を保証しません。内容の責任は、すべて著者にあります。</div>
<h2 id="read">読む</h2>
<p><a href="https://doi.org/${esc(v.doi)}">最新の版（v${v.version}）、${esc(repoName(v.doi))}</a> · ライセンス ${lic}</p>
${copies}
<h2 id="cite">引用</h2>
<p class="meta">引用の書式は英語のままです。</p>
${p.published ? `<p class="meta">出版された版</p>
<p class="cite" lang="en">${esc(publishedCite(p))}</p>
<p class="meta">このプレプリント（APA）</p>` : '<p class="meta">APA</p>'}
<p class="cite" lang="en">${esc(apa(p))}</p>
<p class="meta">Chicago（著者・年）</p>
<p class="cite" lang="en">${esc(chicago(p))}</p>
<p class="meta">BibTeX</p>
<pre lang="en">${esc(bibtex(p))}</pre>
<p class="meta">ダウンロード：<a href="../cite/${esc(p.id)}.bib">BibTeX</a> · <a href="../cite/${esc(p.id)}.ris">RIS</a> · <a href="../cite/${esc(p.id)}.json">CSL-JSON</a></p>
<h2>版</h2>
<div class="table"><table><tr><th scope="col">版</th><th scope="col">日付</th><th scope="col">DOI</th><th scope="col">預け先</th></tr>${versions}</table></div>
<h2>言語モデルなどの生成モデルの使用</h2>
${p.llm_extent ? `<p class="meta">程度（著者の申告）：<span lang="en">${esc(SITE.llmExtents[p.llm_extent])}</span>（${esc(LLM_EXTENTS_JA[p.llm_extent])}）</p>
` : ''}<p${wl(p.llm_disclosure)}>${esc(p.llm_disclosure)}</p>
${statementsJa}${notes ? `<h2>注記と訂正</h2><ul>${notes}</ul>` : ''}
${relatedHtml}<h2>共有</h2>
<p class="share">${share}</p>
${recordDoi(p) ? `<p class="meta">記録の DOI：<a href="https://doi.org/${esc(recordDoi(p))}">${esc(recordDoi(p))}</a></p>\n` : ''}<p class="meta">投稿：<a href="${esc(SITE.repo)}/issues/${p.issue}">issue #${p.issue}</a> · <a href="${esc(SITE.repo)}/issues/new?template=correction.yml&amp;id=${esc(p.id)}">この記録の誤りを知らせる</a> · <a href="https://web.archive.org/web/${esc(SITE.baseUrl + 'abs/' + p.id + '.html')}">インターネット・アーカイブに保存された写し</a></p>
`;
  return page({
    title: p.title + '（日本語の頁） | ' + SITE.name,
    description: SITE.name + ' の記録 ' + p.id + ' の日本語の頁。題と要旨は著者の言語のままです。',
    rel: true,
    lang: 'ja',
    canonical: 'abs/' + p.id + '.ja.html',
    body,
    head: recordAlternates(p),
    image: hasCard(p) ? SITE.baseUrl + 'card/' + p.id + '.png' : null,
  });
}

function sortListing(papers) {
  return papers.slice().sort((a, b) => (latest(b).date + b.id).localeCompare(latest(a).date + a.id));
}

/* A listing in Japanese (ja) names the fields and the flags in Japanese and links the Japanese record pages. */
function listing(papers, up, empty, ja = false) {
  if (!papers.length) return `<p class="meta">${empty}</p>`;
  const flag = (en, jp, own) => `<span class="flag${own ? ' own' : ''}">${ja ? jp : en}</span>`;
  const items = sortListing(papers).map((p) => `<li>
<p class="meta"><span class="id">${esc(p.id)}</span> · ${esc((ja ? SITE.categoriesJa : SITE.categories)[p.category])} · ${esc(p.versions[0].date)}${p.status === 'withdrawn' ? flag('withdrawn', '撤回') : ''}${p.published ? flag('published', '出版済み') : ''}${p.operator_own ? flag('operator’s own submission', '運営者自身の投稿', true) : ''}</p>
<a href="${up}abs/${esc(p.id)}${ja ? '.ja' : ''}.html"${ja ? langAttr(authorLang(p, p.title)) : ''}><b>${esc(p.title)}</b></a>
<p class="meta"${ja ? ' lang="en"' : ''}>${esc(authorsText(p))}</p>
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

/* Continuity in the Terms of Use: when the operator cannot handle submissions, the top page and the submit page say so. */
function pausedNotice(paused = SITE.submissionsPaused) {
  return paused ? `<div class="notice"><b>New submissions are paused.</b> The operator cannot work on Sophaxis for now. Listed records stay online, and submissions open again when this notice goes.</div>\n` : '';
}

/* Changes and closure in the Terms of Use: a change against users is announced on the top page before it takes effect.
 * site.json "termsNotice": { "text": "...", "from": "YYYY-MM-DD" } or null. */
function termsNotice(n = SITE.termsNotice) {
  return n && n.text && n.from ? `<div class="notice"><b>Change to the policies from ${esc(n.from)}.</b> ${esc(n.text)} See the <a href="./policy.html">policies</a>.</div>\n` : '';
}

/* Who Sophaxis is not offered to, and why, on the top page and the submit page: by where an author lives, never by
 * nationality or race, because a law there requires, or is reported to require, a representative, local storage or
 * registration (site.json "notOffered" and "scopeNotice"). */
const placeList = (names) => names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
/* A place added later carries its own day ("from" in site.json); it is named after the others, with that day. */
const placeGroups = (L) => {
  const later = {};
  for (const p of L) if (p.from && p.from > SITE.residenceFrom) (later[p.from] = later[p.from] || []).push(p);
  return [L.filter((p) => !p.from || p.from <= SITE.residenceFrom), Object.entries(later).sort()];
};
const notOfferedPlaces = (L = SITE.notOffered || []) => { const [first, later] = placeGroups(L); return placeList(first.map((p) => p.place)) + later.map(([d, ps]) => '; and, from ' + d + ', ' + placeList(ps.map((p) => p.place))).join(''); };
const notOfferedPlacesJa = (L = SITE.notOffered || []) => { const [first, later] = placeGroups(L); return first.map((p) => p.ja).join('、') + later.map(([d, ps]) => '、' + d + ' からは' + ps.map((p) => p.ja).join('、')).join(''); };
function scopeNotice(text = SITE.scopeNotice, L = SITE.notOffered || []) {
  return text ? `<div class="notice"><b>Not offered in ${L.length} places.</b> ${esc(text)} The places are ${esc(notOfferedPlaces(L))}. See the <a href="./policies/submission.html">Submission Policy</a>, which gives the law of each, and the <a href="./policies/privacy.html">Privacy Policy</a>.</div>\n` : '';
}

/* The day the records last changed: a record added, a new version, a note, an update, a withdrawal or a removal.
 * The ISSN Japan Centre asks a database to show its last update and how often it is updated.
 * With `text`, the later of that day and the day the rest of the page last changed: the top pages show the notices and
 * other text from site.json, and the Terms say that the date on each page shows its last change. That day is kept in
 * site.json ("topUpdated", one per language, Japan time), so that a build needs no git history and gives the same page
 * in any clone; verification/check.js (121) compares it with the history of the built page and fails when they differ. */
function lastUpdated(all, text) {
  return all.map((p) => (p.status === 'removed' ? p.removal_date : [changed(p), p.listed, p.updated].filter(Boolean).sort().pop())).concat([text]).filter(Boolean).sort().pop() || SITE.since;
}
const topUpdated = (lang) => (SITE.topUpdated || {})[lang];

/* An ISSN is valid when its check digit (ISO 3297, modulus 11) matches. */
function issnOk(s) {
  const m = /^(\d{4})-(\d{3})([\dX])$/.exec(String(s || ''));
  if (!m) return false;
  const d = (m[1] + m[2]).split('').map(Number);
  const sum = d.reduce((t, x, i) => t + x * (8 - i), 0);
  const c = (11 - (sum % 11)) % 11;
  return m[3] === (c === 10 ? 'X' : String(c));
}

/* Registries that list Sophaxis itself, where the operator submitted a record and the registry put it up (site.json listedIn).
 * No review is claimed: ROAR's own pages describe an editor's approval of a deposit, not what is checked. Only a listing that can be
 * opened goes here; an application under review stays in the README. */
function listedIn() {
  return (SITE.listedIn || []).map((x) => `<p class="meta">Listed in <a href="${esc(x.url)}">${esc(x.name)}</a>, ${esc(x.description)}, since ${esc(x.since)} (Japan time).</p>\n`).join('');
}
/* Directories where the operator added the entry (site.json directoryEntries). Shown with the page, the sections and the day
 * the entry was last confirmed, and said plainly to be no review of Sophaxis; they are not part of listedIn. */
function directoryEntries(ja = false) {
  return (SITE.directoryEntries || []).map((x) => ja
    ? `<p class="meta">${esc(x.name)} の <a href="${esc(x.url)}">${esc(x.page)}</a> の頁に、${x.sections.map(esc).join(' と ')} の欄で掲載されています（${esc(x.asOf)} 現在）。項目は運営者が書き足したもので、${esc(SITE.name)} の審査ではありません。</p>\n`
    : `<p class="meta">Listed on the <a href="${esc(x.url)}">${esc(x.page)}</a> page of the ${esc(x.name)}, under ${x.sections.map(esc).join(' and ')}, as of ${esc(x.asOf)} (Japan time). The operator added the entry; it is not a review of ${esc(SITE.name)}.</p>\n`).join('');
}

/* The identifiers of Sophaxis itself, side by side: the OSF project and the archive of the code and records at Zenodo.
 * Neither names a listed work. */
function ownIdentifiers() {
  const parts = [];
  if (SITE.osf) parts.push(`OSF project DOI <a href="https://doi.org/${esc(SITE.osf.doi)}">${esc(SITE.osf.doi)}</a>`);
  if (SITE.zenodo) parts.push(`Zenodo DOI <a href="https://doi.org/${esc(SITE.zenodo.doi)}">${esc(SITE.zenodo.doi)}</a> (the code and the records, every version)`);
  return parts.length ? `<p class="meta">${esc(SITE.name)} itself: ${parts.join(' · ')}. Neither names a listed work; cite a work by its own DOI.</p>\n` : '';
}

/* Conflicts of interest, on the top page: how many of the records shown are the operator's own, from the records, so that
 * Sophaxis is not taken for a shelf of the operator's own work. Nothing is said when none is. */
function ownNotice(all, ja = false) {
  const shown = all.filter((p) => p.status !== 'removed');
  const own = shown.filter((p) => p.operator_own === true).length;
  if (!own) return '';
  const every = own === shown.length;
  if (ja) {
    return `<div class="notice">${every ? `これまでに載った作品は、すべて運営者のものです（示している記録 ${shown.length} 件のうち ${own} 件）。` : `示している記録 ${shown.length} 件のうち ${own} 件は、運営者の作品です。`}運営者は Sophaxis を一人で運営し、いまはただ一人のモデレーターでもあります。運営者の作品には、一覧と記録の頁で印を付けています（日本語の頁では「運営者自身の投稿」、英語の頁では「operator’s own submission」）。ほかの作品より先に扱うことはしません（<a href="./policies/moderation.ja.html">モデレーションの規程</a>の「利益相反」）。Sophaxis は運営者の作品を並べるための場ではありません。分野に合う研究者の作品を載せる場です。${every ? 'ほかの研究者からの最初の投稿を待っています。' : ''}<a href="./call.ja.html">研究者の方へ</a></div>\n`;
  }
  return `<div class="notice">${every ? `Every work listed so far is by the operator (${own} of the ${shown.length} records shown).` : esc(ownShare(all))} The operator runs ${esc(SITE.name)} alone and is at present its only moderator. Each of these works is marked “operator’s own submission” in the listing and on its record page, and gets no priority (<a href="./policies/moderation.html">Moderation Policy</a>, “Conflicts of interest”). ${esc(SITE.name)} is not a shelf for the operator’s own work: it lists work by any researcher in its fields.${every ? ' The first submissions from other researchers are welcome.' : ''} <a href="./call.html">A call to researchers</a></div>\n`;
}

/* Operating counts on the top page: submissions received and accepted, and the median days to a decision, in the latest year
 * recorded in data/reports (tools/report.js counts them from the public issues), and the records listed now. None is written by hand. */
function operatingCounts(all, reports = loadReports(), ja = false) {
  const listed = all.filter((p) => p.status === 'listed').length;
  const removed = all.filter((p) => p.status === 'removed').length;
  const r = reports[0];
  if (!r) return ja ? `<p class="meta">いま載っている作品 ${listed} 件。年ごとの数は、まだ記していません。</p>\n` : `<p class="meta">Listed now: ${listed}. No year has been counted yet.</p>\n`;
  const med = r.daysToDecision.median;
  if (ja) {
    return `<p class="meta">運営の数（記録から作っています）：${r.year} 年${r.complete ? '' : '（' + esc(r.asOf) + ' までの数）'}の受付 ${r.submissions.opened} 件、受理 ${r.submissions.accepted} 件、投稿から判断までの日数の中央値 ${med === null ? '–' : med + ' 日'}。いま載っている作品 ${listed} 件${removed ? '、削除した記録 ' + removed + ' 件' : ''}。詳しくは<a href="./decisions.html">年ごとの判断</a>と<a href="./stats.html">統計</a>（どちらも英語）にあります。</p>\n`;
  }
  const n = (k, one, many) => k + ' ' + (k === 1 ? one : many);
  return `<p class="meta">Operating counts, from the records: in ${r.year}${r.complete ? '' : ' (counted up to ' + esc(r.asOf) + ')'}, ${n(r.submissions.opened, 'submission', 'submissions')} received and ${r.submissions.accepted} accepted; median days from submission to a decision: ${med === null ? '–' : med}. Listed now: ${listed}.${removed ? ' Removed: ' + removed + '.' : ''} <a href="./decisions.html">Decisions by year</a> · <a href="./stats.html">Statistics</a></p>\n`;
}

function indexPage(papers, all = papers) {
  const last = lastUpdated(all, topUpdated('en'));
  const body = `
<h1>${esc(SITE.tagline)}</h1>
${pausedNotice()}${scopeNotice()}${termsNotice()}<p>${esc(SITE.name)} lists preprints in philosophy, mathematics, logic, the philosophy of mathematics and the philosophy of science. Authors deposit their work in an open repository; ${esc(SITE.name)} moderates the submission and gives it a stable record page.</p>
<div class="notice">Acceptance is moderation, not peer review. The quality of listed work is not guaranteed. Work made with language models or other generative models is accepted when the use is disclosed. ${esc(SITE.name)} charges nothing, to authors or to readers.</div>
<p class="meta">Last updated: <time datetime="${last}">${last}</time>. Records are added as they are accepted, and every record is checked once a week.${SITE.issn ? ' ISSN ' + esc(SITE.issn) + ' (online).' : ''}</p>
${operatingCounts(all)}${listedIn()}${directoryEntries()}${ownIdentifiers()}<h2>Listing</h2>
${ownNotice(all)}
${fields(papers, '', './')}
<p class="meta">By topic: <a href="./collections.html">Collections</a>. By month: <a href="./months.html">New by month</a>. Researchers: <a href="./call.html">a call to submit</a>.</p>
${listing(papers, './', 'No preprints are listed yet.')}
`;
  return page({
    title: SITE.name,
    description: SITE.name + ' is an overlay preprint server for philosophy and mathematics. It charges nothing, to authors or to readers.',
    rel: false,
    canonical: '',
    head: rootAlternates('index'),
    body,
  });
}

/* Collections by topic: a page and an Atom feed for each collection in site.json, and the index of them. */
const collectionOf = (slug) => (SITE.collections || []).find((c) => c.slug === slug);
function collectionLinks(p) {
  const mine = (p.collections || []).map(collectionOf).filter(Boolean);
  return mine.length ? `<p class="meta">In ${mine.length === 1 ? 'the collection' : 'the collections'} ${mine.map((c) => `<a href="../collection/${esc(c.slug)}.html">${esc(c.name)}</a>`).join(', ')}.</p>` : '';
}
function collectionPage(papers, c) {
  const mine = papers.filter((p) => (p.collections || []).includes(c.slug));
  const body = `
<h1>${esc(c.name)}</h1>
<p>${esc(c.description)} A collection by topic, chosen by the moderator; it says nothing of the quality of a work. <a href="./${esc(c.slug)}.xml">Atom feed</a> · <a href="../collections.html">All collections</a></p>
${listing(mine, '../', 'No preprint is in this collection yet.')}
`;
  return page({ title: c.name + ' | ' + SITE.name, description: 'Preprints on ' + c.name.toLowerCase() + ' listed on ' + SITE.name + '.', rel: true, canonical: 'collection/' + c.slug + '.html', body });
}
function collectionsPage(papers) {
  const items = (SITE.collections || []).map((c) => `<li><a href="./collection/${esc(c.slug)}.html"><b>${esc(c.name)}</b></a> (${papers.filter((p) => (p.collections || []).includes(c.slug)).length})<p class="meta">${esc(c.description)}</p></li>`).join('\n');
  const body = `
<h1>Collections</h1>
<p>Records grouped by topic, beside the fields. The moderator chooses the collections of a record; a record can be in more than one, or in none. A collection says nothing of the quality of a work.</p>
<ul class="list">${items}</ul>
`;
  return page({ title: 'Collections | ' + SITE.name, description: 'The preprints listed on ' + SITE.name + ', grouped by topic.', rel: false, canonical: 'collections.html', body });
}

/* How many records a field page shows, and the day the newest of them was listed, from the records. */
function fieldFacts(mine) {
  if (!mine.length) return '';
  const newest = mine.map((p) => p.listed).filter(Boolean).sort().pop();
  return `<p class="meta">Records in this field: ${mine.length}${mine.some((p) => p.status === 'withdrawn') ? ', withdrawn ones included' : ''}. Latest listed: ${newest ? `<time datetime="${esc(newest)}">${esc(newest)}</time>` : 'not recorded'}.</p>\n`;
}
function fieldPage(papers, slug) {
  const label = SITE.categories[slug];
  const mine = papers.filter((p) => cats(p).includes(slug));
  const body = `
<h1>${esc(label)}</h1>
${fields(papers, slug, '../')}
${fieldFacts(mine)}<p class="meta">New in this field: <a href="./${esc(slug)}.xml">Atom feed</a>.</p>
${listing(mine, '../', 'No preprints are listed in this field yet.')}
`;
  return page({
    title: label + ' | ' + SITE.name,
    description: 'Preprints in ' + label + ' listed on ' + SITE.name + '.',
    rel: true,
    canonical: 'list/' + slug + '.html',
    body,
    head: `<link rel="alternate" type="application/atom+xml" title="${esc(SITE.name)}: ${esc(label)}" href="./${esc(slug)}.xml">\n`,
  });
}

function submitPage() {
  const body = `
<h1>Submit a preprint</h1>
${pausedNotice()}${scopeNotice()}<p>New to ${esc(SITE.name)}? <a href="./process.html">From submission to listing</a> follows one submission step by step, through the automatic check and moderation. The <a href="./checklist.html">checklist</a> gathers what a submission needs, with two paper templates. The form is also <a href="${esc(SITE.repo)}/issues/new?template=submission-ja.yml">in Japanese</a>.</p>
<ol>
<li>Deposit your preprint in ${andOr(Object.values(SITE.repositories).map((n) => `<a href="${esc(SITE.repositoryHomes[n])}">${esc(n)}</a>`), 'or')} under ${andOr(Object.values(SITE.licenses).map(esc), 'or')}, and note its DOI.</li>
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
  ['withdrawal', 'How an author withdraws a listed work, and what stays.'],
  ['takedown', 'How to ask for removal, and what happens then.'],
];
const policySource = (slug) => fs.readFileSync(path.join(ROOT, 'policies', slug + '.md'), 'utf8');
const policyTitle = (slug) => policySource(slug).split('\n')[0].replace(/^# /, '');

function policyPage() {
  const md = fs.readFileSync(path.join(ROOT, 'policy.md'), 'utf8');
  const list = `<h2>The policies</h2>
<ul>${POLICIES.map(([slug, what]) => `<li><a href="./policies/${slug}.html">${esc(policyTitle(slug))}</a>: ${esc(what)}</li>`).join('')}</ul>`;
  const html = markdown(md).replace('<h2>What Sophaxis is not</h2>', list + '\n<h2>What Sophaxis is not</h2>');
  return page({ title: 'Policies | ' + SITE.name, description: 'Terms, submission, moderation, copyright, licences, privacy, withdrawal and takedown at ' + SITE.name + '.', rel: false, canonical: 'policy.html', head: rootAlternates('policy'), body: html, src: 'policy.md' });
}

/* Counts taken from the records each time the site is built, and links to every public decision. */
/* Conflicts of interest in the Moderation Policy: how many records shown are the operator's own, said where the records are counted. */
function ownShare(all) {
  const shown = all.filter((p) => p.status !== 'removed');
  const own = shown.filter((p) => p.operator_own === true).length;
  return own + ' of the ' + shown.length + ' records shown ' + (own === 1 ? 'is' : 'are') + ' the operator’s own submissions.';
}

function statsPage(all) {
  const count = (f) => all.filter(f).length;
  const shown = all.filter((p) => p.status !== 'removed');
  const row = (k, n) => `<tr><td>${esc(k)}</td><td>${n}</td></tr>`;
  const table = (head, rows) => `<div class="table"><table><tr><th scope="col">${esc(head)}</th><th scope="col">Records</th></tr>${rows.join('')}</table></div>`;
  const issues = (label, text) => `<li><a href="${esc(SITE.repo)}/issues?q=${encodeURIComponent('label:' + label)}">${esc(text)}</a></li>`;
  const body = `
<h1>Statistics</h1>
<p>These counts are taken from the records each time the site is built. Every decision behind them is public in its GitHub issue.</p>
<h2>Records</h2>
${table('Status', [row('Listed', count((p) => p.status === 'listed')), row('Withdrawn', count((p) => p.status === 'withdrawn')), row('Removed', count((p) => p.status === 'removed')), row('All', all.length)])}
<h2>The operator’s own submissions</h2>
<p>${esc(ownShare(all))} The operator is at present the only moderator, and decides on these too; the <a href="./policies/moderation.html">Moderation Policy</a> says how, under “Conflicts of interest”.</p>
<h2>Published versions</h2>
<p>A listed preprint stays listed when a later version is published. Whether it was peer-reviewed is what the authors state.</p>
${table('Published version', [row('Published', count((p) => p.status !== 'removed' && p.published)), row('Peer-reviewed, as the authors state', count((p) => p.status !== 'removed' && p.published && p.published.peer_reviewed === true)), row('Linked by the publisher’s metadata', count((p) => p.status !== 'removed' && p.published && p.published.evidence === 'publisher'))])}
<h2>By field</h2>
<p>A record listed in more than one field is counted in each.</p>
${table('Field', Object.entries(SITE.categories).map(([slug, name]) => row(name, shown.filter((p) => cats(p).includes(slug)).length)))}
<h2>By repository</h2>
<p>The repository of the latest version.</p>
${table('Repository', [...new Set(Object.values(SITE.repositories))].map((name) => row(name, shown.filter((p) => repoName(latest(p).doi) === name).length)).filter((r) => !/<td>0<\/td><\/tr>$/.test(r)))}
<h2>Use of generative models</h2>
<p>The extent that the authors state, at one of the levels the submission form offers. Records listed before ${esc(SITE.llmExtentFrom)} may not state one.</p>
${table('Extent', Object.entries(SITE.llmExtents).map(([k, label]) => row(label, shown.filter((p) => p.llm_extent === k).length)).concat([row('Not stated', shown.filter((p) => !p.llm_extent).length)]))}
<h2>Decisions and requests</h2>
<p>The <a href="./decisions.html">Decisions by year</a> page counts them for each year, with the reasons named for declining.</p>
<ul>
${issues('accepted', 'Accepted submissions')}
${issues('declined', 'Declined submissions')}
${issues('withdrawal', 'Withdrawal requests')}
${issues('published', 'Published versions reported')}
${issues('correction', 'Error reports')}
${issues('removal', 'Removal requests made in public')}
</ul>
<p class="meta">Removal requests sent by email are not public. The record of a removed work says only that it was removed.</p>
`;
  return page({ title: 'Statistics | ' + SITE.name, description: 'How many records ' + SITE.name + ' lists, by status, field and repository, with links to every public decision.', rel: false, canonical: 'stats.html', body });
}

/* What Sophaxis does not promise, in one place. The Terms of Use apply where they differ. */
const disclaimerSource = () => fs.readFileSync(path.join(ROOT, 'disclaimer.md'), 'utf8');
/* The Disclaimer and its Japanese translation point at each other, as the policy pages do. */
const disclaimerJaSource = () => fs.readFileSync(path.join(ROOT, 'disclaimer.ja.md'), 'utf8');
const disclaimerAlternates = () => `<link rel="alternate" hreflang="en" href="${esc(SITE.baseUrl)}disclaimer.html">\n<link rel="alternate" hreflang="ja" href="${esc(SITE.baseUrl)}disclaimer.ja.html">\n`;
function disclaimerPage() {
  return page({ title: 'Disclaimer | ' + SITE.name, description: 'What ' + SITE.name + ' does not promise: peer review, metadata, identity, affiliation, links, availability and liability.', rel: false, canonical: 'disclaimer.html', head: disclaimerAlternates(), body: markdown(disclaimerSource()), src: 'disclaimer.md' });
}
function disclaimerJaPage() {
  return page({ title: '免責事項（日本語訳） | ' + SITE.name, description: SITE.name + ' の免責事項の日本語訳。', rel: false, canonical: 'disclaimer.ja.html', lang: 'ja', head: disclaimerAlternates(), body: markdown(disclaimerJaSource()), src: 'disclaimer.ja.md' });
}

/* For the repositories and the DOI registration agencies: what Sophaxis reads from them and what it shows.
 * The list of repositories comes from site.json, so it cannot fall behind. */
/* Thanks to every service Sophaxis relies on: the repositories of site.json, then the agencies and the infrastructure. */
const SERVICES = [
  ['DataCite', 'https://datacite.org', 'DOI metadata, openly available under CC0'],
  ['Crossref', 'https://www.crossref.org', 'DOI metadata, openly available through its REST API'],
  ['Japan Link Center (JaLC)', 'https://japanlinkcenter.org', 'DOI metadata for Jxiv'],
  ['ORCID', 'https://orcid.org', 'public records through its public API, for the identity check'],
  ['the Internet Archive', 'https://archive.org', 'saved copies of the pages and the PDF copies'],
  ['GitHub', 'https://github.com', 'the repository, the submissions and the automatic checks'],
  ['Vercel', 'https://vercel.com', 'serving the site'],
];
function acknowledgements() {
  const repos = Object.values(SITE.repositories).map((n) => `<li><a href="${esc(SITE.repositoryHomes[n])}">${esc(n)}</a>, for keeping the deposits and their DOIs</li>`);
  const others = SERVICES.map(([n, u, what]) => `<li><a href="${esc(u)}">${esc(n)}</a>, for ${esc(what)}</li>`);
  return '<ul>' + repos.concat(others).join('') + '</ul>';
}

const repositoriesSource = () => fs.readFileSync(path.join(ROOT, 'repositories.md'), 'utf8');
/* The two lists of the page for repositories, filled in the English page and in its translation alike. */
function repositoriesFill(html) {
  const list = '<ul>' + Object.entries(SITE.repositories).map(([prefix, name]) => `<li>${esc(name)}: DOIs beginning <code>${esc(prefix)}</code></li>`).join('') + '</ul>';
  return html.replace('<p>{{repositories}}</p>', list).replace('<p>{{acknowledgements}}</p>', acknowledgements());
}
function repositoriesPage() {
  return page({ title: 'For repositories and DOI registration agencies | ' + SITE.name, description: 'What ' + SITE.name + ' reads from repositories and DOI registration agencies, how often, and what it shows.', rel: false, canonical: 'repositories.html', head: rootAlternates('repositories'),
    body: repositoriesFill(markdown(repositoriesSource())), src: 'repositories.md' });
}

/* One submission followed from start to finish, for people who come from the site. */
const processSource = () => fs.readFileSync(path.join(ROOT, 'process.md'), 'utf8');
function processPage() {
  return page({ title: 'From submission to listing | ' + SITE.name, description: 'How a submission to ' + SITE.name + ' goes from the form through the automatic check and moderation to a record page.', rel: false, canonical: 'process.html', head: rootAlternates('process'), body: markdown(processSource()), src: 'process.md' });
}

/* Every step that runs by itself: when, what it reads and writes, and what it leaves to the operator. */
const automationSource = () => fs.readFileSync(path.join(ROOT, 'automation.md'), 'utf8');
/* The operator's self-assessment against the Principles of Transparency and Best Practice in Scholarly Publishing. */
const transparencySource = () => fs.readFileSync(path.join(ROOT, 'transparency.md'), 'utf8');
/* Prose pages at the root that need nothing but their Markdown: the call for an advisory board, the name and logo, and the page
 * for anyone introducing Sophaxis, whose facts are filled in from site.json and the records, so that no number is typed by hand. */
const TEMPLATES = ['paper.md', 'paper.tex'];
const PROSE = { checklist: 'Before submitting to ' + SITE.name + ': what the policies ask, gathered in one list, with examples of a statement on generative models and two paper templates.',
  history: 'How ' + SITE.name + ' began on ' + SITE.since + ', where its name comes from, and what has happened since.',
  leaflet: SITE.name + ' on one page: what it is, what it is not, and how to submit.',
  first: 'For anyone making a preprint public for the first time: the paper, the licence, choosing a repository, depositing, and then ' + SITE.name + '.',
  libraries: 'For library staff: what ' + SITE.name + ' is, how to point readers to it, and how to harvest its records.',
  rules: 'Every policy of ' + SITE.name + ' in brief, with a link to each; the policies themselves govern.',
  easy: SITE.name + ' in plain words: what it is and how to send a paper, in short sentences.',
  advisory: 'The call for an advisory board of ' + SITE.name + ': what an adviser does, who can join and how.',
  brand: 'The name, the logo, the colours of ' + SITE.name + ', and the badge for listed works.',
  press: 'For anyone introducing ' + SITE.name + ': a sentence, a paragraph, the facts, and what it is not.',
  call: 'A call to researchers in philosophy and mathematics to submit to ' + SITE.name + ': what a listed work gets, what it is not, and what a submission needs.',
  findable: 'How the authors of a work listed on ' + SITE.name + ' can help readers find it: ORCID, Google Scholar, PhilPapers and researchmap.',
  accessibility: 'The accessibility of ' + SITE.name + ': the aim, what is checked on every change, what is known, and how to report a barrier.',
  compare: 'How ' + SITE.name + ' differs from arXiv, PhilArchive, SSRN and Zenodo: a layer on top of the repositories, not one of them.',
  glossary: 'The words used on ' + SITE.name + ', defined: overlay, moderation, record, version, withdrawal, removal and others.' };
const proseSource = (slug) => fs.readFileSync(path.join(ROOT, slug + '.md'), 'utf8');
const proseDate = (slug) => (/Last updated: (\d{4}-\d{2}-\d{2})\./.exec(proseSource(slug)) || [])[1];
let pressRecords = [];
function pressFacts(html, ja = false) {
  const shown = pressRecords.filter((p) => p.status !== 'removed');
  const listed = (SITE.listedIn || []).map((x) => `<a href="${esc(x.url)}">${esc(x.name)}</a>${ja ? '（' + esc(x.since) + ' から）' : ' (since ' + esc(x.since) + ')'}`).join(', ');
  const rows = ja ? [['始まった日', esc(SITE.since)], ['載っている記録', String(shown.length)], ['分野', Object.keys(SITE.categories).map((k) => esc(SITE.categoriesJa[k])).join('・')],
    ['掲載先', listed], ['受け付けるライセンス', Object.values(SITE.licenses).map(esc).join('、')], ['料金', 'なし（著者からも読者からも）'],
    ['運営者', `${esc(SITE.operator.name)}（<a href="https://orcid.org/${esc(SITE.operator.orcid)}">ORCID ${esc(SITE.operator.orcid)}</a>）`],
    ['ソースコード', `<a href="${esc(SITE.repo)}">GitHub</a>`], ['保存版', `<a href="https://doi.org/${esc(SITE.zenodo.doi)}">${esc(SITE.zenodo.doi)}</a>（Zenodo）`]]
    : [['Started', esc(SITE.since)], ['Records shown', String(shown.length)], ['Fields', Object.values(SITE.categories).map(esc).join(', ')],
      ['Listed in', listed], ['Licences accepted', Object.values(SITE.licenses).map(esc).join(', ')], ['Fees', 'None, to authors or to readers'],
      ['Operator', `${esc(SITE.operator.name)} (<a href="https://orcid.org/${esc(SITE.operator.orcid)}">ORCID ${esc(SITE.operator.orcid)}</a>)`],
      ['Source code', `<a href="${esc(SITE.repo)}">GitHub</a>`], ['Archived version', `<a href="https://doi.org/${esc(SITE.zenodo.doi)}">${esc(SITE.zenodo.doi)}</a> (Zenodo)`]];
  const table = `<div class="table"><table><tr><th scope="col">${ja ? '項目' : 'Fact'}</th><th scope="col">${ja ? '内容' : 'Value'}</th></tr>${rows.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v}</td></tr>`).join('')}</table></div>`;
  if (!html.includes('<p>&lt;!-- facts --&gt;</p>')) throw new Error('press: the place for the facts is missing');
  return html.replace('<p>&lt;!-- facts --&gt;</p>', table);
}
/* The page on a first preprint lists the accepted repositories from site.json, linked to their own pages. */
function repositoriesFillList(html) {
  if (!html.includes('<p>&lt;!-- repositories --&gt;</p>')) throw new Error('first: the place for the repositories is missing');
  return html.replace('<p>&lt;!-- repositories --&gt;</p>', '<ul>' + Object.values(SITE.repositories).map((n) => `<li><a href="${esc(SITE.repositoryHomes[n])}">${esc(n)}</a></li>`).join('') + '</ul>');
}
/* The history page lists every news item, oldest first, from data/news.json, so that no date is typed twice. */
function historyFill(html, ja = false) {
  if (!html.includes('<p>&lt;!-- timeline --&gt;</p>')) throw new Error('history: the place for the timeline is missing');
  const items = loadNews().slice().reverse();
  return html.replace('<p>&lt;!-- timeline --&gt;</p>', '<ul>' + items.map((n) => `<li>${esc(n.date)}: ${esc(n.title)}</li>`).join('') + '</ul>'
    + `<p class="meta">${ja ? 'お知らせの題は英語のままです。本文は<a href="./news.html">お知らせ</a>にあります。' : 'Each item is told in full under <a href="./news.html">News</a>.'}</p>`);
}
function prosePage(slug) {
  const src = proseSource(slug);
  const title = src.split('\n')[0].replace(/^# /, '');
  const body = markdown(src);
  return page({ title: title + ' | ' + SITE.name, description: PROSE[slug], rel: false, canonical: slug + '.html', head: rootAlternates(slug), body: slug === 'press' ? pressFacts(body) : slug === 'history' ? historyFill(body) : slug === 'first' ? repositoriesFillList(body) : body, src: slug + '.md' });
}

/* New by month: the records shown, grouped by the month in which they were listed, newest first. */
function monthsPage(papers) {
  const byMonth = {};
  sortListing(papers).forEach((p) => { (byMonth[p.listed.slice(0, 7)] = byMonth[p.listed.slice(0, 7)] || []).push(p); });
  const months = Object.keys(byMonth).sort().reverse();
  const name = (m) => new Date(m + '-01T00:00:00Z').toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const body = `
<h1>New by month</h1>
<p>The records shown, by the month in which each was listed on ${esc(SITE.name)}, newest first. A record removed since is not shown.</p>
${months.length ? months.map((m) => `<h2 id="m${esc(m)}">${esc(name(m))} (${byMonth[m].length})</h2>
<ul>${byMonth[m].map((p) => `<li><a href="./abs/${esc(p.id)}.html">${esc(p.title)}</a> <span class="meta">${esc(authorsText(p))} · ${esc(SITE.categories[p.category])} · listed ${esc(p.listed)}</span></li>`).join('')}</ul>`).join('\n') : '<p>No record is shown yet.</p>'}
`;
  return page({ title: 'New by month | ' + SITE.name, description: 'The records of ' + SITE.name + ' by the month in which each was listed.', rel: false, canonical: 'months.html', body });
}

/* News: dated notices from data/news.json, newest first, as a page and an Atom feed. A link is a page of the site or an https address. */
const loadNews = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'news.json'), 'utf8'));
function newsProblems(items) {
  const e = [];
  if (!Array.isArray(items)) return ['data/news.json: a list of notices'];
  items.forEach((n, i) => {
    if (!DATE.test(n.date || '') || !n.title || !n.text) e.push('data/news.json: notice ' + (i + 1) + ' needs a date, a title and a text');
    if (n.url !== undefined && !/^(https:\/\/|[a-z0-9][a-z0-9./-]*\.html$)/.test(n.url)) e.push('data/news.json: notice ' + (i + 1) + ' links a page of the site or an https address');
    if (i > 0 && n.date > items[i - 1].date) e.push('data/news.json: notices are newest first');
  });
  return e;
}
const newsHref = (n, up = './') => (/^https:/.test(n.url) ? n.url : up + n.url);
function newsPage(items) {
  const body = `
<h1>News</h1>
<p>What changed at ${esc(SITE.name)}, newest first. New records are in the <a href="./feed.xml">feed of new preprints</a>; this page is also a feed: <a href="./news.xml">news.xml</a>. Every change is in the <a href="${esc(SITE.repo)}/blob/main/CHANGELOG.md">changelog</a>.</p>
<ol class="list">${items.map((n) => `<li><p class="meta">${esc(n.date)}</p><p><b>${esc(n.title)}</b></p><p>${esc(n.text)}${n.url ? ` <a href="${esc(newsHref(n))}">More</a>` : ''}</p></li>`).join('')}</ol>
`;
  return page({ title: 'News | ' + SITE.name, description: 'What changed at ' + SITE.name + ', newest first.', rel: false, canonical: 'news.html', head: `<link rel="alternate" type="application/atom+xml" title="${esc(SITE.name)}: news" href="./news.xml">\n`, body });
}
function newsFeed(items) {
  const stamp = (d) => d + 'T00:00:00Z';
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${esc(SITE.name)}: news</title>
  <id>${SITE.baseUrl}news.html</id>
  <link rel="self" href="${SITE.baseUrl}news.xml"/>
  <link href="${SITE.baseUrl}news.html"/>
  <updated>${stamp(items.length ? items[0].date : SITE.since)}</updated>
  <author><name>${esc(SITE.operator.name)}</name></author>
${items.map((n, i) => `  <entry>
    <id>${SITE.baseUrl}news.html#n${items.length - i}</id>
    <title>${esc(n.title)}</title>
${n.url ? `    <link href="${esc(newsHref(n, SITE.baseUrl))}"/>\n` : ''}    <updated>${stamp(n.date)}</updated>
    <summary>${esc(n.text)}</summary>
  </entry>`).join('\n')}
</feed>
`;
}

/* Changes to the policies alone, as an Atom feed apart from the news (policies/changes.xml), from data/policy-changes.json:
 * newest first, each with the day it was published, the policies it touches, a title and a text, and `from`,
 * the day it takes effect, when that is later. verification/check.js holds every policy's "Last updated" date to an entry. */
const loadPolicyChanges = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'policy-changes.json'), 'utf8'));
function policyChangeProblems(items) {
  const e = [], slugs = POLICIES.map(([s]) => s);
  if (!Array.isArray(items) || !items.length) return ['data/policy-changes.json: a list of changes, newest first'];
  items.forEach((c, i) => {
    const at = 'data/policy-changes.json: change ' + (i + 1);
    if (!DATE.test(c.date || '') || !c.title || !c.text) e.push(at + ' needs a date, a title and a text');
    if (!Array.isArray(c.policies) || !c.policies.length || !c.policies.every((x) => slugs.includes(x))) e.push(at + ' names one or more of the policies: ' + slugs.join(', '));
    if (c.from !== undefined && !(DATE.test(c.from) && c.from > c.date)) e.push(at + ': from is a day after the date');
    if (i > 0 && c.date > items[i - 1].date) e.push('data/policy-changes.json: changes are newest first');
  });
  return e;
}
function policyChangesFeed(items) {
  const stamp = (d) => d + 'T00:00:00Z';
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${esc(SITE.name)}: changes to the policies</title>
  <subtitle>Only the changes to the policies, newest first. A change that narrows a right is entered when it is announced, with the day it takes effect.</subtitle>
  <id>${SITE.baseUrl}policies/changes.xml</id>
  <link rel="self" href="${SITE.baseUrl}policies/changes.xml"/>
  <link href="${SITE.baseUrl}policy.html"/>
  <updated>${stamp(items[0].date)}</updated>
  <author><name>${esc(SITE.operator.name)}</name></author>
${items.map((c, i) => `  <entry>
    <id>${SITE.baseUrl}policies/changes.xml#c${items.length - i}</id>
    <title>${esc(c.title)}</title>
${c.policies.map((x) => `    <link href="${SITE.baseUrl}policies/${x}.html" title="${esc(policyTitle(x))}"/>\n`).join('')}    <updated>${stamp(c.date)}</updated>
    <summary>${esc(c.text)}${c.from ? ' In effect from ' + esc(c.from) + '.' : ''} Policies: ${esc(c.policies.map(policyTitle).join(', '))}.</summary>
  </entry>`).join('\n')}
</feed>
`;
}
const POLICY_FEED = (up) => `<link rel="alternate" type="application/atom+xml" title="${esc(SITE.name)}: changes to the policies" href="${up}policies/changes.xml">\n`;

/* The badge that the authors of a listed work can show: no typeface of its own beyond the reader's sans-serif, no script. */
function badgeSvg() {
  const l = 'Sophaxis', r = 'listed', w = (t) => 8 + t.length * 7;
  const a = w(l), b = w(r);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${a + b}" height="20" role="img" aria-label="${l}: ${r}"><title>${l}: ${r}</title><rect width="${a}" height="20" fill="#2f4a7a"/><rect x="${a}" width="${b}" height="20" fill="#555"/><g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" text-anchor="middle"><text x="${a / 2}" y="14">${l}</text><text x="${a + b / 2}" y="14">${r}</text></g></svg>
`;
}
function badgeSnippet(p) {
  if (p.status !== 'listed') return '';
  const url = SITE.baseUrl + 'abs/' + p.id + '.html', img = SITE.baseUrl + 'badge.svg';
  return `<h2>Badge</h2>
<p class="meta">For the authors: show that this work is listed, with a link to this record. See <a href="../brand.html">Name, logo and badge</a>; remove it if the work is withdrawn.</p>
<p><img src="../badge.svg" alt="${esc(SITE.name)}: listed" width="99" height="20"></p>
<pre><code>[![${esc(SITE.name)}: listed](${esc(img)})](${esc(url)})</code></pre>
<pre><code>${esc(`<a href="${url}"><img src="${img}" alt="${SITE.name}: listed"></a>`)}</code></pre>
`;
}
function transparencyPage() {
  return page({ title: 'Transparency | ' + SITE.name, description: 'How ' + SITE.name + ' stands against each heading of the Principles of Transparency and Best Practice in Scholarly Publishing: the operator\'s own assessment.', rel: false, canonical: 'transparency.html', head: rootAlternates('transparency'), body: markdown(transparencySource()), src: 'transparency.md' });
}
function automationPage() {
  return page({ title: 'What runs by itself | ' + SITE.name, description: 'Every automatic step of ' + SITE.name + ': when it runs, what it reads and writes, and what it leaves to the operator.', rel: false, canonical: 'automation.html', head: rootAlternates('automation'), body: markdown(automationSource()), src: 'automation.md' });
}

/* Short answers, each drawn from a policy, which applies where they differ. */
const faqSource = () => fs.readFileSync(path.join(ROOT, 'faq.md'), 'utf8');
function faqPage() {
  return page({ title: 'Frequently asked questions | ' + SITE.name, description: 'Short answers about ' + SITE.name + ': moderation, fees, DOIs, repositories, licences, submission, versions, PDF copies, citation and withdrawal.', rel: false, canonical: 'faq.html', head: rootAlternates('faq'), body: markdown(faqSource()), src: 'faq.md' });
}

/* Who runs Sophaxis and how to reach the operator. The email address stays on the ORCID record. */
const contactSource = () => fs.readFileSync(path.join(ROOT, 'contact.md'), 'utf8');
function contactPage() {
  return page({ title: 'Operator and contact | ' + SITE.name, description: 'Who operates ' + SITE.name + ', and how to reach the operator.', rel: false, canonical: 'contact.html', head: rootAlternates('contact'), body: markdown(contactSource()), src: 'contact.md' });
}

/* Japanese pages. The page on personal data follows the headings of Japan's Act on the Protection of Personal Information;
 * the others are translations, and the English text applies where they differ, as the Terms of Use say.
 * The site is in English; each Japanese page is reached from its English page, not from every footer.
 * The two point at each other so that search engines show each to readers of its language. */
/* Japanese versions of the prose pages at the root: <slug>.md has <slug>.ja.md, built as <slug>.ja.html. */
const JA_PAGES = ['first', 'libraries', 'rules', 'checklist', 'history', 'leaflet', 'easy', 'process', 'faq', 'automation', 'contact', 'repositories', 'policy', 'transparency', 'advisory', 'brand', 'press', 'call', 'findable', 'accessibility', 'compare', 'glossary'];
const rootJaSource = (slug) => fs.readFileSync(path.join(ROOT, slug + '.ja.md'), 'utf8');
const hasRootJa = (slug) => JA_PAGES.includes(slug) && fs.existsSync(path.join(ROOT, slug + '.ja.md'));
const rootJaTitle = (slug) => rootJaSource(slug).split('\n')[0].replace(/^# /, '');
const rootAlternates = (slug) => (hasRootJa(slug) || slug === 'index'
  ? `<link rel="alternate" hreflang="en" href="${esc(SITE.baseUrl)}${slug === 'index' ? '' : slug + '.html'}">\n<link rel="alternate" hreflang="ja" href="${esc(SITE.baseUrl)}${slug}.ja.html">\n` : '');
function rootJaPage(slug) {
  const title = rootJaTitle(slug);
  return page({ title: title + ' | ' + SITE.name, description: SITE.name + ' の「' + title + '」の頁。英語の頁の訳です。', rel: false, canonical: slug + '.ja.html', lang: 'ja', head: rootAlternates(slug), body: slug === 'repositories' ? repositoriesFill(markdown(rootJaSource(slug)))
    : slug === 'press' ? pressFacts(markdown(rootJaSource(slug)), true)
    : slug === 'history' ? historyFill(markdown(rootJaSource(slug)), true)
    : slug === 'first' ? repositoriesFillList(markdown(rootJaSource(slug)))
    : slug === 'policy' ? markdown(rootJaSource(slug)).replace('<h2>Sophaxis でないもの</h2>', `<h2>規程の一覧</h2>\n<ul>${POLICIES.filter(([s]) => JA_POLICIES[s]).map(([s]) => `<li><a href="./policies/${s}.ja.html">${esc(jaTitle(s))}</a></li>`).join('')}</ul>\n<h2>Sophaxis でないもの</h2>`)
    : markdown(rootJaSource(slug)), src: slug + '.ja.md' });
}

/* The top page in Japanese. The lists and the statistics stay in English; each record has a Japanese page, linked from the
 * listing here. The titles and abstracts are those of the DOI metadata, in the authors' language. */
function indexJaPage(papers, all = papers) {
  const last = lastUpdated(all, topUpdated('ja'));
  const L = SITE.notOffered || [];
  const jaLinks = Object.keys(JA_POLICIES).map((slug) => `<li><a href="./policies/${slug}.ja.html">${esc(jaTitle(slug))}</a></li>`)
    .concat(['<li><a href="./disclaimer.ja.html">免責事項</a></li>'], JA_PAGES.filter(hasRootJa).map((slug) => `<li><a href="./${slug}.ja.html">${esc(rootJaTitle(slug))}</a></li>`)).join('');
  const body = `
<h1>${esc(SITE.name)}：哲学と数学のプレプリント</h1>
<p>${esc(SITE.name)} は、哲学・数学・論理学・数理哲学・科学哲学のプレプリントを載せるオーバーレイ型のプレプリントサーバーです。著者が作品を公開のリポジトリに預け、${esc(SITE.name)} がその投稿をモデレーションし、作品ごとに安定した記録の頁を作ります。</p>
<div class="notice">掲載はモデレーションであり、査読ではありません。載っている作品の質は保証しません。言語モデルなどの生成モデルを使った作品も、その使用を申告していれば受け付けます。${esc(SITE.name)} は、著者からも読者からも料金を取りません。</div>
<div class="notice"><b>提供しない国と地域があります。</b>Sophaxis は、${L.length} の国と地域（${esc(notOfferedPlacesJa(L))}）に住んでいる著者、または投稿から掲載までのあいだにそこに滞在した著者の作品を載せません。国籍や人種ではなく、住んでいる場所と滞在した場所だけによります。理由と法令は<a href="./policies/submission.ja.html">投稿の規程</a>にあります。</div>
${SITE.termsNotice && SITE.termsNotice.text ? `<div class="notice"><b>規程の変更を告知しています。</b>${esc(SITE.termsNotice.from)} から順に効力を持つ変更です。内容は<a href="./index.html">英語のトップの頁</a>と、各規程の日本語訳にあります。</div>
` : ''}<p class="meta">最終更新：<time datetime="${last}">${last}</time>。記録は受け付けたときに加わり、すべての記録を毎週確かめています。</p>
<p class="meta">一覧と統計は英語です。記録の頁には日本語の頁もあり、下の一覧からつないでいます。作品の題と要旨は、DOI の登録情報のとおり、著者の言語で載せています。</p>
${operatingCounts(all, loadReports(), true)}${directoryEntries(true)}
<h2>日本語の頁</h2>
<ul>${jaLinks}</ul>
<h2>分野と集め</h2>
<ul class="fields" aria-label="分野">${Object.entries(SITE.categories).map(([slug]) => `<li><a href="./list/${slug}.html">${esc(SITE.categoriesJa[slug])}（${papers.filter((p) => cats(p).includes(slug)).length}）</a></li>`).join('')}</ul>
<ul class="fields" aria-label="集め">${(SITE.collections || []).map((c) => `<li><a href="./collection/${esc(c.slug)}.html">${esc(c.ja)}（${papers.filter((p) => (p.collections || []).includes(c.slug)).length}）</a></li>`).join('')}</ul>
<h2>載っている作品</h2>
${ownNotice(all, true)}${listing(papers, './', 'まだ作品は載っていません。', true)}
`;
  return page({ title: SITE.name + '：哲学と数学のプレプリント', description: SITE.name + ' は哲学と数学のオーバーレイ型プレプリントサーバーです。著者からも読者からも料金を取りません。', rel: false, canonical: 'index.ja.html', lang: 'ja', head: rootAlternates('index'), body });
}

const JA_POLICIES = { privacy: '個人情報の取り扱いについて', terms: '利用規約（日本語訳）', submission: '投稿の規程（日本語訳）', moderation: 'モデレーションの規程（日本語訳）', copyright: '著作権の規程（日本語訳）', licences: 'ライセンスの規程（日本語訳）', takedown: '削除の規程（日本語訳）', withdrawal: '撤回の規程（日本語訳）' };
const jaSource = (slug) => fs.readFileSync(path.join(ROOT, 'policies', slug + '.ja.md'), 'utf8');
const privacyJa = () => jaSource('privacy');
const jaTitle = (slug) => jaSource(slug).split('\n')[0].replace(/^# /, '');
const jaDate = (slug, fallback) => (/最終更新：(\d{4}-\d{2}-\d{2})。/.exec(jaSource(slug)) || [, fallback])[1];
const jaAlternates = (slug) => ['en', slug + '.html', 'ja', slug + '.ja.html']
  .reduce((a, x, i, l) => (i % 2 ? a : a + `<link rel="alternate" hreflang="${x}" href="${esc(SITE.baseUrl)}policies/${l[i + 1]}">\n`), '');
const privacyAlternates = () => jaAlternates('privacy');
function jaPolicyPage(slug) {
  return page({ title: jaTitle(slug) + ' | ' + SITE.name, description: slug === 'privacy' ? SITE.name + ' の個人情報の取り扱い。' : SITE.name + ' の' + jaTitle(slug).replace(/（日本語訳）$/, '') + 'の日本語訳。', rel: true, canonical: 'policies/' + slug + '.ja.html', lang: 'ja', head: jaAlternates(slug),
    body: markdown(jaSource(slug)) + '\n<p class="meta"><a href="../policy.html">All policies</a></p>', src: 'policies/' + slug + '.ja.md' });
}
const privacyJaPage = () => jaPolicyPage('privacy');

function onePolicyPage(slug) {
  return page({ title: policyTitle(slug) + ' | ' + SITE.name, description: policyTitle(slug) + ' of ' + SITE.name + '.', rel: true, canonical: 'policies/' + slug + '.html',
    head: JA_POLICIES[slug] ? jaAlternates(slug) : '',
    body: markdown(policySource(slug)) + '\n<p class="meta"><a href="../policy.html">All policies</a></p>', src: 'policies/' + slug + '.md' });
}

/* One page per ORCID iD. Authors without one get no page: a name alone can belong to several people. */
function authorIds(papers) {
  return [...new Set(papers.flatMap((p) => p.authors.filter((a) => a.orcid).map((a) => a.orcid)))].sort();
}

/* Every record of one author as BibTeX, for importing into ORCID ("Import BibTeX") or a reference manager. */
function authorBib(papers, orcid) {
  return sortListing(papers.filter((p) => p.authors.some((a) => a.orcid === orcid))).map((p) => bibtex(p).trim()).join('\n\n') + '\n';
}
function authorPage(papers, orcid) {
  const mine = sortListing(papers.filter((p) => p.authors.some((a) => a.orcid === orcid)));
  const name = mine[0].authors.find((a) => a.orcid === orcid).name;
  const body = `
<h1>${esc(name)}</h1>
<p><a class="id" href="https://orcid.org/${esc(orcid)}">ORCID ${esc(orcid)}</a></p>
<p class="meta">Preprints listed on ${esc(SITE.name)} with this ORCID iD among the authors.</p>
<p><a href="./${esc(orcid)}.bib">BibTeX of all these records</a>, one file to import into an ORCID record or a reference manager.</p>
${listing(mine, '../', '')}
`;
  return page({ title: name + ' | ' + SITE.name, description: 'Preprints by ' + name + ' listed on ' + SITE.name + '.', rel: true, canonical: 'author/' + orcid + '.html', body });
}

/* Atom feed of the listing, newest first. */
/* The Atom feed of every record, of a collection (c), or of a field (field, a slug of site.json categories). */
function feed(papers, c = null, field = null) {
  const sorted = sortListing(c ? papers.filter((p) => (p.collections || []).includes(c.slug)) : field ? papers.filter((p) => cats(p).includes(field)) : papers);
  const stamp = (d) => d + 'T00:00:00Z';
  const updated = stamp([SITE.since].concat(sorted.map(changed)).sort().pop());
  const entries = sorted.map((p) => {
    const url = SITE.baseUrl + 'abs/' + p.id + '.html';
    return `  <entry>
    <id>${url}</id>
    <title>${esc(p.title)}</title>
    <link href="${url}"/>
${p.published ? `    <link rel="related" href="https://doi.org/${esc(p.published.doi)}" title="Published version: ${esc(p.published.venue)}"/>\n` : ''}    <published>${stamp(p.versions[0].date)}</published>
    <updated>${stamp(changed(p))}</updated>
${p.authors.map((a) => `    <author><name>${esc(a.name)}</name>${a.orcid ? `<uri>https://orcid.org/${esc(a.orcid)}</uri>` : ''}</author>`).join('\n')}
${cats(p).map((c) => `    <category term="${esc(c)}" label="${esc(SITE.categories[c])}"/>`).join('\n')}
    <summary>${esc(p.abstract)}</summary>
  </entry>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${esc(SITE.name)}: ${c ? esc(c.name) : field ? esc(SITE.categories[field]) : 'new preprints'}</title>
  <subtitle>${esc(SITE.tagline)}. Moderation, not peer review.</subtitle>
  <id>${SITE.baseUrl}${c ? 'collection/' + c.slug + '.html' : field ? 'list/' + field + '.html' : ''}</id>
  <link rel="self" href="${SITE.baseUrl}${c ? 'collection/' + c.slug + '.xml' : field ? 'list/' + field + '.xml' : 'feed.xml'}"/>
  <link href="${SITE.baseUrl}${c ? 'collection/' + c.slug + '.html' : field ? 'list/' + field + '.html' : ''}"/>
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
    ...(p.abstract_source ? { abstract_source: p.abstract_source } : {}),
    keywords: p.keywords || [],
    categories: cats(p),
    license: p.license,
    ...(p.language ? { language: p.language } : {}),
    versions: p.versions.map((v) => ({ version: v.version, doi: v.doi, date: v.date })),
    listed: p.listed,
    ...(p.updated ? { updated: p.updated } : {}),
    pdfs: (p.pdfs || []).map((x) => ({ version: x.version, url: SITE.baseUrl + 'pdf/' + x.file })),
    ...(p.published ? { published: p.published } : {}),
    ...(p.notices && p.notices.length ? { notices: p.notices } : {}),
    ...(p.collections ? { collections: p.collections } : {}),
    status: p.status,
    llm_disclosure: p.llm_disclosure,
    ...(p.llm_extent ? { llm_extent: p.llm_extent } : {}),
    ...Object.fromEntries(STATEMENT_KEYS.filter(([k]) => p[k]).map(([k]) => [k, p[k]])),
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

/* The reports of decisions, one per year, counted by tools/report.js from the public issues and the records (data/reports). */
function loadReports(dir = path.join(__dirname, 'data', 'reports')) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /^\d{4}\.json$/.test(f)).sort().reverse().map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
}
function reportProblems(r, file) {
  const e = [];
  const n = (x) => Number.isInteger(x) && x >= 0;
  if (!Number.isInteger(r.year) || file !== r.year + '.json') e.push(file + ': the year must be the name of the file');
  if (!DATE.test(r.asOf || '') || r.asOf.slice(0, 4) < String(r.year)) e.push(file + ': asOf is a date in or after the year');
  if (r.complete !== (r.asOf > r.year + '-12-31')) e.push(file + ': complete says whether the year was over when it was counted');
  const s = r.submissions || {};
  if (!['opened', 'accepted', 'declined', 'undecided', 'byOperator'].every((k) => n(s[k])) || s.accepted + s.declined + s.undecided !== s.opened || s.byOperator > s.opened) e.push(file + ': the submissions do not add up');
  if (!r.declineReasons || !Object.values(r.declineReasons).every(n)) e.push(file + ': each reason has a count');
  return e;
}
/* The year in review: what the operator writes each January beside the counts, in data/reports/<year>.md, with headings of the third level.
 * The counts are shown above it, so the text names no count of its own. */
function yearInReview(year) {
  const f = path.join(ROOT, 'data', 'reports', year + '.md');
  if (!fs.existsSync(f)) return '';
  return '<h3>The year in review</h3>\n' + markdown(fs.readFileSync(f, 'utf8').replace(/^## /gm, '### ')) + '\n';
}
function decisionsPage(reports) {
  const row = (k, v) => `<tr><td>${esc(k)}</td><td>${v === null || v === undefined ? '–' : esc(String(v))}</td></tr>`;
  const table = (head, rows) => `<div class="table"><table><tr><th scope="col">${esc(head)}</th><th scope="col">Count</th></tr>${rows.join('')}</table></div>`;
  const year = (r) => `
<h2 id="y${r.year}">${r.year}${r.complete ? '' : ', counted up to ' + esc(r.asOf)}</h2>
${table('Submissions', [row('Opened', r.submissions.opened), row('Accepted', r.submissions.accepted), row('Declined', r.submissions.declined), row('Not decided yet', r.submissions.undecided), row('Opened by the operator', r.submissions.byOperator)])}
${table('Reason named for declining', Object.entries(r.declineReasons).map(([k, v]) => row(k, v)))}
${table('Days from submission to decision', [row('Median', r.daysToDecision.median), row('Longest', r.daysToDecision.longest)])}
${table('Requests and records', [row('Withdrawal requests', r.withdrawalRequests), row('Removal requests made in public', r.removalRequests.opened), row('Upheld', r.removalRequests.upheld), row('Not upheld', r.removalRequests.notUpheld), row('Records withdrawn', r.records.withdrawn), row('Records removed', r.records.removed)])}
${yearInReview(r.year)}`;
  const body = `
<h1>Decisions by year</h1>
<p>Each year, the decisions of the year before are counted from the public GitHub issues and the records by <a href="${esc(SITE.repo)}/blob/main/tools/report.js">tools/report.js</a>, and recorded here. A declined submission counts once under each reason that the moderator named in the issue. Removal requests sent by email are not public and are not counted. Days are counted in Japan time.</p>
${reports.length ? reports.map(year).join('') : '<p>No year has been recorded yet.</p>'}
<p class="meta">The counts of the records now are on the <a href="./stats.html">Statistics</a> page.</p>
`;
  return page({ title: 'Decisions by year | ' + SITE.name, description: 'How many submissions ' + SITE.name + ' accepted and declined each year, the reasons named, and the time to a decision.', rel: false, canonical: 'decisions.html', body });
}

/* Each address with the date it last changed: a record with its latest version, a copy with its version,
 * a policy with its "Last updated" date, and the lists with the newest record. */
function sitemap(papers) {
  const newest = [SITE.since].concat(papers.map(changed)).sort().pop();
  const policyDate = (slug) => (/Last updated: (\d{4}-\d{2}-\d{2})\./.exec(policySource(slug)) || [, newest])[1];
  const latestPolicy = POLICIES.map(([slug]) => policyDate(slug)).sort().pop();
  const urls = [['', [newest, topUpdated('en')].filter(Boolean).sort().pop()], ['submit.html', latestPolicy], ['policy.html', latestPolicy], ['search.html', newest],
    ['contact.html', (/Last updated: (\d{4}-\d{2}-\d{2})\./.exec(contactSource()) || [, newest])[1]],
    ['faq.html', (/Last updated: (\d{4}-\d{2}-\d{2})\./.exec(faqSource()) || [, newest])[1]],
    ['process.html', (/Last updated: (\d{4}-\d{2}-\d{2})\./.exec(processSource()) || [, newest])[1]],
    ['automation.html', (/Last updated: (\d{4}-\d{2}-\d{2})\./.exec(automationSource()) || [, newest])[1]],
    ['transparency.html', (/Last updated: (\d{4}-\d{2}-\d{2})\./.exec(transparencySource()) || [, newest])[1]],
    ['disclaimer.html', (/Last updated: (\d{4}-\d{2}-\d{2})\./.exec(disclaimerSource()) || [, newest])[1]],
    ['disclaimer.ja.html', (/最終更新：(\d{4}-\d{2}-\d{2})。/.exec(disclaimerJaSource()) || [, newest])[1]],
    ['repositories.html', (/Last updated: (\d{4}-\d{2}-\d{2})\./.exec(repositoriesSource()) || [, newest])[1]],
    ['stats.html', newest], ['decisions.html', (loadReports()[0] || {}).asOf || SITE.since]]
    .concat(Object.keys(PROSE).map((slug) => [slug + '.html', proseDate(slug) || newest]), [['news.html', (loadNews()[0] || {}).date || SITE.since], ['months.html', newest]])
    .concat(POLICIES.map(([slug]) => ['policies/' + slug + '.html', policyDate(slug)]))
    .concat(Object.keys(JA_POLICIES).map((slug) => ['policies/' + slug + '.ja.html', jaDate(slug, newest)]))
    .concat(Object.keys(SITE.categories).map((slug) => ['list/' + slug + '.html', newest]))
    .concat([['index.ja.html', [newest, topUpdated('ja')].filter(Boolean).sort().pop()]], JA_PAGES.filter(hasRootJa).map((slug) => [slug + '.ja.html', (/最終更新：(\d{4}-\d{2}-\d{2})。/.exec(rootJaSource(slug)) || [, newest])[1]]))
    .concat([['collections.html', newest]], (SITE.collections || []).map((c) => ['collection/' + c.slug + '.html', newest]))
    .concat(authorIds(papers).map((o) => ['author/' + o + '.html', papers.filter((p) => p.authors.some((a) => a.orcid === o)).map(changed).sort().pop()]))
    .concat(papers.flatMap((p) => [['abs/' + p.id + '.html', changed(p)], ['abs/' + p.id + '.ja.html', changed(p)]]))
    .concat(papers.flatMap((p) => (p.pdfs || []).map((x) => ['pdf/' + x.file, p.versions.find((v) => v.version === x.version).date])));
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + urls.map(([u, d]) => '  <url><loc>' + SITE.baseUrl + u + '</loc><lastmod>' + d + '</lastmod></url>').join('\n') + '\n</urlset>\n';
}

/* Served by Vercel for any address that does not exist. Every link starts at the root. */
function notFoundPage() {
  const body = `
<h1>Page not found</h1>
<p>There is no page at this address.</p>
<p>The <a href="/index.html">listing</a> shows every preprint, and the <a href="/search.html">search</a> finds a title, an author or a DOI. Every record keeps its address, so a citation to a Sophaxis id leads to its page.</p>
`;
  return page({ title: 'Page not found | ' + SITE.name, description: 'There is no page at this address.', root: true, canonical: '404.html', body, head: '<meta name="robots" content="noindex">\n' });
}

/* ------------------------------------------------------------ write */

/* robots.txt. Every crawler may read everything. The Internet Archive's crawlers are asked not to collect a removed
 * record: its page and its PDF copies, by the prefix of its id. Whether this also hides earlier copies is the Archive's
 * decision; the operator still asks it to exclude them (Takedown Policy). */
function robots(all) {
  /* Also the records whose authors did not consent to the saves (archive: false). */
  const gone = all.filter((p) => p.status === 'removed' || p.archive === false).map((p) => p.id).sort();
  const archive = gone.length ? '\nUser-agent: ia_archiver\nUser-agent: archive.org_bot\n'
    + gone.map((id) => 'Disallow: /abs/' + id + '\nDisallow: /pdf/' + id + '\n').join('') + 'Allow: /\n' : '';
  return 'User-agent: *\nAllow: /\n' + archive + '\nSitemap: ' + SITE.baseUrl + 'sitemap.xml\n';
}

/* llms.txt and llms-full.txt (the llms.txt proposal, https://llmstxt.org/): what a language model needs to answer a
 * question about Sophaxis from its own words. llms.txt gives the facts from site.json and links every policy and page;
 * llms-full.txt holds the policies and pages word for word, from the same Markdown the pages are built from, so the two
 * cannot drift apart. Nothing here is written by hand, and nothing says more than the policies do. */
const LLM_PAGES = [['policy.md', 'policy.html', 'Policies (index)'], ['disclaimer.md', 'disclaimer.html', 'Disclaimer'], ['faq.md', 'faq.html', 'Frequently asked questions'],
  ['process.md', 'process.html', 'From submission to listing'], ['automation.md', 'automation.html', 'What runs by itself'], ['transparency.md', 'transparency.html', 'Transparency: a self-assessment'], ['repositories.md', 'repositories.html', 'For repositories and DOI registration agencies'],
  ['contact.md', 'contact.html', 'Operator and contact'], ['advisory.md', 'advisory.html', 'Advisory board: a call'], ['brand.md', 'brand.html', 'Name, logo and badge'], ['press.md', 'press.html', 'For anyone introducing Sophaxis'], ['call.md', 'call.html', 'A call to researchers'], ['findable.md', 'findable.html', 'Making a listed work easy to find'], ['accessibility.md', 'accessibility.html', 'Accessibility'], ['compare.md', 'compare.html', 'How Sophaxis differs from other places'], ['glossary.md', 'glossary.html', 'Glossary']];
/* In llms-full.txt, the relative Markdown links of a source lead to the site by their full address, as the "Source:" line does. */
function absoluteLinks(md, src, url) {
  return md.replace(/\]\((\.{1,2}\/[^)\s]+)\)/g, (m, h) => {
    const to = sitePath(h, src, url);
    if (to === null) return m;
    return '](' + (/^https:/.test(to) ? to : SITE.baseUrl + path.posix.normalize(path.posix.join(path.posix.dirname(url), to))) + ')';
  });
}
function llmsSources() {
  return POLICIES.map(([slug]) => ['policies/' + slug + '.md', 'policies/' + slug + '.html'])
    .concat(LLM_PAGES.map(([src, url]) => [src, url]))
    .concat(Object.keys(JA_POLICIES).map((slug) => ['policies/' + slug + '.ja.md', 'policies/' + slug + '.ja.html']), [['disclaimer.ja.md', 'disclaimer.ja.html']])
    .concat(JA_PAGES.filter(hasRootJa).map((slug) => [slug + '.ja.md', slug + '.ja.html']));
}
function llmsTxt(all) {
  const B = SITE.baseUrl, L = SITE.notOffered || [];
  const shown = all.filter((p) => p.status !== 'removed');
  const repos = [...new Set(Object.values(SITE.repositories))];
  const notice = SITE.termsNotice && SITE.termsNotice.text ? '- Change announced on the top page, from ' + SITE.termsNotice.from + ' (where the text names a later day, that day): ' + SITE.termsNotice.text + '\n' : '';
  return '# ' + SITE.name + '\n\n> ' + SITE.name + ' is an overlay preprint server for ' + Object.values(SITE.categories).map((c) => c.toLowerCase()).join(', ').replace(/, ([^,]*)$/, ' and $1')
    + '. It lists preprints that authors have already deposited in an open repository with a DOI, and gives each a stable record page. Acceptance is moderation, not peer review. Sophaxis charges nothing, to authors or to readers.\n\n'
    + 'The policies below are the rules. Where this file and a policy differ, the policy applies. The full text of every policy is in [llms-full.txt](' + B + 'llms-full.txt).\n\n'
    + '## Facts\n\n'
    + '- Operator: ' + SITE.operator.name + ' (ORCID https://orcid.org/' + SITE.operator.orcid + '), one person in Japan, unpaid. Requests by email go to the address on that ORCID record; see the [contact page](' + B + 'contact.html).\n'
    + '- Fields: ' + Object.values(SITE.categories).join(', ') + '.\n'
    + '- Accepted repositories (' + repos.length + '): ' + repos.join(', ') + '.\n'
    + '- Accepted licences: ' + Object.values(SITE.licenses).join(', ') + '.\n'
    + '- Records shown: ' + shown.length + ' (removed records are not counted). ' + ownShare(all) + ' The operator is at present the only moderator.\n'
    + '- Not offered in ' + L.length + ' places: ' + notOfferedPlaces(L) + '. From ' + SITE.residenceFrom + ', a work is not listed if an author lives in one of them, or stays in one between the submission and the listing, even briefly. The [Submission Policy](' + B + 'policies/submission.html) gives the law of each.\n'
    + '- Age of the DOI: from ' + SITE.doiAgeFrom + ', a new work is listed only if at least ' + SITE.doiAgeMonths + ' months have passed since its first DOI was registered, counted to the day the submission issue is opened.\n'
    + notice
    + '\n## Policies\n\n'
    + POLICIES.map(([slug, what]) => '- [' + policyTitle(slug) + '](' + B + 'policies/' + slug + '.html): ' + what + '\n').join('')
    + '\n## Other pages\n\n'
    + LLM_PAGES.map(([, url, t]) => '- [' + t + '](' + B + url + ')\n').join('')
    + '\n## Japanese\n\n'
    + Object.keys(JA_POLICIES).map((slug) => '- [' + JA_POLICIES[slug] + '](' + B + 'policies/' + slug + '.ja.html)\n').join('')
    + '- [免責事項](' + B + 'disclaimer.ja.html)\n'
    + '- [トップの頁](' + B + 'index.ja.html)\n'
    + JA_PAGES.filter(hasRootJa).map((slug) => '- [' + rootJaTitle(slug) + '](' + B + slug + '.ja.html)\n').join('')
    + '\n## Data\n\n'
    + '- [papers.json](' + B + 'papers.json): every public record\n- [Atom feed](' + B + 'feed.xml)\n- [OAI-PMH](' + B + 'oai?verb=Identify)\n- [Sitemap](' + B + 'sitemap.xml)\n- [Source and history](' + SITE.repo + ')\n';
}
function llmsFull() {
  return '# ' + SITE.name + ': the policies and pages in full\n\nEach part below is the Markdown from which the page at its address is built, word for word.\n\n'
    + llmsSources().map(([src, url]) => '---\n\nSource: ' + SITE.baseUrl + url + '\n\n' + absoluteLinks(fs.readFileSync(path.join(ROOT, src), 'utf8').trim(), src, url) + '\n\n').join('');
}

function build(out, paperDir) {
  const { papers: all, problems } = loadPapers(paperDir);
  if (SITE.zenodo && (!/^10\.5281\/zenodo\.\d+$/.test(SITE.zenodo.doi || '') || !/^10\.5281\/zenodo\.\d+$/.test(SITE.zenodo.version || '') || !/^https:\/\/zenodo\.org\/communities\//.test(SITE.zenodo.community || ''))) problems.push('site.json: zenodo needs a concept DOI, a version DOI and the community URL');
  (SITE.listedIn || []).forEach((x, i) => {
    if (!x || !x.name || !x.description || !/^https:\/\//.test(x.url || '') || !DATE.test(x.since || '')) problems.push('site.json: listedIn[' + i + '] needs a name, a description, an https url and a since date (YYYY-MM-DD)');
  });
  (SITE.directoryEntries || []).forEach((x, i) => {
    if (!x || !x.name || !x.page || !/^https:\/\//.test(x.url || '') || !Array.isArray(x.sections) || !x.sections.length || !DATE.test(x.since || '') || !DATE.test(x.asOf || '') || x.asOf < x.since) problems.push('site.json: directoryEntries[' + i + '] needs a name, a page, an https url, sections, a since date and an asOf date not before it (YYYY-MM-DD)');
  });
  for (const l of ['en', 'ja']) if (!DATE.test(topUpdated(l) || '')) problems.push('site.json: topUpdated needs "' + l + '", the day the text of that top page last changed (YYYY-MM-DD, Japan time)');
  if (SITE.issn !== null && SITE.issn !== undefined && !issnOk(SITE.issn)) problems.push('site.json: issn ' + SITE.issn + ' is not an ISSN (NNNN-NNNC, with a matching check digit)');
  for (const r of loadReports()) problems.push(...reportProblems(r, r.year + '.json'));
  problems.push(...newsProblems(loadNews()));
  problems.push(...policyChangeProblems(loadPolicyChanges()));
  if (problems.length) return { problems };
  /* Removed records keep only their notice page; they are left out of every list, feed and search. */
  const papers = all.filter((p) => p.status !== 'removed');
  pressRecords = all;
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, 'abs'), { recursive: true });
  fs.mkdirSync(path.join(out, 'list'), { recursive: true });
  fs.mkdirSync(path.join(out, 'collection'), { recursive: true });
  fs.mkdirSync(path.join(out, 'pdf'), { recursive: true });
  fs.mkdirSync(path.join(out, 'author'), { recursive: true });
  fs.mkdirSync(path.join(out, 'policies'), { recursive: true });
  fs.mkdirSync(path.join(out, 'cite'), { recursive: true });
  fs.mkdirSync(path.join(out, '.well-known'), { recursive: true });
  fs.mkdirSync(path.join(out, 'api'), { recursive: true });
  fs.mkdirSync(path.join(out, 'card'), { recursive: true });
  fs.mkdirSync(path.join(out, 'templates'), { recursive: true });
  const files = {
    'index.html': indexPage(papers, all),
    'submit.html': submitPage(),
    'policy.html': policyPage(),
    'contact.html': contactPage(),
    'faq.html': faqPage(),
    'process.html': processPage(),
    'automation.html': automationPage(),
    'transparency.html': transparencyPage(),
    'advisory.html': prosePage('advisory'),
    'brand.html': prosePage('brand'),
    'press.html': prosePage('press'),
    'news.html': newsPage(loadNews()),
    'months.html': monthsPage(papers),
    'call.html': prosePage('call'),
    'findable.html': prosePage('findable'),
    'accessibility.html': prosePage('accessibility'),
    'compare.html': prosePage('compare'),
    'glossary.html': prosePage('glossary'),
    'checklist.html': prosePage('checklist'),
    'history.html': prosePage('history'),
    'leaflet.html': prosePage('leaflet'),
    'easy.html': prosePage('easy'),
    'first.html': prosePage('first'),
    'libraries.html': prosePage('libraries'),
    'rules.html': prosePage('rules'),
    'news.xml': newsFeed(loadNews()),
    'policies/changes.xml': policyChangesFeed(loadPolicyChanges()),
    'badge.svg': badgeSvg(),
    'disclaimer.html': disclaimerPage(),
    'disclaimer.ja.html': disclaimerJaPage(),
    'repositories.html': repositoriesPage(),
    'stats.html': statsPage(all),
    'decisions.html': decisionsPage(loadReports()),
    'search.html': searchPage(),
    '404.html': notFoundPage(),
    'feed.xml': feed(papers),
    'papers.json': papersJson(papers),
    'sitemap.xml': sitemap(papers),
    /* RFC 9116: where to report a security problem. Expires must be renewed within a year; the check fails before it lapses. */
    '.well-known/security.txt': ['Contact: ' + SITE.baseUrl + 'contact.html', 'Expires: ' + SITE.securityTxtExpires, 'Preferred-Languages: en, ja',
      'Canonical: ' + SITE.baseUrl + '.well-known/security.txt', 'Policy: ' + SITE.baseUrl + 'contact.html'].join('\n') + '\n',
    'robots.txt': robots(all),
    'llms.txt': llmsTxt(all),
    'llms-full.txt': llmsFull(),
    /* IndexNow reads the key from a file of that name at the root (tools/indexnow.js). The key is public by design. */
    [SITE.indexNowKey + '.txt']: SITE.indexNowKey,
    /* The Vercel project's root directory is site/, so Vercel reads its configuration from here. */
    'vercel.json': vercelConfig(all),
    'api/oai.js': oaiFunction(all),
  };
  Object.keys(SITE.categories).forEach((slug) => { files['list/' + slug + '.html'] = fieldPage(papers, slug); files['list/' + slug + '.xml'] = feed(papers, null, slug); });
  files['collections.html'] = collectionsPage(papers);
  files['index.ja.html'] = indexJaPage(papers, all);
  JA_PAGES.filter(hasRootJa).forEach((slug) => { files[slug + '.ja.html'] = rootJaPage(slug); });
  (SITE.collections || []).forEach((c) => { files['collection/' + c.slug + '.html'] = collectionPage(papers, c); files['collection/' + c.slug + '.xml'] = feed(papers, c); });
  all.forEach((p) => { files['abs/' + p.id + '.html'] = recordPage(p, all); files['abs/' + p.id + '.ja.html'] = recordJaPage(p, all); });
  /* Citation files for reference managers, one set per record that is shown. */
  papers.forEach((p) => {
    files['cite/' + p.id + '.bib'] = bibtex(p) + '\n';
    files['cite/' + p.id + '.ris'] = ris(p);
    files['cite/' + p.id + '.json'] = cslJson(p);
  });
  /* Ready to register, once site.json gives a DOI prefix: one file per record, removed records included. */
  if (recordDoi({ id: '2026.0001' })) {
    fs.mkdirSync(path.join(out, 'datacite'), { recursive: true });
    all.forEach((p) => { files['datacite/' + p.id + '.json'] = JSON.stringify(dataciteRecord(p), null, 2) + '\n'; });
  }
  POLICIES.forEach(([slug]) => { files['policies/' + slug + '.html'] = onePolicyPage(slug); });
  Object.keys(JA_POLICIES).forEach((slug) => { files['policies/' + slug + '.ja.html'] = jaPolicyPage(slug); });
  authorIds(papers).forEach((o) => { files['author/' + o + '.html'] = authorPage(papers, o); files['author/' + o + '.bib'] = authorBib(papers, o); });
  /* The PDF copies are copied byte for byte; loadPapers has checked their sha256. */
  papers.forEach((p) => (p.pdfs || []).forEach((x) => { files['pdf/' + x.file] = fs.readFileSync(path.join(pdfDir(paperDir), x.file)); }));
  /* The logo is drawn by hand from rectangles only, and copied as it is. The ICO and the PNGs
   * are the same logo in pixels, for search results and home screens that do not take SVG. */
  for (const f of ['favicon.svg', 'favicon.ico', 'favicon-192.png', 'apple-touch-icon.png', 'og.png']) files[f] = fs.readFileSync(path.join(__dirname, 'assets', f));
  /* The paper templates (CC0 1.0), copied as they are. */
  for (const f of TEMPLATES) files['templates/' + f] = fs.readFileSync(path.join(__dirname, 'templates', f));
  /* A record whose card is missing or out of date keeps the logo as its image; the check reports it. */
  papers.filter(hasCard).forEach((p) => { files['card/' + p.id + '.png'] = fs.readFileSync(path.join(CARDS, p.id + '.png')); });
  /* The one script of the site, used only by search.html. */
  files['search.js'] = fs.readFileSync(path.join(__dirname, 'assets', 'search.js'));
  for (const [f, s] of Object.entries(files)) fs.writeFileSync(path.join(out, f), s);
  return { problems: [], files: Object.keys(files), papers };
}

module.exports = { topUpdated, notOfferedPlacesJa, recordJaPage, removedJaPage, statusTableJa, publishedSaidJa, ownWorkNotice, fieldFacts, listing, LLM_EXTENTS_JA, ownNotice, operatingCounts, sections, slugger, sitePath, sourceLinks, absoluteLinks, SOURCE_PAGES, recordPage, readingTime, WORDS_PER_MINUTE, authorBib, historyFill, TEMPLATES, monthsPage, hasCard, yearInReview, badgeSvg, badgeSnippet, newsPage, newsFeed, newsProblems, loadNews, policyChangesFeed, policyChangeProblems, loadPolicyChanges, prosePage, pressFacts, PROSE, markdown, STATEMENT_KEYS, statements, collectionPage, collectionsPage, collectionLinks, loadReports, reportProblems, decisionsPage, crossrefNotices, SECURITY_HEADERS, robots, llmsTxt, llmsFull, llmsSources, UNDER_REVIEW, removedPage, lastUpdated, issnOk, build, validate, orcidOk, repoPrefix, loadPapers, pdfLimits, ris, cslJson, bibtex, related, pausedNotice, termsNotice, scopeNotice, notOfferedPlaces, recordDoi, dataciteRecord, vercelConfig, oaiData, publishedNotice, statusTable, repoName, PUBLISHED_KINDS, STYLE_HASH };

/* Short addresses as arXiv has them: /abs/2026.0001 for the record and /pdf/2026.0001 for its latest PDF copy.
 * They redirect to the files; the record page keeps its .html address as the canonical one. */
/* What the OAI-PMH function answers from (tools/oai.js): one entry per record, removed ones marked deleted.
 * The datestamp is the day the record last changed, as in the sitemap. */
function oaiData(all) {
  const host = new URL(SITE.baseUrl).host;
  const idOf = (p) => 'oai:' + host + ':' + p.id;
  const records = all.slice().sort((a, b) => (a.id < b.id ? -1 : 1)).map((p) => {
    if (p.status === 'removed') return { identifier: idOf(p), datestamp: p.removal_date, sets: [], deleted: true };
    const v = latest(p);
    const lic = LICENCE_URL[p.license];
    return {
      identifier: idOf(p),
      datestamp: [changed(p), p.listed, p.updated].filter(Boolean).sort().pop(),
      /* Every record shown is open access, and is in the set that OpenAIRE harvests. */
      sets: cats(p).concat(['openaire']),
      deleted: false,
      dc: {
        title: p.title,
        creators: p.authors.map((a) => [familyOf(a), givenOf(a)].filter(Boolean).join(', ')),
        subjects: cats(p).map((c) => SITE.categories[c]).concat(p.keywords || []),
        description: p.abstract,
        publisher: repoName(v.doi),
        date: p.versions[0].date,
        types: ['Text', 'info:eu-repo/semantics/preprint'],
        formats: (p.pdfs || []).length ? ['application/pdf'] : [],
        identifiers: [SITE.baseUrl + 'abs/' + p.id + '.html', 'https://doi.org/' + v.doi].concat((p.pdfs || []).length ? [SITE.baseUrl + 'pdf/' + p.pdfs[p.pdfs.length - 1].file] : []),
        relations: p.published ? ['https://doi.org/' + p.published.doi] : [],
        rights: [lic || p.license, 'info:eu-repo/semantics/openAccess'],
        languages: p.language ? [p.language] : [],
      },
      /* The OpenAIRE Guidelines for Literature Repositories v4 (oai_openaire). The work was deposited in its repository first;
       * the record says so by the repository as publisher and by its DOI, to which the record page is identical. */
      oaire: {
        title: p.title,
        creators: p.authors.map((a) => ({ name: [familyOf(a), givenOf(a)].filter(Boolean).join(', '), orcid: a.orcid || null })),
        identifier: SITE.baseUrl + 'abs/' + p.id + '.html',
        related: [{ type: 'DOI', relation: 'IsIdenticalTo', value: v.doi }].concat(p.published ? [{ type: 'DOI', relation: 'IsPreviousVersionOf', value: p.published.doi }] : []),
        issued: p.versions[0].date,
        language: p.language || null,
        publisher: repoName(v.doi),
        description: p.abstract,
        subjects: cats(p).map((c) => SITE.categories[c]).concat(p.keywords || []),
        licence: lic ? { uri: lic, name: SITE.licenses[p.license], start: v.date } : null,
        file: (p.pdfs || []).length ? SITE.baseUrl + 'pdf/' + p.pdfs[p.pdfs.length - 1].file : null,
      },
    };
  });
  return {
    repositoryName: SITE.name,
    baseURL: SITE.baseUrl + 'oai',
    adminEmails: (SITE.oai && SITE.oai.adminEmails) || [],
    earliestDatestamp: records.map((r) => r.datestamp).sort()[0] || SITE.since,
    repositoryIdentifier: host,
    sampleIdentifier: 'oai:' + host + ':2026.0001',
    sets: Object.entries(SITE.categories).map(([spec, name]) => ({ spec, name })).concat([{ spec: 'openaire', name: 'OpenAIRE' }]),
    records,
  };
}

/* site/api/oai.js: tools/oai.js with the records. Vercel runs it as a function; /oai is rewritten to it. */
function oaiFunction(all) {
  return '/* Generated by build.js from tools/oai.js and data/papers. Do not edit. */\n'
    + fs.readFileSync(path.join(__dirname, 'tools', 'oai.js'), 'utf8')
    + '\nmodule.exports = handler(' + JSON.stringify(oaiData(all)) + ');\n';
}

/* Vercel deploys a branch only if a rule here allows it; a branch that matches several rules is deployed if any allows it. */
const DEPLOY_BRANCHES = { '**': false, main: true };

function vercelConfig(papers) {
  const shown = papers.filter((p) => p.status !== 'removed');
  const redirects = shown.map((p) => ({ source: '/abs/' + p.id, destination: '/abs/' + p.id + '.html', permanent: true }))
    .concat(shown.filter((p) => (p.pdfs || []).length).map((p) => ({ source: '/pdf/' + p.id, destination: '/pdf/' + p.pdfs[p.pdfs.length - 1].file, permanent: false })))
    .concat(shown.flatMap((p) => (p.pdfs || []).map((x) => ({ source: '/pdf/' + p.id + 'v' + x.version, destination: '/pdf/' + x.file, permanent: true }))));
  /* The OAI-PMH base URL is /oai; the function answers it (tools/oai.js). Each PDF copy is also served beside the
   * abstract page, at /abs/<file>, for Google Scholar (see scholarTags). */
  const rewrites = [{ source: '/oai', destination: '/api/oai' }]
    .concat(shown.flatMap((p) => (p.pdfs || []).map((x) => ({ source: '/abs/' + x.file, destination: '/pdf/' + x.file }))));
  /* Only main is deployed. The free plan allows 100 deployments a day for the whole account, and a deployment
   * of every working branch used them up on 2026-11-08, so that main could not be deployed. */
  const git = { deploymentEnabled: DEPLOY_BRANCHES };
  /* The llms files are UTF-8 text with Japanese in them; say so, so that no reader guesses another encoding. */
  const text = { source: '/(llms|llms-full)\\.txt', headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }] };
  /* The templates are text to download and edit, not pages to render. */
  const tpl = { source: '/templates/(.*)', headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }] };
  return JSON.stringify({ headers: SECURITY_HEADERS.concat([text, tpl]), redirects, rewrites, git }, null, 2) + '\n';
}

if (require.main === module) {
  const r = build(OUT, PAPER_DIR);
  if (r.problems.length) {
    console.error(r.problems.join('\n'));
    process.exit(1);
  }
  console.log('wrote ' + r.files.length + ' files to ' + path.relative(process.cwd(), OUT) + ' (' + r.papers.length + ' preprints)');
}
