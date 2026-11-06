'use strict';
/* One-off probe, never merged (read only): a HAL record, through its page and its public API. */
const UA = { 'User-Agent': 'Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)' };
(async () => {
  for (const u of ['https://hal.science/view/index/docid/5768701', 'https://api.archives-ouvertes.fr/search/?q=docid:5768701&fl=halId_s,title_s,authFullName_s,authIdHal_s,authORCIDIdExt_id,docType_s,submittedDate_s,producedDate_s,uri_s,doiId_s,language_s,abstract_s,keyword_s,files_s,version_i,licence_s&wt=json']) {
    try {
      const r = await fetch(u, UA);
      const t = await r.text();
      const title = (/<title>([^<]*)<\/title>/i.exec(t) || [])[1];
      console.log('==== ' + u + ' -> ' + r.status + ' ' + r.url + ' | ' + (title || '').trim());
      if (!title) console.log(t.slice(0, 3000));
      else { [...t.matchAll(/(twitter|x\.com|orcid\.org\/[0-9X-]+|idhal|\/cv\/[a-z0-9-]+)[^"' <]{0,60}/gi)].map((m) => m[0]).filter((v, i, a) => a.indexOf(v) === i).slice(0, 20).forEach((l) => console.log('  ' + l)); }
    } catch (e) { console.log('==== ' + u + ' error ' + e.message); }
  }
})();
