#!/usr/bin/env node
/* Records a pull request that a watch proposed, when the repository owner adds the label `record`.
 *
 * The branch may change only the files the watch writes (CONF of the branch's own kind below). It is merged into main
 * with a merge commit, the changelog's (#PR) is filled in with the number, and the checks run on the merged result:
 * the repository's own checks, and the watch itself, which must now find everything as recorded. Only then is it
 * pushed. GitHub marks the pull request as merged when its commits reach main.
 *
 * The merge carries a Co-authored-by line for the workflow, because the checks across the repositories count
 * merges without such a line, and this merge is made by the workflow at the operator's label.
 *
 *   PR=12 BRANCH=statutes/record TITLE="..." node tools/record.js
 */
'use strict';
const { request } = require('./ua.js');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BOT = 'github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>';
/* Which branches may be recorded, and the files each may change. */
const KINDS = {
  'statutes/record': { files: ['verification/statutes.json', 'verification/statutes-texts.json', 'CHANGELOG.md'], verify: [['node', 'tools/statutes.js']] },
};
/* How this repository titles a merge: Sophaxis "Title (#N)"; others "Merge pull request #N: Title". */
const mergeTitle = (n, title) => (fs.existsSync(path.join(ROOT, 'CHANGELOG.md')) ? title + ' (#' + n + ')' : 'Merge pull request #' + n + ': ' + title);

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...opts });
const git = (...args) => run('git', args);

/* Pure: whether the branch changes only what its kind allows. */
function allowed(branch, changed) {
  const k = KINDS[branch];
  return !!k && changed.length > 0 && changed.every((f) => k.files.includes(f));
}

/* Pure: the changelog with the pull request's number in place of (#PR). */
const fillNumber = (log, n) => log.split('(#PR)').join('(#' + n + ')');

async function github(method, p, body) {
  const r = await request('https://api.github.com/repos/' + process.env.GITHUB_REPOSITORY + p, {
    method, headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(method + ' ' + p + ': HTTP ' + r.status);
  return r.status === 204 ? null : r.json();
}

async function main() {
  /* The title of the pull request is read from the event file (GITHUB_EVENT_PATH), never from the environment, whose values the run's log prints. */
  const n = process.env.PR, branch = process.env.BRANCH;
  const title = String(((JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')).pull_request) || {}).title || '');
  const say = (body) => github('POST', '/issues/' + n + '/comments', { body });
  git('config', 'user.name', 'github-actions[bot]');
  git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com');
  git('fetch', '-q', 'origin', 'main', branch);
  git('checkout', '-q', '-B', 'main', 'origin/main');
  const changed = git('diff', '--name-only', 'origin/main...origin/' + branch).split('\n').filter(Boolean);
  if (!allowed(branch, changed)) { await say('Not recorded: this branch changes files that the label `record` may not merge: ' + changed.join(', ')); process.exit(1); }
  try { git('merge', '-q', '--no-ff', '--no-commit', 'origin/' + branch); } catch (e) { await say('Not recorded: the branch does not merge cleanly into main. The watch proposes it again on its next run.'); process.exit(1); }
  if (fs.existsSync(path.join(ROOT, 'CHANGELOG.md'))) {
    fs.writeFileSync(path.join(ROOT, 'CHANGELOG.md'), fillNumber(fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8'), n));
    git('add', 'CHANGELOG.md');
  }
  git('commit', '-q', '-m', mergeTitle(n, title), '-m', 'Recorded at the operator\'s label `record`, after the checks below passed on the merged result.\n\nCo-authored-by: ' + BOT);
  const checks = [['node', 'verification/check.js'], ...KINDS[branch].verify];
  for (const [cmd, ...args] of checks) {
    try { run(cmd, args, { stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, GITHUB_EVENT_NAME: 'record' } }); }
    catch (e) { await say('Not recorded: `' + [cmd, ...args].join(' ') + '` failed on the merged result. Nothing was pushed.'); process.exit(1); }
  }
  try { git('push', '-q', 'origin', 'HEAD:main'); }
  catch (e) { await say('Not recorded: main moved while the checks ran. Nothing was merged; adding the label again starts a new run.'); process.exit(1); }
  try { git('push', '-q', 'origin', '--delete', branch); } catch (e) { /* the branch can stay */ }
  /* The issue that proposed it, where the repository does not let workflows open pull requests, is done too. */
  for (const i of ((await github('GET', '/issues?state=open&per_page=50')) || []).filter((x) => !x.pull_request && (x.body || '').startsWith('<!-- statutes-proposal -->'))) {
    await github('POST', '/issues/' + i.number + '/comments', { body: 'Recorded in #' + n + '.' });
    await github('PATCH', '/issues/' + i.number, { state: 'closed', state_reason: 'completed' });
  }
  await say('Recorded in ' + git('rev-parse', 'HEAD').trim().slice(0, 7) + ', after `' + checks.map((c) => c.join(' ')).join('` and `') + '` passed on the merged result.');
}

module.exports = { allowed, fillNumber, mergeTitle, KINDS };
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
