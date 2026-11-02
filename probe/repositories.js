'use strict';
/* One-off probe, never merged: the Figshare and OSF profile pages of the operator, read from public APIs. */
const UA = 'Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)';
const get = async (u) => { const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/json' } }); return { status: r.status, t: await r.text() }; };
(async () => {
  const fs = await get('https://api.figshare.com/v2/articles/34419198');
  try { const j = JSON.parse(fs.t); console.log('figshare authors', JSON.stringify(j.authors)); console.log('figshare url_public_html', j.url_public_html); } catch (e) { console.log('figshare', fs.status, fs.t.slice(0, 200)); }
  try {
    const a = JSON.parse(fs.t).authors || [];
    for (const x of a) { const r = await get('https://api.figshare.com/v2/account/authors/' + x.id); console.log('figshare author', x.id, r.status, r.t.slice(0, 300)); }
  } catch (e) { /* */ }
  const c = await get('https://api.osf.io/v2/nodes/mq7za/contributors/?embed=users');
  try {
    for (const x of JSON.parse(c.t).data) {
      const u = x.embeds.users.data;
      console.log('osf user', u.id, u.attributes.full_name, 'html=' + (u.links && u.links.html), 'orcid=' + JSON.stringify((u.attributes.social || {}).orcid || ''), 'bibliographic=' + x.attributes.bibliographic);
    }
  } catch (e) { console.log('osf', c.status, c.t.slice(0, 200)); }
})();
