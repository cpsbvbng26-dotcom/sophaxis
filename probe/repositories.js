'use strict';
/* One-off probe, never merged (read only): is Sophaxis in the OAI-PMH registry of data providers? */
(async () => {
  for (const u of ['https://www.openarchives.org/Register/BrowseSites', 'https://www.openarchives.org/Register/BrowseSites?viewRecord=' + encodeURIComponent('https://sophaxis.vercel.app/oai')]) {
    try {
      const r = await fetch(u);
      const t = await r.text();
      const i = t.toLowerCase().indexOf('sophaxis');
      console.log('==== ' + u + ' -> ' + r.status + ' ' + t.length + ' bytes; sophaxis at ' + i);
      if (i >= 0) console.log(t.slice(Math.max(0, i - 400), i + 400).replace(/\s+/g, ' '));
    } catch (e) { console.log('==== ' + u + ' error ' + e.message); }
  }
})();
