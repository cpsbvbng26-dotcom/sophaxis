'use strict';
/* One-off probe, never merged (read only): whether a registry lists Sophaxis yet. Plain requests only. */
const urls = ['https://fairsharing.org/9430', 'https://roar.eprints.org/27422/', 'https://doapr.coar-repositories.org/repositories/sophaxis/', 'https://philpapers.org/archives/list.html', 'https://oad.simmons.edu/oadwiki/Disciplinary_repositories'];
(async () => {
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)' } });
      const t = await r.text();
      const title = (/<title>([^<]*)<\/title>/i.exec(t) || [])[1];
      console.log('==== ' + u + ' -> ' + r.status + ' | ' + (title || t.slice(0, 120)).trim().replace(/\s+/g, ' ') + ' | sophaxis ' + (t.match(/sophaxis/gi) || []).length);
    } catch (e) { console.log('==== ' + u + ' error ' + e.message); }
  }
})();
