'use strict';
/* One-off probe, never merged (read only): how OpenAlex holds the works listed on Sophaxis. */
const dois = ['10.6084/m9.figshare.34419198.v2', '10.2139/ssrn.7537983', '10.5281/zenodo.22057583', '10.5281/zenodo.22058254', '10.5281/zenodo.22064241', '10.5281/zenodo.22058624', '10.5281/zenodo.22058777', '10.5281/zenodo.22058964'];
(async () => {
  for (const d of dois) {
    const r = await fetch('https://api.openalex.org/works/https://doi.org/' + d, { headers: { 'User-Agent': 'Sophaxis probe (https://github.com/cpsbvbng26-dotcom/sophaxis)' } });
    if (!r.ok) { console.log(d + ' -> ' + r.status); continue; }
    const w = await r.json();
    console.log(d + ' -> ' + w.id + ' | type ' + w.type + ' | abstract ' + !!w.abstract_inverted_index + ' | locations ' + (w.locations || []).length
      + ' | oa ' + (w.open_access || {}).is_oa + ' | cited ' + w.cited_by_count + ' | indexed_in ' + JSON.stringify(w.indexed_in) + ' | updated ' + w.updated_date
      + ' | sophaxis ' + (w.locations || []).some((l) => /sophaxis/.test(l.landing_page_url || '')));
    await new Promise((ok) => setTimeout(ok, 300));
  }
})();
