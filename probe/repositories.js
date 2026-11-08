// The PPC Q&A answers 7-53 and 7-54 (cloud services), and the update lines of Apple's and Vercel's privacy statements.
const UA = 'sophaxis-probe (+https://github.com/cpsbvbng26-dotcom/sophaxis)';
const plain = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
async function get(u) { try { const r = await fetch(u, { headers: { 'User-Agent': UA } }); const h = await r.text(); return { status: r.status, url: r.url, html: h, text: plain(h) }; } catch (e) { return { status: 'ERR ' + e.message, url: u, html: '', text: '' }; } }
(async () => {
  const q = await get('https://www.ppc.go.jp/personalinfo/faq/APPI_QA/');
  const links = [...new Set([...q.html.matchAll(/href="([^"]+)"/g)].map((m) => new URL(m[1], q.url).href))].filter((u) => /APPI_QA|faq/i.test(u));
  console.log('LINKS\n' + links.join('\n'));
  for (const t of [q.text]) for (const key of ['Ａ７－53', 'Ａ７－54', 'A7-53', 'A7-54']) { let i = -1, n = 0; while ((i = t.indexOf(key, i + 1)) >= 0 && n++ < 3) console.log('\n[' + key + '] ' + t.slice(i, i + 1500)); }
  for (const u of links.filter((u) => /7|chapter|q7/i.test(u)).slice(0, 6)) {
    const r = await get(u); console.log('\n=== ' + u + ' ' + r.status + ' len ' + r.text.length);
    for (const key of ['Ａ７－53', 'Ａ７－54', 'Ｑ７－53', 'Ｑ７－54']) { let i = -1, n = 0; while ((i = r.text.indexOf(key, i + 1)) >= 0 && n++ < 2) console.log('[' + key + '] ' + r.text.slice(i, i + 1500)); }
  }
  const a = await get('https://www.apple.com/legal/privacy/en-ww/');
  console.log('\nAPPLE dates: ' + (a.text.match(/(Updated|Published|Effective)[^.]{0,60}/gi) || []).slice(0, 5).join(' | '));
  console.log('APPLE tail: ' + a.text.slice(-600));
})();
