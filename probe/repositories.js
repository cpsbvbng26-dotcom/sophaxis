'use strict';
/* One-off probe, never merged (read only): the English view of a researchmap page. */
const urls = ['https://researchmap.jp/takuyanemoto?lang=en', 'https://researchmap.jp/takuyanemoto?lang=ja'];
(async () => {
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Sophaxis probe)' } });
      const t = await r.text();
      const title = (/<title>([^<]*)<\/title>/i.exec(t) || [])[1];
      const lang = (/<html[^>]*lang="([^"]*)"/i.exec(t) || [])[1];
      console.log('==== ' + u + ' -> ' + r.status + ' ' + r.url + ' | lang=' + lang + ' | ' + (title || '').trim() + ' | ' + /Research Interests|Research Areas|Papers/.test(t) + '/' + /研究分野|研究キーワード|論文/.test(t));
    } catch (e) { console.log('==== ' + u + ' error ' + e.message); }
  }
})();
