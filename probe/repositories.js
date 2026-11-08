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
  ['152-FZ pravo.gov.ru', 'http://pravo.gov.ru/proxy/ips/?docbody=&nd=102108261', ['Статья 1\\. Сфера', 'Статья 3\\. Основные', '5\\. При сборе персональных данных', 'Статья 22'], 1],
  ['152-FZ kremlin', 'http://www.kremlin.ru/acts/bank/24154', ['Статья 1', '5\\. При сборе', 'Статья 22'], 1],
  ['152-FZ kremlin text', 'http://www.kremlin.ru/acts/bank/24154/page/1', ['Статья 1', '5\\. При сборе'], 1],
  ['236-FZ pravo search', 'http://pravo.gov.ru/proxy/ips/?searchres=&bpas=cd00000&a8=236-%D4%C7&a8type=1&a7type=3&a7from=01.07.2021&a7to=01.07.2021', ['236-ФЗ', 'иностранных лиц'], 0],
  ['publication API 236', 'http://publication.pravo.gov.ru/api/Documents?PageSize=10&Index=1&Number=236-%D0%A4%D0%97&DocumentDate=01.07.2021', ['236', 'eoNumber'], 0],
  ['RKN foreign persons', 'https://rkn.gov.ru/activity/connection/register-foreign-persons/', ['500', 'иностранн'], 0],
];
for (const [name, u, keys] of J) {
  const r = get(u);
  console.log('\n===== ' + name + ' | ' + r.out.split('\n').pop() + ' | ' + r.kind.slice(0, 60) + ' | len ' + r.t.length + ' | ' + u);
  console.log('HEAD ' + r.t.slice(0, 300));
  for (const k of keys) { const x = around(r.t, k, 1500, 2); if (x) console.log('--- ' + k + '\n' + x); }
  if (/search|API/.test(name)) console.log('LINKS ' + [...new Set((sh('cat /tmp/g.bin').match(/nd=\d+|\/Document\/View\/\d+|"eoNumber":"\d+"/g) || []))].slice(0, 20).join(' '));
}
/* The live site against main. */
for (const p of ['index.html', 'policies/privacy.html', 'policies/submission.html', 'submit.html']) {
  const a = sh(`curl -sSL --max-time 30 https://sophaxis.vercel.app/${p} | sha256sum`), b = sh(`curl -sSL --max-time 30 https://raw.githubusercontent.com/cpsbvbng26-dotcom/sophaxis/main/site/${p} | sha256sum`);
  console.log('LIVE ' + p + ' ' + (a === b ? 'same' : 'DIFFERENT ' + a.slice(0, 12) + ' ' + b.slice(0, 12)));
}
