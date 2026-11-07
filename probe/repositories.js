// MetaArXiv as OSF describes it: scope, moderation, licences, submission settings. Read only.
const UA = { 'User-Agent': 'sophaxis-probe (https://github.com/cpsbvbng26-dotcom/sophaxis)' };
async function get(url) {
  const r = await fetch(url, { headers: UA });
  console.log('\n### ' + url + '  [' + r.status + ']');
  return r.text();
}
const strip = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
(async () => {
  const p = JSON.parse(await get('https://api.osf.io/v2/providers/preprints/metaarxiv/'));
  const a = p.data.attributes;
  for (const k of Object.keys(a)) {
    const v = a[k];
    console.log('- ' + k + ': ' + (typeof v === 'string' ? strip(v) : JSON.stringify(v)).slice(0, 3000));
  }
  console.log('relationships:', Object.keys(p.data.relationships || {}).join(', '));
  const lic = JSON.parse(await get('https://api.osf.io/v2/providers/preprints/metaarxiv/licenses/?page[size]=50'));
  for (const l of lic.data || []) console.log('  licence:', l.attributes.name);
  const tax = JSON.parse(await get('https://api.osf.io/v2/providers/preprints/metaarxiv/subjects/highlighted/?page[size]=50'));
  for (const s of tax.data || []) console.log('  subject:', s.attributes.text);
  const tax2 = JSON.parse(await get('https://api.osf.io/v2/providers/preprints/metaarxiv/subjects/?page[size]=100'));
  console.log('  top-level subjects:', (tax2.data || []).map((s) => s.attributes.text).join(' | '));
  // Does it hold software / infrastructure papers? Search titles.
  for (const q of ['repository', 'infrastructure', 'software', 'preprint server', 'philosophy']) {
    const r = JSON.parse(await get('https://api.osf.io/v2/preprints/?filter[provider]=metaarxiv&filter[title][icontains]=' + encodeURIComponent(q) + '&page[size]=5'));
    console.log('  [' + q + '] total ' + ((r.meta || r.links.meta || {}).total) + ': ' + (r.data || []).map((x) => x.attributes.title).join(' || '));
  }
  // MetaROR: the review layer on MetaArXiv preprints.
  const m = await get('https://metaror.org/');
  console.log(strip(m).slice(0, 2500));
})();
