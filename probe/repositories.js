'use strict';
/* One-off probe, never merged (read only): statute texts from the e-Gov law API, to check summaries against the originals. */
const UA = { 'User-Agent': 'probe (https://github.com/cpsbvbng26-dotcom/sophaxis)' };
const get = async (u) => { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(60000) }); return [r.status, await r.text()]; };
const strip = (x) => x.replace(/<Rt>[^<]*<\/Rt>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const LAWS = [
  ['140AC0000000045', '刑法', [['77'], ['155'], ['230'], ['231'], ['246']]],
  ['323AC0000000039', '軽犯罪法', [['1', ['15']]]],
  ['326AC0000000267', '旅券法', [['23']]],
  ['129AC0000000089', '民法', [['709']]],
  ['351AC0000000057', '特定商取引法', [['2']]],
  ['337AC0000000134', '景品表示法', [['5']]],
  ['412AC0000000061', '消費者契約法', [['2'], ['8'], ['10']]],
  ['421AC0000000059', '資金決済法', [['3']]],
  ['334AC0000000127', '商標法', [['25']]],
  ['405AC0000000047', '不正競争防止法', [['2', ['1', '2']]]],
  ['345AC0000000048', '著作権法', [['21'], ['23']]],
  ['415AC0000000057', '個人情報保護法', [['17'], ['18'], ['27'], ['28']]],
  ['408AC0000000109', '民事訴訟法', [['3_7'], ['11']]],
];
(async () => {
  for (const [id, name, arts] of LAWS) {
    const [s, t] = await get('https://laws.e-gov.go.jp/api/1/lawdata/' + id);
    const title = (/<LawTitle[^>]*>([^<]*)<\/LawTitle>/.exec(t) || [])[1];
    console.log('\n######## ' + name + ' ' + id + ' [' + s + '] title=' + title + ' num=' + ((/<LawNum>([^<]*)<\/LawNum>/.exec(t) || [])[1]));
    const main = (/<MainProvision[\s\S]*?<\/MainProvision>/.exec(t) || [''])[0];
    for (const [a, items] of arts) {
      const m = new RegExp('<Article Num="' + a + '"[^>]*>[\\s\\S]*?</Article>').exec(main);
      if (!m) { console.log('---- 第' + a + '条: NOT FOUND'); continue; }
      let body = m[0];
      if (items) body = items.map((n) => (new RegExp('<Item Num="' + n + '"[^>]*>[\\s\\S]*?</Item>').exec(body) || ['(item ' + n + ' not found)'])[0]).join('\n');
      const out = strip(body);
      console.log('---- 第' + a.replace('_', '条の') + '条' + (items ? ' 号' + items.join(',') : '') + ':\n' + (out.length > 2500 ? out.slice(0, 2500) + ' …(cut ' + out.length + ')' : out));
    }
  }
})();
