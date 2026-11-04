'use strict';
/* One-off probe, never merged (read only): whether Sophaxis is listed yet, and whether its code is archived. */
const urls = ['https://roar.eprints.org/cgi/search/simple?q=sophaxis', 'https://doapr.coar-repositories.org/repositories/?q=sophaxis', 'https://doapr.coar-repositories.org/repositories/sophaxis/']
  .concat(['sophaxis', 'deposit-check', 'cpsbvbng26-dotcom'].map((r) => 'https://archive.softwareheritage.org/api/1/origin/https://github.com/cpsbvbng26-dotcom/' + r + '/visits/?per_page=1'));
(async () => {
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)' } });
      const t = await r.text();
      const title = (/<title>([^<]*)<\/title>/i.exec(t) || [])[1];
      const hits = (t.match(/sophaxis/gi) || []).length;
      console.log('==== ' + u + ' -> ' + r.status + ' | ' + (title || '').trim().replace(/\s+/g, ' ') + ' | mentions ' + hits + ' | ' + (title ? '' : t.slice(0, 200)));
      const m = /Displaying results[^<]{0,80}|Search has no matches[^<]{0,40}|(\d+) results?/i.exec(t); if (m) console.log('  ' + m[0]);
    } catch (e) { console.log('==== ' + u + ' error ' + e.message); }
  }
})();
