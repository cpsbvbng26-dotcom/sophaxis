#!/usr/bin/env node
/* Fetches the primary texts that the legal pages cite, and keeps the cited articles in verification/sources-raw.json,
 * with the address, the HTTP status and the day each was fetched.
 *
 * What to fetch is read from the pages themselves: tools/citations.js finds every numbered citation in the files that
 * verification/citations.json lists, and gives each its law. For each law with a source here, the text is fetched once,
 * cut into its articles (or sections) by the headings the source uses, and the cited ones are kept word for word,
 * together with the list of every heading found. Japanese laws are fetched from the e-Gov law API (v1), and reduced to
 * plain characters exactly as tools/statutes.js does, so that a text kept by both has the same SHA-256.
 *
 * verification/check.js then confirms that every citation is to an article that is in a fetched text, and that every
 * quotation on the site (verification/sources.json) occurs in the text it names. Nothing here is written by hand.
 *
 * Run from GitHub Actions (the hosts are not reachable from every machine); PDFs need pdftotext (poppler-utils):
 *   node tools/sources.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const Cit = require('./citations.js');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'verification', 'sources-raw.json');
const REG = JSON.parse(fs.readFileSync(path.join(ROOT, 'verification', 'citations.json'), 'utf8'));
const UA = 'Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* The foreign sources. `split` finds the headings in the plain text (the number is the first group);
 * `html` finds them in the markup instead, where the source marks its headings; `pages` are joined in order;
 * `each` fetches one page for each cited article, with {n} replaced by its number. */
const CELLAR = { accept: 'application/xhtml+xml, text/html;q=0.9', lang: 'eng', html: /<p[^>]*class="(?:oj-)?ti-art"[^>]*>\s*(?:<span[^>]*>)?\s*Article\s+(\d+)\s*(?:<\/span>)?\s*<\/p>/g };
const SOURCES = {
  gdpr: { url: 'https://publications.europa.eu/resource/celex/32016R0679', ...CELLAR },
  dsa: { url: 'https://publications.europa.eu/resource/celex/32022R2065', ...CELLAR },
  dsm: { url: 'https://publications.europa.eu/resource/celex/32019L0790', ...CELLAR },
  'directive-2015-1535': { url: 'https://publications.europa.eu/resource/celex/32015L1535', ...CELLAR },
  'uk-gdpr': { each: 'https://www.legislation.gov.uk/eur/2016/679/article/{n}', from: /Article (\d+)\s+[A-Z]/ },
  osa: { each: 'https://www.legislation.gov.uk/ukpga/2023/50/section/{n}', from: /\b(\d+)\s+[“"]?[A-Z]/ },
  coppa: { url: 'https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-16?part=312', split: /§ ?312\.(\d+) / , whole: '312' },
  usc17: { url: 'https://www.law.cornell.edu/uscode/text/17/512', whole: '512', needle: 'Limitations on liability relating to material online' },
  fadp: { url: 'https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/2022/491/20230901/en/html/fedlex-data-admin-ch-eli-cc-2022-491-20230901-en-html-5.html', split: /\bArt\. (\d+) [A-Z]/g },
  anpd: { url: 'https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022', split: /\bArt\. (\d+)º?\.? /g },
  lgpd: { url: 'https://www2.camara.leg.br/legin/fed/lei/2018/lei-13709-14-agosto-2018-787077-publicacaooriginal-156212-pl.html', split: /\bArt\. (\d+)º?\.? /g },
  pipl: { pages: ['http://en.npc.gov.cn.cdurl.cn/2021-12/29/c_694559.htm', 'http://en.npc.gov.cn.cdurl.cn/2021-12/29/c_694559_2.htm', 'http://en.npc.gov.cn.cdurl.cn/2021-12/29/c_694559_3.htm', 'http://en.npc.gov.cn.cdurl.cn/2021-12/29/c_694559_4.htm'], split: /\bArticle (\d+) /g },
  'thai-pdpa': { url: 'https://www.etda.or.th/getattachment/e820df2c-848f-4e03-86cb-a9dad38cc713/ENG-Version.aspx', split: /\bSection (\d+) /g },
  'saudi-pdpl': { url: 'https://sdaia.gov.sa/en/SDAIA/about/Documents/Personal%20Data%20English%20V2-23April2023-%20Reviewed-.pdf', split: /\bArticle \(?(\d+|One|Two|Three)\)? /g },
  'india-act': { url: 'https://prsindia.org/files/bills_acts/acts_parliament/2023/Digital_Personal_Data_Protection_Act,_2023.pdf', split: / (\d+)\. (?=\(1\) |[A-Z])/g, max: 44, after: 'BE it enacted' },
  // The eGazette's server does not send its intermediate certificate, so the Ministry's own copy is read.
  'india-rules': { url: 'https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf', split: / (\d+)\. (?=[A-Z])/g, max: 23 },
  'korea-pipa': { url: 'https://elaw.klri.re.kr/eng_service/lawViewContent.do?hseq=62389', split: /\bArticle (\d+(?:-\d+)?) \((?=[A-Z][a-z])/g },
  'korea-decree': { url: 'https://elaw.klri.re.kr/eng_service/lawViewContent.do?hseq=66066', split: /\bArticle (\d+(?:-\d+)?) \((?=[A-Z][a-z])/g },
  'ru-152': { pages: ['http://www.kremlin.ru/acts/bank/24154/page/1', 'http://www.kremlin.ru/acts/bank/24154/page/2', 'http://www.kremlin.ru/acts/bank/24154/page/3', 'http://www.kremlin.ru/acts/bank/24154/page/4'], split: /Статья (\d+(?:\.\d+)?)\. /g },
  kz: { url: 'https://adilet.zan.kz/rus/docs/Z1300000094', split: /Статья (\d+)\. /g },
  // At the commit that the weekly watch recorded (verification/statutes.json), so that both read the same text.
  'github-terms': { url: 'https://raw.githubusercontent.com/github/site-policy/' + JSON.parse(fs.readFileSync(path.join(ROOT, 'verification', 'statutes.json'), 'utf8')).policies.find((p) => p.name === 'GitHub Terms of Service').commit + '/Policies/github-terms/github-terms-of-service.md', markdown: true },
  'vercel-terms': { url: 'https://vercel.com/legal/terms', split: /(?:^| )(\d+)\. (?=[A-Z][A-Za-z ,&'’-]{2,60} )/g },
  'jacar-top': { url: 'https://www.jacar.go.jp/', whole: 'all', links: true, lang: 'ja' },
  'jacar-record': { url: 'https://www.jacar.archives.go.jp/das/meta/C12070491000', whole: 'all', links: true, lang: 'ja' },
  'jacar-guide': { pages: ['https://www.jacar.go.jp/about/', 'https://www.jacar.go.jp/glossary/', 'https://www.jacar.go.jp/about/riyou.html', 'https://www.jacar.go.jp/riyou/', 'https://www.jacar.go.jp/policy/'], whole: 'all', links: true, lang: 'ja', keepGoing: true },
  'zenodo-terms': { url: 'https://about.zenodo.org/terms/', whole: 'all', links: true },
  'zenodo-policies': { url: 'https://about.zenodo.org/policies/', whole: 'all', links: true },
  'arxiv-licence': { url: 'https://info.arxiv.org/help/license/index.html', whole: 'all', links: true },
  'jacar-doc': { pages: ['https://www.jacar.archives.go.jp/aj/www/doc/', 'https://www.jacar.archives.go.jp/aj/howto/', 'https://www.jacar.archives.go.jp/aj/www/faq/'], whole: 'all', links: true, lang: 'ja', keepGoing: true },
  'vercel-fair-use': { url: 'https://vercel.com/docs/limits/fair-use-guidelines', whole: 'all' },
  // The legal codes open with a list of their sections; the sections themselves start at the last heading of section 1.
  'cc-by': { url: 'https://creativecommons.org/licenses/by/4.0/legalcode.en', split: /Section (\d+) – /g, fromLast: 'Section 1 – ' },
  'cc-by-sa': { url: 'https://creativecommons.org/licenses/by-sa/4.0/legalcode.en', split: /Section (\d+) – /g, fromLast: 'Section 1 – ' },
  cc0: { url: 'https://creativecommons.org/publicdomain/zero/1.0/legalcode.en', split: /(?:^| )(\d+)\. (?=[A-Z])/g, fromLast: '1. Copyright and Related Rights' },
};

const plain = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#39;|&rsquo;|&#8217;/g, '’').replace(/&lsquo;|&#8216;/g, '‘').replace(/&ldquo;|&#8220;/g, '“').replace(/&rdquo;|&#8221;/g, '”')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&sect;/g, '§').replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
  .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d))
  .replace(/&([a-z])(grave|acute|circ|tilde|cedil);/gi, (m, v, k) => (v + { grave: '̀', acute: '́', circ: '̂', tilde: '̃', cedil: '̧' }[k.toLowerCase()]))
  .normalize('NFC').replace(/\s+/g, ' ').trim();
// e-Gov: as tools/statutes.js reduces an article (ruby readings and tags dropped, white space collapsed).
const egovPlain = (x) => x.replace(/<Rt>[^<]*<\/Rt>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const sha = (x) => crypto.createHash('sha256').update(x, 'utf8').digest('hex');

/* One address with curl: the status, the final address and the text (a PDF through pdftotext). */
function curl(url, s = {}) {
  const tmp = path.join(require('os').tmpdir(), 'sophaxis-source');
  const args = ['-sSL', '--max-time', '90', '-A', UA, '-o', tmp, '-w', '%{http_code} %{url_effective}', '-H', 'Accept-Language: ' + (s.lang || 'en'), url];
  if (s.accept) args.splice(0, 0, '-H', 'Accept: ' + s.accept);
  let out;
  try { out = execFileSync('curl', args, { encoding: 'utf8' }); } catch (e) { return { error: String(e.stderr || e.message).trim().slice(0, 300) }; }
  const [status, final] = out.trim().split(' ');
  const buf = fs.readFileSync(tmp);
  let text;
  if (buf.slice(0, 5).toString() === '%PDF-') {
    try { text = execFileSync('pdftotext', ['-layout', tmp, '-'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).replace(/\s+/g, ' ').trim(); } catch (e) { return { status: +status, error: 'pdftotext: ' + e.message }; }
    return { status: +status, final, pdf: true, text, raw: '' };
  }
  const raw = buf.toString('utf8');
  return { status: +status, final, text: s.markdown ? raw : plain(raw), raw };
}

/* The articles of a plain text, by a heading pattern: { number: text from its heading to the next }.
 * Only headings that come in rising order count, so that a mention of an article in the text is not taken for its heading. */
function cut(text, re, max = Infinity) {
  const hits = [];
  for (const m of text.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))) hits.push({ n: m[1], at: m.index });
  const num = (n) => parseFloat(String(n).replace(/[^\d.-]/g, '').replace('-', '.')) || 0;
  const rising = [];
  for (const h of hits) if (num(h.n) <= max && (!rising.length || num(h.n) > num(rising[rising.length - 1].n))) rising.push(h);
  const out = {};
  rising.forEach((h, i) => { out[h.n] = text.slice(h.at, i + 1 < rising.length ? rising[i + 1].at : Math.min(text.length, h.at + 30000)).trim(); });
  return out;
}

/* GitHub's terms are Markdown: "## D. User-Generated Content" and "### 4. License Grant to Us" make section D.4. */
function cutMarkdown(md) {
  const out = {};
  let letter = null, cur = null;
  for (const line of md.split('\n')) {
    const a = /^## ([A-Z])\. /.exec(line), b = /^### (\d+)\. /.exec(line);
    if (a) { letter = a[1]; cur = letter; out[cur] = ''; } else if (b && letter) { cur = letter + '.' + b[1]; out[cur] = ''; }
    if (cur) out[cur] += line + '\n';
  }
  for (const k of Object.keys(out)) out[k] = out[k].replace(/\s+/g, ' ').trim();
  return out;
}

/* What the pages cite: { law: Set of articles }. */
function wanted() {
  const C = Cit.compile(REG);
  const want = {};
  for (const c of Cit.all(ROOT, REG, C).found) (want[c.law] = want[c.law] || new Set()).add(c.article);
  for (const [law, extra] of Object.entries(REG.fetchAlso || {})) for (const a of extra) (want[law] = want[law] || new Set()).add(a);
  return want;
}

async function egov(law, articles) {
  const id = REG.laws[law].egov;
  const url = 'https://laws.e-gov.go.jp/api/1/lawdata/' + id;
  const r = curl(url, { lang: 'ja' });
  const out = { url, status: r.status, error: r.error };
  if (r.error || r.status !== 200) return out;
  const xml = r.raw;
  out.title = (/<LawTitle[^>]*>([^<]*)<\/LawTitle>/.exec(xml) || [])[1] || '';
  const main = (/<MainProvision[\s\S]*?<\/MainProvision>/.exec(xml) || [''])[0];
  out.headings = [...main.matchAll(/<Article[^>]*\sNum="([^"]+)"/g)].map((m) => m[1].replace('_', '-'));
  out.articles = {};
  out.shape = {};
  for (const a of [...articles].sort()) {
    const m = new RegExp('<Article[^>]*\\sNum="' + a.replace('-', '_') + '"[^>]*>[\\s\\S]*?</Article>').exec(main);
    if (!m) continue;
    out.articles[a] = egovPlain(m[0]);
    // The paragraphs, and the items of each, so that "第 32 条第 1 項第四号" can be confirmed.
    out.shape[a] = [...m[0].matchAll(/<Paragraph[^>]*>[\s\S]*?<\/Paragraph>/g)].map((p) => (p[0].match(/<Item[ >]/g) || []).length);
    out.sha256 = out.sha256 || {};
    out.sha256[a] = sha(out.articles[a]);
  }
  return out;
}

async function foreign(key, s, articles) {
  const out = { url: s.url || s.each || s.pages };
  if (s.each) {
    out.articles = {}; out.status = {};
    for (const a of [...articles].sort((x, y) => parseFloat(x) - parseFloat(y))) {
      const u = s.each.replace('{n}', a);
      const r = curl(u, s);
      out.status[a] = r.status || r.error;
      if (r.text) {
        const at = r.text.search(new RegExp(s.from.source.replace('(\\d+)', a.replace('.', '\\.'))));
        if (at >= 0) out.articles[a] = r.text.slice(at, at + 30000);
        else out['head' + a] = r.text.slice(0, 1500);
      }
      await sleep(1500);
    }
    out.headings = Object.keys(out.articles);
    return out;
  }
  let text = '', raw = '';
  const statuses = [];
  for (const u of s.pages || [s.url]) {
    const r = curl(u, s);
    statuses.push(r.status || r.error);
    out.status = s.pages ? statuses : statuses[0];
    if (s.links && r.raw) out.links = [...new Set([...(out.links || []), ...[...r.raw.matchAll(/href=["']([^"'#]+)["']/g)].map((m) => m[1])])].slice(0, 400);
    if (s.keepGoing) { out.each = out.each || {}; out.each[u] = { status: r.status || r.error, text: (r.text || '').slice(0, 40000) }; }
    if (r.error) { if (s.keepGoing) continue; out.error = r.error; break; }
    if (r.final && r.final !== u) out.final = r.final;
    if (r.pdf) out.pdf = true;
    text += (text ? ' ' : '') + r.text; raw += r.raw;
    await sleep(1500);
  }
  out.length = text.length;
  if (!text) return out;
  let all = {};
  if (s.markdown) all = cutMarkdown(text);
  else if (s.whole) all = s.needle && !text.includes(s.needle) ? {} : { [s.whole]: text.slice(0, 120000) };
  else if (s.html) {
    const hits = [...raw.matchAll(s.html)].map((m) => ({ n: m[1], at: m.index }));
    hits.forEach((h, i) => { all[h.n] = plain(raw.slice(h.at, i + 1 < hits.length ? hits[i + 1].at : h.at + 60000)); });
    if (!hits.length) all = cut(text, /\bArticle (\d+) (?=[A-Z])/g);
  } else all = cut(s.after && text.includes(s.after) ? text.slice(text.indexOf(s.after)) : s.fromLast && text.includes(s.fromLast) ? text.slice(text.lastIndexOf(s.fromLast)) : text, s.split, s.max);
  if (s.split && s.whole) Object.assign(all, cut(text, s.split));
  // The recitals that verification/duties.json quotes, from the preamble ("(23) In order to ensure ... (24) ...").
  const want = (REG.recitals || {})[key];
  if (want && s.html) {
    const pre = text.slice(0, text.search(/HAVE ADOPTED THIS (?:REGULATION|DIRECTIVE)/));
    out.recitals = {};
    for (const n of want) {
      const m = new RegExp('\\(' + n + '\\) ([\\s\\S]*?) \\(' + (Number(n) + 1) + '\\) ').exec(pre);
      if (m) out.recitals[n] = '(' + n + ') ' + m[1];
    }
  }
  out.headings = Object.keys(all);
  out.articles = {};
  for (const a of articles) if (all[a] !== undefined) out.articles[a] = all[a];
  if (!out.headings.length) out.head = text.slice(0, 3000);
  return out;
}

async function main() {
  const want = wanted();
  const out = { fetched: new Date().toISOString().slice(0, 10), agent: UA, sources: {} };
  for (const [law, set] of Object.entries(want).sort()) {
    const L = REG.laws[law];
    if (!L) continue;
    let r;
    if (L.egov) { r = await egov(law, set); await sleep(1500); } else if (L.source && SOURCES[L.source]) {
      if (out.sources[L.source]) { for (const a of set) out.sources[L.source].want.push(a); continue; }
      r = await foreign(L.source, SOURCES[L.source], [...set]);
    } else continue;
    r.want = [...set];
    out.sources[L.egov ? 'egov:' + L.egov : L.source] = r;
    console.log(law, r.status || r.error, (r.headings || []).length, Object.keys(r.articles || {}).length + '/' + set.size);
  }
  // A source shared by two laws (the GDPR and the UK GDPR are not; GitHub's terms are named two ways) is fetched once.
  for (const r of Object.values(out.sources)) r.want = [...new Set(r.want)].sort();
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
}

module.exports = { cut, cutMarkdown, plain, egovPlain, SOURCES };

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
