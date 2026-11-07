#!/usr/bin/env node
/* Removal requests under the Takedown Policy (see .github/workflows/removal.yml).
 *
 * What runs by itself, and what the operator decides:
 *   - A removal issue is acknowledged at once, with the day by which the operator aims to answer (7 days).
 *   - Where the issue reports exposure of personal data, the abstract and the PDF copy are taken offline at once,
 *     before the decision, as the policy says. The record becomes a notice with the reason "under-review".
 *   - The authors are told in their submission issue, and can respond.
 *   - The decision is the operator's. The operator labels the issue "upheld" or "not-upheld".
 *     Upheld: the record is replaced by its removal notice, and the automatic comments that repeat it are edited.
 *     Not upheld: material taken offline while the request was reviewed is put back from the git history.
 *   - A request sent by email is handled the same way, by running the workflow by hand with the id.
 *   - Once a day, open requests that are close to the 7 days and that the operator has not answered get a reminder.
 *
 * Modes, from the environment (MODE):
 *   intake   ISSUE_NUMBER, ISSUE_AUTHOR, ISSUE_BODY            a removal issue was opened or edited
 *   decide   ISSUE_NUMBER, ISSUE_BODY, DECISION                 the operator labelled it upheld or not-upheld
 *   manual   ID, ACTION (hold | release | remove | remove-pdf), REASON   a request that came by email
 *   remind                                                      the daily reminder
 *
 * It reads the records in data/papers and the issues of this repository, and nothing else.
 * No personal data is written anywhere: the comments name only the Sophaxis id, the kind of request and dates.
 */
'use strict';

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

/* The kinds of the form. `reason` is the removal_reason when the request is upheld; `hold` takes material offline at once. */
const KINDS = {
  'Copyright infringement': { slug: 'copyright', reason: 'copyright', hold: false },
  'Exposure of personal data': { slug: 'personal-data', reason: 'personal-data', hold: true },
  'An author did not agree to the listing': { slug: 'author-consent', reason: 'author-consent', hold: false },
  'An author asks for the PDF copy to be removed': { slug: 'pdf-copy', reason: null, hold: false },
  'A request about my personal data (access, correction, suspension of use, deletion)': { slug: 'data-request', reason: null, hold: false },
  'Another legal reason': { slug: 'legal', reason: 'legal', hold: false },
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

/* Held: the record is a notice with the reason "under-review". */
/* A request about the requester's own data concerns that person, not the work, so the authors are not told of it. */
const tellsAuthors = (kind) => !kind || kind.slug !== 'data-request';
const isHeld = (p) => !!p && p.status === 'removed' && p.removal_reason === 'under-review';
const pdfFiles = (p) => ((p && p.pdfs) || []).map((x) => x.file);

/* The record as a removal notice. It keeps only what the Takedown Policy lets it keep. */
function toNotice(p, reason, today) {
  const n = { id: p.id, status: 'removed', removal_date: today, removal_reason: reason, issue: p.issue };
  return { record: n, files: pdfFiles(p), problems: validate(n, p.id + '.json') };
}

/* The record without its PDF copies, for an author who asks for them to be removed. */
function withoutPdfs(p) {
  const n = JSON.parse(JSON.stringify(p));
  delete n.pdfs;
  return { record: n, files: pdfFiles(p), problems: validate(n, p.id + '.json') };
}

/* What a decision does to a record. Returns { record, files } or { skip: why }. */
function plan(action, p, reason, today) {
  if (!p) return { skip: 'there is no such record' };
  if (action === 'hold') {
    if (p.status === 'removed') return { skip: 'the record is already ' + (isHeld(p) ? 'offline while a request is reviewed' : 'removed') };
    return toNotice(p, 'under-review', today);
  }
  if (action === 'remove') {
    if (!reason || reason === 'under-review') return { skip: 'no reason for removal is given' };
    if (p.status === 'removed' && !isHeld(p)) return { skip: 'the record is already removed' };
    return toNotice(p, reason, today);
  }
  if (action === 'remove-pdf') {
    if (p.status === 'removed') return { skip: 'the record is removed' };
    if (!pdfFiles(p).length) return { skip: 'the record has no PDF copy' };
    return withoutPdfs(p);
  }
  return { skip: 'unknown action ' + action };
}

function ack({ form, record, held, failed, due }) {
  const lines = [MARK, '**Removal request received.** The operator aims to answer by ' + due + ' (Japan time), within ' + DAYS + ' days, under the [Takedown Policy](' + SITE.baseUrl + 'policies/takedown.html).', ''];
  if (!form.kind) lines.push('The kind of problem could not be read. The operator reads the request as it is.');
  else if (!ID.test(form.id) || !record) lines.push('There is no record ' + (form.id || '(no id)') + '. Edit the issue to give the Sophaxis id.');
  else if (held) lines.push('The issue reports exposure of personal data, so the abstract and the PDF copy of ' + form.id + ' were taken offline at once, before the decision. This is not a decision on the request.');
  else if (failed) lines.push('The issue reports exposure of personal data. Taking the material offline automatically did not succeed, so the operator does it by hand.');
  else if (form.kind.hold && isHeld(record)) lines.push('The abstract and the PDF copy of ' + form.id + ' are already offline while a request is reviewed.');
  else lines.push('The record ' + form.id + ' stays online while the request is reviewed.');
  if (form.kind && form.kind.slug === 'data-request') lines.push('', 'Requests cost nothing. Before data is disclosed or changed, the operator confirms who is asking, through the ORCID record or by email to the address on the operator\'s ORCID record. Do not post personal data here.');
  if (record && tellsAuthors(form.kind)) lines.push('', 'The authors are told in their submission issue and can respond.');
  lines.push('', 'This comment was written automatically. It decides nothing; the operator decides.');
  return lines.join('\n');
}

function authorNotice({ id, kind, issue, held }) {
  return [NOTICE,
    'A removal request about ' + id + ' (' + (kind ? kind.slug : 'unstated kind') + ') is being reviewed under the [Takedown Policy](' + SITE.baseUrl + 'policies/takedown.html)' + (issue ? ' in #' + issue : ', after a request by email') + '.',
    held ? 'The abstract and the PDF copy are offline while it is reviewed. If the request is not upheld, they are put back.' : 'The record stays online while it is reviewed.',
    'The authors can respond ' + (issue ? 'in #' + issue : 'here') + ', or by email to the address on the operator\'s ORCID record, before the decision.',
  ].join('\n');
}

function decisionNote({ id, decision, kind, today, done, restored }) {
  if (decision === 'not-upheld') {
    return [MARK, '**Not upheld** (' + today + '). The operator gives the reasons in this issue.', restored ? 'The abstract and the PDF copy of ' + id + ' are put back.' : 'Nothing of ' + id + ' was taken offline, so nothing is put back.'].join('\n');
  }
  const steps = kind && kind.slug === 'pdf-copy'
    ? ['- [x] the PDF copies of ' + id + ' are taken off the site; the record links to the repository only']
    : ['- [x] the record page of ' + id + ' is replaced by a notice with the id, the date and the kind of reason',
      '- [x] the automatic comments that repeat the record are edited',
      '- [x] the OAI-PMH interface marks the record as deleted',
      '- [ ] ask the Internet Archive to exclude its earlier copies (by hand)',
      '- [ ] where the law requires it, ask GitHub to remove the material from the repository history (by hand)',
      '- [ ] where the request needs it, hide or delete the submission issue (by hand)'];
  const auto = kind && (kind.reason || kind.slug === 'pdf-copy');
  return [MARK, '**Upheld** (' + today + ').', '', ...(done ? steps : [auto ? 'The record could not be changed automatically. The operator does it by hand.' : 'This kind of request changes nothing automatically. The operator carries it out by hand.'])].join('\n');
}

const redacted = (id, today) => '*This automatic comment repeated the record ' + id + ', which was removed on ' + today + ' under the Takedown Policy. Its text is no longer shown.*';

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

/* ------------------------------------------------------------ files and git */

const paperFile = (id) => path.join(ROOT, 'data', 'papers', id + '.json');
const readRecord = (id) => (ID.test(id || '') && fs.existsSync(paperFile(id)) ? JSON.parse(fs.readFileSync(paperFile(id), 'utf8')) : null);
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });

function write(change) {
  fs.writeFileSync(paperFile(change.record.id), JSON.stringify(change.record, null, 2) + '\n');
  change.files.forEach((f) => fs.rmSync(path.join(ROOT, 'data', 'pdf', f), { force: true }));
}

/* Put back what a hold took offline: the record and its PDF copies as they were just before the hold commit. */
function restore(id) {
  /* The commit of the hold that changed the record itself, not the one that rebuilt the site. */
  const sha = git('log', '-1', '--format=%H', '--grep=^Sophaxis-Action: hold ' + id.replace('.', '\\.') + '$', '--', 'data/papers/' + id + '.json').trim();
  if (!sha) return false;
  fs.writeFileSync(paperFile(id), git('show', sha + '^:data/papers/' + id + '.json'));
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
  const trailer = ['-m', 'Sophaxis-Action: ' + action + ' ' + id + '\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01QqWsm63g52W27jU94E5dfL'];
  git('add', '-A', 'data');
  git('commit', '-q', '-m', summary, ...trailer);
  git('add', '-A', 'site');
  if (git('diff', '--cached', '--name-only').trim()) git('commit', '-q', '-m', 'サイトを生成し直す（生成物、' + id + '）', ...trailer);
  git('push', 'origin', 'HEAD:main');
}

const SUMMARY = {
  hold: (id) => id + ' の要旨と PDF を、削除依頼の審査中は下げる',
  release: (id) => id + ' を戻す（削除依頼は認められなかった）',
  remove: (id) => id + ' を削除の告知に替える（削除依頼を認めた）',
  'remove-pdf': (id) => id + ' の PDF の写しを外す（著者の依頼）',
};

/* ------------------------------------------------------------ GitHub */

async function comments(n) { return (await I.github('GET', '/issues/' + n + '/comments?per_page=100')) || []; }

async function upsert(n, mark, body) {
  const mine = (await comments(n)).find((c) => c.user.type === 'Bot' && c.body.startsWith(mark));
  if (mine) await I.github('PATCH', '/issues/comments/' + mine.id, { body });
  else await I.github('POST', '/issues/' + n + '/comments', { body });
}

/* Edit every automatic comment that repeats the record: in its submission issue, and in issues that name its id. */
async function redactAll(record, today) {
  const marks = ['<!-- sophaxis-intake -->', '<!-- sophaxis-published -->', '<!-- sophaxis-withdrawal -->'];
  const issues = new Set([record.issue]);
  for (let page = 1; page <= 10; page++) {
    const list = (await I.github('GET', '/issues?state=all&per_page=100&page=' + page)) || [];
    list.filter((i) => !i.pull_request && (i.body || '').includes(record.id) && !(i.labels || []).some((l) => l.name === 'removal')).forEach((i) => issues.add(i.number));
    if (list.length < 100) break;
  }
  for (const n of issues) {
    for (const c of await comments(n)) {
      const mark = marks.find((m) => c.user.type === 'Bot' && c.body.startsWith(m));
      if (mark) await I.github('PATCH', '/issues/comments/' + c.id, { body: mark + '\n' + redacted(record.id, today) });
    }
  }
  await I.github('PATCH', '/issues/' + record.issue, { title: '[Submission] ' + record.id + ' (removed)' });
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
    const change = plan('hold', record, null, today());
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

async function decide() {
  const n = process.env.ISSUE_NUMBER;
  const decision = process.env.DECISION;
  const form = parse(process.env.ISSUE_BODY);
  const record = readRecord(form.id);
  const day = today();
  if (decision === 'not-upheld') {
    let restored = false;
    if (isHeld(record) && restore(form.id)) { commit('release', form.id, SUMMARY.release(form.id) + '（#' + n + '）'); restored = true; }
    await I.github('POST', '/issues/' + n + '/comments', { body: decisionNote({ id: form.id, decision, kind: form.kind, today: day, restored }) });
    await label(n, [], ['held']);
    if (record && tellsAuthors(form.kind)) await I.github('POST', '/issues/' + record.issue + '/comments', { body: NOTICE + '\nThe removal request in #' + n + ' was not upheld.' + (restored ? ' The abstract and the PDF copy are back.' : '') });
    return;
  }
  if (decision !== 'upheld') throw new Error('unknown decision ' + decision);
  let done = false;
  if (form.kind && (form.kind.reason || form.kind.slug === 'pdf-copy')) {
    const action = form.kind.slug === 'pdf-copy' ? 'remove-pdf' : 'remove';
    const change = plan(action, record, form.kind.reason, day);
    try {
      if (change.skip || change.problems.length) throw new Error(change.skip || change.problems.join('; '));
      write(change);
      commit(action, form.id, SUMMARY[action](form.id) + '（#' + n + '）');
      if (action === 'remove') await redactAll(record, day);
      done = true;
    } catch (e) { console.error(action + ': ' + e.message); }
  }
  await I.github('POST', '/issues/' + n + '/comments', { body: decisionNote({ id: form.id, decision, kind: form.kind, today: day, done }) });
  await label(n, [], ['held']);
}

async function manual() {
  const id = process.env.ID, action = process.env.ACTION, reason = process.env.REASON || null;
  if (!ID.test(id || '')) throw new Error('the id must look like 2026.0001');
  const record = readRecord(id);
  if (action === 'release') {
    if (!isHeld(record) || !restore(id)) throw new Error(id + ' is not offline under review');
    commit('release', id, SUMMARY.release(id));
    await I.github('POST', '/issues/' + record.issue + '/comments', { body: NOTICE + '\nThe removal request about ' + id + ' was not upheld. The abstract and the PDF copy are back.' });
    return;
  }
  const change = plan(action, record, reason, today());
  if (change.skip || change.problems.length) throw new Error(change.skip || change.problems.join('; '));
  write(change);
  commit(action, id, SUMMARY[action](id) + '（メールでの依頼）');
  if (action === 'hold') await I.github('POST', '/issues/' + record.issue + '/comments', { body: authorNotice({ id, kind: Object.values(KINDS).find((k) => k.reason === reason) || null, issue: null, held: true }) });
  if (action === 'remove') await redactAll(record, today());
}

async function remind() {
  const owner = SITE.operator.github;
  const day = today();
  const open = [];
  for (const l of ['removal', 'withdrawal']) open.push(...((await I.github('GET', '/issues?state=open&per_page=100&labels=' + l)) || []));
  for (const i of open) i.comments_list = await comments(i.number);
  for (const r of dueReminders(open, owner, day)) await I.github('POST', '/issues/' + r.number + '/comments', { body: reminder(r.due) });
}

module.exports = { write, restore, commit, parse, plan, ack, authorNotice, decisionNote, redacted, dueReminders, reminder, dueDay, jstDay, addDays, isHeld, tellsAuthors, KINDS, MARK, REMIND, NOTICE, FIELDS, DAYS };

if (require.main === module) {
  const run = { intake, decide, manual, remind }[process.env.MODE];
  if (!run) { console.error('MODE must be intake, decide, manual or remind'); process.exit(1); }
  run().catch((e) => { console.error(e.message); process.exit(1); });
}
