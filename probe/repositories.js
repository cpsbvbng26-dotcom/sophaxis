const { execFileSync } = require('child_process');
const plain = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&laquo;|&raquo;/g, '"').replace(/\s+/g, ' ').trim();
const around = (t, re, n = 1500, max = 2) => { const out = []; const g = new RegExp(re, 'g'); let m; while ((m = g.exec(t)) && out.length < max) { out.push('…' + t.slice(Math.max(0, m.index - 100), m.index + n) + '…'); g.lastIndex = m.index + n; } return out.join('\n'); };
const sh = (c) => { try { return execFileSync('bash', ['-c', c], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); } catch (e) { return 'ERR ' + String(e.stdout || '') + String(e.stderr || e.message).slice(0, 600); } };
const get = (u) => {
  const out = sh(`curl -sSL --max-time 60 -A 'Mozilla/5.0 (compatible; sophaxis-probe)' -w '\\nHTTP %{http_code} %{url_effective}\\n' -o /tmp/g.bin '${u}' 2>&1`);
  const kind = sh('file -b /tmp/g.bin');
  let t = '';
  if (/PDF/.test(kind)) t = sh('pdftotext /tmp/g.bin - | tr -s "[:space:]" " "');
  else t = plain(sh(/1251|ISO-8859|Non-ISO/.test(kind) ? 'iconv -f cp1251 -t utf8 /tmp/g.bin' : 'cat /tmp/g.bin'));
  return { out: out.trim(), kind: kind.trim(), t };
};
const J = [
  ['152-FZ p1', 'http://www.kremlin.ru/acts/bank/24154/page/1', ['Статья 1\\. Сфера', 'Статья 2\\.', '1\\.1\\.', 'иностранн'], 1],
  ['152-FZ p2', 'http://www.kremlin.ru/acts/bank/24154/page/2', ['5\\. При сборе персональных данных', 'Статья 18\\.', 'иностранн'], 1],
  ['152-FZ p3', 'http://www.kremlin.ru/acts/bank/24154/page/3', ['5\\. При сборе персональных данных', 'Статья 22\\.', 'иностранн', 'Статья 18\\.'], 1],
  ['152-FZ p4', 'http://www.kremlin.ru/acts/bank/24154/page/4', ['5\\. При сборе персональных данных', 'Статья 22\\.', 'иностранн'], 1],
  ['236-FZ 2021 pdf', 'http://publication.pravo.gov.ru/file/pdf?eoNumber=0001202107010014', ['Статья 1', 'Статья 2', 'пятисот тысяч', '500', 'Статья 5', 'филиал', 'представительство'], 1],
];
for (const [name, u, keys] of J) {
  const r = get(u);
  console.log('\n===== ' + name + ' | ' + r.out.split('\n').pop() + ' | ' + r.kind.slice(0, 60) + ' | len ' + r.t.length + ' | ' + u);
  console.log('HEAD ' + r.t.slice(0, 300));
  for (const k of keys) { const x = around(r.t, k, 2200, 3); if (x) console.log('--- ' + k + '\n' + x); }
  if (/search|API/.test(name)) console.log('LINKS ' + [...new Set((sh('cat /tmp/g.bin').match(/nd=\d+|\/Document\/View\/\d+|"eoNumber":"\d+"/g) || []))].slice(0, 20).join(' '));
}
