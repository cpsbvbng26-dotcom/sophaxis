#!/usr/bin/env node
/* The published version of a listed preprint: read a report from an author, check it, and draft the change.
 *
 * In GitHub Actions (see .github/workflows/intake.yml):
 *   GITHUB_EVENT_PATH, GITHUB_TOKEN, GITHUB_REPOSITORY (the issue is read from the event file, as in tools/intake.js)
 *   node tools/published.js
 *
 * What it reads, and nothing else:
 *   - the record in data/papers;
 *   - the public metadata of the published DOI, from DataCite or Crossref;
 *   - the name, the websites and the works of the public ORCID record given in the form, as at submission.
 *
 * The same pure functions are used at submission (tools/intake.js) and by the weekly watch (tools/watch.js),
 * which looks for a published version that the publisher's metadata links to a listed preprint.
 * The checks decide nothing. The operator records the published version under the Submission Policy.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { validate, orcidOk, repoPrefix } = require('../build.js');

const ROOT = path.join(__dirname, '..');
const MARK = '<!-- sophaxis-published -->';
const FIELDS = {
  'Sophaxis id': 'id',
  'DOI of the published version': 'doi',
  'Was the published version peer-reviewed?': 'peer',
  'Your ORCID iD': 'orcid',
};
/* The answers of the form, and what the record keeps: true, false, or null for "not stated". */
const PEER = {
  'Yes, the journal or the publisher peer-reviewed it': true,
  'No, it was not peer-reviewed': false,
  'I do not know': null,
};

/* Crossref and DataCite types, in the words the site shows (build.js PUBLISHED_KINDS). */
const CROSSREF_KINDS = {
  'journal-article': 'journal article', 'proceedings-article': 'conference paper', 'book-chapter': 'book chapter',
  'book-section': 'book chapter', 'book-part': 'book chapter', book: 'book', monograph: 'book', 'edited-book': 'book', 'reference-book': 'book',
};
const DATACITE_KINDS = { JournalArticle: 'journal article', ConferencePaper: 'conference paper', BookChapter: 'book chapter', Book: 'book' };
/* Relations from the published version back to the preprint. Crossref has has-preprint; DataCite has no
 * preprint relation, so a later version points back with one of these. */
const DATACITE_BACK = ['IsNewVersionOf', 'IsVersionOf', 'IsDerivedFrom', 'IsVariantFormOf'];
/* Relations from the preprint forward to the published version. */
const DATACITE_FORWARD = ['IsPreviousVersionOf', 'IsPublishedIn'];

const bareDoi = (s) => String(s || '').replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').trim();
const lower = (s) => bareDoi(s).toLowerCase();
const plainText = (s) => String(s || '').replace(/<\/?[a-zA-Z][^<>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const datePartsIso = (parts) => (Array.isArray(parts) && parts.length && parts[0]
  ? parts.slice(0, 3).map((n, i) => String(n).padStart(i ? 2 : 4, '0')).join('-') : null);

/* ------------------------------------------------------------ the issue */

function parse(body) {
  const out = {};
  const parts = String(body || '').replace(/\r\n/g, '\n').split(/^### /m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf('\n');
    const label = (nl < 0 ? part : part.slice(0, nl)).trim();
    const value = (nl < 0 ? '' : part.slice(nl + 1)).trim();
    if (FIELDS[label]) out[FIELDS[label]] = value === '_No response_' ? '' : value;
  }
  return {
    id: (String(out.id || '').match(/\d{4}\.\d{4}/) || [''])[0],
    doi: bareDoi(out.doi),
    peer: Object.prototype.hasOwnProperty.call(PEER, (out.peer || '').trim()) ? PEER[out.peer.trim()] : null,
    orcid: (String(out.orcid || '').match(/\d{4}-\d{4}-\d{4}-\d{3}[\dX]/) || [''])[0],
  };
}

/* ------------------------------------------------------------ metadata */

/* Pure: what the metadata of a published DOI says, from the raw answer of DataCite or Crossref. */
function describe(raw) {
  if (raw && raw.message) {
    const m = raw.message;
    const date = ['published-print', 'published-online', 'published', 'issued'].map((k) => m[k] && m[k]['date-parts'] && datePartsIso(m[k]['date-parts'][0])).find(Boolean) || null;
    const book = /book/.test(m.type || '') || m.type === 'monograph';
    return {
      agency: 'Crossref',
      doi: m.DOI,
      kind: CROSSREF_KINDS[m.type] || null,
      type: m.type || '',
      title: plainText((m.title || [])[0]),
      venue: plainText((m['container-title'] || [])[0] || (book ? m.publisher : '')),
      date,
      authors: (m.author || []).map((a) => ({ family: a.family || a.name || '', orcid: (String(a.ORCID || '').match(/\d{4}-\d{4}-\d{4}-\d{3}[\dX]/) || [null])[0] })),
      back: ((m.relation || {})['has-preprint'] || []).filter((r) => r['id-type'] === 'doi').map((r) => lower(r.id)),
      updates: (m['updated-by'] || []).filter((u) => u.DOI && u.type).map((u) => ({ type: String(u.type).toLowerCase().replace(/[^a-z_]/g, '_'), doi: u.DOI, date: datePartsIso(u.updated && u.updated['date-parts'] && u.updated['date-parts'][0]) })).filter((u) => u.date && u.date.length === 10),
    };
  }
  if (raw && raw.data && raw.data.attributes) {
    const a = raw.data.attributes;
    const pub = typeof a.publisher === 'string' ? a.publisher : (a.publisher || {}).name;
    const kind = DATACITE_KINDS[(a.types || {}).resourceTypeGeneral] || null;
    return {
      agency: 'DataCite',
      doi: a.doi,
      kind,
      type: (a.types || {}).resourceTypeGeneral || '',
      title: plainText(((a.titles || []).find((t) => !t.titleType) || {}).title),
      venue: plainText((a.container || {}).title || (kind === 'book' || kind === 'book chapter' ? pub : '')),
      date: a.publicationYear ? String(a.publicationYear) : null,
      authors: (a.creators || []).map((c) => ({ family: c.familyName || c.name || '', orcid: (String(((c.nameIdentifiers || []).find((n) => /orcid/i.test(n.nameIdentifierScheme || '')) || {}).nameIdentifier || '').match(/\d{4}-\d{4}-\d{4}-\d{3}[\dX]/) || [null])[0] })),
      back: (a.relatedIdentifiers || []).filter((r) => DATACITE_BACK.includes(r.relationType) && r.relatedIdentifierType === 'DOI').map((r) => lower(r.relatedIdentifier)),
      updates: [],
    };
  }
  return null;
}

/* Pure: the DOIs that a preprint's own metadata names as its published version. */
function forward(raw) {
  if (raw && raw.message) return ((raw.message.relation || {})['is-preprint-of'] || []).filter((r) => r['id-type'] === 'doi').map((r) => lower(r.id));
  if (raw && raw.data && raw.data.attributes) {
    return (raw.data.attributes.relatedIdentifiers || [])
      .filter((r) => DATACITE_FORWARD.includes(r.relationType) && r.relatedIdentifierType === 'DOI' && !repoPrefix(r.relatedIdentifier))
      .map((r) => lower(r.relatedIdentifier));
  }
  return [];
}

/* Pure: the works that a Crossref search by relation.object returns as having this preprint. */
function backFromSearch(json, dois) {
  const want = new Set(dois.map(lower));
  return ((json && json.message && json.message.items) || [])
    .filter((it) => ((it.relation || {})['has-preprint'] || []).some((r) => want.has(lower(r.id))))
    .map((it) => lower(it.DOI));
}

/* Pure: does the published version share an author with the record (an ORCID iD, or else a family name)? */
function sharesAuthor(record, desc) {
  const ids = new Set(record.authors.map((a) => a.orcid).filter(Boolean));
  if (desc.authors.some((a) => a.orcid && ids.has(a.orcid))) return 'a shared ORCID iD';
  const fam = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const names = new Set(record.authors.map((a) => fam(a.family || a.name.split(/\s+/).pop())).filter(Boolean));
  return desc.authors.some((a) => names.has(fam(a.family))) ? 'a shared family name' : '';
}

/* ------------------------------------------------------------ the checks */

/* Pure: the checks on the published DOI, shared by the report and by submission. */
function checkPublished(record, doi, desc) {
  const checks = [];
  const add = (label, pass, detail) => checks.push([label, !!pass, detail || '']);
  const versions = record.versions.map((v) => lower(v.doi));
  add('The published version is given as a DOI', /^10\.\d{4,9}\/\S+$/.test(doi), doi);
  add('It is not one of the listed versions', !versions.includes(lower(doi)));
  add('It is not in a preprint repository', !repoPrefix(doi), repoPrefix(doi) ? 'it is at ' + repoPrefix(doi) : '');
  if (!desc) { add('Its metadata could be read in DataCite or Crossref', false); return checks; }
  add('Its metadata could be read in DataCite or Crossref', true, desc.agency);
  add('It is a journal article, a conference paper, a book chapter or a book', desc.kind, desc.type);
  add('Its metadata names the journal, the proceedings or the book, and a date', desc.venue && desc.date, [desc.venue, desc.date].filter(Boolean).join(', '));
  add('It shares an author with the record', sharesAuthor(record, desc), sharesAuthor(record, desc) || 'no shared ORCID iD or family name');
  return checks;
}

/* Pure: the checks on a report. `record` is the record of that id, or null; `person` and `works` come from the ORCID record. */
function check({ form, login, record, person, works, desc }) {
  const checks = [];
  const add = (label, pass, detail) => checks.push([label, !!pass, detail || '']);
  add('The record exists and is listed', record && record.status === 'listed', record ? form.id + ' is ' + record.status : 'no record ' + (form.id || '(no id)'));
  add('The ORCID iD is valid', form.orcid && orcidOk(form.orcid));
  if (!record || record.status !== 'listed') return { ok: false, checks, info: [] };
  add('The record has no published version yet', !record.published, record.published ? 'it has ' + record.published.doi + '; to change it, use the correction form' : '');
  checks.push(...checkPublished(record, form.doi, desc));
  if (!person) { add('The ORCID record could be read', false); return { ok: false, checks, info: [] }; }
  const I = require('./intake.js');
  add('The ORCID record links this GitHub account', I.linksGithub(person.urls, login), 'https://github.com/' + login);
  const byId = record.authors.find((a) => a.orcid && a.orcid === form.orcid);
  const dois = record.versions.map((v) => v.doi.toLowerCase());
  const claimed = works && [...works].some((w) => dois.some((d) => w === d || w.startsWith(d + '.v') || d.startsWith(w + '.v')));
  const byName = claimed && record.authors.find((a) => I.sameName(person, a));
  add('The ORCID iD belongs to an author of the work', byId || byName,
    byId ? 'the record lists this ORCID iD' : byName ? 'the ORCID record lists the DOI and its name matches an author' : 'neither the record nor the ORCID record connects them');
  /* Shown to the moderator, not required: titles often change on publication, and many publishers do not link preprints. */
  const info = desc ? [
    ['Title of the published version', desc.title],
    ['Title of the record', record.title],
    ['The publisher’s metadata links this preprint', linked(record, desc) ? 'yes' : 'no'],
    ['Peer review, as the author states', form.peer === true ? 'yes' : form.peer === false ? 'no' : 'not stated'],
  ] : [];
  return { ok: checks.every((c) => c[1]), checks, info };
}

/* Pure: does the published version's metadata point back to one of the record's versions? */
const linked = (record, desc) => !!desc && desc.back.some((d) => record.versions.some((v) => lower(v.doi) === d || d.startsWith(lower(v.doi) + '.v') || lower(v.doi).startsWith(d + '.v')));

/* Pure: the "published" object of a record. */
function toPublished(record, desc, { peer, today, issue }) {
  return Object.assign({
    doi: desc.doi,
    title: desc.title,
    venue: desc.venue,
    date: desc.date,
    type: desc.kind,
    peer_reviewed: peer === true || peer === false ? peer : null,
    evidence: linked(record, desc) ? 'publisher' : 'authors',
    reported: today,
  }, Number.isInteger(Number(issue)) && Number(issue) > 0 ? { issue: Number(issue) } : {},
  desc.updates.length ? { updates: desc.updates } : {});
}

/* Pure: the record as it is with its published version. Nothing else changes: the preprint stays listed. */
function draft(record, form, desc, issue, today) {
  const p = JSON.parse(JSON.stringify(record));
  p.published = toPublished(record, desc, { peer: form.peer, today, issue });
  return { record: p, problems: validate(p, p.id + '.json') };
}

function comment(result, d) {
  const safe = (s) => String(s).replace(/[`|<>]/g, '');
  const rows = result.checks.map(([label, pass, detail]) => `| ${pass ? 'pass' : '**fail**'} | ${label} | ${safe(detail)} |`).join('\n');
  const info = (result.info || []).map(([k, v]) => `| ${k} | ${safe(v)} |`).join('\n');
  let out = `${MARK}
**Automatic checks for a published version** (run again whenever this issue is edited)

| | check | detail |
| --- | --- | --- |
${rows}
${info ? `
For the moderator, not required:

| | |
| --- | --- |
${info}
` : ''}`;
  if (result.ok && d && !d.problems.length) {
    out += `
The account reporting belongs to an author, and the DOI is a published version that shares an author with the record. The operator records it under the Submission Policy; the preprint stays listed.

Record \`data/papers/${d.record.id}.json\` with its published version:

~~~~json
${JSON.stringify(d.record, null, 2).replace(/~~~~/g, '~ ~ ~ ~')}
~~~~
`;
  } else if (d && d.problems.length) {
    out += '\nThe record with its published version does not validate: ' + safe(d.problems.join('; ')) + '\n';
  } else {
    out += `
Not verified. Fix what failed, then edit this issue to run the checks again.
To link your GitHub account, add \`https://github.com/<your username>\` under "Websites & social links" in your ORCID record.
`;
  }
  return out;
}

/* ------------------------------------------------------------ network */

/* The published version of a DOI, read as Crossref or DataCite give it. */
async function lookUpPublished(doi) {
  const I = require('./intake.js');
  const enc = encodeURIComponent(doi);
  const cr = await I.getJson('https://api.crossref.org/works/' + enc);
  if (cr) return describe(cr);
  const dc = await I.getJson('https://api.datacite.org/dois/' + enc);
  return dc ? describe(dc) : null;
}

/* The candidates for a published version of a record: what the preprint's metadata names, and what Crossref lists
 * as having one of its versions as a preprint. Used by the weekly watch; nothing is recorded without the authors. */
async function candidates(record) {
  const I = require('./intake.js');
  const dois = [...new Set(record.versions.map((v) => v.doi))];
  const found = new Set();
  for (const doi of dois) {
    const { raw } = await I.lookUp(doi);
    forward(raw).forEach((d) => found.add(d));
    const json = await I.getJson('https://api.crossref.org/works?filter=relation.object:' + encodeURIComponent(doi) + '&rows=20&select=DOI,type,relation');
    backFromSearch(json, [doi]).forEach((d) => found.add(d));
  }
  return [...found].filter((d) => !dois.some((v) => lower(v) === d) && !repoPrefix(d));
}

async function main() {
  const I = require('./intake.js');
  const { number: n, author: login, body: text } = I.issueEvent();
  const form = parse(text);
  const file = path.join(ROOT, 'data', 'papers', form.id + '.json');
  const record = form.id && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  let person = null, works = null, desc = null;
  try { if (record && /^10\.\d{4,9}\/\S+$/.test(form.doi)) desc = await lookUpPublished(form.doi); } catch (e) { console.error(e.message); }
  try {
    if (record && orcidOk(form.orcid)) {
      const p = await I.orcidPersonJson(form.orcid);
      const w = await I.getJson('https://pub.orcid.org/v3.0/' + form.orcid + '/works');
      person = p && I.orcidPerson(p);
      works = w ? I.orcidDois(w) : new Set();
    }
  } catch (e) { console.error(e.message); person = null; }
  const result = check({ form, login, record, person, works, desc });
  const d = result.ok ? draft(record, form, desc, n, new Date().toISOString().slice(0, 10)) : null;
  const body = comment(result, d);
  const mine = ((await I.github('GET', '/issues/' + n + '/comments?per_page=100')) || []).find((c) => c.user.type === 'Bot' && c.body.startsWith(MARK));
  if (mine) await I.github('PATCH', '/issues/comments/' + mine.id, { body });
  else await I.github('POST', '/issues/' + n + '/comments', { body });
  const verified = result.ok && d && !d.problems.length;
  await I.github('DELETE', '/issues/' + n + '/labels/' + (verified ? 'unverified' : 'verified'));
  await I.github('POST', '/issues/' + n + '/labels', { labels: [verified ? 'verified' : 'unverified'] });
  console.log(verified ? 'verified' : 'not verified');
}

module.exports = { parse, describe, forward, backFromSearch, sharesAuthor, checkPublished, check, linked, toPublished, draft, comment, lookUpPublished, candidates, MARK, FIELDS, PEER };

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
