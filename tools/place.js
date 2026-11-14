#!/usr/bin/env node
/* The place rule of the checked intake (Submission Policy, "Where the authors live"; from SITE.checkedFrom).
 *
 * Where a person lives cannot be proven by any record that Sophaxis can read. What can be checked is whether public
 * records that the person set earlier, under the identity that the intake has verified, are consistent with a place
 * where Sophaxis is offered. The signals, read only from hosts that Sophaxis already uses:
 *   (a) strong: the country of each public address entry of the ORCID record, with the day it was created;
 *   (b) strong: the country of the organisation of each current (no end date) employment and education entry of the
 *       ORCID record, with the day the entry was created;
 *   (c) weak: the location field of the GitHub profile, matched only against the names and codes of the places where
 *       Sophaxis is not offered. Free text, so it is used only to reject, never to accept.
 * The rule, for one person:
 *   - reject if any signal names a place where Sophaxis is not offered (SITE.notOffered, each from its own day);
 *   - reject if the strong signals name more than one country (they conflict);
 *   - accept only if a strong signal names a place where Sophaxis is offered and was created at least SITE.checkedDays
 *     days before the submission issue was opened, so that it cannot be made on the spot;
 *   - otherwise reject: the place cannot be checked. A country that holds a place not offered (Canada holds Quebec) cannot
 *     place anyone by its country alone.
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

/* The English names of the places, for the weak signal only. A pattern, when a plain name would also match another place. */
const NAMES = {
  AT: ['austria'], BE: ['belgium'], BG: ['bulgaria'], HR: ['croatia'], CY: ['cyprus'], CZ: ['czechia', 'czech republic'], DK: ['denmark'],
  EE: ['estonia'], FI: ['finland'], FR: ['france'], DE: ['germany', 'deutschland'], GR: ['greece'], HU: ['hungary'], IE: [/(?<!northern )\bireland\b/], IT: ['italy', 'italia'],
  LV: ['latvia'], LT: ['lithuania'], LU: ['luxembourg'], MT: ['malta'], NL: ['netherlands', 'holland'], PL: ['poland'], PT: ['portugal'], RO: ['romania'],
  SK: ['slovakia'], SI: ['slovenia'], ES: ['spain', 'espana'], SE: ['sweden'], GF: ['french guiana'], GP: ['guadeloupe'], MQ: ['martinique'], RE: ['reunion'],
  YT: ['mayotte'], MF: ['saint martin'], AX: ['aland'], IS: ['iceland'], LI: ['liechtenstein'], NO: ['norway'],
  GB: ['united kingdom', 'great britain', 'britain', 'england', 'scotland', 'wales', 'northern ireland', 'uk'], CN: ['china', "people's republic of china", 'prc'],
  TH: ['thailand'], RU: ['russia', 'russian federation'], TR: ['turkey', 'turkiye'], EG: ['egypt'], PE: ['peru'], AL: ['albania'], MC: ['monaco'], GG: ['guernsey'],
  BW: ['botswana'], EC: ['ecuador'], IQ: ['iraq'], ID: ['indonesia'], RW: ['rwanda'], ZM: ['zambia'], ET: ['ethiopia'],
  CD: ['democratic republic of the congo', 'dr congo', 'drc', 'congo-kinshasa', 'congo kinshasa'], KZ: ['kazakhstan'], TN: ['tunisia'], UG: ['uganda'],
  GN: [/(?<!(new|equatorial|papua new) )\bguinea\b(?![- ]bissau)/], MG: ['madagascar'], BO: ['bolivia'], CR: ['costa rica'], 'CA-QC': ['quebec'],
  AR: ['argentina'], CO: ['colombia'], GH: ['ghana'], KR: ['korea', 'south korea', 'republic of korea'], MX: [/(?<!new )\bmexico\b/], PH: ['philippines'],
  SA: ['saudi arabia'], UY: ['uruguay'], ZW: ['zimbabwe'], KE: ['kenya'], TZ: ['tanzania'], ZA: ['south africa'], SG: ['singapore'],
  AE: ['united arab emirates', 'uae'], QA: ['qatar'],
};
const fold = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
const words = (name) => new RegExp('(^|[^a-z])' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![a-z])');

/* Pure: whether a GitHub location names a place where Sophaxis is not offered, by a name in English or Japanese, or by
 * a two-letter code standing alone between commas (such as "Lyon, FR"). */
function weakExcluded(location, codes, notOffered = SITE.notOffered) {
  const raw = String(location || '');
  if (!raw.trim()) return false;
  const t = fold(raw);
  for (const c of codes) for (const n of NAMES[c] || []) if ((n instanceof RegExp ? n : words(n)).test(t)) return true;
  for (const p of notOffered) if ((p.codes || []).some((c) => codes.has(c)) && p.ja && raw.includes(p.ja)) return true;
  const parts = raw.split(/[,;/|()·]/).map((x) => x.trim());
  return parts.some((x) => /^[A-Z]{2}$/.test(x) && (codes.has(x) || (x === 'UK' && codes.has('GB'))));
}

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

/* Pure: the place of one person. `opened` is the day the submission issue was opened (YYYY-MM-DD, Japan time).
 * Returns { placed, reason } with reason one of: placed, excluded, conflict, unplaced. Callers write only `placed`. */
function placeOf({ signals = [], location = '', opened, days = SITE.checkedDays, notOffered = SITE.notOffered }) {
  const codes = excludedCodes(opened, notOffered);
  const amb = ambiguous(codes);
  if (signals.some((s) => codes.has(s.country)) || weakExcluded(location, codes, notOffered)) return { placed: false, reason: 'excluded' };
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
 * person, which signal or which place. */
const PLACE_NOTE = `
The public records of at least one person in this issue do not place them where Sophaxis is offered, under the place rule of the [Submission Policy](${SITE.baseUrl}policies/submission.html#the-checked-intake). The check reads, for each person whose identity it verifies, the countries of the public addresses and of the current employments and educations in their ORCID record, and the location of their GitHub profile; it keeps and writes none of them, and it does not say whose record or which entry.
A record becomes checkable by a public country in the ORCID record, or a current employment or education whose organisation is where Sophaxis is offered, kept for at least ${SITE.checkedDays} days before the submission issue is opened, and by no entry that names a place where Sophaxis is not offered, and no two entries that name different countries. A new issue can then be opened.
投稿の規程の「著者の住んでいる場所」の決まりで、この issue の少なくとも一人について、公開の記録から、Sophaxis を提供している場所にいると確かめられませんでした。確かめるのは、本人確認を通った人ごとの、ORCID の記録の公開の住所の国と、いまの勤め先・在学先の国と、GitHub のプロフィールの所在の欄です。どれも残さず、書かず、だれのどの項目かも書きません。ORCID の記録に、公開の国か、Sophaxis を提供している場所の組織のいまの勤め先・在学先を、issue を開く ${SITE.checkedDays} 日以上前から置き、提供していない場所を指す項目も、別々の国を指す二つの項目も無いとき、確かめられるようになります。そのあと、新しい issue を開けます。
`;

module.exports = { NAMES, excludedCodes, ambiguous, weakExcluded, strongSignals, placeOf, organisations, sharesOrganisation, PLACE_NOTE, DAY };
