// Prints the steps of Vercel's page on two-factor authentication.
const UA = 'sophaxis-probe (+https://github.com/cpsbvbng26-dotcom/sophaxis)';
const plain = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/\s+/g, ' ').trim();
(async () => {
  const r = await fetch('https://vercel.com/docs/two-factor-authentication', { headers: { 'User-Agent': UA } });
  const t = plain(await r.text());
  const i = t.indexOf('Two-factor authentication (2FA) adds');
  console.log(t.slice(i, i + 7000));
  const links = [...new Set((await (await fetch('https://vercel.com/docs/two-factor-authentication', { headers: { 'User-Agent': UA } })).text()).match(/https:\/\/vercel\.com\/account[^"' <)]*/g) || [])];
  console.log('\nACCOUNT LINKS\n' + links.join('\n'));
})();
