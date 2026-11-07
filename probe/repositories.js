'use strict';
/* One-off probe, never merged (read only): where the SSRN DOI of a paper points. */
(async () => {
  for (const d of ['10.2139/ssrn.7358779']) {
    try {
      const r = await fetch('https://doi.org/api/handles/' + d, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Sophaxis probe)' }, signal: AbortSignal.timeout(30000) });
      const j = await r.json();
      console.log('==== ' + d + ' -> ' + r.status + ' ' + JSON.stringify((j.values || []).filter((v) => v.type === 'URL').map((v) => v.data.value)));
    } catch (e) { console.log('==== ' + d + ' error ' + e.message); }
  }
})();
