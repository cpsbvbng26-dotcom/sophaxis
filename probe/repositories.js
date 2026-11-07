'use strict';
/* One-off probe, never merged (read only): the live OAI-PMH answers in oai_openaire. */
const UA = { 'User-Agent': 'Sophaxis probe (https://github.com/cpsbvbng26-dotcom/sophaxis)' };
const get = async (u) => { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(30000) }); return [r.status, await r.text()]; };
(async () => {
  for (const q of ['verb=ListMetadataFormats', 'verb=GetRecord&identifier=oai:sophaxis.vercel.app:2026.0001&metadataPrefix=oai_openaire', 'verb=ListRecords&metadataPrefix=oai_openaire']) {
    const [s, t] = await get('https://sophaxis.vercel.app/oai?' + q);
    console.log('==== ' + q + ' [' + s + '] length=' + t.length);
    console.log(q.startsWith('verb=ListRecords') ? 'records=' + (t.match(/<record>/g) || []).length + ' errors=' + (t.match(/<error/g) || []).length : t.slice(0, 2200));
  }
})();
