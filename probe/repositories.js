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
const J = [];
const curlPdf = (u) => { try { execFileSync('curl', ['-sSL', '--max-time', '90', '-A', UA, '-o', '/tmp/r.pdf', u]); const t = execFileSync('pdftotext', ['/tmp/r.pdf', '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\s+/g, ' '); return t; } catch (e) { return 'ERR ' + String(e.message).slice(0, 300); } };
const extra = async () => {
  for (const u of ['https://egazette.gov.in/WriteReadData/2025/267650.pdf', 'http://egazette.gov.in/WriteReadData/2025/267650.pdf']) {
    const t = curlPdf(u);
    console.log('\n===== curl ' + u + ' | len ' + t.length + ' | ' + t.slice(0, 300));
    for (const k of ['outside the territory of India', 'epresentative', 'based in India', 'Significant Data Fiduciary', 'come into force', 'Data Protection Officer']) { const a = around(t, k, 1200, 3); if (a) console.log('--- ' + k + '\n' + a); }
  }
};
(async () => {
  for (const [name, url, keys, hre] of J) {
    const r = await text(url);
    console.log('\n===== ' + name + ' | ' + r.status + ' | len ' + r.t.length + ' | ' + url);
    for (const k of keys) { const a = around(r.t, k, 1600, 3); if (a) console.log('--- ' + k + '\n' + a); }
    if (hre) { console.log('RAW: ' + r.raw.slice(0, 2500)); console.log('HREFS: ' + hrefs(r.raw, hre).join('\n  ')); console.log('RAWBITS: ' + [...new Set((r.raw.match(/(?:onclick|src|action|url)\s*[=:(]\s*["'][^"']{3,200}["']|fn_[A-Za-z]+\([^)]{0,120}\)|[A-Za-z]+\.do[^"' <]{0,120}/gi) || []))].slice(0, 60).join('\n  ')); }
  }
  await extra();
})();
