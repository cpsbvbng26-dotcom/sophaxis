'use strict';
/* One-off probe, never merged (read only): where JOSS takes volunteer reviewers. */
const U = [
  'https://reviewers.joss.theoj.org/',
  'https://joss.readthedocs.io/en/latest/reviewer_guidelines.html',
  'https://joss.theoj.org/',
  'https://joss.readthedocs.io/en/latest/editorial_guide.html',
];
(async () => {
  for (const u of U) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Sophaxis probe)' }, signal: AbortSignal.timeout(30000) });
      const t = await r.text();
      console.log('==== ' + u + ' -> ' + r.status + ' ' + r.url + ' | ' + ((/<title>([^<]*)/i.exec(t) || [])[1] || '').trim().slice(0, 80));
      const links = [...t.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => [m[1], m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()])
        .filter(([h, x]) => /review|volunteer|sign ?up|join|register/i.test(h + ' ' + x));
      [...new Map(links.map((l) => [l[0], l])).values()].slice(0, 12).forEach(([h, x]) => console.log('  - ' + x.slice(0, 60) + ' <' + h + '>'));
      const said = [...t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').matchAll(/[^.]{0,120}(volunteer|sign up)[^.]{0,160}\./gi)].slice(0, 4).map((m) => m[0].trim());
      said.forEach((s) => console.log('  > ' + s.slice(0, 280)));
    } catch (e) { console.log('==== ' + u + ' error ' + (e.cause ? e.cause.code || e.cause.message : e.message)); }
  }
})();
