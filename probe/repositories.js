'use strict';
/* One-off probe, never merged: what https://osf.io/mq7za is, read from public APIs. */
const UA = 'Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)';
const get = async (u) => { const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/json' } }); const t = await r.text(); return { status: r.status, t }; };
(async () => {
  for (const u of ['https://api.osf.io/v2/guids/mq7za/', 'https://api.osf.io/v2/preprints/mq7za/', 'https://api.osf.io/v2/nodes/mq7za/',
    'https://api.osf.io/v2/registrations/mq7za/', 'https://api.datacite.org/dois/10.17605/osf.io/mq7za', 'https://api.crossref.org/works/10.31219/osf.io/mq7za',
    'https://api.crossref.org/works/10.31219/osf.io/mq7za_v1']) {
    const { status, t } = await get(u);
    let summary = t.slice(0, 200);
    try {
      const j = JSON.parse(t);
      const a = (j.data && j.data.attributes) || (j.message) || {};
      summary = JSON.stringify({ type: j.data && j.data.type, title: a.title, description: (a.description || '').slice(0, 400), category: a.category, public: a.public,
        date_created: a.date_created, date_published: a.date_published, license: a.license_record || a.license, doi: a.doi || a.DOI, tags: a.tags, is_published: a.is_published,
        reviews_state: a.reviews_state, provider: j.data && j.data.relationships && j.data.relationships.provider && j.data.relationships.provider.links,
        creators: a.creators && a.creators.map((c) => c.name), rights: a.rightsList, licenseUrl: (a.license || []).map && (a.license || []).map((l) => l.URL),
        links: j.data && j.data.links && { html: j.data.links.html, doi: j.data.links.preprint_doi || j.data.links.doi } }).slice(0, 1500);
    } catch (e) { /* not JSON */ }
    console.log('=====', status, u); console.log(summary);
  }
  const node = await get('https://api.osf.io/v2/nodes/mq7za/contributors/?embed=users');
  try { console.log('contributors', JSON.parse(node.t).data.map((c) => c.embeds.users.data.attributes.full_name + ' ' + c.attributes.permission + ' bibliographic=' + c.attributes.bibliographic).join(' | ')); } catch (e) { console.log('contributors', node.status); }
  const files = await get('https://api.osf.io/v2/nodes/mq7za/files/osfstorage/');
  try { console.log('files', JSON.parse(files.t).data.map((f) => f.attributes.name + ' ' + f.attributes.size).join(' | ')); } catch (e) { console.log('files', files.status); }
  const lic = await get('https://api.osf.io/v2/nodes/mq7za/license/');
  try { console.log('license', JSON.parse(lic.t).data.attributes.name); } catch (e) { console.log('license', lic.status); }
})();
