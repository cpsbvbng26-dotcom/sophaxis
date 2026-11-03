'use strict';
/* One-off probe, never merged (read only): Google Scholar's inclusion guidelines, as text. */
const urls = ['https://scholar.google.com/intl/en/scholar/inclusion.html'];
(async () => {
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Sophaxis probe)' } });
      const t = await r.text();
      console.log('==== ' + u + ' -> ' + r.status + ' ' + r.url + ' len ' + t.length);
      const body = t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<(p|li|h\d|br|div|pre|tr)[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n');
      console.log(body);
    } catch (e) { console.log('==== ' + u + ' error ' + e.message); }
  }
})();
