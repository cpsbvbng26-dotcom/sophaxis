#!/usr/bin/env node
/* Copy the PDF of each version of a listed record from its repository, unmodified.
 *
 *   node tools/fetch_pdf.js 2026.0001
 *   node tools/fetch_pdf.js 2026.0002 --from https://github.com/user-attachments/files/… --version 1
 *
 * Run by .github/workflows/pdf.yml, which has network access. Writes data/pdf/<id>v<n>.pdf
 * and adds { version, file, sha256, source } to the record's "pdfs". Versions that already
 * have a copy are left alone.
 *
 * Only repositories that let a script fetch the file are used. Where the repository does not, the
 * authors can attach the deposited PDF to their submission issue; --from takes that attachment,
 * and the copy is marked as provided by the authors. Where the repository
 * publishes a checksum, the copy must match it. A file over the limits of site.json is not kept;
 * the record then links to the repository only. Every listed work carries CC BY 4.0,
 * CC BY-SA 4.0 or CC0 1.0, which allow an unmodified copy with credit and the licence.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const UA = 'Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)';
/* The limits are those of site.json, the same ones build.js enforces. */
const LIMITS = (() => {
  const l = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8')).pdfLimits;
  return { file: l.fileMB * 1024 * 1024, total: l.totalGB * 1024 * 1024 * 1024 };
})();

/* Where the PDF of one version lives. Pure: no network. `n` is the version number in the record. */
function sourceFor(doi, n) {
  let m;
  if ((m = /^10\.6084\/m9\.figshare\.(\d+)\.v(\d+)$/i.exec(doi))) {
    return { kind: 'figshare', api: `https://api.figshare.com/v2/articles/${m[1]}/versions/${m[2]}` };
  }
  if ((m = /^10\.5281\/zenodo\.(\d+)$/i.exec(doi))) {
    return { kind: 'zenodo', api: `https://zenodo.org/api/records/${m[1]}` };
  }
  if ((m = /^10\.48550\/arxiv\.(\d{4}\.\d{4,5})$/i.exec(doi))) {
    return { kind: 'direct', url: `https://arxiv.org/pdf/${m[1]}v${n}` };
  }
  if ((m = /^10\.21203\/rs\.3\.rs-(\d+)\/v(\d+)$/i.exec(doi))) {
    return { kind: 'direct', url: `https://www.researchsquare.com/article/rs-${m[1]}/v${m[2]}.pdf` };
  }
  return null;
}

const isPdfName = (s) => /\.pdf$/i.test(s || '');

/* Pure: an attachment that the authors added to a GitHub issue, and nothing else. */
function attachmentOk(url) {
  return /^https:\/\/github\.com\/user-attachments\/(files|assets)\/[A-Za-z0-9._\/-]+$/.test(String(url || ''));
}

async function get(url, accept) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: accept || '*/*' }, redirect: 'follow' });
  if (!r.ok) throw new Error(url + ': HTTP ' + r.status);
  return r;
}

/* Returns { bytes, source, md5 } where md5 is the repository's own checksum, if it gives one. */
async function download(src) {
  let url, md5 = null, source;
  if (src.kind === 'figshare') {
    const a = await (await get(src.api, 'application/json')).json();
    const f = (a.files || []).filter((x) => x.mimetype === 'application/pdf' || isPdfName(x.name));
    if (f.length !== 1) throw new Error('figshare: expected one PDF, found ' + f.length);
    url = f[0].download_url; md5 = f[0].computed_md5; source = f[0].download_url;
  } else if (src.kind === 'zenodo') {
    const a = await (await get(src.api, 'application/json')).json();
    const f = (a.files || []).filter((x) => isPdfName(x.key));
    if (f.length !== 1) throw new Error('zenodo: expected one PDF, found ' + f.length);
    url = f[0].links.self; md5 = String(f[0].checksum || '').replace(/^md5:/, '') || null; source = f[0].links.self;
  } else {
    url = src.url; source = src.url;
  }
  const bytes = Buffer.from(await (await get(url, 'application/pdf')).arrayBuffer());
  return { bytes, source, md5 };
}

/* Pure: the checks a downloaded file must pass before it is kept. `used` is the size of the copies already kept. */
function accept(bytes, md5, used = 0, limits = LIMITS) {
  const problems = [];
  if (bytes.length > limits.file) problems.push('larger than ' + limits.file / 1024 / 1024 + ' MB');
  else if (used + bytes.length > limits.total) problems.push('the copies together would be larger than ' + limits.total / 1024 / 1024 / 1024 + ' GB');
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') problems.push('not a PDF');
  if (md5 && crypto.createHash('md5').update(bytes).digest('hex') !== md5.toLowerCase()) problems.push('does not match the repository checksum');
  return problems;
}

async function main() {
  const id = process.argv[2] || '';
  const opt = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] || '' : ''; };
  const from = opt('--from');
  const only = from ? Number(opt('--version')) : null;
  if (from && !attachmentOk(from)) throw new Error('--from takes only an attachment of a GitHub issue (https://github.com/user-attachments/…)');
  if (!/^\d{4}\.\d{4}$/.test(id)) throw new Error('give a record id such as 2026.0001');
  const file = path.join(ROOT, 'data', 'papers', id + '.json');
  const p = JSON.parse(fs.readFileSync(file, 'utf8'));
  const dir = path.join(ROOT, 'data', 'pdf');
  fs.mkdirSync(dir, { recursive: true });
  p.pdfs = p.pdfs || [];
  for (const v of p.versions) {
    if (only !== null && v.version !== only) continue;
    if (p.pdfs.some((x) => x.version === v.version)) { console.log('v' + v.version + ': already copied'); continue; }
    const src = from ? { kind: 'direct', url: from } : sourceFor(v.doi, v.version);
    if (!src) { console.log('v' + v.version + ': this repository does not let a script fetch the file; the record links to it only'); continue; }
    try {
      const { bytes, source, md5 } = await download(src);
      const used = fs.readdirSync(dir).reduce((n, x) => n + fs.statSync(path.join(dir, x)).size, 0);
      const problems = accept(bytes, md5, used);
      if (problems.length) { console.log('v' + v.version + ': not kept, ' + problems.join(', ')); continue; }
      const name = id + 'v' + v.version + '.pdf';
      fs.writeFileSync(path.join(dir, name), bytes);
      p.pdfs.push(Object.assign({ version: v.version, file: name, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), source }, from ? { provided_by: 'authors' } : {}));
      console.log('v' + v.version + ': copied ' + name + ' (' + bytes.length + ' bytes' + (md5 ? ', checksum matches' : '') + ')');
    } catch (e) {
      console.log('v' + v.version + ': not copied, ' + e.message);
    }
  }
  if (only !== null && !p.versions.some((v) => v.version === only)) throw new Error('the record has no version ' + only);
  p.pdfs.sort((a, b) => a.version - b.version);
  if (!p.pdfs.length) delete p.pdfs;
  fs.writeFileSync(file, JSON.stringify(p, null, 2) + '\n');
}

module.exports = { sourceFor, accept, attachmentOk, LIMITS };

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
