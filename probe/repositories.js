'use strict';
/* One-off probe, never merged (read only): the privacy statements of the services Sophaxis uses, and their DPF status. */
const U = [
  ['GitHub', 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement'],
  ['Vercel', 'https://vercel.com/legal/privacy-policy'],
  ['ORCID', 'https://info.orcid.org/privacy-policy/'],
  ['Internet Archive', 'https://archive.org/about/terms'],
  ['Crossref', 'https://www.crossref.org/operations-and-sustainability/privacy/'],
  ['DataCite', 'https://datacite.org/privacy-policy/'],
  ['DPF list GitHub', 'https://www.dataprivacyframework.gov/list?search=GitHub'],
];
(async () => {
  for (const [n, u] of U) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Sophaxis probe)' }, signal: AbortSignal.timeout(25000) });
      const t = await r.text();
      const title = ((/<title>([^<]*)<\/title>/i.exec(t) || [])[1] || '').trim().replace(/\s+/g, ' ');
      const dpf = [...t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').matchAll(/[^.]{0,160}Data Privacy Framework[^.]{0,160}\./g)].slice(0, 2).map((m) => m[0].trim());
      console.log('==== ' + n + ' -> ' + r.status + ' ' + r.url + ' | ' + title.slice(0, 70));
      dpf.forEach((d) => console.log('  DPF: ' + d.slice(0, 300)));
    } catch (e) { console.log('==== ' + n + ' error ' + (e.cause ? e.cause.code || e.cause.message : e.message)); }
  }
})();
