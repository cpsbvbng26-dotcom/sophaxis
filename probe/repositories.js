'use strict';
/* One-off probe, never merged (read only): the operator's records in HAL, through the public API. */
const UA = { headers: { 'User-Agent': 'Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)' } };
const F = 'fl=docid,halId_s,title_s,authFullName_s,authIdHal_s,authORCIDIdExt_id,submittedDate_s,uri_s,docType_s&wt=json';
const urls = [
  'https://api.archives-ouvertes.fr/search/?q=authFullName_t:%22Takuya%20Nemoto%22&' + F,
  'https://api.archives-ouvertes.fr/search/?q=halId_s:hal-05759080&' + F,
  'https://api.archives-ouvertes.fr/search/?q=authORCIDIdExt_id:0009-0000-1406-0547&' + F,
];
(async () => {
  for (const u of urls) {
    try { const r = await fetch(u, UA); console.log('==== ' + u.slice(0, 110) + ' -> ' + r.status + '\n' + (await r.text()).slice(0, 2500)); }
    catch (e) { console.log('==== ' + u + ' error ' + e.message); }
  }
})();
