'use strict';
/* One-off probe, never merged (read only): how far Sophaxis is indexed (third pass: also the OAI register, Wikidata and re3data). */
const UA = { 'User-Agent': 'Sophaxis probe (https://github.com/cpsbvbng26-dotcom/sophaxis)' };
const get = async (u) => { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(40000) }); return [r.status, await r.text()]; };
(async () => {
  try { const [s, t] = await get('https://api.openalex.org/sources?search=sophaxis'); const j = JSON.parse(t); console.log('==== OpenAlex sources "sophaxis" -> ' + s + ' count=' + j.meta.count + ' ' + j.results.map((x) => x.display_name).join(', ')); } catch (e) { console.log('==== OpenAlex sources error ' + e.message); }
  try {
    const [s, t] = await get('https://api.openalex.org/works?filter=author.orcid:0009-0000-1406-0547&per_page=50&select=id,title,locations');
    const j = JSON.parse(t);
    const withS = j.results.filter((w) => (w.locations || []).some((l) => /sophaxis/i.test((l.landing_page_url || '') + (l.pdf_url || ''))));
    console.log('==== OpenAlex works by the ORCID -> ' + s + ' total=' + j.meta.count + ', with a Sophaxis location=' + withS.length);
    withS.forEach((w) => console.log('  - ' + w.title.slice(0, 60)));
  } catch (e) { console.log('==== OpenAlex works error ' + e.message); }
  const pages = ['', 'abs/2026.0001.html', 'abs/2026.0002.html', 'abs/2026.0003.html', 'abs/2026.0004.html', 'abs/2026.0005.html', 'automation.html', 'policies/takedown.html'];
  for (const p of pages) {
    try { const [s, t] = await get('https://archive.org/wayback/available?url=' + encodeURIComponent('https://sophaxis.vercel.app/' + p)); const c = (JSON.parse(t).archived_snapshots || {}).closest; console.log('==== Wayback /' + p + ' -> ' + (c && c.available ? c.timestamp : 'none')); } catch (e) { console.log('==== Wayback /' + p + ' error ' + e.message); }
  }
  try { const [s, t] = await get('https://web.archive.org/cdx/search/cdx?url=sophaxis.vercel.app*&output=json&fl=timestamp,original&collapse=urlkey&limit=500'); const rows = JSON.parse(t || '[]').slice(1); console.log('==== Wayback distinct addresses -> ' + s + ' ' + rows.length); } catch (e) { console.log('==== Wayback cdx error ' + e.message); }
  for (const u of ['https://doapr.coar-repositories.org/repositories/', 'https://doapr.coar-repositories.org/repositories/?q=sophaxis']) {
    try { const [s, t] = await get(u); console.log('==== DOAPR ' + u + ' -> ' + s + ' mentions Sophaxis: ' + /sophaxis/i.test(t) + ' | ' + ((/<title>([^<]*)/i.exec(t) || [])[1] || '').trim().slice(0, 60)); } catch (e) { console.log('==== DOAPR error ' + e.message); }
  }
  try { const [s, t] = await get('https://roar.eprints.org/27422/'); console.log('==== ROAR 27422 -> ' + s + ' mentions Sophaxis: ' + /sophaxis/i.test(t)); } catch (e) { console.log('==== ROAR error ' + e.message); }
  for (const u of ['https://oad.simmons.edu/oadwiki/Disciplinary_repositories', 'https://oad.simmons.edu/oadwiki/Disciplinary_repositories#Philosophy', 'https://philpapers.org/archives/', 'https://philarchive.org/archives']) {
    try { const [s, t] = await get(u); console.log('==== ' + u + ' -> ' + s + ' mentions Sophaxis: ' + /sophaxis/i.test(t)); } catch (e) { console.log('==== ' + u + ' error ' + e.message); }
  }
  try { const [s, t] = await get('https://api.openalex.org/works?search=sophaxis&per_page=10&select=id,title,locations'); const j = JSON.parse(t); console.log('==== OpenAlex works search "sophaxis" -> ' + s + ' count=' + j.meta.count); } catch (e) { console.log('==== OpenAlex search error ' + e.message); }
  for (const u of ['https://www.openarchives.org/Register/BrowseSites', 'https://www.wikidata.org/w/api.php?action=wbsearchentities&search=Sophaxis&language=en&format=json', 'https://www.re3data.org/api/beta/repositories?query=sophaxis']) {
    try { const [s, t] = await get(u); console.log('==== ' + u + ' -> ' + s + ' mentions Sophaxis: ' + /sophaxis/i.test(t)); } catch (e) { console.log('==== ' + u + ' error ' + e.message); }
  }
  try { const [s, t] = await get('https://sophaxis.vercel.app/robots.txt'); console.log('==== robots.txt -> ' + s + '\n' + t); } catch (e) { console.log('==== robots error ' + e.message); }
})();
