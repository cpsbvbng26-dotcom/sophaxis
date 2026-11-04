'use strict';
/* One-off probe, never merged (read only): the DOAPR list of preprint repositories. */
const urls = ['https://doapr.coar-repositories.org/repositories/', 'https://doapr.coar-repositories.org/repositories/?page=2', 'https://doapr.coar-repositories.org/api/repositories/', 'https://doapr.coar-repositories.org/repositories.json'];
(async () => {
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', Accept: 'text/html,application/json' } });
      const t = await r.text();
      const title = (/<title>([^<]*)<\/title>/i.exec(t) || [])[1];
      console.log('==== ' + u + ' -> ' + r.status + ' | ' + (title || '').trim() + ' | len ' + t.length);
      const links = [...t.matchAll(/href="(\/repositories\/[a-z0-9-]+\/)"[^>]*>([^<]{1,120})/gi)].map((m) => m[1] + ' | ' + m[2].trim());
      console.log('  repos ' + links.length); links.forEach((l) => console.log('  ' + l));
      const pages = [...t.matchAll(/href="([^"]*page=\d+[^"]*)"/g)].map((m) => m[1]); if (pages.length) console.log('  pages ' + [...new Set(pages)].join(' '));
    } catch (e) { console.log('==== ' + u + ' error ' + e.message); }
  }
})();
