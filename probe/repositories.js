'use strict';
/* One-off probe, never merged (read only): the HAL deposits and the FAIRsharing record that were deleted or dropped. */
const UA = { 'User-Agent': 'Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)', Accept: 'application/json, text/html;q=0.9' };
const ids = ['hal-05758942', 'hal-05758968', 'hal-05759064', 'hal-05759080', 'hal-05759279', 'hal-05759325', 'hal-05759296', 'hal-05759717', 'hal-05759721'];
(async () => {
  const q = async (n, u) => { try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(30000) }); const t = await r.text(); return [r.status, t]; } catch (e) { return ['error ' + e.message, '']; } };
  let [s, t] = await q('HAL idhal', 'https://api.archives-ouvertes.fr/search/?q=authIdHal_s:nemoto-takuya&fl=halId_s,title_s,submittedDate_s&rows=50&wt=json');
  console.log('==== HAL by IdHAL -> ' + s + ' | ' + (s === 200 ? JSON.parse(t).response.numFound + ' ' + JSON.parse(t).response.docs.map((d) => d.halId_s + ' ' + d.submittedDate_s + ' ' + d.title_s[0].slice(0, 40)).join(' ; ') : ''));
  [s, t] = await q('HAL orcid', 'https://api.archives-ouvertes.fr/search/?q=authORCIDIdExt_id:0009-0000-1406-0547&fl=halId_s&wt=json');
  console.log('==== HAL by ORCID -> ' + s + ' | ' + (s === 200 ? JSON.parse(t).response.numFound : ''));
  [s, t] = await q('HAL name', 'https://api.archives-ouvertes.fr/search/?q=authFullName_t:%22Takuya%20Nemoto%22&fl=halId_s,submittedDate_s&wt=json');
  console.log('==== HAL by name -> ' + s + ' | ' + (s === 200 ? JSON.parse(t).response.numFound + ' ' + JSON.parse(t).response.docs.map((d) => d.halId_s).join(',') : ''));
  for (const id of ids) { [s, t] = await q(id, 'https://hal.science/' + id); console.log('==== ' + id + ' -> ' + s + ' | ' + (((/<title>([^<]*)<\/title>/i.exec(t) || [])[1]) || '').trim().replace(/\s+/g, ' ').slice(0, 70)); }
  [s, t] = await q('CV', 'https://cv.hal.science/nemoto-takuya');
  console.log('==== CV HAL -> ' + s + ' | ' + (((/<title>([^<]*)<\/title>/i.exec(t) || [])[1]) || '').trim() + ' | docs listed: ' + (t.match(/hal-0\d{7}/g) || []).filter((v, i, a) => a.indexOf(v) === i).join(','));
  [s, t] = await q('FAIRsharing', 'https://fairsharing.org/9430');
  console.log('==== FAIRsharing page -> ' + s + ' | sophaxis ' + (t.match(/sophaxis/gi) || []).length);
  [s, t] = await q('FAIRsharing api', 'https://api.fairsharing.org/fairsharing_records/9430');
  console.log('==== FAIRsharing api -> ' + s + ' | ' + t.replace(/\s+/g, ' ').slice(0, 200));
})();
