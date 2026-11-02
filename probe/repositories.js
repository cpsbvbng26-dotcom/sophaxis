'use strict';
/* One-off probe, never merged (read only): how a preprint points to its published version in DataCite and Crossref. */
const UA = 'Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis; mailto via ORCID record)';
const get = async (u, accept) => { const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: accept || 'application/json' } }); return { status: r.status, t: await r.text() }; };
(async () => {
  /* 1. DataCite relation types (schema 4) */
  const x = await get('https://schema.datacite.org/meta/kernel-4/include/datacite-relationType-v4.xsd', 'application/xml');
  console.log('datacite relationType', x.status, [...x.t.matchAll(/enumeration value="([^"]+)"/g)].map((m) => m[1]).join(','));
  /* 2. Crossref: a preprint with is-preprint-of, and the reverse filter */
  const f1 = await get('https://api.crossref.org/works?filter=relation.type:is-preprint-of&rows=2&select=DOI,type,relation,institution,publisher');
  try { const j = JSON.parse(f1.t); console.log('crossref is-preprint-of', f1.status, JSON.stringify(j.message.items.map((i) => ({ DOI: i.DOI, type: i.type, publisher: i.publisher, rel: i.relation }))).slice(0, 1200)); } catch (e) { console.log('crossref f1', f1.status, f1.t.slice(0, 300)); }
  const f2 = await get('https://api.crossref.org/works?filter=relation.type:has-preprint&rows=2&select=DOI,type,relation,container-title,published');
  try { const j = JSON.parse(f2.t); console.log('crossref has-preprint', f2.status, JSON.stringify(j.message.items.map((i) => ({ DOI: i.DOI, type: i.type, ct: i['container-title'], pub: i.published, rel: i.relation }))).slice(0, 1200)); } catch (e) { console.log('crossref f2', f2.status, f2.t.slice(0, 300)); }
  /* 3. Reverse lookup by object DOI: does relation.object work as a filter? Use an object taken from f2 */
  try {
    const j = JSON.parse(f2.t); const it = j.message.items[0]; const obj = ((it.relation || {})['has-preprint'] || [])[0];
    if (obj) {
      const f3 = await get('https://api.crossref.org/works?filter=relation.object:' + encodeURIComponent(obj.id) + '&rows=3&select=DOI,type,relation');
      console.log('crossref relation.object', obj.id, f3.status, f3.t.slice(0, 600));
    }
  } catch (e) { console.log('f3 error', e.message); }
  /* 4. DataCite: records with IsPreprintOf / IsPreviousVersionOf, as examples of the JSON shape */
  for (const rt of ['IsPreprintOf', 'HasPreprint', 'IsPreviousVersionOf']) {
    const d = await get('https://api.datacite.org/dois?query=relatedIdentifiers.relationType:' + rt + '&page[size]=1');
    try { const j = JSON.parse(d.t); const a = j.data[0] && j.data[0].attributes; console.log('datacite', rt, d.status, j.meta && j.meta.total, a ? JSON.stringify({ doi: a.doi, type: a.types && a.types.resourceTypeGeneral, rel: (a.relatedIdentifiers || []).filter((r) => r.relationType === rt) }).slice(0, 500) : ''); } catch (e) { console.log('datacite', rt, d.status, d.t.slice(0, 200)); }
  }
  /* 5. The listed works themselves: any relation today? */
  for (const doi of ['10.6084/m9.figshare.34419198.v2', '10.2139/ssrn.7537983']) {
    const a = await get('https://api.datacite.org/dois/' + doi);
    const c = await get('https://api.crossref.org/works/' + doi);
    let s = '';
    try { s += ' datacite rel=' + JSON.stringify(JSON.parse(a.t).data.attributes.relatedIdentifiers); } catch (e) { s += ' datacite ' + a.status; }
    try { s += ' crossref rel=' + JSON.stringify(JSON.parse(c.t).message.relation); } catch (e) { s += ' crossref ' + c.status; }
    console.log('listed', doi, s.slice(0, 800));
  }
})();
