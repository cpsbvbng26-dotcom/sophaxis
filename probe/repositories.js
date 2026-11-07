'use strict';
/* One-off probe, never merged (read only): the security headers that the live sites send. */
const UA = { 'User-Agent': 'Sophaxis probe (https://github.com/cpsbvbng26-dotcom/sophaxis)' };
const KEYS = ['content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy', 'cross-origin-opener-policy', 'strict-transport-security'];
(async () => {
  await new Promise((r) => setTimeout(r, 90000)); // let the deployments finish
  for (const u of ['https://sophaxis.vercel.app/', 'https://sophaxis.vercel.app/policies/terms.ja.html', 'https://sophaxis.vercel.app/disclaimer.ja.html',
                   'https://cpsbvbng26-dotcom.vercel.app/', 'https://research.nemoto200101.com/']) {
    try {
      const r = await fetch(u, { headers: UA, redirect: 'manual', signal: AbortSignal.timeout(30000) });
      console.log('==== ' + u + ' [' + r.status + ']');
      for (const k of KEYS) console.log('  ' + k + ': ' + (r.headers.get(k) || '(none)'));
    } catch (e) { console.log('==== ' + u + ' error ' + e.message); }
  }
})();
