#!/usr/bin/env node
/* Read a withdrawal issue, check that the account asking belongs to an author of the record, and draft the change.
 *
 * In GitHub Actions (see .github/workflows/intake.yml):
 *   ISSUE_NUMBER, ISSUE_AUTHOR, ISSUE_BODY, GITHUB_TOKEN, GITHUB_REPOSITORY
 *   node tools/withdraw.js
 *
 * It reads the record in data/papers and the name, the websites and the works of the public ORCID record
 * given in the form, as the submission check does, and nothing else.
 * The check decides nothing. The operator withdraws the record under the Withdrawal Policy.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { validate, orcidOk } = require('../build.js');
const I = require('./intake.js');

const ROOT = path.join(__dirname, '..');
const MARK = '<!-- sophaxis-withdrawal -->';
const FIELDS = {
  'Sophaxis id': 'id',
  'Your ORCID iD': 'orcid',
  'Reason, shown on the record page': 'reason',
};

function parse(body) {
  const f = I.parseIssue(body, FIELDS);
  return { id: (String(f.id || '').match(/\d{4}\.\d{4}/) || [''])[0], orcid: f.orcid || '', reason: I.plain(f.reason || '') };
}

/* Pure: the checks. `record` is the record of that id, or null; `person` and `works` come from the ORCID record. */
function check({ form, login, record, person, works }) {
  const checks = [];
  const add = (label, pass, detail) => checks.push([label, !!pass, detail || '']);
  add('The record exists and is listed', record && record.status === 'listed', record ? form.id + ' is ' + record.status : 'no record ' + (form.id || '(no id)'));
  add('The ORCID iD is valid', form.orcid && orcidOk(form.orcid));
  add('A reason is given', form.reason.length >= 10);
  if (!record || record.status !== 'listed') return { ok: false, checks };
  if (!person) { add('The ORCID record could be read', false); return { ok: false, checks }; }
  add('The ORCID record links this GitHub account', I.linksGithub(person.urls, login), 'https://github.com/' + login);
  const byId = record.authors.find((a) => a.orcid && a.orcid === form.orcid);
  const dois = record.versions.map((v) => v.doi.toLowerCase());
  const claimed = works && [...works].some((w) => dois.some((d) => w === d || w.startsWith(d + '.v') || d.startsWith(w + '.v')));
  const byName = claimed && record.authors.find((a) => I.sameName(person, a));
  add('The ORCID iD belongs to an author of the work', byId || byName,
    byId ? 'the record lists this ORCID iD' : byName ? 'the ORCID record lists the DOI and its name matches an author' : 'neither the record nor the ORCID record connects them');
  return { ok: checks.every((c) => c[1]), checks };
}

/* Pure: the record as it is after withdrawal. The PDF copies go; everything else stays. */
function draft(record, form, today) {
  const p = JSON.parse(JSON.stringify(record));
  p.status = 'withdrawn';
  p.withdrawal_date = today;
  p.withdrawal_note = form.reason;
  const files = (p.pdfs || []).map((x) => x.file);
  delete p.pdfs;
  return { record: p, files, problems: validate(p, p.id + '.json') };
}

function comment(result, d) {
  const safe = (s) => String(s).replace(/[`|<>]/g, '');
  const rows = result.checks.map(([label, pass, detail]) => `| ${pass ? 'pass' : '**fail**'} | ${label} | ${safe(detail)} |`).join('\n');
  let out = `${MARK}
**Automatic checks for withdrawal** (run again whenever this issue is edited)

| | check | detail |
| --- | --- | --- |
${rows}
`;
  if (result.ok && d && !d.problems.length) {
    out += `
The account asking belongs to an author of the work. The operator withdraws the record under the Withdrawal Policy.

Record \`data/papers/${d.record.id}.json\` after withdrawal${d.files.length ? ', with ' + d.files.map((f) => '`data/pdf/' + f + '`').join(', ') + ' deleted' : ''}:

~~~~json
${JSON.stringify(d.record, null, 2).replace(/~~~~/g, '~ ~ ~ ~')}
~~~~
`;
  } else if (d && d.problems.length) {
    out += '\nThe withdrawn record does not validate: ' + safe(d.problems.join('; ')) + '\n';
  } else {
    out += `
Not verified. Fix what failed, then edit this issue to run the checks again.
To link your GitHub account, add \`https://github.com/<your username>\` under "Websites & social links" in your ORCID record.
`;
  }
  return out;
}

async function main() {
  const n = process.env.ISSUE_NUMBER;
  const login = process.env.ISSUE_AUTHOR;
  const form = parse(process.env.ISSUE_BODY);
  const file = path.join(ROOT, 'data', 'papers', form.id + '.json');
  const record = form.id && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  let person = null, works = null;
  try {
    if (record && orcidOk(form.orcid)) {
      const p = await I.getJson('https://pub.orcid.org/v3.0/' + form.orcid + '/person');
      const w = await I.getJson('https://pub.orcid.org/v3.0/' + form.orcid + '/works');
      person = p && I.orcidPerson(p);
      works = w ? I.orcidDois(w) : new Set();
    }
  } catch (e) { console.error(e.message); person = null; }
  const result = check({ form, login, record, person, works });
  const d = result.ok ? draft(record, form, new Date().toISOString().slice(0, 10)) : null;
  const body = comment(result, d);
  const mine = ((await I.github('GET', '/issues/' + n + '/comments?per_page=100')) || []).find((c) => c.user.type === 'Bot' && c.body.startsWith(MARK));
  if (mine) await I.github('PATCH', '/issues/comments/' + mine.id, { body });
  else await I.github('POST', '/issues/' + n + '/comments', { body });
  const verified = result.ok && d && !d.problems.length;
  await I.github('DELETE', '/issues/' + n + '/labels/' + (verified ? 'unverified' : 'verified'));
  await I.github('POST', '/issues/' + n + '/labels', { labels: [verified ? 'verified' : 'unverified'] });
  console.log(verified ? 'verified' : 'not verified');
}

module.exports = { parse, check, draft, comment, MARK, FIELDS };

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
