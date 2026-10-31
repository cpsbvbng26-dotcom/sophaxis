#!/usr/bin/env node
/* Once a week: check that every listed DOI still resolves and keeps its licence,
 * look for versions that the repository has and the record has not yet,
 * and ask the Internet Archive to save the pages and the PDF copies.
 *
 * Run by .github/workflows/watch.yml (GITHUB_TOKEN, GITHUB_REPOSITORY).
 *   node tools/watch.js --dry-run     # report only; open no issue, save nothing
 *
 * Problems and new versions are reported in one open issue labelled "watch"; when there are none, that issue is closed.
 * Saving to the Internet Archive is best effort and never fails the run.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { lookUp, versionsOf, github } = require('./intake.js');

const ROOT = path.join(__dirname, '..');
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const MARK = '<!-- sophaxis-watch -->';

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
    if (meta === null) { out.push(`${p.id}: the DOI ${doi} no longer resolves in DataCite or Crossref`); continue; }
    if (!meta.licences.includes(p.license)) {
      out.push(`${p.id}: the DOI ${doi} no longer carries ${SITE.licenses[p.license]} in its metadata (now: ${meta.licences.join(', ') || 'none'})`);
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

/* Pure: the addresses to save, without removed records. */
function archiveUrls(list) {
  const shown = list.filter((p) => p.status !== 'removed');
  return [SITE.baseUrl]
    .concat(shown.map((p) => SITE.baseUrl + 'abs/' + p.id + '.html'))
    .concat(shown.flatMap((p) => (p.pdfs || []).map((x) => SITE.baseUrl + 'pdf/' + x.file)));
}

function report(problems, when, news = []) {
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
  console.log(problems.length ? problems.join('\n') : 'every DOI resolves and keeps its licence');
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

  /* The Internet Archive answers 429 to saves that come too close together, and sometimes drops one:
   * space them, and retry once after either. */
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const u of archiveUrls(list)) {
    if (dry) { console.log('would save ' + u); continue; }
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const r = await fetch('https://web.archive.org/save/' + u, { headers: { 'User-Agent': 'Sophaxis (' + SITE.repo + ')' } });
        console.log('archive ' + r.status + ' ' + u);
        if (r.status !== 429) break;
      } catch (e) { console.log('archive failed ' + u + ': ' + e.message); }
      await pause(60000);
    }
    await pause(20000);
  }
  if (dry) return;

  const open = ((await github('GET', '/issues?state=open&labels=watch&per_page=20')) || []).find((i) => (i.body || '').startsWith(MARK));
  const when = new Date().toISOString().slice(0, 10);
  if (problems.length || news.length) {
    const body = report(problems, when, news);
    if (open) await github('PATCH', '/issues/' + open.number, { body });
    else await github('POST', '/issues', { title: problems.length ? 'Weekly check: problems found' : 'Weekly check: new versions at the repository', body, labels: ['watch'] });
  } else if (open) {
    await github('POST', '/issues/' + open.number + '/comments', { body: `${MARK}\nThe check on ${when} found no problems. Closing.` });
    await github('PATCH', '/issues/' + open.number, { state: 'closed', state_reason: 'completed' });
  }
}

module.exports = { compare, followed, newVersions, archiveUrls, report, MARK };

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
