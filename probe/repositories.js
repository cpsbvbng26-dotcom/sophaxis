const UA = 'Mozilla/5.0 (compatible; sophaxis-probe; +https://github.com/cpsbvbng26-dotcom/sophaxis)';
const { execFileSync } = require('child_process');
const fs = require('fs');
const plain = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
async function text(u) {
  try {
    const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: '*/*' } });
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.slice(0, 5).toString() === '%PDF-') {
      fs.writeFileSync('/tmp/x.pdf', buf);
      try { return { status: r.status + ' pdf', t: execFileSync('pdftotext', ['/tmp/x.pdf', '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\s+/g, ' ') }; } catch (e) { return { status: r.status + ' pdf (pdftotext failed: ' + e.message.slice(0, 80) + ')', t: '' }; }
    }
    return { status: r.status, t: plain(buf.toString('utf8')) };
  } catch (e) { return { status: 'ERR ' + e.message, t: '' }; }
}
const around = (t, re, n = 1500, max = 2) => { const out = []; const g = new RegExp(re, 'g'); let m; while ((m = g.exec(t)) && out.length < max) { out.push('…' + t.slice(Math.max(0, m.index - 100), m.index + n) + '…'); g.lastIndex = m.index + n; } return out.join('\n'); };
const J = [
  ['Thailand PDPA (MDES)', 'https://www.mdes.go.th/law/download/1215', ['Section 5 ', 'Section 37 ', 'Section 38 ']],
  ['Thailand PDPA (ETDA)', 'https://www.etda.or.th/getattachment/e820df2c-848f-4e03-86cb-a9dad38cc713/ENG-Version.aspx', ['Section 5 ', 'Section 37 ', 'Section 38 ']],
  ['India DPDP (MeitY)', 'https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf', ['3\\. Subject to', 'made or caused to be made publicly available', 'Data Protection Officer']],
  ['India DPDP (PRS)', 'https://prsindia.org/files/bills_acts/acts_parliament/2023/Digital_Personal_Data_Protection_Act,_2023.pdf', ['3\\. Subject to', 'publicly available']],
  ['Korea PIPA (elaw title)', 'https://elaw.klri.re.kr/eng_service/lawViewTitle.do?hseq=62389', ['Article 31-2', 'Domestic Agent']],
  ['PPC offshore index', 'https://www.ppc.go.jp/enforcement/infoprovision/laws/', ['韓国', 'タイ', 'インド', 'サウジ']],
  ['PPC Korea', 'https://www.ppc.go.jp/enforcement/infoprovision/laws/offshore_report_korea/', ['国内代理人', '域外']],
  ['PPC Thailand', 'https://www.ppc.go.jp/enforcement/infoprovision/laws/offshore_report_thailand/', ['代理人', '域外']],
  ['PPC India', 'https://www.ppc.go.jp/enforcement/infoprovision/laws/offshore_report_india/', ['代理人', '域外']],
  ['PPC Saudi', 'https://www.ppc.go.jp/enforcement/infoprovision/laws/offshore_report_saudiarabia/', ['代理人', '域外']],
];
(async () => {
  for (const [name, url, keys] of J) {
    const r = await text(url);
    console.log('\n===== ' + name + ' | ' + r.status + ' | len ' + r.t.length + ' | ' + url);
    for (const k of keys) { const a = around(r.t, k, 1400, 2); if (a) console.log('--- ' + k + '\n' + a); }
    if (/PPC offshore index/.test(name)) console.log('LINKS: ' + [...new Set((r.t.match(/offshore_report_[a-z_]+/g) || []))].join(' '));
  }
})();
