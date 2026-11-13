'use strict';
/* Probe: the Internet Archive's captures of three Vercel pages in 2026, and which of them still hold the passages that the
 * pages held on 2026-11-12. Prints timestamps, SHA-256 of the plain text and whether the passages are there. */
const crypto = require('crypto');
const S = require('./tools/sources.js');
const sha = (x) => crypto.createHash('sha256').update(x, 'utf8').digest('hex');
const UA = { 'User-Agent': 'sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)' };
const PAGES = {
  'https://vercel.com/docs/limits/fair-use-guidelines': ['Commercial usage is defined as any Deployment', 'Asking for Donations does not fall under commercial usage.', 'Hobby teams are restricted to non-commercial personal use only.'],
  'https://vercel.com/docs/plans/hobby': ['the Hobby plan restricts users to non-commercial, personal use only'],
  'https://vercel.com/docs/plans': ['Hobby plan is designed for personal projects and developers.'],
};
(async () => {
  for (const [u, needles] of Object.entries(PAGES)) {
    const cdx = 'https://web.archive.org/cdx/search/cdx?url=' + encodeURIComponent(u) + '&from=20260801&to=20261113&output=json&fl=timestamp,statuscode,digest&collapse=digest';
    let rows = [];
    try { rows = JSON.parse(await (await fetch(cdx, { headers: UA, signal: AbortSignal.timeout(90000) })).text()).slice(1); } catch (e) { console.log('CDX ' + u + ' ' + e.message); }
    console.log('=====CDX ' + u + ' ' + rows.length + ' ' + JSON.stringify(rows));
    for (const [ts, st] of rows.filter((r) => r[1] === '200').slice(-6)) {
      await new Promise((ok) => setTimeout(ok, 2000));
      try {
        const res = await fetch('https://web.archive.org/web/' + ts + 'id_/' + u, { headers: UA, signal: AbortSignal.timeout(90000) });
        const t = S.plain(await res.text()).replace(/\s+/g, ' ');
        console.log('CAP ' + ts + ' ' + res.status + ' len ' + t.length + ' sha ' + sha(t) + ' ' + needles.map((n) => (t.includes(n) ? 'Y' : 'n')).join('') + ' ' + ((/Last updated [A-Z][a-z]+ \d+, \d{4}/.exec(t) || [])[0] || ''));
      } catch (e) { console.log('CAP ' + ts + ' ' + e.message); }
    }
  }
})();
