'use strict';
/* One-off probe, never merged (read only): whether Sophaxis has been listed anywhere new. Plain requests only. */
const UA = { 'User-Agent': 'Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)', Accept: 'application/json, text/html;q=0.9' };
const T = [
  ['ROAR record', 'https://roar.eprints.org/27422/'],
  ['DOAPR issue', 'https://api.github.com/repos/antleaf/doapr/issues/105'],
  ['DOAPR record', 'https://doapr.coar-repositories.org/repositories/sophaxis/'],
  ['PhilPapers archives', 'https://philpapers.org/archives/list.html'],
  ['OAD wiki', 'https://oad.simmons.edu/oadwiki/Disciplinary_repositories'],
  ['OpenAlex sources', 'https://api.openalex.org/sources?search=sophaxis'],
  ['OpenAlex works by ORCID', 'https://api.openalex.org/works?filter=author.orcid:0009-0000-1406-0547&per-page=50&select=id,locations'],
  ['Wikidata', 'https://www.wikidata.org/w/api.php?action=wbsearchentities&search=Sophaxis&language=en&format=json'],
  ['DataCite', 'https://api.datacite.org/dois?query=sophaxis&page[size]=10'],
  ['Wayback captures', 'https://web.archive.org/cdx/search/cdx?url=sophaxis.vercel.app*&output=json&fl=original&collapse=urlkey&limit=500'],
  ['SWH sophaxis', 'https://archive.softwareheritage.org/api/1/origin/https://github.com/cpsbvbng26-dotcom/sophaxis/visits/?per_page=1'],
  ['SWH deposit-check', 'https://archive.softwareheritage.org/api/1/origin/https://github.com/cpsbvbng26-dotcom/deposit-check/visits/?per_page=1'],
  ['SWH profile', 'https://archive.softwareheritage.org/api/1/origin/https://github.com/cpsbvbng26-dotcom/cpsbvbng26-dotcom/visits/?per_page=1'],
  ['ORCID websites', 'https://pub.orcid.org/v3.0/0009-0000-1406-0547/researcher-urls'],
  ['ORCID works', 'https://pub.orcid.org/v3.0/0009-0000-1406-0547/works'],
  ['HAL by ORCID', 'https://api.archives-ouvertes.fr/search/?q=authORCIDIdExt_id:0009-0000-1406-0547&fl=halId_s,title_s,submittedDate_s&wt=json'],
  ['BASE', 'https://www.base-search.net/Search/Results?lookfor=sophaxis'],
  ['CORE', 'https://core.ac.uk/search?q=sophaxis'],
];
(async () => {
  for (const [name, u] of T) {
    try {
      const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(25000) });
      const t = await r.text();
      const title = ((/<title>([^<]*)<\/title>/i.exec(t) || [])[1] || '').trim().replace(/\s+/g, ' ');
      let x = '';
      try {
        const j = JSON.parse(t);
        if (name === 'DOAPR issue') x = ' state=' + j.state + ' comments=' + j.comments + ' labels=' + (j.labels || []).map((l) => l.name).join(',') + ' updated=' + j.updated_at;
        if (j.meta && 'count' in j.meta) x += ' count=' + j.meta.count;
        if (j.data && Array.isArray(j.data)) x += ' data=' + j.data.map((d) => d.id).join(',');
        if (j.search) x = ' wikidata=' + j.search.map((s) => s.id + ':' + s.label).join(',');
        if (Array.isArray(j) && name.startsWith('Wayback')) x = ' captures=' + Math.max(0, j.length - 1);
        if (name === 'OpenAlex works by ORCID') x += ' with sophaxis location=' + j.results.filter((w) => JSON.stringify(w.locations).includes('sophaxis')).length + '/' + j.results.length;
        if (name.startsWith('SWH') && Array.isArray(j)) x = ' visits=' + j.length + ' ' + (j[0] ? j[0].date + ' ' + j[0].status : '');
        if (j['researcher-url']) x = ' urls=' + j['researcher-url'].map((u2) => u2.url.value).join(' , ');
        if (j.group) x = ' works=' + j.group.length + ' titles=' + j.group.map((g) => g['work-summary'][0].title.title.value.slice(0, 40)).join(' | ');
        if (j.response) x = ' hal=' + j.response.numFound + ' ' + (j.response.docs || []).map((d) => d.halId_s + ' ' + d.submittedDate_s).join(' , ');
      } catch (e) { /* not JSON */ }
      console.log('==== ' + name + ' -> ' + r.status + ' | ' + title.slice(0, 60) + ' | sophaxis ' + (t.match(/sophaxis/gi) || []).length + x);
    } catch (e) { console.log('==== ' + name + ' error ' + (e.cause ? e.cause.code || e.cause.message : e.message)); }
  }
})();
