#!/usr/bin/env node
/* Checks that the live site serves what main holds in site/: every file is fetched from the production address
 * and compared byte for byte with the file in the repository. A deployment that failed, was refused (for example
 * by the daily limit of the free plan) or still serves an earlier version shows as a difference.
 *
 * WAIT=600 retries for up to that many seconds, for a check just after a push. On a schedule or after a push,
 * a difference that remains opens (or updates) one issue; when everything matches again, the issue is closed.
 *
 *   node tools/live.js
 */
'use strict';
const { request } = require('./ua.js');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const MARK = '<!-- live-site -->';
/* The address of the site: Sophaxis keeps it in site.json, Nusquama in build.js. */
const BASE = (() => {
  if (fs.existsSync(path.join(ROOT, 'site.json'))) return JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8')).baseUrl;
  return (/const BASE = '([^']+)'/.exec(fs.readFileSync(path.join(ROOT, 'build.js'), 'utf8')) || [])[1];
})();
const T = fs.existsSync(path.join(ROOT, 'site.json'))
  ? { title: 'The live site differs from main', head: 'The live site at {base} does not serve what main holds in site/ ({when}). The deployment may have failed, may have been refused by the daily limit of the free plan, or may still be running.', foot: 'Redeploy the latest commit of main from Vercel, or push again. This issue closes by itself when the live site matches.', closed: 'The live site matches main again ({when}). Closing.', same: 'All {n} files match.', differ: '{d} of {n} files differ.' }
  : { title: '公開中のサイトが main と違う', head: '{base} の公開中のサイトが、main の site/ と違うものを配っています（{when}）。デプロイが失敗したか、無料の枠の一日の上限で断られたか、まだ終わっていないかもしれません。', foot: 'Vercel で main の最新のコミットをデプロイし直すか、もう一度 push します。公開中のサイトが一致すれば、この issue はひとりでに閉じます。', closed: '公開中のサイトが main とふたたび一致しました（{when}）。閉じます。', same: '{n} 件すべて一致しました。', differ: '{n} 件のうち {d} 件が違います。' };

/* Pure: the files that are served, and their addresses. vercel.json and the functions under api/ are not files. */
function served(files) {
  return files.filter((f) => f !== 'vercel.json' && !f.startsWith('api/')).sort()
    .map((f) => ({ file: f, url: BASE + (f === 'index.html' ? '' : f) }));
}

const walk = (dir, pre = '') => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name), pre + d.name + '/') : [pre + d.name]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function compare(list) {
  const out = [];
  for (const x of list) {
    try {
      const r = await request(x.url, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
      const got = Buffer.from(await r.arrayBuffer());
      const want = fs.readFileSync(path.join(SITE, x.file));
      if (r.status !== 200) out.push({ file: x.file, why: 'HTTP ' + r.status });
      else if (!got.equals(want)) out.push({ file: x.file, why: got.length + ' bytes served, ' + want.length + ' in main' });
    } catch (e) { out.push({ file: x.file, why: String(e.message || e) }); }
  }
  return out;
}

async function github(method, p, body) {
  const r = await request('https://api.github.com/repos/' + process.env.GITHUB_REPOSITORY + p, {
    method, headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(method + ' ' + p + ': HTTP ' + r.status);
  return r.status === 204 ? null : r.json();
}

async function main() {
  const list = served(walk(SITE));
  const until = Date.now() + Number(process.env.WAIT || 0) * 1000;
  let bad = await compare(list);
  while (bad.length && Date.now() < until) { await sleep(30000); bad = await compare(list); }
  for (const b of bad) console.log(b.file + '  ' + b.why);
  console.log(bad.length ? T.differ.replace('{d}', bad.length).replace('{n}', list.length) : T.same.replace('{n}', list.length));
  if (process.env.GITHUB_TOKEN && ['schedule', 'push', 'workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME)) {
    const when = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
    const open = ((await github('GET', '/issues?state=open&per_page=50')) || []).find((i) => !i.pull_request && (i.body || '').startsWith(MARK));
    if (bad.length) {
      const body = MARK + '\n' + T.head.replace('{base}', BASE).replace('{when}', when) + '\n\n' + bad.slice(0, 50).map((b) => '- `' + b.file + '` ' + b.why).join('\n')
        + (bad.length > 50 ? '\n- …' : '') + '\n\n' + T.foot;
      if (open) await github('PATCH', '/issues/' + open.number, { body });
      else await github('POST', '/issues', { title: T.title, body });
    } else if (open) {
      await github('POST', '/issues/' + open.number + '/comments', { body: MARK + '\n' + T.closed.replace('{when}', when) });
      await github('PATCH', '/issues/' + open.number, { state: 'closed', state_reason: 'completed' });
    }
  }
  if (bad.length) process.exit(1);
}

module.exports = { served, BASE };
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
