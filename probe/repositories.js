// Which DOI registration agency does MetaArXiv use? Read only.
const UA = { 'User-Agent': 'sophaxis-probe (https://github.com/cpsbvbng26-dotcom/sophaxis)' };
async function get(url) {
  const r = await fetch(url, { headers: UA });
  const t = await r.text();
  console.log('\n### ' + url + '  [' + r.status + ']');
  return t;
}
(async () => {
  // 1. MetaArXiv's own preprints, from the OSF API: the DOI each one carries.
  const t = await get('https://api.osf.io/v2/preprints/?filter[provider]=metaarxiv&page[size]=5');
  let dois = [];
  try {
    const j = JSON.parse(t);
    for (const p of j.data || []) {
      const links = p.links || {};
      const d = (links.preprint_doi || '').replace(/^https?:\/\/doi\.org\//, '');
      console.log(p.id, '|', (p.attributes || {}).title, '| preprint_doi:', links.preprint_doi, '| date_published:', (p.attributes || {}).date_published);
      if (d) dois.push(d);
    }
  } catch (e) { console.log(t.slice(0, 1500)); }
  // 2. The registration agency of each DOI, from doi.org.
  for (const d of dois.slice(0, 3)) console.log(await get('https://doi.org/ra/' + d));
  // 3. The agency of the prefix, and the Crossref member that owns it.
  const prefixes = [...new Set(dois.map((d) => d.split('/')[0]))];
  for (const p of prefixes) {
    console.log(await get('https://doi.org/ra/' + p));
    console.log((await get('https://api.crossref.org/prefixes/' + p)).slice(0, 800));
  }
  // 4. One record as Crossref holds it.
  if (dois[0]) {
    const w = await get('https://api.crossref.org/works/' + dois[0]);
    try { const m = JSON.parse(w).message; console.log({ type: m.type, subtype: m.subtype, publisher: m.publisher, institution: m.institution, member: m.member, prefix: m.prefix, 'group-title': m['group-title'] }); }
    catch (e) { console.log(w.slice(0, 500)); }
  }
})();
