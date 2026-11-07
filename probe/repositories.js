'use strict';
/* One-off probe, never merged (read only): the Zenodo community "sophaxis", its settings and its records. */
const UA = { 'User-Agent': 'Sophaxis probe (https://github.com/cpsbvbng26-dotcom/sophaxis)' };
const get = async (u) => { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(40000) }); return [r.status, await r.text()]; };
(async () => {
  const [s, t] = await get('https://zenodo.org/api/communities/sophaxis');
  console.log('==== community [' + s + ']');
  try {
    const c = JSON.parse(t);
    console.log(JSON.stringify({ id: c.id, slug: c.slug, created: c.created, title: c.metadata && c.metadata.title, description: c.metadata && c.metadata.description, type: c.metadata && c.metadata.type, website: c.metadata && c.metadata.website, curation_policy: c.metadata && c.metadata.curation_policy, page: c.metadata && c.metadata.page, organizations: c.metadata && c.metadata.organizations, access: c.access, review_policy: c.access && c.access.review_policy, links: c.links && c.links.self_html }, null, 1));
  } catch (e) { console.log(t.slice(0, 800)); }
  const [s2, t2] = await get('https://zenodo.org/api/communities/sophaxis/records?size=25');
  console.log('==== records [' + s2 + ']');
  try {
    const j = JSON.parse(t2);
    console.log('total', j.hits.total);
    for (const r of j.hits.hits) console.log('  ' + r.doi + ' | ' + r.metadata.title + ' | ' + r.created.slice(0, 10));
  } catch (e) { console.log(t2.slice(0, 800)); }
  const [s3, t3] = await get('https://zenodo.org/api/communities/sophaxis/requests?size=25');
  console.log('==== requests [' + s3 + '] ' + t3.slice(0, 300));
})();
