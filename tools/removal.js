#!/usr/bin/env node
/* Removal requests under the Takedown Policy (see .github/workflows/removal.yml).
 *
 * What runs by itself, and what the operator decides:
 *   - A removal issue is acknowledged at once, with the day by which the operator aims to answer (7 days).
 *   - Where the issue reports exposure of personal data, the record page (title, authors, abstract, PDF copy) is taken offline at once,
 *     before the decision, as the policy says. The record becomes a notice with the reason "under-review".
 *   - The authors are told in their submission issue, and can respond.
 *   - The decision is the operator's. The operator labels the issue "upheld" or "not-upheld".
 *     Upheld: the record is replaced by a notice that says only that the record with that id was removed.
 *     Every automatic comment about it is deleted, and the issues that name it are emptied, closed and locked.
 *     Not upheld: material taken offline while the request was reviewed is put back from the git history.
 *   - A request sent by email is handled the same way, by running the workflow by hand with the id.
 *   - Once a day, open requests that are close to the 7 days and that the operator has not answered get a reminder.
 *
 * Modes, from the environment (MODE):
 *   intake   ISSUE_NUMBER, ISSUE_AUTHOR, ISSUE_BODY            a removal issue was opened or edited
 *   decide   ISSUE_NUMBER, ISSUE_BODY, DECISION                 the operator labelled it upheld or not-upheld
 *   manual   ID, ACTION (hold | release | remove | remove-pdf)  a request that came by email
 *   remind                                                      the daily reminder
 *
 * It reads the records in data/papers and the issues of this repository, and nothing else.
 * No personal data is written anywhere: the comments name only the Sophaxis id, the kind of request and dates.
 */
'use strict';
const { request } = require('./ua.js');

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { validate } = require('../build.js');
const I = require('./intake.js');

const ROOT = path.join(__dirname, '..');
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const MARK = '<!-- sophaxis-removal -->';
const REMIND = '<!-- sophaxis-reminder -->';
const NOTICE = '<!-- sophaxis-removal-notice -->';
const ID = /^\d{4}\.\d{4}$/;
const DAYS = 7;
const FIELDS = {
  'Sophaxis id': 'id',
  'Kind of problem': 'kind',
  'How you are concerned': 'relation',
};

/* The kinds of the form. `removes`: an upheld request removes the record; `hold` takes material offline at once.
 * The kind is never written into the record: a removed record says only that it was removed. */
const KINDS = {
  'Copyright infringement': { slug: 'copyright', removes: true, hold: false },
  'Exposure of personal data': { slug: 'personal-data', removes: true, hold: true },
  'An author did not agree to the listing': { slug: 'author-consent', removes: true, hold: false },
  'An author asks for the PDF copy to be removed': { slug: 'pdf-copy', removes: false, hold: false },
  'A request about my personal data (access, correction, restriction, objection, deletion, stopping its provision to others, a copy)': { slug: 'data-request', removes: false, hold: false },
  'An author withdraws consent to saving in the Internet Archive': { slug: 'archive-consent', removes: false, hold: false },
  'Another legal reason': { slug: 'legal', removes: true, hold: false },
};

/* ------------------------------------------------------------ pure */

function parse(body) {
  const f = I.parseIssue(body, FIELDS);
  const kind = KINDS[String(f.kind || '').trim()] || null;
  return { id: (String(f.id || '').match(/\d{4}\.\d{4}/) || [''])[0], kind, relation: String(f.relation || '').trim() };
}

/* The day in Japan, where the operator is, and the day `days` later. */
const jstDay = (iso) => new Date(new Date(iso).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const addDays = (day, n) => new Date(Date.parse(day + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const dueDay = (createdIso) => addDays(jstDay(createdIso), DAYS);

/* Pure: a record put back after a hold, with today as its update. */
function restored(p, today) {
  return Object.assign({}, p, { updated: [p.updated, today].filter(Boolean).sort().pop() });
}

/* Held: the record is a notice with the reason "under-review". */
/* A request about the requester's own data, or an author's withdrawal of their own consent, concerns that person,
 * not the work, so the authors are not told of it. */
const tellsAuthors = (kind) => !kind || !['data-request', 'archive-consent'].includes(kind.slug);
const isHeld = (p) => !!p && p.status === 'removed' && p.removal_reason === 'under-review';
const pdfFiles = (p) => ((p && p.pdfs) || []).map((x) => x.file);

/* The record while a request is reviewed: it keeps its submission issue, so that the authors can be told the outcome. */
function toHeld(p, today) {
  const n = { id: p.id, status: 'removed', removal_date: today, removal_reason: 'under-review', issue: p.issue };
  return { record: n, files: pdfFiles(p), problems: validate(n, p.id + '.json') };
}

/* The record once removed: the id, the fact and the day (which OAI-PMH needs for the deleted record). Nothing else. */
function toRemoved(p, today) {
  const n = { id: p.id, status: 'removed', removal_date: today };
  return { record: n, files: pdfFiles(p), problems: validate(n, p.id + '.json') };
}

/* The record without its PDF copies, for an author who asks for them to be removed. */
function withoutPdfs(p) {
  const n = JSON.parse(JSON.stringify(p));
  delete n.pdfs;
  return { record: n, files: pdfFiles(p), problems: validate(n, p.id + '.json') };
}

/* The record without saves to the Internet Archive, for an author who withdraws consent to them. */
function withoutArchive(p) {
  const n = Object.assign({}, p, { archive: false });
  return { record: n, files: [], problems: validate(n, p.id + '.json') };
}

/* What a decision does to a record. Returns { record, files } or { skip: why }. */
function plan(action, p, today) {
  if (!p) return { skip: 'there is no such record' };
  if (action === 'hold') {
    if (p.status === 'removed') return { skip: 'the record is already ' + (isHeld(p) ? 'offline while a request is reviewed' : 'removed') };
    return toHeld(p, today);
  }
  if (action === 'remove') {
    if (p.status === 'removed' && !isHeld(p)) return { skip: 'the record is already removed' };
    return toRemoved(p, today);
  }
  if (action === 'remove-pdf') {
    if (p.status === 'removed') return { skip: 'the record is removed' };
    if (!pdfFiles(p).length) return { skip: 'the record has no PDF copy' };
    return withoutPdfs(p);
  }
  if (action === 'no-archive') {
    if (p.status === 'removed') return { skip: 'the record is removed' };
    if (p.archive === false) return { skip: 'the record is already not saved to the Internet Archive' };
    return withoutArchive(p);
  }
  return { skip: 'unknown action ' + action };
}

function ack({ form, record, held, failed, due }) {
  const lines = [MARK, '**Removal request received.** The operator aims to answer by ' + due + ' (Japan time), within ' + DAYS + ' days, under the [Takedown Policy](' + SITE.baseUrl + 'policies/takedown.html).', ''];
  if (!form.kind) lines.push('The kind of problem could not be read. The operator reads the request as it is.');
  else if (!ID.test(form.id) || !record) lines.push('There is no record ' + (form.id || '(no id)') + '. Edit the issue to give the Sophaxis id.');
  else if (held) lines.push('The issue reports exposure of personal data, so the record page of ' + form.id + ' (its title, authors, abstract and PDF copy) was taken offline at once, before the decision. This is not a decision on the request.');
  else if (failed) lines.push('The issue reports exposure of personal data. Taking the material offline automatically did not succeed, so the operator does it by hand.');
  else if (form.kind.hold && isHeld(record)) lines.push('The record page of ' + form.id + ' (its title, authors, abstract and PDF copy) is already offline while a request is reviewed.');
  else lines.push('The record ' + form.id + ' stays online while the request is reviewed.');
  if (form.kind && form.kind.slug === 'data-request') lines.push('', 'Requests cost nothing. Before data is disclosed or changed, the operator confirms who is asking, through the ORCID record or by email to the address on the operator\'s ORCID record. Do not post personal data here. A copy of personal data is sent by email, never in this issue. The answer comes within one month at the latest.');
  if (form.kind && form.kind.slug === 'archive-consent') lines.push('', 'Withdrawing consent needs no reasons and is not weighed. Once the operator confirms that the request comes from an author, the record is no longer saved to the Internet Archive, and the operator asks it to exclude the earlier copies. What was done before the withdrawal stays lawful.');
  if (record && tellsAuthors(form.kind)) lines.push('', 'The authors are told in their submission issue and can respond.');
  lines.push('', 'This comment was written automatically. It decides nothing; the operator decides.');
  return lines.join('\n');
}

function authorNotice({ id, kind, issue, held }) {
  return [NOTICE,
    'A removal request about ' + id + ' (' + (kind ? kind.slug : 'unstated kind') + ') is being reviewed under the [Takedown Policy](' + SITE.baseUrl + 'policies/takedown.html)' + (issue ? ' in #' + issue : ', after a request by email') + '.',
    held ? 'The record page (its title, authors, abstract and PDF copy) is offline while it is reviewed. An automatic step took it offline when the request arrived, before any decision. If the request is not upheld, it is put back.' : 'The record stays online while it is reviewed.',
    'The authors can respond ' + (issue ? 'in #' + issue : 'here') + ', or by email to the address on the operator\'s ORCID record, before the decision.',
  ].join('\n');
}

function decisionNote({ id, decision, kind, today, done, restored, emptied }) {
  /* Whether an automatic step took part (the Digital Services Act, Articles 16(6) and 17(3)(c)). */
  const auto = restored || (kind && kind.hold) ? 'An automatic step took the record page offline when the request arrived, before the decision; the operator made the decision.' : 'No automatic step took part in this decision.';
  const data = kind && kind.slug === 'data-request' ? [DATA_REMEDY] : [];
  if (decision === 'not-upheld') {
    return [MARK, '**Not upheld** (' + today + '). The operator gives the reasons in this issue, and where the request names a law, the grounds name the law relied on.', restored ? 'The record page of ' + id + ' (its title, authors, abstract and PDF copy) is put back once this note is posted.' : 'Nothing of ' + id + ' was taken offline, so nothing is put back.', auto, CHALLENGE, ...data].join('\n');
  }
  const steps = kind && kind.slug === 'pdf-copy'
    ? ['- [x] the PDF copies of ' + id + ' are taken off the site; the record links to the repository only']
    : ['- [x] the record page of ' + id + ' says only that the record was removed',
      '- [x] every automatic comment about the record is deleted',
      '- [x] the issues that name it are emptied, closed and locked' + (emptied && emptied.length ? ': ' + emptied.map((x) => '#' + x).join(', ') : ''),
      '- [x] the OAI-PMH interface marks the record as deleted',
      '- [ ] delete those issues, so that their edit history goes too (by hand; only the owner can)',
      '- [ ] ask the Internet Archive to exclude its earlier copies (by hand)',
      '- [ ] ask GitHub to remove the material from the repository history (by hand)',
      '- [ ] a follow-up issue lists what is left by hand, with a draft to the Internet Archive, and ticks it as it becomes true',
      'The removal applies wherever the site is read, and it is permanent.'];
  const archive = ['- [x] the record of ' + id + ' is no longer saved to the Internet Archive', '- [ ] ask the Internet Archive to exclude its earlier copies (by hand)'];
  const changes = kind && (kind.removes || ['pdf-copy', 'archive-consent'].includes(kind.slug));
  return [MARK, '**Upheld** (' + today + '). The operator gives the grounds in this issue, and where the request names a law, the grounds name the law relied on.', auto, CHALLENGE, ...data, '', ...(done ? (kind.slug === 'archive-consent' ? archive : steps) : [changes ? 'The record could not be changed automatically. The operator does it by hand.' : 'This kind of request changes nothing automatically. The operator carries it out by hand.'])].join('\n');
}

/* Every decision says how to challenge it (Takedown Policy, the Digital Services Act, Article 20). */
const CHALLENGE = 'The decision can be challenged within six months, free of charge, by answering in this issue or by email to the address on the operator\'s ORCID record. The operator reviews it; no automatic step does. A court, or an out-of-court dispute settlement body certified under Article 21 of the Digital Services Act, can also be asked.';

/* A request about personal data also names the authorities and the courts (GDPR Article 12(4); APPI). */
const DATA_REMEDY = 'A complaint can also go to Japan\'s Personal Information Protection Commission, or to a data protection authority, and the person can go to court.';

/* What an issue that named a removed record says afterwards. */
const EMPTIED = 'Removed.';
const emptiedTitle = (title) => (String(title || '').match(/^\[[A-Za-z ]+\]/) || ['[Removed]'])[0] + ' removed';

/* Pure: the open requests that need a reminder today. `issues` carry their comments. */
function dueReminders(issues, owner, today) {
  return issues.filter((i) => {
    const labels = (i.labels || []).map((l) => (typeof l === 'string' ? l : l.name));
    const counted = labels.includes('removal') || (labels.includes('withdrawal') && labels.includes('verified'));
    if (!counted || i.state !== 'open' || i.pull_request) return false;
    const due = dueDay(i.created_at);
    if (today < addDays(due, -2)) return false;
    const comments = i.comments_list || [];
    if (comments.some((c) => c.user && c.user.login.toLowerCase() === owner.toLowerCase())) return false;
    return !comments.some((c) => (c.body || '').startsWith(REMIND));
  }).map((i) => ({ number: i.number, due: dueDay(i.created_at) }));
}

const reminder = (due) => REMIND + '\nThe operator aims to answer this request by ' + due + ' (Japan time). It has had no answer from the operator yet.';

/* ------------------------------------------------------------ the follow-up of a removal (pure) */

/* After a removal, three things are left to the operator (Takedown Policy, "What a removed record leaves"):
 * deleting the emptied issues, asking the Internet Archive to exclude its copies, and asking GitHub about the history.
 * A follow-up issue lists them with drafts. The daily step ticks the first two by itself once they are true
 * (a deleted issue answers 410 or 404; the Wayback Machine lists no capture), and closes the issue when all are ticked. */
const FOLLOW = '<!-- sophaxis-follow-up -->';
const FOLLOW_DAYS = 7;
const archived = (id) => [{ url: SITE.baseUrl.replace(/^https?:\/\//, '') + 'abs/' + id + '.html', prefix: false }, { url: SITE.baseUrl.replace(/^https?:\/\//, '') + 'pdf/' + id + 'v', prefix: true }];
const cdxUrl = (a) => 'https://web.archive.org/cdx/search/cdx?output=json&limit=1&url=' + encodeURIComponent(a.url) + (a.prefix ? '&matchType=prefix' : '');

function followUpBody({ id, issues, today, done = {} }) {
  const state = { id, issues, today, done };
  const box = (k) => (done[k] ? '[x]' : '[ ]');
  const page = SITE.baseUrl + 'abs/' + id + '.html';
  return [FOLLOW, '<!-- ' + JSON.stringify(state) + ' -->',
    'The record ' + id + ' was removed on ' + today + '. What is left by hand is listed here. The daily step ticks the first two by itself once they are true, and closes this issue when all three are ticked.',
    '',
    '- ' + box('issues') + ' The emptied issues are deleted' + (issues.length ? ': ' + issues.map((n) => '#' + n).join(', ') : ' (there are none)') + '. Only the owner of the repository can: open each issue, and on the right side bar, under "Notifications", click "Delete issue", then "Delete this issue".',
    '- ' + box('archive') + ' The Wayback Machine of the Internet Archive lists no capture of the record page or its PDF copies. Send the request below to info@archive.org, as its help page asks; it promises no outcome.',
    '- ' + box('github') + ' GitHub has been asked about the repository history, where that applies. Tick this by hand. GitHub\'s own procedure is to rewrite the history first and then contact GitHub Support, and GitHub Support helps only with sensitive data whose risk cannot be removed otherwise; other earlier versions stay in the history, as the Takedown Policy says.',
    '',
    '<details><summary>Request to the Internet Archive</summary>',
    '',
    '```',
    'To: info@archive.org',
    'Subject: Exclusion request: ' + page,
    '',
    'I run Sophaxis (' + SITE.baseUrl + '), and have controlled the site since ' + SITE.since + '.',
    'The record ' + id + ' was removed from Sophaxis on ' + today + ' under its Takedown Policy (' + SITE.baseUrl + 'policies/takedown.html).',
    'Please exclude these from the Wayback Machine, for all time periods:',
    '- ' + page,
    '- every address beginning with ' + SITE.baseUrl + 'pdf/' + id + 'v (the PDF copies of the record)',
    'The robots.txt of the site also asks your crawlers not to collect them again.',
    '```',
    '',
    '</details>',
  ].join('\n');
}

/* Pure: the state written into a follow-up issue, or null. */
function followUpState(body) {
  const m = /<!-- (\{[\s\S]*?\}) -->/.exec(String(body || ''));
  if (!String(body || '').startsWith(FOLLOW) || !m) return null;
  try { return JSON.parse(m[1]); } catch (e) { return null; }
}

/* Pure: a box ticked by hand in the issue counts as done too. */
function tickedByHand(body) {
  const b = String(body || '');
  return { issues: /- \[x\] The emptied issues are deleted/i.test(b), archive: /- \[x\] The Wayback Machine/i.test(b), github: /- \[x\] GitHub has been asked/i.test(b) };
}

const followUpReminder = () => FOLLOW + '\nSome of the follow-up of this removal is still open. The list above shows what.';

/* ------------------------------------------------------------ files and git */

const paperFile = (id) => path.join(ROOT, 'data', 'papers', id + '.json');
const readRecord = (id) => (ID.test(id || '') && fs.existsSync(paperFile(id)) ? JSON.parse(fs.readFileSync(paperFile(id), 'utf8')) : null);
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });

function write(change) {
  fs.writeFileSync(paperFile(change.record.id), JSON.stringify(change.record, null, 2) + '\n');
  change.files.forEach((f) => fs.rmSync(path.join(ROOT, 'data', 'pdf', f), { force: true }));
}

/* Put back what a hold took offline: the record and its PDF copies as they were just before the hold commit. */
function restore(id, today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)) {
  /* The commit of the hold that changed the record itself, not the one that rebuilt the site. */
  const sha = git('log', '-1', '--format=%H', '--grep=^Sophaxis-Action: hold ' + id.replace('.', '\\.') + '$', '--', 'data/papers/' + id + '.json').trim();
  if (!sha) return false;
  /* The record comes back with today as its update, so that OAI-PMH harvesters that ask for changes since a day pick it up again. */
  fs.writeFileSync(paperFile(id), JSON.stringify(restored(JSON.parse(git('show', sha + '^:data/papers/' + id + '.json')), today), null, 2) + '\n');
  git('ls-tree', '--name-only', sha + '^', 'data/pdf/').split('\n').filter((f) => path.basename(f).startsWith(id + 'v'))
    .forEach((f) => fs.writeFileSync(path.join(ROOT, f), execFileSync('git', ['show', sha + '^:' + f], { cwd: ROOT })));
  return true;
}

/* Build, check, and commit the data and the generated site separately, then push to main. Throws on any failure. */
function commit(action, id, summary) {
  execFileSync('node', ['build.js'], { cwd: ROOT, stdio: 'inherit' });
  execFileSync('node', ['verification/check.js'], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
  git('config', 'user.name', 'github-actions[bot]');
  git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com');
  /* Commits made by the workflow carry only the action: no model wrote them, so they name no model as co-author. */
  const trailer = ['-m', 'Sophaxis-Action: ' + action + ' ' + id];
  git('add', '-A', 'data');
  git('commit', '-q', '-m', summary, ...trailer);
  git('add', '-A', 'site');
  if (git('diff', '--cached', '--name-only').trim()) git('commit', '-q', '-m', 'サイトを生成し直す（生成物、' + id + '）', ...trailer);
  git('push', 'origin', 'HEAD:main');
}

const SUMMARY = {
  hold: (id) => id + ' の記録の頁を、削除依頼の審査中は下げる',
  release: (id) => id + ' を戻す（削除依頼は認められなかった）',
  remove: (id) => id + ' を削除の告知に替える',
  'remove-pdf': (id) => id + ' の PDF の写しを外す（著者の依頼）',
  'no-archive': (id) => id + ' を Internet Archive に保存しない（著者が同意を撤回）',
};

/* ------------------------------------------------------------ GitHub */

async function comments(n) { return (await I.github('GET', '/issues/' + n + '/comments?per_page=100')) || []; }

async function upsert(n, mark, body) {
  const mine = (await comments(n)).find((c) => c.user.type === 'Bot' && c.body.startsWith(mark));
  if (mine) await I.github('PATCH', '/issues/comments/' + mine.id, { body });
  else await I.github('POST', '/issues/' + n + '/comments', { body });
}

/* Leave no trace of a removed record in the issues: its submission issue, and every other issue that names its id
 * (withdrawal, published version, correction), except the removal requests. Every comment of the bot there is deleted,
 * and each issue is emptied, closed and locked. Returns the issues, for the operator to delete. */
async function erase(record) {
  const issues = new Set([record.issue]);
  for (let page = 1; page <= 10; page++) {
    const list = (await I.github('GET', '/issues?state=all&per_page=100&page=' + page)) || [];
    list.filter((i) => !i.pull_request && (i.body || '').includes(record.id) && !(i.labels || []).some((l) => l.name === 'removal')).forEach((i) => issues.add(i.number));
    if (list.length < 100) break;
  }
  for (const n of issues) {
    for (const c of await comments(n)) if (c.user.type === 'Bot') await I.github('DELETE', '/issues/comments/' + c.id);
    const issue = await I.github('GET', '/issues/' + n);
    if (!issue) continue;
    await I.github('PATCH', '/issues/' + n, { title: emptiedTitle(issue.title), body: EMPTIED, state: 'closed', state_reason: 'not_planned' });
    await I.github('PUT', '/issues/' + n + '/lock', { lock_reason: 'resolved' });
  }
  return [...issues].sort((a, b) => a - b);
}

async function label(n, add, remove) {
  for (const l of remove || []) await I.github('DELETE', '/issues/' + n + '/labels/' + encodeURIComponent(l));
  if (add && add.length) await I.github('POST', '/issues/' + n + '/labels', { labels: add });
}

/* ------------------------------------------------------------ modes */

const today = () => jstDay(new Date().toISOString());

async function intake() {
  const n = process.env.ISSUE_NUMBER;
  const form = parse(process.env.ISSUE_BODY);
  const record = readRecord(form.id);
  const issue = await I.github('GET', '/issues/' + n);
  const before = (await comments(n)).find((c) => c.user.type === 'Bot' && c.body.startsWith(MARK));
  let held = false, failed = false;
  /* One hold per issue: an edit that names another id is left to the operator. */
  if (form.kind && form.kind.hold && record && record.status !== 'removed' && !before) {
    const change = plan('hold', record, today());
    try {
      if (change.skip || change.problems.length) throw new Error(change.skip || change.problems.join('; '));
      write(change);
      commit('hold', form.id, SUMMARY.hold(form.id) + '（#' + n + '）');
      held = true;
    } catch (e) { console.error('hold: ' + e.message); failed = true; }
  }
  await upsert(n, MARK, ack({ form, record, held, failed, due: dueDay(issue.created_at) }));
  await label(n, [form.kind ? form.kind.slug : 'unread'].concat(held ? ['held'] : []));
  if (record && !before && tellsAuthors(form.kind)) await I.github('POST', '/issues/' + record.issue + '/comments', { body: authorNotice({ id: form.id, kind: form.kind, issue: n, held: held || isHeld(record) }) });
  console.log(held ? 'held' : 'acknowledged');
}

/* An author's request in a withdrawal issue to remove the record (Withdrawal Policy). Only a verified request
 * that asks for removal is carried out; withdrawal itself is done by a pull request, as before. */
async function decideWithdrawal(n, labels, decision) {
  const W = require('./withdraw.js');
  const form = W.parse(process.env.ISSUE_BODY);
  const say = (body) => I.github('POST', '/issues/' + n + '/comments', { body: MARK + '\n' + body });
  if (decision !== 'upheld') return say('The operator does not remove the record. The operator gives the reasons in this issue.');
  if (form.mode !== 'remove') return say('This issue asks for withdrawal, not removal. The operator withdraws the record by a pull request.');
  if (!labels.includes('verified')) return say('The request is not verified, so nothing is removed.');
  const record = readRecord(form.id);
  const change = plan('remove', record, today());
  if (change.skip || change.problems.length) return say('The record could not be removed automatically (' + (change.skip || change.problems.join('; ')) + '). The operator does it by hand.');
  write(change);
  commit('remove', form.id, SUMMARY.remove(form.id) + '（#' + n + '、著者の求め）');
  const emptied = await erase(record);
  await openFollowUp(form.id, emptied, today());
  console.log('emptied: ' + emptied.map((x) => '#' + x).join(', '));
}

async function decide() {
  const n = process.env.ISSUE_NUMBER;
  const decision = process.env.DECISION;
  const labels = (((await I.github('GET', '/issues/' + n)) || {}).labels || []).map((l) => l.name);
  if (labels.includes('withdrawal')) return decideWithdrawal(n, labels, decision);
  const form = parse(process.env.ISSUE_BODY);
  const record = readRecord(form.id);
  const day = today();
  if (decision === 'not-upheld') {
    /* The person who asked is told before the material goes back (GDPR Article 18(3)). */
    const willRestore = isHeld(record);
    await I.github('POST', '/issues/' + n + '/comments', { body: decisionNote({ id: form.id, decision, kind: form.kind, today: day, restored: willRestore }) });
    let restored = false;
    if (willRestore && restore(form.id)) { commit('release', form.id, SUMMARY.release(form.id) + '（#' + n + '）'); restored = true; }
    else if (willRestore) await I.github('POST', '/issues/' + n + '/comments', { body: MARK + '\nPutting the record page back automatically did not succeed. The operator does it by hand.' });
    await label(n, [], ['held']);
    if (record && tellsAuthors(form.kind)) await I.github('POST', '/issues/' + record.issue + '/comments', { body: NOTICE + '\nThe removal request in #' + n + ' was not upheld.' + (restored ? ' The record page is back.' : '') });
    return;
  }
  if (decision !== 'upheld') throw new Error('unknown decision ' + decision);
  let done = false, emptied = [];
  if (form.kind && (form.kind.removes || ['pdf-copy', 'archive-consent'].includes(form.kind.slug))) {
    const action = { 'pdf-copy': 'remove-pdf', 'archive-consent': 'no-archive' }[form.kind.slug] || 'remove';
    const change = plan(action, record, day);
    try {
      if (change.skip || change.problems.length) throw new Error(change.skip || change.problems.join('; '));
      write(change);
      commit(action, form.id, SUMMARY[action](form.id) + '（#' + n + '、削除依頼を認めた）');
      if (action === 'remove') { emptied = await erase(record); await openFollowUp(form.id, emptied, day); }
      done = true;
    } catch (e) { console.error(action + ': ' + e.message); }
  }
  await I.github('POST', '/issues/' + n + '/comments', { body: decisionNote({ id: form.id, decision, kind: form.kind, today: day, done, emptied }) });
  await label(n, [], ['held']);
}

/* A decision on a request sent by email has no removal issue. Its grounds go to the authors in their submission issue,
 * before that issue is emptied, so that GitHub sends them to the authors who follow it (DSA Article 17(4)). */
const CHALLENGE_EMAIL = 'The decision can be challenged within six months, free of charge, by email to the address on the operator\'s ORCID record. The operator reviews it; no automatic step does. A court, or an out-of-court dispute settlement body certified under Article 21 of the Digital Services Act, can also be asked.';
function emailDecision({ id, action, grounds, today }) {
  const what = { remove: 'The record ' + id + ' is removed, as the Takedown Policy sets out, and this issue is emptied afterwards.', 'remove-pdf': 'The PDF copies of ' + id + ' are taken off the site; the record links to the repository only.', 'no-archive': 'The record ' + id + ' is no longer saved to the Internet Archive.' }[action];
  return [NOTICE, '**Upheld** (' + today + '). A request about ' + id + ' sent by email was upheld.', what, 'Grounds: ' + grounds, 'No automatic step took part in this decision.', CHALLENGE_EMAIL].join('\n');
}

async function manual() {
  const id = process.env.ID, action = process.env.ACTION;
  if (!ID.test(id || '')) throw new Error('the id must look like 2026.0001');
  const grounds = String(process.env.GROUNDS || '').trim();
  if (['remove', 'remove-pdf', 'no-archive'].includes(action) && !grounds) throw new Error('give the grounds of the decision, without personal data');
  const record = readRecord(id);
  if (action === 'release') {
    if (!isHeld(record) || !restore(id)) throw new Error(id + ' is not offline under review');
    commit('release', id, SUMMARY.release(id));
    await I.github('POST', '/issues/' + record.issue + '/comments', { body: NOTICE + '\nThe removal request about ' + id + ' was not upheld. The record page is back.' });
    return;
  }
  const change = plan(action, record, today());
  if (change.skip || change.problems.length) throw new Error(change.skip || change.problems.join('; '));
  if (action !== 'hold' && record.issue) await I.github('POST', '/issues/' + record.issue + '/comments', { body: emailDecision({ id, action, grounds, today: today() }) });
  write(change);
  commit(action, id, SUMMARY[action](id) + '（運営者の手で）');
  if (action === 'hold') await I.github('POST', '/issues/' + record.issue + '/comments', { body: authorNotice({ id, kind: null, issue: null, held: true }) });
  if (action === 'remove') {
    const emptied = await erase(record);
    await openFollowUp(id, emptied, today());
    console.log('emptied: ' + emptied.map((x) => '#' + x).join(', '));
  }
}

async function openFollowUp(id, issues, day) {
  const issue = await I.github('POST', '/issues', { title: '[Follow-up] ' + id + ' removed', body: followUpBody({ id, issues, today: day }), labels: ['follow-up'] });
  console.log('follow-up: #' + issue.number);
  return issue.number;
}

/* The daily step: tick what has become true, close what is done, and remind once a week of what is not. */
async function followUps() {
  const open = (await I.github('GET', '/issues?state=open&per_page=100&labels=follow-up')) || [];
  for (const i of open.filter((x) => !x.pull_request)) {
    const st = followUpState(i.body);
    if (!st) continue;
    const done = Object.assign({}, st.done, Object.fromEntries(Object.entries(tickedByHand(i.body)).filter(([, v]) => v)));
    if (!done.issues) {
      let gone = 0;
      for (const n of st.issues) {
        const r = await request('https://api.github.com/repos/' + process.env.GITHUB_REPOSITORY + '/issues/' + n, { headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github+json' } });
        if (r.status === 410 || r.status === 404) gone++;
      }
      done.issues = gone === st.issues.length;
    }
    if (!done.archive) {
      let none = 0;
      for (const a of archived(st.id)) {
        try {
          const r = await request(cdxUrl(a));
          const rows = r.ok ? JSON.parse((await r.text()) || '[]') : null;
          if (Array.isArray(rows) && rows.length <= 1) none++;
        } catch (e) { /* asked again tomorrow */ }
      }
      done.archive = none === archived(st.id).length;
    }
    const body = followUpBody({ id: st.id, issues: st.issues, today: st.today, done });
    if (body !== i.body) await I.github('PATCH', '/issues/' + i.number, { body });
    if (done.issues && done.archive && done.github) {
      await I.github('POST', '/issues/' + i.number + '/comments', { body: FOLLOW + '\nEverything left by hand is done. Closing.' });
      await I.github('PATCH', '/issues/' + i.number, { state: 'closed', state_reason: 'completed' });
      continue;
    }
    const last = (await comments(i.number)).filter((c) => c.body.startsWith(FOLLOW)).map((c) => c.created_at).concat([i.created_at]).sort().pop();
    if (Date.now() - Date.parse(last) >= FOLLOW_DAYS * 86400000) await I.github('POST', '/issues/' + i.number + '/comments', { body: followUpReminder() });
  }
}

async function remind() {
  const owner = SITE.operator.github;
  const day = today();
  const open = [];
  for (const l of ['removal', 'withdrawal']) open.push(...((await I.github('GET', '/issues?state=open&per_page=100&labels=' + l)) || []));
  for (const i of open) i.comments_list = await comments(i.number);
  for (const r of dueReminders(open, owner, day)) await I.github('POST', '/issues/' + r.number + '/comments', { body: reminder(r.due) });
  await followUps();
}

module.exports = { write, restore, restored, commit, parse, plan, ack, authorNotice, decisionNote, emptiedTitle, EMPTIED, CHALLENGE, CHALLENGE_EMAIL, emailDecision, DATA_REMEDY, withoutArchive, followUpBody, followUpState, tickedByHand, archived, cdxUrl, FOLLOW, FOLLOW_DAYS, toHeld, toRemoved, dueReminders, reminder, dueDay, jstDay, addDays, isHeld, tellsAuthors, KINDS, MARK, REMIND, NOTICE, FIELDS, DAYS };

if (require.main === module) {
  const run = { intake, decide, manual, remind }[process.env.MODE];
  if (!run) { console.error('MODE must be intake, decide, manual or remind'); process.exit(1); }
  run().catch((e) => { console.error(e.message); process.exit(1); });
}
