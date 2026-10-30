/* Search the listed records in the browser.
 *
 * The only script on Sophaxis, loaded by search.html alone. It reads papers.json from this
 * site and sends nothing anywhere. Results are built with DOM methods and textContent, so
 * nothing from a record is ever read as markup.
 */
'use strict';

function normalise(s) {
  return String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/* Pure: every word must occur; the field and the year narrow the result. */
function match(papers, q, field, year) {
  const words = normalise(q).split(/\s+/).filter(Boolean);
  return papers.filter((p) => {
    const text = normalise([
      p.id, p.title, p.abstract,
      p.authors.map((a) => a.name + ' ' + (a.orcid || '')).join(' '),
      (p.keywords || []).join(' '),
      p.versions.map((v) => v.doi).join(' '),
    ].join(' '));
    return words.every((w) => text.includes(w))
      && (!field || p.categories.includes(field))
      && (!year || p.versions.some((v) => v.date.slice(0, 4) === year));
  });
}

function run() {
  const form = document.getElementById('search');
  const status = document.getElementById('status');
  const results = document.getElementById('results');
  document.getElementById('nojs').hidden = true;
  const params = new URLSearchParams(location.search);
  const q = params.get('q') || '';
  const field = params.get('field') || '';
  const year = /^\d{4}$/.test(params.get('year') || '') ? params.get('year') : '';
  form.elements.q.value = q;
  form.elements.field.value = field;
  form.elements.year.value = year;
  fetch('./papers.json').then((r) => r.json()).then((papers) => {
    if (!q.trim() && !field && !year) {
      status.textContent = papers.length + (papers.length === 1 ? ' preprint is' : ' preprints are') + ' listed. Enter words to search.';
      return;
    }
    const hits = match(papers, q, field, year);
    status.textContent = hits.length + (hits.length === 1 ? ' preprint found.' : ' preprints found.');
    for (const p of hits) {
      const li = document.createElement('li');
      const meta = document.createElement('p');
      meta.className = 'meta';
      meta.textContent = p.id + ' · ' + p.versions[0].date + (p.status === 'withdrawn' ? ' · withdrawn' : '');
      const a = document.createElement('a');
      a.href = './abs/' + encodeURIComponent(p.id) + '.html';
      const b = document.createElement('b');
      b.textContent = p.title;
      a.appendChild(b);
      const who = document.createElement('p');
      who.className = 'meta';
      who.textContent = p.authors.map((x) => x.name).join(', ');
      li.append(meta, a, who);
      results.appendChild(li);
    }
  }).catch(() => { status.textContent = 'The list of preprints could not be read.'; });
}

if (typeof module !== 'undefined' && module.exports) module.exports = { match, normalise };
else run();
