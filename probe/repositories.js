const UA = 'sophaxis-probe (+https://github.com/cpsbvbng26-dotcom/sophaxis)';
const plain = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
async function get(u) { try { const r = await fetch(u, { headers: { 'User-Agent': UA } }); const b = await r.text(); return { status: r.status, url: r.url, text: plain(b), raw: b }; } catch (e) { return { status: 'ERR ' + e.message, url: u, text: '', raw: '' }; } }
const around = (t, re, n = 1500, max = 2) => { const out = []; const g = new RegExp(re, 'gi'); let m; while ((m = g.exec(t)) && out.length < max) { out.push('…' + t.slice(Math.max(0, m.index - 150), m.index + n) + '…'); g.lastIndex = m.index + n; } return out.join('\n'); };
(async () => {
  for (const u of ['http://en.npc.gov.cn.cdurl.cn/2021-12/29/c_694559_2.htm', 'http://en.npc.gov.cn.cdurl.cn/2021-12/29/c_694559_3.htm', 'http://en.npc.gov.cn.cdurl.cn/2021-12/29/c_694559_4.htm']) {
    const r = await get(u); console.log('\n===== PIPL ' + u + ' ' + r.status); console.log(around(r.text, 'Article 53', 900, 1));
  }
  const fl = await get('https://www.fedlex.admin.ch/eli/cc/2022/491/en');
  const links = [...new Set((fl.raw.match(/https?:\/\/[^"' ]*filestore[^"' ]*/g) || []))].slice(0, 5);
  console.log('\n===== FADP filestore links\n' + links.join('\n'));
  for (const u of ['https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/2022/491/20230901/en/html/fedlex-data-admin-ch-eli-cc-2022-491-20230901-en-html-5.html', ...links]) {
    const r = await get(u); console.log('\n===== FADP ' + u + ' ' + r.status + ' len ' + r.text.length); console.log(around(r.text, 'Art\\. 3 ', 900, 1)); console.log(around(r.text, 'Art\\. 14 ', 1300, 1));
  }
  for (const u of ['https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm', 'http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm', 'https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022']) {
    const r = await get(u); console.log('\n===== LGPD ' + u + ' ' + r.status + ' len ' + r.text.length); console.log(around(r.text, 'Art\\. 4º', 1200, 1)); console.log(around(r.text, 'Art\\. 3º', 900, 1)); console.log(around(r.text, 'encarregado', 900, 2));
  }
  for (const u of ['https://www.indiacode.nic.in/bitstream/123456789/22037/1/a2023-22.pdf', 'https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf', 'https://prsindia.org/files/bills_acts/acts_parliament/2023/Digital_Personal_Data_Protection_Act,_2023.pdf']) {
    const r = await fetch(u, { headers: { 'User-Agent': UA } }).catch((e) => ({ status: 'ERR ' + e.message, headers: new Map() }));
    console.log('\n===== DPDP ' + u + ' ' + r.status + ' ' + (r.headers && r.headers.get ? r.headers.get('content-type') : ''));
  }
})();
