'use strict';
/* One-off probe, never merged (read only): the texts the policies of Sophaxis and Nusquama cite, from their official sources. */
const UA = { 'User-Agent': 'probe (https://github.com/cpsbvbng26-dotcom/sophaxis)', 'Accept-Language': 'en,ja;q=0.8' };
const get = async (u) => { try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(90000), redirect: 'follow' }); return [r.status, await r.text(), r.url]; } catch (e) { return ['ERR', String(e), u]; } };
const plain = (x) => x.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"').replace(/&#\d+;/g, ' ').replace(/\s+/g, ' ').trim();
const at = (t, re, n) => { const m = new RegExp(re, 'i').exec(t); return m ? t.slice(m.index, m.index + n) : '(not found: ' + re + ')'; };
const J = [
  ['Crossref licence (no slash)', 'https://www.crossref.org/documentation/retrieve-metadata/rest-api/rest-api-metadata-license-information', [['facts', 900], ['abstract', 700]]],
  ['Crossref retrieve-metadata', 'https://www.crossref.org/documentation/retrieve-metadata/', [['facts|CC0|licen', 900]]],
];
(async () => {
  for (const [name, u, pats] of J) {
    const [s, t, final] = await get(u);
    const p = plain(t);
    console.log('\n######## ' + name + ' ' + u + ' [' + s + '] final=' + final + ' len=' + p.length);
    console.log('HEAD: ' + p.slice(0, 300));
    for (const [re, n] of pats) console.log('---- ' + re.slice(0, 50) + ': ' + at(p, re, n));
    await new Promise((r) => setTimeout(r, 3000));
  }
})();
