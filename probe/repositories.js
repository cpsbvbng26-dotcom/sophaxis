'use strict';
/* One-off probe, never merged (read only): the English pages of NDL Search and the NDL Digital Collections. */
const e = encodeURIComponent;
const q = 'Manifesto of Imperial Selfhood';
const U = [
  'https://ndlsearch.ndl.go.jp/en/search?cs=bib&keyword=' + e(q),
  'https://ndlsearch.ndl.go.jp/en/search?cs=bib&keyword=' + e('Nemoto Takuya'),
  'https://ndlsearch.ndl.go.jp/en/',
  'https://dl.ndl.go.jp/en/search/searchResult?keyword=' + e(q),
  'https://dl.ndl.go.jp/search/searchResult?keyword=' + e(q) + '&lang=en',
  'https://dl.ndl.go.jp/en/',
];
(async () => {
  for (const u of U) {
    try {
      const r = await fetch(u, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Sophaxis probe)', 'Accept-Language': 'en' }, signal: AbortSignal.timeout(30000) });
      const t = await r.text();
      console.log('==== ' + u + ' -> ' + r.status + ' ' + (r.headers.get('location') || '') + ' | ' + ((/<title>([^<]*)/i.exec(t) || [])[1] || '').trim().slice(0, 90) + ' | lang=' + ((/<html[^>]*lang="([^"]*)"/i.exec(t) || [])[1] || ''));
    } catch (er) { console.log('==== ' + u + ' error ' + (er.cause ? er.cause.code || er.cause.message : er.message)); }
  }
})();
