'use strict';
/* One-off probe, never merged (read only): whether the National Diet Library holds three Zenodo works. */
const Q = [
  ['celibate title', 'The Nobility and Exemplarity of the Celibate Individual'],
  ['celibate doi', '10.5281/zenodo.22058254'],
  ['imperial title', 'Manifesto of Imperial Selfhood'],
  ['imperial doi', '10.5281/zenodo.22057583'],
  ['otani title', 'A Naval Gazette Entry for Lieutenant Otani Tsune'],
  ['otani doi', '10.5281/zenodo.22055709'],
  ['otani kanji', '大谷恒 海軍'],
  ['author ja', '根本卓哉'],
  ['author en', 'Takuya Nemoto'],
];
const e = encodeURIComponent;
const get = async (u) => {
  const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Sophaxis probe)' }, signal: AbortSignal.timeout(30000) });
  return [r.status, r.url, await r.text()];
};
(async () => {
  for (const [n, q] of Q) {
    for (const [k, u] of [['opensearch any', 'https://ndlsearch.ndl.go.jp/api/opensearch?cnt=10&any=' + e(q)], ['opensearch title', 'https://ndlsearch.ndl.go.jp/api/opensearch?cnt=10&title=' + e(q)]]) {
      try {
        const [s, url, t] = await get(u);
        const total = (/<openSearch:totalResults>(\d+)/.exec(t) || [])[1];
        const titles = [...t.matchAll(/<item>[\s\S]*?<title>([^<]*)<\/title>[\s\S]*?<link>([^<]*)<\/link>/g)].slice(0, 5).map((m) => m[1] + ' <' + m[2] + '>');
        console.log('==== ' + n + ' | ' + k + ' -> ' + s + ' total=' + total);
        titles.forEach((x) => console.log('  - ' + x.slice(0, 200)));
      } catch (er) { console.log('==== ' + n + ' | ' + k + ' error ' + (er.cause ? er.cause.code || er.cause.message : er.message)); }
    }
  }
  for (const u of ['https://ndlsearch.ndl.go.jp/search?cs=bib&keyword=' + e('根本卓哉'), 'https://dl.ndl.go.jp/search/searchResult?keyword=' + e('根本卓哉'), 'https://warp.ndl.go.jp/search/?keyword=' + e('sophaxis')]) {
    try { const [s, url, t] = await get(u); console.log('==== page ' + u + ' -> ' + s + ' ' + url.slice(0, 90) + ' | ' + ((/<title>([^<]*)/i.exec(t) || [])[1] || '').trim().slice(0, 80)); }
    catch (er) { console.log('==== page ' + u + ' error ' + (er.cause ? er.cause.code || er.cause.message : er.message)); }
  }
})();
