// The texts of foreign laws that may reach Sophaxis, read at their official or standard sources. Prints the passages that decide applicability.
const UA = 'sophaxis-probe (+https://github.com/cpsbvbng26-dotcom/sophaxis)';
const plain = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;/g, "'").replace(/&quot;|&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"').replace(/&sect;|&#167;/g, '§').replace(/\s+/g, ' ').trim();
async function get(u) { try { const r = await fetch(u, { headers: { 'User-Agent': UA } }); return { status: r.status, url: r.url, text: plain(await r.text()) }; } catch (e) { return { status: 'ERR ' + e.message, url: u, text: '' }; } }
const around = (t, re, n = 1400, max = 3) => { const out = []; const g = new RegExp(re, 'gi'); let m; while ((m = g.exec(t)) && out.length < max) { out.push('…' + t.slice(Math.max(0, m.index - 200), m.index + n) + '…'); g.lastIndex = m.index + n; } return out.join('\n'); };
const J = [
  ['COPPA 16 CFR 312.2-312.3', 'https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-16?part=312', ['Operator means', 'Website or online service directed to children', '§ 312.3 Regulation of unfair']],
  ['DMCA 17 USC 512(c)', 'https://www.law.cornell.edu/uscode/text/17/512', ['designated an agent', '\\(c\\) Information Residing on Systems']],
  ['CCPA business 1798.140', 'https://oag.ca.gov/privacy/ccpa', ['Which businesses', 'for-profit']],
  ['UK Online Safety Act s.4', 'https://www.legislation.gov.uk/ukpga/2023/50/section/4', ['links with the United Kingdom']],
  ['UK Online Safety Act s.3', 'https://www.legislation.gov.uk/ukpga/2023/50/section/3', ['User-to-user service']],
  ['EU DSM Directive 2019/790 Art 2(6)', 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32019L0790', ['online content-sharing service provider', 'not-for-profit educational and scientific repositories']],
  ['Swiss FADP', 'https://www.fedlex.admin.ch/eli/cc/2022/491/en', ['Art\\. 14', 'Representative', 'effect in Switzerland']],
  ['Swiss FADP (FDPIC page)', 'https://www.edoeb.admin.ch/en/representative', ['representative']],
  ['Brazil LGPD', 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm', ['Art\\. 3º', 'Art\\. 4º', 'acadêmicos']],
  ['China PIPL', 'http://en.npc.gov.cn.cdurl.cn/2021-12/29/c_694559.htm', ['Article 3', 'Article 53']],
  ['India DPDP Act 2023', 'https://www.meity.gov.in/data-protection-framework', ['Digital Personal Data Protection', 'Rules']],
];
(async () => {
  for (const [name, url, keys] of J) {
    const r = await get(url);
    console.log('\n===== ' + name + ' | ' + r.status + ' | ' + r.url + ' | len ' + r.text.length);
    for (const k of keys) console.log('--- ' + k + '\n' + around(r.text, k, 1500, 2));
  }
})();
