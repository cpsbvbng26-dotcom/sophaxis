'use strict';
/* The one User-Agent of every request that Sophaxis's tools make. The page for repositories promises it: "Every request
 * that Sophaxis's own code makes names Sophaxis and its repository in its User-Agent". request() is the only fetch() under
 * tools/, and curl() the only call of curl; each sets this User-Agent over any other. verification/check.js reads every
 * file under tools/ and fails on a fetch(), a curl or a User-Agent anywhere else (2026-11-12, the fifth pass).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SITE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'site.json'), 'utf8'));
const UA = 'Sophaxis (' + SITE.repo + ')';

/* fetch() with the User-Agent of Sophaxis; a User-Agent given in `opts.headers` is dropped. */
function request(url, opts = {}) {
  const headers = {};
  for (const [k, v] of Object.entries(opts.headers || {})) if (k.toLowerCase() !== 'user-agent') headers[k] = v;
  headers['User-Agent'] = UA;
  return fetch(url, { ...opts, headers });
}

/* curl with the User-Agent of Sophaxis. */
function curl(args, opts) {
  return execFileSync('curl', ['-A', UA].concat(args), opts);
}

module.exports = { UA, request, curl };
