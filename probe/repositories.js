// The Internet Archive's own page on removal requests, and its Wayback availability API for removed and listed records.
const UA = 'sophaxis-probe (+https://github.com/cpsbvbng26-dotcom/sophaxis)';
const plain = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;/g, "'").replace(/\s+/g, ' ').trim();
async function get(u) { try { const r = await fetch(u, { headers: { 'User-Agent': UA } }); return { status: r.status, url: r.url, body: await r.text() }; } catch (e) { return { status: 'ERR ' + e.message, url: u, body: '' }; } }
(async () => {
  for (const u of ['https://help.archive.org/help/how-do-i-request-to-remove-something-from-archive-org/', 'https://help.archive.org/help/using-the-wayback-machine/', 'https://archive.org/about/exclude.php']) {
    const r = await get(u); const t = plain(r.body);
    const i = t.search(/remov|exclu/i);
    console.log('\n=== ' + u + ' ' + r.status + ' ' + r.url + '\n' + (i >= 0 ? t.slice(Math.max(0, i - 200), i + 2500) : t.slice(0, 800)));
  }
  for (const id of ['2026.0006', '2026.0001', '2026.0002']) for (const p of ['abs/' + id + '.html']) {
    const r = await get('https://archive.org/wayback/available?url=sophaxis.vercel.app/' + p);
    console.log('\nAVAILABLE ' + p + ' ' + r.status + ' ' + r.body.slice(0, 400));
    const c = await get('https://web.archive.org/cdx/search/cdx?url=sophaxis.vercel.app/' + p + '&output=json&limit=3');
    console.log('CDX ' + p + ' ' + c.status + ' ' + c.body.slice(0, 400));
  }
})();
