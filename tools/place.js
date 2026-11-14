#!/usr/bin/env node
/* The place rule of the checked intake (Submission Policy, "Where the authors live"; from SITE.checkedFrom).
 *
 * Where a person lives cannot be proven by any record that Sophaxis can read. What can be checked is whether public
 * records that the person set earlier, under the identity that the intake has verified, are consistent with a place
 * where Sophaxis is offered. Only the public ORCID record is read, and in it only the ISO country codes of:
 *   (a) each public address entry, with the day it was created;
 *   (b) the organisation of each current (no end date) employment and education entry, with the day it was created.
 * Nothing else is read. Nationality is never read. The GitHub profile is not read: its location field was free text, and
 * a name in it (such as "New South Wales", or 中国地方 for a region of Japan) matched places that it did not mean; it was
 * dropped on 2026-11-15 (docs/legal-audit-2026-11-12.md, 「2026-11-15：十八度目の点検」).
 * The rule, for one person:
 *   - not accepted if any entry names a place where Sophaxis is not offered (SITE.notOffered, each from its own day);
 *   - not accepted if the entries name more than one country (they conflict);
 *   - accepted only if an entry names a place where Sophaxis is offered and was created at least SITE.checkedDays days
 *     before the submission issue was opened, so that it cannot be made on the spot;
 *   - otherwise not accepted: there is no qualifying entry. A country that holds a place not offered (Canada holds
 *     Quebec) cannot place anyone by its country alone.
 * The countries and organisations read are never kept, written or printed: the result is only placed or not, and the
 * reason is not written either, so that a public comment never says that a person's record names a place.
 * It proves the consistency of earlier public records, not where a person lives: a person who keeps false records for
 * SITE.checkedDays days can still pass. The Terms of Use place the consequence on the person who confirms untruly.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const SITE = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'site.json'), 'utf8'));
const DAY = 24 * 3600 * 1000;

/* Pure: the codes of the places where Sophaxis is not offered on a day (YYYY-MM-DD, Japan time). */
function excludedCodes(day, notOffered = SITE.notOffered) {
  return new Set(notOffered.filter((p) => !p.from || p.from <= day).flatMap((p) => p.codes || []));
}
/* Pure: the countries that hold a place not offered without being one (CA for CA-QC): their code alone places no one. */
const ambiguous = (codes) => new Set([...codes].filter((c) => c.includes('-')).map((c) => c.split('-')[0]));
const fold = (s) => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/* Pure: the strong signals of an ORCID record, from the answers of its address, employments and educations sections:
 * [{ country, created }] with created in milliseconds. Only current affiliations count. */
function strongSignals({ address, employments, educations } = {}) {
  const out = [];
  for (const a of (address && address.address) || []) {
    const c = a.country && a.country.value;
    if (c) out.push({ country: String(c).toUpperCase(), created: (a['created-date'] || {}).value || null });
  }
  for (const [json, key] of [[employments, 'employment-summary'], [educations, 'education-summary']]) {
    for (const g of (json && json['affiliation-group']) || []) {
      for (const s of g.summaries || []) {
        const e = s[key];
        if (!e || e['end-date']) continue;
        const c = e.organization && e.organization.address && e.organization.address.country;
        if (c) out.push({ country: String(c).toUpperCase(), created: (e['created-date'] || {}).value || null });
      }
    }
  }
  return out;
}

/* Pure: the place of one person, from the ORCID entries only. `opened` is the day the submission issue was opened
 * (YYYY-MM-DD, Japan time). Returns { placed, reason } with reason one of: placed, excluded, conflict, unplaced. Callers
 * write only `placed`. */
function placeOf({ signals = [], opened, days = SITE.checkedDays, notOffered = SITE.notOffered }) {
  const codes = excludedCodes(opened, notOffered);
  const amb = ambiguous(codes);
  if (signals.some((s) => codes.has(s.country))) return { placed: false, reason: 'excluded' };
  if (new Set(signals.map((s) => s.country)).size > 1) return { placed: false, reason: 'conflict' };
  const limit = Date.parse(opened + 'T00:00:00+09:00') - days * DAY;
  const aged = signals.filter((s) => Number.isFinite(s.created) && s.created <= limit && !amb.has(s.country));
  return aged.length ? { placed: true, reason: 'placed' } : { placed: false, reason: 'unplaced' };
}

/* Pure: the current organisations of an ORCID record, as keys (a disambiguated identifier, or the folded name). */
function organisations({ employments, educations } = {}) {
  const out = new Set();
  for (const [json, key] of [[employments, 'employment-summary'], [educations, 'education-summary']]) {
    for (const g of (json && json['affiliation-group']) || []) {
      for (const s of g.summaries || []) {
        const e = s[key];
        if (!e || e['end-date'] || !e.organization) continue;
        const d = e.organization['disambiguated-organization'];
        if (d && d['disambiguated-organization-identifier']) out.add(fold(d['disambiguation-source'] + ':' + d['disambiguated-organization-identifier']));
        if (e.organization.name) out.add('name:' + fold(e.organization.name).replace(/[^a-z0-9぀-ヿ一-鿿]+/g, ' ').trim());
      }
    }
  }
  return out;
}
/* Pure: whether two ORCID records share a current organisation. */
const sharesOrganisation = (a, b) => { const x = organisations(a); return [...organisations(b)].some((k) => x.has(k)); };

/* The fixed reason, in English and Japanese, that a comment gives when a place cannot be confirmed. It never says which
 * person, which entry or which place. */
const PLACE_NOTE = `
The public records of at least one person in this issue do not place them where Sophaxis is offered, under the place rule of the [Submission Policy](${SITE.baseUrl}policies/submission.html#the-checked-intake), so the submission is not accepted. The check reads, for each person whose identity it verifies, only the countries of the public addresses and of the current employments and educations in their ORCID record; it reads no nationality and nothing from GitHub, keeps and writes none of them, and does not say whose record or which entry.
A record becomes checkable when it has a public address, or a current employment or education, whose country is a place where Sophaxis is offered, added at least ${SITE.checkedDays} days before the submission issue is opened, and has no entry that names a place where Sophaxis is not offered and no two entries that name different countries. A new issue can then be opened, or this one edited.
投稿の規程の場所の決まりで、この issue の少なくとも一人について、公開の記録から、Sophaxis を提供している場所にいると確かめられなかったので、この投稿は受け付けません。確かめるのは、本人確認を通った人ごとの、ORCID の記録の公開の住所の国と、いまの勤め先・在学先の国だけです。国籍も GitHub も読まず、どれも残さず、書かず、だれのどの項目かも書きません。ORCID の記録に、Sophaxis を提供している場所の国の公開の住所か、いまの勤め先・在学先が、issue を開く ${SITE.checkedDays} 日以上前からあり、提供していない場所を指す項目も、別々の国を指す二つの項目も無いとき、確かめられるようになります。そのあと、新しい issue を開くか、この issue を直せます。
`;

module.exports = { excludedCodes, ambiguous, strongSignals, placeOf, organisations, sharesOrganisation, PLACE_NOTE, DAY };
