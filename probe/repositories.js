'use strict';
/* One-off probe, never merged (read only): what the Wikidata and OpenAlex hits for "Sophaxis" are. */
const UA = { 'User-Agent': 'Sophaxis probe (https://github.com/cpsbvbng26-dotcom/sophaxis)' };
const get = async (u) => { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(40000) }); return [r.status, await r.text()]; };
(async () => {
  const [, w] = await get('https://www.wikidata.org/w/api.php?action=wbsearchentities&search=Sophaxis&language=en&format=json');
  for (const e of JSON.parse(w).search || []) {
    console.log('==== Wikidata ' + e.id + ' | ' + e.label + ' | ' + (e.description || ''));
    const [, d] = await get('https://www.wikidata.org/wiki/Special:EntityData/' + e.id + '.json');
    const ent = JSON.parse(d).entities[e.id];
    console.log('  created? lastrevid=' + ent.lastrevid + ' modified=' + ent.modified + ' claims=' + Object.keys(ent.claims || {}).join(','));
    const url = ((ent.claims.P856 || [])[0] || {}).mainsnak; console.log('  official website: ' + (url && url.datavalue ? url.datavalue.value : 'none'));
  }
  const [, o] = await get('https://api.openalex.org/works?search=sophaxis&per_page=10&select=id,title,doi,publication_date,primary_location');
  for (const x of JSON.parse(o).results) console.log('==== OpenAlex ' + x.id + ' | ' + x.title + ' | ' + x.doi + ' | ' + x.publication_date + ' | ' + ((x.primary_location || {}).landing_page_url || ''));
})();
