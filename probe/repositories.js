'use strict';
/* One-off probe, never merged (read only): the operator's CV page in HAL, and whether it links an X account. */
(async () => {
  for (const u of ['https://cv.hal.science/nemoto-takuya', 'https://hal.science/hal-05759080v1']) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)' } });
      const t = await r.text();
      const title = (/<title>([^<]*)<\/title>/i.exec(t) || [])[1];
      console.log('==== ' + u + ' -> ' + r.status + ' ' + r.url + ' | ' + (title || '').trim().replace(/\s+/g, ' '));
      [...t.matchAll(/href="([^"]*(twitter\.com|x\.com|orcid\.org|linkedin|researchmap|idref|scholar\.google)[^"]*)"/gi)].map((m) => m[1]).filter((v, i, a) => a.indexOf(v) === i).forEach((l) => console.log('  ' + l));
    } catch (e) { console.log('==== ' + u + ' error ' + e.message); }
  }
})();
