'use strict';
/* One-off probe, never merged (read only): what the OAI-PMH registry pages say now. */
(async () => {
  for (const u of ['https://www.openarchives.org/Register/BrowseSites', 'https://www.openarchives.org/Register/ValidateSite']) {
    const t = await (await fetch(u)).text();
    console.log('==== ' + u);
    console.log(t.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 1500));
  }
})();
