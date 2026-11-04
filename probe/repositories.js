'use strict';
/* One-off probe, never merged (read only): the PDF of Zenodo record 23114131, as base64, to read its abstract. */
(async () => {
  const j = await (await fetch('https://zenodo.org/api/records/23114131', { headers: { 'User-Agent': 'Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)', Accept: 'application/json' } })).json();
  const f = j.files.find((x) => /\.pdf$/i.test(x.key));
  const b = Buffer.from(await (await fetch(f.links.self, { headers: { 'User-Agent': 'Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)', Accept: 'application/pdf, */*;q=0.8' } })).arrayBuffer());
  console.log('SIZE ' + b.length + ' ' + f.checksum);
  const s = b.toString('base64');
  for (let i = 0; i < s.length; i += 4000) console.log('B64 ' + s.slice(i, i + 4000));
})();
