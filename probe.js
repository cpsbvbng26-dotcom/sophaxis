'use strict';
const fs = require('fs'), crypto = require('crypto'), { execFileSync } = require('child_process');
const sha = (x) => crypto.createHash('sha256').update(x, 'utf8').digest('hex');
const raw = JSON.parse(fs.readFileSync('verification/sources-raw.json', 'utf8'));
const old = JSON.parse(fs.readFileSync('old-raw.json', 'utf8'));
const nw = JSON.parse(fs.readFileSync('arts/43336679823/sources-full.json', 'utf8'));
const lines = (t) => t.replace(/([.!?:;]) (?=[A-Z0-9“"(])/g, '$1\n').replace(/ (?=(Hobby|Pro|Enterprise|Commercial|Examples|Asking|Any|Advert|Affiliate|Payment|Last updated|Last Updated)\b)/g, '\n') + '\n';
for (const k of Object.keys(raw.pages).filter((x) => x.startsWith('vercel-'))) {
  const o = (old.pages[k] || {}).text, n = (nw.pages[k] || {}).text;
  console.log('\n=====PAGE ' + k + ' recorded ' + raw.pages[k].sha256 + ' old ' + (o ? sha(o) + ' len ' + o.length : '-') + ' new ' + (n ? sha(n) + ' len ' + n.length : '-'));
  if (!o || !n) continue;
  fs.writeFileSync('/tmp/a', lines(o)); fs.writeFileSync('/tmp/b', lines(n));
  let d = '';
  try { execFileSync('diff', ['-U0', '/tmp/a', '/tmp/b'], { encoding: 'utf8' }); d = '(no difference)'; } catch (e) { d = e.stdout; }
  console.log('=====DIFF ' + k + '\n' + d + '=====END');
}
