#!/usr/bin/env node
/* Notices that Crossref records against a DOI: retractions, withdrawals, removals, expressions of concern and corrections,
 * including those that Crossref takes from the Retraction Watch database.
 *
 * Read by the intake for the DOI of a submission (tools/intake.js), and once a week for the DOIs of every record shown
 * (tools/watch.js). One request per DOI, to the public Crossref API:
 *   https://api.crossref.org/works?filter=updates:<DOI>
 * which returns the notices that name the DOI, whichever agency registered it.
 *
 * Crossref is the only source. A notice that a repository shows only on its own page, and not to Crossref, is not seen.
 * The notices decide nothing by themselves: the operator decides under the Moderation Policy.
 */
'use strict';
const { request } = require('./ua.js');

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));

/* A work with one of these is not listed (Submission Policy). */
const BLOCKING = ['retraction', 'partial_retraction', 'withdrawal', 'removal'];
/* A work with one of these goes to the operator before it is listed. */
const CONCERN = ['expression_of_concern'];

const bare = (s) => String(s || '').trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').toLowerCase();
const kind = (t) => String(t || '').toLowerCase().replace(/[^a-z_]/g, '_');
const isoParts = (parts) => (Array.isArray(parts) && parts.length >= 3 ? parts.slice(0, 3).map((n, i) => String(n).padStart(i ? 2 : 4, '0')).join('-') : null);

/* Pure: the notices that a Crossref answer to filter=updates:<doi> holds for that DOI, as { type, doi, date, source },
 * oldest first, each notice once. */
function noticesFrom(json, doi) {
  const want = bare(doi);
  const seen = new Set();
  const out = [];
  for (const item of ((json && json.message && json.message.items) || [])) {
    for (const u of (item['update-to'] || [])) {
      if (bare(u.DOI) !== want || !u.type) continue;
      const n = { type: kind(u.type), doi: bare(item.DOI), date: isoParts(u.updated && u.updated['date-parts'] && u.updated['date-parts'][0]), source: u.source || 'publisher' };
      if (!n.date || !n.doi) continue;
      const key = n.type + ' ' + n.doi;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(n);
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/* Pure: the row of the intake's check. Undefined notices mean that Crossref could not be read. */
const NOTICE_LABEL = 'No retraction, withdrawal or expression of concern is recorded for the DOI';
function noticeCheck(notices) {
  if (notices === undefined || notices === null) return [NOTICE_LABEL, false, 'Crossref could not be read; the operator checks it by hand'];
  const say = (n) => n.type.replace(/_/g, ' ') + ' of ' + n.date + ' (' + n.doi + ')';
  const block = notices.filter((n) => BLOCKING.includes(n.type));
  if (block.length) return [NOTICE_LABEL, false, block.map(say).join('; ') + '; such a work is not listed'];
  const concern = notices.filter((n) => CONCERN.includes(n.type));
  if (concern.length) return [NOTICE_LABEL, false, concern.map(say).join('; ') + '; the operator decides'];
  return [NOTICE_LABEL, true, notices.length ? 'recorded: ' + notices.map(say).join('; ') : 'none recorded in Crossref'];
}

/* Pure: the notices found for a record's DOIs that the record does not hold yet. found maps a DOI to its notices. */
function newNotices(p, found) {
  if (p.status === 'removed') return [];
  const known = new Set((p.notices || []).map((n) => n.type + ' ' + bare(n.doi)));
  const out = [];
  for (const doi of [...new Set(p.versions.map((v) => bare(v.doi)))]) {
    for (const n of (found[doi] || [])) {
      if (known.has(n.type + ' ' + n.doi)) continue;
      out.push(`${p.id}: Crossref records a ${n.type.replace(/_/g, ' ')} of ${n.date} for ${doi}, https://doi.org/${n.doi}; the operator adds it to the record and reviews the listing under the Moderation Policy`);
    }
  }
  return out;
}

async function lookUpNotices(doi) {
  const r = await request('https://api.crossref.org/works?rows=100&filter=updates:' + encodeURIComponent(bare(doi)), { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error('Crossref notices for ' + doi + ': HTTP ' + r.status);
  return noticesFrom(await r.json(), doi);
}

module.exports = { BLOCKING, CONCERN, NOTICE_LABEL, noticesFrom, noticeCheck, newNotices, lookUpNotices };

if (require.main === module) {
  const doi = process.argv[2];
  if (!doi) { console.error('usage: node tools/notices.js <DOI>'); process.exit(2); }
  lookUpNotices(doi).then((n) => console.log(JSON.stringify(n, null, 2)), (e) => { console.error(e.message); process.exit(1); });
}
