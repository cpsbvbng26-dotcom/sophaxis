#!/usr/bin/env node
/* Whether Sophaxis still fits the free services it runs on. Once a month it measures what can be measured with the token
 * that GitHub gives the run, writes the table to the run's summary, and opens an issue only when a measure reaches 80 percent
 * of its limit. It decides nothing and changes nothing.
 *
 *   node tools/limits.js --print     measures the PDF copies only, from the files, and prints the table
 *
 * Measured: the deployments, counted from the commit status "Vercel" of the commits of main, on the busiest day of the last 30 days (the free plan allows 100 a
 * day); the PDF copies, in all and the largest (site.json pdfLimits); the size of the repository, against the 1 GB that GitHub
 * recommends. Not measured: Vercel's bandwidth and function use, which only the operator's Vercel account shows and this run
 * cannot read. Run by .github/workflows/monthly.yml. */
'use strict';
const { request } = require('./ua.js');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const WARN = 0.8;
const DEPLOYS_PER_DAY = 100;
const REPO_BYTES = 1024 ** 3;
const MARK = '<!-- sophaxis-limits -->';

/* Pure: the rows of the table, each [what, used, limit, share, warn]. Values in bytes or counts. */
function rows({ busiestDay, pdfTotal, pdfLargest, repoBytes }) {
  const r = [];
  const add = (what, used, limit, unit) => { if (used === null || used === undefined) return; r.push([what, used, limit, used / limit, used / limit >= WARN, unit]); };
  add('Deployments on the busiest day of the last 30 days', busiestDay, DEPLOYS_PER_DAY, '');
  add('PDF copies in all', pdfTotal, SITE.pdfLimits.totalGB * 1024 ** 3, 'bytes');
  add('The largest PDF copy', pdfLargest, SITE.pdfLimits.fileMB * 1024 ** 2, 'bytes');
  add('The repository, against what GitHub recommends', repoBytes, REPO_BYTES, 'bytes');
  return r;
}
const fmt = (n, unit) => (unit === 'bytes' ? (n / 1024 ** 2).toFixed(1) + ' MB' : String(n));
function table(r) {
  return '| Measure | Used | Limit | Share |\n| --- | --- | --- | --- |\n'
    + r.map(([w, u, l, s, warn, unit]) => `| ${w} | ${fmt(u, unit)} | ${fmt(l, unit)} | ${(s * 100).toFixed(1)} %${warn ? ' (at or over 80 %)' : ''} |`).join('\n') + '\n';
}
/* Pure: the body of the issue, given the table. It states facts only (2026-11-25): what is not measured, and that this workflow cannot read it. */
function issueBody(t) {
  return MARK + '\nA measure has reached 80 percent of its free limit. Nothing has been changed.\n\n' + t + '\nVercel\'s bandwidth and function use are not measured here: only the Vercel account shows them, and this workflow cannot read them.\n';
}
/* Pure: the most deployments on one day (Japan time), from the created_at of each deployment. */
function busiest(dates) {
  const per = {};
  for (const d of dates) { const day = new Date(Date.parse(d) + 9 * 3600 * 1000).toISOString().slice(0, 10); per[day] = (per[day] || 0) + 1; }
  return Math.max(0, ...Object.values(per));
}
/* Pure: the time of the first status "Vercel" of a commit, or null. */
function vercelDay(statuses) {
  const v = (Array.isArray(statuses) ? statuses : []).filter((s) => s.context === 'Vercel').map((s) => s.created_at).sort();
  return v[0] || null;
}
function pdfSizes() {
  const dir = path.join(ROOT, 'data', 'pdf');
  const sizes = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.pdf')).map((f) => fs.statSync(path.join(dir, f)).size) : [];
  return { pdfTotal: sizes.reduce((a, b) => a + b, 0), pdfLargest: Math.max(0, ...sizes) };
}

async function main() {
  if (process.argv.includes('--print')) { process.stdout.write(table(rows(pdfSizes()))); return; }
  const repo = process.env.GITHUB_REPOSITORY, token = process.env.GITHUB_TOKEN;
  const api = (p, opts = {}) => request('https://api.github.com/repos/' + repo + p, Object.assign({ headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' } }, opts));
  const since = Date.now() - 30 * 24 * 3600 * 1000;
  /* The deployments: Vercel marks each commit of main that it deploys with the commit status "Vercel". Until 2026-11-15 this read the
   * deployments of the repository, which Vercel does not create here, so it always counted none; now it reads the statuses of
   * the commits of main of the last 30 days, and fails when main has commits but none of them carries the status (2026-11-15). */
  const dates = [];
  const shas = [];
  for (let page = 1; ; page++) {
    const r = await api('/commits?sha=main&per_page=100&page=' + page + '&since=' + new Date(since).toISOString());
    if (!r.ok) throw new Error('GET /commits: HTTP ' + r.status);
    const list = await r.json();
    if (!Array.isArray(list)) throw new Error('GET /commits: not a list');
    shas.push(...list.map((c) => c.sha));
    if (list.length < 100) break;
  }
  for (const sha of shas) {
    const r = await api('/commits/' + sha + '/statuses?per_page=100');
    if (!r.ok) throw new Error('GET /commits/' + sha.slice(0, 7) + '/statuses: HTTP ' + r.status);
    const first = vercelDay(await r.json());
    if (first) dates.push(first);
  }
  if (shas.length && !dates.length) throw new Error('main has ' + shas.length + ' commits in 30 days, and none carries the status "Vercel": the deployments could not be counted');
  const info = await (await api('')).json();
  const r = rows(Object.assign({ busiestDay: busiest(dates), repoBytes: typeof info.size === 'number' ? info.size * 1024 : null }, pdfSizes()));
  const t = table(r);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## Free limits\n\n' + t);
  console.log(t);
  if (!r.some((x) => x[4])) return;
  const title = 'Near a free limit: ' + new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);
  /* Every page, to the end; an answer that is not a list is an error, never read as no issue (2026-11-15). */
  const every = async (p) => { const out = []; for (let page = 1; ; page++) { const r = await api(p + '&per_page=100&page=' + page); if (!r.ok) throw new Error('GET /issues: HTTP ' + r.status); const l = await r.json(); if (!Array.isArray(l)) throw new Error('GET /issues: not a list'); out.push(...l); if (l.length < 100) return out; } };
  const open = await every('/issues?state=open');
  if (open.some((x) => !x.pull_request && x.title === title)) return;
  const res = await api('/issues', { method: 'POST', body: JSON.stringify({ title, body: issueBody(t) }) });
  if (!res.ok) throw new Error('POST /issues: HTTP ' + res.status);
}

module.exports = { vercelDay, rows, table, busiest, issueBody, WARN, DEPLOYS_PER_DAY, REPO_BYTES };
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
