'use strict';
/* One-off probe, never merged (read only): who can reach the production domain and the earlier deployments of Sophaxis. */
const U = [
  ['production domain', 'https://sophaxis.vercel.app/abs/2026.0001.html'],
  ['production domain, OAI', 'https://sophaxis.vercel.app/oai?verb=Identify'],
  ['production domain, PDF', 'https://sophaxis.vercel.app/pdf/2026.0001'],
  ['old production deployment (#108)', 'https://sophaxis-ftokz98qo-cpsbvbng26-dotcoms-projects.vercel.app/abs/2026.0001.html'],
  ['old production deployment (#105)', 'https://sophaxis-3iznitw90-cpsbvbng26-dotcoms-projects.vercel.app/'],
  ['git-main domain', 'https://sophaxis-git-main-cpsbvbng26-dotcoms-projects.vercel.app/'],
  ['team domain', 'https://sophaxis-cpsbvbng26-dotcoms-projects.vercel.app/'],
  ['preview deployment', 'https://sophaxis-lh9dkujsu-cpsbvbng26-dotcoms-projects.vercel.app/'],
];
(async () => {
  for (const [n, u] of U) {
    try {
      const r = await fetch(u, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Sophaxis probe)' }, signal: AbortSignal.timeout(25000) });
      const t = await r.text();
      const title = ((/<title>([^<]*)<\/title>/i.exec(t) || [])[1] || '').trim().replace(/\s+/g, ' ');
      console.log('==== ' + n + ' -> ' + r.status + ' ' + (r.headers.get('location') || '').slice(0, 60) + ' | ' + title.slice(0, 70));
    } catch (e) { console.log('==== ' + n + ' error ' + (e.cause ? e.cause.code || e.cause.message : e.message)); }
  }
})();
// rerun after Standard Protection
