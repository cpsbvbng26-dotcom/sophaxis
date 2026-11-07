'use strict';
/* One-off probe, never merged (read only): registries and aggregators that may take Sophaxis, and what they ask. */
const U = [
  ['BASE suggest', 'https://www.base-search.net/about/en/suggest.php'],
  ['BASE content providers', 'https://www.base-search.net/about/en/about_sources_date.php'],
  ['OpenDOAR', 'https://v2.sherpa.ac.uk/opendoar/'],
  ['OpenDOAR policies', 'https://v2.sherpa.ac.uk/opendoar/policytool/'],
  ['Jisc OpenDOAR inclusion', 'https://www.jisc.ac.uk/opendoar'],
  ['CORE data providers', 'https://core.ac.uk/data-providers'],
  ['CORE join', 'https://core.ac.uk/join'],
  ['OpenAIRE PROVIDE', 'https://provide.openaire.eu/'],
  ['re3data suggest', 'https://www.re3data.org/suggest'],
  ['IA Scholar', 'https://scholar.archive.org/'],
  ['Google Scholar inclusion', 'https://scholar.google.com/intl/en/scholar/inclusion.html'],
];
const words = /(individual|personal|institution|organi[sz]ation|free of charge|no charge|criteria|must|OAI-PMH|eligib)[^.<]{0,140}/gi;
(async () => {
  for (const [n, u] of U) {
    try {
      const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Sophaxis probe)' }, signal: AbortSignal.timeout(30000) });
      const t = await r.text();
      const text = t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      console.log('==== ' + n + ' -> ' + r.status + ' ' + r.url + ' | ' + ((/<title>([^<]*)/i.exec(t) || [])[1] || '').trim().slice(0, 70));
      [...new Set([...text.matchAll(words)].map((m) => m[0].trim()))].slice(0, 6).forEach((x) => console.log('  - ' + x.slice(0, 200)));
    } catch (e) { console.log('==== ' + n + ' error ' + (e.cause ? e.cause.code || e.cause.message : e.message)); }
  }
})();
