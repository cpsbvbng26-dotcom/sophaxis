// Reads Apple's and Vercel's privacy statements (twice, to see whether their text is stable), and the PPC Q&A on cloud services.
const crypto = require('crypto');
const UA = 'sophaxis-probe (+https://github.com/cpsbvbng26-dotcom/sophaxis)';
const plain = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;|&#8217;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/\s+/g, ' ').trim();
async function get(u) { try { const r = await fetch(u, { headers: { 'User-Agent': UA } }); return { status: r.status, url: r.url, text: plain(await r.text()) }; } catch (e) { return { status: 'ERR ' + e.message, url: u, text: '' }; } }
const around = (t, re, n = 900) => { const out = []; let m; const g = new RegExp(re, 'gi'); while ((m = g.exec(t)) && out.length < 6) out.push('…' + t.slice(Math.max(0, m.index - n / 2), m.index + n / 2) + '…'); return out.join('\n\n'); };
(async () => {
  for (const u of ['https://www.apple.com/legal/privacy/en-ww/', 'https://vercel.com/legal/privacy-notice', 'https://vercel.com/legal/dpa']) {
    const a = await get(u); await new Promise((r) => setTimeout(r, 3000)); const b = await get(u);
    console.log('\n=== ' + u + ' ' + a.status + ' ' + a.url + ' len ' + a.text.length);
    console.log('sha a ' + crypto.createHash('sha256').update(a.text).digest('hex') + '\nsha b ' + crypto.createHash('sha256').update(b.text).digest('hex'));
    console.log('--- Data Privacy Framework\n' + around(a.text, 'Data Privacy Framework'));
    console.log('--- Standard Contractual\n' + around(a.text, 'Standard Contractual', 600));
    console.log('--- retain / logs\n' + around(a.text, 'log data|logs? (are|is) (retained|kept)|retain', 600));
  }
  const q = await get('https://www.ppc.go.jp/personalinfo/faq/APPI_QA/');
  console.log('\n=== PPC QA ' + q.status + ' ' + q.url + ' len ' + q.text.length);
  console.log(around(q.text, 'クラウドサービス', 1600));
})();
