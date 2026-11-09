#!/usr/bin/env node
/* Read a submission issue, look the DOI up, check who is submitting, and draft the record.
 *
 * In GitHub Actions (see .github/workflows/intake.yml):
 *   ISSUE_NUMBER, ISSUE_AUTHOR, ISSUE_BODY, GITHUB_TOKEN, GITHUB_REPOSITORY
 *   node tools/intake.js
 *
 * By hand, without writing to GitHub:
 *   node tools/intake.js --dry-run --doi 10.6084/m9.figshare.1 --orcid 0000-0002-1825-0097 --login alice [--opened 2026-12-01]
 *
 * What it reads, and nothing else:
 *   - the public metadata of the DOI, from DataCite or Crossref, or from JaLC for Jxiv, and the day each DOI that it names
 *     as an earlier version of the work was registered;
 *   - the notices that Crossref records against the DOI (tools/notices.js);
 *   - the PDF of the latest version, where the repository lets a script fetch it, only to read its shape (tools/pdf_shape.js);
 *   - the name, the websites and the works of the public ORCID record given in the form.
 * Nothing from the ORCID record is written anywhere except the result of the checks.
 *
 * The checks decide nothing. A moderator accepts or declines in the issue.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { validate, orcidOk, repoPrefix } = require('../build.js');
const { sourceFor, LIMITS, download, accept } = require('./fetch_pdf.js');
const { shapeOfFile, shapeNote } = require('./pdf_shape.js');

const ROOT = path.join(__dirname, '..');
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const MARK = '<!-- sophaxis-intake -->';
/* One User-Agent for every request Sophaxis makes, as the page for repositories promises. */
const UA = 'Sophaxis (' + SITE.repo + ')';

/* ------------------------------------------------------------ the issue */

/* Pure: the key of the level chosen in the form ("drafting" for its label), or null. The labels live in site.json. */
function extentKey(label) {
  const t = String(label || '').trim();
  return Object.keys(SITE.llmExtents).find((k) => SITE.llmExtents[k] === t) || null;
}
const MODEL_NAMES = /\b(claude|chatgpt|gpt-?\d|gemini|llama|copilot|deepseek|mistral|midjourney|dall-e|stable diffusion|firefly|language model)\b/i;

const FIELDS = {
  'DOI of the deposited preprint': 'doi',
  'Your ORCID iD': 'orcid',
  'Existing Sophaxis id (only for a new version)': 'update',
  'DOI of the published version (only if a journal has published the work)': 'published',
  'Was the published version peer-reviewed?': 'peer',
  'Category': 'category',
  'Other categories (optional)': 'others',
  'Abstract (only if the DOI metadata has none)': 'abstract',
  'Use of language models and other generative models': 'llm',
  'Extent of use of generative models': 'llm_extent',
  'Consent and agreement': 'consent',
  'Saving to the Internet Archive (optional)': 'archive',
  'Where the authors live': 'residence',
};

/* GitHub renders an issue form as "### Label" followed by the answer. */
function parseIssue(body, fields = FIELDS) {
  const out = {};
  const parts = String(body || '').replace(/\r\n/g, '\n').split(/^### /m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf('\n');
    const label = (nl < 0 ? part : part.slice(0, nl)).trim();
    const value = (nl < 0 ? '' : part.slice(nl + 1)).trim();
    if (fields[label]) out[fields[label]] = value === '_No response_' ? '' : value;
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

/* Metadata arrives with tags, and sometimes with tags escaped twice (Figshare).
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

/* The language of a work as ISO 639-3, from the two-letter code (or a tag such as en-US) that DOI metadata gives.
 * Only the codes below are mapped; any other is left out, for the moderator to add. */
const ISO3 = { en: 'eng', ja: 'jpn', de: 'deu', fr: 'fra', es: 'spa', it: 'ita', pt: 'por', zh: 'zho', ru: 'rus', ko: 'kor', nl: 'nld', la: 'lat', el: 'ell', pl: 'pol', sv: 'swe' };
function iso3(s) {
  const t = String(s || '').trim().toLowerCase().split(/[-_]/)[0];
  if (/^[a-z]{3}$/.test(t) && Object.values(ISO3).includes(t)) return t;
  return ISO3[t] || null;
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
    language: iso3(a.language),
  };
}

function fromCrossref(json) {
  const m = json.message;
  const full = (k) => (m[k] && m[k]['date-parts'] ? iso(m[k]['date-parts'][0]) : null);
  return {
    agency: 'Crossref',
    type: m.type || '',
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
    language: iso3(m.language),
  };
}

/* JaLC registers the DOIs of Jxiv. Its records carry titles, names and abstracts in Japanese and English;
 * the English one is taken where there is one, since the site is in English. */
function fromJaLC(json) {
  const d = json.data;
  const en = (list) => (list || []).find((x) => x.lang === 'en') || (list || [])[0] || {};
  const t = en(d.title_list);
  const pd = d.publication_date || {};
  const date = pd.publication_year && pd.publication_month && pd.publication_day
    ? [pd.publication_year, pd.publication_month, pd.publication_day].map((x, i) => String(x).padStart(i ? 2 : 4, '0')).join('-') : null;
  /* The first English subject is the field of the server's own classification, not a keyword of the work. */
  const subjects = (d.subject_list || []).filter((x) => x.lang === 'en').map((x) => x.subject).slice(1);
  return {
    agency: 'JaLC',
    type: d.resource_type || '',
    doi: d.doi,
    title: plain([t.title, t.subtitle].filter(Boolean).join(': ')),
    authors: (d.creator_list || []).filter((c) => c.type === 'person').map((c) => {
      const n = en(c.names);
      return {
        name: plain([n.first_name, n.last_name].filter(Boolean).join(' ')),
        given: n.first_name || '',
        family: n.last_name || '',
        orcid: orcidOf(((c.researcher_id_list || []).find((r) => r.type === 'ORCID') || {}).id_code),
      };
    }),
    licences: (d.rights_list || []).map((r) => licenceOf(r.uri) || licenceOf(r.rights)).filter(Boolean),
    abstract: plain(en((d.description_list || []).filter((x) => x.type === 'Abstract')).description),
    date,
    keywords: keywordsOf(subjects),
  };
}

/* ------------------------------------------------------------ the age of the DOI (Submission Policy) */

/* From SITE.doiAgeFrom, a new work is listed only if SITE.doiAgeMonths months have passed, on the day its submission issue is
 * opened, since the first DOI of the work was registered. The policies give their dates in Japan time. */
const DOI_AGE_LABEL = 'Six months have passed since the first DOI of the work was registered';
const JST = 9 * 3600 * 1000;
function jstDay(t) {
  const ms = Date.parse(t);
  return Number.isNaN(ms) ? null : new Date(ms + JST).toISOString().slice(0, 10);
}

/* Pure: the day n months after a day, on the same day of the month, or on the last day of a shorter month. */
function addMonths(day, n) {
  const [y, m, d] = String(day).split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d, last));
  return first.toISOString().slice(0, 10);
}

/* Pure: the day the agency first registered the DOI, in Japan time, or null. DataCite records it as "registered",
 * Crossref as "created". JaLC gives no such day in what Sophaxis reads, so a Jxiv DOI is checked by hand. */
function registeredOf(raw) {
  if (raw && raw.data && raw.data.attributes) return raw.data.attributes.registered ? jstDay(raw.data.attributes.registered) : null;
  if (raw && raw.message) return raw.message.created && raw.message.created['date-time'] ? jstDay(raw.message.created['date-time']) : null;
  return null;
}

/* Pure: the DOIs that the metadata names as the DOI of all versions of the work, or as an earlier version of it. */
const EARLIER_DATACITE = new Set(['IsVersionOf', 'IsNewVersionOf']);
const EARLIER_CROSSREF = ['is-version-of', 'replaces'];
const bareDoi = (d) => String(d).trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').toLowerCase();
function earlierDois(raw) {
  if (raw && raw.data && raw.data.attributes) {
    return (raw.data.attributes.relatedIdentifiers || [])
      .filter((r) => EARLIER_DATACITE.has(r.relationType) && /^doi$/i.test(r.relatedIdentifierType || '')).map((r) => bareDoi(r.relatedIdentifier));
  }
  if (raw && raw.message && raw.message.relation) {
    return EARLIER_CROSSREF.flatMap((k) => raw.message.relation[k] || []).filter((r) => r['id-type'] === 'doi').map((r) => bareDoi(r.id));
  }
  return [];
}

/* The first DOI of the work: the one registered earliest among the DOI given and the DOIs that the metadata names as
 * earlier, followed through at most ten DOIs. Figshare numbers its versions, so its first version is always looked at.
 * Null when no registration day can be read. */
async function firstDoi(doi, raw, look = lookUp) {
  const days = new Map();
  const queue = [[bareDoi(doi), raw]];
  const fig = /^(10\.6084\/m9\.figshare\.\d+)(\.v\d+)?$/i.exec(bareDoi(doi));
  if (fig) queue.push([fig[1] + '.v1', null]);
  while (queue.length && days.size < 10) {
    const [d, given] = queue.shift();
    if (days.has(d)) continue;
    const r = given || (await look(d)).raw || null;
    days.set(d, registeredOf(r));
    for (const e of earlierDois(r)) if (!days.has(e)) queue.push([e, null]);
  }
  return earliestOf(days);
}

/* Pure: the DOI with the earliest registration day, as { doi, day }, or null. */
function earliestOf(days) {
  let best = null;
  for (const [doi, day] of days) if (day && (!best || day < best.day)) best = { doi, day };
  return best;
}

/* Pure: the row of the check. The day the issue was opened must be on or after the day the months end. */
function doiAgeCheck(first, opened, months = SITE.doiAgeMonths) {
  if (!first) return [DOI_AGE_LABEL, false, 'no registration day could be read from the DOI metadata; the operator checks it by hand'];
  const due = addMonths(first.day, months);
  return [DOI_AGE_LABEL, opened >= due, first.doi + ' was registered on ' + first.day + '; a submission can be opened from ' + due
    + (opened >= due ? '' : ', as a new issue')];
}

/* ------------------------------------------------------------ ORCID */

/* The public name and links of an ORCID record, read from the two sections that hold them, so that the email addresses and
 * the country in the full person section are never received. Null if either cannot be read. */
async function orcidPersonJson(orcid) {
  const d = await getJson('https://pub.orcid.org/v3.0/' + orcid + '/personal-details');
  const u = await getJson('https://pub.orcid.org/v3.0/' + orcid + '/researcher-urls');
  return d && u ? { name: d.name, 'researcher-urls': u } : null;
}

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
/* The record that already lists a DOI, if any. A concept DOI matches its versions (Figshare .v1, .v2 …). */
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

/* The number of boxes in the "Consent and agreement" part of the submission form. */
const CONSENTS = 3;

function check({ form, login, meta, person, works, listed, pub, today, age, notices }) {
  const checks = [];
  const add = (label, pass, detail) => checks.push([label, !!pass, detail || '']);
  const pre = repoPrefix(form.doi || '');
  add('The DOI is in an accepted repository', pre, pre ? SITE.repositories[pre] : 'accepted: ' + Object.values(SITE.repositories).join(', '));
  add('The ORCID iD is valid', form.orcid && orcidOk(form.orcid));
  add('A category is chosen', form.category);
  const already = listedAs(form.doi, listed);
  if (form.update) add('The record to update exists and lists this work', already === form.update || (already === null && listed && [...listed.values()].includes(form.update)), form.update);
  else add('The work is not listed yet', !already, already ? 'already listed as ' + already + '; give that id to add a new version' : '');
  if (form.published && pub === undefined) add('The published version is given as a DOI', /^10\.\d{4,9}\/\S+$/.test(form.published), form.published);
  add('The statement on generative models is given', (form.llm || '').trim().length >= 20);
  /* The extent, one of four levels, is asked from SITE.llmExtentFrom. "None" cannot stand beside a statement that names a model. */
  {
    const key = extentKey(form.llm_extent);
    if (key || String(today || new Date().toISOString()).slice(0, 10) >= SITE.llmExtentFrom) add('The extent of use of generative models is chosen', !!key, key || '');
    if (key === 'none') add('The extent "None" agrees with the statement', !MODEL_NAMES.test(form.llm || ''));
  }
  /* From SITE.consentFrom, the form asks each author's consent to publication and to the services outside Japan,
   * agreement to the policies, and the age. All CONSENTS boxes must be ticked. */
  {
    const ticked = (String(form.consent || '').match(/^- \[[xX]\] /gm) || []).length;
    if (ticked || String(today || new Date().toISOString()).slice(0, 10) >= SITE.consentFrom) add('Consent, agreement to the policies and age are confirmed', ticked === CONSENTS, ticked + ' of ' + CONSENTS);
  }
  /* From SITE.residenceFrom, no author may live in a place where Sophaxis is not offered (SITE.notOffered). */
  {
    const ticked = (String(form.residence || '').match(/^- \[[xX]\] /gm) || []).length;
    if (ticked || String(today || new Date().toISOString()).slice(0, 10) >= SITE.residenceFrom) add('No author lives in a place where Sophaxis is not offered', ticked === 1, ticked ? '' : 'the box is not ticked');
  }
  if (!meta) { add('The DOI metadata could be read', false); return { ok: false, checks }; }
  add('The DOI metadata could be read', true, meta.agency);
  /* A published version given at submission gets the same checks as one reported later (tools/published.js). */
  if (form.published && pub !== undefined) {
    checks.push(...require('./published.js').checkPublished({ versions: [{ doi: meta.doi || form.doi }], authors: meta.authors }, form.published, pub));
  }
  add('The DOI is for a work, not for a review of one', meta.type !== 'peer-review', meta.type || '');
  /* From SITE.doiAgeFrom, counted on the day the issue was opened. A new version of a listed work is not counted again. */
  if (!form.update && age && age.opened >= SITE.doiAgeFrom) checks.push(doiAgeCheck(age.first, age.opened));
  /* From SITE.noticesFrom: no retraction, withdrawal or removal, and no expression of concern without the operator (tools/notices.js). */
  if (age && age.opened >= SITE.noticesFrom) checks.push(require('./notices.js').noticeCheck(notices));
  /* Every licence entry must be the same accepted licence: Crossref may give one per version (vor, am, tdm), and a CC BY entry
   * beside a non-free one does not allow a copy. Mixed entries go to the operator. */
  const kinds = [...new Set(meta.licences)];
  const lic = kinds.length === 1 && SITE.licenses[kinds[0]] ? kinds[0] : null;
  add('The work carries an accepted licence', lic, lic ? SITE.licenses[lic] : kinds.length > 1 ? 'more than one licence in the metadata (' + kinds.join(', ') + '); the operator decides' : 'none of CC BY 4.0, CC BY-SA 4.0 or CC0 1.0 in the metadata');
  add('The DOI metadata has a title and a date', meta.title && meta.date);
  add('There is an abstract', meta.abstract || (form.abstract || '').trim(), meta.abstract ? 'from the DOI metadata' : 'from the form');
  if (!person) { add('The ORCID record could be read', false); return { ok: false, checks }; }
  add('The ORCID record links this GitHub account', linksGithub(person.urls, login), 'https://github.com/' + login);
  const m = authorOf(meta, form.doi, form.orcid, person, works);
  add('The ORCID iD belongs to an author of the work', m.author,
    m.how === 'id' ? 'the DOI metadata lists this ORCID iD' : m.how === 'name' ? 'the ORCID record lists this DOI and its name matches an author' : 'neither the DOI metadata nor the ORCID record connects them');
  return { ok: checks.every((c) => c[1]), checks, author: m.author, licence: lic };
}

/* Pure: the author of the work that an ORCID record is, if any. Either the DOI metadata lists the ORCID iD,
 * or the ORCID record lists the DOI and its name matches an author. */
function authorOf(meta, doi0, orcid, person, works) {
  const byId = meta.authors.find((a) => a.orcid && a.orcid === orcid);
  if (byId) return { author: byId, how: 'id' };
  const doi = String(meta.doi || doi0).toLowerCase();
  const claimed = works && [...works].some((w) => w === doi || w.startsWith(doi + '.v'));
  const byName = claimed && person && meta.authors.find((a) => sameName(person, a));
  return byName ? { author: byName, how: 'name' } : { author: null, how: null };
}

/* ------------------------------------------------------------ the other authors (Submission Policy) */

/* From this day, a work with more than one author is listed only after every other author confirms their own agreement. */
const COAUTHORS_FROM = '2026-11-21';
const AGREE = 'I agree to the listing of this work on Sophaxis.';
const BY_EMAIL = 'Confirmed by email through the ORCID record:';
const COAUTHOR_LABEL = 'Every other author has confirmed their own agreement';
const squash = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

/* Pure: the confirmations in the comments of an issue. A co-author writes AGREE with their ORCID iD, from their own account;
 * the operator writes BY_EMAIL with the ORCID iD of an author who confirmed by email. Comments by bots are ignored. */
function confirmationsIn(comments, owner) {
  const out = [];
  for (const c of comments || []) {
    if (!c.user || c.user.type === 'Bot') continue;
    const body = squash(c.body);
    const orcid = orcidOf(c.body);
    if (!orcid) continue;
    const byOperator = !!owner && c.user.login.toLowerCase() === owner.toLowerCase() && body.includes(squash(BY_EMAIL));
    if (byOperator || body.includes(squash(AGREE))) out.push({ login: c.user.login, orcid, byOperator });
  }
  return out;
}

/* Pure: whether a confirmation holds. `person` and `works` come from the ORCID record it names.
 * A comment counts only from a GitHub account that the ORCID record links; the operator's record of an email counts as it is. */
function confirmedAuthor(meta, doi, conf, person, works) {
  if (!person) return null;
  if (!conf.byOperator && !linksGithub(person.urls, conf.login)) return null;
  return authorOf(meta, doi, conf.orcid, person, works).author;
}

/* Pure: the check row, or null before COAUTHORS_FROM. `confirmed` are authors of the work, as confirmedAuthor gives them. */
function coauthorCheck(authors, submitter, confirmed, today) {
  if (String(today).slice(0, 10) < COAUTHORS_FROM) return null;
  if (authors.length <= 1) return [COAUTHOR_LABEL, true, 'the work has one author'];
  const missing = authors.filter((a) => a !== submitter && !confirmed.includes(a));
  const n = authors.length - missing.length;
  return [COAUTHOR_LABEL, missing.length === 0, n + ' of ' + authors.length + ' authors' + (missing.length ? '; waiting for ' + missing.map((a) => a.name).join(', ') : '')];
}

function coauthorNote() {
  return `
Identity and licence are verified for the account that opened this issue. The other authors have not all confirmed their own agreement yet, as the [Submission Policy](${SITE.baseUrl}policies/submission.html) asks.
Each of them comments in this issue, from a GitHub account that their ORCID record links, with these words and their own ORCID iD:

~~~~
${AGREE} ORCID: 0000-0000-0000-0000
~~~~

An author who cannot comment here writes by email to the address on the operator's ORCID record (https://orcid.org/${SITE.operator.orcid}) instead.
The agreement also covers the provision of the author's personal data that the [Privacy Policy](${SITE.baseUrl}policies/privacy.html) sets out, including to services in the United States.
Saving to the Internet Archive is a separate consent, given in the form above or not at all.
Any author can withdraw a consent at any time, by the removal form or by email.
Anyone can object, at any time, to the use of their personal data on Sophaxis, on grounds of their own situation.
From ${SITE.residenceFrom}, Sophaxis does not list work by an author who lives in any of these places, or who stays in one between the submission and the listing, even briefly: ${(SITE.notOffered || []).map((p) => p.place).join(', ')}.
Nor does it list work by an author under 18 who lives or stays in India.
`;
}

/* ------------------------------------------------------------ a researcher who vouches for a first submission (Submission Policy) */

/* From SITE.vouchFrom, a submitter who is not yet an author of a work listed on Sophaxis needs one researcher to vouch for it:
 * a comment from a researcher whose ORCID record links the GitHub account that comments, and lists a journal article,
 * a book chapter or a book with a DOI. The authors of the work and the operator cannot vouch. */
const VOUCH = 'I vouch for this submission to Sophaxis. I am not an author of this work, and I do not live in, or stay in, a place where Sophaxis is not offered.';
const VOUCH_LABEL = 'A researcher with a journal article, a book chapter or a book vouches for a first submission';
const PEER_TYPES = new Set(['journal-article', 'book-chapter', 'book']);

/* Pure: the comments that vouch, with the ORCID iD each gives. */
function vouchesIn(comments) {
  const out = [];
  for (const c of comments || []) {
    if (!c.user || c.user.type === 'Bot') continue;
    const orcid = orcidOf(c.body);
    if (orcid && squash(c.body).includes(squash(VOUCH))) out.push({ login: c.user.login, orcid });
  }
  return out;
}

/* Pure: the DOIs of the journal articles, book chapters and books in the works of an ORCID record. */
function peerWorks(json) {
  const out = new Set();
  for (const g of (json && json.group) || []) {
    if (!(g['work-summary'] || []).some((w) => PEER_TYPES.has(w.type))) continue;
    for (const x of ((g['external-ids'] || {})['external-id'] || [])) {
      if (x['external-id-type'] === 'doi' && x['external-id-relationship'] !== 'part-of') out.add(String(x['external-id-value']).toLowerCase());
    }
  }
  return out;
}

/* Pure: why a vouching comment does not count, or null when it does. */
function vouchProblem({ e, person, peer, meta, submitter }) {
  if (SITE.operator.github && e.login.toLowerCase() === SITE.operator.github.toLowerCase()) return 'the operator cannot vouch';
  if (e.orcid === SITE.operator.orcid) return 'the operator cannot vouch';
  if (submitter && e.orcid === submitter) return 'the submitter cannot vouch';
  if (!person) return 'the ORCID record could not be read';
  if (!linksGithub(person.urls, e.login)) return 'the ORCID record does not link this GitHub account';
  if (meta.authors.some((a) => (a.orcid && a.orcid === e.orcid) || sameName(person, a))) return 'an author of the work cannot vouch';
  if (!peer || !peer.size) return 'the ORCID record lists no journal article, book chapter or book with a DOI';
  return null;
}

/* The records in data/papers. */
function loadRecords(dir = path.join(ROOT, 'data', 'papers')) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
}

/* Pure: whether the submitter is already an author of a work that Sophaxis lists, by ORCID iD. */
function listedAuthor(orcid, records) {
  return !!orcid && records.some((p) => p.status === 'listed' && (p.authors || []).some((a) => a.orcid === orcid));
}

/* Pure: the row of the check. results holds { e, problem } for each vouching comment. */
function vouchCheck(results, exempt) {
  if (exempt) return [VOUCH_LABEL, true, 'the submitter is already an author of a listed work'];
  const good = results.filter((r) => !r.problem);
  if (good.length) return [VOUCH_LABEL, true, 'vouched for by ORCID ' + good.map((r) => r.e.orcid).join(', ')];
  return [VOUCH_LABEL, false, results.length ? results.map((r) => 'ORCID ' + r.e.orcid + ': ' + r.problem).join('; ') : 'waiting for a researcher to vouch for it'];
}

function vouchNote() {
  return `
This is a first submission, and it needs one researcher to vouch for it, as the [Submission Policy](${SITE.baseUrl}policies/submission.html) asks.
A researcher whose public ORCID record lists a journal article, a book chapter or a book with a DOI, and links their GitHub account, comments in this issue with these words and their own ORCID iD:

~~~~
${VOUCH} ORCID: 0000-0000-0000-0000
~~~~

The authors of the work and the operator cannot vouch. Vouching says that the work is in scope and in the ordinary form of a scholarly paper; it is not a review, and the moderator still decides.
The GitHub username, ORCID iD and comment of the researcher are public, and the check reads the name, the websites and the works of their public ORCID record, as the [Privacy Policy](${SITE.baseUrl}policies/privacy.html) sets out.
`;
}

/* ------------------------------------------------------------ the draft */

function nextId(paperDir, year) {
  const seq = fs.existsSync(paperDir) ? fs.readdirSync(paperDir)
    .map((f) => f.match(/^(\d{4})\.(\d{4})\.json$/)).filter((m) => m && m[1] === String(year)).map((m) => Number(m[2])) : [];
  return year + '.' + String((seq.length ? Math.max(...seq) : 0) + 1).padStart(4, '0');
}

function draft({ form, login, issue, meta, versions, result, paperDir, today, pub, opened }) {
  const dir = paperDir || path.join(ROOT, 'data', 'papers');
  if (form.update) {
    const file = path.join(dir, form.update + '.json');
    if (!fs.existsSync(file)) return { problems: ['no record ' + form.update] };
    const p = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (p.status !== 'listed') return { problems: ['the record ' + form.update + ' is ' + p.status + ' and takes no new versions'] };
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
    /* Where the DOI metadata has no abstract, the authors give it in the issue, and the record page says so. */
    ...(meta.abstract ? {} : { abstract_source: 'authors' }),
    category: form.category,
    ...(form.others && form.others.length ? { categories: form.others } : {}),
    ...(meta.keywords && meta.keywords.length ? { keywords: meta.keywords } : {}),
    license: result.licence,
    ...(meta.language ? { language: meta.language } : {}),
    versions: versions.map((v, i) => ({ version: i + 1, doi: v.doi, date: v.date })),
    llm_disclosure: form.llm.trim(),
    /* The saves to the Internet Archive are a separate, optional consent. A form that asks it and has it unticked keeps the record out of them. */
    ...('archive' in form && !/^- \[[xX]\] /m.test(String(form.archive || '')) ? { archive: false } : {}),
    ...(extentKey(form.llm_extent) ? { llm_extent: extentKey(form.llm_extent) } : {}),
    issue: Number(issue),
    /* The day of the draft. The moderator sets it to the day the record is merged. */
    listed: (today || new Date().toISOString()).slice(0, 10),
    status: 'listed',
  };
  /* The operator's own submission keeps the day its issue was opened: it is listed SITE.ownWaitDays days later at the earliest (Moderation Policy). */
  if (SITE.operator.github && login.toLowerCase() === SITE.operator.github.toLowerCase()) Object.assign(p, { operator_own: true, submitted: opened || p.listed });
  if (form.published && pub) {
    const P = require('./published.js');
    p.published = P.toPublished(p, pub, { peer: P.PEER[String(form.peer || '').trim()], today: (today || new Date().toISOString()).slice(0, 10), issue });
  }
  return { record: p, problems: validate(p, id + '.json') };
}

/* Pure: what to tell the authors about the PDF copy, given the DOI of a version. Where the repository
 * does not let a script fetch the file, the copy can only come from an attachment to the issue. */
function pdfNote(doi) {
  if (sourceFor(doi, 1)) return '';
  return `
The repository of this work does not let Sophaxis fetch the PDF. To have an unmodified copy kept on Sophaxis, so that search engines can index the full text, attach the deposited PDF to this issue (drag it into a comment). The file must be the one in the repository, at most ${LIMITS.file / 1024 / 1024} MB. Without it, the record links to the repository only.
`;
}

/* ------------------------------------------------------------ advice on the metadata */

/* deposit-check (https://github.com/cpsbvbng26-dotcom/deposit-check) reads the DOI metadata against its rules. Its errors and
 * warnings are given to the authors as advice: fixing the metadata at the repository helps indexes and readers.
 * The advice does not decide the listing, and does not change the checks above. Rules about the ORCID record are left out:
 * they concern the author's other works, not this submission. */
const ADVICE_SKIP = new Set(['not-on-orcid', 'unresolved', 'same-title']);
function adviceFrom(report) {
  return ((report && report.findings) || []).filter((f) => (f.severity === 'error' || f.severity === 'warning') && !ADVICE_SKIP.has(f.rule));
}

function adviceNote(advice) {
  if (!advice || !advice.length) return '';
  const safe = (s) => String(s).replace(/[`|<>]/g, '');
  return `
**Advice on the metadata at the repository.** This does not decide the listing. [deposit-check](https://github.com/cpsbvbng26-dotcom/deposit-check) found in the DOI metadata:

${advice.map((f) => '- ' + safe(f.title || f.rule) + ' (`' + f.rule + '`): ' + safe(f.detail)).join('\n')}

Indexes such as Google Scholar and OpenAlex read this metadata, not the PDF. Most repositories let you correct it without making a new version.
`;
}

/* Run deposit-check on one DOI, if it is checked out beside the site (intake.yml does so). Any failure gives no advice. */
function metadataAdvice(doi, dir = path.join(ROOT, 'deposit-check')) {
  const bin = path.join(dir, 'bin', 'deposit-check.js');
  if (!fs.existsSync(bin) || !/^10\.\d{4,9}\/\S+$/.test(String(doi || ''))) return [];
  try {
    const out = require('child_process').execFileSync('node', [bin, '--doi', doi, '--format', 'json', '--fail-on', 'never'], { encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'ignore'] });
    const rules = require(path.join(dir, 'src', 'rules.js'));
    return adviceFrom(JSON.parse(out)).map((f) => Object.assign({ title: (rules.byId(f.rule) || {}).title }, f));
  } catch (e) {
    console.error('deposit-check: ' + e.message);
    return [];
  }
}

function comment(result, d, advice = [], shape = null) {
  const safe = (s) => String(s).replace(/[`|<>]/g, '');
  const rows = result.checks.map(([label, pass, detail]) => `| ${pass ? 'pass' : '**fail**'} | ${label} | ${safe(detail)} |`).join('\n');
  let out = `${MARK}
**Automatic checks** (run again whenever this issue is edited, or an author confirms in a comment)

| | check | detail |
| --- | --- | --- |
${rows}
`;
  if (result.ok && d && d.record && !d.problems.length) {
    out += `
Identity and licence are verified. The submission is now provisionally registered: it is not on the site until a moderator accepts it. This is not acceptance: a moderator still reads the work against the policy, and makes the decision.

Draft record \`data/papers/${d.record.id}.json\`. The id is provisional: if another record takes it first, the record is listed under the next free id. An id is never given to a second work.

~~~~json
${JSON.stringify(d.record, null, 2).replace(/~~~~/g, '~ ~ ~ ~')}
~~~~
` + pdfNote(d.record.versions[d.record.versions.length - 1].doi) + adviceNote(advice);
  } else if (d && d.problems && d.problems.length) {
    out += '\nThe draft record does not validate: ' + safe(d.problems.join('; ')) + '\n';
  } else if (result.checks.some((c) => c[0] === COAUTHOR_LABEL || c[0] === VOUCH_LABEL) && result.checks.every((c) => c[1] || c[0] === COAUTHOR_LABEL || c[0] === VOUCH_LABEL)) {
    if (result.checks.some((c) => c[0] === COAUTHOR_LABEL && !c[1])) out += coauthorNote();
    if (result.checks.some((c) => c[0] === VOUCH_LABEL && !c[1])) out += vouchNote();
  } else {
    out += `
Not verified. Fix what failed, then edit this issue to run the checks again.
To link your GitHub account, add \`https://github.com/<your username>\` under "Websites & social links" in your ORCID record.
`;
  }
  out += shapeNote(shape);
  return out;
}

/* ------------------------------------------------------------ the shape of the PDF (Moderation Policy) */

/* Where the repository lets Sophaxis fetch the PDF of the latest version, its shape is read for the moderator: pages,
 * readable text, the title, an abstract and references (tools/pdf_shape.js). It decides nothing. The file is kept only
 * for the reading, in the runner's temporary folder, and deleted after. Null where the repository does not allow it. */
async function pdfShape(versions, title) {
  const last = versions[versions.length - 1];
  const src = last && sourceFor(last.doi, versions.length);
  if (!src) return null;
  const file = path.join(require('os').tmpdir(), 'sophaxis-shape-' + process.pid + '.pdf');
  try {
    const { bytes, md5 } = await download(src);
    const problems = accept(bytes, md5);
    if (problems.length) return { error: 'the PDF in the repository is ' + problems.join(', ') };
    fs.writeFileSync(file, bytes);
    return shapeOfFile(file, title);
  } catch (e) {
    console.error(e.message);
    return { error: 'the PDF could not be fetched from the repository' };
  } finally {
    fs.rmSync(file, { force: true });
  }
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
  if (cr) return { meta: fromCrossref(cr), raw: cr };
  const ja = await getJson('https://api.japanlinkcenter.org/dois/' + enc);
  return ja && ja.status === 'OK' && ja.data ? { meta: fromJaLC(ja), raw: ja } : { meta: null };
}

/* The versions behind a DOI: Figshare numbers them .v1, .v2, …; arXiv keeps one DOI. */
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
async function run(form, login, opened = jstDay(new Date().toISOString())) {
  let meta = null, raw = null, person = null, works = null, versions = [];
  const age = { opened, first: null };
  try {
    if (repoPrefix(form.doi || '')) ({ meta, raw } = await lookUp(form.doi));
    if (meta) versions = await versionsOf(form.doi, meta, raw);
  } catch (e) { console.error(e.message); meta = null; }
  try {
    if (meta && !form.update && opened >= SITE.doiAgeFrom) age.first = await firstDoi(form.doi, raw);
  } catch (e) { console.error(e.message); age.first = null; }
  let notices;
  try {
    if (meta && opened >= SITE.noticesFrom) notices = await require('./notices.js').lookUpNotices(form.doi);
  } catch (e) { console.error(e.message); notices = undefined; }
  try {
    if (form.orcid && orcidOk(form.orcid)) {
      const p = await orcidPersonJson(form.orcid);
      const w = await getJson('https://pub.orcid.org/v3.0/' + form.orcid + '/works');
      person = p && orcidPerson(p);
      works = w ? orcidDois(w) : new Set();
    }
  } catch (e) { console.error(e.message); person = null; }
  let pub;
  if (form.published) {
    pub = null;
    try { if (/^10\.\d{4,9}\/\S+$/.test(form.published)) pub = await require('./published.js').lookUpPublished(form.published); } catch (e) { console.error(e.message); }
  }
  return { result: check({ form, login, meta, person, works, listed: listedDois(path.join(ROOT, 'data', 'papers')), pub, age, notices }), meta, versions, pub };
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
    const { result, meta, versions } = await run(form, arg('--login'), arg('--opened') || undefined);
    const d = meta && result.ok ? draft({ form, login: arg('--login'), issue: 0, meta, versions, result }) : null;
    console.log(comment(result, d, meta ? metadataAdvice(form.doi) : []));
    if (meta) console.log('versions: ' + JSON.stringify(versions));
    return;
  }
  const n = process.env.ISSUE_NUMBER;
  const login = process.env.ISSUE_AUTHOR;
  const form = parseIssue(process.env.ISSUE_BODY);
  /* The age of the DOI is counted on the day the issue was opened, not the day it was last edited. */
  const issue = await github('GET', '/issues/' + n);
  const opened = jstDay(issue && issue.created_at ? issue.created_at : new Date().toISOString());
  const { result, meta, versions, pub } = await run(form, login, opened);
  const all = (await github('GET', '/issues/' + n + '/comments?per_page=100')) || [];
  if (meta && result.author) {
    const confirmed = [];
    for (const c of confirmationsIn(all, SITE.operator.github)) {
      try {
        const p = await orcidPersonJson(c.orcid);
        const w = await getJson('https://pub.orcid.org/v3.0/' + c.orcid + '/works');
        const a = confirmedAuthor(meta, form.doi, c, p && orcidPerson(p), w ? orcidDois(w) : new Set());
        if (a) confirmed.push(a);
      } catch (e) { console.error(e.message); }
    }
    /* The policies give their dates in Japan time. */
    const row = coauthorCheck(meta.authors, result.author, confirmed, new Date(Date.now() + 9 * 3600 * 1000).toISOString());
    if (row) { result.checks.push(row); result.ok = result.ok && row[1]; }
  }
  if (meta && result.author && !form.update && opened >= SITE.vouchFrom) {
    const exempt = listedAuthor(form.orcid, loadRecords());
    const results = [];
    if (!exempt) {
      for (const e of vouchesIn(all)) {
        let person = null, peer = null;
        try {
          const p = await orcidPersonJson(e.orcid);
          const w = await getJson('https://pub.orcid.org/v3.0/' + e.orcid + '/works');
          person = p && orcidPerson(p);
          peer = w ? peerWorks(w) : new Set();
        } catch (err) { console.error(err.message); }
        results.push({ e, problem: vouchProblem({ e, person, peer, meta, submitter: form.orcid }) });
      }
    }
    const row = vouchCheck(results, exempt);
    result.checks.push(row);
    result.ok = result.ok && row[1];
  }
  const d = meta && result.ok ? draft({ form, login, issue: n, meta, versions, result, pub, opened }) : null;
  const shape = meta && !form.update ? await pdfShape(versions, meta.title) : null;
  const body = comment(result, d, d && d.record ? metadataAdvice(form.doi) : [], shape);
  const mine = all.find((c) => c.user.type === 'Bot' && c.body.startsWith(MARK));
  if (mine) await github('PATCH', '/issues/comments/' + mine.id, { body });
  else await github('POST', '/issues/' + n + '/comments', { body });
  const verified = result.ok && d && !d.problems.length;
  await github('DELETE', '/issues/' + n + '/labels/' + (verified ? 'unverified' : 'verified'));
  await github('POST', '/issues/' + n + '/labels', { labels: [verified ? 'verified' : 'unverified'] });
  console.log(verified ? 'verified' : 'not verified');
}

module.exports = { VOUCH, VOUCH_LABEL, PEER_TYPES, vouchesIn, peerWorks, vouchProblem, listedAuthor, vouchCheck, vouchNote, pdfShape, DOI_AGE_LABEL, jstDay, addMonths, registeredOf, earlierDois, firstDoi, earliestOf, doiAgeCheck, CONSENTS, extentKey, MODEL_NAMES, authorOf, confirmationsIn, confirmedAuthor, coauthorCheck, coauthorNote, COAUTHORS_FROM, AGREE, BY_EMAIL, COAUTHOR_LABEL, iso3, lookUp, versionsOf, getJson, github, listedAs, listedDois, parseIssue, plain, licenceOf, fromDataCite, fromCrossref, fromJaLC, orcidPerson, orcidPersonJson, orcidDois, linksGithub, sameName, check, nextId, draft, comment, pdfNote, adviceFrom, adviceNote, metadataAdvice, ADVICE_SKIP, MARK };

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
