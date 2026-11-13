'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const sha = (x) => crypto.createHash('sha256').update(x, 'utf8').digest('hex');
const NEW = '43336679823';
const raw = JSON.parse(fs.readFileSync('verification/sources-raw.json', 'utf8'));
const arts = fs.readdirSync('arts').filter((d) => fs.existsSync(path.join('arts', d, 'sources-full.json')));
const full = Object.fromEntries(arts.map((d) => [d, JSON.parse(fs.readFileSync(path.join('arts', d, 'sources-full.json'), 'utf8'))]));
const lines = (t) => t.replace(/([.!?:;]) (?=[A-Z0-9“"(])/g, '$1\n').replace(/ (?=(Hobby|Pro|Enterprise|Commercial|Examples|Asking|Any|Advert|Affiliate|Payment|Last updated)\b)/g, '\n') + '\n';
for (const k of Object.keys(raw.pages).filter((x) => x.startsWith('vercel-'))) {
  const want = raw.pages[k].sha256;
  let old = null, from = null;
  for (const d of arts) { if (d === NEW) continue; const p = (full[d].pages || {})[k]; if (p && typeof p.text === 'string' && sha(p.text) === want) { old = p.text; from = d; break; } }
  const nw = ((full[NEW] || {}).pages || {})[k];
  console.log('\n=====PAGE ' + k + ' recorded ' + want + ' old-from ' + from + ' new ' + (nw ? sha(nw.text) + ' len ' + nw.text.length : 'none'));
  if (!nw) continue;
  if (k === 'vercel-fair-use' || k === 'vercel-hobby') console.log('=====NEWTEXT ' + k + '\n' + lines(nw.text) + '=====END');
  if (!old) continue;
  fs.writeFileSync('/tmp/a', lines(old)); fs.writeFileSync('/tmp/b', lines(nw.text));
  let d = '';
  try { execFileSync('diff', ['-u', '/tmp/a', '/tmp/b'], { encoding: 'utf8' }); d = '(no difference)'; } catch (e) { d = e.stdout; }
  console.log('=====DIFF ' + k + '\n' + d + '=====END');
}
const vt = ((full[NEW] || {}).sources || {})['vercel-terms'];
console.log('=====TERMS articles in new run: ' + (vt ? Object.keys(vt.articles).join(',') : 'none'));
if (vt) for (const [a, t] of Object.entries(vt.articles)) console.log('ART ' + a + ' ' + sha(t) + ' recorded ' + ((raw.sources['vercel-terms'].sha256 || {})[a] || '-'));
