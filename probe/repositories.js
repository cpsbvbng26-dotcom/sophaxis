'use strict';
/* One-off probe, never merged (read only): the shape of the ORCID personal-details and researcher-urls sections. Prints keys and counts only. */
const UA = { 'User-Agent': 'Sophaxis probe (https://github.com/cpsbvbng26-dotcom/sophaxis)', Accept: 'application/json' };
(async () => {
  for (const s of ['personal-details', 'researcher-urls', 'person']) {
    const r = await fetch('https://pub.orcid.org/v3.0/0009-0000-1406-0547/' + s, { headers: UA, signal: AbortSignal.timeout(30000) });
    const j = await r.json().catch(() => null);
    console.log('==== ' + s + ' [' + r.status + '] keys: ' + (j ? Object.keys(j).join(', ') : 'not json'));
    if (s === 'personal-details' && j) console.log('  name keys: ' + Object.keys(j.name || {}).join(', ') + '; has given-names value: ' + !!(j.name && j.name['given-names'] && j.name['given-names'].value));
    if (s === 'researcher-urls' && j) console.log('  researcher-url entries: ' + (j['researcher-url'] || []).length + '; first has url.value: ' + !!(((j['researcher-url'] || [])[0] || {}).url || {}).value);
    if (s === 'person' && j) console.log('  person has emails section: ' + ('emails' in j) + ', addresses section: ' + ('addresses' in j));
  }
})();
