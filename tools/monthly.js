#!/usr/bin/env node
/* The monthly summary for the official account on X: on the 1st of each month, what was listed and announced in the month
 * before, as a post in English and one in Japanese, each within the 280 weighted characters that X counts, posted in an issue
 * for the operator to copy. X's API is paid, so nothing is posted automatically.
 *
 *   node tools/monthly.js --print [2026-11]     print the posts for a month (default: the month before, in Japan time)
 *
 * Until 2026-11-13 it was run by .github/workflows/monthly.yml. It no longer is: GitHub's terms allow Actions on GitHub's
 * runners only for the production, testing, deployment or publication of the project, and these posts serve none of them
 * (docs/legal-audit-2026-11-12.md, the eighth pass). A month with no new record and no news gets no issue. */
'use strict';
const { request } = require('./ua.js');

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const MARK = '<!-- sophaxis-monthly -->';
const LIMIT = 280;

/* Pure: the length that X counts. A URL counts 23; a character in the ranges X treats as light counts 1, any other 2. */
function weighted(text) {
  let n = 0;
  const rest = String(text).replace(/https?:\/\/\S+/g, () => { n += 23; return ''; });
  for (const ch of rest) {
    const c = ch.codePointAt(0);
    n += (c <= 4351 || (c >= 8192 && c <= 8205) || (c >= 8208 && c <= 8223) || (c >= 8242 && c <= 8247)) ? 1 : 2;
  }
  return n;
}

/* Pure: the month before a day, as YYYY-MM. */
function monthBefore(day) {
  const [y, m] = day.split('-').map(Number);
  return m === 1 ? (y - 1) + '-12' : y + '-' + String(m - 1).padStart(2, '0');
}

/* Pure: the posts for a month, from the records and the news. Titles are dropped from the end until each post fits. */
function posts(month, records, news) {
  const listed = records.filter((p) => p.status !== 'removed' && String(p.listed || '').startsWith(month));
  const notes = news.filter((n) => String(n.date).startsWith(month));
  if (!listed.length && !notes.length) return null;
  const d = new Date(month + '-01T00:00:00Z');
  const en = d.toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const ja = d.getUTCFullYear() + '年' + (d.getUTCMonth() + 1) + '月';
  const url = SITE.baseUrl + 'months.html';
  const build = (k, lang) => {
    const items = lang === 'en'
      ? listed.slice(0, k).map((p) => '- ' + p.title).concat(notes.slice(0, Math.max(0, k - listed.length)).map((n) => '- ' + n.title))
      : listed.slice(0, k).map((p) => '・' + p.title).concat(notes.slice(0, Math.max(0, k - listed.length)).map((n) => '・' + n.title));
    const head = lang === 'en'
      ? `Sophaxis in ${en}: ${listed.length} new ${listed.length === 1 ? 'preprint' : 'preprints'} in philosophy and mathematics${notes.length ? ', and ' + notes.length + ' ' + (notes.length === 1 ? 'piece' : 'pieces') + ' of news' : ''}.`
      : `${ja}の Sophaxis：哲学と数学の新しいプレプリントが ${listed.length} 篇${notes.length ? '、お知らせが ' + notes.length + ' 件' : ''}。`;
    return [head, items.join('\n'), url].filter(Boolean).join('\n\n');
  };
  const fit = (lang) => { for (let k = listed.length + notes.length; k >= 0; k--) { const t = build(k, lang); if (weighted(t) <= LIMIT) return t; } return build(0, lang); };
  return { month, en: fit('en'), ja: fit('ja') };
}

function body(p) {
  return `${MARK}
The summary of ${p.month} for the official account on X (@${SITE.x}). Copy each post as it is; X's API is paid, so nothing is posted automatically.

English (${weighted(p.en)} / ${LIMIT}):

~~~~text
${p.en}
~~~~

日本語（${weighted(p.ja)} / ${LIMIT}）：

~~~~text
${p.ja}
~~~~
`;
}

async function main() {
  const day = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const arg = process.argv.find((a) => /^\d{4}-\d{2}$/.test(a));
  const month = arg || monthBefore(day);
  const dir = path.join(ROOT, 'data', 'papers');
  const records = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  const news = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'news.json'), 'utf8'));
  const p = posts(month, records, news);
  if (!p) { console.log('nothing new in ' + month); return; }
  if (process.argv.includes('--print')) { process.stdout.write(body(p)); return; }
  const r = await request('https://api.github.com/repos/' + process.env.GITHUB_REPOSITORY + '/issues', {
    method: 'POST', headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Summary of ' + month + ' for X', body: body(p) }),
  });
  if (!r.ok) throw new Error('POST /issues: HTTP ' + r.status);
  console.log(body(p));
}

module.exports = { weighted, monthBefore, posts, body, LIMIT, MARK };

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
