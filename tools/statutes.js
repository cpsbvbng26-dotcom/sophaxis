#!/usr/bin/env node
/* Watches the texts that the legal review relies on, so that a change in the law is noticed without anyone looking.
 *
 * - Japanese statutes: each cited article is fetched from the e-Gov law API (v1, public, no key), its text is
 *   reduced to plain characters, and its SHA-256 is compared with the one recorded in verification/statutes.json.
 *   The text itself is kept in verification/statutes-texts.json, so that a change can be shown as a difference.
 * - Terms of services: the latest commit of each watched file in GitHub's public site-policy repository is
 *   compared with the one recorded.
 * - Privacy statements of the services that handle data (CONF.pages): the date each gives for its last update.
 *
 * On a schedule or by hand, a change is proposed as a pull request from the branch statutes/record: the new values,
 * the new texts, and the difference of each text in the description. The operator reads it and records it by the
 * label `record` (tools/record.js), which runs the checks on the merged result first. Nothing reaches main otherwise.
 * A fetch that fails or an article that is gone opens (or updates) one issue; when everything matches again, it closes.
 * On a pull request it only prints, and fails on a difference.
 *
 *   node tools/statutes.js
 */
'use strict';
const { request } = require('./ua.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'verification', 'statutes.json');
const CONF = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const T = CONF.text;
const MARK = '<!-- statutes-watch -->';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, headers = {}) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await request(url, { headers, signal: AbortSignal.timeout(90000) });
      if (r.ok) return await r.text();
      if (r.status < 500 && r.status !== 429) throw new Error('HTTP ' + r.status);
    } catch (e) { if (i === 2) throw e; }
    await sleep(5000 * (i + 1));
  }
  throw new Error('no answer');
}

// The plain characters of an element: ruby readings and tags dropped, white space collapsed.
const plain = (x) => x.replace(/<Rt>[^<]*<\/Rt>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const sha = (x) => crypto.createHash('sha256').update(x, 'utf8').digest('hex');

function article(main, num, items) {
  const m = new RegExp('<Article[^>]*\\sNum="' + num + '"[^>]*>[\\s\\S]*?</Article>').exec(main);
  if (!m) return null;
  if (!items) return plain(m[0]);
  const parts = items.map((n) => (new RegExp('<Item[^>]*\\sNum="' + n + '"[^>]*>[\\s\\S]*?</Item>').exec(m[0]) || [null])[0]);
  return parts.every(Boolean) ? parts.map(plain).join('\n') : null;
}

const TEXTS_FILE = path.join(ROOT, 'verification', 'statutes-texts.json');
const BRANCH = 'statutes/record';
const PROPOSAL = '<!-- statutes-proposal -->';

async function main() {
  const results = [];
  const laws = new Map();
  CONF.statutes.forEach((e, i) => results.push({ kind: 'statute', i, label: e.name + ' ' + e.label }));
  for (const r of results) {
    const e = CONF.statutes[r.i];
    try {
      if (!laws.has(e.law_id)) {
        laws.set(e.law_id, await get('https://laws.e-gov.go.jp/api/1/lawdata/' + e.law_id));
        await sleep(1500);
      }
      const xml = laws.get(e.law_id);
      const title = (/<LawTitle[^>]*>([^<]*)<\/LawTitle>/.exec(xml) || [])[1] || '';
      const main = (/<MainProvision[\s\S]*?<\/MainProvision>/.exec(xml) || [''])[0];
      const text = article(main, e.article, e.items);
      if (text === null) { Object.assign(r, { state: 'missing', note: T.missing }); continue; }
      const h = sha(text);
      Object.assign(r, { text, title, value: h });
      if (!e.sha256 || !e.title) Object.assign(r, { state: 'unrecorded', note: T.title + ': ' + title });
      else if (title !== e.title) Object.assign(r, { state: 'changed', note: T.title + ': ' + title });
      else if (h !== e.sha256) r.state = 'changed';
      else { r.state = 'same'; delete r.value; }
    } catch (err) { Object.assign(r, { state: 'failed', note: String(err.message || err) }); }
  }
  for (const [i, e] of (CONF.policies || []).entries()) {
    const r = { kind: 'policy', i, label: e.name };
    try {
      const auth = process.env.GITHUB_TOKEN ? { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN } : {};
      const list = JSON.parse(await get('https://api.github.com/repos/' + e.repo + '/commits?per_page=1&path=' + encodeURIComponent(e.path), auth));
      const c = list[0] && list[0].sha;
      if (!c) Object.assign(r, { state: 'failed', note: T.missing });
      else if (!e.commit) Object.assign(r, { state: 'unrecorded', value: c });
      else if (c !== e.commit) Object.assign(r, { state: 'changed', value: c, note: 'https://github.com/' + e.repo + '/compare/' + e.commit + '...' + c });
      else r.state = 'same';
    } catch (err) { Object.assign(r, { state: 'failed', note: String(err.message || err) }); }
    results.push(r);
  }
  /* The privacy statements of the services that handle data (Sophaxis: Vercel's request logs, Apple's mailbox):
   * the date each gives for its last update. A new date means the operator reads the statement again (APPI Article 25). */
  for (const [i, e] of (CONF.pages || []).entries()) {
    const r = { kind: 'page', i, label: e.name };
    try {
      const text = (await get(e.url)).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
      const v = (new RegExp(e.pattern).exec(text) || [])[1];
      if (!v) Object.assign(r, { state: 'missing', note: T.missing });
      else if (!e.value) Object.assign(r, { state: 'unrecorded', value: v });
      else if (v !== e.value) Object.assign(r, { state: 'changed', value: v, note: e.url });
      else r.state = 'same';
    } catch (err) { Object.assign(r, { state: 'failed', note: String(err.message || err) }); }
    results.push(r);
  }

  for (const r of results) console.log(T.state[r.state] + '  ' + r.label + (r.value ? '  ' + r.value : '') + (r.note ? '  (' + r.note + ')' : ''));
  const odd = results.filter((r) => r.state !== 'same');
  if (odd.some((r) => r.text)) {
    console.log('\n' + T.texts);
    for (const r of odd.filter((x) => x.text)) console.log('\n## ' + r.label + '\n' + r.text);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '| | |\n| --- | --- |\n' + results.map((r) => '| ' + T.state[r.state] + ' | ' + r.label + ' |').join('\n') + '\n');
  }

  const acting = ['schedule', 'workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME) && process.env.GITHUB_TOKEN;
  if (acting) {
    const texts = fs.existsSync(TEXTS_FILE) ? JSON.parse(fs.readFileSync(TEXTS_FILE, 'utf8')) : {};
    const p = proposal(results, CONF, texts, new Date().toISOString().slice(0, 10));
    if (p) await propose(p);
    await report(odd.filter((r) => r.state === 'missing' || r.state === 'failed'));
  }
  const changed = odd.filter((r) => r.state === 'changed' || r.state === 'missing');
  console.log('\n' + (odd.length ? T.summaryOdd.replace('{n}', odd.length).replace('{all}', results.length) : T.summarySame.replace('{all}', results.length)));
  if (changed.length) process.exit(1);
}

/* ------------------------------------------------------------ the proposal (pure) */

/* Sentences, the unit of a difference: a Japanese article ends its sentences with 。, an English text with a full stop. */
const sentences = (t) => String(t || '').split(/(?<=。)|(?<=\.)\s+|\n/).map((x) => x.trim()).filter(Boolean);

/* Pure: a line difference of two texts by sentences (longest common subsequence). */
function diff(a, b) {
  const x = sentences(a), y = sentences(b);
  const L = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0));
  for (let i = x.length - 1; i >= 0; i--) for (let j = y.length - 1; j >= 0; j--) L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < x.length && j < y.length) {
    if (x[i] === y[j]) { out.push('  ' + x[i]); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) out.push('- ' + x[i++]);
    else out.push('+ ' + y[j++]);
  }
  while (i < x.length) out.push('- ' + x[i++]);
  while (j < y.length) out.push('+ ' + y[j++]);
  return out.join('\n');
}

/* Pure: what the pull request records, or null when nothing is new. `results` as main() builds them;
 * `texts` the recorded texts. Returns { conf, texts, body, changed } with the new values and texts. */
function proposal(results, conf, texts, today) {
  const next = JSON.parse(JSON.stringify(conf));
  const nextTexts = Object.assign({}, texts);
  const parts = [];
  let seeded = 0;
  for (const r of results) {
    if (r.kind === 'statute' && r.text) {
      const e = next.statutes[r.i];
      const old = texts[r.label];
      if (r.state === 'same' && old === undefined) { nextTexts[r.label] = r.text; seeded++; continue; }
      if (r.state !== 'changed' && r.state !== 'unrecorded') continue;
      e.sha256 = r.value; e.title = r.title;
      nextTexts[r.label] = r.text;
      parts.push('### ' + r.label + (r.note ? ' (' + r.note + ')' : '') + '\n\n' + (old === undefined ? T.noOld + '\n\n```\n' + r.text + '\n```' : '```diff\n' + diff(old, r.text) + '\n```'));
    } else if (r.kind === 'policy' && (r.state === 'changed' || r.state === 'unrecorded')) {
      next.policies[r.i].commit = r.value;
      parts.push('### ' + r.label + '\n\n' + (r.note ? r.note : '`' + r.value + '`'));
    } else if (r.kind === 'page' && (r.state === 'changed' || r.state === 'unrecorded')) {
      const old = next.pages[r.i].value;
      next.pages[r.i].value = r.value;
      parts.push('### ' + r.label + '\n\n' + (old ? old + ' → ' : '') + r.value + (r.note ? ' (' + r.note + ')' : ''));
    }
  }
  if (!parts.length && !seeded) return null;
  if (parts.length) next.recorded = today;
  const body = T.prHead + '\n\n' + (parts.length ? parts.join('\n\n') : T.seedOnly) + (seeded ? '\n\n' + T.seeded.replace('{n}', seeded) : '') + '\n\n' + T.prFoot;
  return { conf: next, texts: nextTexts, body, changed: parts.length };
}

/* Pure: the changelog with one line under today's date (a new date heading if needed), or the text unchanged. */
function withChangelog(log, today, line) {
  const m = /^## (\d{4}-\d{2}-\d{2})$/m.exec(log);
  if (!m) return log;
  if (m[1] === today) return log.slice(0, m.index + m[0].length) + '\n\n' + line + log.slice(m.index + m[0].length).replace(/^\n+/, '\n');
  return log.slice(0, m.index) + '## ' + today + '\n\n' + line + '\n\n' + log.slice(m.index);
}

/* ------------------------------------------------------------ the pull request */

const git = (...args) => require('child_process').execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });

async function propose(p) {
  const today = new Date().toISOString().slice(0, 10);
  git('config', 'user.name', 'github-actions[bot]');
  git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com');
  git('checkout', '-B', BRANCH);
  fs.writeFileSync(FILE, JSON.stringify(p.conf, null, 2) + '\n');
  fs.writeFileSync(TEXTS_FILE, JSON.stringify(p.texts, null, 2) + '\n');
  const files = [path.relative(ROOT, FILE), path.relative(ROOT, TEXTS_FILE)];
  /* Where a changelog must cite every merged pull request, the line carries (#PR), which tools/record.js fills in. */
  if (CONF.changelog) {
    const f = path.join(ROOT, CONF.changelog.file);
    fs.writeFileSync(f, withChangelog(fs.readFileSync(f, 'utf8'), today, p.changed ? CONF.changelog.line : CONF.changelog.seedLine));
    files.push(CONF.changelog.file);
  }
  git('add', ...files);
  git('commit', '-q', '-m', p.changed ? T.prTitle : T.seedTitle);
  git('push', '-q', '-f', 'origin', 'HEAD:refs/heads/' + BRANCH);
  const owner = process.env.GITHUB_REPOSITORY.split('/')[0];
  const open = (await github('GET', '/pulls?state=open&head=' + owner + ':' + encodeURIComponent(BRANCH))) || [];
  const body = p.body + '\n\nRun: ' + process.env.GITHUB_SERVER_URL + '/' + process.env.GITHUB_REPOSITORY + '/actions/runs/' + process.env.GITHUB_RUN_ID;
  if (open.length) { await github('PATCH', '/pulls/' + open[0].number, { body }); return; }
  try {
    const pr = await github('POST', '/pulls', { title: p.changed ? T.prTitle : T.seedTitle, head: BRANCH, base: 'main', body });
    if (CONF.labels && CONF.labels.length) await github('POST', '/issues/' + pr.number + '/labels', { labels: CONF.labels });
  } catch (e) {
    /* A repository may not let workflows open pull requests (Settings, Actions, "Allow GitHub Actions to create and
     * approve pull requests"). Then the proposal is an issue with a link that opens the pull request in one step. */
    if (!/HTTP 403/.test(e.message)) throw e;
    const link = process.env.GITHUB_SERVER_URL + '/' + process.env.GITHUB_REPOSITORY + '/compare/main...' + BRANCH + '?expand=1';
    const text = PROPOSAL + '\n' + T.openPr.replace('{link}', link) + '\n\n' + body;
    const issue = ((await github('GET', '/issues?state=open&per_page=50')) || []).find((i) => !i.pull_request && (i.body || '').startsWith(PROPOSAL));
    if (issue) await github('PATCH', '/issues/' + issue.number, { body: text });
    else await github('POST', '/issues', { title: p.changed ? T.prTitle : T.seedTitle, body: text, labels: CONF.labels || [] });
  }
}

async function github(method, p, body) {
  const r = await request('https://api.github.com/repos/' + process.env.GITHUB_REPOSITORY + p, {
    method, headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(method + ' ' + p + ': HTTP ' + r.status);
  return r.status === 204 ? null : r.json();
}

async function report(odd) {
  const open = ((await github('GET', '/issues?state=open&per_page=50')) || []).find((i) => (i.body || '').startsWith(MARK));
  const when = new Date().toISOString().slice(0, 10);
  if (odd.length) {
    const body = MARK + '\n' + T.issueHead.replace('{when}', when) + '\n\n'
      + odd.map((r) => '- ' + T.state[r.state] + ' ' + r.label + (r.value ? ' `' + r.value + '`' : '') + (r.note ? ' (' + r.note + ')' : '')).join('\n')
      + '\n\n' + T.issueFoot + '\n\n' + 'Run: ' + process.env.GITHUB_SERVER_URL + '/' + process.env.GITHUB_REPOSITORY + '/actions/runs/' + process.env.GITHUB_RUN_ID;
    if (open) await github('PATCH', '/issues/' + open.number, { body });
    else await github('POST', '/issues', { title: T.issueTitle, body, labels: CONF.labels || [] });
  } else if (open) {
    await github('POST', '/issues/' + open.number + '/comments', { body: MARK + '\n' + T.closed.replace('{when}', when) });
    await github('PATCH', '/issues/' + open.number, { state: 'closed', state_reason: 'completed' });
  }
}

module.exports = { diff, sentences, proposal, withChangelog, BRANCH, PROPOSAL };

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
