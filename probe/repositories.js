'use strict';
/* One-off probe, never merged: the new repositories, read with the real intake code. */
const { lookUp } = require('../tools/intake.js');
const SITE = require('../site.json');
(async () => {
  for (const [n, u] of Object.entries(SITE.repositoryHomes)) {
    try { const r = await fetch(u, { headers: { 'User-Agent': 'Sophaxis (' + SITE.repo + ')' }, redirect: 'follow' }); console.log('home', r.status, n, u, '->', r.url); }
    catch (e) { console.log('home ERR', n, u, e.message); }
  }
  for (const d of ['10.31235/osf.io/q4fp7_v3', '10.31222/osf.io/zjkd2_v2', '10.1590/scielopreprints.18633', '10.32388/tb0ffk', '10.32388/jgoe50', '10.14293/pr2199.004729.v1',
    '10.31124/advance.19380077', '10.17613/5kv23-39x46', '10.51094/jxiv.161', '10.51094/jxiv.1000']) {
    try {
      const { meta } = await lookUp(d);
      console.log('doi', d, meta ? JSON.stringify({ agency: meta.agency, type: meta.type, licences: meta.licences, date: meta.date, authors: meta.authors.length, orcids: meta.authors.filter((a) => a.orcid).length, abstract: meta.abstract.length, title: meta.title.slice(0, 60) }) : 'NOT FOUND');
    } catch (e) { console.log('doi', d, 'error', e.message); }
  }
})();
