'use strict';
/* One-off probe, never merged (read only): where ROAR takes a new repository. */
const urls = ['https://roar.eprints.org/', 'https://roar.eprints.org/information.html', 'https://roar.eprints.org/cgi/register', 'https://roar.eprints.org/cgi/users/home', 'https://oad.simmons.edu/oadwiki/Main_Page', 'https://oad.simmons.edu/oadwiki/Disciplinary_repositories'];
(async () => {
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Sophaxis probe)' } });
      const t = await r.text();
      const title = (/<title>([^<]*)<\/title>/i.exec(t) || [])[1];
      console.log('==== ' + u + ' -> ' + r.status + ' ' + r.url + ' | ' + (title || '').trim());
      [...t.matchAll(/href="([^"]*)"[^>]*>([^<]{0,80})/gi)].map((m) => m[1] + ' [' + m[2].trim() + ']')
        .filter((l) => /regist|login|cgi|account|add|submit|create|Disciplinary|Philosoph|edit/i.test(l)).slice(0, 40).forEach((l) => console.log('  ' + l));
      const plain = t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const i = plain.search(/regist|Philosoph/i);
      if (i >= 0) console.log('  text: ' + plain.slice(Math.max(0, i - 200), i + 600));
    } catch (e) { console.log('==== ' + u + ' error ' + e.message); }
  }
})();
