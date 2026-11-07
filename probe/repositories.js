'use strict';
/* One-off probe, never merged (read only): the exact titles of the author's Zenodo works at DataCite, and the files of each record at Zenodo. */
const UA = { 'User-Agent': 'Sophaxis probe (https://github.com/cpsbvbng26-dotcom/sophaxis)' };
const get = async (u) => { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(40000) }); return [r.status, await r.text()]; };
const DOIS = ['10.5281/zenodo.17173703', '10.5281/zenodo.22055709', '10.5281/zenodo.22057583', '10.5281/zenodo.22058254', '10.5281/zenodo.22058624', '10.5281/zenodo.22058777',
  '10.5281/zenodo.22058964', '10.5281/zenodo.22064241', '10.5281/zenodo.22335676', '10.5281/zenodo.22765695', '10.5281/zenodo.23114131'];
(async () => {
  for (const d of DOIS) {
    try {
      const [s, t] = await get('https://api.datacite.org/dois/' + d);
      const a = JSON.parse(t).data.attributes;
      const isVer = (a.relatedIdentifiers || []).filter((r) => r.relationType === 'IsVersionOf').map((r) => r.relatedIdentifier).join(',');
      const hasVer = (a.relatedIdentifiers || []).filter((r) => r.relationType === 'HasVersion').length;
      console.log('==== ' + d + ' [' + s + '] ' + a.types.resourceTypeGeneral + ' ' + a.publicationYear + ' isVersionOf=' + isVer + ' hasVersions=' + hasVer + ' lang=' + a.language);
      for (const x of a.titles) console.log('  TITLE' + (x.titleType ? '(' + x.titleType + ')' : '') + ': ' + x.title);
    } catch (e) { console.log('==== ' + d + ' DataCite error ' + e.message); }
    try {
      const id = d.split('zenodo.')[1];
      const [s, t] = await get('https://zenodo.org/api/records/' + id);
      const j = JSON.parse(t);
      console.log('  ZENODO [' + s + '] id=' + j.id + ' latest=' + ((j.links || {}).latest || '') + ' files=' + (j.files || []).map((f) => f.key + ' (' + f.size + ')').join(' | '));
    } catch (e) { console.log('  ZENODO error ' + e.message); }
  }
})();
