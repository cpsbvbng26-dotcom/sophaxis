'use strict';
/* One-off probe, never merged (read only): whether FAIRsharing and its sign-in answer. */
const urls = ['https://fairsharing.org/', 'https://fairsharing.org/accounts/login', 'https://fairsharing.org/accounts/forgotPassword', 'https://api.fairsharing.org/', 'https://api.fairsharing.org/users/sign_in', 'https://api.fairsharing.org/search/fairsharing_records?q=sophaxis', 'https://fairsharing.org/9430'];
(async () => {
  for (const u of urls) {
    const t0 = Date.now();
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Sophaxis probe)', Accept: 'text/html,application/json' } });
      const t = await r.text();
      const title = (/<title>([^<]*)<\/title>/i.exec(t) || [])[1];
      console.log('==== ' + u + ' -> ' + r.status + ' in ' + (Date.now() - t0) + ' ms ' + r.url + ' | ' + (title || '').trim() + ' | ' + t.replace(/\s+/g, ' ').slice(0, 300));
      [...t.matchAll(/(orcid|github|google|twitter|sign_in|omniauth)[^"' <]{0,80}/gi)].map((m) => m[0]).filter((v, i, a) => a.indexOf(v) === i).slice(0, 15).forEach((l) => console.log('  ' + l));
    } catch (e) { console.log('==== ' + u + ' error ' + e.message + ' after ' + (Date.now() - t0) + ' ms'); }
  }
})();
