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
const S = 'https://sdaia.gov.sa';
const E = 'https://elaw.klri.re.kr';
const J = [
  ['elaw PIPA content', E + '/eng_service/lawViewContent.do?hseq=62389', ['Article 31-2', 'Article 39-11', 'domestic agent', 'Domestic Agent', 'Article 3 \\(Definitions|Article 2 \\(Definitions'], null],
  ['elaw PIPA multi', E + '/kor_service/lawViewMultiContent.do?hseq=62389', ['31조의2', 'Article 31-2', '국내대리인'], null],
  ['elaw search decree', E + '/eng_service/lawSearchList.do?searchType=title&query=' + encodeURIComponent('Enforcement Decree of the Personal Information Protection Act'), ['Enforcement Decree of the Personal Information Protection Act'], /hseq/i],
  ['PIPC eng laws raw2', 'https://www.pipc.go.kr/eng/user/lgp/law/lawsRegulations.do', ['Enforcement Decree of the Personal Information Protection Act \\[Enforcement Date September 15, 2023\\]'], /View|view|Detail|detail|file|down|seq|idx/],
];
const extra = async () => {
  const r = await text(S + '/en/SDAIA/about/Documents/ImplementingRegulationPersonalDataProtectionLaw.pdf');
  console.log('\n===== SDAIA IR headings | ' + r.status);
  console.log((r.t.match(/Article \d+\s*:\s*[A-Z][A-Za-z ,'-]{2,80}/g) || []).join('\n'));
  console.log('--- count epresent: ' + (r.t.match(/epresent/gi) || []).length);
  console.log(around(r.t, 'epresent', 600, 10));
  console.log(around(r.t, 'Article 1:', 2500, 1));
  console.log(around(r.t, 'Article 2:', 1800, 1));
  console.log(around(r.t, 'Article 3:', 1800, 1));
};
(async () => {
  for (const [name, url, keys, hre] of J) {
    const r = await text(url);
    console.log('\n===== ' + name + ' | ' + r.status + ' | len ' + r.t.length + ' | ' + url);
    for (const k of keys) { const a = around(r.t, k, 1600, 3); if (a) console.log('--- ' + k + '\n' + a); }
    if (hre) { console.log('HREFS: ' + hrefs(r.raw, hre).join('\n  ')); console.log('RAWBITS: ' + [...new Set((r.raw.match(/(?:onclick|src|action|url)\s*[=:(]\s*["'][^"']{3,200}["']|fn_[A-Za-z]+\([^)]{0,120}\)|[A-Za-z]+\.do[^"' <]{0,120}/gi) || []))].slice(0, 60).join('\n  ')); }
  }
  await extra();
})();
