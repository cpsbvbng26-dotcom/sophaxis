'use strict';
/* One-off probe, never merged (read only): the nusquama site from outside. */
const UA = { 'User-Agent': 'Sophaxis probe (https://github.com/cpsbvbng26-dotcom/sophaxis)' };
const KEYS = ['content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'strict-transport-security'];
(async () => {
  for (const u of ['https://nusquama.vercel.app/', 'https://nusquama.vercel.app/policies/terms.html', 'https://nusquama.vercel.app/favicon.ico', 'https://nusquama.vercel.app/og.png', 'https://nusquama.vercel.app/nowhere']) {
    const r = await fetch(u, { headers: UA, redirect: 'manual', signal: AbortSignal.timeout(30000) });
    const t = await r.text();
    console.log('==== ' + u + ' [' + r.status + '] ' + (r.headers.get('content-type') || '') + ' title=' + ((/<title>([^<]*)/.exec(t) || [])[1] || ''));
    for (const k of KEYS) console.log('  ' + k + ': ' + (r.headers.get(k) || '(none)'));
  }
})();
