// Reads ROAR's own pages: the home page, every page it links that explains the registry or its rules, and the Sophaxis record.
const UA = 'sophaxis-probe (+https://github.com/cpsbvbng26-dotcom/sophaxis)';
const plain = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
async function get(u) {
  try { const r = await fetch(u, { headers: { 'User-Agent': UA } }); const t = await r.text(); return { status: r.status, url: r.url, html: t }; }
  catch (e) { return { status: 'ERR ' + e.message, url: u, html: '' }; }
}
(async () => {
  const seen = new Set();
  const home = await get('https://roar.eprints.org/');
  console.log('=== HOME', home.status, home.url); console.log(plain(home.html).slice(0, 4000));
  const links = [...home.html.matchAll(/href="([^"#]+)"/g)].map((m) => new URL(m[1], home.url).href).filter((u) => u.startsWith('https://roar.eprints.org/'));
  console.log('=== LINKS\n' + [...new Set(links)].join('\n'));
  const want = [...new Set(links)].filter((u) => /about|polic|inform|help|faq|register|criteria|guide|contact|terms|submit|rule/i.test(u));
  for (const u of ['https://roar.eprints.org/27422/', 'https://roar.eprints.org/information.html', 'https://roar.eprints.org/policy.html', 'https://roar.eprints.org/help/', ...want]) {
    if (seen.has(u)) continue; seen.add(u);
    const r = await get(u);
    console.log('\n=== ' + u + ' ' + r.status + ' ' + r.url); console.log(plain(r.html).slice(0, 12000));
  }
})();
