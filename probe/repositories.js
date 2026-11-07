'use strict';
/* One-off probe, never merged (read only): which repositories already have a Zenodo archive, by the GitHub address in DataCite. */
const repos = ['autonomy-and-self-cultivation', 'cpsbvbng26-dotcom', 'naval-gazette-notes', 'self-correction', 'sophaxis', 'trinity-infinity', 'trinity-operator'];
(async () => {
  for (const r of repos) {
    try {
      const q = encodeURIComponent('relatedIdentifiers.relatedIdentifier:*github.com\\/cpsbvbng26-dotcom\\/' + r.replace(/-/g, '\\-') + '*');
      const res = await fetch('https://api.datacite.org/dois?query=' + q + '&page[size]=10', { headers: { 'User-Agent': 'Sophaxis probe (https://github.com/cpsbvbng26-dotcom/sophaxis)' }, signal: AbortSignal.timeout(40000) });
      const j = await res.json();
      console.log('==== ' + r + ' -> ' + res.status + ' ' + (j.data || []).length + ' ' + (j.data || []).map((d) => d.id + ' [' + (d.attributes.version || '') + '] ' + (((d.attributes.titles || [])[0] || {}).title || '').slice(0, 40)).join(' ; '));
    } catch (e) { console.log('==== ' + r + ' error ' + e.message); }
  }
})();
