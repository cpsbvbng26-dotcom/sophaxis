'use strict';
/* One-off probe, never merged (read only): which Accept header does Zenodo's file endpoint take? */
const UA = 'Sophaxis/1.0 (+https://sophaxis.vercel.app/; probe)';
const ids = ['22057583', '22058624'];
(async () => {
  for (const id of ids) {
    const a = await (await fetch('https://zenodo.org/api/records/' + id, { headers: { 'User-Agent': UA, Accept: 'application/json' } })).json();
    for (const f of a.files || []) {
      console.log('==== ' + id + ' ' + f.key + ' size=' + f.size + ' ' + f.checksum);
      console.log('links ' + JSON.stringify(f.links));
      for (const acc of ['application/pdf', '*/*', 'application/pdf, application/octet-stream;q=0.9, */*;q=0.8', 'application/octet-stream']) {
        try {
          const r = await fetch(f.links.self, { headers: { 'User-Agent': UA, Accept: acc }, redirect: 'follow' });
          const b = Buffer.from(await r.arrayBuffer());
          console.log(JSON.stringify(acc) + ' -> ' + r.status + ' ' + r.headers.get('content-type') + ' bytes=' + b.length + ' head=' + JSON.stringify(b.subarray(0, 5).toString('latin1')));
        } catch (e) { console.log(JSON.stringify(acc) + ' error ' + e.message); }
      }
    }
  }
})();
