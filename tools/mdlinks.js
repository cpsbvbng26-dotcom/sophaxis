#!/usr/bin/env node
/* Does every relative link in the Markdown files of a repository lead to a file that is there, and every link to a section
 * of a Markdown file to a heading that GitHub gives that id?
 *
 *   node tools/mdlinks.js [directory]      (default: this repository)
 *
 * It reads only; it fetches nothing. A link with a scheme (https:, mailto:) is not followed. A link inside code is not a link.
 * GitHub resolves a link from the file's own folder, and one that starts with "/" from the root of the repository.
 * Exits 1 if any link is broken.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SKIP = new Set(['.git', 'node_modules', 'site']);

/* Every Markdown file under a directory, as paths relative to it. */
function markdownFiles(root, rel = '') {
  return fs.readdirSync(path.join(root, rel), { withFileTypes: true }).flatMap((e) => {
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) return SKIP.has(e.name) ? [] : markdownFiles(root, r);
    return /\.(md|markdown)$/i.test(e.name) ? [r] : [];
  }).sort();
}

/* Pure: the lines of a Markdown text outside fenced code, each as [number, the line with code spans blanked, the line]. */
function proseLines(text) {
  const out = [];
  let fence = null;
  /* An HTML comment is not shown, so a link in it is not a link: blank it, keeping the lines. */
  String(text).replace(/\r\n/g, '\n').replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' ')).split('\n').forEach((line, i) => {
    const f = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (f) { if (!fence) fence = f[1][0]; else if (f[1][0] === fence) fence = null; return; }
    if (fence) return;
    out.push([i + 1, line.replace(/(`+)[\s\S]*?\1/g, (m) => ' '.repeat(m.length)), line]);
  });
  return out;
}

/* Pure: the id GitHub gives each heading of a Markdown text, in order: the text of the heading without its markup, in lower case,
 * with every character but letters, marks, numbers, "_", "-" and spaces dropped, and spaces made "-"; a repeated id gets "-1", "-2".
 * Anchors written as HTML (<a id="x"> or name="x") count too. */
function anchors(text) {
  const seen = new Set();
  const ids = new Set();
  for (const [, line, raw] of proseLines(text)) {
    const h = /^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/.exec(raw.replace(/`([^`]*)`/g, '$1'));
    if (h) {
      const words = h[1].replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/<[^>]+>/g, '').replace(/(\*\*|__|\*|_|~~)(.+?)\1/g, '$2');
      const base = words.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '').replace(/ /g, '-');
      let id = base;
      for (let n = 1; seen.has(id); n++) id = base + '-' + n;
      seen.add(id);
      ids.add(id);
    }
    for (const m of line.matchAll(/<a\s[^>]*(?:id|name)="([^"]+)"/gi)) ids.add(m[1]);
  }
  return ids;
}

/* Pure: the link targets of a Markdown text: inline ([text](target), ![alt](target)), by reference ([label]: target), and in HTML (<a href>, <img src>). */
function links(text) {
  const out = [];
  for (const [n, line] of proseLines(text)) {
    for (const m of line.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+["'(][^)]*)?\)/g)) out.push([n, m[1]]);
    for (const m of line.matchAll(/<(?:a|img)\s[^>]*?(?:href|src)="([^"]+)"/gi)) out.push([n, m[1]]);
    const r = /^\s{0,3}\[[^\]]+\]:\s*<?(\S+?)>?(?:\s+["'(].*)?$/.exec(line);
    if (r) out.push([n, r[1]]);
  }
  return out;
}

/* The broken links of a repository: [file, line, target, why]. */
function scan(root) {
  const bad = [];
  const cache = new Map();
  const anchorsOf = (f) => { if (!cache.has(f)) cache.set(f, anchors(fs.readFileSync(f, 'utf8'))); return cache.get(f); };
  const files = markdownFiles(root);
  let count = 0;
  for (const f of files) {
    const abs = path.join(root, f);
    for (const [n, target] of links(fs.readFileSync(abs, 'utf8'))) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      count++;
      const hash = target.indexOf('#');
      const p = (hash < 0 ? target : target.slice(0, hash)).split('?')[0];
      const frag = hash < 0 ? '' : target.slice(hash + 1);
      let to;
      try { to = p ? (p.startsWith('/') ? path.join(root, decodeURIComponent(p)) : path.resolve(path.dirname(abs), decodeURIComponent(p))) : abs; } catch (e) { bad.push([f, n, target, 'not a valid address']); continue; }
      if (!fs.existsSync(to)) { bad.push([f, n, target, 'no such file']); continue; }
      if (!to.startsWith(path.resolve(root) + path.sep) && to !== path.resolve(root)) { bad.push([f, n, target, 'outside the repository']); continue; }
      let id = frag;
      try { id = decodeURIComponent(frag); } catch (e) { /* keep it as written */ }
      if (frag && /\.(md|markdown)$/i.test(to) && !/^L\d+(-L\d+)?$/.test(id) && !anchorsOf(to).has(id.toLowerCase()) && !anchorsOf(to).has(id)) bad.push([f, n, target, 'no such section']);
    }
  }
  return { files: files.length, links: count, bad };
}

module.exports = { markdownFiles, proseLines, anchors, links, scan };

if (require.main === module) {
  const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
  const r = scan(root);
  r.bad.forEach(([f, n, t, why]) => console.log(f + ':' + n + ': ' + t + ' (' + why + ')'));
  console.log(r.files + ' Markdown files, ' + r.links + ' relative links, ' + r.bad.length + ' broken.');
  process.exit(r.bad.length ? 1 : 0);
}
