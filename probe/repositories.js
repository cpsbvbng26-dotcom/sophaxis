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
      try { return { status: r.status + ' pdf', t: execFileSync('pdftotext', ['/tmp/x.pdf', '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\s+/g, ' '), raw: '' }; } catch (e) { return { status: r.status + ' pdf (pdftotext failed)', t: '', raw: '' }; }
    }
    const raw = buf.toString('utf8');
    return { status: r.status + ' ' + r.url, t: plain(raw), raw };
  } catch (e) { return { status: 'ERR ' + e.message, t: '', raw: '' }; }
}
const around = (t, re, n = 1500, max = 2) => { const out = []; const g = new RegExp(re, 'g'); let m; while ((m = g.exec(t)) && out.length < max) { out.push('…' + t.slice(Math.max(0, m.index - 100), m.index + n) + '…'); g.lastIndex = m.index + n; } return out.join('\n'); };
const hrefs = (raw, re) => [...new Set([...raw.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]).filter((h) => re.test(h)))].slice(0, 40);
const J = [
  ['Thailand PDPA (ETDA) 37(5)', 'https://www.etda.or.th/getattachment/e820df2c-848f-4e03-86cb-a9dad38cc713/ENG-Version.aspx', ['\\(5\\) in the case', 'designate in writing', 'representative'], null],
  ['PDPC Thailand home', 'https://www.pdpc.or.th/', [], /pdf|law|announce|ประกาศ/i],
  ['Korea PIPA elaw lawView', 'https://elaw.klri.re.kr/eng_service/lawView.do?hseq=62389&lang=ENG', ['Article 31-2', 'domestic agent', 'Domestic Agent'], null],
  ['Korea PIPA law.go.kr 31-2', 'https://www.law.go.kr/법령/개인정보보호법/제31조의2', ['국내대리인', '제31조의2'], null],
  ['Korea decree law.go.kr 32-2', 'https://www.law.go.kr/법령/개인정보보호법시행령/제32조의2', ['국내대리인', '제32조의2', '매출액'], null],
  ['Korea PIPC eng laws', 'https://www.pipc.go.kr/eng/user/lgp/law/lawsRegulations.do', ['Domestic', 'Enforcement Decree'], /pdf|down|file/i],
  ['WIPO kr088en', 'https://wipolex-resources-eu-central-1-358922420655.s3.amazonaws.com/edocs/lexdocs/laws/en/kr/kr088en.pdf', ['31-2', '39-11', 'domestic agent', 'Domestic Agent'], null],
  ['SDAIA PDPL page', 'https://sdaia.gov.sa/en/SDAIA/about/Pages/RegulationsAndPolicies.aspx', [], /\.pdf/i],
  ['SDAIA DGP', 'https://dgp.sdaia.gov.sa/wps/portal/pdp/knowledgecenter/', [], /\.pdf|knowledge/i],
  ['BOE PDPL', 'https://laws.boe.gov.sa/BoeLaws/Laws/LawDetails/b7cfae89-828e-4994-b167-adaa00e37188/1', ['Article 2', 'representative', 'outside the Kingdom'], null],
];
(async () => {
  for (const [name, url, keys, hre] of J) {
    const r = await text(url);
    console.log('\n===== ' + name + ' | ' + r.status + ' | len ' + r.t.length + ' | ' + url);
    for (const k of keys) { const a = around(r.t, k, 1600, 3); if (a) console.log('--- ' + k + '\n' + a); }
    if (hre) console.log('HREFS: ' + hrefs(r.raw, hre).join('\n  '));
  }
})();
