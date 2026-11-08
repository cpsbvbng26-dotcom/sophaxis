const UA = 'sophaxis-probe (+https://github.com/cpsbvbng26-dotcom/sophaxis)';
const { execFileSync } = require('child_process');
const fs = require('fs');
const plain = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
async function text(u) {
  try {
    const r = await fetch(u, { headers: { 'User-Agent': UA } });
    const ct = r.headers.get('content-type') || '';
    if (/pdf/.test(ct) || /\.pdf$/i.test(u)) {
      fs.writeFileSync('/tmp/x.pdf', Buffer.from(await r.arrayBuffer()));
      try { return { status: r.status, t: execFileSync('pdftotext', ['-layout', '/tmp/x.pdf', '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ') }; } catch (e) { return { status: r.status + ' (pdftotext failed)', t: '' }; }
    }
    return { status: r.status, t: plain(await r.text()) };
  } catch (e) { return { status: 'ERR ' + e.message, t: '' }; }
}
const around = (t, re, n = 1500, max = 2) => { const out = []; const g = new RegExp(re, 'gi'); let m; while ((m = g.exec(t)) && out.length < max) { out.push('…' + t.slice(Math.max(0, m.index - 150), m.index + n) + '…'); g.lastIndex = m.index + n; } return out.join('\n'); };
const J = [
  ['India DPDP Act 2023', 'https://prsindia.org/files/bills_acts/acts_parliament/2023/Digital_Personal_Data_Protection_Act,_2023.pdf', ['3\\. Subject to the provisions', 'made publicly available']],
  ['Thailand PDPA', 'https://thainetizen.org/wp-content/uploads/2019/11/thailand-personal-data-protection-act-2019-en.pdf', ['Section 5', 'Section 37', 'Section 38']],
  ['Turkey KVKK', 'https://www.kvkk.gov.tr/Icerik/6649/Personal-Data-Protection-Law', ['Article 2', 'Article 16']],
  ['Turkey VERBIS regulation', 'https://www.kvkk.gov.tr/Icerik/6655/Regulation-on-Data-Controllers-Registry', ['representative', 'abroad']],
  ['Korea PIPA (elaw)', 'https://elaw.klri.re.kr/eng_service/lawView.do?hseq=62389&lang=ENG', ['Article 31-2', 'domestic agent']],
  ['Saudi PDPL', 'https://sdaia.gov.sa/en/SDAIA/about/Documents/Personal%20Data%20English%20V2-23April2023-%20Reviewed-.pdf', ['Article 2', 'representative']],
];
(async () => {
  for (const [name, url, keys] of J) {
    const r = await text(url);
    console.log('\n===== ' + name + ' | ' + r.status + ' | len ' + r.t.length);
    for (const k of keys) console.log('--- ' + k + '\n' + around(r.t, k, 1300, 2));
  }
})();
