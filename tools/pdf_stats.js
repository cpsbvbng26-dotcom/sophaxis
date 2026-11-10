#!/usr/bin/env node
/* The number of pages and of words of each PDF copy, for the reading-time guide on the record page.
 *
 *   node tools/pdf_stats.js            writes { pages, words } into each record's "pdfs" where missing or different
 *   node tools/pdf_stats.js --check    exits 1 if a recorded value differs from the file
 *
 * Reads the files in data/pdf with pdfinfo and pdftotext (poppler-utils). Words are runs of letters or digits in a
 * Latin, Greek or Cyrillic script, plus one word for every two Chinese, Japanese or Korean characters.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PAPERS = path.join(ROOT, 'data', 'papers');
const PDF = path.join(ROOT, 'data', 'pdf');

/* Pure: the words of a text, counted as above. */
function countWords(text) {
  const t = String(text || '');
  const latin = (t.match(/[\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}\p{N}]+/gu) || []).length;
  const cjk = (t.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu) || []).length;
  return latin + Math.round(cjk / 2);
}
function statsOf(file) {
  const info = execFileSync('pdfinfo', [file], { encoding: 'utf8' });
  const pages = Number((/^Pages:\s+(\d+)/m.exec(info) || [])[1]);
  const text = execFileSync('pdftotext', ['-enc', 'UTF-8', file, '-'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  return { pages, words: countWords(text) };
}

function main() {
  const check = process.argv.includes('--check');
  const diffs = [];
  for (const f of fs.readdirSync(PAPERS).filter((x) => x.endsWith('.json')).sort()) {
    const file = path.join(PAPERS, f);
    const p = JSON.parse(fs.readFileSync(file, 'utf8'));
    let changed = false;
    for (const x of p.pdfs || []) {
      const s = statsOf(path.join(PDF, x.file));
      if (x.pages !== s.pages || x.words !== s.words) {
        diffs.push(x.file + ': recorded ' + x.pages + ' pages, ' + x.words + ' words; the file has ' + s.pages + ' pages, ' + s.words + ' words');
        Object.assign(x, s);
        changed = true;
      }
    }
    if (changed && !check) fs.writeFileSync(file, JSON.stringify(p, null, 2) + '\n');
  }
  diffs.forEach((d) => console.log(d));
  if (check && diffs.length) process.exit(1);
  console.log(check ? 'every recorded count matches its PDF' : 'written');
}

module.exports = { countWords, statsOf };
if (require.main === module) main();
