'use strict';
/* One-off probe, never merged (read only): what Zenodo holds for seven records, and the opening of one PDF. */
const { execFileSync } = require('child_process');
const fs = require('fs');
const ids = ['22055709', '22057583', '22058254', '22058777', '22058964', '22064241', '23114131'];
(async () => {
  for (const id of ids) {
    try {
      const r = await fetch('https://zenodo.org/api/records/' + id, { headers: { 'User-Agent': 'Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)', Accept: 'application/json' } });
      const j = await r.json();
      const m = j.metadata || {};
      console.log('==== ' + id + ' -> ' + r.status + ' | desc ' + (m.description || '').length + ' | kw ' + JSON.stringify(m.keywords || []) + ' | lang ' + m.language + ' | files ' + (j.files || []).map((f) => f.key).join(', '));
      if (id === '23114131' && j.files && j.files[0]) {
        const f = j.files.find((x) => /\.pdf$/i.test(x.key));
        const p = await fetch(f.links.self, { headers: { 'User-Agent': 'Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)', Accept: 'application/pdf, */*;q=0.8' } });
        fs.writeFileSync('/tmp/a.pdf', Buffer.from(await p.arrayBuffer()));
        console.log(execFileSync('pdftotext', ['-l', '2', '/tmp/a.pdf', '-'], { encoding: 'utf8' }).split('\n').slice(0, 70).join('\n'));
      }
    } catch (e) { console.log('==== ' + id + ' error ' + e.message); }
  }
})();
