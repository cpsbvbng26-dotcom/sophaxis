'use strict';
/* One-off probe, never merged (read only): eligibility, fees, access and AI policy of undergraduate journals, from their own pages. */
const P = [
  ['Aporia BYU', 'https://aporia.byu.edu/'], ['Aporia BYU submit', 'https://aporia.byu.edu/submissions'],
  ['UPJA', 'https://upja.online/'], ['UPJA submit', 'https://upja.online/submissions/'],
  ['Logos Cornell', 'https://logos.philosophy.cornell.edu/?p=106'],
  ['Stance guidelines', 'https://web21direct.pdcnet.org/stance/Submission-Guidelines'], ['Stance OA', 'https://openjournals.bsu.edu/stance'],
  ['Episteme Denison', 'https://digitalcommons.denison.edu/episteme/'],
  ['Mudd AI', 'https://www.wlu.edu/mudd-center/mudd-undergraduate-journal-of-ethics/volume-10-spring-2025/journal-ai-policy'],
  ['RHUMJ', 'https://scholar.rose-hulman.edu/rhumj/'], ['RHUMJ policies', 'https://scholar.rose-hulman.edu/rhumj/policies.html'],
  ['SIURO', 'https://www.siam.org/publications/siam-journals/siam-undergraduate-research-online-siuro/'],
  ['UJMM', 'https://digitalcommons.usf.edu/ujmm/'], ['UJMM policies', 'https://digitalcommons.usf.edu/ujmm/policies.html'],
];
const RE = /[^.]{0,160}\b(AI|artificial intelligence|generative|ChatGPT|large language|LLM|fee|charge|cost|free|open access|undergraduate|any (institution|university|college)|sponsor|advisor|faculty|deadline|not accept|previously|preprint|published elsewhere)\b[^.]{0,200}\./gi;
(async () => {
  for (const [n, u] of P) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; research probe)' }, signal: AbortSignal.timeout(25000) });
      const t = await r.text();
      const title = ((/<title>([^<]*)<\/title>/i.exec(t) || [])[1] || '').trim().replace(/\s+/g, ' ');
      const plain = t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;/g, "'").replace(/\s+/g, ' ');
      console.log('==== ' + n + ' -> ' + r.status + ' ' + r.url + ' | ' + title.slice(0, 80));
      const seen = new Set();
      [...plain.matchAll(RE)].map((m) => m[0].trim()).filter((s) => { const k = s.slice(0, 60); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 12).forEach((s) => console.log('  - ' + s.slice(0, 380)));
    } catch (e) { console.log('==== ' + n + ' error ' + (e.cause ? e.cause.code || e.cause.message : e.message)); }
  }
})();
