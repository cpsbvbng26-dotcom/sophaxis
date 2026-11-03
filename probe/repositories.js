'use strict';
/* One-off probe, never merged (read only): Software Heritage's save page, and whether the repositories are archived there. */
const repos = ['sophaxis', 'deposit-check', 'cpsbvbng26-dotcom'];
const urls = ['https://archive.softwareheritage.org/save/'].concat(repos.map((r) => 'https://archive.softwareheritage.org/api/1/origin/https://github.com/cpsbvbng26-dotcom/' + r + '/visits/?per_page=1'));
(async () => {
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)' } });
      const t = await r.text();
      const title = (/<title>([^<]*)<\/title>/i.exec(t) || [])[1];
      console.log('==== ' + u + ' -> ' + r.status + ' | ' + (title || '').trim() + ' | ' + (title ? '' : t.replace(/\s+/g, ' ').slice(0, 400)));
    } catch (e) { console.log('==== ' + u + ' error ' + e.message); }
  }
})();
