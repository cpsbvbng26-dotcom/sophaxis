/* Finds every numbered citation of a law or of a service's terms in the legal pages, and the law it belongs to.
 *
 * A citation is "Article 3(2)", "Articles 16(5), 16(6) and 17(3)", "section 37(5)", "Rule 10", "16 CFR 312",
 * "GitHub Terms, D.2 and M.3", "第 27 条の 12", "第 32 条第 1 項第四号", and so on. The law is read from the words
 * around it, using the names in verification/citations.json:
 *   1. a name right after it ("Article 49(1)(a) of the GDPR", "Rule 10 of India's ... Rules");
 *   2. otherwise the nearest name before it in the same section, or in the same row of a table;
 *   3. a name that several laws share (個人情報保護法) is settled by the place that the row or the heading names.
 * A citation with no law is returned as unattributed, so that verification/check.js fails on it.
 *
 * Pure: no file and no network. verification/check.js and tools/sources.js use it.
 */
'use strict';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* The names of the laws, longest first, as one expression; each name maps to the laws it may mean. */
function compile(reg) {
  const names = new Map();
  for (const [key, law] of Object.entries(reg.laws)) {
    for (const n of [].concat(law.en || [], law.ja || [])) {
      if (!names.has(n)) names.set(n, []);
      names.get(n).push(key);
    }
  }
  const list = [...names.keys()].sort((a, b) => b.length - a.length);
  const re = new RegExp(list.map((n) => (/^\w/.test(n) ? '\\b' : '') + esc(n) + (/\w$/.test(n) ? '\\b' : '')).join('|'), 'g');
  return { names, re, reg };
}

const N = '\\d+(?:[-.]\\d+)*(?:\\([0-9a-z.]+\\))*';
const SEC = '[A-S](?:\\.\\d+)?';
const EN_CITE = new RegExp([
  '\\b(?:Articles?|Arts?|[Ss]ections?|Rules?)\\.? (?!(?:19|20)\\d\\d\\b)(' + N + '(?:(?:, | and | to | or |, and )' + N + ')*)(?! of Chapter)',
  '\\b(\\d+) (CFR|U\\.S\\.C\\.) (\\d+(?:\\([0-9a-z]+\\))*)',
  'GitHub Terms, (' + SEC + '(?:(?:, | and )' + SEC + ')*)',
  '\\((?:section )?([A-S]\\.\\d+)\\)',
].join('|'), 'g');
const KANJI = '〇一二三四五六七八九十百';
const JA_NUM = '(?:\\d+|[' + KANJI + ']+)';
const JA_CITE = new RegExp([
  '第 ?(' + JA_NUM + ') ?条(?:の ?(\\d+|[' + KANJI + ']+))?((?:第 ?[\\d.' + KANJI + ']+ ?[項号])*)(?: ?([a-z]))?',
  'GitHub の利用規約 (' + SEC + '(?:・' + SEC + ')*)',
  '（([A-S]\\.\\d+)）',
].join('|'), 'g');

const kanji = (s) => {
  if (/^\d+$/.test(s)) return Number(s);
  const d = { 〇: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  let n = 0, cur = 0;
  for (const c of s) {
    if (c === '百') { n += (cur || 1) * 100; cur = 0; } else if (c === '十') { n += (cur || 1) * 10; cur = 0; } else cur = d[c];
  }
  return n + cur;
};
const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };

/* "548-2 to 548-4" is three articles; "3 to 5" is three. */
function expand(list) {
  const out = [];
  const parts = list.split(/, and |, | and | or /);
  for (const p of parts) {
    const r = /^(\d+)-(\d+) to \1-(\d+)$/.exec(p) || /^(\d+) to (\d+)$/.exec(p);
    if (r && r.length === 4) for (let k = Number(r[2]); k <= Number(r[3]); k++) out.push(r[1] + '-' + k);
    else if (r) for (let k = Number(r[1]); k <= Number(r[2]); k++) out.push(String(k));
    else out.push(...p.split(' to '));
  }
  return out;
}

/* A reference in its parts: the article ("27-12", "4.1", "D.2") and the paragraphs, points or items below it. */
function parseEn(ref) {
  const m = /^([A-S]\.\d+|[A-S]|\d+(?:[-.]\d+)*)((?:\([0-9a-z.]+\))*)$/.exec(ref);
  if (!m) return null;
  return { article: m[1], sub: [...m[2].matchAll(/\(([0-9a-z.]+)\)/g)].map((x) => x[1]) };
}

/* The sections of a Markdown text: the heading line, its place, and its lines. */
function sections(text) {
  const out = [];
  let cur = { head: '', lines: [] };
  for (const [i, line] of text.split('\n').entries()) {
    if (/^#{1,6} /.test(line)) { out.push(cur); cur = { head: line, lines: [] }; }
    cur.lines.push([i + 1, line]);
  }
  out.push(cur);
  return out;
}

/* Every citation in a text, with its law. `lang` is 'en' or 'ja'. Returns { found, unattributed }. */
function cites(text, lang, C, file) {
  const found = [], unattributed = [];
  // The lines that name the quoted texts (<!-- text: … -->) are not citations.
  text = text.replace(/^<!-- text: .* -->$/gm, '');
  const reg = C.reg;
  const refsOf = (m) => {
    let refs;
    if (m.ja) {
      if (m[5] || m[6]) refs = (m[5] || m[6]).split('・');
      else {
        const parts = [...(m[3] || '').matchAll(/第 ?([\d.]+|[〇一二三四五六七八九十百]+) ?([項号])/g)];
        const sub = parts.map((x) => (/^\d/.test(x[1]) ? x[1] : String(kanji(x[1]))));
        // An item named without its paragraph (第 10 条第二号) is in the first paragraph.
        const implicit = parts.length > 0 && parts[0][2] === '号';
        if (implicit) sub.unshift('1');
        if (m[4]) sub.push(m[4]);
        refs = [{ article: kanji(m[1]) + (m[2] ? '-' + kanji(m[2]) : ''), sub, implicit }];
      }
    } else if (m[2]) refs = [{ article: m[4].replace(/\(.*$/, ''), sub: [...m[4].matchAll(/\(([0-9a-z]+)\)/g)].map((x) => x[1]) }];
    else refs = expand(m[1] || m[5] || m[6]);
    return refs.map((r) => (typeof r === 'string' ? parseEn(r) : r)).filter(Boolean);
  };
  for (const sec of sections(text)) {
    const body = sec.lines.map(([, l]) => l).join('\n');
    const lineAt = (pos) => { let n = 0; for (const [no, l] of sec.lines) { if (pos <= n + l.length) return no; n += l.length + 1; } return sec.lines.length ? sec.lines[sec.lines.length - 1][0] : 0; };
    // The names in this section, with where they are; neighbours joined by "and" are one group.
    const mentions = [];
    for (const m of body.matchAll(C.re)) mentions.push({ at: m.index, end: m.index + m[0].length, name: m[0] });
    const groups = [];
    for (const m of mentions) {
      const last = groups[groups.length - 1];
      if (last && /^(?:,? and (?:of )?(?:the )?|、|・|と)$/.test(body.slice(last.end, m.at))) { last.names.push(m.name); last.end = m.end; } else groups.push({ at: m.at, end: m.end, names: [m.name] });
    }
    // The place that settles a shared name: the first cell of the row, or the heading.
    const rowOf = (pos) => { const s = body.lastIndexOf('\n', pos - 1) + 1; const e = body.indexOf('\n', pos); return body.slice(s, e < 0 ? body.length : e); };
    const settle = (name, pos) => {
      const keys = C.names.get(name);
      if (keys.length === 1) return keys[0];
      const row = rowOf(pos);
      const where = (row.startsWith('|') ? row.split('|')[1] : '') + ' ' + sec.head + ' ' + body.slice(Math.max(0, pos - 12), pos);
      const placed = keys.filter((k) => (reg.laws[k].place || []).some((p) => where.includes(p)));
      if (placed.length === 1) return placed[0];
      const home = keys.filter((k) => !reg.laws[k].place);
      return home.length === 1 ? home[0] : null;
    };
    const lawsOf = (g) => g.names.map((n) => settle(n, g.at));
    const matches = lang === 'both' ? [...body.matchAll(EN_CITE)].map((m) => Object.assign(m, { ja: false })).concat([...body.matchAll(JA_CITE)].map((m) => Object.assign(m, { ja: true })))
      : [...body.matchAll(lang === 'ja' ? JA_CITE : EN_CITE)].map((m) => Object.assign(m, { ja: lang === 'ja' }));
    for (const m of matches) {
      const at = m.index, end = at + m[0].length;
      const refs = refsOf(m);
      // The law: a name right after, else the nearest before in the section (in a table, in the same row).
      // "Article 25 of the Act" means the law named before it in the same sentence, and no other.
      if (/^\)?,? (?:of|under) (?:the|its|this) (?:Act|Law|Regulation|Rules|Code|Decree|Directive)\b/.test(body.slice(end, end + 30))) {
        const lineStart = body.lastIndexOf('\n', at - 1) + 1;
        const same = groups.filter((x) => x.end <= at && x.at >= lineStart);
        const laws = same.length ? lawsOf(same[same.length - 1]) : [];
        const where = (file || '') + ':' + lineAt(at);
        if (!laws.length || laws.some((l) => !l)) { unattributed.push({ text: m[0] + body.slice(end, end + 12), where, names: [] }); continue; }
        for (const law of laws) for (const r of refsOf(m)) found.push({ law, article: r.article, sub: r.sub.map((x) => (ROMAN[x] ? String(ROMAN[x]) : x)), implicit: !!r.implicit, text: m[0], where });
        continue;
      }
      const code = m[2] ? Object.keys(reg.laws).find((k) => reg.laws[k].cite === m[2] + ' ' + m[3]) : null;
      let g = code ? { names: [], laws: [code] } : groups.find((x) => x.at >= end && /^\)?,? (?:of|in|under) (?:the )?(?:[A-Z][a-z]+'s |EU )?$/.test(body.slice(end, x.at)));
      // A lettered section (B.3, D.4) is the style of GitHub's Terms of Service alone.
      if (!g && (m[5] || m[6])) g = { names: [], laws: ['GitHub Terms'] };
      if (!g) {
        // The law is named in the same paragraph (a row of a table and an item of a list stand alone), or in the heading.
        const row = rowOf(at);
        const rowStart = body.lastIndexOf('\n', at - 1) + 1;
        const alone = /^(?:\||\d+\. |- )/.test(row);
        const para = alone ? rowStart : Math.max(0, body.lastIndexOf('\n\n', at) + 1);
        const before = groups.filter((x) => x.end <= at && x.at >= para);
        g = before[before.length - 1];
        if (!g) {
          const hm = [...sec.head.matchAll(C.re)];
          if (hm.length) g = { names: hm.map((x) => x[0]), at: 0 };
        }
        // In a table, a row with no name is settled by its place: the one law of that place.
        if (!g && row.startsWith('|')) {
          const place = row.split('|')[1].trim();
          const ks = Object.keys(reg.laws).filter((k) => (reg.laws[k].place || []).includes(place));
          if (ks.length === 1) g = { names: [], laws: ks };
        }
      }
      const laws = g ? (g.laws || lawsOf(g)) : [];
      const where = (file || '') + ':' + lineAt(at);
      if (!laws.length || laws.some((l) => !l)) { unattributed.push({ text: m[0], where, names: g ? g.names : [] }); continue; }
      for (const law of laws) for (const r of refs) found.push({ law, article: r.article, sub: r.sub.map((s) => (ROMAN[s] ? String(ROMAN[s]) : s)), implicit: !!r.implicit, text: m[0], where });
    }
  }
  return { found, unattributed };
}

/* The JSON files as text: verification/duties.json gives each duty as a line that starts with its law and article;
 * verification/legal-matrix.json gives each law as a heading with every string under it as an item. */
function jsonText(name, obj) {
  if (obj.duties && !obj.laws) {
    const pre = { APPI: '個人情報保護法', GDPR: 'GDPR', DSA: 'DSA' };
    return obj.duties.map((u) => '- ' + (pre[u.law] || u.law) + ' ' + (/[ぁ-ん一-龠]/.test(u.article) ? u.article : u.article.replace(/\bArts (\d+)-(\d+)/g, 'Articles $1 to $2'))
      + ': ' + [u.duty, u.reason, u.open].filter(Boolean).join(' ').replace(/\bArts (\d+)-(\d+)/g, 'Articles $1 to $2').replace(/\n/g, ' ')).join('\n');
  }
  // A sentence quoted from a page ({ file, text }) is read in that page, where its law is named; here it is left out.
  const strings = (v) => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? (v.file && v.text ? [] : Object.values(v).flatMap(strings)) : []);
  return Object.entries(obj.laws || {}).map(([k, v]) => '### ' + k + '\n' + strings(v).map((x) => '- ' + x.replace(/\n/g, ' ')).join('\n')).join('\n\n');
}

/* Every citation in the files that the registry lists. */
function all(root, reg, C) {
  const fs = require('fs'), path = require('path');
  const found = [], unattributed = [];
  const add = (r) => { found.push(...r.found); unattributed.push(...r.unattributed); };
  for (const f of reg.files.en) add(cites(fs.readFileSync(path.join(root, f), 'utf8'), 'en', C, f));
  for (const f of reg.files.ja) add(cites(fs.readFileSync(path.join(root, f), 'utf8'), 'ja', C, f));
  for (const f of reg.files.json) add(cites(jsonText(f, JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'))), 'both', C, f));
  return { found, unattributed };
}

module.exports = { compile, cites, sections, kanji, jsonText, all };

/* Whether each citation is to an article in a fetched text. `statutes` and `texts` are verification/statutes.json and
 * statutes-texts.json (the weekly watch), `raw` is verification/sources-raw.json (tools/sources.js). A citation is
 * - covered: its article is in a fetched text, and every paragraph, point or item it names is in that article;
 * - untraced: its source could not be fetched, and verification/citations.json lists it under `untraced`;
 * - named: its law is listed as referred to by name only (an error: a numbered citation of such a law);
 * - missing: none of these (an error). */
/* A kept text: a law kept whole is a string; any other text is kept only in the parts that the repository quotes or relies on
 * (tools/sources.js, `spans`), each with its place in the whole, and reads as those parts joined by " […] ". */
const SEP = ' […] ';
function kept(x) {
  if (Array.isArray(x)) return x.map((s) => s.text).join(SEP);
  return x === undefined || x === null ? '' : String(x);
}

function textOf(law, article, reg, statutes, texts, raw) {
  const L = reg.laws[law];
  if (!L) return null;
  if (L.egov) {
    const st = statutes.statutes.find((e) => e.law_id === L.egov && e.article === article.replace(/-/g, '_') && !e.items);
    const r = raw.sources['egov:' + L.egov];
    // The shape (paragraphs and items) comes from the fetched law, which holds the whole article.
    if (st && texts[st.name + ' ' + st.label]) return { text: texts[st.name + ' ' + st.label], shape: r && r.shape && r.shape[article], from: 'statutes', key: st.name + ' ' + st.label, egov: L.egov };
    if (r && r.articles && r.articles[article]) return { text: r.articles[article], shape: r.shape && r.shape[article], from: 'egov:' + L.egov, egov: L.egov };
    return null;
  }
  const r = L.source && raw.sources[L.source];
  if (r && r.articles && r.articles[article]) return { text: kept(r.articles[article]), from: L.source, flat: !!L.flatSuperscript, spans: Array.isArray(r.articles[article]) };
  return null;
}

function subOk(c, t) {
  if (t.shape) {
    const [p, i] = c.sub.map(Number);
    if (c.sub.length === 0) return true;
    if (!(p >= 1 && p <= t.shape.length)) return false;
    return c.sub.length < 2 || (i >= 1 && i <= t.shape[p - 1]);
  }
  if (t.egov) {
    // A Japanese article without its shape (kept by the watch only): its paragraphs are numbered ２, ３, …
    const fw = (n) => String(n).replace(/\d/g, (d) => '０１２３４５６７８９'[d]);
    return c.sub.length === 0 || c.sub[0] === '1' || t.text.includes(' ' + fw(c.sub[0]) + ' ');
  }
  // A source that prints a part such as 1¹ with a superscript (flatSuperscript in verification/citations.json) reads as "11. " in plain text.
  const flat = (s) => t.flat && /^\d+\.\d+$/.test(s) && new RegExp('(^|[ :;.])' + s.replace('.', '') + '\\. ').test(t.text);
  return (c.implicit ? c.sub.slice(1) : c.sub).every((s) => t.text.includes('(' + s + ')') || new RegExp('(^|[ :;.])' + s.replace('.', '\\.') + '\\. ').test(t.text) || t.text.includes('(' + s + ' ') || flat(s));
}

function trace(found, reg, statutes, texts, raw) {
  const out = { covered: [], untraced: [], named: [], missing: [], badSub: [] };
  for (const c of found) {
    const L = reg.laws[c.law];
    if (L && L.named) { out.named.push(c); continue; }
    const t = textOf(c.law, c.article, reg, statutes, texts, raw);
    if (t) { (subOk(c, t) ? out.covered : out.badSub).push(c); continue; }
    const u = (reg.untraced || {})[c.law];
    if (u && u.articles.includes(c.article)) out.untraced.push(c); else out.missing.push(c);
  }
  return out;
}

module.exports.trace = trace;
module.exports.textOf = textOf;
module.exports.kept = kept;
module.exports.SEP = SEP;
