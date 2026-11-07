'use strict';
/* One-off probe, never merged (read only): further places that may list or hold Sophaxis without an application. Plain requests to public APIs only. */
const UA = { 'User-Agent': 'Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)', Accept: 'application/json, text/html;q=0.9' };
const get = async (u, opt = {}) => { const r = await fetch(u, Object.assign({ headers: UA, signal: AbortSignal.timeout(30000) }, opt)); return [r.status, await r.text()]; };
const line = (n, s, extra) => console.log('==== ' + n + ' -> ' + s + ' | ' + extra);
(async () => {
  // Common Crawl: the latest crawls, and whether they hold pages of the site.
  try {
    const [s, t] = await get('https://index.commoncrawl.org/collinfo.json');
    const cols = s === 200 ? JSON.parse(t).slice(0, 3) : [];
    line('Common Crawl collections', s, cols.map((c) => c.id).join(','));
    for (const c of cols) {
      const [s2, t2] = await get(c['cdx-api'] + '?url=sophaxis.vercel.app/*&output=json&limit=50');
      const n = s2 === 200 ? t2.trim().split('\n').filter(Boolean).length : 0;
      line('Common Crawl ' + c.id, s2, 'pages=' + n + (n ? ' e.g. ' + JSON.parse(t2.trim().split('\n')[0]).url : ''));
    }
  } catch (e) { line('Common Crawl', 'error', e.message); }
  // Semantic Scholar: papers whose landing page is on the site.
  try { const [s, t] = await get('https://api.semanticscholar.org/graph/v1/paper/search?query=sophaxis&fields=title,url,externalIds'); line('Semantic Scholar search', s, t.slice(0, 200)); } catch (e) { line('Semantic Scholar', 'error', e.message); }
  // Internet Archive Scholar / fatcat.
  try { const [s, t] = await get('https://scholar.archive.org/search?q=sophaxis'); line('IA Scholar', s, 'sophaxis ' + (t.match(/sophaxis/gi) || []).length + ' | ' + ((/(\d[\d,]*)\s+results?/i.exec(t) || ['no count'])[0])); } catch (e) { line('IA Scholar', 'error', e.message); }
  try { const [s, t] = await get('https://api.fatcat.wiki/v0/container/lookup?issnl=0000-0000'); line('fatcat api reachable', s, t.slice(0, 80)); } catch (e) { line('fatcat', 'error', e.message); }
  // re3data (data repositories; Sophaxis is not one, checked for completeness).
  try { const [s, t] = await get('https://www.re3data.org/api/beta/repositories?query=sophaxis'); line('re3data', s, 'sophaxis ' + (t.match(/sophaxis/gi) || []).length); } catch (e) { line('re3data', 'error', e.message); }
  // DOAPR data in its public repository: does any file name Sophaxis?
  try {
    const [s, t] = await get('https://api.github.com/repos/antleaf/doapr/git/trees/HEAD?recursive=1', { headers: Object.assign({}, UA, { Accept: 'application/vnd.github+json' }) });
    const tree = s === 200 ? JSON.parse(t).tree.map((x) => x.path) : [];
    line('DOAPR repo tree', s, 'files=' + tree.length + ' sophaxis-named=' + tree.filter((p) => /sophaxis/i.test(p)).join(','));
  } catch (e) { line('DOAPR repo', 'error', e.message); }
  // Scilit and Lens: plain pages, recorded as they answer.
  for (const [n, u] of [['Scilit', 'https://www.scilit.com/publications?q=sophaxis'], ['Lens', 'https://www.lens.org/lens/search/scholar/list?q=sophaxis'], ['Dimensions', 'https://app.dimensions.ai/discover/publication?search_text=sophaxis']]) {
    try { const [s, t] = await get(u); line(n, s, ((/<title>([^<]*)<\/title>/i.exec(t) || [])[1] || '').trim().slice(0, 60) + ' | sophaxis ' + (t.match(/sophaxis/gi) || []).length); } catch (e) { line(n, 'error', e.message); }
  }
})();
