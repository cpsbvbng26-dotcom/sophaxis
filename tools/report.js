#!/usr/bin/env node
/* The report of decisions for one year, counted from the public GitHub issues and the records.
 *
 *   node tools/report.js 2026            write data/reports/2026.json, counted up to today
 *   node tools/report.js 2026 --print    print it only
 *   node tools/report.js 2026 --issues issues.json   count issues fetched beforehand
 *
 * Run by .github/workflows/report.yml each January for the year before, which posts the counts in an issue; the operator
 * records them in data/reports/ by pull request, and build.js shows every recorded year on decisions.html.
 * It reads only public data: the issues labelled submission, withdrawal or removal, the comments of the repository owner
 * on declined submissions, and the records. Removal requests sent by email are not public, and are not counted here.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const UA = 'Sophaxis (' + SITE.repo + ')';
const REPO = SITE.repo.replace(/^https:\/\/github\.com\//, '');

/* The reasons for declining, word for word as the Moderation Policy names them. */
const REASONS = ['Out of scope', 'Not in the form of a scholarly paper', 'Licence', 'Authorship', 'Disclosure', 'Rights or personal data', 'Where the authors live or stay', 'Spam or abuse'];

const JST = 9 * 3600 * 1000;
const day = (t) => (t ? new Date(Date.parse(t) + JST).toISOString().slice(0, 10) : null);
const has = (i, label) => (i.labels || []).some((l) => (l.name || l) === label);
function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

/* Pure: the report of one year. issues carry their labels, user, created_at, closed_at and, for declined
 * submissions, the owner's comments; records are the files in data/papers. Days are counted in Japan time. */
function tally({ issues, records, year, asOf, owner }) {
  const y = String(year);
  const inYear = (t) => !!t && day(t).slice(0, 4) === y;
  const subs = issues.filter((i) => has(i, 'submission') && inYear(i.created_at));
  const decided = subs.filter((i) => has(i, 'accepted') || has(i, 'declined'));
  const days = decided.filter((i) => i.closed_at).map((i) => Math.round((Date.parse(day(i.closed_at)) - Date.parse(day(i.created_at))) / 86400000));
  const reasons = Object.fromEntries(REASONS.map((r) => [r, 0]));
  for (const i of subs.filter((x) => has(x, 'declined'))) {
    const said = (i.comments || []).filter((c) => c.user && c.user.login.toLowerCase() === owner.toLowerCase()).map((c) => c.body || '').join('\n').toLowerCase();
    for (const r of REASONS) if (said.includes(r.toLowerCase())) reasons[r]++;
  }
  const removals = issues.filter((i) => has(i, 'removal') && inYear(i.created_at));
  return {
    year: Number(y),
    asOf,
    complete: asOf > y + '-12-31',
    submissions: {
      opened: subs.length,
      accepted: subs.filter((i) => has(i, 'accepted')).length,
      declined: subs.filter((i) => has(i, 'declined')).length,
      undecided: subs.length - decided.length,
      byOperator: subs.filter((i) => i.user && i.user.login.toLowerCase() === owner.toLowerCase()).length,
    },
    declineReasons: reasons,
    daysToDecision: { median: median(days), longest: days.length ? Math.max(...days) : null },
    withdrawalRequests: issues.filter((i) => has(i, 'withdrawal') && inYear(i.created_at)).length,
    removalRequests: { opened: removals.length, upheld: removals.filter((i) => has(i, 'upheld')).length, notUpheld: removals.filter((i) => has(i, 'not-upheld')).length },
    records: {
      withdrawn: records.filter((p) => p.status === 'withdrawn' && String(p.withdrawal_date || '').startsWith(y)).length,
      removed: records.filter((p) => p.status === 'removed' && String(p.removal_date || '').startsWith(y)).length,
    },
  };
}

async function get(url) {
  const headers = { 'User-Agent': UA, Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = 'Bearer ' + process.env.GITHUB_TOKEN;
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(url.split('?')[0] + ': HTTP ' + r.status);
  return r.json();
}

async function issuesOf(label) {
  const out = [];
  for (let page = 1; page <= 20; page++) {
    const batch = await get('https://api.github.com/repos/' + REPO + '/issues?state=all&per_page=100&page=' + page + '&labels=' + encodeURIComponent(label));
    out.push(...batch.filter((i) => !i.pull_request));
    if (batch.length < 100) break;
  }
  return out;
}

async function main() {
  const year = process.argv[2];
  if (!/^\d{4}$/.test(year || '')) { console.error('usage: node tools/report.js <year> [--print]'); process.exit(2); }
  /* --issues <file> counts issues already fetched (a JSON array, with the comments of declined ones), without the network. */
  const from = process.argv.indexOf('--issues');
  let issues;
  if (from > 0) issues = JSON.parse(fs.readFileSync(process.argv[from + 1], 'utf8'));
  else {
    const seen = new Map();
    for (const label of ['submission', 'withdrawal', 'removal']) for (const i of await issuesOf(label)) seen.set(i.number, i);
    issues = [...seen.values()];
    for (const i of issues.filter((x) => (x.labels || []).some((l) => l.name === 'declined'))) i.comments = await get(i.comments_url + '?per_page=100');
  }
  const dir = path.join(ROOT, 'data', 'papers');
  const records = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  const report = tally({ issues, records, year, asOf: day(new Date().toISOString()), owner: REPO.split('/')[0] });
  const text = JSON.stringify(report, null, 2) + '\n';
  if (process.argv.includes('--print')) { process.stdout.write(text); return; }
  fs.mkdirSync(path.join(ROOT, 'data', 'reports'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'data', 'reports', year + '.json'), text);
  process.stdout.write(text);
}

module.exports = { REASONS, tally, median };

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
