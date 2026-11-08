const { execFileSync } = require('child_process');
const plain = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const around = (t, re, n = 1500, max = 2) => { const out = []; const g = new RegExp(re, 'g'); let m; while ((m = g.exec(t)) && out.length < max) { out.push('…' + t.slice(Math.max(0, m.index - 100), m.index + n) + '…'); g.lastIndex = m.index + n; } return out.join('\n'); };
const sh = (c) => { try { return execFileSync('bash', ['-c', c], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); } catch (e) { return 'ERR ' + String(e.stdout || '') + String(e.stderr || e.message).slice(0, 600); } };
const urls = ['https://www2.camara.leg.br/legin/fed/lei/2018/lei-13709-14-agosto-2018-787077-publicacaooriginal-156212-pl.html', 'https://www2.camara.leg.br/legin/fed/lei/2018/lei-13709-14-agosto-2018-787077-norma-pl.html'];
for (const u of urls) {
  const out = sh(`curl -sSL --max-time 60 -A 'Mozilla/5.0 (compatible; sophaxis-probe)' -w '\\nHTTP %{http_code}\\n' -o /tmp/l.html '${u}' 2>&1; file /tmp/l.html`);
  console.log('\n===== ' + u + ' | ' + out.slice(0, 600));
  const host = new URL(u).host;
  if (/SSL|certificate/.test(out)) console.log(sh(`echo | openssl s_client -connect ${host}:443 -servername ${host} 2>/dev/null | openssl x509 -noout -subject -issuer -ext authorityInfoAccess`));
  const raw = sh('if file /tmp/l.html | grep -q ISO-8859; then iconv -f latin1 -t utf8 /tmp/l.html; else cat /tmp/l.html; fi');
  const t = plain(raw);
  console.log('len ' + t.length + '\nRAW ' + raw.slice(0, 1500) + '\nAPI ' + [...new Set(raw.match(/["'](\/?api\/[^"']{2,120}|https?:\/\/[^"' ]*api[^"' ]{0,100})["']/g) || [])].slice(0, 20).join(' '));
  for (const k of ['Art\\. 3º', 'Art\\. 4º', 'Art\\. 41', 'representante', 'Art\\. 55-J']) { const x = around(t, k, 1300, 1); if (x) console.log('--- ' + k + '\n' + x); }
}

{
  sh("curl -sSL --max-time 90 -o /tmp/in.pdf 'https://prsindia.org/files/bills_acts/acts_parliament/2023/Digital_Personal_Data_Protection_Act,_2023.pdf'");
  const t = sh('pdftotext /tmp/in.pdf - | tr -s "[:space:]" " "');
  console.log('\n===== India Act definitions | len ' + t.length);
  for (const k of ['“child” means', 'verifiable consent of the parent', '9\\. \\(1\\)']) { const x = around(t, k, 900, 1); if (x) console.log('--- ' + k + '\n' + x); }
}
