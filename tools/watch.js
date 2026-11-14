#!/usr/bin/env node
/* Once a week: check that every listed DOI still resolves and keeps its licence,
 * look for versions that the repository has and the record has not yet,
 * look for a published version that the publisher's metadata links to a listed preprint,
 * check that a recorded published version still resolves and has no new retraction or correction notice,
 * read each PDF copy in data/pdf/ against its recorded SHA-256 and the licence of its record, with the advice of
 * tools/pdf_advice.js (counts and fixed words only, never what a copy says),
 * and ask the Internet Archive to save the pages and the PDF copies.
 *
 * Run by .github/workflows/watch.yml (GITHUB_TOKEN, GITHUB_REPOSITORY).
 *   node tools/watch.js --dry-run     # report only; open no issue, save nothing
 *
 * Problems and new versions are reported in one open issue labelled "watch"; when there are none, that issue is closed.
 * Saving to the Internet Archive is best effort and never fails the run.
 */
'use strict';
const { request } = require('./ua.js');

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const A = require('./pdf_advice.js');
const { lookUp, versionsOf, github } = require('./intake.js');
const P = require('./published.js');

const ROOT = path.join(__dirname, '..');
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const MARK = '<!-- sophaxis-watch -->';
/* Saves to the Internet Archive. On 2026-11-02 five saves 20 seconds apart went through and the sixth could not
 * even connect (UND_ERR_CONNECT_TIMEOUT), twice, a minute apart; the sixth address had never been saved.
 * The archive limits saves that come close together, so they are spaced a minute apart, and a refused save
 * is tried again after two minutes and then after five. */
const SAVE_GAP_MS = 60 * 1000;
const RETRY_WAITS_MS = [2 * 60 * 1000, 5 * 60 * 1000];
/* Lookups of a published version. On 2026-11-02 Crossref answered 429 to three of eight records looked up one
 * after another. They are spaced two seconds apart, and a refused lookup is tried again after 30 and 60 seconds. */
const LOOKUP_GAP_MS = 2 * 1000;
const LOOKUP_RETRY_WAITS_MS = [30 * 1000, 60 * 1000];
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
/* OpenAlex, the open index of scholarly works, is read for each work shown: whether it holds the work, whether it
 * holds its abstract, and whether a Sophaxis record page is among its locations. For information only: it opens no issue. */
const OPENALEX_GAP_MS = 200;

/* Pure: what the weekly report says of one OpenAlex work (null when OpenAlex does not hold it). */
function fromOpenAlex(w, base = SITE.baseUrl) {
  if (!w) return null;
  const locs = w.locations || [];
  return { id: w.id, abstract: !!w.abstract_inverted_index, locations: locs.length, sophaxis: locs.some((l) => String(l.landing_page_url || '').startsWith(base)), cited: w.cited_by_count || 0 };
}

/* Pure: a table of the works shown, as OpenAlex holds them. Each row: { id, doi, oa } where oa is fromOpenAlex's result, null, or 'error'. */
function indexTable(rows) {
  const yes = (b) => (b ? 'yes' : 'no');
  return '| Record | DOI | OpenAlex | Abstract | Locations | Sophaxis among them | Cited by |\n| --- | --- | --- | --- | --- | --- | --- |\n'
    + rows.map((r) => '| ' + r.id + ' | ' + r.doi + ' | '
      + (r.oa === 'error' ? 'could not be read | | | | |' : !r.oa ? 'not held | | | | |'
        : r.oa.id.replace('https://openalex.org/', '') + ' | ' + yes(r.oa.abstract) + ' | ' + r.oa.locations + ' | ' + yes(r.oa.sophaxis) + ' | ' + r.oa.cited + ' |')).join('\n') + '\n';
}

function records(dir) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
}

/* Pure: the problems of one record, given the metadata found for each of its DOIs (null if not found). */
function compare(p, found) {
  if (p.status === 'removed') return [];
  const out = [];
  for (const doi of [...new Set(p.versions.map((v) => v.doi))]) {
    const meta = found[doi.toLowerCase()];
    if (meta === undefined) continue;
    if (meta === null) { out.push(`${p.id}: the DOI ${doi} no longer resolves in DataCite, Crossref or JaLC`); continue; }
    if (!meta.licences.includes(p.license) || meta.licences.some((l) => l !== p.license)) {
      out.push(`${p.id}: the DOI ${doi} no longer carries only ${SITE.licenses[p.license]} in its metadata (now: ${meta.licences.join(', ') || 'none'})`);
    }
  }
  return out;
}

/* Pure: where a new version would show. Figshare gives each version its own DOI (.v1, .v2, …),
 * and arXiv keeps one DOI for all; other repositories are not followed. */
function followed(p) {
  if (p.status !== 'listed') return null;
  const last = p.versions[p.versions.length - 1].doi;
  const m = /^(10\.6084\/m9\.figshare\.\d+)\.v\d+$/i.exec(last);
  if (m) return m[1];
  if (/^10\.48550\/arxiv\./i.test(last)) return last;
  return null;
}

/* Pure: a note when the repository has more versions than the record. */
function newVersions(p, atRepository) {
  if (!atRepository || atRepository <= p.versions.length) return [];
  return [`${p.id}: the repository has ${atRepository} versions and the record lists ${p.versions.length}; the authors can submit the new version as an update`];
}

/* Pure: what to say about a candidate for the published version of a record. Only a candidate that is a
 * journal article, a conference paper, a book chapter or a book, and shares an author, is worth the authors' time. */
function candidateNote(p, desc) {
  if (!desc || !desc.kind || !desc.venue || !P.sharesAuthor(p, desc)) return [];
  return [`${p.id}: a possible published version, ${desc.title} (${desc.venue}, ${desc.date}), https://doi.org/${desc.doi}; its metadata or the preprint's links them. The authors can report it with the published-version form`];
}

/* Pure: the problems of a recorded published version, given what its DOI says now (null if it no longer resolves). */
function publishedProblems(p, desc) {
  if (!p.published || p.status === 'removed') return [];
  if (!desc) return [`${p.id}: the published version ${p.published.doi} no longer resolves in Crossref or DataCite`];
  const known = new Set((p.published.updates || []).map((u) => u.doi.toLowerCase()));
  return desc.updates.filter((u) => !known.has(u.doi.toLowerCase()))
    .map((u) => `${p.id}: the published version ${p.published.doi} has a new ${u.type.replace(/_/g, ' ')} notice of ${u.date}, https://doi.org/${u.doi}; add it to the record`);
}

/* Pure: the addresses to save, without removed records. */
/* fetch() says only "fetch failed"; the reason is in its cause (a timeout, a reset connection, a DNS error). */
function describe(e) {
  const c = e && e.cause;
  return e.message + (c ? ' (' + [c.code, c.message].filter(Boolean).join(': ') + ')' : '');
}

/* The ids whose pages and PDF copies are never sent to the Internet Archive: removed records, and records whose authors
 * did not consent to the saves (archive: false). */
function unsaved(list) { return new Set(list.filter((p) => p.status === 'removed' || p.archive === false).map((p) => p.id)); }

/* Pure: drop every address of an unsaved record. saveToArchive applies it to whatever it is given. */
function savable(urls, list) {
  const no = unsaved(list);
  return urls.filter((u) => { const m = /\/(?:abs|pdf)\/(\d{4}\.\d{4})/.exec(u); return !(m && no.has(m[1])); });
}

function archiveUrls(list) {
  const shown = list.filter((p) => p.status !== 'removed' && p.archive !== false);
  return [SITE.baseUrl]
    .concat(shown.map((p) => SITE.baseUrl + 'abs/' + p.id + '.html'))
    .concat(shown.flatMap((p) => (p.pdfs || []).map((x) => SITE.baseUrl + 'pdf/' + x.file)));
}

/* Save addresses to the Internet Archive, spaced and retried as above. Used by the weekly watch and, for the pages
 * a push changed, by tools/indexnow.js. A failure is logged and does not stop the others. */
async function saveToArchive(urls, list = records(path.join(ROOT, 'data', 'papers'))) {
  for (const u of savable(urls, list)) {
    for (let attempt = 0; attempt <= RETRY_WAITS_MS.length; attempt++) {
      if (attempt) await pause(RETRY_WAITS_MS[attempt - 1]);
      try {
        const r = await request('https://web.archive.org/save/' + u);
        console.log('archive ' + r.status + ' ' + u);
        if (r.ok) break;
      } catch (e) { console.log('archive failed ' + u + ': ' + describe(e)); }
    }
    await pause(SAVE_GAP_MS);
  }
}

/* ------------------------------------------------------------ the PDF copies (2026-11-14) */

/* Pure: for one record, the readings of each copy: { file, sha, licence, contacts, images, places } where sha is true when
 * the file's SHA-256 is the recorded one (null when the file is missing), and the rest are the rows of tools/pdf_advice.js.
 * read(file) gives { bytes, rows } or null. */
function copyReadings(p, read) {
  if (p.status !== 'listed') return [];
  return (p.pdfs || []).map((x) => {
    const r = read(x.file);
    if (!r) return { id: p.id, file: x.file, sha: null };
    const row = (label) => r.rows.find((y) => y[0].startsWith(label)) || null;
    return { id: p.id, file: x.file, sha: crypto.createHash('sha256').update(r.bytes).digest('hex') === x.sha256,
      licence: row('The licence printed') || row('No licence statement'), contacts: row('No email address'), images: row('The PDF embeds'), places: row('No affiliation') };
  });
}

/* Pure: what the readings report as problems. A copy that differs from its recorded hash, or is missing, is a problem; so is a
 * licence printed on it that differs from its record's. Everything else is advice, shown in the table only. */
function copyProblems(readings) {
  const out = [];
  for (const c of readings) {
    if (c.sha === null) out.push(`${c.id}: the PDF copy ${c.file} is missing from data/pdf`);
    else if (!c.sha) out.push(`${c.id}: the PDF copy ${c.file} no longer has its recorded SHA-256`);
    if (c.licence && c.licence[1] && c.licence[0].startsWith('The licence printed')) out.push(`${c.id}: the licence printed on the PDF copy ${c.file} differs from the record's (${c.licence[2]})`);
  }
  return out;
}

/* Pure: the table of the copies, with counts and fixed words only. */
function copyTable(readings) {
  if (!readings.length) return '';
  const mark = (r) => (!r ? '' : r[1] ? 'check' : 'ok');
  const n = (r, re) => (r ? (re.exec(r[2]) || [, ''])[1] : '');
  return '| Record | Copy | SHA-256 | Licence printed | Contact details of others | Embedded images | Place named on the first page |\n| --- | --- | --- | --- | --- | --- | --- |\n'
    + readings.map((c) => '| ' + c.id + ' | ' + c.file + ' | ' + (c.sha === null ? 'missing' : c.sha ? 'as recorded' : '**differs**') + ' | '
      + (c.sha === null ? ' | | | |' : mark(c.licence) + ' | ' + mark(c.contacts) + ' | ' + n(c.images, /^(\d+)/) + ' | ' + mark(c.places) + ' |')).join('\n') + '\n';
}

function report(problems, when, news = [], pubs = [], index = '', copies = '') {
  const list = (xs) => xs.map((x) => '- ' + x.replace(/[`<>]/g, '')).join('\n');
  return `${MARK}
**Weekly check, ${when}**
${problems.length ? `
${list(problems)}

The operator looks into each problem under the Moderation Policy.
` : ''}${news.length ? `
New versions at the repository:

${list(news)}

Sophaxis does not add a version by itself: the authors submit it, and the same checks run again.
` : ''}${pubs.length ? `
Possible published versions:

${list(pubs)}

Sophaxis does not record a published version by itself: an author reports it, and the same checks run again.
` : ''}${copies ? `
Advice on the PDF copies, read by machine for the operator. It decides nothing, and shows counts and fixed words only:

${copies}
` : ''}${index ? `
For information, how OpenAlex holds the works shown:

${index}
` : ''}
This issue closes itself when the next check finds nothing.
`;
}

async function main() {
  const dry = process.argv.includes('--dry-run');
  const list = records(path.join(ROOT, 'data', 'papers'));
  const found = {};
  for (const p of list.filter((x) => x.status !== 'removed')) {
    for (const v of p.versions) {
      const d = v.doi.toLowerCase();
      if (d in found) continue;
      try { found[d] = (await lookUp(v.doi)).meta; } catch (e) { console.log('could not check ' + v.doi + ': ' + e.message); }
    }
  }
  const problems = list.flatMap((p) => compare(p, found));
  /* Retractions, withdrawals, removals, expressions of concern and corrections that Crossref records against a DOI shown. */
  const N = require('./notices.js');
  const notices = {};
  for (const p of list.filter((x) => x.status !== 'removed')) {
    for (const v of p.versions) {
      const d = v.doi.toLowerCase();
      if (d in notices) continue;
      try { notices[d] = await N.lookUpNotices(v.doi); } catch (e) { console.log('could not read the notices of ' + v.doi + ': ' + describe(e)); }
      await pause(LOOKUP_GAP_MS);
    }
  }
  problems.push(...list.flatMap((p) => N.newNotices(p, notices)));
  console.log(problems.length ? problems.join('\n') : 'every DOI resolves and keeps its licence');
  /* The PDF copies: each file against its recorded SHA-256, and the advice, from the files in the repository (no request). */
  const pdfDir = path.join(ROOT, 'data', 'pdf');
  const readCopy = (p) => (file) => {
    const f = path.join(pdfDir, file);
    if (!fs.existsSync(f)) return null;
    return { bytes: fs.readFileSync(f), rows: A.adviceOfFile(f, { licences: [p.license], authors: p.authors }) };
  };
  const copyRows = list.flatMap((p) => copyReadings(p, readCopy(p)));
  const copyIssues = copyProblems(copyRows);
  problems.push(...copyIssues);
  const copies = copyTable(copyRows);
  console.log(copyRows.length + ' PDF copies read; ' + copyIssues.length + ' with a problem');
  if (copies && process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## Advice on the PDF copies (counts and fixed words only)\n\n' + copies + '\n');
  const news = [];
  for (const p of list) {
    const doi = followed(p);
    if (!doi) continue;
    try {
      const { meta, raw } = await lookUp(doi);
      if (meta) news.push(...newVersions(p, (await versionsOf(doi, meta, raw)).length));
    } catch (e) { console.log('could not look for new versions of ' + p.id + ': ' + e.message); }
  }
  console.log(news.length ? news.join('\n') : 'no new versions at the repositories');

  /* Published versions: a recorded one must still resolve; for the others, look for one the metadata links. */
  const pubs = [];
  for (const p of list.filter((x) => x.status === 'listed')) {
    /* What one record yields is kept only once its lookups all went through, so a retry adds nothing twice. */
    for (let attempt = 0; ; attempt++) {
      try {
        if (p.published) {
          problems.push(...publishedProblems(p, await P.lookUpPublished(p.published.doi)));
        } else {
          const found = [];
          for (const d of await P.candidates(p)) found.push(...candidateNote(p, await P.lookUpPublished(d)));
          pubs.push(...found);
        }
        break;
      } catch (e) {
        if (/HTTP 429/.test(e.message) && attempt < LOOKUP_RETRY_WAITS_MS.length) {
          console.log('the published version of ' + p.id + ': HTTP 429, trying again in ' + LOOKUP_RETRY_WAITS_MS[attempt] / 1000 + ' s');
          await pause(LOOKUP_RETRY_WAITS_MS[attempt]);
          continue;
        }
        console.log('could not look for the published version of ' + p.id + ': ' + describe(e));
        break;
      }
    }
    await pause(LOOKUP_GAP_MS);
  }
  console.log(pubs.length ? pubs.join('\n') : 'no published version found that is not recorded');

  const rows = [];
  for (const p of list.filter((x) => x.status !== 'removed')) {
    const doi = p.versions[p.versions.length - 1].doi;
    let oa = 'error';
    try {
      const r = await request('https://api.openalex.org/works/https://doi.org/' + doi);
      oa = r.status === 404 ? null : r.ok ? fromOpenAlex(await r.json()) : 'error';
      if (oa === 'error') console.log('OpenAlex ' + doi + ': HTTP ' + r.status);
    } catch (e) { console.log('OpenAlex ' + doi + ': ' + describe(e)); }
    rows.push({ id: p.id, doi, oa });
    await pause(OPENALEX_GAP_MS);
  }
  const index = indexTable(rows);
  console.log(index);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## How OpenAlex holds the works shown\n\n' + index);

  /* The Internet Archive answers 429 to saves that come too close together, or refuses the connection:
   * space them, and retry after a longer wait each time (SAVE_GAP_MS, RETRY_WAITS_MS).
   * Any answer other than success is tried again: on 2026-11-02 it answered 404 for a PDF copy that was served. */
  if (dry) archiveUrls(list).forEach((u) => console.log('would save ' + u));
  else await saveToArchive(archiveUrls(list));
  /* A save can fail while an earlier copy exists. Say which, so a failure is not read as "never saved". */
  for (const u of archiveUrls(list)) {
    if (dry) break;
    try {
      const r = await request('https://archive.org/wayback/available?url=' + encodeURIComponent(u), { signal: AbortSignal.timeout(60000) });
      const c = ((await r.json()).archived_snapshots || {}).closest;
      console.log('latest copy ' + (c && c.available ? c.timestamp + ' ' + c.url : 'none') + ' for ' + u);
    } catch (e) { console.log('latest copy unknown for ' + u + ': ' + describe(e)); }
  }
  if (dry) return;

  const open = ((await github('GET', '/issues?state=open&labels=watch&per_page=20')) || []).find((i) => (i.body || '').startsWith(MARK));
  const when = new Date().toISOString().slice(0, 10);
  if (problems.length || news.length || pubs.length) {
    const body = report(problems, when, news, pubs, index, copies);
    if (open) await github('PATCH', '/issues/' + open.number, { body });
    else await github('POST', '/issues', { title: problems.length ? 'Weekly check: problems found' : news.length ? 'Weekly check: new versions at the repository' : 'Weekly check: possible published versions', body, labels: ['watch'] });
  } else if (open) {
    await github('POST', '/issues/' + open.number + '/comments', { body: `${MARK}\nThe check on ${when} found no problems. Closing.` });
    await github('PATCH', '/issues/' + open.number, { state: 'closed', state_reason: 'completed' });
  }
}

module.exports = { copyReadings, copyProblems, copyTable, saveToArchive, savable, unsaved, compare, followed, newVersions, candidateNote, publishedProblems, archiveUrls, report, describe, fromOpenAlex, indexTable, SAVE_GAP_MS, RETRY_WAITS_MS, LOOKUP_GAP_MS, LOOKUP_RETRY_WAITS_MS, OPENALEX_GAP_MS, MARK };

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
