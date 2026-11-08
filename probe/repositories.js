// Finds Vercel's own documentation on two-factor authentication for an account, and prints it.
const UA = 'sophaxis-probe (+https://github.com/cpsbvbng26-dotcom/sophaxis)';
const plain = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/\s+/g, ' ').trim();
async function get(u) { try { const r = await fetch(u, { headers: { 'User-Agent': UA } }); return { status: r.status, url: r.url, body: await r.text() }; } catch (e) { return { status: 'ERR ' + e.message, url: u, body: '' }; } }
(async () => {
  const sm = await get('https://vercel.com/docs/sitemap.md');
  console.log('sitemap ' + sm.status + ' len ' + sm.body.length);
  const lines = sm.body.split('\n').filter((l) => /two-factor|2fa|two factor|multi-factor|mfa|passkey|login-methods|authentication-methods|account-management|accounts\//i.test(l));
  console.log(lines.slice(0, 60).join('\n'));
  const urls = [...new Set(lines.join('\n').match(/https:\/\/vercel\.com\/docs\/[^\s)\]]+/g) || [])].filter((u) => /two-factor|2fa|mfa|login|account/i.test(u)).slice(0, 6);
  for (const u of ['https://vercel.com/docs/two-factor-authentication', 'https://vercel.com/docs/accounts/account-management', ...urls]) {
    const r = await get(u.replace(/\.md$/, ''));
    const t = plain(r.body);
    const i = t.search(/two-factor|2FA/i);
    console.log('\n=== ' + u + ' ' + r.status + ' ' + r.url + '\n' + (i >= 0 ? t.slice(Math.max(0, i - 300), i + 3500) : t.slice(0, 600)));
  }
})();
