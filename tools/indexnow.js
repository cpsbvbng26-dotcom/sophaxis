#!/usr/bin/env node
/* Tell the search engines that take IndexNow (Bing, Yandex, Naver, Seznam and others) which record pages and
 * PDF copies are new, changed or gone, once the deployment that carries them is live, and save the new and changed
 * ones to the Internet Archive at once (the weekly watch saves every one again).
 * A gone address is one that left the sitemap: a removed record, or a PDF copy taken off the site. IndexNow asks to be
 * told of these too, so that the engines visit them again and drop what they held.
 * Google does not take IndexNow; it reads the sitemap, which robots.txt names.
 *
 * Run by .github/workflows/indexnow.yml on each push to main that changes site/sitemap.xml, and by
 * .github/workflows/removal.yml after it pushes, since a push made by a workflow starts no other workflow.
 *   BEFORE=<commit>  compare the sitemap with the one at that commit (the push's previous head)
 *   ALL=yes          send every record page and PDF copy
 *   node tools/indexnow.js --dry-run   # print what would be sent; send nothing
 *
 * Only public addresses are sent: the home page, record pages and PDF copies. Author pages, which carry an
 * ORCID iD in their address, are not sent.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const UA = 'Sophaxis (' + SITE.repo + ')';
/* IndexNow takes a key of 8 to 128 letters, digits and dashes. */
const KEY_FORM = /^[A-Za-z0-9-]{8,128}$/;
/* Vercel deploys a push in about a minute; wait up to ten. */
const LIVE_WAITS = 20;
const LIVE_GAP_MS = 30 * 1000;

/* Pure: the <loc> and <lastmod> of each entry of a sitemap. */
function entries(xml) {
  const m = new Map();
  for (const x of String(xml || '').matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?<\/url>/g)) m.set(x[1], x[2] || '');
  return m;
}

/* Pure: whether an address is one that is sent. */
function sendable(loc, base = SITE.baseUrl) {
  if (loc === base) return true;
  if (!loc.startsWith(base)) return false;
  return /^abs\/\d{4}\.\d{4}\.html$/.test(loc.slice(base.length)) || /^pdf\/\d{4}\.\d{4}v\d+\.pdf$/.test(loc.slice(base.length));
}

/* Pure: the addresses that are new in the sitemap, or whose date changed, among those that are sent. */
function changed(before, after, base = SITE.baseUrl) {
  const a = entries(before);
  return [...entries(after)].filter(([loc, d]) => sendable(loc, base) && a.get(loc) !== d).map(([loc]) => loc);
}

/* Pure: the addresses that left the sitemap, among those that are sent. They are told to IndexNow, never saved. */
function gone(before, after, base = SITE.baseUrl) {
  const a = entries(after);
  return [...entries(before).keys()].filter((loc) => sendable(loc, base) && !a.has(loc));
}

/* Pure: every address of the sitemap that is sent. */
function every(xml, base = SITE.baseUrl) {
  return [...entries(xml).keys()].filter((loc) => sendable(loc, base));
}

/* Pure: the request IndexNow asks for. */
function request(urls, site = SITE) {
  return {
    host: new URL(site.baseUrl).host,
    key: site.indexNowKey,
    keyLocation: site.baseUrl + site.indexNowKey + '.txt',
    urlList: urls,
  };
}

/* Pure: what an IndexNow answer means. 200 and 202 are success; 202 means the key is still being checked. */
function meaning(status) {
  return ({
    200: 'received',
    202: 'received; the key is being checked',
    400: 'refused: the request is malformed',
    403: 'refused: the key file does not match the key',
    422: 'refused: an address is not on the host, or the key does not match',
    429: 'refused: too many requests',
  })[status] || 'unexpected answer';
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function text(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, cache: 'no-store' });
    return r.ok ? await r.text() : null;
  } catch (e) {
    return null;
  }
}

function sitemapAt(commit) {
  try {
    return execFileSync('git', ['show', commit + ':site/sitemap.xml'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    return '';
  }
}

async function run() {
  const dry = process.argv.includes('--dry-run');
  if (!KEY_FORM.test(String(SITE.indexNowKey || ''))) throw new Error('site.json: indexNowKey is missing or not of the IndexNow form');
  const now = fs.readFileSync(path.join(ROOT, 'site', 'sitemap.xml'), 'utf8');
  const before = process.env.BEFORE || '';
  if (before && !/^[0-9a-f]{7,40}$/.test(before)) throw new Error('BEFORE must be a commit id');
  const all = process.env.ALL === 'yes' || !before || /^0+$/.test(before);
  const fresh = all ? every(now) : changed(sitemapAt(before), now);
  const left = all ? [] : gone(sitemapAt(before), now);
  const urls = fresh.concat(left);
  console.log((all ? 'every address' : 'changed since ' + before.slice(0, 7)) + ': ' + fresh.length + ', gone: ' + left.length);
  fresh.forEach((u) => console.log('  ' + u));
  left.forEach((u) => console.log('  gone ' + u));
  if (!urls.length || dry) return;

  /* Send only once the deployment that carries these pages is live: the live sitemap is the one in this commit. */
  let live = false;
  for (let i = 0; i < LIVE_WAITS && !live; i++) {
    if (i) await pause(LIVE_GAP_MS);
    live = (await text(SITE.baseUrl + 'sitemap.xml')) === now;
  }
  if (!live) throw new Error('the live sitemap is not the one in this commit after ' + (LIVE_WAITS * LIVE_GAP_MS / 60000) + ' minutes; nothing was sent');
  const body = request(urls);
  if ((await text(body.keyLocation)) !== SITE.indexNowKey) throw new Error(body.keyLocation + ' does not serve the key; nothing was sent');

  const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8', 'User-Agent': UA }, body: JSON.stringify(body) });
  console.log('IndexNow: HTTP ' + r.status + ', ' + meaning(r.status));
  if (r.status !== 200 && r.status !== 202) throw new Error('IndexNow refused the request: ' + (await r.text()).slice(0, 300));
  /* The new and changed pages go to the Internet Archive too; a gone one never does. Sending everything leaves this to the weekly watch. */
  if (!all) await require('./watch.js').saveToArchive(fresh);
}

if (require.main === module) run().catch((e) => { console.error(e.message); process.exit(1); });

module.exports = { entries, sendable, changed, gone, every, request, meaning, KEY_FORM, ENDPOINT };
