'use strict';
/* One-off probe, never merged (read only): where Sophaxis is listed or indexed. Plain requests to public pages and APIs only. */
const UA = { 'User-Agent': 'Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)', Accept: 'application/json, text/html;q=0.9' };
const T = [
  ['ROAR record', 'https://roar.eprints.org/27422/'],
  ['DOAPR record', 'https://doapr.coar-repositories.org/repositories/sophaxis/'],
  ['PhilPapers archives', 'https://philpapers.org/archives/list.html'],
  ['OAD wiki', 'https://oad.simmons.edu/oadwiki/Disciplinary_repositories'],
  ['OpenDOAR search', 'https://v2.sherpa.ac.uk/cgi/search/repository/basic?screen=Search&repository_name=sophaxis'],
  ['OpenAlex sources', 'https://api.openalex.org/sources?search=sophaxis'],
  ['OpenAlex works at sophaxis', 'https://api.openalex.org/works?filter=locations.landing_page_url.search:sophaxis&per-page=5'],
  ['OpenAlex works by ORCID', 'https://api.openalex.org/works?filter=author.orcid:0009-0000-1406-0547&per-page=50&select=id,display_name,locations'],
  ['Wikidata', 'https://www.wikidata.org/w/api.php?action=wbsearchentities&search=Sophaxis&language=en&format=json'],
  ['DataCite', 'https://api.datacite.org/dois?query=sophaxis&page[size]=10'],
  ['Crossref', 'https://api.crossref.org/works?query=sophaxis&rows=5&select=DOI,title'],
  ['OpenAIRE', 'https://api.openaire.eu/search/datasources?name=sophaxis&format=json'],
  ['OpenAIRE graph', 'https://api.openaire.eu/graph/v1/dataSources?search=sophaxis'],
  ['BASE search page', 'https://www.base-search.net/Search/Results?lookfor=sophaxis'],
  ['CORE search page', 'https://core.ac.uk/search?q=sophaxis'],
  ['Wayback captures', 'https://web.archive.org/cdx/search/cdx?url=sophaxis.vercel.app*&output=json&fl=original&collapse=urlkey&limit=500'],
  ['Software Heritage', 'https://archive.softwareheritage.org/api/1/origin/https://github.com/cpsbvbng26-dotcom/sophaxis/visits/?per_page=1'],
  ['ORCID works', 'https://pub.orcid.org/v3.0/0009-0000-1406-0547/works'],
  ['ORCID websites', 'https://pub.orcid.org/v3.0/0009-0000-1406-0547/researcher-urls'],
  ['Semantic Scholar', 'https://api.semanticscholar.org/graph/v1/paper/search?query=sophaxis&fields=title,url'],
  ['Celestial', 'https://celestial.eprints.org/'],
];
(async () => {
  for (const [name, u] of T) {
    try {
      const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(25000) });
      const t = await r.text();
      const title = (/<title>([^<]*)<\/title>/i.exec(t) || [])[1];
      const hits = (t.match(/sophaxis/gi) || []).length;
      let extra = '';
      try {
        const j = JSON.parse(t);
        if (j.meta && 'count' in j.meta) extra = ' count=' + j.meta.count;
        if (j.data && Array.isArray(j.data)) extra += ' data=' + j.data.length;
        if (j.search) extra = ' wikidata=' + j.search.map((x) => x.id + ':' + x.label).join(',');
        if (j.message && j.message['total-results'] !== undefined) extra = ' crossref=' + j.message['total-results'];
        if (j.group) extra = ' orcid groups=' + j.group.length;
        if (j['researcher-url']) extra = ' urls=' + j['researcher-url'].map((x) => x.url.value).join(',');
        if (Array.isArray(j) && name.startsWith('Wayback')) extra = ' captures=' + Math.max(0, j.length - 1);
        if (name === 'OpenAlex works by ORCID') extra += ' with sophaxis location=' + j.results.filter((w) => JSON.stringify(w.locations).includes('sophaxis')).length + '/' + j.results.length;
        if (name === 'OpenAlex sources') extra += ' ' + (j.results || []).map((s) => s.display_name).join(',');
        if (name === 'Semantic Scholar') extra = ' total=' + j.total;
      } catch (e) { /* not JSON */ }
      console.log('==== ' + name + ' -> ' + r.status + ' | ' + (title || '').trim().replace(/\s+/g, ' ').slice(0, 70) + ' | sophaxis ' + hits + extra);
    } catch (e) { console.log('==== ' + name + ' error ' + (e.cause ? e.cause.code || e.cause.message : e.message)); }
  }
})();
