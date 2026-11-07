// The works the MetaArXiv manuscript would cite: their metadata at Crossref or DataCite. Read only.
const UA = { 'User-Agent': 'sophaxis-probe (https://github.com/cpsbvbng26-dotcom/sophaxis)' };
const titles = [
  'Does it feel like a scientific paper? A qualitative analysis of preprint servers moderation and quality assurance processes',
  'Preprint servers and journals: Rivals or allies?',
  'Systematic examination of preprint platforms for use in the medical and biomedical sciences setting',
  'Principles for Open Scholarly Infrastructures',
  'Preprints in motion: tracking changes between posting and journal publication',
  'Overlay journals: a study of the current landscape',
];
async function j(url) { const r = await fetch(url, { headers: UA }); return { status: r.status, body: await r.text() }; }
(async () => {
  for (const t of titles) {
    console.log('\n### ' + t);
    const r = await j('https://api.crossref.org/works?rows=3&select=DOI,title,author,issued,type,container-title,group-title,publisher&query.bibliographic=' + encodeURIComponent(t));
    try {
      for (const w of JSON.parse(r.body).message.items) {
        console.log('  CR', w.DOI, '|', (w.title || [])[0], '|', (w.author || []).map((a) => (a.family || a.name) + (a.given ? ', ' + a.given : '')).join('; '), '|', JSON.stringify((w.issued || {})['date-parts']), '|', w.type, '|', (w['container-title'] || [])[0] || w['group-title'] || w.publisher);
      }
    } catch (e) { console.log('  CR', r.status, r.body.slice(0, 200)); }
    const d = await j('https://api.datacite.org/dois?page[size]=3&query=' + encodeURIComponent('titles.title:"' + t.replace(/[":?]/g, '') + '"'));
    try {
      for (const w of JSON.parse(d.body).data) {
        const a = w.attributes;
        console.log('  DC', a.doi, '|', (a.titles || [])[0].title, '|', (a.creators || []).map((c) => c.name).join('; '), '|', a.publicationYear, '|', a.publisher, '|', (a.types || {}).resourceTypeGeneral);
      }
    } catch (e) { console.log('  DC', d.status, d.body.slice(0, 200)); }
  }
})();
