'use strict';
/* One-off probe, never merged (read only): the Japanese MicroWiki — its namespaces, whether accounts are shared, and whether the title is free. */
const UA = { 'User-Agent': 'Sophaxis probe (https://github.com/cpsbvbng26-dotcom/sophaxis)' };
const get = async (u) => { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(30000) }); return [r.status, await r.text()]; };
(async () => {
  for (const api of ['https://jp.micronations.wiki/w/api.php', 'https://jp.micronations.wiki/api.php']) {
    const [s, t] = await get(api + '?action=query&meta=siteinfo&siprop=general|namespaces|extensions&format=json');
    console.log('==== ' + api + ' [' + s + ']');
    try {
      const q = JSON.parse(t).query;
      console.log('  sitename=' + q.general.sitename + ' lang=' + q.general.lang + ' server=' + q.general.server + ' articlepath=' + q.general.articlepath);
      console.log('  namespaces: ' + Object.values(q.namespaces).map((n) => n.id + '=' + (n['*'] || '(main)')).join(' | '));
      console.log('  CentralAuth: ' + q.extensions.some((e) => /CentralAuth/i.test(e.name)) + ' AbuseFilter: ' + q.extensions.some((e) => /AbuseFilter/i.test(e.name)));
      for (const title of ['ヌスクァマ', '無何有騎士王国ヌスクァマ', 'Nusquama']) {
        const [s2, t2] = await get(api + '?action=query&titles=' + encodeURIComponent(title) + '&format=json');
        const p = Object.values(JSON.parse(t2).query.pages)[0];
        console.log('  title ' + title + ': ' + ('missing' in p ? 'free' : 'EXISTS'));
      }
      break;
    } catch (e) { console.log('  ' + t.slice(0, 200)); }
  }
})();
