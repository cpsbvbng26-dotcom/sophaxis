'use strict';
/* One-off probe, never merged (read only): the DataCite record of a DOI the author gave. */
const DOIS = (process.env.DOIS || '10.5281/zenodo.24033961').split(' ');
(async () => {
  for (const d of DOIS) {
    try {
      const r = await fetch('https://api.datacite.org/dois/' + encodeURIComponent(d), { headers: { 'User-Agent': 'Sophaxis probe (https://github.com/cpsbvbng26-dotcom/sophaxis)' }, signal: AbortSignal.timeout(40000) });
      const a = (await r.json()).data.attributes;
      console.log('==== ' + d + ' -> ' + r.status);
      console.log('  title: ' + (a.titles || []).map((t) => t.title).join(' | '));
      console.log('  version: ' + a.version + ' | type: ' + (a.types || {}).resourceTypeGeneral + ' | state: ' + a.state);
      console.log('  creators: ' + (a.creators || []).map((c) => c.name + ' ' + ((c.nameIdentifiers || [])[0] || {}).nameIdentifier).join('; '));
      console.log('  rights: ' + (a.rightsList || []).map((x) => x.rightsIdentifier || x.rights).join(', '));
      (a.relatedIdentifiers || []).forEach((x) => console.log('  related: ' + x.relationType + ' ' + x.relatedIdentifier));
    } catch (e) { console.log('==== ' + d + ' error ' + e.message); }
  }
})();
