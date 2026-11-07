'use strict';
/* One-off probe, never merged (read only): the golden-window headers, and whether three old Vercel projects can be read from outside. */
const UA = { 'User-Agent': 'Sophaxis probe (https://github.com/cpsbvbng26-dotcom/sophaxis)' };
const KEYS = ['content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy', 'cross-origin-opener-policy', 'strict-transport-security'];
(async () => {
  await new Promise((r) => setTimeout(r, 90000));
  for (const u of ['https://golden-window-conjecture.vercel.app/']) {
    const r = await fetch(u, { headers: UA, redirect: 'manual', signal: AbortSignal.timeout(30000) });
    console.log('==== ' + u + ' [' + r.status + ']');
    for (const k of KEYS) console.log('  ' + k + ': ' + (r.headers.get(k) || '(none)'));
  }
  for (const u of ['https://portfolio-eight-ashen-a2e98yzjuk.vercel.app/', 'https://portfolio-cpsbvbng26-dotcoms-projects.vercel.app/',
                   'https://jakusha-dansei-note.vercel.app/', 'https://solitary-school.vercel.app/']) {
    try {
      const r = await fetch(u, { headers: UA, redirect: 'manual', signal: AbortSignal.timeout(30000) });
      const t = await r.text();
      console.log('==== ' + u + ' [' + r.status + '] location=' + (r.headers.get('location') || '') + ' title=' + ((/<title>([^<]*)/i.exec(t) || [])[1] || '').slice(0, 60));
    } catch (e) { console.log('==== ' + u + ' error ' + e.message); }
  }
})();
