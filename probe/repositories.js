'use strict';
/* One-off probe, never merged (read only): the texts the policies of Sophaxis and Nusquama cite, from their official sources. */
const UA = { 'User-Agent': 'probe (https://github.com/cpsbvbng26-dotcom/sophaxis)', 'Accept-Language': 'en,ja;q=0.8' };
const get = async (u) => { try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(90000), redirect: 'follow' }); return [r.status, await r.text(), r.url]; } catch (e) { return ['ERR', String(e), u]; } };
const plain = (x) => x.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"').replace(/&#\d+;/g, ' ').replace(/\s+/g, ' ').trim();
const at = (t, re, n) => { const m = new RegExp(re, 'i').exec(t); return m ? t.slice(m.index, m.index + n) : '(not found: ' + re + ')'; };
const J = [
  ['Italy 178/1951 art 8', 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1951-03-03;178~art8', [['Art\\. 8|Art\\.8', 1200], ['conferi', 900]]],
  ['Italy 178/1951 art 7', 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1951-03-03;178~art7', [['Art\\. 7|Art\\.7', 1000]]],
  ['CCPA (Attorney General)', 'https://oag.ca.gov/privacy/ccpa', [['for-profit', 900]]],
  ['Vercel terms', 'https://vercel.com/terms', [['Hobby', 700]]],
  ['Vercel fair use (Hobby)', 'https://vercel.com/docs/limits/fair-use-guidelines', [['non-commercial', 500]]],
  ['Crossref metadata licence', 'https://www.crossref.org/documentation/retrieve-metadata/rest-api/rest-api-metadata-license-information/', [['facts', 900], ['abstract', 700]]],
  ['DataCite data file use', 'https://support.datacite.org/docs/datacite-data-file-use-policy', [['waive', 900]]],
  ['CC BY 4.0 clauses', 'https://creativecommons.org/licenses/by/4.0/legalcode.en', [['No downstream restrictions', 400], ['No endorsement', 500], ['Attribution\\. If You Share', 700]]],
  ['CC BY-SA 4.0 clauses', 'https://creativecommons.org/licenses/by-sa/4.0/legalcode.en', [['In addition to the conditions in Section 3\\(a\\)', 700]]],
  ['CC0 waiver', 'https://creativecommons.org/publicdomain/zero/1.0/legalcode.en', [['Affirmer hereby overtly, fully, permanently', 600]]],
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
