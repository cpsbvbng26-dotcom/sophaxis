'use strict';
/* One-off probe, never merged (read only): whether shields.io still draws the LinkedIn and ORCID logos. */
const urls = ['https://img.shields.io/badge/LinkedIn-0A66C2?logo=linkedin&logoColor=white', 'https://img.shields.io/badge/ORCID-A6CE39?logo=orcid&logoColor=white', 'https://img.shields.io/badge/X-000000?logo=x&logoColor=white'];
(async () => {
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Sophaxis probe' } });
      const t = await r.text();
      console.log('==== ' + u + ' -> ' + r.status + ' ' + r.headers.get('content-type') + ' logo:' + /<image|<path/.test(t) + ' len ' + t.length);
    } catch (e) { console.log('==== ' + u + ' error ' + e.message); }
  }
})();
