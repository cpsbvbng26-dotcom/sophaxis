#!/usr/bin/env node
/* The shape of a submitted PDF: how many pages, whether its text can be read, and whether the title, an abstract and a
 * list of references can be found in it. Shown to the moderator in the submission issue. It decides nothing.
 *
 *   node tools/pdf_shape.js <file.pdf> "<title from the DOI metadata>"
 *
 * Reads the file with pdfinfo and pdftotext (poppler-utils), which the intake workflow installs. Without them, or for a
 * PDF they cannot read, the shape is reported as not read. Only the first SHAPE_PAGES pages are read.
 */
'use strict';

const { execFileSync } = require('child_process');

const SHAPE_PAGES = 60;
const MIN_PAGES = 4;
const MIN_CHARS = 1000;
const TITLE_SHARE = 0.6;

const ABSTRACT = /\babstract\b|\bsummary\b|要旨|概要|アブストラクト|摘要/i;
const REFERENCES = /\breferences\b|\bbibliography\b|\bworks cited\b|\bliterature cited\b|参考文献|引用文献|文献一覧|文献表/i;

/* Pure: the words of a title worth looking for, lower case, without accents. */
const fold = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
function titleWords(title) {
  return [...new Set(fold(title).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 4 || /[^\x00-\x7f]/.test(w)))];
}

/* Pure: the rows of the shape, given what pdfinfo and pdftotext gave. pages is a number or null; text has a form feed
 * between pages. */
function shapeOf({ pages, text, title }) {
  const rows = [];
  const add = (label, pass, detail) => rows.push([label, !!pass, detail || '']);
  const body = String(text || '');
  const chars = body.replace(/\s+/g, '').length;
  const pageTexts = body.split('\f');
  if (pageTexts.length > 1 && !pageTexts[pageTexts.length - 1].trim()) pageTexts.pop();
  add('The PDF has at least ' + MIN_PAGES + ' pages', Number.isInteger(pages) && pages >= MIN_PAGES, Number.isInteger(pages) ? pages + ' pages' : 'the number of pages could not be read');
  add('Its text can be read, not only images of pages', chars >= MIN_CHARS, chars + ' characters in the first ' + Math.min(pageTexts.length, SHAPE_PAGES) + ' pages');
  const words = titleWords(title);
  const first = fold(pageTexts[0] || '');
  const found = words.filter((w) => first.includes(w)).length;
  add('The title appears on the first page', words.length > 0 && found / words.length >= TITLE_SHARE, words.length ? found + ' of ' + words.length + ' words of the title' : 'no title in the metadata');
  add('An abstract can be found on the first two pages', ABSTRACT.test(pageTexts.slice(0, 2).join('\n')));
  add('A list of references can be found after the first page', REFERENCES.test(pageTexts.slice(1).join('\n')));
  return rows;
}

/* Pure: the part of the comment that shows the shape. shape is { rows } or { error }. */
function shapeNote(shape) {
  if (!shape) return '';
  const safe = (s) => String(s).replace(/[`|<>]/g, '');
  if (shape.error) return `\n**The shape of the PDF** could not be read: ${safe(shape.error)}. The moderator reads the PDF.\n`;
  const rows = shape.rows.map(([label, pass, detail]) => `| ${pass ? 'yes' : '**no**'} | ${label} | ${safe(detail)} |`).join('\n');
  return `
**The shape of the PDF**, read by machine for the moderator. It decides nothing, and a "no" is not a reason for declining by itself.

| | | detail |
| --- | --- | --- |
${rows}
`;
}

/* Reads a PDF file with poppler-utils. Throws if they are missing or the file cannot be read. */
function readPdf(file) {
  const opts = { encoding: 'utf8', timeout: 60000, maxBuffer: 64 * 1024 * 1024 };
  const info = execFileSync('pdfinfo', [file], opts);
  const m = /^Pages:\s+(\d+)/m.exec(info);
  const text = execFileSync('pdftotext', ['-enc', 'UTF-8', '-l', String(SHAPE_PAGES), file, '-'], opts);
  return { pages: m ? Number(m[1]) : null, text };
}

function shapeOfFile(file, title) {
  try {
    return { rows: shapeOf(Object.assign(readPdf(file), { title })) };
  } catch (e) {
    return { error: /ENOENT/.test(e.message) ? 'poppler-utils is not installed' : 'the file could not be read as a PDF' };
  }
}

module.exports = { SHAPE_PAGES, MIN_PAGES, MIN_CHARS, TITLE_SHARE, titleWords, shapeOf, shapeNote, readPdf, shapeOfFile };

if (require.main === module) {
  const [file, title] = process.argv.slice(2);
  if (!file) { console.error('usage: node tools/pdf_shape.js <file.pdf> "<title>"'); process.exit(2); }
  console.log(shapeNote(shapeOfFile(file, title || '')));
}
