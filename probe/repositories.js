'use strict';
/* One-off probe, never merged (read only): what the old solitary-school.vercel.app copy says, against the current rules. */
const UA = { 'User-Agent': 'Sophaxis probe (https://github.com/cpsbvbng26-dotcom/sophaxis)' };
(async () => {
  for (const u of ['https://solitary-school.vercel.app/', 'https://jakusha-dansei-note.vercel.app/']) {
    const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(30000) });
    const t = (await r.text()).replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    console.log('==== ' + u + ' [' + r.status + '] chars=' + t.length);
    for (const w of ['父', '母', 'コンサル', 'ライブ配信', 'シーランド', '独立研究者', '研究者', 'DOI', 'zenodo', 'Claude', '査読']) {
      const i = t.indexOf(w);
      console.log('  ' + w + ': ' + (i < 0 ? '-' : (t.split(w).length - 1) + ' | ' + t.slice(Math.max(0, i - 40), i + 40)));
    }
    console.log('  head: ' + t.slice(0, 300));
  }
})();
