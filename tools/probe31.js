#!/usr/bin/env node
/* Probe (2026-11-15, the owner's answers to the audit): prints windows of the pages and laws named in probe31.json,
 * so that the quotations can be chosen. Not to be merged. */
'use strict';
const fs = require('fs');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const CONF = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const UA = CONF.ua;
const sha = (x) => crypto.createHash('sha256').update(x, 'utf8').digest('hex');
const plain = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#39;|&rsquo;|&#8217;/g, '’').replace(/&lsquo;|&#8216;/g, '‘').replace(/&ldquo;|&#8220;/g, '“').replace(/&rdquo;|&#8221;/g, '”')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d))
  .normalize('NFC').replace(/\s+/g, ' ').trim();
const curl = (url) => {
  try {
    const out = execFileSync('curl', ['-sSL', '--compressed', '--max-time', '90', '-A', UA, '-o', '/tmp/p.out', '-w', '%{http_code} %{url_effective}', url], { encoding: 'utf8' });
    const [status, final] = out.trim().split(' ');
    return { status: +status, final, raw: fs.readFileSync('/tmp/p.out', 'utf8') };
  } catch (e) { return { status: 'error ' + String(e.message).slice(0, 200) }; }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  for (const p of CONF.pages || []) {
    let r = curl(p.url);
    let text = r.raw ? plain(r.raw) : '';
    const bad = (t, s) => s !== 200 || t.length < 400 || /Javascript is required|enable JavaScript|Just a moment|Access Denied/i.test(t.slice(0, 600));
    if (p.alt && bad(text, r.status)) { console.log('=====TRIED ' + p.key + ' ' + r.status + ' ' + text.length + ' ' + text.slice(0, 200)); await sleep(1500); r = curl(p.alt); text = r.raw ? plain(r.raw) : ''; }
    console.log('=====PAGE ' + p.key + ' status=' + r.status + ' final=' + r.final + ' length=' + text.length + ' sha256=' + sha(text));
    console.log('HEAD|' + text.slice(0, 500));
    if (p.links && r.raw) {
      const L = [...r.raw.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((m) => [plain(m[2]).slice(0, 80), m[1]]).filter(([t, h]) => new RegExp(p.links, 'i').test(t + ' ' + h));
      console.log('LINKS|' + JSON.stringify(L.slice(0, 60)));
    }
    if (p.all) { for (let i = 0; i < Math.min(text.length, p.all); i += 500) console.log('|' + text.slice(i, i + 500)); }
    else {
      const re = new RegExp(p.kw, 'gi'); const spans = []; let m;
      while ((m = re.exec(text))) { const s = Math.max(0, m.index - (p.before || 300)), e = Math.min(text.length, m.index + (p.after || 700)); const l = spans[spans.length - 1]; if (l && s <= l[1]) l[1] = Math.max(l[1], e); else spans.push([s, e]); }
      for (const [s, e] of spans.slice(0, p.max || 25)) console.log('WIN ' + s + '|' + text.slice(s, e));
    }
    await sleep(1500);
  }
  if (CONF.egovFind) {
    const xml = (curl('https://laws.e-gov.go.jp/api/1/lawlists/1').raw || '');
    const rows = [...xml.matchAll(/<LawNameListInfo>([\s\S]*?)<\/LawNameListInfo>/g)].map((m) => ({ id: (/<LawId>([^<]*)/.exec(m[1]) || [])[1], name: (/<LawName>([^<]*)/.exec(m[1]) || [])[1], no: (/<LawNo>([^<]*)/.exec(m[1]) || [])[1] }));
    console.log('=====EGOV list ' + rows.length);
    for (const r of rows) if (new RegExp(CONF.egovFind).test(r.name || '')) console.log('EGOV ' + r.id + ' | ' + r.name + ' | ' + r.no);
  }
  for (const L of CONF.egov || []) {
    await sleep(1500);
    const xml = curl('https://laws.e-gov.go.jp/api/1/lawdata/' + L.id).raw || '';
    const title = (/<LawTitle[^>]*>([^<]*)<\/LawTitle>/.exec(xml) || [])[1] || '';
    const main = (/<MainProvision[\s\S]*?<\/MainProvision>/.exec(xml) || [''])[0];
    console.log('=====LAW ' + L.id + ' ' + title + ' ' + xml.length);
    const arts = [...main.matchAll(/<Article[^>]*\sNum="([^"]+)"[^>]*>[\s\S]*?<\/Article>/g)];
    const pl = (x) => x.replace(/<Rt>[^<]*<\/Rt>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!arts.length) console.log('NOART|' + pl(main).slice(0, 3000));
    for (const a of arts) if (!L.arts || L.arts.includes(a[1])) { const t = pl(a[0]); console.log('ART ' + a[1] + ' sha=' + sha(t) + '|' + t.slice(0, L.cap || 2500)); }
  }
})();
