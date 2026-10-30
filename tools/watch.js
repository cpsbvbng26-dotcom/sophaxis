#!/usr/bin/env node
/* Once a week: check that every listed DOI still resolves and keeps its licence,
 * and ask the Internet Archive to save the pages and the PDF copies.
 *
 * Run by .github/workflows/watch.yml (GITHUB_TOKEN, GITHUB_REPOSITORY).
 *   node tools/watch.js --dry-run     # report only; open no issue, save nothing
 *
 * A problem is reported in one open issue labelled "watch"; when the problems are gone, that issue is closed.
 * Saving to the Internet Archive is best effort and never fails the run.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { lookUp, github } = require('./intake.js');

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

/* Pure: the addresses to save, without removed records. */
function archiveUrls(list) {
  const shown = list.filter((p) => p.status !== 'removed');
  return [SITE.baseUrl]
    .concat(shown.map((p) => SITE.baseUrl + 'abs/' + p.id + '.html'))
    .concat(shown.flatMap((p) => (p.pdfs || []).map((x) => SITE.baseUrl + 'pdf/' + x.file)));
}

function report(problems, when) {
  return `${MARK}
**Weekly check, ${when}**

${problems.map((x) => '- ' + x.replace(/[`<>]/g, '')).join('\n')}

The operator looks into each problem under the Moderation Policy. This issue closes itself when the next check finds nothing.
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

  /* The Internet Archive answers 429 to saves that come too close together: space them, and retry once. */
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const u of archiveUrls(list)) {
    if (dry) { console.log('would save ' + u); continue; }
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const r = await fetch('https://web.archive.org/save/' + u, { headers: { 'User-Agent': 'Sophaxis (' + SITE.repo + ')' } });
        console.log('archive ' + r.status + ' ' + u);
        if (r.status !== 429) break;
      } catch (e) { console.log('archive failed ' + u + ': ' + e.message); break; }
      await pause(60000);
    }
    await pause(20000);
  }
  if (dry) return;

  const open = ((await github('GET', '/issues?state=open&labels=watch&per_page=20')) || []).find((i) => (i.body || '').startsWith(MARK));
  const when = new Date().toISOString().slice(0, 10);
  if (problems.length) {
    if (open) await github('PATCH', '/issues/' + open.number, { body: report(problems, when) });
    else await github('POST', '/issues', { title: 'Weekly check: problems found', body: report(problems, when), labels: ['watch'] });
  } else if (open) {
    await github('POST', '/issues/' + open.number + '/comments', { body: `${MARK}\nThe check on ${when} found no problems. Closing.` });
    await github('PATCH', '/issues/' + open.number, { state: 'closed', state_reason: 'completed' });
  }
}

module.exports = { compare, archiveUrls, report, MARK };

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
