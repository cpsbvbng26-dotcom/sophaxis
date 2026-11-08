'use strict';
/* One-off probe, never merged (read only): the text and the parties of the Montevideo Convention (1933). */
const UA = { 'User-Agent': 'probe (https://github.com/cpsbvbng26-dotcom/sophaxis)' };
const get = async (u) => { try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(60000), redirect: 'follow' }); return [r.status, await r.text(), r.url]; } catch (e) { return ['ERR', String(e), u]; } };
const plain = (x) => x.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#\d+;/g, ' ').replace(/\s+/g, ' ').trim();
const around = (t, re, n = 700) => { const out = []; let m; const r = new RegExp(re, 'gi'); while ((m = r.exec(t)) && out.length < 4) out.push(t.slice(Math.max(0, m.index - 150), m.index + n)); return out; };
const URLS = [
  'https://www.oas.org/juridico/english/treaties/a-40.html',
  'https://www.oas.org/juridico/english/sigs/a-40.html',
  'https://avalon.law.yale.edu/20th_century/intam03.asp',
];
(async () => {
  for (const u of URLS) {
    const [s, t, final] = await get(u);
    const p = plain(t);
    console.log('\n######## ' + u + ' [' + s + '] final=' + final + ' len=' + p.length);
    console.log('HEAD: ' + p.slice(0, 600));
    for (const x of around(p, 'ARTICLE 1\\b|Article 1\\b')) console.log('---- art1: ' + x);
    for (const x of around(p, 'ARTICLE 3\\b|Article 3\\b', 500)) console.log('---- art3: ' + x);
    for (const x of around(p, 'Japan', 200)) console.log('---- Japan: ' + x);
    if (/sigs/.test(u) || /intam03/.test(u)) for (const x of around(p, 'RATIF|ratif|DEPOSIT|SIGNATORY|Signatory', 3000)) console.log('---- parties: ' + x);
    await new Promise((r) => setTimeout(r, 2000));
  }
})();
