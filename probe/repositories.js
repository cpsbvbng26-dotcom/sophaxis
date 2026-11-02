'use strict';
/* One-off probe, never merged (read only): the live OAI-PMH endpoint, verb by verb. */
const B = 'https://sophaxis.vercel.app/oai';
(async () => {
  for (const q of ['verb=Identify', 'verb=ListMetadataFormats', 'verb=ListSets', 'verb=ListIdentifiers&metadataPrefix=oai_dc&set=philosophy',
    'verb=GetRecord&identifier=oai:sophaxis.vercel.app:2026.0003&metadataPrefix=oai_dc', 'verb=ListRecords&metadataPrefix=oai_dc&from=2026-11-01&until=2026-11-02',
    'verb=ListRecords&metadataPrefix=oai_dc&from=2027-01-01', 'verb=Bogus']) {
    const r = await fetch(B + '?' + q);
    const t = await r.text();
    console.log('==== ' + q + ' -> ' + r.status + ' ' + r.headers.get('content-type') + ' ' + t.length + ' bytes');
    console.log(t.replace(/^[\s\S]*?<request/, '<request').slice(0, 600));
  }
  const p = await fetch(B, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'verb=Identify' });
  console.log('==== POST Identify -> ' + p.status + ' ' + (await p.text()).includes('<Identify>'));
  const n = (await (await fetch(B + '?verb=ListIdentifiers&metadataPrefix=oai_dc')).text()).split('<header>').length - 1;
  console.log('==== headers in ListIdentifiers: ' + n);
})();
