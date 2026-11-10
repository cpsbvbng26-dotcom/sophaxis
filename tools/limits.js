#!/usr/bin/env node
/* Whether Sophaxis still fits the free services it runs on. Once a month it measures what can be measured with the token
 * that GitHub gives the run, writes the table to the run's summary, and opens an issue only when a measure reaches 80 percent
 * of its limit. It decides nothing and changes nothing.
 *
 *   node tools/limits.js --print     measures the PDF copies only, from the files, and prints the table
 *
 * Measured: the deployments that Vercel reports to GitHub, on the busiest day of the last 30 days (the free plan allows 100 a
 * day); the PDF copies, in all and the largest (site.json pdfLimits); the size of the repository, against the 1 GB that GitHub
 * recommends. Not measured: Vercel's bandwidth and function use, which only the operator's Vercel account shows; the yearly
 * audit asks the operator to read them there. Run by .github/workflows/monthly.yml. */
'use strict';
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
/* Pure: the most deployments on one day (Japan time), from the created_at of each deployment. */
function busiest(dates) {
  const per = {};
  for (const d of dates) { const day = new Date(Date.parse(d) + 9 * 3600 * 1000).toISOString().slice(0, 10); per[day] = (per[day] || 0) + 1; }
  return Math.max(0, ...Object.values(per));
}
function pdfSizes() {
  const dir = path.join(ROOT, 'data', 'pdf');
  const sizes = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.pdf')).map((f) => fs.statSync(path.join(dir, f)).size) : [];
  return { pdfTotal: sizes.reduce((a, b) => a + b, 0), pdfLargest: Math.max(0, ...sizes) };
}

async function main() {
  if (process.argv.includes('--print')) { process.stdout.write(table(rows(pdfSizes()))); return; }
  const repo = process.env.GITHUB_REPOSITORY, token = process.env.GITHUB_TOKEN;
  const api = (p, opts = {}) => fetch('https://api.github.com/repos/' + repo + p, Object.assign({ headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'User-Agent': 'sophaxis-limits', 'Content-Type': 'application/json' } }, opts));
  const since = Date.now() - 30 * 24 * 3600 * 1000;
  const dates = [];
  for (let page = 1; page <= 10; page++) {
    const list = await (await api('/deployments?per_page=100&page=' + page)).json();
    if (!Array.isArray(list) || !list.length) break;
    const recent = list.filter((d) => Date.parse(d.created_at) >= since).map((d) => d.created_at);
    dates.push(...recent);
    if (recent.length < list.length) break;
  }
  const info = await (await api('')).json();
  const r = rows(Object.assign({ busiestDay: busiest(dates), repoBytes: typeof info.size === 'number' ? info.size * 1024 : null }, pdfSizes()));
  const t = table(r);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## Free limits\n\n' + t);
  console.log(t);
  if (!r.some((x) => x[4])) return;
  const title = 'Near a free limit: ' + new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 7);
  const open = await (await api('/issues?state=open&per_page=100')).json();
  if (Array.isArray(open) && open.some((x) => x.title === title)) return;
  const res = await api('/issues', { method: 'POST', body: JSON.stringify({ title, body: MARK + '\nA measure has reached 80 percent of its free limit. Nothing has been changed.\n\n' + t + '\nVercel\'s bandwidth and function use are not measured here; read them in the Vercel account.\n' }) });
  if (!res.ok) throw new Error('POST /issues: HTTP ' + res.status);
}

module.exports = { rows, table, busiest, WARN, DEPLOYS_PER_DAY, REPO_BYTES };
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
