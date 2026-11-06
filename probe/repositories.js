'use strict';
/* One-off probe, never merged (read only): the operator's records in HAL now, and docid 5768701. */
const UA = { headers: { 'User-Agent': 'Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)' } };
(async () => {
  for (const u of ['https://api.archives-ouvertes.fr/search/?q=authIdHal_s:nemoto-takuya&fl=docid,halId_s,docType_s,submittedDate_s,title_s&rows=50&wt=json',
    'https://api.archives-ouvertes.fr/search/?q=docid:5768701&fl=docid,halId_s&wt=json',
    'https://hal.science/view/index/docid/5768701', 'https://hal.science/hal-05768701', 'https://hal.science/hal-05758942', 'https://hal.science/hal-05758968', 'https://hal.science/hal-05759064', 'https://hal.science/hal-05759080']) {
    try { const r = await fetch(u, UA); const t = await r.text(); const title = (/<title>([^<]*)<\/title>/i.exec(t) || [])[1]; console.log('==== ' + u + ' -> ' + r.status + ' ' + (title ? title.trim().slice(0, 90) : t.replace(/\s+/g, ' ').slice(0, 900))); }
    catch (e) { console.log('==== ' + u + ' error ' + e.message); }
  }
})();
