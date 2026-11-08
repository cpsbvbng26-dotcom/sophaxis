#!/usr/bin/env node
/* Watches the texts that the legal review relies on, so that a change in the law is noticed without anyone looking.
 *
 * - Japanese statutes: each cited article is fetched from the e-Gov law API (v1, public, no key), its text is
 *   reduced to plain characters, and its SHA-256 is compared with the one recorded in verification/statutes.json.
 * - Terms of services: the latest commit of each watched file in GitHub's public site-policy repository is
 *   compared with the one recorded.
 *
 * On a schedule, a difference, an unrecorded entry or a failed fetch opens (or updates) one issue; when everything
 * matches again, that issue is closed. On a pull request or by hand, it only prints, and fails on a difference.
 * Nothing is written to the repository: a new value is recorded by hand, after the operator has read the change.
 *
 *   node tools/statutes.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'verification', 'statutes.json');
const CONF = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const T = CONF.text;
const UA = { 'User-Agent': CONF.agent };
const MARK = '<!-- statutes-watch -->';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, headers = {}) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { ...UA, ...headers }, signal: AbortSignal.timeout(90000) });
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

async function main() {
  const results = [];
  const laws = new Map();
  for (const e of CONF.statutes) {
    const label = e.name + ' ' + e.label;
    try {
      if (!laws.has(e.law_id)) {
        laws.set(e.law_id, await get('https://laws.e-gov.go.jp/api/1/lawdata/' + e.law_id));
        await sleep(1500);
      }
      const xml = laws.get(e.law_id);
      const title = (/<LawTitle[^>]*>([^<]*)<\/LawTitle>/.exec(xml) || [])[1] || '';
      const main = (/<MainProvision[\s\S]*?<\/MainProvision>/.exec(xml) || [''])[0];
      const text = article(main, e.article, e.items);
      if (text === null) { results.push({ label, state: 'missing', note: T.missing }); continue; }
      const h = sha(text);
      if (!e.sha256 || !e.title) results.push({ label, state: 'unrecorded', value: h, note: T.title + ': ' + title, text });
      else if (title !== e.title) results.push({ label, state: 'changed', note: T.title + ': ' + title });
      else if (h !== e.sha256) results.push({ label, state: 'changed', value: h, text });
      else results.push({ label, state: 'same' });
    } catch (err) { results.push({ label, state: 'failed', note: String(err.message || err) }); }
  }
  for (const e of CONF.policies || []) {
    const label = e.name;
    try {
      const auth = process.env.GITHUB_TOKEN ? { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN } : {};
      const list = JSON.parse(await get('https://api.github.com/repos/' + e.repo + '/commits?per_page=1&path=' + encodeURIComponent(e.path), auth));
      const c = list[0] && list[0].sha;
      if (!c) results.push({ label, state: 'failed', note: T.missing });
      else if (!e.commit) results.push({ label, state: 'unrecorded', value: c });
      else if (c !== e.commit) results.push({ label, state: 'changed', value: c, note: 'https://github.com/' + e.repo + '/commits/main/' + e.path });
      else results.push({ label, state: 'same' });
    } catch (err) { results.push({ label, state: 'failed', note: String(err.message || err) }); }
  }
  /* The privacy statements of the services that handle data for Sophaxis (Vercel's request logs, Apple's mailbox):
   * the date each gives for its last update. A new date means the operator reads the statement again (APPI Article 25). */
  for (const e of CONF.pages || []) {
    const label = e.name;
    try {
      const text = (await get(e.url)).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
      const v = (new RegExp(e.pattern).exec(text) || [])[1];
      if (!v) results.push({ label, state: 'missing', note: T.missing });
      else if (!e.value) results.push({ label, state: 'unrecorded', value: v });
      else if (v !== e.value) results.push({ label, state: 'changed', value: v, note: e.url });
      else results.push({ label, state: 'same' });
    } catch (err) { results.push({ label, state: 'failed', note: String(err.message || err) }); }
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

  if (process.env.GITHUB_EVENT_NAME === 'schedule' && process.env.GITHUB_TOKEN) await report(odd);
  const changed = odd.filter((r) => r.state === 'changed' || r.state === 'missing');
  console.log('\n' + (odd.length ? T.summaryOdd.replace('{n}', odd.length).replace('{all}', results.length) : T.summarySame.replace('{all}', results.length)));
  if (changed.length) process.exit(1);
}

async function github(method, p, body) {
  const r = await fetch('https://api.github.com/repos/' + process.env.GITHUB_REPOSITORY + p, {
    method, headers: { ...UA, Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
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

main().catch((e) => { console.error(e); process.exit(1); });
