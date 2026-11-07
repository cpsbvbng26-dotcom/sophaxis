'use strict';
/* One-off probe, never merged (read only): statute texts from the e-Gov law API (second pass: the Minor Offenses Act). */
const UA = { 'User-Agent': 'probe (https://github.com/cpsbvbng26-dotcom/sophaxis)' };
const get = async (u) => { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(60000) }); return [r.status, await r.text()]; };
const strip = (x) => x.replace(/<Rt>[^<]*<\/Rt>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const LAWS = [
  ['323AC0000000039', '軽犯罪法', [['1', ['15']]]],
];
(async () => {
  for (const [id, name, arts] of LAWS) {
    const [s, t] = await get('https://laws.e-gov.go.jp/api/1/lawdata/' + id);
    const title = (/<LawTitle[^>]*>([^<]*)<\/LawTitle>/.exec(t) || [])[1];
    console.log('\n######## ' + name + ' ' + id + ' [' + s + '] title=' + title + ' num=' + ((/<LawNum>([^<]*)<\/LawNum>/.exec(t) || [])[1]));
    const main = (/<MainProvision[\s\S]*?<\/MainProvision>/.exec(t) || [''])[0];
    for (const [a, items] of arts) {
      const m = new RegExp('<Article[^>]*\\sNum="' + a + '"[^>]*>[\\s\\S]*?</Article>').exec(main);
      if (!m) { console.log('---- 第' + a + '条: NOT FOUND; article tags: ' + (main.match(/<Article[^>]*>/g) || []).slice(0, 5).join(' ') + ' len=' + main.length + ' head=' + t.slice(0, 600).replace(/\s+/g, ' ')); continue; }
      let body = m[0];
      if (items) body = items.map((n) => (new RegExp('<Item[^>]*\\sNum="' + n + '"[^>]*>[\\s\\S]*?</Item>').exec(body) || ['(item ' + n + ' not found)'])[0]).join('\n');
      const out = strip(body);
      console.log('---- 第' + a.replace('_', '条の') + '条' + (items ? ' 号' + items.join(',') : '') + ':\n' + (out.length > 2500 ? out.slice(0, 2500) + ' …(cut ' + out.length + ')' : out));
    }
  }
})();
