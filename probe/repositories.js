'use strict';
/* One-off probe, never merged (read only): how the ASAPbio directory of preprint servers takes a new server. */
const urls = ['https://asapbio.org/preprint-servers', 'https://asapbio.org/?p=4164', 'https://asapbio.org/contact', 'https://asapbio.org/2020/04/28'];
(async () => {
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Sophaxis probe)' } });
      const t = await r.text();
      const title = (/<title>([^<]*)<\/title>/i.exec(t) || [])[1];
      console.log('==== ' + u + ' -> ' + r.status + ' ' + r.url + ' | ' + (title || '').trim());
      [...t.matchAll(/href="([^"]*)"[^>]*>([^<]{0,80})/gi)].map((m) => m[1] + ' [' + m[2].trim() + ']')
        .filter((l) => /mailto|form|add|submit|suggest|update|airtable|google|typeform|contact/i.test(l)).slice(0, 30).forEach((l) => console.log('  ' + l));
      const plain = t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      for (const re of [/(add|update|suggest|missing|include)[^.]{0,200}(server|record|directory)[^.]{0,200}\./gi, /[\w.+-]+@[\w-]+\.[\w.]+/g, /scope[^.]{0,300}\./gi]) {
        [...plain.matchAll(re)].slice(0, 6).forEach((m) => console.log('  text: ' + m[0].slice(0, 400)));
      }
    } catch (e) { console.log('==== ' + u + ' error ' + e.message); }
  }
})();
