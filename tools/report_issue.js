#!/usr/bin/env node
/* Run by .github/workflows/report.yml: counts the decisions of a year with tools/report.js and posts them in an issue,
 * for the operator to record in data/reports/ by pull request. YEAR defaults to the year before, in Japan time. */
'use strict';
const { request } = require('./ua.js');
const { execFileSync } = require('child_process');
const path = require('path');

const MARK = '<!-- sophaxis-report -->';
const now = new Date(Date.now() + 9 * 3600 * 1000);
const year = process.env.YEAR || String(now.getUTCFullYear() - 1);

async function github(method, p, body) {
  const r = await request('https://api.github.com/repos/' + process.env.GITHUB_REPOSITORY + p, {
    method, headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(method + ' ' + p + ': HTTP ' + r.status);
  return r.json();
}

async function main() {
  if (!/^\d{4}$/.test(year)) { console.error('YEAR must be four digits'); process.exit(2); }
  const json = execFileSync(process.execPath, [path.join(__dirname, 'report.js'), year, '--print'], { encoding: 'utf8', env: process.env });
  const body = `${MARK}
The decisions of ${year}, counted from the public issues and the records by \`tools/report.js\`. To record them, put this in \`data/reports/${year}.json\` by pull request; \`decisions.html\` then shows them.

~~~~json
${json.trim()}
~~~~

The year in review goes beside the counts, in \`data/reports/${year}.md\`, by the same pull request. It names no count, since the counts are shown above it, and keeps to these headings:

- \`## Registrations and listings\`: where Sophaxis was listed, applied or declined that year.
- \`## Changes to the policies\`: each change announced, with its day.
- \`## Problems\`: outages, records taken offline, mistakes found, and what was done.
- \`## Advisers and moderators\`: who joined or left.
- \`## Next year\`: what the operator intends, as an intention and not a promise.
`;
  await github('POST', '/issues', { title: 'Decisions of ' + year + ': record them', body });
  console.log(json);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
