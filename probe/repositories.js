'use strict';
/* One-off probe, never merged (read only): where PhilPapers takes OAI-PMH archives. */
const urls = ['https://philpapers.org/archives/', 'https://philpapers.org/utils/archives.html', 'https://philpapers.org/help/archives.html', 'https://philpapers.org/archives/add', 'https://philpapers.org/help/faq.html', 'https://philpapers.org/help/'];
(async () => {
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Sophaxis probe)' } });
      const t = await r.text();
      const links = [...t.matchAll(/href="([^"]*(archiv|oai|harvest)[^"]*)"[^>]*>([^<]{0,80})/gi)].map((m) => m[1] + ' [' + m[3].trim() + ']').slice(0, 25);
      const title = (/<title>([^<]*)<\/title>/i.exec(t) || [])[1];
      console.log('==== ' + u + ' -> ' + r.status + ' ' + r.url + ' | ' + title);
      links.forEach((l) => console.log('  ' + l));
      const i = t.search(/OAI|harvest/i);
      if (i >= 0) console.log('  text: ' + t.slice(Math.max(0, i - 300), i + 400).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
    } catch (e) { console.log('==== ' + u + ' error ' + e.message); }
  }
})();
