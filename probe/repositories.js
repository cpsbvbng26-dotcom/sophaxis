'use strict';
/* One-off probe, never merged (read only): the head and links of the operator's own-domain site. */
(async () => {
  for (const u of ['https://nemoto200101.com/', 'http://nemoto200101.com/']) {
    try {
      const r = await fetch(u, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Sophaxis probe)' } });
      console.log('==== ' + u + ' -> ' + r.status + ' ' + (r.headers.get('location') || '') + ' | hsts ' + (r.headers.get('strict-transport-security') || '-'));
      if (r.status !== 200) continue;
      const t = await r.text();
      const head = (t.match(/<head[\s\S]*?<\/head>/i) || [''])[0];
      [...head.matchAll(/<(title|meta|link)\b[^>]*>(?:[^<]*<\/title>)?/gi)].map((m) => m[0].replace(/\s+/g, ' ')).filter((l) => !/stylesheet|preload|preconnect|dns-prefetch/i.test(l)).slice(0, 40).forEach((l) => console.log('  ' + l.slice(0, 220)));
      console.log('  scripts: ' + [...t.matchAll(/<script[^>]*src="([^"]+)"/gi)].map((m) => m[1].replace(/\?.*/, '')).slice(0, 15).join(' | '));
      console.log('  links: ' + [...new Set([...t.matchAll(/href="(https?:[^"]+)"/gi)].map((m) => m[1]))].filter((l) => !/\.(css|js)(\?|$)/.test(l)).slice(0, 25).join(' | '));
      console.log('  h1: ' + [...t.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => m[1].replace(/<[^>]+>/g, '').trim()).join(' / '));
      console.log('  imgs: ' + [...t.matchAll(/<img[^>]*>/gi)].map((m) => ((/alt="([^"]*)"/.exec(m[0]) || [, '(no alt)'])[1])).join(' | '));
      const plain = t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log('  text: ' + plain.slice(0, 900));
    } catch (e) { console.log('==== ' + u + ' error ' + e.message); }
  }
})();
