#!/usr/bin/env node
/* Read a submission issue, look the DOI up, check who is submitting, and draft the record.
 *
 * In GitHub Actions (see .github/workflows/intake.yml):
 *   ISSUE_NUMBER, ISSUE_AUTHOR, ISSUE_BODY, GITHUB_TOKEN, GITHUB_REPOSITORY
 *   node tools/intake.js
 *
 * By hand, without writing to GitHub:
 *   node tools/intake.js --dry-run --doi 10.6084/m9.figshare.1 --orcid 0000-0002-1825-0097 --login alice
 *
 * What it reads, and nothing else:
 *   - the public metadata of the DOI, from DataCite or Crossref;
 *   - the name, the websites and the works of the public ORCID record given in the form.
 * Nothing from the ORCID record is written anywhere except the result of the checks.
 *
 * The checks decide nothing. A moderator accepts or declines in the issue.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { validate, orcidOk, repoPrefix } = require('../build.js');

const ROOT = path.join(__dirname, '..');
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const MARK = '<!-- sophaxis-intake -->';
const UA = 'Sophaxis intake (' + SITE.repo + ')';

/* ------------------------------------------------------------ the issue */

const FIELDS = {
  'DOI of the deposited preprint': 'doi',
  'Your ORCID iD': 'orcid',
  'Existing Sophaxis id (only for a new version)': 'update',
  'DOI of the published version (only if a journal has published the work)': 'published',
  'Category': 'category',
  'Other categories (optional)': 'others',
  'Abstract (only if the DOI metadata has none)': 'abstract',
  'Use of language models and other generative models': 'llm',
};

/* GitHub renders an issue form as "### Label" followed by the answer. */
function parseIssue(body) {
  const out = {};
  const parts = String(body || '').replace(/\r\n/g, '\n').split(/^### /m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf('\n');
    const label = (nl < 0 ? part : part.slice(0, nl)).trim();
    const value = (nl < 0 ? '' : part.slice(nl + 1)).trim();
    if (FIELDS[label]) out[FIELDS[label]] = value === '_No response_' ? '' : value;
  }
  if (out.doi) out.doi = out.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').trim();
  if (out.published) out.published = out.published.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').trim();
  if (out.orcid) out.orcid = (out.orcid.match(/\d{4}-\d{4}-\d{4}-\d{3}[\dX]/) || [''])[0];
  const slugOf = (label) => Object.keys(SITE.categories).find((k) => SITE.categories[k] === label.trim());
  out.category = slugOf(out.category || '') || '';
  out.others = [...new Set(String(out.others || '').split(/,\s*/).map(slugOf).filter((s) => s && s !== out.category))];
  return out;
}

/* Keywords from the metadata, without the broad classification schemes that say nothing about the work. */
function keywordsOf(list) {
  const seen = new Set();
  const out = [];
  for (const k of list) {
    const t = plain(k).replace(/^FOS:\s*/i, '').trim();
    if (!t || t.length > 80 || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
  }
  return out.slice(0, 12);
}

/* ------------------------------------------------------------ text */

/* Metadata arrives with tags, and sometimes with tags escaped twice (figshare).
 * Only well-formed tags are removed, so a decoded "δ < 1/φ" survives. */
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const TAG = /<\/?([a-zA-Z][a-zA-Z0-9:-]*)(\s[^<>]*)?\/?>/g;
const INLINE = /^(em|i|b|strong|sup|sub|span|a|u|mml:\w+|jats:(italic|bold|sup|sub))$/i;
const untag = (t) => t.replace(TAG, (m, name) => (INLINE.test(name) ? '' : ' '));
function plain(s) {
  let t = String(s || '');
  for (let i = 0; i < 2; i++) {
    t = untag(t).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
      if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
      return ENTITIES[e.toLowerCase()] !== undefined ? ENTITIES[e.toLowerCase()] : m;
    });
  }
  return untag(t).replace(/\s+/g, ' ').trim();
}

const orcidOf = (s) => (String(s || '').match(/\d{4}-\d{4}-\d{4}-\d{3}[\dX]/) || [null])[0];
const iso = (parts) => (parts && parts.length === 3 ? parts.map((n, i) => String(n).padStart(i ? 2 : 4, '0')).join('-') : null);

/* Map a licence URL or SPDX id to an accepted licence, or null. */
function licenceOf(s) {
  const t = String(s || '').toLowerCase();
  if (/^cc-by-4\.0$/.test(t) || /creativecommons\.org\/licenses\/by\/4\.0/.test(t)) return 'CC-BY-4.0';
  if (/^cc-by-sa-4\.0$/.test(t) || /creativecommons\.org\/licenses\/by-sa\/4\.0/.test(t)) return 'CC-BY-SA-4.0';
  if (/^cc0-1\.0$/.test(t) || /creativecommons\.org\/publicdomain\/zero\/1\.0/.test(t)) return 'CC0-1.0';
  return null;
}

/* ------------------------------------------------------------ metadata */

function fromDataCite(json) {
  const a = json.data.attributes;
  const abstracts = (a.descriptions || []).filter((d) => d.descriptionType === 'Abstract');
  const abs = abstracts.find((d) => !d.lang || /^en/i.test(d.lang)) || abstracts[0];
  const dated = (type) => (a.dates || []).find((d) => d.dateType === type && /^\d{4}-\d{2}-\d{2}/.test(d.date));
  const date = (dated('Issued') || dated('Available') || dated('Submitted') || dated('Created') || {}).date;
  return {
    agency: 'DataCite',
    doi: a.doi,
    title: plain(((a.titles || []).find((t) => !t.titleType) || {}).title),
    authors: (a.creators || []).map((c) => ({
      name: plain(c.givenName && c.familyName ? c.givenName + ' ' + c.familyName : c.name),
      given: c.givenName || '',
      family: c.familyName || '',
      orcid: orcidOf(((c.nameIdentifiers || []).find((n) => /orcid/i.test(n.nameIdentifierScheme || '')) || {}).nameIdentifier),
    })),
    licences: (a.rightsList || []).map((r) => licenceOf(r.rightsIdentifier) || licenceOf(r.rightsUri)).filter(Boolean),
    abstract: abs ? plain(abs.description) : '',
    date: date ? date.slice(0, 10) : null,
    keywords: keywordsOf((a.subjects || []).filter((s) => !/fields of science|anzsrc|oecd/i.test(s.subjectScheme || '') && !/^FOS:/i.test(s.subject || '')).map((s) => s.subject)),
  };
}

function fromCrossref(json) {
  const m = json.message;
  const full = (k) => (m[k] && m[k]['date-parts'] ? iso(m[k]['date-parts'][0]) : null);
  return {
    agency: 'Crossref',
    doi: m.DOI,
    title: plain((m.title || [])[0]),
    authors: (m.author || []).map((c) => ({
      name: plain([c.given, c.family].filter(Boolean).join(' ') || c.name),
      given: c.given || '',
      family: c.family || '',
      orcid: orcidOf(c.ORCID),
    })),
    licences: (m.license || []).map((l) => licenceOf(l.URL)).filter(Boolean),
    abstract: plain(m.abstract),
    date: full('posted') || full('published') || full('issued') || full('created'),
    keywords: keywordsOf(m.subject || []),
  };
}

/* ------------------------------------------------------------ ORCID */

function orcidPerson(json) {
  const n = json.name || {};
  const v = (x) => (x && x.value) || '';
  return {
    given: v(n['given-names']),
    family: v(n['family-name']),
    urls: ((json['researcher-urls'] || {})['researcher-url'] || []).map((u) => v(u.url)),
  };
}

function orcidDois(json) {
  const out = new Set();
  (json.group || []).forEach((g) => ((g['external-ids'] || {})['external-id'] || []).forEach((x) => {
    if (x['external-id-type'] === 'doi') out.add(String(x['external-id-value']).toLowerCase());
  }));
  return out;
}

/* The ORCID record must link exactly https://github.com/<login>. */
function linksGithub(urls, login) {
  return urls.some((u) => {
    let url;
    try { url = new URL(u); } catch { return false; }
    if (!/^https?:$/.test(url.protocol) || !/^(www\.)?github\.com$/i.test(url.hostname)) return false;
    const seg = url.pathname.split('/').filter(Boolean);
    return seg.length === 1 && seg[0].toLowerCase() === String(login).toLowerCase();
  });
}

const tokens = (s) => new Set(String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().split(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+/).filter(Boolean));
function sameName(person, author) {
  if (!person.family || !person.given) return false;
  const have = tokens(author.name + ' ' + author.given + ' ' + author.family);
  const fam = [...tokens(person.family)];
  const giv = [...tokens(person.given)];
  return fam.length > 0 && giv.length > 0 && fam.every((t) => have.has(t)) && have.has(giv[0]);
}

/* ------------------------------------------------------------ the checks */

/* Pure: everything fetched is passed in. Returns { ok, checks: [[label, pass, detail]] }. */
/* The record that already lists a DOI, if any. A concept DOI matches its versions (figshare .v1, .v2 …). */
function listedAs(doi, listed) {
  const d = String(doi || '').toLowerCase();
  for (const [known, id] of listed || []) if (known === d || known.startsWith(d + '.v') || d.startsWith(known + '.v')) return id;
  return null;
}

function listedDois(paperDir) {
  const out = new Map();
  if (!fs.existsSync(paperDir)) return out;
  fs.readdirSync(paperDir).filter((f) => f.endsWith('.json')).forEach((f) => {
    const p = JSON.parse(fs.readFileSync(path.join(paperDir, f), 'utf8'));
    (p.versions || []).forEach((v) => out.set(String(v.doi).toLowerCase(), p.id));
  });
  return out;
}

function check({ form, login, meta, person, works, listed }) {
  const checks = [];
  const add = (label, pass, detail) => checks.push([label, !!pass, detail || '']);
  const pre = repoPrefix(form.doi || '');
  add('The DOI is in an accepted repository', pre, pre ? SITE.repositories[pre] : 'accepted: ' + Object.values(SITE.repositories).join(', '));
  add('The ORCID iD is valid', form.orcid && orcidOk(form.orcid));
  add('A category is chosen', form.category);
  const already = listedAs(form.doi, listed);
  if (form.update) add('The record to update exists and lists this work', already === form.update || (already === null && listed && [...listed.values()].includes(form.update)), form.update);
  else add('The work is not listed yet', !already, already ? 'already listed as ' + already + '; give that id to add a new version' : '');
  if (form.published) add('The published version is given as a DOI', /^10\.\d{4,9}\/\S+$/.test(form.published), form.published);
  add('The statement on generative models is given', (form.llm || '').trim().length >= 20);
  if (!meta) { add('The DOI metadata could be read', false); return { ok: false, checks }; }
  add('The DOI metadata could be read', true, meta.agency);
  const lic = meta.licences.find((l) => SITE.licenses[l]);
  add('The work carries an accepted licence', lic, lic ? SITE.licenses[lic] : 'none of CC BY 4.0, CC BY-SA 4.0 or CC0 1.0 in the metadata');
  add('The DOI metadata has a title and a date', meta.title && meta.date);
  add('There is an abstract', meta.abstract || (form.abstract || '').trim(), meta.abstract ? 'from the DOI metadata' : 'from the form');
  if (!person) { add('The ORCID record could be read', false); return { ok: false, checks }; }
  add('The ORCID record links this GitHub account', linksGithub(person.urls, login), 'https://github.com/' + login);
  const byId = meta.authors.find((a) => a.orcid === form.orcid);
  const doi = String(meta.doi || form.doi).toLowerCase();
  const claimed = works && [...works].some((w) => w === doi || w.startsWith(doi + '.v'));
  const byName = claimed && meta.authors.find((a) => sameName(person, a));
  add('The ORCID iD belongs to an author of the work', byId || byName,
    byId ? 'the DOI metadata lists this ORCID iD' : byName ? 'the ORCID record lists this DOI and its name matches an author' : 'neither the DOI metadata nor the ORCID record connects them');
  return { ok: checks.every((c) => c[1]), checks, author: byId || byName, licence: lic };
}

/* ------------------------------------------------------------ the draft */

function nextId(paperDir, year) {
  const seq = fs.existsSync(paperDir) ? fs.readdirSync(paperDir)
    .map((f) => f.match(/^(\d{4})\.(\d{4})\.json$/)).filter((m) => m && m[1] === String(year)).map((m) => Number(m[2])) : [];
  return year + '.' + String((seq.length ? Math.max(...seq) : 0) + 1).padStart(4, '0');
}

function draft({ form, login, issue, meta, versions, result, paperDir, today }) {
  const dir = paperDir || path.join(ROOT, 'data', 'papers');
  if (form.update) {
    const file = path.join(dir, form.update + '.json');
    if (!fs.existsSync(file)) return { problems: ['no record ' + form.update] };
    const p = JSON.parse(fs.readFileSync(file, 'utf8'));
    const known = new Set(p.versions.map((v) => v.doi.toLowerCase() + ' ' + v.date));
    versions.filter((v) => !known.has(v.doi.toLowerCase() + ' ' + v.date)).forEach((v) => p.versions.push({ version: p.versions.length + 1, doi: v.doi, date: v.date }));
    return { record: p, problems: validate(p, form.update + '.json') };
  }
  const id = nextId(dir, (today || new Date().toISOString()).slice(0, 4));
  const p = {
    id,
    title: meta.title,
    authors: meta.authors.map((a) => Object.assign({ name: a.name }, a.orcid ? { orcid: a.orcid } : {}, a.family ? { given: a.given, family: a.family } : {})),
    abstract: meta.abstract || plain(form.abstract),
    category: form.category,
    ...(form.others && form.others.length ? { categories: form.others } : {}),
    ...(meta.keywords && meta.keywords.length ? { keywords: meta.keywords } : {}),
    ...(form.published ? { published_doi: form.published } : {}),
    license: result.licence,
    versions: versions.map((v, i) => ({ version: i + 1, doi: v.doi, date: v.date })),
    llm_disclosure: form.llm.trim(),
    issue: Number(issue),
    status: 'listed',
  };
  if (SITE.operator.github && login.toLowerCase() === SITE.operator.github.toLowerCase()) p.operator_own = true;
  return { record: p, problems: validate(p, id + '.json') };
}

function comment(result, d) {
  const safe = (s) => String(s).replace(/[`|<>]/g, '');
  const rows = result.checks.map(([label, pass, detail]) => `| ${pass ? 'pass' : '**fail**'} | ${label} | ${safe(detail)} |`).join('\n');
  let out = `${MARK}
**Automatic checks** (run again whenever this issue is edited)

| | check | detail |
| --- | --- | --- |
${rows}
`;
  if (result.ok && d && d.record && !d.problems.length) {
    out += `
Identity and licence are verified. This is not acceptance: a moderator still reads the work against the policy.

Draft record \`data/papers/${d.record.id}.json\`:

~~~~json
${JSON.stringify(d.record, null, 2).replace(/~~~~/g, '~ ~ ~ ~')}
~~~~
`;
  } else if (d && d.problems && d.problems.length) {
    out += '\nThe draft record does not validate: ' + safe(d.problems.join('; ')) + '\n';
  } else {
    out += `
Not verified. Fix what failed, then edit this issue to run the checks again.
To link your GitHub account, add \`https://github.com/<your username>\` under "Websites & social links" in your ORCID record.
`;
  }
  return out;
}

/* ------------------------------------------------------------ network */

async function getJson(url, accept) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: accept || 'application/json' } });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(url.split('?')[0] + ': HTTP ' + r.status);
  return r.json();
}

async function lookUp(doi) {
  const enc = encodeURIComponent(doi);
  const dc = await getJson('https://api.datacite.org/dois/' + enc);
  if (dc) return { meta: fromDataCite(dc), raw: dc };
  const cr = await getJson('https://api.crossref.org/works/' + enc);
  return cr ? { meta: fromCrossref(cr), raw: cr } : { meta: null };
}

/* The versions behind a DOI: figshare numbers them .v1, .v2, …; arXiv keeps one DOI. */
async function versionsOf(doi, meta, raw) {
  if (/^10\.6084\/m9\.figshare\.\d+$/i.test(doi)) {
    const out = [];
    for (let n = 1; n <= 30; n++) {
      const v = await lookUp(doi + '.v' + n);
      if (!v.meta) break;
      out.push({ doi: v.meta.doi, date: v.meta.date });
    }
    if (out.length) return out;
  }
  if (/^10\.48550\/arxiv\./i.test(doi) && raw && raw.data) {
    const sub = (raw.data.attributes.dates || []).filter((d) => d.dateType === 'Submitted' && /^v\d+$/.test(d.dateInformation || ''))
      .sort((a, b) => Number(a.dateInformation.slice(1)) - Number(b.dateInformation.slice(1)));
    if (sub.length) return sub.map((d) => ({ doi: meta.doi, date: d.date.slice(0, 10) }));
  }
  return [{ doi: meta.doi, date: meta.date }];
}

/* A service that cannot be reached fails its check; it does not stop the others. */
async function run(form, login) {
  let meta = null, raw = null, person = null, works = null, versions = [];
  try {
    if (repoPrefix(form.doi || '')) ({ meta, raw } = await lookUp(form.doi));
    if (meta) versions = await versionsOf(form.doi, meta, raw);
  } catch (e) { console.error(e.message); meta = null; }
  try {
    if (form.orcid && orcidOk(form.orcid)) {
      const p = await getJson('https://pub.orcid.org/v3.0/' + form.orcid + '/person');
      const w = await getJson('https://pub.orcid.org/v3.0/' + form.orcid + '/works');
      person = p && orcidPerson(p);
      works = w ? orcidDois(w) : new Set();
    }
  } catch (e) { console.error(e.message); person = null; }
  return { result: check({ form, login, meta, person, works, listed: listedDois(path.join(ROOT, 'data', 'papers')) }), meta, versions };
}

async function github(method, url, body) {
  const r = await fetch('https://api.github.com/repos/' + process.env.GITHUB_REPOSITORY + url, {
    method,
    headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'User-Agent': UA },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok && r.status !== 404) throw new Error(method + ' ' + url + ': HTTP ' + r.status);
  return r.status === 204 || r.status === 404 ? null : r.json();
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : ''; };
  if (args.includes('--dry-run')) {
    const form = { doi: arg('--doi'), orcid: arg('--orcid'), category: arg('--category') || 'mathematics', llm: 'Dry run: no statement is given here.' };
    const { result, meta, versions } = await run(form, arg('--login'));
    const d = meta && result.ok ? draft({ form, login: arg('--login'), issue: 0, meta, versions, result }) : null;
    console.log(comment(result, d));
    if (meta) console.log('versions: ' + JSON.stringify(versions));
    return;
  }
  const n = process.env.ISSUE_NUMBER;
  const login = process.env.ISSUE_AUTHOR;
  const form = parseIssue(process.env.ISSUE_BODY);
  const { result, meta, versions } = await run(form, login);
  const d = meta && result.ok ? draft({ form, login, issue: n, meta, versions, result }) : null;
  const body = comment(result, d);
  const mine = ((await github('GET', '/issues/' + n + '/comments?per_page=100')) || []).find((c) => c.user.type === 'Bot' && c.body.startsWith(MARK));
  if (mine) await github('PATCH', '/issues/comments/' + mine.id, { body });
  else await github('POST', '/issues/' + n + '/comments', { body });
  const verified = result.ok && d && !d.problems.length;
  await github('DELETE', '/issues/' + n + '/labels/' + (verified ? 'unverified' : 'verified'));
  await github('POST', '/issues/' + n + '/labels', { labels: [verified ? 'verified' : 'unverified'] });
  console.log(verified ? 'verified' : 'not verified');
}

module.exports = { listedAs, listedDois, parseIssue, plain, licenceOf, fromDataCite, fromCrossref, orcidPerson, orcidDois, linksGithub, sameName, check, nextId, draft, comment, MARK };

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
