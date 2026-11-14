#!/usr/bin/env node
/* Advice for the moderator, read by machine from a PDF and from the DOI metadata (2026-11-14). It decides nothing.
 *
 *   node tools/pdf_advice.js <file.pdf> [CC-BY-4.0]
 *
 * Five readings, each a flag or not, and each shown only as fixed words and counts:
 *   - the licence printed on the first pages of the PDF, against the licence in the DOI metadata;
 *   - strings shaped like email addresses, telephone numbers and postal codes, outside the authors' own contact
 *     (the first page, and an address whose part before the @ holds an author's name);
 *   - the number of images embedded in the PDF, so that the moderator checks their rights (no image is analysed);
 *   - whether the file equals the repository's file, by the checksum the repository gives;
 *   - affiliations in the DOI metadata, and the first page of the PDF, that name a place where Sophaxis is not offered.
 * Nothing that the PDF says is printed, written or kept: not its text, not a string that a pattern found, and not a place
 * name read from it. The result holds only labels, counts and the licence identifiers of site.json.
 * The ORCID record is not read for a place: the Privacy Policy says that its country is never received.
 *
 * Reads the file with pdftotext and pdfimages (poppler-utils), which the intake and watch workflows install.
 * Claude decided these readings on 2026-11-14 (docs/legal-audit-2026-11-12.md, 「2026-11-14：形を保って詰める」).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const SITE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'site.json'), 'utf8'));
/* The licence is looked for on the first pages, where a paper prints it. */
const LICENCE_PAGES = 3;
const PAGES = 60;

/* ------------------------------------------------------------ the licence printed in the PDF */

/* Each printed form, as a fixed identifier. The identifiers of site.json are those Sophaxis accepts; the others are
 * forms that would differ from any of them. */
const LICENCE_FORMS = [
  ['CC-BY-SA-4.0', /creativecommons\.org\/licenses\/by-sa\/4\.0|\bcc[ -]?by[ -]sa[ -]?4\.0\b|creative commons attribution[ -]share ?alike 4\.0/],
  ['CC-BY-NC', /creativecommons\.org\/licenses\/by-nc|\bcc[ -]?by[ -]nc\b|attribution[ -]non-?commercial/],
  ['CC-BY-ND', /creativecommons\.org\/licenses\/by-nd|\bcc[ -]?by[ -]nd\b|attribution[ -]no ?derivatives?/],
  ['CC-BY-4.0', /creativecommons\.org\/licenses\/by\/4\.0|\bcc[ -]?by[ -]?4\.0\b|creative commons attribution 4\.0/],
  ['CC0-1.0', /creativecommons\.org\/publicdomain\/zero\/1\.0|\bcc0\b|\bcc zero\b/],
  ['CC-older', /creativecommons\.org\/licenses\/by(?:-sa)?\/[123]\.\d|\bcc[ -]?by(?:[ -]sa)?[ -]?[123]\.[05]\b/],
  ['all-rights-reserved', /all rights reserved|無断転載|無断複製|禁無断/],
];
const LICENCE_LABEL = { 'CC-BY-NC': 'a CC NonCommercial licence', 'CC-BY-ND': 'a CC NoDerivatives licence', 'CC-older': 'an earlier CC version', 'all-rights-reserved': '"all rights reserved"' };
const licenceLabel = (id) => SITE.licenses[id] || LICENCE_LABEL[id] || id;
/* Lines broken by a hyphen are joined, and white space is one space, so that a form split over two lines is found. */
const flat = (t) => String(t || '').replace(/-\s*\n\s*/g, '-').replace(/\s+/g, ' ').toLowerCase();

/* Pure: the identifiers of the licences printed in a text, in the order of LICENCE_FORMS. */
function licencesIn(text) {
  const t = flat(text);
  return LICENCE_FORMS.filter(([, re]) => re.test(t)).map(([id]) => id);
}

/* Pure: the row for the licence. metadata is the list of identifiers in the DOI metadata (or the record's one). */
function licenceRow(printed, metadata) {
  const meta = [...new Set(metadata || [])];
  const odd = printed.filter((id) => !meta.includes(id));
  const say = (ids) => (ids.length ? ids.map(licenceLabel).join(', ') : 'none');
  const detail = 'printed: ' + say(printed) + '; DOI metadata: ' + say(meta);
  if (!printed.length) return ['No licence statement was found on the first ' + LICENCE_PAGES + ' pages', true, detail];
  return ['The licence printed on the first ' + LICENCE_PAGES + ' pages agrees with the DOI metadata', odd.length > 0, detail];
}

/* ------------------------------------------------------------ personal data of others */

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
/* A telephone number: one with a country code, one in the Japanese form, or digits after a word that names a telephone. */
const PHONES = [
  /\+\d{1,3}[ .-]?\(?\d{1,4}\)?(?:[ .-]?\d{2,4}){2,4}(?!\d)/g,
  /(?<![\d.-])0\d{1,4}-\d{1,4}-\d{4}(?![\d-])/g,
  /(?:\btel(?:ephone)?|\bphone|\bfax|\bmobile|電話|携帯)[.:：]?\s*\(?\d[\d() .-]{6,18}\d/gi,
];
/* A postal code: the Japanese form (seven digits after 〒, or three and four with a hyphen), a US ZIP+4, a UK postcode and a
 * Canadian one. Five digits alone are not counted: years, pages and numbers take that shape too often. */
const POSTALS = [
  /〒\s?\d{3}-?\d{4}/g,
  /(?<![\d.-])\d{3}-\d{4}(?![\d-])/g,
  /(?<![\d-])\d{5}-\d{4}(?![\d-])/g,
  /\b[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}\b/g,
  /\b[A-Z]\d[A-Z] ?\d[A-Z]\d\b/g,
];

/* Pure: the places in a text where any of the patterns matches, without double counting a stretch matched twice. */
function spans(text, patterns) {
  const out = [];
  for (const re of patterns) for (const m of String(text).matchAll(new RegExp(re.source, re.flags))) {
    const a = m.index, b = m.index + m[0].length;
    if (!out.some(([x, y]) => a < y && x < b)) out.push([a, b]);
  }
  return out.sort((p, q) => p[0] - q[0]);
}

/* Pure: the tokens of the authors' names, three letters or more, lower case, without accents. */
function nameTokens(authors) {
  const fold = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return [...new Set((authors || []).flatMap((a) => fold(typeof a === 'string' ? a : [a.name, a.given, a.family].filter(Boolean).join(' ')).split(/[^a-z]+/)).filter((w) => w.length >= 3))];
}

/* Pure: how many strings of each kind are outside the authors' own contact. pages is the text cut at form feeds.
 * The first page is where a paper lists its authors' contact, so what is found there is counted as theirs; so is an email
 * address anywhere whose part before the @ holds a token of an author's name. */
function contactCounts(pages, authors) {
  const tokens = nameTokens(authors);
  const own = (addr) => { const local = addr.split('@')[0].toLowerCase(); return tokens.some((t) => local.includes(t)); };
  const n = { email: 0, phone: 0, postal: 0, own: 0 };
  pages.forEach((p, i) => {
    const mails = String(p).match(EMAIL) || [];
    const phones = spans(p, PHONES).length;
    const postals = spans(String(p).replace(EMAIL, ' '), POSTALS).length;
    if (i === 0) { n.own += mails.length + phones + postals; return; }
    for (const m of mails) { if (own(m)) n.own++; else n.email++; }
    n.phone += phones; n.postal += postals;
  });
  return n;
}

function contactRow(n) {
  const others = n.email + n.phone + n.postal;
  return ['No email address, telephone number or postal code of someone else was found after the first page', others > 0,
    n.email + ' like an email address, ' + n.phone + ' like a telephone number, ' + n.postal + ' like a postal code; ' + n.own + ' on the first page or in an author\'s own address, not counted'];
}

/* ------------------------------------------------------------ images */

/* Pure: the number of images in the output of `pdfimages -list` (two lines of heading, then one line for each image). */
function imagesInList(list) {
  const lines = String(list || '').split('\n').filter((l) => l.trim());
  return Math.max(0, lines.filter((l) => /^\s*\d+\s+\d+\s+\S+/.test(l)).length);
}

function imageRow(n) {
  return ['The PDF embeds no image whose rights would need checking', n > 0, n + ' embedded image' + (n === 1 ? '' : 's') + (n > 0 ? ': check image rights' : '')];
}

/* ------------------------------------------------------------ the file is the repository's */

/* Pure: md5 is the repository's checksum, or null where it gives none (arXiv gives none). */
function sameFileRow(bytes, md5) {
  if (!md5) return ['The file is the repository\'s, by its checksum', false, 'the repository gives no checksum, so this was not compared'];
  const same = crypto.createHash('md5').update(bytes).digest('hex') === String(md5).toLowerCase();
  return ['The file is the repository\'s, by its checksum', !same, same ? 'the MD5 checksum matches' : 'the MD5 checksum does not match'];
}

/* ------------------------------------------------------------ places where Sophaxis is not offered */

/* One pattern for each place of site.json "notOffered"; the check fails if a place has none. For the European Union and the
 * European Economic Area, the names of their member states are looked for too. */
const EU = ['Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Czech Republic', 'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary',
  'Ireland', 'Italy', 'Latvia', 'Lithuania', 'Luxembourg', 'Malta', 'Netherlands', 'Poland', 'Portugal', 'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden'];
const words = (list) => new RegExp('\\b(?:' + list.map((w) => w.replace(/ /g, '\\s+')).join('|') + ')\\b');
const PLACE_PATTERNS = {
  'the European Union': words(['European Union', ...EU]),
  'the European Economic Area': words(['European Economic Area', 'Iceland', 'Liechtenstein', 'Norway']),
  'the United Kingdom': /\b(?:United Kingdom|England|Scotland|Northern Ireland|UK)\b|(?<!New South )\bWales\b/,
  China: /\b(?:People's Republic of China|PR China|P\. ?R\. ?China|China)\b|中国/,
  Thailand: words(['Thailand']),
  Russia: words(['Russia', 'Russian Federation']),
  'Türkiye': /\b(?:Türkiye|Turkiye|Turkey)\b/,
  Egypt: words(['Egypt']),
  Peru: words(['Peru']),
  Albania: words(['Albania']),
  Monaco: words(['Monaco']),
  Guernsey: words(['Guernsey']),
  Botswana: words(['Botswana']),
  Ecuador: words(['Ecuador']),
  Iraq: words(['Iraq']),
  Indonesia: words(['Indonesia']),
  Rwanda: words(['Rwanda']),
  Zambia: words(['Zambia']),
  Ethiopia: words(['Ethiopia']),
  'the Democratic Republic of the Congo': /\b(?:Democratic Republic of (?:the )?Congo|DR ?Congo)\b/,
  Kazakhstan: words(['Kazakhstan']),
  Tunisia: words(['Tunisia']),
  Uganda: words(['Uganda']),
  Guinea: /(?<!New |Equatorial |Papua New )\bGuinea\b(?!-Bissau)/,
  Madagascar: words(['Madagascar']),
  Bolivia: words(['Bolivia']),
  'Costa Rica': words(['Costa Rica']),
  Quebec: /\b(?:Quebec|Québec)\b/,
  Argentina: words(['Argentina']),
  Colombia: words(['Colombia']),
  Ghana: words(['Ghana']),
  Korea: /(?<!North )\bKorea\b|대한민국|韓国/,
  Mexico: /(?<!New )\bMexico\b|\bMéxico\b/,
  'the Philippines': words(['Philippines']),
  'Saudi Arabia': words(['Saudi Arabia']),
  Uruguay: words(['Uruguay']),
  Zimbabwe: words(['Zimbabwe']),
  Kenya: words(['Kenya']),
  Tanzania: words(['Tanzania']),
  'South Africa': words(['South Africa']),
  Singapore: words(['Singapore']),
  'the United Arab Emirates': words(['United Arab Emirates', 'UAE', 'Dubai', 'Abu Dhabi']),
  Qatar: words(['Qatar']),
};

/* Pure: every string under a key that names an affiliation, anywhere in the DOI metadata (DataCite, Crossref, JaLC). */
function affiliationsOf(raw) {
  const out = [];
  const walk = (x, under) => {
    if (typeof x === 'string') { if (under) out.push(x); return; }
    if (Array.isArray(x)) { x.forEach((y) => walk(y, under)); return; }
    if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) walk(v, under || /affiliation/i.test(k));
  };
  walk(raw, false);
  return [...new Set(out)].filter((s) => !/^https?:\/\//.test(s));
}

/* Pure: how many of the strings name a place of the list. A string is counted once, whatever it names. */
function placesNamed(strings, places = SITE.notOffered.map((p) => p.place)) {
  return strings.filter((s) => places.some((p) => PLACE_PATTERNS[p] && PLACE_PATTERNS[p].test(s))).length;
}

function placeRow(inMeta, onFirstPage) {
  const n = inMeta + (onFirstPage || 0);
  return ['No affiliation names a place where Sophaxis is not offered', n > 0,
    inMeta + ' in the DOI metadata' + (onFirstPage === null ? '' : ', ' + onFirstPage + ' line' + (onFirstPage === 1 ? '' : 's') + ' of the first page of the PDF') + (n > 0 ? ': ask where the author lives and stays' : '')];
}

/* ------------------------------------------------------------ together */

/* Pure: the rows, given what the readers gave. Any part may be missing (null), and its row is then left out. */
function adviceOf({ pages, images, bytes, md5, licences, authors, raw }) {
  const rows = [];
  if (bytes) rows.push(sameFileRow(bytes, md5));
  if (pages) rows.push(licenceRow(licencesIn(pages.slice(0, LICENCE_PAGES).join('\n')), licences));
  if (pages) rows.push(contactRow(contactCounts(pages, authors)));
  if (Number.isInteger(images)) rows.push(imageRow(images));
  const first = pages ? placesNamed(String(pages[0] || '').split('\n')) : null;
  rows.push(placeRow(raw ? placesNamed(affiliationsOf(raw)) : 0, first));
  return rows;
}

/* Pure: the part of the comment or the report that shows the rows. */
function adviceNote(rows) {
  if (!rows || !rows.length) return '';
  const safe = (s) => String(s).replace(/[`|<>]/g, '');
  return `
**Advice for the moderator**, read by machine from the PDF and the DOI metadata. It decides nothing: a "check" is for the moderator to look at, and is not a reason for declining by itself. It shows counts only, never what was found.

| | | detail |
| --- | --- | --- |
${rows.map(([label, flag, detail]) => `| ${flag ? '**check**' : 'ok'} | ${label} | ${safe(detail)} |`).join('\n')}
`;
}

/* Reads the text (cut at form feeds) and the number of images of a PDF with poppler-utils. Throws if they are missing. */
function readPdf(file) {
  const opts = { encoding: 'utf8', timeout: 60000, maxBuffer: 64 * 1024 * 1024 };
  const text = execFileSync('pdftotext', ['-enc', 'UTF-8', '-l', String(PAGES), file, '-'], opts);
  const pages = text.split('\f');
  if (pages.length > 1 && !pages[pages.length - 1].trim()) pages.pop();
  const images = imagesInList(execFileSync('pdfimages', ['-list', file], opts));
  return { pages, images };
}

/* The rows for a file. On a reading that fails, the PDF rows are left out and the metadata row stays. */
function adviceOfFile(file, o = {}) {
  let read = { pages: null, images: null };
  try { read = readPdf(file); } catch (e) { read = { pages: null, images: null }; }
  return adviceOf(Object.assign({}, o, read, { bytes: o.bytes || (fs.existsSync(file) ? fs.readFileSync(file) : null) }));
}

/* ------------------------------------------------------------ fixtures, for the checks */

/* A PDF written by this code, for the checks: one page for each list of lines, in Helvetica, with `images` grey squares on
 * the first page. Only ASCII is written. No PDF from anyone else is committed or read by the checks. */
function fixturePdf(pageLines, images = 0) {
  const esc = (s) => String(s).replace(/[\\()]/g, (c) => '\\' + c).replace(/[^\x20-\x7e]/g, '?');
  const objs = [];
  const add = (body) => { objs.push(body); return objs.length; };
  const catalog = add(null), pages = add(null), font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const imgs = [];
  for (let i = 0; i < images; i++) imgs.push(add({ stream: Buffer.from([128]), dict: '/Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceGray /BitsPerComponent 8' }));
  const kids = [];
  pageLines.forEach((lines, n) => {
    let s = 'BT /F1 10 Tf 14 TL 72 760 Td ' + lines.map((l) => '(' + esc(l) + ') Tj T*').join(' ') + ' ET';
    if (n === 0) imgs.forEach((id, k) => { s += ' q 20 0 0 20 ' + (400 + 30 * k) + ' 780 cm /Im' + k + ' Do Q'; });
    const content = add({ stream: Buffer.from(s, 'latin1'), dict: '' });
    const xo = n === 0 && imgs.length ? ' /XObject << ' + imgs.map((id, k) => '/Im' + k + ' ' + id + ' 0 R').join(' ') + ' >>' : '';
    kids.push(add('<< /Type /Page /Parent ' + pages + ' 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ' + font + ' 0 R >>' + xo + ' >> /Contents ' + content + ' 0 R >>'));
  });
  objs[catalog - 1] = '<< /Type /Catalog /Pages ' + pages + ' 0 R >>';
  objs[pages - 1] = '<< /Type /Pages /Kids [' + kids.map((k) => k + ' 0 R').join(' ') + '] /Count ' + kids.length + ' >>';
  const parts = [Buffer.from('%PDF-1.4\n', 'latin1')];
  const offsets = [];
  let at = parts[0].length;
  objs.forEach((o, i) => {
    let b;
    if (typeof o === 'string') b = Buffer.from((i + 1) + ' 0 obj\n' + o + '\nendobj\n', 'latin1');
    else b = Buffer.concat([Buffer.from((i + 1) + ' 0 obj\n<< ' + o.dict + ' /Length ' + o.stream.length + ' >>\nstream\n', 'latin1'), o.stream, Buffer.from('\nendstream\nendobj\n', 'latin1')]);
    offsets.push(at); parts.push(b); at += b.length;
  });
  const xref = 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + offsets.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('')
    + 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + catalog + ' 0 R >>\nstartxref\n' + at + '\n%%EOF\n';
  parts.push(Buffer.from(xref, 'latin1'));
  return Buffer.concat(parts);
}

module.exports = { LICENCE_PAGES, LICENCE_FORMS, licencesIn, licenceRow, EMAIL, PHONES, POSTALS, spans, nameTokens, contactCounts, contactRow, imagesInList, imageRow,
  sameFileRow, PLACE_PATTERNS, affiliationsOf, placesNamed, placeRow, adviceOf, adviceNote, readPdf, adviceOfFile, fixturePdf };

if (require.main === module) {
  const [file, licence] = process.argv.slice(2);
  if (!file) { console.error('usage: node tools/pdf_advice.js <file.pdf> [licence]'); process.exit(2); }
  console.log(adviceNote(adviceOfFile(file, { licences: licence ? [licence] : [] })));
}
