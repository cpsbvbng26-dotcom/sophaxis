'use strict';
/* One-off probe, never merged (read only): the policies of Advance (Sage) and MindRxiv, as text. */
const urls = ['https://www.mindandlife.org/mindrxiv/', 'https://advance.sagepub.com/', 'https://advance.sagepub.com/about', 'https://advance.sagepub.com/policies', 'https://advance.sagepub.com/faq'];
(async () => {
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Sophaxis probe)' } });
      const t = await r.text();
      const title = (/<title>([^<]*)<\/title>/i.exec(t) || [])[1];
      const plain = t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&#8217;|&rsquo;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
      console.log('==== ' + u + ' -> ' + r.status + ' ' + r.url + ' | ' + (title || '').trim());
      for (const re of [/[^.]{0,200}(no longer|closed|discontinu|retir|sunset)[^.]{0,200}\./gi, /[^.]{0,200}(already (been )?(posted|published)|another preprint|elsewhere|previously)[^.]{0,250}\./gi, /[^.]{0,200}(generative|artificial intelligence|\bAI\b|large language)[^.]{0,250}\./gi, /[^.]{0,200}(humanities|philosoph)[^.]{0,200}\./gi]) {
        [...plain.matchAll(re)].slice(0, 4).forEach((m) => console.log('  text: ' + m[0].trim().slice(0, 450)));
      }
    } catch (e) { console.log('==== ' + u + ' error ' + e.message); }
  }
})();
