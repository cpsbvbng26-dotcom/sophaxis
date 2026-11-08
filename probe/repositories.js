'use strict';
/* One-off probe, never merged (read only): the full obligation articles, to pair every duty with a sentence of the policies. */
const UA = { 'User-Agent': 'probe (https://github.com/cpsbvbng26-dotcom/sophaxis)' };
const get = async (u) => { try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(120000) }); return [r.status, await r.text()]; } catch (e) { return ['ERR', String(e)]; } };
const plain = (x) => x.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<Rt>[^<]*<\/Rt>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#\d+;/g, ' ').replace(/\s+/g, ' ').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function articles(text, nums) {
  const body = text.slice(text.indexOf('Article 1 '));
  for (const n of nums) {
    const a = body.search(new RegExp('Article ' + n + ' [A-Z]'));
    const b = body.search(new RegExp('Article ' + (n + 1) + ' [A-Z]'));
    console.log('\n=== Article ' + n + ': ' + (a < 0 ? '(not found)' : body.slice(a, b > a ? Math.min(b, a + 6000) : a + 4000)));
  }
}
function recitals(text, nums) {
  const w = text.indexOf('Whereas:'); const t = text.slice(w);
  for (const n of nums) { const a = t.indexOf('(' + n + ') '); const b = t.indexOf('(' + (n + 1) + ') ', a + 4); console.log('\n=== Recital ' + n + ': ' + t.slice(a, b > a ? b : a + 2500)); }
}
const egov = async (id, name, arts) => {
  const [s, x] = await get('https://laws.e-gov.go.jp/api/1/lawdata/' + id);
  console.log('\n######## ' + name + ' [' + s + '] ' + ((/<LawTitle[^>]*>([^<]*)</.exec(x) || [])[1]));
  const main = (/<MainProvision[\s\S]*?<\/MainProvision>/.exec(x) || [''])[0];
  for (const a of arts) { const m = new RegExp('<Article[^>]*\\sNum="' + a + '"[^>]*>[\\s\\S]*?</Article>').exec(main); console.log('\n=== 第' + a + '条: ' + (m ? plain(m[0]).slice(0, 5000) : '(not found)')); }
  await sleep(1500);
};
(async () => {
  let [s, t] = await get('https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679');
  t = plain(t); console.log('######## GDPR [' + s + ']');
  recitals(t, [23]);
  articles(t, [7, 8, 12, 13, 14, 15, 16, 18, 19, 21, 22]);
  await sleep(3000);
  [s, t] = await get('https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R2065');
  t = plain(t); console.log('\n######## DSA [' + s + ']');
  recitals(t, [7, 8]);
  articles(t, [3, 14, 15, 16, 17, 18, 24]);
  await egov('415AC0000000057', 'APPI', ['21', '23', '33', '34', '35', '37', '38', '40']);
  await egov('415CO0000000507', 'APPI Order', ['10']);
  await egov('428M60020000003', 'APPI Rules', ['7', '8', '10']);
})();
