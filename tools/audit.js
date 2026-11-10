#!/usr/bin/env node
/* Opens the yearly audit issue on 30 October, the day Sophaxis began. Its body is the section "Yearly audit" of
 * docs/operations.md, taken as it is, so that the list is kept in one place. An issue with the same title is not opened twice.
 *
 *   GITHUB_TOKEN=... GITHUB_REPOSITORY=owner/repo node tools/audit.js
 *   node tools/audit.js --print        prints the body only
 */
'use strict';
const fs = require('fs');
const path = require('path');

function items() {
  const md = fs.readFileSync(path.join(__dirname, '..', 'docs', 'operations.md'), 'utf8');
  const i = md.indexOf('\n## Yearly audit\n');
  if (i < 0) throw new Error('docs/operations.md has no section "Yearly audit"');
  const j = md.indexOf('\n## ', i + 5);
  const list = md.slice(i, j < 0 ? undefined : j).split('\n').filter((l) => l.startsWith('- [ ] '));
  if (!list.length) throw new Error('the yearly audit has no items');
  return list;
}
const title = (year) => 'Yearly audit, ' + year;
function body(year) {
  return 'The yearly audit of ' + year + ', on the day Sophaxis began. The list is the section "Yearly audit" of '
    + '[docs/operations.md](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/docs/operations.md), as it stands.\n\n'
    + items().join('\n') + '\n\nClose the issue with one line on what was found and what was changed.\n';
}

async function main() {
  const year = String(new Date(Date.now() + 9 * 3600 * 1000).getUTCFullYear());
  if (process.argv.includes('--print')) { process.stdout.write(body(year)); return; }
  const repo = process.env.GITHUB_REPOSITORY, token = process.env.GITHUB_TOKEN;
  if (!repo || !token) throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN are needed');
  const api = (p, opts = {}) => fetch('https://api.github.com/repos/' + repo + p, Object.assign({ headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'User-Agent': 'sophaxis-audit' } }, opts));
  const open = await (await api('/issues?state=all&per_page=100&creator=github-actions%5Bbot%5D')).json();
  if (Array.isArray(open) && open.some((x) => x.title === title(year))) { console.log('already opened: ' + title(year)); return; }
  const r = await api('/issues', { method: 'POST', body: JSON.stringify({ title: title(year), body: body(year) }) });
  if (!r.ok) throw new Error('could not open the issue: ' + r.status);
  console.log('opened: ' + title(year));
}

module.exports = { items, body, title };
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
