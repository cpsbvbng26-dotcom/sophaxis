'use strict';
/* One-off probe, never merged (read only): how DataCite stores the ORCID iD of Zenodo creators, which search finds them,
 * and which ids the ORCID record gives each work. */
const UA = 'Sophaxis probe (https://github.com/cpsbvbng26-dotcom/sophaxis)';
const ID = '0009-0000-1406-0547';
const get = async (u) => { const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/json' } }); return { status: r.status, json: r.ok ? await r.json() : null }; };
(async () => {
  for (const doi of ['10.5281/zenodo.22057583', '10.5281/zenodo.22058624', '10.6084/m9.figshare.34419198.v2', '10.6084/m9.figshare.34419198']) {
    const r = await get('https://api.datacite.org/dois/' + encodeURIComponent(doi));
    const a = r.json && r.json.data.attributes;
    console.log('==== ' + doi + ' ' + r.status);
    if (a) {
      console.log('creators ' + JSON.stringify(a.creators.map((c) => ({ n: c.name, ids: c.nameIdentifiers }))));
      console.log('version ' + a.version + ' rel ' + JSON.stringify(a.relatedIdentifiers) + ' subjects ' + JSON.stringify(a.subjects) + ' lang ' + a.language);
    }
  }
  const qs = {
    https: 'creators.nameIdentifiers.nameIdentifier:"https://orcid.org/' + ID + '"',
    bare: 'creators.nameIdentifiers.nameIdentifier:"' + ID + '"',
    wild: 'creators.nameIdentifiers.nameIdentifier:*' + ID,
    free: '"' + ID + '"',
  };
  for (const [k, q] of Object.entries(qs)) {
    const r = await get('https://api.datacite.org/dois?query=' + encodeURIComponent(q) + '&page[size]=100');
    console.log('query ' + k + ' -> ' + r.status + ' ' + (r.json ? r.json.data.length + ' ' + r.json.data.map((d) => d.id).join(' ') : ''));
  }
  const u = await get('https://api.datacite.org/dois?user-id=' + ID + '&page[size]=100');
  console.log('user-id -> ' + u.status + ' ' + (u.json ? u.json.data.length + ' ' + u.json.data.map((d) => d.id).join(' ') : ''));
  const w = await get('https://pub.orcid.org/v3.0/' + ID + '/works');
  console.log('ORCID works groups: ' + (w.json ? w.json.group.length : w.status));
  (w.json ? w.json.group : []).forEach((g) => {
    const s = g['work-summary'][0];
    console.log('- ' + (s.title && s.title.title.value).slice(0, 60) + ' | ' + ((g['external-ids'] || {})['external-id'] || []).map((x) => x['external-id-type'] + ':' + x['external-id-value'] + '(' + x['external-id-relationship'] + ')').join(' ') + ' | src ' + ((s.source || {})['source-name'] || {}).value + ' | summaries ' + g['work-summary'].length);
  });
})();
